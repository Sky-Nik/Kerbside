"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { accountantPack, deleteAccount, exportEverything } from "@/lib/packs";
import { Icon } from "./Icon";
import { Tip } from "./Tip";

/** Settings → Your data: export everything, accountant pack (download or share link), delete account. */
export function DataTools({ fy }: { fy: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label); setMsg(null);
    try { await fn(); } catch (e) { setMsg((e as Error).message); }
    setBusy(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-wash p-4">
          <p className="flex items-center gap-2 font-bold">Accountant pack · FY {fy}<Tip text="One zip with the tax summary, all four BAS reports, the receipts register, your records as spreadsheets, and every receipt and lodged document for the year." align="left" /></p>
          <p className="muted mb-3">Everything your tax agent needs for the year.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => run("pack", () => accountantPack(fy, setMsg))}>
              <Icon name="upload" size={14} className="rotate-180" />Download zip
            </button>
            <button type="button" className="btn-secondary btn-sm" disabled={!!busy}
              onClick={() => run("share", async () => { const l = await accountantPack(fy, setMsg, true); setLink(l); setMsg("Link ready – it works for 7 days."); })}>
              Share link
            </button>
          </div>
          {link && (
            <div className="mt-3 flex gap-2">
              <input readOnly value={link} className="inp min-w-0 flex-1 !h-9 text-xs" onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(link)}>Copy</button>
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-wash p-4">
          <p className="flex items-center gap-2 font-bold">Export everything<Tip text="All your records as CSV files (open in Excel or Google Sheets) plus every receipt and document, in one zip. Your data is never locked in." align="left" /></p>
          <p className="muted mb-3">All years, all records and files.</p>
          <button type="button" className="btn-secondary btn-sm" disabled={!!busy} onClick={() => run("export", () => exportEverything(setMsg))}>
            <Icon name="upload" size={14} className="rotate-180" />Export everything
          </button>
        </div>
      </div>
      {busy && <p className="text-sm text-mute">{msg ?? "Working…"} Keep this page open.</p>}
      {!busy && msg && <p className="text-sm">{msg}</p>}

      <div className="rounded-2xl p-4 ring-1 ring-neg/40">
        <p className="font-bold text-neg">Delete my account</p>
        <p className="muted mb-3">Permanently deletes your account, all records, receipts and documents. This can’t be undone – export first if you want a copy.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input className="inp !h-9 max-w-[180px]" placeholder='Type "DELETE"' value={confirm} onChange={(e) => setConfirm(e.currentTarget.value)} aria-label='Type DELETE to confirm' />
          <button type="button" className="inline-flex h-9 items-center rounded-full bg-neg px-4 text-sm font-medium text-white disabled:opacity-40"
            disabled={confirm !== "DELETE" || !!busy}
            onClick={() => run("delete", async () => { await deleteAccount(setMsg); router.replace("/login"); })}>
            Delete account and data
          </button>
        </div>
      </div>
    </div>
  );
}
