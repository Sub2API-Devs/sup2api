/**
 * utils/settings/settingsStorage.ts
 *
 * 无盘会话设置写入（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5fn9rb8r.js (12)
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
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5fn9rb8r.js:2843-3018 placement
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
//@ chunk-5fn9rb8r.js:3050-3096 placement
/**
 * noUncachedRoot：无缓存根（占位）。
 */
function noUncachedRoot(root, { uncached = false } = {}) {
  return null;
}
//@ chunk-5fn9rb8r.js:3096-3130 placement
var homeDirRootCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5fn9rb8r.js:3096", () => {
  homeDirRootCache = identity_2(new Map(), (cache) => cache.clear());
});
//@ chunk-5fn9rb8r.js:3130-3312 placement
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
//@ chunk-5fn9rb8r.js:3312-3346 placement
var storageRootCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5fn9rb8r.js:3312", () => {
  storageRootCache = identity_2(new Map(), (cache) => cache.clear());
});
//@ chunk-5fn9rb8r.js:3346-3389 placement
function neverRoot(root, { uncached = false } = {}) {
  return false;
}
//@ chunk-5fn9rb8r.js:3389-3593 placement
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
//@ chunk-5fn9rb8r.js:3593-3781 placement
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
//@ chunk-5fn9rb8r.js:3781-3822 placement
/**
 * storageRootFor：解析路径对应的存储根。
 */
function storageRootFor(startPath) {
  return resolveStorageRoot(startPath, () => findCanonicalGitRoot(startPath), false);
}
//@ chunk-5fn9rb8r.js:3822-3863 placement
/**
 * uncachedStorageRootFor：不缓存的存储根解析。
 */
function uncachedStorageRootFor(startPath) {
  return resolveStorageRoot(startPath, () => findCanonicalGitRootUncached(startPath), true);
}
//@ chunk-5fn9rb8r.js:3863-3939 placement
/**
 * nearestNonHomeRoot：最近的非主目录根。
 */
function nearestNonHomeRoot(startPath) {
  let nearestRoot = findNearestRoot(startPath);
  return nearestRoot !== null && isHomeDirRoot(nearestRoot.root) !== true
    ? nearestRoot.root
    : findGitRoot(startPath);
}
//@ chunk-5fn9rb8r.js:3939-4001 placement
/**
 * storageRootsFor：路径的所有存储根。
 */
function storageRootsFor(startPath) {
  return normalizeCaseForComparison_2(
    [storageRootFor(startPath), findCanonicalGitRoot(startPath)].filter((root) => root !== null),
  );
}
export {
  warnDisklessSettingsWrite,
  uncachedStorageRootFor,
  nearestNonHomeRoot,
  storageRootFor,
  noUncachedRoot,
  storageRootsFor,
  findNearestRoot,
  isHomeDirRoot,
};
