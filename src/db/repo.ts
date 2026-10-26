import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

export type Table =
  | 'profile'
  | 'shift_plan'
  | 'day_status'
  | 'vehicle'
  | 'logbook_period'
  | 'trip'
  | 'earning'
  | 'recurring_expense'
  | 'expense'
  | 'attachment'
  | 'document';

type Value = string | number | null;

// Update the given columns when the id exists, otherwise insert. Stamps timestamps and
// marks the row unsynced. Table and column names come from code, never from user input.
export async function save(
  db: SQLiteDatabase,
  table: Table,
  data: Record<string, Value | undefined> & { id?: string },
): Promise<string> {
  const now = new Date().toISOString();
  const { id: givenId, ...fields } = data;
  const values: Record<string, Value> = { updated_at: now, synced_at: null };
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) values[k] = v;
  const cols = Object.keys(values);

  if (givenId) {
    const res = await db.runAsync(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [
      ...cols.map((c) => values[c]),
      givenId,
    ]);
    if (res.changes > 0) return givenId;
  }

  const id = givenId ?? randomUUID();
  const all = { ...values, id, created_at: now };
  const allCols = Object.keys(all) as (keyof typeof all)[];
  await db.runAsync(
    `INSERT INTO ${table} (${allCols.join(', ')}) VALUES (${allCols.map(() => '?').join(', ')})`,
    allCols.map((c) => all[c]),
  );
  return id;
}

export async function softDelete(db: SQLiteDatabase, table: Table, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE ${table} SET deleted_at = ?, updated_at = ?, synced_at = NULL WHERE id = ?`, [now, now, id]);
}

export function list<T>(db: SQLiteDatabase, table: Table, orderBy = 'created_at'): Promise<T[]> {
  return db.getAllAsync<T>(`SELECT * FROM ${table} WHERE deleted_at IS NULL ORDER BY ${orderBy}`);
}

export function get<T>(db: SQLiteDatabase, table: Table, id: string): Promise<T | null> {
  return db.getFirstAsync<T>(`SELECT * FROM ${table} WHERE id = ? AND deleted_at IS NULL`, [id]);
}
