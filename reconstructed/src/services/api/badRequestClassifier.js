/**
 * services/api/badRequestClassifier.ts
 *
 * 400 错误分类（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (23)
 * attribution: placement 23
 */
import { MID_CONVERSATION_SYSTEM_2026_04_07 } from "../../utils/betas.js";
import { isPromptTooLongMessage } from "./errors.js";

//@ chunk-s61vbvea.js:54228-54259 placement
var CAPABILITY_REJECTED_PREFIX = "capability_rejected: ";
//@ chunk-s61vbvea.js:54259-54293 placement
/**
 * 导出函数 `capabilityRejectedText`：参数 e，返回 `${Nm}${e}`。
 */
function capabilityRejectedText(e) {
  return `${CAPABILITY_REJECTED_PREFIX}${e}`;
}
//@ chunk-s61vbvea.js:54293-54453 placement
/**
 * 判断文本中是否包含完整的某个词（后一个字符不是标识符字符）。
 */
function includesWholeWord(text, word) {
  let r = capabilityRejectedText(word);
  let s = 0;
  for (;;) {
    let index = text.indexOf(r, s);
    if (index === -1) return false;
    let y = text[index + r.length];
    if (y === undefined || !/[A-Za-z0-9_:.-]/.test(y)) return true;
    s = index + 1;
  }
}
//@ chunk-s61vbvea.js:54453-54508 placement
/**
 * 导出函数 `isBetaHeaderRejection`：参数 e，返回 e.includes(`${Nm}beta_header:`)。
 */
function isBetaHeaderRejection(message) {
  return message.includes(`${CAPABILITY_REJECTED_PREFIX}beta_header:`);
}
//@ chunk-s61vbvea.js:54639-54829 placement
/**
 * 判断错误消息是否为单纯的"input is too long"（排除 policy_blocked）。
 */
function isPlainInputTooLong(message) {
  let replaced = message.trim().replace(/^400 /, "");
  return replaced.startsWith("{")
    ? /"message":\s*"input is too long\.?"/i.test(replaced) && !replaced.includes('"policy_blocked"')
    : /^input is too long\.?$/i.test(replaced);
}
//@ chunk-s61vbvea.js:54829-54895 placement
/**
 * 导出函数 `isContextWindowError`：参数 e，返回 e.toLowerCase().includes("context window")。
 */
function isContextWindowError(message) {
  return message.toLowerCase().includes("context window");
}
//@ chunk-s61vbvea.js:54895-54997 placement
/**
 * 判断错误消息是否为"输入长度加 max_tokens 超过上下文上限"。
 */
function isContextLimitExceeded(e) {
  return e.toLowerCase().includes("input length and `max_tokens` exceed context limit");
}
//@ chunk-s61vbvea.js:54997-55327 placement
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
//@ chunk-s61vbvea.js:55327-55400 placement
/**
 * 导出函数 `isPdfUnsupportedError`：参数 e，返回 PDF_UNSUPPORTED_PHRASES.some((r) => lower.includes(r))。
 */
function isPdfUnsupportedError(e) {
  let lower = e.toLowerCase();
  return PDF_UNSUPPORTED_PHRASES.some((r) => lower.includes(r));
}
//@ chunk-s61vbvea.js:55400-55566 placement
var DOCUMENT_ERROR_PHRASES = [
  "could not process pdf",
  "pdf pages",
  "the pdf specified was not valid",
  "the pdf specified is password protected",
  "pdf cannot be empty",
  ...PDF_UNSUPPORTED_PHRASES,
  "too much media",
];
//@ chunk-s61vbvea.js:55566-55957 placement
function isThinkingSignatureError(e) {
  let replaced = e.toLowerCase().replaceAll("`", "");
  if (replaced.includes("signature in thinking block")) return true;
  if (replaced.includes("invalid data in redacted_thinking block")) return true;
  if (replaced.includes("thinking.signature") && replaced.includes("field required")) return true;
  return (
    (replaced.includes("thinking block") || replaced.includes("redacted_thinking")) &&
    (replaced.includes("cannot be modified") || replaced.includes("invalid signature"))
  );
}
//@ chunk-s61vbvea.js:55957-56143 placement
/**
 * 从错误消息中提取被拒绝的 thinking 类型（enabled 或 adaptive）。
 */
function rejectedThinkingType(e) {
  let n =
    /thinking\.type[^a-z]{1,8}(enabled|adaptive)[^]*?not supported/i.exec(e) ??
    /\b(adaptive) thinking is not supported/i.exec(e);
  return n?.[1] ? n[1].toLowerCase() : undefined;
}
//@ chunk-s61vbvea.js:56143-56379 placement
function isEffortUnsupportedError(e) {
  let lower = e.toLowerCase();
  if (lower.includes("effort parameter") && lower.includes("not support")) return true;
  return (
    lower.includes("output_config") &&
    (lower.includes("extra inputs are not permitted") || lower.includes("requires a model that supports"))
  );
}
//@ chunk-s61vbvea.js:56379-56483 placement
function isOutputFormatExtraInputsError(e) {
  return e.toLowerCase().includes("output_config.format: extra inputs are not permitted");
}
//@ chunk-s61vbvea.js:56483-56548 placement
function isTooMuchMediaError(e) {
  return e.toLowerCase().includes("too much media");
}
//@ chunk-s61vbvea.js:56548-56975 placement
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
  if (IMAGE_ERROR_PHRASES.some((s) => lower.includes(s)))
    return {
      kind: "image",
    };
  if (DOCUMENT_ERROR_PHRASES.some((s) => lower.includes(s)))
    return {
      kind: "document",
    };
  return;
}
//@ chunk-s61vbvea.js:56975-57393 placement
/**
 * 与 system 角色相关的错误消息正则：提到 system、system 位置不对、仅文本 system、角色只能是 user/assistant。
 */
var SYSTEM_ROLE_PATTERN = /system messages?\b|role .{0,2}system/i;
var MID_CONV_SYSTEM_PATTERN =
  /(?:messages\.(\d{1,6}): )?(?:role .{0,2}system.{0,2} must (?:precede an|follow a)|use the top-level .{0,2}system.{0,2} parameter for the initial system prompt)/i;
var TEXT_ONLY_SYSTEM_PATTERN = /text-only role .{0,2}system.{0,2} messages require/i;
var UNKNOWN_SYSTEM_ROLE_PATTERN =
  /(?:unknown variant .{0,2}system\b.{0,2}, expected|Input should be) [\\'"`]{1,2}(?:user|assistant)\b.{0,2} or [\\'"`]{1,2}(?:user|assistant)\b/i;
//@ chunk-s61vbvea.js:57393-57494 placement
/**
 * 解析中途 system 消息被拒的错误，返回涉及的消息序号。
 */
function parseMidConvSystemRejection(e) {
  let match = MID_CONV_SYSTEM_PATTERN.exec(e);
  if (!match) return;
  return {
    messageIndex: match[1] === undefined ? undefined : Number(match[1]),
  };
}
//@ chunk-s61vbvea.js:57494-57562 placement
/**
 * 导出函数 `mentionsAnthropicBeta`：参数 e, n，返回 e.includes(n) && /anthropic[-_]beta/.test(e)。
 */
function mentionsAnthropicBeta(e, n) {
  return e.includes(n) && /anthropic[-_]beta/.test(e);
}
//@ chunk-s61vbvea.js:57562-57622 placement
/**
 * 导出函数 `isBetaHeaderNamed`：参数 e, n，返回 wyn(e, n) || includesWholeWord(e, `beta_header:${n}`)。
 */
function isBetaHeaderNamed(e, header) {
  return mentionsAnthropicBeta(e, header) || includesWholeWord(e, `beta_header:${header}`);
}
//@ chunk-s61vbvea.js:57622-57906 placement
function isUnsupportedRoleError(e) {
  if (mentionsAnthropicBeta(e, MID_CONVERSATION_SYSTEM_2026_04_07)) return true;
  if (parseMidConvSystemRejection(e) !== undefined || TEXT_ONLY_SYSTEM_PATTERN.test(e)) return true;
  if (
    (e.includes("Unexpected role") && e.includes("input message role")) ||
    UNKNOWN_SYSTEM_ROLE_PATTERN.test(e)
  )
    return true;
  if (e.includes("cache_control") && SYSTEM_ROLE_PATTERN.test(e)) return true;
  return e.includes("not supported") && /role .{0,2}system/i.test(e);
}
//@ chunk-s61vbvea.js:57906-58330 placement
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
//@ chunk-s61vbvea.js:58330-58930 placement
/**
 * 把 400 错误分类为 prompt_too_long、thinking_signature、cache_control 等
 */
function classifyBadRequest(status, message, r) {
  if (status === 413)
    return isContextWindowError(message) || isPromptTooLongMessage(message) ? "prompt_too_long" : undefined;
  if (status !== 400) return;
  if (isUnsupportedRoleError(message)) return "mid_conv_system";
  if (isCacheControlError(message)) return "cache_control_field";
  if (isThinkingSignatureError(message)) return "thinking_signature";
  let s = rejectedThinkingType(message);
  if (s) return `thinking_type:${s}`;
  if (isOutputFormatExtraInputsError(message)) return "structured_outputs_unsupported";
  if (isEffortUnsupportedError(message)) return "effort_unsupported";
  if (isTooMuchMediaError(message)) return "media_budget";
  let h = locateMediaError(message);
  if (h) return h.kind === "image" ? "image_block" : "document_block";
  if (isPromptTooLongMessage(message)) return "prompt_too_long";
  if (isContextLimitExceeded(message)) return "max_tokens_context_overflow";
  for (let y of r ?? []) {
    let trimmed = y.trim();
    if (trimmed && mentionsAnthropicBeta(message, trimmed)) return `beta_header:${trimmed}`;
  }
  return;
}
export {
  capabilityRejectedText,
  classifyBadRequest,
  includesWholeWord,
  isContextLimitExceeded,
  isPlainInputTooLong,
  mentionsAnthropicBeta,
  isBetaHeaderNamed,
  isUnsupportedRoleError,
  parseMidConvSystemRejection,
  isCacheControlError,
  isOutputFormatExtraInputsError,
  isThinkingSignatureError,
  rejectedThinkingType,
  isContextWindowError,
  locateMediaError,
  isPdfUnsupportedError,
  isBetaHeaderRejection,
};
