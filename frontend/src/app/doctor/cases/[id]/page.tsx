'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/DashboardLayout';
import { casesApi, doctorsApi, aiApi } from '@/lib/api';
import { caseStatusLabel } from '@/lib/caseStatus';
import {
  Loader2, FileText, User, CheckCircle, X, ArrowLeft, Save,
  Sparkles, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

export default function DoctorCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aiDraft, setAiDraft] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [form, setForm] = useState({
    additionalObservations: '',
    recommendedRubrics: '',
    recommendedRemedies: [{ remedy: '', potency: '', rationale: '' }],
    suggestedInvestigations: '',
    lifestyleModifications: '',
    redFlagObservations: '',
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'doctor')) router.push('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (user?.role === 'doctor') loadCase();
  }, [user, params.id]);

  const loadCase = async () => {
    try {
      const { data } = await casesApi.getById(params.id as string);
      setCaseData(data);
      try {
        const r = await aiApi.getReport(params.id as string);
        if (r.data && r.data.id) setAiDraft(r.data);
      } catch { /* no existing draft */ }
    } catch (e) {
      console.error(e);
      router.push('/doctor/cases');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraft = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const { data } = await aiApi.generateForDoctor(params.id as string);
      setAiDraft(data);
    } catch (e: any) {
      setAiError(e?.response?.data?.message || 'Failed to generate AI draft');
    } finally {
      setAiLoading(false);
    }
  };

  const addRemedy = () => {
    setForm({ ...form, recommendedRemedies: [...form.recommendedRemedies, { remedy: '', potency: '', rationale: '' }] });
  };

  const updateRemedy = (idx: number, field: string, value: string) => {
    setForm({
      ...form,
      recommendedRemedies: form.recommendedRemedies.map((r, i) => i === idx ? { ...r, [field]: value } : r),
    });
  };

  const removeRemedy = (idx: number) => {
    setForm({ ...form, recommendedRemedies: form.recommendedRemedies.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async () => {
    const validRemedies = form.recommendedRemedies.filter((r) => r.remedy.trim());
    if (!form.additionalObservations.trim() || validRemedies.length === 0) {
      alert('Please fill in clinical observations and at least one recommended remedy.');
      return;
    }
    setSubmitting(true);
    try {
      await doctorsApi.submitReport(caseData.id, {
        ...form,
        recommendedRubrics: form.recommendedRubrics
          ? form.recommendedRubrics.split('\n').map((r: string) => r.trim()).filter(Boolean)
          : [],
        recommendedRemedies: validRemedies,
      });
      await loadCase();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      </DashboardLayout>
    );
  }

  if (!caseData) return null;

  const doctorReport = caseData.doctorReports?.[0];
  const alreadyReported = !!doctorReport;

  return (
    <DashboardLayout>
      <div className="max-w-4xl animate-in">
        <Link href="/doctor/cases" className="btn btn-ghost btn-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Case {caseData.caseNumber}</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Submitted {new Date(caseData.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span className="badge badge-primary capitalize text-sm px-3 py-1">
            {caseStatusLabel(caseData.status)}
          </span>
        </div>

        {/* Patient Overview */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
              <User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <h2 className="font-semibold">{caseData.patient?.name}</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {caseData.patient?.age}y • {caseData.patient?.gender} • {caseData.patient?.city}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Chief Complaint</h3>
              <p style={{ color: 'var(--text-secondary)' }}>{caseData.chiefComplaint}</p>
              {caseData.durationValue && (
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Duration: {caseData.durationValue} {caseData.durationUnit}
                </p>
              )}
            </div>
            {caseData.mentalSymptoms && (
              <div>
                <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Mental / Emotional</h3>
                <p style={{ color: 'var(--text-secondary)' }}>{caseData.mentalSymptoms}</p>
              </div>
            )}
            {caseData.thermalSensitivity && (
              <div>
                <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Thermal Sensitivity</h3>
                <p style={{ color: 'var(--text-secondary)' }} className="capitalize">{caseData.thermalSensitivity}</p>
              </div>
            )}
            {caseData.previousTreatments && (
              <div>
                <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Previous Treatments</h3>
                <p style={{ color: 'var(--text-secondary)' }}>{caseData.previousTreatments}</p>
              </div>
            )}
          </div>

          {caseData.documents?.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Uploaded Documents</h3>
              <div className="flex flex-wrap gap-2">
                {caseData.documents.map((doc: any) => (
                  <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer"
                    className="btn btn-ghost btn-sm text-xs">
                    <FileText className="w-3 h-3" /> {doc.label || doc.originalName}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Draft — Internal assistive tool (doctor only, never shown to patient) */}
        <div className="card mb-6" style={{ background: 'var(--bg-dark)', borderLeft: '4px solid var(--primary)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <h2 className="font-semibold">AI Draft</h2>
              <span className="badge badge-neutral text-xs">Internal — not shared with patient</span>
            </div>
            <button className="btn btn-secondary btn-sm" disabled={aiLoading} onClick={handleGenerateDraft}>
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiDraft ? 'Regenerate' : 'Generate AI Draft'}
            </button>
          </div>

          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            An assistive analysis to help you draft your expert report. Review and revise — all
            clinical decisions and the final report remain yours.
          </p>

          {aiError && (
            <div className="mb-3 p-2 rounded text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}>
              {aiError}
            </div>
          )}

          {!aiDraft ? (
            <p className="text-sm py-3" style={{ color: 'var(--text-muted)' }}>
              No draft yet. Click “Generate AI Draft” to produce a preliminary analysis for this case.
            </p>
          ) : (
            <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {aiDraft.mentalSymptoms?.length > 0 && (
                <div><strong style={{ color: 'var(--text-primary)' }}>Mental Symptoms:</strong>
                  <ul className="list-disc pl-5 mt-1">{aiDraft.mentalSymptoms.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {aiDraft.generalSymptoms?.length > 0 && (
                <div><strong style={{ color: 'var(--text-primary)' }}>General Symptoms:</strong>
                  <ul className="list-disc pl-5 mt-1">{aiDraft.generalSymptoms.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {aiDraft.particularSymptoms?.length > 0 && (
                <div><strong style={{ color: 'var(--text-primary)' }}>Particular Symptoms:</strong>
                  <ul className="list-disc pl-5 mt-1">{aiDraft.particularSymptoms.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {aiDraft.rubricSuggestions?.length > 0 && (
                <div><strong style={{ color: 'var(--text-primary)' }}>Rubric Suggestions:</strong>
                  <ul className="list-disc pl-5 mt-1">{aiDraft.rubricSuggestions.map((r: any, i: number) => (
                    <li key={i}>{r.rubricText}
                      {typeof r.confidence === 'number' && <span className="badge badge-neutral text-xs ml-1">{Math.round(r.confidence * 100)}%</span>}
                    </li>
                  ))}</ul>
                </div>
              )}
              {aiDraft.constitutionalTypes?.length > 0 && (
                <div><strong style={{ color: 'var(--text-primary)' }}>Constitutional Indicators:</strong>
                  <ul className="list-disc pl-5 mt-1">{aiDraft.constitutionalTypes.map((c: any, i: number) => (
                    <li key={i}>{c.type}{c.rationale ? ` — ${c.rationale}` : ''}</li>
                  ))}</ul>
                </div>
              )}
              {aiDraft.predominantMiasm && (
                <div><strong style={{ color: 'var(--text-primary)' }}>Predominant Miasm:</strong> {aiDraft.predominantMiasm}
                  {aiDraft.miasmRationale && <p className="text-xs mt-1">{aiDraft.miasmRationale}</p>}
                </div>
              )}
              {aiDraft.redFlags?.length > 0 && (
                <div className="p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <strong className="flex items-center gap-2" style={{ color: '#ef4444' }}>
                    <AlertTriangle className="w-4 h-4" /> Red Flags
                  </strong>
                  <ul className="list-disc pl-5 mt-1 text-red-400">
                    {aiDraft.redFlags.map((f: any, i: number) => (
                      <li key={i}>{typeof f === 'string' ? f : `${f.symptom}${f.recommendation ? ` — ${f.recommendation}` : ''}`}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Doctor Report — Already Submitted */}
        {alreadyReported ? (
          <div className="card" style={{ background: 'var(--bg-dark)', borderLeft: '4px solid #22c55e' }}>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6" style={{ color: '#22c55e' }} />
              <h2 className="font-semibold text-lg">Your Expert Report — Submitted</h2>
            </div>
            <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {doctorReport.additionalObservations && (
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Clinical Observations</strong>
                  <p className="mt-1">{doctorReport.additionalObservations}</p>
                </div>
              )}
              {doctorReport.recommendedRemedies?.length > 0 && (
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Recommended Remedies</strong>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    {doctorReport.recommendedRemedies.map((r: any, i: number) => (
                      <li key={i}><span className="font-medium text-white">{r.remedy}</span> {r.potency && `— ${r.potency}`}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Doctor Report Form */
          <div className="card">
            <h2 className="font-semibold text-lg mb-6">Submit Your Expert Report</h2>

            {/* Clinical Observations */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Clinical Observations *
              </label>
              <textarea className="input w-full" rows={4}
                placeholder="Your expert clinical observations, constitutional assessment, and miasmatic analysis..."
                value={form.additionalObservations}
                onChange={(e) => setForm({ ...form, additionalObservations: e.target.value })} />
            </div>

            {/* Recommended Remedies */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                Recommended Remedies *
              </label>
              {form.recommendedRemedies.map((r, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input className="input flex-1" placeholder="Remedy" value={r.remedy}
                    onChange={(e) => updateRemedy(idx, 'remedy', e.target.value)} />
                  <input className="input w-28" placeholder="Potency" value={r.potency}
                    onChange={(e) => updateRemedy(idx, 'potency', e.target.value)} />
                  <input className="input flex-1" placeholder="Rationale (optional)" value={r.rationale}
                    onChange={(e) => updateRemedy(idx, 'rationale', e.target.value)} />
                  {form.recommendedRemedies.length > 1 && (
                    <button onClick={() => removeRemedy(idx)} className="btn btn-ghost btn-sm w-8 h-8 p-0 justify-center">
                      <X className="w-4 h-4" style={{ color: 'var(--error, #ef4444)' }} />
                    </button>
                  )}
                </div>
              ))}
              <button className="btn btn-ghost btn-sm mt-1" onClick={addRemedy}>+ Add Remedy</button>
            </div>

            {/* Rubrics */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Repertory Rubrics (one per line, optional)
              </label>
              <textarea className="input w-full" rows={3}
                placeholder="Mind; Anxiety; health, about&#10;Generalities; Food and drinks; cold food, desires&#10;..."
                value={form.recommendedRubrics}
                onChange={(e) => setForm({ ...form, recommendedRubrics: e.target.value })} />
            </div>

            {/* Lifestyle */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Lifestyle & Dietary Modifications
              </label>
              <textarea className="input w-full" rows={2}
                placeholder="Diet recommendations, aggravations to avoid, lifestyle changes..."
                value={form.lifestyleModifications}
                onChange={(e) => setForm({ ...form, lifestyleModifications: e.target.value })} />
            </div>

            {/* Red Flags */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Red Flag Observations (if any)
              </label>
              <textarea className="input w-full" rows={2}
                placeholder="Any red flags requiring urgent conventional medical attention..."
                value={form.redFlagObservations}
                onChange={(e) => setForm({ ...form, redFlagObservations: e.target.value })} />
            </div>

            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Submit Report
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
