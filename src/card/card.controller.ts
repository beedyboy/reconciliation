import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CardService } from './card.service';
import { ReportFilterDto, FundRequestDTO } from 'src/dtos/card.dto';
import { JwtGuard } from 'src/guards/jwt.guards';
import { Account } from 'src/entities/account.entity';
import { User } from 'src/utils/user.decorator';

@Controller('card')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get()
  @UseGuards(JwtGuard)
  async getCards(@Query('status') status: string) {
    return this.cardService.getCards(status);
  }

  @Post('create')
  @UseGuards(JwtGuard)
  async createCard() {
    return this.cardService.createCard();
  }

  // Create bulk cards
  @Post('create-bulk')
  async createBulkCards(@Body('count') count: number) {
    return this.cardService.createBulkCards(count);
  }

  // get card details by id
  @Get(':id')
  async getCardById(@Param('id') id: number) {
    return this.cardService.getCardById(id);
  }

  // Activate a card
  @Put('activate/:id')
  async activateCard(
    @Param('id') id: number,
    @Body()
    details: { firstName: string; lastName: string; phoneNumber: string },
  ) {
    return this.cardService.activateCard(id, details);
  }

  // Suspend a card
  @Put('suspend/:id')
  async suspendCard(@Param('id') id: number) {
    return this.cardService.suspendCard(id);
  }

  // Request funds
  @Post('request-funds/:id')
  @UseGuards(JwtGuard)
  async requestFunds(
    @Param('id') cardId: number,
    @Body() payload: FundRequestDTO,
    @User('user') user: Account,
  ) {
    return this.cardService.requestFunds(cardId, payload, user);
  }

  // Approve fund request
  @Put('approve-fund-request/:id')
  @UseGuards(JwtGuard)
  async approveFundRequest(
    @Param('id') requestId: number,
    @User('user') user: Account,
  ) {
    return this.cardService.approveFundRequest(requestId, user);
  }

  // Reject fund request
  @Put('reject-fund-request/:id')
  @UseGuards(JwtGuard)
  async rejectFundRequest(
    @Param('id') requestId: number,
    @User('user') user: Account,
  ) {
    return this.cardService.rejectFundRequest(requestId, user);
  }

  // card activity report with filters
  @Get(':id/activity-report')
  @UseGuards(JwtGuard)
  async getActivityReport(
    @Param('id') cardId: number,
    @Query() filter: ReportFilterDto,
  ) {
    return this.cardService.getCardActivity(cardId, filter);
  }

  // charge card
  @Post('charge/:id')
  @UseGuards(JwtGuard)
  async chargeCard(
    @Param('id') cardId: number,
    @Body() payload: FundRequestDTO,
  ) {
    return this.cardService.chargeCard(cardId, payload);
  }

  @Get('statistics/report')
  @UseGuards(JwtGuard)
  async getReport(@Query() filter: ReportFilterDto) {
    return this.cardService.getCardReportWithStats(filter);
  }

  @Get('statistics/activities')
  async getFilteredActivities(@Query() filter: ReportFilterDto) {
    return this.cardService.getFilteredCardActivities(filter);
  }

  // getCardByReference
  @Get('search/barcode/:reference')
  async getCardByReference(@Param('reference') reference: string) {
    return this.cardService.getCardByReference(reference);
  }
}
