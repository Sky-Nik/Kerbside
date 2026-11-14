import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        // Server Components can't set cookies; the proxy refreshes the session instead.
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}

/** Supabase client + signed-in user, or redirect to /login. */
export async function requireUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}
