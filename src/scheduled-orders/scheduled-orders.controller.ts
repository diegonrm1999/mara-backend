import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ScheduledOrdersService } from './scheduled-orders.service';
import { CreateScheduledOrderDto } from './dtos/create-scheduled-order.dto';
import { PromoteScheduledOrderDto } from './dtos/promote-scheduled-order.dto';
import { QueryScheduledOrdersDto } from './dtos/query-scheduled-orders.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ScheduledOrderStatus } from '@prisma/client';
import { PublicShopGuard } from 'src/auth/public-shop.guard';

@Controller('scheduled-orders')
export class ScheduledOrdersController {
  constructor(
    private readonly scheduledOrdersService: ScheduledOrdersService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // PUBLIC endpoints (no user authentication required, but Shop validated)
  // ─────────────────────────────────────────────────────────────

  @UseGuards(PublicShopGuard)
  @Get('public/availability')
  async getAvailability(
    @Query('shopId') shopId: string,
    @Query('treatmentIds') treatmentIds: string | string[],
    @Query('date') date: string,
    @Req() req: any,
  ) {
    // Validate that the query shopId matches the one authorized in headers
    if (shopId !== req.publicShopId) {
      throw new UnauthorizedException('El Shop ID no coincide con la llave pública');
    }

    const ids = Array.isArray(treatmentIds) ? treatmentIds : [treatmentIds];
    return this.scheduledOrdersService.getAvailability(shopId, ids, date);
  }

  @UseGuards(PublicShopGuard)
  @Post('public')
  async createPublicBooking(@Body() dto: CreateScheduledOrderDto, @Req() req: any) {
    // Validate that the body shopId matches the one authorized in headers
    if (dto.shopId !== req.publicShopId) {
      throw new UnauthorizedException('El Shop ID no coincide con la llave pública');
    }

    return this.scheduledOrdersService.createPublicBooking(dto);
  }

  // ─────────────────────────────────────────────────────────────
  // INTERNAL endpoints (JWT required)
  // ─────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() query: QueryScheduledOrdersDto) {
    return this.scheduledOrdersService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ScheduledOrderStatus,
  ) {
    return this.scheduledOrdersService.updateStatus(id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/promote')
  async promote(
    @Param('id') id: string,
    @Body() dto: PromoteScheduledOrderDto,
  ) {
    return this.scheduledOrdersService.promote(id, dto);
  }
}
