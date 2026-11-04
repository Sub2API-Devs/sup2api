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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:90403-90574 placement
/**
 * 构造 frontmatter 解析结果（原样内容、可选问题与绝对路径），以及只有问题的结果。
 */
var buildFrontmatterResult = (frontmatterAsWritten, comment, asWrittenProblem) => ({
  frontmatterAsWritten,
  ...(asWrittenProblem !== undefined && {
    frontmatterProblem: asWrittenProblem,
  }),
  ...(comment !== undefined &&
    isAbsolute(comment) && {
      path: comment,
    }),
});
var frontmatterProblemResult = (frontmatterProblem) => ({
  frontmatterAsWritten: {},
  frontmatterProblem,
});
//@ chunk-s61vbvea.js:90574-90842 placement
function scrubMemoryKeys(frontmatter, filePath) {
  let scrubState = {
    copies: new Map(),
    hasCollided: false,
  };
  let { frontmatterAsWritten, asWrittenProblem } = frontmatter;
  let scrubbed;
  let problem;
  try {
    scrubbed = scrubObjectPaths(frontmatterAsWritten, scrubState);
    problem = asWrittenProblem && scrubString(asWrittenProblem);
  } catch {
    return buildFrontmatterResult({}, filePath, "could not be scrubbed");
  }
  return scrubState.hasCollided
    ? buildFrontmatterResult({}, filePath, "has two keys that read the same once scrubbed")
    : buildFrontmatterResult(scrubbed, filePath, problem);
}
//@ chunk-s61vbvea.js:90842-90896 placement
/**
 * 清洗字符串里的 U+2028/2029 并做 Unicode 部分清洗。
 */
var scrubString = (text) =>
  escapeXmlControlChars(partiallySanitizeUnicode(text).replace(/[\u2028\u2029]/g, ""));
//@ chunk-s61vbvea.js:90896-91139 placement
function scrubValuePaths(value, state) {
  if (typeof value === "string") return scrubString(value);
  if (typeof value !== "object" || value === null) return value;
  let existing = state.copies.get(value);
  if (existing !== undefined) return existing;
  if (!Array.isArray(value)) return scrubObjectPaths(value, state);
  let scrubbed = [];
  state.copies.set(value, scrubbed);
  for (let item of value) scrubbed.push(scrubValuePaths(item, state));
  return scrubbed;
}
//@ chunk-s61vbvea.js:91139-91358 placement
function scrubObjectPaths(value, state) {
  let scrubbed = {};
  state.copies.set(value, scrubbed);
  for (let [key, value_2] of Object.entries(value)) {
    let scrubbedKey = scrubString(key);
    state.hasCollided ||= Object.hasOwn(scrubbed, scrubbedKey);
    Object.defineProperty(scrubbed, scrubbedKey, {
      value: scrubValuePaths(value_2, state),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return scrubbed;
}
//@ chunk-s61vbvea.js:91656-91706 placement
/**
 * 上述错误码集合。
 */
var NON_REGULAR_ERRORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var nonRegularErrorSet;
deferInit("chunk-s61vbvea.js:91656", () => {
  NON_REGULAR_ERRORS = ["ELOOP", "ENXIO", "EISDIR"];
  nonRegularErrorSet = new Set(NON_REGULAR_ERRORS);
});
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
