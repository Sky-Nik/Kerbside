"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/tax";
import { attachReceipt } from "./receipt";
import { Icon } from "./Icon";

export function ExpenseForm({ min, max, defaultDate }: { min: string; max: string; defaultDate: string }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function pick(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
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
  }

  return (
    <form ref={form} onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_240px]">
      <div className="grid content-start gap-3 sm:grid-cols-2">
        <label className="field">Date<input name="date" type="date" required min={min} max={max} defaultValue={defaultDate} /></label>
        <label className="field">Receipt total incl GST<input name="amount" type="number" step="0.01" inputMode="decimal" required placeholder="0.00" /></label>
        <label className="field sm:col-span-2">Supplier / description<input name="description" placeholder="e.g. Ampol fuel" /></label>
        <label className="field sm:col-span-2">Category
          <select name="category" required defaultValue="">
            <option value="" disabled>Choose a category</option>
            {CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
          </select>
        </label>
      </div>

      <label className={`relative flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed p-4 text-center transition ${file ? "border-ink bg-white" : "border-line bg-wash hover:border-mute-2"}`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Receipt preview" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-full bg-black text-white"><Icon name={file ? "check" : "upload"} /></span>
        )}
        <span className={`relative text-sm font-medium ${preview ? "rounded-full bg-black px-3 py-1 text-white" : ""}`}>
          {file ? file.name.slice(0, 28) : "Add receipt photo or PDF"}
        </span>
        {!file && <span className="relative text-xs text-mute">Snap it with your phone camera · max 10 MB</span>}
        <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => pick(e.currentTarget.files?.[0] ?? null)} />
      </label>

      <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
        <button className="btn" disabled={busy}>{busy ? "Saving…" : <><Icon name="plus" size={18} />Add expense</>}</button>
        <span className="muted">Enter 100% of the receipt; your business-use % for the quarter is applied automatically.</span>
      </div>
      {msg && <p className="rounded-xl bg-[#fff0ee] p-3 text-sm text-neg lg:col-span-2">{msg}</p>}
    </form>
  );
}
