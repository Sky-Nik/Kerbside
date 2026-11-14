import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, loadYearData } from "@/lib/data";
import { marginalRate, SG_RATE, summarise, SUPER_CAP } from "@/lib/tax";
import { aud, kmFmt, pct } from "@/lib/fmt";
import { saveTaxInputs, setCarMethod } from "@/app/actions";
import { Icon } from "@/components/Icon";
import { PageHead } from "@/components/QuarterTabs";
import { Tip } from "@/components/Tip";
import type { HelpKey } from "@/lib/help";

type Line = { label: string; q: number[] };
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

function Group({ title, total, children, note, tip }: { title: string; total: number; children: React.ReactNode; note?: React.ReactNode; tip?: HelpKey }) {
  return (
    <section className="card">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="h2 flex items-center gap-2">{title}{tip && <Tip k={tip} align="left" />}</h2>
        <span className="text-xl font-bold tabular-nums">{aud(total)}</span>
      </div>
      {note && <p className="muted mt-1">{note}</p>}
      <dl className="mt-3">{children}</dl>
    </section>
  );
}
const Row = ({ label, value }: { label: React.ReactNode; value: number }) => (
  <div className="kv"><dt>{label}</dt><dd>{aud(value)}</dd></div>
);
const Lines = ({ lines }: { lines: Line[] }) => {
  const rows = lines.filter((l) => sum(l.q) !== 0);
  return rows.length ? rows.map((l) => <Row key={l.label} label={l.label} value={sum(l.q)} />) : <p className="muted py-2">Nothing yet.</p>;
};

export default async function Tax() {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const [year, data] = await Promise.all([loadYear(supabase, fy), loadYearData(supabase, fy)]);
  const s = summarise(year, data);
  const t = s.tax;
  const e = s.estimate;
  const cpk = year.car_method === "cpk";
  // Automatic method choice: suggest the other method when it gives a bigger deduction
  const other = cpk ? t.logbookTotal : t.cpkTotal;
  const better = other - t.carClaim >= 1 && (cpk || t.cpkKm > 0) ? (cpk ? "logbook" : "cpk") : null;
  const gain = other - t.carClaim;
  // Super: deductible personal contributions
  const superRate = Math.max(0, marginalRate(e.taxable, fy) - 0.15);
  const capRoom = Math.max(0, (SUPER_CAP[fy] ?? SUPER_CAP["2026-27"]) - SG_RATE * Number(year.wages || 0));

  return (
    <main>
      <PageHead eyebrow={`FY ${fy} · myTax business schedule`} title="Tax return" />

      <section className="card-ink rise rise-1 mb-6 grid gap-6 sm:grid-cols-3">
        <div><p className="text-sm text-white/60">Business income</p><p className="mt-1 text-2xl font-bold tabular-nums">{aud(t.income)}</p></div>
        <div><p className="text-sm text-white/60">Total expenses</p><p className="mt-1 text-2xl font-bold tabular-nums">{aud(t.totalExpenses)}</p></div>
        <div><p className="text-sm text-white/60">Net business profit</p><p className="display mt-1 !text-[2.5rem] tabular-nums">{aud(t.profit)}</p></div>
      </section>
      <p className="rise rise-1 mb-6 flex items-center gap-2 text-sm text-mute">All amounts exclude GST. Hand this page to your accountant or use it to fill in myTax.<Tip k="p8" /></p>

      <section className={`rise rise-2 mb-6 grid gap-6 rounded-2xl p-6 lg:grid-cols-[1fr_1.2fr] ${e.result >= 0 ? "bg-[#e9f7ef]" : "bg-[#fff0ee]"}`}>
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-ink-2"><Tip k="estimate" align="left" />{e.result > 0 ? "Estimated tax refund" : e.result < 0 ? "Estimated tax to pay" : "No tax to pay (estimate)"}</p>
          <p className={`display mt-1 tabular-nums ${e.result >= 0 ? "text-pos" : "text-neg"}`}>{aud(Math.abs(e.result))}</p>
          <p className="mt-2 text-sm text-mute">
            Income tax for FY {fy}, based on your business profit plus the other income you enter below.
            {!(year.wages || year.tax_withheld) && " Add any job wages and the tax withheld from them for an accurate figure."}
          </p>
          {e.lossDeferred > 0 && (
            <p className="mt-2 rounded-lg bg-white/70 p-2 text-[13px]">
              Your business made a loss of {aud(e.lossDeferred)}. It isn’t taken off your other income here: under the ATO’s non-commercial loss rules it’s usually carried forward.
            </p>
          )}
        </div>
        <dl className="rounded-xl bg-white/70 p-4">
          <div className="kv"><dt>Taxable income</dt><dd>{aud(e.taxable)}</dd></div>
          <div className="kv"><dt>Tax on taxable income</dt><dd>{aud(e.basic)}</dd></div>
          {e.lito > 0 && <div className="kv"><dt>Less low income tax offset</dt><dd>-{aud(e.lito)}</dd></div>}
          {e.sbito > 0 && <div className="kv"><dt>Less small business income tax offset</dt><dd>-{aud(e.sbito)}</dd></div>}
          <div className="kv"><dt>Plus Medicare levy</dt><dd>{aud(e.medicare)}</dd></div>
          <div className="kv"><dt className="!text-ink font-medium">Total tax</dt><dd className="font-bold">{aud(e.totalTax)}</dd></div>
          <div className="kv"><dt>Less tax already paid (withheld + instalments)</dt><dd>{e.credits ? `-${aud(e.credits)}` : aud(0)}</dd></div>
          <div className="kv"><dt className="!text-ink font-bold">{e.result >= 0 ? "Refund" : "To pay"}</dt><dd className="font-bold">{aud(Math.abs(e.result))}</dd></div>
        </dl>
        <p className="muted lg:col-span-2">
          Estimate for an Australian resident using ATO {fy} tax rates. It doesn’t include HELP/study loan repayments, the Medicare levy surcharge,
          private health insurance or other offsets. The ATO works out your final amount on your notice of assessment.
        </p>
      </section>

      {better && (
        <form action={setCarMethod} className="card rise rise-2 mb-6 flex flex-wrap items-center gap-4">
          <input type="hidden" name="fy" value={fy} /><input type="hidden" name="car_method" value={better} />
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black text-white"><Icon name="car" size={20} /></span>
          <p className="min-w-0 flex-1"><b className="block">{better === "cpk" ? "Cents per km" : "The logbook method"} gives you {aud(gain)} more</b>
            <span className="text-sm text-mute">{better === "cpk" ? `${kmFmt(t.cpkKm)} km × ${aud(year.cpk_rate)} = ${aud(t.cpkTotal)} vs logbook ${aud(t.logbookTotal)}. No receipts needed for car costs, but it’s capped at 5,000 km.`
              : `Logbook ${aud(t.logbookTotal)} vs cents per km ${aud(t.cpkTotal)}. You need a 12-week logbook and receipts for car costs.`}</span></p>
          <button className="btn">Switch method</button>
        </form>
      )}

      <div className="rise rise-2 grid gap-4 lg:grid-cols-2">
        <Group title="Income" total={t.income}>
          <Row label="Rideshare, delivery & ABN income" value={t.businessIncome} />
          {!!year.gov_payments && <Row label="Assessable government payments" value={year.gov_payments} />}
          {!!year.other_business_income && <Row label="Other business income" value={year.other_business_income} />}
        </Group>

        <Group title={`Car expenses · ${cpk ? "cents per km" : "logbook"}`} total={t.carClaim} tip="carMethod"
          note={cpk ? "Covers all car costs, capped at 5,000 km." : `Logbook total vs cents per km: ${aud(t.cpkTotal)} (${kmFmt(t.cpkKm)} km). Change method in Settings.`}>
          {cpk ? <Row label={`${kmFmt(t.cpkKm)} km × ${aud(year.cpk_rate)}`} value={t.cpkTotal} /> : (
            <>
              <Lines lines={t.carLines} />
              <Row label={`Depreciation${s.cars.length ? ` · ${year.vehicle || "main car"}` : ""} × ${pct(s.annualCarPct)}`} value={t.dep.depreciation} />
              {s.cars.map((c) => <Row key={c.id} label={`Depreciation · ${c.name} × ${pct(c.pct)}${c.writeOff ? " (write-off)" : ""}`} value={c.depreciation} />)}
              <Row label={`Loan interest × ${pct(s.annualCarPct)}`} value={t.interest} />
            </>
          )}
        </Group>

        {t.feesTotal !== 0 && <Group title="Platform fees" total={t.feesTotal}><Lines lines={t.feeLines} /></Group>}
        <Group title="Other business expenses" total={t.otherTotal}><Lines lines={t.otherLines} /></Group>
      </div>

      <section id="super" className="card rise rise-3 mt-8 scroll-mt-24">
        <h2 className="h2 flex items-center gap-2">Super<Tip k="super" align="left" /></h2>
        <p className="muted mb-4">Nobody pays super on rideshare or delivery income, so it’s up to you. Personal contributions can be claimed as a tax deduction.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card-wash py-4"><p className="text-xs text-mute">Tax saved per $1,000 you put in</p><p className="mt-1 text-xl font-bold tabular-nums">{aud(superRate * 1000)}</p></div>
          <div className="card-wash py-4"><p className="text-xs text-mute">Room under the {aud(SUPER_CAP[fy] ?? SUPER_CAP["2026-27"])} cap</p><p className="mt-1 text-xl font-bold tabular-nums">{aud(capRoom)}</p></div>
          <div className="card-wash py-4"><p className="text-xs text-mute">Deadline</p><p className="mt-1 text-xl font-bold">30 June {fy.slice(0, 2)}{fy.slice(5)}</p></div>
        </div>
        <p className="muted mt-3">{superRate > 0
          ? "The fund must receive the money by 30 June. Then send your fund a notice of intent to claim a deduction and wait for its reply before you lodge. Add the amount to Other deductions below."
          : "At your income, a deductible contribution saves little or no tax (the fund pays 15% on it). Look at an after-tax contribution instead: you may get the government co-contribution."}
          {Number(year.wages) > 0 && " Cap room allows for 12% employer super on your wages."}</p>
      </section>

      <form action={saveTaxInputs} className="card rise rise-3 mt-8 space-y-6">
        <input type="hidden" name="fy" value={fy} />
        <div>
          <h2 className="h2 flex items-center gap-2">Year-end inputs<Tip k="yearEnd" align="left" /></h2>
          <p className="muted">Enter these once a year, before you lodge.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="field">Assessable government payments<input name="gov_payments" type="number" step="0.01" defaultValue={year.gov_payments || ""} placeholder="0.00" /></label>
          <label className="field">Other business income (ex GST)<input name="other_business_income" type="number" step="0.01" defaultValue={year.other_business_income || ""} placeholder="0.00" /></label>
          <label className="field">Car loan interest paid (100%)<input name="loan_interest" type="number" step="0.01" defaultValue={year.loan_interest || ""} placeholder="0.00" /></label>
        </div>
        <div className="border-t border-wash-2 pt-6">
          <h3 className="flex items-center gap-2 font-bold">Other parts of your tax return <span className="font-normal text-mute">· for the refund estimate</span><Tip k="otherParts" align="left" /></h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="field">Wages from jobs<input name="wages" type="number" step="0.01" defaultValue={year.wages || ""} placeholder="0.00" /></label>
            <label className="field">Tax withheld from wages<input name="tax_withheld" type="number" step="0.01" defaultValue={year.tax_withheld || ""} placeholder="0.00" /></label>
            <label className="field">PAYG instalments paid<input name="payg_instalments" type="number" step="0.01" defaultValue={year.payg_instalments || ""} placeholder="0.00" /></label>
            <label className="field">Other income (interest etc)<input name="other_income" type="number" step="0.01" defaultValue={year.other_income || ""} placeholder="0.00" /></label>
            <label className="field">Other deductions<input name="other_deductions" type="number" step="0.01" defaultValue={year.other_deductions || ""} placeholder="0.00" /></label>
          </div>
          <p className="muted mt-2">Wages and tax withheld are on your income statement in myGov (ATO → Employment → Income statements). Other deductions = work-related or donations, not business costs.</p>
        </div>
        <div className="grid gap-6 border-t border-wash-2 pt-6 lg:grid-cols-[1fr_300px]">
          <div>
            <h3 className="flex items-center gap-2 font-bold">Car depreciation <span className="font-normal text-mute">· {t.dep.writeOff ? "instant asset write-off" : "diminishing value"}</span><Tip k="depreciation" align="left" /></h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="field">Car cost incl on-road<input name="car_cost" type="number" step="0.01" defaultValue={year.car_cost || ""} placeholder="0.00" /></label>
              <label className="field"><span className="flex items-center gap-1.5">Opening value this year<Tip k="openingValue" /></span><input name="opening_value" type="number" step="0.01" defaultValue={year.opening_value || ""} placeholder="0.00" /></label>
              <label className="field">Days owned this year<input name="days_owned" type="number" min="0" max="366" defaultValue={year.days_owned} /></label>
              <label className="field">Effective life (years)<input name="effective_life" type="number" min="1" defaultValue={year.effective_life} /></label>
            </div>
            <p className="muted mt-2">Opening value = cost base if bought this year ({aud(t.dep.costBase)}), otherwise last year’s closing value. ATO effective life for cars is 8 years.{t.dep.writeOff && " Your car cost under $20,000 and was first used this year, so its business share is written off in full now (instant asset write-off)."}</p>
          </div>
          <dl className="self-start rounded-2xl bg-wash p-4">
            <div className="kv"><dt>GST claimed on car</dt><dd>{aud(t.dep.carGstClaimed)}</dd></div>
            <div className="kv"><dt>Depreciation (100%)</dt><dd>{aud(t.dep.depFull)}</dd></div>
            <div className="kv"><dt className="!text-ink font-medium">Business portion</dt><dd className="font-bold">{aud(t.dep.depreciation)}</dd></div>
            <div className="kv"><dt>Closing value</dt><dd>{aud(t.dep.closing)}</dd></div>
          </dl>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button className="btn">Save</button>
          <span className="muted">Selling a car can create a balancing adjustment. Check with a registered tax agent.</span>
        </div>
      </form>
    </main>
  );
}
