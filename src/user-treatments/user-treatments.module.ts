import { Module } from '@nestjs/common';
import { UserTreatmentsController } from './user-treatments.controller';
import { UserTreatmentsService } from './user-treatments.service';

@Module({
  controllers: [UserTreatmentsController],
  providers: [UserTreatmentsService],
  exports: [UserTreatmentsService],
})
export class UserTreatmentsModule {}
