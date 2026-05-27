'use client';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { FieldDef, FieldType } from '@/lib/services-types';

interface Props {
  fields: FieldDef[];
  onChange: (fields: FieldDef[]) => void;
}

const TYPES: FieldType[] = ['text', 'textarea', 'number', 'select', 'multiselect', 'date', 'boolean'];

const NEEDS_OPTIONS = (t: FieldType) => t === 'select' || t === 'multiselect';

const KEY_RE = /^[a-z][a-z0-9_]*$/;

/**
 * Inline editor for a service's intake form definition. Not drag-and-drop in
 * v1 — that's listed as nice-to-have in PRD §5.2. Up/Down arrows for now.
 */
export default function IntakeBuilder({ fields, onChange }: Props) {
  const update = (i: number, patch: Partial<FieldDef>) => {
    const next = fields.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = fields.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const add = () => {
    const base = `field_${fields.length + 1}`;
    onChange([...fields, { key: base, label: '', type: 'text', required: false }]);
  };

  return (
    <div>
      <div className="space-y-3">
        {fields.length === 0 && (
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No fields yet. Add at least one before enabling the service.
          </div>
        )}

        {fields.map((f, i) => {
          const dupKey = fields.findIndex((x, ix) => ix !== i && x.key === f.key) !== -1;
          const keyInvalid = !KEY_RE.test(f.key);
          return (
            <div
              key={i}
              className="p-3 rounded-lg"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
            >
              <div className="flex gap-2 items-start mb-2">
                <span
                  className="text-xs font-medium px-2 py-1 rounded shrink-0"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
                >
                  #{i + 1}
                </span>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    className="input"
                    placeholder="key (snake_case)"
                    value={f.key}
                    onChange={(e) => update(i, { key: e.target.value })}
                    style={(keyInvalid || dupKey) ? { borderColor: 'var(--error)' } : undefined}
                  />
                  <input
                    className="input"
                    placeholder="Label shown to patient"
                    value={f.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                  />
                  <select
                    className="input"
                    value={f.type}
                    onChange={(e) => {
                      const t = e.target.value as FieldType;
                      update(i, { type: t, options: NEEDS_OPTIONS(t) ? (f.options ?? []) : undefined });
                    }}
                  >
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => move(i, -1)} className="btn btn-ghost btn-sm" title="Move up">
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} className="btn btn-ghost btn-sm" title="Move down">
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button type="button" onClick={() => remove(i)} className="btn btn-ghost btn-sm" title="Remove">
                    <Trash2 className="w-3 h-3" style={{ color: 'var(--error)' }} />
                  </button>
                </div>
              </div>

              {(keyInvalid || dupKey) && (
                <div className="text-xs mb-2" style={{ color: 'var(--error)' }}>
                  {dupKey ? 'This key is used by another field' : 'Key must be snake_case (a-z, 0-9, _)'}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <input
                  className="input"
                  placeholder="Placeholder (optional)"
                  value={f.placeholder ?? ''}
                  onChange={(e) => update(i, { placeholder: e.target.value || undefined })}
                />
                <input
                  className="input"
                  placeholder="Help text (optional)"
                  value={f.helpText ?? ''}
                  onChange={(e) => update(i, { helpText: e.target.value || undefined })}
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(f.required)}
                  onChange={(e) => update(i, { required: e.target.checked })}
                />
                <span style={{ color: 'var(--text-secondary)' }}>Required</span>
              </label>

              {NEEDS_OPTIONS(f.type) && (
                <div className="mt-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Options (one per line)
                  </label>
                  <textarea
                    className="input w-full"
                    rows={3}
                    value={(f.options ?? []).join('\n')}
                    onChange={(e) =>
                      update(i, {
                        options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" onClick={add} className="btn btn-secondary mt-3 inline-flex">
        <Plus className="w-4 h-4" /> Add field
      </button>
    </div>
  );
}
