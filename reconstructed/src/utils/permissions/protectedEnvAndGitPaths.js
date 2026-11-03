/**
 * utils/permissions/protectedEnvAndGitPaths.ts
 *
 * 2.1.316 新增：收集 git 相关受保护路径（GIT_DIR、hooks、config 等）；路径是否落在受保护位置等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7wdbg1ct.js (52)
 * attribution: placement 52
 */
import { sep, join, resolve, isAbsolute, dirname, basename, win32, posix, parse, relative } from "path";
import { homedir } from "os";
import { realpath, lstat, stat, readlink, access } from "fs/promises";
import { constants } from "fs";
import { getEnvCaseInsensitive } from "../plugins/securityDefaultPlugin.js";
import { getPlatform } from "../platform.js";
import { uniq } from "../collections.js";
import { claudeTempDir, childProcessTmpDir } from "../tempDir.js";
import {
  getDefaultWritePaths,
  Nqt,
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

//@ chunk-7wdbg1ct.js:933-1347 placement
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
//@ chunk-7wdbg1ct.js:1652-1909 placement
/**
 * 列出会影响 git 的配置文件路径：额外路径、系统配置、GIT_CONFIG_GLOBAL、各主目录下的 XDG 与 ~/.gitconfig，按 cwd 解析为绝对路径。
 */
function getGitConfigPaths(n, e, o, gitEnv = process.env) {
  let envCaseInsensitive = getEnvCaseInsensitive(gitEnv, "GIT_CONFIG_GLOBAL");
  let envCaseInsensitive_2 = getEnvCaseInsensitive(gitEnv, "XDG_CONFIG_HOME");
  return [
    ...n.filter((u) => u !== ""),
    ...getSystemGitConfigPaths(o, gitEnv),
    ...(envCaseInsensitive ? [envCaseInsensitive] : []),
    ...getHomeDirCandidates(gitEnv).flatMap((u) => [
      `${envCaseInsensitive_2 || `${u}${sep}.config`}${sep}git${sep}config`,
      `${u}${sep}.gitconfig`,
    ]),
  ].map((u) => resolveRelative(e, u));
}
//@ chunk-7wdbg1ct.js:1909-1994 placement
/**
 * systemGitConfigPaths：git 系统配置路径。
 */
function systemGitConfigPaths(n, e, o, r) {
  return [...n.filter((i) => i !== ""), ...getSystemGitConfigPaths(o, r)].map((i) => resolveRelative(e, i));
}
//@ chunk-7wdbg1ct.js:1994-2256 placement
function getSystemGitConfigPaths(n, e) {
  if (parseGitBoolEnv(getEnvCaseInsensitive(e, "GIT_CONFIG_NOSYSTEM"))) return [];
  let envCaseInsensitive = getEnvCaseInsensitive(e, "GIT_CONFIG_SYSTEM");
  let envCaseInsensitive_2 = getEnvCaseInsensitive(e, "PROGRAMDATA");
  let i = getPlatform() === "windows";
  return [
    ...(envCaseInsensitive ? [envCaseInsensitive] : []),
    ...(i ? [] : ["/etc/gitconfig"]),
    ...(n === null ? [] : [`${n}${sep}etc${sep}gitconfig`]),
    ...(i && envCaseInsensitive_2 ? [`${envCaseInsensitive_2}${sep}Git${sep}config`] : []),
  ];
}
//@ chunk-7wdbg1ct.js:2256-2448 placement
/**
 * 按 git 的布尔解析规则解析环境变量值（true/yes/on 或非零整数为真）。
 */
function parseGitBoolEnv(envCaseInsensitive) {
  let lower = envCaseInsensitive?.trim().toLowerCase();
  if (lower === undefined || ["", "false", "no", "off"].includes(lower)) return false;
  if (["true", "yes", "on"].includes(lower)) return true;
  return /^[-+]?\d+$/.test(lower) && Number(lower) !== 0;
}
//@ chunk-7wdbg1ct.js:2448-2552 placement
function getProtectedTempDirs() {
  return uniq([
    claudeTempDir(),
    childProcessTmpDir(),
    ...getDefaultWritePaths().map((n) => (n === "~" || n.startsWith("~/") ? join(homedir(), n.slice(1)) : n)),
  ]);
}
//@ chunk-7wdbg1ct.js:2552-2637 placement
function foreignSpellingInside(spelling, e, o) {
  return o.find(
    (r) =>
      !isNetworkBrowsePath(r) &&
      classifyPathSpelling(r, e).verdict === "foreign" &&
      isPathInside(r, spelling),
  );
}
//@ chunk-7wdbg1ct.js:2637-2788 placement
/**
 * 外部路径拼写尝试解析为本地落点。
 */
function resolveForeignSpelling(n, e, o, { pattern: r = false } = {}) {
  if (n.verdict !== "foreign") return n;
  let i = foreignSpellingInside(n.spelling, e, o);
  return i === undefined ? n : classifySpellingWithJunction(n.spelling, i, getPlatform() === "windows", r);
}
//@ chunk-7wdbg1ct.js:2788-2926 placement
/**
 * 异步解析外部路径拼写。
 */
async function resolveForeignSpellingAsync(n, e, o) {
  if (n.verdict !== "foreign") return n;
  let r = foreignSpellingInside(n.spelling, e, o);
  return r === undefined ? n : classifySpellingWithJunctionAsync(n.spelling, r, getPlatform() === "windows");
}
//@ chunk-7wdbg1ct.js:2926-3095 placement
/**
 * 主目录候选：HOME、Windows 的 HOMEDRIVE+HOMEPATH、os.homedir()，去重。
 */
function getHomeDirCandidates(n = process.env) {
  let envCaseInsensitive = getEnvCaseInsensitive(n, "HOME");
  let envCaseInsensitive_2 = getEnvCaseInsensitive(n, "HOMEDRIVE");
  let envCaseInsensitive_3 = getEnvCaseInsensitive(n, "HOMEPATH");
  return uniq(
    [
      envCaseInsensitive,
      getPlatform() === "windows" && envCaseInsensitive_2 && envCaseInsensitive_3
        ? `${envCaseInsensitive_2}${envCaseInsensitive_3}`
        : undefined,
      homedir(),
    ].filter((i) => Boolean(i)),
  );
}
//@ chunk-7wdbg1ct.js:3095-5111 placement
/**
 * 收集 git 相关受保护路径（GIT_DIR、hooks、config 等）。
 */
async function collectGitProtectedPaths(workTree, e, workTree_2, r = [], i = []) {
  let s = e.GIT_DIR ?? join(workTree_2, ".git");
  let GIT_COMMON_DIR = e.GIT_COMMON_DIR ?? s;
  let l = async (a) =>
    hasBackslash(a) ? null : realpath(a).catch((error) => (getErrnoCode(error) === "ENOENT" ? a : null));
  let results = await Promise.all(
    [[workTree_2, resolve(workTree)], [s], [GIT_COMMON_DIR]].map(async (a) => [
      ...a,
      ...(await Promise.all(a.map(l))),
    ]),
  );
  if (results.some((a) => a.includes(null))) return null;
  let [y, R, m] = results.map((a) => uniq(a.filter((g) => g !== null)));
  let S = async (a) => {
    if (isDevFdPath(a))
      return {
        derived: [a],
      };
    let foreignSpelling = await resolveForeignSpellingAsync(
      await classifyPathSpelling_3(a, workTree_2),
      workTree_2,
      i,
    );
    if (foreignSpelling.verdict === "foreign")
      return {
        unexamined: a,
        detail: "it names another host than this checkout\u2019s or the owner\u2019s home and temp server",
      };
    if (foreignSpelling.verdict !== "local")
      return {
        unexamined: a,
        detail: `its route cannot be vouched for (${foreignSpelling.verdict})`,
      };
    return D(foreignSpelling.spelling);
  };
  let D = (spelling) =>
    realpath(spelling).then(
      (resolved) => ({
        resolved,
      }),
      async (error) => {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
          return deriveRealpathSpellings(spelling, workTree_2);
        let E = await lstat(spelling).catch(() => null);
        if (E === null || E.isDirectory())
          return {
            unexamined: spelling,
            detail: errnoCode ?? errorMessage(error),
          };
        return E.isSymbolicLink()
          ? deriveRealpathSpellings(spelling, workTree_2)
          : {
              derived: [spelling],
            };
      },
    );
  let results_2 = await Promise.all(r.map(S));
  let found = results_2.find((a) => "unexamined" in a);
  if (found !== undefined) return found;
  let filtered = results_2.flatMap((a) => ("resolved" in a ? [a.resolved] : [])).filter((a) => isAbsolute(a));
  let filtered_2 = results_2.flatMap((a) => ("derived" in a ? a.derived : [])).filter((a) => isAbsolute(a));
  let v = uniq([...r, ...filtered, ...filtered_2]);
  let roots = uniq([...y, ...R, ...m, ...v]);
  let x = getPlatform() === "windows" ? [] : await Promise.all(uniq([...y, ...R, ...m]).map(l));
  if (x.includes(null)) return null;
  let Z = (a, g) =>
    stat(a, {
      bigint: true,
    }).then(
      (filePath) => {
        let fileIdentity = getFileIdentity(filePath);
        return fileIdentity === undefined ? [] : [[fileIdentity, a]];
      },
      async (error) => {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT" || (errnoCode === "ENOTDIR" && !g)) return [];
        if (g) return null;
        let nn = await lstat(a).catch(() => null);
        return nn !== null && !nn.isDirectory()
          ? []
          : {
              unexamined: a,
              detail: errnoCode ?? errorMessage(error),
            };
      },
    );
  let results_3 = await Promise.all([
    ...uniq(x.filter((a) => a !== null)).map((a) => Z(a, true)),
    ...(getPlatform() === "windows" ? [] : uniq(filtered).map((a) => Z(a, false))),
  ]);
  if (results_3.includes(null)) return null;
  let found_2 = results_3.find((a) => a !== null && !Array.isArray(a));
  if (found_2 !== undefined) return found_2;
  return {
    ids: new Map(results_3.filter((a) => Array.isArray(a)).flat()),
    roots,
    trees: y,
    fixed: uniq([
      ...R.flatMap((a) => [a, join(a, "config"), join(a, "config.worktree"), join(a, "commondir")]),
      ...m.flatMap((a) => [a, join(a, "config"), join(a, "worktrees")]),
    ]),
  };
}
//@ chunk-7wdbg1ct.js:5111-5247 placement
async function deriveRealpathSpellings(n, e) {
  let o = await realpathOrAncestor(n, e);
  return o === null
    ? {
        unexamined: n,
        detail: "it is too deep or too long to resolve",
      }
    : {
        derived: [n, o],
      };
}
//@ chunk-7wdbg1ct.js:5247-5256 placement
var MAX_REALPATH_ANCESTOR_DEPTH = 8;
//@ chunk-7wdbg1ct.js:5256-5616 placement
/**
 * 解析真实路径，失败时按祖先回退（深度限制）。
 */
async function realpathOrAncestor(n, e, o = MAX_REALPATH_ANCESTOR_DEPTH, r = 0) {
  if (isPathTooDeep(n, r)) return null;
  let i = await realpath(n).catch(() => null);
  if (i !== null) return i;
  let s = o > 0 ? await readlink(n).catch(() => null) : null;
  if (s !== null) {
    let c = await realpath(dirname(n)).catch(() => dirname(n));
    let { spelling, verdict } = await classifyPathSpelling_2(s, c, e);
    return verdict === "local" ? realpathOrAncestor(spelling, e, o - 1, r) : n;
  }
  let u = dirname(n);
  if (u === n) return n;
  let l = await realpathOrAncestor(u, e, o, r + 1);
  return l === null ? null : join(l, basename(n));
}
//@ chunk-7wdbg1ct.js:5616-5628 placement
/**
 * MAX_PROTECTED_PATH_LENGTH：受保护路径长度上限。
 */
var MAX_PROTECTED_PATH_LENGTH = 256;
//@ chunk-7wdbg1ct.js:5628-5675 placement
/**
 * 路径是否过深或过长。
 */
function isPathTooDeep(n, e) {
  return e > MAX_PROTECTED_PATH_LENGTH || n.length > 32767;
}
//@ chunk-7wdbg1ct.js:5675-5728 placement
function isDevFdPath(n) {
  return getPlatform() === "macos" && isPathInside("/dev/fd", n);
}
//@ chunk-7wdbg1ct.js:5728-5968 placement
/**
 * 并行检查候选路径是否可达受保护路径：返回第一个可达的路径；有无法判断的返回 null；都不可达返回 undefined。
 */
async function findReachableProtectedPath(gitProtectedPaths, e) {
  let results = await Promise.all(
    uniq(e.filter((i) => i !== null)).map(async (i) => ({
      path: i,
      reachable: await isProtectedPath(i, gitProtectedPaths),
    })),
  );
  let found = results.find(({ reachable }) => reachable === true);
  if (found !== undefined) return found.path;
  return results.some(({ reachable }) => reachable === null) ? null : undefined;
}
//@ chunk-7wdbg1ct.js:5968-6021 placement
function isWindowsDrivePath(n) {
  return /^[A-Za-z]:[\\/][^:]*$/.test(n);
}
//@ chunk-7wdbg1ct.js:6021-6068 placement
/**
 * Windows 上非盘符路径。
 */
function isWindowsNonDrivePath(n) {
  return getPlatform() === "windows" && !isWindowsDrivePath(n);
}
//@ chunk-7wdbg1ct.js:6068-6150 placement
/**
 * classifyPathSpelling：判定路径拼写的落点。
 */
function classifyPathSpelling(n, e, { pattern: o = false } = {}) {
  let r = getPlatform() === "windows";
  return classifySpellingWithJunction(canonicalizePathSpelling(n, r), e, r, o);
}
//@ chunk-7wdbg1ct.js:6150-6224 placement
function canonicalizePathSpelling(n, e) {
  return e
    ? Nqt(collapseDeviceNamespace(stripExtendedPathPrefix(expandWindowsEnvRefs(n))))
    : Nqt(n).replace(/^\/\/+/, "/");
}
//@ chunk-7wdbg1ct.js:6224-6388 placement
/**
 * 同步判定路径拼写的落点：不透明链接文本为 opaque；否则规范为绝对路径后检查中间 UNC 联接点。
 */
function classifyPathSpellingSync(n, e, o) {
  let r = getPlatform() === "windows";
  if (isOpaqueLinkText(n, r))
    return {
      spelling: n,
      verdict: "opaque",
    };
  let { isAbsolute, join } = r ? win32 : posix;
  let u = isAbsolute(n) ? n : join(e, n);
  return classifySpellingWithJunction(r ? collapseDeviceNamespace(stripExtendedPathPrefix(u)) : u, o, r);
}
//@ chunk-7wdbg1ct.js:6388-6558 placement
async function classifyPathSpelling_2(n, e, o) {
  let r = getPlatform() === "windows";
  if (isOpaqueLinkText(n, r))
    return {
      spelling: n,
      verdict: "opaque",
    };
  let { isAbsolute, join } = r ? win32 : posix;
  let u = isAbsolute(n) ? n : join(e, n);
  return classifySpellingWithJunctionAsync(r ? collapseDeviceNamespace(stripExtendedPathPrefix(u)) : u, o, r);
}
//@ chunk-7wdbg1ct.js:6558-6676 placement
async function classifySpellingWithJunctionAsync(n, e, o) {
  let r = classifySpellingSync(n, e, o);
  return "verdict" in r
    ? r
    : spellingVerdict(
        r.spelling,
        await findIntermediateUncJunctionAsync(NodeFsOperations, r.spelling, {
          anchor: e,
          ...SPELLING_VERDICT_LABELS,
        }),
        e,
      );
}
//@ chunk-7wdbg1ct.js:6676-6788 placement
function classifySpellingWithJunction(n, e, o, r = false) {
  let i = classifySpellingSync(n, e, o, r);
  return "verdict" in i
    ? i
    : spellingVerdict(
        i.spelling,
        findIntermediateUncJunction(NodeFsOperations, i.spelling, {
          anchor: e,
          ...SPELLING_VERDICT_LABELS,
        }),
        e,
      );
}
//@ chunk-7wdbg1ct.js:6788-6929 placement
/**
 * 判断路径拼写的落点与裁定。
 */
async function classifyPathSpelling_3(n, e) {
  let o = getPlatform() === "windows";
  let r = classifySpellingSync(canonicalizePathSpelling(n, o), e, o);
  return "verdict" in r
    ? r
    : spellingVerdict(
        r.spelling,
        await findIntermediateUncJunctionAsync(NodeFsOperations, r.spelling, {
          anchor: e,
          ...SPELLING_VERDICT_LABELS,
        }),
        e,
      );
}
//@ chunk-7wdbg1ct.js:6929-6994 placement
var SPELLING_VERDICT_LABELS = {
  unreadableAncestry: "unverified",
  literalLinkText: "opaque",
};
//@ chunk-7wdbg1ct.js:6994-7450 placement
/**
 * 同步判断路径拼写（设备命名空间、UNC 等）。
 */
function classifySpellingSync(n, e, o, r = false) {
  if (o) {
    let normalized = win32.normalize(n);
    if (/^[\\/]{2}[.?](?:[\\/]|$)/.test(normalized))
      return {
        spelling: normalized,
        verdict: "opaque",
      };
    if (isNonWslUncPath(normalized) && isForeignNetworkPath(normalized, e))
      return {
        spelling: normalized,
        verdict: "foreign",
      };
  }
  let resolved = (o ? win32 : posix).resolve(n);
  if (!o && isMacSpecialPath(resolved))
    return {
      spelling: resolved,
      verdict: "opaque",
    };
  if (isForeignSpelling(resolved, e))
    return {
      spelling: resolved,
      verdict: "foreign",
    };
  let parts = resolved.split("/");
  let u = r ? parts.findIndex((c) => containsGlobChars(c)) : -1;
  let l = u === -1 ? resolved : parts.slice(0, u).join("/");
  return !o && l.includes("\\")
    ? {
        spelling: resolved,
        verdict: "opaque",
      }
    : {
        spelling: resolved,
      };
}
//@ chunk-7wdbg1ct.js:7450-7650 placement
/**
 * 判断路径拼写是否指向锚点之外的"外部"位置（Windows 走 UNC 判定；POSIX 检查双斜杠、挂载点差异、互不包含等）。
 */
function isForeignSpelling(n, e, o = false) {
  if (getPlatform() === "windows") return isNonWslUncPath(n) && isForeignNetworkPath(n, e);
  let replaced = n.replace(/^\/{2,}/, "/");
  let i = networkMountRoots(e);
  return (
    isUncOrDevicePath(replaced) ||
    networkMountRoots(replaced).some((s) => !i.includes(s)) ||
    (isUnmappedNetworkPath(replaced) &&
      ((o && isNetworkBrowsePath(replaced)) || (!isPathInside(replaced, e) && !isPathInside(e, replaced)))) ||
    isOtherHomeMount(replaced, e)
  );
}
//@ chunk-7wdbg1ct.js:7650-7946 placement
function spellingVerdict(spelling, intermediateUncJunction, o) {
  if (intermediateUncJunction === undefined)
    return {
      spelling,
      verdict: "local",
    };
  if (intermediateUncJunction === spelling)
    return isForeignSpelling(spelling, o)
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
//@ chunk-7wdbg1ct.js:7946-8110 placement
/**
 * 需要检查的路径拼写集合。
 */
function spellingsToCheck({ spelling, verdict, via }, r) {
  if (verdict === "foreign") return [spelling];
  return getPlatform() === "windows"
    ? uniq([...list, ...[spelling, r, via ?? ""].filter(isUncOrDevicePath).map((i) => win32.parse(i).root)])
    : ["/"];
}
//@ chunk-7wdbg1ct.js:8110-8191 placement
function isNetworkBrowsePath(n) {
  return isNetDir(n) || /^\/network(?:\/servers)?$/i.test(posix.resolve("/", n));
}
//@ chunk-7wdbg1ct.js:8191-8227 placement
function isUnmappedNetworkPath(n) {
  return isNetworkRelatedPath(n) && !isNetworkMountRoot(n);
}
//@ chunk-7wdbg1ct.js:8227-8290 placement
var list = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ", (n) => `${n}:\\`);
//@ chunk-7wdbg1ct.js:8290-8653 placement
/**
 * 规范化 \\.\ 设备命名空间路径。
 */
function collapseDeviceNamespace(n) {
  let match = /^[\\/]{2}\.(?:[\\/](.*))?$/s.exec(n);
  if (match === null) return n;
  let reduced = (match[1] ?? "").split(/[\\/]+/).reduce((acc, u) => {
    if (u === "..") acc.pop();
    else if (u !== "" && u !== ".") acc.push(u);
    return acc;
  }, []);
  let [r = "", ...i] = reduced;
  if (/^[A-Za-z]:$/.test(r)) return `${r}\\${i.join("\\")}`;
  if (r.toUpperCase() === "UNC" && i.length >= 2) return `\\\\${i.join("\\")}`;
  return `\\\\.\\${reduced.join("\\")}`;
}
//@ chunk-7wdbg1ct.js:8653-8721 placement
function isOwnUid(uid) {
  return process.getuid === undefined || uid === process.getuid();
}
//@ chunk-7wdbg1ct.js:8721-8828 placement
async function isPossiblyWritable(n) {
  return access(n, constants.W_OK).then(
    () => true,
    (error) => !["EACCES", "EROFS", "EPERM"].includes(getErrnoCode(error) ?? ""),
  );
}
//@ chunk-7wdbg1ct.js:8828-8912 placement
/**
 * isWritableSharedFile：多硬链接且可写。
 */
async function isWritableSharedFile(n, e) {
  return !e.isDirectory() && e.nlink > 1 && (isOwnUid(e.uid) || (await isPossiblyWritable(n)));
}
//@ chunk-7wdbg1ct.js:8912-8989 placement = getFileIdentity (0.794)
function getFileIdentity(filePath) {
  return filePath.isDirectory() && filePath.ino !== 0n ? `${filePath.dev}:${filePath.ino}` : undefined;
}
//@ chunk-7wdbg1ct.js:8989-8999 placement
var MAX_PROTECTED_ENTRY_CHECKS = 40;
//@ chunk-7wdbg1ct.js:8999-9850 placement
/**
 * 路径是否落在受保护位置。
 */
async function isProtectedPath(
  n,
  e,
  o = MAX_PROTECTED_ENTRY_CHECKS,
  r = {
    secondNames: true,
  },
) {
  let { nestedRoot, replaceable, lands, asksForAnotherHost } = protectedRootMatchers(e);
  if (isSuspiciousProtectedPath(n, e)) return true;
  if (getPlatform() === "windows" && n !== resolve(n)) return isProtectedPath(resolve(n), e, o, r);
  let { root } = parse(n);
  let R = relativeSegments(n, root);
  let m = root;
  let S = false;
  for (let [D, T] of R.entries()) {
    if (T === "..") {
      if (S) return true;
      m = dirname(m);
      continue;
    }
    let f = join(m, T);
    if (replaceable(f) || asksForAnotherHost(f)) return true;
    let { entry, alias } = await statProtectedEntry(f, e, r.secondNames);
    switch (entry) {
      case null:
        return null;
      case "device":
        return nestedRoot(f);
      case "shared":
        return true;
      case "shared_if_writable":
        if (await isPossiblyWritable(f)) return true;
        S = alias !== undefined && alias !== f;
        m = alias ?? f;
        break;
      case "sealed":
        S = false;
        m = f;
        break;
      case "absent":
        return lands(resolve(f, ...R.slice(D + 1)));
      case "link": {
        if (nestedRoot(f)) return true;
        let v = await readlink(f).catch(() => null);
        if (v === null || o === 0) return null;
        let A = normalizeGitdirPointer(f, v);
        if (A === null) return true;
        let x = [resolveRelative(m, A), ...R.slice(D + 1)];
        return isProtectedPath(x.join(sep), e, o - 1, r);
      }
      case "entry":
        S = alias !== undefined && alias !== f;
        m = alias ?? f;
    }
  }
  return lands(m);
}
//@ chunk-7wdbg1ct.js:9850-9951 placement
function relativeSegments(n, root) {
  return n
    .slice(root.length)
    .split(sep === "/" ? /\/+/ : /[\\/]+/)
    .filter((o) => o !== "" && o !== ".");
}
//@ chunk-7wdbg1ct.js:9951-10276 placement
/**
 * 受保护根的匹配器（内部、相等、固定）。
 */
function protectedRootMatchers(n) {
  let e = (i) => n.roots.some((root) => isPathInside(root, i));
  let o = (i) => n.roots.some((root) => isPathInside(root, i) && isPathInside(i, root));
  let r = (i) => n.fixed.includes(i);
  return {
    inside: e,
    kept: r,
    nestedRoot: (i) =>
      o(i) && !r(i) && n.roots.some((root) => isPathInside(root, i) && !isPathInside(i, root)),
    replaceable: (i) => e(i) && !o(i) && !r(i),
    lands: (i) => e(i) && !r(i),
    asksForAnotherHost: (i) => n.roots.every((root) => isForeignSpelling(i, root)),
  };
}
//@ chunk-7wdbg1ct.js:10276-10368 placement
function isSuspiciousProtectedPath(n, e) {
  return (
    !isAbsolute(n) ||
    isWindowsNonDrivePath(n) ||
    e.roots.every((root) => isForeignSpelling(n, root, true)) ||
    n.includes("\uFFFD")
  );
}
//@ chunk-7wdbg1ct.js:10368-10765 placement
/**
 * 读取受保护条目状态与身份。
 */
async function statProtectedEntry(n, e, secondNames) {
  let alias;
  return {
    entry: await lstat(n, {
      bigint: true,
    }).then(
      (filePath) => {
        let fileIdentity = getFileIdentity(filePath);
        alias = fileIdentity === undefined ? undefined : e.ids.get(fileIdentity);
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
//@ chunk-7wdbg1ct.js:10765-10981 placement
function normalizeGitdirPointer(n, e) {
  let o = getPlatform() === "windows";
  let r = o ? /^[A-Za-z]:/.exec(n)?.[0] : undefined;
  if (o && /^[A-Za-z]:(?![\\/])/.test(e)) return null;
  let i = r !== undefined && /^[\\/](?![\\/])/.test(e) ? `${r}${e}` : e;
  return i.includes("\uFFFD") ? null : i;
}
//@ chunk-7wdbg1ct.js:10981-11064 placement
/**
 * 解析 .git 文件中的 gitdir 指针。
 */
function readGitdirPointer(n) {
  let e = cleanSingleLine(n);
  return e === null ? undefined : /^gitdir: (.+)$/s.exec(e)?.[1];
}
//@ chunk-7wdbg1ct.js:11064-11184 placement
/**
 * 去掉末尾换行并拒绝含控制字符的值。
 */
function cleanSingleLine(n) {
  if (n === undefined) return null;
  let replaced = n.replace(/[\r\n]+$/, "");
  return replaced === "" || /[\r\n\0\uFFFD]/.test(replaced) ? null : replaced;
}
//@ chunk-7wdbg1ct.js:11184-11231 placement
/**
 * 相对路径基于目录解析。
 */
function resolveRelative(n, e) {
  return isAbsolute(e) ? e : `${n}${sep}${e}`;
}
//@ chunk-7wdbg1ct.js:11231-11446 placement
/**
 * 路径是否在目录内（大小写不敏感平台归一）。
 */
function isPathInside(n, e) {
  if (!isAbsolute(e)) return false;
  let platform = getPlatform();
  let r = platform === "macos" || platform === "windows";
  let i = (l) => (r ? l.normalize("NFC").toLowerCase() : l);
  let s = relative(i(n), i(e));
  let u = s === ".." || s.startsWith(`..${sep}`) || s.startsWith("../");
  return s === "" || (!u && !isAbsolute(s));
}
//@ chunk-7wdbg1ct.js:11446-11743 placement
var PROJECT_SETTING_SOURCES = ["projectSettings", "localSettings"];
var TMPDIR_ENV_VARS = ["CLAUDE_CODE_TMPDIR", "TMPDIR", "TEMP", "TMP"];
var HOME_ENV_VARS = [
  "CLAUDE_CONFIG_DIR",
  "HOME",
  "USERPROFILE",
  "HOMEDRIVE",
  "HOMEPATH",
  "CLAUDE_CODE_USE_COWORK_PLUGINS",
];
var GIT_CONFIG_ENV_VARS = ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"];
var PROTECTED_ENV_VARS_2 = [
  ...GIT_CONFIG_ENV_VARS,
  ...HOME_ENV_VARS,
  ...TMPDIR_ENV_VARS,
  "XDG_CONFIG_HOME",
  "PATH",
  ...PROTECTED_ENV_VARS,
];
export {
  PROJECT_SETTING_SOURCES,
  HOME_ENV_VARS,
  getProtectedTempDirs,
  classifyPathSpelling,
  isPathInside,
  readGitdirPointer,
  PROTECTED_ENV_VARS_2,
  resolveForeignSpellingAsync,
  classifyPathSpelling_3,
  spellingsToCheck,
  resolveForeignSpelling,
  isPathTooDeep,
  MAX_PROTECTED_PATH_LENGTH,
  classifyPathSpellingSync,
  isForeignSpelling,
  isWindowsNonDrivePath,
  PROTECTED_ENV_VARS,
  GIT_CONFIG_ENV_VARS,
  parseGitBoolEnv,
  collectGitProtectedPaths,
  getGitConfigPaths,
  systemGitConfigPaths,
  findReachableProtectedPath,
  getHomeDirCandidates,
  resolveRelative,
  cleanSingleLine,
  isWritableSharedFile,
};
