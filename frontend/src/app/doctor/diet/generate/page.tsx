'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { dietApi } from '@/lib/api';
import { Zap, ChevronDown, ChevronUp, AlertCircle, User, Activity, Utensils, HeartPulse, FlaskConical, Info } from 'lucide-react';

// ===================== CONSTANTS =====================

const DIET_TYPES = ['VEG', 'EGGETARIAN', 'NON_VEG', 'VEGAN', 'JAIN', 'SATVIK'];
const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (desk job, no exercise)' },
  { value: 'light', label: 'Light (1–3 days/week exercise)' },
  { value: 'moderate', label: 'Moderate (3–5 days/week)' },
  { value: 'heavy', label: 'Heavy (6–7 days, hard workouts)' },
  { value: 'athlete', label: 'Athlete (2× training)' },
];
const FASTING_WINDOWS = ['none', '12:12', '14:10', '16:8', 'OMAD', '5:2'];
const BUDGET_TIERS = [
  { value: 'bare_minimum', label: 'Bare Minimum' },
  { value: 'economy', label: 'Economy' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'no_constraint', label: 'No Constraint' },
];
const COOKING_TIMES = [
  { value: 'le10', label: '≤10 min' },
  { value: 'le20', label: '≤20 min' },
  { value: 'le45', label: '≤45 min' },
  { value: 'no_limit', label: 'No limit' },
];
const COMMON_ALLERGENS = ['milk', 'egg', 'peanut', 'tree_nuts', 'wheat', 'soy', 'fish', 'shellfish'];
const PREGNANCY_STATUSES = [
  { value: 'none', label: 'Not pregnant' },
  { value: 't1', label: '1st Trimester' },
  { value: 't2', label: '2nd Trimester' },
  { value: 't3', label: '3rd Trimester' },
  { value: 'lactating_0_6', label: 'Breastfeeding (0–6 months)' },
  { value: 'lactating_6_12', label: 'Breastfeeding (6–12 months)' },
];
const AYURVEDIC_TYPES = [
  { value: '', label: 'Not specified' },
  { value: 'vata', label: 'Vata' },
  { value: 'pitta', label: 'Pitta' },
  { value: 'kapha', label: 'Kapha' },
  { value: 'vata_pitta', label: 'Vata-Pitta' },
  { value: 'pitta_kapha', label: 'Pitta-Kapha' },
  { value: 'vata_kapha', label: 'Vata-Kapha' },
  { value: 'tridoshic', label: 'Tridoshic' },
];
const MEDICATIONS = [
  'metformin', 'insulin', 'sulphonylurea', 'warfarin', 'levothyroxine',
  'statin', 'maoi', 'ppi', 'steroid', 'diuretic',
];
const DISEASE_TAGS = [
  // Endocrine
  { group: 'Endocrine', tags: ['diabetes_t2', 'pre_diabetes', 'hypothyroid', 'hyperthyroid', 'pcos', 'adrenal_disorder'] },
  // Cardio
  { group: 'Cardiovascular', tags: ['hypertension', 'high_ldl', 'high_tg', 'heart_health', 'cardiovascular', 'post_mi'] },
  // GI
  { group: 'Gastrointestinal', tags: ['ibs_d', 'ibs_c', 'gerd', 'ibd', 'fatty_liver', 'constipation'] },
  // MSK
  { group: 'Musculoskeletal', tags: ['gout', 'arthritis', 'osteoporosis', 'osteoarthritis'] },
  // Kidney
  { group: 'Kidney', tags: ['ckd_early', 'ckd_stage4', 'kidney_stone_oxalate', 'hyperkalemia'] },
  // Blood
  { group: 'Haematology', tags: ['anaemia', 'iron_deficiency', 'b12_deficiency', 'vit_d_deficiency'] },
  // Skin
  { group: 'Skin & Allergy', tags: ['eczema', 'psoriasis', 'urticaria', 'acne'] },
  // Neuro
  { group: 'Neurological', tags: ['migraine', 'anxiety', 'insomnia'] },
  // Oncology
  { group: 'Oncology', tags: ['cancer_support', 'post_chemo'] },
  // Other
  { group: 'Other', tags: ['weight_loss', 'weight_gain', 'muscle_gain', 'general', 'pregnancy', 'elderly'] },
];
const BIOMARKER_DEFS = [
  { marker: 'hba1c', label: 'HbA1c', unit: '%', placeholder: '6.5' },
  { marker: 'fbs', label: 'Fasting Blood Sugar', unit: 'mg/dL', placeholder: '110' },
  { marker: 'ldl', label: 'LDL Cholesterol', unit: 'mg/dL', placeholder: '120' },
  { marker: 'tg', label: 'Triglycerides', unit: 'mg/dL', placeholder: '150' },
  { marker: 'hb', label: 'Haemoglobin', unit: 'g/dL', placeholder: '12' },
  { marker: 'tsh', label: 'TSH', unit: 'mIU/L', placeholder: '3.5' },
  { marker: 'egfr', label: 'eGFR', unit: 'mL/min/1.73m²', placeholder: '85' },
  { marker: 'uric_acid', label: 'Uric Acid', unit: 'mg/dL', placeholder: '5.5' },
  { marker: 'vit_d', label: 'Vitamin D', unit: 'ng/mL', placeholder: '30' },
  { marker: 'b12', label: 'Vitamin B12', unit: 'pg/mL', placeholder: '400' },
];

// ===================== FORM STATE =====================

interface BiomarkerEntry { marker: string; value: string; unit: string; }

interface FormState {
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: string;
  dietType: string;
  fastingWindow: string;
  cuisineRegion: string;
  budgetTier: string;
  cookingTimeTier: string;
  allergens: string[];
  foodDislikes: string;
  diseaseTags: string[];
  biomarkers: BiomarkerEntry[];
  medications: string[];
  pregnancyStatus: string;
  ayurvedicPrakriti: string;
  sleepHoursAvg: number;
  stressLevel: string;
  waterIntakeL: number;
  persist: boolean;
}

const DEFAULT_FORM: FormState = {
  patientId: '',
  patientName: '',
  age: 35,
  gender: 'female',
  heightCm: 160,
  weightKg: 65,
  targetWeightKg: 0,
  activityLevel: 'light',
  dietType: 'VEG',
  fastingWindow: 'none',
  cuisineRegion: '',
  budgetTier: 'standard',
  cookingTimeTier: 'le45',
  allergens: [],
  foodDislikes: '',
  diseaseTags: [],
  biomarkers: BIOMARKER_DEFS.map(b => ({ marker: b.marker, value: '', unit: b.unit })),
  medications: [],
  pregnancyStatus: 'none',
  ayurvedicPrakriti: '',
  sleepHoursAvg: 7,
  stressLevel: 'moderate',
  waterIntakeL: 2,
  persist: true,
};

// ===================== COLLAPSIBLE SECTION =====================

function Section({ title, icon: Icon, children, defaultOpen = false }: any) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card mb-4">
      <button
        type="button"
        className="w-full flex items-center justify-between py-1"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2 font-semibold">
          <Icon className="w-4 h-4" style={{ color: 'var(--primary-light)' }} />
          {title}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>{children}</div>}
    </div>
  );
}

// ===================== BMI DISPLAY =====================

function BmiDisplay({ heightCm, weightKg }: { heightCm: number; weightKg: number }) {
  if (!heightCm || !weightKg) return null;
  const bmi = weightKg / ((heightCm / 100) ** 2);
  const label = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const color = bmi < 18.5 ? 'var(--warning)' : bmi < 25 ? 'var(--success)' : bmi < 30 ? 'var(--warning)' : 'var(--error)';
  return (
    <div className="flex items-center gap-2 text-sm mt-1">
      <span style={{ color: 'var(--text-muted)' }}>BMI:</span>
      <span style={{ color, fontWeight: 600 }}>{bmi.toFixed(1)} — {label}</span>
    </div>
  );
}

// ===================== MAIN PAGE =====================

function DietGenerateInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<FormState>({
    ...DEFAULT_FORM,
    patientId: searchParams.get('patientId') || '',
    patientName: searchParams.get('patientName') || '',
    age: parseInt(searchParams.get('age') || '35'),
    gender: searchParams.get('gender') || 'female',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1=identity, 2=goal, 3=personalisation, 4=review

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'doctor')) router.push('/login');
  }, [authLoading, user]);

  const set = (key: keyof FormState, value: any) => setForm(f => ({ ...f, [key]: value }));

  const toggleArray = (key: 'allergens' | 'diseaseTags' | 'medications', val: string) => {
    setForm(f => {
      const arr = f[key] as string[];
      return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  };

  const handleGenerate = async () => {
    if (!form.patientId) { setError('Patient ID is required'); return; }
    setGenerating(true);
    setError('');
    try {
      const payload = {
        patientId: form.patientId,
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
        foodDislikes: form.foodDislikes ? form.foodDislikes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        diseaseTags: form.diseaseTags.length ? form.diseaseTags : undefined,
        biomarkers: form.biomarkers.filter(b => b.value).map(b => ({
          marker: b.marker, value: parseFloat(b.value), unit: b.unit,
        })),
        medications: form.medications.length ? form.medications : undefined,
        pregnancyStatus: form.pregnancyStatus !== 'none' ? form.pregnancyStatus : undefined,
        ayurvedicPrakriti: form.ayurvedicPrakriti || undefined,
        sleepHoursAvg: form.sleepHoursAvg || undefined,
        stressLevel: form.stressLevel || undefined,
        waterIntakeL: form.waterIntakeL || undefined,
        persist: form.persist,
      };

      const { data } = await dietApi.generate(payload);
      // Store result in sessionStorage to avoid URL length limits
      sessionStorage.setItem('dietResult', JSON.stringify(data));
      router.push(`/doctor/diet/output?patientId=${form.patientId}&patientName=${encodeURIComponent(form.patientName)}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading) return <DashboardLayout><div className="flex justify-center py-20"><div className="spinner" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="animate-in max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5" style={{ color: 'var(--primary-light)' }} />
            <h1 className="text-2xl font-bold">Magic Diet Generator</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Generate a personalised 7-day Indian meal plan in seconds
          </p>
        </div>

        {error && (
          <div className="card mb-4 flex items-start gap-3" style={{ borderColor: 'var(--error)', background: 'rgba(239,68,68,0.08)' }}>
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--error)' }} />
            <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
          </div>
        )}

        {/* Step 1 — Identity & Biometrics */}
        <Section title="Patient & Biometrics" icon={User} defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Patient ID *</label>
              <input className="input" value={form.patientId} onChange={e => set('patientId', e.target.value)} placeholder="Patient UUID" />
            </div>
            <div>
              <label className="label">Patient Name</label>
              <input className="input" value={form.patientName} onChange={e => set('patientName', e.target.value)} placeholder="Display name" />
            </div>
            <div>
              <label className="label">Age</label>
              <input className="input" type="number" min={1} max={120} value={form.age} onChange={e => set('age', parseInt(e.target.value) || 35)} />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Height (cm)</label>
              <input className="input" type="number" value={form.heightCm || ''} onChange={e => set('heightCm', parseFloat(e.target.value) || 0)} placeholder="165" />
            </div>
            <div>
              <label className="label">Current Weight (kg)</label>
              <input className="input" type="number" value={form.weightKg || ''} onChange={e => set('weightKg', parseFloat(e.target.value) || 0)} placeholder="65" />
              <BmiDisplay heightCm={form.heightCm} weightKg={form.weightKg} />
            </div>
            <div>
              <label className="label">Target Weight (kg) <span className="text-xs" style={{ color: 'var(--text-muted)' }}>optional</span></label>
              <input className="input" type="number" value={form.targetWeightKg || ''} onChange={e => set('targetWeightKg', parseFloat(e.target.value) || 0)} placeholder="60" />
            </div>
          </div>
        </Section>

        {/* Step 2 — Goal & Context */}
        <Section title="Goal, Diet Type & Activity" icon={Activity} defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Diet Type</label>
              <div className="flex flex-wrap gap-2">
                {DIET_TYPES.map(dt => (
                  <button key={dt} type="button"
                    onClick={() => set('dietType', dt)}
                    className={`badge cursor-pointer transition-all ${form.dietType === dt ? 'badge-primary' : ''}`}
                    style={form.dietType !== dt ? { border: '1px solid var(--border)', color: 'var(--text-muted)' } : {}}>
                    {dt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Activity Level</label>
              <select className="input" value={form.activityLevel} onChange={e => set('activityLevel', e.target.value)}>
                {ACTIVITY_LEVELS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cuisine / Region</label>
              <input className="input" value={form.cuisineRegion} onChange={e => set('cuisineRegion', e.target.value)} placeholder="e.g. south_indian, north_indian" />
            </div>
            <div>
              <label className="label">Fasting Window</label>
              <div className="flex flex-wrap gap-2">
                {FASTING_WINDOWS.map(fw => (
                  <button key={fw} type="button"
                    onClick={() => set('fastingWindow', fw)}
                    className={`badge cursor-pointer ${form.fastingWindow === fw ? 'badge-primary' : ''}`}
                    style={form.fastingWindow !== fw ? { border: '1px solid var(--border)', color: 'var(--text-muted)' } : {}}>
                    {fw}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Budget</label>
              <select className="input" value={form.budgetTier} onChange={e => set('budgetTier', e.target.value)}>
                {BUDGET_TIERS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Max Cooking Time</label>
              <select className="input" value={form.cookingTimeTier} onChange={e => set('cookingTimeTier', e.target.value)}>
                {COOKING_TIMES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* Step 3 — Allergens */}
        <Section title="Allergens & Food Preferences" icon={Utensils}>
          <div className="mb-4">
            <label className="label">Allergens</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGENS.map(a => (
                <button key={a} type="button"
                  onClick={() => toggleArray('allergens', a)}
                  className={`badge cursor-pointer ${form.allergens.includes(a) ? 'badge-error' : ''}`}
                  style={!form.allergens.includes(a) ? { border: '1px solid var(--border)', color: 'var(--text-muted)' } : {}}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Food Dislikes <span className="text-xs" style={{ color: 'var(--text-muted)' }}>comma-separated</span></label>
            <input className="input" value={form.foodDislikes} onChange={e => set('foodDislikes', e.target.value)} placeholder="brinjal, bitter gourd, ..." />
          </div>
        </Section>

        {/* Step 4 — Disease Tags */}
        <Section title="Conditions & Disease Tags" icon={HeartPulse}>
          {DISEASE_TAGS.map(group => (
            <div key={group.group} className="mb-4">
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{group.group}</p>
              <div className="flex flex-wrap gap-2">
                {group.tags.map(tag => (
                  <button key={tag} type="button"
                    onClick={() => toggleArray('diseaseTags', tag)}
                    className={`badge cursor-pointer text-xs ${form.diseaseTags.includes(tag) ? 'badge-warning' : ''}`}
                    style={!form.diseaseTags.includes(tag) ? { border: '1px solid var(--border)', color: 'var(--text-muted)' } : {}}>
                    {tag.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* Step 5 — Biomarkers */}
        <Section title="Recent Biomarkers (auto-derives disease tags)" icon={FlaskConical}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BIOMARKER_DEFS.map((b, i) => (
              <div key={b.marker} className="flex items-center gap-2">
                <label className="text-sm min-w-0 flex-1" style={{ color: 'var(--text-secondary)' }}>{b.label}</label>
                <input
                  className="input w-24 text-sm"
                  type="number"
                  placeholder={b.placeholder}
                  value={form.biomarkers[i]?.value || ''}
                  onChange={e => {
                    const newBio = [...form.biomarkers];
                    newBio[i] = { ...newBio[i], value: e.target.value };
                    set('biomarkers', newBio);
                  }}
                />
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{b.unit}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Step 6 — Medications */}
        <Section title="Current Medications" icon={Info}>
          <div className="flex flex-wrap gap-2">
            {MEDICATIONS.map(m => (
              <button key={m} type="button"
                onClick={() => toggleArray('medications', m)}
                className={`badge cursor-pointer text-xs ${form.medications.includes(m) ? 'badge-warning' : ''}`}
                style={!form.medications.includes(m) ? { border: '1px solid var(--border)', color: 'var(--text-muted)' } : {}}>
                {m}
              </button>
            ))}
          </div>
        </Section>

        {/* Step 7 — Constitutional */}
        <Section title="Constitutional & Reproductive" icon={User}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Pregnancy / Lactation</label>
              <select className="input" value={form.pregnancyStatus} onChange={e => set('pregnancyStatus', e.target.value)}>
                {PREGNANCY_STATUSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ayurvedic Prakriti</label>
              <select className="input" value={form.ayurvedicPrakriti} onChange={e => set('ayurvedicPrakriti', e.target.value)}>
                {AYURVEDIC_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* Step 8 — Lifestyle */}
        <Section title="Lifestyle" icon={Activity}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Sleep (hours/night)</label>
              <input className="input" type="number" min={4} max={12} step={0.5} value={form.sleepHoursAvg} onChange={e => set('sleepHoursAvg', parseFloat(e.target.value))} />
            </div>
            <div>
              <label className="label">Stress Level</label>
              <select className="input" value={form.stressLevel} onChange={e => set('stressLevel', e.target.value)}>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label">Water Intake (L/day)</label>
              <input className="input" type="number" min={0.5} max={6} step={0.5} value={form.waterIntakeL} onChange={e => set('waterIntakeL', parseFloat(e.target.value))} />
            </div>
          </div>
        </Section>

        {/* Summary + Generate */}
        <div className="card mb-6">
          <h3 className="font-semibold mb-3">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
            <div><span style={{ color: 'var(--text-muted)' }}>Diet:</span> <strong>{form.dietType}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Activity:</span> <strong>{form.activityLevel}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Fasting:</span> <strong>{form.fastingWindow}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Budget:</span> <strong>{form.budgetTier}</strong></div>
            {form.diseaseTags.length > 0 && (
              <div className="col-span-2 md:col-span-4">
                <span style={{ color: 'var(--text-muted)' }}>Conditions:</span>{' '}
                {form.diseaseTags.map(t => (
                  <span key={t} className="badge badge-warning text-xs mr-1">{t.replace(/_/g, ' ')}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.persist} onChange={e => set('persist', e.target.checked)} />
              Save chart to patient record
            </label>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !form.patientId}
            className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2"
          >
            {generating ? (
              <><div className="spinner" style={{ width: 18, height: 18 }} /> Generating...</>
            ) : (
              <><Zap className="w-4 h-4" /> Generate 7-Day Diet Plan</>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function DietGeneratePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="spinner" /></div>}>
      <DietGenerateInner />
    </Suspense>
  );
}
