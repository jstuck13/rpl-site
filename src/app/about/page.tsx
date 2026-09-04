import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { marked } from "marked";

/**
 * Same pattern as /join (src/app/join/page.tsx): public copy committed as
 * markdown and read at build time, no strip pass needed since this is
 * written for publication from the start. Prerendered, nothing fetched at
 * runtime.
 */
const SOURCE = join(process.cwd(), "src/content/about.md");

interface AboutContent {
  title: string;
  subtitle: string | null;
  html: string;
}

function readAbout(): AboutContent {
  const raw = readFileSync(SOURCE, "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const body = match ? raw.slice(match[0].length) : raw;

  const fields = new Map<string, string>();
  for (const line of (match?.[1] ?? "").split("\n")) {
    const kv = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!kv) continue;
    const value = /^["']/.test(kv[2].trim())
      ? kv[2].trim().replace(/^(["'])(.*?)\1.*$/, "$2")
      : kv[2].trim();
    fields.set(kv[1], value);
  }

  return {
    title: fields.get("title") ?? "About RPL",
    subtitle: fields.get("subtitle") || null,
    html: marked.parse(body) as string,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const content = readAbout();
  return {
    title: content.title,
    description: content.subtitle ?? undefined,
  };
}

export default function AboutPage() {
  const content = readAbout();

  return (
    <div className="shell stack">
      <section className="hero">
        <p className="eyebrow">Rocket Premier League</p>
        <h1 className="hero__title recap__title">{content.title}</h1>
        {content.subtitle && <p className="hero__lede">{content.subtitle}</p>}
      </section>

      {/* Public copy, committed in src/content/about.md. Not user input. */}
      <article
        className="recap"
        dangerouslySetInnerHTML={{ __html: content.html }}
      />

      <section>
        <Link href="/" className="section__link">
          ← Back to the league
        </Link>
      </section>
    </div>
  );
}
