import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ShopService } from './shop.service';
import { CreateShopDto } from './dto/create-shop';
import { MasterKeyGuard } from '../auth/master-key.guard';

@Controller('shops')
@UseGuards(MasterKeyGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post('create')
  async createShop(@Body() dto: CreateShopDto) {
    return await this.shopService.createShop(dto);
  }

  @Get('all')
  async getShops() {
    return this.shopService.getShops();
  }
}
