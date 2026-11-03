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
import { $U } from "../../../utils/json.js";
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
import { makeSaltedName, Mr } from "../../../utils/agentId.js";
import { getParentSessionId } from "../../../utils/teammate.js";
import { runWithCwdOverride } from "../../../utils/cwd.js";
import { asSystemPrompt } from "../../../utils/systemPromptType.js";
import { truncateToLength } from "../../../utils/stringUtils.js";

//@ chunk-9tgt55am.js:40474-40576 placement
function getAssistantJsonText(e) {
  let t = e.message?.content;
  if (!Array.isArray(t)) return "";
  let trimmed = extractTextContent_2(t).trim();
  return $U(trimmed);
}
//@ chunk-9tgt55am.js:40576-40622 placement
var ms = new Set(["comments", "read_page_data"]);
/**
 * 构造评论线程分析子代理的 canUseTool：只允许针对同一 artifact、同一线程的只读 Artifact 评论读取类动作（权限检查改写后的输入也要仍在范围内），其他一律拒绝。
 */
//@ chunk-9tgt55am.js:40622-41455 placement
function makeAnalystCanUseTool(slug, threadId) {
  let isInScope = (r) => {
      let { action: action, url: url } = r;
      return (
        typeof action === "string" &&
        ms.has(action) &&
        typeof url === "string" &&
        uuidSlugFromUrl(url) === slug &&
        (action !== "comments" || r.thread_id === threadId)
      );
    },
    deny = () => ({
      behavior: "deny",
      message:
        "The comment-thread analyst is read-only and scoped to its one artifact and thread: only the Artifact comments read with thread_id set to the dispatched thread, and the page-data read on the dispatched artifact, are permitted.",
      decisionReason: { type: "other", reason: "comment analyst read-only scope" },
    });
  return async (r, s, d, h, y, C) => {
    let R = (N) =>
        r.mcpInfo !== void 0
          ? null
          : r.name === ARTIFACT_TOOL_NAME
            ? N
            : r.name === ARTIFACT_COMMENTS_TOOL_NAME
              ? toParentArtifactInput("comments", N)
              : null,
      b = R(s);
    if (b !== null && isInScope(b)) {
      let N = await hasPermissionsToUseTool(r, s, d, h, y, C),
        updatedInput = N.updatedInput,
        w =
          updatedInput !== null &&
          typeof updatedInput === "object" &&
          !Array.isArray(updatedInput) &&
          Object.keys(updatedInput).length === 0;
      if (N.behavior === "allow" && updatedInput !== void 0 && !w && !isInScope(R(updatedInput)))
        return deny();
      return N;
    }
    return deny();
  };
}
//@ chunk-9tgt55am.js:41455-41487 placement
var Wr = 4000,
  hs = "ANALYSIS BRIEF";
/**
 * 交互会话里同步运行内置"评论线程分析"子代理（受代理深度限制），以只读权限分析某个线程并返回分析简报；运行出错、空结果或不以预期前缀开头时返回 null。
 */
//@ chunk-9tgt55am.js:41487-43010 placement
async function runCommentThreadAnalyst(options) {
  let { context: context, url: url, slug: slug, thread: thread } = options;
  if (getIsNonInteractiveSession()) return null;
  if (getAgentDepth(context.agentContext) >= getMaxSubagentSpawnDepth())
    return (logFeatureSad("artifact_comments_autoreact", "analyst_depth_refused"), null);
  let s = makeSaltedName("comment-thread-analyst"),
    d = getAgentDepth(context.agentContext) + 1,
    [{ runAgent: h }, { COMMENT_ANALYST_AGENT: y }] = await Promise.all([
      import("./chunk-0qj0hrch.js"),
      import("./chunk-9ss4055j.js"),
    ]),
    C = {
      agentId: s,
      parentAgentId: context.agentId,
      depth: d,
      parentSessionId: getParentSessionId(),
      agentType: "subagent",
      subagentName: y.agentType,
      isBuiltIn: !0,
      delegatedObservation: !0,
      displayName: "comment-thread-analyst",
      isAsync: !1,
      invocationKind: "spawn",
      invocationEmitted: !1,
    },
    R = `Analyze artifact comment thread ${thread.id} on artifact ${url} (triggering comment id ${options.triggerComment.id}). Follow your workflow and output the analysis brief.`;
  try {
    let brief = await runWithCwdOverride(C, () =>
      collectFinalAssistantText(
        h({
          agentDefinition: y,
          promptMessages: [createUserMessage({ content: R })],
          toolUseContext: context,
          canUseTool: makeAnalystCanUseTool(slug, thread.id),
          isAsync: !1,
          querySource: "artifact_comment_analyst",
          availableTools: context.options.tools,
          override: {
            agentId: Mr(s),
            agentContext: C,
            requireCanUseTool: !0,
            userContext: {},
            systemContext: {},
            systemPrompt: asSystemPrompt([y.getSystemPrompt({ toolUseContext: context })]),
            isolatedContext: !0,
          },
          description: `artifact comment thread ${thread.id}`,
        }),
      ),
    );
    if (brief === null) return (logFeatureSad("artifact_comments_autoreact", "analyst_run_error"), null);
    if (brief === "") return (logFeatureSad("artifact_comments_autoreact", "analyst_empty_brief"), null);
    if (!brief.startsWith(hs))
      return (logFeatureSad("artifact_comments_autoreact", "analyst_truncated"), null);
    return brief.length > Wr ? truncateToLength(brief, Wr) : brief;
  } catch {
    return (logFeatureSad("artifact_comments_autoreact", "analyst_run_error"), null);
  }
}
/**
 * 消费代理消息流，记下最后一条非空助手文本；若最后出现的是 API 错误消息则返回 null。
 */
//@ chunk-9tgt55am.js:43010-43261 placement
async function collectFinalAssistantText(e) {
  let t = "",
    n = !1;
  for await (let a of e) {
    let r = a;
    if (r.type !== "assistant" || !Array.isArray(r.message?.content)) continue;
    if (r.isApiErrorMessage === !0) {
      n = !0;
      continue;
    }
    let trimmed = extractTextContent_2(
      r.message.content,
      `
`,
    ).trim();
    if (trimmed !== "") ((t = trimmed), (n = !1));
  }
  return n ? null : t;
}

export { getAssistantJsonText, runCommentThreadAnalyst };
