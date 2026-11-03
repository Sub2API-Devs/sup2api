/**
 * utils/git/builderGit/sandboxReach.ts
 *
 * builderGit：沙箱可达范围判断（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (60)
 * attribution: placement 60
 */
import { isAbsolute, resolve, parse, basename, dirname, sep, join, delimiter } from "path";
import {
  realpathSync,
  constants,
  statfsSync,
  lstatSync,
  openSync,
  readSync,
  closeSync,
  readlinkSync,
} from "fs";
import { homedir } from "os";
import { access, lstat } from "fs/promises";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { uniq } from "../../collections.js";
import {
  resolveForeignSpelling,
  classifyPathSpelling,
  spellingsToCheck,
  isPathTooDeep,
  isPathInside as isPathInside_2,
  MAX_PROTECTED_PATH_LENGTH,
  classifyPathSpellingSync,
  isForeignSpelling,
  isWindowsNonDrivePath,
} from "../../permissions/protectedEnvAndGitPaths.js";
import {
  protectedHomeRoots,
  getProtectedTempDirsWithPreSettings,
} from "../../permissions/protectedSettingsPaths.js";
import { logForDebugging } from "../../debug.js";
import { getGlobBaseDirectory_2 } from "../../permissions/pathValidation.js";
import {
  normalizePathForSandbox,
  getDefaultWritePaths,
} from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { getSettingsForSourceTightenOnly, readRepoDirSettingsFresh } from "../../settings/settings.js";
import {
  parseRuleForSandbox,
  resolvePathPatternForSandbox,
  resolveSandboxFilesystemPath,
  detectWorktreeGitCommonDir,
} from "../../sandbox/sandbox-adapter.js";
import { FILE_EDIT_TOOL_NAME } from "../../../tools/FileEditTool/constants.js";
import { expandPath } from "../../path.js";
import { getClaudeTempDirRealpath, getChildProcessTmpDirRealpath } from "../../tempDirRealpaths.js";
import { getAdditionalDirectoriesForClaudeMd } from "../../../bootstrap/state.js";
import { SETTING_SOURCES, REPO_DIR_SETTING_SOURCE_LIST } from "../../settings/constants.js";
import { truncateWithCount } from "../../stringUtils.js";
import { reachRootsOrUnreadable } from "./gitEnv.js";
import { hasDotDotSegment } from "../../pathClassification.js";
import { getErrnoCode } from "../../errors.js";
import { isNetworkMountRoot_2, isOnForeignMount } from "../../networkPaths.js";
import { readOnlyNoFollowFlags } from "../../platformTargets.js";
import { toUncLongPath } from "../../windowsUncPaths.js";
import { rawPointerPathIsUnsafe } from "../gitFilesystem.js";
import { stripPathQuotes } from "../../which.js";

//@ chunk-s61vbvea.js:208341-208477 placement
function msysPathToWindows(e) {
  let n = getPlatform_2() === "windows" ? /^\/([A-Za-z])(?=\/|$)/.exec(e) : null;
  return n === null ? e : `${n[1].toUpperCase()}:${e.slice(2) || "\\"}`;
}
//@ chunk-s61vbvea.js:208477-208564 placement
function reachRootsForPath(e, n) {
  let r = msysPathToWindows(e);
  if (r !== e) return uniq([...checkSandboxWriteRoot(r, n), ...checkSandboxWriteRoot(e, n)]);
  return checkSandboxWriteRoot(e, n);
}
//@ chunk-s61vbvea.js:208564-209049 placement
function checkSandboxWriteRoot(e, n) {
  let r = e.startsWith("~") || isAbsolute(e) ? e : resolve(n, e);
  let foreignSpelling = resolveForeignSpelling(
    classifyPathSpelling(r, n, {
      pattern: true,
    }),
    n,
    protectedHomeRoots(),
    {
      pattern: true,
    },
  );
  let { spelling, verdict } = foreignSpelling;
  if (verdict !== "local") {
    logForDebugging(
      `[sandboxReach] write root ${r} cannot be vouched for (${verdict}): counted as every volume`,
      {
        level: "warn",
      },
    );
    return [
      ...spellingsToCheck(
        verdict === "foreign"
          ? {
              ...foreignSpelling,
              verdict: "opaque",
            }
          : foreignSpelling,
        n,
      ),
    ];
  }
  let globBaseDirectory = getGlobBaseDirectory_2(spelling);
  let w;
  try {
    w = getGlobBaseDirectory_2(normalizePathForSandbox(spelling));
  } catch {
    w = null;
  }
  let filtered = [globBaseDirectory, w].filter((P) => P !== null);
  let flattened = filtered.flatMap((P) => {
    try {
      let j = realpathSync(P);
      return isAbsolute(j) ? [j] : [];
    } catch {
      return [];
    }
  });
  return uniq([...filtered, ...flattened]);
}
//@ chunk-s61vbvea.js:209049-209421 placement
/**
 * 读取某设置源（或传入的设置）中 permissions.allow 的 Edit 规则路径、sandbox.filesystem.allowWrite 与 permissions.additionalDirectories，展开为路径列表；读取失败返回空。
 */
function collectSettingsWriteRoots(e, n, r) {
  let s;
  try {
    s = r === undefined ? getSettingsForSourceTightenOnly(e) : r;
  } catch {
    return [];
  }
  let h = [];
  for (let y of s?.permissions?.allow ?? [])
    try {
      let ruleForSandbox = parseRuleForSandbox(y);
      if (ruleForSandbox.toolName === FILE_EDIT_TOOL_NAME && ruleForSandbox.ruleContent)
        h.push(resolvePathPatternForSandbox(ruleForSandbox.ruleContent, e));
    } catch {}
  for (let y of s?.sandbox?.filesystem?.allowWrite ?? [])
    try {
      h.push(resolveSandboxFilesystemPath(y, e));
    } catch {}
  for (let y of s?.permissions?.additionalDirectories ?? [])
    try {
      h.push(expandPath(y, n));
    } catch {}
  return h;
}
//@ chunk-s61vbvea.js:209421-209601 placement
/**
 * 默认可达根：临时目录、配置目录、工作树公共 git 目录与额外目录。
 */
function collectBaseReachRoots(e) {
  let n = [getClaudeTempDirRealpath(), getChildProcessTmpDirRealpath()];
  try {
    n.push(...getDefaultWritePaths());
  } catch {}
  try {
    let worktreeGitCommonDir = detectWorktreeGitCommonDir(e);
    if (worktreeGitCommonDir) n.push(worktreeGitCommonDir);
  } catch {}
  for (let r of getAdditionalDirectoriesForClaudeMd())
    try {
      n.push(expandPath(r, e));
    } catch {}
  return uniq(n.flatMap((r) => reachRootsForPath(r, e)));
}
//@ chunk-s61vbvea.js:209601-209667 placement
/**
 * 某设置来源的可达根（展开设置写入根）。
 */
function settingsReachRootsForSource(e, n, r) {
  return uniq((r ?? collectSettingsWriteRoots(n, e)).flatMap((s) => reachRootsForPath(s, e)));
}
//@ chunk-s61vbvea.js:209667-209739 placement
/**
 * 汇总所有设置来源的可达根。
 */
function settingsReachRoots(launchDir) {
  return uniq([
    ...collectBaseReachRoots(launchDir),
    ...SETTING_SOURCES.flatMap((n) => settingsReachRootsForSource(launchDir, n, null)),
  ]);
}
//@ chunk-s61vbvea.js:209739-209749 placement
var REPO_DIR_SETTING_SOURCES_2 = REPO_DIR_SETTING_SOURCE_LIST;
//@ chunk-s61vbvea.js:209749-209955 placement
function collectRepoSettingsReachRoots(e) {
  let mapped = REPO_DIR_SETTING_SOURCES_2.map((r) => ({
    source: r,
    read: readRepoSettingsForReach(r),
  }));
  return mapped.some(({ read }) => read === "unreadable")
    ? "unreadable"
    : uniq(
        mapped.flatMap(({ source, read }) =>
          read === "unreadable"
            ? []
            : settingsReachRootsForSource(
                e,
                source,
                read.flatMap((h) => collectSettingsWriteRoots(source, e, h)),
              ),
        ),
      );
}
//@ chunk-s61vbvea.js:209955-210150 placement
function readRepoSettingsForReach(e) {
  try {
    let repoDirSettingsFresh = readRepoDirSettingsFresh(e);
    if (repoDirSettingsFresh.kind === "unreadable" || repoDirSettingsFresh.kind === "unreadable_for_now")
      return "unreadable";
    if (repoDirSettingsFresh.kind === "in_effect") return [repoDirSettingsFresh.settings];
    return "unreadable";
  } catch {
    return "unreadable";
  }
}
//@ chunk-s61vbvea.js:263193-263279 placement
/**
 * 创建一个可达范围收集器（根、是否保留卷根、路径与加载器表）。
 */
function createReachCollector(keepsVolumes = true) {
  return {
    roots: new Set(),
    keepsVolumes,
    paths: new Map(),
    loaders: new Map(),
  };
}
//@ chunk-s61vbvea.js:263279-263448 placement
function mergeReachRoots(e, n) {
  let r = weakMap.get(n) ?? new Set();
  let filtered = n.filter((h) => r.has(h) || (!e.keepsVolumes && isVolumeRoot(h)));
  for (let h of n) if (!filtered.includes(h)) e.roots.add(h);
  return uniq([...e.roots, ...filtered]);
}
//@ chunk-s61vbvea.js:263448-263486 placement
/**
 * 判断路径是否为卷根（/）。
 */
function isVolumeRoot(e) {
  return e === parse(e).root;
}
//@ chunk-s61vbvea.js:263486-263599 placement
function reachForWorkTree(e, n) {
  let workTree = n?.workTree ?? e;
  return {
    tree: workTree,
    roots: baseReachRootsForTree(workTree, [
      ...findEnclosingRepos(workTree),
      ...(n === undefined ? [] : [checkoutDirOfGitDir(n.commonDir)]),
    ]),
  };
}
//@ chunk-s61vbvea.js:263599-264061 placement
/**
 * 把可达根解析为真实路径，无法担保的按“整卷”处理。
 */
function resolveReachRoots(e, tree) {
  let r = new Set();
  let s = new Set();
  let h = (w, R) => {
    let x = countRootAsEveryVolume(w, R, tree);
    for (let P of x) r.add(P);
    return x;
  };
  let y = uniq([
    ...e.filter((w) => !isPathTooDeep(w, 0)),
    ...uniq(e).flatMap((w) => {
      if (isPathTooDeep(w, 0))
        return h(w, {
          spelling: w,
          verdict: "opaque",
        });
      let foreignSpelling = resolveForeignSpelling(classifyPathSpelling(w, tree), tree, protectedHomeRoots());
      if (foreignSpelling.verdict !== "local") return h(w, foreignSpelling);
      let realPathLoose = resolveRealPathLoose(foreignSpelling.spelling, tree);
      if (realPathLoose === null)
        return h(w, {
          ...foreignSpelling,
          verdict: "opaque",
        });
      s.add(realPathLoose);
      return [realPathLoose];
    }),
  ]);
  let filtered = [...r].filter((w) => !e.includes(w) && !s.has(w));
  if (filtered.length > 0) weakMap.set(y, new Set(filtered));
  return y;
}
//@ chunk-s61vbvea.js:264061-264080 placement
var weakMap = new WeakMap();
//@ chunk-s61vbvea.js:264080-264280 placement
function countRootAsEveryVolume(e, n, r) {
  logForDebugging(
    `[builderGit] reach root ${truncateWithCount(e, 256)} cannot be vouched for (${n.verdict}): counted as every volume`,
    {
      level: "warn",
    },
  );
  return spellingsToCheck(
    n.verdict === "foreign"
      ? {
          ...n,
          verdict: "opaque",
        }
      : n,
    r,
  );
}
//@ chunk-s61vbvea.js:264280-264331 placement
/**
 * 取某仓库工作树的可达根。
 */
function reachRootsForRepo(e, n) {
  return reachRootsOrUnreadable({
    tree: e,
    roots: baseReachRootsForTree(e, n),
  });
}
//@ chunk-s61vbvea.js:264331-264395 placement
function baseReachRootsForTree(e, n) {
  return uniq([
    e,
    ...n,
    ...repoAncestorRoots(e),
    ...getProtectedTempDirsWithPreSettings(),
    ...settingsReachRoots(e),
  ]);
}
//@ chunk-s61vbvea.js:264395-264471 placement
function repoAncestorRoots(e) {
  let n = repoAncestorsBelowHome(e);
  return n.length === 0 ? [] : uniq([...n, homedir()].filter(isAbsolute));
}
//@ chunk-s61vbvea.js:264471-264531 placement
/**
 * 若路径指向 .git 目录则返回其父目录（检出目录）。
 */
function checkoutDirOfGitDir(commonDir) {
  return basename(commonDir).toLowerCase() === ".git" ? dirname(commonDir) : commonDir;
}
//@ chunk-s61vbvea.js:264531-264651 placement
/**
 * 工作树上方（家目录以下）的 git 仓库目录。
 */
function findEnclosingRepos(e) {
  let n = resolveRealPathLoose(homedir(), e) ?? homedir();
  let r = (s) => {
    let h = dirname(s);
    return h === s || isPathInside_2(h, n) ? [] : [h, ...r(h)];
  };
  return r(e).filter(isGitRepoDir);
}
//@ chunk-s61vbvea.js:264651-264715 placement
/**
 * 找出家目录之上且包含该路径的 git 检出。
 */
function enclosingCheckoutAboveHome(e) {
  return repoAncestorsBelowHome(e).find((n) => isPathInside_2(n, e) && !isPathInside_2(e, n)) ?? null;
}
//@ chunk-s61vbvea.js:264715-264766 placement
/**
 * 列出家目录以下的各层 git 仓库祖先。
 */
function repoAncestorsBelowHome(e) {
  let n = homedir();
  return n === "" ? [] : listRepoAncestors(n, e);
}
//@ chunk-s61vbvea.js:264766-264804 placement
/**
 * 最近的一层仓库祖先。
 */
function nearestRepoAncestor(e) {
  return repoAncestorsBelowHome(e)[0] ?? null;
}
//@ chunk-s61vbvea.js:264804-264947 placement
/**
 * 路径相对家目录：home/above_home/elsewhere。
 */
function classifyHomePosition(e, n) {
  let r = homedir();
  if (r === "") return "elsewhere";
  let s = resolveRealPathLoose(r, n) ?? r;
  return s === e || r === e
    ? "home"
    : isPathInside_2(e, s) || isPathInside_2(e, r)
      ? "above_home"
      : "elsewhere";
}
//@ chunk-s61vbvea.js:264947-265102 placement
function listRepoAncestors(e, n) {
  let r = resolveRealPathLoose(e, n) ?? e;
  return uniq([...(isAbsolute(r) ? ancestorChain(r) : []), ...(isAbsolute(e) ? ancestorChain(e) : [])])
    .filter(isTraversableDirectory)
    .filter(isGitRepoDir)
    .sort((h, y) => h.split(sep).length - y.split(sep).length);
}
//@ chunk-s61vbvea.js:265102-265147 placement
/**
 * 最外层（最远）的仓库祖先。
 */
function outermostRepoAncestor(e, configHome) {
  return listRepoAncestors(e, configHome).at(-1) ?? null;
}
//@ chunk-s61vbvea.js:265147-265220 placement
function ancestorChain(e, n = MAX_ANCESTOR_CHAIN) {
  let r = dirname(e);
  return r === e || n === 0 ? [e] : [e, ...ancestorChain(r, n - 1)];
}
//@ chunk-s61vbvea.js:265220-265231 placement
var MAX_ANCESTOR_CHAIN = MAX_PROTECTED_PATH_LENGTH;
//@ chunk-s61vbvea.js:265231-265550 placement
/**
 * 找到可达范围内可写的 git 检出，或返回无法担保的位置。
 */
async function findHeldCheckout(e, n) {
  if (hasDotDotSegment(e) || !isAbsolute(e)) return null;
  let r = classifyReachRoot(e, n);
  let sorted = uniq(r.nodes)
    .filter((y) => !r.links.has(y) && !r.cutAt.has(y) && isTraversableDirectory(y))
    .filter(isGitRepoDir)
    .sort((y, S) => S.split(sep).length - y.split(sep).length);
  for (let y of sorted)
    if (await isCheckoutHeld(r, y))
      return {
        kind: "held",
        checkout: y,
      };
  let [h] = r.cutAt;
  return h === undefined
    ? null
    : {
        kind: "unvouched",
        at: h,
      };
}
//@ chunk-s61vbvea.js:265550-265760 placement
async function isCheckoutHeld(e, n) {
  let filtered = uniq(e.nodes).filter((y) => isPathInside_2(n, y));
  if (filtered.some((y) => e.cutAt.has(y))) return true;
  let filtered_2 = filtered.filter((y) => !e.links.has(y));
  let results = await Promise.all(filtered_2.map(isWritableOrOwned));
  return filtered_2.length === 0 || results.some((y) => y === true);
}
//@ chunk-s61vbvea.js:265760-266322 placement
function classifyReachRoot(e, n) {
  let r = new Set();
  let s = new Set();
  let h = 0;
  let y = (w, R) => {
    let { root } = parse(w);
    let filtered = w
      .slice(root.length)
      .split(sep === "/" ? /\/+/ : /[\\/]+/)
      .filter((j) => j !== "");
    return [root, ...S(root, [...filtered, ...R])];
  };
  let S = (w, R) => {
    let [x, ...P] = R;
    if (x === undefined) return [];
    let j = join(w, x);
    let G = lstatLinkKind(j);
    if (G === "missing") return [j, ...P.map((q, Q) => join(j, ...P.slice(0, Q + 1)))];
    if (G === "opaque") {
      s.add(j);
      return [j];
    }
    if (G.link === null) return [j, ...S(j, P)];
    r.add(j);
    let L =
      ++h > MAX_LINK_HOPS
        ? null
        : resolveForeignSpelling(classifyPathSpellingSync(G.link, w, n), n, protectedHomeRoots());
    if (L === null || L.verdict !== "local") {
      s.add(j);
      return [j];
    }
    return [j, ...y(L.spelling, P)];
  };
  return {
    nodes: y(e, []),
    links: r,
    cutAt: s,
  };
}
//@ chunk-s61vbvea.js:266322-266635 placement
/**
 * 路径可写，或属当前用户（不存在返回 absent）。
 */
async function isWritableOrOwned(e) {
  try {
    await access(e, constants.W_OK);
    return true;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "absent";
    if (!(errnoCode === "EACCES" || errnoCode === "EPERM" || errnoCode === "EROFS")) return true;
  }
  try {
    let n = process.getuid?.();
    return n === undefined || (await lstat(e)).uid === n;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : true;
  }
}
//@ chunk-s61vbvea.js:266635-266671 placement
function isTraversableDirectory(e) {
  return !isNetworkMountRoot_2(e) && !isProcFilesystem(e);
}
//@ chunk-s61vbvea.js:266671-266729 placement
function isProcFilesystem(e) {
  try {
    return statfsSync(e).type === PROC_SUPER_MAGIC;
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:266729-266740 placement
var PROC_SUPER_MAGIC = 391;
//@ chunk-s61vbvea.js:266740-266786 placement
function isGitRepoDir(e) {
  return pathMayExist(join(e, ".git")) || isCurrentDirectoryBareGitRepo(e);
}
//@ chunk-s61vbvea.js:266786-266953 placement = isCurrentDirectoryBareGitRepo (0.757)
function isCurrentDirectoryBareGitRepo(e) {
  return (
    basename(e).toLowerCase() !== ".git" &&
    (["HEAD", "objects", "refs"].every((n) => pathExistsSync(join(e, n))) ||
      (lstatOrUndefined(join(e, "worktrees"))?.isDirectory() === true && isGitdirFile(join(e, "config"))))
  );
}
//@ chunk-s61vbvea.js:266953-266990 placement
function pathExistsSync(e) {
  return lstatOrUndefined(e) !== undefined;
}
//@ chunk-s61vbvea.js:266990-267128 placement
function pathMayExist(e) {
  try {
    return (
      lstatSync(e, {
        throwIfNoEntry: false,
      }) !== undefined
    );
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return !(errnoCode === "ENOTDIR" || errnoCode === "ELOOP" || errnoCode === "ENAMETOOLONG");
  }
}
//@ chunk-s61vbvea.js:267128-267163 placement
var GIT_CONFIG_HEAD_PROBE_BYTES = 4096;
var CORE_SECTION_RE = /^[ \t]*\[core\]/im;
//@ chunk-s61vbvea.js:267163-267380 placement
function isGitdirFile(e) {
  if (lstatOrUndefined(e)?.isFile() !== true) return false;
  try {
    let n = openSync(e, readOnlyNoFollowFlags());
    try {
      let r = Buffer.alloc(GIT_CONFIG_HEAD_PROBE_BYTES);
      let s = readSync(n, r, 0, GIT_CONFIG_HEAD_PROBE_BYTES, 0);
      let replaced = r.toString("latin1", 0, s).replace(/^\xEF\xBB\xBF/, "");
      return CORE_SECTION_RE.test(replaced);
    } finally {
      closeSync(n);
    }
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:267380-267395 placement
/**
 * 遍历配置文件时允许的字节上限。
 */
var MAX_CONFIG_WALK_BYTES = 1048576;
//@ chunk-s61vbvea.js:274016-274082 placement
/**
 * 取 lstat 结果；不存在或出错返回 undefined。
 */
function lstatOrUndefined(e) {
  try {
    return lstatSync(e, {
      throwIfNoEntry: false,
    });
  } catch {
    return;
  }
}
//@ chunk-s61vbvea.js:274082-274177 placement
function resolveRealPathLoose(e, n) {
  if (isPathTooDeep(e, 0)) return null;
  let [r, s] = splitAtPathMax(e);
  let h = realpathWithMissingTail(r, n);
  return h === null ? null : join(h, s);
}
//@ chunk-s61vbvea.js:274177-274436 placement = getReservedShortcuts (0.806)
function splitAtPathMax(e) {
  let n = getPlatform_2() === "windows" ? null : getPlatform_2() === "macos" ? 1024 : 4096;
  if (n === null || Buffer.byteLength(e) < n) return [e, ""];
  let index = e.lastIndexOf(sep, n - 1);
  while (index > 0 && Buffer.byteLength(e.slice(0, index)) >= n) index = e.lastIndexOf(sep, index - 1);
  return index > 0 ? [e.slice(0, index), e.slice(index + 1)] : [e, ""];
}
//@ chunk-s61vbvea.js:274436-274715 placement
function realpathWithMissingTail(e, n, r = [], s = 0) {
  if (isPathTooDeep(e, r.length)) return null;
  try {
    return join(toUncLongPath(realpathSync.native(e)), ...r);
  } catch {
    let h = s < MAX_LINK_HOPS_2 ? readLinkTargetInfo(e) : null;
    if (h !== null) {
      let { spelling, verdict } = classifyPathSpellingSync(h.text, h.dir, n);
      return verdict === "local" ? realpathWithMissingTail(spelling, n, r, s + 1) : null;
    }
    let y = dirname(e);
    return y === e ? join(e, ...r) : realpathWithMissingTail(y, n, [basename(e), ...r], s);
  }
}
//@ chunk-s61vbvea.js:274715-274803 placement
function resolvePathSpellings(e, n) {
  let realPathLoose = resolveRealPathLoose(e, n);
  return realPathLoose === null
    ? spellingsToCheck(
        {
          spelling: e,
          verdict: "opaque",
        },
        n,
      )
    : [realPathLoose];
}
//@ chunk-s61vbvea.js:274803-274877 placement
var MAX_LINK_HOPS_2 = 8;
var GIT_NOT_FOUND_MESSAGE = "git was not found on the PATH this process was started with";
//@ chunk-s61vbvea.js:274877-275039 placement
function homeInCheckoutNote(e) {
  let n = nearestRepoAncestor(e);
  return n === null
    ? ""
    : `; the home directory counts here because it ${classifyHomePosition(n, e) === "home" ? "is itself" : "lies inside"} a git checkout (${n})`;
}
//@ chunk-s61vbvea.js:275039-275590 placement
/**
 * 云会话可写目录范围的说明文本，以及目录无法检查时的提示。
 */
var SANDBOX_REACH_TEXTS = `${GIT_NOT_FOUND_MESSAGE} (directories a cloud session bound here can write \u2014 inside this checkout or a checkout enclosing it, such as a worktree\u2019s main checkout; below your home directory when it is, or lies inside, a git checkout; a session temp directory; one whose git links into those \u2014 and directories that name or lead to another host are not searched)`;
var UNEXAMINABLE_REACH_NOTE =
  "If one of the directories that a cloud session can write cannot be examined, or is too deep or too long to resolve, every directory is left out; the debug log names the one to fix.";
//@ chunk-s61vbvea.js:275590-275638 placement
/**
 * 判断路径是否位于外部挂载或指向不安全目标。
 */
function pathIsForeignOrUnsafePointer(e, n, r = n) {
  return isOnForeignMount(e, r) || rawPointerPathIsUnsafe(e, n, r);
}
//@ chunk-s61vbvea.js:275638-275733 placement
function readLinkTargetInfo(e) {
  try {
    let n = readlinkSync(e);
    let dir = isAbsolute(n) ? dirname(e) : realpathSync(dirname(e));
    return {
      text: n,
      dir,
    };
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:275733-275859 placement
function filterSafePathEnv(e, n, r) {
  let reachPredicate = makeReachPredicate(n);
  let h = new Map();
  return e
    .split(delimiter)
    .map((y) => stripPathQuotes(y))
    .filter((y) => y !== "" && isAbsolute(y) && isPathDirSafe(y, reachPredicate, r, h))
    .join(delimiter);
}
//@ chunk-s61vbvea.js:275859-276200 placement
/**
 * PATH 中的目录及其中的 git 等程序都在可达范围之外。
 */
function isPathDirSafe(e, n, r, s = new Map()) {
  if (isReachableOrUnsafe(e, n, s)) return false;
  let realPathLoose = resolveRealPathLoose(e, n.anchor);
  if (realPathLoose === null) return false;
  return r.every((y) => {
    let S = `${e}${sep}${y}`;
    if (isForeignSpelling(S, n.anchor)) return false;
    let w = s.get(S) ?? lstatLinkKind(S);
    s.set(S, w);
    if (w === "missing") return !n(S) && !n(join(realPathLoose, y));
    if (w !== "opaque" && w.link === null) {
      let realPathLoose = resolveRealPathLoose(S, n.anchor);
      return realPathLoose !== null && !n(S) && !n(realPathLoose);
    }
    return !isReachableOrUnsafe(S, n, s);
  });
}
//@ chunk-s61vbvea.js:276200-276325 placement
function makeReachPredicate(e) {
  return Object.assign((n) => e.some((r) => isPathInside_2(r, n)), {
    beneath: (n) => e.some((r) => isPathInside_2(n, r) && !isPathInside_2(r, n)),
    anchor: e[0] ?? sep,
  });
}
//@ chunk-s61vbvea.js:276325-277031 placement
/**
 * 判断路径能否被沙箱写到：非绝对、设备路径或在可达范围内（含其上层）直接返回 true；否则逐级 lstat， 遇到不存在的组件按真实路径与剩余部分判断，遇到链接递归解析（限深度），无法判断的视为可达。
 */
function isReachableOrUnsafe(e, n, r, s = MAX_LINK_HOPS) {
  if (
    !isAbsolute(e) ||
    isWindowsNonDrivePath(e) ||
    e.startsWith("\\\\?\\") ||
    isForeignSpelling(e, n.anchor) ||
    n(e) ||
    n.beneath(e)
  )
    return true;
  let { root } = parse(e);
  let filtered = e
    .slice(root.length)
    .split(sep === "/" ? /\/+/ : /[\\/]+/)
    .filter((R) => R !== "" && R !== ".");
  let S = root;
  for (let [R, x] of filtered.entries()) {
    S = x === ".." ? dirname(S) : join(S, x);
    let P = r.get(S);
    if (P === undefined && (n(S) || isForeignSpelling(S, n.anchor))) return true;
    let j = P ?? lstatLinkKind(S);
    r.set(S, j);
    if (j === "opaque") return true;
    if (j === "missing") {
      let realPathLoose = resolveRealPathLoose(e, n.anchor);
      return (
        realPathLoose === null ||
        n(realPathLoose) ||
        n.beneath(realPathLoose) ||
        filtered.slice(R + 1).some((L, q) => n(join(S, ...filtered.slice(R + 1, R + 2 + q))))
      );
    }
    if (j.link !== null) {
      if (s === 0) return true;
      let G = isAbsolute(j.link) ? j.link : `${dirname(S)}${sep}${j.link}`;
      return isReachableOrUnsafe([G, ...filtered.slice(R + 1)].join(sep), n, r, s - 1);
    }
  }
  let realPathLoose = resolveRealPathLoose(e, n.anchor);
  return realPathLoose === null || n(realPathLoose) || n.beneath(realPathLoose);
}
//@ chunk-s61vbvea.js:277031-277041 placement
var MAX_LINK_HOPS = 40;
//@ chunk-s61vbvea.js:277041-277278 placement
function lstatLinkKind(e) {
  try {
    let n = lstatSync(e, {
      throwIfNoEntry: false,
    });
    if (n === undefined) return "missing";
    if (!n.isSymbolicLink())
      return {
        link: null,
      };
    let r = readlinkSync(e);
    return {
      link: toUncLongPath(r.replace(/^\\\?\?\\/, "\\\\?\\")),
    };
  } catch (error) {
    return getErrnoCode(error) === "ENOTDIR" ? "missing" : "opaque";
  }
}
export {
  collectBaseReachRoots,
  collectSettingsWriteRoots,
  settingsReachRootsForSource,
  isVolumeRoot,
  nearestRepoAncestor,
  checkoutDirOfGitDir,
  createReachCollector,
  enclosingCheckoutAboveHome,
  findEnclosingRepos,
  classifyHomePosition,
  pathIsForeignOrUnsafePointer,
  UNEXAMINABLE_REACH_NOTE,
  settingsReachRoots,
  collectRepoSettingsReachRoots,
  resolveReachRoots,
  mergeReachRoots,
  makeReachPredicate,
  isReachableOrUnsafe,
  lstatOrUndefined,
  filterSafePathEnv,
  reachForWorkTree,
  GIT_NOT_FOUND_MESSAGE,
  SANDBOX_REACH_TEXTS,
  homeInCheckoutNote,
  reachRootsForRepo,
  outermostRepoAncestor,
  repoAncestorsBelowHome,
  resolvePathSpellings,
  resolveRealPathLoose,
  findHeldCheckout,
  MAX_CONFIG_WALK_BYTES,
  isPathDirSafe,
};
