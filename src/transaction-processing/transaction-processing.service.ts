import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as xlsx from 'xlsx';
import * as moment from 'moment';
import { Account } from 'src/entities/account.entity';
import { Reconciliation } from 'src/entities/reconciliation.entity';
import { error, success } from 'src/utils/api-response.util';
import { Repository } from 'typeorm';
import { ApproveOneDTO } from 'src/dtos/transaction.dto';

@Injectable()
export class TransactionProcessingService {
  constructor(
    @InjectRepository(Reconciliation)
    private reconciliationRepository: Repository<Reconciliation>,
  ) {}

  async performUpload(file: Express.Multer.File) {
    try {
      const path = './uploads/' + file.filename;
      const workbook = xlsx.readFile(path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

      // Skip headers
      rows.shift();

      const existed = [];
      const datas = [];

      for (const row of rows) {
        const valueDate = row[2];
        const data = {
          value_date: moment(valueDate).format('DD-MM-YYYY'),
          remarks: row[4],
          credit_amount: row[3] || 0,
        };
        const check = await this.reconciliationRepository.findOne({
          where: {
            value_date: moment(valueDate).format('DD-MM-YYYY'),
            remarks: row[4] || 'N/A',
          },
        });
        if (!check) {
          datas.push(data);
        } else {
          existed.push(data);
        }
      }

      if (datas.length > 0) {
        await this.reconciliationRepository.save(datas);
        return success({}, 'Statement uploaded successfully');
      } else {
        throw new BadRequestException('Upload was unsuccessful');
      }
    } catch (error) {
      throw new BadRequestException('Failed to upload file');
    }
  }

  // Method to get the maximum reference value
  private async getMaxReference(): Promise<string> {
    const maxReference = await this.reconciliationRepository
      .createQueryBuilder('reconciliation')
      .select('MAX(reconciliation.reference)', 'max')
      .getRawOne();
    const nextReference = (parseInt(maxReference.max, 10) || 0) + 1;
    return nextReference.toString().padStart(7, '0');
  }
  // Method to get the maximum reference value
  private async getMaxCancellationReference(): Promise<string> {
    const maxReference = await this.reconciliationRepository
      .createQueryBuilder('reconciliation')
      .select('MAX(reconciliation.cancellation_number)', 'max')
      .getRawOne();
    const nextReference = (parseInt(maxReference.max, 10) || 0) + 1;
    return nextReference.toString().padStart(7, '0');
  }

  // Method to process approval with partial funding
  async processStageOneApproval(
    reconciliationId: number,
    payload: ApproveOneDTO,
    user: Account,
  ): Promise<any> {
    const { amount_used, waybill_number } = payload;
    const reconciliation = await this.reconciliationRepository.findOne({
      where: { id: reconciliationId, approved_one: false },
    });

    if (!reconciliation) {
      throw new Error('Reconciliation not found or already approved');
    }

    if (amount_used > reconciliation.credit_amount) {
      throw new Error('Amount should be less than or equal to credit amount');
    }
    //   if amount_used is not up to credit_amount - balance, then it is a partial funding
    if (
      (reconciliation.amount_used ?? 0) + amount_used <
      reconciliation.credit_amount - (reconciliation.balance ?? 0)
    ) {
      return this.processPartialFunding(
        reconciliation,
        amount_used,
        waybill_number,
        user,
      );
    }
    const newReference = await this.getMaxReference();

    // Update the original reconciliation
    const remainingBalance =
      reconciliation.credit_amount -
      amount_used +
      (reconciliation.amount_used ?? 0);

    reconciliation.amount_used =
      (reconciliation.amount_used ?? 0) + amount_used;

    reconciliation.balance = Math.abs(remainingBalance);

    reconciliation.approved_one = true;
    reconciliation.approval_one = user as Account;
    reconciliation.reconcile_date_one = new Date().toISOString();
    reconciliation.reference = newReference.toString();
    reconciliation.way_bill_number = waybill_number;
    await this.reconciliationRepository.save(reconciliation);

    return {
      message: 'Approval processed with partial funding',
      original: reconciliation,
      reference: newReference,
    };
  }

  async processPartialFunding(
    reconciliation: Reconciliation,
    amount: number,
    waybill_number: string,
    user: Partial<Account>,
  ) {
    try {
      // Update the original reconciliation
      const amount_used = amount + (reconciliation.amount_used ?? 0);

      const remainingBalance = reconciliation.credit_amount - amount_used;
      reconciliation.amount_used = amount_used;

      reconciliation.balance = Math.abs(remainingBalance);

      const newReference = await this.getMaxReference();

      // Create a new transaction for the partial fund
      const newReconciliation = this.reconciliationRepository.create({
        remarks: reconciliation.remarks + ' Partial funding',
        value_date: new Date().toISOString(),
        way_bill_number: waybill_number,
        reference: newReference.toString(),
        credit_amount: amount,
        amount_used: amount,
        balance: amount,
        approved_one: true,
        approval_one: user as Account,
        reconcile_date_one: new Date().toISOString(),
        parent_id: reconciliation.id,
      });

      await this.reconciliationRepository.save([
        reconciliation,
        newReconciliation,
      ]);
      console.log({ partialId: newReconciliation.id });
      console.log({ user: user.id });

      return { success: true, message: 'Partial funding processed' };
    } catch (err) {
      return error('Failed to process partial funding', 500);
    }
  }

  // process stage two approval
  async processStageTwoApproval(
    reconciliationId: number,
    user: Account,
  ): Promise<any> {
    const reconciliation = await this.reconciliationRepository.findOne({
      where: { id: reconciliationId, approved_one: true, approved_two: false },
    });
    if (!reconciliation) {
      throw new Error('Reconciliation not found or already approved');
    }

    // Update the original reconciliation
    reconciliation.approved_two = true;
    reconciliation.approval_two = user;
    reconciliation.reconcile_date_two = new Date().toISOString();
    await this.reconciliationRepository.save(reconciliation);

    return {
      message: 'Approval processed successfully',
      original: reconciliation,
    };
  }

  // overturn a reconciliation
  async overturnReconciliation(
    reconciliationId: number,
    user: Account,
  ): Promise<any> {
    const reconciliation = await this.reconciliationRepository.findOne({
      where: { id: reconciliationId },
    });
    reconciliation.approved_one = false;
    reconciliation.approved_two = false;
    reconciliation.reconcile_date_one = null;
    reconciliation.reconcile_date_two = null;
    reconciliation.balance = null;
    reconciliation.amount_used = null;
    reconciliation.overTurnedBy = user;
    reconciliation.cancellation_date = new Date().toISOString();
    const newCancellationReference = await this.getMaxCancellationReference();

    reconciliation.cancellation_number = newCancellationReference.toString();
    await this.reconciliationRepository.save(reconciliation);
    return {
      message: 'Reconciliation overturned successfully',
      cancellation_number: newCancellationReference,
    };
  }
  // delete reconciliation record
  async deleteReconciliation(reconciliationId: number): Promise<any> {
    const result = await this.reconciliationRepository.delete(reconciliationId);
    if (result.affected === 0) {
      throw new Error(
        `Reconciliation record with ID ${reconciliationId} not found`,
      );
    }
    return { message: 'Reconciliation record deleted successfully' };
  }

  // get all, with optional filter by date, amount, approvals ets
  async getAllReconciliations(
    filters: Partial<
      Reconciliation & { dateRange?: [string, string]; start_date?: string }
    >,
    limit: number,
    offset: number,
  ): Promise<any> {
    try {
      const queryBuilder =
        this.reconciliationRepository.createQueryBuilder('reconciliation');

      // Apply filters
      if (filters) {
        // Filter by date range
        if (filters.dateRange) {
          const [startDate, endDate] = filters.dateRange;
          queryBuilder.andWhere(
            'reconciliation.value_date BETWEEN :startDate AND :endDate',
            {
              startDate,
              endDate,
            },
          );
        }

        // Filter by single date
        if (filters.start_date) {
          queryBuilder.andWhere('reconciliation.value_date = :start_date', {
            start_date: filters.start_date,
          });
        }

        // Filter by approved stages
        if (typeof filters.approved_one === 'boolean') {
          queryBuilder.andWhere('reconciliation.approved_one = :approved_one', {
            approved_one: filters.approved_one,
          });
        }

        if (typeof filters.approved_two === 'boolean') {
          queryBuilder.andWhere('reconciliation.approved_two = :approved_two', {
            approved_two: filters.approved_two,
          });
        }

        // Add other filters as needed
        for (const [key, value] of Object.entries(filters)) {
          if (
            key !== 'dateRange' &&
            key !== 'singleDate' &&
            key !== 'approved_one' &&
            key !== 'approved_two' &&
            value !== undefined
          ) {
            queryBuilder.andWhere(`reconciliation.${key} = :${key}`, {
              [key]: value,
            });
          }
        }
      }

      // Add pagination
      queryBuilder.take(limit).skip(offset);

      // Execute the query
      const reconciliations = await queryBuilder.getMany();
      return reconciliations;
    } catch (err) {
      return error('Failed to fetch reconciliations', 500);
    }
  }

  async getFinalReconciliationReport(filters: {
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    try {
      const { start_date, end_date } = filters;
      const queryBuilder = this.reconciliationRepository
        .createQueryBuilder('reconciliation')
        .where('reconciliation.approved_one = :stageOne', { stageOne: true })
        .andWhere('reconciliation.approved_two = :stageTwo', {
          stageTwo: true,
        });

      // Apply filters
      if (filters) {
        if (filters.start_date) {
          queryBuilder.andWhere(
            'reconciliation.value_date BETWEEN :start_date AND :end_date',
            {
              start_date,
              end_date,
            },
          );
        }
      }
      queryBuilder.leftJoinAndSelect(
        'reconciliation.approval_one',
        'approvalOne',
      );
      queryBuilder.leftJoinAndSelect(
        'reconciliation.approval_two',
        'approvalTwo',
      );
      queryBuilder.select([
        'reconciliation.*',
        'approvalOne.id',
        'approvalOne.firstname',
        'approvalOne.lastname',
        'approvalTwo.id',
        'approvalTwo.firstname',
        'approvalTwo.lastname',
      ]);
      const reconciliations = await queryBuilder.getMany();
      return success(reconciliations, 'Record fetched successfully');
    } catch (err) {
      return error('Failed to fetch reconciliations', 500);
    }
  }
}
