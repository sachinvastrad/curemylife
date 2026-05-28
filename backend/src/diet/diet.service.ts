import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DietGeneratorService, GeneratorResult } from './diet-generator.service';
import { GenerateDietDto, SaveDietChartDto, CreateBiomarkerDto, SwapFoodDto } from './dto/diet.dto';

@Injectable()
export class DietService {
  constructor(
    private prisma: PrismaService,
    private generator: DietGeneratorService,
  ) {}

  // ===================== GENERATE =====================
  async generate(dto: GenerateDietDto): Promise<GeneratorResult & { chartId?: string }> {
    const result = await this.generator.generate(dto);

    if (dto.persist) {
      const chart = await (this.prisma as any).patientDietChart.create({
        data: {
          patientId: dto.patientId,
          dietTemplateId: result.templateUsed || null,
          inputs: result.inputs,
          snapshot: result.snapshot,
          groceryList: result.groceryList,
          violations: result.violations,
          avgDailyKcal: result.snapshot.weeklyRollup.avgDailyKcal,
          version: 1,
        },
      });
      return { ...result, chartId: chart.id };
    }

    return result;
  }

  // ===================== FOODS =====================
  async searchFoods(q?: string, category?: string, vegType?: string) {
    return (this.prisma as any).food.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        ...(vegType ? { vegType } : {}),
        ...(q ? { name: { contains: q } } : {}),
      },
      select: {
        id: true, name: true, category: true, vegType: true,
        kcalPer100g: true, proteinGPer100g: true, carbGPer100g: true, fatGPer100g: true,
        fiberGPer100g: true, giIndex: true, defaultPortionG: true, defaultPortionDesc: true,
        mealSlots: true, costTier: true, allergens: true,
      },
      take: 50,
    });
  }

  async getFoodById(id: string) {
    const food = await (this.prisma as any).food.findUnique({ where: { id } });
    if (!food) throw new NotFoundException('Food not found');
    return food;
  }

  // ===================== RECIPES =====================
  async searchRecipes(slot?: string, cuisine?: string) {
    return (this.prisma as any).recipe.findMany({
      where: {
        isActive: true,
        ...(cuisine ? { cuisine } : {}),
      },
      take: 50,
    });
  }

  // ===================== SWAP =====================
  async swap(dto: SwapFoodDto) {
    return this.generator.getSwaps(dto.fromFoodId, dto.slot, dto.allergens, dto.dislikes, dto.diseases, dto.dietType);
  }

  // ===================== CHARTS (CRUD) =====================
  async saveChart(dto: SaveDietChartDto, doctorId?: string) {
    return (this.prisma as any).patientDietChart.create({
      data: {
        patientId: dto.patientId,
        doctorId: doctorId || null,
        dietTemplateId: dto.dietTemplateId || null,
        inputs: dto.inputs || {},
        snapshot: dto.snapshot || {},
        groceryList: dto.groceryList || {},
        patientOverrides: dto.patientOverrides || {},
        notes: dto.notes || null,
        avgDailyKcal: dto.avgDailyKcal || null,
        avgDailyGi: dto.avgDailyGi || null,
        version: 1,
      },
    });
  }

  async updateChart(id: string, data: Partial<SaveDietChartDto>) {
    const existing = await (this.prisma as any).patientDietChart.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Diet chart not found');
    return (this.prisma as any).patientDietChart.update({
      where: { id },
      data: {
        ...(data.snapshot ? { snapshot: data.snapshot } : {}),
        ...(data.patientOverrides ? { patientOverrides: data.patientOverrides } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.avgDailyKcal ? { avgDailyKcal: data.avgDailyKcal } : {}),
        version: existing.version + 1,
        updatedAt: new Date(),
      },
    });
  }

  async getCharts(patientId: string, page = 1, limit = 10) {
    const [charts, total] = await Promise.all([
      (this.prisma as any).patientDietChart.findMany({
        where: { patientId, isActive: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, version: true, avgDailyKcal: true, avgDailyGi: true,
          notes: true, pdfUrl: true, whatsappSentAt: true, createdAt: true, updatedAt: true,
          dietTemplateId: true,
        },
      }),
      (this.prisma as any).patientDietChart.count({ where: { patientId, isActive: true } }),
    ]);
    return { charts, total, page, limit };
  }

  async getChartById(id: string) {
    const chart = await (this.prisma as any).patientDietChart.findUnique({ where: { id } });
    if (!chart) throw new NotFoundException('Diet chart not found');
    return chart;
  }

  async deleteChart(id: string) {
    return (this.prisma as any).patientDietChart.update({ where: { id }, data: { isActive: false } });
  }

  // ===================== BIOMARKERS =====================
  async createBiomarker(dto: CreateBiomarkerDto) {
    return (this.prisma as any).patientBiomarker.create({
      data: {
        patientId: dto.patientId,
        visitId: dto.visitId || null,
        marker: dto.marker,
        value: dto.value,
        unit: dto.unit,
        measuredAt: new Date(dto.measuredAt),
      },
    });
  }

  async getBiomarkers(patientId: string) {
    return (this.prisma as any).patientBiomarker.findMany({
      where: { patientId },
      orderBy: { measuredAt: 'desc' },
    });
  }

  async getLatestBiomarkers(patientId: string) {
    // Get most recent value per marker
    const all = await (this.prisma as any).patientBiomarker.findMany({
      where: { patientId },
      orderBy: { measuredAt: 'desc' },
    });
    const seen = new Set<string>();
    return all.filter((b: any) => {
      if (seen.has(b.marker)) return false;
      seen.add(b.marker);
      return true;
    });
  }

  // ===================== UPDATE PATIENT DIET PROFILE =====================
  async updatePatientDietProfile(patientId: string, data: any) {
    return this.prisma.patient.update({
      where: { id: patientId },
      data: {
        heightCm: data.heightCm,
        currentWeightKg: data.currentWeightKg,
        targetWeightKg: data.targetWeightKg,
        activityLevel: data.activityLevel,
        dietType: data.dietType,
        allergens: data.allergens,
        foodDislikes: data.foodDislikes,
        cuisineRegion: data.cuisineRegion,
        budgetTier: data.budgetTier,
        cookingTimeTier: data.cookingTimeTier,
        fastingWindow: data.fastingWindow,
        pregnancyStatus: data.pregnancyStatus,
        ayurvedicPrakriti: data.ayurvedicPrakriti,
        stressLevel: data.stressLevel,
        waterIntakeL: data.waterIntakeL,
        sleepHoursAvg: data.sleepHoursAvg,
      },
    });
  }
}
