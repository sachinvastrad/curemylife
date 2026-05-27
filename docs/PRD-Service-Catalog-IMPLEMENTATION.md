# Service Catalog — Implementation Plan & Checkpoints

> Companion to `PRD-Service-Catalog.md`. This file tracks scope, decisions, and per-phase progress.
> Status markers: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked

Last updated: 2026-05-28

---

## 1. Architectural Decisions (locked)

| # | Decision | Rationale |
|---|----------|-----------|
| A1 | **New `Service` + `ServiceRequest` models** (not overloading `Case`) | PRD §6.5.1 — engagement container modelled on FHIR ServiceRequest |
| A2 | **`Appointment.caseId` becomes nullable**, new `Appointment.serviceRequestId String?` added | Cleanest way to support both core-case appointments and service-originated ones in one table |
| A3 | **Intake form definition as `Json`** field on Service; validated server-side against a `FieldDef[]` shape | PRD §6.1, §6.5.3 — config-driven from day one |
| A4 | **Speciality routing via `ServiceSpeciality` join** (composite PK like `DoctorSpeciality`) | Reuses existing speciality master + matching pattern |
| A5 | **Soft delete via `deletedAt DateTime?`** on Service; never hard-delete if any historical ServiceRequest references it | PRD §6.2 — preserve booking history |
| A6 | **No payment step in v1** — `Service.price Decimal?` reserved, hidden in UI | PRD §5.1, §6.5.2 |
| A7 | **Audit log writes** on every admin mutation (create/update/enable/disable/delete) | PRD §6.4 |
| A8 | **Slug uniqueness** enforced at DB level (`@unique`); 404 on disabled or deleted slugs for patient routes | PRD §6.2, §6.3 |

---

## 2. Data Model — new + modified

```prisma
model Service {
  id              String   @id @default(uuid())
  slug            String   @unique
  name            String
  tagline         String?  @db.Text
  description     String?  @db.Text       // landing-page body
  howItWorks      Json?                   // [{step, title, body}]
  inclusions      Json?                   // string[]
  iconName        String?                 // lucide-react icon ref
  cardImageUrl    String?
  intakeFields    Json                    // FieldDef[] — see §3
  price           Decimal? @db.Decimal(10, 2)  // hidden in v1
  displayOrder    Int      @default(0)
  isEnabled       Boolean  @default(false)
  deletedAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  specialities    ServiceSpeciality[]
  requests        ServiceRequest[]

  @@map("services")
}

model ServiceSpeciality {
  serviceId    String
  specialityId Int
  service      Service    @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  speciality   Speciality @relation(fields: [specialityId], references: [id])
  @@id([serviceId, specialityId])
  @@map("service_specialities")
}

model ServiceRequest {
  id           String   @id @default(uuid())
  serviceId    String
  patientId    String
  status       String   @default("draft")  // draft, submitted, booked, completed, cancelled
  intakePayload Json                        // matches Service.intakeFields shape
  notes        String?  @db.Text
  submittedAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  service      Service  @relation(fields: [serviceId], references: [id])
  patient      Patient  @relation(fields: [patientId], references: [id])
  appointments Appointment[]

  @@index([patientId])
  @@index([serviceId])
  @@map("service_requests")
}

// MODIFIED: Appointment
model Appointment {
  // ...existing fields...
  caseId           String?   // was required; now optional
  serviceRequestId String?   // NEW
  case_            Case?            @relation(...)  // optional
  serviceRequest   ServiceRequest?  @relation(fields:[serviceRequestId], references:[id])
}

// MODIFIED: Patient + Speciality — back-relations
```

---

## 3. Intake Form Definition Shape

```ts
type FieldDef = {
  key: string;                  // unique within service; snake_case
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'date' | 'boolean';
  required?: boolean;
  options?: string[];           // for select/multiselect
  placeholder?: string;
  helpText?: string;
};
```

Validation rules (server-side):
- Keys must be unique within a service
- `select`/`multiselect` must provide `options`
- Intake payload coerced/validated against this on submit
- Renderer (frontend) reads this verbatim — no per-service code

---

## 4. Phases & Checkpoints

### Phase 1 — Schema + Prisma generate  `[x]` (commit `85a6e67`)
- [x] Edit `backend/prisma/schema.prisma` with Service / ServiceSpeciality / ServiceRequest
- [x] Make `Appointment.caseId` optional + add `serviceRequestId`
- [x] Add back-relations on `Patient` and `Speciality`
- [x] `npx prisma generate` (verify schema compiles)
- [x] Commit: `Phase 1 — Service Catalog schema`

### Phase 2 — Backend: Services module (admin CRUD + public read)  `[x]`
Files:
- [x] `backend/src/services/services.module.ts`
- [x] `backend/src/services/services.controller.ts`
- [x] `backend/src/services/services.service.ts`
- [x] `backend/src/services/dto/service.dto.ts`
- [x] `backend/src/services/intake-validation.ts` (helpers for FieldDef + payload)
- [x] Register `ServicesModule` in `app.module.ts`
- [x] Commit: `Phase 2 — Services backend module`

### Phase 3 — Backend: ServiceRequests + Appointment integration  `[x]`
- [x] `backend/src/service-requests/service-requests.module.ts`
- [x] `backend/src/service-requests/service-requests.controller.ts`
- [x] `backend/src/service-requests/service-requests.service.ts`
- [x] `backend/src/service-requests/dto/service-request.dto.ts`
- [x] Extend `appointments.service.ts` to accept `serviceRequestId` (mutually exclusive with `caseId`)
- [x] Register module in `app.module.ts`
- [x] Commit: `Phase 3 — ServiceRequests + Appointment hook`

### Phase 4 — Frontend: shared lib + intake renderer  `[x]`
- [x] `frontend/src/lib/api.ts` — add `servicesApi`, `serviceRequestsApi`
- [x] `frontend/src/lib/services-types.ts` — FieldDef and Service types
- [x] `frontend/src/components/services/IntakeFormRenderer.tsx`
- [x] Commit: `Phase 4 — Service catalog client lib + intake renderer`

### Phase 5 — Frontend: patient catalog (browse, landing, intake)  `[x]`
- [x] `frontend/src/app/patient/services/page.tsx` — grid
- [x] `frontend/src/app/patient/services/[slug]/page.tsx` — landing
- [x] `frontend/src/app/patient/services/[slug]/intake/page.tsx` — config-driven form
- [x] After intake: redirect into existing appointment booking with `serviceRequestId` in query
- [x] Update `DashboardLayout` sidebar — add `Services` for patient
- [x] Commit: `Phase 5 — Patient catalog UI`

### Phase 6 — Frontend: admin catalog management  `[x]`
- [x] `frontend/src/app/admin/services/page.tsx` — table (enable/disable/delete)
- [x] `frontend/src/app/admin/services/new/page.tsx`
- [x] `frontend/src/app/admin/services/[id]/edit/page.tsx`
- [x] `frontend/src/components/services/IntakeBuilder.tsx` — basic field-row builder (no DnD)
- [x] Update `DashboardLayout` sidebar — add `Services` for admin
- [x] Commit: `Phase 6 — Admin catalog UI`

### Phase 7 — Booking flow hookup + doctor context  `[x]`
- [x] Patient booking page accepts `serviceRequestId` + filters doctors by service.specialities
- [x] Appointment create call sends `serviceRequestId` (sets ServiceRequest.status='booked')
- [x] Doctor appointment view shows service name + intake summary when present
- [x] Commit: `Phase 7 — Booking + doctor context`

### Phase 8 — Polish + edge cases  `[x]`
- [x] Empty-state for /patient/services
- [x] 404 for disabled or deleted slug
- [x] Disabled-button reasons (matches recent UX work)
- [x] Audit log entries for admin mutations
- [x] Commit: `Phase 8 — Polish + audit + edge cases`

---

## 5. Out of scope for this batch (deferred per PRD §5.2)

- Payment integration for paid services
- WYSIWYG landing-page builder
- Drag-and-drop intake builder
- Categories / search / filtering on catalog
- Per-service analytics dashboard
- Multi-language landing content
- Folding "New Case" into catalog

---

## 6. Verification (manual)

After all phases:
1. Seed 2 services via admin UI (one with simple text intake, one with select/multiselect)
2. Patient flow: sidebar → services → card → landing → CTA → intake → booking → appointment created with serviceRequestId
3. Doctor sees the appointment with the service name + intake summary
4. Admin disables a service → it disappears from patient catalog; existing appointments still show
5. Admin tries to enable a service without required fields → blocked with message
6. Admin deletes a service that has historical requests → soft-deleted, history intact
