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
import { join } from "path";
import { stat, readFile, mkdir, writeFile, unlink, utimes, realpath } from "fs/promises";
import { projectKeyFromMemoryDir } from "../../memdir/teamMemPrompts.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { getAutoMemPath } from "../../memdir/paths.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { getProjectDir } from "../../utils/sessionStorage.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { listCandidates } from "../../utils/listSessionsImpl.js";

//@ chunk-bnqjt88v.js:676-712 fingerprint = LOCK_FILE (1)
/**
 * 整理锁文件名 .consolidate-lock，锁有效期 1 小时。
 */
var CONSOLIDATION_LOCK_FILE = ".consolidate-lock";
var LOCK_STALE_MS = 3600000;
//@ chunk-bnqjt88v.js:712-740 layout
function getConsolidationLockPath(e) {
  return join(e, CONSOLIDATION_LOCK_FILE);
}
//@ chunk-bnqjt88v.js:740-808 layout
function getConsolidationLockKey(e) {
  let n = projectKeyFromMemoryDir(e);
  return n === undefined ? undefined : STORAGE_SPACES.memory(n, [CONSOLIDATION_LOCK_FILE]);
}
//@ chunk-bnqjt88v.js:808-1001 layout
/**
 * 解析整理锁内容：第一行持有者 PID，第二行上次整理时间（缺省用文件 mtime）。
 */
function parseConsolidationLock(e, mtimeMs) {
  let [a = "", r = ""] = e.split(`
`);
  let o = parseInt(a.trim(), 10);
  let i = r.trim() === "" ? NaN : Number(r.trim());
  return {
    holderPid: Number.isFinite(o) ? o : undefined,
    lastConsolidatedAt: Number.isFinite(i) ? i : mtimeMs,
  };
}
//@ chunk-bnqjt88v.js:1001-1039 layout
function formatConsolidationLock(e, n) {
  return `${e ?? ""}
${n}`;
}
//@ chunk-bnqjt88v.js:1039-1305 layout
/**
 * 读取上次整理时间（锁文件 mtime 或第二行时间戳），无锁返回 0。
 */
async function readLastConsolidatedAt(e = getAutoMemPath(), storageV5) {
  let a = isStorageV5Enabled() && storageV5 !== undefined ? getConsolidationLockKey(e) : undefined;
  if (storageV5 && a) {
    let text = await storageV5.readText([a]);
    if (!text.ok || !text.value.items[0].found) return 0;
    let { value: o, mtimeMs } = text.value.items[0];
    return parseConsolidationLock(o, mtimeMs).lastConsolidatedAt;
  }
  try {
    return (await stat(getConsolidationLockPath(e))).mtimeMs;
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
async function tryAcquireConsolidationLock(autoMemPath, n) {
  let a = isStorageV5Enabled() && n !== undefined ? getConsolidationLockKey(autoMemPath) : undefined;
  if (n && a) return tryAcquireConsolidationLockStorage(n, a);
  let path = getConsolidationLockPath(autoMemPath);
  let mtimeMs;
  let holderPid;
  try {
    let [s, raw] = await Promise.all([stat(path), readFile(path, "utf8")]);
    mtimeMs = s.mtimeMs;
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
  await mkdir(autoMemPath, {
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
async function rollbackConsolidationLockDefault(e, storageV5) {
  return rollbackConsolidationLock(getAutoMemPath(), e, storageV5);
}
//@ chunk-bnqjt88v.js:1932-2191 fingerprint = rollbackConsolidationLock (1)
/**
 * 整理失败时把锁文件 mtime 回滚到之前的时间（为 0 则删除锁），下次触发仍受 minHours 约束。
 */
async function rollbackConsolidationLock(autoMemPath, n, a) {
  let r = isStorageV5Enabled() && a !== undefined ? getConsolidationLockKey(autoMemPath) : undefined;
  if (a && r) return rollbackConsolidationLockStorage(a, r, n);
  let consolidationLockPath = getConsolidationLockPath(autoMemPath);
  try {
    if (n === 0) {
      await unlink(consolidationLockPath);
      return;
    }
    await writeFile(consolidationLockPath, "");
    let t = n / 1000;
    await utimes(consolidationLockPath, t, t);
  } catch (e) {
    logForDebugging(
      `[autoDream] rollback failed: ${errorMessage(e)} \u2014 next trigger delayed to minHours`,
    );
  }
}
//@ chunk-bnqjt88v.js:2191-2808 layout
async function tryAcquireConsolidationLockStorage(e, n) {
  let text = await e.readText([n]);
  let r = text.ok ? text.value.items[0] : undefined;
  let version = r?.found ? r.version : undefined;
  let i = r?.found ? parseConsolidationLock(r.value, r.mtimeMs) : undefined;
  if (i !== undefined && Date.now() - i.lastConsolidatedAt < LOCK_STALE_MS) {
    if (i.holderPid !== undefined && isProcessRunning(i.holderPid)) {
      logForDebugging(
        `[autoDream] lock held by live PID ${i.holderPid} (acquired ${Math.round((Date.now() - i.lastConsolidatedAt) / 1000)}s ago)`,
      );
      return null;
    }
  }
  let u = await e.updateText(
    n,
    (s) =>
      (s?.version ?? undefined) === version
        ? {
            write: formatConsolidationLock(process.pid, Date.now()),
            result: true,
          }
        : {
            skip: true,
            result: false,
          },
    r?.found
      ? {
          publishDiscipline: "inPlace",
        }
      : undefined,
  );
  if (!u.ok || u.value.result !== true) return null;
  return i?.lastConsolidatedAt ?? 0;
}
//@ chunk-bnqjt88v.js:2808-3039 layout
async function rollbackConsolidationLockStorage(e, n, a) {
  let r =
    a === 0
      ? await e.delete(n)
      : await e.updateText(
          n,
          () => ({
            write: formatConsolidationLock(undefined, a),
          }),
          {
            publishDiscipline: "inPlace",
          },
        );
  if (!r.ok)
    logForDebugging(`[autoDream] rollback failed: ${r.error.code} \u2014 next trigger delayed to minHours`);
}
//@ chunk-bnqjt88v.js:3039-3156 callgraph-witnessed = listSessionsTouchedSince (1)
/**
 * 列出当前项目转录目录中 mtime 晚于给定时间的会话 id。
 */
async function listSessionsTouchedSince(sinceMs, storageV5) {
  let dir = getProjectDir(getOriginalCwd());
  return (await listCandidates(dir, true, undefined, storageV5))
    .filter((o) => o.mtime > sinceMs)
    .map((o) => o.sessionId);
}
//@ chunk-ss669z1x.js:50836-50966 fingerprint = readLastConsolidatedAt (0.682)
async function statRealPath(r) {
  try {
    let e = await realpath(r);
    let o = await stat(e);
    return {
      target: e,
      mtimeMs: o.mtimeMs,
    };
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
}
export {
  readLastConsolidatedAt,
  rollbackConsolidationLockDefault,
  listSessionsTouchedSince,
  tryAcquireConsolidationLockDefault,
  statRealPath,
};
