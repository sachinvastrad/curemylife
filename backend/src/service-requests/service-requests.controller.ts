import {
  Controller, Get, Post, Param, Body, UseGuards, Req,
} from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';
import {
  CreateServiceRequestDto, SubmitServiceRequestDto,
} from './dto/service-request.dto';

@Controller('api/service-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('patient')
export class ServiceRequestsController {
  constructor(private serviceRequests: ServiceRequestsService) {}

  /** Submit intake form → creates a ServiceRequest in "submitted" state. */
  @Post()
  async create(@Req() req: any, @Body() dto: CreateServiceRequestDto) {
    return this.serviceRequests.create(req.user.sub, dto);
  }

  /** Resume a draft → submit (currently unused by UI; reserved for v1.1). */
  @Post(':id/submit')
  async submit(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SubmitServiceRequestDto,
  ) {
    return this.serviceRequests.submit(id, req.user.sub, dto);
  }

  @Get('my')
  async listMine(@Req() req: any) {
    return this.serviceRequests.listForPatient(req.user.sub);
  }

  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    return this.serviceRequests.findByIdForPatient(id, req.user.sub);
  }
}
