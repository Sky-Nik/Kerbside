import Link from "next/link";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { Landing } from "@/components/landing/Landing";
import { getFy, loadYear, loadYearData, pickQuarter, requirePlatforms } from "@/lib/data";
import { BAS_DUE, addDays, expenseCalc, fyRange, quarterOf, summarise, todayAu } from "@/lib/tax";
import { generateRecurring } from "@/lib/recurring";
import { buildReminders } from "@/lib/reminders";
import { aud } from "@/lib/fmt";
import { Icon } from "@/components/Icon";
import { CategoryBars, IncomeExpenseChart } from "@/components/Charts";
import { EarningsPanel } from "@/components/EarningsPanel";
import { defaultWeekAt } from "@/lib/periods";
import { FirstRun } from "@/components/FirstRun";
import { KmDriven } from "@/components/KmDriven";
import { loadHistory } from "@/lib/history";
import { Tip } from "@/components/Tip";

export const metadata: Metadata = {
  title: "Kerbside · Tax, sorted for rideshare & delivery drivers",
  description: "Earnings, receipts, logbook, BAS and tax return in one place, built for Australian Uber, DiDi, Uber Eats, DoorDash and HungryPanda drivers.",
  openGraph: { title: "Kerbside · Tax, sorted. For drivers.", description: "Earnings, receipts, logbook, BAS and tax return in one place for Australian rideshare and delivery drivers.", images: ["/landing/tour-poster.webp"], type: "website" },
};

const QN = ["Jul – Sep", "Oct – Dec", "Jan – Mar", "Apr – Jun"];

export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return <Landing />; // signed-out visitors see what Kerbside is about
  const platforms = await requirePlatforms(supabase);
  await generateRecurring(supabase, todayAu()); // add recurring expenses that have come due
  const fy = await getFy();
  const [year, data] = await Promise.all([loadYear(supabase, fy), loadYearData(supabase, fy)]);
  const s = summarise(year, data);
  const { start, end } = fyRange(fy);
  const { count: missing } = await supabase.from("expenses").select("id", { count: "exact", head: true })
    .is("receipt_path", null).gte("date", start).lte("date", end);
  const noPct = year.pct.car.every((v) => !v);
  const { count: tripCount } = await supabase.from("trips").select("id", { count: "exact", head: true });
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
  const today = todayAu();
  const [{ data: allEntries }, { data: allExpenses }] = await Promise.all([
    supabase.from("income_entries").select("start_date,platform,lines,fees,hours,km"),
    supabase.from("expenses").select("date,amount,category"),
  ]);
  const at = typeof sp.at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.at) ? sp.at
    : view === "week" ? defaultWeekAt(today, (allEntries ?? []).map((e) => e.start_date)) : today;
  // Past years: net income from the lodged return (net business + wages; some years platforms were lodged as wages).
  // Kilometres for the km card: odometer readings if both are entered, else what's in the logbook
  const odoKm = year.odo_year_start != null && year.odo_year_end != null && year.odo_year_end > year.odo_year_start
    ? year.odo_year_end - year.odo_year_start : 0;
  const kmDriven = odoKm || s.logbook.total;
  const kmSource = odoKm ? "From your odometer readings" : "Logged in your logbook";
  const { data: kmRows } = await supabase.from("income_entries").select("km").not("km", "is", null).gte("start_date", start).lte("start_date", end);
  const platformKm = Math.round((kmRows ?? []).reduce((t, r) => t + Number(r.km), 0));
  // Expenses with their GST credit and deductible amount (business-use % from this year's settings)
  const spendItems = (allExpenses ?? []).map((x) => {
    const c = expenseCalc(Number(x.amount), x.category, year.pct, quarterOf(x.date), year.gst_registered);
    return { date: x.date, amount: Number(x.amount), gst: c.gst, deductible: c.deductible };
  });
  // Projected taxable income for the year, for the "put aside" marginal rate: business profit so far, annualised, plus other income
  const { data: profile } = await supabase.from("profiles").select("weekly_goal,monthly_goal").maybeSingle();
  const daysIn = Math.max(1, Math.round((Date.parse(today) - Date.parse(start)) / 86400000) + 1);
  const projectedTaxable = Math.max(0, (t.profit / Math.min(daysIn, 365)) * 365) + (Number(year.wages) || 0) + (Number(year.other_income) || 0);
  // Reminders: next BAS, missing week, logbook check-in, renewals
  const [{ data: remEntries }, { data: remTrips }, { data: remRecurring }] = await Promise.all([
    supabase.from("income_entries").select("platform,start_date,end_date").gte("end_date", addDays(today, -21)),
    supabase.from("trips").select("date,end_date").gte("date", start),
    supabase.from("recurring_expenses").select("description,category,frequency,start_date,end_date"),
  ]);
  const reminders = buildReminders({ today, platforms, entries: remEntries ?? [], trips: remTrips ?? [], recurring: remRecurring ?? [] });
  const pastYears = history.filter((h) => h.source !== "Kerbside (this year)")
    .map((h) => ({ fy: h.fy, net: h.net, gross: h.business, expenses: h.expenses, wages: h.wages, source: h.source }));

  return (
    <main className="space-y-6 pt-8">
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Financial year {fy}</p>
          <h1 className="h1">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/insights" className="btn-secondary btn-sm">Insights</Link>
          <Link href="/income" className="btn-secondary btn-sm"><Icon name="income" size={16} />Enter income</Link>
          <Link href="/expenses" className="btn btn-sm"><Icon name="plus" size={16} />Add expense</Link>
        </div>
      </div>

      <FirstRun s={{ car: !!(year.vehicle || year.odo_year_start != null || year.car_start_date), earnings: (allEntries ?? []).length > 0,
        receipt: (allExpenses ?? []).length > 0, trip: (tripCount ?? 0) > 0 }} />

      <div className="grid gap-4 lg:grid-cols-5">
        <EarningsPanel view={view} at={at} today={today} entries={allEntries ?? []}
          expenses={spendItems} pastYears={pastYears} fyProfit={{ fy, profit: t.profit }}
          registered={year.gst_registered} projectedTaxable={projectedTaxable}
          goals={{ week: profile?.weekly_goal ?? null, month: profile?.monthly_goal ?? null }} />

        {/* Current BAS */}
        <Link href="/bas" className="card-wash rise rise-2 group flex flex-col justify-between lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow flex items-center gap-2">This quarter · Q{cq + 1}<Tip k="basCard" align="left" /></p>
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
              <h2 className="h2 flex items-center gap-2">Income vs expenses<Tip k="incomeVsExpenses" align="left" /></h2>
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
              <h2 className="h2 flex items-center gap-2">Where your money goes<Tip k="moneyGoes" align="left" /></h2>
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
            <h2 className="h2 flex items-center gap-2">Reports for lodging<Tip k="reports" align="left" /></h2>
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

      {reminders.length > 0 && (
        <section className="card rise rise-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="h2 flex items-center gap-2">Reminders<Tip k="reminders" align="left" /></h2>
            <a href="/api/calendar" className="btn-secondary btn-sm"><Icon name="plus" size={14} />Add to my calendar</a>
          </div>
          <ul className="divide-y divide-wash-2">
            {reminders.map((r) => (
              <li key={r.key}>
                <Link href={r.href} className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-wash">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${r.tone === "warn" ? "bg-warn text-black" : "bg-wash-2"}`}>
                    <Icon name={r.key === "bas" ? "bas" : r.key === "logbook" ? "car" : r.key === "earnings" ? "income" : "receipt"} size={17} />
                  </span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{r.title}</span><span className="block text-[13px] text-mute">{r.detail}</span></span>
                  <Icon name="chevron" size={16} className="text-mute-2 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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
          <h2 className="h2 mb-2 flex items-center gap-2">Quarters<Tip k="quarters" align="left" /></h2>
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

        <KmDriven fy={fy} km={kmDriven} kmSource={kmSource} businessPct={s.logbook.total ? s.logbook.businessPct : null} platformKm={platformKm} />
      </div>
    </main>
  );
}
