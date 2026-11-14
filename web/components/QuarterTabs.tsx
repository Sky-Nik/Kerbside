import Link from "next/link";
import { QUARTERS } from "@/lib/tax";

export function QuarterTabs({ path, q }: { path: string; q: number }) {
  return (
    <div className="flex flex-wrap gap-1">
      {QUARTERS.map((label, i) => (
        <Link key={label} href={`${path}?q=${i}`} className={`tab ${i === q ? "tab-on" : ""}`}>{label}</Link>
      ))}
    </div>
  );
}
