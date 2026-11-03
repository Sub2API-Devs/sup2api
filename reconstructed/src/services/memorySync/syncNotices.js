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
import {
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
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
} from "path";
import { logEvent } from "../analytics/index.js";
import { Ou, MAX_MEMORY_BYTES } from "./syncConfig.js";
import { resolveMountPath, recordPullWrite, isLocalContentEqual, writeLocalEntry } from "./mountWalk.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { formatFileSize } from "../../utils/format.js";
import { Pk } from "../orgMemory/storeApi.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { fromEnum } from "../analytics/safeMetadata.js";

//@ chunk-s61vbvea.js:139521-140477 placement
class OrgMemoryMirrorNotices {
  pending = new Map();
  rejoinPending = new Map();
  oversizeNoticed = new Map();
  roUnsavedNoticed = new Map();
  mirrorAllUncoveredEmitted = !1;
  rejoinOffNoticed = new Set();
  heldFilesNoticed = new Set();
  rearmMirrorAllUncovered() {
    this.mirrorAllUncoveredEmitted = !1;
  }
  emitMirrorAllUncoveredOnce() {
    if (!this.mirrorAllUncoveredEmitted)
      ((this.mirrorAllUncoveredEmitted = !0), logEvent("tengu_org_memory_mirror_all_uncovered", {}));
  }
  queue(e, n) {
    this.pending.set(e, n);
  }
  queueRejoin(e, n) {
    this.rejoinPending.set(e, n);
  }
  take(e, n) {
    if (this.pending.size === 0 && this.rejoinPending.size === 0) return null;
    let r = [this.rejoinPending, this.pending];
    if (e !== void 0) {
      let h = resolve(e),
        y = [];
      for (let S of r)
        for (let [w, R] of S) {
          if (!isUnderMountDir(w, R, h)) continue;
          if ((y.push(R.text), !n?.peek)) S.delete(w);
        }
      return y.length > 0
        ? y.join(`

`)
        : null;
    }
    let flattened = r.flatMap((h) => [...h.values()].map((y) => y.text));
    for (let h of r) h.clear();
    return flattened.join(`

`);
  }
  oversizeNoticedFor(e) {
    let n = this.oversizeNoticed.get(e);
    if (n === void 0) ((n = new Set()), this.oversizeNoticed.set(e, n));
    return n;
  }
}
//@ chunk-s61vbvea.js:140477-140558 placement
function Ln(e) {
  return quoteMemoryPath(e.slice(e.lastIndexOf("/") + 1), e.replaceAll("/", "?"), 64);
}
//@ chunk-s61vbvea.js:140558-140610 placement
function Uu(e) {
  return quoteMemoryPath(e.replace(/^\/+/, ""), e, 80);
}
//@ chunk-s61vbvea.js:140610-140749 placement
function quoteMemoryPath(e, n, r) {
  let replaced = (e || n).replace(/[^A-Za-z0-9._ /-]/g, "?").replace(/ +/g, " ");
  if (replaced.length > r) replaced = `\u2026${replaced.slice(-r)}`;
  return `"${replaced}"`;
}
//@ chunk-s61vbvea.js:140749-140920 placement
function isUnderMountDir(e, n, r) {
  if (e === r) return !0;
  if (!e.endsWith(sep_2) || !r.startsWith(e)) return !1;
  if (n.excludeKey) {
    let joined = relative_2(e, r).split(sep_2).join("/");
    if (n.excludeKey(joined)) return !1;
  }
  return !0;
}
//@ chunk-s61vbvea.js:140920-142459 placement
var MEMORY_SYNC_REJECT_TEXTS = {
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
  },
  _C = new Set([
    "content_too_large",
    "content_secret",
    "content_screened",
    "index_too_large",
    "invalid_path",
  ]),
  bC = 21600000;
//@ chunk-s61vbvea.js:142459-142574 placement
function queueStoreNotice(e, n) {
  if (e.scope === "account") return;
  e.notices.queue(resolve(e.mountDir) + sep_2, { text: n, excludeKey: e.excludeKey });
}
//@ chunk-s61vbvea.js:142574-143257 placement
function formatMemorySyncPausedNotice(e, n, r) {
  let s = /^[a-z0-9_]{1,40}$/.test(n) ? n : "sync_error",
    h = MEMORY_SYNC_REJECT_TEXTS[n],
    y =
      r !== void 0 && /^http_4(00|22)$/.test(n)
        ? `The server refused a change to the memory file ${Uu(r)} and gave no reason this client recognizes, so that file may be the cause. `
        : "";
  queueStoreNotice(
    e,
    h !== void 0
      ? `Memory sync is paused for one of your memory stores (${s}): ${y}${h} Affected memory writes are NOT being persisted to shared memory and will be lost when this session's machine is recycled.`
      : `Memory sync is paused for one of your memory stores after repeated failures (${s}). ${y}Recent memory writes are saved locally but are NOT being persisted to shared memory. Sync retries automatically every few minutes.`,
  );
}
/**
 * 提示之前暂停的记忆库已恢复同步（含推送的待同步改动数），并说明仍被服务器拒绝的文件只保留在本地。
 */
//@ chunk-s61vbvea.js:143257-143648 placement
function noticeStoreRecovered(e, n) {
  let r = e.refusedWrites?.size ?? 0;
  queueStoreNotice(
    e,
    (n > 0
      ? `Memory sync recovered for a previously-paused memory store: ${n} pending local change(s) were pushed to shared memory.`
      : "Memory sync recovered for a previously-paused memory store; memory files are syncing normally again.") +
      (r > 0
        ? ` The server still refuses ${r} memory file(s), named in earlier notices; those stay local only.`
        : ""),
  );
}
//@ chunk-s61vbvea.js:143648-143917 placement
function noticeEmptyFilesRestored(e, n) {
  queueStoreNotice(
    e,
    `Memory sync restored ${n} memory file(s) that were empty (0 bytes) on this machine from shared memory \u2014 an empty file is never synced over a memory's shared content.` +
      (Ou(e) ? " To remove a memory, delete its file; emptying it does not." : ""),
  );
}
//@ chunk-s61vbvea.js:143917-144470 placement
function formatMassDeleteGuardNotice(e, n, r) {
  queueStoreNotice(
    e,
    `Memory sync did NOT delete anything from shared memory this cycle: ${n} synced memory files went missing from this session's disk at once, which almost always means the local memory folder was wiped rather than deliberately cleared. Shared memory is unchanged and the missing files will be restored on the next sync. If you really do intend to remove that many memories, wait until the missing files have been restored, then delete at most ${r} at a time with about a minute between batches so memory sync can apply each one.`,
  );
}
//@ chunk-s61vbvea.js:144470-144479 placement
var gu = 5;
/**
 * 排队提示：该记忆存储的同步暂时关闭（文件夹缺少可用记录且暂时无法重建），期间写入只保留在本机。
 */
//@ chunk-s61vbvea.js:144479-144813 placement
function noticeStoreSyncOff(e) {
  e.notices.queueRejoin(resolve(e.mountDir) + sep_2, {
    text: `Memory sync for the ${Ln(e.mountName)} memory store is off for now: its folder has no usable record of what shared memory held, and it could not be rebuilt from shared memory yet. Memory files you write are kept on this machine in the meantime.`,
    excludeKey: e.excludeKey,
  });
}
//@ chunk-s61vbvea.js:144813-145309 placement
function formatStoreBackOnNotice(e, n, r) {
  if (n.length > 0) e.notices.heldFilesNoticed.add(e.mountDir);
  let s = Ln(e.mountName),
    h =
      n.length === 0
        ? ""
        : `had no usable record of what shared memory held, so ${n.length} older memory file(s) that shared memory did not list were kept on this machine and not saved there: ${formatFailureDetails(n)}. ` +
          HELD_FILES_ADVICE;
  e.notices.queueRejoin(resolve(e.mountDir) + sep_2, {
    text: r
      ? `Memory sync for the ${s} memory store is back on.` + (h === "" ? "" : ` The folder ${h}`)
      : `The folder of the ${s} memory store ${h}`,
    excludeKey: e.excludeKey,
  });
}
/**
 * 每个挂载目录一次：提示有若干旧记忆文件未在共享记忆中列出，保留在本机不上传（可能是别处删除的副本）。
 */
//@ chunk-s61vbvea.js:145309-145685 placement
function noticeHeldLocalFiles(e) {
  let n = Ph(e);
  if (n.length === 0 || e.notices.heldFilesNoticed.has(e.mountDir)) return;
  (e.notices.heldFilesNoticed.add(e.mountDir),
    e.notices.queueRejoin(resolve(e.mountDir) + sep_2, {
      text:
        `In the ${Ln(e.mountName)} memory store, ${n.length} older memory file(s) that shared memory did not list are kept on this machine and not saved there: ${formatFailureDetails(n)}. ` +
        HELD_FILES_ADVICE,
      excludeKey: e.excludeKey,
    }));
}
//@ chunk-s61vbvea.js:145685-145778 placement
function Ph(e) {
  return [...(e.heldLocal?.keys() ?? [])].filter((n) => !e.remoteHashes.has(n)).sort();
}
//@ chunk-s61vbvea.js:145778-145958 placement
var HELD_FILES_ADVICE =
  "They may be copies of memories another session deleted. Editing one ends its hold, so sync treats it like any other memory file. Ask the user before deleting any of them.";
//@ chunk-s61vbvea.js:145958-146067 placement = formatFailureDetails (0.777)
function formatFailureDetails(e) {
  let joined = e.slice(0, gu).map(Uu).join(", "),
    moreText = e.length > gu ? ` and ${e.length - gu} more` : "";
  return joined + moreText;
}
//@ chunk-s61vbvea.js:146067-146361 placement
async function queueConflictNotice(e, n, r, s) {
  try {
    let h = resolve(await resolveMountPath(e, n)),
      y = s?.keepPending ? e.notices.pending.get(h) : void 0;
    e.notices.queue(h, {
      text:
        y !== void 0 && y.text !== r
          ? `${y.text}

${r}`
          : r,
    });
  } catch (error) {
    logForDebugging(
      `multi-store-sync[${e.mountName}]: dropping conflict notice for unresolvable path (${errorMessage(error)})`,
      { level: "warn" },
    );
  }
}
//@ chunk-s61vbvea.js:146361-147025 placement
async function formatOversizedMemoryNotice(e, n) {
  let oversizeNoticedFor = e.notices.oversizeNoticedFor(e.mountDir),
    s = new Set(n.map((h) => h.path));
  for (let h of oversizeNoticedFor) if (!s.has(h)) oversizeNoticedFor.delete(h);
  for (let h of n) {
    if (oversizeNoticedFor.has(h.path)) continue;
    (oversizeNoticedFor.add(h.path),
      await queueConflictNotice(
        e,
        h.path,
        `The memory file ${Ln(h.path)} is ${formatFileSize(h.size)}, over the ${formatFileSize(MAX_MEMORY_BYTES)} per-file sync limit \u2014 it is saved locally but is NOT synced to shared memory, so its changes will be lost when this session's machine is recycled and other sessions only see the last version that was under the limit. ` +
          "Split its content into smaller files under the limit (or trim it), then delete or shrink this one. Tell the user this memory file is not being persisted.",
      ));
  }
}
//@ chunk-s61vbvea.js:147025-147168 placement
async function findRemoteEntry(e, n) {
  let r = Pk(n),
    sliced = r.slice(0, r.lastIndexOf("/") + 1);
  return (await e.backend.list(sliced, { depthOne: !0 })).find((y) => y.path === r) ?? null;
}
/**
 * 生成写入冲突提示：最近的记忆文件写入未保存到共享记忆（未持有共享版本或被其他会话先更新），需重读后重做修改。
 */
//@ chunk-s61vbvea.js:147168-147532 placement
function buildWriteConflictNotice(e, n) {
  return (
    `Your recent write to the memory file ${Ln(e)} was NOT saved to shared memory: ` +
    (n
      ? "this session did not have the shared version of that file when it wrote it. "
      : "another session updated the file first (concurrent-write conflict). ") +
    "The file on disk now has the shared version. Re-read it and re-apply your change if it is still wanted."
  );
}
/**
 * 生成提示：本机仅有、从未保存到共享记忆的本地副本已被其他会话保存的同路径文件替换，需重读，本地内容已不保留。
 */
//@ chunk-s61vbvea.js:147532-147865 placement
function buildLocalCopyReplacedNotice(e) {
  return `The local copy of the memory file ${Ln(e)}, kept on this machine and never saved to shared memory, was replaced: another session saved a file at that path. The file on disk now has the shared version. Re-read it. The local copy was not kept, so anything from it that is still wanted has to come from the user.`;
}
//@ chunk-s61vbvea.js:147865-147972 placement
async function recordRemoteEntry(e, n, r, s) {
  (e.remoteHashes.set(n, r), e.conflictRefetches?.delete(n), await recordPullWrite(e, n, r.sha256, s));
}
//@ chunk-s61vbvea.js:147972-148738 placement
async function formatDeletionConflictNotice(e, n, r, s, h) {
  try {
    let read = await e.backend.read(r);
    if (
      !(await isLocalContentEqual(e, n, read.content, h)) &&
      (await writeLocalEntry(e, n, read.content, read.updatedAt, h)) === "dropped"
    )
      return !1;
    let S = computeContentHash(read.content);
    return (
      await recordPullWrite(e, n, S, h),
      e.remoteHashes.set(n, { id: r, sha256: S }),
      await queueConflictNotice(
        e,
        n,
        s === "delete"
          ? `Your recent deletion of the memory file ${Ln(n)} was NOT applied to shared memory: another session updated the file first (concurrent-write conflict). The file on disk has been restored with the server's current version. Re-read it and delete it again if that is still wanted.`
          : buildWriteConflictNotice(n, s === "unsynced"),
      ),
      logEvent("tengu_team_mem_conflict_recovered", { scope: fromEnum(e.scope), op: fromEnum(s) }),
      !0
    );
  } catch (error) {
    return (
      logForDebugging(
        `multi-store-sync[${e.mountName}]: conflict refetch failed (${errorMessage(error)}) \u2014 next pull resolves`,
        { level: "warn" },
      ),
      !1
    );
  }
}

export {
  formatStoreBackOnNotice,
  noticeStoreSyncOff,
  Ph,
  queueConflictNotice,
  buildLocalCopyReplacedNotice,
  buildWriteConflictNotice,
  Ln,
  noticeEmptyFilesRestored,
  noticeHeldLocalFiles,
  formatOversizedMemoryNotice,
  bC,
  formatMassDeleteGuardNotice,
  findRemoteEntry,
  recordRemoteEntry,
  formatDeletionConflictNotice,
  _C,
  Uu,
  MEMORY_SYNC_REJECT_TEXTS,
  noticeStoreRecovered,
  formatMemorySyncPausedNotice,
  OrgMemoryMirrorNotices,
};
