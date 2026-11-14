"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    setBusy(true);
    setMsg(null);
    const sb = supabaseBrowser();
    const { data, error } =
      mode === "in"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (data.session) return router.replace("/");
    setMsg("Check your email for a confirmation link, then sign in.");
  }

  return (
    <main className="fixed inset-0 z-40 grid overflow-y-auto bg-white lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-black p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full border-[70px] border-white/[0.05]" />
        <div aria-hidden className="pointer-events-none absolute top-24 -right-24 h-72 w-72 rounded-full border-[40px] border-white/[0.04]" />
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-sm text-black">RT</span>Rideshare Tax
        </div>
        <div className="relative">
          <h1 className="text-6xl leading-[0.95] font-bold tracking-[-0.04em]">Drive.<br />Log it.<br />Lodge it.</h1>
          <p className="mt-6 max-w-sm text-lg text-white/60">Income, receipts, logbook, BAS and tax return in one place. Built for Australian rideshare drivers.</p>
        </div>
        <p className="text-sm text-white/40">Independent app. Not affiliated with any rideshare platform.</p>
      </section>

      <section className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2 text-lg font-bold lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-black text-sm text-white">RT</span>Rideshare Tax
          </div>
          <h2 className="text-[2rem] leading-tight font-bold tracking-[-0.02em]">{mode === "in" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-1 text-mute">{mode === "in" ? "Sign in to continue." : "It takes less than a minute."}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="field">Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
            <label className="field">
              Password
              <input name="password" type="password" required minLength={8} placeholder="At least 8 characters"
                autoComplete={mode === "in" ? "current-password" : "new-password"} />
            </label>
            <button className="btn h-12 w-full text-base" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}</button>
            {msg && <p className="rounded-xl bg-wash p-3 text-sm">{msg}</p>}
          </form>
          <p className="mt-6 text-sm text-mute">
            {mode === "in" ? "New here? " : "Already have an account? "}
            <button className="link" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}>
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
