# HealthSync – System Design Write-up

> Covers: double-booking prevention · doctor leave conflict handling · slot hold mechanism · notification failure handling

---

## 1. Double-Booking Prevention

The core challenge is ensuring two patients cannot book the same doctor at the same time, even under concurrent requests. HealthSync handles this at three layers.

**Layer 1 – Slot Hold (Optimistic Lock)**
When a patient selects a slot, the frontend calls `POST /api/appointments/hold` before showing the symptom form. This writes a row into the `slot_holds` table with a `UNIQUE(doctorProfileId, scheduledAt)` constraint and a 10-minute TTL (`expiresAt`). If two patients attempt to hold the same slot simultaneously, only the first INSERT succeeds — the second receives a Prisma `P2002` unique-constraint error, which is caught and returned to the user as "Slot no longer available." Expired holds are cleaned every minute by the cron job.

**Layer 2 – Transaction Lock at Booking**
When the patient confirms, `POST /api/appointments` executes inside a `prisma.$transaction`. Inside the transaction, a fresh collision check runs against the `appointments` table (`status IN ['CONFIRMED', 'PENDING']`). This closes the window between hold expiry and booking confirmation. The hold row is deleted atomically within the same transaction only after the appointment is created.

**Layer 3 – Slot Generation Exclusion**
`GET /api/appointments/slots` builds available slots by subtracting both confirmed bookings AND active holds from the doctor's working-hour slots. This means the slot never appears in the UI while it is held or booked, preventing users from even attempting a conflicting booking.

---

## 2. Doctor Leave Conflict Handling

When an admin marks a doctor on leave via `POST /api/admin/doctors/:id/leave`:

1. The leave date is written to the `leave_days` table with a `UNIQUE(doctorProfileId, date)` constraint to prevent duplicate entries.
2. All appointments for that doctor on that date with status `CONFIRMED` or `PENDING` are fetched in a single query.
3. Each affected appointment is updated to `CANCELLED` with `cancelReason = "Doctor on leave: <reason>"`.
4. A notification is queued for each affected patient (type `CANCELLATION`) with the leave reason and an invitation to reschedule.
5. If a patient or doctor tries to book a slot on a leave day, `getAvailableSlots` detects the leave record and returns `{ slots: [], message: "Doctor is on leave" }`. The booking transaction also checks for leave inside the transaction as a final guard.

This design ensures that leave marking is atomic, notifications are fire-and-forget (do not block the admin response), and the slot availability surface accurately reflects leave days.

---

## 3. Slot Hold Mechanism

The hold system prevents two patients from both reaching the confirmation step for the same slot, which would result in one booking failing silently after completing the symptom form — a poor user experience.

**Flow:**
```
Patient selects slot
  → POST /appointments/hold  (creates SlotHold row, TTL = 10 min)
  → Patient fills symptom form
  → POST /appointments        (checks hold ownership, creates Appointment, deletes hold)
```

**Race safety:** The `SlotHold` table has a `UNIQUE(doctorProfileId, scheduledAt)` index. The upsert verifies `patientUserId` matches after the write — if the row already belongs to another patient (extremely unlikely within the same instant but theoretically possible), the request is rejected with "Slot is being held by another patient."

**TTL enforcement:** A `node-cron` job runs every 60 seconds and deletes rows where `expiresAt < NOW()`. Released slots immediately reappear in `getAvailableSlots` without any application restart.

**Hold expiry on the frontend:** The `BookingModal` receives `expiresAt` and could display a countdown. If the patient takes longer than 10 minutes, the next booking request will fail with a slot-unavailable error and prompt them to re-select.

---

## 4. Notification Failure Handling

All notifications (booking confirmations, reminders, cancellations, medication reminders, post-visit summaries) go through a single `queueNotification` function that:

1. Persists the notification to the `notifications` table with `status = PENDING` before attempting delivery. This means no notification is ever silently lost — every send attempt has a DB record.
2. Calls `sendEmail` immediately (attempt #1). On success, sets `status = SENT`. On failure, increments `attempts` and sets `status = RETRYING`.
3. Schedules exponential retries via `setTimeout`: 1 minute (attempt 2), 5 minutes (attempt 3). After 3 failures, `status = FAILED` and `errorMessage` is stored for debugging.
4. A `node-cron` job runs every 10 minutes and sweeps `PENDING | RETRYING` notifications whose `lastAttemptAt` is older than 5 minutes and `attempts < 3`. This recovers from process restarts that interrupted in-flight retries.

**LLM failure handling** follows the same principle — the system never throws to the caller on LLM errors. If OpenAI is unreachable or returns unparseable JSON, a structured mock summary is written to the database instead. The appointment booking succeeds regardless. Errors are logged with Winston for operator visibility.

**Email not configured:** If `EMAIL_USER` / `EMAIL_PASS` are not set (e.g. in development), `sendEmail` logs a warning and returns `true` without attempting delivery, so no code path breaks.

---

## Architecture Summary

```
Frontend (React + Vite)          Backend (Express + Prisma)
─────────────────────────        ──────────────────────────────────
Patient Portal                   /api/auth         JWT + refresh tokens
Doctor Portal         ──HTTP──▶  /api/appointments slot hold, booking
Admin Portal                     /api/doctor       post-visit notes
                                 /api/admin        doctor/leave mgmt
                                 /api/calendar     Google OAuth2

                                 Services
                                 ├── llm.service       OpenAI + fallback
                                 ├── email.service     Nodemailer
                                 ├── notification.svc  retry queue
                                 ├── calendar.service  Google Calendar
                                 └── reminder.service  medication schedule

                                 Background Jobs (node-cron)
                                 ├── every 1 min  – clean slot holds
                                 ├── every 5 min  – medication reminders
                                 ├── every 10 min – notification retries
                                 ├── every 15 min – appointment reminders
                                 └── daily        – token cleanup

Database (PostgreSQL via Prisma)
users → doctor_profiles / patient_profiles
appointments → prescriptions → medication_reminders
notifications, slot_holds, leave_days, refresh_tokens
```
