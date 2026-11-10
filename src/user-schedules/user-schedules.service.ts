import { Injectable, NotFoundException } from '@nestjs/common';
import { Role, ScheduleExceptionType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUser } from 'src/auth/models/auth-user';
import { CreateUserScheduleDto } from './dtos/create-user-schedule.dto';
import { CreateUserScheduleExceptionDto } from './dtos/create-user-schedule-exception.dto';
import {
  ReplaceWeekDto,
  UpdateUserScheduleDto,
} from './dtos/update-user-schedule.dto';
import { assertValidRange, assertValidWeek } from './schedule-validation';

/** Only these roles take bookings, so only they have schedules. */
const SCHEDULABLE_ROLES: Role[] = [Role.Stylist, Role.Supervisor];

@Injectable()
export class UserSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findSchedulesByUser(userId: string, user: AuthUser) {
    await this.assertStaffInShop(userId, user.shopId);
    return this.prisma.userSchedule.findMany({
      where: { userId, shopId: user.shopId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async createSchedule(dto: CreateUserScheduleDto, user: AuthUser) {
    await this.assertStaffInShop(dto.userId, user.shopId);
    assertValidRange(dto.startTime, dto.endTime);
    const sameDay = await this.prisma.userSchedule.findMany({
      where: {
        userId: dto.userId,
        shopId: user.shopId,
        dayOfWeek: dto.dayOfWeek,
      },
    });
    assertValidWeek([...sameDay, dto]);

    return this.prisma.userSchedule.create({
      data: {
        userId: dto.userId,
        shopId: user.shopId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async updateSchedule(id: string, dto: UpdateUserScheduleDto, user: AuthUser) {
    const existing = await this.findOwnedSchedule(id, user.shopId);
    const next = {
      dayOfWeek: dto.dayOfWeek ?? existing.dayOfWeek,
      startTime: dto.startTime ?? existing.startTime,
      endTime: dto.endTime ?? existing.endTime,
    };
    const others = await this.prisma.userSchedule.findMany({
      where: {
        userId: existing.userId,
        shopId: user.shopId,
        dayOfWeek: next.dayOfWeek,
        id: { not: id },
      },
    });
    assertValidWeek([...others, next]);

    return this.prisma.userSchedule.update({ where: { id }, data: next });
  }

  /**
   * Replace a person's whole weekly schedule in one transaction: the given
   * blocks become the schedule, days without blocks become days off.
   */
  async replaceWeek(userId: string, dto: ReplaceWeekDto, user: AuthUser) {
    await this.assertStaffInShop(userId, user.shopId);
    assertValidWeek(dto.blocks);

    return this.prisma.$transaction(async (tx) => {
      await tx.userSchedule.deleteMany({
        where: { userId, shopId: user.shopId },
      });
      await tx.userSchedule.createMany({
        data: dto.blocks.map((b) => ({
          userId,
          shopId: user.shopId,
          dayOfWeek: b.dayOfWeek,
          startTime: b.startTime,
          endTime: b.endTime,
        })),
      });
      return tx.userSchedule.findMany({
        where: { userId, shopId: user.shopId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });
  }

  async deleteSchedule(id: string, user: AuthUser) {
    await this.findOwnedSchedule(id, user.shopId);
    return this.prisma.userSchedule.delete({ where: { id } });
  }

  async findUpcomingExceptions(userId: string, user: AuthUser) {
    await this.assertStaffInShop(userId, user.shopId);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return this.prisma.userScheduleException.findMany({
      where: { userId, date: { gte: today } },
      orderBy: { date: 'asc' },
    });
  }

  /** One exception per person and date: posting again for the same date updates it. */
  async upsertException(dto: CreateUserScheduleExceptionDto, user: AuthUser) {
    await this.assertStaffInShop(dto.userId, user.shopId);
    const isCustom = dto.type === ScheduleExceptionType.CustomHours;
    if (isCustom) assertValidRange(dto.startTime!, dto.endTime!);

    // Normalize date to midnight UTC for consistent queries
    const date = new Date(`${dto.date}T00:00:00.000Z`);
    const data = {
      type: dto.type,
      startTime: isCustom ? dto.startTime : null,
      endTime: isCustom ? dto.endTime : null,
      reason: dto.reason ?? null,
    };

    return this.prisma.userScheduleException.upsert({
      where: { userId_date: { userId: dto.userId, date } },
      create: { userId: dto.userId, date, ...data },
      update: data,
    });
  }

  async deleteException(id: string, user: AuthUser) {
    const exception = await this.prisma.userScheduleException.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!exception) {
      throw new NotFoundException('Excepción de horario no encontrada');
    }
    await this.assertStaffInShop(exception.userId, user.shopId);
    return this.prisma.userScheduleException.delete({ where: { id } });
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

  private async assertStaffInShop(userId: string, shopId: string) {
    const staff = await this.prisma.user.findFirst({
      where: {
        id: userId,
        shopId,
        deletedAt: null,
        role: { in: SCHEDULABLE_ROLES },
      },
      select: { id: true },
    });
    if (!staff) {
      throw new NotFoundException('Especialista no encontrada en este local');
    }
  }

  private async findOwnedSchedule(id: string, shopId: string) {
    const schedule = await this.prisma.userSchedule.findFirst({
      where: { id, shopId },
    });
    if (!schedule) {
      throw new NotFoundException('Horario no encontrado');
    }
    return schedule;
  }
}
