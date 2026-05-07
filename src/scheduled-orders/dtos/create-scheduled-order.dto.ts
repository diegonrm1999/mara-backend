import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateScheduledOrderDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsArray()
  @IsString({ each: true })
  treatmentIds: string[];

  @IsString()
  @IsNotEmpty()
  scheduledAt: string; // ISO 8601

  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @IsString()
  stylistId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
