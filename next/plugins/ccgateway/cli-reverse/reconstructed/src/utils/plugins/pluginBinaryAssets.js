/**
 * utils/plugins/pluginBinaryAssets.ts
 *
 * 2.1.316 新增：插件二进制资源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (39), chunk-f3qhjfah.js (1)
 * attribution: placement 40
 */
import { join } from "path";
import {
  lstat,
  mkdir,
  realpath,
  rm as rm_2,
  open,
  utimes,
  copyFile,
  link,
  rename,
  readdir,
} from "fs/promises";
import { createHash, randomBytes } from "crypto";
import { constants } from "fs";
import { getClaudeConfigDir } from "../envUtils.js";
import {
  MAX_PLUGIN_BINARY_BYTES,
  binaryBaseNameForTarget,
  readOnlyNoFollowFlags,
} from "../platformTargets.js";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { projectPluginsDir, projectPluginCacheDir } from "./pluginCachePaths.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { PluginIdSchema, BINARY_FETCH_CONCURRENCY } from "./schemas.js";
import { isOfficialMarketplaceName_3, parsePluginIdentifier } from "./pluginIdentifier.js";
import {
  sanitizeErrnoForTelemetry,
  sanitizeErrorName as sanitizeErrorName_2,
  isENOENT,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errnoShapedCode,
} from "../errors.js";
import { logForDebugging } from "../debug.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getPluginVersionFromManifest } from "./installedPluginsManager.js";
import { isSupportedPlatform } from "../../commands/desktop/index.js";
import { storageErrorCode, formatStorageError, TOOLARGE, SOURCETOOLARGE } from "../storage/storageErrors.js";
import { isSubpathOf } from "../pathPrefix.js";
import { versionCacheStorageSpace } from "./pluginDirectories.js";
import { hasLinkedAncestorBelow } from "./pluginCacheMaterialize.js";
import { STORAGE_SPACES, isSameStorageSpace } from "../storage/storageSpaces.js";
import { getPlatform } from "../platform.js";
import { WRITE_LOCK_TTL_MS } from "../../services/memorySync/syncFiles.js";
import { sleep } from "../sleep.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { LINKMISDIRECTED, LINKUNVERIFIED } from "../fsSafety/hardenedRead.js";
import { ATOMIC_WRITE_ERRNOS } from "./safeCopy.js";

//@ chunk-f3qhjfah.js:4072-4167 placement
/**
 * 若路径正是插件资源缓存目录（`<配置目录>/plugins/asset-cache`），返回存储命名空间 pluginAssetCache，否则 null。
 */
function assetCacheNamespace(cacheDir) {
  return cacheDir === join(getClaudeConfigDir(), "plugins", "asset-cache")
    ? {
        namespace: "pluginAssetCache",
      }
    : null;
}
//@ chunk-e6aww6q8.js:4369039-4369171 placement
var ASSET_LOG_PREFIX = "[pluginBinaryAssets]";
var ASSET_CACHE = "asset-cache";
var ASSET_FETCH_TIMEOUT_MS = 120000;
var ASSET_TOTAL_BUDGET_MS = 300000;
var ASSET_STALL_TIMEOUT_MS = 30000;
var MAX_ASSET_BYTES = MAX_PLUGIN_BINARY_BYTES;
var ASSET_RETRY_DELAYS_MS = [1000, 2000];
var ASSET_CACHE_TTL_MS = 2592000000;
var TEMP_FILE_TTL_MS = 86400000;
//@ chunk-e6aww6q8.js:4369171-4369295 placement
class PluginAssetFetchError extends Error {
  code;
  status;
  constructor(message, code, status) {
    super(message);
    this.name = "PluginAssetFetchError";
    this.code = code;
    this.status = status;
  }
}
//@ chunk-e6aww6q8.js:4369295-4369393 placement
function pluginBinaryAssetsEnabled() {
  return (
    env.CLAUDE_CODE_PLUGIN_BINARY_ASSETS ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_binary_assets", false) === true
  );
}
//@ chunk-e6aww6q8.js:4369393-4369572 placement
async function provisionBinaryAssets(pluginPath, pluginId, options) {
  let assetCacheDir = options?.assetCacheDir ?? join(projectPluginsDir(), ASSET_CACHE);
  let storageV5 = options?.storageV5;
  let namespace = isStorageV5Enabled() && storageV5 !== undefined ? assetCacheNamespace(assetCacheDir) : null;
  try {
    await provisionPluginBinaryAssets(pluginPath, pluginId, assetCacheDir, namespace, options);
  } finally {
    await sweepStaleTempFiles(assetCacheDir, storageV5, namespace).catch(() => {
      return;
    });
  }
}
//@ chunk-e6aww6q8.js:4369572-4369651 placement
/**
 * shouldInstallBinaryAssets：官方市场插件且功能开启。
 */
function shouldInstallBinaryAssets(pluginId) {
  return (
    PluginIdSchema().safeParse(pluginId).success &&
    isOfficialMarketplaceName_3(parsePluginIdentifier(pluginId).marketplace) &&
    pluginBinaryAssetsEnabled()
  );
}
//@ chunk-e6aww6q8.js:4369651-4373603 placement
/**
 * 为插件准备二进制资源：下载、校验并放到插件目录的 bin 下。
 */
async function provisionPluginBinaryAssets(pluginPath, pluginId, cacheDir, namespace, options) {
  if (!shouldInstallBinaryAssets(pluginId)) return;
  let startTime = performance.now();
  let expectedCount = 0;
  let provisioned = 0;
  let matched = 0;
  let cacheHits = 0;
  let downloads = 0;
  let removed = 0;
  let failed = 0;
  let skippedCode;
  let firstRemovalReason;
  let failureCode;
  let attempted = false;
  function noteFailure(error, message) {
    failureCode ??=
      error instanceof PluginAssetFetchError
        ? error.code
        : (sanitizeErrnoForTelemetry(error) ?? sanitizeErrorName_2(error) ?? "unknown");
    logForDebugging(
      `${ASSET_LOG_PREFIX} ${pluginId}: ${message}: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
  }
  try {
    let storageV5 = options?.storageV5;
    let versionSpace =
      isStorageV5Enabled() && storageV5 !== undefined ? await pluginCacheBinPath(pluginPath) : null;
    let binSpace = namespace !== null ? versionSpace : null;
    if (!(await isDirectoryPresent(pluginPath, storageV5, versionSpace))) {
      logFeatureBad("plugin_binary_assets", "plugin_root_not_dir", {
        expected_count: 0,
      });
      logForDebugging(
        `${ASSET_LOG_PREFIX} ${pluginId}: plugin root is not a real directory; refusing to provision binaries`,
        {
          level: "warn",
        },
      );
      return;
    }
    let pluginVersionFromManifest = await getPluginVersionFromManifest(pluginPath, storageV5, versionSpace);
    if (!pluginVersionFromManifest) return;
    attempted = true;
    let entries = Object.entries(pluginVersionFromManifest);
    expectedCount = entries.length;
    let binDirPath = join(pluginPath, "bin");
    let binDir = await ensureBinDir(binDirPath, storageV5, versionSpace);
    if (binDir !== "ok") {
      failureCode = binDir;
      return;
    }
    if (!(await resolveContainedBinDir(binDirPath, pluginPath, storageV5, versionSpace))) {
      failureCode = "bin_outside_plugin";
      return;
    }
    let toFetch = [];
    let toRetry = [];
    let matchedEntries = [];
    for (let [name, spec] of entries) {
      if (performance.now() - startTime > ASSET_TOTAL_BUDGET_MS) {
        failureCode ??= "pass_deadline_exceeded";
        break;
      }
      try {
        let containedBinDir = await resolveContainedBinDir(binDirPath, pluginPath, storageV5, versionSpace);
        if (!containedBinDir) {
          failureCode ??= "bin_dir_race";
          continue;
        }
        let assetPath = join(containedBinDir, name);
        let storageSpace = versionSpace === null ? undefined : pluginBinaryStorageSpace(versionSpace, name);
        switch (
          await verifyPlacedAsset(
            assetPath,
            spec.sha256,
            {
              ensureMode: 493,
              guestWritable: true,
            },
            storageV5,
            storageSpace,
          )
        ) {
          case "match":
            matched++;
            matchedEntries.push([name, spec]);
            continue;
          case "absent":
            toFetch.push([name, spec]);
            continue;
          case "mismatch":
          case "not_regular": {
            firstRemovalReason ??= "asset_present_digest_mismatch";
            let containedBinDir = await resolveContainedBinDir(
              binDirPath,
              pluginPath,
              storageV5,
              versionSpace,
            );
            if (!containedBinDir) {
              failureCode ??= "bin_dir_race";
              continue;
            }
            try {
              await removeBinEntry(containedBinDir, name, storageV5, versionSpace);
            } catch (error) {
              logForDebugging(
                `${ASSET_LOG_PREFIX} ${pluginId}: failed to remove mismatched bin/${name}: ${error instanceof Error ? error.message : String(error)}`,
                {
                  level: "warn",
                },
              );
              toRetry.push([name, spec]);
              continue;
            }
            removed++;
            logForDebugging(
              `${ASSET_LOG_PREFIX} ${pluginId}: removed bin/${name} \u2014 it is not the artifact pinned by the manifest`,
              {
                level: "warn",
              },
            );
            toRetry.push([name, spec]);
            continue;
          }
          case "unreadable":
            failureCode ??= "asset_unverifiable";
            toFetch.push([name, spec]);
            continue;
          case "unverifiable_windows":
            toFetch.push([name, spec]);
            continue;
        }
      } catch (error) {
        noteFailure(error, `failed to verify bin/${name}`);
      }
    }
    let queued = [...toRetry, ...toFetch];
    {
      let sliced = queued.slice(0, BINARY_FETCH_CONCURRENCY);
      if (queued.length > sliced.length)
        logForDebugging(
          `${ASSET_LOG_PREFIX} ${queued.length} binaries need fetching; only the first ${BINARY_FETCH_CONCURRENCY} will be`,
          {
            level: "warn",
          },
        );
      if (sliced.length > 0)
        try {
          await ensurePluginDirExists(cacheDir, storageV5, namespace);
        } catch (error) {
          noteFailure(error, "failed to create the asset cache dir");
          sliced = [];
        }
      for (let [name, spec] of sliced) {
        if (performance.now() - startTime > ASSET_TOTAL_BUDGET_MS) {
          failureCode ??= "pass_deadline_exceeded";
          break;
        }
        try {
          let { cachePath, cacheHit } = await fetchAssetToCache(
            spec.sha256,
            cacheDir,
            storageV5,
            namespace,
            options?.retryDelaysMs ?? ASSET_RETRY_DELAYS_MS,
            startTime + ASSET_TOTAL_BUDGET_MS,
            options?.downloadTimeoutMs ?? ASSET_FETCH_TIMEOUT_MS,
            options?.credentials,
          );
          if (cacheHit) cacheHits++;
          else downloads++;
          let containedBinDir = await resolveContainedBinDir(binDirPath, pluginPath, storageV5, versionSpace);
          if (!containedBinDir) {
            failureCode ??= "bin_dir_race";
            continue;
          }
          await placePluginBinaryAsset(
            cachePath,
            cacheDir,
            containedBinDir,
            name,
            spec.sha256,
            storageV5,
            binSpace,
          );
          provisioned++;
          matchedEntries.push([name, spec]);
        } catch (error) {
          if (error instanceof PluginAssetFetchError && error.code.startsWith("skipped_")) {
            skippedCode = error.code;
            break;
          }
          noteFailure(error, `failed to provision ${name}`);
        }
      }
    }
    let target = isSupportedPlatform();
    if (target !== undefined) {
      let baseNameCounts = new Map();
      for (let [assetEntry] of entries) {
        let baseName = binaryBaseNameForTarget(assetEntry, target);
        if (baseName !== undefined) baseNameCounts.set(baseName, (baseNameCounts.get(baseName) ?? 0) + 1);
      }
      let startTime = performance.now();
      for (let [assetEntry, matchedAsset] of matchedEntries) {
        if (performance.now() - startTime > ASSET_STALL_TIMEOUT_MS) {
          failureCode ??= "pass_deadline_exceeded";
          break;
        }
        let baseName = binaryBaseNameForTarget(assetEntry, target);
        if (baseName === undefined || Object.hasOwn(pluginVersionFromManifest, baseName)) continue;
        if ((baseNameCounts.get(baseName) ?? 0) > 1) {
          logForDebugging(
            `${ASSET_LOG_PREFIX} ${pluginId}: multiple declared entries derive bin/${baseName}; refusing to pick one`,
            {
              level: "warn",
            },
          );
          firstRemovalReason ??= "asset_bare_name_collision";
          continue;
        }
        try {
          let containedBinDir = await resolveContainedBinDir(binDirPath, pluginPath, storageV5, versionSpace);
          if (!containedBinDir) {
            failureCode ??= "bin_dir_race";
            continue;
          }
          let placement = await linkAssetIntoBin(
            containedBinDir,
            assetEntry,
            baseName,
            matchedAsset.sha256,
            storageV5,
            versionSpace,
          );
          if (placement === "placed") {
            failed++;
            continue;
          }
          if (placement === "exists") continue;
          if (placement === "failed_created") {
            let containedBinDir = await resolveContainedBinDir(
              binDirPath,
              pluginPath,
              storageV5,
              versionSpace,
            );
            if (containedBinDir)
              await removeBinEntry(containedBinDir, baseName, storageV5, versionSpace).catch(() => {
                return;
              });
            else failureCode ??= "bin_dir_race";
          }
          if (placement === "failed_created" || placement === "refused_source")
            firstRemovalReason ??= "asset_bare_place_failed";
          else failureCode ??= "asset_bare_place_env_failed";
          logForDebugging(
            `${ASSET_LOG_PREFIX} ${pluginId}: bare placement bin/${baseName} failed (${placement}); not placed`,
            {
              level: "warn",
            },
          );
        } catch (error) {
          noteFailure(error, `failed to place bin/${baseName}`);
        }
      }
    }
  } catch (error) {
    noteFailure(error, "binary asset provisioning failed");
  } finally {
    if (attempted) {
      let telemetryFields = {
        expected_count: expectedCount,
        placed_count: provisioned,
        already_present_count: matched,
        cache_hit_count: cacheHits,
        download_count: downloads,
        mismatch_removed_count: removed,
        bare_placed_count: failed,
        duration_ms: Math.round(performance.now() - startTime),
      };
      let reason = firstRemovalReason ?? failureCode;
      if (reason !== undefined) {
        if (provisioned + matched > 0) logFeatureSad("plugin_binary_assets", reason, telemetryFields);
        else logFeatureBad("plugin_binary_assets", reason, telemetryFields);
      } else if (skippedCode !== undefined)
        logFeatureSad("plugin_binary_assets", skippedCode, telemetryFields);
      else logFeatureOk("plugin_binary_assets", telemetryFields);
    }
  }
}
//@ chunk-e6aww6q8.js:4374535-4374872 placement
/**
 * 确保插件 bin 目录存在且是目录（ok/bin_not_dir/bin_uninspectable/bin_dir_race）。
 */
async function ensureBinDir(binDirPath, storageV5, versionSpace) {
  if (isStorageV5Enabled() && storageV5 !== undefined && versionSpace !== null)
    return ensureBinDirViaStorage(storageV5, versionSpace);
  let binStats;
  try {
    binStats = await lstat(binDirPath);
  } catch (error) {
    if (!isENOENT(error)) return "bin_uninspectable";
    binStats = null;
  }
  if (binStats && !binStats.isDirectory()) return "bin_not_dir";
  if (!binStats)
    try {
      await makePrivateDir(binDirPath);
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") return "bin_uninspectable";
    }
  return (await lstat(binDirPath).catch(() => null))?.isDirectory() ? "ok" : "bin_dir_race";
}
//@ chunk-e6aww6q8.js:4374872-4375279 placement
/**
 * v5 存储下确保 bin 作用域存在。
 */
async function ensureBinDirViaStorage(storageV5, versionSpace) {
  let binScope = withBinRelPath(versionSpace);
  let kindResult = await storageV5.scopeKind(binScope);
  if (!kindResult.ok) return "bin_uninspectable";
  if (kindResult.value.kind === "link" || kindResult.value.kind === "other") return "bin_not_dir";
  if (kindResult.value.kind === "absent") {
    let ensureResult = await storageV5.ensureScope(binScope, {
      parent: "mustExist",
    });
    if (!ensureResult.ok) {
      let code = storageErrorCode(ensureResult.error);
      if (code !== "EEXIST" && code !== "ENOTDIR" && code !== "ELOOP" && code !== "UnexpectedAbsent")
        return "bin_uninspectable";
    }
  }
  return (await isDirectoryScope(storageV5, binScope)) ? "ok" : "bin_dir_race";
}
//@ chunk-e6aww6q8.js:4375279-4375320 placement
function makePrivateDir(dirPath) {
  return mkdir(dirPath, {
    mode: 493,
  });
}
//@ chunk-e6aww6q8.js:4375320-4375601 placement
async function resolveContainedBinDir(binDir, pluginRoot, storageV5, versionSpace) {
  if (isStorageV5Enabled() && storageV5 !== undefined && versionSpace !== null)
    return (await isDirectoryScope(storageV5, versionSpace)) &&
      (await isDirectoryScope(storageV5, withBinRelPath(versionSpace))) &&
      (await isBinInsideVersion(binDir, pluginRoot, storageV5, versionSpace))
      ? binDir
      : null;
  if (!(await lstat(pluginRoot).catch(() => null))?.isDirectory()) return null;
  if (!(await lstat(binDir).catch(() => null))?.isDirectory()) return null;
  return (await isBinInsideVersion(binDir, pluginRoot, storageV5, versionSpace)) ? binDir : null;
}
//@ chunk-e6aww6q8.js:4375601-4375763 placement
async function isBinInsideVersion(binDir, pluginRoot, storageV5, versionSpace) {
  if (isStorageV5Enabled() && storageV5 !== undefined && versionSpace !== null) return true;
  try {
    let [realRoot, realBin] = await Promise.all([realpath(pluginRoot), realpath(binDir)]);
    if (!isSubpathOf(realRoot, realBin, false)) return false;
  } catch {
    return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4375763-4375890 placement
async function isDirectoryPresent(pluginPath, storageV5, versionSpace) {
  if (isStorageV5Enabled() && storageV5 !== undefined && versionSpace !== null)
    return isDirectoryScope(storageV5, versionSpace);
  return (await lstat(pluginPath).catch(() => null))?.isDirectory() === true;
}
//@ chunk-e6aww6q8.js:4375890-4375981 placement
async function isDirectoryScope(storageV5, scope) {
  let kindResult = await storageV5.scopeKind(scope);
  return kindResult.ok && kindResult.value.kind === "directory";
}
//@ chunk-e6aww6q8.js:4375981-4376074 placement
async function pluginCacheBinPath(pluginPath) {
  let cacheDir = projectPluginCacheDir();
  let space = versionCacheStorageSpace(pluginPath, cacheDir);
  if (space === null || (await hasLinkedAncestorBelow(pluginPath, cacheDir))) return null;
  return space;
}
//@ chunk-e6aww6q8.js:4376074-4376119 placement
function withBinRelPath(versionSpace) {
  return {
    ...versionSpace,
    relPath: ["bin"],
  };
}
//@ chunk-e6aww6q8.js:4376119-4376202 placement
function pluginBinaryStorageSpace(coords, name) {
  return STORAGE_SPACES.pluginCache(coords.marketplace, coords.plugin, coords.version, ["bin", name]);
}
//@ chunk-e6aww6q8.js:4376202-4376479 placement
async function removeBinEntry(containedBinDir, name, storageV5, versionSpace) {
  if (isStorageV5Enabled() && storageV5 !== undefined && versionSpace !== null) {
    let deleteResult = await storageV5.delete(pluginBinaryStorageSpace(versionSpace, name));
    if (deleteResult.ok) return;
    if (storageErrorCode(deleteResult.error) !== "EISDIR") throw storageRemovalError(deleteResult.error);
    let scopeDelete = await storageV5.deleteScope({
      ...versionSpace,
      relPath: ["bin", name],
    });
    if (!scopeDelete.ok) throw storageRemovalError(scopeDelete.error);
    return;
  }
  await rm_2(join(containedBinDir, name), {
    recursive: true,
    force: true,
  });
}
//@ chunk-e6aww6q8.js:4376479-4376663 placement
function storageRemovalError(error) {
  let code = storageErrorCode(error);
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `removal through the storage interface failed: ${formatStorageError(error)}`,
      "removal through the storage interface failed",
    ),
    code !== undefined
      ? {
          code,
        }
      : {},
  );
}
//@ chunk-e6aww6q8.js:4376663-4377497 placement
async function verifyPlacedAsset(assetPath, expectedSha, options, storageV5, storageSpace) {
  if (options?.guestWritable && getPlatform() === "windows") return "unverifiable_windows";
  if (isStorageV5Enabled() && storageV5 !== undefined && storageSpace !== undefined)
    return verifyAssetDigest(storageV5, storageSpace, expectedSha, options?.ensureMode);
  let stat;
  try {
    stat = await lstat(assetPath);
  } catch (error) {
    return isENOENT(error) ? "absent" : "unreadable";
  }
  if (!stat.isFile()) return "not_regular";
  let handle;
  try {
    handle = await open(assetPath, readOnlyNoFollowFlags());
    let stats = await handle.stat();
    if (!stats.isFile()) return "not_regular";
    if (stats.size > MAX_ASSET_BYTES) return "mismatch";
    let hash = createHash("sha256");
    for await (let chunk of handle.createReadStream({
      autoClose: false,
    }))
      hash.update(chunk);
    if (hash.digest("hex") !== expectedSha) return "mismatch";
    if (
      options?.ensureMode !== undefined &&
      getPlatform() !== "windows" &&
      (stats.mode & 511) !== options.ensureMode
    )
      await handle.chmod(options.ensureMode).catch(() => {
        return;
      });
    return "match";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP") return "not_regular";
    if (errnoCode === "EACCES" || errnoCode === "EPERM")
      return (stat.mode & 292) === 0 ? "mismatch" : "unreadable";
    return "unreadable";
  } finally {
    await handle?.close().catch(() => {
      return;
    });
  }
}
//@ chunk-e6aww6q8.js:4377497-4378170 placement
/**
 * 经存储校验资源 sha256：match/mismatch/absent/not_regular/unreadable。
 */
async function verifyAssetDigest(storageV5, space, expectedSha, ensureMode) {
  let digestResult = await storageV5.digest(space, {
    algorithm: "sha256",
    maxBytes: MAX_ASSET_BYTES,
  });
  if (digestResult.ok) {
    if (digestResult.value.digest !== expectedSha) return "mismatch";
    let { mode, object } = digestResult.value;
    if (ensureMode !== undefined && mode !== undefined && mode !== ensureMode && object !== undefined)
      await storageV5
        .setMode(space, ensureMode, {
          ifObject: object,
        })
        .catch(() => {
          return;
        });
    return "match";
  }
  if (digestResult.error.code === "NotFound") return "absent";
  let code = storageErrorCode(digestResult.error);
  if (code === TOOLARGE) return "mismatch";
  if (code === "ELOOP" || code === "ENXIO") return "not_regular";
  let statResult = await storageV5.statMeta(space);
  if (!statResult.ok) {
    if (statResult.error.code === "NotFound") return "absent";
    let code = storageErrorCode(statResult.error);
    return code === "ELOOP" || code === "ENXIO" ? "not_regular" : "unreadable";
  }
  let mode = statResult.value.mode;
  return (code === "EACCES" || code === "EPERM") && mode !== undefined && (mode & 292) === 0
    ? "mismatch"
    : "unreadable";
}
//@ chunk-e6aww6q8.js:4378170-4378673 placement
/**
 * 资源缓存中已有且摘要匹配时刷新时间并返回命中；否则清掉非文件的占位，按重试策略下载到 .partial 临时文件后改名到缓存。
 */
async function fetchAssetToCache(
  sha,
  cacheDir,
  storageV5,
  namespace,
  retryDelays,
  deadline,
  timeoutMs,
  credentials,
) {
  let cachePath = join(cacheDir, sha);
  if (isStorageV5Enabled() && storageV5 !== undefined && namespace !== null)
    return writePluginAsset(sha, cachePath, storageV5, retryDelays, deadline, timeoutMs, credentials);
  if ((await verifyPlacedAsset(cachePath, sha)) === "match") {
    let date = new Date();
    await utimes(cachePath, date, date).catch(() => {
      return;
    });
    return {
      cachePath,
      cacheHit: true,
    };
  }
  let stat = await lstat(cachePath).catch(() => null);
  if (stat && !stat.isFile())
    await rm_2(cachePath, {
      recursive: true,
      force: true,
    });
  return retryTransientAssetFetch(retryDelays, deadline, async () => {
    let partialPath = join(cacheDir, `.partial-${sha}-${makePidRandomId()}`);
    try {
      await downloadAssetToFile(sha, partialPath, timeoutMs, credentials);
      await renameReplacing(partialPath, cachePath);
      return {
        cachePath,
        cacheHit: false,
      };
    } catch (error) {
      await rm_2(partialPath, {
        force: true,
      }).catch(() => {
        return;
      });
      throw error;
    }
  });
}
//@ chunk-e6aww6q8.js:4378673-4379523 placement
async function writePluginAsset(sha, cachePath, storageV5, retryDelays, deadline, timeoutMs, credentials) {
  let space = STORAGE_SPACES.pluginAssetCache(sha);
  let digestResult = await binaryAssetDigest(storageV5, space);
  if (digestResult.ok && digestResult.value.digest === sha) {
    await storageV5.touch(space);
    return {
      cachePath,
      cacheHit: true,
    };
  }
  await dropMismatchedCacheEntry(storageV5, space, sha, cachePath, digestResult);
  return retryTransientAssetFetch(retryDelays, deadline, async () => {
    let assetStream = createAssetStream(sha, timeoutMs, credentials);
    let writeResult = await storageV5.writeFromStream(space, assetStream.chunks, {
      maxBytes: MAX_ASSET_BYTES,
      precondition: {
        type: "ifAbsent",
      },
      mode: 384,
      flush: true,
      acquireTimeoutMs: Math.min(timeoutMs, WRITE_LOCK_TTL_MS),
    });
    if (writeResult.ok)
      return {
        cachePath,
        cacheHit: false,
      };
    let streamFailure = assetStream.failure();
    if (streamFailure !== undefined) throw streamFailure;
    if (writeResult.error.code === "Failed" && writeResult.error.telemetryCode === SOURCETOOLARGE)
      throw new PluginAssetFetchError("asset exceeds size cap", "asset_too_large");
    if (writeResult.error.code === "AlreadyExists") {
      let digestResult = await binaryAssetDigest(storageV5, space);
      if (digestResult.ok && digestResult.value.digest === sha) {
        await storageV5.touch(space);
        return {
          cachePath,
          cacheHit: !assetStream.started(),
        };
      }
    }
    if (writeResult.error.code === "Unavailable" || writeResult.error.code === "Failed")
      throw new PluginAssetFetchError(
        `asset cache store failed (${formatStorageError(writeResult.error)})`,
        "asset_transient",
      );
    throw assetCacheStorageError(writeResult.error);
  });
}
//@ chunk-e6aww6q8.js:4379523-4379594 placement
function binaryAssetDigest(storageV5, space) {
  return storageV5.digest(space, {
    algorithm: "sha256",
    maxBytes: MAX_ASSET_BYTES,
  });
}
//@ chunk-e6aww6q8.js:4379594-4380019 placement
/**
 * 存储中摘要不符的缓存项按版本条件删除。
 */
async function dropMismatchedCacheEntry(storageV5, space, expectedSha, cachePath, digestResult) {
  if (digestResult.ok) {
    let stats = await storageV5.stat(space);
    if (!stats.ok) return;
    let digestResult = await binaryAssetDigest(storageV5, space);
    if (digestResult.ok && digestResult.value.digest !== expectedSha)
      await storageV5.delete(space, {
        precondition: {
          type: "ifMatch",
          version: stats.value.version,
        },
      });
    return;
  }
  if (digestResult.error.code === "NotFound") return;
  let code = storageErrorCode(digestResult.error);
  if (code === "EISDIR" || code === "ENXIO") {
    let stat = await lstat(cachePath).catch(() => null);
    if (stat && !stat.isFile() && !stat.isSymbolicLink())
      await rm_2(cachePath, {
        recursive: true,
        force: true,
      });
    return;
  }
  await storageV5.delete(space);
}
//@ chunk-e6aww6q8.js:4380019-4380240 placement
function assetCacheStorageError(error) {
  logForDebugging(`${ASSET_LOG_PREFIX} asset cache storage call failed: ${formatStorageError(error)}`, {
    level: "warn",
  });
  let code = storageErrorCode(error);
  return Object.assign(Error("asset cache storage call failed"), {
    name: "PluginAssetCacheStorageError",
    ...(code !== undefined && {
      code,
    }),
  });
}
//@ chunk-e6aww6q8.js:4380240-4380532 placement
async function retryTransientAssetFetch(retryDelays, deadline, attempt) {
  let attemptIndex = 0;
  for (;;)
    try {
      return await attempt();
    } catch (error) {
      let isTransient = error instanceof PluginAssetFetchError && error.code === "asset_transient";
      let delayMs = retryDelays[attemptIndex] ?? 0;
      if (!isTransient || attemptIndex >= retryDelays.length || performance.now() + delayMs >= deadline)
        throw error;
      attemptIndex++;
      logForDebugging(
        `${ASSET_LOG_PREFIX} transient failure fetching asset (attempt ${attemptIndex}); retrying in ${delayMs}ms`,
        {
          level: "warn",
        },
      );
      await sleep(delayMs);
    }
}
//@ chunk-e6aww6q8.js:4380532-4380631 placement
async function ensurePluginDirExists(dirPath, storageV5, namespace) {
  if (isStorageV5Enabled() && storageV5 !== undefined && namespace !== null) return;
  await mkdir(dirPath, {
    recursive: true,
    mode: 448,
  });
}
//@ chunk-e6aww6q8.js:4380631-4381579 placement
/**
 * 从组织市场下载插件二进制资源。
 */
async function fetchPluginAsset(sha, timeout, credentials) {
  let response = await apiClient
    .get(`/api/organizations/:orgUUID/marketplace/plugin-assets/${sha}`, {
      auth: "teleport-org",
      responseType: "stream",
      timeout,
      validateStatus: () => true,
      credentials,
      headers: {
        accept: "application/octet-stream",
        "anthropic-beta": OAUTH_BETA_HEADER,
      },
    })
    .catch((error) => {
      if (getErrnoCode(error) === undefined) throw error;
      throw new PluginAssetFetchError(
        `asset fetch failed: ${error instanceof Error ? error.message : String(error)}`,
        "asset_transient",
      );
    });
  if (!response.ok) {
    let skipCode =
      response.reason === "data-residency"
        ? "skipped_data_residency"
        : response.reason === "essential-traffic-only"
          ? "skipped_essential_traffic_only"
          : "skipped_no_claude_ai_auth";
    throw new PluginAssetFetchError(`asset fetch skipped (${skipCode})`, skipCode);
  }
  let { status } = response;
  if (status !== 200) {
    response.data.destroy();
    if (status === 404) throw new PluginAssetFetchError("asset not found (404)", "asset_not_found", status);
    if (status === 410) throw new PluginAssetFetchError("asset denylisted (410)", "asset_denylisted", status);
    if (status >= 500)
      throw new PluginAssetFetchError(`asset fetch failed (${status})`, "asset_transient", status);
    throw new PluginAssetFetchError(`unexpected asset response (${status})`, "asset_http_error", status);
  }
  return response.data;
}
//@ chunk-e6aww6q8.js:4381579-4382434 placement
/**
 * 下载资源并校验固定的 sha256。
 */
function downloadAssetWithDigest(pluginAsset, expectedSha, timeoutMs, verify) {
  let hash = createHash("sha256");
  let received = 0;
  let stallTimer;
  function armWatchdog() {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(
      (stream) => stream.destroy(Error("asset download stream stalled")),
      timeoutMs,
      pluginAsset,
    );
  }
  let streamError;
  function onError(error) {
    streamError = error;
  }
  pluginAsset.once("error", onError);
  let finished = false;
  function abort() {
    pluginAsset.off("error", onError);
    clearTimeout(stallTimer);
    if (!finished) pluginAsset.destroy();
  }
  function verifyDigest() {
    if (hash.digest("hex") !== expectedSha)
      throw new PluginAssetFetchError(
        "downloaded bytes do not match the pinned sha256",
        "asset_digest_mismatch",
      );
  }
  async function* chunks() {
    try {
      pluginAsset.off("error", onError);
      if (streamError !== undefined) throw streamError;
      armWatchdog();
      for await (let chunk of pluginAsset) {
        armWatchdog();
        let buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += buf.length;
        if (received > MAX_ASSET_BYTES)
          throw new PluginAssetFetchError("asset exceeds size cap", "asset_too_large");
        hash.update(buf);
        yield buf;
      }
      clearTimeout(stallTimer);
      if (verify) verifyDigest();
      finished = true;
    } catch (error) {
      throw error instanceof PluginAssetFetchError
        ? error
        : new PluginAssetFetchError(
            `asset download failed: ${error instanceof Error ? error.message : String(error)}`,
            "asset_transient",
          );
    } finally {
      abort();
    }
  }
  return {
    chunks: chunks(),
    verifyDigest,
    abort,
  };
}
//@ chunk-e6aww6q8.js:4382434-4382943 placement
/**
 * 流式下载资源到新文件并校验摘要，失败删除。
 */
async function downloadAssetToFile(sha, filePath, timeoutMs, credentials) {
  let stream = downloadAssetWithDigest(
    await fetchPluginAsset(sha, timeoutMs, credentials),
    sha,
    timeoutMs,
    false,
  );
  let handle;
  let failure;
  try {
    handle = await open(filePath, "wx", 384);
    for await (let chunk of stream.chunks) await handle.write(chunk);
    await handle.sync().catch(() => {
      return;
    });
  } catch (error) {
    failure = error;
    stream.abort();
  } finally {
    await handle?.close().catch(() => {
      return;
    });
  }
  if (failure !== undefined) {
    await rm_2(filePath, {
      force: true,
    }).catch(() => {
      return;
    });
    if (failure instanceof PluginAssetFetchError) throw failure;
    throw new PluginAssetFetchError(
      `asset download failed: ${failure instanceof Error ? failure.message : String(failure)}`,
      "asset_transient",
    );
  }
  try {
    stream.verifyDigest();
  } catch (error) {
    await rm_2(filePath, {
      force: true,
    }).catch(() => {
      return;
    });
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4382943-4383113 placement
function createAssetStream(sha, timeoutMs, credentials) {
  let failure;
  let started = false;
  async function* chunks() {
    started = true;
    try {
      yield* downloadAssetWithDigest(
        await fetchPluginAsset(sha, timeoutMs, credentials),
        sha,
        timeoutMs,
        true,
      ).chunks;
    } catch (error) {
      failure = error;
      throw error;
    }
  }
  return {
    chunks: chunks(),
    failure: () => failure,
    started: () => started,
  };
}
//@ chunk-e6aww6q8.js:4383113-4384130 placement
/**
 * 把一个二进制资源放到目标位置，经存储接口失败时报错。
 */
async function placePluginBinaryAsset(cachePath, cacheDir, containedBinDir, name, sha, storageV5, namespace) {
  if (isStorageV5Enabled() && storageV5 !== undefined && namespace !== null && getPlatform() !== "windows") {
    let copyResult = await storageV5.copy(
      STORAGE_SPACES.pluginAssetCache(sha),
      pluginBinaryStorageSpace(namespace, name),
      {
        exactMode: 493,
        parent: "mustExist",
      },
    );
    if (!copyResult.ok) {
      let message = `placement through the storage interface failed: ${formatStorageError(copyResult.error)}`;
      let code =
        copyResult.error.code === "NotFound" ? "ENOENT" : errnoShapedCode(storageErrorCode(copyResult.error));
      if (code === undefined) throw new PluginAssetFetchError(message, "asset_place_failed");
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          message,
          "placement through the storage interface failed",
        ),
        {
          code,
        },
      );
    }
    return;
  }
  let targetPath = join(containedBinDir, name);
  let tempPath = join(cacheDir, `.place-${name}-${makePidRandomId()}`);
  try {
    await copyFile(cachePath, tempPath, constants.COPYFILE_EXCL);
    if (getPlatform() !== "windows") {
      let handle = await open(tempPath, readOnlyNoFollowFlags());
      try {
        await handle.chmod(493);
      } finally {
        await handle.close().catch(() => {
          return;
        });
      }
    }
    try {
      await renameReplacing(tempPath, targetPath);
      return;
    } catch (error) {
      if (getErrnoCode(error) !== "EXDEV") throw error;
      if (getPlatform() === "windows")
        throw new PluginAssetFetchError(
          "asset cache and plugin bin/ are on different volumes",
          "asset_place_exdev",
        );
    }
    let tempPath2 = join(containedBinDir, `.place-${name}-${makePidRandomId()}`);
    let placedCopy = false;
    try {
      await copyFile(tempPath, tempPath2, constants.COPYFILE_EXCL);
      await renameReplacing(tempPath2, targetPath);
      placedCopy = true;
    } finally {
      if (!placedCopy)
        await rm_2(tempPath2, {
          force: true,
        }).catch(() => {
          return;
        });
    }
  } finally {
    await rm_2(tempPath, {
      force: true,
    }).catch(() => {
      return;
    });
  }
}
//@ chunk-e6aww6q8.js:4384130-4384584 placement
/**
 * 用硬链接（或存储共享复制）把缓存资源放进 bin 并校验。
 */
async function linkAssetIntoBin(containedBinDir, sourceName, linkName, expectedSha, storageV5, namespace) {
  if (getPlatform() === "windows") return "failed_clean";
  let linkSource = join(containedBinDir, sourceName);
  let linkPath = join(containedBinDir, linkName);
  if (isStorageV5Enabled() && storageV5 !== undefined && namespace !== null) {
    let shared = await shareCopyAsset(storageV5, namespace, sourceName, linkName);
    if (shared !== "created") return shared;
    return (await verifyPlacedAsset(
      linkPath,
      expectedSha,
      {
        ensureMode: 493,
        guestWritable: true,
      },
      storageV5,
      pluginBinaryStorageSpace(namespace, linkName),
    )) === "match"
      ? "placed"
      : "failed_created";
  }
  try {
    await link(linkSource, linkPath);
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return "exists";
    return "failed_clean";
  }
  return (await verifyPlacedAsset(linkPath, expectedSha, {
    ensureMode: 493,
    guestWritable: true,
  })) === "match"
    ? "placed"
    : "failed_created";
}
//@ chunk-e6aww6q8.js:4384584-4385151 placement
/**
 * 存储层共享复制资源（ifAbsent），映射结果。
 */
async function shareCopyAsset(storageV5, namespace, sourceName, targetName) {
  let sourceSpace = pluginBinaryStorageSpace(namespace, sourceName);
  let copyResult = await storageV5.copy(sourceSpace, pluginBinaryStorageSpace(namespace, targetName), {
    precondition: {
      type: "ifAbsent",
    },
    parent: "mustExist",
    share: "require",
  });
  if (copyResult.ok) return copyResult.value.shared ? "created" : "failed_created";
  let error = copyResult.error;
  if (error.code === "AlreadyExists") return "exists";
  if (
    error.code === "Unavailable" &&
    (error.telemetryCode === LINKMISDIRECTED || error.telemetryCode === LINKUNVERIFIED)
  )
    return "failed_created";
  if (error.code !== "Failed" || error.key === undefined) return "failed_clean";
  let code = storageErrorCode(error);
  if (isSameStorageSpace(error.key, sourceSpace))
    return code === "ELOOP" || code === "ENXIO" ? "refused_source" : "failed_clean";
  return code === "ELOOP" || code === "EISDIR" || code === "ENXIO" ? "exists" : "failed_clean";
}
//@ chunk-e6aww6q8.js:4385151-4385310 placement
async function renameReplacing(tempPath, targetPath) {
  try {
    await rename(tempPath, targetPath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "EXDEV" || errnoCode === undefined) throw error;
    if (!ATOMIC_WRITE_ERRNOS.has(errnoCode)) throw error;
    await rm_2(targetPath, {
      force: true,
    });
    await rename(tempPath, targetPath);
  }
}
//@ chunk-e6aww6q8.js:4385310-4385619 placement (2.1.88 match: convertDirectoryToZipInPlace, 0.79)
/**
 * 清理目录中过期的临时文件（点文件与普通文件不同期限；存储后端模式走存储层）。
 */
async function sweepStaleTempFiles(dirPath, storageV5, namespace) {
  if (isStorageV5Enabled() && storageV5 !== undefined && namespace !== null)
    return sweepExpiredStorageEntries(dirPath, storageV5, namespace);
  let names;
  try {
    names = await readdir(dirPath);
  } catch {
    return;
  }
  let now = Date.now();
  for (let name of names) {
    let entryPath = join(dirPath, name);
    let stat = await lstat(entryPath).catch(() => null);
    if (!stat) continue;
    let ttlMs = name.startsWith(".") ? TEMP_FILE_TTL_MS : ASSET_CACHE_TTL_MS;
    if (now - stat.mtimeMs > ttlMs)
      await rm_2(entryPath, {
        recursive: true,
        force: true,
      }).catch(() => {
        return;
      });
  }
}
//@ chunk-e6aww6q8.js:4385619-4385888 placement
async function sweepExpiredStorageEntries(dirPath, storageV5, namespace) {
  let now = Date.now();
  let cursor;
  do {
    let page = await storageV5.listEntries(namespace, {
      cursor,
    });
    if (!page.ok) break;
    for (let item of page.value.items)
      if (item.kind === "key" && item.mtimeMs !== undefined && now - item.mtimeMs > ASSET_CACHE_TTL_MS)
        await storageV5.delete(item.key);
    cursor = page.value.cursor;
  } while (cursor);
  await convertDirectoryToZipInPlace_2(dirPath, (name) => name.startsWith("."));
}
//@ chunk-e6aww6q8.js:4385888-4386116 placement (2.1.88 match: convertDirectoryToZipInPlace, 0.79)
async function convertDirectoryToZipInPlace_2(dirPath, zipPath) {
  let names;
  try {
    names = await readdir(dirPath);
  } catch {
    return;
  }
  let now = Date.now();
  for (let name of names.filter(zipPath)) {
    let entryPath = join(dirPath, name);
    let stat = await lstat(entryPath).catch(() => null);
    if (stat && now - stat.mtimeMs > TEMP_FILE_TTL_MS)
      await rm_2(entryPath, {
        recursive: true,
        force: true,
      }).catch(() => {
        return;
      });
  }
}
//@ chunk-e6aww6q8.js:4386116-4386180 placement (2.1.88 match: generatePlaceholders, 0.792)
function makePidRandomId() {
  return `${process.pid}-${randomBytes(6).toString("hex")}`;
}
export { provisionBinaryAssets, shouldInstallBinaryAssets };
