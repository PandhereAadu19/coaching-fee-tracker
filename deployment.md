# Deployment Guide

Coaching Fee Tracker & Parent Portal

- **Live app:** https://coaching-fee-tracker-kappa.vercel.app/
- **Repository:** `https://github.com/PandhereAadu19/coaching-fee-tracker`

This is a demo build. OTP, the payment gateway and SMS are mocked. The only live external call is Groq, which writes the counsellor note and falls back to a template if it is unavailable.

---

## 1. Prerequisites

- Node.js 20 or newer, and npm
- A PostgreSQL database. This project uses a free [Neon](https://neon.tech) database.
- (Optional) A free [Groq](https://console.groq.com) API key for the AI-written counsellor note. Without it the app uses the template note.

---

## 2. Run locally

```bash
# 1. Clone and install
git clone https://github.com/PandhereAadu19/coaching-fee-tracker
cd coaching-fee-tracker
npm install

# 2. Create your environment file and fill in the values
cp .env.example .env

# 3. Create the database tables
npx prisma migrate dev

# 4. Load the sample data (about 40 students)
npm run db:seed

# 5. Start the app
npm run dev
```

Open http://localhost:3000, then run the tests:

```bash
npm test
```

The tests are pure logic and do not need a database.

Notes:

- `npm run db:seed` wipes all tables before inserting, so only run it on a demo database.
- `npm run db:reset-demo` is also available to reset the demo data.
- `npm install` runs `prisma generate` automatically (postinstall).

---

## 3. Environment variables

Names only. Never commit real values. Only `.env.example` is committed.

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon) |
| `SESSION_SECRET` | Yes | Signs the session JWT and hashes OTPs. At least 16 characters |
| `CRON_SECRET` | Yes | Bearer token that `/api/cron/reminders` requires. Vercel Cron sends it automatically |
| `DEMO_TODAY` | Yes for the demo | Demo clock. Set to `2026-11-02` so the sample data stays true (Ishita 23 days overdue, Mohit due in 13 days) |
| `MOCK_OTP` | No | Fixed demo OTP. Defaults to `123456` |
| `GROQ_API_KEY` | No | Enables the AI-written counsellor note. If missing, the template note is used |
| `GROQ_MODEL` | No | Groq model name, for example `llama-3.1-8b-instant` |

---

## 4. How it is deployed

- **Hosting:** Vercel, with the GitHub repository connected. Every push to the production branch (`main`) deploys automatically.
- **Database:** Neon PostgreSQL.
- **Build command:** `npm run build` (runs `next build --webpack`). Install command is the default `npm install`.
- **Environment variables:** set in Vercel under Project Settings, Environment Variables. After changing any variable, redeploy from the Deployments tab so it takes effect.
- **Migration and seed:** run once from a local machine against the Neon database, by setting `DATABASE_URL` to the Neon connection string:

  ```bash
  npx prisma migrate deploy
  npm run db:seed
  ```

  Redeploying the app does not touch the database and does not re-seed it.
- **Cron:** configured in `vercel.json`. It calls `GET /api/cron/reminders` daily at 03:00 UTC (`0 3 * * *`). The endpoint requires `Authorization: Bearer <CRON_SECRET>`, which Vercel adds automatically when `CRON_SECRET` is set. The job runs both the reminder job and the risk-flag job.

---

## 5. Demo logins

The OTP for every account is **123456** (mock). It is also shown on screen in demo mode.

| Role | Phone | What it shows |
|---|---|---|
| Accounts executive | `9000000001` | Dashboard, ledger, refunds, queues |
| Accounts executive | `9000000002` | Same screens, Hindi preference |
| Parent | `9000000003` | Aarav Meena (STU-0412), fully paid |
| Parent | `9000000004` | Ishita Sharma (STU-0587), part paid, 23 days overdue |
| Parent | `9000000005` | Mohit Gurjar (STU-0219), due in 13 days |

On first parent login, tick the consent checkbox to continue. All names and phone numbers are fake.

### What to try

1. **Parent pays:** log in as `9000000004`, tap **Pay now**, choose Success in the test gateway, and open the receipt (GST split is shown).
2. **Reminders stop on payment:** log in as `9000000001`, go to Queues, Reminders, and click **Run reminders now**. The instalment just paid gets no reminder. Run it again and no duplicates appear.
3. **Unmatched payment:** in Queues, Unmatched payments, click **Simulate unmatched payment**, then assign it to an instalment.
4. **Refund:** go to Refunds, pick a student and an exit date, review the step-by-step breakdown and payout deadline, then approve. The student becomes exited and their reminders are cancelled.
5. **Risk flag:** go to Queues, Counsellor tasks, click **Run risk check**, open a flag to see the score, reasons and the note labelled "AI-generated, check before use", then mark one as a false flag.
6. **Language:** use the Hindi / English toggle on any screen.

---

## 6. Known limits

- OTP, payment gateway and SMS are mocked. Reminders are saved as "sent" without real delivery.
- The AI note falls back to a template if Groq is unavailable, slow (5 second timeout) or returns empty text. Template notes are labelled "Auto summary".
- The risk score is a transparent weighted rule, not a trained model. The AI only writes the note and never decides who is flagged.
- The OTP rate limiter is in memory and resets on a cold start.
- The dashboard computes rows in memory, which is fine for the demo data and would need SQL aggregation at 2,600 students.
- Refund status only reaches "approved". There is no payout tracking.
- Hindi coverage is partial on the login screen and a few accounts labels.
- Cut for time: real SMS and gateway, Tally export, bulk attendance and test-score upload, director view, offline support.