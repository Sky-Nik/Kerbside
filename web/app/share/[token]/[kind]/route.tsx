import { NextResponse, type NextRequest } from "next/server";
import { shareClient } from "@/lib/supabase/share";
import { fyOf, todayAu } from "@/lib/tax";
import { reportResponse } from "@/lib/report/respond";

// Accountant link: same PDFs as /reports/[kind], read-only, for the driver who shared it.
export async function GET(req: NextRequest, ctx: RouteContext<"/share/[token]/[kind]">) {
  const { token, kind } = await ctx.params;
  const sb = shareClient(token);
  const { data } = await sb.from("profiles").select("user_id").maybeSingle();
  if (!data) return new NextResponse("This link has expired or been turned off.", { status: 404 });
  return reportResponse(sb, kind, req.nextUrl.searchParams, fyOf(todayAu()), null);
}
