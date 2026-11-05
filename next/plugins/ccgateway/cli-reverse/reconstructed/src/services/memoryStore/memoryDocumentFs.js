/**
 * services/memoryStore/memoryDocumentFs.ts
 *
 * 2.1.316 新增：按 id 选择本会话可用的记忆存储（写入时检查权限）；把文件系统错误转为记忆存储结果等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b3a6nm9h.js (25)
 * attribution: placement 25
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-b3a6nm9h.js:22646-22955 placement
/**
 * 独占创建记忆文件并写入。
 */
async function createMemoryFileExclusive(filePath, content) {
  await assertPathSafeAsync(filePath);
  let handle = await open(filePath, "wx");
  let createdStats = await handle.stat().catch(() => null);
  try {
    await handle.writeFile(content, {
      encoding: "utf8",
    });
    await handle.close();
  } catch (error) {
    await handle.close().catch(() => {});
    let stats = await lstat(filePath).catch(() => null);
    if (
      createdStats !== null &&
      stats !== null &&
      stats.ino === createdStats.ino &&
      stats.dev === createdStats.dev
    )
      await unlinkQuietly(filePath).catch(() => {});
    throw error;
  }
}
//@ chunk-b3a6nm9h.js:22955-23246 placement
/**
 * 读取已有记忆文档的文件权限模式；路径被非文档占用时抛出永久错误。
 */
async function readExistingMemoryMode(filePath, displayPath, retried = false) {
  let file = await readMemoryFileSafely(filePath).catch((error) => {
    throw memoryFsErrorToResult(error, displayPath);
  });
  if (file !== null) return file.mode;
  let stats = await lstat(filePath).catch(() => null);
  if (stats === null || stats.isDirectory()) return;
  if (stats.isFile() && !retried) return readExistingMemoryMode(filePath, displayPath, true);
  throw new MemoryPermanentError(
    "not_a_document",
    `something that is not a memory document occupies ${displayPath}`,
  );
}
//@ chunk-b3a6nm9h.js:23246-23282 placement
/**
 * 删除文件并重试瞬时错误。
 */
function unlinkQuietly(filePath) {
  return retryTransient(() => unlink(filePath));
}
//@ chunk-b3a6nm9h.js:23282-23588 placement
/**
 * 判断路径被非文档占用的冲突。
 */
async function classifyMemoryPathConflict(filePath, displayPath, mustNotExist) {
  if (mustNotExist && (await readMemoryFileSafely(filePath).catch(() => null)) !== null)
    return new MemoryConflictError(
      displayPath,
      null,
      undefined,
      encodeHexName(displayPath.slice(1)),
      displayPath,
    );
  let stats = await lstat(filePath).catch(() => null);
  if (stats !== null && (mustNotExist || !stats.isFile())) return new MemoryConflictError(displayPath, null);
  let ancestorStats = await realpathDeepestExisting(dirname(filePath))
    .then((ancestorPath) => lstat(ancestorPath))
    .catch(() => null);
  return ancestorStats !== null && !ancestorStats.isDirectory()
    ? new MemoryConflictError(displayPath, null)
    : null;
}
//@ chunk-b3a6nm9h.js:23588-23914 placement
/**
 * 把文件系统错误转为记忆存储结果。
 */
function memoryFsErrorToResult(error, displayPath) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode === "EEXIST" || errnoCode === "ENOTDIR" || errnoCode === "EISDIR")
    return new MemoryConflictError(displayPath, null);
  if (errnoCode === "EBUSY") return new MemoryUnavailableError(`${errnoCode}: ${displayPath}`, error);
  if (errnoCode === "ENAMETOOLONG" || errnoCode === "EINVAL" || errnoCode === "ELOOP")
    return new MemoryPermanentError("invalid_path", `${errnoCode}: ${displayPath}`);
  if (errnoCode === "EACCES" || errnoCode === "EPERM" || errnoCode === "EROFS")
    return new MemoryPermanentError("access_denied", `${errnoCode}: ${displayPath}`);
  return error;
}
//@ chunk-b3a6nm9h.js:23914-23969 placement
/**
 * 路径不存在时返回 null，其他错误抛出。
 */
function ignoreMissingOrThrow(error) {
  if (MISSING_PATH_ERRORS.has(getErrnoCode(error) ?? "")) return null;
  throw error;
}
//@ chunk-b3a6nm9h.js:23969-24019 placement
/**
 * 路径不存在或无权限时返回 null，其他错误抛出。
 */
function missingOrPermissionAsNull(error) {
  return PERMISSION_ERRORS.has(getErrnoCode(error) ?? "") ? null : ignoreMissingOrThrow(error);
}
//@ chunk-b3a6nm9h.js:24019-24098 placement
/**
 * 取记忆条目的对外字段（内容、哈希、更新时间）。
 */
function publicMemoryEntry(file) {
  return {
    content: file.content,
    sha256: file.sha256,
    updatedAt: file.updatedAt,
  };
}
//@ chunk-b3a6nm9h.js:24098-24117 placement
var PERSONAL = "personal";
//@ chunk-b3a6nm9h.js:24117-24165 placement
/**
 * 自动记忆目录下的完整路径。
 */
function autoMemFilePath(key) {
  return join(getAutoMemPath(), ...key.split("/"));
}
//@ chunk-b3a6nm9h.js:24165-24367 placement
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
//@ chunk-b3a6nm9h.js:24367-24427 placement
/**
 * 给项目作用域加 project- 前缀。
 */
function projectScopeLabel(scope) {
  let storeScopeLabel = getStoreScopeLabel(scope);
  return storeScopeLabel === PERSONAL ? `project-${storeScopeLabel}` : storeScopeLabel;
}
//@ chunk-b3a6nm9h.js:24427-24579 placement
function createProjectStoreEntry(scope) {
  let mount = projectScopeLabel(scope);
  let writable = isStoreWritable(scope);
  return {
    id: mount,
    kind: "project",
    description: describeStoreScope(scope),
    writable,
    promptIndex: scope.promptIndex,
    config: scope,
    backend: () => makeStoreClient(scope, writable, mount),
  };
}
//@ chunk-b3a6nm9h.js:24579-24639 placement
/**
 * 列出可用的记忆存储条目。
 */
function listMemoryStoreEntries() {
  return areMemoryToolsEnabled()
    ? [createPersonalStoreEntry(), ...sortRootFirst(readableOrgMemoryStores()).map(createProjectStoreEntry)]
    : [];
}
//@ chunk-b3a6nm9h.js:24639-24718 placement
/**
 * 项目记忆库仍在连接时的提示。
 */
var PROJECT_STORE_CONNECTING_TEXT = "The project memory store is still connecting; try again in a moment.";
//@ chunk-b3a6nm9h.js:24718-24796 placement
/**
 * 判断是否仍在连接且尚无项目存储。
 */
function isProjectStoreConnecting(stores) {
  return memorySyncAvailability_2() === "connecting" && !stores.some((store) => store.kind === "project");
}
//@ chunk-b3a6nm9h.js:24796-24874 placement
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
//@ chunk-b3a6nm9h.js:24874-25156 placement
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
//@ chunk-b3a6nm9h.js:25156-26102 placement
/**
 * 按 id 选择本会话可用的记忆存储（写入时检查权限）。
 */
function resolveMemoryStore({ storeId, write = false }) {
  let refusal = checkMemoryToolsAllowed();
  if (refusal) return refusal;
  let stores = listMemoryStoreEntries();
  if (stores.length === 0)
    return {
      outcome: "refused",
      reason: "unbound",
      message: "No memory store is available in this session.",
    };
  let found = stores.find((store) => store.id === storeId);
  if (!found) {
    let joined = stores.map((store) => store.id).join(", ");
    let connectingNote = isProjectStoreConnecting(stores) ? ` ${PROJECT_STORE_CONNECTING_TEXT}` : "";
    return {
      outcome: "refused",
      reason: "unknown_store",
      message: `No memory store with id ${quoteMemoryPath(storeId)} is available in this session. Available stores: ${joined}. Call ${MEMORY_LIST_TOOL_NAME} with no arguments to list them.${connectingNote}`,
    };
  }
  if ((found.kind === "personal") !== (storeId === PERSONAL))
    return {
      outcome: "refused",
      reason: "unknown_store",
      message: `No memory store with id ${quoteMemoryPath(storeId)} is available in this session.`,
    };
  if (write && !found.writable) {
    let mapped = stores.filter((store) => store.writable).map((store) => store.id);
    let writableNote = mapped.length === 0 ? "" : ` Writable stores: ${mapped.join(", ")}.`;
    return {
      outcome: "refused",
      reason: "read_only",
      message: `The memory store ${quoteMemoryPath(storeId)} is read-only in this session; changes will not persist.${writableNote}`,
    };
  }
  return {
    outcome: "resolved",
    served: found,
    backend: found.backend(),
  };
}
//@ chunk-b3a6nm9h.js:26102-26327 placement
/**
 * 个人记忆路径必须以 .md 结尾，否则返回拒绝结果。
 */
function checkPersonalMemoryPath(storeId, path) {
  return storeId === "personal" && !path.toLowerCase().endsWith(".md")
    ? {
        outcome: "refused",
        reason: "invalid_path",
        message: `Personal memories are Markdown documents \u2014 use a path ending in ".md" instead of ${quoteMemoryPath(path)}.`,
      }
    : null;
}
//@ chunk-b3a6nm9h.js:26327-26339 placement
/**
 * 提示中引用记忆路径的最大字符数（1024）。
 */
var MAX_MEMORY_PATH_CHARS = 1024;
//@ chunk-b3a6nm9h.js:26339-26470 placement
/**
 * 为提示信息引用记忆路径（替换控制字符，过长时截断并注明总字节数）。
 */
function quoteMemoryPath(filePath) {
  let safeText = replaceControlChars(filePath);
  let shortened = truncateToLength(safeText, MAX_MEMORY_PATH_CHARS);
  return shortened.length < safeText.length
    ? `"${shortened}\u2026" (${Buffer.byteLength(filePath, "utf8")} bytes in all)`
    : `"${safeText}"`;
}
//@ chunk-b3a6nm9h.js:26470-26759 placement
/**
 * 记忆路径必须是以 / 开头的绝对路径，否则拒绝并给出建议路径。
 */
function checkAbsoluteMemoryPath(path, promptIndex) {
  if (path.startsWith("/")) return null;
  let dirPrefix = memoryIndexDirPrefix(promptIndex);
  let suggestion = `${path}/`.startsWith(dirPrefix) ? `/${path}` : `/${dirPrefix}${path}`;
  let dirNote = dirPrefix === "" ? "" : ` This store's memories live under /${dirPrefix}.`;
  return {
    outcome: "refused",
    reason: "invalid_path",
    message: `Memory paths are absolute and start with "/" \u2014 use ${quoteMemoryPath(suggestion)}.${dirNote}`,
  };
}
//@ chunk-b3a6nm9h.js:26759-26887 placement
/**
 * 列出记忆存储的描述信息（id、说明、是否可写、索引）。
 */
function describeMemoryStores(stores) {
  return stores.map((store) => ({
    id: store.id,
    description: store.description,
    writable: store.writable,
    index: resolveIndexPath(store.promptIndex, store.writable),
  }));
}
//@ chunk-b3a6nm9h.js:26887-27001 placement
function resolveIndexPath(promptIndex, rejectUnsafeSegments) {
  return (
    [
      `/${promptIndex ?? MEMORY_INDEX_FILENAME}`,
      `/${memoryIndexDirPrefix(promptIndex)}${MEMORY_INDEX_FILENAME}`,
    ].find(
      (candidatePath) =>
        validateMemoryPath(candidatePath, {
          rejectUnsafeSegments,
        }) === null,
    ) ?? `/${MEMORY_INDEX_FILENAME}`
  );
}
export {
  autoMemFilePath,
  resolveMemoryStore,
  memoryUnavailableRemedy,
  checkAbsoluteMemoryPath,
  PERSONAL,
  unlinkQuietly,
  missingOrPermissionAsNull,
  publicMemoryEntry,
  readExistingMemoryMode,
  createMemoryFileExclusive,
  classifyMemoryPathConflict,
  memoryFsErrorToResult,
  ignoreMissingOrThrow,
  quoteMemoryPath,
  checkPersonalMemoryPath,
  checkMemoryToolsAllowed,
  listMemoryStoreEntries,
  describeMemoryStores,
  isProjectStoreConnecting,
  PROJECT_STORE_CONNECTING_TEXT,
};
