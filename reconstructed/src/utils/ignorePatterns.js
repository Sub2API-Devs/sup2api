/**
 * utils/ignorePatterns.ts
 *
 * 忽略模式（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (12)
 * attribution: placement 12
 */
import { Re } from "../../runtime/bun-runtime.js";
import { Vpe } from "../../vendor/ignore/index.js";
import { logForDebugging } from "./debug.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";

/**
 * 去掉路径段末尾的空格与点（Windows 规则），保留 "." 与 ".."。
 */
//@ chunk-82kqcve8.js:161884-162066 placement
function stripTrailingDotsSpaces(e) {
  let n = e.length;
  for (;;) {
    let r = n;
    while (r > 0 && e[r - 1] === " ") r--;
    let sliced = e.slice(0, r);
    if (sliced === "." || sliced === "..") return sliced;
    let h = r;
    while (h > 0 && e[h - 1] === ".") h--;
    if (h === n) return sliced;
    n = h;
  }
}
/**
 * 按 Windows 规则规整路径：保留前缀（盘符/UNC/设备），去掉段尾点与空格、处理 . 与 ..；无需改动时原样返回。
 */
//@ chunk-82kqcve8.js:162066-162536 placement
function normalizeWin32Path(e) {
  if (/^\\(?:\\\?|\?\?)\\/.test(e)) return e;
  let n =
    /^(?:[\\/]{2,}[?.](?=[\\/])|[\\/]\?\?(?=[\\/])|[\\/]{2,}[^\\/]*(?:[\\/]+[^\\/]+)?|[a-z]:(?=[\\/]))/i.exec(
      e,
    )?.[0] ?? "";
  if (n === "" && !/^[\\/]/.test(e)) return e;
  let r = [],
    s = !1;
  for (let y of e.slice(n.length).split(/[\\/]+/)) {
    if (y === "") continue;
    let w = stripTrailingDotsSpaces(y);
    if (((s ||= w !== y || w === "." || w === ".."), w === "..")) r.pop();
    else if (w !== "" && w !== ".") r.push(w);
  }
  if (!s) return e;
  let h = e.includes("\\") ? "\\" : "/";
  return `${n}${h}${r.join(h)}`;
}
//@ chunk-82kqcve8.js:162536-162555 placement
var Ol = Re(Vpe(), 1);
//@ chunk-82kqcve8.js:162555-162604 placement
function _9r(e) {
  return Tl.compileErrorMessage(e);
}
//@ chunk-82kqcve8.js:162604-162727 placement
function getIgnoreCompileError(e) {
  try {
    return (Ol.default().add([e]).test("probe"), null);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
//@ chunk-82kqcve8.js:162727-162760 placement
var qf = /^\s*$|^#|(?:^|[^\\])\\$/;
//@ chunk-82kqcve8.js:162760-162872 placement
function describeIgnorePatternSkip(e) {
  return qf.test(e) ? "skipped by the ignore library (blank, comment, or trailing backslash)" : _9r(e);
}
/**
 * 缓存忽略模式的编译错误，并保证同一位置同一模式只警告一次。
 */
//@ chunk-82kqcve8.js:162872-163260 placement
class IgnorePatternDiagnostics {
  compileErrorMessages = new Map();
  warnedPatterns = new Set();
  compileErrorMessage(e) {
    let n = this.compileErrorMessages.get(e);
    if (n !== void 0) return n;
    let r = getIgnoreCompileError(e);
    return (this.compileErrorMessages.set(e, r), r);
  }
  firstWarning(e, n) {
    let r = `${e}\x00${n}`;
    if (this.warnedPatterns.has(r)) return !1;
    return (this.warnedPatterns.add(r), !0);
  }
  reset() {
    (this.compileErrorMessages.clear(), this.warnedPatterns.clear());
  }
}
//@ chunk-82kqcve8.js:163260-163274 placement
var Tl = new IgnorePatternDiagnostics();
//@ chunk-82kqcve8.js:163274-163494 placement
function warnUnusableIgnorePattern(e, n, r, s = "treating it as matching nothing") {
  if (!Tl.firstWarning(e, n)) return;
  (logForDebugging(`[${e}] gitignore-style pattern is unusable (${r}); ${s}: ${n}`, { level: "warn" }),
    logEvent("tengu_uncompilable_ignore_pattern", { site: fromEnum(e) }));
}
//@ chunk-82kqcve8.js:163494-163590 placement
function xst(e, n) {
  return e.filter((r) => {
    let s = _9r(r);
    if (s === null) return !0;
    return (warnUnusableIgnorePattern(n, r, s), !1);
  });
}
//@ chunk-82kqcve8.js:163590-163646 placement
function wAt(e) {
  return e.split(/\r?\n/).filter(Boolean);
}

export {
  normalizeWin32Path,
  describeIgnorePatternSkip,
  warnUnusableIgnorePattern,
  xst,
  wAt,
  stripTrailingDotsSpaces,
  _9r,
};
