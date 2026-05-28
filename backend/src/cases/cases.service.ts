import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCaseDto, UpdateCaseDto } from './dto/case.dto';

@Injectable()
export class CasesService {
  constructor(private prisma: PrismaService) {}

  private async generateCaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.case.count({
      where: { caseNumber: { startsWith: `HO-${year}` } },
    });
    return `HO-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async create(patientId: string, dto: CreateCaseDto) {
    const caseNumber = await this.generateCaseNumber();

    const newCase = await this.prisma.case.create({
      data: {
        patientId,
        caseNumber,
        chiefComplaint: dto.chiefComplaint,
        durationValue: dto.durationValue,
        durationUnit: dto.durationUnit,
        previousTreatments: dto.previousTreatments,
        familyHistory: dto.familyHistory,
        pastIllnesses: dto.pastIllnesses,
        status: 'draft',
        specialities: {
          create: dto.specialityIds.map((id) => ({ specialityId: id })),
        },
      },
      include: {
        specialities: { include: { speciality: true } },
        documents: true,
      },
    });

    return newCase;
  }

  async findAllForPatient(patientId: string, status?: string) {
    const where: any = { patientId };
    if (status) where.status = status;

    return this.prisma.case.findMany({
      where,
      include: {
        specialities: { include: { speciality: true } },
        documents: true,
        assignedDoctor: { select: { id: true, name: true, photoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(caseId: string, userId: string, role: string) {
    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        patient: { select: { id: true, name: true, age: true, gender: true, city: true } },
        specialities: { include: { speciality: true } },
        documents: true,
        aiReports: { orderBy: { createdAt: 'desc' } },
        doctorReports: { include: { doctor: { select: { id: true, name: true, qualifications: true } } } },
        assignedDoctor: { select: { id: true, name: true, photoUrl: true, qualifications: true } },
        appointments: { orderBy: { scheduledDate: 'desc' } },
      },
    });

    if (!caseData) throw new NotFoundException('Case not found');

    // Access control
    if (role === 'patient' && caseData.patientId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    if (role === 'doctor' && caseData.assignedDoctorId !== userId && caseData.status === 'awaiting_doctor') {
      // Doctors can view cases awaiting doctor review (for picking), but limited info
    }

    return caseData;
  }

  async update(caseId: string, patientId: string, dto: UpdateCaseDto) {
    const existing = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!existing) throw new NotFoundException('Case not found');
    if (existing.patientId !== patientId) throw new ForbiddenException('Access denied');
    if (existing.status !== 'draft') throw new BadRequestException('Can only edit draft cases');

    const { specialityIds, ...caseData } = dto;

    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        ...caseData,
        ...(specialityIds && {
          specialities: {
            deleteMany: {},
            create: specialityIds.map((id) => ({ specialityId: id })),
          },
        }),
      },
      include: {
        specialities: { include: { speciality: true } },
        documents: true,
      },
    });

    return updated;
  }

  async submit(caseId: string, patientId: string) {
    const existing = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { documents: true, specialities: true },
    });
    if (!existing) throw new NotFoundException('Case not found');
    if (existing.patientId !== patientId) throw new ForbiddenException('Access denied');
    if (existing.status !== 'draft') throw new BadRequestException('Case already submitted');

    // Validate required fields. Constitutional profile, modalities and
    // supporting documents are all optional — a case can be submitted with
    // just the chief complaint and at least one speciality tag.
    if (!existing.chiefComplaint) throw new BadRequestException('Chief complaint is required');
    if (existing.specialities.length === 0) throw new BadRequestException('At least one speciality tag is required');

    // Move the case straight into the doctor queue. The queue filters on
    // status 'awaiting_doctor' with no assigned doctor, so a submitted case
    // becomes immediately visible to doctors whose specialities match its tags.
    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        status: 'awaiting_doctor',
        submittedAt: new Date(),
      },
    });

    return { ...updated, message: 'Case submitted successfully and is now awaiting doctor review.' };
  }

  // ==================== DOCTOR CASE QUEUE ====================

  async findQueueForDoctor(doctorId: string, specialityId?: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { specialities: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const doctorSpecialityIds = doctor.specialities.map((s) => s.specialityId);

    const where: any = {
      status: 'awaiting_doctor',
      assignedDoctorId: null,
      specialities: {
        some: {
          specialityId: specialityId ? specialityId : { in: doctorSpecialityIds },
        },
      },
    };

    return this.prisma.case.findMany({
      where,
      include: {
        patient: { select: { age: true, gender: true, city: true } }, // anonymised
        specialities: { include: { speciality: true } },
        aiReports: { take: 1, orderBy: { createdAt: 'desc' }, select: { overallConfidence: true } },
      },
      orderBy: { submittedAt: 'asc' }, // FIFO
    });
  }

  async acceptCase(caseId: string, doctorId: string) {
    const existing = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!existing) throw new NotFoundException('Case not found');
    if (existing.status !== 'awaiting_doctor') throw new BadRequestException('Case not available for acceptance');
    if (existing.assignedDoctorId) throw new BadRequestException('Case already assigned');

    return this.prisma.case.update({
      where: { id: caseId },
      data: {
        assignedDoctorId: doctorId,
        doctorAcceptedAt: new Date(),
      },
      include: {
        patient: true,
        specialities: { include: { speciality: true } },
        documents: true,
        aiReports: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async getDoctorCases(doctorId: string, status?: string) {
    const where: any = { assignedDoctorId: doctorId };
    if (status) where.status = status;

    return this.prisma.case.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, age: true, gender: true } },
        specialities: { include: { speciality: true } },
        doctorReports: true,
      },
      orderBy: { doctorAcceptedAt: 'desc' },
    });
  }

  // ==================== ADMIN ====================

  async findAllCases(page = 1, limit = 20, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const [cases, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, city: true } },
          specialities: { include: { speciality: true } },
          assignedDoctor: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.case.count({ where }),
    ]);

    return { cases, total, page, totalPages: Math.ceil(total / limit) };
  }

  async reassignCase(caseId: string, doctorId: string) {
    return this.prisma.case.update({
      where: { id: caseId },
      data: {
        assignedDoctorId: doctorId,
        doctorAcceptedAt: new Date(),
      },
    });
  }
}
