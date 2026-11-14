import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Kerbside",
  description: "Kerbside: income, receipts, logbook, BAS and tax return for Australian rideshare drivers",
  appleWebApp: { title: "Kerbside", capable: true, statusBarStyle: "black" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#000000" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className={`${dmSans.variable} h-full`}>
      <body className="min-h-full font-sans">
        <Header />
        <div className="mx-auto max-w-6xl px-4 pb-28 sm:px-6 lg:pb-20">{children}</div>
      </body>
    </html>
  );
}
