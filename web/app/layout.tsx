import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=([a-z]+)/),t=m?m[1]:"system",q=matchMedia("(prefers-color-scheme: dark)"),
f=function(){document.documentElement.classList.toggle("dark",t==="dark"||(t==="system"&&q.matches))};f();q.addEventListener("change",function(){var n=document.cookie.match(/(?:^|; )theme=([a-z]+)/);t=n?n[1]:"system";f()})}catch(e){}})()`;

const GTM_ID = "GTM-KM454MMH"; // Google Tag Manager container

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Kerbside",
  description: "Kerbside: income, receipts, logbook, BAS and tax return for Australian rideshare drivers",
  appleWebApp: { title: "Kerbside", capable: true, statusBarStyle: "black" },
  icons: { apple: [{ url: "/pwa-icon/180", sizes: "180x180" }] },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#000000" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className={`${dmSans.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Dark mode before first paint: cookie "theme" = system | light | dark (Settings → Appearance) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans">
        <noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} /></noscript>
        <Header />
        <div className="mx-auto max-w-6xl px-4 pb-28 sm:px-6 lg:pb-20">{children}</div>
        <Script id="gtm-init" strategy="afterInteractive">{`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});`}</Script>
        <Script id="gtm" src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`} strategy="afterInteractive" />
      </body>
    </html>
  );
}
