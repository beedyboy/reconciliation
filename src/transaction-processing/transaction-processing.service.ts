import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as xlsx from 'xlsx';
import * as moment from 'moment';
import { Account } from 'src/entities/account.entity';
import { Reconciliation } from 'src/entities/reconciliation.entity';
import { error, success } from 'src/utils/api-response.util';
import { Brackets, Repository } from 'typeorm';
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
        const parsedDate = moment('1900-01-01')
          .add(valueDate - 1, 'days')
          .format('DD-MM-YYYY');

        const data = {
          value_date: parsedDate,
          remarks: row[4],
          credit_amount: row[3] || 0,
          credit_amount_to_use: row[3] || 0,
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

    if (amount_used > reconciliation.credit_amount_to_use) {
      throw new Error('Amount used cannot be greater than the balance');
    }

    // Partial funding case
    if (amount_used < reconciliation.credit_amount_to_use) {
      return this.processPartialFunding(
        reconciliation,
        amount_used,
        waybill_number,
        user,
      );
    }

    // Final approval and balance zeroing out
    const newReference = await this.getMaxReference();
    reconciliation.amount_used = amount_used;
    reconciliation.credit_amount_to_use = 0; // Fully utilized
    reconciliation.balance = 0; // Fully utilized
    reconciliation.approved_one = true;
    reconciliation.approval_one = user as Account;
    reconciliation.reconcile_date_one = new Date().toISOString();
    reconciliation.reference = newReference.toString();
    reconciliation.way_bill_number = waybill_number;
    await this.reconciliationRepository.save(reconciliation);

    return {
      message: `Approval processed with final balance and reference ${newReference}`,
      original: reconciliation,
      reference: newReference,
    };
  }

  async processPartialFunding(
    reconciliation: Reconciliation,
    amountUsed: number,
    waybill_number: string,
    user: Partial<Account>,
  ) {
    try {
      // Update parent reconciliation
      reconciliation.credit_amount_to_use =
        reconciliation.credit_amount_to_use - amountUsed;

      // reconciliation.amount_used =
      //   (reconciliation.amount_used ?? 0) + amountUsed;
      // reconciliation.balance = currentBalance - amountUsed;

      const newReference = await this.getMaxReference();

      // Create a new partial reconciliation
      const newReconciliation = this.reconciliationRepository.create({
        remarks: reconciliation.remarks,
        value_date: new Date().toISOString(),
        way_bill_number: waybill_number,
        reference: newReference.toString(),
        credit_amount: reconciliation.credit_amount, // Same as parent
        amount_used: amountUsed,
        balance: 0, // Remaining balance
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

      return {
        success: true,
        message: `Partial funding processed with reference no ${newReference}`,
        partialReconciliation: newReconciliation,
      };
    } catch (err) {
      return {
        success: false,
        message: 'Failed to process partial funding',
        error: err.message,
      };
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
      message: `Approval processed successfully with reference ${reconciliation.reference}`,
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

    // if it has parent_id, it is a partial funding, so we need to update the parent record
    if (reconciliation.parent_id) {
      const parentReconciliation = await this.reconciliationRepository.findOne({
        where: { id: reconciliation.parent_id },
      });

      if (parentReconciliation && !parentReconciliation.approved_one) {
        parentReconciliation.credit_amount_to_use =
          parentReconciliation.credit_amount_to_use +
          reconciliation.amount_used;
        await this.reconciliationRepository.save(parentReconciliation);
        // delete the child record
        await this.reconciliationRepository.delete(reconciliationId);
        return {
          message: 'Partial reconciliation overturned and deleted successfully',
        };
      }
    }

    reconciliation.approved_one = false;
    reconciliation.approved_two = false;
    reconciliation.reconcile_date_one = null;
    reconciliation.reconcile_date_two = null;
    reconciliation.credit_amount_to_use += reconciliation.amount_used;
    reconciliation.amount_used = 0;
    reconciliation.overTurnedBy = user;
    reconciliation.cancellation_date = new Date().toISOString();
    const newCancellationReference = await this.getMaxCancellationReference();

    reconciliation.cancellation_number = newCancellationReference.toString();
    await this.reconciliationRepository.save(reconciliation);
    return {
      message: `Reconciliation overturned successfully with cancellation reference ${newCancellationReference}`,
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
      let { start_date, end_date } = filters;

      // Convert DD-MM-YYYY to YYYY-MM-DD if the dates are provided
      if (start_date) {
        start_date = moment(start_date, 'DD-MM-YYYY').format('YYYY-MM-DD');
      }
      if (end_date) {
        end_date = moment(end_date, 'DD-MM-YYYY').format('YYYY-MM-DD');
      }

      const queryBuilder = this.reconciliationRepository
        .createQueryBuilder('reconciliation')
        .where('reconciliation.approved_one = :stageOne', { stageOne: true })
        .andWhere('reconciliation.approved_two = :stageTwo', {
          stageTwo: true,
        });

      // Apply date filters (without considering time)
      if (start_date) {
        queryBuilder.andWhere(
          'DATE(reconciliation.reconcile_date_two) >= :start_date',
          { start_date },
        );
      }

      if (end_date) {
        queryBuilder.andWhere(
          'DATE(reconciliation.reconcile_date_two) <= :end_date',
          { end_date },
        );
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
        'reconciliation.id AS id',
        'reconciliation.value_date AS value_date',
        'reconciliation.remarks AS remarks',
        'reconciliation.credit_amount AS credit_amount',
        'reconciliation.amount_used AS amount_used',
        'reconciliation.balance AS balance',
        'reconciliation.customer AS customer',
        'reconciliation.approved_one AS approved_one',
        'reconciliation.approved_two AS approved_two',
        'reconciliation.reference AS reference',
        'reconciliation.way_bill_number AS way_bill_number',
        'reconciliation.cancellation_number AS cancellation_number',
        'reconciliation.cancellation_date AS cancellation_date',
        'reconciliation.reconcile_date_one AS reconcile_date_one',
        'reconciliation.reconcile_date_two AS reconcile_date_two',
        'reconciliation.createdAt AS createdAt',
        'reconciliation.updatedAt AS updatedAt',
        'reconciliation.parent_id AS parentId',
        'reconciliation.overTurnedById AS overTurnedById',
        'approvalOne.id AS approvalOneId',
        'approvalOne.firstname AS approvalOneFirstname',
        'approvalOne.lastname AS approvalOneLastname',
        'approvalTwo.id AS approvalTwoId',
        'approvalTwo.firstname AS approvalTwoFirstname',
        'approvalTwo.lastname AS approvalTwoLastname',
      ]);

      const reconciliations = await queryBuilder.getRawMany();
      return success(reconciliations, 'Record fetched successfully');
    } catch (err) {
      console.log({ err });
      return error('Failed to fetch reconciliations', 200);
    }
  }

  async getFinalReconciliationReport2(filters: {
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

      // Apply date filters (without considering time)
      if (start_date) {
        queryBuilder.andWhere(
          'DATE(reconciliation.reconcile_date_two) >= :start_date',
          { start_date },
        );
      }

      if (end_date) {
        queryBuilder.andWhere(
          'DATE(reconciliation.reconcile_date_two) <= :end_date',
          { end_date },
        );
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
        'reconciliation.id AS id',
        'reconciliation.value_date AS value_date',
        'reconciliation.remarks AS remarks',
        'reconciliation.credit_amount AS credit_amount',
        'reconciliation.amount_used AS amount_used',
        'reconciliation.balance AS balance',
        'reconciliation.customer AS customer',
        'reconciliation.approved_one AS approved_one',
        'reconciliation.approved_two AS approved_two',
        'reconciliation.reference AS reference',
        'reconciliation.way_bill_number AS way_bill_number',
        'reconciliation.cancellation_number AS cancellation_number',
        'reconciliation.cancellation_date AS cancellation_date',
        'reconciliation.reconcile_date_one AS reconcile_date_one',
        'reconciliation.reconcile_date_two AS reconcile_date_two',
        'reconciliation.createdAt AS createdAt',
        'reconciliation.updatedAt AS updatedAt',
        'reconciliation.parent_id AS parentId',
        'reconciliation.overTurnedById AS overTurnedById',
        'approvalOne.id AS approvalOneId',
        'approvalOne.firstname AS approvalOneFirstname',
        'approvalOne.lastname AS approvalOneLastname',
        'approvalTwo.id AS approvalTwoId',
        'approvalTwo.firstname AS approvalTwoFirstname',
        'approvalTwo.lastname AS approvalTwoLastname',
      ]);

      const reconciliations = await queryBuilder.getRawMany();
      return success(reconciliations, 'Record fetched successfully');
    } catch (err) {
      console.log({ err });
      return error('Failed to fetch reconciliations', 200);
    }
  }

  private formatDateForSQL(date: string): string {
    const [day, month, year] = date.split('-');
    const newDate = `${year}-${month}-${day}`;
    console.log({ newDate });
    return newDate;
  }
  async updateReconciliations() {
    try {
      // Condition 1: approved_one = false AND (balance IS NULL OR balance = 0)
      const updateResult1 = await this.reconciliationRepository
        .createQueryBuilder()
        .update(Reconciliation)
        .set({ credit_amount_to_use: () => 'credit_amount' }) // Corrected this line
        .where('approved_one = :approvedOne', { approvedOne: false })
        .andWhere(
          new Brackets((qb) => {
            qb.where('balance IS NULL').orWhere('balance = :zero', { zero: 0 });
          }),
        )
        .execute();

      console.log(
        `Updated ${updateResult1.affected} records where balance is NULL or 0.`,
      );

      // Condition 2: approved_one = false AND balance > 0
      const updateResult2 = await this.reconciliationRepository
        .createQueryBuilder()
        .update(Reconciliation)
        .set({
          credit_amount_to_use: () => 'balance', // Corrected this line
          balance: 0,
          amount_used: 0,
        })
        .where('approved_one = :approvedOne', { approvedOne: false })
        .andWhere('balance > :zero', { zero: 0 })
        .execute();

      console.log(
        `Updated ${updateResult2.affected} records where balance is greater than 0.`,
      );

      // Commit transaction
      console.log('Reconciliation records updated successfully.');
      return 'Reconciliation records updated successfully.';
    } catch (error) {
      console.error('Error updating reconciliation records:', error);
      return error;
    }
  }
}
