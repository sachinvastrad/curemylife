import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics(dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(dateFrom) : new Date(new Date().setDate(new Date().getDate() - 30));
    const to = dateTo ? new Date(dateTo) : new Date();

    const dateFilter = { gte: from, lte: to };

    const [
      totalCases,
      casesByStatus,
      totalDoctors,
      activeDoctors,
      pendingDoctors,
      totalPatients,
      totalAppointments,
      completedConsultations,
      revenueData,
      recentCases,
    ] = await Promise.all([
      this.prisma.case.count({ where: { createdAt: dateFilter } }),
      this.prisma.case.groupBy({
        by: ['status'],
        _count: true,
        where: { createdAt: dateFilter },
      }),
      this.prisma.doctor.count(),
      this.prisma.doctor.count({ where: { status: 'approved' } }),
      this.prisma.doctor.count({ where: { status: 'pending' } }),
      this.prisma.patient.count(),
      this.prisma.appointment.count({ where: { createdAt: dateFilter } }),
      this.prisma.appointment.count({ where: { status: 'completed', createdAt: dateFilter } }),
      this.prisma.payment.aggregate({
        where: { status: 'captured', paidAt: dateFilter },
        _sum: { amount: true, platformCommission: true },
      }),
      this.prisma.case.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { name: true, city: true } },
          specialities: { include: { speciality: true } },
          assignedDoctor: { select: { name: true } },
        },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    casesByStatus.forEach((s) => { statusMap[s.status] = s._count; });

    return {
      overview: {
        totalCases,
        totalDoctors,
        activeDoctors,
        pendingDoctors,
        totalPatients,
        totalAppointments,
        completedConsultations,
        totalRevenue: Number(revenueData._sum.amount || 0),
        platformCommission: Number(revenueData._sum.platformCommission || 0),
      },
      casesByStatus: statusMap,
      recentCases,
      period: { from, to },
    };
  }

  async getSpecialitiesList() {
    return this.prisma.speciality.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            doctors: true,
            cases: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAllPatients(page = 1, limit = 20, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { cases: true, appointments: true } } },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return { patients, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getAllDoctors(page = 1, limit = 20, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, phone: true,
          qualifications: true, cchRegistrationNo: true,
          status: true, avgRating: true, totalReviews: true,
          createdAt: true, verifiedAt: true,
          specialities: { include: { speciality: true } },
          _count: { select: { assignedCases: true, appointments: true } },
        },
      }),
      this.prisma.doctor.count({ where }),
    ]);

    return { doctors, total, page, totalPages: Math.ceil(total / limit) };
  }

  async togglePatientStatus(patientId: string, isActive: boolean) {
    return this.prisma.patient.update({
      where: { id: patientId },
      data: { isActive },
    });
  }
}
