/**
 * tools/PowerShellTool/gitSafety.ts
 *
 * PowerShell 参数是否指向 git 内部路径或 .git（含 cwd 重入、8.3 短名、符号链接）；混入多个错配为 resolveCwdReentry 的小函数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/gitSafety.ts
 * pieces: chunk-6zpsr8vx.js (16)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6zpsr8vx.js:14449-14629 placement (2.1.88 match: resolveCwdReentry, 1)
/**
 * 把以 ../<cwd 名>/ 开头的相对路径折回 cwd 内的相对路径（防 ../repo/.git 绕过）。
 */
function resolveCwdReentry(normalized) {
  if (!normalized.startsWith("../")) return normalized;
  let cwdBase = foldCaseForMatch(basename(getCwd()));
  if (!cwdBase) return normalized;
  let prefix = "../" + cwdBase + "/";
  let remaining = normalized;
  while (remaining.startsWith(prefix)) remaining = remaining.slice(prefix.length);
  if (remaining === "../" + cwdBase) return ".";
  return remaining;
}
//@ chunk-6zpsr8vx.js:14629-14660 placement
/**
 * 用基础规则规范化 PowerShell 路径参数。
 */
function normalizePsPathBasic(pathArg) {
  return normalizePowerShellPathArg(pathArg, stripPsParameterPrefix);
}
//@ chunk-6zpsr8vx.js:14660-14752 placement
/**
 * 返回同一路径参数的多种等价形式（原样、基础、去提供程序前缀、完整规范化），用于 git 内部路径判定。
 */
function normalizedPsPathVariants(pathArg) {
  let variants = new Set([
    normalizePowerShellPathArg(pathArg, (path) => path),
    normalizePsPathBasic(pathArg),
    normalizePowerShellPathArg(pathArg, stripFileSystemProviderPrefix),
    normalizePowerShellPathArg(pathArg, createSingleEditDiffConfig),
  ]);
  return Array.from(variants);
}
//@ chunk-6zpsr8vx.js:14752-15278 placement
/**
 * 规范化 PowerShell 路径参数用于 git 内部路径判定：去掉 -Param: 前缀与引号、展开变量、去掉 FileSystem:: 提供程序前缀、反斜杠转正斜杠、展开 ~、去 8.3 短名与尾部点空格，再 posix 规范化。
 */
function normalizePowerShellPathArg(pathArg, expandArg) {
  let path = pathArg;
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
    .map((segment) => (segment === "" ? segment : stripTrailingDotsSpaces(segment) || "."))
    .join("/");
  path = posix.normalize(path);
  if (drivePrefix) path = drivePrefix + path;
  if (path.startsWith("./")) path = path.slice(2);
  return path;
}
//@ chunk-6zpsr8vx.js:15278-15409 layout (2.1.88 match: setCwdState, 1)
function foldCaseForMatch(cwd) {
  return cwd
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u017f/g, "s")
    .normalize("NFC")
    .replaceAll("\u03C2", "\u03C3");
}
//@ chunk-6zpsr8vx.js:15409-15450 fingerprint (2.1.88 match: GIT_INTERNAL_PREFIXES, 1)
var GIT_INTERNAL_PREFIXES = ["head", "objects", "refs", "hooks"];
//@ chunk-6zpsr8vx.js:15450-15674 layout
function resolveCwdRelativePath(pathArg) {
  let fsImplementation = getFsImplementation();
  let cwd = getCwd();
  let absolutePath = resolve(cwd, pathArg);
  let resolvedExisting = resolveDeepestExistingAncestorSync(fsImplementation, absolutePath) ?? absolutePath;
  let resolvedPath = safeResolvePath(fsImplementation, cwd).resolvedPath;
  let cwdWithSep = resolvedPath.endsWith(sep) ? resolvedPath : resolvedPath + sep;
  let absLower = foldCaseForMatch(resolvedExisting);
  let cwdLower = foldCaseForMatch(resolvedPath);
  let cwdPrefixLower = foldCaseForMatch(cwdWithSep);
  if (absLower === cwdLower) return ".";
  if (!absLower.startsWith(cwdPrefixLower)) return null;
  return absLower.slice(cwdPrefixLower.length).replaceAll("\\", "/");
}
//@ chunk-6zpsr8vx.js:15674-15872 fingerprint (2.1.88 match: matchesGitInternalPrefix, 1)
/**
 * 规范化路径是否指向 git 内部（.git、HEAD、objects/、refs/、hooks/、git~N 短名）。
 */
function matchesGitInternalPrefix(n_2) {
  if (n_2 === "head" || n_2 === ".git") return true;
  if (n_2.startsWith(".git/") || /^git~\d+($|\/)/.test(n_2)) return true;
  for (let prefix of GIT_INTERNAL_PREFIXES) {
    if (prefix === "head") continue;
    if (n_2 === prefix || n_2.startsWith(prefix + "/")) return true;
  }
  return false;
}
//@ chunk-6zpsr8vx.js:15872-15990 layout
/**
 * PowerShell 参数中是否有路径（含 cwd 重入与符号链接解析后的相对路径）指向 git 内部结构；用于拦截"写入 git 内部再运行 git"。
 */
function isGitInternalPathPS(pathArg) {
  for (let variant of normalizedPsPathVariants(pathArg)) {
    let cwdReentry = resolveCwdReentry(foldCaseForMatch(variant));
    if (matchesGitInternalPrefix(cwdReentry)) return true;
    let cwdRelativePath = resolveCwdRelativePath(variant);
    if (cwdRelativePath !== null && matchesGitInternalPrefix(cwdRelativePath)) return true;
  }
  return false;
}
//@ chunk-6zpsr8vx.js:15990-16108 layout
/**
 * PowerShell 参数中是否有路径指向 .git 目录（或 git~N 8.3 短名）。
 */
function isDotGitPathPS(target) {
  for (let variant of normalizedPsPathVariants(target)) {
    let cwdReentry = resolveCwdReentry(foldCaseForMatch(variant));
    if (matchesDotGitPrefix(cwdReentry)) return true;
    let cwdRelativePath = resolveCwdRelativePath(variant);
    if (cwdRelativePath !== null && matchesDotGitPrefix(cwdRelativePath)) return true;
  }
  return false;
}
//@ chunk-6zpsr8vx.js:16108-16200 fingerprint (2.1.88 match: matchesDotGitPrefix, 1)
/**
 * 规范化路径是否为 .git、.git/... 或 git~N 短名。
 */
function matchesDotGitPrefix(n) {
  if (n === ".git" || n.startsWith(".git/")) return true;
  return /^git~\d+($|\/)/.test(n);
}
//@ chunk-6zpsr8vx.js:16200-16271 placement
/**
 * 参数含逗号时拆成多个候选（原值 + 拆分项）。
 */
function splitCommaWords(value) {
  if (!value.includes(",")) return [value];
  return [value, ...value.split(",")];
}
//@ chunk-6zpsr8vx.js:16271-16781 placement
/**
 * PowerShell 参数解析用表：路径参数名与别名、开关参数别名、通用参数别名、开关类参数与带值的通用参数。
 */
var PATH_PARAMS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LITERAL_PATH_ALIASES;
var SWITCH_ALIASES;
var COMMON_PARAM_ALIASES;
var SWITCH_PARAMS;
var VALUED_COMMON_PARAMS;
deferInit("chunk-6zpsr8vx.js:16271", () => {
  PATH_PARAMS = ["path", "literalpath"];
  LITERAL_PATH_ALIASES = new Set(["pspath", "lp"]);
  SWITCH_ALIASES = new Set(["cf", "wi", "vb", "db", "usetx"]);
  COMMON_PARAM_ALIASES = new Set(["ea", "ev", "wa", "wv", "infa", "iv", "proga", "ov", "ob", "pv"]);
  SWITCH_PARAMS = [
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
  VALUED_COMMON_PARAMS = [
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
});
//@ chunk-6zpsr8vx.js:16781-16821 placement
/**
 * 参数含通配符（* ? [ ]）或 $ 变量时返回 true。
 */
function hasWildcardOrVariable(text) {
  return /[*?[\]$]/.test(text);
}
//@ chunk-6zpsr8vx.js:16821-17117 placement
function isCwdOrAncestor(pathArg) {
  let fsImplementation = getFsImplementation();
  let cwd = getCwd();
  let absolutePath = resolve(cwd, pathArg);
  let resolvedExisting = isUncOrDevicePath(absolutePath)
    ? absolutePath
    : (resolveDeepestExistingAncestorSync(fsImplementation, absolutePath) ?? absolutePath);
  let resolvedPath = safeResolvePath(fsImplementation, cwd).resolvedPath;
  let targetLower = foldCaseForMatch(resolvedExisting);
  if (foldCaseForMatch(resolvedPath) === targetLower) return true;
  let resolvedPath_2 = safeResolvePath(fsImplementation, getOriginalCwd()).resolvedPath;
  let cwdRelativeToOriginal = relative(resolvedPath_2, resolvedPath);
  if (
    cwdRelativeToOriginal === ".." ||
    cwdRelativeToOriginal.startsWith(".." + sep) ||
    isAbsolute(cwdRelativeToOriginal)
  )
    return false;
  let originalLower = foldCaseForMatch(resolvedPath_2);
  let candidate = resolvedPath;
  for (;;) {
    if (foldCaseForMatch(candidate) === targetLower) return true;
    if (foldCaseForMatch(candidate) === originalLower || candidate === dirname(candidate)) return false;
    candidate = dirname(candidate);
  }
}
//@ chunk-6zpsr8vx.js:17117-18396 placement
/**
 * git 安全检查：Copy-Item/Move-Item 的参数解析（-Path/-LiteralPath/-Destination 与通用参数，缩写须唯一）后，若目标是 cwd 或其祖先、含通配或变量、末段为 . / .. 或 git 内部路径名，或参数无法确定，则视为可能写入 .git 内部而返回 true。
 */
function copyMoveMayReachGitInternals(args, forceAsk = false) {
  let sourcePaths = [];
  let bareArgs = [];
  let destinationPath;
  let hasPathParam = false;
  let askUncertain = false;
  let literalPaths = [];
  for (let j = 0; j < args.length; j++) {
    let paramText = skipLeadingWhitespaceAndComments(args[j]);
    if (paramText.length === 0 || !PS_TOKENIZER_DASH_CHARS.has(paramText[0])) {
      bareArgs.push(args[j]);
      continue;
    }
    let index = paramText.indexOf(":", 1);
    let lower = (index > 0 ? paramText.slice(1, index) : paramText.slice(1)).toLowerCase();
    let paramValue = index > 0 ? paramText.slice(index + 1) : undefined;
    if (lower === "") return true;
    let isDestination = "destination".startsWith(lower);
    let isLiteralPath = LITERAL_PATH_ALIASES.has(lower) || "literalpath".startsWith(lower);
    let isPathParam = isLiteralPath || PATH_PARAMS.some((paramName) => paramName.startsWith(lower));
    let isSwitch =
      SWITCH_ALIASES.has(lower) || SWITCH_PARAMS.some((switchName) => switchName.startsWith(lower));
    let isCommonParam =
      COMMON_PARAM_ALIASES.has(lower) ||
      VALUED_COMMON_PARAMS.some((commonParamName) => commonParamName.startsWith(lower));
    if (Number(isDestination) + Number(isPathParam) + Number(isSwitch) + Number(isCommonParam) !== 1)
      return true;
    if (isSwitch) {
      if ("container".startsWith(lower) && paramValue !== undefined) {
        let switchValue = skipLeadingWhitespaceAndComments(paramValue);
        if (
          ![stripPsParameterPrefix, stripFileSystemProviderPrefix, createSingleEditDiffConfig].every(
            (normalizeArg) => /^\$true$/i.test(normalizeArg(switchValue).trim()),
          )
        )
          askUncertain = true;
      }
      continue;
    }
    let pathValue = paramValue ?? args[++j];
    if (pathValue === undefined) continue;
    if (isDestination) destinationPath = pathValue;
    else if (isPathParam) {
      hasPathParam = true;
      if (isLiteralPath) literalPaths.push(...pathValue.split(","));
      else sourcePaths.push(...pathValue.split(","));
    }
  }
  let maxBareArgs = (hasPathParam ? 0 : 1) + (destinationPath === undefined ? 1 : 0);
  if (bareArgs.length > maxBareArgs) return true;
  let secondPathArg;
  let bareArgIndex = 0;
  if (!hasPathParam && bareArgIndex < bareArgs.length) {
    sourcePaths.push(...bareArgs[bareArgIndex].split(","));
    bareArgIndex++;
  }
  if (destinationPath === undefined && bareArgIndex < bareArgs.length) secondPathArg = bareArgs[bareArgIndex];
  if (sourcePaths.length === 0 && literalPaths.length === 0 && !forceAsk) return false;
  let destinationArg = destinationPath ?? secondPathArg;
  if (destinationArg !== undefined) {
    let mapped = normalizedPsPathVariants(destinationArg).map((variant) => (variant === "" ? "." : variant));
    if (mapped.some(hasWildcardOrVariable)) return true;
    if (!mapped.some(isCwdOrAncestor)) return false;
  }
  if (askUncertain || forceAsk) return true;
  for (let [isLiteral, pathList] of [
    [false, sourcePaths],
    [true, literalPaths],
  ])
    for (let pathArg of pathList)
      for (let variant of normalizedPsPathVariants(pathArg)) {
        let pathText = variant === "" ? "." : variant;
        if (isLiteral ? /\$/.test(pathText) : hasWildcardOrVariable(pathText)) return true;
        let base = posix.basename(pathText);
        if (base === "." || base === "..") return true;
        if (isGitInternalPathPS(base)) return true;
      }
  return false;
}
export { isGitInternalPathPS, splitCommaWords, copyMoveMayReachGitInternals, isDotGitPathPS };
