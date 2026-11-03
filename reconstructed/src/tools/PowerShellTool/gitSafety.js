/**
 * tools/PowerShellTool/gitSafety.ts
 *
 * PowerShell 参数是否指向 git 内部路径或 .git（含 cwd 重入、8.3 短名、符号链接）；混入多个错配为 resolveCwdReentry 的小函数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/gitSafety.ts
 * pieces: chunk-v0yfsee9.js (16)
 * attribution: placement 9, layout 4, fingerprint 3
 */
import { basename, posix, resolve, sep, relative, isAbsolute, dirname } from "path";
import { homedir } from "os";
import { getCwd } from "../../utils/cwd.js";
import {
  stripPsParameterPrefix,
  stripFileSystemProviderPrefix,
  skipLeadingWhitespaceAndComments,
  unescapePsDoubleQuoted,
} from "./powershellParsing.js";
import { createSingleEditDiffConfig } from "../../components/permissions/FilePermissionDialog/ideDiffConfig.js";
import { PS_TOKENIZER_DASH_CHARS } from "../../utils/powershell/parser.js";
import { stripTrailingDotsSpaces } from "../../utils/ignorePatterns.js";
import {
  getFsImplementation,
  resolveDeepestExistingAncestorSync,
  safeResolvePath,
} from "../../utils/fsOperations.js";
import { isUncOrDevicePath } from "../../utils/pathClassification.js";
import { getOriginalCwd } from "../../bootstrap/state.js";

//@ chunk-v0yfsee9.js:13224-13404 placement = resolveCwdReentry (1)
/**
 * 把以 ../<cwd 名>/ 开头的相对路径折回 cwd 内的相对路径（防 ../repo/.git 绕过）。
 */
function resolveCwdReentry(normalized) {
  if (!normalized.startsWith("../")) return normalized;
  let cwdBase = foldCaseForMatch(basename(getCwd()));
  if (!cwdBase) return normalized;
  let prefix = "../" + cwdBase + "/";
  let s = normalized;
  while (s.startsWith(prefix)) s = s.slice(prefix.length);
  if (s === "../" + cwdBase) return ".";
  return s;
}
//@ chunk-v0yfsee9.js:13404-13435 placement
/**
 * 用基础规则规范化 PowerShell 路径参数。
 */
function normalizePsPathBasic(e) {
  return normalizePowerShellPathArg(e, stripPsParameterPrefix);
}
//@ chunk-v0yfsee9.js:13435-13526 placement
/**
 * 返回同一路径参数的多种等价形式（原样、基础、去提供程序前缀、完整规范化），用于 git 内部路径判定。
 */
function normalizedPsPathVariants(e) {
  let n = new Set([
    normalizePowerShellPathArg(e, (r) => r),
    normalizePsPathBasic(e),
    normalizePowerShellPathArg(e, stripFileSystemProviderPrefix),
    normalizePowerShellPathArg(e, createSingleEditDiffConfig),
  ]);
  return Array.from(n);
}
//@ chunk-v0yfsee9.js:13526-14052 placement
/**
 * 规范化 PowerShell 路径参数用于 git 内部路径判定：去掉 -Param: 前缀与引号、展开变量、去掉 FileSystem:: 提供程序前缀、反斜杠转正斜杠、展开 ~、去 8.3 短名与尾部点空格，再 posix 规范化。
 */
function normalizePowerShellPathArg(e, expandArg) {
  let path = e;
  path = skipLeadingWhitespaceAndComments(path);
  if (path.length > 0 && (PS_TOKENIZER_DASH_CHARS.has(path[0]) || path[0] === "/")) {
    let segment = path.indexOf(":", 1);
    if (segment > 0) path = skipLeadingWhitespaceAndComments(path.slice(segment + 1));
  }
  path = expandArg(path);
  path = unescapePsDoubleQuoted(path);
  path = path.replace(/^(?:[A-Za-z0-9_.]+\\){0,3}FileSystem::/i, "");
  path = path.replace(/^[A-Za-z]:(?![/\\])/, "./");
  path = path.replaceAll("\\", "/");
  if (path === "~" || path.startsWith("~/")) path = (homedir() + path.slice(1)).replaceAll("\\", "/");
  let drivePrefix = "";
  if (/^[A-Za-z]:\//.test(path)) {
    drivePrefix = path.slice(0, 2);
    path = path.slice(2);
  }
  path = path
    .split("/")
    .map((m) => (m === "" ? m : stripTrailingDotsSpaces(m) || "."))
    .join("/");
  path = posix.normalize(path);
  if (drivePrefix) path = drivePrefix + path;
  if (path.startsWith("./")) path = path.slice(2);
  return path;
}
//@ chunk-v0yfsee9.js:14052-14183 layout = setCwdState (1)
function foldCaseForMatch(cwd) {
  return cwd
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u017f/g, "s")
    .normalize("NFC")
    .replaceAll("\u03C2", "\u03C3");
}
//@ chunk-v0yfsee9.js:14183-14224 fingerprint = GIT_INTERNAL_PREFIXES (1)
var GIT_INTERNAL_PREFIXES = ["head", "objects", "refs", "hooks"];
//@ chunk-v0yfsee9.js:14224-14448 layout
function resolveCwdRelativePath(e) {
  let fsImplementation = getFsImplementation();
  let cwd = getCwd();
  let s = resolve(cwd, e);
  let m = resolveDeepestExistingAncestorSync(fsImplementation, s) ?? s;
  let resolvedPath = safeResolvePath(fsImplementation, cwd).resolvedPath;
  let y = resolvedPath.endsWith(sep) ? resolvedPath : resolvedPath + sep;
  let absLower = foldCaseForMatch(m);
  let cwdLower = foldCaseForMatch(resolvedPath);
  let O = foldCaseForMatch(y);
  if (absLower === cwdLower) return ".";
  if (!absLower.startsWith(O)) return null;
  return absLower.slice(O.length).replaceAll("\\", "/");
}
//@ chunk-v0yfsee9.js:14448-14646 fingerprint = matchesGitInternalPrefix (1)
/**
 * 规范化路径是否指向 git 内部（.git、HEAD、objects/、refs/、hooks/、git~N 短名）。
 */
function matchesGitInternalPrefix(n_2) {
  if (n_2 === "head" || n_2 === ".git") return true;
  if (n_2.startsWith(".git/") || /^git~\d+($|\/)/.test(n_2)) return true;
  for (let n of GIT_INTERNAL_PREFIXES) {
    if (n === "head") continue;
    if (n_2 === n || n_2.startsWith(n + "/")) return true;
  }
  return false;
}
//@ chunk-v0yfsee9.js:14646-14764 layout
/**
 * PowerShell 参数中是否有路径（含 cwd 重入与符号链接解析后的相对路径）指向 git 内部结构；用于拦截"写入 git 内部再运行 git"。
 */
function isGitInternalPathPS(e) {
  for (let n of normalizedPsPathVariants(e)) {
    let cwdReentry = resolveCwdReentry(foldCaseForMatch(n));
    if (matchesGitInternalPrefix(cwdReentry)) return true;
    let cwdRelativePath = resolveCwdRelativePath(n);
    if (cwdRelativePath !== null && matchesGitInternalPrefix(cwdRelativePath)) return true;
  }
  return false;
}
//@ chunk-v0yfsee9.js:14764-14882 layout
/**
 * PowerShell 参数中是否有路径指向 .git 目录（或 git~N 8.3 短名）。
 */
function isDotGitPathPS(target) {
  for (let n of normalizedPsPathVariants(target)) {
    let cwdReentry = resolveCwdReentry(foldCaseForMatch(n));
    if (matchesDotGitPrefix(cwdReentry)) return true;
    let cwdRelativePath = resolveCwdRelativePath(n);
    if (cwdRelativePath !== null && matchesDotGitPrefix(cwdRelativePath)) return true;
  }
  return false;
}
//@ chunk-v0yfsee9.js:14882-14974 fingerprint = matchesDotGitPrefix (1)
/**
 * 规范化路径是否为 .git、.git/... 或 git~N 短名。
 */
function matchesDotGitPrefix(n) {
  if (n === ".git" || n.startsWith(".git/")) return true;
  return /^git~\d+($|\/)/.test(n);
}
//@ chunk-v0yfsee9.js:14974-15045 placement
/**
 * 参数含逗号时拆成多个候选（原值 + 拆分项）。
 */
function splitCommaWords(e) {
  if (!e.includes(",")) return [e];
  return [e, ...e.split(",")];
}
//@ chunk-v0yfsee9.js:15045-15555 placement
/**
 * PowerShell 参数解析用表：路径参数名与别名、开关参数别名、通用参数别名、开关类参数与带值的通用参数。
 */
var PATH_PARAMS = ["path", "literalpath"];
var LITERAL_PATH_ALIASES = new Set(["pspath", "lp"]);
var SWITCH_ALIASES = new Set(["cf", "wi", "vb", "db", "usetx"]);
var COMMON_PARAM_ALIASES = new Set(["ea", "ev", "wa", "wv", "infa", "iv", "proga", "ov", "ob", "pv"]);
var SWITCH_PARAMS = [
  "container",
  "force",
  "passthru",
  "recurse",
  "whatif",
  "confirm",
  "usetransaction",
  "verbose",
  "debug",
];
var VALUED_COMMON_PARAMS = [
  "filter",
  "include",
  "exclude",
  "credential",
  "fromsession",
  "tosession",
  "erroraction",
  "errorvariable",
  "warningaction",
  "warningvariable",
  "informationaction",
  "informationvariable",
  "progressaction",
  "outvariable",
  "outbuffer",
  "pipelinevariable",
];
//@ chunk-v0yfsee9.js:15555-15595 placement
/**
 * 参数含通配符（* ? [ ]）或 $ 变量时返回 true。
 */
function hasWildcardOrVariable(e) {
  return /[*?[\]$]/.test(e);
}
//@ chunk-v0yfsee9.js:15595-15891 placement
function isCwdOrAncestor(e) {
  let fsImplementation = getFsImplementation();
  let cwd = getCwd();
  let s = resolve(cwd, e);
  let m = isUncOrDevicePath(s) ? s : (resolveDeepestExistingAncestorSync(fsImplementation, s) ?? s);
  let resolvedPath = safeResolvePath(fsImplementation, cwd).resolvedPath;
  let y = foldCaseForMatch(m);
  if (foldCaseForMatch(resolvedPath) === y) return true;
  let resolvedPath_2 = safeResolvePath(fsImplementation, getOriginalCwd()).resolvedPath;
  let h = relative(resolvedPath_2, resolvedPath);
  if (h === ".." || h.startsWith(".." + sep) || isAbsolute(h)) return false;
  let O = foldCaseForMatch(resolvedPath_2);
  let S = resolvedPath;
  for (;;) {
    if (foldCaseForMatch(S) === y) return true;
    if (foldCaseForMatch(S) === O || S === dirname(S)) return false;
    S = dirname(S);
  }
}
//@ chunk-v0yfsee9.js:15891-17169 placement
/**
 * git 安全检查：Copy-Item/Move-Item 的参数解析（-Path/-LiteralPath/-Destination 与通用参数，缩写须唯一）后，若目标是 cwd 或其祖先、含通配或变量、末段为 . / .. 或 git 内部路径名，或参数无法确定，则视为可能写入 .git 内部而返回 true。
 */
function copyMoveMayReachGitInternals(args, forceAsk = false) {
  let r = [];
  let s = [];
  let m;
  let g = false;
  let y = false;
  let w = [];
  for (let j = 0; j < args.length; j++) {
    let _ = skipLeadingWhitespaceAndComments(args[j]);
    if (_.length === 0 || !PS_TOKENIZER_DASH_CHARS.has(_[0])) {
      s.push(args[j]);
      continue;
    }
    let index = _.indexOf(":", 1);
    let lower = (index > 0 ? _.slice(1, index) : _.slice(1)).toLowerCase();
    let D = index > 0 ? _.slice(index + 1) : undefined;
    if (lower === "") return true;
    let V = "destination".startsWith(lower);
    let z = LITERAL_PATH_ALIASES.has(lower) || "literalpath".startsWith(lower);
    let W = z || PATH_PARAMS.some((q) => q.startsWith(lower));
    let H = SWITCH_ALIASES.has(lower) || SWITCH_PARAMS.some((q) => q.startsWith(lower));
    let R = COMMON_PARAM_ALIASES.has(lower) || VALUED_COMMON_PARAMS.some((q) => q.startsWith(lower));
    if (Number(V) + Number(W) + Number(H) + Number(R) !== 1) return true;
    if (H) {
      if ("container".startsWith(lower) && D !== undefined) {
        let q = skipLeadingWhitespaceAndComments(D);
        if (
          ![stripPsParameterPrefix, stripFileSystemProviderPrefix, createSingleEditDiffConfig].every((te) =>
            /^\$true$/i.test(te(q).trim()),
          )
        )
          y = true;
      }
      continue;
    }
    let B = D ?? args[++j];
    if (B === undefined) continue;
    if (V) m = B;
    else if (W) {
      g = true;
      if (z) w.push(...B.split(","));
      else r.push(...B.split(","));
    }
  }
  let h = (g ? 0 : 1) + (m === undefined ? 1 : 0);
  if (s.length > h) return true;
  let O;
  let S = 0;
  if (!g && S < s.length) {
    r.push(...s[S].split(","));
    S++;
  }
  if (m === undefined && S < s.length) O = s[S];
  if (r.length === 0 && w.length === 0 && !forceAsk) return false;
  let v = m ?? O;
  if (v !== undefined) {
    let mapped = normalizedPsPathVariants(v).map((_) => (_ === "" ? "." : _));
    if (mapped.some(hasWildcardOrVariable)) return true;
    if (!mapped.some(isCwdOrAncestor)) return false;
  }
  if (y || forceAsk) return true;
  for (let [x, _] of [
    [false, r],
    [true, w],
  ])
    for (let P of _)
      for (let k of normalizedPsPathVariants(P)) {
        let D = k === "" ? "." : k;
        if (x ? /\$/.test(D) : hasWildcardOrVariable(D)) return true;
        let base = posix.basename(D);
        if (base === "." || base === "..") return true;
        if (isGitInternalPathPS(base)) return true;
      }
  return false;
}
export { isGitInternalPathPS, splitCommaWords, copyMoveMayReachGitInternals, isDotGitPathPS };
