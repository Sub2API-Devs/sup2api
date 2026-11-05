/**
 * utils/ignorePatterns.ts
 *
 * 忽略模式（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (12)
 * attribution: placement 12
 */
import { __toESM } from "../../runtime/bun-runtime.js";
import { require_ignore } from "../../vendor/ignore/index.js";
import { logForDebugging } from "./debug.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:159973-160155 placement
/**
 * 去掉路径段末尾的空格与点（Windows 规则），保留 "." 与 ".."。
 */
function stripTrailingDotsSpaces(segmentText) {
  let endIndex = segmentText.length;
  for (;;) {
    let spaceTrimmed = endIndex;
    while (spaceTrimmed > 0 && segmentText[spaceTrimmed - 1] === " ") spaceTrimmed--;
    let sliced = segmentText.slice(0, spaceTrimmed);
    if (sliced === "." || sliced === "..") return sliced;
    let dotTrimmed = spaceTrimmed;
    while (dotTrimmed > 0 && segmentText[dotTrimmed - 1] === ".") dotTrimmed--;
    if (dotTrimmed === endIndex) return sliced;
    endIndex = dotTrimmed;
  }
}
//@ chunk-a2q0x549.js:160155-160625 placement
/**
 * 按 Windows 规则规整路径：保留前缀（盘符/UNC/设备），去掉段尾点与空格、处理 . 与 ..；无需改动时原样返回。
 */
function normalizeWin32Path(win32Path) {
  if (/^\\(?:\\\?|\?\?)\\/.test(win32Path)) return win32Path;
  let prefix =
    /^(?:[\\/]{2,}[?.](?=[\\/])|[\\/]\?\?(?=[\\/])|[\\/]{2,}[^\\/]*(?:[\\/]+[^\\/]+)?|[a-z]:(?=[\\/]))/i.exec(
      win32Path,
    )?.[0] ?? "";
  if (prefix === "" && !/^[\\/]/.test(win32Path)) return win32Path;
  let parts = [];
  let changed = false;
  for (let part of win32Path.slice(prefix.length).split(/[\\/]+/)) {
    if (part === "") continue;
    let cleanPart = stripTrailingDotsSpaces(part);
    changed ||= cleanPart !== part || cleanPart === "." || cleanPart === "..";
    if (cleanPart === "..") parts.pop();
    else if (cleanPart !== "" && cleanPart !== ".") parts.push(cleanPart);
  }
  if (!changed) return win32Path;
  let separator = win32Path.includes("\\") ? "\\" : "/";
  return `${prefix}${separator}${parts.join(separator)}`;
}
//@ chunk-a2q0x549.js:160625-160644 placement
var ignoreLibrary; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a2q0x549.js:160625", () => {
  ignoreLibrary = __toESM(require_ignore(), 1);
});
//@ chunk-a2q0x549.js:160644-160693 placement
/**
 * 编译忽略模式，返回错误说明；合法返回 null。
 */
function ignorePatternError(pattern) {
  return ignorePatternDiagnostics.compileErrorMessage(pattern);
}
//@ chunk-a2q0x549.js:160693-160816 placement
function getIgnoreCompileError(pattern) {
  try {
    ignoreLibrary.default().add([pattern]).test("probe");
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
//@ chunk-a2q0x549.js:160816-160849 placement
var IGNORE_SKIP_PATTERN_RE = /^\s*$|^#|(?:^|[^\\])\\$/;
//@ chunk-a2q0x549.js:160849-160961 placement
function describeIgnorePatternSkip(pattern) {
  return IGNORE_SKIP_PATTERN_RE.test(pattern)
    ? "skipped by the ignore library (blank, comment, or trailing backslash)"
    : ignorePatternError(pattern);
}
//@ chunk-a2q0x549.js:160961-161349 placement
/**
 * 缓存忽略模式的编译错误，并保证同一位置同一模式只警告一次。
 */
class IgnorePatternDiagnostics {
  compileErrorMessages = new Map();
  warnedPatterns = new Set();
  compileErrorMessage(pattern) {
    let message = this.compileErrorMessages.get(pattern);
    if (message !== undefined) return message;
    let ignoreCompileError = getIgnoreCompileError(pattern);
    this.compileErrorMessages.set(pattern, ignoreCompileError);
    return ignoreCompileError;
  }
  firstWarning(site, pattern) {
    let warningKey = `${site}\x00${pattern}`;
    if (this.warnedPatterns.has(warningKey)) return false;
    this.warnedPatterns.add(warningKey);
    return true;
  }
  reset() {
    this.compileErrorMessages.clear();
    this.warnedPatterns.clear();
  }
}
//@ chunk-a2q0x549.js:161349-161363 placement
var ignorePatternDiagnostics; // deferred: uses IgnorePatternDiagnostics of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a2q0x549.js:161349", () => {
  ignorePatternDiagnostics = new IgnorePatternDiagnostics();
});
//@ chunk-a2q0x549.js:161363-161583 placement
function warnUnusableIgnorePattern(
  site,
  pattern,
  errorText,
  consequence = "treating it as matching nothing",
) {
  if (!ignorePatternDiagnostics.firstWarning(site, pattern)) return;
  logForDebugging(
    `[${site}] gitignore-style pattern is unusable (${errorText}); ${consequence}: ${pattern}`,
    {
      level: "warn",
    },
  );
  logEvent("tengu_uncompilable_ignore_pattern", {
    site: fromEnum(site),
  });
}
//@ chunk-a2q0x549.js:161583-161679 placement
/**
 * 过滤掉无法编译的忽略模式并逐条告警。
 */
function filterUsableIgnorePatterns(patterns, site) {
  return patterns.filter((pattern) => {
    let errorText = ignorePatternError(pattern);
    if (errorText === null) return true;
    warnUnusableIgnorePattern(site, pattern, errorText);
    return false;
  });
}
//@ chunk-a2q0x549.js:161679-161735 placement
/**
 * 按行拆分并丢弃空行。
 */
function splitNonEmptyLines(text) {
  return text.split(/\r?\n/).filter(Boolean);
}
export {
  stripTrailingDotsSpaces,
  normalizeWin32Path,
  describeIgnorePatternSkip,
  warnUnusableIgnorePattern,
  filterUsableIgnorePatterns,
  splitNonEmptyLines,
  ignorePatternError,
};
