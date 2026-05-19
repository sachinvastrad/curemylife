# HomeoOpinion — Development Plan

## Current Status
Phase 1 MVP (Checkpoints 1–6) is **complete**. The platform has a fully functional end-to-end flow:
- Patient registers → submits case → documents uploaded → AI generates report → doctor reviews and submits expert opinion → patient books consultation → consultation conducted → prescription issued and downloadable as PDF → patient leaves review

## Immediate Next: Production Readiness

### 1. Admin — Doctor Verification UI
- Admin can see doctor registration documents (BHMS certificate, CCH registration scan)
- Approve / reject / suspend with reason
- **Files:** `frontend/src/app/admin/doctors/page.tsx` (add document viewer), possibly new doctor documents upload during registration

### 2. Admin — Specialities Management
- Create and manage speciality tags (Paediatrics, Dermatology, Psychiatry, etc.)
- Assign specialities to doctors (currently no UI — doctors can only view assigned specialities)
- **Files:** New `frontend/src/app/admin/specialities/page.tsx`; backend `POST /api/admin/specialities`

### 3. Real Razorpay Integration
- Replace `Math.random()` mock order IDs with actual Razorpay SDK
- Add `POST /api/payments/webhook` with signature verification
- Patient payment flow: after booking → Razorpay checkout → confirm on success
- **Files:** `backend/src/payments/payments.service.ts`, `payments.controller.ts`

### 4. Appointment Reminder Emails
- Send email 24h before appointment (nodemailer already configured)
- Include Jitsi link for video appointments
- **Approach:** Cron job or scheduled task using `@nestjs/schedule`

## Phase 2 Focus (after production readiness)

### Full Constitutional Intake
- Expand new-case form with complete miasmatic history section
- Sankaran sensation methodology fields
- Full family disease history

### Advanced AI
- Integrate Kent's Repertory database for rubric lookups
- Miasmatic scoring in AI report
- Constitutional type matching

*Refer to `CHECKPOINTS.md` for the detailed task checklist and `IMPLEMENTATION_GUIDE.md` for architectural rules.*
