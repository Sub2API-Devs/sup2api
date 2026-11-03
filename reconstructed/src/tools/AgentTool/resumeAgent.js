/**
 * tools/AgentTool/resumeAgent.ts
 *
 * resumeAgentBackground：以 fork 身份在后台启动继承上下文的子代理（技能/内部调用，非 Agent 工具）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/resumeAgent.ts
 * pieces: chunk-0m7em5b4.js (27)
 * attribution: placement 27
 */
import { promises } from "fs";
import {
  AgentTranscriptFetchError,
  updateAgentMetadata,
  isAgentTranscriptOverBound,
  jVs,
  hasAgentStopSibling,
  readAgentMetadata,
  flushSessionStorage,
  getAgentTranscript,
  canFetchAgentTranscriptsOnDemand,
  readAgentWorkerEvents,
  hasWrittenAgentTranscript,
  keepsAgentMetadataInStream,
  clearAgentStopSibling,
  landStoppedByUser,
} from "../../utils/sessionStorage.js";
import { isUnavailableErrorCode } from "../../utils/settings/managedEnvKeys.js";
import {
  getErrnoCode,
  storageCauseErrnoCode,
  isFsInaccessible,
  errorMessage,
  sanitizeErrnoTokenForTelemetry,
  isPathAbsent,
  isAbortError,
  AbortError,
  isFsInaccessibleCode,
} from "../../utils/errors.js";
import {
  unreadableStateMessage,
  Lr,
  isTranscriptChainIntact,
  findAgentLaunchResults,
  En,
  It,
  runResumeStartHooks,
  pluginDeclinedResumeMessage,
  observerToolset,
  tLr,
  autoBackgroundOptions,
  settleBackgroundedAgent,
  raceAgentLaunch,
} from "./agentLaunch.js";
import {
  NodeFsOperations,
  findIntermediateUncJunction,
  hasUntouchableRecordSpelling,
} from "../../utils/fsOperations.js";
import { Eh } from "../../utils/pathClassification.js";
import { ai, yl, isNetDir } from "../../utils/networkPaths.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import {
  getToolPermissionContext,
  withCommandRuleOverrides,
  getMainLoopModel,
} from "../../utils/permissions/toolPermissionContext.js";
import { hW } from "../../utils/agentProcessRegistry.js";
import { isTaskLoopSettled } from "../../tasks/taskLoopRegistry.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { Mr } from "../../utils/agentId.js";
import { logError } from "../../utils/log.js";
import {
  pruneSettledChildWork,
  hasChildAgents,
  hasPendingChildWork,
} from "../../tasks/LocalAgentTask/childWork.js";
import { releaseIfFinished, userStopCount, addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { withTimeout } from "../../utils/sleep.js";
import { D0e, admitsWakeSafe, runBackgroundLaunchRules } from "../../tasks/backgroundLaunchRules.js";
import {
  isDiskless,
  getProjectRootOrNull,
  getOriginalCwd,
  getConversationToolsUsed,
  getIsNonInteractiveSession,
  mainAgentId,
  getSdkAgentProgressSummariesEnabled,
  getInvokedSkills,
  addInvokedSkill,
} from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt, fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  parseAgentIdArg,
  NO_OWN_WORKDIR_MESSAGE,
  ObserverReportTool,
} from "../ObserverReportTool/ObserverReportTool.js";
import { kN } from "../../utils/safeIdentifier.js";
import {
  sanitizeMetadataText,
  AGENT_METADATA_ID_RE,
  makeSidecarReadFallback,
  UC,
} from "../../utils/agentMetadata.js";
import { isValidGitRefName } from "../../utils/git/refNames.js";
import { LD } from "../../utils/sessionAddresses.js";
import { readForkedSkillScoping, readForkedSkillName } from "../../skills/forkedSkillMarkers.js";
import {
  getCommands,
  describeSkillHiddenBehindPlugin,
  getBareCommandName,
  getBareCommandNameUnlessSynced,
} from "../../commands.js";
import { Z5, isHostCatalogSkill } from "../../utils/commandPredicates.js";
import {
  checkCommandSyncedAccess,
  qCe,
  LZ,
  gse,
  resolveSkillGitRoot,
} from "../../utils/claudeAiSync/syncedSkillAccess.js";
import { Lkt } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { splitRuleList } from "../../utils/permissions/disallowedToolsFlag.js";
import { armedAllowedToolsOf } from "../../utils/permissions/permissionsLoader.js";
import { exe } from "../../utils/attributionFileClasses.js";
import { resolveSpawnProvenanceMarks, filterOfferedAgents } from "../../plugins/functionHooks/agentHooks.js";
import { getAgentDepth, isHookOrPluginSteered, getWorkflowRunFields } from "../../utils/agentContext.js";
import { logForDebugging } from "../../utils/debug.js";
import { Vlr } from "../../utils/crossSessionMessages.js";
import { cKe } from "../../utils/conversationRecovery.js";
import { isOnlyPendingToolUse, assembleAgentToolPool, rue, runAgent } from "./runAgent.js";
import { trimIncompleteTail, endsWithUserPrompt } from "../../utils/backgroundHandoff.js";
import {
  filterThinkingOnlyUntilStable,
  normalizeMessagesForResume,
  regroupSplitResponsesOnResume,
  Hwt,
  createUserMessage,
  getContentText,
  isShutdownInterrupted,
  isInterruptionOnlyMessage,
  AGENT_SESSION_ENDED_INTERRUPT,
  TOOL_CALL_SESSION_ENDED,
} from "../../utils/messages.js";
import {
  dropApiInvalidAssistantBlocks,
  dropMalformedAttachments,
} from "../../utils/transcript/deserialize.js";
import { agentEvictAt } from "../../utils/task/framework.js";
import { getTaskOutputPath } from "../../utils/task/diskOutput.js";
import { reconstructForSubagentResume } from "../../utils/toolResultStorage.js";
import { WEB_FETCH_BUILTIN_AGENT } from "./built-in/webFetchAgent.js";
import { FORK_AGENT, isForkSubagentEnabled } from "./forkSubagent.js";
import { isBuiltInAgent, loadListedAgentDefinition, isPluginAgent } from "./loadAgentsDir.js";
import { GENERAL_PURPOSE_AGENT } from "./built-in/generalPurposeAgent.js";
import { isAgentToolPoolDenied, agentToolPoolDeniedMessage } from "../../utils/permissions/permissions.js";
import { isBackgroundAgentLaunchDisabled, C4 } from "./backgroundGates.js";
import { isWebFetchAgent } from "../WebFetchTool/harnessNotes.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { getCwd, M$, runWithCwdOverride, xDn } from "../../utils/cwd.js";
import { gitRootsForPath, R6, checkWorktreeIsolation } from "../../utils/worktreeIsolation.js";
import { WLe } from "../../utils/sessionRestoreCwd.js";
import { iTi, das } from "../../utils/concurrentSessions.js";
import { uniq } from "../../utils/collections.js";
import { isEffortLevel } from "../../utils/effort.js";
import { getSystemPrompt } from "../../constants/prompts.js";
import { u6 } from "../../utils/systemPrompt.js";
import { getAgentModel, getExploreAgentModel } from "../../utils/model/agent.js";
import { met } from "../../utils/contextAttachments/promptSnapshot.js";
import { resolveSubagentEffort, findForkTokenReminders } from "./subagentSpawn.js";
import {
  resolveTotalTokensReminderMode,
  getCalmMochiScope,
} from "../../utils/attachments/totalTokensReminder.js";
import { narrowerMode } from "../../utils/permissions/browserToolNames.js";
import { isMcpTool } from "../../services/mcp/utils.js";
import {
  waitForCoordinatorSubagentMcpServers,
  excludeCoordinatorCommsMcpTools,
} from "../../coordinator/coordinatorMcpServers.js";
import { resolveAgentTools, runAsyncAgentLifecycle } from "./agentToolUtils.js";
import { bN } from "../../services/accountMemory/memoryContext.js";
import { hasSendMessageTool } from "../SendMessageTool/constants.js";
import {
  isGlimmeringFinchGateOn,
  isSillyShoreGateOn,
  tagUntrustedArtifactContent,
  Tgi,
  jFe,
} from "../../utils/messages/untrustedArtifactContent.js";
import { Bbt, a3n, TZ, Z1t, adjustLastOffset } from "../../utils/agentListing.js";
import { classifyNonUserMessageSource } from "../../utils/messages/nonUserMessages.js";
import { Ree } from "../../utils/mcpOutputStorage.js";
import { x8t, markDirectDelivery, pendingTurnsForAgent, pki } from "../../utils/messageProvenance.js";
import { getQuerySourceForAgent } from "../../utils/promptCategory.js";
import { agentModelRestrictionNotifier } from "../../utils/model/agentModelRestriction.js";
import { appendAgentTranscriptMessage } from "../../tasks/LocalAgentTask/pendingMessages.js";
import { qB } from "../../utils/backgroundSessionResume.js";
import { HM } from "../../services/compact/compactCarry.js";
import {
  registerAgentForeground,
  registerAsyncAgent,
  killAsyncAgent,
  markAgentNotified,
  resolveVisibleSubagentId,
  notifyAgentReparented,
  isCurrentAgentId,
  resolveNotificationRecipient,
  recordWorkerCheckin,
  moveAgentToBackground,
} from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { buildUserResumedNotice } from "../../tasks/LocalAgentTask/agentHandback.js";
import { rearmObserverOnResume } from "../../services/agentObserver/agentObserver.js";
import { parsePluginIdentifier_2 } from "../../utils/plugins/pluginIdentifier.js";
import { getParentSessionId } from "../../utils/teammate.js";
import { isCoordinatorMode } from "../../coordinator/coordinatorMode.js";
import { getPendingHandbackReport, Nwe } from "./handbackReport.js";

//@ chunk-0m7em5b4.js:13597-13731 placement
function resumeReadError(e) {
  if (e instanceof ResumeAgentStateError) return e;
  let h =
      e instanceof AgentTranscriptFetchError ||
      isUnavailableErrorCode(getErrnoCode(e) ?? storageCauseErrnoCode(e)),
    w = isFsInaccessible(e) ? unreadableStateMessage(e, h) : errorMessage(e);
  return h ? new AgentResumeTransientError(w) : new ResumeAgentStateError(w);
}
//@ chunk-0m7em5b4.js:13731-13841 placement
function isResumeDenied(e) {
  return typeof e === "object" && e !== null && "deniedByPlugin" in e && typeof e.deniedByPlugin === "string";
}
//@ chunk-0m7em5b4.js:13841-13936 placement
var RESUMEDINLINE = "resumedInline",
  RESUMEDINLINEPRIORFOREIGNARTIFACTCONTENT = "resumedInlinePriorForeignArtifactContent",
  RESUMEDINLINESALVAGE = "resumedInlineSalvage";
//@ chunk-0m7em5b4.js:13936-13958 placement
class rn extends Map {}
//@ chunk-0m7em5b4.js:13958-14299 placement
var BACKGROUND_AGENTS_UNAVAILABLE =
    "Background agents cannot be started in this session right now. Send the message again if you still need this agent: it should then run while you wait, and its report will be that call's result.",
  xt = "This agent cannot be resumed in the background in this session. Start a new agent instead.",
  $r = /[<>\p{Cc}]|(?![\u200c\u200d])\p{Cf}/u;
//@ chunk-0m7em5b4.js:14299-14359 placement
function isMainConversationsOwnCall(e) {
  return e.agentId === void 0 && e.innerCall !== !0;
}
//@ chunk-0m7em5b4.js:14359-14422 placement
function isResumedInlineRunError(e) {
  return e instanceof Error && RESUMEDINLINE in e && e[RESUMEDINLINE] === !0;
}
//@ chunk-0m7em5b4.js:14422-14525 placement
function getResumeSalvage(e, h) {
  let w = e instanceof Error && RESUMEDINLINESALVAGE in e ? e[RESUMEDINLINESALVAGE] : void 0;
  return w instanceof rn ? w.get(h) : void 0;
}
//@ chunk-0m7em5b4.js:14525-14568 placement
function resumedInlineRunHandback(e, h) {
  return getResumeSalvage(e, h)?.handback;
}
//@ chunk-0m7em5b4.js:14568-14614 placement
function resumedInlineRunReviewTools(e, h) {
  return getResumeSalvage(e, h)?.reviewTools;
}
//@ chunk-0m7em5b4.js:14614-14681 placement
function resumedInlineRunHadPriorForeignContent(e) {
  return !(
    e instanceof Error &&
    RESUMEDINLINEPRIORFOREIGNARTIFACTCONTENT in e &&
    e[RESUMEDINLINEPRIORFOREIGNARTIFACTCONTENT] === !1
  );
}
//@ chunk-0m7em5b4.js:14681-14832 placement
class ResumeAgentStateError extends Error {
  transcriptMissing;
  constructor(e, h) {
    super(e);
    ((this.name = "ResumeAgentStateError"), (this.transcriptMissing = h?.transcriptMissing === !0));
  }
}
//@ chunk-0m7em5b4.js:14832-14861 placement
var GIT_WORKTREE_CREATE = "git_worktree_create";
//@ chunk-0m7em5b4.js:14861-14944 placement
class AgentResumeTransientError extends ResumeAgentStateError {
  constructor(e) {
    super(e);
    this.name = "AgentResumeTransientError";
  }
}
//@ chunk-0m7em5b4.js:14944-15036 placement
class AgentResumePermanentlyRefusedError extends ResumeAgentStateError {
  constructor(e) {
    super(e);
    this.name = "AgentResumePermanentlyRefusedError";
  }
}
//@ chunk-0m7em5b4.js:15036-15117 placement
class AgentStoppedByUserError extends ResumeAgentStateError {
  constructor(e) {
    super(e);
    this.name = "AgentStoppedByUserError";
  }
}
//@ chunk-0m7em5b4.js:15117-15201 placement
class AgentResumeInProgressError extends ResumeAgentStateError {
  constructor(e) {
    super(e);
    this.name = "AgentResumeInProgressError";
  }
}
//@ chunk-0m7em5b4.js:15201-15283 placement
class AgentStillStoppingError extends ResumeAgentStateError {
  constructor(e) {
    super(e);
    this.name = "AgentStillStoppingError";
  }
}
//@ chunk-0m7em5b4.js:15283-15326 placement
function resumeAgentBackground(e) {
  return resumeAgentExclusive(e, "notification");
}
/**
 * 是否为 inline 市场插件 ID（--plugin-dir 加载）。
 */
//@ chunk-0m7em5b4.js:15326-15364 placement = INLINE_MARKETPLACE (1)
function resumeAgentInline(e) {
  return resumeAgentExclusive(e, "inline");
}
//@ chunk-0m7em5b4.js:15364-15546 placement
function safeWorktreePath(e, h = NodeFsOperations) {
  return typeof e === "string" &&
    e !== "" &&
    !Eh(e) &&
    !ai(e) &&
    !yl(e) &&
    !isNetDir(e) &&
    !$r.test(e) &&
    findIntermediateUncJunction(h, e, { surfaceNetworkRaw: !0, unreadableAncestry: "unverified" }) === void 0
    ? e
    : void 0;
}
//@ chunk-0m7em5b4.js:15546-15583 placement
function resumeAgentForReply(e) {
  return resumeAgentExclusive(e, "reply");
}
//@ chunk-0m7em5b4.js:15583-15619 placement
function resumeAgentAtItsCall(e) {
  return resumeAgentExclusive(e, "call");
}
/**
 * 恢复后台代理的入口：同一 agentId 同时只能有一次恢复（resumesInFlight），再调用实际恢复流程。
 */
//@ chunk-0m7em5b4.js:15619-15847 placement
async function resumeAgentExclusive(e, h) {
  let { agentId: agentId } = e,
    { resumesInFlight: resumesInFlight } = getTaskRunState();
  if (resumesInFlight.has(agentId))
    throw new AgentResumeInProgressError(`Agent ${agentId} is already running or being resumed`);
  resumesInFlight.add(agentId);
  let S = !0,
    P = () => {
      if (S) ((S = !1), resumesInFlight.delete(agentId));
    };
  try {
    return await resumeAgent(e, h, P);
  } finally {
    P();
  }
}
/**
 * 恢复一个已停止/后台代理：校验停止状态与保存的会话记录、修补被关停打断的回合、处理插件钩子拒绝，再继续运行或只取结果。
 */
//@ chunk-0m7em5b4.js:15847-43509 placement
async function resumeAgent(
  {
    agentId: agentId,
    prompt: prompt,
    promptOrigin: promptOrigin,
    promptToolsUsed: promptToolsUsed,
    promptNoticeLengths: promptNoticeLengths,
    promptNoticeOwn: promptNoticeOwn,
    promptNoticeRunIds: promptNoticeRunIds,
    promptIsMeta: promptIsMeta,
    continueInterruptedTurn: continueInterruptedTurn,
    waitingToolUse: waitingToolUse,
    resultsOnly: resultsOnly,
    toolUseContext: toolUseContext,
    liveTranscript: liveTranscript,
    canUseTool: canUseTool,
    invokingRequestId: invokingRequestId,
    parentPromptId: parentPromptId,
    userInitiated: userInitiated,
    suppressOwnerNotification: suppressOwnerNotification,
    workerPermissionMode: workerPermissionMode,
    onDeliveryCommitted: onDeliveryCommitted,
    isWebFetchLaunch: isWebFetchLaunch,
  },
  W,
  Be,
) {
  let now = Date.now(),
    zt = !1,
    appState = toolUseContext.getAppState(),
    ie = getToolPermissionContext(toolUseContext),
    { taskRegistry: taskRegistry } = toolUseContext,
    mode = ie.mode,
    agentId_2 = toolUseContext.agentId;
  if (agentId_2 !== void 0 && hW(agentId_2))
    throw new AgentStillStoppingError(
      "This agent has been stopped and its stop is still completing; it cannot resume other agents.",
    );
  if (
    hW(agentId) ||
    (!isTaskLoopSettled(agentId) && isTerminalTaskStatus(taskRegistry.get(agentId)?.status ?? "running"))
  )
    throw new AgentStillStoppingError(
      `Agent ${agentId} is still stopping \u2014 its previous run was stopped but has not exited. Re-run ${TASKSTOP} on it or wait for it to exit before resuming.`,
    );
  let I = taskRegistry.get(agentId),
    $e = 0,
    now_2 = Date.now();
  if (isLocalAgent(I)) {
    let n = !1;
    if (
      (taskRegistry.update(agentId, (y) => {
        if (y.status === "running" || y.resuming) return y;
        return ((n = !0), ($e = y.userStopCount ?? 0), { ...y, resuming: !0 });
      }),
      !n)
    )
      throw new AgentResumeInProgressError(`Agent ${agentId} is already running or being resumed`);
  }
  let In = () => {
      taskRegistry.update(agentId, (n) => (n.resuming ? { ...n, resuming: !1 } : n));
    },
    $n = !1,
    T = () => {
      if ((In(), $n))
        updateAgentMetadata(Mr(agentId), { finished: !0 }, toolUseContext.storageV5).catch(logError);
      (pruneSettledChildWork(agentId, taskRegistry), releaseIfFinished(agentId, taskRegistry));
    },
    an = () => (
      logFeatureBad("subagent_launch", "subagent_resume_transcript_over_bound"),
      T(),
      new AgentResumePermanentlyRefusedError(
        `Agent ${agentId}'s earlier transcript is too large to load, or has a row with a malformed timestamp. Sending the message again will not help. Start a new agent if the work is still needed.`,
      )
    );
  if (isAgentTranscriptOverBound(agentId)) throw an();
  let Wn = (n) => {
      let y = sanitizeErrnoTokenForTelemetry(getErrnoCode(n) ?? storageCauseErrnoCode(n));
      return y && { errno: y };
    },
    qt = (n) => (
      logFeatureBad("subagent_launch", "subagent_resume_stop_probe_failed", Wn(n)),
      T(),
      jVs(n)
        ? new AgentResumeTransientError(unreadableStateMessage(n, !0))
        : new ResumeAgentStateError(unreadableStateMessage(n, !1))
    ),
    dn =
      promptOrigin?.kind === "observer-activity"
        ? { found: !1 }
        : await hasAgentStopSibling(Mr(agentId), "stoppedByUser", toolUseContext.storageV5).then(
            (n) => ({ found: n }),
            (n) => ({ found: !1, err: n }),
          ),
    Hn = userInitiated || promptOrigin?.kind === "observer-activity" ? void 0 : isPathAbsent,
    jn = readAgentMetadata(Mr(agentId), toolUseContext.storageV5, Hn),
    xn = async () => (
      await withTimeout(flushSessionStorage(), Lr, "agent resume: transcript flush wait").catch(() => {}),
      getAgentTranscript(Mr(agentId), toolUseContext.storageV5, {
        signal: toolUseContext.abortController.signal,
      })
    ),
    G = D0e(),
    Un = isDiskless() && !isLocalAgent(I) && G === void 0,
    Gn = isDiskless() ? jn.then((n) => (n === null || Un ? null : xn())) : xn(),
    [Qt, s] = await Promise.all([
      Gn,
      jn.then((n) =>
        n === null && !isDiskless() && canFetchAgentTranscriptsOnDemand()
          ? Gn.then(() => readAgentMetadata(Mr(agentId), toolUseContext.storageV5, Hn))
          : n,
      ),
    ]).catch((n) => {
      if (isAbortError(n)) throw (T(), n);
      if (isAgentTranscriptOverBound(agentId)) throw an();
      if (n instanceof AgentTranscriptFetchError && n.outcome === "body_encoded")
        throw (
          logFeatureBad("subagent_launch", "subagent_resume_transcript_body_encoded"),
          T(),
          new AgentResumeTransientError(
            `Agent ${agentId}'s earlier transcript arrived in an encoding that was not asked for, so it was not read. Send the message again, or start a new agent if that fails too.`,
          )
        );
      throw (
        logFeatureBad("subagent_launch", "subagent_resume_setup_read_failed", Wn(n)),
        T(),
        resumeReadError(n)
      );
    });
  if (toolUseContext.abortController.signal.aborted) throw (T(), new AbortError());
  logEvent("tengu_subagent_resume_sidecar_read", {
    metadata_found: s !== null,
    prompt_origin_kind: fromEnumOpt(promptOrigin?.kind),
    has_task_record: isLocalAgent(I),
    continue_interrupted_turn: continueInterruptedTurn === !0,
    resumer_is_subagent: agentId_2 !== void 0,
    storage_v5: toolUseContext.storageV5 !== void 0,
  });
  let zn = W === "notification" && G !== void 0 && admitsWakeSafe(G, agentId),
    Kn = W === "notification" && G !== void 0 && !zn;
  if (s === null && isDiskless())
    throw (
      logFeatureBad("subagent_launch", "subagent_resume_sidecar_missing_diskless"),
      T(),
      new AgentResumePermanentlyRefusedError(
        `This session has no saved settings for agent ${agentId}: it never ran here, or they did not survive a restart of the server that runs the session. Start a new agent if the work is still needed.`,
      )
    );
  let We = parseAgentIdArg(s?.cwd),
    qn =
      isDiskless() &&
      ((s?.worktreePath ?? void 0) !== void 0 ||
        (s?.inheritedWorktreePath ?? void 0) !== void 0 ||
        s?.spawnedWithWorktree === !0)
        ? NO_OWN_WORKDIR_MESSAGE
        : void 0;
  if (We !== void 0 || qn !== void 0)
    throw (
      logFeatureBad(
        "subagent_launch",
        We !== void 0 ? "subagent_resume_cwd_refused" : "subagent_resume_worktree_refused",
      ),
      T(),
      new AgentResumePermanentlyRefusedError(
        We !== void 0
          ? `Cannot resume this agent in the directory its record names: ${We}. Start a new agent instead.`
          : `Cannot resume this agent, which was started in a worktree: ${qn}. Start a new agent instead.`,
      )
    );
  let Qn = kN(s?.toolUseId),
    un = sanitizeMetadataText(s?.description),
    ln =
      typeof s?.worktreeBranch === "string" && isValidGitRefName(s.worktreeBranch)
        ? s.worktreeBranch
        : void 0,
    ue = typeof s?.name === "string" && AGENT_METADATA_ID_RE.test(s.name) && !LD(s.name) ? s.name : void 0;
  if ("err" in dn && !userInitiated && !s?.stoppedByUser) throw qt(dn.err);
  let found = dn.found;
  if ((s?.stoppedByUser || found) && promptOrigin?.kind !== "observer-activity") {
    if (!userInitiated)
      throw (
        T(),
        new AgentStoppedByUserError(
          `Agent ${agentId} was stopped by the user and won't be resumed. Treat its work as cancelled; only launch a new agent if the user explicitly asks.`,
        )
      );
  }
  if (Un)
    throw (
      logFeatureBad("subagent_launch", "subagent_resume_no_rule_diskless"),
      T(),
      new AgentResumePermanentlyRefusedError(
        `Background agents are switched off in this session, and it no longer tracks agent ${agentId}, so the agent cannot be resumed. Start a new agent if the work is still needed.`,
      )
    );
  let x = await readForkedSkillScoping(Mr(agentId), toolUseContext.storageV5),
    cn = "transientRead" in x && x.transientRead ? AgentResumeTransientError : ResumeAgentStateError;
  if (x.status === "malformed")
    throw (
      logFeatureBad("subagent_launch", "forked_skill_resume_scoping_invalid"),
      T(),
      new cn(
        `Agent ${agentId} has a malformed forked-skill scoping record; refusing to resume it without the skill's permission scoping.`,
      )
    );
  if (x.status === "diskless")
    throw (
      logFeatureBad("subagent_launch", "forked_skill_resume_scoping_diskless"),
      T(),
      new ResumeAgentStateError(
        `Agent ${agentId} cannot be checked for a forked-skill scoping record: this diskless session has no storage backend or key for it. Refusing to resume it.`,
      )
    );
  if (
    (x.status === "absent" || x.status === "absent-but-marked") &&
    isLocalAgent(I) &&
    I.forkedSkillName !== void 0
  )
    throw (
      logFeatureBad("subagent_launch", "forked_skill_resume_scoping_missing"),
      T(),
      new cn(
        `Agent ${agentId} ran as a forked skill but its scoping record is missing; refusing to resume it without the skill's permission scoping.`,
      )
    );
  if (x.status === "absent-but-marked")
    throw (
      logFeatureBad("subagent_launch", "forked_skill_resume_scoping_missing_cold"),
      T(),
      new cn(
        `Agent ${agentId} carries a forked-skill provenance marker but its scoping record is missing; refusing to resume it without the skill's permission scoping.`,
      )
    );
  if (x.status === "valid" && isLocalAgent(I)) {
    if (I.forkedSkillName !== x.scoping.skillName)
      throw (
        logFeatureBad("subagent_launch", "forked_skill_resume_scoping_mismatch"),
        T(),
        new ResumeAgentStateError(
          `Agent ${agentId} has a forked-skill scoping record that does not match its task record; refusing to resume it.`,
        )
      );
  } else if (x.status === "valid") {
    if ((await readForkedSkillName(Mr(agentId), toolUseContext.storageV5)) !== x.scoping.skillName)
      throw (
        logFeatureBad("subagent_launch", "forked_skill_resume_cold_witness_mismatch"),
        T(),
        new ResumeAgentStateError(
          `Agent ${agentId} has a forked-skill scoping record with no matching provenance-marker witness; refusing to resume it on a cold path without a corroborated fork identity.`,
        )
      );
  }
  if (x.status !== "valid");
  let B = x.status === "valid" ? x.scoping : void 0,
    He = [],
    je = [],
    fn,
    mn,
    Jn;
  if (B) {
    let n = await getCommands(getProjectRootOrNull(), toolUseContext.storageV5).catch(() => []),
      filtered = toolUseContext
        .getAppState()
        .mcp.commands.filter((command) => command.type === "prompt" && command.loadedFrom === "mcp"),
      found = [...Z5(n, toolUseContext.getAppState().mcp.commands), ...filtered].find(
        (L) => L.name === B.skillName && L.type === "prompt",
      );
    if (found?.type === "prompt" && found.isKeptUnread === !0)
      throw (
        found.loadDefinition?.().catch(() => {}),
        logFeatureBad("subagent_launch", "forked_skill_resume_skill_unread"),
        T(),
        new AgentResumeTransientError(
          `Agent ${agentId} ran as forked skill ${B.skillName}, whose file has not been read since a reload kept it; refusing to resume it before it is. Try again shortly.`,
        )
      );
    if (found?.type !== "prompt" || (found.context !== "fork" && found.getContext === void 0))
      throw (
        logFeatureBad("subagent_launch", "forked_skill_resume_skill_unresolved"),
        T(),
        new ResumeAgentStateError(
          `Agent ${agentId} ran as forked skill ${B.skillName}, which no longer resolves to a fork-capable skill; refusing to resume it without its permission scoping.`,
        )
      );
    let Te = describeSkillHiddenBehindPlugin(found);
    if (Te !== void 0)
      throw (
        logFeatureBad("subagent_launch", "forked_skill_resume_hidden_behind_plugin"),
        T(),
        new ResumeAgentStateError(
          `Agent ${agentId} ran as forked skill ${B.skillName}; refusing to resume it: ${Te}`,
        )
      );
    let me = await checkCommandSyncedAccess(found).catch((L) => {
      throw (T(), L instanceof ResumeAgentStateError ? L : new ResumeAgentStateError(errorMessage(L)));
    });
    if (qCe(found)) {
      let L = isHostCatalogSkill(found);
      throw (
        logFeatureBad(
          "subagent_launch",
          L ? "forked_skill_resume_host_catalog_withheld" : "forked_skill_resume_sync_vetoed",
        ),
        T(),
        new ResumeAgentStateError(
          L
            ? `Agent ${agentId} ran as forked skill ${B.skillName}, which your organization's Skills setting currently turns off; refusing to resume it.`
            : `Agent ${agentId} ran as forked skill ${B.skillName}, an account-synced skill that is currently disabled (skills sync turned off or denied by policy); refusing to resume it.`,
        )
      );
    }
    if (LZ(me))
      throw (
        gse(found, me),
        logFeatureBad("subagent_launch", "forked_skill_resume_synced_plugin_refused", {
          reason: fromEnum(me),
        }),
        T(),
        new ResumeAgentStateError(
          `Agent ${agentId} ran as forked skill ${B.skillName}; refusing to resume it: ${Lkt(me)}.`,
        )
      );
    ((He = splitRuleList(
      await armedAllowedToolsOf(found).catch((L) => {
        throw (
          logFeatureBad("subagent_launch", "forked_skill_resume_allowed_tools_failed"),
          T(),
          L instanceof ResumeAgentStateError ? L : new ResumeAgentStateError(errorMessage(L))
        );
      }),
    )),
      (je = splitRuleList(found.disallowedTools ?? [])),
      (fn = getBareCommandName(found)),
      (mn = getBareCommandNameUnlessSynced(found)),
      (Jn = exe(mn) === null ? void 0 : await resolveSkillGitRoot(found, null)));
  }
  let Yt = B
      ? (B.frozenCommandDenies ??
        toolUseContext.getAppState().toolPermissionContext.alwaysDenyRules.command ??
        [])
      : void 0,
    Xn = B
      ? [
          ...(He.length === 0 ? [] : [{ kind: "allowed_tools", allowedTools: He }]),
          ...(je.length === 0 ? [] : [{ kind: "disallowed_tools", disallowedTools: je }]),
        ]
      : [],
    Zn = resolveSpawnProvenanceMarks(agentId, s, toolUseContext),
    xe = { ...toolUseContext, ...Zn.marks },
    Ue = B
      ? {
          ...xe,
          getAppState: withCommandRuleOverrides(toolUseContext.getAppState, He, je, {
            replaceCommandRules: !0,
            frozenCommandDenies: Yt,
          }),
          permissionLayers:
            Xn.length > 0
              ? [...(toolUseContext.permissionLayers ?? []), ...Xn]
              : toolUseContext.permissionLayers,
        }
      : xe,
    U = taskRegistry.get(agentId),
    we = isLocalAgent(U) ? U.result : void 0,
    Jt = we?.modelsUsed ?? (we?.resolvedModel ? [we.resolvedModel] : void 0),
    ye = (isLocalAgent(U) ? U.spawnDepth : s?.spawnDepth) ?? getAgentDepth(toolUseContext.agentContext) + 1,
    Xt = isLocalAgent(U) ? U.startTime : now,
    z = Qt;
  if (!z) {
    let n = taskRegistry.getTranscript(agentId)?.messages;
    if (n && n.length > 0)
      (logForDebugging(
        `[resumeAgentBackground ${agentId}] disk transcript missing; using ${n.length} in-memory messages mirrored during the run`,
      ),
        (z = {
          messages: n.map((y) =>
            y.type === "user" &&
            y.isMeta !== !0 &&
            y.origin?.kind === "coordinator" &&
            typeof y.message.content === "string"
              ? { ...y, isMeta: !0, message: { ...y.message, content: Vlr(y.message.content) } }
              : y,
          ),
          contentReplacements: [],
        }));
  }
  if (!z)
    throw (
      logFeatureBad("subagent_launch", "subagent_resume_transcript_missing"),
      T(),
      new ResumeAgentStateError(`No transcript found for agent ID: ${agentId}`, { transcriptMissing: !0 })
    );
  if (isDiskless() && !isLocalAgent(I) && !Kn) {
    let { signal: signal } = toolUseContext.abortController,
      y =
        (await readAgentWorkerEvents(agentId, signal).catch((b) => {
          if (!signal.aborted) logError(b);
          return null;
        })) ?? null;
    if (signal.aborted) throw (T(), new AbortError());
    if (isAgentTranscriptOverBound(agentId)) throw an();
    if (y === null || (y.length === 0 && !hasWrittenAgentTranscript(agentId)))
      throw (
        logFeatureBad(
          "subagent_launch",
          y === null ? "subagent_resume_transcript_read_failed" : "subagent_resume_transcript_stored_empty",
        ),
        T(),
        new AgentResumeTransientError(
          `Agent ${agentId}'s stored transcript could not be read, or is empty. Send the message again, or start a new agent if that fails too.`,
        )
      );
    if (
      !isTranscriptChainIntact(
        y,
        z.messages.map((message) => message.uuid),
      )
    )
      throw (
        logFeatureBad("subagent_launch", "subagent_resume_transcript_gap"),
        T(),
        new AgentResumePermanentlyRefusedError(
          `Part of agent ${agentId}'s transcript is missing, so it cannot go on from where it stopped. Start a new agent if the work is still needed.`,
        )
      );
  }
  cKe(z.messages);
  let be =
    continueInterruptedTurn === !0 &&
    waitingToolUse !== void 0 &&
    isOnlyPendingToolUse(z.messages, waitingToolUse.id);
  if (!be) waitingToolUse?.settled();
  let Zt = continueInterruptedTurn
      ? be
        ? z.messages
        : [...trimIncompleteTail(z.messages)]
      : z.messages.map((message) => repairShutdownInterruptedTurn(message, agentId)),
    K = filterThinkingOnlyUntilStable(
      normalizeMessagesForResume(
        regroupSplitResponsesOnResume(
          dropApiInvalidAssistantBlocks(dropMalformedAttachments(Zt), { site: "agent_resume" }),
        ),
        be ? new Set([waitingToolUse.id]) : void 0,
      ),
    );
  if (continueInterruptedTurn && !be && K.length > 0 && !endsWithUserPrompt(K))
    return (
      taskRegistry.update(agentId, (n) => ({
        ...n,
        resuming: !1,
        notified: !0,
        evictAfter: agentEvictAt(n),
      })),
      logFeatureOk("subagent_launch"),
      {
        agentId: agentId,
        description: un ?? "(resumed)",
        outputFile: isDiskless() ? void 0 : getTaskOutputPath(agentId),
        alreadyCompleted: !0,
      }
    );
  let er = reconstructForSubagentResume(toolUseContext.contentReplacementState, K, z.contentReplacements),
    Ve =
      !s &&
      ((isLocalAgent(U) &&
        (U.agentType === WEB_FETCH_BUILTIN_AGENT.agentType || U.webFetchSavedFiles !== void 0)) ||
        isWebFetchLaunch === !0 ||
        findAgentLaunchResults(toolUseContext.messages, agentId))
        ? WEB_FETCH_BUILTIN_AGENT.agentType
        : s?.agentType,
    Y =
      s?.isFork === !0
        ? void 0
        : Ve
          ? toolUseContext.options.agentDefinitions.activeAgents.find(
              (activeAgent) => activeAgent.agentType === Ve,
            )
          : void 0,
    C = s?.isFork === !0 || (!Y && s?.isFork === void 0 && s?.agentType === FORK_AGENT.agentType),
    nt = Ve === WEB_FETCH_BUILTIN_AGENT.agentType && s?.isBuiltIn !== !1;
  if (
    (isDiskless() || En(agentId) || (s === null && keepsAgentMetadataInStream() && !It(agentId))) &&
    (!Y || (s?.isBuiltIn !== void 0 && s.isBuiltIn !== isBuiltInAgent(Y))) &&
    s?.isFork !== !0 &&
    !nt &&
    !Kn
  ) {
    if ((T(), s === null))
      throw (
        logFeatureBad(
          "subagent_launch",
          En(agentId) ? "subagent_resume_sidecar_missing_held" : "subagent_resume_sidecar_missing_gate_on",
        ),
        new AgentResumePermanentlyRefusedError(
          `This session no longer has the saved settings of agent ${agentId}, so it cannot be resumed as the type it ran as. Start a new agent if the work is still needed.`,
        )
      );
    throw (
      logFeatureBad(
        "subagent_launch",
        isDiskless() ? "subagent_resume_type_unmatched_diskless" : "subagent_resume_type_unmatched_held",
      ),
      new AgentResumeTransientError(
        `The agent type that agent ${agentId} ran as is not on this session's list right now, or its name now belongs to a different type. Try once more; if that fails too, start a new agent.`,
      )
    );
  }
  let tt = nt
      ? Y && isBuiltInAgent(Y)
        ? Y
        : WEB_FETCH_BUILTIN_AGENT
      : s?.isBuiltIn === !1 && Ve === WEB_FETCH_BUILTIN_AGENT.agentType
        ? Y && !isBuiltInAgent(Y)
          ? Y
          : GENERAL_PURPOSE_AGENT
        : (Y ?? (C ? FORK_AGENT : GENERAL_PURPOSE_AGENT)),
    J = await loadListedAgentDefinition(tt, toolUseContext.abortController.signal).catch((n) => {
      if ((T(), isAbortError(n))) throw n;
      throw (
        logFeatureBad("subagent_launch", "subagent_resume_plugin_load_threw"),
        new AgentResumeTransientError(errorMessage(n))
      );
    });
  if (J === void 0)
    throw (
      logFeatureBad("subagent_launch", "subagent_resume_plugin_load_failed"),
      T(),
      new ResumeAgentStateError(
        `Agent type '${tt.agentType}' could not be loaded from its plugin, so the agent was not resumed.`,
      )
    );
  if (isAgentToolPoolDenied(J, ie))
    throw (
      logFeatureBad("subagent_launch", "subagent_resume_tools_denied"),
      T(),
      new ResumeAgentStateError(agentToolPoolDeniedMessage(J.agentType))
    );
  if ((await filterOfferedAgents([J])).length !== 1)
    throw (
      logFeatureBad("subagent_launch", "subagent_resume_not_offered"),
      T(),
      new ResumeAgentStateError(`Agent type '${J.agentType}' is not offered in this session.`)
    );
  let Ae =
      G !== void 0 &&
      (zn || (W === "reply" && toolUseContext.toolUseId !== void 0 && s?.requestShape !== "foreground")) &&
      !isBackgroundAgentLaunchDisabled() &&
      !isWebFetchAgent(J)
        ? runBackgroundLaunchRules(G, {
            toolUseId: toolUseContext.toolUseId,
            callerAgentId: toolUseContext.agentId,
            signal: toolUseContext.abortController.signal,
            resumedAgentId: agentId,
          })
        : void 0,
    ee = W === "inline" || W === "call" || (W === "reply" && ((C4() && Ae === void 0) || isWebFetchAgent(J))),
    pn =
      ee && (W === "call" || (W === "reply" && G !== void 0)) && isMainConversationsOwnCall(toolUseContext);
  if (!ee && G !== void 0 && Ae === void 0)
    throw (
      logFeatureBad("subagent_launch", "subagent_resume_background_rule"),
      T(),
      new AgentResumePermanentlyRefusedError(xt)
    );
  let se = un ?? "(resumed)",
    gn =
      promptOrigin?.kind === "observer-activity"
        ? void 0
        : await runResumeStartHooks(agentId, {
            tool_use_id: toolUseContext.toolUseId ?? "",
            parentModel: getMainLoopModel(toolUseContext),
            parentAgentId: agentId_2,
            signal: toolUseContext.abortController.signal,
            origin: toolUseContext.hookOrigin,
            agent: J,
            prompt: continueInterruptedTurn ? "" : prompt,
            description: se,
            model: !C && !s?.isObserver && typeof s?.model === "string" ? s.model : void 0,
            permissionMode: mode,
            background: !ee,
            fork: C,
            name: ue,
            cwd: s?.cwd && !hasUntouchableRecordSpelling(s.cwd) ? s.cwd : void 0,
          }).catch((n) => {
            if ((T(), !isAbortError(n)))
              logFeatureBad("subagent_launch", "subagent_resume_spawn_chain_failed");
            throw n;
          });
  using nr = gn?.starting;
  if (gn?.deny !== void 0)
    return (
      logFeatureBad("subagent_launch", "subagent_resume_denied_by_hook"),
      In(),
      { agentId: agentId, description: se, deniedByPlugin: pluginDeclinedResumeMessage(gn.deny) }
    );
  let ze = (n, y) => {
      let b = getCurrentWorktreeSession(),
        Te = s?.cwd && !hasUntouchableRecordSpelling(s.cwd) ? s.cwd : getCwd(),
        me = gitRootsForPath(Te),
        L =
          b !== null &&
          me.length > 0 &&
          (() => {
            let gr = [
              b.worktreePath,
              ...gitRootsForPath(b.originalCwd),
              ...(b.liveLaunchAnchor ? [b.liveLaunchAnchor, ...gitRootsForPath(b.liveLaunchAnchor)] : []),
              WLe,
              ...gitRootsForPath(WLe),
            ];
            return me.every((hr) => gr.some((kr) => R6(hr, kr) === "same"));
          })(),
        Mt = y?.telemetryCode ?? "git_worktree_resume_worktree_gone",
        pr = s?.worktreePath ?? `agent ${agentId}`;
      if (L) {
        (logFeatureSad(GIT_WORKTREE_CREATE, Mt),
          logForDebugging(
            `Resumed worktree ${pr} ${n}; falling back to ${Te} under the session worktree's fences`,
            { level: "error" },
          ));
        return;
      }
      if (y?.terminalOnUncovered === !1)
        throw (
          T(),
          new AgentResumeTransientError(
            `Cannot resume this agent right now: its worktree ${n}, and the fallback directory is not covered by the session's isolation fences. Re-run from a session whose fences cover the agent's directory.`,
          )
        );
      throw (
        logFeatureBad(GIT_WORKTREE_CREATE, Mt),
        T(),
        new AgentResumePermanentlyRefusedError(
          `This agent cannot be resumed: its worktree ${n}, and the fallback directory is not covered by the session's isolation fences.`,
        )
      );
    },
    tr = safeWorktreePath(s?.worktreePath),
    rr = safeWorktreePath(s?.inheritedWorktreePath),
    Ke = tr ?? rr,
    Se = Ke
      ? await promises.stat(Ke).then(
          (n) => (n.isDirectory() ? Ke : ze("exists but is not a directory")),
          (n) => {
            let y = getErrnoCode(n);
            if (y === "ENOENT" || y === "ENOTDIR") return ze("no longer exists");
            throw (
              T(),
              new AgentResumeTransientError(
                `Cannot resume this agent: its worktree could not be examined (${String(y ?? "unknown error")}). Re-run once the directory is accessible.`,
              )
            );
          },
        )
      : void 0;
  if (
    Ke === void 0 &&
    !iTi(agentId) &&
    ((s !== null &&
      s.spawnedWithWorktree === !0 &&
      s.worktreeCleanlyRemoved !== !0 &&
      !(
        s.inheritedWorktreePath !== void 0 &&
        s.parentAgentId !== void 0 &&
        (
          await readAgentMetadata(Mr(s.parentAgentId), toolUseContext.storageV5).catch(
            makeSidecarReadFallback("resumeAgentBackground (parent)"),
          )
        )?.worktreeCleanlyRemoved === !0
      )) ||
      das(agentId))
  )
    ze("is not recorded for this isolated agent", {
      telemetryCode: "git_worktree_resume_binding_missing",
      terminalOnUncovered: das(agentId),
    });
  let le = Se;
  if (Se) {
    let n = getOriginalCwd(),
      y = await promises.realpath(n).catch(() => n),
      b = await checkWorktreeIsolation(Se, gitRootsForPath(n), uniq([y, WLe, ...gitRootsForPath(WLe)]), {
        requireWitnessForSelfOwningPins: !0,
        declineSelfOwningPinUnderLiveRoot: !0,
      });
    if (!b.ok) {
      if ((T(), b.reason !== "unverifiable" && b.reason !== "pin-is-own-launch-tree"))
        throw (
          logFeatureBad(GIT_WORKTREE_CREATE, "git_worktree_create_root_rejected"),
          logForDebugging(
            `[worktree] refusing to resume parked agent into ${Se} (${b.reason}): ${b.message}`,
            { level: "error" },
          ),
          new AgentResumePermanentlyRefusedError(
            `This agent cannot be resumed: its worktree was refused (${b.reason}). ${b.message}`,
          )
        );
      throw (
        logForDebugging(
          `[worktree] could not verify parked agent worktree ${Se} this attempt; the resume will retry: ${b.message}`,
        ),
        new AgentResumeTransientError(
          `Cannot resume this agent right now: its worktree could not be verified (${b.reason}). Re-run once git can answer.`,
        )
      );
    }
  }
  if (le) {
    let date = new Date();
    try {
      await promises.utimes(le, date, date);
    } catch (error) {
      let b = getErrnoCode(error);
      if (b === "ENOENT" || b === "ENOTDIR") le = ze("vanished between verification and the resume");
      else
        throw (
          T(),
          new AgentResumeTransientError(
            `Cannot resume this agent: its worktree could not be touched (${String(b ?? "unknown error")}). Re-run once the directory is accessible.`,
          )
        );
    }
  }
  let rt = s?.cwd && !hasUntouchableRecordSpelling(s.cwd) ? s.cwd : le,
    withProject = toolUseContext.session.withProject({
      cwd: rt ?? (toolUseContext.session.project === null ? void 0 : getCwd()),
    });
  if (withProject.project === null && M$())
    throw (
      logFeatureBad("subagent_launch", "subagent_resume_no_directory_in_cwd_scope"),
      T(),
      new AgentResumePermanentlyRefusedError(
        "This agent cannot be resumed from here in this session. Do the rest of the task without it.",
      )
    );
  let sr = s?.effort !== void 0 && isEffortLevel(s.effort) ? s.effort : void 0,
    st = s?.isObserver || C ? void 0 : sr,
    ot = B?.effort ?? st,
    N = ot !== void 0 ? { ...J, effort: ot } : J,
    Qe;
  if (C) {
    if (toolUseContext.renderedSystemPrompt) Qe = toolUseContext.renderedSystemPrompt;
    else
      try {
        let n = appState.agent
            ? appState.agentDefinitions.activeAgents.find(
                (activeAgent) => activeAgent.agentType === appState.agent,
              )
            : void 0,
          y = await getSystemPrompt(toolUseContext.options.tools, toolUseContext.options.mainLoopModel);
        Qe = u6({
          mainThreadAgentDefinition: n,
          toolUseContext: toolUseContext,
          customSystemPrompt: toolUseContext.options.customSystemPrompt,
          defaultSystemPrompt: y,
          appendSystemPrompt: toolUseContext.options.appendSystemPrompt,
        });
      } catch (error) {
        throw (
          logFeatureBad("subagent_launch", "subagent_resume_fork_prompt_reconstruct_failed"),
          T(),
          error instanceof ResumeAgentStateError ? error : new ResumeAgentStateError(errorMessage(error))
        );
      }
    if (!Qe)
      throw (
        logFeatureBad("subagent_launch", "subagent_resume_fork_prompt_missing"),
        T(),
        new ResumeAgentStateError("Cannot resume fork agent: unable to reconstruct parent system prompt")
      );
  }
  let it = getMainLoopModel(toolUseContext),
    Ye = getAgentModel(
      getExploreAgentModel(N, it),
      it,
      s?.isObserver ? void 0 : C ? "inherit" : s?.model,
      mode,
    ),
    kn = met(K, Ue.options)?.systemPrompt,
    he =
      s?.isObserver || B !== void 0
        ? void 0
        : resolveSubagentEffort({
            agentDefinition: N,
            isFork: C,
            model: Ye,
            effortState: Ue.getAppState(),
            inheritedLayers: Ue.permissionLayers,
            recordedBudgetText: C ? findForkTokenReminders(K) : kn,
          });
  N = he?.agentDefinition ?? N;
  let at = he === void 0 && kn ? resolveTotalTokensReminderMode(void 0, kn) : void 0;
  if (promptOrigin?.kind === "observer-activity" && s?.isObserver !== !0)
    throw (
      logFeatureBad("subagent_launch", "observer_resume_sidecar_unconfirmed"),
      T(),
      new ResumeAgentStateError(
        `Observer sidecar for ${agentId} missing or did not confirm isObserver; refusing delivery`,
      )
    );
  let or = s?.isObserver ? (narrowerMode(workerPermissionMode, mode) ?? mode) : void 0,
    filtered = toolUseContext.options.tools.filter(isMcpTool);
  if (!C && !s?.isObserver)
    await waitForCoordinatorSubagentMcpServers(() => toolUseContext.getAppState().mcp);
  let appState_2 = toolUseContext.getAppState(),
    ar = C
      ? excludeCoordinatorCommsMcpTools(toolUseContext.options.tools)
      : assembleAgentToolPool(toolUseContext, ie, appState_2.mcp.tools.concat(filtered)),
    wn = s?.isObserver
      ? observerToolset(
          resolveAgentTools(
            N,
            assembleAgentToolPool(toolUseContext, ie, filtered),
            !0,
            !1,
            !1,
            ye,
            bN(toolUseContext).mode,
          ).resolvedTools,
        )
      : ar,
    dr =
      promptOrigin?.kind === "peer" &&
      !hasSendMessageTool(C || s?.isObserver ? wn : resolveAgentTools(N, wn, !0, !1, !1, ye).resolvedTools),
    ut = isGlimmeringFinchGateOn(),
    lt = ut ? Bbt(promptToolsUsed ?? [], K) : void 0,
    ct = lt === void 0 ? [] : [Hwt(createUserMessage(a3n(lt)))],
    ft = ut ? void 0 : TZ(promptToolsUsed ?? [], K),
    Je = Z1t(prompt, ft),
    ur = adjustLastOffset(promptNoticeLengths, ft);
  if (isSillyShoreGateOn()) getConversationToolsUsed().record(tagUntrustedArtifactContent(K, void 0, !1));
  let Xe = promptOrigin
      ? withJoinedNotices(
          ur,
          promptNoticeOwn,
          promptNoticeRunIds,
          createUserMessage({
            content: classifyNonUserMessageSource(Je, promptOrigin, { sendMessageToolAbsent: dr }),
            origin: promptOrigin,
            isMeta: !0,
          }),
        )
      : createUserMessage({
          content: promptIsMeta ? classifyNonUserMessageSource(Je, void 0, { isMeta: !0 }) : Je,
          ...(promptIsMeta && { isMeta: !0 }),
        }),
    yn = isLocalAgent(U) ? U.webFetchSavedFiles : void 0,
    pt = isWebFetchAgent(N) ? (yn ? { dirs: [...yn.dirs], paths: [...yn.paths] } : Ree()) : void 0,
    gt = { agentId: agentId, deliveringLoop: toolUseContext.agentId },
    bn =
      s?.isObserver === !0 &&
      (promptOrigin?.kind === "observer-activity" || (isLocalAgent(U) && U.isObserver === !0));
  if (s?.isObserver === !0 && !bn && x8t()) logFeatureBad("agent_intent_forward", "unconfirmed_observer");
  let ht = userInitiated && (s?.stoppedByUser === !0 || found || (isLocalAgent(I) && I.stoppedByUser === !0)),
    kt =
      ht ||
      (userInitiated &&
        isLocalAgent(I) &&
        (I.status === "killed" || I.status === "completed" || I.status === "failed")),
    wt = s?.finished === !0 || (isLocalAgent(I) && (I.status === "completed" || I.status === "failed"));
  if (kt && userStopCount(taskRegistry.get(agentId)) === $e)
    try {
      (await updateAgentMetadata(
        Mr(agentId),
        { revivedAt: now_2, ...(wt && { finished: void 0 }) },
        toolUseContext.storageV5,
      ),
        ($n = wt));
    } catch (error) {
      if (isFsInaccessible(error) || isFsInaccessibleCode(storageCauseErrnoCode(error)))
        logForDebugging(`failed to record the revival of ${agentId}: ${UC(error)}`, { level: "warn" });
      else logError(error);
    }
  if (!continueInterruptedTurn) markDirectDelivery(agentId, Xe, "user");
  let _n;
  if (!continueInterruptedTurn && !bn)
    try {
      _n = liveTranscript?.();
    } catch (error) {
      (logError(error), logFeatureSad("agent_intent_forward", "live_check_failed"));
    }
  let An =
      continueInterruptedTurn || bn
        ? void 0
        : pendingTurnsForAgent(gt, _n ?? toolUseContext.messages, _n === void 0 ? "snapshot" : "live"),
    yt = An?.copies ?? [],
    Sn = getTaskRunState().canUseToolNarrowings.get(agentId),
    bt = C ? { systemPrompt: Qe, parentSystemPrompt: !0 } : s?.isObserver ? { agentToolScope: N } : void 0,
    vn = s?.launchedWithDefaults === !0 && !isHookOrPluginSteered(xe),
    lr = vn || C || s?.isObserver || isHookOrPluginSteered(xe) ? void 0 : s?.model,
    { onToolPool: onToolPool, reviewTools: reviewTools } = rue(toolUseContext.options.tools),
    At = {
      agentDefinition: N,
      promptMessages: continueInterruptedTurn ? K : [...K, ...yt, ...ct, Xe],
      turnPrompt: continueInterruptedTurn ? void 0 : (getContentText(Xe.message.content) ?? void 0),
      waitingToolUse: be ? waitingToolUse : void 0,
      toolUseContext: Ue,
      canUseTool: Sn ? Sn(canUseTool) : canUseTool,
      handbackOptIn: !(C || s?.isObserver),
      handbackTool: ObserverReportTool,
      isAsync: !0,
      requestShape:
        !s?.isObserver && (s?.requestShape === "foreground" || s?.requestShape === "background")
          ? s.requestShape
          : void 0,
      requestNonInteractive:
        !s?.isObserver && typeof s?.requestNonInteractive === "boolean"
          ? s.requestNonInteractive || getIsNonInteractiveSession()
          : void 0,
      preserveToolUseResults: !getIsNonInteractiveSession(),
      persistedToolResultFiles: pt,
      querySource: getQuerySourceForAgent(N.agentType, isBuiltInAgent(N)),
      spawnedBySkill: fn,
      ...(B !== void 0 && { spawnedByForkedSkill: !0 }),
      model: s?.isObserver ? void 0 : C ? "inherit" : s?.model,
      effort: st,
      onModelRestricted: s?.isObserver
        ? void 0
        : agentModelRestrictionNotifier(fn ?? N.agentType, toolUseContext.appendSystemMessage),
      override: Sn ? { ...bt, requireCanUseTool: !0 } : bt,
      availableTools: wn,
      assembleAvailableTools: (n) => assembleAgentToolPool(toolUseContext, ie, n),
      onToolPool: onToolPool,
      forkContextMessages: void 0,
      recordedUuids: new Set(K.map((n) => n.uuid)),
      compactTranscriptUnavailable: C,
      ...((C || s?.isObserver) && { useExactTools: !0 }),
      totalTokensReminderBudget: he ? he.totalTokensBudget : at,
      isTotalTokensReminderBudgetOnTopOfStart: he
        ? he.isBudgetOnTopOfStart
        : at !== void 0 && (C ? getCalmMochiScope() !== "none" : getCalmMochiScope() === "all"),
      worktreePath: le,
      worktreeBranch: ln,
      cwd: s?.cwd,
      launchedWithDefaults: vn,
      spawnMode: or ?? s?.spawnMode,
      description: un,
      name: ue,
      toolUseId: Qn,
      contentReplacementState: er,
    },
    ce = taskRegistry.get(agentId);
  if (isLocalAgent(ce) && ce.stoppedByUser && (!userInitiated || (ce.userStopCount ?? 0) !== $e))
    throw (
      T(),
      new AgentStoppedByUserError(
        `Agent ${agentId} was stopped by the user and won't be resumed. Treat its work as cancelled; only launch a new agent if the user explicitly asks.`,
      )
    );
  let Ze = Ae?.confirm(toolUseContext.abortController.signal);
  if (Ze !== void 0) {
    if ((T(), Ze.kind === "aborted")) throw new AbortError();
    if (Ze.kind === "refused")
      throw (
        logFeatureBad("subagent_launch", "subagent_resume_refused_by_rule"),
        new AgentResumePermanentlyRefusedError(Ze.message)
      );
    throw (
      logFeatureBad("subagent_launch", "subagent_resume_background_closed"),
      new ResumeAgentStateError(BACKGROUND_AGENTS_UNAVAILABLE)
    );
  }
  for (let n of yt) appendAgentTranscriptMessage(agentId, n, taskRegistry);
  if (!promptIsMeta && !continueInterruptedTurn) {
    for (let n of ct) appendAgentTranscriptMessage(agentId, n, taskRegistry);
    appendAgentTranscriptMessage(
      agentId,
      qB(promptOrigin) ? Xe : createUserMessage({ content: Je, origin: promptOrigin }),
      taskRegistry,
    );
  }
  onDeliveryCommitted?.();
  let St = {
      outputFileReadable: HM(toolUseContext.options.tools),
      agentId: agentId,
      ownerAgentId: mainAgentId(),
      parentAgentId: s?.parentAgentId,
      spawnDepth: ye,
      launchedWithDefaults: vn,
      launchModel: lr,
      description: se,
      prompt: prompt,
      model: Ye,
      selectedAgent: N,
      taskRegistry: taskRegistry,
      toolUseId: toolUseContext.toolUseId ?? kN(ce?.toolUseId) ?? Qn,
      cwd: rt ?? (toolUseContext.agentWorktree !== void 0 ? getCwd() : void 0),
    },
    Tt = W === "call" && tLr(G, C4()),
    ne =
      W === "call"
        ? registerAgentForeground({
            ...St,
            parentAbortController: toolUseContext.abortController,
            ...autoBackgroundOptions(G, Tt),
            isDirectCall: !toolUseContext.innerCall && toolUseContext.hookCaller === void 0,
          })
        : void 0,
    Rn = { moved: !1 },
    q =
      ne !== void 0
        ? { agentId: agentId, abortController: ne.abortController, outputFile: ne.outputFile }
        : registerAsyncAgent({
            ...St,
            parentAbortController: ee ? toolUseContext.abortController : void 0,
            awaitedByCaller: ee,
            awaitedByMainTurn: pn,
            forkedSkillName: B?.skillName,
            ...(promptOrigin?.kind === "observer-activity" && { isObserver: !0 }),
            sessionScratch: toolUseContext.session.sessionScratch,
          });
  if (Ae !== void 0 && !Ae.handOver({ agentId: q.agentId, abortController: q.abortController }))
    throw (
      killAsyncAgent(q.agentId, taskRegistry, "system", void 0, { lifecycleNotStarted: !0 }),
      markAgentNotified(q.agentId, taskRegistry),
      logFeatureBad("subagent_launch", "subagent_resume_background_not_taken"),
      new AgentResumePermanentlyRefusedError(xt)
    );
  (Zn.admit(), Be(), nr?.started({ agentId: agentId, model: Ye }));
  let te =
      promptOrigin?.kind === "observer-activity"
        ? void 0
        : resolveVisibleSubagentId(toolUseContext.agentId, taskRegistry),
    fr = !isLocalAgent(ce) || (ce.notified && ce.quietlyParked !== !0),
    vt = !1;
  if (te !== void 0) {
    let n = new Set(),
      y = te;
    while (y !== void 0 && !n.has(y)) {
      n.add(y);
      let b = taskRegistry.get(y);
      if (((y = isLocalAgent(b) ? b.ownerAgentId : void 0), y === agentId)) {
        vt = !0;
        break;
      }
    }
  }
  if (te !== void 0 && te !== agentId && fr && !vt) {
    let n,
      y = !getIsNonInteractiveSession();
    if (
      (taskRegistry.update(agentId, (b) => {
        if (b.ownerAgentId !== te) n = b.ownerAgentId;
        else if (!y || b.handbackRecipient === te) return b;
        return { ...b, ownerAgentId: te, ...(y && { handbackRecipient: te }) };
      }),
      y)
    )
      addAgentKeepaliveReason(te, `agent:${agentId}`, taskRegistry);
    if (n !== void 0) notifyAgentReparented(agentId, n, taskRegistry);
  }
  let en = taskRegistry.get(agentId),
    Rt = isLocalAgent(en) && isCurrentAgentId(toolUseContext.agentId, en.ownerAgentId, taskRegistry),
    On = Rt
      ? hasSendMessageTool(toolUseContext.options.tools)
      : isLocalAgent(en)
        ? en.ownerCanContinueAgents
        : void 0;
  if (Rt)
    taskRegistry.update(agentId, (n) =>
      n.ownerCanContinueAgents === On ? n : { ...n, ownerCanContinueAgents: On },
    );
  if (kt) {
    let n = taskRegistry.get(agentId);
    toolUseContext.messageQueue.enqueuePendingNotification(
      buildUserResumedNotice({
        agentId: agentId,
        description: se,
        to: resolveNotificationRecipient({
          ownerAgentId: isLocalAgent(n) ? n.ownerAgentId : void 0,
          keepaliveReason: `agent:${agentId}`,
          delivering: !0,
          taskRegistry: taskRegistry,
        }),
      }),
    );
  }
  if (ht) {
    let n = (b) => {
        if (isFsInaccessible(b) || isFsInaccessibleCode(storageCauseErrnoCode(b)))
          logForDebugging(`failed to clear stop marker for ${agentId}: ${UC(b)}`, { level: "warn" });
        else logError(b);
      },
      y = () => userStopCount(taskRegistry.get(agentId)) !== $e;
    if (!y()) {
      if (
        (await clearAgentStopSibling(Mr(agentId), "stoppedByUser", toolUseContext.storageV5).catch(n),
        await updateAgentMetadata(Mr(agentId), { stoppedByUser: !1 }, toolUseContext.storageV5).catch(n),
        y())
      )
        await landStoppedByUser(Mr(agentId), N.agentType, toolUseContext.storageV5);
    }
  }
  if (suppressOwnerNotification) markAgentNotified(q.agentId, taskRegistry);
  if (
    (await rearmObserverOnResume({
      observedTaskId: agentId,
      observedDefinition: N,
      observedName: ue ?? N.agentType,
      observedMeta: s
        ? { observerTaskId: s.observerTaskId, armingPermissionMode: s.armingPermissionMode }
        : null,
      toolUseContext: toolUseContext,
      canUseTool: canUseTool,
    }),
    pruneSettledChildWork(agentId, taskRegistry),
    ue !== void 0 && toolUseContext.getAppState().agentNameRegistry.get(ue) === void 0)
  )
    toolUseContext.agentLifecycle.registerName(ue, Mr(agentId));
  let Ot = {
      prompt: prompt,
      resolvedAgentModel: Ye,
      modelsUsed: Jt,
      isBuiltInAgent: isBuiltInAgent(N),
      startTime: Xt,
      agentType: N.agentType,
      isAsync: !0,
      agentDepth: ye,
      callerCanContinueAgents: On,
      source: N.source,
      pluginId: isPluginAgent(N) ? parsePluginIdentifier_2(N.plugin) : void 0,
      persistedToolResultFiles: pt,
      spawnedSubagent: isLocalAgent(U) ? U.spawnedSubagent : void 0,
      priorForeignArtifactContent: (we !== void 0 && Tgi(we)) || jFe(z.messages),
    },
    Mn = {
      agentId: agentId,
      parentAgentId: toolUseContext.agentId,
      depth: ye,
      ...(getTaskRunState().spawnedByMainThread.has(agentId) && { spawnedByMainThread: !0 }),
      parentSessionId: getParentSessionId(),
      agentType: "subagent",
      subagentName: N.agentType,
      displayName: ue,
      isAsync: !0,
      isBuiltIn: isBuiltInAgent(N),
      invokingRequestId: invokingRequestId,
      invocationKind: "resume",
      invocationEmitted: !1,
      parentPromptId: parentPromptId,
      isBackgroundAgent: !pn,
      ...(W === "call" && { reapsShellsUnlessMoved: !0 }),
      ...getWorkflowRunFields(toolUseContext.agentContext),
    },
    mr = promptOrigin?.kind === "observer-activity" ? () => {} : taskRegistry.takeConcurrencySlot(),
    nn = runWithCwdOverride(Mn, () =>
      xDn(withProject.project, () =>
        runAsyncAgentLifecycle({
          taskId: q.agentId,
          abortController: q.abortController,
          makeStream: (n, y, b) =>
            runAgent({
              ...At,
              session: withProject,
              override: {
                ...At.override,
                agentId: Mr(q.agentId),
                agentContext: Mn,
                abortController: q.abortController,
              },
              onCacheSafeParams: n,
              onQueryProgress: y,
              onStreamTokenEstimate: b,
              ...(G !== void 0 && ee && !pn && { canShowPermissionPrompts: !1 }),
            }),
          metadata: { ...Ot, agentContext: Mn },
          description: se,
          toolUseContext: toolUseContext,
          taskRegistry: taskRegistry,
          agentIdForCleanup: agentId,
          reviewTools: reviewTools,
          enableSummarization:
            getSdkAgentProgressSummariesEnabled() ||
            ((isCoordinatorMode() || C || isForkSubagentEnabled()) && !getIsNonInteractiveSession()),
          getWorktreeResult: async () =>
            le ? { worktreePath: le, ...(ln !== void 0 && { worktreeBranch: ln }) } : {},
          shouldNotifyOwner: W === "call" ? () => Rn.moved : ee ? () => !1 : void 0,
          reviewInlineHandoff: W !== "inline" && ee,
          onTerminalSuccess: B
            ? () => {
                let skillName = B.skillName,
                  y = `:${skillName}`;
                if (getInvokedSkills().has(y)) return;
                addInvokedSkill(skillName, skillName, "", null);
                let b = exe(mn ?? skillName);
                if (b)
                  toolUseContext.applyAttributionOp({ kind: "recordVerification", method: b, checkout: Jn });
              }
            : void 0,
          onRunSettled: mr,
        }),
      ),
    );
  if (An !== void 0) pki(gt, An);
  if ((logFeatureOk("subagent_launch"), ee))
    try {
      if (ne === void 0) await nn;
      else if (
        settleBackgroundedAgent({
          outcome: await raceAgentLaunch(nn, ne.backgroundSignal, Tt),
          registration: ne,
          wait: Rn,
          ownerAgentId: mainAgentId(),
          taskRegistry: taskRegistry,
          sessionScratch: toolUseContext.session.sessionScratch,
          agentTask: {
            armWorkerCheckinForBackgroundedAgent: recordWorkerCheckin,
            backgroundAgentTask: moveAgentToBackground,
            hasAgentChildKeepalive: hasChildAgents,
          },
        })
      )
        return {
          agentId: agentId,
          description: se,
          outputFile: ne.outputFile,
          movedRunEnded: nn.catch(logError),
        };
      let n = taskRegistry.get(agentId),
        y = isLocalAgent(n) ? n.result : void 0;
      return {
        agentId: agentId,
        description: se,
        outputFile: q.outputFile,
        inlineHandback: {
          content: y?.content ?? [],
          harnessNoteCount: y?.harnessNoteCount,
          harnessTailCount: y?.harnessTailCount,
          harnessSectionHash: y?.harnessSectionHash,
          toolsUsed: y?.toolsUsed,
          handback: y?.handback,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        (Object.defineProperty(error, RESUMEDINLINE, { value: !0 }),
          Object.defineProperty(error, RESUMEDINLINEPRIORFOREIGNARTIFACTCONTENT, {
            value:
              Ot.priorForeignArtifactContent === !0 ||
              (RESUMEDINLINEPRIORFOREIGNARTIFACTCONTENT in error &&
                error[RESUMEDINLINEPRIORFOREIGNARTIFACTCONTENT] === !0),
            configurable: !0,
          }));
        let y = RESUMEDINLINESALVAGE in error ? error[RESUMEDINLINESALVAGE] : void 0,
          b = y instanceof rn ? y : new rn();
        (b.set(agentId, {
          handback: getPendingHandbackReport(taskRegistry.get(agentId), agentId),
          reviewTools: reviewTools(),
        }),
          Object.defineProperty(error, RESUMEDINLINESALVAGE, { value: b }));
      }
      throw error;
    } finally {
      if ((ne?.cancelAutoBackground?.(), ne?.detachParentAbortRelay(), !Rn.moved)) {
        if (
          (getTaskRunState().agentBackgroundSignalResolvers.delete(agentId),
          !hasChildAgents(agentId, taskRegistry) && !hasPendingChildWork(agentId, taskRegistry))
        )
          Nwe(agentId);
        taskRegistry.update(agentId, (n) => ({ ...n, notified: !0, evictAfter: agentEvictAt(n) }));
      }
    }
  return { agentId: agentId, description: se, outputFile: q.outputFile };
}
//@ chunk-0m7em5b4.js:43509-43904 placement
function repairShutdownInterruptedTurn(e, h) {
  if (
    e.type !== "user" ||
    !("agentId" in e && e.agentId === h) ||
    e.interruptedByShutdown !== !0 ||
    !Array.isArray(e.message.content)
  )
    return e;
  if (!isShutdownInterrupted(e))
    return isInterruptionOnlyMessage(e)
      ? { ...e, message: { ...e.message, content: [{ type: "text", text: AGENT_SESSION_ENDED_INTERRUPT }] } }
      : e;
  return {
    ...e,
    toolUseResult: TOOL_CALL_SESSION_ENDED,
    toolDenialKind: "interrupted",
    message: {
      ...e.message,
      content: e.message.content.map((w) =>
        w.type === "tool_result" ? { ...w, content: TOOL_CALL_SESSION_ENDED } : w,
      ),
    },
  };
}
//@ chunk-0m7em5b4.js:43904-44013 placement
function withJoinedNotices(e, h, w, A) {
  return e === void 0 ? A : { ...A, joinedNoticeLengths: e, joinedNoticeOwn: h, joinedNoticeRunIds: w };
}

export {
  AgentResumeInProgressError,
  AgentResumeTransientError,
  AgentStillStoppingError,
  AgentStoppedByUserError,
  ResumeAgentStateError,
  isResumeDenied,
  isMainConversationsOwnCall,
  isResumedInlineRunError,
  resumedInlineRunHadPriorForeignContent,
  resumedInlineRunHandback,
  resumedInlineRunReviewTools,
  resumeAgentBackground,
  AgentResumePermanentlyRefusedError,
  resumeAgentForReply,
  resumeAgentInline,
  resumeAgentAtItsCall,
};
