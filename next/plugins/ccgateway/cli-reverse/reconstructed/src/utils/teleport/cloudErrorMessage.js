/**
 * utils/teleport/cloudErrorMessage.ts
 *
 * 2.1.316 新增：规范化云服务错误消息。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { INVISIBLE_CHAR_CLASS_SOURCE } from "../sanitization.js";
import { TAG_BRACKET_CLASSES } from "../confusables.js";
import { printableName, quotedPrintable } from "../printableName.js";
import { logForDebugging } from "../debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:802145-802323 placement
var NOT_SHOWN_PLACEHOLDER; // deferred: uses INVISIBLE_CHAR_CLASSES (../sanitization.js) of its import cycle while loading; runs once the cycle is complete
var MESSAGE_NOT_SHOWN_NOTE;
var SUSPICIOUS_TEXT_RE;
deferInit("chunk-exfmq47h.js:802145", () => {
  NOT_SHOWN_PLACEHOLDER = "[not shown]";
  MESSAGE_NOT_SHOWN_NOTE =
    "is not shown because it is too long or has unusual characters or spacing. Run again with --debug to see it.";
  SUSPICIOUS_TEXT_RE = new RegExp(`^\\s*$|\\s{2}|[${INVISIBLE_CHAR_CLASS_SOURCE}]`, "u");
});
//@ chunk-exfmq47h.js:802323-802417 placement
function printableField(keep, option, normalize = (value) => value) {
  return (text, fallback = NOT_SHOWN_PLACEHOLDER) =>
    typeof text === "string" && !SUSPICIOUS_TEXT_RE.test(text) && keep(text, option) === normalize(text)
      ? text
      : fallback;
}
//@ chunk-exfmq47h.js:802417-802482 placement
var regExp_32; // deferred: uses INVISIBLE_CHAR_CLASSES (../confusables.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:802417", () => {
  regExp_32 = new RegExp(`[${TAG_BRACKET_CLASSES.open}${TAG_BRACKET_CLASSES.close}]|&#?\\w+;|\\]\\(`, "u");
});
//@ chunk-exfmq47h.js:802482-802554 placement
function suspiciousTextGuarded(render) {
  return (text, fallback = NOT_SHOWN_PLACEHOLDER) =>
    typeof text === "string" && regExp_32.test(text) ? fallback : render(text, fallback);
}
//@ chunk-exfmq47h.js:802554-802639 placement
/**
 * 状态文本的可打印形式（带可疑字符防护）。
 */
var printableStatusText; // deferred: uses suspiciousTextGuarded of its import cycle while loading; runs once the cycle is complete
var singleTokenText;
var printableMultiline;
deferInit("chunk-exfmq47h.js:802554", () => {
  printableStatusText = suspiciousTextGuarded(printableField(printableName, 200));
  singleTokenText = suspiciousTextGuarded(printableField(quotedPrintable, 200));
  printableMultiline = printableField(printableName, 1000, (text) => text.replaceAll("`", "'"));
});
//@ chunk-exfmq47h.js:802639-802708 placement
/**
 * 单 token 文本或占位符。
 */
function singleTokenOrPlaceholder(url) {
  return typeof url === "string" && !/\s/u.test(url) ? singleTokenText(url) : NOT_SHOWN_PLACEHOLDER;
}
//@ chunk-exfmq47h.js:802708-802782 placement
/**
 * 合法的单 token 文本或占位符。
 */
function safeTokenText(token) {
  return typeof token === "string" && /^[\w-]{1,200}$/.test(token) ? token : NOT_SHOWN_PLACEHOLDER;
}
//@ chunk-exfmq47h.js:802782-803127 placement
/**
 * 规范化云服务错误消息。
 */
function cloudErrorMessage(response, message) {
  let message_2 = typeof message === "string" ? message.trim() : message;
  let printable = printableMultiline(message_2, "");
  let wasWithheld = (typeof message_2 === "string" && message_2 !== printable) || undefined;
  if (wasWithheld)
    logForDebugging(`the cloud service's message (HTTP ${response.status}), not shown: ${message}`, {
      level: "error",
    });
  let trimmed = `${response.status} ${printableStatusText(response.statusText, "")}`.trim();
  return {
    message: printable || undefined,
    messageHidden: wasWithheld,
    statusLine: wasWithheld ? `${trimmed}. The cloud service's message ${MESSAGE_NOT_SHOWN_NOTE}` : trimmed,
  };
}
export {
  cloudErrorMessage,
  safeTokenText,
  singleTokenText,
  printableStatusText,
  singleTokenOrPlaceholder,
  printableMultiline,
  MESSAGE_NOT_SHOWN_NOTE,
};
