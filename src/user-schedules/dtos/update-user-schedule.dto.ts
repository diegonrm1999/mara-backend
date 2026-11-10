import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TIME_PATTERN } from '../schedule-validation';

export class UpdateUserScheduleDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime debe tener formato HH:mm' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endTime debe tener formato HH:mm' })
  endTime?: string;
}

export class WeekBlockDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @Matches(TIME_PATTERN, { message: 'startTime debe tener formato HH:mm' })
  startTime: string;

  @Matches(TIME_PATTERN, { message: 'endTime debe tener formato HH:mm' })
  endTime: string;
}

/** Full weekly schedule; days without blocks are days off. */
export class ReplaceWeekDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => WeekBlockDto)
  blocks: WeekBlockDto[];
}
