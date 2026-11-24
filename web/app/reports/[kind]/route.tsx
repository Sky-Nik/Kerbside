import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getFy } from "@/lib/data";
import { reportResponse } from "@/lib/report/respond";

// GET /reports/bas?q=1  → quarterly BAS PDF (q = 0..3)
// GET /reports/tax      → annual tax summary PDF
// GET /reports/receipts → receipts register + copies of photo receipts
// Optional ?fy=2026-27, defaults to the year picked in the header.
export async function GET(req: NextRequest, ctx: RouteContext<"/reports/[kind]">) {
  const { kind } = await ctx.params;
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/login", req.url));
  return reportResponse(supabase, kind, req.nextUrl.searchParams, await getFy(), auth.user.email ?? null);
}
