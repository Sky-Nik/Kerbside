import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, pickQuarter, requirePlatforms } from "@/lib/data";
import { INCOME_LINES, mondayOf, monthsOf, overlappingIds, platformMonth } from "@/lib/tax";
import { aud, auDate } from "@/lib/fmt";
import { deleteRow } from "@/app/actions";
import { PageHead, QuarterTabs } from "@/components/QuarterTabs";
import { IncomeForm } from "@/components/IncomeForm";
import { ImportDocument } from "@/components/ImportDocument";
import { Icon } from "@/components/Icon";
import { PlatformTile } from "@/components/PlatformTile";

type Entry = { id: string; start_date: string; end_date: string; platform: string; lines: Record<string, number>; fees: Record<string, number> };

export default async function Income({ searchParams }: PageProps<"/income">) {
  const { supabase } = await requireUser();
  const platforms = await requirePlatforms(supabase);
  const fy = await getFy();
  const q = pickQuarter((await searchParams).q, fy);
  const months = monthsOf(fy, q);
  const qStart = months[0];
  const qEnd = new Date(Date.UTC(Number(months[2].slice(0, 4)), Number(months[2].slice(5, 7)), 0)).toISOString().slice(0, 10);
  const [year, { data, error }] = await Promise.all([
    loadYear(supabase, fy),
    supabase.from("income_entries").select("id,start_date,end_date,platform,lines,fees")
      .gte("start_date", qStart).lte("start_date", qEnd).order("start_date", { ascending: false }).order("platform"),
  ]);
  if (error) throw new Error(error.message);
  const entries = (data ?? []) as Entry[];
  const rows = entries.map((e) => ({ ...e, ...platformMonth(e.platform, e.lines, e.fees ?? {}, year.gst_registered) }));
  const total = (k: string) => entries.reduce((s, e) => s + (Number(e.lines[k]) || 0), 0);
  const sales = rows.reduce((s, r) => s + r.sales, 0);
  const groups = [...Map.groupBy(rows, (r) => `${r.start_date}|${r.end_date}`)];
  const gst = rows.reduce((s, r) => s + r.gst, 0);

  // Same platform with overlapping dates would double count.
  // Compare against every entry whose dates touch this quarter, including ones that start in an earlier quarter.
  const { data: touching } = await supabase.from("income_entries").select("id,start_date,end_date,platform")
    .lte("start_date", qEnd).gte("end_date", qStart);
  const overlaps = overlappingIds(touching ?? []);

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = today >= qStart && today <= qEnd ? mondayOf(today) : qStart;

  return (
    <main>
      <PageHead eyebrow={`FY ${fy}`} title="Income">
        <QuarterTabs path="/income" q={q} />
      </PageHead>

      <div className="rise rise-1 mb-6 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <div className="card-ink">
          <p className="text-sm text-white/60">Total sales this quarter (BAS G1, incl GST)</p>
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
        <IncomeForm defaultFrom={defaultFrom} platforms={platforms} />
        <details className="mt-6 border-t border-wash-2 pt-4">
          <summary className="cursor-pointer text-sm font-medium">Missed some weeks? Import a monthly tax summary (PDF)</summary>
          <div className="mt-3"><ImportDocument intro="Upload a monthly Uber tax summary. Kerbside reads the amounts, you check the dates, and it’s added as income." /></div>
        </details>
      </section>

      {overlaps.size > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-[#fff8e6] p-4 text-sm ring-1 ring-warn">
          <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
          <p>Some entries for the same platform have overlapping dates (marked below), so that income may be counted twice. If they’re duplicates, delete one.</p>
        </div>
      )}

      <section className="rise rise-3">
        <h2 className="mb-2 text-xl font-bold tracking-[-0.01em]">Earnings this quarter</h2>
        {rows.length === 0 ? (
          <div className="card-wash py-10 text-center">
            <Icon name="income" size={28} className="mx-auto text-mute" />
            <p className="mt-2 font-medium">Nothing entered yet</p>
            <p className="muted">Add each week from your Uber and DiDi driver apps.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(([key, items]) => {
              const g = items[0];
              return (
                <div key={key} className="card !p-0">
                  <div className="flex items-baseline justify-between gap-3 border-b border-wash-2 px-5 py-3">
                    <h3 className="font-bold">
                      {g.start_date === g.end_date ? auDate(g.start_date) : `${auDate(g.start_date)} – ${auDate(g.end_date)}`}
                    </h3>
                    <span className="text-lg font-bold tabular-nums">{aud(items.reduce((s, r) => s + r.sales, 0))}</span>
                  </div>
                  <ul className="divide-y divide-wash-2 px-5">
                    {items.map((r) => (
                      <li key={r.id} className="flex items-center gap-x-4 py-3">
                        <PlatformTile name={r.platform} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {r.platform}
                            {overlaps.has(r.id) && <span className="pill ml-2 bg-[#fff8e6] text-ink ring-1 ring-warn">Overlaps</span>}
                          </span>
                          <span className="block truncate text-[13px] text-mute">
                            {INCOME_LINES.filter((l) => Number(r.lines[l])).map((l) => `${l} ${aud(Number(r.lines[l]))}`).concat(Number(r.fees?.["Service fees"]) ? [`Service fee ${aud(Number(r.fees["Service fees"]))}`] : []).join(" · ") || "No amounts"}
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
        <p className="muted mt-4">An entry counts in the quarter its “From” date falls in. To fix an entry, delete it and add it again.</p>
      </section>
    </main>
  );
}
