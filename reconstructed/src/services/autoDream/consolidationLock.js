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
import { stat, readFile, mkdir, writeFile, unlink, utimes, realpath, stat as stat_2 } from "fs/promises";
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

/**
 * 整理锁文件名 .consolidate-lock，锁有效期 1 小时。
 */
//@ chunk-bnqjt88v.js:676-712 fingerprint = LOCK_FILE (1)
var CONSOLIDATION_LOCK_FILE = ".consolidate-lock",
  LOCK_STALE_MS = 3600000;
//@ chunk-bnqjt88v.js:712-740 layout
function getConsolidationLockPath(e) {
  return join(e, CONSOLIDATION_LOCK_FILE);
}
//@ chunk-bnqjt88v.js:740-808 layout
function getConsolidationLockKey(e) {
  let n = projectKeyFromMemoryDir(e);
  return n === void 0 ? void 0 : STORAGE_SPACES.memory(n, [CONSOLIDATION_LOCK_FILE]);
}
/**
 * 解析整理锁内容：第一行持有者 PID，第二行上次整理时间（缺省用文件 mtime）。
 */
//@ chunk-bnqjt88v.js:808-1001 layout
function parseConsolidationLock(e, n) {
  let [a = "", r = ""] = e.split(`
`),
    o = parseInt(a.trim(), 10),
    i = r.trim() === "" ? NaN : Number(r.trim());
  return { holderPid: Number.isFinite(o) ? o : void 0, lastConsolidatedAt: Number.isFinite(i) ? i : n };
}
//@ chunk-bnqjt88v.js:1001-1039 layout
function formatConsolidationLock(e, n) {
  return `${e ?? ""}
${n}`;
}
/**
 * 读取上次整理时间（锁文件 mtime 或第二行时间戳），无锁返回 0。
 */
//@ chunk-bnqjt88v.js:1039-1305 layout
async function readLastConsolidatedAt(e = getAutoMemPath(), n) {
  let a = isStorageV5Enabled() && n !== void 0 ? getConsolidationLockKey(e) : void 0;
  if (n && a) {
    let text = await n.readText([a]);
    if (!text.ok || !text.value.items[0].found) return 0;
    let { value: o, mtimeMs: mtimeMs } = text.value.items[0];
    return parseConsolidationLock(o, mtimeMs).lastConsolidatedAt;
  }
  try {
    return (await stat(getConsolidationLockPath(e))).mtimeMs;
  } catch {
    return 0;
  }
}
//@ chunk-bnqjt88v.js:1305-1344 layout
async function tryAcquireConsolidationLockDefault(e) {
  return tryAcquireConsolidationLock(getAutoMemPath(), e);
}
/**
 * 获取整理锁：<记忆目录>/.consolidate-lock 内容为 PID，mtime 即上次整理时间；1 小时内且持有进程仍存活则放弃，否则写入自己的 PID 并回读确认。
 */
//@ chunk-bnqjt88v.js:1344-1889 fingerprint = tryAcquireConsolidationLock (1)
async function tryAcquireConsolidationLock(e, n) {
  let a = isStorageV5Enabled() && n !== void 0 ? getConsolidationLockKey(e) : void 0;
  if (n && a) return tryAcquireConsolidationLockStorage(n, a);
  let r = getConsolidationLockPath(e),
    o,
    i;
  try {
    let [s, w] = await Promise.all([stat(r), readFile(r, "utf8")]);
    o = s.mtimeMs;
    let parsed = parseInt(w.trim(), 10);
    i = Number.isFinite(parsed) ? parsed : void 0;
  } catch {}
  if (o !== void 0 && Date.now() - o < LOCK_STALE_MS) {
    if (i !== void 0 && isProcessRunning(i))
      return (
        logForDebugging(
          `[autoDream] lock held by live PID ${i} (mtime ${Math.round((Date.now() - o) / 1000)}s ago)`,
        ),
        null
      );
  }
  (await mkdir(e, { recursive: !0 }), await writeFile(r, String(process.pid)));
  let u;
  try {
    u = await readFile(r, "utf8");
  } catch {
    return null;
  }
  if (parseInt(u.trim(), 10) !== process.pid) return null;
  return o ?? 0;
}
//@ chunk-bnqjt88v.js:1889-1932 layout
async function rollbackConsolidationLockDefault(e, n) {
  return rollbackConsolidationLock(getAutoMemPath(), e, n);
}
/**
 * 整理失败时把锁文件 mtime 回滚到之前的时间（为 0 则删除锁），下次触发仍受 minHours 约束。
 */
//@ chunk-bnqjt88v.js:1932-2191 fingerprint = rollbackConsolidationLock (1)
async function rollbackConsolidationLock(e, n, a) {
  let r = isStorageV5Enabled() && a !== void 0 ? getConsolidationLockKey(e) : void 0;
  if (a && r) return rollbackConsolidationLockStorage(a, r, n);
  let o = getConsolidationLockPath(e);
  try {
    if (n === 0) {
      await unlink(o);
      return;
    }
    await writeFile(o, "");
    let i = n / 1000;
    await utimes(o, i, i);
  } catch (error) {
    logForDebugging(
      `[autoDream] rollback failed: ${errorMessage(error)} \u2014 next trigger delayed to minHours`,
    );
  }
}
//@ chunk-bnqjt88v.js:2191-2808 layout
async function tryAcquireConsolidationLockStorage(e, n) {
  let text = await e.readText([n]),
    r = text.ok ? text.value.items[0] : void 0,
    o = r?.found ? r.version : void 0,
    i = r?.found ? parseConsolidationLock(r.value, r.mtimeMs) : void 0;
  if (i !== void 0 && Date.now() - i.lastConsolidatedAt < LOCK_STALE_MS) {
    if (i.holderPid !== void 0 && isProcessRunning(i.holderPid))
      return (
        logForDebugging(
          `[autoDream] lock held by live PID ${i.holderPid} (acquired ${Math.round((Date.now() - i.lastConsolidatedAt) / 1000)}s ago)`,
        ),
        null
      );
  }
  let updateText = await e.updateText(
    n,
    (s) =>
      (s?.version ?? void 0) === o
        ? { write: formatConsolidationLock(process.pid, Date.now()), result: !0 }
        : { skip: !0, result: !1 },
    r?.found ? { publishDiscipline: "inPlace" } : void 0,
  );
  if (!updateText.ok || updateText.value.result !== !0) return null;
  return i?.lastConsolidatedAt ?? 0;
}
//@ chunk-bnqjt88v.js:2808-3039 layout
async function rollbackConsolidationLockStorage(e, n, a) {
  let r =
    a === 0
      ? await e.delete(n)
      : await e.updateText(n, () => ({ write: formatConsolidationLock(void 0, a) }), {
          publishDiscipline: "inPlace",
        });
  if (!r.ok)
    logForDebugging(`[autoDream] rollback failed: ${r.error.code} \u2014 next trigger delayed to minHours`);
}
/**
 * 列出当前项目转录目录中 mtime 晚于给定时间的会话 id。
 */
//@ chunk-bnqjt88v.js:3039-3156 callgraph-witnessed = listSessionsTouchedSince (1)
async function listSessionsTouchedSince(e, n) {
  let dir = getProjectDir(getOriginalCwd());
  return (await listCandidates(dir, !0, void 0, n)).filter((o) => o.mtime > e).map((o) => o.sessionId);
}
//@ chunk-ss669z1x.js:50836-50966 fingerprint = readLastConsolidatedAt (0.682)
async function statRealPath(r) {
  try {
    let e = await realpath(r),
      o = await stat_2(e);
    return { target: e, mtimeMs: o.mtimeMs };
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
