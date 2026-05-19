'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { adminApi, doctorsApi } from '@/lib/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function AdminDoctorsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [doctors, setDoctors] = useState<any>({ doctors: [], total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && (!user || user.role !== 'admin')) router.push('/login?role=admin'); }, [authLoading, user]);
  useEffect(() => { if (user?.role === 'admin') loadDoctors(); }, [user, statusFilter]);

  const loadDoctors = async () => {
    try { const { data } = await adminApi.getDoctors(1, 50, statusFilter || undefined); setDoctors(data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleApprove = async (id: string) => {
    await doctorsApi.approve(id); loadDoctors();
  };
  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:'); if (!reason) return;
    await doctorsApi.reject(id, reason); loadDoctors();
  };
  const handleSuspend = async (id: string) => {
    const reason = prompt('Suspension reason:'); if (!reason) return;
    await doctorsApi.suspend(id, reason); loadDoctors();
  };

  if (authLoading) return <DashboardLayout><div className="flex items-center justify-center h-96"><div className="spinner" /></div></DashboardLayout>;

  const statusBadge: Record<string, string> = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-error', suspended: 'badge-error' };

  return (
    <DashboardLayout>
      <div className="animate-in">
        <h1 className="text-2xl font-bold mb-2">Doctor Management</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Onboard, verify, and manage doctors — Total: {doctors.total}</p>

        <div className="flex gap-2 mb-6">
          {['', 'pending', 'approved', 'suspended', 'rejected'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`badge cursor-pointer ${statusFilter === s ? 'badge-primary' : 'badge-neutral'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-10"><div className="spinner" /></div> : (
          <div className="space-y-3">
            {doctors.doctors?.map((d: any) => (
              <div key={d.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{d.name}</span>
                      <span className={`badge ${statusBadge[d.status] || 'badge-neutral'} capitalize`}>{d.status}</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{d.email} • CCH: {d.cchRegistrationNo}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {d.qualifications} • Cases: {d._count?.assignedCases || 0} • Rating: {Number(d.avgRating || 0).toFixed(1)}⭐
                    </p>
                    <div className="flex gap-1 mt-1">
                      {d.specialities?.map((s: any) => (
                        <span key={s.specialityId} className="badge badge-neutral text-xs">{s.speciality.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {d.status === 'pending' && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => handleApprove(d.id)}>
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(d.id)}>
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </>
                    )}
                    {d.status === 'approved' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleSuspend(d.id)}>Suspend</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
