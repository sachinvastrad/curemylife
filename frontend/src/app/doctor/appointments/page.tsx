'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { appointmentsApi } from '@/lib/api';
import { Calendar, Video, Clock, Sparkles, CheckCircle2 } from 'lucide-react';

export default function DoctorAppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'doctor')) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role === 'doctor') loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    try {
      const { data } = await appointmentsApi.getDoctorAppointments(true);
      setAppointments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultation = async (id: string) => {
    try {
      await appointmentsApi.start(id);
      loadAppointments();
    } catch (e) { console.error(e); }
  };

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    try {
      await appointmentsApi.complete(id, 'Consultation completed');
      await loadAppointments();
    } catch (e) {
      console.error(e);
    } finally {
      setCompletingId(null);
    }
  };

  if (authLoading || loading) {
    return <DashboardLayout><div className="flex justify-center py-20"><div className="spinner" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="animate-in max-w-5xl">
        <h1 className="text-2xl font-bold mb-2">Appointments</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Manage your consultation schedule</p>

        {appointments.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-medium mb-2">No appointments scheduled</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              When patients book a consultation, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((a) => (
              <div key={a.id} className="card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{a.patient?.name}</h3>
                      <span className={`badge ${a.status === 'booked' ? 'badge-primary' : a.status === 'in_progress' ? 'badge-warning' : 'badge-success'} capitalize`}>
                        {a.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                      <p className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(a.scheduledDate).toDateString()}</p>
                      <p className="flex items-center gap-2"><Clock className="w-4 h-4" /> {a.scheduledStart} - {a.scheduledEnd}</p>
                      <p className="flex items-center gap-2"><Video className="w-4 h-4" /> {a.appointmentType} Consultation</p>
                    </div>
                    {a.case_?.caseNumber && (
                      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                        Case Reference: {a.case_.caseNumber}
                      </p>
                    )}
                    {a.serviceRequest?.service && (
                      <ServiceContext appointment={a} />
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[200px]">
                    {a.status === 'booked' && (
                      <button className="btn btn-primary w-full" onClick={() => handleStartConsultation(a.id)}>
                        Start Consultation
                      </button>
                    )}
                    {a.status === 'in_progress' && (
                      <>
                        <a href={a.meetingLink || '#'} target="_blank" rel="noreferrer" className="btn btn-secondary w-full text-center">
                          Join Video Call
                        </a>
                        <button
                          className="btn btn-success w-full"
                          onClick={() => handleComplete(a.id)}
                          disabled={completingId === a.id}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {completingId === a.id ? 'Completing…' : 'Mark Completed'}
                        </button>
                      </>
                    )}
                    {a.status === 'completed' && (
                      <span className="badge badge-success justify-center py-2">Consultation Completed</span>
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

/**
 * Service context block — surfaces what the patient booked + the intake answers
 * so the doctor knows what to prepare for. Rendered only when the appointment
 * came from the Service Catalog (not the core case flow).
 */
function ServiceContext({ appointment }: { appointment: any }) {
  const sr = appointment.serviceRequest;
  const fields = (sr?.service?.intakeFields ?? []) as { key: string; label: string }[];
  const payload = (sr?.intakePayload ?? {}) as Record<string, unknown>;
  const entries = fields
    .map((f) => ({ label: f.label, value: payload[f.key] }))
    .filter((e) => e.value !== undefined && e.value !== '' && !(Array.isArray(e.value) && e.value.length === 0));

  return (
    <div
      className="mt-3 p-3 rounded-lg"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4" style={{ color: 'var(--primary-light)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {sr.service.name}
        </span>
        <span className="badge badge-primary text-xs">Service</span>
      </div>
      {entries.length > 0 ? (
        <dl className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
          {entries.map((e) => (
            <div key={e.label} className="flex gap-2">
              <dt className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>{e.label}:</dt>
              <dd>{Array.isArray(e.value) ? e.value.join(', ') : String(e.value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No intake details provided.</p>
      )}
    </div>
  );
}
