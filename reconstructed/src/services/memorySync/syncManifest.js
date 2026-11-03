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
import { mkdir, writeFile, link, unlink, lstat, readFile, open } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getTeamMemPath } from "../../memdir/teamMemPaths.js";
import { memoryStoreMountRoot } from "./mountRoots.js";
import { isExcludedMemoryKey, isMemoryDocumentKey_2 } from "../memoryStore/memoryKeys.js";
import { MEMORY_SYNC_DIR } from "../orgMemory/storeErrors.js";
import { u, literal, string, array, tuple, E, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { isNonAccountStore, runWithConcurrency } from "./storeReconcile.js";
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
import { SHA256_HEX_RE } from "../../utils/commitAttribution.js";
import { logForDebugging } from "../../utils/debug.js";
import { safeParseJSON } from "../../utils/json.js";
import { isTypedKoalaEnabled, LOCAL_IO_CONCURRENCY, EMPTY_CONTENT_SHA256 } from "./syncConfig.js";
import { formatStoreBackOnNotice } from "./syncNotices.js";
import { isLocallyEdited } from "./mountWalk.js";

//@ chunk-s61vbvea.js:98304-98967 placement
function createMultiStoreState(storeClients, n, notices, createdAtMs = Date.now()) {
  if (storeClients.length !== n.length) throw Error("createMultiStoreState: length mismatch");
  return {
    stores: storeClients.map((backend, y) => {
      let S = n[y];
      let w =
        typeof S === "string"
          ? {
              mount: S,
              scope: "team",
              source: "env",
            }
          : S;
      let R = w.scope === "user";
      return {
        backend,
        mountName: w.mount,
        notices,
        scope: w.scope,
        source: w.source,
        writeDir: w.writeDir ?? "",
        firstWriteEmitted: false,
        mountDir: getTeamMemPath(w),
        v5MemoryBase: memoryStoreMountRoot(w.scope, getTeamMemPath(w)),
        excludeKey: R ? isExcludedMemoryKey : null,
        remoteHashes: new Map(),
        createdAtMs,
        pullWritten: new Map(),
        pullDropped: new Set(),
        pulled: false,
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
/**
 * 当前版本的依据 schema。
 */
var SYNC_MANIFEST_FILE = MEMORY_SYNC_DIR;
var BASIS_VERSION = 1;
var basisSchema = (e) =>
  u({
    v: literal(e),
    partition: string(),
  });
var currentBasisSchema = DoctorLazy(() => basisSchema(BASIS_VERSION));
//@ chunk-s61vbvea.js:99034-99980 placement
async function writeSyncManifest(store, n, r) {
  let syncManifest = await readSyncManifest(store.mountDir, r, store.v5MemoryBase);
  if (syncManifest.state === "present" && syncManifest.manifest.partition === store.backend.partitionId) {
    store.manifestSeenThisSession = true;
    return false;
  }
  if (n?.expectPresent) {
    if (isNonAccountStore(store))
      logFeatureSad("team_memory_multistore_conflict", "manifest_changed_mid_pull");
    return false;
  }
  if (syncManifest.state === "present" && store.scope !== "user") failForeignManifest(store);
  let h = jsonStringify({
    v: BASIS_VERSION,
    partition: store.backend.partitionId,
  });
  let y = manifestStorageKey(r, store);
  let S =
    r !== undefined && y !== undefined
      ? {
          storageV5: r,
          manifestKey: y,
        }
      : undefined;
  if (S === undefined)
    await mkdir(store.mountDir, {
      recursive: true,
    });
  if (syncManifest.state === "absent" && store.scope !== "user") {
    let syncManifest = await createSyncManifest(store, h, S?.manifestKey, S?.storageV5);
    store.manifestSeenThisSession = true;
    return syncManifest;
  }
  if (S !== undefined) {
    let w = await S.storageV5.write(S.manifestKey, h, {
      publishDiscipline: "atomic",
      mode: 438 & ~process.umask(),
    });
    if (!w.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `manifest write failed: ${formatStorageError(w.error)}`,
        "memory-sync manifest write failed",
      );
    store.manifestSeenThisSession = true;
    return true;
  }
  await writeFileAtomic(join(store.mountDir, SYNC_MANIFEST_FILE), h);
  store.manifestSeenThisSession = true;
  return true;
}
//@ chunk-s61vbvea.js:99980-100060 placement
/**
 * 挂载目录下某文件的 v5 存储键。
 */
function mountFileStorageKey(e, v5MemoryBase, mountDir, s) {
  return isStorageV5Enabled() && e !== undefined && v5MemoryBase !== undefined
    ? storageKeyForMountPath(v5MemoryBase, mountDir, join(mountDir, s))
    : undefined;
}
//@ chunk-s61vbvea.js:100060-100119 placement
/**
 * 清单文件的存储键。
 */
function manifestStorageKey(e, n) {
  return mountFileStorageKey(e, n.v5MemoryBase, n.mountDir, SYNC_MANIFEST_FILE);
}
//@ chunk-s61vbvea.js:100119-100178 placement
/**
 * basis 文件的存储键。
 */
function basisStorageKey(e, n) {
  return mountFileStorageKey(e, n.v5MemoryBase, n.mountDir, BASIS_FILE_NAME);
}
//@ chunk-s61vbvea.js:100178-100364 placement
function failForeignManifest(e) {
  if (isNonAccountStore(e)) logFeatureSad("team_memory_multistore_conflict", "manifest_foreign_at_write");
  throw Error("mount dir holds another store's .memory-sync manifest at write time (fail closed)");
}
//@ chunk-s61vbvea.js:100364-101195 placement
async function createSyncManifest(e, n, manifestKey, storageV5) {
  if (storageV5 !== undefined && manifestKey !== undefined) {
    let S = await storageV5.write(manifestKey, n, {
      precondition: {
        type: "ifAbsent",
      },
      mode: 438 & ~process.umask(),
    });
    if (S.ok) return true;
    if (S.error.code !== "AlreadyExists")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `manifest create failed: ${formatStorageError(S.error)}`,
        "memory-sync manifest create failed",
      );
    let syncManifest = await readSyncManifest(e.mountDir, storageV5, e.v5MemoryBase);
    if (syncManifest.state === "present" && syncManifest.manifest.partition === e.backend.partitionId)
      return false;
    failForeignManifest(e);
  }
  let h = join(e.mountDir, SYNC_MANIFEST_FILE);
  let y = join(e.mountDir, `${SYNC_MANIFEST_FILE}.${randomUUID()}.stage`);
  try {
    await writeFile(y, n);
    try {
      await link(y, h);
      return true;
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST") {
        let syncManifest = await readSyncManifest(e.mountDir);
        if (syncManifest.state === "present" && syncManifest.manifest.partition === e.backend.partitionId)
          return false;
        failForeignManifest(e);
      }
    }
    let syncManifest = await readSyncManifest(e.mountDir);
    if (syncManifest.state === "present") {
      if (syncManifest.manifest.partition === e.backend.partitionId) return false;
      failForeignManifest(e);
    }
    await writeFileAtomic(h, n);
    return true;
  } finally {
    await unlink(y).catch(() => {});
  }
}
//@ chunk-s61vbvea.js:101195-101725 placement
async function readSyncManifest(mountDir, n, v5MemoryBase) {
  let s;
  try {
    let S = join(mountDir, SYNC_MANIFEST_FILE);
    if (!(await lstat(S)).isFile())
      return {
        state: "torn",
      };
    let w = mountFileStorageKey(n, v5MemoryBase, mountDir, SYNC_MANIFEST_FILE);
    if (n !== undefined && w !== undefined) {
      let R = await n.read([w]);
      if (!R.ok)
        return {
          state: "torn",
        };
      let x = R.value.items[0];
      if (!x.found)
        return {
          state: "absent",
        };
      s = Buffer.from(x.value).toString("utf8");
    } else s = await readFile(S, "utf8");
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? {
          state: "absent",
        }
      : {
          state: "torn",
        };
  }
  let h;
  try {
    h = jsonParse(s);
  } catch {
    return {
      state: "torn",
    };
  }
  let y = currentBasisSchema().safeParse(h);
  if (!y.success)
    return {
      state: "torn",
    };
  return {
    state: "present",
    manifest: y.data,
  };
}
//@ chunk-s61vbvea.js:101725-101827 placement
async function isOwnManifest(mountDir, partitionId, r, v5MemoryBase) {
  let syncManifest = await readSyncManifest(mountDir, r, v5MemoryBase);
  return syncManifest.state === "present" && syncManifest.manifest.partition === partitionId;
}
//@ chunk-s61vbvea.js:101827-102050 placement
var BASIS_FILE_NAME = `${SYNC_MANIFEST_FILE}-basis`;
var BASIS_VERSION_2 = 1;
var MAX_BASIS_BYTES = MAX_STORE_ENTRIES * 512;
var syncBasisSchema = DoctorLazy(() =>
  basisSchema(BASIS_VERSION_2).extend({
    entries: array(tuple([string(), string(), string()])),
    deletes: array(tuple([string(), E(), E()])),
    held: unknown().optional(),
    entriesWereOnDisk: unknown().optional(),
  }),
);
var basisEntriesSchema = DoctorLazy(() =>
  array(tuple([string(), string().regex(SHA256_HEX_RE)])).max(MAX_STORE_ENTRIES),
);
//@ chunk-s61vbvea.js:102050-104337 placement
async function loadPersistedBasis(e, n) {
  if (e.basisLoaded) return null;
  let r;
  try {
    let j = join(e.mountDir, BASIS_FILE_NAME);
    if (!(await lstat(j)).isFile())
      return {
        ok: false,
        reason: "not_regular_file",
      };
    let G = basisStorageKey(n, e);
    if (n !== undefined && G !== undefined) {
      let L = await n.read([
        {
          key: G,
          offset: 0,
          length: MAX_BASIS_BYTES + 1,
        },
      ]);
      if (!L.ok)
        return {
          ok: false,
          reason: "read_error",
        };
      if (!L.value.items[0].found)
        return {
          ok: false,
          reason: "absent",
        };
      let q = L.value.items[0].value;
      if (q.byteLength > MAX_BASIS_BYTES) {
        logForDebugging(`multi-store-sync[${e.mountName}]: persisted basis exceeds size cap, ignoring`, {
          level: "warn",
        });
        return {
          ok: false,
          reason: "over_cap",
        };
      }
      r = Buffer.from(q).toString("utf8");
    } else {
      let L = await open(j, "r");
      try {
        let { size } = await L.stat();
        let Q = Buffer.alloc(Math.min(size, MAX_BASIS_BYTES) + 1);
        let { bytesRead } = await L.read(Q, 0, Q.length, 0);
        if (bytesRead > MAX_BASIS_BYTES) {
          logForDebugging(`multi-store-sync[${e.mountName}]: persisted basis exceeds size cap, ignoring`, {
            level: "warn",
          });
          return {
            ok: false,
            reason: "over_cap",
          };
        }
        r = Q.toString("utf8", 0, bytesRead);
      } finally {
        await L.close();
      }
    }
  } catch (error) {
    return {
      ok: false,
      reason: getErrnoCode(error) === "ENOENT" ? "absent" : "read_error",
    };
  }
  let s = syncBasisSchema().safeParse(safeParseJSON(r, false));
  if (!s.success)
    return {
      ok: false,
      reason: "parse_failed",
    };
  if (s.data.partition !== e.backend.partitionId)
    return {
      ok: false,
      reason: "partition_mismatch",
    };
  let h = [];
  if (isTypedKoalaEnabled() && s.data.held !== undefined) {
    let j = basisEntriesSchema().safeParse(s.data.held);
    if (!j.success)
      return {
        ok: false,
        reason: "parse_failed",
      };
    h = j.data;
  }
  let y = s.data.held !== undefined && !(Array.isArray(s.data.held) && s.data.held.length === 0);
  if (s.data.entries.length === 0 && !y)
    return {
      ok: false,
      reason: "empty_store",
    };
  let S = new Map();
  for (let [j, G, L] of s.data.entries)
    if (isMemoryDocumentKey_2(j) && !(e.excludeKey && e.excludeKey(j.replace(/^\/+/, ""))))
      S.set(j, {
        id: G,
        sha256: L,
      });
  let w = new Map();
  for (let [j, G] of h)
    if (
      j.startsWith("/") &&
      !j.includes("//") &&
      isMemoryDocumentKey_2(j) &&
      !(e.excludeKey && e.excludeKey(j.slice(1))) &&
      !S.has(j)
    )
      w.set(j, G);
  if (S.size === 0 && (w.size === 0 || s.data.entries.length > 0))
    return {
      ok: false,
      reason: "zero_entries",
    };
  let R = new Map();
  let firstMissingAtMs = Date.now();
  let P = s.data.entriesWereOnDisk === true;
  for (let [j, , G] of P ? s.data.deletes : [])
    if (S.has(j))
      R.set(j, {
        firstMissingAtMs,
        missingWalks: Math.max(0, Math.min(G, 1)),
      });
  e.lastPersistedBasisBody = r;
  logForDebugging(
    `multi-store-sync[${e.mountName}]: loaded persisted basis (${S.size} entries, ${R.size} pending delete(s)${P ? "" : ", no entriesWereOnDisk mark, so its pending deletes are ignored and files missing from disk are downloaded again"})`,
    {
      level: "debug",
    },
  );
  return {
    ok: true,
    basis: {
      entries: S,
      deletes: R,
      held: w,
      entriesWereOnDisk: P,
    },
  };
}
//@ chunk-s61vbvea.js:104337-104822 placement
/**
 * 同步基线不可用时：找出只在本地的文件（按需暂扣并提示库已恢复），并记录基线不可用报告。
 */
async function handleUnusableBasis(e, entries, r, s, { walkTrusted, hold }) {
  let basisUnusable = e.basisUnusable;
  if (basisUnusable === undefined || basisUnusable === null) return;
  e.basisUnusable = null;
  let w = (e.heldLocal ??= new Map());
  let R = new Set();
  for (let [P, j] of await findLocalOnlyFiles(e, entries, r, s)) {
    R.add(P);
    if (hold) w.set(P, j.sha256);
  }
  let x = e.notices.rejoinOffNoticed.has(e.mountDir);
  if (x || (hold && w.size > 0)) formatStoreBackOnNotice(e, hold ? [...w.keys()].sort() : [], x);
  e.notices.rejoinOffNoticed.delete(e.mountDir);
  if (!walkTrusted) return;
  e.basisUnusableReport = {
    reason: basisUnusable,
    localOnly: R,
    held: hold ? w.size : 0,
    uploaded: 0,
    uploadFailed: 0,
    emitted: false,
  };
}
//@ chunk-s61vbvea.js:104822-104966 placement
async function findLocalOnlyFiles(e, n, r, s) {
  let h = listUnpulledCandidates(e, n, r);
  let y = new Set();
  await runWithConcurrency(h, LOCAL_IO_CONCURRENCY, async ([S]) => {
    if (await isLocallyEdited(e, S, s)) y.add(S);
  });
  return h.filter(([S]) => !y.has(S));
}
//@ chunk-s61vbvea.js:104966-105054 placement
/**
 * 是否存在未拉取但被本地编辑过的文件。
 */
async function hasUnpulledLocalEdits(e, entries, r, s) {
  for (let [h] of listUnpulledCandidates(e, entries, r)) if (!(await isLocallyEdited(e, h, s))) return true;
  return false;
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
    let r = isTypedKoalaEnabled() ? [...(e.heldLocal ?? [])] : [];
    let s = jsonStringify({
      v: BASIS_VERSION_2,
      partition: e.backend.partitionId,
      entries: [...e.remoteHashes].map(([y, S]) => [y, S.id, S.sha256]),
      deletes: [...(e.pendingDeletes ?? new Map())].map(([y, S]) => [y, S.firstMissingAtMs, S.missingWalks]),
      ...(r.length > 0 && {
        held: r,
      }),
      entriesWereOnDisk: true,
    });
    if (s === e.lastPersistedBasisBody) return;
    if (!(await isOwnManifest(e.mountDir, e.backend.partitionId, n, e.v5MemoryBase))) return;
    let h = basisStorageKey(n, e);
    if (n !== undefined && h !== undefined) {
      let y = await n.write(h, s, {
        parent: "mustExist",
        publishDiscipline: "atomic",
        mode: 438 & ~process.umask(),
      });
      if (!y.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `basis write failed: ${formatStorageError(y.error)}`,
          "memory-sync basis write failed",
        );
    } else await writeFileAtomic(join(e.mountDir, BASIS_FILE_NAME), s);
    e.lastPersistedBasisBody = s;
    e.emptyReceiptOnDisk = !e.pulled;
  } catch (error) {
    logForDebugging(`multi-store-sync[${e.mountName}]: basis write failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-s61vbvea.js:106010-106068 placement
/**
 * 清空同步依据并持久化。
 */
async function clearBasis(e, n) {
  e.basisUnusable = null;
  await deleteSyncBasis(e, n);
}
//@ chunk-s61vbvea.js:106068-106312 placement
async function deleteSyncBasis(e, n) {
  e.lastPersistedBasisBody = undefined;
  let r = basisStorageKey(n, e);
  let s =
    n !== undefined && r !== undefined
      ? await n.delete(r).then((h) => h.ok || h.error.code === "NotFound")
      : await unlink(join(e.mountDir, BASIS_FILE_NAME)).then(
          () => true,
          (error) => isENOENT(error),
        );
  if (s) e.emptyReceiptOnDisk = false;
  return s;
}
export {
  loadPersistedBasis,
  deleteSyncBasis,
  SYNC_MANIFEST_FILE,
  readSyncManifest,
  clearBasis,
  hasUnpulledLocalEdits,
  writeSyncBasis,
  handleUnusableBasis,
  writeSyncManifest,
  isOwnManifest,
  createMultiStoreState,
};
