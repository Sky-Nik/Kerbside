import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Opens a trip's odometer photo (?i=0 start, ?i=1 end) through a 2-minute signed URL. RLS limits it to the owner.
export async function GET(req: NextRequest, ctx: RouteContext<"/odometer/[id]">) {
  const { id } = await ctx.params;
  const supabase = await supabaseServer();
  const { data } = await supabase.from("trips").select("photos").eq("id", id).maybeSingle();
  const path = data?.photos?.[Number(req.nextUrl.searchParams.get("i") ?? 0)];
  if (!path) return new NextResponse("Photo not found", { status: 404 });
  const signed = await supabase.storage.from("receipts").createSignedUrl(path, 120);
  if (signed.error) return new NextResponse(signed.error.message, { status: 500 });
  return NextResponse.redirect(signed.data.signedUrl);
}
