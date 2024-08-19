import { IsBoolean } from 'class-validator';

export class FetchApproveDTO {
  @IsBoolean()
  approved_one: boolean;

  @IsBoolean()
  approved_two: boolean;
}
