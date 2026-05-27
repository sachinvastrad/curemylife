# DrMan.ai — Diet Chart Generator (Final PRD)

**Module name:** Diet Chart Generator (DCG)
**Document:** `clinicman/doc/final_diet.md` (final, supersedes `diet_req.md` and `ref_diet_prd.md`)
**Owner:** Product Owner — Sachin
**Date:** 2026-05-21 · **Status:** Approved for build

> Reads / consolidates:
> - `clinicman/doc/diet_req.md` (v1 module PRD — template library scope)
> - `clinicman/doc/ref_diet_prd.md` (vision brief — AI nutrition platform)
> - `clinicman/doc/DietaryGuidelinesforNINwebsite.pdf` (NIN 15 guidelines + Annexures 1–15, including GI table and RDA)
> - `~/.claude/.../memory/prd_diet_module.md` (prior decisions captured in auto-memory)
> - Live Prisma schema at `clinicman/web/prisma/schema.prisma`
> - Existing UI at `web/src/app/(dashboard)/visits/[visitId]/diet-chart/page.tsx` and print page at `web/src/app/(print)/visits/[visitId]/diet-chart/print/page.tsx`

---

## 1. Vision

> *"The best 7-day Indian diet chart, generated in under 10 seconds — clinically grounded in NIN guidelines, personalised by patient, integrated into the visit flow, and delivered to the patient's WhatsApp as a printable PDF."*

DCG is the **rule + data + (optional) LLM** engine that turns a structured patient profile into a 7-day personalised meal plan with nutrition totals, GI index, food-exchange substitutions, do's & don'ts, hydration target, and a grocery list. It replaces the existing `customContent: TEXT` free-form chart with a generated, structured, auditable artefact that is still 1-line editable by the doctor.



---

## 2. Why now — the gap we are closing

| Today (v0) | After DCG (v1) |
|---|---|
| `DietTemplate.content` is a single `TEXT` blob | Structured 7-day plan with per-slot food items + nutrition totals |
| No nutritional reasoning — copy-paste templates | Generator targets kcal/macros/salt/sugar/GI based on patient profile |
| No personalisation beyond doctor-typed notes | Allergies, dislikes, fasting days, region, budget, condition tags all flow in |
| Print is one page of free text | Print is structured 7-day grid + macro/GI summary + grocery list |
| No food DB | Foods, recipes, substitutions, GI all live in a queryable DB |
| Doctor takes 3–5 min per chart | Doctor reviews/edits a generated chart in < 60 s |

---

## 3. Goals & Success Metrics

| Goal | KPI | Target (Month 3 post-launch) |
|---|---|---|
| Coverage | % visits with a diet chart attached | ≥ 75% (baseline ~10%) |
| Speed | Median time from "Generate" click to saved chart | < 60 s incl. doctor edit |
| Trust | % charts where doctor saved without editing meal items | 40–70% (healthy band; too high = unsafe, too low = generator weak) |
| Personalisation depth | % charts that respect ≥ 1 patient field (allergy/region/condition) | 100% |
| Delivery | % charts sent via WhatsApp or printed within 24 h of save | ≥ 90% |
| Clinical alignment | % charts whose macros/GI fall within rule-engine bounds | 100% (enforced at generation) |
| Engine breadth | Distinct meal items appearing across 100 random charts | ≥ 80 (variety check) |
| Data foundation | Foods in DB / Recipes / Substitutions / Templates | ≥ 500 / ≥ 200 / ≥ 1000 / ≥ 60 |

---

## 4. Users & Roles

| Role | What they do in DCG | Where in clinicman |
|---|---|---|
| **Doctor (Dr. Rachana)** | Opens visit → clicks "Generate Diet Chart" → reviews → tweaks 1–2 items → saves → sends | `dashboard/visits/[visitId]/diet-chart` |
| **Receptionist (Reema)** | Sends/reprints saved chart to patient via WhatsApp | Patient visits list row action |
| **Admin (Vikram)** | Clones global templates to clinic, edits the food DB visibility, sees per-doctor diet-chart issuance rate | `dashboard/diet-templates`, `dashboard/foods`, `dashboard/reports` |
| **Nutrition curator (internal seed role)** | Maintains `foods`, `recipes`, `food_substitutions` seed JSON committed to repo | `prisma/seed-data/diet/*.json` |
| **Patient (Priyanka)** | Receives a one-page PDF on WhatsApp; can view a HTML mirror via a tokenised public link (v1.1) | WhatsApp delivery |

---

## 5. Scope

### 5.1 In Scope — v1.0
1. **Food / Recipe / Substitution database** (seeded from NIN + IFCT 2017 + clinic-curated content).
2. **Diet template library** (≥ 60 templates) carrying targets + slot scaffolds, not literal meals.
3. **Generator** that emits a 7-day plan from `(template, patient profile, overrides)`.
4. **Inputs UI** (patient-aware form) and **Output UI** (editable 7-day grid).
5. **Nutrition + GI summary** per day and per week.
6. **Grocery list** auto-derived from the plan.
7. **Print PDF** (extends current print page) and **WhatsApp send** (uses existing module).
8. **Smart-swap** ("don't like paneer → tofu/chicken/curd") — rule-based in v1.0.
9. **Rule engine** (Diabetes/HTN/CKD/WL/WG — §10) enforced as hard caps on generator output.
10. **Audit fields** (`snapshot`, `version`, `whatsappSentAt`) for compliance.

### 5.2 v1.1 (next quarter)
- LLM-assisted regionalisation ("rewrite this week in Karnataka style").
- Budget optimiser (`₹100/day`, `₹300/day`, `premium`).
- Multi-language render (English + Hindi + Kannada).
- Patient HTML preview link (tokenised, no login).
- Adherence check-ins via WhatsApp ("did you follow yesterday's plan?").

### 5.3 v2.0 (future)
- CGM data feedback → next plan adjusts GI/carbs automatically.
- Wearable (HRV/steps) → activity factor auto-update.
- LLM recipe generator from food embeddings.
- Patient-side mobile app.

### 5.4 Explicitly Out of Scope
- Renal-failure / dialysis / oncology / parenteral diets — flag and route to a dietitian.
- Recipe step-by-step videos.
- Barcode scanning, restaurant menu lookup.
- Calorie-tracker for patients (this is a chart, not a tracker).

---

## 6. Inputs — what the generator accepts

> **Personalisation is the product.** From `ref_diet_prd.md`: *"The winning factor is NOT calories — it is adherence + personalization + Indianization."* This section defines every signal the generator can consume. All inputs are auto-prefilled from `Patient` + `Visit` + latest lab/case-history where possible; the doctor confirms / overrides on a single screen with progressive disclosure (only required fields visible by default; the rest collapsed under "More personalisation").

### 6.0 Input taxonomy (15 groups)
| # | Group | Required for v1.0 | Drives |
|---|---|---|---|
| 1 | Demographics & biometrics | ✅ | Calorie & macro solver |
| 2 | Anthropometry (extended) | optional | BMI band, waist-hip risk, body-comp goals |
| 3 | Activity & occupation | ✅ | TDEE activity factor |
| 4 | Diet preference & ethics | ✅ | Hard food filter |
| 5 | Religion / culture / fasting | optional | Slot rules, fasting-day swaps |
| 6 | Allergens & intolerances | ✅ if any | Hard exclusion |
| 7 | Likes / dislikes / texture | optional | Soft scoring + swap suggestions |
| 8 | Region & cuisine | ✅ | Recipe + cuisine variant filter |
| 9 | Goal (primary) | ✅ | Target solver + template ranking |
| 10 | Disease & condition tags | optional but high-value | Rule engine + GI/Na/K caps |
| 11 | Severity / stage / biomarkers | optional | Rule strictness + supplement hints |
| 12 | Medications & supplements | optional | Drug-nutrient interaction warnings |
| 13 | Lifestyle (sleep / stress / hydration / substances) | optional | Soft adjustments + lifestyle notes |
| 14 | Cooking environment & schedule | optional | Recipe complexity filter |
| 15 | Budget & seasonality | optional | Cost tier + seasonal food preference |

### 6.1 Demographics & Biometrics (required)
| Field | Source | Notes |
|---|---|---|
| **Age (years + months)** | `Patient.dateOfBirth` | Age band derived: `Infant 0–11mo` · `Toddler 1–3y` · `Pre-school 4–6y` · `Child 7–9y` · `Pre-teen 10–12y` · `Teen 13–17y` · `Young adult 18–29y` · `Adult 30–49y` · `Middle-aged 50–59y` · `Elderly 60–74y` · `Old-elderly 75+` |
| **Gender** | `Patient.gender` | `Male` · `Female` · `Other / non-binary` (Mifflin chooses M/F formula based on biological sex if recorded separately) |
| **Height (cm)** | new `Patient.heightCm` | Required for BMR; infants use length-for-age WHO chart |
| **Weight (kg)** | new `Patient.currentWeightKg` (latest visit preferred) | |
| **Target weight (kg)** | optional | Triggers WL / WG calorie delta |
| **Pregnancy status** | new `Patient.pregnancyStatus` | `none` · `planning` · `T1 (0–12 wk)` · `T2 (13–28 wk)` · `T3 (29–40 wk)` · `lactating 0–6 mo` · `lactating 6–12 mo` · `post-partum 0–6 mo` |
| **Menstrual phase** | optional | `follicular` · `ovulatory` · `luteal` · `menstrual` · `perimenopausal` · `post-menopausal` — drives iron emphasis, PCOS cycle-tuned plans |

### 6.2 Anthropometry — extended (optional, unlocks deeper personalisation)
| Field | Notes |
|---|---|
| **Waist circumference (cm)** | Indian risk cut-offs: M > 90, F > 80 → flag central obesity |
| **Hip circumference (cm)** | For waist-hip ratio (PCOS marker) |
| **Body fat %** | If known from BIA / DEXA — drives MG / FL split |
| **Skeletal muscle mass (kg)** | Drives protein target for muscle preservation |
| **Visceral fat rating** | If known |
| **BMI auto-computed** | Banded as `Underweight <18.5` · `Normal 18.5–22.9` · `Overweight 23–24.9` · `Obese-I 25–29.9` · `Obese-II 30+` (Asian-Indian cut-offs) |

### 6.3 Activity & Occupation (required)
| Field | Options |
|---|---|
| **Activity level** | `Bed-rest` (factor 1.1) · `Sedentary / desk job` (1.2) · `Light` (1.375) · `Moderate` (1.55) · `Heavy / manual labour` (1.725) · `Athlete / 2x training` (1.9) |
| **Exercise type** | `None` · `Walking` · `Yoga / asana` · `Gym / weights` · `Cardio / running` · `Cycling` · `Swimming` · `Sports` (multi-select) |
| **Exercise minutes/week** | numeric — feeds protein target |
| **Occupation** | Free-text + chip pick (`Driver` · `IT / desk` · `Teacher` · `Field worker` · `Homemaker` · `Construction` · `Student` · `Retired` · `Healthcare` · `Other`) |
| **Work shift** | `Day` · `Night` · `Rotating` · `Split` — drives meal timing template |
| **Steps/day average** | optional (if from phone / wearable) |

### 6.4 Diet preference & ethical / philosophical eating (required + optional layers)
Hard filter — the generator will never violate this.

**Primary diet type (single-select):**
`Vegetarian` · `Lacto-vegetarian` · `Ovo-vegetarian` · `Eggetarian (lacto-ovo)` · `Non-vegetarian` · `Vegan` · `Pescatarian` · `Flexitarian` · `Jain (no root vegetables, no honey)` · `Sattvic (yogic — no onion/garlic/mushroom/leftovers)` · `Rajasic-tolerant` · `Macrobiotic` · `Raw vegan` · `Mediterranean-Indian` · `DASH-Indian`

**Therapeutic eating patterns (multi, additive):**
- `Low FODMAP` · `Low histamine` · `Low purine` · `Low oxalate`
- `Low GI / Low GL` · `Low carb (<130 g/day)` · `Ketogenic (<50 g carb)` · `Modified keto (Indian)`
- `High protein (>1.2 g/kg)` · `High fibre (>30 g/day)`
- `Anti-inflammatory` · `Gluten-free` · `Casein-free` · `Lactose-free` · `Nut-free`
- `Intermittent fasting` → variant: `16:8` · `14:10` · `OMAD` · `5:2` · `Alternate day`
- `Time-restricted eating window` (start / end clock)
- `Ayurvedic dosha-aligned` (see §6.5)

**Religious / cultural toggles:**
- `No onion / garlic`
- `Halal-only` · `Kosher-only` · `Sattvic-only`
- `No beef` · `No pork` · `No alcohol-cooked dishes` (mirin, wine reductions)

### 6.5 Constitutional & traditional-medicine inputs (optional but valuable in a homeopathic clinic)
| Field | Options |
|---|---|
| **Ayurvedic dosha (Prakriti)** | `Vata` · `Pitta` · `Kapha` · `Vata-Pitta` · `Pitta-Kapha` · `Vata-Kapha` · `Tridoshic` — drives warming/cooling food bias and slot timing |
| **Current dominant dosha (Vikriti)** | same options — short-term tuning |
| **Homeopathic constitutional type** | `Sulphur` · `Calc-carb` · `Phosphorus` · `Lycopodium` · `Natrum-mur` · `Pulsatilla` · `Sepia` · `Silicea` · `Nux-vom` · `Other` — soft food-affinity hints (e.g., Nat-mur tends to crave salt; chart de-emphasises salty snacks) |
| **Body type (somatotype)** | `Ectomorph` · `Mesomorph` · `Endomorph` — drives macro split |
| **Blood group** | optional (informational only — no scientific basis enforced, but some patients request it) |

### 6.6 Allergens & intolerances (hard exclusions)
**Allergens (multi-chip):** `Dairy / milk protein` · `Lactose` · `Gluten / wheat` · `Tree nuts` · `Peanut` · `Egg` · `Soy` · `Fish` · `Shellfish / crustacean` · `Sesame` · `Mustard` · `Sulphites` · `Brinjal / nightshade` · `Specific spice — chilli / pepper / clove` · `Yeast` · `Corn` · `Citrus` · `Strawberry` · `Other (free-text)`

**Intolerances (multi-chip):** `Lactose` · `Fructose` · `Histamine` · `FODMAP (general)` · `Gluten (NCGS)` · `Caffeine` · `Spicy food` · `Cold food`

**Cross-reactivity flags:** if `Latex` allergy → auto-warn against banana / avocado / kiwi.

### 6.7 Food likes / dislikes / texture preferences (soft scoring)
- **Loves:** free-text chips (boost these foods in scoring) — *"loves curd, ragi mudde, mango"*
- **Dislikes:** free-text chips (down-rank or exclude) — *"hates bitter gourd, mushroom, ladyfinger"*
- **Texture aversions:** `Slimy (okra, jackfruit)` · `Crunchy raw` · `Mushy / overcooked` · `Soggy` · `Skin-on`
- **Spice tolerance:** `Bland` · `Mild` · `Medium` · `Spicy` · `Very spicy`
- **Sweet tooth:** `Low` · `Medium` · `High` — drives dessert frequency in maintenance plans
- **Comfort foods to keep:** *"keep one chai with milk and 1 tsp sugar daily"* — generator honours within rule caps

### 6.8 Region & cuisine (multi-tier)
| Tier | Options |
|---|---|
| **Macro-region** | `North` · `South` · `East` · `West` · `North-East` · `Central` · `Pan-Indian` |
| **State** | `Karnataka` · `Tamil Nadu` · `Kerala` · `Andhra Pradesh` · `Telangana` · `Maharashtra` · `Gujarat` · `Rajasthan` · `Punjab` · `Haryana` · `Delhi` · `UP` · `Bihar` · `MP` · `West Bengal` · `Odisha` · `Assam` · `Manipur` · `Goa` · `Jammu & Kashmir` · `HP` · `Uttarakhand` |
| **Sub-regional / community** | `Coastal Karnataka` · `North Karnataka` · `Udupi-Mangalorean` · `Coorgi` · `Chettinad` · `Iyer / Iyengar` · `Konkani-Saraswat` · `Maharashtrian-CKP` · `Marwari` · `Bengali (Ghoti / Bangal)` · `Punjabi-Sikh` · `Sindhi` · `Parsi` · `Hyderabadi` · `Awadhi` · `Mughlai` · `Goan-Catholic` · `Mangalorean-Catholic` · `Anglo-Indian` · `Kashmiri-Pandit` · `Kerala-Syrian-Christian` · `Coastal-Konkani-Hindu` · `Tribal / Adivasi (regional)` |
| **Climate / locale** | `Hot-humid coastal` · `Hot-dry plains` · `Cold-mountainous` · `Temperate` — biases warming vs cooling foods |
| **Currently lives in** | City + state — drives ingredient availability filter (e.g., fresh fish in Mangalore vs Jaipur) |
| **Diaspora variant** | `NRI — Gulf` · `NRI — US/Canada` · `NRI — UK/EU` · `NRI — SEA / AU` — adjusts for available local substitutes |

### 6.9 Goal — primary (single-select) + sub-goal (optional)
**Primary goal:**
`Maintenance / general wellness` · `Weight loss (mild 0.25 kg/wk)` · `Weight loss (moderate 0.5 kg/wk)` · `Weight loss (aggressive 0.75 kg/wk, doctor-supervised)` · `Weight gain` · `Muscle gain / lean bulk` · `Body recomposition` · `Fat loss with muscle preservation` · `Diabetes T2 management` · `Pre-diabetes reversal` · `PCOS / PCOD support` · `Hypertension control` · `Hypothyroid support` · `Hyperthyroid support` · `Gut healing (IBS / GERD)` · `Liver support / NAFLD reversal` · `Kidney support (early CKD)` · `Pregnancy nutrition` · `Lactation support` · `Elderly longevity / sarcopenia prevention` · `Child growth catch-up` · `Adolescent growth & development` · `Immunity boost` · `Post-surgical recovery` · `Post-COVID recovery` · `Convalescence (fever / typhoid / dengue)` · `Sports performance` · `Pre-event cutting` · `Anti-inflammatory protocol` · `Skin health (acne / eczema / psoriasis)` · `Hair fall recovery` · `Migraine trigger-avoidance` · `Sleep improvement` · `Mood / anxiety adjunct (gut-brain)` · `Detox-friendly (no fads — gentle hepatic support)` · `Fertility (male / female)` · `Menopause comfort` · `Andropause comfort`

**Sub-goal (optional, multi):** stack secondary intents — e.g., *Primary: Weight loss · Sub: PCOS support + Skin health*. Generator weights rules by primary, then adds soft constraints from sub-goals.

**Target horizon:** `4 weeks` · `8 weeks` · `12 weeks` · `6 months` · `Ongoing` — sets reasonable calorie delta.

### 6.10 Disease & condition tags (multi — drives §10 rule engine)
**Endocrine:** `Diabetes T1` · `Diabetes T2` · `Pre-diabetes` · `Insulin resistance` · `PCOS / PCOD` · `Hypothyroid` · `Hyperthyroid` · `Hashimoto's` · `Graves'` · `Cushing's` · `Addison's` · `Adrenal fatigue (functional)`

**Cardiovascular:** `Hypertension stage 1` · `Hypertension stage 2` · `Hyperlipidemia` · `High LDL` · `High triglycerides` · `Low HDL` · `CAD / post-MI` · `Stroke recovery` · `Arrhythmia` · `Heart failure (compensated)` · `Varicose veins`

**Renal & urological:** `CKD stage 1` · `CKD stage 2` · `CKD stage 3` *(stage 4–5 → dietitian referral)* · `Kidney stones (oxalate)` · `Kidney stones (uric acid)` · `Kidney stones (calcium phosphate)` · `UTI recurrent` · `Nephrotic syndrome`

**GI & hepatic:** `IBS-D` · `IBS-C` · `IBS-M` · `GERD / acid reflux` · `Gastritis` · `Peptic ulcer` · `Functional dyspepsia` · `SIBO` · `H. pylori positive` · `Crohn's (remission)` · `Ulcerative colitis (remission)` · `Coeliac` · `NCGS` · `Lactose intolerance` · `Fatty liver (NAFLD grade 1–3)` · `Hepatitis recovered` · `Gallstones` · `Pancreatitis recovered` · `Constipation chronic` · `Diarrhoea chronic` · `Haemorrhoids`

**Musculoskeletal:** `Osteoarthritis` · `Rheumatoid arthritis` · `Osteoporosis` · `Osteopenia` · `Gout` · `Fibromyalgia` · `Lower back pain` · `Sciatica` · `Sarcopenia`

**Haematology:** `Iron-deficiency anaemia (mild / mod / severe)` · `B12 deficiency` · `Folate deficiency` · `Thalassemia minor` · `Sickle-cell trait` · `Vitamin D deficiency` · `Calcium deficiency`

**Respiratory:** `Asthma` · `COPD` · `Allergic rhinitis` · `Chronic sinusitis` · `Recurrent URTI` · `Sleep apnoea (mild)`

**Skin (homeopathy crossover):** `Eczema / atopic dermatitis` · `Psoriasis` · `Vitiligo` · `Acne vulgaris` · `Hormonal acne` · `Rosacea` · `Urticaria` · `Lichen planus` · `Seborrheic dermatitis`

**Neuro / mental:** `Migraine` · `Tension headache` · `Anxiety` · `Depression` · `Insomnia` · `Restless leg` · `Parkinson's early` · `Mild cognitive impairment`

**Auto-immune (general):** `SLE` · `MS (remission)` · `Sjögren's` · `Ankylosing spondylitis` · `Hashimoto's` (also under endocrine)

**Oncology / post-cancer:** `Cancer survivor — maintenance` *(active oncology → dietitian referral)*

**Reproductive / sexual health:** `Erectile dysfunction (functional)` · `Low libido` · `Sub-fertility` · `Endometriosis` · `Fibroids` · `Premenstrual syndrome (PMS / PMDD)` · `Menopausal symptoms`

**Paediatric specific:** `Failure to thrive` · `Iron-deficiency anaemia paediatric` · `Worm infestation recovery` · `Recurrent URTI child` · `Picky eater` · `Autism — feeding aversion` · `ADHD — sugar sensitivity` · `Childhood obesity`

**Geriatric specific:** `Dysphagia (mild)` · `Edentulous / dental issues` · `Chronic constipation elderly` · `Loneliness-related under-eating`

### 6.11 Severity / stage / biomarkers (optional — strengthens rule engine)
**Recent lab values** (auto-pulled from `patient_documents` if uploaded, else manual entry):
| Marker | Drives |
|---|---|
| HbA1c (%) | Diabetes severity → GI cap (≥ 7.5 → cap 50, < 6.5 → cap 60) |
| FBS / PPBS | Same as above |
| Total cholesterol / LDL / HDL / TG | Hyperlipidemia rule strictness; sat-fat cap |
| TSH / T3 / T4 | Thyroid template variant; goitrogen-food caution |
| Hb (g/dL) | Anaemia severity → iron emphasis |
| Ferritin | Iron load (high = no fortified, low = double iron) |
| Serum B12 / Vit D / Calcium | Supplement-hint trigger |
| Creatinine / eGFR | CKD staging |
| Serum K+ / Na+ | CKD K+ cap, HTN Na+ cap |
| Uric acid | Gout purine list strictness |
| hsCRP | Anti-inflammatory weighting |
| AST / ALT | Fatty liver strictness |
| Vitamin B12 | B12-rich emphasis or supplement note |
| Iron studies | Iron-rich + pairing with Vit-C |
| 25-OH Vit D | Sun + dietary D + supplement note |

**Blood pressure (latest reading)** — HTN stage classification.
**Random blood sugar** — sanity check.

### 6.12 Medications & supplements (optional — triggers interaction warnings)
**Current medications (multi-select chip + free-text):**
- `Metformin` → flag B12 monitoring
- `Warfarin / anti-coagulant` → cap vitamin-K green leafy variability
- `MAOIs` → flag tyramine foods (aged cheese, fermented)
- `Levothyroxine` → 1-hr gap from soy / calcium / coffee
- `Statins` → no grapefruit
- `Lithium` → consistent sodium intake
- `SSRI` → no St John's Wort (supplement check)
- `Antacids / PPI` → B12 + magnesium monitoring
- `Steroids` → low sodium + high calcium + low simple carb
- `Diuretics` → potassium emphasis (unless K-sparing)
- `Iron supplement` → no calcium / tea-coffee at same meal
- `Insulin / sulphonylureas` → consistent carb timing across days

**Current supplements:** `Multivitamin` · `Vit D3` · `B-complex` · `Calcium` · `Iron` · `Omega-3` · `Probiotic` · `Magnesium` · `Whey protein` · `Soy protein` · `Plant protein blend` · `Creatine` · `Ashwagandha` · `Triphala` · `Spirulina` · `Other` — informational; generator avoids double-dosing.

### 6.13 Lifestyle factors (soft adjustments)
| Field | Options |
|---|---|
| **Sleep average** | hours/night + quality (`Poor` · `Fair` · `Good`) |
| **Sleep window** | bedtime / wake time — drives bedtime slot timing |
| **Stress level** | `Low` · `Moderate` · `High` · `Burnout` — boosts magnesium-rich, B-vitamin foods |
| **Current water intake** | litres/day — sets gap to target |
| **Caffeine** | `None` · `1–2 cups/day` · `3–5` · `6+` — caps if HTN / GERD |
| **Alcohol** | `None` · `Occasional` · `Weekly` · `Daily` — calorie offset + liver flag |
| **Tobacco / smoking** | `None` · `Occasional` · `Daily` — boosts anti-oxidants |
| **Eating speed** | `Fast` · `Normal` · `Slow` — drives portion advice |
| **Bowel habit** | frequency / day + Bristol stool type — IBS-D vs IBS-C tuning |
| **Eating-out frequency** | `0` · `1–2/wk` · `3–5/wk` · `Daily` — generator inserts eat-out swap hints |
| **Snacking pattern** | `None` · `Mindful` · `Frequent / boredom` — frequency cap |

### 6.14 Cooking environment & schedule (drives recipe filter)
| Field | Options |
|---|---|
| **Who cooks** | `Self` · `Spouse / partner` · `Parent / family` · `Cook / maid` · `Hostel / mess` · `Restaurants / Zomato-Swiggy` |
| **Equipment available** | `Pressure cooker` · `Mixer-grinder` · `Microwave` · `OTG / oven` · `Air fryer` · `Induction / gas` · `Blender` · `Steamer` · `Idli pot` · `Dosa tava` · `Tandoor` |
| **Cooking time per meal** | `≤ 10 min` · `≤ 20 min` · `≤ 45 min` · `Elaborate (>45 min)` — filters `recipes.prep_time_min` |
| **Meal prep style** | `Cook fresh every meal` · `Batch cook weekly` · `Hybrid` — drives leftover-safe recipes |
| **Family meal sharing** | `Solo` · `Couple` · `Family of 3–4` · `Joint family 5+` — affects portion scaling note |
| **Travel days/month** | numeric — generator inserts portable / travel-friendly options on those slots |

### 6.15 Budget & seasonality
| Field | Options |
|---|---|
| **Budget tier** | `Bare minimum (≤ ₹80/day)` · `Economy (₹80–150/day)` · `Standard (₹150–300/day)` · `Premium (₹300–600/day)` · `No constraint (₹600+/day)` |
| **Currency** | INR default; v2.0 may extend for NRI plans |
| **Local market availability** | `Tier-1 metro (everything available)` · `Tier-2 city` · `Town` · `Rural / village` — caps exotic ingredients |
| **Seasonality preference** | `Strictly seasonal` · `Prefer seasonal` · `No preference` — feeds `foods.seasonality` filter |
| **Festival / event in next 7 days** | optional — generator can include festival-permissible variant for that day |

### 6.16 Patient overrides — post-generation (interactive)
- **Per-cell swap:** click any food item → top 3 substitutes from `food_substitutions`
- **Per-day actions:** `Skip this day & repeat Day 1` · `Regenerate this day only (different seed)` · `Mark as cheat day`
- **Per-slot actions:** `Make this slot lighter` · `Make this slot vegetarian for today` · `Move this slot 30 min earlier/later`
- **Whole-week actions:** `Regenerate week (different seed)` · `Swap cuisine to <region>` · `Lower budget tier` · `Add intermittent fasting 16:8`
- **Free-text note:** doctor can append a 1-line note to any slot or day (renders on the PDF)
- **Lock & unlock:** doctor can `lock` a cell so future regenerations don't change it

### 6.17 Personalisation depth matrix (how inputs combine into outputs)
| Combination of inputs | Generator behaviour |
|---|---|
| Age + Gender + Activity + H/W | Mifflin-St Jeor TDEE — *every plan starts here* |
| + Goal | Calorie delta + macro split |
| + Diet preference | Hard food filter (no animal foods for vegan, etc.) |
| + Region + Sub-region | Recipe & spice palette filter |
| + Cooking time + Equipment | Recipe complexity cap |
| + Budget + Locale | Ingredient cost tier cap |
| + Allergens + Intolerances | Hard exclusion |
| + Dislikes + Texture | Soft score penalty + variety boost |
| + Disease tags | Rule engine (§10) hard caps |
| + Biomarkers | Rule strictness modulation (e.g., HbA1c 8.5 → tighter GI cap than 6.8) |
| + Medications | Interaction warning chips + lifestyle notes |
| + Ayurvedic dosha + Homeo type | Soft food-affinity bias (warming/cooling, salt-craving suppression) |
| + Lifestyle (sleep / stress / hydration) | Lifestyle notes + magnesium/B-vit emphasis |
| + Menstrual phase / Pregnancy | Iron / folate / calorie + 350/+450 emphasis by phase |
| + Festival / fasting day | Day-specific meal variant |

> **Default behaviour:** any input left blank uses a safe default; the generator never refuses to produce a chart just because optional fields are missing. Missing high-value inputs (e.g., HbA1c for a diabetic) surface as **soft warnings** in the output ("Add HbA1c for tighter GI tuning") — they don't block.

### 6.18 Source-of-truth & auto-fill behaviour
| Input | Auto-filled from | Editable in this screen? |
|---|---|---|
| Age / Gender / Phone | `Patient` row | No (edit on Patient page) |
| Height / Weight / Waist | `Patient` extended fields or latest visit measurement | Yes (writes back) |
| Activity / Diet type / Region / Allergens / Dislikes | `Patient` extended fields | Yes (writes back) |
| Disease tags | Auto-extracted from `case_history` + `visit.diagnosis` | Yes (this generation only) |
| Biomarkers | Pulled from `patient_documents` (parsed lab uploads) + manual chips | Yes (this generation only) |
| Medications / Supplements | `prescription` history + current visit's `Rx` | Yes |
| Lifestyle, cooking, budget | `Patient` extended fields | Yes (writes back) |

Doctor edits persist back to the Patient profile only when explicitly toggled via "Save these to patient profile" — otherwise the change is scoped to this generation only.

---

## 7. Outputs — what we generate

### 7.1 Headline summary card
```
Patient: Priyanka G. — F, 31y, 64 kg, 161 cm
Goal: PCOS support · Diet: Veg · Region: Karnataka · Fasting: Mon
Daily target: 1500 kcal · 90 g protein · 180 g carb · 50 g fat · GI cap 55
```

### 7.2 7-Day Meal Grid (the core artefact)
A 7-row × 7-slot grid (Mon–Sun × Early-morning → Bedtime).
Each cell holds an ordered list of food items with computed nutrition.

Slot definition (from NIN Annexure 2a + ref PRD §7):
```
early_morning · breakfast · mid_morning · lunch · evening_snack · dinner · bedtime
```

Each item is: `{ food_id, name, qty, unit, kcal, protein_g, carb_g, fat_g, fiber_g, gi, notes? }`.

### 7.3 Per-day rollup
- Totals: kcal · protein · carbs · fat · fiber · added sugar · sodium · est. cost ₹
- Daily Glycemic Load (sum of `(carbs_per_serving × GI) / 100`)
- Hydration target (default 2.5 L; lower for CKD, higher for athlete / lactating)
- Adherence checkbox row (for patient when printed)

### 7.4 Weekly rollup
- Avg daily kcal vs target (% adherence)
- Macro split pie (carbs/protein/fat %)
- Distinct foods count (variety health-check)
- Top 5 micronutrients met / Top 5 risks (e.g., "B12 low — supplement advised")

### 7.5 Do's & Don'ts (template + condition-derived)
- Allowed foods list (chips)
- Avoid foods list (chips, with reason tooltip)
- Lifestyle notes (e.g., "30-min walk after dinner", "no fruit after sunset for PCOS")

### 7.6 Grocery List (auto)
- Aggregated raw ingredient quantities for the week
- Grouped by aisle: Cereals/Millets · Pulses · Dairy · Vegetables · Fruits · Spices · Oils · Non-veg · Other
- Optional ₹ estimate per item (from `foods.unit_cost`)

### 7.7 Substitution notes
- "Don't like paneer? Swap with tofu (same protein) or curd (same calcium)."
- Auto-emitted from `food_substitutions` table for any item flagged in `dislikes`.

### 7.8 Footer (compliance)
> *"This diet chart is a clinical recommendation by Dr. <Name>, Sachi Homeopathic Clinic. It is not a substitute for emergency medical care. For changes consult your doctor."*

### 7.9 Print PDF
Existing print page (`(print)/visits/[visitId]/diet-chart/print`) extended:
- Page 1: header + headline summary + day-by-day grid (Mon–Wed)
- Page 2: Thu–Sun + weekly rollup + do's/don'ts + grocery list + footer
- Target: **2 A4 pages** max for 7-day plans (relaxed from v1's 1-page constraint — 7-day grid requires it).

### 7.10 WhatsApp delivery
- Caption: `"<Patient Name> — 7-Day Diet Plan (<Goal>, <Diet type>, <Cuisine>)"`
- Attachment: PDF; alt-text includes summary line.
- (v1.1) Public tokenised HTML link for mobile-friendly view.

---

## 8. The Generator — algorithm

### 8.1 Pipeline (deterministic core; LLM optional in v1.1)
```
Input bundle ──► (1) Calorie & macro target solver
              ──► (2) Template selection (rule-based ranking)
              ──► (3) Slot calorie split (NIN distribution)
              ──► (4) Per-slot candidate pool filter
              ──► (5) Item selection (rotation + variety scoring)
              ──► (6) Rule-engine validation (hard caps)
              ──► (7) Substitutions applied
              ──► (8) Variety / repetition smoothing across 7 days
              ──► (9) Grocery aggregation
              ──► Output bundle
```

### 8.2 Step 1 — Calorie target (Mifflin-St Jeor)
```
BMR = 10*kg + 6.25*cm − 5*age + (5 if male else −161)
TDEE = BMR × activity_factor
       Sedentary 1.2 · Light 1.375 · Moderate 1.55 · Heavy 1.725 · Athlete 1.9
Goal adjustment:
  WL  = TDEE − 500     (min 1200 F / 1500 M, safety floor)
  WG  = TDEE + 500
  MG  = TDEE + 300, protein ≥ 1.6 g/kg
  PCOS / Diabetes T2 = TDEE − 300, GI cap 55
  CKD (early)        = protein 0.8 g/kg/day cap, K+ tracked
  Pregnancy T2/T3    = TDEE + 300 / + 450, protein +25 g
  Lactation 0–6 mo   = TDEE + 600, protein +25 g
  Elderly            = TDEE × 0.95, protein 1.0–1.2 g/kg
```

Source: Mifflin-St Jeor 1990; NIN RDA 2020 protein recommendations.

### 8.3 Step 2 — Template selection ranking
For each `diet_template` matching the (diet_type, age_group, goal/disease) filter, compute:
```
score = 3*goal_match + 2*disease_overlap + 1*cuisine_match
        + 1*age_match + 0.5*region_match − penalty(used_in_last_3_visits)
```
Take top-1 (configurable) as the **scaffold**. The scaffold defines slot proportions and recommended food *groups* (not exact foods).

### 8.4 Step 3 — Slot calorie split (default; tunable per template)
| Slot | % of daily kcal |
|---|---|
| Early morning | 3% |
| Breakfast | 22% |
| Mid-morning snack | 8% |
| Lunch | 30% |
| Evening snack | 10% |
| Dinner | 22% |
| Bedtime | 5% |

Sums to 100%. Diabetes templates flatten the curve (no slot > 25%) to avoid spikes.

### 8.5 Step 4 — Candidate pool
For each slot, build a candidate pool of `foods` (and `recipes`) that:
- Match the slot's allowed `food_groups` (e.g., breakfast = cereals + dairy + fruit)
- Pass `diet_type` filter (no flesh foods for veg, etc.)
- Are NOT in patient's `allergens` or `dislikes`
- Have `gi ≤ template.gi_cap` if a cap exists
- Have `disease_restricted` array NOT intersecting patient's `disease_tags`
- Match `cuisine_region` if filter ≥ 1 (else pan-Indian fallback)
- Match `cost_tier ≤ budget_tier` if budget filter set
- Have `seasonality` matching current month (soft; lowers score, doesn't exclude)

### 8.6 Step 5 — Item selection
- Greedy fill per slot to hit slot kcal ± 10%.
- Variety constraint: a food cannot repeat in the same slot within 7 days more than `slot.max_repeat` (default 2).
- Macro nudge: if running protein deficit at day-end, prefer high-protein items in remaining slots.
- Cultural plausibility: chapati pairs with sabzi+dal; dosa pairs with sambar/chutney — encoded as `recipes.must_pair_with[]`.

### 8.7 Step 6 — Rule-engine validation (hard caps; §10)
After draft, validate; if any cap is violated, swap the offending item via the cheapest fix from `food_substitutions`. Re-validate. Max 3 iterations; if still failing, fall back to scaffold defaults and **flag for doctor review**.

### 8.8 Step 7 — Smart swap
On user click "swap" against any item, generator queries `food_substitutions(source_food=X, context=slot, diet_type, disease_tags)` and returns top 3 ranked by `nutrition_similarity_score`.

### 8.9 Step 8 — Variety smoothing
Run a final pass to ensure no two consecutive days share more than 60% of items; if violated, rotate items between days.

### 8.10 LLM augmentation (v1.1, opt-in)
For users who enable AI mode:
- LLM is called once with the deterministic draft + patient context to **rewrite item descriptions** in chosen cuisine voice (e.g., "akki rotti with chutney" vs "rice flatbread").
- LLM **cannot** add foods missing from the DB (anti-hallucination guard).
- LLM output is diffed against the deterministic draft; macros must not drift more than 5%.

---

## 9. Data Model

### 9.1 New tables

#### 9.1.1 `foods`
```prisma
model Food {
  id                String   @id @default(uuid())
  name              String   @unique
  nameLocal         Json?    @map("name_local")            // {hi, kn, ta, bn, ...}
  category          FoodCategory                            // enum
  subCategory       String?  @map("sub_category")
  vegType           VegType                                 // VEG | EGG | NON_VEG | VEGAN | JAIN
  cuisineRegions    String[] @map("cuisine_regions")

  // Nutrition per 100g raw edible portion (IFCT-2017 sourced)
  kcal              Float
  proteinG          Float    @map("protein_g")
  carbG             Float    @map("carb_g")
  fatG              Float    @map("fat_g")
  fiberG            Float?   @map("fiber_g")
  sugarG            Float?   @map("sugar_g")
  sodiumMg          Float?   @map("sodium_mg")
  potassiumMg       Float?   @map("potassium_mg")
  calciumMg         Float?   @map("calcium_mg")
  ironMg            Float?   @map("iron_mg")
  vitaminAUg        Float?   @map("vitamin_a_ug")
  vitaminCMg        Float?   @map("vitamin_c_mg")
  vitaminDUg        Float?   @map("vitamin_d_ug")
  vitaminB12Ug      Float?   @map("vitamin_b12_ug")
  folateUg          Float?   @map("folate_ug")
  omega3G           Float?   @map("omega3_g")              // ALA from NIN Annexure 9

  gi                Int?                                    // 0–100, NIN Annexure 10 baseline
  glycemicLoadPer100g Float? @map("glycemic_load_per_100g")

  allergens         String[]                                // [dairy, gluten, nut, ...]
  fodmapLevel       String?  @map("fodmap_level")           // low | moderate | high
  diseaseAllowed    String[] @map("disease_allowed")        // tag whitelist
  diseaseRestricted String[] @map("disease_restricted")     // tag blacklist
  seasonality       String[]                                // [jan,feb,...]
  costTier          String?  @map("cost_tier")              // economy | standard | premium
  unitCostInr       Float?   @map("unit_cost_inr")          // ₹ per portion

  defaultPortionG   Float    @map("default_portion_g")      // raw grams
  defaultPortionDesc String? @map("default_portion_desc")   // "1 cup cooked"
  source            String?                                  // "IFCT-2017", "NIN-1998", "Clinic"

  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt       @map("updated_at")

  recipesAsIngredient RecipeIngredient[]
  swapsFrom           FoodSubstitution[] @relation("FromFood")
  swapsTo             FoodSubstitution[] @relation("ToFood")

  @@index([category, vegType])
  @@index([gi])
  @@map("foods")
}

enum FoodCategory {
  CEREAL_MILLET PULSE_LEGUME DAIRY EGG FLESH_FOOD
  NUT_OILSEED FAT_OIL VEGETABLE GLV ROOT_TUBER FRUIT
  SPICE BEVERAGE PROCESSED OTHER
}
enum VegType { VEG EGG NON_VEG VEGAN JAIN }
```

#### 9.1.2 `recipes`
```prisma
model Recipe {
  id            String   @id @default(uuid())
  name          String   @unique
  cuisine       String?                                     // karnataka, north_indian, ...
  mealSlots     String[] @map("meal_slots")                 // ["breakfast","dinner"]
  vegType       VegType                                     // computed: highest restriction wins
  prepTimeMin   Int      @map("prep_time_min")
  difficulty    String?                                     // easy | medium | hard

  servingsBase  Int      @default(1) @map("servings_base")
  kcalPerServing      Float  @map("kcal_per_serving")
  proteinGPerServing  Float  @map("protein_g_per_serving")
  carbGPerServing     Float  @map("carb_g_per_serving")
  fatGPerServing      Float  @map("fat_g_per_serving")
  giEstimate          Int?   @map("gi_estimate")

  instructions  String?
  mustPairWith  String[] @map("must_pair_with")             // ["sambar","chutney"]
  tags          String[]                                    // ["low-gi","high-protein"]

  ingredients   RecipeIngredient[]
  @@map("recipes")
}

model RecipeIngredient {
  id        String  @id @default(uuid())
  recipeId  String  @map("recipe_id")
  foodId    String  @map("food_id")
  qtyG      Float   @map("qty_g")                            // raw grams per servingsBase
  note      String?

  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  food   Food   @relation(fields: [foodId],   references: [id])
  @@map("recipe_ingredients")
}
```

#### 9.1.3 `food_substitutions`
```prisma
model FoodSubstitution {
  id              String  @id @default(uuid())
  fromFoodId      String  @map("from_food_id")
  toFoodId        String  @map("to_food_id")
  contextSlot     String? @map("context_slot")               // breakfast, lunch, ...
  reason          String?                                    // "lactose", "allergy", "preference"
  similarityScore Float   @default(0.7) @map("similarity_score")  // 0–1, used in ranking

  fromFood Food @relation("FromFood", fields: [fromFoodId], references: [id])
  toFood   Food @relation("ToFood",   fields: [toFoodId],   references: [id])

  @@unique([fromFoodId, toFoodId, contextSlot])
  @@map("food_substitutions")
}
```

### 9.2 Upgrades to existing tables

#### `DietTemplate` (rewrite of current freeform `content`)
```prisma
model DietTemplate {
  id                       String   @id @default(uuid())
  clinicId                 String?  @map("clinic_id")        // null = global / NIN-seeded
  name                     String
  description              String?

  // Classification (matches ref_diet_prd §2)
  dietType                 DietType
  ageGroup                 AgeGroup
  goal                     DietGoal
  conditionTags            String[] @map("condition_tags")
  cuisineRegions           String[] @map("cuisine_regions")

  // Generation targets — drive the solver
  targetKcal               Int?     @map("target_kcal")
  macroSplit               Json?    @map("macro_split")      // {carbs_pct,protein_pct,fat_pct}
  proteinPerKg             Float?   @map("protein_per_kg")
  giCap                    Int?     @map("gi_cap")           // e.g., 55 for diabetes
  saltCapG                 Float?   @map("salt_cap_g")
  addedSugarCapG           Float?   @map("added_sugar_cap_g")
  oilCapMl                 Float?   @map("oil_cap_ml")
  potassiumCapMg           Float?   @map("potassium_cap_mg") // CKD templates
  waterTargetL             Float?   @map("water_target_l")

  // Slot scaffold — % of kcal per slot (overrides default §8.4)
  slotDistribution         Json?    @map("slot_distribution")

  // Recommended food groups per slot (constrains candidate pool)
  slotFoodGroups           Json?    @map("slot_food_groups")

  // Do's & Don'ts (rendered verbatim)
  allowedFoods             String[] @map("allowed_foods")
  avoidFoods               String[] @map("avoid_foods")
  lifestyleNotes           String?  @map("lifestyle_notes")
  supplementHints          String?  @map("supplement_hints")

  requiresDietitianReview  Boolean  @default(false) @map("requires_dietitian_review")
  isActive                 Boolean  @default(true)  @map("is_active")
  source                   String?                            // "NIN-1998","NIN-2024","Clinic"

  // Deprecated — keep for one release
  content                  String?  @deprecated

  createdBy                String?  @map("created_by")
  createdAt                DateTime @default(now()) @map("created_at")
  updatedAt                DateTime @updatedAt       @map("updated_at")

  clinic     Clinic?            @relation(fields: [clinicId], references: [id])
  dietCharts PatientDietChart[]
  @@index([clinicId])
  @@index([dietType, goal])
  @@map("diet_templates")
}

enum DietType { VEG NON_VEG EGGETARIAN VEGAN JAIN SATVIK }
enum AgeGroup { INFANT TODDLER CHILD TEEN ADULT ELDERLY PREGNANT LACTATING }
enum DietGoal {
  MAINTENANCE WEIGHT_LOSS WEIGHT_GAIN MUSCLE_GAIN FAT_LOSS
  DIABETES_T2 PRE_DIABETES PCOS HYPERTENSION HYPOTHYROID HYPERTHYROID
  GUT_HEALING LIVER_SUPPORT KIDNEY_SUPPORT
  PREGNANCY LACTATION ELDERLY_LONGEVITY CHILD_GROWTH
  IMMUNITY POST_SURGERY CONVALESCENCE
}
```

#### `PatientDietChart` (snapshot-first)
```prisma
model PatientDietChart {
  id                String   @id @default(uuid())
  visitId           String   @map("visit_id")                // ❌ remove @unique to allow versioning
  patientId         String   @map("patient_id")
  clinicId          String   @map("clinic_id")
  dietTemplateId    String?  @map("diet_template_id")

  // Generator I/O — full audit trail
  inputs            Json                                     // patient profile snapshot used
  snapshot          Json                                     // full 7-day grid + totals
  groceryList       Json?    @map("grocery_list")
  patientOverrides  Json?    @map("patient_overrides")       // swaps the doctor made post-gen

  // Computed rollups (denormalised for queries)
  avgDailyKcal      Int?     @map("avg_daily_kcal")
  avgDailyGi        Int?     @map("avg_daily_gi")

  notes             String?
  pdfUrl            String?  @map("pdf_url")
  whatsappSentAt    DateTime? @map("whatsapp_sent_at")
  version           Int      @default(1)

  // Deprecated
  customContent     String?  @deprecated

  createdBy         String?  @map("created_by")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt       @map("updated_at")

  visit        Visit         @relation(fields: [visitId], references: [id])
  dietTemplate DietTemplate? @relation(fields: [dietTemplateId], references: [id])

  @@index([patientId])
  @@index([clinicId])
  @@index([visitId, version])
  @@map("patient_diet_charts")
}
```

#### `Patient` (new optional fields — mirrors the §6 input set)
```prisma
// ── Anthropometry & biometrics ──
heightCm           Float?   @map("height_cm")
currentWeightKg    Float?   @map("current_weight_kg")
targetWeightKg     Float?   @map("target_weight_kg")
waistCm            Float?   @map("waist_cm")
hipCm              Float?   @map("hip_cm")
bodyFatPct         Float?   @map("body_fat_pct")
skeletalMuscleKg   Float?   @map("skeletal_muscle_kg")

// ── Reproductive / hormonal status ──
pregnancyStatus    String?  @map("pregnancy_status")   // none|planning|t1|t2|t3|lactating_0_6|lactating_6_12|post_partum_0_6
menstrualPhase     String?  @map("menstrual_phase")    // follicular|ovulatory|luteal|menstrual|perimenopausal|post_menopausal
menopauseStatus    String?  @map("menopause_status")

// ── Activity & occupation ──
activityLevel      String?  @map("activity_level")     // bed_rest|sedentary|light|moderate|heavy|athlete
exerciseTypes      String[] @map("exercise_types")
exerciseMinsWeek   Int?     @map("exercise_mins_week")
occupation         String?
workShift          String?  @map("work_shift")         // day|night|rotating|split
avgStepsPerDay     Int?     @map("avg_steps_per_day")

// ── Diet preference & ethics ──
dietType           String?  @map("diet_type")          // see §6.4 list
therapeuticPatterns String[] @map("therapeutic_patterns") // low_fodmap|low_gi|keto|if_16_8|...
religiousTags      String[] @map("religious_tags")     // no_onion_garlic|halal|kosher|sattvic
fastingDays        String[] @map("fasting_days")       // mon|thu|ekadashi|pradosh|...
fastingWindow      Json?    @map("fasting_window")     // {start:"20:00", end:"12:00"}

// ── Constitutional ──
ayurvedicPrakriti  String?  @map("ayurvedic_prakriti") // vata|pitta|kapha|...
ayurvedicVikriti   String?  @map("ayurvedic_vikriti")
homeoConstitution  String?  @map("homeo_constitution") // sulphur|calc_carb|phosphorus|...
somatotype         String?
bloodGroup         String?  @map("blood_group")

// ── Allergies / intolerances / preferences ──
allergens          String[]                            // dairy|gluten|nuts|...
foodIntolerances   String[] @map("food_intolerances")
foodLoves          String[] @map("food_loves")
foodDislikes       String[] @map("food_dislikes")
textureAversions   String[] @map("texture_aversions")
spiceTolerance     String?  @map("spice_tolerance")    // bland|mild|medium|spicy|very_spicy
sweetTooth         String?  @map("sweet_tooth")        // low|medium|high

// ── Region & locale ──
macroRegion        String?  @map("macro_region")
state              String?
subRegion          String?  @map("sub_region")
city               String?
climate            String?
diasporaVariant    String?  @map("diaspora_variant")
cuisineRegion      String?  @map("cuisine_region")     // legacy/compat — superseded by macroRegion+state

// ── Lifestyle ──
sleepHoursAvg      Float?   @map("sleep_hours_avg")
sleepQuality       String?  @map("sleep_quality")
bedtimeClock       String?  @map("bedtime_clock")      // "23:00"
waketimeClock      String?  @map("waketime_clock")
stressLevel        String?  @map("stress_level")
waterIntakeL       Float?   @map("water_intake_l")
caffeineCupsDay    Int?     @map("caffeine_cups_day")
alcoholFreq        String?  @map("alcohol_freq")
tobaccoUse         String?  @map("tobacco_use")
bowelFreqDay       Float?   @map("bowel_freq_day")
bristolStool       Int?     @map("bristol_stool")      // 1..7
eatOutFreq         String?  @map("eat_out_freq")

// ── Cooking environment ──
cookedBy           String?  @map("cooked_by")
equipmentAvailable String[] @map("equipment_available")
cookingTimeTier    String?  @map("cooking_time_tier")
mealPrepStyle      String?  @map("meal_prep_style")
householdSize      Int?     @map("household_size")
travelDaysMonth    Int?     @map("travel_days_month")

// ── Budget & seasonality ──
budgetTier         String?  @map("budget_tier")
localeTier         String?  @map("locale_tier")        // metro|tier2|town|rural
seasonalityPref    String?  @map("seasonality_pref")
```

#### `PatientBiomarker` (new — captures lab values used by the generator)
```prisma
model PatientBiomarker {
  id          String   @id @default(uuid())
  patientId   String   @map("patient_id")
  visitId     String?  @map("visit_id")
  marker      String                                    // hba1c|fbs|ldl|tsh|hb|ferritin|...
  value       Float
  unit        String                                    // %|mg/dL|...
  measuredAt  DateTime @map("measured_at")
  source      String?                                   // "manual"|"document_parse"
  createdAt   DateTime @default(now()) @map("created_at")

  patient Patient @relation(fields: [patientId], references: [id])
  @@index([patientId, marker, measuredAt])
  @@map("patient_biomarkers")
}
```

`Patient.allergies` already exists as `String` — keep for legacy but **also** introduce `String[] @map("allergens")` (structured chip list) above; migrate via script.

#### Updated enum — `DietGoal` (expanded from §6.9)
```prisma
enum DietGoal {
  MAINTENANCE
  WEIGHT_LOSS_MILD WEIGHT_LOSS_MODERATE WEIGHT_LOSS_AGGRESSIVE
  WEIGHT_GAIN MUSCLE_GAIN BODY_RECOMPOSITION FAT_LOSS_PRESERVE
  DIABETES_T2 PRE_DIABETES PCOS
  HYPERTENSION HYPOTHYROID HYPERTHYROID HYPERLIPIDEMIA
  GUT_HEALING LIVER_SUPPORT KIDNEY_SUPPORT
  PREGNANCY LACTATION
  ELDERLY_LONGEVITY CHILD_GROWTH ADOLESCENT_GROWTH
  IMMUNITY POST_SURGERY POST_COVID CONVALESCENCE
  SPORTS_PERFORMANCE PRE_EVENT_CUT
  ANTI_INFLAMMATORY SKIN_HEALTH HAIR_FALL MIGRAINE_AVOIDANCE
  SLEEP_SUPPORT MOOD_SUPPORT GENTLE_DETOX
  FERTILITY_M FERTILITY_F MENOPAUSE ANDROPAUSE
}
```

---

## 10. Rule Engine (hard caps — enforced post-generation)

| Tag | Rule | Source |
|---|---|---|
| `Diabetes T2` / `Pre-diabetes` | GI ≤ 55 per item · added sugar = 0 · ≥ 25 g fibre/day · no sugary beverages | NIN Guideline 14; Annexure 10 |
| `Hypertension` | Sodium ≤ 1500 mg/day · DASH-Indian skeleton · K+-rich foods featured | NIN Guideline 10 |
| `CKD stage 1–3` | Protein 0.8 g/kg/day · K+ ≤ 2000 mg/day · phosphorus tracked | KDOQI + clinic policy |
| `Gout` | Purine list excluded (organ meats, sardines, mushroom, spinach excess) | Clinic |
| `IBS-D` | Low FODMAP bias; soluble fibre preferred | Monash FODMAP |
| `IBS-C` | High insoluble fibre + 3 L water | Monash FODMAP |
| `GERD` | No spicy/citrus/caffeine in evening_snack/dinner/bedtime | Clinic |
| `Pregnancy T2/T3` | +350/+450 kcal · iron-rich foods × 2/day · folate target | NIN Guideline 2 |
| `Lactation 0–6 mo` | +600 kcal · +25 g protein · galactagogues encouraged | NIN Guideline 2 |
| `Elderly` | Soft foods · oil ≤ 20 g/day · ≥ 1 g protein/kg | NIN Guideline 15 |
| `Weight loss` | Floor 1200 kcal (F) / 1500 kcal (M) · ≥ 1.2 g protein/kg | Mifflin / NIN |
| `Weight gain / Muscle gain` | Surplus ≤ 500 kcal · ≥ 1.6 g protein/kg for MG | Sports nutrition |
| **Always** | Salt ≤ 5 g · oil ≤ 25 ml (relaxed for athlete) · water ≥ 2 L · ultra-processed = 0 in plan | NIN G7, G10, G13, G14 |
| `HbA1c ≥ 8.5%` (biomarker) | GI cap tightens to 50; no fruit juice anywhere | Clinical |
| `HbA1c 6.5–7.4%` | GI cap 55; 1 fruit/day allowed | Clinical |
| `Hyperlipidemia` + `LDL ≥ 130` | Saturated fat ≤ 7% kcal; trans = 0; soluble fibre ≥ 10 g/day | NIN G7 |
| `Hypothyroid` | Goitrogens (raw cabbage, cauliflower, broccoli, soy) only cooked + capped at 1 serving/day; 1 hr gap from levothyroxine | Clinical |
| `Iron-deficiency anaemia` | Iron-rich food in 2+ slots/day; pair with Vit-C; no tea/coffee within 1 hr of iron-rich meal | NIN G6, Annexure 15 |
| `Migraine` (with trigger profile) | Exclude tyramine list (aged cheese, fermented, MSG), chocolate, caffeine > 1 cup, alcohol | Clinical |
| `Eczema / Psoriasis / Urticaria` | Low-histamine pattern; anti-inflammatory omega-3 ≥ 1 g/day; exclude common triggers (eggs, peanuts) only if patient confirms | Clinical |
| `GERD` + Bedtime slot | Dinner ≥ 3 hr before bed; no citrus / spicy / chocolate / mint after 18:00 | Clinical |
| `Pregnancy T1` (nausea) | Soft, bland, small frequent meals; ginger inclusion; folate ≥ 600 µg/day | NIN G2 |
| `IF 16:8 / 14:10` | All slots compress into the eating window; bedtime slot only inside window; water/black tea/coffee outside | Generator-rule |
| `Sattvic / Yogic diet` | No onion, garlic, mushroom, leftovers (>4 hr old); fresh-cooked emphasis | User-rule |
| `Ayurvedic Vata-dominant` | Warm, oily, grounding; avoid raw cold foods; regular timing | Ayurveda |
| `Ayurvedic Pitta-dominant` | Cooling, sweet, bitter; avoid excess spicy, sour, salty, fried | Ayurveda |
| `Ayurvedic Kapha-dominant` | Light, dry, warming; avoid heavy, oily, sweet, cold | Ayurveda |
| `Medication: Warfarin` | Keep daily vit-K (GLV) intake **consistent** across 7 days (not zero — consistent) | Drug-nutrient |
| `Medication: MAOI` | Hard-exclude tyramine list | Drug-nutrient |
| `Medication: Levothyroxine` | Calcium/iron/soy/coffee ≥ 1 hr after dose (note inserted in early_morning slot) | Drug-nutrient |
| `Medication: Statin` | No grapefruit / pomelo | Drug-nutrient |
| `Cooking time tier = ≤ 10 min` | Recipe pool restricted to `prep_time_min ≤ 10` | User-rule |
| `Locale = rural` | Exotic ingredient cap (no quinoa, broccoli, avocado, blueberry) — substituted with regional equivalents | User-rule |

The engine writes a `violations[]` field to `inputs` JSON if any cap had to be auto-resolved — surfaced to the doctor as a yellow banner. Each violation entry: `{ rule, action: "swapped|softened|warned", original, replacement, reason }`.

---

## 11. UX

### 11.1 Entry — from the visit page
```
Visit detail
   └─ [Generate Diet Chart]
         └─ Inputs screen (auto-filled from Patient + Visit)
               ├─ [Generate]  ← deterministic, < 2 s
               └─ Output: 7-day grid + summary + grocery
                     ├─ Edit any cell
                     ├─ "Swap this" per item
                     ├─ "Regenerate Day 4" per day
                     ├─ "Regenerate All" with different seed
                     └─ [Save & Print]  /  [Save & Send WhatsApp]
```

### 11.2 Inputs screen layout
- Left column: identity card (read-only) + biometrics (editable)
- Middle: Goal picker (single big card grid) + Diet type + Cuisine
- Right: Allergens / Dislikes / Disease tags (chip pickers)
- Bottom: Budget · Cooking time · Fasting days · Notes
- Sticky action bar: `[Generate]` `[Save Draft]` `[Cancel]`

### 11.3 Output screen layout
- Top: sticky summary card (kcal/macro/GI vs target, traffic-light colour)
- Tab strip: `Plan` `Grocery` `Do's & Don'ts` `Weekly Rollup`
- `Plan` tab: 7-row grid; each cell is a stack of item chips with `[swap] [delete] [+ add]`
- Per-day footer: "Day 1: 1490 kcal · GL 78 · ₹245" with mini bar chart
- Floating action: `[Print]` `[Send WhatsApp]` `[Save Version]`

### 11.4 Mobile / tablet
Doctor's iPad is the target form factor; the 7-day grid collapses to vertical day cards with horizontal slot scroll.

---

## 12. APIs

All under `/api/diet/*`, all clinic-scoped via session middleware (already in place).

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/diet/foods?q=&category=&veg=` | Search food DB (typeahead) |
| `GET`  | `/api/diet/foods/:id` | Full food detail (nutrition + GI) |
| `GET`  | `/api/diet/recipes?slot=&cuisine=` | Recipe lookup |
| `GET`  | `/api/diet/templates?goal=&diet=&age=` | Template browser |
| `POST` | `/api/diet/templates` | Create clinic-custom template (Admin/Doctor) |
| `POST` | `/api/diet/templates/:id/clone` | Clone global → clinic |
| `POST` | `/api/diet/generate` | **Generator entry point**. Body = `Inputs`. Returns `{ snapshot, summary, groceryList, violations }`. Does NOT persist. |
| `POST` | `/api/diet/swap` | Smart-swap. Body `{ foodId, slot, patientContext }` → top 3 substitutes. |
| `POST` | `/api/patient-diet-charts` | Persist generated chart (snapshot + inputs + overrides) |
| `PATCH`| `/api/patient-diet-charts/:id` | Doctor edits → bumps `version` |
| `POST` | `/api/patient-diet-charts/:id/whatsapp` | Render PDF, send via existing WA module, write `whatsappSentAt` |
| `GET`  | `/api/patient-diet-charts?patientId=` | History list for follow-up comparison |

Auth: existing `getSessionUser` enforces clinic isolation. `requiresDietitianReview=true` templates return `403` from `/generate` unless `confirmOverride: true` in body.

---

## 13. Seed Strategy (data ingest)

Follow the proven `seed-yoga.ts` pattern.

### 13.1 New seeders (each idempotent, upsert by natural key)
- `prisma/seed-diet-foods.ts` — reads `prisma/seed-data/diet/foods.csv` (≥ 500 IFCT-2017 foods). GI values from NIN Annexure 10 where available, else best-published source recorded in `source` field.
- `prisma/seed-diet-recipes.ts` — reads `prisma/seed-data/diet/recipes.json` (≥ 200 staple recipes, cuisine-tagged).
- `prisma/seed-diet-subs.ts` — reads `prisma/seed-data/diet/substitutions.csv` (≥ 1000 swaps).
- `prisma/seed-diet-templates.ts` — reads `prisma/seed-data/diet/templates/*.json` (≥ 60 scaffolds; same matrix as `diet_req.md` §7).

All wired into `prisma/seed.ts` after the yoga block.

### 13.2 Source attribution (audit trail)
Every seeded row carries a `source` string:
- `"IFCT-2017"` for nutrition values
- `"NIN-1998-Annexure-10"` for GI values
- `"NIN-1998-Annexure-2/14"` for portion sizes
- `"NIN-2024-DGI"` for guideline-aligned templates
- `"Clinic-Curated"` for clinic-validated content

### 13.3 Re-seed command
```
DATABASE_URL="postgresql://clinicman:clinicman123@localhost:5432/clinicman" npm run db:seed
```
Idempotent — re-runnable after every PRD revision.

---

## 14. Integration Points within DrMan.ai

| Touchpoint | What changes |
|---|---|
| **Visit detail page** | Existing "Diet Chart" link routes to new generator UI; falls back to legacy editor only if generator disabled by feature flag. |
| **Patient profile** | New section "Diet Preferences" — height, weight, activity, diet type, allergies, dislikes, fasting days, region. |
| **Patient visits list** | Existing diet-chart row icon — clicking opens latest version; long-press shows version history. |
| **Prescription module** | Cross-link: when prescribing for Diabetes/HTN/PCOS, banner suggests "Generate matching diet chart" (one-click pre-fills inputs). |
| **WhatsApp module** | Existing send pipeline reused; new template type `diet_chart_pdf` registered with Meta. |
| **Yoga module** | Cross-link: if patient has a yoga plan for PCOS, generator pre-selects PCOS goal. |
| **Reports / Admin dashboard** | New tiles: "% visits with diet chart", "Top templates this month", "Avg generator violations resolved". |
| **Permissions** | `diet:read`, `diet:write`, `diet:admin` added to `lib/permissions.ts`. Doctor & Admin: write. Receptionist: read + WA-send only. |
| **Audit log** | Every generate / edit / send event logged with user, visit, template, version. |

---

## 15. Non-Functional Requirements

| Aspect | Target |
|---|---|
| Generator P95 latency | < 1.5 s for deterministic; < 6 s with LLM regionalisation |
| DB size | Food table ~500 rows × ~30 cols; recipes ~200 × joins; substitutions ~1k — trivial in Postgres |
| PDF render | < 2 s server-side; uses Playwright/Chromium already configured |
| Browser support | Chrome / Edge (clinic uses Windows + Chromium); Safari smoke-tested |
| Print fidelity | Identical in print preview vs printed page; no overflow on A4 with 15/20 mm margins |
| Accessibility | All forms keyboard-navigable; chip pickers expose ARIA labels; print uses ≥ 11 pt |
| Localisation | English in v1; data model i18n-ready (`name_local` JSON on `foods`) for v1.1 |
| Resilience | Generator must never crash on missing optional patient fields — assumes safe defaults |
| Test coverage | Generator unit tests: 90%+ (deterministic). E2E: 5 golden scenarios (Diabetic veg, PCOS veg, HTN non-veg, Pregnancy T3, Elderly weight-loss). |

---

## 16. Compliance & Safety

- Footer disclaimer on every PDF (§7.8).
- `requiresDietitianReview` templates blocked unless explicit doctor override (logged).
- No claims of "cure"; wording reviewed by clinic MD pre-launch.
- All seed content cites source; no copyrighted recipe text used verbatim.
- Patient PII never leaves the clinic backend; PDFs stored in clinic's existing media bucket with prescription-grade retention.
- LLM (v1.1) is configurable per clinic; default OFF; never sees patient name/phone — only anonymised demographic + condition payload.

---

## 17. Acceptance Criteria — v1.0 ship gate

1. `npm run db:seed` populates ≥ 500 foods, ≥ 200 recipes, ≥ 1000 substitutions, ≥ 60 templates with sources recorded.
2. Doctor can open a visit → generate a 7-day chart → save → print → send WhatsApp in ≤ 60 s in a clean cache.
3. Generated chart respects all hard caps in §10 for every seeded golden scenario.
4. Allergens / dislikes / fasting days / region / budget all visibly affect output (verified in test matrix).
5. Per-day kcal lands within ±10% of target across all golden scenarios.
6. Swap action returns ≥ 3 substitutes for any food in `food_substitutions`.
7. Print preview is ≤ 2 A4 pages for all seeded scenarios.
8. WhatsApp send writes `whatsappSentAt` and patient receives the PDF (test number).
9. Clone-to-clinic creates an independent editable copy; editing it never mutates the global template.
10. Version history visible on patient visits page; doctor can diff v1 vs v2.

---

## 18. Phased Roadmap

| Phase | Scope | Duration |
|---|---|---|
| **P1 — Schema & seed** | Migrations for `foods`, `recipes`, `food_substitutions`, upgraded `diet_templates`/`patient_diet_charts`/`Patient`. All 4 seeders. Source-attributed dataset. | 2 weeks |
| **P2 — Generator core** | Mifflin solver, template ranker, slot split, candidate pool, item selection, rule-engine validator, variety smoother. Unit tests + 5 golden scenarios. | 2 weeks |
| **P3 — Inputs UI** | Patient-aware form, chip pickers for allergens/disease/cuisine, biometrics auto-fill from latest visit. | 1 week |
| **P4 — Output UI** | 7-day grid, per-cell swap, summary card, grocery tab, weekly rollup, do's/don'ts tab. | 1.5 weeks |
| **P5 — Print + WhatsApp** | Extend print page to 2-page structured layout. Wire WA send + audit fields. | 1 week |
| **P6 — Reports + permissions** | Admin tiles, top-templates report, permissions tightened, audit log entries. | 4 days |
| **P7 — Pilot hardening** | Dogfood at clinic for 2 weeks; MD content review; copy fixes; perf tuning. | 2 weeks |
| **v1.1** | LLM regionalisation, budget optimiser, multi-language render, patient HTML preview, adherence check-ins. | 4 weeks |

Target v1.0 ship: **~10 weeks** from kickoff.

---

## 19. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| GI values missing for many regional foods | Diabetes rule fails | Use NIN Annexure 10 baseline + carb-class fallback (refined → 70, whole grain → 55, legume → 30); store `gi_source` field |
| Doctors distrust generated charts → revert to free text | Module dies | Show "Why this item?" tooltip linked to rule (e.g., "Low GI, fits diabetes cap"); audit override rate weekly |
| Generator produces culturally implausible meals | Patient ignores | Cuisine + must-pair-with constraints; pilot review by clinic MD before launch |
| LLM hallucinates a food not in DB | Wrong macros, safety risk | LLM constrained to rewrite item descriptions only; cannot add items; macro drift > 5% rejects output |
| Heavy schema changes break existing diet charts | Data loss | Keep `customContent` deprecated col one release; migrate snapshot on first read; release behind feature flag |
| WhatsApp template rejection | Delivery breaks | Pre-approve `diet_chart_pdf` template; fallback to tokenised HTML link |
| Scope creeps into recipe videos / mobile app | Slip | §5.4 is contract; new asks land in v2 backlog |

---

## 20. Open Questions

1. Do we ship the **food DB UI** (Admin can edit foods) in v1.0 or keep DB read-only and edited via seed files only?
   — *Recommend: read-only in v1.0; full editor in v1.1.*
2. Should the doctor see calorie/macro targets BEFORE editing biometrics, or after?
   — *Recommend: after — targets are computed live as biometrics change.*
3. Are we OK to add `Patient.heightCm`, `currentWeightKg` (new required-ish fields) without a backfill?
   — *Recommend: optional with smart defaults; banner asks reception to capture on next visit.*
4. WhatsApp template approval lead time — does our existing WA Business account allow file attachments with dynamic caption?
   — *Owner: Reema to confirm with provider before P5.*
5. Where do we draw the line on "Diabetes Reversal" claims in the goal selector?
   — *Recommend: rename to "Diabetes T2 management" to stay clinically conservative.*

---

## 21. References

- **ICMR-NIN.** *Dietary Guidelines for Indians — A Manual* (2011 reprint of 1998/2003/2007 editions). Bundled at `clinicman/doc/DietaryGuidelinesforNINwebsite.pdf`. Specifically used: 15 guidelines (G1–G15), Annexure 1 (Calorific value nuts/fruits), Annexure 2/2a/2b (Balanced diet & sample meal plans), Annexure 3 (RDA macro/micro), Annexure 4 (Balanced diet infants/children), Annexure 6/7 (Low/High kcal vegetables and fruits), Annexure 8 (Calorific value of cooked preparations), Annexure 9 (ALA / omega-3 content), Annexure 10 (Glycemic Index table), Annexure 11 (Exercise / kcal-burn table), Annexure 14 (Portion sizes & menu plan), Annexure 15 (Nutrient-rich foods).
- **ICMR-NIN.** *Nutrient Requirements for Indians, 2020.* — protein g/kg targets per life-stage.
- **ICMR-NIN.** *Indian Food Composition Tables (IFCT) 2017* — 528 foods × 151 components; primary source of macro/micro nutrition for the `foods` table.
- **Mifflin MD, St Jeor ST**, et al. *Am J Clin Nutr* 1990 — BMR equation used in §8.2.
- **Diabetes Care** Vol. 31 No. 12, December 2008 — GI table cross-reference (cited inside NIN Annexure 10).
- Internal: `clinicman/doc/diet_req.md`, `clinicman/doc/ref_diet_prd.md`, `clinicman/doc/PRD.md`, `clinicman/doc/DATABASE_SCHEMA.md` §15, `clinicman/web/prisma/schema.prisma`.
- Related memory: [[prd-diet-module]], [[prd-yoga-library]], [[project-requirements-checklist]].
