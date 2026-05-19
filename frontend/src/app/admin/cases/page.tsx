'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { casesApi } from '@/lib/api';
import { caseStatusLabel } from '@/lib/caseStatus';

const STATUS_FILTERS = ['', 'draft', 'submitted', 'awaiting_doctor', 'report_ready', 'consultation_booked', 'closed'];

const statusColors: Record<string, string> = {
  draft: 'badge-neutral', submitted: 'badge-info', ai_processing: 'badge-warning',
  awaiting_doctor: 'badge-primary', report_ready: 'badge-success',
  consultation_booked: 'badge-info', consultation_done: 'badge-success', closed: 'badge-neutral',
};

export default function AdminCasesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>({ cases: [], total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && (!user || user.role !== 'admin')) router.push('/login?role=admin'); }, [authLoading, user]);
  useEffect(() => { if (user?.role === 'admin') loadCases(); }, [user, statusFilter]);

  const loadCases = async () => {
    setLoading(true);
    try { const { data } = await casesApi.getAllCases(1, 50, statusFilter || undefined); setData(data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (authLoading) return <DashboardLayout><div className="flex items-center justify-center h-96"><div className="spinner" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="animate-in">
        <h1 className="text-2xl font-bold mb-2">Case Management</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Monitor all cases across the platform — Total: {data.total}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`badge cursor-pointer ${statusFilter === s ? 'badge-primary' : 'badge-neutral'}`}>
              {s ? caseStatusLabel(s) : 'All'}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-10"><div className="spinner" /></div> : (
          data.cases?.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-lg font-medium mb-1">No cases found</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {statusFilter ? `No cases with status "${caseStatusLabel(statusFilter)}"` : 'No cases have been created yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.cases?.map((c: any) => (
                <div key={c.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{c.caseNumber}</span>
                        <span className={`badge ${statusColors[c.status] || 'badge-neutral'} capitalize`}>
                          {caseStatusLabel(c.status)}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Patient: {c.patient?.name || '—'}{c.patient?.city ? ` • ${c.patient.city}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.specialities?.map((s: any) => (
                          <span key={s.specialityId} className="badge badge-neutral text-xs">{s.speciality?.name}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                      <div>{new Date(c.createdAt).toLocaleDateString()}</div>
                      <div className="mt-1" style={{ color: c.assignedDoctor ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                        {c.assignedDoctor ? `Dr. ${c.assignedDoctor.name}` : 'Unassigned'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
