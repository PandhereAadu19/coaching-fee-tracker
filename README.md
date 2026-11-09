# Coaching Fee Tracker & Parent Portal

A fee ledger, parent portal and accounts dashboard for a Jaipur coaching institute (JEE / NEET, about 2,600 students, average fee ₹1.2 lakh a year in 3 or 4 instalments).

- **Live app:** https://coaching-fee-tracker-kappa.vercel.app/
- **Docs:** see `deployment.md` (run, deploy, demo logins) and the Technical Design Document submitted with this project.

> This is a **demo build**. OTP, the payment gateway and SMS are mocked. The one live external call is Groq, which writes the counsellor note and falls back to a template if unavailable.

---

## What it does

**For parents (mobile first, English and Hindi)**
- OTP login with a parental-consent checkbox on first login (DPDP Act 2023).
- Home screen shows the next amount, due date and one **Pay now** button.
- Mock payment gateway (Success / Fail / Cancel) in clearly marked test mode.
- Receipts list and printable receipt with GST breakdown.

**For accounts staff (desktop first)**
- Dues dashboard with centre, batch and ageing filters (not due, 1-30, 31-60, 60+ days).
- Student ledger: plan, instalments, payments, balance, days overdue, risk badge.
- Refund calculator that follows the written policy, shows each step and the payout deadline.
- Queues: reminder log with "Run now", unmatched payments with manual assign, counsellor tasks with false-flag button.

**Automation**
- Reminders: 3 days before, on the due date, then 3, 7 and 14 days after. Language follows the parent's preference. They stop the moment an instalment is paid and never duplicate if the job runs twice.
- Dropout-risk flag: a transparent weighted score (not a trained model). It only creates a counsellor task. It never messages parents or touches fees.
- Unmatched payments go to an accounts queue instead of marking anything paid.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | Custom OTP, signed JWT (`jose`) in an httpOnly cookie, role claim |
| Validation | Zod on every API input |
| Tests | Vitest |
| AI note | Groq (OpenAI-compatible API) with template fallback |
| Hosting | Vercel + Vercel Cron |

---

## Quick start (local)

Prerequisites: Node.js 20 or newer, and a PostgreSQL database (a free Neon database works).

```bash
git clone https://github.com/PandhereAadu19/coaching-fee-tracker
cd coaching-fee-tracker
npm install
cp .env.example .env        # then fill in the values
npx prisma migrate dev
npm run db:seed
npm run dev                 # open http://localhost:3000
npm test
```

### Environment variables (names only)

| Name | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Signs the session JWT and hashes OTPs (at least 16 characters) |
| `CRON_SECRET` | Bearer token required by `/api/cron/reminders` |
| `DEMO_TODAY` | Demo clock, set to `2026-11-02` so the sample data stays true |
| `MOCK_OTP` | Fixed demo OTP (default `123456`) |
| `GROQ_API_KEY` | Enables the AI-written counsellor note (optional; template used if missing) |
| `GROQ_MODEL` | Groq model name (example: `llama-3.1-8b-instant`) |

---

## Demo logins

OTP for every account is `123456` (mock).

| Role | Phone | Notes |
|---|---|---|
| Accounts | `9000000001` | Full accounts screens |
| Parent | `9000000003` | Aarav Meena, fully paid |
| Parent | `9000000004` | Ishita Sharma, part paid, overdue |
| Parent | `9000000005` | Mohit Gurjar, due soon |

All names and phone numbers are fake.

**Things to try:** log in as Ishita's parent and pay; log in as accounts and click "Run reminders now" (the paid instalment is skipped); open the refund calculator for a student; run the risk check and mark a counsellor task as a false flag.

---

## Business rules (assumptions)

The brief gives no exact numbers, so these are my assumptions.

1. **Money** is stored as integer paise.
2. **GST** is 18%, and instalment amounts are GST-inclusive. Receipt shows base = amount / 1.18, GST = amount - base, and total.
3. **Instalment status is derived**, never stored: paid, part paid, overdue, due (within 7 days), upcoming.
4. **Refund:** admin fee is 5% of net fee, capped at ₹5,000. Tuition deduction is net fee x elapsed days / total course days (no deduction if the exit is within the first 7 days). Refund = fees paid - tuition deduction - admin fee, never below 0. Payout deadline is request date + 10 days.
5. **Risk score** (0-100): 40% missed or late instalments, 30% attendance drop, 30% test-score trend. Flag at 60 or above. A false flag is suppressed unless the score rises by 15 points or a new overdue instalment appears.
6. **Consent:** login is blocked until the parent accepts the consent checkbox, and the timestamp is stored.

---

## Project structure

```
app/
  (parent)/      home, pay/[instalmentId], receipts
  (accounts)/    dashboard, students/[id], refunds, queues
  api/           auth, pay, refunds, payments, reminders, flags, cron
  login/
components/      forms, action buttons, ui primitives
lib/             business logic (money, instalments, refund, reminders, risk, llm, auth, i18n)
messages/        en.json, hi.json
prisma/          schema.prisma, seed.ts, migrations
tests/           Vitest unit tests
public/          PWA manifest and icons
proxy.ts         role-based routing
```

All business rules live in plain TypeScript files in `lib/` with unit tests. Route handlers are thin wrappers around them.

---

## Security and privacy

- No secrets in the repository. Only `.env.example` is committed.
- Zod validation on every API input.
- Role checks in `proxy.ts` and again inside every API route and page.
- Parents are scoped by `parentUserId`. Changing an ID in the URL returns 404.
- OTP is hashed, expires in 5 minutes, allows 5 attempts and is rate limited per phone.
- Cookies are httpOnly, sameSite=lax, and secure in production.
- The cron endpoint requires `CRON_SECRET`.
- Phone numbers are masked in accounts tables.
- Groq receives only anonymised numbers (no name, phone or batch).

---

## Tests

```bash
npm test
```

About 139 Vitest cases covering instalment status, refund maths, reminders (dates, language, dedupe, cancel on payment), risk scoring, the Groq fallback, GST rounding and access control. The tests are DB-free. Route handlers and database transactions are not covered by automated tests.

---

## Deployment

Deployed on Vercel with a Neon PostgreSQL database. Pushing to the production branch triggers a new deployment. The daily cron (`vercel.json`, 03:00 UTC) calls `/api/cron/reminders` with the `CRON_SECRET` bearer token. Full steps are in `deployment.md`.

---

## Known limits and next steps

**Limits:** mock OTP, mock gateway, simulated SMS; OTP rate limiter is in memory; dashboard computes rows in memory (fine for demo data, needs SQL aggregation at 2,600 students); refund status only reaches "approved" (no payout tracking); no offline support; Hindi coverage is partial on the login screen and a few accounts labels; Tally export and bulk attendance upload were cut.

**Next:** real SMS and payment gateway behind the same code seams, Redis or database rate limiting, SQL aggregation for the dashboard, refund payout lifecycle, bulk CSV upload, Tally export, director view, and a trained risk model once real data exists.