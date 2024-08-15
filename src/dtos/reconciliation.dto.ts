import { IsBoolean } from 'class-validator';

export class FetchApproveDTO {
  @IsBoolean()
  approve_one: boolean;

  @IsBoolean()
  approve_two: boolean;
}
