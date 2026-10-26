// Australian tax year runs 1 July to 30 June, e.g. 2026-10-26 -> "2026-27".
export function taxYear(date: Date): string {
  const y = date.getFullYear();
  const start = date.getMonth() >= 6 ? y : y - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}
