import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  IsObject,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  @IsOptional()
  sku?: string;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, string>;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  stock?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  displayOrder?: number;
}

export class UpdateProductVariantDto {
  @IsString()
  @IsOptional()
  sku?: string;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, string>;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class AdjustVariantStockDto {
  // Relative change applied atomically (e.g. -2 to sell/discount, +10 to
  // restock). Not a `set` operation on purpose: a relative, conditional
  // update is what keeps concurrent adjustments from overselling stock, and
  // it is the same primitive a future cart reservation would reuse.
  @IsInt()
  delta: number;
}
