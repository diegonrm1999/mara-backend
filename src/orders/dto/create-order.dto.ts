import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
export class OrderTreatmentDto {
  @IsString()
  treatmentId: string;

  @IsNumber()
  @Min(0.01, { message: 'El precio debe ser mayor a 0' })
  price: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderTreatmentDto)
  treatments: OrderTreatmentDto[];

  @IsString()
  @IsNotEmpty()
  clientDni: string;

  @IsString()
  @IsNotEmpty()
  clientFirstName: string;

  @IsString()
  @IsNotEmpty()
  clientLastName: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsString()
  clientEmail?: string;

  @IsString()
  @IsNotEmpty()
  stylistId: string;

  @IsString()
  @IsNotEmpty()
  cashierId: string;
}
