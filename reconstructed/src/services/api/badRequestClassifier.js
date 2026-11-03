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
var Nm = "capability_rejected: ";
//@ chunk-s61vbvea.js:54259-54293 placement
function nVo(e) {
  return `${Nm}${e}`;
}
/**
 * 判断文本中是否包含完整的某个词（后一个字符不是标识符字符）。
 */
//@ chunk-s61vbvea.js:54293-54453 placement
function includesWholeWord(text, word) {
  let r = nVo(word),
    s = 0;
  for (;;) {
    let index = text.indexOf(r, s);
    if (index === -1) return !1;
    let y = text[index + r.length];
    if (y === void 0 || !/[A-Za-z0-9_:.-]/.test(y)) return !0;
    s = index + 1;
  }
}
//@ chunk-s61vbvea.js:54453-54508 placement
function W7s(e) {
  return e.includes(`${Nm}beta_header:`);
}
/**
 * 判断错误消息是否为单纯的"input is too long"（排除 policy_blocked）。
 */
//@ chunk-s61vbvea.js:54639-54829 placement
function isPlainInputTooLong(e) {
  let replaced = e.trim().replace(/^400 /, "");
  return replaced.startsWith("{")
    ? /"message":\s*"input is too long\.?"/i.test(replaced) && !replaced.includes('"policy_blocked"')
    : /^input is too long\.?$/i.test(replaced);
}
//@ chunk-s61vbvea.js:54829-54895 placement
function pqr(e) {
  return e.toLowerCase().includes("context window");
}
/**
 * 判断错误消息是否为"输入长度加 max_tokens 超过上下文上限"。
 */
//@ chunk-s61vbvea.js:54895-54997 placement
function isContextLimitExceeded(e) {
  return e.toLowerCase().includes("input length and `max_tokens` exceed context limit");
}
/**
 * 图片处理错误与不支持 PDF 的错误消息片段列表。
 */
//@ chunk-s61vbvea.js:54997-55327 placement
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
  ],
  PDF_UNSUPPORTED_PHRASES = ["does not support pdf input", "does not support pdfs"];
//@ chunk-s61vbvea.js:55327-55400 placement
function mqr(e) {
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
  if (replaced.includes("signature in thinking block")) return !0;
  if (replaced.includes("invalid data in redacted_thinking block")) return !0;
  if (replaced.includes("thinking.signature") && replaced.includes("field required")) return !0;
  return (
    (replaced.includes("thinking block") || replaced.includes("redacted_thinking")) &&
    (replaced.includes("cannot be modified") || replaced.includes("invalid signature"))
  );
}
/**
 * 从错误消息中提取被拒绝的 thinking 类型（enabled 或 adaptive）。
 */
//@ chunk-s61vbvea.js:55957-56143 placement
function rejectedThinkingType(e) {
  let n =
    /thinking\.type[^a-z]{1,8}(enabled|adaptive)[^]*?not supported/i.exec(e) ??
    /\b(adaptive) thinking is not supported/i.exec(e);
  return n?.[1] ? n[1].toLowerCase() : void 0;
}
//@ chunk-s61vbvea.js:56143-56379 placement
function isEffortUnsupportedError(e) {
  let lower = e.toLowerCase();
  if (lower.includes("effort parameter") && lower.includes("not support")) return !0;
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
function ET(e) {
  return e.toLowerCase().includes("too much media");
}
/**
 * 从 400 错误文本中定位出错的媒体块：能解析出 messages[i].content[j]（可含 tool_result 内层下标）时返回位置与类型，否则按关键短语判断是图片还是文档。
 */
//@ chunk-s61vbvea.js:56548-56975 placement
function locateMediaError(message) {
  let match = message.match(
    /messages[.[](\d+)[\].]+content[.[](\d+)[\].]+(?:tool_result[.[]content[.[](\d+)[\].]+)?(image|document|pdf)/,
  );
  if (match)
    return {
      messageIdx: Number(match[1]),
      contentIdx: Number(match[2]),
      ...(match[3] !== void 0 && { nestedContentIdx: Number(match[3]) }),
      kind: match[4] === "image" ? "image" : "document",
    };
  let lower = message.toLowerCase();
  if (IMAGE_ERROR_PHRASES.some((s) => lower.includes(s))) return { kind: "image" };
  if (DOCUMENT_ERROR_PHRASES.some((s) => lower.includes(s))) return { kind: "document" };
  return;
}
/**
 * 与 system 角色相关的错误消息正则：提到 system、system 位置不对、仅文本 system、角色只能是 user/assistant。
 */
//@ chunk-s61vbvea.js:56975-57393 placement
var SYSTEM_ROLE_PATTERN = /system messages?\b|role .{0,2}system/i,
  MID_CONV_SYSTEM_PATTERN =
    /(?:messages\.(\d{1,6}): )?(?:role .{0,2}system.{0,2} must (?:precede an|follow a)|use the top-level .{0,2}system.{0,2} parameter for the initial system prompt)/i,
  TEXT_ONLY_SYSTEM_PATTERN = /text-only role .{0,2}system.{0,2} messages require/i,
  UNKNOWN_SYSTEM_ROLE_PATTERN =
    /(?:unknown variant .{0,2}system\b.{0,2}, expected|Input should be) [\\'"`]{1,2}(?:user|assistant)\b.{0,2} or [\\'"`]{1,2}(?:user|assistant)\b/i;
/**
 * 解析中途 system 消息被拒的错误，返回涉及的消息序号。
 */
//@ chunk-s61vbvea.js:57393-57494 placement
function parseMidConvSystemRejection(e) {
  let match = MID_CONV_SYSTEM_PATTERN.exec(e);
  if (!match) return;
  return { messageIndex: match[1] === void 0 ? void 0 : Number(match[1]) };
}
//@ chunk-s61vbvea.js:57494-57562 placement
function wyn(e, n) {
  return e.includes(n) && /anthropic[-_]beta/.test(e);
}
//@ chunk-s61vbvea.js:57562-57622 placement
function z7s(e, n) {
  return wyn(e, n) || includesWholeWord(e, `beta_header:${n}`);
}
//@ chunk-s61vbvea.js:57622-57906 placement
function isUnsupportedRoleError(e) {
  if (wyn(e, MID_CONVERSATION_SYSTEM_2026_04_07)) return !0;
  if (parseMidConvSystemRejection(e) !== void 0 || TEXT_ONLY_SYSTEM_PATTERN.test(e)) return !0;
  if (
    (e.includes("Unexpected role") && e.includes("input message role")) ||
    UNKNOWN_SYSTEM_ROLE_PATTERN.test(e)
  )
    return !0;
  if (e.includes("cache_control") && SYSTEM_ROLE_PATTERN.test(e)) return !0;
  return e.includes("not supported") && /role .{0,2}system/i.test(e);
}
//@ chunk-s61vbvea.js:57906-58330 placement
function isCacheControlError(e) {
  if (!e.includes("cache_control")) return !1;
  if (SYSTEM_ROLE_PATTERN.test(e)) return !1;
  if (e.includes("empty text block")) return !1;
  if (/\bsystem\.\d+\./.test(e) || e.includes("tool_result")) return !1;
  if (/\bttl\b/i.test(e)) return !1;
  let lower = e.toLowerCase();
  return (
    lower.includes("not permitted") ||
    lower.includes("cannot be set") ||
    lower.includes("unknown name") ||
    lower.includes("unknown field") ||
    lower.includes("unrecognized") ||
    lower.includes("additional propert")
  );
}
/**
 * 把 400 错误分类为 prompt_too_long、thinking_signature、cache_control 等
 */
//@ chunk-s61vbvea.js:58330-58930 placement
function classifyBadRequest(e, n, r) {
  if (e === 413) return pqr(n) || isPromptTooLongMessage(n) ? "prompt_too_long" : void 0;
  if (e !== 400) return;
  if (isUnsupportedRoleError(n)) return "mid_conv_system";
  if (isCacheControlError(n)) return "cache_control_field";
  if (isThinkingSignatureError(n)) return "thinking_signature";
  let s = rejectedThinkingType(n);
  if (s) return `thinking_type:${s}`;
  if (isOutputFormatExtraInputsError(n)) return "structured_outputs_unsupported";
  if (isEffortUnsupportedError(n)) return "effort_unsupported";
  if (ET(n)) return "media_budget";
  let h = locateMediaError(n);
  if (h) return h.kind === "image" ? "image_block" : "document_block";
  if (isPromptTooLongMessage(n)) return "prompt_too_long";
  if (isContextLimitExceeded(n)) return "max_tokens_context_overflow";
  for (let y of r ?? []) {
    let trimmed = y.trim();
    if (trimmed && wyn(n, trimmed)) return `beta_header:${trimmed}`;
  }
  return;
}

export {
  nVo,
  classifyBadRequest,
  includesWholeWord,
  isContextLimitExceeded,
  isPlainInputTooLong,
  wyn,
  z7s,
  isUnsupportedRoleError,
  parseMidConvSystemRejection,
  isCacheControlError,
  isOutputFormatExtraInputsError,
  isThinkingSignatureError,
  rejectedThinkingType,
  pqr,
  locateMediaError,
  mqr,
  W7s,
};
