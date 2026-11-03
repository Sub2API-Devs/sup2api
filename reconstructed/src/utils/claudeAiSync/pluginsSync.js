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
import { looseObject, string, E, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
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
  pluginAttributionSchema,
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
function syncedPluginBucketDir(e) {
  return join(syncedPluginsRoot(), e);
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
async function preparePluginsBucket(e) {
  let bucketDir = syncedPluginBucketDir(e);
  let markerState = await readSyncMarker(syncedPluginsRoot(), e);
  if (
    markerState === "unmarked" &&
    (await lstat(bucketDir).then(
      (s) => s.isDirectory(),
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
      root: toPosixLabelPath(join(SKILLS_SYNCED_STAGING, e)),
      component: "marker",
      reason: "unverified",
      code: markerState.unreadable,
    });
    throw new SyncOwnedRootRefusedError("unverified", {
      code: markerState.unreadable,
    });
  }
  await touchExclusive(syncedPluginsRoot(), e);
}
//@ chunk-e6aww6q8.js:648326-648875 placement
/**
 * 已同步插件清单行（ID、名称、版本、更新时间、市场信息、代数等）与清单文件的 schema。
 */
var syncedPluginRowSchema = DoctorLazy(() =>
  looseObject({
    pluginId: string(),
    name: string(),
    description: string().catch(""),
    version: string().nullable().catch(null),
    updatedAt: string().nullable().catch(null),
    requestedVersion: string().optional().catch(undefined),
    marketplaceName: string().optional().catch(undefined),
    installationPreference: pluginAvailabilitySchema().optional().catch(undefined),
    marketplaceKind: pluginOriginSchema().optional().catch(undefined),
    presentsAs: string().optional().catch(undefined),
    generation: E().int().min(2).optional().catch(undefined),
  }),
);
var pluginsManifestSchema = DoctorLazy(() =>
  looseObject({
    lastUpdated: E().catch(0),
    plugins: unknown().optional(),
    staleDirs: unknown().optional(),
    appliedListIds: unknown().optional(),
  }),
);
//@ chunk-e6aww6q8.js:648875-648984 placement
async function isManifestReadableOrAbsent(pluginsRootGuard) {
  if ((await readPluginsManifest(pluginsRootGuard)) !== null) return true;
  return lstat(syncedManifestPath(pluginsRootGuard.root)).then(
    () => false,
    (error) => getErrnoCode(error) === "ENOENT",
  );
}
//@ chunk-e6aww6q8.js:648984-649370 placement
/**
 * 读取插件同步清单（首次读取失败时记诊断），解析插件行、过期目录与已应用列表 ID。
 */
async function readPluginsManifest(e) {
  let n = !e.manifestRead;
  e.manifestRead = true;
  let manifestText = await readManifestText(
    syncedManifestPath(e.root),
    n ? "plugins_sync_manifest_unreadable" : null,
  );
  if (manifestText === null) return null;
  let manifestJson = parseManifestJson(
    manifestText,
    pluginsManifestSchema(),
    n ? "plugins_sync_manifest_unreadable" : null,
  );
  if (manifestJson === null) return null;
  let { plugins, staleDirs, appliedListIds, ...w } = manifestJson;
  return {
    ...w,
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
async function writePluginsManifest(e, n, r) {
  assertSyncRootAllowed(e);
  await checkPluginsSyncRoot(e.root);
  let pluginsManifest = await readPluginsManifest(e);
  let validRows = parseValidRows(syncedPluginRowSchema(), n.plugins);
  let y = new Map(validRows.map((S, w) => [S.pluginId, w]));
  await writeFileAtomic_2(
    syncedManifestPath(e.root),
    jsonStringify(
      {
        ...omitKeys_2(pluginsManifest, [
          "lastUpdated",
          "plugins",
          "staleDirs",
          "appliedListIds",
          "askedListIds",
        ]),
        ...(r.carryAppliedListIds && {
          appliedListIds: pluginsManifest?.appliedListIds,
        }),
        ...n,
        plugins: mergeManifestRows(
          validRows,
          pluginsManifest?.plugins,
          (S) => S.pluginId,
          r.removedPluginIds,
        ).toSorted(
          (S, w) => (y.get(S.pluginId) ?? validRows.length) - (y.get(w.pluginId) ?? validRows.length),
        ),
        staleDirs: mergeStaleDirs(n.staleDirs, pluginsManifest?.staleDirs, r.staleDirs),
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
function syncedItemDir(e, name) {
  return syncedItemPath(name, e);
}
//@ chunk-e6aww6q8.js:649954-650008 placement
/**
 * 同步插件项的安装路径（按代数区分）。
 */
function itemInstallPath(e, n) {
  return syncedItemPathForGeneration(n.name, n.generation ?? 1, e);
}
//@ chunk-e6aww6q8.js:650008-650069 placement
/**
 * 同步插件项的目录名，取不到时退回插件原名。
 */
function itemDirName(root, n) {
  try {
    return basename(itemInstallPath(root, n));
  } catch {
    return n.name;
  }
}
//@ chunk-e6aww6q8.js:650069-650858 placement
async function writeSyncedPluginSidecar(root, n) {
  let { pluginId } = n;
  let s;
  try {
    s = itemInstallPath(root, n) + PLUGIN_META_SUFFIX;
  } catch {
    return;
  }
  try {
    let h = await lstat(s).catch(() => null);
    if (h !== null && !h.isFile())
      if (h.isDirectory())
        await checkSyncRoots({
          dir: s,
          trashRoot: pluginsTrashRoot(),
          configHome: getClaudeConfigDir(),
          failureEvent: "plugins_sync_trash_move_failed",
        });
      else
        await rm_2(s, {
          force: true,
        });
    if (isServerPluginId(pluginId)) {
      let y = n.marketplaceName !== undefined && isAttributionNameValid(n.marketplaceName);
      if (n.marketplaceName !== undefined && !y)
        logForDiagnosticsNoPII("warn", "plugins_sync_sidecar_invalid_marketplace_name");
      let S = jsonStringify({
        [SERVER_PLUGIN_ID]: pluginId,
        ...(y && {
          [MARKETPLACE_NAME]: n.marketplaceName,
        }),
        ...(n.installationPreference !== undefined && {
          [INSTALLATION_PREFERENCE]: n.installationPreference,
        }),
        ...(n.marketplaceKind !== undefined && {
          [MARKETPLACE_KIND]: n.marketplaceKind,
        }),
      });
      if ((await readSmallFileOrNull(s, pluginAttributionSchema)) === S) return;
      await writeFileAtomic_2(s, S);
    } else {
      logForDiagnosticsNoPII("warn", "plugins_sync_sidecar_invalid_id");
      await rm_2(s, {
        force: true,
      });
    }
  } catch {
    logForDiagnosticsNoPII("warn", "plugins_sync_sidecar_write_failed");
  }
}
//@ chunk-e6aww6q8.js:650858-651091 placement
async function reconcilePluginSidecars(pluginsRootGuard, n) {
  if (!(await pluginsRootGuard.guard.verify())) return;
  let r = new Map();
  for (let s of n) {
    let h;
    try {
      h = itemInstallPath(pluginsRootGuard.root, s);
    } catch {
      continue;
    }
    let y = stripInvisibleChars_3(h);
    if (!r.has(y)) r.set(y, s);
  }
  await Promise.all(
    Array.from(
      r.values(),
      limitConcurrency(MAX_DEFERRED_RELIST_ROUNDS, (s) => writeSyncedPluginSidecar(pluginsRootGuard.root, s)),
    ),
  );
}
//@ chunk-e6aww6q8.js:651091-651188 placement
/**
 * 判断两个同步插件项是否指向同一目录（含大小写不敏感比较）。
 */
async function sameSyncedItem(root, n, r) {
  try {
    let s = itemInstallPath(root, n);
    return basename(s) === basename(r) || (await isSameFileIdentity(s, r));
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:651188-651357 placement
function toSyncedPluginRow(e) {
  return {
    pluginId: e.id,
    name: e.directory || e.name || e.id,
    description: e.description,
    version: e.version || null,
    updatedAt: null,
    requestedVersion: e.version || undefined,
  };
}
//@ chunk-e6aww6q8.js:651357-651584 placement
function collectOfficialAttestations(entries) {
  let n = new Map();
  for (let r of entries)
    if (
      r.isOfficial === true &&
      r.marketplaceName !== undefined &&
      ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(r.marketplaceName)
    )
      n.set(r.id, {
        attestation: {
          marketplace: r.marketplaceName,
          pluginName: r.name,
        },
        rowName: toSyncedPluginRow(r).name,
      });
  return n;
}
//@ chunk-e6aww6q8.js:651584-651731 placement
function carryMarketplaceInfo(e, n) {
  return {
    ...e,
    marketplaceName: n.marketplaceName,
    installationPreference: n.installationPreference,
    marketplaceKind: n.marketplaceKind,
  };
}
//@ chunk-e6aww6q8.js:651731-651907 placement
function planPluginDownloads(root, plugins, r) {
  return planSyncDownloads(plugins, r, {
    idOf: (s) => s.pluginId,
    dirFor: (s) => syncedItemDir(root, s),
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
function reuseStampVariant(e) {
  return e ? "converted-skills" : "";
}
//@ chunk-e6aww6q8.js:652035-652110 placement
/**
 * 已应用清单 id 的附加字段构造。
 */
function appliedListIdsField(e, n, r) {
  return e && n
    ? {
        appliedListIds: r.map((s) => s.pluginId),
      }
    : {};
}
//@ chunk-e6aww6q8.js:652110-652240 placement
function sameIdSet(appliedListIds, n) {
  if (appliedListIds === undefined || n === undefined) return appliedListIds === n;
  let r = new Set(n);
  return new Set(appliedListIds).size === r.size && appliedListIds.every((s) => r.has(s));
}
//@ chunk-e6aww6q8.js:652240-652323 placement
/**
 * 复用标记里是否列出了该变体。
 */
async function isReuseStampListed(root, n) {
  return ((await readReuseStamp(root))?.listedFor.includes(reuseStampVariant(true)) === true) === n;
}
//@ chunk-e6aww6q8.js:652323-652425 placement
function createPluginsRootGuard(e) {
  return freshRootState({
    root: () => e,
    configHome: getClaudeConfigDir,
    rootLabel: SKILLS_SYNCED_STAGING,
    event: "plugins_sync_root_refused",
  });
}
//@ chunk-e6aww6q8.js:652425-652486 placement
/**
 * 校验同步根守卫，失败时返回拒绝结果。
 */
async function verifyGuardOrRefused(e) {
  return (await e.guard.verify()) ? null : ROOT_REFUSED_RESULT;
}
//@ chunk-e6aww6q8.js:652486-652556 placement
/**
 * 同步根被拒时抛出错误。
 */
function assertSyncRootAllowed(pluginsRootGuard) {
  let n = pluginsRootGuard.guard.refusedReason();
  if (n !== null) throw rootRefusedError(n);
}
//@ chunk-e6aww6q8.js:652556-652749 placement
function getDownloadSizeTelemetry(e) {
  return e.zipBytes === 0
    ? {}
    : {
        approx_downloaded_bytes: Number(e.zipBytes.toPrecision(2)),
        approx_downloaded_bytes_anthropic_catalog: Number(e.anthropicCatalogZipBytes.toPrecision(2)),
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
async function promoteSyncedPlugin(e, n, r, s, h, credentials, S) {
  let root = n.root;
  let L = syncedItemDir(root, r.name);
  let G = join(pluginReplaceTmpDir(root), relative(root, L));
  let tempZipPath = makeTempZipPath();
  let Z;
  try {
    if (n.guard.refused()) return ROOT_REFUSED_RESULT;
    let now = Date.now();
    let ke = await downloadWithRetry(r.pluginId, tempZipPath, r.requestedVersion, {
      isBackground: true,
      credentials,
    });
    h.downloadMs.push(Date.now() - now);
    if (!ke.ok) return downloadFailure(ke.reason);
    let size = (await lstat(tempZipPath).catch(() => null))?.size ?? 0;
    h.zipBytes += size;
    if (r.marketplaceKind === "anthropic_catalog") h.anthropicCatalogZipBytes += size;
    Z = await S.acquire();
    let Ee = await verifyGuardOrRefused(n);
    if (Ee !== null) return Ee;
    let now_2 = Date.now();
    try {
      let Ie = await unzipPluginCache(tempZipPath, G);
      if (!Ie.ok) return extractFailure("extracted tree carries a bare-repo layout");
      let root_2 = Ie.root;
      let We = await verifyGuardOrRefused(n);
      if (We !== null) return We;
      await rm_2(join(root_2, IN_USE_MARKER_FILE), {
        recursive: true,
        force: true,
      });
      let ze = hasSyncedPluginLaneOpened();
      if (ze || (await isPluginDirInUse(L))) {
        let nt = s !== undefined && s.name === r.name ? (s.generation ?? 1) : undefined;
        let pt = 0;
        for (let idx = 1; pt < MAX_PROMOTE_ATTEMPTS; idx++) {
          if (idx === nt) continue;
          pt++;
          try {
            await rename(root_2, syncedItemPathForGeneration(r.name, idx, root));
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
        if (ze) {
          logForDiagnosticsNoPII("warn", "plugins_sync_occupant_displace_failed", {
            code: "generations_occupied",
          });
          return LOCAL_PLACEMENT_FAILURE;
        }
        logForDiagnosticsNoPII("warn", "plugins_sync_held_copy_displaced");
      }
      try {
        await rename(root_2, L);
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
      let lt = s !== undefined && (await sameSyncedItem(root, s, L));
      if (!lt) {
        for (let nt of (await readPluginsManifest(n))?.plugins ?? [])
          if (nt.pluginId === r.pluginId && (await sameSyncedItem(root, nt, L))) {
            lt = true;
            break;
          }
      }
      let Je;
      if (lt) {
        Je = join(
          pluginReplaceTmpDir(root),
          `.replaced-${process.pid}-${Math.random().toString(36).slice(2)}`,
        );
        try {
          await rename(L, Je);
        } catch (error) {
          logForDiagnosticsNoPII("warn", "plugins_sync_occupant_displace_failed", {
            code: getErrnoCode(error) ?? "unknown",
          });
          return LOCAL_PLACEMENT_FAILURE;
        }
      } else if (
        !(await checkSyncRoots({
          dir: L,
          trashRoot: pluginsTrashRoot(),
          configHome: getClaudeConfigDir(),
          failureEvent: "plugins_sync_trash_move_failed",
        }))
      )
        return LOCAL_PLACEMENT_FAILURE;
      try {
        await rename(root_2, L);
      } catch (error) {
        let restored =
          Je === undefined
            ? false
            : await rename(Je, L).then(
                () => true,
                () => false,
              );
        logForDiagnosticsNoPII("warn", "plugins_sync_promotion_failed", {
          code: getErrnoCode(error) ?? "unknown",
          restored,
        });
        return buildLocalPlacementFailure(getErrnoCode(error));
      }
      if (Je !== undefined)
        e.pendingTrashRemovals.push(
          rm_2(Je, {
            recursive: true,
            force: true,
          }).catch(() => {}),
        );
      return {
        ok: true,
        generation: 1,
      };
    } finally {
      h.extractMs.push(Date.now() - now_2);
    }
  } finally {
    Z?.();
    await rm_2(tempZipPath, {
      force: true,
    }).catch(() => {});
    if (
      !n.guard.refused() &&
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
      await rm_2(G, {
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
async function promotePluginWithRetry(pluginsSync, pluginsRootGuard, r, prev, h, credentials, semaphore) {
  try {
    return await promoteSyncedPlugin(pluginsSync, pluginsRootGuard, r, prev, h, credentials, semaphore);
  } catch {
    logForDiagnosticsNoPII("warn", "plugins_sync_extract_retry");
    await sleep(PROMOTE_RETRY_SLEEP_MS);
    return promoteSyncedPlugin(pluginsSync, pluginsRootGuard, r, prev, h, credentials, semaphore);
  }
}
//@ chunk-e6aww6q8.js:655337-655542 placement
function recordSyncError_2(pluginsSync, n, r, reason) {
  let source = `${n.name}@${SYNCED}`;
  pluginsSync.syncErrors.push(
    r === "network-error"
      ? {
          type: r,
          source,
          plugin: n.name,
          url: pluginDownloadPath(n.pluginId, n.requestedVersion),
          details: reason,
        }
      : {
          type: r,
          source,
          plugin: n.name,
          error: reason,
        },
  );
}
//@ chunk-e6aww6q8.js:655542-655615 placement
/**
 * 记录一轮插件同步的结论（仅 datadog 遥测允许时）。
 */
function recordPluginsSyncRound(e, n) {
  startupTimingRecorderByHost
    .of(e.host)
    .markPluginsSyncRound(n, () => isRemoteManagedEnvironment() && isDatadogAllowed());
}
//@ chunk-e6aww6q8.js:655615-666154 placement
/**
 * 执行一轮 claude.ai 插件同步：拉取目录、安装/更新/移除并记录遥测。
 */
async function runPluginsSyncRound(e, n, { startup: r = false } = {}) {
  let pluginsSync = e.pluginsSync;
  let now = Date.now();
  pluginsSync.syncErrors = [];
  pluginsSync.accountListing = "pending";
  pluginsSync.lastRoundListed = false;
  pluginsSync.listedStamp = null;
  let y = syncedPluginDirsKey();
  let S;
  try {
    S = monitorEventLoopDelay({
      resolution: 20,
    });
    S.enable();
  } catch {}
  let w = () => {
    if (!S) return {};
    S.disable();
    return {
      loop_lag_p95_ms: Math.round(S.percentile(95) / 1e6),
      loop_lag_max_ms: Math.round(S.max / 1e6),
    };
  };
  let L;
  let G = {
    downloadMs: [],
    extractMs: [],
    zipBytes: 0,
    anthropicCatalogZipBytes: 0,
  };
  let q = false;
  let Z = null;
  let Se = false;
  let ke = false;
  let we = false;
  let Ee = false;
  let Ae = () => ({
    account_opt_in: ke,
    duration_ms: Date.now() - now,
    ...getDownloadSizeTelemetry(G),
    ...(we && {
      converted_skills_asked: true,
    }),
  });
  let Ie = "end_not_recorded";
  if (r) recordPluginsSyncRound(e, "still_running");
  try {
    ke = getAccountPluginsSyncEnabled();
    if (enableAccountPluginsSync()) ke = true;
    if (!isPluginsSyncActive(e) || !syncSettingsEnabled()) {
      logForDiagnosticsNoPII("info", "plugins_sync_gate_closed");
      logFeatureSad("plugins_sync_round", "gate_closed", Ae());
      Ie = "gate_closed";
      if (!isPluginsSyncDenied()) e.pluginsSync.accountListing = "refused";
      return false;
    }
    if (isPluginsSyncEligible()) {
      logForDiagnosticsNoPII("info", "plugins_sync_policy_verdict_pending");
      logFeatureSad("plugins_sync_round", "policy_verdict_pending", Ae());
      Ie = "policy_verdict_pending";
      return false;
    }
    let syncBucket = await getSyncBucket(n);
    if (syncBucket === null) {
      logForDiagnosticsNoPII("info", "plugins_sync_bucket_unresolved");
      logFeatureSad("plugins_sync_round", "bucket_unresolved", Ae());
      Ie = "bucket_unresolved";
      return false;
    }
    let pluginsRootGuard = createPluginsRootGuard(syncedPluginBucketDir(syncBucket));
    Z = pluginsRootGuard;
    let root = pluginsRootGuard.root;
    logForDiagnosticsNoPII("info", "plugins_sync_starting");
    await ensurePluginsBucketRoot(e, syncBucket);
    q = true;
    let lt = isSkillsAsPluginsActive(e);
    if (r && !isSessionRefsSyncEnabled(e)) {
      let Or = await checkReuseWindow(root, syncReuseWithinMs());
      if (
        Or.reuse &&
        (await isManifestReadableOrAbsent(pluginsRootGuard)) &&
        (await isReuseStampListed(root, lt))
      ) {
        logForDiagnosticsNoPII("info", "plugins_sync_round_reused", {
          age_ms: Or.ageMs,
          within_ms: Or.withinMs,
        });
        await registerSyncedPluginDirs(pluginsRootGuard, {
          reconcileSidecars: true,
        });
        scheduleDeferredRelist(e, n);
        logFeatureOk("plugins_sync_round", {
          ...Ae(),
          reused: true,
        });
        Ie = "ok_reused";
        e.pluginsSync.accountListing = "listed";
        return false;
      }
    }
    let Je = lt && {
      convertedSkillsAsPlugins: true,
    };
    let now_2 = Date.now();
    let pt;
    let Et = [];
    let yt = new Map();
    if (isSessionRefsSyncEnabled(e)) {
      let Or = sessionSkillManifestSlot.of(e).listEntries("plugins", {
        startup: r,
      });
      let Io = env.CLAUDE_CODE_SYNC_PLUGINS || getAccountPluginsSyncEnabled();
      we = lt && Io;
      let [zo, rs] = await Promise.all([
        Or,
        Io
          ? listAccountPlugins({
              isBackground: true,
              credentials: n,
              ...Je,
            })
          : null,
      ]);
      if (!zo.success) pt = zo;
      else {
        yt = collectOfficialAttestations(zo.entries);
        Et = zo.entries.map(toSyncedPluginRow);
        if (rs === null)
          pt = {
            success: true,
            plugins: Et,
          };
        else if (!rs.success) pt = rs;
        else
          pt = {
            success: true,
            plugins: mergeRowsByKey(Et, rs.plugins, (Es) => Es.pluginId, carryMarketplaceInfo),
            ...(rs.degraded && {
              degraded: rs.degraded,
            }),
          };
      }
    } else {
      we = lt;
      pt = await listAccountPlugins({
        isBackground: true,
        credentials: n,
        ...Je,
      });
    }
    L = Date.now() - now_2;
    let gt = !pt.success && isNotFoundServerError(pt);
    if (gt) {
      logForDiagnosticsNoPII("warn", "plugins_sync_list_refused", {
        list_ms: L,
      });
      pt = {
        success: true,
        plugins: Et,
      };
    }
    if (pt.success && pt.degraded)
      logForDiagnosticsNoPII("warn", "plugins_sync_list_degraded", {
        list_ms: L,
      });
    if (!pt.success) {
      if (isSyncRefusal(pt)) e.pluginsSync.accountListing = "refused";
      let Or = w();
      let Io = listErrorTelemetry(pt);
      logForDiagnosticsNoPII("warn", "plugins_sync_list_failed", {
        duration_ms: Date.now() - now,
        list_ms: L,
        ...Or,
        ...Io,
      });
      logEvent("tengu_plugins_sync_list_failed", {
        duration_ms: Date.now() - now,
        list_ms: L,
        ...Or,
        ...Io,
      });
      logFeatureBad("plugins_sync_round", "list_failed", {
        ...Ae(),
        ...Io,
      });
      Ie = "list_failed";
      await registerSyncedPluginDirs(pluginsRootGuard, {
        reconcileSidecars: true,
      });
      return false;
    }
    await takeReuseStamp(root);
    let At = pt.degraded || isSessionRefsSyncEnabled(e) ? null : pluginListFingerprint(pt.plugins);
    let pluginsManifest = await readPluginsManifest(pluginsRootGuard);
    let hadManifest = pluginsManifest !== null;
    let plugins = pt.plugins;
    if (pt.degraded) {
      let Or = new Set(pt.plugins.map((plugin) => plugin.pluginId));
      plugins = [
        ...pt.plugins,
        ...(pluginsManifest?.plugins ?? []).filter(
          (Io) => !Or.has(Io.pluginId) && Io.requestedVersion === undefined,
        ),
      ];
    }
    if (we) {
      let Or = new Set(
        [...Et, ...(pluginsManifest?.plugins ?? [])].map((zo) => syncedItemKey(root, zo)).filter(Boolean),
      );
      let Io = new Set(plugins.filter((plugin) => Or.has(syncedItemKey(root, plugin))));
      plugins = [...Io, ...plugins.filter((plugin) => !Io.has(plugin))];
    }
    let Zt = new Set(Et.map((Or) => Or.pluginId));
    let rn = new Set(
      pt.plugins
        .filter((plugin) => plugin.installationPreference === "required")
        .map((plugin) => plugin.pluginId),
    );
    plugins = [
      ...plugins.filter((plugin) => Zt.has(plugin.pluginId)),
      ...plugins.filter((plugin) => !Zt.has(plugin.pluginId) && rn.has(plugin.pluginId)),
      ...plugins.filter((plugin) => !Zt.has(plugin.pluginId) && !rn.has(plugin.pluginId)),
    ];
    let { toDownload, toRemove, carryover, carryoverOwningLiveDir } = planPluginDownloads(
      root,
      plugins,
      pluginsManifest?.plugins ?? [],
    );
    let yn = new Set();
    let Kn = new Map();
    let results = await Promise.all(
      carryover.map(async (Or) => {
        if (!carryoverOwningLiveDir.has(Or.pluginId)) return false;
        try {
          let Io = itemInstallPath(root, Or);
          if (!(await lstat(Io)).isDirectory()) return true;
          let { serverPluginId } = await readPluginAttributionSidecar(Io);
          if (serverPluginId === undefined || serverPluginId === Or.pluginId) return false;
          Kn.set(Or.pluginId, serverPluginId);
          return true;
        } catch {
          return true;
        }
      }),
    );
    for (let [Or, Io] of carryover.entries()) {
      if (!results[Or]) continue;
      let found = pt.plugins.find((plugin) => plugin.pluginId === Io.pluginId);
      if (found) {
        yn.add(Io.pluginId);
        toDownload.push({
          item: found,
          prev: Io,
        });
      }
    }
    let filtered = carryover.filter((Or) => !yn.has(Or.pluginId));
    let filtered_2 = filtered.filter((Or) => carryoverOwningLiveDir.has(Or.pluginId));
    let liveEntryClassifier = createLiveEntryClassifier(
      new Set(manifestRowDirs(root, [...filtered_2, ...toDownload.map(({ item, prev }) => prev ?? item)])),
    );
    let rowDirNames = getRowDirNames(root, plugins);
    await Promise.all(pluginsSync.pendingTrashRemovals.splice(0));
    if ((await verifyGuardOrRefused(pluginsRootGuard)) === null)
      await rm_2(pluginReplaceTmpDir(root), {
        recursive: true,
        force: true,
      }).catch(() => {});
    let co = new Set(pluginsManifest?.staleDirs ?? []);
    let So = await removeStaleDirs(
      root,
      Array.from(co).filter((Or) => !pluginsSync.removalsDeferredHere.has(Or)),
      liveEntryClassifier,
      rowDirNames,
    );
    for (let Or of So) co.delete(Or);
    if (toDownload.length === 0 && toRemove.length === 0) {
      assertSyncRootAllowed(pluginsRootGuard);
      await reconcilePluginSidecars(pluginsRootGuard, filtered);
      assertSyncRootAllowed(pluginsRootGuard);
      registerDirsWithAttestations(root, filtered_2, yt);
      Se = true;
      pluginsSync.lastRoundListed = !pt.degraded;
      recordCompleteList(pluginsSync, syncBucket, root, pt);
      let Or = replaceRowsWithAttribution(
        pluginsManifest?.plugins ?? [],
        carryover,
        (Es) => Es.pluginId,
        (Es, Nr) =>
          Es.marketplaceName === Nr.marketplaceName &&
          Es.installationPreference === Nr.installationPreference &&
          Es.marketplaceKind === Nr.marketplaceKind,
      );
      let Io = !gt && !pt.degraded && !isSessionRefsSyncEnabled(e);
      let zo = Io && co.size === 0;
      let rs = appliedListIdsField(lt && pt.convertedSkillsAsPlugins === true, Io, Or.rows);
      if (
        (So.size > 0 ||
          Or.attributionMoved ||
          (lt && !sameIdSet(pluginsManifest?.appliedListIds, rs.appliedListIds))) &&
        pluginsManifest
      )
        await writePluginsManifest(
          pluginsRootGuard,
          {
            lastUpdated: pluginsManifest.lastUpdated,
            plugins: Or.rows,
            staleDirs: co.size > 0 ? Array.from(co) : undefined,
            ...rs,
          },
          {
            staleDirs: So,
            removedPluginIds: new Set(),
          },
        );
      await trashOrphanSyncedPluginDirs(pluginsRootGuard, plugins, pluginsSync.removalsDeferredHere);
      await trashStrayPluginBuckets();
      if (pluginsManifest) {
        let date = new Date();
        await lutimes(syncedManifestPath(root), date, date).catch(() => {});
      }
      await writeOrClearReuseStamp(root, "plugins", zo, null, reuseStampVariant(lt));
      logForDiagnosticsNoPII("info", "plugins_sync_no_changes", {
        count: carryover.length,
        duration_ms: Date.now() - now,
        list_ms: L,
        had_manifest: hadManifest,
        ...w(),
      });
      if (gt) {
        logFeatureSad("plugins_sync_round", "not_entitled", Ae());
        Ie = "not_entitled";
      } else if (pt.degraded) {
        logFeatureSad("plugins_sync_round", "list_degraded", Ae());
        Ie = "list_degraded";
      } else {
        logFeatureOk("plugins_sync_round", Ae());
        Ie = "ok";
      }
      e.pluginsSync.accountListing = gt ? "refused" : pt.degraded ? "pending" : "listed";
      pluginsSync.listedStamp = hasRemovalOwed(pluginsSync) ? null : At;
      return false;
    }
    let liveEntryClassifier_2 = createLiveEntryClassifier(
      new Set(manifestRowDirs(root, [...filtered_2, ...toDownload.map(({ item }) => item)])),
    );
    let un = 0;
    let ao = (Or, { oldCopy, heldTarget }) => {
      if (hasSyncedPluginLaneOpened()) {
        un++;
        pluginsSync.removalsDeferredHere.add(Or);
        return Promise.resolve(false);
      }
      if (Or === heldTarget) return Promise.resolve(false);
      return removeSyncedPluginDir(root, Or, liveEntryClassifier_2, oldCopy ? rowDirNames : undefined);
    };
    let $o = [];
    let yo = [];
    let Ho = new Set();
    let now_3 = Date.now();
    let br = env.CLAUDE_CODE_SYNC_PLUGINS_DOWNLOAD_CONCURRENCY ?? MAX_DEFERRED_RELIST_ROUNDS;
    let semaphore = createSemaphore(MAX_DEFERRED_RELIST_ROUNDS);
    await Promise.all(
      toDownload.map(
        limitConcurrency(br, async ({ item, prev }) => {
          let zo;
          try {
            zo = await promotePluginWithRetry(pluginsSync, pluginsRootGuard, item, prev, G, n, semaphore);
            if (!zo.ok)
              switch (zo.cause) {
                case "download":
                  logForDiagnosticsNoPII("warn", "plugins_sync_download_failed");
                  recordSyncError_2(pluginsSync, item, "network-error", zo.reason);
                  break;
                case "root_refused":
                case "extract":
                  recordSyncError_2(pluginsSync, item, "generic-error", zo.reason);
                  break;
                case "local":
                  recordSyncError_2(pluginsSync, item, "generic-error", zo.reason);
                  break;
                case "deferred":
                  logForDiagnosticsNoPII("warn", "plugins_sync_unexpected_landing_cause");
                  recordSyncError_2(pluginsSync, item, "generic-error", zo.reason);
                  break;
              }
          } catch (error) {
            let reason = printableMessage(error);
            zo = extractFailure(reason);
            logForDiagnosticsNoPII("warn", "plugins_sync_extract_failed");
            recordSyncError_2(pluginsSync, item, "generic-error", reason);
          }
          if (zo.ok) {
            let rs =
              zo.generation > 1
                ? {
                    ...item,
                    generation: zo.generation,
                  }
                : item;
            $o.push(rs);
            if (!prev) markSyncedPluginDirNewHere(itemInstallPath(root, rs));
            if (prev) {
              let Es = itemDirName(root, prev);
              if (
                Es !== itemDirName(root, rs) &&
                !(await ao(Es, {
                  oldCopy: true,
                  heldTarget:
                    zo.generation > 1
                      ? itemDirName(root, {
                          name: item.name,
                        })
                      : undefined,
                }))
              )
                co.add(Es);
            }
          } else if (prev && Kn.has(prev.pluginId)) {
            let rs = syncedItemKey(root, {
              ...prev,
              pluginId: Kn.get(prev.pluginId) ?? "",
            });
            if (!plugins.some((plugin) => syncedItemKey(root, plugin) === rs)) Ho.add(prev.pluginId);
          } else if (prev) yo.push(prev);
        }),
      ),
    );
    let downloadExtractMs = Date.now() - now_3;
    let downloadTimingTelemetry = getDownloadTimingTelemetry(G);
    await Promise.all(
      toRemove.map(
        limitConcurrency(MAX_DEFERRED_RELIST_ROUNDS, async (Or) => {
          let Io = itemDirName(root, Or);
          if (
            !(await ao(Io, {
              oldCopy: false,
            }))
          )
            co.add(Io);
        }),
      ),
    );
    if (un > 0)
      logForDiagnosticsNoPII("info", "plugins_sync_removal_deferred_loaded", {
        count: un,
      });
    Ee = $o.length > 0 || toRemove.length > 0;
    let _r = [...$o, ...yo, ...filtered];
    assertSyncRootAllowed(pluginsRootGuard);
    await reconcilePluginSidecars(pluginsRootGuard, _r);
    assertSyncRootAllowed(pluginsRootGuard);
    registerDirsWithAttestations(root, _r, yt, new Set($o));
    Se = true;
    pluginsSync.lastRoundListed = !pt.degraded;
    recordCompleteList(pluginsSync, syncBucket, root, pt);
    let Cr = !gt && !pt.degraded && !isSessionRefsSyncEnabled(e);
    let Vr = Cr && pluginsSync.syncErrors.length === 0 && co.size === 0;
    await writePluginsManifest(
      pluginsRootGuard,
      {
        lastUpdated: Date.now(),
        plugins: _r,
        staleDirs: co.size > 0 ? Array.from(co) : undefined,
        ...appliedListIdsField(
          lt && pt.convertedSkillsAsPlugins === true,
          Cr && pluginsSync.syncErrors.length === 0,
          _r,
        ),
      },
      {
        staleDirs: So,
        removedPluginIds: new Set([...toRemove.map((Or) => Or.pluginId), ...Ho]),
      },
    );
    await trashOrphanSyncedPluginDirs(pluginsRootGuard, plugins, pluginsSync.removalsDeferredHere);
    await trashStrayPluginBuckets();
    let Oo = w();
    logForDiagnosticsNoPII("info", "plugins_sync_complete", {
      downloaded: $o.length,
      removed: toRemove.length,
      failed: pluginsSync.syncErrors.length,
      duration_ms: Date.now() - now,
      list_ms: L,
      download_extract_ms: downloadExtractMs,
      download_concurrency: br,
      had_manifest: hadManifest,
      ...downloadTimingTelemetry,
      ...Oo,
    });
    logEvent("tengu_plugins_sync_success", {
      downloaded: $o.length,
      removed: toRemove.length,
      total: pt.plugins.length,
      duration_ms: Date.now() - now,
      list_ms: L,
      download_extract_ms: downloadExtractMs,
      download_concurrency: br,
      had_manifest: hadManifest,
      ...downloadTimingTelemetry,
      ...Oo,
    });
    await writeOrClearReuseStamp(root, "plugins", Vr, null, reuseStampVariant(lt));
    if (pluginsSync.syncErrors.length > 0) {
      logFeatureSad("plugins_sync_round", "download_failed", Ae());
      Ie = "download_failed";
    } else if (gt) {
      logFeatureSad("plugins_sync_round", "not_entitled", Ae());
      Ie = "not_entitled";
    } else if (pt.degraded) {
      logFeatureSad("plugins_sync_round", "list_degraded", Ae());
      Ie = "list_degraded";
    } else {
      logFeatureOk("plugins_sync_round", Ae());
      Ie = "ok";
    }
    e.pluginsSync.accountListing = gt ? "refused" : pt.degraded ? "pending" : "listed";
    let jr = pluginsSync.syncErrors.length === 0 && !hasRemovalOwed(pluginsSync);
    pluginsSync.listedStamp = jr ? At : null;
  } catch (error) {
    let We = w();
    let ze = {
      ...(L !== undefined && {
        list_ms: L,
      }),
      ...(G.downloadMs.length > 0 && getDownloadTimingTelemetry(G)),
    };
    if (!(error instanceof SyncOwnedRootRefusedError)) {
      logForDiagnosticsNoPII("error", "plugins_sync_unexpected_error", {
        kind: error instanceof Error ? error.constructor.name : "unknown",
        duration_ms: Date.now() - now,
        ...ze,
        ...We,
      });
      logEvent("tengu_plugins_sync_error", {
        duration_ms: Date.now() - now,
        ...ze,
        ...We,
      });
      logFeatureBad("plugins_sync_round", "unexpected_error", Ae());
      Ie = "unexpected_error";
    } else {
      logFeatureSad("plugins_sync_round", "root_refused", Ae());
      Ie = "root_refused";
    }
    if (error instanceof SyncOwnedRootRefusedError && Se) {
      logForDiagnosticsNoPII("warn", "plugins_sync_post_registration_refusal", {
        reason: error.reason,
      });
      logEvent("tengu_plugins_sync_root_refused", {
        reason: fromEnum(error.reason),
        phase: lit_2("post_registration"),
        duration_ms: Date.now() - now,
      });
      q = false;
    } else if (error instanceof SyncOwnedRootRefusedError) {
      logForDiagnosticsNoPII("warn", "plugins_sync_root_refused_fail_closed");
      logEvent("tengu_plugins_sync_root_refused", {
        reason: fromEnum(error.reason),
        phase: lit_2("head"),
        duration_ms: Date.now() - now,
      });
      let lt = tildify(join(getClaudeConfigDir(), "plugins"));
      pluginsSync.syncErrors.push({
        type: "generic-error",
        source: `${SYNCED}[root]`,
        error:
          error.reason === "unverified" || error.reason === "landing_unverified"
            ? `claude.ai plugin sync disabled this session: ${lt} could not be verified${error.code ? ` (${error.code})` : ""}`
            : error.reason === "landing_absent"
              ? `claude.ai plugin sync disabled this session: ${lt} was removed while a sync round was running`
              : `claude.ai plugin sync disabled this session: ${lt} is not a plain directory tree (a symlink or stray file is in the way)`,
      });
      setSyncedPluginDirs([]);
    } else if (!Se && Z !== null)
      await registerSyncedPluginDirs(Z, {
        reconcileSidecars: true,
      });
  } finally {
    if (Ee || syncedPluginDirsKey() !== y) getSyncedPluginReloadDebt().changesLanded++;
    S?.disable();
    if (Z === null || Z.guard.refused()) q = false;
    if (q && Z !== null) {
      let We = pluginReplaceTmpDir(Z.root);
      let root = Z.root;
      let claudeConfigDir = getClaudeConfigDir();
      let Je = Promise.all(pluginsSync.pendingTrashRemovals.splice(0)).then(async () => {
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
          await rm_2(We, {
            recursive: true,
            force: true,
          }).catch(() => {});
      });
      pluginsSync.pendingTrashRemovals.push(Je);
    }
    if (r) recordPluginsSyncRound(e, Ie);
  }
  return Ee;
}
//@ chunk-e6aww6q8.js:666154-666372 placement
function getDownloadTimingTelemetry(e) {
  return {
    ...getDownloadSizeTelemetry(e),
    download_ms_sum: e.downloadMs.reduce((acc, downloadM) => acc + downloadM, 0),
    download_ms_max: Math.max(0, ...e.downloadMs),
    extract_ms_sum: e.extractMs.reduce((acc, extractM) => acc + extractM, 0),
    extract_ms_max: Math.max(0, ...e.extractMs),
  };
}
//@ chunk-e6aww6q8.js:666372-666704 placement
/**
 * 从清单登记已同步插件目录与认证信息（可先对齐 sidecar）；根被拒时按关闭失败处理并清空。
 */
async function registerSyncedPluginDirs(pluginsRootGuard, { reconcileSidecars }) {
  let pluginsManifest = await readPluginsManifest(pluginsRootGuard);
  if (!pluginsManifest) return;
  if (reconcileSidecars) await reconcilePluginSidecars(pluginsRootGuard, pluginsManifest.plugins);
  if (pluginsRootGuard.guard.refusedReason() !== null) {
    logForDiagnosticsNoPII("warn", "plugins_sync_root_refused_fail_closed");
    setSyncedPluginDirs([]);
    return;
  }
  let s = mapRowsToDirs(pluginsRootGuard.root, pluginsManifest.plugins);
  let mapped = s.map(({ dir }) => dir);
  let y = new Map();
  for (let S of mapped) {
    let syncedPluginAttestation = getSyncedPluginAttestation(S);
    if (syncedPluginAttestation !== undefined) y.set(S, syncedPluginAttestation);
  }
  setSyncedPluginDirs(mapped, y, dirToPluginIdMap(s));
}
//@ chunk-e6aww6q8.js:666704-666765 placement
/**
 * 列出已同步插件的目录。
 */
async function listSyncedPluginDirsOnly(e) {
  return (await listSyncedPluginDirs(e)).map(({ dir }) => dir);
}
//@ chunk-e6aww6q8.js:666765-666910 placement
async function listSyncedPluginDirs(e) {
  let syncedPluginsState = await readSyncedPluginsState(e);
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
async function findInstalledSyncedPlugins(e, n) {
  let bucketState = await readBucketState(e);
  if (!bucketState?.manifest) return null;
  let filtered = mapRowsToDirs(bucketState.root, bucketState.manifest.plugins).filter(({ row }) =>
    n.has(row.pluginId),
  );
  let results = await Promise.all(
    filtered.map(({ dir }) =>
      lstat(dir).then(
        (S) => S.isDirectory(),
        (error) => (isENOENT(error) ? false : null),
      ),
    ),
  );
  if (results.includes(null)) return null;
  return new Set(filtered.flatMap(({ row }, S) => (results[S] ? [row.pluginId] : [])));
}
//@ chunk-e6aww6q8.js:667237-667378 placement
/**
 * 已应用的插件列表是否与清单中的插件一致。
 */
async function isAppliedListCurrent(e) {
  let manifest = (await readSyncedPluginsState(e))?.manifest;
  return (
    manifest?.appliedListIds !== undefined &&
    sameIdSet(
      manifest.appliedListIds,
      manifest.plugins.map((plugin) => plugin.pluginId),
    )
  );
}
//@ chunk-e6aww6q8.js:667378-667518 placement
async function readSyncedPluginsState(e) {
  if (isDiskless()) return null;
  let syncBucket = await getSyncBucket(e);
  if (syncBucket === null) {
    logForDiagnosticsNoPII("info", "plugins_sync_bucket_unresolved");
    return null;
  }
  return readBucketState(syncBucket);
}
//@ chunk-e6aww6q8.js:667518-667883 placement
/**
 * 读取插件同步桶状态：同步根与回收根都校验通过且桶有标记时返回根与清单，否则 null。
 */
async function readBucketState(e) {
  if (isDiskless()) return null;
  let n = syncedPluginBucketDir(e);
  let r = {
    event: "plugins_sync_root_refused",
    phase: "read",
  };
  let [s, h] = await Promise.all([
    verifySyncRoot(
      n,
      getClaudeConfigDir(),
      {
        ...r,
        rootLabel: SKILLS_SYNCED_STAGING,
      },
      {
        checkStagingLeaf: true,
      },
    ).catch(() => null),
    verifySyncRoot(pluginsTrashRoot(), getClaudeConfigDir(), {
      ...r,
      rootLabel: PLUGINS_SYNC_DIR,
    }).catch(() => null),
  ]);
  if (s !== "real" || (h !== "real" && h !== "absent") || !(await hasSyncMarker(syncedPluginsRoot(), e)))
    return null;
  return {
    root: n,
    manifest: await readPluginsManifest(createPluginsRootGuard(n)),
  };
}
//@ chunk-e6aww6q8.js:667883-668076 placement
async function getRegisteredSyncedDirs(e) {
  let syncedPluginDirs = getSyncedPluginDirs();
  if (syncedPluginDirs.length === 0) return syncedPluginDirs;
  let syncBucket = await getSyncBucket(e);
  if (syncBucket === null) {
    logForDiagnosticsNoPII("info", "plugins_sync_bucket_unresolved");
    return [];
  }
  let s = syncedPluginBucketDir(syncBucket);
  return syncedPluginDirs.every((syncedPluginDir) => dirname(syncedPluginDir) === s)
    ? syncedPluginDirs
    : null;
}
//@ chunk-e6aww6q8.js:668076-668207 placement
/**
 * 尚未登记时，读取同步插件目录并登记目录及其插件 id。
 */
async function ensureSyncedPluginDirsRegistered() {
  if (hasRegisteredSyncedPluginDirs()) return;
  let e = await listSyncedPluginDirs();
  setSyncedPluginDirs(
    e.map(({ dir }) => dir),
    undefined,
    new Map(e.map(({ dir, pluginId }) => [dir, pluginId])),
  );
}
//@ chunk-e6aww6q8.js:668207-668635 placement
/**
 * 删除已同步插件目录：保留拼写不删；正在使用或有在线会话时推迟；否则移入回收区并删除元数据文件。返回是否已删除。
 */
async function removeSyncedPluginDir(root, n, r, s) {
  let h;
  try {
    h = syncedItemPath_2(n, root);
  } catch (error) {
    if (error instanceof LegacyReservedSpellingError) return false;
    return true;
  }
  if (r) {
    let S = await r(h);
    if (S === "live") return true;
    if (S === "indeterminate") return false;
  }
  if (s !== undefined && (await isRegisteredLivePluginDir(h, n, s))) {
    logForDiagnosticsNoPII("info", "plugins_sync_removal_deferred_live_session");
    return false;
  }
  let y = await checkSyncRoots({
    dir: h,
    trashRoot: pluginsTrashRoot(),
    configHome: getClaudeConfigDir(),
    failureEvent: "plugins_sync_trash_move_failed",
  });
  if (y)
    await rm_2(h + PLUGIN_META_SUFFIX, {
      force: true,
    }).catch(() => {});
  return y;
}
//@ chunk-e6aww6q8.js:668635-668775 placement
async function isPluginDirInUse(e) {
  return isPluginVersionInUse(e, {
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
async function isRegisteredLivePluginDir(e, n, r) {
  return r.has(stripInvisibleChars_3(stripGenerationSuffix(n))) && (await isPluginDirInUse(e));
}
//@ chunk-e6aww6q8.js:668840-669339 placement
/**
 * 记录最近一次完整列表（每个插件的目录集合与待删除目录），用于后续清理已下架的插件目录。
 */
function recordCompleteList(pluginsSync, syncBucket, root, s) {
  if (s.degraded) return;
  let lastCompleteList = pluginsSync.lastCompleteList;
  let y = lastCompleteList !== null && lastCompleteList.bucket === syncBucket ? lastCompleteList : null;
  let S = y?.dirsById ?? new Map();
  let w = new Map();
  for (let plugin of s.plugins)
    w.set(plugin.pluginId, new Set([...(S.get(plugin.pluginId) ?? []), ...getRowDirNames(root, [plugin])]));
  let L = new Set([
    ...Array.from(S).flatMap(([Z, Se]) => (w.has(Z) ? [] : Array.from(Se))),
    ...(y?.removalOwed ?? []),
  ]);
  let listedDirs = new Set(Array.from(w.values()).flatMap((Z) => Array.from(Z)));
  let q = removeDelistedSkillHooks({
    bucket: syncBucket,
    delistedDirs: L,
    listedDirs,
  });
  pluginsSync.lastCompleteList = {
    bucket: syncBucket,
    dirsById: w,
    removalOwed: q ? new Set() : L,
  };
}
//@ chunk-e6aww6q8.js:669339-669449 placement
function getRowDirNames(root, plugins) {
  return new Set(
    plugins.flatMap(({ name: r }) => {
      try {
        return [
          stripInvisibleChars_3(
            basename(
              itemInstallPath(root, {
                name: r,
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
async function removeStaleDirs(root, n, liveEntryClassifier, rowDirNames) {
  let h = new Set();
  for (let y of n) {
    if (isSyncedPluginDirLoadedHere(join(root, y))) continue;
    if (await removeSyncedPluginDir(root, y, liveEntryClassifier, rowDirNames)) h.add(y);
  }
  return h;
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
  let n = 0;
  for (let r of strays)
    if (
      await checkSyncRoots({
        dir: join(syncedPluginsRoot(), r),
        trashRoot: pluginsTrashRoot(),
        configHome: getClaudeConfigDir(),
        failureEvent: "plugins_sync_trash_move_failed",
      })
    )
      n++;
  if (n > 0)
    logForDiagnosticsNoPII("info", "plugins_sync_stray_entry_trashed", {
      count: n,
    });
  return n;
}
//@ chunk-e6aww6q8.js:670334-670424 placement
/**
 * 清理多余（已下架）的插件桶目录。
 */
async function trashStrayPluginBuckets() {
  let e = await listPluginBuckets();
  if (e !== null && e.strays.length > 0) await trashStrayEntries(e.strays);
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
  let e = await listPluginBuckets();
  if (!e) return false;
  setSyncedPluginDirs([]);
  let n = 0;
  let retained = 0;
  for (let bucket of e.buckets) {
    let h = syncedPluginBucketDir(bucket);
    await rm_2(join(h, MARKETPLACES_JSON_FILE), {
      force: true,
    }).catch(() => {});
    for (let we of await readdir(h).catch(() => []))
      if (isClaudeAiMarketplaceFile(we))
        await rm_2(join(h, we), {
          force: true,
        }).catch(() => {});
    await rm_2(lastCompleteRoundPath(h), {
      force: true,
    }).catch(() => {});
    let bucketRound = await readBucketRound(bucket);
    if (!bucketRound) continue;
    let { round, manifest } = bucketRound;
    let root = round.root;
    let G = [];
    let q = new Set();
    for (let plugin of manifest.plugins)
      if (await removeSyncedPluginDir(root, itemDirName(root, plugin))) q.add(plugin.pluginId);
      else G.push(plugin);
    let Z = new Set(manifest.staleDirs ?? []);
    let Se = await removeStaleDirs(root, Z);
    for (let we of Se) Z.delete(we);
    let ke = await trashOrphanSyncedPluginDirs(round, [], null);
    n += q.size + Se.size + ke;
    if (G.length > 0 || Z.size > 0) {
      retained += G.length + Z.size;
      await writePluginsManifest(
        round,
        {
          lastUpdated: manifest.lastUpdated,
          plugins: G,
          staleDirs: Z.size > 0 ? Array.from(Z) : undefined,
        },
        {
          staleDirs: Se,
          removedPluginIds: q,
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
  n += await trashStrayEntries([...e.strays, ...e.unreadable]);
  await rmdir(syncedPluginsRoot()).catch(() => {});
  logForDiagnosticsNoPII("info", "plugins_sync_pruned_for_closed_gate", {
    moved: n,
    retained,
  });
  return n > 0;
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
    for (let q of removed) staleDirs.delete(q);
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
async function trashOrphanSyncedPluginDirs(e, plugins, removalsDeferredHere) {
  if (!(await e.guard.verify())) return 0;
  let root = e.root;
  let pluginsManifest = await readPluginsManifest(e);
  if (!pluginsManifest) return 0;
  let y = new Set(
    [
      ...[
        ...pluginsManifest.plugins,
        ...plugins.map(({ name: q }) => ({
          name: q,
        })),
      ].flatMap((q) => {
        try {
          return [basename(itemInstallPath(root, q))];
        } catch {
          return [];
        }
      }),
      ...(pluginsManifest.staleDirs ?? []),
    ].map(stripInvisibleChars_3),
  );
  let S;
  try {
    S = await readdir(root, {
      withFileTypes: true,
    });
  } catch {
    return 0;
  }
  let mapped = S.filter(
    (q) => q.isDirectory() && !isHiddenFoldName(q.name) && !y.has(stripInvisibleChars_3(q.name)),
  ).map((q) => q.name);
  if (mapped.length === 0) return 0;
  if (hasSyncedPluginLaneOpened()) {
    await writePluginsManifest(
      e,
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
    for (let q of mapped) removalsDeferredHere?.add(q);
    logForDiagnosticsNoPII("info", "plugins_sync_orphan_dir_deferred", {
      count: mapped.length,
    });
    return 0;
  }
  let L = 0;
  let rowDirNames = getRowDirNames(root, plugins);
  for (let q of mapped) {
    if (await isRegisteredLivePluginDir(join(root, q), q, rowDirNames)) continue;
    if (
      await checkSyncRoots({
        dir: join(root, q),
        trashRoot: pluginsTrashRoot(),
        configHome: getClaudeConfigDir(),
        failureEvent: "plugins_sync_trash_move_failed",
      })
    ) {
      L++;
      await rm_2(join(root, q) + PLUGIN_META_SUFFIX, {
        force: true,
      }).catch(() => {});
    }
  }
  if (L > 0)
    logForDiagnosticsNoPII("info", "plugins_sync_orphan_dir_trashed", {
      count: L,
    });
  return L;
}
//@ chunk-e6aww6q8.js:673261-673312 placement
/**
 * 把清单行映射为目录列表。
 */
function manifestRowDirs(root, n) {
  return mapRowsToDirs(root, n).map(({ dir }) => dir);
}
//@ chunk-e6aww6q8.js:673312-673472 placement
function mapRowsToDirs(root, plugins) {
  let r = new Map();
  for (let s of plugins) {
    let h;
    try {
      h = itemInstallPath(root, s);
    } catch {
      continue;
    }
    let y = stripInvisibleChars_3(h);
    if (!r.has(y))
      r.set(y, {
        dir: h,
        row: s,
      });
  }
  return Array.from(r.values());
}
//@ chunk-e6aww6q8.js:673472-673719 placement
function registerDirsWithAttestations(root, n, r, s = new Set()) {
  let h = mapRowsToDirs(root, n);
  let y = new Map();
  for (let { dir, row } of h) {
    let L = r.get(row.pluginId);
    if (
      L !== undefined &&
      row.name === L.rowName &&
      (row.generation === undefined || s.has(row) || getSyncedPluginAttestation(dir) !== undefined)
    )
      y.set(dir, L.attestation);
  }
  setSyncedPluginDirs(
    h.map(({ dir }) => dir),
    y,
    dirToPluginIdMap(h),
  );
}
//@ chunk-e6aww6q8.js:673719-673790 placement
/**
 * 目录 → 插件 id 的映射，用于登记已同步目录。
 */
function dirToPluginIdMap(e) {
  return new Map(e.map(({ dir, row }) => [dir, row.pluginId]));
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
