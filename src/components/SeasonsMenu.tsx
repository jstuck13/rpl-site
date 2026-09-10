"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface SeasonsMenuItem {
  href: string;
  label: string;
}

/**
 * The "Seasons" nav dropdown.
 *
 * WHY THIS IS A CLIENT COMPONENT — do not revert it to CSS-only.
 * It used to open purely on `:hover` and `:focus-within`, which works on a
 * mouse and fails on a phone in a specific, reported way: the menu opens on
 * tap (mobile browsers emulate hover for the tapped element) and then **cannot
 * be closed by tapping the trigger again**, because that second tap re-asserts
 * the very state that is holding it open. The sticky state only clears by
 * tapping something else. Jacob hit exactly this on 2026-09-10.
 *
 * That matters more here than it would elsewhere: this menu is the only route
 * to seven of the site's pages, and the audience is overwhelmingly on a phone
 * following a Discord link — traffic the Open Graph cards were added to
 * increase.
 *
 * So open/closed is now a single piece of React state, and CSS renders that
 * state (`[data-open="true"]`) rather than deciding it. One source of truth,
 * identical behaviour on touch, mouse and keyboard.
 *
 * THE HOVER HANDLERS ARE GATED ON PURPOSE. Attaching them unconditionally
 * would BREAK touch worse than the original bug: a tap fires a synthetic
 * `mouseenter` *before* `click`, so the sequence would be open-then-toggle-
 * closed and the menu would never appear. They are only attached on devices
 * that genuinely hover with a fine pointer, which is why `hoverCapable` is
 * resolved in an effect (it must be false during SSR and first paint).
 */
export function SeasonsMenu({
  currentSeason,
  currentSeasonNav,
  pastSeasons,
}: {
  currentSeason: number;
  currentSeasonNav: SeasonsMenuItem[];
  pastSeasons: SeasonsMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setHoverCapable(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Tap/click anywhere else, or Escape, closes it. `pointerdown` rather than
  // `click` so the menu is gone before the tap lands on whatever is beneath —
  // otherwise the first tap outside is spent only on closing.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const items: Array<SeasonsMenuItem | { heading: string; past?: boolean }> = [
    { heading: `Season ${currentSeason}` },
    ...currentSeasonNav,
    { heading: "Past", past: true },
    ...pastSeasons,
  ];

  return (
    <div
      ref={root}
      className="site-nav__dropdown"
      data-open={open ? "true" : "false"}
      onMouseEnter={hoverCapable ? () => setOpen(true) : undefined}
      onMouseLeave={hoverCapable ? () => setOpen(false) : undefined}
      // Tabbing past the last link leaves the menu; close it behind them.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="site-nav__dropdown-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="seasons-menu"
        // On a mouse the menu is ALREADY open by the time a click can land —
        // you cannot click without hovering first — so a plain toggle here
        // would read as "clicking Seasons closes Seasons", and it would then
        // stay shut while the pointer sat on it. So a mouse click only
        // asserts open; leaving, Escape, an outside click or picking a link
        // are what close it. Touch and keyboard get the real toggle, which is
        // the whole point of this component. `detail === 0` is how a
        // keyboard-activated click identifies itself.
        onClick={(event) => {
          const fromKeyboard = event.detail === 0;
          if (fromKeyboard || !hoverCapable) setOpen((wasOpen) => !wasOpen);
          else setOpen(true);
        }}
      >
        Seasons
        <span className="site-nav__caret" aria-hidden="true" />
      </button>
      <div className="site-nav__dropdown-menu" id="seasons-menu">
        {items.map((item) =>
          "heading" in item ? (
            <p
              key={item.heading}
              className={
                item.past
                  ? "site-nav__dropdown-heading site-nav__dropdown-heading--past"
                  : "site-nav__dropdown-heading"
              }
            >
              {item.heading}
            </p>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className="site-nav__dropdown-link"
              // The layout persists across navigation, so without this the
              // menu would still be open on the page you just opened.
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          )
        )}
      </div>
    </div>
  );
}
