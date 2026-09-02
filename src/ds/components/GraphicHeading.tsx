export type GraphicHeadingSize = "sm" | "md" | "lg";

export interface GraphicHeadingProps {
  /** Uppercase gold kicker above the title. */
  eyebrow?: string;
  /** The headline, rendered in condensed display type, uppercased. */
  title: string;
  /** One supporting line under the title. */
  subtitle?: string;
  /** `left` (default) or `center`. */
  align?: "left" | "center";
  /** Type scale. `sm` for section headers, `lg` for hero graphics. */
  size?: GraphicHeadingSize;
  className?: string;
}

/**
 * A standalone eyebrow / title / subtitle block — the same header
 * GraphicFrame renders, usable on its own or as a section divider.
 */
export function GraphicHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  size = "md",
  className,
}: GraphicHeadingProps) {
  const classes = [
    "rpl-heading",
    `rpl-heading--${size}`,
    align === "center" && "rpl-heading--center",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {eyebrow && <div className="rpl-heading__eyebrow">{eyebrow}</div>}
      <h2 className="rpl-heading__title">{title}</h2>
      {subtitle && <p className="rpl-heading__subtitle">{subtitle}</p>}
    </div>
  );
}
