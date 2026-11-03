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
function Nzr(c) {
  return typeof c === "string" ? 0 : count(c, (n) => n?.type === "image");
}
/**
 * 只有在 bridge 目标未变时保留附件的文件 id，否则记录并丢弃。
 */
//@ chunk-e6aww6q8.js:3291314-3291455 placement
function keepBridgeFileIds(e, n, r) {
  if (!e?.length) return;
  if (r === void 0 || Nzr(r) !== Nzr(n)) {
    logFeatureSad("bridge_attachment_withdraw", "file_ids_not_kept");
    return;
  }
  return e;
}
//@ chunk-e6aww6q8.js:3291455-3291976 placement
function withdrawBridgeAttachments(e, n, r, s, h) {
  try {
    let found = e.find((w) => w.uuid === n);
    if (found?.type === "user" && h?.length) found.savedFiles = h;
    else if (h?.length) logFeatureSad("bridge_attachment_withdraw", "saved_files_not_kept");
    if (!s?.length) return;
    let S = keepBridgeFileIds(s, r, found?.type === "user" ? found.message.content : void 0);
    if (S === void 0 || found?.type !== "user") return;
    found.imageFileUuids = S;
    for (let w of e)
      if (
        w.type === "attachment" &&
        w.attachment.type === "inlined_image_paths" &&
        w.attachment.paths.length === S.length
      )
        w.attachment.fileUuids = S;
  } catch (error) {
    (logError(error), logFeatureBad("bridge_attachment_withdraw", "stamp_failed"));
  }
}

export { withdrawBridgeAttachments, keepBridgeFileIds, Nzr };
