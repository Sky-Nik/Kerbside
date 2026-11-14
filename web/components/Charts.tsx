import { aud } from "@/lib/fmt";

const QN = ["Q1", "Q2", "Q3", "Q4"];

/** Grouped bars: income vs expenses per quarter (pure SVG, no chart library). */
export function IncomeExpenseChart({ income, expenses }: { income: number[]; expenses: number[] }) {
  const max = Math.max(1, ...income, ...expenses);
  const W = 520, H = 200, top = 16, base = H - 28, barW = 34, gap = 8, slot = W / 4;
  const h = (v: number) => Math.max(v > 0 ? 2 : 0, ((base - top) * v) / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
      aria-label={`Income and expenses by quarter: ${QN.map((q, i) => `${q} income ${aud(income[i])}, expenses ${aud(expenses[i])}`).join("; ")}`}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="0" x2={W} y1={base - (base - top) * f} y2={base - (base - top) * f} stroke="#eeeeee" />
      ))}
      <line x1="0" x2={W} y1={base} y2={base} stroke="#e2e2e2" />
      {QN.map((q, i) => {
        const cx = slot * i + slot / 2;
        const x1 = cx - barW - gap / 2, x2 = cx + gap / 2;
        return (
          <g key={q}>
            <rect x={x1} y={base - h(income[i])} width={barW} height={h(income[i])} rx="5" fill="#000000">
              <title>{`${q} income ${aud(income[i])}`}</title>
            </rect>
            <rect x={x2} y={base - h(expenses[i])} width={barW} height={h(expenses[i])} rx="5" fill="#ffc043">
              <title>{`${q} expenses ${aud(expenses[i])}`}</title>
            </rect>
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="#545454">{q}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Horizontal share bars for expense categories, biggest first. */
export function CategoryBars({ items, total }: { items: { label: string; value: number }[]; total: number }) {
  return (
    <ul className="space-y-3">
      {items.map((it, i) => {
        const share = total ? it.value / total : 0;
        return (
          <li key={it.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className={`truncate ${i === 0 ? "font-bold" : "font-medium"}`}>{it.label}</span>
              <span className="shrink-0 tabular-nums">
                <b>{aud(it.value)}</b> <span className="text-mute">{Math.round(share * 100)}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-wash-2">
              <div className={`h-full rounded-full ${i === 0 ? "bg-black" : "bg-mute-2/60"}`} style={{ width: `${Math.max(2, share * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
