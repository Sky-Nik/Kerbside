import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, loadYearData } from "@/lib/data";
import { BAS_DUE, QUARTERS, fyRange, summarise } from "@/lib/tax";
import { aud, pct } from "@/lib/fmt";

export default async function Dashboard() {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const [year, data] = await Promise.all([loadYear(supabase, fy), loadYearData(supabase, fy)]);
  const s = summarise(year, data);
  const { start, end } = fyRange(fy);
  const { count: missing } = await supabase.from("expenses").select("id", { count: "exact", head: true })
    .is("receipt_path", null).gte("date", start).lte("date", end);
  const noPct = year.pct.car.every((v) => !v);

  return (
    <main className="space-y-6">
      <h1 className="h1">FY {fy} overview</h1>
      {(noPct || !!missing) && (
        <div className="card space-y-1 border-amber-300 bg-amber-50 text-sm">
          {noPct && <p>Car business-use % is 0 for every quarter. <Link className="underline" href="/settings">Set it in Settings</Link> or car costs won’t be claimed.</p>}
          {!!missing && <p>{missing} expense{missing === 1 ? "" : "s"} this year {missing === 1 ? "has" : "have"} no receipt attached. <Link className="underline" href="/expenses">Review expenses</Link>.</p>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {s.bas.map((b, i) => (
          <Link key={i} href={`/income?q=${i}`} className="card block hover:border-blue-400">
            <div className="flex items-baseline justify-between">
              <h2 className="h2">{QUARTERS[i]}</h2><span className="muted">BAS due {BAS_DUE[i]}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-slate-500">Sales (G1)</dt><dd className="num">{aud(b.G1)}</dd>
              <dt className="text-slate-500">GST on sales</dt><dd className="num">{aud(b["1A"])}</dd>
              <dt className="text-slate-500">GST credits</dt><dd className="num">{aud(b["1B"])}</dd>
              <dt className="font-medium">{b.net < 0 ? "GST refund" : "GST to pay"}</dt>
              <dd className={`num font-medium ${b.net < 0 ? "text-green-700" : b.net > 0 ? "text-red-700" : ""}`}>{aud(Math.abs(b.net))}</dd>
              <dt className="text-slate-500">Profit</dt><dd className="num">{aud(s.profitByQuarter[i])}</dd>
            </dl>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card"><p className="muted">Business income (ex GST)</p><p className="text-2xl font-semibold">{aud(s.tax.income)}</p></div>
        <div className="card"><p className="muted">Total deductions</p><p className="text-2xl font-semibold">{aud(s.tax.totalExpenses)}</p></div>
        <div className="card"><p className="muted">Net business profit</p><p className="text-2xl font-semibold">{aud(s.tax.profit)}</p></div>
      </div>
      <div className="card text-sm">
        Logbook: {s.logbook.total ? <>business use <b>{pct(s.logbook.businessPct)}</b> over {s.logbook.total.toLocaleString()} km logged.</> :
          <>no trips logged yet. <Link className="underline" href="/logbook">Start a 12-week logbook</Link>.</>}
      </div>
    </main>
  );
}
