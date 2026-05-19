import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  // ==================== PROFILE ====================

  async getProfile(doctorId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        specialities: { include: { speciality: true } },
        availability: { where: { isActive: true } },
        onboardingDocs: true,
      },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    const { passwordHash, ...safe } = doctor;
    return safe;
  }

  async updateProfile(doctorId: string, data: any) {
    const { specialityIds, ...profileData } = data;

    const updated = await this.prisma.doctor.update({
      where: { id: doctorId },
      data: {
        ...profileData,
        ...(specialityIds && {
          specialities: {
            deleteMany: {},
            create: specialityIds.map((id: number) => ({ specialityId: id })),
          },
        }),
      },
      include: { specialities: { include: { speciality: true } } },
    });

    const { passwordHash, ...safe } = updated;
    return safe;
  }

  // ==================== AVAILABILITY ====================

  async setAvailability(doctorId: string, slots: any[]) {
    // Delete existing and recreate
    await this.prisma.doctorAvailability.deleteMany({ where: { doctorId } });

    const created = await Promise.all(
      slots.map((slot) =>
        this.prisma.doctorAvailability.create({
          data: {
            doctorId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            slotDurationMin: slot.slotDurationMin || 30,
            bufferMin: slot.bufferMin || 10,
            isActive: true,
          },
        }),
      ),
    );

    return created;
  }

  async getAvailability(doctorId: string) {
    return this.prisma.doctorAvailability.findMany({
      where: { doctorId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getAvailableSlots(doctorId: string, date: string) {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    const availability = await this.prisma.doctorAvailability.findMany({
      where: { doctorId, dayOfWeek, isActive: true },
    });

    if (availability.length === 0) return [];

    // Get existing appointments on that date
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledDate: targetDate,
        status: { in: ['booked', 'confirmed'] },
      },
    });

    const bookedSlots = new Set(existingAppointments.map((a) => a.scheduledStart));

    // Generate available slots
    const slots: Array<{ start: string; end: string; available: boolean }> = [];
    for (const avail of availability) {
      const [startH, startM] = avail.startTime.split(':').map(Number);
      const [endH, endM] = avail.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let m = startMinutes; m + avail.slotDurationMin <= endMinutes; m += avail.slotDurationMin + avail.bufferMin) {
        const slotStart = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        const slotEndMin = m + avail.slotDurationMin;
        const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

        slots.push({
          start: slotStart,
          end: slotEnd,
          available: !bookedSlots.has(slotStart),
        });
      }
    }

    return slots;
  }

  // ==================== DOCTOR REPORT ====================

  async submitReport(caseId: string, doctorId: string, data: any) {
    const caseData = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseData) throw new NotFoundException('Case not found');
    if (caseData.assignedDoctorId !== doctorId) throw new BadRequestException('Case not assigned to you');

    const report = await this.prisma.doctorReport.create({
      data: {
        caseId,
        doctorId,
        aiAgreement: data.aiAgreement,
        aiAgreementNotes: data.aiAgreementNotes,
        additionalObservations: data.additionalObservations,
        recommendedRubrics: data.recommendedRubrics,
        recommendedRemedies: data.recommendedRemedies,
        suggestedInvestigations: data.suggestedInvestigations,
        lifestyleModifications: data.lifestyleModifications,
        redFlagObservations: data.redFlagObservations,
        dispatchedAt: new Date(),
      },
    });

    // Update case status
    await this.prisma.case.update({
      where: { id: caseId },
      data: {
        status: 'report_ready',
        reportDispatchedAt: new Date(),
      },
    });

    return report;
  }

  // ==================== EARNINGS ====================

  async getEarnings(doctorId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { doctorId, status: 'captured' },
      include: { appointment: { include: { case_: { select: { caseNumber: true } } } } },
      orderBy: { paidAt: 'desc' },
    });

    const totalEarned = payments.reduce((sum, p) => sum + Number(p.doctorPayout || 0), 0);
    const totalCommission = payments.reduce((sum, p) => sum + Number(p.platformCommission || 0), 0);

    const payouts = await this.prisma.doctorPayout.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalEarned,
      totalCommission,
      recentPayments: payments.slice(0, 20),
      payouts,
    };
  }

  // ==================== PUBLIC DOCTOR LIST ====================

  async findPublicDoctors(specialityId?: number, language?: string) {
    const where: any = { status: 'approved' };

    if (specialityId) {
      where.specialities = { some: { specialityId } };
    }
    if (language) {
      // languages is a JSON array column on MySQL
      where.languages = { array_contains: language };
    }

    const doctors = await this.prisma.doctor.findMany({
      where,
      select: {
        id: true,
        name: true,
        qualifications: true,
        experienceYears: true,
        languages: true,
        consultationModes: true,
        initialFee: true,
        followupFee: true,
        photoUrl: true,
        avgRating: true,
        totalReviews: true,
        prescribingApproach: true,
        specialities: { include: { speciality: true } },
      },
      orderBy: { avgRating: 'desc' },
    });

    return doctors;
  }

  // ==================== ADMIN ====================

  async getPendingDoctors() {
    return this.prisma.doctor.findMany({
      where: { status: 'pending' },
      include: { onboardingDocs: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveDoctor(doctorId: string) {
    return this.prisma.doctor.update({
      where: { id: doctorId },
      data: { status: 'approved', verifiedAt: new Date() },
    });
  }

  async rejectDoctor(doctorId: string, reason: string) {
    return this.prisma.doctor.update({
      where: { id: doctorId },
      data: { status: 'rejected', rejectionReason: reason },
    });
  }

  async suspendDoctor(doctorId: string, reason: string) {
    return this.prisma.doctor.update({
      where: { id: doctorId },
      data: { status: 'suspended', rejectionReason: reason },
    });
  }
}
