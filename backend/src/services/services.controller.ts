import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';
import { CreateServiceDto, UpdateServiceDto, ToggleServiceDto } from './dto/service.dto';

@Controller('api/services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  // ==================== PATIENT (catalog browse) ====================

  /** Public-to-authenticated-users catalog list — only enabled services. */
  @Get()
  @UseGuards(JwtAuthGuard)
  async listEnabled() {
    return this.servicesService.listEnabled();
  }

  /** Service landing page detail — only enabled. */
  @Get('slug/:slug')
  @UseGuards(JwtAuthGuard)
  async getBySlug(@Param('slug') slug: string) {
    return this.servicesService.findEnabledBySlug(slug);
  }

  // ==================== ADMIN ====================

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async listAllForAdmin() {
    return this.servicesService.listAll();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getByIdForAdmin(@Param('id') id: string) {
    return this.servicesService.findByIdForAdmin(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(@Req() req: any, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto, req.user.sub);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto, req.user.sub);
  }

  @Post('admin/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async toggleEnabled(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ToggleServiceDto,
  ) {
    return this.servicesService.toggleEnabled(id, dto.isEnabled, req.user.sub);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async softDelete(@Req() req: any, @Param('id') id: string) {
    return this.servicesService.softDelete(id, req.user.sub);
  }
}
