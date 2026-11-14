"use client";
import { useState } from "react";
import { PLATFORM_INFO, platformsFor, type PlatformName, type WorkType } from "@/lib/platforms";
import { savePlatforms } from "@/app/actions";
import { PlatformTile } from "./PlatformTile";
import { Icon } from "./Icon";

const TYPES: { id: WorkType; title: string; text: string }[] = [
  { id: "rideshare", title: "Rideshare", text: "Driving passengers – Uber, DiDi" },
  { id: "delivery", title: "Food delivery", text: "Delivering food or groceries – Uber Eats, DoorDash, HungryPanda" },
];

/** Work type + platform selection. Used on /welcome and in Settings. */
export function PlatformPicker({ initialTypes, initialPlatforms, initialGst, submitLabel, next }: {
  initialTypes: WorkType[]; initialPlatforms: PlatformName[]; initialGst: boolean; submitLabel: string; next?: string;
}) {
  const [types, setTypes] = useState<WorkType[]>(initialTypes);
  const [picked, setPicked] = useState<PlatformName[]>(initialPlatforms);
  const [gst, setGst] = useState(initialGst);
  const [msg, setMsg] = useState<string | null>(null);
  const available = platformsFor(types);
  const chosen = picked.filter((p) => available.includes(p));
  const rideshare = types.includes("rideshare");
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <form
      className="space-y-8"
      action={async (f) => {
        setMsg(null);
        try { await savePlatforms(f); setMsg("Saved"); } catch (e) {
          if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
          setMsg((e as Error).message);
        }
      }}
    >
      {types.map((t) => <input key={t} type="hidden" name="work_types" value={t} />)}
      {chosen.map((p) => <input key={p} type="hidden" name="platforms" value={p} />)}
      <input type="hidden" name="gst_registered" value={rideshare || gst ? "on" : ""} />
      {next && <input type="hidden" name="next" value={next} />}

      <section>
        <p className="eyebrow mb-1">Step 1</p>
        <h2 className="h2 mb-3">What kind of work do you do? <span className="font-normal text-mute">Choose all that apply</span></h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TYPES.map((t) => {
            const on = types.includes(t.id);
            return (
              <button key={t.id} type="button" aria-pressed={on} onClick={() => setTypes(toggle(types, t.id))}
                className={`flex items-start gap-3 rounded-2xl p-5 text-left transition ${on ? "bg-black text-white" : "bg-wash hover:bg-wash-2"}`}>
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md ring-2 ${on ? "bg-warn text-black ring-warn" : "ring-mute-2"}`}>
                  {on && <Icon name="check" size={16} />}
                </span>
                <span>
                  <span className="block text-lg font-bold">{t.title}</span>
                  <span className={`block text-sm ${on ? "text-white/70" : "text-mute"}`}>{t.text}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {types.length > 0 && (
        <section>
          <p className="eyebrow mb-1">Step 2</p>
          <h2 className="h2 mb-3">Which platforms do you use? <span className="font-normal text-mute">Choose all that apply</span></h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((p) => {
              const on = chosen.includes(p);
              return (
                <button key={p} type="button" aria-pressed={on} onClick={() => setPicked(toggle(picked, p))}
                  className={`flex items-center gap-3 rounded-2xl p-4 text-left ring-2 transition ${on ? "bg-white ring-ink" : "bg-wash ring-transparent hover:bg-wash-2"}`}>
                  <PlatformTile name={p} size={48} />
                  <span className="flex-1">
                    <span className="block font-bold">{p}</span>
                    <span className="block text-[13px] text-mute">{PLATFORM_INFO[p].blurb}</span>
                  </span>
                  <span className={`grid h-6 w-6 place-items-center rounded-full ${on ? "bg-black text-white" : "ring-2 ring-line"}`}>
                    {on && <Icon name="check" size={14} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {types.length > 0 && (
        <section className="rounded-2xl bg-wash p-5 text-sm">
          <p className="eyebrow mb-1">GST</p>
          {rideshare ? (
            <p>Rideshare drivers must be <b>registered for GST from their first trip</b>, whatever they earn (ATO). Kerbside will work out GST for your BAS.</p>
          ) : (
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={gst} onChange={(e) => setGst(e.currentTarget.checked)} className="mt-0.5" />
              <span>
                <b className="block">I’m registered for GST</b>
                <span className="text-mute">Delivery-only drivers only have to register once their turnover reaches $75,000 a year (ATO). Tick this if you’ve registered anyway.</span>
              </span>
            </label>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn h-12 px-8 text-base" disabled={!chosen.length}>{submitLabel}</button>
        {!chosen.length && <span className="muted">Pick at least one platform.</span>}
        {msg && <span className={`text-sm ${msg === "Saved" ? "text-pos" : "text-neg"}`}>{msg}</span>}
      </div>
    </form>
  );
}
