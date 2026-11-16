"use client";
import { useState } from "react";

export type Theme = "system" | "light" | "dark";
const OPTIONS: [Theme, string][] = [["system", "Automatic"], ["light", "Light"], ["dark", "Dark"]];

/** Sets the theme cookie (read before paint by the script in the root layout) and applies it straight away. */
export function applyTheme(t: Theme) {
  document.cookie = `theme=${t}; path=/; max-age=31536000; samesite=lax`;
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemePicker({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const pick = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
  };
  return (
    <div className="seg" role="radiogroup" aria-label="Appearance">
      {OPTIONS.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={theme === v} onClick={() => pick(v)} className={`tab ${theme === v ? "tab-on" : ""}`}>{label}</button>
      ))}
    </div>
  );
}
