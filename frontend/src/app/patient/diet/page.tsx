'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { dietApi } from '@/lib/api';
import { Zap, Printer, Calendar, ChevronRight, Utensils, Plus } from 'lucide-react';
import Link from 'next/link';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: { [k: string]: string } = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const SLOT_LABELS: { [k: string]: string } = {
  early_morning: 'Early Morning', breakfast: 'Breakfast', mid_morning: 'Mid Morning',
  lunch: 'Lunch', evening_snack: 'Evening Snack', dinner: 'Dinner', bedtime: 'Bedtime',
};

export default function PatientDietPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [charts, setCharts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState('mon');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'patient') loadCharts();
  }, [user]);

  const loadCharts = async () => {
    try {
      const { data } = await dietApi.getCharts();
      setCharts(data.charts || []);
      if (data.charts?.length) loadChart(data.charts[0].id);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const loadChart = async (id: string) => {
    try {
      const { data } = await dietApi.getChartById(id);
      setSelected(data);
    } catch { /* ignore */ }
  };

  if (authLoading || loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="spinner" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="animate-in">
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: 'var(--primary-light)' }} />
            <h1 className="text-2xl font-bold">My Diet Plans</h1>
          </div>
          {charts.length > 0 && (
            <Link href="/patient/diet/generate" className="btn btn-secondary inline-flex">
              <Plus className="w-4 h-4" /> New plan
            </Link>
          )}
        </div>

        {charts.length === 0 ? (
          <div className="card text-center py-16">
            <Utensils className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-medium mb-2">No diet plan yet</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Build a personalised 7-day Indian meal plan tailored to your goals, allergies, and lifestyle.
            </p>
            <Link href="/patient/diet/generate" className="btn btn-primary inline-flex">
              <Zap className="w-4 h-4" /> Build my diet plan
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: chart list */}
            <div className="lg:col-span-1">
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>YOUR PLANS</h2>
              <div className="space-y-2">
                {charts.map((c: any) => (
                  <button key={c.id} type="button"
                    onClick={() => loadChart(c.id)}
                    className={`w-full card text-left transition-all ${selected?.id === c.id ? 'border-primary' : ''}`}
                    style={{ border: `1px solid ${selected?.id === c.id ? 'var(--primary)' : 'var(--border)'}` }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">Plan v{c.version}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {new Date(c.createdAt).toLocaleDateString()}
                        </div>
                        {c.avgDailyKcal && (
                          <div className="text-xs mt-1" style={{ color: 'var(--primary-light)' }}>
                            {c.avgDailyKcal} kcal/day
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: chart detail */}
            <div className="lg:col-span-3">
              {selected ? (
                <>
                  {/* Header */}
                  <div className="card mb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-lg">Plan v{selected.version}</h2>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          Generated {new Date(selected.createdAt).toLocaleDateString()}
                          {selected.avgDailyKcal && ` · ${selected.avgDailyKcal} kcal/day`}
                        </p>
                        {selected.notes && (
                          <p className="text-sm mt-2 p-2 rounded" style={{ background: 'var(--bg-dark)', color: 'var(--text-secondary)' }}>
                            <strong>Doctor's note:</strong> {selected.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => window.open(`/print/diet?chartId=${selected.id}`, '_blank')}
                          className="btn btn-secondary flex items-center gap-1 text-sm">
                          <Printer className="w-4 h-4" /> Print
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Day selector */}
                  <div className="flex gap-2 mb-4 overflow-x-auto">
                    {DAYS.map(d => (
                      <button key={d} type="button"
                        onClick={() => setActiveDay(d)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${activeDay === d ? 'badge-primary' : ''}`}
                        style={activeDay !== d ? { border: '1px solid var(--border)', color: 'var(--text-muted)' } : {}}>
                        {DAY_LABELS[d].slice(0, 3)}
                      </button>
                    ))}
                  </div>

                  {/* Day meal plan */}
                  {selected.snapshot?.week?.[activeDay] ? (
                    <div className="space-y-3">
                      {Object.entries(selected.snapshot.week[activeDay]).map(([slot, items]: [string, any]) => {
                        if (!items || items.length === 0) return null;
                        return (
                          <div key={slot} className="card">
                            <h3 className="font-semibold text-sm mb-3">{SLOT_LABELS[slot] || slot}</h3>
                            <div className="space-y-2">
                              {items.map((item: any, i: number) => (
                                <div key={i} className="flex items-start justify-between py-1"
                                  style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                  <div>
                                    <p className="text-sm font-medium">{item.foodName}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.portionDesc}</p>
                                  </div>
                                  <div className="text-xs text-right ml-4" style={{ color: 'var(--text-muted)' }}>
                                    <p>{item.kcal} kcal</p>
                                    <p>P:{item.proteinG}g C:{item.carbG}g</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {selected.snapshot?.dayTotals?.[activeDay] && (
                        <div className="card" style={{ background: 'var(--bg-dark)' }}>
                          <div className="grid grid-cols-4 gap-2 text-center text-sm">
                            {[
                              { label: 'Calories', value: selected.snapshot.dayTotals[activeDay].kcal, unit: 'kcal' },
                              { label: 'Protein', value: selected.snapshot.dayTotals[activeDay].proteinG, unit: 'g' },
                              { label: 'Carbs', value: selected.snapshot.dayTotals[activeDay].carbG, unit: 'g' },
                              { label: 'Fibre', value: selected.snapshot.dayTotals[activeDay].fiberG, unit: 'g' },
                            ].map(m => (
                              <div key={m.label}>
                                <p className="font-bold">{m.value}<span className="text-xs font-normal ml-0.5">{m.unit}</span></p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No meal data for this day.</p>
                  )}
                </>
              ) : (
                <div className="card text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-muted)' }}>Select a plan to view</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
