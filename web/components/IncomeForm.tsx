"use client";
import { useRef, useState } from "react";
import { saveIncome } from "@/app/actions";
import { INCOME_LINES } from "@/lib/tax";
import { Icon } from "./Icon";

const PLATFORMS = ["Uber", "DiDi"] as const;

export function IncomeForm({ min, max, defaultWeek }: { min: string; max: string; defaultWeek: string }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("Uber");
  const [msg, setMsg] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      action={async (f) => {
        setMsg(null);
        try {
          await saveIncome(f);
          const added = INCOME_LINES.reduce((s, l) => s + (Number(f.get(`line:${l}`)) || 0), 0);
          setMsg(`Added $${added.toFixed(2)}`);
          // keep the date (handy for entering the next platform), clear the amounts
          form.current?.querySelectorAll<HTMLInputElement>("input[name^='line:']").forEach((i) => (i.value = ""));
        } catch (e) {
          setMsg((e as Error).message);
        }
      }}
      ref={form}
      className="space-y-5"
    >
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="platform" value={platform} />
      <div className="flex flex-wrap gap-3">
        <div className="seg" role="radiogroup" aria-label="Platform">
          {PLATFORMS.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={platform === p}
              onClick={() => setPlatform(p)} className={`tab ${platform === p ? "tab-on" : ""}`}>{p}</button>
          ))}
        </div>
        <div className="seg" role="radiogroup" aria-label="Period">
          {(["week", "month"] as const).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={period === p}
              onClick={() => setPeriod(p)} className={`tab ${period === p ? "tab-on" : ""}`}>{p === "week" ? "Weekly" : "Monthly"}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {period === "week" ? (
          <label className="field">Any day in the week
            <input name="week" type="date" required min={min} max={max} defaultValue={defaultWeek} />
          </label>
        ) : (
          <label className="field">Month
            <input name="month" type="month" required min={min.slice(0, 7)} max={max.slice(0, 7)} defaultValue={defaultWeek.slice(0, 7)} />
          </label>
        )}
        {INCOME_LINES.map((l) => (
          <label key={l} className="field">{l}
            <input name={`line:${l}`} type="number" step="0.01" inputMode="decimal" placeholder="0.00" />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn"><Icon name="plus" size={18} />Add {platform} earnings</button>
        {msg && <span className={`text-sm ${msg.startsWith("Added") ? "text-pos" : "text-neg"}`}>{msg}</span>}
        <span className="muted">Copy from the {platform} driver app. Each entry adds to the total, so you can log a week in one go or day by day.</span>
      </div>
    </form>
  );
}
