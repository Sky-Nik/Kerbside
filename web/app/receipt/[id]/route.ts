import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Opens a receipt through a 2-minute signed URL. RLS ensures only the owner can find the row or sign the file.
export async function GET(_req: NextRequest, ctx: RouteContext<"/receipt/[id]">) {
  const { id } = await ctx.params;
  const supabase = await supabaseServer();
  const { data } = await supabase.from("expenses").select("receipt_path").eq("id", id).maybeSingle();
  if (!data?.receipt_path) return new NextResponse("Receipt not found", { status: 404 });
  const signed = await supabase.storage.from("receipts").createSignedUrl(data.receipt_path, 120);
  if (signed.error) return new NextResponse(signed.error.message, { status: 500 });
  return NextResponse.redirect(signed.data.signedUrl);
}
