import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  CreateProductVariantDto,
  UpdateProductVariantDto,
  AdjustVariantStockDto,
} from './dto/product-variant.dto';
import { QueryProductsDto, QueryPublicProductsDto } from './dto/query-products.dto';
import { AuthUser } from 'src/auth/models/auth-user';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PublicShopGuard } from 'src/auth/public-shop.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(PublicShopGuard)
  @Get('public/all')
  findAllPublic(@Query() query: QueryPublicProductsDto, @Req() req: any) {
    if (query.shopId !== req.publicShopId) {
      throw new UnauthorizedException(
        'El Shop ID no coincide con la llave pública',
      );
    }
    return this.productsService.findAllPublic(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  findAll(@Query() query: QueryProductsDto, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.productsService.findAll(user.shopId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateProductDto, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.productsService.create(dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthUser;
    return this.productsService.update(id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.productsService.softDelete(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':productId/variants')
  addVariant(
    @Param('productId') productId: string,
    @Body() dto: CreateProductVariantDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthUser;
    return this.productsService.addVariant(productId, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('variants/:id')
  updateVariant(
    @Param('id') id: string,
    @Body() dto: UpdateProductVariantDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthUser;
    return this.productsService.updateVariant(id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('variants/:id')
  deleteVariant(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.productsService.softDeleteVariant(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('variants/:id/stock')
  adjustStock(
    @Param('id') id: string,
    @Body() dto: AdjustVariantStockDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthUser;
    return this.productsService.adjustStock(id, dto, user);
  }
}
