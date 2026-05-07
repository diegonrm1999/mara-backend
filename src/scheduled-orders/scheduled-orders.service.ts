import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateScheduledOrderDto } from './dtos/create-scheduled-order.dto';
import { PromoteScheduledOrderDto } from './dtos/promote-scheduled-order.dto';
import { QueryScheduledOrdersDto } from './dtos/query-scheduled-orders.dto';
import {
  Role,
  ScheduledOrderStatus,
  ScheduleExceptionType,
} from '@prisma/client';

const SLOT_INTERVAL_MINUTES = 30;
const DEFAULT_TREATMENT_DURATION = 30;

@Injectable()
export class ScheduledOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // PUBLIC: Availability
  // ─────────────────────────────────────────────────────────────

  async getAvailability(
    shopId: string,
    treatmentIds: string[],
    date: string,
  ) {
    const targetDate = new Date(`${date}T00:00:00.000Z`);
    const dayOfWeek = targetDate.getUTCDay();

    // 1. Find eligible stylists: role Stylist or Supervisor with all requested treatments
    const eligibleUsers = await this.prisma.user.findMany({
      where: {
        shopId,
        deletedAt: null,
        role: { in: [Role.Stylist, Role.Supervisor] },
        treatments: {
          every: {}, // We'll filter below after fetching
        },
      },
      include: {
        treatments: { select: { treatmentId: true } },
        schedules: {
          where: { dayOfWeek },
        },
        scheduleExceptions: {
          where: {
            date: {
              gte: targetDate,
              lt: new Date(targetDate.getTime() + 86400000),
            },
          },
        },
      },
    });

    // Filter users that have ALL requested treatmentIds
    const treatmentIdSet = new Set(treatmentIds);
    const filteredUsers = eligibleUsers.filter((user) => {
      const userTreatmentIds = new Set(
        user.treatments.map((t) => t.treatmentId),
      );
      for (const tid of treatmentIdSet) {
        if (!userTreatmentIds.has(tid)) return false;
      }
      return true;
    });

    // 2. Calculate total duration
    const totalDuration = treatmentIds.length * DEFAULT_TREATMENT_DURATION;

    // 3. Get existing bookings for the date
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const existingBookings = await this.prisma.scheduledOrder.findMany({
      where: {
        shopId,
        status: { in: [ScheduledOrderStatus.Pending, ScheduledOrderStatus.Confirmed] },
        scheduledAt: { gte: startOfDay, lte: endOfDay },
      },
      select: {
        stylistId: true,
        scheduledAt: true,
        durationMinutes: true,
      },
    });

    // 4. Generate available slots per stylist
    const allSlots = new Set<string>();
    const stylistAvailability: {
      stylistId: string;
      stylistName: string;
      slots: string[];
    }[] = [];

    for (const user of filteredUsers) {
      // Check for day-off exception
      const exception = user.scheduleExceptions[0];
      if (exception?.type === ScheduleExceptionType.DayOff) {
        continue; // Stylist is off this day
      }

      // Determine schedule blocks
      let scheduleBlocks: { startTime: string; endTime: string }[];
      if (exception?.type === ScheduleExceptionType.CustomHours) {
        scheduleBlocks = [
          {
            startTime: exception.startTime!,
            endTime: exception.endTime!,
          },
        ];
      } else {
        scheduleBlocks = user.schedules.map((s) => ({
          startTime: s.startTime,
          endTime: s.endTime,
        }));
      }

      if (scheduleBlocks.length === 0) continue;

      // Get this stylist's bookings for the day
      const stylistBookings = existingBookings.filter(
        (b) => b.stylistId === user.id,
      );

      // Generate slots
      const availableSlots: string[] = [];
      for (const block of scheduleBlocks) {
        const blockStart = this.timeToMinutes(block.startTime);
        const blockEnd = this.timeToMinutes(block.endTime);

        for (
          let slotStart = blockStart;
          slotStart + totalDuration <= blockEnd;
          slotStart += SLOT_INTERVAL_MINUTES
        ) {
          const slotEnd = slotStart + totalDuration;

          // Check if slot conflicts with existing bookings
          const hasConflict = stylistBookings.some((booking) => {
            const bookingStart = this.dateToMinutes(booking.scheduledAt);
            const bookingEnd = bookingStart + booking.durationMinutes;
            return slotStart < bookingEnd && slotEnd > bookingStart;
          });

          if (!hasConflict) {
            const slotTime = this.minutesToTime(slotStart);
            availableSlots.push(slotTime);
            allSlots.add(slotTime);
          }
        }
      }

      if (availableSlots.length > 0) {
        stylistAvailability.push({
          stylistId: user.id,
          stylistName: `${user.firstName} ${user.lastName}`,
          slots: availableSlots,
        });
      }
    }

    return {
      date,
      slots: Array.from(allSlots).sort(),
      stylists: stylistAvailability,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC: Create Booking
  // ─────────────────────────────────────────────────────────────

  async createPublicBooking(dto: CreateScheduledOrderDto) {
    // 1. Validate treatments belong to the shop
    const treatments = await this.prisma.treatment.findMany({
      where: {
        id: { in: dto.treatmentIds },
        shopId: dto.shopId,
        deletedAt: null,
      },
    });

    if (treatments.length !== dto.treatmentIds.length) {
      throw new BadRequestException(
        'Uno o más tratamientos no pertenecen a este local',
      );
    }

    // 2. Re-verify availability for the selected slot
    const scheduledAt = new Date(dto.scheduledAt);
    const dateStr = scheduledAt.toISOString().split('T')[0];

    if (dto.stylistId) {
      const isAvailable = await this.checkSlotAvailable(
        dto.stylistId,
        scheduledAt,
        dto.durationMinutes,
      );
      if (!isAvailable) {
        throw new BadRequestException(
          'El horario seleccionado ya no está disponible',
        );
      }
    }

    // 3. Create ScheduledOrder
    const scheduledOrder = await this.prisma.scheduledOrder.create({
      data: {
        shopId: dto.shopId,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        scheduledAt,
        durationMinutes: dto.durationMinutes,
        stylistId: dto.stylistId,
        notes: dto.notes,
        status: ScheduledOrderStatus.Pending,
        source: 'Web',
        treatments: {
          create: dto.treatmentIds.map((treatmentId) => ({
            treatmentId,
          })),
        },
      },
      include: {
        treatments: {
          include: {
            treatment: {
              select: {
                id: true,
                name: true,
                basePrice: true,
              },
            },
          },
        },
        stylist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return scheduledOrder;
  }

  // ─────────────────────────────────────────────────────────────
  // INTERNAL: List Scheduled Orders
  // ─────────────────────────────────────────────────────────────

  async findAll(query: QueryScheduledOrdersDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { shopId: query.shopId };
    if (query.status) where.status = query.status;
    if (query.stylistId) where.stylistId = query.stylistId;
    if (query.date) {
      const startOfDay = new Date(`${query.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${query.date}T23:59:59.999Z`);
      where.scheduledAt = { gte: startOfDay, lte: endOfDay };
    }

    const [orders, totalCount] = await Promise.all([
      this.prisma.scheduledOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          treatments: {
            include: {
              treatment: {
                select: {
                  id: true,
                  name: true,
                  basePrice: true,
                },
              },
            },
          },
          stylist: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dni: true,
            },
          },
        },
      }),
      this.prisma.scheduledOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // INTERNAL: Update Status
  // ─────────────────────────────────────────────────────────────

  async updateStatus(id: string, status: ScheduledOrderStatus) {
    const allowedStatuses: ScheduledOrderStatus[] = [
      ScheduledOrderStatus.Confirmed,
      ScheduledOrderStatus.Cancelled,
      ScheduledOrderStatus.NoShow,
    ];

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(
        `Status '${status}' no permitido. Use: ${allowedStatuses.join(', ')}`,
      );
    }

    const scheduledOrder = await this.prisma.scheduledOrder.findUnique({
      where: { id },
    });

    if (!scheduledOrder) {
      throw new NotFoundException('ScheduledOrder no encontrada');
    }

    return this.prisma.scheduledOrder.update({
      where: { id },
      data: { status },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // INTERNAL: Promote to Order
  // ─────────────────────────────────────────────────────────────

  async promote(id: string, dto: PromoteScheduledOrderDto) {
    const scheduledOrder = await this.prisma.scheduledOrder.findUnique({
      where: { id },
      include: {
        treatments: true,
      },
    });

    if (!scheduledOrder) {
      throw new NotFoundException('ScheduledOrder no encontrada');
    }

    if (scheduledOrder.status !== ScheduledOrderStatus.Confirmed) {
      throw new BadRequestException(
        'Solo se pueden promover órdenes con status Confirmed',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve client
      let clientId = dto.clientId;

      if (dto.newClient) {
        // Check if client with DNI already exists in the shop
        const existing = await tx.client.findFirst({
          where: {
            dni: dto.newClient.dni,
            shopId: scheduledOrder.shopId,
            deletedAt: null,
          },
        });

        if (existing) {
          clientId = existing.id;
        } else {
          const newClient = await tx.client.create({
            data: {
              dni: dto.newClient.dni,
              firstName: dto.newClient.firstName,
              lastName: dto.newClient.lastName,
              phone: dto.newClient.phone,
              email: dto.newClient.email,
              shopId: scheduledOrder.shopId,
            },
          });
          clientId = newClient.id;
        }
      }

      if (!clientId) {
        throw new BadRequestException(
          'Se requiere clientId o newClient para promover la orden',
        );
      }

      // 2. Increment order number
      const shop = await tx.shop.update({
        where: { id: scheduledOrder.shopId },
        data: { lastOrderNumber: { increment: 1 } },
        select: { lastOrderNumber: true },
      });

      // 3. Calculate totals
      const totalPrice = dto.treatments.reduce((sum, t) => sum + t.price, 0);

      // Get treatment percentages
      const treatmentDetails = await tx.treatment.findMany({
        where: {
          id: { in: dto.treatments.map((t) => t.treatmentId) },
        },
        select: { id: true, percentage: true },
      });

      const percentageMap = new Map(
        treatmentDetails.map((t) => [t.id, t.percentage]),
      );

      const stylistEarnings = dto.treatments.reduce((sum, t) => {
        const percentage = percentageMap.get(t.treatmentId) ?? 0;
        return sum + (t.price * percentage) / 100;
      }, 0);

      // 4. Create Order
      const order = await tx.order.create({
        data: {
          shopId: scheduledOrder.shopId,
          stylistId: dto.stylistId,
          cashierId: dto.cashierId,
          supervisorId: dto.supervisorId,
          clientId,
          orderNumber: shop.lastOrderNumber,
          totalPrice,
          stylistEarnings: Number(stylistEarnings.toFixed(2)),
          status: 'Created',
          treatments: {
            create: dto.treatments.map((t) => ({
              treatmentId: t.treatmentId,
              price: t.price,
            })),
          },
        },
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
          cashier: {
            select: { id: true, firstName: true, lastName: true },
          },
          client: {
            select: { id: true, firstName: true, lastName: true, dni: true },
          },
        },
      });

      // 5. Update ScheduledOrder
      await tx.scheduledOrder.update({
        where: { id },
        data: {
          status: ScheduledOrderStatus.Completed,
          orderId: order.id,
          clientId,
        },
      });

      return order;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  private async checkSlotAvailable(
    stylistId: string,
    scheduledAt: Date,
    durationMinutes: number,
  ): Promise<boolean> {
    const slotEnd = new Date(
      scheduledAt.getTime() + durationMinutes * 60 * 1000,
    );

    const conflicting = await this.prisma.scheduledOrder.findFirst({
      where: {
        stylistId,
        status: {
          in: [ScheduledOrderStatus.Pending, ScheduledOrderStatus.Confirmed],
        },
        OR: [
          {
            // Existing booking starts during our slot
            scheduledAt: { gte: scheduledAt, lt: slotEnd },
          },
          {
            // Existing booking ends during our slot
            AND: [
              { scheduledAt: { lt: scheduledAt } },
              // We approximate by checking if the booking could overlap
            ],
          },
        ],
      },
    });

    // More precise check: compute actual overlap
    if (conflicting) {
      const existingEnd = new Date(
        conflicting.scheduledAt.getTime() +
          conflicting.durationMinutes * 60 * 1000,
      );
      return scheduledAt >= existingEnd || slotEnd <= conflicting.scheduledAt;
    }

    return true;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private dateToMinutes(date: Date): number {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }
}
