# Diet Chart Generator — Checkpoints

> Living progress tracker for the local HTML app (`diet-app.html`) against the PRD `final_diet.md`.

**Last updated:** 2026-05-21 (v1.0.1-local: form smoothing — only essentials required, all else optional with safe defaults)

---

## 🆕 Form smoothing (post-v1.0)

- [x] Only **two sections are required** — visually marked with a blue left bar and `REQUIRED` chip:
  - **Essentials**: name + age + gender + height + weight
  - **Activity, Goal & Cooking**: all have sensible defaults so this can stay collapsed
  - **Diet & Cuisine**: defaults to Vegetarian + Pan-Indian
- [x] All other sections marked with grey `(optional)` hint text in the section title
- [x] **Tip banner** at top of form: "Only the blue-bar sections are needed. Everything else is optional…"
- [x] **Closed-by-default**: Extended anthro, Lifestyle, Biomarkers, Medications, Constitutional, Allergens, Disease tags — all collapsed to reduce visual noise
- [x] **Smart defaults in `readInputs()`** — blank values fall back to safe assumptions: name→"Patient", age→30, height→170/160 (M/F), weight→70/60, activity→Moderate, goal→Maintenance, diet→VEG, region→Pan-Indian, budget→Standard
- [x] **Cooking time default → "No limit"** (was "≤20 min" which was silently filtering most lunch/dinner items)
- [x] **Region default → "Pan-Indian"** (was "South Indian"; "Pan" gives the widest scoring pool by default)
- [x] **Cook-time filter softened** — now allows up to 1.5× the preference instead of hard cutoff (pool never collapses)

---

## ✅ Checkpoint 0 — Scaffold (DONE)
## ✅ Checkpoint 1 — Inputs UI (DONE — extended)
- [x] Identity, biometrics, activity, goal
- [x] **Extended anthropometry (waist/hip/body-fat %)** — collapsible section
- [x] **Lifestyle inputs (sleep, stress, caffeine, alcohol)** — feeds dos/don'ts
- [x] **Biomarkers (12 labs: HbA1c/FBS/LDL/TG/Hb/TSH/eGFR/uric/BP/Vit D/B12)** — auto-derive disease tags + severity modulation
- [x] **Medications chip (12 common)** — drug-nutrient interactions
- [x] **Constitutional / Ayurvedic dosha selector** — Vata/Pitta/Kapha + duals
- [x] **Cooking time tier** (≤10/20/45/no-limit) — filters food pool
- [x] **Intermittent fasting window** (12:12 / 14:10 / 16:8 / OMAD / 5:2) — redistributes slot kcal
- [x] Diet type (incl. SATTVIC), region, allergens, ~60 disease tags (11 groups), dislikes, budget

## ✅ Checkpoint 2 — Generator core (DONE — full)
- [x] Mifflin-St Jeor BMR + TDEE
- [x] 16 goal variants with kcal/protein/GI tuning
- [x] **Hard-cap re-swap iteration** (up to 3 fallbacks: drop region → drop budget → drop cook time)
- [x] Slot kcal split with IF-window redistribution
- [x] Variety rotation via `used[]` day-gap scoring
- [x] **Dosha-biased food scoring** (Vata/Pitta/Kapha boost & penalty)

## ✅ Checkpoint 3 — Food DB (DONE for v0; ~140 entries)
- [x] ~140 curated foods with extended metadata (oxalate, purine, sodium, FODMAP, tyramine, goitrogen, vit-K, iron, calcium, omega-3, soluble-fibre, prep-time, temperament)
- [x] ~30 hand-curated substitutions
- (Scale to 500+ requires external JSON file — intentionally not done to preserve single-file constraint)

## ✅ Checkpoint 4 — Output UI (DONE)
- [x] Headline summary, 7×7 grid, per-day totals, tabs
- [x] Grocery list (aisle-grouped)
- [x] Weekly rollup
- [x] **Saved Plans tab** showing all versions for the current patient
- [x] Condition-driven Do's & Don'ts (60 conditions + lifestyle-driven additions)

## ✅ Checkpoint 5 — Print + export (DONE)
- [x] Print / Save PDF with `@page A4` + 8mm margins + 4-column grocery + page-break
- [x] JSON export
- [x] Regenerate (keep locks) + Fresh Regenerate
- [x] **Tighter print CSS** — body font 9pt, condensed grid, 4-column grocery for 2-page target

## ✅ Checkpoint 6 — Rule engine breadth (DONE — full)
- [x] All ~60 disease tags wired to `DISEASE_RULES` with filter/note/dos/donts
- [x] **Drug-nutrient interactions** (Warfarin/MAOI/Statin/Levothyroxine/Metformin/PPI/Steroid/Diuretic/Iron/Insulin/Lithium/SSRI)
- [x] **Ayurvedic dosha biasing** — Vata/Pitta/Kapha each boost/penalize foods via name + temperament
- [x] **Biomarker-driven severity modulation** — HbA1c ≥8.5% tightens GI cap to 50; LDL ≥160 adds sat-fat warning; eGFR <30 escalates to CKD-3 rule; TG ≥500 urgent flag

## ✅ Checkpoint 7 — Interactivity (DONE — full)
- [x] Click item → swap modal with top-3 subs + Lock + Remove + **✏️ Edit values** (free-text override of name/qty/kcal/macros)
- [x] Per-day 🔄 regenerate
- [x] **Day-mode menu (⋯)**: Cheat day (+200 kcal no GI cap), Make veg today, Lighter day (-300 kcal), Clear mode
- [x] Per-item lock 🔒 / remove 🗑
- [x] Per-slot free-text doctor notes
- [x] Whole-week regenerate (keep locks) + fresh regenerate

## ✅ Checkpoint 8 — Persistence (DONE — full)
- [x] `localStorage` recent patients (last 10) with header dropdown
- [x] **`localStorage` auto-save of current plan** — survives page refresh
- [x] **Named save-as plans** — `💾 Save plan as…` button → header `Saved` dropdown
- [x] **Diff v1 vs v2 viewer** — `⇆ Diff` button → side-by-side day/slot comparison with added/removed highlighting

## ✅ Checkpoint 9 — Data scale-up (DONE for v0)
- [x] Food DB ~140 entries with 16+ metadata fields per food
- [x] ~30 substitutions inline
- [x] All metadata fields used by rule engine

## ✅ Checkpoint 10 — Polish (DONE — substantial)
- [x] Print: `@page A4`, 8mm margins, page-break-after per tab pane, 4-column grocery
- [x] ARIA roles on modals, tabs, chips
- [x] HTML-escape all user-controlled strings
- [x] ESC closes modal
- [x] Event delegation for grid item clicks (no inline onclick with quoted JSON)
- [x] **Golden scenario presets (7)** — Diabetic veg, PCOS veg, HTN non-veg, Pregnancy T3, Elderly osteo+constipation, CKD-early diabetic, Migraine+anxiety
- [x] Day-mode color coding (cheat=amber, veg=green, lighter=blue, fast=tagged)

---

## Status snapshot — 2026-05-21 (v1.0-local complete)

| Area | State |
|---|---|
| Inputs | 15 of 15 PRD §6 groups represented (some abbreviated) |
| Generator | Mifflin + 16 goals + IF-window + dosha + biomarker severity + hard-cap re-swap |
| Rule engine | ~60 disease tags + 12 meds + 3 doshas + 12 biomarkers |
| Food DB | ~140 inline entries with 16+ metadata fields each |
| Interactivity | Swap · Edit · Lock · Remove · Per-day regen · Day modes · Slot notes |
| Persistence | Recents + auto-save current + named save-as + diff viewer |
| Print | A4 with page-break, 4-column grocery |
| A11y | ARIA, ESC, focus rings, event delegation |
| Presets | 7 golden scenarios for testing |

## What's still NOT in this local app (intentional)

These require leaving the single-file constraint:
- External `foods.json` and scale to ≥ 500 foods (PRD target)
- Multi-user / multi-clinic backend
- WhatsApp delivery pipeline
- Tokenised patient HTML mirror
- LLM regionalisation
- Audit log / version retention in a real database

Everything else from PRD §6-§10 is implemented or has a stub.
