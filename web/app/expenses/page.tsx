import { requireUser } from "@/lib/supabase/server";
import { getFy, loadYear, pickQuarter } from "@/lib/data";
import { expenseCalc, monthsOf } from "@/lib/tax";
import { aud, auDate, pct } from "@/lib/fmt";
import { deleteExpense } from "@/app/actions";
import { QuarterTabs } from "@/components/QuarterTabs";
import { ExpenseForm } from "@/components/ExpenseForm";
import { AttachReceipt } from "@/components/AttachReceipt";

export default async function Expenses({ searchParams }: PageProps<"/expenses">) {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const q = pickQuarter((await searchParams).q, fy);
  const months = monthsOf(fy, q);
  const start = months[0];
  const end = new Date(Date.UTC(Number(months[2].slice(0, 4)), Number(months[2].slice(5, 7)), 0)).toISOString().slice(0, 10);
  const [year, { data, error }] = await Promise.all([
    loadYear(supabase, fy),
    supabase.from("expenses").select("*").gte("date", start).lte("date", end).order("date", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((e) => ({ ...e, ...expenseCalc(Number(e.amount), e.category, year.pct, q, year.gst_registered) }));
  const tot = rows.reduce((t, r) => ({ amount: t.amount + Number(r.amount), gst: t.gst + r.gst, ded: t.ded + r.deductible }),
    { amount: 0, gst: 0, ded: 0 });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">Expenses · FY {fy}</h1>
        <QuarterTabs path="/expenses" q={q} />
      </div>
      <section className="card">
        <h2 className="h2 mb-3">Add an expense</h2>
        <ExpenseForm min={start} max={end} defaultDate={today >= start && today <= end ? today : start} />
      </section>
      <section className="card overflow-x-auto">
        <table className="tbl min-w-[760px]">
          <thead>
            <tr><th>Date</th><th>Description</th><th>Category</th><th className="num">Receipt total</th><th className="num">Business %</th>
              <th className="num">GST credit</th><th className="num">Deductible</th><th>Receipt</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{auDate(r.date)}</td>
                <td>{r.description}</td>
                <td className="text-xs">{r.category}</td>
                <td className="num">{aud(Number(r.amount))}</td>
                <td className="num">{pct(r.share)}</td>
                <td className="num">{aud(r.gst)}</td>
                <td className="num">{aud(r.deductible)}</td>
                <td className="whitespace-nowrap">
                  {r.receipt_path ? (
                    <span className="flex gap-2">
                      <a href={`/receipt/${r.id}`} target="_blank" rel="noopener" className="text-xs text-blue-700 underline" title={r.receipt_name ?? ""}>View</a>
                      <AttachReceipt expenseId={r.id} replace />
                    </span>
                  ) : <AttachReceipt expenseId={r.id} />}
                </td>
                <td className="text-right">
                  <form action={deleteExpense}><input type="hidden" name="id" value={r.id} /><button className="btn-danger">Delete</button></form>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={9} className="muted">No expenses this quarter yet.</td></tr>}
          </tbody>
          {!!rows.length && (
            <tfoot>
              <tr className="font-medium"><td colSpan={3}>Quarter total</td><td className="num">{aud(tot.amount)}</td><td />
                <td className="num">{aud(tot.gst)}</td><td className="num">{aud(tot.ded)}</td><td colSpan={2} /></tr>
            </tfoot>
          )}
        </table>
      </section>
    </main>
  );
}
