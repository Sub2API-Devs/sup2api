/**
 * utils/taggedId.ts
 *
 * 带前缀的 ID 编码（UUID 转大整数等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/taggedId.ts
 * pieces: chunk-6mwt0myy.js (8)
 * attribution: placement 7, fingerprint 1
 */
import { truncateCodePoints } from "./stringUtils.js";

//@ chunk-6mwt0myy.js:635-655 placement
var sMt = 200,
  lMe = 128;
//@ chunk-6mwt0myy.js:655-751 placement
function xgs(e) {
  if (e.length <= sMt) return !1;
  let n = 0;
  for (let r of e) if ((n++, n > sMt)) return !0;
  return !1;
}
//@ chunk-6mwt0myy.js:751-819 placement
function Gbr(e) {
  return typeof e === "string" && xgs(e) ? truncateCodePoints(e, sMt) : void 0;
}
//@ chunk-6mwt0myy.js:819-1022 placement = countToolCallsSince (1)
function countToolCallsSince(e) {
  if (!Array.isArray(e)) return e;
  let n;
  return (
    e.forEach((r, t) => {
      if (!isObjectNonNull(r) || r.type !== "tool_use") return;
      let s = Gbr(r.name);
      if (s === void 0) return;
      ((n ??= e.slice()), (n[t] = { ...r, name: s }));
    }),
    n === void 0 ? e : n
  );
}
//@ chunk-6mwt0myy.js:1022-1073 placement
function isObjectNonNull(e) {
  return typeof e === "object" && e !== null;
}
/**
 * 记忆 id 格式。
 */
//@ chunk-6mwt0myy.js:1073-1110 placement
var MEMORY_ID_PATTERN = /^mem_[A-Za-z0-9_-]{1,120}$/;
//@ chunk-6mwt0myy.js:1110-1299 placement
function base58Encode(n_2) {
  let base = BigInt(58),
    fill = Array(22).fill("1"),
    t = 21,
    value = n_2;
  while (value > 0n) {
    let rem = Number(value % base);
    ((fill[t] = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[rem]),
      (value = value / base),
      t--);
  }
  return fill.join("");
}
//@ chunk-6mwt0myy.js:1299-1431 fingerprint = uuidToBigInt (1)
function uuidToBigInt(uuid) {
  let replaced = uuid.replaceAll("-", "");
  if (replaced.length !== 32) throw Error(`Invalid UUID hex length: ${replaced.length}`);
  return BigInt("0x" + replaced);
}

export { lMe, Gbr, sMt, countToolCallsSince, uuidToBigInt, base58Encode, MEMORY_ID_PATTERN, xgs };
