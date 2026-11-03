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
import { o, u, Ue, T, U, E, A } from "../../vendor/zod/v4/classic/schemas.js";
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
var h = 50,
  BRIDGE_POINTER_TTL_MS = 14400000,
  b = 604800000;
//@ chunk-7snpqrde.js:758-833 layout
function k(e, r, n) {
  return (
    isBridgeRcChildRestartResumeEnabled() &&
    Boolean(e?.length) &&
    r !== void 0 &&
    isPersistedStampFresh(r, n, b)
  );
}
//@ chunk-7snpqrde.js:833-959 facade-exports
function freshProjectThreadSessionIds(e, r) {
  return k(e.projectThreadSessionIds, e.projectThreadSessionIdsPersistedAt, r)
    ? e.projectThreadSessionIds
    : void 0;
}
//@ chunk-7snpqrde.js:959-1103 facade-exports
function freshParkedProjectThreadSessionIds(e, r) {
  return k(e.parkedProjectThreadSessionIds, e.parkedProjectThreadSessionIdsPersistedAt, r)
    ? (e.parkedProjectThreadSessionIds ?? [])
    : [];
}
//@ chunk-7snpqrde.js:1103-1207 layout
function getBridgePointerTtlMs(e, r, n) {
  if (
    r?.projectThreadResume &&
    (freshProjectThreadSessionIds(e, n) !== void 0 || freshParkedProjectThreadSessionIds(e, n).length > 0)
  )
    return b;
  return BRIDGE_POINTER_TTL_MS;
}
//@ chunk-7snpqrde.js:1207-1231 facade-exports
var PERSISTED_SESSION_RESUME_WINDOW_MS = 900000,
  R = 120000;
//@ chunk-7snpqrde.js:1231-1273 facade-exports
function isPersistedStampFresh(e, r, n) {
  return r - e <= n && e - r <= R;
}
/**
 * pointer schema：sessionId、environmentId、source（standalone/repl）、pid、procStart、activeSessionIds 及项目线程会话相关字段（数组上限 64）。
 */
//@ chunk-7snpqrde.js:1273-1857 facade-exports = BridgePointerSchema (0.417)
var MAX_POINTER_ACTIVE_SESSION_IDS = 64,
  safeIdSchema = DoctorLazy(() => o().max(256).refine(isSafeBridgeId)),
  bridgePointerSchema = DoctorLazy(() =>
    u({
      sessionId: Ue([T(""), safeIdSchema()]),
      environmentId: safeIdSchema(),
      source: U(["standalone", "repl"]),
      pid: E().optional(),
      procStart: o().optional(),
      activeSessionIds: A(safeIdSchema()).max(MAX_POINTER_ACTIVE_SESSION_IDS).optional(),
      activeSessionIdsPersistedAt: E().int().min(0).max(8640000000000000).optional(),
      projectThreadSessionIds: A(safeIdSchema()).max(MAX_POINTER_ACTIVE_SESSION_IDS).optional(),
      parkedProjectThreadSessionIds: A(safeIdSchema()).max(MAX_POINTER_ACTIVE_SESSION_IDS).optional(),
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
  let r = getProjectKey(dir);
  return isValidKeySegment(r) ? STORAGE_SPACES.bridgePointer(r) : null;
}
//@ chunk-7snpqrde.js:1978-2419 facade-exports = writeBridgePointer (0.924)
async function writeBridgePointer(dir, pointer, storageV5) {
  let path = getBridgePointerPath(dir),
    i = isStorageV5Enabled() && storageV5 !== void 0 ? bridgePointerStoreKey(dir) : null;
  if (isStorageV5Enabled() && storageV5 !== void 0 && i) {
    let write = await storageV5.write(i, jsonStringify(pointer), { mode: 438 & ~process.umask() });
    if (!write.ok)
      return (
        logForDebugging(`[bridge:pointer] write failed: ${formatStorageError(write.error)}`, {
          level: "warn",
        }),
        !1
      );
    return (logForDebugging(`[bridge:pointer] wrote ${path}`), !0);
  }
  try {
    return (
      await mkdir(dirname(path), { recursive: !0 }),
      await writeFileAtomic(path, jsonStringify(pointer)),
      logForDebugging(`[bridge:pointer] wrote ${path}`),
      !0
    );
  } catch (err) {
    return (logForDebugging(`[bridge:pointer] write failed: ${err}`, { level: "warn" }), !1);
  }
}
/**
 * 串行化 pointer 写入的队列。
 */
//@ chunk-7snpqrde.js:2419-2487 facade-exports
function createBridgePointerWriteQueue() {
  let resolved = Promise.resolve();
  return (r) => ((resolved = resolved.then(r, r)), resolved);
}
/**
 * 读 pointer：schema 不符或 mtime 超过保留期（按 source/项目线程计算）时清除并返回 null；返回值附 ageMs。
 */
//@ chunk-7snpqrde.js:2487-3097 facade-exports = readBridgePointer (0.564)
async function readBridgePointer(dir, options, storageV5) {
  let path = getBridgePointerPath(dir),
    i,
    d,
    g = storageV5 ? bridgePointerStoreKey(dir) : null;
  if (storageV5 && g) {
    let read = await storageV5.read([g]);
    if (!read.ok || !read.value.items[0].found) return null;
    ((d = read.value.items[0].mtimeMs), (i = Buffer.from(read.value.items[0].value).toString("utf8")));
  } else
    try {
      ((d = (await stat(path)).mtimeMs), (i = await readFile(path, "utf8")));
    } catch {
      return null;
    }
  let parsed = bridgePointerSchema().safeParse(O(i));
  if (!parsed.success) {
    if (!options?.noClear)
      (logForDebugging(`[bridge:pointer] invalid schema, clearing: ${path}`),
        await clearBridgePointer(dir, storageV5));
    return null;
  }
  let now = Date.now(),
    ageMs = Math.max(0, now - d);
  if (!options?.ignoreTtl && ageMs > getBridgePointerTtlMs(parsed.data, options, now)) {
    if (!options?.noClear)
      (logForDebugging(`[bridge:pointer] stale mtime, clearing: ${path}`),
        await clearBridgePointer(dir, storageV5));
    return null;
  }
  return { ...parsed.data, ageMs: ageMs };
}
//@ chunk-7snpqrde.js:3097-3639 facade-exports = readBridgePointerAcrossWorktrees (1)
async function readBridgePointerAcrossWorktrees(e, r, n) {
  let s = await readBridgePointer(e, n, r);
  if (s) return { pointer: s, dir: e };
  let here = await getWorktreePathsPortable(e);
  if (here.length <= 1) return null;
  if (here.length > h)
    return (
      logForDebugging(`[bridge:pointer] ${here.length} worktrees exceeds fanout cap ${h}, skipping`),
      null
    );
  let dirKey = getProjectKey(e),
    candidates = here.filter((wt) => getProjectKey(wt) !== dirKey),
    results = await Promise.all(
      candidates.map(async (wt) => {
        let l = await readBridgePointer(wt, void 0, r);
        return l ? { pointer: l, dir: wt } : null;
      }),
    ),
    freshest = null;
  for (let a of results) if (a && (!freshest || a.pointer.ageMs < freshest.pointer.ageMs)) freshest = a;
  if (freshest)
    logForDebugging(
      `[bridge:pointer] fanout found pointer in worktree ${freshest.dir} (ageMs=${freshest.pointer.ageMs})`,
    );
  return freshest;
}
//@ chunk-7snpqrde.js:3639-3994 facade-exports = clearBridgePointer (0.859)
async function clearBridgePointer(dir, storageV5) {
  let path = getBridgePointerPath(dir),
    s = storageV5 ? bridgePointerStoreKey(dir) : null;
  if (storageV5 && s) {
    let i = await storageV5.delete(s);
    if (i.ok || i.error.code === "NotFound") logForDebugging(`[bridge:pointer] cleared ${path}`);
    else logForDebugging(`[bridge:pointer] clear failed: ${formatStorageError(i.error)}`, { level: "warn" });
    return;
  }
  try {
    (await unlink(path), logForDebugging(`[bridge:pointer] cleared ${path}`));
  } catch (err) {
    if (!isENOENT(err)) logForDebugging(`[bridge:pointer] clear failed: ${err}`, { level: "warn" });
  }
}
//@ chunk-7snpqrde.js:3994-4044 sole-consumer
function O(e) {
  try {
    return jsonParse(e);
  } catch {
    return null;
  }
}

export { MAX_POINTER_ACTIVE_SESSION_IDS };
