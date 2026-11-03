/**
 * cli/structuredOutputRetry.ts
 *
 * 结构化输出重试与失败文本（含模型回退撤回）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mx88mbsd.js (5)
 * attribution: placement 5
 */
import { LINE_BREAK_CHARS_RE } from "../tools/AgentTool/handbackReport.js";
import { stripFormatChars, Dr, truncateToLength } from "../utils/stringUtils.js";
import { sanitizeSubagentOutput } from "../utils/subagentOutputScan.js";
import { logError } from "../utils/log.js";
import { STRUCTUREDOUTPUT } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";

/**
 * 结构化输出重试上限（5）、被模型回退撤回时的失败文本，以及工具错误摘录长度上限（600）。
 */
//@ chunk-mx88mbsd.js:377-488 placement
var MAX_STRUCTURED_OUTPUT_RETRIES = 5,
  STRUCTURED_OUTPUT_RETRACTED_MESSAGE =
    "Structured output was retracted by a model fallback and no retry produced a valid result",
  MAX_TOOL_ERROR_EXCERPT_CHARS = 600;
/**
 * 结构化输出多次失败（含被模型回退撤回）时的错误文本
 */
//@ chunk-mx88mbsd.js:488-764 placement
function formatStructuredOutputFailure(t, r, e) {
  if (r > 0)
    return `Failed to provide surviving structured output after ${t} attempts (${r} retracted by a model fallback)`;
  let n = `Failed to provide valid structured output after ${t} attempts`;
  return e === void 0 ? n : `${n} \u2014 last StructuredOutput error: ${e}`;
}
/**
 * 从工具结果（字符串或文本块数组）提取错误摘录：去掉 tool_use_error 标签、逐行清理、两次消毒，超过 600 字符截断加省略号；空则 undefined。
 */
//@ chunk-mx88mbsd.js:764-1173 placement
function extractToolErrorExcerpt(t) {
  let r =
    typeof t === "string"
      ? t
      : Array.isArray(t)
        ? t.flatMap((i) => (i.type === "text" ? [i.text] : [])).join(`
`)
        : void 0;
  if (r === void 0) return;
  let joined = r
      .replace(/^<tool_use_error>/, "")
      .replace(/<\/tool_use_error>$/, "")
      .replace(
        LINE_BREAK_CHARS_RE,
        `
`,
      )
      .split(
        `
`,
      )
      .map(stripFormatChars).join(`
`),
    sanitized = sanitizeSubagentOutput(joined, { prependMarker: !1 }).sanitized,
    u = Dr(sanitized);
  if (u.length === 0) return;
  let s =
    u.length > MAX_TOOL_ERROR_EXCERPT_CHARS
      ? truncateToLength(u, MAX_TOOL_ERROR_EXCERPT_CHARS) + "\u2026"
      : u;
  return sanitizeSubagentOutput(s, { prependMarker: !1 }).sanitized;
}
/**
 * 从消息列表中某条消息之后（找不到则全量）检查是否有成功的工具调用；异常记日志返回 undefined。
 */
//@ chunk-mx88mbsd.js:1173-1284 placement
function hasSuccessfulToolCallSince(t, r) {
  try {
    let e = r === void 0 ? 0 : t.lastIndexOf(r) + 1;
    return hasSuccessfulToolCall(e === 0 ? t : t.slice(e));
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-mx88mbsd.js:1284-1763 placement = hasSuccessfulToolCall (1)
function hasSuccessfulToolCall(t) {
  let r = new Set();
  for (let e of t) {
    if (e?.type !== "assistant") continue;
    let content = e.message.content;
    if (!Array.isArray(content)) continue;
    for (let o of content) if (o.type === "tool_use" && o.name === STRUCTUREDOUTPUT) r.add(o.id);
  }
  if (r.size === 0) return;
  for (let e = t.length - 1; e >= 0; e--) {
    let n = t[e];
    if (n?.type !== "user") continue;
    let content = n.message.content;
    if (!Array.isArray(content)) continue;
    for (let u = content.length - 1; u >= 0; u--) {
      let s = content[u];
      if (s?.type === "tool_result" && s.is_error === !0 && r.has(s.tool_use_id))
        return extractToolErrorExcerpt(s.content);
    }
  }
  return;
}

export {
  STRUCTURED_OUTPUT_RETRACTED_MESSAGE,
  MAX_STRUCTURED_OUTPUT_RETRIES,
  formatStructuredOutputFailure,
  hasSuccessfulToolCallSince,
  extractToolErrorExcerpt,
};
