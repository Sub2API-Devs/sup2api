/**
 * utils/permissions/protectedEnvAndGitPaths.ts
 *
 * 2.1.316 新增：收集 git 相关受保护路径（GIT_DIR、hooks、config 等）；路径是否落在受保护位置等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-91xvghb6.js (52)
 * attribution: placement 52
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sep, join, resolve, isAbsolute, dirname, basename, win32, posix, parse, relative } from "path";
import { homedir } from "os";
import { realpath, lstat, stat, readlink, access } from "fs/promises";
import { constants } from "fs";
import { getEnvCaseInsensitive } from "../plugins/securityDefaultPlugin.js";
import { getPlatform } from "../platform.js";
import { normalizeCaseForComparison_2 } from "./filesystem.js";
import { claudeTempDir, childProcessTmpDir } from "../tempDir.js";
import {
  getDefaultWritePaths,
  expandTilde,
  stripExtendedPathPrefix,
  expandWindowsEnvRefs,
  containsGlobChars,
} from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import {
  hasBackslash,
  isForeignNetworkPath,
  isMacSpecialPath,
  isUncOrDevicePath,
} from "../pathClassification.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import {
  isOpaqueLinkText,
  findIntermediateUncJunctionAsync,
  NodeFsOperations,
  findIntermediateUncJunction,
  UNVERIFIED_ANCESTRY,
  OPAQUE_LINK_TEXT,
} from "../fsOperations.js";
import {
  isNonWslUncPath,
  networkMountRoots,
  isOtherHomeMount,
  isNetDir,
  isNetworkRelatedPath,
  isNetworkMountRoot,
} from "../networkPaths.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-91xvghb6.js:880-1294 placement
/**
 * 受保护的环境变量（GIT_EXEC_PATH、LD_PRELOAD 等）。
 */
var PROTECTED_ENV_VARS = [
  "GIT_EXEC_PATH",
  "DEVELOPER_DIR",
  "GIT_TEXTDOMAINDIR",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "LD_AUDIT",
  "GCONV_PATH",
  "NLSPATH",
  "LOCPATH",
  "PSMODULEPATH",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "DYLD_FRAMEWORK_PATH",
  "DYLD_FALLBACK_LIBRARY_PATH",
  "DYLD_FALLBACK_FRAMEWORK_PATH",
  "DYLD_VERSIONED_LIBRARY_PATH",
  "DYLD_VERSIONED_FRAMEWORK_PATH",
  "OPENSSL_CONF",
  "OPENSSL_CONF_INCLUDE",
  "OPENSSL_MODULES",
  "OPENSSL_ENGINES",
];
//@ chunk-91xvghb6.js:1599-1856 placement
/**
 * 列出会影响 git 的配置文件路径：额外路径、系统配置、GIT_CONFIG_GLOBAL、各主目录下的 XDG 与 ~/.gitconfig，按 cwd 解析为绝对路径。
 */
function getGitConfigPaths(configFileCandidates, baseDir, systemRoot, gitEnv = process.env) {
  let envCaseInsensitive = getEnvCaseInsensitive(gitEnv, "GIT_CONFIG_GLOBAL");
  let envCaseInsensitive_2 = getEnvCaseInsensitive(gitEnv, "XDG_CONFIG_HOME");
  return [
    ...configFileCandidates.filter((candidate) => candidate !== ""),
    ...getSystemGitConfigPaths(systemRoot, gitEnv),
    ...(envCaseInsensitive ? [envCaseInsensitive] : []),
    ...getHomeDirCandidates(gitEnv).flatMap((homeDir) => [
      `${envCaseInsensitive_2 || `${homeDir}${sep}.config`}${sep}git${sep}config`,
      `${homeDir}${sep}.gitconfig`,
    ]),
  ].map((path) => resolveRelative(baseDir, path));
}
//@ chunk-91xvghb6.js:1856-1941 placement
/**
 * systemGitConfigPaths：git 系统配置路径。
 */
function systemGitConfigPaths(configFileCandidates, baseDir, systemRoot, gitEnv) {
  return [
    ...configFileCandidates.filter((candidate) => candidate !== ""),
    ...getSystemGitConfigPaths(systemRoot, gitEnv),
  ].map((path) => resolveRelative(baseDir, path));
}
//@ chunk-91xvghb6.js:1941-2203 placement
function getSystemGitConfigPaths(systemRoot, gitEnv) {
  if (parseGitBoolEnv(getEnvCaseInsensitive(gitEnv, "GIT_CONFIG_NOSYSTEM"))) return [];
  let envCaseInsensitive = getEnvCaseInsensitive(gitEnv, "GIT_CONFIG_SYSTEM");
  let envCaseInsensitive_2 = getEnvCaseInsensitive(gitEnv, "PROGRAMDATA");
  let isWindows = getPlatform() === "windows";
  return [
    ...(envCaseInsensitive ? [envCaseInsensitive] : []),
    ...(isWindows ? [] : ["/etc/gitconfig"]),
    ...(systemRoot === null ? [] : [`${systemRoot}${sep}etc${sep}gitconfig`]),
    ...(isWindows && envCaseInsensitive_2 ? [`${envCaseInsensitive_2}${sep}Git${sep}config`] : []),
  ];
}
//@ chunk-91xvghb6.js:2203-2395 placement
/**
 * 按 git 的布尔解析规则解析环境变量值（true/yes/on 或非零整数为真）。
 */
function parseGitBoolEnv(envCaseInsensitive) {
  let lower = envCaseInsensitive?.trim().toLowerCase();
  if (lower === undefined || ["", "false", "no", "off"].includes(lower)) return false;
  if (["true", "yes", "on"].includes(lower)) return true;
  return /^[-+]?\d+$/.test(lower) && Number(lower) !== 0;
}
//@ chunk-91xvghb6.js:2395-2499 placement
function getProtectedTempDirs() {
  return normalizeCaseForComparison_2([
    claudeTempDir(),
    childProcessTmpDir(),
    ...getDefaultWritePaths().map((writePath) =>
      writePath === "~" || writePath.startsWith("~/") ? join(homedir(), writePath.slice(1)) : writePath,
    ),
  ]);
}
//@ chunk-91xvghb6.js:2499-2584 placement
function foreignSpellingInside(spelling, targetSpelling, foreignSpellings) {
  return foreignSpellings.find(
    (foreignPath) =>
      !isNetworkBrowsePath(foreignPath) &&
      classifyPathSpelling(foreignPath, targetSpelling).verdict === "foreign" &&
      isPathInside(foreignPath, spelling),
  );
}
//@ chunk-91xvghb6.js:2584-2735 placement
/**
 * 外部路径拼写尝试解析为本地落点。
 */
function resolveForeignSpelling(result, baseDir, foreignSpellings, { pattern = false } = {}) {
  if (result.verdict !== "foreign") return result;
  let insideSpelling = foreignSpellingInside(result.spelling, baseDir, foreignSpellings);
  return insideSpelling === undefined
    ? result
    : classifySpellingWithJunction(result.spelling, insideSpelling, getPlatform() === "windows", pattern);
}
//@ chunk-91xvghb6.js:2735-2873 placement
/**
 * 异步解析外部路径拼写。
 */
async function resolveForeignSpellingAsync(result, baseDir, foreignSpellings) {
  if (result.verdict !== "foreign") return result;
  let insideSpelling = foreignSpellingInside(result.spelling, baseDir, foreignSpellings);
  return insideSpelling === undefined
    ? result
    : classifySpellingWithJunctionAsync(result.spelling, insideSpelling, getPlatform() === "windows");
}
//@ chunk-91xvghb6.js:2873-3042 placement
/**
 * 主目录候选：HOME、Windows 的 HOMEDRIVE+HOMEPATH、os.homedir()，去重。
 */
function getHomeDirCandidates(gitEnv = process.env) {
  let envCaseInsensitive = getEnvCaseInsensitive(gitEnv, "HOME");
  let envCaseInsensitive_2 = getEnvCaseInsensitive(gitEnv, "HOMEDRIVE");
  let envCaseInsensitive_3 = getEnvCaseInsensitive(gitEnv, "HOMEPATH");
  return normalizeCaseForComparison_2(
    [
      envCaseInsensitive,
      getPlatform() === "windows" && envCaseInsensitive_2 && envCaseInsensitive_3
        ? `${envCaseInsensitive_2}${envCaseInsensitive_3}`
        : undefined,
      homedir(),
    ].filter((candidate) => Boolean(candidate)),
  );
}
//@ chunk-91xvghb6.js:3042-5058 placement
/**
 * 收集 git 相关受保护路径（GIT_DIR、hooks、config 等）。
 */
async function collectGitProtectedPaths(workTree, gitEnv, baseDir, paths = [], foreignSpellings = []) {
  let gitDir = gitEnv.GIT_DIR ?? join(baseDir, ".git");
  let GIT_COMMON_DIR = gitEnv.GIT_COMMON_DIR ?? gitDir;
  let resolveIfPresent = async (inputPath) =>
    hasBackslash(inputPath)
      ? null
      : realpath(inputPath).catch((error) => (getErrnoCode(error) === "ENOENT" ? inputPath : null));
  let results = await Promise.all(
    [[baseDir, resolve(workTree)], [gitDir], [GIT_COMMON_DIR]].map(async (paths) => [
      ...paths,
      ...(await Promise.all(paths.map(resolveIfPresent))),
    ]),
  );
  if (results.some((group) => group.includes(null))) return null;
  let [treePathSet, gitDirSet, commonDirSet] = results.map((group) =>
    normalizeCaseForComparison_2(group.filter((value) => value !== null)),
  );
  let classifySpelling = async (spelling) => {
    if (isDevFdPath(spelling))
      return {
        derived: [spelling],
      };
    let foreignSpelling = await resolveForeignSpellingAsync(
      await classifyPathSpelling_3(spelling, baseDir),
      baseDir,
      foreignSpellings,
    );
    if (foreignSpelling.verdict === "foreign")
      return {
        unexamined: spelling,
        detail: "it names another host than this checkout\u2019s or the owner\u2019s home and temp server",
      };
    if (foreignSpelling.verdict !== "local")
      return {
        unexamined: spelling,
        detail: `its route cannot be vouched for (${foreignSpelling.verdict})`,
      };
    return resolveDerived(foreignSpelling.spelling);
  };
  let resolveDerived = (inputPath) =>
    realpath(inputPath).then(
      (resolved) => ({
        resolved,
      }),
      async (error) => {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
          return deriveRealpathSpellings(inputPath, baseDir);
        let stats = await lstat(inputPath).catch(() => null);
        if (stats === null || stats.isDirectory())
          return {
            unexamined: inputPath,
            detail: errnoCode ?? errorMessage(error),
          };
        return stats.isSymbolicLink()
          ? deriveRealpathSpellings(inputPath, baseDir)
          : {
              derived: [inputPath],
            };
      },
    );
  let results_2 = await Promise.all(paths.map(classifySpelling));
  let found = results_2.find((unexamined) => "unexamined" in unexamined);
  if (found !== undefined) return found;
  let filtered = results_2
    .flatMap((result) => ("resolved" in result ? [result.resolved] : []))
    .filter((presolved) => isAbsolute(presolved));
  let filtered_2 = results_2
    .flatMap((result) => ("derived" in result ? result.derived : []))
    .filter((derived) => isAbsolute(derived));
  let extraSpellings = normalizeCaseForComparison_2([...paths, ...filtered, ...filtered_2]);
  let roots = normalizeCaseForComparison_2([
    ...treePathSet,
    ...gitDirSet,
    ...commonDirSet,
    ...extraSpellings,
  ]);
  let resolvedRoots =
    getPlatform() === "windows"
      ? []
      : await Promise.all(
          normalizeCaseForComparison_2([...treePathSet, ...gitDirSet, ...commonDirSet]).map(resolveIfPresent),
        );
  if (resolvedRoots.includes(null)) return null;
  let statPathIdentity = (inputPath, isRoot) =>
    stat(inputPath, {
      bigint: true,
    }).then(
      (filePath) => {
        let fileIdentity = getFileIdentity(filePath);
        return fileIdentity === undefined ? [] : [[fileIdentity, inputPath]];
      },
      async (error) => {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT" || (errnoCode === "ENOTDIR" && !isRoot)) return [];
        if (isRoot) return null;
        let stats = await lstat(inputPath).catch(() => null);
        return stats !== null && !stats.isDirectory()
          ? []
          : {
              unexamined: inputPath,
              detail: errnoCode ?? errorMessage(error),
            };
      },
    );
  let results_3 = await Promise.all([
    ...normalizeCaseForComparison_2(resolvedRoots.filter((root) => root !== null)).map((rootPath) =>
      statPathIdentity(rootPath, true),
    ),
    ...(getPlatform() === "windows"
      ? []
      : normalizeCaseForComparison_2(filtered).map((inputPath) => statPathIdentity(inputPath, false))),
  ]);
  if (results_3.includes(null)) return null;
  let found_2 = results_3.find((unexamined) => unexamined !== null && !Array.isArray(unexamined));
  if (found_2 !== undefined) return found_2;
  return {
    ids: new Map(results_3.filter((identityPairs) => Array.isArray(identityPairs)).flat()),
    roots,
    trees: treePathSet,
    fixed: normalizeCaseForComparison_2([
      ...gitDirSet.flatMap((gitDirPath) => [
        gitDirPath,
        join(gitDirPath, "config"),
        join(gitDirPath, "config.worktree"),
        join(gitDirPath, "commondir"),
      ]),
      ...commonDirSet.flatMap((commonDirPath) => [
        commonDirPath,
        join(commonDirPath, "config"),
        join(commonDirPath, "worktrees"),
      ]),
    ]),
  };
}
//@ chunk-91xvghb6.js:5058-5194 placement
async function deriveRealpathSpellings(inputPath, baseDir) {
  let resolved = await realpathOrAncestor(inputPath, baseDir);
  return resolved === null
    ? {
        unexamined: inputPath,
        detail: "it is too deep or too long to resolve",
      }
    : {
        derived: [inputPath, resolved],
      };
}
//@ chunk-91xvghb6.js:5194-5203 placement
var MAX_REALPATH_ANCESTOR_DEPTH = 8;
//@ chunk-91xvghb6.js:5203-5563 placement
/**
 * 解析真实路径，失败时按祖先回退（深度限制）。
 */
async function realpathOrAncestor(targetPath, baseDir, linkBudget = MAX_REALPATH_ANCESTOR_DEPTH, depth = 0) {
  if (isPathTooDeep(targetPath, depth)) return null;
  let real = await realpath(targetPath).catch(() => null);
  if (real !== null) return real;
  let linkTarget = linkBudget > 0 ? await readlink(targetPath).catch(() => null) : null;
  if (linkTarget !== null) {
    let parentReal = await realpath(dirname(targetPath)).catch(() => dirname(targetPath));
    let { spelling, verdict } = await classifyPathSpelling_2(linkTarget, parentReal, baseDir);
    return verdict === "local" ? realpathOrAncestor(spelling, baseDir, linkBudget - 1, depth) : targetPath;
  }
  let parentDir = dirname(targetPath);
  if (parentDir === targetPath) return targetPath;
  let resolvedParent = await realpathOrAncestor(parentDir, baseDir, linkBudget, depth + 1);
  return resolvedParent === null ? null : join(resolvedParent, basename(targetPath));
}
//@ chunk-91xvghb6.js:5563-5575 placement
/**
 * MAX_PROTECTED_PATH_LENGTH：受保护路径长度上限。
 */
var MAX_PROTECTED_PATH_LENGTH = 256;
//@ chunk-91xvghb6.js:5575-5622 placement
/**
 * 路径是否过深或过长。
 */
function isPathTooDeep(targetPath, depth) {
  return depth > MAX_PROTECTED_PATH_LENGTH || targetPath.length > 32767;
}
//@ chunk-91xvghb6.js:5622-5675 placement
function isDevFdPath(inputPath) {
  return getPlatform() === "macos" && isPathInside("/dev/fd", inputPath);
}
//@ chunk-91xvghb6.js:5675-5915 placement
/**
 * 并行检查候选路径是否可达受保护路径：返回第一个可达的路径；有无法判断的返回 null；都不可达返回 undefined。
 */
async function findReachableProtectedPath(gitPaths, candidates) {
  let results = await Promise.all(
    normalizeCaseForComparison_2(candidates.filter((candidate) => candidate !== null)).map(
      async (candidatePath) => ({
        path: candidatePath,
        reachable: await isProtectedPath(candidatePath, gitPaths),
      }),
    ),
  );
  let found = results.find(({ reachable }) => reachable === true);
  if (found !== undefined) return found.path;
  return results.some(({ reachable }) => reachable === null) ? null : undefined;
}
//@ chunk-91xvghb6.js:5915-5968 placement
function isWindowsDrivePath(inputPath) {
  return /^[A-Za-z]:[\\/][^:]*$/.test(inputPath);
}
//@ chunk-91xvghb6.js:5968-6015 placement
/**
 * Windows 上非盘符路径。
 */
function isWindowsNonDrivePath(inputPath) {
  return getPlatform() === "windows" && !isWindowsDrivePath(inputPath);
}
//@ chunk-91xvghb6.js:6015-6097 placement
/**
 * classifyPathSpelling：判定路径拼写的落点。
 */
function classifyPathSpelling(inputPath, baseDir, { pattern = false } = {}) {
  let isWindows = getPlatform() === "windows";
  return classifySpellingWithJunction(
    canonicalizePathSpelling(inputPath, isWindows),
    baseDir,
    isWindows,
    pattern,
  );
}
//@ chunk-91xvghb6.js:6097-6171 placement
function canonicalizePathSpelling(inputPath, isWindows) {
  return isWindows
    ? expandTilde(collapseDeviceNamespace(stripExtendedPathPrefix(expandWindowsEnvRefs(inputPath))))
    : expandTilde(inputPath).replace(/^\/\/+/, "/");
}
//@ chunk-91xvghb6.js:6171-6335 placement
/**
 * 同步判定路径拼写的落点：不透明链接文本为 opaque；否则规范为绝对路径后检查中间 UNC 联接点。
 */
function classifyPathSpellingSync(inputPath, baseDir, foreignSpellings) {
  let isWindows = getPlatform() === "windows";
  if (isOpaqueLinkText(inputPath, isWindows))
    return {
      spelling: inputPath,
      verdict: "opaque",
    };
  let { isAbsolute, join } = isWindows ? win32 : posix;
  let absolutePath = isAbsolute(inputPath) ? inputPath : join(baseDir, inputPath);
  return classifySpellingWithJunction(
    isWindows ? collapseDeviceNamespace(stripExtendedPathPrefix(absolutePath)) : absolutePath,
    foreignSpellings,
    isWindows,
  );
}
//@ chunk-91xvghb6.js:6335-6505 placement
async function classifyPathSpelling_2(inputPath, baseDir, foreignSpellings) {
  let isWindows = getPlatform() === "windows";
  if (isOpaqueLinkText(inputPath, isWindows))
    return {
      spelling: inputPath,
      verdict: "opaque",
    };
  let { isAbsolute, join } = isWindows ? win32 : posix;
  let absolutePath = isAbsolute(inputPath) ? inputPath : join(baseDir, inputPath);
  return classifySpellingWithJunctionAsync(
    isWindows ? collapseDeviceNamespace(stripExtendedPathPrefix(absolutePath)) : absolutePath,
    foreignSpellings,
    isWindows,
  );
}
//@ chunk-91xvghb6.js:6505-6623 placement
async function classifySpellingWithJunctionAsync(spelling, foreignSpellings, isWindows) {
  let syncResult = classifySpellingSync(spelling, foreignSpellings, isWindows);
  return "verdict" in syncResult
    ? syncResult
    : spellingVerdict(
        syncResult.spelling,
        await findIntermediateUncJunctionAsync(NodeFsOperations, syncResult.spelling, {
          anchor: foreignSpellings,
          ...SPELLING_VERDICT_LABELS,
        }),
        foreignSpellings,
      );
}
//@ chunk-91xvghb6.js:6623-6735 placement
function classifySpellingWithJunction(spelling, baseDir, isWindows, pattern = false) {
  let syncResult = classifySpellingSync(spelling, baseDir, isWindows, pattern);
  return "verdict" in syncResult
    ? syncResult
    : spellingVerdict(
        syncResult.spelling,
        findIntermediateUncJunction(NodeFsOperations, syncResult.spelling, {
          anchor: baseDir,
          ...SPELLING_VERDICT_LABELS,
        }),
        baseDir,
      );
}
//@ chunk-91xvghb6.js:6735-6876 placement
/**
 * 判断路径拼写的落点与裁定。
 */
async function classifyPathSpelling_3(inputPath, baseDir) {
  let isWindows = getPlatform() === "windows";
  let syncResult = classifySpellingSync(canonicalizePathSpelling(inputPath, isWindows), baseDir, isWindows);
  return "verdict" in syncResult
    ? syncResult
    : spellingVerdict(
        syncResult.spelling,
        await findIntermediateUncJunctionAsync(NodeFsOperations, syncResult.spelling, {
          anchor: baseDir,
          ...SPELLING_VERDICT_LABELS,
        }),
        baseDir,
      );
}
//@ chunk-91xvghb6.js:6876-6941 placement
var SPELLING_VERDICT_LABELS = {
  unreadableAncestry: "unverified",
  literalLinkText: "opaque",
};
//@ chunk-91xvghb6.js:6941-7397 placement
/**
 * 同步判断路径拼写（设备命名空间、UNC 等）。
 */
function classifySpellingSync(spelling, baseDir, isWindows, pattern = false) {
  if (isWindows) {
    let normalized = win32.normalize(spelling);
    if (/^[\\/]{2}[.?](?:[\\/]|$)/.test(normalized))
      return {
        spelling: normalized,
        verdict: "opaque",
      };
    if (isNonWslUncPath(normalized) && isForeignNetworkPath(normalized, baseDir))
      return {
        spelling: normalized,
        verdict: "foreign",
      };
  }
  let resolved = (isWindows ? win32 : posix).resolve(spelling);
  if (!isWindows && isMacSpecialPath(resolved))
    return {
      spelling: resolved,
      verdict: "opaque",
    };
  if (isForeignSpelling(resolved, baseDir))
    return {
      spelling: resolved,
      verdict: "foreign",
    };
  let parts = resolved.split("/");
  let globIndex = pattern ? parts.findIndex((segment) => containsGlobChars(segment)) : -1;
  let prefix = globIndex === -1 ? resolved : parts.slice(0, globIndex).join("/");
  return !isWindows && prefix.includes("\\")
    ? {
        spelling: resolved,
        verdict: "opaque",
      }
    : {
        spelling: resolved,
      };
}
//@ chunk-91xvghb6.js:7397-7597 placement
/**
 * 判断路径拼写是否指向锚点之外的"外部"位置（Windows 走 UNC 判定；POSIX 检查双斜杠、挂载点差异、互不包含等）。
 */
function isForeignSpelling(spelling, baseDir, browse = false) {
  if (getPlatform() === "windows")
    return isNonWslUncPath(spelling) && isForeignNetworkPath(spelling, baseDir);
  let inputPath = spelling.replace(/^\/{2,}/, "/");
  let baseMountRoots = networkMountRoots(baseDir);
  return (
    isUncOrDevicePath(inputPath) ||
    networkMountRoots(inputPath).some((root) => !baseMountRoots.includes(root)) ||
    (isUnmappedNetworkPath(inputPath) &&
      ((browse && isNetworkBrowsePath(inputPath)) ||
        (!isPathInside(inputPath, baseDir) && !isPathInside(baseDir, inputPath)))) ||
    isOtherHomeMount(inputPath, baseDir)
  );
}
//@ chunk-91xvghb6.js:7597-7893 placement
function spellingVerdict(spelling, intermediateUncJunction, baseDir) {
  if (intermediateUncJunction === undefined)
    return {
      spelling,
      verdict: "local",
    };
  if (intermediateUncJunction === spelling)
    return isForeignSpelling(spelling, baseDir)
      ? {
          spelling,
          verdict: "foreign",
        }
      : {
          spelling,
          verdict: "unreadable",
        };
  if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
    return {
      spelling,
      verdict: "unreadable",
    };
  if (intermediateUncJunction === OPAQUE_LINK_TEXT)
    return {
      spelling,
      verdict: "opaque",
    };
  return {
    spelling,
    verdict: "linked",
    via: intermediateUncJunction,
  };
}
//@ chunk-91xvghb6.js:7893-8057 placement
/**
 * 需要检查的路径拼写集合。
 */
function spellingsToCheck({ spelling, verdict, via }, baseDir) {
  if (verdict === "foreign") return [spelling];
  return getPlatform() === "windows"
    ? normalizeCaseForComparison_2([
        ...list,
        ...[spelling, baseDir, via ?? ""]
          .filter(isUncOrDevicePath)
          .map((rootPath) => win32.parse(rootPath).root),
      ])
    : ["/"];
}
//@ chunk-91xvghb6.js:8057-8138 placement
function isNetworkBrowsePath(inputPath) {
  return isNetDir(inputPath) || /^\/network(?:\/servers)?$/i.test(posix.resolve("/", inputPath));
}
//@ chunk-91xvghb6.js:8138-8174 placement
function isUnmappedNetworkPath(inputPath) {
  return isNetworkRelatedPath(inputPath) && !isNetworkMountRoot(inputPath);
}
//@ chunk-91xvghb6.js:8174-8237 placement
var list; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-91xvghb6.js:8174", () => {
  list = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ", (letter) => `${letter}:\\`);
});
//@ chunk-91xvghb6.js:8237-8600 placement
/**
 * 规范化 \\.\ 设备命名空间路径。
 */
function collapseDeviceNamespace(devicePath) {
  let match = /^[\\/]{2}\.(?:[\\/](.*))?$/s.exec(devicePath);
  if (match === null) return devicePath;
  let reduced = (match[1] ?? "").split(/[\\/]+/).reduce((acc, segment) => {
    if (segment === "..") acc.pop();
    else if (segment !== "" && segment !== ".") acc.push(segment);
    return acc;
  }, []);
  let [head = "", ...rest] = reduced;
  if (/^[A-Za-z]:$/.test(head)) return `${head}\\${rest.join("\\")}`;
  if (head.toUpperCase() === "UNC" && rest.length >= 2) return `\\\\${rest.join("\\")}`;
  return `\\\\.\\${reduced.join("\\")}`;
}
//@ chunk-91xvghb6.js:8600-8668 placement
function isOwnUid(uid) {
  return process.getuid === undefined || uid === process.getuid();
}
//@ chunk-91xvghb6.js:8668-8775 placement
async function isPossiblyWritable(filePath) {
  return access(filePath, constants.W_OK).then(
    () => true,
    (error) => !["EACCES", "EROFS", "EPERM"].includes(getErrnoCode(error) ?? ""),
  );
}
//@ chunk-91xvghb6.js:8775-8859 placement
/**
 * isWritableSharedFile：多硬链接且可写。
 */
async function isWritableSharedFile(filePath, stats) {
  return (
    !stats.isDirectory() && stats.nlink > 1 && (isOwnUid(stats.uid) || (await isPossiblyWritable(filePath)))
  );
}
//@ chunk-91xvghb6.js:8859-8936 placement (2.1.88 match: getFileIdentity, 0.795)
function getFileIdentity(filePath) {
  return filePath.isDirectory() && filePath.ino !== 0n ? `${filePath.dev}:${filePath.ino}` : undefined;
}
//@ chunk-91xvghb6.js:8936-8946 placement
var MAX_PROTECTED_ENTRY_CHECKS = 40;
//@ chunk-91xvghb6.js:8946-9797 placement
/**
 * 路径是否落在受保护位置。
 */
async function isProtectedPath(
  inputPath,
  gitPaths,
  linkBudget = MAX_PROTECTED_ENTRY_CHECKS,
  options = {
    secondNames: true,
  },
) {
  let { nestedRoot, replaceable, lands, asksForAnotherHost } = protectedRootMatchers(gitPaths);
  if (isSuspiciousProtectedPath(inputPath, gitPaths)) return true;
  if (getPlatform() === "windows" && inputPath !== resolve(inputPath))
    return isProtectedPath(resolve(inputPath), gitPaths, linkBudget, options);
  let { root } = parse(inputPath);
  let segments = relativeSegments(inputPath, root);
  let current = root;
  let linkTextClimbs = false;
  for (let [index, segment] of segments.entries()) {
    if (segment === "..") {
      if (linkTextClimbs) return true;
      current = dirname(current);
      continue;
    }
    let nextPath = join(current, segment);
    if (replaceable(nextPath) || asksForAnotherHost(nextPath)) return true;
    let { entry, alias } = await statProtectedEntry(nextPath, gitPaths, options.secondNames);
    switch (entry) {
      case null:
        return null;
      case "device":
        return nestedRoot(nextPath);
      case "shared":
        return true;
      case "shared_if_writable":
        if (await isPossiblyWritable(nextPath)) return true;
        linkTextClimbs = alias !== undefined && alias !== nextPath;
        current = alias ?? nextPath;
        break;
      case "sealed":
        linkTextClimbs = false;
        current = nextPath;
        break;
      case "absent":
        return lands(resolve(nextPath, ...segments.slice(index + 1)));
      case "link": {
        if (nestedRoot(nextPath)) return true;
        let linkTarget = await readlink(nextPath).catch(() => null);
        if (linkTarget === null || linkBudget === 0) return null;
        let normalizedTarget = normalizeGitdirPointer(nextPath, linkTarget);
        if (normalizedTarget === null) return true;
        let nextSegments = [resolveRelative(current, normalizedTarget), ...segments.slice(index + 1)];
        return isProtectedPath(nextSegments.join(sep), gitPaths, linkBudget - 1, options);
      }
      case "entry":
        linkTextClimbs = alias !== undefined && alias !== nextPath;
        current = alias ?? nextPath;
    }
  }
  return lands(current);
}
//@ chunk-91xvghb6.js:9797-9898 placement
function relativeSegments(inputPath, root) {
  return inputPath
    .slice(root.length)
    .split(sep === "/" ? /\/+/ : /[\\/]+/)
    .filter((segment) => segment !== "" && segment !== ".");
}
//@ chunk-91xvghb6.js:9898-10223 placement
/**
 * 受保护根的匹配器（内部、相等、固定）。
 */
function protectedRootMatchers(gitPaths) {
  let isInsideAny = (candidate) => gitPaths.roots.some((root) => isPathInside(root, candidate));
  let isRootItself = (candidate) =>
    gitPaths.roots.some((root) => isPathInside(root, candidate) && isPathInside(candidate, root));
  let isFixed = (candidate) => gitPaths.fixed.includes(candidate);
  return {
    inside: isInsideAny,
    kept: isFixed,
    nestedRoot: (candidate) =>
      isRootItself(candidate) &&
      !isFixed(candidate) &&
      gitPaths.roots.some((root) => isPathInside(root, candidate) && !isPathInside(candidate, root)),
    replaceable: (candidate) => isInsideAny(candidate) && !isRootItself(candidate) && !isFixed(candidate),
    lands: (candidate) => isInsideAny(candidate) && !isFixed(candidate),
    asksForAnotherHost: (candidate) => gitPaths.roots.every((root) => isForeignSpelling(candidate, root)),
  };
}
//@ chunk-91xvghb6.js:10223-10315 placement
function isSuspiciousProtectedPath(inputPath, gitPaths) {
  return (
    !isAbsolute(inputPath) ||
    isWindowsNonDrivePath(inputPath) ||
    gitPaths.roots.every((root) => isForeignSpelling(inputPath, root, true)) ||
    inputPath.includes("\uFFFD")
  );
}
//@ chunk-91xvghb6.js:10315-10712 placement
/**
 * 读取受保护条目状态与身份。
 */
async function statProtectedEntry(inputPath, gitPaths, secondNames) {
  let alias;
  return {
    entry: await lstat(inputPath, {
      bigint: true,
    }).then(
      (filePath) => {
        let fileIdentity = getFileIdentity(filePath);
        alias = fileIdentity === undefined ? undefined : gitPaths.ids.get(fileIdentity);
        return filePath.isSymbolicLink()
          ? "link"
          : filePath.isCharacterDevice()
            ? "device"
            : secondNames && !filePath.isDirectory() && filePath.nlink > 1n
              ? isOwnUid(Number(filePath.uid))
                ? "shared"
                : "shared_if_writable"
              : "entry";
      },
      (error) => {
        let errnoCode = getErrnoCode(error);
        return errnoCode === "ENOENT" || errnoCode === "ENOTDIR"
          ? "absent"
          : ["EACCES", "EPERM"].includes(errnoCode ?? "")
            ? "sealed"
            : null;
      },
    ),
    alias,
  };
}
//@ chunk-91xvghb6.js:10712-10928 placement
function normalizeGitdirPointer(pointerPath, linkText) {
  let isWindows = getPlatform() === "windows";
  let drivePrefix = isWindows ? /^[A-Za-z]:/.exec(pointerPath)?.[0] : undefined;
  if (isWindows && /^[A-Za-z]:(?![\\/])/.test(linkText)) return null;
  let target =
    drivePrefix !== undefined && /^[\\/](?![\\/])/.test(linkText) ? `${drivePrefix}${linkText}` : linkText;
  return target.includes("\uFFFD") ? null : target;
}
//@ chunk-91xvghb6.js:10928-11011 placement
/**
 * 解析 .git 文件中的 gitdir 指针。
 */
function readGitdirPointer(content) {
  let line = cleanSingleLine(content);
  return line === null ? undefined : /^gitdir: (.+)$/s.exec(line)?.[1];
}
//@ chunk-91xvghb6.js:11011-11131 placement
/**
 * 去掉末尾换行并拒绝含控制字符的值。
 */
function cleanSingleLine(text) {
  if (text === undefined) return null;
  let replaced = text.replace(/[\r\n]+$/, "");
  return replaced === "" || /[\r\n\0\uFFFD]/.test(replaced) ? null : replaced;
}
//@ chunk-91xvghb6.js:11131-11178 placement
/**
 * 相对路径基于目录解析。
 */
function resolveRelative(baseDir, path) {
  return isAbsolute(path) ? path : `${baseDir}${sep}${path}`;
}
//@ chunk-91xvghb6.js:11178-11393 placement
/**
 * 路径是否在目录内（大小写不敏感平台归一）。
 */
function isPathInside(parentPath, childPath) {
  if (!isAbsolute(childPath)) return false;
  let platform = getPlatform();
  let caseInsensitive = platform === "macos" || platform === "windows";
  let normalizeCase = (text) => (caseInsensitive ? text.normalize("NFC").toLowerCase() : text);
  let relativePath = relative(normalizeCase(parentPath), normalizeCase(childPath));
  let escapesParent =
    relativePath === ".." || relativePath.startsWith(`..${sep}`) || relativePath.startsWith("../");
  return relativePath === "" || (!escapesParent && !isAbsolute(relativePath));
}
//@ chunk-91xvghb6.js:11393-11690 placement
var PROJECT_SETTING_SOURCES; // deferred: uses PROTECTED_ENV_VARS of its import cycle while loading; runs once the cycle is complete
var TMPDIR_ENV_VARS;
var HOME_ENV_VARS;
var GIT_CONFIG_ENV_VARS;
var PROTECTED_ENV_VARS_2;
deferInit("chunk-91xvghb6.js:11393", () => {
  PROJECT_SETTING_SOURCES = ["projectSettings", "localSettings"];
  TMPDIR_ENV_VARS = ["CLAUDE_CODE_TMPDIR", "TMPDIR", "TEMP", "TMP"];
  HOME_ENV_VARS = [
    "CLAUDE_CONFIG_DIR",
    "HOME",
    "USERPROFILE",
    "HOMEDRIVE",
    "HOMEPATH",
    "CLAUDE_CODE_USE_COWORK_PLUGINS",
  ];
  GIT_CONFIG_ENV_VARS = ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"];
  PROTECTED_ENV_VARS_2 = [
    ...GIT_CONFIG_ENV_VARS,
    ...HOME_ENV_VARS,
    ...TMPDIR_ENV_VARS,
    "XDG_CONFIG_HOME",
    "PATH",
    ...PROTECTED_ENV_VARS,
  ];
});
export {
  resolveForeignSpellingAsync,
  classifyPathSpelling_3,
  spellingsToCheck,
  PROTECTED_ENV_VARS,
  GIT_CONFIG_ENV_VARS,
  parseGitBoolEnv,
  PROJECT_SETTING_SOURCES,
  HOME_ENV_VARS,
  getProtectedTempDirs,
  classifyPathSpelling,
  resolveForeignSpelling,
  isPathTooDeep,
  isPathInside,
  MAX_PROTECTED_PATH_LENGTH,
  classifyPathSpellingSync,
  isForeignSpelling,
  isWindowsNonDrivePath,
  collectGitProtectedPaths,
  getGitConfigPaths,
  systemGitConfigPaths,
  findReachableProtectedPath,
  getHomeDirCandidates,
  resolveRelative,
  cleanSingleLine,
  isWritableSharedFile,
  readGitdirPointer,
  PROTECTED_ENV_VARS_2,
};
