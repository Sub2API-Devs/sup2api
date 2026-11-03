/**
 * tools/AgentTool/agentToolDefinition.ts
 *
 * 2.1.316 新增：AgentTool 的 create 工厂定义（prompt、权限检查、并发上限、fork 限制、结果映射）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0tkmvwy0.js (9)
 * attribution: placement 9
 */
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { getPrompt } from "./prompt.js";
import { hasSendMessageTool, SENDMESSAGE } from "../SendMessageTool/constants.js";
import { getSubagentBudgetNote, restoreCanContinueAgent } from "./agentContainerResume.js";
import { x1r } from "../../utils/api.js";
import { AGENT, TASK, GCt, x5t, FORK } from "./constants.js";
import {
  getFeatureValue_SESSION_PINNED,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { getAgentInputSchema, AgentPreconditionError } from "./agentInputSchema.js";
import { dropRelativeEffortInput } from "./agentEffort.js";
import { agentOutputSchema, callAgentTool, tryAutoApproveWebFetchDispatch } from "./AgentTool.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { userFacingName } from "./UI.js";
import { FILE_READ_TOOL_NAME } from "../FileReadTool/constants.js";
import { warnConcurrentWriteAgents } from "./agentLaunch.js";
import { isHandbackProvenanceEnabled, buildHandbackResultContent } from "./handbackReport.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isForkSubagentEnabled, FORK_AGENT, isInForkChild } from "./forkSubagent.js";
import { normalizeAgentName } from "../WebFetchTool/harnessNotes.js";
import { findDenyRuleWithContent } from "../../utils/permissions/permissions.js";
import { QGt } from "../../plugins/functionHooks/toolCallHooks.js";
import { isUltracodeActive } from "../../utils/effort.js";
import { R7e } from "../../tasks/taskState.js";
import { GENERAL_PURPOSE_AGENT } from "./built-in/generalPurposeAgent.js";
import { getExploreAgentModel } from "../../utils/model/agent.js";
import { M } from "../../../vendor/zod/v4/classic/schemas.js";

/**
 * Agent 工具定义（name "Agent"，别名 "Task"）：call 经 runEngine 调用 callAgentTool；checkPermissions 在 auto/plan(auto) 模式下除免审 web-fetch 派发外一律 passthrough 交分类器，其他模式直接 allow。isReadOnly/isConcurrencySafe 恒 true，maxResultSizeChars 100000，backgrounding "self"。mapToolResultToToolResultBlockParam 按 status（completed/async_launched/remote_launched/teammate_spawned）拼回传文本，completed 附 agentId 与 <usage>。
 */
//@ chunk-0tkmvwy0.js:48361-53565 placement
var AgentTool = buildTool({
  async prompt({
    agents: n,
    tools: e,
    getToolPermissionContext: s,
    allowedAgentTypes: f,
    model: y,
    leanPrompt: _,
    leanRewrite: S,
    querySource: I,
  }) {
    let Y = await s(),
      C = isCoordinatorMode_2(),
      { available: available } = getForkAvailability(n, f, Y),
      be = isGeneralPurposeAgentAvailable(n, f);
    return await getPrompt({
      model: y,
      isCoordinator: C,
      forkAvailable: available,
      generalPurposeAvailable: be,
      continueAvailable: hasSendMessageTool(e),
      leanPrompt: _,
      leanRewrite: S,
      subagentBudgetNote: getSubagentBudgetNote(I),
      modelMix: x1r(I),
    });
  },
  name: AGENT,
  searchHint: "delegate work to a subagent",
  aliases: [TASK],
  backgrounding: "self",
  maxResultSizeChars: GCt,
  get preserveToolUseResultInSubagents() {
    return getFeatureValue_SESSION_PINNED("tengu_velvety_sprout", !1) === !0;
  },
  async description() {
    return "Launch a new agent";
  },
  get inputSchema() {
    return getAgentInputSchema();
  },
  coerceInput: dropRelativeEffortInput,
  get outputSchema() {
    return agentOutputSchema();
  },
  create(n) {
    return {
      call(e, s) {
        if (!s.runEngine)
          return Promise.reject(Error("Agent: launching needs the executor (call.runEngine)"));
        return s.runEngine(callAgentTool, {
          agentInput: e,
          assistantMessage: s.parentMessage,
          onProgress: s.onProgress,
          timing: s.timing,
          ...!1,
        });
      },
      async checkPermissions(e, s) {
        if (!isAutoClassifierActive(n.permissions().mode)) return { behavior: "allow", updatedInput: e };
        if (await s.runEngine(tryAutoApproveWebFetchDispatch, { input: e }))
          return { behavior: "allow", updatedInput: e };
        return { behavior: "passthrough", message: "Agent tool requires permission to spawn subagents." };
      },
    };
  },
  isReadOnly() {
    return !0;
  },
  toAutoClassifierInput(n) {
    let e = n,
      filtered = [e.subagent_type].filter((y) => y !== void 0);
    return `${filtered.length > 0 ? `(${filtered.join(", ")}): ` : ": "}${e.prompt}`;
  },
  isConcurrencySafe() {
    return !0;
  },
  userFacingName: userFacingName,
  getActivityDescription(n) {
    return n?.description?.replace(/\s+/g, " ").trim() || "Running task";
  },
  restoreTransientForRemap: restoreCanContinueAgent,
  mapToolResultToToolResultBlockParam(n, e) {
    let s = n;
    if (typeof s === "object" && s !== null && "status" in s && s.status === "teammate_spawned") {
      let f = s;
      return {
        tool_use_id: e,
        type: "tool_result",
        content: [
          {
            type: "text",
            text: `Spawned successfully. (This tool result is internal metadata \u2014 never quote or paste any part of it, including the ID below, into a user-facing reply.)
agent_id: ${f.agent_id}
name: ${f.name}
The agent is now running and will receive instructions via mailbox.`,
          },
        ],
      };
    }
    if (n.status === "remote_launched") {
      let f = n;
      return {
        tool_use_id: e,
        type: "tool_result",
        content: [
          {
            type: "text",
            text: `Cloud agent launched. (This tool result is internal metadata \u2014 never quote or paste any part of it, including the ID below, into a user-facing reply.)
taskId: ${f.taskId}
session_url: ${f.sessionUrl}
output_file: ${f.outputFile} (final results land here only after the completion notification; until then it holds a partial, still-growing event log)
The agent is running in the cloud. You will be notified automatically when it completes. Do not report or predict its results before that notification arrives.
In your own words, briefly tell the user what you launched \u2014 do not echo this tool result \u2014 and end your response.`,
          },
        ],
      };
    }
    if (n.status === "async_launched") {
      let f = `Async agent launched successfully. (This tool result is internal metadata \u2014 never quote or paste any part of it, including the agentId below, into a user-facing reply.)
agentId: ${n.agentId} (internal ID - do not mention to user.${n.canContinueAgent === !1 ? "" : ` Use ${SENDMESSAGE} with to: '${n.agentId}', summary: '<5-10 word recap>' to continue this agent.`})
The agent is working in the background. You will be notified automatically when it completes. You know nothing about its results until that notification arrives \u2014 do not report, assume, or predict them; continue other work or respond to the user in the meantime.`,
        y =
          n.canReadOutputFile && n.outputFile
            ? `Do not duplicate this agent's work \u2014 avoid working with the same files or topics it is using.
output_file: ${n.outputFile}
Do NOT ${FILE_READ_TOOL_NAME} or tail this file via the shell tool \u2014 it is the full subagent JSONL transcript and reading it will overflow your context. If the user asks for progress, say the agent is still running; you'll get a completion notification.`
            : "In your own words, briefly tell the user what you launched \u2014 do not echo this tool result. Agent results will arrive in a subsequent message. If the user asks for progress, say the agent is still running.",
        _ = `${f}
${y}${
          n.sharesCwd
            ? `
${warnConcurrentWriteAgents}`
            : ""
        }`;
      return { tool_use_id: e, type: "tool_result", content: [{ type: "text", text: _ }] };
    }
    if (n.status === "completed") {
      let f = n.worktreePath
          ? `
worktreePath: ${n.worktreePath}${
              n.worktreeBranch
                ? `
worktreeBranch: ${n.worktreeBranch}`
                : ""
            }`
          : "",
        y =
          n.content.length > 0
            ? n.content
            : [{ type: "text", text: "(Subagent completed but returned no output.)" }],
        _ = isHandbackProvenanceEnabled()
          ? buildHandbackResultContent(
              y,
              n.content.length > 0 ? n.harnessNoteCount : 0,
              n.content.length > 0 ? n.harnessTailCount : 0,
              n.harnessSectionHash,
            )
          : y;
      if (n.agentType && x5t.has(n.agentType) && !f)
        return { tool_use_id: e, type: "tool_result", content: _ };
      let S =
          n.canContinueAgent === !1
            ? ""
            : ` (use ${SENDMESSAGE} with to: '${n.agentId}', summary: '<5-10 word recap>' to continue this agent)`,
        I = `agentId: ${n.agentId}${S}${f}
<usage>subagent_tokens: ${n.totalTokens}
tool_uses: ${n.totalToolUseCount}
duration_ms: ${n.totalDurationMs}</usage>`;
      if (_ !== y && _.length === 1)
        return {
          tool_use_id: e,
          type: "tool_result",
          content: [
            {
              type: "text",
              text:
                _[0].text +
                `
` +
                I,
            },
          ],
        };
      return { tool_use_id: e, type: "tool_result", content: [..._, { type: "text", text: I }] };
    }
    throw (
      logFeatureBad("subagent_launch", "subagent_unexpected_result_status"),
      Error(`Unexpected agent tool result status: ${n.status}`)
    );
  },
});
/**
 * 计算 fork 子代理可用性：fork 开关开启、没有同名自定义代理、allowedAgentTypes 允许，且没有 Agent(fork) deny 规则；返回 {available, denyRule}。
 */
//@ chunk-0tkmvwy0.js:53565-53745 placement
function getForkAvailability(activeAgents, allowedAgentTypes, permissionContext) {
  if (
    !isForkSubagentEnabled() ||
    activeAgents.some((y) => normalizeAgentName(y.agentType) === FORK) ||
    !(allowedAgentTypes?.includes(FORK) ?? !0)
  )
    return { available: !1, denyRule: null };
  let f = findDenyRuleWithContent(permissionContext, AGENT, FORK);
  return { available: f === null, denyRule: f };
}
/**
 * 并发子代理上限检查：超过 CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS（默认 20）时返回 AgentPreconditionError（tengu_amber_kestrel 或 ultracode 豁免）。
 */
//@ chunk-0tkmvwy0.js:53745-54248 placement
function checkSubagentConcurrencyLimit(toolUseContext) {
  let e = QGt();
  if (toolUseContext.taskRegistry.getConcurrentSubagents() < e) return;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_kestrel", !1)) return;
  let appState = toolUseContext.getAppState();
  if (isUltracodeActive(appState.ultracode, toolUseContext.rootToolSurface.mainLoopModel)) return;
  return (
    logFeatureBad("subagent_launch", "subagent_concurrency_cap"),
    R7e.of(toolUseContext.session).recordRefused("concurrency_limit"),
    new AgentPreconditionError(
      `Concurrent subagent limit reached. You can run ${e} subagents at once. Do not retry. If the user wants more concurrent subagents, ask them to increase CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS.`,
    )
  );
}
/**
 * general-purpose 代理是否可用（决定 subagent_type 能否省略）。
 */
//@ chunk-0tkmvwy0.js:54248-54451 placement
function isGeneralPurposeAgentAvailable(activeAgents, allowedAgentTypes) {
  let s = normalizeAgentName(GENERAL_PURPOSE_AGENT.agentType),
    filtered = activeAgents.filter((S) => normalizeAgentName(S.agentType) === s),
    y = (S) => allowedAgentTypes?.includes(S.agentType) ?? !0,
    found = filtered.find((S) => S.agentType === GENERAL_PURPOSE_AGENT.agentType);
  if (found) return y(found);
  return filtered.length === 1 && y(filtered[0]);
}
/**
 * fork 的附加限制：不能与 isolation:"remote" 同用，不能在 fork 子代理内再 fork；返回 {code,message} 或 null。
 */
//@ chunk-0tkmvwy0.js:54451-54957 placement
function getForkPreconditionError({ isolation: isolation, querySource: querySource, messages: messages }) {
  if (isolation === "remote")
    return {
      code: "subagent_fork_remote_isolation",
      message:
        'Fork cannot use isolation: "remote" \u2014 a remote session cannot inherit the conversation context. Omit isolation (or use "worktree"), or spawn a named agent type for remote work.',
    };
  if (querySource === `agent:builtin:${FORK_AGENT.agentType}` || isInForkChild(messages))
    return {
      code: "subagent_recursive_fork",
      message: "Fork is not available inside a forked worker. Complete your task directly using your tools.",
    };
  return null;
}
/**
 * 把名字列表 join(", ")，空时返回 "none"。
 */
//@ chunk-0tkmvwy0.js:54957-55000 placement
function formatAgentList(names) {
  return names.join(", ") || "none";
}
//@ chunk-0tkmvwy0.js:55000-55087 placement
function getAgentModelInheritCap(agentDefinition, parentModel) {
  if (!agentDefinition) return;
  let s = getExploreAgentModel(agentDefinition, parentModel);
  return typeof s === "object" ? s.inheritCap : s;
}
/**
 * 在可提供代理中查找 subagent_type：先精确匹配，再按规范化名（大小写/空白/连字符不敏感）唯一匹配。
 */
//@ chunk-0tkmvwy0.js:55087-55312 placement
function findAgentByNormalizedType(activeAgents, offeredAgents, agentType) {
  let found = offeredAgents.find((I) => I.agentType === agentType);
  if (found) return found;
  let y = normalizeAgentName(agentType);
  if (!y) return;
  let filtered = activeAgents.filter((I) => normalizeAgentName(I.agentType) === y);
  if (filtered.length !== 1) return;
  let S = filtered[0];
  return offeredAgents.some((I) => I.agentType === S.agentType) ? S : void 0;
}
/**
 * @internal canContinueAgent 输出字段 schema。
 */
//@ chunk-0tkmvwy0.js:55312-55502 placement
function canContinueAgentSchema() {
  return M()
    .optional()
    .describe(
      "@internal False when the calling agent cannot continue this agent with a follow-up message (it holds no messaging tool); absent means it can.",
    );
}

export {
  canContinueAgentSchema,
  getForkAvailability,
  formatAgentList,
  checkSubagentConcurrencyLimit,
  findAgentByNormalizedType,
  AgentTool,
  getAgentModelInheritCap,
  getForkPreconditionError,
  isGeneralPurposeAgentAvailable,
};
