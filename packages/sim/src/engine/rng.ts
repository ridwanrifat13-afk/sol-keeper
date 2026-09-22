/**
 * Seeded, serialisable randomness (brief rule 2).
 *
 * `Math.random` is banned in packages/sim. Everything stochastic draws from here, and the
 * generator's whole state lives inside `SimState`, so a saved state replays exactly.
 *
 * Randomness is partitioned into **named streams**. Each stream is seeded independently
 * from (seed, name), so adding a draw inside the failures model cannot shift the numbers
 * the weather model sees. Without this, any change to one model silently invalidates every
 * saved run — which would make the Black Box debrief untrustworthy across builds.
 */

export interface Sfc32State {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface RngState {
  readonly seed: number;
  /** Per-stream generator state, keyed by stream name. Created on first use. */
  streams: Record<string, Sfc32State>;
}

/** Stream names used by the models. Kept as a union so a typo cannot silently fork a stream. */
export type StreamName = "failures" | "weather" | "hazards" | "crew" | "crops" | "incidents";

export function createRngState(seed: number): RngState {
  return { seed, streams: {} };
}

/**
 * FNV-1a over the stream name, mixed with the run seed. Any stable hash works; this one is
 * short, dependency-free and avoids the clustering you get from `seed + index`.
 */
function seedStream(seed: number, name: string): Sfc32State {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h = (h ^ (seed >>> 0)) >>> 0;

  // Expand the 32-bit hash into four words with splitmix32.
  const next = (): number => {
    h = (h + 0x9e3779b9) >>> 0;
    let z = h;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    return (z ^ (z >>> 15)) >>> 0;
  };
  return { a: next(), b: next(), c: next(), d: next() };
}

/** sfc32 — small, fast, and passes PractRand well beyond anything a game needs. */
function sfc32(s: Sfc32State): number {
  const t = (((s.a + s.b) >>> 0) + s.d) >>> 0;
  s.d = (s.d + 1) >>> 0;
  s.a = s.b ^ (s.b >>> 9);
  s.b = (s.c + (s.c << 3)) >>> 0;
  s.c = ((s.c << 21) | (s.c >>> 11)) >>> 0;
  s.c = (s.c + t) >>> 0;
  return t / 4294967296;
}

export interface Stream {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Uniform pick; returns undefined only for an empty list. */
  pick<T>(items: readonly T[]): T | undefined;
}

/**
 * A view over the generator state held in `SimState`. Transient — created per tick, never
 * stored — while the numbers it advances persist in the state it was built from.
 */
export class Rng {
  constructor(private readonly state: RngState) {}

  stream(name: StreamName): Stream {
    let s = this.state.streams[name];
    if (s === undefined) {
      s = seedStream(this.state.seed, name);
      this.state.streams[name] = s;
    }
    const st = s;
    return {
      next: () => sfc32(st),
      range: (min, max) => min + sfc32(st) * (max - min),
      int: (maxExclusive) => Math.floor(sfc32(st) * maxExclusive),
      chance: (p) => sfc32(st) < p,
      pick: <T>(items: readonly T[]): T | undefined =>
        items.length === 0 ? undefined : items[Math.floor(sfc32(st) * items.length)],
    };
  }
}
