"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { todayAu } from "@/lib/tax";
import { uploadOdometer } from "./receipt";
import { Icon } from "./Icon";

type Shift = { date: string; odo: number; at: string; photo: string | null; car?: string };
type Car = { id: string; name: string; lastOdo: number | null };
const KEY = "kerbside-shift";
// The open shift is saved to your account (table open_shifts) so you can end it on any device.
// If that table isn't there yet, it falls back to this browser.
const local = {
  get: (): Shift | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; } },
  set: (s: Shift | null) => { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch {} },
};
async function readShift(): Promise<Shift | null> {
  const { data, error } = await supabaseBrowser().from("open_shifts").select("date,odo,started_at,photo,vehicle_id").maybeSingle();
  if (error) return local.get();
  return data ? { date: data.date, odo: data.odo, at: data.started_at, photo: data.photo, car: data.vehicle_id ?? "" } : null;
}
async function writeShift(s: Shift | null) {
  const sb = supabaseBrowser();
  const { error } = s
    ? await sb.from("open_shifts").upsert({ date: s.date, odo: s.odo, started_at: s.at, photo: s.photo, vehicle_id: s.car || null })
    : await sb.from("open_shifts").delete().not("odo", "is", null);
  local.set(error ? s : null);
}
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });

/** Start shift / End shift: odometer (and an optional dated photo of it) at each end, saved as a rideshare trip. */
export function ShiftTracker({ cars }: { cars: Car[] }) {
  const router = useRouter();
  const [shift, setShift] = useState<Shift | null>(null);
  const [car, setCar] = useState("");
  const lastOdo = cars.find((c) => c.id === car)?.lastOdo ?? null;
  const [odo, setOdo] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    readShift().then((s) => { if (!live) return; setShift(s); if (!s && lastOdo != null) setOdo(String(lastOdo)); });
    return () => { live = false; };
  }, [lastOdo]);

  async function start() {
    setBusy(true); setMsg(null);
    try {
      const s: Shift = { date: todayAu(), odo: Number(odo), at: new Date().toISOString(), photo: photo ? await uploadOdometer(photo, "start") : null, car };
      await writeShift(s);
      setShift(s); setOdo(""); setPhoto(null);
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  async function end() {
    if (!shift) return;
    const odoEnd = Number(odo);
    if (!(odoEnd > shift.odo)) return setMsg(`The end reading must be more than ${shift.odo.toLocaleString("en-AU")} km.`);
    setBusy(true); setMsg(null);
    try {
      const endPhoto = photo ? await uploadOdometer(photo, "end") : null;
      const today = todayAu();
      const { error } = await supabaseBrowser().from("trips").insert({
        date: shift.date, end_date: today !== shift.date ? today : null, odo_start: shift.odo, odo_end: odoEnd, purpose: "rideshare", vehicle_id: shift.car || null,
        description: `Shift ${time(shift.at)} – ${time(new Date().toISOString())}`,
        photos: shift.photo || endPhoto ? [shift.photo ?? "", endPhoto ?? ""] : null,
      });
      if (error) throw new Error(error.message);
      await writeShift(null);
      setShift(null); setPhoto(null); setOdo(String(odoEnd));
      setMsg(`Saved: ${(odoEnd - shift.odo).toLocaleString("en-AU")} km of rideshare driving.`);
      router.refresh();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  async function cancel() { await writeShift(null); setShift(null); }

  return (
    <div>
      {shift && <p className="mb-3 rounded-xl bg-[#e9f7ef] p-3 text-sm"><b>On shift</b> since {time(shift.at)} ({shift.date === todayAu() ? "today" : shift.date}) · {cars.find((c) => c.id === (shift.car ?? ""))?.name ?? "car"} · started at {shift.odo.toLocaleString("en-AU")} km{shift.photo ? " · photo saved" : ""}</p>}
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        {cars.length > 1 && !shift && (
          <label className="field sm:col-span-3">Car<select value={car} onChange={(e) => setCar(e.target.value)}>
            {cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        )}
        <label className="field">{shift ? "Odometer now" : "Odometer at start"}
          <input type="number" inputMode="numeric" min="0" value={odo} onChange={(e) => setOdo(e.target.value)} required /></label>
        <label className="field"><span>Photo of odometer <span className="text-[11px] font-normal text-mute">optional</span></span>
          <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
        <button className="btn" disabled={busy || !odo} onClick={shift ? end : start}>
          <Icon name={shift ? "check" : "car"} size={18} />{busy ? "Saving…" : shift ? "End shift" : "Start shift"}</button>
      </div>
      <p className="muted mt-2">{msg ?? (shift ? "Tap End shift when you log off. The trip is saved as rideshare driving." : "Tap Start shift when you log on to Uber or DiDi. The photo is stamped with the time you take it.")}
        {shift && <button type="button" className="ml-2 underline" onClick={cancel}>Cancel shift</button>}</p>
    </div>
  );
}
