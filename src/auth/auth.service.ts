import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Contraseña incorrecta');
    return user;
  }

  async loginAdmin(user: User) {
    if (user.role !== Role.Admin) {
      throw new UnauthorizedException('Acceso denegado');
    }
    return this.login(user);
  }

  async login(user: User) {
    const accessPayload = {
      sub: user.id,
      email: user.email,
      rol: user.role,
      shopId: user.shopId,
    };

    const refreshPayload = {
      sub: user.id,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '2d',
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '120d'
    });
    return {
      token: accessToken,
      refreshToken: refreshToken,
      role: user.role,
      id: user.id,
      name: user.firstName,
      shopId: user.shopId,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET,
      });
      const user = await this.usersService.findUserById(decoded.sub);
      if (!user) throw new UnauthorizedException();
      const newAccessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          rol: user.role,
          shopId: user.shopId,
        },
        { expiresIn: '2d' },
      );

      return {
        token: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
