import Link from "next/link";
import { LogoMark } from "@/components/Logo";

/** Light, public page frame (guides): Kerbside bar on top, sign-up call to action at the bottom. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing">
      <header className="bleed sticky top-0 z-40 border-b border-white/10 bg-black/90 text-white backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-[-0.02em]"><LogoMark size={30} inverted />Kerbside</Link>
          <Link href="/guides" className="hidden rounded-full px-3 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white sm:block">Guides</Link>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-white/85 hover:bg-white/10">Sign in</Link>
            <Link href="/login?mode=up" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-[#ffc043]">Get started</Link>
          </div>
        </nav>
      </header>
      {children}
      <section className="bleed mt-20 bg-black py-16 text-center text-white">
        <h2 className="text-4xl font-bold tracking-[-0.04em]">Let Kerbside do the maths.</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/65">Earnings, receipts, logbook, BAS and tax return in one place, built for Australian drivers.</p>
        <Link href="/login?mode=up" className="mt-8 inline-flex h-13 items-center rounded-full bg-[#ffc043] px-7 font-bold text-black hover:bg-white">Create your free account →</Link>
      </section>
      <footer className="flex flex-wrap justify-between gap-4 py-8 text-[13px] text-mute">
        <span>General information, not tax advice. Check with a registered tax agent for your situation.</span>
        <span className="flex gap-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></span>
      </footer>
    </div>
  );
}
