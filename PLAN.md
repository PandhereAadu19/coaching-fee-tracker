Case 1 – Coaching Fee Tracker & Parent Portal: Complete Build Plan
Prepared 7 Nov 2026. Deadline: 9 Nov 2026, 11:59 pm. Solo build, about 2 days of effort.
1. Goal and strategy
Goal: ship one slice end to end that works on realistic data, looks designed, and that you can explain in the interview. Do not build the whole brief.
Strategy for the time limit
• Build only the Core Build: fee ledger, parent portal with dues and pay link, reminders that stop on payment, refund calculator, dues dashboard, dropout-risk flag.
• Keep all business logic in plain TypeScript files (lib/) with tests. This is the part reviewers probe.
• Mock everything external (OTP, payment gateway, SMS). The one live external call is Groq, which writes the counsellor note and has a template fallback. Say so clearly in the UI and docs.
• Cut anything that is not on the Core Build list, and write the cuts honestly in the TDD.
• Submit by 9 Nov, 8 pm and treat the last hours as buffer. You can resubmit until the deadline.
Scoring reminder: Quality of work 50%, Problem solving 30%, Communication 20%. Communication means the TDD, deployment.md and your video, so reserve real time for them.
2. What the client needs (short)
Jaipur coaching institute, 4 centres, 2,600 students, average fee ₹1.2 lakh a year in 3 or 4 instalments. Today: staff phone parents, parents phone for balances, refunds are calculated by hand. Quoted loss: ₹79.2 lakh a year.
The system must:
1. Let parents see what they owe and when, without calling.
2. Send reminders automatically and stop the moment someone pays.
3. Give accounts one view of dues across centres and batches.
4. Calculate refunds by a written policy, pro-rata, payable within 10 days.
Constraints to respect: low-end phones, Hindi and English, receipts show GST, parental consent (DPDP Act 2023, most students are minors), a published refund policy, parent screen understood in five seconds (amount, due date, pay button).
3. Users and roles
Role
Device
Can do
Parent
Low-end phone mostly, desktop also supported
OTP login, see own child's dues, pay (mock), view receipts
Accounts executive
Desktop
Dashboard, ledger, refunds, queues (reminders, unmatched payments, counsellor tasks)
The founder is the buyer, not a user. A parent can see only their own child's data. Accounts cannot use parent screens, and parents cannot open any accounts URL or API.
4. Tech stack
Layer
Choice
Why
Framework
Next.js (App Router) + TypeScript
One codebase for UI and API, easy deploy
Styling
Tailwind CSS
Fast, consistent, restrained design
Database
PostgreSQL on Neon (free tier)
Hosted, real relational DB
ORM
Prisma
Typed schema, migrations, seeding
Auth
Custom OTP, signed JWT in an httpOnly cookie (jose), role claim
Simple and fully explainable
Validation
Zod on every API input
Meets the validated-inputs requirement
i18n
en.json and hi.json dictionaries plus toggle
Faster than a library
Tests
Vitest
Unit tests on core logic
PWA
manifest.webmanifest + icons
Installable, per the brief
Jobs
Protected /api/cron/reminders + Vercel Cron + a "Run now" button
Reviewer can trigger it
Fonts
Inter + Noto Sans Devanagari, self-hosted via next/font
Hindi support, light page weight
Deploy
Vercel + Neon
Live in minutes
AI assistant
Claude / Copilot for scaffolding
Allowed and encouraged. Write the rules and tests yourself so you can defend them
Product AI (risk note)
Groq free tier, OpenAI-compatible API, model set by GROQ_MODEL (start with llama-3.1-8b-instant)
Free, no card, fast. Writes text only and never decides. Free limits change, so check console.groq.com before you build
Environment variables (names only): DATABASE_URL, SESSION_SECRET, CRON_SECRET, DEMO_TODAY (optional), MOCK_OTP (optional, default 123456), GROQ_API_KEY (needed for the AI note), GROQ_MODEL (optional, default llama-3.1-8b-instant).
5. Folder structure
/app
  /(auth)/login
  /(parent)/home, /pay/[id], /receipts, /receipts/[id]
  /(accounts)/dashboard, /students/[id], /refunds, /queues
  /api/auth/*, /api/pay/*, /api/refunds/*, /api/cron/reminders, /api/flags/*
/lib
  instalments.ts   status and days overdue
  money.ts         paise helpers, GST split
  refund.ts        refund calculation
  reminders.ts     which reminders are due, cancel on payment
  risk.ts          dropout-risk score
  llm.ts           Groq note with template fallback
  auth.ts          session sign and verify, role guard
  i18n.ts
/prisma/schema.prisma, seed.ts
/tests/*.test.ts
/public/manifest.webmanifest, icons
.env.example, README.md, deployment.md
6. Data model
Store all money as integer paise to avoid rounding bugs.
• Centre (id, name)
• Batch (id, centreId, name, startDate, endDate)
• User (id, role, phone, name, language, consentAt)
• Student (id, code, name, batchId, parentUserId, status, exitDate)
• FeePlan (id, studentId, totalFee, discount, gstRate)
• Instalment (id, planId, seq, dueDate, amount)
• Payment (id, instalmentId nullable, amount, method, reference, status, paidAt)
• Receipt (id, paymentId, number, baseAmount, gstAmount, total)
• Reminder (id, instalmentId, scheduledFor, language, message, status: pending / sent / cancelled)
• Refund (id, studentId, amount, breakdownJson, requestedAt, payBy, status)
• Attendance (studentId, month, percent) and TestScore (studentId, testName, date, score), seeded
• RiskFlag (id, studentId, score, reasonsJson, aiNote, aiNoteSource (llm or template), status: open / false_flag / actioned, createdAt)
• CounsellorTask (id, flagId, status, note)
• OtpCode (phone, codeHash, expiresAt, attempts)
Instalment status is derived, never stored: paid if paid ≥ amount; part_paid if 0 < paid < amount; overdue if due date passed and unpaid or part paid; due if due within 7 days; otherwise upcoming. Days overdue = today − due date while unpaid.
7. Business rules (all are ASSUMPTIONS, label them in the TDD)
The brief gives no exact numbers, so you choose and defend them.
1. GST: 18%, instalment amounts treated as GST-inclusive. Receipt shows base = amount / 1.18, GST = amount − base, total.
2. Reminder schedule: 3 days before, on the due date, then 3, 7 and 14 days after. Language follows the parent's preference.
3. Refund policy (published text must be shown on the refund screen):
    ◦ Admin fee = 5% of net course fee, capped at ₹5,000.
    ◦ Fraction elapsed = days attended ÷ total course days, based on exit request date.
    ◦ Exit within the first 7 days: no tuition deduction, admin fee only.
    ◦ Refund = fees paid − (net fee × fraction elapsed) − admin fee, floored at 0.
    ◦ Payout deadline = request date + 10 days.
4. Risk score (0 to 100): 40% missed or late instalments, 30% attendance drop, 30% test-score trend. Flag at 60 or above. This is a transparent weighted rule, not a trained model. Say so. The score alone decides who is flagged. A Groq LLM only writes a short counsellor note about the flag (see workflow E).
5. Consent: checkbox at first login ("I am the parent or guardian and consent to processing of my child's data") with stored timestamp. Login blocked until accepted.
6. Demo date: the sample data implies today is about 2 Nov 2026. Use a DEMO_TODAY setting, or seed dates relative to now, so "23 days overdue" and "due in 13 days" stay true.
7. Mock OTP: fixed code 123456 shown on screen in demo mode. Real SMS is cut.
8. Screens (8 plus login)
Parent (mobile first)
1. Login: phone, OTP, consent checkbox (first time).
2. Home: next due amount, due date, one big Pay now button. Below, a short instalment list with status chips.
3. Mock payment: fake gateway with Success, Fail and Cancel. Marked clearly as test mode.
4. Receipts: list, plus a printable receipt with GST breakdown.
Accounts (desktop)
5. Dues dashboard: filters for centre, batch and ageing only. Buckets: not due, 1–30, 31–60, 60+ days. Overdue amount is the strongest visual.
6. Student ledger: plan, instalments, discounts, payments, balance, days overdue, risk badge.
7. Refund calculator: pick student and exit date, see each step, policy text, payout deadline, approve.
8. Queues (3 tabs): Reminder log with Run-now button, Unmatched payments, Counsellor tasks, each showing the flag score, its reasons, the AI-written note labelled "AI-generated, check before use", and a false-flag button.
Every screen gets a Hindi / English toggle, plus loading, empty and error states.
Responsive layout (one app, fully responsive): parent screens are fully responsive. On a phone (360 px) they are a single column. On a desktop they use the extra width, for example the dues summary beside the instalment list, and receipts at a readable width, built from the same components. Accounts screens are designed desktop-first with wide tables that scroll sideways on a phone or tablet. Use Tailwind breakpoints (base, md at 768 px, lg at 1024 px) and test both roles at 360 px, 768 px and 1280 px.
9. Core workflows
A. Parent pays. Pay now → mock gateway → Success → server (in one DB transaction) creates a Payment, updates the instalment, creates the Receipt, and sets pending Reminders for that instalment to cancelled. Double clicks must not create two payments (use an idempotency key).
B. Reminders stop on payment. The job finds unpaid instalments whose schedule date has arrived, creates a reminder, and re-checks payment status at send time before marking sent (simulated). If paid, status becomes cancelled. Running the job twice must not send duplicates.
C. Unmatched payments. A "simulate payment with unknown reference" button creates a Payment with no instalment. It lands in the accounts queue. It never marks anything paid. An executive assigns it manually to an instalment.
D. Refund. Select student and exit date → calculator shows breakdown → approve → Refund saved with payBy = request + 10 days. Student status becomes exited and future reminders are cancelled.
E. Dropout-risk flag. Score computed from the three signals. At 60 or above, create a RiskFlag and a CounsellorTask. It never messages parents or touches fees. The counsellor can mark false flag, which is stored. The flag does not reappear unless the score rises by a set margin (assumption: +15 points) or new missed instalment evidence appears. AI note: once a flag is created, the server sends only anonymised signals (counts, percentages, score trend; no name, phone or batch) to Groq with a 5 second timeout and asks for a short note: why the student was flagged and two questions for the call. The note is saved on the flag and never regenerated on page load. If Groq errors, times out or returns empty text, a fixed template note built from the same signals is saved instead and marked as template. The counsellor always sees the note labelled "AI-generated, check before use".
10. Seed data
An empty app is a listed common mistake, so seed around 40 students.
• 2 centres minimum (aim for 3), 4 batches (JEE 2027 Morning / Evening, NEET 2027 Morning / Evening).
• The 3 sample students exactly as given: Aarav Meena (paid), Ishita Sharma (part paid, 23 days overdue), Mohit Gurjar (due in 13 days).
• About 37 more with a realistic spread: fully paid, part paid, overdue 1–30, 31–60 and 60+ days, upcoming.
• 3 to 4 students with falling attendance and test scores so the risk flag has real cases. Include one false-flag example.
• Attendance and test scores for each student for the last 3 months.
• 1 parent user per student (siblings optional), 2 accounts users, a few sample receipts and reminders.
• Use fake names and fake phone numbers (for example 90000 00001 onward). No real personal data.
11. Security checklist
• No secrets in the repo. Commit only .env.example. Check git log before pushing publicly.
• Zod validation on every route handler and form.
• Role guard in middleware and inside every API route (do not rely on hidden buttons).
• Parents are scoped by parentUserId, so a parent changing an ID in the URL gets 403 or 404.
• OTP: hashed code, 5 minute expiry, max 5 attempts, rate limit per phone.
• Cookies: httpOnly, secure, sameSite=lax. Cron endpoint requires CRON_SECRET.
• Mask phone numbers in accounts tables where not needed (DPDP point). Keep GROQ_API_KEY only in environment variables, and send the model only anonymised signals.
12. Tests (Vitest, priority order)
1. instalments: status for each state, days overdue, part payment, exact due date boundary.
2. refund: first-week exit, mid-course exit, exit after course end, admin fee cap, floor at zero, partial payment, 10-day deadline.
3. reminders: correct dates, language choice, cancelled when paid, no duplicates on second run, nothing for exited students.
4. risk: score weights, threshold, false flag suppression, and the Groq fallback (call mocked to fail or time out returns the template note; the prompt payload contains no name or phone).
5. money: GST split rounds correctly and base + GST = total.
6. auth guard: parent cannot access another student, parent cannot call accounts routes.
Aim for 30 to 40 test cases total, focused on logic. Do not spend time on UI tests.
13. Design direction
• White background, one accent colour (for example deep teal or indigo), red used only for overdue.
• One typeface family, Inter plus Noto Sans Devanagari. Generous white space.
• Parent home shows only three things: amount, due date, Pay now. Nothing else competes.
• Tap targets at least 48 px, body text at least 16 px.
• Accounts: simple tables, overdue amounts bold and red, three filters only, sticky header.
• Light page weight for slow 3G: no heavy images, no big libraries, server-render the parent home, aim for first load under 3 seconds.
• Skeleton loaders, friendly empty states, plain-language error messages with a retry.
• Check parent screens at 360 px and about 1280 px, and accounts screens at about 1280 px, plus Chrome Lighthouse (mobile), before finishing.
14. Schedule
Tonight, 7 Nov (about 2 to 3 hours)
[ ] Create public GitHub repo, first commit, .gitignore with .env.
[ ] create-next-app (TypeScript, Tailwind, App Router). Add Prisma, Zod, jose, Vitest.
[ ] Create a free Groq key (console.groq.com) and a Neon database; set DATABASE_URL locally, write .env.example.
[ ] Write schema.prisma, run first migration.
[ ] Commit in small steps with clear messages (they read the history).
Day 1, Sunday 8 Nov (about 10 to 12 hours)
Block 1 (2.5 h): data and auth
[ ] Write seed.ts with the data from section 10. Run it, check in Prisma Studio.
[ ] Build mock OTP login, consent checkbox, session cookie, role guard, logout.
[ ] Commit.
Block 2 (3 h): core logic with tests
[ ] money.ts, instalments.ts, refund.ts, reminders.ts, risk.ts.
[ ] Vitest cases for each. All green before you build any UI that depends on them.
[ ] Commit after each module.
Block 3 (3 h): parent flow
[ ] Home screen with dues and Pay now.
[ ] Mock gateway page, payment API (transaction plus idempotency), receipt creation, reminder cancellation.
[ ] Receipts list and printable receipt with GST.
[ ] Manifest and icons (installable).
Block 4 (2.5 h): accounts flow, first pass
[ ] Dues dashboard with filters and ageing buckets.
[ ] Student ledger page with risk badge.
[ ] Commit and push. Checkpoint: parent can pay, accounts can see it update. If this works, you are on track.
Day 2, Monday 9 Nov (hard deadline 11:59 pm)
Block 5 (2 h): remaining features
[ ] Refund calculator screen and approval.
[ ] Queues screen: reminder log with Run-now, unmatched payments with assign, counsellor tasks with false-flag button.
[ ] Cron endpoint with secret. Then the Groq note: write lib/llm.ts with a 5 second timeout, cache the note on the flag, fall back to the template (about 1 hour).
Block 6 (2 h): polish
[ ] Hindi / English toggle on all screens, Hindi reminder text.
[ ] Loading, empty and error states everywhere. Remove any dead button.
[ ] Mobile check at 360 px, tap sizes, Lighthouse run.
Block 7 (1.5 h): deploy
[ ] Push to GitHub, import to Vercel, add env vars, run migration and seed against Neon.
[ ] Log in on the live site as parent and accounts. Walk through every flow once.
[ ] Fix anything broken. Do not add features after this point.
Block 8 (2.5 h): documents and video
[ ] Write deployment.md (section 15).
[ ] Write the TDD (section 16), export to PDF.
[ ] Record the walkthrough video (section 17) if required.
[ ] Zip the two files, check size under 25 MB, upload.
Final: target submission by 8 pm. Use the remaining time as buffer only.
Emergency cut order (if you fall behind)
Cut in this order and note each cut in the TDD:
1. Hindi on accounts screens (keep it on parent screens).
2. Unmatched-payments assign flow (keep the queue list).
3. Tally CSV export (it is optional anyway).
4. Lighthouse tuning. If still behind, drop the Groq note and ship the template note only, saying so in the TDD.
5. Never cut: parent pay flow, reminders stopping on payment, refund calculator, tests, deployment, TDD.
15. deployment.md contents
1. Prerequisites: Node version, a Postgres database (Neon).
2. Run locally: clone, npm install, copy .env.example to .env, fill values, npx prisma migrate dev, npx prisma db seed, npm run dev, open localhost:3000, npm test.
3. Environment variables (names only): DATABASE_URL, SESSION_SECRET, CRON_SECRET, DEMO_TODAY, MOCK_OTP, plus GROQ_API_KEY and GROQ_MODEL, each with a one-line purpose.
4. How it is deployed: Vercel plus Neon, build command, where env vars are set, how migration and seed were run, how cron is configured.
5. Demo logins: one parent phone, one accounts phone, mock OTP 123456, and a short list of what to try (Ishita pays, run reminders, refund for a student).
6. Known limits: mock OTP, mock gateway, simulated SMS, and the AI note falls back to a template if Groq is unavailable.
16. TDD structure (PDF or Word)
Put the GitHub URL at the top, then the live link.
1. Overview: problem, users, scope chosen.
2. Architecture and why: Next.js monolith, Postgres, why this suits a 2-day solo build and a 6-week client budget. Include a simple diagram.
3. Data model: ER diagram or table list, why money is in paise, why status is derived.
4. Main flows: pay, reminders, unmatched payment, refund, risk flag (short sequence descriptions).
5. How the AI / automation part works: reminders and payment matching are rule-based. The risk flag is a weighted score. State plainly that it is not a trained model. Describe the Groq note: it writes text only, receives anonymised signals, is cached on the flag, falls back to a template, and is labelled AI-generated. Explain what happens when it is wrong: only creates a counsellor task, never a parent message or fee action, false flags are recorded, unmatched payments go to a queue.
6. UI and design decisions: screenshots of key screens, five-second parent screen, restrained palette, mobile and 3G choices.
7. Security and privacy: the checklist from section 11, consent, masking.
8. Testing: what is covered and what is not.
9. Assumptions: every item from section 7 in a table, labelled as assumptions.
10. What I cut and what I would do next: real SMS and gateway, attendance and test bulk upload, Tally export, director view, offline support, a trained risk model once there is real data.
11. How I used AI tools: short and honest. Say what you wrote and decided yourself (rules, numbers, tests).
17. Video outline (about 3 to 5 minutes)
1. 20 s: problem and who it is for.
2. 60 s: parent logs in, sees dues, pays, gets receipt.
3. 40 s: reminders run, the paid instalment is skipped.
4. 60 s: accounts dashboard, ledger, refund calculator with breakdown.
5. 40 s: risk flag, counsellor task, mark as false flag.
6. 30 s: tests passing, architecture in one sentence, limits and next steps.
Record on the live site, not localhost. Rehearse once so you do not re-record.
18. Final submission checklist
[ ] Repo is public, commit history intact, no .env or secrets in any commit.
[ ] Live app opens and both demo logins work.
[ ] Every button does something. No dead links.
[ ] Tests pass (npm test).
[ ] Parent screen works at 360 px width.
[ ] deployment.md has local steps, env var names, deploy notes, demo logins.
[ ] TDD has the GitHub URL at the top, plus the live link.
[ ] Every assumption is labelled.
[ ] ZIP contains exactly two files, under 25 MB.
[ ] Submitted before the deadline, ideally by 8 pm on 9 Nov.
19. Interview prep (know these answers)
• Why Next.js and Postgres, and what you would change at 2,600 students.
• Why money is stored in paise and status is derived.
• Walk through the refund formula with a worked example.
• How reminders avoid duplicates and stop on payment.
• What the risk flag can get wrong and how the design limits the damage. Why the LLM only writes the note and never decides.
• How a parent is prevented from seeing another child's data.
• What you cut, and why that was the right cut.