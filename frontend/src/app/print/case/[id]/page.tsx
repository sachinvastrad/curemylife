'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { casesApi } from '@/lib/api';

/* ===================== CONSTANTS ===================== */

const BRAND = '#0e7c6b';
const BRAND_LIGHT = '#12a890';
const INK = '#0f172a';
const INK_SOFT = '#475569';
const INK_MUTED = '#94a3b8';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', ai_processing: 'AI Processing',
  awaiting_doctor: 'Awaiting Doctor', report_ready: 'Report Ready',
  consultation_booked: 'Consultation Booked', consultation_done: 'Consultation Done',
  closed: 'Closed',
};

/* ===================== PAGE ===================== */

export default function PrintCasePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    casesApi.getById(id)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <CenterMessage>Loading your report…</CenterMessage>;
  if (!data)   return <CenterMessage>Report not found. Please try again from your case page.</CenterMessage>;

  const caseData = data;
  const patient = caseData.patient || {};
  const doctor  = caseData.assignedDoctor || {};
  const dReport = (caseData.doctorReports || [])[0] || null;
  const aiReport = (caseData.aiReports || [])[0] || null;
  const patientName = patient.name || 'Patient';

  return (
    <>
      <PrintStyles />
      <PrintActions />

      {/* ===================== PAGE 1: Cover + case info + AI highlights ===================== */}
      <div className="report-page page-break">
        <HeroBanner caseNumber={caseData.caseNumber} status={caseData.status} />

        <section style={{ padding: '14mm 18mm 0' }}>
          <PatientHeader patient={patient} caseData={caseData} doctor={doctor} />

          <SectionTitle>Chief complaint</SectionTitle>
          <SoftBlock>
            <div style={{ fontSize: '11pt', color: INK, lineHeight: 1.5 }}>
              {caseData.chiefComplaint || <em style={{ color: INK_MUTED }}>Not recorded</em>}
            </div>
            {(caseData.durationValue || caseData.durationUnit) && (
              <div style={{ fontSize: '9pt', color: INK_SOFT, marginTop: 6 }}>
                <strong>Duration:</strong> {caseData.durationValue} {caseData.durationUnit}
              </div>
            )}
          </SoftBlock>

          <CaseHistory caseData={caseData} />

          {aiReport && <AiHighlights aiReport={aiReport} />}
        </section>

        <PageFooter page={1} total={2} patientName={patientName} caseNumber={caseData.caseNumber} />
      </div>

      {/* ===================== PAGE 2: Doctor's report + signature ===================== */}
      <div className="report-page">
        <SecondaryHeader patientName={patientName} caseNumber={caseData.caseNumber} />

        <section style={{ padding: '12mm 18mm 0' }}>
          {dReport ? (
            <>
              <DoctorAssessment dReport={dReport} />
              <RecommendedRemedies remedies={dReport.recommendedRemedies} />
              <LifestyleAndInvestigations dReport={dReport} />
              {dReport.redFlagObservations && (
                <>
                  <SectionTitle>Red flag observations</SectionTitle>
                  <div
                    style={{
                      background: '#fee2e2', border: '1px solid #fca5a5',
                      borderLeft: '4px solid #dc2626', borderRadius: 6,
                      padding: '10pt 12pt', fontSize: '10pt', color: '#7f1d1d',
                    }}
                  >
                    {dReport.redFlagObservations}
                  </div>
                </>
              )}
            </>
          ) : (
            <SoftBlock>
              <div style={{ color: INK_SOFT, fontStyle: 'italic' }}>
                The reviewing doctor&rsquo;s report is not available yet. Once it&rsquo;s ready,
                you&rsquo;ll be able to print this report with the doctor&rsquo;s assessment, recommended
                remedies, and lifestyle guidance.
              </div>
            </SoftBlock>
          )}

          <SignatureBlock doctor={doctor} dispatchedAt={dReport?.dispatchedAt || dReport?.createdAt} />
          <Disclaimer />
        </section>

        <PageFooter page={2} total={2} patientName={patientName} caseNumber={caseData.caseNumber} />
      </div>
    </>
  );
}

/* ===================== UI ATOMS ===================== */

function HeroBanner({ caseNumber, status }: { caseNumber: string; status: string }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
        color: '#fff', padding: '16mm 18mm 14mm', position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ fontSize: '9pt', letterSpacing: 2, opacity: 0.85, textTransform: 'uppercase' }}>
            HomeoOpinion · Case Report
          </div>
          <div style={{ fontSize: '26pt', fontWeight: 800, lineHeight: 1.1, marginTop: 6 }}>
            Your second opinion
          </div>
          <div style={{ fontSize: '11pt', marginTop: 6, opacity: 0.95 }}>
            Case <strong>{caseNumber}</strong> &middot; {STATUS_LABELS[status] || status}
          </div>
        </div>
        <Logomark />
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute', right: -40, bottom: -60,
          width: 220, height: 220, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }}
      />
    </div>
  );
}

function Logomark() {
  return (
    <div
      style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24pt',
      }}
    >
      🩺
    </div>
  );
}

function SecondaryHeader({ patientName, caseNumber }: { patientName: string; caseNumber: string }) {
  return (
    <div
      style={{
        padding: '12mm 18mm 8mm', borderBottom: `2px solid ${BRAND}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      }}
    >
      <div>
        <div style={{ fontSize: '8pt', letterSpacing: 2, color: INK_MUTED, textTransform: 'uppercase' }}>
          HomeoOpinion · Case Report
        </div>
        <div style={{ fontSize: '14pt', fontWeight: 700, color: INK, marginTop: 2 }}>
          {patientName} &mdash; {caseNumber}
        </div>
      </div>
      <div style={{ fontSize: '9pt', color: INK_MUTED }}>Page 2 of 2</div>
    </div>
  );
}

function PatientHeader({
  patient, caseData, doctor,
}: { patient: any; caseData: any; doctor: any }) {
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: '10pt 14pt',
        }}
      >
        <div style={{ fontSize: '8pt', letterSpacing: 1.4, color: INK_MUTED, textTransform: 'uppercase' }}>
          Patient
        </div>
        <div style={{ fontSize: '14pt', fontWeight: 700, color: INK, marginTop: 2 }}>
          {patient.name || 'Patient'}
        </div>
        <div style={{ fontSize: '9pt', color: INK_SOFT, marginTop: 4 }}>
          {patient.age && <>{patient.age} years · </>}
          {patient.gender && <>{cap(patient.gender)}</>}
          {patient.city && <> · {patient.city}</>}
        </div>
        <div style={{ fontSize: '8.5pt', color: INK_MUTED, marginTop: 4 }}>
          Submitted {caseData.submittedAt
            ? new Date(caseData.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : new Date(caseData.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>

      <div
        style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: '10pt 14pt',
        }}
      >
        <div style={{ fontSize: '8pt', letterSpacing: 1.4, color: INK_MUTED, textTransform: 'uppercase' }}>
          Reviewing doctor
        </div>
        {doctor?.name ? (
          <>
            <div style={{ fontSize: '12pt', fontWeight: 700, color: INK, marginTop: 2 }}>
              Dr. {doctor.name}
            </div>
            {doctor.qualifications && (
              <div style={{ fontSize: '8.5pt', color: INK_SOFT, marginTop: 2 }}>
                {doctor.qualifications}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: '10pt', color: INK_MUTED, fontStyle: 'italic', marginTop: 4 }}>
            Pending assignment
          </div>
        )}
      </div>
    </div>
  );
}

function CaseHistory({ caseData }: { caseData: any }) {
  const items: { label: string; value?: string }[] = [
    { label: 'Previous treatments', value: caseData.previousTreatments },
    { label: 'Past illnesses',      value: caseData.pastIllnesses },
    { label: 'Family history',      value: caseData.familyHistory },
  ].filter((x) => x.value);

  if (items.length === 0) return null;

  return (
    <>
      <SectionTitle>Case history</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '8pt 10pt', breakInside: 'avoid',
            }}
          >
            <div style={{
              fontSize: '7.5pt', fontWeight: 700, color: INK_MUTED,
              textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3,
            }}>
              {item.label}
            </div>
            <div style={{ fontSize: '9pt', color: INK, lineHeight: 1.5 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AiHighlights({ aiReport }: { aiReport: any }) {
  const mental = asArray(aiReport.mentalSymptoms);
  const general = asArray(aiReport.generalSymptoms);
  const particular = asArray(aiReport.particularSymptoms);
  const redFlags = asArray(aiReport.redFlags);

  if (!mental.length && !general.length && !particular.length && !redFlags.length) return null;

  return (
    <>
      <SectionTitle>AI-assisted analysis</SectionTitle>

      {redFlags.length > 0 && (
        <div
          style={{
            background: '#fee2e2', border: '1px solid #fca5a5',
            borderLeft: '4px solid #dc2626', borderRadius: 6,
            padding: '8pt 12pt', fontSize: '9pt', color: '#7f1d1d',
            marginBottom: 10,
          }}
        >
          <strong>Red flags noted by AI:</strong>
          <ul style={{ margin: '4pt 0 0 14pt', padding: 0 }}>
            {redFlags.map((r: any, i: number) => (
              <li key={i}>{typeof r === 'string' ? r : (r.symptom || r.text || JSON.stringify(r))}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <SymptomCard title="Mental & emotional"  tint="#e0e7ff" items={mental} />
        <SymptomCard title="General"             tint="#dcfce7" items={general} />
        <SymptomCard title="Particular"          tint="#fef3c7" items={particular} />
      </div>

      <div style={{ fontSize: '7.5pt', color: INK_MUTED, fontStyle: 'italic', marginBottom: 8 }}>
        AI analysis is preliminary. The final assessment is the doctor&rsquo;s.
      </div>
    </>
  );
}

function SymptomCard({ title, tint, items }: { title: string; tint: string; items: any[] }) {
  if (!items?.length) {
    return (
      <div style={{ background: tint + '55', border: '1px solid ' + tint, borderRadius: 8, padding: '6pt 10pt' }}>
        <div style={{ fontSize: '8pt', fontWeight: 700, color: INK_SOFT, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: '8pt', color: INK_MUTED, fontStyle: 'italic' }}>None noted</div>
      </div>
    );
  }
  return (
    <div style={{ background: tint, border: `1px solid ${tint}`, borderRadius: 8, padding: '6pt 10pt', breakInside: 'avoid' }}>
      <div style={{ fontSize: '8pt', fontWeight: 700, color: INK_SOFT, marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 14, fontSize: '8.5pt', color: INK, lineHeight: 1.5 }}>
        {items.slice(0, 8).map((it: any, i: number) => (
          <li key={i}>{typeof it === 'string' ? it : (it.symptom || it.name || it.text || JSON.stringify(it))}</li>
        ))}
      </ul>
    </div>
  );
}

function DoctorAssessment({ dReport }: { dReport: any }) {
  return (
    <>
      <SectionTitle>Doctor&rsquo;s assessment</SectionTitle>
      {dReport.aiAgreement && (
        <div style={{ fontSize: '9pt', color: INK_SOFT, marginBottom: 6 }}>
          AI agreement: <strong style={{ color: INK }}>{cap(dReport.aiAgreement.replace(/_/g, ' '))}</strong>
          {dReport.aiAgreementNotes && <> &mdash; {dReport.aiAgreementNotes}</>}
        </div>
      )}
      {dReport.additionalObservations && (
        <SoftBlock>
          <div style={{ fontSize: '10pt', color: INK, lineHeight: 1.6 }}>
            {dReport.additionalObservations}
          </div>
        </SoftBlock>
      )}
    </>
  );
}

function RecommendedRemedies({ remedies }: { remedies: any }) {
  const arr = asArray(remedies);
  if (!arr.length) return null;
  return (
    <>
      <SectionTitle>Recommended remedies</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {arr.map((r: any, i: number) => (
          <div
            key={i}
            style={{
              border: `1px solid ${BRAND}22`, borderRadius: 10,
              padding: '10pt 12pt', breakInside: 'avoid',
              background: `linear-gradient(135deg, #f0fdfa 0%, #fff 60%)`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: '12pt', fontWeight: 700, color: BRAND }}>
                {r.remedy || r.name || `Remedy ${i + 1}`}
              </div>
              {r.potency && (
                <div
                  style={{
                    fontSize: '8.5pt', fontWeight: 600, color: BRAND,
                    background: `${BRAND}11`, padding: '2px 8px', borderRadius: 999,
                  }}
                >
                  {r.potency}
                </div>
              )}
            </div>
            {r.rationale && (
              <div style={{ fontSize: '8.5pt', color: INK_SOFT, lineHeight: 1.5 }}>
                {r.rationale}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function LifestyleAndInvestigations({ dReport }: { dReport: any }) {
  if (!dReport.lifestyleModifications && !dReport.suggestedInvestigations) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
      {dReport.lifestyleModifications && (
        <ListBlock
          title="✓ Lifestyle recommendations"
          tint="#dcfce7"
          textColor="#166534"
          body={dReport.lifestyleModifications}
        />
      )}
      {dReport.suggestedInvestigations && (
        <ListBlock
          title="🧪 Suggested investigations"
          tint="#e0e7ff"
          textColor="#3730a3"
          body={dReport.suggestedInvestigations}
        />
      )}
    </div>
  );
}

function ListBlock({
  title, tint, textColor, body,
}: { title: string; tint: string; textColor: string; body: string }) {
  return (
    <div
      style={{
        background: tint, border: `1px solid ${textColor}22`,
        borderRadius: 8, padding: '8pt 12pt', breakInside: 'avoid',
      }}
    >
      <div style={{ fontSize: '9pt', fontWeight: 700, color: textColor, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: '9pt', color: INK, lineHeight: 1.5, whiteSpace: 'pre-wrap' as const }}>
        {body}
      </div>
    </div>
  );
}

function SignatureBlock({
  doctor, dispatchedAt,
}: { doctor: any; dispatchedAt?: string }) {
  if (!doctor?.name) return null;
  return (
    <div
      style={{
        marginTop: 16, padding: '12pt 14pt',
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
        display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: '8pt', color: INK_MUTED, letterSpacing: 1.4, textTransform: 'uppercase' }}>
          Reviewing doctor
        </div>
        <div style={{ fontSize: '13pt', fontWeight: 700, color: INK, marginTop: 4 }}>
          Dr. {doctor.name}
        </div>
        {doctor.qualifications && (
          <div style={{ fontSize: '9pt', color: INK_SOFT, marginTop: 2 }}>
            {doctor.qualifications}
          </div>
        )}
        {doctor.cchRegistrationNo && (
          <div style={{ fontSize: '8.5pt', color: INK_MUTED, marginTop: 2 }}>
            CCH Reg. No: {doctor.cchRegistrationNo}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '8pt', color: INK_MUTED, letterSpacing: 1.4, textTransform: 'uppercase' }}>
          Report dispatched
        </div>
        <div style={{ fontSize: '11pt', fontWeight: 600, color: INK, marginTop: 4 }}>
          {dispatchedAt
            ? new Date(dispatchedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—'}
        </div>
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <div
      style={{
        fontSize: '7.5pt', color: INK_MUTED, fontStyle: 'italic',
        marginTop: 14, padding: '6pt 0', borderTop: '1px solid #e2e8f0',
      }}
    >
      This is a second-opinion homoeopathic case report and does not replace direct clinical consultation
      or any ongoing treatment. Do not discontinue any prescribed medication without consulting your treating
      doctor. For emergencies, please seek immediate medical care.
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '10pt', fontWeight: 700, color: BRAND,
        textTransform: 'uppercase', letterSpacing: 1.4,
        borderBottom: `1px solid ${BRAND}33`, paddingBottom: 4,
        marginBottom: 8, marginTop: 12,
      }}
    >
      {children}
    </div>
  );
}

function SoftBlock({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: '10pt 14pt', marginBottom: 10, breakInside: 'avoid',
      }}
    >
      {children}
    </div>
  );
}

function PageFooter({
  page, total, patientName, caseNumber,
}: { page: number; total: number; patientName: string; caseNumber: string }) {
  return (
    <div
      style={{
        position: 'absolute', bottom: '8mm', left: '18mm', right: '18mm',
        display: 'flex', justifyContent: 'space-between',
        fontSize: '7pt', color: INK_MUTED,
        borderTop: '1px solid #e2e8f0', paddingTop: 4,
      }}
    >
      <span>HomeoOpinion &middot; Case {caseNumber}</span>
      <span>{patientName}</span>
      <span>Page {page} of {total}</span>
    </div>
  );
}

function PrintActions() {
  return (
    <div
      className="print-actions"
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 100,
        display: 'flex', gap: 8,
      }}
    >
      <button
        onClick={() => window.print()}
        style={{
          padding: '10px 18px', background: BRAND, color: '#fff', border: 'none',
          borderRadius: 8, cursor: 'pointer', fontSize: '14px', fontWeight: 600,
          boxShadow: '0 6px 18px rgba(14,124,107,0.35)',
        }}
      >
        🖨 Print / Save as PDF
      </button>
      <button
        onClick={() => window.close()}
        style={{
          padding: '10px 16px', background: '#fff', color: INK,
          border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontSize: '14px',
        }}
      >
        Close
      </button>
    </div>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', color: INK_SOFT, fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <p>{children}</p>
    </div>
  );
}

function PrintStyles() {
  return (
    <style>{`
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html, body {
        margin: 0; padding: 0;
        background: #e2e8f0;
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        color: ${INK};
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .report-page {
        width: 210mm;
        min-height: 297mm;
        margin: 12mm auto;
        background: #fff;
        position: relative;
        box-shadow: 0 8px 24px rgba(15,23,42,0.12);
        overflow: hidden;
      }
      .report-page.page-break { page-break-after: always; }
      ul { padding-left: 14pt; }
      @media print {
        body { background: #fff; }
        .report-page {
          margin: 0;
          box-shadow: none;
        }
        .print-actions { display: none !important; }
      }
    `}</style>
  );
}

/* ===================== UTILS ===================== */

function cap(s?: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function asArray(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
}
