import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    caseId: string;
    patientId: string;
    doctorId: string;
    appointmentType: string;
    scheduledDate: string;
    scheduledStart: string;
    isFollowup?: boolean;
  }) {
    const caseData = await this.prisma.case.findUnique({ where: { id: data.caseId } });
    if (!caseData) throw new NotFoundException('Case not found');
    if (caseData.patientId !== data.patientId) throw new BadRequestException('Access denied');

    // Calculate end time based on doctor's slot duration
    const avail = await this.prisma.doctorAvailability.findFirst({
      where: { doctorId: data.doctorId, isActive: true },
    });
    const slotDuration = avail?.slotDurationMin || 30;
    const [startH, startM] = data.scheduledStart.split(':').map(Number);
    const endMinutes = startH * 60 + startM + slotDuration;
    const scheduledEnd = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Check slot availability
    const existing = await this.prisma.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        scheduledDate: new Date(data.scheduledDate),
        scheduledStart: data.scheduledStart,
        status: { in: ['booked', 'confirmed'] },
      },
    });
    if (existing) throw new BadRequestException('Slot already booked');

    const appointment = await this.prisma.appointment.create({
      data: {
        caseId: data.caseId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        appointmentType: data.appointmentType,
        scheduledDate: new Date(data.scheduledDate),
        scheduledStart: data.scheduledStart,
        scheduledEnd,
        isFollowup: data.isFollowup || false,
        status: 'booked',
        meetingLink: data.appointmentType === 'video' ? `https://meet.jit.si/homeopinion-${Date.now()}` : undefined,
      },
      include: {
        doctor: { select: { id: true, name: true, initialFee: true, followupFee: true } },
        case_: { select: { caseNumber: true } },
      },
    });

    // Update case status
    await this.prisma.case.update({
      where: { id: data.caseId },
      data: { status: 'consultation_booked' },
    });

    return appointment;
  }

  async getPatientAppointments(patientId: string) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      include: {
        doctor: { select: { id: true, name: true, photoUrl: true, qualifications: true } },
        case_: { select: { caseNumber: true, chiefComplaint: true } },
        payment: true,
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  async getDoctorAppointments(doctorId: string, upcoming?: boolean) {
    const where: any = { doctorId };
    if (upcoming) {
      where.scheduledDate = { gte: new Date() };
      where.status = { in: ['booked', 'confirmed'] };
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, age: true, gender: true } },
        case_: { select: { caseNumber: true, chiefComplaint: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async startAppointment(appointmentId: string, doctorId: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.doctorId !== doctorId) throw new BadRequestException('Access denied');
    if (!['booked', 'confirmed'].includes(appt.status)) {
      throw new BadRequestException('Appointment cannot be started');
    }
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'in_progress' },
    });
  }

  async completeAppointment(appointmentId: string, doctorId: string, notes?: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.doctorId !== doctorId) throw new BadRequestException('Access denied');

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'completed',
        consultationNotes: notes,
      },
    });

    // Update case status (skipped for service-originated appointments)
    if (appt.caseId) {
      await this.prisma.case.update({
        where: { id: appt.caseId },
        data: { status: 'consultation_done' },
      });
    }

    // Mark payment as captured
    await this.prisma.payment.updateMany({
      where: { appointmentId, status: 'pending' },
      data: { status: 'captured', paidAt: new Date() },
    });

    return updated;
  }

  async cancelAppointment(appointmentId: string, userId: string, role: string, reason?: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');

    if (role === 'patient' && appt.patientId !== userId) throw new BadRequestException('Access denied');
    if (role === 'doctor' && appt.doctorId !== userId) throw new BadRequestException('Access denied');

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'cancelled',
        cancelledBy: role,
        cancellationReason: reason,
      },
    });

    // If doctor cancelled, refund patient
    if (role === 'doctor') {
      await this.prisma.payment.updateMany({
        where: { appointmentId },
        data: { status: 'refunded', refundReason: 'Doctor cancelled', refundedAt: new Date() },
      });
    }

    return updated;
  }
}
