'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { casesApi, appointmentsApi, doctorsApi } from '@/lib/api';
import { FileText, Clock, Calendar, CreditCard, ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';

export default function DoctorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<any[]>([]);
  const [myCases, setMyCases] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'doctor')) router.push('/login?role=doctor');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'doctor') loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [queueRes, casesRes, apptsRes, earningsRes] = await Promise.all([
        casesApi.getDoctorQueue(),
        casesApi.getDoctorCases(),
        appointmentsApi.getDoctorAppointments(true),
        doctorsApi.getEarnings(),
      ]);
      setQueue(queueRes.data);
      setMyCases(casesRes.data);
      setAppointments(apptsRes.data);
      setEarnings(earningsRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (authLoading || loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-96"><div className="spinner" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="animate-in">
        <h1 className="text-2xl font-bold mb-1">Doctor Dashboard</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Welcome, Dr. {user?.name?.split(' ').pop()}</p>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8" style={{ color: 'var(--accent)' }} />
              <div>
                <div className="metric-value">{queue.length}</div>
                <div className="metric-label">In Queue</div>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8" style={{ color: 'var(--primary-light)' }} />
              <div>
                <div className="metric-value">{myCases.length}</div>
                <div className="metric-label">My Cases</div>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8" style={{ color: 'var(--secondary)' }} />
              <div>
                <div className="metric-value">{appointments.length}</div>
                <div className="metric-label">Upcoming</div>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8" style={{ color: 'var(--success)' }} />
              <div>
                <div className="metric-value">₹{earnings?.totalEarned?.toLocaleString() || 0}</div>
                <div className="metric-label">Total Earned</div>
              </div>
            </div>
          </div>
        </div>

        {/* Case Queue */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Incoming Cases ({queue.length})</h2>
            <Link href="/doctor/queue" className="text-sm flex items-center gap-1" style={{ color: 'var(--primary-light)' }}>
              View Queue <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {queue.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>No new cases matching your specialities</p>
          ) : (
            <div className="space-y-3">
              {queue.slice(0, 3).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-dark)' }}>
                  <div>
                    <div className="text-sm font-medium">{c.caseNumber}</div>
                    <p className="text-xs truncate max-w-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      {c.patient?.gender}, {c.patient?.age}y — {c.chiefComplaint?.substring(0, 60)}...
                    </p>
                    <div className="flex gap-1 mt-1">
                      {c.specialities?.map((s: any) => (
                        <span key={s.specialityId} className="badge badge-primary text-xs">{s.speciality.name}</span>
                      ))}
                    </div>
                  </div>
                  <Link href={`/doctor/queue`} className="btn btn-primary btn-sm">Review</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Upcoming Appointments</h2>
          {appointments.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No upcoming appointments</p>
          ) : (
            <div className="space-y-2">
              {appointments.slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-dark)' }}>
                  <div>
                    <span className="text-sm font-medium">{a.patient?.name}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                      {new Date(a.scheduledDate).toLocaleDateString()} at {a.scheduledStart}
                    </span>
                  </div>
                  <span className="badge badge-info">{a.appointmentType}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
