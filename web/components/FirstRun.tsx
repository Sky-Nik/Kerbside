import Link from "next/link";
import { Icon } from "./Icon";

export type FirstRunState = { car: boolean; earnings: boolean; receipt: boolean; trip: boolean };

/** Getting-started checklist on the dashboard; disappears once every step is done. */
export function FirstRun({ s }: { s: FirstRunState }) {
  const steps: [boolean, string, string, string][] = [
    [true, "Choose your platforms", "Done when you signed up.", "/settings"],
    [s.car, "Add your car", "Make, model and the odometer reading when you started using it.", "/logbook"],
    [s.earnings, "Add your first week of earnings", "Copy the totals from your Uber or DiDi app, or import a tax summary.", "/income"],
    [s.receipt, "Snap your first receipt", "Fuel, phone, car wash… Kerbside reads the photo for you.", "/expenses"],
    [s.trip, "Log a shift", "Tap Start shift when you log on, End shift when you finish.", "/logbook"],
  ];
  const done = steps.filter(([d]) => d).length;
  if (done === steps.length) return null;
  return (
    <section className="card rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="h2">Get set up</h2><p className="muted">A few minutes now and tax time takes care of itself.</p></div>
        <p className="text-sm font-bold">{done} of {steps.length} done</p>
      </div>
      <div className="mt-3 flex h-2 gap-1">{steps.map(([d], i) => <span key={i} className={`flex-1 rounded-full ${d ? "bg-pos" : "bg-wash-2"}`} />)}</div>
      <ol className="mt-4 divide-y divide-line">
        {steps.map(([d, title, body, href]) => (
          <li key={title}>
            <Link href={href} className={`flex items-center gap-4 py-3 ${d ? "opacity-60" : "group"}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${d ? "bg-pos text-white" : "ring-2 ring-line"}`}>{d && <Icon name="check" size={16} />}</span>
              <span className="min-w-0 flex-1"><b className={`block ${d ? "line-through" : ""}`}>{title}</b><span className="block text-[13px] text-mute">{body}</span></span>
              {!d && <Icon name="chevron" size={18} className="text-mute group-hover:text-ink" />}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
