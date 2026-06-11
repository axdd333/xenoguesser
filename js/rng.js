/* Xenoguesser :: deterministic RNG
 * A Worldseed must be reproducible. Same seed string -> same alien, forever.
 * mulberry32 PRNG fed by a 32-bit string hash (xfnv1a).
 */
(function (XG) {
  'use strict';

  function xfnv1a(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function RNG(seedStr) {
    const next = mulberry32(xfnv1a(String(seedStr)));
    return {
      // float in [0,1)
      float: next,
      // int in [min,max] inclusive
      int(min, max) {
        return min + Math.floor(next() * (max - min + 1));
      },
      // pick one element
      pick(arr) {
        return arr[Math.floor(next() * arr.length)];
      },
      // in-place-safe seeded shuffle (returns new array)
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      },
      // sample n distinct elements
      sample(arr, n) {
        return this.shuffle(arr).slice(0, n);
      },
      // jitter around a value
      jitter(scale) {
        return (next() - 0.5) * 2 * scale;
      },
    };
  }

  // A short human-pronounceable seed for sharing.
  function makeSeedWord(rng) {
    const c = 'bcdfghjklmnprstvxz';
    const v = 'aeiou';
    let s = '';
    for (let i = 0; i < 3; i++) {
      s += c[Math.floor(rng.float() * c.length)];
      s += v[Math.floor(rng.float() * v.length)];
    }
    return s.toUpperCase() + '-' + rng.int(100, 999);
  }

  XG.RNG = RNG;
  XG.makeSeedWord = makeSeedWord;
})(window.XG = window.XG || {});
