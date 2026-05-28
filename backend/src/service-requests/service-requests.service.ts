import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ServicesService } from '../services/services.service';
import { validateIntakePayload, FieldDef } from '../services/intake-validation';
import { CreateServiceRequestDto, SubmitServiceRequestDto } from './dto/service-request.dto';

@Injectable()
export class ServiceRequestsService {
  constructor(
    private prisma: PrismaService,
    private servicesService: ServicesService,
  ) {}

  /**
   * Create a service request — typically called when the patient submits the
   * intake form on the landing page. We validate the payload against the
   * Service's intake definition before persisting.
   */
  async create(patientId: string, dto: CreateServiceRequestDto) {
    const svc = await this.servicesService.findEnabledForIntake(dto.serviceId);
    const fields = svc.intakeFields as unknown as FieldDef[];
    const payload = validateIntakePayload(fields, dto.intakePayload);

    return this.prisma.serviceRequest.create({
      data: {
        serviceId: svc.id,
        patientId,
        status: 'submitted',
        intakePayload: payload as Prisma.InputJsonValue,
        notes: dto.notes,
        submittedAt: new Date(),
      },
      include: {
        service: {
          select: {
            id: true, slug: true, name: true, tagline: true,
            specialities: { select: { specialityId: true } },
          },
        },
      },
    });
  }

  /**
   * Update + submit a draft ServiceRequest (resumable flow). For v1 we don't
   * expose a separate "draft" path from the UI, but the endpoint exists so the
   * intake form can save partial state in the future.
   */
  async submit(id: string, patientId: string, dto: SubmitServiceRequestDto) {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { service: true },
    });
    if (!sr) throw new NotFoundException('Service request not found');
    if (sr.patientId !== patientId) throw new ForbiddenException();
    if (sr.status !== 'draft') {
      throw new BadRequestException('This request has already been submitted');
    }

    const fields = sr.service.intakeFields as unknown as FieldDef[];
    const payload = dto.intakePayload !== undefined
      ? validateIntakePayload(fields, dto.intakePayload)
      : sr.intakePayload;

    return this.prisma.serviceRequest.update({
      where: { id },
      data: {
        intakePayload: payload as Prisma.InputJsonValue,
        notes: dto.notes ?? sr.notes,
        status: 'submitted',
        submittedAt: new Date(),
      },
    });
  }

  async findByIdForPatient(id: string, patientId: string) {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            id: true, slug: true, name: true, tagline: true, iconName: true,
            intakeFields: true,
            specialities: { select: { speciality: { select: { id: true, name: true } } } },
          },
        },
        assignedDoctor: {
          select: { id: true, name: true, photoUrl: true, qualifications: true, initialFee: true },
        },
        appointments: {
          select: { id: true, scheduledDate: true, scheduledStart: true, status: true },
          orderBy: { scheduledDate: 'desc' },
        },
      },
    });
    if (!sr) throw new NotFoundException('Service request not found');
    if (sr.patientId !== patientId) throw new ForbiddenException();
    return sr;
  }

  /** Patient's service-request history (for dashboard). */
  listForPatient(patientId: string) {
    return this.prisma.serviceRequest.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        service: { select: { id: true, slug: true, name: true, iconName: true } },
        appointments: {
          select: { id: true, scheduledDate: true, status: true },
          orderBy: { scheduledDate: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Used by the appointment-create path to confirm the patient owns the SR
   * and to mark it as "booked" once the appointment lands. Returns the
   * routing speciality IDs + any pre-assigned doctor so the appointment
   * service can verify doctor fit.
   */
  async claimForBooking(
    id: string,
    patientId: string,
  ): Promise<{ specialityIds: number[]; assignedDoctorId: string | null }> {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { service: { select: { specialities: true } } },
    });
    if (!sr) throw new NotFoundException('Service request not found');
    if (sr.patientId !== patientId) throw new ForbiddenException();
    if (!['submitted', 'accepted', 'booked'].includes(sr.status)) {
      throw new BadRequestException('Service request is not bookable');
    }

    if (sr.status === 'submitted' || sr.status === 'accepted') {
      await this.prisma.serviceRequest.update({
        where: { id },
        data: { status: 'booked' },
      });
    }

    return {
      specialityIds: sr.service.specialities.map((s) => s.specialityId),
      assignedDoctorId: sr.assignedDoctorId,
    };
  }

  // ============================================================
  // DOCTOR-FACING (queue + accept + assigned)
  // ============================================================

  /**
   * Returns submitted, unassigned service requests where the service routes
   * to at least one speciality this doctor carries.
   */
  async getDoctorQueue(doctorId: string) {
    const specs = await this.prisma.doctorSpeciality.findMany({
      where: { doctorId },
      select: { specialityId: true },
    });
    const specialityIds = specs.map((s) => s.specialityId);
    if (specialityIds.length === 0) return [];

    return this.prisma.serviceRequest.findMany({
      where: {
        status: 'submitted',
        assignedDoctorId: null,
        service: {
          deletedAt: null,
          specialities: { some: { specialityId: { in: specialityIds } } },
        },
      },
      orderBy: { submittedAt: 'asc' },
      include: {
        patient: { select: { id: true, name: true, age: true, gender: true } },
        service: {
          select: {
            id: true, slug: true, name: true, iconName: true,
            specialities: { select: { speciality: { select: { id: true, name: true } } } },
          },
        },
      },
    }).then((rows) =>
      rows.map((r) => ({
        ...r,
        service: {
          ...r.service,
          specialities: r.service.specialities.map((sp) => sp.speciality),
        },
      })),
    );
  }

  /**
   * Doctor accepts a submitted service request — claims ownership.
   * Concurrency-safe via the .update with a where-clause that matches only
   * unassigned rows in the right status (Prisma will throw if no row matches).
   */
  async acceptByDoctor(serviceRequestId: string, doctorId: string) {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: { service: { select: { specialities: { select: { specialityId: true } } } } },
    });
    if (!sr) throw new NotFoundException('Service request not found');
    if (sr.status !== 'submitted') {
      throw new ConflictException(
        sr.assignedDoctorId
          ? 'This request has already been accepted by another doctor'
          : 'This request is no longer in the queue',
      );
    }

    // Verify the doctor actually carries one of the required specialities
    const requiredIds = sr.service.specialities.map((s) => s.specialityId);
    const fit = await this.prisma.doctorSpeciality.count({
      where: { doctorId, specialityId: { in: requiredIds } },
    });
    if (fit === 0) {
      throw new ForbiddenException(
        'You do not carry any of the specialities this service routes to',
      );
    }

    // Compare-and-swap: only claim if still unassigned + submitted.
    const result = await this.prisma.serviceRequest.updateMany({
      where: { id: serviceRequestId, status: 'submitted', assignedDoctorId: null },
      data: { assignedDoctorId: doctorId, acceptedAt: new Date(), status: 'accepted' },
    });
    if (result.count === 0) {
      throw new ConflictException('Another doctor accepted this request first');
    }
    return this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: {
        patient: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  /** Service requests this doctor has accepted but not yet completed. */
  getAssignedToDoctor(doctorId: string) {
    return this.prisma.serviceRequest.findMany({
      where: {
        assignedDoctorId: doctorId,
        status: { in: ['accepted', 'booked'] },
      },
      orderBy: { acceptedAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true, age: true, gender: true } },
        service: { select: { id: true, slug: true, name: true, iconName: true } },
        appointments: {
          select: { id: true, scheduledDate: true, scheduledStart: true, status: true },
          orderBy: { scheduledDate: 'desc' },
        },
      },
    });
  }
}
