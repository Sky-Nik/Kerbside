"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, supabaseServer } from "@/lib/supabase/server";
import { loadYear } from "@/lib/data";
import { FEE_TYPES, PLATFORMS, PCT_LABELS, type PctKey } from "@/lib/tax";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const money = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === "" ? 0 : Math.round(Number(v) * 100) / 100;
};
const optNum = (f: FormData, k: string) => (str(f, k) === "" ? null : Number(str(f, k)));
function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
const done = () => revalidatePath("/", "layout");

export async function setFy(f: FormData) {
  const fy = str(f, "fy");
  if (/^\d{4}-\d{2}$/.test(fy)) (await cookies()).set("fy", fy, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  done();
}

export async function signOut() {
  await (await supabaseServer()).auth.signOut();
  redirect("/login");
}

export async function savePlatformMonth(f: FormData) {
  const { supabase, user } = await requireUser();
  const platform = str(f, "platform");
  const def = PLATFORMS[platform];
  if (!def) throw new Error("Unknown platform");
  const lines: Record<string, number> = {};
  for (const l of def.lines) if (str(f, `line:${l}`) !== "") lines[l] = money(f, `line:${l}`);
  // Fees: blank = use the pass-through amount worked out from income.
  const fees: Record<string, number> = {};
  for (const t of FEE_TYPES) if (str(f, `fee:${t}`) !== "") fees[t] = money(f, `fee:${t}`);
  const month = str(f, "month");
  if (!Object.keys(lines).length && !Object.keys(fees).length) {
    check((await supabase.from("platform_months").delete().match({ month, platform })).error);
  } else {
    check((await supabase.from("platform_months").upsert(
      { user_id: user.id, month, platform, lines, fees }, { onConflict: "user_id,month,platform" })).error);
  }
  done();
}

export async function addOtherIncome(f: FormData) {
  const { supabase } = await requireUser();
  check((await supabase.from("other_income").insert({
    date: str(f, "date"), payer: str(f, "payer"), description: str(f, "description") || null,
    amount: money(f, "amount"), gst_free: f.get("gst_free") === "on",
  })).error);
  done();
}

const DELETABLE = ["other_income", "trips", "car_transactions"] as const;
export async function deleteRow(f: FormData) {
  const table = str(f, "table") as (typeof DELETABLE)[number];
  if (!DELETABLE.includes(table)) throw new Error("Not allowed");
  const { supabase } = await requireUser();
  check((await supabase.from(table).delete().eq("id", str(f, "id"))).error);
  done();
}

export async function deleteExpense(f: FormData) {
  const { supabase } = await requireUser();
  const id = str(f, "id");
  const { data } = await supabase.from("expenses").select("receipt_path").eq("id", id).maybeSingle();
  if (data?.receipt_path) check((await supabase.storage.from("receipts").remove([data.receipt_path])).error);
  check((await supabase.from("expenses").delete().eq("id", id)).error);
  done();
}

export async function addTrip(f: FormData) {
  const { supabase } = await requireUser();
  const date = str(f, "date");
  const endDate = str(f, "end_date");
  if (endDate && endDate < date) throw new Error("The 'to' date must be on or after the 'from' date.");
  check((await supabase.from("trips").insert({
    date, end_date: endDate && endDate !== date ? endDate : null,
    odo_start: Number(str(f, "odo_start")), odo_end: Number(str(f, "odo_end")),
    purpose: str(f, "purpose"), description: str(f, "description") || null,
  })).error);
  done();
}

export async function addCarTx(f: FormData) {
  const { supabase } = await requireUser();
  const kind = str(f, "kind");
  check((await supabase.from("car_transactions").insert({
    date: str(f, "date"), kind, seller: kind === "purchase" ? str(f, "seller") : null,
    amount: money(f, "amount"), gst: kind === "purchase" ? money(f, "gst") : 0,
    business_pct: Number(str(f, "business_pct")) / 100,
  })).error);
  done();
}

/** Upserts the years row for the current FY, merging only the fields present in the form. */
async function saveYear(fy: string, patch: Record<string, unknown>) {
  const { supabase, user } = await requireUser();
  const current = await loadYear(supabase, fy);
  check((await supabase.from("years").upsert({ ...current, ...patch, user_id: user.id, fy },
    { onConflict: "user_id,fy" })).error);
  done();
}

export async function saveSettings(f: FormData) {
  const { supabase, user } = await requireUser();
  check((await supabase.from("profiles").upsert({ user_id: user.id, name: str(f, "name") || null,
    abn: str(f, "abn").replace(/\s/g, "") || null, updated_at: new Date().toISOString() })).error);
  const pct = Object.fromEntries((Object.keys(PCT_LABELS) as PctKey[]).map((k) =>
    [k, [0, 1, 2, 3].map((q) => Math.min(100, Math.max(0, Number(str(f, `pct:${k}:${q}`)) || 0)) / 100)]));
  await saveYear(str(f, "fy"), {
    gst_registered: f.get("gst_registered") === "on", car_method: str(f, "car_method") === "cpk" ? "cpk" : "logbook",
    pct, car_limit: money(f, "car_limit"), cpk_rate: money(f, "cpk_rate"),
  });
}

export async function saveTaxInputs(f: FormData) {
  await saveYear(str(f, "fy"), {
    gov_payments: money(f, "gov_payments"), other_business_income: money(f, "other_business_income"),
    car_cost: money(f, "car_cost"), opening_value: money(f, "opening_value"),
    days_owned: Number(str(f, "days_owned")) || 0, effective_life: Number(str(f, "effective_life")) || 8,
    loan_interest: money(f, "loan_interest"),
  });
}

export async function saveVehicle(f: FormData) {
  await saveYear(str(f, "fy"), {
    vehicle: str(f, "vehicle") || null, odo_year_start: optNum(f, "odo_year_start"), odo_year_end: optNum(f, "odo_year_end"),
  });
}
