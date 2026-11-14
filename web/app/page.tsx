import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, loadYearData, pickQuarter, requirePlatforms } from "@/lib/data";
import { BAS_DUE, fyRange, summarise } from "@/lib/tax";
import { aud, pct } from "@/lib/fmt";
import { Icon } from "@/components/Icon";
import { CategoryBars, IncomeExpenseChart } from "@/components/Charts";
import { EarningsPanel } from "@/components/EarningsPanel";
import { loadHistory } from "@/lib/history";

const QN = ["Jul – Sep", "Oct – Dec", "Jan – Mar", "Apr – Jun"];

export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const { supabase } = await requireUser();
  await requirePlatforms(supabase);
  const fy = await getFy();
  const [year, data] = await Promise.all([loadYear(supabase, fy), loadYearData(supabase, fy)]);
  const s = summarise(year, data);
  const { start, end } = fyRange(fy);
  const { count: missing } = await supabase.from("expenses").select("id", { count: "exact", head: true })
    .is("receipt_path", null).gte("date", start).lte("date", end);
  const noPct = year.pct.car.every((v) => !v);
  const cq = pickQuarter(undefined, fy);
  const cur = s.bas[cq];

  // Expenses by category (deductible, ex GST) – biggest first
  const t = s.tax;
  const sumQ = (a: number[]) => a.reduce((x, v) => x + v, 0);
  const categories = [
    ...(year.car_method === "cpk"
      ? [{ label: "Car (cents per km)", value: t.cpkTotal }]
      : [...t.carLines.map((l) => ({ label: `Car – ${l.label}`, value: sumQ(l.q) })),
        { label: "Car – Depreciation", value: t.depreciation }, { label: "Car – Loan interest", value: t.interest }]),
    ...t.feeLines.map((l) => ({ label: `Platform – ${l.label}`, value: sumQ(l.q) })),
    ...t.otherLines.map((l) => ({ label: l.label, value: sumQ(l.q) })),
  ].filter((c) => c.value > 0.004).sort((a, b) => b.value - a.value);
  const top = categories[0];
  const ratio = t.income > 0 ? t.totalExpenses / t.income : 0;
  const qIncome = s.q.netIncome;
  const qExpenses = [0, 1, 2, 3].map((i) => s.q.fees[i] + s.q.expenses[i]);
  const history = await loadHistory(supabase, fy, { business: t.income, wages: Number(year.wages) || 0, other: Number(year.other_income) || 0 });

  // Earnings panel: all-time entries and expenses (small tables), past years from uploaded documents
  const sp = await searchParams;
  const view = sp.view === "month" || sp.view === "year" ? sp.view : "week";
  const today = new Date().toISOString().slice(0, 10);
  const at = typeof sp.at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.at) ? sp.at : today;
  const [{ data: allEntries }, { data: allExpenses }] = await Promise.all([
    supabase.from("income_entries").select("start_date,platform,lines"),
    supabase.from("expenses").select("date,amount"),
  ]);
  // Past years: everything the return counted as earned income (some years platforms were lodged as wages).
  const pastYears = history.filter((h) => h.source !== "Kerbside (this year)").map((h) => ({ fy: h.fy, business: h.business + h.wages, source: h.source }));

  return (
    <main className="space-y-6 pt-8">
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Financial year {fy}</p>
          <h1 className="h1">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/income" className="btn-secondary btn-sm"><Icon name="income" size={16} />Enter income</Link>
          <Link href="/expenses" className="btn btn-sm"><Icon name="plus" size={16} />Add expense</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <EarningsPanel view={view} at={at} today={today} entries={allEntries ?? []}
          expenses={(allExpenses ?? []).map((x) => ({ date: x.date, amount: Number(x.amount) }))}
          pastYears={pastYears} fyProfit={{ fy, profit: t.profit }} />

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

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card rise rise-2 lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="h2">Income vs expenses</h2>
              <p className="muted">By quarter, excluding GST</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tracking-[-0.02em] tabular-nums">{t.income > 0 ? `${Math.round(ratio * 100)}%` : "–"}</p>
              <p className="muted">of income spent on expenses</p>
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-black" aria-hidden>
            <div className="h-full bg-warn" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-warn" />Expenses {aud(t.totalExpenses)}</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-black" />Income {aud(t.income)}</span>
          </div>
          <div className="mt-5"><IncomeExpenseChart income={qIncome} expenses={qExpenses} /></div>
          {(t.depreciation > 0 || t.interest > 0) && (
            <p className="muted mt-1">Car depreciation and loan interest are yearly, so they’re in the totals but not the quarterly bars.</p>
          )}
        </section>

        <section className="card rise rise-3 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="h2">Where your money goes</h2>
              <p className="muted">Deductible expenses this year</p>
            </div>
            <Link href="/expenses" className="btn-ghost shrink-0">Expenses<Icon name="chevron" size={16} /></Link>
          </div>
          <div className="my-4 rounded-xl bg-wash p-4">
            <p className="text-xs text-mute">Total expenses</p>
            <p className="text-2xl font-bold tabular-nums">{aud(t.totalExpenses)}</p>
            {top && (
              <p className="mt-1 text-sm">
                Biggest: <b>{top.label}</b> at {Math.round((top.value / (t.totalExpenses || 1)) * 100)}%
              </p>
            )}
          </div>
          {categories.length ? <CategoryBars items={categories.slice(0, 6)} total={t.totalExpenses} />
            : <p className="muted">No expenses yet. Add fuel, rego and other costs on the Expenses page.</p>}
          {categories.length > 6 && <p className="muted mt-3">+ {categories.length - 6} more categories</p>}
        </section>
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
            <Link key={i} href={`/reports/view?kind=bas&q=${i}&fy=${fy}`} className={i === cq ? "btn btn-sm" : "btn-secondary btn-sm"}>
              <Icon name="bas" size={14} />BAS Q{i + 1}
            </Link>
          ))}
          <Link href={`/reports/view?kind=tax&fy=${fy}`} className="btn-secondary btn-sm !bg-[#fff4d9] ring-1 ring-warn">
            <Icon name="tax" size={14} />Tax summary {fy}
          </Link>
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
