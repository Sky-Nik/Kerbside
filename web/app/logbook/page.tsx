import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear } from "@/lib/data";
import { fyRange, logbook } from "@/lib/tax";
import { auDate, kmFmt, pct } from "@/lib/fmt";
import { addTrip, deleteRow, saveVehicle } from "@/app/actions";

const PURPOSES: Record<string, string> = {
  rideshare: "Rideshare & delivery", other_abn: "Other ABN work", employment: "Employment (TFN)", private: "Private",
};

export default async function Logbook() {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const { start, end } = fyRange(fy);
  const [year, { data }] = await Promise.all([
    loadYear(supabase, fy),
    supabase.from("trips").select("*").gte("date", start).lte("date", end).order("date").order("odo_start"),
  ]);
  const trips = data ?? [];
  const lb = logbook(trips, year.odo_year_start, year.odo_year_end);
  const lastOdo = trips.at(-1)?.odo_end ?? "";

  return (
    <main className="space-y-6">
      <h1 className="h1">Car logbook · FY {fy}</h1>
      <p className="text-sm text-slate-600">
        Keep a logbook for a continuous 12 weeks. The result is valid for 5 years unless your driving pattern changes.
        Gaps between odometer readings count as private km.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="h2 mb-2">Summary</h2>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt>Total km in logbook</dt><dd className="num">{kmFmt(lb.total)}</dd>
            <dt>Rideshare & delivery</dt><dd className="num">{kmFmt(lb.rideshare)}</dd>
            <dt>Other ABN work</dt><dd className="num">{kmFmt(lb.other_abn)}</dd>
            <dt>Employment</dt><dd className="num">{kmFmt(lb.employment)}</dd>
            <dt className="font-semibold">Business-use %</dt><dd className="num font-semibold">{pct(lb.businessPct)}</dd>
            <dt>Est. business km for year</dt><dd className="num">{kmFmt(lb.annualBusinessKm)}</dd>
          </dl>
        </section>
        <form action={saveVehicle} className="card space-y-2">
          <h2 className="h2">Car & odometer</h2>
          <input type="hidden" name="fy" value={fy} />
          <label className="field">Car (make, model, rego)<input name="vehicle" defaultValue={year.vehicle ?? ""} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="field">Odometer 1 July<input name="odo_year_start" type="number" defaultValue={year.odo_year_start ?? ""} /></label>
            <label className="field">Odometer 30 June<input name="odo_year_end" type="number" defaultValue={year.odo_year_end ?? ""} /></label>
          </div>
          <p className="muted">Used with the logbook % to estimate business km for the cents-per-km method.</p>
          <button className="btn">Save</button>
        </form>
      </div>

      <section className="card space-y-3">
        <h2 className="h2">Add trip</h2>
        <form action={addTrip} className="grid items-end gap-2 sm:grid-cols-6">
          <label className="field">Date<input name="date" type="date" required min={start} max={end} /></label>
          <label className="field">Odometer start<input name="odo_start" type="number" required defaultValue={lastOdo} /></label>
          <label className="field">Odometer end<input name="odo_end" type="number" required /></label>
          <label className="field">Purpose
            <select name="purpose" required>{Object.entries(PURPOSES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="field">Description<input name="description" placeholder="Needed for non-rideshare work trips" /></label>
          <button className="btn">Add trip</button>
        </form>
        <div className="overflow-x-auto">
          <table className="tbl min-w-[600px]">
            <thead><tr><th>Date</th><th className="num">Start</th><th className="num">End</th><th className="num">Km</th><th>Purpose</th><th>Description</th><th /></tr></thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id}>
                  <td>{auDate(t.date)}</td><td className="num">{kmFmt(t.odo_start)}</td><td className="num">{kmFmt(t.odo_end)}</td>
                  <td className="num">{kmFmt(t.odo_end - t.odo_start)}</td><td>{PURPOSES[t.purpose]}</td><td>{t.description}</td>
                  <td className="text-right"><form action={deleteRow}><input type="hidden" name="table" value="trips" /><input type="hidden" name="id" value={t.id} /><button className="btn-danger">Delete</button></form></td>
                </tr>
              ))}
              {!trips.length && <tr><td colSpan={7} className="muted">No trips yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
