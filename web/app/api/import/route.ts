import { NextResponse, type NextRequest } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { supabaseServer } from "@/lib/supabase/server";
import { parseLodgedReturn, parseUberSummary } from "@/lib/import/parse";

const MAX = 8 * 1024 * 1024;

/**
 * Step 1 of an import: store the PDF in the user's private documents folder and read the figures from it.
 * Nothing is added to income until the user confirms (confirmImport server action).
 */
export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "File is larger than 8 MB." }, { status: 413 });
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());

  let parsed: ReturnType<typeof parseLodgedReturn> | ReturnType<typeof parseUberSummary> = null;
  if (isPdf) {
    try {
      const { text } = await extractText(await getDocumentProxy(bytes), { mergePages: true });
      parsed = parseLodgedReturn(text) ?? parseUberSummary(text);
    } catch {
      parsed = null; // unreadable or scanned PDF: can still be saved as a plain document
    }
  }

  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80) || "document.pdf";
  const path = `${auth.user.id}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from("documents").upload(path, bytes, { contentType: file.type || "application/pdf" });
  if (up.error) return NextResponse.json({ error: `Upload failed: ${up.error.message}` }, { status: 500 });

  return NextResponse.json({ path, fileName: file.name, parsed });
}
