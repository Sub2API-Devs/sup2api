/**
 * services/memorySync/pathScrub.ts
 *
 * 记忆路径清理（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (8)
 * attribution: placement 8
 */
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
} from "path";
import { escapeXmlControlChars } from "../../utils/permissions/checkRegistry.js";
import { partiallySanitizeUnicode } from "../../utils/sanitization.js";

/**
 * 构造 frontmatter 解析结果（原样内容、可选问题与绝对路径），以及只有问题的结果。
 */
//@ chunk-s61vbvea.js:90403-90574 placement
var buildFrontmatterResult = (e, n, r) => ({
    frontmatterAsWritten: e,
    ...(r !== void 0 && { frontmatterProblem: r }),
    ...(n !== void 0 && isAbsolute_3(n) && { path: n }),
  }),
  frontmatterProblemResult = (e) => ({ frontmatterAsWritten: {}, frontmatterProblem: e });
//@ chunk-s61vbvea.js:90574-90842 placement
function scrubMemoryKeys(e, n) {
  let r = { copies: new Map(), hasCollided: !1 },
    { frontmatterAsWritten: frontmatterAsWritten, asWrittenProblem: asWrittenProblem } = e,
    y,
    S;
  try {
    ((y = scrubObjectPaths(frontmatterAsWritten, r)), (S = asWrittenProblem && cu(asWrittenProblem)));
  } catch {
    return buildFrontmatterResult({}, n, "could not be scrubbed");
  }
  return r.hasCollided
    ? buildFrontmatterResult({}, n, "has two keys that read the same once scrubbed")
    : buildFrontmatterResult(y, n, S);
}
//@ chunk-s61vbvea.js:90842-90896 placement
var cu = (e) => escapeXmlControlChars(partiallySanitizeUnicode(e).replace(/[\u2028\u2029]/g, ""));
//@ chunk-s61vbvea.js:90896-91139 placement
function scrubValuePaths(e, n) {
  if (typeof e === "string") return cu(e);
  if (typeof e !== "object" || e === null) return e;
  let r = n.copies.get(e);
  if (r !== void 0) return r;
  if (!Array.isArray(e)) return scrubObjectPaths(e, n);
  let s = [];
  n.copies.set(e, s);
  for (let h of e) s.push(scrubValuePaths(h, n));
  return s;
}
//@ chunk-s61vbvea.js:91139-91358 placement
function scrubObjectPaths(e, n) {
  let r = {};
  n.copies.set(e, r);
  for (let [s, h] of Object.entries(e)) {
    let y = cu(s);
    ((n.hasCollided ||= Object.hasOwn(r, y)),
      Object.defineProperty(r, y, {
        value: scrubValuePaths(h, n),
        enumerable: !0,
        writable: !0,
        configurable: !0,
      }));
  }
  return r;
}
//@ chunk-s61vbvea.js:91656-91706 placement
var Ev = ["ELOOP", "ENXIO", "EISDIR"],
  JKo = new Set(Ev);
//@ chunk-s61vbvea.js:91706-91751 placement
function FX(e) {
  return e !== void 0 && JKo.has(e);
}
//@ chunk-s61vbvea.js:91751-91813 placement
function $Zn(e) {
  return e.code === "Failed" && FX(e.telemetryCode);
}

export { JKo, FX, $Zn, scrubMemoryKeys, buildFrontmatterResult, frontmatterProblemResult };
