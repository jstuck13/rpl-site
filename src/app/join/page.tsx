import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { marked } from "marked";

/**
 * The join copy lives as markdown in `src/content/join.md` rather than going
 * through a build script like the profiles and recaps do. Those two need a
 * strip pass because they're drafted from internal documents; this page is
 * public copy from the start, so it's committed as-is and read at build time.
 * Nothing here is fetched at runtime — the page is prerendered.
 */
const SOURCE = join(process.cwd(), "src/content/join.md");

interface JoinContent {
  title: string;
  subtitle: string | null;
  ctaLabel: string;
  ctaHref: string;
  poolOpen: boolean;
  poolCount: number | null;
  html: string;
}

function readJoin(): JoinContent {
  const raw = readFileSync(SOURCE, "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const body = match ? raw.slice(match[0].length) : raw;

  const fields = new Map<string, string>();
  for (const line of (match?.[1] ?? "").split("\n")) {
    const kv = line.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!kv) continue;
    // A trailing ` # comment`, unless the value is quoted.
    const value = /^["']/.test(kv[2].trim())
      ? kv[2].trim().replace(/^(["'])(.*?)\1.*$/, "$2")
      : kv[2].replace(/\s+#.*$/, "").trim();
    fields.set(kv[1], value);
  }

  const count = Number(fields.get("poolCount"));

  return {
    title: fields.get("title") ?? "Play in RPL",
    subtitle: fields.get("subtitle") || null,
    ctaLabel: fields.get("ctaLabel") ?? "Join the RPL Discord",
    ctaHref: fields.get("ctaHref") ?? "",
    poolOpen: fields.get("poolOpen") === "true",
    poolCount: Number.isFinite(count) && count > 0 ? count : null,
    html: marked.parse(body) as string,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const content = readJoin();
  return {
    title: content.title,
    description: content.subtitle ?? undefined,
  };
}

export default function JoinPage() {
  const content = readJoin();

  return (
    <div className="shell stack">
      <section className="hero">
        <p className="eyebrow">Rocket Premier League</p>
        <h1 className="hero__title recap__title">{content.title}</h1>
        {content.subtitle && <p className="hero__lede">{content.subtitle}</p>}

        <div className="join-cta">
          {content.ctaHref && (
            <a
              href={content.ctaHref}
              className="join-cta__button"
              target="_blank"
              rel="noreferrer"
            >
              {content.ctaLabel}
            </a>
          )}
          <span className="hero-block__meta">
            {content.poolOpen
              ? "The draft pool is open."
              : "The next draft pool isn't open yet — join the Discord and you'll be pinged when it is."}
            {content.poolCount !== null &&
              ` ${content.poolCount} signed up so far.`}
          </span>
        </div>
      </section>

      {/* Public copy, committed in src/content/join.md. Not user input. */}
      <article
        className="recap"
        dangerouslySetInnerHTML={{ __html: content.html }}
      />

      <section>
        <Link href="/standings" className="section__link">
          See the league in progress →
        </Link>
      </section>
    </div>
  );
}
