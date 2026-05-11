import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TreatmentDto } from './dto/treatment';
import { AuthUser } from 'src/auth/models/auth-user';

@Injectable()
export class TreatmentsService {
  constructor(private prisma: PrismaService) {}

  create(dto: TreatmentDto, user: AuthUser) {
    return this.prisma.treatment.create({
      data: {
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        percentage: dto.percentage,
        basePrice: dto.basePrice,
        shopId: user.shopId,
      },
      include: { category: true },
    });
  }

  update(id: string, dto: TreatmentDto) {
    return this.prisma.treatment.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        percentage: dto.percentage,
        basePrice: dto.basePrice,
      },
      include: { category: true },
    });
  }

  findAll(user: AuthUser) {
    return this.prisma.treatment.findMany({
      where: {
        shopId: user.shopId,
        deletedAt: null,
      },
      include: { category: true },
      orderBy: [
        { category: { displayOrder: 'asc' } },
        { name: 'asc' },
      ],
    });
  }

  async validateTreatments(treatmentIds: Set<string>): Promise<void> {
    if (treatmentIds.size === 0) return;
    const treatments = await this.prisma.treatment.findMany({
      where: { id: { in: Array.from(treatmentIds) }, deletedAt: null },
    });
    if (treatments.length < treatmentIds.size) {
      throw new Error('Uno o más tratamientos no fueron encontrados');
    }
  }

  async softDelete(id: string) {
    const treatment = await this.prisma.treatment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!treatment) {
      throw new Error('Treatment not found');
    }
    return await this.prisma.treatment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
