import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('/stats')
  async dashboardState(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.dashboardService.getStats(startDate, endDate);
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
