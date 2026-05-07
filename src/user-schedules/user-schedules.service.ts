import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserScheduleDto } from './dtos/create-user-schedule.dto';
import { CreateUserScheduleExceptionDto } from './dtos/create-user-schedule-exception.dto';

@Injectable()
export class UserSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSchedule(dto: CreateUserScheduleDto) {
    return this.prisma.userSchedule.create({
      data: {
        userId: dto.userId,
        shopId: dto.shopId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async deleteSchedule(id: string) {
    const schedule = await this.prisma.userSchedule.findUnique({
      where: { id },
    });
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    return this.prisma.userSchedule.delete({
      where: { id },
    });
  }

  async createException(dto: CreateUserScheduleExceptionDto) {
    // Normalize date to midnight UTC for consistent queries
    const normalizedDate = new Date(`${dto.date}T00:00:00.000Z`);

    return this.prisma.userScheduleException.create({
      data: {
        userId: dto.userId,
        date: normalizedDate,
        type: dto.type,
        startTime: dto.startTime,
        endTime: dto.endTime,
        reason: dto.reason,
      },
    });
  }

  async deleteException(id: string) {
    const exception = await this.prisma.userScheduleException.findUnique({
      where: { id },
    });
    if (!exception) {
      throw new Error('Schedule exception not found');
    }
    return this.prisma.userScheduleException.delete({
      where: { id },
    });
  }

  /**
   * Get schedule blocks for a user on a specific day of week
   */
  async getScheduleForDay(userId: string, dayOfWeek: number) {
    return this.prisma.userSchedule.findMany({
      where: { userId, dayOfWeek },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Get exception for a user on a specific date
   */
  async getExceptionForDate(userId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return this.prisma.userScheduleException.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  }
}
