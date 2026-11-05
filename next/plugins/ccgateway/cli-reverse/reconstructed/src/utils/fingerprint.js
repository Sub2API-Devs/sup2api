/**
 * utils/fingerprint.ts
 *
 * 计费头 cc_version 后缀的 3 位指纹（盐 + 首条消息第 4/7/20 字符 + 版本）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fingerprint.ts
 * pieces: chunk-7jxyna5q.js (4)
 * attribution: fingerprint 1, file-local 1, callgraph-fingerprint 1, file-last-pair 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";

//@ chunk-7jxyna5q.js:373973-373995 fingerprint (2.1.88 match: FINGERPRINT_SALT, 1)
var FINGERPRINT_SALT = "59cf53e54c78";
//@ chunk-7jxyna5q.js:373995-374228 file-local
function extractFirstMessageText(messages) {
  let firstUserMessage = messages.find((msg) => msg.type === "user" && !msg.isMeta);
  if (!firstUserMessage) return "";
  let content = firstUserMessage.message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    let textBlock = content.find((block) => block.type === "text");
    if (textBlock && textBlock.type === "text") return textBlock.text;
  }
  return "";
}
//@ chunk-7jxyna5q.js:374228-374362 callgraph-fingerprint (2.1.88 match: computeFingerprint, 1)
/**
 * 计费头 cc_version 的 3 位指纹：sha256(盐 59cf53e54c78 + 首条用户消息第 4/7/20 个字符 + 版本号) 取前 3 个 hex。
 */
function computeFingerprint(messageText, version) {
  let chars = [4, 7, 20].map((i) => messageText[i] || "0").join("");
  let fingerprintInput = `${FINGERPRINT_SALT}${chars}${version}`;
  return createHash("sha256").update(fingerprintInput).digest("hex").slice(0, 3);
}
//@ chunk-7jxyna5q.js:374362-374890 file-last-pair
function computeFingerprintFromMessages(messages) {
  let firstMessageText = extractFirstMessageText(messages);
  return computeFingerprint(
    firstMessageText,
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
  );
}
export { computeFingerprintFromMessages, computeFingerprint };
