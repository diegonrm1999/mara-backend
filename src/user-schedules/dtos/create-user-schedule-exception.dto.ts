import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ScheduleExceptionType } from '@prisma/client';
import { TIME_PATTERN } from '../schedule-validation';

export class CreateUserScheduleExceptionDto {
  @IsString()
  userId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe tener formato YYYY-MM-DD',
  })
  date: string; // "2025-06-10" — backend normalizes to midnight UTC

  @IsEnum(ScheduleExceptionType)
  type: ScheduleExceptionType;

  @ValidateIf((o) => o.type === ScheduleExceptionType.CustomHours)
  @Matches(TIME_PATTERN, { message: 'startTime debe tener formato HH:mm' })
  startTime?: string;

  @ValidateIf((o) => o.type === ScheduleExceptionType.CustomHours)
  @Matches(TIME_PATTERN, { message: 'endTime debe tener formato HH:mm' })
  endTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
