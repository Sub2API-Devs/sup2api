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
import { STAT_CONCURRENCY, MAX_MEMORY_BYTES, MTIME_SETTLE_MS, WRITE_SETTLE_MS, Qr } from "./syncConfig.js";
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
async function removeEmptyStoreReceipt(e, n) {
  if (e.emptyReceiptOnDisk !== true || e.pulled) return;
  let persistedBasis = await loadPersistedBasis(e, n);
  let reason = persistedBasis?.ok === false ? persistedBasis.reason : null;
  if (reason !== "empty_store" && reason !== "absent" && reason !== "read_error") {
    e.emptyReceiptOnDisk = false;
    return;
  }
  if (reason === "read_error" || !(await deleteSyncBasis(e, n)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "multi-store-sync: empty store receipt not removed",
      "multi-store-sync: empty store receipt not removed",
    );
  e.removedEmptyReceipt = true;
}
//@ chunk-s61vbvea.js:106691-106841 placement
function getV5MemoryContext(e, n) {
  return isStorageV5Enabled() && n !== undefined && e.v5MemoryBase !== undefined
    ? {
        storageV5: n,
        base: e.v5MemoryBase,
        manifestSeen: e.manifestSeenThisSession === true,
      }
    : undefined;
}
//@ chunk-s61vbvea.js:106841-106851 placement
/**
 * 分批处理的批大小（64）。
 */
var SLICE_BATCH_SIZE = 64;
//@ chunk-s61vbvea.js:106851-107424 placement
async function walkMountDirect(e, n) {
  async function r(s, h) {
    let y;
    try {
      y = await readdir(s, {
        withFileTypes: true,
      });
    } catch (error) {
      return getErrnoCode(error) !== "ENOENT";
    }
    let found = y.find(
      (R) => !isValidKeySegment(R.name) || (R.isDirectory() && isNoiseTempFile(R.name, true)),
    );
    if (found) {
      logForDebugging(
        `[memory-sync] mount walk goes direct this cycle: ${h || "."} holds a name the storage interface cannot list (${!isValidKeySegment(found.name) ? "outside the key grammar" : "a staging-shaped directory"})`,
      );
      return true;
    }
    return (
      await Promise.all(
        y
          .filter((R) => R.isDirectory() && !R.name.startsWith("."))
          .map((R) => {
            let x = h ? `${h}/${R.name}` : R.name;
            return n && n(x) ? false : r(join(s, R.name), x);
          }),
      )
    ).some(Boolean);
  }
  return r(e, "");
}
//@ chunk-s61vbvea.js:107424-107550 placement
function throwMountWalkFailure(error) {
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `mount walk failed: ${formatStorageError(error)}`,
    "multi-store-sync: mount walk failed through the storage interface",
  );
}
//@ chunk-s61vbvea.js:107550-108889 placement
async function collectLocalMemoryEntries(
  mountDir,
  excludeKey,
  r,
  v5MemoryBase,
  manifestSeenThisSession,
  walkHashes,
  S,
) {
  if (
    isStorageV5Enabled() &&
    r !== undefined &&
    v5MemoryBase !== undefined &&
    !(await walkMountDirect(mountDir, excludeKey))
  )
    return readStoreMountEntries(
      mountDir,
      excludeKey,
      {
        storageV5: r,
        base: v5MemoryBase,
        manifestSeen: manifestSeenThisSession === true,
      },
      S,
    );
  let R = new Map();
  let x = new Set();
  let P = [];
  let j = [];
  let G = true;
  let L = false;
  let now = Date.now();
  let yieldingRunner = createYieldingRunner({
    maxConcurrent: STAT_CONCURRENCY,
  });
  async function Z(ee) {
    let ae;
    try {
      ae = await readdir(ee, {
        withFileTypes: true,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT") {
        G = false;
        if (ee === mountDir) L = true;
        return;
      }
      if (errnoCode === "EACCES" || errnoCode === "EPERM") {
        G = false;
        return;
      }
      throw error;
    }
    await Promise.all(
      ae.map(async (se) => {
        let re = join(ee, se.name);
        if (se.isDirectory()) {
          if (se.name.startsWith(".")) return;
          if (excludeKey) {
            let joined = relative(mountDir, re).split(sep).join("/");
            if (excludeKey(joined)) return;
          }
          await Z(re);
          await yieldingRunner.maybeYield();
          return;
        }
        if (!se.isFile() || !hasMemoryExtension(se.name)) return;
        await yieldingRunner.runBounded(async () => {
          let he = "/" + relative(mountDir, re).split(sep).join("/");
          x.add(he);
          try {
            let Se = await stat(re);
            if (Se.size > MAX_MEMORY_BYTES) {
              j.push({
                path: he,
                size: Se.size,
              });
              logForDebugging(`multi-store-sync: skipping oversized ${he} (${Se.size}B)`, {
                level: "warn",
              });
              return;
            }
            let cachedEntry = getCachedEntry(walkHashes, he, Se.mtimeMs, Se.ctimeMs, Se.size);
            if (cachedEntry !== undefined && !isHashChanged(S, he, cachedEntry.sha256)) {
              R.set(he, cachedEntry);
              return;
            }
            let file = await readFile(re, "utf8");
            let contentHash = computeContentHash(file);
            cacheEntry(walkHashes, he, Se.mtimeMs, Se.ctimeMs, Se.size, contentHash, now);
            R.set(he, readEntryContent(he, file, contentHash, S, P));
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "ENOENT") return;
            if (errnoCode === "EACCES" || errnoCode === "EPERM") {
              G = false;
              return;
            }
            throw error;
          }
        });
      }),
    );
  }
  await Z(mountDir);
  if (G && !L) removeStaleKeys(walkHashes, R);
  return {
    entries: R,
    diskPaths: x,
    diskTrusted: G,
    rootMissing: L,
    skippedSecretPaths: P,
    skippedOversizedPaths: j,
  };
}
//@ chunk-s61vbvea.js:108889-108948 placement
/**
 * 判断缓存里的哈希是否与新值不同。
 */
function isHashChanged(e, n, r) {
  return e !== undefined && e.get(n)?.sha256 !== r;
}
//@ chunk-s61vbvea.js:108948-109146 placement
function readEntryContent(e, n, contentHash, s, h) {
  if (!isHashChanged(s, e, contentHash))
    return {
      sha256: contentHash,
    };
  if (scanSecretsInVariants(n).length > 0) {
    h.push(e);
    logForDebugging(`multi-store-sync: skipping ${e} (secret detected)`, {
      level: "warn",
    });
    return {
      sha256: contentHash,
    };
  }
  return {
    sha256: contentHash,
    content: n,
  };
}
//@ chunk-s61vbvea.js:109146-109259 placement
function getCachedEntry(e, n, mtimeMs, ctimeMs, h) {
  let y = e.get(n);
  return y !== undefined && y.mtimeMs === mtimeMs && y.ctimeMs === ctimeMs && y.size === h
    ? y.entry
    : undefined;
}
//@ chunk-s61vbvea.js:109259-109368 placement
function cacheEntry(e, n, mtimeMs, ctimeMs, size, sha256, S) {
  if (S - mtimeMs > MTIME_SETTLE_MS)
    e.set(n, {
      mtimeMs,
      ctimeMs,
      size,
      entry: {
        sha256,
      },
    });
  else e.delete(n);
}
//@ chunk-s61vbvea.js:109368-109432 placement
/**
 * 删除目标里已不再出现的键。
 */
function removeStaleKeys(e, n) {
  for (let key of e.keys()) if (!n.has(key)) e.delete(key);
}
//@ chunk-s61vbvea.js:109432-112702 placement
async function readStoreMountEntries(e, n, r, s) {
  let h = new Map();
  let y = new Set();
  let S = [];
  let w = [];
  let R = true;
  let rootMissing = false;
  let P = memoryMountScope(r.base);
  let j = r.base.baseRelPath.length;
  let yieldingRunner = createYieldingRunner({
    maxConcurrent: STAT_CONCURRENCY,
  });
  let L = [];
  let q = [];
  let Q;
  let Z = false;
  let ee = async (ce) => {
    let we = [];
    let ie = true;
    let allPages = await readAllPages(
      (Ie) =>
        r.storageV5.listEntries(ce, {
          ...(Ie !== undefined && {
            cursor: Ie,
          }),
          skipKeyStats: true,
          skipScopeStats: true,
        }),
      (Ie) => {
        for (let ke of Ie) {
          ie = false;
          if (ke.kind === "key") {
            L.push(ke);
            continue;
          }
          if (ke.scope.namespace !== "memory" || ke.viaSymlink === true) continue;
          let sliced = (ke.scope.relPath ?? []).slice(j);
          let last = sliced.at(-1);
          if (last === undefined || last.startsWith(".")) continue;
          if (n && n(sliced.join("/"))) continue;
          we.push(ke.scope);
        }
      },
    );
    if (allPages.status === "error") {
      if (allPages.error.code !== "InvalidArgument" && allPages.error.failureClass === "permission") {
        R = false;
        return;
      }
      Q ??= allPages.error;
      return;
    }
    if (allPages.status === "capped") Z = true;
    if (ie && ce !== P) q.push(ce);
    await Promise.all(we.map(ee));
  };
  await ee(P);
  if (Q !== undefined) throwMountWalkFailure(Q);
  if (Z) R = false;
  if (R && q.length > 0) {
    let ce = new Map();
    for (let ie of q) {
      let sliced = (ie.relPath ?? []).slice(0, -1);
      let { relPath, ...ke } = P;
      ce.set(sliced.join("/"), {
        ...ke,
        ...(sliced.length > 0 && {
          relPath: sliced,
        }),
      });
    }
    let we = new Set();
    for (let ie of ce.values())
      if (
        (
          await readAllPages(
            (Ie) =>
              r.storageV5.listEntries(ie, {
                ...(Ie !== undefined && {
                  cursor: Ie,
                }),
                skipKeyStats: true,
                skipScopeStats: true,
              }),
            (Ie) => {
              for (let ke of Ie)
                if (ke.kind === "scope" && ke.scope.namespace === "memory")
                  we.add((ke.scope.relPath ?? []).join("/"));
            },
          )
        ).status !== "done"
      )
        R = false;
    if (q.some((ie) => !we.has((ie.relPath ?? []).join("/")))) R = false;
  }
  if (L.length === 0 && r.manifestSeen) {
    let ce = storageKeyForMountPath(r.base, e, join(e, SYNC_MANIFEST_FILE));
    let we = ce === undefined ? undefined : await r.storageV5.statMeta(ce);
    if (we === undefined || !we.ok) {
      R = false;
      rootMissing = we === undefined || we.error.code === "NotFound";
    }
    return {
      entries: h,
      diskPaths: y,
      diskTrusted: R,
      rootMissing,
      skippedSecretPaths: S,
      skippedOversizedPaths: w,
    };
  }
  let ae = (relPath, we) => {
    h.set(relPath, readEntryContent(relPath, we, computeContentHash(we), s, S));
  };
  let se = [];
  for (let ce of L) {
    if (ce.key.namespace !== "memory") continue;
    let sliced = ce.key.relPath.slice(j);
    let last = sliced.at(-1);
    if (last === undefined) continue;
    let sliced_2 = sliced.slice(0, -1);
    if (sliced_2.some((ke) => ke.startsWith("."))) continue;
    if (n && sliced_2.some((ke, Me) => n(sliced_2.slice(0, Me + 1).join("/")))) continue;
    if (ce.viaSymlink === true || !hasMemoryExtension(last)) continue;
    let Ie = "/" + sliced.join("/");
    y.add(Ie);
    if (ce.size !== undefined && ce.size > MAX_MEMORY_BYTES) {
      w.push({
        path: Ie,
        size: ce.size,
      });
      logForDebugging(`multi-store-sync: skipping oversized ${Ie} (${ce.size}B)`, {
        level: "warn",
      });
      continue;
    }
    se.push({
      relPath: Ie,
      key: ce.key,
    });
  }
  let re = [];
  for (let ce = 0; ce < se.length; ce += SLICE_BATCH_SIZE) re.push(se.slice(ce, ce + SLICE_BATCH_SIZE));
  let results = await Promise.all(
    re.map((ce) =>
      yieldingRunner.runBounded(() =>
        r.storageV5.read(
          ce.map((we) => ({
            key: we.key,
            offset: 0,
            length: MAX_MEMORY_BYTES + 1,
          })),
        ),
      ),
    ),
  );
  let Se = [];
  for (let [ce, we] of results.entries()) {
    let ie = re[ce];
    if (we.ok) {
      Se.push({
        batch: ie,
        items: we.value.items,
      });
      continue;
    }
    if (we.error.code === "InvalidArgument" || we.error.failureClass !== "permission")
      throwMountWalkFailure(we.error);
    R = false;
    for (let Ee of ie) {
      let Ie = await r.storageV5.read([
        {
          key: Ee.key,
          offset: 0,
          length: MAX_MEMORY_BYTES + 1,
        },
      ]);
      if (Ie.ok)
        Se.push({
          batch: [Ee],
          items: Ie.value.items,
        });
      else if (Ie.error.code === "InvalidArgument" || Ie.error.failureClass !== "permission")
        throwMountWalkFailure(Ie.error);
    }
  }
  for (let { batch, items } of Se)
    for (let [ie, Ee] of items.entries()) {
      let { relPath } = batch[ie];
      if (!Ee.found) continue;
      if (Ee.totalBytes > MAX_MEMORY_BYTES) {
        w.push({
          path: relPath,
          size: Ee.totalBytes,
        });
        logForDebugging(`multi-store-sync: skipping oversized ${relPath} (${Ee.totalBytes}B)`, {
          level: "warn",
        });
        continue;
      }
      ae(relPath, Buffer.from(Ee.value).toString("utf8"));
      await yieldingRunner.maybeYield();
    }
  return {
    entries: h,
    diskPaths: y,
    diskTrusted: R,
    rootMissing,
    skippedSecretPaths: S,
    skippedOversizedPaths: w,
  };
}
//@ chunk-s61vbvea.js:112702-112879 placement
async function resolveMountPath(e, n) {
  let replaced = n.replace(/^\/+/, "");
  let storeKeyPath = await resolveStoreKeyPath(e, replaced);
  if (!storeKeyPath.normalize("NFC").startsWith(e.mountDir))
    throw new PathTraversalError(`path escapes mount ${e.mountName}: ${n}`);
  return storeKeyPath;
}
//@ chunk-s61vbvea.js:112879-113026 placement
function getStorageKeyForPath(e, n, r) {
  if (e === undefined || n.v5MemoryBase === undefined) return;
  let s = storageKeyForMountPath(n.v5MemoryBase, n.mountDir, r);
  return s === undefined
    ? undefined
    : {
        backend: e,
        key: s,
      };
}
//@ chunk-s61vbvea.js:113026-113408 placement
/**
 * 通过存储 v5（可用时）或文件系统 stat 记忆库中的本地文件；存储报错时转为带 code 的错误。
 */
async function statLocalEntry(e, n, mountPath) {
  let storageKeyForPath = getStorageKeyForPath(e, n, mountPath);
  if (storageKeyForPath === undefined) return stat(mountPath);
  let h = await storageKeyForPath.backend.statMeta(storageKeyForPath.key);
  if (!h.ok)
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `local entry not statable via storage: ${formatStorageError(h.error)}`,
        "memory-sync: local entry not statable via storage",
      ),
      {
        cause: h.error,
        viaStorage: true,
      },
      h.error.code === "NotFound"
        ? {
            code: "ENOENT",
          }
        : isNonRegularFailure(h.error)
          ? {
              code: h.error.telemetryCode,
            }
          : {},
    );
  return h.value;
}
//@ chunk-s61vbvea.js:113408-113810 placement
async function readLocalEntry(e, n, mountPath) {
  let storageKeyForPath = getStorageKeyForPath(e, n, mountPath);
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
  let y = text.value.items[0];
  if (!y.found)
    throw Object.assign(Error("local entry absent via storage"), {
      code: "ENOENT",
    });
  return y.value;
}
//@ chunk-s61vbvea.js:113810-113876 placement
/**
 * 判断条目是否已发布（或依据已失效）。
 */
function isPublished(e) {
  return e.pulled || (e.invalidatedBasis ?? null) !== null;
}
//@ chunk-s61vbvea.js:113876-117036 placement
async function writeLocalEntry(e, n, content, updatedAt, h) {
  let mountPath = await resolveMountPath(e, n);
  let publishFence = e.backend.publishFence;
  if (publishFence !== undefined && !(await canPublishFence(publishFence))) {
    await dropPulledFile(e, n, mountPath);
    return "dropped";
  }
  await removeEmptyStoreReceipt(e, h);
  e.walkHashes.delete(n);
  let w = () =>
    lstat(mountPath).catch((error) => {
      if (isENOENT(error)) return null;
      throw error;
    });
  let storageKeyForPath = getStorageKeyForPath(h, e, mountPath);
  if (storageKeyForPath !== undefined && publishFence !== undefined)
    throw Error(
      "multi-store-sync: a publishFence is not honoured on the storage write arm: add the publish-time check there before giving a storage-keyed store one",
    );
  if (storageKeyForPath !== undefined) {
    let P = (error) => {
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
    let j = async () => {
      let L = await w();
      let q = await storageKeyForPath.backend.write(storageKeyForPath.key, content, {
        publishDiscipline: "atomic",
        ...(L?.isFile() === true && {
          exactMode: L.mode & 511,
        }),
        mode: 438 & ~process.umask(),
      });
      if (q.ok) return;
      if (L?.isFile() === true) {
        let tornWrite = await detectTornWrite(h, e, mountPath, content);
        let Z =
          tornWrite === "absent"
            ? "removed"
            : tornWrite === "tornPrefix" && (isPartialWriteFailure(q.error) || L.size === 0)
              ? "torn"
              : null;
        if (Z !== null) {
          logForDebugging(
            `multi-store-sync[${e.mountName}]: ${n} was ${Z === "removed" ? "removed" : "left torn"} by a failed publish; writing an empty marker to re-fetch over`,
            {
              level: "warn",
            },
          );
          let date = new Date(Date.now() - 2 * WRITE_SETTLE_MS);
          let ae = await storageKeyForPath.backend.write(storageKeyForPath.key, "", {
            ...(Z === "removed" && {
              precondition: {
                type: "ifAbsent",
              },
            }),
            publishDiscipline: "atomic",
            parent: "mustExist",
            exactMode: L.mode & 511,
          });
          if (ae.ok) {
            e.failedWritesMarked = (e.failedWritesMarked ?? 0) + 1;
            await lutimes(mountPath, date, date).catch(() => {});
          } else
            logForDebugging(
              `multi-store-sync[${e.mountName}]: empty marker for ${n} not written: ${formatStorageError(ae.error)}`,
              {
                level: "warn",
              },
            );
        }
      }
      P(q.error);
    };
    if (isPublished(e)) {
      await j();
      return "published";
    }
    let G = await storageKeyForPath.backend.write(storageKeyForPath.key, content, {
      precondition: {
        type: "ifAbsent",
      },
      publishDiscipline: "atomic",
      mode: 438 & ~process.umask(),
    });
    if (!G.ok) {
      if (G.error.code !== "AlreadyExists" && !isNonRegularFailure(G.error)) P(G.error);
      await j();
      return "published";
    }
  } else
    await mkdir(dirname(mountPath), {
      recursive: true,
    });
  if (storageKeyForPath === undefined) {
    let P = await w();
    let j = false;
    if (P === null) {
      let G = await writeIfMissing(mountPath, content, 438);
      try {
        if (publishFence !== undefined) {
          if (!(await fenceExists(publishFence)) || !publishFence.mayPublish()) {
            await dropPulledFile(e, n, mountPath);
            return "dropped";
          }
        }
        await link(G, mountPath);
        j = true;
      } catch {
        P = await w();
      } finally {
        await unlink(G).catch(() => {});
      }
    }
    if (!j) {
      let G = P?.isFile() ? P.mode & 511 : null;
      let L =
        G !== null
          ? {
              exactMode: G,
              inPlaceOnTempCreateRefused: true,
            }
          : {
              createMode: 438,
            };
      if (publishFence !== undefined && !(await fenceExists(publishFence))) {
        await dropPulledFile(e, n, mountPath);
        return "dropped";
      }
      try {
        await publishWriteAtomic(mountPath, content, {
          ...L,
          ...(publishFence !== undefined && {
            beforePublish: () => publishFence.mayPublish(),
          }),
        });
      } catch (error) {
        if (error instanceof PublishRefusedError) {
          await dropPulledFile(e, n, mountPath);
          return "dropped";
        }
        let Q = targetOutcomeOf(error);
        let Z =
          Q === "partial" && (await detectTornWrite(h, e, mountPath, content)) === "tornPrefix"
            ? () => publishWriteAtomic(mountPath, "", L)
            : Q === "removed" && G !== null
              ? () => writeNewFile(mountPath, "", G)
              : null;
        if (Z !== null) {
          logForDebugging(
            `multi-store-sync[${e.mountName}]: ${n} was ${Q === "removed" ? "removed" : "left torn"} by a failed in-place write; writing an empty marker to re-fetch over`,
            {
              level: "warn",
            },
          );
          let date = new Date(Date.now() - 2 * WRITE_SETTLE_MS);
          await Z()
            .then(() => {
              e.failedWritesMarked = (e.failedWritesMarked ?? 0) + 1;
              return lutimes(mountPath, date, date).catch(() => {});
            })
            .catch((error) =>
              logForDebugging(
                `multi-store-sync[${e.mountName}]: empty marker for ${n} not written: ${errorMessage(error)}`,
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
      await dropPulledFile(e, n, mountPath);
      return "dropped";
    }
    if (P !== null) return "published";
  }
  if (isPublished(e)) return "published";
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
async function dropPulledFile(e, n, mountPath) {
  e.pullDropped.add(n);
  await removeEmptyParentDirs(e.mountDir, mountPath);
}
//@ chunk-s61vbvea.js:117229-117395 placement = setCwdState (1)
async function removeEmptyParentDirs(mountDir, n) {
  let normalized = resolve(mountDir).normalize("NFC");
  for (
    let s = dirname(n);
    s.normalize("NFC") !== normalized && s.normalize("NFC").startsWith(normalized + sep);
    s = dirname(s)
  )
    try {
      await rmdir(s);
    } catch {
      return;
    }
}
//@ chunk-s61vbvea.js:117395-117453 placement
/**
 * 判断文件为空且修改时间已超过稳定期。
 */
function isEmptyAndSettled(e) {
  return e.size === 0 && Date.now() - e.mtimeMs > WRITE_SETTLE_MS;
}
//@ chunk-s61vbvea.js:117453-117536 placement
/**
 * 取错误里的 targetOutcome。
 */
function targetOutcomeOf(e) {
  return e instanceof Error && "targetOutcome" in e ? e.targetOutcome : null;
}
//@ chunk-s61vbvea.js:117536-118234 placement
/**
 * 判断写入目标是否只写了一部分（现有内容是预期内容的真前缀）：返回 tornPrefix、absent 或 other。
 */
async function detectTornWrite(e, n, mountPath, s) {
  let buffer = Buffer.from(s, "utf8");
  let isProperPrefix = (w) =>
    w.length > 0 && w.length < buffer.length && buffer.subarray(0, w.length).equals(w);
  let storageTarget = getStorageKeyForPath(e, n, mountPath);
  try {
    if (storageTarget !== undefined) {
      let x = await storageTarget.backend.read(
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
      if (!x.ok) return "other";
      let P = x.value.items[0];
      if (!P.found) return "absent";
      return P.totalBytes < buffer.length && isProperPrefix(P.value) ? "tornPrefix" : "other";
    }
    let noFollow = await openNoFollow_2(mountPath);
    if (!noFollow.ok) return noFollow.error.kind === "absent" ? "absent" : "other";
    let R = noFollow.value;
    try {
      let x = Buffer.alloc(buffer.length);
      let P = 0;
      while (P < x.length) {
        let { bytesRead } = await R.read(x, P, x.length - P, P);
        if (bytesRead === 0) break;
        P += bytesRead;
      }
      return isProperPrefix(x.subarray(0, P)) ? "tornPrefix" : "other";
    } finally {
      await R.close().catch(() => {});
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
async function isLocallyEditedFile(e, n, r) {
  try {
    let mountPath = await resolveMountPath(e, n);
    return isEmptyAndSettled(await statLocalEntry(r, e, mountPath));
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:118391-118790 placement
/**
 * 判断记忆存储中的文件是否在本地被编辑过：对比拉取写入时间或创建时间；存储层不支持 stat 的叶子视为本地编辑。
 */
async function isLocallyEdited(e, n, r) {
  if (e.pulled) return false;
  try {
    let mountPath = await resolveMountPath(e, n);
    let h = await statLocalEntry(r, e, mountPath);
    if (isEmptyAndSettled(h)) return false;
    let mtimeMs = e.pullWritten.get(n)?.mtimeMs;
    if (mtimeMs !== undefined) return h.mtimeMs > mtimeMs;
    return h.mtimeMs >= e.createdAtMs - 1000;
  } catch (error) {
    let h = error instanceof Error && "viaStorage" in error && isNonRegularError(getErrnoCode(error));
    if (h)
      logForDebugging(
        `multi-store-sync[${e.mountName}]: ${n} is a leaf the storage backend will not stat; kept as a local edit`,
      );
    return h;
  }
}
//@ chunk-s61vbvea.js:118790-118962 placement
async function isLocalContentEqual(e, n, content, s) {
  try {
    let mountPath = await resolveMountPath(e, n);
    let y = await statLocalEntry(s, e, mountPath);
    if (y.size > MAX_MEMORY_BYTES || y.size !== Buffer.byteLength(content, "utf8")) return false;
    return (await readLocalEntry(s, e, mountPath)) === content;
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:118962-119089 placement
async function recordPullWrite(e, n, sha256, s) {
  try {
    let mountPath = await resolveMountPath(e, n);
    let y = await statLocalEntry(s, e, mountPath);
    e.pullWritten.set(n, {
      mtimeMs: y.mtimeMs,
      sha256,
    });
  } catch {}
}
//@ chunk-s61vbvea.js:119089-119261 placement
function getEntryBaseline(e, n, diskPaths, s) {
  if (!diskPaths.has(s.path))
    return {
      id: s.id,
      sha256: Qr,
    };
  let sha256 = n.get(s.path)?.sha256;
  let y = e.pulled ? sha256 : (e.pullWritten.get(s.path)?.sha256 ?? sha256);
  return {
    id: s.id,
    sha256: y ?? Qr,
  };
}
//@ chunk-s61vbvea.js:119261-119754 placement
async function deleteLocalEntry(e, n, r) {
  try {
    let mountPath = await resolveMountPath(e, n);
    let storageKeyForPath = getStorageKeyForPath(r, e, mountPath);
    if (storageKeyForPath !== undefined) {
      let y = await storageKeyForPath.backend.delete(storageKeyForPath.key);
      if (!y.ok)
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `multi-store-sync: local entry not deletable via storage: ${formatStorageError(y.error)}`,
            "multi-store-sync: local entry not deletable via storage",
          ),
          {
            cause: y.error,
          },
        );
    } else await unlink(mountPath);
  } catch (error) {
    if (error instanceof PathTraversalError) {
      logForDebugging(`multi-store-sync[${e.mountName}]: refusing to delete escaping path ${n}`, {
        level: "warn",
      });
      return;
    }
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
  e.pullWritten.delete(n);
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
