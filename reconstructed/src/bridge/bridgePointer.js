/**
 * bridge/bridgePointer.ts
 *
 * bridge pointer 文件（~/.claude/projects/<目录>/bridge-pointer.json）：记录当前目录的 environment/会话以便 --continue 和崩溃恢复，读写清除、过期判定、跨 worktree 查找
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgePointer.ts
 * pieces: chunk-7snpqrde.js (16)
 * attribution: facade-exports 11, layout 3, fingerprint 1, sole-consumer 1
 */
import { join, dirname } from "path";
import { mkdir, stat, readFile, unlink } from "fs/promises";
import { isBridgeRcChildRestartResumeEnabled } from "./bridgeGates.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { string, u, union, literal, _enum, E, array } from "../../vendor/zod/v4/classic/schemas.js";
import { isSafeBridgeId } from "./sessionIdCompat.js";
import { getProjectsDir, getProjectKey } from "../utils/sessionStoragePortable.js";
import { isValidKeySegment, STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { logForDebugging } from "../utils/debug.js";
import { formatStorageError } from "../utils/storage/storageErrors.js";
import { writeFileAtomic } from "../utils/atomicPublishWrite.js";
import { getWorktreePathsPortable } from "../utils/getWorktreePathsPortable.js";
import { isENOENT } from "../utils/errors.js";

//@ chunk-7snpqrde.js:724-758 facade-exports
var MAX_POINTER_WORKTREE_FANOUT = 50;
var BRIDGE_POINTER_TTL_MS = 14400000;
var POINTER_PERSISTED_STAMP_FRESH_MS = 604800000;
//@ chunk-7snpqrde.js:758-833 layout
function hasFreshPersistedThreadSessions(e, r, n) {
  return (
    isBridgeRcChildRestartResumeEnabled() &&
    Boolean(e?.length) &&
    r !== undefined &&
    isPersistedStampFresh(r, n, POINTER_PERSISTED_STAMP_FRESH_MS)
  );
}
//@ chunk-7snpqrde.js:833-959 facade-exports
function freshProjectThreadSessionIds(e, r) {
  return hasFreshPersistedThreadSessions(e.projectThreadSessionIds, e.projectThreadSessionIdsPersistedAt, r)
    ? e.projectThreadSessionIds
    : undefined;
}
//@ chunk-7snpqrde.js:959-1103 facade-exports
function freshParkedProjectThreadSessionIds(e, r) {
  return hasFreshPersistedThreadSessions(
    e.parkedProjectThreadSessionIds,
    e.parkedProjectThreadSessionIdsPersistedAt,
    r,
  )
    ? (e.parkedProjectThreadSessionIds ?? [])
    : [];
}
//@ chunk-7snpqrde.js:1103-1207 layout
function getBridgePointerTtlMs(e, options, n) {
  if (
    options?.projectThreadResume &&
    (freshProjectThreadSessionIds(e, n) !== undefined || freshParkedProjectThreadSessionIds(e, n).length > 0)
  )
    return POINTER_PERSISTED_STAMP_FRESH_MS;
  return BRIDGE_POINTER_TTL_MS;
}
//@ chunk-7snpqrde.js:1207-1231 facade-exports
var PERSISTED_SESSION_RESUME_WINDOW_MS = 900000;
var PERSISTED_STAMP_SKEW_TOLERANCE_MS = 120000;
//@ chunk-7snpqrde.js:1231-1273 facade-exports
function isPersistedStampFresh(e, r, n) {
  return r - e <= n && e - r <= PERSISTED_STAMP_SKEW_TOLERANCE_MS;
}
//@ chunk-7snpqrde.js:1273-1857 facade-exports = BridgePointerSchema (0.417)
/**
 * pointer schema：sessionId、environmentId、source（standalone/repl）、pid、procStart、activeSessionIds 及项目线程会话相关字段（数组上限 64）。
 */
var MAX_POINTER_ACTIVE_SESSION_IDS = 64;
var safeIdSchema = DoctorLazy(() => string().max(256).refine(isSafeBridgeId));
var bridgePointerSchema = DoctorLazy(() =>
  u({
    sessionId: union([literal(""), safeIdSchema()]),
    environmentId: safeIdSchema(),
    source: _enum(["standalone", "repl"]),
    pid: E().optional(),
    procStart: string().optional(),
    activeSessionIds: array(safeIdSchema()).max(MAX_POINTER_ACTIVE_SESSION_IDS).optional(),
    activeSessionIdsPersistedAt: E().int().min(0).max(8640000000000000).optional(),
    projectThreadSessionIds: array(safeIdSchema()).max(MAX_POINTER_ACTIVE_SESSION_IDS).optional(),
    parkedProjectThreadSessionIds: array(safeIdSchema()).max(MAX_POINTER_ACTIVE_SESSION_IDS).optional(),
    parkedProjectThreadSessionIdsPersistedAt: E().int().min(0).max(8640000000000000).optional(),
    projectThreadSessionIdsPersistedAt: E().int().min(0).max(8640000000000000).optional(),
  }),
);
//@ chunk-7snpqrde.js:1857-1914 fingerprint = getBridgePointerPath (1)
function getBridgePointerPath(dir) {
  return join(getProjectsDir(), getProjectKey(dir), "bridge-pointer.json");
}
//@ chunk-7snpqrde.js:1914-1978 layout
function bridgePointerStoreKey(dir) {
  let projectKey = getProjectKey(dir);
  return isValidKeySegment(projectKey) ? STORAGE_SPACES.bridgePointer(projectKey) : null;
}
//@ chunk-7snpqrde.js:1978-2419 facade-exports = writeBridgePointer (0.924)
async function writeBridgePointer(dir, pointer, storageV5) {
  let path = getBridgePointerPath(dir);
  let i = isStorageV5Enabled() && storageV5 !== undefined ? bridgePointerStoreKey(dir) : null;
  if (isStorageV5Enabled() && storageV5 !== undefined && i) {
    let d = await storageV5.write(i, jsonStringify(pointer), {
      mode: 438 & ~process.umask(),
    });
    if (!d.ok) {
      logForDebugging(`[bridge:pointer] write failed: ${formatStorageError(d.error)}`, {
        level: "warn",
      });
      return false;
    }
    logForDebugging(`[bridge:pointer] wrote ${path}`);
    return true;
  }
  try {
    await mkdir(dirname(path), {
      recursive: true,
    });
    await writeFileAtomic(path, jsonStringify(pointer));
    logForDebugging(`[bridge:pointer] wrote ${path}`);
    return true;
  } catch (err) {
    logForDebugging(`[bridge:pointer] write failed: ${err}`, {
      level: "warn",
    });
    return false;
  }
}
//@ chunk-7snpqrde.js:2419-2487 facade-exports
/**
 * 串行化 pointer 写入的队列。
 */
function createBridgePointerWriteQueue() {
  let resolved = Promise.resolve();
  return (r) => {
    resolved = resolved.then(r, r);
    return resolved;
  };
}
//@ chunk-7snpqrde.js:2487-3097 facade-exports = readBridgePointer (0.564)
/**
 * 读 pointer：schema 不符或 mtime 超过保留期（按 source/项目线程计算）时清除并返回 null；返回值附 ageMs。
 */
async function readBridgePointer(dir, options, storageV5) {
  let path = getBridgePointerPath(dir);
  let i;
  let d;
  let g = storageV5 ? bridgePointerStoreKey(dir) : null;
  if (storageV5 && g) {
    let l = await storageV5.read([g]);
    if (!l.ok || !l.value.items[0].found) return null;
    d = l.value.items[0].mtimeMs;
    i = Buffer.from(l.value.items[0].value).toString("utf8");
  } else
    try {
      d = (await stat(path)).mtimeMs;
      i = await readFile(path, "utf8");
    } catch {
      return null;
    }
  let parsed = bridgePointerSchema().safeParse(parseBridgePointerJson(i));
  if (!parsed.success) {
    if (!options?.noClear) {
      logForDebugging(`[bridge:pointer] invalid schema, clearing: ${path}`);
      await clearBridgePointer(dir, storageV5);
    }
    return null;
  }
  let now = Date.now();
  let ageMs = Math.max(0, now - d);
  if (!options?.ignoreTtl && ageMs > getBridgePointerTtlMs(parsed.data, options, now)) {
    if (!options?.noClear) {
      logForDebugging(`[bridge:pointer] stale mtime, clearing: ${path}`);
      await clearBridgePointer(dir, storageV5);
    }
    return null;
  }
  return {
    ...parsed.data,
    ageMs,
  };
}
//@ chunk-7snpqrde.js:3097-3639 facade-exports = readBridgePointerAcrossWorktrees (1)
async function readBridgePointerAcrossWorktrees(dir, storageV5, options) {
  let here = await readBridgePointer(dir, options, storageV5);
  if (here)
    return {
      pointer: here,
      dir,
    };
  let worktrees = await getWorktreePathsPortable(dir);
  if (worktrees.length <= 1) return null;
  if (worktrees.length > MAX_POINTER_WORKTREE_FANOUT) {
    logForDebugging(
      `[bridge:pointer] ${worktrees.length} worktrees exceeds fanout cap ${MAX_POINTER_WORKTREE_FANOUT}, skipping`,
    );
    return null;
  }
  let dirKey = getProjectKey(dir);
  let candidates = worktrees.filter((wt) => getProjectKey(wt) !== dirKey);
  let results = await Promise.all(
    candidates.map(async (wt) => {
      let bridgePointer = await readBridgePointer(wt, undefined, storageV5);
      return bridgePointer
        ? {
            pointer: bridgePointer,
            dir: wt,
          }
        : null;
    }),
  );
  let freshest = null;
  for (let result of results)
    if (result && (!freshest || result.pointer.ageMs < freshest.pointer.ageMs)) freshest = result;
  if (freshest)
    logForDebugging(
      `[bridge:pointer] fanout found pointer in worktree ${freshest.dir} (ageMs=${freshest.pointer.ageMs})`,
    );
  return freshest;
}
//@ chunk-7snpqrde.js:3639-3994 facade-exports = clearBridgePointer (0.859)
async function clearBridgePointer(dir, storageV5) {
  let path = getBridgePointerPath(dir);
  let s = storageV5 ? bridgePointerStoreKey(dir) : null;
  if (storageV5 && s) {
    let i = await storageV5.delete(s);
    if (i.ok || i.error.code === "NotFound") logForDebugging(`[bridge:pointer] cleared ${path}`);
    else
      logForDebugging(`[bridge:pointer] clear failed: ${formatStorageError(i.error)}`, {
        level: "warn",
      });
    return;
  }
  try {
    await unlink(path);
    logForDebugging(`[bridge:pointer] cleared ${path}`);
  } catch (err) {
    if (!isENOENT(err))
      logForDebugging(`[bridge:pointer] clear failed: ${err}`, {
        level: "warn",
      });
  }
}
//@ chunk-7snpqrde.js:3994-4044 sole-consumer
function parseBridgePointerJson(e) {
  try {
    return jsonParse(e);
  } catch {
    return null;
  }
}
export { MAX_POINTER_ACTIVE_SESSION_IDS };
