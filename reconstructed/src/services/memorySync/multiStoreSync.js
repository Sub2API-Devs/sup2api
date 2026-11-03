/**
 * services/memorySync/multiStoreSync.ts
 *
 * 多记忆库同步一轮（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (14)
 * attribution: placement 14
 */
import { join, sep } from "path";
import { stat, mkdir } from "fs/promises";
import { resolvePersonalMemoryPath } from "../memoryStore/memoryKeys.js";
import {
  PathTraversalError,
  validateTeamMemKey,
  checkPathInTeamMemDir,
  getMemoryDirNfc,
} from "../../memdir/teamMemPaths.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { collectLocalMemoryEntries, getV5MemoryContext, resolveMountPath } from "./mountWalk.js";
import { errorMessage, sanitizedMachineReasonForTelemetry } from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import {
  isOrgMemoryDecisionClosed,
  isNonAccountStore,
  checkPushManifestGate,
  errorSummary,
  runWithConcurrency,
  allowConflictRefetch,
  shouldMirrorAllUncovered,
  isStoreForeignPartition,
  readoptMountDir,
  checkForeignPartition,
  getMountDirOccupancy,
  enumerateMountDir,
  checkUnmanifestedMountDir,
  rejoinTeamMemory,
} from "./storeReconcile.js";
import { grantedModeFor, isOrgMemoryWriteOptedIn } from "../orgMemory/orgMemoryDecision.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  isTypedKoalaEnabled,
  EMPTY_CONTENT_SHA256,
  getMemoryPushDeleteMode,
  PUSH_TIMEOUT_MS,
  getMassDeleteThreshold,
  LOCAL_IO_CONCURRENCY,
  Qr,
  isUsableSuppressedReason,
} from "./syncConfig.js";
import {
  formatOversizedMemoryNotice,
  memorySyncPausedText,
  formatMassDeleteGuardNotice,
  findRemoteEntry,
  recordRemoteEntry,
  queueConflictNotice,
  quoteStoreName,
  formatDeletionConflictNotice,
  storeRecoveredText,
  quoteMemoryFilePath,
  MEMORY_SYNC_REJECT_TEXTS,
  noticeStoreRecovered,
  formatMemorySyncPausedNotice,
} from "./syncNotices.js";
import { readSyncManifest, clearBasis, writeSyncBasis, writeSyncManifest } from "./syncManifest.js";
import { count } from "../../utils/collections.js";
import {
  MemoryPermanentError,
  MemoryUnavailableError,
  MemoryNotFoundError,
  MemoryConflictError,
} from "../orgMemory/storeErrors.js";
import { normalizePathPrefix } from "../orgMemory/storeApi.js";
import { storageKeyForMountPath } from "../../memdir/teamMemPrompts.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-s61vbvea.js:148738-148836 placement
/**
 * 同步无操作时的结果对象。
 */
var NOOP_SYNC_RESULT = {
  success: true,
  filesWritten: 0,
  filesDeleted: 0,
  conflicts: 0,
  secretsSkipped: 0,
  oversizedSkipped: 0,
};
//@ chunk-s61vbvea.js:148836-149044 placement
async function resolveStoreKeyPath(e, n) {
  switch (e.scope) {
    case "user":
      return resolvePersonalMemoryPath(n);
    case "account":
      throw new PathTraversalError("Key refused: this build has no account memory store");
    case "team":
      return validateTeamMemKey(join(e.mountName, n).split(sep).join("/"));
  }
}
//@ chunk-s61vbvea.js:149044-149198 placement
async function checkMountDirLocation(e) {
  switch (e.scope) {
    case "user":
      return checkPathInTeamMemDir(e.mountDir);
    case "account":
      return "escape";
    case "team":
      return checkPathInTeamMemDir(e.mountDir, "team", e.mountName);
  }
}
//@ chunk-s61vbvea.js:149198-149572 placement
/**
 * 检查团队记忆根与挂载目录是否偏离规范位置，偏离时记错误并按关闭失败处理。
 */
async function isMountEscaped(e) {
  if (e.scope === "team" && (await checkPathInTeamMemDir(getMemoryDirNfc(), "team")) === "escape") {
    logForDebugging(
      `multi-store-sync[${e.mountName}]: team memory root escapes its canonical location \u2014 failing closed`,
      {
        level: "error",
      },
    );
    return true;
  }
  if ((await checkMountDirLocation(e)) === "escape") {
    logForDebugging(
      `multi-store-sync[${e.mountName}]: mount dir escapes its canonical location \u2014 failing closed`,
      {
        level: "error",
      },
    );
    return true;
  }
  return false;
}
//@ chunk-s61vbvea.js:149572-150178 placement
async function scanUnsavedWrites(e, n, r) {
  if (!n || env.CLAUDE_CODE_DISABLE_MEMORY_RO_UNSAVED_NOTICE || (await isMountEscaped(e))) return [];
  let s;
  try {
    s = await collectLocalMemoryEntries(
      e.mountDir,
      e.excludeKey,
      r,
      e.v5MemoryBase,
      e.manifestSeenThisSession,
      e.walkHashes,
      undefined,
    );
  } catch (error) {
    logForDebugging(`multi-store-sync[${e.mountName}]: unsaved-write scan failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return [];
  }
  if (s.rootMissing) return [];
  let h = e.notices.roUnsavedNoticed.get(e.mountDir);
  let y = s.diskTrusted ? new Set() : new Set(h);
  let S = [];
  for (let [w, R] of s.entries) {
    if (e.remoteHashes.get(w)?.sha256 === R.sha256) continue;
    y.add(w);
    if (!h?.has(w)) S.push(w);
  }
  e.notices.roUnsavedNoticed.set(e.mountDir, y);
  return S.sort();
}
//@ chunk-s61vbvea.js:150178-150556 placement
/**
 * 运行一轮多库同步，结束后若有本轮的基线不可用报告且未上报，则记 tengu_team_mem_basis_unusable。
 */
async function runSyncCycleWithReport(store, n, storageV5) {
  let basisUnusableReport = store.basisUnusableReport ?? null;
  try {
    return await runMultiStoreSyncCycle(store, basisUnusableReport, n, storageV5);
  } finally {
    if (basisUnusableReport !== null && store.basisUnusableReport === basisUnusableReport) {
      store.basisUnusableReport = null;
      if (!basisUnusableReport.emitted) {
        basisUnusableReport.emitted = true;
        logEvent("tengu_team_mem_basis_unusable", {
          scope: fromEnum(store.scope),
          reason: fromEnum(basisUnusableReport.reason),
          local_only_count: basisUnusableReport.localOnly.size,
          held_count: basisUnusableReport.held,
          uploaded_count: basisUnusableReport.uploaded,
          upload_failed_count: basisUnusableReport.uploadFailed,
        });
      }
    }
  }
}
//@ chunk-s61vbvea.js:150556-158789 placement
/**
 * 多记忆库同步一轮：只读库未保存写入、冲突、批量删除保护
 */
async function runMultiStoreSyncCycle(e, basisUnusableReport, r, s) {
  if (e.backend.mode === "ro") {
    let Re = await scanUnsavedWrites(e, r?.allowDeletes === true, s);
    if (Re.length === 0) return NOOP_SYNC_RESULT;
    logEvent("tengu_memory_sync_ro_unsaved", {
      scope: fromEnum(e.scope),
      count: Re.length,
    });
    return {
      ...NOOP_SYNC_RESULT,
      unsavedReadOnlyPaths: Re,
    };
  }
  if (isOrgMemoryDecisionClosed(e))
    return {
      ...NOOP_SYNC_RESULT,
      skipped: true,
    };
  if (
    (e.source ?? "env") === "discovery" &&
    (grantedModeFor(e.backend.partitionId) !== "rw" || !isOrgMemoryWriteOptedIn())
  )
    return {
      ...NOOP_SYNC_RESULT,
      skipped: true,
    };
  if (await isMountEscaped(e)) {
    if (isNonAccountStore(e)) logFeatureSad("team_memory_multistore_conflict", "root_escape");
    return NOOP_SYNC_RESULT;
  }
  await checkPushManifestGate(e, s);
  if (!e.pulled) return NOOP_SYNC_RESULT;
  let h = isStorageV5Enabled();
  let v5MemoryContext = getV5MemoryContext(e, s);
  let heldLocal = e.heldLocal;
  if (heldLocal !== undefined && !isTypedKoalaEnabled()) heldLocal.clear();
  let remoteHashes = e.remoteHashes;
  if (heldLocal !== undefined && heldLocal.size > 0) {
    let Re = new Map(e.remoteHashes);
    for (let [Ne, Je] of heldLocal)
      if (!Re.has(Ne))
        Re.set(Ne, {
          sha256: Je,
        });
    remoteHashes = Re;
  }
  let localMemoryEntries = await collectLocalMemoryEntries(
    e.mountDir,
    e.excludeKey,
    s,
    e.v5MemoryBase,
    e.manifestSeenThisSession,
    e.walkHashes,
    remoteHashes,
  );
  await formatOversizedMemoryNotice(e, localMemoryEntries.skippedOversizedPaths);
  if (heldLocal !== undefined) {
    let Re = {
      edited: 0,
      deleted: 0,
      server_listed: 0,
    };
    for (let [Ne, Je] of heldLocal) {
      let lt = localMemoryEntries.entries.get(Ne);
      if (e.remoteHashes.has(Ne)) Re.server_listed++;
      else if (lt === undefined) {
        if (!localMemoryEntries.diskTrusted || localMemoryEntries.diskPaths.has(Ne)) continue;
        Re.deleted++;
      } else if (lt.sha256 !== Je) Re.edited++;
      else continue;
      heldLocal.delete(Ne);
    }
    if (Re.edited + Re.deleted + Re.server_listed)
      logEvent("tengu_team_mem_held_released", {
        scope: fromEnum(e.scope),
        ...Re,
      });
  }
  let x = 0;
  let P = (e.refusedWrites ??= new Map());
  for (let key of P.keys()) {
    let Ne = localMemoryEntries.entries.get(key);
    if (
      Ne === undefined
        ? localMemoryEntries.diskTrusted && !localMemoryEntries.diskPaths.has(key)
        : e.remoteHashes.get(key)?.sha256 === Ne.sha256
    )
      P.delete(key);
  }
  let j = [];
  for (let [Re, Ne] of localMemoryEntries.entries) {
    let Je = e.remoteHashes.get(Re);
    if (Je?.sha256 === Ne.sha256 || Ne.content === undefined) continue;
    if (Ne.sha256 === EMPTY_CONTENT_SHA256) {
      x++;
      continue;
    }
    if (Je === undefined && heldLocal?.get(Re) === Ne.sha256) continue;
    let lt = P.get(Re);
    if (lt?.sha256 === Ne.sha256 && Date.now() - lt.atMs < memorySyncPausedText) continue;
    j.push({
      path: Re,
      content: Ne.content,
      sha256: Ne.sha256,
      known: Je,
    });
  }
  if (x > 0)
    logForDebugging(`multi-store-sync[${e.mountName}]: not pushing ${x} empty (0-byte) file(s)`, {
      level: "warn",
    });
  let syncManifest = await readSyncManifest(e.mountDir, s, e.v5MemoryBase);
  let L = syncManifest.state === "present" && syncManifest.manifest.partition === e.backend.partitionId;
  let q = syncManifest.state === "present" && !L;
  let memoryPushDeleteMode = getMemoryPushDeleteMode();
  let Z = [];
  let ee = 0;
  let ae = 0;
  let se = (e.pendingDeletes ??= new Map());
  for (let key of se.keys())
    if (localMemoryEntries.diskPaths.has(key)) {
      se.delete(key);
      ae++;
    }
  if (r?.allowDeletes && localMemoryEntries.diskTrusted && L) {
    let now = Date.now();
    for (let [Ne, Je] of e.remoteHashes) {
      if (localMemoryEntries.diskPaths.has(Ne)) continue;
      if (memoryPushDeleteMode === "never") {
        ee++;
        continue;
      }
      if (memoryPushDeleteMode === "immediate") {
        Z.push({
          path: Ne,
          ref: Je,
        });
        continue;
      }
      let lt = se.get(Ne);
      if (lt === undefined) {
        se.set(Ne, {
          firstMissingAtMs: now,
          missingWalks: 1,
        });
        ee++;
      } else {
        lt.missingWalks++;
        if (lt.missingWalks >= 2 && now - lt.firstMissingAtMs >= PUSH_TIMEOUT_MS)
          Z.push({
            path: Ne,
            ref: Je,
          });
        else ee++;
      }
    }
    for (let key of se.keys()) if (!e.remoteHashes.has(key)) se.delete(key);
  }
  let re = 0;
  if (Z.length > 0) {
    let Re = count([...e.remoteHashes.keys()], (Je) => !localMemoryEntries.diskPaths.has(Je));
    let massDeleteThreshold = getMassDeleteThreshold(e.remoteHashes.size);
    if (Re > massDeleteThreshold) {
      re = Z.length;
      Z.length = 0;
      logForDebugging(
        `multi-store-sync[${e.mountName}]: holding ${re} corroborated delete(s): ${Re} of ${e.remoteHashes.size} synced files are missing locally at once (mass-delete guard)`,
        {
          level: "warn",
        },
      );
      formatMassDeleteGuardNotice(e, Re, massDeleteThreshold);
      e.invalidatedBasis = e.remoteHashes;
      e.remoteHashes = new Map();
      e.pulled = false;
      se.clear();
      await clearBasis(e, s);
    }
  }
  let he = 0;
  let Se = 0;
  let ce = 0;
  let we = 0;
  let ie = false;
  let Ee = false;
  let Ie = 0;
  let error;
  let Me;
  let permanentPath;
  let nt;
  function Be(error_2, path) {
    logForDebugging(
      `multi-store-sync[${e.mountName}]: push failed for ${path ?? "<store>"}: ${errorSummary(error_2)}`,
      {
        level: "warn",
      },
    );
    ie = true;
    if (path !== undefined && basisUnusableReport?.localOnly.has(path) === true)
      basisUnusableReport.uploadFailed++;
    if (error_2 instanceof MemoryPermanentError) {
      Me ??= error_2.reason;
      nt ??= error_2.reason;
    } else if (error_2 instanceof MemoryUnavailableError) {
      nt ??= "unavailable";
      Ee = noteServerBackoff(e, error_2) || Ee;
    } else nt ??= "error";
    error ??= errorSummary(error_2);
  }
  await runWithConcurrency(q ? [] : j, LOCAL_IO_CONCURRENCY, async (Re) => {
    if (Ee) {
      Ie++;
      return;
    }
    let Ne;
    let known = Re.known;
    let lt = false;
    try {
      let Ae;
      if (known)
        try {
          Ae = await e.backend.update(known.id, Re.content, known.sha256);
        } catch (error) {
          if (!(
            error instanceof MemoryNotFoundError &&
            (await findRemoteEntry(e, Re.path).then(
              (remoteEntry) => remoteEntry === null,
              () => false,
            ))
          ))
            throw error;
          e.remoteHashes.delete(Re.path);
          known = undefined;
          lt = true;
        }
      if (Ae === undefined)
        try {
          Ae = await e.backend.create(Re.path, Re.content, {
            precondition: "not_exists",
          });
          if (
            !e.firstWriteEmitted &&
            (e.source ?? "env") === "discovery" &&
            e.writeDir !== undefined &&
            e.writeDir !== "" &&
            normalizePathPrefix(Re.path).replace(/^\//, "").startsWith(e.writeDir)
          ) {
            e.firstWriteEmitted = true;
            logEvent("tengu_org_memory_first_write_into_write_home", {});
          }
        } catch (error) {
          if (
            !(error instanceof MemoryConflictError) ||
            (error.conflictingPath !== undefined && error.conflictingPath !== error.path)
          )
            throw error;
          let remoteEntry = await findRemoteEntry(e, Re.path);
          if (remoteEntry === null) {
            Be(error, Re.path);
            return;
          }
          Ne = remoteEntry.id;
          if (remoteEntry.sha256 !== Re.sha256) throw error;
          await recordRemoteEntry(
            e,
            Re.path,
            {
              id: remoteEntry.id,
              sha256: remoteEntry.sha256,
            },
            s,
          );
          P.delete(Re.path);
          logForDebugging(
            `multi-store-sync[${e.mountName}]: adopted ${Re.path} (identical content \u2192 ${remoteEntry.id})`,
            {
              level: "debug",
            },
          );
          return;
        }
      await recordRemoteEntry(e, Re.path, Ae, s);
      P.delete(Re.path);
      he++;
      if (basisUnusableReport?.localOnly.has(Re.path) === true) basisUnusableReport.uploaded++;
      logForDebugging(
        `multi-store-sync[${e.mountName}]: pushed ${Re.path} (${known ? "update" : "create"} \u2192 ${Ae.id})`,
        {
          level: "debug",
        },
      );
      if (lt)
        await queueConflictNotice(
          e,
          Re.path,
          `The memory file ${quoteStoreName(Re.path)} was deleted from shared memory by another session while you had local changes. Your local version has been saved to shared memory as a new copy. If the deletion was intended, delete the file.`,
        );
    } catch (error) {
      if (error instanceof MemoryConflictError) {
        logForDebugging(
          `multi-store-sync[${e.mountName}]: push conflict on ${Re.path}: ${errorMessage(error)}`,
          {
            level: "debug",
          },
        );
        ce++;
        if (basisUnusableReport?.localOnly.has(Re.path) === true) basisUnusableReport.uploadFailed++;
        let id = known?.id ?? Ne;
        if (id) {
          if (
            allowConflictRefetch(e, Re.path) &&
            (await formatDeletionConflictNotice(
              e,
              Re.path,
              id,
              (known === undefined && !lt) || known?.sha256 === Qr ? "unsynced" : "update",
              s,
            ))
          )
            we++;
          else if (!known)
            e.remoteHashes.set(Re.path, {
              id,
              sha256: Qr,
            });
        } else
          await queueConflictNotice(
            e,
            Re.path,
            `Your recent write to the memory file ${quoteStoreName(Re.path)} was NOT saved to shared memory: its path conflicts with an existing memory (a file exists where this path needs a directory, or the reverse). Re-read the memory directory and rename this file, or delete the conflicting one, if the change is still wanted.`,
          );
        return;
      }
      if (error instanceof MemoryPermanentError && storeRecoveredText.has(error.reason)) {
        let ze = P.get(Re.path);
        let gt = ze?.sha256 === Re.sha256 && ze.reason === error.reason;
        P.set(Re.path, {
          sha256: Re.sha256,
          reason: error.reason,
          atMs: Date.now(),
        });
        logForDebugging(
          `multi-store-sync[${e.mountName}]: server refused ${Re.path}; other files keep syncing: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
        if (!gt)
          await queueConflictNotice(
            e,
            Re.path,
            `The memory file ${quoteMemoryFilePath(Re.path)} was NOT saved to shared memory (${error.reason}). ${MEMORY_SYNC_REJECT_TEXTS[error.reason] ?? ""} Your other memory files keep syncing. This file stays local only, and its changes will be lost when this session's machine is recycled. Once you change or delete it, the next sync tries again. Tell the user this memory file is not being persisted.`,
            {
              keepPending: true,
            },
          );
        return;
      }
      if (error instanceof MemoryPermanentError && Me === undefined) permanentPath = Re.path;
      Be(error, Re.path);
    }
  });
  await runWithConcurrency(Z, LOCAL_IO_CONCURRENCY, async (Re) => {
    if (Ee) {
      Ie++;
      return;
    }
    try {
      let mountPath = await resolveMountPath(e, Re.path);
      let lt =
        v5MemoryContext !== undefined
          ? storageKeyForMountPath(v5MemoryContext.base, e.mountDir, mountPath)
          : undefined;
      if (h && v5MemoryContext !== undefined && lt !== undefined) {
        let Ae = false;
        try {
          let ze = await v5MemoryContext.storageV5.statMeta(lt);
          Ae = !ze.ok && ze.error.code === "NotFound";
        } catch {}
        if (!Ae) {
          se.delete(Re.path);
          ae++;
          return;
        }
      } else {
        await stat(mountPath);
        se.delete(Re.path);
        ae++;
        return;
      }
    } catch {}
    let Ne = () => {
      e.remoteHashes.delete(Re.path);
      se.delete(Re.path);
      e.pullWritten.delete(Re.path);
    };
    if (Ee) {
      Ie++;
      return;
    }
    try {
      await e.backend.delete(Re.ref.id, Re.ref.sha256);
      Ne();
      Se++;
      logForDebugging(`multi-store-sync[${e.mountName}]: pushed ${Re.path} (delete ${Re.ref.id})`, {
        level: "debug",
      });
    } catch (error) {
      if (error instanceof MemoryConflictError) {
        logForDebugging(
          `multi-store-sync[${e.mountName}]: delete conflict on ${Re.path}: ${errorMessage(error)}`,
          {
            level: "debug",
          },
        );
        se.delete(Re.path);
        ce++;
        if (
          allowConflictRefetch(e, Re.path) &&
          (await formatDeletionConflictNotice(e, Re.path, Re.ref.id, "delete", s))
        )
          we++;
        return;
      }
      if (error instanceof MemoryNotFoundError) {
        if (
          await findRemoteEntry(e, Re.path).then(
            (remoteEntry) => remoteEntry === null,
            () => false,
          )
        )
          Ne();
        else
          logForDebugging(
            `multi-store-sync[${e.mountName}]: delete of ${Re.path} 404'd but the path is still listed (or the listing failed) \u2014 retrying next cycle`,
            {
              level: "debug",
            },
          );
        return;
      }
      Be(error, Re.path);
    }
  });
  if (Ie > 0)
    logForDebugging(
      `multi-store-sync[${e.mountName}]: ${Ie} upload(s)/delete(s) not started this cycle after the server asked sync to wait; a later sync sends them (waiting at least ${Math.max(0, Math.ceil(((e.serverBackoffUntilMs ?? 0) - Date.now()) / 1000))}s)`,
      {
        level: "warn",
      },
    );
  if (L && re === 0) await writeSyncBasis(e, s);
  if (ee > 0 || ae > 0 || re > 0)
    logEvent("tengu_team_mem_push_delete_deferred", {
      scope: fromEnum(e.scope),
      mode: fromEnum(memoryPushDeleteMode),
      deferred: ee,
      reappeared: ae,
      held: re,
      executed: Se,
      pending: se.size,
    });
  return {
    success: !ie,
    filesWritten: he,
    filesDeleted: Se,
    conflicts: ce,
    conflictRecoveries: we,
    secretsSkipped: localMemoryEntries.skippedSecretPaths.length,
    oversizedSkipped: localMemoryEntries.skippedOversizedPaths.length,
    deletesDeferred: ee,
    deletesReappeared: ae,
    deletesHeld: re,
    diskTrusted: localMemoryEntries.diskTrusted,
    emptySkipped: x,
    filesRefused: P.size,
    backedOff: Ee || undefined,
    permanent: Me,
    permanentPath,
    failureReason: nt,
    error,
  };
}
//@ chunk-s61vbvea.js:158789-158804 placement
/**
 * 重同步间隔的下限（1 分钟）。
 */
var DEFAULT_RESYNC_INTERVAL_MIN = 60;
var MIN_RESYNC_INTERVAL_MIN = 1;
//@ chunk-s61vbvea.js:158804-158998 placement
/**
 * memory store 周期重同步间隔：CLAUDE_CODE_DISABLE_MEMORY_PERIODIC_RESYNC 关闭；否则 tengu_memory_store_resync_interval_minutes（有下限）。
 */
function getMemoryStoreResyncIntervalMs() {
  if (env.CLAUDE_CODE_DISABLE_MEMORY_PERIODIC_RESYNC) return 0;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_memory_store_resync_interval_minutes",
    DEFAULT_RESYNC_INTERVAL_MIN,
  );
  if (!Number.isFinite(featureValue_CACHED_MAY_BE_STALE) || featureValue_CACHED_MAY_BE_STALE <= 0) return 0;
  return Math.max(featureValue_CACHED_MAY_BE_STALE, MIN_RESYNC_INTERVAL_MIN) * 60000;
}
//@ chunk-s61vbvea.js:158998-159159 placement
var SKIPPED_RESULT = {
  success: true,
  skipped: true,
  entriesListed: 0,
  filesWritten: 0,
  filesDeleted: 0,
};
var NOOP_RESULT = SKIPPED_RESULT;
var BACKED_OFF_RESULT = {
  ...SKIPPED_RESULT,
  cause: "backed_off",
  backedOff: true,
};
var BACKED_OFF_PULL_RESULT = {
  ...NOOP_SYNC_RESULT,
  skipped: true,
  backedOff: true,
};
//@ chunk-s61vbvea.js:159159-159327 placement
function noteServerBackoff(e, error) {
  if (!(error instanceof MemoryUnavailableError) || error.retryAfterMs === undefined) return false;
  e.serverBackoffUntilMs = Math.max(e.serverBackoffUntilMs ?? 0, Date.now() + error.retryAfterMs);
  return true;
}
//@ chunk-s61vbvea.js:159327-159346 placement
/**
 * 抑制同步的时长（300000 毫秒）。
 */
var MAX_PERMANENT_FAILURES = 3;
var SUPPRESS_MS = 300000;
//@ chunk-s61vbvea.js:159346-159490 placement
async function syncTeamMemoryOnce(e, n = "watch", storageV5, offRetries = 0) {
  if (e.inFlight) return e.inFlight;
  let h = syncTeamMemoryRoot(e, n, storageV5, offRetries);
  e.inFlight = h;
  try {
    return await h;
  } finally {
    e.inFlight = null;
  }
}
//@ chunk-s61vbvea.js:159490-166798 placement
/**
 * 团队记忆根目录同步与 manifest 校正
 */
async function syncTeamMemoryRoot(e, n, r, offRetries) {
  let h = {};
  let y = {};
  let w = (await checkPathInTeamMemDir(getMemoryDirNfc(), "team")) === "escape";
  if (w)
    logForDebugging(
      "multi-store-sync: team memory root escapes its canonical location \u2014 failing all stores closed",
      {
        level: "error",
      },
    );
  await Promise.all(
    e.stores.map(async (store) => {
      if (isOrgMemoryDecisionClosed(store) || shouldMirrorAllUncovered(store)) {
        h[store.mountName] = NOOP_RESULT;
        return;
      }
      let q = (store.serverBackoffUntilMs ?? 0) - Date.now();
      if (q > 0) {
        logForDebugging(
          `multi-store-sync[${store.mountName}]: sitting this cycle out: the server asked sync to wait, ${Math.ceil(q / 1000)}s left`,
          {
            level: "debug",
          },
        );
        h[store.mountName] = BACKED_OFF_RESULT;
        return;
      }
      let suppressedUntilMs = store.suppressedUntilMs ?? null;
      if (store.suppressedReason !== null && suppressedUntilMs !== null && Date.now() >= suppressedUntilMs) {
        logForDebugging(
          `multi-store-sync[${store.mountName}]: suppression window elapsed \u2014 retrying (was: ${store.suppressedReason})`,
          {
            level: "info",
          },
        );
        store.recoveryUnconfirmedReason = store.suppressedReason;
        store.suppressedReason = null;
        store.suppressedUntilMs = null;
      }
      if (store.suppressedReason !== null && !isStoreForeignPartition(store)) {
        h[store.mountName] = SKIPPED_RESULT;
        return;
      }
      let Z = (error, permanent) => {
        h[store.mountName] = {
          success: false,
          entriesListed: 0,
          filesWritten: 0,
          filesDeleted: 0,
          ...(permanent !== undefined && {
            permanent,
          }),
          error,
        };
      };
      if (w && store.scope === "team") {
        Z("team memory root canonicity check failed (fail closed)");
        return;
      }
      try {
        await mkdir(store.mountDir, {
          recursive: true,
          ...(store.scope === "account" && {
            mode: 448,
          }),
        });
        if ((await checkMountDirLocation(store)) === "escape") {
          logForDebugging(
            `multi-store-sync[${store.mountName}]: mount dir escapes its canonical location \u2014 skipping pull+push (fail closed)`,
            {
              level: "error",
            },
          );
          Z("mount dir canonicity check failed (fail closed)");
          return;
        }
        if (!store.pulled && store.scope !== "user") {
          let syncManifest = await readSyncManifest(store.mountDir, r, store.v5MemoryBase);
          if (store.suppressedReason !== null && !(await readoptMountDir(store, syncManifest, r))) {
            h[store.mountName] = SKIPPED_RESULT;
            return;
          }
          if (
            syncManifest.state === "present" &&
            syncManifest.manifest.partition !== store.backend.partitionId
          )
            checkForeignPartition(store, "firstPull");
          else if (syncManifest.state !== "present" && (store.source ?? "env") === "discovery") {
            let mountDirOccupancy = await getMountDirOccupancy(store.mountDir);
            if (mountDirOccupancy === "unreadable") {
              Z("mount dir enumeration failed (fail closed)");
              return;
            }
            if (mountDirOccupancy === "occupied") {
              let re = await enumerateMountDir(store, r);
              if (re.outcome === "mismatch") checkUnmanifestedMountDir(store);
              else if (re.outcome === "failed") {
                Z(re.error, re.permanent);
                return;
              } else {
                await clearBasis(store, r);
                try {
                  await writeSyncManifest(store, {}, r);
                } catch (error) {
                  if (isNonAccountStore(store))
                    logFeatureSad("team_memory_multistore_conflict", "manifest_materialization_failed");
                  Z(`manifest restamp failed (fail closed): ${errorMessage(error)}`);
                  return;
                }
                if (isNonAccountStore(store))
                  logFeatureSad("team_memory_multistore_conflict", "manifest_restamped");
                logForDebugging(
                  `multi-store-sync[${store.mountName}]: ${syncManifest.state} manifest over content matching the store \u2014 restamped and adopting`,
                  {
                    level: "info",
                  },
                );
              }
            } else {
              if ((await readSyncManifest(store.mountDir, r, store.v5MemoryBase)).state !== "present")
                await clearBasis(store, r);
              let he;
              try {
                he = await writeSyncManifest(store, {}, r);
              } catch (error) {
                if (isNonAccountStore(store))
                  logFeatureSad("team_memory_multistore_conflict", "manifest_materialization_failed");
                Z(`manifest materialization failed (fail closed): ${errorMessage(error)}`);
                return;
              }
              if (he) {
                if (isTypedKoalaEnabled()) await writeSyncBasis(store, r);
              } else store.basisUnusable = null;
            }
          }
          if (store.suppressedReason !== null) {
            h[store.mountName] = SKIPPED_RESULT;
            return;
          }
        }
        h[store.mountName] = await rejoinTeamMemory(store, r);
      } catch (error) {
        h[store.mountName] = {
          success: false,
          entriesListed: 0,
          filesWritten: 0,
          filesDeleted: 0,
          error: errorMessage(error),
        };
      }
    }),
  );
  await Promise.all(
    e.stores.map(async (store) => {
      if (store.suppressedReason !== null) {
        y[store.mountName] = NOOP_SYNC_RESULT;
        return;
      }
      if (h[store.mountName] === BACKED_OFF_RESULT || Date.now() < (store.serverBackoffUntilMs ?? 0)) {
        y[store.mountName] = BACKED_OFF_PULL_RESULT;
        return;
      }
      try {
        y[store.mountName] = await runSyncCycleWithReport(
          store,
          {
            allowDeletes: h[store.mountName]?.success === true && h[store.mountName]?.skipped !== true,
          },
          r,
        );
      } catch (error) {
        y[store.mountName] = {
          ...NOOP_SYNC_RESULT,
          success: false,
          failureReason: "exception",
          error: errorMessage(error),
        };
      }
    }),
  );
  for (let store of e.stores) {
    if (store.suppressedReason !== null) continue;
    if (h[store.mountName]?.skipped === true) continue;
    let permanent = h[store.mountName]?.permanent ?? y[store.mountName]?.permanent;
    if (!permanent) {
      store.consecutivePermanentFailures = 0;
      if (
        (store.recoveryUnconfirmedReason ?? null) !== null &&
        h[store.mountName]?.success &&
        h[store.mountName]?.skipped !== true &&
        y[store.mountName]?.success &&
        y[store.mountName]?.skipped !== true
      ) {
        let Z = y[store.mountName];
        noticeStoreRecovered(store, Z.filesWritten + Z.filesDeleted);
        store.recoveryUnconfirmedReason = null;
      }
      continue;
    }
    store.consecutivePermanentFailures = (store.consecutivePermanentFailures ?? 0) + 1;
    if (store.consecutivePermanentFailures < MAX_PERMANENT_FAILURES) continue;
    store.suppressedReason = permanent;
    store.suppressedUntilMs = Date.now() + SUPPRESS_MS;
    formatMemorySyncPausedNotice(
      store,
      permanent,
      h[store.mountName]?.permanent === undefined ? y[store.mountName]?.permanentPath : undefined,
    );
    let error = h[store.mountName]?.error ?? y[store.mountName]?.error;
    logForDebugging(
      `multi-store-sync[${store.mountName}]: suppressing further sync (${permanent}) after ${store.consecutivePermanentFailures} consecutive failures \u2014 retrying in ${SUPPRESS_MS / 60000}m` +
        (error !== undefined ? ` (last error: ${error})` : ""),
      {
        level: "warn",
      },
    );
  }
  let R = {
    stores: e.stores.length,
    stores_suppressed: count(e.stores, (L) => L.suppressedReason !== null),
    stores_backed_off: count(e.stores, (L) => (L.serverBackoffUntilMs ?? 0) > Date.now()),
    pull_written: Object.values(h).reduce((acc, q) => acc + q.filesWritten, 0),
    pull_deleted: Object.values(h).reduce((acc, q) => acc + q.filesDeleted, 0),
    push_written: Object.values(y).reduce((acc, q) => acc + q.filesWritten, 0),
    push_deleted: Object.values(y).reduce((acc, q) => acc + q.filesDeleted, 0),
    push_deletes_deferred: Object.values(y).reduce((acc, q) => acc + (q.deletesDeferred ?? 0), 0),
    conflicts: Object.values(y).reduce((acc, q) => acc + q.conflicts, 0),
    conflict_recoveries: Object.values(y).reduce((acc, q) => acc + (q.conflictRecoveries ?? 0), 0),
    secrets_skipped: Object.values(y).reduce((acc, q) => acc + q.secretsSkipped, 0),
    oversized_skipped: Object.values(y).reduce((acc, q) => acc + (q.oversizedSkipped ?? 0), 0),
    push_empty_skipped: Object.values(y).reduce((acc, q) => acc + (q.emptySkipped ?? 0), 0),
    push_files_refused: Object.values(y).reduce((acc, q) => acc + (q.filesRefused ?? 0), 0),
    pull_failed_write_marked: e.stores.reduce((acc, store) => acc + (store.failedWritesMarked ?? 0), 0),
    pull_empty_restored: Object.values(h).reduce((acc, q) => acc + (q.emptyRestored ?? 0), 0),
    pull_sha_mismatches: Object.values(h).reduce((acc, q) => acc + (q.shaMismatches ?? 0), 0),
    pull_entries_listed: Object.values(h).reduce((acc, q) => acc + q.entriesListed, 0),
    pull_entries_fetch_failed: Object.values(h).reduce((acc, q) => acc + (q.fetchesFailed ?? 0), 0),
    pull_entries_without_ref: Object.values(h).reduce((acc, q) => acc + (q.entriesWithoutRef ?? 0), 0),
    pull_old_receipt_missing_refetched: Object.values(h).reduce(
      (acc, q) => acc + (q.unmarkedReceiptRefetched ?? 0),
      0,
    ),
    pull_failures: count(Object.values(h), (L) => !L.success),
    push_failures: count(Object.values(y), (L) => !L.success),
  };
  for (let store of e.stores) store.failedWritesMarked = 0;
  if (e.stores.length > 0 && e.stores.every((store) => store.scope === "account"))
    return {
      pulls: h,
      pushes: y,
    };
  let failureReason = Object.values(y).find((L) => !L.success)?.failureReason;
  let filtered = e.stores.filter((store) => isUsableSuppressedReason(store.basisUnusable));
  let found = filtered
    .map((L) => h[L.mountName])
    .find((L) => L !== undefined && (L.skipped === true || !L.success));
  let G =
    found === undefined
      ? undefined
      : (found.cause ??
        (found.skipped ? "suppressed" : found.permanent !== undefined ? "permanent" : "unavailable"));
  logEvent("tengu_team_mem_multistore_sync", {
    ...R,
    trigger: fromEnum(n),
    off_retries: offRetries,
    off_store_count: filtered.length,
    off_pull_failure: fromEnumOpt(G),
    ...(failureReason !== undefined && {
      push_failure_reason: sanitizedMachineReasonForTelemetry(failureReason),
    }),
  });
  if (R.pull_failures > 0) logFeatureBad("team_memory_multistore_pull", "multistore_pull_failed");
  else if (Object.values(h).some((L) => L.backedOff === true))
    logFeatureSad("team_memory_multistore_pull", "backed_off");
  else logFeatureOk("team_memory_multistore_pull");
  if (R.push_failures > 0) logFeatureBad("team_memory_multistore_push", "multistore_push_failed");
  else if (R.push_files_refused > 0) logFeatureSad("team_memory_multistore_push", "file_refused");
  else if (Object.values(y).some((L) => L.backedOff === true))
    logFeatureSad("team_memory_multistore_push", "backed_off");
  else logFeatureOk("team_memory_multistore_push");
  if (R.conflicts > 0) logFeatureOk("team_memory_multistore_conflict");
  logForDebugging(
    `multi-store-sync: ${R.stores} store(s) \u2014 ` +
      `pull \u2193${R.pull_written}/\u2212${R.pull_deleted}, ` +
      `push \u2191${R.push_written}/\u2212${R.push_deleted}` +
      (R.conflicts ? `, ${R.conflicts} conflict(s)` : "") +
      (R.pull_failures || R.push_failures
        ? `, failures pull=${R.pull_failures} push=${R.push_failures}`
        : ""),
    {
      level: "info",
    },
  );
  return {
    pulls: h,
    pushes: y,
  };
}
export {
  resolveStoreKeyPath,
  isMountEscaped,
  NOOP_RESULT,
  SKIPPED_RESULT,
  noteServerBackoff,
  syncTeamMemoryOnce,
  getMemoryStoreResyncIntervalMs,
  runSyncCycleWithReport,
};
