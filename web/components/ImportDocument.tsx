"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelImport, confirmImport } from "@/app/actions";
import type { LodgedReturn, PlatformSummary } from "@/lib/import/parse";
import { INCOME_LINES, fyOf } from "@/lib/tax";
import { netLabel } from "@/lib/platforms";
import { aud } from "@/lib/fmt";
import { Icon } from "./Icon";
import { PlatformTile } from "./PlatformTile";

type Upload = { path: string; fileName: string; parsed: LodgedReturn | PlatformSummary | null };

/** Upload a lodged tax return, a platform tax summary or any other document, review what was read, then save. */
export function ImportDocument({ intro }: { intro?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [up, setUp] = useState<Upload | null>(null);
  const [period, setPeriod] = useState({ start: "", end: "" });
  const [entries, setEntries] = useState<PlatformSummary["entries"]>([]);
  const [addIncome, setAddIncome] = useState(true);
  const [other, setOther] = useState({ title: "", fy: "" });

  async function upload(file: File) {
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({ error: "Upload failed." }));
    setBusy(false);
    if (!res.ok) return setMsg(json.error);
    setUp(json);
    if (json.parsed?.kind === "platform_summary") {
      setPeriod({ start: json.parsed.period.start ?? "", end: json.parsed.period.end ?? "" });
      setEntries(json.parsed.entries);
      setAddIncome(!json.parsed.period.annual);
    }
    setOther({ title: file.name.replace(/\.[^.]+$/, ""), fy: "" });
  }

  async function save() {
    if (!up) return;
    setBusy(true); setMsg(null);
    const p = up.parsed;
    try {
      if (p?.kind === "tax_return") {
        await confirmImport({ path: up.path, fileName: up.fileName, kind: "tax_return", fy: p.fy, title: `${p.fy} tax return`, parsed: p });
      } else if (p?.kind === "platform_summary") {
        const fy = period.start ? fyOf(period.start) : null;
        const days = period.start && period.end ? (Date.parse(period.end) - Date.parse(period.start)) / 86400000 : 0;
        const canAdd = addIncome && !p.period.annual && !!period.start && !!period.end && days >= 0 && days <= 92;
        if (addIncome && !canAdd) throw new Error("Pick a period of up to 3 months to add as income (annual summaries are kept for your history).");
        const r = await confirmImport({
          path: up.path, fileName: up.fileName, kind: "platform_summary", fy, title: `Uber tax summary – ${p.period.label}`,
          parsed: { ...p, entries, period: { ...p.period, start: period.start, end: period.end } },
          entries: canAdd ? entries.map((e) => ({ ...e, start_date: period.start, end_date: period.end })) : [],
        });
        setMsg(r.added ? `Saved. Added ${r.added} income ${r.added === 1 ? "entry" : "entries"}.` : "Saved to your documents.");
      } else {
        await confirmImport({ path: up.path, fileName: up.fileName, kind: "other", fy: other.fy || null, title: other.title || up.fileName, parsed: {} });
      }
      if (p?.kind !== "platform_summary") setMsg("Saved to your documents.");
      setUp(null);
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  async function cancel() {
    if (up) await cancelImport(up.path);
    setUp(null); setMsg(null);
  }

  if (!up) {
    return (
      <div>
        <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-wash p-6 text-center transition hover:border-mute-2 ${busy ? "opacity-60" : ""}`}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-black text-white"><Icon name="upload" /></span>
          <span className="font-medium">{busy ? "Reading your document…" : "Upload a PDF"}</span>
          <span className="max-w-md text-xs text-mute">{intro ?? "Lodged tax return (myGov print), Uber tax summary, or any other document. You’ll check the figures before anything is added."}</span>
          <input type="file" accept="application/pdf,image/*" className="sr-only" disabled={busy}
            onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }} />
        </label>
        {msg && <p className={`mt-3 text-sm ${msg.startsWith("Saved") ? "text-pos" : "text-neg"}`}>{msg}</p>}
      </div>
    );
  }

  const p = up.parsed;
  return (
    <div className="space-y-4 rounded-2xl ring-2 ring-ink p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-warn"><Icon name="check" /></span>
        <div>
          <p className="font-bold">{p?.kind === "tax_return" ? `Lodged tax return · ${p.fy}` : p?.kind === "platform_summary" ? `Uber tax summary · ${p.period.label}` : "Document uploaded"}</p>
          <p className="text-[13px] text-mute">{up.fileName}. Check the figures below, then save.</p>
        </div>
      </div>

      {p?.kind === "tax_return" && (
        <dl className="grid gap-x-8 sm:grid-cols-2">
          {([
            ["Taxable income", p.taxable], ["Business income", p.businessIncome], ["Business expenses", p.businessExpenses],
            ["Net business income", p.netBusiness], ["Wages / income statements", p.wages], ["Tax withheld", p.taxWithheld], ["Interest", p.interest],
          ] as [string, number][]).map(([k, v]) => <div key={k} className="kv"><dt>{k}</dt><dd>{aud(v)}</dd></div>)}
          {p.motorVehicle > 0 && <div className="kv sm:col-span-2"><dt>Car expenses ({p.motorVehicleMethod})</dt><dd>{aud(p.motorVehicle)}</dd></div>}
          {p.payers.length > 0 && <p className="muted sm:col-span-2 pt-2">Payers: {p.payers.map((x) => `${x.name} ${aud(x.gross)}`).join(" · ")}</p>}
        </dl>
      )}

      {p?.kind === "platform_summary" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">From<input type="date" value={period.start} onChange={(e) => setPeriod({ ...period, start: e.currentTarget.value })} /></label>
            <label className="field">To<input type="date" value={period.end} min={period.start} onChange={(e) => setPeriod({ ...period, end: e.currentTarget.value })} /></label>
          </div>
          {entries.map((e, i) => (
            <div key={e.platform} className="rounded-xl bg-wash p-4">
              <p className="mb-3 flex items-center gap-2 font-bold"><PlatformTile name={e.platform} size={28} />{e.platform}</p>
              <div className="grid gap-3 sm:grid-cols-4">
                {[...INCOME_LINES.map((l) => ["line", l, l === "Net fare" ? netLabel(e.platform) : l] as const), ["fee", "Service fees", "Service fee"] as const].map(([kind, key, label]) => (
                  <label key={key} className="field">{label}
                    <input type="number" step="0.01" value={(kind === "line" ? e.lines[key] : e.fees[key]) ?? ""} placeholder="0.00"
                      onChange={(ev) => {
                        const v = ev.currentTarget.value === "" ? 0 : Number(ev.currentTarget.value);
                        setEntries(entries.map((x, j) => j !== i ? x : kind === "line"
                          ? { ...x, lines: { ...x.lines, [key]: v } } : { ...x, fees: { ...x.fees, [key]: v } }));
                      }} />
                  </label>
                ))}
              </div>
            </div>
          ))}
          <p className="text-sm">Total payments on the summary: <b>{aud(p.totalPayments)}</b></p>
          {p.period.annual ? (
            <p className="rounded-xl bg-[#fff8e6] p-3 text-sm">This is an annual summary. It’s saved to your documents and counts towards your income history, but isn’t split into weekly entries. Upload monthly summaries to fill gaps in the current year.</p>
          ) : (
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={addIncome} onChange={(e) => setAddIncome(e.currentTarget.checked)} />
              Add this to my income for {period.start || "…"} – {period.end || "…"}</label>
          )}
          {addIncome && !p.period.annual && <p className="muted">Make sure you haven’t already entered these weeks on the Income page, or they’ll be counted twice (Kerbside flags overlaps).</p>}
        </div>
      )}

      {!p && (
        <div className="space-y-3">
          <p className="text-sm text-mute">We couldn’t read tax figures from this file, but you can still keep it in your documents.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">Title<input value={other.title} onChange={(e) => setOther({ ...other, title: e.currentTarget.value })} /></label>
            <label className="field">Financial year (optional)<input value={other.fy} placeholder="2025-26" onChange={(e) => setOther({ ...other, fy: e.currentTarget.value })} /></label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={cancel}>Cancel</button>
        {msg && <span className={`text-sm ${msg.startsWith("Saved") ? "text-pos" : "text-neg"}`}>{msg}</span>}
      </div>
    </div>
  );
}
