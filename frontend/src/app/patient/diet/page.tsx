'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap, Printer, Plus, Utensils, ChevronRight, Flame,
  Sunrise, Coffee, Sun, Apple, Moon, Bed, Sparkles, ShoppingBasket,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { dietApi } from '@/lib/api';
import AnimatedNumber from '@/components/motion/AnimatedNumber';
import MacroRing from '@/components/motion/MacroRing';
import { gsap, registerGSAP } from '@/lib/animation/gsap';
import { useMotion } from '@/lib/animation/preferences';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABEL: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};
const SLOT_META: Record<string, { label: string; Icon: any; tint: string }> = {
  early_morning: { label: 'Early morning', Icon: Sunrise, tint: '#f59e0b' },
  breakfast:     { label: 'Breakfast',      Icon: Coffee,  tint: '#fb923c' },
  mid_morning:   { label: 'Mid morning',    Icon: Apple,   tint: '#22c55e' },
  lunch:         { label: 'Lunch',          Icon: Sun,     tint: '#eab308' },
  evening_snack: { label: 'Evening snack',  Icon: Apple,   tint: '#84cc16' },
  dinner:        { label: 'Dinner',         Icon: Moon,    tint: '#6366f1' },
  bedtime:       { label: 'Bedtime',        Icon: Bed,     tint: '#a855f7' },
};
const SLOT_ORDER = ['early_morning', 'breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner', 'bedtime'];

export default function PatientDietPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { enabled: motionOn } = useMotion();
  const [charts, setCharts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState('mon');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role === 'patient') loadCharts();
  }, [user]);

  const loadCharts = async () => {
    try {
      const { data } = await dietApi.getCharts();
      setCharts(data.charts || []);
      if (data.charts?.length) await loadChart(data.charts[0].id);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const loadChart = async (id: string) => {
    try {
      const { data } = await dietApi.getChartById(id);
      setSelected(data);
    } catch { /* ignore */ }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        <Header hasCharts={charts.length > 0} />
        {charts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-6">
            <PlanList charts={charts} selectedId={selected?.id} onSelect={loadChart} />
            {selected ? (
              <PlanDetail
                plan={selected}
                activeDay={activeDay}
                onDayChange={setActiveDay}
                motionOn={motionOn}
              />
            ) : (
              <div className="card text-center py-12"><p style={{ color: 'var(--text-muted)' }}>Select a plan to view</p></div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ===================== HEADER =====================

function Header({ hasCharts }: { hasCharts: boolean }) {
  return (
    <header className="flex items-end justify-between flex-wrap gap-3 mb-8">
      <div>
        <div className="inline-flex items-center gap-1.5 badge badge-primary mb-2">
          <Sparkles className="w-3 h-3" /> Magic Diet
        </div>
        <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Your meal plan
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          A personalised 7-day Indian plan, built around you.
        </p>
      </div>
      {hasCharts && (
        <Link href="/patient/diet/generate" className="btn btn-primary inline-flex">
          <Plus className="w-4 h-4" /> New plan
        </Link>
      )}
    </header>
  );
}

// ===================== EMPTY STATE =====================

function EmptyState() {
  return (
    <div
      className="card text-center py-16 relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, var(--bg-card) 0%, rgba(14,124,107,0.08) 100%)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="relative z-10 max-w-md mx-auto">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
        >
          <Utensils className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          No diet plan yet
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Answer a few quick questions and we&rsquo;ll build a 7-day meal plan tailored to your goals,
          allergies, and lifestyle.
        </p>
        <Link href="/patient/diet/generate" className="btn btn-primary btn-lg inline-flex">
          <Zap className="w-4 h-4" /> Build my diet plan
        </Link>
      </div>
    </div>
  );
}

// ===================== PLAN LIST (sidebar) =====================

function PlanList({
  charts, selectedId, onSelect,
}: { charts: any[]; selectedId?: string; onSelect: (id: string) => void }) {
  return (
    <aside>
      <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
        Your plans
      </div>
      <div className="space-y-2">
        {charts.map((c: any) => {
          const on = selectedId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className="w-full text-left p-3 rounded-xl transition"
              style={{
                background: on ? 'rgba(14,124,107,0.12)' : 'var(--bg-card)',
                border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold" style={{ color: on ? 'var(--primary-light)' : 'var(--text-primary)' }}>
                    Plan v{c.version}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {new Date(c.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <div className="text-right">
                  {c.avgDailyKcal && (
                    <div className="text-sm font-bold" style={{ color: 'var(--primary-light)' }}>
                      {Math.round(c.avgDailyKcal)}
                    </div>
                  )}
                  <div className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>kcal/day</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ===================== PLAN DETAIL =====================

function PlanDetail({
  plan, activeDay, onDayChange, motionOn,
}: { plan: any; activeDay: string; onDayChange: (d: string) => void; motionOn: boolean }) {
  // Compute averages from the snapshot
  const rollup = plan.snapshot?.weeklyRollup || {};
  const todayTotals = plan.snapshot?.dayTotals?.[activeDay] || {};
  const kcalAvg = Math.round(rollup.avgDailyKcal || plan.avgDailyKcal || 0);
  const proteinAvg = Math.round(rollup.avgDailyProteinG || 0);
  const carbAvg = Math.round(rollup.avgDailyCarbG || 0);
  const fatAvg = Math.round(rollup.avgDailyFatG || 0);
  const grocery = (plan.groceryList ?? {}) as Record<string, { name: string; qty: string }[]>;

  return (
    <div>
      <Hero plan={plan} kcal={kcalAvg} protein={proteinAvg} carb={carbAvg} fat={fatAvg} />
      <DayPicker activeDay={activeDay} onChange={onDayChange} motionOn={motionOn} />
      <DayMeals plan={plan} activeDay={activeDay} todayTotals={todayTotals} motionOn={motionOn} />
      {Object.keys(grocery).length > 0 && <GroceryList grocery={grocery} />}
    </div>
  );
}

// ===================== HERO =====================

function Hero({
  plan, kcal, protein, carb, fat,
}: { plan: any; kcal: number; protein: number; carb: number; fat: number }) {
  // Macro ring targets: WHO/IOM rough adult defaults, used only as visual scale
  const proteinTarget = Math.max(80, protein);
  const carbTarget = Math.max(280, carb);
  const fatTarget = Math.max(70, fat);

  return (
    <div
      className="rounded-2xl p-6 mb-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(14,124,107,0.18) 0%, rgba(99,102,241,0.10) 100%)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Kcal block */}
        <div>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Plan v{plan.version} · {new Date(plan.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="flex items-baseline gap-2">
            <Flame className="w-8 h-8" style={{ color: 'var(--primary-light)' }} />
            <AnimatedNumber
              value={kcal}
              duration={1.4}
              className="text-5xl font-bold tabular-nums"
              style={{ color: 'var(--text-primary)' }}
            />
            <span className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>kcal / day</span>
          </div>
          {plan.notes && (
            <p
              className="text-sm mt-3 p-3 rounded-lg max-w-md"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}
            >
              <strong>Note:</strong> {plan.notes}
            </p>
          )}
          <button
            type="button"
            onClick={() => window.open(`/print/diet?chartId=${plan.id}`, '_blank')}
            className="btn btn-secondary btn-sm mt-4 inline-flex"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>

        {/* Macro rings */}
        <div className="flex gap-4">
          <MacroRing value={protein} target={proteinTarget} label="Protein" unit="g" color="#22c55e" size={92} />
          <MacroRing value={carb}    target={carbTarget}    label="Carbs"   unit="g" color="#f59e0b" size={92} />
          <MacroRing value={fat}     target={fatTarget}     label="Fat"     unit="g" color="#a855f7" size={92} />
        </div>
      </div>
    </div>
  );
}

// ===================== DAY PICKER =====================

function DayPicker({
  activeDay, onChange, motionOn,
}: { activeDay: string; onChange: (d: string) => void; motionOn: boolean }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);

  // Position the sliding pill under the active day
  useEffect(() => {
    if (!wrapRef.current || !pillRef.current) return;
    const btn = wrapRef.current.querySelector<HTMLButtonElement>(`[data-day="${activeDay}"]`);
    if (!btn) return;
    const wrapRect = wrapRef.current.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const x = btnRect.left - wrapRect.left;
    const w = btnRect.width;
    if (motionOn) {
      registerGSAP();
      gsap.to(pillRef.current, { x, width: w, duration: 0.45, ease: 'expo.out' });
    } else {
      pillRef.current.style.transform = `translateX(${x}px)`;
      pillRef.current.style.width = `${w}px`;
    }
  }, [activeDay, motionOn]);

  return (
    <div
      ref={wrapRef}
      className="relative inline-flex p-1 rounded-xl mb-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div
        ref={pillRef}
        className="absolute top-1 bottom-1 rounded-lg"
        style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', left: 0, width: 0 }}
        aria-hidden="true"
      />
      {DAYS.map((d) => {
        const on = activeDay === d;
        return (
          <button
            key={d}
            data-day={d}
            type="button"
            onClick={() => onChange(d)}
            className="relative z-10 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ color: on ? '#fff' : 'var(--text-secondary)' }}
          >
            {DAY_LABEL[d]}
          </button>
        );
      })}
    </div>
  );
}

// ===================== DAY MEALS =====================

function DayMeals({
  plan, activeDay, todayTotals, motionOn,
}: { plan: any; activeDay: string; todayTotals: any; motionOn: boolean }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Stagger reveal whenever the active day changes
  useEffect(() => {
    if (!motionOn || !wrapRef.current) return;
    registerGSAP();
    const ctx = gsap.context(() => {
      gsap.from('[data-meal-card]', {
        y: 16,
        opacity: 0,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.06,
      });
    }, wrapRef);
    return () => ctx.revert();
  }, [activeDay, motionOn]);

  const day = plan.snapshot?.week?.[activeDay] || {};
  const orderedSlots = SLOT_ORDER.filter((s) => Array.isArray(day[s]) && day[s].length > 0);

  if (orderedSlots.length === 0) {
    return (
      <div className="card text-center py-10">
        <p style={{ color: 'var(--text-muted)' }}>No meals planned for this day.</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="space-y-3">
      {orderedSlots.map((slot) => {
        const meta = SLOT_META[slot] ?? { label: slot, Icon: Utensils, tint: 'var(--primary-light)' };
        const items = day[slot] as any[];
        const slotKcal = items.reduce((s, it) => s + (it.kcal || 0), 0);
        return (
          <div
            key={`${activeDay}-${slot}`}
            data-meal-card
            className="card"
            style={{ paddingTop: '1.1rem', paddingBottom: '1.1rem' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${meta.tint}22`, color: meta.tint }}
                >
                  <meta.Icon className="w-4 h-4" />
                </div>
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{meta.label}</div>
              </div>
              <div className="text-xs px-2 py-1 rounded-md" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                {slotKcal} kcal
              </div>
            </div>

            <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {items.map((item, i) => (
                <li key={i} className="py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.foodName}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.portionDesc}</p>
                  </div>
                  <div className="text-right text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    <div className="font-semibold">{item.kcal} kcal</div>
                    <div style={{ color: 'var(--text-muted)' }}>P {item.proteinG} · C {item.carbG} · F {item.fatG}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* Day totals */}
      {todayTotals?.kcal !== undefined && (
        <div data-meal-card className="card" style={{ background: 'var(--bg-dark)' }}>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            {([
              { label: 'Calories', value: todayTotals.kcal,     unit: 'kcal' },
              { label: 'Protein',  value: todayTotals.proteinG, unit: 'g' },
              { label: 'Carbs',    value: todayTotals.carbG,    unit: 'g' },
              { label: 'Fibre',    value: todayTotals.fiberG,   unit: 'g' },
            ]).map((m) => (
              <div key={m.label}>
                <AnimatedNumber
                  value={m.value || 0}
                  className="font-bold text-lg tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                />
                <span className="text-xs ml-0.5" style={{ color: 'var(--text-muted)' }}>{m.unit}</span>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== GROCERY LIST =====================

function GroceryList({ grocery }: { grocery: Record<string, { name: string; qty: string }[]> }) {
  const [open, setOpen] = useState(false);
  const aisles = Object.keys(grocery);
  if (aisles.length === 0) return null;
  return (
    <div className="card mt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between"
      >
        <span className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
          <ShoppingBasket className="w-4 h-4" style={{ color: 'var(--primary-light)' }} />
          Grocery list
        </span>
        <ChevronRight className="w-4 h-4 transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none', color: 'var(--text-muted)' }} />
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {aisles.map((aisle) => (
            <div key={aisle}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                {aisle}
              </div>
              <ul className="text-sm space-y-1">
                {grocery[aisle].map((g, i) => (
                  <li key={i} className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                    <span>{g.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{g.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
