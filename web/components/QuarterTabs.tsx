import Link from "next/link";
import { Tip } from "./Tip";

const SHORT = ["Jul–Sep", "Oct–Dec", "Jan–Mar", "Apr–Jun"];

export function QuarterTabs({ path, q }: { path: string; q: number }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="-mx-4 min-w-0 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="seg">
          {SHORT.map((label, i) => (
            <Link key={label} href={`${path}?q=${i}`} className={`tab ${i === q ? "tab-on" : ""}`}>
              <span className="mr-1.5 font-bold">Q{i + 1}</span>{label}
            </Link>
          ))}
        </div>
      </div>
      <Tip k="quarterTabs" align="right" />
    </div>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="rise flex flex-col gap-4 pt-8 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="h1">{title}</h1>
      </div>
      {children}
    </div>
  );
}
