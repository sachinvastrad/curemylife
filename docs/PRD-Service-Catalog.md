# PRD — Service Catalog

| | |
|---|---|
| **Feature** | Service Catalog ("Services" hub) |
| **Author** | Product Management |
| **Status** | Draft v1.1 (open questions resolved) |
| **Date** | 2026-05-22 |
| **Source brief** | `CatalogReq.md` |
| **Target release** | TBD |

---

## 1. Executive Summary

Today HomeoOpinion offers a single core journey: a patient creates a *case*, receives an AI + doctor opinion, and books a consultation. The platform's clinical capability, however, is broader than this one path — it can support diet plans, lifestyle programs, follow-up packages, second-opinion-only reviews, and other discrete offerings.

The **Service Catalog** introduces a dedicated, merchandised area where patients browse a gallery of *services*, each presented as a card. Selecting a card opens a service landing page that explains how the service works and provides a clear call-to-action. Opting in launches the service-specific intake flow, which collects the details that service requires and then routes the patient into doctor appointment booking.

Admins get full lifecycle control over the catalog — create, edit, enable/disable, and delete service cards — without engineering involvement, so the business can launch and retire offerings independently.

This turns HomeoOpinion from a single-product portal into a multi-service marketplace, unlocking new revenue lines and giving patients a discoverable menu of ways to engage.

---

## 2. User Problem

**Patient.** "I came for a homoeopathic second opinion, but I don't know what else this platform can do for me. There's no place to discover or choose other types of help (diet, lifestyle, focused reviews). The only thing I can do is start a full case."

**Business / Admin.** "Every new offering we want to sell requires a developer to build a bespoke flow and a marketer to figure out where to surface it. We can't experiment, price, or sunset offerings on our own timeline, and we have no single shelf to display our range of services."

**Doctor.** "Patients arrive through one funnel with one kind of intake. I can't easily distinguish a quick diet consult from a full constitutional second opinion, and the booking that reaches me carries no context about *which* service was purchased."

### Why now
- The underlying flow (case → AI/doctor report → appointment booking → payment) already exists and is reusable.
- Admin already manages doctors, cases, and revenue; extending admin to manage a catalog is a natural fit.
- Growth depends on offering more than one reason to return.

---

## 3. Core Objectives & KPIs

| # | Objective | KPI | Target (first 90 days post-launch) |
|---|-----------|-----|-------------------------------------|
| O1 | Make services discoverable | % of logged-in patients who visit the Services page | ≥ 40% |
| O2 | Convert browse → intent | Service card → landing page click-through rate | ≥ 25% |
| O3 | Convert intent → action | Landing page → "Opt for service" (intake started) rate | ≥ 15% |
| O4 | Complete the funnel | Intake started → appointment booked rate | ≥ 50% |
| O5 | Diversify engagement | % of new bookings originating from a non-default service | ≥ 20% |
| O6 | Operational independence | Median admin time to publish a new service (no code deploy) | < 30 min |
| O7 | Catalog quality | % of enabled services with complete landing content (title, description, how-it-works, CTA) | 100% |

> **Note:** v1 services are **free** (no payment step — see §6.5). O5 therefore measures booking *volume* by service, not revenue. When paid services are introduced later, O5 converts to a revenue-mix target.

**Guardrail metrics (must not regress):** core second-opinion case completion rate; appointment booking success rate.

---

## 4. User Journey

### 4.1 Patient — discover and opt in
1. Patient logs in and sees a new **"Services"** item in the left sidebar (alongside Dashboard, New Case, My Cases, etc.).
2. Clicking **Services** opens a catalog page showing a responsive grid of cards. Each card represents one enabled service (icon/image, name, short tagline). *(v1 services are free; a price slot is reserved for future paid services but not shown.)*
3. Patient clicks a card → **service landing page** opens, explaining:
   - What the service is and how it works (steps),
   - What's included / what the patient receives,
   - A prominent **call-to-action** button ("Opt for this service" / "Get started").
4. Patient clicks the CTA → the service's **config-driven intake form** is rendered — the fields are defined per service in admin config (no bespoke code per service).
5. The form collects the details that service requires (fields vary by service, defined in config).
6. On completing intake, the patient is taken to **doctor appointment booking** for a suitable doctor — matched by the service's **speciality tags** against doctors carrying those specialities — reusing the existing booking flow. *(No payment step in v1 since services are free; the booking flow's payment stage is bypassed/placeholdered for later.)*
7. Patient receives confirmation and can track the engagement from their dashboard / appointments.

### 4.2 Admin — manage the catalog
1. Admin opens a new **"Services"** (catalog management) section in the admin portal.
2. Admin sees a table/grid of all services with status (Enabled / Disabled), display order, and quick actions.
3. Admin can **Create** a service: name, slug, tagline, card image/icon, landing-page content (how-it-works steps, inclusions), the **intake form definition** (fields the patient must fill), doctor speciality/routing tags, and display order. *(A price field exists in the data model but is hidden/disabled in v1.)*
4. Admin can **Edit** any field of an existing service.
5. Admin can **Enable / Disable** a service — disabled services disappear from the patient catalog immediately but are retained for re-enabling.
6. Admin can **Delete** a service (soft-delete recommended; see constraints).
7. Changes are reflected in the patient-facing catalog without an engineering deploy.

### 4.3 Doctor — receive service context
- When a service-originated booking reaches a doctor, the appointment/case carries the **service name** and the intake details, so the doctor knows what was purchased and what to prepare.

---

## 5. Scope

### 5.1 Must-Have (v1)
- **Patient: "Services" left-menu item** wired into the existing role-based sidebar (`DashboardLayout`), patient role only.
- **Catalog page** — responsive grid of cards rendering only *enabled* services in admin-defined display order.
- **Service landing page** — per-service page with how-it-works content and a CTA button.
- **Config-driven intake form** — a single form renderer that builds the intake from a per-service field definition (label, type, required, options). No bespoke component per service.
- **CTA → intake invocation** — clicking the CTA renders that service's config-driven intake form.
- **Service intake → appointment booking** — on intake completion, route into the existing appointment booking flow, carrying the service context. **No payment in v1** (services are free); the payment stage is bypassed behind a placeholder.
- **Admin catalog management** — create, edit, enable/disable, and delete services; set name, tagline, card media, landing content, **intake form definition**, **doctor routing via speciality tags** (reusing the existing `Speciality` master), and display order. (Price field present in schema but hidden in v1.)
- **Data model** — a generic **engagement container** (working name `ServiceRequest`, modelled on FHIR `ServiceRequest` / ABDM and seeded from the existing case-taking intake fields) that holds any service's intake payload, rather than overloading `Case`. A `Service` entity defines the catalog card + intake form definition; each service links to one or more **specialities** via a `service_specialities` join table (mirroring `case_specialities` / `doctor_specialities` composite-PK pattern). The service reference is persisted on the resulting engagement/appointment.
- **Access control** — catalog management gated to `admin`; catalog browsing gated to authenticated `patient` via existing JWT + RolesGuard pattern.
- **Empty / disabled states** — graceful messaging when no services are enabled or a service is disabled/removed.

### 5.2 Nice-to-Have (later)
- **Paid services** — turn on the reserved price field + the booking flow's payment stage (per-service pricing, then `Payment` records as today).
- Service **categories / filtering / search** on the catalog page.
- **Featured / promoted** placement and badges (e.g., "New", "Popular").
- **Pricing variants / packages** per service (tiers, bundles); **coupons / discounts**.
- Per-service **analytics dashboard** for admins (views, conversion).
- **Rich landing-page builder** (WYSIWYG blocks, FAQ, testimonials).
- **Multi-language** landing content (aligns with `preferredLang`).
- **Visual intake-form builder** — drag-and-drop UI over the v1 config (v1 ships a config-driven renderer; the builder is the no-code authoring layer on top).
- **Reordering via drag-and-drop** in admin.
- **Unify "New Case" into the catalog** as one card (see §6.5 decision 4 — deferred to protect the core funnel).

### 5.3 Out of Scope (v1)
- **Payments / paid services** — all v1 services are free; price field is schema-only and hidden.
- A full **WYSIWYG no-code page/form builder** (v1 ships a *config-driven* intake renderer, not a visual builder).
- Patient-to-patient or marketplace listings created by non-admins.
- Subscription/recurring billing.
- Changes to the core AI report generation logic.

---

## 6. Technical & Edge-Case Constraints

### 6.1 Architecture alignment
- **Frontend:** Next.js 15 (App Router). New patient routes (e.g. `/patient/services`, `/patient/services/[slug]`) and admin routes (e.g. `/admin/services`). Reuse `DashboardLayout` and the existing axios `api` client. **Note:** this project's Next.js carries breaking changes — consult `node_modules/next/dist/docs/` before implementation.
- **Backend:** NestJS 11 module (e.g. `services/`) following the existing module/guard pattern (`JwtAuthGuard` + `RolesGuard` + `@Roles(...)`).
- **Database:** Prisma v7 on **MySQL 8** via `@prisma/adapter-mariadb`.
  - No scalar list columns — use `Json?` for list-like fields (how-it-works steps, inclusions, the **intake form definition**, and the **submitted intake payload** on the engagement container), consistent with existing `Case`/`Doctor` JSON fields.
  - Free-text/landing content should use `@db.Text` to avoid the default `VARCHAR(191)` truncation.
  - The reserved `price` field uses `@db.Decimal` (matching `doctors.initialFee`); nullable and unused in v1.
- **Intake renderer:** one shared form component reads the service's `Json` field definition and renders inputs; submission validates against that definition (class-validator on the backend) before persisting to the engagement container.

### 6.2 Data integrity & lifecycle
- **Slug uniqueness** for landing-page URLs; immutable once published or handled with redirects.
- **Disable vs delete:** disabling hides a service from patients but preserves it; deletion of a service that already has historical cases/appointments must **not** orphan or break those records — prefer **soft delete** (e.g., `deletedAt`/archived flag) and retain the service reference on past cases/appointments.
- **Display order** must be deterministic (explicit `displayOrder` integer; stable tiebreak).

### 6.3 Edge cases to handle
- Patient on a landing page when admin **disables/deletes** the service mid-session → graceful "no longer available" state; block intake start.
- Service has **no qualified/available doctor** for routing → clear message; don't strand the patient after they've completed intake (validate availability before or at booking).
- **Pricing** — N/A in v1 (free). *When paid services land:* lock the price quoted at booking time so a patient is never charged a price they didn't see.
- **Incomplete admin content** (missing CTA, description, or intake form definition) → service cannot be *enabled* until required fields are complete (enforces KPI O7).
- **Malformed intake config** (bad field type, duplicate field key, no fields) → admin save is rejected with a validation error; the renderer never receives an unparseable definition.
- **In-flight intake** abandoned → save as draft where possible; resumable from dashboard (mirrors existing case `draft` status).
- **Direct URL access** to a disabled/deleted service slug → 404 / unavailable, not a server error.
- **Concurrency:** two admins editing the same service → last-write-wins is acceptable for v1, but surface a warning if feasible.

### 6.4 Security, compliance & non-functional
- All catalog-management endpoints restricted to `admin`; patient endpoints require an authenticated patient.
- Admin create/edit/enable/disable/delete actions should be written to the existing **`audit_logs`** trail.
- Uploaded card images go through the existing upload mechanism (multer/disk today; S3 in prod) — validate file type/size.
- Service intake that collects health-related details inherits **DPDPA 2023** handling and **CCH Telemedicine 2020** obligations already applied to cases.
- Catalog page should be performant with dozens of services (paginate or lazy-load images as the catalog grows).

### 6.5 Decisions (resolved)
1. **Engagement container** — services do **not** overload the `Case` model. We introduce a generic engagement container (working name `ServiceRequest`) that holds any service's intake payload. It is **modelled on the existing case-taking intake** (chief complaint, modalities, documents, etc.) and aligned to the **FHIR `ServiceRequest`** resource — the standard "request for a service on/for a patient," which also has an **ABDM** profile (relevant to the project's planned ABDM integration). `Case` remains the dedicated container for the core second-opinion flow.
2. **Pricing** — **all v1 services are free.** No payment step in the patient flow. A `price` field is reserved in the schema (hidden/disabled in UI) so paid services can be switched on later without a migration (see §5.2).
3. **Intake** — a **config-driven form from day one**. Each service stores a field definition (label, type, required, options) and a single shared renderer builds the form. No per-service bespoke components; a visual builder is a later enhancement (§5.2).
4. **"New Case" placement** — the core second-opinion offering **stays as its own top-level menu item** and is *not* diluted by the catalog in v1. Folding it into the catalog as one card is desirable later but explicitly deferred (§5.2).

### 6.6 Open questions
- None outstanding. (Container, pricing, intake model, and navigation all resolved above.)

---

## 7. Success Definition

v1 is successful when: an admin can publish, edit, disable, and remove a service — including defining its intake fields — entirely on their own without a code deploy; a patient can discover the Services menu, browse cards, read a landing page, opt in, complete a config-driven intake, and book an appointment for free; and the new path drives a measurable share of bookings (O5) without regressing the core second-opinion funnel.
