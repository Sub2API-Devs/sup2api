/**
 * utils/attachments/bridgeAttachments.ts
 *
 * 2.1.316 新增：桥接会话附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (5), chunk-5xgkngpb.js (3)
 * attribution: placement 8
 */
import { basename } from "path";
import { countWhere, stringArray } from "../collections.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../log.js";
import { jsonStringify } from "../slowOperations.js";
import { REMOVED_TOOL_RESULT_MARK } from "../messages.js";
import { reconcileSavedFilesForTurn } from "../../QueryEngine.js";

//@ chunk-5xgkngpb.js:173977-174050 placement (2.1.88 match: _temp, 1)
/**
 * 统计内容里的图片块数量（字符串视为 0）。
 */
function countImageParts(c) {
  return typeof c === "string" ? 0 : countWhere(c, (part) => part?.type === "image");
}
//@ chunk-5xgkngpb.js:174050-174191 placement
/**
 * 只有在 bridge 目标未变时保留附件的文件 id，否则记录并丢弃。
 */
function keepBridgeFileIds(fileIds, originalContent, rewrittenContent) {
  if (!fileIds?.length) return;
  if (
    rewrittenContent === undefined ||
    countImageParts(rewrittenContent) !== countImageParts(originalContent)
  ) {
    logFeatureSad("bridge_attachment_withdraw", "file_ids_not_kept");
    return;
  }
  return fileIds;
}
//@ chunk-5xgkngpb.js:174191-174814 placement
function withdrawBridgeAttachments(messages, turnId, originalContent, fileIds, savedFiles, picturesToHide) {
  try {
    let found = messages.find((message) => message.uuid === turnId);
    if (found?.type === "user" && picturesToHide) found.picturesToHide = picturesToHide;
    else if (picturesToHide) logFeatureSad("bridge_attachment_withdraw", "list_not_kept");
    if (found?.type === "user" && savedFiles?.length) found.savedFiles = savedFiles;
    else if (savedFiles?.length) logFeatureSad("bridge_attachment_withdraw", "saved_files_not_kept");
    if (!fileIds?.length) return;
    let keptFileIds = keepBridgeFileIds(
      fileIds,
      originalContent,
      found?.type === "user" ? found.message.content : undefined,
    );
    if (keptFileIds === undefined || found?.type !== "user") return;
    found.imageFileUuids = keptFileIds;
    for (let message of messages)
      if (
        message.type === "attachment" &&
        message.attachment.type === "inlined_image_paths" &&
        message.attachment.paths.length === keptFileIds.length
      )
        message.attachment.fileUuids = keptFileIds;
  } catch (error) {
    logError(error);
    logFeatureBad("bridge_attachment_withdraw", "stamp_failed");
  }
}
//@ chunk-0yw3taqg.js:115786-116208 placement
/**
 * 扫描一轮 assistant 消息里工具调用参数，找出与撤回文件名匹配的 tool_use id，供桥接会话撤下附件时隐藏。
 */
function collectKeptToolUseIds(messages, paths) {
  let toolUseIds = new Set();
  try {
    let normalized = new Set(
      [...paths].map((message) => trimTrailingDots(basename(message))).filter((path) => path !== ""),
    );
    for (let block of normalized.size > 0 ? messages : []) {
      if (block.type !== "assistant" || !Array.isArray(block.message?.content)) continue;
      for (let entry of block.message.content)
        if (
          entry?.type === "tool_use" &&
          jsonStringify(entry.input ?? {})
            .split(/(?:\\(?:u[0-9a-fA-F]{4}|.)|[^\w.-])+/)
            .some((path) => normalized.has(trimTrailingDots(path)))
        )
          toolUseIds.add(entry.id);
    }
  } catch (error) {
    logError(error);
    logFeatureSad("bridge_attachment_withdraw", "call_scan_failed");
  }
  return toolUseIds;
}
//@ chunk-0yw3taqg.js:116208-116286 placement
function trimTrailingDots(path) {
  let end = path.length;
  while (end > 0 && path[end - 1] === ".") end--;
  return path.slice(0, end);
}
//@ chunk-0yw3taqg.js:116286-116373 placement
function renderBlock(block, hiddenIds) {
  return (
    block?.type === "tool_result" &&
    hiddenIds.has(block.tool_use_id) &&
    block.content !== REMOVED_TOOL_RESULT_MARK
  );
}
//@ chunk-0yw3taqg.js:116373-116655 placement
function applyPicturesToHide(target, messages) {
  let lastUser = messages.findLast(
    (message) => message.type === "user" && message.picturesToHide !== undefined,
  );
  if (lastUser?.type !== "user") return;
  let picturesToHide = lastUser.picturesToHide;
  let fileUuids = stringArray(picturesToHide?.fileUuids);
  let hideBefore = typeof picturesToHide?.hideBefore === "number" ? picturesToHide.hideBefore : 0;
  target.picturesToHide = {
    fileUuids,
    hideBefore,
  };
  if (fileUuids.length > 0)
    reconcileSavedFilesForTurn(messages, fileUuids, {
      hideBefore,
    });
}
//@ chunk-0yw3taqg.js:116655-116850 placement
function fillPicturesToHide(target, message) {
  let picturesToHide = {
    fileUuids: message.withdrawnFileUuids ?? [],
    hideBefore: message.hidePicturesWithNoFileIdBefore ?? 0,
  };
  if (picturesToHide.fileUuids.length === 0 && target.picturesToHide === undefined) return;
  target.picturesToHide = picturesToHide;
  return picturesToHide;
}
export {
  applyPicturesToHide,
  fillPicturesToHide,
  collectKeptToolUseIds,
  renderBlock,
  withdrawBridgeAttachments,
  countImageParts,
  keepBridgeFileIds,
};
