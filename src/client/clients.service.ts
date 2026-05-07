import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import axios from 'axios';
import { CreateOrderDto } from 'src/orders/dto/create-order.dto';
import { AuthUser } from 'src/auth/models/auth-user';
import { GetClientsDto } from './dto/get-client.dto';
import { buildDateFilter } from 'src/utils/filters';

function capitalizeWords(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface ReniecResponse {
  success: boolean;
  data: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
  };
}

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async upsertOrderClient(dto: CreateOrderDto, shopId: string) {
    const client = await this.prisma.client.upsert({
      where: { dni: dto.clientDni },
      update: {
        name: dto.clientName,
        phone: dto.clientPhone,
        email: dto.clientEmail,
        shopId,
        deletedAt: null, // Restore if soft-deleted
      },
      create: {
        dni: dto.clientDni,
        name: dto.clientName,
        phone: dto.clientPhone,
        email: dto.clientEmail,
        shopId,
      },
    });
    return client.id;
  }

  async resolveClientByDni(
    dto: CreateOrderDto,
    clientId: string,
    currentDni: string,
    shopId: string,
  ): Promise<string> {
    const { clientDni, clientName, clientPhone, clientEmail } = dto;
    if (clientDni === currentDni) {
      await this.prisma.client.update({
        where: { id: clientId },
        data: { name: clientName, phone: clientPhone, email: clientEmail },
      });
      return clientId;
    }
    const existingClient = await this.prisma.client.findUnique({
      where: { dni: clientDni },
    });
    if (existingClient) {
      await this.prisma.client.update({
        where: { id: existingClient.id },
        data: { name: clientName, phone: clientPhone, email: clientEmail },
      });
      return existingClient.id;
    }
    const newClient = await this.prisma.client.create({
      data: {
        dni: clientDni,
        name: clientName,
        phone: clientPhone,
        email: clientEmail,
        shopId,
      },
    });

    return newClient.id;
  }

  async findByDni(dni: string): Promise<Partial<Client>> {
    const client = await this.prisma.client.findFirst({
      where: { dni, deletedAt: null },
      select: { dni: true, name: true, phone: true, email: true },
    });
    if (client) return client;

    const apiUrl = this.configService.get<string>('reniec.apiUrl');
    const token = this.configService.get<string>('reniec.token');

    try {
      const response = await axios.post<ReniecResponse>(
        apiUrl,
        {
          dni: dni,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (response.data.success === false) {
        throw new Error('Cliente no encontrado en Reniec');
      }
      const nombres = response.data.data.nombres || '';
      const apellidoPaterno = response.data.data.apellido_paterno || '';
      const apellidoMaterno = response.data.data.apellido_materno || '';

      const fullName = capitalizeWords(
        `${nombres} ${apellidoPaterno} ${apellidoMaterno}`,
      );
      return {
        dni,
        name: fullName,
      };
    } catch (error) {
      throw new Error('Cliente no encontrado ni en la BD ni en Reniec');
    }
  }

  async findAll(user: AuthUser) {
    return await this.prisma.client.findMany({
      where: { shopId: user.shopId, deletedAt: null },
    });
  }

  async getClients(shopId: string, filters: GetClientsDto) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    // Where clause optimizado
    const where = this.buildWhereClause(shopId, filters);

    // Consultas en paralelo
    const [clients, totalCount] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          dni: true,
          name: true,
          phone: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          // Agregar estadísticas de órdenes
          orders: {
            select: {
              id: true,
              totalPrice: true,
              createdAt: true,
              status: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: { orders: true },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients,
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

  async softDelete(id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!client) {
      throw new Error('Client not found');
    }
    return await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private buildWhereClause(shopId: string, filters: GetClientsDto) {
    const where: any = { shopId, deletedAt: null };
    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          dni: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }
    where.createdAt = buildDateFilter(filters.startDate, filters.endDate);
    return where;
  }
}
