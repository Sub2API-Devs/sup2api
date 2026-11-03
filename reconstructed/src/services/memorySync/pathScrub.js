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
import { isAbsolute } from "path";
import { escapeXmlControlChars } from "../../utils/permissions/checkRegistry.js";
import { partiallySanitizeUnicode } from "../../utils/sanitization.js";

//@ chunk-s61vbvea.js:90403-90574 placement
/**
 * 构造 frontmatter 解析结果（原样内容、可选问题与绝对路径），以及只有问题的结果。
 */
var buildFrontmatterResult = (frontmatterAsWritten, n, asWrittenProblem) => ({
  frontmatterAsWritten,
  ...(asWrittenProblem !== undefined && {
    frontmatterProblem: asWrittenProblem,
  }),
  ...(n !== undefined &&
    isAbsolute(n) && {
      path: n,
    }),
});
var frontmatterProblemResult = (frontmatterProblem) => ({
  frontmatterAsWritten: {},
  frontmatterProblem,
});
//@ chunk-s61vbvea.js:90574-90842 placement
function scrubMemoryKeys(frontmatter, n) {
  let r = {
    copies: new Map(),
    hasCollided: false,
  };
  let { frontmatterAsWritten, asWrittenProblem } = frontmatter;
  let y;
  let S;
  try {
    y = scrubObjectPaths(frontmatterAsWritten, r);
    S = asWrittenProblem && scrubString(asWrittenProblem);
  } catch {
    return buildFrontmatterResult({}, n, "could not be scrubbed");
  }
  return r.hasCollided
    ? buildFrontmatterResult({}, n, "has two keys that read the same once scrubbed")
    : buildFrontmatterResult(y, n, S);
}
//@ chunk-s61vbvea.js:90842-90896 placement
/**
 * 清洗字符串里的 U+2028/2029 并做 Unicode 部分清洗。
 */
var scrubString = (e) => escapeXmlControlChars(partiallySanitizeUnicode(e).replace(/[\u2028\u2029]/g, ""));
//@ chunk-s61vbvea.js:90896-91139 placement
function scrubValuePaths(e, n) {
  if (typeof e === "string") return scrubString(e);
  if (typeof e !== "object" || e === null) return e;
  let r = n.copies.get(e);
  if (r !== undefined) return r;
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
  for (let [key, value] of Object.entries(e)) {
    let y = scrubString(key);
    n.hasCollided ||= Object.hasOwn(r, y);
    Object.defineProperty(r, y, {
      value: scrubValuePaths(value, n),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return r;
}
//@ chunk-s61vbvea.js:91656-91706 placement
/**
 * 上述错误码集合。
 */
var NON_REGULAR_ERRORS = ["ELOOP", "ENXIO", "EISDIR"];
var nonRegularErrorSet = new Set(NON_REGULAR_ERRORS);
//@ chunk-s61vbvea.js:91706-91751 placement
/**
 * 判断错误码是否属于非普通文件错误。
 */
function isNonRegularError(telemetryCode) {
  return telemetryCode !== undefined && nonRegularErrorSet.has(telemetryCode);
}
//@ chunk-s61vbvea.js:91751-91813 placement
/**
 * 判断失败是否由非普通文件错误引起。
 */
function isNonRegularFailure(error) {
  return error.code === "Failed" && isNonRegularError(error.telemetryCode);
}
export {
  nonRegularErrorSet,
  isNonRegularError,
  isNonRegularFailure,
  scrubMemoryKeys,
  buildFrontmatterResult,
  frontmatterProblemResult,
};
