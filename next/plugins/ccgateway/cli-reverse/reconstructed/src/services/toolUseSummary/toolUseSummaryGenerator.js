/**
 * services/toolUseSummary/toolUseSummaryGenerator.ts
 *
 * 工具批次摘要：用小模型为一批工具调用生成约 30 字符的过去时标签（移动端显示），由 CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES 打开。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/toolUseSummary/toolUseSummaryGenerator.ts
 * pieces: chunk-w3ch4xq2.js (3)
 * attribution: affinity 1, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  toolsUsedManifestText,
  collectToolsUsedBeforeSummary,
} from "../../utils/messages/untrustedArtifactContent.js";
import { queryHaikuWithFallback } from "../api/claude.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { toError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-w3ch4xq2.js:37728-38182 affinity
/**
 * 工具批次摘要的系统提示（过去时、约 30 字符）。
 */
var TOOL_USE_SUMMARY_PROMPT = `Write a short summary label describing what these tool calls accomplished. It appears as a single-line row in a mobile app and truncates around 30 characters, so think git-commit-subject, not sentence.

Keep the verb in past tense and the most distinctive noun. Drop articles, connectors, and long location context first.

Examples:
- Searched in auth/
- Fixed NPE in UserService
- Created signup endpoint
- Read config.json
- Ran failing tests`;
//@ chunk-w3ch4xq2.js:38182-39318 fingerprint (2.1.88 match: generateToolUseSummary, 0.789)
/**
 * 用小模型（queryHaikuWithFallback）根据工具名/输入/输出（各截 300 字符）和上一句回答意图生成摘要标签；失败返回 null。
 */
async function generateToolUseSummary({
  tools,
  messages,
  signal,
  isNonInteractiveSession,
  lastAssistantText,
  agentContext,
  credentials,
}) {
  if (tools.length === 0) return null;
  try {
    let toolSummaries = tools.map((tool) => {
      let inputStr = truncateJson(tool.input, 300);
      let outputStr = truncateJson(tool.output, 300);
      return `Tool: ${tool.name}
Input: ${inputStr}
Output: ${outputStr}`;
    }).join(`

`);
    let contextPrefix = lastAssistantText
      ? `User's intent (from assistant's last message): ${lastAssistantText.slice(0, 200)}

`
      : "";
    let manifest = toolsUsedManifestText(collectToolsUsedBeforeSummary(messages, undefined, false));
    let response = await queryHaikuWithFallback({
      systemPrompt: asSystemPrompt([TOOL_USE_SUMMARY_PROMPT]),
      userPrompt: `${manifest}${contextPrefix}Tools completed:

${toolSummaries}

Label:`,
      signal,
      options: {
        querySource: "tool_use_summary_generation",
        toolFreeHelper: true,
        enablePromptCaching: false,
        agents: [],
        isNonInteractiveSession,
        hasAppendSystemPrompt: false,
        mcpTools: [],
        agentContext,
        credentials,
      },
    });
    if (response.isApiErrorMessage) {
      logFeatureSad("summary_tool_use_generate", "api_error");
      return null;
    }
    let summary = response.message.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    let firstLine = getFirstLine(summary).trimEnd();
    if (!firstLine) {
      logFeatureSad("summary_tool_use_generate", "empty_response");
      return null;
    }
    logFeatureOk("summary_tool_use_generate");
    return firstLine;
  } catch (error) {
    if (signal.aborted) return null;
    let err = toError(error);
    err.cause = {
      errorId: "tool_use_summary_generation_failed",
    };
    logError(err);
    logFeatureBad("summary_tool_use_generate", "api_failed");
    return null;
  }
}
//@ chunk-w3ch4xq2.js:39318-39439 fingerprint (2.1.88 match: truncateJson, 1)
/**
 * JSON 序列化并截断到指定长度。
 */
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
