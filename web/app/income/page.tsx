import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, pickQuarter } from "@/lib/data";
import { PLATFORMS, gstOf, monthsOf, platformMonth } from "@/lib/tax";
import { aud, auDate, monthName } from "@/lib/fmt";
import { addOtherIncome, deleteRow, savePlatformMonth } from "@/app/actions";
import { PageHead, QuarterTabs } from "@/components/QuarterTabs";
import { Icon } from "@/components/Icon";

type PM = { month: string; platform: string; lines: Record<string, number>; fees: Record<string, number> };

export default async function Income({ searchParams }: PageProps<"/income">) {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const q = pickQuarter((await searchParams).q, fy);
  const months = monthsOf(fy, q);
  const lastDay = new Date(Date.UTC(Number(months[2].slice(0, 4)), Number(months[2].slice(5, 7)), 0)).toISOString().slice(0, 10);
  const [year, pmRes, oiRes] = await Promise.all([
    loadYear(supabase, fy),
    supabase.from("platform_months").select("month,platform,lines,fees").in("month", months),
    supabase.from("other_income").select("*").gte("date", months[0]).lte("date", lastDay).order("date"),
  ]);
  const saved = new Map((pmRes.data as PM[] ?? []).map((r) => [`${r.month}|${r.platform}`, r]));
  const other = oiRes.data ?? [];
  const quarterSales = [...saved.values()].reduce((s, r) => s + platformMonth(r.platform, r.lines, r.fees, year.gst_registered).sales, 0)
    + other.reduce((s, o) => s + Number(o.amount), 0);

  return (
    <main>
      <PageHead eyebrow={`FY ${fy}`} title="Income">
        <QuarterTabs path="/income" q={q} />
      </PageHead>

      <div className="rise rise-1 mb-8 flex flex-col gap-4 rounded-2xl bg-wash p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-ink-2">
          Copy figures from each platform’s <b>monthly tax summary</b>, not weekly statements. Pass-through fees (split
          fare, tolls, airport, booking, city) fill in from income. Only type one if your summary shows a different amount.
        </p>
        <div className="shrink-0 sm:text-right">
          <p className="text-xs text-mute">Quarter sales incl GST</p>
          <p className="text-2xl font-bold tabular-nums">{aud(quarterSales)}</p>
        </div>
      </div>

      <div className="space-y-10">
        {months.map((m, mi) => (
          <section key={m} className={`rise rise-${mi + 2}`}>
            <h2 className="mb-3 text-xl font-bold tracking-[-0.01em]">{monthName(m)}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {Object.entries(PLATFORMS).map(([platform, def]) => {
                const row = saved.get(`${m}|${platform}`);
                const lines = row?.lines ?? {};
                const fees = row?.fees ?? {};
                const calc = platformMonth(platform, lines, fees, year.gst_registered);
                const feeTypes = [...new Set([...def.fees, ...Object.values(def.passThrough)])];
                return (
                  <details key={platform} open={!!row} className="group rounded-2xl ring-1 ring-line open:ring-ink">
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${row ? "bg-black text-white" : "bg-wash-2 text-ink-2"}`}>
                        {platform.split(" ").map((w) => w[0]).join("")}
                      </span>
                      <span className="flex-1">
                        <span className="block font-bold">{platform}</span>
                        <span className="block text-[13px] text-mute">{row ? `Fees ${aud(calc.feeTotal)}` : "Not entered"}</span>
                      </span>
                      {row && <span className="font-bold tabular-nums">{aud(calc.sales)}</span>}
                      <Icon name="chevron" size={18} className="text-mute transition group-open:rotate-90" />
                    </summary>
                    <form action={savePlatformMonth} key={JSON.stringify(row ?? {})} className="space-y-5 border-t border-line p-4">
                      <input type="hidden" name="month" value={m} />
                      <input type="hidden" name="platform" value={platform} />
                      <div>
                        <p className="eyebrow mb-2">Income incl GST</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {def.lines.map((l) => (
                            <label key={l} className="field justify-end">{l}
                              <input name={`line:${l}`} type="number" step="0.01" inputMode="decimal" defaultValue={lines[l] ?? ""} placeholder="0.00" />
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="eyebrow mb-2">Fees deducted incl GST</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {feeTypes.map((t) => {
                            const derived = calc.feeRows.find((r) => r.type === t)?.derived ?? 0;
                            const auto = Object.values(def.passThrough).includes(t);
                            return (
                              <label key={t} className="field justify-end">
                                <span>{t}{auto && <span className="ml-1 text-[11px] font-normal text-mute">auto</span>}</span>
                                <input name={`fee:${t}`} type="number" step="0.01" inputMode="decimal" defaultValue={fees[t] ?? ""}
                                  placeholder={auto ? derived.toFixed(2) : "0.00"} />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-wash-2 pt-4">
                        <span className="text-[13px] text-mute">GST on sales <b className="text-ink">{aud(calc.gst)}</b> · on fees <b className="text-ink">{aud(calc.feeGst)}</b></span>
                        <button className="btn btn-sm">Save {platform}</button>
                      </div>
                    </form>
                  </details>
                );
              })}
            </div>
          </section>
        ))}

        <section className="rise rise-4">
          <h2 className="mb-1 text-xl font-bold tracking-[-0.01em]">Other rideshare, delivery & ABN income</h2>
          <p className="muted mb-4">One line per deposit or monthly total. Tick GST-free only for exempt income such as NDIS.</p>
          <div className="card space-y-5">
            {other.length > 0 ? (
              <ul className="divide-y divide-wash-2">
                {other.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-wash-2 text-xs font-bold">{o.payer.slice(0, 2).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{o.payer}{o.gst_free && <span className="pill ml-2 bg-wash-2 text-ink-2">GST-free</span>}</span>
                      <span className="block truncate text-[13px] text-mute">{auDate(o.date)}{o.description ? ` · ${o.description}` : ""}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-bold tabular-nums">{aud(o.amount)}</span>
                      <span className="block text-[11px] text-mute">GST {aud(gstOf(o.amount, year.gst_registered, o.gst_free))}</span>
                    </span>
                    <form action={deleteRow}><input type="hidden" name="table" value="other_income" /><input type="hidden" name="id" value={o.id} /><button className="btn-danger">Delete</button></form>
                  </li>
                ))}
              </ul>
            ) : <p className="muted">Nothing this quarter.</p>}
            <form action={addOtherIncome} className="grid items-end gap-3 border-t border-wash-2 pt-5 sm:grid-cols-2 lg:grid-cols-6">
              <label className="field">Date<input name="date" type="date" required min={months[0]} max={lastDay} /></label>
              <label className="field">Payer<input name="payer" required placeholder="e.g. Ola" /></label>
              <label className="field lg:col-span-2">Description<input name="description" placeholder="Optional" /></label>
              <label className="field">Amount incl GST<input name="amount" type="number" step="0.01" required placeholder="0.00" /></label>
              <div className="flex h-11 items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="gst_free" />GST-free</label>
                <button className="btn btn-sm"><Icon name="plus" size={16} />Add</button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
