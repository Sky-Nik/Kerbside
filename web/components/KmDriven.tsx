"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Tip } from "./Tip";

/** Counts up from 0 to `to` once, unless the user prefers reduced motion. */
function useCountUp(to: number, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = instant ? 1 : Math.min(1, (t - t0) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}

/** Dashboard card: a car driving along a road, with the year's kilometres underneath. */
export function KmDriven({ fy, km, kmSource, businessPct, platformKm }: {
  fy: string; km: number; kmSource: string; businessPct: number | null; platformKm: number;
}) {
  const shown = useCountUp(km);
  return (
    <Link href="/logbook" className="card rise rise-4 group flex flex-col overflow-hidden !p-0 lg:col-span-2">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="h2 flex items-center gap-2">Kilometres driven<Tip k="km" align="left" /></h2>
        <Icon name="chevron" className="text-mute group-hover:text-ink" />
      </div>

      {/* road scene */}
      <div className="relative mt-3 h-28 overflow-hidden bg-[#fff4d9]" aria-hidden>
        <div className="absolute inset-x-0 bottom-0 h-11 bg-[#2b2b2b]">
          <div className="anim-road absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2"
            style={{ backgroundImage: "linear-gradient(90deg, #ffc043 0 32px, transparent 32px 64px)", backgroundSize: "64px 3px" }} />
        </div>
        <div className="absolute inset-x-0 bottom-11 h-1.5 bg-[#ffc043]" />
        <svg viewBox="0 0 120 52" className="absolute bottom-6 left-1/2 w-32 -translate-x-1/2">
          <path d="M8 34 L14 22 Q18 15 28 14 L66 13 Q76 13 84 21 L92 28 L108 31 Q114 32 114 38 L114 42 L6 42 L6 37 Q6 34 8 34Z" fill="#000" />
          <path d="M30 18 L62 17 Q70 17 76 23 L80 27 L26 28 Q24 22 30 18Z" fill="#fff" />
          <rect x="52" y="17" width="3" height="11" fill="#000" />
          <rect x="14" y="33" width="100" height="2.5" fill="#ffc043" />
          <rect x="106" y="34" width="6" height="3" rx="1.5" fill="#ffc043" />
          <g className="anim-spin" style={{ transformOrigin: "30px 42px" }}><circle cx="30" cy="42" r="8" fill="#1a1a1a" /><circle cx="30" cy="42" r="3.5" fill="#cfcfcf" /><rect x="29" y="35" width="2" height="14" fill="#1a1a1a" /></g>
          <g className="anim-spin" style={{ transformOrigin: "92px 42px" }}><circle cx="92" cy="42" r="8" fill="#1a1a1a" /><circle cx="92" cy="42" r="3.5" fill="#cfcfcf" /><rect x="91" y="35" width="2" height="14" fill="#1a1a1a" /></g>
        </svg>
      </div>

      <div className="px-5 pt-4 pb-5 text-center">
        <p className="text-5xl font-bold tracking-[-0.03em] tabular-nums">{shown.toLocaleString("en-AU")}<span className="ml-1 text-2xl text-mute">km</span></p>
        <p className="muted mt-1">{km ? `${kmSource} · FY ${fy}` : "Add odometer trips in your logbook to see this"}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl bg-wash p-3"><p className="text-xs text-mute">Business use</p><p className="font-bold tabular-nums">{businessPct == null ? "–" : `${(businessPct * 100).toFixed(1)}%`}</p></div>
          <div className="rounded-xl bg-wash p-3"><p className="text-xs text-mute">On-trip (platforms)</p><p className="font-bold tabular-nums">{platformKm.toLocaleString("en-AU")} km</p></div>
        </div>
      </div>
    </Link>
  );
}
