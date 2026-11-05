/**
 * services/api/badRequestClassifier.ts
 *
 * 400 错误分类（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (23)
 * attribution: placement 23
 */
import { MID_CONVERSATION_SYSTEM_2026_04_07 } from "../../utils/betas.js";
import { isPromptTooLongMessage } from "./errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:53167-53198 placement
var CAPABILITY_REJECTED_PREFIX = "capability_rejected: ";
//@ chunk-7jxyna5q.js:53198-53232 placement
/**
 * 导出函数 `capabilityRejectedText`：参数 e，返回 `${Nm}${e}`。
 */
function capabilityRejectedText(word) {
  return `${CAPABILITY_REJECTED_PREFIX}${word}`;
}
//@ chunk-7jxyna5q.js:53232-53392 placement
/**
 * 判断文本中是否包含完整的某个词（后一个字符不是标识符字符）。
 */
function includesWholeWord(text, word) {
  let needle = capabilityRejectedText(word);
  let fromIndex = 0;
  for (;;) {
    let index = text.indexOf(needle, fromIndex);
    if (index === -1) return false;
    let nextChar = text[index + needle.length];
    if (nextChar === undefined || !/[A-Za-z0-9_:.-]/.test(nextChar)) return true;
    fromIndex = index + 1;
  }
}
//@ chunk-7jxyna5q.js:53392-53447 placement
/**
 * 导出函数 `isBetaHeaderRejection`：参数 e，返回 e.includes(`${Nm}beta_header:`)。
 */
function isBetaHeaderRejection(message) {
  return message.includes(`${CAPABILITY_REJECTED_PREFIX}beta_header:`);
}
//@ chunk-7jxyna5q.js:53578-53768 placement
/**
 * 判断错误消息是否为单纯的"input is too long"（排除 policy_blocked）。
 */
function isPlainInputTooLong(message) {
  let replaced = message.trim().replace(/^400 /, "");
  return replaced.startsWith("{")
    ? /"message":\s*"input is too long\.?"/i.test(replaced) && !replaced.includes('"policy_blocked"')
    : /^input is too long\.?$/i.test(replaced);
}
//@ chunk-7jxyna5q.js:53768-53834 placement
/**
 * 导出函数 `isContextWindowError`：参数 e，返回 e.toLowerCase().includes("context window")。
 */
function isContextWindowError(message) {
  return message.toLowerCase().includes("context window");
}
//@ chunk-7jxyna5q.js:53834-53936 placement
/**
 * 判断错误消息是否为"输入长度加 max_tokens 超过上下文上限"。
 */
function isContextLimitExceeded(message) {
  return message.toLowerCase().includes("input length and `max_tokens` exceed context limit");
}
//@ chunk-7jxyna5q.js:53936-54266 placement
/**
 * 图片处理错误与不支持 PDF 的错误消息片段列表。
 */
var IMAGE_ERROR_PHRASES = [
  "could not process image",
  "image exceeds",
  "image dimensions exceed",
  "image does not match the provided media type",
  "image cannot be empty",
  "exceeds api limit",
  "images exceed the api limit",
  "unable to resize image",
  "unable to compress image",
  "image file is empty",
];
var PDF_UNSUPPORTED_PHRASES = ["does not support pdf input", "does not support pdfs"];
//@ chunk-7jxyna5q.js:54266-54339 placement
/**
 * 导出函数 `isPdfUnsupportedError`：参数 e，返回 PDF_UNSUPPORTED_PHRASES.some((r) => lower.includes(r))。
 */
function isPdfUnsupportedError(message) {
  let lower = message.toLowerCase();
  return PDF_UNSUPPORTED_PHRASES.some((phrase) => lower.includes(phrase));
}
//@ chunk-7jxyna5q.js:54339-54505 placement
var DOCUMENT_ERROR_PHRASES; // deferred: uses IMAGE_ERROR_PHRASES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:54339", () => {
  DOCUMENT_ERROR_PHRASES = [
    "could not process pdf",
    "pdf pages",
    "the pdf specified was not valid",
    "the pdf specified is password protected",
    "pdf cannot be empty",
    ...PDF_UNSUPPORTED_PHRASES,
    "too much media",
  ];
});
//@ chunk-7jxyna5q.js:54505-54896 placement
function isThinkingSignatureError(message) {
  let replaced = message.toLowerCase().replaceAll("`", "");
  if (replaced.includes("signature in thinking block")) return true;
  if (replaced.includes("invalid data in redacted_thinking block")) return true;
  if (replaced.includes("thinking.signature") && replaced.includes("field required")) return true;
  return (
    (replaced.includes("thinking block") || replaced.includes("redacted_thinking")) &&
    (replaced.includes("cannot be modified") || replaced.includes("invalid signature"))
  );
}
//@ chunk-7jxyna5q.js:54896-55082 placement
/**
 * 从错误消息中提取被拒绝的 thinking 类型（enabled 或 adaptive）。
 */
function rejectedThinkingType(message) {
  let match =
    /thinking\.type[^a-z]{1,8}(enabled|adaptive)[^]*?not supported/i.exec(message) ??
    /\b(adaptive) thinking is not supported/i.exec(message);
  return match?.[1] ? match[1].toLowerCase() : undefined;
}
//@ chunk-7jxyna5q.js:55082-55318 placement
function isEffortUnsupportedError(message) {
  let lower = message.toLowerCase();
  if (lower.includes("effort parameter") && lower.includes("not support")) return true;
  return (
    lower.includes("output_config") &&
    (lower.includes("extra inputs are not permitted") || lower.includes("requires a model that supports"))
  );
}
//@ chunk-7jxyna5q.js:55318-55422 placement
function isOutputFormatExtraInputsError(message) {
  return message.toLowerCase().includes("output_config.format: extra inputs are not permitted");
}
//@ chunk-7jxyna5q.js:55422-55487 placement
function isTooMuchMediaError(message) {
  return message.toLowerCase().includes("too much media");
}
//@ chunk-7jxyna5q.js:55487-55914 placement
/**
 * 从 400 错误文本中定位出错的媒体块：能解析出 messages[i].content[j]（可含 tool_result 内层下标）时返回位置与类型，否则按关键短语判断是图片还是文档。
 */
function locateMediaError(message) {
  let match = message.match(
    /messages[.[](\d+)[\].]+content[.[](\d+)[\].]+(?:tool_result[.[]content[.[](\d+)[\].]+)?(image|document|pdf)/,
  );
  if (match)
    return {
      messageIdx: Number(match[1]),
      contentIdx: Number(match[2]),
      ...(match[3] !== undefined && {
        nestedContentIdx: Number(match[3]),
      }),
      kind: match[4] === "image" ? "image" : "document",
    };
  let lower = message.toLowerCase();
  if (IMAGE_ERROR_PHRASES.some((phrase) => lower.includes(phrase)))
    return {
      kind: "image",
    };
  if (DOCUMENT_ERROR_PHRASES.some((phrase) => lower.includes(phrase)))
    return {
      kind: "document",
    };
  return;
}
//@ chunk-7jxyna5q.js:55914-56332 placement
/**
 * 与 system 角色相关的错误消息正则：提到 system、system 位置不对、仅文本 system、角色只能是 user/assistant。
 */
var SYSTEM_ROLE_PATTERN = /system messages?\b|role .{0,2}system/i;
var MID_CONV_SYSTEM_PATTERN =
  /(?:messages\.(\d{1,6}): )?(?:role .{0,2}system.{0,2} must (?:precede an|follow a)|use the top-level .{0,2}system.{0,2} parameter for the initial system prompt)/i;
var TEXT_ONLY_SYSTEM_PATTERN = /text-only role .{0,2}system.{0,2} messages require/i;
var UNKNOWN_SYSTEM_ROLE_PATTERN =
  /(?:unknown variant .{0,2}system\b.{0,2}, expected|Input should be) [\\'"`]{1,2}(?:user|assistant)\b.{0,2} or [\\'"`]{1,2}(?:user|assistant)\b/i;
//@ chunk-7jxyna5q.js:56332-56433 placement
/**
 * 解析中途 system 消息被拒的错误，返回涉及的消息序号。
 */
function parseMidConvSystemRejection(message) {
  let match = MID_CONV_SYSTEM_PATTERN.exec(message);
  if (!match) return;
  return {
    messageIndex: match[1] === undefined ? undefined : Number(match[1]),
  };
}
//@ chunk-7jxyna5q.js:56433-56501 placement
/**
 * 导出函数 `mentionsAnthropicBeta`：参数 e, n，返回 e.includes(n) && /anthropic[-_]beta/.test(e)。
 */
function mentionsAnthropicBeta(message, headerName) {
  return message.includes(headerName) && /anthropic[-_]beta/.test(message);
}
//@ chunk-7jxyna5q.js:56501-56561 placement
/**
 * 导出函数 `isBetaHeaderNamed`：参数 e, n，返回 wyn(e, n) || includesWholeWord(e, `beta_header:${n}`)。
 */
function isBetaHeaderNamed(message, header) {
  return mentionsAnthropicBeta(message, header) || includesWholeWord(message, `beta_header:${header}`);
}
//@ chunk-7jxyna5q.js:56561-56845 placement
function isUnsupportedRoleError(message) {
  if (mentionsAnthropicBeta(message, MID_CONVERSATION_SYSTEM_2026_04_07)) return true;
  if (parseMidConvSystemRejection(message) !== undefined || TEXT_ONLY_SYSTEM_PATTERN.test(message))
    return true;
  if (
    (message.includes("Unexpected role") && message.includes("input message role")) ||
    UNKNOWN_SYSTEM_ROLE_PATTERN.test(message)
  )
    return true;
  if (message.includes("cache_control") && SYSTEM_ROLE_PATTERN.test(message)) return true;
  return message.includes("not supported") && /role .{0,2}system/i.test(message);
}
//@ chunk-7jxyna5q.js:56845-57269 placement
function isCacheControlError(message) {
  if (!message.includes("cache_control")) return false;
  if (SYSTEM_ROLE_PATTERN.test(message)) return false;
  if (message.includes("empty text block")) return false;
  if (/\bsystem\.\d+\./.test(message) || message.includes("tool_result")) return false;
  if (/\bttl\b/i.test(message)) return false;
  let lower = message.toLowerCase();
  return (
    lower.includes("not permitted") ||
    lower.includes("cannot be set") ||
    lower.includes("unknown name") ||
    lower.includes("unknown field") ||
    lower.includes("unrecognized") ||
    lower.includes("additional propert")
  );
}
//@ chunk-7jxyna5q.js:57269-57869 placement
/**
 * 把 400 错误分类为 prompt_too_long、thinking_signature、cache_control 等
 */
function classifyBadRequest(status, message, knownBetaHeaders) {
  if (status === 413)
    return isContextWindowError(message) || isPromptTooLongMessage(message) ? "prompt_too_long" : undefined;
  if (status !== 400) return;
  if (isUnsupportedRoleError(message)) return "mid_conv_system";
  if (isCacheControlError(message)) return "cache_control_field";
  if (isThinkingSignatureError(message)) return "thinking_signature";
  let thinkingType = rejectedThinkingType(message);
  if (thinkingType) return `thinking_type:${thinkingType}`;
  if (isOutputFormatExtraInputsError(message)) return "structured_outputs_unsupported";
  if (isEffortUnsupportedError(message)) return "effort_unsupported";
  if (isTooMuchMediaError(message)) return "media_budget";
  let mediaLocation = locateMediaError(message);
  if (mediaLocation) return mediaLocation.kind === "image" ? "image_block" : "document_block";
  if (isPromptTooLongMessage(message)) return "prompt_too_long";
  if (isContextLimitExceeded(message)) return "max_tokens_context_overflow";
  for (let betaHeader of knownBetaHeaders ?? []) {
    let trimmed = betaHeader.trim();
    if (trimmed && mentionsAnthropicBeta(message, trimmed)) return `beta_header:${trimmed}`;
  }
  return;
}
export {
  capabilityRejectedText,
  classifyBadRequest,
  isPlainInputTooLong,
  includesWholeWord,
  locateMediaError,
  isPdfUnsupportedError,
  isContextLimitExceeded,
  mentionsAnthropicBeta,
  isBetaHeaderNamed,
  isUnsupportedRoleError,
  parseMidConvSystemRejection,
  isCacheControlError,
  isOutputFormatExtraInputsError,
  isThinkingSignatureError,
  rejectedThinkingType,
  isContextWindowError,
  isBetaHeaderRejection,
};
