import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ReportFilterDto {
  month?: number;
  year?: number;
  type?: CardActivityType;
  status?: 'active' | 'inactive' | 'suspended';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['load', 'fund_request', 'refund', 'purchase'])
  transactionType?: string;
}

export class CardReportDto {
  activeCards: number;
  inactiveCards: number;
  fundsLoaded: number;
  fundsSpent: number;
  fundsRemaining: number;
  cardActivityTrends: any;
  customerEngagement: any;
}

export enum CardActivityType {
  FUND_REQUEST = 'fund_request',
  LOAD = 'load',
  PURCHASE = 'purchase',
}

// card fund dto
export class FundRequestDTO {
  @IsNumber()
  amount: number;

  @IsOptional()
  description?: string;
}
