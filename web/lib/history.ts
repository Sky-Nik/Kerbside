import type { SupabaseClient } from "@supabase/supabase-js";

export type YearIncome = {
  fy: string; business: number; wages: number; other: number; taxable: number | null;
  expenses: number; // business expenses (from a lodged return)
  net: number; // what you earned after business expenses: net business income + wages
  source: "Lodged tax return" | "Uber annual summary" | "Kerbside (this year)";
};

/**
 * Income by financial year. Past years come from imported documents (a lodged return wins over a platform
 * summary); the current year comes from what's recorded in Kerbside.
 * ponytail: past years entered week-by-week in Kerbside (with no document) aren't summarised here yet.
 */
export async function loadHistory(sb: SupabaseClient, currentFy: string, current: { business: number; wages: number; other: number }) {
  const { data } = await sb.from("documents").select("kind,fy,parsed,created_at").in("kind", ["tax_return", "platform_summary"])
    .not("fy", "is", null).order("created_at");
  const byFy = new Map<string, YearIncome>();
  for (const d of data ?? []) {
    const p = d.parsed as Record<string, unknown>;
    if (d.kind === "tax_return") {
      const wages = Number(p.wages) || 0;
      byFy.set(d.fy, { fy: d.fy, business: Number(p.businessIncome) || 0, wages, other: Number(p.interest) || 0,
        taxable: Number(p.taxable) || 0, expenses: Number(p.businessExpenses) || 0, net: (Number(p.netBusiness) || 0) + wages,
        source: "Lodged tax return" });
    } else if ((p.period as { annual?: boolean })?.annual && byFy.get(d.fy)?.source !== "Lodged tax return") {
      const prev = byFy.get(d.fy);
      const business = (prev?.business ?? 0) + (Number(p.totalPayments) || 0);
      byFy.set(d.fy, { fy: d.fy, business, wages: 0, other: 0, taxable: null, expenses: 0, net: business, source: "Uber annual summary" });
    }
  }
  if (!byFy.has(currentFy) || current.business + current.wages + current.other > 0) {
    byFy.set(currentFy, { fy: currentFy, ...current, taxable: null, expenses: 0, net: current.business + current.wages, source: "Kerbside (this year)" });
  }
  return [...byFy.values()].sort((a, b) => a.fy.localeCompare(b.fy));
}
