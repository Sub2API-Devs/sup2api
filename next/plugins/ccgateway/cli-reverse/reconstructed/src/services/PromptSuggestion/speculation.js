/**
 * services/PromptSuggestion/speculation.ts
 *
 * 提示建议的后处理与若干错归声明：去掉建议外层标签、取首个候选；另有 speculation 目录清理、安全只读工具表、重复空 Poll 调用检测等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/PromptSuggestion/speculation.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-n51jggtb.js (1), chunk-rypxzpmd.js (2)
 * attribution: callgraph-fingerprint 1, fingerprint 2, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { CANCEL_MESSAGE } from "../../utils/messages.js";
import { generateSuggestion, SUGGESTION_PROMPT } from "./promptSuggestion.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:5035750-5035830 callgraph-fingerprint (2.1.88 match: prepareMessagesForInjection, 0.254)
/**
 * is_error 的 tool_result，内容为“用户现在不想执行”的取消文案。旧版名 getToolResultIDs 为错配。
 */
function createCancelledToolResultBlock(messages) {
  return {
    type: "tool_result",
    content: CANCEL_MESSAGE,
    is_error: true,
    tool_use_id: messages,
  };
}
//@ chunk-rypxzpmd.js:7215-7745 affinity
/**
 * 去掉建议外层的 suggestion/response 等标签与 "Suggestion:" 类前缀。
 */
function stripSuggestionWrapper(candidate) {
  return candidate
    .trim()
    .replace(
      /^<(suggestion|response|output|answer|result)>([\s\S]*)<\/\1>$/i,
      (wholeMatch, tagName, inner) =>
        inner.includes(`</${tagName.toLowerCase()}>`) || inner.includes(`</${tagName.toUpperCase()}>`)
          ? wholeMatch
          : inner,
    )
    .replace(
      /^\s*(suggested\s+(response|reply|input|prompt)|suggestion|response|reply|answer|output|result|\u63D0\u6848|\u56DE\u7B54|\u8FD4\u4FE1|\u5FDC\u7B54|\u51FA\u529B|\u7D50\u679C|\u5EFA\u8BAE|\u56DE\u590D|\u7B54\u6848|\u8F93\u51FA|\u7ED3\u679C|\uC81C\uC548|\uB2F5\uBCC0|\uC751\uB2F5|\uCD9C\uB825|\uACB0\uACFC)\s*[:\uFF1A]\s*/i,
      "",
    )
    .trim();
}
//@ chunk-rypxzpmd.js:7745-8009 fingerprint (2.1.88 match: generatePipelinedSuggestion, 0.352)
/**
 * 生成建议并取第一个非空候选。
 */
async function generatePipelinedSuggestion(promptId, cacheSafeParams) {
  let { candidates, generationRequestId } = await generateSuggestion(
    SUGGESTION_PROMPT,
    promptId,
    cacheSafeParams,
  );
  for (let candidate of candidates) {
    let suppressReason = stripSuggestionWrapper(candidate);
    if (suppressReason) {
      logFeatureOk("prompt_suggestion_generate");
      return {
        suggestion: suppressReason,
        generationRequestId,
      };
    }
  }
  logFeatureOk("prompt_suggestion_generate");
  return {
    suggestion: null,
    generationRequestId,
  };
}
//@ chunk-n51jggtb.js:70866-71005 fingerprint (2.1.88 match: SAFE_READ_ONLY_TOOLS, 0.522)
var SAFE_READ_ONLY_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n51jggtb.js:70866", () => {
  SAFE_READ_ONLY_TOOLS = new Set([
    "Read",
    "Write",
    "Edit",
    "Glob",
    "Grep",
    "NotebookEdit",
    "TodoWrite",
    "TaskCreate",
    "TaskGet",
    "TaskList",
    "TaskStop",
    "TaskUpdate",
  ]);
});
export { createCancelledToolResultBlock, SAFE_READ_ONLY_TOOLS, generatePipelinedSuggestion };
