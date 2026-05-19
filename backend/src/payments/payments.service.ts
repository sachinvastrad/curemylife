import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createOrder(appointmentId: string, patientId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: { select: { initialFee: true, followupFee: true } } },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.patientId !== patientId) throw new BadRequestException('Access denied');

    const fee = appointment.isFollowup
      ? Number(appointment.doctor.followupFee || 500)
      : Number(appointment.doctor.initialFee || 1000);

    const platformCommission = Math.round(fee * 0.15 * 100) / 100; // 15% commission
    const doctorPayout = fee - platformCommission;

    // In production: create Razorpay order here
    const gatewayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const payment = await this.prisma.payment.create({
      data: {
        appointmentId,
        patientId,
        doctorId: appointment.doctorId,
        amount: fee,
        platformCommission,
        doctorPayout,
        gatewayOrderId,
        status: 'pending',
      },
    });

    return {
      payment,
      gatewayOrderId,
      amount: fee,
      currency: 'INR',
      // In production: include Razorpay key_id and order details
    };
  }

  async confirmPayment(paymentId: string, gatewayPaymentId: string) {
    // In production: verify payment with Razorpay API
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        gatewayPaymentId,
        status: 'captured',
        paidAt: new Date(),
      },
    });
    return payment;
  }

  async refund(paymentId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'captured') throw new BadRequestException('Payment not captured');

    // In production: initiate Razorpay refund
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'refunded',
        refundReason: reason,
        refundedAt: new Date(),
      },
    });
  }

  async getPatientPayments(patientId: string) {
    return this.prisma.payment.findMany({
      where: { patientId },
      include: {
        appointment: {
          include: {
            doctor: { select: { name: true } },
            case_: { select: { caseNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== ADMIN ====================

  async getRevenueSummary() {
    const [totalRevenue, totalRefunds, payments] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'captured' },
        _sum: { amount: true, platformCommission: true, doctorPayout: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'refunded' },
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: { status: 'captured' },
        orderBy: { paidAt: 'desc' },
        take: 20,
        include: {
          appointment: {
            include: {
              doctor: { select: { name: true } },
              patient: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return {
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      totalCommission: Number(totalRevenue._sum.platformCommission || 0),
      totalDoctorPayouts: Number(totalRevenue._sum.doctorPayout || 0),
      totalRefunds: Number(totalRefunds._sum.amount || 0),
      recentPayments: payments,
    };
  }
}
