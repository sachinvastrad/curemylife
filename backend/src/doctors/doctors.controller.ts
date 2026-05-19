import {
  Controller, Get, Put, Post, Param, Body, Query,
  UseGuards, Req,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';

@Controller('api/doctors')
export class DoctorsController {
  constructor(private doctorsService: DoctorsService) {}

  // ==================== PUBLIC ====================

  @Get('public')
  async getPublicList(
    @Query('specialityId') specialityId?: string,
    @Query('language') language?: string,
  ) {
    return this.doctorsService.findPublicDoctors(
      specialityId ? parseInt(specialityId) : undefined,
      language,
    );
  }

  @Get('public/:id/slots')
  async getPublicSlots(
    @Param('id') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.doctorsService.getAvailableSlots(doctorId, date);
  }

  // ==================== AUTHENTICATED DOCTOR ====================

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async getProfile(@Req() req: any) {
    return this.doctorsService.getProfile(req.user.sub);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async updateProfile(@Req() req: any, @Body() data: any) {
    return this.doctorsService.updateProfile(req.user.sub, data);
  }

  @Put('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async setAvailability(@Req() req: any, @Body('slots') slots: any[]) {
    return this.doctorsService.setAvailability(req.user.sub, slots);
  }

  @Get('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async getAvailability(@Req() req: any) {
    return this.doctorsService.getAvailability(req.user.sub);
  }

  @Post('cases/:caseId/report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async submitReport(
    @Param('caseId') caseId: string,
    @Req() req: any,
    @Body() data: any,
  ) {
    return this.doctorsService.submitReport(caseId, req.user.sub, data);
  }

  @Get('earnings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async getEarnings(@Req() req: any) {
    return this.doctorsService.getEarnings(req.user.sub);
  }

  // ==================== ADMIN ====================

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getPendingDoctors() {
    return this.doctorsService.getPendingDoctors();
  }

  @Post('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async approveDoctor(@Param('id') id: string) {
    return this.doctorsService.approveDoctor(id);
  }

  @Post('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async rejectDoctor(@Param('id') id: string, @Body('reason') reason: string) {
    return this.doctorsService.rejectDoctor(id, reason);
  }

  @Post('admin/:id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async suspendDoctor(@Param('id') id: string, @Body('reason') reason: string) {
    return this.doctorsService.suspendDoctor(id, reason);
  }
}
