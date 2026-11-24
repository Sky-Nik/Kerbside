import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { addDays, todayAu } from "@/lib/tax";
import { buildReminders } from "@/lib/reminders";
import { pushMessages } from "@/lib/push";
import { VAPID_PUBLIC_KEY } from "@/lib/vapid";

// Daily (vercel.json cron): sends BAS, Monday, open-shift, logbook and fuel-receipt reminders to every browser that turned them on.
// Needs env: CRON_SECRET (Vercel sends it as a bearer token), VAPID_PRIVATE_KEY, SUPABASE_SECRET_KEY.
export async function GET(req: NextRequest) {
  const { CRON_SECRET, VAPID_PRIVATE_KEY, SUPABASE_SECRET_KEY } = process.env;
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) return new NextResponse("Unauthorized", { status: 401 });
  if (!VAPID_PRIVATE_KEY || !SUPABASE_SECRET_KEY) return new NextResponse("Push not configured", { status: 503 });
  webpush.setVapidDetails("https://kerbside-au.vercel.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

  const today = todayAu();
  const { data: subs, error } = await sb.from("push_subscriptions").select("endpoint,user_id,p256dh,auth");
  if (error) return new NextResponse(error.message, { status: 500 });
  const users = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  let sent = 0;
  // ponytail: one user at a time; batch the queries if this ever takes minutes.
  for (const uid of users) {
    const [{ data: profile }, { data: entries }, { count }, { data: shift }, { data: firstTrip }, { data: lastTrip }, { data: fuel }] = await Promise.all([
      sb.from("profiles").select("platforms").eq("user_id", uid).maybeSingle(),
      sb.from("income_entries").select("platform,start_date,end_date").eq("user_id", uid).gte("end_date", addDays(today, -21)),
      sb.from("expenses").select("id", { count: "exact", head: true }).eq("user_id", uid).is("receipt_path", null)
        .gte("amount", 82.5).gte("date", addDays(today, -30)),
      sb.from("open_shifts").select("started_at").eq("user_id", uid).maybeSingle(),
      sb.from("trips").select("date").eq("user_id", uid).is("vehicle_id", null).order("date").limit(1).maybeSingle(),
      sb.from("trips").select("date,end_date").eq("user_id", uid).is("vehicle_id", null).order("date", { ascending: false }).limit(1).maybeSingle(),
      sb.from("expenses").select("date").eq("user_id", uid).eq("category", "Car - Fuel").lte("date", today).order("date", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const daysTo = (iso?: string | null) => (iso ? Math.round((Date.parse(today) - Date.parse(iso)) / 86400000) : null);
    const lastEnd = lastTrip ? lastTrip.end_date ?? lastTrip.date : null;
    const signals = {
      openShiftHours: shift ? (Date.now() - Date.parse(shift.started_at)) / 3600000 : null,
      daysSinceTrip: daysTo(lastEnd),
      logbookWeeks: firstTrip && lastEnd ? Math.floor((daysTo(firstTrip.date)! - daysTo(lastEnd)!) / 7) : null,
      daysSinceFuel: daysTo(fuel?.date),
    };
    const reminders = buildReminders({ today, platforms: profile?.platforms ?? [], entries: entries ?? [], trips: [], recurring: [] }); // only BAS + earnings are pushed
    const msgs = pushMessages(today, reminders, count ?? 0, signals);
    for (const s of (subs ?? []).filter((x) => x.user_id === uid)) {
      for (const m of msgs) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(m));
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint); // browser unsubscribed
        }
      }
    }
  }
  return NextResponse.json({ users: users.length, sent });
}
