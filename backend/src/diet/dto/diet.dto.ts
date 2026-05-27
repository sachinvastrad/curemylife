import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsEnum, Min, Max } from 'class-validator';

// ===================== GENERATE DIET CHART =====================

export class BiomarkerInputDto {
  @IsString()
  marker: string; // hba1c, fbs, ldl, hdl, tg, tsh, hb, ferritin, egfr, uric_acid, bp_sys, bp_dia, vit_d, b12

  @IsNumber()
  value: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsString()
  measuredAt?: string; // ISO date string
}

export class GenerateDietDto {
  @IsString()
  patientId: string;

  // Biometrics
  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  targetWeightKg?: number;

  @IsOptional()
  @IsNumber()
  age?: number;

  @IsOptional()
  @IsString()
  gender?: string; // male, female, other

  // Activity
  @IsOptional()
  @IsString()
  activityLevel?: string; // sedentary, light, moderate, heavy, athlete

  @IsOptional()
  @IsNumber()
  exerciseMinsWeek?: number;

  // Diet preferences
  @IsOptional()
  @IsString()
  dietType?: string; // VEG, NON_VEG, EGGETARIAN, VEGAN, JAIN, SATVIK

  @IsOptional()
  @IsString()
  fastingWindow?: string; // none, 12:12, 14:10, 16:8, OMAD, 5:2

  @IsOptional()
  @IsString()
  cuisineRegion?: string;

  @IsOptional()
  @IsString()
  budgetTier?: string; // economy, standard, premium

  @IsOptional()
  @IsString()
  cookingTimeTier?: string; // le10, le20, le45, no_limit

  // Allergens & restrictions
  @IsOptional()
  @IsArray()
  allergens?: string[];

  @IsOptional()
  @IsArray()
  foodIntolerances?: string[];

  @IsOptional()
  @IsArray()
  foodDislikes?: string[];

  // Diseases & conditions
  @IsOptional()
  @IsArray()
  diseaseTags?: string[];

  // Biomarkers (for auto-tag derivation)
  @IsOptional()
  biomarkers?: BiomarkerInputDto[];

  // Medications
  @IsOptional()
  @IsArray()
  medications?: string[];

  // Constitutional
  @IsOptional()
  @IsString()
  pregnancyStatus?: string; // none, t1, t2, t3, lactating_0_6, lactating_6_12

  @IsOptional()
  @IsString()
  ayurvedicPrakriti?: string; // vata, pitta, kapha, etc.

  // Lifestyle
  @IsOptional()
  @IsNumber()
  sleepHoursAvg?: number;

  @IsOptional()
  @IsString()
  stressLevel?: string;

  @IsOptional()
  @IsNumber()
  waterIntakeL?: number;

  // Override — if doctor wants to force a specific template
  @IsOptional()
  @IsString()
  templateId?: string;

  // Whether to persist the chart after generating
  @IsOptional()
  @IsBoolean()
  persist?: boolean;
}

// ===================== SAVE / UPDATE CHART =====================

export class SaveDietChartDto {
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  dietTemplateId?: string;

  @IsOptional()
  inputs?: any;

  @IsOptional()
  snapshot?: any;

  @IsOptional()
  groceryList?: any;

  @IsOptional()
  patientOverrides?: any;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  avgDailyKcal?: number;

  @IsOptional()
  @IsNumber()
  avgDailyGi?: number;
}

// ===================== BIOMARKER =====================

export class CreateBiomarkerDto {
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  visitId?: string;

  @IsString()
  marker: string;

  @IsNumber()
  value: number;

  @IsString()
  unit: string;

  @IsString()
  measuredAt: string;
}

// ===================== SWAP =====================

export class SwapFoodDto {
  @IsString()
  fromFoodId: string;

  @IsOptional()
  @IsString()
  slot?: string;

  @IsOptional()
  @IsArray()
  allergens?: string[];

  @IsOptional()
  @IsArray()
  dislikes?: string[];

  @IsOptional()
  @IsArray()
  diseases?: string[];

  @IsOptional()
  @IsString()
  dietType?: string;
}
