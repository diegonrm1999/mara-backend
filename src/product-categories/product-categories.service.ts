import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from './dto/product-category.dto';
import { AuthUser } from 'src/auth/models/auth-user';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductCategoryDto, user: AuthUser) {
    try {
      return await this.prisma.productCategory.create({
        data: {
          name: dto.name,
          displayOrder: dto.displayOrder ?? 0,
          shopId: user.shopId,
        },
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

  async update(id: string, dto: UpdateProductCategoryDto, user: AuthUser) {
    await this.findOwned(id, user.shopId);

    try {
      return await this.prisma.productCategory.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.displayOrder !== undefined && {
            displayOrder: dto.displayOrder,
          }),
        },
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
    return this.prisma.productCategory.findMany({
      where: {
        shopId,
        deletedAt: null,
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async softDelete(id: string, user: AuthUser) {
    await this.findOwned(id, user.shopId);

    const [, category] = await this.prisma.$transaction([
      this.prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      }),
      this.prisma.productCategory.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);

    return category;
  }

  private async findOwned(id: string, shopId: string) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    if (category.shopId !== shopId) {
      throw new ForbiddenException('La categoría no pertenece a este local');
    }
    return category;
  }
}
