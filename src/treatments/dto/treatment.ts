import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
export class TreatmentDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @IsNumber()
  @IsOptional()
  basePrice?: number;
}
