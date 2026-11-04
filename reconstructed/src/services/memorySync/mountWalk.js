/**
 * services/memorySync/mountWalk.ts
 *
 * 记忆挂载目录遍历与本地读写（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (32)
 * attribution: placement 32
 */
import { readdir, stat, readFile, lstat, lutimes, mkdir, link, unlink, utimes, rmdir } from "fs/promises";
import { join, relative, sep, dirname, resolve } from "path";
import { loadPersistedBasis, deleteSyncBasis, SYNC_MANIFEST_FILE } from "./syncManifest.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  isENOENT,
  errorMessage,
} from "../../utils/errors.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { isNoiseTempFile } from "./syncFiles.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { createYieldingRunner } from "./exportStream.js";
import {
  STAT_CONCURRENCY,
  MAX_MEMORY_BYTES,
  MTIME_SETTLE_MS,
  WRITE_SETTLE_MS,
  EMPTY_CONTENT_HASH,
} from "./syncConfig.js";
import { hasMemoryExtension, scanSecretsInVariants } from "../memoryStore/memoryKeys.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { memoryMountScope } from "./mountRoots.js";
import { readAllPages } from "../../utils/pagedRead.js";
import { storageKeyForMountPath } from "../../memdir/teamMemPrompts.js";
import { resolveStoreKeyPath } from "./multiStoreSync.js";
import { PathTraversalError } from "../../memdir/teamMemPaths.js";
import { isNonRegularFailure, isNonRegularError } from "./pathScrub.js";
import {
  writeIfMissing,
  publishWriteAtomic,
  PublishRefusedError,
  writeNewFile,
} from "../../utils/atomicPublishWrite.js";
import { openNoFollow_2 } from "../../utils/fsSafety/hardenedRead.js";

//@ chunk-s61vbvea.js:106312-106691 placement
/**
 * 空库回执仍在磁盘且未拉取时，按基线状态删除回执；无法删除时抛错。
 */
async function removeEmptyStoreReceipt(store, storage) {
  if (store.emptyReceiptOnDisk !== true || store.pulled) return;
  let persistedBasis = await loadPersistedBasis(store, storage);
  let reason = persistedBasis?.ok === false ? persistedBasis.reason : null;
  if (reason !== "empty_store" && reason !== "absent" && reason !== "read_error") {
    store.emptyReceiptOnDisk = false;
    return;
  }
  if (reason === "read_error" || !(await deleteSyncBasis(store, storage)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "multi-store-sync: empty store receipt not removed",
      "multi-store-sync: empty store receipt not removed",
    );
  store.removedEmptyReceipt = true;
}
//@ chunk-s61vbvea.js:106691-106841 placement
function getV5MemoryContext(store, storageV5Config) {
  return isStorageV5Enabled() && storageV5Config !== undefined && store.v5MemoryBase !== undefined
    ? {
        storageV5: storageV5Config,
        base: store.v5MemoryBase,
        manifestSeen: store.manifestSeenThisSession === true,
      }
    : undefined;
}
//@ chunk-s61vbvea.js:106841-106851 placement
/**
 * 分批处理的批大小（64）。
 */
var SLICE_BATCH_SIZE = 64;
//@ chunk-s61vbvea.js:106851-107424 placement
async function walkMountDirect(rootDir, excludeKey) {
  async function walk(dir, relDir) {
    let entries;
    try {
      entries = await readdir(dir, {
        withFileTypes: true,
      });
    } catch (error) {
      return getErrnoCode(error) !== "ENOENT";
    }
    let found = entries.find(
      (entry) => !isValidKeySegment(entry.name) || (entry.isDirectory() && isNoiseTempFile(entry.name, true)),
    );
    if (found) {
      logForDebugging(
        `[memory-sync] mount walk goes direct this cycle: ${relDir || "."} holds a name the storage interface cannot list (${!isValidKeySegment(found.name) ? "outside the key grammar" : "a staging-shaped directory"})`,
      );
      return true;
    }
    return (
      await Promise.all(
        entries
          .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
          .map((entry) => {
            let relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
            return excludeKey && excludeKey(relPath) ? false : walk(join(dir, entry.name), relPath);
          }),
      )
    ).some(Boolean);
  }
  return walk(rootDir, "");
}
//@ chunk-s61vbvea.js:107424-107550 placement
function throwMountWalkFailure(storageError) {
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `mount walk failed: ${formatStorageError(storageError)}`,
    "multi-store-sync: mount walk failed through the storage interface",
  );
}
//@ chunk-s61vbvea.js:107550-108889 placement
async function collectLocalMemoryEntries(
  mountDir,
  excludeKey,
  storageV5,
  v5MemoryBase,
  manifestSeenThisSession,
  walkHashes,
  knownHashes,
) {
  if (
    isStorageV5Enabled() &&
    storageV5 !== undefined &&
    v5MemoryBase !== undefined &&
    !(await walkMountDirect(mountDir, excludeKey))
  )
    return readStoreMountEntries(
      mountDir,
      excludeKey,
      {
        storageV5,
        base: v5MemoryBase,
        manifestSeen: manifestSeenThisSession === true,
      },
      knownHashes,
    );
  let entries = new Map();
  let diskPaths = new Set();
  let skippedSecretPaths = [];
  let skippedOversizedPaths = [];
  let diskTrusted = true;
  let rootMissing = false;
  let now = Date.now();
  let yieldingRunner = createYieldingRunner({
    maxConcurrent: STAT_CONCURRENCY,
  });
  async function walkDir(dir) {
    let dirEntries;
    try {
      dirEntries = await readdir(dir, {
        withFileTypes: true,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT") {
        diskTrusted = false;
        if (dir === mountDir) rootMissing = true;
        return;
      }
      if (errnoCode === "EACCES" || errnoCode === "EPERM") {
        diskTrusted = false;
        return;
      }
      throw error;
    }
    await Promise.all(
      dirEntries.map(async (entry) => {
        let absPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.startsWith(".")) return;
          if (excludeKey) {
            let joined = relative(mountDir, absPath).split(sep).join("/");
            if (excludeKey(joined)) return;
          }
          await walkDir(absPath);
          await yieldingRunner.maybeYield();
          return;
        }
        if (!entry.isFile() || !hasMemoryExtension(entry.name)) return;
        await yieldingRunner.runBounded(async () => {
          let key = "/" + relative(mountDir, absPath).split(sep).join("/");
          diskPaths.add(key);
          try {
            let stats = await stat(absPath);
            if (stats.size > MAX_MEMORY_BYTES) {
              skippedOversizedPaths.push({
                path: key,
                size: stats.size,
              });
              logForDebugging(`multi-store-sync: skipping oversized ${key} (${stats.size}B)`, {
                level: "warn",
              });
              return;
            }
            let cachedEntry = getCachedEntry(walkHashes, key, stats.mtimeMs, stats.ctimeMs, stats.size);
            if (cachedEntry !== undefined && !isHashChanged(knownHashes, key, cachedEntry.sha256)) {
              entries.set(key, cachedEntry);
              return;
            }
            let content = await readFile(absPath, "utf8");
            let contentHash = computeContentHash(content);
            cacheEntry(walkHashes, key, stats.mtimeMs, stats.ctimeMs, stats.size, contentHash, now);
            entries.set(key, readEntryContent(key, content, contentHash, knownHashes, skippedSecretPaths));
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "ENOENT") return;
            if (errnoCode === "EACCES" || errnoCode === "EPERM") {
              diskTrusted = false;
              return;
            }
            throw error;
          }
        });
      }),
    );
  }
  await walkDir(mountDir);
  if (diskTrusted && !rootMissing) removeStaleKeys(walkHashes, entries);
  return {
    entries,
    diskPaths,
    diskTrusted,
    rootMissing,
    skippedSecretPaths,
    skippedOversizedPaths,
  };
}
//@ chunk-s61vbvea.js:108889-108948 placement
/**
 * 判断缓存里的哈希是否与新值不同。
 */
function isHashChanged(walkHashes, key, sha256) {
  return walkHashes !== undefined && walkHashes.get(key)?.sha256 !== sha256;
}
//@ chunk-s61vbvea.js:108948-109146 placement
function readEntryContent(key, content, contentHash, walkHashes, skippedSecretPaths) {
  if (!isHashChanged(walkHashes, key, contentHash))
    return {
      sha256: contentHash,
    };
  if (scanSecretsInVariants(content).length > 0) {
    skippedSecretPaths.push(key);
    logForDebugging(`multi-store-sync: skipping ${key} (secret detected)`, {
      level: "warn",
    });
    return {
      sha256: contentHash,
    };
  }
  return {
    sha256: contentHash,
    content,
  };
}
//@ chunk-s61vbvea.js:109146-109259 placement
function getCachedEntry(walkHashes, key, mtimeMs, ctimeMs, size) {
  let cached = walkHashes.get(key);
  return cached !== undefined &&
    cached.mtimeMs === mtimeMs &&
    cached.ctimeMs === ctimeMs &&
    cached.size === size
    ? cached.entry
    : undefined;
}
//@ chunk-s61vbvea.js:109259-109368 placement
function cacheEntry(walkHashes, key, mtimeMs, ctimeMs, size, sha256, now) {
  if (now - mtimeMs > MTIME_SETTLE_MS)
    walkHashes.set(key, {
      mtimeMs,
      ctimeMs,
      size,
      entry: {
        sha256,
      },
    });
  else walkHashes.delete(key);
}
//@ chunk-s61vbvea.js:109368-109432 placement
/**
 * 删除目标里已不再出现的键。
 */
function removeStaleKeys(walkHashes, liveKeys) {
  for (let key of walkHashes.keys()) if (!liveKeys.has(key)) walkHashes.delete(key);
}
//@ chunk-s61vbvea.js:109432-112702 placement
async function readStoreMountEntries(mountDir, excludeKey, options, walkHashes) {
  let entries = new Map();
  let diskPaths = new Set();
  let skippedSecretPaths = [];
  let skippedOversizedPaths = [];
  let diskTrusted = true;
  let rootMissing = false;
  let mountScope = memoryMountScope(options.base);
  let baseDepth = options.base.baseRelPath.length;
  let yieldingRunner = createYieldingRunner({
    maxConcurrent: STAT_CONCURRENCY,
  });
  let keyEntries = [];
  let unlistedScopes = [];
  let listError;
  let listingCapped = false;
  let listScope = async (scope) => {
    let childScopes = [];
    let sawChildScope = true;
    let allPages = await readAllPages(
      (cursor) =>
        options.storageV5.listEntries(scope, {
          ...(cursor !== undefined && {
            cursor,
          }),
          skipKeyStats: true,
          skipScopeStats: true,
        }),
      (items) => {
        for (let item of items) {
          sawChildScope = false;
          if (item.kind === "key") {
            keyEntries.push(item);
            continue;
          }
          if (item.scope.namespace !== "memory" || item.viaSymlink === true) continue;
          let sliced = (item.scope.relPath ?? []).slice(baseDepth);
          let last = sliced.at(-1);
          if (last === undefined || last.startsWith(".")) continue;
          if (excludeKey && excludeKey(sliced.join("/"))) continue;
          childScopes.push(item.scope);
        }
      },
    );
    if (allPages.status === "error") {
      if (allPages.error.code !== "InvalidArgument" && allPages.error.failureClass === "permission") {
        diskTrusted = false;
        return;
      }
      listError ??= allPages.error;
      return;
    }
    if (allPages.status === "capped") listingCapped = true;
    if (sawChildScope && scope !== mountScope) unlistedScopes.push(scope);
    await Promise.all(childScopes.map(listScope));
  };
  await listScope(mountScope);
  if (listError !== undefined) throwMountWalkFailure(listError);
  if (listingCapped) diskTrusted = false;
  if (diskTrusted && unlistedScopes.length > 0) {
    let scopeByKey = new Map();
    for (let unlistedScope of unlistedScopes) {
      let sliced = (unlistedScope.relPath ?? []).slice(0, -1);
      let { relPath, ...baseParts } = mountScope;
      scopeByKey.set(sliced.join("/"), {
        ...baseParts,
        ...(sliced.length > 0 && {
          relPath: sliced,
        }),
      });
    }
    let listedScopePaths = new Set();
    for (let scope of scopeByKey.values())
      if (
        (
          await readAllPages(
            (cursor) =>
              options.storageV5.listEntries(scope, {
                ...(cursor !== undefined && {
                  cursor,
                }),
                skipKeyStats: true,
                skipScopeStats: true,
              }),
            (items) => {
              for (let item of items)
                if (item.kind === "scope" && item.scope.namespace === "memory")
                  listedScopePaths.add((item.scope.relPath ?? []).join("/"));
            },
          )
        ).status !== "done"
      )
        diskTrusted = false;
    if (
      unlistedScopes.some((unlistedScope) => !listedScopePaths.has((unlistedScope.relPath ?? []).join("/")))
    )
      diskTrusted = false;
  }
  if (keyEntries.length === 0 && options.manifestSeen) {
    let manifestKey = storageKeyForMountPath(options.base, mountDir, join(mountDir, SYNC_MANIFEST_FILE));
    let manifestStat = manifestKey === undefined ? undefined : await options.storageV5.statMeta(manifestKey);
    if (manifestStat === undefined || !manifestStat.ok) {
      diskTrusted = false;
      rootMissing = manifestStat === undefined || manifestStat.error.code === "NotFound";
    }
    return {
      entries,
      diskPaths,
      diskTrusted,
      rootMissing,
      skippedSecretPaths,
      skippedOversizedPaths,
    };
  }
  let recordEntry = (key, content) => {
    entries.set(
      key,
      readEntryContent(key, content, computeContentHash(content), walkHashes, skippedSecretPaths),
    );
  };
  let toRead = [];
  for (let keyEntry of keyEntries) {
    if (keyEntry.key.namespace !== "memory") continue;
    let sliced = keyEntry.key.relPath.slice(baseDepth);
    let fileName = sliced.at(-1);
    if (fileName === undefined) continue;
    let sliced_2 = sliced.slice(0, -1);
    if (sliced_2.some((segment) => segment.startsWith("."))) continue;
    if (
      excludeKey &&
      sliced_2.some((segment, segmentIndex) => excludeKey(sliced_2.slice(0, segmentIndex + 1).join("/")))
    )
      continue;
    if (keyEntry.viaSymlink === true || !hasMemoryExtension(fileName)) continue;
    let key = "/" + sliced.join("/");
    diskPaths.add(key);
    if (keyEntry.size !== undefined && keyEntry.size > MAX_MEMORY_BYTES) {
      skippedOversizedPaths.push({
        path: key,
        size: keyEntry.size,
      });
      logForDebugging(`multi-store-sync: skipping oversized ${key} (${keyEntry.size}B)`, {
        level: "warn",
      });
      continue;
    }
    toRead.push({
      relPath: key,
      key: keyEntry.key,
    });
  }
  let batches = [];
  for (let batchStart = 0; batchStart < toRead.length; batchStart += SLICE_BATCH_SIZE)
    batches.push(toRead.slice(batchStart, batchStart + SLICE_BATCH_SIZE));
  let results = await Promise.all(
    batches.map((batch) =>
      yieldingRunner.runBounded(() =>
        options.storageV5.read(
          batch.map((entry) => ({
            key: entry.key,
            offset: 0,
            length: MAX_MEMORY_BYTES + 1,
          })),
        ),
      ),
    ),
  );
  let readResults = [];
  for (let [batchIndex, result] of results.entries()) {
    let batch = batches[batchIndex];
    if (result.ok) {
      readResults.push({
        batch,
        items: result.value.items,
      });
      continue;
    }
    if (result.error.code === "InvalidArgument" || result.error.failureClass !== "permission")
      throwMountWalkFailure(result.error);
    diskTrusted = false;
    for (let entry of batch) {
      let result = await options.storageV5.read([
        {
          key: entry.key,
          offset: 0,
          length: MAX_MEMORY_BYTES + 1,
        },
      ]);
      if (result.ok)
        readResults.push({
          batch: [entry],
          items: result.value.items,
        });
      else if (result.error.code === "InvalidArgument" || result.error.failureClass !== "permission")
        throwMountWalkFailure(result.error);
    }
  }
  for (let { batch, items } of readResults)
    for (let [itemIndex, item] of items.entries()) {
      let { relPath } = batch[itemIndex];
      if (!item.found) continue;
      if (item.totalBytes > MAX_MEMORY_BYTES) {
        skippedOversizedPaths.push({
          path: relPath,
          size: item.totalBytes,
        });
        logForDebugging(`multi-store-sync: skipping oversized ${relPath} (${item.totalBytes}B)`, {
          level: "warn",
        });
        continue;
      }
      recordEntry(relPath, Buffer.from(item.value).toString("utf8"));
      await yieldingRunner.maybeYield();
    }
  return {
    entries,
    diskPaths,
    diskTrusted,
    rootMissing,
    skippedSecretPaths,
    skippedOversizedPaths,
  };
}
//@ chunk-s61vbvea.js:112702-112879 placement
async function resolveMountPath(state, relPath) {
  let key = relPath.replace(/^\/+/, "");
  let storeKeyPath = await resolveStoreKeyPath(state, key);
  if (!storeKeyPath.normalize("NFC").startsWith(state.mountDir))
    throw new PathTraversalError(`path escapes mount ${state.mountName}: ${relPath}`);
  return storeKeyPath;
}
//@ chunk-s61vbvea.js:112879-113026 placement
function getStorageKeyForPath(backend, state, mountPath) {
  if (backend === undefined || state.v5MemoryBase === undefined) return;
  let storageKey = storageKeyForMountPath(state.v5MemoryBase, state.mountDir, mountPath);
  return storageKey === undefined
    ? undefined
    : {
        backend,
        key: storageKey,
      };
}
//@ chunk-s61vbvea.js:113026-113408 placement
/**
 * 通过存储 v5（可用时）或文件系统 stat 记忆库中的本地文件；存储报错时转为带 code 的错误。
 */
async function statLocalEntry(backend, state, mountPath) {
  let storageKeyForPath = getStorageKeyForPath(backend, state, mountPath);
  if (storageKeyForPath === undefined) return stat(mountPath);
  let meta = await storageKeyForPath.backend.statMeta(storageKeyForPath.key);
  if (!meta.ok)
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `local entry not statable via storage: ${formatStorageError(meta.error)}`,
        "memory-sync: local entry not statable via storage",
      ),
      {
        cause: meta.error,
        viaStorage: true,
      },
      meta.error.code === "NotFound"
        ? {
            code: "ENOENT",
          }
        : isNonRegularFailure(meta.error)
          ? {
              code: meta.error.telemetryCode,
            }
          : {},
    );
  return meta.value;
}
//@ chunk-s61vbvea.js:113408-113810 placement
async function readLocalEntry(backend, state, mountPath) {
  let storageKeyForPath = getStorageKeyForPath(backend, state, mountPath);
  if (storageKeyForPath === undefined) return readFile(mountPath, "utf8");
  let text = await storageKeyForPath.backend.readText([storageKeyForPath.key]);
  if (!text.ok)
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `local entry not readable via storage: ${formatStorageError(text.error)}`,
        "memory-sync: local entry not readable via storage",
      ),
      {
        cause: text.error,
      },
    );
  let item = text.value.items[0];
  if (!item.found)
    throw Object.assign(Error("local entry absent via storage"), {
      code: "ENOENT",
    });
  return item.value;
}
//@ chunk-s61vbvea.js:113810-113876 placement
/**
 * 判断条目是否已发布（或依据已失效）。
 */
function isPublished(state) {
  return state.pulled || (state.invalidatedBasis ?? null) !== null;
}
//@ chunk-s61vbvea.js:113876-117036 placement
async function writeLocalEntry(state, relPath, content, updatedAt, storage) {
  let mountPath = await resolveMountPath(state, relPath);
  let publishFence = state.backend.publishFence;
  if (publishFence !== undefined && !(await canPublishFence(publishFence))) {
    await dropPulledFile(state, relPath, mountPath);
    return "dropped";
  }
  await removeEmptyStoreReceipt(state, storage);
  state.walkHashes.delete(relPath);
  let readStats = () =>
    lstat(mountPath).catch((error) => {
      if (isENOENT(error)) return null;
      throw error;
    });
  let storageKeyForPath = getStorageKeyForPath(storage, state, mountPath);
  if (storageKeyForPath !== undefined && publishFence !== undefined)
    throw Error(
      "multi-store-sync: a publishFence is not honoured on the storage write arm: add the publish-time check there before giving a storage-keyed store one",
    );
  if (storageKeyForPath !== undefined) {
    let throwStorageError = (error) => {
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `multi-store-sync: local entry not writable via storage: ${formatStorageError(error)}`,
          "multi-store-sync: local entry not writable via storage",
        ),
        {
          cause: error,
        },
      );
    };
    let writeOverExisting = async () => {
      let stats = await readStats();
      let writeResult = await storageKeyForPath.backend.write(storageKeyForPath.key, content, {
        publishDiscipline: "atomic",
        ...(stats?.isFile() === true && {
          exactMode: stats.mode & 511,
        }),
        mode: 438 & ~process.umask(),
      });
      if (writeResult.ok) return;
      if (stats?.isFile() === true) {
        let tornWrite = await detectTornWrite(storage, state, mountPath, content);
        let outcome =
          tornWrite === "absent"
            ? "removed"
            : tornWrite === "tornPrefix" && (isPartialWriteFailure(writeResult.error) || stats.size === 0)
              ? "torn"
              : null;
        if (outcome !== null) {
          logForDebugging(
            `multi-store-sync[${state.mountName}]: ${relPath} was ${outcome === "removed" ? "removed" : "left torn"} by a failed publish; writing an empty marker to re-fetch over`,
            {
              level: "warn",
            },
          );
          let date = new Date(Date.now() - 2 * WRITE_SETTLE_MS);
          let markerResult = await storageKeyForPath.backend.write(storageKeyForPath.key, "", {
            ...(outcome === "removed" && {
              precondition: {
                type: "ifAbsent",
              },
            }),
            publishDiscipline: "atomic",
            parent: "mustExist",
            exactMode: stats.mode & 511,
          });
          if (markerResult.ok) {
            state.failedWritesMarked = (state.failedWritesMarked ?? 0) + 1;
            await lutimes(mountPath, date, date).catch(() => {});
          } else
            logForDebugging(
              `multi-store-sync[${state.mountName}]: empty marker for ${relPath} not written: ${formatStorageError(markerResult.error)}`,
              {
                level: "warn",
              },
            );
        }
      }
      throwStorageError(writeResult.error);
    };
    if (isPublished(state)) {
      await writeOverExisting();
      return "published";
    }
    let createResult = await storageKeyForPath.backend.write(storageKeyForPath.key, content, {
      precondition: {
        type: "ifAbsent",
      },
      publishDiscipline: "atomic",
      mode: 438 & ~process.umask(),
    });
    if (!createResult.ok) {
      if (createResult.error.code !== "AlreadyExists" && !isNonRegularFailure(createResult.error))
        throwStorageError(createResult.error);
      await writeOverExisting();
      return "published";
    }
  } else
    await mkdir(dirname(mountPath), {
      recursive: true,
    });
  if (storageKeyForPath === undefined) {
    let stats = await readStats();
    let linked = false;
    if (stats === null) {
      let tempPath = await writeIfMissing(mountPath, content, 438);
      try {
        if (publishFence !== undefined) {
          if (!(await fenceExists(publishFence)) || !publishFence.mayPublish()) {
            await dropPulledFile(state, relPath, mountPath);
            return "dropped";
          }
        }
        await link(tempPath, mountPath);
        linked = true;
      } catch {
        stats = await readStats();
      } finally {
        await unlink(tempPath).catch(() => {});
      }
    }
    if (!linked) {
      let existingMode = stats?.isFile() ? stats.mode & 511 : null;
      let writeOptions =
        existingMode !== null
          ? {
              exactMode: existingMode,
              inPlaceOnTempCreateRefused: true,
            }
          : {
              createMode: 438,
            };
      if (publishFence !== undefined && !(await fenceExists(publishFence))) {
        await dropPulledFile(state, relPath, mountPath);
        return "dropped";
      }
      try {
        await publishWriteAtomic(mountPath, content, {
          ...writeOptions,
          ...(publishFence !== undefined && {
            beforePublish: () => publishFence.mayPublish(),
          }),
        });
      } catch (error) {
        if (error instanceof PublishRefusedError) {
          await dropPulledFile(state, relPath, mountPath);
          return "dropped";
        }
        let outcome = targetOutcomeOf(error);
        let writeMarker =
          outcome === "partial" &&
          (await detectTornWrite(storage, state, mountPath, content)) === "tornPrefix"
            ? () => publishWriteAtomic(mountPath, "", writeOptions)
            : outcome === "removed" && existingMode !== null
              ? () => writeNewFile(mountPath, "", existingMode)
              : null;
        if (writeMarker !== null) {
          logForDebugging(
            `multi-store-sync[${state.mountName}]: ${relPath} was ${outcome === "removed" ? "removed" : "left torn"} by a failed in-place write; writing an empty marker to re-fetch over`,
            {
              level: "warn",
            },
          );
          let date = new Date(Date.now() - 2 * WRITE_SETTLE_MS);
          await writeMarker()
            .then(() => {
              state.failedWritesMarked = (state.failedWritesMarked ?? 0) + 1;
              return lutimes(mountPath, date, date).catch(() => {});
            })
            .catch((error) =>
              logForDebugging(
                `multi-store-sync[${state.mountName}]: empty marker for ${relPath} not written: ${errorMessage(error)}`,
                {
                  level: "warn",
                },
              ),
            );
        }
        throw error;
      }
    }
    if (publishFence !== undefined && !(await fenceExists(publishFence))) {
      await unlink(mountPath).catch(() => {});
      await dropPulledFile(state, relPath, mountPath);
      return "dropped";
    }
    if (stats !== null) return "published";
  }
  if (isPublished(state)) return "published";
  let date = new Date(updatedAt);
  if (!Number.isNaN(date.getTime()) && date.getTime() <= Date.now())
    await utimes(mountPath, date, date).catch(() => {});
  return "published";
}
//@ chunk-s61vbvea.js:117036-117092 placement
/**
 * 发布栅栏存在且允许发布。
 */
async function canPublishFence(publishFence) {
  return (await fenceExists(publishFence)) && publishFence.mayPublish();
}
//@ chunk-s61vbvea.js:117092-117160 placement
/**
 * 判断栅栏文件是否存在。
 */
async function fenceExists(publishFence) {
  try {
    await lstat(publishFence.path);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:117160-117229 placement
async function dropPulledFile(store, key, startPath) {
  store.pullDropped.add(key);
  await removeEmptyParentDirs(store.mountDir, startPath);
}
//@ chunk-s61vbvea.js:117229-117395 placement = setCwdState (1)
async function removeEmptyParentDirs(mountDir, startPath) {
  let normalized = resolve(mountDir).normalize("NFC");
  for (
    let parentDir = dirname(startPath);
    parentDir.normalize("NFC") !== normalized && parentDir.normalize("NFC").startsWith(normalized + sep);
    parentDir = dirname(parentDir)
  )
    try {
      await rmdir(parentDir);
    } catch {
      return;
    }
}
//@ chunk-s61vbvea.js:117395-117453 placement
/**
 * 判断文件为空且修改时间已超过稳定期。
 */
function isEmptyAndSettled(stats) {
  return stats.size === 0 && Date.now() - stats.mtimeMs > WRITE_SETTLE_MS;
}
//@ chunk-s61vbvea.js:117453-117536 placement
/**
 * 取错误里的 targetOutcome。
 */
function targetOutcomeOf(error) {
  return error instanceof Error && "targetOutcome" in error ? error.targetOutcome : null;
}
//@ chunk-s61vbvea.js:117536-118234 placement
/**
 * 判断写入目标是否只写了一部分（现有内容是预期内容的真前缀）：返回 tornPrefix、absent 或 other。
 */
async function detectTornWrite(backend, state, mountPath, content) {
  let buffer = Buffer.from(content, "utf8");
  let isProperPrefix = (prefix) =>
    prefix.length > 0 && prefix.length < buffer.length && buffer.subarray(0, prefix.length).equals(prefix);
  let storageTarget = getStorageKeyForPath(backend, state, mountPath);
  try {
    if (storageTarget !== undefined) {
      let readResult = await storageTarget.backend.read(
        [
          {
            key: storageTarget.key,
            offset: 0,
            length: buffer.length,
          },
        ],
        {
          symlinks: "refuse",
        },
      );
      if (!readResult.ok) return "other";
      let item = readResult.value.items[0];
      if (!item.found) return "absent";
      return item.totalBytes < buffer.length && isProperPrefix(item.value) ? "tornPrefix" : "other";
    }
    let noFollow = await openNoFollow_2(mountPath);
    if (!noFollow.ok) return noFollow.error.kind === "absent" ? "absent" : "other";
    let handle = noFollow.value;
    try {
      let readBuffer = Buffer.alloc(buffer.length);
      let offset = 0;
      while (offset < readBuffer.length) {
        let { bytesRead } = await handle.read(readBuffer, offset, readBuffer.length - offset, offset);
        if (bytesRead === 0) break;
        offset += bytesRead;
      }
      return isProperPrefix(readBuffer.subarray(0, offset)) ? "tornPrefix" : "other";
    } finally {
      await handle.close().catch(() => {});
    }
  } catch {
    return "other";
  }
}
//@ chunk-s61vbvea.js:118234-118299 placement
/**
 * 判断错误是否为“只写了一部分”。
 */
function isPartialWriteFailure(error) {
  return error.code === "Failed" && targetOutcomeOf(error.cause) === "partial";
}
//@ chunk-s61vbvea.js:118299-118391 placement
/**
 * 判断本地文件是否被编辑过。
 */
async function isLocallyEditedFile(state, relPath, storage) {
  try {
    let mountPath = await resolveMountPath(state, relPath);
    return isEmptyAndSettled(await statLocalEntry(storage, state, mountPath));
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:118391-118790 placement
/**
 * 判断记忆存储中的文件是否在本地被编辑过：对比拉取写入时间或创建时间；存储层不支持 stat 的叶子视为本地编辑。
 */
async function isLocallyEdited(state, relPath, storage) {
  if (state.pulled) return false;
  try {
    let mountPath = await resolveMountPath(state, relPath);
    let stats = await statLocalEntry(storage, state, mountPath);
    if (isEmptyAndSettled(stats)) return false;
    let mtimeMs = state.pullWritten.get(relPath)?.mtimeMs;
    if (mtimeMs !== undefined) return stats.mtimeMs > mtimeMs;
    return stats.mtimeMs >= state.createdAtMs - 1000;
  } catch (error) {
    let unstatable =
      error instanceof Error && "viaStorage" in error && isNonRegularError(getErrnoCode(error));
    if (unstatable)
      logForDebugging(
        `multi-store-sync[${state.mountName}]: ${relPath} is a leaf the storage backend will not stat; kept as a local edit`,
      );
    return unstatable;
  }
}
//@ chunk-s61vbvea.js:118790-118962 placement
async function isLocalContentEqual(state, relPath, content, storage) {
  try {
    let mountPath = await resolveMountPath(state, relPath);
    let stats = await statLocalEntry(storage, state, mountPath);
    if (stats.size > MAX_MEMORY_BYTES || stats.size !== Buffer.byteLength(content, "utf8")) return false;
    return (await readLocalEntry(storage, state, mountPath)) === content;
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:118962-119089 placement
async function recordPullWrite(state, relPath, sha256, storage) {
  try {
    let mountPath = await resolveMountPath(state, relPath);
    let stats = await statLocalEntry(storage, state, mountPath);
    state.pullWritten.set(relPath, {
      mtimeMs: stats.mtimeMs,
      sha256,
    });
  } catch {}
}
//@ chunk-s61vbvea.js:119089-119261 placement
function getEntryBaseline(state, entries, diskPaths, ref) {
  if (!diskPaths.has(ref.path))
    return {
      id: ref.id,
      sha256: EMPTY_CONTENT_HASH,
    };
  let sha256 = entries.get(ref.path)?.sha256;
  let knownSha256 = state.pulled ? sha256 : (state.pullWritten.get(ref.path)?.sha256 ?? sha256);
  return {
    id: ref.id,
    sha256: knownSha256 ?? EMPTY_CONTENT_HASH,
  };
}
//@ chunk-s61vbvea.js:119261-119754 placement
async function deleteLocalEntry(state, relPath, storage) {
  try {
    let mountPath = await resolveMountPath(state, relPath);
    let storageKeyForPath = getStorageKeyForPath(storage, state, mountPath);
    if (storageKeyForPath !== undefined) {
      let deleteResult = await storageKeyForPath.backend.delete(storageKeyForPath.key);
      if (!deleteResult.ok)
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `multi-store-sync: local entry not deletable via storage: ${formatStorageError(deleteResult.error)}`,
            "multi-store-sync: local entry not deletable via storage",
          ),
          {
            cause: deleteResult.error,
          },
        );
    } else await unlink(mountPath);
  } catch (error) {
    if (error instanceof PathTraversalError) {
      logForDebugging(`multi-store-sync[${state.mountName}]: refusing to delete escaping path ${relPath}`, {
        level: "warn",
      });
      return;
    }
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
  state.pullWritten.delete(relPath);
}
export {
  statLocalEntry,
  isLocallyEdited,
  getV5MemoryContext,
  collectLocalMemoryEntries,
  removeEmptyStoreReceipt,
  getEntryBaseline,
  isLocallyEditedFile,
  writeLocalEntry,
  recordPullWrite,
  isPublished,
  deleteLocalEntry,
  isLocalContentEqual,
  resolveMountPath,
  readLocalEntry,
};
