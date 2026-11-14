import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { calendarIcs } from "@/lib/reminders";
import { todayAu } from "@/lib/tax";

// "Add to my calendar": BAS due dates, a weekly Monday prompt and yearly renewals as an .ics file.
export async function GET() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse("Please sign in", { status: 401 });
  const { data: recurring } = await supabase.from("recurring_expenses").select("description,frequency,start_date,end_date");
  return new NextResponse(calendarIcs({ today: todayAu(), recurring: recurring ?? [] }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kerbside-reminders.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
