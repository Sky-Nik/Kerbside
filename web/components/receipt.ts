"use client";
import { supabaseBrowser } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024;

/** Shrinks big JPEG/PNG/WebP photos to max 2000px JPEG. Other files (PDF, HEIC) pass through. */
export async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/** Uploads a receipt into receipts/<user>/<expense>/ and links it to the expense row. */
export async function attachReceipt(expenseId: string, original: File) {
  const sb = supabaseBrowser();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error("Signed out — please sign in again.");
  const file = await shrink(original);
  if (file.size > MAX_BYTES) throw new Error("Receipt is larger than 10 MB.");
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80) || "receipt";
  const path = `${auth.user.id}/${expenseId}/${Date.now()}-${safe}`;
  const up = await sb.storage.from("receipts").upload(path, file, { contentType: file.type || undefined });
  if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
  const { data: old } = await sb.from("expenses").select("receipt_path").eq("id", expenseId).maybeSingle();
  const upd = await sb.from("expenses").update({ receipt_path: path, receipt_name: original.name }).eq("id", expenseId);
  if (upd.error) {
    await sb.storage.from("receipts").remove([path]);
    throw new Error(upd.error.message);
  }
  if (old?.receipt_path) await sb.storage.from("receipts").remove([old.receipt_path]);
}

/** Uploads an odometer photo to receipts/<user>/odometer/ and returns its storage path. */
export async function uploadOdometer(original: File, label: string) {
  const sb = supabaseBrowser();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error("Signed out — please sign in again.");
  const file = await shrink(original);
  if (file.size > MAX_BYTES) throw new Error("Photo is larger than 10 MB.");
  const path = `${auth.user.id}/odometer/${new Date().toISOString().replace(/[:.]/g, "-")}-${label}.${file.type === "image/png" ? "png" : "jpg"}`;
  const up = await sb.storage.from("receipts").upload(path, file, { contentType: file.type || undefined });
  if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
  return path;
}
