import { Document, Text, View } from "@react-pdf/renderer";
import { INCOME_LINES, QUARTERS, round2 } from "@/lib/tax";
import type { ReportData } from "./data";
import { C, Cover, LabelBox, Rows, Sheet, Steps, Table, Title, date, dollars, fySlash, money, s } from "./pdf";

const PURPOSE: Record<string, string> = { rideshare: "Rideshare & delivery", other_abn: "Other ABN work", employment: "Employment", private: "Private" };
const sum = (a: number[]) => round2(a.reduce((t, v) => t + v, 0));
const pctTxt = (v: number) => `${(v * 100).toFixed(1)}%`;

/**
 * Annual tax return report. Structure and labels follow the ATO Business and professional items schedule
 * instructions 2026 (P8, non-primary production) and supplementary tax return question 15.
 */
export function TaxReport({ r }: { r: ReportData }) {
  const { s: S, year: y } = r;
  const p = S.p8;
  const t = S.tax;
  const lb = S.logbook;
  const cpk = y.car_method === "cpk";
  const docTitle = `Tax summary – ${fySlash(r.fy)}`;
  const first = r.name.split(" ")[0];
  const withReceipt = r.expenses.filter((e) => e.receipt_path).length;

  // Logbook period & ATO checks
  const sorted = [...r.trips].sort((a, b) => a.date.localeCompare(b.date));
  const lbStart = sorted[0]?.date;
  const lbEnd = sorted.reduce<string | undefined>((m, x) => { const e = x.end_date ?? x.date; return !m || e > m ? e : m; }, undefined);
  const lbDays = lbStart && lbEnd ? Math.round((Date.parse(lbEnd) - Date.parse(lbStart)) / 86400000) + 1 : 0;
  const checks: [string, boolean][] = [
    ["Logbook covers at least 12 continuous weeks", lbDays >= 84],
    ["Odometer reading at the start of the period you had the car", y.odo_year_start != null],
    ["Odometer reading at the end of the year (or when you sold it)", y.odo_year_end != null],
    ["Every expense has a receipt attached", withReceipt === r.expenses.length],
  ];

  // Income by platform for the year
  const platforms = [...new Set(r.income.map((e) => e.platform))].map((pl) => {
    const rows = r.income.filter((e) => e.platform === pl);
    const line = (k: string) => round2(rows.reduce((a, e) => a + (Number(e.lines[k]) || 0), 0));
    const fee = round2(rows.reduce((a, e) => a + (Number(e.fees?.["Service fees"]) || 0), 0));
    const sales = round2(rows.reduce((a, e) => a + e.calc.sales, 0));
    const gst = round2(rows.reduce((a, e) => a + e.calc.gst, 0));
    return { pl, line, fee, sales, gst };
  });

  return (
    <Document title={docTitle} author="Kerbside" subject={`Tax summary ${r.fy}`}>
      {/* 1. Cover */}
      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Cover
          fyLabel={fySlash(r.fy)}
          title="Tax summary"
          greeting={`Your year on the road, ${first}.`}
          intro="This summary brings together your income, expenses, car logbook and BAS for the financial year, laid out in the same order as the ATO’s business schedule so you can lodge your own return or hand it to your tax agent."
          left={[["Business income (ex GST)", money(t.income)], ["Total expenses", money(t.totalExpenses)],
            [S.basYear.net < 0 ? "GST refunded via BAS" : "GST paid via BAS", money(Math.abs(S.basYear.net))],
            [S.estimate.result > 0 ? "Estimated tax refund" : S.estimate.result < 0 ? "Estimated tax to pay" : "Estimated tax", money(Math.abs(S.estimate.result))]]}
          headline={{ label: t.profit < 0 ? "Net business loss" : "Net business profit", value: money(Math.abs(t.profit)) }}
          stats={[
            { value: `${lb.annualBusinessKm.toLocaleString("en-AU")} km`, label: "Business kilometres" },
            { value: lb.total ? pctTxt(lb.businessPct) : "No logbook", label: "Car business use" },
            { value: `${withReceipt}/${r.expenses.length}`, label: "Expenses with receipts" },
          ]}
        />
      </Sheet>

      {/* 2. What to enter */}
      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Title title="Your tax return" sub="Business and professional items schedule – P8 Business income and expenses" />
        <Text style={s.p}>Enter these in the Non-primary production column. All amounts exclude GST. Labels follow the ATO’s 2026 instructions.</Text>
        <Text style={s.blockTitle}>Income</Text>
        <LabelBox label="J" desc="Other business income" value={dollars(p.incomeJ)} note="Includes ride-sourcing earnings (Uber, DiDi), excluding GST" />
        {p.incomeH > 0 && <LabelBox label="H" desc="Assessable government industry payments" value={dollars(p.incomeH)} />}
        <Text style={s.blockTitle}>Expenses</Text>
        {p.F > 0 && <LabelBox label="F" desc="Contractor, sub-contractor and commission expenses" value={dollars(p.F)} note="Platform service fees" />}
        {p.J > 0 && <LabelBox label="J" desc="Lease expenses" value={dollars(p.J)} note="Car lease, business-use share" />}
        {p.M > 0 && <LabelBox label="M" desc="Depreciation expenses" value={dollars(p.M)} note="Car, diminishing value, business-use share" />}
        <LabelBox label="N" desc={`Motor vehicle expenses · Type ${p.nType}`} value={dollars(p.N)}
          note={cpk ? "Type S: cents per kilometre method" : "Type B: logbook method (excludes depreciation, lease and interest)"} />
        {p.Q > 0 && <LabelBox label="Q" desc="Interest expenses within Australia" value={dollars(p.Q)} note="Car loan interest, business-use share" />}
        <LabelBox label="P" desc="All other expenses" value={dollars(p.P)} />
        <LabelBox label="T" desc="Total expenses" value={dollars(p.T)} />
        <Text style={s.blockTitle}>Net result</Text>
        <LabelBox label="Z" desc="Net income or loss from business (non-primary production)" value={p.Z < 0 ? `${dollars(-p.Z)}  L` : dollars(p.Z)}
          note="Transfer to supplementary tax return question 15, label C (no cents). Print L if it’s a loss." />
      </Sheet>

      {/* 2b. How to lodge */}
      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Title title="Your estimated tax result" sub={`Income tax for ${fySlash(r.fy)} · Australian resident rates`} />
        <View wrap={false} style={{ flexDirection: "row", alignItems: "center", backgroundColor: S.estimate.result >= 0 ? "#E9F7EF" : "#FFF0EE",
          borderRadius: 8, padding: 16, marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: C.ink2 }}>{S.estimate.result > 0 ? "Estimated refund" : S.estimate.result < 0 ? "Estimated tax to pay" : "No tax to pay"}</Text>
            <Text style={{ fontSize: 30, letterSpacing: -0.6, color: S.estimate.result >= 0 ? C.pos : C.neg, marginTop: 4 }}>{money(Math.abs(S.estimate.result))}</Text>
          </View>
          <View style={{ width: 250 }}>
            {([
              ["Taxable income", money(S.estimate.taxable)],
              ["Tax on taxable income", money(S.estimate.basic)],
              ...(S.estimate.lito ? [["Less low income tax offset", `-${money(S.estimate.lito)}`]] : []),
              ...(S.estimate.sbito ? [["Less small business income tax offset", `-${money(S.estimate.sbito)}`]] : []),
              ["Plus Medicare levy", money(S.estimate.medicare)],
              ["Total tax", money(S.estimate.totalTax)],
              ["Less tax already paid", S.estimate.credits ? `-${money(S.estimate.credits)}` : money(0)],
            ] as [string, string][]).map(([k, v]) => (
              <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2.5 }}>
                <Text style={{ fontSize: 8.5, color: C.ink2 }}>{k}</Text><Text style={{ fontSize: 8.5 }}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={{ ...s.small, marginBottom: 18 }}>
          Includes business profit{y.wages ? `, wages ${money(y.wages)} (tax withheld ${money(y.tax_withheld ?? 0)})` : ""}{y.other_income ? `, other income ${money(y.other_income)}` : ""}.
          {S.estimate.lossDeferred ? ` The business loss of ${money(S.estimate.lossDeferred)} isn’t offset against other income (non-commercial loss rules usually defer it).` : ""}
          {" "}Not included: HELP/study loan repayments, Medicare levy surcharge, private health insurance and other offsets. The ATO’s notice of assessment is final.
        </Text>
        <Text style={s.blockTitle}>How to lodge</Text>
        <Steps items={[
          "Sign in to myGov, open the ATO service and start your tax return in myTax.",
          "When you personalise the return, choose the business / sole trader income option. This adds the Business and professional items schedule.",
          "At P1 Personal services income: if the ATO’s personal services income (PSI) rules don’t apply to you, your ride-sourcing earnings go at P8 label J. Check the PSI rules if unsure.",
          "Fill in P8 with the amounts on the previous page, in the Non-primary production column.",
          `Transfer label Z (${p.Z < 0 ? `${dollars(-p.Z)} loss` : dollars(p.Z)}) to supplementary tax return question 15, label C.${p.Z < 0 ? " Print L in the loss box, and complete P3 and P9 for business losses." : ""}`,
          "At question 15, Part D, enter your net small business income to work out the small business income tax offset (up to $1,000).",
          "GST isn’t part of your tax return: it’s settled through your BAS. Don’t include GST in any amount in this summary’s P8 figures.",
        ]} />
        <Text style={{ ...s.blockTitle, marginTop: 22 }}>Before you lodge</Text>
        {[
          ["Your ABN is in Settings (it prints at the top of every page)", !!r.abn],
          ["Income for every week or month of the year is entered", r.income.length > 0],
          ["Every expense has a receipt attached", withReceipt === r.expenses.length],
          ["Logbook covers at least 12 continuous weeks", lbDays >= 84],
          ["Odometer readings for the start and end of the year are entered", y.odo_year_start != null && y.odo_year_end != null],
          ["Totals match your Uber and DiDi annual tax summaries", false],
        ].map(([k, ok]) => (
          <View key={String(k)} style={{ flexDirection: "row", marginBottom: 5 }}>
            <Text style={{ width: 52, fontFamily: "Helvetica-Bold", fontSize: 8.5, color: ok ? C.pos : C.neg }}>{ok ? "OK" : "CHECK"}</Text>
            <Text style={{ fontSize: 9, color: C.ink2 }}>{String(k)}</Text>
          </View>
        ))}
      </Sheet>

      {/* 3. Earnings */}
      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Title title="How your earnings were calculated" sub={fySlash(r.fy)} />
        {platforms.map((x) => (
          <Rows key={x.pl} title={`${x.pl}`}
            rows={[...INCOME_LINES.map((k) => [k, money(x.line(k))] as [string, string]),
              ["Service fee (added back – GST is charged on the full fare)", money(x.fee)],
              [`Total ${x.pl} sales (incl GST)`, money(x.sales)], ["Less GST", `-${money(x.gst)}`]]}
            total={[`${x.pl} income (ex GST)`, money(round2(x.sales - x.gst))]} />
        ))}
        {platforms.length === 0 && <Text style={s.p}>No income recorded this year.</Text>}
        <Rows title="Other income" rows={[["Assessable government industry payments", money(p.incomeH)], ["Other business income entered in Tax page", money(y.other_business_income)]]}
          total={["Total business income (ex GST)", money(t.income)]} />
      </Sheet>

      {/* 4. Deductions */}
      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Title title="Your deductions" sub={`${fySlash(r.fy)} · business-use share, excluding GST credits`} />
        {cpk ? (
          <Rows title="Car expenses – cents per kilometre (P8 label N, Type S)"
            rows={[["Business kilometres (capped at 5,000)", `${t.cpkKm.toLocaleString("en-AU")} km`], ["Rate", `${money(y.cpk_rate)} per km`]]}
            total={["Car expenses", money(t.cpkTotal)]} />
        ) : (
          <Rows title={`Car expenses – logbook method (business use ${pctTxt(S.annualCarPct)})`}
            rows={[
              ...t.carLines.filter((l) => sum(l.q)).map((l) => [`${l.label}${l.label === "Lease & hire" ? " (label J)" : " (label N)"}`, money(sum(l.q))] as [string, string]),
              [`Depreciation (label M) – opening value ${money(y.opening_value)}, ${y.days_owned} days`, money(t.depreciation)],
              ["Loan interest (label Q)", money(t.interest)],
            ]}
            total={["Car expenses", money(t.logbookTotal)]} />
        )}
        <Text style={s.small}>
          {cpk ? `Logbook method would give ${money(t.logbookTotal)}.` : `Cents per km would give ${money(t.cpkTotal)} (${t.cpkKm.toLocaleString("en-AU")} km × ${money(y.cpk_rate)}).`}
          {" "}You can only use one method for a car each year.
        </Text>
        {t.feesTotal > 0 && <Rows title="Platform fees (label F)" rows={t.feeLines.filter((l) => sum(l.q)).map((l) => [l.label, money(sum(l.q))])} total={["Platform fees", money(t.feesTotal)]} />}
        <Rows title="Other business expenses (label P)" rows={t.otherLines.filter((l) => sum(l.q)).map((l) => [l.label, money(sum(l.q))])} total={["Other expenses", money(t.otherTotal)]} />
        <View style={{ ...s.total, backgroundColor: C.ink, color: "#FFFFFF", marginTop: 12 }}><Text>Total expenses (label T)</Text><Text>{money(t.totalExpenses)}</Text></View>
      </Sheet>

      {/* 5. Logbook */}
      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Title title="Car logbook" sub="Logbook method records" />
        <Rows rows={[
          ["Car", y.vehicle || "Not entered"],
          ["Had the car from", y.car_start_date ? date(y.car_start_date) : "1 July (start of year)"],
          ["Odometer at start", y.odo_year_start != null ? `${y.odo_year_start.toLocaleString("en-AU")} km` : "Not entered"],
          ["Odometer at end", y.odo_year_end != null ? `${y.odo_year_end.toLocaleString("en-AU")} km` : "Not entered yet"],
          ["Logbook period", lbStart && lbEnd ? `${date(lbStart)} – ${date(lbEnd)} (${Math.floor(lbDays / 7)} of 12 weeks)` : "No trips logged"],
        ]} />
        <Rows title="Kilometres in the logbook period" rows={[
          ["Rideshare & delivery", `${lb.rideshare.toLocaleString("en-AU")} km`], ["Other ABN work", `${lb.other_abn.toLocaleString("en-AU")} km`],
          ["Employment", `${lb.employment.toLocaleString("en-AU")} km`],
          ["Private (incl. gaps between readings)", `${Math.max(0, lb.total - lb.businessKm - lb.employment).toLocaleString("en-AU")} km`],
        ]} total={["Business-use percentage", lb.total ? pctTxt(lb.businessPct) : "–"]} />
        <Text style={s.blockTitle}>ATO logbook checklist</Text>
        {checks.map(([k, ok]) => (
          <View key={k} style={{ flexDirection: "row", marginBottom: 4 }}>
            <Text style={{ width: 52, fontFamily: "Helvetica-Bold", fontSize: 8.5, color: ok ? C.pos : C.neg }}>{ok ? "OK" : "TO DO"}</Text>
            <Text style={{ fontSize: 9, color: C.ink2 }}>{k}</Text>
          </View>
        ))}
        <Text style={{ ...s.small, marginTop: 6, marginBottom: 12 }}>
          A logbook must cover a continuous 12-week period that’s representative of your travel, and is valid for 5 years unless your use changes.
          Keep it and your odometer records for 5 years after the last year you rely on it.
        </Text>
        <Table cols={[{ h: "Dates", w: 2 }, { h: "Odometer start", w: 1.1, right: true }, { h: "Odometer end", w: 1.1, right: true },
          { h: "Km", w: 0.8, right: true }, { h: "Purpose", w: 1.5 }, { h: "Description", w: 1.8 }]}
          rows={sorted.map((x) => [x.end_date ? `${date(x.date)} – ${date(x.end_date)}` : date(x.date), x.odo_start.toLocaleString("en-AU"),
            x.odo_end.toLocaleString("en-AU"), (x.odo_end - x.odo_start).toLocaleString("en-AU"), PURPOSE[x.purpose] ?? x.purpose, x.description ?? ""])} />
      </Sheet>

      {/* 6. BAS for the year */}
      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Title title="GST for the year" sub="What you reported (or should report) on each quarterly BAS" />
        <Table cols={[{ h: "Quarter", w: 1.6 }, { h: "G1 Total sales", w: 1.2, right: true }, { h: "1A GST on sales", w: 1.2, right: true },
          { h: "1B GST credits", w: 1.2, right: true }, { h: "Net GST", w: 1.1, right: true }]}
          rows={[...S.bas.map((b, i) => [QUARTERS[i], money(b.G1), money(b["1A"]), money(b["1B"]), money(b.net)]),
            ["Year", money(S.basYear.G1), money(S.basYear["1A"]), money(S.basYear["1B"]), money(S.basYear.net)]]} />
        <Text style={{ ...s.small, marginTop: 8 }}>
          Ride-sourcing drivers must be registered for GST from their first trip, whatever their turnover. GST is worked out on the full fare the rider pays.
        </Text>
        <Text style={{ ...s.blockTitle, marginTop: 20 }}>Expense register</Text>
        <Table cols={[{ h: "Date", w: 1 }, { h: "Supplier", w: 1.6 }, { h: "Category", w: 2.4 }, { h: "Amount", w: 1, right: true },
          { h: "Bus. %", w: 0.7, right: true }, { h: "Deductible", w: 1, right: true }, { h: "Receipt", w: 0.9 }]}
          rows={r.expenses.map((e) => [date(e.date), e.description ?? "", e.category, money(Number(e.amount)), `${Math.round(e.calc.share * 100)}%`,
            money(e.calc.deductible), e.receipt_path ? "Attached" : "MISSING"])} />
      </Sheet>

      {/* 7. Notes */}
      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Title title="Notes and disclaimers" sub="Please read before you lodge" />
        {[
          ["Where these figures come from", "Everything in this summary is calculated from what you entered in Kerbside: income for each period from the Uber and DiDi driver apps, expenses and receipts, your logbook and your settings. Check the totals against your platforms’ annual tax summaries and your bank statements."],
          ["GST", "If you’re registered for GST, income and expenses on your tax return exclude GST, and expenses are reduced by the GST credits you claimed on your BAS. GST on rideshare is charged on the full fare, so enter each period’s service fee in Kerbside to report G1, 1A and 1B correctly."],
          ["Car expenses", "You can use either the logbook method or the cents per kilometre method for each car, not both. The 2026–27 cents per kilometre rate is 91 cents, for up to 5,000 business kilometres. Depreciation is capped at the car cost limit; check the ATO’s published limit for the year."],
          ["Records", "Keep receipts, tax invoices, your logbook and odometer readings for 5 years. Purchases over $82.50 (incl GST) need a tax invoice to claim a GST credit."],
          ["Selling a car", "Selling or trading in a car used for business can create a GST amount on your BAS and a balancing adjustment on your tax return. Ask a registered tax agent."],
          ["Not tax advice", "Kerbside is a record-keeping tool, not a registered tax agent. This summary is general information based on the ATO’s published instructions and doesn’t take your full circumstances into account. If you’re unsure, speak to a registered tax agent or the ATO."],
        ].map(([h, b]) => (
          <View key={h} wrap={false} style={{ marginBottom: 10 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 3 }}>{h}</Text>
            <Text style={s.p}>{b}</Text>
          </View>
        ))}
        <Text style={s.small}>Sources: ATO Business and professional items schedule instructions 2026 (P8); Individual supplementary tax return instructions 2026 (question 15); ATO Simpler BAS; ATO ride-sourcing guidance; ATO logbook and cents per kilometre method pages. Generated {date(r.generated)}.</Text>
      </Sheet>
    </Document>
  );
}
