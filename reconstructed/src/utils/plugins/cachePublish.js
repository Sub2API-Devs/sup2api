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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4483311-4483405 placement
/**
 * orphanMarkerMove：孤儿标记的移动计划。
 */
function orphanMarkerMove(stagingScope, cachePath) {
  if (stagingScope === undefined) return;
  let toSpace = versionCacheStorageSpace(cachePath, anchoredPluginCachePath());
  return toSpace === null
    ? undefined
    : {
        from: stagingScope,
        to: toSpace,
      };
}
//@ chunk-e6aww6q8.js:4483405-4483610 placement
/**
 * 通过 v5 存储后端删除暂存插件版本目录里残留的孤儿标记（R1），失败只记 warn。
 */
async function dropStagedOrphanMarkerV5(storageV5, from) {
  let deleteResult = await storageV5.delete(
    STORAGE_SPACES.pluginCache(from.marketplace, from.plugin, from.version, [ORPHAN_MARKER_FILE]),
  );
  if (!deleteResult.ok)
    logForDebugging(
      `Could not drop a stray orphan marker from the staged plugin: ${formatStorageError(deleteResult.error)}`,
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
  let folderError = "folderError" in cause && cause.folderError !== undefined;
  return {
    aside: path,
    remove: !folderError,
  };
}
//@ chunk-e6aww6q8.js:4484001-4484736 placement
async function removeReplacedVersionAside(aside, publishedPath) {
  let asideName = basename(aside);
  if (aside !== join(dirname(publishedPath), asideName) || !isAsideFileName(asideName)) {
    logForDebugging(
      `A publish that stood named a set-aside at ${aside}; it is not an aside name beside the published version, so it is left in place`,
      {
        level: "debug",
      },
    );
    return;
  }
  try {
    let [asideStat, publishedStat] = await Promise.all([
      lstat(aside, {
        bigint: true,
      }),
      lstat(publishedPath, {
        bigint: true,
      }),
    ]);
    if (!(
      asideStat.isDirectory() &&
      publishedStat.isDirectory() &&
      asideStat.ino !== 0n &&
      publishedStat.ino !== 0n &&
      (asideStat.dev !== publishedStat.dev || asideStat.ino !== publishedStat.ino)
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
function refuseSymlinkedCacheTarget(error, cachePath) {
  if (error.code === "Failed" && error.cause instanceof Error) {
    let cause = error.cause;
    let path = "path" in cause ? cause.path : undefined;
    if (getErrnoCode(cause) === "ELOOP" && typeof path === "string")
      return Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Cannot install into ${cachePath}: ${path} is a symbolic link, and the plugin cache is not written through symbolic links`,
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
      `Failed to move the staged plugin into ${cachePath}: ${formatStorageError(error)}`,
      "failed to move the staged plugin into its versioned cache (v5 backend error)",
    ),
    {
      cause: error,
    },
  );
}
//@ chunk-e6aww6q8.js:4485702-4485893 placement
async function dropStagedOrphanMarker(stagingPath) {
  try {
    await rm_2(join(stagingPath, ORPHAN_MARKER_FILE), {
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
function toProbeError(error, targetPath) {
  return error.code === "Failed" && error.cause instanceof Error
    ? error.cause
    : Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to probe ${targetPath}: ${formatStorageError(error)}`,
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
async function publishStagedPlugin(stagingPath, targetPath, options, storageV5, orphanMarkerMoveInfo) {
  if (isStorageV5Enabled() && storageV5 !== undefined && orphanMarkerMoveInfo !== undefined) {
    if (!(await hasLinkedAncestorBelow(targetPath, anchoredPluginCachePath()))) {
      await dropStagedOrphanMarkerV5(storageV5, orphanMarkerMoveInfo.from);
      let moveResult = await storageV5.moveScope(orphanMarkerMoveInfo.from, orphanMarkerMoveInfo.to, {
        replace: true,
      });
      if (moveResult.ok) return "published";
      let asideStrandedCleanup = getAsideStrandedCleanup(moveResult.error);
      if (asideStrandedCleanup !== undefined) {
        if (asideStrandedCleanup.remove)
          await removeReplacedVersionAside(asideStrandedCleanup.aside, targetPath);
        else
          logForDebugging(
            `A publish that stood left the replaced plugin version set aside at ${asideStrandedCleanup.aside}; its folder was found changed, so it is left in place`,
            {
              level: "debug",
            },
          );
        return "published";
      }
      if (!isUnsupportedSwapError(moveResult.error))
        throw refuseSymlinkedCacheTarget(moveResult.error, targetPath);
      logForDebugging(
        `The storage interface could not publish into ${targetPath} (${formatStorageError(moveResult.error)}); moving the staged plugin with today's file calls instead`,
        {
          level: "debug",
        },
      );
    }
  }
  await dropStagedOrphanMarker(stagingPath);
  let stagingPrefix = stagingPath.endsWith(sep) ? stagingPath : stagingPath + sep;
  let isStagingInsideCache = targetPath.startsWith(stagingPrefix);
  let tempPath = join(
    dirname(stagingPath),
    `.claude-plugin-temp-${Date.now()}-${randomBytes(4).toString("hex")}`,
  );
  if (!options.strictCache) {
    await removeDirectoryTreeNoFollow_2(join(stagingPath, ".git")).catch((error) => {
      logForDebugging(
        `Could not drop the staged clone's .git before publishing ${targetPath}; this install replaces any installed copy instead of keeping it: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    });
    if (isStagingInsideCache) await retryFsOp(stagingPath, tempPath);
    await getFsImplementation().mkdir(dirname(targetPath));
    return swapVersionDir(isStagingInsideCache ? tempPath : stagingPath, targetPath, {
      keepIdentical: !isPluginZipCacheEnabled(),
      binariesHook: options.binariesHook,
    });
  }
  let assertVersionParent = (phase = "before move", state) =>
    requireVersionParentContained(targetPath, options.pluginId, options.version, "cache", phase, state);
  let parentState = await versionParentState(targetPath);
  if (parentState === "refused") await assertVersionParent("before move", parentState);
  await getFsImplementation().mkdir(dirname(targetPath));
  await assertVersionParent();
  let asidePath;
  if ((await clearOccupantForReplace(targetPath, options.pluginId, options.version)) === "recurse") {
    let tempSiblingName = makeTempSiblingName(targetPath);
    try {
      await retryFsOp(targetPath, tempSiblingName);
      asidePath = tempSiblingName;
      let date = new Date();
      await lutimes(tempSiblingName, date, date).catch(() => {});
    } catch (error) {
      if (isCrossDeviceRename(error)) {
        logForDebugging(
          `The occupant of ${targetPath} cannot be renamed aside (${getErrnoCode(error)}); removing it in place instead`,
          {
            level: "debug",
          },
        );
        await removeDirectoryTreeNoFollow_2(targetPath);
      } else if (!isPathAbsent(error)) throw error;
    }
  }
  let sourcePath = stagingPath;
  try {
    if (isStagingInsideCache) {
      await retryFsOp(stagingPath, tempPath);
      await getFsImplementation().mkdir(dirname(targetPath));
      sourcePath = tempPath;
    }
    await assertVersionParent("during move");
    await retryFsOp(sourcePath, targetPath);
  } catch (error) {
    if (asidePath !== undefined) await retryFsOp(asidePath, targetPath).catch(() => {});
    throw error;
  }
  if (asidePath !== undefined) await removeDirectoryTreeNoFollow_2(asidePath).catch(() => {});
  return "published";
}
//@ chunk-e6aww6q8.js:4487907-4488691 placement
async function adoptStagedPlugin(stagingPath, cachePath, strictCache, storageV5, orphanMarkerMoveInfo) {
  if (isStorageV5Enabled() && storageV5 !== undefined && orphanMarkerMoveInfo !== undefined)
    if (await hasLinkedAncestorBelow(cachePath, anchoredPluginCachePath()))
      await dropStagedOrphanMarker(stagingPath);
    else {
      await dropStagedOrphanMarkerV5(storageV5, orphanMarkerMoveInfo.from);
      let moveResult = await storageV5.moveScope(orphanMarkerMoveInfo.from, orphanMarkerMoveInfo.to);
      if (moveResult.ok) return moveResult.value.published;
      if (!isUnsupportedSwapError(moveResult.error) && !isTargetOccupiedError(moveResult.error))
        throw refuseSymlinkedCacheTarget(moveResult.error, cachePath);
      logForDebugging(
        `The storage interface could not adopt into ${cachePath} (${formatStorageError(moveResult.error)}); deciding with today's file calls instead`,
        {
          level: "debug",
        },
      );
    }
  if (strictCache && (await versionParentState(cachePath)) === "refused") return false;
  await getFsImplementation().mkdir(dirname(cachePath));
  if (strictCache) {
    if (!(await versionParentContained(cachePath))) return false;
    if (
      await lstat(cachePath).then(
        () => true,
        (error) => {
          if (isPathAbsent(error)) return false;
          throw versionPathOccupantError(
            `Could not move the staged plugin into ${cachePath}: what occupies that cache path could not be examined; retry the install.`,
          );
        },
      )
    )
      return false;
  }
  try {
    await retryFsOp(stagingPath, cachePath);
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
let PluginCachePublishError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:4488691", () => {
  PluginCachePublishError = class PluginCachePublishError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    reason;
    constructor(reason, message, telemetryCode) {
      super(message, telemetryCode);
      this.reason = reason;
    }
  };
});
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
