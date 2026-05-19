import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getDashboardMetrics(from, to);
  }

  @Get('specialities')
  async getSpecialities() {
    return this.adminService.getSpecialitiesList();
  }

  @Get('patients')
  async getPatients(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllPatients(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('doctors')
  async getDoctors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllDoctors(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @Post('patients/:id/toggle')
  async togglePatient(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.adminService.togglePatientStatus(id, isActive);
  }
}
