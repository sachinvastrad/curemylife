'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { dietApi } from '@/lib/api';
import {
  Save, Printer, Share2, RefreshCw, ShoppingCart, CheckSquare,
  BarChart2, BookOpen, Zap, X, ArrowLeftRight, Lock, Unlock, Trash2,
  AlertTriangle, Check, ChevronLeft,
} from 'lucide-react';

// ===================== TYPES =====================

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

type DayPlan = { [slot: string]: SlotItem[] };
type WeekPlan = { [day: string]: DayPlan };

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: { [k: string]: string } = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};
const SLOTS = ['early_morning', 'breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner', 'bedtime'];
const SLOT_LABELS: { [k: string]: string } = {
  early_morning: 'Early Morning',
  breakfast: 'Breakfast',
  mid_morning: 'Mid Morning',
  lunch: 'Lunch',
  evening_snack: 'Evening Snack',
  dinner: 'Dinner',
  bedtime: 'Bedtime',
};

// ===================== HELPERS =====================

function macroColor(pct: number, target: number) {
  const ratio = pct / target;
  if (ratio < 0.85) return 'var(--warning)';
  if (ratio > 1.15) return 'var(--error)';
  return 'var(--success)';
}

function GiDot({ gi }: { gi: number | null }) {
  if (gi === null) return null;
  const color = gi <= 35 ? 'var(--success)' : gi <= 55 ? 'var(--warning)' : 'var(--error)';
  return <span title={`GI: ${gi}`} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginLeft: 4 }} />;
}

// ===================== SWAP MODAL =====================

function SwapModal({
  item, slot, dietType, diseases, allergens,
  onSwap, onClose,
}: {
  item: SlotItem; slot: string;
  dietType?: string; diseases?: string[]; allergens?: string[];
  onSwap: (newFoodId: string, newFoodName: string) => void;
  onClose: () => void;
}) {
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dietApi.swap({
      fromFoodId: item.foodId,
      slot,
      allergens: allergens || [],
      diseases: diseases || [],
      dietType: dietType,
    }).then(({ data }) => setSwaps(data))
      .catch(() => setSwaps([]))
      .finally(() => setLoading(false));
  }, [item.foodId]);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 100, background: 'rgba(0,0,0,0.6)' }}>
      <div className="card max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Swap: {item.foodName}</h3>
          <button type="button" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="spinner" /></div>
        ) : swaps.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No substitutes available</p>
        ) : (
          <div className="space-y-3">
            {swaps.map((s: any) => (
              <button key={s.toFoodId} type="button"
                className="w-full card text-left hover:border-primary transition-all"
                style={{ border: '1px solid var(--border)' }}
                onClick={() => onSwap(s.toFoodId, s.toFoodName)}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{s.toFoodName}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.reason?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="text-xs text-right ml-4" style={{ color: 'var(--text-muted)' }}>
                    <div>{s.kcalPer100g} kcal/100g</div>
                    {s.giIndex && <div>GI: {s.giIndex}</div>}
                    <div className="badge badge-success mt-1">{Math.round(s.similarityScore * 100)}% match</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== FOOD CHIP =====================

function FoodChip({
  item, slot, onSwap, onLock, onRemove,
  dietType, diseases, allergens,
}: {
  item: SlotItem; slot: string;
  onSwap: (item: SlotItem, slot: string) => void;
  onLock: () => void; onRemove: () => void;
  dietType?: string; diseases?: string[]; allergens?: string[];
}) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className="rounded-lg p-2 mb-2 text-xs relative"
      style={{
        background: item.isLocked ? 'rgba(99,102,241,0.15)' : item.isOverride ? 'rgba(34,197,94,0.1)' : 'var(--bg-dark)',
        border: `1px solid ${item.isLocked ? 'var(--primary)' : item.isOverride ? 'var(--success)' : 'var(--border)'}`,
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{item.foodName}</p>
          <p style={{ color: 'var(--text-muted)' }}>{item.portionDesc} · {item.kcal} kcal</p>
          <p style={{ color: 'var(--text-muted)' }}>P:{item.proteinG}g C:{item.carbG}g F:{item.fatG}g
            <GiDot gi={item.gi} />
          </p>
        </div>
        {hovering && (
          <div className="flex gap-1 flex-shrink-0">
            <button type="button" title="Swap" onClick={() => onSwap(item, slot)}
              className="p-1 rounded hover:bg-primary hover:text-white transition-all">
              <ArrowLeftRight className="w-3 h-3" />
            </button>
            <button type="button" title={item.isLocked ? 'Unlock' : 'Lock'} onClick={onLock}
              className="p-1 rounded hover:bg-primary hover:text-white transition-all">
              {item.isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            </button>
            <button type="button" title="Remove" onClick={onRemove}
              className="p-1 rounded hover:bg-error hover:text-white transition-all" style={{ '--hover-bg': 'var(--error)' } as any}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== MAIN PAGE =====================

export default function DietOutputPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [result, setResult] = useState<any>(null);
  const [week, setWeek] = useState<WeekPlan>({});
  const [activeTab, setActiveTab] = useState<'plan' | 'grocery' | 'dosdonts' | 'rollup'>('plan');
  const [swapTarget, setSwapTarget] = useState<{ item: SlotItem; day: string; slot: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [chartId, setChartId] = useState<string | null>(null);
  const patientId = searchParams.get('patientId') || '';
  const patientName = searchParams.get('patientName') || 'Patient';

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'doctor')) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('dietResult');
      if (raw) {
        const parsed = JSON.parse(raw);
        setResult(parsed);
        setWeek(parsed.snapshot?.week || {});
        if (parsed.chartId) setChartId(parsed.chartId);
        sessionStorage.removeItem('dietResult');
      }
    } catch { /* ignore */ }
  }, []);

  const handleSwap = (item: SlotItem, day: string, slot: string) => {
    setSwapTarget({ item, day, slot });
  };

  const applySwap = (day: string, slot: string, item: SlotItem, newFoodId: string, newFoodName: string) => {
    setWeek(prev => {
      const updated = { ...prev };
      updated[day] = { ...updated[day] };
      updated[day][slot] = updated[day][slot].map(i =>
        i.foodId === item.foodId ? { ...i, foodId: newFoodId, foodName: newFoodName, isOverride: true } : i
      );
      return updated;
    });
    setSwapTarget(null);
  };

  const toggleLock = (day: string, slot: string, foodId: string) => {
    setWeek(prev => {
      const updated = { ...prev };
      updated[day] = { ...updated[day] };
      updated[day][slot] = updated[day][slot].map(i =>
        i.foodId === foodId ? { ...i, isLocked: !i.isLocked } : i
      );
      return updated;
    });
  };

  const removeItem = (day: string, slot: string, foodId: string) => {
    setWeek(prev => {
      const updated = { ...prev };
      updated[day] = { ...updated[day] };
      updated[day][slot] = updated[day][slot].filter(i => i.foodId !== foodId);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!patientId) return;
    setSaving(true);
    try {
      const payload = {
        patientId,
        snapshot: { ...result?.snapshot, week },
        groceryList: result?.groceryList,
        patientOverrides: {},
        avgDailyKcal: result?.snapshot?.weeklyRollup?.avgDailyKcal,
        inputs: result?.inputs,
      };
      if (chartId) {
        await dietApi.updateChart(chartId, payload);
      } else {
        const { data } = await dietApi.saveChart(payload);
        setChartId(data.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!chartId && !patientId) return;
    const url = `/print/diet?chartId=${chartId}&patientId=${patientId}&patientName=${encodeURIComponent(patientName)}`;
    window.open(url, '_blank');
  };

  if (authLoading || !result) return (
    <DashboardLayout>
      <div className="flex justify-center py-20"><div className="spinner" /></div>
    </DashboardLayout>
  );

  const rollup = result.snapshot?.weeklyRollup || {};
  const dayTotals = result.snapshot?.dayTotals || {};
  const groceryList = result.groceryList || {};
  const violations = result.violations || [];
  const inputs = result.inputs || {};

  return (
    <DashboardLayout>
      <div className="animate-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <button type="button" onClick={() => router.back()} className="flex items-center gap-1 text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft className="w-4 h-4" /> Back to Generator
            </button>
            <h1 className="text-xl font-bold">7-Day Diet Plan</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {patientName} · {rollup.avgDailyKcal} kcal/day avg · Target: {rollup.targetKcal} kcal
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => router.push(`/doctor/diet/generate?patientId=${patientId}`)} className="btn btn-secondary flex items-center gap-1">
              <RefreshCw className="w-4 h-4" /> Regen
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn btn-secondary flex items-center gap-1">
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
            </button>
            <button type="button" onClick={handlePrint} className="btn btn-secondary flex items-center gap-1">
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
          </div>
        </div>

        {/* Violations banner */}
        {violations.length > 0 && (
          <div className="card mb-4 flex items-start gap-3" style={{ borderColor: 'var(--warning)', background: 'rgba(245,158,11,0.08)' }}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
                {violations.length} rule adjustment{violations.length > 1 ? 's' : ''} applied
              </p>
              <ul className="text-xs mt-1 space-y-1" style={{ color: 'var(--text-muted)' }}>
                {violations.map((v: any, i: number) => (
                  <li key={i}>• {v.replacement}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Macro traffic light */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Avg Kcal', value: rollup.avgDailyKcal, target: rollup.targetKcal, unit: 'kcal' },
            { label: 'Protein', value: rollup.avgDailyKcal ? Math.round((rollup.macroSplit?.protein_pct / 100) * rollup.avgDailyKcal / 4) : 0, target: rollup.targetProteinG, unit: 'g' },
            { label: 'Carbs', value: rollup.avgDailyKcal ? Math.round((rollup.macroSplit?.carbs_pct / 100) * rollup.avgDailyKcal / 4) : 0, target: rollup.targetCarbG, unit: 'g' },
            { label: 'Fat', value: rollup.avgDailyKcal ? Math.round((rollup.macroSplit?.fat_pct / 100) * rollup.avgDailyKcal / 9) : 0, target: rollup.targetFatG, unit: 'g' },
          ].map(m => (
            <div key={m.label} className="card text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
              <p className="text-xl font-bold" style={{ color: m.target ? macroColor(m.value, m.target) : 'var(--text-primary)' }}>
                {m.value}<span className="text-sm font-normal ml-1">{m.unit}</span>
              </p>
              {m.target && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Target: {m.target}{m.unit}</p>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {[
            { id: 'plan', label: 'Meal Plan', icon: Zap },
            { id: 'grocery', label: 'Grocery', icon: ShoppingCart },
            { id: 'dosdonts', label: "Do's & Don'ts", icon: CheckSquare },
            { id: 'rollup', label: 'Weekly Rollup', icon: BarChart2 },
          ].map(tab => (
            <button key={tab.id} type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'badge-primary' : ''}`}
              style={activeTab !== tab.id ? { color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: PLAN (7×7 grid) */}
        {activeTab === 'plan' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th className="text-left p-2 w-32" style={{ color: 'var(--text-muted)' }}>Slot</th>
                  {DAYS.map(d => (
                    <th key={d} className="p-2 text-center" style={{ color: 'var(--text-muted)' }}>
                      <div>{DAY_LABELS[d]}</div>
                      {dayTotals[d] && (
                        <div className="text-xs font-normal mt-0.5">{dayTotals[d].kcal} kcal</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map(slot => (
                  <tr key={slot} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="p-2 font-medium text-xs align-top" style={{ color: 'var(--text-secondary)', minWidth: 120 }}>
                      {SLOT_LABELS[slot]}
                    </td>
                    {DAYS.map(day => {
                      const items: SlotItem[] = week[day]?.[slot] || [];
                      return (
                        <td key={day} className="p-2 align-top" style={{ minWidth: 120, maxWidth: 160 }}>
                          {items.length === 0 ? (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                          ) : (
                            items.map(item => (
                              <FoodChip
                                key={item.foodId}
                                item={item}
                                slot={slot}
                                dietType={inputs.dietType}
                                diseases={inputs.diseaseTags}
                                allergens={inputs.allergens}
                                onSwap={(i, s) => handleSwap(i, day, s)}
                                onLock={() => toggleLock(day, slot, item.foodId)}
                                onRemove={() => removeItem(day, slot, item.foodId)}
                              />
                            ))
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: GROCERY */}
        {activeTab === 'grocery' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(groceryList).map(([aisle, items]: [string, any]) => (
              <div key={aisle} className="card">
                <h3 className="font-semibold mb-3">{aisle}</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {(items as any[]).map((item: any, i: number) => (
                      <tr key={i} style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                        <td className="py-1.5">{item.name}</td>
                        <td className="py-1.5 text-right" style={{ color: 'var(--text-muted)' }}>{item.qty}</td>
                        <td className="py-1.5 pl-3">
                          <span className="badge text-xs" style={{ opacity: 0.7 }}>{item.costTier}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {Object.keys(groceryList).length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Save the chart to generate grocery list.</p>
            )}
          </div>
        )}

        {/* TAB: DO'S & DON'TS */}
        {activeTab === 'dosdonts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Check className="w-4 h-4" style={{ color: 'var(--success)' }} /> Allowed / Recommended
              </h3>
              {result.templateUsed ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Based on selected template. Foods matching your profile appear in the plan.</p>
              ) : (
                <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <li>• Whole grains, millets, legumes</li>
                  <li>• Green leafy vegetables daily</li>
                  <li>• Seasonal fruits (low GI preferred)</li>
                  <li>• Nuts and seeds in moderation</li>
                  <li>• Fermented foods (curd, idli, dosa)</li>
                  <li>• Adequate hydration (2.5–3L/day)</li>
                </ul>
              )}
            </div>
            <div className="card">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <X className="w-4 h-4" style={{ color: 'var(--error)' }} /> Avoid
              </h3>
              <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• Ultra-processed foods</li>
                <li>• Refined sugar and sugary beverages</li>
                <li>• Deep-fried foods</li>
                <li>• Excess salt (pickles, papad, processed snacks)</li>
                {inputs.diseaseTags?.includes('diabetes_t2') && <li>• White rice, maida, instant noodles (high GI)</li>}
                {inputs.diseaseTags?.includes('hypertension') && <li>• Pickles, papad, processed meat, excess sodium</li>}
                {inputs.diseaseTags?.includes('gout') && <li>• Organ meats, sardines, alcohol</li>}
                {inputs.diseaseTags?.includes('hypothyroid') && <li>• Raw goitrogenic vegetables (uncooked cabbage, broccoli, soy)</li>}
                {inputs.medications?.includes('warfarin') && <li>• Sudden changes in Vitamin K intake (consistent GLV daily)</li>}
                {inputs.medications?.includes('statin') && <li>• Grapefruit, pomelo</li>}
              </ul>
            </div>
            <div className="card md:col-span-2">
              <h3 className="font-semibold mb-3">Lifestyle Notes</h3>
              <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• Eat at fixed times daily</li>
                <li>• Walk 20–30 min after lunch</li>
                <li>• Sleep 7–8 hours. Avoid screens 1 hour before bed.</li>
                {inputs.waterIntakeL && <li>• Drink at least {inputs.waterIntakeL || 2.5}L water daily</li>}
                {inputs.diseaseTags?.includes('diabetes_t2') && <li>• Check fasting glucose weekly. Monitor HbA1c every 3 months.</li>}
              </ul>
            </div>
          </div>
        )}

        {/* TAB: WEEKLY ROLLUP */}
        {activeTab === 'rollup' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold mb-3">Daily Calorie Summary</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }}>
                    <th className="text-left pb-2">Day</th>
                    <th className="text-right pb-2">Kcal</th>
                    <th className="text-right pb-2">Protein</th>
                    <th className="text-right pb-2">Fibre</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map(d => (
                    <tr key={d} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="py-1.5 font-medium">{DAY_LABELS[d]}</td>
                      <td className="py-1.5 text-right">{dayTotals[d]?.kcal || '—'}</td>
                      <td className="py-1.5 text-right">{dayTotals[d]?.proteinG || '—'}g</td>
                      <td className="py-1.5 text-right">{dayTotals[d]?.fiberG || '—'}g</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 600 }}>
                    <td className="py-2">Avg</td>
                    <td className="py-2 text-right">{rollup.avgDailyKcal}</td>
                    <td className="py-2 text-right"></td>
                    <td className="py-2 text-right">{rollup.avgFiberG}g</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-3">Macro Split (avg)</h3>
              {rollup.macroSplit ? (
                <div className="space-y-3">
                  {[
                    { label: 'Carbohydrates', pct: rollup.macroSplit.carbs_pct, color: '#6366f1' },
                    { label: 'Protein', pct: rollup.macroSplit.protein_pct, color: '#22c55e' },
                    { label: 'Fat', pct: rollup.macroSplit.fat_pct, color: '#f59e0b' },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{m.label}</span>
                        <span style={{ color: m.color }}>{m.pct}%</span>
                      </div>
                      <div className="w-full rounded-full" style={{ height: 6, background: 'var(--border)' }}>
                        <div className="rounded-full" style={{ height: 6, width: `${m.pct}%`, background: m.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No data</p>}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Adherence to target</span>
                  <span style={{ color: rollup.adherencePct >= 90 ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                    {rollup.adherencePct}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Swap Modal */}
      {swapTarget && (
        <SwapModal
          item={swapTarget.item}
          slot={swapTarget.slot}
          dietType={inputs.dietType}
          diseases={inputs.diseaseTags}
          allergens={inputs.allergens}
          onSwap={(newFoodId, newFoodName) => applySwap(swapTarget.day, swapTarget.slot, swapTarget.item, newFoodId, newFoodName)}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </DashboardLayout>
  );
}
