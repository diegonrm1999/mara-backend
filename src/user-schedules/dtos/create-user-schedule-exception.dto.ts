import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ScheduleExceptionType } from '@prisma/client';

export class CreateUserScheduleExceptionDto {
  @IsString()
  userId: string;

  @IsString()
  date: string; // "2025-06-10" — backend normalizes to midnight UTC

  @IsEnum(ScheduleExceptionType)
  type: ScheduleExceptionType;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
