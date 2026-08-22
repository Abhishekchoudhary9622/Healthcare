# HealthSync – Healthcare Appointment & Follow-up Manager

A full-stack healthcare platform with separate portals for **patients**, **doctors**, and **admins**. Includes AI-powered symptom analysis, post-visit summaries, email notifications, Google Calendar integration, and medication reminders.

---

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18, Vite, TailwindCSS, Zustand, React Query, Recharts |
| Backend   | Node.js, Express, Prisma ORM |
| Database  | PostgreSQL |
| LLM       | OpenAI GPT-3.5-turbo (graceful fallback if key not set) |
| Email     | Nodemailer (Gmail / any SMTP) |
| Calendar  | Google Calendar API v3 with OAuth2 |
| Auth      | JWT access + refresh tokens, bcrypt |
| Jobs      | node-cron (medication reminders, appointment reminders, notification retries) |

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1 – Clone & install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2 – Configure environment

```bash
# Backend
cp .env.example .env
# Edit .env with your DB credentials, JWT secrets, email, OpenAI key

# Frontend
cp .env.example .env.local
```

Minimum required for the app to run without external services:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/healthsync
JWT_SECRET=any-long-random-string
JWT_REFRESH_SECRET=another-long-random-string
```
Everything else (email, OpenAI, Google Calendar) degrades gracefully if not configured.

### 3 – Database setup

```bash
cd backend

# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed demo data (admin + 6 doctors + 1 patient)
node prisma/seed.js
```

### 4 – Run

```bash
# Terminal 1 – Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 – Frontend (http://localhost:3000)
cd frontend
npm run dev
```

### Demo Credentials

| Role    | Email                          | Password    |
|---------|--------------------------------|-------------|
| Admin   | choudharyabhishek656@gmail.com | Abhishek@09 |
| Doctor  | dr.williams@healthsync.com     | Doctor@123  |
| Patient | patient@healthsync.com         | Patient@123 |

---

## Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Enable APIs** → search "Google Calendar API" → Enable
3. **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID** → Web Application
4. Add Authorised redirect URI: `http://localhost:5000/api/calendar/callback`
5. Copy **Client ID** and **Client Secret** to `.env`:
   ```env
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxx
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback
   ```
6. In the app, visit `GET /api/calendar/auth` (authenticated) to get the consent URL and complete the OAuth flow.

---

## Email Setup (Gmail)

1. Enable 2-Step Verification on your Google account
2. Go to **Security** → **App passwords** → Generate a password for "Mail"
3. Set in `.env`:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your@gmail.com
   EMAIL_PASS=your-16-char-app-password
   ```

---

## Deployment (Render)

### Backend
1. Create a new **Web Service** on [Render](https://render.com)
2. Root directory: `backend`
3. Build command: `npm install && npx prisma generate && npx prisma migrate deploy`
4. Start command: `npm start`
5. Add all environment variables from `.env.example`
6. Create a **PostgreSQL** database on Render and copy the `DATABASE_URL`

### Frontend
1. Create a new **Static Site** on Render
2. Root directory: `frontend`
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`
5. Add env var: `VITE_API_URL=https://your-backend.onrender.com`
6. Update `vite.config.js` proxy target to your deployed backend URL

---

## API Documentation

All responses follow the shape:
```json
{ "success": true, "message": "...", "data": { ... } }
```

### Auth  `POST /api/auth/...`

| Method | Path | Body | Auth | Description |
|--------|------|------|------|-------------|
| POST | `/register` | `email, password, firstName, lastName, role` | — | Register patient/doctor |
| POST | `/login` | `email, password` | — | Login, returns tokens |
| POST | `/refresh` | `refreshToken` | — | Rotate access token |
| POST | `/logout` | `refreshToken` | — | Invalidate refresh token |
| GET  | `/me` | — | Bearer | Current user profile |
| PUT  | `/profile` | `firstName, lastName, phone` | Bearer | Update profile |
| PUT  | `/change-password` | `currentPassword, newPassword` | Bearer | Change password |

### Appointments  `BASE /api/appointments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/doctors/search?name=&specialisation=&page=&limit=` | — | Search doctors |
| GET | `/slots?doctorId=&date=YYYY-MM-DD` | — | Get available slots |
| POST | `/hold` | Patient | Hold a slot for 10 min |
| POST | `/` | Patient | Book appointment |
| GET | `/mine?status=&page=` | Patient | Patient's appointments |
| GET | `/:id` | Bearer | Appointment detail |
| PATCH | `/:id/cancel` | Bearer | Cancel appointment |
| PATCH | `/:id/reschedule` | Patient/Admin | Reschedule |
| PATCH | `/:id/symptoms` | Patient | Submit/update symptoms |

### Doctor  `BASE /api/doctor`  (Doctor role only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Stats + upcoming |
| GET | `/appointments?status=&date=&page=` | All appointments |
| GET | `/schedule/today` | Today's appointments |
| GET | `/leaves` | Upcoming leave days |
| PUT | `/profile` | Update professional profile |
| POST | `/appointments/:id/post-visit` | Submit notes + prescriptions |

### Admin  `BASE /api/admin`  (Admin role only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Platform stats |
| GET | `/doctors?search=&specialisation=&page=` | List doctors |
| POST | `/doctors` | Create doctor account |
| PUT | `/doctors/:id` | Update doctor |
| DELETE | `/doctors/:id` | Deactivate doctor |
| POST | `/doctors/:doctorId/leave` | Add leave day (notifies patients) |
| DELETE | `/doctors/:doctorId/leave/:leaveId` | Remove leave day |
| GET | `/patients?search=&page=` | List patients |
| GET | `/appointments?status=&page=` | All appointments |

### Calendar  `BASE /api/calendar`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth` | Bearer | Get OAuth2 consent URL |
| GET | `/callback?code=&state=` | — | OAuth2 callback |

---

## Database Schema

```
users
  id, email, password, role(PATIENT|DOCTOR|ADMIN)
  firstName, lastName, phone, avatar, isActive
  createdAt, updatedAt

doctor_profiles  (1:1 → users)
  id, userId, specialisation, qualifications
  experience, bio, consultationFee, slotDuration
  workingHours(JSON), isVerified, calendarId

patient_profiles  (1:1 → users)
  id, userId, dateOfBirth, gender, bloodGroup
  allergies, medicalHistory, address, emergencyContact

leave_days  (N:1 → doctor_profiles)
  id, doctorProfileId, date(unique per doctor), reason

appointments  (N:1 → doctor_profiles, N:1 → patient_profiles)
  id, doctorProfileId, patientProfileId
  scheduledAt, endsAt, status(PENDING|CONFIRMED|CANCELLED|COMPLETED|RESCHEDULED|HELD)
  holdExpiresAt
  symptoms, preVisitSummary, urgencyLevel(LOW|MEDIUM|HIGH)
  chiefComplaint, suggestedQuestions(JSON)
  clinicalNotes, prescription, postVisitSummary, followUpDate
  googleCalendarEventIdDoctor, googleCalendarEventIdPatient
  cancelReason, rescheduledFrom

prescriptions  (N:1 → appointments)
  id, appointmentId, medicationName, dosage
  frequency, durationDays, instructions, startDate

medication_reminders  (N:1 → prescriptions, N:1 → appointments)
  id, prescriptionId, appointmentId
  patientEmail, patientName, medicationName, dosage
  scheduledFor, sent, sentAt

notifications  (N:1 → appointments)
  id, appointmentId, recipientEmail, recipientName
  type(BOOKING_CONFIRMATION|APPOINTMENT_REMINDER|CANCELLATION|
       LEAVE_NOTIFICATION|MEDICATION_REMINDER|POST_VISIT_SUMMARY)
  status(PENDING|SENT|FAILED|RETRYING)
  subject, body, attempts, lastAttemptAt, sentAt, errorMessage

slot_holds  (unique per doctorProfileId+scheduledAt)
  id, doctorProfileId, scheduledAt, patientUserId, expiresAt

refresh_tokens  (N:1 → users)
  id, userId, token(unique), expiresAt
```

---

## LLM Prompts

### Pre-Visit Summary
```
Analyse these symptoms and return a JSON object with EXACTLY these fields:
{
  "urgencyLevel": "Low" | "Medium" | "High",
  "chiefComplaint": "<one concise sentence>",
  "suggestedQuestions": ["question1", "question2", "question3"],
  "summary": "<2-3 sentence patient-friendly summary>"
}

Symptoms: <symptoms>

Return ONLY valid JSON, no markdown, no explanation.
```

### Post-Visit Summary
```
Convert these clinical notes into a patient-friendly summary with medication
schedule and follow-up steps.

Return a JSON object with EXACTLY these fields:
{
  "summary": "<2-3 paragraph patient-friendly explanation of the visit>",
  "medicationSchedule": "<clear medication instructions>",
  "followUpSteps": ["step1", "step2", "step3"],
  "warningSymptoms": ["symptom to watch for 1", "symptom to watch for 2"]
}

Clinical Notes: <notes>
Prescriptions: <prescription list>

Return ONLY valid JSON, no markdown.
```

**Failure handling:** Both prompts fall back to structured mock data if the OpenAI key is absent, the API is unreachable, or the response cannot be parsed as valid JSON. The appointment is never blocked waiting for the LLM.

---

## Project Structure

```
Healthcare/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # DB schema
│   │   └── seed.js             # Demo data
│   ├── src/
│   │   ├── config/             # App config, logger, Prisma client
│   │   ├── controllers/        # auth, admin, appointment, doctor
│   │   ├── jobs/               # node-cron scheduler
│   │   ├── middleware/         # auth, validate, errorHandler
│   │   ├── routes/             # Express routers
│   │   ├── services/           # llm, email, notification, calendar, reminder
│   │   ├── utils/              # jwt, response, asyncHandler, slots
│   │   └── server.js           # Entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # DashboardLayout, Sidebar, Topbar, ProtectedRoute
│   │   │   ├── shared/         # StatCard, AppointmentCard, DoctorCard
│   │   │   └── ui/             # Button, Input, Card, Modal, Badge, Avatar, Toast, Select, Spinner
│   │   ├── lib/                # api.js (axios), utils.js
│   │   ├── pages/
│   │   │   ├── auth/           # Login, Register
│   │   │   ├── patient/        # Dashboard, FindDoctors, BookingModal, MyAppointments, Profile
│   │   │   ├── doctor/         # Dashboard, Appointments, TodaySchedule, PostVisitModal, Profile
│   │   │   └── admin/          # Dashboard, Doctors, Patients, Appointments, AddDoctor
│   │   ├── store/              # authStore, themeStore (Zustand)
│   │   ├── App.jsx             # Routes
│   │   └── main.jsx            # Entry point
│   ├── .env.example
│   ├── tailwind.config.js
│   └── package.json
│
├── README.md
└── SYSTEM_DESIGN.md
```
