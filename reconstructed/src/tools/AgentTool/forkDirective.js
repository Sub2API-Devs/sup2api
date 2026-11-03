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
import { makeSaltedName, Mr } from "../../utils/agentId.js";
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
import { HM } from "../../services/compact/compactCarry.js";
import { createBackgroundLaunchNotice, createUserMessage } from "../../utils/messages.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { getParentSessionId } from "../../utils/teammate.js";
import { rue, runAgent } from "./runAgent.js";
import { runWithCwdOverride } from "../../utils/cwd.js";
import { runAsyncAgentLifecycle } from "./agentToolUtils.js";
import { agentModelRestrictionNotifier } from "../../utils/model/agentModelRestriction.js";
import { getQuerySourceForAgent } from "../../utils/promptCategory.js";

/**
 * 以 fork 代理身份在后台启动一个"继承上下文"的子代理（被技能/钩子等内部调用，非 Agent 工具）：分配名字、注册后台任务、用父线程渲染好的系统提示词和全部消息、useExactTools 运行 runAgent；coordinator 模式或 endedByModel 时返回 null。
 */
//@ chunk-7jbxc8kr.js:717-3444 placement = resumeAgentBackground (0.432)
async function spawnForkFromDirective(directive, toolUseContext, canUseTool, options = {}) {
  let { extraMessages: extraMessages, forkOrigin: forkOrigin, narrowCanUseTool: narrowCanUseTool } = options;
  if (toolUseContext.getAppState().endedByModel)
    return (logFeatureBad("subagent_launch", "subagent_fork_ended_by_model"), null);
  if (isCoordinatorMode_2())
    return (logFeatureBad("subagent_launch", "subagent_fork_coordinator_mode"), null);
  let renderedSystemPrompt = toolUseContext.renderedSystemPrompt;
  if (!renderedSystemPrompt) {
    if (((renderedSystemPrompt = await collectContextData_2(toolUseContext)), !renderedSystemPrompt))
      return (logFeatureBad("subagent_launch", "subagent_fork_prompt_missing"), null);
  }
  let allocateName = toolUseContext.agentLifecycle.allocateName(
      slugifyForkName(options.nameHint ?? directive),
    ),
    trimmed = (
      typeof options.description === "function"
        ? options.description(allocateName)
        : (options.description ?? directive)
    )
      .replace(/\s+/g, " ")
      .trim(),
    p = trimmed.length > 50 ? truncateToLength(trimmed, 49) + "\u2026" : trimmed,
    o = makeSaltedName(allocateName),
    { taskRegistry: taskRegistry } = toolUseContext,
    startTime = Date.now(),
    f = getAgentDepth(toolUseContext.agentContext) + 1,
    C = getAgentModel(
      FORK_AGENT.model,
      toolUseContext.options.mainLoopModel,
      "inherit",
      getToolPermissionContext(toolUseContext).mode,
    ),
    S = mainAgentId(),
    T = getOwnToolSurface(toolUseContext, S),
    resumedMessages = registerAsyncAgent({
      outputFileReadable: HM(toolUseContext.options.tools),
      ownerCanContinueAgents: T,
      agentId: o,
      ownerAgentId: S,
      spawnDepth: f,
      description: p,
      prompt: directive,
      model: C,
      selectedAgent: FORK_AGENT,
      taskRegistry: taskRegistry,
      toolUseId: toolUseContext.toolUseId,
      sessionScratch: toolUseContext.session.sessionScratch,
    }),
    abortController = resumedMessages.abortController;
  if (
    (toolUseContext.appendSystemMessage?.(createBackgroundLaunchNotice(o, p)),
    toolUseContext.agentLifecycle.registerName(allocateName, Mr(o)),
    narrowCanUseTool)
  )
    getTaskRunState().canUseToolNarrowings.set(o, narrowCanUseTool);
  getTaskRunState().agentSpawned.emit({
    agentId: o,
    agentType: FORK_AGENT.agentType,
    parentAgentId: toolUseContext.agentId,
    taskRegistry: taskRegistry,
  });
  let b = {
      prompt: directive,
      resolvedAgentModel: C,
      isBuiltInAgent: !0,
      startTime: startTime,
      agentType: FORK_AGENT.agentType,
      isAsync: !0,
      agentDepth: f,
      callerCanContinueAgents: T,
      source: FORK_AGENT.source,
    },
    c = {
      agentId: o,
      parentAgentId: toolUseContext.agentId,
      depth: f,
      ...(alwaysFalse(toolUseContext) && { spawnedByMainThread: !0 }),
      parentSessionId: getParentSessionId(),
      agentType: "subagent",
      subagentName: FORK_AGENT.agentType,
      displayName: allocateName,
      isAsync: !0,
      isBackgroundAgent: !0,
      isBuiltIn: !0,
      ...(isMainConversationContext(toolUseContext.agentContext) && { forkOfMainConversation: !0 }),
      invocationKind: "spawn",
      invocationEmitted: !1,
      ...getWorkflowRunFields(toolUseContext.agentContext),
    },
    takeConcurrencySlot = taskRegistry.takeConcurrencySlot(),
    { onToolPool: onToolPool, reviewTools: reviewTools } = rue(toolUseContext.options.tools);
  return (
    runWithCwdOverride(c, () =>
      runAsyncAgentLifecycle({
        taskId: resumedMessages.agentId,
        abortController: abortController,
        makeStream: (P, U, _) =>
          runAgent({
            onQueryProgress: U,
            onStreamTokenEstimate: _,
            onModelRestricted: agentModelRestrictionNotifier(
              FORK_AGENT.agentType,
              toolUseContext.appendSystemMessage,
            ),
            agentDefinition: FORK_AGENT,
            turnPrompt: directive,
            promptMessages: [
              ...(extraMessages ?? []),
              createUserMessage({ content: [{ type: "text", text: buildChildMessage(directive) }] }),
            ],
            toolUseContext: toolUseContext,
            canUseTool: narrowCanUseTool ? narrowCanUseTool(canUseTool) : canUseTool,
            isAsync: !0,
            querySource: getQuerySourceForAgent(FORK_AGENT.agentType, !0),
            forkOrigin: forkOrigin,
            spawnedBySkill: toolUseContext.options.spawnedBySkill ?? toolUseContext.options.activeSkill,
            spawnedByForkedSkill: toolUseContext.options.spawnedByForkedSkill,
            model: "inherit",
            override: {
              systemPrompt: renderedSystemPrompt,
              parentSystemPrompt: !0,
              agentId: Mr(resumedMessages.agentId),
              agentContext: c,
              abortController: abortController,
              requireCanUseTool: narrowCanUseTool ? !0 : void 0,
            },
            availableTools: toolUseContext.options.tools,
            forkContextMessages: toolUseContext.messages,
            useExactTools: !0,
            onCacheSafeParams: P,
            onToolPool: onToolPool,
            description: p,
            name: allocateName,
          }),
        metadata: { ...b, agentContext: c },
        description: p,
        toolUseContext: toolUseContext,
        reviewTools: reviewTools,
        taskRegistry: taskRegistry,
        agentIdForCleanup: o,
        enableSummarization: !0,
        getWorktreeResult: async () => ({}),
        onRunSettled: takeConcurrencySlot,
      }),
    ),
    logFeatureOk("subagent_launch"),
    { agentId: o, name: allocateName }
  );
}

export { spawnForkFromDirective };
