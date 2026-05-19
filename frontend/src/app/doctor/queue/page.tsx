'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { casesApi, doctorsApi } from '@/lib/api';
import { Loader2, CheckCircle, Eye } from 'lucide-react';

export default function DoctorQueuePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    additionalObservations: '',
    recommendedRemedies: '', suggestedInvestigations: '', lifestyleModifications: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!authLoading && (!user || user.role !== 'doctor')) router.push('/login?role=doctor'); }, [authLoading, user]);
  useEffect(() => { if (user?.role === 'doctor') loadQueue(); }, [user]);

  const loadQueue = async () => {
    try { const { data } = await casesApi.getDoctorQueue(); setQueue(data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAccept = async (caseId: string) => {
    setAccepting(true);
    try {
      const { data } = await casesApi.acceptCase(caseId);
      setSelectedCase(data);
      setQueue(queue.filter(c => c.id !== caseId));
    } catch (e) { console.error(e); } finally { setAccepting(false); }
  };

  const handleSubmitReport = async () => {
    if (!selectedCase) return;
    setSubmitting(true);
    try {
      const remedies = reviewForm.recommendedRemedies
        ? reviewForm.recommendedRemedies.split(',').map(r => ({ remedy: r.trim(), potency: '', rationale: '' }))
        : [];
      await doctorsApi.submitReport(selectedCase.id, {
        ...reviewForm,
        recommendedRemedies: remedies,
      });
      setSelectedCase(null);
      setReviewForm({ additionalObservations: '',
        recommendedRemedies: '', suggestedInvestigations: '', lifestyleModifications: '' });
      loadQueue();
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  if (authLoading || loading) return <DashboardLayout><div className="flex items-center justify-center h-96"><div className="spinner" /></div></DashboardLayout>;

  // Case review view
  if (selectedCase) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl animate-in">
          <button className="btn btn-ghost mb-4" onClick={() => { setSelectedCase(null); }}>← Back to Queue</button>
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

          {/* Doctor Review Form */}
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
            <div className="grid grid-cols-2 gap-4 mb-6">
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

  // Queue list view
  return (
    <DashboardLayout>
      <div className="animate-in">
        <h1 className="text-2xl font-bold mb-2">Case Queue</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Cases matching your specialities awaiting review</p>

        {queue.length === 0 ? (
          <div className="card text-center py-16">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--success)' }} />
            <p className="text-lg font-medium mb-2">Queue is empty!</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No new cases matching your specialities right now</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between">
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
                  <button className="btn btn-primary" disabled={accepting} onClick={() => handleAccept(c.id)}>
                    {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    Accept & Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
