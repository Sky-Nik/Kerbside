import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getFy } from "@/lib/data";
import { loadReport } from "@/lib/report/data";
import { BasReport } from "@/lib/report/bas";
import { TaxReport } from "@/lib/report/tax";
import { ReceiptsReport } from "@/lib/report/receipts";

// GET /reports/bas?q=1  → quarterly BAS PDF (q = 0..3)
// GET /reports/tax      → annual tax summary PDF
// GET /reports/receipts → receipts register + copies of photo receipts
// Optional ?fy=2026-27, defaults to the year picked in the header.
export async function GET(req: NextRequest, ctx: RouteContext<"/reports/[kind]">) {
  const { kind } = await ctx.params;
  if (kind !== "bas" && kind !== "tax" && kind !== "receipts") return new NextResponse("Not found", { status: 404 });
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/login", req.url));

  const qp = req.nextUrl.searchParams;
  const fyParam = qp.get("fy");
  const fy = fyParam && /^\d{4}-\d{2}$/.test(fyParam) ? fyParam : await getFy();
  const q = Number(qp.get("q") ?? 0);
  if (kind === "bas" && !(q >= 0 && q <= 3)) return new NextResponse("q must be 0-3", { status: 400 });

  const r = await loadReport(supabase, fy, auth.user.email ?? null);
  let doc;
  if (kind === "receipts") {
    // Short-lived signed URLs so the PDF renderer can embed photo receipts (JPEG/PNG only).
    const photos = r.expenses.filter((e) => e.receipt_path && /\.(jpe?g|png)$/i.test(e.receipt_path));
    const signed = photos.length ? await supabase.storage.from("receipts").createSignedUrls(photos.map((e) => e.receipt_path!), 300) : { data: [] };
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
