# Diet Plan Module — Product Requirements Document

**Module:** DrMan.ai — Diet Plan Builder & Template Library
**Owner:** Product Owner (Sachin)
**Status:** Draft v1.0 (replaces prior brief)
**Date:** 2026-05-21
**Reference standard:** ICMR–NIN *Dietary Guidelines for Indians, 2024* (PDF in `doc/DietaryGuidelinesforNINwebsite.pdf`)

---

## 1. Vision & Positioning

Make every homeopathic prescription land alongside a **clinically credible, NIN-aligned, India-first diet chart** that the patient can read on WhatsApp in 10 seconds, print as a 1-page PDF, and actually follow at home.

Today, doctors at the clinic either skip the diet chart or hand-write a generic note. We will solve this by shipping a **pre-built library of evidence-based diet templates** seeded from the ICMR–NIN 2024 guidelines, plus a **fast template-pick + light-customise workflow** wired into the existing visit screen.

Anti-goals (explicit non-scope to keep us honest):
- Not a full dietetics SaaS (no recipe DB, no barcode scanning, no integrations with fitness wearables).
- Not a calorie-counting app for patients — we output a *chart*, not a tracker.
- Not a replacement for a registered dietitian for complex cases (renal failure, oncology, etc.); we flag those for manual review.

---

## 2. Problem Statement

1. The clinic has **no diet content** beyond what the doctor types per visit — slow, inconsistent, often skipped.
2. Manually building a diet plan per patient is impossible at 25–40 patients/day.
3. Generic copy-pasted charts (e.g., "avoid oily food") have **no clinical weight** and patients ignore them.
4. There is no way to **deliver** the chart — paper gets lost, and there is no WhatsApp send hook.
5. India-specific realities are ignored by Western tools: veg/Jain/eggetarian splits, regional cuisines (S. Indian/N. Indian/Bengali/Gujarati), millet revival, fasting days, joint family meal patterns.

---

## 3. Goals & Success Metrics

| Goal | KPI | Target (Month 3 post-launch) |
|---|---|---|
| Doctors actually issue diet charts | % visits with `PatientDietChart` row | ≥ 70% (baseline ~10%) |
| Charts are template-driven, not free-typed | % charts using a `DietTemplate` | ≥ 80% |
| Delivery completes the loop | % charts sent via WhatsApp or printed | ≥ 90% |
| Library breadth | Pre-seeded templates available on day 1 | ≥ 60 templates |
| Speed | Median time to attach a diet chart to a visit | < 45 seconds |
| Patient comprehension | Chart fits 1 A4 page in print preview | 100% |
| Personalisation | % charts that are edited (not pure template) | 30–60% (healthy band) |

---

## 4. Users & Personas (delta from PRD)

| Persona | What changes for them |
|---|---|
| **Dr. Priya** (Doctor) | Picks template by condition + diet-type from a 2-click filter; tweaks 1–2 lines; signs. |
| **Reema** (Receptionist) | Triggers WhatsApp send of the diet chart from the visit row; reprints on request. |
| **Vikram** (Admin) | Sees diet-chart issuance rate per doctor in reports; manages clinic-level custom templates. |
| **Priyanka** (Patient) | Receives a clean 1-page chart on WhatsApp with breakfast/lunch/snack/dinner + do's & don'ts in her language. |

---

## 5. Scope

### 5.1 In Scope — v1.0 (this PRD)
- Pre-seeded **diet template library** (≥ 60 templates, see §7).
- **Template browser** (filter by diet-type, condition, age group, purpose, cuisine region).
- **Visit-bound diet chart**: pick a template → optional edits → save → print/WhatsApp.
- **NIN "My Plate" model** as the canonical structure for every template (§6).
- **Print PDF** (1-page, clinic letterhead) — already implemented at `(print)/visits/[visitId]/diet-chart/print` — extended to render the new structured fields.
- **WhatsApp send** (hook into existing WhatsApp module; PDF attached, caption = template name).
- **Clinic-level custom templates** (Admin/Doctor can clone-and-edit globals).
- **Patient-level overrides**: allergies, intolerances, dislikes, fasting days.

### 5.2 v1.1 (next quarter)
- Multi-language rendering (English + Hindi + Kannada; Marathi/Tamil/Bengali later).
- Constitutional-type-aware tagging (Sulphur / Calc-carb / Phosphorus etc.) — homeopathy hook.
- Versioning of patient diet charts across visits (compare v1 vs v2 over follow-ups).

### 5.3 Out of Scope (explicit)
- Recipe-level meal generation, calorie auto-computation per ingredient.
- Patient mobile app with adherence tracking.
- Integration with external nutrition DBs (USDA, IFCT) at runtime — IFCT may be used at **seed time only** for reference values.
- Renal-failure / dialysis / oncology / parenteral diet plans (require dietitian; flag and route).

---

## 6. The NIN "My Plate" Canonical Model

Every template **must** declare values for these fields. This is the foundation — the printable chart, the PDF, the WhatsApp summary, and the search filters all derive from it.

### 6.1 Plate composition (NIN 2024 — 10 food groups)
Each template specifies % of plate / portion guidance for:
1. Cereals & millets
2. Pulses, beans, meat (protein group)
3. Milk & milk products
4. Eggs
5. Flesh foods (meat, poultry, fish)
6. Nuts & oilseeds
7. Fats & oils
8. Vegetables (with green leafy sub-group)
9. Roots & tubers
10. Fruits

Reference distribution to follow NIN: vegetables + fruits + GLV + roots ≈ **half the plate**; cereals + millets ≈ other major portion; remainder split across pulses/flesh/eggs/nuts/dairy/oils.

### 6.2 Macro & calorie targets
- `target_kcal` (integer, optional — required for weight-loss / weight-gain / diabetes templates)
- `macro_split` JSON: `{ carbs_pct, protein_pct, fat_pct }` (must sum to 100)
- `target_protein_g` (used for elderly, post-partum, weight-gain templates)
- `salt_cap_g` (default 5 g/day; lower for HTN templates)
- `added_sugar_cap_g` (default 25 g/day; 0 for diabetes templates)
- `oil_cap_ml` (default 25 ml/day)

### 6.3 Meal slots (structured, not free text)
Each template defines a **7-day rotation** keyed by `day_of_week` × `slot`:
- Slots: `early_morning`, `breakfast`, `mid_morning`, `lunch`, `evening_snack`, `dinner`, `bedtime`
- Each slot holds an ordered list of items: `{ name, qty, unit, notes? }`

### 6.4 Do's & Don'ts
- `allowed_foods` (array of strings)
- `avoid_foods` (array of strings)
- `lifestyle_notes` (e.g., "30 min walk after dinner", "no screens during meals")

### 6.5 Hydration & supplements
- `water_target_litres` (default 2.5 L)
- `supplement_hints` (e.g., "Vitamin D 60K IU/week if deficient" — *informational only*, prescription stays in Rx module)

---

## 7. Template Catalogue — Seed Set for v1.0

Minimum 60 templates seeded into `diet_templates` (clinic_id = NULL → global). The matrix below is the **product commitment**: we must ship every cell marked ✅.

### 7.1 Axis 1 — Diet preference
`veg` · `non_veg` · `eggetarian` · `vegan` · `jain` (no root vegetables) · `mixed`

### 7.2 Axis 2 — Purpose / Condition

| Group | Templates | Veg | Non-veg | Notes |
|---|---|---|---|---|
| **General wellness** | Adult maintenance · Adolescent · Elderly · Pregnancy (T1/T2/T3) · Lactation · Toddler (1–3) · Child (4–9) | ✅ | ✅ | NIN base plate scaled by RDA per age group |
| **Weight management** | Weight loss (1200/1500/1800 kcal) · Weight gain (2500 kcal) · Muscle gain | ✅ | ✅ | Explicit kcal & macro split mandatory |
| **Metabolic** | Type 2 diabetes · Pre-diabetes · Hypothyroid · Hyperthyroid · PCOS/PCOD · Hyperlipidemia · Fatty liver (NAFLD) | ✅ | ✅ | Low-GI carb emphasis; flax/methi/fenugreek hints |
| **Cardiovascular** | Hypertension (Indianised DASH) · Post-MI maintenance | ✅ | ✅ | Salt cap ≤ 5 g; potassium-rich foods featured |
| **GI** | Gastritis / GERD · IBS-D · IBS-C · Chronic constipation · Post-gastroenteritis recovery | ✅ | ✅ | FODMAP-aware where relevant |
| **Hematology** | Iron-deficiency anaemia · B12 deficiency (veg-aware) | ✅ | ✅ | Iron-rich combos + vitamin-C pairing notes |
| **Musculoskeletal** | Osteoarthritis · Osteoporosis · Gout (low purine) | ✅ | ✅ | Calcium/Vit-D emphasis; purine list for gout |
| **Dermatology (homeo crossover)** | Eczema · Psoriasis · Acne / hormonal skin · Urticaria (low histamine) | ✅ | ✅ | Tag-driven; doctor picks during skin cases |
| **Respiratory** | Asthma / allergic rhinitis · Chronic sinusitis | ✅ | ✅ | Anti-inflammatory bias |
| **Mental health adjunct** | Migraine (trigger-avoidance) · Anxiety / sleep support (gut-brain) | ✅ | ✅ | |
| **Life-stage special** | Post-partum recovery · Post-surgical recovery (general) · Convalescent (fever/typhoid recovery) | ✅ | ✅ | Soft/bland progression |

### 7.3 Axis 3 — Cuisine region (template variant tag, not separate template)
`north_indian` · `south_indian` · `bengali` · `gujarati` · `maharashtrian` · `pan_indian` (default)

Each template carries `cuisine_variants[]`; the print/WhatsApp renderer picks the variant matching the patient's `region` field (fallback `pan_indian`).

### 7.4 Seeding source
- Primary: ICMR-NIN *Dietary Guidelines for Indians, 2024* (the bundled PDF) — extract guideline-by-guideline content at seed time.
- Secondary: IFCT 2017 (Indian Food Composition Tables) for portion → nutrient values.
- Tertiary: Published clinic-validated condition diets reviewed by an in-house MD before seeding.

> **Seed task:** Build `prisma/seed-diet.ts` analogous to `seed-yoga.ts`. Idempotent upsert by `(clinicId IS NULL, name)`.

---

## 8. Functional Requirements

### EPIC D1 — Template Library Management
- **D1.1** Admin & Doctor can list, search, filter templates by: diet-type, condition, age group, kcal, cuisine.
- **D1.2** Templates have two visibility tiers: **global** (clinic_id NULL, seeded, read-only to clinic users) and **clinic-custom** (clinic_id set, full CRUD by Admin/Doctor of that clinic).
- **D1.3** "Clone to clinic" action on any global template → creates editable clinic copy.
- **D1.4** Soft-delete only (`isActive=false`); preserves historical patient charts that referenced it.
- **D1.5** Template editor enforces §6 schema (kcal/macro/slots validated before save).

### EPIC D2 — Assigning a Diet Chart to a Visit
- **D2.1** From the visit detail page, doctor clicks **"Add Diet Chart"** → opens picker.
- **D2.2** Picker shows recommended templates ranked by: patient age, gender, known conditions (from case-history tags), current `dietType` on patient profile.
- **D2.3** On selection, the chart is **materialised** into `patient_diet_charts.custom_content` (JSON snapshot) — template edits later **must not** retroactively change patient charts.
- **D2.4** Inline editor allows: swapping items per slot, adding 1-line notes, marking patient-specific avoid-foods.
- **D2.5** Save creates the `PatientDietChart` row linked to the visit; visible on patient visits list.
- **D2.6** Re-editing within the same visit updates in place; across visits creates a new chart (history preserved).

### EPIC D3 — Patient-Specific Personalisation
- **D3.1** Patient profile gains: `allergies[]`, `food_intolerances[]`, `food_dislikes[]`, `fasting_days[]` (e.g., Mon/Thu/Ekadashi), `cuisine_region`.
- **D3.2** Picker auto-strips slots/items conflicting with allergies; flags conflicts with intolerances.
- **D3.3** Fasting-day items rendered with a 🌙 marker (text-only — no emoji output is added unless the clinic enables it).

### EPIC D4 — Print & WhatsApp Delivery
- **D4.1** Existing print page extended to render structured 7-day grid + do's/don'ts + hydration + macro summary, fitting 1 A4 page.
- **D4.2** "Send to WhatsApp" button on the visit row generates the PDF (server-side), uploads to clinic media store, sends via the existing WhatsApp module with caption `"<Patient Name> — Diet Plan (<Template Name>)"`.
- **D4.3** `whatsapp_sent_at` timestamp written back to `patient_diet_charts`.
- **D4.4** If WhatsApp send fails, the UI surfaces the error and offers retry; print still works.

### EPIC D5 — Reporting & Compliance
- **D5.1** Admin dashboard tile: "% visits with diet chart this month" per doctor.
- **D5.2** Top-10 most-used templates report.
- **D5.3** Templates flagged `requires_dietitian_review` (e.g., renal, oncology) **cannot** be assigned without a confirmation modal explaining the limitation.
- **D5.4** Every chart prints with a footer disclaimer: *"This diet chart is a clinical recommendation by Dr. <name>, <clinic>. Not a substitute for emergency medical care."*

---

## 9. Data Model Changes (delta vs current Prisma schema)

Existing `DietTemplate` carries a single freeform `content: String`. That is **insufficient**. Proposed migration:

```prisma
model DietTemplate {
  id                       String   @id @default(uuid())
  clinicId                 String?  @map("clinic_id")          // nullable → global
  name                     String
  description              String?

  // Classification
  dietType                 DietType                            // enum
  ageGroup                 AgeGroup                            // enum
  purpose                  DietPurpose                         // enum
  conditionTags            String[] @map("condition_tags")
  cuisineVariants          String[] @map("cuisine_variants")

  // Targets (NIN My Plate)
  targetKcal               Int?     @map("target_kcal")
  macroSplit               Json?    @map("macro_split")        // {carbs_pct,protein_pct,fat_pct}
  targetProteinG           Int?     @map("target_protein_g")
  saltCapG                 Float?   @map("salt_cap_g")
  addedSugarCapG           Float?   @map("added_sugar_cap_g")
  oilCapMl                 Float?   @map("oil_cap_ml")
  waterTargetL             Float?   @map("water_target_l")

  // Structured content
  mealPlan                 Json     @map("meal_plan")          // {day:[slot:[items]]}
  allowedFoods             String[] @map("allowed_foods")
  avoidFoods               String[] @map("avoid_foods")
  lifestyleNotes           String?  @map("lifestyle_notes")
  supplementHints          String?  @map("supplement_hints")

  requiresDietitianReview  Boolean  @default(false) @map("requires_dietitian_review")
  isActive                 Boolean  @default(true)  @map("is_active")
  source                   String?                              // "NIN-2024", "Clinic-custom", etc.

  createdBy                String?  @map("created_by")
  createdAt                DateTime @default(now()) @map("created_at")
  updatedAt                DateTime @updatedAt       @map("updated_at")

  clinic     Clinic?            @relation(fields: [clinicId], references: [id])
  dietCharts PatientDietChart[]

  @@index([clinicId])
  @@index([dietType, purpose])
  @@map("diet_templates")
}

enum DietType   { VEG NON_VEG EGGETARIAN VEGAN JAIN MIXED }
enum AgeGroup   { INFANT TODDLER CHILD ADOLESCENT ADULT ELDERLY PREGNANT LACTATING }
enum DietPurpose{ MAINTENANCE WEIGHT_LOSS WEIGHT_GAIN MUSCLE_GAIN CONDITION_MANAGEMENT RECOVERY }
```

`PatientDietChart` gains:
```prisma
snapshot         Json     // full materialised chart at issue time
patientOverrides Json?    // {allergies, dislikes, swaps[]}
whatsappSentAt   DateTime?
pdfUrl           String?
version          Int      @default(1)
```

Patient model gains:
```prisma
allergies        String[]
foodIntolerances String[]
foodDislikes     String[]
fastingDays      String[]
cuisineRegion    String?
```

**Migration safety:** existing `content: String` is preserved as a deprecated column for one release; new picker writes `snapshot` JSON; print page reads `snapshot` first, falls back to `content`.

---

## 10. UX Flows

### 10.1 Doctor — assign diet chart (target ≤ 45 s)
```
Visit detail
   └─ [Add Diet Chart]
         └─ Picker (chips: Diet type · Purpose · Condition · Age)
               └─ List ranked by patient context (top match expanded)
                     └─ [Use this template]
                           └─ Inline editor (collapsed sections; tweak only what matters)
                                 └─ [Save] → back to visit → [Print] / [WhatsApp]
```

### 10.2 Admin — clone & customise a global template
```
Diet Templates page
   └─ Filter: Source = "NIN-2024"
         └─ Row action: [Clone to clinic]
               └─ Editor opens on the clinic copy
                     └─ [Save] → appears in clinic library; global remains untouched
```

### 10.3 Patient — receive on WhatsApp
A single PDF arrives. Caption: `"Priyanka — Diet Plan (PCOS — Veg — 1500 kcal)"`. PDF opens to a one-page chart with: clinic letterhead, patient name + age + condition tag, 7-day meal grid, do's & don'ts, hydration target, doctor signature line.

---

## 11. Non-Functional Requirements

- **Performance:** Template picker P95 < 500 ms with 500 templates loaded.
- **Print fidelity:** PDF must render identically in Chromium-based browsers; tested on Chrome and Edge.
- **Accessibility:** Editor reachable by keyboard; print uses min 11pt for body text.
- **Localisation:** All template content stored in English in v1; renderer is i18n-ready for v1.1.
- **Audit:** Every `PatientDietChart` row immutable on history; edits create a new `version`.
- **Backup:** Seed JSON checked into `prisma/seed-data/diet-templates/*.json` — single source of truth for re-seeding.

---

## 12. Compliance, Safety & Disclaimer

- All seeded content cites **ICMR-NIN 2024** in the `source` field; condition templates additionally cite the published guideline used.
- Templates flagged `requires_dietitian_review` block silent assignment.
- Footer disclaimer printed on every chart (§D5.4).
- No claims of "cure" — wording reviewed by clinic MD pre-launch.
- Patient PII (name, age) never leaves the clinic backend; PDFs are stored in the clinic's existing media bucket with the same retention policy as prescriptions.

---

## 13. Acceptance Criteria (v1.0 ship gate)

1. ≥ 60 templates visible in the library after `npm run db:seed`.
2. Doctor can attach a chart to a visit in ≤ 45 s on a clean cache (measured manually on 5 conditions).
3. Print preview renders on 1 A4 page for all seeded templates (no overflow).
4. WhatsApp send writes `whatsappSentAt` and the patient receives the PDF in test env.
5. Allergy in patient profile auto-strips conflicting items from the picker preview.
6. Clone-to-clinic creates an independent editable copy without mutating the global.
7. Renal/oncology-tagged templates show the dietitian-review modal before assign.
8. Admin dashboard tile shows correct % of visits with diet chart for the current month.

---

## 14. Phased Roadmap

| Phase | Scope | Duration |
|---|---|---|
| **P1 — Schema & seed** | Migration + enums + `seed-diet.ts` + first 60 templates | 1 week |
| **P2 — Picker & editor** | Template browser, recommendation ranking, inline editor | 1 week |
| **P3 — Print upgrade** | New 1-page structured PDF template | 3 days |
| **P4 — WhatsApp wiring** | Send hook + retry + audit fields | 3 days |
| **P5 — Personalisation** | Patient allergy/dislike fields + picker filtering | 4 days |
| **P6 — Reporting** | Admin tile + top-templates report | 2 days |
| **Hardening / pilot** | Clinic dogfood, MD content review, copy fixes | 1 week |

Target launch: **6 weeks** from kickoff.

---

## 15. Open Questions

1. Do we want **Hindi** in v1.0 or defer to v1.1? (Recommend: defer; ship English first.)
2. Should the picker pull conditions from `case_history` automatically, or require the doctor to tag the visit first? (Recommend: auto-pull but allow override.)
3. WhatsApp template approval — does our existing WA Business template support file attachment with dynamic caption? (Owner: Reema/Vikram to confirm with provider.)
4. Do we need a **patient-acknowledgement** read receipt (WA blue ticks)? Recoverable post-MVP.
5. Should clinics be able to **share custom templates** across other clinics in future multi-tenant mode? (Defer to multi-tenant phase.)

---

## 16. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| NIN PDF is dense; manual seeding is error-prone | Wrong nutritional advice | Two-pass review: extract → MD signs off each template before merge |
| Doctors keep typing free-form notes and ignore templates | Module unused | Visit screen gently nudges; analytics surface low adopters |
| WhatsApp template rejection by Meta | Delivery breaks | Pre-approve template strings during P4; fall back to PDF download link |
| Patient allergies missing from profile | Wrong chart issued | Picker shows banner "No allergies recorded — confirm with patient" if field empty |
| Scope creep into full meal planning | Slips timeline | This PRD's §5.3 is contract; future asks go to v2 backlog |

---

## 17. References

- ICMR-NIN, *Dietary Guidelines for Indians (2024)* — bundled `doc/DietaryGuidelinesforNINwebsite.pdf`; web: <https://www.nin.res.in/downloads/DietaryGuidelinesforNINwebsite.pdf>
- ICMR-NIN, *Nutrient Requirements for Indians, 2020* (RDA reference)
- IFCT 2017 — Indian Food Composition Tables (portion → nutrient mapping)
- Existing module artefacts: `DATABASE_SCHEMA.md` §15, `prisma/schema.prisma` `DietTemplate`/`PatientDietChart`, print page at `(print)/visits/[visitId]/diet-chart/print/page.tsx`
- Related modules: Yoga Library (`prd_yoga_library.md`) — mirror the seed-from-curated-source pattern.
