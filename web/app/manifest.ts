import type { MetadataRoute } from "next";

// Lets drivers add Kerbside to their home screen; it then opens full-screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kerbside – rideshare tax tracker",
    short_name: "Kerbside",
    description: "Earnings, receipts, logbook, BAS and tax for rideshare and delivery drivers",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
