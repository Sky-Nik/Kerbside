import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/guides", "/privacy", "/terms"],
      disallow: ["/income", "/expenses", "/logbook", "/bas", "/tax", "/documents", "/settings", "/insights", "/reports", "/api", "/receipt", "/odometer", "/share"],
    },
    sitemap: "https://kerbside-au.vercel.app/sitemap.xml",
  };
}
