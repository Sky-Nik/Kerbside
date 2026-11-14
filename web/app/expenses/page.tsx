import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, pickQuarter } from "@/lib/data";
import { expenseCalc, monthsOf } from "@/lib/tax";
import { aud, auDate, pct } from "@/lib/fmt";
import { deleteExpense } from "@/app/actions";
import { PageHead, QuarterTabs } from "@/components/QuarterTabs";
import { ExpenseForm } from "@/components/ExpenseForm";
import { AttachReceipt } from "@/components/AttachReceipt";
import { Icon } from "@/components/Icon";

export default async function Expenses({ searchParams }: PageProps<"/expenses">) {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const q = pickQuarter((await searchParams).q, fy);
  const months = monthsOf(fy, q);
  const start = months[0];
  const end = new Date(Date.UTC(Number(months[2].slice(0, 4)), Number(months[2].slice(5, 7)), 0)).toISOString().slice(0, 10);
  const [year, { data, error }] = await Promise.all([
    loadYear(supabase, fy),
    supabase.from("expenses").select("*").gte("date", start).lte("date", end).order("date", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((e) => ({ ...e, ...expenseCalc(Number(e.amount), e.category, year.pct, q, year.gst_registered) }));
  const tot = rows.reduce((t, r) => ({ amount: t.amount + Number(r.amount), gst: t.gst + r.gst, ded: t.ded + r.deductible }),
    { amount: 0, gst: 0, ded: 0 });
  const withReceipt = rows.filter((r) => r.receipt_path).length;
  const today = new Date().toISOString().slice(0, 10);

  const stats = [
    ["Spent incl GST", aud(tot.amount)],
    ["GST credits", aud(tot.gst)],
    ["Deductible", aud(tot.ded)],
    ["Receipts", rows.length ? `${withReceipt}/${rows.length}` : "–"],
  ];

  return (
    <main>
      <PageHead eyebrow={`FY ${fy}`} title="Expenses">
        <QuarterTabs path="/expenses" q={q} />
      </PageHead>

      <div className="rise rise-1 mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="card-wash py-4"><p className="text-xs text-mute">{k}</p><p className="mt-1 text-xl font-bold tabular-nums">{v}</p></div>
        ))}
      </div>

      <section className="card rise rise-2 mb-8">
        <h2 className="h2 mb-4">Add an expense</h2>
        <ExpenseForm min={start} max={end} defaultDate={today >= start && today <= end ? today : start} />
      </section>

      <section className="rise rise-3">
        <h2 className="mb-2 text-xl font-bold tracking-[-0.01em]">Activity</h2>
        {rows.length === 0 ? (
          <div className="card-wash py-10 text-center">
            <Icon name="receipt" size={28} className="mx-auto text-mute" />
            <p className="mt-2 font-medium">No expenses this quarter</p>
            <p className="muted">Add fuel, rego, phone and other costs above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-wash-2">
            {rows.map((r) => (
              <li key={r.id} className="group flex flex-wrap items-center gap-x-4 gap-y-2 py-4 sm:flex-nowrap">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-wash-2">
                  <Icon name={r.category.startsWith("Car") ? "car" : "receipt"} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.description || r.category}</span>
                  <span className="block truncate text-[13px] text-mute">{auDate(r.date)} · {r.category}</span>
                </span>
                <span className="order-last flex w-full items-center gap-2 pl-15 sm:order-none sm:w-auto sm:pl-0">
                  {r.receipt_path ? (
                    <>
                      <a href={`/receipt/${r.id}`} target="_blank" rel="noopener" title={r.receipt_name ?? ""}
                        className="pill bg-black py-1 text-white hover:bg-ink-2"><Icon name="check" size={12} />Receipt</a>
                      <AttachReceipt expenseId={r.id} replace />
                    </>
                  ) : <AttachReceipt expenseId={r.id} />}
                  <form action={deleteExpense} className="ml-auto sm:ml-0"><input type="hidden" name="id" value={r.id} /><button className="btn-danger">Delete</button></form>
                </span>
                <span className="w-28 shrink-0 text-right">
                  <span className="block font-bold tabular-nums">{aud(Number(r.amount))}</span>
                  <span className="block text-[11px] text-mute">{pct(r.share)} · claim {aud(r.deductible)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
