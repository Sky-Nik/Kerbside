import { Document, Image, Text, View } from "@react-pdf/renderer";
import { round2 } from "@/lib/tax";
import type { ReportData } from "./data";
import { C, Cover, Sheet, Table, Title, date, fySlash, money, s } from "./pdf";

/** Proof pack: register of every expense, then each photo receipt on its own page. PDFs/HEIC are listed, not embedded. */
export function ReceiptsReport({ r, images }: { r: ReportData; images: Record<string, string> }) {
  const docTitle = `Receipts register – ${fySlash(r.fy)}`;
  const withReceipt = r.expenses.filter((e) => e.receipt_path);
  const total = round2(r.expenses.reduce((t, e) => t + Number(e.amount), 0));
  const covered = round2(withReceipt.reduce((t, e) => t + Number(e.amount), 0));
  const embedded = withReceipt.filter((e) => images[e.id]);

  return (
    <Document title={docTitle} author="Kerbside">
      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Cover
          fyLabel={fySlash(r.fy)}
          title="Receipts register"
          greeting="Proof for every expense you claimed."
          intro="A list of all business expenses recorded in Kerbside with the receipt attached to each, followed by copies of the photo receipts. Keep this with your tax records for 5 years."
          left={[["Expenses recorded", String(r.expenses.length)], ["With a receipt", String(withReceipt.length)], ["Missing a receipt", String(r.expenses.length - withReceipt.length)]]}
          headline={{ label: "Total spent (incl GST)", value: money(total) }}
          stats={[
            { value: money(covered), label: "Covered by receipts" },
            { value: money(round2(total - covered)), label: "Not yet covered" },
            { value: String(embedded.length), label: "Receipt copies attached" },
          ]}
        />
      </Sheet>

      <Sheet name={r.name} abn={r.abn} docTitle={docTitle}>
        <Title title="Expense register" sub="Every expense, with its receipt status" />
        <Table cols={[{ h: "Date", w: 1 }, { h: "Supplier", w: 1.6 }, { h: "Category", w: 2.3 }, { h: "Amount", w: 1, right: true },
          { h: "GST credit", w: 1, right: true }, { h: "Receipt", w: 1.5 }]}
          rows={r.expenses.map((e) => [date(e.date), e.description ?? "", e.category, money(Number(e.amount)), money(e.calc.gst),
            !e.receipt_path ? "MISSING" : images[e.id] ? `Page copy` : `Attached (${(e.receipt_name ?? "").split(".").pop()?.toUpperCase() || "file"})`])} />
        <Text style={{ ...s.small, marginTop: 10 }}>
          Purchases over $82.50 (incl GST) need a tax invoice to claim a GST credit. Receipts saved as PDF or HEIC are kept in Kerbside and listed
          here; open them in the app’s Expenses page.
        </Text>
      </Sheet>

      {embedded.map((e) => (
        <Sheet key={e.id} name={r.name} abn={r.abn} docTitle={docTitle}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: C.wash, padding: 10, marginBottom: 12 }}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{date(e.date)} · {e.description || e.category}</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{money(Number(e.amount))}</Text>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          <Image src={images[e.id]} style={{ maxHeight: 600, objectFit: "contain" }} />
          <Text style={{ ...s.small, marginTop: 8 }}>{e.category} · GST credit {money(e.calc.gst)} · deductible {money(e.calc.deductible)}</Text>
        </Sheet>
      ))}
    </Document>
  );
}
