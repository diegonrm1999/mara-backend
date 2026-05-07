import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { OrdersGateway } from './orders.gateway';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { NotificationService } from 'src/services/notification.service';
import { AuthUser } from 'src/auth/models/auth-user';
import { ClientsService } from 'src/client/clients.service';
import { UsersService } from 'src/users/users.service';
import { TreatmentsService } from 'src/treatments/treatments.service';
import { GetOrdersDto } from './dto/get-order-paginate.dto';
import { OrderReceiptData } from 'src/email/dto/order-receipt.dto';
import { buildDateFilter } from 'src/utils/filters';
import { DailySummaryResponseDto } from './dto/get-daily-summary.dto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { DateUtils } from 'src/utils/date.utils';

type OrderTreatment = {
  treatment: { name: string };
  price: number;
  quantity?: number;
};
@Injectable()
export class OrdersService {
  private lambdaClient: LambdaClient;

  constructor(
    private prisma: PrismaService,
    private readonly orderGateway: OrdersGateway,
    private readonly notificationService: NotificationService,
    private readonly clientService: ClientsService,
    private readonly userService: UsersService,
    private readonly treatmentService: TreatmentsService,
  ) {
    this.lambdaClient = new LambdaClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  private async findOrderByIdWithSelect<T extends Prisma.OrderSelect>(
    id: string,
    select: T,
  ): Promise<Prisma.OrderGetPayload<{ select: T }>> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select,
    });

    if (!order) {
      throw new Error(`Orden no encontrada`);
    }

    return order;
  }

  async createOrder(dto: CreateOrderDto, user: AuthUser) {
    await this.userService.ensureCanCreateOrder(user.id);
    const treatmentIds = new Set(dto.treatments.map((t) => t.treatmentId));
    await this.treatmentService.validateTreatments(treatmentIds);
    let clientId = await this.clientService.upsertOrderClient(dto, user.shopId);

    const totalPrice = dto.treatments.reduce(
      (sum, treatment) => sum + treatment.price,
      0,
    );

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const shop = await tx.shop.update({
        where: { id: user.shopId },
        data: { lastOrderNumber: { increment: 1 } },
        select: { lastOrderNumber: true },
      });

      return tx.order.create({
        data: {
          stylistId: dto.stylistId,
          cashierId: dto.cashierId,
          clientId: clientId,
          supervisorId: user.id,
          shopId: user.shopId,
          totalPrice: totalPrice,
          orderNumber: shop.lastOrderNumber,
          treatments: {
            create: dto.treatments.map((t) => ({
              treatmentId: t.treatmentId,
              price: t.price,
            })),
          },
        },
        include: {
          treatments: true,
        },
      });
    });

    this.orderGateway.emitOrderRefresh(
      createdOrder.supervisorId,
      createdOrder.cashierId,
      user.id,
    );
    await this.notificationService.assignCashierNotification(dto.cashierId);
    return createdOrder;
  }

  async restoreOrder(id: string, userId: string) {
    const order = await this.findOrderByIdWithSelect(id, {
      status: true,
      cashierId: true,
      supervisorId: true,
    });

    if (order.status !== OrderStatus.Completed) {
      throw new Error('Solo ordenes completadas pueden ser restauradas');
    }

    const restoredOrder = this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.Created,
      },
    });

    this.orderGateway.completeRefresh(
      order.supervisorId,
      order.cashierId,
      userId,
    );
    this.orderGateway.emitOrderRefresh(
      order.supervisorId,
      order.cashierId,
      userId,
    );
    return restoredOrder;
  }

  async cancelOrder(id: string, userId: string) {
    const order = await this.findOrderByIdWithSelect(id, {
      status: true,
      cashierId: true,
      supervisorId: true,
      totalPrice: true,
    });

    if (order.status !== OrderStatus.Created) {
      throw new Error('Orden no se puede cancelar');
    }

    const orderUpdated = this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.Cancelled,
      },
    });
    this.orderGateway.emitOrderRefresh(
      order.supervisorId,
      order.cashierId,
      userId,
    );
    return orderUpdated;
  }

  async completeOrder(id: string, dto: CompleteOrderDto, userId: string) {
    if (!dto.paymentMethod) {
      throw new BadRequestException(
        'paidAmount y paymentMethod son requeridos para completar una orden',
      );
    }

    const order = await this.findOrderByIdWithSelect(id, {
      status: true,
      cashierId: true,
      supervisorId: true,
      totalPrice: true,
      treatments: {
        include: {
          treatment: {
            select: { percentage: true },
          },
        },
      },
    });

    if (order.status === OrderStatus.Completed) {
      throw new Error('Orden ya está completada');
    }

    const stylistEarnings = order.treatments.reduce((total, orderTreatment) => {
      const percentage = orderTreatment.treatment.percentage / 100;
      return total + orderTreatment.price * percentage;
    }, 0);

    const orderUpdated = this.prisma.order.update({
      where: { id },
      data: {
        paidAmount: order.totalPrice,
        paymentMethod: dto.paymentMethod,
        status: OrderStatus.Completed,
        ticketNumber: dto.ticketNumber,
        stylistEarnings: Number(stylistEarnings.toFixed(2)),
      },
      select: {
        id: true,
        createdAt: true,
        orderNumber: true,
        totalPrice: true,
        paidAmount: true,
        paymentMethod: true,
        ticketNumber: true,
        status: true,
        treatments: {
          select: {
            treatment: {
              select: {
                id: true,
                name: true,
              },
            },
            price: true,
          },
        },
        cashier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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
            name: true,
            dni: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    this.orderGateway.completeRefresh(
      order.supervisorId,
      order.cashierId,
      userId,
    );
    this.orderGateway.emitOrderRefresh(
      order.supervisorId,
      order.cashierId,
      userId,
    );
    return orderUpdated;
  }

  async updateOrder(id: string, dto: CreateOrderDto, user: AuthUser) {
    const order = await this.findOrderByIdWithSelect(id, {
      status: true,
      cashierId: true,
      supervisorId: true,
      totalPrice: true,
      clientId: true,
      client: {
        select: {
          dni: true,
        },
      },
    });

    if (order.status === OrderStatus.Completed) {
      throw new Error('No se puede actualizar una orden completada');
    }

    const clientId = await this.clientService.resolveClientByDni(
      dto,
      order.clientId,
      order.client.dni,
      user.shopId,
    );

    const totalPrice = dto.treatments.reduce(
      (sum, treatment) => sum + treatment.price,
      0,
    );

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        totalPrice: totalPrice,
        client: { connect: { id: clientId } },
        ...(dto.stylistId && {
          stylist: { connect: { id: dto.stylistId } },
        }),
        ...(dto.cashierId && {
          cashier: { connect: { id: dto.cashierId } },
        }),
        treatments: {
          deleteMany: {},
          create: dto.treatments.map((treatment) => ({
            treatment: { connect: { id: treatment.treatmentId } },
            price: treatment.price,
          })),
        },
      },
      include: {
        treatments: true,
      },
    });
    this.orderGateway.emitOrderRefresh(
      updatedOrder.supervisorId,
      updatedOrder.cashierId,
      user.id,
    );
    await this.notificationService.assignCashierNotification(dto.cashierId);
    return updatedOrder;
  }

  async getOrderById(id: string) {
    return await this.findOrderByIdWithSelect(id, {
      id: true,
      createdAt: true,
      orderNumber: true,
      totalPrice: true,
      paidAmount: true,
      paymentMethod: true,
      ticketNumber: true,
      status: true,
      treatments: {
        select: {
          treatment: {
            select: {
              id: true,
              name: true,
            },
          },
          price: true,
        },
      },
      cashier: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
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
          name: true,
          dni: true,
          phone: true,
          email: true,
        },
      },
    });
  }

  async getPendingOrdersForUser(
    user: { id: string; rol: Role },
    statuses: OrderStatus[],
  ) {
    const startOfDay = DateUtils.getStartOfDayUTC();

    const endOfDay = DateUtils.getEndOfDayUTC();

    const whereClause =
      user.rol === Role.Cashier
        ? {
            cashierId: user.id,
            status: { in: statuses },
            createdAt: { gte: startOfDay, lte: endOfDay },
          }
        : user.rol === Role.Supervisor
          ? {
              supervisorId: user.id,
              status: { in: statuses },
              createdAt: { gte: startOfDay, lte: endOfDay },
            }
          : {
              OR: [{ cashierId: user.id }, { supervisorId: user.id }],
              status: { in: statuses },
              createdAt: { gte: startOfDay, lte: endOfDay },
            };

    return this.prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        createdAt: true,
        orderNumber: true,
        totalPrice: true,
        stylist: {
          select: {
            id: true,
            firstName: true,
          },
        },
        client: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getOrders(shopId: string, filters: GetOrdersDto) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(shopId, filters);

    const [orders, totalCount, totalAmountAgg] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { orderNumber: 'desc' }],
        select: {
          id: true,
          orderNumber: true,
          totalPrice: true,
          paidAmount: true,
          paymentMethod: true,
          status: true,
          ticketNumber: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              name: true,
              dni: true,
              phone: true,
              email: true,
            },
          },
          stylist: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          stylistEarnings: true,
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          cashier: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: { treatments: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where,
        _sum: {
          totalPrice: true,
        },
      }),
    ]);

    return {
      data: orders,
      meta: {
        page,
        limit,
        total: totalCount,
        totalAmount: totalAmountAgg._sum.totalPrice ?? 0,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    };
  }

  async sendOrderReceipt(
    orderId: string,
  ): Promise<{ message: string; status: string }> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          client: true,
          shop: true,
          stylist: true,
          supervisor: true,
          cashier: true,
          treatments: {
            include: {
              treatment: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error('Orden no encontrada');
      }
      this.validateOrderForReceipt(order);
      const receiptData = this.buildReceiptData(order);
      const command = new InvokeCommand({
        FunctionName: 'GeneratePDFReceipt',
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify(receiptData)),
      });

      await this.lambdaClient.send(command);
      return {
        message: 'Recibo enviado exitosamente',
        status: 'success',
      };
    } catch (error) {
      throw Error('Error al enviar el recibo');
    }
  }

  async getDailySummary(
    user: { id: string; rol: Role },
    date: string,
  ): Promise<DailySummaryResponseDto> {
    const { start, end } = this.buildDateRange(date);
    const userField =
      user.rol === Role.Cashier
        ? {
            cashierId: user.id,
          }
        : {
            OR: [{ cashierId: user.id }, { supervisorId: user.id }],
          };
    const orders = await this.prisma.order.findMany({
      where: {
        ...userField,
        status: 'Completed',
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        stylist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const totalEarnings = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalOrders = orders.length;

    const payments = {
      cash: 0,
      yape: 0,
      card: 0,
    };

    const mapStylist = new Map<
      string,
      { stylistId: string; stylistName: string; count: number }
    >();

    for (const o of orders) {
      const amount = o.paidAmount ?? o.totalPrice;

      switch (o.paymentMethod) {
        case 'Cash':
          payments.cash += amount;
          break;
        case 'Yape':
          payments.yape += amount;
          break;
        case 'Card':
          payments.card += amount;
          break;
      }

      if (!mapStylist.has(o.stylistId)) {
        mapStylist.set(o.stylistId, {
          stylistId: o.stylistId,
          stylistName: `${o.stylist.firstName} ${o.stylist.lastName}`,
          count: 1,
        });
      } else {
        mapStylist.get(o.stylistId)!.count++;
      }
    }

    const ordersByStylist = [...mapStylist.values()];

    return {
      date,
      cashierId: user.id,
      totalEarnings,
      totalOrders,
      payments,
      ordersByStylist,
    };
  }

  private mergeTreatments(orderTreatments: OrderTreatment[]) {
    if (!orderTreatments || orderTreatments.length === 0) return [];

    const out: { name: string; price: number; quantity: number }[] = [];
    const indexMap = new Map<string, number>();
    for (const ot of orderTreatments) {
      const name = ot.treatment.name;
      const price = ot.price;
      const qty = ot.quantity ?? 1;
      const key = `${name}\0${price}`;
      const idx = indexMap.get(key);
      if (idx !== undefined) {
        out[idx].quantity += qty;
      } else {
        indexMap.set(key, out.length);
        out.push({ name, price, quantity: qty });
      }
    }
    return out;
  }

  private buildReceiptData(order: any): OrderReceiptData {
    return {
      orderNumber: order.orderNumber.toString(),
      ticketNumber: order.ticketNumber || '',
      clientName: 'Diego Narrea Mori',
      clientEmail: order.client.email,
      shopName: order.shop.name,
      shopAddress1: 'JR. UCAYALI # 724 - GALERIA BARRIO CHINO',
      shopAddress2: 'SEGUNDO PISO - # 207',
      shopAddress3: 'LIMA - LIMA - LIMA',
      shopPhone: '924151512',
      shopRuc: '20448100180',
      date: this.formatDate(DateUtils.toPeruTime(order.createdAt)),
      time: this.formatTime(DateUtils.toPeruTime(order.createdAt)),
      stylistName: '-',
      supervisorName: `${order.supervisor.firstName} ${order.supervisor.lastName ?? ''}`,
      cashierName: '-',
      treatments: this.mergeTreatments(order.treatments),
      totalPrice: order.totalPrice,
      paidAmount: order.paidAmount || 0,
      paymentMethod: order.paymentMethod,
      currency: 'S/',
    };
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  private validateOrderForReceipt(order: any): void {
    if (order.status !== OrderStatus.Completed) {
      throw new Error(
        `Solo se pueden enviar recibos de órdenes completadas. Estado actual: ${order.status}`,
      );
    }
    if (!order.client.email) {
      throw new Error(
        `El cliente "${order.client.name}" no tiene email registrado`,
      );
    }
  }

  private buildWhereClause(shopId: string, filters: GetOrdersDto) {
    const where: any = { shopId };

    if (filters.stylistId) where.stylistId = filters.stylistId;
    if (filters.supervisorId) where.supervisorId = filters.supervisorId;
    if (filters.cashierId) where.cashierId = filters.cashierId;
    if (filters.status) where.status = filters.status;
    if (filters.orderNumber) where.orderNumber = filters.orderNumber;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;

    where.createdAt = buildDateFilter(filters.startDate, filters.endDate);
    return where;
  }

  private buildDateRange(date: string) {
    const start = DateUtils.parsePeruStartUTC(date);
    const end = DateUtils.parsePeruEndUTC(date);
    return { start, end };
  }
}
