import type { SQLiteDatabase } from 'expo-sqlite';

// Every synced table carries these. Money is INTEGER cents, dates are 'YYYY-MM-DD' TEXT,
// timestamps are ISO TEXT. No user_id locally: the database file belongs to one user.
const META = `
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  synced_at TEXT`;

// Append only. Each entry runs once, in order, tracked by PRAGMA user_version.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE profile (
    id TEXT PRIMARY KEY NOT NULL,
    legal_name TEXT NOT NULL,
    trading_name TEXT,
    abn TEXT,
    gst_registered_from TEXT,
    bas_frequency TEXT NOT NULL DEFAULT 'quarterly',
    onboarded INTEGER NOT NULL DEFAULT 0,${META}
  );

  CREATE TABLE shift_plan (
    id TEXT PRIMARY KEY NOT NULL,
    weekday INTEGER NOT NULL,   -- 1 = Monday ... 7 = Sunday
    start_time TEXT NOT NULL,   -- 'HH:MM'
    end_time TEXT NOT NULL,${META}
  );

  CREATE TABLE day_status (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,       -- 'off_road'
    ${META.trim()}
  );

  CREATE TABLE vehicle (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    rego TEXT,
    ownership_type TEXT NOT NULL, -- owned | financed | leased | rented
    start_odometer INTEGER NOT NULL,
    purchase_date TEXT,
    purchase_price_cents INTEGER,
    active_from TEXT NOT NULL,
    active_to TEXT,${META}
  );

  CREATE TABLE logbook_period (
    id TEXT PRIMARY KEY NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES vehicle(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    business_pct REAL,          -- set when the period is locked
    ${META.trim()}
  );

  CREATE TABLE trip (
    id TEXT PRIMARY KEY NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES vehicle(id),
    purpose TEXT NOT NULL,      -- uber_x | uber_eats | personal
    date TEXT NOT NULL,
    start_at TEXT NOT NULL,
    start_odometer INTEGER NOT NULL,
    end_at TEXT,
    end_odometer INTEGER,
    note TEXT,${META}
  );

  CREATE TABLE earning (
    id TEXT PRIMARY KEY NOT NULL,
    platform TEXT NOT NULL,     -- uber_x | uber_eats
    week_start TEXT NOT NULL,
    gross_fares_cents INTEGER NOT NULL DEFAULT 0,
    tips_cents INTEGER NOT NULL DEFAULT 0,
    incentives_cents INTEGER NOT NULL DEFAULT 0,
    tolls_reimbursed_cents INTEGER NOT NULL DEFAULT 0,
    service_fee_cents INTEGER NOT NULL DEFAULT 0,
    gst_cents INTEGER NOT NULL DEFAULT 0,
    note TEXT,${META}
  );

  CREATE TABLE recurring_expense (
    id TEXT PRIMARY KEY NOT NULL,
    vehicle_id TEXT REFERENCES vehicle(id),
    category TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    gst_cents INTEGER NOT NULL DEFAULT 0,
    business_rule TEXT NOT NULL,
    custom_pct REAL,
    frequency TEXT NOT NULL,    -- weekly | monthly | yearly
    start_date TEXT NOT NULL,
    end_date TEXT,
    note TEXT,${META}
  );

  CREATE TABLE expense (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    vehicle_id TEXT REFERENCES vehicle(id),
    category TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    gst_cents INTEGER NOT NULL DEFAULT 0,
    business_rule TEXT NOT NULL, -- vehicle_pct | full | custom
    custom_pct REAL,
    recurring_expense_id TEXT REFERENCES recurring_expense(id),
    note TEXT,${META}
  );
  CREATE UNIQUE INDEX expense_recurring_due ON expense(recurring_expense_id, date)
    WHERE recurring_expense_id IS NOT NULL;

  CREATE TABLE attachment (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,  -- earning | expense
    entity_id TEXT NOT NULL,
    local_uri TEXT,
    storage_path TEXT,
    ${META.trim()}
  );

  CREATE TABLE document (
    id TEXT PRIMARY KEY NOT NULL,
    tax_year TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    local_uri TEXT,
    storage_path TEXT,
    ${META.trim()}
  );
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
