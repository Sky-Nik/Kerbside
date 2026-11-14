"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { HELP, type HelpKey } from "@/lib/help";

/**
 * Small ⓘ button with a tooltip. Opens on hover, keyboard focus or tap (for phones);
 * Esc or tapping elsewhere closes it. `align` keeps it on screen near page edges.
 */
export function Tip({ k, text, align = "center", className = "" }: {
  k?: HelpKey; text?: string; align?: "left" | "center" | "right"; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const body = text ?? (k ? HELP[k] : "");
  const tipRef = useRef<HTMLSpanElement>(null);

  // Keep the tooltip on screen: nudge it sideways if it would spill past either edge.
  useLayoutEffect(() => {
    const el = tipRef.current;
    if (!open || !el) return;
    el.style.translate = "0px";
    const r = el.getBoundingClientRect(), pad = 8, vw = document.documentElement.clientWidth;
    const dx = r.left < pad ? pad - r.left : r.right > vw - pad ? vw - pad - r.right : 0;
    el.style.translate = `${dx}px`;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const pos = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span ref={ref} className={`group/tip relative inline-flex align-middle ${className}`}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {/* span, not <button>: inside a <label> a button would steal the label from its input */}
      <span role="button" tabIndex={0} aria-label="What’s this?" aria-describedby={open ? id : undefined} aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); } }}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        className="grid h-[18px] w-[18px] shrink-0 cursor-help place-items-center rounded-full border border-current text-[11px] leading-none font-bold opacity-50 transition select-none hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        i
      </span>
      {open && (
        <span id={id} ref={tipRef} role="tooltip"
          className={`absolute top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-ink px-3 py-2 text-left text-[13px] leading-snug font-normal tracking-normal text-white normal-case shadow-xl ring-1 ring-white/15 ${pos}`}>
          {body}
        </span>
      )}
    </span>
  );
}
