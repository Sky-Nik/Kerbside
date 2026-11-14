"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

/** Reached from the reset email (via /auth/callback, which signs the user in for this purpose). */
export default function ResetPassword() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password !== String(f.get("confirm"))) return setMsg("The two passwords don’t match.");
    setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg(error.message);
    router.replace("/?reset=1");
  }

  return (
    <main className="fixed inset-0 z-40 overflow-y-auto bg-white">
      <div className="mx-auto max-w-sm px-6 py-16">
        <Logo size={36} className="mb-10" />
        <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.02em]">Choose a new password</h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="field">New password<input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" /></label>
          <label className="field">Confirm password<input name="confirm" type="password" required minLength={8} autoComplete="new-password" /></label>
          <button className="btn h-12 w-full text-base" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
          {msg && <p className="rounded-xl bg-wash p-3 text-sm">{msg}</p>}
        </form>
      </div>
    </main>
  );
}
