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

      <div className="rise rise-1 mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[...INCOME_LINES.map((l) => [l, total(l)] as const), ["Total incl GST", sales] as const, ["GST (1A)", gst] as const]
          .map(([k, v], i) => (
            <div key={k} className={`py-4 ${i === 3 ? "card-ink !py-4" : "card-wash"} ${i === 4 ? "col-span-2 lg:col-span-1" : ""}`}>
              <p className={`text-xs ${i === 3 ? "text-white/60" : "text-mute"}`}>{k}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{aud(v)}</p>
            </div>
          ))}
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
          <ul className="divide-y divide-wash-2">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-4 sm:flex-nowrap">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${r.platform === "Uber" ? "bg-black text-white" : "bg-wash-2"}`}>
                  {r.platform === "Uber" ? "U" : "D"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {r.platform} · {r.period === "week" ? `Week ${auDate(r.start_date)} – ${auDate(addDays(r.start_date, 6))}` : monthName(r.start_date)}
                    {r.period === "month" && <span className="pill ml-2 bg-wash-2 text-ink-2">Monthly</span>}
                  </span>
                  <span className="block truncate text-[13px] text-mute">
                    {INCOME_LINES.map((l) => `${l} ${aud(Number(r.lines[l]) || 0)}`).join(" · ")}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-bold tabular-nums">{aud(r.sales)}</span>
                  <span className="block text-[11px] text-mute">GST {aud(r.gst)}</span>
                </span>
                <form action={deleteRow}><input type="hidden" name="table" value="income_entries" /><input type="hidden" name="id" value={r.id} /><button className="btn-danger">Delete</button></form>
              </li>
            ))}
          </ul>
        )}
        <p className="muted mt-4">A week counts in the quarter its Monday falls in. To change an entry, save the same week or month again.</p>
      </section>
    </main>
  );
}
