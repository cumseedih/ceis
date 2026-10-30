import { useEffect, useState } from "react";
import { api } from "../api";
import type { NudgesPolicy } from "../nudges";
import { DEFAULT_POLICY } from "../nudges";
import type { CloudConfig } from "../types";

export type { StarMoment } from "../nudges";

/**
 * The star-on-GitHub asks are switched off for wevvy: the nudge system stays in the
 * tree (the relay still publishes its policy, the ledger module is untouched) but no
 * ask is ever drawn. The names below keep the call sites compiling; each is a no-op.
 */

// ----------------------------------------------------------------------------- the moments
/** One more task finished in this browser; the count so far. */
export const countTask = (): number => 0;
/** The app was opened today (first time today → `fresh`); the count of days so far. */
export const countDay = (): { days: number; fresh: boolean } => ({ days: 0, fresh: false });

/** Still worth asking at this moment — never, while the asks are switched off. */
export const starDue = (_m: unknown, _n?: number): boolean => false;
/** The card was shown (or waved away): one ask, the cooldown starts. */
export const starShown = (_m: unknown, _n?: number): void => {};
/** Whether the person has starred. */
export const starred = (): boolean => false;

/** The star is done — a no-op while the asks are switched off. */
export const markStarred = (): void => {};

/** Off to GitHub — a no-op while the asks are switched off. */
export function openStar(_repoUrl?: string): void {}

/** The words for each moment — empty while the asks are switched off. */
export function starText(_t: unknown, _m: unknown, _n?: number): string {
  return "";
}

/**
 * The relay's public figures (relay 0.15, `/api/cloud/config`): the allowance a new account
 * gets, the invite bonus, the repository — read once per page load and shared, so the copy
 * prints what the relay's operator set today rather than a number baked into the build.
 * Empty until it answers, and from an older relay; callers keep their fallbacks.
 */
let cached: CloudConfig | null = null;
let pending: Promise<CloudConfig> | null = null;
export function useCloudConfig(): CloudConfig {
  const [cfg, setCfg] = useState<CloudConfig>(cached ?? {});
  useEffect(() => {
    if (cached) return;
    pending ??= api
      .cloudConfig()
      .then((c) => (cached = c && typeof c === "object" ? c : {}))
      .catch(() => (cached = {}));
    let live = true;
    pending.then((c) => live && setCfg(c));
    return () => {
      live = false;
    };
  }, []);
  return cfg;
}

/** The star card's sentence — empty while the asks are switched off. */
export function useStarSentence(_own: string): string {
  return "";
}

/** The star policy in force — the relay's defaults, while the asks are switched off. */
export function useStarPolicy(): { policy: NudgesPolicy; ready: boolean } {
  return { policy: DEFAULT_POLICY, ready: true };
}

/**
 * The star card — switched off: nothing is drawn.
 */
export function StarNudge(_props: { text: string; onDone: () => void; className?: string }) {
  return null;
}

/**
 * The card for a moment, shown once — switched off: nothing is drawn.
 */
export function StarNudgeOnce(_props: { moment: unknown; n?: number; text?: string; className?: string; due?: boolean }) {
  return null;
}

/**
 * The gate as a hook — switched off: the ask never opens.
 */
export function useStarAsk(_moment: unknown, _due = true, _n?: number): [boolean, (open: boolean) => void] {
  return [false, () => {}];
}
