import Link from "next/link";

const SHORT = ["Jul–Sep", "Oct–Dec", "Jan–Mar", "Apr–Jun"];

export function QuarterTabs({ path, q }: { path: string; q: number }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="seg">
        {SHORT.map((label, i) => (
          <Link key={label} href={`${path}?q=${i}`} className={`tab ${i === q ? "tab-on" : ""}`}>
            <span className="mr-1.5 font-bold">Q{i + 1}</span>{label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="rise flex flex-col gap-4 pt-8 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="h1">{title}</h1>
      </div>
      {children}
    </div>
  );
}
