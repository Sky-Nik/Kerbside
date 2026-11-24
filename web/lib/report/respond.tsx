import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadReport } from "@/lib/report/data";
import { BasReport } from "@/lib/report/bas";
import { TaxReport } from "@/lib/report/tax";
import { ReceiptsReport } from "@/lib/report/receipts";

export const REPORT_KINDS = ["bas", "tax", "receipts"] as const;

/** Renders one PDF report. Row-level security decides whose data `sb` can see (the driver, or a shared accountant link). */
export async function reportResponse(sb: SupabaseClient, kind: string, qp: URLSearchParams, fallbackFy: string, email: string | null) {
  if (!(REPORT_KINDS as readonly string[]).includes(kind)) return new NextResponse("Not found", { status: 404 });
  const fyParam = qp.get("fy");
  const fy = fyParam && /^\d{4}-\d{2}$/.test(fyParam) ? fyParam : fallbackFy;
  const q = Number(qp.get("q") ?? 0);
  if (kind === "bas" && !(q >= 0 && q <= 3)) return new NextResponse("q must be 0-3", { status: 400 });

  const r = await loadReport(sb, fy, email);
  let doc;
  if (kind === "receipts") {
    // Short-lived signed URLs so the PDF renderer can embed photo receipts (JPEG/PNG only).
    const photos = r.expenses.filter((e) => e.receipt_path && /\.(jpe?g|png)$/i.test(e.receipt_path));
    const signed = photos.length ? await sb.storage.from("receipts").createSignedUrls(photos.map((e) => e.receipt_path!), 300) : { data: [] };
    const images: Record<string, string> = {};
    photos.forEach((e, i) => { const u = signed.data?.[i]?.signedUrl; if (u) images[e.id] = u; });
    doc = <ReceiptsReport r={r} images={images} />;
  } else {
    doc = kind === "bas" ? <BasReport r={r} q={q} /> : <TaxReport r={r} />;
  }
  const pdf = await renderToBuffer(doc);
  const file = kind === "bas" ? `Kerbside-BAS-Q${q + 1}-${fy}.pdf` : kind === "tax" ? `Kerbside-Tax-Summary-${fy}.pdf` : `Kerbside-Receipts-${fy}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${qp.get("view") ? "inline" : "attachment"}; filename="${file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
