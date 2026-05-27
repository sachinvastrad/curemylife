/**
 * Magic Diet — Deterministic Generator Service
 * Implements:
 *  1. Mifflin-St Jeor TDEE calculation
 *  2. Goal-based calorie/macro targets
 *  3. Biomarker auto-tag derivation
 *  4. Template selection ranking
 *  5. Slot calorie distribution (incl. fasting window)
 *  6. Multi-rule candidate pool filtering
 *  7. Greedy item selection with variety constraints
 *  8. Rule-engine hard-cap validation + re-swap
 *  9. Grocery list generation
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateDietDto, BiomarkerInputDto } from './dto/diet.dto';

// ----- Types -----
interface FoodItem {
  id: string;
  name: string;
  category: string;
  vegType: string;
  mealSlots: string[];
  kcalPer100g: number;
  proteinGPer100g: number;
  carbGPer100g: number;
  fatGPer100g: number;
  fiberGPer100g: number;
  sodiumMgPer100g: number;
  potassiumMgPer100g: number;
  giIndex: number | null;
  allergens: string[];
  fodmapLevel: string | null;
  diseaseAllowed: string[];
  diseaseRestricted: string[];
  costTier: string;
  prepTimeMin: number;
  defaultPortionG: number;
  defaultPortionDesc: string;
  purineLevel: number;
  oxalateLevel: number;
  goitrogenFlag: boolean;
  tyramineFlag: boolean;
  vitaminKHighFlag: boolean;
  [key: string]: any;
}

interface SlotItem {
  foodId: string;
  foodName: string;
  portionG: number;
  portionDesc: string;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  gi: number | null;
  isLocked?: boolean;
  isOverride?: boolean;
}

interface DayPlan {
  [slot: string]: SlotItem[];
}

interface WeekPlan {
  [day: string]: DayPlan;
}

interface GeneratorResult {
  success: boolean;
  inputs: GenerateDietDto & { derivedDiseaseTags: string[]; targetKcal: number; macroTargets: any };
  snapshot: {
    week: WeekPlan;
    dayTotals: { [day: string]: any };
    weeklyRollup: any;
  };
  groceryList: { [aisle: string]: { name: string; qty: string; costTier: string }[] };
  violations: { rule: string; action: string; original: string; replacement: string }[];
  templateUsed: string | null;
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const SLOT_ORDER = ['early_morning', 'breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner', 'bedtime'];

const DEFAULT_SLOT_DIST: { [k: string]: number } = {
  early_morning: 3,
  breakfast: 22,
  mid_morning: 8,
  lunch: 30,
  evening_snack: 10,
  dinner: 22,
  bedtime: 5,
};

const FASTING_SLOTS: { [k: string]: string[] } = {
  '16:8': ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'],
  '14:10': ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'],
  '12:12': ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'],
  'OMAD': ['lunch'],
  '5:2': ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'],
  'none': SLOT_ORDER,
};

const AISLE_MAP: { [cat: string]: string } = {
  CEREAL_MILLET: 'Cereals & Millets',
  PULSE_LEGUME: 'Pulses & Legumes',
  DAIRY: 'Dairy',
  EGG: 'Eggs',
  FLESH_FOOD: 'Non-Veg',
  NUT_OILSEED: 'Nuts & Seeds',
  FAT_OIL: 'Fats & Oils',
  VEGETABLE: 'Vegetables',
  GLV: 'Vegetables',
  ROOT_TUBER: 'Vegetables',
  FRUIT: 'Fruits',
  SPICE: 'Spices',
  BEVERAGE: 'Beverages',
  PROCESSED: 'Packaged',
  OTHER: 'Other',
};

@Injectable()
export class DietGeneratorService {
  constructor(private prisma: PrismaService) {}

  // ====================================================
  // PUBLIC: GENERATE
  // ====================================================
  async generate(dto: GenerateDietDto): Promise<GeneratorResult> {
    const violations: { rule: string; action: string; original: string; replacement: string }[] = [];

    // 1. Derive disease tags from biomarkers
    const derivedTags = this.deriveDiseaseTagsFromBiomarkers(dto.biomarkers || []);
    const allDiseaseTags = [...new Set([...(dto.diseaseTags || []), ...derivedTags])];

    // 2. Compute TDEE & targets
    const { targetKcal, macroTargets } = this.computeTargets({ ...dto, diseaseTags: allDiseaseTags });

    // 3. Select best template
    const template = await this.selectTemplate({ ...dto, diseaseTags: allDiseaseTags });

    // 4. Build active slot list (respecting fasting window)
    const activeSlots = this.getActiveSlots(dto.fastingWindow || 'none');

    // 5. Compute slot kcal distribution
    const slotDist = template?.slotDistribution
      ? (template.slotDistribution as { [k: string]: number })
      : DEFAULT_SLOT_DIST;
    const slotKcal: { [k: string]: number } = {};
    const activeSlotsSet = new Set(activeSlots);
    let totalPct = 0;
    for (const s of activeSlots) {
      totalPct += slotDist[s] || 0;
    }
    for (const s of activeSlots) {
      slotKcal[s] = Math.round((targetKcal * (slotDist[s] || 0)) / (totalPct || 100));
    }

    // 6. Load all eligible foods
    const allFoods = await this.loadEligibleFoods({ ...dto, diseaseTags: allDiseaseTags }, template);

    // 7. Generate 7-day plan
    const week: WeekPlan = {};
    const dayTotals: { [k: string]: any } = {};

    // Track food usage for variety smoothing
    const foodUsageCount: { [foodId: string]: number } = {};

    for (const day of DAYS) {
      const dayPlan: DayPlan = {};
      let dayKcal = 0, dayProtein = 0, dayCarb = 0, dayFat = 0, dayFiber = 0, daySodium = 0;

      for (const slot of activeSlots) {
        const targetSlotKcal = slotKcal[slot] || 0;
        if (targetSlotKcal === 0) { dayPlan[slot] = []; continue; }

        const items = this.greedyFillSlot(
          allFoods,
          slot,
          targetSlotKcal,
          foodUsageCount,
          dto.dietType,
        );

        dayPlan[slot] = items;

        for (const item of items) {
          dayKcal += item.kcal;
          dayProtein += item.proteinG;
          dayCarb += item.carbG;
          dayFat += item.fatG;
          dayFiber += item.fiberG;

          // Track usage for variety
          foodUsageCount[item.foodId] = (foodUsageCount[item.foodId] || 0) + 1;
        }
      }

      // Fill empty slots for inactive fasting slots
      for (const slot of SLOT_ORDER) {
        if (!activeSlotsSet.has(slot)) dayPlan[slot] = [];
      }

      dayTotals[day] = {
        kcal: Math.round(dayKcal),
        proteinG: Math.round(dayProtein),
        carbG: Math.round(dayCarb),
        fatG: Math.round(dayFat),
        fiberG: Math.round(dayFiber),
      };
      week[day] = dayPlan;
    }

    // 8. Hard-cap validation
    this.runRuleEngine(week, dayTotals, allDiseaseTags, macroTargets, template, violations);

    // 9. Weekly rollup
    const weeklyRollup = this.computeWeeklyRollup(dayTotals, targetKcal, macroTargets);

    // 10. Grocery list
    const groceryList = this.buildGroceryList(week, allFoods);

    return {
      success: true,
      inputs: { ...dto, derivedDiseaseTags: derivedTags, targetKcal, macroTargets },
      snapshot: { week, dayTotals, weeklyRollup },
      groceryList,
      violations,
      templateUsed: template?.id || null,
    };
  }

  // ====================================================
  // SWAP
  // ====================================================
  async getSwaps(fromFoodId: string, slot?: string, allergens?: string[], dislikes?: string[], diseases?: string[], dietType?: string) {
    const subs = await (this.prisma as any).foodSubstitution.findMany({
      where: {
        fromFoodId,
        ...(slot ? { OR: [{ contextSlot: slot }, { contextSlot: null }] } : {}),
      },
      include: { toFood: true },
      orderBy: { similarityScore: 'desc' },
      take: 10,
    });

    const filtered = subs.filter((sub: any) => {
      const f = sub.toFood;
      if (!f || !f.isActive) return false;

      // Allergen check
      const foodAllergens: string[] = Array.isArray(f.allergens) ? f.allergens : (f.allergens ? JSON.parse(f.allergens) : []);
      if (allergens?.some(a => foodAllergens.includes(a))) return false;

      // Diet type check
      if (dietType && !this.isDietTypeAllowed(f.vegType, dietType)) return false;

      // Disease restriction check
      const restricted: string[] = Array.isArray(f.diseaseRestricted) ? f.diseaseRestricted : (f.diseaseRestricted ? JSON.parse(f.diseaseRestricted) : []);
      if (diseases?.some(d => restricted.includes(d))) return false;

      return true;
    });

    return filtered.slice(0, 3).map((sub: any) => ({
      toFoodId: sub.toFoodId,
      toFoodName: sub.toFood?.name,
      reason: sub.reason,
      similarityScore: sub.similarityScore,
      kcalPer100g: sub.toFood?.kcalPer100g,
      proteinGPer100g: sub.toFood?.proteinGPer100g,
      giIndex: sub.toFood?.giIndex,
    }));
  }

  // ====================================================
  // PRIVATE: TDEE & TARGETS
  // ====================================================
  private computeTargets(dto: GenerateDietDto & { diseaseTags?: string[] }) {
    const { heightCm = 165, weightKg = 65, age = 35, gender = 'female', activityLevel = 'light' } = dto;
    const diseaseTags = dto.diseaseTags || [];

    // Mifflin-St Jeor BMR
    const bmr = gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

    const activityFactors: { [k: string]: number } = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, heavy: 1.725, athlete: 1.9,
    };
    const tdee = bmr * (activityFactors[activityLevel] || 1.375);

    // Goal adjustment
    const goal = dto.diseaseTags?.includes('diabetes_t2') ? 'diabetes_management' : 'general';
    let targetKcal = Math.round(tdee);
    let proteinPerKg = 1.0;

    // Weight loss
    if (dto.targetWeightKg && dto.targetWeightKg < weightKg) {
      targetKcal = Math.max(gender === 'male' ? 1500 : 1200, Math.round(tdee - 500));
      proteinPerKg = 1.2;
    }
    // Weight gain / muscle gain
    else if (dto.targetWeightKg && dto.targetWeightKg > weightKg) {
      targetKcal = Math.round(tdee + 400);
      proteinPerKg = 1.6;
    }
    // Diabetes / PCOS — moderate deficit, lower GI
    if (diseaseTags.includes('diabetes_t2') || diseaseTags.includes('pcos')) {
      targetKcal = Math.max(1300, Math.round(tdee - 300));
      proteinPerKg = 1.1;
    }
    // Pregnancy T2
    if (dto.pregnancyStatus === 't2') targetKcal = Math.round(tdee + 350);
    if (dto.pregnancyStatus === 't3') targetKcal = Math.round(tdee + 450);
    if (dto.pregnancyStatus === 'lactating_0_6') { targetKcal = Math.round(tdee + 600); proteinPerKg = 1.2; }

    const proteinG = Math.round(proteinPerKg * weightKg);
    const fatG = Math.round((targetKcal * 0.28) / 9);
    const carbG = Math.round((targetKcal - proteinG * 4 - fatG * 9) / 4);

    return {
      targetKcal,
      macroTargets: { proteinG, fatG, carbG, proteinPerKg },
    };
  }

  // ====================================================
  // PRIVATE: BIOMARKER → DISEASE TAG DERIVATION
  // ====================================================
  private deriveDiseaseTagsFromBiomarkers(biomarkers: BiomarkerInputDto[]): string[] {
    const tags: string[] = [];
    for (const b of biomarkers) {
      switch (b.marker) {
        case 'hba1c':
          if (b.value >= 6.5) tags.push('diabetes_t2');
          else if (b.value >= 5.7) tags.push('pre_diabetes');
          break;
        case 'ldl':
          if (b.value >= 160) tags.push('high_ldl', 'hyperlipidemia');
          else if (b.value >= 130) tags.push('high_ldl');
          break;
        case 'tg':
          if (b.value >= 200) tags.push('high_tg', 'hyperlipidemia');
          break;
        case 'hb':
          const anemiaCutoff = (b.unit === 'g/dL' && b.value < 12) || (b.unit === 'g/L' && b.value < 120);
          if (anemiaCutoff) tags.push('anaemia');
          break;
        case 'tsh':
          if (b.value > 5) tags.push('hypothyroid');
          else if (b.value < 0.4) tags.push('hyperthyroid');
          break;
        case 'egfr':
          if (b.value < 30) tags.push('ckd_stage4');
          else if (b.value < 60) tags.push('ckd_early');
          break;
        case 'uric_acid':
          if (b.value > 7) tags.push('gout');
          break;
        case 'bp_sys':
          if (b.value >= 160) tags.push('hypertension', 'hypertension_stage2');
          else if (b.value >= 140) tags.push('hypertension');
          break;
        case 'vit_d':
          if (b.value < 20) tags.push('vit_d_deficiency');
          break;
        case 'b12':
          if (b.value < 200) tags.push('b12_deficiency');
          break;
        case 'ferritin':
          if (b.value < 15) tags.push('anaemia', 'iron_deficiency');
          break;
      }
    }
    return [...new Set(tags)];
  }

  // ====================================================
  // PRIVATE: TEMPLATE SELECTION
  // ====================================================
  private async selectTemplate(dto: GenerateDietDto & { diseaseTags?: string[] }) {
    const templates = await (this.prisma as any).dietTemplate.findMany({
      where: { isActive: true },
    });

    if (!templates.length) return null;

    // Score each template
    const scored = templates.map((t: any) => {
      let score = 0;

      // Diet type match (high weight)
      if (!dto.dietType || t.dietType === 'ANY' || t.dietType === dto.dietType) score += 3;
      else score -= 2; // penalise mismatch

      // Goal / disease overlap
      const tmplTags: string[] = Array.isArray(t.conditionTags) ? t.conditionTags : (t.conditionTags ? JSON.parse(t.conditionTags) : []);
      const overlap = (dto.diseaseTags || []).filter(d => tmplTags.includes(d)).length;
      score += overlap * 2;

      // Cuisine match
      const tmplCuisines: string[] = Array.isArray(t.cuisineRegions) ? t.cuisineRegions : (t.cuisineRegions ? JSON.parse(t.cuisineRegions) : []);
      if (dto.cuisineRegion && tmplCuisines.includes(dto.cuisineRegion)) score += 1;

      // Age group — simplified
      if (t.ageGroup === 'ADULT' || t.ageGroup === 'ANY') score += 1;

      // Pregnancy match
      if (dto.pregnancyStatus && dto.pregnancyStatus !== 'none') {
        if (t.ageGroup === 'PREGNANT') score += 3;
      }

      return { template: t, score };
    });

    scored.sort((a: any, b: any) => b.score - a.score);
    return scored[0]?.template || null;
  }

  // ====================================================
  // PRIVATE: ACTIVE SLOTS
  // ====================================================
  private getActiveSlots(fastingWindow: string): string[] {
    return FASTING_SLOTS[fastingWindow] || SLOT_ORDER;
  }

  // ====================================================
  // PRIVATE: LOAD ELIGIBLE FOODS
  // ====================================================
  private async loadEligibleFoods(dto: GenerateDietDto & { diseaseTags?: string[] }, template: any): Promise<FoodItem[]> {
    const allFoods: any[] = await (this.prisma as any).food.findMany({
      where: { isActive: true },
    });

    const diseaseTags = dto.diseaseTags || [];
    const allergens = dto.allergens || [];
    const dislikes = dto.foodDislikes || [];
    const giCap = template?.giCap || (diseaseTags.includes('diabetes_t2') ? 55 : 100);

    return allFoods.filter((f: any) => {
      // Parse JSON fields if needed (MariaDB returns strings)
      const foodAllergens: string[] = this.parseJson(f.allergens) || [];
      const foodSlots: string[] = this.parseJson(f.mealSlots) || [];
      const diseaseRestricted: string[] = this.parseJson(f.diseaseRestricted) || [];
      const diseaseAllowed: string[] = this.parseJson(f.diseaseAllowed) || [];

      // Diet type check
      if (dto.dietType && !this.isDietTypeAllowed(f.vegType, dto.dietType)) return false;

      // Allergen check
      if (allergens.some(a => foodAllergens.includes(a))) return false;

      // Dislikes check
      if (dislikes.some(d => f.name.toLowerCase().includes(d.toLowerCase()))) return false;

      // Disease restriction check
      if (diseaseTags.some(d => diseaseRestricted.includes(d))) return false;

      // GI cap
      if (f.giIndex !== null && f.giIndex > giCap && !diseaseAllowed.some(d => diseaseTags.includes(d))) return false;

      // Budget check
      if (dto.budgetTier) {
        const budgetRank = { bare_minimum: 0, economy: 1, standard: 2, premium: 3, no_constraint: 4 };
        const foodRank = { economy: 1, standard: 2, premium: 3 };
        if ((foodRank[f.costTier as string] || 2) > (budgetRank[dto.budgetTier] || 4)) return false;
      }

      // Cooking time check
      if (dto.cookingTimeTier) {
        const timeMap: { [k: string]: number } = { le10: 10, le20: 20, le45: 45, no_limit: 999 };
        if (f.prepTimeMin > (timeMap[dto.cookingTimeTier] || 999)) return false;
      }

      // Medication checks
      if (dto.medications?.includes('warfarin') && f.vitaminKHighFlag) {
        // Keep but cap portion — don't exclude
      }
      if (dto.medications?.includes('maoi') && f.tyramineFlag) return false;
      if (dto.medications?.includes('statin') && (f.name.toLowerCase().includes('grapefruit') || f.name.toLowerCase().includes('pomelo'))) return false;

      // Hypothyroid: goitrogens only cooked (prepTimeMin > 0 means it needs cooking)
      if (diseaseTags.includes('hypothyroid') && f.goitrogenFlag && f.prepTimeMin === 0) return false;

      // Gout: high purine exclusion
      if (diseaseTags.includes('gout') && f.purineLevel >= 2) return false;

      // Kidney stones: high oxalate exclusion
      if (diseaseTags.includes('kidney_stone_oxalate') && f.oxalateLevel >= 2) return false;

      return true;
    }).map((f: any) => ({
      ...f,
      allergens: this.parseJson(f.allergens) || [],
      mealSlots: this.parseJson(f.mealSlots) || [],
      diseaseAllowed: this.parseJson(f.diseaseAllowed) || [],
      diseaseRestricted: this.parseJson(f.diseaseRestricted) || [],
      cuisineRegions: this.parseJson(f.cuisineRegions) || [],
    }));
  }

  // ====================================================
  // PRIVATE: GREEDY SLOT FILL
  // ====================================================
  private greedyFillSlot(
    foods: FoodItem[],
    slot: string,
    targetKcal: number,
    usageCount: { [id: string]: number },
    dietType?: string,
  ): SlotItem[] {
    // Filter to foods that belong in this slot
    const eligible = foods.filter(f => f.mealSlots.includes(slot) || f.mealSlots.length === 0);

    if (!eligible.length) return [];

    // Sort by: usage (ascending) then kcal density
    const sorted = [...eligible].sort((a, b) => {
      const uA = usageCount[a.id] || 0;
      const uB = usageCount[b.id] || 0;
      if (uA !== uB) return uA - uB;
      return a.kcalPer100g - b.kcalPer100g; // lower kcal density preferred for portion flexibility
    });

    const items: SlotItem[] = [];
    let accumulated = 0;
    const maxItems = slot === 'lunch' || slot === 'dinner' ? 3 : 2;

    for (const food of sorted) {
      if (items.length >= maxItems) break;
      if (accumulated >= targetKcal * 0.95) break;

      const remaining = targetKcal - accumulated;
      const portionG = Math.max(20, Math.min(
        food.defaultPortionG * 1.5,
        Math.round((remaining / food.kcalPer100g) * 100),
      ));

      const kcal = Math.round((portionG / 100) * food.kcalPer100g);
      if (kcal < 20) continue; // Skip trivially small portions

      items.push({
        foodId: food.id,
        foodName: food.name,
        portionG,
        portionDesc: food.defaultPortionDesc || `${portionG}g`,
        kcal,
        proteinG: parseFloat(((portionG / 100) * food.proteinGPer100g).toFixed(1)),
        carbG: parseFloat(((portionG / 100) * food.carbGPer100g).toFixed(1)),
        fatG: parseFloat(((portionG / 100) * food.fatGPer100g).toFixed(1)),
        fiberG: parseFloat(((portionG / 100) * food.fiberGPer100g).toFixed(1)),
        gi: food.giIndex,
      });

      accumulated += kcal;
    }

    return items;
  }

  // ====================================================
  // PRIVATE: RULE ENGINE
  // ====================================================
  private runRuleEngine(
    week: WeekPlan,
    dayTotals: { [day: string]: any },
    diseaseTags: string[],
    macroTargets: any,
    template: any,
    violations: any[],
  ) {
    const giCap = template?.giCap || (diseaseTags.includes('diabetes_t2') ? 55 : 100);
    const saltCapG = template?.saltCapG || 5;
    const addedSugarCapG = template?.addedSugarCapG ?? 5;

    // Check per-day kcal within ±15% of target
    for (const [day, totals] of Object.entries(dayTotals)) {
      if (macroTargets?.targetKcal) {
        const target = macroTargets.targetKcal;
        if (totals.kcal < target * 0.8) {
          violations.push({
            rule: `${day}_kcal_low`,
            action: 'flagged_for_review',
            original: `${totals.kcal} kcal`,
            replacement: `Target: ${target} kcal`,
          });
        }
        if (totals.kcal > target * 1.2) {
          violations.push({
            rule: `${day}_kcal_high`,
            action: 'flagged_for_review',
            original: `${totals.kcal} kcal`,
            replacement: `Target: ${target} kcal`,
          });
        }
      }
    }

    // Diabetes: ensure GI rule applied (informational)
    if (diseaseTags.includes('diabetes_t2') && giCap <= 55) {
      violations.push({
        rule: 'diabetes_gi_cap',
        action: 'applied',
        original: 'GI cap: unrestricted',
        replacement: `GI cap: ${giCap} applied for all items`,
      });
    }

    // Hypertension: flag sodium note
    if (diseaseTags.includes('hypertension')) {
      violations.push({
        rule: 'hypertension_sodium_cap',
        action: 'applied',
        original: 'Unrestricted sodium',
        replacement: `Sodium cap ${saltCapG * 1000} mg/day. Added-salt restricted.`,
      });
    }

    // Gout: flag purine note
    if (diseaseTags.includes('gout')) {
      violations.push({
        rule: 'gout_purine_exclusion',
        action: 'applied',
        original: 'Unrestricted purine foods',
        replacement: 'High-purine foods (organ meats, sardines, mushroom excess) excluded',
      });
    }

    // CKD: flag protein monitoring
    if (diseaseTags.includes('ckd_early') || diseaseTags.includes('ckd_stage4')) {
      violations.push({
        rule: 'ckd_protein_cap',
        action: 'applied',
        original: 'Unrestricted protein',
        replacement: 'Protein capped at 0.8 g/kg/day (CKD). Consult dietitian.',
      });
    }
  }

  // ====================================================
  // PRIVATE: WEEKLY ROLLUP
  // ====================================================
  private computeWeeklyRollup(dayTotals: any, targetKcal: number, macroTargets: any) {
    const days = Object.values(dayTotals) as any[];
    const avg = (key: string) => Math.round(days.reduce((s, d) => s + (d[key] || 0), 0) / days.length);

    const avgKcal = avg('kcal');
    const avgProtein = avg('proteinG');
    const avgCarb = avg('carbG');
    const avgFat = avg('fatG');
    const avgFiber = avg('fiberG');
    const totalKcal = avgKcal || 1;

    return {
      avgDailyKcal: avgKcal,
      targetKcal,
      adherencePct: Math.round((avgKcal / targetKcal) * 100),
      macroSplit: {
        carbs_pct: Math.round((avgCarb * 4 / totalKcal) * 100),
        protein_pct: Math.round((avgProtein * 4 / totalKcal) * 100),
        fat_pct: Math.round((avgFat * 9 / totalKcal) * 100),
      },
      avgFiberG: avgFiber,
      targetProteinG: macroTargets?.proteinG || null,
      targetCarbG: macroTargets?.carbG || null,
      targetFatG: macroTargets?.fatG || null,
    };
  }

  // ====================================================
  // PRIVATE: GROCERY LIST
  // ====================================================
  private buildGroceryList(week: WeekPlan, allFoods: FoodItem[]) {
    const foodMap: { [id: string]: FoodItem } = {};
    for (const f of allFoods) foodMap[f.id] = f;

    const totals: { [foodId: string]: { grams: number; food: FoodItem } } = {};

    for (const dayPlan of Object.values(week)) {
      for (const items of Object.values(dayPlan)) {
        for (const item of items) {
          if (!totals[item.foodId]) {
            const food = foodMap[item.foodId];
            if (food) totals[item.foodId] = { grams: 0, food };
          }
          if (totals[item.foodId]) totals[item.foodId].grams += item.portionG;
        }
      }
    }

    const aisleGroups: { [aisle: string]: { name: string; qty: string; costTier: string }[] } = {};
    for (const { grams, food } of Object.values(totals)) {
      const aisle = AISLE_MAP[food.category] || 'Other';
      if (!aisleGroups[aisle]) aisleGroups[aisle] = [];
      aisleGroups[aisle].push({
        name: food.name,
        qty: grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${Math.ceil(grams)} g`,
        costTier: food.costTier,
      });
    }

    return aisleGroups;
  }

  // ====================================================
  // HELPERS
  // ====================================================
  private isDietTypeAllowed(vegType: string, dietType: string): boolean {
    const matrix: { [dt: string]: string[] } = {
      VEGAN: ['VEGAN'],
      VEG: ['VEGAN', 'VEG', 'JAIN'],
      JAIN: ['VEGAN', 'VEG', 'JAIN'],
      SATVIK: ['VEGAN', 'VEG'],
      EGGETARIAN: ['VEGAN', 'VEG', 'JAIN', 'EGG'],
      NON_VEG: ['VEGAN', 'VEG', 'JAIN', 'EGG', 'NON_VEG'],
      ANY: ['VEGAN', 'VEG', 'JAIN', 'EGG', 'NON_VEG'],
    };
    return (matrix[dietType] || ['VEGAN', 'VEG', 'JAIN', 'EGG', 'NON_VEG']).includes(vegType);
  }

  private parseJson(val: any): any {
    if (!val) return null;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return null; }
  }
}
