import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { SharedModule } from 'src/utils/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reconciliation } from 'src/entities/reconciliation.entity';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([Reconciliation])],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
