import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignUserTreatmentsDto } from './dtos/assign-user-treatments.dto';

@Injectable()
export class UserTreatmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async assignTreatments(userId: string, dto: AssignUserTreatmentsDto) {
    return this.prisma.$transaction(async (tx) => {
      // Delete all existing assignments
      await tx.userTreatment.deleteMany({
        where: { userId },
      });

      // Create new assignments
      if (dto.treatmentIds.length > 0) {
        await tx.userTreatment.createMany({
          data: dto.treatmentIds.map((treatmentId) => ({
            userId,
            treatmentId,
          })),
        });
      }

      // Return updated assignments
      return tx.userTreatment.findMany({
        where: { userId },
        include: {
          treatment: {
            select: {
              id: true,
              name: true,
              percentage: true,
              basePrice: true,
            },
          },
        },
      });
    });
  }

  async getTreatments(userId: string) {
    return this.prisma.userTreatment.findMany({
      where: { userId },
      include: {
        treatment: {
          select: {
            id: true,
            name: true,
            percentage: true,
            basePrice: true,
          },
        },
      },
    });
  }
}
