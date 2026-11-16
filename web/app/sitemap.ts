import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";

const SITE = "https://kerbside-au.vercel.app";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/guides`, changeFrequency: "monthly", priority: 0.8 },
    ...GUIDES.map((g) => ({ url: `${SITE}/guides/${g.slug}`, lastModified: g.updated, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE}/privacy`, priority: 0.2 },
    { url: `${SITE}/terms`, priority: 0.2 },
  ];
}
