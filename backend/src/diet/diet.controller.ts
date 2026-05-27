import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, Req, UseGuards,
  BadRequestException,
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

  // ===================== TEMPLATES =====================

  @Get('templates')
  async getTemplates(
    @Query('goal') goal?: string,
    @Query('diet') dietType?: string,
    @Query('age') ageGroup?: string,
    @Query('condition') condition?: string,
  ) {
    return this.dietService.getTemplates(goal, dietType, ageGroup, condition);
  }

  @Get('templates/:id')
  async getTemplateById(@Param('id') id: string) {
    return this.dietService.getTemplateById(id);
  }

  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  async createTemplate(@Body() body: any, @Req() req: any) {
    return this.dietService.createTemplate(body, req.user.sub);
  }

  @Patch('templates/:id')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  async updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.dietService.updateTemplate(id, body);
  }

  @Post('templates/:id/clone')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  async cloneTemplate(
    @Param('id') id: string,
    @Body('newName') newName?: string,
    @Req() req?: any,
  ) {
    return this.dietService.cloneTemplate(id, newName, req?.user?.sub);
  }

  // ===================== GENERATE =====================

  @Post('generate')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  async generate(@Body() dto: GenerateDietDto, @Req() req: any): Promise<GeneratorResult & { chartId?: string }> {
    if (!dto.patientId) throw new BadRequestException('patientId is required');
    return this.dietService.generate(dto);
  }

  // ===================== SWAP =====================

  @Post('swap')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  async swap(@Body() dto: SwapFoodDto) {
    return this.dietService.swap(dto);
  }

  // ===================== CHARTS =====================

  @Post('charts')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  async saveChart(@Body() dto: SaveDietChartDto, @Req() req: any) {
    return this.dietService.saveChart(dto, req.user.sub);
  }

  @Patch('charts/:id')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  async updateChart(@Param('id') id: string, @Body() body: any) {
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
  async getChartById(@Param('id') id: string) {
    return this.dietService.getChartById(id);
  }

  @Delete('charts/:id')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  async deleteChart(@Param('id') id: string) {
    return this.dietService.deleteChart(id);
  }

  // ===================== BIOMARKERS =====================

  @Post('biomarkers')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin')
  async createBiomarker(@Body() dto: CreateBiomarkerDto) {
    return this.dietService.createBiomarker(dto);
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

  @Put('patient-profile/:patientId')
  @UseGuards(RolesGuard)
  @Roles('doctor', 'admin', 'patient')
  async updatePatientProfile(@Param('patientId') patientId: string, @Body() body: any, @Req() req: any) {
    // Patients can only update their own profile
    const pid = req?.user?.role === 'patient' ? req.user.sub : patientId;
    return this.dietService.updatePatientDietProfile(pid, body);
  }
}
