import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { PublicShell } from "@/components/landing/PublicShell";

export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }));

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  return g ? { title: `${g.title} · Kerbside`, description: g.description, openGraph: { title: g.title, description: g.description, type: "article" } } : {};
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const others = GUIDES.filter((o) => o.slug !== g.slug);
  return (
    <PublicShell>
      <article className="mx-auto max-w-2xl pt-14">
        <Link href="/guides" className="text-sm font-bold text-mute hover:text-ink">← All guides</Link>
        <h1 className="mt-4 text-[2.6rem] leading-[1.05] font-bold tracking-[-0.04em] sm:text-5xl">{g.title}</h1>
        <p className="mt-4 text-lg text-mute">{g.description}</p>
        <p className="mt-2 text-sm text-mute-2">Updated {new Date(g.updated).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })} · for the 2026-27 financial year</p>
        {g.sections.map((s) => (
          <section key={s.h} className="mt-10">
            <h2 className="text-2xl font-bold tracking-[-0.02em]">{s.h}</h2>
            {s.p.map((p, i) => <p key={i} className="mt-3 text-[17px] leading-relaxed text-ink-2">{p}</p>)}
          </section>
        ))}
        <aside className="mt-14 rounded-2xl bg-wash p-6">
          <b className="block">More guides</b>
          <ul className="mt-2 space-y-1.5">{others.map((o) => <li key={o.slug}><Link href={`/guides/${o.slug}`} className="underline underline-offset-2">{o.title}</Link></li>)}</ul>
        </aside>
      </article>
    </PublicShell>
  );
}
