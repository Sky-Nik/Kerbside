import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, loadYearData, pickQuarter } from "@/lib/data";
import { BAS_DUE, fyRange, summarise } from "@/lib/tax";
import { aud, pct } from "@/lib/fmt";
import { Icon } from "@/components/Icon";

const QN = ["Jul – Sep", "Oct – Dec", "Jan – Mar", "Apr – Jun"];

export default async function Dashboard() {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const [year, data] = await Promise.all([loadYear(supabase, fy), loadYearData(supabase, fy)]);
  const s = summarise(year, data);
  const { start, end } = fyRange(fy);
  const { count: missing } = await supabase.from("expenses").select("id", { count: "exact", head: true })
    .is("receipt_path", null).gte("date", start).lte("date", end);
  const noPct = year.pct.car.every((v) => !v);
  const cq = pickQuarter(undefined, fy);
  const cur = s.bas[cq];

  return (
    <main className="space-y-6 pt-8">
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Financial year {fy}</p>
          <h1 className="h1">Your earnings</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/income" className="btn-secondary btn-sm"><Icon name="income" size={16} />Enter income</Link>
          <Link href="/expenses" className="btn btn-sm"><Icon name="plus" size={16} />Add expense</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Hero */}
        <section className="card-ink rise rise-1 relative overflow-hidden lg:col-span-3">
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full border-[40px] border-white/[0.04]" />
          <p className="text-sm font-medium text-white/60">Net business profit · FY {fy}</p>
          <p className="display mt-2 tabular-nums">{aud(s.tax.profit)}</p>
          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/15 pt-5">
            <div><p className="text-xs text-white/50">Income</p><p className="mt-1 text-lg font-bold tabular-nums">{aud(s.tax.income)}</p></div>
            <div><p className="text-xs text-white/50">Deductions</p><p className="mt-1 text-lg font-bold tabular-nums">{aud(s.tax.totalExpenses)}</p></div>
            <div><p className="text-xs text-white/50">GST {s.basYear.net < 0 ? "refund" : "owing"}</p><p className="mt-1 text-lg font-bold tabular-nums">{aud(Math.abs(s.basYear.net))}</p></div>
          </div>
        </section>

        {/* Current BAS */}
        <Link href="/bas" className="card-wash rise rise-2 group flex flex-col justify-between lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">This quarter · Q{cq + 1}</p>
              <p className="mt-1 text-sm text-mute">BAS due {BAS_DUE[cq]}</p>
            </div>
            <Icon name="chevron" className="text-mute transition group-hover:translate-x-0.5 group-hover:text-ink" />
          </div>
          <div className="mt-6">
            <p className="text-sm font-medium text-ink-2">{cur.net < 0 ? "Estimated GST refund" : "Estimated GST to pay"}</p>
            <p className={`mt-1 text-4xl font-bold tracking-[-0.02em] tabular-nums ${cur.net < 0 ? "text-pos" : ""}`}>{aud(Math.abs(cur.net))}</p>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <div><dt className="text-xs text-mute">G1 sales</dt><dd className="font-medium tabular-nums">{aud(cur.G1)}</dd></div>
            <div><dt className="text-xs text-mute">1A</dt><dd className="font-medium tabular-nums">{aud(cur["1A"])}</dd></div>
            <div><dt className="text-xs text-mute">1B</dt><dd className="font-medium tabular-nums">{aud(cur["1B"])}</dd></div>
          </dl>
        </Link>
      </div>

      <section className="card rise rise-3 flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4 lg:flex-1">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black text-white"><Icon name="tax" /></span>
          <div>
            <h2 className="h2">Reports for lodging</h2>
            <p className="muted">PDFs laid out the way the ATO asks: BAS labels each quarter, and the business schedule (P8) for your tax return.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <a key={i} href={`/reports/bas?q=${i}&fy=${fy}`} className={i === cq ? "btn btn-sm" : "btn-secondary btn-sm"}>
              <Icon name="upload" size={14} className="rotate-180" />BAS Q{i + 1}
            </a>
          ))}
          <a href={`/reports/tax?fy=${fy}`} className="btn-secondary btn-sm !bg-[#fff4d9] ring-1 ring-warn">
            <Icon name="upload" size={14} className="rotate-180" />Tax summary {fy}
          </a>
        </div>
      </section>

      {(noPct || !!missing) && (
        <div className="rise rise-3 grid gap-3 sm:grid-cols-2">
          {noPct && (
            <Link href="/settings" className="flex items-center gap-3 rounded-2xl bg-[#fff8e6] p-4 ring-1 ring-warn/50 hover:ring-warn">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-warn text-black"><Icon name="alert" size={18} /></span>
              <span className="text-sm"><b className="block">Set your car business-use %</b><span className="text-mute">Car costs aren’t being claimed yet.</span></span>
              <Icon name="chevron" className="ml-auto text-mute" />
            </Link>
          )}
          {!!missing && (
            <Link href="/expenses" className="flex items-center gap-3 rounded-2xl bg-wash p-4 hover:bg-wash-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white"><Icon name="receipt" size={18} /></span>
              <span className="text-sm"><b className="block">{missing} expense{missing === 1 ? "" : "s"} missing a receipt</b><span className="text-mute">Keep records for 5 years.</span></span>
              <Icon name="chevron" className="ml-auto text-mute" />
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card rise rise-3 lg:col-span-3">
          <h2 className="h2 mb-2">Quarters</h2>
          <ul>
            {s.bas.map((b, i) => (
              <li key={i}>
                <Link href={`/income?q=${i}`} className="group -mx-2 flex items-center gap-4 rounded-xl px-2 py-3 hover:bg-wash">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${i === cq ? "bg-black text-white" : "bg-wash-2"}`}>Q{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{QN[i]}</span>
                    <span className="block text-[13px] text-mute">Sales {aud(b.G1)} · Profit {aud(s.profitByQuarter[i])}</span>
                  </span>
                  <span className="text-right">
                    <span className={`block font-bold tabular-nums ${b.net < 0 ? "text-pos" : ""}`}>{aud(Math.abs(b.net))}</span>
                    <span className="block text-[11px] text-mute">GST {b.net < 0 ? "refund" : "to pay"}</span>
                  </span>
                  <Icon name="chevron" size={18} className="text-mute-2 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Link href="/logbook" className="card rise rise-4 group flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="h2">Logbook</h2>
            <Icon name="chevron" className="text-mute group-hover:text-ink" />
          </div>
          {s.logbook.total ? (
            <>
              <p className="mt-4 text-5xl font-bold tracking-[-0.03em] tabular-nums">{pct(s.logbook.businessPct)}</p>
              <p className="text-sm text-mute">business use over {s.logbook.total.toLocaleString()} km</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-wash-2">
                <div className="h-full rounded-full bg-black" style={{ width: `${Math.round(s.logbook.businessPct * 100)}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-mute"><span>Business</span><span>Private</span></div>
            </>
          ) : (
            <div className="mt-4 flex flex-1 flex-col justify-between">
              <p className="text-sm text-mute">Log a continuous 12-week period to work out your car business-use %. It lasts 5 years.</p>
              <span className="btn-secondary btn-sm mt-4 self-start">Start logbook</span>
            </div>
          )}
        </Link>
      </div>
    </main>
  );
}
