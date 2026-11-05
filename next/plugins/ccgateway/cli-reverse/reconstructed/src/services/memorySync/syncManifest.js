/**
 * services/memorySync/syncManifest.ts
 *
 * 记忆同步 manifest 与基线（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (19)
 * attribution: placement 19
 */
import { mkdir, writeFile, link, unlink, lstat, readFile, open } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getTeamMemPath } from "../../memdir/teamMemPaths.js";
import { memoryStoreMountRoot } from "./mountRoots.js";
import { isExcludedMemoryKey, isMemoryDocumentKey_2 } from "../memoryStore/memoryKeys.js";
import { MEMORY_SYNC_DIR } from "../orgMemory/storeErrors.js";
import {
  objectSchema,
  literal,
  stringSchema,
  array,
  tuple,
  numberSchema,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:98588-99251 placement
function createMultiStoreState(storeClients, mountEntries, notices, createdAtMs = Date.now()) {
  if (storeClients.length !== mountEntries.length) throw Error("createMultiStoreState: length mismatch");
  return {
    stores: storeClients.map((backend, storeIndex) => {
      let mountEntry = mountEntries[storeIndex];
      let config =
        typeof mountEntry === "string"
          ? {
              mount: mountEntry,
              scope: "team",
              source: "env",
            }
          : mountEntry;
      let isUserScope = config.scope === "user";
      return {
        backend,
        mountName: config.mount,
        notices,
        scope: config.scope,
        source: config.source,
        writeDir: config.writeDir ?? "",
        firstWriteEmitted: false,
        mountDir: getTeamMemPath(config),
        v5MemoryBase: memoryStoreMountRoot(config.scope, getTeamMemPath(config)),
        excludeKey: isUserScope ? isExcludedMemoryKey : null,
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
//@ chunk-7jxyna5q.js:99251-99318 placement
/**
 * 当前版本的依据 schema。
 */
var SYNC_MANIFEST_FILE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var BASIS_VERSION;
var basisSchema;
var currentBasisSchema;
deferInit("chunk-7jxyna5q.js:99251", () => {
  SYNC_MANIFEST_FILE = MEMORY_SYNC_DIR;
  BASIS_VERSION = 1;
  basisSchema = (version) =>
    objectSchema({
      v: literal(version),
      partition: stringSchema(),
    });
  currentBasisSchema = DoctorLazy(() => basisSchema(BASIS_VERSION));
});
//@ chunk-7jxyna5q.js:99318-100264 placement
async function writeSyncManifest(store, options, storage) {
  let syncManifest = await readSyncManifest(store.mountDir, storage, store.v5MemoryBase);
  if (syncManifest.state === "present" && syncManifest.manifest.partition === store.backend.partitionId) {
    store.manifestSeenThisSession = true;
    return false;
  }
  if (options?.expectPresent) {
    if (isNonAccountStore(store))
      logFeatureSad("team_memory_multistore_conflict", "manifest_changed_mid_pull");
    return false;
  }
  if (syncManifest.state === "present" && store.scope !== "user") failForeignManifest(store);
  let body = jsonStringify({
    v: BASIS_VERSION,
    partition: store.backend.partitionId,
  });
  let manifestKey = manifestStorageKey(storage, store);
  let manifestStore =
    storage !== undefined && manifestKey !== undefined
      ? {
          storageV5: storage,
          manifestKey,
        }
      : undefined;
  if (manifestStore === undefined)
    await mkdir(store.mountDir, {
      recursive: true,
    });
  if (syncManifest.state === "absent" && store.scope !== "user") {
    let syncManifest = await createSyncManifest(
      store,
      body,
      manifestStore?.manifestKey,
      manifestStore?.storageV5,
    );
    store.manifestSeenThisSession = true;
    return syncManifest;
  }
  if (manifestStore !== undefined) {
    let writeResult = await manifestStore.storageV5.write(manifestStore.manifestKey, body, {
      publishDiscipline: "atomic",
      mode: 438 & ~process.umask(),
    });
    if (!writeResult.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `manifest write failed: ${formatStorageError(writeResult.error)}`,
        "memory-sync manifest write failed",
      );
    store.manifestSeenThisSession = true;
    return true;
  }
  await writeFileAtomic(join(store.mountDir, SYNC_MANIFEST_FILE), body);
  store.manifestSeenThisSession = true;
  return true;
}
//@ chunk-7jxyna5q.js:100264-100344 placement
/**
 * 挂载目录下某文件的 v5 存储键。
 */
function mountFileStorageKey(storage, v5MemoryBase, mountDir, fileName) {
  return isStorageV5Enabled() && storage !== undefined && v5MemoryBase !== undefined
    ? storageKeyForMountPath(v5MemoryBase, mountDir, join(mountDir, fileName))
    : undefined;
}
//@ chunk-7jxyna5q.js:100344-100403 placement
/**
 * 清单文件的存储键。
 */
function manifestStorageKey(storage, store) {
  return mountFileStorageKey(storage, store.v5MemoryBase, store.mountDir, SYNC_MANIFEST_FILE);
}
//@ chunk-7jxyna5q.js:100403-100462 placement
/**
 * basis 文件的存储键。
 */
function basisStorageKey(storage, store) {
  return mountFileStorageKey(storage, store.v5MemoryBase, store.mountDir, BASIS_FILE_NAME);
}
//@ chunk-7jxyna5q.js:100462-100648 placement
function failForeignManifest(store) {
  if (isNonAccountStore(store)) logFeatureSad("team_memory_multistore_conflict", "manifest_foreign_at_write");
  throw Error("mount dir holds another store's .memory-sync manifest at write time (fail closed)");
}
//@ chunk-7jxyna5q.js:100648-101479 placement
async function createSyncManifest(store, body, manifestKey, storageV5) {
  if (storageV5 !== undefined && manifestKey !== undefined) {
    let writeResult = await storageV5.write(manifestKey, body, {
      precondition: {
        type: "ifAbsent",
      },
      mode: 438 & ~process.umask(),
    });
    if (writeResult.ok) return true;
    if (writeResult.error.code !== "AlreadyExists")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `manifest create failed: ${formatStorageError(writeResult.error)}`,
        "memory-sync manifest create failed",
      );
    let syncManifest = await readSyncManifest(store.mountDir, storageV5, store.v5MemoryBase);
    if (syncManifest.state === "present" && syncManifest.manifest.partition === store.backend.partitionId)
      return false;
    failForeignManifest(store);
  }
  let manifestPath = join(store.mountDir, SYNC_MANIFEST_FILE);
  let stagePath = join(store.mountDir, `${SYNC_MANIFEST_FILE}.${randomUUID()}.stage`);
  try {
    await writeFile(stagePath, body);
    try {
      await link(stagePath, manifestPath);
      return true;
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST") {
        let syncManifest = await readSyncManifest(store.mountDir);
        if (syncManifest.state === "present" && syncManifest.manifest.partition === store.backend.partitionId)
          return false;
        failForeignManifest(store);
      }
    }
    let syncManifest = await readSyncManifest(store.mountDir);
    if (syncManifest.state === "present") {
      if (syncManifest.manifest.partition === store.backend.partitionId) return false;
      failForeignManifest(store);
    }
    await writeFileAtomic(manifestPath, body);
    return true;
  } finally {
    await unlink(stagePath).catch(() => {});
  }
}
//@ chunk-7jxyna5q.js:101479-102009 placement
async function readSyncManifest(mountDir, storage, v5MemoryBase) {
  let body;
  try {
    let manifestPath = join(mountDir, SYNC_MANIFEST_FILE);
    if (!(await lstat(manifestPath)).isFile())
      return {
        state: "torn",
      };
    let storageKey = mountFileStorageKey(storage, v5MemoryBase, mountDir, SYNC_MANIFEST_FILE);
    if (storage !== undefined && storageKey !== undefined) {
      let readResult = await storage.read([storageKey]);
      if (!readResult.ok)
        return {
          state: "torn",
        };
      let item = readResult.value.items[0];
      if (!item.found)
        return {
          state: "absent",
        };
      body = Buffer.from(item.value).toString("utf8");
    } else body = await readFile(manifestPath, "utf8");
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? {
          state: "absent",
        }
      : {
          state: "torn",
        };
  }
  let raw;
  try {
    raw = jsonParse(body);
  } catch {
    return {
      state: "torn",
    };
  }
  let parsed = currentBasisSchema().safeParse(raw);
  if (!parsed.success)
    return {
      state: "torn",
    };
  return {
    state: "present",
    manifest: parsed.data,
  };
}
//@ chunk-7jxyna5q.js:102009-102111 placement
async function isOwnManifest(mountDir, partitionId, storage, v5MemoryBase) {
  let syncManifest = await readSyncManifest(mountDir, storage, v5MemoryBase);
  return syncManifest.state === "present" && syncManifest.manifest.partition === partitionId;
}
//@ chunk-7jxyna5q.js:102111-102334 placement
var BASIS_FILE_NAME; // deferred: uses SYNC_MANIFEST_FILE of its import cycle while loading; runs once the cycle is complete
var BASIS_VERSION_2;
var MAX_BASIS_BYTES;
var syncBasisSchema;
var basisEntriesSchema;
deferInit("chunk-7jxyna5q.js:102111", () => {
  BASIS_FILE_NAME = `${SYNC_MANIFEST_FILE}-basis`;
  BASIS_VERSION_2 = 1;
  MAX_BASIS_BYTES = MAX_STORE_ENTRIES * 512;
  syncBasisSchema = DoctorLazy(() =>
    basisSchema(BASIS_VERSION_2).extend({
      entries: array(tuple([stringSchema(), stringSchema(), stringSchema()])),
      deletes: array(tuple([stringSchema(), numberSchema(), numberSchema()])),
      held: unknown().optional(),
      entriesWereOnDisk: unknown().optional(),
    }),
  );
  basisEntriesSchema = DoctorLazy(() =>
    array(tuple([stringSchema(), stringSchema().regex(SHA256_HEX_RE)])).max(MAX_STORE_ENTRIES),
  );
});
//@ chunk-7jxyna5q.js:102334-104624 placement
async function loadPersistedBasis(store, storage) {
  if (store.basisLoaded) return null;
  let body;
  try {
    let basisPath = join(store.mountDir, BASIS_FILE_NAME);
    if (!(await lstat(basisPath)).isFile())
      return {
        ok: false,
        reason: "not_regular_file",
      };
    let storageKey = basisStorageKey(storage, store);
    if (storage !== undefined && storageKey !== undefined) {
      let readResult = await storage.read([
        {
          key: storageKey,
          offset: 0,
          length: MAX_BASIS_BYTES + 1,
        },
      ]);
      if (!readResult.ok)
        return {
          ok: false,
          reason: "read_error",
        };
      if (!readResult.value.items[0].found)
        return {
          ok: false,
          reason: "absent",
        };
      let bytes = readResult.value.items[0].value;
      if (bytes.byteLength > MAX_BASIS_BYTES) {
        logForDebugging(`multi-store-sync[${store.mountName}]: persisted basis exceeds size cap, ignoring`, {
          level: "warn",
        });
        return {
          ok: false,
          reason: "over_cap",
        };
      }
      body = Buffer.from(bytes).toString("utf8");
    } else {
      let handle = await open(basisPath, "r");
      try {
        let { size } = await handle.stat();
        let buffer = Buffer.alloc(Math.min(size, MAX_BASIS_BYTES) + 1);
        let { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        if (bytesRead > MAX_BASIS_BYTES) {
          logForDebugging(
            `multi-store-sync[${store.mountName}]: persisted basis exceeds size cap, ignoring`,
            {
              level: "warn",
            },
          );
          return {
            ok: false,
            reason: "over_cap",
          };
        }
        body = buffer.toString("utf8", 0, bytesRead);
      } finally {
        await handle.close();
      }
    }
  } catch (error) {
    return {
      ok: false,
      reason: getErrnoCode(error) === "ENOENT" ? "absent" : "read_error",
    };
  }
  let parsed = syncBasisSchema().safeParse(safeParseJSON(body, false));
  if (!parsed.success)
    return {
      ok: false,
      reason: "parse_failed",
    };
  if (parsed.data.partition !== store.backend.partitionId)
    return {
      ok: false,
      reason: "partition_mismatch",
    };
  let heldEntries = [];
  if (isTypedKoalaEnabled() && parsed.data.held !== undefined) {
    let heldCheck = basisEntriesSchema().safeParse(parsed.data.held);
    if (!heldCheck.success)
      return {
        ok: false,
        reason: "parse_failed",
      };
    heldEntries = heldCheck.data;
  }
  let hasHeldMark =
    parsed.data.held !== undefined && !(Array.isArray(parsed.data.held) && parsed.data.held.length === 0);
  if (parsed.data.entries.length === 0 && !hasHeldMark)
    return {
      ok: false,
      reason: "empty_store",
    };
  let remoteHashes = new Map();
  for (let [path, id, sha256] of parsed.data.entries)
    if (isMemoryDocumentKey_2(path) && !(store.excludeKey && store.excludeKey(path.replace(/^\/+/, ""))))
      remoteHashes.set(path, {
        id,
        sha256,
      });
  let heldLocal = new Map();
  for (let [path, sha256] of heldEntries)
    if (
      path.startsWith("/") &&
      !path.includes("//") &&
      isMemoryDocumentKey_2(path) &&
      !(store.excludeKey && store.excludeKey(path.slice(1))) &&
      !remoteHashes.has(path)
    )
      heldLocal.set(path, sha256);
  if (remoteHashes.size === 0 && (heldLocal.size === 0 || parsed.data.entries.length > 0))
    return {
      ok: false,
      reason: "zero_entries",
    };
  let pendingDeletes = new Map();
  let firstMissingAtMs = Date.now();
  let entriesWereOnDisk = parsed.data.entriesWereOnDisk === true;
  for (let [path, , missingWalks] of entriesWereOnDisk ? parsed.data.deletes : [])
    if (remoteHashes.has(path))
      pendingDeletes.set(path, {
        firstMissingAtMs,
        missingWalks: Math.max(0, Math.min(missingWalks, 1)),
      });
  store.lastPersistedBasisBody = body;
  logForDebugging(
    `multi-store-sync[${store.mountName}]: loaded persisted basis (${remoteHashes.size} entries, ${pendingDeletes.size} pending delete(s)${entriesWereOnDisk ? "" : ", no entriesWereOnDisk mark, so its pending deletes are ignored and files missing from disk are downloaded again"})`,
    {
      level: "debug",
    },
  );
  return {
    ok: true,
    basis: {
      entries: remoteHashes,
      deletes: pendingDeletes,
      held: heldLocal,
      entriesWereOnDisk,
    },
  };
}
//@ chunk-7jxyna5q.js:104624-105109 placement
/**
 * 同步基线不可用时：找出只在本地的文件（按需暂扣并提示库已恢复），并记录基线不可用报告。
 */
async function handleUnusableBasis(store, entries, storage, walkHashes, { walkTrusted, hold }) {
  let basisUnusable = store.basisUnusable;
  if (basisUnusable === undefined || basisUnusable === null) return;
  store.basisUnusable = null;
  let heldLocal = (store.heldLocal ??= new Map());
  let localOnly = new Set();
  for (let [path, entry] of await findLocalOnlyFiles(store, entries, storage, walkHashes)) {
    localOnly.add(path);
    if (hold) heldLocal.set(path, entry.sha256);
  }
  let rejoinOffNoticed = store.notices.rejoinOffNoticed.has(store.mountDir);
  if (rejoinOffNoticed || (hold && heldLocal.size > 0))
    formatStoreBackOnNotice(store, hold ? [...heldLocal.keys()].sort() : [], rejoinOffNoticed);
  store.notices.rejoinOffNoticed.delete(store.mountDir);
  if (!walkTrusted) return;
  store.basisUnusableReport = {
    reason: basisUnusable,
    localOnly,
    held: hold ? heldLocal.size : 0,
    uploaded: 0,
    uploadFailed: 0,
    emitted: false,
  };
}
//@ chunk-7jxyna5q.js:105109-105253 placement
async function findLocalOnlyFiles(store, entries, storage, walkHashes) {
  let candidates = listUnpulledCandidates(store, entries, storage);
  let editedPaths = new Set();
  await runWithConcurrency(candidates, LOCAL_IO_CONCURRENCY, async ([path]) => {
    if (await isLocallyEdited(store, path, walkHashes)) editedPaths.add(path);
  });
  return candidates.filter(([path]) => !editedPaths.has(path));
}
//@ chunk-7jxyna5q.js:105253-105341 placement
/**
 * 是否存在未拉取但被本地编辑过的文件。
 */
async function hasUnpulledLocalEdits(store, entries, storage, walkHashes) {
  for (let [path] of listUnpulledCandidates(store, entries, storage))
    if (!(await isLocallyEdited(store, path, walkHashes))) return true;
  return false;
}
//@ chunk-7jxyna5q.js:105341-105468 placement
function listUnpulledCandidates(store, entries, editedPaths) {
  return [...entries].filter(
    ([path, entry]) =>
      !editedPaths.has(path) &&
      entry.sha256 !== EMPTY_CONTENT_SHA256 &&
      (store.pullWritten.get(path)?.sha256 ?? entry.sha256) === entry.sha256,
  );
}
//@ chunk-7jxyna5q.js:105468-106297 placement
async function writeSyncBasis(store, storage) {
  try {
    let heldEntries = isTypedKoalaEnabled() ? [...(store.heldLocal ?? [])] : [];
    let body = jsonStringify({
      v: BASIS_VERSION_2,
      partition: store.backend.partitionId,
      entries: [...store.remoteHashes].map(([path, entry]) => [path, entry.id, entry.sha256]),
      deletes: [...(store.pendingDeletes ?? new Map())].map(([path, pending]) => [
        path,
        pending.firstMissingAtMs,
        pending.missingWalks,
      ]),
      ...(heldEntries.length > 0 && {
        held: heldEntries,
      }),
      entriesWereOnDisk: true,
    });
    if (body === store.lastPersistedBasisBody) return;
    if (!(await isOwnManifest(store.mountDir, store.backend.partitionId, storage, store.v5MemoryBase)))
      return;
    let storageKey = basisStorageKey(storage, store);
    if (storage !== undefined && storageKey !== undefined) {
      let writeResult = await storage.write(storageKey, body, {
        parent: "mustExist",
        publishDiscipline: "atomic",
        mode: 438 & ~process.umask(),
      });
      if (!writeResult.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `basis write failed: ${formatStorageError(writeResult.error)}`,
          "memory-sync basis write failed",
        );
    } else await writeFileAtomic(join(store.mountDir, BASIS_FILE_NAME), body);
    store.lastPersistedBasisBody = body;
    store.emptyReceiptOnDisk = !store.pulled;
  } catch (error) {
    logForDebugging(`multi-store-sync[${store.mountName}]: basis write failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-7jxyna5q.js:106297-106355 placement
/**
 * 清空同步依据并持久化。
 */
async function clearBasis(store, storage) {
  store.basisUnusable = null;
  await deleteSyncBasis(store, storage);
}
//@ chunk-7jxyna5q.js:106355-106599 placement
async function deleteSyncBasis(store, storage) {
  store.lastPersistedBasisBody = undefined;
  let storageKey = basisStorageKey(storage, store);
  let deleted =
    storage !== undefined && storageKey !== undefined
      ? await storage.delete(storageKey).then((result) => result.ok || result.error.code === "NotFound")
      : await unlink(join(store.mountDir, BASIS_FILE_NAME)).then(
          () => true,
          (error) => isENOENT(error),
        );
  if (deleted) store.emptyReceiptOnDisk = false;
  return deleted;
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
