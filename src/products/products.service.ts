import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  CreateProductVariantDto,
  UpdateProductVariantDto,
  AdjustVariantStockDto,
} from './dto/product-variant.dto';
import { QueryProductsDto, QueryPublicProductsDto } from './dto/query-products.dto';
import { AuthUser } from 'src/auth/models/auth-user';
import { Prisma } from '@prisma/client';
import { getProductVariantImageUrl } from './utils/product-image.util';

function mapVariant<T extends { id: string; stock: number; reservedStock: number }>(
  variant: T,
) {
  return {
    ...variant,
    imageUrl: getProductVariantImageUrl(variant.id),
    availableStock: variant.stock - variant.reservedStock,
  };
}

function mapProduct<T extends { variants: any[] }>(product: T) {
  return {
    ...product,
    variants: product.variants.map(mapVariant),
  };
}

const PRODUCT_INCLUDE = {
  category: true,
  variants: { orderBy: { displayOrder: 'asc' as const } },
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto, user: AuthUser) {
    if (dto.categoryId) {
      await this.assertCategoryBelongsToShop(dto.categoryId, user.shopId);
    }

    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name,
          description: dto.description,
          categoryId: dto.categoryId,
          displayOrder: dto.displayOrder ?? 0,
          shopId: user.shopId,
          variants: {
            create: dto.variants.map((variant) => ({
              sku: variant.sku,
              attributes: variant.attributes,
              price: variant.price,
              stock: variant.stock ?? 0,
              displayOrder: variant.displayOrder ?? 0,
              shopId: user.shopId,
            })),
          },
        },
        include: PRODUCT_INCLUDE,
      });
      return mapProduct(product);
    } catch (error) {
      throw this.mapUniqueConstraintError(error);
    }
  }

  async update(id: string, dto: UpdateProductDto, user: AuthUser) {
    await this.findOwnedProduct(id, user.shopId);

    if (dto.categoryId) {
      await this.assertCategoryBelongsToShop(dto.categoryId, user.shopId);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: PRODUCT_INCLUDE,
    });
    return mapProduct(product);
  }

  async findAll(shopId: string, query: QueryProductsDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      shopId,
      deletedAt: null,
      ...(!query.includeInactive && { active: true }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: {
          category: true,
          variants: {
            where: { deletedAt: null },
            orderBy: { displayOrder: 'asc' },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return this.paginate(products.map(mapProduct), total, page, limit);
  }

  async softDelete(id: string, user: AuthUser) {
    await this.findOwnedProduct(id, user.shopId);

    const now = new Date();
    const [, product] = await this.prisma.$transaction([
      this.prisma.productVariant.updateMany({
        where: { productId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.product.update({
        where: { id },
        data: { deletedAt: now },
      }),
    ]);
    return product;
  }

  async findAllPublic(query: QueryPublicProductsDto) {
    const { page = 1, limit = 20, shopId } = query;
    const skip = (page - 1) * limit;

    const variantFilter: Prisma.ProductVariantWhereInput = {
      active: true,
      deletedAt: null,
      ...(query.inStockOnly && { stock: { gt: 0 } }),
    };

    const where: Prisma.ProductWhereInput = {
      shopId,
      active: true,
      deletedAt: null,
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
      ...(query.inStockOnly && { variants: { some: variantFilter } }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: {
          category: true,
          variants: { where: variantFilter, orderBy: { displayOrder: 'asc' } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return this.paginate(products.map(mapProduct), total, page, limit);
  }

  async findOnePublic(id: string, shopId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, shopId, active: true, deletedAt: null },
      include: {
        category: true,
        variants: {
          where: { active: true, deletedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return mapProduct(product);
  }

  async addVariant(productId: string, dto: CreateProductVariantDto, user: AuthUser) {
    const product = await this.findOwnedProduct(productId, user.shopId);

    try {
      const variant = await this.prisma.productVariant.create({
        data: {
          productId: product.id,
          shopId: product.shopId,
          sku: dto.sku,
          attributes: dto.attributes,
          price: dto.price,
          stock: dto.stock ?? 0,
          displayOrder: dto.displayOrder ?? 0,
        },
      });
      return mapVariant(variant);
    } catch (error) {
      throw this.mapUniqueConstraintError(error);
    }
  }

  async updateVariant(variantId: string, dto: UpdateProductVariantDto, user: AuthUser) {
    await this.findOwnedVariant(variantId, user.shopId);

    try {
      const variant = await this.prisma.productVariant.update({
        where: { id: variantId },
        data: {
          ...(dto.sku !== undefined && { sku: dto.sku }),
          ...(dto.attributes !== undefined && { attributes: dto.attributes }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
          ...(dto.active !== undefined && { active: dto.active }),
        },
      });
      return mapVariant(variant);
    } catch (error) {
      throw this.mapUniqueConstraintError(error);
    }
  }

  async softDeleteVariant(variantId: string, user: AuthUser) {
    await this.findOwnedVariant(variantId, user.shopId);
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date() },
    });
  }

  async adjustStock(variantId: string, dto: AdjustVariantStockDto, user: AuthUser) {
    const variant = await this.findOwnedVariant(variantId, user.shopId);

    if (dto.delta === 0) {
      return mapVariant(variant);
    }

    const result = await this.prisma.productVariant.updateMany({
      where: {
        id: variantId,
        ...(dto.delta < 0 && { stock: { gte: -dto.delta } }),
      },
      data: { stock: { increment: dto.delta } },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'Stock insuficiente para aplicar el ajuste',
      );
    }

    const updated = await this.prisma.productVariant.findUniqueOrThrow({
      where: { id: variantId },
    });
    return mapVariant(updated);
  }

  private async findOwnedProduct(id: string, shopId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    if (product.shopId !== shopId) {
      throw new ForbiddenException('El producto no pertenece a este local');
    }
    return product;
  }

  private async findOwnedVariant(variantId: string, shopId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, deletedAt: null },
    });
    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }
    if (variant.shopId !== shopId) {
      throw new ForbiddenException('La variante no pertenece a este local');
    }
    return variant;
  }

  private async assertCategoryBelongsToShop(categoryId: string, shopId: string) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id: categoryId, shopId, deletedAt: null },
    });
    if (!category) {
      throw new BadRequestException(
        'La categoría no existe o no pertenece a este local',
      );
    }
  }

  private mapUniqueConstraintError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(
        'Ya existe una variante con ese SKU en este local',
      );
    }
    return error;
  }

  private paginate<T>(data: T[], total: number, page: number, limit: number) {
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}
