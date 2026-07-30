import type { Archetype } from '@/types';
import {
  FLASH_COLOR_AI_SHIELD,
  FLASH_COLOR_CRITICAL,
  FLASH_COLOR_FLIGHT,
  FLASH_COLOR_GOOD,
  FLASH_COLOR_NEUTRAL,
  FLASH_COLOR_WARNING,
} from '@/engine/constants';

export const ARCHETYPE_CSS_VAR: Record<Archetype, string> = {
  W2_Worker: '--archetype-w2',
  Freelancer: '--archetype-freelancer',
  Business_Owner: '--archetype-business',
  HNW_Investor: '--archetype-hnw',
};

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  W2_Worker: 'W-2 Worker',
  Freelancer: 'Freelancer',
  Business_Owner: 'Business Owner',
  HNW_Investor: 'HNW Investor',
};

/**
 * Maps the engine's semantic flash-color keys to actual theme CSS variable names — matching
 * the same colors BehaviorLogFeed uses for each kind, so the canvas and the Inspector's log
 * speak a consistent visual language for the same event.
 */
export const FLASH_COLOR_CSS_VAR: Record<string, string> = {
  [FLASH_COLOR_CRITICAL]: '--status-critical',
  [FLASH_COLOR_NEUTRAL]: '--series-gini',
  [FLASH_COLOR_WARNING]: '--status-warning',
  [FLASH_COLOR_AI_SHIELD]: '--series-avoided',
  [FLASH_COLOR_FLIGHT]: '--series-flight',
  [FLASH_COLOR_GOOD]: '--status-good',
};

/** For DOM style attributes (e.g. `accent-color`), where var() is resolved by the browser itself. */
export function cssVar(name: string): string {
  return `var(${name})`;
}

const resolvedCache = new Map<string, string>();

// getComputedStyle forces a style recalc — cheap once, but expensive enough that calling it
// every animation frame (as an earlier version of this cache did, keyed per-frame) visibly
// tanked FPS. These ~9 colors only actually change when the OS light/dark preference flips,
// so cache indefinitely and invalidate only on that event.
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => resolvedCache.clear());
}

/** Resolves a bare CSS custom property name (e.g. "--archetype-w2") to its current computed color. */
export function resolveColorVar(name: string): string {
  const cached = resolvedCache.get(name);
  if (cached) return cached;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const resolved = value || '#888888';
  resolvedCache.set(name, resolved);
  return resolved;
}
