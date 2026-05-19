import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';

@Controller('api/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-order')
  @UseGuards(RolesGuard)
  @Roles('patient')
  async createOrder(@Req() req: any, @Body('appointmentId') appointmentId: string) {
    return this.paymentsService.createOrder(appointmentId, req.user.sub);
  }

  @Post(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles('patient')
  async confirm(@Param('id') id: string, @Body('gatewayPaymentId') gatewayPaymentId: string) {
    return this.paymentsService.confirmPayment(id, gatewayPaymentId);
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles('patient')
  async getMyPayments(@Req() req: any) {
    return this.paymentsService.getPatientPayments(req.user.sub);
  }

  @Post(':id/refund')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async refund(@Param('id') id: string, @Body('reason') reason: string) {
    return this.paymentsService.refund(id, reason);
  }

  @Get('admin/revenue')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getRevenue() {
    return this.paymentsService.getRevenueSummary();
  }
}
