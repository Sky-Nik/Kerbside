import Link from "next/link";
import { aud } from "@/lib/fmt";
import { bucketOf, inBucket, series, shift, type Bucket, type View } from "@/lib/periods";
import { Icon } from "./Icon";
import { PlatformTile } from "./PlatformTile";
import { PeriodSelect } from "./PeriodSelect";
import { Tip } from "./Tip";
import { HELP } from "@/lib/help";
import { fyOf, platformMonth, setAside } from "@/lib/tax";

export type EarningEntry = { start_date: string; platform: string; lines: Record<string, number>; fees?: Record<string, number> | null; hours?: number | null; km?: number | null };
export type SpendItem = { date: string; amount: number; gst: number; deductible: number };
export type PastYear = { fy: string; net: number; gross: number; expenses: number; wages: number; source: string };

const VIEWS: [View, string][] = [["week", "Week"], ["month", "Month"], ["year", "Year"]];
const COUNT: Record<View, number> = { week: 8, month: 12, year: 0 };
const earned = (e: EarningEntry) => Object.values(e.lines ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);

/**
 * Dashboard hero: earnings for a week, month or financial year, with arrows to earlier periods and a bar chart.
 * Earnings = what the platforms paid you (net fare + promotions + tips), counted by each entry's start date.
 * Years with no entries fall back to business income from an uploaded tax return / annual summary.
 */
export function EarningsPanel({ view, at, today, entries, expenses, pastYears, fyProfit, registered, projectedTaxable, goals }: {
  view: View; at: string; today: string; entries: EarningEntry[]; expenses: SpendItem[];
  pastYears: PastYear[]; fyProfit: { fy: string; profit: number }; registered: boolean; projectedTaxable: number;
  goals: { week: number | null; month: number | null };
}) {
  const sel = bucketOf(view, at);
  const now = bucketOf(view, today);
  const href = (v: View, b: Bucket) => `/?view=${v}&at=${b.start}`;

  const total = (b: Bucket) => {
    // A past year with a lodged return (or annual summary) uses that document: it's the official record.
    const doc = view === "year" && b.key !== now.key ? pastYears.find((p) => p.fy === b.key) : undefined;
    if (doc) return { amount: doc.net, from: doc };
    const rows = entries.filter((e) => inBucket(b, e.start_date));
    return { amount: rows.reduce((s, e) => s + earned(e), 0), from: null as PastYear | null };
  };

  // Years: from the earliest year with any data up to this year
  const firstFy = [...entries.map((e) => bucketOf("year", e.start_date).key), ...pastYears.map((p) => p.fy), now.key].sort()[0];
  const yearCount = Math.max(1, Number(now.key.slice(0, 4)) - Number(firstFy.slice(0, 4)) + 1);
  const last = sel.start > now.start ? sel : now;
  const bars = series(view, view === "year" ? now : last, view === "year" ? Math.max(yearCount, 3) : COUNT[view]);
  const values = bars.map((b) => total(b).amount);
  const max = Math.max(1, ...values);

  const cur = total(sel);
  const rows = entries.filter((e) => inBucket(sel, e.start_date));
  const byPlatform = [...new Set(rows.map((e) => e.platform))]
    .map((p) => ({ p, v: rows.filter((e) => e.platform === p).reduce((s, e) => s + earned(e), 0) }))
    .sort((a, b) => b.v - a.v);
  const spent = expenses.filter((x) => inBucket(sel, x.date)).reduce((t, x) => t + Number(x.amount), 0);
  const prev = total(shift(view, sel, -1)).amount;
  const change = prev > 0 ? (cur.amount - prev) / prev : null;
  const canNext = shift(view, sel, 1).start <= now.start;

  // Set aside for tax (current financial year only; past years are already settled)
  const inThisFy = !cur.from && fyOf(sel.start) === fyOf(today) && sel.start <= today;
  const calcs = rows.map((e) => platformMonth(e.platform, e.lines, e.fees ?? {}, registered));
  const spend = expenses.filter((x) => inBucket(sel, x.date));
  const aside = setAside({
    gstOnSales: calcs.reduce((t, c) => t + c.gst, 0),
    gstCredits: calcs.reduce((t, c) => t + c.feeGst, 0) + spend.reduce((t, x) => t + x.gst, 0),
    profitExGst: calcs.reduce((t, c) => t + c.net - c.feeNet, 0) - spend.reduce((t, x) => t + x.deductible, 0),
    projectedTaxable, fy: fyProfit.fy,
  });
  // Real hourly rate and $/km, from entries that recorded hours / km
  const withHours = rows.filter((e) => Number(e.hours) > 0);
  const hours = withHours.reduce((t, e) => t + Number(e.hours), 0);
  const perHour = hours ? withHours.reduce((t, e) => t + earned(e), 0) / hours : null;
  const withKm = rows.filter((e) => Number(e.km) > 0);
  const kmTotal = withKm.reduce((t, e) => t + Number(e.km), 0);
  const perKm = kmTotal ? withKm.reduce((t, e) => t + earned(e), 0) / kmTotal : null;
  const goal = view === "week" ? goals.week : view === "month" ? goals.month : null;

  // Dropdown: newest first – a year of weeks, two years of months, or every year on record.
  const optionBuckets = (view === "year" ? bars : series(view, now, view === "week" ? 52 : 24)).slice().reverse();
  if (!optionBuckets.some((b) => b.key === sel.key)) optionBuckets.push(sel);
  const thisLabel = { week: "This week", month: "This month", year: "This year" }[view];
  const options = optionBuckets.map((b) => ({ value: b.start, label: b.key === now.key ? `${thisLabel} · ${b.label}` : b.label }));
  const todayLabel = new Date(`${today}T00:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  return (
    <section className="card-ink rise rise-1 relative overflow-hidden lg:col-span-3">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full border-[40px] border-white/[0.04]" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-white/60">Your earnings<Tip k="earnings" text={view === "year" ? `${HELP.earnings} ${HELP.earningsPast}` : undefined} align="left" /><span className="text-white/40">· Today, {todayLabel}</span></p>
        <div className="inline-flex gap-1 rounded-full bg-white/10 p-1">
          {VIEWS.map(([v, l]) => (
            <Link key={v} href={href(v, bucketOf(v, sel.start > today ? today : sel.start))} scroll={false}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${v === view ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>{l}</Link>
          ))}
        </div>
      </div>

      <div className="relative mt-4 flex items-center gap-2">
        <Link href={href(view, shift(view, sel, -1))} scroll={false} aria-label="Previous period"
          className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Icon name="chevron" size={16} className="rotate-180" /></Link>
        <PeriodSelect view={view} value={sel.start} options={options} />
        {canNext ? (
          <Link href={href(view, shift(view, sel, 1))} scroll={false} aria-label="Next period"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Icon name="chevron" size={16} /></Link>
        ) : <span className="h-8 w-8" />}
      </div>

      <p className="display relative mt-3 tabular-nums">{aud(cur.amount)}</p>
      <p className="relative mt-1 text-sm text-white/60">
        {cur.from ? (cur.from.source === "Lodged tax return"
            ? `From your lodged tax return: business income ${aud(cur.from.gross)} − expenses ${aud(cur.from.expenses)}${cur.from.wages ? ` + wages ${aud(cur.from.wages)}` : ""}`
            : `From your ${cur.from.source.toLowerCase()} (before expenses)`)
          : view === "year" && sel.key === now.key ? "So far this financial year · net fare + promotions + tips"
          : change == null ? "Net fare + promotions + tips" :
          <><span className={change >= 0 ? "text-[#7be3a8]" : "text-[#ff9c8f]"}>{change >= 0 ? "▲" : "▼"} {Math.abs(Math.round(change * 100))}%</span> vs previous {view}</>}
      </p>

      {!cur.from && byPlatform.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-2">
          {byPlatform.map(({ p, v }) => (
            <span key={p} className="flex items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 text-sm">
              <PlatformTile name={p} size={24} /><b className="tabular-nums">{aud(v)}</b>
            </span>
          ))}
        </div>
      )}

      {goal ? (
        <div className="relative mt-4">
          <div className="flex justify-between text-xs text-white/60"><span>{view === "week" ? "Weekly" : "Monthly"} goal {aud(goal)}</span>
            <span>{cur.amount >= goal ? "Goal reached 🎉" : `${aud(goal - cur.amount)} to go`}</span></div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-warn" style={{ width: `${Math.min(100, (cur.amount / goal) * 100)}%` }} /></div>
        </div>
      ) : null}

      {(perHour != null || perKm != null) && (
        <div className="relative mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {perHour != null && <span><b className="tabular-nums">{aud(perHour)}</b><span className="text-white/60"> /hour · {hours.toLocaleString("en-AU")} h online</span></span>}
          {perKm != null && <span><b className="tabular-nums">{aud(perKm)}</b><span className="text-white/60"> /km on trip</span></span>}
        </div>
      )}

      {inThisFy && aside.total > 0 && (
        <div className="relative mt-4 flex items-center gap-3 rounded-xl bg-warn px-4 py-3 text-black">
          <div className="flex-1">
            <p className="flex items-center gap-2 text-xs font-medium">Put aside for tax<Tip k="setAside" align="left" /></p>
            <p className="text-2xl font-bold tabular-nums">{aud(aside.total)}</p>
          </div>
          <p className="text-right text-xs">GST {aud(aside.gst)}<br />Income tax {aud(aside.tax)} <span className="opacity-60">({Math.round(aside.rate * 100)}%)</span></p>
        </div>
      )}

      <svg viewBox="0 0 520 120" className="relative mt-5 h-auto w-full" role="img"
        aria-label={bars.map((b, i) => `${b.label}: ${aud(values[i])}`).join("; ")}>
        {bars.map((b, i) => {
          const slot = 520 / bars.length, w = Math.min(44, slot * 0.6), x = slot * i + (slot - w) / 2;
          const h = Math.max(values[i] > 0 ? 3 : 1, (88 * values[i]) / max);
          const on = b.key === sel.key;
          return (
            <a key={b.key} href={href(view, b)}>
              <title>{`${b.label}: ${aud(values[i])}`}</title>
              <rect x={slot * i} y="0" width={slot} height="120" fill="transparent" />
              <rect x={x} y={96 - h} width={w} height={h} rx="4" fill={on ? "#ffc043" : "rgba(255,255,255,0.28)"} />
              <text x={x + w / 2} y="114" textAnchor="middle" fontSize="11" fill={on ? "#ffffff" : "rgba(255,255,255,0.55)"} fontWeight={on ? 700 : 500}>{b.short}</text>
            </a>
          );
        })}
      </svg>

      {cur.from ? (
        <div className="relative mt-4 grid grid-cols-3 gap-4 border-t border-white/15 pt-4">
          <div><p className="text-xs text-white/50">Business income</p><p className="mt-1 text-lg font-bold tabular-nums">{aud(cur.from.gross)}</p></div>
          <div><p className="text-xs text-white/50">Business expenses</p><p className="mt-1 text-lg font-bold tabular-nums">{aud(cur.from.expenses)}</p></div>
          <div><p className="text-xs text-white/50">Wages</p><p className="mt-1 text-lg font-bold tabular-nums">{aud(cur.from.wages)}</p></div>
        </div>
      ) : (
        <div className="relative mt-4 grid grid-cols-3 gap-4 border-t border-white/15 pt-4">
          <div><p className="text-xs text-white/50">Spent (receipts)</p><p className="mt-1 text-lg font-bold tabular-nums">{aud(spent)}</p></div>
          <div><p className="text-xs text-white/50">Earned − spent</p><p className="mt-1 text-lg font-bold tabular-nums">{aud(cur.amount - spent)}</p></div>
          {view === "year" && sel.key === fyProfit.fy
            ? <div><p className="text-xs text-white/50">Business profit (ex GST)</p><p className="mt-1 text-lg font-bold tabular-nums">{aud(fyProfit.profit)}</p></div>
            : <div><p className="text-xs text-white/50">Entries</p><p className="mt-1 text-lg font-bold tabular-nums">{rows.length}</p></div>}
        </div>
      )}
      {view === "year" && (
        <p className="relative mt-3 text-xs text-white/50">
          Earlier years come from tax returns you upload. <Link href="/documents" className="underline">Upload a past return</Link>
        </p>
      )}
    </section>
  );
}
