/**
 * The auction draft, joined against current Player Value.
 *
 * `src/data/draft.json` is hand-maintained: auction prices are final the moment
 * the draft ends and never change, so there is nothing to regenerate. Everything
 * else here is derived from the tracker data, so the page moves on its own as
 * match days land.
 *
 * Two different numbers get confused constantly, so they are named apart:
 *
 *   premium  = paid - priorValue   what a club paid over (or under) the player's
 *                                  model value AT THE DRAFT. Fixed forever. A
 *                                  statement about the bidding, not the player.
 *   sinceDraft = playerValue - priorValue   how the player's own value has moved
 *                                  since the season started. Deliberately has
 *                                  NOTHING to do with what he cost: a player
 *                                  who was overpaid for and then played well
 *                                  should read as a riser, because he is one.
 *                                  Price belongs in `premium` and nowhere else.
 *
 * `priorValue` is the player's value at the moment of the auction, so
 * "since draft" is literally true — value at the draft vs. value now.
 */

import draft from "@/data/draft.json";
import { CURRENT_SEASON, getSeason, type Player } from "./data";
import { teamName } from "./teams";

export interface Pick {
  slug: string;
  paid: number;
  team: string;
  captain: boolean;
}

export interface DraftRow {
  pick: Pick;
  player: Player;
  teamName: string;
  /** paid - priorValue. Always meaningful; set at the draft and never moves. */
  premium: number | null;
  /**
   * playerValue - priorValue. Pure value movement, independent of price.
   * Reads as exactly 0 for a player who hasn't played, since nothing has
   * revalued him yet — that's a "no data" zero, which is why `played` exists.
   */
  sinceDraft: number | null;
  /** Has this player logged a game this season? */
  played: boolean;
  /** LLellum's value is a manual pin, so no delta on it means anything. */
  pinned: boolean;
}

export const SALARY_CAP: number = draft.salaryCap;
export const CAP_BASIS: string = draft.capBasis;
export const DRAFT_SEASON: number = draft.season;

/** Every pick, biggest gain since the draft first. Unplayed players sort last. */
export function draftBoard(season: number = CURRENT_SEASON): DraftRow[] {
  const players = new Map(getSeason(season).players.map((p) => [p.slug, p]));

  const rows = (draft.picks as Pick[]).flatMap((pick) => {
    const player = players.get(pick.slug);
    if (!player) return []; // a renamed slug shouldn't crash the build
    const now = player.valuation.playerValue;
    const played = (player.totals.games ?? 0) > 0;
    const pinned = player.status === "Exempt";
    return [
      {
        pick,
        player,
        teamName: teamName(pick.team),
        premium: player.priorValue === null ? null : pick.paid - player.priorValue,
        sinceDraft:
          now === null || pinned || player.priorValue === null
            ? null
            : now - player.priorValue,
        played,
        pinned,
      },
    ];
  });

  return rows.sort((a, b) => {
    if (a.played !== b.played) return a.played ? -1 : 1;
    return (b.sinceDraft ?? 0) - (a.sinceDraft ?? 0);
  });
}

export interface ClubSpend {
  code: string;
  name: string;
  spent: number;
  capLeft: number;
  /** What the three players were worth at the auction. */
  valueAtDraft: number;
  /** spent - valueAtDraft: the club's total overpay (or bargain) at the auction. */
  premium: number;
  /** Squad value now — the same three players, revalued. */
  valueNow: number;
  /** valueNow - valueAtDraft. Pure movement, independent of what was paid. */
  change: number;
  /**
   * Has this club played yet? Until it has, `change` is exactly 0 — nothing has
   * revalued anyone — which is a "no data" zero rather than "held steady". The
   * page tags these so an untouched club isn't read as a flat performance.
   */
  played: boolean;
}

/** Spend vs. what the squad is worth now, richest return first. */
export function clubSpend(season: number = CURRENT_SEASON): ClubSpend[] {
  const rows = draftBoard(season);
  const byClub = new Map<string, DraftRow[]>();
  for (const row of rows) {
    const list = byClub.get(row.pick.team) ?? [];
    list.push(row);
    byClub.set(row.pick.team, list);
  }

  return [...byClub.entries()]
    .map(([code, picks]) => {
      const spent = picks.reduce((sum, r) => sum + r.pick.paid, 0);
      const valueAtDraft = picks.reduce(
        (sum, r) => sum + (r.player.priorValue ?? 0),
        0
      );
      const valueNow = picks.reduce(
        (sum, r) => sum + (r.player.valuation.playerValue ?? 0),
        0
      );
      return {
        code,
        name: teamName(code),
        spent,
        capLeft: SALARY_CAP - spent,
        valueAtDraft,
        premium: spent - valueAtDraft,
        valueNow,
        change: valueNow - valueAtDraft,
        played: picks.some((r) => r.played),
      };
    })
    .sort((a, b) => b.change - a.change);
}

/**
 * The headline numbers. Risers and fallers are drawn only from players who have
 * actually played — an unplayed player's movement is 0 by construction and
 * would otherwise crowd out real ones.
 */
export function draftHeadlines(season: number = CURRENT_SEASON) {
  const rows = draftBoard(season).filter((r) => r.played && r.sinceDraft !== null);
  const byMove = [...rows].sort(
    (a, b) => (b.sinceDraft ?? 0) - (a.sinceDraft ?? 0)
  );
  const byPremium = [...draftBoard(season)]
    .filter((r) => !r.pick.captain && r.premium !== null)
    .sort((a, b) => (b.premium ?? 0) - (a.premium ?? 0));

  return {
    biggestRiser: byMove[0] ?? null,
    biggestFaller: byMove[byMove.length - 1] ?? null,
    biggestPremium: byPremium[0] ?? null,
    biggestBargain: byPremium[byPremium.length - 1] ?? null,
    totalSpent: draftBoard(season).reduce((s, r) => s + r.pick.paid, 0),
    playedCount: rows.length,
    totalCount: draftBoard(season).length,
  };
}
