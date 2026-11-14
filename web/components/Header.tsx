import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getFy } from "@/lib/data";
import { fyOptions } from "@/lib/tax";
import { setFy, signOut } from "@/app/actions";
import { AutoSubmitSelect } from "./AutoSubmitSelect";
import { BottomNav, TopNav } from "./Nav";
import { Icon } from "./Icon";

export async function Header() {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user) return null;
  const fy = await getFy();
  return (
    <>
      <header className="sticky top-0 z-30 bg-black text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-[17px] font-bold tracking-[-0.02em]">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-white text-[13px] font-bold text-black">RT</span>
            <span>Rideshare&nbsp;Tax</span>
          </Link>
          <TopNav />
          <div className="ml-auto flex items-center gap-1">
            <form action={setFy}>
              <AutoSubmitSelect name="fy" defaultValue={fy} aria-label="Financial year"
                options={fyOptions(fy).map((y) => ({ value: y, label: `FY ${y}` }))} />
            </form>
            <Link href="/logbook" className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10 lg:hidden" aria-label="Logbook"><Icon name="car" /></Link>
            <Link href="/settings" className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10 lg:hidden" aria-label="Settings"><Icon name="gear" /></Link>
            <form action={signOut}>
              <button className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10" aria-label="Sign out" title="Sign out"><Icon name="out" size={18} /></button>
            </form>
          </div>
        </div>
      </header>
      <BottomNav />
    </>
  );
}
