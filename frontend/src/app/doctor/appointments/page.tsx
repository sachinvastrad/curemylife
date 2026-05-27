'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { appointmentsApi, prescriptionsApi } from '@/lib/api';
import { Calendar, Video, Clock, Loader2, Pill, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function DoctorAppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Prescription Form State
  const [activeAppointment, setActiveAppointment] = useState<any>(null);
  const [prescriptionForm, setPrescriptionForm] = useState({
    remedyName: '', potency: '', dosage: '', frequency: '', duration: '',
    dietaryRestrictions: '', followupTimeline: '',
  });
  const [submittingPrescription, setSubmittingPrescription] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'doctor')) router.push('/login');
  }, [authLoading, user]);

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

  const handleIssuePrescription = async () => {
    if (!activeAppointment) return;
    setSubmittingPrescription(true);
    try {
      await prescriptionsApi.create({
        caseId: activeAppointment.caseId,
        appointmentId: activeAppointment.id,
        patientId: activeAppointment.patientId,
        ...prescriptionForm
      });
      await appointmentsApi.complete(activeAppointment.id, 'Prescription issued');
      setActiveAppointment(null);
      setPrescriptionForm({ remedyName: '', potency: '', dosage: '', frequency: '', duration: '', dietaryRestrictions: '', followupTimeline: '' });
      loadAppointments();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingPrescription(false);
    }
  };

  if (authLoading || loading) return <DashboardLayout><div className="flex justify-center py-20"><div className="spinner" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="animate-in max-w-5xl">
        <h1 className="text-2xl font-bold mb-2">Appointments</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Manage your consultation schedule and issue prescriptions</p>
        
        {appointments.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-medium mb-2">No appointments scheduled</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              When patients book a consultation after receiving your report, they will appear here.
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
                        {a.case_ ? (
                          <button className="btn btn-success w-full" onClick={() => setActiveAppointment(a)}>
                            <Pill className="w-4 h-4" /> Issue Prescription
                          </button>
                        ) : (
                          <button
                            className="btn btn-success w-full"
                            onClick={() => appointmentsApi.complete(a.id, 'Service consultation completed').then(loadAppointments)}
                            title="Service consultations don't require a prescription in v1"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Mark Completed
                          </button>
                        )}
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

        {/* Prescription Modal */}
        {activeAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-dark)' }}>
              <h2 className="text-xl font-bold mb-4">Issue Prescription for {activeAppointment.patient?.name}</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Remedy Name *</label>
                  <input className="input" placeholder="e.g. Nux Vomica" value={prescriptionForm.remedyName} 
                    onChange={e => setPrescriptionForm({...prescriptionForm, remedyName: e.target.value})} />
                </div>
                <div>
                  <label className="label">Potency *</label>
                  <input className="input" placeholder="e.g. 200C" value={prescriptionForm.potency} 
                    onChange={e => setPrescriptionForm({...prescriptionForm, potency: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="label">Dosage *</label>
                  <input className="input" placeholder="e.g. 4 pills" value={prescriptionForm.dosage} 
                    onChange={e => setPrescriptionForm({...prescriptionForm, dosage: e.target.value})} />
                </div>
                <div>
                  <label className="label">Frequency *</label>
                  <input className="input" placeholder="e.g. TDS" value={prescriptionForm.frequency} 
                    onChange={e => setPrescriptionForm({...prescriptionForm, frequency: e.target.value})} />
                </div>
                <div>
                  <label className="label">Duration *</label>
                  <input className="input" placeholder="e.g. 1 week" value={prescriptionForm.duration} 
                    onChange={e => setPrescriptionForm({...prescriptionForm, duration: e.target.value})} />
                </div>
              </div>

              <div className="mb-4">
                <label className="label">Dietary Restrictions</label>
                <textarea className="input" rows={2} placeholder="e.g. Avoid coffee and camphor" value={prescriptionForm.dietaryRestrictions} 
                  onChange={e => setPrescriptionForm({...prescriptionForm, dietaryRestrictions: e.target.value})} />
              </div>

              <div className="mb-6">
                <label className="label">Follow-up Timeline</label>
                <input className="input" placeholder="e.g. After 15 days" value={prescriptionForm.followupTimeline} 
                  onChange={e => setPrescriptionForm({...prescriptionForm, followupTimeline: e.target.value})} />
              </div>

              {(() => {
                const missing = [
                  !prescriptionForm.remedyName && 'Remedy Name',
                  !prescriptionForm.potency && 'Potency',
                  !prescriptionForm.dosage && 'Dosage',
                  !prescriptionForm.frequency && 'Frequency',
                  !prescriptionForm.duration && 'Duration',
                ].filter(Boolean) as string[];
                return missing.length > 0 ? (
                  <div className="mb-3 p-3 rounded-lg text-xs" style={{ background: 'rgba(234,179,8,0.1)', color: 'var(--warning, #d97706)' }}>
                    Please fill the required field{missing.length > 1 ? 's' : ''}: {missing.join(', ')}.
                  </div>
                ) : null;
              })()}
              <div className="flex justify-end gap-3">
                <button className="btn btn-ghost" onClick={() => setActiveAppointment(null)}>Cancel</button>
                <button className="btn btn-primary" disabled={submittingPrescription || !prescriptionForm.remedyName || !prescriptionForm.potency || !prescriptionForm.dosage || !prescriptionForm.frequency || !prescriptionForm.duration} onClick={handleIssuePrescription}>
                  {submittingPrescription ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pill className="w-4 h-4" />}
                  Complete & Send
                </button>
              </div>
            </div>
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
