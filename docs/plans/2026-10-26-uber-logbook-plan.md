# Uber Logbook App — Implementation Plan

Date: 2026-10-26
Design: [2026-10-26-uber-logbook-design.md](2026-10-26-uber-logbook-design.md)

Each phase ends with something you can install on your phone and use. Ship an APK to yourself after every phase; share with friends after Phase 6.

## Before we start (you)

- Node.js LTS installed on the laptop
- Free accounts: [Supabase](https://supabase.com) (one project, Sydney region) and [Expo](https://expo.dev) (for EAS Build)
- Android phone with "Install unknown apps" allowed for your browser or file manager
- During development: the Expo Go app is not enough (notifications and SQLite need a dev build), so we install a development APK built with EAS

## Stack and libraries

Pin exact versions at setup time to the then-current Expo SDK.

| Need | Library |
|---|---|
| App framework, routing | `expo`, `expo-router`, TypeScript |
| Local database | `expo-sqlite` (plain SQL, no ORM) |
| Backend client | `@supabase/supabase-js` |
| Notifications | `expo-notifications` |
| Photos | `expo-image-picker`, `expo-image-manipulator` (compress) |
| Files | `expo-file-system`, `expo-document-picker` |
| PDF export, sharing | `expo-print`, `expo-sharing` |
| Tests | `jest-expo` |

No UI kit in v1: React Native core components plus one small theme file. Charts are simple bars drawn with `View`s; add a chart library only if that falls short.

## Project layout

```
app/                    expo-router screens
  (auth)/               sign-in, sign-up
  (onboarding)/         profile, vehicle, shift plan
  (tabs)/               index (home), logbook, money, reports, documents, settings
src/
  db/                   schema.sql, migrations, queries per table
  sync/                 push/pull queue, photo uploader
  tax/                  pure functions: business %, GST, BAS, deductions, tax year
  notifications/        schedule from shift plan
  export/               PDF and CSV builders
  components/           shared UI
supabase/
  migrations/           SQL for tables, RLS, storage policies
```

`src/tax/` has no React or database imports, so it is trivially unit-testable.

---

## Phase 0 — Skeleton and APK pipeline

Goal: an empty app installs on your phone from an APK.

1. `npx create-expo-app` with TypeScript and expo-router; add the tab layout with six empty screens.
2. `eas.json` with `development` (dev client APK) and `preview` (`buildType: apk`) profiles.
3. Build the development APK, install it, confirm hot reload from the laptop.
4. `jest-expo` set up with one passing placeholder test.

Done when: the dev APK runs on your phone showing six tabs.

## Phase 1 — Tax maths (test first)

Goal: every number the app reports is computed by tested pure functions, before any UI depends on them.

`src/tax/`:
- `taxYear(date)` → e.g. `"2026-27"`; `basQuarter(date)` → `{ start, end, label }` (Jul–Sep, Oct–Dec, Jan–Mar, Apr–Jun)
- `gstFromInclusive(cents)` → `round(cents / 11)`
- `isGstActive(date, profile)`
- `businessPct(trips, period)` → business km ÷ total km
- `odometerGaps(trips)` → list of `{ afterTripId, fromKm, toKm }`
- `deductible(expense, vehiclePct)` and `gstCredit(expense, vehiclePct, profile)`
- `basSummary(earnings, expenses, quarter, profile, pcts)` → `{ G1, A1, B1 }`
- `expandRecurring(recurring, upTo)` → occurrence dates

Tests cover: 30 June / 1 July boundaries, quarter boundaries, expenses before vs after GST registration date, 100% / vehicle % / custom % rules, rounding to the cent, zero-km periods, overlapping and out-of-order trips.

Done when: `npm test` passes and covers each function.

## Phase 2 — Local database and onboarding

Goal: the app works fully offline for one user, no backend yet.

1. `src/db/schema.sql` with every table from the design (cents as INTEGER, ids as UUID text, `updated_at`, `deleted_at`, `synced_at`).
2. Simple migration runner keyed on `PRAGMA user_version`.
3. Query modules per table (insert, update, soft delete, list).
4. Onboarding screens: profile (name, ABN with 11-digit checksum validation, GST registered + date, BAS frequency) → vehicle (ownership type, current odometer) → shift plan.
5. Settings screens to edit profile, vehicles and shift plan.

Done when: you can complete onboarding, kill the app, reopen it, and the data is still there.

## Phase 3 — Logbook and reminders

Goal: you can start using it on real shifts.

1. Home trip card: Start trip (purpose, odometer, prefilled with last end odometer) → End trip.
2. Validation: end < start, > 1,500 km, overlap on the same vehicle.
3. Odometer gap warning with "log as personal trip" action.
4. Logbook tab: trips grouped by day, edit and delete, logbook period progress.
5. Logbook periods: create, auto-suggest end at 12 weeks, lock business %.
6. Notifications: schedule start/end reminders from the shift plan for the next 14 days; reschedule on plan change, day status change and app start. "Not on road today" toggle. Permission-denied banner.

Done when: a reminder fires at shift start on your phone, you log a trip offline, and the logbook shows the business %.

## Phase 4 — Money: earnings, expenses, recurring, photos

1. Earnings: weekly form per platform; GST prefilled when registered on that week; attach screenshot.
2. Expenses: photo → amount → GST (auto, editable, hidden when not registered) → category → business rule; list with category filter.
3. Photos: pick or capture, compress to ~1600 px JPEG, store under the app's document directory, create `attachment` row.
4. Recurring expenses: create/edit/end; on app start, generate due occurrences up to today (idempotent: one row per recurring id + due date).

Done when: you can log a week of earnings, a fuel receipt with photo, and set monthly insurance that appears automatically.

## Phase 5 — Dashboard and reports

1. Home dashboard with Week / Month / Tax year switch: km split, earnings by platform with change vs previous period, costs by category, fuel trend, net, estimated GST for the current quarter.
2. Reports tab: BAS quarter view (G1, 1A, 1B) and tax-year view (income by platform, deductions by category, car expense summary). Header shows legal name, ABN and GST registration date.
3. Export: PDF via `expo-print` (summary + logbook table), CSV per table, shared via `expo-sharing`. Option to zip receipt photos.

Done when: the BAS numbers on screen match a hand calculation for a test quarter, and the PDF opens on the phone.

## Phase 6 — Accounts, sync and cloud storage

Goal: data survives a lost phone; friends can use their own accounts.

1. `supabase/migrations/`: same tables as local, `user_id uuid references auth.users`, RLS `auth.uid() = user_id` on every table for select/insert/update/delete.
2. Storage bucket `files` (private), policy restricting paths to `{auth.uid()}/...`.
3. Auth screens: email + password sign-up/sign-in, sign-out. Local DB is scoped per signed-in user.
4. Sync engine:
   - Push: rows with `updated_at > synced_at` upserted in batches; retry with backoff.
   - Pull: on sign-in on a new phone, download all rows; afterwards pull rows with `updated_at` newer than last pull.
   - Last write wins on `updated_at`.
   - Photos: separate upload queue, resumable; mark uploaded, then allow local cleanup.
5. Unsynced badge on Settings; "Sync now" button.
6. RLS test: script signs in as user B and asserts user A's rows return empty.

Done when: you log data offline, go online, sign in on a second phone, and see everything including photos. RLS test passes.

## Phase 7 — Documents vault and export everything

1. Documents tab: upload PDF or photo, pick tax year and type, title; list grouped by year; search by title; open and share.
2. Settings → Export everything: all CSVs + photos + documents as one zip.
3. 30-day undo for deleted items (Settings → Recently deleted).

Done when: you upload last year's notice of assessment and find it again in under 10 seconds.

## Phase 8 — Share with friends

1. App icon, name, splash screen.
2. `preview` APK build via EAS; share link.
3. Manual checklist on a clean phone: sign up, onboarding, reminder fires, offline trip, photo uploads, report exports, sign in on second phone.
4. Short "how to install" note for friends (allow unknown apps, open APK).

Done when: one friend installs it and logs a week without your help.

---

## Out of scope until v1 is proven

iOS build, web app, store publishing, AI receipt reading, Uber statement import, GPS distance. The design keeps room for each; none needs restructuring.
