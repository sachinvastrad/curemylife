# HomeoOpinion — API Endpoints & Role Matrix

This document outlines the core API endpoints required for the HomeoOpinion platform and the roles permitted to access them.

## Roles
- **Public**: Unauthenticated users.
- **Patient**: Authenticated users submitting and managing their own cases.
- **Doctor**: Authenticated medical professionals reviewing cases and providing opinions.
- **Admin**: Authenticated system administrators.

---

## 1. Authentication (`/auth`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/auth/signup` | Public | Register a new Patient account |
| POST | `/api/v1/auth/login` | Public | Authenticate and receive JWT |
| GET | `/api/v1/auth/me` | Patient, Doctor, Admin | Get current logged-in user profile |

## 2. Users (`/users`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/users` | Admin | List all users |
| PATCH | `/api/v1/users/:id/role` | Admin | Update a user's role (e.g., promote to Doctor) |
| GET | `/api/v1/users/stats` | Admin | Get user registration statistics |

## 3. Patient Cases (`/cases`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/cases` | Patient | Create a new case submission |
| GET | `/api/v1/cases/my-cases` | Patient | List all cases belonging to the patient |
| GET | `/api/v1/cases` | Doctor, Admin | List cases (Doctors see assigned/queue, Admins see all) |
| GET | `/api/v1/cases/:id` | Patient*, Doctor, Admin | Get case details (*Patient can only see their own) |
| PATCH | `/api/v1/cases/:id/status` | Doctor, Admin | Update case status (e.g., Under Review, Completed) |

## 4. Case Documents & Uploads (`/documents`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/documents/upload`| Patient, Doctor | Upload medical records or prescriptions to a case |
| GET | `/api/v1/documents/:id` | Patient*, Doctor, Admin | Download/View document |

## 5. Appointments (`/appointments`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/appointments` | Patient | Book an appointment with a specific doctor |
| GET | `/api/v1/appointments/my` | Patient | List patient's upcoming/past appointments |
| GET | `/api/v1/appointments/queue`| Doctor | List appointments assigned to the logged-in doctor |
| PATCH | `/api/v1/appointments/:id`| Doctor, Admin | Approve/Reschedule/Cancel appointment |

## 6. AI & Preliminary Reports (`/ai`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/ai/generate-report`| System, Admin | Trigger AI preliminary report generation for a case |
| GET | `/api/v1/ai/report/:caseId` | Doctor, Admin | Fetch the AI-generated preliminary report |
