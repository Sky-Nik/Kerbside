import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { PublicShell } from "@/components/landing/PublicShell";

export const metadata: Metadata = {
  title: "Tax guides for rideshare and delivery drivers · Kerbside",
  description: "Plain-English guides to tax, GST, BAS and car expenses for Australian Uber, DiDi and food delivery drivers.",
};

export default function Guides() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-3xl pt-16">
        <p className="font-bold text-mute">Guides</p>
        <h1 className="mt-2 text-5xl leading-[1.02] font-bold tracking-[-0.045em]">Tax for drivers, in plain English.</h1>
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {GUIDES.map((g) => (
            <li key={g.slug}><Link href={`/guides/${g.slug}`} className="group block py-6">
              <h2 className="text-2xl font-bold tracking-[-0.02em] group-hover:underline">{g.title}</h2>
              <p className="mt-1 text-mute">{g.description}</p>
            </Link></li>
          ))}
        </ul>
      </main>
    </PublicShell>
  );
}
