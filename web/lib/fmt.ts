const AUD = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
export const aud = (n: number) => (Math.abs(n) < 0.005 ? "–" : n < 0 ? `(${AUD.format(-n)})` : AUD.format(n));
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export const auDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
export const monthName = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });
export const kmFmt = (n: number) => n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
