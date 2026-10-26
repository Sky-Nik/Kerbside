# Uber Logbook App — Design

Date: 2026-10-26
Status: Validated design, ready for implementation planning

## Purpose

A phone-first app for Australian rideshare (Uber X) and food delivery (Uber Eats) drivers to record earnings, expenses, trips and car costs, and to produce the figures needed to lodge BAS and the annual tax return themselves.

First user: a driver currently doing Uber Eats, about to start Uber X, holding an ABN and registering for GST before the first Uber X trip. They lodge their own BAS and tax return via myGov.

Distribution: Android APK shared with friends first. Play Store and App Store later, if it proves useful.

## Tax background (verify rates on ato.gov.au before lodging)

- Rideshare drivers must be registered for GST from the first trip, regardless of income. Once registered, GST also applies to food delivery income. Delivery-only drivers register at $75,000.
- GST registration means lodging BAS (quarterly or annually).
- Car expenses: cents-per-km (88c/km for 2025–26, capped at 5,000 km) or logbook method. The logbook method is the default for this app: a continuous 12-week logbook gives a business-use %, valid for 5 years unless the driving pattern changes substantially.
- GST credits on car costs are apportioned by the same business-use %.
- Records must be kept for 5 years.
- Uber reports driver earnings to the ATO under the sharing economy reporting regime.
- Australia has no separate GST number: the ABN is the GST identifier.

## Scope

In v1:
- Multi-user accounts (each user sees only their own data)
- Vehicles of any ownership type: owned outright, financed, leased, rented
- Weekly shift plan with local reminders to log odometer readings
- Trip logbook by odometer readings, tagged Uber X, Uber Eats or Personal
- Weekly earnings entered manually, with screenshot attached as evidence
- Expenses with receipt photos, including recurring expenses (e.g. monthly insurance)
- Dashboard: km, earnings and car costs by week, month and tax year
- Reports: BAS quarter (G1, 1A, 1B) and tax year, exported as PDF or CSV
- Documents vault for lodged returns, BAS, notices of assessment, ATO letters
- Offline-first with background sync

Out of v1: web app, iOS build, GPS tracking, AI receipt reading, Uber statement import.

## 1. Architecture

Approach: Expo (React Native, TypeScript) + Supabase.

Chosen over a PWA (iOS cannot reliably schedule local notifications, and shift reminders are core) and Flutter + Firebase (relational tax aggregation suits Postgres better than Firestore).

**Mobile app (Expo), Android APK first**
- Tabs: Home (dashboard) · Logbook · Money · Reports · Documents · Settings
- Local SQLite database: every write lands here first, so logging works with no signal
- Sync engine: pushes local changes to Supabase when online, pulls on fresh login
- Local scheduled notifications for shift reminders (no server needed)
- Camera and gallery for photos; compressed, stored locally, then uploaded

**Backend (Supabase)**
- Auth: email and password or magic link
- Postgres with Row-Level Security on every table
- Private storage bucket, one folder per user, served through short-lived signed URLs

**Reports** are computed in the app from local data and exported as PDF or CSV.

**Distribution:** EAS Build `preview` profile produces an `.apk` for sideloading. A `production` profile later targets the stores.

## 2. Data model

Money is stored as integer cents. GST is stored explicitly on every money row. Tax year runs 1 July to 30 June. Every table has `id`, `user_id`, `created_at`, `updated_at`, `deleted_at` (soft delete).

**profile**
- legal_name, trading_name
- abn
- gst_registered (bool), gst_registered_from (date, nullable)
- bas_frequency (`quarterly` | `annual`)

ABN and GST status appear in the header of every report, e.g. "ABN 12 345 678 901 · GST registered from 1 Dec 2026".

**shift_plan**: weekday, start_time, end_time (several rows per day allowed)

**day_status**: date, status (`off_road`). Silences that day's reminders.

**vehicle**
- name, rego
- ownership_type (`owned` | `financed` | `leased` | `rented`)
- purchase_date, purchase_price_cents (for depreciation; nullable for rented)
- active_from, active_to

**logbook_period**: vehicle_id, start_date, end_date (≥ 12 weeks), business_pct (locked when the period is finished)

**trip**
- vehicle_id
- purpose (`uber_x` | `uber_eats` | `personal`)
- start_at, start_odometer, end_at, end_odometer
- note

Odometer gaps are derived, not stored: if a trip's start odometer exceeds the previous trip's end odometer, the app warns about unlogged km and offers to record the gap as a personal trip.

**earning**
- platform (`uber_x` | `uber_eats`)
- week_start
- gross_fares_cents, tips_cents, incentives_cents
- service_fee_cents, tolls_reimbursed_cents
- gst_cents (pre-filled as 1/11 of the taxable amount when GST-registered on that date; editable)

**expense**
- date, vehicle_id (nullable)
- category (`fuel` | `toll` | `insurance` | `rego` | `service` | `tyres` | `cleaning` | `phone` | `rental` | `lease` | `loan_interest` | `parking` | `other`)
- amount_cents (incl. GST), gst_cents
- business_rule (`vehicle_pct` | `full` | `custom`), custom_pct
- recurring_expense_id (nullable)

**recurring_expense**
- vehicle_id, category, amount_cents, gst_cents
- frequency (`weekly` | `monthly` | `yearly`), start_date, end_date
- Generates expense rows on each due date. Individual occurrences can be edited or skipped; amount changes apply from a chosen date.

**attachment**: entity_type (`earning` | `expense`), entity_id, storage_path

**document**
- tax_year
- type (`tax_return` | `bas` | `notice_of_assessment` | `ato_letter` | `abn_gst` | `other`)
- title, date, storage_path

### Derived figures

- Business % = business km ÷ total km over the logbook period
- Deductible amount = (amount − GST) × business %
- GST credit = GST × business %, only when the expense date ≥ `gst_registered_from`
- BAS for a quarter:
  - G1 total sales = gross earnings incl. GST in the quarter
  - 1A GST on sales = sum of earning GST
  - 1B GST on purchases = sum of apportioned GST credits

## 3. Screens and flows

**First run:** sign up → profile (name, ABN, GST status and date, BAS frequency) → add car and current odometer → weekly shift plan → done.

**Home**
- Trip card (always on top): next shift, **Start trip** (pick purpose, enter odometer) / **End trip** (enter odometer), unlogged-km warning, **Not on road today** toggle.
- Dashboard with a **Week · Month · Tax year** switch:
  - Km: business vs personal, split bar, business %
  - Earnings: total, Uber X vs Uber Eats, change vs previous period
  - Car costs by category, with a fuel trend line
  - Net (earnings − expenses) and estimated GST owed for the current BAS quarter

**Logbook**: trips by day, colour-coded by purpose, tap to edit. Logbook period progress ("Week 7 of 12 · business 82% so far").

**Money**
- Earnings: weekly cards per platform; add form with optional screenshot.
- Expenses: list filterable by category; add flow = photo → amount → GST (auto 1/11, editable) → category → business rule. Recurring expenses managed here.

**Reports**
- Period picker: BAS quarter or tax year.
- BAS view laid out as myGov asks (G1, 1A, 1B).
- Tax year view: income by platform, deductions by category, car expense summary.
- Export PDF (summary + logbook) or CSV, optionally with receipt photos.

**Documents**: grouped by tax year, searchable, open and share from the app.

**Settings**: profile, cars, shift plan, reminder times, recurring expenses, sync status, export everything, account.

## 4. Error handling and sync

**Validation**
- End odometer < start, or a single trip > 1,500 km: warn and confirm.
- Overlapping trips on the same vehicle: blocked.
- GST must not exceed 1/11 of the amount. When not GST-registered on that date, GST is hidden and stored as 0.
- Expense dated before the vehicle's `active_from`: warn.

**Offline and sync**
- All writes go to SQLite first. A queue pushes to Supabase when online, with retry and backoff.
- Unsynced change count is shown as a badge on Settings.
- Photos upload separately and resume after interruption; the local copy is removed only after upload is confirmed.
- Conflict policy: last write wins per record (single editor per account).
- Soft deletes sync correctly and allow 30-day undo.

**Notifications**
- Rescheduled when the shift plan or day status changes, and on every app start (Android can drop alarms after a reboot).
- If permission is denied, Home shows a banner explaining that reminders are off.

**Data safety**
- RLS on every table restricts rows to `auth.uid() = user_id`.
- Per-user storage paths, signed URLs only.
- "Export everything" produces CSVs plus a zip of photos.

## 5. Testing

- Unit tests for tax maths: business %, GST pre-fill, deductible amounts, BAS G1/1A/1B, odometer gap detection, recurring expense generation, tax-year and quarter boundaries (30 June / 1 July), pre- and post-GST-registration dates.
- One RLS test: user B cannot read user A's rows.
- Manual checklist before each shared APK: offline trip logging, reminder fires, photo upload completes, report exports.

## Later (not v1)

- iOS build and web app from the same codebase
- Play Store and App Store releases
- AI extraction of amounts from screenshots and receipts
- Uber statement import
- Optional GPS distance fill-in
