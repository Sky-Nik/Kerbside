"use client";
// Builds zip files in the browser (no server size limits): a full data export, or an accountant pack for one year.
import { strToU8, zipSync } from "fflate";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fyRange } from "@/lib/tax";

type Row = Record<string, unknown>;

/** Rows -> CSV (opens in Excel). Nested objects become JSON text. */
export function toCsv(rows: Row[]): string {
  if (!rows.length) return "";
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((c) => c !== "user_id");
  const cell = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

const safe = (s: string) => s.replace(/[^\w.\-]+/g, "_").slice(-90);

async function addFile(files: Record<string, Uint8Array>, bucket: string, path: string, name: string) {
  const { data } = await supabaseBrowser().storage.from(bucket).download(path);
  if (data) files[name] = new Uint8Array(await data.arrayBuffer());
}

function save(files: Record<string, Uint8Array>, filename: string): Blob {
  const blob = new Blob([zipSync(files, { level: 6 }) as BlobPart], { type: "application/zip" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return blob;
}

/** Everything in the account: every table as CSV plus every receipt and document. */
export async function exportEverything(onProgress: (m: string) => void) {
  const sb = supabaseBrowser();
  const tables = ["profiles", "years", "income_entries", "expenses", "trips", "car_transactions", "documents",
    "recurring_expenses", "fuel_fills", "assets"] as const;
  const files: Record<string, Uint8Array> = {};
  for (const t of tables) {
    onProgress(`Exporting ${t.replace("_", " ")}…`);
    const { data, error } = await sb.from(t).select("*");
    if (!error && data) files[`data/${t}.csv`] = strToU8(toCsv(data as Row[]));
  }
  const { data: exp } = await sb.from("expenses").select("id,date,receipt_path").not("receipt_path", "is", null);
  for (const [i, e] of (exp ?? []).entries()) {
    onProgress(`Receipts ${i + 1} of ${exp!.length}…`);
    await addFile(files, "receipts", e.receipt_path, `receipts/${e.date}_${safe(e.receipt_path.split("/").pop() ?? e.id)}`);
  }
  const { data: docs } = await sb.from("documents").select("id,fy,storage_path,file_name");
  for (const [i, d] of (docs ?? []).entries()) {
    onProgress(`Documents ${i + 1} of ${docs!.length}…`);
    await addFile(files, "documents", d.storage_path, `documents/${d.fy ?? "other"}_${safe(d.file_name ?? d.id)}`);
  }
  files["README.txt"] = strToU8("Kerbside export. data/*.csv open in Excel or Google Sheets. receipts/ and documents/ hold your original files.\n");
  onProgress("Zipping…");
  save(files, `Kerbside-export-${new Date().toISOString().slice(0, 10)}.zip`);
}

/** One financial year for a tax agent: PDF reports, receipts register data, receipt files and lodged documents. */
export async function accountantPack(fy: string, onProgress: (m: string) => void, share = false): Promise<string | null> {
  const sb = supabaseBrowser();
  const { start, end } = fyRange(fy);
  const files: Record<string, Uint8Array> = {};
  const pdf = async (url: string, name: string) => {
    const r = await fetch(url);
    if (r.ok) files[name] = new Uint8Array(await r.arrayBuffer());
  };
  onProgress("Tax summary…");
  await pdf(`/reports/tax?fy=${fy}`, `1_Tax-summary_${fy}.pdf`);
  for (let q = 0; q < 4; q++) { onProgress(`BAS Q${q + 1}…`); await pdf(`/reports/bas?q=${q}&fy=${fy}`, `2_BAS-Q${q + 1}_${fy}.pdf`); }
  onProgress("Receipts register…");
  await pdf(`/reports/receipts?fy=${fy}`, `3_Receipts-register_${fy}.pdf`);
  const [inc, exp, trips] = await Promise.all([
    sb.from("income_entries").select("*").gte("start_date", start).lte("start_date", end).order("start_date"),
    sb.from("expenses").select("*").gte("date", start).lte("date", end).order("date"),
    sb.from("trips").select("*").gte("date", start).lte("date", end).order("date"),
  ]);
  files[`data/income_${fy}.csv`] = strToU8(toCsv((inc.data ?? []) as Row[]));
  files[`data/expenses_${fy}.csv`] = strToU8(toCsv((exp.data ?? []) as Row[]));
  files[`data/logbook_${fy}.csv`] = strToU8(toCsv((trips.data ?? []) as Row[]));
  const withReceipts = (exp.data ?? []).filter((e) => e.receipt_path);
  for (const [i, e] of withReceipts.entries()) {
    onProgress(`Receipts ${i + 1} of ${withReceipts.length}…`);
    await addFile(files, "receipts", e.receipt_path, `receipts/${e.date}_${safe(e.description || e.category)}_${safe(e.receipt_path.split("/").pop() ?? "")}`);
  }
  const { data: docs } = await sb.from("documents").select("storage_path,file_name,id").eq("fy", fy);
  for (const d of docs ?? []) await addFile(files, "documents", d.storage_path, `documents/${safe(d.file_name ?? d.id)}`);
  files["README.txt"] = strToU8(`Kerbside accountant pack, FY ${fy}.\n1-3: PDF reports. data/: CSV records. receipts/: receipt files. documents/: lodged returns and platform summaries.\nPrepared from the driver's own records; not an ATO document.\n`);
  onProgress("Zipping…");
  const name = `Kerbside-accountant-pack-${fy}.zip`;
  const blob = save(files, name);
  if (!share) return null;

  // Share link: store the zip privately and hand out a 7-day link.
  onProgress("Creating share link…");
  const { data: auth } = await sb.auth.getUser();
  const path = `${auth.user!.id}/packs/${Date.now()}-${name}`;
  const up = await sb.storage.from("documents").upload(path, blob, { contentType: "application/zip" });
  if (up.error) throw new Error(up.error.message);
  const signed = await sb.storage.from("documents").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signed.error) throw new Error(signed.error.message);
  return signed.data.signedUrl;
}

/** Remove every stored file, then the account (rows cascade). */
export async function deleteAccount(onProgress: (m: string) => void) {
  const sb = supabaseBrowser();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  for (const bucket of ["receipts", "documents"]) {
    onProgress(`Deleting ${bucket}…`);
    const paths: string[] = [];
    const walk = async (prefix: string) => {
      const { data } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
      for (const o of data ?? []) {
        const p = `${prefix}/${o.name}`;
        if (o.id) paths.push(p); else await walk(p); // folders have no id
      }
    };
    await walk(auth.user.id);
    for (let i = 0; i < paths.length; i += 100) await sb.storage.from(bucket).remove(paths.slice(i, i + 100));
  }
  onProgress("Deleting your account…");
  const { error } = await sb.rpc("delete_my_account");
  if (error) throw new Error(error.message);
  await sb.auth.signOut();
}
