import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PromotionDiscountType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUser } from 'src/auth/models/auth-user';
import {
  CreatePromotionDto,
  PromotionTargetsDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';
import { pickBestDiscount } from './promotion-pricing';

export type ActivePromotion = Prisma.PromotionGetPayload<{
  include: { targets: true };
}>;

export interface ResolvedPrice {
  originalPrice: number;
  effectivePrice: number;
  promotion: { id: string; name: string } | null;
}

export interface ResolvedOrderLine {
  treatmentId: string;
  price: number;
  originalPrice: number | null;
  promotionId: string | null;
}

type PromotionStatus = 'inactive' | 'scheduled' | 'expired' | 'running';

function statusOf(
  promotion: { active: boolean; startsAt: Date; endsAt: Date },
  now: Date,
): PromotionStatus {
  if (!promotion.active) return 'inactive';
  if (now < promotion.startsAt) return 'scheduled';
  if (now > promotion.endsAt) return 'expired';
  return 'running';
}

function buildResolved(
  price: number,
  matching: ActivePromotion[],
): ResolvedPrice {
  const best = pickBestDiscount(price, matching);
  return {
    originalPrice: price,
    effectivePrice: best ? best.effectivePrice : price,
    promotion: best
      ? { id: best.promotion.id, name: best.promotion.name }
      : null,
  };
}

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePromotionDto, user: AuthUser) {
    const targetRows = this.buildTargetRows(dto.targets);
    this.assertValid({
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      appliesToAllTreatments: dto.appliesToAllTreatments ?? false,
      appliesToAllProducts: dto.appliesToAllProducts ?? false,
      hasTargets: targetRows.length > 0,
    });
    await this.assertTargetsBelongToShop(dto.targets, user.shopId);

    const promotion = await this.prisma.promotion.create({
      data: {
        name: dto.name,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        active: dto.active ?? true,
        appliesToAllTreatments: dto.appliesToAllTreatments ?? false,
        appliesToAllProducts: dto.appliesToAllProducts ?? false,
        shopId: user.shopId,
        targets: { create: targetRows },
      },
      include: { targets: true },
    });
    return this.withStatus(promotion);
  }

  async update(id: string, dto: UpdatePromotionDto, user: AuthUser) {
    const existing = await this.findOwned(id, user.shopId);
    const targetRows = dto.targets ? this.buildTargetRows(dto.targets) : null;

    this.assertValid({
      discountType: dto.discountType ?? existing.discountType,
      discountValue: dto.discountValue ?? existing.discountValue,
      startsAt: dto.startsAt ?? existing.startsAt,
      endsAt: dto.endsAt ?? existing.endsAt,
      appliesToAllTreatments:
        dto.appliesToAllTreatments ?? existing.appliesToAllTreatments,
      appliesToAllProducts:
        dto.appliesToAllProducts ?? existing.appliesToAllProducts,
      hasTargets: targetRows ? targetRows.length > 0 : existing.targets.length > 0,
    });
    if (dto.targets) {
      await this.assertTargetsBelongToShop(dto.targets, user.shopId);
    }

    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.discountType !== undefined && { discountType: dto.discountType }),
        ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
        ...(dto.startsAt !== undefined && { startsAt: dto.startsAt }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.appliesToAllTreatments !== undefined && {
          appliesToAllTreatments: dto.appliesToAllTreatments,
        }),
        ...(dto.appliesToAllProducts !== undefined && {
          appliesToAllProducts: dto.appliesToAllProducts,
        }),
        ...(targetRows && {
          targets: { deleteMany: {}, create: targetRows },
        }),
      },
      include: { targets: true },
    });
    return this.withStatus(promotion);
  }

  async findAll(user: AuthUser) {
    const promotions = await this.prisma.promotion.findMany({
      where: { shopId: user.shopId, deletedAt: null },
      include: { targets: true },
      orderBy: { startsAt: 'desc' },
    });
    return promotions.map((p) => this.withStatus(p));
  }

  async findOne(id: string, user: AuthUser) {
    return this.withStatus(await this.findOwned(id, user.shopId));
  }

  async softDelete(id: string, user: AuthUser) {
    await this.findOwned(id, user.shopId);
    return this.prisma.promotion.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  getActive(shopId: string, now = new Date()): Promise<ActivePromotion[]> {
    return this.prisma.promotion.findMany({
      where: {
        shopId,
        active: true,
        deletedAt: null,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: { targets: true },
    });
  }

  resolveTreatmentPrice(
    promotions: ActivePromotion[],
    treatment: { id: string; categoryId: string | null; basePrice: number | null },
  ): ResolvedPrice | null {
    if (treatment.basePrice == null) return null;
    const matching = promotions.filter(
      (p) =>
        p.appliesToAllTreatments ||
        p.targets.some(
          (t) =>
            t.treatmentId === treatment.id ||
            (treatment.categoryId != null &&
              t.treatmentCategoryId === treatment.categoryId),
        ),
    );
    return buildResolved(treatment.basePrice, matching);
  }

  resolveVariantPrice(
    promotions: ActivePromotion[],
    variant: { price: number },
    product: { id: string; categoryId: string | null },
  ): ResolvedPrice {
    const matching = promotions.filter(
      (p) =>
        p.appliesToAllProducts ||
        p.targets.some(
          (t) =>
            t.productId === product.id ||
            (product.categoryId != null &&
              t.productCategoryId === product.categoryId),
        ),
    );
    return buildResolved(variant.price, matching);
  }

  async resolveOrderLines(
    shopId: string,
    lines: { treatmentId: string; price?: number }[],
  ): Promise<ResolvedOrderLine[]> {
    const ids = Array.from(new Set(lines.map((l) => l.treatmentId)));
    const [treatments, promotions] = await Promise.all([
      this.prisma.treatment.findMany({
        where: { id: { in: ids }, shopId, deletedAt: null },
        select: { id: true, name: true, categoryId: true, basePrice: true },
      }),
      this.getActive(shopId),
    ]);
    const byId = new Map(treatments.map((t) => [t.id, t]));

    return lines.map((line) => {
      const treatment = byId.get(line.treatmentId);
      if (!treatment) {
        throw new BadRequestException(
          'Uno o más tratamientos no fueron encontrados',
        );
      }
      const resolved = this.resolveTreatmentPrice(promotions, treatment);

      if (line.price === undefined) {
        if (!resolved) {
          throw new BadRequestException(
            `El tratamiento "${treatment.name}" no tiene precio base; indica el precio`,
          );
        }
        return {
          treatmentId: line.treatmentId,
          price: resolved.effectivePrice,
          originalPrice: resolved.promotion ? resolved.originalPrice : null,
          promotionId: resolved.promotion?.id ?? null,
        };
      }

      const matchesPromotion =
        resolved?.promotion != null &&
        Math.abs(line.price - resolved.effectivePrice) < 0.005;
      return {
        treatmentId: line.treatmentId,
        price: line.price,
        originalPrice: matchesPromotion ? resolved.originalPrice : null,
        promotionId: matchesPromotion ? resolved.promotion.id : null,
      };
    });
  }

  private async findOwned(id: string, shopId: string) {
    const promotion = await this.prisma.promotion.findFirst({
      where: { id, shopId, deletedAt: null },
      include: { targets: true },
    });
    if (!promotion) {
      throw new NotFoundException('Campaña no encontrada');
    }
    return promotion;
  }

  private withStatus<T extends { active: boolean; startsAt: Date; endsAt: Date }>(
    promotion: T,
  ) {
    return { ...promotion, status: statusOf(promotion, new Date()) };
  }

  private buildTargetRows(
    targets?: PromotionTargetsDto,
  ): Prisma.PromotionTargetCreateWithoutPromotionInput[] {
    if (!targets) return [];
    const unique = (ids?: string[]) => Array.from(new Set(ids ?? []));
    return [
      ...unique(targets.treatmentIds).map((id) => ({
        treatment: { connect: { id } },
      })),
      ...unique(targets.treatmentCategoryIds).map((id) => ({
        treatmentCategory: { connect: { id } },
      })),
      ...unique(targets.productIds).map((id) => ({
        product: { connect: { id } },
      })),
      ...unique(targets.productCategoryIds).map((id) => ({
        productCategory: { connect: { id } },
      })),
    ];
  }

  private assertValid(input: {
    discountType: PromotionDiscountType;
    discountValue: number;
    startsAt: Date;
    endsAt: Date;
    appliesToAllTreatments: boolean;
    appliesToAllProducts: boolean;
    hasTargets: boolean;
  }) {
    if (
      input.discountType === PromotionDiscountType.Percentage &&
      input.discountValue > 100
    ) {
      throw new BadRequestException('El porcentaje no puede ser mayor a 100');
    }
    if (input.endsAt <= input.startsAt) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la de inicio',
      );
    }
    if (
      !input.appliesToAllTreatments &&
      !input.appliesToAllProducts &&
      !input.hasTargets
    ) {
      throw new BadRequestException(
        'La campaña debe aplicar a todos los servicios/productos o a elementos específicos',
      );
    }
  }

  private async assertTargetsBelongToShop(
    targets: PromotionTargetsDto | undefined,
    shopId: string,
  ) {
    if (!targets) return;
    const unique = (ids?: string[]) => Array.from(new Set(ids ?? []));
    const checks: [string[], Promise<number>][] = [
      [
        unique(targets.treatmentIds),
        this.prisma.treatment.count({
          where: { id: { in: unique(targets.treatmentIds) }, shopId, deletedAt: null },
        }),
      ],
      [
        unique(targets.treatmentCategoryIds),
        this.prisma.treatmentCategory.count({
          where: {
            id: { in: unique(targets.treatmentCategoryIds) },
            shopId,
            deletedAt: null,
          },
        }),
      ],
      [
        unique(targets.productIds),
        this.prisma.product.count({
          where: { id: { in: unique(targets.productIds) }, shopId, deletedAt: null },
        }),
      ],
      [
        unique(targets.productCategoryIds),
        this.prisma.productCategory.count({
          where: {
            id: { in: unique(targets.productCategoryIds) },
            shopId,
            deletedAt: null,
          },
        }),
      ],
    ];
    for (const [ids, countPromise] of checks) {
      if ((await countPromise) !== ids.length) {
        throw new BadRequestException(
          'Algún elemento de la campaña no existe o no pertenece a este local',
        );
      }
    }
  }
}
