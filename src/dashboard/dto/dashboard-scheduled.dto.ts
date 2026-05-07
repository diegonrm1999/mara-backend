import { ScheduledOrderStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class DashboardScheduledOrdersDto {
  @IsString()
  shopId: string;

  @IsOptional()
  @IsEnum(ScheduledOrderStatus)
  status?: ScheduledOrderStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  stylistId?: string;
}
