import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, loadYearData } from "@/lib/data";
import { QUARTERS, summarise } from "@/lib/tax";
import { aud, kmFmt, pct } from "@/lib/fmt";
import { saveTaxInputs } from "@/app/actions";

type Line = { label: string; q: number[] };
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

function Rows({ lines }: { lines: Line[] }) {
  return lines.filter((l) => sum(l.q) !== 0).map((l) => (
    <tr key={l.label}><td className="pl-6">{l.label}</td>{l.q.map((v, i) => <td key={i} className="num">{aud(v)}</td>)}<td className="num">{aud(sum(l.q))}</td></tr>
  ));
}
function Total({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return <tr className={strong ? "bg-green-50 font-semibold" : "font-medium"}><td>{label}</td><td colSpan={4} /><td className="num">{aud(value)}</td></tr>;
}

export default async function Tax() {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const [year, data] = await Promise.all([loadYear(supabase, fy), loadYearData(supabase, fy)]);
  const s = summarise(year, data);
  const t = s.tax;
  const cpk = year.car_method === "cpk";

  return (
    <main className="space-y-6">
      <h1 className="h1">Tax return summary · FY {fy}</h1>
      <p className="text-sm text-slate-600">Business schedule figures for myTax (or hand this to your accountant). All amounts exclude GST.</p>
      <section className="card overflow-x-auto">
        <table className="tbl min-w-[720px]">
          <thead><tr><th>Item</th>{QUARTERS.map((q) => <th key={q} className="num">{q}</th>)}<th className="num">Year</th></tr></thead>
          <tbody>
            <tr><td className="pl-6">Rideshare, delivery & ABN income</td>{s.q.netIncome.map((v, i) => <td key={i} className="num">{aud(v)}</td>)}<td className="num">{aud(t.businessIncome)}</td></tr>
            {!!year.gov_payments && <tr><td className="pl-6">Assessable government industry payments</td><td colSpan={4} /><td className="num">{aud(year.gov_payments)}</td></tr>}
            {!!year.other_business_income && <tr><td className="pl-6">Other business income</td><td colSpan={4} /><td className="num">{aud(year.other_business_income)}</td></tr>}
            <Total label="Total business income" value={t.income} strong />

            <tr><td colSpan={6} className="pt-4 font-semibold">Car expenses — {cpk ? "cents per km method" : "logbook method"} <span className="muted">(change in Settings)</span></td></tr>
            {cpk ? (
              <tr><td className="pl-6">{kmFmt(t.cpkKm)} business km × {aud(year.cpk_rate)}</td><td colSpan={4} /><td className="num">{aud(t.cpkTotal)}</td></tr>
            ) : (
              <>
                <Rows lines={t.carLines} />
                <tr><td className="pl-6">Depreciation × {pct(s.annualCarPct)}</td><td colSpan={4} /><td className="num">{aud(t.depreciation)}</td></tr>
                <tr><td className="pl-6">Loan interest × {pct(s.annualCarPct)}</td><td colSpan={4} /><td className="num">{aud(t.interest)}</td></tr>
              </>
            )}
            <Total label="Car expenses claimed" value={t.carClaim} />

            <tr><td colSpan={6} className="pt-4 font-semibold">Platform fees</td></tr>
            <Rows lines={t.feeLines} />
            <Total label="Total platform fees" value={t.feesTotal} />

            <tr><td colSpan={6} className="pt-4 font-semibold">Other business expenses</td></tr>
            <Rows lines={t.otherLines} />
            <Total label="Total other expenses" value={t.otherTotal} />

            <Total label="Total expenses" value={t.totalExpenses} strong />
            <Total label="Net business profit / (loss)" value={t.profit} strong />
          </tbody>
        </table>
        <p className="muted mt-2">
          {cpk ? "Cents per km replaces all actual car costs (incl. depreciation and interest) and is capped at 5,000 km."
            : `Logbook total ${aud(t.logbookTotal)}. Cents-per-km would give ${aud(t.cpkTotal)} (${kmFmt(t.cpkKm)} km).`}
        </p>
      </section>

      <form action={saveTaxInputs} className="card space-y-4">
        <input type="hidden" name="fy" value={fy} />
        <h2 className="h2">Year-end inputs</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="field">Assessable government payments<input name="gov_payments" type="number" step="0.01" defaultValue={year.gov_payments || ""} /></label>
          <label className="field">Other business income (ex GST)<input name="other_business_income" type="number" step="0.01" defaultValue={year.other_business_income || ""} /></label>
          <label className="field">Car loan interest paid (100%)<input name="loan_interest" type="number" step="0.01" defaultValue={year.loan_interest || ""} /></label>
        </div>
        <h3 className="text-sm font-semibold">Car depreciation (diminishing value)</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="field">Car cost incl on-road<input name="car_cost" type="number" step="0.01" defaultValue={year.car_cost || ""} /></label>
          <label className="field">Opening value this year<input name="opening_value" type="number" step="0.01" defaultValue={year.opening_value || ""} />
            <span className="muted">Cost base if bought this year ({aud(t.dep.costBase)}), else last year’s closing value.</span></label>
          <label className="field">Days owned this year<input name="days_owned" type="number" min="0" max="366" defaultValue={year.days_owned} /></label>
          <label className="field">Effective life (years)<input name="effective_life" type="number" min="1" defaultValue={year.effective_life} />
            <span className="muted">ATO: cars 8 years.</span></label>
        </div>
        <dl className="grid max-w-md grid-cols-2 gap-y-1 text-sm">
          <dt>GST credits claimed on car</dt><dd className="num">{aud(t.dep.carGstClaimed)}</dd>
          <dt>Depreciation (100%)</dt><dd className="num">{aud(t.dep.depFull)}</dd>
          <dt>Business portion</dt><dd className="num font-semibold">{aud(t.dep.depreciation)}</dd>
          <dt>Closing value (next year’s opening)</dt><dd className="num">{aud(t.dep.closing)}</dd>
        </dl>
        <button className="btn">Save</button>
        <p className="muted">Selling a car can create a balancing adjustment on your return. Check with a registered tax agent.</p>
      </form>
    </main>
  );
}
