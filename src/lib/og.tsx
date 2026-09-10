/**
 * Shared Open Graph card.
 *
 * WHY: almost every visitor arrives by tapping a link in Discord. Without
 * these, an RPL link unfurls as a bare URL. With them, every page produces a
 * branded card automatically and forever — no per-post effort.
 *
 * Cards are generated at build time (these routes are static like the rest of
 * the site), so nothing runs at request time and a broken card fails the build
 * rather than shipping.
 *
 * FONT GOTCHA, do not undo:
 * Satori — the renderer behind `next/og` — cannot read **woff2**, and cannot
 * read **variable fonts** at all (its parser throws on the `fvar` table). The
 * design system's own `src/ds/fonts/*.woff2` are therefore unusable here, and
 * Inter is variable on top of that. The `.ttf` files this module loads are
 * static, single-weight instances converted specifically for Satori. If the
 * design system's fonts are ever updated, these must be regenerated the same
 * way — pointing this at the woff2 files will break the build.
 */

import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONTS = join(process.cwd(), "src/ds/fonts");
const display = readFileSync(join(FONTS, "rajdhani-700.ttf"));
const body = readFileSync(join(FONTS, "inter.ttf"));

/** The neutral chrome accent. Team pages pass their club's colour instead. */
const DEFAULT_ACCENT = "#b89d7a";

/**
 * Satori has no CSS variables — it resolves `var(--rpl-accent)` to `initial`
 * and then throws on `borderTop: 10px solid initial`. `teamAccent()` returns
 * exactly that string for any club without its own colour (the Season 1 clubs
 * FWG/TD/TTT deliberately have none), so callers can hand us an unusable
 * value without meaning to. Anything that isn't a literal hex colour falls
 * back to the neutral accent.
 */
function safeAccent(accent: string | undefined): string {
  return accent && /^#[0-9a-f]{3,8}$/i.test(accent) ? accent : DEFAULT_ACCENT;
}

export interface CardOptions {
  /** Small label above the title — season, club, section. */
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** A club accent from teams.ts, or the neutral default. */
  accent?: string;
  /** Bottom line. Defaults to the bare domain. */
  footer?: string;
}

/**
 * Titles are free text — a recap headline can be a full sentence — so the
 * display size steps down with length rather than overflowing the card. A
 * 96-character headline already fills the frame at 92px, and headlines are
 * written without this constraint in mind, so this must not be removed.
 */
function titleSize(title: string): number {
  if (title.length <= 24) return 96;
  if (title.length <= 48) return 78;
  if (title.length <= 80) return 62;
  if (title.length <= 130) return 50;
  return 40;
}

/**
 * Satori supports a subset of CSS: flexbox only, and any element with more than
 * one child needs an explicit `display: flex`. Keep that in mind before editing
 * — a missing display is the usual cause of a card that renders as a single
 * overlapping blob.
 */
export function ogCard({
  eyebrow,
  title,
  subtitle,
  accent: rawAccent,
  footer,
}: CardOptions) {
  const accent = safeAccent(rawAccent);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#14110a",
          color: "#f5efe0",
          padding: "72px",
          borderTop: `10px solid ${accent}`,
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Rajdhani",
            fontSize: 26,
            letterSpacing: "0.18em",
            color: "#a89a7d",
          }}
        >
          {eyebrow.toUpperCase()}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Rajdhani",
              fontSize: titleSize(title),
              lineHeight: 1.06,
              letterSpacing: "0.01em",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                fontSize: 34,
                color: "#a89a7d",
                marginTop: 20,
                maxWidth: 980,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 24,
            color: "#6b6047",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: accent,
              marginRight: 14,
            }}
          />
          <div style={{ display: "flex" }}>
            {footer ?? "rpl-site.vercel.app"}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Rajdhani", data: display, weight: 700, style: "normal" },
        { name: "Inter", data: body, weight: 400, style: "normal" },
      ],
    }
  );
}
