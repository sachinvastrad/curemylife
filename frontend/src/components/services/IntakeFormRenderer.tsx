'use client';
import { useState } from 'react';
import type { FieldDef, IntakePayload } from '@/lib/services-types';

interface Props {
  fields: FieldDef[];
  initial?: IntakePayload;
  submitting?: boolean;
  submitLabel?: string;
  disabledReason?: string;
  onSubmit: (payload: IntakePayload) => void | Promise<void>;
}

/**
 * Config-driven form renderer. Builds inputs from the service's FieldDef[]
 * and produces a typed payload on submit. Client-side validation mirrors the
 * server-side rules in backend/src/services/intake-validation.ts so the user
 * gets immediate feedback before the network round trip.
 */
export default function IntakeFormRenderer({
  fields, initial, submitting, submitLabel, disabledReason, onSubmit,
}: Props) {
  const [values, setValues] = useState<IntakePayload>(initial ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setValue = (key: string, v: IntakePayload[string]) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = (): string | null => {
    const e: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.key];
      const empty = v === undefined || v === null || v === '' ||
        (Array.isArray(v) && v.length === 0);
      if (f.required && empty) {
        e[f.key] = `${f.label} is required`;
        continue;
      }
      if (!empty && f.type === 'number' && Number.isNaN(Number(v))) {
        e[f.key] = `${f.label} must be a number`;
      }
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      return 'Please fix the highlighted fields';
    }
    return null;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const errMsg = validate();
    if (errMsg) return;
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((f) => (
        <Field
          key={f.key}
          field={f}
          value={values[f.key]}
          onChange={(v) => setValue(f.key, v)}
          error={errors[f.key]}
        />
      ))}

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting || !!disabledReason}
          title={disabledReason}
          className="btn btn-primary btn-lg"
        >
          {submitting ? 'Submitting…' : (submitLabel ?? 'Submit')}
        </button>
        {disabledReason && (
          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {disabledReason}
          </div>
        )}
      </div>
    </form>
  );
}

interface FieldProps {
  field: FieldDef;
  value: IntakePayload[string];
  onChange: (v: IntakePayload[string]) => void;
  error?: string;
}

function Field({ field: f, value, onChange, error }: FieldProps) {
  const labelEl = (
    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
      {f.label}
      {f.required && <span style={{ color: 'var(--error)' }}> *</span>}
    </label>
  );
  const helpEl = f.helpText && (
    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{f.helpText}</div>
  );
  const errorEl = error && (
    <div className="text-xs mt-1" style={{ color: 'var(--error)' }}>{error}</div>
  );

  switch (f.type) {
    case 'textarea':
      return (
        <div>
          {labelEl}
          <textarea
            className="input w-full"
            rows={4}
            placeholder={f.placeholder}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {errorEl} {helpEl}
        </div>
      );

    case 'number':
      return (
        <div>
          {labelEl}
          <input
            type="number"
            className="input w-full"
            placeholder={f.placeholder}
            value={value === undefined ? '' : String(value)}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
          {errorEl} {helpEl}
        </div>
      );

    case 'date':
      return (
        <div>
          {labelEl}
          <input
            type="date"
            className="input w-full"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {errorEl} {helpEl}
        </div>
      );

    case 'boolean':
      return (
        <div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{f.label}</span>
          </label>
          {errorEl} {helpEl}
        </div>
      );

    case 'select':
      return (
        <div>
          {labelEl}
          <select
            className="input w-full"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select…</option>
            {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {errorEl} {helpEl}
        </div>
      );

    case 'multiselect': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (opt: string) => {
        onChange(arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]);
      };
      return (
        <div>
          {labelEl}
          <div className="flex flex-wrap gap-2">
            {f.options?.map((o) => {
              const on = arr.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggle(o)}
                  className="px-3 py-1 rounded-full text-xs"
                  style={{
                    border: '1px solid var(--border)',
                    background: on ? 'rgba(14,124,107,0.15)' : 'transparent',
                    color: on ? 'var(--primary-light)' : 'var(--text-secondary)',
                  }}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {errorEl} {helpEl}
        </div>
      );
    }

    case 'text':
    default:
      return (
        <div>
          {labelEl}
          <input
            type="text"
            className="input w-full"
            placeholder={f.placeholder}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {errorEl} {helpEl}
        </div>
      );
  }
}
