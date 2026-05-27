// Shared types for the Service Catalog feature.
// Mirrors backend/src/services/intake-validation.ts FieldDef.

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

export interface HowItWorksStep {
  step: number;
  title: string;
  body?: string;
}

export interface ServiceCard {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  iconName?: string | null;
  cardImageUrl?: string | null;
  displayOrder: number;
  isEnabled: boolean;
  deletedAt?: string | null;
}

export interface ServiceDetail extends ServiceCard {
  description?: string | null;
  howItWorks?: HowItWorksStep[] | null;
  inclusions?: string[] | null;
  intakeFields: FieldDef[];
  price?: string | number | null;
  specialities: { id: number; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequestSummary {
  id: string;
  serviceId: string;
  patientId: string;
  status: 'draft' | 'submitted' | 'booked' | 'completed' | 'cancelled';
  submittedAt?: string | null;
  service: { id: string; slug: string; name: string };
}

export type IntakePayload = Record<string, string | number | boolean | string[] | undefined>;
