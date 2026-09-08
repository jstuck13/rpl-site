import { formatDate } from "@/lib/recaps";
import clipsFile from "@/data/clips.json";

/**
 * A clip is a YouTube video id and a title. Everything else — the watch URL,
 * the thumbnail, the frame orientation — is derived, so adding a clip is a
 * two-field edit and there's nothing to get out of sync.
 */
export interface Clip {
  /** YouTube video id. The 11-character one, not the full URL. */
  id: string;
  title: string;
  /** Defaults to "short" — that's what RPL makes. */
  kind?: ClipKind;
  /** ISO date, e.g. "2026-09-01". Optional. */
  date?: string;
  /** Match day this came from, if it came from one. Optional. */
  matchDay?: number;
}

export type ClipKind = "short" | "video";

export interface ClipsFile {
  channel: string;
  /** UC... id, used by scripts/fetch-clips.mjs to find the RSS feed. */
  channelId?: string;
  /** Stamped by the fetch script. Not rendered — just provenance. */
  generatedAt?: string;
  clips: Clip[];
}

/** Display-ready shape handed to the client component. */
export interface SpotlightClip {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  meta: string;
  /**
   * Shorts thumbnails arrive 4:3 with the vertical frame pillarboxed inside;
   * landscape ones arrive 4:3 letterboxed. The CSS crops the bars off, and
   * this is what tells it which way to crop.
   */
  vertical: boolean;
}

const file = clipsFile as ClipsFile;

function metaFor(clip: Clip): string {
  const parts: string[] = [];
  if (typeof clip.matchDay === "number") parts.push(`Match Day ${clip.matchDay}`);
  if (clip.date) parts.push(formatDate(clip.date));
  return parts.join(" · ");
}

export function clipChannel(): string {
  return file.channel ?? "";
}

/**
 * Clips ready to render, in the order they appear in `clips.json`.
 *
 * Order is deliberately NOT computed — it's whatever order the file is in, so
 * put the clip you most want seen first. Sorting by date would bury a great
 * old clip under a mediocre new one, and this panel exists to show off.
 *
 * A clip with no id is dropped rather than rendered as a broken image; the
 * whole section hides itself when nothing survives.
 */
export function spotlightClips(limit = 6): SpotlightClip[] {
  const list = file.clips ?? [];
  return list
    .filter((clip) => Boolean(clip.id))
    .slice(0, limit)
    .map((clip) => {
      const short = clip.kind !== "video";
      return {
        id: clip.id,
        title: clip.title,
        url: short
          ? `https://www.youtube.com/shorts/${clip.id}`
          : `https://www.youtube.com/watch?v=${clip.id}`,
        thumbnail: `https://i.ytimg.com/vi/${clip.id}/hqdefault.jpg`,
        meta: metaFor(clip),
        vertical: short,
      } satisfies SpotlightClip;
    });
}
