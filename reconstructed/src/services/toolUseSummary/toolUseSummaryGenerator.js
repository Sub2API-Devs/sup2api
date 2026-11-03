/**
 * services/toolUseSummary/toolUseSummaryGenerator.ts
 *
 * 工具批次摘要：用小模型为一批工具调用生成约 30 字符的过去时标签（移动端显示），由 CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES 打开。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/toolUseSummary/toolUseSummaryGenerator.ts
 * pieces: chunk-ha3km179.js (3)
 * attribution: affinity 1, fingerprint 2
 */
import { m3, tagUntrustedArtifactContent } from "../../utils/messages/untrustedArtifactContent.js";
import { queryHaikuWithFallback } from "../api/claude.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { toError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { jsonStringify } from "../../utils/slowOperations.js";

/**
 * 工具批次摘要的系统提示（过去时、约 30 字符）。
 */
//@ chunk-ha3km179.js:36630-37084 affinity
var TOOL_USE_SUMMARY_PROMPT = `Write a short summary label describing what these tool calls accomplished. It appears as a single-line row in a mobile app and truncates around 30 characters, so think git-commit-subject, not sentence.

Keep the verb in past tense and the most distinctive noun. Drop articles, connectors, and long location context first.

Examples:
- Searched in auth/
- Fixed NPE in UserService
- Created signup endpoint
- Read config.json
- Ran failing tests`;
/**
 * 用小模型（queryHaikuWithFallback）根据工具名/输入/输出（各截 300 字符）和上一句回答意图生成摘要标签；失败返回 null。
 */
//@ chunk-ha3km179.js:37084-38220 fingerprint = generateToolUseSummary (0.789)
async function generateToolUseSummary({
  tools: tools,
  messages: messages,
  signal: signal,
  isNonInteractiveSession: isNonInteractiveSession,
  lastAssistantText: lastAssistantText,
  agentContext: agentContext,
  credentials: credentials,
}) {
  if (tools.length === 0) return null;
  try {
    let joined = tools.map((tool) => {
        let inputStr = truncateJson(tool.input, 300),
          outputStr = truncateJson(tool.output, 300);
        return `Tool: ${tool.name}
Input: ${inputStr}
Output: ${outputStr}`;
      }).join(`

`),
      contextPrefix = lastAssistantText
        ? `User's intent (from assistant's last message): ${lastAssistantText.slice(0, 200)}

`
        : "",
      T = m3(tagUntrustedArtifactContent(messages, void 0, !1)),
      response = await queryHaikuWithFallback({
        systemPrompt: asSystemPrompt([TOOL_USE_SUMMARY_PROMPT]),
        userPrompt: `${T}${contextPrefix}Tools completed:

${joined}

Label:`,
        signal: signal,
        options: {
          querySource: "tool_use_summary_generation",
          toolFreeHelper: !0,
          enablePromptCaching: !1,
          agents: [],
          isNonInteractiveSession: isNonInteractiveSession,
          hasAppendSystemPrompt: !1,
          mcpTools: [],
          agentContext: agentContext,
          credentials: credentials,
        },
      });
    if (response.isApiErrorMessage) return (logFeatureSad("summary_tool_use_generate", "api_error"), null);
    let summary = response.message.content
        .filter((block) => block.type === "text")
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim(),
      trimEnd = getFirstLine(summary).trimEnd();
    if (!trimEnd) return (logFeatureSad("summary_tool_use_generate", "empty_response"), null);
    return (logFeatureOk("summary_tool_use_generate"), trimEnd);
  } catch (error) {
    if (signal.aborted) return null;
    let err = toError(error);
    return (
      (err.cause = { errorId: "tool_use_summary_generation_failed" }),
      logError(err),
      logFeatureBad("summary_tool_use_generate", "api_failed"),
      null
    );
  }
}
/**
 * JSON 序列化并截断到指定长度。
 */
//@ chunk-ha3km179.js:38220-38341 fingerprint = truncateJson (1)
function truncateJson(value, maxLength) {
  try {
    let str = jsonStringify(value);
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + "...";
  } catch {
    return "[unable to serialize]";
  }
}

export { generateToolUseSummary };
