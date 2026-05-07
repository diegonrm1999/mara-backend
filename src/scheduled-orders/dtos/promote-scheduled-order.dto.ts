import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PromoteTreatmentDto {
  @IsString()
  @IsNotEmpty()
  treatmentId: string;

  @IsNumber()
  price: number;
}

export class NewClientDto {
  @IsString()
  @IsNotEmpty()
  dni: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class PromoteScheduledOrderDto {
  @IsString()
  @IsNotEmpty()
  stylistId: string;

  @IsString()
  @IsNotEmpty()
  cashierId: string;

  @IsString()
  @IsNotEmpty()
  supervisorId: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewClientDto)
  newClient?: NewClientDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromoteTreatmentDto)
  treatments: PromoteTreatmentDto[];
}
