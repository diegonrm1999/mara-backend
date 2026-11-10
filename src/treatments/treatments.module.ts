import { Module } from '@nestjs/common';
import { TreatmentsService } from './treatments.service';
import { TreatmentsController } from './treatments.controller';
import { PromotionsModule } from 'src/promotions/promotions.module';

@Module({
  imports: [PromotionsModule],
  providers: [TreatmentsService],
  controllers: [TreatmentsController]
})
export class TreatmentsModule {}
