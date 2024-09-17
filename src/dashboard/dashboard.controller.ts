import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('/stats')
  async dashboardState(
    @Query('start_date') start_date: string,
    @Query('end_date') end_date: string,
  ) {
    return await this.dashboardService.getStats(start_date, end_date);
  }

  @Get('/closed-records')
  async getClosedReconciliations(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.dashboardService.getClosedReconciliations(
      startDate,
      endDate,
    );
  }
}
