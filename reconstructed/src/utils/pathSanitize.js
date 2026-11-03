/**
 * utils/pathSanitize.ts
 *
 * 2.1.316 新增。路径清理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yr49hy5m.js (10)
 * attribution: placement 10
 */
import { posix } from "path";
import { Qn } from "./pathClassification.js";
import { ANY_CONTROL_CHAR_RE } from "./stringUtils.js";
import { Qg } from "./networkPaths.js";

/**
 * 空白、盲文空格、行间注释符、控制字符、组合标记与默认可忽略字符组成的字符类源码。
 */
//@ chunk-yr49hy5m.js:295-411 placement
var INVISIBLE_CHAR_CLASS = String.raw`\s\u2800\uFFF9-\uFFFB\p{Cc}\p{M}\p{Default_Ignorable_Code_Point}`,
  LEADING_INVISIBLE_PATTERN = new RegExp(`^[${INVISIBLE_CHAR_CLASS}]+`, "u");
//@ chunk-yr49hy5m.js:411-450 placement
function Ees(n) {
  return n.replace(LEADING_INVISIBLE_PATTERN, "");
}
//@ chunk-yr49hy5m.js:450-548 placement
function CQr(n, r = decodePercentEncoding(n)) {
  return Qn(n) || sRt(n) || ANY_CONTROL_CHAR_RE.test(r[0]) || r.map(Ees).some((e) => Qn(e) || sRt(e));
}
//@ chunk-yr49hy5m.js:548-564 placement
var u = /^\.\.\//;
//@ chunk-yr49hy5m.js:564-645 placement
function sRt(n) {
  return Qg(n) || Qg(posix.normalize(n).replace(u, "/")) || (escapesParentDir(n) && Qg("/" + n));
}
/**
 * （旧版名配错）规范化后是否跳出上级目录（.. 或 ../ 开头）。
 */
//@ chunk-yr49hy5m.js:645-717 placement = resolveCwdReentry (0.844)
function escapesParentDir(normalized) {
  let normalized_2 = posix.normalize(normalized);
  return normalized_2 === ".." || normalized_2.startsWith("../");
}
//@ chunk-yr49hy5m.js:717-781 placement
function ves(n) {
  let sliced = n.slice(7);
  return CQr(sliced) || CQr(sliced.slice(1));
}
//@ chunk-yr49hy5m.js:781-838 placement
var i = /(?:%[0-9A-Fa-f]{2}){1,512}/g,
  f = /^%[0-9A-Fa-f]{2}/;
/**
 * 解码路径中的 %XX：返回按 UTF-8 解码的结果与按 Latin-1 逐字节解码的结果两种形式。
 */
//@ chunk-yr49hy5m.js:838-1114 placement
function decodePercentEncoding(n) {
  if (!n.includes("%")) return [n, n];
  let textDecoder = new TextDecoder("utf-8", { fatal: !1, ignoreBOM: !0 });
  return [
    n.replace(i, (e, t) => {
      let o = t + e.length;
      return textDecoder.decode(s(e), { stream: f.test(n.slice(o, o + 3)) });
    }),
    n.replace(i, (e) => Array.from(s(e), (t) => String.fromCharCode(t)).join("")),
  ];
}
//@ chunk-yr49hy5m.js:1114-1194 placement
function s(n) {
  return Uint8Array.from(n.slice(1).split("%"), (r) => parseInt(r, 16));
}

export { sRt, ves, INVISIBLE_CHAR_CLASS, decodePercentEncoding, Ees, CQr };
