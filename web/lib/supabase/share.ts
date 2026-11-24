import { createClient } from "@supabase/supabase-js";

/** Read-only client for an accountant link: RLS lets the anon role select the owner's rows while the token is valid. */
export const shareClient = (token: string) =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { "x-share-token": token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
