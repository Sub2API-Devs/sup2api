/**
 * utils/toolResultStorage.ts
 *
 * 大工具结果落盘与预算：单个结果超阈值时写入会话 tool-results 目录并替换成 <persisted-output> 预览；同一批工具结果总量超 200K 字符时按大小挑最大的替换（applyToolResultBudget），替换决定记在 contentReplacementState 里以保证后续请求前缀稳定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/toolResultStorage.ts
 * pieces: chunk-6nqjztgx.js (1), chunk-dcd8bnv7.js (4), chunk-f25sswmp.js (2), chunk-jcnpfn31.js (46), chunk-t0gq9gyw.js (16)
 * attribution: placement 23, fingerprint 17, file-local 9, callgraph-fingerprint 1, layout 19
 */
import { join, basename, relative, sep, isAbsolute, dirname } from "path";
import { getSessionProject, SessionRootSlot } from "../bootstrap/sessionSlices.js";
import {
  getSessionId,
  getOriginalCwd as getOriginalCwd_2,
  isDiskless,
  getRootSession,
} from "../bootstrap/state.js";
import { getPinnedProjectDir, getProjectDir, getProjectsDir } from "./sessionStoragePortable.js";
import { isValidKeySegment } from "./storage/storageSpaces.js";
import { pathToSessionSideKey } from "./storage/storageKeys.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { logForDebugging } from "./debug.js";
import { getFileReader } from "./fileStore.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  toError,
} from "./errors.js";
import { isPlainObject } from "./isPlainObject.js";
import { isBase64ImageBlock } from "./imageValidation.js";
import {
  OUTPUT_SIZE_LIMITS,
  MAX_RESULT_BUFFER_BYTES,
  MAX_RESULT_CHARS,
  RESULT_LIMITS,
  MAX_RESULT_BYTES,
  RESULT_LIMIT_COUNT,
} from "../constants/outputLimits.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isReservedDeviceName } from "./windowsProfileFolders.js";
import { jsonStringify } from "./slowOperations.js";
import { truncateUtf8Bytes, truncateToLength } from "./stringUtils.js";
import { formatFileSize } from "./format.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import { ARTIFACT_CONTENT_AUTHORED_TAG_LEAD } from "../constants/xml.js";
import { storageErrorCode } from "./storage/storageErrors.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-t0gq9gyw.js:44789-44812 fingerprint = TOOL_RESULTS_SUBDIR (1)
/**
 * 落盘子目录名 "tool-results"。
 */
var TOOL_RESULTS_SUBDIR = "tool-results";
//@ chunk-t0gq9gyw.js:44812-44875 placement = getOriginalCwd (0.722)
function getOriginalCwd(session) {
  return toolResultsDirFor(session.root.id, () => getSessionProject(session.root).originalCwd);
}
//@ chunk-t0gq9gyw.js:44875-44907 placement
/**
 * 工具结果目录。
 */
function toolResultsDir() {
  return toolResultsDirFor(getSessionId(), getOriginalCwd_2);
}
//@ chunk-t0gq9gyw.js:44907-44944 placement
/**
 * 指定会话的工具结果目录。
 */
function toolResultsDirFor_2(session) {
  return isDiskless() ? null : getOriginalCwd(session);
}
//@ chunk-t0gq9gyw.js:44944-44980 placement
/**
 * 非 diskless 时返回 tool-results 目录。
 */
function toolResultsDirOrNull() {
  return isDiskless() ? null : toolResultsDir();
}
//@ chunk-t0gq9gyw.js:44980-45029 placement
function toolResultsDirFor(sessionId, storageV5) {
  return join(getPinnedProjectDir() ?? getProjectDir(storageV5()), sessionId, TOOL_RESULTS_SUBDIR);
}
//@ chunk-t0gq9gyw.js:45029-45095 placement
/**
 * 工具结果文件对应的存储键。
 */
function toolResultsKey(dir, fileName) {
  if (basename(dir) !== TOOL_RESULTS_SUBDIR || !isValidKeySegment(fileName)) return;
  return pathToSessionSideKey(join(dir, fileName));
}
//@ chunk-t0gq9gyw.js:45095-45280 placement
function getSidecarParentKey(dir) {
  let key = toolResultsKey(dir, "probe");
  if (key === undefined || key.namespace !== "sidecar") return;
  return {
    namespace: "sidecar",
    projectKey: key.projectKey,
    sessionId: key.sessionId,
    relPath: key.relPath.slice(0, -1),
  };
}
//@ chunk-t0gq9gyw.js:45280-45562 placement
/**
 * 确保工具结果目录存在。
 */
async function ensureToolResultsDir(dir, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let sidecarParentKey = getSidecarParentKey(dir);
    if (sidecarParentKey !== undefined)
      try {
        if ((await storageV5.ensureScope(sidecarParentKey)).ok) return;
      } catch {}
  }
  if (isDiskless()) {
    logForDebugging("tool-results folder not made: diskless session");
    return;
  }
  let fileReader = getFileReader();
  let hasOnlyDirectories = false;
  try {
    hasOnlyDirectories = await hasOnlyDirectoryAncestors(fileReader, dir);
  } catch {}
  if (!hasOnlyDirectories) return;
  try {
    await fileReader.mkdir(dir);
  } catch (error) {
    return error;
  }
}
//@ chunk-t0gq9gyw.js:45562-45571 placement
var MAX_WRITE_RETRIES = 3;
//@ chunk-t0gq9gyw.js:45571-45624 placement
async function hasOnlyDirectoryAncestors(fileReader, path) {
  return (await findNonDirectoryAncestor(fileReader, path)) === undefined;
}
//@ chunk-t0gq9gyw.js:45624-45865 placement
async function findNonDirectoryAncestor(a_2, b) {
  let projectsDir = getProjectsDir();
  let relativePath = relative(projectsDir, b);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(".." + sep) ||
    isAbsolute(relativePath)
  )
    return;
  let currentPath = projectsDir;
  for (let extra of relativePath.split(sep)) {
    currentPath = join(currentPath, extra);
    let stats = await a_2.lstat(currentPath);
    if (stats === undefined) return;
    if (stats.isSymbolicLink || !stats.isDirectory) return currentPath;
  }
  return;
}
//@ chunk-t0gq9gyw.js:45865-46173 placement
/**
 * 检查工具结果目录可写（无本地文件会话拒绝）。
 */
async function checkToolResultsWritable(path, fileReader) {
  if (isDiskless())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "tool-results file refused: this session keeps no files on this machine",
    );
  let nonDirectoryAncestor = await findNonDirectoryAncestor(fileReader, path);
  if (nonDirectoryAncestor !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `tool-results path refused: ${nonDirectoryAncestor} is a link or not a directory`,
      "tool-results path refused: a directory on the way is a link or not a directory",
    );
}
//@ chunk-t0gq9gyw.js:46173-46379 placement
/**
 * 写入工具结果文件（重试）。
 */
async function writeToolResultFile(a, b, c) {
  let fileReader = getFileReader();
  await checkToolResultsWritable(dirname(a), fileReader);
  for (let j = 1; ; j++) {
    if (j > 1) await unlinkQuietly(fileReader, a);
    else await unlinkIfSymlink(a, fileReader);
    try {
      await fileReader.writeBytesExclusive(a, b, c);
      return;
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST" || j >= MAX_WRITE_RETRIES) throw error;
    }
  }
}
//@ chunk-t0gq9gyw.js:46379-46455 placement
/**
 * 目标是符号链接时先删除。
 */
async function unlinkIfSymlink(path, fileReader) {
  if ((await fileReader.lstat(path))?.isSymbolicLink) await unlinkQuietly(fileReader, path);
}
//@ chunk-t0gq9gyw.js:46455-46537 placement
async function unlinkQuietly(a, b) {
  try {
    await a.delete(b);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
}
//@ chunk-6nqjztgx.js:226-253 placement
/**
 * 是否是普通对象。
 */
function isObjectBlock(block) {
  return isPlainObject(block);
}
//@ chunk-f25sswmp.js:2019-2135 fingerprint = hasImageBlock (1)
/**
 * 是否为合法 base64 image 块。
 */
function hasImageBlock(content) {
  if (typeof content !== "object" || content === null) return false;
  if (!("type" in content) || content.type !== "image") return false;
  return isBase64ImageBlock(content);
}
//@ chunk-f25sswmp.js:2135-2288 placement = isToolResultBlockWithContent (1)
function isToolResultWithArrayContent(obj) {
  if (typeof obj !== "object" || obj === null) return false;
  if (!("type" in obj) || obj.type !== "tool_result") return false;
  return "content" in obj && Array.isArray(obj.content);
}
//@ chunk-dcd8bnv7.js:264-333 placement
var toolResultStoreSlot; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var NOOP_RESULT_SAVE;
deferInit("chunk-dcd8bnv7.js:264", () => {
  toolResultStoreSlot = new SessionRootSlot(() => ({
    store: undefined,
  }));
  NOOP_RESULT_SAVE = {
    maxBytes: 0,
    save: async () => null,
  };
});
//@ chunk-dcd8bnv7.js:333-417 placement
/**
 * 取会话的工具结果存储（diskless 用空实现）。
 */
function toolResultStore(host) {
  return (
    toolResultStoreSlot.peek(host)?.store ??
    (host.host.launchOptions.diskless() ? NOOP_RESULT_SAVE : undefined)
  );
}
//@ chunk-dcd8bnv7.js:417-447 placement
/**
 * 取当前会话的工具结果存储。
 */
function toolResultStoreOrNull() {
  return toolResultStore(getRootSession());
}
//@ chunk-dcd8bnv7.js:447-594 placement
/**
 * 保存结果到模型可读的位置，失败时记错误日志并返回 null。
 */
async function saveResultSafely(store, result) {
  try {
    return await store.save(result);
  } catch {
    logForDebugging("A result could not be saved where the model reads files", {
      level: "error",
    });
    return null;
  }
}
//@ chunk-jcnpfn31.js:866-1034 file-local
/**
 * "<persisted-output>" 等：落盘结果标签、截断结果标签、旧结果清除占位 "[Old tool result content cleared]"、阈值开关名 tengu_velvet_ibis。
 */
var PERSISTED_OUTPUT_TAG = "<persisted-output>";
var PERSISTED_OUTPUT_CLOSING_TAG = "</persisted-output>";
var TRUNCATED_OUTPUT_TAG = "<truncated-output>";
var TRUNCATED_OUTPUT_CLOSING_TAG = "</truncated-output>";
var TOOL_RESULT_CLEARED_MESSAGE = "[Old tool result content cleared]";
var TENGU_VELVET_IBIS = "tengu_velvet_ibis";
//@ chunk-jcnpfn31.js:1034-1217 callgraph-fingerprint = getPersistenceThreshold (1)
/**
 * 单工具落盘阈值：工具声明 maxResultSizeChars 与默认 50000 取小；tengu_velvet_ibis 可按工具名覆盖；跳过聚合预算的工具只受上限。
 */
function getPersistenceThreshold(
  toolName,
  declaredMaxResultSizeChars,
  persistenceThresholdCeiling = OUTPUT_SIZE_LIMITS,
  limits = false,
) {
  if (!Number.isFinite(declaredMaxResultSizeChars)) return declaredMaxResultSizeChars;
  if (limits) return Math.min(declaredMaxResultSizeChars, persistenceThresholdCeiling);
  let override = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELVET_IBIS, {})?.[toolName];
  if (typeof override === "number" && Number.isFinite(override) && override > 0) return override;
  return Math.min(declaredMaxResultSizeChars, persistenceThresholdCeiling);
}
//@ chunk-jcnpfn31.js:1217-1259 layout
/**
 * 2000：落盘结果预览长度；"tool result was not saved" 为落盘失败文本。
 */
var PREVIEW_SIZE_CHARS = 2000;
var PERSIST_FAILED_MESSAGE = "tool result was not saved";
//@ chunk-jcnpfn31.js:1259-1472 layout
/**
 * 单字符按 UTF-8 字节百分号编码（孤立代理项用 %uXXXX）。
 */
function percentEncodeChar(char) {
  let code = char.charCodeAt(0);
  if (char.length === 1 && code >= 55296 && code <= 57343) return `%u${code.toString(16).toUpperCase()}`;
  return Array.from(Buffer.from(char), (code) => `%${code.toString(16).toUpperCase().padStart(2, "0")}`).join(
    "",
  );
}
//@ chunk-jcnpfn31.js:1472-1641 layout
/**
 * 把 tool_use_id 转成安全文件名（非 [A-Za-z0-9_-.] 百分号编码，避开 Windows 保留名）。
 */
function sanitizeToolResultFileStem(id) {
  let stem = "";
  for (let char of String(id)) {
    let match = /^[A-Za-z0-9_-]$/.test(char) || (char === "." && stem !== "");
    stem += match ? char : percentEncodeChar(char);
  }
  if (stem === "") return "%";
  return isReservedDeviceName(stem) ? percentEncodeChar(stem.charAt(0)) + stem.slice(1) : stem;
}
//@ chunk-jcnpfn31.js:1641-1691 fingerprint = getToolResultPath (1)
/**
 * 落盘文件名 <id>.json（数组内容）或 <id>.txt。
 */
function getToolResultPath(id, isJson) {
  return `${sanitizeToolResultFileStem(id)}.${isJson ? "json" : "txt"}`;
}
//@ chunk-jcnpfn31.js:1691-1730 layout
/**
 * 会话 tool-results 目录下的完整路径。
 */
function getToolResultFilePath(originalCwd, id, isJson) {
  return join(originalCwd, getToolResultPath(id, isJson));
}
//@ chunk-jcnpfn31.js:1730-3561 fingerprint = persistToolResult (0.454)
/**
 * 写出工具结果：宿主存储可用时存入宿主（截断到上限），否则写会话目录 tool-results/<id>.txt|json（排他创建，超 1GB 截断）；返回 {filepath, originalSize, isJson, preview, hasMore, truncatedAtBytes}。
 */
async function persistToolResult(content, id, result, storageV5, maxBytes = MAX_RESULT_BUFFER_BYTES) {
  let isJson = Array.isArray(content);
  if (isJson) {
    if (content.some((block) => !isObjectBlock(block) || block.type !== "text"))
      return {
        error: "Cannot persist tool results containing non-text content",
      };
  }
  let resultStore = toolResultStoreOrNull();
  if (resultStore !== undefined) {
    let min = Math.min(maxBytes, resultStore.maxBytes);
    let text;
    let truncatedText;
    let data;
    try {
      text = isJson ? jsonStringify(content, null, 2) : content;
      truncatedText = truncateUtf8Bytes(text, min);
      data = Buffer.from(truncatedText);
    } catch {
      return {
        error: PERSIST_FAILED_MESSAGE,
      };
    }
    let saved = await saveResultSafely(resultStore, {
      leafName: getToolResultPath(id, isJson),
      data,
    });
    if (saved === null)
      return {
        error: PERSIST_FAILED_MESSAGE,
      };
    let { preview, hasMore } = generatePreview(truncatedText, PREVIEW_SIZE_CHARS);
    return {
      filepath: saved.path,
      originalSize: text.length,
      isJson,
      preview,
      hasMore,
      truncatedAtBytes: truncatedText === text ? undefined : min,
    };
  }
  if (result === null)
    return {
      error: PERSIST_FAILED_MESSAGE,
    };
  await ensureToolResultsDir(result, storageV5);
  let path = getToolResultFilePath(result, id, isJson);
  let text;
  let truncatedText;
  try {
    text = isJson ? jsonStringify(content, null, 2) : content;
    truncatedText = truncateUtf8Bytes(text, maxBytes);
  } catch (error) {
    let fileSystemErrorMessage = getFileSystemErrorMessage(toError(error));
    logForDebugging(`Failed to persist tool result to ${path}: ${fileSystemErrorMessage}`, {
      level: "error",
    });
    return {
      error: fileSystemErrorMessage,
    };
  }
  let truncatedAtBytes = truncatedText === text ? undefined : maxBytes;
  let storageKey =
    isStorageV5Enabled() && storageV5 !== undefined
      ? toolResultsKey(dirname(path), basename(path))
      : undefined;
  if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== undefined) {
    let writeResult = await storageV5.write(storageKey, truncatedText, {
      precondition: {
        type: "ifAbsent",
      },
      mode: 438 & ~process.umask(),
    });
    if (!writeResult.ok && writeResult.error.code !== "AlreadyExists") {
      let filepath = formatStorageWriteError(writeResult.error, path);
      logForDebugging(`Failed to persist tool result to ${path}: ${filepath}`, {
        level: "error",
      });
      return {
        error: filepath,
      };
    }
    if (writeResult.ok)
      logForDebugging(`Persisted tool result to ${path} (${formatFileSize(truncatedText.length)})`);
  } else {
    let fileReader = getFileReader();
    try {
      await checkToolResultsWritable(dirname(path), fileReader);
      await unlinkIfSymlink(path, fileReader);
      await fileReader.writeExclusive(path, truncatedText);
      logForDebugging(`Persisted tool result to ${path} (${formatFileSize(truncatedText.length)})`);
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") {
        logForDebugging(
          `Failed to persist tool result to ${path}: ${getFileSystemErrorMessage(toError(error))}`,
          {
            level: "error",
          },
        );
        return {
          error: getFileSystemErrorMessage(toError(error)),
        };
      }
      let stats;
      try {
        stats = await fileReader.lstat(path);
      } catch {
        return {
          error: "tool result path could not be checked; not persisted",
        };
      }
      if (stats?.isSymbolicLink)
        return {
          error: "tool result path is a link; not persisted",
        };
      if (stats?.isFile !== true)
        return {
          error: "tool result path is not a regular file; not persisted",
        };
      if (stats.nlink > 1)
        return {
          error: "tool result path has another name; not persisted",
        };
    }
  }
  let { preview, hasMore } = generatePreview(truncatedText, PREVIEW_SIZE_CHARS);
  return {
    filepath: path,
    originalSize: text.length,
    isJson,
    preview,
    hasMore,
    truncatedAtBytes,
  };
}
//@ chunk-jcnpfn31.js:3561-3608 layout
/**
 * 用 <persisted-output> 包装 buildLargeToolResultMessage 的文本。
 */
function buildPersistedOutputMessage(result) {
  return `${PERSISTED_OUTPUT_TAG}
${buildLargeToolResultMessage(result)}${PERSISTED_OUTPUT_CLOSING_TAG}`;
}
//@ chunk-jcnpfn31.js:3608-4175 fingerprint = buildLargeToolResultMessage (0.576)
/**
 * 落盘后替换文本："Output too large (X). Full output saved to: <路径>" + 预览（开头或首尾）。
 */
function buildLargeToolResultMessage(result) {
  let text =
    result.truncatedAtBytes === undefined
      ? `Output too large (${formatFileSize(result.originalSize)}). Full output saved to: ${result.filepath}

`
      : `Output exceeded the ${formatFileSize(result.truncatedAtBytes)} persist limit; only the first ${formatFileSize(result.truncatedAtBytes)} were saved to: ${result.filepath}

`;
  if (result.previewEnd !== undefined) {
    let max = Math.max(
      0,
      result.originalSize - Buffer.byteLength(result.preview) - Buffer.byteLength(result.previewEnd),
    );
    return `${text}Preview (start and end):
${result.preview}
[\u2026 ${formatFileSize(max)} omitted \u2026]
${result.previewEnd}
`;
  }
  text += `Preview (first ${formatFileSize(PREVIEW_SIZE_CHARS)}):
`;
  text += result.preview;
  text += result.hasMore
    ? `
...
`
    : `
`;
  return text;
}
//@ chunk-jcnpfn31.js:4175-4194 layout
/**
 * "1023 bytes"：估算截断说明长度用的占位。
 */
var TRUNCATION_NOTE_RESERVE = "1023 bytes";
//@ chunk-jcnpfn31.js:4194-4577 layout
/**
 * 无法落盘时就地截断：<truncated-output> 说明 + 开头部分。
 */
function buildTruncatedInlineResult(content, maxChars) {
  if (Array.isArray(content) && content.some((block) => !isObjectBlock(block) || block.type !== "text"))
    return null;
  let text =
    typeof content === "string"
      ? content
      : content.flatMap((block) =>
          block.type === "text" && "text" in block && typeof block.text === "string" ? [block.text] : [],
        ).join(`
`);
  let originalSizeText = formatFileSize(text.length);
  let max = Math.max(
    0,
    maxChars - formatTruncatedOutputMessage(originalSizeText, TRUNCATION_NOTE_RESERVE, "").length,
  );
  let shownText = truncateToLength(text, generatePreview(text, max).preview.length);
  if (shownText.length === text.length) return null;
  return {
    message: formatTruncatedOutputMessage(originalSizeText, formatFileSize(shownText.length), shownText),
    originalSize: text.length,
  };
}
//@ chunk-jcnpfn31.js:4577-4808 layout
/**
 * <truncated-output> 文案："Output too large… only the first N are shown…"。
 */
function formatTruncatedOutputMessage(text, shownSizeText, shownText) {
  return `${TRUNCATED_OUTPUT_TAG}
Output too large (${text}). It could not be saved, so only the first ${shownSizeText} are shown; the rest was dropped. If the tool can page or filter its results, call it again for the part you need.

${shownText}
${TRUNCATED_OUTPUT_CLOSING_TAG}`;
}
//@ chunk-jcnpfn31.js:4808-4899 layout
/**
 * 工具输出映射成 tool_result 块后走 processToolResultBlock。
 */
async function mapAndMaybePersistToolResult(tool, toolUseResult, toolUseID, storageV5, storageV5_2) {
  return processToolResultBlock(
    tool.mapToolResultToToolResultBlockParam(toolUseResult, toolUseID),
    tool,
    storageV5,
    storageV5_2,
  );
}
//@ chunk-jcnpfn31.js:4899-5050 fingerprint = processToolResultBlock (0.358)
/**
 * 按工具阈值调用 maybePersistLargeToolResult。
 */
async function processToolResultBlock(toolResultBlock, tool, storageV5, storageV5_2) {
  return maybePersistLargeToolResult(
    toolResultBlock,
    tool.name,
    storageV5,
    getPersistenceThreshold(
      tool.name,
      tool.maxResultSizeChars,
      tool.persistenceThresholdCeiling,
      tool.skipAggregateToolResultBudget === true,
    ),
    storageV5_2,
  );
}
//@ chunk-jcnpfn31.js:5050-5286 file-local
/**
 * 内容是否为空（空串、空数组或只有空白文本）。旧版名 contentSize 不准确。
 */
function isToolResultContentEmpty(content) {
  if (!content) return true;
  if (typeof content === "string") return content.trim() === "";
  if (!Array.isArray(content)) return false;
  if (content.length === 0) return true;
  return content.every(
    (block) =>
      isObjectBlock(block) &&
      block.type === "text" &&
      "text" in block &&
      (typeof block.text !== "string" || block.text.trim() === ""),
  );
}
//@ chunk-jcnpfn31.js:5286-6260 fingerprint = maybePersistLargeToolResult (0.872)
/**
 * 单个工具结果处理：空结果替换为 "(<工具> completed with no output)"；超阈值时落盘并换成 <persisted-output> 预览，宿主存储落盘失败则就地截断；记 tengu_tool_result_persisted。
 */
async function maybePersistLargeToolResult(
  toolResultBlock,
  toolName,
  storageV5,
  persistenceThreshold,
  maxBytes,
) {
  let content = toolResultBlock.content;
  if (isToolResultContentEmpty(content)) {
    logEvent("tengu_tool_empty_result", {
      toolName: sanitizeToolNameForAnalytics(toolName),
    });
    return {
      ...toolResultBlock,
      content: `(${toolName} completed with no output)`,
    };
  }
  if (!content) return toolResultBlock;
  let threshold = persistenceThreshold ?? MAX_RESULT_CHARS;
  if (!exceedsPersistThreshold(content, threshold)) return toolResultBlock;
  let resultStore = toolResultStoreOrNull();
  if (
    !hasLongUnbrokenRun(content) &&
    resultStore?.takesTextInline?.(getToolResultTextLength(content)) === true
  )
    return toolResultBlock;
  let result = await persistToolResult(content, toolResultBlock.tool_use_id, storageV5, maxBytes);
  if (isPersistError(result)) {
    if (resultStore !== undefined) {
      let truncatedInlineResult = buildTruncatedInlineResult(content, threshold);
      if (truncatedInlineResult === null) return toolResultBlock;
      logEvent("tengu_tool_result_persisted", {
        toolName: sanitizeToolNameForAnalytics(toolName),
        originalSizeBytes: truncatedInlineResult.originalSize,
        persistedSizeBytes: truncatedInlineResult.message.length,
        estimatedOriginalTokens: Math.ceil(truncatedInlineResult.originalSize / RESULT_LIMITS),
        estimatedPersistedTokens: Math.ceil(truncatedInlineResult.message.length / RESULT_LIMITS),
        thresholdUsed: threshold,
        stored: false,
      });
      return {
        ...toolResultBlock,
        content: truncatedInlineResult.message,
      };
    }
    return toolResultBlock;
  }
  let message = buildPersistedOutputMessage(result);
  logEvent("tengu_tool_result_persisted", {
    toolName: sanitizeToolNameForAnalytics(toolName),
    originalSizeBytes: result.originalSize,
    persistedSizeBytes: message.length,
    estimatedOriginalTokens: Math.ceil(result.originalSize / RESULT_LIMITS),
    estimatedPersistedTokens: Math.ceil(message.length / RESULT_LIMITS),
    thresholdUsed: threshold,
    truncatedAtCap: result.truncatedAtBytes !== undefined,
  });
  return {
    ...toolResultBlock,
    content: message,
  };
}
//@ chunk-jcnpfn31.js:6260-6407 fingerprint = generatePreview (1)
/**
 * 预览：超长时在最后一个换行处截断（换行位置要超过一半），返回 {preview, hasMore}。
 */
function generatePreview(content, maxBytes) {
  if (content.length <= maxBytes)
    return {
      preview: content,
      hasMore: false,
    };
  let index = content.slice(0, maxBytes).lastIndexOf(`
`);
  let cutPoint = index > maxBytes * 0.5 ? index : maxBytes;
  return {
    preview: truncateToLength(content, cutPoint),
    hasMore: true,
  };
}
//@ chunk-jcnpfn31.js:6407-6440 file-local
/**
 * persistToolResult 返回值是否为错误。
 */
function isPersistError(result) {
  return "error" in result;
}
//@ chunk-jcnpfn31.js:6440-6500 fingerprint = createContentReplacementState (1)
/**
 * 新建 contentReplacementState {seenIds:Set, replacements:Map}。
 */
function createContentReplacementState() {
  return {
    seenIds: new Set(),
    replacements: new Map(),
  };
}
//@ chunk-jcnpfn31.js:6500-6588 layout = createContentReplacementState (1)
/**
 * 复制替换状态（分叉/子代理用）。
 */
function cloneContentReplacementState(source) {
  return {
    seenIds: new Set(source.seenIds),
    replacements: new Map(source.replacements),
  };
}
//@ chunk-jcnpfn31.js:6588-6686 fingerprint = provisionContentReplacementState (1)
/**
 * tengu_hawthorn_steeple 开启时为会话准备替换状态：有历史则重建，否则新建。
 */
function provisionContentReplacementState(initialMessages, initialContentReplacements) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_hawthorn_steeple", false)) return;
  if (initialMessages)
    return reconstructContentReplacementState(initialMessages, initialContentReplacements ?? []);
  return createContentReplacementState();
}
//@ chunk-jcnpfn31.js:6686-6812 layout
/**
 * 内容已是落盘替换或 "[Old tool result content cleared]"。
 */
function isReplacedToolResultContent(content) {
  if (typeof content !== "string") return false;
  let text = content.startsWith(ARTIFACT_CONTENT_AUTHORED_TAG_LEAD)
    ? content.slice(ARTIFACT_CONTENT_AUTHORED_TAG_LEAD.length)
    : content;
  return text.startsWith(PERSISTED_OUTPUT_TAG) || text === TOOL_RESULT_CLEARED_MESSAGE;
}
//@ chunk-jcnpfn31.js:6812-6888 file-local
/**
 * 内容非空且未被替换/截断。
 */
function isContentAlreadyCompacted(content) {
  return (
    !!content &&
    !isReplacedToolResultContent(content) &&
    !(typeof content === "string" && content.startsWith(TRUNCATED_OUTPUT_TAG))
  );
}
//@ chunk-jcnpfn31.js:6888-7143 layout
/**
 * 历史里该 tool_use 的结果非错误且仍是原文。
 */
function wasToolResultKeptInFull(messages, toolUseId) {
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (message.type !== "user" || message.isVirtual || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content)
      if (block.type === "tool_result" && block.tool_use_id === toolUseId)
        return !block.is_error && isContentAlreadyCompacted(block.content);
  }
  return false;
}
//@ chunk-jcnpfn31.js:7143-7183 layout
/**
 * 内容不含媒体且字符数超过阈值。
 */
function exceedsPersistThreshold(block, threshold) {
  return !hasMediaContent(block) && getToolResultTextLength(block) > threshold;
}
//@ chunk-jcnpfn31.js:7183-7282 layout = isMedia (1)
/**
 * 内容数组含 image/document 块。
 */
function hasMediaContent(block) {
  return (
    Array.isArray(block) &&
    block.some((block) => isObjectBlock(block) && (block.type === "image" || block.type === "document"))
  );
}
//@ chunk-jcnpfn31.js:7282-7293 layout
/**
 * 5000：连续无空白字符的长度阈值。
 */
var LONG_UNBROKEN_RUN_CHARS = 5000;
//@ chunk-jcnpfn31.js:7293-7569 layout
/**
 * 文本中有超过 5000 个连续非空白字符（这类结果不交给宿主内联）。
 */
function hasLongUnbrokenRun(content) {
  return (
    typeof content === "string"
      ? [content]
      : Array.isArray(content)
        ? content.map((block) =>
            isObjectBlock(block) && block.type === "text" && "text" in block && typeof block.text === "string"
              ? block.text
              : "",
          )
        : []
  ).some((segment) => {
    let runLength = 0;
    for (let index = 0; index < segment.length; index++) {
      let code = segment.charCodeAt(index);
      runLength = code === 32 || (code >= 9 && code <= 13) ? 0 : runLength + 1;
      if (runLength >= LONG_UNBROKEN_RUN_CHARS) return true;
    }
    return false;
  });
}
//@ chunk-jcnpfn31.js:7569-7761 file-local
/**
 * 字符串或文本块总字符数。
 */
function getToolResultTextLength(content) {
  if (typeof content === "string") return content.length;
  if (!Array.isArray(content)) return 0;
  return content.reduce(
    (sum, content) =>
      sum +
      (isObjectBlock(content) &&
      content.type === "text" &&
      "text" in content &&
      typeof content.text === "string"
        ? content.text.length
        : 0),
    0,
  );
}
//@ chunk-jcnpfn31.js:7761-7966 layout = countToolCallsSince (1)
/**
 * 所有 assistant tool_use 的 id → 工具名。
 */
function mapToolUseIdToName(messages) {
  let byId = new Map();
  for (let message of messages) {
    if (message.type !== "assistant") continue;
    let content = message.message.content;
    if (!Array.isArray(content)) continue;
    for (let block of content)
      if (isObjectBlock(block) && block.type === "tool_use") byId.set(block.id, block.name);
  }
  return byId;
}
//@ chunk-jcnpfn31.js:7966-8262 layout
/**
 * 一条 user 消息里可替换的 tool_result（非空、未替换、不含媒体）及其大小。
 */
function collectToolResultCandidates(message) {
  if (message.type !== "user" || !Array.isArray(message.message.content)) return [];
  return message.message.content.flatMap((block) => {
    if (!isObjectBlock(block) || block.type !== "tool_result" || !block.content) return [];
    if (isReplacedToolResultContent(block.content)) return [];
    if (hasMediaContent(block.content)) return [];
    return [
      {
        toolUseId: block.tool_use_id,
        content: block.content,
        size: getToolResultTextLength(block.content),
      },
    ];
  });
}
//@ chunk-jcnpfn31.js:8262-8479 file-local
/**
 * 按"同一次助手回答后的工具结果"分组收集候选（并行工具结果算一组）。
 */
function collectCandidatesByMessage(messages) {
  let groups = [];
  let current = [];
  let flush = () => {
    if (current.length > 0) groups.push(current);
    current = [];
  };
  let seenAsstIds = new Set();
  for (let message of messages)
    if (message.type === "user") current.push(...collectToolResultCandidates(message));
    else if (message.type === "assistant") {
      if (!seenAsstIds.has(message.message.id)) {
        flush();
        seenAsstIds.add(message.message.id);
      }
    }
  flush();
  return groups;
}
//@ chunk-jcnpfn31.js:8479-8733 fingerprint = partitionByPriorDecision (1)
/**
 * 按替换状态把候选分为 mustReapply（已替换，需重放）、frozen（已见过、不再动）、fresh（新的）。
 */
function partitionByPriorDecision(candidates, state) {
  return candidates.reduce(
    (acc, candidate) => {
      let replacement = state.replacements.get(candidate.toolUseId);
      if (replacement !== undefined)
        acc.mustReapply.push({
          ...candidate,
          replacement,
        });
      else if (state.seenIds.has(candidate.toolUseId)) acc.frozen.push(candidate);
      else acc.fresh.push(candidate);
      return acc;
    },
    {
      mustReapply: [],
      frozen: [],
      fresh: [],
    },
  );
}
//@ chunk-jcnpfn31.js:8733-8888 file-local
/**
 * 从 fresh 里按大小降序挑选，直到 frozen+剩余 ≤ 预算。
 */
function selectFreshToReplace(fresh, frozenSize, limit) {
  let sorted = [...fresh].sort((left, right) => right.size - left.size);
  let selected = [];
  let remaining = frozenSize + fresh.reduce((sum, candidate) => sum + candidate.size, 0);
  for (let candidate of sorted) {
    if (remaining <= limit) break;
    selected.push(candidate);
    remaining -= candidate.size;
  }
  return selected;
}
//@ chunk-jcnpfn31.js:8888-9256 file-local
/**
 * 把消息中指定 tool_use_id 的 tool_result 内容替换为新文本。
 */
function replaceToolResultContents(messages, replacementMap) {
  return messages.map((message) => {
    if (message.type !== "user" || !Array.isArray(message.message.content)) return message;
    let content = message.message.content;
    if (
      !content.some(
        (text) => isObjectBlock(text) && text.type === "tool_result" && replacementMap.has(text.tool_use_id),
      )
    )
      return message;
    return {
      ...message,
      message: {
        ...message.message,
        content: content.map((block) => {
          if (!isObjectBlock(block) || block.type !== "tool_result") return block;
          let replacement = replacementMap.get(block.tool_use_id);
          return replacement === undefined
            ? block
            : {
                ...block,
                content: replacement,
              };
        }),
      },
    };
  });
}
//@ chunk-jcnpfn31.js:9256-9438 fingerprint = buildReplacement (0.591)
/**
 * 落盘一个候选并生成替换文本。
 */
async function buildReplacement(candidate, left, right) {
  let result = await persistToolResult(candidate.content, candidate.toolUseId, left, right);
  if (isPersistError(result)) return null;
  return {
    content: buildPersistedOutputMessage(result),
    originalSize: result.originalSize,
    truncatedAtCap: result.truncatedAtBytes !== undefined,
  };
}
//@ chunk-jcnpfn31.js:9438-9623 file-local
/**
 * 不参与聚合预算的工具名集合（maxResultSizeChars 无限或 skipAggregateToolResultBudget）。旧版名 getPerMessageBudgetLimit 不准确。
 */
function getBudgetExemptToolNames(tools) {
  let names = new Set();
  for (let tool of tools)
    if (!Number.isFinite(tool.maxResultSizeChars) || tool.skipAggregateToolResultBudget === true) {
      names.add(tool.name);
      for (let message of tool.aliases ?? []) names.add(message);
    }
  return names;
}
//@ chunk-jcnpfn31.js:9623-11298 fingerprint = enforceToolResultBudget (0.888)
/**
 * 每组工具结果的聚合预算（200,000 字符）：重放已有替换；新结果超预算时落盘最大的若干个；所有见过的 id 记入 seenIds，保证同一结果的决定不再改变（缓存前缀稳定）；记 tengu_message_level_tool_result_budget_enforced。
 */
async function enforceToolResultBudget(messages, state, storagePath, storageV5, exempt = new Set()) {
  let candidatesByMessage = collectCandidatesByMessage(messages);
  let nameByToolUseId = exempt.size > 0 ? mapToolUseIdToName(messages) : undefined;
  let shouldSkip = (id) => nameByToolUseId !== undefined && exempt.has(nameByToolUseId.get(id) ?? "");
  let limit = MAX_RESULT_BYTES;
  let replacementMap = new Map();
  let toPersist = [];
  let reappliedCount = 0;
  let messagesOverBudget = 0;
  for (let candidates of candidatesByMessage) {
    let { mustReapply, frozen, fresh } = partitionByPriorDecision(candidates, state);
    mustReapply.forEach((entry) => replacementMap.set(entry.toolUseId, entry.replacement));
    reappliedCount += mustReapply.length;
    if (fresh.length === 0) {
      candidates.forEach((candidate) => state.seenIds.add(candidate.toolUseId));
      continue;
    }
    fresh
      .filter((entry) => shouldSkip(entry.toolUseId))
      .forEach((entry) => state.seenIds.add(entry.toolUseId));
    let eligible = fresh.filter((entry) => !shouldSkip(entry.toolUseId));
    let frozenSize = frozen.reduce(
      (sum, frozen) => sum + (shouldSkip(frozen.toolUseId) ? 0 : frozen.size),
      0,
    );
    let freshSize = eligible.reduce((sum, entry) => sum + entry.size, 0);
    let selected = frozenSize + freshSize > limit ? selectFreshToReplace(eligible, frozenSize, limit) : [];
    let selectedIds = new Set(selected.map((entry) => entry.toolUseId));
    candidates
      .filter((candidate) => !selectedIds.has(candidate.toolUseId))
      .forEach((candidate) => state.seenIds.add(candidate.toolUseId));
    if (selected.length === 0) continue;
    messagesOverBudget++;
    toPersist.push(...selected);
  }
  if (replacementMap.size === 0 && toPersist.length === 0)
    return {
      messages,
      newlyReplaced: [],
    };
  let freshReplacements = await Promise.all(
    toPersist.map(async (candidate) => [
      candidate,
      await buildReplacement(candidate, storagePath, storageV5),
    ]),
  );
  let newlyReplaced = [];
  let replacedSize = 0;
  for (let [candidate, replacement] of freshReplacements) {
    state.seenIds.add(candidate.toolUseId);
    if (replacement === null) continue;
    replacedSize += candidate.size;
    replacementMap.set(candidate.toolUseId, replacement.content);
    state.replacements.set(candidate.toolUseId, replacement.content);
    newlyReplaced.push({
      kind: "tool-result",
      toolUseId: candidate.toolUseId,
      replacement: replacement.content,
    });
    logEvent("tengu_tool_result_persisted_message_budget", {
      originalSizeBytes: replacement.originalSize,
      persistedSizeBytes: replacement.content.length,
      estimatedOriginalTokens: Math.ceil(replacement.originalSize / RESULT_LIMITS),
      estimatedPersistedTokens: Math.ceil(replacement.content.length / RESULT_LIMITS),
      truncatedAtCap: replacement.truncatedAtCap,
    });
  }
  if (replacementMap.size === 0)
    return {
      messages,
      newlyReplaced: [],
    };
  if (newlyReplaced.length > 0) {
    logForDebugging(
      `Per-message budget: persisted ${newlyReplaced.length} tool results across ${messagesOverBudget} over-budget message(s), shed ~${formatFileSize(replacedSize)}, ${reappliedCount} re-applied`,
    );
    logEvent("tengu_message_level_tool_result_budget_enforced", {
      resultsPersisted: newlyReplaced.length,
      messagesOverBudget,
      replacedSizeBytes: replacedSize,
      reapplied: reappliedCount,
    });
  }
  return {
    messages: replaceToolResultContents(messages, replacementMap),
    newlyReplaced,
  };
}
//@ chunk-jcnpfn31.js:11298-11438 fingerprint = applyToolResultBudget (1)
/**
 * applyToolResultBudget：queryLoop 每轮调用；有替换状态时执行 enforceToolResultBudget，新替换通过回调记录到会话存储。
 */
async function applyToolResultBudget(messages, state, storagePath, onPersisted, exempt, storageV5) {
  if (!state) return messages;
  let result = await enforceToolResultBudget(messages, state, storagePath, storageV5, exempt);
  if (result.newlyReplaced.length > 0) onPersisted?.(result.newlyReplaced);
  return result.messages;
}
//@ chunk-jcnpfn31.js:11438-11746 fingerprint = reconstructContentReplacementState (1)
/**
 * 从对话与存储的替换记录重建替换状态（恢复会话用）。
 */
function reconstructContentReplacementState(messages, records, inheritedReplacements) {
  let state = createContentReplacementState();
  let candidateIds = new Set(
    collectCandidatesByMessage(messages)
      .flat()
      .map((candidate) => candidate.toolUseId),
  );
  for (let id of candidateIds) state.seenIds.add(id);
  for (let record of records)
    if (record.kind === "tool-result" && candidateIds.has(record.toolUseId))
      state.replacements.set(record.toolUseId, record.replacement);
  if (inheritedReplacements) {
    for (let [id, replacement] of inheritedReplacements)
      if (candidateIds.has(id) && !state.replacements.has(id)) state.replacements.set(id, replacement);
  }
  return state;
}
//@ chunk-jcnpfn31.js:11746-11810 fingerprint = reconstructForSubagentResume (1)
/**
 * 子代理恢复时以父替换为补充重建状态。
 */
function reconstructForSubagentResume(parentState, resumedMessages, sidechainRecords) {
  if (!parentState) return;
  return reconstructContentReplacementState(resumedMessages, sidechainRecords, parentState.replacements);
}
//@ chunk-jcnpfn31.js:11810-11959 layout
/**
 * 宿主存储写失败的错误文本。
 */
function formatStorageWriteError(error, path) {
  let code = storageErrorCode(error);
  if (code === undefined) return `storage write failed: ${error.code}`;
  let syntheticError = Error("storage write failed");
  syntheticError.code = code;
  syntheticError.path = path;
  return getFileSystemErrorMessage(syntheticError);
}
//@ chunk-jcnpfn31.js:11959-12393 fingerprint = getFileSystemErrorMessage (1)
/**
 * 文件系统错误码 → 可读文本（ENOENT/EACCES/ENOSPC/EROFS/EMFILE/EEXIST）。
 */
function getFileSystemErrorMessage(error) {
  let nodeError = error;
  if (nodeError.code)
    switch (nodeError.code) {
      case "ENOENT":
        return `Directory not found: ${nodeError.path ?? "unknown path"}`;
      case "EACCES":
        return `Permission denied: ${nodeError.path ?? "unknown path"}`;
      case "ENOSPC":
        return "No space left on device";
      case "EROFS":
        return "Read-only file system";
      case "EMFILE":
        return "Too many open files";
      case "EEXIST":
        return `File already exists: ${nodeError.path ?? "unknown path"}`;
      default:
        return `${nodeError.code}: ${nodeError.message}`;
    }
  return error.message;
}
//@ chunk-jcnpfn31.js:12393-12983 placement
/**
 * 钩子输出超 10000 字符时落盘为 hook-<id>-<source> 并换成预览；失败时截断并说明。
 */
async function persistLargeHookOutput(
  output,
  hookId,
  source,
  { threshold = RESULT_LIMIT_COUNT, storageV5 } = {},
) {
  if (output.length <= threshold) return output;
  let persisted = await persistToolResult(
    output,
    `hook-${hookId}-${source}`,
    toolResultsDirOrNull(),
    storageV5,
  );
  if (isPersistError(persisted)) {
    if (toolResultStoreOrNull() !== undefined)
      return buildTruncatedInlineResult(output, threshold)?.message ?? output;
    logEvent("tengu_hook_output_persisted", {
      source: fromEnum(source),
      originalSizeBytes: output.length,
      persistedSizeBytes: 0,
      truncatedFallback: true,
    });
    return `${truncateToLength(output, threshold)}

[Hook ${source} truncated at ${threshold} chars \u2014 persist-to-disk failed: ${persisted.error}]`;
  }
  let persistedOutputMessage = buildPersistedOutputMessage(persisted);
  logEvent("tengu_hook_output_persisted", {
    source: fromEnum(source),
    originalSizeBytes: persisted.originalSize,
    persistedSizeBytes: persistedOutputMessage.length,
    truncatedFallback: false,
    truncatedAtCap: persisted.truncatedAtBytes !== undefined,
  });
  return persistedOutputMessage;
}
//@ chunk-jcnpfn31.js:12983-13050 placement
function isPersistedHookOutputPath(original, value) {
  return (
    value.startsWith(PERSISTED_OUTPUT_TAG) &&
    value.endsWith(PERSISTED_OUTPUT_CLOSING_TAG) &&
    value !== original
  );
}
export {
  toolResultsDir,
  toolResultsKey,
  isObjectBlock,
  getPersistenceThreshold,
  persistToolResult,
  toolResultsDirFor_2,
  isPersistError,
  toolResultStore,
  buildTruncatedInlineResult,
  buildPersistedOutputMessage,
  reconstructForSubagentResume,
  provisionContentReplacementState,
  reconstructContentReplacementState,
  toolResultStoreOrNull,
  TOOL_RESULTS_SUBDIR,
  applyToolResultBudget,
  getBudgetExemptToolNames,
  persistLargeHookOutput,
  isPersistedHookOutputPath,
  generatePreview,
  PREVIEW_SIZE_CHARS,
  getOriginalCwd,
  ensureToolResultsDir,
  getToolResultFilePath,
  writeToolResultFile,
  createContentReplacementState,
  checkToolResultsWritable,
  saveResultSafely,
  PERSISTED_OUTPUT_TAG,
  PERSISTED_OUTPUT_CLOSING_TAG,
  TRUNCATED_OUTPUT_TAG,
  TRUNCATED_OUTPUT_CLOSING_TAG,
  mapAndMaybePersistToolResult,
  isToolResultContentEmpty,
  exceedsPersistThreshold,
  processToolResultBlock,
  hasImageBlock,
  buildLargeToolResultMessage,
  getToolResultTextLength,
  wasToolResultKeptInFull,
  cloneContentReplacementState,
  isToolResultWithArrayContent,
  toolResultsDirOrNull,
  TOOL_RESULT_CLEARED_MESSAGE,
  isContentAlreadyCompacted,
};
