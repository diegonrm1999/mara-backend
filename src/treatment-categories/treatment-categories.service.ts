import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTreatmentCategoryDto,
  UpdateTreatmentCategoryDto,
} from './dto/treatment-category.dto';
import { AuthUser } from 'src/auth/models/auth-user';
import { Prisma } from '@prisma/client';

@Injectable()
export class TreatmentCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTreatmentCategoryDto, user: AuthUser) {
    try {
      return await this.prisma.treatmentCategory.create({
        data: {
          name: dto.name,
          displayOrder: dto.displayOrder ?? 0,
          shopId: user.shopId,
        },
        include: { treatments: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ya existe una categoría con el nombre "${dto.name}"`,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTreatmentCategoryDto) {
    const category = await this.prisma.treatmentCategory.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    try {
      return await this.prisma.treatmentCategory.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.displayOrder !== undefined && {
            displayOrder: dto.displayOrder,
          }),
        },
        include: { treatments: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ya existe una categoría con el nombre "${dto.name}"`,
        );
      }
      throw error;
    }
  }

  findAll(shopId: string) {
    return this.prisma.treatmentCategory.findMany({
      where: {
        shopId: shopId,
        deletedAt: null,
      },
      include: {
        treatments: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async softDelete(id: string) {
    const category = await this.prisma.treatmentCategory.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Unlink treatments from this category before deleting
    await this.prisma.treatment.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    return await this.prisma.treatmentCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
