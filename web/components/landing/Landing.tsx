// Public landing page, shown at / to signed-out visitors. Screens are from a demo account.
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { PlatformTile } from "@/components/PlatformTile";
import { ALL_PLATFORMS } from "@/lib/platforms";

const FEATURES = [
  { id: "earnings", tag: "Earnings", title: "Log a week in seconds", body: "Copy your Uber or DiDi totals (net fare, promotions, tips) or drop in your monthly tax summary PDF and it fills itself in. Week, month and year views, with your real hourly rate.", img: "/landing/earnings.webp" },
  { id: "receipt", tag: "Receipts", title: "Snap it. Scanned. Stored.", body: "Take a photo and Kerbside reads the total, date and supplier right on your phone. The receipt is kept with the expense, so you’re ready if the ATO ever asks.", img: "/landing/receipt.webp" },
  { id: "bank", tag: "Bank check", title: "Nothing slips through", body: "Load a bank statement CSV. Kerbside finds the fuel, tolls, parking and phone bills you forgot to add, and totals your platform payouts. The file never leaves your device.", img: "/landing/bank.webp" },
  { id: "logbook", tag: "Logbook", title: "A logbook that builds itself", body: "Tap Start shift and End shift. The 12-week logbook fills in as you drive, with odometer photos as proof, and Kerbside compares the logbook and cents-per-km methods for you.", img: "/landing/logbook.webp" },
  { id: "bas", tag: "BAS", title: "BAS without the headache", body: "Every quarter, G1, 1A and 1B are worked out from your trips and receipts, including GST on the full fare. Open the report and copy three numbers into myGov.", img: "/landing/bas.webp" },
  { id: "tax", tag: "Tax return", title: "See your refund before you lodge", body: "Your business schedule is laid out the way myTax asks for it, with an estimate of your refund or what you owe. One tap sends your accountant everything in a single zip.", img: "/landing/tax.webp" },
];

const EXTRAS = [
  ["Put aside for tax", "Every week you see how much to set aside for GST and income tax, so there’s no bill shock."],
  ["Recurring costs", "Insurance, rego, phone plan: entered once and added automatically on each due date."],
  ["Reminders", "BAS due dates and renewals, straight into your phone’s calendar."],
  ["Fuel tracker", "Litres per 100 km and fuel cost per km between fill-ups."],
  ["Instant asset write-off", "Cars and equipment under $20,000 claimed in full in the year you start using them."],
  ["Super top-up", "See what a deductible super contribution would save you before 30 June."],
  ["Multiple cars", "Changed cars mid-year? Each one keeps its own logbook and depreciation."],
  ["Your data, your call", "Export everything as spreadsheets or delete your account any time."],
];

const RULES = [
  ["91c", "per km, cents-per-km rate for 2026-27, capped at 5,000 km"],
  ["12 weeks", "of continuous logbook records, good for 5 years"],
  ["Day one", "GST registration for rideshare drivers, from the first trip"],
  ["$82.50", "the point where you need a full tax invoice"],
];

const FAQ = [
  ["Who is Kerbside for?", "Australian rideshare and food-delivery drivers working as sole traders, on Uber, DiDi, Uber Eats, DoorDash and HungryPanda. Drive for more than one? Track them all in one place."],
  ["Do I need to download an app?", "No. Kerbside runs in your browser on any phone or computer. On your phone, open it in Safari or Chrome and choose Add to Home Screen, and it opens full screen like any other app."],
  ["Does Kerbside lodge my BAS or tax return for me?", "No. Kerbside prepares the numbers and reports. You copy them into myGov or the ATO online services, or hand the accountant pack to your tax agent. Estimates are a guide, not tax advice."],
  ["Is my data private?", "Your records are stored in Australia (Sydney) and locked to your account. Receipt scanning and bank-statement checks happen on your own device. See the privacy policy for the details."],
  ["What if I’m not registered for GST?", "Rideshare drivers have to register for GST from their first trip. Delivery-only drivers only need to once their turnover reaches $75,000. Kerbside handles both."],
];

const Browser = ({ src, alt, className = "" }: { src: string; alt: string; className?: string }) => (
  <div className={`overflow-hidden rounded-[14px] bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/10 ${className}`}>
    <div className="flex h-7 items-center gap-1.5 border-b border-line bg-[#f7f7f7] px-3">
      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      <span className="mx-auto rounded-md bg-white px-3 py-0.5 text-[10px] text-mute-2 ring-1 ring-line">kerbside-au.vercel.app</span>
    </div>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} width={1440} height={900} loading="lazy" className="block h-auto w-full" />
  </div>
);

const PhoneFrame = ({ src, alt, className = "" }: { src: string; alt: string; className?: string }) => (
  <div className={`rounded-[2.6rem] bg-black p-2.5 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/10 ${className}`}>
    <div className="relative overflow-hidden rounded-[2.1rem] bg-white">
      <span className="absolute top-2 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={540} height={1169} loading="lazy" className="block aspect-[390/780] w-full object-cover object-top" />
    </div>
  </div>
);

export function Landing() {
  return (
    <div className="landing">
      {/* ---------- nav ---------- */}
      <header className="bleed sticky top-0 z-40 border-b border-white/10 bg-black/85 text-white backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-[-0.02em]"><LogoMark size={30} inverted />Kerbside</Link>
          <div className="hidden items-center gap-1 text-sm text-white/70 md:flex">
            <a href="#features" className="rounded-full px-3 py-1.5 hover:bg-white/10 hover:text-white">Features</a>
            <a href="#how" className="rounded-full px-3 py-1.5 hover:bg-white/10 hover:text-white">How it works</a>
            <a href="#tour" className="rounded-full px-3 py-1.5 hover:bg-white/10 hover:text-white">Watch the tour</a>
            <a href="#faq" className="rounded-full px-3 py-1.5 hover:bg-white/10 hover:text-white">FAQ</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-white/85 hover:bg-white/10">Sign in</Link>
            <Link href="/login?mode=up" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-[#ffc043]">Get started</Link>
          </div>
        </nav>
      </header>

      {/* ---------- hero ---------- */}
      <section className="bleed relative overflow-hidden bg-black text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_75%_30%,rgba(255,192,67,0.16),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-0 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div className="rise rise-1">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-medium text-white/80 ring-1 ring-white/15">
              <span className="h-2 w-2 rounded-full bg-[#ffc043]" />Built for Australian rideshare &amp; delivery drivers
            </p>
            <h1 className="mt-6 text-[3.4rem] leading-[0.95] font-bold tracking-[-0.05em] sm:text-[4.6rem] lg:text-[5.4rem]">
              Tax, sorted.<br /><span className="text-white/45">For drivers.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
              Kerbside keeps your earnings, receipts, logbook, BAS and tax return in one place. Spend five minutes a week on it and tax time stops being a scramble.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login?mode=up" className="inline-flex h-13 items-center gap-2 rounded-full bg-[#ffc043] px-7 text-base font-bold text-black transition hover:bg-white">Create your free account <span aria-hidden>→</span></Link>
              <a href="#tour" className="inline-flex h-13 items-center gap-2 rounded-full px-5 text-base font-medium text-white ring-1 ring-white/25 hover:bg-white/10">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-black"><svg width="10" height="12" viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z" fill="currentColor" /></svg></span>Watch the 2-minute tour
              </a>
            </div>
            <p className="mt-5 text-sm text-white/45">Works in your browser on phone and computer. Nothing to install.</p>
          </div>
          <div className="relative rise rise-2 lg:-mr-24">
            <Browser src="/landing/dashboard.webp" alt="Kerbside dashboard showing weekly earnings, hourly rate and money to put aside for tax" className="lg:translate-y-6" />
            <PhoneFrame src="/landing/phone-dashboard.webp" alt="Kerbside on a phone" className="absolute -right-2 -bottom-12 hidden w-[30%] sm:block lg:right-20" />
          </div>
        </div>
        {/* the kerb */}
        <div className="relative mt-16 h-3 bg-[#ffc043] lg:mt-24" />
      </section>

      {/* ---------- platforms ---------- */}
      <section className="py-12 text-center">
        <p className="text-sm font-medium tracking-wide text-mute uppercase">Track every platform you work for</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {ALL_PLATFORMS.map((p) => (
            <span key={p} className="flex items-center gap-2.5 text-lg font-bold tracking-[-0.01em]"><PlatformTile name={p} size={36} />{p}</span>
          ))}
        </div>
      </section>

      {/* ---------- problem ---------- */}
      <section className="bleed bg-wash py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="font-bold text-mute">Sound familiar?</p>
            <h2 className="mt-2 text-4xl leading-[1.05] font-bold tracking-[-0.04em] sm:text-5xl">Receipts in the glovebox. Six apps. A lot of guessing.</h2>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[["GST from your first trip", "Rideshare drivers must register and lodge a BAS every quarter."], ["The fee trap", "GST applies to the full fare, including Uber’s service fee, not just your payout."],
              ["The logbook rule", "Claiming more than cents per km needs a 12-week logbook."], ["Lost receipts", "No receipt usually means no deduction."]].map(([t, b]) => (
              <li key={t} className="rounded-2xl bg-white p-5 ring-1 ring-line"><b className="block text-[17px]">{t}</b><span className="mt-1 block text-[15px] text-mute">{b}</span></li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section id="features" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-bold text-mute">Everything in one place</p>
          <h2 className="mt-2 text-4xl leading-[1.05] font-bold tracking-[-0.04em] sm:text-6xl">From your first trip to your tax return.</h2>
        </div>
        <div className="mt-20 space-y-28">
          {FEATURES.map((f, i) => (
            <div key={f.id} className={`grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] ${i % 2 ? "lg:[&>*:first-child]:order-2 lg:grid-cols-[1.2fr_0.8fr]" : ""}`}>
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-[13px] font-bold text-white"><span className="text-[#ffc043]">0{i + 1}</span>{f.tag}</span>
                <h3 className="mt-4 text-3xl leading-tight font-bold tracking-[-0.03em] sm:text-4xl">{f.title}</h3>
                <p className="mt-4 text-[17px] leading-relaxed text-mute">{f.body}</p>
              </div>
              <Browser src={f.img} alt={`${f.tag} in Kerbside`} />
            </div>
          ))}
        </div>
      </section>

      {/* ---------- extras ---------- */}
      <section className="bleed bg-black py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="max-w-2xl text-4xl leading-[1.05] font-bold tracking-[-0.04em] sm:text-5xl">And all the small things that add up.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {EXTRAS.map(([t, b]) => (
              <div key={t} className="bg-black p-6"><span className="block h-1 w-8 rounded-full bg-[#ffc043]" /><b className="mt-4 block text-lg tracking-[-0.01em]">{t}</b><p className="mt-2 text-[15px] leading-relaxed text-white/60">{b}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- tour video ---------- */}
      <section id="tour" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-bold text-mute">See it in action</p>
          <h2 className="mt-2 text-4xl leading-[1.05] font-bold tracking-[-0.04em] sm:text-5xl">The two-minute tour</h2>
        </div>
        <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-3xl bg-black shadow-[0_40px_100px_-30px_rgba(0,0,0,0.45)] ring-1 ring-black/10">
          <video controls preload="none" playsInline poster="/landing/tour-poster.webp" className="block aspect-video w-full">
            <source src="/landing/kerbside-tour.mp4" type="video/mp4" />
          </video>
        </div>
        <p className="mt-3 text-center text-[13px] text-mute-2">Figures shown are from a demo account. Music: Rafael Krux, filmmusic.io (CC BY 4.0).</p>
      </section>

      {/* ---------- how it works ---------- */}
      <section id="how" className="bleed scroll-mt-20 bg-wash py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-4xl leading-[1.05] font-bold tracking-[-0.04em] sm:text-5xl">Up and running before your next shift.</h2>
          <ol className="mt-12 grid gap-4 lg:grid-cols-3">
            {[["Sign up", "Use Google or your email. Pick rideshare, delivery or both, and the platforms you work for."],
              ["Add your week", "Copy your totals from the driver app, or import last month’s tax summary. Snap receipts as you go."],
              ["Lodge with confidence", "BAS each quarter, your tax return each July, or send the accountant pack to your tax agent."]].map(([t, b], i) => (
              <li key={t} className="rounded-3xl bg-white p-7 ring-1 ring-line">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-black text-lg font-bold text-[#ffc043]">{i + 1}</span>
                <b className="mt-5 block text-2xl tracking-[-0.02em]">{t}</b><p className="mt-2 text-[16px] leading-relaxed text-mute">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- phone ---------- */}
      <section className="grid items-center gap-12 py-24 lg:grid-cols-2">
        <div>
          <p className="font-bold text-mute">On your phone</p>
          <h2 className="mt-2 text-4xl leading-[1.05] font-bold tracking-[-0.04em] sm:text-5xl">Goes wherever you go.</h2>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-mute">There’s no app store download. Open Kerbside in your phone’s browser, add it to your home screen, and it works like an app: full screen, one tap away between trips.</p>
          <ol className="mt-8 space-y-4">
            {[["Open", "kerbside-au.vercel.app in Safari or Chrome"], ["Tap Share", "(iPhone) or the ⋮ menu (Android)"], ["Choose", "Add to Home Screen"]].map(([b, t], i) => (
              <li key={b} className="flex items-center gap-4 text-[17px]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black text-sm font-bold text-[#ffc043]">{i + 1}</span><span><b>{b}</b> {t}</span></li>
            ))}
          </ol>
        </div>
        <div className="relative mx-auto flex w-full max-w-md justify-center gap-5">
          <PhoneFrame src="/landing/phone-dashboard.webp" alt="Kerbside dashboard on a phone" className="w-1/2 translate-y-8" />
          <PhoneFrame src="/landing/phone-income.webp" alt="Adding earnings in Kerbside on a phone" className="w-1/2" />
        </div>
      </section>

      {/* ---------- ATO rules ---------- */}
      <section className="bleed border-y border-line py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-bold text-mute">Built on the ATO’s rules</p>
              <h2 className="mt-2 text-4xl leading-[1.05] font-bold tracking-[-0.04em]">The rules for drivers, worked in.</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-mute">BAS labels, the business schedule on your tax return, cents per km, logbooks, the car cost limit and depreciation all follow the ATO’s published guidance for 2026-27.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {RULES.map(([n, t]) => (
                <div key={n} className="rounded-2xl bg-wash p-5"><b className="block text-3xl tracking-[-0.03em]">{n}</b><span className="mt-1 block text-[14px] leading-snug text-mute">{t}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 py-24">
        <h2 className="text-center text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Questions</h2>
        <div className="mt-10 divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-bold tracking-[-0.01em]">
                {q}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-wash text-xl transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 pr-12 text-[16px] leading-relaxed text-mute">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="bleed relative overflow-hidden bg-black py-24 text-center text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_100%,rgba(255,192,67,0.2),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl px-4">
          <LogoMark size={72} inverted className="mx-auto" />
          <h2 className="mt-8 text-5xl leading-[1] font-bold tracking-[-0.05em] sm:text-7xl">Less paperwork.<br />More time on the road.</h2>
          <Link href="/login?mode=up" className="mt-10 inline-flex h-14 items-center gap-2 rounded-full bg-[#ffc043] px-8 text-lg font-bold text-black transition hover:bg-white">Create your free account <span aria-hidden>→</span></Link>
          <p className="mt-4 text-sm text-white/50">Already have an account? <Link href="/login" className="text-white underline underline-offset-2">Sign in</Link></p>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 py-10 text-sm text-mute">
        <span className="flex items-center gap-2 font-bold text-ink"><LogoMark size={22} />Kerbside</span>
        <span className="max-w-md text-[13px]">Kerbside gives general information and estimates, not tax advice. Check with a registered tax agent if you’re unsure.</span>
        <span className="flex gap-4"><Link href="/privacy" className="hover:text-ink">Privacy</Link><Link href="/terms" className="hover:text-ink">Terms</Link></span>
      </footer>
    </div>
  );
}
