/**
 * services/memorySync/syncNotices.ts
 *
 * 记忆同步提示文本（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (25)
 * attribution: placement 25
 */
import { resolve, sep, relative } from "path";
import { logEvent } from "../analytics/index.js";
import { canDeleteRemotely, MAX_MEMORY_BYTES } from "./syncConfig.js";
import { resolveMountPath, recordPullWrite, isLocalContentEqual, writeLocalEntry } from "./mountWalk.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { formatFileSize } from "../../utils/format.js";
import { normalizePathPrefix } from "../orgMemory/storeApi.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:139521-140477 placement
class OrgMemoryMirrorNotices {
  pending = new Map();
  rejoinPending = new Map();
  oversizeNoticed = new Map();
  roUnsavedNoticed = new Map();
  mirrorAllUncoveredEmitted = false;
  rejoinOffNoticed = new Set();
  heldFilesNoticed = new Set();
  rearmMirrorAllUncovered() {
    this.mirrorAllUncoveredEmitted = false;
  }
  emitMirrorAllUncoveredOnce() {
    if (!this.mirrorAllUncoveredEmitted) {
      this.mirrorAllUncoveredEmitted = true;
      logEvent("tengu_org_memory_mirror_all_uncovered", {});
    }
  }
  queue(key, notice) {
    this.pending.set(key, notice);
  }
  queueRejoin(key, notice) {
    this.rejoinPending.set(key, notice);
  }
  take(mountDir, options) {
    if (this.pending.size === 0 && this.rejoinPending.size === 0) return null;
    let sources = [this.rejoinPending, this.pending];
    if (mountDir !== undefined) {
      let resolvedDir = resolve(mountDir);
      let texts = [];
      for (let source of sources)
        for (let [key, notice] of source) {
          if (!isUnderMountDir(key, notice, resolvedDir)) continue;
          texts.push(notice.text);
          if (!options?.peek) source.delete(key);
        }
      return texts.length > 0
        ? texts.join(`

`)
        : null;
    }
    let flattened = sources.flatMap((source) => [...source.values()].map((notice) => notice.text));
    for (let source of sources) source.clear();
    return flattened.join(`

`);
  }
  oversizeNoticedFor(mountDir) {
    let paths = this.oversizeNoticed.get(mountDir);
    if (paths === undefined) {
      paths = new Set();
      this.oversizeNoticed.set(mountDir, paths);
    }
    return paths;
  }
}
//@ chunk-s61vbvea.js:140477-140558 placement
/**
 * 引用某个记忆存储的名字用于提示。
 */
function quoteStoreName(path) {
  return quoteMemoryPath(path.slice(path.lastIndexOf("/") + 1), path.replaceAll("/", "?"), 64);
}
//@ chunk-s61vbvea.js:140558-140610 placement
/**
 * 引用某个记忆文件路径用于提示。
 */
function quoteMemoryFilePath(path) {
  return quoteMemoryPath(path.replace(/^\/+/, ""), path, 80);
}
//@ chunk-s61vbvea.js:140610-140749 placement
function quoteMemoryPath(shortPath, fullPath, maxChars) {
  let replaced = (shortPath || fullPath).replace(/[^A-Za-z0-9._ /-]/g, "?").replace(/ +/g, " ");
  if (replaced.length > maxChars) replaced = `\u2026${replaced.slice(-maxChars)}`;
  return `"${replaced}"`;
}
//@ chunk-s61vbvea.js:140749-140920 placement
function isUnderMountDir(mountDir, notice, resolvedDir) {
  if (mountDir === resolvedDir) return true;
  if (!mountDir.endsWith(sep) || !resolvedDir.startsWith(mountDir)) return false;
  if (notice.excludeKey) {
    let joined = relative(mountDir, resolvedDir).split(sep).join("/");
    if (notice.excludeKey(joined)) return false;
  }
  return true;
}
//@ chunk-s61vbvea.js:140920-142459 placement
/**
 * 记忆同步暂停的提示文本。
 */
var MEMORY_SYNC_REJECT_TEXTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var storeRecoveredText;
var memorySyncPausedText;
deferInit("chunk-s61vbvea.js:140920", () => {
  MEMORY_SYNC_REJECT_TEXTS = {
    store_full:
      "The shared memory store is full \u2014 the server is rejecting new memory files (updates to already-synced files still work). " +
      "Consolidate or delete memory files to free space; sync then resumes automatically.",
    content_too_large:
      "The server rejected a memory file over its per-file size limit. Split the file's content into smaller files.",
    content_secret:
      "The server rejected a memory file that appears to contain a credential or API key. Remove the credential from the file (and rotate it if it is real).",
    content_screened:
      "The server's safety check rejected a memory file's content. It does not say which part; rewrite or remove the content the file does not need.",
    index_too_large:
      "The server rejected the memory index file (MEMORY.md) over its size cap, which is far smaller than the per-file limit. Shorten the index: one short line per memory, with the detail in the memory files.",
    invalid_path:
      "The server rejected a memory file's path (too long, too deep, or containing invalid characters). Rename the offending file.",
    store_archived: "The memory store has been archived server-side and no longer accepts writes.",
    mount_dir_unreadable:
      "Part of this memory store's local folder could not be read (for example, permission denied, or a folder removed while sync was reading it), so sync cannot verify or persist local files. Check the folder and its permissions; sync then resumes automatically.",
  };
  storeRecoveredText = new Set([
    "content_too_large",
    "content_secret",
    "content_screened",
    "index_too_large",
    "invalid_path",
  ]);
  memorySyncPausedText = 21600000;
});
//@ chunk-s61vbvea.js:142459-142574 placement
function queueStoreNotice(store, text) {
  if (store.scope === "account") return;
  store.notices.queue(resolve(store.mountDir) + sep, {
    text,
    excludeKey: store.excludeKey,
  });
}
//@ chunk-s61vbvea.js:142574-143257 placement
function formatMemorySyncPausedNotice(store, permanent, path) {
  let reason = /^[a-z0-9_]{1,40}$/.test(permanent) ? permanent : "sync_error";
  let reasonText = MEMORY_SYNC_REJECT_TEXTS[permanent];
  let pathNote =
    path !== undefined && /^http_4(00|22)$/.test(permanent)
      ? `The server refused a change to the memory file ${quoteMemoryFilePath(path)} and gave no reason this client recognizes, so that file may be the cause. `
      : "";
  queueStoreNotice(
    store,
    reasonText !== undefined
      ? `Memory sync is paused for one of your memory stores (${reason}): ${pathNote}${reasonText} Affected memory writes are NOT being persisted to shared memory and will be lost when this session's machine is recycled.`
      : `Memory sync is paused for one of your memory stores after repeated failures (${reason}). ${pathNote}Recent memory writes are saved locally but are NOT being persisted to shared memory. Sync retries automatically every few minutes.`,
  );
}
//@ chunk-s61vbvea.js:143257-143648 placement
/**
 * 提示之前暂停的记忆库已恢复同步（含推送的待同步改动数），并说明仍被服务器拒绝的文件只保留在本地。
 */
function noticeStoreRecovered(store, pushedCount) {
  let size = store.refusedWrites?.size ?? 0;
  queueStoreNotice(
    store,
    (pushedCount > 0
      ? `Memory sync recovered for a previously-paused memory store: ${pushedCount} pending local change(s) were pushed to shared memory.`
      : "Memory sync recovered for a previously-paused memory store; memory files are syncing normally again.") +
      (size > 0
        ? ` The server still refuses ${size} memory file(s), named in earlier notices; those stay local only.`
        : ""),
  );
}
//@ chunk-s61vbvea.js:143648-143917 placement
function noticeEmptyFilesRestored(store, restoredCount) {
  queueStoreNotice(
    store,
    `Memory sync restored ${restoredCount} memory file(s) that were empty (0 bytes) on this machine from shared memory \u2014 an empty file is never synced over a memory's shared content.` +
      (canDeleteRemotely(store) ? " To remove a memory, delete its file; emptying it does not." : ""),
  );
}
//@ chunk-s61vbvea.js:143917-144470 placement
function formatMassDeleteGuardNotice(store, missingCount, massDeleteThreshold) {
  queueStoreNotice(
    store,
    `Memory sync did NOT delete anything from shared memory this cycle: ${missingCount} synced memory files went missing from this session's disk at once, which almost always means the local memory folder was wiped rather than deliberately cleared. Shared memory is unchanged and the missing files will be restored on the next sync. If you really do intend to remove that many memories, wait until the missing files have been restored, then delete at most ${massDeleteThreshold} at a time with about a minute between batches so memory sync can apply each one.`,
  );
}
//@ chunk-s61vbvea.js:144470-144479 placement
/**
 * 提示里最多列出的路径数（5）。
 */
var MAX_LISTED_PATHS = 5;
//@ chunk-s61vbvea.js:144479-144813 placement
/**
 * 排队提示：该记忆存储的同步暂时关闭（文件夹缺少可用记录且暂时无法重建），期间写入只保留在本机。
 */
function noticeStoreSyncOff(store) {
  store.notices.queueRejoin(resolve(store.mountDir) + sep, {
    text: `Memory sync for the ${quoteStoreName(store.mountName)} memory store is off for now: its folder has no usable record of what shared memory held, and it could not be rebuilt from shared memory yet. Memory files you write are kept on this machine in the meantime.`,
    excludeKey: store.excludeKey,
  });
}
//@ chunk-s61vbvea.js:144813-145309 placement
function formatStoreBackOnNotice(store, heldPaths, rejoinOn) {
  if (heldPaths.length > 0) store.notices.heldFilesNoticed.add(store.mountDir);
  let storeName = quoteStoreName(store.mountName);
  let heldText =
    heldPaths.length === 0
      ? ""
      : `had no usable record of what shared memory held, so ${heldPaths.length} older memory file(s) that shared memory did not list were kept on this machine and not saved there: ${formatFailureDetails(heldPaths)}. ` +
        HELD_FILES_ADVICE;
  store.notices.queueRejoin(resolve(store.mountDir) + sep, {
    text: rejoinOn
      ? `Memory sync for the ${storeName} memory store is back on.` +
        (heldText === "" ? "" : ` The folder ${heldText}`)
      : `The folder of the ${storeName} memory store ${heldText}`,
    excludeKey: store.excludeKey,
  });
}
//@ chunk-s61vbvea.js:145309-145685 placement
/**
 * 每个挂载目录一次：提示有若干旧记忆文件未在共享记忆中列出，保留在本机不上传（可能是别处删除的副本）。
 */
function noticeHeldLocalFiles(store) {
  let paths = heldLocalOnlyPaths(store);
  if (paths.length === 0 || store.notices.heldFilesNoticed.has(store.mountDir)) return;
  store.notices.heldFilesNoticed.add(store.mountDir);
  store.notices.queueRejoin(resolve(store.mountDir) + sep, {
    text:
      `In the ${quoteStoreName(store.mountName)} memory store, ${paths.length} older memory file(s) that shared memory did not list are kept on this machine and not saved there: ${formatFailureDetails(paths)}. ` +
      HELD_FILES_ADVICE,
    excludeKey: store.excludeKey,
  });
}
//@ chunk-s61vbvea.js:145685-145778 placement
/**
 * 只在本地保留、远端没有的路径。
 */
function heldLocalOnlyPaths(store) {
  return [...(store.heldLocal?.keys() ?? [])].filter((path) => !store.remoteHashes.has(path)).sort();
}
//@ chunk-s61vbvea.js:145778-145958 placement
var HELD_FILES_ADVICE =
  "They may be copies of memories another session deleted. Editing one ends its hold, so sync treats it like any other memory file. Ask the user before deleting any of them.";
//@ chunk-s61vbvea.js:145958-146067 placement = formatFailureDetails (0.777)
function formatFailureDetails(paths) {
  let joined = paths.slice(0, MAX_LISTED_PATHS).map(quoteMemoryFilePath).join(", ");
  let moreText = paths.length > MAX_LISTED_PATHS ? ` and ${paths.length - MAX_LISTED_PATHS} more` : "";
  return joined + moreText;
}
//@ chunk-s61vbvea.js:146067-146361 placement
async function queueConflictNotice(store, path, text, options) {
  try {
    let resolvedPath = resolve(await resolveMountPath(store, path));
    let existing = options?.keepPending ? store.notices.pending.get(resolvedPath) : undefined;
    store.notices.queue(resolvedPath, {
      text:
        existing !== undefined && existing.text !== text
          ? `${existing.text}

${text}`
          : text,
    });
  } catch (error) {
    logForDebugging(
      `multi-store-sync[${store.mountName}]: dropping conflict notice for unresolvable path (${errorMessage(error)})`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-s61vbvea.js:146361-147025 placement
async function formatOversizedMemoryNotice(store, skippedOversizedPaths) {
  let noticed = store.notices.oversizeNoticedFor(store.mountDir);
  let stillSkipped = new Set(skippedOversizedPaths.map((entry) => entry.path));
  for (let path of noticed) if (!stillSkipped.has(path)) noticed.delete(path);
  for (let entry of skippedOversizedPaths) {
    if (noticed.has(entry.path)) continue;
    noticed.add(entry.path);
    await queueConflictNotice(
      store,
      entry.path,
      `The memory file ${quoteStoreName(entry.path)} is ${formatFileSize(entry.size)}, over the ${formatFileSize(MAX_MEMORY_BYTES)} per-file sync limit \u2014 it is saved locally but is NOT synced to shared memory, so its changes will be lost when this session's machine is recycled and other sessions only see the last version that was under the limit. ` +
        "Split its content into smaller files under the limit (or trim it), then delete or shrink this one. Tell the user this memory file is not being persisted.",
    );
  }
}
//@ chunk-s61vbvea.js:147025-147168 placement
async function findRemoteEntry(store, path) {
  let normalizedPath = normalizePathPrefix(path);
  let sliced = normalizedPath.slice(0, normalizedPath.lastIndexOf("/") + 1);
  return (
    (
      await store.backend.list(sliced, {
        depthOne: true,
      })
    ).find((entry) => entry.path === normalizedPath) ?? null
  );
}
//@ chunk-s61vbvea.js:147168-147532 placement
/**
 * 生成写入冲突提示：最近的记忆文件写入未保存到共享记忆（未持有共享版本或被其他会话先更新），需重读后重做修改。
 */
function buildWriteConflictNotice(path, wasUnsynced) {
  return (
    `Your recent write to the memory file ${quoteStoreName(path)} was NOT saved to shared memory: ` +
    (wasUnsynced
      ? "this session did not have the shared version of that file when it wrote it. "
      : "another session updated the file first (concurrent-write conflict). ") +
    "The file on disk now has the shared version. Re-read it and re-apply your change if it is still wanted."
  );
}
//@ chunk-s61vbvea.js:147532-147865 placement
/**
 * 生成提示：本机仅有、从未保存到共享记忆的本地副本已被其他会话保存的同路径文件替换，需重读，本地内容已不保留。
 */
function buildLocalCopyReplacedNotice(path) {
  return `The local copy of the memory file ${quoteStoreName(path)}, kept on this machine and never saved to shared memory, was replaced: another session saved a file at that path. The file on disk now has the shared version. Re-read it. The local copy was not kept, so anything from it that is still wanted has to come from the user.`;
}
//@ chunk-s61vbvea.js:147865-147972 placement
async function recordRemoteEntry(store, path, ref, storage) {
  store.remoteHashes.set(path, ref);
  store.conflictRefetches?.delete(path);
  await recordPullWrite(store, path, ref.sha256, storage);
}
//@ chunk-s61vbvea.js:147972-148738 placement
async function formatDeletionConflictNotice(store, path, id, op, storage) {
  try {
    let remote = await store.backend.read(id);
    if (
      !(await isLocalContentEqual(store, path, remote.content, storage)) &&
      (await writeLocalEntry(store, path, remote.content, remote.updatedAt, storage)) === "dropped"
    )
      return false;
    let contentHash = computeContentHash(remote.content);
    await recordPullWrite(store, path, contentHash, storage);
    store.remoteHashes.set(path, {
      id,
      sha256: contentHash,
    });
    await queueConflictNotice(
      store,
      path,
      op === "delete"
        ? `Your recent deletion of the memory file ${quoteStoreName(path)} was NOT applied to shared memory: another session updated the file first (concurrent-write conflict). The file on disk has been restored with the server's current version. Re-read it and delete it again if that is still wanted.`
        : buildWriteConflictNotice(path, op === "unsynced"),
    );
    logEvent("tengu_team_mem_conflict_recovered", {
      scope: fromEnum(store.scope),
      op: fromEnum(op),
    });
    return true;
  } catch (error) {
    logForDebugging(
      `multi-store-sync[${store.mountName}]: conflict refetch failed (${errorMessage(error)}) \u2014 next pull resolves`,
      {
        level: "warn",
      },
    );
    return false;
  }
}
export {
  formatStoreBackOnNotice,
  noticeStoreSyncOff,
  heldLocalOnlyPaths,
  queueConflictNotice,
  buildLocalCopyReplacedNotice,
  buildWriteConflictNotice,
  quoteStoreName,
  noticeEmptyFilesRestored,
  noticeHeldLocalFiles,
  formatOversizedMemoryNotice,
  memorySyncPausedText,
  formatMassDeleteGuardNotice,
  findRemoteEntry,
  recordRemoteEntry,
  formatDeletionConflictNotice,
  storeRecoveredText,
  quoteMemoryFilePath,
  MEMORY_SYNC_REJECT_TEXTS,
  noticeStoreRecovered,
  formatMemorySyncPausedNotice,
  OrgMemoryMirrorNotices,
};
