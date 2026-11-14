"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function Forgot() {
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const email = String(new FormData(e.currentTarget).get("email"));
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    // Same message whether or not the account exists, so the form can't be used to find accounts.
    if (error && !/rate limit/i.test(error.message)) return setMsg(error.message);
    if (error) return setMsg("Too many requests. Please wait a few minutes and try again.");
    setSent(true);
  }

  return (
    <main className="fixed inset-0 z-40 overflow-y-auto bg-white">
      <div className="mx-auto max-w-sm px-6 py-16">
        <Logo size={36} className="mb-10" />
        <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.02em]">Reset your password</h1>
        {sent ? (
          <p className="mt-4 rounded-xl bg-wash p-4 text-sm">If there’s an account for that email, we’ve sent a link to reset the password. Check your inbox (and spam folder).</p>
        ) : (
          <>
            <p className="mt-1 text-mute">Enter your email and we’ll send you a link to choose a new password.</p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <label className="field">Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
              <button className="btn h-12 w-full text-base" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
              {msg && <p className="rounded-xl bg-wash p-3 text-sm">{msg}</p>}
            </form>
          </>
        )}
        <p className="mt-6 text-sm"><a href="/login" className="link">Back to sign in</a></p>
        <p className="mt-2 text-xs text-mute">Signed up with Google? Use “Continue with Google” instead – there’s no Kerbside password to reset.</p>
      </div>
    </main>
  );
}
