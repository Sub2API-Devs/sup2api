/**
 * utils/teleport/cloudErrorMessage.ts
 *
 * 2.1.316 新增：规范化云服务错误消息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (8)
 * attribution: placement 8
 */
import { INVISIBLE_CHAR_CLASS_SOURCE } from "../sanitization.js";
import { TAG_BRACKET_CLASSES } from "../confusables.js";
import { printableName, quotedPrintable } from "../printableName.js";
import { logForDebugging } from "../debug.js";

//@ chunk-aepeg2w5.js:781349-781527 placement
var NOT_SHOWN_PLACEHOLDER = "[not shown]";
var MESSAGE_NOT_SHOWN_NOTE =
  "is not shown because it is too long or has unusual characters or spacing. Run again with --debug to see it.";
var SUSPICIOUS_TEXT_RE = new RegExp(`^\\s*$|\\s{2}|[${INVISIBLE_CHAR_CLASS_SOURCE}]`, "u");
//@ chunk-aepeg2w5.js:781527-781621 placement
function printableField(e, n, r = (s) => s) {
  return (s, h = NOT_SHOWN_PLACEHOLDER) =>
    typeof s === "string" && !SUSPICIOUS_TEXT_RE.test(s) && e(s, n) === r(s) ? s : h;
}
//@ chunk-aepeg2w5.js:781621-781686 placement
var regExp_32 = new RegExp(`[${TAG_BRACKET_CLASSES.open}${TAG_BRACKET_CLASSES.close}]|&#?\\w+;|\\]\\(`, "u");
//@ chunk-aepeg2w5.js:781686-781758 placement
function suspiciousTextGuarded(e) {
  return (n, r = NOT_SHOWN_PLACEHOLDER) => (typeof n === "string" && regExp_32.test(n) ? r : e(n, r));
}
//@ chunk-aepeg2w5.js:781758-781843 placement
/**
 * 状态文本的可打印形式（带可疑字符防护）。
 */
var printableStatusText = suspiciousTextGuarded(printableField(printableName, 200));
var singleTokenText = suspiciousTextGuarded(printableField(quotedPrintable, 200));
var printableMultiline = printableField(printableName, 1000, (e) => e.replaceAll("`", "'"));
//@ chunk-aepeg2w5.js:781843-781912 placement
/**
 * 单 token 文本或占位符。
 */
function singleTokenOrPlaceholder(url) {
  return typeof url === "string" && !/\s/u.test(url) ? singleTokenText(url) : NOT_SHOWN_PLACEHOLDER;
}
//@ chunk-aepeg2w5.js:781912-781986 placement
/**
 * 合法的单 token 文本或占位符。
 */
function safeTokenText(e) {
  return typeof e === "string" && /^[\w-]{1,200}$/.test(e) ? e : NOT_SHOWN_PLACEHOLDER;
}
//@ chunk-aepeg2w5.js:781986-782331 placement
/**
 * 规范化云服务错误消息。
 */
function cloudErrorMessage(response, message) {
  let r = typeof message === "string" ? message.trim() : message;
  let s = printableMultiline(r, "");
  let h = (typeof r === "string" && r !== s) || undefined;
  if (h)
    logForDebugging(`the cloud service's message (HTTP ${response.status}), not shown: ${message}`, {
      level: "error",
    });
  let trimmed = `${response.status} ${printableStatusText(response.statusText, "")}`.trim();
  return {
    message: s || undefined,
    messageHidden: h,
    statusLine: h ? `${trimmed}. The cloud service's message ${MESSAGE_NOT_SHOWN_NOTE}` : trimmed,
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
