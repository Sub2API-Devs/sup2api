/**
 * utils/untrustedArray.ts
 *
 * 2.1.316 新增：安全读取不可信数组（异常访问、长度上限）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kev4jdty.js (3)
 * attribution: placement 3
 */
import { CLONE_DEPTH_THRESHOLD } from "./structuredCloneLimits.js";

//@ chunk-kev4jdty.js:227-293 placement
var Uf = Symbol("untrustedArray.unreadable"),
  E3 = "<unreadable list>";
/**
 * 安全复制不可信数组：读取失败的元素为 undefined；长度不可读或超出上限时返回 unreadable 标记，非数组为 undefined。
 */
//@ chunk-kev4jdty.js:293-524 placement
function readUntrustedArray(e) {
  let n;
  try {
    if (!Array.isArray(e)) return;
    n = e.length;
  } catch {
    return Uf;
  }
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0 || n > CLONE_DEPTH_THRESHOLD) return Uf;
  let u = [];
  for (let r = 0; r < n; r++) {
    let t;
    try {
      t = e[r];
    } catch {
      t = void 0;
    }
    u.push(t);
  }
  return u;
}
//@ chunk-kev4jdty.js:524-575 placement
function Eae(e) {
  let n = readUntrustedArray(e);
  return n === Uf ? void 0 : n;
}

export { Uf, E3, readUntrustedArray, Eae };
