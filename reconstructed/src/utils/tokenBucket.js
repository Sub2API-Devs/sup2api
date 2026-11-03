/**
 * utils/tokenBucket.ts
 *
 * 2.1.316 新增。创建令牌桶限流器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7y5e5tys.js (2)
 * attribution: placement 2
 */
//@ chunk-7y5e5tys.js:191-211 placement
var BUCKET_CAPACITY = 10;
var TOKEN_REFILL_MS = 2000;
//@ chunk-7y5e5tys.js:211-473 placement
/**
 * 创建令牌桶限流器。
 */
function createTokenBucket(m, n, now = Date.now) {
  let e = m;
  let o = now();
  function r() {
    let k = now();
    let floored = Math.floor((k - o) / n);
    if (floored > 0) {
      e = Math.min(m, e + floored);
      o += floored * n;
    }
  }
  return {
    tryConsume() {
      r();
      if (e > 0) {
        e--;
        return true;
      }
      return false;
    },
    tokens() {
      r();
      return e;
    },
    msUntilToken() {
      r();
      if (e > 0) return 0;
      return Math.max(0, o + n - now());
    },
  };
}
export { createTokenBucket, BUCKET_CAPACITY, TOKEN_REFILL_MS };
