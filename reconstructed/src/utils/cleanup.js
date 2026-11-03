/**
 * utils/cleanup.ts
 *
 * 并入旧版已有路径：清理（转录保留期清理）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cleanup.ts
 * pieces: chunk-23fm9f0d.js (94), chunk-4nhpaxz9.js (1), chunk-kqn19nw9.js (3)
 * attribution: placement 22, facade-majority 8, layout 21, fingerprint 8, file-local 1, callgraph-witnessed 2, affinity 8, sole-consumer 28
 */
import { join, join as join_2, join as join_3, basename, dirname } from "path";
import { homedir } from "os";
import * as fsPromisesModule from "fs/promises";
import { lstat, readdir, unlink, rmdir } from "fs/promises";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, E } from "../../vendor/zod/v4/classic/schemas.js";
import { x_n } from "./plugins/hooksModulesRollout.js";
import { getPluginRegistry } from "./plugins/pluginLoadState.js";
import { queueHookedSettingsMerge } from "./plugins/loadPluginHooks.js";
import { sleep } from "./sleep.js";
import { logForDebugging } from "./debug.js";
import {
  AUTO_MODE_DUMP_FILES,
  AUTO_MODE_DUMP,
  AUTO_MODE_ENV_EDIT,
  AUTO_MODE_BUILTINS,
} from "./teleport/autoModeDumps.js";
import {
  storageNameSpellings,
  isValidKeySegment,
  QOi,
  YOi,
  STORAGE_SPACES,
} from "./storage/storageSpaces.js";
import {
  QIi,
  ARCHIVE_SYNC,
  FOLDER_SYNC,
  STEPS_UNDER_WAY_DIR,
  SIDE_GIT,
  CLOUD_SNAPSHOTS_DIR,
  Nhs,
} from "./storage/storageKeys.js";
import { isOwnTempName, publishWriteAtomic, isTempFileName } from "./atomicPublishWrite.js";
import { isDiskless, getSessionId } from "../bootstrap/state.js";
import { isSettingSourceEnabled } from "./settings/constants.js";
import {
  getSettings_DEPRECATED,
  getSettingsForSource,
  rawSettingsKeyPresence,
  getSettingsForSourceTightenOnly,
  getSecuritySensitiveSetting,
  anyAdminPolicyTierGovernsRetention,
  getPolicySettingsLoadErrors,
} from "./settings/settings.js";
import { formatInvalidSettingNotice } from "./settings/settingsNotices.js";
import {
  RETENTION_POLICY_KEYS,
  PARENT_MANAGED_SETTINGS_SOURCE_LABEL,
} from "./settings/managedFileSettings.js";
import {
  hostSessionSkipsSharedCache,
  holdsNoServedSettings,
} from "../services/remoteManagedSettings/remoteSettingsCache.js";
import { getEligibilityMemo } from "../services/remoteManagedSettings/remoteSettingsState.js";
import { _qt, yqt, BRIDGE_SPAWN, C3o, Iai, Q6r } from "./sandbox/celHostFunctions.js";
import { jsonParse, jsonParseRaw } from "./slowOperations.js";
import { hasComplianceTaint } from "../services/policyLimits/complianceTaints.js";
import { firstLineOf } from "./stringUtils.js";
import { isFsInaccessible, isEnvFsErrno, isENOENT, getErrnoCode } from "./errors.js";
import { getFsImplementation } from "./fsOperations.js";
import { logError } from "./log.js";
import { CACHE_PATHS } from "./cachePaths.js";
import { scanDirectoryForPaths } from "./suggestions/directoryCompletion.js";
import { getProjectsDir } from "./sessionStorage.js";
import { claudeTempDir } from "./tempDir.js";
import {
  LITE_READ_BUF_SIZE,
  readHeadAndTail,
  anchorOffsetTail,
  extractFieldFromFirstEntryStrict,
  extractFieldFromLastEntryStrict,
} from "./sessionStoragePortable.js";
import { isHostEntrypointName } from "./entrypointKinds.js";
import { TOOL_RESULTS_SUBDIR } from "./toolResultStorage.js";
import { getClaudeConfigDir, getClaudeConfigDirOrNull } from "./envUtils.js";
import { CVn, FWs } from "./model/thirdPartyModelAccess.js";
import { modelCatalogCacheDir, MASKED_IDS_JSON } from "./model/modelCatalog/maskedIds.js";
import { PUBLISHED_FLOOR_JSON } from "./model/modelCatalog/publishedCatalogFloor.js";
import { isProcessRunning } from "./genericProcessUtils.js";
import { pruneReviewEntriesBefore } from "./settings/settingsReview.js";
import { eie } from "../services/memorySync/syncFiles.js";
import { REMOTE_SETTINGS_CONSENT_FILE } from "../services/remoteManagedSettings/consentRecords.js";
import { mapped, checkCacheFilePermissions } from "./settings/policyCertificates.js";
import { openHistoryFile, J2t, xnt } from "./historyFile.js";
import { lock, releaseLockQuietly } from "./lockfile.js";
import { resetPlanFileCacheToUnknown } from "./plans.js";
import { verifySyncRoot, readSyncMarker, checkSyncRoots } from "./claudeAiSync/syncOwnedRoot.js";
import { skillWatchStateByHost } from "../skills/skillChangeWatch.js";
import { scanAllSessions } from "../commands/insights.js";
import {
  getBashEditDiffDir,
  statOwnedPrivateDir,
  BASH_EDIT_DIFF,
  getFileIdentity,
} from "./sandbox/userTempRoot.js";
import { sweepSeedAdmin } from "./git/builderGit/seedAdmin.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { peerTransferSpoolDir } from "./peerFileReceive.js";
import { PEER_TRANSFER_VERSION } from "./peerFileTransfer.js";
import {
  xdr,
  ugi,
  SKILLS_SYNC_DIR,
  WYe,
  Cte,
  GYe,
  LFe,
  getSyncBucket,
  getStoredAccountBucket,
  SYNCED_MANIFEST_FILE,
  cU,
  fgi,
} from "./plugins/syncedItems.js";
import { queueSyncTrashTrim } from "./plugins/syncTrash.js";
import { K1t } from "./claudeAiSync/skillsSync.js";
import {
  getPluginsDirectory,
  isSetAsideFileName,
  isUnreadableKeptFileName,
} from "./plugins/pluginDirectories.js";
import { MCP_SKILL_ARCHIVES, me } from "./_new/cleanup.helpers-23fm.js";
import { getCacheBreakDiffPath } from "../services/api/promptCacheBreakDetection.js";
import { JKo } from "../services/memorySync/pathScrub.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { logEvent } from "../services/analytics/index.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { getMemoryBaseDir, getAutoMemPath } from "../memdir/paths.js";
import { findModifiedFiles } from "./filePersistence/outputsScanner.js";
import { cleanupOldImageCaches } from "./imageStore.js";
import { logRetentionSweep } from "./telemetry/thirdPartyEventRecords.js";
import { resolveBackupPath } from "./fileHistory.js";
import { getSessionEnvDirPath } from "./sessionEnvironment.js";
import { getTaskOutputDir } from "./_new/getTaskOutputDir.js";
import { uploadsDir } from "../bridge/inboundAttachments.js";
import { cleanupOldTempDirs, qt, cleanupTeamInboxes, cleanupDaemonFiles } from "./_new/cleanupDaemonFiles.js";
import { getDumpPromptsPath } from "../services/api/dumpPrompts.js";
import { getConfigBackupDir } from "./config.js";
import { getMcpAuthCachePath } from "../services/mcp/client.js";
import { cleanupOldPastes } from "./pasteStore.js";
import { cleanupStaleAgentWorktrees } from "./worktree.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { Vt } from "./agentId.js";
import { pinWriteTarget } from "./fsSafety/pathRevalidation.js";

//@ chunk-23fm9f0d.js:3149-3210 placement
var en = DoctorLazy(() => u({ key: o(), integrity: o().nullable(), time: E() }));
//@ chunk-23fm9f0d.js:3210-3995 placement
async function startRetentionSweep(e = x_n) {
  let r = getPluginRegistry(),
    s = { end: () => {} },
    abortController = new AbortController();
  if (
    await Promise.race([
      Promise.resolve(r.hooksLoadAtStartup)
        .catch(() => {})
        .then(() => r.hookRegistrationInFlight?.catch(() => {}))
        .then(async () => {
          while (r.hookRegistrationOwed && !abortController.signal.aborted)
            (await new Promise((y) => {
              s.end = r.hookRegistrationEnded.subscribe(y);
            }),
              s.end());
          if (abortController.signal.aborted) return !1;
          return (await queueHookedSettingsMerge("a retention sweep starts"), !0);
        }),
      sleep(e, abortController.signal).then(() => !1),
    ]).finally(() => abortController.abort())
  )
    return r.hooksUnknownCause === void 0 ? "asked" : "load_failed";
  s.end();
  let m = r.hookRegistrationInFlight !== void 0 ? "load_running" : "unanswered",
    g = r.hookRegistrationOwed ? "load_owed" : m;
  return (
    logForDebugging(
      `Retention cleanup: the settings.read hooks were not asked within ${e} ms (${g}); the sweep begins on the merge as last held.`,
    ),
    g
  );
}
//@ chunk-23fm9f0d.js:3995-4085 placement
var Ue = 0,
  Ye = ["ccr-tip.json", "custom-title.json", "precompact.json", "sent-prefix.json", AUTO_MODE_DUMP_FILES];
//@ chunk-23fm9f0d.js:4085-4172 placement
function ye(e) {
  let r = storageNameSpellings(e);
  return isValidKeySegment(e) && r.length === 1 && r[0] === e.toLowerCase() && QIi(e);
}
//@ chunk-23fm9f0d.js:4172-4329 placement
function isAutoModeStateFile(e) {
  return (
    Ye.some((r) => e === r || isOwnTempName(e, r)) ||
    (e.startsWith(AUTO_MODE_DUMP) && (e.endsWith(".json") || e.includes(".json.tmp."))) ||
    (e.startsWith(AUTO_MODE_ENV_EDIT) && e.endsWith(".md"))
  );
}
//@ chunk-23fm9f0d.js:4329-5677 facade-majority
async function retentionCleanupSkipReason(e) {
  if (isDiskless()) return "diskless";
  if (!isSettingSourceEnabled("userSettings") && getSettings_DEPRECATED()?.cleanupPeriodDays === void 0)
    return (
      logForDebugging(
        "Skipping retention cleanup: userSettings source is disabled (--setting-sources) and no enabled source provides cleanupPeriodDays.",
      ),
      "user_source_disabled"
    );
  if (getSettingsForSource("policySettings")?.cleanupPeriodDays !== void 0) return null;
  if (
    formatInvalidSettingNotice().errors.filter(
      (error) => !error.mcpErrorMetadata && error.severity !== "warning",
    ).length > 0
  )
    for (let s of RETENTION_POLICY_KEYS) {
      let n = await rawSettingsKeyPresence(
        s,
        e,
        s === "desktopSessionCleanupPeriodDays"
          ? { presenceSources: ["userSettings", "flagSettings"] }
          : void 0,
      );
      if (n === "unknowable")
        return (
          logForDebugging(
            `Skipping cleanup: a settings file could not be read or parsed, so ${s} may be set to a value that cannot be seen. Fix the settings file (see /doctor) to re-enable cleanup.`,
          ),
          "settings_unknowable"
        );
      if (n === "present")
        return (
          logForDebugging(
            `Skipping cleanup: settings have validation errors but ${s} was explicitly set. Fix settings errors to enable cleanup.`,
          ),
          "settings_invalid_key_set"
        );
    }
  if (hostSessionSkipsSharedCache() && holdsNoServedSettings(getEligibilityMemo() === !0))
    return (
      logForDebugging(
        "Skipping retention cleanup: this session reads no stored server-managed settings and holds none of its own (its request failed, has not finished, or returned nothing that could be applied), so cleanupPeriodDays may be set to a value that cannot be seen. A later process that is not paused for this reason runs the cleanup.",
      ),
      "remote_settings_unknowable"
    );
  return null;
}
//@ chunk-23fm9f0d.js:5677-5740 facade-majority
async function isRetentionCleanupSafe(e, r) {
  return (await startRetentionSweep(r), (await retentionCleanupSkipReason(e)) === null);
}
//@ chunk-23fm9f0d.js:5740-5838 layout
function Ee(e) {
  let date = new Date(Date.now() - e * 24 * 60 * 60 * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}
/**
 * 计算清理截止日期；cleanupPeriodDays=0 时返回 null（不清理）。
 */
//@ chunk-23fm9f0d.js:5838-5950 facade-majority = getCutoffDate (1)
function getCutoffDate(e) {
  let s = (getSettings_DEPRECATED() || {}).cleanupPeriodDays ?? _qt;
  if (s === 0) return null;
  if (e !== void 0 && e < s) s = e;
  return Ee(s);
}
//@ chunk-23fm9f0d.js:5950-5989 placement
var q = ".desktop-released.json",
  Ge = 4096;
//@ chunk-23fm9f0d.js:5989-6027 placement
function ie(e) {
  return e.slice(0, -6) + q;
}
//@ chunk-23fm9f0d.js:6027-6068 placement
var ze = DoctorLazy(() => u({ reason: o().optional() }));
//@ chunk-23fm9f0d.js:6068-6363 placement
async function getDumpReleaseState(e, r, s) {
  let fileFdGated = await r.readFileFdGated(e, Ge);
  if (fileFdGated === null) return "none";
  let f;
  try {
    let safeParse = ze().safeParse(jsonParse(fileFdGated.content));
    f = safeParse.success ? safeParse.data.reason : void 0;
  } catch {
    return "none";
  }
  if (f === "delete") return "release-now";
  if (f === "archive") return fileFdGated.stats.mtime < s ? "release-now" : "grace";
  return "none";
}
//@ chunk-23fm9f0d.js:6363-6416 placement
function Xe(e) {
  return /^[0-9A-Za-z_-]{1,64}$/.test(e);
}
//@ chunk-23fm9f0d.js:6416-6478 layout
function Je() {
  return getRetentionCutoff("desktopSessionCleanupPeriodDays", Ue);
}
//@ chunk-23fm9f0d.js:6478-6600 placement = _temp5 (1)
function getRetentionCutoff(e, r) {
  let s = getSettingsForSourceTightenOnly("userSettings")?.[e],
    n = getSecuritySensitiveSetting(e)[0] ?? (s !== void 0 && r !== 0 && s > r ? s : r);
  if (n === 0) return null;
  return Ee(n);
}
//@ chunk-23fm9f0d.js:6600-6782 layout
function isRetentionPolicyManaged() {
  if (getSettingsForSource("policySettings")?.cleanupPeriodDays !== void 0) return !0;
  if (anyAdminPolicyTierGovernsRetention()) return !0;
  return getPolicySettingsLoadErrors().some(
    (e) =>
      e.file !== PARENT_MANAGED_SETTINGS_SOURCE_LABEL &&
      (RETENTION_POLICY_KEYS.some((r) => r === e.path) || e.severity !== "warning"),
  );
}
//@ chunk-23fm9f0d.js:6782-6833 facade-majority
function isRetentionExemptionDisabled() {
  return isRetentionPolicyManaged() || hasComplianceTaint("hipaa") || hasComplianceTaint("zdr");
}
//@ chunk-23fm9f0d.js:6833-6913 layout
function emptyCleanupResult() {
  return { messages: 0, errors: 0, filesRetainedFresh: 0, filesPastCutoff: 0 };
}
//@ chunk-23fm9f0d.js:6913-7106 layout
function addCleanupResults(e, r) {
  return {
    messages: e.messages + r.messages,
    errors: e.errors + r.errors,
    filesRetainedFresh: e.filesRetainedFresh + r.filesRetainedFresh,
    filesPastCutoff: e.filesPastCutoff + r.filesPastCutoff,
  };
}
//@ chunk-23fm9f0d.js:7106-7217 fingerprint = convertFileNameToDate (1)
function convertFileNameToDate(filename) {
  let isoStr = firstLineOf(filename, ".").replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, "T$1:$2:$3.$4Z");
  return new Date(isoStr);
}
/**
 * 清理时可静默忽略的文件系统错误（不存在/已删除等）。
 */
//@ chunk-23fm9f0d.js:7217-7253 facade-majority
function isCleanupQuietFsErrno(e) {
  return isFsInaccessible(e) || isEnvFsErrno(e);
}
//@ chunk-23fm9f0d.js:7253-7611 layout
async function cleanupFilesByNameDate(e, r, s) {
  let n = emptyCleanupResult();
  try {
    let entries = await getFsImplementation().readdir(e);
    for (let i of entries)
      try {
        if (convertFileNameToDate(i.name) < r)
          if ((await getFsImplementation().unlink(join(e, i.name)), s)) n.messages++;
          else n.errors++;
      } catch (error) {
        logForDebugging(`Failed to clean up file ${i.name} in ${e}: ${error}`, { level: "error" });
      }
  } catch (error) {
    if (isENOENT(error));
    else if (isCleanupQuietFsErrno(error))
      logForDebugging(`cleanup readdir ${e} failed: ${error.code}`, { level: "error" });
    else logError(error);
  }
  return n;
}
//@ chunk-23fm9f0d.js:7611-8033 fingerprint = cleanupOldMessageFiles (0.7)
async function cleanupOldMessageFiles() {
  let fsImpl = getFsImplementation(),
    cutoffDate = getCutoffDate();
  if (cutoffDate === null) return emptyCleanupResult();
  let errorPath = CACHE_PATHS.errors(),
    baseCachePath = CACHE_PATHS.baseLogs(),
    result = await cleanupFilesByNameDate(errorPath, cutoffDate, !1);
  try {
    let dirents;
    try {
      dirents = await fsImpl.readdir(baseCachePath);
    } catch {
      return result;
    }
    let mcpLogDirs = dirents
      .filter((dirent) => dirent.isDirectory() && dirent.name.startsWith("mcp-logs-"))
      .map((dirent) => join(baseCachePath, dirent.name));
    for (let mcpLogDir of mcpLogDirs)
      ((result = addCleanupResults(result, await cleanupFilesByNameDate(mcpLogDir, cutoffDate, !0))),
        await tryRmdir(mcpLogDir, fsImpl));
  } catch (error) {
    if (isENOENT(error));
    else if (isCleanupQuietFsErrno(error))
      logForDebugging(`cleanup mcp-logs scan failed: ${error.code}`, { level: "error" });
    else logError(error);
  }
  return result;
}
//@ chunk-23fm9f0d.js:8033-8321 fingerprint = unlinkIfOld (0.686)
async function unlinkIfOld(e, r, s, n, f = r, i) {
  let m;
  try {
    m = await s.stat(e);
  } catch (error) {
    if (isENOENT(error)) return !1;
    throw error;
  }
  if (!(m.mtime < r)) return (n.filesRetainedFresh++, !1);
  if (i !== void 0 && (await i(e, m))) return !1;
  try {
    await s.unlink(e);
  } catch (error) {
    if (isENOENT(error)) return !1;
    if (f !== null && m.mtime < f) n.filesPastCutoff++;
    throw error;
  }
  return !0;
}
//@ chunk-23fm9f0d.js:8321-8396 fingerprint = tryRmdir (1)
async function tryRmdir(dirPath, fsImpl) {
  if (!(await isDirectory(dirPath, fsImpl))) return;
  try {
    await fsImpl.rmdir(dirPath);
  } catch {}
}
//@ chunk-23fm9f0d.js:8396-8413 layout
var SESSION_SUBDIR_NAMES = [ARCHIVE_SYNC, FOLDER_SYNC];
//@ chunk-23fm9f0d.js:8413-9470 layout
async function cleanupSessionDir(e, r, s, n) {
  try {
    for (let k of SESSION_SUBDIR_NAMES) await cleanupDirFiles(join(e, k), r, s, n);
    let f = !1;
    try {
      let { sweepCheckoutSessionTrash: sweepCheckoutSessionTrash } = await import("./chunk-4nhpaxz9.js"),
        S = await sweepCheckoutSessionTrash(e, r.getTime());
      ((n.messages += S.removed), (n.errors += S.errors), (f = S.newestKeptMs !== null));
    } catch {
      (n.errors++, (f = !0));
    }
    let filtered = (await s.readdir(e)).filter((k) => !SESSION_SUBDIR_NAMES.includes(k.name)),
      m = null;
    for (let k of filtered) {
      let S = join(e, k.name),
        w =
          (await entryKind(k, S, s)) === "directory"
            ? await scanDirectoryForPaths(S, s, { requireCompleteWalk: !0 })
            : (await s.lstat(S)).mtimeMs;
      if (w !== null) m = Math.max(m ?? -1 / 0, w);
    }
    if (!((m ?? (await cleanupOldVersionsThrottled(e, s))) < r.getTime())) return;
    let included = (
        await Promise.all(
          SESSION_SUBDIR_NAMES.map((k) =>
            s.lstat(join(e, k)).then(
              (S) => S.isDirectory(),
              (S) => {
                if (isENOENT(S)) return !1;
                throw S;
              },
            ),
          ),
        )
      ).includes(!0),
      toSorted = filtered.toSorted(
        (k, S) => Number(k.name === STEPS_UNDER_WAY_DIR) - Number(S.name === STEPS_UNDER_WAY_DIR),
      );
    if (included || f) {
      let k = !1;
      for (let S of toSorted) {
        if (f && S.name === SIDE_GIT) {
          k = (await removeGitObjectsDir(join(e, S.name), s)) || k;
          continue;
        }
        (await s.rm(join(e, S.name), { recursive: !0, force: !0 }), (k = !0));
      }
      if (k) n.messages++;
      return;
    }
    for (let k of toSorted.slice(0, -1)) await s.rm(join(e, k.name), { recursive: !0, force: !0 });
    (await s.rm(e, { recursive: !0, force: !0 }), n.messages++);
  } catch (error) {
    if (!isENOENT(error)) n.errors++;
  }
}
//@ chunk-23fm9f0d.js:9470-9957 layout
async function cleanupDirFiles(e, r, s, n) {
  if (!(await isDirectory(e, s))) return;
  let f = await s.readdir(e).catch(() => []);
  for (let i of f) {
    let m = await entryKind(i, join(e, i.name), s).catch((y) => {
      if (!isENOENT(y)) n.errors++;
      return "other";
    });
    if (m === "file") {
      try {
        if (await unlinkIfOld(join(e, i.name), r, s, n)) n.messages++;
      } catch {
        n.errors++;
      }
      continue;
    }
    if (m !== "directory") continue;
    let g = join(e, i.name);
    try {
      if (
        ((await scanDirectoryForPaths(g, s, { requireCompleteWalk: !0 })) ??
          (await cleanupOldVersionsThrottled(g, s))) < r.getTime()
      )
        (await s.rm(g, { recursive: !0, force: !0 }), n.messages++);
    } catch (error) {
      if (!isENOENT(error)) n.errors++;
    }
  }
  await tryRmdir(e, s);
}
//@ chunk-23fm9f0d.js:9957-10234 layout
async function entryKind(e, r, s) {
  if (e.isDirectory()) return "directory";
  if (e.isFile()) return "file";
  if (e.isSymbolicLink() || e.isFIFO() || e.isSocket() || e.isBlockDevice() || e.isCharacterDevice())
    return "other";
  let stats = await s.lstat(r);
  return stats.isDirectory() ? "directory" : stats.isFile() ? "file" : "other";
}
//@ chunk-23fm9f0d.js:10234-10289 file-local
async function cleanupOldVersionsThrottled(e, r) {
  return (await r.lstat(e)).mtimeMs;
}
//@ chunk-23fm9f0d.js:10289-10515 callgraph-witnessed = cleanupOldSessionFiles (0.308)
async function cleanupOldSessionFiles(e) {
  let cutoffDate = getCutoffDate(),
    s = emptyCleanupResult();
  if (cutoffDate === null) return s;
  let projectsDir = getProjectsDir(),
    fsImpl = getFsImplementation();
  for (let i of await fsImpl.readdir(projectsDir).catch(() => [])) {
    let projectDir = join(projectsDir, i.name),
      sessionDir = join(projectDir, CLOUD_SNAPSHOTS_DIR);
    if (i.isDirectory() && (await isDirectory(sessionDir, fsImpl)))
      (await cleanupSessionDir(sessionDir, cutoffDate, fsImpl, s), await tryRmdir(projectDir, fsImpl));
  }
  return s;
}
//@ chunk-23fm9f0d.js:10515-10798 affinity
async function removeGitObjectsDir(e, r) {
  let s = e,
    n = !1;
  for (let f of ["objects", "info", "alternates"]) {
    if (!(await r.lstat(s)).isDirectory()) return (await r.rm(s, { recursive: !0, force: !0 }), !0);
    for (let i of await r.readdir(s))
      if (i.name !== f) (await r.rm(join(s, i.name), { recursive: !0, force: !0 }), (n = !0));
    s = join(s, f);
  }
  return n;
}
//@ chunk-23fm9f0d.js:10798-10879 affinity
async function isDirectory(e, r) {
  try {
    return (await r.lstat(e)).isDirectory();
  } catch {
    return !1;
  }
}
//@ chunk-23fm9f0d.js:10879-11309 affinity
async function cleanupTreeRecursive(e, r, s, n, f = {}) {
  let { entryMatcher: entryMatcher } = f,
    m = await s.readdir(e).catch((g) => {
      if (f.countEnumerationFailures === !0 && !isENOENT(g)) n.errors++;
      return [];
    });
  for (let g of m) {
    let y = join(e, g.name);
    if (g.isDirectory()) await cleanupTreeRecursive(y, r, s, n, f);
    else if (entryMatcher !== void 0 && !entryMatcher(g.name));
    else if (g.isFile())
      try {
        if (await unlinkIfOld(y, r, s, n)) n.messages++;
      } catch {
        n.errors++;
      }
    else
      try {
        if ((await s.lstat(y)).mtime < r) (await s.unlink(y), n.messages++);
      } catch {
        n.errors++;
      }
  }
  await tryRmdir(e, s);
}
/**
 * 按保留期清理旧会话转录（hipaa/zdr/桌面端等情况豁免）。
 */
//@ chunk-23fm9f0d.js:11802-16138 placement
async function cleanupOldTranscripts() {
  let e = getCutoffDate(),
    r = { ...emptyCleanupResult(), transcripts: 0, transcriptsExemptedDesktop: 0 };
  if (e === null) return r;
  let s = getProjectsDir(),
    n = getFsImplementation(),
    f;
  try {
    f = await n.readdir(s);
  } catch {
    return r;
  }
  let i;
  try {
    if (((i = claudeTempDir()), !(await n.lstat(i)).isDirectory())) i = null;
  } catch {
    i = null;
  }
  let m = isRetentionExemptionDisabled(),
    g = Je(),
    y = null,
    D = m
      ? void 0
      : async (k, S) => {
          if (hasComplianceTaint("hipaa") || hasComplianceTaint("zdr")) return !1;
          if (g !== null && S.mtime < g) return !1;
          let w = await getDumpReleaseState(ie(k), n, e);
          if (w === "release-now") return !1;
          if (w === "grace") return (r.transcriptsExemptedDesktop++, !0);
          if (S.size === 0) {
            if (
              !(await n.stat(k.slice(0, -6)).then(
                (F) => F.isDirectory(),
                () => !1,
              ))
            )
              return (r.transcriptsExemptedDesktop++, !0);
          }
          y ??= Buffer.allocUnsafe(LITE_READ_BUF_SIZE);
          let { head: head, tail: tail } = await readHeadAndTail(k, S.size, y);
          if (head === "" && S.size > 0)
            throw (
              await n.stat(k),
              Error(
                "transient read failure while classifying a transcript for the desktop retention exemption",
              )
            );
          let C = S.size > LITE_READ_BUF_SIZE ? anchorOffsetTail(tail) : tail,
            R = extractFieldFromFirstEntryStrict(head, "entrypoint"),
            A = extractFieldFromLastEntryStrict(C, "entrypoint");
          if (!((R !== void 0 && isHostEntrypointName(R)) || (A !== void 0 && isHostEntrypointName(A))))
            return !1;
          let H = basename(k).startsWith("agent-")
            ? (extractFieldFromFirstEntryStrict(head, "sessionId") ??
              extractFieldFromLastEntryStrict(C, "sessionId"))
            : void 0;
          if (H !== void 0 && Xe(H)) {
            let B = join(dirname(k), `${H}${q}`);
            if (B !== ie(k)) {
              if ((await getDumpReleaseState(B, n, e)) === "release-now") return !1;
            }
          }
          return (r.transcriptsExemptedDesktop++, !0);
        };
  for (let k of f) {
    if (!k.isDirectory()) continue;
    let S = join(s, k.name),
      w;
    try {
      w = await n.readdir(S);
    } catch {
      r.errors++;
      continue;
    }
    w.sort((R, A) => Number(A.isDirectory()) - Number(R.isDirectory()));
    let P = [],
      O = null,
      C = new Set(w.filter((R) => R.isFile() && R.name.endsWith(".jsonl")).map((R) => R.name.slice(0, -6)));
    for (let R of w) {
      if (O === null && !R.isDirectory()) O = r.errors;
      if (R.isFile()) {
        if (R.name.endsWith(q) && C.has(R.name.slice(0, -q.length))) continue;
        if (
          !R.name.endsWith(".jsonl") &&
          !R.name.endsWith(".cast") &&
          !R.name.endsWith(".ccr-tip.json") &&
          !R.name.endsWith(".precompact.json") &&
          !R.name.endsWith(q) &&
          !R.name.includes(".desktop-released.json.tmp") &&
          !R.name.endsWith(".dir-sync.json") &&
          !R.name.endsWith(".dir-sync-empty.json") &&
          !R.name.endsWith(".cloud-worktrees.json") &&
          !R.name.includes(".ccr-tip.json.tmp.") &&
          !R.name.includes(".precompact.json.tmp.") &&
          !R.name.includes(".dir-sync.json.tmp.") &&
          !R.name.includes(".dir-sync-empty.json.tmp.") &&
          !R.name.includes(".cloud-worktrees.json.tmp.") &&
          !R.name.includes(".jsonl.compact.tmp.") &&
          !R.name.includes(".jsonl.superseded-")
        )
          continue;
        let A = join(S, R.name);
        try {
          if (await unlinkIfOld(A, e, n, r, void 0, R.name.endsWith(".jsonl") ? D : void 0)) {
            if ((r.messages++, R.name.endsWith(".jsonl"))) {
              r.transcripts++;
              let sliced = R.name.slice(0, -6);
              if (ye(sliced)) {
                if (
                  (await n.unlink(join(S, `${sliced}.ccr-tip.json`)).catch(() => {}),
                  await n.unlink(join(S, `${sliced}.precompact.json`)).catch(() => {}),
                  P.push(ie(A)),
                  await n.rm(join(S, sliced), { recursive: !0, force: !0 }).catch(() => {
                    r.errors++;
                  }),
                  i !== null)
                ) {
                  let H = join(i, k.name),
                    B = await n.lstat(H).catch(() => null);
                  if (B?.isDirectory()) {
                    if (
                      (await n.rm(join(H, sliced), { recursive: !0, force: !0 }).catch(() => {
                        r.errors++;
                      }),
                      B.mtime < e)
                    )
                      await tryRmdir(H, n);
                  }
                }
              }
            }
          }
        } catch (error) {
          if (!isENOENT(error)) r.errors++;
        }
      } else if (R.isDirectory()) {
        let A = join(S, R.name);
        if (R.name === "bagel") {
          let F = await scanDirectoryForPaths(A, n);
          if (F !== null && F < e.getTime())
            try {
              (await n.rm(A, { recursive: !0, force: !0 }), r.messages++);
            } catch {
              r.errors++;
            }
          continue;
        }
        if (R.name === CLOUD_SNAPSHOTS_DIR) continue;
        if (!ye(R.name)) {
          let F = await n.lstat(A).catch(() => null);
          if (F !== null && F.mtime < e) await tryRmdir(A, n);
          continue;
        }
        let j = join(A, TOOL_RESULTS_SUBDIR);
        if (await isDirectory(j, n)) {
          let F = await n.readdir(j).catch(() => []);
          for (let W of F)
            if (W.isFile())
              try {
                if (await unlinkIfOld(join(j, W.name), e, n, r)) r.messages++;
              } catch {
                r.errors++;
              }
            else if (W.isDirectory()) {
              let Q = join(j, W.name),
                ne;
              try {
                ne = await n.readdir(Q);
              } catch {
                continue;
              }
              for (let ue of ne) {
                if (!ue.isFile()) continue;
                try {
                  if (await unlinkIfOld(join(Q, ue.name), e, n, r)) r.messages++;
                } catch {
                  r.errors++;
                }
              }
              if (ne.length > 0 || (await cleanupOldVersionsThrottled(Q, n).catch(() => 1 / 0)) < e.getTime())
                await tryRmdir(Q, n);
            }
          if (F.length > 0 || (await cleanupOldVersionsThrottled(j, n).catch(() => 1 / 0)) < e.getTime())
            await tryRmdir(j, n);
        }
        let H = await n.readdir(A).catch(() => []);
        for (let F of H) {
          if (!F.isFile() || !(isAutoModeStateFile(F.name) || Nhs(F.name) !== void 0)) continue;
          if (F.name === "custom-title.json" && C.has(R.name)) continue;
          try {
            if (await unlinkIfOld(join(A, F.name), e, n, r)) r.messages++;
          } catch {
            r.errors++;
          }
        }
        let B = join(A, "mcp-tasks");
        if (await isDirectory(B, n)) {
          for (let F of await n.readdir(B).catch(() => [])) {
            let W = F.name.endsWith(".json") || F.name.includes(".json.tmp.");
            if (!F.isFile() || !W) continue;
            try {
              if (await unlinkIfOld(join(B, F.name), e, n, r)) r.messages++;
            } catch {
              r.errors++;
            }
          }
          await tryRmdir(B, n);
        }
        if (!C.has(R.name))
          for (let F of ["subagents", "workflows", "remote-agents"]) {
            let W = join(A, F);
            if (await isDirectory(W, n)) await cleanupTreeRecursive(W, e, n, r);
          }
        await tryRmdir(A, n);
      }
    }
    if (O !== null && r.errors > O) P.length = 0;
    for (let R of P) await n.unlink(R).catch(() => {});
    await tryRmdir(S, n);
  }
  return r;
}
/**
 * 删除目录中名字匹配（后缀或谓词）且早于保留期截止时间的文件，统计删除数与错误数，可选在清空后删除目录。
 */
//@ chunk-23fm9f0d.js:16138-16495 placement
async function cleanupOldFilesMatching(e, r, s = !0, n, f) {
  let i = f === void 0 ? getCutoffDate(n) : f,
    m = emptyCleanupResult();
  if (i === null) return m;
  let g = f !== void 0 || n === void 0 ? i : getCutoffDate(),
    y = typeof r === "string" ? (S) => S.endsWith(r) : r,
    D = getFsImplementation(),
    k;
  try {
    k = await D.readdir(e);
  } catch {
    return m;
  }
  for (let S of k) {
    if (!S.isFile() || !y(S.name)) continue;
    try {
      if (await unlinkIfOld(join(e, S.name), i, D, m, g)) m.messages++;
    } catch {
      m.errors++;
    }
  }
  if (s) await tryRmdir(e, D);
  return m;
}
//@ chunk-23fm9f0d.js:16495-16721 placement
async function cleanupHfiAuthFile() {
  let e = emptyCleanupResult(),
    r = getCutoffDate();
  if (r === null) return e;
  let s = join(getClaudeConfigDir(), "hfi-auth.json");
  try {
    if (await unlinkIfOld(s, r, getFsImplementation(), e)) e.messages++;
  } catch (error) {
    if (!isENOENT(error))
      (logForDebugging(`Failed to clean up HFI auth file: ${error}`, { level: "error" }), e.errors++);
  }
  return e;
}
//@ chunk-23fm9f0d.js:16721-16989 placement
async function cleanupTeamDiscoveryCache() {
  let e = emptyCleanupResult(),
    r = getCutoffDate();
  if (r === null) return e;
  let s = join(getClaudeConfigDir(), "cache", "team-discovery.json");
  try {
    if (await unlinkIfOld(s, r, getFsImplementation(), e)) e.messages++;
  } catch (error) {
    if (!isENOENT(error))
      if ((e.errors++, isCleanupQuietFsErrno(error)))
        logForDebugging(`cleanup team-discovery-cache failed: ${error.code}`, { level: "error" });
      else logError(error);
  }
  return e;
}
//@ chunk-23fm9f0d.js:16989-17238 placement
async function cleanupModelAccessMemory() {
  let e = emptyCleanupResult(),
    r = getCutoffDate();
  if (r === null) return e;
  for (let s of [CVn(), FWs()])
    try {
      if (await unlinkIfOld(s, r, getFsImplementation(), e)) e.messages++;
    } catch (error) {
      if (!isENOENT(error))
        if ((e.errors++, isCleanupQuietFsErrno(error)))
          logForDebugging(`cleanup model-access memory failed: ${error.code}`, { level: "error" });
        else logError(error);
    }
  return e;
}
//@ chunk-23fm9f0d.js:17238-17344 placement
async function cleanupModelCatalogCache() {
  return cleanupOldFilesMatching(
    modelCatalogCacheDir(),
    (e) =>
      e !== MASKED_IDS_JSON &&
      e !== PUBLISHED_FLOOR_JSON &&
      (e.endsWith(".json") || e.includes(".json.tmp.")),
  );
}
//@ chunk-23fm9f0d.js:17604-17882 sole-consumer
async function cleanupDeviceUnboundCreates() {
  let e = emptyCleanupResult(),
    r = getCutoffDate();
  if (r === null) return e;
  let s = join(getClaudeConfigDir(), "state", "device-unbound-creates.json");
  try {
    if (await unlinkIfOld(s, r, getFsImplementation(), e)) e.messages++;
  } catch (error) {
    if (!isENOENT(error))
      if ((e.errors++, isCleanupQuietFsErrno(error)))
        logForDebugging(`cleanup device-unbound-creates failed: ${error.code}`, { level: "error" });
      else logError(error);
  }
  return e;
}
//@ chunk-23fm9f0d.js:17882-18158 sole-consumer
async function cleanupMcpDiscoverVerdicts() {
  let e = emptyCleanupResult(),
    r = getCutoffDate();
  if (r === null) return e;
  let s = join(getClaudeConfigDir(), "state", "mcp-discover-verdicts.json");
  try {
    if (await unlinkIfOld(s, r, getFsImplementation(), e)) e.messages++;
  } catch (error) {
    if (!isENOENT(error))
      if ((e.errors++, isCleanupQuietFsErrno(error)))
        logForDebugging(`cleanup mcp-discover-verdicts failed: ${error.code}`, { level: "error" });
      else logError(error);
  }
  return e;
}
//@ chunk-23fm9f0d.js:18158-18450 sole-consumer
async function cleanupDeviceMcpNotNow() {
  let e = emptyCleanupResult(),
    r = getCutoffDate(),
    s = getClaudeConfigDirOrNull();
  if (r === null || s === null) return e;
  let n = join(s, "state", "device-mcp-consent-not-now.json");
  try {
    if (await unlinkIfOld(n, r, getFsImplementation(), e)) e.messages++;
  } catch (error) {
    if (!isENOENT(error))
      if ((e.errors++, isCleanupQuietFsErrno(error)))
        logForDebugging(`cleanup device-mcp-not-now failed: ${error.code}`, { level: "error" });
      else logError(error);
  }
  return e;
}
//@ chunk-23fm9f0d.js:18450-18615 sole-consumer
async function cleanupServedCalls(e = join(homedir(), ".claude", "state", "served-calls")) {
  return cleanupOldFilesMatching(
    e,
    (r) => r.endsWith(".jsonl") || r.includes(".jsonl.tmp."),
    !0,
    void 0,
    getRetentionCutoff("cleanupPeriodDays", _qt),
  );
}
//@ chunk-23fm9f0d.js:18615-18850 sole-consumer
async function cleanupUnattendedServingRuns(
  e = join(homedir(), ".claude", "state", "unattended-serving-runs"),
) {
  return cleanupOldFilesMatching(
    e,
    (r) => {
      let s = /^([1-9][0-9]{0,9})\.json$/.exec(r)?.[1];
      return s === void 0 ? r.includes(".json.tmp.") : !isProcessRunning(Number(s));
    },
    !0,
    void 0,
    getRetentionCutoff("cleanupPeriodDays", _qt),
  );
}
//@ chunk-23fm9f0d.js:18850-19058 sole-consumer
async function cleanupSettingsReviewStore(e) {
  let r = emptyCleanupResult(),
    s = getCutoffDate();
  if (s === null) return r;
  try {
    r.messages += await pruneReviewEntriesBefore(s, e);
  } catch (error) {
    if ((r.errors++, isCleanupQuietFsErrno(error)))
      logForDebugging(`cleanup settings-review store failed: ${error.code}`, { level: "error" });
    else logError(error);
  }
  return r;
}
//@ chunk-23fm9f0d.js:19058-19260 sole-consumer
function isMalformedHistoryEntry(e) {
  if (!e) return !1;
  try {
    let r = jsonParseRaw(e);
    if (typeof r !== "object" || r === null) return !0;
    if (!("timestamp" in r)) return !0;
    let { timestamp: timestamp } = r;
    return typeof timestamp !== "number" || !Number.isFinite(timestamp);
  } catch {
    return !0;
  }
}
//@ chunk-23fm9f0d.js:19260-19457 sole-consumer
function isHistoryEntryOlderThan(e, r) {
  if (!e) return !1;
  try {
    let s = jsonParseRaw(e);
    if (typeof s !== "object" || s === null || !("timestamp" in s)) return !1;
    let { timestamp: timestamp } = s;
    return typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp < r;
  } catch {
    return !1;
  }
}
/**
 * 删除配置目录中早于截止时间的自有临时文件（history.jsonl、远程设置同意文件等的临时副本）；缓存文件改为检查权限而不删除。
 */
//@ chunk-23fm9f0d.js:19457-19782 sole-consumer
async function cleanupStaleConfigTempFiles(e, r) {
  let s;
  try {
    s = await fsPromisesModule.readdir(e);
  } catch {
    return;
  }
  let time = r.getTime();
  await Promise.all(
    s
      .filter(
        (f) =>
          isOwnTempName(f, "history.jsonl") ||
          eie(f) ||
          isOwnTempName(f, REMOTE_SETTINGS_CONSENT_FILE) ||
          mapped.some((i) => f === i || isOwnTempName(f, i)),
      )
      .map(async (f) => {
        let i = join(e, f);
        try {
          let stats = await fsPromisesModule.lstat(i);
          if (stats.isFile() && stats.mtimeMs < time)
            await (mapped.includes(f) ? checkCacheFilePermissions(i) : fsPromisesModule.unlink(i));
        } catch {}
      }),
  );
}
/**
 * 按保留期裁剪 history.jsonl：先无锁扫描去掉过期/格式错误的条目，加锁后核对文件身份与大小、扫描新增尾部，原子重写；文件在扫描期间变化则推迟，锁被破坏时放弃。
 */
//@ chunk-23fm9f0d.js:19782-21710 sole-consumer
async function pruneHistoryFile(cutoff) {
  let historyPath = join(getClaudeConfigDir(), "history.jsonl"),
    cutoffMs = cutoff.getTime(),
    shouldDrop = (y) => isHistoryEntryOlderThan(y, cutoffMs) || isMalformedHistoryEntry(y),
    stats,
    headScan;
  try {
    if (((stats = await fsPromisesModule.lstat(historyPath)), !stats.isFile()))
      return (
        logForDebugging("History retention prune skipped: history.jsonl is not a regular file", {
          level: "error",
        }),
        { entriesPruned: 0, errors: 1 }
      );
    headScan = await openHistoryFile(historyPath, shouldDrop, {
      start: 0,
      end: stats.size,
      tail: "defer",
      expect: { ino: stats.ino, birthtimeMs: stats.birthtimeMs },
    });
  } catch (error) {
    if (isENOENT(error)) return { entriesPruned: 0, errors: 0 };
    if (error instanceof J2t)
      return (
        logForDebugging("History retention prune deferred: history.jsonl changed under the scan"),
        { entriesPruned: 0, errors: 0 }
      );
    return (
      logForDebugging(`History retention prune failed: ${error}`, { level: "error" }),
      { entriesPruned: 0, errors: 1 }
    );
  }
  if (headScan.dropped === 0 && headScan.consumed === stats.size) return { entriesPruned: 0, errors: 0 };
  let release,
    lockCompromised = !1;
  try {
    release = await lock(historyPath, {
      ...xnt,
      onCompromised: (y) => {
        ((lockCompromised = !0),
          logForDebugging(`History retention lock compromised: ${y}`, { level: "error" }));
      },
    });
  } catch (error) {
    if (isENOENT(error)) return { entriesPruned: 0, errors: 0 };
    return (
      logForDebugging(`History retention prune failed: ${error}`, { level: "error" }),
      { entriesPruned: 0, errors: 1 }
    );
  }
  try {
    let stats_2 = await fsPromisesModule.lstat(historyPath);
    if (
      !stats_2.isFile() ||
      stats_2.size < headScan.consumed ||
      (stats.ino !== 0 && stats_2.ino !== stats.ino) ||
      stats_2.birthtimeMs !== stats.birthtimeMs
    )
      return (
        logForDebugging("History retention prune deferred: history.jsonl changed under the scan"),
        { entriesPruned: 0, errors: 0 }
      );
    let tailScan = await openHistoryFile(historyPath, shouldDrop, {
        start: headScan.consumed,
        end: stats_2.size,
        tail: "judge",
        expect: { ino: stats_2.ino, birthtimeMs: stats_2.birthtimeMs },
        verifiedHead: { bytes: headScan.consumed, digest: headScan.digest },
        residueBytes: stats.size - headScan.consumed,
      }),
      entriesPruned = headScan.dropped + tailScan.dropped;
    if (lockCompromised) throw Error("history lock compromised before the rewrite");
    if (entriesPruned === 0 && tailScan.terminated && !tailScan.split) return { entriesPruned: 0, errors: 0 };
    let combined = headScan.kept.concat(tailScan.kept);
    return (
      await publishWriteAtomic(
        historyPath,
        combined.length
          ? `${combined.join(`
`)}
`
          : "",
        { exactMode: stats_2.mode & 511 },
      ),
      { entriesPruned: entriesPruned, errors: 0 }
    );
  } catch (error) {
    if (error instanceof J2t)
      return (
        logForDebugging("History retention prune deferred: history.jsonl changed under the scan"),
        { entriesPruned: 0, errors: 0 }
      );
    return (
      logForDebugging(`History retention prune failed: ${error}`, { level: "error" }),
      { entriesPruned: 0, errors: 1 }
    );
  } finally {
    await releaseLockQuietly(release, "history retention");
  }
}
//@ chunk-23fm9f0d.js:21710-22112 affinity
async function cleanupMcpDiscoveryCache() {
  let e = join(getClaudeConfigDir(), "mcp-discovery-cache"),
    r = await cleanupOldFilesMatching(e, (i) => i.endsWith(".json") || i.includes(".json.tmp."), !1),
    s = getCutoffDate();
  if (s === null) return r;
  let n = getFsImplementation(),
    f;
  try {
    f = await n.readdir(e);
  } catch {
    return r;
  }
  for (let i of f) {
    if (!i.isDirectory() || !i.name.endsWith(".json.lock")) continue;
    let m = join(e, i.name);
    try {
      if ((await n.stat(m)).mtime < s) (await n.rmdir(m), r.messages++);
    } catch {
      r.errors++;
    }
  }
  return (await tryRmdir(e, n), r);
}
//@ chunk-23fm9f0d.js:22112-22295 fingerprint = cleanupOldPlanFiles (0.745)
async function cleanupOldPlanFiles(e) {
  if (isDiskless()) return emptyCleanupResult();
  let plansDir = join(getClaudeConfigDir(), "plans");
  try {
    if (e !== void 0)
      return await cleanupOldFilesMatching(plansDir, (s) => s.endsWith(".md") || s.includes(".md.tmp."));
    return await cleanupOldFilesMatching(plansDir, ".md");
  } finally {
    resetPlanFileCacheToUnknown();
  }
}
//@ chunk-23fm9f0d.js:22295-22892 placement = getSessionId (0)
async function cleanupOldFilesInDirectory(
  e,
  {
    exclude: exclude,
    skipIf: skipIf,
    refuseRedirectedRoot: refuseRedirectedRoot = !1,
    removeEmptyBaseDir: removeEmptyBaseDir = !0,
    maxAgeDays: maxAgeDays,
    baseDir: baseDir,
    storageV5: storageV5,
  } = {},
) {
  let y = getCutoffDate(maxAgeDays),
    D = emptyCleanupResult();
  if (y === null) return D;
  let k = getFsImplementation(),
    S = getClaudeConfigDir(),
    w = baseDir ?? join(S, e);
  if (refuseRedirectedRoot) {
    if (
      (await verifySyncRoot(
        w,
        S,
        { event: "cleanup_sweep_root_refused", phase: "sweep", rootLabel: e },
        { storageV5: storageV5 },
      )) !== "real"
    )
      return D;
  }
  let P;
  try {
    P = await k.readdir(w);
  } catch {
    return D;
  }
  for (let O of P) {
    if (!O.isDirectory() || exclude?.has(O.name)) continue;
    let C = join(w, O.name);
    try {
      if ((await k.stat(C)).mtime < y) {
        if (await skipIf?.(C)) continue;
        (await k.rm(C, { recursive: !0, force: !0 }), D.messages++);
      }
    } catch {
      D.errors++;
    }
  }
  if (removeEmptyBaseDir) await tryRmdir(w, k);
  return D;
}
//@ chunk-23fm9f0d.js:23035-23195 sole-consumer
function cleanupDevMods() {
  let e = skillWatchStateByHost.get()?.folder,
    r = getCutoffDate();
  return cleanupOldFilesInDirectory("dev-mods", {
    exclude: new Set([getSessionId(), ...(e === void 0 ? [] : [basename(e)])]),
    skipIf: (s) => scanAllSessions(s, r, vt),
    removeEmptyBaseDir: !1,
  });
}
//@ chunk-23fm9f0d.js:23195-23209 sole-consumer
var vt = 3,
  Ot = 2;
//@ chunk-23fm9f0d.js:23209-23384 sole-consumer
async function cleanupBashEditDiffs() {
  let e = getBashEditDiffDir(),
    r = await statOwnedPrivateDir(e).catch(() => null);
  if (!r) return emptyCleanupResult();
  return cleanupOldFilesInDirectory(BASH_EDIT_DIFF, {
    removeEmptyBaseDir: !1,
    maxAgeDays: Ot,
    baseDir: e,
    skipIf: async (s) => !(await getFileIdentity(s, r)),
  });
}
//@ chunk-23fm9f0d.js:23384-23581 sole-consumer
async function sweepSeedAdminSafely() {
  try {
    return await sweepSeedAdmin();
  } catch (error) {
    if (isCleanupQuietFsErrno(error))
      logForDebugging(`[cleanup] the sweep of seed-admin did not run: ${error.code}`, { level: "warn" });
    else logError(error);
    return { removed: 0, errors: 1, held: 0, refused: "no" };
  }
}
/**
 * 清理过期的 bridge-spawn 目录：v5 存储可用时先按作用域删除；否则在自有私有目录中删除过期子目录，并核对目录身份与真实路径防止被重定向。
 */
//@ chunk-23fm9f0d.js:23581-23949 sole-consumer
async function cleanupBridgeSpawnDirs(e) {
  if (isStorageV5Enabled() && e !== void 0) {
    let n = await cleanupBridgeSpawnScope(e);
    if (n !== "unaddressed") return n;
  }
  let r = yqt(),
    s = await statOwnedPrivateDir(r).catch(() => null);
  if (!s) return emptyCleanupResult();
  return cleanupOldFilesInDirectory(BRIDGE_SPAWN, {
    removeEmptyBaseDir: !1,
    maxAgeDays: C3o,
    baseDir: r,
    skipIf: async (n) => {
      let f = await statOwnedPrivateDir(r);
      return (
        f?.ino !== s.ino ||
        f.dev !== s.dev ||
        (await statOwnedPrivateDir(n)) === null ||
        (await fsPromisesModule.realpath(n)) !==
          join(await fsPromisesModule.realpath(dirname(r)), BRIDGE_SPAWN, basename(n))
      );
    },
  });
}
/**
 * 通过 v5 存储删除 bridge-spawn 作用域中早于保留期的对象；作用域无法寻址时返回 unaddressed 让调用方回退到文件系统清理。
 */
//@ chunk-23fm9f0d.js:23949-24361 sole-consumer
async function cleanupBridgeSpawnScope(e) {
  let r = emptyCleanupResult(),
    s = QOi(),
    scopeKind = await e.scopeKind(s);
  if (!scopeKind.ok) return scopeKind.error.code === "InvalidArgument" ? "unaddressed" : r;
  if (
    scopeKind.value.kind !== "directory" ||
    scopeKind.value.object === void 0 ||
    scopeKind.value.owner === "other"
  )
    return r;
  let f = getCutoffDate(C3o);
  if (f === null) return r;
  let deleteScope = await e.deleteScope(s, { olderThanMs: Math.max(0, Date.now() - f.getTime()) });
  if (!deleteScope.ok) return r;
  return ((r.messages += deleteScope.value.deleted), (r.errors += deleteScope.value.failed ?? 0), r);
}
//@ chunk-23fm9f0d.js:24361-24401 sole-consumer
function At() {
  return cleanupOldFilesMatching(peerTransferSpoolDir(), "", !1, PEER_TRANSFER_VERSION);
}
//@ chunk-23fm9f0d.js:24401-24552 sole-consumer
async function cleanupSkillsSyncDirs(e) {
  return addCleanupResults(
    addCleanupResults(
      await cleanupOldFilesInDirectory(xdr, { refuseRedirectedRoot: !0, storageV5: e }),
      await cleanupOldFilesInDirectory(ugi, { refuseRedirectedRoot: !0, storageV5: e }),
    ),
    await cleanupPerAccountSyncDirs(SKILLS_SYNC_DIR, e),
  );
}
/**
 * 在配置目录下指定根（拒绝被重定向的根）中，对每个合法账号子目录清理其同步子目录中的过期文件，合并结果。
 */
//@ chunk-23fm9f0d.js:24552-24949 sole-consumer
async function cleanupPerAccountSyncDirs(e, r) {
  let s = emptyCleanupResult();
  if (getCutoffDate() === null) return s;
  let n = getClaudeConfigDir(),
    f = join(n, e);
  if (
    (await verifySyncRoot(
      f,
      n,
      { event: "cleanup_sweep_root_refused", phase: "sweep", rootLabel: e },
      { storageV5: r },
    )) !== "real"
  )
    return s;
  let m;
  try {
    m = await getFsImplementation().readdir(f);
  } catch {
    return s;
  }
  for (let g of m) {
    if (!g.isDirectory() || !WYe(g.name)) continue;
    s = addCleanupResults(
      s,
      await cleanupOldFilesInDirectory(join(e, "*", Cte), {
        baseDir: join(f, g.name, Cte),
        refuseRedirectedRoot: !0,
        storageV5: r,
      }),
    );
  }
  return s;
}
//@ chunk-23fm9f0d.js:24949-25207 sole-consumer
async function cleanupTrashRoots(e) {
  let r = emptyCleanupResult(),
    s = getClaudeConfigDir();
  for (let n of [GYe, LFe]) {
    let f = join(s, n);
    if (
      (await verifySyncRoot(
        f,
        s,
        { event: "cleanup_sweep_root_refused", phase: "sweep", rootLabel: n },
        { storageV5: e },
      )) === "real"
    ) {
      let m = await queueSyncTrashTrim(f);
      r = addCleanupResults(r, { ...emptyCleanupResult(), messages: m.removed, errors: m.errors });
    }
  }
  return r;
}
//@ chunk-23fm9f0d.js:25207-25274 sole-consumer
function xt(e) {
  return cleanupOldFilesInDirectory(GYe, { refuseRedirectedRoot: !0, storageV5: e });
}
/**
 * 清理同步根目录下过期的账号目录：跳过当前账号与未标记目录，按清单文件或目录 mtime 判断是否过期，核对同步根后移到回收位置并计数。
 */
//@ chunk-23fm9f0d.js:25274-26012 sole-consumer
async function cleanupStaleSyncRoots(rootLabel, trashLabel, failureEvent, storageV5) {
  let result = emptyCleanupResult(),
    cutoff = getCutoffDate();
  if (cutoff === null) return result;
  let currentAccountId = await getSyncBucket().catch((P) => {
    logError(P);
    return;
  });
  if (currentAccountId === void 0) return result;
  let activeId = currentAccountId ?? getStoredAccountBucket(),
    configDir = getClaudeConfigDir(),
    rootDir = join(configDir, rootLabel);
  if (
    (await verifySyncRoot(
      rootDir,
      configDir,
      { event: "cleanup_sweep_root_refused", phase: "sweep", rootLabel: rootLabel },
      { storageV5: storageV5 },
    )) !== "real"
  )
    return result;
  let fs = getFsImplementation(),
    entries;
  try {
    entries = await fs.readdir(rootDir);
  } catch {
    return result;
  }
  for (let P of entries) {
    if (
      !P.isDirectory() ||
      !WYe(P.name) ||
      P.name === activeId ||
      (await readSyncMarker(rootDir, P.name)) === "unmarked"
    )
      continue;
    let entryDir = join(rootDir, P.name),
      mtime;
    try {
      mtime = (await fs.lstat(join(entryDir, SYNCED_MANIFEST_FILE)).catch(() => fs.lstat(entryDir))).mtime;
    } catch {
      continue;
    }
    if (mtime >= cutoff) {
      result.filesRetainedFresh++;
      continue;
    }
    if (
      (result.filesPastCutoff++,
      await checkSyncRoots({
        dir: entryDir,
        trashRoot: join(configDir, trashLabel),
        configHome: configDir,
        failureEvent: failureEvent,
        storageV5: storageV5,
      }))
    )
      (await K1t(rootDir, P.name).catch(() => {}), result.messages++);
    else result.errors++;
  }
  return result;
}
//@ chunk-23fm9f0d.js:26012-26080 sole-consumer
function Nt(e) {
  return cleanupStaleSyncRoots(cU, LFe, "plugins_sync_trash_move_failed", e);
}
//@ chunk-23fm9f0d.js:26080-26147 sole-consumer
function jt(e) {
  return cleanupStaleSyncRoots(SKILLS_SYNC_DIR, GYe, "skills_sync_trash_move_failed", e);
}
//@ chunk-23fm9f0d.js:26147-26214 sole-consumer
function Lt(e) {
  return cleanupOldFilesInDirectory(LFe, { refuseRedirectedRoot: !0, storageV5: e });
}
//@ chunk-23fm9f0d.js:26214-26311 sole-consumer
async function Bt(e) {
  return addCleanupResults(
    await cleanupOldFilesInDirectory(fgi, { refuseRedirectedRoot: !0, storageV5: e }),
    await cleanupPerAccountSyncDirs(cU, e),
  );
}
//@ chunk-23fm9f0d.js:26311-26469 sole-consumer
async function cleanupPluginStore() {
  let e = join(getPluginsDirectory(), "store"),
    r = await cleanupOldFilesMatching(e, (n) => n.endsWith(".json") || n.includes(".json.tmp."), !1),
    s = getCutoffDate();
  if (s !== null) await cleanupDirFiles(e, s, getFsImplementation(), r);
  return r;
}
//@ chunk-23fm9f0d.js:26469-26521 affinity
function $t() {
  return cleanupOldFilesMatching(
    getPluginsDirectory(),
    (e) => isSetAsideFileName(e) || isUnreadableKeptFileName(e),
    !1,
  );
}
//@ chunk-23fm9f0d.js:26521-27094 fingerprint = cleanupOldSessionEnvDirs (0.762)
async function cleanupOldSessionEnvDirs() {
  let cutoffDate = getCutoffDate(),
    fsImpl = emptyCleanupResult();
  if (cutoffDate === null) return fsImpl;
  let configDir = getFsImplementation(),
    n = join(getClaudeConfigDir(), MCP_SKILL_ARCHIVES),
    f;
  try {
    f = await configDir.readdir(n);
  } catch {
    return fsImpl;
  }
  for (let i of f) {
    if (!i.isDirectory()) continue;
    let m = join(n, i.name),
      g = (await me(m))?.cacheKey ?? null,
      y;
    try {
      y = await configDir.readdir(m);
    } catch {
      fsImpl.errors++;
      continue;
    }
    for (let sessionEnvDir of y) {
      if (!sessionEnvDir.isDirectory() || sessionEnvDir.name === g) continue;
      let k = join(m, sessionEnvDir.name);
      try {
        if ((await configDir.stat(k)).mtime < cutoffDate)
          (await configDir.rm(k, { recursive: !0, force: !0 }), fsImpl.messages++);
      } catch {
        fsImpl.errors++;
      }
    }
    try {
      if ((await configDir.stat(m)).mtime < cutoffDate)
        (await configDir.rm(m, { recursive: !0, force: !0 }), fsImpl.messages++);
    } catch {
      fsImpl.errors++;
    }
  }
  return (await tryRmdir(n, configDir), fsImpl);
}
//@ chunk-23fm9f0d.js:27094-27383 layout
async function cleanupUsageData() {
  let e = join(getClaudeConfigDir(), "usage-data"),
    r = await cleanupOldFilesMatching(
      join(e, "facets"),
      (s) => s.endsWith(".json") || s.includes(".json.tmp."),
    );
  return (
    (r = addCleanupResults(
      r,
      await cleanupOldFilesMatching(
        join(e, "session-meta"),
        (s) => s.endsWith(".json") || s.includes(".json.tmp."),
      ),
    )),
    (r = addCleanupResults(r, await cleanupOldFilesMatching(e, (s) => s.endsWith(".html") || YOi(s), !1))),
    await tryRmdir(e, getFsImplementation()),
    r
  );
}
//@ chunk-23fm9f0d.js:27383-27856 layout
async function cleanupTempTranscripts() {
  let e = getCutoffDate(),
    r = emptyCleanupResult();
  if (e === null) return r;
  let s = getFsImplementation(),
    n;
  try {
    n = claudeTempDir();
  } catch {
    return r;
  }
  let f;
  try {
    f = await s.readdir(n);
  } catch {
    return r;
  }
  for (let i of f) {
    let m = i.name.startsWith("cc-transcript-") && i.name.endsWith(".txt"),
      g = i.name.startsWith(AUTO_MODE_BUILTINS) && i.name.endsWith(".md"),
      y = i.name.startsWith(getCacheBreakDiffPath) && (i.name.endsWith(".json") || i.name.endsWith(".diff")),
      D = !1;
    if (!i.isFile() || (!m && !g && !y && !0)) continue;
    try {
      if (await unlinkIfOld(join(n, i.name), e, s, r)) r.messages++;
    } catch {
      r.errors++;
    }
  }
  return r;
}
/**
 * 清理过期的 speculation 目录（utils/cleanup 的一部分）。旧版名 getOverlayPath 为错配。
 */
//@ chunk-23fm9f0d.js:27856-28265 placement = getOverlayPath (0.436)
async function cleanupOldSpeculationDir() {
  let e = emptyCleanupResult(),
    r = getCutoffDate(Iai);
  if (r === null) return e;
  let s = getFsImplementation(),
    n;
  try {
    if (((n = claudeTempDir()), !(await s.lstat(n)).isDirectory())) return e;
  } catch {
    return e;
  }
  let f = join(n, "speculation"),
    i;
  try {
    i = await s.lstat(f);
  } catch {
    return e;
  }
  if (!i.isDirectory()) return e;
  try {
    if (((await scanDirectoryForPaths(f, s, { requireCompleteWalk: !0 })) ?? i.mtimeMs) < r.getTime())
      return (await s.rm(f, { recursive: !0, force: !0 }), e.messages++, e);
  } catch {
    e.errors++;
  }
  return (await tryRmdir(f, s), e);
}
//@ chunk-23fm9f0d.js:28265-28431 affinity
async function cleanupShares() {
  let e = join(getClaudeConfigDir(), "shares"),
    r = await cleanupOldFilesInDirectory("shares");
  return (
    (r = addCleanupResults(
      r,
      await cleanupOldFilesMatching(
        e,
        (s) => s.endsWith(".zip") || (s.includes(".zip.tmp.") && isTempFileName(s)),
        !1,
      ),
    )),
    await tryRmdir(e, getFsImplementation()),
    r
  );
}
//@ chunk-23fm9f0d.js:28431-28667 affinity
async function cleanupTelemetry() {
  let e = join(getClaudeConfigDir(), "telemetry"),
    r = await cleanupOldFilesMatching(e, ".json", !1),
    s = getCutoffDate();
  if (s === null) return r;
  let n = join(e, "runs"),
    f = getFsImplementation();
  if ((await isDirectory(e, f)) && (await isDirectory(n, f)))
    await cleanupTreeRecursive(n, s, f, r, { entryMatcher: (i) => i.endsWith(".json") });
  return (await tryRmdir(e, getFsImplementation()), r);
}
//@ chunk-23fm9f0d.js:32693-32955 fingerprint = cleanupOldDebugLogs (0.819)
async function cleanupOldDebugLogs() {
  let cutoffDate = getCutoffDate(),
    r = emptyCleanupResult();
  if (cutoffDate === null) return r;
  let fsImpl = getFsImplementation(),
    debugDir = join(getClaudeConfigDir(), "debug"),
    dirents;
  try {
    dirents = await fsImpl.readdir(debugDir);
  } catch {
    return r;
  }
  for (let dirent of dirents) {
    if (dirent.name === "latest" || !dirent.isFile()) continue;
    try {
      if (await unlinkIfOld(join(debugDir, dirent.name), cutoffDate, fsImpl, r)) r.messages++;
    } catch {
      r.errors++;
    }
  }
  return r;
}
//@ chunk-23fm9f0d.js:32955-33019 layout
async function cleanupFeedbackBundles() {
  return cleanupOldFilesMatching(join(getClaudeConfigDir(), "feedback-bundles"), ".zip");
}
//@ chunk-23fm9f0d.js:33019-33134 layout
async function cleanupFeedbackDrafts() {
  return cleanupOldFilesMatching(
    join(getClaudeConfigDir(), "feedback", "drafts"),
    (e) => e.endsWith(".json") || e.includes(".json.tmp."),
    !0,
    30,
  );
}
//@ chunk-23fm9f0d.js:33134-33466 layout
async function cleanupRemoteControlForkSeeds() {
  let e = join(getClaudeConfigDir(), "remote-control", "fork-seeds"),
    r = await cleanupOldFilesMatching(e, (f) => f.endsWith(".json") || f.includes(".json.tmp."));
  if (getCutoffDate() === null) return r;
  let date = new Date(),
    n = getFsImplementation();
  for (let f of await n.readdir(e).catch(() => []))
    try {
      let i = join(e, f.name);
      if (f.isFile() && (await n.stat(i)).mtime > date) await fsPromisesModule.lutimes(i, date, date);
    } catch {
      r.errors++;
    }
  return r;
}
//@ chunk-23fm9f0d.js:33466-33628 layout
async function cleanupTracesAndStartupPerf() {
  let e = await cleanupOldFilesMatching(join(getClaudeConfigDir(), "traces"), ".json"),
    r = await cleanupOldFilesMatching(join(getClaudeConfigDir(), "startup-perf"), ".txt"),
    s = await cleanupOldFilesMatching(join(getClaudeConfigDir(), "startup-perf"), ".json");
  return addCleanupResults(addCleanupResults(e, r), s);
}
//@ chunk-23fm9f0d.js:33628-33651 layout
var ONE_DAY_MS = 86400000,
  QUIET_FS_ERRNOS = JKo;
//@ chunk-23fm9f0d.js:33651-33795 layout
function errnoTelemetryValue(e) {
  if (e === void 0) return lit("none");
  if (!QUIET_FS_ERRNOS.has(e)) return lit("other");
  return e === "ELOOP" ? lit("ELOOP") : e === "EISDIR" ? lit("EISDIR") : lit("ENXIO");
}
//@ chunk-23fm9f0d.js:33795-33886 layout
function isQuietFsFailure(e) {
  return e.code === "Failed" && e.telemetryCode !== void 0 && QUIET_FS_ERRNOS.has(e.telemetryCode);
}
//@ chunk-23fm9f0d.js:33886-34150 layout
function describeMarkerRemoval(e) {
  if (e.ok) return "removed it";
  return ("telemetryCode" in e.error ? e.error.telemetryCode : void 0) === "EISDIR"
    ? "could not remove it (EISDIR): a directory at the marker path stays and the marker write will keep failing"
    : `could not remove it (${e.error.code})`;
}
/**
 * .last-cleanup 标记不是普通文件时尝试修复并上报 tengu_cleanup_throttle_marker。
 */
//@ chunk-23fm9f0d.js:34150-34613 facade-majority
async function healRefusedSentinelLeaf(e) {
  let statMeta = await e.statMeta(STORAGE_SPACES.state("last-cleanup"));
  if (statMeta.ok || statMeta.error.code === "NotFound" || !isQuietFsFailure(statMeta.error)) return;
  logEvent("tengu_cleanup_throttle_marker", {
    marker: lit("last-cleanup"),
    verdict: lit("not_regular_rerun"),
    code: fromEnum(statMeta.error.code),
    errno: errnoTelemetryValue("telemetryCode" in statMeta.error ? statMeta.error.telemetryCode : void 0),
  });
  let s = await e.delete(STORAGE_SPACES.state("last-cleanup"));
  logForDebugging(
    `.last-cleanup: sentinel is not a regular file (${formatStorageError(statMeta.error)}) \u2014 ${describeMarkerRemoval(s)}; rewriting`,
    { level: "warn" },
  );
}
//@ chunk-23fm9f0d.js:34613-34707 layout
var STAGING_MARKER_FILES = [
  ".npm-cache-cleanup",
  ".version-cleanup",
  ".last-cleanup",
  ".deep-link-register-failed",
];
/**
 * 删除配置目录下过期（1 天）的 staging 标记文件（.npm-cache-cleanup、.version-cleanup 等），每进程一次。
 */
//@ chunk-23fm9f0d.js:34707-34993 facade-majority = cleanupOldFilesInDirectory (0.455)
async function reapStaleHousekeepingStagingFiles(e, r) {
  if (!r.claimStagingReap()) return;
  let s;
  try {
    s = await fsPromisesModule.readdir(e);
  } catch {
    return;
  }
  let n = Date.now() - ONE_DAY_MS;
  await Promise.all(
    s
      .filter((f) => STAGING_MARKER_FILES.some((i) => isOwnTempName(f, i)))
      .map(async (f) => {
        let i = join(e, f);
        try {
          let stats = await fsPromisesModule.lstat(i);
          if (stats.isFile() && stats.mtimeMs < n) await fsPromisesModule.unlink(i);
        } catch {}
      }),
  );
}
//@ chunk-23fm9f0d.js:34993-35584 callgraph-witnessed = cleanupOldFileHistoryBackups (0.645)
async function cleanupOldFileHistoryBackups() {
  let cutoffDate = getCutoffDate(),
    fsImpl = emptyCleanupResult();
  if (cutoffDate === null) return fsImpl;
  let configDir = getFsImplementation();
  for (let n of Q6r) {
    let f = join(getClaudeConfigDir(), n),
      i = await configDir.lstat(f).catch((y) => {
        if (!isENOENT(y)) fsImpl.errors++;
        return null;
      });
    if (i === null || !i.isDirectory()) continue;
    let dirents;
    try {
      dirents = await configDir.readdir(f);
    } catch {
      continue;
    }
    let g = !1;
    for (let y of dirents) {
      let D = join(f, y.name);
      try {
        if (!((await configDir.stat(D)).mtime < cutoffDate)) continue;
        let S = await configDir.lstat(f).catch(() => null);
        if (S === null || !S.isDirectory() || S.dev !== i.dev || S.ino !== i.ino) {
          g = !0;
          break;
        }
        if (y.isDirectory()) await configDir.rm(D, { recursive: !0, force: !0 });
        else await configDir.unlink(D);
        fsImpl.messages++;
      } catch {
        fsImpl.errors++;
      }
    }
    if (!g) await tryRmdir(f, configDir);
  }
  return fsImpl;
}
//@ chunk-23fm9f0d.js:35584-36085 affinity
async function cleanupTinyMemoryFiles() {
  let e = emptyCleanupResult(),
    r = getCutoffDate();
  if (r === null) return e;
  let s = join(getMemoryBaseDir(), "projects"),
    n = getFsImplementation(),
    f = await n.lstat(s).catch((m) => {
      if (!isENOENT(m)) e.errors++;
      return null;
    });
  if (f === null || !f.isDirectory()) return e;
  let i = await n.readdir(s).catch((m) => {
    if (!isENOENT(m)) e.errors++;
    return [];
  });
  for (let m of i) {
    if (!m.isDirectory()) continue;
    let g = join(s, m.name, "tiny_memory"),
      y = await n.lstat(g).catch((D) => {
        if (!isENOENT(D)) e.errors++;
        return null;
      });
    if (y === null || !y.isDirectory()) continue;
    await cleanupTreeRecursive(g, r, n, e, { countEnumerationFailures: !0 });
  }
  return e;
}
//@ chunk-23fm9f0d.js:36085-36356 sole-consumer
async function cleanupMemoryProposals() {
  let r = emptyCleanupResult(),
    s = getCutoffDate();
  if (s === null) return r;
  let n = join(getMemoryBaseDir(), "projects"),
    f = getFsImplementation(),
    i = await f.readdir(n).catch(() => []);
  for (let m of i) {
    if (!m.isDirectory()) continue;
    r = addCleanupResults(r, await findModifiedFiles(join(n, m.name, "memory", "proposals"), s, f));
  }
  return addCleanupResults(r, await findModifiedFiles(join(getAutoMemPath(), "proposals"), s, f));
}
/**
 * 后台保留期清理（cleanupPeriodDays，默认 30 天）：错误日志、会话、计划、文件历史、调试日志、反馈包、MCP 缓存、worktree 等数十类数据，结果上报 tengu_retention_sweep。
 */
//@ chunk-23fm9f0d.js:36895-39583 facade-majority = cleanupOldMessageFilesInBackground (0.123)
async function cleanupOldMessageFilesInBackground(e) {
  await cleanupOldImageCaches();
  let r = await sweepSeedAdminSafely(),
    s = {
      seedAdminRemoved: r.removed,
      seedAdminErrors: r.errors,
      seedAdminHeld: r.held,
      seedAdminRefused: fromEnum(r.refused),
    },
    n = await startRetentionSweep(),
    f = n === "asked" ? {} : { hooksUnasked: fromEnum(n) },
    i = await retentionCleanupSkipReason(e),
    m = getSettings_DEPRECATED()?.cleanupPeriodDays;
  if (i !== null) {
    if (
      (logEvent("tengu_retention_sweep", { skipped: !0, skipReason: fromEnum(i), ...s, ...f }),
      logRetentionSweep({
        result: "skipped",
        skipReason: i,
        periodDays: m ?? _qt,
        usedDefault: m === void 0,
      }),
      i !== "diskless")
    )
      await cleanupTrashRoots(e);
    return i;
  }
  logEvent("tengu_retention_sweep", { phase: lit("start"), ...s, ...f });
  let g = void 0,
    y,
    D = () => (y ??= cleanupOldSessionFiles(g));
  await using k = {
    [Symbol.asyncDispose]: () =>
      D().then(
        () => {},
        () => {},
      ),
  };
  await cleanupOldMessageFiles();
  let S = await cleanupOldTranscripts(),
    w = [S];
  (w.push(await cleanupOldPlanFiles(e)),
    w.push(await resolveBackupPath()),
    w.push(await getSessionEnvDirPath()),
    w.push(await getTaskOutputDir()),
    w.push(await uploadsDir()),
    w.push(await cleanupDevMods()),
    w.push(await cleanupBridgeSpawnDirs(e)),
    w.push(await cleanupBashEditDiffs()),
    w.push(await At()),
    w.push(await cleanupUsageData()),
    w.push(await cleanupSkillsSyncDirs(e)),
    w.push(await Bt(e)),
    w.push(await jt(e)),
    w.push(await Nt(e)),
    w.push(await xt(e)),
    w.push(await Lt(e)),
    w.push(await cleanupPluginStore()),
    w.push(await $t()),
    w.push(await cleanupOldSessionEnvDirs()),
    w.push(await cleanupTempTranscripts()),
    w.push(await cleanupOldTempDirs()),
    w.push(await cleanupOldSpeculationDir()),
    w.push(await cleanupShares()),
    w.push(await cleanupTelemetry()),
    w.push(await cleanupOldDebugLogs()),
    w.push(await cleanupFeedbackBundles()),
    w.push(await cleanupFeedbackDrafts()),
    w.push(await cleanupRemoteControlForkSeeds()),
    w.push(await cleanupTracesAndStartupPerf()),
    w.push(await getDumpPromptsPath()),
    w.push(await qt()),
    w.push(await cleanupTeamInboxes()),
    w.push(await cleanupDaemonFiles(e, g)),
    w.push(await getConfigBackupDir()),
    w.push(await cleanupHfiAuthFile()),
    w.push(await getMcpAuthCachePath()),
    w.push(await cleanupDeviceUnboundCreates()),
    w.push(await cleanupMcpDiscoverVerdicts()),
    w.push(await cleanupDeviceMcpNotNow()),
    w.push(await cleanupServedCalls()),
    w.push(await cleanupUnattendedServingRuns()),
    w.push(await cleanupSettingsReviewStore()),
    w.push(await cleanupMcpDiscoveryCache()),
    w.push(await cleanupTeamDiscoveryCache()),
    w.push(await cleanupModelAccessMemory()),
    w.push(await cleanupModelCatalogCache()),
    w.push(await cleanupOldFileHistoryBackups()),
    w.push(await cleanupTinyMemoryFiles()),
    w.push(await cleanupMemoryProposals()));
  let P = { entriesPruned: 0, errors: 0 },
    O = getCutoffDate();
  if (O !== null) {
    await cleanupOldPastes(O, e);
    let removedWorktrees = await cleanupSessionImageDirs(O);
    w.push({ ...emptyCleanupResult(), messages: removedWorktrees.removed, errors: removedWorktrees.errors });
    let A = await cleanupStaleAgentWorktrees(O, g, !1);
    if (A > 0) logEvent("tengu_worktree_cleanup", { removed: A });
    if (
      (await cleanupStaleConfigTempFiles(getClaudeConfigDir(), O),
      hasComplianceTaint("hipaa") &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_hipaa_history_retention_prune", !0))
    )
      ((P = await pruneHistoryFile(O)), w.push({ ...emptyCleanupResult(), errors: P.errors }));
  }
  (w.push(await cleanupTrashRoots(e)), w.push(await D()));
  let reduced = w.reduce(addCleanupResults, emptyCleanupResult());
  (logEvent("tengu_retention_sweep", {
    phase: lit("complete"),
    skipped: !1,
    transcriptsDeleted: S.transcripts,
    transcriptsExemptedDesktop: S.transcriptsExemptedDesktop,
    sessionFilesDeleted: S.messages,
    artifactsDeleted: reduced.messages,
    filesRetainedFresh: reduced.filesRetainedFresh,
    filesPastCutoff: reduced.filesPastCutoff,
    errors: reduced.errors,
    historyEntriesPruned: P.entriesPruned,
    periodDays: m ?? _qt,
    usedDefault: m === void 0,
  }),
    logRetentionSweep({
      result: "complete",
      periodDays: m ?? _qt,
      usedDefault: m === void 0,
      transcriptsDeleted: S.transcripts,
      transcriptsExemptedDesktop: S.transcriptsExemptedDesktop,
      sessionFilesDeleted: S.messages,
      artifactsDeleted: reduced.messages,
      filesRetainedFresh: reduced.filesRetainedFresh,
      filesPastCutoff: reduced.filesPastCutoff,
      errorCount: reduced.errors,
      historyEntriesPruned: P.entriesPruned,
    }));
}
//@ chunk-kqn19nw9.js:557-596 placement
var IMAGES = "images",
  nMo = /^(\d+)\.[a-z]+$/;
/**
 * 遍历临时目录中各项目下的会话目录（跳过当前会话），删除早于截止时间的 images 子目录，统计删除数与错误数。
 */
//@ chunk-kqn19nw9.js:596-1076 placement
async function cleanupSessionImageDirs(a, p) {
  let e = { removed: 0, errors: 0 },
    r = getFsImplementation(),
    n,
    i;
  try {
    ((n = await r.realpath(p ?? claudeTempDir())), (i = await r.readdir(n)));
  } catch {
    return e;
  }
  let o = getSessionId();
  for (let t of i) {
    if (!t.isDirectory()) continue;
    let s = join(n, t.name),
      c;
    try {
      c = await r.readdir(s);
    } catch {
      continue;
    }
    for (let m of c) {
      if (!m.isDirectory() || m.name === o || Vt(m.name) === null) continue;
      let d = join(s, m.name, IMAGES);
      try {
        let stats = await r.lstat(d);
        if (!stats.isDirectory() || stats.mtime >= a) continue;
        if (await I(d, a)) e.removed++;
      } catch (error) {
        if (!isFsInaccessible(error)) e.errors++;
      }
    }
  }
  return e;
}
//@ chunk-kqn19nw9.js:1076-1698 placement
async function I(a, p) {
  let e = await pinWriteTarget(a, [a], { leaf: "replace" });
  try {
    await e.recheckBeforeWrite();
    let r = await lstat(e.ioPath);
    if (!r.isDirectory() || r.mtime >= p) return !1;
    let n = join(a, "any"),
      i = await pinWriteTarget(n, [n], { leaf: "replace" });
    try {
      let o = dirname(i.ioPath);
      await i.recheckBeforeWrite();
      for (let t of await readdir(o)) {
        let index = t.lastIndexOf(".tmp."),
          c = index === -1 ? t : t.slice(0, index);
        if (!nMo.test(c) || (index !== -1 && !isOwnTempName(t, c))) continue;
        (await i.recheckBeforeWrite(), await unlink(join(o, t)).catch(() => {}));
      }
    } finally {
      await i.close();
    }
    await e.recheckBeforeWrite();
    try {
      await rmdir(e.ioPath);
    } catch (error) {
      let t = getErrnoCode(error);
      if (t === "ENOTEMPTY" || t === "EEXIST") return !1;
      throw error;
    }
    return !0;
  } finally {
    await e.close();
  }
}
//@ chunk-4nhpaxz9.js:7688-7945 fingerprint = cleanupSingleDirectory (0.409)
async function cleanupSingleDirectory(e, n) {
  let mtimeMs = (await e.fs.lstat(n)).mtimeMs,
    entries = await e.fs.readdir(n);
  for (let dirent of entries) {
    let joined = e.path.join(n, dirent);
    try {
      let stats = await e.fs.lstat(joined);
      if (((mtimeMs = Math.max(mtimeMs, stats.mtimeMs)), stats.isDirectory()))
        mtimeMs = Math.max(mtimeMs, await cleanupSingleDirectory(e, joined));
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  }
  return mtimeMs;
}

export {
  retentionCleanupSkipReason,
  IMAGES,
  nMo,
  cleanupOldFilesMatching,
  cleanupOldMessageFilesInBackground,
  reapStaleHousekeepingStagingFiles,
  healRefusedSentinelLeaf,
  isCleanupQuietFsErrno,
  entryKind,
  emptyCleanupResult,
  getCutoffDate,
  unlinkIfOld,
  cleanupOldFilesInDirectory,
  isDirectory,
  tryRmdir,
  addCleanupResults,
  isRetentionExemptionDisabled,
  cleanupSingleDirectory,
  isRetentionCleanupSafe,
};
