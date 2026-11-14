import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, pickQuarter } from "@/lib/data";
import { INCOME_LINES, addDays, monthsOf, platformMonth } from "@/lib/tax";
import { aud, auDate, monthName } from "@/lib/fmt";
import { deleteRow } from "@/app/actions";
import { PageHead, QuarterTabs } from "@/components/QuarterTabs";
import { IncomeForm } from "@/components/IncomeForm";
import { Icon } from "@/components/Icon";

type Entry = { id: string; period: "week" | "month"; start_date: string; platform: string; lines: Record<string, number> };

export default async function Income({ searchParams }: PageProps<"/income">) {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const q = pickQuarter((await searchParams).q, fy);
  const months = monthsOf(fy, q);
  const qStart = months[0];
  const qEnd = new Date(Date.UTC(Number(months[2].slice(0, 4)), Number(months[2].slice(5, 7)), 0)).toISOString().slice(0, 10);
  const [year, { data, error }] = await Promise.all([
    loadYear(supabase, fy),
    supabase.from("income_entries").select("id,period,start_date,platform,lines")
      .gte("start_date", qStart).lte("start_date", qEnd).order("start_date", { ascending: false }).order("platform"),
  ]);
  if (error) throw new Error(error.message);
  const entries = (data ?? []) as Entry[];
  const rows = entries.map((e) => ({ ...e, ...platformMonth(e.platform, e.lines, {}, year.gst_registered) }));
  const total = (k: string) => entries.reduce((s, e) => s + (Number(e.lines[k]) || 0), 0);
  const sales = rows.reduce((s, r) => s + r.sales, 0);
  const groups = [...Map.groupBy(rows, (r) => `${r.period}|${r.start_date}`)];
  const gst = rows.reduce((s, r) => s + r.gst, 0);

  // Same platform entered both weekly and monthly for one month would double count.
  const overlaps = rows.filter((m) => m.period === "month" && rows.some((w) => w.period === "week" &&
    w.platform === m.platform && w.start_date.slice(0, 7) === m.start_date.slice(0, 7)));

  const today = new Date().toISOString().slice(0, 10);
  const defaultWeek = today >= qStart && today <= qEnd ? today : qStart;

  return (
    <main>
      <PageHead eyebrow={`FY ${fy}`} title="Income">
        <QuarterTabs path="/income" q={q} />
      </PageHead>

      <div className="rise rise-1 mb-6 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <div className="card-ink">
          <p className="text-sm text-white/60">Total earnings this quarter (incl GST)</p>
          <p className="display mt-1 tabular-nums">{aud(sales)}</p>
          <p className="mt-2 text-sm text-white/60">GST included (1A) {aud(gst)}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {INCOME_LINES.map((l) => (
            <div key={l} className="card-wash flex flex-col justify-end py-4">
              <p className="text-xs text-mute">{l}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{aud(total(l))}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="card rise rise-2 mb-8">
        <h2 className="h2 mb-4">Add earnings</h2>
        <IncomeForm min={qStart} max={qEnd} defaultWeek={defaultWeek} />
      </section>

      {overlaps.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[#fff8e6] p-4 text-sm ring-1 ring-warn">
          <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
          <p>
            {overlaps.map((o) => `${o.platform} ${monthName(o.start_date)}`).join(", ")} {overlaps.length === 1 ? "has" : "have"} both
            weekly and monthly entries, so that income is counted twice. Delete one of them.
          </p>
        </div>
      )}

      <section className="rise rise-3">
        <h2 className="mb-2 text-xl font-bold tracking-[-0.01em]">Earnings this quarter</h2>
        {rows.length === 0 ? (
          <div className="card-wash py-10 text-center">
            <Icon name="income" size={28} className="mx-auto text-mute" />
            <p className="mt-2 font-medium">Nothing entered yet</p>
            <p className="muted">Add each week (or month) from your Uber and DiDi driver apps.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(([key, items]) => {
              const g = items[0];
              return (
                <div key={key} className="card !p-0">
                  <div className="flex items-baseline justify-between gap-3 border-b border-wash-2 px-5 py-3">
                    <h3 className="font-bold">
                      {g.period === "week" ? `Week ${auDate(g.start_date)} – ${auDate(addDays(g.start_date, 6))}` : monthName(g.start_date)}
                      {g.period === "month" && <span className="pill ml-2 bg-wash-2 text-ink-2">Monthly</span>}
                    </h3>
                    <span className="text-lg font-bold tabular-nums">{aud(items.reduce((s, r) => s + r.sales, 0))}</span>
                  </div>
                  <ul className="divide-y divide-wash-2 px-5">
                    {items.map((r) => (
                      <li key={r.id} className="flex items-center gap-x-4 py-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${r.platform === "Uber" ? "bg-black text-white" : "bg-wash-2"}`}>
                          {r.platform === "Uber" ? "U" : "D"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{r.platform}</span>
                          <span className="block truncate text-[13px] text-mute">
                            {INCOME_LINES.filter((l) => Number(r.lines[l])).map((l) => `${l} ${aud(Number(r.lines[l]))}`).join(" · ") || "No amounts"}
                          </span>
                        </span>
                        <span className="font-bold tabular-nums">{aud(r.sales)}</span>
                        <form action={deleteRow}><input type="hidden" name="table" value="income_entries" /><input type="hidden" name="id" value={r.id} /><button className="btn-danger">Delete</button></form>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        <p className="muted mt-4">A week counts in the quarter its Monday falls in. To fix an entry, delete it and add it again.</p>
      </section>
    </main>
  );
}
