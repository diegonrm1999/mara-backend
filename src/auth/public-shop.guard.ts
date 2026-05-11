import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicShopGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const shopId = request.headers['x-shop-id'] as string;
    const publicKey = request.headers['x-public-key'] as string;

    if (!shopId || !publicKey) {
      throw new UnauthorizedException(
        'Faltan credenciales de Shop (x-shop-id o x-public-key)',
      );
    }

    const shop = await this.prisma.shop.findFirst({
      where: {
        id: shopId,
        publicApiKey: publicKey,
        deletedAt: null,
      },
    });

    if (!shop) {
      throw new UnauthorizedException('Credenciales de Shop inválidas');
    }

    // Inject shop into request for use in controllers
    (request as any).publicShopId = shopId;

    return true;
  }
}
