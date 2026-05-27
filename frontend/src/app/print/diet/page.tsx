'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { dietApi } from '@/lib/api';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: { [k: string]: string } = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const SLOT_LABELS: { [k: string]: string } = {
  early_morning: 'Early Morning', breakfast: 'Breakfast', mid_morning: 'Mid Morning',
  lunch: 'Lunch', evening_snack: 'Evening Snack', dinner: 'Dinner', bedtime: 'Bedtime',
};
const SLOTS = ['early_morning', 'breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner', 'bedtime'];

export default function PrintDietPage() {
  const searchParams = useSearchParams();
  const chartId = searchParams.get('chartId');
  const patientId = searchParams.get('patientId');
  const patientName = searchParams.get('patientName') || 'Patient';

  const [chart, setChart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chartId) {
      dietApi.getChartById(chartId)
        .then(({ data }) => setChart(data))
        .catch(() => setChart(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [chartId]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Loading chart...</p>
    </div>
  );

  if (!chart) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Chart not found. Please save the chart before printing.</p>
    </div>
  );

  const week = chart.snapshot?.week || {};
  const dayTotals = chart.snapshot?.dayTotals || {};
  const rollup = chart.snapshot?.weeklyRollup || {};
  const groceryList = chart.groceryList || {};
  const inputs = chart.inputs || {};
  const violations = chart.violations || [];

  // Week 1: Mon–Thu; Week 2: Fri–Sun + rollup + grocery
  const week1Days = DAYS.slice(0, 4);
  const week2Days = DAYS.slice(4);

  const styles: { [k: string]: React.CSSProperties } = {
    page: {
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      padding: '18mm 18mm 15mm 18mm',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10pt',
      color: '#111',
      background: '#fff',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: '2px solid #0e7c6b',
    },
    clinicName: { fontSize: '16pt', fontWeight: 'bold', color: '#0e7c6b' },
    subtitle: { fontSize: '9pt', color: '#666', marginTop: 2 },
    patientInfo: { textAlign: 'right' as any, fontSize: '9pt' },
    sectionTitle: {
      fontSize: '11pt', fontWeight: 'bold', color: '#0e7c6b',
      borderBottom: '1px solid #0e7c6b', paddingBottom: 4, marginBottom: 10, marginTop: 16,
    },
    table: { width: '100%', borderCollapse: 'collapse' as any, fontSize: '8.5pt' },
    th: { background: '#0e7c6b', color: '#fff', padding: '4px 6px', textAlign: 'left' as any, fontWeight: 600 },
    td: { padding: '4px 6px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' as any },
    tdMuted: { padding: '4px 6px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' as any, color: '#666' },
    pageBreak: { pageBreakAfter: 'always' as any, marginBottom: 32 },
    noBreak: {},
  };

  return (
    <>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          body { margin: 0; }
          .print-actions { display: none !important; }
          .page-break { page-break-after: always; }
        }
        body { background: #f0f0f0; }
      `}</style>

      {/* Print actions — hidden on print */}
      <div className="print-actions" style={{
        position: 'fixed', top: 16, right: 16, zIndex: 100,
        display: 'flex', gap: 8,
      }}>
        <button onClick={() => window.print()}
          style={{ padding: '8px 16px', background: '#0e7c6b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '14px' }}>
          🖨 Print / Save PDF
        </button>
        <button onClick={() => window.close()}
          style={{ padding: '8px 16px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '14px' }}>
          Close
        </button>
      </div>

      {/* ==================== PAGE 1: Mon–Thu ==================== */}
      <div style={styles.page} className="page-break">
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.clinicName}>HomeoOpinion</div>
            <div style={styles.subtitle}>Personalised 7-Day Diet Chart</div>
            <div style={styles.subtitle}>Source: ICMR-NIN 2024 Guidelines</div>
          </div>
          <div style={styles.patientInfo}>
            <strong>{patientName}</strong><br />
            {inputs.gender && `${inputs.gender}, `}{inputs.age && `${inputs.age} years`}<br />
            {inputs.diseaseTags?.length > 0 && <span>Conditions: {inputs.diseaseTags.join(', ')}</span>}
            <br />Diet: {inputs.dietType || 'General'}<br />
            Generated: {new Date(chart.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Calorie target */}
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: '9pt' }}>
          <strong>Daily Target:</strong> {rollup.targetKcal || chart.avgDailyKcal} kcal ·
          Protein: {rollup.targetProteinG || '—'}g · Carbs: {rollup.targetCarbG || '—'}g · Fat: {rollup.targetFatG || '—'}g
          {inputs.diseaseTags?.includes('diabetes_t2') && ' · GI cap: ≤55'}
          {inputs.diseaseTags?.includes('hypertension') && ' · Sodium: ≤1500 mg/day'}
        </div>

        {/* Meal plan — Mon to Thu */}
        <div style={styles.sectionTitle}>Meal Plan: Monday – Thursday</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '18%' }}>Meal Slot</th>
              {week1Days.map(d => (
                <th key={d} style={{ ...styles.th, width: '20%' }}>
                  {DAY_LABELS[d]}<br />
                  <span style={{ fontSize: '7.5pt', fontWeight: 'normal' }}>
                    {dayTotals[d]?.kcal || '—'} kcal
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(slot => (
              <tr key={slot}>
                <td style={{ ...styles.td, fontWeight: 600, background: '#f9fafb' }}>{SLOT_LABELS[slot]}</td>
                {week1Days.map(day => {
                  const items = week[day]?.[slot] || [];
                  return (
                    <td key={day} style={styles.td}>
                      {items.length === 0 ? <span style={{ color: '#ccc' }}>—</span> : (
                        items.map((item: any, i: number) => (
                          <div key={i} style={{ marginBottom: i < items.length - 1 ? 4 : 0 }}>
                            <span style={{ fontWeight: 500 }}>{item.foodName}</span><br />
                            <span style={{ color: '#666', fontSize: '7.5pt' }}>{item.portionDesc} · {item.kcal}kcal</span>
                          </div>
                        ))
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 12, fontSize: '8pt', color: '#666', fontStyle: 'italic' }}>
          * All timings are approximate. Consult your doctor before making significant changes.
        </div>
      </div>

      {/* ==================== PAGE 2: Fri–Sun + rollup + grocery ==================== */}
      <div style={styles.page}>
        {/* Header repeat */}
        <div style={{ ...styles.header, borderBottom: '1px solid #0e7c6b' }}>
          <div style={styles.clinicName}>HomeoOpinion — {patientName}</div>
          <div style={styles.patientInfo as any}>Diet Plan · Page 2 of 2</div>
        </div>

        {/* Fri–Sun */}
        <div style={styles.sectionTitle}>Meal Plan: Friday – Sunday</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '20%' }}>Meal Slot</th>
              {week2Days.map(d => (
                <th key={d} style={{ ...styles.th, width: '26%' }}>
                  {DAY_LABELS[d]}<br />
                  <span style={{ fontSize: '7.5pt', fontWeight: 'normal' }}>{dayTotals[d]?.kcal || '—'} kcal</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(slot => (
              <tr key={slot}>
                <td style={{ ...styles.td, fontWeight: 600, background: '#f9fafb' }}>{SLOT_LABELS[slot]}</td>
                {week2Days.map(day => {
                  const items = week[day]?.[slot] || [];
                  return (
                    <td key={day} style={styles.td}>
                      {items.length === 0 ? <span style={{ color: '#ccc' }}>—</span> : (
                        items.map((item: any, i: number) => (
                          <div key={i} style={{ marginBottom: i < items.length - 1 ? 4 : 0 }}>
                            <span style={{ fontWeight: 500 }}>{item.foodName}</span><br />
                            <span style={{ color: '#666', fontSize: '7.5pt' }}>{item.portionDesc} · {item.kcal}kcal</span>
                          </div>
                        ))
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Weekly Summary */}
        <div style={styles.sectionTitle}>Weekly Summary</div>
        <table style={{ ...styles.table, marginBottom: 16 }}>
          <thead>
            <tr>
              {['Avg Kcal/Day', 'Target', 'Adherence', 'Carbs %', 'Protein %', 'Fat %', 'Avg Fibre'].map(h => (
                <th key={h} style={{ ...styles.th }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>{rollup.avgDailyKcal}</td>
              <td style={styles.td}>{rollup.targetKcal}</td>
              <td style={styles.td}>{rollup.adherencePct}%</td>
              <td style={styles.td}>{rollup.macroSplit?.carbs_pct}%</td>
              <td style={styles.td}>{rollup.macroSplit?.protein_pct}%</td>
              <td style={styles.td}>{rollup.macroSplit?.fat_pct}%</td>
              <td style={styles.td}>{rollup.avgFiberG}g</td>
            </tr>
          </tbody>
        </table>

        {/* Grocery list */}
        {Object.keys(groceryList).length > 0 && (
          <>
            <div style={styles.sectionTitle}>Weekly Grocery List</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {Object.entries(groceryList).map(([aisle, items]: [string, any]) => (
                <div key={aisle}>
                  <div style={{ fontWeight: 700, fontSize: '9pt', color: '#0e7c6b', borderBottom: '1px solid #0e7c6b', marginBottom: 4, paddingBottom: 2 }}>{aisle}</div>
                  {(items as any[]).map((item: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt', marginBottom: 2 }}>
                      <span>□ {item.name}</span>
                      <span style={{ color: '#666', marginLeft: 8 }}>{item.qty}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Do's & Don'ts */}
        <div style={styles.sectionTitle}>Do's &amp; Don'ts</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '9pt' }}>
          <div>
            <strong style={{ color: '#16a34a' }}>✓ Recommended</strong>
            <ul style={{ paddingLeft: 16, marginTop: 4 }}>
              <li>Whole grains, millets, legumes daily</li>
              <li>Green leafy vegetables at every meal</li>
              <li>Seasonal fruits (low-GI preferred)</li>
              <li>Drink {inputs.waterIntakeL || 2.5}L water daily</li>
              <li>Walk 30 min after lunch</li>
            </ul>
          </div>
          <div>
            <strong style={{ color: '#dc2626' }}>✗ Avoid</strong>
            <ul style={{ paddingLeft: 16, marginTop: 4 }}>
              <li>Ultra-processed foods &amp; sugary drinks</li>
              <li>Deep-fried foods</li>
              <li>Excess salt (pickles, papad, chips)</li>
              {inputs.diseaseTags?.includes('diabetes_t2') && <li>White rice, maida, instant noodles</li>}
              {inputs.diseaseTags?.includes('gout') && <li>Organ meats, alcohol</li>}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 20, paddingTop: 10, borderTop: '1px solid #e5e7eb',
          fontSize: '7.5pt', color: '#999', textAlign: 'center' as any,
        }}>
          Generated by HomeoOpinion · Magic Diet · ICMR-NIN 2024 aligned ·
          This chart is a personalised recommendation. Consult your doctor or registered dietitian before making major dietary changes.
          Dietary plans do not replace medical treatment.
        </div>
      </div>
    </>
  );
}
