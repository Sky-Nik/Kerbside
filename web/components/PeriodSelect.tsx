"use client";
import { useRouter } from "next/navigation";

/** Dropdown of weeks / months / years for the earnings card; picking one jumps to it. */
export function PeriodSelect({ view, value, options }: { view: string; value: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  return (
    <select
      aria-label={`Choose ${view}`}
      value={value}
      onChange={(e) => router.push(`/?view=${view}&at=${e.currentTarget.value}`, { scroll: false })}
      className="h-9 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 bg-[length:12px] bg-[right_14px_center] bg-no-repeat px-4 pr-9 text-center text-sm font-medium text-white outline-none hover:bg-white/20 focus:ring-2 focus:ring-white sm:flex-none [&>option]:text-black"
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")" }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
