/**
 * utils/uploadsDir.ts
 *
 * 2.1.316 新增：会话 uploads 目录、上传文件命名（哈希前缀）与已上传文件缓存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f87fzzk4.js (12)
 * attribution: placement 12
 */
import { join } from "path";
import { createHash } from "crypto";
import {
  getSessionUploadsDirOverride,
  getLocalUploadsRoot,
  getSessionId,
  humanAttachmentDigestRegistry,
} from "../bootstrap/state.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { getAttachmentsRoot } from "./stageFileRoots.js";
import { hasTrailingOrReservedName } from "./windowsProfileFolders.js";

//@ chunk-f87fzzk4.js:411-458 placement
/**
 * 当前会话的 uploads 目录。
 */
function sessionUploadsDir() {
  return getSessionUploadsDirOverride() ?? join(getLocalUploadsRoot() ?? getUploadsDir(), getSessionId());
}
//@ chunk-f87fzzk4.js:458-498 placement = uploadsDir (1)
/**
 * uploads 目录路径。
 */
function getUploadsDir() {
  return join(getClaudeConfigDir(), "uploads");
}
//@ chunk-f87fzzk4.js:498-540 placement
/**
 * uploads 根的候选列表。
 */
function uploadsRootCandidates() {
  return [getUploadsDir(), getLocalUploadsRoot() ?? getAttachmentsRoot()];
}
//@ chunk-f87fzzk4.js:540-579 placement
/**
 * 生成带哈希前缀的上传文件名。
 */
function hashPrefixedFileName(t, e) {
  return `${t}-${savedNameWithUnderscore(e)}`;
}
//@ chunk-f87fzzk4.js:579-663 placement
/**
 * 内容小写后的 8 位 sha256 前缀。
 */
function shortContentHash(fileUuid) {
  return createHash("sha256").update(fileUuid.toLowerCase()).digest("hex").slice(0, 8);
}
//@ chunk-f87fzzk4.js:663-690 placement
var HASH_PREFIX_RE = /^[A-Za-z0-9_-]{8}-/;
//@ chunk-f87fzzk4.js:690-736 placement
function needsTrailingUnderscore(t) {
  return hasTrailingOrReservedName(t.replace(/_+$/, ""));
}
//@ chunk-f87fzzk4.js:736-770 placement
function savedNameWithUnderscore(t) {
  return needsTrailingUnderscore(t) ? t + "_" : t;
}
//@ chunk-f87fzzk4.js:770-866 placement
/**
 * 去哈希前缀的显示文件名。
 */
function uploadDisplayName(t) {
  let replaced = t.replace(HASH_PREFIX_RE, "");
  if (replaced.endsWith("_") && needsTrailingUnderscore(replaced)) return replaced.slice(0, -1);
  return replaced || t;
}
//@ chunk-f87fzzk4.js:866-877 placement
var MAX_ATTACHMENT_DIGESTS = 1024;
//@ chunk-f87fzzk4.js:877-997 placement
function rememberAttachmentDigest(t, e) {
  let n = humanAttachmentDigestRegistry();
  if (!n.has(t) && n.size >= MAX_ATTACHMENT_DIGESTS) {
    let r = n.keys().next().value;
    if (r !== undefined) n.delete(r);
  }
  n.set(t, e);
}
//@ chunk-f87fzzk4.js:997-1033 placement
/**
 * 取附件摘要登记表里的项。
 */
function attachmentDigestOf(real) {
  return humanAttachmentDigestRegistry().get(real);
}
export {
  sessionUploadsDir,
  uploadsRootCandidates,
  attachmentDigestOf,
  hashPrefixedFileName,
  shortContentHash,
  rememberAttachmentDigest,
  getUploadsDir,
  uploadDisplayName,
};
