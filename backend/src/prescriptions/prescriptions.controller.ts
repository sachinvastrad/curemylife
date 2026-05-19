import { Controller, Post, Get, Param, Body, Query, UseGuards, Req, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { PrescriptionsService } from './prescriptions.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';

@Controller('api/prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionsController {
  constructor(private prescriptionsService: PrescriptionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('doctor')
  async create(@Req() req: any, @Body() data: any) {
    return this.prescriptionsService.create(req.user.sub, data);
  }

  @Get('case/:caseId')
  async getByCaseId(@Param('caseId') caseId: string) {
    return this.prescriptionsService.getByCaseId(caseId);
  }

  @Get('patient')
  @UseGuards(RolesGuard)
  @Roles('patient')
  async getMyPrescriptions(@Req() req: any) {
    return this.prescriptionsService.getByPatientId(req.user.sub);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.prescriptionsService.getById(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.prescriptionsService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="prescription-${id}.pdf"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }
}
