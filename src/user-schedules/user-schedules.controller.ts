import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserSchedulesService } from './user-schedules.service';
import { CreateUserScheduleDto } from './dtos/create-user-schedule.dto';
import { CreateUserScheduleExceptionDto } from './dtos/create-user-schedule-exception.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('user-schedules')
export class UserSchedulesController {
  constructor(
    private readonly userSchedulesService: UserSchedulesService,
  ) {}

  @Post()
  async createSchedule(@Body() dto: CreateUserScheduleDto) {
    return this.userSchedulesService.createSchedule(dto);
  }

  @Delete(':id')
  async deleteSchedule(@Param('id') id: string) {
    return this.userSchedulesService.deleteSchedule(id);
  }

  @Post('exceptions')
  async createException(@Body() dto: CreateUserScheduleExceptionDto) {
    return this.userSchedulesService.createException(dto);
  }

  @Delete('exceptions/:id')
  async deleteException(@Param('id') id: string) {
    return this.userSchedulesService.deleteException(id);
  }
}
