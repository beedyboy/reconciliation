import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from 'src/entities/account.entity';
import { Reconciliation } from 'src/entities/reconciliation.entity';
import { error, success } from 'src/utils/api-response.util';
import { Repository, LessThan, Between } from 'typeorm';
import * as moment from 'moment';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Reconciliation)
    private reconciliationRepository: Repository<Reconciliation>,
  ) {}

  private formatDateForSQL(date: string): string {
    const [day, month, year] = date.split('-');
    const newDate = `${year}-${month}-${day}`;
    // console.log({ newDate });
    return newDate;
  }

  async getStats(start_date?: string, end_date?: string) {
    try {
      const dateFilter = {};
      if (start_date) {
        const startDate = new Date(this.formatDateForSQL(start_date));
        const startOfStartDate = new Date(startDate.setHours(0, 0, 0, 0));
        const endOfStartDate = new Date(startDate.setHours(23, 59, 59, 999));
        dateFilter['updatedAt'] = Between(startOfStartDate, endOfStartDate);
      }
      if (end_date) {
        const endDate = new Date(this.formatDateForSQL(end_date));
        const startOfEndDate = new Date(endDate.setHours(0, 0, 0, 0));
        const endOfEndDate = new Date(endDate.setHours(23, 59, 59, 999));
        dateFilter['updatedAt'] = Between(startOfEndDate, endOfEndDate);
      }
      // startDate && endDate
      //   ? {
      //       updatedAt: Between(new Date(startDate), new Date(endDate)),
      //       // createdAt: Between(new Date(startDate), new Date(endDate)),
      //     }
      //   : {};

      const totalAccounts = await this.accountRepository.count();
      const totalReconciliations = await this.reconciliationRepository.count();

      const totalOpenedReconciliation =
        await this.reconciliationRepository.count({
          where: { approved_one: false, approved_two: false, ...dateFilter },
        });

      const totalOpenedStageTwoReconciliations =
        await this.reconciliationRepository.count({
          where: { approved_one: true, approved_two: false, ...dateFilter },
        });

      const totalClosedReconciliation =
        await this.reconciliationRepository.count({
          where: { approved_one: true, approved_two: true, ...dateFilter },
        });

      const totalPartiallyUsedReconciliation =
        await this.reconciliationRepository
          .createQueryBuilder('reconciliation')
          .where(
            'reconciliation.credit_amount > reconciliation.credit_amount_to_use',
          )
          .andWhere('reconciliation.approved_one = :approvedOne', {
            approvedOne: false,
          })
          .andWhere(dateFilter)
          .getCount();

      const totalOverdueReconciliation =
        await this.reconciliationRepository.count({
          where: {
            approved_one: false,
            updatedAt: LessThan(moment().subtract(14, 'days').toDate()),
            ...dateFilter,
          },
        });

      const totalOverdueReconciliationAmount =
        await this.reconciliationRepository
          .createQueryBuilder('reconciliation')
          .select('SUM(reconciliation.credit_amount_to_use)', 'sum')
          .where('reconciliation.approved_one = false')
          .andWhere('reconciliation.updatedAt < :date', {
            date: moment().subtract(14, 'days').toDate(),
          })
          .andWhere(dateFilter)
          .getRawOne();

      const totalStageOneAmount = await this.reconciliationRepository
        .createQueryBuilder('reconciliation')
        .select('SUM(reconciliation.credit_amount_to_use)', 'sum')
        .where('reconciliation.approved_one = false')
        .andWhere('reconciliation.approved_two = false')
        .andWhere(dateFilter)
        // .select(
        //   'SUM(CASE WHEN reconciliation.approved_one = false AND reconciliation.amount_used IS NOT NULL THEN reconciliation.credit_amount_to_use ELSE reconciliation.credit_amount END)',
        //   'sum',
        // )
        .where(dateFilter)
        .getRawOne();

      const totalStageTwoAmount = await this.reconciliationRepository
        .createQueryBuilder('reconciliation')
        .select('SUM(reconciliation.amount_used)', 'sum')
        .where('reconciliation.approved_one = true')
        .andWhere('reconciliation.approved_two = false')
        .andWhere(dateFilter)
        .getRawOne();

      const totalFinalStageAmount = await this.reconciliationRepository
        .createQueryBuilder('reconciliation')
        .select('SUM(reconciliation.amount_used)', 'sum')
        .where(
          'reconciliation.approved_one = true AND reconciliation.approved_two = true',
        )
        .andWhere(dateFilter)
        .getRawOne();

      const totalPartiallyUsedReconciliationAmount =
        await this.reconciliationRepository
          .createQueryBuilder('reconciliation')
          .select('SUM(reconciliation.credit_amount_to_use)', 'sum')
          .where(
            'reconciliation.credit_amount > reconciliation.credit_amount_to_use AND reconciliation.approved_one = false',
          )
          .andWhere(dateFilter)
          .getRawOne();

      return {
        stats: {
          totalAccounts,
          totalReconciliations,
          totalOpenedStageTwoReconciliations,
          totalOpenedReconciliation,
          totalClosedReconciliation,
          totalPartiallyUsedReconciliation,
          totalOverdueReconciliation,
          totalOverdueReconciliationAmount:
            totalOverdueReconciliationAmount.sum || 0,
          totalStageOneAmount: totalStageOneAmount.sum || 0,
          totalStageTwoAmount: totalStageTwoAmount.sum || 0,
          totalFinalStageAmount: totalFinalStageAmount.sum || 0,
          totalPartiallyUsedReconciliationAmount:
            totalPartiallyUsedReconciliationAmount.sum || 0,
        },
      };
    } catch (err) {
      return error('Failed to fetch stats', 500);
    }
  }

  async getClosedReconciliations(startDate?: string, endDate?: string) {
    try {
      const dateFilter =
        startDate && endDate
          ? {
              updatedAt: Between(new Date(startDate), new Date(endDate)),
              createdAt: Between(new Date(startDate), new Date(endDate)),
            }
          : {};

      const closedReconciliations = await this.reconciliationRepository.find({
        where: { approved_one: true, approved_two: true, ...dateFilter },
      });
      return success(closedReconciliations, 'Records fetched successfully');
    } catch (err) {
      return error('Failed to fetch closed reconciliations', 500);
    }
  }
}
