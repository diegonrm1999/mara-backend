import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { AuthUser } from 'src/auth/models/auth-user';
import { DashboardScheduledOrdersDto } from './dto/dashboard-scheduled.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getDashboardStats(@Req() req: Request) {
    const user = req.user as AuthUser;
    return await this.dashboardService.getSimpleStats(user.shopId);
  }

  @Get('scheduled-orders')
  async getScheduledOrderStats(
    @Req() req: Request,
    @Query() query: DashboardScheduledOrdersDto,
  ) {
    const user = req.user as AuthUser;
    // Use shopId from query if provided, otherwise from auth user
    const shopId = query.shopId || user.shopId;
    return await this.dashboardService.getScheduledOrderStats({
      ...query,
      shopId,
    });
  }
}
