/**
 * utils/_new/cleanupDaemonFiles.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-23fm9f0d.js (7)
 * attribution: sole-consumer-new 7
 */
import { join, join as join_2, join as join_3, basename } from "path";
import { tmpdir as tmpdir_2 } from "os";
import {
  cleanupOldFilesMatching,
  getCutoffDate,
  emptyCleanupResult,
  isDirectory,
  unlinkIfOld,
  tryRmdir,
  addCleanupResults,
  isRetentionExemptionDisabled,
  cleanupOldFilesInDirectory,
} from "../cleanup.js";
import { getClaudeConfigDir, getTeamsDir } from "../envUtils.js";
import { getFsImplementation } from "../fsOperations.js";
import { isENOENT, errorMessage } from "../errors.js";
import { statOwnedPrivateDir } from "../sandbox/userTempRoot.js";
import { PDF_SCRATCH_DIR_PREFIX, PREVIEW_COPY_DIR_PREFIX, tmpdir } from "../tempDir.js";
import { scanDirectoryForPaths } from "../suggestions/directoryCompletion.js";
import { readPinnedJobIds, readJobStateFreshOrNull, isSettled } from "../../services/daemon/jobState.js";
import { jsonParse } from "../slowOperations.js";
import { isProcessRunning } from "../genericProcessUtils.js";
import { isSameProcessAsync } from "../processIdentity.js";
import { logError } from "../log.js";
import { logForDebugging } from "../debug.js";
import { reapJobWorktreeIfSafe } from "../worktree.js";
import { sweepJobDrafts } from "../../daemon/jobs/draftSweep.js";

//@ chunk-23fm9f0d.js:28730-28789 sole-consumer-new
function qt() {
  return cleanupOldFilesMatching(join(getClaudeConfigDir(), "shell-snapshots"), ".sh", !1);
}
/**
 * 清理团队目录下各 inboxes 中过期的消息 JSON 文件，并删除空目录。
 */
//@ chunk-23fm9f0d.js:28789-29195 sole-consumer-new
async function cleanupTeamInboxes() {
  let e = getCutoffDate(),
    r = emptyCleanupResult();
  if (e === null) return r;
  let s = getFsImplementation(),
    n = getTeamsDir();
  for (let f of await s.readdir(n).catch(() => [])) {
    if (!f.isDirectory()) continue;
    let i = join(n, f.name, "inboxes");
    if (await isDirectory(i, s)) {
      for (let m of await s.readdir(i).catch(() => [])) {
        if (!m.isFile() || !m.name.endsWith(".json")) continue;
        try {
          if (await unlinkIfOld(join(i, m.name), e, s, r)) r.messages++;
        } catch {
          r.errors++;
        }
      }
      await tryRmdir(i, s);
    }
    await tryRmdir(join(n, f.name), s);
  }
  return r;
}
/**
 * 清理临时目录中他人遗留、只含过期 stderr.log 的 cc-daemon-* 私有目录（确认归属与 inode 未变后删除）。
 */
//@ chunk-23fm9f0d.js:29195-29956 sole-consumer-new
async function cleanupDaemonStderrDirs(cutoff, tmpDir = tmpdir_2()) {
  let result = emptyCleanupResult(),
    fs = getFsImplementation(),
    uid = process.getuid?.(),
    entries;
  try {
    entries = await fs.readdir(tmpDir);
  } catch (error) {
    if (!isENOENT(error)) result.errors++;
    return result;
  }
  for (let m of entries) {
    if (!m.name.startsWith("cc-daemon-")) continue;
    let sliced = m.name.slice(10);
    if (/^\d+$/.test(sliced) || (uid !== void 0 && sliced === String(uid)) || /^[0-9a-f]{16}$/.test(sliced))
      continue;
    let y = join(tmpDir, m.name);
    try {
      let D = await statOwnedPrivateDir(y);
      if (D === null) continue;
      let entries = await fs.readdir(y);
      if (entries.length !== 1 || entries[0].name !== "stderr.log") continue;
      let S = join(y, "stderr.log"),
        stats = await fs.lstat(S);
      if (!stats.isFile()) continue;
      if (!(stats.mtime < cutoff)) {
        result.filesRetainedFresh++;
        continue;
      }
      let P = await statOwnedPrivateDir(y);
      if (P === null || P.dev !== D.dev || P.ino !== D.ino) continue;
      try {
        await fs.unlink(S);
      } catch (error) {
        if (isENOENT(error)) continue;
        throw (result.filesPastCutoff++, error);
      }
      (result.messages++, await tryRmdir(y, fs));
    } catch (error) {
      if (!isENOENT(error)) result.errors++;
    }
  }
  return result;
}
//@ chunk-23fm9f0d.js:29956-30000 sole-consumer-new
var regExp = new RegExp(`^${PDF_SCRATCH_DIR_PREFIX}[A-Za-z0-9]{6}$`);
//@ chunk-23fm9f0d.js:30000-30044 sole-consumer-new
var regExp_2 = new RegExp(`^${PREVIEW_COPY_DIR_PREFIX}[A-Za-z0-9]{6}$`);
/**
 * 清理临时目录中匹配模式的过期私有目录（整棵树都早于截止时间时递归删除）。
 */
//@ chunk-23fm9f0d.js:30044-30553 sole-consumer-new
async function cleanupOldTempDirs(cutoff = getCutoffDate(), tmpDir = tmpdir()) {
  let result = emptyCleanupResult();
  if (cutoff === null) return result;
  let fs = getFsImplementation(),
    entries;
  try {
    entries = await fs.readdir(tmpDir);
  } catch (error) {
    if (!isENOENT(error)) result.errors++;
    return result;
  }
  for (let i of entries) {
    if (!regExp_2.test(i.name)) continue;
    let m = join(tmpDir, i.name);
    try {
      let g = await statOwnedPrivateDir(m);
      if (g === null) continue;
      if (
        !(((await scanDirectoryForPaths(m, fs, { requireCompleteWalk: !0 })) ?? g.mtimeMs) < cutoff.getTime())
      ) {
        result.filesRetainedFresh++;
        continue;
      }
      let D = await statOwnedPrivateDir(m);
      if (D === null || D.dev !== g.dev || D.ino !== g.ino) continue;
      (await fs.rm(m, { recursive: !0, force: !0 }), result.messages++);
    } catch (error) {
      if (!isENOENT(error)) result.errors++;
    }
  }
  return result;
}
/**
 * 清理后台守护相关的旧文件：已结算作业与派发记录、无对应作业的 host-managed 文件、过期作业目录（排除固定作业与名册中存活 worker 的作业，必要时回收作业工作树）、daemon 临时 stderr、daemon.log、过期名册与损坏名册备份，以及作业草稿。
 */
//@ chunk-23fm9f0d.js:30553-32645 sole-consumer-new
async function cleanupDaemonFiles(storageV5, r) {
  let configDir = getClaudeConfigDir(),
    result = await cleanupOldFilesMatching(join(configDir, "jobs", "settled"), ".json");
  ((result = addCleanupResults(
    result,
    await cleanupOldFilesMatching(join(configDir, "daemon", "dispatch", "rejected"), ".json"),
  )),
    (result = addCleanupResults(
      result,
      await cleanupOldFilesMatching(join(configDir, "daemon", "dispatch"), ".json", !1),
    )),
    (result = addCleanupResults(
      result,
      await cleanupOldFilesMatching(join(configDir, "daemon", "auth"), ".json"),
    )));
  try {
    let D = join(configDir, "daemon", "host-managed"),
      k = getFsImplementation(),
      S = getCutoffDate();
    if (S)
      for (let w of await k.readdir(D)) {
        if (!w.isFile()) continue;
        try {
          await k.lstat(join(configDir, "jobs", w.name));
        } catch (error) {
          if (!isENOENT(error)) {
            result.errors++;
            continue;
          }
          try {
            if (await unlinkIfOld(join(D, w.name), S, k, result)) result.messages++;
          } catch (error) {
            if (!isENOENT(error)) result.errors++;
          }
        }
      }
  } catch (error) {
    if (!isENOENT(error)) result.errors++;
  }
  let retentionExemptOff = isRetentionExemptionDisabled(),
    cutoff = getCutoffDate(),
    keepJobIds = new Set();
  if (!retentionExemptOff) for (let D of await readPinnedJobIds(storageV5)) keepJobIds.add(D);
  let rosterRead = !1,
    rosterHasLiveWorker = !1;
  try {
    let D = join(configDir, "daemon", "roster.json"),
      stats = await getFsImplementation().lstat(D);
    if (!stats.isFile() || stats.size > 8388608) throw Error("not a regular file");
    let content = await getFsImplementation().readFile(D, { encoding: "utf-8" }),
      w = jsonParse(content);
    if (w !== null && typeof w === "object" && "workers" in w) {
      let workers = w.workers;
      if (workers !== null && typeof workers === "object") {
        rosterRead = !0;
        for (let [O, C] of Object.entries(workers))
          if (
            C !== null &&
            typeof C === "object" &&
            "pid" in C &&
            typeof C.pid === "number" &&
            isProcessRunning(C.pid) &&
            (await isSameProcessAsync(
              C.pid,
              "procStart" in C && typeof C.procStart === "string" ? C.procStart : void 0,
            ))
          )
            (keepJobIds.add(O), (rosterHasLiveWorker = !0));
      }
    }
  } catch {}
  if (
    ((result = addCleanupResults(
      result,
      await cleanupOldFilesInDirectory("jobs", {
        exclude: keepJobIds,
        skipIf: async (D) => {
          let k;
          try {
            k = await readJobStateFreshOrNull(D, storageV5);
          } catch (error) {
            throw (
              logError(error),
              logForDebugging(
                `[cleanup] jobs/${basename(D)}: job state read threw \u2014 keeping the folder (${errorMessage(error)})`,
                { level: "error" },
              ),
              error
            );
          }
          if (!retentionExemptOff && (k === null || !isSettled(k))) return !0;
          if (k?.worktreePath && isSettled(k) && cutoff) {
            let S = await reapJobWorktreeIfSafe({
              worktreePath: k.worktreePath,
              worktreeBranch: k.worktreeBranch,
              originCwd: k.originCwd,
              hookBased: k.worktreeHookBased,
              cutoff: cutoff,
              ...{},
            }).catch((w) => (logError(w), !1));
          }
          return !1;
        },
      }),
    )),
    cutoff !== null)
  ) {
    result = addCleanupResults(result, await cleanupDaemonStderrDirs(cutoff));
    let D = getFsImplementation();
    for (let S of [join(configDir, "daemon.log"), join(configDir, "daemon.log.1")])
      try {
        if (await unlinkIfOld(S, cutoff, D, result)) result.messages++;
      } catch (error) {
        if (!isENOENT(error)) result.errors++;
      }
    let k = join(configDir, "daemon", "roster.json");
    try {
      if ((await D.lstat(k)).mtime < cutoff && !rosterHasLiveWorker && (rosterRead || retentionExemptOff))
        (await D.unlink(k), result.messages++);
    } catch (error) {
      if (!isENOENT(error)) result.errors++;
    }
    for (let S of await D.readdir(join(configDir, "daemon")).catch(() => [])) {
      if (!S.isFile() || !S.name.startsWith("roster.json.corrupt.")) continue;
      try {
        if (await unlinkIfOld(join(configDir, "daemon", S.name), cutoff, D, result)) result.messages++;
      } catch {
        result.errors++;
      }
    }
  }
  return (await sweepJobDrafts(), result);
}

export { cleanupOldTempDirs, qt, cleanupTeamInboxes, cleanupDaemonFiles };
