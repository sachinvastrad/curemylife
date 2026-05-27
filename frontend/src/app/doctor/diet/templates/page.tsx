'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { dietApi } from '@/lib/api';
import { BookOpen, Copy, Eye, X } from 'lucide-react';

const GOAL_LABELS: { [k: string]: string } = {
  weight_loss: 'Weight Loss', weight_gain: 'Weight Gain', diabetes_management: 'Diabetes',
  heart_health: 'Heart Health', pcos_management: 'PCOS', pregnancy_nutrition: 'Pregnancy',
  muscle_gain: 'Muscle Gain', general: 'General', ckd: 'CKD', elderly: 'Elderly',
};

export default function DietTemplatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any>(null);
  const [cloning, setCloning] = useState<string | null>(null);
  const [filterDiet, setFilterDiet] = useState('');
  const [filterGoal, setFilterGoal] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'doctor')) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'doctor') loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    try {
      const { data } = await dietApi.getTemplates();
      setTemplates(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleClone = async (tmpl: any) => {
    setCloning(tmpl.id);
    try {
      await dietApi.cloneTemplate(tmpl.id);
      await loadTemplates();
    } catch { /* ignore */ } finally { setCloning(null); }
  };

  const filtered = templates.filter(t =>
    (!filterDiet || t.dietType === filterDiet) &&
    (!filterGoal || t.goal === filterGoal)
  );

  const dietTypes = [...new Set(templates.map(t => t.dietType))];
  const goals = [...new Set(templates.map(t => t.goal))];

  if (authLoading || loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="spinner" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="animate-in">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-5 h-5" style={{ color: 'var(--primary-light)' }} />
          <h1 className="text-2xl font-bold">Diet Template Library</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select className="input w-auto" value={filterDiet} onChange={e => setFilterDiet(e.target.value)}>
            <option value="">All Diet Types</option>
            {dietTypes.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input w-auto" value={filterGoal} onChange={e => setFilterGoal(e.target.value)}>
            <option value="">All Goals</option>
            {goals.map(g => <option key={g} value={g}>{GOAL_LABELS[g] || g}</option>)}
          </select>
          {(filterDiet || filterGoal) && (
            <button className="btn btn-secondary text-sm" onClick={() => { setFilterDiet(''); setFilterGoal(''); }}>
              Clear Filters
            </button>
          )}
        </div>

        {/* Template grid */}
        {filtered.length === 0 ? (
          <div className="card text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No templates found. Run `npm run db:seed-diet` to populate templates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(t => (
              <div key={t.id} className="card flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm leading-snug">{t.name}</h3>
                    <span className="badge badge-primary text-xs flex-shrink-0">{t.dietType}</span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                    {t.description?.substring(0, 100)}...
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="badge text-xs" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--secondary)' }}>
                      {GOAL_LABELS[t.goal] || t.goal}
                    </span>
                    <span className="badge text-xs" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}>
                      {t.ageGroup}
                    </span>
                    {t.targetKcal && (
                      <span className="badge text-xs" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {t.targetKcal} kcal
                      </span>
                    )}
                    {t.giCap && (
                      <span className="badge text-xs" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        GI ≤{t.giCap}
                      </span>
                    )}
                  </div>
                  <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                    Source: <strong>{t.source}</strong>
                    {t.requiresDietitianReview && (
                      <span className="ml-2 badge badge-warning text-xs">Dietitian review required</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-secondary text-xs flex-1 flex items-center justify-center gap-1"
                    onClick={() => setPreview(t)}>
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                  <button
                    className="btn btn-secondary text-xs flex-1 flex items-center justify-center gap-1"
                    disabled={cloning === t.id}
                    onClick={() => handleClone(t)}>
                    <Copy className="w-3 h-3" />
                    {cloning === t.id ? 'Cloning...' : 'Clone'}
                  </button>
                  <button
                    className="btn btn-primary text-xs flex-1"
                    onClick={() => router.push(`/doctor/diet/generate?templateId=${t.id}`)}>
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 100, background: 'rgba(0,0,0,0.6)' }}>
          <div className="card max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{preview.name}</h3>
              <button onClick={() => setPreview(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{preview.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              {[
                { label: 'Diet Type', value: preview.dietType },
                { label: 'Age Group', value: preview.ageGroup },
                { label: 'Goal', value: GOAL_LABELS[preview.goal] || preview.goal },
                { label: 'Target Kcal', value: preview.targetKcal ? `${preview.targetKcal} kcal` : 'TDEE-based' },
                { label: 'GI Cap', value: preview.giCap ? `≤${preview.giCap}` : 'None' },
                { label: 'Salt Cap', value: preview.saltCapG ? `${preview.saltCapG}g/day` : 'Standard' },
                { label: 'Protein/kg', value: preview.proteinPerKg ? `${preview.proteinPerKg}g` : 'Standard' },
                { label: 'Water Target', value: preview.waterTargetL ? `${preview.waterTargetL}L/day` : 'Standard' },
              ].map(row => (
                <div key={row.label}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{row.label}</span>
                  <p className="font-medium">{row.value || '—'}</p>
                </div>
              ))}
            </div>
            {preview.lifestyleNotes && (
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>LIFESTYLE NOTES</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{preview.lifestyleNotes}</p>
              </div>
            )}
            {preview.supplementHints && (
              <div className="mb-4">
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>SUPPLEMENT HINTS</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{preview.supplementHints}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" onClick={() => {
                setPreview(null);
                router.push(`/doctor/diet/generate?templateId=${preview.id}`);
              }}>Use This Template</button>
              <button className="btn btn-secondary" onClick={() => setPreview(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
