import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthUser } from 'src/auth/models/auth-user';
import { UserSchedulesService } from './user-schedules.service';
import { CreateUserScheduleDto } from './dtos/create-user-schedule.dto';
import { CreateUserScheduleExceptionDto } from './dtos/create-user-schedule-exception.dto';
import {
  ReplaceWeekDto,
  UpdateUserScheduleDto,
} from './dtos/update-user-schedule.dto';

/** Everything is scoped to the caller's shop; only Admin and Supervisor can change schedules. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user-schedules')
export class UserSchedulesController {
  constructor(private readonly userSchedulesService: UserSchedulesService) {}

  @Get(':userId')
  getSchedules(@Param('userId') userId: string, @Req() req: Request) {
    return this.userSchedulesService.findSchedulesByUser(
      userId,
      req.user as AuthUser,
    );
  }

  @Get(':userId/exceptions')
  getExceptions(@Param('userId') userId: string, @Req() req: Request) {
    return this.userSchedulesService.findUpcomingExceptions(
      userId,
      req.user as AuthUser,
    );
  }

  @Roles(Role.Admin, Role.Supervisor)
  @Post()
  createSchedule(@Body() dto: CreateUserScheduleDto, @Req() req: Request) {
    return this.userSchedulesService.createSchedule(dto, req.user as AuthUser);
  }

  @Roles(Role.Admin, Role.Supervisor)
  @Put(':userId/week')
  replaceWeek(
    @Param('userId') userId: string,
    @Body() dto: ReplaceWeekDto,
    @Req() req: Request,
  ) {
    return this.userSchedulesService.replaceWeek(
      userId,
      dto,
      req.user as AuthUser,
    );
  }

  @Roles(Role.Admin, Role.Supervisor)
  @Post('exceptions')
  upsertException(
    @Body() dto: CreateUserScheduleExceptionDto,
    @Req() req: Request,
  ) {
    return this.userSchedulesService.upsertException(dto, req.user as AuthUser);
  }

  @Roles(Role.Admin, Role.Supervisor)
  @Delete('exceptions/:id')
  deleteException(@Param('id') id: string, @Req() req: Request) {
    return this.userSchedulesService.deleteException(id, req.user as AuthUser);
  }

  @Roles(Role.Admin, Role.Supervisor)
  @Patch(':id')
  updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateUserScheduleDto,
    @Req() req: Request,
  ) {
    return this.userSchedulesService.updateSchedule(
      id,
      dto,
      req.user as AuthUser,
    );
  }

  @Roles(Role.Admin, Role.Supervisor)
  @Delete(':id')
  deleteSchedule(@Param('id') id: string, @Req() req: Request) {
    return this.userSchedulesService.deleteSchedule(id, req.user as AuthUser);
  }
}
