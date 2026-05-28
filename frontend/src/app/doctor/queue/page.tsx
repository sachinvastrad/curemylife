'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { casesApi, doctorsApi, serviceRequestsApi } from '@/lib/api';
import { Loader2, CheckCircle, Eye, ClipboardList, Sparkles, CheckCheck } from 'lucide-react';

type Tab = 'cases' | 'services';

export default function DoctorQueuePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('cases');

  // ---- Case queue ----
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    additionalObservations: '',
    recommendedRemedies: '', suggestedInvestigations: '', lifestyleModifications: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // ---- Service-request queue ----
  const [srQueue, setSrQueue] = useState<any[]>([]);
  const [srAssigned, setSrAssigned] = useState<any[]>([]);
  const [srAcceptingId, setSrAcceptingId] = useState<string | null>(null);
  const [srError, setSrError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'doctor')) router.push('/login?role=doctor');
  }, [authLoading, user, router]);

  useEffect(() => { if (user?.role === 'doctor') loadAll(); }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [casesRes, srQueueRes, srAssignedRes] = await Promise.allSettled([
        casesApi.getDoctorQueue(),
        serviceRequestsApi.doctorQueue(),
        serviceRequestsApi.doctorAssigned(),
      ]);
      if (casesRes.status === 'fulfilled')      setQueue(casesRes.value.data);
      if (srQueueRes.status === 'fulfilled')    setSrQueue(srQueueRes.value.data);
      if (srAssignedRes.status === 'fulfilled') setSrAssigned(srAssignedRes.value.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCase = async (caseId: string) => {
    setAccepting(true);
    try {
      const { data } = await casesApi.acceptCase(caseId);
      setSelectedCase(data);
      setQueue((q) => q.filter((c) => c.id !== caseId));
    } catch (e) { console.error(e); } finally { setAccepting(false); }
  };

  const handleSubmitReport = async () => {
    if (!selectedCase) return;
    setSubmitting(true);
    try {
      const remedies = reviewForm.recommendedRemedies
        ? reviewForm.recommendedRemedies.split(',').map((r) => ({ remedy: r.trim(), potency: '', rationale: '' }))
        : [];
      await doctorsApi.submitReport(selectedCase.id, {
        ...reviewForm,
        recommendedRemedies: remedies,
      });
      setSelectedCase(null);
      setReviewForm({
        additionalObservations: '',
        recommendedRemedies: '', suggestedInvestigations: '', lifestyleModifications: '',
      });
      loadAll();
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  const handleAcceptServiceRequest = async (id: string) => {
    setSrAcceptingId(id);
    setSrError(null);
    try {
      await serviceRequestsApi.accept(id);
      await loadAll();
    } catch (e: any) {
      setSrError(e?.response?.data?.message ?? 'Could not accept this request.');
    } finally {
      setSrAcceptingId(null);
    }
  };

  if (authLoading || loading) {
    return <DashboardLayout><div className="flex items-center justify-center h-96"><div className="spinner" /></div></DashboardLayout>;
  }

  // Case-review modal-style view (Cases tab)
  if (selectedCase) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl animate-in">
          <button className="btn btn-ghost mb-4" onClick={() => setSelectedCase(null)}>← Back to Queue</button>
          <h1 className="text-2xl font-bold mb-2">Review Case: {selectedCase.caseNumber}</h1>

          <div className="card mb-6">
            <h3 className="font-semibold mb-3">Patient Info</h3>
            <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <p><strong>Name:</strong> {selectedCase.patient?.name}</p>
              <p><strong>Age/Gender:</strong> {selectedCase.patient?.age}y, {selectedCase.patient?.gender}</p>
              <p><strong>City:</strong> {selectedCase.patient?.city}</p>
            </div>
            <h3 className="font-semibold mt-4 mb-2">Chief Complaint</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedCase.chiefComplaint}</p>
            {selectedCase.durationValue && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Duration: {selectedCase.durationValue} {selectedCase.durationUnit}</p>
            )}
            {selectedCase.previousTreatments && (
              <><h4 className="text-sm font-medium mt-3">Previous Treatments</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedCase.previousTreatments}</p></>
            )}
            {selectedCase.familyHistory && (
              <><h4 className="text-sm font-medium mt-3">Family History</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedCase.familyHistory}</p></>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-lg mb-4">Your Expert Review</h3>
            <div className="mb-4">
              <label className="label">Additional Observations</label>
              <textarea className="input" rows={3} placeholder="Your clinical observations..."
                value={reviewForm.additionalObservations}
                onChange={(e) => setReviewForm({ ...reviewForm, additionalObservations: e.target.value })} />
            </div>
            <div className="mb-4">
              <label className="label">Recommended Remedies (comma-separated)</label>
              <input className="input" placeholder="e.g. Arsenicum Album 30C, Nux Vomica 200C"
                value={reviewForm.recommendedRemedies}
                onChange={(e) => setReviewForm({ ...reviewForm, recommendedRemedies: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="label">Suggested Investigations</label>
                <textarea className="input" rows={2} value={reviewForm.suggestedInvestigations}
                  onChange={(e) => setReviewForm({ ...reviewForm, suggestedInvestigations: e.target.value })} />
              </div>
              <div>
                <label className="label">Lifestyle Modifications</label>
                <textarea className="input" rows={2} value={reviewForm.lifestyleModifications}
                  onChange={(e) => setReviewForm({ ...reviewForm, lifestyleModifications: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary btn-lg" disabled={submitting} onClick={handleSubmitReport}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Dispatch Report to Patient
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-in max-w-5xl">
        <h1 className="text-2xl font-bold mb-2">Queue</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Cases and service requests routed to your specialities.
        </p>

        {/* Tab switcher */}
        <div
          className="inline-flex p-1 rounded-xl mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <TabButton active={tab === 'cases'} onClick={() => setTab('cases')} Icon={ClipboardList} label="Cases" count={queue.length} />
          <TabButton active={tab === 'services'} onClick={() => setTab('services')} Icon={Sparkles} label="Service Requests" count={srQueue.length} />
        </div>

        {tab === 'cases' && (
          queue.length === 0 ? (
            <EmptyState Icon={CheckCircle} title="Queue is empty!" subtitle="No new cases matching your specialities right now." />
          ) : (
            <div className="space-y-4">
              {queue.map((c) => (
                <div key={c.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold">{c.caseNumber}</span>
                      </div>
                      <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                        <strong>{c.patient?.gender}, {c.patient?.age}y</strong>
                        {c.patient?.city ? ` — ${c.patient.city}` : ''}
                      </p>
                      <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                        {c.chiefComplaint?.substring(0, 200)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.specialities?.map((s: any) => (
                          <span key={s.specialityId} className="badge badge-primary text-xs">{s.speciality.name}</span>
                        ))}
                      </div>
                      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                        Submitted: {new Date(c.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <button className="btn btn-primary shrink-0" disabled={accepting} onClick={() => handleAcceptCase(c.id)}>
                      {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      Accept &amp; Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'services' && (
          <ServiceRequestsTab
            queue={srQueue}
            assigned={srAssigned}
            acceptingId={srAcceptingId}
            error={srError}
            onAccept={handleAcceptServiceRequest}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// ===================== TAB SWITCHER =====================

function TabButton({
  active, onClick, Icon, label, count,
}: { active: boolean; onClick: () => void; Icon: any; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition"
      style={{
        background: active ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'transparent',
        color: active ? '#fff' : 'var(--text-secondary)',
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      <span
        className="text-xs px-1.5 py-0.5 rounded-full"
        style={{
          background: active ? 'rgba(255,255,255,0.22)' : 'var(--bg-surface)',
          color: active ? '#fff' : 'var(--text-muted)',
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ===================== SERVICE REQUESTS TAB =====================

function ServiceRequestsTab({
  queue, assigned, acceptingId, error, onAccept,
}: {
  queue: any[];
  assigned: any[];
  acceptingId: string | null;
  error: string | null;
  onAccept: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {error && (
        <div className="card" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'var(--error)' }}>
          <div className="text-sm" style={{ color: 'var(--error)' }}>{error}</div>
        </div>
      )}

      {/* Unassigned queue */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          In queue · {queue.length}
        </h2>
        {queue.length === 0 ? (
          <EmptyState
            Icon={CheckCheck}
            title="No service requests in queue"
            subtitle="When a patient submits a service intake routed to one of your specialities, it appears here."
          />
        ) : (
          <div className="space-y-4">
            {queue.map((sr) => (
              <SrQueueCard
                key={sr.id}
                sr={sr}
                busy={acceptingId === sr.id}
                onAccept={() => onAccept(sr.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Assigned to me */}
      {assigned.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Accepted by you · {assigned.length}
          </h2>
          <div className="space-y-3">
            {assigned.map((sr) => (
              <SrAssignedCard key={sr.id} sr={sr} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SrQueueCard({ sr, busy, onAccept }: { sr: any; busy: boolean; onAccept: () => void }) {
  const fields = (sr.service?.intakeFields ?? []) as { key: string; label: string }[];
  const payload = (sr.intakePayload ?? {}) as Record<string, unknown>;
  const summaryEntries = fields
    .map((f) => ({ label: f.label, value: payload[f.key] }))
    .filter((e) => e.value !== undefined && e.value !== '' && !(Array.isArray(e.value) && e.value.length === 0))
    .slice(0, 4);

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--primary-light)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{sr.service?.name}</span>
            <span className="badge badge-primary text-xs">Service</span>
          </div>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            <strong>{sr.patient?.name}</strong>
            {sr.patient?.gender && sr.patient?.age && ` — ${sr.patient.gender}, ${sr.patient.age}y`}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {sr.service?.specialities?.map((sp: any) => (
              <span key={sp.id} className="badge badge-primary text-xs">{sp.name}</span>
            ))}
          </div>
          {summaryEntries.length > 0 && (
            <dl
              className="text-xs space-y-1 p-2 rounded-md"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
            >
              {summaryEntries.map((e) => (
                <div key={e.label} className="flex gap-2">
                  <dt className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>{e.label}:</dt>
                  <dd>{Array.isArray(e.value) ? e.value.join(', ') : String(e.value)}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Submitted: {sr.submittedAt ? new Date(sr.submittedAt).toLocaleString() : '—'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary shrink-0"
          onClick={onAccept}
          disabled={busy}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Accept
        </button>
      </div>
    </div>
  );
}

function SrAssignedCard({ sr }: { sr: any }) {
  const nextAppt = (sr.appointments ?? []).find((a: any) => ['booked', 'confirmed', 'in_progress'].includes(a.status));
  return (
    <div
      className="card"
      style={{ borderLeft: '4px solid var(--primary-light)', background: 'var(--bg-card)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--primary-light)' }} />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{sr.service?.name}</span>
            <span
              className="badge text-xs"
              style={{
                background: sr.status === 'booked' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
                color: sr.status === 'booked' ? 'var(--success)' : '#a5b4fc',
              }}
            >
              {sr.status === 'booked' ? 'Slot booked' : 'Waiting for patient to book'}
            </span>
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <strong>{sr.patient?.name}</strong>
            {sr.patient?.gender && sr.patient?.age && ` — ${sr.patient.gender}, ${sr.patient.age}y`}
          </div>
          {nextAppt && (
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {new Date(nextAppt.scheduledDate).toLocaleDateString()} at {nextAppt.scheduledStart}
            </div>
          )}
        </div>
        <div className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
          Accepted {sr.acceptedAt ? new Date(sr.acceptedAt).toLocaleDateString() : '—'}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ Icon, title, subtitle }: { Icon: any; title: string; subtitle: string }) {
  return (
    <div className="card text-center py-12">
      <Icon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
      <p className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
    </div>
  );
}
