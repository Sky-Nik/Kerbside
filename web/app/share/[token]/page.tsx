import type { Metadata } from "next";
import { shareClient } from "@/lib/supabase/share";
import { fyOf, todayAu } from "@/lib/tax";
import { PublicShell } from "@/components/landing/PublicShell";

export const metadata: Metadata = { title: "Shared records · Kerbside", robots: { index: false, follow: false } };

const QN = ["Jul – Sep", "Oct – Dec", "Jan – Mar", "Apr – Jun"];

/** Read-only page for a driver's accountant: every report for each financial year, as PDFs. */
export default async function Shared({ params, searchParams }: PageProps<"/share/[token]">) {
  const { token } = await params;
  const sb = shareClient(token);
  const [{ data: profile }, { data: years }] = await Promise.all([
    sb.from("profiles").select("name,abn").maybeSingle(),
    sb.from("years").select("fy").order("fy", { ascending: false }),
  ]);
  if (!profile) {
    return (
      <PublicShell>
        <main className="mx-auto max-w-xl pt-20 text-center">
          <h1 className="text-3xl font-bold tracking-[-0.03em]">This link has expired</h1>
          <p className="mt-3 text-mute">Ask the driver to send a new accountant link from Kerbside → Settings.</p>
        </main>
      </PublicShell>
    );
  }
  const fys = [...new Set([fyOf(todayAu()), ...(years ?? []).map((y) => y.fy as string)])].sort().reverse();
  const sp = await searchParams;
  const fy = typeof sp.fy === "string" && fys.includes(sp.fy) ? sp.fy : fys[0];
  const pdf = (kind: string, extra = "") => `/share/${token}/${kind}?fy=${fy}${extra}&view=1`;
  const row = "flex items-center justify-between gap-3 py-4";

  return (
    <PublicShell>
      <main className="mx-auto max-w-2xl pt-14">
        <p className="font-bold text-mute">Shared with you · read only</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em]">{profile.name || "Kerbside driver"}</h1>
        {profile.abn && <p className="mt-1 text-mute">ABN {profile.abn}</p>}
        <div className="mt-8 flex flex-wrap gap-2">
          {fys.map((f) => <a key={f} href={`?fy=${f}`} className={`rounded-full px-4 py-2 text-sm font-bold ${f === fy ? "bg-ink text-white" : "bg-wash"}`}>FY {f}</a>)}
        </div>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          <li className={row}><span><b>Tax summary</b><span className="block text-sm text-mute">Income, deductions, car, depreciation and estimated tax</span></span>
            <a className="btn" href={pdf("tax")} target="_blank" rel="noopener">Open PDF</a></li>
          {QN.map((q, i) => (
            <li key={q} className={row}><span><b>BAS Q{i + 1}</b><span className="block text-sm text-mute">{q} · G1, 1A, 1B</span></span>
              <a className="btn-secondary" href={pdf("bas", `&q=${i}`)} target="_blank" rel="noopener">Open PDF</a></li>
          ))}
          <li className={row}><span><b>Receipts register</b><span className="block text-sm text-mute">Every expense with copies of photo receipts</span></span>
            <a className="btn-secondary" href={pdf("receipts")} target="_blank" rel="noopener">Open PDF</a></li>
        </ul>
        <p className="mt-6 text-sm text-mute">This link is read only. The driver can turn it off at any time.</p>
      </main>
    </PublicShell>
  );
}
