import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getFy } from "@/lib/data";
import { Icon } from "@/components/Icon";

const QN = ["Jul – Sep", "Oct – Dec", "Jan – Mar", "Apr – Jun"];

/** Preview a report in the browser; downloading is only offered from here. */
export default async function ReportView({ searchParams }: PageProps<"/reports/view">) {
  await requireUser();
  const sp = await searchParams;
  const kind = sp.kind === "tax" ? "tax" : "bas";
  const fyParam = typeof sp.fy === "string" && /^\d{4}-\d{2}$/.test(sp.fy) ? sp.fy : await getFy();
  const q = Math.min(3, Math.max(0, Number(sp.q) || 0));
  const base = kind === "bas" ? `/reports/bas?q=${q}&fy=${fyParam}` : `/reports/tax?fy=${fyParam}`;
  const title = kind === "bas" ? `BAS report · Q${q + 1} ${QN[q]}` : "Tax summary";

  return (
    <main className="pt-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/" className="btn-ghost"><Icon name="chevron" size={16} className="rotate-180" />Back</Link>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">FY {fyParam}</p>
          <h1 className="truncate text-xl font-bold tracking-[-0.01em]">{title}</h1>
        </div>
        {kind === "bas" && (
          <div className="seg">
            {[0, 1, 2, 3].map((i) => (
              <Link key={i} href={`/reports/view?kind=bas&q=${i}&fy=${fyParam}`} className={`tab ${i === q ? "tab-on" : ""}`}>Q{i + 1}</Link>
            ))}
          </div>
        )}
        <a href={base} download className="btn"><Icon name="upload" size={16} className="rotate-180" />Download PDF</a>
      </div>

      <div className="overflow-hidden rounded-2xl bg-wash ring-1 ring-line">
        <iframe src={`${base}&view=1#view=FitH`} title={title} className="h-[calc(100dvh-220px)] min-h-[560px] w-full" />
      </div>
      <p className="muted mt-3">
        Preview not showing on your phone? <a href={`${base}&view=1`} target="_blank" rel="noopener" className="link">Open it full screen</a>.
      </p>
    </main>
  );
}
