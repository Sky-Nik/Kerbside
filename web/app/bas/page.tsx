import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, loadYearData, pickQuarter } from "@/lib/data";
import { BAS_DUE, carPurchaseGst, fyRange, summarise } from "@/lib/tax";
import { aud, auDate, pct } from "@/lib/fmt";
import { addCarTx, deleteRow } from "@/app/actions";
import { PageHead } from "@/components/QuarterTabs";
import { Icon } from "@/components/Icon";

const LABELS = [
  ["G1", "Total sales"], ["1A", "GST on sales"], ["G10", "Capital purchases"],
  ["G11", "Non-capital purchases"], ["1B", "GST on purchases"],
] as const;
const QN = ["Jul – Sep", "Oct – Dec", "Jan – Mar", "Apr – Jun"];
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
  const cq = pickQuarter(undefined, fy);
  const carPct = Math.round((s.annualCarPct || 0) * 1000) / 10;

  return (
    <main>
      <PageHead eyebrow={`FY ${fy}`} title="BAS summary">
        <div className="text-sm lg:text-right">
          <p className="text-mute">Year net GST {s.basYear.net < 0 ? "refund" : "payable"}</p>
          <p className={`text-2xl font-bold tabular-nums ${s.basYear.net < 0 ? "text-pos" : ""}`}>{aud(Math.abs(s.basYear.net))}</p>
        </div>
      </PageHead>
      <p className="rise rise-1 mb-6 text-sm text-ink-2">Copy each label into your Business Activity Statement (myGov → ATO → Activity statements). Amounts include GST where marked.</p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {s.bas.map((b, i) => (
          <section key={i} className={`rise rise-${i + 1} flex flex-col rounded-2xl p-5 ${i === cq ? "ring-2 ring-ink" : "ring-1 ring-line"}`}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold">Q{i + 1} <span className="font-medium text-mute">{QN[i]}</span></h2>
              {i === cq && <span className="pill bg-black text-white">Current</span>}
            </div>
            <p className="muted mb-4">Due {BAS_DUE[i]}</p>
            <dl className="flex-1 space-y-2">
              {LABELS.map(([k, d]) => (
                <div key={k} className="flex items-center gap-3 rounded-xl bg-wash px-3 py-2.5">
                  <dt className="grid h-8 w-11 shrink-0 place-items-center rounded-md bg-black text-xs font-bold text-white">{k}</dt>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-mute">{d}</span>
                  <dd className="font-bold tabular-nums">{aud(b[k])}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm font-medium">{b.net < 0 ? "Refund" : b.net > 0 ? "To pay" : "Nil"}</span>
              <span className={`text-2xl font-bold tabular-nums ${b.net < 0 ? "text-pos" : ""}`}>{aud(Math.abs(b.net))}</span>
            </div>
          </section>
        ))}
      </div>

      <section className="rise rise-4 mt-10">
        <h2 className="mb-1 text-xl font-bold tracking-[-0.01em]">Car bought or sold</h2>
        <p className="muted mb-4 max-w-3xl">
          GST credit on a car is capped at the car limit ({aud(year.car_limit)}, so at most {aud(year.car_limit / 11)} GST) and
          multiplied by business use. A seller who isn’t GST-registered gives no credit. Only declare a sale if you used the car in the business.
        </p>
        <div className="card space-y-5">
          {(tx ?? []).length > 0 && (
            <ul className="divide-y divide-wash-2">
              {(tx ?? []).map((t) => {
                const g = t.kind === "purchase" ? carPurchaseGst(t.seller, t.gst, year.car_limit, t.business_pct)
                  : year.gst_registered ? Math.round(t.amount * t.business_pct / 11 * 100) / 100 : 0;
                return (
                  <li key={t.id} className="flex items-center gap-4 py-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black text-white"><Icon name="car" size={20} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{t.kind === "purchase" ? "Purchase" : "Sale / trade-in"} · {aud(t.amount)}</span>
                      <span className="block truncate text-[13px] text-mute">{auDate(t.date)}{t.seller ? ` · ${SELLERS[t.seller]}` : ""} · {pct(t.business_pct)} business</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-bold tabular-nums">{aud(g)}</span>
                      <span className="block text-[11px] text-mute">{t.kind === "purchase" ? "GST credit (1B)" : "GST on sale (1A)"}</span>
                    </span>
                    <form action={deleteRow}><input type="hidden" name="table" value="car_transactions" /><input type="hidden" name="id" value={t.id} /><button className="btn-danger">Delete</button></form>
                  </li>
                );
              })}
            </ul>
          )}
          <form action={addCarTx} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-7">
            <label className="field">Type<select name="kind"><option value="purchase">Purchase</option><option value="sale">Sale / trade-in</option></select></label>
            <label className="field">Date<input name="date" type="date" required min={start} max={end} /></label>
            <label className="field lg:col-span-2">Seller (purchases)<select name="seller">{Object.entries(SELLERS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="field">Price incl GST<input name="amount" type="number" step="0.01" required placeholder="0.00" /></label>
            <label className="field">GST on invoice<input name="gst" type="number" step="0.01" placeholder="0.00" /></label>
            <label className="field">Business %<input name="business_pct" type="number" step="0.1" min="0" max="100" required defaultValue={carPct} /></label>
            <button className="btn lg:col-start-7"><Icon name="plus" size={18} />Add</button>
          </form>
        </div>
      </section>
    </main>
  );
}
