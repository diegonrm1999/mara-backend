import { Module } from '@nestjs/common';
import { ScheduledOrdersController } from './scheduled-orders.controller';
import { ScheduledOrdersService } from './scheduled-orders.service';

@Module({
  controllers: [ScheduledOrdersController],
  providers: [ScheduledOrdersService],
  exports: [ScheduledOrdersService],
})
export class ScheduledOrdersModule {}
