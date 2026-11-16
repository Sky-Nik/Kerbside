"use client";
import { useRef, useState } from "react";
import { saveIncome } from "@/app/actions";
import { INCOME_LINES, addDays, todayAu } from "@/lib/tax";
import { parseEarnings } from "@/lib/earningsOcr";
import { Icon } from "./Icon";
import { PlatformTile } from "./PlatformTile";
import { netLabel, PLATFORM_INFO, type PlatformName } from "@/lib/platforms";
import { Tip } from "./Tip";

/** One entry = one platform's earnings between two dates (usually a Monday–Sunday week). */
export function IncomeForm({ defaultFrom, platforms }: { defaultFrom: string; platforms: string[] }) {
  const [platform, setPlatform] = useState<string>(platforms[0] ?? "Uber");
  const delivery = PLATFORM_INFO[platform as PlatformName]?.type === "delivery";
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(addDays(defaultFrom, 6));
  const [msg, setMsg] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const [shot, setShot] = useState<string | null>(null);

  /** Read a weekly-earnings screenshot on this device and fill the form in. */
  async function readScreenshot(file: File) {
    setShot("Reading screenshot… (the first time downloads about 4 MB of text-recognition data)");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const g = parseEarnings(data.text, todayAu());
      if (g.platform && platforms.includes(g.platform)) setPlatform(g.platform);
      if (g.from) { setFrom(g.from); setTo(g.to ?? addDays(g.from, 6)); }
      const set = (name: string, v: number | null) => {
        const i = form.current?.querySelector<HTMLInputElement>(`input[name="${name}"]`);
        if (i && v != null) i.value = String(v);
      };
      set("line:Net fare", g.netFare); set("line:Promotions", g.promotions); set("line:Tips", g.tips);
      set("fee:Service fees", g.serviceFee); set("hours", g.hours);
      const found = [g.from && "dates", g.netFare != null && "fare", g.promotions != null && "promotions", g.tips != null && "tips",
        g.serviceFee != null && "service fee", g.hours != null && "hours"].filter(Boolean);
      setShot(found.length ? `Filled in ${found.join(", ")}${g.platform ? ` for ${g.platform}` : ""}. Check the numbers, then add.` : "Couldn’t find earnings in that screenshot. Please type them in.");
    } catch (e) {
      setShot(`Reading didn’t work: ${(e as Error).message}. Please type the numbers in.`);
    }
  }

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
          form.current?.querySelectorAll<HTMLInputElement>("input[name^='line:'], input[name^='fee:'], input[name='hours']").forEach((i) => (i.value = ""));
        } catch (e) {
          setMsg((e as Error).message);
        }
      }}
    >
      <input type="hidden" name="platform" value={platform} />
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Platform">
        {platforms.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={platform === p} onClick={() => setPlatform(p)}
            className={`flex items-center gap-2 rounded-full py-1 pr-4 pl-1 text-sm font-medium ring-2 transition ${platform === p ? "bg-white ring-ink" : "bg-wash ring-transparent hover:bg-wash-2"}`}>
            <PlatformTile name={p} size={30} />{p}
          </button>
        ))}
        <Tip k="platformPick" />
        <label className="btn-secondary btn-sm ml-auto cursor-pointer"><Icon name="upload" size={16} />Read a screenshot
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (f) readScreenshot(f); }} />
        </label>
      </div>
      {shot && <p className="-mt-2 rounded-xl bg-wash p-3 text-sm">{shot}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="field"><span className="flex items-center gap-1.5">From<Tip k="fromTo" align="left" /></span>
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
          <label key={l} className="field"><span className="flex items-center gap-1.5">{l === "Net fare" ? netLabel(platform) : l}<Tip k={l === "Net fare" ? "netFare" : l === "Promotions" ? "promotions" : "tips"} /></span>
            <input name={`line:${l}`} type="number" step="0.01" inputMode="decimal" placeholder="0.00" />
          </label>
        ))}
        <label className="field"><span className="flex items-center gap-1.5">Hours online <span className="text-[11px] font-normal text-mute">optional</span><Tip k="hours" /></span>
          <input name="hours" type="number" step="0.1" min="0" inputMode="decimal" placeholder="0" />
        </label>
        <label className="field"><span className="flex items-center gap-1.5">Service fee <span className="text-[11px] font-normal text-mute">recommended</span><Tip k="serviceFee" align="right" /></span>
          <input name="fee:Service fees" type="number" step="0.01" inputMode="decimal" placeholder="0.00" />
        </label>
      </div>
      <p className="muted -mt-2">
        {delivery
          ? <>Add any {platform} service or platform fee shown in your earnings breakdown, so your BAS is right; you get its GST back as a credit (if you’re registered for GST).</>
          : <>The ATO charges GST on the <b className="text-ink">full fare</b> the rider pays, not your net fare. Add the {platform} service fee
            (shown in the trip or weekly breakdown) so your BAS is right; you get its GST back as a credit.</>}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn"><Icon name="plus" size={18} />Add {platform} earnings</button>
        {msg && <span className={`text-sm ${msg.startsWith("Added") ? "text-pos" : "text-neg"}`}>{msg}</span>}
        <span className="muted">Copy the totals for these dates from the {platform} driver app. “To” is set a week after “From”; change it for any other period.</span>
      </div>
    </form>
  );
}
