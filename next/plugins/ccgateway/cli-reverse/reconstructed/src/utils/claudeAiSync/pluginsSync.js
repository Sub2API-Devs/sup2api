/**
 * utils/claudeAiSync/pluginsSync.ts
 *
 * 2.1.316 新增：claude.ai 插件同步轮次
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (65)
 * attribution: placement 65
 */
import { join, basename, relative, dirname } from "path";
import { lstat, rm as rm_2, rename, lutimes, readdir, rmdir } from "fs/promises";
import { monitorEventLoopDelay } from "perf_hooks";
import { getClaudeConfigDir } from "../envUtils.js";
import {
  SKILLS_SYNCED_STAGING,
  SYNCED_MANIFEST_FILE,
  PLUGINS_SYNC_DIR,
  TRASH_SUBDIR,
  syncedItemPath,
  syncedItemPathForGeneration,
  stripInvisibleChars as stripInvisibleChars_3,
  getSyncBucket,
  syncedItemPath_2,
  LegacyReservedSpellingError,
  stripGenerationSuffix,
  isSyncBucketName,
  isHiddenFoldName,
  MARKETPLACES_JSON_FILE,
  isClaudeAiMarketplaceFile,
} from "../plugins/syncedItems.js";
import {
  checkSyncOwnedRoot,
  readSyncMarker,
  checkSyncRoots,
  toPosixLabelPath,
  SyncOwnedRootRefusedError,
  touchExclusive,
  freshRootState,
  ROOT_REFUSED_RESULT,
  rootRefusedError,
  downloadFailure,
  extractFailure,
  isDirConflictErrno,
  buildLocalPlacementFailure,
  LOCAL_PLACEMENT_FAILURE,
  verifySyncRoot,
  hasSyncMarker,
} from "./syncOwnedRoot.js";
import { serializeCalls } from "../promiseQueue.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, stringSchema, numberSchema, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { pluginAvailabilitySchema, pluginOriginSchema } from "../plugins/marketplaceNames.js";
import { getErrnoCode, isENOENT } from "../errors.js";
import {
  readManifestText,
  parseManifestJson,
  parseValidRows,
  stringArray,
  omitKeys_2,
  mergeManifestRows,
  mergeStaleDirs,
  MAX_DEFERRED_RELIST_ROUNDS,
  planSyncDownloads,
  readReuseStamp,
  syncedPluginDirsKey,
  isPluginsSyncActive,
  isSkillsAsPluginsActive,
  checkReuseWindow,
  syncReuseWithinMs,
  scheduleDeferredRelist,
  mergeRowsByKey,
  takeReuseStamp,
  replaceRowsWithAttribution,
  writeOrClearReuseStamp,
  hasRemovalOwed,
  lastCompleteRoundPath,
  removeSyncedSkillDir,
} from "./skillsSync.js";
import { writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
import { jsonStringify } from "../slowOperations.js";
import {
  PLUGIN_META_SUFFIX,
  isServerPluginId,
  isAttributionNameValid,
  SERVER_PLUGIN_ID,
  MARKETPLACE_NAME,
  INSTALLATION_PREFERENCE,
  MARKETPLACE_KIND,
  MAX_ATTRIBUTION_FILE_BYTES,
  readPluginAttributionSidecar,
} from "../plugins/pluginAttribution.js";
import { readSmallFileOrNull } from "../readSmallFile.js";
import { limitConcurrency, createSemaphore } from "../concurrencyLimit.js";
import { isSameFileIdentity, createLiveEntryClassifier } from "../plugins/fileIdentity.js";
import { ALLOWED_OFFICIAL_MARKETPLACE_NAMES } from "../plugins/schemas.js";
import { makeTempZipPath, unzipPluginCache } from "../plugins/zipCache.js";
import {
  downloadWithRetry,
  pluginDownloadPath,
  listAccountPlugins,
  listErrorTelemetry,
  pluginListFingerprint,
} from "../../services/plugins/accountSync/listPlugins.js";
import { IN_USE_MARKER_FILE } from "../plugins/cacheUtils.js";
import {
  hasSyncedPluginLaneOpened,
  getAccountPluginsSyncEnabled,
  markSyncedPluginDirNewHere,
  setSyncedPluginDirs,
  getSyncedPluginReloadDebt,
  getSyncedPluginAttestation,
  isDiskless,
  getSyncedPluginDirs,
  hasRegisteredSyncedPluginDirs,
  isSyncedPluginDirLoadedHere,
} from "../../bootstrap/state.js";
import { sleep } from "../sleep.js";
import { SYNCED } from "../telemetry/pluginTelemetry.js";
import { startupTimingRecorderByHost } from "../startupTiming.js";
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import { isDatadogAllowed } from "../hostEnvironment.js";
import {
  enableAccountPluginsSync,
  syncSettingsEnabled,
  isPluginsSyncDenied,
  isPluginsSyncEligible,
  isNotFoundServerError,
  isSyncRefusal,
  removeDelistedSkillHooks,
  isAccountSyncDeniedHere,
  hasSyncEnv,
} from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isSessionRefsSyncEnabled } from "./sessionRefsGate.js";
import { sessionSkillManifestSlot } from "../../services/plugins/accountSync/sessionSkillManifest.js";
import { env } from "../env.js";
import { logEvent } from "../../services/analytics/index.js";
import { printableMessage } from "../printableName.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { tildify } from "../path.js";
import { isPluginVersionInUse } from "../plugins/inUseMarkers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:647465-647498 placement
/**
 * 同步插件的根目录（配置目录下的插件同步根）。
 */
function syncedPluginsRoot() {
  return join(getClaudeConfigDir(), SKILLS_SYNCED_STAGING);
}
//@ chunk-e6aww6q8.js:647498-647532 placement
/**
 * 某插件桶在同步根下的目录。
 */
function syncedPluginBucketDir(bucketId) {
  return join(syncedPluginsRoot(), bucketId);
}
//@ chunk-e6aww6q8.js:647532-647563 placement
/**
 * 某根目录下同步清单文件的路径。
 */
function syncedManifestPath(root) {
  return join(root, SYNCED_MANIFEST_FILE);
}
//@ chunk-e6aww6q8.js:647563-647597 placement
/**
 * 插件同步使用的回收区目录。
 */
function pluginsTrashRoot() {
  return join(getClaudeConfigDir(), PLUGINS_SYNC_DIR);
}
//@ chunk-e6aww6q8.js:647597-647710 placement
function checkPluginsSyncRoot(root) {
  return checkSyncOwnedRoot({
    root,
    trashRoot: pluginsTrashRoot(),
    configHome: getClaudeConfigDir(),
    events: {
      refused: "plugins_sync_root_refused",
    },
  });
}
//@ chunk-e6aww6q8.js:647710-647806 placement
/**
 * 插件同步轮开始前准备桶目录（隔离未标记目录、校验根、建标记）。
 */
function ensurePluginsBucketRoot(rootSession, bucket) {
  let pluginsSync = rootSession.pluginsSync;
  pluginsSync.ensureBucketRoot ??= serializeCalls(preparePluginsBucket);
  return pluginsSync.ensureBucketRoot(bucket);
}
//@ chunk-e6aww6q8.js:647806-648326 placement
/**
 * 插件同步轮开始前准备桶目录：未标记但存在的目录先隔离到回收区；校验同步根；标记文件不可读时拒绝；最后创建标记。
 */
async function preparePluginsBucket(bucketId) {
  let bucketDir = syncedPluginBucketDir(bucketId);
  let markerState = await readSyncMarker(syncedPluginsRoot(), bucketId);
  if (
    markerState === "unmarked" &&
    (await lstat(bucketDir).then(
      (stats) => stats.isDirectory(),
      () => false,
    )) &&
    (await checkSyncRoots({
      dir: bucketDir,
      trashRoot: pluginsTrashRoot(),
      configHome: getClaudeConfigDir(),
      failureEvent: "plugins_sync_trash_move_failed",
    }).catch(() => false))
  )
    logForDiagnosticsNoPII("info", "plugins_sync_unmarked_bucket_quarantined");
  await checkPluginsSyncRoot(bucketDir);
  if (typeof markerState === "object") {
    logForDiagnosticsNoPII("warn", "plugins_sync_root_refused", {
      phase: "round_head",
      root: toPosixLabelPath(join(SKILLS_SYNCED_STAGING, bucketId)),
      component: "marker",
      reason: "unverified",
      code: markerState.unreadable,
    });
    throw new SyncOwnedRootRefusedError("unverified", {
      code: markerState.unreadable,
    });
  }
  await touchExclusive(syncedPluginsRoot(), bucketId);
}
//@ chunk-e6aww6q8.js:648326-648875 placement
/**
 * 已同步插件清单行（ID、名称、版本、更新时间、市场信息、代数等）与清单文件的 schema。
 */
var syncedPluginRowSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var pluginsManifestSchema;
deferInit("chunk-e6aww6q8.js:648326", () => {
  syncedPluginRowSchema = DoctorLazy(() =>
    looseObject({
      pluginId: stringSchema(),
      name: stringSchema(),
      description: stringSchema().catch(""),
      version: stringSchema().nullable().catch(null),
      updatedAt: stringSchema().nullable().catch(null),
      requestedVersion: stringSchema().optional().catch(undefined),
      marketplaceName: stringSchema().optional().catch(undefined),
      installationPreference: pluginAvailabilitySchema().optional().catch(undefined),
      marketplaceKind: pluginOriginSchema().optional().catch(undefined),
      presentsAs: stringSchema().optional().catch(undefined),
      generation: numberSchema().int().min(2).optional().catch(undefined),
    }),
  );
  pluginsManifestSchema = DoctorLazy(() =>
    looseObject({
      lastUpdated: numberSchema().catch(0),
      plugins: unknown().optional(),
      staleDirs: unknown().optional(),
      appliedListIds: unknown().optional(),
    }),
  );
});
//@ chunk-e6aww6q8.js:648875-648984 placement
async function isManifestReadableOrAbsent(rootGuard) {
  if ((await readPluginsManifest(rootGuard)) !== null) return true;
  return lstat(syncedManifestPath(rootGuard.root)).then(
    () => false,
    (error) => getErrnoCode(error) === "ENOENT",
  );
}
//@ chunk-e6aww6q8.js:648984-649370 placement
/**
 * 读取插件同步清单（首次读取失败时记诊断），解析插件行、过期目录与已应用列表 ID。
 */
async function readPluginsManifest(guard) {
  let firstRead = !guard.manifestRead;
  guard.manifestRead = true;
  let manifestText = await readManifestText(
    syncedManifestPath(guard.root),
    firstRead ? "plugins_sync_manifest_unreadable" : null,
  );
  if (manifestText === null) return null;
  let manifestJson = parseManifestJson(
    manifestText,
    pluginsManifestSchema(),
    firstRead ? "plugins_sync_manifest_unreadable" : null,
  );
  if (manifestJson === null) return null;
  let { plugins, staleDirs, appliedListIds, ...rest } = manifestJson;
  return {
    ...rest,
    plugins: parseValidRows(syncedPluginRowSchema(), plugins),
    staleDirs: stringArray(staleDirs),
    ...(Array.isArray(appliedListIds) && {
      appliedListIds: stringArray(appliedListIds),
    }),
  };
}
//@ chunk-e6aww6q8.js:649370-649868 placement
/**
 * 写入插件同步清单：校验根，合并旧清单字段与新内容，按新顺序排列插件行，合并过期目录，可选沿用已应用列表 ID。
 */
async function writePluginsManifest(guard, manifest, options) {
  assertSyncRootAllowed(guard);
  await checkPluginsSyncRoot(guard.root);
  let pluginsManifest = await readPluginsManifest(guard);
  let validRows = parseValidRows(syncedPluginRowSchema(), manifest.plugins);
  let orderByPluginId = new Map(validRows.map((row, index) => [row.pluginId, index]));
  await writeFileAtomic_2(
    syncedManifestPath(guard.root),
    jsonStringify(
      {
        ...omitKeys_2(pluginsManifest, [
          "lastUpdated",
          "plugins",
          "staleDirs",
          "appliedListIds",
          "askedListIds",
        ]),
        ...(options.carryAppliedListIds && {
          appliedListIds: pluginsManifest?.appliedListIds,
        }),
        ...manifest,
        plugins: mergeManifestRows(
          validRows,
          pluginsManifest?.plugins,
          (row) => row.pluginId,
          options.removedPluginIds,
        ).toSorted(
          (leftRow, rightRow) =>
            (orderByPluginId.get(leftRow.pluginId) ?? validRows.length) -
            (orderByPluginId.get(rightRow.pluginId) ?? validRows.length),
        ),
        staleDirs: mergeStaleDirs(manifest.staleDirs, pluginsManifest?.staleDirs, options.staleDirs),
      },
      null,
      2,
    ),
  );
}
//@ chunk-e6aww6q8.js:649868-649921 placement
/**
 * 插件替换时按进程 pid 使用的临时目录。
 */
function pluginReplaceTmpDir(root) {
  return join(root, TRASH_SUBDIR, String(process.pid));
}
//@ chunk-e6aww6q8.js:649921-649954 placement
/**
 * 某同步插件项在桶里的目录路径。
 */
function syncedItemDir(root, itemName) {
  return syncedItemPath(itemName, root);
}
//@ chunk-e6aww6q8.js:649954-650008 placement
/**
 * 同步插件项的安装路径（按代数区分）。
 */
function itemInstallPath(root, item) {
  return syncedItemPathForGeneration(item.name, item.generation ?? 1, root);
}
//@ chunk-e6aww6q8.js:650008-650069 placement
/**
 * 同步插件项的目录名，取不到时退回插件原名。
 */
function itemDirName(root, item) {
  try {
    return basename(itemInstallPath(root, item));
  } catch {
    return item.name;
  }
}
//@ chunk-e6aww6q8.js:650069-650858 placement
async function writeSyncedPluginSidecar(root, row) {
  let { pluginId } = row;
  let sidecarPath;
  try {
    sidecarPath = itemInstallPath(root, row) + PLUGIN_META_SUFFIX;
  } catch {
    return;
  }
  try {
    let stats = await lstat(sidecarPath).catch(() => null);
    if (stats !== null && !stats.isFile())
      if (stats.isDirectory())
        await checkSyncRoots({
          dir: sidecarPath,
          trashRoot: pluginsTrashRoot(),
          configHome: getClaudeConfigDir(),
          failureEvent: "plugins_sync_trash_move_failed",
        });
      else
        await rm_2(sidecarPath, {
          force: true,
        });
    if (isServerPluginId(pluginId)) {
      let hasValidMarketplaceName =
        row.marketplaceName !== undefined && isAttributionNameValid(row.marketplaceName);
      if (row.marketplaceName !== undefined && !hasValidMarketplaceName)
        logForDiagnosticsNoPII("warn", "plugins_sync_sidecar_invalid_marketplace_name");
      let sidecarJson = jsonStringify({
        [SERVER_PLUGIN_ID]: pluginId,
        ...(hasValidMarketplaceName && {
          [MARKETPLACE_NAME]: row.marketplaceName,
        }),
        ...(row.installationPreference !== undefined && {
          [INSTALLATION_PREFERENCE]: row.installationPreference,
        }),
        ...(row.marketplaceKind !== undefined && {
          [MARKETPLACE_KIND]: row.marketplaceKind,
        }),
      });
      if ((await readSmallFileOrNull(sidecarPath, MAX_ATTRIBUTION_FILE_BYTES)) === sidecarJson) return;
      await writeFileAtomic_2(sidecarPath, sidecarJson);
    } else {
      logForDiagnosticsNoPII("warn", "plugins_sync_sidecar_invalid_id");
      await rm_2(sidecarPath, {
        force: true,
      });
    }
  } catch {
    logForDiagnosticsNoPII("warn", "plugins_sync_sidecar_write_failed");
  }
}
//@ chunk-e6aww6q8.js:650858-651091 placement
async function reconcilePluginSidecars(rootGuard, rows) {
  if (!(await rootGuard.guard.verify())) return;
  let rowsByInstallPath = new Map();
  for (let row of rows) {
    let installPath;
    try {
      installPath = itemInstallPath(rootGuard.root, row);
    } catch {
      continue;
    }
    let plainPath = stripInvisibleChars_3(installPath);
    if (!rowsByInstallPath.has(plainPath)) rowsByInstallPath.set(plainPath, row);
  }
  await Promise.all(
    Array.from(
      rowsByInstallPath.values(),
      limitConcurrency(MAX_DEFERRED_RELIST_ROUNDS, (row) => writeSyncedPluginSidecar(rootGuard.root, row)),
    ),
  );
}
//@ chunk-e6aww6q8.js:651091-651188 placement
/**
 * 判断两个同步插件项是否指向同一目录（含大小写不敏感比较）。
 */
async function sameSyncedItem(root, item, path) {
  try {
    let installPath = itemInstallPath(root, item);
    return basename(installPath) === basename(path) || (await isSameFileIdentity(installPath, path));
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:651188-651357 placement
function toSyncedPluginRow(plugin) {
  return {
    pluginId: plugin.id,
    name: plugin.directory || plugin.name || plugin.id,
    description: plugin.description,
    version: plugin.version || null,
    updatedAt: null,
    requestedVersion: plugin.version || undefined,
  };
}
//@ chunk-e6aww6q8.js:651357-651584 placement
function collectOfficialAttestations(entries) {
  let attestations = new Map();
  for (let entry of entries)
    if (
      entry.isOfficial === true &&
      entry.marketplaceName !== undefined &&
      ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(entry.marketplaceName)
    )
      attestations.set(entry.id, {
        attestation: {
          marketplace: entry.marketplaceName,
          pluginName: entry.name,
        },
        rowName: toSyncedPluginRow(entry).name,
      });
  return attestations;
}
//@ chunk-e6aww6q8.js:651584-651731 placement
function carryMarketplaceInfo(row, info) {
  return {
    ...row,
    marketplaceName: info.marketplaceName,
    installationPreference: info.installationPreference,
    marketplaceKind: info.marketplaceKind,
  };
}
//@ chunk-e6aww6q8.js:651731-651907 placement
function planPluginDownloads(root, listedRows, plugins) {
  return planSyncDownloads(listedRows, plugins, {
    idOf: (plugin) => plugin.pluginId,
    dirFor: (plugin) => syncedItemDir(root, plugin),
    invalidNameTag: "plugins_sync_invalid_name",
    collisionTag: "plugins_sync_name_collision",
    carry: carryMarketplaceInfo,
  });
}
//@ chunk-e6aww6q8.js:651907-651988 placement
/**
 * 同步插件项的唯一键（插件 id + 目录名）。
 */
function syncedItemKey(root, plugin) {
  try {
    return `${plugin.pluginId}/${stripInvisibleChars_3(syncedItemDir(root, plugin.name))}`;
  } catch {
    return "";
  }
}
//@ chunk-e6aww6q8.js:651988-652035 placement
/**
 * 复用标记落盘的子目录名（converted-skills）。
 */
function reuseStampVariant(convertedSkills) {
  return convertedSkills ? "converted-skills" : "";
}
//@ chunk-e6aww6q8.js:652035-652110 placement
/**
 * 已应用清单 id 的附加字段构造。
 */
function appliedListIdsField(convertedSkills, listed, rows) {
  return convertedSkills && listed
    ? {
        appliedListIds: rows.map((row) => row.pluginId),
      }
    : {};
}
//@ chunk-e6aww6q8.js:652110-652240 placement
function sameIdSet(appliedListIds, otherIds) {
  if (appliedListIds === undefined || otherIds === undefined) return appliedListIds === otherIds;
  let otherSet = new Set(otherIds);
  return new Set(appliedListIds).size === otherSet.size && appliedListIds.every((id) => otherSet.has(id));
}
//@ chunk-e6aww6q8.js:652240-652323 placement
/**
 * 复用标记里是否列出了该变体。
 */
async function isReuseStampListed(root, convertedSkills) {
  return (
    ((await readReuseStamp(root))?.listedFor.includes(reuseStampVariant(true)) === true) === convertedSkills
  );
}
//@ chunk-e6aww6q8.js:652323-652425 placement
function createPluginsRootGuard(root) {
  return freshRootState({
    root: () => root,
    configHome: getClaudeConfigDir,
    rootLabel: SKILLS_SYNCED_STAGING,
    event: "plugins_sync_root_refused",
  });
}
//@ chunk-e6aww6q8.js:652425-652486 placement
/**
 * 校验同步根守卫，失败时返回拒绝结果。
 */
async function verifyGuardOrRefused(pluginsRootGuard) {
  return (await pluginsRootGuard.guard.verify()) ? null : ROOT_REFUSED_RESULT;
}
//@ chunk-e6aww6q8.js:652486-652556 placement
/**
 * 同步根被拒时抛出错误。
 */
function assertSyncRootAllowed(rootGuard) {
  let refusedReason = rootGuard.guard.refusedReason();
  if (refusedReason !== null) throw rootRefusedError(refusedReason);
}
//@ chunk-e6aww6q8.js:652556-652749 placement
function getDownloadSizeTelemetry(stats) {
  return stats.zipBytes === 0
    ? {}
    : {
        approx_downloaded_bytes: Number(stats.zipBytes.toPrecision(2)),
        approx_downloaded_bytes_anthropic_catalog: Number(stats.anthropicCatalogZipBytes.toPrecision(2)),
      };
}
//@ chunk-e6aww6q8.js:652749-652760 placement
/**
 * 把同步插件提升为正式安装时的最多尝试次数（16）。
 */
var MAX_PROMOTE_ATTEMPTS = 16;
//@ chunk-e6aww6q8.js:652760-655170 placement
/**
 * 把下载好的同步插件提升为正式安装，处理占位目录冲突。
 */
async function promoteSyncedPlugin(pluginsSync, pluginsRootGuard, item, prev, stats, credentials, semaphore) {
  let root = pluginsRootGuard.root;
  let liveDir = syncedItemDir(root, item.name);
  let replaceDir = join(pluginReplaceTmpDir(root), relative(root, liveDir));
  let zipPath = makeTempZipPath();
  let releaseSemaphore;
  try {
    if (pluginsRootGuard.guard.refused()) return ROOT_REFUSED_RESULT;
    let now = Date.now();
    let downloadResult = await downloadWithRetry(item.pluginId, zipPath, item.requestedVersion, {
      isBackground: true,
      credentials,
    });
    stats.downloadMs.push(Date.now() - now);
    if (!downloadResult.ok) return downloadFailure(downloadResult.reason);
    let size = (await lstat(zipPath).catch(() => null))?.size ?? 0;
    stats.zipBytes += size;
    if (item.marketplaceKind === "anthropic_catalog") stats.anthropicCatalogZipBytes += size;
    releaseSemaphore = await semaphore.acquire();
    let guardResult = await verifyGuardOrRefused(pluginsRootGuard);
    if (guardResult !== null) return guardResult;
    let now_2 = Date.now();
    try {
      let unzipResult = await unzipPluginCache(zipPath, replaceDir);
      if (!unzipResult.ok) return extractFailure("extracted tree carries a bare-repo layout");
      let root_2 = unzipResult.root;
      let guardResult = await verifyGuardOrRefused(pluginsRootGuard);
      if (guardResult !== null) return guardResult;
      await rm_2(join(root_2, IN_USE_MARKER_FILE), {
        recursive: true,
        force: true,
      });
      let laneOpened = hasSyncedPluginLaneOpened();
      if (laneOpened || (await isPluginDirInUse(liveDir))) {
        let skipGeneration =
          prev !== undefined && prev.name === item.name ? (prev.generation ?? 1) : undefined;
        let attempts = 0;
        for (let idx = 1; attempts < MAX_PROMOTE_ATTEMPTS; idx++) {
          if (idx === skipGeneration) continue;
          attempts++;
          try {
            await rename(root_2, syncedItemPathForGeneration(item.name, idx, root));
            return {
              ok: true,
              generation: idx,
            };
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (!isDirConflictErrno(errnoCode)) {
              logForDiagnosticsNoPII("warn", "plugins_sync_promotion_failed", {
                code: errnoCode ?? "unknown",
                restored: false,
              });
              return buildLocalPlacementFailure(errnoCode);
            }
          }
        }
        if (laneOpened) {
          logForDiagnosticsNoPII("warn", "plugins_sync_occupant_displace_failed", {
            code: "generations_occupied",
          });
          return LOCAL_PLACEMENT_FAILURE;
        }
        logForDiagnosticsNoPII("warn", "plugins_sync_held_copy_displaced");
      }
      try {
        await rename(root_2, liveDir);
        return {
          ok: true,
          generation: 1,
        };
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (!isDirConflictErrno(errnoCode)) {
          logForDiagnosticsNoPII("warn", "plugins_sync_promotion_failed", {
            code: errnoCode ?? "unknown",
            restored: false,
          });
          return buildLocalPlacementFailure(errnoCode);
        }
      }
      let alreadySame = prev !== undefined && (await sameSyncedItem(root, prev, liveDir));
      if (!alreadySame) {
        for (let manifestPlugin of (await readPluginsManifest(pluginsRootGuard))?.plugins ?? [])
          if (
            manifestPlugin.pluginId === item.pluginId &&
            (await sameSyncedItem(root, manifestPlugin, liveDir))
          ) {
            alreadySame = true;
            break;
          }
      }
      let oldCopyPath;
      if (alreadySame) {
        oldCopyPath = join(
          pluginReplaceTmpDir(root),
          `.replaced-${process.pid}-${Math.random().toString(36).slice(2)}`,
        );
        try {
          await rename(liveDir, oldCopyPath);
        } catch (error) {
          logForDiagnosticsNoPII("warn", "plugins_sync_occupant_displace_failed", {
            code: getErrnoCode(error) ?? "unknown",
          });
          return LOCAL_PLACEMENT_FAILURE;
        }
      } else if (
        !(await checkSyncRoots({
          dir: liveDir,
          trashRoot: pluginsTrashRoot(),
          configHome: getClaudeConfigDir(),
          failureEvent: "plugins_sync_trash_move_failed",
        }))
      )
        return LOCAL_PLACEMENT_FAILURE;
      try {
        await rename(root_2, liveDir);
      } catch (error) {
        let restored =
          oldCopyPath === undefined
            ? false
            : await rename(oldCopyPath, liveDir).then(
                () => true,
                () => false,
              );
        logForDiagnosticsNoPII("warn", "plugins_sync_promotion_failed", {
          code: getErrnoCode(error) ?? "unknown",
          restored,
        });
        return buildLocalPlacementFailure(getErrnoCode(error));
      }
      if (oldCopyPath !== undefined)
        pluginsSync.pendingTrashRemovals.push(
          rm_2(oldCopyPath, {
            recursive: true,
            force: true,
          }).catch(() => {}),
        );
      return {
        ok: true,
        generation: 1,
      };
    } finally {
      stats.extractMs.push(Date.now() - now_2);
    }
  } finally {
    releaseSemaphore?.();
    await rm_2(zipPath, {
      force: true,
    }).catch(() => {});
    if (
      !pluginsRootGuard.guard.refused() &&
      (await verifySyncRoot(
        root,
        getClaudeConfigDir(),
        {
          event: "plugins_sync_root_refused",
          phase: "sweep",
          rootLabel: SKILLS_SYNCED_STAGING,
        },
        {
          checkStagingLeaf: true,
        },
      ).catch(() => null)) === "real"
    )
      await rm_2(replaceDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:655170-655182 placement
/**
 * 提升失败后的重试间隔（500 毫秒）。
 */
var PROMOTE_RETRY_SLEEP_MS = 500;
//@ chunk-e6aww6q8.js:655182-655337 placement
async function promotePluginWithRetry(
  pluginsSync,
  pluginsRootGuard,
  item,
  prev,
  stats,
  credentials,
  semaphore,
) {
  try {
    return await promoteSyncedPlugin(
      pluginsSync,
      pluginsRootGuard,
      item,
      prev,
      stats,
      credentials,
      semaphore,
    );
  } catch {
    logForDiagnosticsNoPII("warn", "plugins_sync_extract_retry");
    await sleep(PROMOTE_RETRY_SLEEP_MS);
    return promoteSyncedPlugin(pluginsSync, pluginsRootGuard, item, prev, stats, credentials, semaphore);
  }
}
//@ chunk-e6aww6q8.js:655337-655542 placement
function recordSyncError_2(pluginsSync, item, errorType, reason) {
  let source = `${item.name}@${SYNCED}`;
  pluginsSync.syncErrors.push(
    errorType === "network-error"
      ? {
          type: errorType,
          source,
          plugin: item.name,
          url: pluginDownloadPath(item.pluginId, item.requestedVersion),
          details: reason,
        }
      : {
          type: errorType,
          source,
          plugin: item.name,
          error: reason,
        },
  );
}
//@ chunk-e6aww6q8.js:655542-655615 placement
/**
 * 记录一轮插件同步的结论（仅 datadog 遥测允许时）。
 */
function recordPluginsSyncRound(host, outcome) {
  startupTimingRecorderByHost
    .of(host.host)
    .markPluginsSyncRound(outcome, () => isRemoteManagedEnvironment() && isDatadogAllowed());
}
//@ chunk-e6aww6q8.js:655615-666154 placement
/**
 * 执行一轮 claude.ai 插件同步：拉取目录、安装/更新/移除并记录遥测。
 */
async function runPluginsSyncRound(session, credentials, { startup = false } = {}) {
  let pluginsSync = session.pluginsSync;
  let now = Date.now();
  pluginsSync.syncErrors = [];
  pluginsSync.accountListing = "pending";
  pluginsSync.lastRoundListed = false;
  pluginsSync.listedStamp = null;
  let dirsKeyBefore = syncedPluginDirsKey();
  let loopDelay;
  try {
    loopDelay = monitorEventLoopDelay({
      resolution: 20,
    });
    loopDelay.enable();
  } catch {}
  let loopLagTelemetry = () => {
    if (!loopDelay) return {};
    loopDelay.disable();
    return {
      loop_lag_p95_ms: Math.round(loopDelay.percentile(95) / 1e6),
      loop_lag_max_ms: Math.round(loopDelay.max / 1e6),
    };
  };
  let listMs;
  let stats = {
    downloadMs: [],
    extractMs: [],
    zipBytes: 0,
    anthropicCatalogZipBytes: 0,
  };
  let bucketRootReady = false;
  let pluginsRootGuard = null;
  let dirsRegistered = false;
  let accountOptIn = false;
  let convertedSkillsAsked = false;
  let changesLanded = false;
  let baseTelemetry = () => ({
    account_opt_in: accountOptIn,
    duration_ms: Date.now() - now,
    ...getDownloadSizeTelemetry(stats),
    ...(convertedSkillsAsked && {
      converted_skills_asked: true,
    }),
  });
  let outcome = "end_not_recorded";
  if (startup) recordPluginsSyncRound(session, "still_running");
  try {
    accountOptIn = getAccountPluginsSyncEnabled();
    if (enableAccountPluginsSync()) accountOptIn = true;
    if (!isPluginsSyncActive(session) || !syncSettingsEnabled()) {
      logForDiagnosticsNoPII("info", "plugins_sync_gate_closed");
      logFeatureSad("plugins_sync_round", "gate_closed", baseTelemetry());
      outcome = "gate_closed";
      if (!isPluginsSyncDenied()) session.pluginsSync.accountListing = "refused";
      return false;
    }
    if (isPluginsSyncEligible()) {
      logForDiagnosticsNoPII("info", "plugins_sync_policy_verdict_pending");
      logFeatureSad("plugins_sync_round", "policy_verdict_pending", baseTelemetry());
      outcome = "policy_verdict_pending";
      return false;
    }
    let syncBucket = await getSyncBucket(credentials);
    if (syncBucket === null) {
      logForDiagnosticsNoPII("info", "plugins_sync_bucket_unresolved");
      logFeatureSad("plugins_sync_round", "bucket_unresolved", baseTelemetry());
      outcome = "bucket_unresolved";
      return false;
    }
    let pluginsRootGuard_2 = createPluginsRootGuard(syncedPluginBucketDir(syncBucket));
    pluginsRootGuard = pluginsRootGuard_2;
    let root = pluginsRootGuard_2.root;
    logForDiagnosticsNoPII("info", "plugins_sync_starting");
    await ensurePluginsBucketRoot(session, syncBucket);
    bucketRootReady = true;
    let skillsAsPlugins = isSkillsAsPluginsActive(session);
    if (startup && !isSessionRefsSyncEnabled(session)) {
      let reuseWindow = await checkReuseWindow(root, syncReuseWithinMs());
      if (
        reuseWindow.reuse &&
        (await isManifestReadableOrAbsent(pluginsRootGuard_2)) &&
        (await isReuseStampListed(root, skillsAsPlugins))
      ) {
        logForDiagnosticsNoPII("info", "plugins_sync_round_reused", {
          age_ms: reuseWindow.ageMs,
          within_ms: reuseWindow.withinMs,
        });
        await registerSyncedPluginDirs(pluginsRootGuard_2, {
          reconcileSidecars: true,
        });
        scheduleDeferredRelist(session, credentials);
        logFeatureOk("plugins_sync_round", {
          ...baseTelemetry(),
          reused: true,
        });
        outcome = "ok_reused";
        session.pluginsSync.accountListing = "listed";
        return false;
      }
    }
    let skillsAsPluginsOption = skillsAsPlugins && {
      convertedSkillsAsPlugins: true,
    };
    let now_2 = Date.now();
    let listResult;
    let sessionRows = [];
    let attestations = new Map();
    if (isSessionRefsSyncEnabled(session)) {
      let sessionEntries = sessionSkillManifestSlot.of(session).listEntries("plugins", {
        startup,
      });
      let accountSyncEnabled = env.CLAUDE_CODE_SYNC_PLUGINS || getAccountPluginsSyncEnabled();
      convertedSkillsAsked = skillsAsPlugins && accountSyncEnabled;
      let [sessionList, accountList] = await Promise.all([
        sessionEntries,
        accountSyncEnabled
          ? listAccountPlugins({
              isBackground: true,
              credentials,
              ...skillsAsPluginsOption,
            })
          : null,
      ]);
      if (!sessionList.success) listResult = sessionList;
      else {
        attestations = collectOfficialAttestations(sessionList.entries);
        sessionRows = sessionList.entries.map(toSyncedPluginRow);
        if (accountList === null)
          listResult = {
            success: true,
            plugins: sessionRows,
          };
        else if (!accountList.success) listResult = accountList;
        else
          listResult = {
            success: true,
            plugins: mergeRowsByKey(
              sessionRows,
              accountList.plugins,
              (row) => row.pluginId,
              carryMarketplaceInfo,
            ),
            ...(accountList.degraded && {
              degraded: accountList.degraded,
            }),
          };
      }
    } else {
      convertedSkillsAsked = skillsAsPlugins;
      listResult = await listAccountPlugins({
        isBackground: true,
        credentials,
        ...skillsAsPluginsOption,
      });
    }
    listMs = Date.now() - now_2;
    let notEntitled = !listResult.success && isNotFoundServerError(listResult);
    if (notEntitled) {
      logForDiagnosticsNoPII("warn", "plugins_sync_list_refused", {
        list_ms: listMs,
      });
      listResult = {
        success: true,
        plugins: sessionRows,
      };
    }
    if (listResult.success && listResult.degraded)
      logForDiagnosticsNoPII("warn", "plugins_sync_list_degraded", {
        list_ms: listMs,
      });
    if (!listResult.success) {
      if (isSyncRefusal(listResult)) session.pluginsSync.accountListing = "refused";
      let loopLag = loopLagTelemetry();
      let listErrorFacts = listErrorTelemetry(listResult);
      logForDiagnosticsNoPII("warn", "plugins_sync_list_failed", {
        duration_ms: Date.now() - now,
        list_ms: listMs,
        ...loopLag,
        ...listErrorFacts,
      });
      logEvent("tengu_plugins_sync_list_failed", {
        duration_ms: Date.now() - now,
        list_ms: listMs,
        ...loopLag,
        ...listErrorFacts,
      });
      logFeatureBad("plugins_sync_round", "list_failed", {
        ...baseTelemetry(),
        ...listErrorFacts,
      });
      outcome = "list_failed";
      await registerSyncedPluginDirs(pluginsRootGuard_2, {
        reconcileSidecars: true,
      });
      return false;
    }
    await takeReuseStamp(root);
    let listFingerprint =
      listResult.degraded || isSessionRefsSyncEnabled(session)
        ? null
        : pluginListFingerprint(listResult.plugins);
    let pluginsManifest = await readPluginsManifest(pluginsRootGuard_2);
    let hadManifest = pluginsManifest !== null;
    let plugins = listResult.plugins;
    if (listResult.degraded) {
      let listedIds = new Set(listResult.plugins.map((plugin) => plugin.pluginId));
      plugins = [
        ...listResult.plugins,
        ...(pluginsManifest?.plugins ?? []).filter(
          (manifestPlugin) =>
            !listedIds.has(manifestPlugin.pluginId) && manifestPlugin.requestedVersion === undefined,
        ),
      ];
    }
    if (convertedSkillsAsked) {
      let keptDirs = new Set(
        [...sessionRows, ...(pluginsManifest?.plugins ?? [])]
          .map((dirRow) => syncedItemKey(root, dirRow))
          .filter(Boolean),
      );
      let keptIds = new Set(plugins.filter((plugin) => keptDirs.has(syncedItemKey(root, plugin))));
      plugins = [...keptIds, ...plugins.filter((plugin) => !keptIds.has(plugin))];
    }
    let sessionPluginIds = new Set(sessionRows.map((row) => row.pluginId));
    let requiredIds = new Set(
      listResult.plugins
        .filter((plugin) => plugin.installationPreference === "required")
        .map((plugin) => plugin.pluginId),
    );
    plugins = [
      ...plugins.filter((plugin) => sessionPluginIds.has(plugin.pluginId)),
      ...plugins.filter(
        (plugin) => !sessionPluginIds.has(plugin.pluginId) && requiredIds.has(plugin.pluginId),
      ),
      ...plugins.filter(
        (plugin) => !sessionPluginIds.has(plugin.pluginId) && !requiredIds.has(plugin.pluginId),
      ),
    ];
    let { toDownload, toRemove, carryover, carryoverOwningLiveDir } = planPluginDownloads(
      root,
      plugins,
      pluginsManifest?.plugins ?? [],
    );
    let replacedIds = new Set();
    let serverPluginIds = new Map();
    let results = await Promise.all(
      carryover.map(async (prevItem) => {
        if (!carryoverOwningLiveDir.has(prevItem.pluginId)) return false;
        try {
          let installPath = itemInstallPath(root, prevItem);
          if (!(await lstat(installPath)).isDirectory()) return true;
          let { serverPluginId } = await readPluginAttributionSidecar(installPath);
          if (serverPluginId === undefined || serverPluginId === prevItem.pluginId) return false;
          serverPluginIds.set(prevItem.pluginId, serverPluginId);
          return true;
        } catch {
          return true;
        }
      }),
    );
    for (let [index, prevItem] of carryover.entries()) {
      if (!results[index]) continue;
      let found = listResult.plugins.find((plugin) => plugin.pluginId === prevItem.pluginId);
      if (found) {
        replacedIds.add(prevItem.pluginId);
        toDownload.push({
          item: found,
          prev: prevItem,
        });
      }
    }
    let rows = carryover.filter((prevItem) => !replacedIds.has(prevItem.pluginId));
    let rows_2 = rows.filter((livePrevItem) => carryoverOwningLiveDir.has(livePrevItem.pluginId));
    let liveEntryClassifier = createLiveEntryClassifier(
      new Set(manifestRowDirs(root, [...rows_2, ...toDownload.map(({ item, prev }) => prev ?? item)])),
    );
    let rowDirNames = getRowDirNames(root, plugins);
    await Promise.all(pluginsSync.pendingTrashRemovals.splice(0));
    if ((await verifyGuardOrRefused(pluginsRootGuard_2)) === null)
      await rm_2(pluginReplaceTmpDir(root), {
        recursive: true,
        force: true,
      }).catch(() => {});
    let staleDirs = new Set(pluginsManifest?.staleDirs ?? []);
    let removedDirs = await removeStaleDirs(
      root,
      Array.from(staleDirs).filter((dirName) => !pluginsSync.removalsDeferredHere.has(dirName)),
      liveEntryClassifier,
      rowDirNames,
    );
    for (let removedDir of removedDirs) staleDirs.delete(removedDir);
    if (toDownload.length === 0 && toRemove.length === 0) {
      assertSyncRootAllowed(pluginsRootGuard_2);
      await reconcilePluginSidecars(pluginsRootGuard_2, rows);
      assertSyncRootAllowed(pluginsRootGuard_2);
      registerDirsWithAttestations(root, rows_2, attestations);
      dirsRegistered = true;
      pluginsSync.lastRoundListed = !listResult.degraded;
      recordCompleteList(pluginsSync, syncBucket, root, listResult);
      let replacedRows = replaceRowsWithAttribution(
        pluginsManifest?.plugins ?? [],
        carryover,
        (row) => row.pluginId,
        (leftRow, rightRow) =>
          leftRow.marketplaceName === rightRow.marketplaceName &&
          leftRow.installationPreference === rightRow.installationPreference &&
          leftRow.marketplaceKind === rightRow.marketplaceKind,
      );
      let fullListApplied = !notEntitled && !listResult.degraded && !isSessionRefsSyncEnabled(session);
      let canReuse = fullListApplied && staleDirs.size === 0;
      let appliedIdsField = appliedListIdsField(
        skillsAsPlugins && listResult.convertedSkillsAsPlugins === true,
        fullListApplied,
        replacedRows.rows,
      );
      if (
        (removedDirs.size > 0 ||
          replacedRows.attributionMoved ||
          (skillsAsPlugins && !sameIdSet(pluginsManifest?.appliedListIds, appliedIdsField.appliedListIds))) &&
        pluginsManifest
      )
        await writePluginsManifest(
          pluginsRootGuard_2,
          {
            lastUpdated: pluginsManifest.lastUpdated,
            plugins: replacedRows.rows,
            staleDirs: staleDirs.size > 0 ? Array.from(staleDirs) : undefined,
            ...appliedIdsField,
          },
          {
            staleDirs: removedDirs,
            removedPluginIds: new Set(),
          },
        );
      await trashOrphanSyncedPluginDirs(pluginsRootGuard_2, plugins, pluginsSync.removalsDeferredHere);
      await trashStrayPluginBuckets();
      if (pluginsManifest) {
        let date = new Date();
        await lutimes(syncedManifestPath(root), date, date).catch(() => {});
      }
      await writeOrClearReuseStamp(root, "plugins", canReuse, null, reuseStampVariant(skillsAsPlugins));
      logForDiagnosticsNoPII("info", "plugins_sync_no_changes", {
        count: carryover.length,
        duration_ms: Date.now() - now,
        list_ms: listMs,
        had_manifest: hadManifest,
        ...loopLagTelemetry(),
      });
      if (notEntitled) {
        logFeatureSad("plugins_sync_round", "not_entitled", baseTelemetry());
        outcome = "not_entitled";
      } else if (listResult.degraded) {
        logFeatureSad("plugins_sync_round", "list_degraded", baseTelemetry());
        outcome = "list_degraded";
      } else {
        logFeatureOk("plugins_sync_round", baseTelemetry());
        outcome = "ok";
      }
      session.pluginsSync.accountListing = notEntitled
        ? "refused"
        : listResult.degraded
          ? "pending"
          : "listed";
      pluginsSync.listedStamp = hasRemovalOwed(pluginsSync) ? null : listFingerprint;
      return false;
    }
    let classifyLive = createLiveEntryClassifier(
      new Set(manifestRowDirs(root, [...rows_2, ...toDownload.map(({ item }) => item)])),
    );
    let deferredRemovals = 0;
    let removeIfSafe = (dirName, { oldCopy, heldTarget }) => {
      if (hasSyncedPluginLaneOpened()) {
        deferredRemovals++;
        pluginsSync.removalsDeferredHere.add(dirName);
        return Promise.resolve(false);
      }
      if (dirName === heldTarget) return Promise.resolve(false);
      return removeSyncedPluginDir(root, dirName, classifyLive, oldCopy ? rowDirNames : undefined);
    };
    let downloadedItems = [];
    let droppedItems = [];
    let removedPluginIds = new Set();
    let now_3 = Date.now();
    let downloadConcurrency = env.CLAUDE_CODE_SYNC_PLUGINS_DOWNLOAD_CONCURRENCY ?? MAX_DEFERRED_RELIST_ROUNDS;
    let semaphore = createSemaphore(MAX_DEFERRED_RELIST_ROUNDS);
    await Promise.all(
      toDownload.map(
        limitConcurrency(downloadConcurrency, async ({ item, prev }) => {
          let promoteResult;
          try {
            promoteResult = await promotePluginWithRetry(
              pluginsSync,
              pluginsRootGuard_2,
              item,
              prev,
              stats,
              credentials,
              semaphore,
            );
            if (!promoteResult.ok)
              switch (promoteResult.cause) {
                case "download":
                  logForDiagnosticsNoPII("warn", "plugins_sync_download_failed");
                  recordSyncError_2(pluginsSync, item, "network-error", promoteResult.reason);
                  break;
                case "root_refused":
                case "extract":
                  recordSyncError_2(pluginsSync, item, "generic-error", promoteResult.reason);
                  break;
                case "local":
                  recordSyncError_2(pluginsSync, item, "generic-error", promoteResult.reason);
                  break;
                case "deferred":
                  logForDiagnosticsNoPII("warn", "plugins_sync_unexpected_landing_cause");
                  recordSyncError_2(pluginsSync, item, "generic-error", promoteResult.reason);
                  break;
              }
          } catch (error) {
            let reason = printableMessage(error);
            promoteResult = extractFailure(reason);
            logForDiagnosticsNoPII("warn", "plugins_sync_extract_failed");
            recordSyncError_2(pluginsSync, item, "generic-error", reason);
          }
          if (promoteResult.ok) {
            let finalItem =
              promoteResult.generation > 1
                ? {
                    ...item,
                    generation: promoteResult.generation,
                  }
                : item;
            downloadedItems.push(finalItem);
            if (!prev) markSyncedPluginDirNewHere(itemInstallPath(root, finalItem));
            if (prev) {
              let prevDirName = itemDirName(root, prev);
              if (
                prevDirName !== itemDirName(root, finalItem) &&
                !(await removeIfSafe(prevDirName, {
                  oldCopy: true,
                  heldTarget:
                    promoteResult.generation > 1
                      ? itemDirName(root, {
                          name: item.name,
                        })
                      : undefined,
                }))
              )
                staleDirs.add(prevDirName);
            }
          } else if (prev && serverPluginIds.has(prev.pluginId)) {
            let serverKey = syncedItemKey(root, {
              ...prev,
              pluginId: serverPluginIds.get(prev.pluginId) ?? "",
            });
            if (!plugins.some((plugin) => syncedItemKey(root, plugin) === serverKey))
              removedPluginIds.add(prev.pluginId);
          } else if (prev) droppedItems.push(prev);
        }),
      ),
    );
    let downloadExtractMs = Date.now() - now_3;
    let downloadTimingTelemetry = getDownloadTimingTelemetry(stats);
    await Promise.all(
      toRemove.map(
        limitConcurrency(MAX_DEFERRED_RELIST_ROUNDS, async (item) => {
          let dirName = itemDirName(root, item);
          if (
            !(await removeIfSafe(dirName, {
              oldCopy: false,
            }))
          )
            staleDirs.add(dirName);
        }),
      ),
    );
    if (deferredRemovals > 0)
      logForDiagnosticsNoPII("info", "plugins_sync_removal_deferred_loaded", {
        count: deferredRemovals,
      });
    changesLanded = downloadedItems.length > 0 || toRemove.length > 0;
    let finalRows = [...downloadedItems, ...droppedItems, ...rows];
    assertSyncRootAllowed(pluginsRootGuard_2);
    await reconcilePluginSidecars(pluginsRootGuard_2, finalRows);
    assertSyncRootAllowed(pluginsRootGuard_2);
    registerDirsWithAttestations(root, finalRows, attestations, new Set(downloadedItems));
    dirsRegistered = true;
    pluginsSync.lastRoundListed = !listResult.degraded;
    recordCompleteList(pluginsSync, syncBucket, root, listResult);
    let fullListApplied = !notEntitled && !listResult.degraded && !isSessionRefsSyncEnabled(session);
    let canReuse = fullListApplied && pluginsSync.syncErrors.length === 0 && staleDirs.size === 0;
    await writePluginsManifest(
      pluginsRootGuard_2,
      {
        lastUpdated: Date.now(),
        plugins: finalRows,
        staleDirs: staleDirs.size > 0 ? Array.from(staleDirs) : undefined,
        ...appliedListIdsField(
          skillsAsPlugins && listResult.convertedSkillsAsPlugins === true,
          fullListApplied && pluginsSync.syncErrors.length === 0,
          finalRows,
        ),
      },
      {
        staleDirs: removedDirs,
        removedPluginIds: new Set([...toRemove.map((item) => item.pluginId), ...removedPluginIds]),
      },
    );
    await trashOrphanSyncedPluginDirs(pluginsRootGuard_2, plugins, pluginsSync.removalsDeferredHere);
    await trashStrayPluginBuckets();
    let loopLag = loopLagTelemetry();
    logForDiagnosticsNoPII("info", "plugins_sync_complete", {
      downloaded: downloadedItems.length,
      removed: toRemove.length,
      failed: pluginsSync.syncErrors.length,
      duration_ms: Date.now() - now,
      list_ms: listMs,
      download_extract_ms: downloadExtractMs,
      download_concurrency: downloadConcurrency,
      had_manifest: hadManifest,
      ...downloadTimingTelemetry,
      ...loopLag,
    });
    logEvent("tengu_plugins_sync_success", {
      downloaded: downloadedItems.length,
      removed: toRemove.length,
      total: listResult.plugins.length,
      duration_ms: Date.now() - now,
      list_ms: listMs,
      download_extract_ms: downloadExtractMs,
      download_concurrency: downloadConcurrency,
      had_manifest: hadManifest,
      ...downloadTimingTelemetry,
      ...loopLag,
    });
    await writeOrClearReuseStamp(root, "plugins", canReuse, null, reuseStampVariant(skillsAsPlugins));
    if (pluginsSync.syncErrors.length > 0) {
      logFeatureSad("plugins_sync_round", "download_failed", baseTelemetry());
      outcome = "download_failed";
    } else if (notEntitled) {
      logFeatureSad("plugins_sync_round", "not_entitled", baseTelemetry());
      outcome = "not_entitled";
    } else if (listResult.degraded) {
      logFeatureSad("plugins_sync_round", "list_degraded", baseTelemetry());
      outcome = "list_degraded";
    } else {
      logFeatureOk("plugins_sync_round", baseTelemetry());
      outcome = "ok";
    }
    session.pluginsSync.accountListing = notEntitled ? "refused" : listResult.degraded ? "pending" : "listed";
    let listedCleanly = pluginsSync.syncErrors.length === 0 && !hasRemovalOwed(pluginsSync);
    pluginsSync.listedStamp = listedCleanly ? listFingerprint : null;
  } catch (error) {
    let loopLag = loopLagTelemetry();
    let timingFacts = {
      ...(listMs !== undefined && {
        list_ms: listMs,
      }),
      ...(stats.downloadMs.length > 0 && getDownloadTimingTelemetry(stats)),
    };
    if (!(error instanceof SyncOwnedRootRefusedError)) {
      logForDiagnosticsNoPII("error", "plugins_sync_unexpected_error", {
        kind: error instanceof Error ? error.constructor.name : "unknown",
        duration_ms: Date.now() - now,
        ...timingFacts,
        ...loopLag,
      });
      logEvent("tengu_plugins_sync_error", {
        duration_ms: Date.now() - now,
        ...timingFacts,
        ...loopLag,
      });
      logFeatureBad("plugins_sync_round", "unexpected_error", baseTelemetry());
      outcome = "unexpected_error";
    } else {
      logFeatureSad("plugins_sync_round", "root_refused", baseTelemetry());
      outcome = "root_refused";
    }
    if (error instanceof SyncOwnedRootRefusedError && dirsRegistered) {
      logForDiagnosticsNoPII("warn", "plugins_sync_post_registration_refusal", {
        reason: error.reason,
      });
      logEvent("tengu_plugins_sync_root_refused", {
        reason: fromEnum(error.reason),
        phase: lit_2("post_registration"),
        duration_ms: Date.now() - now,
      });
      bucketRootReady = false;
    } else if (error instanceof SyncOwnedRootRefusedError) {
      logForDiagnosticsNoPII("warn", "plugins_sync_root_refused_fail_closed");
      logEvent("tengu_plugins_sync_root_refused", {
        reason: fromEnum(error.reason),
        phase: lit_2("head"),
        duration_ms: Date.now() - now,
      });
      let pluginsDirLabel = tildify(join(getClaudeConfigDir(), "plugins"));
      pluginsSync.syncErrors.push({
        type: "generic-error",
        source: `${SYNCED}[root]`,
        error:
          error.reason === "unverified" || error.reason === "landing_unverified"
            ? `claude.ai plugin sync disabled this session: ${pluginsDirLabel} could not be verified${error.code ? ` (${error.code})` : ""}`
            : error.reason === "landing_absent"
              ? `claude.ai plugin sync disabled this session: ${pluginsDirLabel} was removed while a sync round was running`
              : `claude.ai plugin sync disabled this session: ${pluginsDirLabel} is not a plain directory tree (a symlink or stray file is in the way)`,
      });
      setSyncedPluginDirs([]);
    } else if (!dirsRegistered && pluginsRootGuard !== null)
      await registerSyncedPluginDirs(pluginsRootGuard, {
        reconcileSidecars: true,
      });
  } finally {
    if (changesLanded || syncedPluginDirsKey() !== dirsKeyBefore) getSyncedPluginReloadDebt().changesLanded++;
    loopDelay?.disable();
    if (pluginsRootGuard === null || pluginsRootGuard.guard.refused()) bucketRootReady = false;
    if (bucketRootReady && pluginsRootGuard !== null) {
      let replaceDir = pluginReplaceTmpDir(pluginsRootGuard.root);
      let root = pluginsRootGuard.root;
      let claudeConfigDir = getClaudeConfigDir();
      let cleanupPromise = Promise.all(pluginsSync.pendingTrashRemovals.splice(0)).then(async () => {
        if (
          (await verifySyncRoot(
            root,
            claudeConfigDir,
            {
              event: "plugins_sync_root_refused",
              phase: "sweep",
              rootLabel: SKILLS_SYNCED_STAGING,
            },
            {
              checkStagingLeaf: true,
            },
          ).catch(() => null)) === "real"
        )
          await rm_2(replaceDir, {
            recursive: true,
            force: true,
          }).catch(() => {});
      });
      pluginsSync.pendingTrashRemovals.push(cleanupPromise);
    }
    if (startup) recordPluginsSyncRound(session, outcome);
  }
  return changesLanded;
}
//@ chunk-e6aww6q8.js:666154-666372 placement
function getDownloadTimingTelemetry(stats) {
  return {
    ...getDownloadSizeTelemetry(stats),
    download_ms_sum: stats.downloadMs.reduce((acc, downloadM) => acc + downloadM, 0),
    download_ms_max: Math.max(0, ...stats.downloadMs),
    extract_ms_sum: stats.extractMs.reduce((acc, extractM) => acc + extractM, 0),
    extract_ms_max: Math.max(0, ...stats.extractMs),
  };
}
//@ chunk-e6aww6q8.js:666372-666704 placement
/**
 * 从清单登记已同步插件目录与认证信息（可先对齐 sidecar）；根被拒时按关闭失败处理并清空。
 */
async function registerSyncedPluginDirs(rootGuard, { reconcileSidecars }) {
  let pluginsManifest = await readPluginsManifest(rootGuard);
  if (!pluginsManifest) return;
  if (reconcileSidecars) await reconcilePluginSidecars(rootGuard, pluginsManifest.plugins);
  if (rootGuard.guard.refusedReason() !== null) {
    logForDiagnosticsNoPII("warn", "plugins_sync_root_refused_fail_closed");
    setSyncedPluginDirs([]);
    return;
  }
  let dirs = mapRowsToDirs(rootGuard.root, pluginsManifest.plugins);
  let dirs_2 = dirs.map(({ dir }) => dir);
  let attestations = new Map();
  for (let dir of dirs_2) {
    let syncedPluginAttestation = getSyncedPluginAttestation(dir);
    if (syncedPluginAttestation !== undefined) attestations.set(dir, syncedPluginAttestation);
  }
  setSyncedPluginDirs(dirs_2, attestations, dirToPluginIdMap(dirs));
}
//@ chunk-e6aww6q8.js:666704-666765 placement
/**
 * 列出已同步插件的目录。
 */
async function listSyncedPluginDirsOnly(storageV5) {
  return (await listSyncedPluginDirs(storageV5)).map(({ dir }) => dir);
}
//@ chunk-e6aww6q8.js:666765-666910 placement
async function listSyncedPluginDirs(storageV5) {
  let syncedPluginsState = await readSyncedPluginsState(storageV5);
  return syncedPluginsState?.manifest
    ? mapRowsToDirs(syncedPluginsState.root, syncedPluginsState.manifest.plugins).map(({ dir, row }) => ({
        dir,
        pluginId: row.pluginId,
      }))
    : [];
}
//@ chunk-e6aww6q8.js:666910-667237 placement
/**
 * 在已同步插件中找出给定 ID 中实际存在目录的那些；无法判断时返回 null。
 */
async function findInstalledSyncedPlugins(storageV5, candidateIds) {
  let bucketState = await readBucketState(storageV5);
  if (!bucketState?.manifest) return null;
  let filtered = mapRowsToDirs(bucketState.root, bucketState.manifest.plugins).filter(({ row }) =>
    candidateIds.has(row.pluginId),
  );
  let results = await Promise.all(
    filtered.map(({ dir }) =>
      lstat(dir).then(
        (entry) => entry.isDirectory(),
        (error) => (isENOENT(error) ? false : null),
      ),
    ),
  );
  if (results.includes(null)) return null;
  return new Set(filtered.flatMap(({ row }, entryIndex) => (results[entryIndex] ? [row.pluginId] : [])));
}
//@ chunk-e6aww6q8.js:667237-667378 placement
/**
 * 已应用的插件列表是否与清单中的插件一致。
 */
async function isAppliedListCurrent(storageV5) {
  let manifest = (await readSyncedPluginsState(storageV5))?.manifest;
  return (
    manifest?.appliedListIds !== undefined &&
    sameIdSet(
      manifest.appliedListIds,
      manifest.plugins.map((plugin) => plugin.pluginId),
    )
  );
}
//@ chunk-e6aww6q8.js:667378-667518 placement
async function readSyncedPluginsState(storageV5) {
  if (isDiskless()) return null;
  let storageV5_2 = await getSyncBucket(storageV5);
  if (storageV5_2 === null) {
    logForDiagnosticsNoPII("info", "plugins_sync_bucket_unresolved");
    return null;
  }
  return readBucketState(storageV5_2);
}
//@ chunk-e6aww6q8.js:667518-667883 placement
/**
 * 读取插件同步桶状态：同步根与回收根都校验通过且桶有标记时返回根与清单，否则 null。
 */
async function readBucketState(storageV5) {
  if (isDiskless()) return null;
  let root = syncedPluginBucketDir(storageV5);
  let refusalLabels = {
    event: "plugins_sync_root_refused",
    phase: "read",
  };
  let [rootCheck, stagingCheck] = await Promise.all([
    verifySyncRoot(
      root,
      getClaudeConfigDir(),
      {
        ...refusalLabels,
        rootLabel: SKILLS_SYNCED_STAGING,
      },
      {
        checkStagingLeaf: true,
      },
    ).catch(() => null),
    verifySyncRoot(pluginsTrashRoot(), getClaudeConfigDir(), {
      ...refusalLabels,
      rootLabel: PLUGINS_SYNC_DIR,
    }).catch(() => null),
  ]);
  if (
    rootCheck !== "real" ||
    (stagingCheck !== "real" && stagingCheck !== "absent") ||
    !(await hasSyncMarker(syncedPluginsRoot(), storageV5))
  )
    return null;
  return {
    root,
    manifest: await readPluginsManifest(createPluginsRootGuard(root)),
  };
}
//@ chunk-e6aww6q8.js:667883-668076 placement
async function getRegisteredSyncedDirs(storageV5) {
  let syncedPluginDirs = getSyncedPluginDirs();
  if (syncedPluginDirs.length === 0) return syncedPluginDirs;
  let syncBucket = await getSyncBucket(storageV5);
  if (syncBucket === null) {
    logForDiagnosticsNoPII("info", "plugins_sync_bucket_unresolved");
    return [];
  }
  let bucketDir = syncedPluginBucketDir(syncBucket);
  return syncedPluginDirs.every((syncedPluginDir) => dirname(syncedPluginDir) === bucketDir)
    ? syncedPluginDirs
    : null;
}
//@ chunk-e6aww6q8.js:668076-668207 placement
/**
 * 尚未登记时，读取同步插件目录并登记目录及其插件 id。
 */
async function ensureSyncedPluginDirsRegistered() {
  if (hasRegisteredSyncedPluginDirs()) return;
  let dirs = await listSyncedPluginDirs();
  setSyncedPluginDirs(
    dirs.map(({ dir }) => dir),
    undefined,
    new Map(dirs.map(({ dir, pluginId }) => [dir, pluginId])),
  );
}
//@ chunk-e6aww6q8.js:668207-668635 placement
/**
 * 删除已同步插件目录：保留拼写不删；正在使用或有在线会话时推迟；否则移入回收区并删除元数据文件。返回是否已删除。
 */
async function removeSyncedPluginDir(root, dirName, classifyLive, rowDirNames) {
  let dirPath;
  try {
    dirPath = syncedItemPath_2(dirName, root);
  } catch (error) {
    if (error instanceof LegacyReservedSpellingError) return false;
    return true;
  }
  if (classifyLive) {
    let liveState = await classifyLive(dirPath);
    if (liveState === "live") return true;
    if (liveState === "indeterminate") return false;
  }
  if (rowDirNames !== undefined && (await isRegisteredLivePluginDir(dirPath, dirName, rowDirNames))) {
    logForDiagnosticsNoPII("info", "plugins_sync_removal_deferred_live_session");
    return false;
  }
  let removed = await checkSyncRoots({
    dir: dirPath,
    trashRoot: pluginsTrashRoot(),
    configHome: getClaudeConfigDir(),
    failureEvent: "plugins_sync_trash_move_failed",
  });
  if (removed)
    await rm_2(dirPath + PLUGIN_META_SUFFIX, {
      force: true,
    }).catch(() => {});
  return removed;
}
//@ chunk-e6aww6q8.js:668635-668775 placement
async function isPluginDirInUse(dirName) {
  return isPluginVersionInUse(dirName, {
    refusedCountsAsLive: false,
    requireIdentity: true,
  }).catch(() => {
    logForDiagnosticsNoPII("warn", "plugins_sync_in_use_probe_failed");
    return true;
  });
}
//@ chunk-e6aww6q8.js:668775-668840 placement
/**
 * 目录是否属于仍登记、正在使用的插件。
 */
async function isRegisteredLivePluginDir(dirName, dirPath, rowDirNames) {
  return (
    rowDirNames.has(stripInvisibleChars_3(stripGenerationSuffix(dirPath))) &&
    (await isPluginDirInUse(dirName))
  );
}
//@ chunk-e6aww6q8.js:668840-669339 placement
/**
 * 记录最近一次完整列表（每个插件的目录集合与待删除目录），用于后续清理已下架的插件目录。
 */
function recordCompleteList(pluginsSync, syncBucket, root, listResult) {
  if (listResult.degraded) return;
  let lastCompleteList = pluginsSync.lastCompleteList;
  let previousList =
    lastCompleteList !== null && lastCompleteList.bucket === syncBucket ? lastCompleteList : null;
  let previousDirsById = previousList?.dirsById ?? new Map();
  let dirsById = new Map();
  for (let plugin of listResult.plugins)
    dirsById.set(
      plugin.pluginId,
      new Set([...(previousDirsById.get(plugin.pluginId) ?? []), ...getRowDirNames(root, [plugin])]),
    );
  let delistedDirs = new Set([
    ...Array.from(previousDirsById).flatMap(([pluginId, dirs]) =>
      dirsById.has(pluginId) ? [] : Array.from(dirs),
    ),
    ...(previousList?.removalOwed ?? []),
  ]);
  let listedDirs = new Set(Array.from(dirsById.values()).flatMap((dirs) => Array.from(dirs)));
  let hooksRemoved = removeDelistedSkillHooks({
    bucket: syncBucket,
    delistedDirs,
    listedDirs,
  });
  pluginsSync.lastCompleteList = {
    bucket: syncBucket,
    dirsById,
    removalOwed: hooksRemoved ? new Set() : delistedDirs,
  };
}
//@ chunk-e6aww6q8.js:669339-669449 placement
function getRowDirNames(root, plugins) {
  return new Set(
    plugins.flatMap(({ name }) => {
      try {
        return [
          stripInvisibleChars_3(
            basename(
              itemInstallPath(root, {
                name,
              }),
            ),
          ),
        ];
      } catch {
        return [];
      }
    }),
  );
}
//@ chunk-e6aww6q8.js:669449-669572 placement
async function removeStaleDirs(root, dirNames, classifyLive, rowDirNames) {
  let removedDirs = new Set();
  for (let dirName of dirNames) {
    if (isSyncedPluginDirLoadedHere(join(root, dirName))) continue;
    if (await removeSyncedPluginDir(root, dirName, classifyLive, rowDirNames)) removedDirs.add(dirName);
  }
  return removedDirs;
}
//@ chunk-e6aww6q8.js:669572-670106 placement
/**
 * 列出插件同步根下的桶：带标记的桶、无关的杂项与标记不可读的目录。
 */
async function listPluginBuckets() {
  let root = syncedPluginsRoot();
  if (
    (await verifySyncRoot(root, getClaudeConfigDir(), {
      event: "plugins_sync_root_refused",
      phase: "prune",
      rootLabel: SKILLS_SYNCED_STAGING,
    }).catch(() => null)) !== "real"
  )
    return null;
  let entries;
  try {
    entries = await readdir(root, {
      withFileTypes: true,
    });
  } catch {
    return null;
  }
  let buckets = [];
  let strays = [];
  let unreadable = [];
  for (let entry of entries) {
    let marker =
      entry.isDirectory() && isSyncBucketName(entry.name)
        ? await readSyncMarker(root, entry.name)
        : "unmarked";
    if (marker === "marked") buckets.push(entry.name);
    else if (typeof marker === "object") {
      unreadable.push(entry.name);
      logForDiagnosticsNoPII("warn", "plugins_sync_bucket_marker_unreadable", {
        code: marker.unreadable,
      });
    } else if (!isHiddenFoldName(entry.name)) strays.push(entry.name);
  }
  return {
    buckets,
    strays,
    unreadable,
  };
}
//@ chunk-e6aww6q8.js:670106-670334 placement
async function trashStrayEntries(strays) {
  let count = 0;
  for (let strayName of strays)
    if (
      await checkSyncRoots({
        dir: join(syncedPluginsRoot(), strayName),
        trashRoot: pluginsTrashRoot(),
        configHome: getClaudeConfigDir(),
        failureEvent: "plugins_sync_trash_move_failed",
      })
    )
      count++;
  if (count > 0)
    logForDiagnosticsNoPII("info", "plugins_sync_stray_entry_trashed", {
      count,
    });
  return count;
}
//@ chunk-e6aww6q8.js:670334-670424 placement
/**
 * 清理多余（已下架）的插件桶目录。
 */
async function trashStrayPluginBuckets() {
  let bucketScan = await listPluginBuckets();
  if (bucketScan !== null && bucketScan.strays.length > 0) await trashStrayEntries(bucketScan.strays);
}
//@ chunk-e6aww6q8.js:670424-670520 placement
/**
 * 读取某桶的同步守卫与清单（无清单返回 null）。
 */
async function readBucketRound(bucket) {
  let pluginsRootGuard = createPluginsRootGuard(syncedPluginBucketDir(bucket));
  let pluginsManifest = await readPluginsManifest(pluginsRootGuard);
  return pluginsManifest === null
    ? null
    : {
        round: pluginsRootGuard,
        manifest: pluginsManifest,
      };
}
//@ chunk-e6aww6q8.js:670520-671618 placement
/**
 * 同步闸门关闭时清理已同步的插件，延迟到不在使用时执行。
 */
async function pruneSyncedPluginsForClosedGate() {
  if (!isAccountSyncDeniedHere()) return false;
  if (hasSyncedPluginLaneOpened()) {
    logForDiagnosticsNoPII("info", "plugins_sync_prune_deferred_loaded");
    return false;
  }
  let bucketScan = await listPluginBuckets();
  if (!bucketScan) return false;
  setSyncedPluginDirs([]);
  let movedCount = 0;
  let retained = 0;
  for (let bucket of bucketScan.buckets) {
    let bucketDir = syncedPluginBucketDir(bucket);
    await rm_2(join(bucketDir, MARKETPLACES_JSON_FILE), {
      force: true,
    }).catch(() => {});
    for (let fileName of await readdir(bucketDir).catch(() => []))
      if (isClaudeAiMarketplaceFile(fileName))
        await rm_2(join(bucketDir, fileName), {
          force: true,
        }).catch(() => {});
    await rm_2(lastCompleteRoundPath(bucketDir), {
      force: true,
    }).catch(() => {});
    let bucketRound = await readBucketRound(bucket);
    if (!bucketRound) continue;
    let { round, manifest } = bucketRound;
    let root = round.root;
    let retainedPlugins = [];
    let removedPluginIds = new Set();
    for (let plugin of manifest.plugins)
      if (await removeSyncedPluginDir(root, itemDirName(root, plugin))) removedPluginIds.add(plugin.pluginId);
      else retainedPlugins.push(plugin);
    let staleDirs = new Set(manifest.staleDirs ?? []);
    let removedDirs = await removeStaleDirs(root, staleDirs);
    for (let dirName of removedDirs) staleDirs.delete(dirName);
    let orphanCount = await trashOrphanSyncedPluginDirs(round, [], null);
    movedCount += removedPluginIds.size + removedDirs.size + orphanCount;
    if (retainedPlugins.length > 0 || staleDirs.size > 0) {
      retained += retainedPlugins.length + staleDirs.size;
      await writePluginsManifest(
        round,
        {
          lastUpdated: manifest.lastUpdated,
          plugins: retainedPlugins,
          staleDirs: staleDirs.size > 0 ? Array.from(staleDirs) : undefined,
        },
        {
          staleDirs: removedDirs,
          removedPluginIds,
        },
      ).catch(() => {});
    } else {
      await rm_2(syncedManifestPath(root), {
        force: true,
      }).catch(() => {});
      await rmdir(root).then(
        () => removeSyncedSkillDir(syncedPluginsRoot(), bucket),
        () => {},
      );
    }
  }
  movedCount += await trashStrayEntries([...bucketScan.strays, ...bucketScan.unreadable]);
  await rmdir(syncedPluginsRoot()).catch(() => {});
  logForDiagnosticsNoPII("info", "plugins_sync_pruned_for_closed_gate", {
    moved: movedCount,
    retained,
  });
  return movedCount > 0;
}
//@ chunk-e6aww6q8.js:671618-672275 placement
/**
 * 处理各桶清单中推迟的过期目录删除：能删的删掉并更新清单，记录完成与保留数。
 */
async function completeDeferredRemovals() {
  if (hasSyncedPluginLaneOpened() || hasSyncEnv()) return false;
  let buckets = await listPluginBuckets();
  if (!buckets) return false;
  let moved = 0;
  let retained = 0;
  for (let bucket of buckets.buckets) {
    let bucketState = await readBucketRound(bucket);
    if (!bucketState?.manifest.staleDirs?.length) continue;
    let { round, manifest } = bucketState;
    let root = round.root;
    let staleDirs = new Set(manifest.staleDirs);
    let removed = await removeStaleDirs(
      root,
      staleDirs,
      createLiveEntryClassifier(new Set(manifestRowDirs(root, manifest.plugins))),
      getRowDirNames(root, manifest.plugins),
    );
    if (removed.size === 0) {
      retained += staleDirs.size;
      continue;
    }
    for (let dirName of removed) staleDirs.delete(dirName);
    moved += removed.size;
    retained += staleDirs.size;
    await writePluginsManifest(
      round,
      {
        lastUpdated: manifest.lastUpdated,
        plugins: manifest.plugins,
        staleDirs: staleDirs.size > 0 ? Array.from(staleDirs) : undefined,
      },
      {
        staleDirs: removed,
        removedPluginIds: new Set(),
        carryAppliedListIds: true,
      },
    ).catch(() => {});
  }
  if (moved === 0) return false;
  logForDiagnosticsNoPII("info", "plugins_sync_deferred_removals_completed", {
    moved,
    retained,
  });
  return true;
}
//@ chunk-e6aww6q8.js:672275-673261 placement
async function trashOrphanSyncedPluginDirs(pluginsRootGuard, plugins, removalsDeferredHere) {
  if (!(await pluginsRootGuard.guard.verify())) return 0;
  let root = pluginsRootGuard.root;
  let pluginsManifest = await readPluginsManifest(pluginsRootGuard);
  if (!pluginsManifest) return 0;
  let knownDirNames = new Set(
    [
      ...[
        ...pluginsManifest.plugins,
        ...plugins.map(({ name }) => ({
          name,
        })),
      ].flatMap((row) => {
        try {
          return [basename(itemInstallPath(root, row))];
        } catch {
          return [];
        }
      }),
      ...(pluginsManifest.staleDirs ?? []),
    ].map(stripInvisibleChars_3),
  );
  let entries;
  try {
    entries = await readdir(root, {
      withFileTypes: true,
    });
  } catch {
    return 0;
  }
  let mapped = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !isHiddenFoldName(entry.name) &&
        !knownDirNames.has(stripInvisibleChars_3(entry.name)),
    )
    .map((entry) => entry.name);
  if (mapped.length === 0) return 0;
  if (hasSyncedPluginLaneOpened()) {
    await writePluginsManifest(
      pluginsRootGuard,
      {
        lastUpdated: pluginsManifest.lastUpdated,
        plugins: pluginsManifest.plugins,
        staleDirs: [...(pluginsManifest.staleDirs ?? []), ...mapped],
      },
      {
        staleDirs: new Set(),
        removedPluginIds: new Set(),
        carryAppliedListIds: true,
      },
    );
    for (let dirName of mapped) removalsDeferredHere?.add(dirName);
    logForDiagnosticsNoPII("info", "plugins_sync_orphan_dir_deferred", {
      count: mapped.length,
    });
    return 0;
  }
  let trashedCount = 0;
  let rowDirNames = getRowDirNames(root, plugins);
  for (let dirName of mapped) {
    if (await isRegisteredLivePluginDir(join(root, dirName), dirName, rowDirNames)) continue;
    if (
      await checkSyncRoots({
        dir: join(root, dirName),
        trashRoot: pluginsTrashRoot(),
        configHome: getClaudeConfigDir(),
        failureEvent: "plugins_sync_trash_move_failed",
      })
    ) {
      trashedCount++;
      await rm_2(join(root, dirName) + PLUGIN_META_SUFFIX, {
        force: true,
      }).catch(() => {});
    }
  }
  if (trashedCount > 0)
    logForDiagnosticsNoPII("info", "plugins_sync_orphan_dir_trashed", {
      count: trashedCount,
    });
  return trashedCount;
}
//@ chunk-e6aww6q8.js:673261-673312 placement
/**
 * 把清单行映射为目录列表。
 */
function manifestRowDirs(root, plugins) {
  return mapRowsToDirs(root, plugins).map(({ dir }) => dir);
}
//@ chunk-e6aww6q8.js:673312-673472 placement
function mapRowsToDirs(root, plugins) {
  let byDir = new Map();
  for (let plugin of plugins) {
    let dirPath;
    try {
      dirPath = itemInstallPath(root, plugin);
    } catch {
      continue;
    }
    let strippedDir = stripInvisibleChars_3(dirPath);
    if (!byDir.has(strippedDir))
      byDir.set(strippedDir, {
        dir: dirPath,
        row: plugin,
      });
  }
  return Array.from(byDir.values());
}
//@ chunk-e6aww6q8.js:673472-673719 placement
function registerDirsWithAttestations(root, rows, attestations, newHere = new Set()) {
  let dirs = mapRowsToDirs(root, rows);
  let dirAttestations = new Map();
  for (let { dir, row } of dirs) {
    let attestation = attestations.get(row.pluginId);
    if (
      attestation !== undefined &&
      row.name === attestation.rowName &&
      (row.generation === undefined || newHere.has(row) || getSyncedPluginAttestation(dir) !== undefined)
    )
      dirAttestations.set(dir, attestation.attestation);
  }
  setSyncedPluginDirs(
    dirs.map(({ dir }) => dir),
    dirAttestations,
    dirToPluginIdMap(dirs),
  );
}
//@ chunk-e6aww6q8.js:673719-673790 placement
/**
 * 目录 → 插件 id 的映射，用于登记已同步目录。
 */
function dirToPluginIdMap(rows) {
  return new Map(rows.map(({ dir, row }) => [dir, row.pluginId]));
}
export {
  isAppliedListCurrent,
  pruneSyncedPluginsForClosedGate,
  completeDeferredRemovals,
  ensureSyncedPluginDirsRegistered,
  listSyncedPluginDirsOnly,
  getRegisteredSyncedDirs,
  listSyncedPluginDirs,
  syncedPluginsRoot,
  syncedPluginBucketDir,
  ensurePluginsBucketRoot,
  runPluginsSyncRound,
  findInstalledSyncedPlugins,
};
