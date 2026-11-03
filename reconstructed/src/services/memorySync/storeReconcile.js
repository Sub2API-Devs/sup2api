/**
 * services/memorySync/storeReconcile.ts
 *
 * 记忆库拉取/推送与挂载目录对账（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (23)
 * attribution: placement 23
 */
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
} from "fs/promises";
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
} from "path";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import {
  readSyncManifest,
  Us,
  Jn,
  loadPersistedBasis,
  qv,
  writeSyncBasis,
  handleUnusableBasis,
  writeSyncManifest,
} from "./syncManifest.js";
import {
  Dr,
  MAX_BATCH_BYTES,
  MAX_RETRIES,
  SUPPRESS_MS,
  MAX_PULL_RETRIES,
  Nr,
  Ou,
  EMPTY_CONTENT_SHA256,
  LOCAL_IO_CONCURRENCY,
  repeat,
  SYNC_INTERVAL_MS,
  MAX_MEMORY_BYTES,
} from "./syncConfig.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  getV5MemoryContext,
  collectLocalMemoryEntries,
  removeEmptyStoreReceipt,
  isLocallyEdited,
  getEntryBaseline,
  Eu,
  writeLocalEntry,
  recordPullWrite,
  ku,
  deleteLocalEntry,
  isLocalContentEqual,
  resolveMountPath,
  statLocalEntry,
  readLocalEntry,
} from "./mountWalk.js";
import {
  MemoryPermanentError,
  MemoryUnavailableError,
  MemoryNotFoundError,
} from "../orgMemory/storeErrors.js";
import { storageKeyForMountPath } from "../../memdir/teamMemPrompts.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { pullStoreView, pullStoreExport } from "./exportStream.js";
import { MAX_STORE_ENTRIES, Pk } from "../orgMemory/storeApi.js";
import { getOrgMemoryDecision, kAt, N2, getDecisionStores } from "../orgMemory/orgMemoryDecision.js";
import {
  noticeStoreSyncOff,
  formatStoreBackOnNotice,
  Ph,
  queueConflictNotice,
  buildLocalCopyReplacedNotice,
  buildWriteConflictNotice,
  Ln,
  noticeEmptyFilesRestored,
  noticeHeldLocalFiles,
} from "./syncNotices.js";
import { isMountEscaped, NOOP_RESULT, SKIPPED_RESULT, noteServerBackoff } from "./multiStoreSync.js";
import { isMemoryDocumentKey } from "../memoryStore/memoryKeys.js";
import { PathTraversalError } from "../../memdir/teamMemPaths.js";
import { count } from "../../utils/collections.js";

//@ chunk-s61vbvea.js:119754-119832 placement
function Ea(e) {
  return errorMessage(e) || getErrnoCode(e) || (e instanceof Error && e.name) || "unknown error";
}
//@ chunk-s61vbvea.js:119832-119984 placement
async function runWithConcurrency(e, n, r) {
  let s = 0,
    list = Array.from({ length: Math.min(n, e.length) }, async () => {
      while (s < e.length) {
        let y = s++;
        await r(e[y]);
      }
    });
  await Promise.all(list);
}
//@ chunk-s61vbvea.js:119984-120874 placement
async function checkPushManifestGate(e, n) {
  let r = await readSyncManifest(e.mountDir, n, e.v5MemoryBase),
    s = r.state === "present" && r.manifest.partition === e.backend.partitionId,
    h = r.state === "torn" && Dr();
  if (s || h) e.manifestSeenThisSession = !0;
  if (!e.pulled) return s ? "matched" : h ? "torn" : "other";
  if (s) return "matched";
  if (r.state === "present" && e.scope !== "user") return (checkForeignPartition(e, "midSession"), "other");
  if (e.remoteHashes.size === 0) return "other";
  if (
    (logForDebugging(
      `multi-store-sync[${e.mountName}]: .memory-sync manifest ${r.state === "present" ? "partition mismatch" : r.state} \u2014 invalidating basis`,
      { level: "warn" },
    ),
    qt(e))
  )
    logFeatureSad(
      "team_memory_multistore_conflict",
      r.state !== "present" ? "manifest_absent" : "manifest_mismatch",
    );
  if (
    (logEvent("tengu_team_mem_push_manifest_gate", {
      absent: r.state !== "present",
      remote_entries: e.remoteHashes.size,
    }),
    (e.invalidatedBasis = e.remoteHashes),
    (e.remoteHashes = new Map()),
    (e.pulled = !1),
    e.pendingDeletes?.clear(),
    r.state !== "present")
  )
    await Us(e, n);
  return "other";
}
//@ chunk-s61vbvea.js:120874-121353 placement
function checkUnmanifestedMountDir(e) {
  if (
    ((e.suppressedReason = "mount_dir_unmanifested_nonempty"),
    (e.suppressedUntilMs = null),
    (e.remoteHashes = new Map()),
    (e.pulled = !1),
    logForDebugging(
      `multi-store-sync[${e.mountName}]: mount dir exists without a .memory-sync manifest and is not empty \u2014 suppressing sync (remove or rename the dir to mount this store)`,
      { level: "warn" },
    ),
    qt(e))
  )
    logFeatureSad("team_memory_multistore_conflict", "unmanifested_nonempty_dir");
  logEvent("tengu_team_mem_foreign_partition_suppressed", { trigger: fromEnum("firstPullUnmanifested") });
}
//@ chunk-s61vbvea.js:121353-121552 placement
async function getMountDirOccupancy(e) {
  try {
    return (await readdir_2(e, { withFileTypes: !0 })).some(
      (r) => r.name !== Jn && !(r.name.startsWith(".") && r.isFile()),
    )
      ? "occupied"
      : "empty";
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? "empty" : "unreadable";
  }
}
//@ chunk-s61vbvea.js:121552-121751 placement
async function isMountDirEffectivelyEmpty(e, n) {
  if (!n.rootMissing) return !1;
  try {
    return (await readdir_2(e.mountDir, { withFileTypes: !0 })).every(
      (s) => s.name.startsWith(".") || (s.isDirectory() && e.excludeKey?.(s.name) === !0),
    );
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:121751-122002 placement
async function containsOnlyRegularFiles(e) {
  let n = await readdir_2(e, { withFileTypes: !0 });
  for (let r of n) {
    if (r.name === Jn) continue;
    if (r.name.startsWith(".")) {
      if (r.isFile()) continue;
      return !1;
    }
    if (r.isDirectory()) {
      if (!(await containsOnlyRegularFiles(join_5(e, r.name)))) return !1;
    } else if (!r.isFile()) return !1;
  }
  return !0;
}
//@ chunk-s61vbvea.js:122002-123201 placement
async function enumerateMountDir(e, n) {
  let r = isStorageV5Enabled(),
    s = getV5MemoryContext(e, n),
    h;
  try {
    h = await e.backend.list();
  } catch (error) {
    return {
      outcome: "failed",
      error: errorMessage(error),
      ...(error instanceof MemoryPermanentError && { permanent: error.reason }),
    };
  }
  let y = new Map(h.map((R) => [R.path, R.sha256])),
    S;
  try {
    S = await collectLocalMemoryEntries(
      e.mountDir,
      e.excludeKey,
      n,
      e.v5MemoryBase,
      e.manifestSeenThisSession,
      e.walkHashes,
      void 0,
    );
  } catch (error) {
    return { outcome: "failed", error: errorMessage(error) };
  }
  if (!S.diskTrusted)
    return { outcome: "failed", error: "mount dir enumeration untrusted (permission failure)" };
  let w;
  try {
    w = await containsOnlyRegularFiles(e.mountDir);
  } catch (error) {
    return { outcome: "failed", error: errorMessage(error) };
  }
  if (!w) return { outcome: "mismatch" };
  for (let diskPath of S.diskPaths) {
    let x = y.get(diskPath);
    if (x === void 0) return { outcome: "mismatch" };
    let P = S.entries.get(diskPath)?.sha256;
    if (P === void 0) {
      let j = join_5(e.mountDir, diskPath.replace(/^\/+/, "")),
        G = s !== void 0 ? storageKeyForMountPath(s.base, e.mountDir, j) : void 0;
      if (r && s !== void 0 && G !== void 0) {
        let read = await s.storageV5.read([{ key: G, offset: 0, length: MAX_BATCH_BYTES + 1 }]),
          q = read.ok ? read.value.items[0] : void 0;
        if (q === void 0 || !q.found || q.totalBytes > MAX_BATCH_BYTES) return { outcome: "mismatch" };
        P = computeContentHash(Buffer.from(q.value).toString("utf8"));
      } else
        try {
          if ((await stat_3(j)).size > MAX_BATCH_BYTES) return { outcome: "mismatch" };
          P = computeContentHash(await readFile(j, "utf8"));
        } catch {
          return { outcome: "mismatch" };
        }
    }
    if (x !== P) return { outcome: "mismatch" };
  }
  return { outcome: "match" };
}
//@ chunk-s61vbvea.js:123201-123647 placement
function checkForeignPartition(e, n) {
  if (
    ((e.suppressedReason = "mount_dir_foreign_partition"),
    (e.suppressedUntilMs = null),
    (e.remoteHashes = new Map()),
    (e.pulled = !1),
    e.pendingDeletes?.clear(),
    logForDebugging(
      `multi-store-sync[${e.mountName}]: mount dir holds a different partition's .memory-sync \u2014 suppressing sync (remove the dir to re-mount)`,
      { level: "warn" },
    ),
    qt(e))
  )
    logFeatureSad("team_memory_multistore_conflict", "foreign_partition_dir");
  logEvent("tengu_team_mem_foreign_partition_suppressed", { trigger: fromEnum(n) });
}
//@ chunk-s61vbvea.js:123647-123729 placement
var aC = new Set(["mount_dir_foreign_partition", "mount_dir_unmanifested_nonempty"]);
//@ chunk-s61vbvea.js:123729-123771 placement
function kh(e) {
  return e !== null && aC.has(e);
}
//@ chunk-s61vbvea.js:123771-123816 placement
function lC(e) {
  return kh(e.suppressedReason);
}
//@ chunk-s61vbvea.js:123816-124514 placement
async function readoptMountDir(e, n, r) {
  let suppressedReason = e.suppressedReason;
  if (!kh(suppressedReason)) return !1;
  let h = n.state === "present" && n.manifest.partition === e.backend.partitionId,
    y = n.state !== "present" && (await getMountDirOccupancy(e.mountDir)) === "empty";
  if (!h && !y) {
    if (suppressedReason === "mount_dir_unmanifested_nonempty" && n.state === "present")
      checkForeignPartition(e, "firstPull");
    return !1;
  }
  if (
    ((e.suppressedReason = null),
    (e.suppressedUntilMs = null),
    (e.recoveryUnconfirmedReason = suppressedReason),
    (e.consecutivePermanentFailures = 0),
    e.refusedWrites?.clear(),
    (e.invalidatedBasis = null),
    await Us(e, r),
    logForDebugging(
      `multi-store-sync[${e.mountName}]: ${suppressedReason} condition cleared \u2014 re-adopting the mount dir`,
      { level: "info" },
    ),
    qt(e))
  )
    logFeatureOk("team_memory_multistore_conflict");
  return (logEvent("tengu_team_mem_foreign_partition_recovered", { reason: fromEnum(suppressedReason) }), !0);
}
//@ chunk-s61vbvea.js:124514-124694 placement
function noteStreamListFailure(e) {
  e.streamListSuccessStreak = 0;
  let n = (e.streamListFailureStreak ?? 0) + 1;
  if (((e.streamListFailureStreak = Math.min(n, MAX_RETRIES)), n >= MAX_RETRIES))
    e.streamListRetryAfterMs = Date.now() + SUPPRESS_MS;
  return n;
}
//@ chunk-s61vbvea.js:124694-124736 placement
function qt(e) {
  return e.scope !== "account";
}
//@ chunk-s61vbvea.js:124736-126054 placement
async function listStoreStream(e) {
  let backend = e.backend;
  if (
    backend.exportMetadata &&
    !e.streamListUnsupported &&
    Date.now() >= (e.streamListRetryAfterMs ?? 0) &&
    !env.CLAUDE_CODE_DISABLE_MEMORY_STREAM_LIST &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_memory_stream_list", !0)
  ) {
    let r = `multi-store-sync[${e.mountName}]`;
    try {
      let exportMetadata = await backend.exportMetadata(),
        h = await pullStoreView({
          source: exportMetadata,
          maxLineLength: MAX_BATCH_BYTES,
          maxEntries: MAX_STORE_ENTRIES,
        });
      if (h.ok) {
        let y = (e.streamListSuccessStreak ?? 0) + 1;
        if (y >= MAX_PULL_RETRIES)
          ((e.streamListSuccessStreak = 0),
            (e.streamListFailureStreak = Math.max(0, (e.streamListFailureStreak ?? 0) - 1)));
        else e.streamListSuccessStreak = y;
        if (qt(e)) logFeatureOk("team_memory_multistore_stream_list");
        return h.entries.map((entry) => ({ ...entry, path: Pk(entry.path) }));
      }
      if (qt(e)) logFeatureSad("team_memory_multistore_stream_list", h.reason);
      if ((noteStreamListFailure(e), h.reason === "view_not_honored")) e.streamListUnsupported = !0;
      logForDebugging(`${r}: metadata stream incomplete (${h.reason}) \u2014 using paged list`, {
        level: "debug",
      });
    } catch (error) {
      let h = noteStreamListFailure(e);
      if (error instanceof MemoryUnavailableError) {
        if (qt(e))
          logFeatureSad(
            "team_memory_multistore_stream_list",
            error.retryAfterMs !== void 0 ? "backed_off" : "unavailable",
          );
        let y = error.retryAfterMs !== void 0;
        if (h < MAX_RETRIES && (e.pulled || y)) throw error;
      } else {
        let y =
          error instanceof MemoryNotFoundError
            ? "not_found"
            : error instanceof MemoryPermanentError
              ? error.reason
              : "error";
        if (error instanceof MemoryNotFoundError) e.streamListUnsupported = !0;
        if (qt(e)) logFeatureSad("team_memory_multistore_stream_list", y);
      }
      logForDebugging(`${r}: metadata stream unavailable (${errorMessage(error)}) \u2014 using paged list`, {
        level: "debug",
      });
    }
  }
  return backend.list();
}
//@ chunk-s61vbvea.js:126054-126169 placement
function isOrgMemoryDecisionClosed(e) {
  if ((e.source ?? "env") !== "discovery") return !1;
  let n = getOrgMemoryDecision();
  return n.state === "parked" || n.state === "ended";
}
//@ chunk-s61vbvea.js:126169-126456 placement
function shouldMirrorAllUncovered(e) {
  if ((e.source ?? "env") !== "discovery" || !kAt()) return !1;
  if (N2(e.backend.partitionId) !== void 0) return (e.notices.rearmMirrorAllUncovered(), !1);
  if (!getDecisionStores().some((r) => N2(r.path) !== void 0))
    return (e.notices.emitMirrorAllUncoveredOnce(), !1);
  return (e.notices.rearmMirrorAllUncovered(), !0);
}
//@ chunk-s61vbvea.js:126456-127011 placement
async function rejoinTeamMemory(e, n) {
  let r = await pullStore(e, n);
  if (!e.pulled) e.lastPersistedBasisBody = void 0;
  if (!r.success && Nr(e.basisUnusable) && !e.notices.rejoinOffNoticed.has(e.mountDir))
    (e.notices.rejoinOffNoticed.add(e.mountDir), noticeStoreSyncOff(e));
  else if (r.success && e.pulled && e.notices.rejoinOffNoticed.delete(e.mountDir))
    formatStoreBackOnNotice(e, Ph(e), !0);
  let s = e.rejoinOff ?? null;
  if (s !== null && e.pulled && !Nr(e.basisUnusable))
    ((e.rejoinOff = null),
      logEvent("tengu_team_mem_rejoin", {
        scope: fromEnum(e.scope),
        reason: fromEnum(s.reason),
        off_ms: Date.now() - s.sinceMs,
        pull_attempts: s.pullAttempts,
        held_count: e.heldLocal?.size ?? 0,
      }));
  return r;
}
/**
 * 拉取一个记忆库：检查挂载目录、处理 404、按基线合并本地文件
 */
//@ chunk-s61vbvea.js:127011-135467 placement
async function pullStore(e, n) {
  if (await isMountEscaped(e))
    return {
      success: !1,
      entriesListed: 0,
      filesWritten: 0,
      filesDeleted: 0,
      error: "mount dir canonicity check failed (fail closed)",
    };
  if (isOrgMemoryDecisionClosed(e)) return NOOP_RESULT;
  if (shouldMirrorAllUncovered(e)) return NOOP_RESULT;
  let r = await checkPushManifestGate(e, n),
    s = r === "matched";
  if (e.suppressedReason !== null) return SKIPPED_RESULT;
  let h =
      (s || r === "torn") && !e.pulled && e.remoteHashes.size === 0 && (e.invalidatedBasis ?? null) === null
        ? await loadPersistedBasis(e, n)
        : null,
    y = h?.ok === !1 ? h.reason : null;
  if (h !== null && e.basisUnusable !== null && !(e.removedEmptyReceipt === !0 && y === "absent"))
    e.basisUnusable = y ?? void 0;
  if (y === "empty_store") e.emptyReceiptOnDisk = !0;
  else if (h !== null && y !== "read_error") e.emptyReceiptOnDisk = !1;
  let S = h?.ok === !0 ? h.basis : null,
    basisUnusable = e.basisUnusable,
    R = Nr(basisUnusable);
  if (R && basisUnusable) {
    if (!e.rejoinOff) e.rejoinOff = { sinceMs: Date.now(), reason: basisUnusable, pullAttempts: 0 };
    ((e.rejoinOff.reason = basisUnusable), e.rejoinOff.pullAttempts++);
  }
  let x = S === null ? await pushStore(e, s, n) : "not-attempted";
  if (x !== "not-attempted" && x !== "fell-back") return ((e.downloadsDeferred = 0), x);
  let P = x === "fell-back",
    j,
    G = null;
  try {
    j = await listStoreStream(e);
  } catch (error) {
    let ze = noteServerBackoff(e, error),
      gt = (e.invalidatedBasis ?? S?.entries ?? e.remoteHashes).size === 0;
    if (error instanceof MemoryNotFoundError && gt && e.scope !== "account") {
      if (((j = []), R)) G = error;
    } else {
      if (error instanceof MemoryNotFoundError)
        logForDebugging(
          `multi-store-sync[${e.mountName}]: list 404 on a previously-synced store or the account mirror \u2014 skipping pull (no reap)`,
          { level: "warn" },
        );
      if (P && qt(e)) logFeatureBad("team_memory_multistore_bulk_inflate", "fallback_failed");
      return {
        success: !1,
        entriesListed: 0,
        filesWritten: 0,
        filesDeleted: 0,
        permanent: error instanceof MemoryPermanentError ? error.reason : void 0,
        ...(error instanceof MemoryNotFoundError && { cause: "not_found" }),
        error: errorMessage(error),
        ...(error instanceof MemoryNotFoundError && { notFound: !0 }),
        ...(ze && { backedOff: !0, cause: "backed_off" }),
      };
    }
  }
  let L = new Map();
  for (let Ae of j) L.set(Ae.id, Ae.path);
  let q = new Map();
  for (let Ae of j) if (L.get(Ae.id) === Ae.path) q.set(Ae.path, Ae);
  ((j = [...q.values()]),
    (j = j.filter(
      (Ae) => isMemoryDocumentKey(Ae.path) && !(e.excludeKey && e.excludeKey(Ae.path.replace(/^\/+/, ""))),
    )));
  let Q = new Map();
  for (let Ae of j) Q.set(Ae.path, { id: Ae.id, sha256: Ae.sha256 });
  let Z = await collectLocalMemoryEntries(
      e.mountDir,
      e.excludeKey,
      n,
      e.v5MemoryBase,
      e.manifestSeenThisSession,
      e.walkHashes,
      void 0,
    ),
    ee = e.invalidatedBasis ?? null,
    ae = ee ?? S?.entries ?? e.remoteHashes;
  if (!Z.diskTrusted && (R ? !(await isMountDirEffectivelyEmpty(e, Z)) : ae.size > 0 && !Z.rootMissing))
    return (
      logForDebugging(
        `multi-store-sync[${e.mountName}]: mount dir walk untrusted with a non-empty basis or a pending rejoin \u2014 soft-failing pull`,
        { level: "warn" },
      ),
      {
        success: !1,
        entriesListed: j.length,
        filesWritten: 0,
        filesDeleted: 0,
        cause: "walk_untrusted",
        error: "mount dir walk untrusted with a non-empty basis or a pending rejoin (soft fail)",
        ...(!e.pulled && { permanent: "mount_dir_unreadable" }),
      }
    );
  if (G !== null && (await qv(e, Z.entries, Q, n))) {
    if (
      (logForDebugging(
        `multi-store-sync[${e.mountName}]: list 404 while sync is off with local files to hold, staying off`,
        { level: "warn" },
      ),
      P)
    )
      logFeatureBad("team_memory_multistore_bulk_inflate", "fallback_failed");
    return {
      success: !1,
      entriesListed: 0,
      filesWritten: 0,
      filesDeleted: 0,
      cause: "not_found",
      error: errorMessage(G),
    };
  }
  let se = Ou(e),
    re = new Set(
      j
        .filter(
          (Ae) =>
            Ae.sha256 !== EMPTY_CONTENT_SHA256 &&
            Z.entries.get(Ae.path)?.sha256 === EMPTY_CONTENT_SHA256 &&
            ae.get(Ae.path)?.sha256 === Ae.sha256,
        )
        .map((Ae) => Ae.path),
    ),
    he = 0,
    filtered = j.filter((Ae) => {
      if (Z.entries.get(Ae.path)?.sha256 === Ae.sha256) return !1;
      if (e.scope === "account") return !0;
      if (re.has(Ae.path)) return !0;
      if ((ee !== null || Z.rootMissing) && !Z.diskPaths.has(Ae.path)) return !0;
      if (!se && Z.diskTrusted && !Z.diskPaths.has(Ae.path)) return !0;
      if (S?.entriesWereOnDisk === !1 && Z.diskTrusted && !Z.diskPaths.has(Ae.path)) {
        if (ae.get(Ae.path)?.sha256 === Ae.sha256) he++;
        return !0;
      }
      return ae.get(Ae.path)?.sha256 !== Ae.sha256;
    }),
    ce = Z.diskTrusted
      ? [...Z.diskPaths].filter((Ae) => !Q.has(Ae) && (ae.has(Ae) || e.scope === "account"))
      : [];
  for (let Ae of filtered) Q.delete(Ae.path);
  let we = 0,
    ie = 0,
    Ee = 0,
    Ie = 0,
    ke = 0,
    Me = !1,
    We = 0,
    nt = 0,
    Be,
    Re,
    Ne = new Map(),
    Je = [];
  if (filtered.length > 0)
    try {
      await removeEmptyStoreReceipt(e, n);
    } catch (error) {
      return {
        success: !1,
        entriesListed: j.length,
        filesWritten: 0,
        filesDeleted: 0,
        error: errorMessage(error),
      };
    }
  let lt = Dr()
    ? new Set(Z.skippedOversizedPaths.map((skippedOversizedPath) => skippedOversizedPath.path))
    : new Set();
  await runWithConcurrency(filtered, LOCAL_IO_CONCURRENCY, async (Ae) => {
    if (Me) {
      We++;
      return;
    }
    try {
      let read = await e.backend.read(Ae.id),
        gt = computeContentHash(read.content);
      if (gt !== read.sha256) ie++;
      if (!(ee !== null && Z.diskPaths.has(Ae.path)) && (await isLocallyEdited(e, Ae.path, n))) {
        (we++, Q.set(Ae.path, getEntryBaseline(e, ae, Z.diskPaths, Ae)));
        return;
      }
      if (re.has(Ae.path) && !(await Eu(e, Ae.path, n))) {
        (we++, Q.set(Ae.path, { id: Ae.id, sha256: Ae.sha256 }));
        return;
      }
      let Nt = Z.entries.get(Ae.path)?.sha256;
      if (Nt !== gt && (await writeLocalEntry(e, Ae.path, read.content, read.updatedAt, n)) === "dropped")
        return;
      let An = e.pullWritten.get(Ae.path)?.sha256;
      await recordPullWrite(e, Ae.path, gt, n);
      let ln = { id: Ae.id, sha256: gt };
      (Q.set(Ae.path, ln), Ne.set(Ae.path, ln));
      let yt = ae.get(Ae.path)?.sha256,
        At = lt.has(Ae.path),
        un = At || (Nt !== yt && (An === void 0 || Nt !== An)),
        rr = Dr() ? (e.heldLocal?.get(Ae.path) ?? S?.held.get(Ae.path)) : void 0,
        br = rr !== void 0 && (Nt !== void 0 || At) && Nt !== gt && un;
      if (Nt === EMPTY_CONTENT_SHA256) {
        if (yt !== EMPTY_CONTENT_SHA256 && gt !== EMPTY_CONTENT_SHA256) Ee++;
      } else if (
        e.scope !== "account" &&
        (br || ((yt !== void 0 || ku(e)) && Z.diskPaths.has(Ae.path) && un))
      ) {
        let pn = br && Nt === rr;
        (await queueConflictNotice(
          e,
          Ae.path,
          pn ? buildLocalCopyReplacedNotice(Ae.path) : buildWriteConflictNotice(Ae.path, yt === repeat),
        ),
          logEvent("tengu_team_mem_conflict_recovered", {
            scope: fromEnum(e.scope),
            op: fromEnum("pull"),
            held: pn,
          }));
      }
    } catch (error) {
      if (error instanceof MemoryNotFoundError) {
        let gt = e.heldLocal?.get(Ae.path) ?? S?.held.get(Ae.path),
          Nt = (R && !e.pullWritten.has(Ae.path)) || (gt !== void 0 && gt === Z.entries.get(Ae.path)?.sha256);
        if (Z.diskPaths.has(Ae.path) && !Nt) Q.set(Ae.path, getEntryBaseline(e, ae, Z.diskPaths, Ae));
        return;
      }
      if (error instanceof PathTraversalError) {
        logForDebugging(`multi-store-sync[${e.mountName}]: refusing to write escaping path ${Ae.path}`, {
          level: "warn",
        });
        return;
      }
      if (error instanceof MemoryPermanentError) Re ??= error.reason;
      if (noteServerBackoff(e, error)) ((Me = !0), nt++);
      (Ie++, (Be ??= Ea(error)));
    }
  });
  for (let Ae of ce)
    try {
      let ze = Z.entries.get(Ae)?.sha256;
      if (
        e.scope !== "account" &&
        (ze === void 0 ||
          (ze !== ae.get(Ae)?.sha256 && !(ze === EMPTY_CONTENT_SHA256 && (await Eu(e, Ae, n)))))
      ) {
        let Nt = ze !== void 0 && e.backend.mode !== "ro";
        (e.refusedWrites?.delete(Ae),
          await queueConflictNotice(
            e,
            Ae,
            `The memory file ${Ln(Ae)} was deleted from shared memory by another session, but your local copy has changes that were never saved there. ` +
              (Nt
                ? "Your local copy was kept and will be re-saved to shared memory on the next sync unless it contains a detected secret. "
                : "Your local copy was kept, but it cannot be re-saved to shared memory automatically (over the sync size limit or the store is read-only) \u2014 save its contents elsewhere or trim it if you want it persisted. ") +
              "If the deletion was intended, delete the file.",
          ),
          logForDebugging(
            `multi-store-sync[${e.mountName}]: preserving locally-modified ${Ae} despite remote delete`,
            { level: "info" },
          ));
        continue;
      }
      if (await isLocallyEdited(e, Ae, n)) {
        we++;
        continue;
      }
      (await deleteLocalEntry(e, Ae, n), Je.push(Ae));
    } catch (error) {
      (ke++, (Be ??= Ea(error)));
    }
  if (Ee > 0) noticeEmptyFilesRestored(e, Ee);
  if (ie > 0)
    logForDebugging(
      `multi-store-sync[${e.mountName}]: ${ie} read body/bodies did not match their declared sha256; recorded under the computed sha`,
      { level: "warn" },
    );
  if (Ie + ke + We > 0) {
    if (
      (logForDebugging(
        `multi-store-sync[${e.mountName}]: pull failed: ${Ie} of ${filtered.length} download(s) and ${ke} of ${ce.length} local removal(s) failed${We > 0 ? `, ${We} download(s) not started after the server asked sync to wait (waiting at least ${Math.max(0, Math.ceil(((e.serverBackoffUntilMs ?? 0) - Date.now()) / 1000))}s)` : ""}, first error: ${Be}; the sync record is unchanged for those files and a later sync retries them${e.pulled ? "" : "; nothing is uploaded from this store until a pull succeeds"}`,
        { level: "warn" },
      ),
      P && qt(e))
    )
      logFeatureBad("team_memory_multistore_bulk_inflate", "fallback_failed");
    if (e.pulled && (Ne.size > 0 || Je.length > 0)) {
      for (let [Ae, ze] of Ne) e.remoteHashes.set(Ae, ze);
      for (let Ae of Je) e.remoteHashes.delete(Ae);
      await writeSyncBasis(e, n);
    }
    return (
      (e.downloadsDeferred = We + nt),
      {
        success: !1,
        entriesListed: j.length,
        shaMismatches: ie,
        emptyRestored: Ee,
        filesWritten: Ne.size,
        filesDeleted: Je.length,
        fetchesFailed: Ie,
        permanent: Re,
        error: Be,
        backedOff: Me || void 0,
      }
    );
  }
  if (
    ((e.downloadsDeferred = 0),
    await handleUnusableBasis(e, Z.entries, Q, n, { walkTrusted: Z.diskTrusted, hold: R }),
    e.notices.rejoinOffNoticed.has(e.mountDir))
  ) {
    let Ae = S?.held ?? new Map();
    await runWithConcurrency([...Ae.keys()], LOCAL_IO_CONCURRENCY, async (ze) => {
      if (await isLocallyEdited(e, ze, n)) Ae.delete(ze);
    });
  }
  if (
    ((e.remoteHashes = Q),
    (e.pulled = !0),
    (e.invalidatedBasis = null),
    (e.basisLoaded = !0),
    S !== null && S.held.size > 0)
  ) {
    if (((e.heldLocal = S.held), !e.notices.rejoinOffNoticed.has(e.mountDir))) noticeHeldLocalFiles(e);
  }
  if (S !== null && S.deletes.size > 0) {
    let Ae = (e.pendingDeletes ??= new Map());
    for (let [ze, gt] of S.deletes) if (Q.has(ze)) Ae.set(ze, gt);
  }
  if (
    (await writeSyncManifest(e, { expectPresent: s }, n).catch((Ae) =>
      logForDebugging(`multi-store-sync[${e.mountName}]: manifest write failed: ${errorMessage(Ae)}`, {
        level: "warn",
      }),
    ),
    await writeSyncBasis(e, n),
    we > 0)
  ) {
    if (qt(e)) logFeatureOk("team_memory_multistore_concurrent_write_preserved");
    logForDebugging(`multi-store-sync[${e.mountName}]: preserved ${we} concurrent local write(s)`, {
      level: "info",
    });
  }
  return {
    success: !0,
    entriesListed: j.length,
    shaMismatches: ie,
    emptyRestored: Ee,
    filesWritten: Ne.size,
    filesDeleted: Je.length,
    filesSkippedConcurrent: we,
    entriesWithoutRef: count(j, (Ae) => !Q.has(Ae.path)),
    unmarkedReceiptRefetched: he,
  };
}
/**
 * 推送本地记忆变更到记忆库（并发写保留、批量膨胀保护）
 */
//@ chunk-s61vbvea.js:135467-139307 placement
async function pushStore(e, n, r) {
  if (e.pulled || e.remoteHashes.size > 0 || (e.invalidatedBasis ?? null) !== null) return "not-attempted";
  let backend = e.backend;
  if (!backend.exportAll) return "not-attempted";
  if (env.CLAUDE_CODE_DISABLE_MEMORY_BULK_INFLATE) return "not-attempted";
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_memory_bulk_inflate", !0)) return "not-attempted";
  if (e.rejoinWalkUntrusted === !0 && Nr(e.basisUnusable)) return "not-attempted";
  let h = `multi-store-sync[${e.mountName}]`,
    y;
  try {
    y = await backend.exportAll();
  } catch (error) {
    let we = error instanceof MemoryNotFoundError ? "not_found" : "http_error";
    if (error instanceof MemoryNotFoundError) e.streamListUnsupported = !0;
    if (qt(e)) logFeatureSad("team_memory_multistore_bulk_inflate", we);
    return (
      logForDebugging(`${h}: bulk inflate unavailable (${errorMessage(error)}) \u2014 using per-file pull`, {
        level: "debug",
      }),
      "fell-back"
    );
  }
  let S = new Map(),
    w = new Map(),
    R = new Map(),
    x = new Set(),
    P = new Set(),
    j = new Set(),
    G = new Set(),
    L = 0,
    q = 0,
    Q = new Map(),
    Z = new Map(),
    ee = 0,
    ae = await pullStoreExport({
      source: y,
      maxConcurrentWrites: LOCAL_IO_CONCURRENCY,
      maxLineLength: MAX_BATCH_BYTES,
      maxLines: MAX_STORE_ENTRIES * 2 + 2,
      deadlineMs: SYNC_INTERVAL_MS,
      handleMemory: async (ce) => {
        let we = Pk(ce.path),
          ie = isMemoryDocumentKey(we) && !(e.excludeKey && e.excludeKey(we.replace(/^\/+/, "")));
        if ((w.set(ce.memoryId, ie ? we : null), !ie)) return;
        let Ee = computeContentHash(ce.content);
        if (Ee !== ce.contentSha256) L++;
        let Ie = R.get(we);
        if (Ie !== void 0) {
          if (Ie.id !== ce.memoryId || Ie.sha256 !== Ee) x.add(we);
          let Me = Z.get(we);
          if (Me === void 0) ((Me = new Set([Ie.sha256])), Z.set(we, Me));
          Me.add(Ee);
          let We = Q.get(we);
          if (We === void 0) ((We = new Set([Ie.id])), Q.set(we, We));
          (We.delete(ce.memoryId), We.add(ce.memoryId));
        }
        R.set(we, { id: ce.memoryId, sha256: Ee });
        let ke = Ee;
        try {
          if (await isLocallyEdited(e, we, r))
            (ee++, j.add(we), (ke = e.pullWritten.get(we)?.sha256 ?? repeat));
          else if (!(await isLocalContentEqual(e, we, ce.content, r))) {
            if (Ee !== EMPTY_CONTENT_SHA256 && (await Eu(e, we, r))) q++;
            if ((await writeLocalEntry(e, we, ce.content, ce.updatedAt, r)) === "dropped") return;
            (await recordPullWrite(e, we, Ee, r), P.add(we));
          }
        } catch (error) {
          if (error instanceof PathTraversalError) {
            logForDebugging(`${h}: refusing to write escaping path ${we}`, { level: "warn" });
            return;
          }
          throw error;
        }
        S.set(we, { id: ce.memoryId, sha256: ke });
      },
    }),
    se = async (ce) => {
      try {
        let we = await resolveMountPath(e, ce);
        if ((await statLocalEntry(r, e, we)).size > MAX_MEMORY_BYTES) return !0;
        let Ee = computeContentHash(await readLocalEntry(r, e, we)),
          Ie = Z.get(ce);
        if (Ie !== void 0) return !Ie.has(Ee);
        return R.get(ce)?.sha256 !== Ee;
      } catch (error) {
        return getErrnoCode(error) !== "ENOENT";
      }
    },
    re = !1;
  for (let [ce, we] of S)
    if (w.get(we.id) !== ce || x.has(ce)) {
      if ((P.delete(ce), await se(ce))) {
        let ie = Q.get(ce),
          Ee = ie && [...ie].findLast((Ie) => w.get(Ie) === ce);
        if (Ee !== void 0) S.set(ce, { id: Ee, sha256: repeat });
        else (S.delete(ce), G.add(ce));
        continue;
      }
      S.delete(ce);
      try {
        await deleteLocalEntry(e, ce, r);
      } catch (error) {
        (logForDebugging(`${h}: failed to remove superseded ${ce} (${errorMessage(error)})`, {
          level: "warn",
        }),
          (re = !0));
      }
    }
  let size = P.size;
  if (q > 0) noticeEmptyFilesRestored(e, q);
  if (!ae.ok || re) {
    let ce = ae.ok ? "dedupe_unlink_failed" : ae.reason;
    if (qt(e)) logFeatureSad("team_memory_multistore_bulk_inflate", ce);
    return (
      logForDebugging(
        `${h}: bulk inflate incomplete (${ce}) after ${size} file(s) \u2014 using per-file pull`,
        { level: "warn" },
      ),
      "fell-back"
    );
  }
  let Se = count([...w.values()], (ce) => ce !== null);
  if (e.basisUnusable !== void 0 && e.basisUnusable !== null) {
    let ce = null;
    try {
      ce = await collectLocalMemoryEntries(
        e.mountDir,
        e.excludeKey,
        r,
        e.v5MemoryBase,
        e.manifestSeenThisSession,
        e.walkHashes,
        void 0,
      );
    } catch (error) {
      logForDebugging(`${h}: basis_unusable walk failed: ${errorMessage(error)}`, { level: "warn" });
    }
    let we = Nr(e.basisUnusable);
    if (we && (ce === null || (!ce.diskTrusted && !(await isMountDirEffectivelyEmpty(e, ce)))))
      return (
        logFeatureSad("team_memory_multistore_bulk_inflate", "walk_untrusted"),
        (e.rejoinWalkUntrusted = !0),
        "fell-back"
      );
    if (ce === null) e.basisUnusable = null;
    else await handleUnusableBasis(e, ce.entries, S, r, { walkTrusted: ce.diskTrusted, hold: we });
  }
  if (
    ((e.remoteHashes = S),
    (e.pulled = !0),
    await writeSyncManifest(e, { expectPresent: n }, r).catch((ce) =>
      logForDebugging(`${h}: manifest write failed: ${errorMessage(ce)}`, { level: "warn" }),
    ),
    await writeSyncBasis(e, r),
    qt(e))
  )
    logFeatureOk("team_memory_multistore_bulk_inflate");
  if (qt(e) && [...j].some((ce) => S.has(ce) || G.has(ce)))
    logFeatureOk("team_memory_multistore_concurrent_write_preserved");
  return (
    logForDebugging(
      `${h}: bulk inflated ${size} file(s) from ${ae.memoryLines} exported memory line(s)` +
        (L ? `, ${L} declared-sha mismatch(es)` : ""),
      { level: "info" },
    ),
    {
      success: !0,
      entriesListed: Se,
      shaMismatches: L,
      emptyRestored: q,
      filesWritten: size,
      filesDeleted: 0,
      filesSkippedConcurrent: ee,
      entriesWithoutRef: Math.max(0, Se - S.size),
    }
  );
}
//@ chunk-s61vbvea.js:139307-139326 placement
var hC = 3,
  yC = 300000;
//@ chunk-s61vbvea.js:139326-139521 placement
function allowConflictRefetch(e, n) {
  let now = Date.now(),
    s = (e.conflictRefetches ??= new Map()),
    h = s.get(n);
  if (!h || now - h.windowStartMs >= yC) return (s.set(n, { count: 1, windowStartMs: now }), !0);
  if (h.count >= hC) return !1;
  return (h.count++, !0);
}

export {
  runWithConcurrency,
  qt,
  isOrgMemoryDecisionClosed,
  checkPushManifestGate,
  Ea,
  allowConflictRefetch,
  shouldMirrorAllUncovered,
  lC,
  readoptMountDir,
  checkForeignPartition,
  getMountDirOccupancy,
  enumerateMountDir,
  checkUnmanifestedMountDir,
  rejoinTeamMemory,
};
