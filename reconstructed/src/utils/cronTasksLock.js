/**
 * utils/cronTasksLock.ts
 *
 * 定时任务调度锁（.claude/scheduled_tasks.lock）：同一项目只允许一个会话触发持久化任务，支持同会话换进程接管与陈旧锁回收
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cronTasksLock.ts
 * pieces: chunk-hnzqng4j.js (7)
 * attribution: fingerprint 4, layout 1, file-local 1, placement 1
 */
import { join, join as join_2, join as join_3, dirname } from "path";
import { readFile, readFile as readFile_2, writeFile, mkdir, mkdir as mkdir_2, unlink } from "fs/promises";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, E } from "../../vendor/zod/v4/classic/schemas.js";
import { getProjectRoot, getSessionId } from "../bootstrap/state.js";
import { safeParseJSON } from "./json.js";
import { jsonStringify } from "./slowOperations.js";
import { getErrnoCode } from "./errors.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { isDurableCronUnavailable } from "./cronTasks.js";
import { ensureClaudeRuntimeFilesExcluded } from "./git/gitExclude.js";
import { ownProcStart, isSameProcessAsync } from "./processIdentity.js";
import { logForDebugging } from "./debug.js";
import { isProcessRunning } from "./genericProcessUtils.js";

/**
 * 锁文件相对路径 .claude/scheduled_tasks.lock 与锁内容 schema {sessionId, pid, procStart?, acquiredAt}。
 */
//@ chunk-hnzqng4j.js:3042-3163 fingerprint = LOCK_FILE_REL (0.741)
var LOCK_FILE_REL = join_2(".claude", "scheduled_tasks.lock"),
  schedulerLockSchema = DoctorLazy(() =>
    u({ sessionId: o(), pid: E(), procStart: o().optional(), acquiredAt: E() }),
  );
//@ chunk-hnzqng4j.js:3163-3199 layout
function getLockPath(dir) {
  return join_2(dir ?? getProjectRoot(), LOCK_FILE_REL);
}
/**
 * 读取并校验锁文件，失败返回 undefined。
 */
//@ chunk-hnzqng4j.js:3199-3329 file-local
async function readLock(dir) {
  let raw;
  try {
    raw = await readFile(getLockPath(dir), "utf8");
  } catch {
    return;
  }
  let result = schedulerLockSchema().safeParse(safeParseJSON(raw, !1));
  return result.success ? result.data : void 0;
}
/**
 * 以 wx 独占方式创建锁文件（目录不存在时先建），已存在返回 false。
 */
//@ chunk-hnzqng4j.js:3329-3598 fingerprint = tryCreateExclusive (1)
async function tryCreateExclusive(lock, dir) {
  let path = getLockPath(dir),
    body = jsonStringify(lock);
  try {
    return (await writeFile(path, body, { flag: "wx" }), !0);
  } catch (error) {
    let code = getErrnoCode(error);
    if (code === "EEXIST") return !1;
    if (code === "ENOENT") {
      await mkdir(dirname(path), { recursive: !0 });
      try {
        return (await writeFile(path, body, { flag: "wx" }), !0);
      } catch (retryErr) {
        if (getErrnoCode(retryErr) === "EEXIST") return !1;
        throw retryErr;
      }
    }
    throw error;
  }
}
/**
 * 为调度锁登记一次性退出清理（进程退出时 releaseSchedulerLock）。实际属于 utils/cronTasksLock.ts。
 */
//@ chunk-hnzqng4j.js:3598-3687 placement = unregisterAgentForeground (0.595)
function registerSchedulerLockCleanup(lockState, options) {
  (lockState.unregisterCleanup?.(),
    (lockState.unregisterCleanup = registerCleanup(async () => {
      await releaseSchedulerLock(lockState, options);
    })));
}
/**
 * 抢调度锁：独占创建成功即持有；同会话不同 PID 时改写为本进程；持有者进程仍在且身份匹配则失败（记录占用者）；否则视为陈旧锁删除后重试。持有时登记退出清理。
 */
//@ chunk-hnzqng4j.js:3687-4453 fingerprint = tryAcquireSchedulerLock (0.924)
async function tryAcquireSchedulerLock(lockState, options) {
  let dir = options?.dir;
  if (isDurableCronUnavailable(dir)) return !1;
  await ensureClaudeRuntimeFilesExcluded(dir ?? getProjectRoot());
  let sessionId = options?.lockIdentity ?? getSessionId(),
    lockRecord = {
      sessionId: sessionId,
      pid: process.pid,
      procStart: ownProcStart(),
      acquiredAt: Date.now(),
    };
  if (await tryCreateExclusive(lockRecord, dir))
    return (
      (lockState.lastBlockedBy = void 0),
      registerSchedulerLockCleanup(lockState, options),
      logForDebugging(`[ScheduledTasks] acquired scheduler lock (PID ${process.pid})`),
      !0
    );
  let existing = await readLock(dir);
  if (existing?.sessionId === sessionId) {
    if (existing.pid !== process.pid)
      (await writeFile(getLockPath(dir), jsonStringify(lockRecord)),
        registerSchedulerLockCleanup(lockState, options));
    return !0;
  }
  if (
    existing &&
    isProcessRunning(existing.pid) &&
    (await isSameProcessAsync(existing.pid, existing.procStart))
  ) {
    if (lockState.lastBlockedBy !== existing.sessionId)
      ((lockState.lastBlockedBy = existing.sessionId),
        logForDebugging(
          `[ScheduledTasks] scheduler lock held by session ${existing.sessionId} (PID ${existing.pid})`,
        ));
    return !1;
  }
  if (existing) logForDebugging(`[ScheduledTasks] recovering stale scheduler lock from PID ${existing.pid}`);
  if ((await unlink(getLockPath(dir)).catch(() => {}), await tryCreateExclusive(lockRecord, dir)))
    return ((lockState.lastBlockedBy = void 0), registerSchedulerLockCleanup(lockState, options), !0);
  return !1;
}
/**
 * 释放调度锁：只有锁属于本会话时才删除。
 */
//@ chunk-hnzqng4j.js:4453-4668 fingerprint = releaseSchedulerLock (0.914)
async function releaseSchedulerLock(lockState, options) {
  lockState.reset();
  let dir = options?.dir;
  try {
    dir ??= getProjectRoot();
  } catch {
    return;
  }
  let sessionId = options?.lockIdentity ?? getSessionId(),
    existing = await readLock(dir);
  if (!existing || existing.sessionId !== sessionId) return;
  try {
    (await unlink(getLockPath(dir)), logForDebugging("[ScheduledTasks] released scheduler lock"));
  } catch {}
}

export { releaseSchedulerLock, tryAcquireSchedulerLock };
