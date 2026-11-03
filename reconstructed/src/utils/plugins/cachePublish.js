/**
 * utils/plugins/cachePublish.ts
 *
 * 2.1.316 新增：插件缓存发布
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 15
 */
import { basename, join, dirname, sep } from "path";
import { lstat, rm as rm_2, lutimes } from "fs/promises";
import { randomBytes } from "crypto";
import { versionCacheStorageSpace } from "./pluginDirectories.js";
import {
  anchoredPluginCachePath,
  requireVersionParentContained,
  versionParentState,
  clearOccupantForReplace,
  versionParentContained,
} from "./pluginLoader.js";
import { STORAGE_SPACES, isAsideFileName } from "../storage/storageSpaces.js";
import { ORPHAN_MARKER_FILE } from "./cacheUtils.js";
import { logForDebugging } from "../debug.js";
import { formatStorageError, ASIDESTRANDED } from "../storage/storageErrors.js";
import { removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2 } from "../fsRemove.js";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  isPathAbsent,
} from "../errors.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import {
  hasLinkedAncestorBelow,
  makeTempSiblingName,
  versionPathOccupantError,
} from "./pluginCacheMaterialize.js";
import { retryFsOp } from "../atomicPublishWrite.js";
import { getFsImplementation } from "../fsOperations.js";
import { swapVersionDir } from "./versionDirSwap.js";
import { isPluginZipCacheEnabled } from "./zipCache.js";

//@ chunk-e6aww6q8.js:4483311-4483405 placement
/**
 * orphanMarkerMove：孤儿标记的移动计划。
 */
function orphanMarkerMove(stagingScope, versionedCachePath) {
  if (stagingScope === undefined) return;
  let r = versionCacheStorageSpace(versionedCachePath, anchoredPluginCachePath());
  return r === null
    ? undefined
    : {
        from: stagingScope,
        to: r,
      };
}
//@ chunk-e6aww6q8.js:4483405-4483610 placement
/**
 * 通过 v5 存储后端删除暂存插件版本目录里残留的孤儿标记（R1），失败只记 warn。
 */
async function dropStagedOrphanMarkerV5(e, from) {
  let r = await e.delete(
    STORAGE_SPACES.pluginCache(from.marketplace, from.plugin, from.version, [ORPHAN_MARKER_FILE]),
  );
  if (!r.ok)
    logForDebugging(
      `Could not drop a stray orphan marker from the staged plugin: ${formatStorageError(r.error)}`,
      {
        level: "warn",
      },
    );
}
//@ chunk-e6aww6q8.js:4483610-4484001 placement
/**
 * 识别“移到一边后搁浅”（ASIDESTRANDED）的发布失败：cause 带 path 且 entry 为 occupant 时返回 {aside, remove}， remove 表示没有 folderError、可以删除该 aside 目录；其他情况返回 undefined。
 */
function getAsideStrandedCleanup(error) {
  if (
    error.code !== "Failed" ||
    !("telemetryCode" in error) ||
    error.telemetryCode !== ASIDESTRANDED ||
    !(error.cause instanceof Error) ||
    ("moveError" in error.cause && error.cause.moveError !== undefined)
  )
    return;
  let cause = error.cause;
  let path = "path" in cause ? cause.path : undefined;
  let entry = "entry" in cause ? cause.entry : undefined;
  if (typeof path !== "string") return;
  if (entry === undefined) return;
  if (entry !== "occupant") return;
  let h = "folderError" in cause && cause.folderError !== undefined;
  return {
    aside: path,
    remove: !h,
  };
}
//@ chunk-e6aww6q8.js:4484001-4484736 placement
async function removeReplacedVersionAside(aside, n) {
  let r = basename(aside);
  if (aside !== join(dirname(n), r) || !isAsideFileName(r)) {
    logForDebugging(
      `A publish that stood named a set-aside at ${aside}; it is not an aside name beside the published version, so it is left in place`,
      {
        level: "debug",
      },
    );
    return;
  }
  try {
    let [s, h] = await Promise.all([
      lstat(aside, {
        bigint: true,
      }),
      lstat(n, {
        bigint: true,
      }),
    ]);
    if (!(
      s.isDirectory() &&
      h.isDirectory() &&
      s.ino !== 0n &&
      h.ino !== 0n &&
      (s.dev !== h.dev || s.ino !== h.ino)
    )) {
      logForDebugging(
        `A publish that stood left the replaced plugin version set aside at ${aside}; it could not be proven distinct from the published version, so it is left in place`,
        {
          level: "debug",
        },
      );
      return;
    }
    await removeDirectoryTreeNoFollow_2(aside);
  } catch (error) {
    logForDebugging(
      `Could not remove a replaced plugin version set aside by a publish that stood: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "debug",
      },
    );
  }
}
//@ chunk-e6aww6q8.js:4484736-4484925 placement
function isUnsupportedSwapError(error) {
  return (
    error.code === "InvalidArgument" ||
    (error.code === "Failed" &&
      "telemetryCode" in error &&
      (error.telemetryCode === "IdentityUnavailable" ||
        error.telemetryCode === "ENOTDIR" ||
        error.telemetryCode === "EXDEV"))
  );
}
//@ chunk-e6aww6q8.js:4484925-4485103 placement
function isTargetOccupiedError(error) {
  return (
    error.code === "Failed" &&
    "telemetryCode" in error &&
    (error.telemetryCode === "ENOTEMPTY" ||
      error.telemetryCode === "EEXIST" ||
      error.telemetryCode === "EPERM" ||
      error.telemetryCode === "EISDIR")
  );
}
//@ chunk-e6aww6q8.js:4485103-4485702 placement
function refuseSymlinkedCacheTarget(error, n) {
  if (error.code === "Failed" && error.cause instanceof Error) {
    let cause = error.cause;
    let path = "path" in cause ? cause.path : undefined;
    if (getErrnoCode(cause) === "ELOOP" && typeof path === "string")
      return Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Cannot install into ${n}: ${path} is a symbolic link, and the plugin cache is not written through symbolic links`,
          "refused to publish a staged plugin through a symlinked cache folder (v5 backend)",
        ),
        {
          code: "ELOOP",
          path,
          cause,
        },
      );
    if (getErrnoCode(cause) !== undefined) return cause;
  }
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to move the staged plugin into ${n}: ${formatStorageError(error)}`,
      "failed to move the staged plugin into its versioned cache (v5 backend error)",
    ),
    {
      cause: error,
    },
  );
}
//@ chunk-e6aww6q8.js:4485702-4485893 placement
async function dropStagedOrphanMarker(e) {
  try {
    await rm_2(join(e, ORPHAN_MARKER_FILE), {
      force: true,
    });
  } catch (error) {
    logForDebugging(
      `Could not drop a stray orphan marker from the staged plugin: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-e6aww6q8.js:4485893-4486097 placement
function toProbeError(error, n) {
  return error.code === "Failed" && error.cause instanceof Error
    ? error.cause
    : Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to probe ${n}: ${formatStorageError(error)}`,
          "failed to probe an installed plugin path (v5 backend error)",
        ),
        {
          cause: error,
        },
      );
}
//@ chunk-e6aww6q8.js:4486097-4486139 placement
function isCrossDeviceRename(error) {
  return getErrnoCode(error) === "EXDEV" || false;
}
//@ chunk-e6aww6q8.js:4486139-4487907 placement
/**
 * 把暂存的插件发布到缓存版本目录，处理替换旧版本与存储接口失败。
 */
async function publishStagedPlugin(path, versionedCachePath, r, s, h) {
  if (isStorageV5Enabled() && s !== undefined && h !== undefined) {
    if (!(await hasLinkedAncestorBelow(versionedCachePath, anchoredPluginCachePath()))) {
      await dropStagedOrphanMarkerV5(s, h.from);
      let Se = await s.moveScope(h.from, h.to, {
        replace: true,
      });
      if (Se.ok) return "published";
      let asideStrandedCleanup = getAsideStrandedCleanup(Se.error);
      if (asideStrandedCleanup !== undefined) {
        if (asideStrandedCleanup.remove)
          await removeReplacedVersionAside(asideStrandedCleanup.aside, versionedCachePath);
        else
          logForDebugging(
            `A publish that stood left the replaced plugin version set aside at ${asideStrandedCleanup.aside}; its folder was found changed, so it is left in place`,
            {
              level: "debug",
            },
          );
        return "published";
      }
      if (!isUnsupportedSwapError(Se.error)) throw refuseSymlinkedCacheTarget(Se.error, versionedCachePath);
      logForDebugging(
        `The storage interface could not publish into ${versionedCachePath} (${formatStorageError(Se.error)}); moving the staged plugin with today's file calls instead`,
        {
          level: "debug",
        },
      );
    }
  }
  await dropStagedOrphanMarker(path);
  let y = path.endsWith(sep) ? path : path + sep;
  let S = versionedCachePath.startsWith(y);
  let w = join(dirname(path), `.claude-plugin-temp-${Date.now()}-${randomBytes(4).toString("hex")}`);
  if (!r.strictCache) {
    await removeDirectoryTreeNoFollow_2(join(path, ".git")).catch((error) => {
      logForDebugging(
        `Could not drop the staged clone's .git before publishing ${versionedCachePath}; this install replaces any installed copy instead of keeping it: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    });
    if (S) await retryFsOp(path, w);
    await getFsImplementation().mkdir(dirname(versionedCachePath));
    return swapVersionDir(S ? w : path, versionedCachePath, {
      keepIdentical: !isPluginZipCacheEnabled(),
      binariesHook: r.binariesHook,
    });
  }
  let L = (Se = "before move", ke) =>
    requireVersionParentContained(versionedCachePath, r.pluginId, r.version, "cache", Se, ke);
  let G = await versionParentState(versionedCachePath);
  if (G === "refused") await L("before move", G);
  await getFsImplementation().mkdir(dirname(versionedCachePath));
  await L();
  let q;
  if ((await clearOccupantForReplace(versionedCachePath, r.pluginId, r.version)) === "recurse") {
    let tempSiblingName = makeTempSiblingName(versionedCachePath);
    try {
      await retryFsOp(versionedCachePath, tempSiblingName);
      q = tempSiblingName;
      let date = new Date();
      await lutimes(tempSiblingName, date, date).catch(() => {});
    } catch (error) {
      if (isCrossDeviceRename(error)) {
        logForDebugging(
          `The occupant of ${versionedCachePath} cannot be renamed aside (${getErrnoCode(error)}); removing it in place instead`,
          {
            level: "debug",
          },
        );
        await removeDirectoryTreeNoFollow_2(versionedCachePath);
      } else if (!isPathAbsent(error)) throw error;
    }
  }
  let Z = path;
  try {
    if (S) {
      await retryFsOp(path, w);
      await getFsImplementation().mkdir(dirname(versionedCachePath));
      Z = w;
    }
    await L("during move");
    await retryFsOp(Z, versionedCachePath);
  } catch (error) {
    if (q !== undefined) await retryFsOp(q, versionedCachePath).catch(() => {});
    throw error;
  }
  if (q !== undefined) await removeDirectoryTreeNoFollow_2(q).catch(() => {});
  return "published";
}
//@ chunk-e6aww6q8.js:4487907-4488691 placement
async function adoptStagedPlugin(path, versionedCachePath, r, s, h) {
  if (isStorageV5Enabled() && s !== undefined && h !== undefined)
    if (await hasLinkedAncestorBelow(versionedCachePath, anchoredPluginCachePath()))
      await dropStagedOrphanMarker(path);
    else {
      await dropStagedOrphanMarkerV5(s, h.from);
      let y = await s.moveScope(h.from, h.to);
      if (y.ok) return y.value.published;
      if (!isUnsupportedSwapError(y.error) && !isTargetOccupiedError(y.error))
        throw refuseSymlinkedCacheTarget(y.error, versionedCachePath);
      logForDebugging(
        `The storage interface could not adopt into ${versionedCachePath} (${formatStorageError(y.error)}); deciding with today's file calls instead`,
        {
          level: "debug",
        },
      );
    }
  if (r && (await versionParentState(versionedCachePath)) === "refused") return false;
  await getFsImplementation().mkdir(dirname(versionedCachePath));
  if (r) {
    if (!(await versionParentContained(versionedCachePath))) return false;
    if (
      await lstat(versionedCachePath).then(
        () => true,
        (error) => {
          if (isPathAbsent(error)) return false;
          throw versionPathOccupantError(
            `Could not move the staged plugin into ${versionedCachePath}: what occupies that cache path could not be examined; retry the install.`,
          );
        },
      )
    )
      return false;
  }
  try {
    await retryFsOp(path, versionedCachePath);
    return true;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (
      errnoCode === "ENOTEMPTY" ||
      errnoCode === "EEXIST" ||
      errnoCode === "EPERM" ||
      errnoCode === "EISDIR"
    )
      return false;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4488691-4488762 placement
/**
 * PluginCachePublishError：插件缓存发布错误类。
 */
class PluginCachePublishError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  reason;
  constructor(reason, n, r) {
    super(n, r);
    this.reason = reason;
  }
}
//@ chunk-e6aww6q8.js:4488762-4488909 placement
/**
 * 安装依赖时，钉住的版本不满足要求的版本范围抛出；manifestVersion 记录实际 manifest 版本。
 */
class PinnedVersionMismatchError extends Error {
  manifestVersion;
  constructor(manifestVersion) {
    super("pinned version does not satisfy the required version range");
    this.manifestVersion = manifestVersion;
  }
}
//@ chunk-e6aww6q8.js:4488909-4488920 placement
/**
 * MAX_CACHE_PUBLISH_ATTEMPTS：发布重试次数。
 */
var MAX_CACHE_PUBLISH_ATTEMPTS = 16;
export {
  PinnedVersionMismatchError,
  PluginCachePublishError,
  toProbeError,
  orphanMarkerMove,
  adoptStagedPlugin,
  publishStagedPlugin,
  MAX_CACHE_PUBLISH_ATTEMPTS,
};
