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
import { dirname, join } from "path";
import { assertPathSafeAsync, retryTransient } from "../../utils/atomicPublishWrite.js";
import {
  readMemoryFileSafely,
  encodeHexName,
  MISSING_PATH_ERRORS,
  PERMISSION_ERRORS,
  LocalMemoryStore,
} from "./localMemoryStore.js";
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
import {
  isStoreWritable,
  areMemoryToolsEnabled,
  readableOrgMemoryStores,
  memorySyncAvailability_2,
} from "../memorySync/availability.js";
import { makeStoreClient } from "../orgMemory/promptIndex.js";
import { MEMORY_PAUSED_MESSAGE } from "../../types/permissions.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";
import { MEMORY_LIST_TOOL_NAME } from "../../tools/MemoryTool/memoryToolNames.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { memoryIndexDirPrefix, MEMORY_INDEX_FILENAME } from "../../memdir/memdir.js";
import { validateMemoryPath } from "../../tools/MemoryTool/memoryWrite.js";

//@ chunk-a477qqne.js:22609-22918 placement
/**
 * 独占创建记忆文件并写入。
 */
async function createMemoryFileExclusive(e, n) {
  await assertPathSafeAsync(e);
  let r = await open(e, "wx");
  let s = await r.stat().catch(() => null);
  try {
    await r.writeFile(n, {
      encoding: "utf8",
    });
    await r.close();
  } catch (error) {
    await r.close().catch(() => {});
    let d = await lstat(e).catch(() => null);
    if (s !== null && d !== null && d.ino === s.ino && d.dev === s.dev)
      await unlinkQuietly(e).catch(() => {});
    throw error;
  }
}
//@ chunk-a477qqne.js:22918-23208 placement
/**
 * 读取已有记忆文档的文件权限模式；路径被非文档占用时抛出永久错误。
 */
async function readExistingMemoryMode(e, n, r = false) {
  let s = await readMemoryFileSafely(e).catch((error) => {
    throw memoryFsErrorToResult(error, n);
  });
  if (s !== null) return s.mode;
  let i = await lstat(e).catch(() => null);
  if (i === null || i.isDirectory()) return;
  if (i.isFile() && !r) return readExistingMemoryMode(e, n, true);
  throw new MemoryPermanentError("not_a_document", `something that is not a memory document occupies ${n}`);
}
//@ chunk-a477qqne.js:23208-23244 placement
/**
 * 删除文件并重试瞬时错误。
 */
function unlinkQuietly(e) {
  return retryTransient(() => unlink(e));
}
//@ chunk-a477qqne.js:23244-23549 placement
/**
 * 判断路径被非文档占用的冲突。
 */
async function classifyMemoryPathConflict(e, n, r) {
  if (r && (await readMemoryFileSafely(e).catch(() => null)) !== null)
    return new MemoryConflictError(n, null, undefined, encodeHexName(n.slice(1)), n);
  let s = await lstat(e).catch(() => null);
  if (s !== null && (r || !s.isFile())) return new MemoryConflictError(n, null);
  let i = await realpathDeepestExisting(dirname(e))
    .then((d) => lstat(d))
    .catch(() => null);
  return i !== null && !i.isDirectory() ? new MemoryConflictError(n, null) : null;
}
//@ chunk-a477qqne.js:23549-23875 placement
/**
 * 把文件系统错误转为记忆存储结果。
 */
function memoryFsErrorToResult(error, n) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode === "EEXIST" || errnoCode === "ENOTDIR" || errnoCode === "EISDIR")
    return new MemoryConflictError(n, null);
  if (errnoCode === "EBUSY") return new MemoryUnavailableError(`${errnoCode}: ${n}`, error);
  if (errnoCode === "ENAMETOOLONG" || errnoCode === "EINVAL" || errnoCode === "ELOOP")
    return new MemoryPermanentError("invalid_path", `${errnoCode}: ${n}`);
  if (errnoCode === "EACCES" || errnoCode === "EPERM" || errnoCode === "EROFS")
    return new MemoryPermanentError("access_denied", `${errnoCode}: ${n}`);
  return error;
}
//@ chunk-a477qqne.js:23875-23930 placement
/**
 * 路径不存在时返回 null，其他错误抛出。
 */
function ignoreMissingOrThrow(e) {
  if (MISSING_PATH_ERRORS.has(getErrnoCode(e) ?? "")) return null;
  throw e;
}
//@ chunk-a477qqne.js:23930-23980 placement
/**
 * 路径不存在或无权限时返回 null，其他错误抛出。
 */
function missingOrPermissionAsNull(e) {
  return PERMISSION_ERRORS.has(getErrnoCode(e) ?? "") ? null : ignoreMissingOrThrow(e);
}
//@ chunk-a477qqne.js:23980-24059 placement
/**
 * 取记忆条目的对外字段（内容、哈希、更新时间）。
 */
function publicMemoryEntry(e) {
  return {
    content: e.content,
    sha256: e.sha256,
    updatedAt: e.updatedAt,
  };
}
//@ chunk-a477qqne.js:24059-24078 placement
var PERSONAL = "personal";
//@ chunk-a477qqne.js:24078-24126 placement
/**
 * 自动记忆目录下的完整路径。
 */
function autoMemFilePath(e) {
  return join(getAutoMemPath(), ...e.split("/"));
}
//@ chunk-a477qqne.js:24126-24328 placement
function createPersonalStoreEntry() {
  return {
    id: PERSONAL,
    kind: "personal",
    description: "your personal memory store on this machine",
    writable: true,
    promptIndex: undefined,
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
/**
 * 给项目作用域加 project- 前缀。
 */
function projectScopeLabel(e) {
  let storeScopeLabel = getStoreScopeLabel(e);
  return storeScopeLabel === PERSONAL ? `project-${storeScopeLabel}` : storeScopeLabel;
}
//@ chunk-a477qqne.js:24388-24540 placement
function createProjectStoreEntry(e) {
  let mount = projectScopeLabel(e);
  let r = isStoreWritable(e);
  return {
    id: mount,
    kind: "project",
    description: describeStoreScope(e),
    writable: r,
    promptIndex: e.promptIndex,
    config: e,
    backend: () => makeStoreClient(e, r, mount),
  };
}
//@ chunk-a477qqne.js:24540-24600 placement
/**
 * 列出可用的记忆存储条目。
 */
function listMemoryStoreEntries() {
  return areMemoryToolsEnabled()
    ? [createPersonalStoreEntry(), ...sortRootFirst(readableOrgMemoryStores()).map(createProjectStoreEntry)]
    : [];
}
//@ chunk-a477qqne.js:24600-24679 placement
/**
 * 项目记忆库仍在连接时的提示。
 */
var PROJECT_STORE_CONNECTING_TEXT = "The project memory store is still connecting; try again in a moment.";
//@ chunk-a477qqne.js:24679-24757 placement
/**
 * 判断是否仍在连接且尚无项目存储。
 */
function isProjectStoreConnecting(e) {
  return memorySyncAvailability_2() === "connecting" && !e.some((n) => n.kind === "project");
}
//@ chunk-a477qqne.js:24757-24835 placement
/**
 * 记忆不可用时的补救说明。
 */
function memoryUnavailableRemedy(memoryStore) {
  return memoryStore.reason === "paused"
    ? {
        remedy: {
          kind: "memory_paused",
        },
      }
    : {};
}
//@ chunk-a477qqne.js:24835-25117 placement
/**
 * 检查记忆工具是否可用：自动记忆暂停或工作区未授信时拒绝并说明。
 */
function checkMemoryToolsAllowed() {
  if (isAutoMemoryHeldForSession())
    return {
      outcome: "refused",
      reason: "paused",
      message: MEMORY_PAUSED_MESSAGE,
    };
  if (!checkHasTrustDialogAccepted())
    return {
      outcome: "refused",
      reason: "trust_pending",
      message:
        "This workspace has not been granted trust yet. Accept the workspace trust dialog first; memory tools are refused until then.",
    };
  return null;
}
//@ chunk-a477qqne.js:25117-26063 placement
/**
 * 按 id 选择本会话可用的记忆存储（写入时检查权限）。
 */
function resolveMemoryStore({ storeId, write = false }) {
  let r = checkMemoryToolsAllowed();
  if (r) return r;
  let s = listMemoryStoreEntries();
  if (s.length === 0)
    return {
      outcome: "refused",
      reason: "unbound",
      message: "No memory store is available in this session.",
    };
  let found = s.find((d) => d.id === storeId);
  if (!found) {
    let joined = s.map((h) => h.id).join(", ");
    let l = isProjectStoreConnecting(s) ? ` ${PROJECT_STORE_CONNECTING_TEXT}` : "";
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
    let mapped = s.filter((h) => h.writable).map((h) => h.id);
    let l = mapped.length === 0 ? "" : ` Writable stores: ${mapped.join(", ")}.`;
    return {
      outcome: "refused",
      reason: "read_only",
      message: `The memory store ${quoteMemoryPath(storeId)} is read-only in this session; changes will not persist.${l}`,
    };
  }
  return {
    outcome: "resolved",
    served: found,
    backend: found.backend(),
  };
}
//@ chunk-a477qqne.js:26063-26288 placement
/**
 * 个人记忆路径必须以 .md 结尾，否则返回拒绝结果。
 */
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
/**
 * 提示中引用记忆路径的最大字符数（1024）。
 */
var MAX_MEMORY_PATH_CHARS = 1024;
//@ chunk-a477qqne.js:26300-26432 placement
/**
 * 为提示信息引用记忆路径（替换控制字符，过长时截断并注明总字节数）。
 */
function quoteMemoryPath(storeId) {
  let n = replaceControlChars(storeId);
  let r = truncateToLength(n, MAX_MEMORY_PATH_CHARS);
  return r.length < n.length ? `"${r}\u2026" (${Buffer.byteLength(storeId, "utf8")} bytes in all)` : `"${n}"`;
}
//@ chunk-a477qqne.js:26432-26721 placement
/**
 * 记忆路径必须是以 / 开头的绝对路径，否则拒绝并给出建议路径。
 */
function checkAbsoluteMemoryPath(e, promptIndex) {
  if (e.startsWith("/")) return null;
  let r = memoryIndexDirPrefix(promptIndex);
  let s = `${e}/`.startsWith(r) ? `/${e}` : `/${r}${e}`;
  let i = r === "" ? "" : ` This store's memories live under /${r}.`;
  return {
    outcome: "refused",
    reason: "invalid_path",
    message: `Memory paths are absolute and start with "/" \u2014 use ${quoteMemoryPath(s)}.${i}`,
  };
}
//@ chunk-a477qqne.js:26721-26849 placement
/**
 * 列出记忆存储的描述信息（id、说明、是否可写、索引）。
 */
function describeMemoryStores(e) {
  return e.map((n) => ({
    id: n.id,
    description: n.description,
    writable: n.writable,
    index: resolveIndexPath(n.promptIndex, n.writable),
  }));
}
//@ chunk-a477qqne.js:26849-26963 placement
function resolveIndexPath(promptIndex, rejectUnsafeSegments) {
  return (
    [
      `/${promptIndex ?? MEMORY_INDEX_FILENAME}`,
      `/${memoryIndexDirPrefix(promptIndex)}${MEMORY_INDEX_FILENAME}`,
    ].find(
      (s) =>
        validateMemoryPath(s, {
          rejectUnsafeSegments,
        }) === null,
    ) ?? `/${MEMORY_INDEX_FILENAME}`
  );
}
export {
  missingOrPermissionAsNull,
  publicMemoryEntry,
  readExistingMemoryMode,
  createMemoryFileExclusive,
  classifyMemoryPathConflict,
  memoryFsErrorToResult,
  unlinkQuietly,
  ignoreMissingOrThrow,
  quoteMemoryPath,
  autoMemFilePath,
  checkPersonalMemoryPath,
  PERSONAL,
  resolveMemoryStore,
  memoryUnavailableRemedy,
  checkAbsoluteMemoryPath,
  checkMemoryToolsAllowed,
  listMemoryStoreEntries,
  describeMemoryStores,
  isProjectStoreConnecting,
  PROJECT_STORE_CONNECTING_TEXT,
};
