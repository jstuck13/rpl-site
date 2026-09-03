"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LowerThird } from "@/ds/components/LowerThird";
import type { Award } from "@/lib/awards";

const DEFAULT_INTERVAL_S = 6;
/** How long the plate spends animating out before the next one animates in. */
const EXIT_MS = 500;

type Position = "bottom-left" | "bottom-right" | "top-left" | "top-right";

const POSITIONS: Position[] = [
  "bottom-left",
  "bottom-right",
  "top-left",
  "top-right",
];

interface Settings {
  intervalMs: number;
  position: Position;
  scale: number;
}

const DEFAULTS: Settings = {
  intervalMs: DEFAULT_INTERVAL_S * 1000,
  position: "bottom-left",
  scale: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Settings come off the query string so the overlay can be re-aimed from OBS
 * without a redeploy — the Browser Source URL is the only thing Jacob can edit
 * mid-broadcast. Anything unreadable falls back to the default rather than
 * breaking the graphic on air.
 */
function readSettings(params: URLSearchParams): Settings {
  const seconds = Number(params.get("interval"));
  const scale = Number(params.get("scale"));
  const position = params.get("position") as Position | null;

  return {
    intervalMs: Number.isFinite(seconds) && seconds > 0
      ? clamp(seconds, 2, 120) * 1000
      : DEFAULTS.intervalMs,
    position:
      position && POSITIONS.includes(position) ? position : DEFAULTS.position,
    scale: Number.isFinite(scale) && scale > 0 ? clamp(scale, 0.5, 3) : DEFAULTS.scale,
  };
}

/**
 * The awards cycler as broadcast furniture — a lower third that rotates the
 * four races, for use as an OBS Browser Source over gameplay.
 *
 * Unlike the home page bug this has no controls at all: nobody can hover a
 * stream overlay. Reading the query string is what makes this a client
 * component, so the page wraps it in a Suspense boundary and stays static.
 */
export function AwardsOverlay({ awards }: { awards: Award[] }) {
  const params = useSearchParams();
  const settings = useMemo(
    () => readSettings(new URLSearchParams(params.toString())),
    [params]
  );

  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    if (awards.length < 2) return;
    const out = setTimeout(
      () => setShown(false),
      settings.intervalMs - EXIT_MS
    );
    const next = setTimeout(() => {
      setIndex((i) => (i + 1) % awards.length);
      setShown(true);
    }, settings.intervalMs);
    return () => {
      clearTimeout(out);
      clearTimeout(next);
    };
  }, [index, settings.intervalMs, awards.length]);

  if (awards.length === 0) return null;

  const award = awards[index] ?? awards[0];
  const holders = award.holders.map((h) => h.name).join(" · ");
  const secondary =
    award.holders.length > 1
      ? `${award.holders.length}-way tie · ${holders}`
      : holders;

  return (
    <div
      className={`overlay overlay--${settings.position}`}
      style={{ ["--overlay-scale" as string]: settings.scale }}
    >
      <div className={`overlay__item${shown ? " overlay__item--in" : ""}`}>
        <LowerThird
          kicker={award.name}
          primary={award.value}
          secondary={secondary}
          side={settings.position.endsWith("right") ? "right" : "left"}
          accent="var(--rpl-gold)"
        />
      </div>
    </div>
  );
}
