import { IsArray, IsString } from 'class-validator';

export class AssignUserTreatmentsDto {
  @IsArray()
  @IsString({ each: true })
  treatmentIds: string[];
}
