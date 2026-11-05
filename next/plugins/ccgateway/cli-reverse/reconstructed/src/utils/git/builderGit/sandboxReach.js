/**
 * utils/git/builderGit/sandboxReach.ts
 *
 * builderGit：沙箱可达范围判断（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fepf8jp6.js (60)
 * attribution: placement 60
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { getPlatform } from "../../platform.js";
import { normalizeCaseForComparison_2 } from "../../permissions/filesystem.js";
import {
  resolveForeignSpelling,
  classifyPathSpelling,
  spellingsToCheck,
  isPathTooDeep,
  isPathInside,
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
import { EDIT } from "../../../tools/FileEditTool/constants.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-fepf8jp6.js:2926-3062 placement
function msysPathToWindows(path) {
  let driveMatch = getPlatform() === "windows" ? /^\/([A-Za-z])(?=\/|$)/.exec(path) : null;
  return driveMatch === null ? path : `${driveMatch[1].toUpperCase()}:${path.slice(2) || "\\"}`;
}
//@ chunk-fepf8jp6.js:3062-3149 placement
function reachRootsForPath(path, launchDir) {
  let windowsPath = msysPathToWindows(path);
  if (windowsPath !== path)
    return normalizeCaseForComparison_2([
      ...checkSandboxWriteRoot(windowsPath, launchDir),
      ...checkSandboxWriteRoot(path, launchDir),
    ]);
  return checkSandboxWriteRoot(path, launchDir);
}
//@ chunk-fepf8jp6.js:3149-3634 placement
function checkSandboxWriteRoot(path, launchDir) {
  let resolvedPath = path.startsWith("~") || isAbsolute(path) ? path : resolve(launchDir, path);
  let foreignSpelling = resolveForeignSpelling(
    classifyPathSpelling(resolvedPath, launchDir, {
      pattern: true,
    }),
    launchDir,
    protectedHomeRoots(),
    {
      pattern: true,
    },
  );
  let { spelling, verdict } = foreignSpelling;
  if (verdict !== "local") {
    logForDebugging(
      `[sandboxReach] write root ${resolvedPath} cannot be vouched for (${verdict}): counted as every volume`,
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
        launchDir,
      ),
    ];
  }
  let globBaseDirectory = getGlobBaseDirectory_2(spelling);
  let nativeBase;
  try {
    nativeBase = getGlobBaseDirectory_2(normalizePathForSandbox(spelling));
  } catch {
    nativeBase = null;
  }
  let filtered = [globBaseDirectory, nativeBase].filter((base) => base !== null);
  let flattened = filtered.flatMap((base) => {
    try {
      let real = realpathSync(base);
      return isAbsolute(real) ? [real] : [];
    } catch {
      return [];
    }
  });
  return normalizeCaseForComparison_2([...filtered, ...flattened]);
}
//@ chunk-fepf8jp6.js:3634-4006 placement
/**
 * 读取某设置源（或传入的设置）中 permissions.allow 的 Edit 规则路径、sandbox.filesystem.allowWrite 与 permissions.additionalDirectories，展开为路径列表；读取失败返回空。
 */
function collectSettingsWriteRoots(source, launchDir, settings) {
  let resolvedSettings;
  try {
    resolvedSettings = settings === undefined ? getSettingsForSourceTightenOnly(source) : settings;
  } catch {
    return [];
  }
  let roots = [];
  for (let rule of resolvedSettings?.permissions?.allow ?? [])
    try {
      let ruleForSandbox = parseRuleForSandbox(rule);
      if (ruleForSandbox.toolName === EDIT && ruleForSandbox.ruleContent)
        roots.push(resolvePathPatternForSandbox(ruleForSandbox.ruleContent, source));
    } catch {}
  for (let pathRule of resolvedSettings?.sandbox?.filesystem?.allowWrite ?? [])
    try {
      roots.push(resolveSandboxFilesystemPath(pathRule, source));
    } catch {}
  for (let extraDir of resolvedSettings?.permissions?.additionalDirectories ?? [])
    try {
      roots.push(expandPath(extraDir, launchDir));
    } catch {}
  return roots;
}
//@ chunk-fepf8jp6.js:4006-4186 placement
/**
 * 默认可达根：临时目录、配置目录、工作树公共 git 目录与额外目录。
 */
function collectBaseReachRoots(launchDir) {
  let roots = [getClaudeTempDirRealpath(), getChildProcessTmpDirRealpath()];
  try {
    roots.push(...getDefaultWritePaths());
  } catch {}
  try {
    let worktreeGitCommonDir = detectWorktreeGitCommonDir(launchDir);
    if (worktreeGitCommonDir) roots.push(worktreeGitCommonDir);
  } catch {}
  for (let dir of getAdditionalDirectoriesForClaudeMd())
    try {
      roots.push(expandPath(dir, launchDir));
    } catch {}
  return normalizeCaseForComparison_2(roots.flatMap((root) => reachRootsForPath(root, launchDir)));
}
//@ chunk-fepf8jp6.js:4186-4252 placement
/**
 * 某设置来源的可达根（展开设置写入根）。
 */
function settingsReachRootsForSource(launchDir, source, writeRoots) {
  return normalizeCaseForComparison_2(
    (writeRoots ?? collectSettingsWriteRoots(source, launchDir)).flatMap((root) =>
      reachRootsForPath(root, launchDir),
    ),
  );
}
//@ chunk-fepf8jp6.js:4252-4324 placement
/**
 * 汇总所有设置来源的可达根。
 */
function settingsReachRoots(launchDir) {
  return normalizeCaseForComparison_2([
    ...collectBaseReachRoots(launchDir),
    ...SETTING_SOURCES.flatMap((source) => settingsReachRootsForSource(launchDir, source, null)),
  ]);
}
//@ chunk-fepf8jp6.js:4324-4334 placement
var REPO_DIR_SETTING_SOURCES; // deferred: uses EDITABLE_SETTING_SOURCES (../../settings/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fepf8jp6.js:4324", () => {
  REPO_DIR_SETTING_SOURCES = REPO_DIR_SETTING_SOURCE_LIST;
});
//@ chunk-fepf8jp6.js:4334-4540 placement
function collectRepoSettingsReachRoots(launchDir) {
  let mapped = REPO_DIR_SETTING_SOURCES.map((source) => ({
    source,
    read: readRepoSettingsForReach(source),
  }));
  return mapped.some(({ read }) => read === "unreadable")
    ? "unreadable"
    : normalizeCaseForComparison_2(
        mapped.flatMap(({ source, read }) =>
          read === "unreadable"
            ? []
            : settingsReachRootsForSource(
                launchDir,
                source,
                read.flatMap((read) => collectSettingsWriteRoots(source, launchDir, read)),
              ),
        ),
      );
}
//@ chunk-fepf8jp6.js:4540-4735 placement
function readRepoSettingsForReach(source) {
  try {
    let repoDirSettingsFresh = readRepoDirSettingsFresh(source);
    if (repoDirSettingsFresh.kind === "unreadable" || repoDirSettingsFresh.kind === "unreadable_for_now")
      return "unreadable";
    if (repoDirSettingsFresh.kind === "in_effect") return [repoDirSettingsFresh.settings];
    return "unreadable";
  } catch {
    return "unreadable";
  }
}
//@ chunk-fepf8jp6.js:57085-57171 placement
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
//@ chunk-fepf8jp6.js:57171-57339 placement
function mergeReachRoots(screenMemo, roots) {
  let previouslyCounted = weakMap.get(roots) ?? new Set();
  let filtered = roots.filter(
    (root) => previouslyCounted.has(root) || (!screenMemo.keepsVolumes && isVolumeRoot(root)),
  );
  for (let root of roots) if (!filtered.includes(root)) screenMemo.roots.add(root);
  return normalizeCaseForComparison_2([...screenMemo.roots, ...filtered]);
}
//@ chunk-fepf8jp6.js:57339-57376 placement
/**
 * 判断路径是否为卷根（/）。
 */
function isVolumeRoot(path) {
  return path === parse(path).root;
}
//@ chunk-fepf8jp6.js:57376-57489 placement
function reachForWorkTree(workTree, layout) {
  let workTree_2 = layout?.workTree ?? workTree;
  return {
    tree: workTree_2,
    roots: baseReachRootsForTree(workTree_2, [
      ...findEnclosingRepos(workTree_2),
      ...(layout === undefined ? [] : [checkoutDirOfGitDir(layout.commonDir)]),
    ]),
  };
}
//@ chunk-fepf8jp6.js:57489-57951 placement
/**
 * 把可达根解析为真实路径，无法担保的按“整卷”处理。
 */
function resolveReachRoots(roots, tree) {
  let countedRoots = new Set();
  let realRoots = new Set();
  let countAsEveryVolume = (root, screenMemo) => {
    let volumes = countRootAsEveryVolume(root, screenMemo, tree);
    for (let volume of volumes) countedRoots.add(volume);
    return volumes;
  };
  let resolved = normalizeCaseForComparison_2([
    ...roots.filter((root) => !isPathTooDeep(root, 0)),
    ...normalizeCaseForComparison_2(roots).flatMap((root) => {
      if (isPathTooDeep(root, 0))
        return countAsEveryVolume(root, {
          spelling: root,
          verdict: "opaque",
        });
      let screenMemo = resolveForeignSpelling(classifyPathSpelling(root, tree), tree, protectedHomeRoots());
      if (screenMemo.verdict !== "local") return countAsEveryVolume(root, screenMemo);
      let realPathLoose = resolveRealPathLoose(screenMemo.spelling, tree);
      if (realPathLoose === null)
        return countAsEveryVolume(root, {
          ...screenMemo,
          verdict: "opaque",
        });
      realRoots.add(realPathLoose);
      return [realPathLoose];
    }),
  ]);
  let filtered = [...countedRoots].filter((root) => !roots.includes(root) && !realRoots.has(root));
  if (filtered.length > 0) weakMap.set(resolved, new Set(filtered));
  return resolved;
}
//@ chunk-fepf8jp6.js:57951-57970 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fepf8jp6.js:57951", () => {
  weakMap = new WeakMap();
});
//@ chunk-fepf8jp6.js:57970-58170 placement
function countRootAsEveryVolume(root, spelling, tree) {
  logForDebugging(
    `[builderGit] reach root ${truncateWithCount(root, 256)} cannot be vouched for (${spelling.verdict}): counted as every volume`,
    {
      level: "warn",
    },
  );
  return spellingsToCheck(
    spelling.verdict === "foreign"
      ? {
          ...spelling,
          verdict: "opaque",
        }
      : spelling,
    tree,
  );
}
//@ chunk-fepf8jp6.js:58170-58221 placement
/**
 * 取某仓库工作树的可达根。
 */
function reachRootsForRepo(tree, extraRoots) {
  return reachRootsOrUnreadable({
    tree,
    roots: baseReachRootsForTree(tree, extraRoots),
  });
}
//@ chunk-fepf8jp6.js:58221-58285 placement
function baseReachRootsForTree(tree, extraRoots) {
  return normalizeCaseForComparison_2([
    tree,
    ...extraRoots,
    ...repoAncestorRoots(tree),
    ...getProtectedTempDirsWithPreSettings(),
    ...settingsReachRoots(tree),
  ]);
}
//@ chunk-fepf8jp6.js:58285-58360 placement
function repoAncestorRoots(tree) {
  let ancestors = repoAncestorsBelowHome(tree);
  return ancestors.length === 0
    ? []
    : normalizeCaseForComparison_2([...ancestors, homedir()].filter(isAbsolute));
}
//@ chunk-fepf8jp6.js:58360-58419 placement
/**
 * 若路径指向 .git 目录则返回其父目录（检出目录）。
 */
function checkoutDirOfGitDir(commonDir) {
  return basename(commonDir).toLowerCase() === ".git" ? dirname(commonDir) : commonDir;
}
//@ chunk-fepf8jp6.js:58419-58538 placement
/**
 * 工作树上方（家目录以下）的 git 仓库目录。
 */
function findEnclosingRepos(tree) {
  let homeReal = resolveRealPathLoose(homedir(), tree) ?? homedir();
  let ancestorsOf = (dir) => {
    let parentDir = dirname(dir);
    return parentDir === dir || isPathInside(parentDir, homeReal)
      ? []
      : [parentDir, ...ancestorsOf(parentDir)];
  };
  return ancestorsOf(tree).filter(isGitRepoDir);
}
//@ chunk-fepf8jp6.js:58538-58602 placement
/**
 * 找出家目录之上且包含该路径的 git 检出。
 */
function enclosingCheckoutAboveHome(tree) {
  return (
    repoAncestorsBelowHome(tree).find(
      (ancestor) => isPathInside(ancestor, tree) && !isPathInside(tree, ancestor),
    ) ?? null
  );
}
//@ chunk-fepf8jp6.js:58602-58653 placement
/**
 * 列出家目录以下的各层 git 仓库祖先。
 */
function repoAncestorsBelowHome(tree) {
  let homeDir = homedir();
  return homeDir === "" ? [] : listRepoAncestors(homeDir, tree);
}
//@ chunk-fepf8jp6.js:58653-58691 placement
/**
 * 最近的一层仓库祖先。
 */
function nearestRepoAncestor(tree) {
  return repoAncestorsBelowHome(tree)[0] ?? null;
}
//@ chunk-fepf8jp6.js:58691-58834 placement
/**
 * 路径相对家目录：home/above_home/elsewhere。
 */
function classifyHomePosition(tree, cwd) {
  let homeDir = homedir();
  if (homeDir === "") return "elsewhere";
  let realHome = resolveRealPathLoose(homeDir, cwd) ?? homeDir;
  return realHome === tree || homeDir === tree
    ? "home"
    : isPathInside(tree, realHome) || isPathInside(tree, homeDir)
      ? "above_home"
      : "elsewhere";
}
//@ chunk-fepf8jp6.js:58834-58987 placement
function listRepoAncestors(baseDir, cwd) {
  let realBase = resolveRealPathLoose(baseDir, cwd) ?? baseDir;
  return normalizeCaseForComparison_2([
    ...(isAbsolute(realBase) ? ancestorChain(realBase) : []),
    ...(isAbsolute(baseDir) ? ancestorChain(baseDir) : []),
  ])
    .filter(isTraversableDirectory)
    .filter(isGitRepoDir)
    .sort((left, right) => left.split(sep).length - right.split(sep).length);
}
//@ chunk-fepf8jp6.js:58987-59032 placement
/**
 * 最外层（最远）的仓库祖先。
 */
function outermostRepoAncestor(tree, cwd) {
  return listRepoAncestors(tree, cwd).at(-1) ?? null;
}
//@ chunk-fepf8jp6.js:59032-59104 placement
function ancestorChain(dir, remaining = MAX_ANCESTOR_CHAIN) {
  let parentDir = dirname(dir);
  return parentDir === dir || remaining === 0 ? [dir] : [dir, ...ancestorChain(parentDir, remaining - 1)];
}
//@ chunk-fepf8jp6.js:59104-59115 placement
var MAX_ANCESTOR_CHAIN = MAX_PROTECTED_PATH_LENGTH;
//@ chunk-fepf8jp6.js:59115-59433 placement
/**
 * 找到可达范围内可写的 git 检出，或返回无法担保的位置。
 */
async function findHeldCheckout(includePath, cwd) {
  if (hasDotDotSegment(includePath) || !isAbsolute(includePath)) return null;
  let reach = classifyReachRoot(includePath, cwd);
  let sorted = normalizeCaseForComparison_2(reach.nodes)
    .filter((node) => !reach.links.has(node) && !reach.cutAt.has(node) && isTraversableDirectory(node))
    .filter(isGitRepoDir)
    .sort((left, right) => right.split(sep).length - left.split(sep).length);
  for (let checkout of sorted)
    if (await isCheckoutHeld(reach, checkout))
      return {
        kind: "held",
        checkout,
      };
  let [unvouchedAt] = reach.cutAt;
  return unvouchedAt === undefined
    ? null
    : {
        kind: "unvouched",
        at: unvouchedAt,
      };
}
//@ chunk-fepf8jp6.js:59433-59643 placement
async function isCheckoutHeld(reach, checkout) {
  let filtered = normalizeCaseForComparison_2(reach.nodes).filter((node) => isPathInside(checkout, node));
  if (filtered.some((node) => reach.cutAt.has(node))) return true;
  let filtered_2 = filtered.filter((node) => !reach.links.has(node));
  let results = await Promise.all(filtered_2.map(isWritableOrOwned));
  return filtered_2.length === 0 || results.some((owned) => owned === true);
}
//@ chunk-fepf8jp6.js:59643-60203 placement
function classifyReachRoot(startPath, cwd) {
  let linkNodes = new Set();
  let cutAt = new Set();
  let linkHops = 0;
  let walk = (path, tail) => {
    let { root } = parse(path);
    let filtered = path
      .slice(root.length)
      .split(sep === "/" ? /\/+/ : /[\\/]+/)
      .filter((segment) => segment !== "");
    return [root, ...walkParts(root, [...filtered, ...tail])];
  };
  let walkParts = (base, parts) => {
    let [part, ...rest] = parts;
    if (part === undefined) return [];
    let nextPath = join(base, part);
    let linkKind = lstatLinkKind(nextPath);
    if (linkKind === "missing")
      return [
        nextPath,
        ...rest.map((tailPart, tailIndex) => join(nextPath, ...rest.slice(0, tailIndex + 1))),
      ];
    if (linkKind === "opaque") {
      cutAt.add(nextPath);
      return [nextPath];
    }
    if (linkKind.link === null) return [nextPath, ...walkParts(nextPath, rest)];
    linkNodes.add(nextPath);
    let linkSpelling =
      ++linkHops > MAX_LINK_HOPS
        ? null
        : resolveForeignSpelling(
            classifyPathSpellingSync(linkKind.link, base, cwd),
            cwd,
            protectedHomeRoots(),
          );
    if (linkSpelling === null || linkSpelling.verdict !== "local") {
      cutAt.add(nextPath);
      return [nextPath];
    }
    return [nextPath, ...walk(linkSpelling.spelling, rest)];
  };
  return {
    nodes: walk(startPath, []),
    links: linkNodes,
    cutAt,
  };
}
//@ chunk-fepf8jp6.js:60203-60515 placement
/**
 * 路径可写，或属当前用户（不存在返回 absent）。
 */
async function isWritableOrOwned(path) {
  try {
    await access(path, constants.W_OK);
    return true;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "absent";
    if (!(errnoCode === "EACCES" || errnoCode === "EPERM" || errnoCode === "EROFS")) return true;
  }
  try {
    let uid = process.getuid?.();
    return uid === undefined || (await lstat(path)).uid === uid;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : true;
  }
}
//@ chunk-fepf8jp6.js:60515-60551 placement
function isTraversableDirectory(path) {
  return !isNetworkMountRoot_2(path) && !isProcFilesystem(path);
}
//@ chunk-fepf8jp6.js:60551-60609 placement
function isProcFilesystem(path) {
  try {
    return statfsSync(path).type === PROC_SUPER_MAGIC;
  } catch {
    return false;
  }
}
//@ chunk-fepf8jp6.js:60609-60620 placement
var PROC_SUPER_MAGIC = 391;
//@ chunk-fepf8jp6.js:60620-60665 placement
function isGitRepoDir(dirPath) {
  return pathMayExist(join(dirPath, ".git")) || isCurrentDirectoryBareGitRepo(dirPath);
}
//@ chunk-fepf8jp6.js:60665-60829 placement (2.1.88 match: isCurrentDirectoryBareGitRepo, 0.756)
function isCurrentDirectoryBareGitRepo(dirPath) {
  return (
    basename(dirPath).toLowerCase() !== ".git" &&
    (["HEAD", "objects", "refs"].every((name) => pathExistsSync(join(dirPath, name))) ||
      (lstatOrUndefined(join(dirPath, "worktrees"))?.isDirectory() === true &&
        isGitdirFile(join(dirPath, "config"))))
  );
}
//@ chunk-fepf8jp6.js:60829-60866 placement
function pathExistsSync(path) {
  return lstatOrUndefined(path) !== undefined;
}
//@ chunk-fepf8jp6.js:60866-61004 placement
function pathMayExist(path) {
  try {
    return (
      lstatSync(path, {
        throwIfNoEntry: false,
      }) !== undefined
    );
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return !(errnoCode === "ENOTDIR" || errnoCode === "ELOOP" || errnoCode === "ENAMETOOLONG");
  }
}
//@ chunk-fepf8jp6.js:61004-61039 placement
var GIT_CONFIG_HEAD_PROBE_BYTES = 4096;
var CORE_SECTION_RE = /^[ \t]*\[core\]/im;
//@ chunk-fepf8jp6.js:61039-61256 placement
function isGitdirFile(configPath) {
  if (lstatOrUndefined(configPath)?.isFile() !== true) return false;
  try {
    let fd = openSync(configPath, readOnlyNoFollowFlags());
    try {
      let buffer = Buffer.alloc(GIT_CONFIG_HEAD_PROBE_BYTES);
      let bytesRead = readSync(fd, buffer, 0, GIT_CONFIG_HEAD_PROBE_BYTES, 0);
      let replaced = buffer.toString("latin1", 0, bytesRead).replace(/^\xEF\xBB\xBF/, "");
      return CORE_SECTION_RE.test(replaced);
    } finally {
      closeSync(fd);
    }
  } catch {
    return false;
  }
}
//@ chunk-fepf8jp6.js:61256-61271 placement
/**
 * 遍历配置文件时允许的字节上限。
 */
var MAX_CONFIG_WALK_BYTES = 1048576;
//@ chunk-fepf8jp6.js:67711-67777 placement
/**
 * 取 lstat 结果；不存在或出错返回 undefined。
 */
function lstatOrUndefined(path) {
  try {
    return lstatSync(path, {
      throwIfNoEntry: false,
    });
  } catch {
    return;
  }
}
//@ chunk-fepf8jp6.js:67777-67871 placement
function resolveRealPathLoose(path, cwd) {
  if (isPathTooDeep(path, 0)) return null;
  let [head, tail] = splitAtPathMax(path);
  let realHead = realpathWithMissingTail(head, cwd);
  return realHead === null ? null : join(realHead, tail);
}
//@ chunk-fepf8jp6.js:67871-68130 placement (2.1.88 match: getReservedShortcuts, 0.807)
function splitAtPathMax(path) {
  let pathMax = getPlatform() === "windows" ? null : getPlatform() === "macos" ? 1024 : 4096;
  if (pathMax === null || Buffer.byteLength(path) < pathMax) return [path, ""];
  let index = path.lastIndexOf(sep, pathMax - 1);
  while (index > 0 && Buffer.byteLength(path.slice(0, index)) >= pathMax)
    index = path.lastIndexOf(sep, index - 1);
  return index > 0 ? [path.slice(0, index), path.slice(index + 1)] : [path, ""];
}
//@ chunk-fepf8jp6.js:68130-68406 placement
function realpathWithMissingTail(path, cwd, missingTail = [], hops = 0) {
  if (isPathTooDeep(path, missingTail.length)) return null;
  try {
    return join(toUncLongPath(realpathSync.native(path)), ...missingTail);
  } catch {
    let linkInfo = hops < MAX_LINK_HOPS_2 ? readLinkTargetInfo(path) : null;
    if (linkInfo !== null) {
      let { spelling, verdict } = classifyPathSpellingSync(linkInfo.text, linkInfo.dir, cwd);
      return verdict === "local" ? realpathWithMissingTail(spelling, cwd, missingTail, hops + 1) : null;
    }
    let parentDir = dirname(path);
    return parentDir === path
      ? join(path, ...missingTail)
      : realpathWithMissingTail(parentDir, cwd, [basename(path), ...missingTail], hops);
  }
}
//@ chunk-fepf8jp6.js:68406-68494 placement
function resolvePathSpellings(path, cwd) {
  let realPathLoose = resolveRealPathLoose(path, cwd);
  return realPathLoose === null
    ? spellingsToCheck(
        {
          spelling: path,
          verdict: "opaque",
        },
        cwd,
      )
    : [realPathLoose];
}
//@ chunk-fepf8jp6.js:68494-68568 placement
var MAX_LINK_HOPS_2 = 8;
var GIT_NOT_FOUND_MESSAGE = "git was not found on the PATH this process was started with";
//@ chunk-fepf8jp6.js:68568-68730 placement
function homeInCheckoutNote(tree) {
  let ancestor = nearestRepoAncestor(tree);
  return ancestor === null
    ? ""
    : `; the home directory counts here because it ${classifyHomePosition(ancestor, tree) === "home" ? "is itself" : "lies inside"} a git checkout (${ancestor})`;
}
//@ chunk-fepf8jp6.js:68730-69281 placement
/**
 * 云会话可写目录范围的说明文本，以及目录无法检查时的提示。
 */
var SANDBOX_REACH_TEXTS = `${GIT_NOT_FOUND_MESSAGE} (directories a cloud session bound here can write \u2014 inside this checkout or a checkout enclosing it, such as a worktree\u2019s main checkout; below your home directory when it is, or lies inside, a git checkout; a session temp directory; one whose git links into those \u2014 and directories that name or lead to another host are not searched)`;
var UNEXAMINABLE_REACH_NOTE =
  "If one of the directories that a cloud session can write cannot be examined, or is too deep or too long to resolve, every directory is left out; the debug log names the one to fix.";
//@ chunk-fepf8jp6.js:69281-69329 placement
/**
 * 判断路径是否位于外部挂载或指向不安全目标。
 */
function pathIsForeignOrUnsafePointer(pointer, baseDir, mountBase = baseDir) {
  return isOnForeignMount(pointer, mountBase) || rawPointerPathIsUnsafe(pointer, baseDir, mountBase);
}
//@ chunk-fepf8jp6.js:69329-69421 placement
function readLinkTargetInfo(linkPath) {
  try {
    let linkTarget = readlinkSync(linkPath);
    let dir = isAbsolute(linkTarget) ? dirname(linkPath) : realpathSync(dirname(linkPath));
    return {
      text: linkTarget,
      dir,
    };
  } catch {
    return null;
  }
}
//@ chunk-fepf8jp6.js:69421-69546 placement
function filterSafePathEnv(pathValue, reach, expectedNames) {
  let reachPredicate = makeReachPredicate(reach);
  let memo = new Map();
  return pathValue
    .split(delimiter)
    .map((part) => stripPathQuotes(part))
    .filter(
      (part) => part !== "" && isAbsolute(part) && isPathDirSafe(part, reachPredicate, expectedNames, memo),
    )
    .join(delimiter);
}
//@ chunk-fepf8jp6.js:69546-69886 placement
/**
 * PATH 中的目录及其中的 git 等程序都在可达范围之外。
 */
function isPathDirSafe(dirPath, reach, expectedNames, memo = new Map()) {
  if (isReachableOrUnsafe(dirPath, reach, memo)) return false;
  let realPathLoose = resolveRealPathLoose(dirPath, reach.anchor);
  if (realPathLoose === null) return false;
  return expectedNames.every((entryName) => {
    let entryPath = `${dirPath}${sep}${entryName}`;
    if (isForeignSpelling(entryPath, reach.anchor)) return false;
    let linkKind = memo.get(entryPath) ?? lstatLinkKind(entryPath);
    memo.set(entryPath, linkKind);
    if (linkKind === "missing") return !reach(entryPath) && !reach(join(realPathLoose, entryName));
    if (linkKind !== "opaque" && linkKind.link === null) {
      let realPathLoose = resolveRealPathLoose(entryPath, reach.anchor);
      return realPathLoose !== null && !reach(entryPath) && !reach(realPathLoose);
    }
    return !isReachableOrUnsafe(entryPath, reach, memo);
  });
}
//@ chunk-fepf8jp6.js:69886-70011 placement
function makeReachPredicate(roots) {
  return Object.assign((path) => roots.some((root) => isPathInside(root, path)), {
    beneath: (path) => roots.some((root) => isPathInside(path, root) && !isPathInside(root, path)),
    anchor: roots[0] ?? sep,
  });
}
//@ chunk-fepf8jp6.js:70011-70711 placement
/**
 * 判断路径能否被沙箱写到：非绝对、设备路径或在可达范围内（含其上层）直接返回 true；否则逐级 lstat， 遇到不存在的组件按真实路径与剩余部分判断，遇到链接递归解析（限深度），无法判断的视为可达。
 */
function isReachableOrUnsafe(path, reach, memo, hopsLeft = MAX_LINK_HOPS) {
  if (
    !isAbsolute(path) ||
    isWindowsNonDrivePath(path) ||
    path.startsWith("\\\\?\\") ||
    isForeignSpelling(path, reach.anchor) ||
    reach(path) ||
    reach.beneath(path)
  )
    return true;
  let { root } = parse(path);
  let filtered = path
    .slice(root.length)
    .split(sep === "/" ? /\/+/ : /[\\/]+/)
    .filter((segment) => segment !== "" && segment !== ".");
  let currentPath = root;
  for (let [index, segment] of filtered.entries()) {
    currentPath = segment === ".." ? dirname(currentPath) : join(currentPath, segment);
    let cachedKind = memo.get(currentPath);
    if (cachedKind === undefined && (reach(currentPath) || isForeignSpelling(currentPath, reach.anchor)))
      return true;
    let nextKind = cachedKind ?? lstatLinkKind(currentPath);
    memo.set(currentPath, nextKind);
    if (nextKind === "opaque") return true;
    if (nextKind === "missing") {
      let realPathLoose = resolveRealPathLoose(path, reach.anchor);
      return (
        realPathLoose === null ||
        reach(realPathLoose) ||
        reach.beneath(realPathLoose) ||
        filtered
          .slice(index + 1)
          .some((tailSegment, tailIndex) =>
            reach(join(currentPath, ...filtered.slice(index + 1, index + 2 + tailIndex))),
          )
      );
    }
    if (nextKind.link !== null) {
      if (hopsLeft === 0) return true;
      let linkTarget = isAbsolute(nextKind.link)
        ? nextKind.link
        : `${dirname(currentPath)}${sep}${nextKind.link}`;
      return isReachableOrUnsafe(
        [linkTarget, ...filtered.slice(index + 1)].join(sep),
        reach,
        memo,
        hopsLeft - 1,
      );
    }
  }
  let realPathLoose = resolveRealPathLoose(path, reach.anchor);
  return realPathLoose === null || reach(realPathLoose) || reach.beneath(realPathLoose);
}
//@ chunk-fepf8jp6.js:70711-70721 placement
var MAX_LINK_HOPS = 40;
//@ chunk-fepf8jp6.js:70721-70958 placement
function lstatLinkKind(path) {
  try {
    let stats = lstatSync(path, {
      throwIfNoEntry: false,
    });
    if (stats === undefined) return "missing";
    if (!stats.isSymbolicLink())
      return {
        link: null,
      };
    let linkText = readlinkSync(path);
    return {
      link: toUncLongPath(linkText.replace(/^\\\?\?\\/, "\\\\?\\")),
    };
  } catch (error) {
    return getErrnoCode(error) === "ENOTDIR" ? "missing" : "opaque";
  }
}
export {
  collectBaseReachRoots,
  settingsReachRootsForSource,
  collectSettingsWriteRoots,
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
  UNEXAMINABLE_REACH_NOTE,
  reachRootsForRepo,
  findEnclosingRepos,
  checkoutDirOfGitDir,
  createReachCollector,
  outermostRepoAncestor,
  repoAncestorsBelowHome,
  resolvePathSpellings,
  resolveRealPathLoose,
  findHeldCheckout,
  MAX_CONFIG_WALK_BYTES,
  isPathDirSafe,
  pathIsForeignOrUnsafePointer,
  isVolumeRoot,
  nearestRepoAncestor,
  enclosingCheckoutAboveHome,
  classifyHomePosition,
};
