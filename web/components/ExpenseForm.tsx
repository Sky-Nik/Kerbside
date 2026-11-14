"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/tax";
import { attachReceipt } from "./receipt";

export function ExpenseForm({ min, max, defaultDate }: { min: string; max: string; defaultDate: string }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const file = f.get("receipt") as File | null;
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabaseBrowser().from("expenses").insert({
      date: f.get("date"), description: String(f.get("description") || "") || null,
      amount: Math.round(Number(f.get("amount")) * 100) / 100, category: f.get("category"),
    }).select("id").single();
    if (error) {
      setBusy(false);
      return setMsg(error.message);
    }
    if (file && file.size) {
      try {
        await attachReceipt(data.id, file);
      } catch (err) {
        setMsg(`Expense saved, but the receipt didn't upload: ${(err as Error).message}. Use "Attach" on the row to retry.`);
      }
    }
    setBusy(false);
    form.current?.reset();
    router.refresh();
  }

  return (
    <form ref={form} onSubmit={submit} className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-6">
      <label className="field">Date<input name="date" type="date" required min={min} max={max} defaultValue={defaultDate} /></label>
      <label className="field lg:col-span-1">Supplier / description<input name="description" placeholder="e.g. Ampol fuel" /></label>
      <label className="field">Receipt total incl GST<input name="amount" type="number" step="0.01" inputMode="decimal" required /></label>
      <label className="field lg:col-span-2">Category
        <select name="category" required defaultValue="">
          <option value="" disabled>Choose…</option>
          {CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
        </select>
      </label>
      <label className="field">Receipt (photo or PDF)
        <input name="receipt" type="file" accept="image/*,application/pdf" className="text-xs" />
      </label>
      <div className="flex items-center gap-3 lg:col-span-6">
        <button className="btn" disabled={busy}>{busy ? "Saving…" : "Add expense"}</button>
        <span className="muted">Enter 100% of the receipt; the business-use % for that quarter is applied for you.</span>
      </div>
      {msg && <p className="text-sm text-red-700 lg:col-span-6">{msg}</p>}
    </form>
  );
}
