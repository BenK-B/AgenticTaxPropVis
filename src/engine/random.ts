/** Returns a pseudo-random float in [0, 1). */
export type RNG = () => number;

/** Deterministic PRNG so a fixed seed reproduces an identical agent population/run. */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function uniform(rng: RNG, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Standard normal sample via Box-Muller, then scaled/shifted. */
export function gaussian(rng: RNG, mean = 0, stdev = 1): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stdev;
}

export function logNormal(rng: RNG, mu: number, sigma: number): number {
  return Math.exp(mu + gaussian(rng, 0, 1) * sigma);
}

export function weightedChoice<T extends string>(rng: RNG, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [key, w] of entries) {
    if (r < w) return key;
    r -= w;
  }
  return entries[entries.length - 1][0];
}

export function shuffle<T>(items: T[], rng: RNG): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
