import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
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
   * routing speciality IDs so the appointment service can verify doctor fit.
   */
  async claimForBooking(id: string, patientId: string): Promise<{ specialityIds: number[] }> {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { service: { select: { specialities: true } } },
    });
    if (!sr) throw new NotFoundException('Service request not found');
    if (sr.patientId !== patientId) throw new ForbiddenException();
    if (!['submitted', 'booked'].includes(sr.status)) {
      throw new BadRequestException('Service request is not bookable');
    }

    if (sr.status === 'submitted') {
      await this.prisma.serviceRequest.update({
        where: { id },
        data: { status: 'booked' },
      });
    }

    return {
      specialityIds: sr.service.specialities.map((s) => s.specialityId),
    };
  }
}
