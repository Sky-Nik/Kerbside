import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear } from "@/lib/data";
import { fyRange, logbook } from "@/lib/tax";
import { auDate, kmFmt, pct } from "@/lib/fmt";
import { addTrip, deleteRow, saveVehicle } from "@/app/actions";
import { PageHead } from "@/components/QuarterTabs";
import { Icon } from "@/components/Icon";

const PURPOSES: Record<string, { label: string; color: string }> = {
  rideshare: { label: "Rideshare & delivery", color: "bg-white" },
  other_abn: { label: "Other ABN work", color: "bg-white/60" },
  employment: { label: "Employment (TFN)", color: "bg-white/35" },
  private: { label: "Private", color: "bg-white/15" },
};

const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;

export default async function Logbook() {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const { start, end } = fyRange(fy);
  const [year, { data }] = await Promise.all([
    loadYear(supabase, fy),
    supabase.from("trips").select("*").gte("date", start).lte("date", end).order("date", { ascending: false }).order("odo_start", { ascending: false }),
  ]);
  const trips = data ?? [];
  const lb = logbook(trips, year.odo_year_start, year.odo_year_end);
  const lastOdo = trips[0]?.odo_end ?? "";
  const privateKm = Math.max(0, lb.total - lb.rideshare - lb.other_abn - lb.employment);
  const segs = [["rideshare", lb.rideshare], ["other_abn", lb.other_abn], ["employment", lb.employment], ["private", privateKm]] as const;

  return (
    <main>
      <PageHead eyebrow={`FY ${fy}`} title="Car logbook" />

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card-ink rise rise-1 lg:col-span-3">
          <p className="text-sm font-medium text-white/60">Business-use percentage</p>
          <p className="display mt-2 tabular-nums">{pct(lb.businessPct)}</p>
          <p className="mt-1 text-sm text-white/60">{kmFmt(lb.total)} km logged · est. {kmFmt(lb.annualBusinessKm)} business km this year</p>
          <div className="mt-6 flex h-3 gap-0.5 overflow-hidden rounded-full bg-white/10">
            {lb.total > 0 && segs.map(([k, v]) => v > 0 && <div key={k} className={PURPOSES[k].color} style={{ width: `${(v / lb.total) * 100}%` }} />)}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {segs.map(([k, v]) => (
              <div key={k}>
                <dt className="flex items-center gap-1.5 text-xs text-white/60"><span className={`h-2 w-2 rounded-full ${PURPOSES[k].color}`} />{PURPOSES[k].label}</dt>
                <dd className="mt-0.5 font-bold tabular-nums">{kmFmt(v)} km</dd>
              </div>
            ))}
          </dl>
        </section>

        <form action={saveVehicle} className="card rise rise-2 flex flex-col gap-3 lg:col-span-2">
          <h2 className="h2">Car & odometer</h2>
          <input type="hidden" name="fy" value={fy} />
          <label className="field">Car (make, model, rego)<input name="vehicle" defaultValue={year.vehicle ?? ""} placeholder="Toyota Camry Hybrid · ABC123" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="field">Odometer 1 July<input name="odo_year_start" type="number" defaultValue={year.odo_year_start ?? ""} /></label>
            <label className="field">Odometer 30 June<input name="odo_year_end" type="number" defaultValue={year.odo_year_end ?? ""} /></label>
          </div>
          <p className="muted">Annual km × logbook % gives business km for the cents-per-km method.</p>
          <button className="btn-secondary btn-sm mt-auto self-start">Save car</button>
        </form>
      </div>

      <p className="rise rise-3 mt-6 rounded-2xl bg-wash p-4 text-sm text-ink-2">
        Keep a continuous 12-week logbook. It stays valid for 5 years unless your driving pattern changes. Gaps between odometer readings count as private km.
      </p>

      <section className="card rise rise-3 mt-8">
        <h2 className="h2">Add a trip</h2>
        <p className="muted mb-4">For one day, leave “To” blank. Drove only for one purpose all week? Enter the whole week as one entry: the first and last day, with the odometer at the start and end.</p>
        <form action={addTrip} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <label className="field">From<input name="date" type="date" required min={start} max={end} /></label>
          <label className="field"><span>To <span className="text-[11px] font-normal text-mute">optional</span></span><input name="end_date" type="date" min={start} max={end} /></label>
          <label className="field">Odometer start<input name="odo_start" type="number" required defaultValue={lastOdo} /></label>
          <label className="field">Odometer end<input name="odo_end" type="number" required /></label>
          <label className="field">Purpose
            <select name="purpose" required>{Object.entries(PURPOSES).map(([v, p]) => <option key={v} value={v}>{p.label}</option>)}</select>
          </label>
          <label className="field">Description<input name="description" placeholder="For non-rideshare trips" /></label>
          <button className="btn"><Icon name="plus" size={18} />Add trip</button>
        </form>
      </section>

      <section className="rise rise-4 mt-8">
        <h2 className="mb-2 text-xl font-bold tracking-[-0.01em]">Trips</h2>
        {trips.length === 0 ? (
          <div className="card-wash py-10 text-center">
            <Icon name="car" size={28} className="mx-auto text-mute" />
            <p className="mt-2 font-medium">No trips yet</p>
            <p className="muted">Record odometer start and end for each shift or trip.</p>
          </div>
        ) : (
          <ul className="divide-y divide-wash-2">
            {trips.map((t) => (
              <li key={t.id} className="flex items-center gap-4 py-3.5">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${t.purpose === "private" ? "bg-wash-2" : "bg-black text-white"}`}><Icon name="car" size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{PURPOSES[t.purpose]?.label}</span>
                  <span className="block truncate text-[13px] text-mute">{auDate(t.date)}{t.end_date ? ` – ${auDate(t.end_date)} (${days(t.date, t.end_date)} days)` : ""} ·{kmFmt(t.odo_start)} → {kmFmt(t.odo_end)}{t.description ? ` · ${t.description}` : ""}</span>
                </span>
                <span className="font-bold tabular-nums">{kmFmt(t.odo_end - t.odo_start)} km</span>
                <form action={deleteRow}><input type="hidden" name="table" value="trips" /><input type="hidden" name="id" value={t.id} /><button className="btn-danger">Delete</button></form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
