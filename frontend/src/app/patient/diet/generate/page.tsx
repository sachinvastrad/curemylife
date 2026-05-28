'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, ChevronLeft, ChevronRight, AlertCircle, User, Activity,
  Utensils, HeartPulse, FlaskConical, Check, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { dietApi } from '@/lib/api';
import { gsap, registerGSAP } from '@/lib/animation/gsap';
import { useMotion } from '@/lib/animation/preferences';
import AnimatedNumber from '@/components/motion/AnimatedNumber';

// ===================== DATA =====================

const DIET_TYPES = ['VEG', 'EGGETARIAN', 'NON_VEG', 'VEGAN', 'JAIN', 'SATVIK'];
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary',  desc: 'Desk job, little exercise' },
  { value: 'light',     label: 'Light',      desc: '1–3 days / week' },
  { value: 'moderate',  label: 'Moderate',   desc: '3–5 days / week' },
  { value: 'heavy',     label: 'Heavy',      desc: '6–7 days, hard workouts' },
  { value: 'athlete',   label: 'Athlete',    desc: '2× daily training' },
];
const FASTING_WINDOWS = ['none', '12:12', '14:10', '16:8', 'OMAD', '5:2'];
const BUDGET_TIERS = [
  { value: 'bare_minimum', label: 'Bare min' },
  { value: 'economy',      label: 'Economy' },
  { value: 'standard',     label: 'Standard' },
  { value: 'premium',      label: 'Premium' },
  { value: 'no_constraint', label: 'No limit' },
];
const COOKING_TIMES = [
  { value: 'le10',     label: '≤10 min' },
  { value: 'le20',     label: '≤20 min' },
  { value: 'le45',     label: '≤45 min' },
  { value: 'no_limit', label: 'No limit' },
];
const COMMON_ALLERGENS = ['milk', 'egg', 'peanut', 'tree_nuts', 'wheat', 'soy', 'fish', 'shellfish'];
const PREGNANCY_STATUSES = [
  { value: 'none', label: 'Not pregnant' },
  { value: 't1',   label: '1st Trimester' },
  { value: 't2',   label: '2nd Trimester' },
  { value: 't3',   label: '3rd Trimester' },
  { value: 'lactating_0_6',  label: 'Breastfeeding (0–6 mo)' },
  { value: 'lactating_6_12', label: 'Breastfeeding (6–12 mo)' },
];
const AYURVEDIC_TYPES = [
  { value: '',         label: 'Not specified' },
  { value: 'vata',     label: 'Vata' },
  { value: 'pitta',    label: 'Pitta' },
  { value: 'kapha',    label: 'Kapha' },
  { value: 'vata_pitta',  label: 'Vata-Pitta' },
  { value: 'pitta_kapha', label: 'Pitta-Kapha' },
  { value: 'vata_kapha',  label: 'Vata-Kapha' },
  { value: 'tridoshic',   label: 'Tridoshic' },
];
const MEDICATIONS = [
  'metformin', 'insulin', 'sulphonylurea', 'warfarin', 'levothyroxine',
  'statin', 'maoi', 'ppi', 'steroid', 'diuretic',
];
const DISEASE_GROUPS = [
  { group: 'Endocrine',         tags: ['diabetes_t2', 'pre_diabetes', 'hypothyroid', 'hyperthyroid', 'pcos'] },
  { group: 'Cardiovascular',    tags: ['hypertension', 'high_ldl', 'high_tg', 'heart_health'] },
  { group: 'Gastrointestinal',  tags: ['ibs_d', 'ibs_c', 'gerd', 'fatty_liver', 'constipation'] },
  { group: 'Musculoskeletal',   tags: ['gout', 'arthritis', 'osteoporosis'] },
  { group: 'Kidney',            tags: ['ckd_early', 'kidney_stone_oxalate'] },
  { group: 'Other',             tags: ['weight_loss', 'weight_gain', 'muscle_gain', 'anaemia', 'migraine'] },
];
const BIOMARKER_DEFS = [
  { marker: 'hba1c',     label: 'HbA1c',     unit: '%',         placeholder: '6.5' },
  { marker: 'fbs',       label: 'Fasting BS',unit: 'mg/dL',     placeholder: '110' },
  { marker: 'ldl',       label: 'LDL',       unit: 'mg/dL',     placeholder: '120' },
  { marker: 'tg',        label: 'Triglyc.',  unit: 'mg/dL',     placeholder: '150' },
  { marker: 'hb',        label: 'Hb',        unit: 'g/dL',      placeholder: '12' },
  { marker: 'tsh',       label: 'TSH',       unit: 'mIU/L',     placeholder: '3.5' },
  { marker: 'egfr',      label: 'eGFR',      unit: 'mL/min',    placeholder: '85' },
  { marker: 'uric_acid', label: 'Uric Acid', unit: 'mg/dL',     placeholder: '5.5' },
  { marker: 'vit_d',     label: 'Vit D',     unit: 'ng/mL',     placeholder: '30' },
  { marker: 'b12',       label: 'B12',       unit: 'pg/mL',     placeholder: '400' },
];

// ===================== STATE TYPES =====================

interface BiomarkerEntry { marker: string; value: string; unit: string; }

interface FormState {
  age: number; gender: string; heightCm: number; weightKg: number; targetWeightKg: number;
  activityLevel: string; dietType: string; fastingWindow: string;
  cuisineRegion: string; budgetTier: string; cookingTimeTier: string;
  allergens: string[]; foodDislikes: string;
  diseaseTags: string[]; biomarkers: BiomarkerEntry[]; medications: string[];
  pregnancyStatus: string; ayurvedicPrakriti: string;
  sleepHoursAvg: number; stressLevel: string; waterIntakeL: number;
}

const DEFAULT_FORM: FormState = {
  age: 30, gender: 'female', heightCm: 160, weightKg: 65, targetWeightKg: 0,
  activityLevel: 'light', dietType: 'VEG', fastingWindow: 'none',
  cuisineRegion: '', budgetTier: 'standard', cookingTimeTier: 'le45',
  allergens: [], foodDislikes: '',
  diseaseTags: [], biomarkers: BIOMARKER_DEFS.map((b) => ({ marker: b.marker, value: '', unit: b.unit })),
  medications: [], pregnancyStatus: 'none', ayurvedicPrakriti: '',
  sleepHoursAvg: 7, stressLevel: 'moderate', waterIntakeL: 2,
};

const STEPS = [
  { key: 'basics',      title: 'About you',    Icon: User,        desc: 'Age, height, weight' },
  { key: 'lifestyle',   title: 'How you live', Icon: Activity,    desc: 'Diet, activity, fasting' },
  { key: 'food',        title: 'Food prefs',   Icon: Utensils,    desc: 'Allergies & dislikes' },
  { key: 'health',      title: 'Health',       Icon: HeartPulse,  desc: 'Conditions & meds' },
  { key: 'labs',        title: 'Labs',         Icon: FlaskConical,desc: 'Recent test values' },
  { key: 'review',      title: 'Review',       Icon: Check,       desc: 'Confirm & generate' },
];

// ===================== MAIN =====================

export default function PatientDietGeneratePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { enabled: motionOn } = useMotion();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const slideRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user, router]);

  // Pre-fill from the authenticated patient profile (best-effort).
  useEffect(() => {
    if (!user || user.role !== 'patient') return;
    const u = user as any;
    setForm((f) => ({
      ...f,
      age:              u.age              || f.age,
      gender:           u.gender           || f.gender,
      heightCm:         u.heightCm         || f.heightCm,
      weightKg:         u.currentWeightKg  || f.weightKg,
      targetWeightKg:   u.targetWeightKg   || f.targetWeightKg,
      activityLevel:    u.activityLevel    || f.activityLevel,
      dietType:         u.dietType         || f.dietType,
      cuisineRegion:    u.cuisineRegion    || f.cuisineRegion,
      budgetTier:       u.budgetTier       || f.budgetTier,
      cookingTimeTier:  u.cookingTimeTier  || f.cookingTimeTier,
      allergens:        u.allergens        || f.allergens,
      fastingWindow:    u.fastingWindow    || f.fastingWindow,
      pregnancyStatus:  u.pregnancyStatus  || f.pregnancyStatus,
      ayurvedicPrakriti:u.ayurvedicPrakriti|| f.ayurvedicPrakriti,
      sleepHoursAvg:    u.sleepHoursAvg    || f.sleepHoursAvg,
      stressLevel:      u.stressLevel      || f.stressLevel,
      waterIntakeL:     u.waterIntakeL     || f.waterIntakeL,
    }));
  }, [user]);

  // Slide animation on step change
  useEffect(() => {
    if (!motionOn || !slideRef.current) return;
    registerGSAP();
    const tween = gsap.fromTo(
      slideRef.current,
      { x: 24, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.45, ease: 'expo.out' },
    );
    return () => { tween.kill(); };
  }, [step, motionOn]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleArray = (key: 'allergens' | 'diseaseTags' | 'medications', val: string) => {
    setForm((f) => {
      const arr = f[key] as string[];
      return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  };

  const stepValid = useMemo(() => {
    if (step === 0) return form.age > 0 && form.heightCm > 0 && form.weightKg > 0;
    return true;
  }, [step, form.age, form.heightCm, form.weightKg]);

  const next = () => { if (stepValid && step < STEPS.length - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const submit = async () => {
    setGenerating(true);
    setError('');
    try {
      const payload = {
        patientId: (user as any)?.sub || (user as any)?.id || '',
        age: form.age,
        gender: form.gender,
        heightCm: form.heightCm || undefined,
        weightKg: form.weightKg || undefined,
        targetWeightKg: form.targetWeightKg || undefined,
        activityLevel: form.activityLevel,
        dietType: form.dietType,
        fastingWindow: form.fastingWindow !== 'none' ? form.fastingWindow : undefined,
        cuisineRegion: form.cuisineRegion || undefined,
        budgetTier: form.budgetTier,
        cookingTimeTier: form.cookingTimeTier,
        allergens: form.allergens.length ? form.allergens : undefined,
        foodDislikes: form.foodDislikes ? form.foodDislikes.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        diseaseTags: form.diseaseTags.length ? form.diseaseTags : undefined,
        biomarkers: form.biomarkers
          .filter((b) => b.value)
          .map((b) => ({ marker: b.marker, value: parseFloat(b.value), unit: b.unit })),
        medications: form.medications.length ? form.medications : undefined,
        pregnancyStatus: form.pregnancyStatus !== 'none' ? form.pregnancyStatus : undefined,
        ayurvedicPrakriti: form.ayurvedicPrakriti || undefined,
        sleepHoursAvg: form.sleepHoursAvg || undefined,
        stressLevel: form.stressLevel || undefined,
        waterIntakeL: form.waterIntakeL || undefined,
        persist: true,
      };
      await dietApi.generate(payload);
      router.push('/patient/diet');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading) {
    return <DashboardLayout><div className="flex justify-center py-20"><div className="spinner" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <Header />
        <Stepper step={step} onJump={(i) => i <= step + 1 && setStep(Math.min(i, step))} />
        {error && (
          <div
            className="card mb-4 flex items-start gap-3"
            style={{ borderColor: 'var(--error)', background: 'rgba(239,68,68,0.08)' }}
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--error)' }} />
            <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
          </div>
        )}

        <div ref={slideRef} className="card mb-4">
          {step === 0 && <StepBasics form={form} set={set} />}
          {step === 1 && <StepLifestyle form={form} set={set} />}
          {step === 2 && <StepFood form={form} set={set} toggleArray={toggleArray} />}
          {step === 3 && <StepHealth form={form} set={set} toggleArray={toggleArray} />}
          {step === 4 && <StepLabs form={form} set={set} />}
          {step === 5 && <StepReview form={form} />}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0 || generating}
            className="btn btn-ghost inline-flex"
            style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step === 0 && (
            <button
              type="button"
              onClick={submit}
              disabled={!stepValid || generating}
              className="btn btn-ghost"
              title="Skip optional questions and generate a plan from defaults"
            >
              <Zap className="w-4 h-4 inline mr-1" /> Quick generate
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              disabled={!stepValid || generating}
              className="btn btn-primary inline-flex"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={generating}
              className="btn btn-primary btn-lg inline-flex"
            >
              {generating
                ? (<><div className="spinner" style={{ width: 16, height: 16 }} /> Building…</>)
                : (<><Zap className="w-4 h-4" /> Generate my plan</>)}
            </button>
          )}
        </div>

        {!stepValid && step === 0 && (
          <div className="text-xs mt-2 text-right" style={{ color: 'var(--text-muted)' }}>
            Add age, height, and weight to continue.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ===================== HEADER =====================

function Header() {
  return (
    <header className="mb-5">
      <div className="inline-flex items-center gap-1.5 badge badge-primary mb-2">
        <Sparkles className="w-3 h-3" /> Magic Diet
      </div>
      <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Build your diet plan
      </h1>
      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
        Answer a few quick questions. We&rsquo;ll do the rest.
      </p>
    </header>
  );
}

// ===================== STEPPER =====================

function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  const pct = ((step + 1) / STEPS.length) * 100;
  const barRef = useRef<HTMLDivElement | null>(null);
  const { enabled: motionOn } = useMotion();

  useEffect(() => {
    if (!barRef.current) return;
    if (!motionOn) { barRef.current.style.width = `${pct}%`; return; }
    registerGSAP();
    const tween = gsap.to(barRef.current, { width: `${pct}%`, duration: 0.5, ease: 'expo.out' });
    return () => { tween.kill(); };
  }, [pct, motionOn]);

  const current = STEPS[step];
  return (
    <div className="mb-5">
      {/* Progress bar */}
      <div
        className="h-1.5 rounded-full mb-3 overflow-hidden"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div
          ref={barRef}
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--primary), var(--primary-light))', width: 0 }}
        />
      </div>
      {/* Step labels */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const done = i < step;
          const on   = i === step;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onJump(i)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0 transition"
              style={{
                background: on ? 'rgba(14,124,107,0.15)' : 'transparent',
                color: on ? 'var(--primary-light)' : done ? 'var(--text-secondary)' : 'var(--text-muted)',
                cursor: i <= step + 1 ? 'pointer' : 'default',
              }}
              disabled={i > step + 1}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{
                  background: done ? 'var(--primary)' : on ? 'var(--primary-light)' : 'var(--bg-surface)',
                  color: done || on ? '#fff' : 'var(--text-muted)',
                }}
              >
                {done ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className="text-xs font-medium">{s.title}</span>
            </button>
          );
        })}
      </div>
      {/* Current step blurb */}
      <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Step {step + 1} of {STEPS.length} · {current.desc}
      </div>
    </div>
  );
}

// ===================== STEP COMPONENTS =====================

interface StepProps<K extends keyof FormState = keyof FormState> {
  form: FormState;
  set: <Key extends K>(k: Key, v: FormState[Key]) => void;
  toggleArray?: (k: 'allergens' | 'diseaseTags' | 'medications', v: string) => void;
}

function StepBasics({ form, set }: StepProps) {
  const bmi = form.heightCm && form.weightKg ? form.weightKg / ((form.heightCm / 100) ** 2) : 0;
  const bmiLabel = bmi === 0 ? '' : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const bmiColor = bmi === 0 ? 'var(--text-muted)' : bmi < 18.5 ? '#f59e0b' : bmi < 25 ? '#22c55e' : bmi < 30 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-5">
      <SectionTitle Icon={User} title="About you" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Age">
          <input type="number" min={1} max={120} className="input w-full"
            value={form.age} onChange={(e) => set('age', parseInt(e.target.value) || 0)} />
        </Field>
        <Field label="Gender">
          <select className="input w-full" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Height (cm)">
          <input type="number" className="input w-full"
            value={form.heightCm || ''} placeholder="165"
            onChange={(e) => set('heightCm', parseFloat(e.target.value) || 0)} />
        </Field>
        <Field label="Current weight (kg)">
          <input type="number" className="input w-full"
            value={form.weightKg || ''} placeholder="65"
            onChange={(e) => set('weightKg', parseFloat(e.target.value) || 0)} />
        </Field>
        <Field label="Target weight (kg)" help="Optional — leave blank to maintain">
          <input type="number" className="input w-full"
            value={form.targetWeightKg || ''} placeholder="60"
            onChange={(e) => set('targetWeightKg', parseFloat(e.target.value) || 0)} />
        </Field>
      </div>

      {bmi > 0 && (
        <div
          className="rounded-xl p-4 flex items-center gap-4"
          style={{ background: 'var(--bg-surface)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ background: `${bmiColor}22`, color: bmiColor }}
          >
            <AnimatedNumber value={bmi} decimals={1} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>BMI</div>
            <div className="font-semibold" style={{ color: bmiColor }}>{bmiLabel}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepLifestyle({ form, set }: StepProps) {
  return (
    <div className="space-y-5">
      <SectionTitle Icon={Activity} title="How you live" />

      <Field label="Diet type">
        <div className="flex flex-wrap gap-2">
          {DIET_TYPES.map((dt) => (
            <Chip key={dt} active={form.dietType === dt} onClick={() => set('dietType', dt)}>{dt}</Chip>
          ))}
        </div>
      </Field>

      <Field label="Activity level">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ACTIVITY_LEVELS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => set('activityLevel', a.value)}
              className="text-left p-3 rounded-lg transition"
              style={{
                background: form.activityLevel === a.value ? 'rgba(14,124,107,0.12)' : 'var(--bg-surface)',
                border: `1px solid ${form.activityLevel === a.value ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{a.label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.desc}</div>
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Cuisine / region" help="e.g. south_indian">
          <input className="input w-full" value={form.cuisineRegion}
            onChange={(e) => set('cuisineRegion', e.target.value)} placeholder="south_indian" />
        </Field>
        <Field label="Fasting window">
          <div className="flex flex-wrap gap-2">
            {FASTING_WINDOWS.map((fw) => (
              <Chip key={fw} active={form.fastingWindow === fw} onClick={() => set('fastingWindow', fw)}>{fw}</Chip>
            ))}
          </div>
        </Field>
        <Field label="Budget">
          <div className="flex flex-wrap gap-2">
            {BUDGET_TIERS.map((b) => (
              <Chip key={b.value} active={form.budgetTier === b.value} onClick={() => set('budgetTier', b.value)}>{b.label}</Chip>
            ))}
          </div>
        </Field>
        <Field label="Max cooking time">
          <div className="flex flex-wrap gap-2">
            {COOKING_TIMES.map((c) => (
              <Chip key={c.value} active={form.cookingTimeTier === c.value} onClick={() => set('cookingTimeTier', c.value)}>{c.label}</Chip>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

function StepFood({ form, set, toggleArray }: StepProps) {
  return (
    <div className="space-y-5">
      <SectionTitle Icon={Utensils} title="Food preferences" />

      <Field label="Allergies" help="Tap to toggle">
        <div className="flex flex-wrap gap-2">
          {COMMON_ALLERGENS.map((a) => (
            <Chip key={a} variant="error" active={form.allergens.includes(a)} onClick={() => toggleArray!('allergens', a)}>{a}</Chip>
          ))}
        </div>
      </Field>

      <Field label="Foods you dislike" help="Comma-separated; we&rsquo;ll avoid them">
        <input className="input w-full" value={form.foodDislikes}
          onChange={(e) => set('foodDislikes', e.target.value)} placeholder="brinjal, bitter gourd" />
      </Field>
    </div>
  );
}

function StepHealth({ form, set, toggleArray }: StepProps) {
  return (
    <div className="space-y-5">
      <SectionTitle Icon={HeartPulse} title="Health" subtitle="Everything here is optional" />

      <Field label="Conditions">
        {DISEASE_GROUPS.map((g) => (
          <div key={g.group} className="mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{g.group}</div>
            <div className="flex flex-wrap gap-2">
              {g.tags.map((t) => (
                <Chip key={t} variant="warning" active={form.diseaseTags.includes(t)} onClick={() => toggleArray!('diseaseTags', t)}>
                  {t.replace(/_/g, ' ')}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </Field>

      <Field label="Current medications">
        <div className="flex flex-wrap gap-2">
          {MEDICATIONS.map((m) => (
            <Chip key={m} variant="warning" active={form.medications.includes(m)} onClick={() => toggleArray!('medications', m)}>{m}</Chip>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Pregnancy / lactation">
          <select className="input w-full" value={form.pregnancyStatus} onChange={(e) => set('pregnancyStatus', e.target.value)}>
            {PREGNANCY_STATUSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Ayurvedic prakriti">
          <select className="input w-full" value={form.ayurvedicPrakriti} onChange={(e) => set('ayurvedicPrakriti', e.target.value)}>
            {AYURVEDIC_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Sleep (hrs / night)">
          <input type="number" min={4} max={12} step={0.5} className="input w-full"
            value={form.sleepHoursAvg} onChange={(e) => set('sleepHoursAvg', parseFloat(e.target.value))} />
        </Field>
        <Field label="Stress">
          <select className="input w-full" value={form.stressLevel} onChange={(e) => set('stressLevel', e.target.value)}>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </Field>
        <Field label="Water (L / day)">
          <input type="number" min={0.5} max={6} step={0.5} className="input w-full"
            value={form.waterIntakeL} onChange={(e) => set('waterIntakeL', parseFloat(e.target.value))} />
        </Field>
      </div>
    </div>
  );
}

function StepLabs({ form, set }: StepProps) {
  return (
    <div className="space-y-5">
      <SectionTitle Icon={FlaskConical} title="Recent lab values" subtitle="Optional — sharpens recommendations" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BIOMARKER_DEFS.map((b, i) => (
          <div
            key={b.marker}
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{b.label}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{b.unit}</div>
            </div>
            <input
              className="input w-20 text-sm"
              type="number"
              placeholder={b.placeholder}
              value={form.biomarkers[i]?.value || ''}
              onChange={(e) => {
                const next = [...form.biomarkers];
                next[i] = { ...next[i], value: e.target.value };
                set('biomarkers', next);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StepReview({ form }: { form: FormState }) {
  const items: { label: string; value: string }[] = [
    { label: 'Diet',     value: form.dietType },
    { label: 'Activity', value: form.activityLevel },
    { label: 'Fasting',  value: form.fastingWindow },
    { label: 'Budget',   value: form.budgetTier },
  ];
  return (
    <div className="space-y-5">
      <SectionTitle Icon={Check} title="Ready to generate" />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        We&rsquo;ll build a 7-day plan tailored to you. You can re-run this any time.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((it) => (
          <div key={it.label} className="p-3 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{it.label}</div>
            <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{it.value}</div>
          </div>
        ))}
      </div>

      {form.diseaseTags.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Conditions</div>
          <div className="flex flex-wrap gap-1.5">
            {form.diseaseTags.map((t) => (
              <span key={t} className="badge badge-warning text-xs">{t.replace(/_/g, ' ')}</span>
            ))}
          </div>
        </div>
      )}
      {form.allergens.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Allergies</div>
          <div className="flex flex-wrap gap-1.5">
            {form.allergens.map((a) => (
              <span key={a} className="badge badge-error text-xs">{a}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== UI HELPERS =====================

function SectionTitle({ Icon, title, subtitle }: { Icon: any; title: string; subtitle?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        <Icon className="w-5 h-5" style={{ color: 'var(--primary-light)' }} />
        {title}
      </div>
      {subtitle && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      )}
    </div>
  );
}

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</label>
      {children}
      {help && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{help}</div>}
    </div>
  );
}

function Chip({
  children, active, onClick, variant = 'primary',
}: {
  children: React.ReactNode; active: boolean; onClick: () => void;
  variant?: 'primary' | 'warning' | 'error';
}) {
  const tint = variant === 'warning' ? '#f59e0b' : variant === 'error' ? '#ef4444' : 'var(--primary-light)';
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium transition"
      style={{
        background: active ? `${variant === 'primary' ? 'rgba(14,124,107,0.15)' : variant === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'}` : 'transparent',
        border: `1px solid ${active ? tint : 'var(--border)'}`,
        color: active ? tint : 'var(--text-muted)',
      }}
    >
      {children}
    </button>
  );
}
