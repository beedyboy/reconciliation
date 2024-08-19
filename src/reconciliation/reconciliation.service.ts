import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as moment from 'moment';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reconciliation } from 'src/entities/reconciliation.entity';
import { success } from 'src/utils/api-response.util';
import { FetchApproveDTO } from 'src/dtos/reconciliation.dto';

@Injectable()
export class ReconciliationService {
  constructor(
    @InjectRepository(Reconciliation)
    private reconciliationRepository: Repository<Reconciliation>,
  ) {}

  async allData() {
    try {
      const statements = await this.reconciliationRepository.find();
      return success(statements, 'Accounts fetched successfully');
    } catch (error) {
      throw new BadRequestException('Failed to fetch data');
    }
  }

  async filterRecord(body: FetchApproveDTO) {
    try {
      // const condition: Partial<Reconciliation> = { ...body };
      const { approved_one, approved_two } = body;

      const query =
        this.reconciliationRepository.createQueryBuilder('reconciliation');

      query.andWhere('reconciliation.approved_one = :stageOne', {
        stageOne: approved_one,
      });

      query.andWhere('reconciliation.approved_two = :stageTwo', {
        stageTwo: approved_two,
      });

      const statements = await query.getMany();

      //   .find({
      //   where: condition,
      // });
      return success(statements, 'Record fetched successfully');
    } catch (error) {
      throw new BadRequestException('Failed to filter records');
    }
  }

  async finalReport(data: any) {
    try {
      // Implement final report logic as per your requirements
      return data;
    } catch (error) {
      throw new BadRequestException('Failed to generate report');
    }
  }

  async firstApproval(data: any, id: number) {
    try {
      const result = await this.reconciliationRepository
        .createQueryBuilder('reconciliation')
        .select('MAX(reference)', 'total')
        .getRawOne();

      let reference = 1;

      if (result && result.total !== null) {
        reference = parseInt(result.total) + 1;
      }

      data.reference = String(reference).padStart(7, '0');

      if (data.amount_used !== data.credit_amount) {
        data.approved_one = false;
        data.reconcile_date_one = null;
      } else {
        data.reconcile_date_one = moment().format('DD-MM-YYYY');
      }

      const updateResult = await this.reconciliationRepository.update(id, data);
      if (updateResult.affected === 0) {
        throw new NotFoundException(
          `Reconciliation record with ID ${id} not found`,
        );
      }
      return success(
        updateResult,
        `Transaction approved with reference number ${data.reference}`,
      );
    } catch (error) {
      throw new BadRequestException('Failed to perform first approval');
    }
  }

  async secondApproval(data: any, id: number) {
    try {
      data.reconcile_date_two = moment().format('DD-MM-YYYY');
      const updateResult = await this.reconciliationRepository.update(id, data);
      if (updateResult.affected === 0) {
        throw new NotFoundException(
          `Reconciliation record with ID ${id} not found`,
        );
      }
      return success(
        updateResult,
        `Transaction approved with reference number ${data.reference}`,
      );
    } catch (error) {
      throw new BadRequestException('Failed to perform second approval');
    }
  }

  async overturn(data: any) {
    try {
      const result = await this.reconciliationRepository
        .createQueryBuilder('reconciliation')
        .select('MAX(cancellation_number)', 'total')
        .getRawOne();

      if (result.total !== null) {
        const cancellation_number = parseInt(result.total) + 1;
        data.cancellation_number = String(cancellation_number).padStart(7, '0');
      }

      data.balance = null;
      data.amount_used = null;
      data.reconcile_date_one = null;
      data.reconcile_date_two = null;
      data.cancellation_date = moment().format('DD-MM-YYYY');

      return await this.reconciliationRepository.save(data);
    } catch (error) {
      throw new BadRequestException('Failed to overturn reconciliation');
    }
  }

  async delRecord(id: number) {
    try {
      const result = await this.reconciliationRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Record with ID ${id} not found`);
      }
      return { message: 'Record deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete record');
    }
  }
}
