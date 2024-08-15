import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from 'src/entities/account.entity';
import { Reconciliation } from 'src/entities/reconciliation.entity';
import { error } from 'src/utils/api-response.util';
import { Repository } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Reconciliation)
    private reconciliationRepository: Repository<Reconciliation>,
  ) {}

  async getStats() {
    try {
      const totalAccounts = await this.accountRepository.count();
      const totalReconciliations = await this.reconciliationRepository.count();
      const totalOpenedStageTwoReconciliations =
        await this.reconciliationRepository.count({
          where: { approved_one: true, approved_two: false },
        });
      const totalOpenedReconciliation =
        await this.reconciliationRepository.count({
          where: { approved_one: false, approved_two: false },
        });
      const totalClosedReconciliation =
        await this.reconciliationRepository.count({
          where: { approved_one: true, approved_two: true },
        });

      return {
        totalAccounts,
        totalReconciliations,
        totalOpenedStageTwoReconciliations,
        totalOpenedReconciliation,
        totalClosedReconciliation,
      };
    } catch (err) {
      return error('Failed to fetch stats', 500);
    }
  }
}
