import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear } from "@/lib/data";
import { addDays, fyRange, logbook, todayAu } from "@/lib/tax";
import { aud, auDate, kmFmt, pct } from "@/lib/fmt";
import { addFuel, addTrip, addVehicle, deleteRow, endVehicle, saveVehicle } from "@/app/actions";
import { fuelStats } from "@/lib/fuel";
import { ShiftTracker } from "@/components/ShiftTracker";
import { PageHead } from "@/components/QuarterTabs";
import { PlatformTile } from "@/components/PlatformTile";
import { Icon } from "@/components/Icon";
import { Tip } from "@/components/Tip";

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
  const { data: vehicleRows } = await supabase.from("vehicles").select("*").lte("start_date", end).or(`end_date.is.null,end_date.gte.${start}`).order("start_date");
  const vehicles = vehicleRows ?? [];
  const carName = (id: string | null) => (id ? vehicles.find((v) => v.id === id)?.name ?? "Other car" : year.vehicle || "Main car");
  const mainTrips = trips.filter((t) => !t.vehicle_id);
  const lastOdoOf = (id: string | null) => trips.find((t) => (t.vehicle_id ?? null) === id)?.odo_end ?? null;
  const { data: fillRows } = await supabase.from("fuel_fills").select("id,date,odometer,litres,cost").gte("date", start).lte("date", end);
  const fuel = fuelStats((fillRows ?? []).map((r) => ({ ...r, litres: Number(r.litres), cost: Number(r.cost) })));
  // On-trip km reported by platforms (from imported tax summaries) – supporting evidence, not odometer readings
  const { data: platformKm } = await supabase.from("income_entries").select("id,start_date,end_date,platform,km")
    .not("km", "is", null).gte("start_date", start).lte("start_date", end).order("start_date");
  const pkm = (platformKm ?? []).map((r) => ({ ...r, km: Number(r.km) }));
  const pkmTotal = pkm.reduce((t, r) => t + r.km, 0);
  const lb = logbook(mainTrips, year.odo_year_start, year.odo_year_end);
  // First trip starts from the car's starting odometer; later trips continue from the last one.
  const lastOdo = mainTrips[0]?.odo_end ?? year.odo_year_start ?? "";
  const tripMin = year.car_start_date && year.car_start_date > start ? year.car_start_date : start;
  const tripMax = year.car_end_date && year.car_end_date < end ? year.car_end_date : end;
  const privateKm = Math.max(0, lb.total - lb.rideshare - lb.other_abn - lb.employment);
  // 12-week logbook progress: continuous period from the first trip to the latest one (gaps count as private)
  const firstTrip = trips.length ? trips.reduce((m, t) => (t.date < m ? t.date : m), trips[0].date) : null;
  const lastTrip = trips.reduce((m, t) => ((t.end_date ?? t.date) > m ? (t.end_date ?? t.date) : m), firstTrip ?? "");
  const weeksDone = firstTrip ? Math.min(12, Math.floor(days(firstTrip, lastTrip) / 7)) : 0;
  const segs = [["rideshare", lb.rideshare], ["other_abn", lb.other_abn], ["employment", lb.employment], ["private", privateKm]] as const;

  return (
    <main>
      <PageHead eyebrow={`FY ${fy}`} title="Car logbook" />

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card-ink rise rise-1 lg:col-span-3">
          <p className="flex items-center gap-2 text-sm font-medium text-white/60">Business-use percentage<Tip k="businessUse" align="left" /></p>
          <p className="display mt-2 tabular-nums">{pct(lb.businessPct)}</p>
          <p className="mt-1 text-sm text-white/60">
            {kmFmt(lb.total)} km logged · est. {kmFmt(lb.annualBusinessKm)} business km this year
            {year.car_start_date && ` · car from ${auDate(year.car_start_date)}`}
          </p>
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
          <h2 className="h2 flex items-center gap-2">Car & odometer<Tip k="carOdometer" align="left" /></h2>
          <input type="hidden" name="fy" value={fy} />
          <label className="field">Car (make, model, rego)<input name="vehicle" defaultValue={year.vehicle ?? ""} placeholder="Toyota Camry Hybrid · ABC123" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="field">Start date
              <input name="car_start_date" type="date" min={start} max={end} defaultValue={year.car_start_date ?? ""} />
            </label>
            <label className="field">Odometer at start
              <input name="odo_year_start" type="number" inputMode="numeric" defaultValue={year.odo_year_start ?? ""} />
            </label>
            <label className="field"><span>End date <span className="text-[11px] font-normal text-mute">optional</span></span>
              <input name="car_end_date" type="date" min={start} max={end} defaultValue={year.car_end_date ?? ""} />
            </label>
            <label className="field">Odometer at end
              <input name="odo_year_end" type="number" inputMode="numeric" defaultValue={year.odo_year_end ?? ""} />
            </label>
          </div>
          <p className="muted">
            Bought the car this year? Use the purchase date and odometer. Leave the start date blank if you had the car on 1 July.
            End is 30 June unless you sold it. These set your trip dates, your first trip’s starting odometer and the depreciation days.
          </p>
          <button className="btn-secondary btn-sm mt-auto self-start">Save car</button>
        </form>
      </div>

      <p className="rise rise-3 mt-6 rounded-2xl bg-wash p-4 text-sm text-ink-2">
        Keep a continuous 12-week logbook. It stays valid for 5 years unless your driving pattern changes. Gaps between odometer readings count as private km.
      </p>

      <section className="card rise rise-3 mt-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="h2 flex items-center gap-2">Platform-reported kilometres<Tip k="platformKm" align="left" /></h2>
            <p className="muted max-w-2xl">“On trip mileage” from the tax summaries you import: distance with a passenger or order on board.
              It’s good supporting evidence, but it isn’t an odometer reading, so it doesn’t change your logbook %.</p>
          </div>
          <div className="text-right"><p className="text-2xl font-bold tabular-nums">{kmFmt(pkmTotal)} km</p><p className="muted">this year</p></div>
        </div>
        {pkm.length ? (
          <ul className="mt-3 divide-y divide-wash-2">
            {pkm.map((r) => (
              <li key={r.id} className="flex items-center gap-4 py-3">
                <PlatformTile name={r.platform} size={36} />
                <span className="flex-1 text-sm"><b className="block">{r.platform}</b><span className="text-mute">{auDate(r.start_date)} – {auDate(r.end_date)}</span></span>
                <span className="font-bold tabular-nums">{kmFmt(r.km)} km</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted mt-3">None yet. Import a monthly Uber tax summary on the Income page and its kilometres appear here.</p>}
        {lb.businessKm > 0 && pkmTotal > lb.businessKm && (
          <p className="mt-3 rounded-xl bg-[#fff8e6] p-3 text-sm">Platforms report more on-trip km ({kmFmt(pkmTotal)}) than your logbook’s business km ({kmFmt(lb.businessKm)}). Check for missing logbook trips.</p>
        )}
      </section>

      <section className="card rise rise-2 mt-8">
        <h2 className="h2 flex items-center gap-2">Other cars<Tip k="otherCars" align="left" /></h2>
        <p className="muted mb-4">Changed cars or drive two? Add each extra car here. Its trips and car expenses use its own logbook %, and its depreciation is worked out on its own.
          The car above stays your main car.</p>
        {vehicles.length > 0 && (
          <ul className="mb-5 divide-y divide-wash-2">
            {vehicles.map((v) => {
              const vlb = logbook(trips.filter((t) => t.vehicle_id === v.id));
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white"><Icon name="car" size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{v.name}{v.rego ? ` · ${v.rego}` : ""}</span>
                    <span className="block text-[13px] text-mute">{aud(Number(v.cost))} · from {auDate(v.start_date)}{v.end_date ? ` to ${auDate(v.end_date)}` : ""} · {vlb.total ? `${pct(vlb.businessPct)} business use (${kmFmt(vlb.total)} km logged)` : "no trips yet"}</span>
                  </span>
                  <form action={endVehicle} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={v.id} />
                    <label className="field"><span className="text-xs text-mute">Sold / stopped using</span><input name="end_date" type="date" defaultValue={v.end_date ?? ""} min={v.start_date} /></label>
                    <button className="btn-secondary btn-sm">Save</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        <form action={addVehicle} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="field lg:col-span-2">Car (make, model)<input name="name" required placeholder="e.g. Kia Niro EV" /></label>
          <label className="field">Rego<input name="rego" placeholder="ABC123" /></label>
          <label className="field">Cost incl on-road<input name="cost" type="number" step="0.01" min="0" required placeholder="0.00" /></label>
          <label className="field">First used for work<input name="start_date" type="date" required /></label>
          <button className="btn"><Icon name="plus" size={18} />Add car</button>
        </form>
      </section>

      <section className="card rise rise-3 mt-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="h2 flex items-center gap-2">Logbook mode<Tip k="logbookMode" align="left" /></h2>
            <p className="muted max-w-2xl">{weeksDone >= 12
              ? `12-week logbook done (${auDate(firstTrip!)} – ${auDate(addDays(firstTrip!, 83))}). It’s good for 5 years unless your driving pattern changes a lot.`
              : firstTrip ? `Week ${weeksDone + 1} of 12. Keep logging every shift until ${auDate(addDays(firstTrip, 83))}.` : "Log every shift for 12 weeks in a row to use the logbook method."}</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{weeksDone}/12 <span className="text-sm font-normal text-mute">weeks</span></p>
        </div>
        <div className="mt-3 flex h-2.5 gap-0.5" aria-label={`${weeksDone} of 12 weeks`}>
          {Array.from({ length: 12 }, (_, i) => <div key={i} className={`flex-1 rounded-full ${i < weeksDone ? "bg-black" : "bg-wash-2"}`} />)}
        </div>
        <div className="mt-5 border-t border-wash-2 pt-5"><ShiftTracker cars={[{ id: "", name: carName(null), lastOdo: lastOdo === "" ? null : Number(lastOdo) },
          ...vehicles.filter((v) => !v.end_date || v.end_date >= todayAu()).map((v) => ({ id: v.id, name: v.name, lastOdo: lastOdoOf(v.id) }))]} /></div>
      </section>

      <section className="card rise rise-3 mt-8">
        <h2 className="h2 flex items-center gap-2">Add a trip<Tip k="addTrip" align="left" /></h2>
        <p className="muted mb-4">For one day, leave “To” blank. Drove only for one purpose all week? Enter the whole week as one entry: the first and last day, with the odometer at the start and end.</p>
        <form action={addTrip} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <label className="field">From<input name="date" type="date" required min={tripMin} max={tripMax} /></label>
          <label className="field"><span>To <span className="text-[11px] font-normal text-mute">optional</span></span><input name="end_date" type="date" min={tripMin} max={tripMax} /></label>
          <label className="field">Odometer start<input name="odo_start" type="number" required defaultValue={lastOdo} /></label>
          <label className="field">Odometer end<input name="odo_end" type="number" required /></label>
          <label className="field"><span className="flex items-center gap-1.5">Purpose<Tip k="purpose" /></span>
            <select name="purpose" required>{Object.entries(PURPOSES).map(([v, p]) => <option key={v} value={v}>{p.label}</option>)}</select>
          </label>
          <label className="field">Description<input name="description" placeholder="For non-rideshare trips" /></label>
          {vehicles.length > 0 && (
            <label className="field">Car<select name="vehicle_id" defaultValue="">
              <option value="">{carName(null)}</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select></label>
          )}
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
                  <span className="block font-medium">{PURPOSES[t.purpose]?.label}{vehicles.length > 0 && <span className="font-normal text-mute"> · {carName(t.vehicle_id)}</span>}</span>
                  <span className="block truncate text-[13px] text-mute">{auDate(t.date)}{t.end_date ? ` – ${auDate(t.end_date)} (${days(t.date, t.end_date)} days)` : ""} ·{kmFmt(t.odo_start)} → {kmFmt(t.odo_end)}{t.description ? ` · ${t.description}` : ""}</span>
                </span>
                {(t.photos ?? []).map((ph: string, i: number) => ph && (
                  <a key={i} href={`/odometer/${t.id}?i=${i}`} target="_blank" rel="noopener" title={`Taken ${ph.split("/odometer/")[1]?.slice(0, 16).replace("T", " ")} UTC`}
                    className="pill bg-wash-2 py-1 text-xs hover:bg-wash"><Icon name="check" size={12} />{i ? "End" : "Start"} photo</a>
                ))}
                <span className="font-bold tabular-nums">{kmFmt(t.odo_end - t.odo_start)} km</span>
                <form action={deleteRow}><input type="hidden" name="table" value="trips" /><input type="hidden" name="id" value={t.id} /><button className="btn-danger">Delete</button></form>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card rise rise-4 mt-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="h2 flex items-center gap-2">Fuel tracker<Tip k="fuel" align="left" /></h2>
            <p className="muted max-w-2xl">Fill the tank up each time and note the odometer. Economy is worked out between fills.</p>
          </div>
          {fuel.per100 != null && (
            <div className="flex gap-6 text-right">
              <div><p className="text-2xl font-bold tabular-nums">{fuel.per100.toFixed(1)}</p><p className="muted">L/100 km</p></div>
              <div><p className="text-2xl font-bold tabular-nums">{(fuel.perKm! * 100).toFixed(1)}c</p><p className="muted">fuel per km</p></div>
            </div>
          )}
        </div>
        <form action={addFuel} className="mt-4 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="field">Date<input name="date" type="date" required min={start} max={end} defaultValue={todayAu() <= end ? todayAu() : end} /></label>
          <label className="field">Odometer<input name="odometer" type="number" required min="0" defaultValue={lastOdo} /></label>
          <label className="field">Litres<input name="litres" type="number" step="0.01" min="0.01" required /></label>
          <label className="field">Total paid<input name="cost" type="number" step="0.01" min="0" required placeholder="0.00" /></label>
          <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="as_expense" defaultChecked className="h-4 w-4 accent-black" />Also add as an expense</label>
          <button className="btn"><Icon name="plus" size={18} />Add fill-up</button>
        </form>
        {fuel.rows.length > 0 && (
          <ul className="mt-4 divide-y divide-wash-2">
            {fuel.rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className="min-w-0 flex-1"><span className="block font-medium">{auDate(r.date)} · {r.litres.toFixed(2)} L · {aud(r.cost)}</span>
                  <span className="block text-[13px] text-mute">{kmFmt(r.odometer)} km · {(r.perL * 100).toFixed(1)}c/L{r.per100 != null ? ` · ${kmFmt(r.km)} km since last · ${r.per100.toFixed(1)} L/100 km` : " · first fill"}</span></span>
                <form action={deleteRow}><input type="hidden" name="table" value="fuel_fills" /><input type="hidden" name="id" value={r.id} /><button className="btn-danger">Delete</button></form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
