// A tiny seeded random generator (mulberry32). The game seeds it from the
// clock for real play, and the screenshot poses seed it with a fixed number
// so a posed scene is the same every time it is rendered.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random float in [low, high) drawn from rng. */
export function range(rng, low, high) {
  return low + rng() * (high - low);
}

/** A random integer in [low, high] drawn from rng. */
export function rangeInt(rng, low, high) {
  return Math.floor(range(rng, low, high + 1));
}

/** The shortest signed distance from angle a to angle b, in (-PI, PI]. */
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
