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
    <main className="mx-auto mt-16 max-w-sm px-4">
      <h1 className="text-2xl font-semibold">Rideshare Tax Tracker</h1>
      <p className="mt-1 text-sm text-slate-500">{mode === "in" ? "Sign in to your account" : "Create your account"}</p>
      <form onSubmit={submit} className="card mt-6 space-y-3">
        <label className="field">Email<input name="email" type="email" required autoComplete="email" /></label>
        <label className="field">
          Password
          <input name="password" type="password" required minLength={8}
            autoComplete={mode === "in" ? "current-password" : "new-password"} />
        </label>
        <button className="btn w-full" disabled={busy}>{busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}</button>
        {msg && <p className="text-sm text-amber-700">{msg}</p>}
      </form>
      <button className="mt-4 text-sm text-blue-700 underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "No account yet? Sign up" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
