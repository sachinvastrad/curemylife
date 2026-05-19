# HomeoOpinion — Implementation Task Tracker

## Phase 1: Core Platform MVP

- [x] **Checkpoint 1** — Project Setup & Auth (Weeks 1–2)
  - [x] NestJS backend + Next.js 15 App Router scaffold
  - [x] PostgreSQL via Prisma ORM — full schema (Patient, Doctor, Admin, Case, AiReport, DoctorReport, Appointment, Payment, Prescription, DoctorReview, AuditLog)
  - [x] JWT auth (7d access / 30d refresh tokens), bcrypt
  - [x] Patient auth: Google OAuth (mock decode) + Email/Phone OTP with rate limiting
  - [x] Doctor auth: credential login + admin-verified registration flow
  - [x] Admin auth: credential login + MFA (6-digit code)
  - [x] Auth guards (JwtAuthGuard, RolesGuard) applied across all endpoints
  - [x] Token refresh endpoint

- [x] **Checkpoint 2** — Patient Case Intake (Weeks 3–4)
  - [x] Multi-step case intake form (chief complaint → constitutional → modalities → history)
  - [x] Mental/emotional symptom profiling fields
  - [x] Thermal sensitivity, miasmatic indicators, dietary preferences
  - [x] Modalities capture (worse/better with interactive badge UI)
  - [x] Previous treatments and family history fields
  - [x] Case status machine: draft → submitted → ai_processing → awaiting_doctor → report_ready → consultation_booked → consultation_done → closed
  - [x] Patient cases list page with status filter tabs
  - [x] Patient case detail page (read-only report view + booking button)

- [x] **Checkpoint 3** — Document Upload & Storage (Weeks 5–6)
  - [x] `POST /api/cases/:caseId/documents` — multer disk storage upload endpoint
  - [x] Document upload UI in new-case flow (Step 4)
  - [x] Document label editing (`PUT /api/cases/:caseId/documents/:docId/label`)
  - [x] Document deletion (`DELETE /api/cases/:caseId/documents/:docId`)
  - [x] Uploaded documents displayed in doctor case detail view with download links
  - [ ] Cloud storage (S3/R2) — currently disk only; files lost on redeploy *(low priority)*

- [x] **Checkpoint 4** — AI Preliminary Report (Weeks 7–8)
  - [x] AI service using GPT-4o (`/api/ai/process/:caseId`) — structured JSON report extraction
  - [x] Contextual mock fallback when OpenAI key is absent (keyword-based remedy suggestions)
  - [x] AiReport stored in DB (symptomSummary, possibleRubrics, suggestedRemedies, constitutionalNotes, redFlags, confidence)
  - [x] AI report shown to doctor in collapsible card on case detail page
  - [x] `GET /api/ai/report/:caseId` for fetching report by case
  - [ ] Rubric suggestion engine (Kent's Repertory lookup) *(Phase 2)*
  - [ ] Miasmatic analysis scoring *(Phase 2)*

- [x] **Checkpoint 5** — Doctor Onboarding & Case Review (Weeks 9–10)
  - [x] Doctor registration with CCH registration number + qualifications
  - [x] Admin approval workflow (pending → approved / rejected / suspended)
  - [x] Doctor queue page (`/doctor/queue`) — lists cases in `awaiting_doctor` status
  - [x] Case accept endpoint (`POST /api/cases/:id/accept`)
  - [x] Doctor cases list page (`/doctor/cases`) — all assigned cases
  - [x] **Doctor case detail page** (`/doctor/cases/[id]`) — AI report view + expert report form
    - AI agreement selector (agree / partial / disagree)
    - Clinical observations textarea
    - Recommended remedies (add/remove, remedy + potency + rationale)
    - Repertory rubrics (one per line)
    - Lifestyle & dietary modifications
    - Red flag observations
  - [x] `POST /api/doctors/cases/:caseId/report` — saves DoctorReport, updates case status → `report_ready`
  - [x] Doctor profile management (`/doctor/profile`) — name, phone, fees, approach, languages, clinic address, availability slots
  - [x] Doctor availability slots management (weekly schedule with day/time/duration)
  - [x] `GET /api/doctors/public/:id/slots?date=` — available slot calculator for booking

- [x] **Checkpoint 6** — Notifications, Payments & Consultation (Weeks 11–14)
  - [x] Appointment booking with slot selection modal (date picker + slot grid + appointment type)
  - [x] `POST /api/appointments` — creates appointment, generates Jitsi meetingLink for video
  - [x] `POST /api/appointments/:id/start` — transitions booked → in_progress
  - [x] `POST /api/appointments/:id/complete` — transitions → completed, auto-captures payment
  - [x] `POST /api/appointments/:id/cancel` — cancels with refund if doctor-initiated
  - [x] Patient appointments page with Join Meeting button + Leave Review button
  - [x] Doctor appointments page with Start Consultation + Issue Prescription modal
  - [x] Payment flow (Razorpay mocked): create order → confirm → capture on appointment complete
  - [x] Platform commission (15%) + doctor payout (85%) calculated on payment
  - [x] Doctor earnings dashboard — net earned, commission, consultations, payout history
  - [x] **E-Prescription** — issue from doctor appointments page (remedy, potency, dosage, frequency, duration, dietary restrictions, follow-up)
  - [x] **Prescription PDF download** — pdfkit generates A4 PDF with CCH disclaimer + doctor signature block
  - [x] **Reviews system** — patient star rating modal (1–5) + review text after completed appointment
  - [x] `POST /api/reviews/appointments/:id` — creates DoctorReview, recalculates Doctor.avgRating
  - [x] `GET /api/reviews/doctors/:id` — paginated public reviews with rating summary
  - [x] Email OTP delivery (nodemailer SMTP; falls back to console.log in dev)
  - [ ] WhatsApp / SMS notifications *(not started)*
  - [ ] Appointment reminder emails *(not started)*
  - [ ] Real Razorpay integration with webhook verification *(low priority)*

---

## Phase 2: Enhanced AI & Engagement

- [ ] **Checkpoint 7** — Full Homoeopathic Intake Form (Weeks 15–16)
  - [x] Basic constitutional fields exist (mental symptoms, modalities, thermal sensitivity)
  - [ ] Complete miasmatic assessment section (psora/sycosis/syphilis scoring)
  - [ ] Sensation-based symptom capture (Sankaran method)
  - [ ] Past disease history with dates
  - [ ] Family miasmatic history

- [ ] **Checkpoint 8** — Advanced AI Reports (Weeks 17–20)
  - [ ] Kent's Repertory rubric lookup integration
  - [ ] Miasmatic analysis with scoring (psoric/sycotic/syphilitic percentages)
  - [ ] Constitutional remedy profiling (Vithoulkas / Sankaran types)
  - [ ] Red flag detection with urgency scoring
  - [ ] AI report versioning / re-processing on case update

- [ ] **Checkpoint 9** — Follow-ups & E-Prescriptions *(partially done in CP6)*
  - [x] E-prescription creation and PDF generation
  - [x] Prescription download for patients
  - [ ] Follow-up appointment booking from existing case (isFollowup flag exists, UI missing)
  - [ ] Prescription renewal workflow
  - [ ] Follow-up fee vs initial fee enforcement

- [ ] **Checkpoint 10** — Doctor Mobile App & Multi-language (Weeks 25–28)
  - [ ] React Native / Flutter doctor mobile app
  - [ ] Hindi language support
  - [ ] 2 regional language additions (Kannada, Marathi, Telugu, etc.)
  - [ ] Push notifications for new case assignments

---

## Remaining Work Summary

### High Priority (blocks production)
- Real Razorpay webhook + payment verification
- Appointment reminder email notifications
- Admin doctor document upload & verification UI (`/admin/doctors` page enhancement)
- Admin specialities management (create/edit specialities, assign to doctors)

### Medium Priority
- Follow-up appointment booking UI
- Redis for OTP storage (currently in-memory Map — resets on restart)
- Cloud file storage (S3/R2) to replace disk upload

### Low Priority
- Swagger API documentation
- Audit logging (AuditLog model exists in schema, zero implementation)
- WhatsApp/SMS notifications
- ABDM/ABHA health ID integration
