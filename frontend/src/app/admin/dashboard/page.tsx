'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { adminApi, doctorsApi } from '@/lib/api';
import { caseStatusLabel } from '@/lib/caseStatus';
import { Users, Stethoscope, FileText, CreditCard, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.push('/login?role=admin');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'admin') loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [dashRes, pendingRes] = await Promise.all([
        adminApi.getDashboard(),
        doctorsApi.getPending(),
      ]);
      setMetrics(dashRes.data);
      setPendingDoctors(pendingRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleApproveDoctor = async (id: string) => {
    try {
      await doctorsApi.approve(id);
      setPendingDoctors(pendingDoctors.filter(d => d.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleRejectDoctor = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await doctorsApi.reject(id, reason);
      setPendingDoctors(pendingDoctors.filter(d => d.id !== id));
    } catch (e) { console.error(e); }
  };

  if (authLoading || loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-96"><div className="spinner" /></div></DashboardLayout>;
  }

  const o = metrics?.overview || {};

  return (
    <DashboardLayout>
      <div className="animate-in">
        <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Platform overview and management</p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: FileText, label: 'Total Cases', value: o.totalCases || 0, color: 'var(--primary-light)' },
            { icon: Users, label: 'Patients', value: o.totalPatients || 0, color: 'var(--info)' },
            { icon: Stethoscope, label: 'Active Doctors', value: o.activeDoctors || 0, color: 'var(--success)' },
            { icon: CreditCard, label: 'Revenue', value: `₹${(o.totalRevenue || 0).toLocaleString()}`, color: 'var(--accent)' },
            { icon: CheckCircle, label: 'Consultations', value: o.completedConsultations || 0, color: 'var(--secondary)' },
            { icon: Clock, label: 'Appointments', value: o.totalAppointments || 0, color: 'var(--primary-light)' },
            { icon: AlertTriangle, label: 'Pending Doctors', value: o.pendingDoctors || 0, color: 'var(--warning)' },
            { icon: TrendingUp, label: 'Commission', value: `₹${(o.platformCommission || 0).toLocaleString()}`, color: 'var(--success)' },
          ].map((m, i) => (
            <div key={i} className="metric-card">
              <div className="flex items-center gap-3">
                <m.icon className="w-7 h-7" style={{ color: m.color }} />
                <div>
                  <div className="metric-value text-xl">{m.value}</div>
                  <div className="metric-label">{m.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cases by Status */}
        {metrics?.casesByStatus && Object.keys(metrics.casesByStatus).length > 0 && (
          <div className="card mb-6">
            <h2 className="font-semibold text-lg mb-4">Cases by Status</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(metrics.casesByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--bg-dark)' }}>
                  <span className="text-lg font-bold" style={{ color: 'var(--primary-light)' }}>{count as number}</span>
                  <span className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{caseStatusLabel(status)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Doctors */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Pending Doctor Approvals ({pendingDoctors.length})</h2>
            <Link href="/admin/doctors" className="text-sm" style={{ color: 'var(--primary-light)' }}>View All →</Link>
          </div>
          {pendingDoctors.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No pending approvals</p>
          ) : (
            <div className="space-y-3">
              {pendingDoctors.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--bg-dark)' }}>
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {d.email} • CCH: {d.cchRegistrationNo}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {d.qualifications}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-sm" onClick={() => handleApproveDoctor(d.id)}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleRejectDoctor(d.id)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Cases */}
        {metrics?.recentCases?.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-lg mb-4">Recent Cases</h2>
            <div className="space-y-2">
              {metrics.recentCases.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-dark)' }}>
                  <div>
                    <span className="text-sm font-medium">{c.caseNumber}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                      {c.patient?.name} ({c.patient?.city})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-neutral text-xs capitalize">{caseStatusLabel(c.status)}</span>
                    {c.assignedDoctor && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→ {c.assignedDoctor.name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
