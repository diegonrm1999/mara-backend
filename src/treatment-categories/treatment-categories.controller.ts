import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Req,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { TreatmentCategoriesService } from './treatment-categories.service';
import {
  CreateTreatmentCategoryDto,
  UpdateTreatmentCategoryDto,
} from './dto/treatment-category.dto';
import { Request } from 'express';
import { AuthUser } from 'src/auth/models/auth-user';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PublicShopGuard } from 'src/auth/public-shop.guard';

@Controller('treatment-categories')
export class TreatmentCategoriesController {
  constructor(
    private readonly treatmentCategoriesService: TreatmentCategoriesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateTreatmentCategoryDto, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.treatmentCategoriesService.create(dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentCategoryDto,
  ) {
    return this.treatmentCategoriesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  findAll(@Req() req: Request) {
    const user = req.user as AuthUser;
    return this.treatmentCategoriesService.findAll(user.shopId);
  }

  @UseGuards(PublicShopGuard)
  @Get('public/all')
  findAllPublic(@Query('shopId') shopId: string, @Req() req: any) {
    if (shopId !== req.publicShopId) {
      throw new UnauthorizedException('El Shop ID no coincide con la llave pública');
    }
    return this.treatmentCategoriesService.findAll(shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.treatmentCategoriesService.softDelete(id);
  }
}
