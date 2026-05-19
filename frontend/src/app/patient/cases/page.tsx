'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { casesApi } from '@/lib/api';
import { caseStatusLabel } from '@/lib/caseStatus';
import { FileText, PlusCircle } from 'lucide-react';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  draft: 'badge-neutral', submitted: 'badge-info', ai_processing: 'badge-warning',
  awaiting_doctor: 'badge-primary', report_ready: 'badge-success',
  consultation_booked: 'badge-info', consultation_done: 'badge-success', closed: 'badge-neutral',
};

export default function PatientCasesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'patient') loadCases();
  }, [user, filter]);

  const loadCases = async () => {
    try {
      const { data } = await casesApi.getMyCases(filter || undefined);
      setCases(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (authLoading) return <DashboardLayout><div className="flex items-center justify-center h-96"><div className="spinner" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="animate-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Cases</h1>
          <Link href="/patient/new-case" className="btn btn-primary">
            <PlusCircle className="w-4 h-4" /> New Case
          </Link>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['', 'draft', 'submitted', 'awaiting_doctor', 'report_ready', 'consultation_booked'].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`badge cursor-pointer ${filter === s ? 'badge-primary' : 'badge-neutral'}`}>
              {s ? caseStatusLabel(s) : 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="spinner" /></div>
        ) : cases.length === 0 ? (
          <div className="card text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-medium mb-2">No cases found</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              {filter ? `No cases with status "${caseStatusLabel(filter)}"` : 'Create your first case to get started'}
            </p>
            <Link href="/patient/new-case" className="btn btn-primary">Create Case</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <Link href={`/patient/cases/${c.id}`} key={c.id} className="card block hover:border-primary-light">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold">{c.caseNumber}</span>
                      <span className={`badge ${statusColors[c.status] || 'badge-neutral'} capitalize`}>
                        {caseStatusLabel(c.status)}
                      </span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {c.chiefComplaint?.substring(0, 150) || 'Draft — incomplete'}
                      {(c.chiefComplaint?.length || 0) > 150 ? '...' : ''}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.specialities?.map((s: any) => (
                        <span key={s.specialityId} className="badge badge-neutral text-xs">{s.speciality.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-xs" style={{ color: 'var(--text-muted)' }}>
                    <div>{new Date(c.createdAt).toLocaleDateString()}</div>
                    {c.assignedDoctor && (
                      <div className="mt-1" style={{ color: 'var(--primary-light)' }}>
                        Dr. {c.assignedDoctor.name}
                      </div>
                    )}
                    <div className="mt-1">{c.documents?.length || 0} doc(s)</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
