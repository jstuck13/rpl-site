import type { Metadata } from "next";
import Link from "next/link";
import { readContentPage } from "@/lib/content";

/**
 * Same shape as /about and /join: public copy committed as markdown and read
 * at build time. Prerendered, nothing fetched at runtime.
 */
function readRules() {
  return readContentPage("rules.md", "Rules");
}

export async function generateMetadata(): Promise<Metadata> {
  const content = readRules();
  return {
    title: content.title,
    description: content.subtitle ?? undefined,
  };
}

export default function RulesPage() {
  const content = readRules();

  return (
    <div className="shell stack">
      <section className="hero">
        <p className="eyebrow">Rocket Premier League</p>
        <h1 className="hero__title recap__title">{content.title}</h1>
        {content.subtitle && <p className="hero__lede">{content.subtitle}</p>}
      </section>

      {/* Public copy, committed in src/content/rules.md. Not user input. */}
      <article
        className="recap"
        dangerouslySetInnerHTML={{ __html: content.html }}
      />

      <section>
        <Link href="/about" className="section__link">
          ← What RPL is
        </Link>
      </section>
    </div>
  );
}
