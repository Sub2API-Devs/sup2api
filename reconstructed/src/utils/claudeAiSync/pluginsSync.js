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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
  rename,
  rename as rename_2,
  rename as rename_3,
  rename as rename_4,
  rename as rename_5,
  rename as rename_6,
  rename as rename_7,
  lutimes,
  lutimes as lutimes_2,
  lutimes as lutimes_3,
  lutimes as lutimes_4,
  lutimes as lutimes_5,
  lutimes as lutimes_6,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  rmdir,
  rmdir as rmdir_2,
  rmdir as rmdir_3,
  rmdir as rmdir_4,
  rmdir as rmdir_5,
  rmdir as rmdir_6,
  rmdir as rmdir_7,
} from "fs/promises";
import { monitorEventLoopDelay } from "perf_hooks";
import { getClaudeConfigDir } from "../envUtils.js";
import {
  cU,
  SYNCED_MANIFEST_FILE,
  LFe,
  Cte,
  syncedItemPath,
  pZo,
  stripInvisibleChars as stripInvisibleChars_3,
  getSyncBucket,
  syncedItemPath_2,
  LegacyReservedSpellingError,
  DFe,
  WYe,
  MJ,
  m5t,
  isClaudeAiMarketplaceFile,
} from "../plugins/syncedItems.js";
import {
  checkSyncOwnedRoot,
  readSyncMarker,
  checkSyncRoots,
  toPosixLabelPath,
  SyncOwnedRootRefusedError,
  touchExclusive,
  DUr,
  ROOT_REFUSED_RESULT,
  MUr,
  LUr,
  W6n,
  G6n,
  buildLocalPlacementFailure,
  zun,
  verifySyncRoot,
  E2e,
} from "./syncOwnedRoot.js";
import { serializeCalls } from "../promiseQueue.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { kt, o, E, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { fdr, pdr } from "../plugins/marketplaceNames.js";
import { getErrnoCode, isENOENT } from "../errors.js";
import {
  readManifestText,
  parseManifestJson,
  parseValidRows,
  uet,
  omitKeys_2,
  mergeManifestRows,
  mergeStaleDirs,
  Xfe,
  planSyncDownloads,
  readReuseStamp,
  QLt,
  Jbt,
  isSkillsAsPluginsActive,
  checkReuseWindow,
  fBr,
  scheduleDeferredRelist,
  mergeRowsByKey,
  y3n,
  replaceRowsWithAttribution,
  dfn,
  JLt,
  Ybt,
  K1t,
} from "./skillsSync.js";
import { writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
import { jsonStringify } from "../slowOperations.js";
import {
  PLUGIN_META_SUFFIX,
  isServerPluginId,
  lZo,
  SERVER_PLUGIN_ID,
  MARKETPLACE_NAME,
  INSTALLATION_PREFERENCE,
  MARKETPLACE_KIND,
  dZo,
  readPluginAttributionSidecar,
} from "../plugins/pluginAttribution.js";
import { readSmallFileOrNull } from "../readSmallFile.js";
import { limitConcurrency, createSemaphore } from "../concurrencyLimit.js";
import { ifn, createLiveEntryClassifier } from "../plugins/fileIdentity.js";
import { ALLOWED_OFFICIAL_MARKETPLACE_NAMES } from "../plugins/schemas.js";
import { makeTempZipPath, unzipPluginCache } from "../plugins/zipCache.js";
import {
  B5r,
  pluginDownloadPath,
  listAccountPlugins,
  listErrorTelemetry,
  pluginListFingerprint,
} from "../../services/plugins/accountSync/listPlugins.js";
import { qm } from "../plugins/cacheUtils.js";
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
import { pes } from "../startupTiming.js";
import { mn } from "../remoteEnvironment.js";
import { isDatadogAllowed } from "../hostEnvironment.js";
import {
  _rr,
  wie,
  gii,
  Hkt,
  Hee,
  eot,
  removeDelistedSkillHooks,
  $5r,
  Srr,
} from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isSessionRefsSyncEnabled } from "./sessionRefsGate.js";
import { zqe } from "../../services/plugins/accountSync/sessionSkillManifest.js";
import { env } from "../env.js";
import { logEvent } from "../../services/analytics/index.js";
import { printableMessage } from "../printableName.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { tildify } from "../path.js";
import { isPluginVersionInUse } from "../plugins/inUseMarkers.js";

//@ chunk-e6aww6q8.js:647465-647498 placement
function Ob() {
  return join_19(getClaudeConfigDir(), cU);
}
//@ chunk-e6aww6q8.js:647498-647532 placement
function Bue(e) {
  return join_19(Ob(), e);
}
//@ chunk-e6aww6q8.js:647532-647563 placement
function M8(e) {
  return join_19(e, SYNCED_MANIFEST_FILE);
}
//@ chunk-e6aww6q8.js:647563-647597 placement
function RD() {
  return join_19(getClaudeConfigDir(), LFe);
}
//@ chunk-e6aww6q8.js:647597-647710 placement
function checkPluginsSyncRoot(e) {
  return checkSyncOwnedRoot({
    root: e,
    trashRoot: RD(),
    configHome: getClaudeConfigDir(),
    events: { refused: "plugins_sync_root_refused" },
  });
}
//@ chunk-e6aww6q8.js:647710-647806 placement
function ufn(e, n) {
  let pluginsSync = e.pluginsSync;
  return (
    (pluginsSync.ensureBucketRoot ??= serializeCalls(preparePluginsBucket)),
    pluginsSync.ensureBucketRoot(n)
  );
}
/**
 * 插件同步轮开始前准备桶目录：未标记但存在的目录先隔离到回收区；校验同步根；标记文件不可读时拒绝；最后创建标记。
 */
//@ chunk-e6aww6q8.js:647806-648326 placement
async function preparePluginsBucket(e) {
  let bucketDir = Bue(e),
    markerState = await readSyncMarker(Ob(), e);
  if (
    markerState === "unmarked" &&
    (await lstat_9(bucketDir).then(
      (s) => s.isDirectory(),
      () => !1,
    )) &&
    (await checkSyncRoots({
      dir: bucketDir,
      trashRoot: RD(),
      configHome: getClaudeConfigDir(),
      failureEvent: "plugins_sync_trash_move_failed",
    }).catch(() => !1))
  )
    logForDiagnosticsNoPII("info", "plugins_sync_unmarked_bucket_quarantined");
  if ((await checkPluginsSyncRoot(bucketDir), typeof markerState === "object"))
    throw (
      logForDiagnosticsNoPII("warn", "plugins_sync_root_refused", {
        phase: "round_head",
        root: toPosixLabelPath(join_19(cU, e)),
        component: "marker",
        reason: "unverified",
        code: markerState.unreadable,
      }),
      new SyncOwnedRootRefusedError("unverified", { code: markerState.unreadable })
    );
  await touchExclusive(Ob(), e);
}
/**
 * 已同步插件清单行（ID、名称、版本、更新时间、市场信息、代数等）与清单文件的 schema。
 */
//@ chunk-e6aww6q8.js:648326-648875 placement
var syncedPluginRowSchema = DoctorLazy(() =>
    kt({
      pluginId: o(),
      name: o(),
      description: o().catch(""),
      version: o().nullable().catch(null),
      updatedAt: o().nullable().catch(null),
      requestedVersion: o()
        .optional()
        .catch(void 0),
      marketplaceName: o()
        .optional()
        .catch(void 0),
      installationPreference: fdr()
        .optional()
        .catch(void 0),
      marketplaceKind: pdr()
        .optional()
        .catch(void 0),
      presentsAs: o()
        .optional()
        .catch(void 0),
      generation: E()
        .int()
        .min(2)
        .optional()
        .catch(void 0),
    }),
  ),
  pluginsManifestSchema = DoctorLazy(() =>
    kt({
      lastUpdated: E().catch(0),
      plugins: oe().optional(),
      staleDirs: oe().optional(),
      appliedListIds: oe().optional(),
    }),
  );
//@ chunk-e6aww6q8.js:648875-648984 placement
async function isManifestReadableOrAbsent(e) {
  if ((await readPluginsManifest(e)) !== null) return !0;
  return lstat_9(M8(e.root)).then(
    () => !1,
    (n) => getErrnoCode(n) === "ENOENT",
  );
}
/**
 * 读取插件同步清单（首次读取失败时记诊断），解析插件行、过期目录与已应用列表 ID。
 */
//@ chunk-e6aww6q8.js:648984-649370 placement
async function readPluginsManifest(e) {
  let n = !e.manifestRead;
  e.manifestRead = !0;
  let r = await readManifestText(M8(e.root), n ? "plugins_sync_manifest_unreadable" : null);
  if (r === null) return null;
  let s = parseManifestJson(r, pluginsManifestSchema(), n ? "plugins_sync_manifest_unreadable" : null);
  if (s === null) return null;
  let { plugins: plugins, staleDirs: staleDirs, appliedListIds: appliedListIds, ...w } = s;
  return {
    ...w,
    plugins: parseValidRows(syncedPluginRowSchema(), plugins),
    staleDirs: uet(staleDirs),
    ...(Array.isArray(appliedListIds) && { appliedListIds: uet(appliedListIds) }),
  };
}
/**
 * 写入插件同步清单：校验根，合并旧清单字段与新内容，按新顺序排列插件行，合并过期目录，可选沿用已应用列表 ID。
 */
//@ chunk-e6aww6q8.js:649370-649868 placement
async function writePluginsManifest(e, n, r) {
  (w8(e), await checkPluginsSyncRoot(e.root));
  let s = await readPluginsManifest(e),
    h = parseValidRows(syncedPluginRowSchema(), n.plugins),
    y = new Map(h.map((S, w) => [S.pluginId, w]));
  await writeFileAtomic_2(
    M8(e.root),
    jsonStringify(
      {
        ...omitKeys_2(s, ["lastUpdated", "plugins", "staleDirs", "appliedListIds", "askedListIds"]),
        ...(r.carryAppliedListIds && { appliedListIds: s?.appliedListIds }),
        ...n,
        plugins: mergeManifestRows(h, s?.plugins, (S) => S.pluginId, r.removedPluginIds).toSorted(
          (S, w) => (y.get(S.pluginId) ?? h.length) - (y.get(w.pluginId) ?? h.length),
        ),
        staleDirs: mergeStaleDirs(n.staleDirs, s?.staleDirs, r.staleDirs),
      },
      null,
      2,
    ),
  );
}
//@ chunk-e6aww6q8.js:649868-649921 placement
function Jfe(e) {
  return join_19(e, Cte, String(process.pid));
}
//@ chunk-e6aww6q8.js:649921-649954 placement
function BUe(e, n) {
  return syncedItemPath(n, e);
}
//@ chunk-e6aww6q8.js:649954-650008 placement
function YP(e, n) {
  return pZo(n.name, n.generation ?? 1, e);
}
//@ chunk-e6aww6q8.js:650008-650069 placement
function b8(e, n) {
  try {
    return basename_6(YP(e, n));
  } catch {
    return n.name;
  }
}
//@ chunk-e6aww6q8.js:650069-650858 placement
async function writeSyncedPluginSidecar(e, n) {
  let { pluginId: pluginId } = n,
    s;
  try {
    s = YP(e, n) + PLUGIN_META_SUFFIX;
  } catch {
    return;
  }
  try {
    let h = await lstat_9(s).catch(() => null);
    if (h !== null && !h.isFile())
      if (h.isDirectory())
        await checkSyncRoots({
          dir: s,
          trashRoot: RD(),
          configHome: getClaudeConfigDir(),
          failureEvent: "plugins_sync_trash_move_failed",
        });
      else await rm_9(s, { force: !0 });
    if (isServerPluginId(pluginId)) {
      let y = n.marketplaceName !== void 0 && lZo(n.marketplaceName);
      if (n.marketplaceName !== void 0 && !y)
        logForDiagnosticsNoPII("warn", "plugins_sync_sidecar_invalid_marketplace_name");
      let S = jsonStringify({
        [SERVER_PLUGIN_ID]: pluginId,
        ...(y && { [MARKETPLACE_NAME]: n.marketplaceName }),
        ...(n.installationPreference !== void 0 && { [INSTALLATION_PREFERENCE]: n.installationPreference }),
        ...(n.marketplaceKind !== void 0 && { [MARKETPLACE_KIND]: n.marketplaceKind }),
      });
      if ((await readSmallFileOrNull(s, dZo)) === S) return;
      await writeFileAtomic_2(s, S);
    } else (logForDiagnosticsNoPII("warn", "plugins_sync_sidecar_invalid_id"), await rm_9(s, { force: !0 }));
  } catch {
    logForDiagnosticsNoPII("warn", "plugins_sync_sidecar_write_failed");
  }
}
//@ chunk-e6aww6q8.js:650858-651091 placement
async function reconcilePluginSidecars(e, n) {
  if (!(await e.guard.verify())) return;
  let r = new Map();
  for (let s of n) {
    let h;
    try {
      h = YP(e.root, s);
    } catch {
      continue;
    }
    let y = stripInvisibleChars_3(h);
    if (!r.has(y)) r.set(y, s);
  }
  await Promise.all(
    Array.from(
      r.values(),
      limitConcurrency(Xfe, (s) => writeSyncedPluginSidecar(e.root, s)),
    ),
  );
}
//@ chunk-e6aww6q8.js:651091-651188 placement
async function ZLt(e, n, r) {
  try {
    let s = YP(e, n);
    return basename_6(s) === basename_6(r) || (await ifn(s, r));
  } catch {
    return !1;
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
    requestedVersion: e.version || void 0,
  };
}
//@ chunk-e6aww6q8.js:651357-651584 placement
function collectOfficialAttestations(e) {
  let n = new Map();
  for (let r of e)
    if (
      r.isOfficial === !0 &&
      r.marketplaceName !== void 0 &&
      ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(r.marketplaceName)
    )
      n.set(r.id, {
        attestation: { marketplace: r.marketplaceName, pluginName: r.name },
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
function planPluginDownloads(e, n, r) {
  return planSyncDownloads(n, r, {
    idOf: (s) => s.pluginId,
    dirFor: (s) => BUe(e, s),
    invalidNameTag: "plugins_sync_invalid_name",
    collisionTag: "plugins_sync_name_collision",
    carry: carryMarketplaceInfo,
  });
}
//@ chunk-e6aww6q8.js:651907-651988 placement
function Yfe(e, n) {
  try {
    return `${n.pluginId}/${stripInvisibleChars_3(BUe(e, n.name))}`;
  } catch {
    return "";
  }
}
//@ chunk-e6aww6q8.js:651988-652035 placement
function CUe(e) {
  return e ? "converted-skills" : "";
}
//@ chunk-e6aww6q8.js:652035-652110 placement
function eNt(e, n, r) {
  return e && n ? { appliedListIds: r.map((s) => s.pluginId) } : {};
}
//@ chunk-e6aww6q8.js:652110-652240 placement
function sameIdSet(e, n) {
  if (e === void 0 || n === void 0) return e === n;
  let r = new Set(n);
  return new Set(e).size === r.size && e.every((s) => r.has(s));
}
//@ chunk-e6aww6q8.js:652240-652323 placement
async function myo(e, n) {
  return ((await readReuseStamp(e))?.listedFor.includes(CUe(!0)) === !0) === n;
}
//@ chunk-e6aww6q8.js:652323-652425 placement
function createPluginsRootGuard(e) {
  return DUr({
    root: () => e,
    configHome: getClaudeConfigDir,
    rootLabel: cU,
    event: "plugins_sync_root_refused",
  });
}
//@ chunk-e6aww6q8.js:652425-652486 placement
async function AUe(e) {
  return (await e.guard.verify()) ? null : ROOT_REFUSED_RESULT;
}
//@ chunk-e6aww6q8.js:652486-652556 placement
function w8(e) {
  let refusedReason = e.guard.refusedReason();
  if (refusedReason !== null) throw MUr(refusedReason);
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
var gyo = 16;
/**
 * 把下载好的同步插件提升为正式安装，处理占位目录冲突。
 */
//@ chunk-e6aww6q8.js:652760-655170 placement
async function promoteSyncedPlugin(e, n, r, s, h, y, S) {
  let root = n.root,
    L = BUe(root, r.name),
    G = join_19(Jfe(root), relative_8(root, L)),
    q = makeTempZipPath(),
    Z;
  try {
    if (n.guard.refused()) return ROOT_REFUSED_RESULT;
    let now = Date.now(),
      ke = await B5r(r.pluginId, q, r.requestedVersion, { isBackground: !0, credentials: y });
    if ((h.downloadMs.push(Date.now() - now), !ke.ok)) return LUr(ke.reason);
    let we = (await lstat_9(q).catch(() => null))?.size ?? 0;
    if (((h.zipBytes += we), r.marketplaceKind === "anthropic_catalog")) h.anthropicCatalogZipBytes += we;
    Z = await S.acquire();
    let Ee = await AUe(n);
    if (Ee !== null) return Ee;
    let now_2 = Date.now();
    try {
      let Ie = await unzipPluginCache(q, G);
      if (!Ie.ok) return W6n("extracted tree carries a bare-repo layout");
      let root_2 = Ie.root,
        We = await AUe(n);
      if (We !== null) return We;
      await rm_9(join_19(root_2, qm), { recursive: !0, force: !0 });
      let ze = hasSyncedPluginLaneOpened();
      if (ze || (await isPluginDirInUse(L))) {
        let nt = s !== void 0 && s.name === r.name ? (s.generation ?? 1) : void 0,
          pt = 0;
        for (let Et = 1; pt < gyo; Et++) {
          if (Et === nt) continue;
          pt++;
          try {
            return (await rename_3(root_2, pZo(r.name, Et, root)), { ok: !0, generation: Et });
          } catch (error) {
            let gt = getErrnoCode(error);
            if (!G6n(gt))
              return (
                logForDiagnosticsNoPII("warn", "plugins_sync_promotion_failed", {
                  code: gt ?? "unknown",
                  restored: !1,
                }),
                buildLocalPlacementFailure(gt)
              );
          }
        }
        if (ze)
          return (
            logForDiagnosticsNoPII("warn", "plugins_sync_occupant_displace_failed", {
              code: "generations_occupied",
            }),
            zun
          );
        logForDiagnosticsNoPII("warn", "plugins_sync_held_copy_displaced");
      }
      try {
        return (await rename_3(root_2, L), { ok: !0, generation: 1 });
      } catch (error) {
        let pt = getErrnoCode(error);
        if (!G6n(pt))
          return (
            logForDiagnosticsNoPII("warn", "plugins_sync_promotion_failed", {
              code: pt ?? "unknown",
              restored: !1,
            }),
            buildLocalPlacementFailure(pt)
          );
      }
      let lt = s !== void 0 && (await ZLt(root, s, L));
      if (!lt) {
        for (let nt of (await readPluginsManifest(n))?.plugins ?? [])
          if (nt.pluginId === r.pluginId && (await ZLt(root, nt, L))) {
            lt = !0;
            break;
          }
      }
      let Je;
      if (lt) {
        Je = join_19(Jfe(root), `.replaced-${process.pid}-${Math.random().toString(36).slice(2)}`);
        try {
          await rename_3(L, Je);
        } catch (error) {
          return (
            logForDiagnosticsNoPII("warn", "plugins_sync_occupant_displace_failed", {
              code: getErrnoCode(error) ?? "unknown",
            }),
            zun
          );
        }
      } else if (
        !(await checkSyncRoots({
          dir: L,
          trashRoot: RD(),
          configHome: getClaudeConfigDir(),
          failureEvent: "plugins_sync_trash_move_failed",
        }))
      )
        return zun;
      try {
        await rename_3(root_2, L);
      } catch (error) {
        let pt =
          Je === void 0
            ? !1
            : await rename_3(Je, L).then(
                () => !0,
                () => !1,
              );
        return (
          logForDiagnosticsNoPII("warn", "plugins_sync_promotion_failed", {
            code: getErrnoCode(error) ?? "unknown",
            restored: pt,
          }),
          buildLocalPlacementFailure(getErrnoCode(error))
        );
      }
      if (Je !== void 0) e.pendingTrashRemovals.push(rm_9(Je, { recursive: !0, force: !0 }).catch(() => {}));
      return { ok: !0, generation: 1 };
    } finally {
      h.extractMs.push(Date.now() - now_2);
    }
  } finally {
    if (
      (Z?.(),
      await rm_9(q, { force: !0 }).catch(() => {}),
      !n.guard.refused() &&
        (await verifySyncRoot(
          root,
          getClaudeConfigDir(),
          { event: "plugins_sync_root_refused", phase: "sweep", rootLabel: cU },
          { checkStagingLeaf: !0 },
        ).catch(() => null)) === "real")
    )
      await rm_9(G, { recursive: !0, force: !0 }).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:655170-655182 placement
var hyo = 500;
//@ chunk-e6aww6q8.js:655182-655337 placement
async function promotePluginWithRetry(e, n, r, s, h, y, S) {
  try {
    return await promoteSyncedPlugin(e, n, r, s, h, y, S);
  } catch {
    return (
      logForDiagnosticsNoPII("warn", "plugins_sync_extract_retry"),
      await sleep(hyo),
      promoteSyncedPlugin(e, n, r, s, h, y, S)
    );
  }
}
//@ chunk-e6aww6q8.js:655337-655542 placement
function recordSyncError(e, n, r, s) {
  let h = `${n.name}@${SYNCED}`;
  e.syncErrors.push(
    r === "network-error"
      ? {
          type: r,
          source: h,
          plugin: n.name,
          url: pluginDownloadPath(n.pluginId, n.requestedVersion),
          details: s,
        }
      : { type: r, source: h, plugin: n.name, error: s },
  );
}
//@ chunk-e6aww6q8.js:655542-655615 placement
function nNt(e, n) {
  pes.of(e.host).markPluginsSyncRound(n, () => mn() && isDatadogAllowed());
}
/**
 * 执行一轮 claude.ai 插件同步：拉取目录、安装/更新/移除并记录遥测。
 */
//@ chunk-e6aww6q8.js:655615-666154 placement
async function runPluginsSyncRound(e, n, { startup: r = !1 } = {}) {
  let pluginsSync = e.pluginsSync,
    now = Date.now();
  ((pluginsSync.syncErrors = []),
    (pluginsSync.accountListing = "pending"),
    (pluginsSync.lastRoundListed = !1),
    (pluginsSync.listedStamp = null));
  let y = QLt(),
    S;
  try {
    ((S = monitorEventLoopDelay({ resolution: 20 })), S.enable());
  } catch {}
  let w = () => {
      if (!S) return {};
      return (
        S.disable(),
        { loop_lag_p95_ms: Math.round(S.percentile(95) / 1e6), loop_lag_max_ms: Math.round(S.max / 1e6) }
      );
    },
    L,
    G = { downloadMs: [], extractMs: [], zipBytes: 0, anthropicCatalogZipBytes: 0 },
    q = !1,
    Z = null,
    Se = !1,
    ke = !1,
    we = !1,
    Ee = !1,
    Ae = () => ({
      account_opt_in: ke,
      duration_ms: Date.now() - now,
      ...getDownloadSizeTelemetry(G),
      ...(we && { converted_skills_asked: !0 }),
    }),
    Ie = "end_not_recorded";
  if (r) nNt(e, "still_running");
  try {
    if (((ke = getAccountPluginsSyncEnabled()), _rr())) ke = !0;
    if (!Jbt(e) || !wie()) {
      if (
        (logForDiagnosticsNoPII("info", "plugins_sync_gate_closed"),
        logFeatureSad("plugins_sync_round", "gate_closed", Ae()),
        (Ie = "gate_closed"),
        !gii())
      )
        e.pluginsSync.accountListing = "refused";
      return !1;
    }
    if (Hkt())
      return (
        logForDiagnosticsNoPII("info", "plugins_sync_policy_verdict_pending"),
        logFeatureSad("plugins_sync_round", "policy_verdict_pending", Ae()),
        (Ie = "policy_verdict_pending"),
        !1
      );
    let Me = await getSyncBucket(n);
    if (Me === null)
      return (
        logForDiagnosticsNoPII("info", "plugins_sync_bucket_unresolved"),
        logFeatureSad("plugins_sync_round", "bucket_unresolved", Ae()),
        (Ie = "bucket_unresolved"),
        !1
      );
    let We = createPluginsRootGuard(Bue(Me));
    Z = We;
    let root = We.root;
    (logForDiagnosticsNoPII("info", "plugins_sync_starting"), await ufn(e, Me), (q = !0));
    let lt = isSkillsAsPluginsActive(e);
    if (r && !isSessionRefsSyncEnabled(e)) {
      let Or = await checkReuseWindow(root, fBr());
      if (Or.reuse && (await isManifestReadableOrAbsent(We)) && (await myo(root, lt)))
        return (
          logForDiagnosticsNoPII("info", "plugins_sync_round_reused", {
            age_ms: Or.ageMs,
            within_ms: Or.withinMs,
          }),
          await registerSyncedPluginDirs(We, { reconcileSidecars: !0 }),
          scheduleDeferredRelist(e, n),
          logFeatureOk("plugins_sync_round", { ...Ae(), reused: !0 }),
          (Ie = "ok_reused"),
          (e.pluginsSync.accountListing = "listed"),
          !1
        );
    }
    let Je = lt && { convertedSkillsAsPlugins: !0 },
      now_2 = Date.now(),
      pt,
      Et = [],
      yt = new Map();
    if (isSessionRefsSyncEnabled(e)) {
      let listEntries = zqe.of(e).listEntries("plugins", { startup: r }),
        Io = env.CLAUDE_CODE_SYNC_PLUGINS || getAccountPluginsSyncEnabled();
      we = lt && Io;
      let [zo, rs] = await Promise.all([
        listEntries,
        Io ? listAccountPlugins({ isBackground: !0, credentials: n, ...Je }) : null,
      ]);
      if (!zo.success) pt = zo;
      else if (
        ((yt = collectOfficialAttestations(zo.entries)),
        (Et = zo.entries.map(toSyncedPluginRow)),
        rs === null)
      )
        pt = { success: !0, plugins: Et };
      else if (!rs.success) pt = rs;
      else
        pt = {
          success: !0,
          plugins: mergeRowsByKey(Et, rs.plugins, (Es) => Es.pluginId, carryMarketplaceInfo),
          ...(rs.degraded && { degraded: rs.degraded }),
        };
    } else ((we = lt), (pt = await listAccountPlugins({ isBackground: !0, credentials: n, ...Je })));
    L = Date.now() - now_2;
    let gt = !pt.success && Hee(pt);
    if (gt)
      (logForDiagnosticsNoPII("warn", "plugins_sync_list_refused", { list_ms: L }),
        (pt = { success: !0, plugins: Et }));
    if (pt.success && pt.degraded)
      logForDiagnosticsNoPII("warn", "plugins_sync_list_degraded", { list_ms: L });
    if (!pt.success) {
      if (eot(pt)) e.pluginsSync.accountListing = "refused";
      let Or = w(),
        Io = listErrorTelemetry(pt);
      return (
        logForDiagnosticsNoPII("warn", "plugins_sync_list_failed", {
          duration_ms: Date.now() - now,
          list_ms: L,
          ...Or,
          ...Io,
        }),
        logEvent("tengu_plugins_sync_list_failed", {
          duration_ms: Date.now() - now,
          list_ms: L,
          ...Or,
          ...Io,
        }),
        logFeatureBad("plugins_sync_round", "list_failed", { ...Ae(), ...Io }),
        (Ie = "list_failed"),
        await registerSyncedPluginDirs(We, { reconcileSidecars: !0 }),
        !1
      );
    }
    await y3n(root);
    let At = pt.degraded || isSessionRefsSyncEnabled(e) ? null : pluginListFingerprint(pt.plugins),
      It = await readPluginsManifest(We),
      Yt = It !== null,
      plugins = pt.plugins;
    if (pt.degraded) {
      let Or = new Set(pt.plugins.map((plugin) => plugin.pluginId));
      plugins = [
        ...pt.plugins,
        ...(It?.plugins ?? []).filter((Io) => !Or.has(Io.pluginId) && Io.requestedVersion === void 0),
      ];
    }
    if (we) {
      let Or = new Set([...Et, ...(It?.plugins ?? [])].map((zo) => Yfe(root, zo)).filter(Boolean)),
        Io = new Set(plugins.filter((zo) => Or.has(Yfe(root, zo))));
      plugins = [...Io, ...plugins.filter((zo) => !Io.has(zo))];
    }
    let Zt = new Set(Et.map((Or) => Or.pluginId)),
      rn = new Set(
        pt.plugins.filter((plugin) => plugin.installationPreference === "required").map((Or) => Or.pluginId),
      );
    plugins = [
      ...plugins.filter((Or) => Zt.has(Or.pluginId)),
      ...plugins.filter((Or) => !Zt.has(Or.pluginId) && rn.has(Or.pluginId)),
      ...plugins.filter((Or) => !Zt.has(Or.pluginId) && !rn.has(Or.pluginId)),
    ];
    let {
        toDownload: toDownload,
        toRemove: toRemove,
        carryover: carryover,
        carryoverOwningLiveDir: carryoverOwningLiveDir,
      } = planPluginDownloads(root, plugins, It?.plugins ?? []),
      yn = new Set(),
      Kn = new Map(),
      results = await Promise.all(
        carryover.map(async (Or) => {
          if (!carryoverOwningLiveDir.has(Or.pluginId)) return !1;
          try {
            let Io = YP(root, Or);
            if (!(await lstat_9(Io)).isDirectory()) return !0;
            let { serverPluginId: serverPluginId } = await readPluginAttributionSidecar(Io);
            if (serverPluginId === void 0 || serverPluginId === Or.pluginId) return !1;
            return (Kn.set(Or.pluginId, serverPluginId), !0);
          } catch {
            return !0;
          }
        }),
      );
    for (let [Or, Io] of carryover.entries()) {
      if (!results[Or]) continue;
      let found = pt.plugins.find((plugin) => plugin.pluginId === Io.pluginId);
      if (found) (yn.add(Io.pluginId), toDownload.push({ item: found, prev: Io }));
    }
    let filtered = carryover.filter((Or) => !yn.has(Or.pluginId)),
      filtered_2 = filtered.filter((Or) => carryoverOwningLiveDir.has(Or.pluginId)),
      bo = createLiveEntryClassifier(
        new Set(OUe(root, [...filtered_2, ...toDownload.map(({ item: item, prev: prev }) => prev ?? item)])),
      ),
      vn = getRowDirNames(root, plugins);
    if ((await Promise.all(pluginsSync.pendingTrashRemovals.splice(0)), (await AUe(We)) === null))
      await rm_9(Jfe(root), { recursive: !0, force: !0 }).catch(() => {});
    let co = new Set(It?.staleDirs ?? []),
      So = await removeStaleDirs(
        root,
        Array.from(co).filter((Or) => !pluginsSync.removalsDeferredHere.has(Or)),
        bo,
        vn,
      );
    for (let Or of So) co.delete(Or);
    if (toDownload.length === 0 && toRemove.length === 0) {
      (w8(We),
        await reconcilePluginSidecars(We, filtered),
        w8(We),
        registerDirsWithAttestations(root, filtered_2, yt),
        (Se = !0),
        (pluginsSync.lastRoundListed = !pt.degraded),
        recordCompleteList(pluginsSync, Me, root, pt));
      let Or = replaceRowsWithAttribution(
          It?.plugins ?? [],
          carryover,
          (Es) => Es.pluginId,
          (Es, Nr) =>
            Es.marketplaceName === Nr.marketplaceName &&
            Es.installationPreference === Nr.installationPreference &&
            Es.marketplaceKind === Nr.marketplaceKind,
        ),
        Io = !gt && !pt.degraded && !isSessionRefsSyncEnabled(e),
        zo = Io && co.size === 0,
        rs = eNt(lt && pt.convertedSkillsAsPlugins === !0, Io, Or.rows);
      if (
        (So.size > 0 || Or.attributionMoved || (lt && !sameIdSet(It?.appliedListIds, rs.appliedListIds))) &&
        It
      )
        await writePluginsManifest(
          We,
          {
            lastUpdated: It.lastUpdated,
            plugins: Or.rows,
            staleDirs: co.size > 0 ? Array.from(co) : void 0,
            ...rs,
          },
          { staleDirs: So, removedPluginIds: new Set() },
        );
      if (
        (await trashOrphanSyncedPluginDirs(We, plugins, pluginsSync.removalsDeferredHere), await sNt(), It)
      ) {
        let date = new Date();
        await lutimes_2(M8(root), date, date).catch(() => {});
      }
      if (
        (await dfn(root, "plugins", zo, null, CUe(lt)),
        logForDiagnosticsNoPII("info", "plugins_sync_no_changes", {
          count: carryover.length,
          duration_ms: Date.now() - now,
          list_ms: L,
          had_manifest: Yt,
          ...w(),
        }),
        gt)
      )
        (logFeatureSad("plugins_sync_round", "not_entitled", Ae()), (Ie = "not_entitled"));
      else if (pt.degraded)
        (logFeatureSad("plugins_sync_round", "list_degraded", Ae()), (Ie = "list_degraded"));
      else (logFeatureOk("plugins_sync_round", Ae()), (Ie = "ok"));
      return (
        (e.pluginsSync.accountListing = gt ? "refused" : pt.degraded ? "pending" : "listed"),
        (pluginsSync.listedStamp = JLt(pluginsSync) ? null : At),
        !1
      );
    }
    let ko = createLiveEntryClassifier(
        new Set(OUe(root, [...filtered_2, ...toDownload.map(({ item: item }) => item)])),
      ),
      un = 0,
      ao = (Or, { oldCopy: oldCopy, heldTarget: heldTarget }) => {
        if (hasSyncedPluginLaneOpened())
          return (un++, pluginsSync.removalsDeferredHere.add(Or), Promise.resolve(!1));
        if (Or === heldTarget) return Promise.resolve(!1);
        return removeSyncedPluginDir(root, Or, ko, oldCopy ? vn : void 0);
      },
      $o = [],
      yo = [],
      Ho = new Set(),
      now_3 = Date.now(),
      br = env.CLAUDE_CODE_SYNC_PLUGINS_DOWNLOAD_CONCURRENCY ?? Xfe,
      Hr = createSemaphore(Xfe);
    await Promise.all(
      toDownload.map(
        limitConcurrency(br, async ({ item: item, prev: prev }) => {
          let zo;
          try {
            if (((zo = await promotePluginWithRetry(pluginsSync, We, item, prev, G, n, Hr)), !zo.ok))
              switch (zo.cause) {
                case "download":
                  (logForDiagnosticsNoPII("warn", "plugins_sync_download_failed"),
                    recordSyncError(pluginsSync, item, "network-error", zo.reason));
                  break;
                case "root_refused":
                case "extract":
                  recordSyncError(pluginsSync, item, "generic-error", zo.reason);
                  break;
                case "local":
                  recordSyncError(pluginsSync, item, "generic-error", zo.reason);
                  break;
                case "deferred":
                  (logForDiagnosticsNoPII("warn", "plugins_sync_unexpected_landing_cause"),
                    recordSyncError(pluginsSync, item, "generic-error", zo.reason));
                  break;
              }
          } catch (error) {
            let Es = printableMessage(error);
            ((zo = W6n(Es)),
              logForDiagnosticsNoPII("warn", "plugins_sync_extract_failed"),
              recordSyncError(pluginsSync, item, "generic-error", Es));
          }
          if (zo.ok) {
            let rs = zo.generation > 1 ? { ...item, generation: zo.generation } : item;
            if (($o.push(rs), !prev)) markSyncedPluginDirNewHere(YP(root, rs));
            if (prev) {
              let Es = b8(root, prev);
              if (
                Es !== b8(root, rs) &&
                !(await ao(Es, {
                  oldCopy: !0,
                  heldTarget: zo.generation > 1 ? b8(root, { name: item.name }) : void 0,
                }))
              )
                co.add(Es);
            }
          } else if (prev && Kn.has(prev.pluginId)) {
            let rs = Yfe(root, { ...prev, pluginId: Kn.get(prev.pluginId) ?? "" });
            if (!plugins.some((Es) => Yfe(root, Es) === rs)) Ho.add(prev.pluginId);
          } else if (prev) yo.push(prev);
        }),
      ),
    );
    let Fr = Date.now() - now_3,
      cs = getDownloadTimingTelemetry(G);
    if (
      (await Promise.all(
        toRemove.map(
          limitConcurrency(Xfe, async (Or) => {
            let Io = b8(root, Or);
            if (!(await ao(Io, { oldCopy: !1 }))) co.add(Io);
          }),
        ),
      ),
      un > 0)
    )
      logForDiagnosticsNoPII("info", "plugins_sync_removal_deferred_loaded", { count: un });
    Ee = $o.length > 0 || toRemove.length > 0;
    let _r = [...$o, ...yo, ...filtered];
    (w8(We),
      await reconcilePluginSidecars(We, _r),
      w8(We),
      registerDirsWithAttestations(root, _r, yt, new Set($o)),
      (Se = !0),
      (pluginsSync.lastRoundListed = !pt.degraded),
      recordCompleteList(pluginsSync, Me, root, pt));
    let Cr = !gt && !pt.degraded && !isSessionRefsSyncEnabled(e),
      Vr = Cr && pluginsSync.syncErrors.length === 0 && co.size === 0;
    (await writePluginsManifest(
      We,
      {
        lastUpdated: Date.now(),
        plugins: _r,
        staleDirs: co.size > 0 ? Array.from(co) : void 0,
        ...eNt(lt && pt.convertedSkillsAsPlugins === !0, Cr && pluginsSync.syncErrors.length === 0, _r),
      },
      { staleDirs: So, removedPluginIds: new Set([...toRemove.map((Or) => Or.pluginId), ...Ho]) },
    ),
      await trashOrphanSyncedPluginDirs(We, plugins, pluginsSync.removalsDeferredHere),
      await sNt());
    let Oo = w();
    if (
      (logForDiagnosticsNoPII("info", "plugins_sync_complete", {
        downloaded: $o.length,
        removed: toRemove.length,
        failed: pluginsSync.syncErrors.length,
        duration_ms: Date.now() - now,
        list_ms: L,
        download_extract_ms: Fr,
        download_concurrency: br,
        had_manifest: Yt,
        ...cs,
        ...Oo,
      }),
      logEvent("tengu_plugins_sync_success", {
        downloaded: $o.length,
        removed: toRemove.length,
        total: pt.plugins.length,
        duration_ms: Date.now() - now,
        list_ms: L,
        download_extract_ms: Fr,
        download_concurrency: br,
        had_manifest: Yt,
        ...cs,
        ...Oo,
      }),
      await dfn(root, "plugins", Vr, null, CUe(lt)),
      pluginsSync.syncErrors.length > 0)
    )
      (logFeatureSad("plugins_sync_round", "download_failed", Ae()), (Ie = "download_failed"));
    else if (gt) (logFeatureSad("plugins_sync_round", "not_entitled", Ae()), (Ie = "not_entitled"));
    else if (pt.degraded)
      (logFeatureSad("plugins_sync_round", "list_degraded", Ae()), (Ie = "list_degraded"));
    else (logFeatureOk("plugins_sync_round", Ae()), (Ie = "ok"));
    e.pluginsSync.accountListing = gt ? "refused" : pt.degraded ? "pending" : "listed";
    let jr = pluginsSync.syncErrors.length === 0 && !JLt(pluginsSync);
    pluginsSync.listedStamp = jr ? At : null;
  } catch (error) {
    let We = w(),
      ze = {
        ...(L !== void 0 && { list_ms: L }),
        ...(G.downloadMs.length > 0 && getDownloadTimingTelemetry(G)),
      };
    if (!(error instanceof SyncOwnedRootRefusedError))
      (logForDiagnosticsNoPII("error", "plugins_sync_unexpected_error", {
        kind: error instanceof Error ? error.constructor.name : "unknown",
        duration_ms: Date.now() - now,
        ...ze,
        ...We,
      }),
        logEvent("tengu_plugins_sync_error", { duration_ms: Date.now() - now, ...ze, ...We }),
        logFeatureBad("plugins_sync_round", "unexpected_error", Ae()),
        (Ie = "unexpected_error"));
    else (logFeatureSad("plugins_sync_round", "root_refused", Ae()), (Ie = "root_refused"));
    if (error instanceof SyncOwnedRootRefusedError && Se)
      (logForDiagnosticsNoPII("warn", "plugins_sync_post_registration_refusal", { reason: error.reason }),
        logEvent("tengu_plugins_sync_root_refused", {
          reason: fromEnum(error.reason),
          phase: lit_2("post_registration"),
          duration_ms: Date.now() - now,
        }),
        (q = !1));
    else if (error instanceof SyncOwnedRootRefusedError) {
      (logForDiagnosticsNoPII("warn", "plugins_sync_root_refused_fail_closed"),
        logEvent("tengu_plugins_sync_root_refused", {
          reason: fromEnum(error.reason),
          phase: lit_2("head"),
          duration_ms: Date.now() - now,
        }));
      let lt = tildify(join_19(getClaudeConfigDir(), "plugins"));
      (pluginsSync.syncErrors.push({
        type: "generic-error",
        source: `${SYNCED}[root]`,
        error:
          error.reason === "unverified" || error.reason === "landing_unverified"
            ? `claude.ai plugin sync disabled this session: ${lt} could not be verified${error.code ? ` (${error.code})` : ""}`
            : error.reason === "landing_absent"
              ? `claude.ai plugin sync disabled this session: ${lt} was removed while a sync round was running`
              : `claude.ai plugin sync disabled this session: ${lt} is not a plain directory tree (a symlink or stray file is in the way)`,
      }),
        setSyncedPluginDirs([]));
    } else if (!Se && Z !== null) await registerSyncedPluginDirs(Z, { reconcileSidecars: !0 });
  } finally {
    if (Ee || QLt() !== y) getSyncedPluginReloadDebt().changesLanded++;
    if ((S?.disable(), Z === null || Z.guard.refused())) q = !1;
    if (q && Z !== null) {
      let We = Jfe(Z.root),
        root = Z.root,
        lt = getClaudeConfigDir(),
        Je = Promise.all(pluginsSync.pendingTrashRemovals.splice(0)).then(async () => {
          if (
            (await verifySyncRoot(
              root,
              lt,
              { event: "plugins_sync_root_refused", phase: "sweep", rootLabel: cU },
              { checkStagingLeaf: !0 },
            ).catch(() => null)) === "real"
          )
            await rm_9(We, { recursive: !0, force: !0 }).catch(() => {});
        });
      pluginsSync.pendingTrashRemovals.push(Je);
    }
    if (r) nNt(e, Ie);
  }
  return Ee;
}
//@ chunk-e6aww6q8.js:666154-666372 placement
function getDownloadTimingTelemetry(e) {
  return {
    ...getDownloadSizeTelemetry(e),
    download_ms_sum: e.downloadMs.reduce((n, r) => n + r, 0),
    download_ms_max: Math.max(0, ...e.downloadMs),
    extract_ms_sum: e.extractMs.reduce((n, r) => n + r, 0),
    extract_ms_max: Math.max(0, ...e.extractMs),
  };
}
/**
 * 从清单登记已同步插件目录与认证信息（可先对齐 sidecar）；根被拒时按关闭失败处理并清空。
 */
//@ chunk-e6aww6q8.js:666372-666704 placement
async function registerSyncedPluginDirs(e, { reconcileSidecars: reconcileSidecars }) {
  let r = await readPluginsManifest(e);
  if (!r) return;
  if (reconcileSidecars) await reconcilePluginSidecars(e, r.plugins);
  if (e.guard.refusedReason() !== null) {
    (logForDiagnosticsNoPII("warn", "plugins_sync_root_refused_fail_closed"), setSyncedPluginDirs([]));
    return;
  }
  let s = mapRowsToDirs(e.root, r.plugins),
    mapped = s.map(({ dir: dir }) => dir),
    y = new Map();
  for (let S of mapped) {
    let w = getSyncedPluginAttestation(S);
    if (w !== void 0) y.set(S, w);
  }
  setSyncedPluginDirs(mapped, y, bNt(s));
}
//@ chunk-e6aww6q8.js:666704-666765 placement
async function pNt(e) {
  return (await listSyncedPluginDirs(e)).map(({ dir: dir }) => dir);
}
//@ chunk-e6aww6q8.js:666765-666910 placement
async function listSyncedPluginDirs(e) {
  let n = await readSyncedPluginsState(e);
  return n?.manifest
    ? mapRowsToDirs(n.root, n.manifest.plugins).map(({ dir: dir, row: row }) => ({
        dir: dir,
        pluginId: row.pluginId,
      }))
    : [];
}
/**
 * 在已同步插件中找出给定 ID 中实际存在目录的那些；无法判断时返回 null。
 */
//@ chunk-e6aww6q8.js:666910-667237 placement
async function findInstalledSyncedPlugins(e, n) {
  let r = await readBucketState(e);
  if (!r?.manifest) return null;
  let filtered = mapRowsToDirs(r.root, r.manifest.plugins).filter(({ row: row }) => n.has(row.pluginId)),
    results = await Promise.all(
      filtered.map(({ dir: dir }) =>
        lstat_9(dir).then(
          (S) => S.isDirectory(),
          (S) => (isENOENT(S) ? !1 : null),
        ),
      ),
    );
  if (results.includes(null)) return null;
  return new Set(filtered.flatMap(({ row: row }, S) => (results[S] ? [row.pluginId] : [])));
}
/**
 * 已应用的插件列表是否与清单中的插件一致。
 */
//@ chunk-e6aww6q8.js:667237-667378 placement
async function isAppliedListCurrent(e) {
  let n = (await readSyncedPluginsState(e))?.manifest;
  return (
    n?.appliedListIds !== void 0 &&
    sameIdSet(
      n.appliedListIds,
      n.plugins.map((plugin) => plugin.pluginId),
    )
  );
}
//@ chunk-e6aww6q8.js:667378-667518 placement
async function readSyncedPluginsState(e) {
  if (isDiskless()) return null;
  let n = await getSyncBucket(e);
  if (n === null) return (logForDiagnosticsNoPII("info", "plugins_sync_bucket_unresolved"), null);
  return readBucketState(n);
}
/**
 * 读取插件同步桶状态：同步根与回收根都校验通过且桶有标记时返回根与清单，否则 null。
 */
//@ chunk-e6aww6q8.js:667518-667883 placement
async function readBucketState(e) {
  if (isDiskless()) return null;
  let n = Bue(e),
    r = { event: "plugins_sync_root_refused", phase: "read" },
    [s, h] = await Promise.all([
      verifySyncRoot(n, getClaudeConfigDir(), { ...r, rootLabel: cU }, { checkStagingLeaf: !0 }).catch(
        () => null,
      ),
      verifySyncRoot(RD(), getClaudeConfigDir(), { ...r, rootLabel: LFe }).catch(() => null),
    ]);
  if (s !== "real" || (h !== "real" && h !== "absent") || !(await E2e(Ob(), e))) return null;
  return { root: n, manifest: await readPluginsManifest(createPluginsRootGuard(n)) };
}
//@ chunk-e6aww6q8.js:667883-668076 placement
async function getRegisteredSyncedDirs(e) {
  let n = getSyncedPluginDirs();
  if (n.length === 0) return n;
  let r = await getSyncBucket(e);
  if (r === null) return (logForDiagnosticsNoPII("info", "plugins_sync_bucket_unresolved"), []);
  let s = Bue(r);
  return n.every((h) => dirname_13(h) === s) ? n : null;
}
/**
 * 尚未登记时，读取同步插件目录并登记目录及其插件 id。
 */
//@ chunk-e6aww6q8.js:668076-668207 placement
async function ensureSyncedPluginDirsRegistered() {
  if (hasRegisteredSyncedPluginDirs()) return;
  let e = await listSyncedPluginDirs();
  setSyncedPluginDirs(
    e.map(({ dir: dir }) => dir),
    void 0,
    new Map(e.map(({ dir: dir, pluginId: pluginId }) => [dir, pluginId])),
  );
}
/**
 * 删除已同步插件目录：保留拼写不删；正在使用或有在线会话时推迟；否则移入回收区并删除元数据文件。返回是否已删除。
 */
//@ chunk-e6aww6q8.js:668207-668635 placement
async function removeSyncedPluginDir(e, n, r, s) {
  let h;
  try {
    h = syncedItemPath_2(n, e);
  } catch (error) {
    if (error instanceof LegacyReservedSpellingError) return !1;
    return !0;
  }
  if (r) {
    let S = await r(h);
    if (S === "live") return !0;
    if (S === "indeterminate") return !1;
  }
  if (s !== void 0 && (await _Nt(h, n, s)))
    return (logForDiagnosticsNoPII("info", "plugins_sync_removal_deferred_live_session"), !1);
  let y = await checkSyncRoots({
    dir: h,
    trashRoot: RD(),
    configHome: getClaudeConfigDir(),
    failureEvent: "plugins_sync_trash_move_failed",
  });
  if (y) await rm_9(h + PLUGIN_META_SUFFIX, { force: !0 }).catch(() => {});
  return y;
}
//@ chunk-e6aww6q8.js:668635-668775 placement
async function isPluginDirInUse(e) {
  return isPluginVersionInUse(e, { refusedCountsAsLive: !1, requireIdentity: !0 }).catch(
    () => (logForDiagnosticsNoPII("warn", "plugins_sync_in_use_probe_failed"), !0),
  );
}
//@ chunk-e6aww6q8.js:668775-668840 placement
async function _Nt(e, n, r) {
  return r.has(stripInvisibleChars_3(DFe(n))) && (await isPluginDirInUse(e));
}
/**
 * 记录最近一次完整列表（每个插件的目录集合与待删除目录），用于后续清理已下架的插件目录。
 */
//@ chunk-e6aww6q8.js:668840-669339 placement
function recordCompleteList(e, n, r, s) {
  if (s.degraded) return;
  let lastCompleteList = e.lastCompleteList,
    y = lastCompleteList !== null && lastCompleteList.bucket === n ? lastCompleteList : null,
    S = y?.dirsById ?? new Map(),
    w = new Map();
  for (let plugin of s.plugins)
    w.set(plugin.pluginId, new Set([...(S.get(plugin.pluginId) ?? []), ...getRowDirNames(r, [plugin])]));
  let L = new Set([
      ...Array.from(S).flatMap(([Z, Se]) => (w.has(Z) ? [] : Array.from(Se))),
      ...(y?.removalOwed ?? []),
    ]),
    G = new Set(Array.from(w.values()).flatMap((Z) => Array.from(Z))),
    q = removeDelistedSkillHooks({ bucket: n, delistedDirs: L, listedDirs: G });
  e.lastCompleteList = { bucket: n, dirsById: w, removalOwed: q ? new Set() : L };
}
//@ chunk-e6aww6q8.js:669339-669449 placement
function getRowDirNames(e, n) {
  return new Set(
    n.flatMap(({ name: r }) => {
      try {
        return [stripInvisibleChars_3(basename_6(YP(e, { name: r })))];
      } catch {
        return [];
      }
    }),
  );
}
//@ chunk-e6aww6q8.js:669449-669572 placement
async function removeStaleDirs(e, n, r, s) {
  let h = new Set();
  for (let y of n) {
    if (isSyncedPluginDirLoadedHere(join_19(e, y))) continue;
    if (await removeSyncedPluginDir(e, y, r, s)) h.add(y);
  }
  return h;
}
/**
 * 列出插件同步根下的桶：带标记的桶、无关的杂项与标记不可读的目录。
 */
//@ chunk-e6aww6q8.js:669572-670106 placement
async function listPluginBuckets() {
  let root = Ob();
  if (
    (await verifySyncRoot(root, getClaudeConfigDir(), {
      event: "plugins_sync_root_refused",
      phase: "prune",
      rootLabel: cU,
    }).catch(() => null)) !== "real"
  )
    return null;
  let entries;
  try {
    entries = await readdir_8(root, { withFileTypes: !0 });
  } catch {
    return null;
  }
  let buckets = [],
    strays = [],
    unreadable = [];
  for (let entry of entries) {
    let marker = entry.isDirectory() && WYe(entry.name) ? await readSyncMarker(root, entry.name) : "unmarked";
    if (marker === "marked") buckets.push(entry.name);
    else if (typeof marker === "object")
      (unreadable.push(entry.name),
        logForDiagnosticsNoPII("warn", "plugins_sync_bucket_marker_unreadable", { code: marker.unreadable }));
    else if (!MJ(entry.name)) strays.push(entry.name);
  }
  return { buckets: buckets, strays: strays, unreadable: unreadable };
}
//@ chunk-e6aww6q8.js:670106-670334 placement
async function trashStrayEntries(e) {
  let n = 0;
  for (let r of e)
    if (
      await checkSyncRoots({
        dir: join_19(Ob(), r),
        trashRoot: RD(),
        configHome: getClaudeConfigDir(),
        failureEvent: "plugins_sync_trash_move_failed",
      })
    )
      n++;
  if (n > 0) logForDiagnosticsNoPII("info", "plugins_sync_stray_entry_trashed", { count: n });
  return n;
}
//@ chunk-e6aww6q8.js:670334-670424 placement
async function sNt() {
  let e = await listPluginBuckets();
  if (e !== null && e.strays.length > 0) await trashStrayEntries(e.strays);
}
//@ chunk-e6aww6q8.js:670424-670520 placement
async function kNt(e) {
  let n = createPluginsRootGuard(Bue(e)),
    r = await readPluginsManifest(n);
  return r === null ? null : { round: n, manifest: r };
}
/**
 * 同步闸门关闭时清理已同步的插件，延迟到不在使用时执行。
 */
//@ chunk-e6aww6q8.js:670520-671618 placement
async function pruneSyncedPluginsForClosedGate() {
  if (!$5r()) return !1;
  if (hasSyncedPluginLaneOpened())
    return (logForDiagnosticsNoPII("info", "plugins_sync_prune_deferred_loaded"), !1);
  let e = await listPluginBuckets();
  if (!e) return !1;
  setSyncedPluginDirs([]);
  let n = 0,
    r = 0;
  for (let bucket of e.buckets) {
    let h = Bue(bucket);
    await rm_9(join_19(h, m5t), { force: !0 }).catch(() => {});
    for (let we of await readdir_8(h).catch(() => []))
      if (isClaudeAiMarketplaceFile(we)) await rm_9(join_19(h, we), { force: !0 }).catch(() => {});
    await rm_9(Ybt(h), { force: !0 }).catch(() => {});
    let y = await kNt(bucket);
    if (!y) continue;
    let { round: round, manifest: manifest } = y,
      root = round.root,
      G = [],
      q = new Set();
    for (let plugin of manifest.plugins)
      if (await removeSyncedPluginDir(root, b8(root, plugin))) q.add(plugin.pluginId);
      else G.push(plugin);
    let Z = new Set(manifest.staleDirs ?? []),
      Se = await removeStaleDirs(root, Z);
    for (let we of Se) Z.delete(we);
    let ke = await trashOrphanSyncedPluginDirs(round, [], null);
    if (((n += q.size + Se.size + ke), G.length > 0 || Z.size > 0))
      ((r += G.length + Z.size),
        await writePluginsManifest(
          round,
          { lastUpdated: manifest.lastUpdated, plugins: G, staleDirs: Z.size > 0 ? Array.from(Z) : void 0 },
          { staleDirs: Se, removedPluginIds: q },
        ).catch(() => {}));
    else
      (await rm_9(M8(root), { force: !0 }).catch(() => {}),
        await rmdir_3(root).then(
          () => K1t(Ob(), bucket),
          () => {},
        ));
  }
  return (
    (n += await trashStrayEntries([...e.strays, ...e.unreadable])),
    await rmdir_3(Ob()).catch(() => {}),
    logForDiagnosticsNoPII("info", "plugins_sync_pruned_for_closed_gate", { moved: n, retained: r }),
    n > 0
  );
}
/**
 * 处理各桶清单中推迟的过期目录删除：能删的删掉并更新清单，记录完成与保留数。
 */
//@ chunk-e6aww6q8.js:671618-672275 placement
async function completeDeferredRemovals() {
  if (hasSyncedPluginLaneOpened() || Srr()) return !1;
  let buckets = await listPluginBuckets();
  if (!buckets) return !1;
  let moved = 0,
    retained = 0;
  for (let bucket of buckets.buckets) {
    let bucketState = await kNt(bucket);
    if (!bucketState?.manifest.staleDirs?.length) continue;
    let { round: round, manifest: manifest } = bucketState,
      root = round.root,
      staleDirs = new Set(manifest.staleDirs),
      removed = await removeStaleDirs(
        root,
        staleDirs,
        createLiveEntryClassifier(new Set(OUe(root, manifest.plugins))),
        getRowDirNames(root, manifest.plugins),
      );
    if (removed.size === 0) {
      retained += staleDirs.size;
      continue;
    }
    for (let q of removed) staleDirs.delete(q);
    ((moved += removed.size),
      (retained += staleDirs.size),
      await writePluginsManifest(
        round,
        {
          lastUpdated: manifest.lastUpdated,
          plugins: manifest.plugins,
          staleDirs: staleDirs.size > 0 ? Array.from(staleDirs) : void 0,
        },
        { staleDirs: removed, removedPluginIds: new Set(), carryAppliedListIds: !0 },
      ).catch(() => {}));
  }
  if (moved === 0) return !1;
  return (
    logForDiagnosticsNoPII("info", "plugins_sync_deferred_removals_completed", {
      moved: moved,
      retained: retained,
    }),
    !0
  );
}
//@ chunk-e6aww6q8.js:672275-673261 placement
async function trashOrphanSyncedPluginDirs(e, n, r) {
  if (!(await e.guard.verify())) return 0;
  let root = e.root,
    h = await readPluginsManifest(e);
  if (!h) return 0;
  let y = new Set(
      [
        ...[...h.plugins, ...n.map(({ name: q }) => ({ name: q }))].flatMap((q) => {
          try {
            return [basename_6(YP(root, q))];
          } catch {
            return [];
          }
        }),
        ...(h.staleDirs ?? []),
      ].map(stripInvisibleChars_3),
    ),
    S;
  try {
    S = await readdir_8(root, { withFileTypes: !0 });
  } catch {
    return 0;
  }
  let mapped = S.filter((q) => q.isDirectory() && !MJ(q.name) && !y.has(stripInvisibleChars_3(q.name))).map(
    (q) => q.name,
  );
  if (mapped.length === 0) return 0;
  if (hasSyncedPluginLaneOpened()) {
    await writePluginsManifest(
      e,
      { lastUpdated: h.lastUpdated, plugins: h.plugins, staleDirs: [...(h.staleDirs ?? []), ...mapped] },
      { staleDirs: new Set(), removedPluginIds: new Set(), carryAppliedListIds: !0 },
    );
    for (let q of mapped) r?.add(q);
    return (logForDiagnosticsNoPII("info", "plugins_sync_orphan_dir_deferred", { count: mapped.length }), 0);
  }
  let L = 0,
    G = getRowDirNames(root, n);
  for (let q of mapped) {
    if (await _Nt(join_19(root, q), q, G)) continue;
    if (
      await checkSyncRoots({
        dir: join_19(root, q),
        trashRoot: RD(),
        configHome: getClaudeConfigDir(),
        failureEvent: "plugins_sync_trash_move_failed",
      })
    )
      (L++, await rm_9(join_19(root, q) + PLUGIN_META_SUFFIX, { force: !0 }).catch(() => {}));
  }
  if (L > 0) logForDiagnosticsNoPII("info", "plugins_sync_orphan_dir_trashed", { count: L });
  return L;
}
//@ chunk-e6aww6q8.js:673261-673312 placement
function OUe(e, n) {
  return mapRowsToDirs(e, n).map(({ dir: dir }) => dir);
}
//@ chunk-e6aww6q8.js:673312-673472 placement
function mapRowsToDirs(e, n) {
  let r = new Map();
  for (let s of n) {
    let h;
    try {
      h = YP(e, s);
    } catch {
      continue;
    }
    let y = stripInvisibleChars_3(h);
    if (!r.has(y)) r.set(y, { dir: h, row: s });
  }
  return Array.from(r.values());
}
//@ chunk-e6aww6q8.js:673472-673719 placement
function registerDirsWithAttestations(e, n, r, s = new Set()) {
  let h = mapRowsToDirs(e, n),
    y = new Map();
  for (let { dir: dir, row: row } of h) {
    let L = r.get(row.pluginId);
    if (
      L !== void 0 &&
      row.name === L.rowName &&
      (row.generation === void 0 || s.has(row) || getSyncedPluginAttestation(dir) !== void 0)
    )
      y.set(dir, L.attestation);
  }
  setSyncedPluginDirs(
    h.map(({ dir: dir }) => dir),
    y,
    bNt(h),
  );
}
//@ chunk-e6aww6q8.js:673719-673790 placement
function bNt(e) {
  return new Map(e.map(({ dir: dir, row: row }) => [dir, row.pluginId]));
}

export {
  isAppliedListCurrent,
  pruneSyncedPluginsForClosedGate,
  completeDeferredRemovals,
  ensureSyncedPluginDirsRegistered,
  pNt,
  getRegisteredSyncedDirs,
  listSyncedPluginDirs,
  Ob,
  Bue,
  ufn,
  runPluginsSyncRound,
  findInstalledSyncedPlugins,
};
