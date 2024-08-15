import { IsNotEmpty, IsString } from 'class-validator';

export class ApproveOneDTO {
  @IsNotEmpty()
  @IsString()
  amount_used: number;

  @IsString()
  waybill_number: string;
}
