/**
 * utils/settings/settingsStorage.ts
 *
 * 无盘会话设置写入（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (12)
 * attribution: placement 12
 */
import { dirname } from "path";
import { logForDebugging } from "../debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { identity as identity_2 } from "../identity.js";
import { nativeRealpathLong } from "../windowsUncPaths.js";
import { normalizedRealHomeDir } from "./settingsFileParsing.js";
import { identity } from "../pathClassification.js";
import { findCanonicalGitRoot, findCanonicalGitRootUncached, findGitRoot } from "../git.js";
import { uniq } from "../collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-q8cqcff6.js:2705-2880 placement
function warnDisklessSettingsWrite(writer, path) {
  logForDebugging(
    `Diskless session: skipped the ${writer} write to ${path} because no storage backend could take it`,
    {
      level: "warn",
    },
  );
  logEvent("tengu_diskless_write_skipped", {
    writer: fromEnum(writer),
  });
}
//@ chunk-q8cqcff6.js:2912-2958 placement
/**
 * noUncachedRoot：无缓存根（占位）。
 */
function noUncachedRoot(root, { uncached = false } = {}) {
  return null;
}
//@ chunk-q8cqcff6.js:2958-2992 placement
var homeDirRootCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-q8cqcff6.js:2958", () => {
  homeDirRootCache = identity_2(new Map(), (cache) => cache.clear());
});
//@ chunk-q8cqcff6.js:2992-3174 placement
/**
 * 判断目录（解析真实路径后）是否就是用户主目录，结果缓存。
 */
function isHomeDirRoot(root, { uncached = false } = {}) {
  let cached = uncached ? undefined : homeDirRootCache.get(root);
  if (cached !== undefined) return cached;
  let realRoot = nativeRealpathLong(root);
  if (realRoot === null) return;
  let homeDir;
  try {
    homeDir = normalizedRealHomeDir();
  } catch {
    return;
  }
  let isHome = identity(realRoot) === homeDir;
  homeDirRootCache.set(root, isHome);
  return isHome;
}
//@ chunk-q8cqcff6.js:3174-3208 placement
var storageRootCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-q8cqcff6.js:3174", () => {
  storageRootCache = identity_2(new Map(), (cache) => cache.clear());
});
//@ chunk-q8cqcff6.js:3208-3251 placement
function neverRoot(root, { uncached = false } = {}) {
  return false;
}
//@ chunk-q8cqcff6.js:3251-3455 placement
/**
 * 从给定路径向上查找最近的可识别存储根目录，返回根目录与是否可读。
 */
function findNearestRoot(startPath, { uncached = false } = {}) {
  let current = startPath;
  for (;;) {
    let nextRoot = noUncachedRoot(current, {
      uncached,
    });
    if (nextRoot === null) return null;
    let readable = neverRoot(nextRoot, {
      uncached,
    });
    if (readable !== false)
      return {
        root: nextRoot,
        readable: readable === true,
      };
    let parent = dirname(nextRoot);
    if (parent === nextRoot) return null;
    current = parent;
  }
}
//@ chunk-q8cqcff6.js:3455-3643 placement
function resolveStorageRoot(startPath, fallbackRoot, uncached) {
  let nearestRoot = findNearestRoot(startPath, {
    uncached,
  });
  if (nearestRoot === null) return fallbackRoot();
  if (!nearestRoot.readable) return null;
  switch (
    isHomeDirRoot(nearestRoot.root, {
      uncached,
    })
  ) {
    case false:
      return nearestRoot.root;
    case true:
      return fallbackRoot();
    default:
      return null;
  }
}
//@ chunk-q8cqcff6.js:3643-3684 placement
/**
 * storageRootFor：解析路径对应的存储根。
 */
function storageRootFor(startPath) {
  return resolveStorageRoot(startPath, () => findCanonicalGitRoot(startPath), false);
}
//@ chunk-q8cqcff6.js:3684-3725 placement
/**
 * uncachedStorageRootFor：不缓存的存储根解析。
 */
function uncachedStorageRootFor(startPath) {
  return resolveStorageRoot(startPath, () => findCanonicalGitRootUncached(startPath), true);
}
//@ chunk-q8cqcff6.js:3725-3801 placement
/**
 * nearestNonHomeRoot：最近的非主目录根。
 */
function nearestNonHomeRoot(startPath) {
  let nearestRoot = findNearestRoot(startPath);
  return nearestRoot !== null && isHomeDirRoot(nearestRoot.root) !== true
    ? nearestRoot.root
    : findGitRoot(startPath);
}
//@ chunk-q8cqcff6.js:3801-3863 placement
/**
 * storageRootsFor：路径的所有存储根。
 */
function storageRootsFor(startPath) {
  return uniq([storageRootFor(startPath), findCanonicalGitRoot(startPath)].filter((root) => root !== null));
}
export {
  uncachedStorageRootFor,
  storageRootFor,
  noUncachedRoot,
  findNearestRoot,
  isHomeDirRoot,
  warnDisklessSettingsWrite,
  nearestNonHomeRoot,
  storageRootsFor,
};
