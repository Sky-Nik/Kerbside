"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export function Login({ initialError }: { initialError: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);


  async function google() {
    setBusy(true);
    setMsg(null);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    // If the provider is off, Supabase would show a raw JSON error page, so check first.
    const enabled = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => r.json()).then((s) => !!s?.external?.google).catch(() => true);
    if (!enabled) {
      setBusy(false);
      return setMsg("Google sign-in isn't switched on yet. Use email for now.");
    }
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
    // On success the browser is already on its way to Google.
    if (error) {
      setBusy(false);
      setMsg(error.message);
    }
  }

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
        <Logo size={36} inverted />
        <div className="relative">
          <h1 className="text-6xl leading-[0.95] font-bold tracking-[-0.04em]">Drive.<br />Log it.<br />Lodge it.</h1>
          <p className="mt-6 max-w-sm text-lg text-white/60">Income, receipts, logbook, BAS and tax return in one place. Built for Australian rideshare drivers.</p>
        </div>
        <p className="text-sm text-white/40">Independent app. Not affiliated with any rideshare platform.</p>
      </section>

      <section className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Logo size={36} className="mb-10 lg:hidden" />
          <h2 className="text-[2rem] leading-tight font-bold tracking-[-0.02em]">{mode === "in" ? "Welcome back" : "Create your account"}</h2>
          <p className="mt-1 text-mute">{mode === "in" ? "Sign in to continue." : "It takes less than a minute."}</p>
          <button type="button" onClick={google} disabled={busy}
            className="btn-secondary mt-8 h-12 w-full bg-white text-base ring-1 ring-line hover:bg-wash">
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Continue with Google
          </button>
          <div className="my-6 flex items-center gap-3 text-xs text-mute">
            <span className="h-px flex-1 bg-line" />or use email<span className="h-px flex-1 bg-line" />
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="field">Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
            <label className="field">
              <span className="flex justify-between">Password
                {mode === "in" && <a href="/forgot" className="text-[13px] font-normal text-mute underline underline-offset-2 hover:text-ink">Forgot password?</a>}
              </span>
              <input name="password" type="password" required minLength={8} placeholder="At least 8 characters"
                autoComplete={mode === "in" ? "current-password" : "new-password"} />
            </label>
            <button className="btn h-12 w-full text-base" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}</button>
            {msg && <p className="rounded-xl bg-wash p-3 text-sm">{msg}</p>}
          </form>
          <p className="mt-4 text-xs text-mute">
            By continuing you agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy policy</a>.
          </p>
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
