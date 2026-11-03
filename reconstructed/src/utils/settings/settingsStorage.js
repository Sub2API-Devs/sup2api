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

//@ chunk-q8cqcff6.js:2705-2880 placement
function warnDisklessSettingsWrite(e, n) {
  logForDebugging(
    `Diskless session: skipped the ${e} write to ${n} because no storage backend could take it`,
    {
      level: "warn",
    },
  );
  logEvent("tengu_diskless_write_skipped", {
    writer: fromEnum(e),
  });
}
//@ chunk-q8cqcff6.js:2912-2958 placement
/**
 * noUncachedRoot：无缓存根（占位）。
 */
function noUncachedRoot(e, { uncached: n = false } = {}) {
  return null;
}
//@ chunk-q8cqcff6.js:2958-2992 placement
var homeDirRootCache = identity_2(new Map(), (e) => e.clear());
//@ chunk-q8cqcff6.js:2992-3174 placement
/**
 * 判断目录（解析真实路径后）是否就是用户主目录，结果缓存。
 */
function isHomeDirRoot(root, { uncached: n = false } = {}) {
  let r = n ? undefined : homeDirRootCache.get(root);
  if (r !== undefined) return r;
  let s = nativeRealpathLong(root);
  if (s === null) return;
  let S;
  try {
    S = normalizedRealHomeDir();
  } catch {
    return;
  }
  let E = identity(s) === S;
  homeDirRootCache.set(root, E);
  return E;
}
//@ chunk-q8cqcff6.js:3174-3208 placement
var storageRootCache = identity_2(new Map(), (e) => e.clear());
//@ chunk-q8cqcff6.js:3208-3251 placement
function neverRoot(e, { uncached: n = false } = {}) {
  return false;
}
//@ chunk-q8cqcff6.js:3251-3455 placement
/**
 * 从给定路径向上查找最近的可识别存储根目录，返回根目录与是否可读。
 */
function findNearestRoot(e, { uncached: n = false } = {}) {
  let r = e;
  for (;;) {
    let s = noUncachedRoot(r, {
      uncached: n,
    });
    if (s === null) return null;
    let S = neverRoot(s, {
      uncached: n,
    });
    if (S !== false)
      return {
        root: s,
        readable: S === true,
      };
    let E = dirname(s);
    if (E === s) return null;
    r = E;
  }
}
//@ chunk-q8cqcff6.js:3455-3643 placement
function resolveStorageRoot(e, n, uncached) {
  let nearestRoot = findNearestRoot(e, {
    uncached,
  });
  if (nearestRoot === null) return n();
  if (!nearestRoot.readable) return null;
  switch (
    isHomeDirRoot(nearestRoot.root, {
      uncached,
    })
  ) {
    case false:
      return nearestRoot.root;
    case true:
      return n();
    default:
      return null;
  }
}
//@ chunk-q8cqcff6.js:3643-3684 placement
/**
 * storageRootFor：解析路径对应的存储根。
 */
function storageRootFor(e) {
  return resolveStorageRoot(e, () => findCanonicalGitRoot(e), false);
}
//@ chunk-q8cqcff6.js:3684-3725 placement
/**
 * uncachedStorageRootFor：不缓存的存储根解析。
 */
function uncachedStorageRootFor(e) {
  return resolveStorageRoot(e, () => findCanonicalGitRootUncached(e), true);
}
//@ chunk-q8cqcff6.js:3725-3801 placement
/**
 * nearestNonHomeRoot：最近的非主目录根。
 */
function nearestNonHomeRoot(e) {
  let nearestRoot = findNearestRoot(e);
  return nearestRoot !== null && isHomeDirRoot(nearestRoot.root) !== true ? nearestRoot.root : findGitRoot(e);
}
//@ chunk-q8cqcff6.js:3801-3863 placement
/**
 * storageRootsFor：路径的所有存储根。
 */
function storageRootsFor(e) {
  return uniq([storageRootFor(e), findCanonicalGitRoot(e)].filter((n) => n !== null));
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
