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
        percentage: dto.percentage,
        basePrice: dto.basePrice,
        shopId: user.shopId,
      },
    });
  }

  update(id: string, dto: TreatmentDto) {
    return this.prisma.treatment.update({
      where: { id },
      data: {
        name: dto.name,
        percentage: dto.percentage,
        basePrice: dto.basePrice,
      },
    });
  }

  findAll(user: AuthUser) {
    return this.prisma.treatment.findMany({
      where: {
        shopId: user.shopId,
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
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
