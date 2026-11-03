/**
 * utils/mcpOutputStorage.ts
 *
 * 已有模块；g2 补充 MCP 内容保存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mcpOutputStorage.ts
 * pieces: chunk-bhxaz9j0.js (25), chunk-e6aww6q8.js (4)
 * attribution: placement 22, fingerprint 6, layout 1
 */
import { dirname, join } from "path";
import {
  toolResultStoreOrNull,
  toolResultsDir,
  saveResultSafely,
  ensureToolResultsDir,
  writeToolResultFile,
  toolResultsKey,
} from "./toolResultStorage.js";
import { uniq, count } from "./collections.js";
import { firstLineOf } from "./stringUtils.js";
import { MAX_PERSIST_BYTES as MAX_PERSIST_BYTES_2, MAX_PDF_PAGES_PER_READ } from "./truncateGraphemes.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { toError } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { formatFileSize } from "./format.js";
import { getLiveState } from "../services/liveReplica/liveReplica.js";
import { getDefaultFileReadingLimits } from "../tools/FileReadTool/limits.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";
import { useSubagentTruncationPrompt } from "../services/mcp/client.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";
import { getPlatform } from "./platform.js";
import { AGENT } from "../tools/AgentTool/constants.js";

//@ chunk-bhxaz9j0.js:1161-1247 placement
/**
 * 默认的工具结果存盘目录结构（无盘时为空）。
 */
function defaultToolResultsStorage() {
  if (toolResultStoreOrNull() !== undefined)
    return {
      dirs: [],
      paths: [],
    };
  return {
    dirs: [toolResultsDir()],
    paths: [],
  };
}
//@ chunk-bhxaz9j0.js:1247-1367 placement
/**
 * 把保存的文件路径及其目录记录到集合中（去重）。
 */
function recordSavedFilePath(e, r) {
  if (!e) return;
  let n = dirname(r);
  if (!e.dirs.includes(n)) e.dirs.push(n);
  if (!e.paths.includes(r)) e.paths.push(r);
}
//@ chunk-bhxaz9j0.js:1367-1433 placement
/**
 * 从已保存文件集合中移除某路径。
 */
function forgetSavedFilePath(e, r) {
  if (!e) return;
  e.paths = e.paths.filter((path) => path !== r);
}
//@ chunk-bhxaz9j0.js:1433-1560 placement
/**
 * 把新保存的文件并入状态的 webFetchSavedFiles；无变化时直接用原状态，否则按需经更新函数提交。
 */
function withWebFetchSavedFiles(e, runGuard, n, i) {
  let o = mergeSavedFiles(e.webFetchSavedFiles, runGuard);
  let s =
    o === e.webFetchSavedFiles
      ? e
      : {
          ...e,
          webFetchSavedFiles: o,
        };
  return n ? s : i(s);
}
//@ chunk-bhxaz9j0.js:1560-1766 placement
function mergeSavedFiles(webFetchSavedFiles, r) {
  if (!r) return webFetchSavedFiles;
  if (
    webFetchSavedFiles &&
    r.dirs.every((dir) => webFetchSavedFiles.dirs.includes(dir)) &&
    r.paths.every((path) => webFetchSavedFiles.paths.includes(path))
  )
    return webFetchSavedFiles;
  return {
    dirs: uniq([...(webFetchSavedFiles?.dirs ?? []), ...r.dirs]),
    paths: uniq([...(webFetchSavedFiles?.paths ?? []), ...r.paths]),
  };
}
//@ chunk-bhxaz9j0.js:1821-1848 placement
var buffer = Buffer.from("%PDF-");
//@ chunk-bhxaz9j0.js:1848-1904 placement
/**
 * 判断缓冲区是否以给定魔数开头。
 */
function hasBufferPrefix(e) {
  return e.subarray(0, buffer.length).equals(buffer);
}
//@ chunk-bhxaz9j0.js:1904-2035 placement
/**
 * 取 MIME 类型的主体部分（去掉参数），格式合法且不超过 100 字符时返回，否则 undefined。
 */
function normalizeMimeType(e) {
  if (typeof e !== "string") return;
  let trimmed = firstLineOf(e, ";").trim();
  return trimmed.length <= 100 && /^[\w.+-]+\/[\w.+-]+$/.test(trimmed) ? trimmed : undefined;
}
//@ chunk-bhxaz9j0.js:2035-3447 fingerprint = extensionForMimeType (0.77)
/**
 * extensionForMimeType：MIME 类型到文件扩展名（pdf/json/csv/docx/png/…），未知为 bin。
 */
function extensionForMimeType(mimeType) {
  if (!mimeType) return "bin";
  switch (firstLineOf(mimeType, ";").trim().toLowerCase()) {
    case "application/pdf":
      return "pdf";
    case "application/json":
      return "json";
    case "text/csv":
      return "csv";
    case "text/plain":
      return "txt";
    case "text/html":
      return "html";
    case "text/markdown":
      return "md";
    case "application/zip":
      return "zip";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return "pptx";
    case "application/msword":
      return "doc";
    case "application/vnd.ms-excel":
      return "xls";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
      return "wav";
    case "audio/ogg":
      return "ogg";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    case "image/x-icon":
    case "image/vnd.microsoft.icon":
      return "ico";
    case "text/css":
      return "css";
    case "text/javascript":
    case "application/javascript":
      return "js";
    case "application/xml":
    case "text/xml":
      return "xml";
    case "application/manifest+json":
      return "webmanifest";
    case "font/woff2":
    case "application/font-woff2":
      return "woff2";
    case "font/woff":
    case "application/font-woff":
      return "woff";
    case "font/ttf":
      return "ttf";
    case "font/otf":
      return "otf";
    case "application/wasm":
      return "wasm";
    default:
      return "bin";
  }
}
//@ chunk-bhxaz9j0.js:3447-3459 placement
var MAX_PERSIST_BYTES = MAX_PERSIST_BYTES_2;
//@ chunk-bhxaz9j0.js:3459-4258 placement
/**
 * persistBinaryContent：把 MCP 返回的二进制内容按扩展名写入 tool-results 目录（或会话存储），超过持久化上限返回错误；记录 tengu_binary_content_persisted。
 */
async function persistBinaryContent(bytes, mimeType, persistId, i, storage) {
  if (bytes.length > MAX_PERSIST_BYTES)
    return {
      error: `content is ${bytes.length} bytes, over the ${MAX_PERSIST_BYTES} byte persist limit`,
    };
  let s = toolResultStoreOrNull();
  if (s !== undefined) {
    let l = extensionForMimeType(mimeType);
    let f =
      bytes.length > s.maxBytes
        ? null
        : await saveResultSafely(s, {
            leafName: `${persistId}.${l}`,
            data: bytes,
          });
    if (f === null)
      return {
        error: "binary content was not saved",
      };
    recordSavedFilePath(i, f.path);
    logEvent("tengu_binary_content_persisted", {
      sizeBytes: bytes.length,
      ext: fromEnum(l),
    });
    return {
      filepath: f.path,
      size: bytes.length,
      ext: l,
    };
  }
  let u = toolResultsDir();
  if (isStorageV5Enabled() && storage !== undefined) {
    let l = await persistBinaryContentViaStorage(storage, u, bytes, mimeType, persistId, i);
    if (l !== undefined) return l;
  }
  await ensureToolResultsDir(u, storage);
  let d = extensionForMimeType(mimeType);
  let p = join(u, `${persistId}.${d}`);
  try {
    await writeToolResultFile(p, bytes);
  } catch (error) {
    let error_2 = toError(error);
    logForDebugging(`Failed to persist binary content to ${p}: ${error_2.message}`, {
      level: "error",
    });
    return {
      error: error_2.message,
    };
  }
  recordSavedFilePath(i, p);
  logEvent("tengu_binary_content_persisted", {
    sizeBytes: bytes.length,
    ext: fromEnum(d),
  });
  return {
    filepath: p,
    size: bytes.length,
    ext: d,
  };
}
//@ chunk-bhxaz9j0.js:4450-4856 fingerprint = persistBinaryContent (0.608)
/**
 * persistBinaryContentViaStorage：经存储抽象（v5 storage）写二进制文件的分支。
 */
async function persistBinaryContentViaStorage(storage, r, bytes, mimeType, persistId, s) {
  let ext = extensionForMimeType(mimeType);
  let d = `${persistId}.${ext}`;
  let filepath = toolResultsKey(r, d);
  if (filepath === undefined) return;
  let l = join(r, d);
  let f = await storage.write(filepath, bytes, {
    mode: 438 & ~process.umask(),
  });
  if (!f.ok) {
    let err = formatStorageError(f.error);
    logForDebugging(`Failed to persist binary content to ${l}: ${err}`, {
      level: "error",
    });
    return {
      error: `storage write failed (${err})`,
    };
  }
  recordSavedFilePath(s, l);
  logEvent("tengu_binary_content_persisted", {
    sizeBytes: bytes.length,
    ext: fromEnum(ext),
  });
  return {
    filepath: l,
    size: bytes.length,
    ext,
  };
}
//@ chunk-bhxaz9j0.js:4856-4952 fingerprint = getBinaryBlobSavedMessage (1)
/**
 * getBinaryBlobSavedMessage：生成"Binary content (类型, 大小) saved to 路径"说明文本。
 */
function getBinaryBlobSavedMessage(filepath, mimeType, size, sourceDescription) {
  return `${sourceDescription}Binary content (${mimeType || "unknown type"}, ${formatFileSize(size)}) saved to ${filepath}`;
}
//@ chunk-bhxaz9j0.js:4952-5278 placement
function toStoredMcpContent(imageBuffer, mimeType, serverName) {
  let i = toolResultStoreOrNull();
  if (
    firstLineOf(mimeType ?? "", ";")
      .trim()
      .toLowerCase() !== "application/pdf" ||
    !hasBufferPrefix(imageBuffer)
  )
    return;
  if (imageBuffer.length > (i?.inlinePdfBytes?.(serverName) ?? 0))
    return i?.servesTheModelsFiles?.(serverName) === true
      ? {
          type: "text",
          text: pdfTooLargeNotice(imageBuffer.length),
        }
      : undefined;
  return {
    type: "document",
    source: {
      type: "base64",
      media_type: "application/pdf",
      data: imageBuffer.toString("base64"),
    },
  };
}
//@ chunk-bhxaz9j0.js:5278-5457 placement
function pdfTooLargeNotice(e) {
  return `[This PDF (${formatFileSize(e)}) cannot be shown whole in this session. Read it again with the pages parameter, for example pages: "1-5", at most ${MAX_PDF_PAGES_PER_READ} pages per call.]`;
}
//@ chunk-bhxaz9j0.js:5457-5533 placement
var EXTRA_PDF_OMITTED_TEXT = "[Another PDF in this result was left out: only the first is shown.]";
//@ chunk-bhxaz9j0.js:5533-5729 placement
/**
 * 内容中有多个 document 块时只保留第一个，其余替换为说明文字。
 */
function dropExtraDocumentBlocks(content) {
  if (!Array.isArray(content) || count(content, (n) => n.type === "document") < 2) return content;
  let r = false;
  return content.map((n) => {
    if (n.type !== "document" || !r) {
      r ||= n.type === "document";
      return n;
    }
    return {
      type: "text",
      text: EXTRA_PDF_OMITTED_TEXT,
    };
  });
}
//@ chunk-bhxaz9j0.js:5729-5859 placement
/**
 * 二进制内容未能保存时的说明文字（类型与大小）。
 */
function binaryNotSavedNotice(mimeType, r) {
  return `[Binary content (${normalizeMimeType(mimeType) ?? "application/octet-stream"}, ${formatFileSize(r)}) was not kept: it could not be saved.]`;
}
//@ chunk-bhxaz9j0.js:5859-5936 placement
/**
 * 截断部分未能保存时的说明文案。
 */
var TRUNCATED_UNSAVED_TEXT = "[The portion truncated above was not kept: it could not be saved.]";
//@ chunk-bhxaz9j0.js:5936-5945 placement
/**
 * 行提示文本的最大字符数。
 */
var MAX_LINE_HINT_CHARS = 64;
//@ chunk-bhxaz9j0.js:6209-6292 placement
/**
 * 判断某 id 是否在自动编辑归属的链发布集合中。
 */
function hasChainPublishId(toolUseId) {
  return toolUseId !== undefined && getLiveState().autoEditAttribution.chainPublishIds.has(toolUseId);
}
//@ chunk-bhxaz9j0.js:6292-6384 placement
function chainPublishSlot(e) {
  if (e === undefined) return;
  return getLiveState().autoEditAttribution.chainPublishSlots.get(e);
}
//@ chunk-bhxaz9j0.js:6384-6421 placement
/**
 * 判断某 id 是否有链发布槽。
 */
function hasChainPublishSlot(toolUseId) {
  return chainPublishSlot(toolUseId) !== undefined;
}
//@ chunk-bhxaz9j0.js:6421-6517 placement
/**
 * 取走并清除某槽的往返标记。
 */
function takeRoundTripMark(toolUseId) {
  let r = chainPublishSlot(toolUseId);
  let n = {
    roundTrip: r?.roundTrip,
  };
  if (r !== undefined) r.roundTrip = undefined;
  return n;
}
//@ chunk-bhxaz9j0.js:7667-7733 placement
/**
 * 判断某 id 是否有 pipeline 回复来源。
 */
function hasPipelineReplyOrigin(toolUseId) {
  return toolUseId !== undefined && getLiveState().pipelineReplyOrigins.has(toolUseId);
}
//@ chunk-e6aww6q8.js:2145923-2146125 fingerprint = getFormatDescription (1)
/**
 * getFormatDescription：toolResult → Plain text；structuredContent/contentArray → JSON（可带 schema 描述）。
 */
function getFormatDescription(type, schema) {
  switch (type) {
    case "toolResult":
      return "Plain text";
    case "structuredContent":
      return schema ? `JSON with schema: ${schema}` : "JSON";
    case "contentArray":
      return schema ? `JSON array with schema: ${schema}` : "JSON array";
  }
}
//@ chunk-e6aww6q8.js:2146125-2149462 layout
/**
 * getLargeOutputInstructions：大结果已落盘时给模型的说明：结果长度/行数、保存路径与格式；按 JSON、长行、多行三种情况建议 jq / python 切片 / Read offset+limit，并建议在子代理中完整读取后摘要。
 */
function getLargeOutputInstructions(
  rawOutputPath,
  contentLength,
  formatDescription,
  maxBashOutputChars,
  lineStats,
  truncatedAtBytes,
) {
  let w = `Error: result (${lineStats !== undefined ? `${contentLength.toLocaleString()} characters across ${lineStats.count.toLocaleString()} ${lineStats.count === 1 ? "line" : "lines"}` : `${contentLength.toLocaleString()} characters`}) exceeds maximum allowed tokens. Output has been saved to ${rawOutputPath}.
Format: ${formatDescription}
`;
  let L =
    truncatedAtBytes === undefined
      ? ""
      : `
Note: the output exceeded the persist byte limit; the saved file contains only the first ${formatFileSize(truncatedAtBytes)} of it and may end mid-structure (a JSON parse of the whole file can fail). Any line/character counts or parsing recipes above describe the full output, not the truncated file.`;
  let floored = Math.floor(getDefaultFileReadingLimits().maxTokens * 4 * 0.8);
  let q = 8;
  let Z = lineStats !== undefined && lineStats.count > 1 && lineStats.maxLen <= floored;
  let Se = Z ? Math.max(1, Math.floor(floored / (lineStats.maxLen + 8))) : undefined;
  let ke = `first probe the structure (e.g., jq 'type, length, keys?' ${shellQuoteArgs([rawOutputPath])}), then extract slices with jq or python`;
  if (!useSubagentTruncationPrompt()) {
    let Ie;
    let Me;
    if (lineStats === undefined) {
      Ie = `Use jq to make structured queries (find a value, filter by field).
`;
      Me = `- Note: this file is JSON, so a long value (or the whole file) is a single line. ${FILE_READ_TOOL_NAME}'s offset/limit cannot split a line, so reading in chunks works only if every line is short. If a shell tool is available, ${ke}.
`;
    } else if (!Z) {
      Ie = `Search within the file for specific content, and use jq if the content is JSON.
`;
      Me = `- Note: this file's lines are too long for ${FILE_READ_TOOL_NAME}'s offset/limit chunking. If a shell tool is available, slice by character range (e.g. python read()[A:B], dd, or cut -c) instead.
`;
    } else {
      Ie = `Use offset and limit parameters to read specific portions of the file, search within it for specific content, and jq to make structured queries.
`;
      Me = "";
    }
    return (
      w +
      Ie +
      `REQUIREMENTS FOR SUMMARIZATION/ANALYSIS/REVIEW:
` +
      getReadEntireFileRequirements(rawOutputPath, maxBashOutputChars, Me) +
      L
    );
  }
  let we;
  let Ee;
  let Ae;
  if (lineStats === undefined) {
    we = `- For targeted queries (find a value, filter by field): use jq on the file directly.
`;
    Ee = `${ke} \u2014 ${FILE_READ_TOOL_NAME}'s line-based offset/limit will not chunk this file.`;
    Ae = `${rawOutputPath} is ${formatDescription}; probe the structure with jq (type/length/keys), then extract and read the content in full with jq or python, then summarize and quote any key findings verbatim.`;
  } else if (!Z) {
    let Ie = floored.toLocaleString();
    we = `- For targeted searches (find a string): use grep on the file directly.
`;
    let Me = getPlatform() === "windows" ? "python" : "python3";
    let replaced = rawOutputPath.replaceAll("\\", "/").replaceAll("'", "'\\''");
    Ee = `the file's lines are too long for Read's offset/limit. Slice by character range via Bash instead \u2014 e.g. ${Me} -c 'print(open("${replaced}").read()[A:B])' in ~${Ie}-char spans until you have read 100% of it.`;
    Ae = `Slice ${rawOutputPath} in ~${Ie}-char spans via python (read()[A:B]) until you have read all ${contentLength.toLocaleString()} characters, then summarize and quote any key findings verbatim.`;
  } else {
    we = `- For targeted searches (find a line, locate a string): use grep on the file directly.
`;
    Ee = `read ${rawOutputPath} in chunks of ~${Se} lines using offset/limit until you have read 100% of it.`;
    Ae = `Read ${rawOutputPath} in chunks of ~${Se} lines using offset/limit until you have read all ${lineStats.count.toLocaleString()} lines, then summarize and quote any key findings verbatim.`;
  }
  return (
    w +
    we +
    `- For analysis or summarization that requires reading the full content: ${Ee}
- If the ${AGENT} tool is available, do this inside a subagent so the full output stays out of your main context. Give it the instruction above verbatim, and be explicit about what it must return \u2014 e.g. "${Ae}" A vague "summarize this" may lose detail.
` +
    L
  );
}
//@ chunk-e6aww6q8.js:2149462-2150478 fingerprint = getLargeOutputInstructions (0.787)
/**
 * getReadEntireFileRequirements：要求模型分块读完整个文件、遇截断缩小块、说明读了多少、读不了就停止重试。
 */
function getReadEntireFileRequirements(rawOutputPath, maxBashOutputChars, r) {
  let truncationWarning = maxBashOutputChars
    ? `- If you receive truncation warnings when reading the file ("[N lines truncated]"), reduce the chunk size until you have read 100% of the content without truncation ***DO NOT PROCEED UNTIL YOU HAVE DONE THIS***. Bash output is limited to ${maxBashOutputChars.toLocaleString()} chars.
`
    : `- If you receive truncation warnings when reading the file, reduce the chunk size until you have read 100% of the content without truncation.
`;
  return (
    `- You MUST read the content from the file at ${rawOutputPath} in sequential chunks until 100% of the content has been read.
` +
    r +
    truncationWarning +
    `- Before producing ANY summary or analysis, you MUST explicitly describe what portion of the content you have read. ***If you did not read the entire content, you MUST explicitly state this.***
- If after a few attempts you cannot read the file (file not found, lines too long for Read's offset/limit, no shell access), STOP retrying. Summarize what you were able to read, explicitly state which portion you could not read and why, and proceed.
`
  );
}
//@ chunk-e6aww6q8.js:2150478-2150802 fingerprint = isBinaryContentType (1)
/**
 * isBinaryContentType：text/*、JSON、XML、JS、表单编码之外的 content-type 视为二进制。
 */
function isBinaryContentType(contentType) {
  if (!contentType) return false;
  let mt = firstLineOf(contentType, ";").trim().toLowerCase();
  if (mt.startsWith("text/")) return false;
  if (mt.endsWith("+json") || mt === "application/json") return false;
  if (mt.endsWith("+xml") || mt === "application/xml") return false;
  if (mt.startsWith("application/javascript")) return false;
  if (mt === "application/x-www-form-urlencoded") return false;
  return true;
}
export {
  extensionForMimeType,
  persistBinaryContent,
  defaultToolResultsStorage,
  toStoredMcpContent,
  binaryNotSavedNotice,
  getBinaryBlobSavedMessage,
  dropExtraDocumentBlocks,
  getFormatDescription,
  getLargeOutputInstructions,
  withWebFetchSavedFiles,
  recordSavedFilePath,
  isBinaryContentType,
  normalizeMimeType,
  hasChainPublishId,
  hasChainPublishSlot,
  takeRoundTripMark,
  MAX_LINE_HINT_CHARS,
  hasPipelineReplyOrigin,
  MAX_PERSIST_BYTES,
  TRUNCATED_UNSAVED_TEXT,
  forgetSavedFilePath,
  hasBufferPrefix,
};
