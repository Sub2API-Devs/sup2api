/**
 * services/artifacts/comments/threadAnalyst.ts
 *
 * 2.1.316 新增：评论线程分析器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tgt55am.js (6)
 * attribution: placement 6
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

//@ chunk-9tgt55am.js:40474-40576 placement
function getAssistantJsonText(modelWithoutStreaming) {
  let content = modelWithoutStreaming.message?.content;
  if (!Array.isArray(content)) return "";
  let trimmed = extractTextContent_2(content).trim();
  return stripJsonCodeFence(trimmed);
}
//@ chunk-9tgt55am.js:40576-40622 placement
var ALLOWED_ANALYST_ACTIONS = new Set(["comments", "read_page_data"]);
//@ chunk-9tgt55am.js:40622-41455 placement
/**
 * 构造评论线程分析子代理的 canUseTool：只允许针对同一 artifact、同一线程的只读 Artifact 评论读取类动作（权限检查改写后的输入也要仍在范围内），其他一律拒绝。
 */
function makeAnalystCanUseTool(slug, threadId) {
  let isInScope = (r) => {
    let { action, url } = r;
    return (
      typeof action === "string" &&
      ALLOWED_ANALYST_ACTIONS.has(action) &&
      typeof url === "string" &&
      uuidSlugFromUrl(url) === slug &&
      (action !== "comments" || r.thread_id === threadId)
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
  return async (r, s, d, h, y, C) => {
    let R = (N) =>
      r.mcpInfo !== undefined
        ? null
        : r.name === ARTIFACT_TOOL_NAME
          ? N
          : r.name === ARTIFACT_COMMENTS_TOOL_NAME
            ? toParentArtifactInput("comments", N)
            : null;
    let b = R(s);
    if (b !== null && isInScope(b)) {
      let N = await hasPermissionsToUseTool(r, s, d, h, y, C);
      let updatedInput = N.updatedInput;
      let w =
        updatedInput !== null &&
        typeof updatedInput === "object" &&
        !Array.isArray(updatedInput) &&
        Object.keys(updatedInput).length === 0;
      if (N.behavior === "allow" && updatedInput !== undefined && !w && !isInScope(R(updatedInput)))
        return deny();
      return N;
    }
    return deny();
  };
}
//@ chunk-9tgt55am.js:41455-41487 placement
var MAX_BRIEF_CHARS = 4000;
var BRIEF_PREFIX = "ANALYSIS BRIEF";
//@ chunk-9tgt55am.js:41487-43010 placement
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
  let [{ runAgent: h }, { COMMENT_ANALYST_AGENT: y }] = await Promise.all([
    import("./chunk-0qj0hrch.js"),
    import("./chunk-9ss4055j.js"),
  ]);
  let C = {
    agentId: saltedName,
    parentAgentId: context.agentId,
    depth,
    parentSessionId: getParentSessionId(),
    agentType: "subagent",
    subagentName: y.agentType,
    isBuiltIn: true,
    delegatedObservation: true,
    displayName: "comment-thread-analyst",
    isAsync: false,
    invocationKind: "spawn",
    invocationEmitted: false,
  };
  let content = `Analyze artifact comment thread ${thread.id} on artifact ${url} (triggering comment id ${options.triggerComment.id}). Follow your workflow and output the analysis brief.`;
  try {
    let brief = await runWithCwdOverride(C, () =>
      collectFinalAssistantText(
        h({
          agentDefinition: y,
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
            agentContext: C,
            requireCanUseTool: true,
            userContext: {},
            systemContext: {},
            systemPrompt: asSystemPrompt([
              y.getSystemPrompt({
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
//@ chunk-9tgt55am.js:43010-43261 placement
/**
 * 消费代理消息流，记下最后一条非空助手文本；若最后出现的是 API 错误消息则返回 null。
 */
async function collectFinalAssistantText(e) {
  let t = "";
  let n = false;
  for await (let a of e) {
    let r = a;
    if (r.type !== "assistant" || !Array.isArray(r.message?.content)) continue;
    if (r.isApiErrorMessage === true) {
      n = true;
      continue;
    }
    let trimmed = extractTextContent_2(
      r.message.content,
      `
`,
    ).trim();
    if (trimmed !== "") {
      t = trimmed;
      n = false;
    }
  }
  return n ? null : t;
}
export { getAssistantJsonText, runCommentThreadAnalyst };
