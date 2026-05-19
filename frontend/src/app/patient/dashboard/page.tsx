'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { casesApi, appointmentsApi } from '@/lib/api';
import { caseStatusLabel } from '@/lib/caseStatus';
import { FileText, Clock, CheckCircle, PlusCircle, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  draft: 'badge-neutral', submitted: 'badge-info', ai_processing: 'badge-warning',
  awaiting_doctor: 'badge-primary', report_ready: 'badge-success',
  consultation_booked: 'badge-info', consultation_done: 'badge-success', closed: 'badge-neutral',
};

export default function PatientDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user?.role !== 'patient') router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'patient') loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [casesRes, apptsRes] = await Promise.all([
        casesApi.getMyCases(),
        appointmentsApi.getPatientAppointments(),
      ]);
      setCases(casesRes.data);
      setAppointments(apptsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96"><div className="spinner" /></div>
      </DashboardLayout>
    );
  }

  const activeCases = cases.filter(c => !['closed', 'draft'].includes(c.status));
  const reportsReady = cases.filter(c => c.status === 'report_ready');
  const upcomingAppts = appointments.filter(a => ['booked', 'confirmed'].includes(a.status));

  return (
    <DashboardLayout>
      <div className="animate-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Here&apos;s an overview of your cases</p>
          </div>
          <Link href="/patient/new-case" className="btn btn-primary">
            <PlusCircle className="w-4 h-4" /> New Case
          </Link>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8" style={{ color: 'var(--primary-light)' }} />
              <div>
                <div className="metric-value">{cases.length}</div>
                <div className="metric-label">Total Cases</div>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8" style={{ color: 'var(--accent)' }} />
              <div>
                <div className="metric-value">{activeCases.length}</div>
                <div className="metric-label">Active Cases</div>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8" style={{ color: 'var(--success)' }} />
              <div>
                <div className="metric-value">{reportsReady.length}</div>
                <div className="metric-label">Reports Ready</div>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8" style={{ color: 'var(--secondary)' }} />
              <div>
                <div className="metric-value">{upcomingAppts.length}</div>
                <div className="metric-label">Upcoming Appts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Cases */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Recent Cases</h2>
            <Link href="/patient/cases" className="text-sm flex items-center gap-1" style={{ color: 'var(--primary-light)' }}>
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {cases.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>No cases yet. Create your first case to get started!</p>
              <Link href="/patient/new-case" className="btn btn-primary mt-4">
                <PlusCircle className="w-4 h-4" /> Create Case
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.slice(0, 5).map((c) => (
                <Link href={`/patient/cases/${c.id}`} key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg transition-colors"
                  style={{ background: 'var(--bg-dark)' }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.caseNumber}</span>
                      <span className={`badge ${statusColors[c.status] || 'badge-neutral'}`}>
                        {caseStatusLabel(c.status)}
                      </span>
                    </div>
                    <p className="text-xs mt-1 truncate max-w-md" style={{ color: 'var(--text-muted)' }}>
                      {c.chiefComplaint?.substring(0, 80) || 'Draft case'}
                    </p>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
