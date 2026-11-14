import { PLATFORM_INFO, type PlatformName } from "@/lib/platforms";

/** Brand-coloured tile standing in for a platform logo. */
export function PlatformTile({ name, size = 44 }: { name: string; size?: number }) {
  const info = PLATFORM_INFO[name as PlatformName];
  if (!info) return null;
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-xl font-bold tracking-[-0.02em]"
      style={{ width: size, height: size, background: info.bg, color: info.fg, fontSize: size * (info.mark.length > 3 ? 0.28 : 0.34) }}>
      {info.mark}
    </span>
  );
}
