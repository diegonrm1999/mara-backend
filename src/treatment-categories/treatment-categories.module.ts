import { Module } from '@nestjs/common';
import { TreatmentCategoriesService } from './treatment-categories.service';
import { TreatmentCategoriesController } from './treatment-categories.controller';
import { PromotionsModule } from 'src/promotions/promotions.module';

@Module({
  imports: [PromotionsModule],
  providers: [TreatmentCategoriesService],
  controllers: [TreatmentCategoriesController],
})
export class TreatmentCategoriesModule {}
