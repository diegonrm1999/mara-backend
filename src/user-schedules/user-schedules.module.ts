import { Module } from '@nestjs/common';
import { UserSchedulesController } from './user-schedules.controller';
import { UserSchedulesService } from './user-schedules.service';

@Module({
  controllers: [UserSchedulesController],
  providers: [UserSchedulesService],
  exports: [UserSchedulesService],
})
export class UserSchedulesModule {}
