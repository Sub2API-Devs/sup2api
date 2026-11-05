/**
 * cli/structuredOutputRetry.ts
 *
 * 结构化输出重试与失败文本（含模型回退撤回）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kwdfqgt2.js (5)
 * attribution: placement 5
 */
import { LINE_BREAK_CHARS_RE } from "../tools/AgentTool/handbackReport.js";
import { stripFormatChars, collapseWhitespace, truncateToLength } from "../utils/stringUtils.js";
import { sanitizeSubagentOutput } from "../utils/subagentOutputScan.js";
import { logError } from "../utils/log.js";
import { STRUCTUREDOUTPUT } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";

//@ chunk-kwdfqgt2.js:376-487 placement
/**
 * 结构化输出重试上限（5）、被模型回退撤回时的失败文本，以及工具错误摘录长度上限（600）。
 */
var MAX_STRUCTURED_OUTPUT_RETRIES = 5;
var STRUCTURED_OUTPUT_RETRACTED_MESSAGE =
  "Structured output was retracted by a model fallback and no retry produced a valid result";
var MAX_TOOL_ERROR_EXCERPT_CHARS = 600;
//@ chunk-kwdfqgt2.js:487-763 placement
/**
 * 结构化输出多次失败（含被模型回退撤回）时的错误文本
 */
function formatStructuredOutputFailure(attempts, lastError, schema) {
  if (lastError > 0)
    return `Failed to provide surviving structured output after ${attempts} attempts (${lastError} retracted by a model fallback)`;
  let message = `Failed to provide valid structured output after ${attempts} attempts`;
  return schema === undefined ? message : `${message} \u2014 last StructuredOutput error: ${schema}`;
}
//@ chunk-kwdfqgt2.js:763-1171 placement
/**
 * 从工具结果（字符串或文本块数组）提取错误摘录：去掉 tool_use_error 标签、逐行清理、两次消毒，超过 600 字符截断加省略号；空则 undefined。
 */
function extractToolErrorExcerpt(content) {
  let text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(`
`)
        : undefined;
  if (text === undefined) return;
  let joined = text
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
`);
  let sanitized = sanitizeSubagentOutput(joined, {
    prependMarker: false,
  }).sanitized;
  let collapsed = collapseWhitespace(sanitized);
  if (collapsed.length === 0) return;
  let sanitizedText =
    collapsed.length > MAX_TOOL_ERROR_EXCERPT_CHARS
      ? truncateToLength(collapsed, MAX_TOOL_ERROR_EXCERPT_CHARS) + "\u2026"
      : collapsed;
  return sanitizeSubagentOutput(sanitizedText, {
    prependMarker: false,
  }).sanitized;
}
//@ chunk-kwdfqgt2.js:1171-1282 placement
/**
 * 从消息列表中某条消息之后（找不到则全量）检查是否有成功的工具调用；异常记日志返回 undefined。
 */
function hasSuccessfulToolCallSince(initialMessages, marker) {
  try {
    let start = marker === undefined ? 0 : initialMessages.lastIndexOf(marker) + 1;
    return lastStructuredOutputErrorExcerpt(start === 0 ? initialMessages : initialMessages.slice(start));
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-kwdfqgt2.js:1282-1761 placement
function lastStructuredOutputErrorExcerpt(messages) {
  let toolUseIds = new Set();
  for (let message of messages) {
    if (message?.type !== "assistant") continue;
    let content = message.message.content;
    if (!Array.isArray(content)) continue;
    for (let block of content)
      if (block.type === "tool_use" && block.name === STRUCTUREDOUTPUT) toolUseIds.add(block.id);
  }
  if (toolUseIds.size === 0) return;
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message?.type !== "user") continue;
    let content = message.message.content;
    if (!Array.isArray(content)) continue;
    for (let j = content.length - 1; j >= 0; j--) {
      let block = content[j];
      if (block?.type === "tool_result" && block.is_error === true && toolUseIds.has(block.tool_use_id))
        return extractToolErrorExcerpt(block.content);
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
