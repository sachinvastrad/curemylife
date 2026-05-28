'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Eye, Pencil, ArrowRight, CheckCircle2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { specialitiesApi } from '@/lib/api';
import IntakeBuilder from './IntakeBuilder';
import IntakeFormRenderer from './IntakeFormRenderer';
import type { FieldDef, HowItWorksStep, ServiceDetail } from '@/lib/services-types';

interface Props {
  initial?: ServiceDetail;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (data: ServiceFormPayload) => void | Promise<void>;
}

export interface ServiceFormPayload {
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  howItWorks: HowItWorksStep[];
  inclusions: string[];
  iconName?: string;
  cardImageUrl?: string;
  intakeFields: FieldDef[];
  displayOrder: number;
  specialityIds: number[];
}

interface Speciality { id: number; name: string }

export default function ServiceForm({ initial, submitting, submitLabel, onSubmit }: Props) {
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [tagline, setTagline] = useState(initial?.tagline ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [iconName, setIconName] = useState(initial?.iconName ?? '');
  const [cardImageUrl, setCardImageUrl] = useState(initial?.cardImageUrl ?? '');
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? 0);
  const [howItWorks, setHowItWorks] = useState<HowItWorksStep[]>(
    (initial?.howItWorks as HowItWorksStep[]) ?? [],
  );
  const [inclusions, setInclusions] = useState<string[]>(
    (initial?.inclusions as string[]) ?? [],
  );
  const [intakeFields, setIntakeFields] = useState<FieldDef[]>(initial?.intakeFields ?? []);
  const [specialityIds, setSpecialityIds] = useState<number[]>(
    initial?.specialities.map((s) => s.id) ?? [],
  );

  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    specialitiesApi.listPublic()
      .then(({ data }) => setSpecialities(data))
      .catch((e) => console.error(e));
  }, []);

  const blockingReason = useMemo(() => {
    if (!slug.trim()) return 'Slug is required';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'Slug must be lowercase kebab-case';
    if (!name.trim()) return 'Name is required';
    if (specialityIds.length === 0) return 'Pick at least one routing speciality';
    if (intakeFields.length === 0) return 'Add at least one intake field';
    if (intakeFields.some((f) => !f.label.trim() || !/^[a-z][a-z0-9_]*$/.test(f.key))) {
      return 'Each intake field needs a valid key and label';
    }
    return undefined;
  }, [slug, name, specialityIds, intakeFields]);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (blockingReason) return;
    await onSubmit({
      slug: slug.trim(),
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      description: description.trim() || undefined,
      howItWorks,
      inclusions: inclusions.filter((x) => x.trim()),
      iconName: iconName.trim() || undefined,
      cardImageUrl: cardImageUrl.trim() || undefined,
      intakeFields,
      displayOrder,
      specialityIds,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ModeSwitch mode={mode} onChange={setMode} />

      {mode === 'preview' && (
        <PatientPreview
          name={name}
          tagline={tagline}
          description={description}
          iconName={iconName}
          cardImageUrl={cardImageUrl}
          howItWorks={howItWorks}
          inclusions={inclusions}
          intakeFields={intakeFields}
          specialities={specialities.filter((s) => specialityIds.includes(s.id))}
        />
      )}

      {mode === 'edit' && (
      <>
      <section className="card">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Basics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" required>
            <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Slug" required help="Used in the URL (/patient/services/<slug>)">
            <input className="input w-full" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="diet-consult" />
          </Field>
          <Field label="Tagline">
            <input className="input w-full" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </Field>
          <Field label="Display order" help="Lower numbers appear first">
            <input
              type="number"
              className="input w-full"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Icon (lucide-react name)" help="e.g. Apple, Activity, Sparkles">
            <input className="input w-full" value={iconName} onChange={(e) => setIconName(e.target.value)} />
          </Field>
          <Field label="Card image URL">
            <input className="input w-full" value={cardImageUrl} onChange={(e) => setCardImageUrl(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Landing content</h2>
        <Field label="Description">
          <textarea
            className="input w-full"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this service is and why a patient would choose it."
          />
        </Field>

        <div className="mt-4">
          <Field label="How it works (steps)">
            <ListEditor
              items={howItWorks.map((s) => ({ id: String(s.step), title: s.title, body: s.body ?? '' }))}
              onChange={(items) =>
                setHowItWorks(items.map((it, i) => ({ step: i + 1, title: it.title, body: it.body || undefined })))
              }
              titlePlaceholder="Step title"
              bodyPlaceholder="Short description"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="What's included">
            <SimpleListEditor items={inclusions} onChange={setInclusions} placeholder="Add an inclusion line" />
          </Field>
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Routing</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Doctors carrying any of these specialities are eligible to handle bookings from this service.
        </p>
        <div className="flex flex-wrap gap-2">
          {specialities.map((sp) => {
            const on = specialityIds.includes(sp.id);
            return (
              <button
                key={sp.id}
                type="button"
                onClick={() =>
                  setSpecialityIds(on ? specialityIds.filter((x) => x !== sp.id) : [...specialityIds, sp.id])
                }
                className="px-3 py-1 rounded-full text-xs"
                style={{
                  border: '1px solid var(--border)',
                  background: on ? 'rgba(14,124,107,0.15)' : 'transparent',
                  color: on ? 'var(--primary-light)' : 'var(--text-secondary)',
                }}
              >
                {sp.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Intake form</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          The fields a patient fills in after choosing this service. Keys must be unique and snake_case.
        </p>
        <IntakeBuilder fields={intakeFields} onChange={setIntakeFields} />
      </section>
      </>
      )}

      <div>
        <button
          type="submit"
          disabled={!!blockingReason || submitting}
          title={blockingReason}
          className="btn btn-primary btn-lg"
        >
          {submitting ? 'Saving…' : (submitLabel ?? 'Save')}
        </button>
        {blockingReason && (
          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{blockingReason}</div>
        )}
      </div>
    </form>
  );
}

function Field({
  label, children, required, help,
}: { label: string; children: React.ReactNode; required?: boolean; help?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
        {label}{required && <span style={{ color: 'var(--error)' }}> *</span>}
      </label>
      {children}
      {help && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{help}</div>}
    </div>
  );
}

function ListEditor({
  items, onChange, titlePlaceholder, bodyPlaceholder,
}: {
  items: { id: string; title: string; body: string }[];
  onChange: (items: { id: string; title: string; body: string }[]) => void;
  titlePlaceholder: string;
  bodyPlaceholder: string;
}) {
  const update = (i: number, patch: Partial<{ title: string; body: string }>) => {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { id: String(Date.now()), title: '', body: '' }]);

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={it.id} className="flex gap-2">
          <div className="flex-1 space-y-2">
            <input className="input w-full" placeholder={titlePlaceholder} value={it.title}
              onChange={(e) => update(i, { title: e.target.value })} />
            <input className="input w-full" placeholder={bodyPlaceholder} value={it.body}
              onChange={(e) => update(i, { body: e.target.value })} />
          </div>
          <button type="button" onClick={() => remove(i)} className="btn btn-ghost btn-sm">
            <Trash2 className="w-3 h-3" style={{ color: 'var(--error)' }} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="btn btn-secondary btn-sm inline-flex">
        <Plus className="w-3 h-3" /> Add step
      </button>
    </div>
  );
}

function SimpleListEditor({
  items, onChange, placeholder,
}: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder={placeholder}
            value={it}
            onChange={(e) => {
              const next = items.slice();
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="btn btn-ghost btn-sm"
          >
            <Trash2 className="w-3 h-3" style={{ color: 'var(--error)' }} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ''])} className="btn btn-secondary btn-sm inline-flex">
        <Plus className="w-3 h-3" /> Add
      </button>
    </div>
  );
}

// ===================== EDIT / PREVIEW SWITCH =====================

function ModeSwitch({
  mode, onChange,
}: { mode: 'edit' | 'preview'; onChange: (m: 'edit' | 'preview') => void }) {
  return (
    <div
      className="inline-flex p-1 rounded-xl"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {([
        { v: 'edit',    label: 'Edit',    Icon: Pencil },
        { v: 'preview', label: 'Preview', Icon: Eye },
      ] as const).map(({ v, label, Icon }) => {
        const on = mode === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 transition"
            style={{
              background: on ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'transparent',
              color: on ? '#fff' : 'var(--text-secondary)',
            }}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        );
      })}
    </div>
  );
}

// ===================== PATIENT PREVIEW =====================

interface PreviewProps {
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  cardImageUrl: string;
  howItWorks: HowItWorksStep[];
  inclusions: string[];
  intakeFields: FieldDef[];
  specialities: { id: number; name: string }[];
}

/**
 * Renders the patient-facing landing + intake exactly as patients would see
 * them, using the in-memory form state. The intake form's submit is a no-op
 * so admins can interact freely without saving.
 */
function PatientPreview({
  name, tagline, description, iconName, cardImageUrl,
  howItWorks, inclusions, intakeFields, specialities,
}: PreviewProps) {
  const Icon = (iconName && (Icons as any)[iconName]) || Icons.Stethoscope;

  return (
    <div className="space-y-4">
      <div
        className="card flex items-start gap-3"
        style={{ background: 'rgba(245,158,11,0.08)', borderColor: '#f59e0b' }}
      >
        <Eye className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#f59e0b' }} />
        <div className="text-sm">
          <strong style={{ color: '#92400e' }}>Preview mode.</strong>{' '}
          <span style={{ color: 'var(--text-secondary)' }}>
            This is exactly what a patient sees. Form submission is disabled.
            Switch to <strong>Edit</strong> to make changes, then <strong>Save</strong> to publish.
          </span>
        </div>
      </div>

      {/* Landing hero */}
      <div className="card">
        <div className="flex items-start gap-4 mb-4">
          {cardImageUrl ? (
            <div
              className="w-14 h-14 rounded-xl bg-center bg-cover shrink-0"
              style={{ backgroundImage: `url(${cardImageUrl})` }}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
            >
              <Icon className="w-7 h-7 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {name || <em style={{ color: 'var(--text-muted)' }}>Untitled service</em>}
            </h2>
            {tagline && (
              <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{tagline}</p>
            )}
            {specialities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {specialities.map((s) => (
                  <span key={s.id} className="badge badge-primary text-xs">{s.name}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {description && (
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{description}</p>
        )}

        <button
          type="button"
          disabled
          className="btn btn-primary btn-lg inline-flex mt-5"
          title="Save the service before patients can use this CTA"
        >
          Opt for this service <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {howItWorks.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            How it works
          </h3>
          <ol className="space-y-3">
            {howItWorks.map((s, i) => (
              <li key={i} className="flex gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{ background: 'rgba(14,124,107,0.15)', color: 'var(--primary-light)' }}
                >
                  {s.step ?? i + 1}
                </div>
                <div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {s.title || <em style={{ color: 'var(--text-muted)' }}>Untitled step</em>}
                  </div>
                  {s.body && (
                    <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{s.body}</div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {inclusions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            What&rsquo;s included
          </h3>
          <ul className="space-y-2">
            {inclusions.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--primary-light)' }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Intake preview */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Intake form
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          What the patient fills in after clicking the CTA.
        </p>
        {intakeFields.length === 0 ? (
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            <em>No fields configured yet.</em>
          </div>
        ) : (
          <IntakeFormRenderer
            fields={intakeFields}
            submitLabel="Continue to booking"
            disabledReason="Preview only — submission is disabled"
            onSubmit={() => { /* no-op */ }}
          />
        )}
      </div>
    </div>
  );
}
