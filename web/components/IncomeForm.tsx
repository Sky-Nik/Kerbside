"use client";
import { useRef, useState } from "react";
import { saveIncome } from "@/app/actions";
import { INCOME_LINES, addDays } from "@/lib/tax";
import { Icon } from "./Icon";

const PLATFORMS = ["Uber", "DiDi"] as const;

/** One entry = one platform's earnings between two dates (usually a Monday–Sunday week). */
export function IncomeForm({ defaultFrom }: { defaultFrom: string }) {
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("Uber");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(addDays(defaultFrom, 6));
  const [msg, setMsg] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      className="space-y-5"
      action={async (f) => {
        setMsg(null);
        try {
          await saveIncome(f);
          const added = INCOME_LINES.reduce((s, l) => s + (Number(f.get(`line:${l}`)) || 0), 0);
          setMsg(`Added $${added.toFixed(2)}`);
          // keep the dates (handy for entering the other platform for the same week), clear the amounts
          form.current?.querySelectorAll<HTMLInputElement>("input[name^='line:']").forEach((i) => (i.value = ""));
        } catch (e) {
          setMsg((e as Error).message);
        }
      }}
    >
      <input type="hidden" name="platform" value={platform} />
      <div className="seg" role="radiogroup" aria-label="Platform">
        {PLATFORMS.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={platform === p}
            onClick={() => setPlatform(p)} className={`tab ${platform === p ? "tab-on" : ""}`}>{p}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="field">From
          <input name="from" type="date" required value={from}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setFrom(v);
              if (v) setTo(addDays(v, 6)); // a week by default; change "To" for other ranges
            }} />
        </label>
        <label className="field">To
          <input name="to" type="date" required min={from} value={to} onChange={(e) => setTo(e.currentTarget.value)} />
        </label>
        {INCOME_LINES.map((l) => (
          <label key={l} className="field">{l}
            <input name={`line:${l}`} type="number" step="0.01" inputMode="decimal" placeholder="0.00" />
          </label>
        ))}
        <label className="field"><span>Service fee <span className="text-[11px] font-normal text-mute">recommended</span></span>
          <input name="fee:Service fees" type="number" step="0.01" inputMode="decimal" placeholder="0.00" />
        </label>
      </div>
      <p className="muted -mt-2">
        The ATO charges GST on the <b className="text-ink">full fare</b> the rider pays, not your net fare. Add the {platform} service fee
        (shown in the trip or weekly breakdown) so your BAS is right; you get its GST back as a credit.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn"><Icon name="plus" size={18} />Add {platform} earnings</button>
        {msg && <span className={`text-sm ${msg.startsWith("Added") ? "text-pos" : "text-neg"}`}>{msg}</span>}
        <span className="muted">Copy the totals for these dates from the {platform} driver app. “To” is set a week after “From”; change it for any other period.</span>
      </div>
    </form>
  );
}
