/**
 * services/memorySync/syncManifest.ts
 *
 * 记忆同步 manifest 与基线（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (19)
 * attribution: placement 19
 */
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  link,
  unlink,
  unlink as unlink_2,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
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
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { getTeamMemPath } from "../../memdir/teamMemPaths.js";
import { memoryStoreMountRoot } from "./mountRoots.js";
import { isExcludedMemoryKey, isMemoryDocumentKey } from "../memoryStore/memoryKeys.js";
import { zir } from "../orgMemory/storeErrors.js";
import { u, T, o, A, xE, E, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { qt, runWithConcurrency } from "./storeReconcile.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  errorMessage,
  isENOENT,
} from "../../utils/errors.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { storageKeyForMountPath } from "../../memdir/teamMemPrompts.js";
import { MAX_STORE_ENTRIES } from "../orgMemory/storeApi.js";
import { AS } from "../../utils/commitAttribution.js";
import { logForDebugging } from "../../utils/debug.js";
import { safeParseJSON } from "../../utils/json.js";
import { Dr, LOCAL_IO_CONCURRENCY, EMPTY_CONTENT_SHA256 } from "./syncConfig.js";
import { formatStoreBackOnNotice } from "./syncNotices.js";
import { isLocallyEdited } from "./mountWalk.js";

//@ chunk-s61vbvea.js:98304-98967 placement
function createMultiStoreState(e, n, r, s = Date.now()) {
  if (e.length !== n.length) throw Error("createMultiStoreState: length mismatch");
  return {
    stores: e.map((h, y) => {
      let S = n[y],
        w = typeof S === "string" ? { mount: S, scope: "team", source: "env" } : S,
        R = w.scope === "user";
      return {
        backend: h,
        mountName: w.mount,
        notices: r,
        scope: w.scope,
        source: w.source,
        writeDir: w.writeDir ?? "",
        firstWriteEmitted: !1,
        mountDir: getTeamMemPath(w),
        v5MemoryBase: memoryStoreMountRoot(w.scope, getTeamMemPath(w)),
        excludeKey: R ? isExcludedMemoryKey : null,
        remoteHashes: new Map(),
        createdAtMs: s,
        pullWritten: new Map(),
        pullDropped: new Set(),
        pulled: !1,
        suppressedReason: null,
        suppressedUntilMs: null,
        consecutivePermanentFailures: 0,
        invalidatedBasis: null,
        conflictRefetches: new Map(),
        walkHashes: new Map(),
      };
    }),
    inFlight: null,
  };
}
//@ chunk-s61vbvea.js:98967-99034 placement
var Jn = zir,
  eh = 1,
  th = (e) => u({ v: T(e), partition: o() }),
  jv = DoctorLazy(() => th(eh));
//@ chunk-s61vbvea.js:99034-99980 placement
async function writeSyncManifest(e, n, r) {
  let s = await readSyncManifest(e.mountDir, r, e.v5MemoryBase);
  if (s.state === "present" && s.manifest.partition === e.backend.partitionId)
    return ((e.manifestSeenThisSession = !0), !1);
  if (n?.expectPresent) {
    if (qt(e)) logFeatureSad("team_memory_multistore_conflict", "manifest_changed_mid_pull");
    return !1;
  }
  if (s.state === "present" && e.scope !== "user") failForeignManifest(e);
  let h = jsonStringify({ v: eh, partition: e.backend.partitionId }),
    y = Gv(r, e),
    S = r !== void 0 && y !== void 0 ? { storageV5: r, manifestKey: y } : void 0;
  if (S === void 0) await mkdir_2(e.mountDir, { recursive: !0 });
  if (s.state === "absent" && e.scope !== "user") {
    let w = await createSyncManifest(e, h, S?.manifestKey, S?.storageV5);
    return ((e.manifestSeenThisSession = !0), w);
  }
  if (S !== void 0) {
    let write = await S.storageV5.write(S.manifestKey, h, {
      publishDiscipline: "atomic",
      mode: 438 & ~process.umask(),
    });
    if (!write.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `manifest write failed: ${formatStorageError(write.error)}`,
        "memory-sync manifest write failed",
      );
    return ((e.manifestSeenThisSession = !0), !0);
  }
  return (await writeFileAtomic(join_5(e.mountDir, Jn), h), (e.manifestSeenThisSession = !0), !0);
}
//@ chunk-s61vbvea.js:99980-100060 placement
function Iu(e, n, r, s) {
  return isStorageV5Enabled() && e !== void 0 && n !== void 0
    ? storageKeyForMountPath(n, r, join_5(r, s))
    : void 0;
}
//@ chunk-s61vbvea.js:100060-100119 placement
function Gv(e, n) {
  return Iu(e, n.v5MemoryBase, n.mountDir, Jn);
}
//@ chunk-s61vbvea.js:100119-100178 placement
function Du(e, n) {
  return Iu(e, n.v5MemoryBase, n.mountDir, BASIS_FILE_NAME);
}
//@ chunk-s61vbvea.js:100178-100364 placement
function failForeignManifest(e) {
  if (qt(e)) logFeatureSad("team_memory_multistore_conflict", "manifest_foreign_at_write");
  throw Error("mount dir holds another store's .memory-sync manifest at write time (fail closed)");
}
//@ chunk-s61vbvea.js:100364-101195 placement
async function createSyncManifest(e, n, r, s) {
  if (s !== void 0 && r !== void 0) {
    let write = await s.write(r, n, { precondition: { type: "ifAbsent" }, mode: 438 & ~process.umask() });
    if (write.ok) return !0;
    if (write.error.code !== "AlreadyExists")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `manifest create failed: ${formatStorageError(write.error)}`,
        "memory-sync manifest create failed",
      );
    let w = await readSyncManifest(e.mountDir, s, e.v5MemoryBase);
    if (w.state === "present" && w.manifest.partition === e.backend.partitionId) return !1;
    failForeignManifest(e);
  }
  let h = join_5(e.mountDir, Jn),
    y = join_5(e.mountDir, `${Jn}.${randomUUID()}.stage`);
  try {
    await writeFile(y, n);
    try {
      return (await link(y, h), !0);
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST") {
        let R = await readSyncManifest(e.mountDir);
        if (R.state === "present" && R.manifest.partition === e.backend.partitionId) return !1;
        failForeignManifest(e);
      }
    }
    let S = await readSyncManifest(e.mountDir);
    if (S.state === "present") {
      if (S.manifest.partition === e.backend.partitionId) return !1;
      failForeignManifest(e);
    }
    return (await writeFileAtomic(h, n), !0);
  } finally {
    await unlink(y).catch(() => {});
  }
}
//@ chunk-s61vbvea.js:101195-101725 placement
async function readSyncManifest(e, n, r) {
  let s;
  try {
    let S = join_5(e, Jn);
    if (!(await lstat(S)).isFile()) return { state: "torn" };
    let w = Iu(n, r, e, Jn);
    if (n !== void 0 && w !== void 0) {
      let read = await n.read([w]);
      if (!read.ok) return { state: "torn" };
      let x = read.value.items[0];
      if (!x.found) return { state: "absent" };
      s = Buffer.from(x.value).toString("utf8");
    } else s = await readFile(S, "utf8");
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? { state: "absent" } : { state: "torn" };
  }
  let h;
  try {
    h = jsonParse(s);
  } catch {
    return { state: "torn" };
  }
  let safeParse = jv().safeParse(h);
  if (!safeParse.success) return { state: "torn" };
  return { state: "present", manifest: safeParse.data };
}
//@ chunk-s61vbvea.js:101725-101827 placement
async function isOwnManifest(e, n, r, s) {
  let h = await readSyncManifest(e, r, s);
  return h.state === "present" && h.manifest.partition === n;
}
//@ chunk-s61vbvea.js:101827-102050 placement
var BASIS_FILE_NAME = `${Jn}-basis`,
  BASIS_VERSION = 1,
  MAX_BASIS_BYTES = MAX_STORE_ENTRIES * 512,
  syncBasisSchema = DoctorLazy(() =>
    th(BASIS_VERSION).extend({
      entries: A(xE([o(), o(), o()])),
      deletes: A(xE([o(), E(), E()])),
      held: oe().optional(),
      entriesWereOnDisk: oe().optional(),
    }),
  ),
  basisEntriesSchema = DoctorLazy(() => A(xE([o(), o().regex(AS)])).max(MAX_STORE_ENTRIES));
//@ chunk-s61vbvea.js:102050-104337 placement
async function loadPersistedBasis(e, n) {
  if (e.basisLoaded) return null;
  let r;
  try {
    let j = join_5(e.mountDir, BASIS_FILE_NAME);
    if (!(await lstat(j)).isFile()) return { ok: !1, reason: "not_regular_file" };
    let G = Du(n, e);
    if (n !== void 0 && G !== void 0) {
      let read = await n.read([{ key: G, offset: 0, length: MAX_BASIS_BYTES + 1 }]);
      if (!read.ok) return { ok: !1, reason: "read_error" };
      if (!read.value.items[0].found) return { ok: !1, reason: "absent" };
      let q = read.value.items[0].value;
      if (q.byteLength > MAX_BASIS_BYTES)
        return (
          logForDebugging(`multi-store-sync[${e.mountName}]: persisted basis exceeds size cap, ignoring`, {
            level: "warn",
          }),
          { ok: !1, reason: "over_cap" }
        );
      r = Buffer.from(q).toString("utf8");
    } else {
      let L = await open_3(j, "r");
      try {
        let { size: size } = await L.stat(),
          alloc = Buffer.alloc(Math.min(size, MAX_BASIS_BYTES) + 1),
          { bytesRead: bytesRead } = await L.read(alloc, 0, alloc.length, 0);
        if (bytesRead > MAX_BASIS_BYTES)
          return (
            logForDebugging(`multi-store-sync[${e.mountName}]: persisted basis exceeds size cap, ignoring`, {
              level: "warn",
            }),
            { ok: !1, reason: "over_cap" }
          );
        r = alloc.toString("utf8", 0, bytesRead);
      } finally {
        await L.close();
      }
    }
  } catch (error) {
    return { ok: !1, reason: getErrnoCode(error) === "ENOENT" ? "absent" : "read_error" };
  }
  let safeParse = syncBasisSchema().safeParse(safeParseJSON(r, !1));
  if (!safeParse.success) return { ok: !1, reason: "parse_failed" };
  if (safeParse.data.partition !== e.backend.partitionId) return { ok: !1, reason: "partition_mismatch" };
  let h = [];
  if (Dr() && safeParse.data.held !== void 0) {
    let safeParse_2 = basisEntriesSchema().safeParse(safeParse.data.held);
    if (!safeParse_2.success) return { ok: !1, reason: "parse_failed" };
    h = safeParse_2.data;
  }
  let y =
    safeParse.data.held !== void 0 &&
    !(Array.isArray(safeParse.data.held) && safeParse.data.held.length === 0);
  if (safeParse.data.entries.length === 0 && !y) return { ok: !1, reason: "empty_store" };
  let S = new Map();
  for (let [j, G, L] of safeParse.data.entries)
    if (isMemoryDocumentKey(j) && !(e.excludeKey && e.excludeKey(j.replace(/^\/+/, ""))))
      S.set(j, { id: G, sha256: L });
  let w = new Map();
  for (let [j, G] of h)
    if (
      j.startsWith("/") &&
      !j.includes("//") &&
      isMemoryDocumentKey(j) &&
      !(e.excludeKey && e.excludeKey(j.slice(1))) &&
      !S.has(j)
    )
      w.set(j, G);
  if (S.size === 0 && (w.size === 0 || safeParse.data.entries.length > 0))
    return { ok: !1, reason: "zero_entries" };
  let R = new Map(),
    now = Date.now(),
    P = safeParse.data.entriesWereOnDisk === !0;
  for (let [j, , G] of P ? safeParse.data.deletes : [])
    if (S.has(j)) R.set(j, { firstMissingAtMs: now, missingWalks: Math.max(0, Math.min(G, 1)) });
  return (
    (e.lastPersistedBasisBody = r),
    logForDebugging(
      `multi-store-sync[${e.mountName}]: loaded persisted basis (${S.size} entries, ${R.size} pending delete(s)${P ? "" : ", no entriesWereOnDisk mark, so its pending deletes are ignored and files missing from disk are downloaded again"})`,
      { level: "debug" },
    ),
    { ok: !0, basis: { entries: S, deletes: R, held: w, entriesWereOnDisk: P } }
  );
}
/**
 * 同步基线不可用时：找出只在本地的文件（按需暂扣并提示库已恢复），并记录基线不可用报告。
 */
//@ chunk-s61vbvea.js:104337-104822 placement
async function handleUnusableBasis(e, n, r, s, { walkTrusted: walkTrusted, hold: hold }) {
  let basisUnusable = e.basisUnusable;
  if (basisUnusable === void 0 || basisUnusable === null) return;
  e.basisUnusable = null;
  let w = (e.heldLocal ??= new Map()),
    R = new Set();
  for (let [P, j] of await findLocalOnlyFiles(e, n, r, s)) if ((R.add(P), hold)) w.set(P, j.sha256);
  let x = e.notices.rejoinOffNoticed.has(e.mountDir);
  if (x || (hold && w.size > 0)) formatStoreBackOnNotice(e, hold ? [...w.keys()].sort() : [], x);
  if ((e.notices.rejoinOffNoticed.delete(e.mountDir), !walkTrusted)) return;
  e.basisUnusableReport = {
    reason: basisUnusable,
    localOnly: R,
    held: hold ? w.size : 0,
    uploaded: 0,
    uploadFailed: 0,
    emitted: !1,
  };
}
//@ chunk-s61vbvea.js:104822-104966 placement
async function findLocalOnlyFiles(e, n, r, s) {
  let h = listUnpulledCandidates(e, n, r),
    y = new Set();
  return (
    await runWithConcurrency(h, LOCAL_IO_CONCURRENCY, async ([S]) => {
      if (await isLocallyEdited(e, S, s)) y.add(S);
    }),
    h.filter(([S]) => !y.has(S))
  );
}
//@ chunk-s61vbvea.js:104966-105054 placement
async function qv(e, n, r, s) {
  for (let [h] of listUnpulledCandidates(e, n, r)) if (!(await isLocallyEdited(e, h, s))) return !0;
  return !1;
}
//@ chunk-s61vbvea.js:105054-105181 placement
function listUnpulledCandidates(e, n, r) {
  return [...n].filter(
    ([s, h]) =>
      !r.has(s) &&
      h.sha256 !== EMPTY_CONTENT_SHA256 &&
      (e.pullWritten.get(s)?.sha256 ?? h.sha256) === h.sha256,
  );
}
//@ chunk-s61vbvea.js:105181-106010 placement
async function writeSyncBasis(e, n) {
  try {
    let r = Dr() ? [...(e.heldLocal ?? [])] : [],
      s = jsonStringify({
        v: BASIS_VERSION,
        partition: e.backend.partitionId,
        entries: [...e.remoteHashes].map(([y, S]) => [y, S.id, S.sha256]),
        deletes: [...(e.pendingDeletes ?? new Map())].map(([y, S]) => [
          y,
          S.firstMissingAtMs,
          S.missingWalks,
        ]),
        ...(r.length > 0 && { held: r }),
        entriesWereOnDisk: !0,
      });
    if (s === e.lastPersistedBasisBody) return;
    if (!(await isOwnManifest(e.mountDir, e.backend.partitionId, n, e.v5MemoryBase))) return;
    let h = Du(n, e);
    if (n !== void 0 && h !== void 0) {
      let write = await n.write(h, s, {
        parent: "mustExist",
        publishDiscipline: "atomic",
        mode: 438 & ~process.umask(),
      });
      if (!write.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `basis write failed: ${formatStorageError(write.error)}`,
          "memory-sync basis write failed",
        );
    } else await writeFileAtomic(join_5(e.mountDir, BASIS_FILE_NAME), s);
    ((e.lastPersistedBasisBody = s), (e.emptyReceiptOnDisk = !e.pulled));
  } catch (error) {
    logForDebugging(`multi-store-sync[${e.mountName}]: basis write failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-s61vbvea.js:106010-106068 placement
async function Us(e, n) {
  ((e.basisUnusable = null), await deleteSyncBasis(e, n));
}
//@ chunk-s61vbvea.js:106068-106312 placement
async function deleteSyncBasis(e, n) {
  e.lastPersistedBasisBody = void 0;
  let r = Du(n, e),
    s =
      n !== void 0 && r !== void 0
        ? await n.delete(r).then((h) => h.ok || h.error.code === "NotFound")
        : await unlink(join_5(e.mountDir, BASIS_FILE_NAME)).then(
            () => !0,
            (h) => isENOENT(h),
          );
  if (s) e.emptyReceiptOnDisk = !1;
  return s;
}

export {
  loadPersistedBasis,
  deleteSyncBasis,
  Jn,
  readSyncManifest,
  Us,
  qv,
  writeSyncBasis,
  handleUnusableBasis,
  writeSyncManifest,
  isOwnManifest,
  createMultiStoreState,
};
