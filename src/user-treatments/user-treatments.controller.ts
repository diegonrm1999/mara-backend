import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserTreatmentsService } from './user-treatments.service';
import { AssignUserTreatmentsDto } from './dtos/assign-user-treatments.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('user-treatments')
export class UserTreatmentsController {
  constructor(
    private readonly userTreatmentsService: UserTreatmentsService,
  ) {}

  @Put(':userId')
  async assignTreatments(
    @Param('userId') userId: string,
    @Body() dto: AssignUserTreatmentsDto,
  ) {
    return this.userTreatmentsService.assignTreatments(userId, dto);
  }

  @Get(':userId')
  async getTreatments(@Param('userId') userId: string) {
    return this.userTreatmentsService.getTreatments(userId);
  }
}
