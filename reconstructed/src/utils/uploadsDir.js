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
import { qEr } from "./windowsProfileFolders.js";

//@ chunk-f87fzzk4.js:411-458 placement
function NA() {
  return getSessionUploadsDirOverride() ?? join(getLocalUploadsRoot() ?? getUploadsDir(), getSessionId());
}
/**
 * uploads 目录路径。
 */
//@ chunk-f87fzzk4.js:458-498 placement = uploadsDir (1)
function getUploadsDir() {
  return join(getClaudeConfigDir(), "uploads");
}
//@ chunk-f87fzzk4.js:498-540 placement
function y4e() {
  return [getUploadsDir(), getLocalUploadsRoot() ?? getAttachmentsRoot()];
}
//@ chunk-f87fzzk4.js:540-579 placement
function iwn(t, e) {
  return `${t}-${u(e)}`;
}
//@ chunk-f87fzzk4.js:579-663 placement
function m3r(t) {
  return createHash("sha256").update(t.toLowerCase()).digest("hex").slice(0, 8);
}
//@ chunk-f87fzzk4.js:663-690 placement
var a = /^[A-Za-z0-9_-]{8}-/;
//@ chunk-f87fzzk4.js:690-736 placement
function o(t) {
  return qEr(t.replace(/_+$/, ""));
}
//@ chunk-f87fzzk4.js:736-770 placement
function u(t) {
  return o(t) ? t + "_" : t;
}
//@ chunk-f87fzzk4.js:770-866 placement
function Mai(t) {
  let replaced = t.replace(a, "");
  if (replaced.endsWith("_") && o(replaced)) return replaced.slice(0, -1);
  return replaced || t;
}
//@ chunk-f87fzzk4.js:866-877 placement
var c = 1024;
//@ chunk-f87fzzk4.js:877-997 placement
function rememberAttachmentDigest(t, e) {
  let n = humanAttachmentDigestRegistry();
  if (!n.has(t) && n.size >= c) {
    let r = n.keys().next().value;
    if (r !== void 0) n.delete(r);
  }
  n.set(t, e);
}
//@ chunk-f87fzzk4.js:997-1033 placement
function Dot(t) {
  return humanAttachmentDigestRegistry().get(t);
}

export { NA, y4e, Dot, iwn, m3r, rememberAttachmentDigest, getUploadsDir, Mai };
