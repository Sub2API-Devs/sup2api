/**
 * utils/cronTasksLock.ts
 *
 * 定时任务调度锁（.claude/scheduled_tasks.lock）：同一项目只允许一个会话触发持久化任务，支持同会话换进程接管与陈旧锁回收
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cronTasksLock.ts
 * pieces: chunk-75adsf9v.js (7)
 * attribution: fingerprint 4, layout 1, file-local 1, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname } from "path";
import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema, numberSchema } from "../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-75adsf9v.js:3043-3164 fingerprint (2.1.88 match: LOCK_FILE_REL, 0.746)
/**
 * 锁文件相对路径 .claude/scheduled_tasks.lock 与锁内容 schema {sessionId, pid, procStart?, acquiredAt}。
 */
var LOCK_FILE_REL = join(".claude", "scheduled_tasks.lock");
var schedulerLockSchema = DoctorLazy(() =>
  objectSchema({
    sessionId: stringSchema(),
    pid: numberSchema(),
    procStart: stringSchema().optional(),
    acquiredAt: numberSchema(),
  }),
);
//@ chunk-75adsf9v.js:3164-3200 layout
function getLockPath(dir) {
  return join(dir ?? getProjectRoot(), LOCK_FILE_REL);
}
//@ chunk-75adsf9v.js:3200-3330 file-local
/**
 * 读取并校验锁文件，失败返回 undefined。
 */
async function readLock(dir) {
  let raw;
  try {
    raw = await readFile(getLockPath(dir), "utf8");
  } catch {
    return;
  }
  let result = schedulerLockSchema().safeParse(safeParseJSON(raw, false));
  return result.success ? result.data : undefined;
}
//@ chunk-75adsf9v.js:3330-3599 fingerprint (2.1.88 match: tryCreateExclusive, 1)
/**
 * 以 wx 独占方式创建锁文件（目录不存在时先建），已存在返回 false。
 */
async function tryCreateExclusive(lock, dir) {
  let path = getLockPath(dir);
  let body = jsonStringify(lock);
  try {
    await writeFile(path, body, {
      flag: "wx",
    });
    return true;
  } catch (e) {
    let code = getErrnoCode(e);
    if (code === "EEXIST") return false;
    if (code === "ENOENT") {
      await mkdir(dirname(path), {
        recursive: true,
      });
      try {
        await writeFile(path, body, {
          flag: "wx",
        });
        return true;
      } catch (retryErr) {
        if (getErrnoCode(retryErr) === "EEXIST") return false;
        throw retryErr;
      }
    }
    throw e;
  }
}
//@ chunk-75adsf9v.js:3599-3688 placement (2.1.88 match: unregisterAgentForeground, 0.596)
/**
 * 为调度锁登记一次性退出清理（进程退出时 releaseSchedulerLock）。实际属于 utils/cronTasksLock.ts。
 */
function registerSchedulerLockCleanup(lockState, options) {
  lockState.unregisterCleanup?.();
  lockState.unregisterCleanup = registerCleanup(async () => {
    await releaseSchedulerLock(lockState, options);
  });
}
//@ chunk-75adsf9v.js:3688-4454 fingerprint (2.1.88 match: tryAcquireSchedulerLock, 0.923)
/**
 * 抢调度锁：独占创建成功即持有；同会话不同 PID 时改写为本进程；持有者进程仍在且身份匹配则失败（记录占用者）；否则视为陈旧锁删除后重试。持有时登记退出清理。
 */
async function tryAcquireSchedulerLock(lockState, options) {
  let dir = options?.dir;
  if (isDurableCronUnavailable(dir)) return false;
  await ensureClaudeRuntimeFilesExcluded(dir ?? getProjectRoot());
  let sessionId = options?.lockIdentity ?? getSessionId();
  let lockRecord = {
    sessionId,
    pid: process.pid,
    procStart: ownProcStart(),
    acquiredAt: Date.now(),
  };
  if (await tryCreateExclusive(lockRecord, dir)) {
    lockState.lastBlockedBy = undefined;
    registerSchedulerLockCleanup(lockState, options);
    logForDebugging(`[ScheduledTasks] acquired scheduler lock (PID ${process.pid})`);
    return true;
  }
  let existing = await readLock(dir);
  if (existing?.sessionId === sessionId) {
    if (existing.pid !== process.pid) {
      await writeFile(getLockPath(dir), jsonStringify(lockRecord));
      registerSchedulerLockCleanup(lockState, options);
    }
    return true;
  }
  if (
    existing &&
    isProcessRunning(existing.pid) &&
    (await isSameProcessAsync(existing.pid, existing.procStart))
  ) {
    if (lockState.lastBlockedBy !== existing.sessionId) {
      lockState.lastBlockedBy = existing.sessionId;
      logForDebugging(
        `[ScheduledTasks] scheduler lock held by session ${existing.sessionId} (PID ${existing.pid})`,
      );
    }
    return false;
  }
  if (existing) logForDebugging(`[ScheduledTasks] recovering stale scheduler lock from PID ${existing.pid}`);
  await unlink(getLockPath(dir)).catch(() => {});
  if (await tryCreateExclusive(lockRecord, dir)) {
    lockState.lastBlockedBy = undefined;
    registerSchedulerLockCleanup(lockState, options);
    return true;
  }
  return false;
}
//@ chunk-75adsf9v.js:4454-4669 fingerprint (2.1.88 match: releaseSchedulerLock, 0.914)
/**
 * 释放调度锁：只有锁属于本会话时才删除。
 */
async function releaseSchedulerLock(lockState, options) {
  lockState.reset();
  let dir = options?.dir;
  try {
    dir ??= getProjectRoot();
  } catch {
    return;
  }
  let sessionId = options?.lockIdentity ?? getSessionId();
  let existing = await readLock(dir);
  if (!existing || existing.sessionId !== sessionId) return;
  try {
    await unlink(getLockPath(dir));
    logForDebugging("[ScheduledTasks] released scheduler lock");
  } catch {}
}
export { releaseSchedulerLock, tryAcquireSchedulerLock };
