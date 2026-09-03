"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Award } from "@/lib/awards";

const INTERVAL_MS = 6000;

/**
 * The awards ticker — a broadcast-style news bug that cycles the four races.
 *
 * Cycling is the whole point, so the rotation itself stays on for everyone; it
 * pauses while the reader is hovering or tabbing through it, and the crossfade
 * is dropped for anyone who asked for reduced motion. Every race is reachable
 * by hand from the dots, so nothing here is only available on a timer.
 */
export function AwardsBug({
  awards,
  through,
}: {
  awards: Award[];
  through: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || awards.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % awards.length),
      INTERVAL_MS
    );
    return () => clearInterval(timer);
  }, [paused, awards.length]);

  if (awards.length === 0) return null;

  const award = awards[index] ?? awards[0];
  const tie = award.holders.length > 1;

  return (
    <section
      className="awards-bug"
      aria-label="Award races"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="awards-bug__rail">
        <p className="awards-bug__eyebrow">
          {award.name}
          <span className="awards-bug__basis"> · {award.basis}</span>
        </p>

        {/* Keyed so each race animates in rather than mutating in place. */}
        <div className="awards-bug__body" key={award.key}>
          <p className="awards-bug__value">{award.value}</p>
          <p className="awards-bug__holders">
            {tie && (
              <span className="awards-bug__tie">
                {award.holders.length}-way tie ·{" "}
              </span>
            )}
            {award.holders.map((holder, i) => (
              <span key={holder.slug}>
                {i > 0 && <span className="awards-bug__sep"> · </span>}
                <Link href={`/players/${holder.slug}`}>{holder.name}</Link>
              </span>
            ))}
          </p>
        </div>

        <p className="awards-bug__through">{through}</p>
      </div>

      <div className="awards-bug__dots">
        {awards.map((item, i) => (
          <button
            key={item.key}
            type="button"
            className={`awards-bug__dot${
              i === index ? " awards-bug__dot--on" : ""
            }`}
            aria-label={item.name}
            aria-current={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
