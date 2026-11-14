import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear } from "@/lib/data";
import { PCT_LABELS, logbook, fyRange, type PctKey } from "@/lib/tax";
import { pct } from "@/lib/fmt";
import { saveSettings } from "@/app/actions";
import { PageHead } from "@/components/QuarterTabs";

const TIPS: Record<PctKey, string> = {
  car: "Logbook % if you have one, otherwise a reasonable estimate (fine for BAS).",
  phone: "Share of total phone time used for driving.",
  internet: "Share of household internet used for the business (often ~5%).",
  music: "Only time with passengers in the car.",
  computer: "Share of computer time used for the business.",
};
const QN = ["Q1 Jul–Sep", "Q2 Oct–Dec", "Q3 Jan–Mar", "Q4 Apr–Jun"];

export default async function Settings() {
  const { supabase, user } = await requireUser();
  const fy = await getFy();
  const { start, end } = fyRange(fy);
  const [{ data: profile }, year, { data: trips }] = await Promise.all([
    supabase.from("profiles").select("*").maybeSingle(),
    loadYear(supabase, fy),
    supabase.from("trips").select("odo_start,odo_end,purpose").gte("date", start).lte("date", end),
  ]);
  const lb = logbook(trips ?? []);
  const toPct = (v: number) => Math.round(v * 1000) / 10;

  return (
    <main>
      <PageHead eyebrow={`FY ${fy}`} title="Settings" />
      <form action={saveSettings} className="space-y-6">
        <input type="hidden" name="fy" value={fy} />

        <section className="card rise rise-1">
          <h2 className="h2 mb-4">You & your business</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="field">Name<input name="name" defaultValue={profile?.name ?? ""} /></label>
            <label className="field">ABN<input name="abn" inputMode="numeric" defaultValue={profile?.abn ?? ""} placeholder="11 digits" /></label>
            <label className="field">Signed in as<input value={user.email ?? ""} readOnly disabled className="!bg-wash-2 !text-mute" /></label>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-wash p-4 hover:bg-wash-2">
              <input type="checkbox" name="gst_registered" defaultChecked={year.gst_registered} />
              <span><b className="block text-sm">Registered for GST</b><span className="text-[13px] text-mute">Required for rideshare from your first trip.</span></span>
            </label>
            <label className="field">Car expense method
              <select name="car_method" defaultValue={year.car_method}>
                <option value="logbook">Logbook (actual costs × business %)</option>
                <option value="cpk">Cents per km (max 5,000 km)</option>
              </select>
            </label>
          </div>
        </section>

        <section className="card rise rise-2">
          <h2 className="h2">Business-use percentages</h2>
          <p className="muted mb-4">Applied to expenses in each quarter.{lb.total ? <> Your logbook currently shows <b className="text-ink">{pct(lb.businessPct)}</b> car business use.</> : null}</p>
          <div className="space-y-4">
            {(Object.keys(PCT_LABELS) as PctKey[]).map((k) => (
              <div key={k} className="grid gap-3 border-b border-wash-2 pb-4 last:border-0 last:pb-0 lg:grid-cols-[220px_1fr]">
                <div><p className="font-bold">{PCT_LABELS[k]}</p><p className="text-[13px] text-mute">{TIPS[k]}</p></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[0, 1, 2, 3].map((q) => (
                    <label key={q} className="field"><span className="text-xs text-mute">{QN[q]}</span>
                      <span className="relative">
                        <input name={`pct:${k}:${q}`} type="number" min="0" max="100" step="0.1" defaultValue={toPct(year.pct[k]?.[q] ?? 0)} className="!pr-8" />
                        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-mute">%</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card rise rise-3">
          <h2 className="h2">ATO rates for FY {fy}</h2>
          <p className="muted mb-4">2026-27 starts with the 2025-26 figures until the ATO publishes new ones. Check ato.gov.au and update here.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="field">Car cost limit (incl GST)<input name="car_limit" type="number" step="0.01" defaultValue={year.car_limit} /></label>
            <label className="field">Cents per km rate ($)<input name="cpk_rate" type="number" step="0.01" defaultValue={year.cpk_rate} /></label>
          </div>
        </section>

        <div className="sticky bottom-20 z-20 flex justify-end lg:bottom-6">
          <button className="btn shadow-lg shadow-black/20">Save settings</button>
        </div>
      </form>
    </main>
  );
}
