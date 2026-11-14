import type { SupabaseClient } from "@supabase/supabase-js";
import { loadYear } from "@/lib/data";
import { expenseCalc, fyRange, platformMonth, quarterOf, summarise, type YearData, todayAu } from "@/lib/tax";

export type ReportData = Awaited<ReturnType<typeof loadReport>>;

/** Everything a PDF report needs, for one financial year. Row-level security keeps it to the signed-in user. */
export async function loadReport(sb: SupabaseClient, fy: string, email: string | null) {
  const { start, end } = fyRange(fy);
  const [profile, year, inc, exp, trips, carTx] = await Promise.all([
    sb.from("profiles").select("name,abn").maybeSingle(),
    loadYear(sb, fy),
    sb.from("income_entries").select("id,start_date,end_date,platform,lines,fees").gte("start_date", start).lte("start_date", end).order("start_date"),
    sb.from("expenses").select("id,date,description,amount,category,receipt_path,receipt_name").gte("date", start).lte("date", end).order("date"),
    sb.from("trips").select("date,end_date,odo_start,odo_end,purpose,description").gte("date", start).lte("date", end).order("date").order("odo_start"),
    sb.from("car_transactions").select("date,kind,seller,amount,gst,business_pct").gte("date", start).lte("date", end).order("date"),
  ]);
  const err = [inc, exp, trips, carTx].find((r) => r.error)?.error;
  if (err) throw new Error(err.message);

  const reg = year.gst_registered;
  const income = (inc.data ?? []).map((e) => ({
    ...e, q: quarterOf(e.start_date), calc: platformMonth(e.platform, e.lines, e.fees ?? {}, reg),
  }));
  const expenses = (exp.data ?? []).map((e) => {
    const q = quarterOf(e.date);
    return { ...e, q, calc: expenseCalc(Number(e.amount), e.category, year.pct, q, reg) };
  });
  const data: YearData = {
    incomeEntries: inc.data ?? [], otherIncome: [], trips: trips.data ?? [],
    expenses: (exp.data ?? []).map((e) => ({ date: e.date, amount: Number(e.amount), category: e.category })),
    carTx: (carTx.data ?? []) as YearData["carTx"],
  };
  return {
    fy, year, email,
    name: profile.data?.name || email || "Kerbside driver",
    abn: profile.data?.abn ?? null,
    income, expenses, trips: trips.data ?? [], carTx: carTx.data ?? [],
    s: summarise(year, data),
    generated: todayAu(),
  };
}
