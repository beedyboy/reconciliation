import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Delete,
  Get,
  Put,
  Query,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { TransactionProcessingService } from './transaction-processing.service';
import { JwtGuard } from 'src/guards/jwt.guards';
import { User } from 'src/utils/user.decorator';
import { Account } from 'src/entities/account.entity';
import { Reconciliation } from 'src/entities/reconciliation.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApproveOneDTO } from 'src/dtos/transaction.dto';

@Controller('transaction-processing')
export class TransactionProcessingController {
  constructor(
    private readonly transactionProcessingService: TransactionProcessingService,
  ) {}

  @Post('upload')
  @UseGuards(JwtGuard)
  @UseInterceptors(FileInterceptor('file', { dest: './uploads' }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('File is missing', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.transactionProcessingService.performUpload(file);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put('approve/:id')
  @UseGuards(JwtGuard)
  async approveTransaction(
    @Param('id') reconciliationId: number,
    @Body() payload: ApproveOneDTO,
    @User('user') user: any,
  ) {
    return await this.transactionProcessingService.processStageOneApproval(
      reconciliationId,
      payload,
      user,
    );
  }
  // processStageTwoApproval
  @Put('approve-stage-two/:id')
  @UseGuards(JwtGuard)
  async approveStageTwoTransaction(
    @Param('id') reconciliationId: number,
    @User('user') user: Account,
  ) {
    return await this.transactionProcessingService.processStageTwoApproval(
      reconciliationId,
      user,
    );
  }

  // overturnReconciliation
  @Post('overturn/:id')
  @UseGuards(JwtGuard)
  async overturnReconciliation(
    @Param('id') reconciliationId: number,
    @User('user') user: Account,
  ) {
    return await this.transactionProcessingService.overturnReconciliation(
      reconciliationId,
      user,
    );
  }

  // deleteReconciliation
  @Delete(':id')
  @UseGuards(JwtGuard)
  async deleteReconciliation(@Param('id') reconciliationId: number) {
    return await this.transactionProcessingService.deleteReconciliation(
      reconciliationId,
    );
  }

  // getAllReconciliations
  @Get()
  @UseGuards(JwtGuard)
  async getReconciliations(
    @Query('approved_one') approvedOne?: string,
    @Query('approved_two') approvedTwo?: string,
    @Query('dateRange') dateRange?: string,
    @Query('singleDate') singleDate?: string,
    @Query('limit', new ParseIntPipe()) limit = 10,
    @Query('offset', new ParseIntPipe()) offset = 0,
  ): Promise<Reconciliation[] | { error: string; statusCode: number }> {
    const filters: Partial<
      Reconciliation & { dateRange?: [string, string]; singleDate?: string }
    > = {};

    if (approvedOne !== undefined) {
      filters.approved_one = approvedOne.toLowerCase() === 'true';
    }

    if (approvedTwo !== undefined) {
      filters.approved_two = approvedTwo.toLowerCase() === 'true';
    }

    if (dateRange) {
      filters.dateRange = dateRange.split(',') as [string, string];
    }

    if (singleDate) {
      filters.singleDate = singleDate;
    }

    return await this.transactionProcessingService.getAllReconciliations(
      filters,
      limit,
      offset,
    );
  }
}
