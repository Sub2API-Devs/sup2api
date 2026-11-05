/**
 * tools/REPLTool/innerResults.ts
 *
 * 内层调用进度合并与图片/PDF/通知结果收集（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (8)
 * attribution: placement 8
 */
import { isBase64ImageBlock, isBase64Page } from "./resultContent.js";
import { READ as READ_2 } from "../FileReadTool/constants.js";
import { truncateWithCount } from "../../utils/stringUtils.js";
import { matchesToolName } from "../../Tool.js";
import { READNOTIFICATIONS } from "../ReadNotificationsTool/ReadNotificationsTool.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { listUnreadableToolsUsed } from "../../utils/agentListing.js";

//@ chunk-n51jggtb.js:177990-179034 placement
/**
 * 把内层调用的进度事件合并进调用状态表。
 */
function applyCallUpdate(calls, update) {
  let call = calls.get(update.toolUseId);
  if (call) {
    call.phase = update.phase;
    if (update.executed) call.executed = true;
    if (update.delegatedToolNames !== undefined) call.delegatedToolNames = update.delegatedToolNames;
    call.mcpContent = update.mcpContent;
    call.result = update.result;
    call.resultBeforeReadBack = update.resultBeforeReadBack;
    call.servedText = update.servedText;
    call.error = update.error;
    call.declined = update.declined;
    call.toolDenialKind = update.toolDenialKind;
    if (update.permissionDecision !== undefined) call.permissionDecision = update.permissionDecision;
    if (update.sandboxed !== undefined) call.sandboxed = update.sandboxed;
    if (update.phase === "complete" || update.phase === "error")
      call.sandboxViolations = update.sandboxViolations;
  } else
    calls.set(update.toolUseId, {
      toolUseId: update.toolUseId,
      toolName: update.toolName,
      toolInput: update.toolInput,
      phase: update.phase,
      ...(update.executed && {
        executed: true,
      }),
      ...(update.delegatedToolNames !== undefined && {
        delegatedToolNames: update.delegatedToolNames,
      }),
      mcpContent: update.mcpContent,
      result: update.result,
      resultBeforeReadBack: update.resultBeforeReadBack,
      servedText: update.servedText,
      error: update.error,
      declined: update.declined,
      permissionDecision: update.permissionDecision,
      toolDenialKind: update.toolDenialKind,
      sandboxViolations: update.sandboxViolations,
      sandboxed: update.sandboxed,
    });
}
//@ chunk-n51jggtb.js:179034-180151 placement
/**
 * 收集内层 Read/MCP 调用带回的图片（含超限计数与失败页）。
 */
function collectImagesAndFailedPages(calls) {
  let images = [];
  let failedPages = [];
  for (let call of calls.values()) {
    if (call.phase !== "complete") continue;
    if (call.mcpContent === true) {
      if (Array.isArray(call.result)) {
        for (let block of call.result)
          if (isBase64ImageBlock(block))
            images.push({
              base64: block.source.data,
              mediaType: block.source.media_type,
            });
      }
      continue;
    }
    if (call.toolName !== READ_2) continue;
    let result = call.result;
    if (result == null || typeof result !== "object") continue;
    if (
      result.type === "image" &&
      result.file != null &&
      typeof result.file === "object" &&
      typeof result.file.base64 === "string" &&
      result.file.base64.length > 0 &&
      typeof result.file.type === "string"
    )
      images.push({
        base64: result.file.base64,
        mediaType: result.file.type,
      });
    else if (result.type === "parts" && Array.isArray(result.pages)) {
      let firstPage = typeof result.firstPage === "number" ? result.firstPage : 1;
      let filePath =
        result.file != null && typeof result.file === "object" && typeof result.file.filePath === "string"
          ? truncateWithCount(result.file.filePath, MAX_PATH_CHARS)
          : undefined;
      result.pages.forEach((page, index) => {
        if (isBase64Page(page)) {
          images.push({
            base64: page.base64,
            mediaType: page.mediaType,
          });
          return;
        }
        let pageError =
          typeof page === "object" && page !== null && "error" in page && typeof page.error === "string"
            ? truncateWithCount(page.error, MAX_PAGE_ERROR_CHARS)
            : undefined;
        failedPages.push({
          page: firstPage + index,
          ...(filePath !== undefined && {
            file: filePath,
          }),
          ...(pageError !== undefined && {
            error: pageError,
          }),
        });
      });
    }
  }
  return {
    images: images.slice(0, MAX_IMAGES),
    omitted: Math.max(0, images.length - MAX_IMAGES),
    failedPages: failedPages.slice(0, MAX_FAILED_PAGES),
    failedPagesOmitted: Math.max(0, failedPages.length - MAX_FAILED_PAGES),
  };
}
//@ chunk-n51jggtb.js:180151-180299 placement
/**
 * 生成“某页图片无法处理”的说明。
 */
function failedPageLine(page) {
  return `[Page ${page.page}${page.file ? ` of ${page.file}` : " of an inner Read"} could not be processed as an image${page.error ? `: ${page.error}` : ""}]`;
}
//@ chunk-n51jggtb.js:180299-180327 placement
/**
 * 每结果图片/失败页的数量上限与文件/错误文本截断长度。
 */
var MAX_IMAGES = 8;
var MAX_FAILED_PAGES = 8;
var MAX_PATH_CHARS = 256;
var MAX_PAGE_ERROR_CHARS = 200;
//@ chunk-n51jggtb.js:180327-180681 placement
/**
 * 收集内层 Read 带回的 PDF 文档（含超限计数）。
 */
function collectPdfDocuments(collectPdfDocuments) {
  let documents = [];
  for (let call of collectPdfDocuments.values()) {
    if (call.phase !== "complete" || call.toolName !== READ_2) continue;
    let result = call.result;
    if (
      result != null &&
      typeof result === "object" &&
      result.type === "pdf" &&
      result.file != null &&
      typeof result.file === "object" &&
      typeof result.file.base64 === "string" &&
      result.file.base64.length > 0
    )
      documents.push({
        base64: result.file.base64,
      });
  }
  return {
    documents: documents.slice(0, MAX_DOCUMENTS),
    omitted: Math.max(0, documents.length - MAX_DOCUMENTS),
  };
}
//@ chunk-n51jggtb.js:180681-180690 placement
/**
 * 每结果 PDF 数量上限。
 */
var MAX_DOCUMENTS = 4;
//@ chunk-n51jggtb.js:180690-181086 placement
/**
 * 取出 ReadNotifications 调用的结果文本。
 */
function collectNotificationTexts(calls, tools) {
  let filtered = tools.filter((tool) => matchesToolName(tool, READNOTIFICATIONS));
  let notificationTool = filtered[0];
  if (filtered.length !== 1 || notificationTool === undefined || notificationTool.isMcp === true) return [];
  let texts = [];
  for (let call of calls.values()) {
    if (call.phase !== "complete" || call.toolName !== notificationTool.name) continue;
    try {
      let { content } = notificationTool.mapToolResultToToolResultBlockParam(call.result, call.toolUseId);
      if (typeof content === "string") texts.push(content);
    } catch (error) {
      logForDebugging(`REPL: a ${notificationTool.name} result was not rendered: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  return texts;
}
//@ chunk-n51jggtb.js:207301-207437 placement
/**
 * 收集脚本实际执行过的工具名（含委派）。
 */
function unreadableToolsUsed(calls, toolUseContext) {
  let names = [];
  for (let call of calls.values())
    if (call.executed) names.push(call.toolName, ...(call.delegatedToolNames ?? []));
  return listUnreadableToolsUsed(names, toolUseContext.messages);
}
export {
  failedPageLine,
  MAX_FAILED_PAGES,
  MAX_IMAGES,
  MAX_DOCUMENTS,
  applyCallUpdate,
  collectImagesAndFailedPages,
  collectPdfDocuments,
  collectNotificationTexts,
  unreadableToolsUsed,
};
