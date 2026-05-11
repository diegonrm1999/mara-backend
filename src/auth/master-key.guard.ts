import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class MasterKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];

    const masterKey = process.env.MASTER_API_KEY;

    if (!masterKey) {
      throw new UnauthorizedException('Master API Key no está configurada en el servidor');
    }

    if (apiKey !== masterKey) {
      throw new UnauthorizedException('API Key inválida o faltante');
    }

    return true;
  }
}
