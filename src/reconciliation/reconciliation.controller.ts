import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  ParseBoolPipe,
} from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { FetchApproveDTO } from 'src/dtos/reconciliation.dto';

@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get()
  async allData() {
    return this.reconciliationService.allData();
  }

  @Post('filter')
  async filterRecord(
    @Body() body: FetchApproveDTO,
  ) {
    return this.reconciliationService.filterRecord(body);
  }

  @Post('report')
  async finalReport(@Body() data: any) {
    return this.reconciliationService.finalReport(data);
  }

  @Post('first-approval/:id')
  async firstApproval(@Body() data: any, @Param('id') id: number) {
    return this.reconciliationService.firstApproval(data, id);
  }

  @Post('second-approval/:id')
  async secondApproval(@Body() data: any, @Param('id') id: number) {
    return this.reconciliationService.secondApproval(data, id);
  }

  @Post('overturn')
  async overturn(@Body() data: any) {
    return this.reconciliationService.overturn(data);
  }

  @Delete(':id')
  async delRecord(@Param('id') id: number) {
    return this.reconciliationService.delRecord(id);
  }
}
