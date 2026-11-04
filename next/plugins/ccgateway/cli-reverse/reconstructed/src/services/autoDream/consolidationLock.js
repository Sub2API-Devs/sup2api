/**
 * services/autoDream/consolidationLock.ts
 *
 * 整理锁 .consolidate-lock 的获取、回滚、读取上次整理时间，以及列出期间改动过的会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/autoDream/consolidationLock.ts
 * pieces: chunk-bnqjt88v.js (13), chunk-ss669z1x.js (1)
 * attribution: fingerprint 4, layout 9, callgraph-witnessed 1
 */
import { realpath, stat, readFile, mkdir, writeFile, unlink, utimes } from "fs/promises";
import { join } from "path";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import { projectKeyFromMemoryDir } from "../../memdir/teamMemPrompts.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { getAutoMemPath } from "../../memdir/paths.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { getProjectDir } from "../../utils/sessionStorage.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { listCandidates } from "../../utils/listSessionsImpl.js";

//@ chunk-ss669z1x.js:50836-50966 fingerprint = readLastConsolidatedAt (0.682)
async function statRealPath(filePath) {
  try {
    let resolvedPath = await realpath(filePath);
    let stats = await stat(resolvedPath);
    return {
      target: resolvedPath,
      mtimeMs: stats.mtimeMs,
    };
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
}
//@ chunk-bnqjt88v.js:676-712 fingerprint = LOCK_FILE (1)
/**
 * 整理锁文件名 .consolidate-lock，锁有效期 1 小时。
 */
var CONSOLIDATION_LOCK_FILE = ".consolidate-lock";
var LOCK_STALE_MS = 3600000;
//@ chunk-bnqjt88v.js:712-740 layout
function getConsolidationLockPath(memoryDir) {
  return join(memoryDir, CONSOLIDATION_LOCK_FILE);
}
//@ chunk-bnqjt88v.js:740-808 layout
function getConsolidationLockKey(memoryDir) {
  let projectKey = projectKeyFromMemoryDir(memoryDir);
  return projectKey === undefined ? undefined : STORAGE_SPACES.memory(projectKey, [CONSOLIDATION_LOCK_FILE]);
}
//@ chunk-bnqjt88v.js:808-1001 layout
/**
 * 解析整理锁内容：第一行持有者 PID，第二行上次整理时间（缺省用文件 mtime）。
 */
function parseConsolidationLock(text, mtimeMs) {
  let [pidLine = "", timestampLine = ""] = text.split(`
`);
  let holderPidValue = parseInt(pidLine.trim(), 10);
  let lastConsolidatedAtValue = timestampLine.trim() === "" ? NaN : Number(timestampLine.trim());
  return {
    holderPid: Number.isFinite(holderPidValue) ? holderPidValue : undefined,
    lastConsolidatedAt: Number.isFinite(lastConsolidatedAtValue) ? lastConsolidatedAtValue : mtimeMs,
  };
}
//@ chunk-bnqjt88v.js:1001-1039 layout
function formatConsolidationLock(holderPid, lastConsolidatedAt) {
  return `${holderPid ?? ""}
${lastConsolidatedAt}`;
}
//@ chunk-bnqjt88v.js:1039-1305 layout
/**
 * 读取上次整理时间（锁文件 mtime 或第二行时间戳），无锁返回 0。
 */
async function readLastConsolidatedAt(memoryDir = getAutoMemPath(), storageV5) {
  let storageKey =
    isStorageV5Enabled() && storageV5 !== undefined ? getConsolidationLockKey(memoryDir) : undefined;
  if (storageV5 && storageKey) {
    let text = await storageV5.readText([storageKey]);
    if (!text.ok || !text.value.items[0].found) return 0;
    let { value: contents, mtimeMs } = text.value.items[0];
    return parseConsolidationLock(contents, mtimeMs).lastConsolidatedAt;
  }
  try {
    return (await stat(getConsolidationLockPath(memoryDir))).mtimeMs;
  } catch {
    return 0;
  }
}
//@ chunk-bnqjt88v.js:1305-1344 layout
async function tryAcquireConsolidationLockDefault(storageV5) {
  return tryAcquireConsolidationLock(getAutoMemPath(), storageV5);
}
//@ chunk-bnqjt88v.js:1344-1889 fingerprint = tryAcquireConsolidationLock (1)
/**
 * 获取整理锁：<记忆目录>/.consolidate-lock 内容为 PID，mtime 即上次整理时间；1 小时内且持有进程仍存活则放弃，否则写入自己的 PID 并回读确认。
 */
async function tryAcquireConsolidationLock(memoryDir, storageV5) {
  let storageKey =
    isStorageV5Enabled() && storageV5 !== undefined ? getConsolidationLockKey(memoryDir) : undefined;
  if (storageV5 && storageKey) return tryAcquireConsolidationLockStorage(storageV5, storageKey);
  let path = getConsolidationLockPath(memoryDir);
  let mtimeMs;
  let holderPid;
  try {
    let [lockStat, raw] = await Promise.all([stat(path), readFile(path, "utf8")]);
    mtimeMs = lockStat.mtimeMs;
    let parsed = parseInt(raw.trim(), 10);
    holderPid = Number.isFinite(parsed) ? parsed : undefined;
  } catch {}
  if (mtimeMs !== undefined && Date.now() - mtimeMs < LOCK_STALE_MS) {
    if (holderPid !== undefined && isProcessRunning(holderPid)) {
      logForDebugging(
        `[autoDream] lock held by live PID ${holderPid} (mtime ${Math.round((Date.now() - mtimeMs) / 1000)}s ago)`,
      );
      return null;
    }
  }
  await mkdir(memoryDir, {
    recursive: true,
  });
  await writeFile(path, String(process.pid));
  let verify;
  try {
    verify = await readFile(path, "utf8");
  } catch {
    return null;
  }
  if (parseInt(verify.trim(), 10) !== process.pid) return null;
  return mtimeMs ?? 0;
}
//@ chunk-bnqjt88v.js:1889-1932 layout
async function rollbackConsolidationLockDefault(priorMtime, storageV5) {
  return rollbackConsolidationLock(getAutoMemPath(), priorMtime, storageV5);
}
//@ chunk-bnqjt88v.js:1932-2191 fingerprint = rollbackConsolidationLock (1)
/**
 * 整理失败时把锁文件 mtime 回滚到之前的时间（为 0 则删除锁），下次触发仍受 minHours 约束。
 */
async function rollbackConsolidationLock(memoryDir, priorMtime, storageV5) {
  let storageKey =
    isStorageV5Enabled() && storageV5 !== undefined ? getConsolidationLockKey(memoryDir) : undefined;
  if (storageV5 && storageKey) return rollbackConsolidationLockStorage(storageV5, storageKey, priorMtime);
  let consolidationLockPath = getConsolidationLockPath(memoryDir);
  try {
    if (priorMtime === 0) {
      await unlink(consolidationLockPath);
      return;
    }
    await writeFile(consolidationLockPath, "");
    let t = priorMtime / 1000;
    await utimes(consolidationLockPath, t, t);
  } catch (e) {
    logForDebugging(
      `[autoDream] rollback failed: ${errorMessage(e)} \u2014 next trigger delayed to minHours`,
    );
  }
}
//@ chunk-bnqjt88v.js:2191-2808 layout
async function tryAcquireConsolidationLockStorage(storage, storageKey) {
  let text = await storage.readText([storageKey]);
  let item = text.ok ? text.value.items[0] : undefined;
  let version = item?.found ? item.version : undefined;
  let lock = item?.found ? parseConsolidationLock(item.value, item.mtimeMs) : undefined;
  if (lock !== undefined && Date.now() - lock.lastConsolidatedAt < LOCK_STALE_MS) {
    if (lock.holderPid !== undefined && isProcessRunning(lock.holderPid)) {
      logForDebugging(
        `[autoDream] lock held by live PID ${lock.holderPid} (acquired ${Math.round((Date.now() - lock.lastConsolidatedAt) / 1000)}s ago)`,
      );
      return null;
    }
  }
  let updateResult = await storage.updateText(
    storageKey,
    (current) =>
      (current?.version ?? undefined) === version
        ? {
            write: formatConsolidationLock(process.pid, Date.now()),
            result: true,
          }
        : {
            skip: true,
            result: false,
          },
    item?.found
      ? {
          publishDiscipline: "inPlace",
        }
      : undefined,
  );
  if (!updateResult.ok || updateResult.value.result !== true) return null;
  return lock?.lastConsolidatedAt ?? 0;
}
//@ chunk-bnqjt88v.js:2808-3039 layout
async function rollbackConsolidationLockStorage(storage, storageKey, priorMtime) {
  let result =
    priorMtime === 0
      ? await storage.delete(storageKey)
      : await storage.updateText(
          storageKey,
          () => ({
            write: formatConsolidationLock(undefined, priorMtime),
          }),
          {
            publishDiscipline: "inPlace",
          },
        );
  if (!result.ok)
    logForDebugging(
      `[autoDream] rollback failed: ${result.error.code} \u2014 next trigger delayed to minHours`,
    );
}
//@ chunk-bnqjt88v.js:3039-3156 callgraph-witnessed = listSessionsTouchedSince (1)
/**
 * 列出当前项目转录目录中 mtime 晚于给定时间的会话 id。
 */
async function listSessionsTouchedSince(sinceMs, storage) {
  let dir = getProjectDir(getOriginalCwd());
  return (await listCandidates(dir, true, undefined, storage))
    .filter((candidate) => candidate.mtime > sinceMs)
    .map((candidate) => candidate.sessionId);
}
export {
  readLastConsolidatedAt,
  rollbackConsolidationLockDefault,
  listSessionsTouchedSince,
  tryAcquireConsolidationLockDefault,
  statRealPath,
};
