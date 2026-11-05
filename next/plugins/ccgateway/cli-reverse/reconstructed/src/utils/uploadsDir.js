/**
 * utils/uploadsDir.ts
 *
 * 2.1.316 新增：会话 uploads 目录、上传文件命名（哈希前缀）与已上传文件缓存
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f5xngmy2.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { createHash } from "crypto";
import {
  getSessionUploadsDirOverride,
  getLocalUploadsRoot,
  getSessionId,
  humanAttachmentDigestRegistry,
} from "../bootstrap/state.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { getAttachmentsRoot } from "./stageFileRoots.js";
import { hasTrailingOrReservedName } from "./windowsProfileFolders.js";

//@ chunk-f5xngmy2.js:411-458 placement
/**
 * 当前会话的 uploads 目录。
 */
function sessionUploadsDir() {
  return getSessionUploadsDirOverride() ?? join(getLocalUploadsRoot() ?? getUploadsDir(), getSessionId());
}
//@ chunk-f5xngmy2.js:458-498 placement (2.1.88 match: uploadsDir, 1)
/**
 * uploads 目录路径。
 */
function getUploadsDir() {
  return join(getClaudeConfigDir(), "uploads");
}
//@ chunk-f5xngmy2.js:498-539 placement
/**
 * uploads 根的候选列表。
 */
function uploadsRootCandidates() {
  return [getUploadsDir(), getLocalUploadsRoot() ?? getAttachmentsRoot()];
}
//@ chunk-f5xngmy2.js:539-578 placement
/**
 * 生成带哈希前缀的上传文件名。
 */
function hashPrefixedFileName(prefix, name) {
  return `${prefix}-${savedNameWithUnderscore(name)}`;
}
//@ chunk-f5xngmy2.js:578-662 placement
/**
 * 内容小写后的 8 位 sha256 前缀。
 */
function shortContentHash(fileUuid) {
  return createHash("sha256").update(fileUuid.toLowerCase()).digest("hex").slice(0, 8);
}
//@ chunk-f5xngmy2.js:662-689 placement
var HASH_PREFIX_RE = /^[A-Za-z0-9_-]{8}-/;
//@ chunk-f5xngmy2.js:689-735 placement
function needsTrailingUnderscore(name) {
  return hasTrailingOrReservedName(name.replace(/_+$/, ""));
}
//@ chunk-f5xngmy2.js:735-769 placement
function savedNameWithUnderscore(name) {
  return needsTrailingUnderscore(name) ? name + "_" : name;
}
//@ chunk-f5xngmy2.js:769-865 placement
/**
 * 去哈希前缀的显示文件名。
 */
function uploadDisplayName(name) {
  let name_2 = name.replace(HASH_PREFIX_RE, "");
  if (name_2.endsWith("_") && needsTrailingUnderscore(name_2)) return name_2.slice(0, -1);
  return name_2 || name;
}
//@ chunk-f5xngmy2.js:865-876 placement
var MAX_ATTACHMENT_DIGESTS = 1024;
//@ chunk-f5xngmy2.js:876-996 placement
function rememberAttachmentDigest(key, digest) {
  let registry = humanAttachmentDigestRegistry();
  if (!registry.has(key) && registry.size >= MAX_ATTACHMENT_DIGESTS) {
    let oldestKey = registry.keys().next().value;
    if (oldestKey !== undefined) registry.delete(oldestKey);
  }
  registry.set(key, digest);
}
//@ chunk-f5xngmy2.js:996-1032 placement
/**
 * 取附件摘要登记表里的项。
 */
function attachmentDigestOf(realPath) {
  return humanAttachmentDigestRegistry().get(realPath);
}
export {
  uploadsRootCandidates,
  sessionUploadsDir,
  getUploadsDir,
  hashPrefixedFileName,
  shortContentHash,
  rememberAttachmentDigest,
  attachmentDigestOf,
  uploadDisplayName,
};
