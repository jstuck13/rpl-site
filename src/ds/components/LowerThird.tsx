import type { CSSProperties } from "react";

export interface LowerThirdProps {
  /** The main line — a name, a call to action, a result. */
  primary: string;
  /** Supporting line under the primary. */
  secondary?: string;
  /** Small uppercase caption above the primary, e.g. `"Player Spotlight"`. */
  kicker?: string;
  /** Accent bar edge. Default `"left"`. */
  side?: "left" | "right";
  /** Accent color for the bar and kicker. Defaults to the neutral accent. */
  accent?: string;
  className?: string;
}

/**
 * A broadcast lower-third: a translucent dark plate with a colored accent bar,
 * a kicker, a primary line and an optional secondary line. Sits on live footage.
 */
export function LowerThird({
  primary,
  secondary,
  kicker,
  side = "left",
  accent,
  className,
}: LowerThirdProps) {
  const style = accent
    ? ({ "--rpl-lt-accent": accent } as CSSProperties)
    : undefined;

  const classes = [
    "rpl-lowerthird",
    side === "right" && "rpl-lowerthird--right",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} style={style}>
      <div className="rpl-lowerthird__accent" />
      <div className="rpl-lowerthird__body">
        {kicker && <div className="rpl-lowerthird__kicker">{kicker}</div>}
        <div className="rpl-lowerthird__primary">{primary}</div>
        {secondary && (
          <div className="rpl-lowerthird__secondary">{secondary}</div>
        )}
      </div>
    </div>
  );
}
