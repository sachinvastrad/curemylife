'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { casesApi } from '@/lib/api';
import { caseStatusLabel } from '@/lib/caseStatus';
import { FileText, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function DoctorCasesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'doctor')) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'doctor') loadCases();
  }, [user]);

  const loadCases = async () => {
    try {
      const { data } = await casesApi.getDoctorCases();
      setCases(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="spinner" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="animate-in">
        <h1 className="text-2xl font-bold mb-2">My Cases</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Cases you have reviewed or are currently handling</p>
        
        {cases.length === 0 ? (
          <div className="card text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-medium mb-2">No cases yet</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Accept cases from the queue to start building your portfolio.
            </p>
            <Link href="/doctor/queue" className="btn btn-primary">Go to Queue</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map((c) => (
              <div key={c.id} className="card">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-lg">{c.caseNumber}</span>
                      <span className={`badge ${c.status === 'report_ready' ? 'badge-success' : 'badge-primary'} capitalize`}>
                        {caseStatusLabel(c.status)}
                      </span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <strong>{c.patient?.name}</strong> • {c.patient?.gender}, {c.patient?.age}y
                    </p>
                    <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {c.chiefComplaint?.substring(0, 150)}...
                    </p>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Assigned on: {new Date(c.doctorAcceptedAt || c.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 min-w-[150px]">
                    <Link href={`/doctor/cases/${c.id}`} className="btn btn-secondary w-full text-center">
                      View Details
                    </Link>
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
