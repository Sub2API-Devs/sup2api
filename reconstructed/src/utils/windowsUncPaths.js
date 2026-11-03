/**
 * utils/windowsUncPaths.ts
 *
 * Windows UNC 长路径（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aat7wt0p.js (11)
 * attribution: placement 11
 */
import { realpathSync, realpath } from "fs";
import { iM, bt } from "./fsJunctions.js";
import { Qn, cl } from "./pathClassification.js";
import { isWslUncPath } from "./networkPaths.js";

/**
 * 返回路径中第一个通配字符（*、?、成对的 [）的位置，没有则为 -1。
 */
//@ chunk-aat7wt0p.js:11254-11391 placement
function firstGlobCharIndex(t) {
  for (let n = 0; n < t.length; n++) {
    let e = t[n];
    if (e === "*" || e === "?") return n;
    if (e === "[" && t.indexOf("]", n + 1) !== -1) return n;
  }
  return -1;
}
//@ chunk-aat7wt0p.js:11391-11541 placement
function toUncLongPath(t) {
  if (t.startsWith("\\\\?\\UNC\\")) return "\\\\" + t.slice(8);
  if (t.startsWith("\\\\?\\") && t.length >= 7 && t[5] === ":") return t.slice(4);
  return t;
}
/**
 * 对 Windows 设备/长路径形式反复去掉 \\?\ 等前缀并合并开头的重复分隔符，得到普通路径。
 */
//@ chunk-aat7wt0p.js:11541-11834 placement
function stripLongPathPrefixes(t) {
  if (isWindowsDevicePath(t)) {
    let replaced = toUncLongPath(t).replace(/^([\\/])[\\/]+/, "$1");
    for (let e = 0; e < Lt && iM(replaced); e++) {
      replaced = bt(replaced).replace(/^([\\/])[\\/]+/, "$1");
      let r = 1;
      while (
        replaced[r] === "?" &&
        replaced[r + 1] === "?" &&
        (r + 2 === replaced.length || et(replaced[r + 2]))
      ) {
        r += 3;
        while (et(replaced[r])) r++;
      }
      replaced = replaced.slice(0, 1) + replaced.slice(r);
    }
    return iM(replaced) ? replaced.slice(0, 1) : replaced;
  }
  return t;
}
//@ chunk-aat7wt0p.js:11834-11843 placement
var Lt = 4;
//@ chunk-aat7wt0p.js:11843-11883 placement
function et(t) {
  return t === "\\" || t === "/";
}
/**
 * 判断路径是否为 Windows 设备命名空间形式（卷 GUID、\\?\ 或 \\.\ 前缀等）。
 */
//@ chunk-aat7wt0p.js:11883-12019 placement
function isWindowsDevicePath(t) {
  if (/^\\\\\?\\volume\{/i.test(t)) return rt(t);
  if (iM(t)) return !0;
  let n = toUncLongPath(t);
  if (n !== t && rt(n)) return !0;
  return Qn(n) && !isWslUncPath(n);
}
//@ chunk-aat7wt0p.js:12019-12064 placement
function rt(t) {
  return cl(t) || t.includes("/");
}
//@ chunk-aat7wt0p.js:12064-12125 placement
function Tm(t) {
  try {
    return toUncLongPath(realpathSync.native(t));
  } catch {
    return null;
  }
}
/**
 * 异步取原生 realpath 并转为长路径形式，失败返回 null。
 */
//@ chunk-aat7wt0p.js:12125-12231 placement
async function realpathNativeAsync(t) {
  return new Promise((n) => {
    try {
      realpath.native(t, (e, r) => {
        n(e ? null : toUncLongPath(r));
      });
    } catch {
      n(null);
    }
  });
}
//@ chunk-aat7wt0p.js:12231-12282 placement
function bLi(t) {
  try {
    return realpathSync(t);
  } catch {
    return null;
  }
}
//@ chunk-aat7wt0p.js:12282-12312 placement
var Ct = 4,
  N = 50,
  Muo = N * (Ct - 1),
  ot;

export {
  Tm,
  toUncLongPath,
  realpathNativeAsync,
  isWindowsDevicePath,
  firstGlobCharIndex,
  stripLongPathPrefixes,
  N,
  bLi,
  Muo,
};
