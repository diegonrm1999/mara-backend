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
} from '@nestjs/common';
import { ScheduledOrdersService } from './scheduled-orders.service';
import { CreateScheduledOrderDto } from './dtos/create-scheduled-order.dto';
import { PromoteScheduledOrderDto } from './dtos/promote-scheduled-order.dto';
import { QueryScheduledOrdersDto } from './dtos/query-scheduled-orders.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ScheduledOrderStatus } from '@prisma/client';

@Controller('scheduled-orders')
export class ScheduledOrdersController {
  constructor(
    private readonly scheduledOrdersService: ScheduledOrdersService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // PUBLIC endpoints (no authentication required)
  // ─────────────────────────────────────────────────────────────

  @Get('public/availability')
  async getAvailability(
    @Query('shopId') shopId: string,
    @Query('treatmentIds') treatmentIds: string | string[],
    @Query('date') date: string,
  ) {
    // treatmentIds can come as a single string or array from query params
    const ids = Array.isArray(treatmentIds) ? treatmentIds : [treatmentIds];
    return this.scheduledOrdersService.getAvailability(shopId, ids, date);
  }

  @Post('public')
  async createPublicBooking(@Body() dto: CreateScheduledOrderDto) {
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
