import { Injectable } from '@nestjs/common';
import { OrderStatus, ScheduledOrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { DateUtils } from 'src/utils/date.utils';
import { DashboardScheduledOrdersDto } from './dto/dashboard-scheduled.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSimpleStats(shopId: string): Promise<DashboardStats> {
    const nowPeru = DateUtils.getNowInPeru();

    const startOfToday = DateUtils.getStartOfDayUTC(nowPeru);
    const startOfWeek = DateUtils.getStartOfWeekUTC(nowPeru);
    const startOfMonth = DateUtils.getStartOfMonthUTC(nowPeru);

    const [
      totalClients,
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      salesToday,
      salesThisWeek,
      salesThisMonth,
      topStylistData,
    ] = await Promise.all([
      this.prisma.client.count({
        where: { shopId, deletedAt: null },
      }),

      this.prisma.order.count({
        where: {
          shopId,
          createdAt: { gte: startOfToday },
        },
      }),

      this.prisma.order.count({
        where: {
          shopId,
          createdAt: { gte: startOfWeek },
        },
      }),

      this.prisma.order.count({
        where: {
          shopId,
          createdAt: { gte: startOfMonth },
        },
      }),

      this.prisma.order.aggregate({
        where: {
          shopId,
          createdAt: { gte: startOfToday },
          status: OrderStatus.Completed,
        },
        _sum: { totalPrice: true },
      }),

      this.prisma.order.aggregate({
        where: {
          shopId,
          createdAt: { gte: startOfWeek },
          status: OrderStatus.Completed,
        },
        _sum: { totalPrice: true },
      }),

      this.prisma.order.aggregate({
        where: {
          shopId,
          createdAt: { gte: startOfMonth },
          status: OrderStatus.Completed,
        },
        _sum: { totalPrice: true },
      }),

      this.prisma.user.findMany({
        where: {
          shopId,
          role: 'Stylist',
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              stylistOrders: {
                where: {
                  createdAt: { gte: startOfWeek },
                },
              },
            },
          },
        },
        orderBy: {
          stylistOrders: {
            _count: 'desc',
          },
        },
        take: 1,
      }),
    ]);

    let topStylistWeek = null;
    if (
      topStylistData.length > 0 &&
      topStylistData[0]._count.stylistOrders > 0
    ) {
      topStylistWeek = {
        name: `${topStylistData[0].firstName} ${topStylistData[0].lastName}`,
        orders: topStylistData[0]._count.stylistOrders,
      };
    }

    return {
      totalClients,
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      salesToday: salesToday._sum.totalPrice || 0,
      salesThisWeek: salesThisWeek._sum.totalPrice || 0,
      salesThisMonth: salesThisMonth._sum.totalPrice || 0,
      topStylistWeek,
    };
  }

  async getScheduledOrderStats(filters: DashboardScheduledOrdersDto) {
    const where: any = { shopId: filters.shopId };

    if (filters.status) where.status = filters.status;
    if (filters.stylistId) where.stylistId = filters.stylistId;
    if (filters.startDate || filters.endDate) {
      where.scheduledAt = {};
      if (filters.startDate) {
        where.scheduledAt.gte = new Date(`${filters.startDate}T00:00:00.000Z`);
      }
      if (filters.endDate) {
        where.scheduledAt.lte = new Date(`${filters.endDate}T23:59:59.999Z`);
      }
    }

    const [
      scheduledOrders,
      totalCount,
      statusCounts,
    ] = await Promise.all([
      this.prisma.scheduledOrder.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        include: {
          treatments: {
            include: {
              treatment: {
                select: { id: true, name: true },
              },
            },
          },
          stylist: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.scheduledOrder.count({ where }),
      this.prisma.scheduledOrder.groupBy({
        by: ['status'],
        where: { shopId: filters.shopId },
        _count: { id: true },
      }),
    ]);

    // Build metrics
    const statusMap: Record<string, number> = {};
    for (const sc of statusCounts) {
      statusMap[sc.status] = sc._count.id;
    }

    const total =
      Object.values(statusMap).reduce((a, b) => a + b, 0) || 1;
    const completed = statusMap[ScheduledOrderStatus.Completed] ?? 0;
    const noShow = statusMap[ScheduledOrderStatus.NoShow] ?? 0;

    return {
      data: scheduledOrders,
      meta: {
        total: totalCount,
      },
      metrics: {
        byStatus: statusMap,
        conversionRate: Number(((completed / total) * 100).toFixed(2)),
        noShowRate: Number(((noShow / total) * 100).toFixed(2)),
      },
    };
  }
}
