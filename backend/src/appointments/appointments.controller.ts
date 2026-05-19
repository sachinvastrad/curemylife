import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, Req,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';

@Controller('api/appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('patient')
  async create(@Req() req: any, @Body() data: any) {
    return this.appointmentsService.create({
      ...data,
      patientId: req.user.sub,
    });
  }

  @Get('patient')
  @UseGuards(RolesGuard)
  @Roles('patient')
  async getPatientAppointments(@Req() req: any) {
    return this.appointmentsService.getPatientAppointments(req.user.sub);
  }

  @Get('doctor')
  @UseGuards(RolesGuard)
  @Roles('doctor')
  async getDoctorAppointments(@Req() req: any, @Query('upcoming') upcoming?: string) {
    return this.appointmentsService.getDoctorAppointments(req.user.sub, upcoming === 'true');
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles('doctor')
  async start(@Param('id') id: string, @Req() req: any) {
    return this.appointmentsService.startAppointment(id, req.user.sub);
  }

  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles('doctor')
  async complete(@Param('id') id: string, @Req() req: any, @Body('notes') notes?: string) {
    return this.appointmentsService.completeAppointment(id, req.user.sub, notes);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: any, @Body('reason') reason?: string) {
    return this.appointmentsService.cancelAppointment(id, req.user.sub, req.user.role, reason);
  }
}
