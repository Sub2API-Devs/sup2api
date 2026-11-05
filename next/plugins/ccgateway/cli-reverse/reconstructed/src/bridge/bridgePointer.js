/**
 * bridge/bridgePointer.ts
 *
 * bridge pointer 文件（~/.claude/projects/<目录>/bridge-pointer.json）：记录当前目录的 environment/会话以便 --continue 和崩溃恢复，读写清除、过期判定、跨 worktree 查找
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgePointer.ts
 * pieces: chunk-f9wdj71r.js (16)
 * attribution: facade-exports 11, layout 3, fingerprint 1, sole-consumer 1
 */
import { join, dirname } from "path";
import { mkdir, stat, readFile, unlink } from "fs/promises";
import { isBridgeRcChildRestartResumeEnabled } from "./bridgeGates.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  stringSchema,
  objectSchema,
  union,
  literal,
  _enum,
  numberSchema,
  array,
} from "../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-f9wdj71r.js:724-758 facade-exports
var MAX_POINTER_WORKTREE_FANOUT = 50;
var BRIDGE_POINTER_TTL_MS = 14400000;
var POINTER_PERSISTED_STAMP_FRESH_MS = 604800000;
//@ chunk-f9wdj71r.js:758-833 layout
function hasFreshPersistedThreadSessions(ids, persistedAt, now) {
  return (
    isBridgeRcChildRestartResumeEnabled() &&
    Boolean(ids?.length) &&
    persistedAt !== undefined &&
    isPersistedStampFresh(persistedAt, now, POINTER_PERSISTED_STAMP_FRESH_MS)
  );
}
//@ chunk-f9wdj71r.js:833-959 facade-exports
function freshProjectThreadSessionIds(pointer, now) {
  return hasFreshPersistedThreadSessions(
    pointer.projectThreadSessionIds,
    pointer.projectThreadSessionIdsPersistedAt,
    now,
  )
    ? pointer.projectThreadSessionIds
    : undefined;
}
//@ chunk-f9wdj71r.js:959-1103 facade-exports
function freshParkedProjectThreadSessionIds(pointer, now) {
  return hasFreshPersistedThreadSessions(
    pointer.parkedProjectThreadSessionIds,
    pointer.parkedProjectThreadSessionIdsPersistedAt,
    now,
  )
    ? (pointer.parkedProjectThreadSessionIds ?? [])
    : [];
}
//@ chunk-f9wdj71r.js:1103-1207 layout
function getBridgePointerTtlMs(pointer, options, now) {
  if (
    options?.projectThreadResume &&
    (freshProjectThreadSessionIds(pointer, now) !== undefined ||
      freshParkedProjectThreadSessionIds(pointer, now).length > 0)
  )
    return POINTER_PERSISTED_STAMP_FRESH_MS;
  return BRIDGE_POINTER_TTL_MS;
}
//@ chunk-f9wdj71r.js:1207-1231 facade-exports
var PERSISTED_SESSION_RESUME_WINDOW_MS = 900000;
var PERSISTED_STAMP_SKEW_TOLERANCE_MS = 120000;
//@ chunk-f9wdj71r.js:1231-1273 facade-exports
function isPersistedStampFresh(stampAt, now, windowMs) {
  return now - stampAt <= windowMs && stampAt - now <= PERSISTED_STAMP_SKEW_TOLERANCE_MS;
}
//@ chunk-f9wdj71r.js:1273-1857 facade-exports (2.1.88 match: BridgePointerSchema, 0.416)
/**
 * pointer schema：sessionId、environmentId、source（standalone/repl）、pid、procStart、activeSessionIds 及项目线程会话相关字段（数组上限 64）。
 */
var MAX_POINTER_ACTIVE_SESSION_IDS = 64;
var safeIdSchema = DoctorLazy(() => stringSchema().max(256).refine(isSafeBridgeId));
var bridgePointerSchema = DoctorLazy(() =>
  objectSchema({
    sessionId: union([literal(""), safeIdSchema()]),
    environmentId: safeIdSchema(),
    source: _enum(["standalone", "repl"]),
    pid: numberSchema().optional(),
    procStart: stringSchema().optional(),
    activeSessionIds: array(safeIdSchema()).max(MAX_POINTER_ACTIVE_SESSION_IDS).optional(),
    activeSessionIdsPersistedAt: numberSchema().int().min(0).max(8640000000000000).optional(),
    projectThreadSessionIds: array(safeIdSchema()).max(MAX_POINTER_ACTIVE_SESSION_IDS).optional(),
    parkedProjectThreadSessionIds: array(safeIdSchema()).max(MAX_POINTER_ACTIVE_SESSION_IDS).optional(),
    parkedProjectThreadSessionIdsPersistedAt: numberSchema().int().min(0).max(8640000000000000).optional(),
    projectThreadSessionIdsPersistedAt: numberSchema().int().min(0).max(8640000000000000).optional(),
  }),
);
//@ chunk-f9wdj71r.js:1857-1914 fingerprint (2.1.88 match: getBridgePointerPath, 1)
function getBridgePointerPath(dir) {
  return join(getProjectsDir(), getProjectKey(dir), "bridge-pointer.json");
}
//@ chunk-f9wdj71r.js:1914-1978 layout
function bridgePointerStoreKey(dir) {
  let projectKey = getProjectKey(dir);
  return isValidKeySegment(projectKey) ? STORAGE_SPACES.bridgePointer(projectKey) : null;
}
//@ chunk-f9wdj71r.js:1978-2419 facade-exports (2.1.88 match: writeBridgePointer, 0.923)
async function writeBridgePointer(dir, pointer, storageV5) {
  let path = getBridgePointerPath(dir);
  let storeKey = isStorageV5Enabled() && storageV5 !== undefined ? bridgePointerStoreKey(dir) : null;
  if (isStorageV5Enabled() && storageV5 !== undefined && storeKey) {
    let writeResult = await storageV5.write(storeKey, jsonStringify(pointer), {
      mode: 438 & ~process.umask(),
    });
    if (!writeResult.ok) {
      logForDebugging(`[bridge:pointer] write failed: ${formatStorageError(writeResult.error)}`, {
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
//@ chunk-f9wdj71r.js:2419-2487 facade-exports
/**
 * 串行化 pointer 写入的队列。
 */
function createBridgePointerWriteQueue() {
  let resolved = Promise.resolve();
  return (writeOp) => {
    resolved = resolved.then(writeOp, writeOp);
    return resolved;
  };
}
//@ chunk-f9wdj71r.js:2487-3097 facade-exports (2.1.88 match: readBridgePointer, 0.564)
/**
 * 读 pointer：schema 不符或 mtime 超过保留期（按 source/项目线程计算）时清除并返回 null；返回值附 ageMs。
 */
async function readBridgePointer(dir, options, storageV5) {
  let path = getBridgePointerPath(dir);
  let text;
  let mtimeMs;
  let storeKey = storageV5 ? bridgePointerStoreKey(dir) : null;
  if (storageV5 && storeKey) {
    let readResult = await storageV5.read([storeKey]);
    if (!readResult.ok || !readResult.value.items[0].found) return null;
    mtimeMs = readResult.value.items[0].mtimeMs;
    text = Buffer.from(readResult.value.items[0].value).toString("utf8");
  } else
    try {
      mtimeMs = (await stat(path)).mtimeMs;
      text = await readFile(path, "utf8");
    } catch {
      return null;
    }
  let parsed = bridgePointerSchema().safeParse(parseBridgePointerJson(text));
  if (!parsed.success) {
    if (!options?.noClear) {
      logForDebugging(`[bridge:pointer] invalid schema, clearing: ${path}`);
      await clearBridgePointer(dir, storageV5);
    }
    return null;
  }
  let now = Date.now();
  let ageMs = Math.max(0, now - mtimeMs);
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
//@ chunk-f9wdj71r.js:3097-3639 facade-exports (2.1.88 match: readBridgePointerAcrossWorktrees, 1)
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
//@ chunk-f9wdj71r.js:3639-3994 facade-exports (2.1.88 match: clearBridgePointer, 0.86)
async function clearBridgePointer(dir, storageV5) {
  let path = getBridgePointerPath(dir);
  let storeKey = storageV5 ? bridgePointerStoreKey(dir) : null;
  if (storageV5 && storeKey) {
    let deleteResult = await storageV5.delete(storeKey);
    if (deleteResult.ok || deleteResult.error.code === "NotFound")
      logForDebugging(`[bridge:pointer] cleared ${path}`);
    else
      logForDebugging(`[bridge:pointer] clear failed: ${formatStorageError(deleteResult.error)}`, {
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
//@ chunk-f9wdj71r.js:3994-4044 sole-consumer
function parseBridgePointerJson(text) {
  try {
    return jsonParse(text);
  } catch {
    return null;
  }
}
export {
  MAX_POINTER_ACTIVE_SESSION_IDS,
  BRIDGE_POINTER_TTL_MS,
  PERSISTED_SESSION_RESUME_WINDOW_MS,
  clearBridgePointer,
  createBridgePointerWriteQueue,
  freshParkedProjectThreadSessionIds,
  freshProjectThreadSessionIds,
  isPersistedStampFresh,
  readBridgePointer,
  readBridgePointerAcrossWorktrees,
  writeBridgePointer,
};
