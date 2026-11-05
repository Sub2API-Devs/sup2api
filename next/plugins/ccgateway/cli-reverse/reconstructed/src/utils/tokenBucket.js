/**
 * utils/tokenBucket.ts
 *
 * 2.1.316 新增。创建令牌桶限流器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-13ssh9m2.js (2)
 * attribution: placement 2
 */
//@ chunk-13ssh9m2.js:191-211 placement
var BUCKET_CAPACITY = 10;
var TOKEN_REFILL_MS = 2000;
//@ chunk-13ssh9m2.js:211-473 placement
/**
 * 创建令牌桶限流器。
 */
function createTokenBucket(capacity, msPerToken, now = Date.now) {
  let tokens = capacity;
  let lastRefill = now();
  function refill() {
    let now_2 = now();
    let floored = Math.floor((now_2 - lastRefill) / msPerToken);
    if (floored > 0) {
      tokens = Math.min(capacity, tokens + floored);
      lastRefill += floored * msPerToken;
    }
  }
  return {
    tryConsume() {
      refill();
      if (tokens > 0) {
        tokens--;
        return true;
      }
      return false;
    },
    tokens() {
      refill();
      return tokens;
    },
    msUntilToken() {
      refill();
      if (tokens > 0) return 0;
      return Math.max(0, lastRefill + msPerToken - now());
    },
  };
}
export { createTokenBucket, BUCKET_CAPACITY, TOKEN_REFILL_MS };
