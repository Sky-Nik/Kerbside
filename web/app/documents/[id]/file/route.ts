import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Opens a stored document through a 2-minute signed URL. RLS limits it to the owner.
export async function GET(_req: NextRequest, ctx: RouteContext<"/documents/[id]/file">) {
  const { id } = await ctx.params;
  const supabase = await supabaseServer();
  const { data } = await supabase.from("documents").select("storage_path").eq("id", id).maybeSingle();
  if (!data?.storage_path) return new NextResponse("Document not found", { status: 404 });
  const signed = await supabase.storage.from("documents").createSignedUrl(data.storage_path, 120);
  if (signed.error) return new NextResponse(signed.error.message, { status: 500 });
  return NextResponse.redirect(signed.data.signedUrl);
}
