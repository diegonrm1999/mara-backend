import { Module } from '@nestjs/common';
import { ScheduledOrdersController } from './scheduled-orders.controller';
import { ScheduledOrdersService } from './scheduled-orders.service';
import { PromotionsModule } from 'src/promotions/promotions.module';

@Module({
  imports: [PromotionsModule],
  controllers: [ScheduledOrdersController],
  providers: [ScheduledOrdersService],
  exports: [ScheduledOrdersService],
})
export class ScheduledOrdersModule {}
