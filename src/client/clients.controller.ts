import {
  Controller,
  Get,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { AuthUser } from 'src/auth/models/auth-user';
import { Request } from 'express';
import { GetClientsDto } from './dto/get-client.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('dni/:dni')
  async getByDni(@Param('dni') dni: string) {
    const client = await this.clientsService.findByDni(dni);
    if (!client) {
      throw new Error(`No se encontró cliente con DNI ${dni}`);
    }
    return client;
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAll(@Req() req: Request) {
    const user = req.user as AuthUser;
    return await this.clientsService.findAll(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async getClients(@Req() req: Request, @Query() query: GetClientsDto) {
    const user = req.user as AuthUser;
    return this.clientsService.getClients(user.shopId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteClient(@Param('id') id: string) {
    return this.clientsService.softDelete(id);
  }
}
