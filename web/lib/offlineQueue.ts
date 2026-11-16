// Receipts saved with no signal wait here (IndexedDB on this device) until the phone is back online.
export type QueuedExpense = { id: string; date: string; amount: number; category: string; description: string | null; vehicle_id: string | null; file: File | null };

const DB = "kerbside", STORE = "pending-expenses";
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => { const r = fn(db.transaction(STORE, mode).objectStore(STORE)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
export const queueExpense = (e: Omit<QueuedExpense, "id">) => tx("readwrite", (s) => s.put({ ...e, id: crypto.randomUUID() }));
export const pendingExpenses = () => tx<QueuedExpense[]>("readonly", (s) => s.getAll() as IDBRequest<QueuedExpense[]>);
export const dropExpense = (id: string) => tx("readwrite", (s) => s.delete(id));
/** A fetch that never reached the server (no signal), as opposed to the server saying no. */
export const isOffline = (err: unknown) => !navigator.onLine || /fetch|network|load failed/i.test(String((err as Error)?.message ?? err));
