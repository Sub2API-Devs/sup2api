/**
 * tools/PowerShellTool/gitSafety.ts
 *
 * PowerShell 参数是否指向 git 内部路径或 .git（含 cwd 重入、8.3 短名、符号链接）；混入多个错配为 resolveCwdReentry 的小函数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/gitSafety.ts
 * pieces: chunk-v0yfsee9.js (11)
 * attribution: placement 4, layout 4, fingerprint 3
 */
import {
  basename,
  basename as basename_2,
  posix,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  sep,
} from "path";
import { homedir, homedir as homedir_2 } from "os";
import { getCwd } from "../../utils/cwd.js";
import { lW, oZ, skipLeadingWhitespaceAndComments, gP } from "./powershellParsing.js";
import { createSingleEditDiffConfig } from "../../components/permissions/FilePermissionDialog/ideDiffConfig.js";
import { PS_TOKENIZER_DASH_CHARS } from "../../utils/powershell/parser.js";
import { stripTrailingDotsSpaces } from "../../utils/ignorePatterns.js";
import {
  getFsImplementation,
  resolveDeepestExistingAncestorSync,
  safeResolvePath,
} from "../../utils/fsOperations.js";

/**
 * 把以 ../<cwd 名>/ 开头的相对路径折回 cwd 内的相对路径（防 ../repo/.git 绕过）。
 */
//@ chunk-v0yfsee9.js:13224-13404 placement = resolveCwdReentry (1)
function resolveCwdReentry(normalized) {
  if (!normalized.startsWith("../")) return normalized;
  let n = foldCaseForMatch(basename_2(getCwd()));
  if (!n) return normalized;
  let prefix = "../" + n + "/",
    s = normalized;
  while (s.startsWith(prefix)) s = s.slice(prefix.length);
  if (s === "../" + n) return ".";
  return s;
}
//@ chunk-v0yfsee9.js:13404-13435 placement
function gn(e) {
  return normalizePowerShellPathArg(e, lW);
}
//@ chunk-v0yfsee9.js:13435-13526 placement
function Je(e) {
  let n = new Set([
    normalizePowerShellPathArg(e, (r) => r),
    gn(e),
    normalizePowerShellPathArg(e, oZ),
    normalizePowerShellPathArg(e, createSingleEditDiffConfig),
  ]);
  return Array.from(n);
}
/**
 * 规范化 PowerShell 路径参数用于 git 内部路径判定：去掉 -Param: 前缀与引号、展开变量、去掉 FileSystem:: 提供程序前缀、反斜杠转正斜杠、展开 ~、去 8.3 短名与尾部点空格，再 posix 规范化。
 */
//@ chunk-v0yfsee9.js:13526-14052 placement
function normalizePowerShellPathArg(e, expandArg) {
  let path = e;
  if (
    ((path = skipLeadingWhitespaceAndComments(path)),
    path.length > 0 && (PS_TOKENIZER_DASH_CHARS.has(path[0]) || path[0] === "/"))
  ) {
    let segment = path.indexOf(":", 1);
    if (segment > 0) path = skipLeadingWhitespaceAndComments(path.slice(segment + 1));
  }
  if (
    ((path = expandArg(path)),
    (path = gP(path)),
    (path = path.replace(/^(?:[A-Za-z0-9_.]+\\){0,3}FileSystem::/i, "")),
    (path = path.replace(/^[A-Za-z]:(?![/\\])/, "./")),
    (path = path.replaceAll("\\", "/")),
    path === "~" || path.startsWith("~/"))
  )
    path = (homedir() + path.slice(1)).replaceAll("\\", "/");
  let drivePrefix = "";
  if (/^[A-Za-z]:\//.test(path)) ((drivePrefix = path.slice(0, 2)), (path = path.slice(2)));
  if (
    ((path = path
      .split("/")
      .map((m) => (m === "" ? m : stripTrailingDotsSpaces(m) || "."))
      .join("/")),
    (path = posix.normalize(path)),
    drivePrefix)
  )
    path = drivePrefix + path;
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
  let n = getFsImplementation(),
    r = getCwd(),
    s = resolve_2(r, e),
    m = resolveDeepestExistingAncestorSync(n, s) ?? s,
    resolvedPath = safeResolvePath(n, r).resolvedPath,
    y = resolvedPath.endsWith(sep) ? resolvedPath : resolvedPath + sep,
    w = foldCaseForMatch(m),
    h = foldCaseForMatch(resolvedPath),
    O = foldCaseForMatch(y);
  if (w === h) return ".";
  if (!w.startsWith(O)) return null;
  return w.slice(O.length).replaceAll("\\", "/");
}
/**
 * 规范化路径是否指向 git 内部（.git、HEAD、objects/、refs/、hooks/、git~N 短名）。
 */
//@ chunk-v0yfsee9.js:14448-14646 fingerprint = matchesGitInternalPrefix (1)
function matchesGitInternalPrefix(n_2) {
  if (n_2 === "head" || n_2 === ".git") return !0;
  if (n_2.startsWith(".git/") || /^git~\d+($|\/)/.test(n_2)) return !0;
  for (let n of GIT_INTERNAL_PREFIXES) {
    if (n === "head") continue;
    if (n_2 === n || n_2.startsWith(n + "/")) return !0;
  }
  return !1;
}
/**
 * PowerShell 参数中是否有路径（含 cwd 重入与符号链接解析后的相对路径）指向 git 内部结构；用于拦截"写入 git 内部再运行 git"。
 */
//@ chunk-v0yfsee9.js:14646-14764 layout
function isGitInternalPathPS(e) {
  for (let n of Je(e)) {
    let r = resolveCwdReentry(foldCaseForMatch(n));
    if (matchesGitInternalPrefix(r)) return !0;
    let s = resolveCwdRelativePath(n);
    if (s !== null && matchesGitInternalPrefix(s)) return !0;
  }
  return !1;
}
/**
 * PowerShell 参数中是否有路径指向 .git 目录（或 git~N 8.3 短名）。
 */
//@ chunk-v0yfsee9.js:14764-14882 layout
function isDotGitPathPS(e) {
  for (let n of Je(e)) {
    let r = resolveCwdReentry(foldCaseForMatch(n));
    if (matchesDotGitPrefix(r)) return !0;
    let s = resolveCwdRelativePath(n);
    if (s !== null && matchesDotGitPrefix(s)) return !0;
  }
  return !1;
}
/**
 * 规范化路径是否为 .git、.git/... 或 git~N 短名。
 */
//@ chunk-v0yfsee9.js:14882-14974 fingerprint = matchesDotGitPrefix (1)
function matchesDotGitPrefix(n) {
  if (n === ".git" || n.startsWith(".git/")) return !0;
  return /^git~\d+($|\/)/.test(n);
}

export { isGitInternalPathPS, isDotGitPathPS, foldCaseForMatch, Je };
