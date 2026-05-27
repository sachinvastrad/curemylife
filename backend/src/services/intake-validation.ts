/**
 * Helpers for the per-service intake form definition.
 *
 * A `Service` carries a JSON `intakeFields` array describing what the patient
 * must fill in. We validate two things in this file:
 *   1. The shape of the field definition itself (admin save).
 *   2. The shape of a submitted payload against that definition (patient submit).
 *
 * Both go through plain functions rather than class-validator because the
 * shapes are dynamic — the schema is data, not types.
 */

import { BadRequestException } from '@nestjs/common';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'boolean';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

const KEY_RE = /^[a-z][a-z0-9_]*$/;
const ALLOWED_TYPES: FieldType[] = [
  'text', 'textarea', 'number', 'select', 'multiselect', 'date', 'boolean',
];

export function validateFieldDefs(raw: unknown): FieldDef[] {
  if (!Array.isArray(raw)) {
    throw new BadRequestException('intakeFields must be an array');
  }
  if (raw.length === 0) {
    throw new BadRequestException('intakeFields must contain at least one field');
  }

  const seenKeys = new Set<string>();
  const out: FieldDef[] = [];

  raw.forEach((f, i) => {
    if (!f || typeof f !== 'object') {
      throw new BadRequestException(`Field #${i + 1} must be an object`);
    }
    const field = f as Record<string, unknown>;
    const key = field.key;
    const label = field.label;
    const type = field.type;

    if (typeof key !== 'string' || !KEY_RE.test(key)) {
      throw new BadRequestException(
        `Field #${i + 1}: key must be snake_case starting with a letter (got "${String(key)}")`,
      );
    }
    if (seenKeys.has(key)) {
      throw new BadRequestException(`Duplicate field key "${key}"`);
    }
    seenKeys.add(key);

    if (typeof label !== 'string' || !label.trim()) {
      throw new BadRequestException(`Field "${key}": label is required`);
    }
    if (typeof type !== 'string' || !ALLOWED_TYPES.includes(type as FieldType)) {
      throw new BadRequestException(
        `Field "${key}": type must be one of ${ALLOWED_TYPES.join(', ')}`,
      );
    }

    const def: FieldDef = { key, label: label.trim(), type: type as FieldType };
    if (typeof field.required === 'boolean') def.required = field.required;
    if (typeof field.placeholder === 'string') def.placeholder = field.placeholder;
    if (typeof field.helpText === 'string') def.helpText = field.helpText;

    if (def.type === 'select' || def.type === 'multiselect') {
      if (!Array.isArray(field.options) || field.options.length === 0) {
        throw new BadRequestException(
          `Field "${key}": ${def.type} fields require a non-empty options array`,
        );
      }
      if (field.options.some((o) => typeof o !== 'string' || !o.trim())) {
        throw new BadRequestException(
          `Field "${key}": all options must be non-empty strings`,
        );
      }
      def.options = (field.options as string[]).map((o) => o.trim());
    }

    out.push(def);
  });

  return out;
}

/**
 * Validate a submitted intake payload against the service's field definition.
 * Coerces basic types (number/boolean) and strips unknown keys.
 */
export function validateIntakePayload(
  fields: FieldDef[],
  payload: unknown,
): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new BadRequestException('intakePayload must be an object');
  }
  const src = payload as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const f of fields) {
    const v = src[f.key];
    const present = v !== undefined && v !== null && v !== '';

    if (!present) {
      if (f.required) {
        throw new BadRequestException(`Field "${f.label}" is required`);
      }
      continue;
    }

    switch (f.type) {
      case 'text':
      case 'textarea':
      case 'date':
        if (typeof v !== 'string') {
          throw new BadRequestException(`Field "${f.label}" must be a string`);
        }
        out[f.key] = v;
        break;

      case 'number': {
        const n = typeof v === 'number' ? v : Number(v);
        if (Number.isNaN(n)) {
          throw new BadRequestException(`Field "${f.label}" must be a number`);
        }
        out[f.key] = n;
        break;
      }

      case 'boolean':
        out[f.key] = Boolean(v);
        break;

      case 'select':
        if (typeof v !== 'string' || !f.options?.includes(v)) {
          throw new BadRequestException(
            `Field "${f.label}" must be one of: ${f.options?.join(', ')}`,
          );
        }
        out[f.key] = v;
        break;

      case 'multiselect':
        if (!Array.isArray(v)) {
          throw new BadRequestException(`Field "${f.label}" must be an array`);
        }
        if (v.some((x) => typeof x !== 'string' || !f.options?.includes(x))) {
          throw new BadRequestException(
            `Field "${f.label}" contains a value not in the allowed options`,
          );
        }
        out[f.key] = v;
        break;
    }
  }

  return out;
}

/**
 * A service is "publishable" when it has the minimum content for a usable
 * landing page + intake. Enforced before enabling (PRD §6.3 / KPI O7).
 */
export function assertPublishable(service: {
  name: string;
  description: string | null;
  intakeFields: unknown;
  specialitiesCount: number;
}): void {
  const missing: string[] = [];
  if (!service.name?.trim()) missing.push('name');
  if (!service.description?.trim()) missing.push('landing description');
  try {
    const f = validateFieldDefs(service.intakeFields);
    if (f.length === 0) missing.push('at least one intake field');
  } catch {
    missing.push('a valid intake form definition');
  }
  if (service.specialitiesCount === 0) missing.push('at least one routing speciality');

  if (missing.length > 0) {
    throw new BadRequestException(
      `Cannot enable: missing ${missing.join(', ')}`,
    );
  }
}
