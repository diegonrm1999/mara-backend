import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateProductCategoryDto {
  @IsString()
  name: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  displayOrder?: number;
}

export class UpdateProductCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  displayOrder?: number;
}
