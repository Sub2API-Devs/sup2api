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
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lutimes,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  link,
  unlink,
  unlink as unlink_2,
  utimes,
  rmdir,
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
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
} from "path";
import { loadPersistedBasis, deleteSyncBasis, Jn } from "./syncManifest.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  isENOENT,
  errorMessage,
} from "../../utils/errors.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { vg } from "./syncFiles.js";
import { logForDebugging } from "../../utils/debug.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { createYieldingRunner } from "./exportStream.js";
import {
  STAT_CONCURRENCY,
  MAX_MEMORY_BYTES,
  MTIME_SETTLE_MS,
  WRITE_SETTLE_MS,
  repeat,
} from "./syncConfig.js";
import { oVr, k7n } from "../memoryStore/memoryKeys.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { memoryMountScope } from "./mountRoots.js";
import { readAllPages } from "../../utils/pagedRead.js";
import { storageKeyForMountPath } from "../../memdir/teamMemPrompts.js";
import { resolveStoreKeyPath } from "./multiStoreSync.js";
import { PathTraversalError } from "../../memdir/teamMemPaths.js";
import { $Zn, FX } from "./pathScrub.js";
import {
  writeIfMissing,
  publishWriteAtomic,
  PublishRefusedError,
  writeNewFile,
} from "../../utils/atomicPublishWrite.js";
import { openNoFollow_2 } from "../../utils/fsSafety/hardenedRead.js";

/**
 * 空库回执仍在磁盘且未拉取时，按基线状态删除回执；无法删除时抛错。
 */
//@ chunk-s61vbvea.js:106312-106691 placement
async function removeEmptyStoreReceipt(e, n) {
  if (e.emptyReceiptOnDisk !== !0 || e.pulled) return;
  let r = await loadPersistedBasis(e, n),
    s = r?.ok === !1 ? r.reason : null;
  if (s !== "empty_store" && s !== "absent" && s !== "read_error") {
    e.emptyReceiptOnDisk = !1;
    return;
  }
  if (s === "read_error" || !(await deleteSyncBasis(e, n)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "multi-store-sync: empty store receipt not removed",
      "multi-store-sync: empty store receipt not removed",
    );
  e.removedEmptyReceipt = !0;
}
//@ chunk-s61vbvea.js:106691-106841 placement
function getV5MemoryContext(e, n) {
  return isStorageV5Enabled() && n !== void 0 && e.v5MemoryBase !== void 0
    ? { storageV5: n, base: e.v5MemoryBase, manifestSeen: e.manifestSeenThisSession === !0 }
    : void 0;
}
//@ chunk-s61vbvea.js:106841-106851 placement
var Ug = 64;
//@ chunk-s61vbvea.js:106851-107424 placement
async function walkMountDirect(e, n) {
  async function r(s, h) {
    let y;
    try {
      y = await readdir_2(s, { withFileTypes: !0 });
    } catch (error) {
      return getErrnoCode(error) !== "ENOENT";
    }
    let found = y.find((R) => !isValidKeySegment(R.name) || (R.isDirectory() && vg(R.name, !0)));
    if (found)
      return (
        logForDebugging(
          `[memory-sync] mount walk goes direct this cycle: ${h || "."} holds a name the storage interface cannot list (${!isValidKeySegment(found.name) ? "outside the key grammar" : "a staging-shaped directory"})`,
        ),
        !0
      );
    return (
      await Promise.all(
        y
          .filter((R) => R.isDirectory() && !R.name.startsWith("."))
          .map((R) => {
            let x = h ? `${h}/${R.name}` : R.name;
            return n && n(x) ? !1 : r(join_5(s, R.name), x);
          }),
      )
    ).some(Boolean);
  }
  return r(e, "");
}
//@ chunk-s61vbvea.js:107424-107550 placement
function throwMountWalkFailure(e) {
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `mount walk failed: ${formatStorageError(e)}`,
    "multi-store-sync: mount walk failed through the storage interface",
  );
}
//@ chunk-s61vbvea.js:107550-108889 placement
async function collectLocalMemoryEntries(e, n, r, s, h, y, S) {
  if (isStorageV5Enabled() && r !== void 0 && s !== void 0 && !(await walkMountDirect(e, n)))
    return readStoreMountEntries(e, n, { storageV5: r, base: s, manifestSeen: h === !0 }, S);
  let R = new Map(),
    x = new Set(),
    P = [],
    j = [],
    G = !0,
    L = !1,
    now = Date.now(),
    Q = createYieldingRunner({ maxConcurrent: STAT_CONCURRENCY });
  async function Z(ee) {
    let ae;
    try {
      ae = await readdir_2(ee, { withFileTypes: !0 });
    } catch (error) {
      let re = getErrnoCode(error);
      if (re === "ENOENT") {
        if (((G = !1), ee === e)) L = !0;
        return;
      }
      if (re === "EACCES" || re === "EPERM") {
        G = !1;
        return;
      }
      throw error;
    }
    await Promise.all(
      ae.map(async (se) => {
        let re = join_5(ee, se.name);
        if (se.isDirectory()) {
          if (se.name.startsWith(".")) return;
          if (n) {
            let joined = relative_2(e, re).split(sep_2).join("/");
            if (n(joined)) return;
          }
          (await Z(re), await Q.maybeYield());
          return;
        }
        if (!se.isFile() || !oVr(se.name)) return;
        await Q.runBounded(async () => {
          let he = "/" + relative_2(e, re).split(sep_2).join("/");
          x.add(he);
          try {
            let Se = await stat_3(re);
            if (Se.size > MAX_MEMORY_BYTES) {
              (j.push({ path: he, size: Se.size }),
                logForDebugging(`multi-store-sync: skipping oversized ${he} (${Se.size}B)`, {
                  level: "warn",
                }));
              return;
            }
            let ce = getCachedEntry(y, he, Se.mtimeMs, Se.ctimeMs, Se.size);
            if (ce !== void 0 && !ch(S, he, ce.sha256)) {
              R.set(he, ce);
              return;
            }
            let we = await readFile(re, "utf8"),
              ie = computeContentHash(we);
            (cacheEntry(y, he, Se.mtimeMs, Se.ctimeMs, Se.size, ie, now),
              R.set(he, readEntryContent(he, we, ie, S, P)));
          } catch (error) {
            let ce = getErrnoCode(error);
            if (ce === "ENOENT") return;
            if (ce === "EACCES" || ce === "EPERM") {
              G = !1;
              return;
            }
            throw error;
          }
        });
      }),
    );
  }
  if ((await Z(e), G && !L)) eC(y, R);
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
function ch(e, n, r) {
  return e !== void 0 && e.get(n)?.sha256 !== r;
}
//@ chunk-s61vbvea.js:108948-109146 placement
function readEntryContent(e, n, r, s, h) {
  if (!ch(s, e, r)) return { sha256: r };
  if (k7n(n).length > 0)
    return (
      h.push(e),
      logForDebugging(`multi-store-sync: skipping ${e} (secret detected)`, { level: "warn" }),
      { sha256: r }
    );
  return { sha256: r, content: n };
}
//@ chunk-s61vbvea.js:109146-109259 placement
function getCachedEntry(e, n, r, s, h) {
  let y = e.get(n);
  return y !== void 0 && y.mtimeMs === r && y.ctimeMs === s && y.size === h ? y.entry : void 0;
}
//@ chunk-s61vbvea.js:109259-109368 placement
function cacheEntry(e, n, r, s, h, y, S) {
  if (S - r > MTIME_SETTLE_MS) e.set(n, { mtimeMs: r, ctimeMs: s, size: h, entry: { sha256: y } });
  else e.delete(n);
}
//@ chunk-s61vbvea.js:109368-109432 placement
function eC(e, n) {
  for (let r of e.keys()) if (!n.has(r)) e.delete(r);
}
//@ chunk-s61vbvea.js:109432-112702 placement
async function readStoreMountEntries(e, n, r, s) {
  let h = new Map(),
    y = new Set(),
    S = [],
    w = [],
    R = !0,
    x = !1,
    P = memoryMountScope(r.base),
    j = r.base.baseRelPath.length,
    G = createYieldingRunner({ maxConcurrent: STAT_CONCURRENCY }),
    L = [],
    q = [],
    Q,
    Z = !1,
    ee = async (ce) => {
      let we = [],
        ie = !0,
        Ee = await readAllPages(
          (Ie) =>
            r.storageV5.listEntries(ce, {
              ...(Ie !== void 0 && { cursor: Ie }),
              skipKeyStats: !0,
              skipScopeStats: !0,
            }),
          (Ie) => {
            for (let ke of Ie) {
              if (((ie = !1), ke.kind === "key")) {
                L.push(ke);
                continue;
              }
              if (ke.scope.namespace !== "memory" || ke.viaSymlink === !0) continue;
              let sliced = (ke.scope.relPath ?? []).slice(j),
                at = sliced.at(-1);
              if (at === void 0 || at.startsWith(".")) continue;
              if (n && n(sliced.join("/"))) continue;
              we.push(ke.scope);
            }
          },
        );
      if (Ee.status === "error") {
        if (Ee.error.code !== "InvalidArgument" && Ee.error.failureClass === "permission") {
          R = !1;
          return;
        }
        Q ??= Ee.error;
        return;
      }
      if (Ee.status === "capped") Z = !0;
      if (ie && ce !== P) q.push(ce);
      await Promise.all(we.map(ee));
    };
  if ((await ee(P), Q !== void 0)) throwMountWalkFailure(Q);
  if (Z) R = !1;
  if (R && q.length > 0) {
    let ce = new Map();
    for (let ie of q) {
      let sliced = (ie.relPath ?? []).slice(0, -1),
        { relPath: relPath, ...ke } = P;
      ce.set(sliced.join("/"), { ...ke, ...(sliced.length > 0 && { relPath: sliced }) });
    }
    let we = new Set();
    for (let ie of ce.values())
      if (
        (
          await readAllPages(
            (Ie) =>
              r.storageV5.listEntries(ie, {
                ...(Ie !== void 0 && { cursor: Ie }),
                skipKeyStats: !0,
                skipScopeStats: !0,
              }),
            (Ie) => {
              for (let ke of Ie)
                if (ke.kind === "scope" && ke.scope.namespace === "memory")
                  we.add((ke.scope.relPath ?? []).join("/"));
            },
          )
        ).status !== "done"
      )
        R = !1;
    if (q.some((ie) => !we.has((ie.relPath ?? []).join("/")))) R = !1;
  }
  if (L.length === 0 && r.manifestSeen) {
    let ce = storageKeyForMountPath(r.base, e, join_5(e, Jn)),
      we = ce === void 0 ? void 0 : await r.storageV5.statMeta(ce);
    if (we === void 0 || !we.ok) ((R = !1), (x = we === void 0 || we.error.code === "NotFound"));
    return {
      entries: h,
      diskPaths: y,
      diskTrusted: R,
      rootMissing: x,
      skippedSecretPaths: S,
      skippedOversizedPaths: w,
    };
  }
  let ae = (ce, we) => {
      h.set(ce, readEntryContent(ce, we, computeContentHash(we), s, S));
    },
    se = [];
  for (let ce of L) {
    if (ce.key.namespace !== "memory") continue;
    let sliced = ce.key.relPath.slice(j),
      at = sliced.at(-1);
    if (at === void 0) continue;
    let sliced_2 = sliced.slice(0, -1);
    if (sliced_2.some((ke) => ke.startsWith("."))) continue;
    if (n && sliced_2.some((ke, Me) => n(sliced_2.slice(0, Me + 1).join("/")))) continue;
    if (ce.viaSymlink === !0 || !oVr(at)) continue;
    let Ie = "/" + sliced.join("/");
    if ((y.add(Ie), ce.size !== void 0 && ce.size > MAX_MEMORY_BYTES)) {
      (w.push({ path: Ie, size: ce.size }),
        logForDebugging(`multi-store-sync: skipping oversized ${Ie} (${ce.size}B)`, { level: "warn" }));
      continue;
    }
    se.push({ relPath: Ie, key: ce.key });
  }
  let re = [];
  for (let ce = 0; ce < se.length; ce += Ug) re.push(se.slice(ce, ce + Ug));
  let results = await Promise.all(
      re.map((ce) =>
        G.runBounded(() =>
          r.storageV5.read(ce.map((we) => ({ key: we.key, offset: 0, length: MAX_MEMORY_BYTES + 1 }))),
        ),
      ),
    ),
    Se = [];
  for (let [ce, we] of results.entries()) {
    let ie = re[ce];
    if (we.ok) {
      Se.push({ batch: ie, items: we.value.items });
      continue;
    }
    if (we.error.code === "InvalidArgument" || we.error.failureClass !== "permission")
      throwMountWalkFailure(we.error);
    R = !1;
    for (let Ee of ie) {
      let read = await r.storageV5.read([{ key: Ee.key, offset: 0, length: MAX_MEMORY_BYTES + 1 }]);
      if (read.ok) Se.push({ batch: [Ee], items: read.value.items });
      else if (read.error.code === "InvalidArgument" || read.error.failureClass !== "permission")
        throwMountWalkFailure(read.error);
    }
  }
  for (let { batch: batch, items: items } of Se)
    for (let [ie, Ee] of items.entries()) {
      let { relPath: relPath } = batch[ie];
      if (!Ee.found) continue;
      if (Ee.totalBytes > MAX_MEMORY_BYTES) {
        (w.push({ path: relPath, size: Ee.totalBytes }),
          logForDebugging(`multi-store-sync: skipping oversized ${relPath} (${Ee.totalBytes}B)`, {
            level: "warn",
          }));
        continue;
      }
      (ae(relPath, Buffer.from(Ee.value).toString("utf8")), await G.maybeYield());
    }
  return {
    entries: h,
    diskPaths: y,
    diskTrusted: R,
    rootMissing: x,
    skippedSecretPaths: S,
    skippedOversizedPaths: w,
  };
}
//@ chunk-s61vbvea.js:112702-112879 placement
async function resolveMountPath(e, n) {
  let replaced = n.replace(/^\/+/, ""),
    s = await resolveStoreKeyPath(e, replaced);
  if (!s.normalize("NFC").startsWith(e.mountDir))
    throw new PathTraversalError(`path escapes mount ${e.mountName}: ${n}`);
  return s;
}
//@ chunk-s61vbvea.js:112879-113026 placement
function getStorageKeyForPath(e, n, r) {
  if (e === void 0 || n.v5MemoryBase === void 0) return;
  let s = storageKeyForMountPath(n.v5MemoryBase, n.mountDir, r);
  return s === void 0 ? void 0 : { backend: e, key: s };
}
/**
 * 通过存储 v5（可用时）或文件系统 stat 记忆库中的本地文件；存储报错时转为带 code 的错误。
 */
//@ chunk-s61vbvea.js:113026-113408 placement
async function statLocalEntry(e, n, r) {
  let s = getStorageKeyForPath(e, n, r);
  if (s === void 0) return stat_3(r);
  let statMeta = await s.backend.statMeta(s.key);
  if (!statMeta.ok)
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `local entry not statable via storage: ${formatStorageError(statMeta.error)}`,
        "memory-sync: local entry not statable via storage",
      ),
      { cause: statMeta.error, viaStorage: !0 },
      statMeta.error.code === "NotFound"
        ? { code: "ENOENT" }
        : $Zn(statMeta.error)
          ? { code: statMeta.error.telemetryCode }
          : {},
    );
  return statMeta.value;
}
//@ chunk-s61vbvea.js:113408-113810 placement
async function readLocalEntry(e, n, r) {
  let s = getStorageKeyForPath(e, n, r);
  if (s === void 0) return readFile(r, "utf8");
  let text = await s.backend.readText([s.key]);
  if (!text.ok)
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `local entry not readable via storage: ${formatStorageError(text.error)}`,
        "memory-sync: local entry not readable via storage",
      ),
      { cause: text.error },
    );
  let y = text.value.items[0];
  if (!y.found) throw Object.assign(Error("local entry absent via storage"), { code: "ENOENT" });
  return y.value;
}
//@ chunk-s61vbvea.js:113810-113876 placement
function ku(e) {
  return e.pulled || (e.invalidatedBasis ?? null) !== null;
}
//@ chunk-s61vbvea.js:113876-117036 placement
async function writeLocalEntry(e, n, r, s, h) {
  let y = await resolveMountPath(e, n),
    publishFence = e.backend.publishFence;
  if (publishFence !== void 0 && !(await nC(publishFence))) return (await dropPulledFile(e, n, y), "dropped");
  (await removeEmptyStoreReceipt(e, h), e.walkHashes.delete(n));
  let w = () =>
      lstat(y).catch((P) => {
        if (isENOENT(P)) return null;
        throw P;
      }),
    R = getStorageKeyForPath(h, e, y);
  if (R !== void 0 && publishFence !== void 0)
    throw Error(
      "multi-store-sync: a publishFence is not honoured on the storage write arm: add the publish-time check there before giving a storage-keyed store one",
    );
  if (R !== void 0) {
    let P = (L) => {
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `multi-store-sync: local entry not writable via storage: ${formatStorageError(L)}`,
            "multi-store-sync: local entry not writable via storage",
          ),
          { cause: L },
        );
      },
      j = async () => {
        let L = await w(),
          write = await R.backend.write(R.key, r, {
            publishDiscipline: "atomic",
            ...(L?.isFile() === !0 && { exactMode: L.mode & 511 }),
            mode: 438 & ~process.umask(),
          });
        if (write.ok) return;
        if (L?.isFile() === !0) {
          let Q = await detectTornWrite(h, e, y, r),
            Z =
              Q === "absent"
                ? "removed"
                : Q === "tornPrefix" && (oC(write.error) || L.size === 0)
                  ? "torn"
                  : null;
          if (Z !== null) {
            logForDebugging(
              `multi-store-sync[${e.mountName}]: ${n} was ${Z === "removed" ? "removed" : "left torn"} by a failed publish; writing an empty marker to re-fetch over`,
              { level: "warn" },
            );
            let date = new Date(Date.now() - 2 * WRITE_SETTLE_MS),
              write = await R.backend.write(R.key, "", {
                ...(Z === "removed" && { precondition: { type: "ifAbsent" } }),
                publishDiscipline: "atomic",
                parent: "mustExist",
                exactMode: L.mode & 511,
              });
            if (write.ok)
              ((e.failedWritesMarked = (e.failedWritesMarked ?? 0) + 1),
                await lutimes(y, date, date).catch(() => {}));
            else
              logForDebugging(
                `multi-store-sync[${e.mountName}]: empty marker for ${n} not written: ${formatStorageError(write.error)}`,
                { level: "warn" },
              );
          }
        }
        P(write.error);
      };
    if (ku(e)) return (await j(), "published");
    let write = await R.backend.write(R.key, r, {
      precondition: { type: "ifAbsent" },
      publishDiscipline: "atomic",
      mode: 438 & ~process.umask(),
    });
    if (!write.ok) {
      if (write.error.code !== "AlreadyExists" && !$Zn(write.error)) P(write.error);
      return (await j(), "published");
    }
  } else await mkdir_2(dirname(y), { recursive: !0 });
  if (R === void 0) {
    let P = await w(),
      j = !1;
    if (P === null) {
      let G = await writeIfMissing(y, r, 438);
      try {
        if (publishFence !== void 0) {
          if (!(await wa(publishFence)) || !publishFence.mayPublish())
            return (await dropPulledFile(e, n, y), "dropped");
        }
        (await link(G, y), (j = !0));
      } catch {
        P = await w();
      } finally {
        await unlink(G).catch(() => {});
      }
    }
    if (!j) {
      let G = P?.isFile() ? P.mode & 511 : null,
        L = G !== null ? { exactMode: G, inPlaceOnTempCreateRefused: !0 } : { createMode: 438 };
      if (publishFence !== void 0 && !(await wa(publishFence)))
        return (await dropPulledFile(e, n, y), "dropped");
      try {
        await publishWriteAtomic(y, r, {
          ...L,
          ...(publishFence !== void 0 && { beforePublish: () => publishFence.mayPublish() }),
        });
      } catch (error) {
        if (error instanceof PublishRefusedError) return (await dropPulledFile(e, n, y), "dropped");
        let Q = mh(error),
          Z =
            Q === "partial" && (await detectTornWrite(h, e, y, r)) === "tornPrefix"
              ? () => publishWriteAtomic(y, "", L)
              : Q === "removed" && G !== null
                ? () => writeNewFile(y, "", G)
                : null;
        if (Z !== null) {
          logForDebugging(
            `multi-store-sync[${e.mountName}]: ${n} was ${Q === "removed" ? "removed" : "left torn"} by a failed in-place write; writing an empty marker to re-fetch over`,
            { level: "warn" },
          );
          let date = new Date(Date.now() - 2 * WRITE_SETTLE_MS);
          await Z()
            .then(
              () => (
                (e.failedWritesMarked = (e.failedWritesMarked ?? 0) + 1),
                lutimes(y, date, date).catch(() => {})
              ),
            )
            .catch((ae) =>
              logForDebugging(
                `multi-store-sync[${e.mountName}]: empty marker for ${n} not written: ${errorMessage(ae)}`,
                { level: "warn" },
              ),
            );
        }
        throw error;
      }
    }
    if (publishFence !== void 0 && !(await wa(publishFence)))
      return (await unlink(y).catch(() => {}), await dropPulledFile(e, n, y), "dropped");
    if (P !== null) return "published";
  }
  if (ku(e)) return "published";
  let date = new Date(s);
  if (!Number.isNaN(date.getTime()) && date.getTime() <= Date.now())
    await utimes(y, date, date).catch(() => {});
  return "published";
}
//@ chunk-s61vbvea.js:117036-117092 placement
async function nC(e) {
  return (await wa(e)) && e.mayPublish();
}
//@ chunk-s61vbvea.js:117092-117160 placement
async function wa(e) {
  try {
    return (await lstat(e.path), !0);
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:117160-117229 placement
async function dropPulledFile(e, n, r) {
  (e.pullDropped.add(n), await removeEmptyParentDirs(e.mountDir, r));
}
//@ chunk-s61vbvea.js:117229-117395 placement = setCwdState (1)
async function removeEmptyParentDirs(e, n) {
  let normalized = resolve(e).normalize("NFC");
  for (
    let s = dirname(n);
    s.normalize("NFC") !== normalized && s.normalize("NFC").startsWith(normalized + sep_2);
    s = dirname(s)
  )
    try {
      await rmdir(s);
    } catch {
      return;
    }
}
//@ chunk-s61vbvea.js:117395-117453 placement
function fh(e) {
  return e.size === 0 && Date.now() - e.mtimeMs > WRITE_SETTLE_MS;
}
//@ chunk-s61vbvea.js:117453-117536 placement
function mh(e) {
  return e instanceof Error && "targetOutcome" in e ? e.targetOutcome : null;
}
/**
 * 判断写入目标是否只写了一部分（现有内容是预期内容的真前缀）：返回 tornPrefix、absent 或 other。
 */
//@ chunk-s61vbvea.js:117536-118234 placement
async function detectTornWrite(e, n, r, s) {
  let buffer = Buffer.from(s, "utf8"),
    isProperPrefix = (w) =>
      w.length > 0 && w.length < buffer.length && buffer.subarray(0, w.length).equals(w),
    storageTarget = getStorageKeyForPath(e, n, r);
  try {
    if (storageTarget !== void 0) {
      let read = await storageTarget.backend.read(
        [{ key: storageTarget.key, offset: 0, length: buffer.length }],
        { symlinks: "refuse" },
      );
      if (!read.ok) return "other";
      let P = read.value.items[0];
      if (!P.found) return "absent";
      return P.totalBytes < buffer.length && isProperPrefix(P.value) ? "tornPrefix" : "other";
    }
    let w = await openNoFollow_2(r);
    if (!w.ok) return w.error.kind === "absent" ? "absent" : "other";
    let R = w.value;
    try {
      let alloc = Buffer.alloc(buffer.length),
        P = 0;
      while (P < alloc.length) {
        let { bytesRead: bytesRead } = await R.read(alloc, P, alloc.length - P, P);
        if (bytesRead === 0) break;
        P += bytesRead;
      }
      return isProperPrefix(alloc.subarray(0, P)) ? "tornPrefix" : "other";
    } finally {
      await R.close().catch(() => {});
    }
  } catch {
    return "other";
  }
}
//@ chunk-s61vbvea.js:118234-118299 placement
function oC(e) {
  return e.code === "Failed" && mh(e.cause) === "partial";
}
//@ chunk-s61vbvea.js:118299-118391 placement
async function Eu(e, n, r) {
  try {
    let s = await resolveMountPath(e, n);
    return fh(await statLocalEntry(r, e, s));
  } catch {
    return !1;
  }
}
/**
 * 判断记忆存储中的文件是否在本地被编辑过：对比拉取写入时间或创建时间；存储层不支持 stat 的叶子视为本地编辑。
 */
//@ chunk-s61vbvea.js:118391-118790 placement
async function isLocallyEdited(e, n, r) {
  if (e.pulled) return !1;
  try {
    let s = await resolveMountPath(e, n),
      h = await statLocalEntry(r, e, s);
    if (fh(h)) return !1;
    let y = e.pullWritten.get(n)?.mtimeMs;
    if (y !== void 0) return h.mtimeMs > y;
    return h.mtimeMs >= e.createdAtMs - 1000;
  } catch (error) {
    let h = error instanceof Error && "viaStorage" in error && FX(getErrnoCode(error));
    if (h)
      logForDebugging(
        `multi-store-sync[${e.mountName}]: ${n} is a leaf the storage backend will not stat; kept as a local edit`,
      );
    return h;
  }
}
//@ chunk-s61vbvea.js:118790-118962 placement
async function isLocalContentEqual(e, n, r, s) {
  try {
    let h = await resolveMountPath(e, n),
      y = await statLocalEntry(s, e, h);
    if (y.size > MAX_MEMORY_BYTES || y.size !== Buffer.byteLength(r, "utf8")) return !1;
    return (await readLocalEntry(s, e, h)) === r;
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:118962-119089 placement
async function recordPullWrite(e, n, r, s) {
  try {
    let h = await resolveMountPath(e, n),
      y = await statLocalEntry(s, e, h);
    e.pullWritten.set(n, { mtimeMs: y.mtimeMs, sha256: r });
  } catch {}
}
//@ chunk-s61vbvea.js:119089-119261 placement
function getEntryBaseline(e, n, r, s) {
  if (!r.has(s.path)) return { id: s.id, sha256: repeat };
  let h = n.get(s.path)?.sha256,
    y = e.pulled ? h : (e.pullWritten.get(s.path)?.sha256 ?? h);
  return { id: s.id, sha256: y ?? repeat };
}
//@ chunk-s61vbvea.js:119261-119754 placement
async function deleteLocalEntry(e, n, r) {
  try {
    let s = await resolveMountPath(e, n),
      h = getStorageKeyForPath(r, e, s);
    if (h !== void 0) {
      let y = await h.backend.delete(h.key);
      if (!y.ok)
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `multi-store-sync: local entry not deletable via storage: ${formatStorageError(y.error)}`,
            "multi-store-sync: local entry not deletable via storage",
          ),
          { cause: y.error },
        );
    } else await unlink(s);
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
  Eu,
  writeLocalEntry,
  recordPullWrite,
  ku,
  deleteLocalEntry,
  isLocalContentEqual,
  resolveMountPath,
  readLocalEntry,
};
