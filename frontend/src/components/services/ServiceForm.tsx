'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { specialitiesApi } from '@/lib/api';
import IntakeBuilder from './IntakeBuilder';
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
