/**
 * utils/mcpOutputStorage.ts
 *
 * 已有模块；g2 补充 MCP 内容保存
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mcpOutputStorage.ts
 * pieces: chunk-1jwzj2da.js (1), chunk-5xgkngpb.js (4), chunk-qwkyjqpg.js (19)
 * attribution: placement 17, fingerprint 6, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { firstLineOf } from "./stringUtils.js";
import { MAX_PERSIST_BYTES as MAX_PERSIST_BYTES_2, MAX_PDF_PAGES_PER_READ } from "./mediaLimits.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { toError } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { formatFileSize } from "./format.js";
import { countWhere } from "./collections.js";
import { getDefaultFileReadingLimits } from "../tools/FileReadTool/limits.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";
import { useSubagentTruncationPrompt } from "../services/mcp/client.js";
import { READ } from "../tools/FileReadTool/constants.js";
import { getPlatform } from "./platform.js";
import { AGENT } from "../tools/AgentTool/constants.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-1jwzj2da.js:3534-3543 placement
/**
 * 行提示文本的最大字符数。
 */
var MAX_LINE_HINT_CHARS = 64;
//@ chunk-qwkyjqpg.js:639-725 placement
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
//@ chunk-qwkyjqpg.js:725-845 placement
/**
 * 把保存的文件路径及其目录记录到集合中（去重）。
 */
function recordSavedFilePath(savedFiles, filePath) {
  if (!savedFiles) return;
  let dir = dirname(filePath);
  if (!savedFiles.dirs.includes(dir)) savedFiles.dirs.push(dir);
  if (!savedFiles.paths.includes(filePath)) savedFiles.paths.push(filePath);
}
//@ chunk-qwkyjqpg.js:845-911 placement
/**
 * 从已保存文件集合中移除某路径。
 */
function forgetSavedFilePath(savedFiles, filePath) {
  if (!savedFiles) return;
  savedFiles.paths = savedFiles.paths.filter((path) => path !== filePath);
}
//@ chunk-qwkyjqpg.js:911-1038 placement
/**
 * 把新保存的文件并入状态的 webFetchSavedFiles；无变化时直接用原状态，否则按需经更新函数提交。
 */
function withWebFetchSavedFiles(context, runGuard, isAsync, continueWith) {
  let merged = mergeSavedFiles(context.webFetchSavedFiles, runGuard);
  let nextContext =
    merged === context.webFetchSavedFiles
      ? context
      : {
          ...context,
          webFetchSavedFiles: merged,
        };
  return isAsync ? nextContext : continueWith(nextContext);
}
//@ chunk-qwkyjqpg.js:1038-1244 placement
function mergeSavedFiles(webFetchSavedFiles, added) {
  if (!added) return webFetchSavedFiles;
  if (
    webFetchSavedFiles &&
    added.dirs.every((dir) => webFetchSavedFiles.dirs.includes(dir)) &&
    added.paths.every((path) => webFetchSavedFiles.paths.includes(path))
  )
    return webFetchSavedFiles;
  return {
    dirs: normalizeCaseForComparison_2([...(webFetchSavedFiles?.dirs ?? []), ...added.dirs]),
    paths: normalizeCaseForComparison_2([...(webFetchSavedFiles?.paths ?? []), ...added.paths]),
  };
}
//@ chunk-qwkyjqpg.js:1299-1326 placement
var buffer; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qwkyjqpg.js:1299", () => {
  buffer = Buffer.from("%PDF-");
});
//@ chunk-qwkyjqpg.js:1326-1382 placement
/**
 * 判断缓冲区是否以给定魔数开头。
 */
function hasBufferPrefix(data) {
  return data.subarray(0, buffer.length).equals(buffer);
}
//@ chunk-qwkyjqpg.js:1382-1513 placement
/**
 * 取 MIME 类型的主体部分（去掉参数），格式合法且不超过 100 字符时返回，否则 undefined。
 */
function normalizeMimeType(rawMimeType) {
  if (typeof rawMimeType !== "string") return;
  let trimmed = firstLineOf(rawMimeType, ";").trim();
  return trimmed.length <= 100 && /^[\w.+-]+\/[\w.+-]+$/.test(trimmed) ? trimmed : undefined;
}
//@ chunk-qwkyjqpg.js:1513-2925 fingerprint (2.1.88 match: extensionForMimeType, 0.769)
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
//@ chunk-qwkyjqpg.js:2925-2937 placement
var MAX_PERSIST_BYTES = MAX_PERSIST_BYTES_2;
//@ chunk-qwkyjqpg.js:2937-3736 placement
/**
 * persistBinaryContent：把 MCP 返回的二进制内容按扩展名写入 tool-results 目录（或会话存储），超过持久化上限返回错误；记录 tengu_binary_content_persisted。
 */
async function persistBinaryContent(bytes, mimeType, persistId, savedFiles, storage) {
  if (bytes.length > MAX_PERSIST_BYTES)
    return {
      error: `content is ${bytes.length} bytes, over the ${MAX_PERSIST_BYTES} byte persist limit`,
    };
  let resultStore = toolResultStoreOrNull();
  if (resultStore !== undefined) {
    let ext = extensionForMimeType(mimeType);
    let saved =
      bytes.length > resultStore.maxBytes
        ? null
        : await saveResultSafely(resultStore, {
            leafName: `${persistId}.${ext}`,
            data: bytes,
          });
    if (saved === null)
      return {
        error: "binary content was not saved",
      };
    recordSavedFilePath(savedFiles, saved.path);
    logEvent("tengu_binary_content_persisted", {
      sizeBytes: bytes.length,
      ext: fromEnum(ext),
    });
    return {
      filepath: saved.path,
      size: bytes.length,
      ext,
    };
  }
  let resultsDir = toolResultsDir();
  if (isStorageV5Enabled() && storage !== undefined) {
    let storageResult = await persistBinaryContentViaStorage(
      storage,
      resultsDir,
      bytes,
      mimeType,
      persistId,
      savedFiles,
    );
    if (storageResult !== undefined) return storageResult;
  }
  await ensureToolResultsDir(resultsDir, storage);
  let ext = extensionForMimeType(mimeType);
  let filePath = join(resultsDir, `${persistId}.${ext}`);
  try {
    await writeToolResultFile(filePath, bytes);
  } catch (error) {
    let error_2 = toError(error);
    logForDebugging(`Failed to persist binary content to ${filePath}: ${error_2.message}`, {
      level: "error",
    });
    return {
      error: error_2.message,
    };
  }
  recordSavedFilePath(savedFiles, filePath);
  logEvent("tengu_binary_content_persisted", {
    sizeBytes: bytes.length,
    ext: fromEnum(ext),
  });
  return {
    filepath: filePath,
    size: bytes.length,
    ext,
  };
}
//@ chunk-qwkyjqpg.js:3928-4334 fingerprint (2.1.88 match: persistBinaryContent, 0.607)
/**
 * persistBinaryContentViaStorage：经存储抽象（v5 storage）写二进制文件的分支。
 */
async function persistBinaryContentViaStorage(storage, resultsDir, bytes, mimeType, persistId, savedFiles) {
  let ext = extensionForMimeType(mimeType);
  let leafName = `${persistId}.${ext}`;
  let filepath = toolResultsKey(resultsDir, leafName);
  if (filepath === undefined) return;
  let displayPath = join(resultsDir, leafName);
  let writeResult = await storage.write(filepath, bytes, {
    mode: 438 & ~process.umask(),
  });
  if (!writeResult.ok) {
    let err = formatStorageError(writeResult.error);
    logForDebugging(`Failed to persist binary content to ${displayPath}: ${err}`, {
      level: "error",
    });
    return {
      error: `storage write failed (${err})`,
    };
  }
  recordSavedFilePath(savedFiles, displayPath);
  logEvent("tengu_binary_content_persisted", {
    sizeBytes: bytes.length,
    ext: fromEnum(ext),
  });
  return {
    filepath: displayPath,
    size: bytes.length,
    ext,
  };
}
//@ chunk-qwkyjqpg.js:4334-4430 fingerprint (2.1.88 match: getBinaryBlobSavedMessage, 1)
/**
 * getBinaryBlobSavedMessage：生成"Binary content (类型, 大小) saved to 路径"说明文本。
 */
function getBinaryBlobSavedMessage(filepath, mimeType, size, sourceDescription) {
  return `${sourceDescription}Binary content (${mimeType || "unknown type"}, ${formatFileSize(size)}) saved to ${filepath}`;
}
//@ chunk-qwkyjqpg.js:4430-4756 placement
function toStoredMcpContent(imageBuffer, mimeType, serverName) {
  let resultStore = toolResultStoreOrNull();
  if (
    firstLineOf(mimeType ?? "", ";")
      .trim()
      .toLowerCase() !== "application/pdf" ||
    !hasBufferPrefix(imageBuffer)
  )
    return;
  if (imageBuffer.length > (resultStore?.inlinePdfBytes?.(serverName) ?? 0))
    return resultStore?.servesTheModelsFiles?.(serverName) === true
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
//@ chunk-qwkyjqpg.js:4756-4935 placement
function pdfTooLargeNotice(byteLength) {
  return `[This PDF (${formatFileSize(byteLength)}) cannot be shown whole in this session. Read it again with the pages parameter, for example pages: "1-5", at most ${MAX_PDF_PAGES_PER_READ} pages per call.]`;
}
//@ chunk-qwkyjqpg.js:4935-5011 placement
var EXTRA_PDF_OMITTED_TEXT = "[Another PDF in this result was left out: only the first is shown.]";
//@ chunk-qwkyjqpg.js:5011-5207 placement
/**
 * 内容中有多个 document 块时只保留第一个，其余替换为说明文字。
 */
function dropExtraDocumentBlocks(content) {
  if (!Array.isArray(content) || countWhere(content, (block) => block.type === "document") < 2)
    return content;
  let seenDocument = false;
  return content.map((block) => {
    if (block.type !== "document" || !seenDocument) {
      seenDocument ||= block.type === "document";
      return block;
    }
    return {
      type: "text",
      text: EXTRA_PDF_OMITTED_TEXT,
    };
  });
}
//@ chunk-qwkyjqpg.js:5207-5337 placement
/**
 * 二进制内容未能保存时的说明文字（类型与大小）。
 */
function binaryNotSavedNotice(mimeType, byteLength) {
  return `[Binary content (${normalizeMimeType(mimeType) ?? "application/octet-stream"}, ${formatFileSize(byteLength)}) was not kept: it could not be saved.]`;
}
//@ chunk-qwkyjqpg.js:5337-5414 placement
/**
 * 截断部分未能保存时的说明文案。
 */
var TRUNCATED_UNSAVED_TEXT = "[The portion truncated above was not kept: it could not be saved.]";
//@ chunk-5xgkngpb.js:2199305-2199507 fingerprint (2.1.88 match: getFormatDescription, 1)
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
//@ chunk-5xgkngpb.js:2199507-2202848 layout
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
  let header = `Error: result (${lineStats !== undefined ? `${contentLength.toLocaleString()} characters across ${lineStats.count.toLocaleString()} ${lineStats.count === 1 ? "line" : "lines"}` : `${contentLength.toLocaleString()} characters`}) exceeds maximum allowed tokens. Output has been saved to ${rawOutputPath}.
Format: ${formatDescription}
`;
  let truncationNote =
    truncatedAtBytes === undefined
      ? ""
      : `
Note: the output exceeded the persist byte limit; the saved file contains only the first ${formatFileSize(truncatedAtBytes)} of it and may end mid-structure (a JSON parse of the whole file can fail). Any line/character counts or parsing recipes above describe the full output, not the truncated file.`;
  let floored = Math.floor(getDefaultFileReadingLimits().maxTokens * 4 * 0.8);
  let lineOverhead = 8;
  let linesChunkable = lineStats !== undefined && lineStats.count > 1 && lineStats.maxLen <= floored;
  let linesPerChunk = linesChunkable ? Math.max(1, Math.floor(floored / (lineStats.maxLen + 8))) : undefined;
  let jqProbeHint = `first probe the structure (e.g., jq 'type, length, keys?' ${shellQuoteArgs([rawOutputPath])}), then extract slices with jq or python`;
  if (!useSubagentTruncationPrompt()) {
    let searchAdvice;
    let chunkingNote;
    if (lineStats === undefined) {
      searchAdvice = `Use jq to make structured queries (find a value, filter by field).
`;
      chunkingNote = `- Note: this file is JSON, so a long value (or the whole file) is a single line. ${READ}'s offset/limit cannot split a line, so reading in chunks works only if every line is short. If a shell tool is available, ${jqProbeHint}.
`;
    } else if (!linesChunkable) {
      searchAdvice = `Search within the file for specific content, and use jq if the content is JSON.
`;
      chunkingNote = `- Note: this file's lines are too long for ${READ}'s offset/limit chunking. If a shell tool is available, slice by character range (e.g. python read()[A:B], dd, or cut -c) instead.
`;
    } else {
      searchAdvice = `Use offset and limit parameters to read specific portions of the file, search within it for specific content, and jq to make structured queries.
`;
      chunkingNote = "";
    }
    return (
      header +
      searchAdvice +
      `REQUIREMENTS FOR SUMMARIZATION/ANALYSIS/REVIEW:
` +
      getReadEntireFileRequirements(rawOutputPath, maxBashOutputChars, chunkingNote) +
      truncationNote
    );
  }
  let searchAdviceAlternate;
  let readAdvice;
  let subagentInstruction;
  if (lineStats === undefined) {
    searchAdviceAlternate = `- For targeted queries (find a value, filter by field): use jq on the file directly.
`;
    readAdvice = `${jqProbeHint} \u2014 ${READ}'s line-based offset/limit will not chunk this file.`;
    subagentInstruction = `${rawOutputPath} is ${formatDescription}; probe the structure with jq (type/length/keys), then extract and read the content in full with jq or python, then summarize and quote any key findings verbatim.`;
  } else if (!linesChunkable) {
    let spanChars = floored.toLocaleString();
    searchAdviceAlternate = `- For targeted searches (find a string): use grep on the file directly.
`;
    let pythonCommand = getPlatform() === "windows" ? "python" : "python3";
    let replaced = rawOutputPath.replaceAll("\\", "/").replaceAll("'", "'\\''");
    readAdvice = `the file's lines are too long for Read's offset/limit. Slice by character range via Bash instead \u2014 e.g. ${pythonCommand} -c 'print(open("${replaced}").read()[A:B])' in ~${spanChars}-char spans until you have read 100% of it.`;
    subagentInstruction = `Slice ${rawOutputPath} in ~${spanChars}-char spans via python (read()[A:B]) until you have read all ${contentLength.toLocaleString()} characters, then summarize and quote any key findings verbatim.`;
  } else {
    searchAdviceAlternate = `- For targeted searches (find a line, locate a string): use grep on the file directly.
`;
    readAdvice = `read ${rawOutputPath} in chunks of ~${linesPerChunk} lines using offset/limit until you have read 100% of it.`;
    subagentInstruction = `Read ${rawOutputPath} in chunks of ~${linesPerChunk} lines using offset/limit until you have read all ${lineStats.count.toLocaleString()} lines, then summarize and quote any key findings verbatim.`;
  }
  return (
    header +
    searchAdviceAlternate +
    `- For analysis or summarization that requires reading the full content: ${readAdvice}
- If the ${AGENT} tool is available, do this inside a subagent so the full output stays out of your main context. Give it the instruction above verbatim, and be explicit about what it must return \u2014 e.g. "${subagentInstruction}" A vague "summarize this" may lose detail.
` +
    truncationNote
  );
}
//@ chunk-5xgkngpb.js:2202848-2203864 fingerprint (2.1.88 match: getLargeOutputInstructions, 0.787)
/**
 * getReadEntireFileRequirements：要求模型分块读完整个文件、遇截断缩小块、说明读了多少、读不了就停止重试。
 */
function getReadEntireFileRequirements(rawOutputPath, maxBashOutputChars, noShellAccessNote) {
  let truncationWarning = maxBashOutputChars
    ? `- If you receive truncation warnings when reading the file ("[N lines truncated]"), reduce the chunk size until you have read 100% of the content without truncation ***DO NOT PROCEED UNTIL YOU HAVE DONE THIS***. Bash output is limited to ${maxBashOutputChars.toLocaleString()} chars.
`
    : `- If you receive truncation warnings when reading the file, reduce the chunk size until you have read 100% of the content without truncation.
`;
  return (
    `- You MUST read the content from the file at ${rawOutputPath} in sequential chunks until 100% of the content has been read.
` +
    noShellAccessNote +
    truncationWarning +
    `- Before producing ANY summary or analysis, you MUST explicitly describe what portion of the content you have read. ***If you did not read the entire content, you MUST explicitly state this.***
- If after a few attempts you cannot read the file (file not found, lines too long for Read's offset/limit, no shell access), STOP retrying. Summarize what you were able to read, explicitly state which portion you could not read and why, and proceed.
`
  );
}
//@ chunk-5xgkngpb.js:2203864-2204188 fingerprint (2.1.88 match: isBinaryContentType, 1)
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
  withWebFetchSavedFiles,
  defaultToolResultsStorage,
  toStoredMcpContent,
  persistBinaryContent,
  binaryNotSavedNotice,
  getBinaryBlobSavedMessage,
  dropExtraDocumentBlocks,
  getFormatDescription,
  getLargeOutputInstructions,
  MAX_LINE_HINT_CHARS,
  extensionForMimeType,
  recordSavedFilePath,
  isBinaryContentType,
  hasBufferPrefix,
  normalizeMimeType,
  MAX_PERSIST_BYTES,
  TRUNCATED_UNSAVED_TEXT,
  forgetSavedFilePath,
};
