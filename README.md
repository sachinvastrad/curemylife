# EduCenter OS

**Training Institute Management + LMS SaaS Platform**

A full-stack SaaS platform for coaching centers and training institutes — managing admissions, courses, payments, LMS, and analytics.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Firebase project (for authentication)

### 1. Clone & Install

```bash
git clone <repo-url> edu-center-os
cd edu-center-os
npm install
```

### 2. Start Database

```bash
cd infra/docker
docker-compose up -d
```

This starts MySQL on `localhost:3306` and phpMyAdmin on `localhost:8080`.

### 3. Configure Environment

```bash
# API Gateway
cp apps/api-gateway/.env.example apps/api-gateway/.env
# Edit with your Firebase Admin SDK credentials

# Web App
cp apps/web-app/.env.example apps/web-app/.env.local
# Edit with your Firebase Client SDK credentials
```

### 4. Setup Database

```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:seed        # Seed test data
```

### 5. Run Development Servers

```bash
npm run dev
```

This starts:
- **Web App**: http://localhost:3000
- **API Gateway**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs

### Test Accounts (after seeding)

| Role | Email | Notes |
|------|-------|-------|
| Super Admin | superadmin@educenter.com | Full system access |
| Admin | admin@educenter.com | Admission & operations |
| Teacher | teacher@educenter.com | Course management |
| Student | student@educenter.com | Learning & admission |

> **Note:** Seeded users have placeholder Firebase UIDs. After setting up Firebase, create real accounts and the system will handle registration automatically.

---

## Project Structure

```
edu-center-os/
├── apps/
│   ├── web-app/          # Next.js 14 frontend
│   └── api-gateway/      # NestJS API backend
├── packages/
│   ├── shared-types/     # TypeScript interfaces
│   └── database/         # Prisma schema & client
├── infra/
│   └── docker/           # Docker Compose
├── turbo.json            # Turborepo config
└── package.json          # Root workspace
```

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Firebase Auth SDK
- **Backend**: NestJS, Prisma ORM, MySQL
- **Auth**: Firebase Auth (email/password + Google OAuth) with custom RBAC
- **Monorepo**: Turborepo

## Development Checkpoints

| # | Focus | Status |
|---|-------|--------|
| CP1 | Foundation, Auth, RBAC, Dashboards | ✅ Complete |
| CP2 | Admission Lifecycle & Counseling | ⬜ Next |
| CP3 | Payments, Receipts, Enrollment | ⬜ |
| CP4 | Course Management & Content | ⬜ |
| CP5 | LMS, Quizzes, Exams | ⬜ |
| CP6 | Analytics, Certificates, Production | ⬜ |

## Documentation

All planning docs live in `docs/`:

| File | Description |
|------|-------------|
| `docs/PLAN.md` | Complete development plan |
| `docs/CHECKPOINTS.md` | Task tracker with exit criteria |
| `docs/IMPLEMENTATION_GUIDE.md` | How to use all the docs together |
| `docs/api-endpoints-with-roles.md` | 94 API endpoints with role matrix |
| `docs/state-machine-diagram.md` | 12 states, 16 transitions for admissions |
| `docs/database-schema-final.sql` | Complete SQL schema with indexes |

---

## CP1 Changes Log

Schema corrections applied:
- **`application_courses`** table added (many-to-many: one app → multiple courses)
- **`payment_configurations`** table added (Super Admin configurable UPI/bank)
- **`COMPLETED`** status added to ApplicationStatus enum
- **`preferred_course_id`** removed from applications (use application_courses)
- **`application_course_id`** added to enrollments
- Payment methods updated: `UPI, NET_BANKING, CARD, CHEQUE, OTHER`
- `read_at` field added to notifications
- **25+ database indexes** added for performance
- **Role hierarchy** implemented: SUPER_ADMIN inherits ADMIN + TEACHER
- **Rate limiting** added: 100 req/min global, 5/min for signup
- **`POST /auth/logout`** endpoint added
- **`PATCH /users/:id`** self-profile update added

---

## API Endpoints (CP1)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/auth/signup` | Public | Register user |
| POST | `/api/v1/auth/firebase-register` | Public | Register/login via Firebase token |
| GET | `/api/v1/auth/me` | Authenticated | Get current user |
| GET | `/api/v1/users` | Admin+ | List users |
| GET | `/api/v1/users/stats` | Super Admin | User statistics |
| GET | `/api/v1/users/:id` | Admin+ | Get user |
| PATCH | `/api/v1/users/:id/role` | Super Admin | Assign role |
| PATCH | `/api/v1/users/:id/toggle-active` | Super Admin | Activate/deactivate |
