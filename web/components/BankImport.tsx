"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { bankKey, parseBankCsv, reviewStatement, type Suggestion } from "@/lib/bankCsv";
import { aud, auDate } from "@/lib/fmt";
import { Icon } from "./Icon";

// Lines the driver chose not to add, remembered on this device so the next statement doesn't ask again.
const SKIP_KEY = "kerbside-bank-skipped";
const readSkipped = (): string[] => { try { return JSON.parse(localStorage.getItem(SKIP_KEY) ?? "[]"); } catch { return []; } };
const saveSkipped = (keys: string[]) => { try { localStorage.setItem(SKIP_KEY, JSON.stringify([...new Set(keys)].slice(-500))); } catch {} };

/** Bank statement CSV: read on this device, never uploaded. Suggests work costs you haven't recorded. */
export function BankImport() {
  const router = useRouter();
  const [res, setRes] = useState<(ReturnType<typeof reviewStatement> & { count: number }) | null>(null);
  const [pick, setPick] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(file: File | undefined) {
    setMsg(null); setRes(null);
    if (!file) return;
    const rows = parseBankCsv(await file.text());
    if (!rows.length) return setMsg("Couldn’t find any transactions. Export the statement as CSV from your bank’s website.");
    const dates = rows.map((r) => r.date).sort();
    const sb = supabaseBrowser();
    const from14 = new Date(Date.parse(dates[0]) - 14 * 86400000).toISOString().slice(0, 10);
    const [{ data, error }, { data: entries }] = await Promise.all([
      sb.from("expenses").select("date,amount").gte("date", dates[0]).lte("date", dates.at(-1)!),
      sb.from("income_entries").select("platform,start_date,end_date").gte("end_date", from14).lte("start_date", dates.at(-1)!),
    ]);
    if (error) return setMsg(error.message);
    const r = reviewStatement(rows, (data ?? []).map((e) => ({ date: e.date, amount: Number(e.amount) })), entries ?? [], readSkipped());
    setRes({ ...r, count: rows.length });
    setPick(new Set(r.suggestions.map((_, i) => i)));
  }

  async function add() {
    if (!res) return;
    const chosen = res.suggestions.filter((_, i) => pick.has(i));
    setBusy(true);
    const { error } = await supabaseBrowser().from("expenses").insert(chosen.map((s: Suggestion) => ({
      date: s.date, amount: s.amount, category: s.category, description: s.description.slice(0, 80),
    })));
    setBusy(false);
    if (error) return setMsg(error.message);
    saveSkipped([...readSkipped(), ...res.suggestions.filter((_, i) => !pick.has(i)).map(bankKey)]);
    setMsg(`Added ${chosen.length} expense${chosen.length === 1 ? "" : "s"}. Attach receipts for anything over $82.50.`);
    setRes(null);
    router.refresh();
  }

  const toggle = (i: number) => setPick((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const payouts = res ? Object.entries(res.payouts) : [];

  return (
    <div>
      <label className="btn-secondary cursor-pointer"><Icon name="upload" size={18} />Choose statement CSV
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { load(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {msg && <p className="muted mt-3">{msg}</p>}
      {res && (
        <div className="mt-4">
          <p className="muted mb-3">{res.count} transactions, {auDate(res.from!)} – {auDate(res.to!)}.
            {payouts.length > 0 && <> Platform payouts: {payouts.map(([p, v]) => `${p} ${aud(v)}`).join(", ")} – check these match your earnings for those weeks.</>}</p>
          {res.missing.length > 0 && (
            <div className="mb-4 rounded-xl bg-[#fff8e6] p-4 text-sm">
              <b className="block">Earnings may be missing</b>
              <ul className="mt-1 space-y-0.5">
                {res.missing.map((m) => <li key={m.date + m.amount}>{m.platform} paid you {aud(m.amount)} on {auDate(m.date)}, but there are no {m.platform} earnings entered for the fortnight before.</li>)}
              </ul>
              <a href="/income" className="mt-2 inline-block font-bold underline underline-offset-2">Add earnings</a>
            </div>
          )}
          {res.suggestions.length === 0 ? <p className="font-medium">Nothing missing – every fuel, toll, phone and car cost here is already recorded.</p> : (
            <>
              <p className="mb-2 font-medium">{res.suggestions.length} possible work cost{res.suggestions.length === 1 ? "" : "s"} not in Kerbside yet:</p>
              <ul className="mb-4 divide-y divide-wash-2">
                {res.suggestions.map((s, i) => (
                  <li key={i}><label className="flex cursor-pointer items-center gap-3 py-2.5">
                    <input type="checkbox" checked={pick.has(i)} onChange={() => toggle(i)} className="h-4 w-4 accent-black" />
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{s.description}</span>
                      <span className="block text-[13px] text-mute">{auDate(s.date)} · {s.category}</span></span>
                    <span className="font-bold tabular-nums">{aud(s.amount)}</span>
                  </label></li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button className="btn" disabled={busy || !pick.size} onClick={add}><Icon name="plus" size={18} />{busy ? "Adding…" : `Add ${pick.size} as expenses`}</button>
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => { saveSkipped([...readSkipped(), ...res.suggestions.map(bankKey)]); setRes(null); setMsg("Skipped. Kerbside won’t suggest these again."); }}>None were for work</button>
              </div>
              <p className="muted mt-2">Only tick the ones that were for work. Ones you leave unticked won’t be suggested again. Your business-use % is applied automatically.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
