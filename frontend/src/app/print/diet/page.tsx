'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dietApi } from '@/lib/api';

/* ===================== CONSTANTS ===================== */

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_SHORT: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};
const DAY_LONG: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const SLOT_META: Record<string, { label: string; icon: string; tint: string }> = {
  early_morning: { label: 'Early Morning', icon: '🌅', tint: '#fef3c7' },
  breakfast:     { label: 'Breakfast',     icon: '🍳', tint: '#ffedd5' },
  mid_morning:   { label: 'Mid Morning',   icon: '🍏', tint: '#dcfce7' },
  lunch:         { label: 'Lunch',         icon: '🍱', tint: '#fef9c3' },
  evening_snack: { label: 'Evening Snack', icon: '🥗', tint: '#ecfccb' },
  dinner:        { label: 'Dinner',        icon: '🌙', tint: '#e0e7ff' },
  bedtime:       { label: 'Bedtime',       icon: '🛏️', tint: '#f3e8ff' },
};
const SLOTS = ['early_morning', 'breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner', 'bedtime'];

const BRAND = '#0e7c6b';
const BRAND_LIGHT = '#12a890';
const INK = '#0f172a';
const INK_SOFT = '#475569';
const INK_MUTED = '#94a3b8';

/* ===================== PAGE ===================== */

function PrintDietInner() {
  const search = useSearchParams();
  const chartId = search.get('chartId');
  const patientName = search.get('patientName') || 'Patient';
  const [chart, setChart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chartId) { setLoading(false); return; }
    dietApi.getChartById(chartId)
      .then(({ data }) => setChart(data))
      .catch(() => setChart(null))
      .finally(() => setLoading(false));
  }, [chartId]);

  if (loading) return <CenterMessage>Loading your plan…</CenterMessage>;
  if (!chart)  return <CenterMessage>Plan not found. Generate and save one before printing.</CenterMessage>;

  const inputs = chart.inputs || {};
  const rollup = chart.snapshot?.weeklyRollup || {};
  const dayTotals = chart.snapshot?.dayTotals || {};
  const week = chart.snapshot?.week || {};
  const grocery = chart.groceryList || {};

  const avgKcal = Math.round(rollup.avgDailyKcal || chart.avgDailyKcal || 0);
  const targetKcal = Math.round(rollup.targetKcal || avgKcal);
  const proteinG = Math.round(rollup.avgDailyProteinG || rollup.targetProteinG || 0);
  const carbG    = Math.round(rollup.avgDailyCarbG    || rollup.targetCarbG    || 0);
  const fatG     = Math.round(rollup.avgDailyFatG     || rollup.targetFatG     || 0);
  const fiberG   = Math.round(rollup.avgFiberG        || 0);

  return (
    <>
      <PrintStyles />
      <PrintActions />

      {/* ===================== PAGE 1: Cover + summary + week grid ===================== */}
      <div className="report-page page-break">
        <HeroBanner patientName={patientName} />

        <section style={{ padding: '14mm 18mm 0' }}>
          <PatientCard
            name={patientName}
            inputs={inputs}
            generatedAt={chart.createdAt}
            version={chart.version}
          />

          <CalorieHero
            avgKcal={avgKcal} targetKcal={targetKcal}
            proteinG={proteinG} carbG={carbG} fatG={fatG} fiberG={fiberG}
          />

          <KcalBarChart dayTotals={dayTotals} target={targetKcal} />

          <WeekGrid week={week} dayTotals={dayTotals} />

          <Disclaimer />
        </section>

        <PageFooter page={1} total={2} patientName={patientName} />
      </div>

      {/* ===================== PAGE 2: Day cards + grocery + dos/donts ===================== */}
      <div className="report-page">
        <SecondaryHeader patientName={patientName} />

        <section style={{ padding: '12mm 18mm 0' }}>
          <SectionTitle>Day-by-day meal plan</SectionTitle>
          <DayCards week={week} dayTotals={dayTotals} />

          {Object.keys(grocery).length > 0 && (
            <>
              <SectionTitle>Weekly grocery list</SectionTitle>
              <GroceryGrid grocery={grocery} />
            </>
          )}

          <SectionTitle>Do&rsquo;s &amp; Don&rsquo;ts</SectionTitle>
          <DosAndDonts inputs={inputs} />

          {chart.notes && (
            <>
              <SectionTitle>Notes</SectionTitle>
              <div
                style={{
                  background: '#f8fafc', border: `1px solid #e2e8f0`,
                  borderLeft: `4px solid ${BRAND}`, borderRadius: 6,
                  padding: '10pt 12pt', fontSize: '9.5pt', color: INK_SOFT,
                  marginBottom: 14,
                }}
              >
                {chart.notes}
              </div>
            </>
          )}
        </section>

        <PageFooter page={2} total={2} patientName={patientName} />
      </div>
    </>
  );
}

/* ===================== UI ATOMS ===================== */

function HeroBanner({ patientName }: { patientName: string }) {
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
            HomeoOpinion · Magic Diet
          </div>
          <div style={{ fontSize: '26pt', fontWeight: 800, lineHeight: 1.1, marginTop: 6 }}>
            Your 7-day meal plan
          </div>
          <div style={{ fontSize: '11pt', marginTop: 6, opacity: 0.95 }}>
            Personalised for <strong>{patientName}</strong>
          </div>
        </div>
        <Logomark />
      </div>
      {/* Decorative arc */}
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
      🌿
    </div>
  );
}

function SecondaryHeader({ patientName }: { patientName: string }) {
  return (
    <div
      style={{
        padding: '12mm 18mm 8mm', borderBottom: `2px solid ${BRAND}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      }}
    >
      <div>
        <div style={{ fontSize: '8pt', letterSpacing: 2, color: INK_MUTED, textTransform: 'uppercase' }}>
          HomeoOpinion · Magic Diet
        </div>
        <div style={{ fontSize: '14pt', fontWeight: 700, color: INK, marginTop: 2 }}>
          {patientName} &mdash; Plan details
        </div>
      </div>
      <div style={{ fontSize: '9pt', color: INK_MUTED }}>Page 2 of 2</div>
    </div>
  );
}

function PatientCard({
  name, inputs, generatedAt, version,
}: { name: string; inputs: any; generatedAt: string; version?: number }) {
  const bmi = inputs.heightCm && inputs.weightKg
    ? inputs.weightKg / ((inputs.heightCm / 100) ** 2)
    : null;
  const bmiLabel = !bmi ? '' : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const bmiTint  = !bmi ? '#94a3b8' : bmi < 18.5 ? '#f59e0b' : bmi < 25 ? '#16a34a' : bmi < 30 ? '#f59e0b' : '#dc2626';

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
        <div style={{ fontSize: '14pt', fontWeight: 700, color: INK, marginTop: 2 }}>{name}</div>
        <div style={{ fontSize: '9pt', color: INK_SOFT, marginTop: 4 }}>
          {inputs.age && <>{inputs.age} years · </>}
          {inputs.gender && <>{cap(inputs.gender)} · </>}
          {inputs.dietType && <>{inputs.dietType}</>}
        </div>
        {inputs.diseaseTags?.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {inputs.diseaseTags.slice(0, 6).map((t: string) => (
              <span
                key={t}
                style={{
                  fontSize: '7.5pt', padding: '2px 8px', borderRadius: 999,
                  background: '#fef3c7', color: '#92400e',
                }}
              >
                {t.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: '10pt 14pt', display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        {bmi && (
          <div
            style={{
              width: 50, height: 50, borderRadius: 25, flexShrink: 0,
              background: bmiTint + '22', color: bmiTint, fontWeight: 700, fontSize: '12pt',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {bmi.toFixed(1)}
          </div>
        )}
        <div>
          <div style={{ fontSize: '8pt', color: INK_MUTED, textTransform: 'uppercase', letterSpacing: 1.4 }}>BMI</div>
          <div style={{ fontSize: '11pt', fontWeight: 600, color: bmiTint }}>{bmiLabel || '—'}</div>
          <div style={{ fontSize: '8.5pt', color: INK_MUTED, marginTop: 4 }}>
            Generated {new Date(generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            {version && <> · v{version}</>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalorieHero({
  avgKcal, targetKcal, proteinG, carbG, fatG, fiberG,
}: { avgKcal: number; targetKcal: number; proteinG: number; carbG: number; fatG: number; fiberG: number }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
        color: '#fff', borderRadius: 10, padding: '12pt 16pt',
        display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16,
        marginBottom: 12,
      }}
    >
      <div>
        <div style={{ fontSize: '8pt', letterSpacing: 1.6, opacity: 0.85, textTransform: 'uppercase' }}>
          Avg daily intake
        </div>
        <div style={{ fontSize: '32pt', fontWeight: 800, lineHeight: 1 }}>{avgKcal}</div>
        <div style={{ fontSize: '10pt', opacity: 0.92, marginTop: 2 }}>
          kcal / day · target {targetKcal}
        </div>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        <MacroBar label="Protein" value={proteinG} unit="g" max={Math.max(120, proteinG)} color="#86efac" />
        <MacroBar label="Carbs"   value={carbG}    unit="g" max={Math.max(350, carbG)}    color="#fde68a" />
        <MacroBar label="Fat"     value={fatG}     unit="g" max={Math.max(90, fatG)}      color="#fca5a5" />
        <MacroBar label="Fibre"   value={fiberG}   unit="g" max={Math.max(40, fiberG)}    color="#bae6fd" />
      </div>
    </div>
  );
}

function MacroBar({
  label, value, unit, max, color,
}: { label: string; value: number; unit: string; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt', marginBottom: 2 }}>
        <span style={{ opacity: 0.95 }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{value}{unit}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.18)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function KcalBarChart({
  dayTotals, target,
}: { dayTotals: Record<string, any>; target: number }) {
  const values = DAYS.map((d) => dayTotals[d]?.kcal || 0);
  const max = Math.max(...values, target * 1.1);
  return (
    <div
      style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
        padding: '10pt 14pt', marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ fontSize: '9pt', fontWeight: 700, color: INK, textTransform: 'uppercase', letterSpacing: 1.4 }}>
          Daily calorie distribution
        </div>
        <div style={{ fontSize: '8pt', color: INK_MUTED }}>Target {target} kcal</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 70, gap: 6, marginTop: 8 }}>
        {DAYS.map((d, i) => {
          const v = values[i];
          const h = max > 0 ? Math.max(4, (v / max) * 60) : 4;
          const onTarget = v >= target * 0.85 && v <= target * 1.15;
          return (
            <div key={d} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  height: h, background: onTarget ? BRAND_LIGHT : '#cbd5e1',
                  borderRadius: '4px 4px 0 0', position: 'relative',
                }}
              >
                <div style={{
                  position: 'absolute', top: -14, left: 0, right: 0,
                  fontSize: '7pt', color: INK_SOFT,
                }}>
                  {v || ''}
                </div>
              </div>
              <div style={{ fontSize: '7.5pt', color: INK_MUTED, marginTop: 4 }}>{DAY_SHORT[d]}</div>
            </div>
          );
        })}
      </div>
      {/* Target line legend */}
      <div style={{ display: 'flex', gap: 10, fontSize: '7.5pt', color: INK_MUTED, marginTop: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, background: BRAND_LIGHT, borderRadius: 2, display: 'inline-block' }} />
          On target (±15%)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, background: '#cbd5e1', borderRadius: 2, display: 'inline-block' }} />
          Outside band
        </span>
      </div>
    </div>
  );
}

function WeekGrid({
  week, dayTotals,
}: { week: Record<string, any>; dayTotals: Record<string, any> }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <SectionTitle>Week at a glance</SectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '11%' }} />
          {DAYS.map((d) => <col key={d} style={{ width: '12.7%' }} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left' }}>Slot</th>
            {DAYS.map((d) => (
              <th key={d} style={thStyle}>
                {DAY_SHORT[d]}
                <div style={{ fontSize: '6.5pt', fontWeight: 400, opacity: 0.85, marginTop: 1 }}>
                  {dayTotals[d]?.kcal || '—'} kcal
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((slot) => {
            const meta = SLOT_META[slot];
            return (
              <tr key={slot}>
                <td
                  style={{
                    ...tdStyle, background: meta.tint, fontWeight: 600, color: INK,
                  }}
                >
                  <span style={{ fontSize: '10pt', marginRight: 4 }}>{meta.icon}</span>
                  {meta.label}
                </td>
                {DAYS.map((d) => {
                  const items = week[d]?.[slot] || [];
                  return (
                    <td key={d} style={tdStyle}>
                      {items.length === 0
                        ? <span style={{ color: '#cbd5e1' }}>—</span>
                        : items.slice(0, 3).map((it: any, i: number) => (
                          <div key={i} style={{ marginBottom: i < items.length - 1 ? 2 : 0 }}>
                            <div style={{ color: INK }}>{it.foodName}</div>
                            <div style={{ color: INK_MUTED, fontSize: '6.5pt' }}>
                              {it.portionDesc}
                            </div>
                          </div>
                        ))
                      }
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DayCards({
  week, dayTotals,
}: { week: Record<string, any>; dayTotals: Record<string, any> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
      {DAYS.map((d) => {
        const day = week[d] || {};
        const totals = dayTotals[d] || {};
        const usedSlots = SLOTS.filter((s) => Array.isArray(day[s]) && day[s].length > 0);
        return (
          <div
            key={d}
            style={{
              border: '1px solid #e2e8f0', borderRadius: 10,
              padding: '8pt 10pt', breakInside: 'avoid',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <div style={{ fontSize: '10pt', fontWeight: 700, color: BRAND }}>{DAY_LONG[d]}</div>
              <div style={{ fontSize: '8pt', color: INK_MUTED }}>
                {totals.kcal || '—'} kcal · {totals.proteinG || '—'}g P
              </div>
            </div>
            {usedSlots.map((slot) => {
              const meta = SLOT_META[slot];
              const items = day[slot] as any[];
              return (
                <div key={slot} style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '7.5pt', fontWeight: 600, color: INK_SOFT, marginBottom: 2 }}>
                    <span style={{ marginRight: 4 }}>{meta.icon}</span>{meta.label}
                  </div>
                  {items.map((it: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '7.5pt', display: 'flex', justifyContent: 'space-between',
                        color: INK,
                      }}
                    >
                      <span>{it.foodName} <span style={{ color: INK_MUTED }}>· {it.portionDesc}</span></span>
                      <span style={{ color: INK_MUTED, marginLeft: 4 }}>{it.kcal}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function GroceryGrid({ grocery }: { grocery: Record<string, any[]> }) {
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
        marginBottom: 14,
      }}
    >
      {Object.entries(grocery).map(([aisle, items]) => (
        <div
          key={aisle}
          style={{
            border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '6pt 10pt', breakInside: 'avoid',
          }}
        >
          <div
            style={{
              fontSize: '8pt', fontWeight: 700, color: BRAND,
              textTransform: 'uppercase', letterSpacing: 1.2,
              borderBottom: `1px solid ${BRAND}33`, paddingBottom: 4, marginBottom: 4,
            }}
          >
            {aisle}
          </div>
          {(items as any[]).map((it: any, i: number) => (
            <div
              key={i}
              style={{
                fontSize: '8.5pt', display: 'flex', justifyContent: 'space-between',
                padding: '2px 0',
              }}
            >
              <span style={{ color: INK }}>☐ {it.name}</span>
              <span style={{ color: INK_MUTED, marginLeft: 6 }}>{it.qty}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DosAndDonts({ inputs }: { inputs: any }) {
  const dos = [
    'Whole grains, millets, legumes daily',
    'Green leafy vegetables at every meal',
    'Seasonal fruits (low-GI preferred)',
    `Drink ${inputs.waterIntakeL || 2.5} L of water daily`,
    'Walk 30 minutes after lunch',
  ];
  const donts = [
    'Ultra-processed foods and sugary drinks',
    'Deep-fried foods',
    'Excess salt (pickles, papad, chips)',
    ...(inputs.diseaseTags?.includes('diabetes_t2') ? ['White rice, maida, instant noodles'] : []),
    ...(inputs.diseaseTags?.includes('gout') ? ['Organ meats and alcohol'] : []),
    ...(inputs.diseaseTags?.includes('hypertension') ? ['High-sodium pickles and sauces'] : []),
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
      <ListBlock title="✓ Recommended" tint="#dcfce7" textColor="#166534" items={dos} />
      <ListBlock title="✗ Avoid"        tint="#fee2e2" textColor="#991b1b" items={donts} />
    </div>
  );
}

function ListBlock({
  title, tint, textColor, items,
}: { title: string; tint: string; textColor: string; items: string[] }) {
  return (
    <div
      style={{
        background: tint, border: `1px solid ${textColor}22`,
        borderRadius: 8, padding: '8pt 12pt',
      }}
    >
      <div style={{ fontSize: '9pt', fontWeight: 700, color: textColor, marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 14, fontSize: '8.5pt', color: INK, lineHeight: 1.5 }}>
        {items.map((it, i) => <li key={i} style={{ marginBottom: 2 }}>{it}</li>)}
      </ul>
    </div>
  );
}

function Disclaimer() {
  return (
    <div
      style={{
        fontSize: '7.5pt', color: INK_MUTED, fontStyle: 'italic',
        marginTop: 6, padding: '6pt 0', borderTop: '1px solid #e2e8f0',
      }}
    >
      All timings are approximate. This plan is a personalised recommendation aligned with ICMR-NIN 2024.
      Consult your doctor or a registered dietitian before making significant dietary changes.
      Dietary plans do not replace medical treatment.
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

function PageFooter({
  page, total, patientName,
}: { page: number; total: number; patientName: string }) {
  return (
    <div
      style={{
        position: 'absolute', bottom: '8mm', left: '18mm', right: '18mm',
        display: 'flex', justifyContent: 'space-between',
        fontSize: '7pt', color: INK_MUTED,
        borderTop: '1px solid #e2e8f0', paddingTop: 4,
      }}
    >
      <span>HomeoOpinion &middot; Magic Diet</span>
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

/* ===================== INLINE STYLES ===================== */

const thStyle: React.CSSProperties = {
  background: BRAND, color: '#fff', padding: '5pt 6pt',
  fontWeight: 600, fontSize: '8pt', textAlign: 'center',
};
const tdStyle: React.CSSProperties = {
  padding: '5pt 6pt', borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'top', color: INK,
};

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
        page-break-after: auto;
      }
      .report-page.page-break { page-break-after: always; }
      table { border-collapse: collapse; }
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

function cap(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/* ===================== EXPORT ===================== */

export default function PrintDietPage() {
  return (
    <Suspense fallback={<CenterMessage>Loading…</CenterMessage>}>
      <PrintDietInner />
    </Suspense>
  );
}
