/**
 * tools/AgentTool/AgentTool.tsx
 *
 * Agent 工具执行体（callAgentTool）与输出 schema：子代理/fork/队友/远程代理的启动决策、隔离、前后台与结果组装（工具对象本身被切到 _unattributed/chunk-0tkmvwy0/part-005）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/AgentTool.tsx
 * pieces: chunk-0tkmvwy0.js (4), chunk-apw2zhyn.js (1), chunk-e6aww6q8.js (1)
 * attribution: placement 2, fingerprint 4
 */
import { realpath } from "fs/promises";
import {
  isAutoApprovableWebFetchDispatch,
  WebFetchDispatchApprovals,
  checkSpawnHookRewrite,
  RULE_BEHAVIOR_VERB,
  formatSpawnHookMcpMissing,
  DONTASK,
} from "./agentSpawnPermissions.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  agentToolResultSchema,
  rebaseHookOriginForAgent,
  resolveAgentTools,
  runAsyncAgentLifecycle,
  appendModelIfChanged,
  recoverFromSyncAgentError,
  buildAgentHandback,
  finalizeAgentTool,
} from "./agentToolUtils.js";
import { literal, string, u, array, M, union } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  canContinueAgentSchema,
  getForkAvailability,
  formatAgentList,
  checkSubagentConcurrencyLimit,
  findAgentByNormalizedType,
  AgentTool,
  getAgentModelInheritCap,
  getForkPreconditionError,
  isGeneralPurposeAgentAvailable,
} from "./agentToolDefinition.js";
import { isRelativeEffortDisabled } from "./agentEffort.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { env } from "../../utils/env.js";
import {
  assertAgentCwdAllowed,
  AgentPreconditionError,
  AgentTypeError,
  RemoteAgentPreconditionError,
  REMOTE_AGENT_RESTRICTED_CONFIG_ERROR,
  BACKGROUND_HINT_DELAY_MS,
} from "./agentInputSchema.js";
import {
  getAgentDepth,
  isDelegatedObservationContext,
  isHookOrPluginSteered,
  alwaysFalse,
  isMainConversationContext,
  getWorkflowRunFields,
} from "../../utils/agentContext.js";
import { getMaxSubagentSpawnDepth } from "./spawnDepth.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { spawnStatsSlots } from "../../tasks/taskState.js";
import { isAgentStopPending } from "../../utils/agentProcessRegistry.js";
import { isMainConversationsOwnCall } from "./resumeAgent.js";
import {
  ResumedAgentCallRegistry,
  resolveResumedAgentCall,
  isUnreviewedWebFetchDispatch,
} from "./agentContainerResume.js";
import { willToolsLoseSessionState } from "../../services/compact/compactCarry.js";
import { hasSendMessageTool } from "../SendMessageTool/constants.js";
import { getToolPermissionContext, getMainLoopModel } from "../../utils/permissions/toolPermissionContext.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { getDynamicTeamContext, getParentSessionId } from "../../utils/teammate.js";
import { isZincHarborOn } from "../../plugins/functionHooks/inputHold.js";
import { normalizeAgentName, isWebFetchAgent, WEB_FETCH_AGENT } from "../WebFetchTool/harnessNotes.js";
import { FORK, AGENT, SUBAGENT_TYPE_REQUIRED, FAST_BUILTIN_AGENTS } from "./constants.js";
import {
  findDenyRuleWithContent,
  getDispatchableAgents,
  isAgentToolPoolDenied,
  agentToolPoolDeniedMessage,
  hasLeftProactivityBaseline,
} from "../../utils/permissions/permissions.js";
import { unwrapAbortReason } from "../../utils/abortController.js";
import { AbortError, errorMessage, toError } from "../../utils/errors.js";
import { hasReachedBudget, getSessionCostUSD } from "../../cost-tracker.js";
import { resolveAgentOverrides } from "./agentDisplay.js";
import { filterOfferedAgents, recordSpawnProvenance } from "../../plugins/functionHooks/agentHooks.js";
import {
  loadListedAgentDefinition,
  hasRequiredMcpServers_2,
  isBuiltInAgent,
  hasRequiredMcpServers,
  isPluginAgent,
} from "./loadAgentsDir.js";
import {
  NO_INTERRUPT_ABORT,
  toSpawnHookInput,
  ALLOW_INTERRUPT_ABORT,
  getBackgroundedToolUseId,
  decideAgentLaunchMode,
  findTaskOccupyingPath,
  isTaskStillOccupying,
  watchWorktreeForRelease,
} from "./agentLaunchHelpers.js";
import { teammateAgentIdentity } from "../../utils/swarm/teammateAgentIdentity.js";
import { launchAgentsWithHooks, ObserverReportTool } from "../ObserverReportTool/ObserverReportTool.js";
import { isMcpTool, getMcpServerNameOfTool } from "../../services/mcp/utils.js";
import { tagObject, authExpiredBlockFor } from "../../services/policyLimits/capabilityBlocks.js";
import { setAgentColor } from "./agentColorManager.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import {
  FORK_AGENT,
  isForkSubagentEnabled,
  forkGateForcesBackground,
  buildForkedMessages,
  buildWorktreeNotice,
} from "./forkSubagent.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  lit,
  agentTypeForAnalytics_GATE_EVALUATED,
  agentTypeForAnalyticsFromDefinition,
  fromEnum,
  fromEnumOpt,
} from "../../services/analytics/safeMetadata.js";
import { GENERAL_PURPOSE_AGENT } from "./built-in/generalPurposeAgent.js";
import {
  refuseUnavailableWorktree,
  throwAgentWorktreeNotGitRefusal,
  createAgentWorktree,
  hasWorktreeChanges,
  getAgentWorktreeChanges,
  removeAgentWorktree,
  unlockAgentWorktree,
} from "../../utils/worktree.js";
import {
  canRunAgentInWorktree,
  autoBackgroundMsForLaunch,
  resolveSubagentPermissionMode,
  getPushedBranchForRemoteAgent,
  hasConcurrentEditingAgentInCwd,
  CONCURRENT_WRITE_AGENT_WARNING,
  autoBackgroundOptions,
  raceAgentLaunch,
  settleBackgroundedAgent,
} from "./agentLaunch.js";
import {
  getIsNonInteractiveSession,
  mainAgentId,
  getSdkAgentProgressSummariesEnabled,
} from "../../bootstrap/state.js";
import {
  isForegroundAgentMoveOff,
  isBackgroundLaunchByDefault,
  isBackgroundAgentLaunchDisabled,
} from "./backgroundGates.js";
import {
  getBackgroundLaunchRule,
  runBackgroundLaunchRules,
  backgroundLaunchRuleText,
} from "../../tasks/backgroundLaunchRules.js";
import {
  waitForMcpClients,
  isPendingServerWithoutTools,
  waitForCoordinatorSubagentMcpServers,
} from "../../coordinator/coordinatorMcpServers.js";
import { isAbortedNotByInterrupt } from "../../entrypoints/sdk/controlSchemas.js";
import { getAgentModel, getExploreAgentModel } from "../../utils/model/agent.js";
import { resolveSubagentEffort } from "./subagentSpawn.js";
import { findAdjacentEffortLevel } from "../../utils/effort.js";
import { readAgentMemoryScope } from "./agentMemory.js";
import { parsePluginIdentifier_2 } from "../../utils/plugins/pluginIdentifier.js";
import { recordPluginUsage, buildPluginEventFields } from "../../utils/telemetry/pluginTelemetry.js";
import { recordPluginActivity } from "../../utils/pluginActivity.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { isPersonalConfigRestricted } from "../../utils/personalConfigRestriction.js";
import {
  checkRemoteSessionEligibility,
  formatPreconditionError,
  registerRemoteAgentTask,
} from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { getClaudeAIOAuthTokenOriginAsync } from "../../utils/auth.js";
import { teleportToRemote } from "../../utils/teleport.js";
import { WORKFLOW_REMOTE_AGENT } from "../../bridge/sessionOrigins.js";
import { resolveProactivityOptions } from "../../utils/proactivityLevel.js";
import { takesNarrowingModeOnly } from "../../utils/permissions/permissionsLoader.js";
import { cycleAllTeammateModes } from "../../components/teams/TeamsDialog.js";
import { memoryModeForSession } from "../../services/accountMemory/memoryContext.js";
import { remoteSessionUrl } from "../../utils/background/remote/remoteSession.js";
import { getTaskOutputPath } from "../../utils/task/diskOutput.js";
import { getSystemPrompt, buildSubagentNotesSection } from "../../constants/prompts.js";
import { effectiveSystemPromptText } from "../../utils/systemPrompt.js";
import { applyPromptAblation } from "../../utils/api.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { buildForwardedTurnsForAgent, recordTurnsDeliveredDirect } from "../../utils/messageProvenance.js";
import { forwardProjectsOwnerRows } from "../../utils/permissions/yoloClassifier.js";
import {
  createUserMessage,
  normalizeMessages,
  extractAgentIdsFromMessages_2,
  createProgressMessage_2,
  isSyntheticMessage,
} from "../../utils/messages.js";
import {
  resolveVisibleSubagentId,
  getOwnToolSurface,
  registerAsyncAgent,
  killAsyncAgent,
  markAgentNotified,
  registerAgentForeground,
  recordWorkerCheckin,
  moveAgentToBackground,
  unregisterAgentForeground,
} from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { defaultToolResultsStorage } from "../../utils/mcpOutputStorage.js";
import {
  assembleAgentToolPool,
  createDeferredReviewTools,
  clearWorktreeFromAgentMetadata,
  spawnRequestShape,
  runAgent,
  filterIncompleteToolCalls_2,
} from "./runAgent.js";
import {
  MAIN_OBSERVED_KEY,
  resolveObserverDeclaration,
  shouldFanOutObserver,
  pairingForObserver,
  armObserver,
} from "../../services/agentObserver/agentObserver.js";
import { makeSaltedName, identityAgentId2 } from "../../utils/agentId.js";
import { promptIdForRequest } from "../../services/api/claude.js";
import { agentSkillName } from "../../skills/syncedSkills.js";
import { recordSpawnedAgentIsolation } from "../../utils/concurrentSessions.js";
import { getCwd, hasOutermostCallFrame, runWithCwdOverride, withCallFrameCwd } from "../../utils/cwd.js";
import { formatTotalTokensTag } from "../../utils/attachments/totalTokensReminder.js";
import { getQuerySourceForAgent } from "../../utils/promptCategory.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { plural } from "../../utils/stringUtils.js";
import { displayModelName, formatModelRestrictedNotice } from "../../utils/model/validateModel.js";
import { isParkedOnChildWork, hasChildAgents } from "../../tasks/LocalAgentTask/childWork.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { describeStorageError } from "../../utils/agentMetadata.js";
import { MAIN } from "../../utils/sessionPeers.js";
import { getTaskRunState, emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { isIterativeHavenGateOn } from "../../cli/print/agentResume.js";
import { categorizeRetryableAPIError } from "../../services/api/errors.js";
import { getAssistantMessageContentLength } from "../../utils/tokens.js";
import { getPendingHandbackReport, forgetHandback } from "./handbackReport.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { isBareMode } from "../../utils/envUtils.js";

//@ chunk-0tkmvwy0.js:7783-7872 placement
/**
 * AgentTool.checkPermissions 的免审分支：dontAsk 下 web-fetch 代理派发满足条件时登记并返回 true。
 */
async function tryAutoApproveWebFetchDispatch({ input, toolUseContext }) {
  if (!(await isAutoApprovableWebFetchDispatch(input, toolUseContext))) return false;
  markWebFetchDispatchApproved(toolUseContext);
  return true;
}
//@ chunk-0tkmvwy0.js:7872-7955 placement = collectCandidatesFromMessage (0.621)
/**
 * 在 toolState 的 WebFetchDispatchApprovals 中登记当前 toolUseId。
 */
function markWebFetchDispatchApproved({ toolUseId, toolState }) {
  if (toolUseId === undefined) return;
  toolState.get(WebFetchDispatchApprovals).set(toolUseId, [], true);
}
//@ chunk-0tkmvwy0.js:16698-18155 fingerprint = outputSchema (0.581)
/**
 * Agent 工具输出 schema：completed（agentToolResultSchema + prompt/worktree）、async_launched（agentId/outputFile/resolvedModel/modelsUsed/sharesCwd…）、remote_launched（taskId/sessionUrl/outputFile）三者联合。
 */
var completedResultSchema = DoctorLazy(() =>
  agentToolResultSchema().extend({
    status: literal("completed"),
    prompt: string(),
    worktreePath: string().optional(),
    worktreeBranch: string().optional(),
    canContinueAgent: canContinueAgentSchema(),
  }),
);
var agentOutputSchema = DoctorLazy(() => {
  let n = completedResultSchema();
  let e = u({
    status: literal("async_launched"),
    isAsync: literal(true).optional(),
    agentId: string().describe("The ID of the async agent"),
    description: string().describe("The description of the task"),
    resolvedModel: string()
      .optional()
      .describe("Model in use at the backgrounding transition (a pre-background swap is reflected here)"),
    modelsUsed: array(string())
      .optional()
      .describe("Ordered distinct models used before backgrounding (length > 1 means a mid-run swap)"),
    prompt: string().describe("The prompt for the agent"),
    outputFile: string().describe("Path to the output file for checking agent progress"),
    canReadOutputFile: M()
      .optional()
      .describe("Whether the calling agent has Read/Bash tools to check progress"),
    canContinueAgent: canContinueAgentSchema(),
    sharesCwd: M()
      .optional()
      .describe(
        "@internal True when this unisolated write-capable agent was launched into a working directory where another one is already running and a worktree could have been made here (drives a model-facing note; not a stable consumer field)",
      ),
  });
  let s = u({
    status: literal("remote_launched"),
    taskId: string().describe("The ID of the remote agent task"),
    sessionUrl: string().describe("The URL of the cloud session"),
    description: string().describe("The description of the task"),
    prompt: string().describe("The prompt for the agent"),
    outputFile: string().describe("Path to the output file for checking agent progress"),
  });
  return union([n, e, s]);
});
//@ chunk-0tkmvwy0.js:18155-48361 fingerprint = AgentTool (0.354)
/**
 * Agent 工具的执行体：校验嵌套深度、预算、并发上限与 deny 规则，解析 subagent_type（fork / 规范化匹配 / general-purpose 缺省），处理 name 队友派生、agent.spawn 插件钩子改写、requiredMcpServers 等待，然后按 decideAgentLaunchMode 走远程（teleportToRemote）、后台（runAsyncAgentLifecycle）或同步（runAgent 流 + 进度回调）三条路径；isolation=worktree 时创建并在结束后清理 worktree。
 */
async function callAgentTool({
  agentInput,
  toolUseContext,
  canUseTool,
  assistantMessage,
  onProgress,
  timing,
  enclosingToolUseId,
}) {
  let {
    subagent_type: subagentType,
    run_in_background: runInBackground,
    name: teammateName,
    isolation,
  } = agentInput;
  let { prompt, description, cwd, effort } = agentInput;
  let model = agentInput.model;
  let relativeEffort =
    isRelativeEffortDisabled() && (effort === "lower" || effort === "higher") ? effort : undefined;
  let absoluteEffort = effort === "lower" || effort === "higher" ? undefined : effort;
  let startTime = Date.now();
  if (isCoordinatorMode_2() && env.CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL) model = undefined;
  let requestedModel = model;
  let agentPrompt = prompt;
  let agentDescription = description;
  let agentCwd = cwd;
  await assertAgentCwdAllowed(agentCwd, "the call");
  let agentDepth = getAgentDepth(toolUseContext.agentContext);
  let maxSubagentSpawnDepth = getMaxSubagentSpawnDepth();
  if (agentDepth >= maxSubagentSpawnDepth) {
    logFeatureBad("subagent_launch", "subagent_depth_cap");
    spawnStatsSlots.of(toolUseContext.session).recordRefused("depth_limit");
    throw new AgentPreconditionError(
      `Subagent nesting limit reached (depth ${agentDepth} of ${maxSubagentSpawnDepth}). Complete this task directly using your tools instead of spawning another agent. If the user explicitly requested deeper nesting, ask them to raise CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH.`,
    );
  }
  if (toolUseContext.agentId !== undefined && isAgentStopPending(toolUseContext.agentId)) {
    logFeatureBad("subagent_launch", "subagent_spawner_stop_pending");
    throw new AgentPreconditionError(
      "This agent has been stopped and its stop is still completing; it cannot launch new agents.",
    );
  }
  let Kt = isMainConversationsOwnCall(toolUseContext)
    ? toolUseContext.toolState.get(ResumedAgentCallRegistry).take(toolUseContext.toolUseId)
    : undefined;
  if (Kt !== undefined) {
    let resumedAgentCall = await resolveResumedAgentCall(Kt, toolUseContext);
    return resumedAgentCall.status === "async_launched"
      ? {
          data: {
            ...resumedAgentCall,
            isAsync: true,
            prompt: agentInput.prompt,
            canReadOutputFile: willToolsLoseSessionState(toolUseContext.options.tools),
            canContinueAgent: hasSendMessageTool(toolUseContext.options.tools),
          },
        }
      : {
          data: {
            status: "completed",
            prompt: agentInput.prompt,
            ...resumedAgentCall.report,
            canContinueAgent: hasSendMessageTool(toolUseContext.options.tools),
          },
        };
  }
  agentDescription = agentDescription.replace(/\s+/g, " ").trim();
  let appState = toolUseContext.getAppState();
  let permissionContext = getToolPermissionContext(toolUseContext);
  let mode = permissionContext.mode;
  let { taskRegistry } = toolUseContext;
  let teamContext = isAgentSwarmsEnabled() ? appState.teamContext : undefined;
  let callerIsInProcessTeammate = !!toolUseContext.teammateContext;
  if ((callerIsInProcessTeammate || !!getDynamicTeamContext()) && teammateName && !isZincHarborOn()) {
    logFeatureBad("subagent_launch", "subagent_nested_teammate");
    throw new AgentPreconditionError(
      "Teammates cannot spawn other teammates \u2014 the team roster is flat. To spawn a subagent instead, omit the `name` parameter.",
    );
  }
  if (callerIsInProcessTeammate && runInBackground === true) {
    logFeatureBad("subagent_launch", "subagent_teammate_background_denied");
    throw new AgentPreconditionError(
      "In-process teammates cannot spawn background agents. Use run_in_background=false for synchronous subagents.",
    );
  }
  let { activeAgents, allowedAgentTypes } = toolUseContext.options.agentDefinitions;
  let requestedFork = subagentType !== undefined && normalizeAgentName(subagentType) === FORK;
  let { available, denyRule } = getForkAvailability(activeAgents, allowedAgentTypes, permissionContext);
  if (requestedFork && denyRule) {
    logFeatureBad("subagent_launch", "subagent_type_denied");
    throw new AgentTypeError(
      `Agent type '${FORK}' has been denied by permission rule '${AGENT}(${FORK})' from ${denyRule.source}.`,
    );
  }
  let isForkLaunch = requestedFork && available;
  if (subagentType !== undefined && !requestedFork) {
    let denyRuleWithContent = findDenyRuleWithContent(permissionContext, AGENT, subagentType);
    if (denyRuleWithContent) {
      logFeatureBad("subagent_launch", "subagent_type_denied");
      throw new AgentTypeError(
        `Agent type '${subagentType}' has been denied by permission rule '${AGENT}(${subagentType})' from ${denyRuleWithContent.source}.`,
      );
    }
    if (allowedAgentTypes && !allowedAgentTypes.includes(subagentType)) {
      logFeatureBad("subagent_launch", "subagent_type_not_found");
      let mapped = (
        await getDispatchableAgents(activeAgents, allowedAgentTypes, permissionContext, toolUseContext)
      ).map((R) => R.agentType);
      throw new AgentTypeError(
        `Agent type '${subagentType}' not found. Available agents: ${formatAgentList(mapped)}`,
      );
    }
  }
  let assertCanLaunch = (r = false) => {
    if (toolUseContext.abortController.signal.aborted) {
      let R = unwrapAbortReason(toolUseContext.abortController.signal.reason);
      if (!(r && R === "interrupt")) throw new AbortError();
    }
    let { maxBudgetUsd } = toolUseContext.options;
    if (hasReachedBudget(maxBudgetUsd)) {
      logFeatureBad("subagent_launch", "subagent_budget_exhausted");
      spawnStatsSlots.of(toolUseContext.session).recordRefused("budget");
      throw new AgentPreconditionError(
        `Budget limit reached ($${getSessionCostUSD().toFixed(2)} spent of the $${maxBudgetUsd} maximum). New agents cannot be started. Complete the remaining work directly with your tools, or wrap up with the results you already have.`,
      );
    }
  };
  let oo = async () => {
    let r = checkSubagentConcurrencyLimit(toolUseContext);
    if (r) {
      await cleanupAgentWorktree();
      throw r;
    }
    return toolUseContext.taskRegistry.takeConcurrencySlot();
  };
  if (
    teamContext &&
    teammateName &&
    !isForkLaunch &&
    !resolveAgentOverrides(subagentType, activeAgents) &&
    !isolation &&
    !agentCwd &&
    !isZincHarborOn()
  ) {
    let offeredAgents = await getDispatchableAgents(
      activeAgents,
      allowedAgentTypes,
      permissionContext,
      toolUseContext,
    );
    let teammateAgentDef = subagentType
      ? findAgentByNormalizedType(activeAgents, offeredAgents, subagentType)
      : undefined;
    if (teammateAgentDef && teammateAgentDef.agentType !== subagentType) {
      let denyRuleWithContent = findDenyRuleWithContent(permissionContext, AGENT, teammateAgentDef.agentType);
      if (denyRuleWithContent) {
        logFeatureBad("subagent_launch", "subagent_type_denied");
        throw new AgentTypeError(
          `Agent type '${teammateAgentDef.agentType}' has been denied by permission rule '${AGENT}(${teammateAgentDef.agentType})' from ${denyRuleWithContent.source}.`,
        );
      }
    }
    let R =
      teammateAgentDef ??
      (subagentType ? findAgentByNormalizedType(activeAgents, activeAgents, subagentType) : undefined);
    if (!(R === undefined || (await filterOfferedAgents([R], toolUseContext)).length === 1)) {
      logFeatureBad("subagent_launch", "subagent_teammate_not_offered");
      throw new AgentTypeError(`Agent type '${subagentType}' is not offered in this session.`);
    }
    let loadedTeammateDef = teammateAgentDef
      ? await loadListedAgentDefinition(teammateAgentDef, toolUseContext.abortController.signal)
      : undefined;
    if (teammateAgentDef && !loadedTeammateDef) {
      logFeatureBad("subagent_launch", "subagent_plugin_load_failed");
      throw new AgentTypeError(
        `Agent type '${teammateAgentDef.agentType}' could not be loaded from its plugin.`,
      );
    }
    assertCanLaunch(NO_INTERRUPT_ABORT);
    let mainLoopModel = getMainLoopModel(toolUseContext);
    let L = loadedTeammateDef ?? teammateAgentIdentity(subagentType);
    let teammateSpawnHook = await launchAgentsWithHooks({
      tool_use_id: toolUseContext.toolUseId ?? "",
      prompt: agentPrompt,
      description: agentDescription,
      agent: L,
      agents: offeredAgents,
      model,
      parentModel: mainLoopModel,
      parentAgentId: toolUseContext.agentId,
      permissionMode: mode,
      background: true,
      fork: false,
      isTeammate: true,
      name: teammateName,
      cwd: undefined,
      signal: toolUseContext.abortController.signal,
      origin: toolUseContext.hookOrigin,
    });
    using starting = teammateSpawnHook.starting;
    if (teammateSpawnHook.deny !== undefined) {
      logFeatureBad("subagent_launch", "subagent_spawn_denied_by_hook");
      throw new AgentPreconditionError(`Subagent spawn denied by a plugin: ${teammateSpawnHook.deny}`);
    }
    rebaseHookOriginForAgent(
      {
        toolUseContext,
      },
      teammateSpawnHook.isRewritten,
    );
    let spawn = teammateSpawnHook.spawn;
    let V = await checkSpawnHookRewrite({
      tool: AgentTool,
      raised: toSpawnHookInput(agentInput, {
        prompt: agentPrompt,
        description: agentDescription,
        subagentType: L.agentType,
        model,
        background: true,
        cwd: undefined,
      }),
      rewritten: toSpawnHookInput(agentInput, spawn),
      context: toolUseContext,
    });
    if (V) {
      logFeatureBad("subagent_launch", "subagent_spawn_hook_rewrite_ruled");
      throw new AgentPreconditionError(
        `A plugin's agent.spawn hook rewrote this spawn into one a permission rule ${RULE_BEHAVIOR_VERB[V.behavior]}: ${V.message} Dispatch it directly.`,
      );
    }
    let found = offeredAgents.find(
      (offeredAgent) => offeredAgent === teammateSpawnHook.agent && offeredAgent !== L,
    );
    if (resolveAgentOverrides(found?.agentType, activeAgents)) {
      logFeatureBad("subagent_launch", "subagent_spawn_hook_teammate_rewrite");
      throw new AgentPreconditionError(
        `A plugin's agent.spawn hook retyped a teammate into '${found?.agentType}', which does not run as a teammate.`,
      );
    }
    if (found) {
      loadedTeammateDef = await loadListedAgentDefinition(found, toolUseContext.abortController.signal);
      if (!loadedTeammateDef) {
        logFeatureBad("subagent_launch", "subagent_plugin_load_failed");
        throw new AgentTypeError(`Agent type '${found.agentType}' could not be loaded from its plugin.`);
      }
      let servers = hasRequiredMcpServers_2(loadedTeammateDef, [
        ...toolUseContext.getAppState().mcp.tools,
        ...toolUseContext.options.tools.filter(isMcpTool),
      ]);
      if (servers.length > 0) {
        logFeatureBad("subagent_launch", "subagent_mcp_required_missing");
        throw tagObject(
          new AgentPreconditionError(formatSpawnHookMcpMissing(loadedTeammateDef.agentType, servers)),
          {
            kind: "mcp_required_missing",
            servers,
          },
        );
      }
    }
    agentPrompt = spawn.prompt;
    agentDescription = spawn.description.replace(/\s+/g, " ").trim();
    let model_2 = spawn.model;
    let agentType = loadedTeammateDef?.agentType ?? subagentType;
    assertCanLaunch(ALLOW_INTERRUPT_ABORT);
    if (loadedTeammateDef?.color)
      setAgentColor(
        found ? loadedTeammateDef.agentType : (subagentType ?? loadedTeammateDef.agentType),
        loadedTeammateDef.color,
      );
    let { spawnTeammate } = require("./chunk-cne5hsvz.js");
    let teammateSpawnResult = await spawnTeammate(
      {
        name: teammateName,
        prompt: agentPrompt,
        description: agentDescription,
        use_splitpane: true,
        plan_mode_required: mode === "plan",
        model: model_2 ?? getAgentModelInheritCap(loadedTeammateDef, getMainLoopModel(toolUseContext)),
        modelSource: model_2 ? "tool" : "frontmatter",
        agent_type: agentType,
        agentDefinition: loadedTeammateDef,
        invokingRequestId: assistantMessage?.requestId,
      },
      toolUseContext,
      onProgress,
    );
    let data = {
      status: "teammate_spawned",
      prompt: agentPrompt,
      agentId: teammateSpawnResult.data.agent_id,
      resolvedModel: parseUserSpecifiedModel(teammateSpawnResult.data.model ?? mainLoopModel),
      ...teammateSpawnResult.data,
    };
    let gt = teammateSpawnResult.loopAgentId ?? teammateSpawnResult.data.teammate_id;
    recordSpawnProvenance(gt, toolUseContext);
    starting?.started({
      agentId: gt,
      model: parseUserSpecifiedModel(teammateSpawnResult.data.model ?? mainLoopModel),
      teammateId: teammateSpawnResult.data.teammate_id,
    });
    logFeatureOk("subagent_launch");
    return {
      data,
    };
  }
  let Jt = {
    isolation,
    querySource: toolUseContext.options.querySource,
    messages: toolUseContext.messages,
  };
  let selectedAgent;
  let agents = [];
  if (isForkLaunch) {
    let forkPreconditionError = getForkPreconditionError(Jt);
    if (forkPreconditionError) {
      logFeatureBad("subagent_launch", forkPreconditionError.code);
      throw new AgentPreconditionError(forkPreconditionError.message);
    }
    selectedAgent = FORK_AGENT;
  } else {
    let offeredAgentsList = await getDispatchableAgents(
      activeAgents,
      allowedAgentTypes,
      permissionContext,
      toolUseContext,
    );
    agents = offeredAgentsList;
    let mapped = offeredAgentsList.map((offeredAgents) => offeredAgents.agentType);
    if (subagentType === undefined && !isGeneralPurposeAgentAvailable(activeAgents, allowedAgentTypes)) {
      logEvent("tengu_subagent_type_miss", {
        requestedNormalized: lit("OMITTED"),
        availableCount: offeredAgentsList.length,
      });
      logFeatureBad("subagent_launch", "subagent_type_missing");
      let F = available && getForkPreconditionError(Jt) === null ? [FORK, ...mapped] : mapped;
      throw new AgentTypeError(`${SUBAGENT_TYPE_REQUIRED}. Available agents: ${formatAgentList(F)}`);
    }
    let requestedAgentType = subagentType ?? GENERAL_PURPOSE_AGENT.agentType;
    let found = offeredAgentsList.find((offeredAgents) => offeredAgents.agentType === requestedAgentType);
    if (!found) {
      let normalizedType = normalizeAgentName(requestedAgentType);
      let L = new Set(mapped);
      let normalizedMatches = normalizedType
        ? activeAgents.filter((activeAgent) => normalizeAgentName(activeAgent.agentType) === normalizedType)
        : [];
      let requestedNormalized = agentTypeForAnalytics_GATE_EVALUATED(
        normalizedType,
        normalizedMatches.length > 0 && normalizedMatches.every(isBuiltInAgent),
      );
      let requestedLength = normalizedType.length;
      if (normalizedMatches.length > 1) {
        logEvent("tengu_subagent_type_miss", {
          requestedNormalized,
          requestedLength,
          availableCount: offeredAgentsList.length,
          ambiguousCount: normalizedMatches.length,
        });
        logFeatureBad("subagent_launch", "subagent_type_ambiguous");
        let filtered = normalizedMatches
          .map((normalizedMatch) => normalizedMatch.agentType)
          .filter((B) => L.has(B));
        throw new AgentTypeError(
          `Agent type '${requestedAgentType}' is ambiguous \u2014 matches ${normalizedMatches.map((normalizedMatch) => (L.has(normalizedMatch.agentType) ? normalizedMatch.agentType : `${normalizedMatch.agentType} (unavailable)`)).join(", ")}. ${filtered.length > 0 ? `Use the exact name: ${filtered.join(" or ")}` : `None of these are available. Available agents: ${formatAgentList(mapped)}`}`,
        );
      }
      if (normalizedMatches.length === 1) {
        let V = normalizedMatches[0];
        if (L.has(V.agentType)) {
          found = V;
          if (found.color) setAgentColor(requestedAgentType, found.color);
          logEvent("tengu_subagent_type_normalized", {
            requestedNormalized,
            matched: agentTypeForAnalyticsFromDefinition(found),
          });
        } else {
          let agentType = V.agentType;
          let denyRuleWithContent = findDenyRuleWithContent(permissionContext, AGENT, agentType);
          if (denyRuleWithContent) {
            logFeatureBad("subagent_launch", "subagent_type_denied");
            throw new AgentTypeError(
              `Agent type '${agentType}' has been denied by permission rule '${AGENT}(${agentType})' from ${denyRuleWithContent.source}.`,
            );
          }
          if (isAgentToolPoolDenied(V, permissionContext)) {
            logFeatureBad("subagent_launch", "subagent_type_tools_denied");
            throw new AgentTypeError(agentToolPoolDeniedMessage(agentType));
          }
        }
      }
      if (!found) {
        logEvent("tengu_subagent_type_miss", {
          requestedNormalized,
          requestedLength,
          availableCount: offeredAgentsList.length,
        });
        logFeatureBad("subagent_launch", "subagent_type_not_found");
        throw new AgentTypeError(
          `Agent type '${requestedAgentType}' not found. Available agents: ${formatAgentList(mapped)}`,
        );
      }
    }
    let listedAgentDefinition = await loadListedAgentDefinition(found, toolUseContext.abortController.signal);
    if (listedAgentDefinition === undefined) {
      logFeatureBad("subagent_launch", "subagent_plugin_load_failed");
      throw new AgentTypeError(`Agent type '${requestedAgentType}' could not be loaded from its plugin.`);
    }
    selectedAgent = listedAgentDefinition;
  }
  if (callerIsInProcessTeammate && selectedAgent.background === true) {
    logFeatureBad("subagent_launch", "subagent_teammate_background_denied");
    throw new AgentPreconditionError(
      `In-process teammates cannot spawn background agents. Agent '${selectedAgent.agentType}' has background: true in its definition.`,
    );
  }
  if ((isolation ?? selectedAgent.isolation) === "worktree" && !isWebFetchAgent(selectedAgent)) {
    refuseUnavailableWorktree("agent worktree");
    if (!canRunAgentInWorktree()) throwAgentWorktreeNotGitRefusal();
  }
  let en = isCoordinatorMode_2();
  let tn = isForkSubagentEnabled();
  let nn =
    tn &&
    toolUseContext.agentId !== undefined &&
    !toolUseContext.innerCall &&
    !callerIsInProcessTeammate &&
    getIsNonInteractiveSession();
  let rn = tn && forkGateForcesBackground() && !callerIsInProcessTeammate && !nn;
  let backgroundTasksAvailable = isForegroundAgentMoveOff();
  let backgroundLaunchGate = getBackgroundLaunchRule();
  let backgroundByDefault = isBackgroundLaunchByDefault();
  let an =
    backgroundLaunchGate !== undefined &&
    (runInBackground === true || (backgroundByDefault && runInBackground !== false)) &&
    !isBackgroundAgentLaunchDisabled()
      ? getBackgroundedToolUseId(assistantMessage, toolUseContext.toolUseId, backgroundByDefault)
      : undefined;
  let backgroundHandoff =
    backgroundLaunchGate !== undefined && an !== undefined
      ? runBackgroundLaunchRules(backgroundLaunchGate, {
          toolUseId: an,
          callerAgentId: toolUseContext.agentId,
          signal: toolUseContext.abortController.signal,
        })
      : undefined;
  let backgroundTasksDisabled =
    backgroundLaunchGate === undefined ? backgroundTasksAvailable : backgroundHandoff === undefined;
  let un = autoBackgroundMsForLaunch(backgroundLaunchGate, backgroundTasksAvailable);
  let dn = (agent, wantsBackground) =>
    decideAgentLaunchMode({
      agent,
      wantsBackground,
      isolation,
      restricted: permissionContext.restricted,
      isCoordinator: en,
      forceAsync: rn,
      callerIsInProcessTeammate,
      callerIsHeadlessSubagent: nn,
      backgroundTasksDisabled,
    });
  let { effectiveIsolation, isRemoteLaunch, shouldRunAsync } = dn(selectedAgent, runInBackground);
  if (!isRemoteLaunch) {
    if (toolUseContext.abortController.signal.aborted) {
      let w = unwrapAbortReason(toolUseContext.abortController.signal.reason);
      if (!(shouldRunAsync && w === "interrupt")) throw new AbortError();
    }
    let r = checkSubagentConcurrencyLimit(toolUseContext);
    if (r) throw r;
  }
  assertCanLaunch(shouldRunAsync && !isRemoteLaunch);
  let requiredMcpServers = selectedAgent.requiredMcpServers;
  let filtered = toolUseContext.options.tools.filter(isMcpTool);
  let ln = () => toolUseContext.getAppState().mcp;
  let so = timing?.mark("external");
  if (requiredMcpServers?.length) {
    let r = (w) =>
      requiredMcpServers.some((requiredMcpServer) =>
        w.name.toLowerCase().includes(requiredMcpServer.toLowerCase()),
      );
    await waitForMcpClients(ln, (w, R) => r(w) && isPendingServerWithoutTools(w, R.tools), {
      maxWaitMs: 30000,
      until: (w) => w.clients.some((client) => client.type === "failed" && r(client)),
    });
  }
  if (!isRemoteLaunch) await waitForCoordinatorSubagentMcpServers(ln);
  so?.();
  let appState_2 = toolUseContext.getAppState();
  if (requiredMcpServers?.length) {
    let availableServers = [];
    for (let tool of appState_2.mcp.tools.concat(filtered)) {
      let mcpServerNameOfTool = getMcpServerNameOfTool(tool);
      if (mcpServerNameOfTool && !availableServers.includes(mcpServerNameOfTool))
        availableServers.push(mcpServerNameOfTool);
    }
    if (!hasRequiredMcpServers(selectedAgent, availableServers)) {
      let filtered = requiredMcpServers.filter(
        (pattern) => !availableServers.some((server) => server.toLowerCase().includes(pattern.toLowerCase())),
      );
      logFeatureBad("subagent_launch", "subagent_mcp_required_missing");
      throw tagObject(
        new AgentPreconditionError(
          `Agent '${selectedAgent.agentType}' requires MCP servers matching: ${filtered.join(", ")}. MCP servers with tools: ${availableServers.length > 0 ? availableServers.join(", ") : "none"}. Use /mcp to configure and authenticate the required MCP servers.`,
        ),
        {
          kind: "mcp_required_missing",
          servers: filtered,
        },
      );
    }
  }
  if (selectedAgent.color) setAgentColor(selectedAgent.agentType, selectedAgent.color);
  let mainLoopModel = getMainLoopModel(toolUseContext);
  let spawnHookResult = await launchAgentsWithHooks({
    tool_use_id: toolUseContext.toolUseId ?? "",
    prompt: agentPrompt,
    description: agentDescription,
    agent: selectedAgent,
    agents,
    model: isForkLaunch ? undefined : requestedModel,
    parentModel: mainLoopModel,
    parentAgentId: toolUseContext.agentId,
    permissionMode: mode,
    background: shouldRunAsync,
    fork: isForkLaunch,
    name: teammateName,
    cwd: agentCwd,
    signal: toolUseContext.abortController.signal,
    origin: toolUseContext.hookOrigin,
  });
  using starting = spawnHookResult.starting;
  if (isAbortedNotByInterrupt(toolUseContext.abortController.signal, shouldRunAsync && !isRemoteLaunch))
    throw new AbortError();
  if (spawnHookResult.deny !== undefined) {
    logFeatureBad("subagent_launch", "subagent_spawn_denied_by_hook");
    throw new AgentPreconditionError(`Subagent spawn denied by a plugin: ${spawnHookResult.deny}`);
  }
  rebaseHookOriginForAgent(
    {
      toolUseContext,
    },
    spawnHookResult.isRewritten,
  );
  let cn = () =>
    toSpawnHookInput(agentInput, {
      prompt: agentPrompt,
      description: agentDescription,
      subagentType: selectedAgent.agentType,
      model: isForkLaunch ? undefined : requestedModel,
      background: shouldRunAsync,
      cwd: agentCwd,
    });
  let raised = cn();
  let { spawn } = spawnHookResult;
  let agentRetypedByHook = spawnHookResult.agent !== selectedAgent;
  let launchShapeChanged = agentRetypedByHook || spawn.background !== shouldRunAsync;
  selectedAgent = spawnHookResult.agent;
  agentPrompt = spawn.prompt;
  agentDescription = spawn.description.replace(/\s+/g, " ").trim();
  agentCwd = spawn.cwd;
  if (agentCwd !== cwd) await assertAgentCwdAllowed(agentCwd, "a hook");
  requestedModel = spawn.model;
  if (launchShapeChanged)
    ({ effectiveIsolation, isRemoteLaunch, shouldRunAsync } = dn(selectedAgent, spawn.background));
  if (agentRetypedByHook && isUnreviewedWebFetchDispatch(toolUseContext)) {
    logFeatureBad("subagent_launch", "subagent_spawn_hook_retype_unreviewed");
    throw new AgentPreconditionError(
      "A plugin's agent.spawn hook named another agent for a web-fetch dispatch admitted without classifier review; it cannot run unconfined. Dispatch that agent directly.",
    );
  }
  let Ot = await checkSpawnHookRewrite({
    tool: AgentTool,
    raised,
    rewritten: cn(),
    context: toolUseContext,
  });
  if (Ot) {
    logFeatureBad("subagent_launch", "subagent_spawn_hook_rewrite_ruled");
    throw new AgentPreconditionError(
      `A plugin's agent.spawn hook rewrote this spawn into one a permission rule ${RULE_BEHAVIOR_VERB[Ot.behavior]}: ${Ot.message} Dispatch it directly.`,
    );
  }
  if (spawn.cwd !== undefined && spawn.cwd !== cwd && effectiveIsolation === "worktree") {
    logFeatureBad("subagent_launch", "subagent_spawn_hook_cwd_worktree");
    throw new AgentPreconditionError(
      `A plugin's agent.spawn hook set cwd on a spawn isolated in a worktree; cwd and isolation: "worktree" are mutually exclusive.`,
    );
  }
  if (
    launchShapeChanged &&
    isAbortedNotByInterrupt(toolUseContext.abortController.signal, shouldRunAsync && !isRemoteLaunch)
  )
    throw new AbortError();
  if (launchShapeChanged && callerIsInProcessTeammate && shouldRunAsync && !isRemoteLaunch) {
    logFeatureBad("subagent_launch", "subagent_teammate_background_denied");
    throw new AgentPreconditionError(
      "In-process teammates cannot spawn background agents; a plugin's agent.spawn hook backgrounded this one.",
    );
  }
  let servers = agentRetypedByHook
    ? hasRequiredMcpServers_2(selectedAgent, [...toolUseContext.getAppState().mcp.tools, ...filtered])
    : [];
  if (servers.length > 0) {
    logFeatureBad("subagent_launch", "subagent_mcp_required_missing");
    throw tagObject(new AgentPreconditionError(formatSpawnHookMcpMissing(selectedAgent.agentType, servers)), {
      kind: "mcp_required_missing",
      servers,
    });
  }
  let color = agentRetypedByHook ? selectedAgent.color : undefined;
  if (color) setAgentColor(selectedAgent.agentType, color);
  let modelParam = isForkLaunch ? "inherit" : requestedModel;
  let resolvedModel = getAgentModel(
    getExploreAgentModel(selectedAgent, mainLoopModel),
    mainLoopModel,
    modelParam,
    mode,
  );
  if (!isForkLaunch && absoluteEffort !== undefined)
    selectedAgent = {
      ...selectedAgent,
      effort: absoluteEffort,
    };
  let effortPlan = isRemoteLaunch
    ? undefined
    : resolveSubagentEffort({
        agentDefinition: selectedAgent,
        isFork: isForkLaunch,
        model: resolvedModel,
        effortState: toolUseContext.getAppState(),
        inheritedLayers: toolUseContext.permissionLayers,
        recordedBudgetText: undefined,
      });
  let st =
    relativeEffort !== undefined && !isForkLaunch && effortPlan?.subagentEffort !== undefined
      ? findAdjacentEffortLevel(
          resolvedModel,
          effortPlan.subagentEffort,
          relativeEffort === "higher" ? 1 : -1,
        )
      : undefined;
  let effortBudgetPlan =
    effortPlan !== undefined && st !== undefined
      ? {
          ...effortPlan,
          agentDefinition: {
            ...effortPlan.agentDefinition,
            effort: st,
          },
          subagentEffort: st,
        }
      : effortPlan;
  let effectiveEffort = isForkLaunch ? undefined : (st ?? absoluteEffort);
  selectedAgent = effortBudgetPlan?.agentDefinition ?? selectedAgent;
  let agentTypeForTelemetry = agentTypeForAnalyticsFromDefinition(selectedAgent);
  toolUseContext.agentLifecycle.markTypeInvoked(selectedAgent.agentType);
  let primedAgentMemory = await readAgentMemoryScope(selectedAgent, toolUseContext.storageV5);
  let systemPrompt = selectedAgent.getSystemPrompt({
    toolUseContext,
    primedAgentMemory,
  });
  let pluginIdentifier = isPluginAgent(selectedAgent)
    ? parsePluginIdentifier_2(selectedAgent.plugin)
    : undefined;
  if (isPluginAgent(selectedAgent)) recordPluginUsage(selectedAgent.plugin);
  let agentDepth_2 = getAgentDepth(toolUseContext.agentContext) + 1;
  if (isPluginAgent(selectedAgent))
    recordPluginActivity(selectedAgent.plugin, "subagent", {
      kind: "agent",
      name: selectedAgent.filename,
    });
  let pn = () => {
    logEvent("tengu_agent_tool_selected", {
      agent_type: agentTypeForTelemetry,
      model: telemetrySafeModelName(resolvedModel),
      source: fromEnum(selectedAgent.source),
      color: fromEnumOpt(selectedAgent.color),
      is_built_in_agent: isBuiltInAgent(selectedAgent),
      is_resume: false,
      is_async: shouldRunAsync,
      is_fork: isForkLaunch,
      effort_param: fromEnumOpt(relativeEffort ?? absoluteEffort),
      session_effort: fromEnumOpt(effortBudgetPlan?.sessionEffort),
      subagent_effort: fromEnumOpt(effortBudgetPlan?.subagentEffort),
      subagent_total_tokens_budget: effortBudgetPlan?.totalTokensBudget,
      subagent_budget_on_top_of_start:
        effortBudgetPlan?.totalTokensBudget === undefined ? undefined : effortBudgetPlan.isBudgetOnTopOfStart,
      agent_depth: agentDepth_2,
      agent_system_prompt_chars: systemPrompt.length,
      ...(pluginIdentifier && buildPluginEventFields(pluginIdentifier.name, pluginIdentifier.marketplace)),
    });
    return spawnStatsSlots.of(toolUseContext.session).recordSpawn({
      agentType: selectedAgent.agentType,
      runInBackground,
      runsInBackground: shouldRunAsync,
      depth: agentDepth_2,
    });
  };
  if (isRemoteLaunch) {
    if (isPersonalConfigRestricted()) {
      logFeatureBad("subagent_launch", "subagent_remote_personal_config");
      throw new RemoteAgentPreconditionError(REMOTE_AGENT_RESTRICTED_CONFIG_ERROR);
    }
    let r = await checkRemoteSessionEligibility({
      storageV5: toolUseContext.storageV5,
      credentials: toolUseContext.credentials,
    });
    if (!r.eligible) {
      let joined = r.errors.map(formatPreconditionError).join(`
`);
      logFeatureBad("subagent_launch", "subagent_remote_ineligible");
      let q = new RemoteAgentPreconditionError(`Cannot launch cloud agent:
${joined}`);
      throw r.errors.some((error) => error.type === "not_logged_in" && error.message === undefined)
        ? tagObject(
            q,
            authExpiredBlockFor(await getClaudeAIOAuthTokenOriginAsync(toolUseContext.credentials)),
          )
        : q;
    }
    let w;
    let R = false;
    let G = await teleportToRemote({
      initialMessage: agentPrompt,
      source: "remote_agent",
      tags: [WORKFLOW_REMOTE_AGENT],
      description: agentDescription,
      model: resolvedModel,
      ...resolveProactivityOptions(
        resolveSubagentPermissionMode({
          declaredMode: selectedAgent.permissionMode,
          narrowOnly: takesNarrowingModeOnly(selectedAgent),
          parentMode: mode,
          parentModeToHand: cycleAllTeammateModes(
            mode,
            appState.proactivityLevel,
            hasLeftProactivityBaseline(permissionContext),
          ),
          model: resolvedModel,
        }),
        appState.proactivityLevel,
      ),
      branchName: await getPushedBranchForRemoteAgent(),
      signal: toolUseContext.abortController.signal,
      onBundleFail: (E) => {
        w = E;
      },
      onCreateFail: (E, q, ee) => {
        w = E;
        R = q === "no_access_token" || ee?.status === 401;
      },
      storageV5: toolUseContext.storageV5,
      credentials: toolUseContext.credentials,
    });
    if (!G) {
      logFeatureBad("subagent_launch", "subagent_remote_session_failed");
      let E = new RemoteAgentPreconditionError(w ?? "Failed to create cloud session");
      throw R
        ? tagObject(
            E,
            authExpiredBlockFor(await getClaudeAIOAuthTokenOriginAsync(toolUseContext.credentials)),
          )
        : E;
    }
    let { taskId, sessionId } = registerRemoteAgentTask({
      remoteTaskType: "remote-agent",
      session: {
        id: G.id,
        title: G.title || agentDescription,
      },
      command: agentPrompt,
      context: toolUseContext,
      toolUseId: toolUseContext.toolUseId,
      permissionRelay: {
        canUseTool,
        toolUseContext,
        allowedToolNames: new Set(
          resolveAgentTools(
            selectedAgent,
            toolUseContext.options.tools,
            false,
            false,
            false,
            0,
            memoryModeForSession(toolUseContext).mode,
          ).resolvedTools.map((resolvedTool) => resolvedTool.name),
        ),
      },
    });
    pn();
    logEvent("tengu_agent_tool_remote_launched", {
      agent_type: agentTypeForTelemetry,
    });
    logFeatureOk("subagent_launch");
    let data = {
      status: "remote_launched",
      taskId,
      sessionUrl: remoteSessionUrl(sessionId),
      description: agentDescription,
      prompt: agentPrompt,
      outputFile: getTaskOutputPath(taskId),
    };
    starting?.started({
      agentId: taskId,
      model: resolvedModel,
    });
    return {
      data,
    };
  }
  let agentSystemPrompt;
  let forkSystemPrompt;
  let promptMessages;
  let inheritedAttachments;
  if (isForkLaunch) {
    if (toolUseContext.renderedSystemPrompt) forkSystemPrompt = toolUseContext.renderedSystemPrompt;
    else {
      let mainThreadAgentDefinition = appState.agent
        ? appState.agentDefinitions.activeAgents.find(
            (activeAgent) => activeAgent.agentType === appState.agent,
          )
        : undefined;
      let defaultSystemPrompt = await getSystemPrompt(
        toolUseContext.options.tools,
        toolUseContext.options.mainLoopModel,
      );
      forkSystemPrompt = effectiveSystemPromptText({
        mainThreadAgentDefinition,
        toolUseContext,
        customSystemPrompt: toolUseContext.options.customSystemPrompt,
        defaultSystemPrompt,
        appendSystemPrompt: toolUseContext.options.appendSystemPrompt,
      });
    }
    promptMessages = buildForkedMessages(
      agentPrompt,
      assistantMessage,
      enclosingToolUseId ?? toolUseContext.toolUseId,
    );
  } else {
    try {
      if (selectedAgent.memory)
        logEvent("tengu_agent_memory_loaded", {
          ...false,
          scope: fromEnum(selectedAgent.memory),
          source: lit("subagent"),
        });
      agentSystemPrompt = await buildSubagentNotesSection(
        [isBuiltInAgent(selectedAgent) ? applyPromptAblation(systemPrompt) : systemPrompt],
        resolvedModel,
        effortBudgetPlan?.totalTokensBudget,
      );
    } catch (error) {
      logForDebugging(
        `Failed to get system prompt for agent ${selectedAgent.agentType}: ${errorMessage(error)}`,
      );
    }
    inheritedAttachments = buildForwardedTurnsForAgent(
      toolUseContext.messages,
      forwardProjectsOwnerRows(toolUseContext),
    );
    promptMessages = [
      ...inheritedAttachments.copies,
      createUserMessage({
        content: agentPrompt,
      }),
    ];
  }
  let ownerAgentId = resolveVisibleSubagentId(toolUseContext.agentId, taskRegistry) ?? mainAgentId();
  let agentMetadata = {
    prompt: agentPrompt,
    resolvedAgentModel: resolvedModel,
    isBuiltInAgent: isBuiltInAgent(selectedAgent),
    startTime,
    agentType: selectedAgent.agentType,
    isAsync: shouldRunAsync,
    agentDepth: agentDepth_2,
    source: selectedAgent.source,
    pluginId: pluginIdentifier,
    callerCanContinueAgents: getOwnToolSurface(toolUseContext, ownerAgentId),
    persistedToolResultFiles: isWebFetchAgent(selectedAgent) ? defaultToolResultsStorage() : undefined,
  };
  let lo = assembleAgentToolPool(
    toolUseContext,
    permissionContext,
    toolUseContext.getAppState().mcp.tools.concat(filtered),
  );
  let agentId = toolUseContext.agentId ?? MAIN_OBSERVED_KEY;
  let observerPairing = selectedAgent.observer
    ? resolveObserverDeclaration({
        observedDefinition: selectedAgent,
        activeAgents: toolUseContext.options.agentDefinitions.activeAgents,
        observedIsObserver: false,
      })
    : shouldFanOutObserver({
        parentPairing: pairingForObserver(toolUseContext.session, agentId),
        spawnedDefinition: selectedAgent,
        spawnedIsObserver: false,
      });
  let fn = observerPairing?.inheritedArming
    ? {
        toolUseContext: observerPairing.inheritedArming.toolUseContext,
        canUseTool: observerPairing.inheritedArming.canUseTool,
        persistedArmingMode: observerPairing.inheritedArming.permissionMode,
        inheritedFromKey: agentId,
        inheritedFromPairing: observerPairing.inheritedArming.parentPairing,
      }
    : {
        toolUseContext,
        canUseTool,
      };
  let newAgentId = makeSaltedName();
  let parentAgentId = toolUseContext.agentId;
  let isBackgroundAgent =
    toolUseContext.agentContext !== undefined &&
    toolUseContext.agentContext.agentType !== "main" &&
    (toolUseContext.agentContext.isBackgroundAgent ?? false);
  let hn = isDelegatedObservationContext(toolUseContext.agentContext);
  let parentPromptId = promptIdForRequest(toolUseContext.messages, toolUseContext.agentContext);
  let agentWorktree = null;
  if (effectiveIsolation === "worktree") {
    let r = timing?.mark("external");
    agentWorktree = await createAgentWorktree(agentSkillName(newAgentId), {
      storageV5: toolUseContext.storageV5,
      credentials: toolUseContext.credentials,
    });
    r?.();
    if (agentWorktree.hookBased) {
      let worktreePath = agentWorktree.worktreePath;
      agentWorktree.vettedRealPath = await realpath(worktreePath).catch((error) => {
        logForDebugging(
          `Agent worktree ${worktreePath} could not be resolved after creation (${errorMessage(error)}); it will be kept at cleanup`,
          {
            level: "warn",
          },
        );
        return;
      });
    }
    recordSpawnedAgentIsolation(newAgentId);
  }
  if (isForkLaunch && agentWorktree)
    promptMessages.push(
      createUserMessage({
        content: buildWorktreeNotice(getCwd(), agentWorktree.worktreePath),
      }),
    );
  let wn = hasConcurrentEditingAgentInCwd({
    taskRegistry,
    selectedAgent,
    effectiveIsolation,
    cwd: agentCwd,
    parentCwd: toolUseContext.session.project === null ? null : getCwd(),
    parentAgentId,
  });
  if (wn)
    promptMessages.push(
      createUserMessage({
        content: CONCURRENT_WRITE_AGENT_WARNING,
      }),
    );
  if (isForkLaunch && effortBudgetPlan?.totalTokensBudget !== undefined)
    promptMessages.push(
      createAttachmentMessage({
        type: "total_tokens_reminder",
        text: formatTotalTokensTag("padded-countdown", effortBudgetPlan.totalTokensBudget),
      }),
    );
  let _n = wn && canRunAgentInWorktree();
  let { onToolPool, reviewTools } = createDeferredReviewTools(toolUseContext.options.tools);
  let runAgentParams = {
    agentDefinition: selectedAgent,
    promptMessages,
    turnPrompt: agentPrompt,
    toolUseContext,
    canUseTool,
    name: teammateName,
    isAsync: shouldRunAsync,
    handbackOptIn: !isForkLaunch,
    handbackTool: ObserverReportTool,
    persistedToolResultFiles: agentMetadata.persistedToolResultFiles,
    querySource:
      toolUseContext.options.querySource ??
      getQuerySourceForAgent(selectedAgent.agentType, isBuiltInAgent(selectedAgent)),
    spawnedBySkill: toolUseContext.options.spawnedBySkill ?? toolUseContext.options.activeSkill,
    spawnedByForkedSkill: toolUseContext.options.spawnedByForkedSkill,
    model: modelParam,
    effort: effectiveEffort,
    ...(isUnreviewedWebFetchDispatch(toolUseContext) && {
      spawnMode: DONTASK,
    }),
    override: isForkLaunch
      ? {
          systemPrompt: forkSystemPrompt,
          parentSystemPrompt: true,
        }
      : agentSystemPrompt && !agentWorktree && !agentCwd
        ? {
            systemPrompt: asSystemPrompt(agentSystemPrompt),
          }
        : undefined,
    availableTools: isForkLaunch ? toolUseContext.options.tools : lo,
    assembleAvailableTools: (r) => assembleAgentToolPool(toolUseContext, permissionContext, r),
    onToolPool,
    forkContextMessages: isForkLaunch ? toolUseContext.messages : undefined,
    ...(isForkLaunch && {
      useExactTools: true,
    }),
    totalTokensReminderBudget: effortBudgetPlan?.totalTokensBudget,
    isTotalTokensReminderBudgetOnTopOfStart: effortBudgetPlan?.isBudgetOnTopOfStart,
    worktreePath: agentWorktree?.worktreePath,
    worktreeBranch: agentWorktree?.worktreeBranch,
    cwd: agentCwd,
    description: agentDescription,
    preserveToolUseResults: !getIsNonInteractiveSession(),
    toolUseId: toolUseContext.toolUseId,
    ...false,
    onMcpServersBlocked: (r, w) =>
      onProgress?.({
        type: "notification",
        notification: {
          key: `agent-mcp-blocked-${newAgentId}`,
          text: `${selectedAgent.agentType} agent MCP ${plural(r.length, "server")} blocked by ${w}: ${r.join(", ")}`,
          priority: "medium",
          color: "warning",
          timeoutMs: 1e4,
        },
      }),
    onModelRestricted: (r, w) =>
      onProgress?.({
        type: "notification",
        notification: {
          key: `agent-model-restricted-${selectedAgent.agentType}-${displayModelName(r)}`,
          text: `${selectedAgent.agentType} agent: ${formatModelRestrictedNotice(r, w)}`,
          priority: "medium",
          color: "warning",
          timeoutMs: 1e4,
        },
      }),
  };
  let kn = agentCwd ?? agentWorktree?.worktreePath;
  let cwd_2 = kn ?? (toolUseContext.agentWorktree !== undefined ? getCwd() : undefined);
  let Lt = toolUseContext.session.withProject({
    cwd: kn,
  });
  let project = Lt.project;
  let cleanupAgentWorktree = async () => {
    if (!agentWorktree) return {};
    let {
      worktreePath,
      worktreeBranch,
      headCommit,
      baseChangeset,
      sessionDir,
      gitRoot,
      hookBased,
      vettedRealPath,
    } = agentWorktree;
    agentWorktree = null;
    if (hookBased && (baseChangeset === undefined || vettedRealPath === undefined)) {
      logForDebugging(`Hook-based agent worktree kept at: ${worktreePath}`);
      return {
        worktreePath,
      };
    }
    if (isParkedOnChildWork(taskRegistry.get(newAgentId))) {
      logForDebugging(
        `Agent worktree kept at ${worktreePath}: backgrounded owner awaits keepalive, resume pending`,
      );
      return {
        worktreePath,
        worktreeBranch,
      };
    }
    if (headCommit || baseChangeset !== undefined) {
      let q = (isOccupying) =>
        findTaskOccupyingPath(
          taskRegistry.all(),
          vettedRealPath === undefined ? [worktreePath] : [worktreePath, vettedRealPath],
          isOccupying,
        );
      let ee = () => q() ?? q((task) => task.id !== newAgentId && isTaskStillOccupying(task, taskRegistry));
      let V = ee();
      let B = headCommit
        ? await hasWorktreeChanges(worktreePath, headCommit)
        : await getAgentWorktreeChanges(worktreePath, undefined, {
            hookBased: true,
            baseChangeset,
            sessionDir,
            vettedRealPath,
          }).then(
            (agentWorktreeChanges) =>
              agentWorktreeChanges.dirty || agentWorktreeChanges.checkoutMoved === true,
          );
      let ne = V ?? ee();
      if (ne) {
        logForDebugging(
          `Agent worktree ${worktreePath} is still the working directory of ${ne.type} task ${ne.id}; kept`,
        );
        logEvent("tengu_agent_worktree_kept", {
          reason: isTerminalTaskStatus(ne.status) ? lit("parked_task") : lit("live_task"),
          task_type: fromEnum(ne.type),
          seen: V ? lit("before_check") : lit("after_check"),
          changed: B,
        });
        if (gitRoot)
          watchWorktreeForRelease({
            worktreePath,
            gitRoot,
            taskRegistry,
            findOccupant: q,
          });
        return {
          worktreePath,
          worktreeBranch,
        };
      }
      if (
        !B &&
        (await removeAgentWorktree(worktreePath, worktreeBranch, gitRoot, hookBased ?? false, "agent_tool"))
          .outcome === "removed"
      ) {
        clearWorktreeFromAgentMetadata({
          agentId: identityAgentId2(newAgentId),
          removedWorktreePath: worktreePath,
          spawnMetadata: {
            agentType: selectedAgent.agentType,
            ...(selectedAgent.agentType === FORK && {
              isFork: isBuiltInAgent(selectedAgent),
            }),
            ...(selectedAgent.agentType === WEB_FETCH_AGENT && {
              isBuiltIn: isBuiltInAgent(selectedAgent),
            }),
            ...(agentCwd && {
              cwd: agentCwd,
            }),
            description: agentDescription,
            ...(teammateName && {
              name: teammateName,
            }),
            ...(toolUseContext.toolUseId && {
              toolUseId: toolUseContext.toolUseId,
            }),
            spawnDepth: agentDepth_2,
            ...spawnRequestShape(shouldRunAsync, toolUseContext.options.isNonInteractiveSession),
            ...(modelParam && {
              model: modelParam,
            }),
            ...(effectiveEffort && {
              effort: effectiveEffort,
            }),
          },
          storageV5: toolUseContext.storageV5,
        }).catch((error) =>
          logForDebugging(`Failed to clear worktree metadata: ${describeStorageError(error)}`),
        );
        return {};
      }
    }
    if (gitRoot) await unlockAgentWorktree(worktreePath, gitRoot);
    logForDebugging(`Agent worktree kept at: ${worktreePath}`);
    return {
      worktreePath,
      worktreeBranch,
    };
  };
  if (toolUseContext.abortController.signal.aborted) {
    let r = unwrapAbortReason(toolUseContext.abortController.signal.reason);
    if (!(shouldRunAsync && r === "interrupt")) {
      await cleanupAgentWorktree();
      throw new AbortError();
    }
  }
  if (project === null && hasOutermostCallFrame()) {
    logFeatureBad("subagent_launch", "subagent_no_directory_in_cwd_scope");
    throw new AgentPreconditionError(
      "A subagent cannot be started from here in this session. Do the task without a subagent.",
    );
  }
  let releaseConcurrencySlot = await oo();
  if (backgroundLaunchGate !== undefined && shouldRunAsync) {
    let r =
      backgroundHandoff === undefined
        ? {
            kind: "closed",
            message: backgroundLaunchRuleText(backgroundByDefault),
          }
        : backgroundHandoff.confirm(toolUseContext.abortController.signal);
    if (r !== undefined) {
      releaseConcurrencySlot();
      await cleanupAgentWorktree();
      if (r.kind === "aborted") throw new AbortError();
      logFeatureBad("subagent_launch", "subagent_background_launch_closed");
      throw new AgentPreconditionError(r.message);
    }
  }
  let spawnTelemetry = pn();
  agentMetadata.spawnedSubagent = spawnTelemetry;
  let Sn = () => {
    if (inheritedAttachments !== undefined)
      recordTurnsDeliveredDirect(
        {
          agentId: newAgentId,
          deliveringLoop: toolUseContext.agentId,
        },
        inheritedAttachments,
      );
  };
  let Bt = async (r) => {
    try {
      return await r;
    } catch (error) {
      releaseConcurrencySlot();
      throw error;
    }
  };
  let vn =
    backgroundHandoff !== undefined && teammateName && teammateName !== MAIN
      ? toolUseContext.getAppState().agentNameRegistry.get(teammateName)
      : undefined;
  if (teammateName && teammateName !== MAIN)
    toolUseContext.agentLifecycle.registerName(teammateName, identityAgentId2(newAgentId));
  let displayName = teammateName && teammateName !== MAIN ? teammateName : undefined;
  getTaskRunState().agentSpawned.emit({
    agentId: newAgentId,
    agentType: selectedAgent.agentType,
    parentAgentId,
    taskRegistry,
  });
  let launchedWithDefaults = modelParam === undefined && !isHookOrPluginSteered(toolUseContext);
  let launchModel = isForkLaunch || isHookOrPluginSteered(toolUseContext) ? undefined : modelParam;
  if (shouldRunAsync) {
    let r = newAgentId;
    let w = registerAsyncAgent({
      outputFileReadable: willToolsLoseSessionState(toolUseContext.options.tools),
      ownerCanContinueAgents: agentMetadata.callerCanContinueAgents,
      agentId: r,
      ownerAgentId,
      parentAgentId,
      spawnDepth: agentDepth_2,
      launchedWithDefaults,
      launchModel,
      description: agentDescription,
      prompt: agentPrompt,
      model: resolvedModel,
      selectedAgent,
      taskRegistry,
      toolUseId: toolUseContext.toolUseId,
      cwd: cwd_2,
      spawnedSubagent: spawnTelemetry,
      sessionScratch: toolUseContext.session.sessionScratch,
    });
    if (
      backgroundHandoff !== undefined &&
      !backgroundHandoff.handOver({
        agentId: w.agentId,
        abortController: w.abortController,
      })
    ) {
      killAsyncAgent(w.agentId, taskRegistry, "system", undefined, {
        lifecycleNotStarted: true,
      });
      releaseConcurrencySlot();
      markAgentNotified(w.agentId, taskRegistry);
      if (teammateName && vn !== undefined) toolUseContext.agentLifecycle.registerName(teammateName, vn);
      await cleanupAgentWorktree();
      logFeatureBad("subagent_launch", "subagent_background_launch_not_taken");
      throw new AgentPreconditionError(backgroundLaunchRuleText(backgroundByDefault));
    }
    if (!getIsNonInteractiveSession()) addAgentKeepaliveReason(ownerAgentId, `agent:${r}`, taskRegistry);
    if (
      isZincHarborOn() &&
      !getIsNonInteractiveSession() &&
      (!teammateName || teammateName === MAIN) &&
      !FAST_BUILTIN_AGENTS.has(selectedAgent.agentType)
    ) {
      let P = toolUseContext.agentLifecycle.allocateName(selectedAgent.agentType);
      toolUseContext.agentLifecycle.registerName(P, identityAgentId2(r));
      displayName = P;
    }
    if (observerPairing)
      await Bt(
        armObserver({
          observedKey: r,
          observedTaskId: r,
          observedName: displayName ?? teammateName ?? selectedAgent.agentType,
          observedAgentType: selectedAgent.agentType,
          config: observerPairing,
          ...fn,
        }),
      );
    let R = {
      agentId: r,
      parentAgentId,
      depth: agentDepth_2,
      ...(alwaysFalse(toolUseContext) && {
        spawnedByMainThread: true,
      }),
      parentSessionId: getParentSessionId(),
      agentType: "subagent",
      subagentName: selectedAgent.agentType,
      displayName,
      isAsync: true,
      isBackgroundAgent: true,
      ...(hn && {
        delegatedObservation: true,
      }),
      isBuiltIn: isBuiltInAgent(selectedAgent),
      ...(isForkLaunch &&
        isMainConversationContext(toolUseContext.agentContext) && {
          forkOfMainConversation: true,
        }),
      invokingRequestId: assistantMessage?.requestId,
      invocationKind: "spawn",
      invocationEmitted: false,
      parentPromptId,
      ...getWorkflowRunFields(toolUseContext.agentContext),
    };
    agentMetadata.agentContext = R;
    runWithCwdOverride(R, () =>
      withCallFrameCwd(project, () =>
        runAsyncAgentLifecycle({
          taskId: w.agentId,
          abortController: w.abortController,
          makeStream: (onCacheSafeParams, onQueryProgress, onStreamTokenEstimate) =>
            runAgent({
              ...runAgentParams,
              launchedWithDefaults,
              session: Lt,
              override: {
                ...runAgentParams.override,
                agentId: identityAgentId2(w.agentId),
                agentContext: R,
                abortController: w.abortController,
              },
              onCacheSafeParams,
              onQueryProgress,
              onStreamTokenEstimate,
            }),
          metadata: agentMetadata,
          description: agentDescription,
          toolUseContext,
          taskRegistry,
          agentIdForCleanup: r,
          reviewTools,
          enableSummarization:
            getSdkAgentProgressSummariesEnabled() || ((en || rn) && !getIsNonInteractiveSession()),
          getWorktreeResult: cleanupAgentWorktree,
          onRunSettled: releaseConcurrencySlot,
        }),
      ),
    );
    Sn();
    starting?.started({
      agentId: w.agentId,
      model: resolvedModel,
    });
    let canReadOutputFile =
      !isWebFetchAgent(selectedAgent) && willToolsLoseSessionState(toolUseContext.options.tools);
    logFeatureOk("subagent_launch");
    return {
      data: {
        isAsync: true,
        status: "async_launched",
        agentId: w.agentId,
        description: agentDescription,
        resolvedModel,
        prompt: agentPrompt,
        outputFile: w.outputFile ?? "",
        canReadOutputFile,
        canContinueAgent: hasSendMessageTool(toolUseContext.options.tools),
        ...(_n && {
          sharesCwd: true,
        }),
      },
    };
  } else {
    let r = identityAgentId2(newAgentId);
    let w = isIterativeHavenGateOn() || getBackgroundLaunchRule() !== undefined;
    let R = {
      agentId: r,
      parentAgentId,
      depth: agentDepth_2,
      ...(alwaysFalse(toolUseContext) && {
        spawnedByMainThread: true,
      }),
      parentSessionId: getParentSessionId(),
      agentType: "subagent",
      subagentName: selectedAgent.agentType,
      displayName,
      isAsync: false,
      isBackgroundAgent,
      ...(hn && {
        delegatedObservation: true,
      }),
      isBuiltIn: isBuiltInAgent(selectedAgent),
      ...(isForkLaunch &&
        isMainConversationContext(toolUseContext.agentContext) && {
          forkOfMainConversation: true,
        }),
      invokingRequestId: assistantMessage?.requestId,
      invocationKind: "spawn",
      invocationEmitted: false,
      parentPromptId,
      ...getWorkflowRunFields(toolUseContext.agentContext),
    };
    agentMetadata.agentContext = R;
    let G = runWithCwdOverride(R, () =>
      withCallFrameCwd(project, async () => {
        let now = Date.now();
        let resolvedModel_2 = resolvedModel;
        let L = appendModelIfChanged([], resolvedModel);
        if (promptMessages.length > 0) {
          let found = normalizeMessages(promptMessages).find((pe) => pe.type === "user");
          if (found && found.type === "user" && onProgress)
            onProgress({
              type: "progress",
              toolUseID: `agent_${assistantMessage.message.id}`,
              data: {
                message: found,
                type: "agent_progress",
                prompt: agentPrompt,
                agentId: r,
                agentType: selectedAgent.agentType,
                isBuiltIn: isBuiltInAgent(selectedAgent),
                description: agentDescription,
                resolvedModel: resolvedModel_2,
                modelsUsed: L,
              },
            });
        }
        let E = registerAgentForeground({
          outputFileReadable: willToolsLoseSessionState(toolUseContext.options.tools),
          ownerCanContinueAgents: agentMetadata.callerCanContinueAgents,
          agentId: r,
          ownerAgentId,
          parentAgentId,
          spawnDepth: agentDepth_2,
          description: agentDescription,
          prompt: agentPrompt,
          model: resolvedModel,
          selectedAgent,
          taskRegistry,
          parentAbortController: toolUseContext.abortController,
          toolUseId: toolUseContext.toolUseId,
          ...autoBackgroundOptions(backgroundLaunchGate, un),
          isDirectCall: !toolUseContext.innerCall && toolUseContext.hookCaller === undefined,
          cwd: cwd_2,
          spawnedSubagent: spawnTelemetry,
          ...(w && {
            launchedWithDefaults,
            launchModel,
          }),
        });
        let { taskId, cancelAutoBackground, abortController, detachParentAbortRelay } = E;
        if (observerPairing)
          await Bt(
            armObserver({
              observedKey: r,
              observedTaskId: r,
              observedName: teammateName ?? selectedAgent.agentType,
              observedAgentType: selectedAgent.agentType,
              config: observerPairing,
              ...fn,
            }),
          );
        let backgroundWait = {
          moved: false,
        };
        logFeatureOk("subagent_launch");
        let agentMessages = [];
        let forwardSubagentText = toolUseContext.options.forwardSubagentText;
        let ce;
        let ct = false;
        let onMessage = (message) => {
          if (backgroundWait.moved) return;
          if (message.type === "query_model_change") {
            resolvedModel_2 = message.toModel;
            L = appendModelIfChanged(L, message.toModel);
            return;
          }
          if (message.type === "spinner_mode") return;
          if (message.type !== "api_metrics" && message.type !== "set_in_progress_tool_use_ids")
            agentMessages.push(message);
          if (!onProgress) return;
          if (ce !== undefined && !(message.type === "system" && message.subtype === "api_error")) {
            ce = undefined;
            onProgress({
              type: "progress",
              toolUseID: `agent_${assistantMessage.message.id}`,
              data: {
                type: "agent_api_retry",
                resolved: true,
                agentId: r,
                agentType: selectedAgent.agentType,
              },
            });
          }
          if (message.type === "api_metrics") {
            onProgress(message);
            return;
          }
          if (message.type === "set_in_progress_tool_use_ids") return;
          if (
            message.type === "progress" &&
            (message.data.type === "bash_progress" || message.data.type === "powershell_progress")
          )
            onProgress({
              type: "progress",
              toolUseID: message.toolUseID,
              data: message.data,
            });
          if (message.type === "system" && message.subtype === "api_error") {
            let K = categorizeRetryableAPIError(message.error);
            let pe = `${message.source ?? "request_retry"}:${message.retryAttempt}:${message.maxRetries}:${K}`;
            if (pe !== ce) {
              ce = pe;
              onProgress({
                type: "progress",
                toolUseID: `agent_${assistantMessage.message.id}`,
                data: {
                  type: "agent_api_retry",
                  agentId: r,
                  agentType: selectedAgent.agentType,
                  attempt: message.retryAttempt,
                  maxRetries: message.maxRetries,
                  retryDelayMs: message.retryInMs,
                  errorStatus: message.error.status,
                  errorCategory: K,
                },
              });
            }
            return;
          }
          if (extractAgentIdsFromMessages_2(message)) {
            if (filterIncompleteToolCalls_2(toolUseContext, message))
              onProgress(createProgressMessage_2(message));
            return;
          }
          if (message.type !== "assistant" && message.type !== "user") return;
          if (message.type === "user" && message.isMeta && !ct) return;
          if (message.type === "assistant") ct = true;
          if (message.type === "assistant") {
            let assistantMessageContentLength = getAssistantMessageContentLength(message);
            if (assistantMessageContentLength > 0)
              onProgress({
                type: "response_length",
                op: "add",
                delta: assistantMessageContentLength,
              });
          }
          for (let K of normalizeMessages([message])) {
            let pe = K.message.content[0];
            if (!forwardSubagentText && pe.type !== "tool_use" && pe.type !== "tool_result") continue;
            onProgress({
              type: "progress",
              toolUseID: `agent_${assistantMessage.message.id}`,
              data: {
                message: K,
                type: "agent_progress",
                prompt: "",
                agentId: r,
                agentType: selectedAgent.agentType,
                isBuiltIn: isBuiltInAgent(selectedAgent),
                description: agentDescription,
                resolvedModel: resolvedModel_2,
                modelsUsed: L,
              },
            });
          }
        };
        let ge = backgroundTasksAvailable
          ? undefined
          : setTimeout(
              (k) => {
                if (k.toolUseId)
                  k.emitToolProgress?.({
                    kind: "background_hint",
                    toolUseId: k.toolUseId,
                  });
              },
              BACKGROUND_HINT_DELAY_MS,
              toolUseContext,
            );
        let pt = {};
        let getWorktreeResult = async () => {
          pt = await cleanupAgentWorktree();
          return pt;
        };
        starting?.started({
          agentId: r,
          model: resolvedModel,
        });
        timing?.mark("model");
        let mo = runAsyncAgentLifecycle({
          taskId,
          abortController,
          makeStream: (onCacheSafeParams, onQueryProgress, onStreamTokenEstimate) =>
            runAgent({
              ...runAgentParams,
              ...(w && {
                launchedWithDefaults,
              }),
              session: Lt,
              override: {
                ...runAgentParams.override,
                agentId: r,
                agentContext: R,
                abortController,
              },
              onCacheSafeParams,
              onQueryProgress,
              onStreamTokenEstimate,
            }),
          metadata: agentMetadata,
          description: agentDescription,
          toolUseContext,
          taskRegistry,
          agentIdForCleanup: r,
          reviewTools,
          enableSummarization: getSdkAgentProgressSummariesEnabled(),
          getWorktreeResult,
          onMessage,
          shouldNotifyOwner: () => backgroundWait.moved,
          onRunSettled: releaseConcurrencySlot,
        });
        Sn();
        let agentError;
        let In;
        try {
          let k;
          try {
            k = await raceAgentLaunch(mo, E.backgroundSignal, un);
          } catch (error) {
            k = "done";
            if (error instanceof AbortError) {
              let Xe = unwrapAbortReason(abortController.signal.reason) === "permission-stop";
              if (Xe) In = errorMessage(error);
              logEvent("tengu_agent_tool_terminated", {
                agent_type: agentTypeForTelemetry,
                model: telemetrySafeModelName(agentMetadata.resolvedAgentModel),
                final_model: telemetrySafeModelName(L.at(-1) ?? agentMetadata.resolvedAgentModel),
                model_swapped: L.length > 1,
                duration_ms: Date.now() - agentMetadata.startTime,
                is_async: false,
                is_built_in_agent: agentMetadata.isBuiltInAgent,
                agent_depth: agentMetadata.agentDepth,
                reason: Xe ? lit("permission_stop_sync") : lit("user_cancel_sync"),
              });
              if (!Xe) spawnTelemetry.killed("user");
              if (!(abortController.signal.aborted && !toolUseContext.abortController.signal.aborted))
                throw error;
              agentError = toError(error);
            } else {
              logForDebugging(`Sync agent error: ${errorMessage(error)}`, {
                level: "error",
              });
              agentError = toError(error);
            }
          }
          if (
            !agentError &&
            settleBackgroundedAgent({
              outcome: k,
              registration: E,
              wait: backgroundWait,
              ownerAgentId,
              taskRegistry,
              sessionScratch: toolUseContext.session.sessionScratch,
              agentTask: {
                armWorkerCheckinForBackgroundedAgent: recordWorkerCheckin,
                backgroundAgentTask: moveAgentToBackground,
                hasAgentChildKeepalive: hasChildAgents,
              },
            })
          ) {
            let canReadOutputFile =
              !isWebFetchAgent(selectedAgent) && willToolsLoseSessionState(toolUseContext.options.tools);
            return {
              data: {
                isAsync: true,
                status: "async_launched",
                agentId: taskId,
                description: agentDescription,
                resolvedModel: resolvedModel_2,
                ...(L.length > 1 && {
                  modelsUsed: [...L],
                }),
                prompt: agentPrompt,
                outputFile: E.outputFile ?? "",
                canReadOutputFile,
                canContinueAgent: hasSendMessageTool(toolUseContext.options.tools),
                ...(_n && {
                  sharesCwd: true,
                }),
              },
            };
          }
          let last = agentMessages.findLast(
            (agentMessage) => agentMessage.type !== "system" && agentMessage.type !== "progress",
          );
          if (last && isSyntheticMessage(last)) {
            logEvent("tengu_agent_tool_terminated", {
              agent_type: agentTypeForTelemetry,
              model: telemetrySafeModelName(agentMetadata.resolvedAgentModel),
              final_model: telemetrySafeModelName(L.at(-1) ?? agentMetadata.resolvedAgentModel),
              model_swapped: L.length > 1,
              duration_ms: Date.now() - agentMetadata.startTime,
              is_async: false,
              is_built_in_agent: agentMetadata.isBuiltInAgent,
              agent_depth: agentMetadata.agentDepth,
              reason: lit("user_cancel_sync"),
            });
            spawnTelemetry.cancelledAfterCompletion();
            throw new AbortError();
          }
          let cutoffNote;
          let zt = agentMessages;
          if (agentError) {
            let re;
            try {
              re = recoverFromSyncAgentError(agentError, agentMessages);
            } catch (error) {
              spawnTelemetry.failed();
              throw error;
            }
            cutoffNote = re.cutoffNote ?? In;
            zt = re.history;
            logForDebugging(`Sync agent recovering from error with ${zt.length} messages`);
          }
          let agentHandback = await buildAgentHandback(
            finalizeAgentTool(
              zt,
              r,
              {
                ...agentMetadata,
                modelsUsed: L,
              },
              {
                suppressTelemetry: !agentError,
                handback: getPendingHandbackReport(taskRegistry.get(r), r),
              },
            ),
            {
              agentId: r,
              agentMessages,
              agentType: agentTypeForTelemetry,
              child: isForkLaunch ? "fork" : "agent",
              cutoffNote,
              tools: reviewTools(),
              toolUseContext,
            },
          );
          return {
            data: {
              status: "completed",
              prompt: agentPrompt,
              ...agentHandback,
              ...pt,
              canContinueAgent: hasSendMessageTool(toolUseContext.options.tools),
            },
          };
        } finally {
          if (ge) clearTimeout(ge);
          if (toolUseContext.toolUseId)
            toolUseContext.emitToolProgress?.({
              kind: "clear",
              toolUseId: toolUseContext.toolUseId,
            });
          cancelAutoBackground?.();
          detachParentAbortRelay();
          if (!backgroundWait.moved) {
            forgetHandback(taskId);
            let k = taskRegistry.get(taskId);
            let progress = isLocalAgent(k) ? k.progress : undefined;
            unregisterAgentForeground(taskId, taskRegistry);
            emitTaskNotification(
              taskId,
              k?.status === "failed" ? "failed" : k?.status === "killed" ? "stopped" : "completed",
              {
                toolUseId: toolUseContext.toolUseId,
                summary: agentDescription,
                usage: {
                  total_tokens: progress?.tokenCount ?? 0,
                  tool_uses: progress?.toolUseCount ?? 0,
                  duration_ms: Date.now() - now,
                },
              },
            );
          }
        }
      }),
    );
    return Bt(G);
  }
}
//@ chunk-apw2zhyn.js:1372-1439 fingerprint = isBackgroundTasksDisabled (1)
/**
 * 后台任务是否被禁用：CLAUDE_CODE_DISABLE_BACKGROUND_TASKS 或 --bare 模式。
 */
function isBackgroundTasksDisabled() {
  return env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS || isBareMode();
}
//@ chunk-e6aww6q8.js:4709491-4709738 fingerprint = getAutoBackgroundMs (0.638)
/**
 * coordinator 模式或 CLAUDE_AUTO_BACKGROUND_TASKS 下解析 CLAUDE_CODE_WORKER_CHECKIN_SCHEDULE（逗号分隔秒数，1–86400）为毫秒数组。
 */
function getWorkerCheckinScheduleMs() {
  if (!isCoordinatorMode_2() && !env.CLAUDE_AUTO_BACKGROUND_TASKS) return;
  let mapped = env.CLAUDE_CODE_WORKER_CHECKIN_SCHEDULE?.split(",").map((n) => n.trim());
  if (!mapped?.every((n) => /^\d+$/.test(n) && Number(n) >= 1 && Number(n) <= 86400)) return;
  return mapped.map((n) => Number(n) * 1000);
}
export {
  agentOutputSchema,
  callAgentTool,
  tryAutoApproveWebFetchDispatch,
  isBackgroundTasksDisabled,
  getWorkerCheckinScheduleMs,
};
