import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Landing page for Google sign-in and email confirmation: swap the one-time code for a session.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const fail = (msg: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, request.url));

  // Provider errors (e.g. the user cancelled on Google's screen)
  const providerError = params.get("error_description") ?? params.get("error");
  if (providerError) return fail(providerError);

  const code = params.get("code");
  if (!code) return fail("Sign-in link is missing or expired. Please try again.");
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);
  return NextResponse.redirect(new URL("/", request.url));
}
