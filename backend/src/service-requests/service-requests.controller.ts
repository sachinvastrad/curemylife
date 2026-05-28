import {
  Controller, Get, Post, Param, Body, UseGuards, Req,
} from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';
import {
  CreateServiceRequestDto, SubmitServiceRequestDto,
} from './dto/service-request.dto';

@Controller('api/service-requests')
@UseGuards(JwtAuthGuard)
export class ServiceRequestsController {
  constructor(private serviceRequests: ServiceRequestsService) {}

  // ========================= PATIENT =========================

  /** Submit intake form → creates a ServiceRequest in "submitted" state. */
  @Post()
  @UseGuards(RolesGuard) @Roles('patient')
  async create(@Req() req: any, @Body() dto: CreateServiceRequestDto) {
    return this.serviceRequests.create(req.user.sub, dto);
  }

  /** Resume a draft → submit (currently unused by UI; reserved for v1.1). */
  @Post(':id/submit')
  @UseGuards(RolesGuard) @Roles('patient')
  async submit(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SubmitServiceRequestDto,
  ) {
    return this.serviceRequests.submit(id, req.user.sub, dto);
  }

  @Get('my')
  @UseGuards(RolesGuard) @Roles('patient')
  async listMine(@Req() req: any) {
    return this.serviceRequests.listForPatient(req.user.sub);
  }

  // ========================= DOCTOR =========================

  /** Submitted, unassigned requests routed to this doctor's specialities. */
  @Get('doctor/queue')
  @UseGuards(RolesGuard) @Roles('doctor')
  async doctorQueue(@Req() req: any) {
    return this.serviceRequests.getDoctorQueue(req.user.sub);
  }

  /** Service requests this doctor has accepted. */
  @Get('doctor/assigned')
  @UseGuards(RolesGuard) @Roles('doctor')
  async doctorAssigned(@Req() req: any) {
    return this.serviceRequests.getAssignedToDoctor(req.user.sub);
  }

  /** Doctor claims a queued request. */
  @Post(':id/accept')
  @UseGuards(RolesGuard) @Roles('doctor')
  async accept(@Req() req: any, @Param('id') id: string) {
    return this.serviceRequests.acceptByDoctor(id, req.user.sub);
  }

  // ========================= SHARED (auth-checked downstream) =========================

  /** Patient owner only — service-requests.service enforces ownership. */
  @Get(':id')
  @UseGuards(RolesGuard) @Roles('patient')
  async getOne(@Req() req: any, @Param('id') id: string) {
    return this.serviceRequests.findByIdForPatient(id, req.user.sub);
  }
}
