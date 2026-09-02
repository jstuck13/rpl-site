import type { ReactNode } from "react";

export type GraphicFrameSize =
  | "square"
  | "portrait"
  | "story"
  | "wide"
  | "auto";

export type GraphicFrameBodyAlign = "center" | "start" | "between";

export interface GraphicFrameProps {
  /** Artboard aspect. `square` 1080×1080, `portrait` 1080×1350, `story` 1080×1920, `wide` 1920×1080, `auto` grows with content. */
  size?: GraphicFrameSize;
  /** Small uppercase gold kicker above the title. Defaults to the league name. */
  eyebrow?: string;
  /** Main headline, rendered in condensed display type, uppercased. */
  title?: string;
  /** One supporting line under the title. */
  subtitle?: string;
  /** Uppercase caption strip along the bottom edge. */
  footer?: string;
  /**
   * How the body content sits in the canvas when it doesn't fill it.
   * `center` (default) keeps light content optically centered instead of
   * leaving a gap above the footer; `start` top-aligns it; `between` spreads
   * children edge to edge.
   */
  bodyAlign?: GraphicFrameBodyAlign;
  /** Drop the dark gradient + inset hairline so the graphic can sit on an OBS scene. */
  transparent?: boolean;
  /** The graphic content — rows, tiles, cards. */
  children?: ReactNode;
  className?: string;
}

const DEFAULT_EYEBROW = "Rocket Premier League";

/**
 * The branded canvas that wraps every static RPL graphic: dark gold-lit
 * gradient, inset hairline, and a standard eyebrow / title / subtitle header.
 * Light content is centered in the canvas by default (see `bodyAlign`).
 */
export function GraphicFrame({
  size = "square",
  eyebrow = DEFAULT_EYEBROW,
  title,
  subtitle,
  footer,
  bodyAlign = "center",
  transparent = false,
  children,
  className,
}: GraphicFrameProps) {
  const classes = [
    "rpl-frame",
    `rpl-frame--${size}`,
    `rpl-frame--body-${bodyAlign}`,
    transparent && "rpl-frame--transparent",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hasHeader = eyebrow || title || subtitle;

  return (
    <div className={classes}>
      {hasHeader && (
        <header className="rpl-frame__header">
          {eyebrow && <div className="rpl-frame__eyebrow">{eyebrow}</div>}
          {title && <h1 className="rpl-frame__title">{title}</h1>}
          {subtitle && <p className="rpl-frame__subtitle">{subtitle}</p>}
        </header>
      )}
      <div className="rpl-frame__body">{children}</div>
      {footer && <div className="rpl-frame__footer">{footer}</div>}
    </div>
  );
}
