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
import { sep, sep as sep_2, sep as sep_3, sep as sep_4, relative, isAbsolute } from "path";
import { getPlatform } from "./platform.js";

//@ chunk-6vnxsn99.js:21142-21281 placement
function isPathUnder(e, n) {
  let r = n.endsWith(sep_2) ? n : n + sep_2;
  if (getPlatform() === "windows") return e.toLowerCase().startsWith(r.toLowerCase());
  return e.startsWith(r);
}
//@ chunk-6vnxsn99.js:21281-21392 placement
function isSameOrUnderPath(e, n) {
  if (getPlatform() === "windows") return e.toLowerCase() === n.toLowerCase() || isPathUnder(e, n);
  return e === n || isPathUnder(e, n);
}
//@ chunk-6vnxsn99.js:21392-21441 placement
function Zn(e) {
  return e.startsWith("/") ? "/" : "\\";
}
//@ chunk-6vnxsn99.js:21441-21583 placement
function isPathWithinCaseAware(e, n, r) {
  let o = r ? e.toLowerCase() : e,
    s = r ? n.toLowerCase() : n;
  if (o === s) return !0;
  let a = Zn(s),
    u = s.endsWith(a) ? s : s + a;
  return o.startsWith(u);
}
//@ chunk-bk27acrr.js:248-347 placement
function hm(r, i, e) {
  let t = relative(r, i);
  if (t === "") return e;
  return t !== ".." && !t.startsWith(`..${sep}`) && !isAbsolute(t);
}

export { hm, isPathWithinCaseAware, isPathUnder, isSameOrUnderPath };
