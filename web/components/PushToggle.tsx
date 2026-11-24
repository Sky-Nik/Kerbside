"use client";
import { useEffect, useState } from "react";
import { savePush } from "@/app/actions";
import { VAPID_PUBLIC_KEY } from "@/lib/vapid";

const key = () => Uint8Array.from(atob(VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/** Turns phone/browser notifications on or off for this device. */
export function PushToggle() {
  const [state, setState] = useState<"loading" | "on" | "off" | "blocked" | "unsupported">("loading");
  const [error, setError] = useState("");
  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      setState((await (await navigator.serviceWorker.ready).pushManager.getSubscription()) ? "on" : "off");
    })();
  }, []);

  async function toggle() {
    setError("");
    try { await run(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
  async function run() {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await savePush(null, existing.endpoint);
      await existing.unsubscribe();
      return setState("off");
    }
    if ((await Notification.requestPermission()) !== "granted") return setState("blocked");
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key() });
    await savePush(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
    setState("on");
  }

  if (state === "unsupported") return <p className="muted">This browser can’t show notifications. On iPhone, add Kerbside to your home screen first (Share → Add to Home Screen), then open it from there.</p>;
  if (state === "blocked") return <p className="muted">Notifications are blocked for Kerbside. Allow them in your browser’s site settings, then come back.</p>;
  return (
    <>
    <button type="button" onClick={toggle} disabled={state === "loading"} className={state === "on" ? "btn-secondary" : "btn"}>
      {state === "loading" ? "Checking…" : state === "on" ? "Turn off on this device" : "Turn on reminders"}
    </button>
    {error && <p className="mt-3 text-sm text-red-600">Couldn’t turn on reminders: {error}</p>}
    </>
  );
}
