"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dropExpense, pendingExpenses } from "@/lib/offlineQueue";
import { attachReceipt } from "./receipt";

/** Registers the service worker and uploads receipts that were saved with no signal, once the phone is online. */
export function OfflineSync() {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    let running = false;
    const sync = async () => {
      if (running || !navigator.onLine) return;
      running = true;
      try {
        const items = await pendingExpenses();
        let done = 0;
        for (const { id, file, fuel, ...row } of items) {
          const { data, error } = await supabaseBrowser().from("expenses").insert(row).select("id").single();
          if (error) break; // still offline or signed out: try again later
          if (fuel) await supabaseBrowser().from("fuel_fills").insert({ date: row.date, cost: row.amount, expense_id: data.id, ...fuel });
          if (file) await attachReceipt(data.id, file).catch(() => {});
          await dropExpense(id); done++;
        }
        if (done) { setNote(`Uploaded ${done} receipt${done === 1 ? "" : "s"} saved while offline.`); router.refresh(); setTimeout(() => setNote(null), 4000); }
      } catch { /* IndexedDB unavailable (private mode): nothing queued */ }
      running = false;
    };
    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [router]);
  return note ? <div role="status" className="fixed inset-x-4 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-40 rounded-2xl bg-ink p-4 text-sm font-medium text-white shadow-lg lg:inset-x-auto lg:right-6 lg:bottom-6">{note}</div> : null;
}
