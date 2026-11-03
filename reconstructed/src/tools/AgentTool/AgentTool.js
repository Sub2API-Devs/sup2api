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
  AGr,
  resolveAgentTools,
  runAsyncAgentLifecycle,
  appendModelIfChanged,
  recoverFromSyncAgentError,
  buildAgentHandback,
  finalizeAgentTool,
} from "./agentToolUtils.js";
import { T, o, u, A, M, Ue } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { R7e } from "../../tasks/taskState.js";
import { hW } from "../../utils/agentProcessRegistry.js";
import { isMainConversationsOwnCall } from "./resumeAgent.js";
import {
  ResumedAgentCallRegistry,
  resolveResumedAgentCall,
  isUnreviewedWebFetchDispatch,
} from "./agentContainerResume.js";
import { HM } from "../../services/compact/compactCarry.js";
import { hasSendMessageTool } from "../SendMessageTool/constants.js";
import { getToolPermissionContext, getMainLoopModel } from "../../utils/permissions/toolPermissionContext.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { getDynamicTeamContext, getParentSessionId } from "../../utils/teammate.js";
import { tH } from "../../plugins/functionHooks/inputHold.js";
import { normalizeAgentName, isWebFetchAgent, WEB_FETCH_AGENT } from "../WebFetchTool/harnessNotes.js";
import { FORK, AGENT, ecr, x5t } from "./constants.js";
import {
  findDenyRuleWithContent,
  getDispatchableAgents,
  isAgentToolPoolDenied,
  agentToolPoolDeniedMessage,
  hasLeftProactivityBaseline,
} from "../../utils/permissions/permissions.js";
import { unwrapAbortReason } from "../../utils/abortController.js";
import { AbortError, errorMessage, toError } from "../../utils/errors.js";
import { uN, ACe } from "../../cost-tracker.js";
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
  To,
  toSpawnHookInput,
  _o,
  getBackgroundedToolUseId,
  decideAgentLaunchMode,
  findTaskOccupyingPath,
  isTaskStillOccupying,
  watchWorktreeForRelease,
} from "./agentLaunchHelpers.js";
import { UIr } from "../../utils/swarm/teammateAgentIdentity.js";
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
  GKe,
  tLr,
  resolveSubagentPermissionMode,
  getPushedBranchForRemoteAgent,
  hasConcurrentEditingAgentInCwd,
  N8s,
  autoBackgroundOptions,
  raceAgentLaunch,
  settleBackgroundedAgent,
} from "./agentLaunch.js";
import {
  getIsNonInteractiveSession,
  mainAgentId,
  getSdkAgentProgressSummariesEnabled,
} from "../../bootstrap/state.js";
import { C4, VTn, isBackgroundAgentLaunchDisabled } from "./backgroundGates.js";
import { D0e, runBackgroundLaunchRules, bWr } from "../../tasks/backgroundLaunchRules.js";
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
import { bN } from "../../services/accountMemory/memoryContext.js";
import { ZCe } from "../../utils/background/remote/remoteSession.js";
import { getTaskOutputPath } from "../../utils/task/diskOutput.js";
import { getSystemPrompt, buildSubagentNotesSection } from "../../constants/prompts.js";
import { u6 } from "../../utils/systemPrompt.js";
import { applyPromptAblation } from "../../utils/api.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { buildForwardedTurnsForAgent, uki } from "../../utils/messageProvenance.js";
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
import { Ree } from "../../utils/mcpOutputStorage.js";
import {
  assembleAgentToolPool,
  rue,
  clearWorktreeFromAgentMetadata,
  spawnRequestShape,
  runAgent,
  filterIncompleteToolCalls_2,
} from "./runAgent.js";
import {
  MAIN_OBSERVED_KEY,
  resolveObserverDeclaration,
  shouldFanOutObserver,
  Wyt,
  armObserver,
} from "../../services/agentObserver/agentObserver.js";
import { makeSaltedName, Mr } from "../../utils/agentId.js";
import { promptIdForRequest } from "../../services/api/claude.js";
import { _Pi } from "../../skills/syncedSkills.js";
import { Ogr } from "../../utils/concurrentSessions.js";
import { getCwd, M$, runWithCwdOverride, xDn } from "../../utils/cwd.js";
import { formatTotalTokensTag } from "../../utils/attachments/totalTokensReminder.js";
import { getQuerySourceForAgent } from "../../utils/promptCategory.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { plural } from "../../utils/stringUtils.js";
import { displayModelName, formatModelRestrictedNotice } from "../../utils/model/validateModel.js";
import { isParkedOnChildWork, hasChildAgents } from "../../tasks/LocalAgentTask/childWork.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { UC } from "../../utils/agentMetadata.js";
import { MAIN } from "../../utils/sessionPeers.js";
import { getTaskRunState, emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { isIterativeHavenGateOn } from "../../cli/print/agentResume.js";
import { categorizeRetryableAPIError } from "../../services/api/errors.js";
import { getAssistantMessageContentLength } from "../../utils/tokens.js";
import { getPendingHandbackReport, Nwe } from "./handbackReport.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { isBareMode } from "../../utils/envUtils.js";

/**
 * AgentTool.checkPermissions 的免审分支：dontAsk 下 web-fetch 代理派发满足条件时登记并返回 true。
 */
//@ chunk-0tkmvwy0.js:7783-7872 placement
async function tryAutoApproveWebFetchDispatch({ input: input, toolUseContext: toolUseContext }) {
  if (!(await isAutoApprovableWebFetchDispatch(input, toolUseContext))) return !1;
  return (markWebFetchDispatchApproved(toolUseContext), !0);
}
/**
 * 在 toolState 的 WebFetchDispatchApprovals 中登记当前 toolUseId。
 */
//@ chunk-0tkmvwy0.js:7872-7955 placement = collectCandidatesFromMessage (0.621)
function markWebFetchDispatchApproved({ toolUseId: toolUseId, toolState: toolState }) {
  if (toolUseId === void 0) return;
  toolState.get(WebFetchDispatchApprovals).set(toolUseId, [], !0);
}
/**
 * Agent 工具输出 schema：completed（agentToolResultSchema + prompt/worktree）、async_launched（agentId/outputFile/resolvedModel/modelsUsed/sharesCwd…）、remote_launched（taskId/sessionUrl/outputFile）三者联合。
 */
//@ chunk-0tkmvwy0.js:16698-18155 fingerprint = outputSchema (0.581)
var completedResultSchema = DoctorLazy(() =>
    agentToolResultSchema().extend({
      status: T("completed"),
      prompt: o(),
      worktreePath: o().optional(),
      worktreeBranch: o().optional(),
      canContinueAgent: canContinueAgentSchema(),
    }),
  ),
  agentOutputSchema = DoctorLazy(() => {
    let n = completedResultSchema(),
      e = u({
        status: T("async_launched"),
        isAsync: T(!0).optional(),
        agentId: o().describe("The ID of the async agent"),
        description: o().describe("The description of the task"),
        resolvedModel: o()
          .optional()
          .describe("Model in use at the backgrounding transition (a pre-background swap is reflected here)"),
        modelsUsed: A(o())
          .optional()
          .describe("Ordered distinct models used before backgrounding (length > 1 means a mid-run swap)"),
        prompt: o().describe("The prompt for the agent"),
        outputFile: o().describe("Path to the output file for checking agent progress"),
        canReadOutputFile: M()
          .optional()
          .describe("Whether the calling agent has Read/Bash tools to check progress"),
        canContinueAgent: canContinueAgentSchema(),
        sharesCwd: M()
          .optional()
          .describe(
            "@internal True when this unisolated write-capable agent was launched into a working directory where another one is already running and a worktree could have been made here (drives a model-facing note; not a stable consumer field)",
          ),
      }),
      s = u({
        status: T("remote_launched"),
        taskId: o().describe("The ID of the remote agent task"),
        sessionUrl: o().describe("The URL of the cloud session"),
        description: o().describe("The description of the task"),
        prompt: o().describe("The prompt for the agent"),
        outputFile: o().describe("Path to the output file for checking agent progress"),
      });
    return Ue([n, e, s]);
  });
/**
 * Agent 工具的执行体：校验嵌套深度、预算、并发上限与 deny 规则，解析 subagent_type（fork / 规范化匹配 / general-purpose 缺省），处理 name 队友派生、agent.spawn 插件钩子改写、requiredMcpServers 等待，然后按 decideAgentLaunchMode 走远程（teleportToRemote）、后台（runAsyncAgentLifecycle）或同步（runAgent 流 + 进度回调）三条路径；isolation=worktree 时创建并在结束后清理 worktree。
 */
//@ chunk-0tkmvwy0.js:18155-48361 fingerprint = AgentTool (0.354)
async function callAgentTool({
  agentInput: agentInput,
  toolUseContext: toolUseContext,
  canUseTool: canUseTool,
  assistantMessage: assistantMessage,
  onProgress: onProgress,
  timing: timing,
  enclosingToolUseId: enclosingToolUseId,
}) {
  let {
      subagent_type: subagent_type,
      run_in_background: run_in_background,
      name: teammateName,
      isolation: isolation,
    } = agentInput,
    { prompt: prompt, description: description, cwd: cwd, effort: effort } = agentInput,
    model = agentInput.model,
    relativeEffort =
      isRelativeEffortDisabled() && (effort === "lower" || effort === "higher") ? effort : void 0,
    absoluteEffort = effort === "lower" || effort === "higher" ? void 0 : effort,
    now = Date.now();
  if (isCoordinatorMode_2() && env.CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL) model = void 0;
  let requestedModel = model,
    agentPrompt = prompt,
    agentDescription = description,
    agentCwd = cwd;
  await assertAgentCwdAllowed(agentCwd, "the call");
  let Vt = getAgentDepth(toolUseContext.agentContext),
    Yt = getMaxSubagentSpawnDepth();
  if (Vt >= Yt)
    throw (
      logFeatureBad("subagent_launch", "subagent_depth_cap"),
      R7e.of(toolUseContext.session).recordRefused("depth_limit"),
      new AgentPreconditionError(
        `Subagent nesting limit reached (depth ${Vt} of ${Yt}). Complete this task directly using your tools instead of spawning another agent. If the user explicitly requested deeper nesting, ask them to raise CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH.`,
      )
    );
  if (toolUseContext.agentId !== void 0 && hW(toolUseContext.agentId))
    throw (
      logFeatureBad("subagent_launch", "subagent_spawner_stop_pending"),
      new AgentPreconditionError(
        "This agent has been stopped and its stop is still completing; it cannot launch new agents.",
      )
    );
  let Kt = isMainConversationsOwnCall(toolUseContext)
    ? toolUseContext.toolState.get(ResumedAgentCallRegistry).take(toolUseContext.toolUseId)
    : void 0;
  if (Kt !== void 0) {
    let r = await resolveResumedAgentCall(Kt, toolUseContext);
    return r.status === "async_launched"
      ? {
          data: {
            ...r,
            isAsync: !0,
            prompt: agentInput.prompt,
            canReadOutputFile: HM(toolUseContext.options.tools),
            canContinueAgent: hasSendMessageTool(toolUseContext.options.tools),
          },
        }
      : {
          data: {
            status: "completed",
            prompt: agentInput.prompt,
            ...r.report,
            canContinueAgent: hasSendMessageTool(toolUseContext.options.tools),
          },
        };
  }
  agentDescription = agentDescription.replace(/\s+/g, " ").trim();
  let appState = toolUseContext.getAppState(),
    permissionContext = getToolPermissionContext(toolUseContext),
    mode = permissionContext.mode,
    { taskRegistry: taskRegistry } = toolUseContext,
    no = isAgentSwarmsEnabled() ? appState.teamContext : void 0,
    callerIsInProcessTeammate = !!toolUseContext.teammateContext;
  if ((callerIsInProcessTeammate || !!getDynamicTeamContext()) && teammateName && !tH())
    throw (
      logFeatureBad("subagent_launch", "subagent_nested_teammate"),
      new AgentPreconditionError(
        "Teammates cannot spawn other teammates \u2014 the team roster is flat. To spawn a subagent instead, omit the `name` parameter.",
      )
    );
  if (callerIsInProcessTeammate && run_in_background === !0)
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_background_denied"),
      new AgentPreconditionError(
        "In-process teammates cannot spawn background agents. Use run_in_background=false for synchronous subagents.",
      )
    );
  let { activeAgents: activeAgents, allowedAgentTypes: allowedAgentTypes } =
      toolUseContext.options.agentDefinitions,
    requestedFork = subagent_type !== void 0 && normalizeAgentName(subagent_type) === FORK,
    { available: available, denyRule: denyRule } = getForkAvailability(
      activeAgents,
      allowedAgentTypes,
      permissionContext,
    );
  if (requestedFork && denyRule)
    throw (
      logFeatureBad("subagent_launch", "subagent_type_denied"),
      new AgentTypeError(
        `Agent type '${FORK}' has been denied by permission rule '${AGENT}(${FORK})' from ${denyRule.source}.`,
      )
    );
  let isForkLaunch = requestedFork && available;
  if (subagent_type !== void 0 && !requestedFork) {
    let r = findDenyRuleWithContent(permissionContext, AGENT, subagent_type);
    if (r)
      throw (
        logFeatureBad("subagent_launch", "subagent_type_denied"),
        new AgentTypeError(
          `Agent type '${subagent_type}' has been denied by permission rule '${AGENT}(${subagent_type})' from ${r.source}.`,
        )
      );
    if (allowedAgentTypes && !allowedAgentTypes.includes(subagent_type)) {
      logFeatureBad("subagent_launch", "subagent_type_not_found");
      let mapped = (
        await getDispatchableAgents(activeAgents, allowedAgentTypes, permissionContext, toolUseContext)
      ).map((R) => R.agentType);
      throw new AgentTypeError(
        `Agent type '${subagent_type}' not found. Available agents: ${formatAgentList(mapped)}`,
      );
    }
  }
  let assertCanLaunch = (r = !1) => {
      if (toolUseContext.abortController.signal.aborted) {
        let R = unwrapAbortReason(toolUseContext.abortController.signal.reason);
        if (!(r && R === "interrupt")) throw new AbortError();
      }
      let { maxBudgetUsd: maxBudgetUsd } = toolUseContext.options;
      if (uN(maxBudgetUsd))
        throw (
          logFeatureBad("subagent_launch", "subagent_budget_exhausted"),
          R7e.of(toolUseContext.session).recordRefused("budget"),
          new AgentPreconditionError(
            `Budget limit reached ($${ACe().toFixed(2)} spent of the $${maxBudgetUsd} maximum). New agents cannot be started. Complete the remaining work directly with your tools, or wrap up with the results you already have.`,
          )
        );
    },
    oo = async () => {
      let r = checkSubagentConcurrencyLimit(toolUseContext);
      if (r) throw (await cleanupAgentWorktree(), r);
      return toolUseContext.taskRegistry.takeConcurrencySlot();
    };
  if (
    no &&
    teammateName &&
    !isForkLaunch &&
    !resolveAgentOverrides(subagent_type, activeAgents) &&
    !isolation &&
    !agentCwd &&
    !tH()
  ) {
    let offeredAgents = await getDispatchableAgents(
        activeAgents,
        allowedAgentTypes,
        permissionContext,
        toolUseContext,
      ),
      teammateAgentDef = subagent_type
        ? findAgentByNormalizedType(activeAgents, offeredAgents, subagent_type)
        : void 0;
    if (teammateAgentDef && teammateAgentDef.agentType !== subagent_type) {
      let ge = findDenyRuleWithContent(permissionContext, AGENT, teammateAgentDef.agentType);
      if (ge)
        throw (
          logFeatureBad("subagent_launch", "subagent_type_denied"),
          new AgentTypeError(
            `Agent type '${teammateAgentDef.agentType}' has been denied by permission rule '${AGENT}(${teammateAgentDef.agentType})' from ${ge.source}.`,
          )
        );
    }
    let R =
      teammateAgentDef ??
      (subagent_type ? findAgentByNormalizedType(activeAgents, activeAgents, subagent_type) : void 0);
    if (!(R === void 0 || (await filterOfferedAgents([R], toolUseContext)).length === 1))
      throw (
        logFeatureBad("subagent_launch", "subagent_teammate_not_offered"),
        new AgentTypeError(`Agent type '${subagent_type}' is not offered in this session.`)
      );
    let loadedTeammateDef = teammateAgentDef
      ? await loadListedAgentDefinition(teammateAgentDef, toolUseContext.abortController.signal)
      : void 0;
    if (teammateAgentDef && !loadedTeammateDef)
      throw (
        logFeatureBad("subagent_launch", "subagent_plugin_load_failed"),
        new AgentTypeError(`Agent type '${teammateAgentDef.agentType}' could not be loaded from its plugin.`)
      );
    assertCanLaunch(To);
    let F = getMainLoopModel(toolUseContext),
      L = loadedTeammateDef ?? UIr(subagent_type),
      teammateSpawnHook = await launchAgentsWithHooks({
        tool_use_id: toolUseContext.toolUseId ?? "",
        prompt: agentPrompt,
        description: agentDescription,
        agent: L,
        agents: offeredAgents,
        model: model,
        parentModel: F,
        parentAgentId: toolUseContext.agentId,
        permissionMode: mode,
        background: !0,
        fork: !1,
        isTeammate: !0,
        name: teammateName,
        cwd: void 0,
        signal: toolUseContext.abortController.signal,
        origin: toolUseContext.hookOrigin,
      });
    using starting = teammateSpawnHook.starting;
    if (teammateSpawnHook.deny !== void 0)
      throw (
        logFeatureBad("subagent_launch", "subagent_spawn_denied_by_hook"),
        new AgentPreconditionError(`Subagent spawn denied by a plugin: ${teammateSpawnHook.deny}`)
      );
    AGr({ toolUseContext: toolUseContext }, teammateSpawnHook.isRewritten);
    let spawn = teammateSpawnHook.spawn,
      V = await checkSpawnHookRewrite({
        tool: AgentTool,
        raised: toSpawnHookInput(agentInput, {
          prompt: agentPrompt,
          description: agentDescription,
          subagentType: L.agentType,
          model: model,
          background: !0,
          cwd: void 0,
        }),
        rewritten: toSpawnHookInput(agentInput, spawn),
        context: toolUseContext,
      });
    if (V)
      throw (
        logFeatureBad("subagent_launch", "subagent_spawn_hook_rewrite_ruled"),
        new AgentPreconditionError(
          `A plugin's agent.spawn hook rewrote this spawn into one a permission rule ${RULE_BEHAVIOR_VERB[V.behavior]}: ${V.message} Dispatch it directly.`,
        )
      );
    let found = offeredAgents.find((ge) => ge === teammateSpawnHook.agent && ge !== L);
    if (resolveAgentOverrides(found?.agentType, activeAgents))
      throw (
        logFeatureBad("subagent_launch", "subagent_spawn_hook_teammate_rewrite"),
        new AgentPreconditionError(
          `A plugin's agent.spawn hook retyped a teammate into '${found?.agentType}', which does not run as a teammate.`,
        )
      );
    if (found) {
      if (
        ((loadedTeammateDef = await loadListedAgentDefinition(found, toolUseContext.abortController.signal)),
        !loadedTeammateDef)
      )
        throw (
          logFeatureBad("subagent_launch", "subagent_plugin_load_failed"),
          new AgentTypeError(`Agent type '${found.agentType}' could not be loaded from its plugin.`)
        );
      let ge = hasRequiredMcpServers_2(loadedTeammateDef, [
        ...toolUseContext.getAppState().mcp.tools,
        ...toolUseContext.options.tools.filter(isMcpTool),
      ]);
      if (ge.length > 0)
        throw (
          logFeatureBad("subagent_launch", "subagent_mcp_required_missing"),
          tagObject(new AgentPreconditionError(formatSpawnHookMcpMissing(loadedTeammateDef.agentType, ge)), {
            kind: "mcp_required_missing",
            servers: ge,
          })
        );
    }
    ((agentPrompt = spawn.prompt), (agentDescription = spawn.description.replace(/\s+/g, " ").trim()));
    let model_2 = spawn.model,
      te = loadedTeammateDef?.agentType ?? subagent_type;
    if ((assertCanLaunch(_o), loadedTeammateDef?.color))
      setAgentColor(
        found ? loadedTeammateDef.agentType : (subagent_type ?? loadedTeammateDef.agentType),
        loadedTeammateDef.color,
      );
    let { spawnTeammate: spawnTeammate } = require("./chunk-cne5hsvz.js"),
      teammateSpawnResult = await spawnTeammate(
        {
          name: teammateName,
          prompt: agentPrompt,
          description: agentDescription,
          use_splitpane: !0,
          plan_mode_required: mode === "plan",
          model: model_2 ?? getAgentModelInheritCap(loadedTeammateDef, getMainLoopModel(toolUseContext)),
          modelSource: model_2 ? "tool" : "frontmatter",
          agent_type: te,
          agentDefinition: loadedTeammateDef,
          invokingRequestId: assistantMessage?.requestId,
        },
        toolUseContext,
        onProgress,
      ),
      ct = {
        status: "teammate_spawned",
        prompt: agentPrompt,
        agentId: teammateSpawnResult.data.agent_id,
        resolvedModel: parseUserSpecifiedModel(teammateSpawnResult.data.model ?? F),
        ...teammateSpawnResult.data,
      },
      gt = teammateSpawnResult.loopAgentId ?? teammateSpawnResult.data.teammate_id;
    return (
      recordSpawnProvenance(gt, toolUseContext),
      starting?.started({
        agentId: gt,
        model: parseUserSpecifiedModel(teammateSpawnResult.data.model ?? F),
        teammateId: teammateSpawnResult.data.teammate_id,
      }),
      logFeatureOk("subagent_launch"),
      { data: ct }
    );
  }
  let Jt = {
      isolation: isolation,
      querySource: toolUseContext.options.querySource,
      messages: toolUseContext.messages,
    },
    selectedAgent,
    Zt = [];
  if (isForkLaunch) {
    let r = getForkPreconditionError(Jt);
    if (r) throw (logFeatureBad("subagent_launch", r.code), new AgentPreconditionError(r.message));
    selectedAgent = FORK_AGENT;
  } else {
    let offeredAgentsList = await getDispatchableAgents(
      activeAgents,
      allowedAgentTypes,
      permissionContext,
      toolUseContext,
    );
    Zt = offeredAgentsList;
    let mapped = offeredAgentsList.map((F) => F.agentType);
    if (subagent_type === void 0 && !isGeneralPurposeAgentAvailable(activeAgents, allowedAgentTypes)) {
      (logEvent("tengu_subagent_type_miss", {
        requestedNormalized: lit("OMITTED"),
        availableCount: offeredAgentsList.length,
      }),
        logFeatureBad("subagent_launch", "subagent_type_missing"));
      let F = available && getForkPreconditionError(Jt) === null ? [FORK, ...mapped] : mapped;
      throw new AgentTypeError(`${ecr}. Available agents: ${formatAgentList(F)}`);
    }
    let requestedAgentType = subagent_type ?? GENERAL_PURPOSE_AGENT.agentType,
      found = offeredAgentsList.find((F) => F.agentType === requestedAgentType);
    if (!found) {
      let normalizedType = normalizeAgentName(requestedAgentType),
        L = new Set(mapped),
        normalizedMatches = normalizedType
          ? activeAgents.filter((V) => normalizeAgentName(V.agentType) === normalizedType)
          : [],
        q = agentTypeForAnalytics_GATE_EVALUATED(
          normalizedType,
          normalizedMatches.length > 0 && normalizedMatches.every(isBuiltInAgent),
        ),
        ee = normalizedType.length;
      if (normalizedMatches.length > 1) {
        (logEvent("tengu_subagent_type_miss", {
          requestedNormalized: q,
          requestedLength: ee,
          availableCount: offeredAgentsList.length,
          ambiguousCount: normalizedMatches.length,
        }),
          logFeatureBad("subagent_launch", "subagent_type_ambiguous"));
        let filtered = normalizedMatches.map((B) => B.agentType).filter((B) => L.has(B));
        throw new AgentTypeError(
          `Agent type '${requestedAgentType}' is ambiguous \u2014 matches ${normalizedMatches.map((B) => (L.has(B.agentType) ? B.agentType : `${B.agentType} (unavailable)`)).join(", ")}. ${filtered.length > 0 ? `Use the exact name: ${filtered.join(" or ")}` : `None of these are available. Available agents: ${formatAgentList(mapped)}`}`,
        );
      }
      if (normalizedMatches.length === 1) {
        let V = normalizedMatches[0];
        if (L.has(V.agentType)) {
          if (((found = V), found.color)) setAgentColor(requestedAgentType, found.color);
          logEvent("tengu_subagent_type_normalized", {
            requestedNormalized: q,
            matched: agentTypeForAnalyticsFromDefinition(found),
          });
        } else {
          let agentType = V.agentType,
            ne = findDenyRuleWithContent(permissionContext, AGENT, agentType);
          if (ne)
            throw (
              logFeatureBad("subagent_launch", "subagent_type_denied"),
              new AgentTypeError(
                `Agent type '${agentType}' has been denied by permission rule '${AGENT}(${agentType})' from ${ne.source}.`,
              )
            );
          if (isAgentToolPoolDenied(V, permissionContext))
            throw (
              logFeatureBad("subagent_launch", "subagent_type_tools_denied"),
              new AgentTypeError(agentToolPoolDeniedMessage(agentType))
            );
        }
      }
      if (!found)
        throw (
          logEvent("tengu_subagent_type_miss", {
            requestedNormalized: q,
            requestedLength: ee,
            availableCount: offeredAgentsList.length,
          }),
          logFeatureBad("subagent_launch", "subagent_type_not_found"),
          new AgentTypeError(
            `Agent type '${requestedAgentType}' not found. Available agents: ${formatAgentList(mapped)}`,
          )
        );
    }
    let P = await loadListedAgentDefinition(found, toolUseContext.abortController.signal);
    if (P === void 0)
      throw (
        logFeatureBad("subagent_launch", "subagent_plugin_load_failed"),
        new AgentTypeError(`Agent type '${requestedAgentType}' could not be loaded from its plugin.`)
      );
    selectedAgent = P;
  }
  if (callerIsInProcessTeammate && selectedAgent.background === !0)
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_background_denied"),
      new AgentPreconditionError(
        `In-process teammates cannot spawn background agents. Agent '${selectedAgent.agentType}' has background: true in its definition.`,
      )
    );
  if ((isolation ?? selectedAgent.isolation) === "worktree" && !isWebFetchAgent(selectedAgent)) {
    if ((refuseUnavailableWorktree("agent worktree"), !GKe())) throwAgentWorktreeNotGitRefusal();
  }
  let en = isCoordinatorMode_2(),
    tn = isForkSubagentEnabled(),
    nn =
      tn &&
      toolUseContext.agentId !== void 0 &&
      !toolUseContext.innerCall &&
      !callerIsInProcessTeammate &&
      getIsNonInteractiveSession(),
    rn = tn && forkGateForcesBackground() && !callerIsInProcessTeammate && !nn,
    backgroundTasksAvailable = C4(),
    backgroundLaunchGate = D0e(),
    tt = VTn(),
    an =
      backgroundLaunchGate !== void 0 &&
      (run_in_background === !0 || (tt && run_in_background !== !1)) &&
      !isBackgroundAgentLaunchDisabled()
        ? getBackgroundedToolUseId(assistantMessage, toolUseContext.toolUseId, tt)
        : void 0,
    backgroundHandoff =
      backgroundLaunchGate !== void 0 && an !== void 0
        ? runBackgroundLaunchRules(backgroundLaunchGate, {
            toolUseId: an,
            callerAgentId: toolUseContext.agentId,
            signal: toolUseContext.abortController.signal,
          })
        : void 0,
    ro = backgroundLaunchGate === void 0 ? backgroundTasksAvailable : backgroundHandoff === void 0,
    un = tLr(backgroundLaunchGate, backgroundTasksAvailable),
    dn = (r, w) =>
      decideAgentLaunchMode({
        agent: r,
        wantsBackground: w,
        isolation: isolation,
        restricted: permissionContext.restricted,
        isCoordinator: en,
        forceAsync: rn,
        callerIsInProcessTeammate: callerIsInProcessTeammate,
        callerIsHeadlessSubagent: nn,
        backgroundTasksDisabled: ro,
      }),
    {
      effectiveIsolation: effectiveIsolation,
      isRemoteLaunch: isRemoteLaunch,
      shouldRunAsync: shouldRunAsync,
    } = dn(selectedAgent, run_in_background);
  if (!isRemoteLaunch) {
    if (toolUseContext.abortController.signal.aborted) {
      let w = unwrapAbortReason(toolUseContext.abortController.signal.reason);
      if (!(shouldRunAsync && w === "interrupt")) throw new AbortError();
    }
    let r = checkSubagentConcurrencyLimit(toolUseContext);
    if (r) throw r;
  }
  assertCanLaunch(shouldRunAsync && !isRemoteLaunch);
  let requiredMcpServers = selectedAgent.requiredMcpServers,
    filtered = toolUseContext.options.tools.filter(isMcpTool),
    ln = () => toolUseContext.getAppState().mcp,
    so = timing?.mark("external");
  if (requiredMcpServers?.length) {
    let r = (w) => requiredMcpServers.some((R) => w.name.toLowerCase().includes(R.toLowerCase()));
    await waitForMcpClients(ln, (w, R) => r(w) && isPendingServerWithoutTools(w, R.tools), {
      maxWaitMs: 30000,
      until: (w) => w.clients.some((client) => client.type === "failed" && r(client)),
    });
  }
  if (!isRemoteLaunch) await waitForCoordinatorSubagentMcpServers(ln);
  so?.();
  let appState_2 = toolUseContext.getAppState();
  if (requiredMcpServers?.length) {
    let r = [];
    for (let w of appState_2.mcp.tools.concat(filtered)) {
      let R = getMcpServerNameOfTool(w);
      if (R && !r.includes(R)) r.push(R);
    }
    if (!hasRequiredMcpServers(selectedAgent, r)) {
      let filtered = requiredMcpServers.filter(
        (R) => !r.some((G) => G.toLowerCase().includes(R.toLowerCase())),
      );
      throw (
        logFeatureBad("subagent_launch", "subagent_mcp_required_missing"),
        tagObject(
          new AgentPreconditionError(
            `Agent '${selectedAgent.agentType}' requires MCP servers matching: ${filtered.join(", ")}. MCP servers with tools: ${r.length > 0 ? r.join(", ") : "none"}. Use /mcp to configure and authenticate the required MCP servers.`,
          ),
          { kind: "mcp_required_missing", servers: filtered },
        )
      );
    }
  }
  if (selectedAgent.color) setAgentColor(selectedAgent.agentType, selectedAgent.color);
  let Rt = getMainLoopModel(toolUseContext),
    spawnHookResult = await launchAgentsWithHooks({
      tool_use_id: toolUseContext.toolUseId ?? "",
      prompt: agentPrompt,
      description: agentDescription,
      agent: selectedAgent,
      agents: Zt,
      model: isForkLaunch ? void 0 : requestedModel,
      parentModel: Rt,
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
  if (spawnHookResult.deny !== void 0)
    throw (
      logFeatureBad("subagent_launch", "subagent_spawn_denied_by_hook"),
      new AgentPreconditionError(`Subagent spawn denied by a plugin: ${spawnHookResult.deny}`)
    );
  AGr({ toolUseContext: toolUseContext }, spawnHookResult.isRewritten);
  let cn = () =>
      toSpawnHookInput(agentInput, {
        prompt: agentPrompt,
        description: agentDescription,
        subagentType: selectedAgent.agentType,
        model: isForkLaunch ? void 0 : requestedModel,
        background: shouldRunAsync,
        cwd: agentCwd,
      }),
    io = cn(),
    { spawn: spawn } = spawnHookResult,
    agentRetypedByHook = spawnHookResult.agent !== selectedAgent,
    launchShapeChanged = agentRetypedByHook || spawn.background !== shouldRunAsync;
  if (
    ((selectedAgent = spawnHookResult.agent),
    (agentPrompt = spawn.prompt),
    (agentDescription = spawn.description.replace(/\s+/g, " ").trim()),
    (agentCwd = spawn.cwd),
    agentCwd !== cwd)
  )
    await assertAgentCwdAllowed(agentCwd, "a hook");
  if (((requestedModel = spawn.model), launchShapeChanged))
    ({
      effectiveIsolation: effectiveIsolation,
      isRemoteLaunch: isRemoteLaunch,
      shouldRunAsync: shouldRunAsync,
    } = dn(selectedAgent, spawn.background));
  if (agentRetypedByHook && isUnreviewedWebFetchDispatch(toolUseContext))
    throw (
      logFeatureBad("subagent_launch", "subagent_spawn_hook_retype_unreviewed"),
      new AgentPreconditionError(
        "A plugin's agent.spawn hook named another agent for a web-fetch dispatch admitted without classifier review; it cannot run unconfined. Dispatch that agent directly.",
      )
    );
  let Ot = await checkSpawnHookRewrite({
    tool: AgentTool,
    raised: io,
    rewritten: cn(),
    context: toolUseContext,
  });
  if (Ot)
    throw (
      logFeatureBad("subagent_launch", "subagent_spawn_hook_rewrite_ruled"),
      new AgentPreconditionError(
        `A plugin's agent.spawn hook rewrote this spawn into one a permission rule ${RULE_BEHAVIOR_VERB[Ot.behavior]}: ${Ot.message} Dispatch it directly.`,
      )
    );
  if (spawn.cwd !== void 0 && spawn.cwd !== cwd && effectiveIsolation === "worktree")
    throw (
      logFeatureBad("subagent_launch", "subagent_spawn_hook_cwd_worktree"),
      new AgentPreconditionError(
        `A plugin's agent.spawn hook set cwd on a spawn isolated in a worktree; cwd and isolation: "worktree" are mutually exclusive.`,
      )
    );
  if (
    launchShapeChanged &&
    isAbortedNotByInterrupt(toolUseContext.abortController.signal, shouldRunAsync && !isRemoteLaunch)
  )
    throw new AbortError();
  if (launchShapeChanged && callerIsInProcessTeammate && shouldRunAsync && !isRemoteLaunch)
    throw (
      logFeatureBad("subagent_launch", "subagent_teammate_background_denied"),
      new AgentPreconditionError(
        "In-process teammates cannot spawn background agents; a plugin's agent.spawn hook backgrounded this one.",
      )
    );
  let Dt = agentRetypedByHook
    ? hasRequiredMcpServers_2(selectedAgent, [...toolUseContext.getAppState().mcp.tools, ...filtered])
    : [];
  if (Dt.length > 0)
    throw (
      logFeatureBad("subagent_launch", "subagent_mcp_required_missing"),
      tagObject(new AgentPreconditionError(formatSpawnHookMcpMissing(selectedAgent.agentType, Dt)), {
        kind: "mcp_required_missing",
        servers: Dt,
      })
    );
  let gn = agentRetypedByHook ? selectedAgent.color : void 0;
  if (gn) setAgentColor(selectedAgent.agentType, gn);
  let modelParam = isForkLaunch ? "inherit" : requestedModel,
    resolvedModel = getAgentModel(getExploreAgentModel(selectedAgent, Rt), Rt, modelParam, mode);
  if (!isForkLaunch && absoluteEffort !== void 0)
    selectedAgent = { ...selectedAgent, effort: absoluteEffort };
  let effortPlan = isRemoteLaunch
      ? void 0
      : resolveSubagentEffort({
          agentDefinition: selectedAgent,
          isFork: isForkLaunch,
          model: resolvedModel,
          effortState: toolUseContext.getAppState(),
          inheritedLayers: toolUseContext.permissionLayers,
          recordedBudgetText: void 0,
        }),
    st =
      relativeEffort !== void 0 && !isForkLaunch && effortPlan?.subagentEffort !== void 0
        ? findAdjacentEffortLevel(
            resolvedModel,
            effortPlan.subagentEffort,
            relativeEffort === "higher" ? 1 : -1,
          )
        : void 0,
    effortBudgetPlan =
      effortPlan !== void 0 && st !== void 0
        ? {
            ...effortPlan,
            agentDefinition: { ...effortPlan.agentDefinition, effort: st },
            subagentEffort: st,
          }
        : effortPlan,
    effectiveEffort = isForkLaunch ? void 0 : (st ?? absoluteEffort);
  selectedAgent = effortBudgetPlan?.agentDefinition ?? selectedAgent;
  let agentTypeForTelemetry = agentTypeForAnalyticsFromDefinition(selectedAgent);
  toolUseContext.agentLifecycle.markTypeInvoked(selectedAgent.agentType);
  let uo = await readAgentMemoryScope(selectedAgent, toolUseContext.storageV5),
    systemPrompt = selectedAgent.getSystemPrompt({ toolUseContext: toolUseContext, primedAgentMemory: uo }),
    pluginIdentifier = isPluginAgent(selectedAgent) ? parsePluginIdentifier_2(selectedAgent.plugin) : void 0;
  if (isPluginAgent(selectedAgent)) recordPluginUsage(selectedAgent.plugin);
  let agentDepth = getAgentDepth(toolUseContext.agentContext) + 1;
  if (isPluginAgent(selectedAgent))
    recordPluginActivity(selectedAgent.plugin, "subagent", { kind: "agent", name: selectedAgent.filename });
  let pn = () => (
    logEvent("tengu_agent_tool_selected", {
      agent_type: agentTypeForTelemetry,
      model: telemetrySafeModelName(resolvedModel),
      source: fromEnum(selectedAgent.source),
      color: fromEnumOpt(selectedAgent.color),
      is_built_in_agent: isBuiltInAgent(selectedAgent),
      is_resume: !1,
      is_async: shouldRunAsync,
      is_fork: isForkLaunch,
      effort_param: fromEnumOpt(relativeEffort ?? absoluteEffort),
      session_effort: fromEnumOpt(effortBudgetPlan?.sessionEffort),
      subagent_effort: fromEnumOpt(effortBudgetPlan?.subagentEffort),
      subagent_total_tokens_budget: effortBudgetPlan?.totalTokensBudget,
      subagent_budget_on_top_of_start:
        effortBudgetPlan?.totalTokensBudget === void 0 ? void 0 : effortBudgetPlan.isBudgetOnTopOfStart,
      agent_depth: agentDepth,
      agent_system_prompt_chars: systemPrompt.length,
      ...(pluginIdentifier && buildPluginEventFields(pluginIdentifier.name, pluginIdentifier.marketplace)),
    }),
    R7e.of(toolUseContext.session).recordSpawn({
      agentType: selectedAgent.agentType,
      runInBackground: run_in_background,
      runsInBackground: shouldRunAsync,
      depth: agentDepth,
    })
  );
  if (isRemoteLaunch) {
    if (isPersonalConfigRestricted())
      throw (
        logFeatureBad("subagent_launch", "subagent_remote_personal_config"),
        new RemoteAgentPreconditionError(REMOTE_AGENT_RESTRICTED_CONFIG_ERROR)
      );
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
      throw r.errors.some((error) => error.type === "not_logged_in" && error.message === void 0)
        ? tagObject(
            q,
            authExpiredBlockFor(await getClaudeAIOAuthTokenOriginAsync(toolUseContext.credentials)),
          )
        : q;
    }
    let w,
      R = !1,
      G = await teleportToRemote({
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
          ((w = E), (R = q === "no_access_token" || ee?.status === 401));
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
    let { taskId: taskId, sessionId: sessionId } = registerRemoteAgentTask({
      remoteTaskType: "remote-agent",
      session: { id: G.id, title: G.title || agentDescription },
      command: agentPrompt,
      context: toolUseContext,
      toolUseId: toolUseContext.toolUseId,
      permissionRelay: {
        canUseTool: canUseTool,
        toolUseContext: toolUseContext,
        allowedToolNames: new Set(
          resolveAgentTools(
            selectedAgent,
            toolUseContext.options.tools,
            !1,
            !1,
            !1,
            0,
            bN(toolUseContext).mode,
          ).resolvedTools.map((resolvedTool) => resolvedTool.name),
        ),
      },
    });
    (pn(),
      logEvent("tengu_agent_tool_remote_launched", { agent_type: agentTypeForTelemetry }),
      logFeatureOk("subagent_launch"));
    let L = {
      status: "remote_launched",
      taskId: taskId,
      sessionUrl: ZCe(sessionId),
      description: agentDescription,
      prompt: agentPrompt,
      outputFile: getTaskOutputPath(taskId),
    };
    return (starting?.started({ agentId: taskId, model: resolvedModel }), { data: L });
  }
  let agentSystemPrompt, forkSystemPrompt, promptMessages, inheritedAttachments;
  if (isForkLaunch) {
    if (toolUseContext.renderedSystemPrompt) forkSystemPrompt = toolUseContext.renderedSystemPrompt;
    else {
      let r = appState.agent
          ? appState.agentDefinitions.activeAgents.find(
              (activeAgent) => activeAgent.agentType === appState.agent,
            )
          : void 0,
        w = await getSystemPrompt(toolUseContext.options.tools, toolUseContext.options.mainLoopModel);
      forkSystemPrompt = u6({
        mainThreadAgentDefinition: r,
        toolUseContext: toolUseContext,
        customSystemPrompt: toolUseContext.options.customSystemPrompt,
        defaultSystemPrompt: w,
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
          ...!1,
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
    ((inheritedAttachments = buildForwardedTurnsForAgent(
      toolUseContext.messages,
      forwardProjectsOwnerRows(toolUseContext),
    )),
      (promptMessages = [...inheritedAttachments.copies, createUserMessage({ content: agentPrompt })]));
  }
  let ownerAgentId = resolveVisibleSubagentId(toolUseContext.agentId, taskRegistry) ?? mainAgentId(),
    agentMetadata = {
      prompt: agentPrompt,
      resolvedAgentModel: resolvedModel,
      isBuiltInAgent: isBuiltInAgent(selectedAgent),
      startTime: now,
      agentType: selectedAgent.agentType,
      isAsync: shouldRunAsync,
      agentDepth: agentDepth,
      source: selectedAgent.source,
      pluginId: pluginIdentifier,
      callerCanContinueAgents: getOwnToolSurface(toolUseContext, ownerAgentId),
      persistedToolResultFiles: isWebFetchAgent(selectedAgent) ? Ree() : void 0,
    },
    lo = assembleAgentToolPool(
      toolUseContext,
      permissionContext,
      toolUseContext.getAppState().mcp.tools.concat(filtered),
    ),
    mn = toolUseContext.agentId ?? MAIN_OBSERVED_KEY,
    observerPairing = selectedAgent.observer
      ? resolveObserverDeclaration({
          observedDefinition: selectedAgent,
          activeAgents: toolUseContext.options.agentDefinitions.activeAgents,
          observedIsObserver: !1,
        })
      : shouldFanOutObserver({
          parentPairing: Wyt(toolUseContext.session, mn),
          spawnedDefinition: selectedAgent,
          spawnedIsObserver: !1,
        }),
    fn = observerPairing?.inheritedArming
      ? {
          toolUseContext: observerPairing.inheritedArming.toolUseContext,
          canUseTool: observerPairing.inheritedArming.canUseTool,
          persistedArmingMode: observerPairing.inheritedArming.permissionMode,
          inheritedFromKey: mn,
          inheritedFromPairing: observerPairing.inheritedArming.parentPairing,
        }
      : { toolUseContext: toolUseContext, canUseTool: canUseTool },
    newAgentId = makeSaltedName(),
    parentAgentId = toolUseContext.agentId,
    co =
      toolUseContext.agentContext !== void 0 &&
      toolUseContext.agentContext.agentType !== "main" &&
      (toolUseContext.agentContext.isBackgroundAgent ?? !1),
    hn = isDelegatedObservationContext(toolUseContext.agentContext),
    yn = promptIdForRequest(toolUseContext.messages, toolUseContext.agentContext),
    agentWorktree = null;
  if (effectiveIsolation === "worktree") {
    let r = timing?.mark("external");
    if (
      ((agentWorktree = await createAgentWorktree(_Pi(newAgentId), {
        storageV5: toolUseContext.storageV5,
        credentials: toolUseContext.credentials,
      })),
      r?.(),
      agentWorktree.hookBased)
    ) {
      let worktreePath = agentWorktree.worktreePath;
      agentWorktree.vettedRealPath = await realpath(worktreePath).catch((R) => {
        logForDebugging(
          `Agent worktree ${worktreePath} could not be resolved after creation (${errorMessage(R)}); it will be kept at cleanup`,
          { level: "warn" },
        );
        return;
      });
    }
    Ogr(newAgentId);
  }
  if (isForkLaunch && agentWorktree)
    promptMessages.push(
      createUserMessage({ content: buildWorktreeNotice(getCwd(), agentWorktree.worktreePath) }),
    );
  let wn = hasConcurrentEditingAgentInCwd({
    taskRegistry: taskRegistry,
    selectedAgent: selectedAgent,
    effectiveIsolation: effectiveIsolation,
    cwd: agentCwd,
    parentCwd: toolUseContext.session.project === null ? null : getCwd(),
    parentAgentId: parentAgentId,
  });
  if (wn) promptMessages.push(createUserMessage({ content: N8s }));
  if (isForkLaunch && effortBudgetPlan?.totalTokensBudget !== void 0)
    promptMessages.push(
      createAttachmentMessage({
        type: "total_tokens_reminder",
        text: formatTotalTokensTag("padded-countdown", effortBudgetPlan.totalTokensBudget),
      }),
    );
  let _n = wn && GKe(),
    { onToolPool: onToolPool, reviewTools: reviewTools } = rue(toolUseContext.options.tools),
    runAgentParams = {
      agentDefinition: selectedAgent,
      promptMessages: promptMessages,
      turnPrompt: agentPrompt,
      toolUseContext: toolUseContext,
      canUseTool: canUseTool,
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
      ...(isUnreviewedWebFetchDispatch(toolUseContext) && { spawnMode: DONTASK }),
      override: isForkLaunch
        ? { systemPrompt: forkSystemPrompt, parentSystemPrompt: !0 }
        : agentSystemPrompt && !agentWorktree && !agentCwd
          ? { systemPrompt: asSystemPrompt(agentSystemPrompt) }
          : void 0,
      availableTools: isForkLaunch ? toolUseContext.options.tools : lo,
      assembleAvailableTools: (r) => assembleAgentToolPool(toolUseContext, permissionContext, r),
      onToolPool: onToolPool,
      forkContextMessages: isForkLaunch ? toolUseContext.messages : void 0,
      ...(isForkLaunch && { useExactTools: !0 }),
      totalTokensReminderBudget: effortBudgetPlan?.totalTokensBudget,
      isTotalTokensReminderBudgetOnTopOfStart: effortBudgetPlan?.isBudgetOnTopOfStart,
      worktreePath: agentWorktree?.worktreePath,
      worktreeBranch: agentWorktree?.worktreeBranch,
      cwd: agentCwd,
      description: agentDescription,
      preserveToolUseResults: !getIsNonInteractiveSession(),
      toolUseId: toolUseContext.toolUseId,
      ...!1,
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
    },
    kn = agentCwd ?? agentWorktree?.worktreePath,
    An = kn ?? (toolUseContext.agentWorktree !== void 0 ? getCwd() : void 0),
    withProject = toolUseContext.session.withProject({ cwd: kn }),
    project = withProject.project,
    cleanupAgentWorktree = async () => {
      if (!agentWorktree) return {};
      let {
        worktreePath: worktreePath,
        worktreeBranch: worktreeBranch,
        headCommit: headCommit,
        baseChangeset: baseChangeset,
        sessionDir: sessionDir,
        gitRoot: gitRoot,
        hookBased: hookBased,
        vettedRealPath: vettedRealPath,
      } = agentWorktree;
      if (((agentWorktree = null), hookBased && (baseChangeset === void 0 || vettedRealPath === void 0)))
        return (
          logForDebugging(`Hook-based agent worktree kept at: ${worktreePath}`),
          { worktreePath: worktreePath }
        );
      if (isParkedOnChildWork(taskRegistry.get(newAgentId)))
        return (
          logForDebugging(
            `Agent worktree kept at ${worktreePath}: backgrounded owner awaits keepalive, resume pending`,
          ),
          { worktreePath: worktreePath, worktreeBranch: worktreeBranch }
        );
      if (headCommit || baseChangeset !== void 0) {
        let q = (te) =>
            findTaskOccupyingPath(
              taskRegistry.all(),
              vettedRealPath === void 0 ? [worktreePath] : [worktreePath, vettedRealPath],
              te,
            ),
          ee = () => q() ?? q((te) => te.id !== newAgentId && isTaskStillOccupying(te, taskRegistry)),
          V = ee(),
          B = headCommit
            ? await hasWorktreeChanges(worktreePath, headCommit)
            : await getAgentWorktreeChanges(worktreePath, void 0, {
                hookBased: !0,
                baseChangeset: baseChangeset,
                sessionDir: sessionDir,
                vettedRealPath: vettedRealPath,
              }).then((te) => te.dirty || te.checkoutMoved === !0),
          ne = V ?? ee();
        if (ne) {
          if (
            (logForDebugging(
              `Agent worktree ${worktreePath} is still the working directory of ${ne.type} task ${ne.id}; kept`,
            ),
            logEvent("tengu_agent_worktree_kept", {
              reason: isTerminalTaskStatus(ne.status) ? lit("parked_task") : lit("live_task"),
              task_type: fromEnum(ne.type),
              seen: V ? lit("before_check") : lit("after_check"),
              changed: B,
            }),
            gitRoot)
          )
            watchWorktreeForRelease({
              worktreePath: worktreePath,
              gitRoot: gitRoot,
              taskRegistry: taskRegistry,
              findOccupant: q,
            });
          return { worktreePath: worktreePath, worktreeBranch: worktreeBranch };
        }
        if (
          !B &&
          (await removeAgentWorktree(worktreePath, worktreeBranch, gitRoot, hookBased ?? !1, "agent_tool"))
            .outcome === "removed"
        )
          return (
            clearWorktreeFromAgentMetadata({
              agentId: Mr(newAgentId),
              removedWorktreePath: worktreePath,
              spawnMetadata: {
                agentType: selectedAgent.agentType,
                ...(selectedAgent.agentType === FORK && { isFork: isBuiltInAgent(selectedAgent) }),
                ...(selectedAgent.agentType === WEB_FETCH_AGENT && {
                  isBuiltIn: isBuiltInAgent(selectedAgent),
                }),
                ...(agentCwd && { cwd: agentCwd }),
                description: agentDescription,
                ...(teammateName && { name: teammateName }),
                ...(toolUseContext.toolUseId && { toolUseId: toolUseContext.toolUseId }),
                spawnDepth: agentDepth,
                ...spawnRequestShape(shouldRunAsync, toolUseContext.options.isNonInteractiveSession),
                ...(modelParam && { model: modelParam }),
                ...(effectiveEffort && { effort: effectiveEffort }),
              },
              storageV5: toolUseContext.storageV5,
            }).catch((te) => logForDebugging(`Failed to clear worktree metadata: ${UC(te)}`)),
            {}
          );
      }
      if (gitRoot) await unlockAgentWorktree(worktreePath, gitRoot);
      return (
        logForDebugging(`Agent worktree kept at: ${worktreePath}`),
        { worktreePath: worktreePath, worktreeBranch: worktreeBranch }
      );
    };
  if (toolUseContext.abortController.signal.aborted) {
    let r = unwrapAbortReason(toolUseContext.abortController.signal.reason);
    if (!(shouldRunAsync && r === "interrupt")) throw (await cleanupAgentWorktree(), new AbortError());
  }
  if (project === null && M$())
    throw (
      logFeatureBad("subagent_launch", "subagent_no_directory_in_cwd_scope"),
      new AgentPreconditionError(
        "A subagent cannot be started from here in this session. Do the task without a subagent.",
      )
    );
  let releaseConcurrencySlot = await oo();
  if (backgroundLaunchGate !== void 0 && shouldRunAsync) {
    let r =
      backgroundHandoff === void 0
        ? { kind: "closed", message: bWr(tt) }
        : backgroundHandoff.confirm(toolUseContext.abortController.signal);
    if (r !== void 0) {
      if ((releaseConcurrencySlot(), await cleanupAgentWorktree(), r.kind === "aborted"))
        throw new AbortError();
      throw (
        logFeatureBad("subagent_launch", "subagent_background_launch_closed"),
        new AgentPreconditionError(r.message)
      );
    }
  }
  let spawnTelemetry = pn();
  agentMetadata.spawnedSubagent = spawnTelemetry;
  let Sn = () => {
      if (inheritedAttachments !== void 0)
        uki({ agentId: newAgentId, deliveringLoop: toolUseContext.agentId }, inheritedAttachments);
    },
    Bt = async (r) => {
      try {
        return await r;
      } catch (error) {
        throw (releaseConcurrencySlot(), error);
      }
    },
    vn =
      backgroundHandoff !== void 0 && teammateName && teammateName !== MAIN
        ? toolUseContext.getAppState().agentNameRegistry.get(teammateName)
        : void 0;
  if (teammateName && teammateName !== MAIN)
    toolUseContext.agentLifecycle.registerName(teammateName, Mr(newAgentId));
  let displayName = teammateName && teammateName !== MAIN ? teammateName : void 0;
  getTaskRunState().agentSpawned.emit({
    agentId: newAgentId,
    agentType: selectedAgent.agentType,
    parentAgentId: parentAgentId,
    taskRegistry: taskRegistry,
  });
  let lt = modelParam === void 0 && !isHookOrPluginSteered(toolUseContext),
    Rn = isForkLaunch || isHookOrPluginSteered(toolUseContext) ? void 0 : modelParam;
  if (shouldRunAsync) {
    let r = newAgentId,
      w = registerAsyncAgent({
        outputFileReadable: HM(toolUseContext.options.tools),
        ownerCanContinueAgents: agentMetadata.callerCanContinueAgents,
        agentId: r,
        ownerAgentId: ownerAgentId,
        parentAgentId: parentAgentId,
        spawnDepth: agentDepth,
        launchedWithDefaults: lt,
        launchModel: Rn,
        description: agentDescription,
        prompt: agentPrompt,
        model: resolvedModel,
        selectedAgent: selectedAgent,
        taskRegistry: taskRegistry,
        toolUseId: toolUseContext.toolUseId,
        cwd: An,
        spawnedSubagent: spawnTelemetry,
        sessionScratch: toolUseContext.session.sessionScratch,
      });
    if (
      backgroundHandoff !== void 0 &&
      !backgroundHandoff.handOver({ agentId: w.agentId, abortController: w.abortController })
    ) {
      if (
        (killAsyncAgent(w.agentId, taskRegistry, "system", void 0, { lifecycleNotStarted: !0 }),
        releaseConcurrencySlot(),
        markAgentNotified(w.agentId, taskRegistry),
        teammateName && vn !== void 0)
      )
        toolUseContext.agentLifecycle.registerName(teammateName, vn);
      throw (
        await cleanupAgentWorktree(),
        logFeatureBad("subagent_launch", "subagent_background_launch_not_taken"),
        new AgentPreconditionError(bWr(tt))
      );
    }
    if (!getIsNonInteractiveSession()) addAgentKeepaliveReason(ownerAgentId, `agent:${r}`, taskRegistry);
    if (
      tH() &&
      !getIsNonInteractiveSession() &&
      (!teammateName || teammateName === MAIN) &&
      !x5t.has(selectedAgent.agentType)
    ) {
      let allocateName = toolUseContext.agentLifecycle.allocateName(selectedAgent.agentType);
      (toolUseContext.agentLifecycle.registerName(allocateName, Mr(r)), (displayName = allocateName));
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
      parentAgentId: parentAgentId,
      depth: agentDepth,
      ...(alwaysFalse(toolUseContext) && { spawnedByMainThread: !0 }),
      parentSessionId: getParentSessionId(),
      agentType: "subagent",
      subagentName: selectedAgent.agentType,
      displayName: displayName,
      isAsync: !0,
      isBackgroundAgent: !0,
      ...(hn && { delegatedObservation: !0 }),
      isBuiltIn: isBuiltInAgent(selectedAgent),
      ...(isForkLaunch &&
        isMainConversationContext(toolUseContext.agentContext) && { forkOfMainConversation: !0 }),
      invokingRequestId: assistantMessage?.requestId,
      invocationKind: "spawn",
      invocationEmitted: !1,
      parentPromptId: yn,
      ...getWorkflowRunFields(toolUseContext.agentContext),
    };
    ((agentMetadata.agentContext = R),
      runWithCwdOverride(R, () =>
        xDn(project, () =>
          runAsyncAgentLifecycle({
            taskId: w.agentId,
            abortController: w.abortController,
            makeStream: (P, F, L) =>
              runAgent({
                ...runAgentParams,
                launchedWithDefaults: lt,
                session: withProject,
                override: {
                  ...runAgentParams.override,
                  agentId: Mr(w.agentId),
                  agentContext: R,
                  abortController: w.abortController,
                },
                onCacheSafeParams: P,
                onQueryProgress: F,
                onStreamTokenEstimate: L,
              }),
            metadata: agentMetadata,
            description: agentDescription,
            toolUseContext: toolUseContext,
            taskRegistry: taskRegistry,
            agentIdForCleanup: r,
            reviewTools: reviewTools,
            enableSummarization:
              getSdkAgentProgressSummariesEnabled() || ((en || rn) && !getIsNonInteractiveSession()),
            getWorktreeResult: cleanupAgentWorktree,
            onRunSettled: releaseConcurrencySlot,
          }),
        ),
      ),
      Sn(),
      starting?.started({ agentId: w.agentId, model: resolvedModel }));
    let G = !isWebFetchAgent(selectedAgent) && HM(toolUseContext.options.tools);
    return (
      logFeatureOk("subagent_launch"),
      {
        data: {
          isAsync: !0,
          status: "async_launched",
          agentId: w.agentId,
          description: agentDescription,
          resolvedModel: resolvedModel,
          prompt: agentPrompt,
          outputFile: w.outputFile ?? "",
          canReadOutputFile: G,
          canContinueAgent: hasSendMessageTool(toolUseContext.options.tools),
          ...(_n && { sharesCwd: !0 }),
        },
      }
    );
  } else {
    let r = Mr(newAgentId),
      w = isIterativeHavenGateOn() || D0e() !== void 0,
      R = {
        agentId: r,
        parentAgentId: parentAgentId,
        depth: agentDepth,
        ...(alwaysFalse(toolUseContext) && { spawnedByMainThread: !0 }),
        parentSessionId: getParentSessionId(),
        agentType: "subagent",
        subagentName: selectedAgent.agentType,
        displayName: displayName,
        isAsync: !1,
        isBackgroundAgent: co,
        ...(hn && { delegatedObservation: !0 }),
        isBuiltIn: isBuiltInAgent(selectedAgent),
        ...(isForkLaunch &&
          isMainConversationContext(toolUseContext.agentContext) && { forkOfMainConversation: !0 }),
        invokingRequestId: assistantMessage?.requestId,
        invocationKind: "spawn",
        invocationEmitted: !1,
        parentPromptId: yn,
        ...getWorkflowRunFields(toolUseContext.agentContext),
      };
    agentMetadata.agentContext = R;
    let G = runWithCwdOverride(R, () =>
      xDn(project, async () => {
        let now = Date.now(),
          F = resolvedModel,
          L = appendModelIfChanged([], resolvedModel);
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
                resolvedModel: F,
                modelsUsed: L,
              },
            });
        }
        let E = registerAgentForeground({
            outputFileReadable: HM(toolUseContext.options.tools),
            ownerCanContinueAgents: agentMetadata.callerCanContinueAgents,
            agentId: r,
            ownerAgentId: ownerAgentId,
            parentAgentId: parentAgentId,
            spawnDepth: agentDepth,
            description: agentDescription,
            prompt: agentPrompt,
            model: resolvedModel,
            selectedAgent: selectedAgent,
            taskRegistry: taskRegistry,
            parentAbortController: toolUseContext.abortController,
            toolUseId: toolUseContext.toolUseId,
            ...autoBackgroundOptions(backgroundLaunchGate, un),
            isDirectCall: !toolUseContext.innerCall && toolUseContext.hookCaller === void 0,
            cwd: An,
            spawnedSubagent: spawnTelemetry,
            ...(w && { launchedWithDefaults: lt, launchModel: Rn }),
          }),
          {
            taskId: taskId,
            cancelAutoBackground: cancelAutoBackground,
            abortController: abortController,
            detachParentAbortRelay: detachParentAbortRelay,
          } = E;
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
        let backgroundWait = { moved: !1 };
        logFeatureOk("subagent_launch");
        let agentMessages = [],
          forwardSubagentText = toolUseContext.options.forwardSubagentText,
          ce,
          ct = !1,
          gt = (message) => {
            if (backgroundWait.moved) return;
            if (message.type === "query_model_change") {
              ((F = message.toModel), (L = appendModelIfChanged(L, message.toModel)));
              return;
            }
            if (message.type === "spinner_mode") return;
            if (message.type !== "api_metrics" && message.type !== "set_in_progress_tool_use_ids")
              agentMessages.push(message);
            if (!onProgress) return;
            if (ce !== void 0 && !(message.type === "system" && message.subtype === "api_error"))
              ((ce = void 0),
                onProgress({
                  type: "progress",
                  toolUseID: `agent_${assistantMessage.message.id}`,
                  data: {
                    type: "agent_api_retry",
                    resolved: !0,
                    agentId: r,
                    agentType: selectedAgent.agentType,
                  },
                }));
            if (message.type === "api_metrics") {
              onProgress(message);
              return;
            }
            if (message.type === "set_in_progress_tool_use_ids") return;
            if (
              message.type === "progress" &&
              (message.data.type === "bash_progress" || message.data.type === "powershell_progress")
            )
              onProgress({ type: "progress", toolUseID: message.toolUseID, data: message.data });
            if (message.type === "system" && message.subtype === "api_error") {
              let K = categorizeRetryableAPIError(message.error),
                pe = `${message.source ?? "request_retry"}:${message.retryAttempt}:${message.maxRetries}:${K}`;
              if (pe !== ce)
                ((ce = pe),
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
                  }));
              return;
            }
            if (extractAgentIdsFromMessages_2(message)) {
              if (filterIncompleteToolCalls_2(toolUseContext, message))
                onProgress(createProgressMessage_2(message));
              return;
            }
            if (message.type !== "assistant" && message.type !== "user") return;
            if (message.type === "user" && message.isMeta && !ct) return;
            if (message.type === "assistant") ct = !0;
            if (message.type === "assistant") {
              let K = getAssistantMessageContentLength(message);
              if (K > 0) onProgress({ type: "response_length", op: "add", delta: K });
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
                  resolvedModel: F,
                  modelsUsed: L,
                },
              });
            }
          },
          ge = backgroundTasksAvailable
            ? void 0
            : setTimeout(
                (k) => {
                  if (k.toolUseId) k.emitToolProgress?.({ kind: "background_hint", toolUseId: k.toolUseId });
                },
                BACKGROUND_HINT_DELAY_MS,
                toolUseContext,
              ),
          pt = {},
          po = async () => ((pt = await cleanupAgentWorktree()), pt);
        (starting?.started({ agentId: r, model: resolvedModel }), timing?.mark("model"));
        let mo = runAsyncAgentLifecycle({
          taskId: taskId,
          abortController: abortController,
          makeStream: (k, K, pe) =>
            runAgent({
              ...runAgentParams,
              ...(w && { launchedWithDefaults: lt }),
              session: withProject,
              override: {
                ...runAgentParams.override,
                agentId: r,
                agentContext: R,
                abortController: abortController,
              },
              onCacheSafeParams: k,
              onQueryProgress: K,
              onStreamTokenEstimate: pe,
            }),
          metadata: agentMetadata,
          description: agentDescription,
          toolUseContext: toolUseContext,
          taskRegistry: taskRegistry,
          agentIdForCleanup: r,
          reviewTools: reviewTools,
          enableSummarization: getSdkAgentProgressSummariesEnabled(),
          getWorktreeResult: po,
          onMessage: gt,
          shouldNotifyOwner: () => backgroundWait.moved,
          onRunSettled: releaseConcurrencySlot,
        });
        Sn();
        let agentError, In;
        try {
          let k;
          try {
            k = await raceAgentLaunch(mo, E.backgroundSignal, un);
          } catch (error) {
            if (((k = "done"), error instanceof AbortError)) {
              let Xe = unwrapAbortReason(abortController.signal.reason) === "permission-stop";
              if (Xe) In = errorMessage(error);
              if (
                (logEvent("tengu_agent_tool_terminated", {
                  agent_type: agentTypeForTelemetry,
                  model: telemetrySafeModelName(agentMetadata.resolvedAgentModel),
                  final_model: telemetrySafeModelName(L.at(-1) ?? agentMetadata.resolvedAgentModel),
                  model_swapped: L.length > 1,
                  duration_ms: Date.now() - agentMetadata.startTime,
                  is_async: !1,
                  is_built_in_agent: agentMetadata.isBuiltInAgent,
                  agent_depth: agentMetadata.agentDepth,
                  reason: Xe ? lit("permission_stop_sync") : lit("user_cancel_sync"),
                }),
                !Xe)
              )
                spawnTelemetry.killed("user");
              if (!(abortController.signal.aborted && !toolUseContext.abortController.signal.aborted))
                throw error;
              agentError = toError(error);
            } else
              (logForDebugging(`Sync agent error: ${errorMessage(error)}`, { level: "error" }),
                (agentError = toError(error)));
          }
          if (
            !agentError &&
            settleBackgroundedAgent({
              outcome: k,
              registration: E,
              wait: backgroundWait,
              ownerAgentId: ownerAgentId,
              taskRegistry: taskRegistry,
              sessionScratch: toolUseContext.session.sessionScratch,
              agentTask: {
                armWorkerCheckinForBackgroundedAgent: recordWorkerCheckin,
                backgroundAgentTask: moveAgentToBackground,
                hasAgentChildKeepalive: hasChildAgents,
              },
            })
          ) {
            let re = !isWebFetchAgent(selectedAgent) && HM(toolUseContext.options.tools);
            return {
              data: {
                isAsync: !0,
                status: "async_launched",
                agentId: taskId,
                description: agentDescription,
                resolvedModel: F,
                ...(L.length > 1 && { modelsUsed: [...L] }),
                prompt: agentPrompt,
                outputFile: E.outputFile ?? "",
                canReadOutputFile: re,
                canContinueAgent: hasSendMessageTool(toolUseContext.options.tools),
                ...(_n && { sharesCwd: !0 }),
              },
            };
          }
          let last = agentMessages.findLast((re) => re.type !== "system" && re.type !== "progress");
          if (last && isSyntheticMessage(last))
            throw (
              logEvent("tengu_agent_tool_terminated", {
                agent_type: agentTypeForTelemetry,
                model: telemetrySafeModelName(agentMetadata.resolvedAgentModel),
                final_model: telemetrySafeModelName(L.at(-1) ?? agentMetadata.resolvedAgentModel),
                model_swapped: L.length > 1,
                duration_ms: Date.now() - agentMetadata.startTime,
                is_async: !1,
                is_built_in_agent: agentMetadata.isBuiltInAgent,
                agent_depth: agentMetadata.agentDepth,
                reason: lit("user_cancel_sync"),
              }),
              spawnTelemetry.cancelledAfterCompletion(),
              new AbortError()
            );
          let pe,
            zt = agentMessages;
          if (agentError) {
            let re;
            try {
              re = recoverFromSyncAgentError(agentError, agentMessages);
            } catch (error) {
              throw (spawnTelemetry.failed(), error);
            }
            ((pe = re.cutoffNote ?? In),
              (zt = re.history),
              logForDebugging(`Sync agent recovering from error with ${zt.length} messages`));
          }
          let fo = await buildAgentHandback(
            finalizeAgentTool(
              zt,
              r,
              { ...agentMetadata, modelsUsed: L },
              { suppressTelemetry: !agentError, handback: getPendingHandbackReport(taskRegistry.get(r), r) },
            ),
            {
              agentId: r,
              agentMessages: agentMessages,
              agentType: agentTypeForTelemetry,
              child: isForkLaunch ? "fork" : "agent",
              cutoffNote: pe,
              tools: reviewTools(),
              toolUseContext: toolUseContext,
            },
          );
          return {
            data: {
              status: "completed",
              prompt: agentPrompt,
              ...fo,
              ...pt,
              canContinueAgent: hasSendMessageTool(toolUseContext.options.tools),
            },
          };
        } finally {
          if (ge) clearTimeout(ge);
          if (toolUseContext.toolUseId)
            toolUseContext.emitToolProgress?.({ kind: "clear", toolUseId: toolUseContext.toolUseId });
          if ((cancelAutoBackground?.(), detachParentAbortRelay(), !backgroundWait.moved)) {
            Nwe(taskId);
            let k = taskRegistry.get(taskId),
              K = isLocalAgent(k) ? k.progress : void 0;
            (unregisterAgentForeground(taskId, taskRegistry),
              emitTaskNotification(
                taskId,
                k?.status === "failed" ? "failed" : k?.status === "killed" ? "stopped" : "completed",
                {
                  toolUseId: toolUseContext.toolUseId,
                  summary: agentDescription,
                  usage: {
                    total_tokens: K?.tokenCount ?? 0,
                    tool_uses: K?.toolUseCount ?? 0,
                    duration_ms: Date.now() - now,
                  },
                },
              ));
          }
        }
      }),
    );
    return Bt(G);
  }
}
/**
 * 后台任务是否被禁用：CLAUDE_CODE_DISABLE_BACKGROUND_TASKS 或 --bare 模式。
 */
//@ chunk-apw2zhyn.js:1372-1439 fingerprint = isBackgroundTasksDisabled (1)
function isBackgroundTasksDisabled() {
  return env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS || isBareMode();
}
/**
 * coordinator 模式或 CLAUDE_AUTO_BACKGROUND_TASKS 下解析 CLAUDE_CODE_WORKER_CHECKIN_SCHEDULE（逗号分隔秒数，1–86400）为毫秒数组。
 */
//@ chunk-e6aww6q8.js:4709491-4709738 fingerprint = getAutoBackgroundMs (0.638)
function getWorkerCheckinScheduleMs() {
  if (!isCoordinatorMode_2() && !env.CLAUDE_AUTO_BACKGROUND_TASKS) return;
  let e = env.CLAUDE_CODE_WORKER_CHECKIN_SCHEDULE?.split(",").map((n) => n.trim());
  if (!e?.every((n) => /^\d+$/.test(n) && Number(n) >= 1 && Number(n) <= 86400)) return;
  return e.map((n) => Number(n) * 1000);
}

export {
  agentOutputSchema,
  callAgentTool,
  tryAutoApproveWebFetchDispatch,
  isBackgroundTasksDisabled,
  getWorkerCheckinScheduleMs,
};
