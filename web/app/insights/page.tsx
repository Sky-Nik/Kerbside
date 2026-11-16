import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, loadYearData } from "@/lib/data";
import { fyRange, summarise } from "@/lib/tax";
import { insights } from "@/lib/insights";
import { aud, auDate, pct } from "@/lib/fmt";
import { PageHead } from "@/components/QuarterTabs";
import { PlatformTile } from "@/components/PlatformTile";
import { Tip } from "@/components/Tip";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function Insights() {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const { start, end } = fyRange(fy);
  const [year, data, { data: rows }] = await Promise.all([
    loadYear(supabase, fy), loadYearData(supabase, fy),
    supabase.from("income_entries").select("start_date,platform,lines,fees,hours,km").gte("start_date", start).lte("start_date", end),
  ]);
  const t = summarise(year, data).tax;
  const r = insights(rows ?? [], { deductible: t.carClaim + t.otherTotal });
  const maxWeek = Math.max(1, ...r.weeks.map((w) => w.total));
  const maxMonth = Math.max(1, ...r.months.map((m) => m.total));
  const top = r.platforms[0];

  return (
    <main>
      <PageHead eyebrow={`FY ${fy}`} title="Insights" />
      {!r.weeks.length ? (
        <div className="card-wash py-12 text-center"><p className="font-medium">No earnings yet this year</p>
          <p className="muted">Add a few weeks on the <Link href="/income" className="underline">Income</Link> page and your insights appear here.</p></div>
      ) : (
        <div className="space-y-6">
          <section className="card-ink rise grid gap-6 sm:grid-cols-4">
            <div><p className="text-sm text-white/60">Average week</p><p className="mt-1 text-3xl font-bold tabular-nums">{aud(r.avgWeek)}</p></div>
            <div><p className="text-sm text-white/60">Best week</p><p className="mt-1 text-3xl font-bold tabular-nums">{aud(r.bestWeek!.total)}</p><p className="text-sm text-white/60">from {auDate(r.bestWeek!.start)}</p></div>
            <div><p className="text-sm text-white/60">Last 4 weeks vs the 4 before</p>
              <p className={`mt-1 text-3xl font-bold ${r.trend == null ? "" : r.trend >= 0 ? "text-[#3dd68c]" : "text-[#ff6b5b]"}`}>{r.trend == null ? "–" : `${r.trend >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(r.trend * 100))}%`}</p></div>
            <div><p className="flex items-center gap-1.5 text-sm text-white/60">Your costs per hour online<Tip text="This year’s car costs and other business expenses you can claim, divided by the hours online you’ve entered. Platform fees aren’t included: they’re already out of your net fare." /></p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{r.costPerHour != null ? aud(r.costPerHour) : "–"}</p></div>
          </section>

          <section className="card rise rise-1">
            <h2 className="h2 flex items-center gap-2">Which platform pays best<Tip k="hours" align="left" /></h2>
            <p className="muted mb-4">{top?.perHourAfterCosts != null
              ? <>After your costs, <b className="text-ink">{top.platform}</b> pays you the most: {aud(top.perHourAfterCosts)} for each hour online.</>
              : "Add your hours online with each week’s earnings to compare platforms per hour."}</p>
            <div className="overflow-x-auto">
              <table className="tbl w-full min-w-[640px] text-sm">
                <thead><tr className="text-left text-mute"><th className="py-2">Platform</th><th className="text-right">Earned</th><th className="text-right">Weeks</th><th className="text-right">Per hour</th><th className="text-right">Per hour after costs</th><th className="text-right">Per km</th><th className="text-right">Platform fee</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {r.platforms.map((p) => (
                    <tr key={p.platform}>
                      <td className="py-3"><span className="flex items-center gap-2.5 font-bold"><PlatformTile name={p.platform} size={28} />{p.platform}</span></td>
                      <td className="text-right tabular-nums">{aud(p.earned)}</td>
                      <td className="text-right tabular-nums">{p.weeks}</td>
                      <td className="text-right tabular-nums">{p.perHour != null ? aud(p.perHour) : "–"}</td>
                      <td className="text-right font-bold tabular-nums">{p.perHourAfterCosts != null ? aud(p.perHourAfterCosts) : "–"}</td>
                      <td className="text-right tabular-nums">{p.perKm != null ? aud(p.perKm) : "–"}</td>
                      <td className="text-right tabular-nums">{p.feeShare ? pct(p.feeShare) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted mt-3">Earned is net fare plus promotions and tips. Per km uses the on-trip kilometres from imported tax summaries.</p>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card rise rise-2">
              <h2 className="h2 mb-4">Week by week</h2>
              <div className="flex h-44 items-end gap-1">
                {r.weeks.slice(-26).map((w) => (
                  <div key={w.start} title={`${auDate(w.start)}: ${aud(w.total)}`} className={`flex-1 rounded-t ${w.start === r.bestWeek!.start ? "bg-warn" : "bg-ink"}`}
                    style={{ height: `${(w.total / maxWeek) * 100}%` }} />
                ))}
              </div>
              <p className="muted mt-2">Last {Math.min(26, r.weeks.length)} weeks. Yellow is your best week.</p>
            </section>
            <section className="card rise rise-2">
              <h2 className="h2 mb-4">Month by month</h2>
              <ul className="space-y-2.5">
                {r.months.map((m) => (
                  <li key={m.month} className="grid grid-cols-[56px_1fr_96px] items-center gap-3 text-sm">
                    <span className="text-mute">{MON[+m.month.slice(5) - 1]} {m.month.slice(2, 4)}</span>
                    <span className="h-3 rounded-full bg-wash-2"><span className="block h-3 rounded-full bg-ink" style={{ width: `${(m.total / maxMonth) * 100}%` }} /></span>
                    <span className="text-right font-bold tabular-nums">{aud(m.total)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <p className="muted">Best days and times of day need trip-by-trip data, which weekly totals don’t include.</p>
        </div>
      )}
    </main>
  );
}
