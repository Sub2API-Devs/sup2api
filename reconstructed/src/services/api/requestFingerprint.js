/**
 * services/api/requestFingerprint.ts
 *
 * 2.1.316 新增：请求指纹。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1fgvxqz2.js (4)
 * attribution: placement 4
 */

//@ chunk-1fgvxqz2.js:191-269 placement
/**
 * 导出函数 `canonicalFingerprint`：参数 n, { omitCacheControl: t = !1 } = {}，返回 (feedCanonicalJson(n, s, t), s.join(""))。
 */
function canonicalFingerprint(n, { omitCacheControl: t = false } = {}) {
  let s = [];
  feedCanonicalJson(n, s, t);
  return s.join("");
}
//@ chunk-1fgvxqz2.js:410-422 placement
/**
 * 请求指纹哈希分片阈值 64 KB：累积到该长度先 flush 一次。
 */
var FLUSH_THRESHOLD_CHARS = 65536;
//@ chunk-1fgvxqz2.js:422-700 placement
class HashFeeder {
  hashes;
  pieces = [];
  length = 0;
  constructor(hashes) {
    this.hashes = hashes;
  }
  push(n) {
    this.pieces.push(n);
    this.length += n.length;
    if (this.length >= FLUSH_THRESHOLD_CHARS) this.flush();
  }
  flush() {
    if (this.length === 0) return;
    let joined = this.pieces.join("");
    for (let hash of this.hashes) hash.update(joined);
    this.pieces.length = 0;
    this.length = 0;
  }
}
//@ chunk-1fgvxqz2.js:915-1596 placement
/**
 * 按排序后的键把值序列化为规范 JSON 片段喂给哈希；长字符串分段（不拆代理对），可省略 cache_control 并记录是否出现过。
 */
function feedCanonicalJson(value, feeder, omitCacheControl, stats) {
  if (typeof value === "string" && value.length > FLUSH_THRESHOLD_CHARS) {
    feeder.push('"');
    for (let r = 0; r < value.length;) {
      let min = Math.min(r + FLUSH_THRESHOLD_CHARS, value.length);
      let code = value.charCodeAt(min - 1);
      if (min < value.length && code >= 55296 && code <= 56319) min--;
      feeder.push(JSON.stringify(value.slice(r, min)).slice(1, -1));
      r = min;
    }
    feeder.push('"');
    return;
  }
  if (value === null || typeof value !== "object") {
    feeder.push(JSON.stringify(value) ?? "null");
    return;
  }
  if (Array.isArray(value)) {
    feeder.push("[");
    value.forEach((r, e) => {
      if (e > 0) feeder.push(",");
      feedCanonicalJson(r, feeder, omitCacheControl, stats);
    });
    feeder.push("]");
    return;
  }
  feeder.push("{");
  let i = true;
  for (let key of Object.keys(value).sort()) {
    let e = value[key];
    if (key === "cache_control" && stats !== undefined) stats.cacheControl = true;
    if (e === undefined || (omitCacheControl && key === "cache_control")) continue;
    if (!i) feeder.push(",");
    i = false;
    feeder.push(JSON.stringify(key));
    feeder.push(":");
    feedCanonicalJson(e, feeder, omitCacheControl, stats);
  }
  feeder.push("}");
}
export { canonicalFingerprint, HashFeeder, feedCanonicalJson };
