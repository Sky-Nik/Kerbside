import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/** PNG app icons (192 / 512) drawn from the Kerbside mark. ?maskable=1 adds safe-zone padding for Android. */
export async function GET(req: NextRequest, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size: raw } = await ctx.params;
  const size = raw === "512" ? 512 : raw === "180" ? 180 : 192;
  const maskable = req.nextUrl.searchParams.has("maskable");
  const inner = maskable ? size * 0.72 : size;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
        <svg width={inner} height={inner} viewBox="0 0 64 64">
          <rect width="64" height="64" rx={maskable ? 0 : 14} fill="#000" />
          <path d="M21.5 13v30" stroke="#fff" strokeWidth="9" />
          <path d="M47.5 13 28 29.5 47.5 43" fill="none" stroke="#fff" strokeWidth="9" strokeLinejoin="miter" />
          <rect x="17" y="48" width="34" height="4.5" rx="2.25" fill="#ffc043" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
