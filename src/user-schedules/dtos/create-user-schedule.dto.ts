import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { TIME_PATTERN } from '../schedule-validation';

export class CreateUserScheduleDto {
  @IsString()
  userId: string;

  /** Ignored: the shop always comes from the token. Kept so existing clients keep working. */
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0 = domingo … 6 = sábado

  @Matches(TIME_PATTERN, { message: 'startTime debe tener formato HH:mm' })
  startTime: string; // "09:00"

  @Matches(TIME_PATTERN, { message: 'endTime debe tener formato HH:mm' })
  endTime: string; // "18:00"
}
