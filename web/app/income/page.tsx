import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, pickQuarter } from "@/lib/data";
import { PLATFORMS, gstOf, monthsOf, platformMonth } from "@/lib/tax";
import { aud, auDate, monthName } from "@/lib/fmt";
import { addOtherIncome, deleteRow, savePlatformMonth } from "@/app/actions";
import { QuarterTabs } from "@/components/QuarterTabs";

type PM = { month: string; platform: string; lines: Record<string, number>; fees: Record<string, number> };

export default async function Income({ searchParams }: PageProps<"/income">) {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const q = pickQuarter((await searchParams).q, fy);
  const months = monthsOf(fy, q);
  const lastDay = new Date(Date.UTC(Number(months[2].slice(0, 4)), Number(months[2].slice(5, 7)), 0)).toISOString().slice(0, 10);
  const [year, pmRes, oiRes] = await Promise.all([
    loadYear(supabase, fy),
    supabase.from("platform_months").select("month,platform,lines,fees").in("month", months),
    supabase.from("other_income").select("*").gte("date", months[0]).lte("date", lastDay).order("date"),
  ]);
  const saved = new Map((pmRes.data as PM[] ?? []).map((r) => [`${r.month}|${r.platform}`, r]));
  const other = oiRes.data ?? [];

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Income · FY {fy}</h1>
        <QuarterTabs path="/income" q={q} />
      </div>
      <p className="text-sm text-slate-600">
        Copy the figures from each platform’s <b>monthly tax summary</b> (not weekly statements). Leave a line blank if
        it isn’t on your summary. Pass-through fees (split fare, tolls, airport, booking, city fees) fill in from income;
        type a different amount only if your summary shows one.
      </p>

      {months.map((m) => (
        <section key={m} className="card space-y-3">
          <h2 className="h2">{monthName(m)}</h2>
          {Object.entries(PLATFORMS).map(([platform, def]) => {
            const row = saved.get(`${m}|${platform}`);
            const lines = row?.lines ?? {};
            const fees = row?.fees ?? {};
            const calc = platformMonth(platform, lines, fees, year.gst_registered);
            const feeTypes = [...new Set([...def.fees, ...Object.values(def.passThrough)])];
            return (
              <details key={platform} open={!!row} className="rounded-md border border-slate-200">
                <summary className="flex cursor-pointer flex-wrap justify-between gap-2 px-3 py-2 text-sm">
                  <span className="font-medium">{platform}</span>
                  {row && <span className="text-slate-600">Income {aud(calc.sales)} · Fees {aud(calc.feeTotal)}</span>}
                </summary>
                <form action={savePlatformMonth} key={JSON.stringify(row ?? {})} className="space-y-3 border-t border-slate-100 p-3">
                  <input type="hidden" name="month" value={m} />
                  <input type="hidden" name="platform" value={platform} />
                  <p className="muted">Income (incl GST)</p>
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {def.lines.map((l) => (
                      <label key={l} className="field">{l}
                        <input name={`line:${l}`} type="number" step="0.01" inputMode="decimal" defaultValue={lines[l] ?? ""} />
                      </label>
                    ))}
                  </div>
                  <p className="muted">Fees deducted by {platform} (incl GST)</p>
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {feeTypes.map((t) => {
                      const derived = calc.feeRows.find((r) => r.type === t)?.derived ?? 0;
                      const auto = Object.values(def.passThrough).includes(t);
                      return (
                        <label key={t} className="field">{t}{auto && <span className="muted">blank = from income</span>}
                          <input name={`fee:${t}`} type="number" step="0.01" inputMode="decimal" defaultValue={fees[t] ?? ""}
                            placeholder={auto ? derived.toFixed(2) : ""} />
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="muted">GST on sales {aud(calc.gst)} · GST on fees {aud(calc.feeGst)}</span>
                    <button className="btn">Save {platform}</button>
                  </div>
                </form>
              </details>
            );
          })}
        </section>
      ))}

      <section className="card space-y-3">
        <h2 className="h2">Other rideshare, delivery & ABN income</h2>
        <p className="muted">Other platforms or ABN work: one line per deposit or monthly total. Tick GST-free only for exempt income such as NDIS.</p>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Payer</th><th>Description</th><th className="num">Amount</th><th className="num">GST</th><th /></tr></thead>
          <tbody>
            {other.map((o) => (
              <tr key={o.id}>
                <td>{auDate(o.date)}</td><td>{o.payer}</td><td>{o.description}{o.gst_free && <span className="muted"> (GST-free)</span>}</td>
                <td className="num">{aud(o.amount)}</td><td className="num">{aud(gstOf(o.amount, year.gst_registered, o.gst_free))}</td>
                <td className="text-right">
                  <form action={deleteRow}><input type="hidden" name="table" value="other_income" /><input type="hidden" name="id" value={o.id} /><button className="btn-danger">Delete</button></form>
                </td>
              </tr>
            ))}
            {!other.length && <tr><td colSpan={6} className="muted">None this quarter.</td></tr>}
          </tbody>
        </table>
        <form action={addOtherIncome} className="grid items-end gap-2 sm:grid-cols-6">
          <label className="field">Date<input name="date" type="date" required min={months[0]} max={lastDay} /></label>
          <label className="field">Payer<input name="payer" required placeholder="e.g. Ola" /></label>
          <label className="field sm:col-span-2">Description<input name="description" /></label>
          <label className="field">Amount incl GST<input name="amount" type="number" step="0.01" required /></label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="gst_free" /> GST-free</label>
            <button className="btn">Add</button>
          </div>
        </form>
      </section>
    </main>
  );
}
