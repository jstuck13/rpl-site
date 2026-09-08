"use client";

import { useEffect, useState } from "react";
import type { SpotlightClip } from "@/lib/clips";

const INTERVAL_MS = 7000;

/**
 * The clip spotlight — one featured clip at a time, cycling.
 *
 * Laid out as two columns rather than a wide stage with the caption over the
 * image: RPL's clips are Shorts, so a 16:9 stage left the actual video as a
 * narrow strip surrounded by blur, and centred caption text landed on top of
 * the clip's own burned-in captions. The thumbnail keeps its real shape on one
 * side, the words get their own space on the other, and nothing overlaps.
 *
 * Same behaviour as the awards bug: rotation stays on because cycling is the
 * point, pauses on hover and keyboard focus, and every clip is reachable by
 * hand from the dots so nothing is only available on a timer.
 *
 * The pause handlers sit on the outer section, not the card — the dots are
 * siblings of the card, so handlers on the card alone would let the clip
 * rotate out from under someone who had tabbed to the dots to pick one.
 *
 * Thumbnails link out rather than embedding a player — an embed per clip would
 * pull third-party scripts onto the home page, and this panel's job is to send
 * people to the channel.
 *
 * Frames are stacked and cross-faded rather than swapped, so images are
 * already decoded when their turn comes. They're inert (`aria-hidden`, empty
 * alt); the single link wrapping the card always points at whichever clip is
 * showing, so there's exactly one focusable target however many are stacked.
 */
export function ClipSpotlight({
  clips,
  channel,
}: {
  clips: SpotlightClip[];
  channel: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || clips.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % clips.length),
      INTERVAL_MS
    );
    return () => clearInterval(timer);
  }, [paused, clips.length]);

  if (clips.length === 0) return null;

  const active = clips[index] ?? clips[0];

  return (
    <section
      className="clips"
      aria-label="Watch RPL"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="section__head">
        <h2 className="section__title">Watch</h2>
        {channel && (
          <a
            className="section__link"
            href={channel}
            target="_blank"
            rel="noopener noreferrer"
          >
            The channel →
          </a>
        )}
      </div>

      <div className="clips__stage">
        <a
          className="clips__card"
          href={active.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="clips__media">
            <span className="clips__frames" aria-hidden="true">
              {clips.map((clip, i) => (
                <span
                  key={clip.id}
                  className={`clips__frame${
                    i === index ? " clips__frame--on" : ""
                  }`}
                >
                  <img
                    className={`clips__shot${
                      clip.vertical ? " clips__shot--vertical" : ""
                    }`}
                    src={clip.thumbnail}
                    alt=""
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                </span>
              ))}
            </span>
            <span className="clips__play" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
                <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
              </svg>
            </span>
          </span>

          <span className="clips__body">
            <span className="clips__eyebrow">Latest from the channel</span>
            <span className="clips__title">{active.title}</span>
            {active.meta && <span className="clips__meta">{active.meta}</span>}
            <span className="clips__cta">
              Watch on YouTube →
              <span className="visually-hidden"> (opens in a new tab)</span>
            </span>
          </span>
        </a>
      </div>

      <div className="clips__dots">
        {clips.map((clip, i) => (
          <button
            key={clip.id}
            type="button"
            className={`clips__dot${i === index ? " clips__dot--on" : ""}`}
            aria-label={clip.title}
            aria-current={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
