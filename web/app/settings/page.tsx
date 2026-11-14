import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear } from "@/lib/data";
import { PCT_LABELS, QUARTERS, logbook, fyRange, type PctKey } from "@/lib/tax";
import { pct } from "@/lib/fmt";
import { saveSettings } from "@/app/actions";

const TIPS: Record<PctKey, string> = {
  car: "Logbook % if you have one, otherwise a reasonable estimate (fine for BAS).",
  phone: "Share of total phone time used for driving.",
  internet: "Share of household internet used for the business (often ~5%).",
  music: "Only time with passengers in the car.",
  computer: "Share of computer time used for the business.",
};

export default async function Settings() {
  const { supabase } = await requireUser();
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
    <main className="space-y-6">
      <h1 className="h1">Settings · FY {fy}</h1>
      <form action={saveSettings} className="space-y-6">
        <input type="hidden" name="fy" value={fy} />
        <section className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="field">Name<input name="name" defaultValue={profile?.name ?? ""} /></label>
          <label className="field">ABN<input name="abn" inputMode="numeric" defaultValue={profile?.abn ?? ""} /></label>
          <label className="field">Car expense method
            <select name="car_method" defaultValue={year.car_method}>
              <option value="logbook">Logbook (actual costs × business %)</option>
              <option value="cpk">Cents per km (max 5,000 km)</option>
            </select>
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input type="checkbox" name="gst_registered" defaultChecked={year.gst_registered} /> Registered for GST
          </label>
        </section>

        <section className="card overflow-x-auto">
          <h2 className="h2">Business-use percentages</h2>
          <p className="muted mb-2">Applied to expenses in each quarter. {lb.total ? <>Your logbook currently shows <b>{pct(lb.businessPct)}</b> car business use.</> : null}</p>
          <table className="tbl min-w-[640px]">
            <thead><tr><th>Item</th>{QUARTERS.map((q) => <th key={q}>{q} %</th>)}<th /></tr></thead>
            <tbody>
              {(Object.keys(PCT_LABELS) as PctKey[]).map((k) => (
                <tr key={k}>
                  <td className="font-medium">{PCT_LABELS[k]}</td>
                  {[0, 1, 2, 3].map((q) => (
                    <td key={q}><input className="inp w-20" name={`pct:${k}:${q}`} type="number" min="0" max="100" step="0.1"
                      defaultValue={toPct(year.pct[k]?.[q] ?? 0)} /></td>
                  ))}
                  <td className="muted">{TIPS[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="field">Car cost limit (incl GST)<input name="car_limit" type="number" step="0.01" defaultValue={year.car_limit} /></label>
          <label className="field">Cents per km rate ($)<input name="cpk_rate" type="number" step="0.01" defaultValue={year.cpk_rate} /></label>
          <p className="muted sm:col-span-2">
            ATO rates for this year. 2026-27 defaults to the 2025-26 figures until the ATO publishes new ones. Check ato.gov.au and update here.
          </p>
        </section>
        <button className="btn">Save settings</button>
      </form>
    </main>
  );
}
