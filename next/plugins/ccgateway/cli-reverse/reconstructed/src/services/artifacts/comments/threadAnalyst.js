/**
 * services/artifacts/comments/threadAnalyst.ts
 *
 * 2.1.316 新增：评论线程分析器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c0pq6qyx.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { extractTextContent_2, createUserMessage } from "../../../utils/messages.js";
import { stripJsonCodeFence } from "../../../utils/json.js";
import {
  uuidSlugFromUrl,
  ARTIFACT_TOOL_NAME,
  ARTIFACT_COMMENTS_TOOL_NAME,
} from "../../../tools/ArtifactTool/constants.js";
import { toParentArtifactInput } from "../artifactToolActions.js";
import { hasPermissionsToUseTool } from "../../../utils/permissions/permissions.js";
import { getIsNonInteractiveSession } from "../../../bootstrap/state.js";
import { getAgentDepth } from "../../../utils/agentContext.js";
import { getMaxSubagentSpawnDepth } from "../../../tools/AgentTool/spawnDepth.js";
import { logFeatureSad } from "../../analytics/featureTelemetry.js";
import { makeSaltedName, identityAgentId2 } from "../../../utils/agentId.js";
import { getParentSessionId } from "../../../utils/teammate.js";
import { runWithCwdOverride } from "../../../utils/cwd.js";
import { asSystemPrompt } from "../../../utils/systemPromptType.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-c0pq6qyx.js:36384-36486 placement
function getAssistantJsonText(modelWithoutStreaming) {
  let content = modelWithoutStreaming.message?.content;
  if (!Array.isArray(content)) return "";
  let trimmed = extractTextContent_2(content).trim();
  return stripJsonCodeFence(trimmed);
}
//@ chunk-c0pq6qyx.js:36486-36532 placement
var ALLOWED_ANALYST_ACTIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c0pq6qyx.js:36486", () => {
  ALLOWED_ANALYST_ACTIONS = new Set(["comments", "read_page_data"]);
});
//@ chunk-c0pq6qyx.js:36532-37365 placement
/**
 * 构造评论线程分析子代理的 canUseTool：只允许针对同一 artifact、同一线程的只读 Artifact 评论读取类动作（权限检查改写后的输入也要仍在范围内），其他一律拒绝。
 */
function makeAnalystCanUseTool(slug, threadId) {
  let isInScope = (input) => {
    let { action, url } = input;
    return (
      typeof action === "string" &&
      ALLOWED_ANALYST_ACTIONS.has(action) &&
      typeof url === "string" &&
      uuidSlugFromUrl(url) === slug &&
      (action !== "comments" || input.thread_id === threadId)
    );
  };
  let deny = () => ({
    behavior: "deny",
    message:
      "The comment-thread analyst is read-only and scoped to its one artifact and thread: only the Artifact comments read with thread_id set to the dispatched thread, and the page-data read on the dispatched artifact, are permitted.",
    decisionReason: {
      type: "other",
      reason: "comment analyst read-only scope",
    },
  });
  return async (tool, input, toolUseContext, canUseToolPermissionContext, assistantMessage, toolUseId) => {
    let toArtifactInput = (rawInput) =>
      tool.mcpInfo !== undefined
        ? null
        : tool.name === ARTIFACT_TOOL_NAME
          ? rawInput
          : tool.name === ARTIFACT_COMMENTS_TOOL_NAME
            ? toParentArtifactInput("comments", rawInput)
            : null;
    let artifactInput = toArtifactInput(input);
    if (artifactInput !== null && isInScope(artifactInput)) {
      let permission = await hasPermissionsToUseTool(
        tool,
        input,
        toolUseContext,
        canUseToolPermissionContext,
        assistantMessage,
        toolUseId,
      );
      let updatedInput = permission.updatedInput;
      let emptyInput =
        updatedInput !== null &&
        typeof updatedInput === "object" &&
        !Array.isArray(updatedInput) &&
        Object.keys(updatedInput).length === 0;
      if (
        permission.behavior === "allow" &&
        updatedInput !== undefined &&
        !emptyInput &&
        !isInScope(toArtifactInput(updatedInput))
      )
        return deny();
      return permission;
    }
    return deny();
  };
}
//@ chunk-c0pq6qyx.js:37365-37397 placement
var MAX_BRIEF_CHARS = 4000;
var BRIEF_PREFIX = "ANALYSIS BRIEF";
//@ chunk-c0pq6qyx.js:37397-38919 placement
/**
 * 交互会话里同步运行内置"评论线程分析"子代理（受代理深度限制），以只读权限分析某个线程并返回分析简报；运行出错、空结果或不以预期前缀开头时返回 null。
 */
async function runCommentThreadAnalyst(options) {
  let { context, url, slug, thread } = options;
  if (getIsNonInteractiveSession()) return null;
  if (getAgentDepth(context.agentContext) >= getMaxSubagentSpawnDepth()) {
    logFeatureSad("artifact_comments_autoreact", "analyst_depth_refused");
    return null;
  }
  let saltedName = makeSaltedName("comment-thread-analyst");
  let depth = getAgentDepth(context.agentContext) + 1;
  let [{ runAgent }, { COMMENT_ANALYST_AGENT }] = await Promise.all([
    import("../../../tools/AgentTool/runAgent.js"),
    import("../../../tools/ArtifactTool/COMMENT_ANALYST_AGENT.lazy.js"),
  ]);
  let listOptions = {
    agentId: saltedName,
    parentAgentId: context.agentId,
    depth,
    parentSessionId: getParentSessionId(),
    agentType: "subagent",
    subagentName: COMMENT_ANALYST_AGENT.agentType,
    isBuiltIn: true,
    delegatedObservation: true,
    displayName: "comment-thread-analyst",
    isAsync: false,
    invocationKind: "spawn",
    invocationEmitted: false,
  };
  let content = `Analyze artifact comment thread ${thread.id} on artifact ${url} (triggering comment id ${options.triggerComment.id}). Follow your workflow and output the analysis brief.`;
  try {
    let brief = await runWithCwdOverride(listOptions, () =>
      collectFinalAssistantText(
        runAgent({
          agentDefinition: COMMENT_ANALYST_AGENT,
          promptMessages: [
            createUserMessage({
              content,
            }),
          ],
          toolUseContext: context,
          canUseTool: makeAnalystCanUseTool(slug, thread.id),
          isAsync: false,
          querySource: "artifact_comment_analyst",
          availableTools: context.options.tools,
          override: {
            agentId: identityAgentId2(saltedName),
            agentContext: listOptions,
            requireCanUseTool: true,
            userContext: {},
            systemContext: {},
            systemPrompt: asSystemPrompt([
              COMMENT_ANALYST_AGENT.getSystemPrompt({
                toolUseContext: context,
              }),
            ]),
            isolatedContext: true,
          },
          description: `artifact comment thread ${thread.id}`,
        }),
      ),
    );
    if (brief === null) {
      logFeatureSad("artifact_comments_autoreact", "analyst_run_error");
      return null;
    }
    if (brief === "") {
      logFeatureSad("artifact_comments_autoreact", "analyst_empty_brief");
      return null;
    }
    if (!brief.startsWith(BRIEF_PREFIX)) {
      logFeatureSad("artifact_comments_autoreact", "analyst_truncated");
      return null;
    }
    return brief.length > MAX_BRIEF_CHARS ? truncateToLength(brief, MAX_BRIEF_CHARS) : brief;
  } catch {
    logFeatureSad("artifact_comments_autoreact", "analyst_run_error");
    return null;
  }
}
//@ chunk-c0pq6qyx.js:38919-39170 placement
/**
 * 消费代理消息流，记下最后一条非空助手文本；若最后出现的是 API 错误消息则返回 null。
 */
async function collectFinalAssistantText(events) {
  let text = "";
  let isError = false;
  for await (let event of events) {
    let message = event;
    if (message.type !== "assistant" || !Array.isArray(message.message?.content)) continue;
    if (message.isApiErrorMessage === true) {
      isError = true;
      continue;
    }
    let trimmed = extractTextContent_2(
      message.message.content,
      `
`,
    ).trim();
    if (trimmed !== "") {
      text = trimmed;
      isError = false;
    }
  }
  return isError ? null : text;
}
export { getAssistantJsonText, runCommentThreadAnalyst };
