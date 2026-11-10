import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthUser } from 'src/auth/models/auth-user';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';

@UseGuards(JwtAuthGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  create(@Body() dto: CreatePromotionDto, @Req() req: Request) {
    return this.promotionsService.create(dto, req.user as AuthUser);
  }

  @Get()
  findAll(@Req() req: Request) {
    return this.promotionsService.findAll(req.user as AuthUser);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.promotionsService.findOne(id, req.user as AuthUser);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
    @Req() req: Request,
  ) {
    return this.promotionsService.update(id, dto, req.user as AuthUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.promotionsService.softDelete(id, req.user as AuthUser);
  }
}
