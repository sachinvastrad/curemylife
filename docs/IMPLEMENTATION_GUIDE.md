# HomeoOpinion — Implementation Guide

## 1. Project Overview
HomeoOpinion is a specialized portal for Homeopathic case management. The system is divided into three main portals:
- **Patient Portal**: Case intake, document upload, appointment booking, prescription download.
- **Doctor Portal**: Case queue, AI report review, expert report submission, appointment management, prescription issuance.
- **Admin Portal**: Doctor onboarding approval, case oversight, analytics dashboard.

## 2. Technology Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: NestJS 11, TypeScript
- **Database**: PostgreSQL via Prisma ORM v7
- **Authentication**: JWT (7d access / 30d refresh), bcrypt, Google OAuth, OTP via nodemailer
- **AI**: OpenAI GPT-4o (mock fallback if no API key)
- **Payments**: Razorpay (currently mocked)
- **Video**: Jitsi Meet (auto-generated room links)
- **PDF**: pdfkit (prescription generation)

## 3. Project Structure
```
SecondOp/
├── backend/                    # NestJS application
│   ├── src/
│   │   ├── admin/              # Admin dashboard endpoints
│   │   ├── ai/                 # GPT-4o case analysis
│   │   ├── appointments/       # Scheduling + status transitions
│   │   ├── auth/               # JWT, OTP, Google OAuth, guards
│   │   ├── cases/              # Case management + document upload
│   │   ├── doctors/            # Doctor profile, availability, reports, earnings
│   │   ├── payments/           # Razorpay (mocked), commission split
│   │   ├── prescriptions/      # Create + PDF generation (pdfkit)
│   │   ├── prisma/             # PrismaService wrapper
│   │   └── reviews/            # DoctorReview CRUD, avgRating aggregation
│   └── prisma/schema.prisma    # Full DB schema — source of truth
├── frontend/                   # Next.js application
│   └── src/app/
│       ├── patient/            # Cases, appointments, prescriptions, profile
│       ├── doctor/             # Queue, cases/[id], appointments, profile, earnings
│       └── admin/              # Dashboard, doctors
├── docs/                       # This folder
└── requirements_full.txt       # Full product requirements document
```

## 4. API Structure
All API routes are prefixed `/api/`. Key modules:

| Prefix | Auth | Purpose |
|--------|------|---------|
| `/api/auth/` | Public | Login, register, OTP, refresh |
| `/api/cases/` | JWT | Patient case CRUD, doctor queue/accept |
| `/api/doctors/` | JWT | Doctor profile, availability, reports, earnings |
| `/api/appointments/` | JWT | Book, start, complete, cancel |
| `/api/payments/` | JWT | Razorpay order, confirm, history |
| `/api/prescriptions/` | JWT | Create, view, PDF download |
| `/api/reviews/` | JWT | Patient reviews, doctor ratings |
| `/api/ai/` | JWT | Process case, get AI report |
| `/api/admin/` | JWT + Admin role | Dashboard, user management |

## 5. Auth Guards
```typescript
// Protect any endpoint with JWT check
@UseGuards(JwtAuthGuard)

// Restrict to specific roles
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('patient')          // or 'doctor' or 'admin'
```
JWT payload: `{ sub: userId, role: 'patient'|'doctor'|'admin', email }`

## 6. Frontend API Client
All backend calls go through `frontend/src/lib/api.ts` via axios with auto JWT attach and 401 refresh interceptor. Grouped exports:
- `authApi`, `casesApi`, `doctorsApi`, `appointmentsApi`, `paymentsApi`, `prescriptionsApi`, `reviewsApi`, `aiApi`, `adminApi`

## 7. Development Workflow
1. Refer to `CHECKPOINTS.md` for current priority and status.
2. Schema changes: edit `backend/prisma/schema.prisma`, run `npx prisma migrate dev`.
3. Backend: add service method → controller endpoint → update `api.ts` in frontend.
4. Frontend: add page under `/src/app/<role>/<feature>/page.tsx`; use `'use client'` + `useAuth()` guard.
5. Cross-reference `requirements_full.txt` for business rules.

## 8. Environment Setup
```bash
# Backend — C:/Users/AILap/SecondOp/backend/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/homeopinion?schema=public"
JWT_SECRET="..."
OPENAI_API_KEY="sk-..."        # leave blank for mock AI
SMTP_USER="you@gmail.com"      # leave blank to log OTPs to console
SMTP_PASS="app-password"

# Frontend — C:/Users/AILap/SecondOp/frontend/.env.local
NEXT_PUBLIC_API_URL="http://localhost:3001"
```
