'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { doctorsApi } from '@/lib/api';
import { CreditCard, TrendingUp, Loader2, IndianRupee, Clock, CheckCircle } from 'lucide-react';

export default function DoctorEarningsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'doctor')) router.push('/login?role=doctor');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'doctor') loadEarnings();
  }, [user]);

  const loadEarnings = async () => {
    try {
      const res = await doctorsApi.getEarnings();
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-in">
        <h1 className="text-2xl font-bold mb-2">Earnings</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Track your consultation earnings and payouts
        </p>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)' }}>
              <IndianRupee className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Net Earned</p>
              <p className="text-2xl font-bold">{fmt(data?.totalEarned || 0)}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.1)' }}>
              <TrendingUp className="w-6 h-6" style={{ color: 'var(--warning)' }} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Platform Commission</p>
              <p className="text-2xl font-bold">{fmt(data?.totalCommission || 0)}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <CreditCard className="w-6 h-6" style={{ color: 'var(--success, #22c55e)' }} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>Consultations Paid</p>
              <p className="text-2xl font-bold">{data?.recentPayments?.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Recent payments */}
        <div className="card mb-8">
          <h2 className="font-semibold text-lg mb-4">Recent Consultations</h2>
          {!data?.recentPayments?.length ? (
            <div className="text-center py-10">
              <CreditCard className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No completed consultations yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>Date</th>
                    <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>Case</th>
                    <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>Amount</th>
                    <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>Commission</th>
                    <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-muted)' }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((p: any) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-3 px-3" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(p.paidAt || p.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-3" style={{ color: 'var(--text-secondary)' }}>
                        {p.appointment?.case_?.caseNumber || '-'}
                      </td>
                      <td className="py-3 px-3 text-right">{fmt(Number(p.amount))}</td>
                      <td className="py-3 px-3 text-right" style={{ color: 'var(--warning)' }}>
                        -{fmt(Number(p.platformCommission || 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold" style={{ color: 'var(--primary)' }}>
                        {fmt(Number(p.doctorPayout || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payouts */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Payout History</h2>
          {!data?.payouts?.length ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No payouts processed yet. Payouts are done weekly.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.payouts.map((payout: any) => (
                <div key={payout.id} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'var(--bg-surface)' }}>
                  <div className="flex items-center gap-3">
                    {payout.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" style={{ color: 'var(--success, #22c55e)' }} />
                    ) : (
                      <Clock className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(payout.periodStart).toLocaleDateString('en-IN')} –{' '}
                        {new Date(payout.periodEnd).toLocaleDateString('en-IN')}
                      </p>
                      <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{payout.status}</p>
                    </div>
                  </div>
                  <p className="font-semibold">{fmt(Number(payout.amount))}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
