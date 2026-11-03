/**
 * services/memoryStore/memoryDocumentFs.ts
 *
 * 2.1.316 新增：按 id 选择本会话可用的记忆存储（写入时检查权限）；把文件系统错误转为记忆存储结果等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a477qqne.js (25)
 * attribution: placement 25
 */
import { open, lstat, unlink } from "fs/promises";
import { dirname, join, join as join_2, join as join_3, join as join_4 } from "path";
import { assertPathSafeAsync, retryTransient } from "../../utils/atomicPublishWrite.js";
import { readMemoryFileSafely, encodeHexName, wn, Mn, LocalMemoryStore } from "./localMemoryStore.js";
import {
  MemoryPermanentError,
  MemoryConflictError,
  MemoryUnavailableError,
} from "../orgMemory/storeErrors.js";
import { realpathDeepestExisting } from "../../memdir/teamMemPaths.js";
import { getErrnoCode } from "../../utils/errors.js";
import { getAutoMemPath, isAutoMemoryHeldForSession } from "../../memdir/paths.js";
import { isExcludedMemoryKey } from "./memoryKeys.js";
import { getStoreScopeLabel, describeStoreScope, sortRootFirst } from "../orgMemory/storeLabels.js";
import { CAt, _Pe, Qpe, memorySyncAvailability_2 } from "../memorySync/availability.js";
import { E9r } from "../orgMemory/promptIndex.js";
import { MEMORY_PAUSED_MESSAGE } from "../../types/permissions.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";
import { MEMORY_LIST_TOOL_NAME } from "../../tools/MemoryTool/memoryToolNames.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { memoryIndexDirPrefix, MEMORY_INDEX_FILENAME } from "../../memdir/memdir.js";
import { validateMemoryPath } from "../../tools/MemoryTool/memoryWrite.js";

/**
 * 独占创建记忆文件并写入。
 */
//@ chunk-a477qqne.js:22609-22918 placement
async function createMemoryFileExclusive(e, n) {
  await assertPathSafeAsync(e);
  let r = await open(e, "wx"),
    s = await r.stat().catch(() => null);
  try {
    (await r.writeFile(n, { encoding: "utf8" }), await r.close());
  } catch (error) {
    await r.close().catch(() => {});
    let d = await lstat(e).catch(() => null);
    if (s !== null && d !== null && d.ino === s.ino && d.dev === s.dev) await $e(e).catch(() => {});
    throw error;
  }
}
/**
 * 读取已有记忆文档的文件权限模式；路径被非文档占用时抛出永久错误。
 */
//@ chunk-a477qqne.js:22918-23208 placement
async function readExistingMemoryMode(e, n, r = !1) {
  let s = await readMemoryFileSafely(e).catch((d) => {
    throw memoryFsErrorToResult(d, n);
  });
  if (s !== null) return s.mode;
  let i = await lstat(e).catch(() => null);
  if (i === null || i.isDirectory()) return;
  if (i.isFile() && !r) return readExistingMemoryMode(e, n, !0);
  throw new MemoryPermanentError("not_a_document", `something that is not a memory document occupies ${n}`);
}
//@ chunk-a477qqne.js:23208-23244 placement
function $e(e) {
  return retryTransient(() => unlink(e));
}
/**
 * 判断路径被非文档占用的冲突。
 */
//@ chunk-a477qqne.js:23244-23549 placement
async function classifyMemoryPathConflict(e, n, r) {
  if (r && (await readMemoryFileSafely(e).catch(() => null)) !== null)
    return new MemoryConflictError(n, null, void 0, encodeHexName(n.slice(1)), n);
  let s = await lstat(e).catch(() => null);
  if (s !== null && (r || !s.isFile())) return new MemoryConflictError(n, null);
  let i = await realpathDeepestExisting(dirname(e))
    .then((d) => lstat(d))
    .catch(() => null);
  return i !== null && !i.isDirectory() ? new MemoryConflictError(n, null) : null;
}
/**
 * 把文件系统错误转为记忆存储结果。
 */
//@ chunk-a477qqne.js:23549-23875 placement
function memoryFsErrorToResult(e, n) {
  let r = getErrnoCode(e);
  if (r === "EEXIST" || r === "ENOTDIR" || r === "EISDIR") return new MemoryConflictError(n, null);
  if (r === "EBUSY") return new MemoryUnavailableError(`${r}: ${n}`, e);
  if (r === "ENAMETOOLONG" || r === "EINVAL" || r === "ELOOP")
    return new MemoryPermanentError("invalid_path", `${r}: ${n}`);
  if (r === "EACCES" || r === "EPERM" || r === "EROFS")
    return new MemoryPermanentError("access_denied", `${r}: ${n}`);
  return e;
}
//@ chunk-a477qqne.js:23875-23930 placement
function ue(e) {
  if (wn.has(getErrnoCode(e) ?? "")) return null;
  throw e;
}
//@ chunk-a477qqne.js:23930-23980 placement
function de(e) {
  return Mn.has(getErrnoCode(e) ?? "") ? null : ue(e);
}
//@ chunk-a477qqne.js:23980-24059 placement
function ht(e) {
  return { content: e.content, sha256: e.sha256, updatedAt: e.updatedAt };
}
//@ chunk-a477qqne.js:24059-24078 placement
var PERSONAL = "personal";
//@ chunk-a477qqne.js:24078-24126 placement
function xVe(e) {
  return join_3(getAutoMemPath(), ...e.split("/"));
}
//@ chunk-a477qqne.js:24126-24328 placement
function createPersonalStoreEntry() {
  return {
    id: PERSONAL,
    kind: "personal",
    description: "your personal memory store on this machine",
    writable: !0,
    promptIndex: void 0,
    backend: () =>
      new LocalMemoryStore({
        rootDir: getAutoMemPath(),
        label: PERSONAL,
        mode: "rw",
        excludeKey: isExcludedMemoryKey,
      }),
  };
}
//@ chunk-a477qqne.js:24328-24388 placement
function On(e) {
  let n = getStoreScopeLabel(e);
  return n === PERSONAL ? `project-${n}` : n;
}
//@ chunk-a477qqne.js:24388-24540 placement
function createProjectStoreEntry(e) {
  let n = On(e),
    r = CAt(e);
  return {
    id: n,
    kind: "project",
    description: describeStoreScope(e),
    writable: r,
    promptIndex: e.promptIndex,
    config: e,
    backend: () => E9r(e, r, n),
  };
}
//@ chunk-a477qqne.js:24540-24600 placement
function iVr() {
  return _Pe() ? [createPersonalStoreEntry(), ...sortRootFirst(Qpe()).map(createProjectStoreEntry)] : [];
}
//@ chunk-a477qqne.js:24600-24679 placement
var v2o = "The project memory store is still connecting; try again in a moment.";
//@ chunk-a477qqne.js:24679-24757 placement
function k2o(e) {
  return memorySyncAvailability_2() === "connecting" && !e.some((n) => n.kind === "project");
}
//@ chunk-a477qqne.js:24757-24835 placement
function UEt(e) {
  return e.reason === "paused" ? { remedy: { kind: "memory_paused" } } : {};
}
/**
 * 检查记忆工具是否可用：自动记忆暂停或工作区未授信时拒绝并说明。
 */
//@ chunk-a477qqne.js:24835-25117 placement
function checkMemoryToolsAllowed() {
  if (isAutoMemoryHeldForSession())
    return { outcome: "refused", reason: "paused", message: MEMORY_PAUSED_MESSAGE };
  if (!checkHasTrustDialogAccepted())
    return {
      outcome: "refused",
      reason: "trust_pending",
      message:
        "This workspace has not been granted trust yet. Accept the workspace trust dialog first; memory tools are refused until then.",
    };
  return null;
}
/**
 * 按 id 选择本会话可用的记忆存储（写入时检查权限）。
 */
//@ chunk-a477qqne.js:25117-26063 placement
function resolveMemoryStore({ storeId: storeId, write: write = !1 }) {
  let r = checkMemoryToolsAllowed();
  if (r) return r;
  let s = iVr();
  if (s.length === 0)
    return {
      outcome: "refused",
      reason: "unbound",
      message: "No memory store is available in this session.",
    };
  let found = s.find((d) => d.id === storeId);
  if (!found) {
    let joined = s.map((h) => h.id).join(", "),
      l = k2o(s) ? ` ${v2o}` : "";
    return {
      outcome: "refused",
      reason: "unknown_store",
      message: `No memory store with id ${quoteMemoryPath(storeId)} is available in this session. Available stores: ${joined}. Call ${MEMORY_LIST_TOOL_NAME} with no arguments to list them.${l}`,
    };
  }
  if ((found.kind === "personal") !== (storeId === PERSONAL))
    return {
      outcome: "refused",
      reason: "unknown_store",
      message: `No memory store with id ${quoteMemoryPath(storeId)} is available in this session.`,
    };
  if (write && !found.writable) {
    let mapped = s.filter((h) => h.writable).map((h) => h.id),
      l = mapped.length === 0 ? "" : ` Writable stores: ${mapped.join(", ")}.`;
    return {
      outcome: "refused",
      reason: "read_only",
      message: `The memory store ${quoteMemoryPath(storeId)} is read-only in this session; changes will not persist.${l}`,
    };
  }
  return { outcome: "resolved", served: found, backend: found.backend() };
}
/**
 * 个人记忆路径必须以 .md 结尾，否则返回拒绝结果。
 */
//@ chunk-a477qqne.js:26063-26288 placement
function checkPersonalMemoryPath(e, n) {
  return e === "personal" && !n.toLowerCase().endsWith(".md")
    ? {
        outcome: "refused",
        reason: "invalid_path",
        message: `Personal memories are Markdown documents \u2014 use a path ending in ".md" instead of ${quoteMemoryPath(n)}.`,
      }
    : null;
}
//@ chunk-a477qqne.js:26288-26300 placement
var Cn = 1024;
/**
 * 为提示信息引用记忆路径（替换控制字符，过长时截断并注明总字节数）。
 */
//@ chunk-a477qqne.js:26300-26432 placement
function quoteMemoryPath(e) {
  let n = replaceControlChars(e),
    r = truncateToLength(n, Cn);
  return r.length < n.length ? `"${r}\u2026" (${Buffer.byteLength(e, "utf8")} bytes in all)` : `"${n}"`;
}
/**
 * 记忆路径必须是以 / 开头的绝对路径，否则拒绝并给出建议路径。
 */
//@ chunk-a477qqne.js:26432-26721 placement
function checkAbsoluteMemoryPath(e, n) {
  if (e.startsWith("/")) return null;
  let r = memoryIndexDirPrefix(n),
    s = `${e}/`.startsWith(r) ? `/${e}` : `/${r}${e}`,
    i = r === "" ? "" : ` This store's memories live under /${r}.`;
  return {
    outcome: "refused",
    reason: "invalid_path",
    message: `Memory paths are absolute and start with "/" \u2014 use ${quoteMemoryPath(s)}.${i}`,
  };
}
/**
 * 列出记忆存储的描述信息（id、说明、是否可写、索引）。
 */
//@ chunk-a477qqne.js:26721-26849 placement
function describeMemoryStores(e) {
  return e.map((n) => ({
    id: n.id,
    description: n.description,
    writable: n.writable,
    index: resolveIndexPath(n.promptIndex, n.writable),
  }));
}
//@ chunk-a477qqne.js:26849-26963 placement
function resolveIndexPath(e, n) {
  return (
    [`/${e ?? MEMORY_INDEX_FILENAME}`, `/${memoryIndexDirPrefix(e)}${MEMORY_INDEX_FILENAME}`].find(
      (s) => validateMemoryPath(s, { rejectUnsafeSegments: n }) === null,
    ) ?? `/${MEMORY_INDEX_FILENAME}`
  );
}

export {
  de,
  ht,
  readExistingMemoryMode,
  createMemoryFileExclusive,
  classifyMemoryPathConflict,
  memoryFsErrorToResult,
  $e,
  ue,
  quoteMemoryPath,
  xVe,
  checkPersonalMemoryPath,
  PERSONAL,
  resolveMemoryStore,
  UEt,
  checkAbsoluteMemoryPath,
  checkMemoryToolsAllowed,
  iVr,
  describeMemoryStores,
  k2o,
  v2o,
};
