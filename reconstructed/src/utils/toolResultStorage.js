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
import {
  join,
  dirname,
  basename,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  relative,
  relative as relative_2,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
} from "path";
import { OUTPUT_SIZE_LIMITS, iCi, sCi, RESULT_LIMITS, qhr, SIt } from "../constants/outputLimits.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isReservedDeviceName } from "./windowsProfileFolders.js";
import { jsonStringify } from "./slowOperations.js";
import { truncateUtf8Bytes, truncateToLength } from "./stringUtils.js";
import {
  toError,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "./errors.js";
import { logForDebugging } from "./debug.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { formatFileSize } from "./format.js";
import { getFileReader } from "./fileStore.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import { ift } from "../constants/xml.js";
import { storageErrorCode } from "./storage/storageErrors.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { xo, SessionRootSlot } from "../bootstrap/sessionSlices.js";
import {
  getSessionId,
  getOriginalCwd as getOriginalCwd_2,
  isDiskless,
  getRootSession,
} from "../bootstrap/state.js";
import { getPinnedProjectDir, getProjectDir, getProjectsDir } from "./sessionStoragePortable.js";
import { isValidKeySegment } from "./storage/storageSpaces.js";
import { pathToSessionSideKey } from "./storage/storageKeys.js";
import { isBase64ImageBlock } from "./imageValidation.js";
import { isPlainObject } from "./isPlainObject.js";

/**
 * "<persisted-output>" 等：落盘结果标签、截断结果标签、旧结果清除占位 "[Old tool result content cleared]"、阈值开关名 tengu_velvet_ibis。
 */
//@ chunk-jcnpfn31.js:866-1034 file-local
var PERSISTED_OUTPUT_TAG = "<persisted-output>",
  PERSISTED_OUTPUT_CLOSING_TAG = "</persisted-output>",
  TRUNCATED_OUTPUT_TAG = "<truncated-output>",
  TRUNCATED_OUTPUT_CLOSING_TAG = "</truncated-output>",
  TOOL_RESULT_CLEARED_MESSAGE = "[Old tool result content cleared]",
  TENGU_VELVET_IBIS = "tengu_velvet_ibis";
/**
 * 单工具落盘阈值：工具声明 maxResultSizeChars 与默认 50000 取小；tengu_velvet_ibis 可按工具名覆盖；跳过聚合预算的工具只受上限。
 */
//@ chunk-jcnpfn31.js:1034-1217 callgraph-fingerprint = getPersistenceThreshold (1)
function getPersistenceThreshold(e, n, r = OUTPUT_SIZE_LIMITS, o = !1) {
  if (!Number.isFinite(n)) return n;
  if (o) return Math.min(n, r);
  let override = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELVET_IBIS, {})?.[e];
  if (typeof override === "number" && Number.isFinite(override) && override > 0) return override;
  return Math.min(n, r);
}
/**
 * 2000：落盘结果预览长度；"tool result was not saved" 为落盘失败文本。
 */
//@ chunk-jcnpfn31.js:1217-1259 layout
var PREVIEW_SIZE_CHARS = 2000,
  PERSIST_FAILED_MESSAGE = "tool result was not saved";
/**
 * 单字符按 UTF-8 字节百分号编码（孤立代理项用 %uXXXX）。
 */
//@ chunk-jcnpfn31.js:1259-1472 layout
function percentEncodeChar(e) {
  let code = e.charCodeAt(0);
  if (e.length === 1 && code >= 55296 && code <= 57343) return `%u${code.toString(16).toUpperCase()}`;
  return Array.from(Buffer.from(e), (r) => `%${r.toString(16).toUpperCase().padStart(2, "0")}`).join("");
}
/**
 * 把 tool_use_id 转成安全文件名（非 [A-Za-z0-9_-.] 百分号编码，避开 Windows 保留名）。
 */
//@ chunk-jcnpfn31.js:1472-1641 layout
function sanitizeToolResultFileStem(e) {
  let n = "";
  for (let r of String(e)) {
    let o = /^[A-Za-z0-9_-]$/.test(r) || (r === "." && n !== "");
    n += o ? r : percentEncodeChar(r);
  }
  if (n === "") return "%";
  return isReservedDeviceName(n) ? percentEncodeChar(n.charAt(0)) + n.slice(1) : n;
}
/**
 * 落盘文件名 <id>.json（数组内容）或 <id>.txt。
 */
//@ chunk-jcnpfn31.js:1641-1691 fingerprint = getToolResultPath (1)
function getToolResultPath(id, isJson) {
  return `${sanitizeToolResultFileStem(id)}.${isJson ? "json" : "txt"}`;
}
/**
 * 会话 tool-results 目录下的完整路径。
 */
//@ chunk-jcnpfn31.js:1691-1730 layout
function getToolResultFilePath(e, n, r) {
  return join(e, getToolResultPath(n, r));
}
/**
 * 写出工具结果：宿主存储可用时存入宿主（截断到上限），否则写会话目录 tool-results/<id>.txt|json（排他创建，超 1GB 截断）；返回 {filepath, originalSize, isJson, preview, hasMore, truncatedAtBytes}。
 */
//@ chunk-jcnpfn31.js:1730-3561 fingerprint = persistToolResult (0.454)
async function persistToolResult(e, n, r, o, i = iCi) {
  let isJson = Array.isArray(e);
  if (isJson) {
    if (e.some((block) => !bl(block) || block.type !== "text"))
      return { error: "Cannot persist tool results containing non-text content" };
  }
  let l = dy();
  if (l !== void 0) {
    let min = Math.min(i, l.maxBytes),
      g,
      d,
      R;
    try {
      ((g = isJson ? jsonStringify(e, null, 2) : e), (d = truncateUtf8Bytes(g, min)), (R = Buffer.from(d)));
    } catch {
      return { error: PERSIST_FAILED_MESSAGE };
    }
    let E = await saveResultSafely(l, { leafName: getToolResultPath(n, isJson), data: R });
    if (E === null) return { error: PERSIST_FAILED_MESSAGE };
    let { preview: preview, hasMore: hasMore } = generatePreview(d, PREVIEW_SIZE_CHARS);
    return {
      filepath: E.path,
      originalSize: g.length,
      isJson: isJson,
      preview: preview,
      hasMore: hasMore,
      truncatedAtBytes: d === g ? void 0 : min,
    };
  }
  if (r === null) return { error: PERSIST_FAILED_MESSAGE };
  await ensureToolResultsDir(r, o);
  let u = getToolResultFilePath(r, n, isJson),
    h,
    m;
  try {
    ((h = isJson ? jsonStringify(e, null, 2) : e), (m = truncateUtf8Bytes(h, i)));
  } catch (error) {
    let g = getFileSystemErrorMessage(toError(error));
    return (logForDebugging(`Failed to persist tool result to ${u}: ${g}`, { level: "error" }), { error: g });
  }
  let T = m === h ? void 0 : i,
    S = isStorageV5Enabled() && o !== void 0 ? toolResultsKey(dirname(u), basename(u)) : void 0;
  if (isStorageV5Enabled() && o !== void 0 && S !== void 0) {
    let write = await o.write(S, m, { precondition: { type: "ifAbsent" }, mode: 438 & ~process.umask() });
    if (!write.ok && write.error.code !== "AlreadyExists") {
      let filepath = formatStorageWriteError(write.error, u);
      return (
        logForDebugging(`Failed to persist tool result to ${u}: ${filepath}`, { level: "error" }),
        { error: filepath }
      );
    }
    if (write.ok) logForDebugging(`Persisted tool result to ${u} (${formatFileSize(m.length)})`);
  } else {
    let p = getFileReader();
    try {
      (await checkToolResultsWritable(dirname(u), p),
        await qhs(u, p),
        await p.writeExclusive(u, m),
        logForDebugging(`Persisted tool result to ${u} (${formatFileSize(m.length)})`));
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST")
        return (
          logForDebugging(
            `Failed to persist tool result to ${u}: ${getFileSystemErrorMessage(toError(error))}`,
            { level: "error" },
          ),
          { error: getFileSystemErrorMessage(toError(error)) }
        );
      let d;
      try {
        d = await p.lstat(u);
      } catch {
        return { error: "tool result path could not be checked; not persisted" };
      }
      if (d?.isSymbolicLink) return { error: "tool result path is a link; not persisted" };
      if (d?.isFile !== !0) return { error: "tool result path is not a regular file; not persisted" };
      if (d.nlink > 1) return { error: "tool result path has another name; not persisted" };
    }
  }
  let { preview: preview, hasMore: hasMore } = generatePreview(m, PREVIEW_SIZE_CHARS);
  return {
    filepath: u,
    originalSize: h.length,
    isJson: isJson,
    preview: preview,
    hasMore: hasMore,
    truncatedAtBytes: T,
  };
}
/**
 * 用 <persisted-output> 包装 buildLargeToolResultMessage 的文本。
 */
//@ chunk-jcnpfn31.js:3561-3608 layout
function buildPersistedOutputMessage(e) {
  return `${PERSISTED_OUTPUT_TAG}
${buildLargeToolResultMessage(e)}${PERSISTED_OUTPUT_CLOSING_TAG}`;
}
/**
 * 落盘后替换文本："Output too large (X). Full output saved to: <路径>" + 预览（开头或首尾）。
 */
//@ chunk-jcnpfn31.js:3608-4175 fingerprint = buildLargeToolResultMessage (0.576)
function buildLargeToolResultMessage(result) {
  let n =
    result.truncatedAtBytes === void 0
      ? `Output too large (${formatFileSize(result.originalSize)}). Full output saved to: ${result.filepath}

`
      : `Output exceeded the ${formatFileSize(result.truncatedAtBytes)} persist limit; only the first ${formatFileSize(result.truncatedAtBytes)} were saved to: ${result.filepath}

`;
  if (result.previewEnd !== void 0) {
    let max = Math.max(
      0,
      result.originalSize - Buffer.byteLength(result.preview) - Buffer.byteLength(result.previewEnd),
    );
    return `${n}Preview (start and end):
${result.preview}
[\u2026 ${formatFileSize(max)} omitted \u2026]
${result.previewEnd}
`;
  }
  return (
    (n += `Preview (first ${formatFileSize(PREVIEW_SIZE_CHARS)}):
`),
    (n += result.preview),
    (n += result.hasMore
      ? `
...
`
      : `
`),
    n
  );
}
/**
 * "1023 bytes"：估算截断说明长度用的占位。
 */
//@ chunk-jcnpfn31.js:4175-4194 layout
var TRUNCATION_NOTE_RESERVE = "1023 bytes";
/**
 * 无法落盘时就地截断：<truncated-output> 说明 + 开头部分。
 */
//@ chunk-jcnpfn31.js:4194-4577 layout
function buildTruncatedInlineResult(e, n) {
  if (Array.isArray(e) && e.some((l) => !bl(l) || l.type !== "text")) return null;
  let r =
      typeof e === "string"
        ? e
        : e.flatMap((l) => (l.type === "text" && "text" in l && typeof l.text === "string" ? [l.text] : []))
            .join(`
`),
    o = formatFileSize(r.length),
    max = Math.max(0, n - formatTruncatedOutputMessage(o, TRUNCATION_NOTE_RESERVE, "").length),
    s = truncateToLength(r, generatePreview(r, max).preview.length);
  if (s.length === r.length) return null;
  return { message: formatTruncatedOutputMessage(o, formatFileSize(s.length), s), originalSize: r.length };
}
/**
 * <truncated-output> 文案："Output too large… only the first N are shown…"。
 */
//@ chunk-jcnpfn31.js:4577-4808 layout
function formatTruncatedOutputMessage(e, n, r) {
  return `${TRUNCATED_OUTPUT_TAG}
Output too large (${e}). It could not be saved, so only the first ${n} are shown; the rest was dropped. If the tool can page or filter its results, call it again for the part you need.

${r}
${TRUNCATED_OUTPUT_CLOSING_TAG}`;
}
/**
 * 工具输出映射成 tool_result 块后走 processToolResultBlock。
 */
//@ chunk-jcnpfn31.js:4808-4899 layout
async function mapAndMaybePersistToolResult(e, n, r, o, i) {
  return processToolResultBlock(e.mapToolResultToToolResultBlockParam(n, r), e, o, i);
}
/**
 * 按工具阈值调用 maybePersistLargeToolResult。
 */
//@ chunk-jcnpfn31.js:4899-5050 fingerprint = processToolResultBlock (0.358)
async function processToolResultBlock(e, n, r, o) {
  return maybePersistLargeToolResult(
    e,
    n.name,
    r,
    getPersistenceThreshold(
      n.name,
      n.maxResultSizeChars,
      n.persistenceThresholdCeiling,
      n.skipAggregateToolResultBudget === !0,
    ),
    o,
  );
}
/**
 * 内容是否为空（空串、空数组或只有空白文本）。旧版名 contentSize 不准确。
 */
//@ chunk-jcnpfn31.js:5050-5286 file-local
function isToolResultContentEmpty(content) {
  if (!content) return !0;
  if (typeof content === "string") return content.trim() === "";
  if (!Array.isArray(content)) return !1;
  if (content.length === 0) return !0;
  return content.every(
    (block) =>
      bl(block) &&
      block.type === "text" &&
      "text" in block &&
      (typeof block.text !== "string" || block.text.trim() === ""),
  );
}
/**
 * 单个工具结果处理：空结果替换为 "(<工具> completed with no output)"；超阈值时落盘并换成 <persisted-output> 预览，宿主存储落盘失败则就地截断；记 tengu_tool_result_persisted。
 */
//@ chunk-jcnpfn31.js:5286-6260 fingerprint = maybePersistLargeToolResult (0.872)
async function maybePersistLargeToolResult(e, n, r, o, i) {
  let content = e.content;
  if (isToolResultContentEmpty(content))
    return (
      logEvent("tengu_tool_empty_result", { toolName: sanitizeToolNameForAnalytics(n) }),
      { ...e, content: `(${n} completed with no output)` }
    );
  if (!content) return e;
  let threshold = o ?? sCi;
  if (!exceedsPersistThreshold(content, threshold)) return e;
  let u = dy();
  if (!hasLongUnbrokenRun(content) && u?.takesTextInline?.(getToolResultTextLength(content)) === !0) return e;
  let h = await persistToolResult(content, e.tool_use_id, r, i);
  if (isPersistError(h)) {
    if (u !== void 0) {
      let T = buildTruncatedInlineResult(content, threshold);
      if (T === null) return e;
      return (
        logEvent("tengu_tool_result_persisted", {
          toolName: sanitizeToolNameForAnalytics(n),
          originalSizeBytes: T.originalSize,
          persistedSizeBytes: T.message.length,
          estimatedOriginalTokens: Math.ceil(T.originalSize / RESULT_LIMITS),
          estimatedPersistedTokens: Math.ceil(T.message.length / RESULT_LIMITS),
          thresholdUsed: threshold,
          stored: !1,
        }),
        { ...e, content: T.message }
      );
    }
    return e;
  }
  let message = buildPersistedOutputMessage(h);
  return (
    logEvent("tengu_tool_result_persisted", {
      toolName: sanitizeToolNameForAnalytics(n),
      originalSizeBytes: h.originalSize,
      persistedSizeBytes: message.length,
      estimatedOriginalTokens: Math.ceil(h.originalSize / RESULT_LIMITS),
      estimatedPersistedTokens: Math.ceil(message.length / RESULT_LIMITS),
      thresholdUsed: threshold,
      truncatedAtCap: h.truncatedAtBytes !== void 0,
    }),
    { ...e, content: message }
  );
}
/**
 * 预览：超长时在最后一个换行处截断（换行位置要超过一半），返回 {preview, hasMore}。
 */
//@ chunk-jcnpfn31.js:6260-6407 fingerprint = generatePreview (1)
function generatePreview(content, maxBytes) {
  if (content.length <= maxBytes) return { preview: content, hasMore: !1 };
  let index = content.slice(0, maxBytes).lastIndexOf(`
`),
    cutPoint = index > maxBytes * 0.5 ? index : maxBytes;
  return { preview: truncateToLength(content, cutPoint), hasMore: !0 };
}
/**
 * persistToolResult 返回值是否为错误。
 */
//@ chunk-jcnpfn31.js:6407-6440 file-local
function isPersistError(result) {
  return "error" in result;
}
/**
 * 新建 contentReplacementState {seenIds:Set, replacements:Map}。
 */
//@ chunk-jcnpfn31.js:6440-6500 fingerprint = createContentReplacementState (1)
function createContentReplacementState() {
  return { seenIds: new Set(), replacements: new Map() };
}
/**
 * 复制替换状态（分叉/子代理用）。
 */
//@ chunk-jcnpfn31.js:6500-6588 layout = createContentReplacementState (1)
function cloneContentReplacementState(e) {
  return { seenIds: new Set(e.seenIds), replacements: new Map(e.replacements) };
}
/**
 * tengu_hawthorn_steeple 开启时为会话准备替换状态：有历史则重建，否则新建。
 */
//@ chunk-jcnpfn31.js:6588-6686 fingerprint = provisionContentReplacementState (1)
function provisionContentReplacementState(initialMessages, initialContentReplacements) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_hawthorn_steeple", !1)) return;
  if (initialMessages)
    return reconstructContentReplacementState(initialMessages, initialContentReplacements ?? []);
  return createContentReplacementState();
}
/**
 * 内容已是落盘替换或 "[Old tool result content cleared]"。
 */
//@ chunk-jcnpfn31.js:6686-6812 layout
function isReplacedToolResultContent(e) {
  if (typeof e !== "string") return !1;
  let n = e.startsWith(ift) ? e.slice(ift.length) : e;
  return n.startsWith(PERSISTED_OUTPUT_TAG) || n === TOOL_RESULT_CLEARED_MESSAGE;
}
/**
 * 内容非空且未被替换/截断。
 */
//@ chunk-jcnpfn31.js:6812-6888 file-local
function isContentAlreadyCompacted(content) {
  return (
    !!content &&
    !isReplacedToolResultContent(content) &&
    !(typeof content === "string" && content.startsWith(TRUNCATED_OUTPUT_TAG))
  );
}
/**
 * 历史里该 tool_use 的结果非错误且仍是原文。
 */
//@ chunk-jcnpfn31.js:6888-7143 layout
function wasToolResultKeptInFull(e, n) {
  for (let r = e.length - 1; r >= 0; r--) {
    let o = e[r];
    if (o.type !== "user" || o.isVirtual || !Array.isArray(o.message.content)) continue;
    for (let i of o.message.content)
      if (i.type === "tool_result" && i.tool_use_id === n)
        return !i.is_error && isContentAlreadyCompacted(i.content);
  }
  return !1;
}
/**
 * 内容不含媒体且字符数超过阈值。
 */
//@ chunk-jcnpfn31.js:7143-7183 layout
function exceedsPersistThreshold(e, n) {
  return !hasMediaContent(e) && getToolResultTextLength(e) > n;
}
/**
 * 内容数组含 image/document 块。
 */
//@ chunk-jcnpfn31.js:7183-7282 layout = isMedia (1)
function hasMediaContent(block) {
  return Array.isArray(block) && block.some((n) => bl(n) && (n.type === "image" || n.type === "document"));
}
/**
 * 5000：连续无空白字符的长度阈值。
 */
//@ chunk-jcnpfn31.js:7282-7293 layout
var LONG_UNBROKEN_RUN_CHARS = 5000;
/**
 * 文本中有超过 5000 个连续非空白字符（这类结果不交给宿主内联）。
 */
//@ chunk-jcnpfn31.js:7293-7569 layout
function hasLongUnbrokenRun(e) {
  return (
    typeof e === "string"
      ? [e]
      : Array.isArray(e)
        ? e.map((r) =>
            bl(r) && r.type === "text" && "text" in r && typeof r.text === "string" ? r.text : "",
          )
        : []
  ).some((r) => {
    let o = 0;
    for (let i = 0; i < r.length; i++) {
      let code = r.charCodeAt(i);
      if (((o = code === 32 || (code >= 9 && code <= 13) ? 0 : o + 1), o >= LONG_UNBROKEN_RUN_CHARS))
        return !0;
    }
    return !1;
  });
}
/**
 * 字符串或文本块总字符数。
 */
//@ chunk-jcnpfn31.js:7569-7761 file-local
function getToolResultTextLength(content) {
  if (typeof content === "string") return content.length;
  if (!Array.isArray(content)) return 0;
  return content.reduce(
    (sum, r) =>
      sum + (bl(r) && r.type === "text" && "text" in r && typeof r.text === "string" ? r.text.length : 0),
    0,
  );
}
/**
 * 所有 assistant tool_use 的 id → 工具名。
 */
//@ chunk-jcnpfn31.js:7761-7966 layout = countToolCallsSince (1)
function mapToolUseIdToName(e) {
  let n = new Map();
  for (let message of e) {
    if (message.type !== "assistant") continue;
    let content = message.message.content;
    if (!Array.isArray(content)) continue;
    for (let i of content) if (bl(i) && i.type === "tool_use") n.set(i.id, i.name);
  }
  return n;
}
/**
 * 一条 user 消息里可替换的 tool_result（非空、未替换、不含媒体）及其大小。
 */
//@ chunk-jcnpfn31.js:7966-8262 layout
function collectToolResultCandidates(e) {
  if (e.type !== "user" || !Array.isArray(e.message.content)) return [];
  return e.message.content.flatMap((n) => {
    if (!bl(n) || n.type !== "tool_result" || !n.content) return [];
    if (isReplacedToolResultContent(n.content)) return [];
    if (hasMediaContent(n.content)) return [];
    return [{ toolUseId: n.tool_use_id, content: n.content, size: getToolResultTextLength(n.content) }];
  });
}
/**
 * 按"同一次助手回答后的工具结果"分组收集候选（并行工具结果算一组）。
 */
//@ chunk-jcnpfn31.js:8262-8479 file-local
function collectCandidatesByMessage(messages) {
  let n = [],
    r = [],
    flush = () => {
      if (r.length > 0) n.push(r);
      r = [];
    },
    seenAsstIds = new Set();
  for (let message of messages)
    if (message.type === "user") r.push(...collectToolResultCandidates(message));
    else if (message.type === "assistant") {
      if (!seenAsstIds.has(message.message.id)) (flush(), seenAsstIds.add(message.message.id));
    }
  return (flush(), n);
}
/**
 * 按替换状态把候选分为 mustReapply（已替换，需重放）、frozen（已见过、不再动）、fresh（新的）。
 */
//@ chunk-jcnpfn31.js:8479-8733 fingerprint = partitionByPriorDecision (1)
function partitionByPriorDecision(candidates, state) {
  return candidates.reduce(
    (acc, o) => {
      let replacement = state.replacements.get(o.toolUseId);
      if (replacement !== void 0) acc.mustReapply.push({ ...o, replacement: replacement });
      else if (state.seenIds.has(o.toolUseId)) acc.frozen.push(o);
      else acc.fresh.push(o);
      return acc;
    },
    { mustReapply: [], frozen: [], fresh: [] },
  );
}
/**
 * 从 fresh 里按大小降序挑选，直到 frozen+剩余 ≤ 预算。
 */
//@ chunk-jcnpfn31.js:8733-8888 file-local
function selectFreshToReplace(fresh, frozenSize, limit) {
  let sorted = [...fresh].sort((l, u) => u.size - l.size),
    selected = [],
    remaining = frozenSize + fresh.reduce((sum, u) => sum + u.size, 0);
  for (let l of sorted) {
    if (remaining <= limit) break;
    (selected.push(l), (remaining -= l.size));
  }
  return selected;
}
/**
 * 把消息中指定 tool_use_id 的 tool_result 内容替换为新文本。
 */
//@ chunk-jcnpfn31.js:8888-9256 file-local
function replaceToolResultContents(messages, replacementMap) {
  return messages.map((message) => {
    if (message.type !== "user" || !Array.isArray(message.message.content)) return message;
    let content = message.message.content;
    if (!content.some((s) => bl(s) && s.type === "tool_result" && replacementMap.has(s.tool_use_id)))
      return message;
    return {
      ...message,
      message: {
        ...message.message,
        content: content.map((block) => {
          if (!bl(block) || block.type !== "tool_result") return block;
          let replacement = replacementMap.get(block.tool_use_id);
          return replacement === void 0 ? block : { ...block, content: replacement };
        }),
      },
    };
  });
}
/**
 * 落盘一个候选并生成替换文本。
 */
//@ chunk-jcnpfn31.js:9256-9438 fingerprint = buildReplacement (0.591)
async function buildReplacement(e, n, r) {
  let o = await persistToolResult(e.content, e.toolUseId, n, r);
  if (isPersistError(o)) return null;
  return {
    content: buildPersistedOutputMessage(o),
    originalSize: o.originalSize,
    truncatedAtCap: o.truncatedAtBytes !== void 0,
  };
}
/**
 * 不参与聚合预算的工具名集合（maxResultSizeChars 无限或 skipAggregateToolResultBudget）。旧版名 getPerMessageBudgetLimit 不准确。
 */
//@ chunk-jcnpfn31.js:9438-9623 file-local
function getBudgetExemptToolNames(e) {
  let n = new Set();
  for (let r of e)
    if (!Number.isFinite(r.maxResultSizeChars) || r.skipAggregateToolResultBudget === !0) {
      n.add(r.name);
      for (let o of r.aliases ?? []) n.add(o);
    }
  return n;
}
/**
 * 每组工具结果的聚合预算（200,000 字符）：重放已有替换；新结果超预算时落盘最大的若干个；所有见过的 id 记入 seenIds，保证同一结果的决定不再改变（缓存前缀稳定）；记 tengu_message_level_tool_result_budget_enforced。
 */
//@ chunk-jcnpfn31.js:9623-11298 fingerprint = enforceToolResultBudget (0.888)
async function enforceToolResultBudget(e, n, r, o, i = new Set()) {
  let candidatesByMessage = collectCandidatesByMessage(e),
    l = i.size > 0 ? mapToolUseIdToName(e) : void 0,
    shouldSkip = (id) => l !== void 0 && i.has(l.get(id) ?? ""),
    h = qhr,
    replacementMap = new Map(),
    T = [],
    S = 0,
    y = 0;
  for (let candidates of candidatesByMessage) {
    let { mustReapply: mustReapply, frozen: frozen, fresh: fresh } = partitionByPriorDecision(candidates, n);
    if (
      (mustReapply.forEach((f) => replacementMap.set(f.toolUseId, f.replacement)),
      (S += mustReapply.length),
      fresh.length === 0)
    ) {
      candidates.forEach((f) => n.seenIds.add(f.toolUseId));
      continue;
    }
    fresh.filter((f) => shouldSkip(f.toolUseId)).forEach((f) => n.seenIds.add(f.toolUseId));
    let eligible = fresh.filter((f) => !shouldSkip(f.toolUseId)),
      frozenSize = frozen.reduce((sum, C) => sum + (shouldSkip(C.toolUseId) ? 0 : C.size), 0),
      freshSize = eligible.reduce((sum, C) => sum + C.size, 0),
      I = frozenSize + freshSize > h ? selectFreshToReplace(eligible, frozenSize, h) : [],
      selectedIds = new Set(I.map((f) => f.toolUseId));
    if (
      (candidates.filter((f) => !selectedIds.has(f.toolUseId)).forEach((f) => n.seenIds.add(f.toolUseId)),
      I.length === 0)
    )
      continue;
    (y++, T.push(...I));
  }
  if (replacementMap.size === 0 && T.length === 0) return { messages: e, newlyReplaced: [] };
  let freshReplacements = await Promise.all(T.map(async (d) => [d, await buildReplacement(d, r, o)])),
    p = [],
    g = 0;
  for (let [d, R] of freshReplacements) {
    if ((n.seenIds.add(d.toolUseId), R === null)) continue;
    ((g += d.size),
      replacementMap.set(d.toolUseId, R.content),
      n.replacements.set(d.toolUseId, R.content),
      p.push({ kind: "tool-result", toolUseId: d.toolUseId, replacement: R.content }),
      logEvent("tengu_tool_result_persisted_message_budget", {
        originalSizeBytes: R.originalSize,
        persistedSizeBytes: R.content.length,
        estimatedOriginalTokens: Math.ceil(R.originalSize / RESULT_LIMITS),
        estimatedPersistedTokens: Math.ceil(R.content.length / RESULT_LIMITS),
        truncatedAtCap: R.truncatedAtCap,
      }));
  }
  if (replacementMap.size === 0) return { messages: e, newlyReplaced: [] };
  if (p.length > 0)
    (logForDebugging(
      `Per-message budget: persisted ${p.length} tool results across ${y} over-budget message(s), shed ~${formatFileSize(g)}, ${S} re-applied`,
    ),
      logEvent("tengu_message_level_tool_result_budget_enforced", {
        resultsPersisted: p.length,
        messagesOverBudget: y,
        replacedSizeBytes: g,
        reapplied: S,
      }));
  return { messages: replaceToolResultContents(e, replacementMap), newlyReplaced: p };
}
/**
 * applyToolResultBudget：queryLoop 每轮调用；有替换状态时执行 enforceToolResultBudget，新替换通过回调记录到会话存储。
 */
//@ chunk-jcnpfn31.js:11298-11438 fingerprint = applyToolResultBudget (1)
async function applyToolResultBudget(e, n, r, o, i, s) {
  if (!n) return e;
  let l = await enforceToolResultBudget(e, n, r, s, i);
  if (l.newlyReplaced.length > 0) o?.(l.newlyReplaced);
  return l.messages;
}
/**
 * 从对话与存储的替换记录重建替换状态（恢复会话用）。
 */
//@ chunk-jcnpfn31.js:11438-11746 fingerprint = reconstructContentReplacementState (1)
function reconstructContentReplacementState(messages, records, inheritedReplacements) {
  let state = createContentReplacementState(),
    candidateIds = new Set(
      collectCandidatesByMessage(messages)
        .flat()
        .map((s) => s.toolUseId),
    );
  for (let id of candidateIds) state.seenIds.add(id);
  for (let s of records)
    if (s.kind === "tool-result" && candidateIds.has(s.toolUseId))
      state.replacements.set(s.toolUseId, s.replacement);
  if (inheritedReplacements) {
    for (let [s, l] of inheritedReplacements)
      if (candidateIds.has(s) && !state.replacements.has(s)) state.replacements.set(s, l);
  }
  return state;
}
/**
 * 子代理恢复时以父替换为补充重建状态。
 */
//@ chunk-jcnpfn31.js:11746-11810 fingerprint = reconstructForSubagentResume (1)
function reconstructForSubagentResume(parentState, resumedMessages, sidechainRecords) {
  if (!parentState) return;
  return reconstructContentReplacementState(resumedMessages, sidechainRecords, parentState.replacements);
}
/**
 * 宿主存储写失败的错误文本。
 */
//@ chunk-jcnpfn31.js:11810-11959 layout
function formatStorageWriteError(e, n) {
  let r = storageErrorCode(e);
  if (r === void 0) return `storage write failed: ${e.code}`;
  let o = Error("storage write failed");
  return ((o.code = r), (o.path = n), getFileSystemErrorMessage(o));
}
/**
 * 文件系统错误码 → 可读文本（ENOENT/EACCES/ENOSPC/EROFS/EMFILE/EEXIST）。
 */
//@ chunk-jcnpfn31.js:11959-12393 fingerprint = getFileSystemErrorMessage (1)
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
/**
 * 钩子输出超 10000 字符时落盘为 hook-<id>-<source> 并换成预览；失败时截断并说明。
 */
//@ chunk-jcnpfn31.js:12393-12983 placement
async function persistLargeHookOutput(e, n, r, { threshold: o = SIt, storageV5: i } = {}) {
  if (e.length <= o) return e;
  let s = await persistToolResult(e, `hook-${n}-${r}`, kSr(), i);
  if (isPersistError(s)) {
    if (dy() !== void 0) return buildTruncatedInlineResult(e, o)?.message ?? e;
    return (
      logEvent("tengu_hook_output_persisted", {
        source: fromEnum(r),
        originalSizeBytes: e.length,
        persistedSizeBytes: 0,
        truncatedFallback: !0,
      }),
      `${truncateToLength(e, o)}

[Hook ${r} truncated at ${o} chars \u2014 persist-to-disk failed: ${s.error}]`
    );
  }
  let l = buildPersistedOutputMessage(s);
  return (
    logEvent("tengu_hook_output_persisted", {
      source: fromEnum(r),
      originalSizeBytes: s.originalSize,
      persistedSizeBytes: l.length,
      truncatedFallback: !1,
      truncatedAtCap: s.truncatedAtBytes !== void 0,
    }),
    l
  );
}
//@ chunk-jcnpfn31.js:12983-13050 placement
function isPersistedHookOutputPath(e, n) {
  return n.startsWith(PERSISTED_OUTPUT_TAG) && n.endsWith(PERSISTED_OUTPUT_CLOSING_TAG) && n !== e;
}
/**
 * 落盘子目录名 "tool-results"。
 */
//@ chunk-t0gq9gyw.js:44789-44812 fingerprint = TOOL_RESULTS_SUBDIR (1)
var TOOL_RESULTS_SUBDIR = "tool-results";
//@ chunk-t0gq9gyw.js:44812-44875 placement = getOriginalCwd (0.722)
function getOriginalCwd(e) {
  return Tn(e.root.id, () => xo(e.root).originalCwd);
}
/**
 * 工具结果目录。
 */
//@ chunk-t0gq9gyw.js:44875-44907 placement
function toolResultsDir() {
  return Tn(getSessionId(), getOriginalCwd_2);
}
/**
 * 指定会话的工具结果目录。
 */
//@ chunk-t0gq9gyw.js:44907-44944 placement
function toolResultsDirFor(e) {
  return isDiskless() ? null : getOriginalCwd(e);
}
//@ chunk-t0gq9gyw.js:44944-44980 placement
function kSr() {
  return isDiskless() ? null : toolResultsDir();
}
//@ chunk-t0gq9gyw.js:44980-45029 placement
function Tn(e, n) {
  return join_3(getPinnedProjectDir() ?? getProjectDir(n()), e, TOOL_RESULTS_SUBDIR);
}
/**
 * 工具结果文件对应的存储键。
 */
//@ chunk-t0gq9gyw.js:45029-45095 placement
function toolResultsKey(e, n) {
  if (basename_3(e) !== TOOL_RESULTS_SUBDIR || !isValidKeySegment(n)) return;
  return pathToSessionSideKey(join_3(e, n));
}
//@ chunk-t0gq9gyw.js:45095-45280 placement
function getSidecarParentKey(e) {
  let n = toolResultsKey(e, "probe");
  if (n === void 0 || n.namespace !== "sidecar") return;
  return {
    namespace: "sidecar",
    projectKey: n.projectKey,
    sessionId: n.sessionId,
    relPath: n.relPath.slice(0, -1),
  };
}
/**
 * 确保工具结果目录存在。
 */
//@ chunk-t0gq9gyw.js:45280-45562 placement
async function ensureToolResultsDir(e, n) {
  if (isStorageV5Enabled() && n !== void 0) {
    let s = getSidecarParentKey(e);
    if (s !== void 0)
      try {
        if ((await n.ensureScope(s)).ok) return;
      } catch {}
  }
  if (isDiskless()) {
    logForDebugging("tool-results folder not made: diskless session");
    return;
  }
  let r = getFileReader(),
    o = !1;
  try {
    o = await To(r, e);
  } catch {}
  if (!o) return;
  try {
    await r.mkdir(e);
  } catch (error) {
    return error;
  }
}
//@ chunk-t0gq9gyw.js:45562-45571 placement
var Fo = 3;
//@ chunk-t0gq9gyw.js:45571-45624 placement
async function To(e, n) {
  return (await findNonDirectoryAncestor(e, n)) === void 0;
}
//@ chunk-t0gq9gyw.js:45624-45865 placement
async function findNonDirectoryAncestor(e, n) {
  let r = getProjectsDir(),
    o = relative(r, n);
  if (o === "" || o === ".." || o.startsWith(".." + sep_2) || isAbsolute_3(o)) return;
  let s = r;
  for (let a of o.split(sep_2)) {
    s = join_3(s, a);
    let stats = await e.lstat(s);
    if (stats === void 0) return;
    if (stats.isSymbolicLink || !stats.isDirectory) return s;
  }
  return;
}
/**
 * 检查工具结果目录可写（无本地文件会话拒绝）。
 */
//@ chunk-t0gq9gyw.js:45865-46173 placement
async function checkToolResultsWritable(e, n) {
  if (isDiskless())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "tool-results file refused: this session keeps no files on this machine",
    );
  let r = await findNonDirectoryAncestor(n, e);
  if (r !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `tool-results path refused: ${r} is a link or not a directory`,
      "tool-results path refused: a directory on the way is a link or not a directory",
    );
}
/**
 * 写入工具结果文件（重试）。
 */
//@ chunk-t0gq9gyw.js:46173-46379 placement
async function writeToolResultFile(e, n, r) {
  let o = getFileReader();
  await checkToolResultsWritable(dirname_4(e), o);
  for (let s = 1; ; s++) {
    if (s > 1) await Dn(o, e);
    else await qhs(e, o);
    try {
      await o.writeBytesExclusive(e, n, r);
      return;
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST" || s >= Fo) throw error;
    }
  }
}
//@ chunk-t0gq9gyw.js:46379-46455 placement
async function qhs(e, n) {
  if ((await n.lstat(e))?.isSymbolicLink) await Dn(n, e);
}
//@ chunk-t0gq9gyw.js:46455-46537 placement
async function Dn(e, n) {
  try {
    await e.delete(n);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
}
//@ chunk-dcd8bnv7.js:264-333 placement
var r = new SessionRootSlot(() => ({ store: void 0 })),
  s = { maxBytes: 0, save: async () => null };
//@ chunk-dcd8bnv7.js:333-417 placement
function W5o(e) {
  return r.peek(e)?.store ?? (e.host.launchOptions.diskless() ? s : void 0);
}
//@ chunk-dcd8bnv7.js:417-447 placement
function dy() {
  return W5o(getRootSession());
}
/**
 * 保存结果到模型可读的位置，失败时记错误日志并返回 null。
 */
//@ chunk-dcd8bnv7.js:447-594 placement
async function saveResultSafely(e, o) {
  try {
    return await e.save(o);
  } catch {
    return (
      logForDebugging("A result could not be saved where the model reads files", { level: "error" }),
      null
    );
  }
}
/**
 * 是否为合法 base64 image 块。
 */
//@ chunk-f25sswmp.js:2019-2135 fingerprint = hasImageBlock (1)
function hasImageBlock(content) {
  if (typeof content !== "object" || content === null) return !1;
  if (!("type" in content) || content.type !== "image") return !1;
  return isBase64ImageBlock(content);
}
//@ chunk-f25sswmp.js:2135-2288 placement = isToolResultBlockWithContent (1)
function isToolResultWithArrayContent(obj) {
  if (typeof obj !== "object" || obj === null) return !1;
  if (!("type" in obj) || obj.type !== "tool_result") return !1;
  return "content" in obj && Array.isArray(obj.content);
}
//@ chunk-6nqjztgx.js:226-253 placement
function bl(n) {
  return isPlainObject(n);
}

export {
  toolResultsDir,
  toolResultsKey,
  bl,
  getPersistenceThreshold,
  persistToolResult,
  toolResultsDirFor,
  isPersistError,
  W5o,
  buildTruncatedInlineResult,
  buildPersistedOutputMessage,
  reconstructForSubagentResume,
  provisionContentReplacementState,
  reconstructContentReplacementState,
  dy,
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
  kSr,
  TOOL_RESULT_CLEARED_MESSAGE,
  isContentAlreadyCompacted,
};
