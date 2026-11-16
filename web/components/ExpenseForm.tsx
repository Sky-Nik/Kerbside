"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CATEGORIES, todayAu } from "@/lib/tax";
import { parseReceipt } from "@/lib/receiptOcr";
import { attachReceipt } from "./receipt";
import { isOffline, queueExpense } from "@/lib/offlineQueue";
import { Icon } from "./Icon";
import { Tip } from "./Tip";

export function ExpenseForm({ min, max, defaultDate, cars = [], initialFile = null, onSaved }: {
  min: string; max: string; defaultDate: string; cars?: { id: string; name: string }[];
  /** A photo already picked (the phone quick-add button): it's scanned straight away. */
  initialFile?: File | null; onSaved?: (offline: boolean) => void;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(initialFile);
  const [preview, setPreview] = useState<string | null>(() => (initialFile?.type.startsWith("image/") ? URL.createObjectURL(initialFile) : null));

  const [scan, setScan] = useState<string | null>(null);

  /** Read the receipt photo on this device (tesseract.js) and fill in what it finds. */
  async function scanReceipt(f: File | null = file) {
    if (!f || !form.current) return;
    setScan("Reading receipt… (the first scan downloads about 4 MB of text-recognition data)");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(f);
      await worker.terminate();
      const g = parseReceipt(data.text, todayAu());
      const el = form.current.elements;
      const set = (name: string, v: string | null) => { const i = el.namedItem(name) as HTMLInputElement | HTMLSelectElement | null; if (i && v) i.value = v; };
      set("amount", g.total != null ? g.total.toFixed(2) : null);
      set("description", g.supplier);
      set("category", g.category);
      const outOfRange = g.date && (g.date < min || g.date > max);
      if (!outOfRange) set("date", g.date);
      const found = [g.total != null && "total", g.date && "date", g.supplier && "supplier", g.category && "category"].filter(Boolean);
      setScan(found.length
        ? `Filled in ${found.join(", ")}${g.gst != null ? ` (receipt shows GST ${g.gst.toFixed(2)})` : ""}. Please check before saving.${outOfRange ? ` The receipt is dated ${g.date}, outside this quarter – switch quarter if that’s right.` : ""}`
        : "Couldn’t read this receipt clearly. Please type the details in.");
    } catch (e) {
      setScan(`Scanning didn’t work: ${(e as Error).message}. Please type the details in.`);
    }
  }

  function pick(f: File | null) {
    setScan(null);
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    if (f && f.type.startsWith("image/")) scanReceipt(f); // read it straight away, no extra tap
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- scan the quick-add photo once, on open
  useEffect(() => { if (initialFile?.type.startsWith("image/")) scanReceipt(initialFile); }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setMsg(null);
    const row = {
      date: String(f.get("date")), description: String(f.get("description") || "") || null,
      amount: Math.round(Number(f.get("amount")) * 100) / 100, category: String(f.get("category")),
      vehicle_id: String(f.get("category") ?? "").startsWith("Car") ? String(f.get("vehicle_id") || "") || null : null,
    };
    const saveOffline = async () => {
      await queueExpense({ ...row, file });
      setBusy(false); form.current?.reset(); pick(null);
      setMsg("No signal, so it's saved on this phone. It will upload by itself when you're back online.");
      onSaved?.(true);
    };
    if (!navigator.onLine) return saveOffline();
    const { data, error } = await supabaseBrowser().from("expenses").insert(row).select("id").single();
    if (error && isOffline(error)) return saveOffline();
    if (error) {
      setBusy(false);
      return setMsg(error.message);
    }
    if (file) {
      try {
        await attachReceipt(data.id, file);
      } catch (err) {
        setMsg(`Expense saved, but the receipt didn't upload: ${(err as Error).message}. Use "Attach receipt" on the row to retry.`);
      }
    }
    setBusy(false);
    form.current?.reset();
    pick(null);
    router.refresh();
    onSaved?.(false);
  }

  return (
    <form ref={form} onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_240px]">
      <div className="grid content-start gap-3 sm:grid-cols-2">
        <label className="field">Date<input name="date" type="date" required min={min} max={max} defaultValue={defaultDate} /></label>
        <label className="field">Receipt total incl GST<input name="amount" type="number" step="0.01" inputMode="decimal" required placeholder="0.00" /></label>
        <label className="field sm:col-span-2">Supplier / description<input name="description" placeholder="e.g. Ampol fuel" /></label>
        <label className="field sm:col-span-2"><span className="flex items-center gap-1.5">Category<Tip k="category" align="left" /></span>
          <select name="category" required defaultValue="">
            <option value="" disabled>Choose a category</option>
            {CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
          </select>
        </label>
        {cars.length > 1 && (
          <label className="field sm:col-span-2"><span>Which car <span className="text-[11px] font-normal text-mute">for car costs</span></span>
            <select name="vehicle_id" defaultValue="">{cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
        )}
      </div>

      <label className={`relative order-first flex min-h-44 cursor-pointer lg:order-none flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed p-4 text-center transition ${file ? "border-ink bg-white" : "border-line bg-wash hover:border-mute-2"}`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Receipt preview" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-full bg-black text-white"><Icon name={file ? "check" : "upload"} /></span>
        )}
        <span className={`relative text-sm font-medium ${preview ? "rounded-full bg-black px-3 py-1 text-white" : ""}`}>
          {file ? file.name.slice(0, 28) : "Add receipt photo or PDF"}
        </span>
        {!file && <span className="relative flex items-center gap-1.5 text-xs text-mute">Snap it with your phone camera · max 10 MB<Tip k="receipt" /></span>}
        <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => pick(e.currentTarget.files?.[0] ?? null)} />
      </label>

      {file && file.type.startsWith("image/") && (
        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => scanReceipt()} disabled={!!scan && scan.startsWith("Reading")}>
            <Icon name="receipt" size={16} />Scan again
          </button>
          <Tip k="scan" />
          {scan && <span className="text-sm text-ink-2">{scan}</span>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
        <button className="btn" disabled={busy}>{busy ? "Saving…" : <><Icon name="plus" size={18} />Add expense</>}</button>
        <span className="muted">Enter 100% of the receipt; your business-use % for the quarter is applied automatically.</span>
      </div>
      {msg && <p className={`rounded-xl p-3 text-sm lg:col-span-2 ${msg.startsWith("No signal") ? "bg-wash" : "bg-[#fff0ee] text-neg"}`}>{msg}</p>}
    </form>
  );
}
