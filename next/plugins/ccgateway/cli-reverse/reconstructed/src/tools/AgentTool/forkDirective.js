/**
 * tools/AgentTool/forkDirective.ts
 *
 * 2.1.316 新增。按 /fork、/subtask 指令派生分叉子代理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7jbxc8kr.js (1)
 * attribution: placement 1
 */
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { collectContextData_2 } from "../../commands/context/context-noninteractive.js";
import { slugifyForkName, FORK_AGENT, buildChildMessage } from "./forkSubagent.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { makeSaltedName, identityAgentId2 } from "../../utils/agentId.js";
import {
  getAgentDepth,
  alwaysFalse,
  isMainConversationContext,
  getWorkflowRunFields,
} from "../../utils/agentContext.js";
import { getAgentModel } from "../../utils/model/agent.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { getOwnToolSurface, registerAsyncAgent } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { willToolsLoseSessionState } from "../../services/compact/compactCarry.js";
import { createBackgroundLaunchNotice, createUserMessage } from "../../utils/messages.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { getParentSessionId } from "../../utils/teammate.js";
import { createDeferredReviewTools, runAgent } from "./runAgent.js";
import { runWithCwdOverride } from "../../utils/cwd.js";
import { runAsyncAgentLifecycle } from "./agentToolUtils.js";
import { agentModelRestrictionNotifier } from "../../utils/model/agentModelRestriction.js";
import { getQuerySourceForAgent } from "../../utils/promptCategory.js";

//@ chunk-7jbxc8kr.js:717-3444 placement (2.1.88 match: resumeAgentBackground, 0.432)
/**
 * 以 fork 代理身份在后台启动一个"继承上下文"的子代理（被技能/钩子等内部调用，非 Agent 工具）：分配名字、注册后台任务、用父线程渲染好的系统提示词和全部消息、useExactTools 运行 runAgent；coordinator 模式或 endedByModel 时返回 null。
 */
async function spawnForkFromDirective(directive, toolUseContext, canUseTool, options = {}) {
  let { extraMessages, forkOrigin, narrowCanUseTool } = options;
  if (toolUseContext.getAppState().endedByModel) {
    logFeatureBad("subagent_launch", "subagent_fork_ended_by_model");
    return null;
  }
  if (isCoordinatorMode_2()) {
    logFeatureBad("subagent_launch", "subagent_fork_coordinator_mode");
    return null;
  }
  let renderedSystemPrompt = toolUseContext.renderedSystemPrompt;
  if (!renderedSystemPrompt) {
    renderedSystemPrompt = await collectContextData_2(toolUseContext);
    if (!renderedSystemPrompt) {
      logFeatureBad("subagent_launch", "subagent_fork_prompt_missing");
      return null;
    }
  }
  let agentName = toolUseContext.agentLifecycle.allocateName(slugifyForkName(options.nameHint ?? directive));
  let trimmed = (
    typeof options.description === "function"
      ? options.description(agentName)
      : (options.description ?? directive)
  )
    .replace(/\s+/g, " ")
    .trim();
  let shortDescription = trimmed.length > 50 ? truncateToLength(trimmed, 49) + "\u2026" : trimmed;
  let launchedAgentId = makeSaltedName(agentName);
  let { taskRegistry } = toolUseContext;
  let startTime = Date.now();
  let agentDepth = getAgentDepth(toolUseContext.agentContext) + 1;
  let agentModel = getAgentModel(
    FORK_AGENT.model,
    toolUseContext.options.mainLoopModel,
    "inherit",
    getToolPermissionContext(toolUseContext).mode,
  );
  let ownerAgentId = mainAgentId();
  let ownToolSurface = getOwnToolSurface(toolUseContext, ownerAgentId);
  let resumedMessages = registerAsyncAgent({
    outputFileReadable: willToolsLoseSessionState(toolUseContext.options.tools),
    ownerCanContinueAgents: ownToolSurface,
    agentId: launchedAgentId,
    ownerAgentId,
    spawnDepth: agentDepth,
    description: shortDescription,
    prompt: directive,
    model: agentModel,
    selectedAgent: FORK_AGENT,
    taskRegistry,
    toolUseId: toolUseContext.toolUseId,
    sessionScratch: toolUseContext.session.sessionScratch,
  });
  let abortController = resumedMessages.abortController;
  toolUseContext.appendSystemMessage?.(createBackgroundLaunchNotice(launchedAgentId, shortDescription));
  toolUseContext.agentLifecycle.registerName(agentName, identityAgentId2(launchedAgentId));
  if (narrowCanUseTool) getTaskRunState().canUseToolNarrowings.set(launchedAgentId, narrowCanUseTool);
  getTaskRunState().agentSpawned.emit({
    agentId: launchedAgentId,
    agentType: FORK_AGENT.agentType,
    parentAgentId: toolUseContext.agentId,
    taskRegistry,
  });
  let metadata = {
    prompt: directive,
    resolvedAgentModel: agentModel,
    isBuiltInAgent: true,
    startTime,
    agentType: FORK_AGENT.agentType,
    isAsync: true,
    agentDepth,
    callerCanContinueAgents: ownToolSurface,
    source: FORK_AGENT.source,
  };
  let agentContext = {
    agentId: launchedAgentId,
    parentAgentId: toolUseContext.agentId,
    depth: agentDepth,
    ...(alwaysFalse(toolUseContext) && {
      spawnedByMainThread: true,
    }),
    parentSessionId: getParentSessionId(),
    agentType: "subagent",
    subagentName: FORK_AGENT.agentType,
    displayName: agentName,
    isAsync: true,
    isBackgroundAgent: true,
    isBuiltIn: true,
    ...(isMainConversationContext(toolUseContext.agentContext) && {
      forkOfMainConversation: true,
    }),
    invocationKind: "spawn",
    invocationEmitted: false,
    ...getWorkflowRunFields(toolUseContext.agentContext),
  };
  let onRunSettled = taskRegistry.takeConcurrencySlot();
  let { onToolPool, reviewTools } = createDeferredReviewTools(toolUseContext.options.tools);
  runWithCwdOverride(agentContext, () =>
    runAsyncAgentLifecycle({
      taskId: resumedMessages.agentId,
      abortController,
      makeStream: (onCacheSafeParams, onQueryProgress, onStreamTokenEstimate) =>
        runAgent({
          onQueryProgress,
          onStreamTokenEstimate,
          onModelRestricted: agentModelRestrictionNotifier(
            FORK_AGENT.agentType,
            toolUseContext.appendSystemMessage,
          ),
          agentDefinition: FORK_AGENT,
          turnPrompt: directive,
          promptMessages: [
            ...(extraMessages ?? []),
            createUserMessage({
              content: [
                {
                  type: "text",
                  text: buildChildMessage(directive),
                },
              ],
            }),
          ],
          toolUseContext,
          canUseTool: narrowCanUseTool ? narrowCanUseTool(canUseTool) : canUseTool,
          isAsync: true,
          querySource: getQuerySourceForAgent(FORK_AGENT.agentType, true),
          forkOrigin,
          spawnedBySkill: toolUseContext.options.spawnedBySkill ?? toolUseContext.options.activeSkill,
          spawnedByForkedSkill: toolUseContext.options.spawnedByForkedSkill,
          model: "inherit",
          override: {
            systemPrompt: renderedSystemPrompt,
            parentSystemPrompt: true,
            agentId: identityAgentId2(resumedMessages.agentId),
            agentContext,
            abortController,
            requireCanUseTool: narrowCanUseTool ? true : undefined,
          },
          availableTools: toolUseContext.options.tools,
          forkContextMessages: toolUseContext.messages,
          useExactTools: true,
          onCacheSafeParams,
          onToolPool,
          description: shortDescription,
          name: agentName,
        }),
      metadata: {
        ...metadata,
        agentContext,
      },
      description: shortDescription,
      toolUseContext,
      reviewTools,
      taskRegistry,
      agentIdForCleanup: launchedAgentId,
      enableSummarization: true,
      getWorktreeResult: async () => ({}),
      onRunSettled,
    }),
  );
  logFeatureOk("subagent_launch");
  return {
    agentId: launchedAgentId,
    name: agentName,
  };
}
export { spawnForkFromDirective };
