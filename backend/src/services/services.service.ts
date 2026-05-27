import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import {
  validateFieldDefs, assertPublishable, FieldDef,
} from './intake-validation';

/**
 * Standard "card" projection — used by both patient catalog and admin list.
 * Keep narrow so the public list payload stays small.
 */
const cardSelect = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  iconName: true,
  cardImageUrl: true,
  displayOrder: true,
  isEnabled: true,
  deletedAt: true,
} as const;

/**
 * Detail projection includes landing content and intake definition.
 * Specialities flattened to {id,name} for the renderer.
 */
const detailSelect = {
  ...cardSelect,
  description: true,
  howItWorks: true,
  inclusions: true,
  intakeFields: true,
  price: true,
  createdAt: true,
  updatedAt: true,
  specialities: { select: { speciality: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  // ==================== PATIENT-FACING (read) ====================

  /** Catalog grid: only enabled, non-deleted services in display order. */
  listEnabled() {
    return this.prisma.service.findMany({
      where: { isEnabled: true, deletedAt: null },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      select: cardSelect,
    });
  }

  /** Landing page by slug. 404 if not enabled or soft-deleted. */
  async findEnabledBySlug(slug: string) {
    const svc = await this.prisma.service.findFirst({
      where: { slug, isEnabled: true, deletedAt: null },
      select: detailSelect,
    });
    if (!svc) throw new NotFoundException('Service not available');
    return this.flatten(svc);
  }

  // ==================== ADMIN-FACING ====================

  listAll() {
    return this.prisma.service.findMany({
      where: { deletedAt: null },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      select: detailSelect,
    }).then((rows) => rows.map((s) => this.flatten(s)));
  }

  async findByIdForAdmin(id: string) {
    const svc = await this.prisma.service.findFirst({
      where: { id, deletedAt: null },
      select: detailSelect,
    });
    if (!svc) throw new NotFoundException('Service not found');
    return this.flatten(svc);
  }

  async create(dto: CreateServiceDto, adminId: string) {
    const fields = validateFieldDefs(dto.intakeFields);
    await this.assertSlugAvailable(dto.slug);
    await this.assertSpecialitiesExist(dto.specialityIds);

    const created = await this.prisma.service.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        tagline: dto.tagline,
        description: dto.description,
        howItWorks: dto.howItWorks as Prisma.InputJsonValue ?? Prisma.JsonNull,
        inclusions: dto.inclusions as Prisma.InputJsonValue ?? Prisma.JsonNull,
        iconName: dto.iconName,
        cardImageUrl: dto.cardImageUrl,
        intakeFields: fields as unknown as Prisma.InputJsonValue,
        price: dto.price,
        displayOrder: dto.displayOrder ?? 0,
        isEnabled: false,  // explicit enable required (assertPublishable runs then)
        specialities: {
          create: dto.specialityIds.map((specialityId) => ({ specialityId })),
        },
      },
      select: detailSelect,
    });

    await this.writeAudit(adminId, 'service.create', created.id, { name: created.name });
    return this.flatten(created);
  }

  async update(id: string, dto: UpdateServiceDto, adminId: string) {
    const existing = await this.prisma.service.findFirst({
      where: { id, deletedAt: null },
      include: { specialities: true },
    });
    if (!existing) throw new NotFoundException('Service not found');

    if (dto.slug && dto.slug !== existing.slug) {
      await this.assertSlugAvailable(dto.slug);
    }
    if (dto.specialityIds) {
      await this.assertSpecialitiesExist(dto.specialityIds);
    }

    let fields: FieldDef[] | undefined;
    if (dto.intakeFields !== undefined) {
      fields = validateFieldDefs(dto.intakeFields);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.specialityIds) {
        await tx.serviceSpeciality.deleteMany({ where: { serviceId: id } });
        await tx.serviceSpeciality.createMany({
          data: dto.specialityIds.map((sid) => ({ serviceId: id, specialityId: sid })),
        });
      }
      return tx.service.update({
        where: { id },
        data: {
          ...(dto.slug !== undefined && { slug: dto.slug }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.tagline !== undefined && { tagline: dto.tagline }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.howItWorks !== undefined && {
            howItWorks: (dto.howItWorks as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          }),
          ...(dto.inclusions !== undefined && {
            inclusions: (dto.inclusions as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          }),
          ...(dto.iconName !== undefined && { iconName: dto.iconName }),
          ...(dto.cardImageUrl !== undefined && { cardImageUrl: dto.cardImageUrl }),
          ...(fields !== undefined && {
            intakeFields: fields as unknown as Prisma.InputJsonValue,
          }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        },
        select: detailSelect,
      });
    });

    await this.writeAudit(adminId, 'service.update', id, { fields: Object.keys(dto) });
    return this.flatten(updated);
  }

  async toggleEnabled(id: string, isEnabled: boolean, adminId: string) {
    const svc = await this.prisma.service.findFirst({
      where: { id, deletedAt: null },
      include: { specialities: true },
    });
    if (!svc) throw new NotFoundException('Service not found');

    if (isEnabled) {
      assertPublishable({
        name: svc.name,
        description: svc.description,
        intakeFields: svc.intakeFields,
        specialitiesCount: svc.specialities.length,
      });
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: { isEnabled },
      select: detailSelect,
    });
    await this.writeAudit(adminId, isEnabled ? 'service.enable' : 'service.disable', id);
    return this.flatten(updated);
  }

  /** Soft-delete: preserves historical ServiceRequest references. */
  async softDelete(id: string, adminId: string) {
    const svc = await this.prisma.service.findFirst({ where: { id, deletedAt: null } });
    if (!svc) throw new NotFoundException('Service not found');

    await this.prisma.service.update({
      where: { id },
      data: { isEnabled: false, deletedAt: new Date() },
    });
    await this.writeAudit(adminId, 'service.delete', id, { name: svc.name });
    return { id, deleted: true };
  }

  // ==================== INTERNAL HELPERS ====================

  /** Resolve a Service for an authenticated patient intake submission. */
  async findEnabledForIntake(serviceId: string) {
    const svc = await this.prisma.service.findFirst({
      where: { id: serviceId, isEnabled: true, deletedAt: null },
      include: { specialities: { select: { specialityId: true } } },
    });
    if (!svc) throw new NotFoundException('Service not available');
    return svc;
  }

  private async assertSlugAvailable(slug: string) {
    const clash = await this.prisma.service.findUnique({ where: { slug } });
    if (clash) throw new ConflictException(`Slug "${slug}" is already in use`);
  }

  private async assertSpecialitiesExist(ids: number[]) {
    if (!ids?.length) {
      throw new BadRequestException('At least one speciality is required');
    }
    const count = await this.prisma.speciality.count({
      where: { id: { in: ids }, isActive: true },
    });
    if (count !== ids.length) {
      throw new BadRequestException('One or more specialityIds are invalid');
    }
  }

  private flatten<T extends { specialities?: { speciality: { id: number; name: string } }[] }>(svc: T) {
    if (!svc.specialities) return svc;
    return {
      ...svc,
      specialities: svc.specialities.map((s) => s.speciality),
    };
  }

  private writeAudit(
    adminId: string,
    action: string,
    resourceId: string,
    details?: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId: adminId,
        userRole: 'admin',
        action,
        resourceType: 'service',
        resourceId,
        details: (details as Prisma.InputJsonValue) ?? undefined,
      },
    }).catch(() => undefined);  // never fail the mutation on audit-log issues
  }
}
