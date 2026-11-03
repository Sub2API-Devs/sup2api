/**
 * utils/attachments/bridgeAttachments.ts
 *
 * 2.1.316 新增：桥接会话附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { count } from "../collections.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../log.js";

//@ chunk-e6aww6q8.js:3291241-3291314 placement = _temp (1)
/**
 * 统计内容里的图片块数量（字符串视为 0）。
 */
function countImageParts(c) {
  return typeof c === "string" ? 0 : count(c, (n) => n?.type === "image");
}
//@ chunk-e6aww6q8.js:3291314-3291455 placement
/**
 * 只有在 bridge 目标未变时保留附件的文件 id，否则记录并丢弃。
 */
function keepBridgeFileIds(e, n, r) {
  if (!e?.length) return;
  if (r === undefined || countImageParts(r) !== countImageParts(n)) {
    logFeatureSad("bridge_attachment_withdraw", "file_ids_not_kept");
    return;
  }
  return e;
}
//@ chunk-e6aww6q8.js:3291455-3291976 placement
function withdrawBridgeAttachments(e, turnId, r, imageFileUuids, savedFiles) {
  try {
    let found = e.find((w) => w.uuid === turnId);
    if (found?.type === "user" && savedFiles?.length) found.savedFiles = savedFiles;
    else if (savedFiles?.length) logFeatureSad("bridge_attachment_withdraw", "saved_files_not_kept");
    if (!imageFileUuids?.length) return;
    let S = keepBridgeFileIds(imageFileUuids, r, found?.type === "user" ? found.message.content : undefined);
    if (S === undefined || found?.type !== "user") return;
    found.imageFileUuids = S;
    for (let w of e)
      if (
        w.type === "attachment" &&
        w.attachment.type === "inlined_image_paths" &&
        w.attachment.paths.length === S.length
      )
        w.attachment.fileUuids = S;
  } catch (error) {
    logError(error);
    logFeatureBad("bridge_attachment_withdraw", "stamp_failed");
  }
}
export { withdrawBridgeAttachments, keepBridgeFileIds, countImageParts };
