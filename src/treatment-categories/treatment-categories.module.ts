import { Module } from '@nestjs/common';
import { TreatmentCategoriesService } from './treatment-categories.service';
import { TreatmentCategoriesController } from './treatment-categories.controller';

@Module({
  providers: [TreatmentCategoriesService],
  controllers: [TreatmentCategoriesController],
})
export class TreatmentCategoriesModule {}
