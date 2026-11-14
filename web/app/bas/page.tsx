import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, loadYearData } from "@/lib/data";
import { BAS_DUE, QUARTERS, carPurchaseGst, fyRange, summarise } from "@/lib/tax";
import { aud, auDate, pct } from "@/lib/fmt";
import { addCarTx, deleteRow } from "@/app/actions";

const LABELS = [
  ["G1", "Total sales (incl GST)"], ["1A", "GST on sales"], ["G10", "Capital purchases (incl GST)"],
  ["G11", "Non-capital purchases (incl GST)"], ["1B", "GST on purchases"],
] as const;
const SELLERS: Record<string, string> = {
  dealer: "Dealer", private_gst: "Private seller – GST registered", private_no_gst: "Private seller – not GST registered",
};

export default async function Bas() {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const { start, end } = fyRange(fy);
  const [year, data, { data: tx }] = await Promise.all([
    loadYear(supabase, fy), loadYearData(supabase, fy),
    supabase.from("car_transactions").select("*").gte("date", start).lte("date", end).order("date"),
  ]);
  const s = summarise(year, data);
  const carPct = Math.round((s.annualCarPct || 0) * 1000) / 10;

  return (
    <main className="space-y-6">
      <h1 className="h1">BAS summary · FY {fy}</h1>
      <p className="text-sm text-slate-600">Copy these figures into your Business Activity Statement (myGov → ATO → Activity statements).</p>
      <section className="card overflow-x-auto">
        <table className="tbl min-w-[720px]">
          <thead><tr><th>Label</th><th>Description</th>{QUARTERS.map((q) => <th key={q} className="num">{q}</th>)}<th className="num">Year</th></tr></thead>
          <tbody>
            {LABELS.map(([k, d]) => (
              <tr key={k}><td className="font-medium">{k}</td><td>{d}</td>
                {s.bas.map((b, i) => <td key={i} className="num">{aud(b[k])}</td>)}<td className="num font-medium">{aud(s.basYear[k])}</td></tr>
            ))}
            <tr className="font-semibold"><td /><td>Net GST payable / (refund)</td>
              {s.bas.map((b, i) => <td key={i} className={`num ${b.net < 0 ? "text-green-700" : b.net > 0 ? "text-red-700" : ""}`}>{aud(b.net)}</td>)}
              <td className="num">{aud(s.basYear.net)}</td></tr>
            <tr><td /><td className="muted">Due (self-lodged)</td>{BAS_DUE.map((d) => <td key={d} className="num muted">{d}</td>)}<td /></tr>
          </tbody>
        </table>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Car bought or sold this year</h2>
        <p className="muted">
          GST credit on a car is capped at the car limit ({aud(year.car_limit)} → max {aud(year.car_limit / 11)} GST) and
          multiplied by business use. Nothing is claimable from a seller who isn’t GST registered. Only declare a sale if the car was used in the business.
        </p>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Type</th><th>Seller</th><th className="num">Amount</th><th className="num">GST on invoice</th><th className="num">Business %</th><th className="num">GST claimed / payable</th><th /></tr></thead>
          <tbody>
            {(tx ?? []).map((t) => (
              <tr key={t.id}>
                <td>{auDate(t.date)}</td><td>{t.kind === "purchase" ? "Purchase" : "Sale"}</td><td>{t.seller ? SELLERS[t.seller] : ""}</td>
                <td className="num">{aud(t.amount)}</td><td className="num">{t.kind === "purchase" ? aud(t.gst) : ""}</td>
                <td className="num">{pct(t.business_pct)}</td>
                <td className="num">{t.kind === "purchase" ? aud(carPurchaseGst(t.seller, t.gst, year.car_limit, t.business_pct))
                  : aud(year.gst_registered ? Math.round(t.amount * t.business_pct / 11 * 100) / 100 : 0)}</td>
                <td className="text-right"><form action={deleteRow}><input type="hidden" name="table" value="car_transactions" /><input type="hidden" name="id" value={t.id} /><button className="btn-danger">Delete</button></form></td>
              </tr>
            ))}
            {!tx?.length && <tr><td colSpan={8} className="muted">None this year.</td></tr>}
          </tbody>
        </table>
        <form action={addCarTx} className="grid items-end gap-2 sm:grid-cols-7">
          <label className="field">Type<select name="kind"><option value="purchase">Purchase</option><option value="sale">Sale / trade-in</option></select></label>
          <label className="field">Date<input name="date" type="date" required min={start} max={end} /></label>
          <label className="field">Seller (purchase)<select name="seller">{Object.entries(SELLERS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="field">Price incl GST & on-road<input name="amount" type="number" step="0.01" required /></label>
          <label className="field">GST on invoice<input name="gst" type="number" step="0.01" /></label>
          <label className="field">Business %<input name="business_pct" type="number" step="0.1" min="0" max="100" required defaultValue={carPct} /></label>
          <button className="btn">Add</button>
        </form>
      </section>
    </main>
  );
}
