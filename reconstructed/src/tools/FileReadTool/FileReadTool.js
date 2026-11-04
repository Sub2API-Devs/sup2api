/**
 * tools/FileReadTool/FileReadTool.ts
 *
 * Read 工具：文本/图片/PDF/notebook 读取、token 与字节上限、allow_large、去重、设备文件拦截
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileReadTool/FileReadTool.ts
 * pieces: chunk-847rdpmn.js (1), chunk-e6aww6q8.js (47), chunk-mvvq2nx1.js (1), chunk-q7gky7a4.js (1), chunk-qg0af0yq.js (3)
 * attribution: placement 9, layout 28, fingerprint 8, file-local 2, facade-exports 6
 */
import "path";
import * as pathModule_2 from "path";
import "path";
import { posix, extname, win32 } from "path";
import { readdir, readFile, open } from "fs/promises";
import { constants } from "fs";
import { consumePermissionStash } from "../../utils/fsSafety/atomicWriteStaging.js";
import {
  walkPermissionCheckPaths,
  permissionCheckSpellings,
  getFsImplementation,
  readHandleUpTo,
} from "../../utils/fsOperations.js";
import { encodeControlChars } from "../../utils/sanitization.js";
import { unresolvablePathMessage } from "../../utils/invisibleChars.js";
import { getToolResultFromCell, readNotebook, NOTEBOOK_TOO_LARGE_HINT } from "../../utils/notebook.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { env } from "../../utils/env.js";
import {
  MAX_PDF_PAGES_PER_READ as MAX_PDF_PAGES_PER_READ_2,
  mediaLimitsForRoute,
  MODEL_COPY_IMAGE_BYTES,
  MAX_PDF_PAGES_PER_TURN,
  imageTileCount,
} from "../../utils/mediaLimits.js";
import {
  FILE_READ_TOOL_NAME,
  isImageOrPdfExtension,
  IMAGE_EXTENSIONS,
  ALLOW_LARGE_PARAM,
} from "./constants.js";
import { isDocumentExtension, isNotClaude3Model } from "../../utils/model/claude3Models.js";
import { parsePDFPageRange } from "../../utils/pdfUtils.js";
import {
  lastExistingIdentity,
  openReadBoundToApproval,
  rethrowWithPath,
} from "../../utils/fsSafety/pathRevalidation.js";
import { getClaudeConfigDirOrNull } from "../../utils/envUtils.js";
import {
  imageMediaTypeSchema,
  sniffImageMediaType,
  fileReadInputSchema,
} from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import {
  discriminatedUnion,
  objectSchema,
  literal,
  stringSchema,
  numberSchema,
  booleanSchema,
  array,
  anySchema,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { INVALID } from "../../../vendor/zod/v4/core/core.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { escapeXmlInline, isRemoteOnlyCheck } from "../../utils/permissions/checkRegistry.js";
import { clipText } from "../../remote/tools/protocolSchemas.js";
import { plural, countCharInString } from "../../utils/stringUtils.js";
import {
  hasNoUserPromptSinceCompact,
  buildReadTruncationNotice,
  createUserMessage,
} from "../../utils/messages.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  DESCRIPTION,
  renderPromptTemplate,
  TAB_AWARE_LINE_FORMAT_INSTRUCTION,
  LINE_FORMAT_INSTRUCTION,
  getSeededFileUnchangedMessage,
  getFileUnchangedMessage,
  TRUNCATED_PARTIAL_VIEW_PREFIX,
} from "./prompt.js";
import {
  isTabReadSeparationEnabled,
  setCachedReadingLimit,
  getDefaultFileReadingLimits,
  ALLOW_LARGE_UNAVAILABLE_HINT,
  ALLOW_LARGE_NO_ROOM_HINT,
  ALLOW_LARGE_RETRY_HINT,
  MAX_CHARS_PER_TOKEN,
} from "./limits.js";
import { normalizeReadInputAliases } from "./inputAliases.js";
import {
  createImageMetadataText,
  maybeResizeAndDownsampleImageBlock,
  maybeResizeAndDownsampleImageBuffer,
  compressToJpegUnderBytes,
  detectImageFormatFromBuffer,
  ImageResizeError,
  isUnknownImageErrorType,
  classifyImageErrorCode,
  compressImageBufferWithTokenLimit,
  loadImageDecoder,
} from "../../utils/imageResizer.js";
import {
  userFacingName as userFacingName_3,
  getToolUseSummary as getToolUseSummary_5,
  getAgentOutputTaskId,
} from "./UI.js";
import { remoteRoutingCandidate } from "../../utils/remoteTools/toolHostRouting.js";
import {
  HOST_TOOL_INPUT_FIELD,
  hostContextMeta,
  hasHostField,
  canRunToolsOnThisMachine,
  hostFieldNotForwardedMessage,
} from "../../bridge/deviceRegistration.js";
import { getCwd } from "../../utils/cwd.js";
import { expandStablePath, isNotebookPath } from "../../utils/path.js";
import {
  matchesPathRule,
  checkReadPermissionForTool,
  matchingRuleForInput,
} from "../../utils/permissions/filesystem.js";
import { getPlatform } from "../../utils/platform.js";
import { rejectNullBytes, rejectTrailingWhitespace } from "../../utils/filePathValidation.js";
import { DENIED_DIRECTORY_ERROR } from "../FileEditTool/constants.js";
import { isUncOrDevicePath } from "../../utils/pathClassification.js";
import { hasBinaryExtension } from "../../constants/files.js";
import { formatFileSize } from "../../utils/format.js";
import {
  addLineNumbers,
  formatNumberedLine,
  getFileModificationTimeAsync,
  findSimilarFile,
  normalizePathForComparison,
  FILE_NOT_FOUND_CWD_NOTE,
} from "../../utils/file.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  isENOENT,
  withTelemetryMessage,
  AbortError as AbortError_2,
  errorMessage,
} from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../../services/analytics/safeMetadata.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { discoverSkillsForPath } from "../../skills/loadSkillsDir.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { getFileExtensionForAnalytics } from "../../services/analytics/metadata.js";
import { separateCopyHint } from "../../utils/remoteTools/folderSync.js";
import { memoryFreshnessNote } from "../../memdir/memoryAge.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { statViaStorage, classifySavedOutputPath } from "./savedOutputPaths.js";
import {
  getTokenCountFromUsage as getTokenCountFromUsage_5,
  getTokenCountFromUsage_2 as getTokenCountFromUsage_2_2,
} from "../../utils/messages/usageAndStopReason.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import {
  FileTooLargeError,
  SelectedRangeTooLargeError,
  readFileInRange,
} from "../../utils/readFileInRange.js";
import {
  roughTokenCountEstimationForFileType,
  countTextTokensWithAPI,
} from "../../services/tokenEstimation.js";
import { timeAttachment } from "../../utils/attachments/attachmentTiming.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import {
  isPdftoppmAvailable,
  extractPDFPages,
  getPdfPageCount,
  describePdfinfoFailure,
  readPDF,
} from "../../utils/pdf.js";
import { isTaskOutputFilePath, bindTaskOutputForRead } from "../../utils/task/diskOutput.js";
import { isInstructionReadRestricted } from "../../utils/instructionFileAccess.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logFileOperation } from "../../utils/fileOperationAnalytics.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { readPdfExtractedPages } from "./pdfPages.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { consumeClaudeCodeHints } from "../../utils/claudeCodeHints.js";
import { GREP_TOOL_NAME } from "../GrepTool/prompt.js";
import { isAutoMemFilePath } from "../../utils/memoryFileDetection.js";
import { fileReadEncodingNote } from "../FileEditTool/fileStateErrors.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { MAX_CHROME_UPLOAD_BYTES } from "../../utils/claudeInChrome/fileUpload.js";
import { readHandleBounded } from "../../utils/fsSafety/boundOpen.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { detectHtmlDocument, parseWebpHeader } from "../../utils/imageFormats.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { webpMaxBytesIfOn, chooseImageEncoding } from "../../utils/imageWebp.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-847rdpmn.js:4662-4810 placement
/**
 * 读取权限检查时记录的路径拼写（无记录时重新遍历），并标出是否有未解析的路径。
 */
function readPermissionSpellings(session, filePath) {
  let stashedSpellings = consumePermissionStash(session, filePath, "read");
  if (stashedSpellings !== undefined)
    return {
      spellings: stashedSpellings,
      unresolved: false,
    };
  let walkResult = walkPermissionCheckPaths(filePath);
  return {
    spellings: permissionCheckSpellings(walkResult),
    unresolved: walkResult.unresolved,
  };
}
//@ chunk-qg0af0yq.js:8349-8629 placement
/**
 * 任一路径拼写是设备/进程文件（/dev/zero、/proc/*\/environ 等）时返回拒绝文案；无法解析路径时也拒绝。
 */
function getDevicePathRefusal(filePath, spellingsInfo) {
  if (spellingsInfo.spellings.some((spelling) => isBlockedDevicePath(spelling)))
    return `Cannot read '${encodeControlChars(filePath)}': this path names a device or process file that this tool does not read.`;
  return spellingsInfo.unresolved
    ? `${unresolvablePathMessage(filePath)}, so it cannot be told apart from a device or process file that this tool does not read.`
    : undefined;
}
//@ chunk-qg0af0yq.js:8629-9202 fingerprint = BLOCKED_DEVICE_PATHS (0.808)
/**
 * 被拒读的设备路径集合（/dev/zero、/dev/random、/dev/stdin、/dev/tty、/proc/kmsg、/dev/fd/0-2 等）及相关正则。
 */
var BLOCKED_DEVICE_PATHS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PROC_ROOT_PREFIX_RE;
var PROC_TASK_PREFIX_RE;
var PROC_SELF_CWD_RE;
var PROC_FD_TRAVERSAL_RE;
var OTHER_PROCESS_FD_RE;
var TTY_DEVICE_RE;
var MAX_PROC_PREFIX_STRIP_ROUNDS;
deferInit("chunk-qg0af0yq.js:8629", () => {
  BLOCKED_DEVICE_PATHS = new Set([
    "/dev/zero",
    "/dev/random",
    "/dev/urandom",
    "/dev/full",
    "/dev/stdin",
    "/dev/tty",
    "/dev/console",
    "/proc/kmsg",
    "/dev/stdout",
    "/dev/stderr",
    "/dev/fd/0",
    "/dev/fd/1",
    "/dev/fd/2",
  ]);
  PROC_ROOT_PREFIX_RE = /^\/proc\/[^/]+\/root(?=\/)/;
  PROC_TASK_PREFIX_RE = /^(\/proc\/[^/]+)\/task\/[^/]+(?=\/)/;
  PROC_SELF_CWD_RE = new RegExp(`^/proc/(?:self|${process.pid})/cwd(?=/)`);
  PROC_FD_TRAVERSAL_RE =
    /^\/proc\/[^/]+\/cwd\/|^\/proc\/[^/]+\/fd\/\d+\/|^\/dev\/fd\/\d+\/|^\/dev\/(?:stdin|stdout|stderr)\/|^\/proc\/[^/]+\/map_files(\/|$)/;
  OTHER_PROCESS_FD_RE = new RegExp(`^/proc/(?!self/|${process.pid}/)[^/]+/fd/\\d+$`);
  TTY_DEVICE_RE = /^\/dev\/(?:pts\/(?:\d+|ptmx)|ptmx|tty[^/]*)$/;
  MAX_PROC_PREFIX_STRIP_ROUNDS = 8;
});
//@ chunk-qg0af0yq.js:9202-9673 fingerprint = isBlockedDevicePath (0.964)
/**
 * 路径是否为会阻塞或泄露的设备/进程文件：规范化后匹配黑名单、tty、fd 穿越、其他进程 fd、/proc/<pid>/(environ|cmdline|mem|...)，并剥离 /proc/<pid>/root、task 前缀循环判断（最多 8 轮）。
 */
function isBlockedDevicePath(filePath) {
  let normalized = posix.normalize(filePath);
  for (let i = 0; ; i++) {
    if (PROC_SELF_CWD_RE.test(normalized))
      normalized = posix.normalize(normalized.replace(PROC_SELF_CWD_RE, () => getFsImplementation().cwd()));
    if (
      BLOCKED_DEVICE_PATHS.has(normalized) ||
      TTY_DEVICE_RE.test(normalized) ||
      PROC_FD_TRAVERSAL_RE.test(normalized) ||
      OTHER_PROCESS_FD_RE.test(normalized) ||
      (normalized.startsWith("/proc/") &&
        (normalized.endsWith("/fd/0") || normalized.endsWith("/fd/1") || normalized.endsWith("/fd/2"))) ||
      /^\/proc\/[^/]+\/(environ|cmdline|auxv|maps|smaps|smaps_rollup|numa_maps|pagemap|mem|stat|statm|status|syscall|stack)$/.test(
        normalized,
      )
    )
      return true;
    let replaced = normalized.replace(PROC_ROOT_PREFIX_RE, "").replace(PROC_TASK_PREFIX_RE, "$1");
    if (replaced === normalized) return false;
    if (i >= MAX_PROC_PREFIX_STRIP_ROUNDS) return true;
    normalized = replaced;
  }
}
//@ chunk-q7gky7a4.js:813-1174 facade-exports = MaxFileReadTokenExceededError (0.91)
/**
 * 文件内容 token 数超过上限的错误（带 tokenCount/maxTokens，消息建议用 offset/limit 或搜索）。
 */
class MaxFileReadTokenExceededError extends Error {
  tokenCount;
  maxTokens;
  constructor(tokenCount, maxTokens, allowLargeHint = "") {
    super(
      `File content (${tokenCount} tokens) exceeds maximum allowed tokens (${maxTokens}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.${allowLargeHint}`,
    );
    this.tokenCount = tokenCount;
    this.maxTokens = maxTokens;
    this.name = "MaxFileReadTokenExceededError";
  }
}
//@ chunk-mvvq2nx1.js:7393-7497 fingerprint = IMAGE_EXTENSIONS (0.878)
/**
 * 把图片格式映射为编码输出格式：jpg/jpeg 为 jpeg、webp 为 webp、其余为 png。
 */
function toEncoderFormat(mimeSubtype) {
  switch (mimeSubtype) {
    case "jpeg":
    case "jpg":
      return "jpeg";
    case "webp":
      return "webp";
    default:
      return "png";
  }
}
//@ chunk-e6aww6q8.js:3155422-3155659 placement
function buildNotebookToolResult(cells, toolUseId) {
  let flattened = cells.flatMap(getToolResultFromCell);
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content: flattened.reduce((acc, cellBlock) => {
      if (acc.length === 0) return [cellBlock];
      let last = acc.at(-1);
      if (last && last.type === "text" && cellBlock.type === "text") {
        last.text +=
          `
` + cellBlock.text;
        return acc;
      }
      acc.push(cellBlock);
      return acc;
    }, []),
  };
}
//@ chunk-e6aww6q8.js:3158356-3158427 placement
/**
 * 启用 PDF 页数限制的消息 token 阈值（167000）与每轮默认页数上限 300。
 */
var PDF_MAX_TOKENS_THRESHOLD; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var DEFAULT_MAX_PDF_PAGES_PER_TURN;
var pdfPageStateByRoot;
deferInit("chunk-e6aww6q8.js:3158356", () => {
  PDF_MAX_TOKENS_THRESHOLD = 167000;
  DEFAULT_MAX_PDF_PAGES_PER_TURN = 300;
  pdfPageStateByRoot = new SessionRootSlot(() => ({
    last: undefined,
    pagesThisTurn: 0,
  }));
});
//@ chunk-e6aww6q8.js:3158427-3158462 placement
/**
 * 记录最近一次 PDF 页数限制，供本轮页数统计使用。
 */
function rememberPdfPageLimits(session, last) {
  pdfPageStateByRoot.of(session).last = last;
}
//@ chunk-e6aww6q8.js:3158462-3158528 placement
/**
 * 把本轮已读 PDF 页数清零（新回合开始时）。
 */
function resetPdfPagesThisTurn(session) {
  let pdfState = pdfPageStateByRoot.peek(session);
  if (pdfState !== undefined) pdfState.pagesThisTurn = 0;
}
//@ chunk-e6aww6q8.js:3158528-3158597 placement
/**
 * 把本次读取的 PDF 页数累加到本轮计数。
 */
function addPdfPagesThisTurn(session, pageCount) {
  let pdfState = pdfPageStateByRoot.peek(session);
  if (pdfState !== undefined) pdfState.pagesThisTurn += pageCount;
}
//@ chunk-e6aww6q8.js:3158597-3158953 placement
/**
 * PDF 每条消息页数限制启用时返回每消息/每轮的页数上限与已用页数，否则 undefined。
 */
function getPdfPageLimits(session, messages) {
  let pdfState = pdfPageStateByRoot.peek(session);
  let last = pdfState?.last;
  if (
    pdfState === undefined ||
    last === undefined ||
    !last.enabled ||
    !last.enforced ||
    !(last.threshold <= PDF_MAX_TOKENS_THRESHOLD)
  )
    return;
  let pagesPerMessageEnv = env.CLAUDE_CODE_FILE_READ_MAX_PDF_PAGES_PER_MESSAGE;
  if (pagesPerMessageEnv === undefined || pagesPerMessageEnv >= MAX_PDF_PAGES_PER_READ_2) return;
  return {
    pagesPerMessage: pagesPerMessageEnv,
    pagesThisMessage: countPdfPagesInMessages(messages, pagesPerMessageEnv),
    pagesPerTurn: env.CLAUDE_CODE_FILE_READ_MAX_PDF_PAGES_PER_TURN ?? DEFAULT_MAX_PDF_PAGES_PER_TURN,
    pagesThisTurn: pdfState.pagesThisTurn,
  };
}
//@ chunk-e6aww6q8.js:3158953-3159330 placement
/**
 * 统计消息中 Read 工具读取 PDF 指定页的总页数（不超过上限时累加）。
 */
function countPdfPagesInMessages(messages, limit) {
  let pages = 0;
  for (let message of messages ?? [])
    for (let block of message.message.content) {
      if (block.type !== "tool_use" || block.name !== FILE_READ_TOOL_NAME) continue;
      let input = block.input;
      if (
        typeof input !== "object" ||
        input === null ||
        !("pages" in input) ||
        typeof input.pages !== "string" ||
        !("file_path" in input) ||
        typeof input.file_path !== "string" ||
        !isDocumentExtension(extname(input.file_path))
      )
        continue;
      let pdfPageRange = parsePDFPageRange(input.pages);
      let blockPages = pdfPageRange === null ? 0 : pdfPageRange.lastPage - pdfPageRange.firstPage + 1;
      if (pages + blockPages <= limit) pages += blockPages;
    }
  return pages;
}
//@ chunk-e6aww6q8.js:3159330-3159937 layout
/**
 * restoreTransientForRemap：重映射结果时把旧结果里的 PDF 页图/base64 等瞬态字段补回新结果。
 */
function restoreTransientPdfFields(previous, next) {
  if (previous === null || typeof previous !== "object" || next === null || typeof next !== "object")
    return next;
  if (
    !("file" in previous) ||
    !("file" in next) ||
    typeof previous.file !== "object" ||
    previous.file === null ||
    typeof next.file !== "object" ||
    next.file === null
  )
    return next;
  if (previous.type === "parts" && next.type === "parts") {
    if (
      next.pages !== undefined ||
      previous.pages === undefined ||
      next.file.filePath !== previous.file.filePath
    )
      return next;
    return {
      ...next,
      firstPage: next.firstPage ?? previous.firstPage,
      totalPages: next.totalPages ?? previous.totalPages,
      pages: previous.pages,
    };
  }
  if (previous.type === "pdf" && next.type === "pdf") {
    if (next.file.base64 || !previous.file.base64 || next.file.filePath !== previous.file.filePath)
      return next;
    return {
      ...next,
      file: {
        ...next.file,
        base64: previous.file.base64,
      },
    };
  }
  return next;
}
//@ chunk-e6aww6q8.js:3159937-3160092 layout
/**
 * 取文件身份；文件名形如截图（"... AM.png"）时同时取备用拼写的身份。
 */
async function getScreenshotPathIdentities(filePath, spellings) {
  let own = await lastExistingIdentity(spellings);
  let alternateScreenshotPath = getAlternateScreenshotPath(filePath);
  if (alternateScreenshotPath === undefined)
    return {
      own,
      alt: undefined,
    };
  let identity = await lastExistingIdentity(mapSpellingsToAlternatePath(spellings, alternateScreenshotPath));
  return {
    own,
    alt: {
      path: alternateScreenshotPath,
      identity,
    },
  };
}
//@ chunk-e6aww6q8.js:3160092-3160175 fingerprint = getAlternateScreenshotPath (0.702)
/**
 * 把每个已批准的路径拼写换成备用截图文件名（同目录）。
 */
function mapSpellingsToAlternatePath(spellings, alternateScreenshotPath) {
  let filename = pathModule_2.basename(alternateScreenshotPath);
  return spellings.map((spelling) => pathModule_2.join(pathModule_2.dirname(spelling), filename));
}
//@ chunk-e6aww6q8.js:3160175-3160209 file-local
var THIN_SPACE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3160175", () => {
  THIN_SPACE = String.fromCharCode(8239);
});
//@ chunk-e6aww6q8.js:3160209-3160397 layout
/**
 * macOS 截图文件名在 "AM/PM.png" 前用普通空格或 U+202F 窄空格，返回另一种空格的路径；不匹配返回 undefined。
 */
function getAlternateScreenshotPath(filePath) {
  let filename = pathModule_2.basename(filePath);
  let amPmPattern = /^(.+)([ \u202F])(AM|PM)(\.png)$/;
  let match = filename.match(amPmPattern);
  if (!match) return;
  let currentSpace = match[2];
  let alternateSpace = currentSpace === " " ? THIN_SPACE : " ";
  return filePath.replace(`${currentSpace}${match[3]}${match[4]}`, `${alternateSpace}${match[3]}${match[4]}`);
}
//@ chunk-e6aww6q8.js:3160397-3160592 fingerprint = detectSessionFileType (0.899)
/**
 * 配置目录下 projects/**.jsonl 判为 "session_transcript"（读会话记录的统计）。
 */
function detectSessionFileType(filePath) {
  let configDir = getClaudeConfigDirOrNull();
  if (configDir === null || !filePath.startsWith(configDir)) return null;
  let normalizedPath = filePath.split(win32.sep).join(posix.sep);
  if (normalizedPath.includes("/projects/") && normalizedPath.endsWith(".jsonl")) return "session_transcript";
  return null;
}
//@ chunk-e6aww6q8.js:3161562-3164693 fingerprint = outputSchema (0.761)
function makeFileReadOutputSchema(cells) {
  let imageMediaTypes = imageMediaTypeSchema();
  return discriminatedUnion("type", [
    objectSchema({
      type: literal("text"),
      file: objectSchema({
        filePath: stringSchema().describe("The path to the file that was read"),
        content: stringSchema().describe("The content of the file"),
        numLines: numberSchema().describe("Number of lines in the returned content"),
        startLine: numberSchema().describe("The starting line number"),
        totalLines: numberSchema().describe("Total number of lines in the file"),
        truncatedByTokenCap: booleanSchema()
          .optional()
          .describe(
            "True when a whole-file read was auto-paginated because it exceeded the token cap (the content is a partial first page). A programmatic signal for internal consumers; survives output reconstruction (unlike the render-time banner).",
          ),
      }),
      artifactRead: objectSchema({
        slug: stringSchema(),
        ver: stringSchema(),
      })
        .optional()
        .describe(
          "Set when this Read completed a saved Artifact source file: the Artifact and the version of it that now counts as viewed.",
        ),
    }),
    objectSchema({
      type: literal("image"),
      file: objectSchema({
        base64: stringSchema().describe("Base64-encoded image data"),
        type: imageMediaTypes.describe("The MIME type of the image"),
        originalSize: numberSchema().describe("Original file size in bytes"),
        dimensions: objectSchema({
          originalWidth: numberSchema().optional().describe("Original image width in pixels"),
          originalHeight: numberSchema().optional().describe("Original image height in pixels"),
          displayWidth: numberSchema()
            .optional()
            .describe("Displayed image width in pixels (after resizing)"),
          displayHeight: numberSchema()
            .optional()
            .describe("Displayed image height in pixels (after resizing)"),
        })
          .optional()
          .describe("Image dimension info for coordinate mapping"),
      }),
    }),
    objectSchema({
      type: literal("notebook"),
      file: objectSchema({
        filePath: stringSchema().describe("The path to the notebook file"),
        cells,
      }),
    }),
    objectSchema({
      type: literal("pdf"),
      file: objectSchema({
        filePath: stringSchema().describe("The path to the PDF file"),
        base64: stringSchema().describe("Base64-encoded PDF data"),
        originalSize: numberSchema().describe("Original file size in bytes"),
      }),
    }),
    objectSchema({
      type: literal("parts"),
      file: objectSchema({
        filePath: stringSchema().describe("The path to the PDF file"),
        originalSize: numberSchema().describe("Original file size in bytes"),
        count: numberSchema().describe("Number of pages extracted"),
        outputDir: stringSchema().describe("Directory containing extracted page images"),
      }),
      firstPage: numberSchema()
        .optional()
        .describe(
          "Document page number of the first extracted page (1 when no range was requested); labels the page images in the model-facing tool_result",
        ),
      totalPages: numberSchema()
        .optional()
        .describe(
          "@internal Number of pages in the document. Set only when the call named no page range and the PDF was too long to read whole, so only its first pages were extracted",
        ),
      pages: array(
        objectSchema({
          base64: stringSchema().describe(
            "Base64-encoded page image; empty when the page could not be processed",
          ),
          mediaType: imageMediaTypes.describe("The MIME type of the image"),
          error: stringSchema()
            .optional()
            .describe("Why the page could not be processed as an image; set only when base64 is empty"),
        }),
      )
        .optional()
        .describe(
          "Extracted page images, in page order. Present only transiently in-process: the page image bytes are delivered solely as image blocks in the model-facing tool_result content and are not retained on the tool_use_result, so this key is absent on the emitted/persisted result",
        ),
    }),
    objectSchema({
      type: literal("file_unchanged"),
      file: objectSchema({
        filePath: stringSchema().describe("The path to the file"),
      }),
      source: literal("seeded")
        .optional()
        .describe(
          "Set when the dedup matched a startup-seeded entry (CLAUDE.md / nested memory) rather than a prior Read tool_result",
        ),
    }),
  ]);
}
//@ chunk-e6aww6q8.js:3164693-3164860 layout
var fileReadOutputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PRIMITIVE_TYPEOF_NAMES;
var BASE64_PREFIX_RE;
var MAX_NOTEBOOK_FIELD_LENGTH;
deferInit("chunk-e6aww6q8.js:3164693", () => {
  fileReadOutputSchema = DoctorLazy(() =>
    makeFileReadOutputSchema(array(anySchema()).describe("Array of notebook cells")),
  );
  PRIMITIVE_TYPEOF_NAMES = new Set(["string", "number", "boolean"]);
  BASE64_PREFIX_RE = /^(?:[^A-Za-z0-9+/_=-]*[A-Za-z0-9+/_=-]){0,16}/;
  MAX_NOTEBOOK_FIELD_LENGTH = 64;
});
//@ chunk-e6aww6q8.js:3164860-3165052 layout
function flattenToCommaString(value) {
  let parts = [];
  let stack = [value];
  while (stack.length > 0) {
    let item = stack.pop();
    if (Array.isArray(item) && item.length > 0)
      for (let idx = item.length - 1; idx >= 0; idx--) stack.push(item[idx]);
    else parts.push(item === null ? "" : String(item));
  }
  return parts.join(",");
}
//@ chunk-e6aww6q8.js:3165052-3165853 layout
var crossProcessNotebookCellsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var fileReadOutputSchemaAcrossProcesses;
deferInit("chunk-e6aww6q8.js:3165052", () => {
  crossProcessNotebookCellsSchema = DoctorLazy(() => {
    let textField = unknown().transform((value, ctx) => {
      if (value === null || PRIMITIVE_TYPEOF_NAMES.has(typeof value)) return value;
      try {
        if (value !== undefined) return [flattenToCommaString(value)];
      } catch {}
      ctx.addIssue({
        code: "custom",
        message: "Missing, or no text can be made of it.",
      });
      return INVALID;
    });
    let imageField = objectSchema({
      image_data: stringSchema(),
      media_type: imageMediaTypeSchema(),
    }).transform((imageOutput) =>
      sniffImageMediaType(Buffer.from(BASE64_PREFIX_RE.exec(imageOutput.image_data)[0], "base64")) === null
        ? undefined
        : imageOutput,
    );
    return array(
      objectSchema({
        cellType: textField.optional(),
        source: stringSchema(),
        execution_count: textField
          .optional()
          .catch(undefined)
          .transform((count) => (String(count).length > MAX_NOTEBOOK_FIELD_LENGTH ? undefined : count)),
        cell_id: textField,
        language: textField.optional(),
        outputs: array(
          objectSchema({
            output_type: stringSchema().refine(
              (outputType) => outputType.length <= MAX_NOTEBOOK_FIELD_LENGTH,
            ),
            text: stringSchema().optional(),
            image: imageField.nullish(),
          }).nullable(),
        ).optional(),
      }).transform((cell) => (cell.cellType === "code" ? cell : omitAlias(cell, ["language"]))),
    );
  });
  fileReadOutputSchemaAcrossProcesses = DoctorLazy(() =>
    makeFileReadOutputSchema(crossProcessNotebookCellsSchema())
      .refine((output) => output.type !== "file_unchanged")
      .transform((output) => (output.type === "text" ? omitAlias(output, ["artifactRead"]) : output)),
  );
});
//@ chunk-e6aww6q8.js:3165853-3165961 layout
function withResultFilePath(result, filePath) {
  return typeof result.file === "object" && "filePath" in result.file
    ? {
        ...result,
        file: {
          ...result.file,
          filePath,
        },
      }
    : result;
}
//@ chunk-e6aww6q8.js:3165961-3166167 layout
function sanitizePartsResultFromAnotherProcess(result) {
  if (result.type !== "parts") return result;
  let sanitizeText = (text) => escapeXmlInline(clipText(text, 2000));
  return {
    ...result,
    file: {
      ...result.file,
      outputDir: sanitizeText(result.file.outputDir),
    },
    pages: result.pages?.map((page) => ({
      ...page,
      ...(page.error !== undefined && {
        error: sanitizeText(page.error),
      }),
    })),
  };
}
//@ chunk-e6aww6q8.js:3166167-3166290 layout
function stripPdfPageImages(output) {
  if (typeof output !== "object" || output === null || output.type !== "parts" || output.pages === undefined)
    return output;
  let { pages, ...rest } = output;
  return rest;
}
//@ chunk-e6aww6q8.js:3166290-3167545 layout
/**
 * 解析并检查 pages 参数：只接受单页或单区间；上下文满过一次后按每消息/每轮 PDF 页数预算拒绝（错误码 17/18）；超过每请求 20 页拒绝（8）。
 */
function validatePdfPagesParam(pagesParam, pdfLimits) {
  let pageRange = parsePDFPageRange(pagesParam);
  if (!pageRange)
    return {
      ok: false,
      message: `Invalid pages parameter: "${pagesParam}". Give one page ("3") or one range ("1-5"), not a list. To read several pages or ranges, read each one separately. Pages are 1-indexed.`,
      errorCode: 7,
    };
  let requestedPageCount =
    pageRange.lastPage === 1 / 0
      ? MAX_PDF_PAGES_PER_READ_2 + 1
      : pageRange.lastPage - pageRange.firstPage + 1;
  if (pdfLimits !== undefined) {
    let { pagesPerMessage, pagesThisMessage, pagesPerTurn, pagesThisTurn } = pdfLimits;
    if (pagesThisTurn + Math.min(requestedPageCount, pagesPerMessage) > pagesPerTurn)
      return {
        ok: false,
        message: `The context has filled up once already, and ${pagesThisTurn} PDF pages have been asked for; the most before you give your answer is ${pagesPerTurn}. "${pagesParam}" was not read. Read no more PDF pages now: answer from what you have read, tell the user which pages you did not reach, and that they can ask you to go on in their next message.`,
        errorCode: 18,
      };
    if (pagesThisMessage + requestedPageCount > pagesPerMessage)
      return {
        ok: false,
        message: `The context has filled up once already. Until you give your answer, each of your messages can read at most ${pagesPerMessage} PDF ${plural(pagesPerMessage, "page")}, counting all of its ${FILE_READ_TOOL_NAME} calls. "${pagesParam}" was not read. Ask for it in later messages, at most ${pagesPerMessage} ${plural(pagesPerMessage, "page")} in each. You need not wait for the user between messages.`,
        errorCode: 17,
      };
  }
  if (requestedPageCount > MAX_PDF_PAGES_PER_READ_2)
    return {
      ok: false,
      message: `Page range "${pagesParam}" exceeds maximum of ${MAX_PDF_PAGES_PER_READ_2} pages per request. Please use a smaller range.`,
      errorCode: 8,
    };
  return {
    ok: true,
    range: pageRange,
  };
}
//@ chunk-e6aww6q8.js:3167545-3168667 layout
/**
 * 把工具上下文与单次调用信息合成一个只读 getter 对象（session、readFileState、contextRoom、signal、fileReadingLimits 等）。
 */
function createReadCallContext(toolContext, callInfo) {
  return {
    get session() {
      return toolContext.session;
    },
    get agentId() {
      return toolContext.agentId;
    },
    get storageV5() {
      return toolContext.storageV5;
    },
    get credentials() {
      return toolContext.credentials;
    },
    get taskRegistry() {
      return toolContext.taskRegistry;
    },
    get toolState() {
      return toolContext.toolState;
    },
    get readFileState() {
      return toolContext.readFileState;
    },
    get dedupUnchangedReads() {
      return toolContext.dedupUnchangedReads;
    },
    get dynamicSkillDirTriggers() {
      return toolContext.dynamicSkillDirTriggers;
    },
    get nestedMemoryAttachmentTriggers() {
      return toolContext.nestedMemoryAttachmentTriggers;
    },
    get setArtifactReadVersion() {
      return toolContext.setArtifactReadVersion;
    },
    get getArtifactReadObservation() {
      return toolContext.getArtifactReadObservation;
    },
    get mainLoopModel() {
      return toolContext.mainLoopModel;
    },
    get model() {
      return toolContext.model;
    },
    get contextRoom() {
      return toolContext.contextRoom;
    },
    get permissions() {
      return toolContext.permissions;
    },
    get messages() {
      return toolContext.messages;
    },
    get toolUseId() {
      return callInfo.toolUseId;
    },
    get signal() {
      return callInfo.signal;
    },
    get pdfRenderSignal() {
      return callInfo.pdfRenderSignal;
    },
    get remoteCall() {
      return callInfo.remoteCall;
    },
    get inputFromAnotherMachine() {
      return callInfo.inputFromAnotherMachine;
    },
    get fileReadingLimits() {
      return callInfo.fileReadingLimits;
    },
    get sameTurnToolUses() {
      return callInfo.sameTurnToolUses;
    },
  };
}
//@ chunk-e6aww6q8.js:3168667-3168772 layout
/**
 * 本地调用且上下文已压缩过时返回本轮 PDF 页数预算，否则 undefined。
 */
function getPdfPageBudget(context) {
  return context.remoteCall === undefined && hasNoUserPromptSinceCompact(context.messages())
    ? getPdfPageLimits(context.session, context.sameTurnToolUses)
    : undefined;
}
//@ chunk-e6aww6q8.js:3168772-3174590 facade-exports = FileReadTool (0.519)
/**
 * Read 工具定义（name "Read"）。读文本/图片/PDF/notebook；validateInput 查空字节、不稳定路径、pages 合法性与预算、Read deny、二进制扩展名、设备文件、远程 PDF 预算；checkPermissions 走 checkReadPermissionForTool 并在 macOS 暂存截图备用路径身份；maxResultSizeChars 为 Infinity。
 */
var FileReadTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3168772", () => {
  FileReadTool = buildTool({
    name: FILE_READ_TOOL_NAME,
    ruleContentField: "file_path",
    searchHint: "read files, images, PDFs, notebooks",
    remoteExecution: {
      supported: true,
      decidingInputFields: ["file_path", "offset", "limit", "pages", "allow_large"],
    },
    backgrounding: "never",
    maxResultSizeChars: 1 / 0,
    strict: true,
    async description() {
      return DESCRIPTION;
    },
    async prompt({ model, leanPrompt, leanRewrite }) {
      return renderPromptTemplate(
        model,
        isTabReadSeparationEnabled() ? TAB_AWARE_LINE_FORMAT_INSTRUCTION : LINE_FORMAT_INSTRUCTION,
        leanPrompt,
        leanRewrite,
      );
    },
    get inputSchema() {
      return fileReadInputSchema();
    },
    coerceInput: normalizeReadInputAliases,
    get outputSchema() {
      return fileReadOutputSchema();
    },
    get outputSchemaAcrossProcesses() {
      return fileReadOutputSchemaAcrossProcesses();
    },
    fromAnotherProcess(result, input) {
      let data = sanitizePartsResultFromAnotherProcess(
        withResultFilePath(result, String(input.file_path ?? "")),
      );
      if (data.type === "text" && data.file.truncatedByTokenCap === true)
        setCachedReadingLimit(data, buildReadTruncationNotice(data.file));
      let imageMetadata =
        data.type === "image" && data.file.dimensions ? createImageMetadataText(data.file.dimensions) : null;
      return {
        data,
        ...(imageMetadata !== null && {
          newMessages: [
            createUserMessage({
              content: imageMetadata,
              isMeta: true,
            }),
          ],
        }),
      };
    },
    userFacingName: userFacingName_3,
    getToolUseSummary: getToolUseSummary_5,
    getActivityDescription(input) {
      let toolUseSummary = getToolUseSummary_5(input);
      return toolUseSummary ? `Reading ${toolUseSummary}` : "Reading file";
    },
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    toAutoClassifierInput(input) {
      let hostRouting = remoteRoutingCandidate(input);
      return hostRouting === undefined
        ? input.file_path
        : {
            file_path: input.file_path,
            [HOST_TOOL_INPUT_FIELD]: hostRouting,
            ...hostContextMeta(input),
          };
    },
    suppressesAllPermissionUpdates(input) {
      return hasHostField(input);
    },
    isSearchOrReadCommand() {
      return {
        isSearch: false,
        isRead: true,
      };
    },
    getPath({ file_path: filePath }) {
      return filePath || (isRemoteOnlyCheck(FILE_READ_TOOL_NAME) ? "" : getCwd());
    },
    backfillObservableInput(input) {
      if (typeof input.file_path === "string" && !isRemoteOnlyCheck(FILE_READ_TOOL_NAME))
        input.file_path = expandStablePath(input.file_path);
    },
    async preparePermissionMatcher({ file_path }) {
      return (pattern) => matchesPathRule(pattern, file_path);
    },
    extractSearchText() {
      return "";
    },
    stripForCreation: stripPdfPageImages,
    restoreTransientForRemap: restoreTransientPdfFields,
    stripForStorage(output) {
      if (typeof output !== "object" || output === null) return output;
      if (output.type === "parts") return stripPdfPageImages(output);
      if (typeof output.file !== "object" || output.file === null) return output;
      switch (output.type) {
        case "text":
          if (output.file.content === "") return output;
          return {
            ...output,
            file: {
              ...output.file,
              content: "",
            },
          };
        case "image":
          if (output.file.base64 === "") return output;
          return {
            ...output,
            file: {
              ...output.file,
              base64: "",
            },
          };
        case "pdf":
          if (output.file.base64 === "") return output;
          return {
            ...output,
            file: {
              ...output.file,
              base64: "",
            },
          };
        case "notebook": {
          let { cells } = output.file;
          if (!Array.isArray(cells) || cells.length === 0 || cells[0] == null) return output;
          return {
            ...output,
            file: {
              ...output.file,
              cells: Array(cells.length),
            },
          };
        }
        default:
          return output;
      }
    },
    create(toolContext) {
      return {
        async checkPermissions(input, callInfo) {
          let callContext = createReadCallContext(toolContext, callInfo);
          let stablePath = expandStablePath(input.file_path);
          let pathSpellings = walkPermissionCheckPaths(stablePath);
          let spellings = pathSpellings.spellings;
          callContext.session.writePermissionStash.stash(
            callContext.toolUseId,
            stablePath,
            spellings,
            "read",
          );
          if (getPlatform() === "macos" && callContext.toolUseId !== undefined) {
            let { own, alt } = await getScreenshotPathIdentities(stablePath, spellings);
            let writePermissionStash = callContext.session.writePermissionStash;
            writePermissionStash.stashIdentity(callContext.toolUseId, stablePath, own);
            if (alt) writePermissionStash.stashIdentity(callContext.toolUseId, alt.path, alt.identity);
          }
          return checkReadPermissionForTool(FileReadTool, input, callContext.permissions(), pathSpellings);
        },
        async validateInput(input, callInfo) {
          let context = createReadCallContext(toolContext, callInfo);
          let { file_path: filePath, pages } = input;
          if (canRunToolsOnThisMachine() && hasHostField(input))
            return {
              result: false,
              message: hostFieldNotForwardedMessage(),
              errorCode: 14,
            };
          let nullByteRefusal = rejectNullBytes(FILE_READ_TOOL_NAME, [["file_path", filePath]]);
          if (nullByteRefusal) return nullByteRefusal;
          let trailingWhitespaceRefusal = rejectTrailingWhitespace(FILE_READ_TOOL_NAME, [
            ["file_path", filePath],
          ]);
          if (trailingWhitespaceRefusal) return trailingWhitespaceRefusal;
          if (pages !== undefined) {
            let pagesValidation = validatePdfPagesParam(
              pages,
              isDocumentExtension(pathModule_2.extname(filePath)) ? getPdfPageBudget(context) : undefined,
            );
            if (!pagesValidation.ok)
              return {
                result: false,
                message: pagesValidation.message,
                errorCode: pagesValidation.errorCode,
              };
          }
          let absolutePath = expandStablePath(filePath);
          let denyRule = matchingRuleForInput(absolutePath, context.permissions(), "read", "deny");
          if (denyRule !== null)
            return {
              result: false,
              message: DENIED_DIRECTORY_ERROR,
              errorCode: 1,
              deniedByPermissionRule: true,
              denyRule,
            };
          if (isUncOrDevicePath(absolutePath))
            return {
              result: true,
            };
          let lower = pathModule_2.extname(absolutePath).toLowerCase();
          if (hasBinaryExtension(absolutePath) && !isImageOrPdfExtension(absolutePath))
            return {
              result: false,
              message: `This tool cannot read binary files. The file appears to be a binary ${lower} file. Use a skill for this file type if one is available, or a shell command or script that can read the format.`,
              errorCode: 4,
            };
          let devicePathRefusal = getDevicePathRefusal(filePath, {
            spellings: [absolutePath],
            unresolved: false,
          });
          if (devicePathRefusal !== undefined)
            return {
              result: false,
              message: devicePathRefusal,
              errorCode: 9,
            };
          if (context.remoteCall !== undefined && isDocumentExtension(lower)) {
            let mediaLimits = mediaLimitsForRoute(context.remoteCall.origin.transport);
            let pagesValidation = pages === undefined ? undefined : validatePdfPagesParam(pages);
            let requestedPageCount =
              pagesValidation !== undefined && pagesValidation.ok
                ? pagesValidation.range.lastPage - pagesValidation.range.firstPage + 1
                : 0;
            let wholePdfRefused = pages === undefined && mediaLimits.wholePdfMaxRawBytes === 0;
            if (wholePdfRefused || requestedPageCount > mediaLimits.pdfMaxPagesPerRead)
              return {
                result: false,
                message: `${wholePdfRefused ? "A whole PDF cannot be returned from this machine to the calling session" : `${pages} is too many pages to return from this machine in one call`}. Use the pages parameter with at most ${mediaLimits.pdfMaxPagesPerRead} pages per call (for example pages: 1-3, which come back as images), or read the file where the session runs.`,
                errorCode: 16,
              };
          }
          return {
            result: true,
          };
        },
        async call(input, callInfo) {
          let context = createReadCallContext(toolContext, callInfo);
          return readFileToolCall(input, context, callInfo.parentMessage);
        },
      };
    },
    mapToolResultToToolResultBlockParam(output, toolUseId) {
      switch (output.type) {
        case "image":
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  data: output.file.base64,
                  media_type: output.file.type,
                },
              },
            ],
          };
        case "notebook":
          return buildNotebookToolResult(output.file.cells, toolUseId);
        case "pdf": {
          let headerText = `PDF file read: ${output.file.filePath} (${formatFileSize(output.file.originalSize)})`;
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content: output.file.base64
              ? [
                  {
                    type: "text",
                    text: headerText,
                  },
                  {
                    type: "document",
                    source: {
                      type: "base64",
                      media_type: "application/pdf",
                      data: output.file.base64,
                    },
                  },
                ]
              : headerText,
          };
        }
        case "parts": {
          let headerText =
            `PDF pages extracted: ${output.file.count} page(s) from ${output.file.filePath} (${formatFileSize(output.file.originalSize)})` +
            (output.totalPages === undefined
              ? ""
              : `. This PDF has ${output.totalPages} pages. These are pages 1-${output.file.count}. Use the pages parameter to read other pages (e.g., pages: "${output.file.count + 1}-${Math.min(2 * output.file.count, output.totalPages)}").`);
          let pages = output.pages ?? [];
          let firstPage = output.firstPage ?? 1;
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content: pages.length
              ? [
                  {
                    type: "text",
                    text: headerText,
                  },
                  ...pages.map((page, pageIndex) =>
                    page.base64
                      ? {
                          type: "image",
                          source: {
                            type: "base64",
                            data: page.base64,
                            media_type: page.mediaType,
                          },
                        }
                      : {
                          type: "text",
                          text: `[Page ${firstPage + pageIndex} could not be processed as an image${page.error ? `: ${page.error}` : ""}]`,
                        },
                  ),
                ]
              : headerText,
          };
        }
        case "file_unchanged":
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content:
              output.source === "seeded"
                ? getSeededFileUnchangedMessage(output.file.filePath)
                : getFileUnchangedMessage(),
          };
        case "text": {
          let content;
          if (output.file.content)
            content =
              memoryFileFreshnessPrefix(output) +
              addLineNumbers({
                ...output.file,
                tabAwareSeparator: isTabReadSeparationEnabled(),
              });
          else if (output.file.numLines >= 1 && output.file.totalLines > 1)
            content = memoryFileFreshnessPrefix(output) + formatNumberedLine("", output.file.startLine, "\t");
          else if (output.file.numLines >= 1 || output.file.totalLines === 0)
            content =
              "<system-reminder>Warning: the file exists but the contents are empty.</system-reminder>";
          else
            content = `<system-reminder>Warning: the file exists but is shorter than the provided offset (${output.file.startLine}). The file has ${output.file.totalLines} lines.</system-reminder>`;
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content: content + formatTrailingResultNotes(output),
          };
        }
      }
    },
  });
});
//@ chunk-e6aww6q8.js:3174590-3177290 layout
/**
 * Read 的 call 实现：设备守卫、文件身份、读取上限（env/fileReadingLimits/allow_large 放宽），去重（未变文件返回 file_unchanged，可由 tengu_read_dedup_killswitch 关闭），触发动态技能目录，ENOENT 时尝试截图备用路径并给出 Did you mean 提示。
 */
async function readFileToolCall(
  { file_path: filePath, offset = 1, limit = undefined, pages, allow_large: allowLarge },
  context,
  parentMessage,
) {
  let { readFileState, fileReadingLimits } = context;
  let filePath_2 = expandStablePath(filePath);
  let writePermissionStash = context.session.writePermissionStash;
  let hasStashedRead = writePermissionStash.holds(context.toolUseId, filePath_2, "read");
  let checkedIdentity = writePermissionStash.takeIdentity(context.toolUseId, filePath_2);
  let alternateScreenshotPath = getAlternateScreenshotPath(filePath_2);
  let checkedIdentity_2 =
    alternateScreenshotPath === undefined
      ? undefined
      : writePermissionStash.takeIdentity(context.toolUseId, alternateScreenshotPath);
  let permissionSpellings = readPermissionSpellings(context, filePath_2);
  let spellings = permissionSpellings.spellings;
  let devicePathRefusal = getDevicePathRefusal(filePath, permissionSpellings);
  if (devicePathRefusal !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      devicePathRefusal,
      "Read refused by the device guard",
    );
  if (!hasStashedRead && getPlatform() === "macos") {
    let { own, alt } = await getScreenshotPathIdentities(filePath_2, spellings);
    checkedIdentity = own;
    checkedIdentity_2 = alt?.identity;
  }
  let defaultFileReadingLimits = getDefaultFileReadingLimits();
  let maxSizeBytes = fileReadingLimits?.maxSizeBytes ?? defaultFileReadingLimits.maxSizeBytes;
  let maxTokens = fileReadingLimits?.maxTokens ?? defaultFileReadingLimits.maxTokens;
  let roomInfo = () =>
    computeAllowLargeRoom(context, parentMessage, {
      maxSizeBytes,
      maxTokens,
    });
  let allowLarge_2 = allowLarge ? roomInfo() : undefined;
  if (fileReadingLimits !== undefined)
    logEvent("tengu_file_read_limits_override", {
      hasMaxTokens: fileReadingLimits.maxTokens !== undefined,
      hasMaxSizeBytes: fileReadingLimits.maxSizeBytes !== undefined,
    });
  let ext = pathModule_2.extname(filePath).toLowerCase().slice(1);
  let fullFilePath = expandStablePath(filePath);
  if (isNotebookPath(fullFilePath)) {
    offset = 1;
    limit = undefined;
  }
  let previousReadEntry = readFileState.get(fullFilePath);
  if (previousReadEntry)
    logEvent("tengu_file_read_reread", {
      priorOp: lit_2(
        previousReadEntry.seededFromContext
          ? "seeded"
          : previousReadEntry.offset === undefined
            ? "edit_write"
            : "read",
      ),
    });
  let dedupEntry =
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_read_dedup_killswitch", false) ||
    context.remoteCall !== undefined ||
    context.dedupUnchangedReads === false
      ? undefined
      : readFileState.get(fullFilePath);
  if (!env.CLAUDE_CODE_SIMPLE && context.remoteCall === undefined)
    await discoverSkillsForPath(
      context.session.host,
      fullFilePath,
      context.dynamicSkillDirTriggers,
      context.storageV5,
    );
  let nestedMemoryAttachmentTriggers = context.nestedMemoryAttachmentTriggers;
  if (nestedMemoryAttachmentTriggers && !nestedMemoryAttachmentTriggers.includes(fullFilePath))
    nestedMemoryAttachmentTriggers.push(fullFilePath);
  let pendingHandoverRead =
    context.remoteCall === undefined ? getLiveState().pendingHandoverReads.get(fullFilePath) : undefined;
  let isHandoverCopy = (mtimeMs) => {
    let agentId = context.agentId ?? "main";
    return (
      pendingHandoverRead !== undefined &&
      !pendingHandoverRead.completedBy.has(agentId) &&
      !pendingHandoverRead.unrecordableBy.has(agentId) &&
      Math.floor(mtimeMs) === pendingHandoverRead.mtimeMs
    );
  };
  if (
    dedupEntry &&
    dedupEntry.seededFromContext &&
    !dedupEntry.isPartialView &&
    offset === 1 &&
    limit === undefined
  )
    try {
      let mtimeMs = await getSeededFileMtime(fullFilePath, context.storageV5);
      if (mtimeMs === dedupEntry.timestamp && !isHandoverCopy(mtimeMs)) {
        let fileExtensionForAnalytics = getFileExtensionForAnalytics(fullFilePath);
        logEvent("tengu_file_read_dedup", {
          source: lit_2("seeded"),
          ...(fileExtensionForAnalytics !== undefined && {
            ext: fileExtensionForAnalytics,
          }),
        });
        return {
          data: {
            type: "file_unchanged",
            file: {
              filePath: fullFilePath,
            },
            source: "seeded",
          },
        };
      }
    } catch {}
  if (
    dedupEntry &&
    !dedupEntry.isPartialView &&
    !dedupEntry.contentNotInModelContext &&
    dedupEntry.offset !== undefined
  ) {
    if (dedupEntry.offset === offset && dedupEntry.limit === limit)
      try {
        let mtimeMs = await getFileModificationTimeAsync(fullFilePath);
        if (mtimeMs === dedupEntry.timestamp && !isHandoverCopy(mtimeMs)) {
          let fileExtensionForAnalytics = getFileExtensionForAnalytics(fullFilePath);
          logEvent("tengu_file_read_dedup", {
            ...(fileExtensionForAnalytics !== undefined && {
              ext: fileExtensionForAnalytics,
            }),
          });
          return {
            data: {
              type: "file_unchanged",
              file: {
                filePath,
              },
            },
          };
        }
      } catch {}
  }
  let readRequest = {
    file_path: filePath,
    fullFilePath,
    ext,
    offset,
    limit,
    pages,
    maxSizeBytes,
    maxTokens,
    room: roomInfo,
    allowLarge: allowLarge_2,
    context,
    messageId: parentMessage?.message.id,
    approvedPaths: spellings,
    checkedIdentity,
  };
  try {
    return await callInnerWithFileHandle({
      ...readRequest,
      resolvedFilePath: fullFilePath,
    });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") {
      let alternateScreenshotPath = getAlternateScreenshotPath(fullFilePath);
      if (alternateScreenshotPath)
        try {
          return await callInnerWithFileHandle({
            ...readRequest,
            resolvedFilePath: alternateScreenshotPath,
            approvedPaths: mapSpellingsToAlternatePath(spellings, alternateScreenshotPath),
            checkedIdentity: checkedIdentity_2,
          });
        } catch (error) {
          if (!isENOENT(error)) throw error;
        }
      let similarFile = await findSimilarFile(fullFilePath);
      let normalizedPath = await normalizePathForComparison(fullFilePath);
      let notFoundMessage = `File does not exist. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.`;
      if (normalizedPath) notFoundMessage += ` Did you mean ${normalizedPath}?`;
      else if (similarFile) notFoundMessage += ` Did you mean ${similarFile}?`;
      notFoundMessage += separateCopyHint(FileReadTool, fullFilePath, context);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        encodeControlChars(notFoundMessage),
        "File does not exist",
      );
    }
    throw error;
  }
}
//@ chunk-e6aww6q8.js:3177290-3177310 layout
var memoryFileMtimeByResult; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3177290", () => {
  memoryFileMtimeByResult = new WeakMap();
});
//@ chunk-e6aww6q8.js:3177310-3177380 file-local
/**
 * 结果是记忆文件时返回基于 mtime 的新鲜度说明前缀。
 */
function memoryFileFreshnessPrefix(data) {
  let mtimeMs = memoryFileMtimeByResult.get(data);
  if (mtimeMs === undefined) return "";
  return memoryFreshnessNote(mtimeMs);
}
//@ chunk-e6aww6q8.js:3177380-3177416 layout
var artifactCoverageNoteByResult; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var notTextNoteByResult;
deferInit("chunk-e6aww6q8.js:3177380", () => {
  artifactCoverageNoteByResult = new WeakMap();
  notTextNoteByResult = new WeakMap();
});
//@ chunk-e6aww6q8.js:3177416-3177514 layout
/**
 * 把非文本说明、artifact 覆盖说明附加到文本结果末尾。
 */
function formatTrailingResultNotes(output) {
  return [notTextNoteByResult.get(output), artifactCoverageNoteByResult.get(output)]
    .filter((note) => note !== undefined)
    .map(
      (note) => `

${note}`,
    )
    .join("");
}
//@ chunk-e6aww6q8.js:3177514-3177761 layout
/**
 * 取启动预置文件（CLAUDE.md 等）的 mtime；storageV5 下经存储接口 stat。
 */
async function getSeededFileMtime(filePath, storage) {
  if (isRemoteOnlyCheck(FILE_READ_TOOL_NAME)) throw Error("seeded file not on this machine");
  if (isStorageV5Enabled() && storage !== undefined) {
    let statResult = await statViaStorage(filePath, storage);
    if (statResult === undefined) throw Error("seeded file not stat-able through the storage interface");
    if (statResult !== "unserved") return statResult;
  }
  return getFileModificationTimeAsync(filePath);
}
//@ chunk-e6aww6q8.js:3177761-3177785 layout
var CONTEXT_ROOM_SAFETY_FACTOR = 0.7;
var MIN_BYTES_PER_TOKEN = 2;
var ALLOW_LARGE_BYTES_PER_TOKEN_FACTOR = 3;
//@ chunk-e6aww6q8.js:3177785-3177893 facade-exports
/**
 * 本轮剩余可用上下文 token：(阈值 - max(当前用量, held) - claimed) × 0.7，不小于 0。
 */
function allowLargeRoomTokens(room, usedTokens) {
  let occupiedTokens = Math.max(usedTokens, room.held()) + room.claimed();
  return Math.max(0, Math.floor((room.threshold - occupiedTokens) * CONTEXT_ROOM_SAFETY_FACTOR));
}
//@ chunk-e6aww6q8.js:3177893-3178311 layout
/**
 * allow_large 时计算放宽额度：本地且有 contextRoom 时，若剩余 token 大于默认上限，则提高 maxTokens 与 maxSizeBytes（按每 token 字节数 ×3）。
 */
function computeAllowLargeRoom(context, parentMessage, limits) {
  let room = context.contextRoom();
  if (room === undefined || context.remoteCall !== undefined || context.inputFromAnotherMachine === true)
    return {
      roomTokens: undefined,
      raised: undefined,
    };
  let usage = parentMessage?.message.usage;
  let usageTokens = usage ? getTokenCountFromUsage_5(usage) : undefined;
  let usedTokens =
    usageTokens && getTokenCountFromUsage_2_2(usageTokens) > 0
      ? getTokenCountFromUsage_2_2(usageTokens) + usageTokens.output_tokens
      : 0;
  let roomTokens = allowLargeRoomTokens(room, usedTokens);
  if (roomTokens <= limits.maxTokens)
    return {
      roomTokens,
      raised: undefined,
    };
  let { bytesPerToken } = getModelContextInfo(context.model());
  return {
    roomTokens,
    raised: {
      maxTokens: roomTokens,
      maxSizeBytes: Math.max(
        limits.maxSizeBytes,
        roomTokens * bytesPerToken * ALLOW_LARGE_BYTES_PER_TOKEN_FACTOR,
      ),
    },
  };
}
//@ chunk-e6aww6q8.js:3178311-3178483 layout
/**
 * 记 tengu_file_read_allow_large 事件（结果、是否放宽、roomTokens、扩展名）。
 */
function logAllowLargeOutcome(room, outcome, sizeFields, ext) {
  logEvent("tengu_file_read_allow_large", {
    outcome,
    lifted: room.raised !== undefined,
    ...(room.roomTokens !== undefined && {
      roomTokens: room.roomTokens,
    }),
    ...sizeFields,
    ...(ext !== undefined && {
      ext,
    }),
  });
}
//@ chunk-e6aww6q8.js:3178483-3178695 layout
/**
 * 根据剩余上下文与是否已用 allow_large，选择附在超限错误后的提示（可用 allow_large 重试/即使放宽也放不下/此处不可用）。
 */
function getAllowLargeHint(room, optedIn, size) {
  if (room.roomTokens === undefined) return optedIn ? ALLOW_LARGE_UNAVAILABLE_HINT : "";
  if (optedIn || room.raised === undefined) return ALLOW_LARGE_NO_ROOM_HINT;
  return (size.bytes === undefined || size.bytes <= room.raised.maxSizeBytes) &&
    (size.tokens === undefined || size.tokens <= room.raised.maxTokens)
    ? ALLOW_LARGE_RETRY_HINT
    : ALLOW_LARGE_NO_ROOM_HINT;
}
//@ chunk-e6aww6q8.js:3178695-3179273 layout
/**
 * 把文件过大、选区过大、token 超限三类错误重建为附带 allow_large 提示的同类错误，并在已 opt-in 时记事件。
 */
function attachAllowLargeHintToSizeError(error, { room, optedIn, readMaxSizeBytes, ext }) {
  let enrichedError;
  let sizeFields;
  let roomFn;
  if (error instanceof FileTooLargeError && error.maxSizeBytes === readMaxSizeBytes) {
    roomFn = room();
    enrichedError = new FileTooLargeError(
      error.sizeInBytes,
      error.maxSizeBytes,
      getAllowLargeHint(roomFn, optedIn, {
        bytes: error.sizeInBytes,
      }),
    );
    sizeFields = {
      totalBytes: error.sizeInBytes,
    };
  } else if (error instanceof SelectedRangeTooLargeError) {
    roomFn = room();
    enrichedError = new SelectedRangeTooLargeError(
      error.selectedBytes,
      error.maxSelectedBytes,
      getAllowLargeHint(roomFn, optedIn, {
        bytes: error.selectedBytes,
      }),
    );
    sizeFields = {
      totalBytes: error.selectedBytes,
    };
  } else if (error instanceof MaxFileReadTokenExceededError) {
    roomFn = room();
    enrichedError = new MaxFileReadTokenExceededError(
      error.tokenCount,
      error.maxTokens,
      getAllowLargeHint(roomFn, optedIn, {
        tokens: error.tokenCount,
      }),
    );
    sizeFields = {
      tokens: error.tokenCount,
    };
  } else return error;
  if (optedIn) {
    let outcome = roomFn.roomTokens === undefined ? "unavailable" : "too_large";
    logAllowLargeOutcome(roomFn, fromEnum(outcome), sizeFields, ext);
  }
  return enrichedError;
}
//@ chunk-e6aww6q8.js:3179273-3179557 facade-exports
/**
 * 校验内容 token 数：粗估不超过上限 1/4 直接通过；字符数超过上限×128 直接抛 MaxFileReadTokenExceededError；否则调用 token 计数 API，超限抛错。
 */
async function validateContentTokens(
  content,
  ext,
  maxTokens,
  credentials,
  skipCharCheck = false,
  requireExact = false,
) {
  let maxTokens_2 = maxTokens ?? getDefaultFileReadingLimits().maxTokens;
  let textTokenEstimate = roughTokenCountEstimationForFileType(content, ext);
  let estimatedTokens =
    requireExact && textTokenEstimate
      ? Math.max(textTokenEstimate, Math.ceil(Buffer.byteLength(content) / MIN_BYTES_PER_TOKEN))
      : textTokenEstimate;
  if (!estimatedTokens || estimatedTokens <= maxTokens_2 / 4) return estimatedTokens || undefined;
  if (!skipCharCheck && content.length > maxTokens_2 * MAX_CHARS_PER_TOKEN)
    throw new MaxFileReadTokenExceededError(estimatedTokens, maxTokens_2);
  let exactTokens =
    (await timeAttachment("token_count", () => countTextTokensWithAPI(content, credentials))) ??
    estimatedTokens;
  if (exactTokens > maxTokens_2) throw new MaxFileReadTokenExceededError(exactTokens, maxTokens_2);
  return exactTokens;
}
//@ chunk-e6aww6q8.js:3179557-3179681 fingerprint = createImageResponse (1)
/**
 * 构造 image 类型的 Read 结果（base64、image/<type>、原始大小、尺寸）。
 */
function createImageResponse(buffer, mediaType, originalSize, dimensions) {
  return {
    type: "image",
    file: {
      base64: buffer.toString("base64"),
      type: `image/${mediaType}`,
      originalSize,
      dimensions,
    },
  };
}
//@ chunk-e6aww6q8.js:3179681-3179887 layout
/**
 * 记 cli_pdf_read 诊断日志（请求方式、渲染结果、文件字节、页数、耗时）。
 */
function logPdfReadDiagnostics(startedAtMs, diagnostics) {
  logForDiagnosticsNoPII("info", "cli_pdf_read", {
    request: diagnostics.request,
    render: diagnostics.render,
    outcome: diagnostics.outcome,
    file_bytes: diagnostics.fileBytes,
    document_pages: diagnostics.documentPages,
    pages_rendered: diagnostics.pagesRendered,
    duration_ms: Date.now() - startedAtMs,
  });
}
//@ chunk-e6aww6q8.js:3179887-3180093 facade-exports
/**
 * 页数未知的 PDF 是否要求 pages：文件大于 GrowthBook tengu_immutable_tide 阈值、pdfinfo 不是因退出码失败、且 pdftoppm 可用。
 */
async function isUncountedPDFOverWholeReadCap(pdfByteSize, pdfinfoFailure) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_immutable_tide", 0);
  if (
    typeof featureValue_CACHED_MAY_BE_STALE !== "number" ||
    !(featureValue_CACHED_MAY_BE_STALE > 0) ||
    pdfByteSize <= featureValue_CACHED_MAY_BE_STALE
  )
    return false;
  if (
    pdfinfoFailure.reason === "nonzero_exit" ||
    pdfinfoFailure.reason === "no_exit_status" ||
    pdfinfoFailure.reason === "not_run"
  )
    return false;
  return isPdftoppmAvailable();
}
//@ chunk-e6aww6q8.js:3180093-3180353 layout
/**
 * 把 PDF 读取错误转成 TelemetrySafeError（unknown 原因附站点/退出码/分类）。
 */
function toPdfExtractionError(error) {
  if (error.reason !== "unknown")
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      error.message,
      `PDF extraction failed (${error.reason})`,
    );
  let bareError = Error(error.message);
  return error.category === undefined || error.site === undefined
    ? bareError
    : withTelemetryMessage(
        bareError,
        `pdf unknown (site=${error.site}, exit=${error.exitCode ?? "none"}, category=${error.category})`,
      );
}
//@ chunk-e6aww6q8.js:3180353-3180791 layout
/**
 * 惰性打开要读的文件（任务输出目录走专用打开，否则经设备守卫与身份校验），把句柄交给 callInner，结束时关闭。
 */
async function callInnerWithFileHandle(readArgs) {
  let { resolvedFilePath } = readArgs;
  let openedFile;
  let io = async () =>
    (openedFile ??= isTaskOutputFilePath(resolvedFilePath)
      ? await bindTaskOutputForRead(resolvedFilePath)
      : await openReadBoundToApproval(
          resolvedFilePath,
          readArgs.approvedPaths,
          readArgs.context.signal,
          readArgs.checkedIdentity,
          isInstructionReadRestricted(readArgs.context.permissions()) ? "refused" : "by-spelling",
        ));
  try {
    return await callInner({
      ...readArgs,
      io,
    });
  } catch (error) {
    if (openedFile)
      rethrowWithPath(
        error,
        {
          ioPath: openedFile.ioPath,
          canonicalPath: openedFile.canonicalPath,
        },
        resolvedFilePath,
      );
    throw error;
  } finally {
    let closePromise = openedFile?.close();
    if (readArgs.context.signal.aborted || readArgs.context.pdfRenderSignal?.aborted === true)
      closePromise?.catch(() => {});
    else await closePromise;
  }
}
//@ chunk-e6aww6q8.js:3180791-3190604 fingerprint = callInner (0.38)
/**
 * 按类型读取：.ipynb 读 notebook 单元；图片扩展名或无扩展名但魔数是图片走 readImageWithTokenBudget；PDF 做页提取或整份读取；其他用 readFileInRange 读文本，token 超限时整文件读取自动分页并附 [Truncated: PARTIAL view] 说明，最后写 readFileState。
 */
async function callInner(readArgs) {
  let {
    file_path: filePath,
    fullFilePath,
    resolvedFilePath,
    ext,
    offset,
    limit,
    pages,
    maxSizeBytes,
    maxTokens,
    room,
    allowLarge,
    context,
    messageId,
    io,
    totalPages,
  } = readArgs;
  let { readFileState } = context;
  if (isNotebookPath(resolvedFilePath)) {
    let cells = await readNotebook((await io()).handle);
    let cellsJson = jsonStringify(cells);
    let cellsJsonBytes = Buffer.byteLength(cellsJson);
    if (cellsJsonBytes > maxSizeBytes) {
      let notebookHint = NOTEBOOK_TOO_LARGE_HINT();
      throw Error(
        `Notebook content (${formatFileSize(cellsJsonBytes)}) exceeds maximum allowed size (${formatFileSize(maxSizeBytes)}). ${notebookHint}`,
      );
    }
    await validateContentTokens(cellsJson, ext, maxTokens, context.credentials);
    let stats = await (await io()).handle.stat();
    readFileState.set(fullFilePath, {
      content: cellsJson,
      timestamp: Math.floor(stats.mtimeMs),
      offset,
      limit,
    });
    let nestedMemoryAttachmentTriggers = context.nestedMemoryAttachmentTriggers;
    if (nestedMemoryAttachmentTriggers && !nestedMemoryAttachmentTriggers.includes(fullFilePath))
      nestedMemoryAttachmentTriggers.push(fullFilePath);
    let data = {
      type: "notebook",
      file: {
        filePath,
        cells,
      },
    };
    logFileOperation({
      operation: "read",
      tool: "FileReadTool",
      filePath: fullFilePath,
      content: cellsJson,
    });
    return {
      data,
    };
  }
  let imageLimits = imageLimitsForModel(context.mainLoopModel());
  let isImageByMagic = false;
  if (ext === "")
    try {
      if ((await (await io()).handle.stat()).isFile()) {
        let handleUpTo = await readHandleUpTo((await io()).handle, 16, "file");
        isImageByMagic = sniffImageMediaType(handleUpTo) !== null;
      }
    } catch {}
  if (IMAGE_EXTENSIONS.has(ext) || isImageByMagic) {
    let imageWithTokenBudget = await readImageWithTokenBudget(
      await io(),
      maxTokens,
      undefined,
      imageLimits,
      context.remoteCall === undefined
        ? MODEL_COPY_IMAGE_BYTES
        : mediaLimitsForRoute(context.remoteCall.origin.transport).imageMaxRawBytes,
      context.remoteCall === undefined && context.inputFromAnotherMachine !== true,
      context.pdfRenderSignal ?? context.signal,
    );
    let nestedMemoryAttachmentTriggers = context.nestedMemoryAttachmentTriggers;
    if (nestedMemoryAttachmentTriggers && !nestedMemoryAttachmentTriggers.includes(fullFilePath))
      nestedMemoryAttachmentTriggers.push(fullFilePath);
    logFileOperation({
      operation: "read",
      tool: "FileReadTool",
      filePath: fullFilePath,
      content: imageWithTokenBudget.file.base64,
    });
    let imageMetadata = imageWithTokenBudget.file.dimensions
      ? createImageMetadataText(imageWithTokenBudget.file.dimensions)
      : null;
    return {
      data: imageWithTokenBudget,
      ...(imageMetadata && {
        newMessages: [
          createUserMessage({
            content: imageMetadata,
            isMeta: true,
          }),
        ],
      }),
    };
  }
  if (isDocumentExtension(ext)) {
    let now = Date.now();
    if (pages !== undefined) {
      let pagesValidation = validatePdfPagesParam(pages, getPdfPageBudget(context));
      if (!pagesValidation.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          pagesValidation.message,
          "Invalid or oversized PDF pages parameter",
        );
      let range = pagesValidation.range;
      if (context.remoteCall === undefined)
        addPdfPagesThisTurn(context.session, range.lastPage - range.firstPage + 1);
      let { ioPath, handle } = await io();
      let pageExtraction;
      try {
        pageExtraction = await extractPDFPages(
          ioPath,
          {
            ...range,
            signal: context.pdfRenderSignal ?? context.signal,
            held: handle,
          },
          context.storageV5,
        );
      } catch (error) {
        let renderOutcome = error instanceof AbortError_2 ? "aborted" : "threw";
        logPdfReadDiagnostics(now, {
          request: "page_range",
          render: renderOutcome,
          outcome: renderOutcome,
          fileBytes: null,
          documentPages: totalPages ?? null,
          pagesRendered: null,
        });
        throw error;
      }
      if (!pageExtraction.success) {
        logPdfReadDiagnostics(now, {
          request: "page_range",
          render: `failed_${pageExtraction.error.reason}`,
          outcome: pageExtraction.error.reason,
          fileBytes: null,
          documentPages: totalPages ?? null,
          pagesRendered: null,
        });
        throw toPdfExtractionError(pageExtraction.error);
      }
      logEvent("tengu_pdf_page_extraction", {
        success: true,
        pageCount: pageExtraction.data.file.count,
        fileSize: pageExtraction.data.file.originalSize,
        hasPageRange: true,
      });
      logPdfReadDiagnostics(now, {
        request: "page_range",
        render: "ok",
        outcome: "ok",
        fileBytes: pageExtraction.data.file.originalSize,
        documentPages: totalPages ?? null,
        pagesRendered: pageExtraction.data.file.count,
      });
      logFileOperation({
        operation: "read",
        tool: "FileReadTool",
        filePath: fullFilePath,
        content: `PDF pages ${pages}`,
      });
      let pageData =
        context.storageV5 !== undefined
          ? await readPdfExtractedPages(
              context.storageV5,
              pageExtraction.data.file.outputDir,
              pageExtraction.data.v5SidecarScope,
            )
          : await (async () => {
              let imageFiles = (await readdir(pageExtraction.data.file.outputDir))
                .filter((fileName) => fileName.endsWith(".jpg"))
                .sort();
              return Promise.all(
                imageFiles.map((imageFile) =>
                  readFile(pathModule_2.join(pageExtraction.data.file.outputDir, imageFile)),
                ),
              );
            })();
      let pages_2 = (
        await Promise.all(
          pageData.map((data) =>
            maybeResizeAndDownsampleImageBlock({
              data,
              mediaType: "jpeg",
              limits: imageLimits,
            }),
          ),
        )
      ).map(({ block }) =>
        block.type === "image" && block.source.type === "base64"
          ? {
              base64: block.source.data,
              mediaType: block.source.media_type,
            }
          : {
              base64: "",
              mediaType: "image/jpeg",
              ...(block.type === "text" && {
                error: block.text.replace(/^\[Image could not be processed: ?/, "").replace(/\]$/, ""),
              }),
            },
      );
      let { v5SidecarScope, ...pagesResult } = pageExtraction.data;
      return {
        data: {
          ...pagesResult,
          file: {
            ...pagesResult.file,
            filePath: resolvedFilePath,
          },
          firstPage: range.firstPage,
          ...(totalPages !== undefined && {
            totalPages,
          }),
          pages: pages_2,
        },
      };
    }
    let mediaLimits =
      context.remoteCall === undefined ? undefined : mediaLimitsForRoute(context.remoteCall.origin.transport);
    let pdfMaxPagesPerRead = mediaLimits?.pdfMaxPagesPerRead ?? MAX_PDF_PAGES_PER_READ_2;
    let ioHandle = await io();
    let stats = await ioHandle.handle.stat();
    let pdfInfo = await getPdfPageCount(ioHandle.ioPath, {
      handle: ioHandle.handle,
      size: stats.size,
      signal: context.signal,
    });
    if (pdfInfo.pageCount !== null && pdfInfo.pageCount > MAX_PDF_PAGES_PER_TURN) {
      if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_misty_sunbeam", false))
        return callInner({
          ...readArgs,
          pages: `1-${Math.min(MAX_PDF_PAGES_PER_TURN, pdfMaxPagesPerRead)}`,
          totalPages: pdfInfo.pageCount,
        });
      throw toPdfExtractionError({
        reason: "too_many_pages",
        message: `This PDF has ${pdfInfo.pageCount} pages, which is too many to read at once. Use the pages parameter to read specific page ranges (e.g., pages: "1-5"). Maximum ${pdfMaxPagesPerRead} pages per request.`,
      });
    }
    if (
      pdfInfo.pageCount === null &&
      (await isUncountedPDFOverWholeReadCap(stats.size, pdfInfo.pdfinfoFailure))
    )
      throw toPdfExtractionError({
        reason: "page_count_unknown",
        message: `This PDF's page count is unknown (${describePdfinfoFailure(pdfInfo.pdfinfoFailure)}). At ${formatFileSize(stats.size)} it may be too long to read whole. Use the pages parameter to read specific page ranges (e.g., pages: "1-5"). Maximum ${pdfMaxPagesPerRead} pages per request.`,
      });
    if (mediaLimits !== undefined && stats.size > mediaLimits.wholePdfMaxRawBytes) {
      let tooLargeMessage = `This PDF (${formatFileSize(stats.size)}) is larger than can be returned whole from this machine to the calling session (at most ${formatFileSize(mediaLimits.wholePdfMaxRawBytes)}). Use the pages parameter with at most ${mediaLimits.pdfMaxPagesPerRead} pages per call (for example pages: 1-3, which come back as images), or read the file where the session runs.`;
      context.remoteCall?.onToolVerdict?.(
        {
          kind: "refused",
          code: "invalid_request",
        },
        tooLargeMessage,
      );
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        tooLargeMessage,
        "Served whole-PDF read over the transport budget",
      );
    }
    if (!isNotClaude3Model(context.mainLoopModel())) {
      logPdfReadDiagnostics(now, {
        request: "whole_file",
        render: "none",
        outcome: "unsupported_model",
        fileBytes: stats.size,
        documentPages: pdfInfo.pageCount,
        pagesRendered: null,
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Reading full PDFs is not supported with this model. Use a newer model (Sonnet 3.5 v2 or later), or use the pages parameter to read specific page ranges (e.g., pages: "1-5", maximum ${MAX_PDF_PAGES_PER_READ_2} pages per request). Page extraction requires poppler-utils: install with \`brew install poppler\` on macOS or \`apt-get install poppler-utils\` on Debian/Ubuntu.`,
        "PDF unsupported on current model",
      );
    }
    let pdfReadResult;
    try {
      pdfReadResult = await readPDF(ioHandle.handle, ioHandle.ioPath);
    } catch (error) {
      logPdfReadDiagnostics(now, {
        request: "whole_file",
        render: "none",
        outcome: "threw",
        fileBytes: stats.size,
        documentPages: pdfInfo.pageCount,
        pagesRendered: null,
      });
      throw error;
    }
    logPdfReadDiagnostics(now, {
      request: "whole_file",
      render: "none",
      outcome: pdfReadResult.success ? "ok" : pdfReadResult.error.reason,
      fileBytes: stats.size,
      documentPages: pdfInfo.pageCount,
      pagesRendered: null,
    });
    if (!pdfReadResult.success) throw toPdfExtractionError(pdfReadResult.error);
    let pdfResult = {
      ...pdfReadResult.data,
      file: {
        ...pdfReadResult.data.file,
        filePath: resolvedFilePath,
      },
    };
    logFileOperation({
      operation: "read",
      tool: "FileReadTool",
      filePath: fullFilePath,
      content: pdfResult.file.base64,
    });
    return {
      data: pdfResult,
    };
  }
  let maxSizeBytes_2 = allowLarge?.raised?.maxSizeBytes ?? maxSizeBytes;
  let maxTokens_2 = allowLarge?.raised?.maxTokens ?? maxTokens;
  let ext_2 = getFileExtensionForAnalytics(fullFilePath);
  let allowLargeContext = {
    room,
    optedIn: allowLarge !== undefined,
    readMaxSizeBytes: maxSizeBytes_2,
    ext: ext_2,
  };
  let offsetIndex = offset === 0 ? 0 : offset - 1;
  let rangeRead = await readFileInRange(
    resolvedFilePath,
    offsetIndex,
    limit,
    limit === undefined ? maxSizeBytes_2 : undefined,
    context.signal,
    limit === undefined
      ? {
          handle: (await io()).handle,
        }
      : {
          maxSelectedBytes: Math.max(maxTokens * MAX_CHARS_PER_TOKEN, allowLarge?.raised?.maxSizeBytes ?? 0),
          handle: (await io()).handle,
        },
  ).catch((error) => {
    throw attachAllowLargeHintToSizeError(error, allowLargeContext);
  });
  let { lineCount, totalLines, totalBytes, readBytes, mtimeMs } = rangeRead;
  let sessionFileType = getAgentOutputTaskId(fullFilePath);
  let task = sessionFileType !== null ? context.taskRegistry.get(sessionFileType) : undefined;
  let textContent =
    task && isLocalShellTask(task)
      ? consumeClaudeCodeHints(rangeRead.content, {
          command: task.command,
          pendingHint: context.session.pendingHint,
          isMainThread: !context.agentId,
          surface: "file_read",
        })
      : rangeRead.content;
  let content = textContent;
  let numLines = lineCount;
  let limit_2 = limit;
  let truncationBanner;
  let truncated = false;
  let tokenCount;
  let isWholeFileRead = (offset ?? 1) <= 1 && limit === undefined && pages === undefined;
  try {
    tokenCount = await validateContentTokens(
      allowLarge?.raised
        ? addLineNumbers({
            content: textContent,
            startLine: Math.max(1, offset),
            tabAwareSeparator: isTabReadSeparationEnabled(),
          })
        : textContent,
      ext,
      maxTokens_2,
      context.credentials,
      isWholeFileRead,
      allowLarge?.raised !== undefined,
    );
    if (allowLarge?.raised && tokenCount !== undefined) {
      let maxTokens_2 = room().raised?.maxTokens ?? maxTokens;
      if (tokenCount > maxTokens_2) throw new MaxFileReadTokenExceededError(tokenCount, maxTokens_2);
      context.contextRoom()?.claim(tokenCount);
    }
  } catch (error) {
    if (error instanceof MaxFileReadTokenExceededError && isWholeFileRead) {
      tokenCount = error.tokenCount;
      let allowLargeHint = getAllowLargeHint(room(), allowLarge !== undefined, {
        tokens: error.tokenCount,
      });
      let sizeDescription =
        allowLarge?.raised && error.maxTokens > maxTokens
          ? `${ALLOW_LARGE_PARAM} had room for ${error.maxTokens} tokens this turn`
          : `cap ${maxTokens}`;
      let lines = textContent.split(`
`);
      let max = Math.max(0.5, textContent.length / Math.max(1, error.tokenCount));
      let tokensFor = (text) => text.length / max;
      let max_2 = Math.max(
        1,
        Math.min(
          lines.length,
          Math.floor(((lines.length * maxTokens) / Math.max(1, error.tokenCount)) * 0.85),
        ),
      );
      let text = lines.slice(0, max_2).join(`
`);
      for (let idx = 0; idx < 6; idx++) {
        if (tokensFor(text) <= maxTokens || max_2 <= 1) break;
        max_2 = Math.max(1, Math.floor(max_2 * 0.7));
        text = lines.slice(0, max_2).join(`
`);
      }
      if (tokensFor(text) > maxTokens || text.trim() === "") {
        let max_2 = Math.max(1, Math.floor(maxTokens * max * 0.85));
        for (let idx = 0; idx < 6; idx++) {
          text = textContent.slice(0, max_2);
          if (tokensFor(text) <= maxTokens) break;
          max_2 = Math.max(1, Math.floor(max_2 * 0.7));
        }
        let code = text.charCodeAt(text.length - 1);
        if (code >= 55296 && code <= 56319) text = text.slice(0, -1);
        truncated = true;
      }
      content = text;
      numLines = truncated
        ? countCharInString(
            text,
            `
`,
          ) + 1
        : max_2;
      limit_2 = numLines;
      truncationBanner =
        !truncated && numLines < totalLines
          ? TRUNCATED_PARTIAL_VIEW_PREFIX +
            `${fullFilePath}: showing lines 1-${numLines} of ${totalLines} total (${error.tokenCount} tokens, ${sizeDescription}). Call ${FILE_READ_TOOL_NAME} with offset=${numLines + 1} limit=${numLines} for the next page, or ${GREP_TOOL_NAME} to find a specific section.${allowLargeHint} Do NOT answer from this page alone if the answer may be further in the file.]`
          : TRUNCATED_PARTIAL_VIEW_PREFIX +
            `${fullFilePath}: showing the first ${text.length} of ${textContent.length} characters (${error.tokenCount} tokens, ${sizeDescription}); this file has very long lines and cannot be paginated by line. Use ${GREP_TOOL_NAME} to find a specific section, or ${FILE_READ_TOOL_NAME} with offset/limit to page through it.${allowLargeHint} Do NOT answer from this excerpt alone if the answer may be elsewhere in the file.]`;
    } else throw attachAllowLargeHintToSizeError(error, allowLargeContext);
  }
  readFileState.set(fullFilePath, {
    content,
    timestamp: Math.floor(mtimeMs),
    offset,
    limit: limit_2,
    ...(truncationBanner !== undefined && {
      isPartialView: true,
    }),
  });
  let nestedMemoryAttachmentTriggers = context.nestedMemoryAttachmentTriggers;
  if (nestedMemoryAttachmentTriggers && !nestedMemoryAttachmentTriggers.includes(fullFilePath))
    nestedMemoryAttachmentTriggers.push(fullFilePath);
  let artifactRead;
  let artifactCoverageNote;
  let commitHandoverRead;
  if (context.remoteCall === undefined && getLiveState().pendingHandoverReads.has(fullFilePath)) {
    let { prepareHandoverRead, describeHandoverCoverage } =
      await import("../../services/artifacts/handoverRead.js");
    let handoverRead = await prepareHandoverRead(fullFilePath, context, messageId, {
      firstLine: offsetIndex,
      lineCount: truncated ? numLines - 1 : numLines,
      totalLines,
      mtimeMs,
    });
    artifactRead = handoverRead.artifactRead;
    if (handoverRead.remaining !== undefined)
      artifactCoverageNote = `[This file is the saved source of artifact ${handoverRead.remaining.slug} at version ${handoverRead.remaining.ver} (${describeHandoverCoverage(handoverRead.remaining)}); that version counts as viewed only once you have Read every line of it.]`;
    commitHandoverRead = () => {
      let artifactReadResult = handoverRead.commit();
      if (artifactReadResult !== undefined) textResult.artifactRead = artifactReadResult;
      else if (textResult.artifactRead !== undefined) delete textResult.artifactRead;
    };
  }
  let textResult = {
    type: "text",
    file: {
      filePath,
      content,
      numLines,
      startLine: truncationBanner !== undefined ? Math.max(1, offset) : offset,
      totalLines,
      ...(truncationBanner !== undefined && {
        truncatedByTokenCap: true,
      }),
    },
    ...(artifactRead && {
      artifactRead,
    }),
  };
  if (isAutoMemFilePath(fullFilePath)) memoryFileMtimeByResult.set(textResult, mtimeMs);
  if (artifactCoverageNote !== undefined) artifactCoverageNoteByResult.set(textResult, artifactCoverageNote);
  if (rangeRead.notText !== undefined)
    notTextNoteByResult.set(textResult, fileReadEncodingNote(rangeRead.notText));
  if (truncationBanner !== undefined) setCachedReadingLimit(textResult, truncationBanner);
  logFileOperation({
    operation: "read",
    tool: "FileReadTool",
    filePath: fullFilePath,
    content,
  });
  let analyticsExt = detectSessionFileType(fullFilePath);
  logEvent("tengu_session_file_read", {
    totalLines,
    readLines: numLines,
    totalBytes,
    readBytes: truncationBanner !== undefined ? Buffer.byteLength(content, "utf8") : readBytes,
    offset,
    ...(limit !== undefined && {
      limit,
    }),
    ...(ext_2 !== undefined && {
      ext: ext_2,
    }),
    ...(messageId !== undefined && {
      messageID: sanitizeMarkName(messageId),
    }),
    is_session_transcript: analyticsExt === "session_transcript",
    ...(allowLarge && {
      allow_large: true,
    }),
    reads_own_output: classifySavedOutputPath(fullFilePath, context.session),
  });
  if (allowLarge)
    logAllowLargeOutcome(
      allowLarge,
      fromEnum(truncationBanner === undefined ? "fit" : "paged"),
      {
        totalBytes,
        totalLines,
        readLines: numLines,
        ...(tokenCount !== undefined && {
          tokens: tokenCount,
        }),
      },
      ext_2,
    );
  return {
    data: textResult,
    ...(commitHandoverRead && {
      afterResultCommitted: commitHandoverRead,
    }),
  };
}
//@ chunk-e6aww6q8.js:3190604-3190625 layout
var MAX_IMAGE_READ_BYTES = MAX_CHROME_UPLOAD_BYTES;
var IMAGE_STREAM_CHUNK_BYTES = 65536;
//@ chunk-e6aww6q8.js:3190625-3190936 layout
/**
 * 读取图片字节：句柄或路径，可指定最大字节数。
 */
async function readImageBytes(source, maxBytes, signal) {
  if (typeof source !== "string") {
    if (maxBytes === undefined) return readImageBytesFromHandle(source.handle, source.ioPath, signal);
    let stats = await source.handle.stat();
    return stats.isFile()
      ? (await readHandleBounded(source.handle, maxBytes, stats.size)).bytes
      : Buffer.alloc(0);
  }
  if (maxBytes !== undefined) return getFsImplementation().readFileBytes(source, maxBytes);
  await using fileHandle = await open(source, constants.O_RDONLY | READ_LIMITS);
  return await readImageBytesFromHandle(fileHandle, source, undefined);
}
//@ chunk-e6aww6q8.js:3190936-3191756 layout
/**
 * 从句柄读图片：普通文件超过上限直接拒绝；管道/设备按块读取到上限，超过则报错。
 */
async function readImageBytesFromHandle(handle, ioPath, signal) {
  let stats = await handle.stat();
  if (stats.isFile()) {
    let readResult =
      stats.size > MAX_IMAGE_READ_BYTES
        ? undefined
        : await readHandleBounded(handle, MAX_IMAGE_READ_BYTES, stats.size);
    if (readResult === undefined || readResult.overLimit)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `File is too large to read as an image (the limit is ${formatFileSize(MAX_IMAGE_READ_BYTES)}): ${ioPath}. If it is an image, resize it or export a smaller copy, then read that.`,
        "File over the image read limit",
      );
    return readResult.bytes;
  }
  let chunks = [];
  let chunk = Buffer.alloc(0);
  let chunkFill = 0;
  let totalBytes = 0;
  while (totalBytes <= MAX_IMAGE_READ_BYTES) {
    if (signal?.aborted) throw new AbortError_2();
    if (chunkFill === chunk.length) {
      chunk = Buffer.allocUnsafe(
        Math.min(Math.max(totalBytes, IMAGE_STREAM_CHUNK_BYTES), MAX_IMAGE_READ_BYTES + 1 - totalBytes),
      );
      chunks.push(chunk);
      chunkFill = 0;
    }
    let readPromise = handle.read(chunk, chunkFill, chunk.length - chunkFill, null);
    let { bytesRead } = await (signal === undefined
      ? readPromise
      : raceWithAbortSignal(readPromise, signal, () => new AbortError_2()));
    if (bytesRead === 0) break;
    chunkFill += bytesRead;
    totalBytes += bytesRead;
  }
  if (totalBytes > MAX_IMAGE_READ_BYTES)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot read this as an image: ${ioPath} is a pipe or a device, not a regular file, and it sent more than ${formatFileSize(MAX_IMAGE_READ_BYTES)} without ending.`,
      "Image stream over the read limit",
    );
  return Buffer.concat(chunks, totalBytes);
}
//@ chunk-e6aww6q8.js:3191756-3193372 facade-exports = readImageWithTokenBudget (0.561)
/**
 * 按 token 预算读取图片：校验非空与魔数，按模型限制缩放/重编码，超出字节上限再压缩；估算 token 超出上限时压缩到 token 限制，失败则降为 400x400 JPEG。
 */
async function readImageWithTokenBudget(
  source,
  maxTokens = getDefaultFileReadingLimits().maxTokens,
  maxBytes,
  imageLimits,
  maxRawBytes = MODEL_COPY_IMAGE_BYTES,
  allowDirectWebp = true,
  signal,
) {
  let labelPath = typeof source === "string" ? source : source.ioPath;
  let imageBuffer = await readImageBytes(source, maxBytes, signal);
  let originalSize = imageBuffer.length;
  if (originalSize === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Image file is empty: ${labelPath}`,
      "Image file is empty",
    );
  let detectedMediaType = sniffImageMediaType(imageBuffer);
  if (detectedMediaType === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `File has an image extension but its content is not a valid PNG/JPEG/GIF/WebP. Detected: ${detectHtmlDocument(imageBuffer)}. This usually means a download saved an error/login page instead of the image. Use \`file "${labelPath}"\` to confirm, or read it as text with ${BASH_TOOL_NAME} (e.g. \`head -c 500\`).`,
      "Image extension but invalid magic bytes",
    );
  let detectedFormat = detectedMediaType.split("/")[1] || "png";
  let result;
  try {
    let resized = await maybeResizeAndDownsampleImageBuffer(
      imageBuffer,
      originalSize,
      detectedFormat,
      imageLimits,
      {
        directWebpMaxBytes: allowDirectWebp ? webpMaxBytesIfOn(maxRawBytes) : undefined,
      },
    );
    let buffer = resized.buffer;
    if (buffer.length > maxRawBytes)
      buffer = await compressToJpegUnderBytes(resized.buffer, maxRawBytes, resized.mediaType);
    buffer = await chooseImageEncoding(
      imageBuffer,
      resized.buffer,
      buffer,
      maxRawBytes,
      allowDirectWebp,
      resized.losslessWebp,
    );
    result = createImageResponse(
      buffer,
      detectImageFormatFromBuffer(buffer).slice(6),
      originalSize,
      resized.dimensions,
    );
  } catch (e) {
    if (e instanceof ImageResizeError) throw e;
    if (isUnknownImageErrorType(classifyImageErrorCode(e))) logError(e);
    else
      logForDebugging(`Image budget pass failed: ${errorMessage(e)}`, {
        level: "error",
      });
    result = createImageResponse(imageBuffer, detectedFormat, originalSize);
  }
  let dimensions = result.file.dimensions;
  let displayWidth = dimensions?.displayWidth;
  let displayHeight = dimensions?.displayHeight;
  let tileCount;
  if (displayWidth && displayHeight) tileCount = imageTileCount(displayWidth, displayHeight);
  else {
    let webpHeader = parseWebpHeader(imageBuffer);
    tileCount = webpHeader
      ? imageTileCount(webpHeader.width, webpHeader.height)
      : imageTileCount(imageLimits.maxWidth, imageLimits.maxHeight);
  }
  if (tileCount > maxTokens)
    try {
      let compressed = await compressImageBufferWithTokenLimit(imageBuffer, maxTokens, detectedMediaType);
      return {
        type: "image",
        file: {
          base64: compressed.base64,
          type: compressed.mediaType,
          originalSize,
        },
      };
    } catch (error) {
      logForDebugging(
        `Image compression failed for ${labelPath}: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
      try {
        let fallbackBuffer = await (
          await loadImageDecoder()
        )(imageBuffer)
          .resize(400, 400, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({
            quality: 20,
          })
          .toBuffer();
        return createImageResponse(fallbackBuffer, "jpeg", originalSize);
      } catch (error) {
        logForDebugging(
          `Fallback image compression failed for ${labelPath}: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "error",
          },
        );
        return createImageResponse(imageBuffer, detectedFormat, originalSize);
      }
    }
  return result;
}
export {
  FileReadTool,
  resetPdfPagesThisTurn,
  getDevicePathRefusal,
  MaxFileReadTokenExceededError,
  validateContentTokens,
  allowLargeRoomTokens,
  readImageWithTokenBudget,
  isUncountedPDFOverWholeReadCap,
  toEncoderFormat,
  rememberPdfPageLimits,
};
