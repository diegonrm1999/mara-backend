import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user';
import { AuthUser } from 'src/auth/models/auth-user';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(dto: CreateUserDto) {
    var hashedPassword = null;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }
    return await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
        firstName: dto.firstName,
        lastName: dto.lastName,
        shopId: dto.shopId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        shopId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    var hashedPassword = null;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }
    const existingUser = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existingUser) {
      throw new Error('User not found');
    }
    return await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email ?? existingUser.email,
        password: hashedPassword ?? existingUser.password,
        role: dto.role ?? existingUser.role,
        firstName: dto.firstName ?? existingUser.firstName,
        lastName: dto.lastName ?? existingUser.lastName,
        shopId: dto.shopId ?? existingUser.shopId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        shopId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findStylists(user: AuthUser) {
    return this.prisma.user.findMany({
      where: { role: Role.Stylist, shopId: user.shopId, deletedAt: null },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
        shopId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findSupervisors(user: AuthUser) {
    return this.prisma.user.findMany({
      where: { role: Role.Supervisor, shopId: user.shopId, deletedAt: null },
      select: {
        id: true,
        role: true,
        email: true,
        firstName: true,
        lastName: true,
        shopId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findCashiers(user: AuthUser, strict: boolean = false) {
    const roles = strict ? [Role.Cashier] : [Role.Cashier, Role.Supervisor];

    return this.prisma.user.findMany({
      where: {
        role: { in: roles },
        shopId: user.shopId,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
        email: true,
        shopId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async ensureCanCreateOrder(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user || (user.role !== Role.Supervisor && user.role !== Role.Admin)) {
      throw new Error('No tienes permisos para crear órdenes');
    }
  }

  async softDelete(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
