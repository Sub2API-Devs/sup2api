/**
 * utils/pathPrefix.ts
 *
 * 2.1.316 新增：路径前缀判断（大小写感知）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (4), chunk-bk27acrr.js (1)
 * attribution: placement 5
 */
import { sep, relative, isAbsolute } from "path";
import { getPlatform } from "./platform.js";

//@ chunk-6vnxsn99.js:21142-21281 placement
function isPathUnder(e, n) {
  let r = n.endsWith(sep) ? n : n + sep;
  if (getPlatform() === "windows") return e.toLowerCase().startsWith(r.toLowerCase());
  return e.startsWith(r);
}
//@ chunk-6vnxsn99.js:21281-21392 placement
function isSameOrUnderPath(e, n) {
  if (getPlatform() === "windows") return e.toLowerCase() === n.toLowerCase() || isPathUnder(e, n);
  return e === n || isPathUnder(e, n);
}
//@ chunk-6vnxsn99.js:21392-21441 placement
function separatorForPath(e) {
  return e.startsWith("/") ? "/" : "\\";
}
//@ chunk-6vnxsn99.js:21441-21583 placement
function isPathWithinCaseAware(e, n, r) {
  let o = r ? e.toLowerCase() : e;
  let s = r ? n.toLowerCase() : n;
  if (o === s) return true;
  let a = separatorForPath(s);
  let u = s.endsWith(a) ? s : s + a;
  return o.startsWith(u);
}
//@ chunk-bk27acrr.js:248-347 placement
/**
 * isSubpathOf：relative() 判断 child 是否位于 parent 之下（相等时返回给定默认值）。
 */
function isSubpathOf(r, i, e) {
  let t = relative(r, i);
  if (t === "") return e;
  return t !== ".." && !t.startsWith(`..${sep}`) && !isAbsolute(t);
}
export { isSubpathOf, isPathWithinCaseAware, isPathUnder, isSameOrUnderPath };
