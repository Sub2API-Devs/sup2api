/**
 * utils/plugins/pluginCacheMaterialize.ts
 *
 * 2.1.316 新增：插件缓存链接实体化
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (67)
 * attribution: placement 67
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sep, resolve as resolve_2, parse, dirname, relative, isAbsolute, join, basename } from "path";
import {
  stat,
  realpath,
  lutimes,
  readlink,
  lstat,
  mkdir,
  rm,
  writeFile,
  readdir,
  open,
  rmdir,
  unlink,
} from "fs/promises";
import { constants } from "fs";
import { randomBytes } from "crypto";
import {
  CACHE_META_FILES,
  LINKS_MATERIALIZED_MARKER as LINKS_MATERIALIZED_MARKER_2,
  IN_USE_MARKER_FILE,
  ORPHAN_MARKER_FILE,
} from "./cacheUtils.js";
import { matchesSegmentOrTempName, isNodeModulesSegment, normalizePathSegment } from "../pathSegments.js";
import {
  hasBackslash,
  uncHostOf,
  isDeviceNamespacePath as isDeviceNamespacePath_2,
  isDosDevicePath,
  hasDotSegment,
} from "../pathClassification.js";
import { getPlatform } from "../platform.js";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  isPathAbsent,
  isFsInaccessible,
} from "../errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, literal, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  networkMountRootCached,
  normalizeMountPath,
  networkMountRoots,
  isNetworkishPath,
  isWslUncPath,
  isNonWslUncPath,
  isNetworkMountRoot,
} from "../networkPaths.js";
import { hasWin32DevicePrefixSpelling } from "../fsJunctions.js";
import { makeTempSiblingPath, retryFsOp, isOwnTempName } from "../atomicPublishWrite.js";
import { logForDebugging } from "../debug.js";
import { copyFileNoFollow, ATOMIC_WRITE_ERRNOS, isSameFilesystem, writeFileAtomically } from "./safeCopy.js";
import {
  classifyDirEntry,
  removePathEntry,
  removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2,
} from "../fsRemove.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { isDiskless } from "../../bootstrap/state.js";
import { atomicMoveToInstallPath_2 } from "../nativeInstaller/installer.js";
import { LOCK_STALE_MS, isHashTempFile } from "../../services/memorySync/syncFiles.js";
import { isFreshTimestamp as isFreshTimestamp_2 } from "./pluginCachePaths.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:708539-708583 placement
var CACHE_SKIP_ENTRY_NAMES; // deferred: uses CACHE_META_FILES (./cacheUtils.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:708539", () => {
  CACHE_SKIP_ENTRY_NAMES = new Set(["node_modules", ...CACHE_META_FILES, LINKS_MATERIALIZED_MARKER_2]);
});
//@ chunk-5xgkngpb.js:708583-708616 placement
/**
 * isCacheSkipEntry：是否为缓存遍历跳过项。
 */
function isCacheSkipEntry(name) {
  return matchesSegmentOrTempName(name, CACHE_SKIP_ENTRY_NAMES);
}
//@ chunk-5xgkngpb.js:708616-708702 placement
/**
 * isPathUnder：路径是否在给定目录下。
 */
function isPathUnder(childPath, parentPath) {
  if (childPath === parentPath) return true;
  let parentPrefix = parentPath.endsWith(sep) ? parentPath : parentPath + sep;
  return childPath.startsWith(parentPrefix);
}
//@ chunk-5xgkngpb.js:708702-708731 placement
function sameFileIdentityAs(path) {
  return hasBackslash(path);
}
//@ chunk-5xgkngpb.js:708731-709200 placement
/**
 * 两个路径 stat 的 dev/ino 是否相同（Windows 直接 same）。
 */
async function compareStatIdentity(leftPath, rightPath) {
  if (getPlatform() === "windows") return "same";
  let [left, right] = await Promise.allSettled([
    stat(leftPath, {
      bigint: true,
    }),
    stat(rightPath, {
      bigint: true,
    }),
  ]);
  let filtered = [left, right].filter((result) => result.status === "rejected");
  if (
    filtered.some((result) => {
      let errnoCode = getErrnoCode(result.reason);
      return errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR";
    })
  )
    return "unknown";
  if (filtered.length > 0 || left.status === "rejected" || right.status === "rejected") return "absent";
  if (left.value.ino === 0n || right.value.ino === 0n) return "unknown";
  return left.value.dev === right.value.dev && left.value.ino === right.value.ino ? "same" : "different";
}
//@ chunk-5xgkngpb.js:709200-709505 placement
/**
 * 路径 realpath 是否在根内且 stat 一致（inside/outside/unknown）。
 */
async function classifyRealpathContainment(targetPath, root) {
  let real = await realpath(targetPath);
  if (!isPathUnder(real, root)) return "outside";
  if (getPlatform() === "windows") return "inside";
  let stats;
  try {
    stats = await Promise.all([
      stat(targetPath, {
        bigint: true,
      }),
      stat(real, {
        bigint: true,
      }),
    ]);
  } catch {
    return "unknown";
  }
  let [declaredStat, realStat] = stats;
  if (declaredStat.ino === 0n || realStat.ino === 0n) return "unknown";
  return declaredStat.dev === realStat.dev && declaredStat.ino === realStat.ino ? "inside" : "outside";
}
//@ chunk-5xgkngpb.js:709505-709545 placement
var SYMLINK_COPY_BUDGET = {
  entries: 20000,
  bytes: 536870912,
};
//@ chunk-5xgkngpb.js:709545-709574 placement
/**
 * freshSymlinkCopyBudget：复制预算的初值。
 */
function freshSymlinkCopyBudget() {
  return {
    ...SYMLINK_COPY_BUDGET,
  };
}
//@ chunk-5xgkngpb.js:709574-709732 placement
let SymlinkCopyBudgetError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:709574", () => {
  SymlinkCopyBudgetError = class SymlinkCopyBudgetError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor() {
      super(
        "Plugin materializes more files through symlinks than the copy budget allows",
        "plugin symlink copy budget exceeded",
      );
    }
  };
});
//@ chunk-5xgkngpb.js:709732-709815 placement
/**
 * consumeSymlinkCopyBudget：扣减复制预算。
 */
function consumeSymlinkCopyBudget(budget, entries, bytes) {
  budget.entries -= entries;
  budget.bytes -= bytes;
  if (budget.entries < 0 || budget.bytes < 0) throw new SymlinkCopyBudgetError();
}
//@ chunk-5xgkngpb.js:709815-709860 placement
/**
 * pathHasNodeModulesSegment：路径里是否含 node_modules。
 */
function pathHasNodeModulesSegment(path) {
  return path.split(sep).some(isNodeModulesSegment);
}
//@ chunk-5xgkngpb.js:709860-709914 placement
var WRITE_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TIMESTAMP_SKEW_LIMIT_MS;
deferInit("chunk-5xgkngpb.js:709860", () => {
  WRITE_ERROR_CODES = new Set(["EROFS", "EACCES", "EPERM"]);
  TIMESTAMP_SKEW_LIMIT_MS = 600000;
});
//@ chunk-5xgkngpb.js:709914-709970 placement
function isTimestampFreshish(mtimeMs) {
  let stampMtimeMs = Date.now() - mtimeMs;
  return stampMtimeMs > -TIMESTAMP_SKEW_LIMIT_MS && stampMtimeMs < TIMESTAMP_SKEW_LIMIT_MS;
}
//@ chunk-5xgkngpb.js:709970-710223 placement
var MATERIALIZE_MAX_AGE_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_MARKER_BYTES;
var PARKED_SUFFIX;
var ORIGIN_SUFFIX;
var MAX_ORIGIN_BYTES;
var MAX_SCREEN_MARKER_BYTES;
var SCREEN_VERSION;
var ScreenMarkerSchema;
var TRANSIENT_FS_ERRORS;
deferInit("chunk-5xgkngpb.js:709970", () => {
  MATERIALIZE_MAX_AGE_MS = 600000;
  MAX_MARKER_BYTES = 4096;
  PARKED_SUFFIX = ".parked";
  ORIGIN_SUFFIX = ".origin";
  MAX_ORIGIN_BYTES = 4096;
  MAX_SCREEN_MARKER_BYTES = 4096;
  SCREEN_VERSION = 2;
  ScreenMarkerSchema = DoctorLazy(() =>
    objectSchema({
      at: stringSchema(),
      cli: stringSchema(),
      screen: literal(SCREEN_VERSION),
      materialized: numberSchema(),
      removed: numberSchema(),
      failed: numberSchema(),
    }),
  );
  TRANSIENT_FS_ERRORS = new Set([
    "EBUSY",
    "EAGAIN",
    "EMFILE",
    "ENFILE",
    "EIO",
    "EINTR",
    "ENOTEMPTY",
    "EPERM",
    "EACCES",
  ]);
});
//@ chunk-5xgkngpb.js:710223-710279 placement
function touchPathTimes(path) {
  let date = new Date();
  lutimes(path, date, date).catch(() => {});
}
//@ chunk-5xgkngpb.js:710279-710618 placement
/**
 * 构造判断链接拼写/目标是否指向网络或其他卷的检查器。
 */
function createLinkTargetScreen(rootDir) {
  let mountRootOf = (path) => {
    let mountRoot = networkMountRootCached(path);
    return mountRoot === null ? null : normalizeMountPath(mountRoot);
  };
  let baseMount = mountRootOf(rootDir);
  let baseHost = uncHostOf(rootDir);
  let hasOtherMounts = (parent) => networkMountRoots(parent).some((root) => root !== baseMount);
  let spellingSuspicious = (path) => {
    if (!isNetworkishPath(path) && !isWslUncPath(path)) return false;
    if (isDeviceNamespacePath_2(path) || hasWin32DevicePrefixSpelling(path) || isDosDevicePath(path))
      return true;
    if (isNonWslUncPath(path) || isWslUncPath(path)) {
      let host = uncHostOf(path);
      return host === null || host !== baseHost;
    }
    if (isNetworkMountRoot(path)) return hasDotSegment(path) || mountRootOf(path) !== baseMount;
    return true;
  };
  return {
    spelling: spellingSuspicious,
    target: (target, parent) =>
      spellingSuspicious(target) ||
      spellingSuspicious(resolve_2(parent, target)) ||
      hasOtherMounts(parent + sep + target),
  };
}
//@ chunk-5xgkngpb.js:710618-710740 placement
var MAX_SYMLINK_HOPS_2 = 40;
var DRIVE_RELATIVE_RE = /^[a-zA-Z]:(?![\\/])/;
var splitPathSegments_2 = (path) =>
  path
    .slice(parse(path).root.length)
    .split(sep === "\\" ? /[\\/]+/ : /\/+/)
    .filter(Boolean);
//@ chunk-5xgkngpb.js:710740-710811 placement
/**
 * resolveLinkChainFromParent：从父目录起解析链接链。
 */
async function resolveLinkChainFromParent(linkPath, screen, firstTarget, options = {}) {
  return walkLinkChain(dirname(linkPath), [], screen, options, firstTarget ?? (await readlink(linkPath)));
}
//@ chunk-5xgkngpb.js:710811-710867 placement
async function resolveLinkChainForPath(root, relPath, screen, options = {}) {
  return walkLinkChain(root, splitPathSegments_2(relPath), screen, options);
}
//@ chunk-5xgkngpb.js:710867-712147 placement
/**
 * 手动逐段解析路径（含 Windows junction/盘符相对路径），每段检查是否指向网络位置； 链接跳数超过上限返回 loop，缺失返回 dangling，拼写可疑返回 network，Windows 不支持的形式返回 unsupported。
 */
async function walkLinkChain(root, segments, screen, options, firstLink) {
  let isWin32 = (options.platform ?? (getPlatform() === "windows" ? "win32" : "posix")) === "win32";
  let current = root;
  let sliced = segments.slice();
  let hops = firstLink === undefined ? 0 : 1;
  let applyLinkTarget = (target, parent) => {
    if (screen.target(target, parent)) return "network";
    if (isWin32) {
      if (DRIVE_RELATIVE_RE.test(target)) return "unsupported";
      let resolved = resolve_2(parent, target, ...sliced);
      if (screen.spelling(resolved)) return "network";
      sliced.length = 0;
      let trustedRoot = options.trustedRoot;
      if (trustedRoot !== undefined && (resolved === trustedRoot || isPathUnder(resolved, trustedRoot))) {
        current = trustedRoot;
        sliced.push(...splitPathSegments_2(relative(trustedRoot, resolved)));
      } else {
        current = parse(resolved).root;
        if (trustedRoot !== undefined && current.toLowerCase() !== parse(trustedRoot).root.toLowerCase())
          return "unsupported";
        sliced.push(...splitPathSegments_2(resolved));
      }
      return null;
    }
    if (isAbsolute(target)) current = parse(target).root;
    else current = parent;
    sliced.unshift(...splitPathSegments_2(target));
    return null;
  };
  if (firstLink !== undefined) {
    let verdict = applyLinkTarget(firstLink, root);
    if (verdict !== null) return verdict;
  }
  while (sliced.length > 0) {
    let segment = sliced.shift();
    if (segment === ".") continue;
    if (segment === "..") {
      current = dirname(current);
      continue;
    }
    let childPath = join(current, segment);
    if (screen.spelling(childPath)) return "network";
    let stat;
    try {
      stat = await lstat(childPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "dangling";
      throw error;
    }
    if (stat.isSymbolicLink()) {
      if (++hops > MAX_SYMLINK_HOPS_2) return "loop";
      let verdict = applyLinkTarget(await readlink(childPath), current);
      if (verdict !== null) return verdict;
      continue;
    }
    if (sliced.length > 0 && !stat.isDirectory()) return "dangling";
    if (isWin32 && stat.isDirectory()) {
      let junctionTarget;
      try {
        junctionTarget = await readlink(childPath);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "dangling";
        if (errnoCode !== "EINVAL") throw error;
        junctionTarget = null;
      }
      if (junctionTarget !== null) {
        if (++hops > MAX_SYMLINK_HOPS_2) return "loop";
        let verdict = applyLinkTarget(junctionTarget, current);
        if (verdict !== null) return verdict;
        continue;
      }
    }
    current = childPath;
  }
  return "clean";
}
//@ chunk-5xgkngpb.js:712147-712340 placement
function stagedCopyReplacedError(passLabel) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Refusing to swap in a staged copy: it is no longer the ${passLabel} this pass made (replaced during the conversion).`,
    "plugin cache staged copy replaced before the swap",
  );
}
//@ chunk-5xgkngpb.js:712340-720078 placement
/**
 * 实体化插件目录中的链接（命令源等），无法写入时保留链接。
 */
async function materializePluginLinks(pluginPath, copyDir, options = {}) {
  let startTime = performance.now();
  let budget = options.budget ?? freshSymlinkCopyBudget();
  let mode = options.mode ?? "install";
  let result = {
    vouched: false,
    materialized: 0,
    removed: 0,
    failed: 0,
    readOnly: false,
  };
  if (!(await lstat(pluginPath)).isDirectory())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin path is not a directory: ${pluginPath}`,
      "plugin path is not a directory",
    );
  let realRoot = await realpath(pluginPath);
  let stamped;
  let scratchDir;
  try {
    stamped = await stampMaterializedTree(pluginPath, realRoot, mode, options.sharedPath);
    scratchDir = makeTempSiblingPath(join(realRoot, LINKS_MATERIALIZED_MARKER_2));
    await mkdir(scratchDir);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== undefined && WRITE_ERROR_CODES.has(errnoCode)) {
      logForDebugging(`materializeLinks: ${pluginPath}: cannot write (${errnoCode}), leaving links in place`);
      return {
        ...result,
        readOnly: true,
      };
    }
    throw error;
  }
  let scratchStat = await lstat(scratchDir, {
    bigint: true,
  });
  let isScratchOurs = async () => {
    let current = await lstat(scratchDir, {
      bigint: true,
    }).catch(() => null);
    return (
      current !== null &&
      current.isDirectory() &&
      current.ino === scratchStat.ino &&
      current.dev === scratchStat.dev
    );
  };
  let assertScratchOurs = async () => {
    if (!(await isScratchOurs())) throw Error("the scratch directory is no longer the one this pass created");
  };
  let counter = 0;
  let nextScratchPath = async () => {
    await assertScratchOurs();
    return join(scratchDir, String(counter++));
  };
  let discardScratch = async (path) => {
    if (await isScratchOurs())
      await rm(path, {
        recursive: true,
        force: true,
      }).catch(() => {});
  };
  let parkedUnrestored = false;
  let leftForLater = 0;
  let mayVouch = true;
  let linkTargetScreen = createLinkTargetScreen(realRoot);
  let onFailure = (rel, error) => {
    result.failed++;
    logForDebugging(`materializeLinks: failed ${rel}: ${errorMessage(error)}`, {
      level: "warn",
    });
  };
  let isStillLink = async (path) => {
    let stat = await lstat(path).catch(() => null);
    return stat !== null && !stat.isSymbolicLink();
  };
  let dropLink = async (path, rel, target, reason) => {
    try {
      if (!(await lstat(path)).isSymbolicLink()) return;
      await retryFsOp(path, await nextScratchPath());
      result.removed++;
      logForDebugging(`materializeLinks: removed ${rel} -> ${target} (${reason})`);
    } catch (error) {
      if (
        getErrnoCode(error) !== "ENOENT" ||
        (await lstat(path).catch(() => null))?.isSymbolicLink() === true
      )
        onFailure(rel, error);
    }
  };
  let handleDangling = async (path, rel, target, reason = "dangling") => {
    if (!stamped || (await hasOtherTempEntries(realRoot, scratchDir))) {
      if (mode === "install") {
        onFailure(
          rel,
          Error(
            "link does not resolve and the tree could not be settled this time (a sweep step the OS refused, or another pass is live)",
          ),
        );
        return;
      }
      logForDebugging(
        `materializeLinks: left ${rel} -> ${target}: does not resolve while another pass may be converting this tree; judged on a later load`,
      );
      leftForLater++;
      mayVouch = false;
      return;
    }
    return dropLink(path, rel, target, reason);
  };
  let onBudgetExceeded = (path, rel, target, error) => {
    if (mode === "migrate") return dropLink(path, rel, target, "over copy budget");
    throw error;
  };
  let restoreBudget = (saved) => {
    budget.entries = saved.entries;
    budget.bytes = saved.bytes;
  };
  let copyFileLink = async (linkPath, rel, target, realTarget, size) => {
    let budgetBefore = {
      ...budget,
    };
    try {
      consumeSymlinkCopyBudget(budget, 1, size);
    } catch (error) {
      restoreBudget(budgetBefore);
      if (error instanceof SymlinkCopyBudgetError) return onBudgetExceeded(linkPath, rel, target, error);
      throw error;
    }
    let stagedPath = await nextScratchPath();
    try {
      await copyFileNoFollow(realTarget, stagedPath, {
        exclusive: true,
        exactMode: true,
        nonBlocking: true,
      });
      await swapStagedIn(stagedPath, linkPath, rel);
      result.materialized++;
      logForDebugging(`materializeLinks: copied ${rel} (was symlink -> ${target})`);
    } catch (error) {
      await discardScratch(stagedPath);
      restoreBudget(budgetBefore);
      if (!(await isStillLink(linkPath))) onFailure(rel, error);
    }
  };
  let swapStagedIn = async (stagedPath, linkPath, target) => {
    try {
      await assertScratchOurs();
      if (!(await lstat(stagedPath)).isFile()) throw stagedCopyReplacedError("file");
      await retryFsOp(stagedPath, linkPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === undefined || !ATOMIC_WRITE_ERRNOS.has(errnoCode)) throw error;
      let stat = await lstat(linkPath).catch(() => null);
      if (stat === null || !stat.isSymbolicLink()) throw error;
      let originPath = await nextScratchPath();
      await writeFile(originPath + ORIGIN_SUFFIX, target, {
        flag: "wx",
      });
      let parkStat = await lstat(linkPath).catch(() => null);
      if (parkStat === null || !parkStat.isSymbolicLink()) throw error;
      await assertScratchOurs();
      await retryFsOp(linkPath, originPath + PARKED_SUFFIX);
      try {
        await assertScratchOurs();
        if (!(await lstat(stagedPath)).isFile()) throw stagedCopyReplacedError("file");
        await retryFsOp(stagedPath, linkPath);
      } catch (error) {
        if (!(await isStillLink(linkPath)) && (await isScratchOurs()))
          await retryFsOp(originPath + PARKED_SUFFIX, linkPath).catch(() => {
            parkedUnrestored = true;
          });
        throw error;
      }
    }
  };
  let copyDirLink = async (linkPath, rel, target, realTarget) => {
    let stagedDir = await nextScratchPath();
    let budgetBefore = {
      ...budget,
    };
    try {
      consumeSymlinkCopyBudget(budget, 1, 0);
      await copyDir(
        realTarget,
        stagedDir,
        realTarget,
        stagedDir,
        realRoot,
        true,
        new Set([realTarget]),
        budget,
        true,
      );
    } catch (error) {
      await discardScratch(stagedDir);
      restoreBudget(budgetBefore);
      if (error instanceof SymlinkCopyBudgetError) return onBudgetExceeded(linkPath, rel, target, error);
      return onFailure(rel, error);
    }
    try {
      let originPath = await nextScratchPath();
      await writeFile(originPath + ORIGIN_SUFFIX, rel, {
        flag: "wx",
      });
      let stat = await lstat(linkPath).catch(() => null);
      if (stat === null || !stat.isSymbolicLink()) {
        await discardScratch(stagedDir);
        restoreBudget(budgetBefore);
        return;
      }
      await assertScratchOurs();
      await retryFsOp(linkPath, originPath + PARKED_SUFFIX);
      try {
        await assertScratchOurs();
        if (!(await lstat(stagedDir)).isDirectory()) throw stagedCopyReplacedError("directory");
        await retryFsOp(stagedDir, linkPath);
      } catch (error) {
        if (!(await isStillLink(linkPath)) && (await isScratchOurs()))
          await retryFsOp(originPath + PARKED_SUFFIX, linkPath).catch(() => {
            parkedUnrestored = true;
          });
        throw error;
      }
      result.materialized++;
      logForDebugging(`materializeLinks: copied ${rel} (was symlink -> ${target})`);
    } catch (error) {
      await discardScratch(stagedDir);
      restoreBudget(budgetBefore);
      if (!(await isStillLink(linkPath))) onFailure(rel, error);
    }
  };
  let visitLink = async (dir, name, depth) => {
    let linkPath = join(dir, name);
    let rel = relative(realRoot, linkPath);
    let target;
    try {
      target = await readlink(linkPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "EINVAL" && errnoCode !== "ENOENT") onFailure(rel, error);
      return;
    }
    if (depth === 0 && !isNodeModulesSegment(name) && isCacheSkipEntry(name))
      return dropLink(linkPath, rel, target, "reserved name");
    if (sameFileIdentityAs(rel)) return dropLink(linkPath, rel, target, "backslash in name");
    let verdict;
    try {
      verdict = await resolveLinkChainFromParent(linkPath, linkTargetScreen, target, {
        trustedRoot: realRoot,
      });
    } catch (error) {
      onFailure(rel, error);
      return;
    }
    if (verdict === "network") return dropLink(linkPath, rel, target, "network target");
    if (verdict === "unsupported") return dropLink(linkPath, rel, target, "unsupported target spelling");
    if (verdict !== "clean") return handleDangling(linkPath, rel, target);
    let realPath;
    try {
      realPath = await realpath(linkPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return handleDangling(linkPath, rel, target);
      onFailure(rel, error);
      return;
    }
    if (!isPathUnder(realPath, realRoot)) return dropLink(linkPath, rel, target, "escapes plugin root");
    if (inNodeModules(rel)) {
      let identity = await compareStatIdentity(linkPath, realPath);
      if (identity === "different")
        return dropLink(linkPath, rel, target, "opens a different file than it resolves to");
      if (identity === "absent") return handleDangling(linkPath, rel, target);
      if (identity === "unknown") {
        onFailure(rel, Error("kept link identity could not be proven (stat failed or no inode number)"));
        return;
      }
      keptLinks.push({
        linkPath,
        rel,
        target,
      });
      return;
    }
    if (isPathUnder(dir, realPath)) return dropLink(linkPath, rel, target, "ancestor cycle");
    let targetStat;
    try {
      targetStat = await lstat(realPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return handleDangling(linkPath, rel, target);
      onFailure(rel, error);
      return;
    }
    if (targetStat.isSymbolicLink()) {
      onFailure(rel, Error("target swapped for a link since it was resolved"));
      return;
    }
    if (!targetStat.isFile() && !targetStat.isDirectory())
      return dropLink(linkPath, rel, target, "non-regular target");
    if (targetStat.isFile()) return copyFileLink(linkPath, rel, target, realPath, targetStat.size);
    return copyDirLink(linkPath, rel, target, realPath);
  };
  let isOwnScratchName = (name) => isOwnTempName(normalizePathSegment(name), LINKS_MATERIALIZED_MARKER_2);
  let inNodeModules = pathHasNodeModulesSegment;
  let keptLinks = [];
  let recheckKeptLinks = async () => {
    let sliced = keptLinks.slice();
    for (let idx = 0; idx <= keptLinks.length; idx++) {
      let results = await Promise.all(
        sliced.map(async (entry) => {
          try {
            let linkChainFromParent = await resolveLinkChainFromParent(
              entry.linkPath,
              linkTargetScreen,
              undefined,
              {
                trustedRoot: realRoot,
              },
            );
            if (linkChainFromParent === "network") return "network target after conversion";
            if (linkChainFromParent === "unsupported") return "unsupported target spelling";
            if (linkChainFromParent !== "clean") return "dangling after conversion";
            let realPath = await realpath(entry.linkPath);
            if (!isPathUnder(realPath, realRoot)) return "escapes plugin root after conversion";
            let identity = await compareStatIdentity(entry.linkPath, realPath);
            if (identity === "unknown") return "unexamined";
            if (identity === "absent") return "dangling after conversion";
            return identity === "same" ? null : "opens a different file than it resolves to after conversion";
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            return errnoCode === "ENOENT" || errnoCode === "ENOTDIR"
              ? "dangling after conversion"
              : "unexamined";
          }
        }),
      );
      if (results.every((verdict) => verdict === null)) return;
      let remaining = [];
      for (let [index, entry] of sliced.entries()) {
        let verdict = results[index];
        if (verdict === null || verdict === undefined) remaining.push(entry);
        else if (verdict === "unexamined") {
          if (mode === "install")
            onFailure(entry.rel, Error("kept link could not be re-checked after conversion"));
          else {
            logForDebugging(
              `materializeLinks: left ${entry.rel} -> ${entry.target}: could not be re-checked after the conversion; judged on a later load`,
            );
            leftForLater++;
            mayVouch = false;
          }
        } else if (verdict === "dangling after conversion")
          await handleDangling(entry.linkPath, entry.rel, entry.target, verdict);
        else await dropLink(entry.linkPath, entry.rel, entry.target, verdict);
      }
      sliced = remaining;
    }
  };
  let walk = async (dir, depth) => {
    let entries;
    try {
      entries = await readdir(dir, {
        withFileTypes: true,
      });
    } catch (error) {
      onFailure(relative(realRoot, dir) || ".", error);
      return;
    }
    for (let entry of entries) {
      let info;
      try {
        info = await classifyDirEntry(dir, entry);
      } catch (error) {
        if (getErrnoCode(error) !== "ENOENT") onFailure(relative(realRoot, join(dir, entry.name)), error);
        continue;
      }
      if (info.isDirectory) {
        if (depth === 0 && isOwnScratchName(entry.name)) continue;
        let stat;
        try {
          stat = await lstat(join(dir, entry.name));
        } catch (error) {
          if (getErrnoCode(error) !== "ENOENT") onFailure(relative(realRoot, join(dir, entry.name)), error);
          continue;
        }
        if (stat.isSymbolicLink()) await visitLink(dir, entry.name, depth);
        else if (stat.isDirectory()) {
          let sameFs =
            getPlatform() !== "windows"
              ? true
              : await isSameFilesystem(dir, entry.name).catch((error) => {
                  if (getErrnoCode(error) !== "ENOENT")
                    onFailure(relative(realRoot, join(dir, entry.name)), error);
                  return null;
                });
          if (sameFs === null) continue;
          if (!sameFs) {
            onFailure(
              relative(realRoot, join(dir, entry.name)),
              Error("directory resolves elsewhere (reparse point)"),
            );
            continue;
          }
          await walk(join(dir, entry.name), depth + 1);
        }
      } else if (info.isSymbolicLink) await visitLink(dir, entry.name, depth);
    }
  };
  let interval = setInterval(touchPathTimes, TIMESTAMP_SKEW_LIMIT_MS / 4, scratchDir);
  interval.unref();
  let scratchRemoved = false;
  try {
    await walk(realRoot, 0);
    await recheckKeptLinks();
  } finally {
    clearInterval(interval);
    let stillOurs = await isScratchOurs().catch(() => false);
    if (!parkedUnrestored && !stillOurs)
      logForDebugging(
        `materializeLinks: ${pluginPath}: ${scratchDir} is no longer the folder this pass made; left in place, tree not vouched for`,
        {
          level: "warn",
        },
      );
    scratchRemoved =
      !parkedUnrestored &&
      stillOurs &&
      (await rm(scratchDir, {
        recursive: true,
        force: true,
      }).then(
        () => true,
        (error) => {
          logForDebugging(
            `materializeLinks: ${pluginPath}: cannot remove ${scratchDir}: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return false;
        },
      ));
  }
  if (
    result.failed === 0 &&
    stamped &&
    mayVouch &&
    scratchRemoved &&
    !(mode === "migrate" && (await hasOtherTempEntries(realRoot, scratchDir)))
  )
    if (mode === "migrate" && !(await hasUnexpectedEntry(realRoot))) {
      if (leftForLater === 0) result.settledUnvouched = true;
    } else result.vouched = await writeScreenMarker(pluginPath, realRoot, result);
  logForDebugging(
    `materializeLinks: ${pluginPath}: materialized=${result.materialized} removed=${result.removed} failed=${result.failed}${leftForLater > 0 ? ` left-for-later=${leftForLater}` : ""} in ${Math.round(performance.now() - startTime)}ms`,
  );
  return result;
}
//@ chunk-5xgkngpb.js:720078-720103 placement
var REFUSED_SYMBOL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:720078", () => {
  REFUSED_SYMBOL = Symbol("refused");
});
//@ chunk-5xgkngpb.js:720103-720207 placement
async function toTransientSentinel(promise) {
  try {
    return await promise;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== undefined && WRITE_ERROR_CODES.has(errnoCode)) return REFUSED_SYMBOL;
    throw error;
  }
}
//@ chunk-5xgkngpb.js:720207-721138 placement
async function stampMaterializedTree(label, root, mode, sharedPath = false) {
  let complete = true;
  if (mode === "install") {
    if (!(await convertDirectoryToZipInPlace(root, LINKS_MATERIALIZED_MARKER_2))) complete = false;
    if (sharedPath) {
      if ((await toTransientSentinel(removePathEntry(join(root, IN_USE_MARKER_FILE)))) === REFUSED_SYMBOL)
        complete = false;
    } else if (!(await convertDirectoryToZipInPlace(root, IN_USE_MARKER_FILE))) complete = false;
  }
  let transientSentinel = await toTransientSentinel(readdir(root));
  if (transientSentinel === REFUSED_SYMBOL) {
    logForDebugging(`materializeLinks: ${label}: cannot list the tree this time; not stamping`);
    return false;
  }
  for (let name of transientSentinel) {
    if (!isOwnTempName(normalizePathSegment(name), LINKS_MATERIALIZED_MARKER_2)) continue;
    let path = join(root, name);
    if (mode === "migrate") {
      let transientSentinel = await toTransientSentinel(
        lstat(path).catch((error) => {
          if (getErrnoCode(error) === "ENOENT") return null;
          throw error;
        }),
      );
      if (transientSentinel === null) continue;
      if (transientSentinel === REFUSED_SYMBOL) {
        complete = false;
        continue;
      }
      if (!transientSentinel.isDirectory()) {
        if (
          (await toTransientSentinel(
            rm(path, {
              force: true,
            }),
          )) === REFUSED_SYMBOL
        )
          complete = false;
        continue;
      }
      if (isTimestampFreshish(transientSentinel.mtimeMs)) {
        complete = false;
        logForDebugging(
          `materializeLinks: ${label}: ${name} may belong to a pass in progress; not stamping this time`,
        );
        continue;
      }
      let differentFs = await isOnDifferentFilesystem(root, name);
      if (differentFs === null) continue;
      if (differentFs) {
        if ((await scanDirectory_2(path)) !== true) complete = false;
        continue;
      }
      if (!(await restoreParkedEntries(label, root, path))) {
        complete = false;
        continue;
      }
    }
    let differentFs = await isOnDifferentFilesystem(root, name);
    if (differentFs === null) continue;
    if (differentFs) {
      if ((await scanDirectory_2(path)) !== true) complete = false;
      continue;
    }
    if (
      (await toTransientSentinel(
        rm(path, {
          recursive: true,
          force: true,
        }),
      )) === REFUSED_SYMBOL
    )
      complete = false;
  }
  return complete;
}
//@ chunk-5xgkngpb.js:721138-721213 placement (2.1.88 match: scanDirectory, 0.767)
async function scanDirectory_2(dirPath) {
  let transientSentinel = await toTransientSentinel(removePathEntry(dirPath));
  return transientSentinel !== REFUSED_SYMBOL && transientSentinel !== "directory";
}
//@ chunk-5xgkngpb.js:721213-721404 placement
async function isOnDifferentFilesystem(leftPath, rightPath) {
  if (getPlatform() !== "windows") return false;
  let sameFs = await isSameFilesystem(leftPath, rightPath).catch((error) => {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return null;
    if (errnoCode !== undefined && WRITE_ERROR_CODES.has(errnoCode)) return false;
    throw error;
  });
  return sameFs === null ? null : !sameFs;
}
//@ chunk-5xgkngpb.js:721404-721553 placement (2.1.88 match: convertDirectoryToZipInPlace, 1)
/**
 * 目录项检查后递归扫描或删除（名字配错）。
 */
async function convertDirectoryToZipInPlace(dirPath, zipPath) {
  let differentFs = await isOnDifferentFilesystem(dirPath, zipPath);
  if (differentFs === null) return true;
  if (differentFs) return scanDirectory_2(join(dirPath, zipPath));
  return (
    (await toTransientSentinel(
      rm(join(dirPath, zipPath), {
        recursive: true,
        force: true,
      }),
    )) !== REFUSED_SYMBOL
  );
}
//@ chunk-5xgkngpb.js:721553-721627 placement
async function hasUnexpectedEntry(dirPath) {
  return (await readdir(dirPath).catch(() => [])).some((name) => !isCacheSkipEntry(name));
}
//@ chunk-5xgkngpb.js:721627-721772 placement
async function hasOtherTempEntries(dirPath, excludePath) {
  let names = await readdir(dirPath).catch((error) => (getErrnoCode(error) === "ENOENT" ? [] : null));
  if (names === null) return true;
  return names.some(
    (name) =>
      isOwnTempName(normalizePathSegment(name), LINKS_MATERIALIZED_MARKER_2) &&
      join(dirPath, name) !== excludePath,
  );
}
//@ chunk-5xgkngpb.js:721772-722796 placement
/**
 * 扫描暂存目录里的 .origin 记录，校验原位置仍在根内、未被占用且暂存项是链接后把 .parked 条目移回； 出现无法判定的情况返回 false（不完整）。
 */
async function restoreParkedEntries(label, root, parkDir) {
  let complete = true;
  let screen = createLinkTargetScreen(root);
  let transientSentinel = await toTransientSentinel(
    readdir(parkDir).catch((error) => {
      if (getErrnoCode(error) === "ENOENT") return [];
      throw error;
    }),
  );
  if (transientSentinel === REFUSED_SYMBOL) return false;
  for (let name of transientSentinel) {
    if (!name.endsWith(ORIGIN_SUFFIX)) continue;
    let parkedPath = join(parkDir, name.slice(0, -ORIGIN_SUFFIX.length) + PARKED_SUFFIX);
    try {
      let originFilePath = join(parkDir, name);
      let targetRel = await writeFileAtomically(originFilePath, MAX_ORIGIN_BYTES, {
        throwTransient: true,
      });
      if (targetRel === null) continue;
      if (sameFileIdentityAs(targetRel)) continue;
      let targetPath = join(root, targetRel);
      let headSegment = relative(root, targetPath).split(sep)[0] ?? "";
      if (
        isAbsolute(targetRel) ||
        targetPath === root ||
        !isPathUnder(targetPath, root) ||
        isNodeModulesSegment(headSegment) ||
        isOwnTempName(normalizePathSegment(headSegment), LINKS_MATERIALIZED_MARKER_2) ||
        !(await lstat(parkedPath)).isSymbolicLink() ||
        (await resolveLinkChainForPath(root, relative(root, dirname(targetPath)), screen, {
          trustedRoot: root,
        })) !== "clean"
      )
        continue;
      let containment = await classifyRealpathContainment(dirname(targetPath), root);
      if (containment === "outside") continue;
      if (containment === "unknown") {
        complete = false;
        continue;
      }
      let presence = await lstat(targetPath).then(
        () => "present",
        (error) => (getErrnoCode(error) === "ENOENT" ? "vacant" : "unknown"),
      );
      if (presence === "present") continue;
      if (presence === "unknown") {
        complete = false;
        continue;
      }
      await retryFsOp(parkedPath, targetPath);
      logForDebugging(`materializeLinks: ${label}: restored ${targetRel} from an interrupted pass`);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT") continue;
      logForDebugging(
        `materializeLinks: ${label}: cannot restore a parked entry from ${parkDir}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      if (errnoCode !== "ENAMETOOLONG" && errnoCode !== "EINVAL" && !(error instanceof TypeError))
        complete = false;
    }
  }
  return complete;
}
//@ chunk-5xgkngpb.js:722796-723505 placement
/**
 * 撤销版本目录的屏检标记：先删除；失败则移到临时名；再失败用 O_NOFOLLOW 打开并确认单链接普通文件后改写为 withdrawn。
 */
async function withdrawScreenMarker(versionDirPath) {
  let markerPath = join(versionDirPath, LINKS_MATERIALIZED_MARKER_2);
  let attempts = [
    () =>
      rm(markerPath, {
        force: true,
      }),
    () => retryFsOp(markerPath, makeTempSiblingPath(markerPath)),
    async () => {
      let O_NOFOLLOW = constants.O_NOFOLLOW;
      if (getPlatform() === "windows" || O_NOFOLLOW === undefined)
        throw Error("in-place invalidation needs O_NOFOLLOW");
      let markerStats = await lstat(markerPath, {
        bigint: true,
      });
      if (!markerStats.isFile()) throw Error("marker name is not a regular file");
      let markerHandle = await open(
        markerPath,
        constants.O_WRONLY | O_NOFOLLOW | (constants.O_NONBLOCK ?? 0),
      );
      try {
        let stats = await markerHandle.stat({
          bigint: true,
        });
        if (
          !stats.isFile() ||
          stats.nlink !== 1n ||
          stats.ino !== markerStats.ino ||
          stats.dev !== markerStats.dev
        )
          throw Error("marker is not the single-named regular file seen");
        await markerHandle.truncate(0);
        await markerHandle.write(
          `withdrawn
`,
          0,
        );
      } finally {
        await markerHandle.close();
      }
    },
  ];
  for (let attempt of attempts)
    try {
      await attempt();
      return true;
    } catch (error) {
      logForDebugging(
        `materializeLinks: ${versionDirPath}: cannot withdraw ${LINKS_MATERIALIZED_MARKER_2}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    }
  return false;
}
//@ chunk-5xgkngpb.js:723505-724478 placement
/**
 * 以 wx 写入屏检标记（时间、CLI 版本、屏检版本与计数）；已存在且有效则视为成功，否则把目录转换后重写。
 */
async function writeScreenMarker(versionDirPath, realRoot, summary) {
  let markerPath = join(realRoot, LINKS_MATERIALIZED_MARKER_2);
  let markerData = {
    at: new Date().toISOString(),
    cli: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    screen: SCREEN_VERSION,
    materialized: summary.materialized,
    removed: summary.removed,
    failed: summary.failed,
  };
  let markerText =
    jsonStringify(markerData) +
    `
`;
  try {
    await writeFile(markerPath, markerText, {
      flag: "wx",
    });
    return true;
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") {
      logForDebugging(
        `materializeLinks: ${versionDirPath}: cannot write ${LINKS_MATERIALIZED_MARKER_2}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      return false;
    }
  }
  try {
    if (await hasValidScreenMarker(realRoot)) return true;
    await convertDirectoryToZipInPlace(realRoot, LINKS_MATERIALIZED_MARKER_2);
    await writeFile(markerPath, markerText, {
      flag: "wx",
    });
    return true;
  } catch (error) {
    logForDebugging(
      `materializeLinks: ${versionDirPath}: cannot write ${LINKS_MATERIALIZED_MARKER_2}: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return false;
  }
}
//@ chunk-5xgkngpb.js:724478-724498 placement
var weakMap_9; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:724478", () => {
  weakMap_9 = new WeakMap();
});
//@ chunk-5xgkngpb.js:724498-724775 placement
function materializeVersionLinksOnce(versionDirPath, cacheRoot, copyDir, storageV5, isVersionInUse) {
  if (!isStorageV5Enabled() || storageV5 === undefined || isDiskless()) return Promise.resolve();
  let state = weakMap_9.get(storageV5);
  if (state === undefined) {
    state = {
      attempts: new Map(),
      deferrals: new Map(),
    };
    weakMap_9.set(storageV5, state);
  }
  let attempts = state.attempts;
  let pending = attempts.get(versionDirPath);
  if (pending === undefined) {
    pending = materializeVersionLinks(
      versionDirPath,
      cacheRoot,
      copyDir,
      state.deferrals,
      isVersionInUse,
    ).then((succeeded) => {
      if (!succeeded) attempts.delete(versionDirPath);
    });
    attempts.set(versionDirPath, pending);
  }
  return pending;
}
//@ chunk-5xgkngpb.js:724775-725027 placement
async function hasValidScreenMarker(versionDirPath) {
  let markerPath = join(versionDirPath, LINKS_MATERIALIZED_MARKER_2);
  let markerStats = await lstat(markerPath).catch((error) => {
    if (getErrnoCode(error) === "ENOENT") return null;
    throw error;
  });
  if (markerStats === null || !markerStats.isFile() || markerStats.size > MAX_SCREEN_MARKER_BYTES)
    return false;
  let markerText = await writeFileAtomically(markerPath, MAX_SCREEN_MARKER_BYTES);
  if (markerText === null) return false;
  try {
    return ScreenMarkerSchema().safeParse(jsonParse(markerText)).success;
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:725027-725820 placement
async function removeLinkMarkers(versionDirPath) {
  let markerPath = join(versionDirPath, IN_USE_MARKER_FILE);
  try {
    let removeResult = await removePathEntry(markerPath);
    if (removeResult === "removed")
      logForDebugging(
        `materializeLinks: ${versionDirPath}: removed ${IN_USE_MARKER_FILE}: not a directory of markers`,
      );
    return removeResult;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === undefined || !WRITE_ERROR_CODES.has(errnoCode)) throw error;
    let markerStats;
    try {
      markerStats = await lstat(markerPath);
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return "absent";
      throw error;
    }
    if (markerStats.isDirectory()) {
      logForDebugging(
        `materializeLinks: ${versionDirPath}: cannot remove from ${IN_USE_MARKER_FILE} (${errnoCode}): a directory of markers this process cannot write in is not listed, probed or converted in this process`,
      );
      return "directory-unproven";
    }
    if (markerStats.isFile() || markerStats.isFIFO() || markerStats.isSocket()) {
      logForDebugging(
        `materializeLinks: ${versionDirPath}: cannot remove ${IN_USE_MARKER_FILE} (${errnoCode}): not a directory of markers, nothing reads through it; proceeding`,
      );
      return "junk";
    }
    logForDebugging(
      `materializeLinks: ${versionDirPath}: cannot remove ${IN_USE_MARKER_FILE} (${errnoCode}); leaving the tree as it is`,
      {
        level: "warn",
      },
    );
    return "unremovable";
  }
}
//@ chunk-5xgkngpb.js:725820-727790 placement
/**
 * 列出待实体化的链接，无法列出时留给探测判断。
 */
async function listPluginLinks(versionDirPath) {
  let markerPath = join(versionDirPath, IN_USE_MARKER_FILE);
  let markerDirIdentity = await rescreenMarkerDir(versionDirPath, markerPath);
  if (markerDirIdentity === null) return;
  let entries = await readdir(markerPath, {
    withFileTypes: true,
  }).catch((error) => {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return [];
    if (errnoCode === undefined || !WRITE_ERROR_CODES.has(errnoCode)) throw error;
    logForDebugging(
      `materializeLinks: ${versionDirPath}: cannot list ${IN_USE_MARKER_FILE} (${errnoCode}); left for the probe to judge`,
      {
        level: "warn",
      },
    );
    return [];
  });
  for (let dirent of entries) {
    let entryPath = join(markerPath, dirent.name);
    if (!(await getFileIdentity_3(markerPath, markerDirIdentity))) {
      logForDebugging(
        `materializeLinks: ${versionDirPath}: ${IN_USE_MARKER_FILE} was replaced while its children were screened; left for the probe to judge`,
        {
          level: "warn",
        },
      );
      return;
    }
    let isVersionDir = isVersionDirName(dirent.name);
    let entryKind = "nonRegular";
    let description = "not a regular file";
    if (dirent.isDirectory()) {
      if (!isVersionDir) {
        logUnrecognizedMarker(versionDirPath, dirent.name);
        continue;
      }
      entryKind = "directory";
      description = "wears a directory's type";
    } else if (!dirent.isSymbolicLink()) {
      let entryStats;
      try {
        entryStats = await lstat(entryPath);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") entryStats = null;
        else if (errnoCode !== undefined && WRITE_ERROR_CODES.has(errnoCode)) {
          logForDebugging(
            `materializeLinks: ${versionDirPath}: cannot examine ${IN_USE_MARKER_FILE}/${dirent.name} (${errnoCode}); left for the probe to judge`,
            {
              level: "warn",
            },
          );
          continue;
        } else throw error;
      }
      if (entryStats === null) continue;
      if (entryStats.isDirectory()) {
        if (!isVersionDir) {
          logUnrecognizedMarker(versionDirPath, dirent.name);
          continue;
        }
        entryKind = "directory";
        description = "wears a directory's type";
      } else if (entryStats.isFile()) {
        if (!isVersionDir) {
          logUnrecognizedMarker(versionDirPath, dirent.name);
          continue;
        }
        if (entryStats.size > MAX_MARKER_BYTES) {
          entryKind = "oversized";
          description = "larger than any marker";
        } else if (entryStats.size > 0 && !atomicMoveToInstallPath_2(dirent.name)) continue;
        else {
          if (isTimestampFreshish(entryStats.mtimeMs)) continue;
          entryKind = "staleLeftover";
          description = atomicMoveToInstallPath_2(dirent.name)
            ? "in-flight marker outside the live window"
            : "empty file outside the live window";
        }
      }
    }
    if (!(await getFileIdentity_3(markerPath, markerDirIdentity))) {
      logForDebugging(
        `materializeLinks: ${versionDirPath}: ${IN_USE_MARKER_FILE} was replaced while its children were screened; left for the probe to judge`,
        {
          level: "warn",
        },
      );
      return;
    }
    if (!(await shouldRemoveMarkerEntry(entryPath, dirent.name, entryKind))) continue;
    let removeResult;
    try {
      removeResult =
        entryKind === "directory" ? await rmdirIfEmpty(entryPath) : await removePathEntry(entryPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOTDIR") return;
      if (errnoCode === undefined || !WRITE_ERROR_CODES.has(errnoCode)) throw error;
      logForDebugging(
        `materializeLinks: ${versionDirPath}: cannot remove ${IN_USE_MARKER_FILE}/${dirent.name} (${errnoCode}); left for the probe to judge`,
        {
          level: "warn",
        },
      );
      continue;
    }
    if (removeResult === "removed")
      logForDebugging(
        `materializeLinks: ${versionDirPath}: removed ${IN_USE_MARKER_FILE}/${dirent.name}: ${description}`,
      );
    else if (removeResult === "directory")
      logForDebugging(
        `materializeLinks: ${versionDirPath}: left ${IN_USE_MARKER_FILE}/${dirent.name}: a directory, not a session's marker`,
      );
  }
}
//@ chunk-5xgkngpb.js:727790-727851 placement
function isVersionDirName(name) {
  return /^[0-9]+(\.tmp\.[0-9a-f]+)?$/i.test(name);
}
//@ chunk-5xgkngpb.js:727851-728018 placement
async function rmdirIfEmpty(dirPath) {
  try {
    await rmdir(dirPath);
    return "removed";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return "absent";
    if (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") return "directory";
    throw error;
  }
}
//@ chunk-5xgkngpb.js:728018-728347 placement
/**
 * 按类别判断标记目录项是否应删除。
 */
async function shouldRemoveMarkerEntry(entryPath, name, entryKind) {
  let entryStats = await lstat(entryPath).catch(() => null);
  if (entryStats === null || isUsableVersionMarker(entryStats, name)) return false;
  switch (entryKind) {
    case "nonRegular":
      return !entryStats.isFile() && !entryStats.isDirectory();
    case "directory":
      return entryStats.isDirectory();
    case "oversized":
      return entryStats.isFile() && entryStats.size > MAX_MARKER_BYTES;
    case "staleLeftover":
      return (
        entryStats.isFile() &&
        entryStats.size <= MAX_MARKER_BYTES &&
        (entryStats.size === 0 || atomicMoveToInstallPath_2(name)) &&
        !isTimestampFreshish(entryStats.mtimeMs)
      );
  }
}
//@ chunk-5xgkngpb.js:728347-728443 placement
function isUsableVersionMarker(stat, name) {
  return (
    /^[0-9]+$/.test(name) &&
    stat.isFile() &&
    stat.size <= MAX_MARKER_BYTES &&
    (stat.size > 0 || isTimestampFreshish(stat.mtimeMs))
  );
}
//@ chunk-5xgkngpb.js:728443-728562 placement
function logUnrecognizedMarker(pluginPath, name) {
  logForDebugging(
    `materializeLinks: ${pluginPath}: left ${IN_USE_MARKER_FILE}/${name}: not named like a session's marker; the probe judges it`,
  );
}
//@ chunk-5xgkngpb.js:728562-729072 placement
/**
 * 列出前重新确认 in_use 目录仍是真实目录。
 */
async function rescreenMarkerDir(versionDir, markerDir) {
  try {
    let stat = await lstat(markerDir, {
      bigint: true,
    });
    if (
      !stat.isSymbolicLink() &&
      stat.isDirectory() &&
      (await isSameFilesystem(versionDir, IN_USE_MARKER_FILE))
    )
      return stat;
    let removal = await removePathEntry(markerDir);
    logForDebugging(
      `materializeLinks: ${versionDir}: ${IN_USE_MARKER_FILE} re-screened before listing: no longer a real directory (${removal === "directory" ? "left, a non-empty directory" : removal})`,
    );
    return null;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
    if (errnoCode === undefined || !WRITE_ERROR_CODES.has(errnoCode)) throw error;
    logForDebugging(
      `materializeLinks: ${versionDir}: cannot re-examine ${IN_USE_MARKER_FILE} (${errnoCode}); left for the probe to judge`,
      {
        level: "warn",
      },
    );
    return null;
  }
}
//@ chunk-5xgkngpb.js:729072-729226 placement (2.1.88 match: getFileIdentity, 0.864)
async function getFileIdentity_3(filePath, stat) {
  let current = await lstat(filePath, {
    bigint: true,
  }).catch(() => null);
  return (
    current !== null &&
    !current.isSymbolicLink() &&
    current.isDirectory() &&
    current.dev === stat.dev &&
    current.ino === stat.ino
  );
}
//@ chunk-5xgkngpb.js:729226-731107 placement
/**
 * 把插件版本目录中的链接实体化，跳过符号链接的版本目录。
 */
async function materializeVersionLinks(versionPath, cacheRoot, copyDir, deferrals, livenessProbe) {
  let relPath = relative(cacheRoot, versionPath);
  let parts = relPath.split(sep);
  if (
    !relPath ||
    isAbsolute(relPath) ||
    parts.length !== 3 ||
    parts.some((part) => part === "" || part === "." || part === "..")
  )
    return true;
  try {
    if (versionPath.endsWith(".zip")) {
      let stat = await lstat(versionPath).catch((error) => {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
        throw error;
      });
      if (stat === null || !stat.isDirectory()) return true;
    }
    let stat = await lstat(versionPath);
    if (
      stat.isSymbolicLink() ||
      (getPlatform() === "windows" && !(await isSameFilesystem(dirname(versionPath), basename(versionPath))))
    ) {
      logForDebugging(
        `materializeLinks: skipping ${versionPath}: version dir is a symlink (or can be read as a link)`,
      );
      return true;
    }
    if (!stat.isDirectory()) return true;
    let [realVersion, realRoot] = await Promise.all([realpath(versionPath), realpath(cacheRoot)]);
    if (realVersion === realRoot || !isPathUnder(realVersion, realRoot)) {
      logForDebugging(`materializeLinks: skipping ${versionPath}: resolves outside the plugin cache`);
      return true;
    }
    let markers = await removeLinkMarkers(realVersion);
    if (
      markers === "unremovable" ||
      markers === "directory-unproven" ||
      (await hasValidScreenMarker(versionPath))
    )
      return true;
    if (markers === "directory") await listPluginLinks(realVersion);
    if (livenessProbe !== undefined && (await livenessProbe())) {
      let stat = await lstat(versionPath, {
        bigint: true,
      });
      let deferral = deferrals.get(realVersion);
      if (
        deferral !== undefined &&
        (deferral.ino !== stat.ino ||
          (deferral.birthtimeNs !== 0n &&
            stat.birthtimeNs !== 0n &&
            deferral.birthtimeNs !== stat.birthtimeNs))
      )
        deferral = undefined;
      let now = Date.now();
      if (deferral === undefined)
        deferrals.set(realVersion, {
          since: now,
          announced: false,
          versionPath,
          ino: stat.ino,
          birthtimeNs: stat.birthtimeNs,
        });
      if (deferral === undefined || now - deferral.since < MATERIALIZE_MAX_AGE_MS) {
        logForDebugging(
          `materializeLinks: deferring ${realVersion}: in use (possibly by this session), or liveness could not be determined`,
        );
        return false;
      }
      if (!deferral.announced) {
        deferral.announced = true;
        logForDebugging(
          `materializeLinks: ${realVersion}: deferred since ${new Date(deferral.since).toISOString()} to in-use markers that still read live, or a liveness probe that kept failing; converting now`,
          {
            level: "warn",
          },
        );
      }
    } else deferrals.delete(realVersion);
    if ((await realpath(versionPath)) !== realVersion) {
      logForDebugging(
        `materializeLinks: ${versionPath}: moved while its liveness was probed; judged on a later load`,
      );
      return false;
    }
    let result = await materializePluginLinks(versionPath, copyDir, {
      mode: "migrate",
    });
    deferrals.delete(realVersion);
    return result.vouched || result.readOnly || result.settledUnvouched === true;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") {
      for (let [key, entry] of deferrals) if (entry.versionPath === versionPath) deferrals.delete(key);
      return false;
    }
    logForDebugging(`materializeLinks: ${versionPath}: ${errorMessage(error)}`, {
      level: "warn",
    });
    return errnoCode === undefined || !TRANSIENT_FS_ERRORS.has(errnoCode);
  }
}
//@ chunk-5xgkngpb.js:731107-731168 placement
var TEMP_SUFFIX_MARK = ".tmp~";
var TEMP_SUFFIX_HEX_RE = /^[0-9a-f]{8}$/;
var TEMP_SUFFIX_RE = /\.tmp~[0-9a-f]{8}$/;
//@ chunk-5xgkngpb.js:731168-731227 placement (2.1.88 match: generatePlaceholders, 1)
function makeTempSiblingName(baseName) {
  return `${baseName}${TEMP_SUFFIX_MARK}${randomBytes(4).toString("hex")}`;
}
//@ chunk-5xgkngpb.js:731227-731354 placement
function classifyTempSibling(name, baseName) {
  if (
    name.startsWith(baseName + TEMP_SUFFIX_MARK) &&
    TEMP_SUFFIX_HEX_RE.test(name.slice(baseName.length + TEMP_SUFFIX_MARK.length))
  )
    return "current";
  return isOwnTempName(name, baseName) ? "scratch" : null;
}
//@ chunk-5xgkngpb.js:731354-731568 placement
async function moveIntoVersionPath(stagingPath, cachePath) {
  await rm(join(stagingPath, ORPHAN_MARKER_FILE), {
    force: true,
  });
  if (
    !(await lstat(cachePath).then(
      () => false,
      (error) => {
        if (isPathAbsent(error)) return true;
        throw error;
      },
    ))
  )
    throw Object.assign(Error("plugin cache version path is occupied"), {
      code: "EEXIST",
    });
  await retryFsOp(stagingPath, cachePath);
}
//@ chunk-5xgkngpb.js:731568-731675 placement
async function dirHasAnyEntry(dir, names) {
  try {
    let entries = new Set(await readdir(dir));
    return names.some((name) => entries.has(name));
  } catch (error) {
    return !isPathAbsent(error);
  }
}
//@ chunk-5xgkngpb.js:731675-731712 placement
var VERSION_TMP_NAME_RE = /^[0-9]+\.tmp\.[0-9a-f]{8}$/;
//@ chunk-5xgkngpb.js:731712-731942 placement
async function removeStaleMarkerFiles(dir) {
  let names = await readdir(dir).catch(() => []);
  let cutoff = Date.now() - LOCK_STALE_MS;
  for (let name of names) {
    if (!VERSION_TMP_NAME_RE.test(name) && !isHashTempFile(name)) continue;
    let path = join(dir, name);
    let stat = await lstat(path).catch(() => null);
    if (stat !== null && stat.isFile() && stat.mtimeMs < cutoff) await unlink(path).catch(() => {});
  }
}
//@ chunk-5xgkngpb.js:731942-731982 placement
/**
 * isCacheEntryName：缓存条目名（含临时名变体）。
 */
function isCacheEntryName(name) {
  return isCacheSkipEntry(name) || isHashTempFile(normalizePathSegment(name));
}
//@ chunk-5xgkngpb.js:731982-732138 placement
async function hasRealEntries(cachePath, { whenUnreadable = true } = {}) {
  try {
    return (await readdir(cachePath)).some((name) => !isCacheEntryName(name));
  } catch (error) {
    if (isPathAbsent(error)) return false;
    if (whenUnreadable) return true;
    if (isFsInaccessible(error)) return false;
    throw error;
  }
}
//@ chunk-5xgkngpb.js:732138-732279 placement
async function isLinkLike(path, stat) {
  if (stat.isSymbolicLink()) return true;
  if (!stat.isDirectory()) return false;
  try {
    return !(await isSameFilesystem(dirname(path), basename(path)));
  } catch (error) {
    return !isPathAbsent(error);
  }
}
//@ chunk-5xgkngpb.js:732279-732370 placement
/**
 * versionPathOccupantError：版本目录占位无法检查的错误。
 */
function versionPathOccupantError(message) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    message,
    "plugin cache version path occupant could not be examined",
  );
}
//@ chunk-5xgkngpb.js:732370-732499 placement
async function classifyCacheEntry(path) {
  try {
    let stat = await lstat(path);
    return (await isLinkLike(path, stat)) ? "symlink" : "other";
  } catch (error) {
    return isPathAbsent(error) ? "absent" : "unexaminable";
  }
}
//@ chunk-5xgkngpb.js:732499-732533 placement
/**
 * isTempSiblingName：是否有临时兄弟后缀。
 */
function isTempSiblingName(name) {
  return TEMP_SUFFIX_RE.test(name);
}
//@ chunk-5xgkngpb.js:732533-732574 placement
/**
 * stripTempSiblingSuffix：去掉临时兄弟后缀。
 */
function stripTempSiblingSuffix(name) {
  return name.replace(TEMP_SUFFIX_RE, "");
}
//@ chunk-5xgkngpb.js:732574-732591 placement
var TEMP_SIBLING_TTL_MS = 86400000;
//@ chunk-5xgkngpb.js:732591-732996 placement
/**
 * 清理版本目录旁过期的临时兄弟项。
 */
async function sweepStaleTempSiblings(cachePath) {
  let dir = dirname(cachePath);
  let baseName = basename(cachePath);
  let names = await readdir(dir).catch(() => []);
  let cutoff = Date.now() - TEMP_SIBLING_TTL_MS;
  await Promise.all(
    names.map(async (name) => {
      let kind = classifyTempSibling(name, baseName);
      if (kind === null) return;
      let path = join(dir, name);
      let stat = await lstat(path).catch(() => null);
      if (stat === null || stat.mtimeMs >= cutoff) return;
      if (await isLinkLike(path, stat)) {
        await unlink(path).catch(() => rmdir(path).catch(() => {}));
        return;
      }
      if (kind === "scratch") {
        if (!stat.isDirectory()) await unlink(path).catch(() => {});
        return;
      }
      await removeDirectoryTreeNoFollow_2(path).catch(() => {});
    }),
  );
}
//@ chunk-5xgkngpb.js:732996-733011 placement
var VERSION_DIR_DELETE_GRACE_MS = 600000;
//@ chunk-5xgkngpb.js:733011-734324 placement
/**
 * 尝试删除版本目录：是链接、含非可清理项或有新鲜标记时返回 held；清理 in_use 标记目录、node_modules 与临时项后 rmdir， 成功返回 removed。
 */
async function removeVersionDirIfIdle(versionDir) {
  let stat;
  try {
    stat = await lstat(versionDir);
  } catch (error) {
    if (!isPathAbsent(error)) return "held";
    stat = null;
  }
  if (stat !== null && (await isLinkLike(versionDir, stat))) return "held";
  let names;
  try {
    names = await readdir(versionDir);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return "removed";
    if (errnoCode !== "ENOTDIR") throw error;
    let stat;
    try {
      stat = await lstat(versionDir);
    } catch (error) {
      if (!isPathAbsent(error)) return "held";
      stat = null;
    }
    if (stat === null) return "removed";
    if (stat.isDirectory() || stat.isSymbolicLink() || versionDir.endsWith(".zip")) return "held";
    await unlink(versionDir);
    return "removed";
  }
  for (let name of names) {
    if (!isCacheEntryName(name)) return "held";
    if (isNodeModulesSegment(name)) {
      let stat = await lstat(join(versionDir, name)).catch(() => null);
      if (stat === null || isFreshTimestamp_2(stat.mtimeMs, VERSION_DIR_DELETE_GRACE_MS)) return "held";
    }
  }
  for (let name of names) {
    let path = join(versionDir, name);
    let normalized = normalizePathSegment(name);
    try {
      if (normalized === IN_USE_MARKER_FILE) {
        let stat = await lstat(path).catch(() => null);
        if (stat !== null && !stat.isDirectory()) {
          if ((await removePathEntry(path)) === "directory") return "held";
        } else {
          if (stat !== null && !(await isLinkLike(path, stat))) await removeStaleMarkerFiles(path);
          await rmdir(path);
        }
      } else if (
        normalized === "node_modules" ||
        isOwnTempName(normalized, LINKS_MATERIALIZED_MARKER_2) ||
        isOwnTempName(normalized, "node_modules")
      ) {
        let stat = await lstat(path).catch((error) => {
          if (isPathAbsent(error)) return null;
          throw error;
        });
        if (stat !== null && (await isLinkLike(path, stat))) {
          if ((await removePathEntry(path)) === "directory") return "held";
        } else if (normalized === "node_modules") {
          let tempSiblingPath = makeTempSiblingPath(path);
          await retryFsOp(path, tempSiblingPath);
          await removeDirectoryTreeNoFollow_2(tempSiblingPath);
        } else await removeDirectoryTreeNoFollow_2(path);
      } else if ((await removePathEntry(path)) === "directory") return "held";
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") return "held";
      if (!isPathAbsent(error)) throw error;
    }
  }
  try {
    await rmdir(versionDir);
    return "removed";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") return "held";
    if (isPathAbsent(error)) return "removed";
    throw error;
  }
}
//@ chunk-5xgkngpb.js:734324-734652 placement
/**
 * 目录及其内容都超过期限时删除遗留目录。
 */
async function removeStaleLeftover(cachePath) {
  let cutoff = Date.now() - TEMP_SIBLING_TTL_MS;
  try {
    if ((await lstat(cachePath)).mtimeMs >= cutoff) return false;
    let names = await readdir(cachePath);
    if (
      (await Promise.all(names.map((name) => lstat(join(cachePath, name)).catch(() => null)))).some(
        (stat) => stat === null || stat.mtimeMs >= cutoff,
      )
    )
      return false;
  } catch {
    return false;
  }
  return removeVersionDirIfIdle(cachePath).then(
    (outcome) => outcome === "removed",
    (error) => {
      logForDebugging(`Plugin cache: cannot remove leftover ${cachePath}: ${errorMessage(error)}`);
      return false;
    },
  );
}
//@ chunk-5xgkngpb.js:734652-734700 placement
/**
 * removeDirectoryTreeNoFollow：不跟随符号链接删除目录树。
 */
async function removeDirectoryTreeNoFollow(path) {
  await removeDirectoryTreeNoFollow_2(path).catch(() => {});
}
//@ chunk-5xgkngpb.js:734700-734869 placement
/**
 * 检查路径从自身父目录到 base 之间是否有符号链接或无法检查的祖先目录；有则不信任存储层（storageV5）对该路径的操作。
 */
async function hasLinkedAncestorBelow(targetPath, rootPath) {
  let rootParent = dirname(rootPath);
  for (let current = dirname(targetPath); ; current = dirname(current)) {
    let kind = await classifyCacheEntry(current);
    if (kind === "symlink" || kind === "unexaminable") return true;
    if (current === rootParent || !current.startsWith(rootParent + sep)) return false;
  }
}
export {
  versionPathOccupantError,
  classifyCacheEntry,
  hasRealEntries,
  resolveLinkChainFromParent,
  createLinkTargetScreen,
  isPathUnder,
  withdrawScreenMarker,
  materializePluginLinks,
  materializeVersionLinksOnce,
  isCacheSkipEntry,
  isCacheEntryName,
  isTempSiblingName,
  freshSymlinkCopyBudget,
  consumeSymlinkCopyBudget,
  pathHasNodeModulesSegment,
  sweepStaleTempSiblings,
  makeTempSiblingName,
  hasLinkedAncestorBelow,
  moveIntoVersionPath,
  removeVersionDirIfIdle,
  removeDirectoryTreeNoFollow,
  removeStaleLeftover,
  dirHasAnyEntry,
  stripTempSiblingSuffix,
};
