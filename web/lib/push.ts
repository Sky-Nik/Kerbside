// Which push notifications a driver gets today. Runs once a day from /api/cron/reminders (about 9am in Australia).
import type { Reminder } from "./reminders.ts";

export type PushMessage = { title: string; body: string; url: string; tag: string };

export function pushMessages(today: string, reminders: Reminder[], missingReceipts: number): PushMessage[] {
  const out: PushMessage[] = [];
  const bas = reminders.find((r) => r.key === "bas");
  const daysToBas = bas?.due ? Math.round((Date.parse(bas.due) - Date.parse(today)) / 86400000) : -1;
  if (bas && (daysToBas === 7 || daysToBas === 0)) out.push({ title: bas.title, body: bas.detail, url: "/bas", tag: "bas" });

  if (new Date(`${today}T00:00:00Z`).getUTCDay() === 1) {
    const parts: string[] = [];
    const earnings = reminders.find((r) => r.key === "earnings");
    if (earnings) parts.push(earnings.detail);
    if (missingReceipts) parts.push(`${missingReceipts} expense${missingReceipts === 1 ? "" : "s"} over $82.50 still need${missingReceipts === 1 ? "s" : ""} a receipt.`);
    if (parts.length) out.push({ title: earnings ? earnings.title : "Receipts to snap", body: parts.join(" "), url: earnings ? "/income" : "/expenses", tag: "weekly" });
  }
  return out;
}
