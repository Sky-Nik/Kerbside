import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getFy } from "@/lib/data";
import { fyRange } from "@/lib/tax";
import { aud, auDate } from "@/lib/fmt";
import { deleteDocument } from "@/app/actions";
import { PageHead } from "@/components/QuarterTabs";
import { ImportDocument } from "@/components/ImportDocument";
import { Icon } from "@/components/Icon";

type Doc = { id: string; kind: string; fy: string | null; title: string; file_name: string | null; parsed: Record<string, unknown>; created_at: string };

function DocRow({ d }: { d: Doc }) {
  const p = d.parsed;
  const detail = d.kind === "tax_return"
    ? `Taxable income ${aud(Number(p.taxable) || 0)} · business income ${aud(Number(p.businessIncome) || 0)}${p.receipt ? ` · ATO receipt ${p.receipt}` : ""}`
    : d.kind === "platform_summary" ? `Total payments ${aud(Number(p.totalPayments) || 0)}` : d.file_name ?? "";
  return (
    <li className="flex items-center gap-4 py-3.5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-wash-2"><Icon name={d.kind === "tax_return" ? "tax" : "bas"} size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{d.title}</span>
        <span className="block truncate text-[13px] text-mute">{detail} · added {auDate(d.created_at.slice(0, 10))}</span>
      </span>
      <a href={`/documents/${d.id}/file`} target="_blank" rel="noopener" className="btn-secondary btn-sm">View</a>
      <form action={deleteDocument}><input type="hidden" name="id" value={d.id} /><button className="btn-danger">Delete</button></form>
    </li>
  );
}

function Section({ title, sub, items, empty }: { title: string; sub: string; items: Doc[]; empty: string }) {
  return (
    <section className="card">
      <h2 className="h2">{title}</h2>
      <p className="muted">{sub}</p>
      {items.length ? <ul className="mt-2 divide-y divide-wash-2">{items.map((d) => <DocRow key={d.id} d={d} />)}</ul>
        : <p className="muted mt-3">{empty}</p>}
    </section>
  );
}
export default async function Documents() {
  const { supabase } = await requireUser();
  const fy = await getFy();
  const { start, end } = fyRange(fy);
  const [{ data: docs }, { data: expenses }] = await Promise.all([
    supabase.from("documents").select("id,kind,fy,title,file_name,parsed,created_at").order("fy", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("expenses").select("id,date,description,amount,category,receipt_path,receipt_name").gte("date", start).lte("date", end).order("date", { ascending: false }),
  ]);
  const all = (docs ?? []) as Doc[];
  const returns = all.filter((d) => d.kind === "tax_return");
  const summaries = all.filter((d) => d.kind === "platform_summary");
  const others = all.filter((d) => d.kind === "other");
  const exp = expenses ?? [];
  const withReceipt = exp.filter((e) => e.receipt_path);
  const total = exp.reduce((t, e) => t + Number(e.amount), 0);
  const covered = withReceipt.reduce((t, e) => t + Number(e.amount), 0);
  const years = [...new Set([fy, ...all.map((d) => d.fy).filter(Boolean) as string[]])].sort().reverse();


  return (
    <main className="space-y-6">
      <PageHead eyebrow="All years" title="Documents" />

      <section className="card rise rise-1">
        <h2 className="h2 mb-3">Add a document</h2>
        <ImportDocument />
        <p className="muted mt-3">
          Lodged returns: in myGov open ATO → Tax → Lodgments → Income tax, choose the year, then <b>Print</b> and save as PDF.
          Your TFN, date of birth and address stay inside the stored file; Kerbside only reads the tax figures.
        </p>
      </section>

      <div className="rise rise-2 space-y-6">
        <Section title="Lodged tax returns" sub="Customer copies of returns you’ve lodged. Their figures feed your income history."
          items={returns} empty="None yet. Upload a myGov print of a lodged return above." />
        <Section title="Platform tax summaries" sub="Monthly or annual tax summaries from Uber." items={summaries} empty="None yet." />
        {others.length > 0 && <Section title="Other documents" sub="Anything else you’ve kept here." items={others} empty="" />}
      </div>

      <section className="card rise rise-3">
        <h2 className="h2">Kerbside reports</h2>
        <p className="muted mb-3">Generated from your records. Open one to preview, then download.</p>
        <ul className="divide-y divide-wash-2">
          {years.map((y) => (
            <li key={y} className="flex flex-wrap items-center gap-2 py-3">
              <span className="w-24 font-bold">FY {y}</span>
              <Link href={`/reports/view?kind=tax&fy=${y}`} className="btn-secondary btn-sm"><Icon name="tax" size={14} />Tax summary</Link>
              {[0, 1, 2, 3].map((q) => (
                <Link key={q} href={`/reports/view?kind=bas&q=${q}&fy=${y}`} className="btn-ghost">BAS Q{q + 1}</Link>
              ))}
              <Link href={`/reports/view?kind=receipts&fy=${y}`} className="btn-ghost"><Icon name="receipt" size={14} />Receipts</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="card rise rise-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="h2">Receipts · FY {fy}</h2>
            <p className="muted">Proof for your expenses. Change the year in the header to see other years.</p>
          </div>
          <Link href={`/reports/view?kind=receipts&fy=${fy}`} className="btn btn-sm"><Icon name="receipt" size={14} />Receipts proof pack (PDF)</Link>
        </div>
        <div className="my-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[["Expenses", String(exp.length)], ["With receipt", `${withReceipt.length}/${exp.length}`], ["Covered", aud(covered)], ["Not covered", aud(total - covered)]]
            .map(([k, v]) => <div key={k} className="card-wash py-4"><p className="text-xs text-mute">{k}</p><p className="mt-1 text-xl font-bold tabular-nums">{v}</p></div>)}
        </div>
        {exp.length ? (
          <ul className="divide-y divide-wash-2">
            {exp.map((e) => (
              <li key={e.id} className="flex items-center gap-4 py-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${e.receipt_path ? "bg-black text-white" : "bg-[#fff8e6] ring-1 ring-warn"}`}>
                  <Icon name={e.receipt_path ? "check" : "alert"} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{e.description || e.category}</span>
                  <span className="block truncate text-[13px] text-mute">{auDate(e.date)} · {e.category}</span>
                </span>
                <span className="font-bold tabular-nums">{aud(Number(e.amount))}</span>
                {e.receipt_path
                  ? <a href={`/receipt/${e.id}`} target="_blank" rel="noopener" className="btn-ghost">View</a>
                  : <Link href="/expenses" className="btn-ghost text-neg">Add</Link>}
              </li>
            ))}
          </ul>
        ) : <p className="muted">No expenses this year.</p>}
      </section>
    </main>
  );
}
