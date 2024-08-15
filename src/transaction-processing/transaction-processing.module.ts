import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reconciliation } from 'src/entities/reconciliation.entity';
import { TransactionProcessingService } from './transaction-processing.service';
import { TransactionProcessingController } from './transaction-processing.controller';
import { SharedModule } from '../utils/shared.module';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([Reconciliation])],
  providers: [TransactionProcessingService],
  controllers: [TransactionProcessingController],
})
export class TransactionProcessingModule {}
