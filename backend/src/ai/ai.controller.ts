import { Controller, Post, Param, Get, Req, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';

@Controller('api/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('process/:caseId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async triggerProcessing(@Param('caseId') caseId: string) {
    // Manual trigger for admin
    await this.aiService.processCase(caseId);
    return { message: 'AI processing triggered' };
  }

  // Doctor-initiated internal AI draft for an assigned case.
  @Post('cases/:caseId/generate')
  @UseGuards(RolesGuard)
  @Roles('doctor')
  async generateForDoctor(@Param('caseId') caseId: string, @Req() req: any) {
    return this.aiService.generateForDoctor(caseId, req.user.sub);
  }

  // Internal only — restricted to doctor/admin so it is never patient-facing.
  @Get('report/:caseId')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  async getReport(@Param('caseId') caseId: string) {
    return this.aiService.getReport(caseId);
  }
}
