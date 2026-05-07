import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const SOFT_DELETE_MODELS = ['User', 'Client', 'Treatment'];

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Creates an extended Prisma client that automatically filters
   * soft-deleted records for the specified models.
   * Note: We apply the filter manually in queries rather than using
   * $extends because $extends returns a new type that breaks DI.
   * This helper is used internally to ensure consistency.
   */
  withSoftDeleteFilter<T extends Record<string, any>>(
    where: T,
  ): T & { deletedAt: null } {
    return { ...where, deletedAt: null };
  }

  /**
   * Helper to check if a model supports soft delete
   */
  isSoftDeleteModel(model: string): boolean {
    return SOFT_DELETE_MODELS.includes(model);
  }
}