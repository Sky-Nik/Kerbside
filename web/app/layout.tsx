import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rideshare Tax Tracker",
  description: "Income, expenses, receipts, logbook, BAS and tax for Australian rideshare drivers",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-AU" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Header />
        <div className="mx-auto max-w-6xl px-4 pb-16">{children}</div>
      </body>
    </html>
  );
}
