import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ATO_RATES, currentFy, fyRange, quarterOf, type YearData, type YearSettings, todayAu } from "./tax";

export async function getFy() {
  const v = (await cookies()).get("fy")?.value;
  return v && /^\d{4}-\d{2}$/.test(v) ? v : currentFy();
}

/** Quarter from ?q=, else the current quarter when viewing the current FY, else Q1. */
export function pickQuarter(q: string | string[] | undefined, fy: string) {
  const n = Number(q);
  if (n >= 0 && n <= 3) return n;
  const today = todayAu();
  return fy === currentFy() ? quarterOf(today) : 0;
}

export function defaultYear(fy: string): YearSettings {
  const r = ATO_RATES[fy] ?? ATO_RATES["2026-27"];
  return {
    fy, gst_registered: true, car_method: "logbook",
    pct: { car: [0, 0, 0, 0], phone: [0, 0, 0, 0], internet: [0, 0, 0, 0], music: [0, 0, 0, 0], computer: [0, 0, 0, 0] },
    car_limit: r.carLimit, cpk_rate: r.cpk, gov_payments: 0, other_business_income: 0, car_cost: 0,
    opening_value: 0, days_owned: 365, effective_life: 8, loan_interest: 0, odo_year_start: null, odo_year_end: null,
    wages: 0, tax_withheld: 0, payg_instalments: 0, other_income: 0, other_deductions: 0,
    car_start_date: null, car_end_date: null,
  };
}

export async function loadYear(sb: SupabaseClient, fy: string): Promise<YearSettings & { vehicle?: string | null }> {
  const { data } = await sb.from("years").select("*").eq("fy", fy).maybeSingle();
  return data ? { ...defaultYear(fy), ...data } : defaultYear(fy);
}

export async function loadYearData(sb: SupabaseClient, fy: string): Promise<YearData> {
  const { start, end } = fyRange(fy);
  const [pm, oi, ex, tr, ct, vh] = await Promise.all([
    sb.from("income_entries").select("start_date,platform,lines,fees").gte("start_date", start).lte("start_date", end),
    sb.from("other_income").select("date,amount,gst_free").gte("date", start).lte("date", end),
    sb.from("expenses").select("date,amount,category,vehicle_id").gte("date", start).lte("date", end),
    sb.from("trips").select("odo_start,odo_end,purpose,vehicle_id").gte("date", start).lte("date", end),
    sb.from("car_transactions").select("date,kind,seller,amount,gst,business_pct").gte("date", start).lte("date", end),
    // cars owned at some point in this FY
    sb.from("vehicles").select("id,name,cost,start_date,end_date,effective_life").lte("start_date", end).or(`end_date.is.null,end_date.gte.${start}`),
  ]);
  const err = [pm, oi, ex, tr, ct, vh].find((r) => r.error)?.error;
  if (err) throw new Error(err.message);
  return {
    incomeEntries: pm.data ?? [], otherIncome: oi.data ?? [], expenses: ex.data ?? [],
    trips: tr.data ?? [], carTx: (ct.data ?? []) as YearData["carTx"],
    vehicles: (vh.data ?? []).map((v) => ({ ...v, cost: Number(v.cost), effective_life: Number(v.effective_life) })),
  };
}

/** The user's chosen platforms; sends them to onboarding if they haven't picked any yet. */
export async function requirePlatforms(sb: SupabaseClient): Promise<string[]> {
  const { data } = await sb.from("profiles").select("platforms").maybeSingle();
  if (!data?.platforms?.length) redirect("/welcome");
  return data.platforms as string[];
}
