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
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
} from "path";
import {
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
} from "fs/promises";
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
  qt,
  checkPushManifestGate,
  Ea,
  runWithConcurrency,
  allowConflictRefetch,
  shouldMirrorAllUncovered,
  lC,
  readoptMountDir,
  checkForeignPartition,
  getMountDirOccupancy,
  enumerateMountDir,
  checkUnmanifestedMountDir,
  rejoinTeamMemory,
} from "./storeReconcile.js";
import { N2, isOrgMemoryWriteOptedIn } from "../orgMemory/orgMemoryDecision.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  Dr,
  EMPTY_CONTENT_SHA256,
  getMemoryPushDeleteMode,
  PUSH_TIMEOUT_MS,
  getMassDeleteThreshold,
  LOCAL_IO_CONCURRENCY,
  repeat,
  Nr,
} from "./syncConfig.js";
import {
  formatOversizedMemoryNotice,
  bC,
  formatMassDeleteGuardNotice,
  findRemoteEntry,
  recordRemoteEntry,
  queueConflictNotice,
  Ln,
  formatDeletionConflictNotice,
  _C,
  Uu,
  MEMORY_SYNC_REJECT_TEXTS,
  noticeStoreRecovered,
  formatMemorySyncPausedNotice,
} from "./syncNotices.js";
import { readSyncManifest, Us, writeSyncBasis, writeSyncManifest } from "./syncManifest.js";
import { count } from "../../utils/collections.js";
import {
  MemoryPermanentError,
  MemoryUnavailableError,
  MemoryNotFoundError,
  MemoryConflictError,
} from "../orgMemory/storeErrors.js";
import { Pk } from "../orgMemory/storeApi.js";
import { storageKeyForMountPath } from "../../memdir/teamMemPrompts.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-s61vbvea.js:148738-148836 placement
var cr = {
  success: !0,
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
      return validateTeamMemKey(join_5(e.mountName, n).split(sep_2).join("/"));
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
/**
 * 检查团队记忆根与挂载目录是否偏离规范位置，偏离时记错误并按关闭失败处理。
 */
//@ chunk-s61vbvea.js:149198-149572 placement
async function isMountEscaped(e) {
  if (e.scope === "team" && (await checkPathInTeamMemDir(getMemoryDirNfc(), "team")) === "escape")
    return (
      logForDebugging(
        `multi-store-sync[${e.mountName}]: team memory root escapes its canonical location \u2014 failing closed`,
        { level: "error" },
      ),
      !0
    );
  if ((await checkMountDirLocation(e)) === "escape")
    return (
      logForDebugging(
        `multi-store-sync[${e.mountName}]: mount dir escapes its canonical location \u2014 failing closed`,
        { level: "error" },
      ),
      !0
    );
  return !1;
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
      void 0,
    );
  } catch (error) {
    return (
      logForDebugging(`multi-store-sync[${e.mountName}]: unsaved-write scan failed: ${errorMessage(error)}`, {
        level: "warn",
      }),
      []
    );
  }
  if (s.rootMissing) return [];
  let h = e.notices.roUnsavedNoticed.get(e.mountDir),
    y = s.diskTrusted ? new Set() : new Set(h),
    S = [];
  for (let [w, R] of s.entries) {
    if (e.remoteHashes.get(w)?.sha256 === R.sha256) continue;
    if ((y.add(w), !h?.has(w))) S.push(w);
  }
  return (e.notices.roUnsavedNoticed.set(e.mountDir, y), S.sort());
}
/**
 * 运行一轮多库同步，结束后若有本轮的基线不可用报告且未上报，则记 tengu_team_mem_basis_unusable。
 */
//@ chunk-s61vbvea.js:150178-150556 placement
async function runSyncCycleWithReport(e, n, r) {
  let s = e.basisUnusableReport ?? null;
  try {
    return await runMultiStoreSyncCycle(e, s, n, r);
  } finally {
    if (s !== null && e.basisUnusableReport === s) {
      if (((e.basisUnusableReport = null), !s.emitted))
        ((s.emitted = !0),
          logEvent("tengu_team_mem_basis_unusable", {
            scope: fromEnum(e.scope),
            reason: fromEnum(s.reason),
            local_only_count: s.localOnly.size,
            held_count: s.held,
            uploaded_count: s.uploaded,
            upload_failed_count: s.uploadFailed,
          }));
    }
  }
}
/**
 * 多记忆库同步一轮：只读库未保存写入、冲突、批量删除保护
 */
//@ chunk-s61vbvea.js:150556-158789 placement
async function runMultiStoreSyncCycle(e, n, r, s) {
  if (e.backend.mode === "ro") {
    let Re = await scanUnsavedWrites(e, r?.allowDeletes === !0, s);
    if (Re.length === 0) return cr;
    return (
      logEvent("tengu_memory_sync_ro_unsaved", { scope: fromEnum(e.scope), count: Re.length }),
      { ...cr, unsavedReadOnlyPaths: Re }
    );
  }
  if (isOrgMemoryDecisionClosed(e)) return { ...cr, skipped: !0 };
  if (
    (e.source ?? "env") === "discovery" &&
    (N2(e.backend.partitionId) !== "rw" || !isOrgMemoryWriteOptedIn())
  )
    return { ...cr, skipped: !0 };
  if (await isMountEscaped(e)) {
    if (qt(e)) logFeatureSad("team_memory_multistore_conflict", "root_escape");
    return cr;
  }
  if ((await checkPushManifestGate(e, s), !e.pulled)) return cr;
  let h = isStorageV5Enabled(),
    y = getV5MemoryContext(e, s),
    heldLocal = e.heldLocal;
  if (heldLocal !== void 0 && !Dr()) heldLocal.clear();
  let remoteHashes = e.remoteHashes;
  if (heldLocal !== void 0 && heldLocal.size > 0) {
    let Re = new Map(e.remoteHashes);
    for (let [Ne, Je] of heldLocal) if (!Re.has(Ne)) Re.set(Ne, { sha256: Je });
    remoteHashes = Re;
  }
  let R = await collectLocalMemoryEntries(
    e.mountDir,
    e.excludeKey,
    s,
    e.v5MemoryBase,
    e.manifestSeenThisSession,
    e.walkHashes,
    remoteHashes,
  );
  if ((await formatOversizedMemoryNotice(e, R.skippedOversizedPaths), heldLocal !== void 0)) {
    let Re = { edited: 0, deleted: 0, server_listed: 0 };
    for (let [Ne, Je] of heldLocal) {
      let lt = R.entries.get(Ne);
      if (e.remoteHashes.has(Ne)) Re.server_listed++;
      else if (lt === void 0) {
        if (!R.diskTrusted || R.diskPaths.has(Ne)) continue;
        Re.deleted++;
      } else if (lt.sha256 !== Je) Re.edited++;
      else continue;
      heldLocal.delete(Ne);
    }
    if (Re.edited + Re.deleted + Re.server_listed)
      logEvent("tengu_team_mem_held_released", { scope: fromEnum(e.scope), ...Re });
  }
  let x = 0,
    P = (e.refusedWrites ??= new Map());
  for (let Re of P.keys()) {
    let Ne = R.entries.get(Re);
    if (Ne === void 0 ? R.diskTrusted && !R.diskPaths.has(Re) : e.remoteHashes.get(Re)?.sha256 === Ne.sha256)
      P.delete(Re);
  }
  let j = [];
  for (let [Re, Ne] of R.entries) {
    let Je = e.remoteHashes.get(Re);
    if (Je?.sha256 === Ne.sha256 || Ne.content === void 0) continue;
    if (Ne.sha256 === EMPTY_CONTENT_SHA256) {
      x++;
      continue;
    }
    if (Je === void 0 && heldLocal?.get(Re) === Ne.sha256) continue;
    let lt = P.get(Re);
    if (lt?.sha256 === Ne.sha256 && Date.now() - lt.atMs < bC) continue;
    j.push({ path: Re, content: Ne.content, sha256: Ne.sha256, known: Je });
  }
  if (x > 0)
    logForDebugging(`multi-store-sync[${e.mountName}]: not pushing ${x} empty (0-byte) file(s)`, {
      level: "warn",
    });
  let G = await readSyncManifest(e.mountDir, s, e.v5MemoryBase),
    L = G.state === "present" && G.manifest.partition === e.backend.partitionId,
    q = G.state === "present" && !L,
    Q = getMemoryPushDeleteMode(),
    Z = [],
    ee = 0,
    ae = 0,
    se = (e.pendingDeletes ??= new Map());
  for (let Re of se.keys()) if (R.diskPaths.has(Re)) (se.delete(Re), ae++);
  if (r?.allowDeletes && R.diskTrusted && L) {
    let now = Date.now();
    for (let [Ne, Je] of e.remoteHashes) {
      if (R.diskPaths.has(Ne)) continue;
      if (Q === "never") {
        ee++;
        continue;
      }
      if (Q === "immediate") {
        Z.push({ path: Ne, ref: Je });
        continue;
      }
      let lt = se.get(Ne);
      if (lt === void 0) (se.set(Ne, { firstMissingAtMs: now, missingWalks: 1 }), ee++);
      else if ((lt.missingWalks++, lt.missingWalks >= 2 && now - lt.firstMissingAtMs >= PUSH_TIMEOUT_MS))
        Z.push({ path: Ne, ref: Je });
      else ee++;
    }
    for (let Ne of se.keys()) if (!e.remoteHashes.has(Ne)) se.delete(Ne);
  }
  let re = 0;
  if (Z.length > 0) {
    let Re = count([...e.remoteHashes.keys()], (Je) => !R.diskPaths.has(Je)),
      Ne = getMassDeleteThreshold(e.remoteHashes.size);
    if (Re > Ne)
      ((re = Z.length),
        (Z.length = 0),
        logForDebugging(
          `multi-store-sync[${e.mountName}]: holding ${re} corroborated delete(s): ${Re} of ${e.remoteHashes.size} synced files are missing locally at once (mass-delete guard)`,
          { level: "warn" },
        ),
        formatMassDeleteGuardNotice(e, Re, Ne),
        (e.invalidatedBasis = e.remoteHashes),
        (e.remoteHashes = new Map()),
        (e.pulled = !1),
        se.clear(),
        await Us(e, s));
  }
  let he = 0,
    Se = 0,
    ce = 0,
    we = 0,
    ie = !1,
    Ee = !1,
    Ie = 0,
    ke,
    Me,
    We,
    nt;
  function Be(Re, Ne) {
    if (
      (logForDebugging(`multi-store-sync[${e.mountName}]: push failed for ${Ne ?? "<store>"}: ${Ea(Re)}`, {
        level: "warn",
      }),
      (ie = !0),
      Ne !== void 0 && n?.localOnly.has(Ne) === !0)
    )
      n.uploadFailed++;
    if (Re instanceof MemoryPermanentError) ((Me ??= Re.reason), (nt ??= Re.reason));
    else if (Re instanceof MemoryUnavailableError)
      ((nt ??= "unavailable"), (Ee = noteServerBackoff(e, Re) || Ee));
    else nt ??= "error";
    ke ??= Ea(Re);
  }
  if (
    (await runWithConcurrency(q ? [] : j, LOCAL_IO_CONCURRENCY, async (Re) => {
      if (Ee) {
        Ie++;
        return;
      }
      let Ne,
        known = Re.known,
        lt = !1;
      try {
        let Ae;
        if (known)
          try {
            Ae = await e.backend.update(known.id, Re.content, known.sha256);
          } catch (error) {
            if (!(
              error instanceof MemoryNotFoundError &&
              (await findRemoteEntry(e, Re.path).then(
                (Nt) => Nt === null,
                () => !1,
              ))
            ))
              throw error;
            (e.remoteHashes.delete(Re.path), (known = void 0), (lt = !0));
          }
        if (Ae === void 0)
          try {
            if (
              ((Ae = await e.backend.create(Re.path, Re.content, { precondition: "not_exists" })),
              !e.firstWriteEmitted &&
                (e.source ?? "env") === "discovery" &&
                e.writeDir !== void 0 &&
                e.writeDir !== "" &&
                Pk(Re.path).replace(/^\//, "").startsWith(e.writeDir))
            )
              ((e.firstWriteEmitted = !0), logEvent("tengu_org_memory_first_write_into_write_home", {}));
          } catch (error) {
            if (
              !(error instanceof MemoryConflictError) ||
              (error.conflictingPath !== void 0 && error.conflictingPath !== error.path)
            )
              throw error;
            let gt = await findRemoteEntry(e, Re.path);
            if (gt === null) {
              Be(error, Re.path);
              return;
            }
            if (((Ne = gt.id), gt.sha256 !== Re.sha256)) throw error;
            (await recordRemoteEntry(e, Re.path, { id: gt.id, sha256: gt.sha256 }, s),
              P.delete(Re.path),
              logForDebugging(
                `multi-store-sync[${e.mountName}]: adopted ${Re.path} (identical content \u2192 ${gt.id})`,
                { level: "debug" },
              ));
            return;
          }
        if (
          (await recordRemoteEntry(e, Re.path, Ae, s),
          P.delete(Re.path),
          he++,
          n?.localOnly.has(Re.path) === !0)
        )
          n.uploaded++;
        if (
          (logForDebugging(
            `multi-store-sync[${e.mountName}]: pushed ${Re.path} (${known ? "update" : "create"} \u2192 ${Ae.id})`,
            { level: "debug" },
          ),
          lt)
        )
          await queueConflictNotice(
            e,
            Re.path,
            `The memory file ${Ln(Re.path)} was deleted from shared memory by another session while you had local changes. Your local version has been saved to shared memory as a new copy. If the deletion was intended, delete the file.`,
          );
      } catch (error) {
        if (error instanceof MemoryConflictError) {
          if (
            (logForDebugging(
              `multi-store-sync[${e.mountName}]: push conflict on ${Re.path}: ${errorMessage(error)}`,
              { level: "debug" },
            ),
            ce++,
            n?.localOnly.has(Re.path) === !0)
          )
            n.uploadFailed++;
          let ze = known?.id ?? Ne;
          if (ze) {
            if (
              allowConflictRefetch(e, Re.path) &&
              (await formatDeletionConflictNotice(
                e,
                Re.path,
                ze,
                (known === void 0 && !lt) || known?.sha256 === repeat ? "unsynced" : "update",
                s,
              ))
            )
              we++;
            else if (!known) e.remoteHashes.set(Re.path, { id: ze, sha256: repeat });
          } else
            await queueConflictNotice(
              e,
              Re.path,
              `Your recent write to the memory file ${Ln(Re.path)} was NOT saved to shared memory: its path conflicts with an existing memory (a file exists where this path needs a directory, or the reverse). Re-read the memory directory and rename this file, or delete the conflicting one, if the change is still wanted.`,
            );
          return;
        }
        if (error instanceof MemoryPermanentError && _C.has(error.reason)) {
          let ze = P.get(Re.path),
            gt = ze?.sha256 === Re.sha256 && ze.reason === error.reason;
          if (
            (P.set(Re.path, { sha256: Re.sha256, reason: error.reason, atMs: Date.now() }),
            logForDebugging(
              `multi-store-sync[${e.mountName}]: server refused ${Re.path}; other files keep syncing: ${errorMessage(error)}`,
              { level: "warn" },
            ),
            !gt)
          )
            await queueConflictNotice(
              e,
              Re.path,
              `The memory file ${Uu(Re.path)} was NOT saved to shared memory (${error.reason}). ${MEMORY_SYNC_REJECT_TEXTS[error.reason] ?? ""} Your other memory files keep syncing. This file stays local only, and its changes will be lost when this session's machine is recycled. Once you change or delete it, the next sync tries again. Tell the user this memory file is not being persisted.`,
              { keepPending: !0 },
            );
          return;
        }
        if (error instanceof MemoryPermanentError && Me === void 0) We = Re.path;
        Be(error, Re.path);
      }
    }),
    await runWithConcurrency(Z, LOCAL_IO_CONCURRENCY, async (Re) => {
      if (Ee) {
        Ie++;
        return;
      }
      try {
        let Je = await resolveMountPath(e, Re.path),
          lt = y !== void 0 ? storageKeyForMountPath(y.base, e.mountDir, Je) : void 0;
        if (h && y !== void 0 && lt !== void 0) {
          let Ae = !1;
          try {
            let statMeta = await y.storageV5.statMeta(lt);
            Ae = !statMeta.ok && statMeta.error.code === "NotFound";
          } catch {}
          if (!Ae) {
            (se.delete(Re.path), ae++);
            return;
          }
        } else {
          (await stat_3(Je), se.delete(Re.path), ae++);
          return;
        }
      } catch {}
      let Ne = () => {
        (e.remoteHashes.delete(Re.path), se.delete(Re.path), e.pullWritten.delete(Re.path));
      };
      if (Ee) {
        Ie++;
        return;
      }
      try {
        (await e.backend.delete(Re.ref.id, Re.ref.sha256),
          Ne(),
          Se++,
          logForDebugging(`multi-store-sync[${e.mountName}]: pushed ${Re.path} (delete ${Re.ref.id})`, {
            level: "debug",
          }));
      } catch (error) {
        if (error instanceof MemoryConflictError) {
          if (
            (logForDebugging(
              `multi-store-sync[${e.mountName}]: delete conflict on ${Re.path}: ${errorMessage(error)}`,
              { level: "debug" },
            ),
            se.delete(Re.path),
            ce++,
            allowConflictRefetch(e, Re.path) &&
              (await formatDeletionConflictNotice(e, Re.path, Re.ref.id, "delete", s)))
          )
            we++;
          return;
        }
        if (error instanceof MemoryNotFoundError) {
          if (
            await findRemoteEntry(e, Re.path).then(
              (Ae) => Ae === null,
              () => !1,
            )
          )
            Ne();
          else
            logForDebugging(
              `multi-store-sync[${e.mountName}]: delete of ${Re.path} 404'd but the path is still listed (or the listing failed) \u2014 retrying next cycle`,
              { level: "debug" },
            );
          return;
        }
        Be(error, Re.path);
      }
    }),
    Ie > 0)
  )
    logForDebugging(
      `multi-store-sync[${e.mountName}]: ${Ie} upload(s)/delete(s) not started this cycle after the server asked sync to wait; a later sync sends them (waiting at least ${Math.max(0, Math.ceil(((e.serverBackoffUntilMs ?? 0) - Date.now()) / 1000))}s)`,
      { level: "warn" },
    );
  if (L && re === 0) await writeSyncBasis(e, s);
  if (ee > 0 || ae > 0 || re > 0)
    logEvent("tengu_team_mem_push_delete_deferred", {
      scope: fromEnum(e.scope),
      mode: fromEnum(Q),
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
    secretsSkipped: R.skippedSecretPaths.length,
    oversizedSkipped: R.skippedOversizedPaths.length,
    deletesDeferred: ee,
    deletesReappeared: ae,
    deletesHeld: re,
    diskTrusted: R.diskTrusted,
    emptySkipped: x,
    filesRefused: P.size,
    backedOff: Ee || void 0,
    permanent: Me,
    permanentPath: We,
    failureReason: nt,
    error: ke,
  };
}
//@ chunk-s61vbvea.js:158789-158804 placement
var MC = 60,
  DC = 1;
/**
 * memory store 周期重同步间隔：CLAUDE_CODE_DISABLE_MEMORY_PERIODIC_RESYNC 关闭；否则 tengu_memory_store_resync_interval_minutes（有下限）。
 */
//@ chunk-s61vbvea.js:158804-158998 placement
function getMemoryStoreResyncIntervalMs() {
  if (env.CLAUDE_CODE_DISABLE_MEMORY_PERIODIC_RESYNC) return 0;
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_memory_store_resync_interval_minutes", MC);
  if (!Number.isFinite(e) || e <= 0) return 0;
  return Math.max(e, DC) * 60000;
}
//@ chunk-s61vbvea.js:158998-159159 placement
var SKIPPED_RESULT = { success: !0, skipped: !0, entriesListed: 0, filesWritten: 0, filesDeleted: 0 },
  NOOP_RESULT = SKIPPED_RESULT,
  BACKED_OFF_RESULT = { ...SKIPPED_RESULT, cause: "backed_off", backedOff: !0 },
  BACKED_OFF_PULL_RESULT = { ...cr, skipped: !0, backedOff: !0 };
//@ chunk-s61vbvea.js:159159-159327 placement
function noteServerBackoff(e, n) {
  if (!(n instanceof MemoryUnavailableError) || n.retryAfterMs === void 0) return !1;
  return ((e.serverBackoffUntilMs = Math.max(e.serverBackoffUntilMs ?? 0, Date.now() + n.retryAfterMs)), !0);
}
//@ chunk-s61vbvea.js:159327-159346 placement
var LC = 3,
  Yg = 300000;
//@ chunk-s61vbvea.js:159346-159490 placement
async function syncTeamMemoryOnce(e, n = "watch", r, s = 0) {
  if (e.inFlight) return e.inFlight;
  let h = syncTeamMemoryRoot(e, n, r, s);
  e.inFlight = h;
  try {
    return await h;
  } finally {
    e.inFlight = null;
  }
}
/**
 * 团队记忆根目录同步与 manifest 校正
 */
//@ chunk-s61vbvea.js:159490-166798 placement
async function syncTeamMemoryRoot(e, n, r, s) {
  let h = {},
    y = {},
    w = (await checkPathInTeamMemDir(getMemoryDirNfc(), "team")) === "escape";
  if (w)
    logForDebugging(
      "multi-store-sync: team memory root escapes its canonical location \u2014 failing all stores closed",
      { level: "error" },
    );
  (await Promise.all(
    e.stores.map(async (store) => {
      if (isOrgMemoryDecisionClosed(store) || shouldMirrorAllUncovered(store)) {
        h[store.mountName] = NOOP_RESULT;
        return;
      }
      let q = (store.serverBackoffUntilMs ?? 0) - Date.now();
      if (q > 0) {
        (logForDebugging(
          `multi-store-sync[${store.mountName}]: sitting this cycle out: the server asked sync to wait, ${Math.ceil(q / 1000)}s left`,
          { level: "debug" },
        ),
          (h[store.mountName] = BACKED_OFF_RESULT));
        return;
      }
      let Q = store.suppressedUntilMs ?? null;
      if (store.suppressedReason !== null && Q !== null && Date.now() >= Q)
        (logForDebugging(
          `multi-store-sync[${store.mountName}]: suppression window elapsed \u2014 retrying (was: ${store.suppressedReason})`,
          { level: "info" },
        ),
          (store.recoveryUnconfirmedReason = store.suppressedReason),
          (store.suppressedReason = null),
          (store.suppressedUntilMs = null));
      if (store.suppressedReason !== null && !lC(store)) {
        h[store.mountName] = SKIPPED_RESULT;
        return;
      }
      let Z = (ee, ae) => {
        h[store.mountName] = {
          success: !1,
          entriesListed: 0,
          filesWritten: 0,
          filesDeleted: 0,
          ...(ae !== void 0 && { permanent: ae }),
          error: ee,
        };
      };
      if (w && store.scope === "team") {
        Z("team memory root canonicity check failed (fail closed)");
        return;
      }
      try {
        if (
          (await mkdir_2(store.mountDir, { recursive: !0, ...(store.scope === "account" && { mode: 448 }) }),
          (await checkMountDirLocation(store)) === "escape")
        ) {
          (logForDebugging(
            `multi-store-sync[${store.mountName}]: mount dir escapes its canonical location \u2014 skipping pull+push (fail closed)`,
            { level: "error" },
          ),
            Z("mount dir canonicity check failed (fail closed)"));
          return;
        }
        if (!store.pulled && store.scope !== "user") {
          let ae = await readSyncManifest(store.mountDir, r, store.v5MemoryBase);
          if (store.suppressedReason !== null && !(await readoptMountDir(store, ae, r))) {
            h[store.mountName] = SKIPPED_RESULT;
            return;
          }
          if (ae.state === "present" && ae.manifest.partition !== store.backend.partitionId)
            checkForeignPartition(store, "firstPull");
          else if (ae.state !== "present" && (store.source ?? "env") === "discovery") {
            let se = await getMountDirOccupancy(store.mountDir);
            if (se === "unreadable") {
              Z("mount dir enumeration failed (fail closed)");
              return;
            }
            if (se === "occupied") {
              let re = await enumerateMountDir(store, r);
              if (re.outcome === "mismatch") checkUnmanifestedMountDir(store);
              else if (re.outcome === "failed") {
                Z(re.error, re.permanent);
                return;
              } else {
                await Us(store, r);
                try {
                  await writeSyncManifest(store, {}, r);
                } catch (error) {
                  if (qt(store))
                    logFeatureSad("team_memory_multistore_conflict", "manifest_materialization_failed");
                  Z(`manifest restamp failed (fail closed): ${errorMessage(error)}`);
                  return;
                }
                if (qt(store)) logFeatureSad("team_memory_multistore_conflict", "manifest_restamped");
                logForDebugging(
                  `multi-store-sync[${store.mountName}]: ${ae.state} manifest over content matching the store \u2014 restamped and adopting`,
                  { level: "info" },
                );
              }
            } else {
              if ((await readSyncManifest(store.mountDir, r, store.v5MemoryBase)).state !== "present")
                await Us(store, r);
              let he;
              try {
                he = await writeSyncManifest(store, {}, r);
              } catch (error) {
                if (qt(store))
                  logFeatureSad("team_memory_multistore_conflict", "manifest_materialization_failed");
                Z(`manifest materialization failed (fail closed): ${errorMessage(error)}`);
                return;
              }
              if (he) {
                if (Dr()) await writeSyncBasis(store, r);
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
          success: !1,
          entriesListed: 0,
          filesWritten: 0,
          filesDeleted: 0,
          error: errorMessage(error),
        };
      }
    }),
  ),
    await Promise.all(
      e.stores.map(async (store) => {
        if (store.suppressedReason !== null) {
          y[store.mountName] = cr;
          return;
        }
        if (h[store.mountName] === BACKED_OFF_RESULT || Date.now() < (store.serverBackoffUntilMs ?? 0)) {
          y[store.mountName] = BACKED_OFF_PULL_RESULT;
          return;
        }
        try {
          y[store.mountName] = await runSyncCycleWithReport(
            store,
            { allowDeletes: h[store.mountName]?.success === !0 && h[store.mountName]?.skipped !== !0 },
            r,
          );
        } catch (error) {
          y[store.mountName] = { ...cr, success: !1, failureReason: "exception", error: errorMessage(error) };
        }
      }),
    ));
  for (let store of e.stores) {
    if (store.suppressedReason !== null) continue;
    if (h[store.mountName]?.skipped === !0) continue;
    let q = h[store.mountName]?.permanent ?? y[store.mountName]?.permanent;
    if (!q) {
      if (
        ((store.consecutivePermanentFailures = 0),
        (store.recoveryUnconfirmedReason ?? null) !== null &&
          h[store.mountName]?.success &&
          h[store.mountName]?.skipped !== !0 &&
          y[store.mountName]?.success &&
          y[store.mountName]?.skipped !== !0)
      ) {
        let Z = y[store.mountName];
        (noticeStoreRecovered(store, Z.filesWritten + Z.filesDeleted),
          (store.recoveryUnconfirmedReason = null));
      }
      continue;
    }
    if (
      ((store.consecutivePermanentFailures = (store.consecutivePermanentFailures ?? 0) + 1),
      store.consecutivePermanentFailures < LC)
    )
      continue;
    ((store.suppressedReason = q),
      (store.suppressedUntilMs = Date.now() + Yg),
      formatMemorySyncPausedNotice(
        store,
        q,
        h[store.mountName]?.permanent === void 0 ? y[store.mountName]?.permanentPath : void 0,
      ));
    let Q = h[store.mountName]?.error ?? y[store.mountName]?.error;
    logForDebugging(
      `multi-store-sync[${store.mountName}]: suppressing further sync (${q}) after ${store.consecutivePermanentFailures} consecutive failures \u2014 retrying in ${Yg / 60000}m` +
        (Q !== void 0 ? ` (last error: ${Q})` : ""),
      { level: "warn" },
    );
  }
  let R = {
    stores: e.stores.length,
    stores_suppressed: count(e.stores, (L) => L.suppressedReason !== null),
    stores_backed_off: count(e.stores, (L) => (L.serverBackoffUntilMs ?? 0) > Date.now()),
    pull_written: Object.values(h).reduce((L, q) => L + q.filesWritten, 0),
    pull_deleted: Object.values(h).reduce((L, q) => L + q.filesDeleted, 0),
    push_written: Object.values(y).reduce((L, q) => L + q.filesWritten, 0),
    push_deleted: Object.values(y).reduce((L, q) => L + q.filesDeleted, 0),
    push_deletes_deferred: Object.values(y).reduce((L, q) => L + (q.deletesDeferred ?? 0), 0),
    conflicts: Object.values(y).reduce((L, q) => L + q.conflicts, 0),
    conflict_recoveries: Object.values(y).reduce((L, q) => L + (q.conflictRecoveries ?? 0), 0),
    secrets_skipped: Object.values(y).reduce((L, q) => L + q.secretsSkipped, 0),
    oversized_skipped: Object.values(y).reduce((L, q) => L + (q.oversizedSkipped ?? 0), 0),
    push_empty_skipped: Object.values(y).reduce((L, q) => L + (q.emptySkipped ?? 0), 0),
    push_files_refused: Object.values(y).reduce((L, q) => L + (q.filesRefused ?? 0), 0),
    pull_failed_write_marked: e.stores.reduce((L, q) => L + (q.failedWritesMarked ?? 0), 0),
    pull_empty_restored: Object.values(h).reduce((L, q) => L + (q.emptyRestored ?? 0), 0),
    pull_sha_mismatches: Object.values(h).reduce((L, q) => L + (q.shaMismatches ?? 0), 0),
    pull_entries_listed: Object.values(h).reduce((L, q) => L + q.entriesListed, 0),
    pull_entries_fetch_failed: Object.values(h).reduce((L, q) => L + (q.fetchesFailed ?? 0), 0),
    pull_entries_without_ref: Object.values(h).reduce((L, q) => L + (q.entriesWithoutRef ?? 0), 0),
    pull_old_receipt_missing_refetched: Object.values(h).reduce(
      (L, q) => L + (q.unmarkedReceiptRefetched ?? 0),
      0,
    ),
    pull_failures: count(Object.values(h), (L) => !L.success),
    push_failures: count(Object.values(y), (L) => !L.success),
  };
  for (let store of e.stores) store.failedWritesMarked = 0;
  if (e.stores.length > 0 && e.stores.every((store) => store.scope === "account"))
    return { pulls: h, pushes: y };
  let x = Object.values(y).find((L) => !L.success)?.failureReason,
    filtered = e.stores.filter((store) => Nr(store.basisUnusable)),
    found = filtered.map((L) => h[L.mountName]).find((L) => L !== void 0 && (L.skipped === !0 || !L.success)),
    G =
      found === void 0
        ? void 0
        : (found.cause ??
          (found.skipped ? "suppressed" : found.permanent !== void 0 ? "permanent" : "unavailable"));
  if (
    (logEvent("tengu_team_mem_multistore_sync", {
      ...R,
      trigger: fromEnum(n),
      off_retries: s,
      off_store_count: filtered.length,
      off_pull_failure: fromEnumOpt(G),
      ...(x !== void 0 && { push_failure_reason: sanitizedMachineReasonForTelemetry(x) }),
    }),
    R.pull_failures > 0)
  )
    logFeatureBad("team_memory_multistore_pull", "multistore_pull_failed");
  else if (Object.values(h).some((L) => L.backedOff === !0))
    logFeatureSad("team_memory_multistore_pull", "backed_off");
  else logFeatureOk("team_memory_multistore_pull");
  if (R.push_failures > 0) logFeatureBad("team_memory_multistore_push", "multistore_push_failed");
  else if (R.push_files_refused > 0) logFeatureSad("team_memory_multistore_push", "file_refused");
  else if (Object.values(y).some((L) => L.backedOff === !0))
    logFeatureSad("team_memory_multistore_push", "backed_off");
  else logFeatureOk("team_memory_multistore_push");
  if (R.conflicts > 0) logFeatureOk("team_memory_multistore_conflict");
  return (
    logForDebugging(
      `multi-store-sync: ${R.stores} store(s) \u2014 ` +
        `pull \u2193${R.pull_written}/\u2212${R.pull_deleted}, ` +
        `push \u2191${R.push_written}/\u2212${R.push_deleted}` +
        (R.conflicts ? `, ${R.conflicts} conflict(s)` : "") +
        (R.pull_failures || R.push_failures
          ? `, failures pull=${R.pull_failures} push=${R.push_failures}`
          : ""),
      { level: "info" },
    ),
    { pulls: h, pushes: y }
  );
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
