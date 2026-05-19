'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { prescriptionsApi } from '@/lib/api';
import { Pill, Download, Clock } from 'lucide-react';
import Link from 'next/link';

export default function PatientPrescriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'patient')) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'patient') loadPrescriptions();
  }, [user]);

  const loadPrescriptions = async () => {
    try {
      const { data } = await prescriptionsApi.getMyPrescriptions();
      setPrescriptions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string, remedyName: string) => {
    try {
      const response = await prescriptionsApi.downloadPdf(id);
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Prescription_${remedyName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to download prescription');
    }
  };

  if (authLoading || loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="spinner" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="animate-in max-w-4xl">
        <h1 className="text-2xl font-bold mb-2">My Prescriptions</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>View all your homoeopathic prescriptions</p>
        
        {prescriptions.length === 0 ? (
          <div className="card text-center py-16">
            <Pill className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-medium mb-2">No prescriptions yet</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Prescriptions will appear here after your consultations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {prescriptions.map((p) => (
              <div key={p.id} className="card">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(14,124,107,0.1)' }}>
                        <Pill className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-primary">{p.remedyName} {p.potency}</h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Prescribed by Dr. {p.doctor?.name} on {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-dark)' }}>
                      <div>
                        <div className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Dosage</div>
                        <div className="font-medium text-sm">{p.dosage}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Frequency</div>
                        <div className="font-medium text-sm">{p.frequency}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Duration</div>
                        <div className="font-medium text-sm">{p.duration}</div>
                      </div>
                    </div>

                    {(p.dietaryRestrictions || p.followupTimeline) && (
                      <div className="mt-4 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {p.dietaryRestrictions && (
                          <p><strong>Dietary Restrictions:</strong> {p.dietaryRestrictions}</p>
                        )}
                        {p.followupTimeline && (
                          <p className="flex items-center gap-1 text-primary-light">
                            <Clock className="w-4 h-4" /> <strong>Follow-up:</strong> {p.followupTimeline}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <button className="btn btn-secondary w-full" onClick={() => handleDownload(p.id, p.remedyName)}>
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                    <Link href={`/patient/cases/${p.caseId}`} className="btn btn-ghost w-full">
                      View Case
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
