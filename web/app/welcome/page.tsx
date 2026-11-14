import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear } from "@/lib/data";
import { PlatformPicker } from "@/components/PlatformPicker";
import type { PlatformName, WorkType } from "@/lib/platforms";

export default async function Welcome() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, year] = await Promise.all([
    supabase.from("profiles").select("name,work_types,platforms").maybeSingle(),
    loadYear(supabase, await getFy()),
  ]);
  const first = (profile?.name || user.user_metadata?.full_name || "").split(" ")[0];
  return (
    <main className="mx-auto max-w-3xl pt-10">
      <p className="eyebrow mb-1">Welcome to Kerbside</p>
      <h1 className="h1">{first ? `Let’s set you up, ${first}.` : "Let’s set you up."}</h1>
      <p className="mt-2 mb-8 text-mute">Tell us how you drive so Kerbside only shows the platforms you use. You can change this any time in Settings.</p>
      <PlatformPicker
        initialTypes={(profile?.work_types ?? []) as WorkType[]}
        initialPlatforms={(profile?.platforms ?? []) as PlatformName[]}
        initialGst={year.gst_registered}
        submitLabel="Continue"
        next="/"
      />
    </main>
  );
}
