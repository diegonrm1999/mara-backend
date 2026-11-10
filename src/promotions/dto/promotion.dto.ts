import { PartialType } from '@nestjs/mapped-types';
import { PromotionDiscountType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PromotionTargetsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  treatmentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  treatmentCategoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productCategoryIds?: string[];
}

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PromotionDiscountType)
  discountType: PromotionDiscountType;

  @IsNumber()
  @Min(0.01, { message: 'El descuento debe ser mayor a 0' })
  discountValue: number;

  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @Type(() => Date)
  @IsDate()
  endsAt: Date;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  appliesToAllTreatments?: boolean;

  @IsOptional()
  @IsBoolean()
  appliesToAllProducts?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => PromotionTargetsDto)
  targets?: PromotionTargetsDto;
}

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}
