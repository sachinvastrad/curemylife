import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Public, unauthenticated specialities list.
 * Used by the doctor registration form and the patient "new case" wizard
 * to populate the speciality-tag picker.
 */
@Controller('api/specialities')
export class SpecialitiesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.speciality.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true, academicAlign: true },
    });
  }
}
