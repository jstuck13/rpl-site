#!/usr/bin/env node
/**
 * Regenerate src/data/clips.json from the RPL YouTube channel's public RSS
 * feed. No API key and no OAuth — the feed is public and carries everything
 * the Watch panel needs: video ids, titles, publish dates, view counts, and
 * whether each upload is a Short.
 *
 * Ordering, which is the whole point of the script:
 *   1. the newest upload, always first — the panel should lead with what's new
 *   2. everything else by view count, descending — best-performing next
 *
 * Fails soft. If YouTube is unreachable, or the feed parses to zero entries,
 * the existing clips.json is left exactly as it is and the script exits 0.
 * The site's whole premise is that a broken external source can't take it
 * down, and that has to hold for a build step as much as for the tracker.
 *
 *   node scripts/fetch-clips.mjs
 *   npm run clips
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_PATH = path.join(process.cwd(), "src", "data", "clips.json");
const FEED = (id) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;

/** How many clips to keep. The panel shows fewer; the surplus is headroom. */
const LIMIT = 12;

/** Titles are already inside an RPL-branded panel, so the suffix is noise. */
const TITLE_SUFFIX = /\s*[|·-]\s*RPL\s*$/i;

function decodeEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&"); // last, so decoded text can't re-decode
}

function pick(block, pattern) {
  const match = block.match(pattern);
  return match ? match[1] : null;
}

/**
 * YouTube's feed is stable, machine-generated XML — a handful of anchored
 * patterns is more honest here than pulling in a parser dependency for five
 * fields.
 */
function parseEntries(xml) {
  const blocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  const entries = [];

  for (const block of blocks) {
    const id = pick(block, /<yt:videoId>([^<]+)<\/yt:videoId>/);
    const rawTitle = pick(block, /<media:title>([\s\S]*?)<\/media:title>/);
    const published = pick(block, /<published>([^<]+)<\/published>/);
    const href = pick(block, /<link rel="alternate" href="([^"]+)"/);
    const views = pick(block, /<media:statistics views="(\d+)"/);

    if (!id || !rawTitle) continue;

    const title = decodeEntities(rawTitle).replace(TITLE_SUFFIX, "").trim();
    if (!title) continue;

    entries.push({
      id,
      title,
      kind: href && href.includes("/shorts/") ? "short" : "video",
      date: published ? published.slice(0, 10) : undefined,
      publishedAt: published ? Date.parse(published) : 0,
      views: views ? Number(views) : 0,
    });
  }

  return entries;
}

/** Newest first, then everything else by views descending. */
function order(entries) {
  const byDate = [...entries].sort((a, b) => b.publishedAt - a.publishedAt);
  if (byDate.length <= 1) return byDate;
  const [newest, ...rest] = byDate;
  rest.sort((a, b) => b.views - a.views);
  return [newest, ...rest];
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf8");
  const current = JSON.parse(raw);

  const channelId = current.channelId;
  if (!channelId) {
    console.error(
      "clips: no channelId in src/data/clips.json — add the UC... id and rerun."
    );
    process.exitCode = 1;
    return;
  }

  let xml;
  try {
    const response = await fetch(FEED(channelId), {
      headers: { "user-agent": "rpl-site/fetch-clips" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    xml = await response.text();
  } catch (error) {
    console.warn(
      `clips: could not reach YouTube (${error.message}) — keeping the existing ${
        current.clips?.length ?? 0
      } clips.`
    );
    return;
  }

  const entries = parseEntries(xml);
  if (entries.length === 0) {
    console.warn(
      "clips: feed parsed to 0 entries — keeping the existing file. " +
        "If this repeats, the feed format has moved and the patterns need updating."
    );
    return;
  }

  const clips = order(entries)
    .slice(0, LIMIT)
    .map(({ id, title, kind, date }) => ({
      id,
      title,
      ...(kind === "video" ? { kind } : {}),
      ...(date ? { date } : {}),
    }));

  const next = {
    channel: current.channel,
    channelId,
    generatedAt: new Date().toISOString(),
    clips,
  };

  await writeFile(DATA_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  const lead = clips[0];
  console.log(
    `clips: wrote ${clips.length} — newest first ("${lead.title}"), rest by views.`
  );
}

main().catch((error) => {
  console.error(`clips: ${error.message}`);
  process.exitCode = 1;
});
