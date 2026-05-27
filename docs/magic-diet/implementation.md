# Diet Chart Generator — Local HTML App: Implementation Notes

> Companion to `final_diet.md` (the PRD).
> This document describes **what was built in `diet-app.html`** — now the v1.0-local release with every major PRD-deferred item implemented inline.

**Last updated:** 2026-05-21

---

## 1. What this app is

A **single-file, zero-dependency HTML application** (~2400 LoC) that runs locally by double-clicking `diet-app.html`. Everything (UI, food DB, rule engine, generator, persistence, presets, diff viewer) lives in one file. The "database" is inline JS arrays (effectively JSON literals).

```
Patient inputs ──► Biomarker-derived auto-tags + severity ──► Mifflin-St Jeor solver
              ──► IF-window slot redistribution
              ──► Multi-rule candidate filter (diet + allergens + meds + dosha + disease + budget + cook time)
              ──► Greedy item selection + hard-cap re-swap (3 fallback iterations)
              ──► Swap modal · Edit values · Lock cells · Day modes (cheat/veg/lighter) · Slot notes
              ──► 7-day grid + per-day totals ──► Grocery ──► Do's/Don'ts ──► Rollup ──► Saved Plans
              ──► Print (A4 page-break) + JSON export
              ──► Auto-save to localStorage + named save-as + diff viewer
```

---

## 2. File layout

```
DietPlanGeneratot/
├── final_diet.md       PRD (source of truth)
├── diet_req.md         legacy v1 module PRD
├── diet-app.html       ← the app
├── implementation.md   ← this file
└── checkpoints.md      progress tracker (all checkpoints ✅)
```

---

## 3. Inputs (15 of 15 PRD §6 groups)

| Group | Implementation |
|---|---|
| §6.1 Demographics | age/gender/H/W |
| §6.2 Extended anthro | waist/hip/body-fat % (collapsible) |
| §6.3 Activity | 5-tier Mifflin factor |
| §6.4 Diet type | VEG/EGG/NON_VEG/VEGAN/JAIN/SATTVIC |
| §6.5 Constitutional (Ayurveda) | Vata/Pitta/Kapha + duals + Tridoshic |
| §6.6 Allergens | 8-chip toggle |
| §6.7 Dislikes | comma-separated free text |
| §6.8 Region | south/north/east/west/pan + sub-regional via cuisine score |
| §6.9 Goal | 16 goals |
| §6.10 Disease tags | ~60 tags in 11 collapsible groups |
| §6.11 Biomarkers | 12 numeric inputs auto-deriving tags + severity |
| §6.12 Medications | 12-chip drug list with interaction rules |
| §6.13 Lifestyle | sleep hrs, stress, caffeine, alcohol |
| §6.14 Cooking environment | cook-time tier filter |
| §6.15 Budget + IF window | Economy/Standard/Premium + 12:12/14:10/16:8/OMAD/5:2 |

---

## 4. Generator pipeline

### 4.1 Biomarker auto-tag derivation
On Generate, biomarker values automatically inject disease tags:
- HbA1c ≥ 6.5 → `diabetes_t2` (≥ 5.7 → `pre_diabetes`)
- LDL ≥ 130 → `high_ldl`; TG ≥ 200 → `high_tg`
- Hb < 12 → `anaemia`
- TSH > 5 → `hypothyroid`; < 0.4 → `hyperthyroid`
- eGFR < 60 → `ckd_early`; < 30 → `ckd_3`
- Uric > 7 → `gout`
- BP ≥ 140/90 → `hypertension`
- Vit D < 20 → `vit_d_deficiency`; B12 < 200 → `b12_deficiency`

### 4.2 Biomarker severity modulation
Beyond tag derivation, ranges tighten rules:
- HbA1c ≥ 8.5% → GI cap drops to 50 (vs 55 default for diabetes)
- HbA1c 7.5–8.4% → GI cap 52
- LDL ≥ 160 → sat-fat ≤ 7% kcal banner
- TG ≥ 500 → urgent: zero alcohol + omega-3 4 g/day
- eGFR < 30 → CKD-3 rule (refer dietitian)
- Hb < 8 (F) / < 10 (M) → severe anaemia banner

### 4.3 IF window adjustment
Slot percentages redistribute based on fasting window:
- `12:12` / `14:10`: skip early-morning + bedtime slots
- `16:8`: skip early-morning + bedtime + breakfast
- `OMAD`: 100% in lunch slot
- `5:2`: Wed & Sat = 25% kcal fasting days (marked as `mode: "fast"`)

### 4.4 Multi-rule filter
`eligibleForSlot(food, slot, patient, targets)` excludes:
1. Slot mismatch
2. Diet-type incompatibility (VEGAN/VEG/EGG/JAIN/SATTVIC)
3. Allergen overlap
4. Dislike substring match
5. GI > target cap
6. Budget below tier
7. Prep time > cookTime preference
8. Any disease rule's `filter()` returns true
9. Any medication rule's `filter()` returns true

### 4.5 Dosha biasing
Each dominant dosha boosts or penalizes the food score:
- **Vata**: +warming/+grounding, −raw/cold/sprouts
- **Pitta**: +cooling/+coconut/+amla, −spicy/fried/red-meat
- **Kapha**: +millets/+ginger/+honey, −paneer/ghee/fried/cold

### 4.6 Hard-cap re-swap iteration
If the filtered pool collapses, 3 fallback iterations relax (in order):
1. Drop region preference (use pan-Indian pool)
2. Drop budget tier (allow any cost)
3. Drop cook-time preference

---

## 5. Interactivity

### 5.1 Item-level actions (click any food chip)
- **Swap**: top 3 substitutes from `SUBS[]` + fallback similar-kcal slot-compatible foods
- **✏️ Edit values**: free-text override of name, qty, kcal, P/C/F/fibre, GI — marked with green border + ✏ badge
- **🔒 Lock**: preserved across regenerations
- **🗑 Remove**

### 5.2 Day-level actions (⋯ button per day)
- **Cheat day**: skip GI cap, +200 kcal target — amber tile
- **Veg today**: force `VEG` diet type for this day only — green tile
- **Lighter day**: −300 kcal target — blue tile
- **Clear mode**: revert

### 5.3 Slot-level
- **+ note** under each slot → free-text doctor note that renders + prints

### 5.4 Whole-plan
- **🔄 Regen (keep locks)**: regenerates everything except locked items
- **🎲 Fresh regen**: full reset

---

## 6. Persistence (all in `localStorage`)

| Key | Purpose | Lifetime |
|---|---|---|
| `dietapp_recents_v2` | Last 10 patient profiles | persistent |
| `dietapp_current_v2` | Auto-saved current plan (full snapshot) | persistent, survives refresh |
| `dietapp_saved_v2` | Named save-as plans (up to 50) | persistent |

### Workflow
1. Generate plan → auto-saved as `current` (refresh restores it)
2. Edit / swap / lock — every change re-saves `current`
3. `💾 Save plan as…` → prompts for a name, pushes to `saved` list
4. Header `Saved` dropdown lists all saved plans → 1-click load
5. `⇆ Diff` button → pick any two saved plans → side-by-side day/slot comparison with green-added / red-removed highlighting

---

## 7. Golden-scenario presets

`🎯 Preset` button in the header opens a modal with 7 fully-configured patients:

1. **Rajesh K.** — Diabetic veg (HbA1c 7.8, LDL 140, BP 145/92) → tightens GI cap to 52
2. **Priya M.** — PCOS veg + insulin resistance + acne
3. **Surinder S.** — HTN non-veg with high LDL (BP 152/96, LDL 158)
4. **Anjali R.** — Pregnancy T3 with anaemia (Hb 10.5)
5. **Rajamma G.** — Elderly with osteoporosis + constipation
6. **Mohan T.** — CKD-early diabetic (eGFR 52, HbA1c 7.2, BP 138/88)
7. **Sneha P.** — Migraine + anxiety + insomnia

Selecting a preset populates the form + auto-generates the plan.

---

## 8. Food database

**`FOODS[]`** — ~140 curated Indian foods. Field codes:

| Field | Meaning |
|---|---|
| `n`, `sl`, `v` | name, slots, vegType |
| `kcal/p/c/f/fb/gi` | macros + GI |
| `al`, `rg`, `ct`, `q`, `cat` | allergens, regions, cost tier, qty, aisle |
| `ox` | oxalate 0–2 (kidney stones rule) |
| `pur` | purine 0–2 (gout, uric stones) |
| `na` | sodium 0–2 (HTN, HF) |
| `fm` | FODMAP 0–2 (IBS-D, SIBO) |
| `ty` | tyramine flag (migraine, MAOI) |
| `gtg` | goitrogen raw flag (hypothyroid) |
| `vk` | vitamin-K high (warfarin warning) |
| `ir` / `cal` / `om3` / `sf` | iron / calcium / omega-3 / soluble fibre (score boosts) |
| `pt` | prep_time_min (cooking time tier) |
| `temp` | warming(w) / cooling(c) / neutral(n) — Ayurveda dosha scoring |

**`SUBS[]`** — ~30 hand-curated substitution rules: `[from, to, slotKey, reason, score]`.

**`MED_RULES{}`** — 12 medications each with `filter` and/or `note`:
- `warfarin` → filter on `vk=1` (vit-K consistency note)
- `maoi` → hard-exclude `ty=1` (tyramine)
- `statin` → exclude grapefruit/pomelo
- `levothyroxine` / `metformin` / `ppi` / `iron_supplement` / `insulin` / `lithium` / `ssri` → note-only
- `steroid` → exclude high-sodium
- `diuretic` → K+ emphasis note

**`DOSHA_RULES{}`** — Vata/Pitta/Kapha with `boost(food)` and `penalize(food)` scoring functions.

**`DISEASE_RULES{}`** — ~60 disease tags each with `filter` / `note` / `dos[]` / `donts[]`.

---

## 9. Tech notes

- **Vanilla JS**, no frameworks, no fetch, no build step
- **Event delegation** on the grid container handles all item clicks (no inline `onclick` with quoted JSON — that approach broke on apostrophes)
- **CSS Grid** for 7-day layout; horizontal scroll on small screens
- **Print stylesheet** uses `@page A4` + 8mm margins + `page-break-after` per tab pane + 4-column grocery + scaled fonts (9pt body / 8pt cells)
- **ARIA** roles on modals, tablists; ESC closes modals
- **HTML escaping** on every user-supplied string before render
- **State**: form inputs + single `currentPlan` global + `localStorage` mirror

---

## 10. Known limitations (still deferred — require external infra)

- Food DB capped at ~140 inline entries. Reaching the PRD's 500-food target requires moving to `foods.json` + `fetch()` (intentionally not done to preserve single-file constraint).
- No multi-user / multi-clinic backend.
- No WhatsApp delivery.
- No LLM regionalisation.
- No tokenised public patient HTML mirror.
- Audit log retention is per-browser (localStorage) only.

All other PRD §6–§10 features are implemented inline.

---

## 11. Compliance footer

Every generated chart renders the PRD §7.8 disclaimer. Hydration target adjusts dynamically:
- CKD-3: 1.2 L
- CKD-early: 1.8 L
- UTI / IBS-C / kidney stones / gout: 3.0 L
- Lactation: 3.5 L
- Default: 2.5 L

No "cure" language. Severe CKD (stage 4–5) / oncology / dialysis intentionally excluded from goal list (PRD §5.4).
