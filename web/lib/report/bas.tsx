import { Document, Text, View } from "@react-pdf/renderer";
import { BAS_DUE, INCOME_LINES, round2 } from "@/lib/tax";
import type { ReportData } from "./data";
import { C, Cover, LabelBox, Rows, Sheet, Steps, Table, Title, date, dollars, fySlash, money, s } from "./pdf";

const QN = ["July – September", "October – December", "January – March", "April – June"];

/** Quarterly BAS report. Labels and steps follow the ATO's Simpler BAS (G1, 1A, 1B). */
export function BasReport({ r, q }: { r: ReportData; q: number }) {
  const b = r.s.bas[q];
  const docTitle = `BAS summary – Q${q + 1} ${fySlash(r.fy)}`;
  const income = r.income.filter((e) => e.q === q);
  const expenses = r.expenses.filter((e) => e.q === q);
  const withReceipt = expenses.filter((e) => e.receipt_path).length;
  const refund = b.net < 0;
  const first = r.name.split(" ")[0];

  // Income by platform
  const platforms = [...new Set(income.map((e) => e.platform))];
  const byPlatform = platforms.map((p) => {
    const rows = income.filter((e) => e.platform === p);
    const line = (k: string) => round2(rows.reduce((t, e) => t + (Number(e.lines[k]) || 0), 0));
    const fee = round2(rows.reduce((t, e) => t + (Number(e.fees?.["Service fees"]) || 0), 0));
    const sales = round2(rows.reduce((t, e) => t + e.calc.sales, 0));
    const gst = round2(rows.reduce((t, e) => t + e.calc.gst, 0));
    return { p, line, fee, sales, gst };
  });
  // Expenses by tax line
  const lines = [...new Set(expenses.map((e) => e.calc.line))].map((l) => {
    const rows = expenses.filter((e) => e.calc.line === l);
    return { l, total: round2(rows.reduce((t, e) => t + Number(e.amount), 0)), gst: round2(rows.reduce((t, e) => t + e.calc.gst, 0)) };
  });
  const feeGst = round2(income.reduce((t, e) => t + e.calc.feeGst, 0));
  const missingFee = income.some((e) => "Net fare" in e.lines && !Number(e.fees?.["Service fees"]));

  return (
    <Document title={docTitle} author="Kerbside" subject={`BAS Q${q + 1} ${r.fy}`}>
      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Cover
          fyLabel={`${fySlash(r.fy)} · Quarter ${q + 1} (${QN[q]})`}
          title="BAS summary"
          greeting={`Your GST for the quarter, ${first}.`}
          intro="This summary works out the figures for your Business Activity Statement (BAS) from the income, expenses and receipts you recorded in Kerbside. Page 2 shows exactly what to type into each BAS label."
          left={[["G1 Total sales", money(b.G1)], ["1A GST on sales", money(b["1A"])], ["1B GST on purchases", money(b["1B"])]]}
          headline={{ label: refund ? "GST refund" : "GST to pay", value: money(Math.abs(b.net)), tone: refund ? "pos" : undefined }}
          stats={[
            { value: BAS_DUE[q], label: "Due date (self-lodged)" },
            { value: String(income.length), label: "Income entries" },
            { value: `${withReceipt}/${expenses.length}`, label: "Expenses with receipts" },
          ]}
        />
      </Sheet>

      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Title title="Enter these in your BAS" sub={`Quarter ${q + 1}: ${QN[q]} · Simpler BAS`} />
        <LabelBox label="G1" desc="Total sales" value={dollars(b.G1)} note="Answer Yes to “Does the amount shown at G1 include GST?”" />
        <LabelBox label="1A" desc="GST on sales" value={dollars(b["1A"])} />
        <LabelBox label="1B" desc="GST on purchases" value={dollars(b["1B"])} />
        <View style={{ ...s.total, marginTop: 8 }}>
          <Text>{refund ? "Refund from the ATO" : "Amount to pay the ATO"}</Text>
          <Text>{dollars(Math.abs(Math.trunc(b["1A"]) - Math.trunc(b["1B"])))}</Text>
        </View>
        <Text style={{ ...s.small, marginTop: 6, marginBottom: 14 }}>
          Whole dollars only: leave out the cents, don’t round up. If a label has nothing to report, enter 0 rather than leaving it blank.
          Only complete G10 (capital purchases {dollars(b.G10)}) and G11 (non-capital purchases {dollars(b.G11)}) if your BAS asks for them.
        </Text>
        <Text style={s.blockTitle}>How to lodge</Text>
        <Steps items={[
          "Sign in to myGov and open the Australian Taxation Office (ATO) service, or use Online services for business.",
          `Go to Lodgments → Activity statements and open the statement for ${QN[q]}.`,
          "Enter G1, 1A and 1B from the boxes above. Tick Yes for “G1 includes GST”.",
          "If the statement also shows a PAYG instalment, use the amount or rate the ATO has printed there.",
          `Lodge and pay (or receive your refund) by ${BAS_DUE[q]}. Lodging through a registered tax or BAS agent may give you more time.`,
        ]} />
        {missingFee && (
          <View style={{ backgroundColor: C.kerbSoft, padding: 10, borderRadius: 6, marginTop: 10 }} wrap={false}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 3 }}>Check: service fees missing</Text>
            <Text style={s.p}>
              Some income entries have a net fare but no service fee. The ATO charges GST on the full fare the rider pays, so G1 and 1A should
              include the platform’s fee, and 1B the GST on that fee. Your GST to pay stays the same, but G1, 1A and 1B are understated until the fees are added.
            </Text>
          </View>
        )}
      </Sheet>

      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Title title="How your BAS was calculated" sub={`${fySlash(r.fy)} · Quarter ${q + 1}`} />
        {byPlatform.map((x) => (
          <Rows key={x.p} title={`${x.p} income`}
            rows={[...INCOME_LINES.map((k) => [k, money(x.line(k))] as [string, string]),
              ["Service fee (added back – GST is on the full fare)", money(x.fee)], ["GST included", money(x.gst)]]}
            total={[`Total ${x.p} sales`, money(x.sales)]} />
        ))}
        {byPlatform.length === 0 && <Text style={s.p}>No income recorded this quarter.</Text>}
        <Rows title="GST credits on purchases"
          rows={[
            ...lines.map((x) => [`${x.l} (spent ${money(x.total)})`, money(x.gst)] as [string, string]),
            ["Platform service fees", money(feeGst)],
            ...(b.G10 ? [["Car purchase (capped at the car limit × business use)", money(round2(b["1B"] - feeGst - lines.reduce((t, x) => t + x.gst, 0)))] as [string, string]] : []),
          ]}
          total={["Total GST credits (1B)", money(b["1B"])]} />
        <Text style={{ ...s.small, marginTop: 8 }}>
          GST credits are only claimed for the business-use share of mixed-use costs (your business-use % for this quarter, from Settings),
          and only on purchases that include GST.
        </Text>
      </Sheet>

      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Title title="Your records" sub="Keep these, with receipts, for 5 years" />
        <Text style={s.blockTitle}>Income entries</Text>
        <Table
          cols={[{ h: "Dates", w: 2.2 }, { h: "Platform", w: 1 }, { h: "Net fare", w: 1, right: true }, { h: "Promotions", w: 1, right: true },
            { h: "Tips", w: 0.8, right: true }, { h: "Service fee", w: 1, right: true }, { h: "Sales", w: 1, right: true }, { h: "GST", w: 0.9, right: true }]}
          rows={income.map((e) => [`${date(e.start_date)} – ${date(e.end_date)}`, e.platform, money(Number(e.lines["Net fare"]) || 0),
            money(Number(e.lines["Promotions"]) || 0), money(Number(e.lines["Tips"]) || 0), money(Number(e.fees?.["Service fees"]) || 0),
            money(e.calc.sales), money(e.calc.gst)])} />
        <Text style={{ ...s.blockTitle, marginTop: 18 }}>Expenses</Text>
        <Table
          cols={[{ h: "Date", w: 1 }, { h: "Supplier", w: 1.6 }, { h: "Category", w: 2.4 }, { h: "Amount", w: 1, right: true },
            { h: "Bus. %", w: 0.7, right: true }, { h: "GST credit", w: 1, right: true }, { h: "Receipt", w: 0.9 }]}
          rows={expenses.map((e) => [date(e.date), e.description ?? "", e.category, money(Number(e.amount)),
            `${Math.round(e.calc.share * 100)}%`, money(e.calc.gst), e.receipt_path ? "Attached" : "MISSING"])} />
        <Text style={{ ...s.small, marginTop: 16 }}>
          A tax invoice is needed to claim a GST credit on purchases over $82.50 (incl GST). Income entries count in the quarter their start date falls in.
          Generated {date(r.generated)}.
        </Text>
      </Sheet>
    </Document>
  );
}
