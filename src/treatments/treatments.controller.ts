import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
import { TreatmentsService } from './treatments.service';
import { TreatmentDto } from './dto/treatment';
import { Request } from 'express';
import { AuthUser } from 'src/auth/models/auth-user';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
@UseGuards(JwtAuthGuard)
@Controller('treatments')
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) {}

  @Post()
  create(@Body() dto: TreatmentDto, @Req() req: Request) {
    const user = req.user as AuthUser;
    return this.treatmentsService.create(dto, user);
  }

  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() dto: TreatmentDto) {
    return this.treatmentsService.update(id, dto);
  }

  @Get('all')
  findAll(@Req() req: Request) {
    const user = req.user as AuthUser;
    return this.treatmentsService.findAll(user);
  }

  @Delete(':id')
  async deleteTreatment(@Param('id') id: string) {
    return this.treatmentsService.softDelete(id);
  }
}
