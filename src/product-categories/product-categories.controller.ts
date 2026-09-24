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
import { ProductCategoriesService } from './product-categories.service';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from './dto/product-category.dto';
import { Request } from 'express';
import { AuthUser } from 'src/auth/models/auth-user';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PublicShopGuard } from 'src/auth/public-shop.guard';

@Controller('product-categories')
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateProductCategoryDto, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.productCategoriesService.create(dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductCategoryDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthUser;
    return this.productCategoriesService.update(id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  findAll(@Req() req: Request) {
    const user = req.user as AuthUser;
    return this.productCategoriesService.findAll(user.shopId);
  }

  @UseGuards(PublicShopGuard)
  @Get('public/all')
  findAllPublic(@Query('shopId') shopId: string, @Req() req: any) {
    if (shopId !== req.publicShopId) {
      throw new UnauthorizedException(
        'El Shop ID no coincide con la llave pública',
      );
    }
    return this.productCategoriesService.findAll(shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.productCategoriesService.softDelete(id, user);
  }
}
