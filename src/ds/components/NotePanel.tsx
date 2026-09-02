import type { ReactNode } from "react";

export type NotePanelTone = "neutral" | "gold";

export interface NotePanelProps {
  /** Small uppercase caption at the top of the panel, e.g. `"On the Bye"` or `"Injury Report"`. */
  kicker?: string;
  /** Optional larger heading under the kicker. */
  title?: string;
  /** Panel body — text, a row of TeamChips, a short list. */
  children?: ReactNode;
  /** `gold` tints the kicker and border; `neutral` (default) is a plain panel. */
  tone?: NotePanelTone;
  className?: string;
}

/**
 * A bordered aside for a single note on a graphic: byes, roster moves, an
 * injury report, a rules reminder, broadcast info. Kicker + optional title +
 * free content on the standard dark panel.
 */
export function NotePanel({
  kicker,
  title,
  children,
  tone = "neutral",
  className,
}: NotePanelProps) {
  const classes = [
    "rpl-note",
    tone === "gold" && "rpl-note--gold",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {kicker && <div className="rpl-note__kicker">{kicker}</div>}
      {title && <div className="rpl-note__title">{title}</div>}
      {children && <div className="rpl-note__body">{children}</div>}
    </div>
  );
}
