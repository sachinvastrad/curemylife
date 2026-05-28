import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Req, UseGuards,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { DietService } from './diet.service';
import { GeneratorResult } from './diet-generator.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';
import {
  GenerateDietDto,
  SaveDietChartDto,
  CreateBiomarkerDto,
  SwapFoodDto,
} from './dto/diet.dto';

/**
 * Magic Diet — patient self-service.
 * v1 (doctor-driven) shipped first; v1.1 reshapes this so patients generate
 * their own plans. Admin retained on all mutating endpoints for support /
 * back-office use. Doctor role removed everywhere — the doctor surface for
 * Magic Diet has been retired (see frontend doctor/diet/* deletions).
 *
 * Patient-search, template-management endpoints, and the DietTemplate
 * model itself have all been removed. The generator now uses hard-coded
 * defaults for slot distribution and dietary caps (see DEFAULT_SLOT_DIST
 * + the inline cap constants in diet-generator.service.ts).
 */
@Controller('api/diet')
@UseGuards(JwtAuthGuard)
export class DietController {
  constructor(private dietService: DietService) {}

  // ===================== FOODS =====================

  @Get('foods')
  async searchFoods(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('veg') vegType?: string,
  ) {
    return this.dietService.searchFoods(q, category, vegType);
  }

  @Get('foods/:id')
  async getFoodById(@Param('id') id: string) {
    return this.dietService.getFoodById(id);
  }

  // ===================== RECIPES =====================

  @Get('recipes')
  async searchRecipes(
    @Query('slot') slot?: string,
    @Query('cuisine') cuisine?: string,
  ) {
    return this.dietService.searchRecipes(slot, cuisine);
  }

  // ===================== GENERATE =====================

  @Post('generate')
  @UseGuards(RolesGuard)
  @Roles('patient', 'admin')
  async generate(@Body() dto: GenerateDietDto, @Req() req: any): Promise<GeneratorResult & { chartId?: string }> {
    // Patients can only generate plans for themselves — ignore any body-supplied
    // patientId. Admin may target a specific patient (for support workflows).
    const effective: GenerateDietDto = req.user.role === 'patient'
      ? { ...dto, patientId: req.user.sub }
      : dto;
    if (!effective.patientId) throw new BadRequestException('patientId is required');
    return this.dietService.generate(effective);
  }

  // ===================== SWAP =====================

  @Post('swap')
  @UseGuards(RolesGuard)
  @Roles('patient', 'admin')
  async swap(@Body() dto: SwapFoodDto) {
    return this.dietService.swap(dto);
  }

  // ===================== CHARTS =====================

  @Post('charts')
  @UseGuards(RolesGuard)
  @Roles('patient', 'admin')
  async saveChart(@Body() dto: SaveDietChartDto, @Req() req: any) {
    // Patients can only save charts for themselves
    const payload = req.user.role === 'patient'
      ? { ...dto, patientId: req.user.sub }
      : dto;
    return this.dietService.saveChart(payload, req.user.sub);
  }

  @Patch('charts/:id')
  @UseGuards(RolesGuard)
  @Roles('patient', 'admin')
  async updateChart(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    if (req.user.role === 'patient') {
      await this.assertChartOwnership(id, req.user.sub);
    }
    return this.dietService.updateChart(id, body);
  }

  @Get('charts')
  async getCharts(
    @Query('patientId') patientId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    // Patients can only see their own charts
    const pid = req?.user?.role === 'patient' ? req.user.sub : patientId;
    if (!pid) throw new BadRequestException('patientId is required');
    return this.dietService.getCharts(pid, page ? parseInt(page) : 1, limit ? parseInt(limit) : 10);
  }

  @Get('charts/:id')
  async getChartById(@Param('id') id: string, @Req() req: any) {
    if (req.user.role === 'patient') {
      await this.assertChartOwnership(id, req.user.sub);
    }
    return this.dietService.getChartById(id);
  }

  @Delete('charts/:id')
  @UseGuards(RolesGuard)
  @Roles('patient', 'admin')
  async deleteChart(@Param('id') id: string, @Req() req: any) {
    if (req.user.role === 'patient') {
      await this.assertChartOwnership(id, req.user.sub);
    }
    return this.dietService.deleteChart(id);
  }

  // ===================== BIOMARKERS =====================

  @Post('biomarkers')
  @UseGuards(RolesGuard)
  @Roles('patient', 'admin')
  async createBiomarker(@Body() dto: CreateBiomarkerDto, @Req() req: any) {
    const payload = req.user.role === 'patient'
      ? { ...dto, patientId: req.user.sub }
      : dto;
    return this.dietService.createBiomarker(payload);
  }

  @Get('biomarkers')
  async getBiomarkers(@Query('patientId') patientId: string, @Req() req: any) {
    const pid = req?.user?.role === 'patient' ? req.user.sub : patientId;
    if (!pid) throw new BadRequestException('patientId is required');
    return this.dietService.getBiomarkers(pid);
  }

  @Get('biomarkers/latest')
  async getLatestBiomarkers(@Query('patientId') patientId: string, @Req() req: any) {
    const pid = req?.user?.role === 'patient' ? req.user.sub : patientId;
    if (!pid) throw new BadRequestException('patientId is required');
    return this.dietService.getLatestBiomarkers(pid);
  }

  // ===================== PATIENT DIET PROFILE =====================

  @Patch('patient-profile')
  @UseGuards(RolesGuard)
  @Roles('patient', 'admin')
  async updatePatientProfile(@Body() body: any, @Req() req: any) {
    const patientId = req.user.role === 'patient' ? req.user.sub : body.patientId;
    if (!patientId) throw new BadRequestException('patientId is required');
    return this.dietService.updatePatientDietProfile(patientId, body);
  }

  // ===================== INTERNAL =====================

  private async assertChartOwnership(chartId: string, patientId: string) {
    const chart = await this.dietService.getChartById(chartId);
    if (chart.patientId !== patientId) {
      throw new ForbiddenException('You do not have access to this diet chart');
    }
  }
}
