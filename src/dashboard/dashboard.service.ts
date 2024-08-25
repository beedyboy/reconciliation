import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from 'src/entities/account.entity';
import { Reconciliation } from 'src/entities/reconciliation.entity';
import { error, success } from 'src/utils/api-response.util';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import * as moment from 'moment';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Reconciliation)
    private reconciliationRepository: Repository<Reconciliation>,
  ) {}

  async getStats(startDate?: string, endDate?: string) {
    try {
      const dateFilter =
        startDate && endDate
          ? {
              updatedAt: Between(new Date(startDate), new Date(endDate)),
              createdAt: Between(new Date(startDate), new Date(endDate)),
            }
          : {};

      const totalAccounts = await this.accountRepository.count();
      const totalReconciliations = await this.reconciliationRepository.count();
      const totalOpenedStageTwoReconciliations =
        await this.reconciliationRepository.count({
          where: { approved_one: true, approved_two: false, ...dateFilter },
        });
      const totalOpenedReconciliation =
        await this.reconciliationRepository.count({
          where: { approved_one: false, approved_two: false, ...dateFilter },
        });
      const totalClosedReconciliation =
        await this.reconciliationRepository.count({
          where: { approved_one: true, approved_two: true, ...dateFilter },
        });
      const totalPartiallyUsedReconciliation =
        await this.reconciliationRepository.count({
          where: { balance: MoreThan(0), approved_one: false, ...dateFilter },
        });
      const totalOverdueReconciliation =
        await this.reconciliationRepository.count({
          where: {
            approved_one: false,
            updatedAt: LessThan(moment().subtract(14, 'days').toDate()),
            ...dateFilter,
          },
        });

      const totalStageOneAmount = await this.reconciliationRepository
        .createQueryBuilder('reconciliation')
        .select(
          'SUM(CASE WHEN reconciliation.approved_one = false AND reconciliation.amount_used IS NOT NULL THEN reconciliation.balance ELSE reconciliation.credit_amount END)',
          'sum',
        )
        .where(dateFilter)
        .getRawOne();

      const totalStageTwoAmount = await this.reconciliationRepository
        .createQueryBuilder('reconciliation')
        .select('SUM(reconciliation.amount_used)', 'sum')
        .where('reconciliation.approved_one = true')
        .andWhere(dateFilter)
        .getRawOne();

      const totalFinalStageAmount = await this.reconciliationRepository
        .createQueryBuilder('reconciliation')
        .select('SUM(reconciliation.credit_amount)', 'sum')
        .where(
          'reconciliation.approved_one = true AND reconciliation.approved_two = true',
        )
        .andWhere(dateFilter)
        .getRawOne();

      const totalPartiallyUsedReconciliationAmount =
        await this.reconciliationRepository
          .createQueryBuilder('reconciliation')
          .select('SUM(reconciliation.balance)', 'sum')
          .where(
            'reconciliation.balance > 0 AND reconciliation.approved_one = false',
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
