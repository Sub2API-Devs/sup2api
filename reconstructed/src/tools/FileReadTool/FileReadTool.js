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
import * as pathModule from "path";
import * as pathModule_2 from "path";
import * as pathModule_3 from "path";
import {
  extname,
  extname as extname_2,
  extname as extname_3,
  extname as extname_4,
  win32,
  win32 as win32_2,
  win32 as win32_3,
  win32 as win32_4,
  win32 as win32_5,
  win32 as win32_6,
  win32 as win32_7,
  win32 as win32_8,
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  posix as posix_6,
  posix as posix_7,
  posix as posix_8,
  posix as posix_9,
  posix as posix_10,
  posix as posix_11,
  posix as posix_12,
} from "path";
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
} from "fs/promises";
import {
  constants,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  constants as constants_9,
  constants as constants_10,
  constants as constants_12,
  constants as constants_13,
  constants as constants_14,
  constants as constants_15,
  constants as constants_16,
  constants as constants_17,
  constants as constants_18,
  constants as constants_19,
  constants as constants_20,
  constants as constants_21,
  constants as constants_22,
  constants as constants_23,
  constants as constants_24,
  constants as constants_25,
  constants as constants_26,
  constants as constants_27,
} from "fs";
import { getToolResultFromCell, readNotebook, NOTEBOOK_TOO_LARGE_HINT } from "../../utils/notebook.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { env } from "../../utils/env.js";
import { H8, mediaLimitsForRoute, vY, mut, imageTileCount } from "../../utils/truncateGraphemes.js";
import { FILE_READ_TOOL_NAME, Mge, IMAGE_EXTENSIONS, ALLOW_LARGE_PARAM } from "./constants.js";
import { CFe, $Yt } from "../../utils/model/claude3Models.js";
import { parsePDFPageRange } from "../../utils/pdfUtils.js";
import {
  lastExistingIdentity,
  openReadBoundToApproval,
  rethrowWithPath,
} from "../../utils/fsSafety/pathRevalidation.js";
import { getClaudeConfigDirOrNull } from "../../utils/envUtils.js";
import {
  imageMediaTypeSchema,
  Ph,
  fileReadInputSchema,
} from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { Ir, u, T, o, E, M, A, qne, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { freeze as freeze_27 } from "../../../vendor/zod/v4/core/core.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
  Dat,
  aos,
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
  s4,
} from "../../utils/imageResizer.js";
import {
  userFacingName as userFacingName_3,
  getToolUseSummary as getToolUseSummary_5,
  getAgentOutputTaskId,
} from "./UI.js";
import { zCe } from "../../utils/remoteTools/toolHostRouting.js";
import { $r, $Fe, Cf, yO, hostFieldNotForwardedMessage } from "../../bridge/deviceRegistration.js";
import { getCwd } from "../../utils/cwd.js";
import { expandStablePath, isNotebookPath } from "../../utils/path.js";
import {
  matchesPathRule,
  checkReadPermissionForTool,
  matchingRuleForInput,
} from "../../utils/permissions/filesystem.js";
import {
  walkPermissionCheckPaths,
  readHandleUpTo,
  getFsImplementation,
  permissionCheckSpellings,
} from "../../utils/fsOperations.js";
import { getPlatform } from "../../utils/platform.js";
import { rejectNullBytes, rejectTrailingWhitespace } from "../../utils/filePathValidation.js";
import { DENIED_DIRECTORY_ERROR } from "../FileEditTool/constants.js";
import { Qn } from "../../utils/pathClassification.js";
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
import { encodeControlChars } from "../../utils/sanitization.js";
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
import { Q_ } from "../../utils/instructionFileAccess.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logFileOperation } from "../../utils/fileOperationAnalytics.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { readPdfExtractedPages } from "./pdfPages.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import { consumeClaudeCodeHints } from "../../utils/claudeCodeHints.js";
import { GREP_TOOL_NAME } from "../GrepTool/prompt.js";
import { isAutoMemFilePath } from "../../utils/memoryFileDetection.js";
import { fileReadEncodingNote } from "../FileEditTool/fileStateErrors.js";
import { ye } from "../../utils/startupMarks.js";
import { y3o } from "../../utils/claudeInChrome/fileUpload.js";
import { readHandleBounded } from "../../utils/fsSafety/boundOpen.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { detectHtmlDocument, parseWebpHeader } from "../../utils/imageFormats.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { fEn, chooseImageEncoding } from "../../utils/imageWebp.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { unresolvablePathMessage } from "../../utils/invisibleChars.js";
import { consumePermissionStash } from "../../utils/fsSafety/atomicWriteStaging.js";

//@ chunk-e6aww6q8.js:3155422-3155659 placement
function buildNotebookToolResult(e, n) {
  let flattened = e.flatMap(getToolResultFromCell);
  return {
    tool_use_id: n,
    type: "tool_result",
    content: flattened.reduce((s, h) => {
      if (s.length === 0) return [h];
      let at = s.at(-1);
      if (at && at.type === "text" && h.type === "text")
        return (
          (at.text +=
            `
` + h.text),
          s
        );
      return (s.push(h), s);
    }, []),
  };
}
//@ chunk-e6aww6q8.js:3158356-3158427 placement
var uCr = 167000,
  cCr = 300,
  eAe = new SessionRootSlot(() => ({ last: void 0, pagesThisTurn: 0 }));
//@ chunk-e6aww6q8.js:3158427-3158462 placement
function tXs(e, n) {
  eAe.of(e).last = n;
}
//@ chunk-e6aww6q8.js:3158462-3158528 placement
function nXs(e) {
  let peek = eAe.peek(e);
  if (peek !== void 0) peek.pagesThisTurn = 0;
}
//@ chunk-e6aww6q8.js:3158528-3158597 placement
function Nvn(e, n) {
  let peek = eAe.peek(e);
  if (peek !== void 0) peek.pagesThisTurn += n;
}
/**
 * PDF 每条消息页数限制启用时返回每消息/每轮的页数上限与已用页数，否则 undefined。
 */
//@ chunk-e6aww6q8.js:3158597-3158953 placement
function getPdfPageLimits(e, n) {
  let peek = eAe.peek(e),
    s = peek?.last;
  if (peek === void 0 || s === void 0 || !s.enabled || !s.enforced || !(s.threshold <= uCr)) return;
  let h = env.CLAUDE_CODE_FILE_READ_MAX_PDF_PAGES_PER_MESSAGE;
  if (h === void 0 || h >= H8) return;
  return {
    pagesPerMessage: h,
    pagesThisMessage: countPdfPagesInMessages(n, h),
    pagesPerTurn: env.CLAUDE_CODE_FILE_READ_MAX_PDF_PAGES_PER_TURN ?? cCr,
    pagesThisTurn: peek.pagesThisTurn,
  };
}
/**
 * 统计消息中 Read 工具读取 PDF 指定页的总页数（不超过上限时累加）。
 */
//@ chunk-e6aww6q8.js:3158953-3159330 placement
function countPdfPagesInMessages(e, n) {
  let r = 0;
  for (let s of e ?? [])
    for (let h of s.message.content) {
      if (h.type !== "tool_use" || h.name !== FILE_READ_TOOL_NAME) continue;
      let input = h.input;
      if (
        typeof input !== "object" ||
        input === null ||
        !("pages" in input) ||
        typeof input.pages !== "string" ||
        !("file_path" in input) ||
        typeof input.file_path !== "string" ||
        !CFe(extname_3(input.file_path))
      )
        continue;
      let S = parsePDFPageRange(input.pages),
        w = S === null ? 0 : S.lastPage - S.firstPage + 1;
      if (r + w <= n) r += w;
    }
  return r;
}
/**
 * restoreTransientForRemap：重映射结果时把旧结果里的 PDF 页图/base64 等瞬态字段补回新结果。
 */
//@ chunk-e6aww6q8.js:3159330-3159937 layout
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
    if (next.pages !== void 0 || previous.pages === void 0 || next.file.filePath !== previous.file.filePath)
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
    return { ...next, file: { ...next.file, base64: previous.file.base64 } };
  }
  return next;
}
/**
 * 取文件身份；文件名形如截图（"... AM.png"）时同时取备用拼写的身份。
 */
//@ chunk-e6aww6q8.js:3159937-3160092 layout
async function getScreenshotPathIdentities(e, n) {
  let r = await lastExistingIdentity(n),
    s = getAlternateScreenshotPath(e);
  if (s === void 0) return { own: r, alt: void 0 };
  let h = await lastExistingIdentity(mapSpellingsToAlternatePath(n, s));
  return { own: r, alt: { path: s, identity: h } };
}
/**
 * 把每个已批准的路径拼写换成备用截图文件名（同目录）。
 */
//@ chunk-e6aww6q8.js:3160092-3160175 fingerprint = getAlternateScreenshotPath (0.702)
function mapSpellingsToAlternatePath(e, n) {
  let filename = pathModule_2.basename(n);
  return e.map((s) => pathModule_2.join(pathModule_2.dirname(s), filename));
}
//@ chunk-e6aww6q8.js:3160175-3160209 file-local
var THIN_SPACE = String.fromCharCode(8239);
/**
 * macOS 截图文件名在 "AM/PM.png" 前用普通空格或 U+202F 窄空格，返回另一种空格的路径；不匹配返回 undefined。
 */
//@ chunk-e6aww6q8.js:3160209-3160397 layout
function getAlternateScreenshotPath(e) {
  let base = pathModule_2.basename(e),
    r = /^(.+)([ \u202F])(AM|PM)(\.png)$/,
    match = base.match(r);
  if (!match) return;
  let h = match[2],
    y = h === " " ? THIN_SPACE : " ";
  return e.replace(`${h}${match[3]}${match[4]}`, `${y}${match[3]}${match[4]}`);
}
/**
 * 配置目录下 projects/**.jsonl 判为 "session_transcript"（读会话记录的统计）。
 */
//@ chunk-e6aww6q8.js:3160397-3160592 fingerprint = detectSessionFileType (0.899)
function detectSessionFileType(filePath) {
  let configDir = getClaudeConfigDirOrNull();
  if (configDir === null || !filePath.startsWith(configDir)) return null;
  let normalizedPath = filePath.split(win32_2.sep).join(posix_3.sep);
  if (normalizedPath.includes("/projects/") && normalizedPath.endsWith(".jsonl")) return "session_transcript";
  return null;
}
//@ chunk-e6aww6q8.js:3161562-3164693 fingerprint = outputSchema (0.761)
function makeFileReadOutputSchema(e) {
  let n = imageMediaTypeSchema();
  return Ir("type", [
    u({
      type: T("text"),
      file: u({
        filePath: o().describe("The path to the file that was read"),
        content: o().describe("The content of the file"),
        numLines: E().describe("Number of lines in the returned content"),
        startLine: E().describe("The starting line number"),
        totalLines: E().describe("Total number of lines in the file"),
        truncatedByTokenCap: M()
          .optional()
          .describe(
            "True when a whole-file read was auto-paginated because it exceeded the token cap (the content is a partial first page). A programmatic signal for internal consumers; survives output reconstruction (unlike the render-time banner).",
          ),
      }),
      artifactRead: u({ slug: o(), ver: o() })
        .optional()
        .describe(
          "Set when this Read completed a saved Artifact source file: the Artifact and the version of it that now counts as viewed.",
        ),
    }),
    u({
      type: T("image"),
      file: u({
        base64: o().describe("Base64-encoded image data"),
        type: n.describe("The MIME type of the image"),
        originalSize: E().describe("Original file size in bytes"),
        dimensions: u({
          originalWidth: E().optional().describe("Original image width in pixels"),
          originalHeight: E().optional().describe("Original image height in pixels"),
          displayWidth: E().optional().describe("Displayed image width in pixels (after resizing)"),
          displayHeight: E().optional().describe("Displayed image height in pixels (after resizing)"),
        })
          .optional()
          .describe("Image dimension info for coordinate mapping"),
      }),
    }),
    u({
      type: T("notebook"),
      file: u({ filePath: o().describe("The path to the notebook file"), cells: e }),
    }),
    u({
      type: T("pdf"),
      file: u({
        filePath: o().describe("The path to the PDF file"),
        base64: o().describe("Base64-encoded PDF data"),
        originalSize: E().describe("Original file size in bytes"),
      }),
    }),
    u({
      type: T("parts"),
      file: u({
        filePath: o().describe("The path to the PDF file"),
        originalSize: E().describe("Original file size in bytes"),
        count: E().describe("Number of pages extracted"),
        outputDir: o().describe("Directory containing extracted page images"),
      }),
      firstPage: E()
        .optional()
        .describe(
          "Document page number of the first extracted page (1 when no range was requested); labels the page images in the model-facing tool_result",
        ),
      totalPages: E()
        .optional()
        .describe(
          "@internal Number of pages in the document. Set only when the call named no page range and the PDF was too long to read whole, so only its first pages were extracted",
        ),
      pages: A(
        u({
          base64: o().describe("Base64-encoded page image; empty when the page could not be processed"),
          mediaType: n.describe("The MIME type of the image"),
          error: o()
            .optional()
            .describe("Why the page could not be processed as an image; set only when base64 is empty"),
        }),
      )
        .optional()
        .describe(
          "Extracted page images, in page order. Present only transiently in-process: the page image bytes are delivered solely as image blocks in the model-facing tool_result content and are not retained on the tool_use_result, so this key is absent on the emitted/persisted result",
        ),
    }),
    u({
      type: T("file_unchanged"),
      file: u({ filePath: o().describe("The path to the file") }),
      source: T("seeded")
        .optional()
        .describe(
          "Set when the dedup matched a startup-seeded entry (CLAUDE.md / nested memory) rather than a prior Read tool_result",
        ),
    }),
  ]);
}
//@ chunk-e6aww6q8.js:3164693-3164860 layout
var fileReadOutputSchema = DoctorLazy(() =>
    makeFileReadOutputSchema(A(qne()).describe("Array of notebook cells")),
  ),
  PRIMITIVE_TYPEOF_NAMES = new Set(["string", "number", "boolean"]),
  BASE64_PREFIX_RE = /^(?:[^A-Za-z0-9+/_=-]*[A-Za-z0-9+/_=-]){0,16}/,
  MAX_NOTEBOOK_FIELD_LENGTH = 64;
//@ chunk-e6aww6q8.js:3164860-3165052 layout
function flattenToCommaString(e) {
  let n = [],
    r = [e];
  while (r.length > 0) {
    let s = r.pop();
    if (Array.isArray(s) && s.length > 0) for (let h = s.length - 1; h >= 0; h--) r.push(s[h]);
    else n.push(s === null ? "" : String(s));
  }
  return n.join(",");
}
//@ chunk-e6aww6q8.js:3165052-3165853 layout
var crossProcessNotebookCellsSchema = DoctorLazy(() => {
    let transform = oe().transform((r, s) => {
        if (r === null || PRIMITIVE_TYPEOF_NAMES.has(typeof r)) return r;
        try {
          if (r !== void 0) return [flattenToCommaString(r)];
        } catch {}
        return (s.addIssue({ code: "custom", message: "Missing, or no text can be made of it." }), freeze_27);
      }),
      transform_2 = u({ image_data: o(), media_type: imageMediaTypeSchema() }).transform((r) =>
        Ph(Buffer.from(BASE64_PREFIX_RE.exec(r.image_data)[0], "base64")) === null ? void 0 : r,
      );
    return A(
      u({
        cellType: transform.optional(),
        source: o(),
        execution_count: transform
          .optional()
          .catch(void 0)
          .transform((r) => (String(r).length > MAX_NOTEBOOK_FIELD_LENGTH ? void 0 : r)),
        cell_id: transform,
        language: transform.optional(),
        outputs: A(
          u({
            output_type: o().refine((r) => r.length <= MAX_NOTEBOOK_FIELD_LENGTH),
            text: o().optional(),
            image: transform_2.nullish(),
          }).nullable(),
        ).optional(),
      }).transform((r) => (r.cellType === "code" ? r : Uo(r, ["language"]))),
    );
  }),
  fileReadOutputSchemaAcrossProcesses = DoctorLazy(() =>
    makeFileReadOutputSchema(crossProcessNotebookCellsSchema())
      .refine((e) => e.type !== "file_unchanged")
      .transform((e) => (e.type === "text" ? Uo(e, ["artifactRead"]) : e)),
  );
//@ chunk-e6aww6q8.js:3165853-3165961 layout
function withResultFilePath(e, n) {
  return typeof e.file === "object" && "filePath" in e.file ? { ...e, file: { ...e.file, filePath: n } } : e;
}
//@ chunk-e6aww6q8.js:3165961-3166167 layout
function sanitizePartsResultFromAnotherProcess(e) {
  if (e.type !== "parts") return e;
  let n = (r) => escapeXmlInline(clipText(r, 2000));
  return {
    ...e,
    file: { ...e.file, outputDir: n(e.file.outputDir) },
    pages: e.pages?.map((r) => ({ ...r, ...(r.error !== void 0 && { error: n(r.error) }) })),
  };
}
//@ chunk-e6aww6q8.js:3166167-3166290 layout
function stripPdfPageImages(e) {
  if (typeof e !== "object" || e === null || e.type !== "parts" || e.pages === void 0) return e;
  let { pages: pages, ...r } = e;
  return r;
}
/**
 * 解析并检查 pages 参数：只接受单页或单区间；上下文满过一次后按每消息/每轮 PDF 页数预算拒绝（错误码 17/18）；超过每请求 20 页拒绝（8）。
 */
//@ chunk-e6aww6q8.js:3166290-3167545 layout
function validatePdfPagesParam(pagesParam, n) {
  let pageRange = parsePDFPageRange(pagesParam);
  if (!pageRange)
    return {
      ok: !1,
      message: `Invalid pages parameter: "${pagesParam}". Give one page ("3") or one range ("1-5"), not a list. To read several pages or ranges, read each one separately. Pages are 1-indexed.`,
      errorCode: 7,
    };
  let requestedPageCount =
    pageRange.lastPage === 1 / 0 ? H8 + 1 : pageRange.lastPage - pageRange.firstPage + 1;
  if (n !== void 0) {
    let {
      pagesPerMessage: pagesPerMessage,
      pagesThisMessage: pagesThisMessage,
      pagesPerTurn: pagesPerTurn,
      pagesThisTurn: pagesThisTurn,
    } = n;
    if (pagesThisTurn + Math.min(requestedPageCount, pagesPerMessage) > pagesPerTurn)
      return {
        ok: !1,
        message: `The context has filled up once already, and ${pagesThisTurn} PDF pages have been asked for; the most before you give your answer is ${pagesPerTurn}. "${pagesParam}" was not read. Read no more PDF pages now: answer from what you have read, tell the user which pages you did not reach, and that they can ask you to go on in their next message.`,
        errorCode: 18,
      };
    if (pagesThisMessage + requestedPageCount > pagesPerMessage)
      return {
        ok: !1,
        message: `The context has filled up once already. Until you give your answer, each of your messages can read at most ${pagesPerMessage} PDF ${plural(pagesPerMessage, "page")}, counting all of its ${FILE_READ_TOOL_NAME} calls. "${pagesParam}" was not read. Ask for it in later messages, at most ${pagesPerMessage} ${plural(pagesPerMessage, "page")} in each. You need not wait for the user between messages.`,
        errorCode: 17,
      };
  }
  if (requestedPageCount > H8)
    return {
      ok: !1,
      message: `Page range "${pagesParam}" exceeds maximum of ${H8} pages per request. Please use a smaller range.`,
      errorCode: 8,
    };
  return { ok: !0, range: pageRange };
}
/**
 * 把工具上下文与单次调用信息合成一个只读 getter 对象（session、readFileState、contextRoom、signal、fileReadingLimits 等）。
 */
//@ chunk-e6aww6q8.js:3167545-3168667 layout
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
/**
 * 本地调用且上下文已压缩过时返回本轮 PDF 页数预算，否则 undefined。
 */
//@ chunk-e6aww6q8.js:3168667-3168772 layout
function getPdfPageBudget(e) {
  return e.remoteCall === void 0 && hasNoUserPromptSinceCompact(e.messages())
    ? getPdfPageLimits(e.session, e.sameTurnToolUses)
    : void 0;
}
/**
 * Read 工具定义（name "Read"）。读文本/图片/PDF/notebook；validateInput 查空字节、不稳定路径、pages 合法性与预算、Read deny、二进制扩展名、设备文件、远程 PDF 预算；checkPermissions 走 checkReadPermissionForTool 并在 macOS 暂存截图备用路径身份；maxResultSizeChars 为 Infinity。
 */
//@ chunk-e6aww6q8.js:3168772-3174590 facade-exports = FileReadTool (0.519)
var FileReadTool = buildTool({
  name: FILE_READ_TOOL_NAME,
  ruleContentField: "file_path",
  searchHint: "read files, images, PDFs, notebooks",
  remoteExecution: {
    supported: !0,
    decidingInputFields: ["file_path", "offset", "limit", "pages", "allow_large"],
  },
  backgrounding: "never",
  maxResultSizeChars: 1 / 0,
  strict: !0,
  async description() {
    return DESCRIPTION;
  },
  async prompt({ model: e, leanPrompt: n, leanRewrite: r }) {
    return renderPromptTemplate(e, Dat() ? TAB_AWARE_LINE_FORMAT_INSTRUCTION : LINE_FORMAT_INSTRUCTION, n, r);
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
  fromAnotherProcess(e, n) {
    let data = sanitizePartsResultFromAnotherProcess(withResultFilePath(e, String(n.file_path ?? "")));
    if (data.type === "text" && data.file.truncatedByTokenCap === !0)
      aos(data, buildReadTruncationNotice(data.file));
    let s =
      data.type === "image" && data.file.dimensions ? createImageMetadataText(data.file.dimensions) : null;
    return {
      data: data,
      ...(s !== null && { newMessages: [createUserMessage({ content: s, isMeta: !0 })] }),
    };
  },
  userFacingName: userFacingName_3,
  getToolUseSummary: getToolUseSummary_5,
  getActivityDescription(e) {
    let n = getToolUseSummary_5(e);
    return n ? `Reading ${n}` : "Reading file";
  },
  isConcurrencySafe() {
    return !0;
  },
  isReadOnly() {
    return !0;
  },
  toAutoClassifierInput(e) {
    let n = zCe(e);
    return n === void 0 ? e.file_path : { file_path: e.file_path, [$r]: n, ...$Fe(e) };
  },
  suppressesAllPermissionUpdates(e) {
    return Cf(e);
  },
  isSearchOrReadCommand() {
    return { isSearch: !1, isRead: !0 };
  },
  getPath({ file_path: e }) {
    return e || (isRemoteOnlyCheck(FILE_READ_TOOL_NAME) ? "" : getCwd());
  },
  backfillObservableInput(e) {
    if (typeof e.file_path === "string" && !isRemoteOnlyCheck(FILE_READ_TOOL_NAME))
      e.file_path = expandStablePath(e.file_path);
  },
  async preparePermissionMatcher({ file_path: e }) {
    return (n) => matchesPathRule(n, e);
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
        return { ...output, file: { ...output.file, content: "" } };
      case "image":
        if (output.file.base64 === "") return output;
        return { ...output, file: { ...output.file, base64: "" } };
      case "pdf":
        if (output.file.base64 === "") return output;
        return { ...output, file: { ...output.file, base64: "" } };
      case "notebook": {
        let { cells: cells } = output.file;
        if (!Array.isArray(cells) || cells.length === 0 || cells[0] == null) return output;
        return { ...output, file: { ...output.file, cells: Array(cells.length) } };
      }
      default:
        return output;
    }
  },
  create(toolContext) {
    return {
      async checkPermissions(n, r) {
        let callContext = createReadCallContext(toolContext, r),
          h = expandStablePath(n.file_path),
          y = walkPermissionCheckPaths(h),
          spellings = y.spellings;
        if (
          (callContext.session.writePermissionStash.stash(callContext.toolUseId, h, spellings, "read"),
          getPlatform() === "macos" && callContext.toolUseId !== void 0)
        ) {
          let { own: own, alt: alt } = await getScreenshotPathIdentities(h, spellings),
            writePermissionStash = callContext.session.writePermissionStash;
          if ((writePermissionStash.stashIdentity(callContext.toolUseId, h, own), alt))
            writePermissionStash.stashIdentity(callContext.toolUseId, alt.path, alt.identity);
        }
        return checkReadPermissionForTool(FileReadTool, n, callContext.permissions(), y);
      },
      async validateInput(n, r) {
        let s = createReadCallContext(toolContext, r),
          { file_path: file_path, pages: pages } = n;
        if (yO() && Cf(n)) return { result: !1, message: hostFieldNotForwardedMessage(), errorCode: 14 };
        let S = rejectNullBytes(FILE_READ_TOOL_NAME, [["file_path", file_path]]);
        if (S) return S;
        let w = rejectTrailingWhitespace(FILE_READ_TOOL_NAME, [["file_path", file_path]]);
        if (w) return w;
        if (pages !== void 0) {
          let ke = validatePdfPagesParam(
            pages,
            CFe(pathModule_2.extname(file_path)) ? getPdfPageBudget(s) : void 0,
          );
          if (!ke.ok) return { result: !1, message: ke.message, errorCode: ke.errorCode };
        }
        let absolutePath = expandStablePath(file_path),
          G = matchingRuleForInput(absolutePath, s.permissions(), "read", "deny");
        if (G !== null)
          return {
            result: !1,
            message: DENIED_DIRECTORY_ERROR,
            errorCode: 1,
            deniedByPermissionRule: !0,
            denyRule: G,
          };
        if (Qn(absolutePath)) return { result: !0 };
        let lower = pathModule_2.extname(absolutePath).toLowerCase();
        if (hasBinaryExtension(absolutePath) && !Mge(absolutePath))
          return {
            result: !1,
            message: `This tool cannot read binary files. The file appears to be a binary ${lower} file. Use a skill for this file type if one is available, or a shell command or script that can read the format.`,
            errorCode: 4,
          };
        let Se = getDevicePathRefusal(file_path, { spellings: [absolutePath], unresolved: !1 });
        if (Se !== void 0) return { result: !1, message: Se, errorCode: 9 };
        if (s.remoteCall !== void 0 && CFe(lower)) {
          let ke = mediaLimitsForRoute(s.remoteCall.origin.transport),
            we = pages === void 0 ? void 0 : validatePdfPagesParam(pages),
            Ee = we !== void 0 && we.ok ? we.range.lastPage - we.range.firstPage + 1 : 0,
            Ae = pages === void 0 && ke.wholePdfMaxRawBytes === 0;
          if (Ae || Ee > ke.pdfMaxPagesPerRead)
            return {
              result: !1,
              message: `${Ae ? "A whole PDF cannot be returned from this machine to the calling session" : `${pages} is too many pages to return from this machine in one call`}. Use the pages parameter with at most ${ke.pdfMaxPagesPerRead} pages per call (for example pages: 1-3, which come back as images), or read the file where the session runs.`,
              errorCode: 16,
            };
        }
        return { result: !0 };
      },
      async call(n, r) {
        let s = createReadCallContext(toolContext, r);
        return readFileToolCall(n, s, r.parentMessage);
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
              source: { type: "base64", data: output.file.base64, media_type: output.file.type },
            },
          ],
        };
      case "notebook":
        return buildNotebookToolResult(output.file.cells, toolUseId);
      case "pdf": {
        let r = `PDF file read: ${output.file.filePath} (${formatFileSize(output.file.originalSize)})`;
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: output.file.base64
            ? [
                { type: "text", text: r },
                {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: output.file.base64 },
                },
              ]
            : r,
        };
      }
      case "parts": {
        let r =
            `PDF pages extracted: ${output.file.count} page(s) from ${output.file.filePath} (${formatFileSize(output.file.originalSize)})` +
            (output.totalPages === void 0
              ? ""
              : `. This PDF has ${output.totalPages} pages. These are pages 1-${output.file.count}. Use the pages parameter to read other pages (e.g., pages: "${output.file.count + 1}-${Math.min(2 * output.file.count, output.totalPages)}").`),
          s = output.pages ?? [],
          h = output.firstPage ?? 1;
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: s.length
            ? [
                { type: "text", text: r },
                ...s.map((y, S) =>
                  y.base64
                    ? { type: "image", source: { type: "base64", data: y.base64, media_type: y.mediaType } }
                    : {
                        type: "text",
                        text: `[Page ${h + S} could not be processed as an image${y.error ? `: ${y.error}` : ""}]`,
                      },
                ),
              ]
            : r,
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
        let r;
        if (output.file.content)
          r =
            memoryFileFreshnessPrefix(output) + addLineNumbers({ ...output.file, tabAwareSeparator: Dat() });
        else if (output.file.numLines >= 1 && output.file.totalLines > 1)
          r = memoryFileFreshnessPrefix(output) + formatNumberedLine("", output.file.startLine, "\t");
        else if (output.file.numLines >= 1 || output.file.totalLines === 0)
          r = "<system-reminder>Warning: the file exists but the contents are empty.</system-reminder>";
        else
          r = `<system-reminder>Warning: the file exists but is shorter than the provided offset (${output.file.startLine}). The file has ${output.file.totalLines} lines.</system-reminder>`;
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: r + formatTrailingResultNotes(output),
        };
      }
    }
  },
});
/**
 * Read 的 call 实现：设备守卫、文件身份、读取上限（env/fileReadingLimits/allow_large 放宽），去重（未变文件返回 file_unchanged，可由 tengu_read_dedup_killswitch 关闭），触发动态技能目录，ENOENT 时尝试截图备用路径并给出 Did you mean 提示。
 */
//@ chunk-e6aww6q8.js:3174590-3177290 layout
async function readFileToolCall(
  { file_path: file_path, offset: offset = 1, limit: limit = void 0, pages: pages, allow_large: allow_large },
  context,
  S,
) {
  let { readFileState: readFileState, fileReadingLimits: fileReadingLimits } = context,
    G = expandStablePath(file_path),
    writePermissionStash = context.session.writePermissionStash,
    holds = writePermissionStash.holds(context.toolUseId, G, "read"),
    takeIdentity = writePermissionStash.takeIdentity(context.toolUseId, G),
    ke = getAlternateScreenshotPath(G),
    we = ke === void 0 ? void 0 : writePermissionStash.takeIdentity(context.toolUseId, ke),
    Ee = readPermissionSpellings(context, G),
    spellings = Ee.spellings,
    Ie = getDevicePathRefusal(file_path, Ee);
  if (Ie !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      Ie,
      "Read refused by the device guard",
    );
  if (!holds && getPlatform() === "macos") {
    let { own: own, alt: alt } = await getScreenshotPathIdentities(G, spellings);
    ((takeIdentity = own), (we = alt?.identity));
  }
  let Me = getDefaultFileReadingLimits(),
    We = fileReadingLimits?.maxSizeBytes ?? Me.maxSizeBytes,
    ze = fileReadingLimits?.maxTokens ?? Me.maxTokens,
    lt = () => computeAllowLargeRoom(context, S, { maxSizeBytes: We, maxTokens: ze }),
    Je = allow_large ? lt() : void 0;
  if (fileReadingLimits !== void 0)
    logEvent("tengu_file_read_limits_override", {
      hasMaxTokens: fileReadingLimits.maxTokens !== void 0,
      hasMaxSizeBytes: fileReadingLimits.maxSizeBytes !== void 0,
    });
  let sliced = pathModule_2.extname(file_path).toLowerCase().slice(1),
    fullFilePath = expandStablePath(file_path);
  if (isNotebookPath(fullFilePath)) ((offset = 1), (limit = void 0));
  let previousReadEntry = readFileState.get(fullFilePath);
  if (previousReadEntry)
    logEvent("tengu_file_read_reread", {
      priorOp: lit_2(
        previousReadEntry.seededFromContext
          ? "seeded"
          : previousReadEntry.offset === void 0
            ? "edit_write"
            : "read",
      ),
    });
  let dedupEntry =
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_read_dedup_killswitch", !1) ||
    context.remoteCall !== void 0 ||
    context.dedupUnchangedReads === !1
      ? void 0
      : readFileState.get(fullFilePath);
  if (!env.CLAUDE_CODE_SIMPLE && context.remoteCall === void 0)
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
      context.remoteCall === void 0 ? getLiveState().pendingHandoverReads.get(fullFilePath) : void 0,
    Yt = (Zt) => {
      let rn = context.agentId ?? "main";
      return (
        pendingHandoverRead !== void 0 &&
        !pendingHandoverRead.completedBy.has(rn) &&
        !pendingHandoverRead.unrecordableBy.has(rn) &&
        Math.floor(Zt) === pendingHandoverRead.mtimeMs
      );
    };
  if (
    dedupEntry &&
    dedupEntry.seededFromContext &&
    !dedupEntry.isPartialView &&
    offset === 1 &&
    limit === void 0
  )
    try {
      let Zt = await getSeededFileMtime(fullFilePath, context.storageV5);
      if (Zt === dedupEntry.timestamp && !Yt(Zt)) {
        let rn = getFileExtensionForAnalytics(fullFilePath);
        return (
          logEvent("tengu_file_read_dedup", { source: lit_2("seeded"), ...(rn !== void 0 && { ext: rn }) }),
          { data: { type: "file_unchanged", file: { filePath: fullFilePath }, source: "seeded" } }
        );
      }
    } catch {}
  if (
    dedupEntry &&
    !dedupEntry.isPartialView &&
    !dedupEntry.contentNotInModelContext &&
    dedupEntry.offset !== void 0
  ) {
    if (dedupEntry.offset === offset && dedupEntry.limit === limit)
      try {
        let rn = await getFileModificationTimeAsync(fullFilePath);
        if (rn === dedupEntry.timestamp && !Yt(rn)) {
          let pn = getFileExtensionForAnalytics(fullFilePath);
          return (
            logEvent("tengu_file_read_dedup", { ...(pn !== void 0 && { ext: pn }) }),
            { data: { type: "file_unchanged", file: { filePath: file_path } } }
          );
        }
      } catch {}
  }
  let qt = {
    file_path: file_path,
    fullFilePath: fullFilePath,
    ext: sliced,
    offset: offset,
    limit: limit,
    pages: pages,
    maxSizeBytes: We,
    maxTokens: ze,
    room: lt,
    allowLarge: Je,
    context: context,
    messageId: S?.message.id,
    approvedPaths: spellings,
    checkedIdentity: takeIdentity,
  };
  try {
    return await callInnerWithFileHandle({ ...qt, resolvedFilePath: fullFilePath });
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") {
      let pn = getAlternateScreenshotPath(fullFilePath);
      if (pn)
        try {
          return await callInnerWithFileHandle({
            ...qt,
            resolvedFilePath: pn,
            approvedPaths: mapSpellingsToAlternatePath(spellings, pn),
            checkedIdentity: we,
          });
        } catch (error) {
          if (!isENOENT(error)) throw error;
        }
      let no = await findSimilarFile(fullFilePath),
        hn = await normalizePathForComparison(fullFilePath),
        ho = `File does not exist. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.`;
      if (hn) ho += ` Did you mean ${hn}?`;
      else if (no) ho += ` Did you mean ${no}?`;
      throw (
        (ho += separateCopyHint(FileReadTool, fullFilePath, context)),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          encodeControlChars(ho),
          "File does not exist",
        )
      );
    }
    throw error;
  }
}
//@ chunk-e6aww6q8.js:3177290-3177310 layout
var memoryFileMtimeByResult = new WeakMap();
/**
 * 结果是记忆文件时返回基于 mtime 的新鲜度说明前缀。
 */
//@ chunk-e6aww6q8.js:3177310-3177380 file-local
function memoryFileFreshnessPrefix(data) {
  let mtimeMs = memoryFileMtimeByResult.get(data);
  if (mtimeMs === void 0) return "";
  return memoryFreshnessNote(mtimeMs);
}
//@ chunk-e6aww6q8.js:3177380-3177416 layout
var artifactCoverageNoteByResult = new WeakMap(),
  notTextNoteByResult = new WeakMap();
/**
 * 把非文本说明、artifact 覆盖说明附加到文本结果末尾。
 */
//@ chunk-e6aww6q8.js:3177416-3177514 layout
function formatTrailingResultNotes(e) {
  return [notTextNoteByResult.get(e), artifactCoverageNoteByResult.get(e)]
    .filter((n) => n !== void 0)
    .map(
      (n) => `

${n}`,
    )
    .join("");
}
/**
 * 取启动预置文件（CLAUDE.md 等）的 mtime；storageV5 下经存储接口 stat。
 */
//@ chunk-e6aww6q8.js:3177514-3177761 layout
async function getSeededFileMtime(e, n) {
  if (isRemoteOnlyCheck(FILE_READ_TOOL_NAME)) throw Error("seeded file not on this machine");
  if (isStorageV5Enabled() && n !== void 0) {
    let r = await statViaStorage(e, n);
    if (r === void 0) throw Error("seeded file not stat-able through the storage interface");
    if (r !== "unserved") return r;
  }
  return getFileModificationTimeAsync(e);
}
//@ chunk-e6aww6q8.js:3177761-3177785 layout
var CONTEXT_ROOM_SAFETY_FACTOR = 0.7,
  MIN_BYTES_PER_TOKEN = 2,
  ALLOW_LARGE_BYTES_PER_TOKEN_FACTOR = 3;
/**
 * 本轮剩余可用上下文 token：(阈值 - max(当前用量, held) - claimed) × 0.7，不小于 0。
 */
//@ chunk-e6aww6q8.js:3177785-3177893 facade-exports
function allowLargeRoomTokens(e, n) {
  let r = Math.max(n, e.held()) + e.claimed();
  return Math.max(0, Math.floor((e.threshold - r) * CONTEXT_ROOM_SAFETY_FACTOR));
}
/**
 * allow_large 时计算放宽额度：本地且有 contextRoom 时，若剩余 token 大于默认上限，则提高 maxTokens 与 maxSizeBytes（按每 token 字节数 ×3）。
 */
//@ chunk-e6aww6q8.js:3177893-3178311 layout
function computeAllowLargeRoom(e, n, r) {
  let contextRoom = e.contextRoom();
  if (contextRoom === void 0 || e.remoteCall !== void 0 || e.inputFromAnotherMachine === !0)
    return { roomTokens: void 0, raised: void 0 };
  let h = n?.message.usage,
    y = h ? getTokenCountFromUsage_5(h) : void 0,
    S = y && getTokenCountFromUsage_2_2(y) > 0 ? getTokenCountFromUsage_2_2(y) + y.output_tokens : 0,
    w = allowLargeRoomTokens(contextRoom, S);
  if (w <= r.maxTokens) return { roomTokens: w, raised: void 0 };
  let { bytesPerToken: bytesPerToken } = getModelContextInfo(e.model());
  return {
    roomTokens: w,
    raised: {
      maxTokens: w,
      maxSizeBytes: Math.max(r.maxSizeBytes, w * bytesPerToken * ALLOW_LARGE_BYTES_PER_TOKEN_FACTOR),
    },
  };
}
/**
 * 记 tengu_file_read_allow_large 事件（结果、是否放宽、roomTokens、扩展名）。
 */
//@ chunk-e6aww6q8.js:3178311-3178483 layout
function logAllowLargeOutcome(e, n, r, s) {
  logEvent("tengu_file_read_allow_large", {
    outcome: n,
    lifted: e.raised !== void 0,
    ...(e.roomTokens !== void 0 && { roomTokens: e.roomTokens }),
    ...r,
    ...(s !== void 0 && { ext: s }),
  });
}
/**
 * 根据剩余上下文与是否已用 allow_large，选择附在超限错误后的提示（可用 allow_large 重试/即使放宽也放不下/此处不可用）。
 */
//@ chunk-e6aww6q8.js:3178483-3178695 layout
function getAllowLargeHint(e, n, r) {
  if (e.roomTokens === void 0) return n ? ALLOW_LARGE_UNAVAILABLE_HINT : "";
  if (n || e.raised === void 0) return ALLOW_LARGE_NO_ROOM_HINT;
  return (r.bytes === void 0 || r.bytes <= e.raised.maxSizeBytes) &&
    (r.tokens === void 0 || r.tokens <= e.raised.maxTokens)
    ? ALLOW_LARGE_RETRY_HINT
    : ALLOW_LARGE_NO_ROOM_HINT;
}
/**
 * 把文件过大、选区过大、token 超限三类错误重建为附带 allow_large 提示的同类错误，并在已 opt-in 时记事件。
 */
//@ chunk-e6aww6q8.js:3178695-3179273 layout
function attachAllowLargeHintToSizeError(
  error,
  { room: room, optedIn: optedIn, readMaxSizeBytes: readMaxSizeBytes, ext: ext },
) {
  let y, S, w;
  if (error instanceof FileTooLargeError && error.maxSizeBytes === readMaxSizeBytes)
    ((w = room()),
      (y = new FileTooLargeError(
        error.sizeInBytes,
        error.maxSizeBytes,
        getAllowLargeHint(w, optedIn, { bytes: error.sizeInBytes }),
      )),
      (S = { totalBytes: error.sizeInBytes }));
  else if (error instanceof SelectedRangeTooLargeError)
    ((w = room()),
      (y = new SelectedRangeTooLargeError(
        error.selectedBytes,
        error.maxSelectedBytes,
        getAllowLargeHint(w, optedIn, { bytes: error.selectedBytes }),
      )),
      (S = { totalBytes: error.selectedBytes }));
  else if (error instanceof MaxFileReadTokenExceededError)
    ((w = room()),
      (y = new MaxFileReadTokenExceededError(
        error.tokenCount,
        error.maxTokens,
        getAllowLargeHint(w, optedIn, { tokens: error.tokenCount }),
      )),
      (S = { tokens: error.tokenCount }));
  else return error;
  if (optedIn) {
    let L = w.roomTokens === void 0 ? "unavailable" : "too_large";
    logAllowLargeOutcome(w, fromEnum(L), S, ext);
  }
  return y;
}
/**
 * 校验内容 token 数：粗估不超过上限 1/4 直接通过；字符数超过上限×128 直接抛 MaxFileReadTokenExceededError；否则调用 token 计数 API，超限抛错。
 */
//@ chunk-e6aww6q8.js:3179273-3179557 facade-exports
async function validateContentTokens(content, n, r, s, h = !1, y = !1) {
  let maxTokens = r ?? getDefaultFileReadingLimits().maxTokens,
    w = roughTokenCountEstimationForFileType(content, n),
    estimatedTokens = y && w ? Math.max(w, Math.ceil(Buffer.byteLength(content) / MIN_BYTES_PER_TOKEN)) : w;
  if (!estimatedTokens || estimatedTokens <= maxTokens / 4) return estimatedTokens || void 0;
  if (!h && content.length > maxTokens * MAX_CHARS_PER_TOKEN)
    throw new MaxFileReadTokenExceededError(estimatedTokens, maxTokens);
  let exactTokens =
    (await timeAttachment("token_count", () => countTextTokensWithAPI(content, s))) ?? estimatedTokens;
  if (exactTokens > maxTokens) throw new MaxFileReadTokenExceededError(exactTokens, maxTokens);
  return exactTokens;
}
/**
 * 构造 image 类型的 Read 结果（base64、image/<type>、原始大小、尺寸）。
 */
//@ chunk-e6aww6q8.js:3179557-3179681 fingerprint = createImageResponse (1)
function createImageResponse(buffer, mediaType, originalSize, dimensions) {
  return {
    type: "image",
    file: {
      base64: buffer.toString("base64"),
      type: `image/${mediaType}`,
      originalSize: originalSize,
      dimensions: dimensions,
    },
  };
}
/**
 * 记 cli_pdf_read 诊断日志（请求方式、渲染结果、文件字节、页数、耗时）。
 */
//@ chunk-e6aww6q8.js:3179681-3179887 layout
function logPdfReadDiagnostics(e, n) {
  logForDiagnosticsNoPII("info", "cli_pdf_read", {
    request: n.request,
    render: n.render,
    outcome: n.outcome,
    file_bytes: n.fileBytes,
    document_pages: n.documentPages,
    pages_rendered: n.pagesRendered,
    duration_ms: Date.now() - e,
  });
}
/**
 * 页数未知的 PDF 是否要求 pages：文件大于 GrowthBook tengu_immutable_tide 阈值、pdfinfo 不是因退出码失败、且 pdftoppm 可用。
 */
//@ chunk-e6aww6q8.js:3179887-3180093 facade-exports
async function isUncountedPDFOverWholeReadCap(e, n) {
  let r = getFeatureValue_CACHED_MAY_BE_STALE("tengu_immutable_tide", 0);
  if (typeof r !== "number" || !(r > 0) || e <= r) return !1;
  if (n.reason === "nonzero_exit" || n.reason === "no_exit_status" || n.reason === "not_run") return !1;
  return isPdftoppmAvailable();
}
/**
 * 把 PDF 读取错误转成 TelemetrySafeError（unknown 原因附站点/退出码/分类）。
 */
//@ chunk-e6aww6q8.js:3180093-3180353 layout
function toPdfExtractionError(e) {
  if (e.reason !== "unknown")
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      e.message,
      `PDF extraction failed (${e.reason})`,
    );
  let n = Error(e.message);
  return e.category === void 0 || e.site === void 0
    ? n
    : withTelemetryMessage(
        n,
        `pdf unknown (site=${e.site}, exit=${e.exitCode ?? "none"}, category=${e.category})`,
      );
}
/**
 * 惰性打开要读的文件（任务输出目录走专用打开，否则经设备守卫与身份校验），把句柄交给 callInner，结束时关闭。
 */
//@ chunk-e6aww6q8.js:3180353-3180791 layout
async function callInnerWithFileHandle(readArgs) {
  let { resolvedFilePath: resolvedFilePath } = readArgs,
    openedFile,
    s = async () =>
      (openedFile ??= isTaskOutputFilePath(resolvedFilePath)
        ? await bindTaskOutputForRead(resolvedFilePath)
        : await openReadBoundToApproval(
            resolvedFilePath,
            readArgs.approvedPaths,
            readArgs.context.signal,
            readArgs.checkedIdentity,
            Q_(readArgs.context.permissions()) ? "refused" : "by-spelling",
          ));
  try {
    return await callInner({ ...readArgs, io: s });
  } catch (error) {
    if (openedFile)
      rethrowWithPath(
        error,
        { ioPath: openedFile.ioPath, canonicalPath: openedFile.canonicalPath },
        resolvedFilePath,
      );
    throw error;
  } finally {
    let h = openedFile?.close();
    if (readArgs.context.signal.aborted || readArgs.context.pdfRenderSignal?.aborted === !0)
      h?.catch(() => {});
    else await h;
  }
}
/**
 * 按类型读取：.ipynb 读 notebook 单元；图片扩展名或无扩展名但魔数是图片走 readImageWithTokenBudget；PDF 做页提取或整份读取；其他用 readFileInRange 读文本，token 超限时整文件读取自动分页并附 [Truncated: PARTIAL view] 说明，最后写 readFileState。
 */
//@ chunk-e6aww6q8.js:3180791-3190604 fingerprint = callInner (0.38)
async function callInner(e) {
  let {
      file_path: file_path,
      fullFilePath: fullFilePath,
      resolvedFilePath: resolvedFilePath,
      ext: ext,
      offset: offset,
      limit: limit,
      pages: pages,
      maxSizeBytes: maxSizeBytes,
      maxTokens: maxTokens,
      room: room,
      allowLarge: allowLarge,
      context: context,
      messageId: messageId,
      io: io,
      totalPages: totalPages,
    } = e,
    { readFileState: readFileState } = context;
  if (isNotebookPath(resolvedFilePath)) {
    let cells = await readNotebook((await io()).handle),
      cellsJson = jsonStringify(cells),
      cellsJsonBytes = Buffer.byteLength(cellsJson);
    if (cellsJsonBytes > maxSizeBytes) {
      let Ho = NOTEBOOK_TOO_LARGE_HINT();
      throw Error(
        `Notebook content (${formatFileSize(cellsJsonBytes)}) exceeds maximum allowed size (${formatFileSize(maxSizeBytes)}). ${Ho}`,
      );
    }
    await validateContentTokens(cellsJson, ext, maxTokens, context.credentials);
    let stats = await (await io()).handle.stat();
    readFileState.set(fullFilePath, {
      content: cellsJson,
      timestamp: Math.floor(stats.mtimeMs),
      offset: offset,
      limit: limit,
    });
    let nestedMemoryAttachmentTriggers = context.nestedMemoryAttachmentTriggers;
    if (nestedMemoryAttachmentTriggers && !nestedMemoryAttachmentTriggers.includes(fullFilePath))
      nestedMemoryAttachmentTriggers.push(fullFilePath);
    let data = { type: "notebook", file: { filePath: file_path, cells: cells } };
    return (
      logFileOperation({
        operation: "read",
        tool: "FileReadTool",
        filePath: fullFilePath,
        content: cellsJson,
      }),
      { data: data }
    );
  }
  let Ie = imageLimitsForModel(context.mainLoopModel()),
    Me = !1;
  if (ext === "")
    try {
      if ((await (await io()).handle.stat()).isFile()) {
        let So = await readHandleUpTo((await io()).handle, 16, "file");
        Me = Ph(So) !== null;
      }
    } catch {}
  if (IMAGE_EXTENSIONS.has(ext) || Me) {
    let So = await readImageWithTokenBudget(
        await io(),
        maxTokens,
        void 0,
        Ie,
        context.remoteCall === void 0
          ? vY
          : mediaLimitsForRoute(context.remoteCall.origin.transport).imageMaxRawBytes,
        context.remoteCall === void 0 && context.inputFromAnotherMachine !== !0,
        context.pdfRenderSignal ?? context.signal,
      ),
      nestedMemoryAttachmentTriggers = context.nestedMemoryAttachmentTriggers;
    if (nestedMemoryAttachmentTriggers && !nestedMemoryAttachmentTriggers.includes(fullFilePath))
      nestedMemoryAttachmentTriggers.push(fullFilePath);
    logFileOperation({
      operation: "read",
      tool: "FileReadTool",
      filePath: fullFilePath,
      content: So.file.base64,
    });
    let un = So.file.dimensions ? createImageMetadataText(So.file.dimensions) : null;
    return { data: So, ...(un && { newMessages: [createUserMessage({ content: un, isMeta: !0 })] }) };
  }
  if (CFe(ext)) {
    let now = Date.now();
    if (pages !== void 0) {
      let br = validatePdfPagesParam(pages, getPdfPageBudget(context));
      if (!br.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          br.message,
          "Invalid or oversized PDF pages parameter",
        );
      let range = br.range;
      if (context.remoteCall === void 0) Nvn(context.session, range.lastPage - range.firstPage + 1);
      let { ioPath: ioPath, handle: handle } = await io(),
        pageExtraction;
      try {
        pageExtraction = await extractPDFPages(
          ioPath,
          { ...range, signal: context.pdfRenderSignal ?? context.signal, held: handle },
          context.storageV5,
        );
      } catch (error) {
        let zo = error instanceof AbortError_2 ? "aborted" : "threw";
        throw (
          logPdfReadDiagnostics(now, {
            request: "page_range",
            render: zo,
            outcome: zo,
            fileBytes: null,
            documentPages: totalPages ?? null,
            pagesRendered: null,
          }),
          error
        );
      }
      if (!pageExtraction.success)
        throw (
          logPdfReadDiagnostics(now, {
            request: "page_range",
            render: `failed_${pageExtraction.error.reason}`,
            outcome: pageExtraction.error.reason,
            fileBytes: null,
            documentPages: totalPages ?? null,
            pagesRendered: null,
          }),
          toPdfExtractionError(pageExtraction.error)
        );
      (logEvent("tengu_pdf_page_extraction", {
        success: !0,
        pageCount: pageExtraction.data.file.count,
        fileSize: pageExtraction.data.file.originalSize,
        hasPageRange: !0,
      }),
        logPdfReadDiagnostics(now, {
          request: "page_range",
          render: "ok",
          outcome: "ok",
          fileBytes: pageExtraction.data.file.originalSize,
          documentPages: totalPages ?? null,
          pagesRendered: pageExtraction.data.file.count,
        }),
        logFileOperation({
          operation: "read",
          tool: "FileReadTool",
          filePath: fullFilePath,
          content: `PDF pages ${pages}`,
        }));
      let Cr =
          context.storageV5 !== void 0
            ? await readPdfExtractedPages(
                context.storageV5,
                pageExtraction.data.file.outputDir,
                pageExtraction.data.v5SidecarScope,
              )
            : await (async () => {
                let imageFiles = (await readdir_16(pageExtraction.data.file.outputDir))
                  .filter((rs) => rs.endsWith(".jpg"))
                  .sort();
                return Promise.all(
                  imageFiles.map((rs) =>
                    readFile_9(pathModule_2.join(pageExtraction.data.file.outputDir, rs)),
                  ),
                );
              })(),
        mapped = (
          await Promise.all(
            Cr.map((Io) => maybeResizeAndDownsampleImageBlock({ data: Io, mediaType: "jpeg", limits: Ie })),
          )
        ).map(({ block: block }) =>
          block.type === "image" && block.source.type === "base64"
            ? { base64: block.source.data, mediaType: block.source.media_type }
            : {
                base64: "",
                mediaType: "image/jpeg",
                ...(block.type === "text" && {
                  error: block.text.replace(/^\[Image could not be processed: ?/, "").replace(/\]$/, ""),
                }),
              },
        ),
        { v5SidecarScope: v5SidecarScope, ...Or } = pageExtraction.data;
      return {
        data: {
          ...Or,
          file: { ...Or.file, filePath: resolvedFilePath },
          firstPage: range.firstPage,
          ...(totalPages !== void 0 && { totalPages: totalPages }),
          pages: mapped,
        },
      };
    }
    let ko =
        context.remoteCall === void 0 ? void 0 : mediaLimitsForRoute(context.remoteCall.origin.transport),
      un = ko?.pdfMaxPagesPerRead ?? H8,
      ao = await io(),
      stats = await ao.handle.stat(),
      pdfInfo = await getPdfPageCount(ao.ioPath, {
        handle: ao.handle,
        size: stats.size,
        signal: context.signal,
      });
    if (pdfInfo.pageCount !== null && pdfInfo.pageCount > mut) {
      if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_misty_sunbeam", !1))
        return callInner({ ...e, pages: `1-${Math.min(mut, un)}`, totalPages: pdfInfo.pageCount });
      throw toPdfExtractionError({
        reason: "too_many_pages",
        message: `This PDF has ${pdfInfo.pageCount} pages, which is too many to read at once. Use the pages parameter to read specific page ranges (e.g., pages: "1-5"). Maximum ${un} pages per request.`,
      });
    }
    if (
      pdfInfo.pageCount === null &&
      (await isUncountedPDFOverWholeReadCap(stats.size, pdfInfo.pdfinfoFailure))
    )
      throw toPdfExtractionError({
        reason: "page_count_unknown",
        message: `This PDF's page count is unknown (${describePdfinfoFailure(pdfInfo.pdfinfoFailure)}). At ${formatFileSize(stats.size)} it may be too long to read whole. Use the pages parameter to read specific page ranges (e.g., pages: "1-5"). Maximum ${un} pages per request.`,
      });
    if (ko !== void 0 && stats.size > ko.wholePdfMaxRawBytes) {
      let br = `This PDF (${formatFileSize(stats.size)}) is larger than can be returned whole from this machine to the calling session (at most ${formatFileSize(ko.wholePdfMaxRawBytes)}). Use the pages parameter with at most ${ko.pdfMaxPagesPerRead} pages per call (for example pages: 1-3, which come back as images), or read the file where the session runs.`;
      throw (
        context.remoteCall?.onToolVerdict?.({ kind: "refused", code: "invalid_request" }, br),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          br,
          "Served whole-PDF read over the transport budget",
        )
      );
    }
    if (!$Yt(context.mainLoopModel()))
      throw (
        logPdfReadDiagnostics(now, {
          request: "whole_file",
          render: "none",
          outcome: "unsupported_model",
          fileBytes: stats.size,
          documentPages: pdfInfo.pageCount,
          pagesRendered: null,
        }),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Reading full PDFs is not supported with this model. Use a newer model (Sonnet 3.5 v2 or later), or use the pages parameter to read specific page ranges (e.g., pages: "1-5", maximum ${H8} pages per request). Page extraction requires poppler-utils: install with \`brew install poppler\` on macOS or \`apt-get install poppler-utils\` on Debian/Ubuntu.`,
          "PDF unsupported on current model",
        )
      );
    let pdfReadResult;
    try {
      pdfReadResult = await readPDF(ao.handle, ao.ioPath);
    } catch (error) {
      throw (
        logPdfReadDiagnostics(now, {
          request: "whole_file",
          render: "none",
          outcome: "threw",
          fileBytes: stats.size,
          documentPages: pdfInfo.pageCount,
          pagesRendered: null,
        }),
        error
      );
    }
    if (
      (logPdfReadDiagnostics(now, {
        request: "whole_file",
        render: "none",
        outcome: pdfReadResult.success ? "ok" : pdfReadResult.error.reason,
        fileBytes: stats.size,
        documentPages: pdfInfo.pageCount,
        pagesRendered: null,
      }),
      !pdfReadResult.success)
    )
      throw toPdfExtractionError(pdfReadResult.error);
    let rr = { ...pdfReadResult.data, file: { ...pdfReadResult.data.file, filePath: resolvedFilePath } };
    return (
      logFileOperation({
        operation: "read",
        tool: "FileReadTool",
        filePath: fullFilePath,
        content: rr.file.base64,
      }),
      { data: rr }
    );
  }
  let We = allowLarge?.raised?.maxSizeBytes ?? maxSizeBytes,
    ze = allowLarge?.raised?.maxTokens ?? maxTokens,
    lt = getFileExtensionForAnalytics(fullFilePath),
    Je = { room: room, optedIn: allowLarge !== void 0, readMaxSizeBytes: We, ext: lt },
    nt = offset === 0 ? 0 : offset - 1,
    rangeRead = await readFileInRange(
      resolvedFilePath,
      nt,
      limit,
      limit === void 0 ? We : void 0,
      context.signal,
      limit === void 0
        ? { handle: (await io()).handle }
        : {
            maxSelectedBytes: Math.max(
              maxTokens * MAX_CHARS_PER_TOKEN,
              allowLarge?.raised?.maxSizeBytes ?? 0,
            ),
            handle: (await io()).handle,
          },
    ).catch((So) => {
      throw attachAllowLargeHintToSizeError(So, Je);
    }),
    {
      lineCount: lineCount,
      totalLines: totalLines,
      totalBytes: totalBytes,
      readBytes: readBytes,
      mtimeMs: mtimeMs,
    } = rangeRead,
    sessionFileType = getAgentOutputTaskId(fullFilePath),
    qt = sessionFileType !== null ? context.taskRegistry.get(sessionFileType) : void 0,
    textContent =
      qt && isLocalShellTask(qt)
        ? consumeClaudeCodeHints(rangeRead.content, {
            command: qt.command,
            pendingHint: context.session.pendingHint,
            isMainThread: !context.agentId,
            surface: "file_read",
          })
        : rangeRead.content,
    rn = textContent,
    numLines = lineCount,
    no = limit,
    truncationBanner,
    ho = !1,
    tokenCount,
    Kn = (offset ?? 1) <= 1 && limit === void 0 && pages === void 0;
  try {
    if (
      ((tokenCount = await validateContentTokens(
        allowLarge?.raised
          ? addLineNumbers({ content: textContent, startLine: Math.max(1, offset), tabAwareSeparator: Dat() })
          : textContent,
        ext,
        ze,
        context.credentials,
        Kn,
        allowLarge?.raised !== void 0,
      )),
      allowLarge?.raised && tokenCount !== void 0)
    ) {
      let So = room().raised?.maxTokens ?? maxTokens;
      if (tokenCount > So) throw new MaxFileReadTokenExceededError(tokenCount, So);
      context.contextRoom()?.claim(tokenCount);
    }
  } catch (error) {
    if (error instanceof MaxFileReadTokenExceededError && Kn) {
      tokenCount = error.tokenCount;
      let ko = getAllowLargeHint(room(), allowLarge !== void 0, { tokens: error.tokenCount }),
        un =
          allowLarge?.raised && error.maxTokens > maxTokens
            ? `${ALLOW_LARGE_PARAM} had room for ${error.maxTokens} tokens this turn`
            : `cap ${maxTokens}`,
        parts = textContent.split(`
`),
        max = Math.max(0.5, textContent.length / Math.max(1, error.tokenCount)),
        yo = (Hr) => Hr.length / max,
        max_2 = Math.max(
          1,
          Math.min(
            parts.length,
            Math.floor(((parts.length * maxTokens) / Math.max(1, error.tokenCount)) * 0.85),
          ),
        ),
        joined = parts.slice(0, max_2).join(`
`);
      for (let Hr = 0; Hr < 6; Hr++) {
        if (yo(joined) <= maxTokens || max_2 <= 1) break;
        ((max_2 = Math.max(1, Math.floor(max_2 * 0.7))),
          (joined = parts.slice(0, max_2).join(`
`)));
      }
      if (yo(joined) > maxTokens || joined.trim() === "") {
        let max_2 = Math.max(1, Math.floor(maxTokens * max * 0.85));
        for (let cs = 0; cs < 6; cs++) {
          if (((joined = textContent.slice(0, max_2)), yo(joined) <= maxTokens)) break;
          max_2 = Math.max(1, Math.floor(max_2 * 0.7));
        }
        let code = joined.charCodeAt(joined.length - 1);
        if (code >= 55296 && code <= 56319) joined = joined.slice(0, -1);
        ho = !0;
      }
      ((rn = joined),
        (numLines = ho
          ? countCharInString(
              joined,
              `
`,
            ) + 1
          : max_2),
        (no = numLines),
        (truncationBanner =
          !ho && numLines < totalLines
            ? TRUNCATED_PARTIAL_VIEW_PREFIX +
              `${fullFilePath}: showing lines 1-${numLines} of ${totalLines} total (${error.tokenCount} tokens, ${un}). Call ${FILE_READ_TOOL_NAME} with offset=${numLines + 1} limit=${numLines} for the next page, or ${GREP_TOOL_NAME} to find a specific section.${ko} Do NOT answer from this page alone if the answer may be further in the file.]`
            : TRUNCATED_PARTIAL_VIEW_PREFIX +
              `${fullFilePath}: showing the first ${joined.length} of ${textContent.length} characters (${error.tokenCount} tokens, ${un}); this file has very long lines and cannot be paginated by line. Use ${GREP_TOOL_NAME} to find a specific section, or ${FILE_READ_TOOL_NAME} with offset/limit to page through it.${ko} Do NOT answer from this excerpt alone if the answer may be elsewhere in the file.]`));
    } else throw attachAllowLargeHintToSizeError(error, Je);
  }
  readFileState.set(fullFilePath, {
    content: rn,
    timestamp: Math.floor(mtimeMs),
    offset: offset,
    limit: no,
    ...(truncationBanner !== void 0 && { isPartialView: !0 }),
  });
  let nestedMemoryAttachmentTriggers = context.nestedMemoryAttachmentTriggers;
  if (nestedMemoryAttachmentTriggers && !nestedMemoryAttachmentTriggers.includes(fullFilePath))
    nestedMemoryAttachmentTriggers.push(fullFilePath);
  let fo, To, bo;
  if (context.remoteCall === void 0 && getLiveState().pendingHandoverReads.has(fullFilePath)) {
    let { prepareHandoverRead: prepareHandoverRead, describeHandoverCoverage: describeHandoverCoverage } =
        await import("./chunk-4jdhvqss.js"),
      un = await prepareHandoverRead(fullFilePath, context, messageId, {
        firstLine: nt,
        lineCount: ho ? numLines - 1 : numLines,
        totalLines: totalLines,
        mtimeMs: mtimeMs,
      });
    if (((fo = un.artifactRead), un.remaining !== void 0))
      To = `[This file is the saved source of artifact ${un.remaining.slug} at version ${un.remaining.ver} (${describeHandoverCoverage(un.remaining)}); that version counts as viewed only once you have Read every line of it.]`;
    bo = () => {
      let commit = un.commit();
      if (commit !== void 0) textResult.artifactRead = commit;
      else if (textResult.artifactRead !== void 0) delete textResult.artifactRead;
    };
  }
  let textResult = {
    type: "text",
    file: {
      filePath: file_path,
      content: rn,
      numLines: numLines,
      startLine: truncationBanner !== void 0 ? Math.max(1, offset) : offset,
      totalLines: totalLines,
      ...(truncationBanner !== void 0 && { truncatedByTokenCap: !0 }),
    },
    ...(fo && { artifactRead: fo }),
  };
  if (isAutoMemFilePath(fullFilePath)) memoryFileMtimeByResult.set(textResult, mtimeMs);
  if (To !== void 0) artifactCoverageNoteByResult.set(textResult, To);
  if (rangeRead.notText !== void 0)
    notTextNoteByResult.set(textResult, fileReadEncodingNote(rangeRead.notText));
  if (truncationBanner !== void 0) aos(textResult, truncationBanner);
  logFileOperation({ operation: "read", tool: "FileReadTool", filePath: fullFilePath, content: rn });
  let analyticsExt = detectSessionFileType(fullFilePath);
  if (
    (logEvent("tengu_session_file_read", {
      totalLines: totalLines,
      readLines: numLines,
      totalBytes: totalBytes,
      readBytes: truncationBanner !== void 0 ? Buffer.byteLength(rn, "utf8") : readBytes,
      offset: offset,
      ...(limit !== void 0 && { limit: limit }),
      ...(lt !== void 0 && { ext: lt }),
      ...(messageId !== void 0 && { messageID: ye(messageId) }),
      is_session_transcript: analyticsExt === "session_transcript",
      ...(allowLarge && { allow_large: !0 }),
      reads_own_output: classifySavedOutputPath(fullFilePath, context.session),
    }),
    allowLarge)
  )
    logAllowLargeOutcome(
      allowLarge,
      fromEnum(truncationBanner === void 0 ? "fit" : "paged"),
      {
        totalBytes: totalBytes,
        totalLines: totalLines,
        readLines: numLines,
        ...(tokenCount !== void 0 && { tokens: tokenCount }),
      },
      lt,
    );
  return { data: textResult, ...(bo && { afterResultCommitted: bo }) };
}
//@ chunk-e6aww6q8.js:3190604-3190625 layout
var MAX_IMAGE_READ_BYTES = y3o,
  IMAGE_STREAM_CHUNK_BYTES = 65536;
/**
 * 读取图片字节：句柄或路径，可指定最大字节数。
 */
//@ chunk-e6aww6q8.js:3190625-3190936 layout
async function readImageBytes(e, n, r) {
  if (typeof e !== "string") {
    if (n === void 0) return readImageBytesFromHandle(e.handle, e.ioPath, r);
    let stats = await e.handle.stat();
    return stats.isFile() ? (await readHandleBounded(e.handle, n, stats.size)).bytes : Buffer.alloc(0);
  }
  if (n !== void 0) return getFsImplementation().readFileBytes(e, n);
  await using s = await open_11(e, constants_15.O_RDONLY | READ_LIMITS);
  return await readImageBytesFromHandle(s, e, void 0);
}
/**
 * 从句柄读图片：普通文件超过上限直接拒绝；管道/设备按块读取到上限，超过则报错。
 */
//@ chunk-e6aww6q8.js:3190936-3191756 layout
async function readImageBytesFromHandle(e, n, r) {
  let stats = await e.stat();
  if (stats.isFile()) {
    let L =
      stats.size > MAX_IMAGE_READ_BYTES
        ? void 0
        : await readHandleBounded(e, MAX_IMAGE_READ_BYTES, stats.size);
    if (L === void 0 || L.overLimit)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `File is too large to read as an image (the limit is ${formatFileSize(MAX_IMAGE_READ_BYTES)}): ${n}. If it is an image, resize it or export a smaller copy, then read that.`,
        "File over the image read limit",
      );
    return L.bytes;
  }
  let h = [],
    alloc = Buffer.alloc(0),
    S = 0,
    w = 0;
  while (w <= MAX_IMAGE_READ_BYTES) {
    if (r?.aborted) throw new AbortError_2();
    if (S === alloc.length)
      ((alloc = Buffer.allocUnsafe(
        Math.min(Math.max(w, IMAGE_STREAM_CHUNK_BYTES), MAX_IMAGE_READ_BYTES + 1 - w),
      )),
        h.push(alloc),
        (S = 0));
    let read = e.read(alloc, S, alloc.length - S, null),
      { bytesRead: bytesRead } = await (r === void 0
        ? read
        : raceWithAbortSignal(read, r, () => new AbortError_2()));
    if (bytesRead === 0) break;
    ((S += bytesRead), (w += bytesRead));
  }
  if (w > MAX_IMAGE_READ_BYTES)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot read this as an image: ${n} is a pipe or a device, not a regular file, and it sent more than ${formatFileSize(MAX_IMAGE_READ_BYTES)} without ending.`,
      "Image stream over the read limit",
    );
  return Buffer.concat(h, w);
}
/**
 * 按 token 预算读取图片：校验非空与魔数，按模型限制缩放/重编码，超出字节上限再压缩；估算 token 超出上限时压缩到 token 限制，失败则降为 400x400 JPEG。
 */
//@ chunk-e6aww6q8.js:3191756-3193372 facade-exports = readImageWithTokenBudget (0.561)
async function readImageWithTokenBudget(
  e,
  n = getDefaultFileReadingLimits().maxTokens,
  r,
  s,
  h = vY,
  y = !0,
  S,
) {
  let w = typeof e === "string" ? e : e.ioPath,
    imageBuffer = await readImageBytes(e, r, S),
    originalSize = imageBuffer.length;
  if (originalSize === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Image file is empty: ${w}`,
      "Image file is empty",
    );
  let detectedMediaType = Ph(imageBuffer);
  if (detectedMediaType === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `File has an image extension but its content is not a valid PNG/JPEG/GIF/WebP. Detected: ${detectHtmlDocument(imageBuffer)}. This usually means a download saved an error/login page instead of the image. Use \`file "${w}"\` to confirm, or read it as text with ${BASH_TOOL_NAME} (e.g. \`head -c 500\`).`,
      "Image extension but invalid magic bytes",
    );
  let Z = detectedMediaType.split("/")[1] || "png",
    Se;
  try {
    let resized = await maybeResizeAndDownsampleImageBuffer(imageBuffer, originalSize, Z, s, {
        directWebpMaxBytes: y ? fEn(h) : void 0,
      }),
      buffer = resized.buffer;
    if (buffer.length > h) buffer = await compressToJpegUnderBytes(resized.buffer, h, resized.mediaType);
    ((buffer = await chooseImageEncoding(imageBuffer, resized.buffer, buffer, h, y, resized.losslessWebp)),
      (Se = createImageResponse(
        buffer,
        detectImageFormatFromBuffer(buffer).slice(6),
        originalSize,
        resized.dimensions,
      )));
  } catch (error) {
    if (error instanceof ImageResizeError) throw error;
    if (isUnknownImageErrorType(classifyImageErrorCode(error))) logError(error);
    else logForDebugging(`Image budget pass failed: ${errorMessage(error)}`, { level: "error" });
    Se = createImageResponse(imageBuffer, Z, originalSize);
  }
  let dimensions = Se.file.dimensions,
    we = dimensions?.displayWidth,
    Ee = dimensions?.displayHeight,
    Ae;
  if (we && Ee) Ae = imageTileCount(we, Ee);
  else {
    let Ie = parseWebpHeader(imageBuffer);
    Ae = Ie ? imageTileCount(Ie.width, Ie.height) : imageTileCount(s.maxWidth, s.maxHeight);
  }
  if (Ae > n)
    try {
      let compressed = await compressImageBufferWithTokenLimit(imageBuffer, n, detectedMediaType);
      return {
        type: "image",
        file: { base64: compressed.base64, type: compressed.mediaType, originalSize: originalSize },
      };
    } catch (error) {
      logForDebugging(
        `Image compression failed for ${w}: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      );
      try {
        let fallbackBuffer = await (
          await s4()
        )(imageBuffer)
          .resize(400, 400, { fit: "inside", withoutEnlargement: !0 })
          .jpeg({ quality: 20 })
          .toBuffer();
        return createImageResponse(fallbackBuffer, "jpeg", originalSize);
      } catch (error) {
        return (
          logForDebugging(
            `Fallback image compression failed for ${w}: ${error instanceof Error ? error.message : String(error)}`,
            { level: "error" },
          ),
          createImageResponse(imageBuffer, Z, originalSize)
        );
      }
    }
  return Se;
}
/**
 * 任一路径拼写是设备/进程文件（/dev/zero、/proc/*\/environ 等）时返回拒绝文案；无法解析路径时也拒绝。
 */
//@ chunk-qg0af0yq.js:8349-8629 placement
function getDevicePathRefusal(e, n) {
  if (n.spellings.some((spelling) => isBlockedDevicePath(spelling)))
    return `Cannot read '${encodeControlChars(e)}': this path names a device or process file that this tool does not read.`;
  return n.unresolved
    ? `${unresolvablePathMessage(e)}, so it cannot be told apart from a device or process file that this tool does not read.`
    : void 0;
}
/**
 * 被拒读的设备路径集合（/dev/zero、/dev/random、/dev/stdin、/dev/tty、/proc/kmsg、/dev/fd/0-2 等）及相关正则。
 */
//@ chunk-qg0af0yq.js:8629-9202 fingerprint = BLOCKED_DEVICE_PATHS (0.808)
var BLOCKED_DEVICE_PATHS = new Set([
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
  ]),
  PROC_ROOT_PREFIX_RE = /^\/proc\/[^/]+\/root(?=\/)/,
  PROC_TASK_PREFIX_RE = /^(\/proc\/[^/]+)\/task\/[^/]+(?=\/)/,
  PROC_SELF_CWD_RE = new RegExp(`^/proc/(?:self|${process.pid})/cwd(?=/)`),
  PROC_FD_TRAVERSAL_RE =
    /^\/proc\/[^/]+\/cwd\/|^\/proc\/[^/]+\/fd\/\d+\/|^\/dev\/fd\/\d+\/|^\/dev\/(?:stdin|stdout|stderr)\/|^\/proc\/[^/]+\/map_files(\/|$)/,
  OTHER_PROCESS_FD_RE = new RegExp(`^/proc/(?!self/|${process.pid}/)[^/]+/fd/\\d+$`),
  TTY_DEVICE_RE = /^\/dev\/(?:pts\/(?:\d+|ptmx)|ptmx|tty[^/]*)$/,
  MAX_PROC_PREFIX_STRIP_ROUNDS = 8;
/**
 * 路径是否为会阻塞或泄露的设备/进程文件：规范化后匹配黑名单、tty、fd 穿越、其他进程 fd、/proc/<pid>/(environ|cmdline|mem|...)，并剥离 /proc/<pid>/root、task 前缀循环判断（最多 8 轮）。
 */
//@ chunk-qg0af0yq.js:9202-9673 fingerprint = isBlockedDevicePath (0.964)
function isBlockedDevicePath(filePath) {
  let normalized = posix.normalize(filePath);
  for (let t = 0; ; t++) {
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
      return !0;
    let replaced = normalized.replace(PROC_ROOT_PREFIX_RE, "").replace(PROC_TASK_PREFIX_RE, "$1");
    if (replaced === normalized) return !1;
    if (t >= MAX_PROC_PREFIX_STRIP_ROUNDS) return !0;
    normalized = replaced;
  }
}
/**
 * 读取权限检查时记录的路径拼写（无记录时重新遍历），并标出是否有未解析的路径。
 */
//@ chunk-847rdpmn.js:4662-4810 placement
function readPermissionSpellings(e, n) {
  let r = consumePermissionStash(e, n, "read");
  if (r !== void 0) return { spellings: r, unresolved: !1 };
  let s = walkPermissionCheckPaths(n);
  return { spellings: permissionCheckSpellings(s), unresolved: s.unresolved };
}
/**
 * 把图片格式映射为编码输出格式：jpg/jpeg 为 jpeg、webp 为 webp、其余为 png。
 */
//@ chunk-mvvq2nx1.js:7393-7497 fingerprint = IMAGE_EXTENSIONS (0.878)
function toEncoderFormat(e) {
  switch (e) {
    case "jpeg":
    case "jpg":
      return "jpeg";
    case "webp":
      return "webp";
    default:
      return "png";
  }
}
/**
 * 文件内容 token 数超过上限的错误（带 tokenCount/maxTokens，消息建议用 offset/limit 或搜索）。
 */
//@ chunk-q7gky7a4.js:813-1174 facade-exports = MaxFileReadTokenExceededError (0.91)
class MaxFileReadTokenExceededError extends Error {
  tokenCount;
  maxTokens;
  constructor(e, t, r = "") {
    super(
      `File content (${e} tokens) exceeds maximum allowed tokens (${t}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.${r}`,
    );
    this.tokenCount = e;
    this.maxTokens = t;
    this.name = "MaxFileReadTokenExceededError";
  }
}

export {
  FileReadTool,
  nXs,
  getDevicePathRefusal,
  MaxFileReadTokenExceededError,
  validateContentTokens,
  allowLargeRoomTokens,
  readImageWithTokenBudget,
  isUncountedPDFOverWholeReadCap,
  toEncoderFormat,
  tXs,
};
