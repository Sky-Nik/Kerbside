"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { NAV_HELP } from "@/lib/help";

export const NAV = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/income", label: "Income", icon: "income" },
  { href: "/expenses", label: "Expenses", icon: "receipt" },
  { href: "/logbook", label: "Logbook", icon: "car" },
  { href: "/bas", label: "BAS", icon: "bas" },
  { href: "/tax", label: "Tax", icon: "tax" },
  { href: "/insights", label: "Insights", icon: "income" },
  { href: "/documents", label: "Documents", icon: "folder" },
  { href: "/settings", label: "Settings", icon: "gear" },
] as const;

const isOn = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

/** Desktop: inline links in the black bar. */
export function TopNav() {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} title={NAV_HELP[n.href]}
          className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${isOn(path, n.href) ? "bg-white text-black" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

/** Mobile/tablet: fixed bottom tab bar (the five most-used tabs). */
export function BottomNav() {
  const path = usePathname();
  const items = NAV.filter((n) => !["/logbook", "/settings", "/documents", "/insights"].includes(n.href));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((n) => {
          const on = isOn(path, n.href);
          return (
            <Link key={n.href} href={n.href} title={NAV_HELP[n.href]} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${on ? "text-black" : "text-mute-2"}`}>
              <Icon name={n.icon} size={22} className={on ? "stroke-[2.4]" : ""} />
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
