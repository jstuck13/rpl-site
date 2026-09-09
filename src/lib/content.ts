/**
 * Reader for the site's committed markdown pages (src/content/*.md).
 *
 * `/about` and `/join` each carry their own inlined copy of this logic; this
 * is the same thing factored out so a third page doesn't mean a third copy.
 * Worth migrating those two onto it next time either is touched — behaviour
 * here is deliberately identical to theirs (same frontmatter parsing, same
 * `marked` call, same defaults), so the swap is a delete rather than a
 * rewrite.
 *
 * Read at build time. The site prerenders, so nothing here runs at request
 * time, and the markdown is committed copy rather than user input — which is
 * why the pages are free to render it as HTML.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";

export interface ContentPage {
  title: string;
  subtitle: string | null;
  html: string;
}

/**
 * @param file  filename inside src/content, e.g. "rules.md"
 * @param fallbackTitle  used when the file has no `title` in its frontmatter
 */
export function readContentPage(file: string, fallbackTitle: string): ContentPage {
  const raw = readFileSync(join(process.cwd(), "src/content", file), "utf8");
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
    title: fields.get("title") ?? fallbackTitle,
    subtitle: fields.get("subtitle") || null,
    html: marked.parse(body) as string,
  };
}
