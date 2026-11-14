import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getFy } from "@/lib/data";
import { fyOptions } from "@/lib/tax";
import { setFy, signOut } from "@/app/actions";
import { AutoSubmitSelect } from "./AutoSubmitSelect";

const NAV = [
  ["/", "Dashboard"], ["/income", "Income"], ["/expenses", "Expenses"], ["/logbook", "Logbook"],
  ["/bas", "BAS"], ["/tax", "Tax return"], ["/settings", "Settings"],
] as const;

export async function Header() {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user) return null;
  const fy = await getFy();
  return (
    <header className="mb-6 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold text-blue-800">Rideshare Tax</Link>
        <nav className="flex flex-wrap gap-1">
          {NAV.map(([href, label]) => <Link key={href} href={href} className="btn-ghost">{label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <form action={setFy}>
            <AutoSubmitSelect name="fy" defaultValue={fy} aria-label="Financial year"
              options={fyOptions(fy).map((y) => ({ value: y, label: `FY ${y}` }))} />
          </form>
          <form action={signOut}><button className="btn-ghost">Sign out</button></form>
        </div>
      </div>
    </header>
  );
}
