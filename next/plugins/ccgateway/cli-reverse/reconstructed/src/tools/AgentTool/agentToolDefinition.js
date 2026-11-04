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
import { querySourceHints } from "../../utils/api.js";
import { AGENT, TASK, MAX_AGENT_OUTPUT_TOKENS, FAST_BUILTIN_AGENTS, FORK } from "./constants.js";
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
import { maxConcurrentSubagents } from "../../plugins/functionHooks/toolCallHooks.js";
import { isUltracodeActive } from "../../utils/effort.js";
import { spawnStatsSlots } from "../../tasks/taskState.js";
import { GENERAL_PURPOSE_AGENT } from "./built-in/generalPurposeAgent.js";
import { getExploreAgentModel } from "../../utils/model/agent.js";
import { booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0tkmvwy0.js:48361-53565 placement
/**
 * Agent 工具定义（name "Agent"，别名 "Task"）：call 经 runEngine 调用 callAgentTool；checkPermissions 在 auto/plan(auto) 模式下除免审 web-fetch 派发外一律 passthrough 交分类器，其他模式直接 allow。isReadOnly/isConcurrencySafe 恒 true，maxResultSizeChars 100000，backgrounding "self"。mapToolResultToToolResultBlockParam 按 status（completed/async_launched/remote_launched/teammate_spawned）拼回传文本，completed 附 agentId 与 <usage>。
 */
var AgentTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0tkmvwy0.js:48361", () => {
  AgentTool = buildTool({
    async prompt({
      agents,
      tools,
      getToolPermissionContext,
      allowedAgentTypes,
      model,
      leanPrompt,
      leanRewrite,
      querySource,
    }) {
      let permissionContext = await getToolPermissionContext();
      let isCoordinator = isCoordinatorMode_2();
      let { available } = getForkAvailability(agents, allowedAgentTypes, permissionContext);
      let generalPurposeAvailable = isGeneralPurposeAgentAvailable(agents, allowedAgentTypes);
      return await getPrompt({
        model,
        isCoordinator,
        forkAvailable: available,
        generalPurposeAvailable,
        continueAvailable: hasSendMessageTool(tools),
        leanPrompt,
        leanRewrite,
        subagentBudgetNote: getSubagentBudgetNote(querySource),
        modelMix: querySourceHints(querySource),
      });
    },
    name: AGENT,
    searchHint: "delegate work to a subagent",
    aliases: [TASK],
    backgrounding: "self",
    maxResultSizeChars: MAX_AGENT_OUTPUT_TOKENS,
    get preserveToolUseResultInSubagents() {
      return getFeatureValue_SESSION_PINNED("tengu_velvety_sprout", false) === true;
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
    create(createdTool) {
      return {
        call(agentInput, callContext) {
          if (!callContext.runEngine)
            return Promise.reject(Error("Agent: launching needs the executor (call.runEngine)"));
          return callContext.runEngine(callAgentTool, {
            agentInput,
            assistantMessage: callContext.parentMessage,
            onProgress: callContext.onProgress,
            timing: callContext.timing,
            ...false,
          });
        },
        async checkPermissions(input, callContext) {
          if (!isAutoClassifierActive(createdTool.permissions().mode))
            return {
              behavior: "allow",
              updatedInput: input,
            };
          if (
            await callContext.runEngine(tryAutoApproveWebFetchDispatch, {
              input,
            })
          )
            return {
              behavior: "allow",
              updatedInput: input,
            };
          return {
            behavior: "passthrough",
            message: "Agent tool requires permission to spawn subagents.",
          };
        },
      };
    },
    isReadOnly() {
      return true;
    },
    toAutoClassifierInput(input) {
      let record = input;
      let filtered = [record.subagent_type].filter((value) => value !== undefined);
      return `${filtered.length > 0 ? `(${filtered.join(", ")}): ` : ": "}${record.prompt}`;
    },
    isConcurrencySafe() {
      return true;
    },
    userFacingName,
    getActivityDescription(input) {
      return input?.description?.replace(/\s+/g, " ").trim() || "Running task";
    },
    restoreTransientForRemap: restoreCanContinueAgent,
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      let record = result;
      if (
        typeof record === "object" &&
        record !== null &&
        "status" in record &&
        record.status === "teammate_spawned"
      ) {
        let teammateResult = record;
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: [
            {
              type: "text",
              text: `Spawned successfully. (This tool result is internal metadata \u2014 never quote or paste any part of it, including the ID below, into a user-facing reply.)
agent_id: ${teammateResult.agent_id}
name: ${teammateResult.name}
The agent is now running and will receive instructions via mailbox.`,
            },
          ],
        };
      }
      if (result.status === "remote_launched") {
        let remoteResult = result;
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: [
            {
              type: "text",
              text: `Cloud agent launched. (This tool result is internal metadata \u2014 never quote or paste any part of it, including the ID below, into a user-facing reply.)
taskId: ${remoteResult.taskId}
session_url: ${remoteResult.sessionUrl}
output_file: ${remoteResult.outputFile} (final results land here only after the completion notification; until then it holds a partial, still-growing event log)
The agent is running in the cloud. You will be notified automatically when it completes. Do not report or predict its results before that notification arrives.
In your own words, briefly tell the user what you launched \u2014 do not echo this tool result \u2014 and end your response.`,
            },
          ],
        };
      }
      if (result.status === "async_launched") {
        let head = `Async agent launched successfully. (This tool result is internal metadata \u2014 never quote or paste any part of it, including the agentId below, into a user-facing reply.)
agentId: ${result.agentId} (internal ID - do not mention to user.${result.canContinueAgent === false ? "" : ` Use ${SENDMESSAGE} with to: '${result.agentId}', summary: '<5-10 word recap>' to continue this agent.`})
The agent is working in the background. You will be notified automatically when it completes. You know nothing about its results until that notification arrives \u2014 do not report, assume, or predict them; continue other work or respond to the user in the meantime.`;
        let outputFileNote =
          result.canReadOutputFile && result.outputFile
            ? `Do not duplicate this agent's work \u2014 avoid working with the same files or topics it is using.
output_file: ${result.outputFile}
Do NOT ${FILE_READ_TOOL_NAME} or tail this file via the shell tool \u2014 it is the full subagent JSONL transcript and reading it will overflow your context. If the user asks for progress, say the agent is still running; you'll get a completion notification.`
            : "In your own words, briefly tell the user what you launched \u2014 do not echo this tool result. Agent results will arrive in a subsequent message. If the user asks for progress, say the agent is still running.";
        let text = `${head}
${outputFileNote}${
          result.sharesCwd
            ? `
${warnConcurrentWriteAgents}`
            : ""
        }`;
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: [
            {
              type: "text",
              text,
            },
          ],
        };
      }
      if (result.status === "completed") {
        let worktreeNote = result.worktreePath
          ? `
worktreePath: ${result.worktreePath}${
              result.worktreeBranch
                ? `
worktreeBranch: ${result.worktreeBranch}`
                : ""
            }`
          : "";
        let content =
          result.content.length > 0
            ? result.content
            : [
                {
                  type: "text",
                  text: "(Subagent completed but returned no output.)",
                },
              ];
        let contentWithNotes = isHandbackProvenanceEnabled()
          ? buildHandbackResultContent(
              content,
              result.content.length > 0 ? result.harnessNoteCount : 0,
              result.content.length > 0 ? result.harnessTailCount : 0,
              result.harnessSectionHash,
            )
          : content;
        if (result.agentType && FAST_BUILTIN_AGENTS.has(result.agentType) && !worktreeNote)
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content: contentWithNotes,
          };
        let continueNote =
          result.canContinueAgent === false
            ? ""
            : ` (use ${SENDMESSAGE} with to: '${result.agentId}', summary: '<5-10 word recap>' to continue this agent)`;
        let usageText = `agentId: ${result.agentId}${continueNote}${worktreeNote}
<usage>subagent_tokens: ${result.totalTokens}
tool_uses: ${result.totalToolUseCount}
duration_ms: ${result.totalDurationMs}</usage>`;
        if (contentWithNotes !== content && contentWithNotes.length === 1)
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content: [
              {
                type: "text",
                text:
                  contentWithNotes[0].text +
                  `
` +
                  usageText,
              },
            ],
          };
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: [
            ...contentWithNotes,
            {
              type: "text",
              text: usageText,
            },
          ],
        };
      }
      logFeatureBad("subagent_launch", "subagent_unexpected_result_status");
      throw Error(`Unexpected agent tool result status: ${result.status}`);
    },
  });
});
//@ chunk-0tkmvwy0.js:53565-53745 placement
/**
 * 计算 fork 子代理可用性：fork 开关开启、没有同名自定义代理、allowedAgentTypes 允许，且没有 Agent(fork) deny 规则；返回 {available, denyRule}。
 */
function getForkAvailability(activeAgents, allowedAgentTypes, permissionContext) {
  if (
    !isForkSubagentEnabled() ||
    activeAgents.some((activeAgent) => normalizeAgentName(activeAgent.agentType) === FORK) ||
    !(allowedAgentTypes?.includes(FORK) ?? true)
  )
    return {
      available: false,
      denyRule: null,
    };
  let denyRuleWithContent = findDenyRuleWithContent(permissionContext, AGENT, FORK);
  return {
    available: denyRuleWithContent === null,
    denyRule: denyRuleWithContent,
  };
}
//@ chunk-0tkmvwy0.js:53745-54248 placement
/**
 * 并发子代理上限检查：超过 CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS（默认 20）时返回 AgentPreconditionError（tengu_amber_kestrel 或 ultracode 豁免）。
 */
function checkSubagentConcurrencyLimit(toolUseContext) {
  let limit = maxConcurrentSubagents();
  if (toolUseContext.taskRegistry.getConcurrentSubagents() < limit) return;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_kestrel", false)) return;
  let appState = toolUseContext.getAppState();
  if (isUltracodeActive(appState.ultracode, toolUseContext.rootToolSurface.mainLoopModel)) return;
  logFeatureBad("subagent_launch", "subagent_concurrency_cap");
  spawnStatsSlots.of(toolUseContext.session).recordRefused("concurrency_limit");
  return new AgentPreconditionError(
    `Concurrent subagent limit reached. You can run ${limit} subagents at once. Do not retry. If the user wants more concurrent subagents, ask them to increase CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS.`,
  );
}
//@ chunk-0tkmvwy0.js:54248-54451 placement
/**
 * general-purpose 代理是否可用（决定 subagent_type 能否省略）。
 */
function isGeneralPurposeAgentAvailable(activeAgents, allowedAgentTypes) {
  let generalPurposeNormalized = normalizeAgentName(GENERAL_PURPOSE_AGENT.agentType);
  let filtered = activeAgents.filter(
    (activeAgent) => normalizeAgentName(activeAgent.agentType) === generalPurposeNormalized,
  );
  let isAllowed = (agent) => allowedAgentTypes?.includes(agent.agentType) ?? true;
  let agent = filtered.find((agent) => agent.agentType === GENERAL_PURPOSE_AGENT.agentType);
  if (agent) return isAllowed(agent);
  return filtered.length === 1 && isAllowed(filtered[0]);
}
//@ chunk-0tkmvwy0.js:54451-54957 placement
/**
 * fork 的附加限制：不能与 isolation:"remote" 同用，不能在 fork 子代理内再 fork；返回 {code,message} 或 null。
 */
function getForkPreconditionError({ isolation, querySource, messages }) {
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
//@ chunk-0tkmvwy0.js:54957-55000 placement
/**
 * 把名字列表 join(", ")，空时返回 "none"。
 */
function formatAgentList(names) {
  return names.join(", ") || "none";
}
//@ chunk-0tkmvwy0.js:55000-55087 placement
function getAgentModelInheritCap(agentDefinition, parentModel) {
  if (!agentDefinition) return;
  let exploreAgentModel = getExploreAgentModel(agentDefinition, parentModel);
  return typeof exploreAgentModel === "object" ? exploreAgentModel.inheritCap : exploreAgentModel;
}
//@ chunk-0tkmvwy0.js:55087-55312 placement
/**
 * 在可提供代理中查找 subagent_type：先精确匹配，再按规范化名（大小写/空白/连字符不敏感）唯一匹配。
 */
function findAgentByNormalizedType(activeAgents, offeredAgents, agentType) {
  let found = offeredAgents.find((offeredAgent) => offeredAgent.agentType === agentType);
  if (found) return found;
  let normalizedType = normalizeAgentName(agentType);
  if (!normalizedType) return;
  let filtered = activeAgents.filter(
    (activeAgent) => normalizeAgentName(activeAgent.agentType) === normalizedType,
  );
  if (filtered.length !== 1) return;
  let match = filtered[0];
  return offeredAgents.some((offeredAgent) => offeredAgent.agentType === match.agentType) ? match : undefined;
}
//@ chunk-0tkmvwy0.js:55312-55502 placement
/**
 * @internal canContinueAgent 输出字段 schema。
 */
function canContinueAgentSchema() {
  return booleanSchema()
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
