import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateTreatmentCategoryDto {
  @IsString()
  name: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  displayOrder?: number;
}

export class UpdateTreatmentCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  displayOrder?: number;
}
