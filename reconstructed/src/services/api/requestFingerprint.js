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
function Xq(n, { omitCacheControl: t = !1 } = {}) {
  let s = [];
  return (feedCanonicalJson(n, s, t), s.join(""));
}
//@ chunk-1fgvxqz2.js:410-422 placement
var c = 65536;
//@ chunk-1fgvxqz2.js:422-700 placement
class HashFeeder {
  hashes;
  pieces = [];
  length = 0;
  constructor(n) {
    this.hashes = n;
  }
  push(n) {
    if ((this.pieces.push(n), (this.length += n.length), this.length >= c)) this.flush();
  }
  flush() {
    if (this.length === 0) return;
    let joined = this.pieces.join("");
    for (let hashe of this.hashes) hashe.update(joined);
    ((this.pieces.length = 0), (this.length = 0));
  }
}
/**
 * 按排序后的键把值序列化为规范 JSON 片段喂给哈希；长字符串分段（不拆代理对），可省略 cache_control 并记录是否出现过。
 */
//@ chunk-1fgvxqz2.js:915-1596 placement
function feedCanonicalJson(value, feeder, omitCacheControl, stats) {
  if (typeof value === "string" && value.length > c) {
    feeder.push('"');
    for (let r = 0; r < value.length;) {
      let min = Math.min(r + c, value.length),
        code = value.charCodeAt(min - 1);
      if (min < value.length && code >= 55296 && code <= 56319) min--;
      (feeder.push(JSON.stringify(value.slice(r, min)).slice(1, -1)), (r = min));
    }
    feeder.push('"');
    return;
  }
  if (value === null || typeof value !== "object") {
    feeder.push(JSON.stringify(value) ?? "null");
    return;
  }
  if (Array.isArray(value)) {
    (feeder.push("["),
      value.forEach((r, e) => {
        if (e > 0) feeder.push(",");
        feedCanonicalJson(r, feeder, omitCacheControl, stats);
      }),
      feeder.push("]"));
    return;
  }
  feeder.push("{");
  let i = !0;
  for (let r of Object.keys(value).sort()) {
    let e = value[r];
    if (r === "cache_control" && stats !== void 0) stats.cacheControl = !0;
    if (e === void 0 || (omitCacheControl && r === "cache_control")) continue;
    if (!i) feeder.push(",");
    ((i = !1),
      feeder.push(JSON.stringify(r)),
      feeder.push(":"),
      feedCanonicalJson(e, feeder, omitCacheControl, stats));
  }
  feeder.push("}");
}

export { Xq, HashFeeder, feedCanonicalJson };
