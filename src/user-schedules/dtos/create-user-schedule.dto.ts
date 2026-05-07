import { IsInt, IsString, Max, Min } from 'class-validator';

export class CreateUserScheduleDto {
  @IsString()
  userId: string;

  @IsString()
  shopId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  startTime: string; // "09:00"

  @IsString()
  endTime: string; // "18:00"
}
