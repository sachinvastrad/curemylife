'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { paymentsApi } from '@/lib/api';
import { IndianRupee, TrendingUp, Wallet, RotateCcw } from 'lucide-react';

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function AdminRevenuePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && (!user || user.role !== 'admin')) router.push('/login?role=admin'); }, [authLoading, user]);
  useEffect(() => { if (user?.role === 'admin') loadRevenue(); }, [user]);

  const loadRevenue = async () => {
    setLoading(true);
    try { const { data } = await paymentsApi.getRevenue(); setData(data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (authLoading || loading) return <DashboardLayout><div className="flex items-center justify-center h-96"><div className="spinner" /></div></DashboardLayout>;

  const metrics = [
    { label: 'Total Revenue', value: inr(data?.totalRevenue), icon: IndianRupee, color: 'var(--primary-light)' },
    { label: 'Platform Commission', value: inr(data?.totalCommission), icon: TrendingUp, color: 'var(--success)' },
    { label: 'Doctor Payouts', value: inr(data?.totalDoctorPayouts), icon: Wallet, color: 'var(--secondary)' },
    { label: 'Total Refunds', value: inr(data?.totalRefunds), icon: RotateCcw, color: 'var(--accent)' },
  ];

  return (
    <DashboardLayout>
      <div className="animate-in">
        <h1 className="text-2xl font-bold mb-2">Revenue</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Platform earnings, commission and payouts</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {metrics.map((m) => (
            <div key={m.label} className="metric-card">
              <div className="flex items-center gap-3">
                <m.icon className="w-8 h-8" style={{ color: m.color }} />
                <div>
                  <div className="metric-value">{m.value}</div>
                  <div className="metric-label">{m.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Recent Payments</h2>
          {(!data?.recentPayments || data.recentPayments.length === 0) ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>No payments captured yet</p>
          ) : (
            <div className="space-y-2">
              {data.recentPayments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-dark)' }}>
                  <div>
                    <p className="text-sm font-medium">{inr(p.amount)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {p.appointment?.patient?.name || 'Patient'} → Dr. {p.appointment?.doctor?.name || '—'}
                    </p>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
