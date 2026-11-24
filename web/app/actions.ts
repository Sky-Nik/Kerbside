"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, supabaseServer } from "@/lib/supabase/server";
import { getFy, loadYear } from "@/lib/data";
import { INCOME_LINES, PLATFORMS, PCT_LABELS, daysOwned, todayAu, type PctKey } from "@/lib/tax";
import { generateRecurring } from "@/lib/recurring";
import { VAPID_PUBLIC_KEY } from "@/lib/vapid";

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

/** Adds earnings for a platform over a date range (e.g. one week). Each save is a new entry. */
export async function saveIncome(f: FormData) {
  const { supabase, user } = await requireUser();
  const platform = str(f, "platform");
  if (!PLATFORMS[platform]) throw new Error("Unknown platform");
  const start_date = str(f, "from");
  const end_date = str(f, "to") || start_date;
  if (!start_date) throw new Error("Pick a 'from' date");
  if (end_date < start_date) throw new Error("'To' must be on or after 'from'");
  const lines: Record<string, number> = {};
  for (const l of INCOME_LINES) if (str(f, `line:${l}`) !== "") lines[l] = money(f, `line:${l}`);
  if (!Object.keys(lines).length) throw new Error("Enter at least one amount");
  // Optional platform service fee: needed so BAS G1/1A use the full fare (ATO), and claimed back at 1B.
  const fees: Record<string, number> = {};
  if (str(f, "fee:Service fees") !== "") fees["Service fees"] = money(f, "fee:Service fees");
  const hours = str(f, "hours") === "" ? null : Math.max(0, Number(str(f, "hours")) || 0);
  check((await supabase.from("income_entries").insert({ user_id: user.id, start_date, end_date, platform, lines, fees, hours })).error);
  done();
}

const DELETABLE = ["income_entries", "other_income", "trips", "car_transactions", "fuel_fills"] as const;
export async function deleteRow(f: FormData) {
  const table = str(f, "table") as (typeof DELETABLE)[number];
  if (!DELETABLE.includes(table)) throw new Error("Not allowed");
  const { supabase } = await requireUser();
  if (table === "trips") { // remove odometer photos with the trip
    const { data } = await supabase.from("trips").select("photos").eq("id", str(f, "id")).maybeSingle();
    if (data?.photos?.length) await supabase.storage.from("receipts").remove(data.photos);
  }
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
    date, end_date: endDate && endDate !== date ? endDate : null, vehicle_id: str(f, "vehicle_id") || null,
    odo_start: Number(str(f, "odo_start")), odo_end: Number(str(f, "odo_end")),
    purpose: str(f, "purpose"), description: str(f, "description") || null,
  })).error);
  done();
}

/** Logbook: mark driving found between fuel fill-up readings as business or personal (main car). */
export async function fillGap(f: FormData) {
  const { supabase } = await requireUser();
  const purpose = str(f, "purpose") === "rideshare" ? "rideshare" : "private";
  const from = Number(str(f, "from")), to = Number(str(f, "to")), date = str(f, "date"), endDate = str(f, "end_date");
  if (!(to > from)) throw new Error("The end reading must be higher than the start.");
  check((await supabase.from("trips").insert({
    date, end_date: endDate > date ? endDate : null, odo_start: from, odo_end: to, purpose,
    description: "From fuel fill-up odometer readings",
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
    wages: money(f, "wages"), tax_withheld: money(f, "tax_withheld"), payg_instalments: money(f, "payg_instalments"),
    other_income: money(f, "other_income"), other_deductions: money(f, "other_deductions"),
  });
}

export async function saveVehicle(f: FormData) {
  const fy = str(f, "fy");
  const from = str(f, "car_start_date") || null;
  const to = str(f, "car_end_date") || null;
  if (from && to && to < from) throw new Error("End date must be after the start date.");
  // Days owned this FY drives depreciation (still editable on the Tax page).
  const days_owned = daysOwned(fy, from, to);
  await saveYear(fy, {
    vehicle: str(f, "vehicle") || null, odo_year_start: optNum(f, "odo_year_start"), odo_year_end: optNum(f, "odo_year_end"),
    car_start_date: from, car_end_date: to, days_owned,
  });
}

/** Onboarding / Settings: work types, platforms and GST registration for the current year. */
export async function savePlatforms(f: FormData) {
  const { supabase, user } = await requireUser();
  const types = f.getAll("work_types").map(String).filter((t) => t === "rideshare" || t === "delivery");
  const platforms = f.getAll("platforms").map(String).filter((p) => p in PLATFORMS);
  if (!types.length || !platforms.length) throw new Error("Choose your work type and at least one platform.");
  check((await supabase.from("profiles").upsert({ user_id: user.id, work_types: types, platforms,
    updated_at: new Date().toISOString() })).error);
  // ATO: rideshare drivers must be registered for GST from the first trip.
  await saveYear(await getFy(), { gst_registered: types.includes("rideshare") || f.get("gst_registered") === "on" });
  if (f.get("next") === "/") {
    // Onboarding: credit whoever referred this driver (cookie set by the proxy from ?ref=).
    const jar = await cookies(), ref = jar.get("ref")?.value;
    if (ref && /^[a-f0-9]{8}$/.test(ref)) { await supabase.rpc("claim_referral", { code: ref }); jar.delete("ref"); }
    redirect("/");
  }
}

// ---------- Document imports ----------
type ImportPayload = {
  path: string; fileName: string; kind: "tax_return" | "platform_summary" | "other"; fy: string | null; title: string;
  parsed: Record<string, unknown>;
  // platform summary only: entries to add to income (already reviewed by the user)
  entries?: { platform: string; start_date: string; end_date: string; lines: Record<string, number>; fees: Record<string, number>; km?: number | null }[];
};

/** Step 2 of an import: save the document and (optionally) the income it contains. */
export async function confirmImport(p: ImportPayload) {
  const { supabase, user } = await requireUser();
  if (!p.path.startsWith(`${user.id}/`)) throw new Error("Not allowed");
  if (p.fy && !/^\d{4}-\d{2}$/.test(p.fy)) throw new Error("Bad financial year");
  const { data: doc, error } = await supabase.from("documents").insert({
    kind: p.kind, fy: p.fy, title: p.title.slice(0, 120) || "Document", storage_path: p.path,
    file_name: p.fileName.slice(0, 200), parsed: p.parsed ?? {},
  }).select("id").single();
  check(error);
  if (!doc) throw new Error("Couldn't save the document.");
  const rows = (p.entries ?? []).filter((e) => e.platform in PLATFORMS && Object.values(e.lines).some((v) => Number(v)));
  if (rows.length) {
    check((await supabase.from("income_entries").insert(rows.map((e) => ({
      user_id: user.id, platform: e.platform, start_date: e.start_date, end_date: e.end_date,
      lines: e.lines, fees: e.fees, km: e.km != null && e.km >= 0 ? e.km : null, source_document_id: doc.id,
    })))).error);
  }
  done();
  return { id: doc.id, added: rows.length };
}

/** Cancel an import: remove the uploaded file. */
export async function cancelImport(path: string) {
  const { supabase, user } = await requireUser();
  if (!path.startsWith(`${user.id}/`)) throw new Error("Not allowed");
  await supabase.storage.from("documents").remove([path]);
}

export async function deleteDocument(f: FormData) {
  const { supabase } = await requireUser();
  const id = str(f, "id");
  const { data } = await supabase.from("documents").select("storage_path").eq("id", id).maybeSingle();
  if (data?.storage_path) await supabase.storage.from("documents").remove([data.storage_path]);
  check((await supabase.from("documents").delete().eq("id", id)).error);
  done();
}

export async function saveGoals(f: FormData) {
  const { supabase, user } = await requireUser();
  const val = (k: string) => (str(f, k) === "" ? null : Math.max(0, Number(str(f, k)) || 0));
  check((await supabase.from("profiles").upsert({ user_id: user.id, weekly_goal: val("weekly_goal"), monthly_goal: val("monthly_goal"),
    updated_at: new Date().toISOString() })).error);
  done();
}

// ---------- Recurring expenses ----------
export async function addRecurring(f: FormData) {
  const { supabase } = await requireUser();
  const frequency = str(f, "frequency");
  if (!["weekly", "fortnightly", "monthly", "quarterly", "yearly"].includes(frequency)) throw new Error("Pick how often");
  check((await supabase.from("recurring_expenses").insert({
    description: str(f, "description"), amount: money(f, "amount"), category: str(f, "category"), frequency,
    start_date: str(f, "start_date"), end_date: str(f, "end_date") || null,
  })).error);
  await generateRecurring(supabase, todayAu());
  done();
}

/** Stop a recurring expense from today (past expenses it created are kept). */
export async function stopRecurring(f: FormData) {
  const { supabase } = await requireUser();
  const id = str(f, "id");
  const { data } = await supabase.from("recurring_expenses").select("start_date").eq("id", id).maybeSingle();
  const today = todayAu();
  check((await supabase.from("recurring_expenses").update({ end_date: data && data.start_date > today ? data.start_date : today }).eq("id", id)).error);
  done();
}

// ---------- Fuel tracker ----------
export async function addFuel(f: FormData) {
  const { supabase } = await requireUser();
  const date = str(f, "date"), cost = money(f, "cost");
  let expense_id: string | null = null;
  if (f.get("as_expense")) {
    const { data, error } = await supabase.from("expenses").insert({ date, amount: cost, category: "Car - Fuel", description: `Fuel ${str(f, "litres")} L` }).select("id").single();
    check(error);
    expense_id = data!.id;
  }
  check((await supabase.from("fuel_fills").insert({ date, odometer: Math.round(Number(str(f, "odometer"))), litres: Number(str(f, "litres")), cost, expense_id })).error);
  done();
}

export async function setCarMethod(f: FormData) {
  const { supabase } = await requireUser();
  const m = str(f, "car_method");
  if (m !== "logbook" && m !== "cpk") throw new Error("Unknown method");
  check((await supabase.from("years").update({ car_method: m }).eq("fy", str(f, "fy"))).error);
  done();
}

// ---------- Other cars ----------
export async function addVehicle(f: FormData) {
  const { supabase } = await requireUser();
  const start_date = str(f, "start_date"), end_date = str(f, "end_date") || null;
  if (end_date && end_date < start_date) throw new Error("End date must be after the start date.");
  check((await supabase.from("vehicles").insert({
    name: str(f, "name"), rego: str(f, "rego") || null, cost: money(f, "cost"), start_date, end_date,
    effective_life: Number(str(f, "effective_life")) || 8,
  })).error);
  done();
}

export async function endVehicle(f: FormData) {
  const { supabase } = await requireUser();
  check((await supabase.from("vehicles").update({ end_date: str(f, "end_date") || null }).eq("id", str(f, "id"))).error);
  done();
}

// ---------- Accountant links ----------
export async function createShare(f: FormData) {
  const { supabase } = await requireUser();
  check((await supabase.from("shares").insert({ label: str(f, "label") || null })).error);
  revalidatePath("/settings");
}
export async function deleteShare(f: FormData) {
  const { supabase } = await requireUser();
  check((await supabase.from("shares").delete().eq("token", str(f, "token"))).error);
  revalidatePath("/settings");
}

// ---------- Push reminders ----------
export async function savePush(sub: { endpoint: string; keys: { p256dh: string; auth: string } } | null, endpoint?: string) {
  const { supabase } = await requireUser();
  if (sub) {
    check((await supabase.from("push_subscriptions").upsert({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })).error);
    // Confirmation, so the driver sees reminders work on this device straight away.
    if (process.env.VAPID_PRIVATE_KEY) {
      const webpush = (await import("web-push")).default;
      webpush.setVapidDetails("https://kerbside-au.vercel.app", VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
      await webpush.sendNotification(sub, JSON.stringify({ title: "Reminders are on", body: "We’ll nudge you on Mondays and before each BAS is due.", url: "/", tag: "welcome" })).catch(() => {});
    }
  } else if (endpoint) check((await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)).error);
}
