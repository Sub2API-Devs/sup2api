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
  isUnavailableStoreError,
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
  SETTLE_AGENT_BACKGROUND_MS,
  isTranscriptChainIntact,
  findAgentLaunchResults,
  isStoppedAgent,
  isResumableAgent,
  runResumeStartHooks,
  pluginDeclinedResumeMessage,
  observerToolset,
  autoBackgroundMsForLaunch,
  autoBackgroundOptions,
  settleBackgroundedAgent,
  raceAgentLaunch,
} from "./agentLaunch.js";
import {
  NodeFsOperations,
  findIntermediateUncJunction,
  hasUntouchableRecordSpelling,
} from "../../utils/fsOperations.js";
import { hasDotDotSegment } from "../../utils/pathClassification.js";
import { isNonWslUncPath, isNetworkMountRoot, isNetDir } from "../../utils/networkPaths.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import {
  getToolPermissionContext,
  withCommandRuleOverrides,
  getMainLoopModel,
} from "../../utils/permissions/toolPermissionContext.js";
import { isAgentStopPending } from "../../utils/agentProcessRegistry.js";
import { isTaskLoopSettled } from "../../tasks/taskLoopRegistry.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { identityAgentId2 } from "../../utils/agentId.js";
import { logError } from "../../utils/log.js";
import {
  pruneSettledChildWork,
  hasChildAgents,
  hasPendingChildWork,
} from "../../tasks/LocalAgentTask/childWork.js";
import { releaseIfFinished, userStopCount, addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { withTimeout } from "../../utils/sleep.js";
import {
  getBackgroundLaunchRule,
  admitsWakeSafe,
  runBackgroundLaunchRules,
} from "../../tasks/backgroundLaunchRules.js";
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
import { safeIdentifierOrUndefined } from "../../utils/safeIdentifier.js";
import {
  sanitizeMetadataText,
  AGENT_METADATA_ID_RE,
  makeSidecarReadFallback,
  describeStorageError,
} from "../../utils/agentMetadata.js";
import { isValidGitRefName } from "../../utils/git/refNames.js";
import { isReservedSessionName } from "../../utils/sessionAddresses.js";
import { readForkedSkillScoping, readForkedSkillName } from "../../skills/forkedSkillMarkers.js";
import {
  getCommands,
  describeSkillHiddenBehindPlugin,
  getBareCommandName,
  getBareCommandNameUnlessSynced,
} from "../../commands.js";
import { dropSyncedClashes, isHostCatalogSkill } from "../../utils/commandPredicates.js";
import {
  checkCommandSyncedAccess,
  syncedSkillRefusalReason,
  isDefined,
  logSyncedCommandRefused,
  resolveSkillGitRoot,
} from "../../utils/claudeAiSync/syncedSkillAccess.js";
import { refusalTextFor } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { splitRuleList } from "../../utils/permissions/disallowedToolsFlag.js";
import { armedAllowedToolsOf } from "../../utils/permissions/permissionsLoader.js";
import { slashTestPattern } from "../../utils/attributionFileClasses.js";
import { resolveSpawnProvenanceMarks, filterOfferedAgents } from "../../plugins/functionHooks/agentHooks.js";
import { getAgentDepth, isHookOrPluginSteered, getWorkflowRunFields } from "../../utils/agentContext.js";
import { logForDebugging } from "../../utils/debug.js";
import { wrapCoordinatorMessage } from "../../utils/crossSessionMessages.js";
import { degradeRestoredMessages } from "../../utils/conversationRecovery.js";
import {
  isOnlyPendingToolUse,
  assembleAgentToolPool,
  createDeferredReviewTools,
  runAgent,
} from "./runAgent.js";
import { trimIncompleteTail, endsWithUserPrompt } from "../../utils/backgroundHandoff.js";
import {
  filterThinkingOnlyUntilStable,
  normalizeMessagesForResume,
  regroupSplitResponsesOnResume,
  markToolSummaryMessage,
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
import { isBackgroundAgentLaunchDisabled, isForegroundAgentMoveOff } from "./backgroundGates.js";
import { isWebFetchAgent } from "../WebFetchTool/harnessNotes.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { getCwd, hasOutermostCallFrame, runWithCwdOverride, withCallFrameCwd } from "../../utils/cwd.js";
import {
  gitRootsForPath,
  compareSameContainment,
  checkWorktreeIsolation,
} from "../../utils/worktreeIsolation.js";
import { STARTUP_CWD_REALPATH } from "../../utils/sessionRestoreCwd.js";
import { wasAgentCleanlyRemoved, wasAgentSpawnedIsolated } from "../../utils/concurrentSessions.js";
import { uniq } from "../../utils/collections.js";
import { isEffortLevel } from "../../utils/effort.js";
import { getSystemPrompt } from "../../constants/prompts.js";
import { effectiveSystemPromptText } from "../../utils/systemPrompt.js";
import { getAgentModel, getExploreAgentModel } from "../../utils/model/agent.js";
import { promptSnapshotUnlessRenderPoint } from "../../utils/contextAttachments/promptSnapshot.js";
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
import { memoryModeForSession } from "../../services/accountMemory/memoryContext.js";
import { hasSendMessageTool } from "../SendMessageTool/constants.js";
import {
  isGlimmeringFinchGateOn,
  isSillyShoreGateOn,
  tagUntrustedArtifactContent,
  messageHasUntrustedBlock,
  messagesContainUntrustedContent,
} from "../../utils/messages/untrustedArtifactContent.js";
import {
  unreadableToolsUsed,
  summaryCompanionMessage,
  unreadableToolsLine,
  joinWithNewlineIfAny,
  adjustLastOffset,
} from "../../utils/agentListing.js";
import { classifyNonUserMessageSource } from "../../utils/messages/nonUserMessages.js";
import { defaultToolResultsStorage } from "../../utils/mcpOutputStorage.js";
import {
  forwardUserIntentEnv,
  markDirectDelivery_2,
  pendingTurnsForAgent,
  recordTurnsDeliveredIndirect,
} from "../../utils/messageProvenance.js";
import { getQuerySourceForAgent } from "../../utils/promptCategory.js";
import { agentModelRestrictionNotifier } from "../../utils/model/agentModelRestriction.js";
import { appendAgentTranscriptMessage } from "../../tasks/LocalAgentTask/pendingMessages.js";
import { isNonHumanInboundOrigin } from "../../utils/backgroundSessionResume.js";
import { willToolsLoseSessionState } from "../../services/compact/compactCarry.js";
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
import { getPendingHandbackReport, forgetHandback } from "./handbackReport.js";

//@ chunk-0m7em5b4.js:13597-13731 placement
function resumeReadError(error) {
  if (error instanceof ResumeAgentStateError) return error;
  let h =
    error instanceof AgentTranscriptFetchError ||
    isUnavailableErrorCode(getErrnoCode(error) ?? storageCauseErrnoCode(error));
  let message = isFsInaccessible(error) ? unreadableStateMessage(error, h) : errorMessage(error);
  return h ? new AgentResumeTransientError(message) : new ResumeAgentStateError(message);
}
//@ chunk-0m7em5b4.js:13731-13841 placement
function isResumeDenied(e) {
  return typeof e === "object" && e !== null && "deniedByPlugin" in e && typeof e.deniedByPlugin === "string";
}
//@ chunk-0m7em5b4.js:13841-13936 placement
var RESUMEDINLINE = "resumedInline";
var RESUMEDINLINEPRIORFOREIGNARTIFACTCONTENT = "resumedInlinePriorForeignArtifactContent";
var RESUMEDINLINESALVAGE = "resumedInlineSalvage";
//@ chunk-0m7em5b4.js:13936-13958 placement
/**
 * 用于承载代理覆盖的表（带类型标记，便于区分）。
 */
class agentOverridesMap extends Map {}
//@ chunk-0m7em5b4.js:13958-14299 placement
/**
 * 代理恢复相关文案与不安全字符正则。
 */
var BACKGROUND_AGENTS_UNAVAILABLE =
  "Background agents cannot be started in this session right now. Send the message again if you still need this agent: it should then run while you wait, and its report will be that call's result.";
var AGENT_RESUME_BACKGROUND_REFUSED_TEXT =
  "This agent cannot be resumed in the background in this session. Start a new agent instead.";
var UNSAFE_AGENT_TEXT_REGEX = /[<>\p{Cc}]|(?![\u200c\u200d])\p{Cf}/u;
//@ chunk-0m7em5b4.js:14299-14359 placement
function isMainConversationsOwnCall(toolUseContext) {
  return toolUseContext.agentId === undefined && toolUseContext.innerCall !== true;
}
//@ chunk-0m7em5b4.js:14359-14422 placement
function isResumedInlineRunError(error) {
  return error instanceof Error && RESUMEDINLINE in error && error[RESUMEDINLINE] === true;
}
//@ chunk-0m7em5b4.js:14422-14525 placement
function getResumeSalvage(e, h) {
  let w = e instanceof Error && RESUMEDINLINESALVAGE in e ? e[RESUMEDINLINESALVAGE] : undefined;
  return w instanceof agentOverridesMap ? w.get(h) : undefined;
}
//@ chunk-0m7em5b4.js:14525-14568 placement
function resumedInlineRunHandback(error, agentId) {
  return getResumeSalvage(error, agentId)?.handback;
}
//@ chunk-0m7em5b4.js:14568-14614 placement
function resumedInlineRunReviewTools(error, agentId) {
  return getResumeSalvage(error, agentId)?.reviewTools;
}
//@ chunk-0m7em5b4.js:14614-14681 placement
function resumedInlineRunHadPriorForeignContent(error) {
  return !(
    error instanceof Error &&
    RESUMEDINLINEPRIORFOREIGNARTIFACTCONTENT in error &&
    error[RESUMEDINLINEPRIORFOREIGNARTIFACTCONTENT] === false
  );
}
//@ chunk-0m7em5b4.js:14681-14832 placement
class ResumeAgentStateError extends Error {
  transcriptMissing;
  constructor(message, h) {
    super(message);
    this.name = "ResumeAgentStateError";
    this.transcriptMissing = h?.transcriptMissing === true;
  }
}
//@ chunk-0m7em5b4.js:14832-14861 placement
var GIT_WORKTREE_CREATE = "git_worktree_create";
//@ chunk-0m7em5b4.js:14861-14944 placement
class AgentResumeTransientError extends ResumeAgentStateError {
  constructor(message) {
    super(message);
    this.name = "AgentResumeTransientError";
  }
}
//@ chunk-0m7em5b4.js:14944-15036 placement
class AgentResumePermanentlyRefusedError extends ResumeAgentStateError {
  constructor(message) {
    super(message);
    this.name = "AgentResumePermanentlyRefusedError";
  }
}
//@ chunk-0m7em5b4.js:15036-15117 placement
class AgentStoppedByUserError extends ResumeAgentStateError {
  constructor(message) {
    super(message);
    this.name = "AgentStoppedByUserError";
  }
}
//@ chunk-0m7em5b4.js:15117-15201 placement
class AgentResumeInProgressError extends ResumeAgentStateError {
  constructor(message) {
    super(message);
    this.name = "AgentResumeInProgressError";
  }
}
//@ chunk-0m7em5b4.js:15201-15283 placement
class AgentStillStoppingError extends ResumeAgentStateError {
  constructor(message) {
    super(message);
    this.name = "AgentStillStoppingError";
  }
}
//@ chunk-0m7em5b4.js:15283-15326 placement
function resumeAgentBackground(e) {
  return resumeAgentExclusive(e, "notification");
}
//@ chunk-0m7em5b4.js:15326-15364 placement = INLINE_MARKETPLACE (1)
/**
 * 是否为 inline 市场插件 ID（--plugin-dir 加载）。
 */
function resumeAgentInline(e) {
  return resumeAgentExclusive(e, "inline");
}
//@ chunk-0m7em5b4.js:15364-15546 placement
function safeWorktreePath(e, h = NodeFsOperations) {
  return typeof e === "string" &&
    e !== "" &&
    !hasDotDotSegment(e) &&
    !isNonWslUncPath(e) &&
    !isNetworkMountRoot(e) &&
    !isNetDir(e) &&
    !UNSAFE_AGENT_TEXT_REGEX.test(e) &&
    findIntermediateUncJunction(h, e, {
      surfaceNetworkRaw: true,
      unreadableAncestry: "unverified",
    }) === undefined
    ? e
    : undefined;
}
//@ chunk-0m7em5b4.js:15546-15583 placement
function resumeAgentForReply(e) {
  return resumeAgentExclusive(e, "reply");
}
//@ chunk-0m7em5b4.js:15583-15619 placement
function resumeAgentAtItsCall(e) {
  return resumeAgentExclusive(e, "call");
}
//@ chunk-0m7em5b4.js:15619-15847 placement
/**
 * 恢复后台代理的入口：同一 agentId 同时只能有一次恢复（resumesInFlight），再调用实际恢复流程。
 */
async function resumeAgentExclusive(e, h) {
  let { agentId } = e;
  let { resumesInFlight } = getTaskRunState();
  if (resumesInFlight.has(agentId))
    throw new AgentResumeInProgressError(`Agent ${agentId} is already running or being resumed`);
  resumesInFlight.add(agentId);
  let S = true;
  let P = () => {
    if (S) {
      S = false;
      resumesInFlight.delete(agentId);
    }
  };
  try {
    return await resumeAgent(e, h, P);
  } finally {
    P();
  }
}
//@ chunk-0m7em5b4.js:15847-43509 placement
/**
 * 恢复一个已停止/后台代理：校验停止状态与保存的会话记录、修补被关停打断的回合、处理插件钩子拒绝，再继续运行或只取结果。
 */
async function resumeAgent(
  {
    agentId,
    prompt,
    promptOrigin,
    promptToolsUsed,
    promptNoticeLengths,
    promptNoticeOwn,
    promptNoticeRunIds,
    promptIsMeta,
    continueInterruptedTurn,
    waitingToolUse,
    resultsOnly,
    toolUseContext,
    liveTranscript,
    canUseTool,
    invokingRequestId,
    parentPromptId,
    userInitiated,
    suppressOwnerNotification,
    workerPermissionMode,
    onDeliveryCommitted,
    isWebFetchLaunch,
  },
  W,
  Be,
) {
  let now = Date.now();
  let zt = false;
  let appState = toolUseContext.getAppState();
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  let { taskRegistry } = toolUseContext;
  let mode = toolPermissionContext.mode;
  let agentId_2 = toolUseContext.agentId;
  if (agentId_2 !== undefined && isAgentStopPending(agentId_2))
    throw new AgentStillStoppingError(
      "This agent has been stopped and its stop is still completing; it cannot resume other agents.",
    );
  if (
    isAgentStopPending(agentId) ||
    (!isTaskLoopSettled(agentId) && isTerminalTaskStatus(taskRegistry.get(agentId)?.status ?? "running"))
  )
    throw new AgentStillStoppingError(
      `Agent ${agentId} is still stopping \u2014 its previous run was stopped but has not exited. Re-run ${TASKSTOP} on it or wait for it to exit before resuming.`,
    );
  let I = taskRegistry.get(agentId);
  let $e = 0;
  let revivedAt = Date.now();
  if (isLocalAgent(I)) {
    let n = false;
    taskRegistry.update(agentId, (y) => {
      if (y.status === "running" || y.resuming) return y;
      n = true;
      $e = y.userStopCount ?? 0;
      return {
        ...y,
        resuming: true,
      };
    });
    if (!n) throw new AgentResumeInProgressError(`Agent ${agentId} is already running or being resumed`);
  }
  let In = () => {
    taskRegistry.update(agentId, (n) =>
      n.resuming
        ? {
            ...n,
            resuming: false,
          }
        : n,
    );
  };
  let $n = false;
  let T = () => {
    In();
    if ($n)
      updateAgentMetadata(
        identityAgentId2(agentId),
        {
          finished: true,
        },
        toolUseContext.storageV5,
      ).catch(logError);
    pruneSettledChildWork(agentId, taskRegistry);
    releaseIfFinished(agentId, taskRegistry);
  };
  let an = () => {
    logFeatureBad("subagent_launch", "subagent_resume_transcript_over_bound");
    T();
    return new AgentResumePermanentlyRefusedError(
      `Agent ${agentId}'s earlier transcript is too large to load, or has a row with a malformed timestamp. Sending the message again will not help. Start a new agent if the work is still needed.`,
    );
  };
  if (isAgentTranscriptOverBound(agentId)) throw an();
  let Wn = (n) => {
    let y = sanitizeErrnoTokenForTelemetry(getErrnoCode(n) ?? storageCauseErrnoCode(n));
    return (
      y && {
        errno: y,
      }
    );
  };
  let qt = (err) => {
    logFeatureBad("subagent_launch", "subagent_resume_stop_probe_failed", Wn(err));
    T();
    return isUnavailableStoreError(err)
      ? new AgentResumeTransientError(unreadableStateMessage(err, true))
      : new ResumeAgentStateError(unreadableStateMessage(err, false));
  };
  let dn =
    promptOrigin?.kind === "observer-activity"
      ? {
          found: false,
        }
      : await hasAgentStopSibling(identityAgentId2(agentId), "stoppedByUser", toolUseContext.storageV5).then(
          (found) => ({
            found,
          }),
          (err) => ({
            found: false,
            err,
          }),
        );
  let Hn = userInitiated || promptOrigin?.kind === "observer-activity" ? undefined : isPathAbsent;
  let agentMetadata = readAgentMetadata(identityAgentId2(agentId), toolUseContext.storageV5, Hn);
  let xn = async () => {
    await withTimeout(
      flushSessionStorage(),
      SETTLE_AGENT_BACKGROUND_MS,
      "agent resume: transcript flush wait",
    ).catch(() => {});
    return getAgentTranscript(identityAgentId2(agentId), toolUseContext.storageV5, {
      signal: toolUseContext.abortController.signal,
    });
  };
  let backgroundLaunchRule = getBackgroundLaunchRule();
  let Un = isDiskless() && !isLocalAgent(I) && backgroundLaunchRule === undefined;
  let Gn = isDiskless() ? agentMetadata.then((n) => (n === null || Un ? null : xn())) : xn();
  let [Qt, s] = await Promise.all([
    Gn,
    agentMetadata.then((n) =>
      n === null && !isDiskless() && canFetchAgentTranscriptsOnDemand()
        ? Gn.then(() => readAgentMetadata(identityAgentId2(agentId), toolUseContext.storageV5, Hn))
        : n,
    ),
  ]).catch((error) => {
    if (isAbortError(error)) {
      T();
      throw error;
    }
    if (isAgentTranscriptOverBound(agentId)) throw an();
    if (error instanceof AgentTranscriptFetchError && error.outcome === "body_encoded") {
      logFeatureBad("subagent_launch", "subagent_resume_transcript_body_encoded");
      T();
      throw new AgentResumeTransientError(
        `Agent ${agentId}'s earlier transcript arrived in an encoding that was not asked for, so it was not read. Send the message again, or start a new agent if that fails too.`,
      );
    }
    logFeatureBad("subagent_launch", "subagent_resume_setup_read_failed", Wn(error));
    T();
    throw resumeReadError(error);
  });
  if (toolUseContext.abortController.signal.aborted) {
    T();
    throw new AbortError();
  }
  logEvent("tengu_subagent_resume_sidecar_read", {
    metadata_found: s !== null,
    prompt_origin_kind: fromEnumOpt(promptOrigin?.kind),
    has_task_record: isLocalAgent(I),
    continue_interrupted_turn: continueInterruptedTurn === true,
    resumer_is_subagent: agentId_2 !== undefined,
    storage_v5: toolUseContext.storageV5 !== undefined,
  });
  let zn =
    W === "notification" &&
    backgroundLaunchRule !== undefined &&
    admitsWakeSafe(backgroundLaunchRule, agentId);
  let Kn = W === "notification" && backgroundLaunchRule !== undefined && !zn;
  if (s === null && isDiskless()) {
    logFeatureBad("subagent_launch", "subagent_resume_sidecar_missing_diskless");
    T();
    throw new AgentResumePermanentlyRefusedError(
      `This session has no saved settings for agent ${agentId}: it never ran here, or they did not survive a restart of the server that runs the session. Start a new agent if the work is still needed.`,
    );
  }
  let agentIdArg = parseAgentIdArg(s?.cwd);
  let qn =
    isDiskless() &&
    ((s?.worktreePath ?? undefined) !== undefined ||
      (s?.inheritedWorktreePath ?? undefined) !== undefined ||
      s?.spawnedWithWorktree === true)
      ? NO_OWN_WORKDIR_MESSAGE
      : undefined;
  if (agentIdArg !== undefined || qn !== undefined) {
    logFeatureBad(
      "subagent_launch",
      agentIdArg !== undefined ? "subagent_resume_cwd_refused" : "subagent_resume_worktree_refused",
    );
    T();
    throw new AgentResumePermanentlyRefusedError(
      agentIdArg !== undefined
        ? `Cannot resume this agent in the directory its record names: ${agentIdArg}. Start a new agent instead.`
        : `Cannot resume this agent, which was started in a worktree: ${qn}. Start a new agent instead.`,
    );
  }
  let Qn = safeIdentifierOrUndefined(s?.toolUseId);
  let un = sanitizeMetadataText(s?.description);
  let worktreeBranch =
    typeof s?.worktreeBranch === "string" && isValidGitRefName(s.worktreeBranch)
      ? s.worktreeBranch
      : undefined;
  let ue =
    typeof s?.name === "string" && AGENT_METADATA_ID_RE.test(s.name) && !isReservedSessionName(s.name)
      ? s.name
      : undefined;
  if ("err" in dn && !userInitiated && !s?.stoppedByUser) throw qt(dn.err);
  let found = dn.found;
  if ((s?.stoppedByUser || found) && promptOrigin?.kind !== "observer-activity") {
    if (!userInitiated) {
      T();
      throw new AgentStoppedByUserError(
        `Agent ${agentId} was stopped by the user and won't be resumed. Treat its work as cancelled; only launch a new agent if the user explicitly asks.`,
      );
    }
  }
  if (Un) {
    logFeatureBad("subagent_launch", "subagent_resume_no_rule_diskless");
    T();
    throw new AgentResumePermanentlyRefusedError(
      `Background agents are switched off in this session, and it no longer tracks agent ${agentId}, so the agent cannot be resumed. Start a new agent if the work is still needed.`,
    );
  }
  let forkedSkillScoping = await readForkedSkillScoping(identityAgentId2(agentId), toolUseContext.storageV5);
  let cn =
    "transientRead" in forkedSkillScoping && forkedSkillScoping.transientRead
      ? AgentResumeTransientError
      : ResumeAgentStateError;
  if (forkedSkillScoping.status === "malformed") {
    logFeatureBad("subagent_launch", "forked_skill_resume_scoping_invalid");
    T();
    throw new cn(
      `Agent ${agentId} has a malformed forked-skill scoping record; refusing to resume it without the skill's permission scoping.`,
    );
  }
  if (forkedSkillScoping.status === "diskless") {
    logFeatureBad("subagent_launch", "forked_skill_resume_scoping_diskless");
    T();
    throw new ResumeAgentStateError(
      `Agent ${agentId} cannot be checked for a forked-skill scoping record: this diskless session has no storage backend or key for it. Refusing to resume it.`,
    );
  }
  if (
    (forkedSkillScoping.status === "absent" || forkedSkillScoping.status === "absent-but-marked") &&
    isLocalAgent(I) &&
    I.forkedSkillName !== undefined
  ) {
    logFeatureBad("subagent_launch", "forked_skill_resume_scoping_missing");
    T();
    throw new cn(
      `Agent ${agentId} ran as a forked skill but its scoping record is missing; refusing to resume it without the skill's permission scoping.`,
    );
  }
  if (forkedSkillScoping.status === "absent-but-marked") {
    logFeatureBad("subagent_launch", "forked_skill_resume_scoping_missing_cold");
    T();
    throw new cn(
      `Agent ${agentId} carries a forked-skill provenance marker but its scoping record is missing; refusing to resume it without the skill's permission scoping.`,
    );
  }
  if (forkedSkillScoping.status === "valid" && isLocalAgent(I)) {
    if (I.forkedSkillName !== forkedSkillScoping.scoping.skillName) {
      logFeatureBad("subagent_launch", "forked_skill_resume_scoping_mismatch");
      T();
      throw new ResumeAgentStateError(
        `Agent ${agentId} has a forked-skill scoping record that does not match its task record; refusing to resume it.`,
      );
    }
  } else if (forkedSkillScoping.status === "valid") {
    if (
      (await readForkedSkillName(identityAgentId2(agentId), toolUseContext.storageV5)) !==
      forkedSkillScoping.scoping.skillName
    ) {
      logFeatureBad("subagent_launch", "forked_skill_resume_cold_witness_mismatch");
      T();
      throw new ResumeAgentStateError(
        `Agent ${agentId} has a forked-skill scoping record with no matching provenance-marker witness; refusing to resume it on a cold path without a corroborated fork identity.`,
      );
    }
  }
  if (forkedSkillScoping.status !== "valid");
  let scoping = forkedSkillScoping.status === "valid" ? forkedSkillScoping.scoping : undefined;
  let allowRules = [];
  let denyRules = [];
  let fn;
  let mn;
  let checkout;
  if (scoping) {
    let n = await getCommands(getProjectRootOrNull(), toolUseContext.storageV5).catch(() => []);
    let filtered = toolUseContext
      .getAppState()
      .mcp.commands.filter((command) => command.type === "prompt" && command.loadedFrom === "mcp");
    let cmd = [...dropSyncedClashes(n, toolUseContext.getAppState().mcp.commands), ...filtered].find(
      (L) => L.name === scoping.skillName && L.type === "prompt",
    );
    if (cmd?.type === "prompt" && cmd.isKeptUnread === true) {
      cmd.loadDefinition?.().catch(() => {});
      logFeatureBad("subagent_launch", "forked_skill_resume_skill_unread");
      T();
      throw new AgentResumeTransientError(
        `Agent ${agentId} ran as forked skill ${scoping.skillName}, whose file has not been read since a reload kept it; refusing to resume it before it is. Try again shortly.`,
      );
    }
    if (cmd?.type !== "prompt" || (cmd.context !== "fork" && cmd.getContext === undefined)) {
      logFeatureBad("subagent_launch", "forked_skill_resume_skill_unresolved");
      T();
      throw new ResumeAgentStateError(
        `Agent ${agentId} ran as forked skill ${scoping.skillName}, which no longer resolves to a fork-capable skill; refusing to resume it without its permission scoping.`,
      );
    }
    let Te = describeSkillHiddenBehindPlugin(cmd);
    if (Te !== undefined) {
      logFeatureBad("subagent_launch", "forked_skill_resume_hidden_behind_plugin");
      T();
      throw new ResumeAgentStateError(
        `Agent ${agentId} ran as forked skill ${scoping.skillName}; refusing to resume it: ${Te}`,
      );
    }
    let me = await checkCommandSyncedAccess(cmd).catch((error) => {
      T();
      throw error instanceof ResumeAgentStateError ? error : new ResumeAgentStateError(errorMessage(error));
    });
    if (syncedSkillRefusalReason(cmd)) {
      let L = isHostCatalogSkill(cmd);
      logFeatureBad(
        "subagent_launch",
        L ? "forked_skill_resume_host_catalog_withheld" : "forked_skill_resume_sync_vetoed",
      );
      T();
      throw new ResumeAgentStateError(
        L
          ? `Agent ${agentId} ran as forked skill ${scoping.skillName}, which your organization's Skills setting currently turns off; refusing to resume it.`
          : `Agent ${agentId} ran as forked skill ${scoping.skillName}, an account-synced skill that is currently disabled (skills sync turned off or denied by policy); refusing to resume it.`,
      );
    }
    if (isDefined(me)) {
      logSyncedCommandRefused(cmd, me);
      logFeatureBad("subagent_launch", "forked_skill_resume_synced_plugin_refused", {
        reason: fromEnum(me),
      });
      T();
      throw new ResumeAgentStateError(
        `Agent ${agentId} ran as forked skill ${scoping.skillName}; refusing to resume it: ${refusalTextFor(me)}.`,
      );
    }
    allowRules = splitRuleList(
      await armedAllowedToolsOf(cmd).catch((error) => {
        logFeatureBad("subagent_launch", "forked_skill_resume_allowed_tools_failed");
        T();
        throw error instanceof ResumeAgentStateError ? error : new ResumeAgentStateError(errorMessage(error));
      }),
    );
    denyRules = splitRuleList(cmd.disallowedTools ?? []);
    fn = getBareCommandName(cmd);
    mn = getBareCommandNameUnlessSynced(cmd);
    checkout = slashTestPattern(mn) === null ? undefined : await resolveSkillGitRoot(cmd, null);
  }
  let frozenCommandDenies = scoping
    ? (scoping.frozenCommandDenies ??
      toolUseContext.getAppState().toolPermissionContext.alwaysDenyRules.command ??
      [])
    : undefined;
  let Xn = scoping
    ? [
        ...(allowRules.length === 0
          ? []
          : [
              {
                kind: "allowed_tools",
                allowedTools: allowRules,
              },
            ]),
        ...(denyRules.length === 0
          ? []
          : [
              {
                kind: "disallowed_tools",
                disallowedTools: denyRules,
              },
            ]),
      ]
    : [];
  let spawnProvenanceMarks = resolveSpawnProvenanceMarks(agentId, s, toolUseContext);
  let xe = {
    ...toolUseContext,
    ...spawnProvenanceMarks.marks,
  };
  let Ue = scoping
    ? {
        ...xe,
        getAppState: withCommandRuleOverrides(toolUseContext.getAppState, allowRules, denyRules, {
          replaceCommandRules: true,
          frozenCommandDenies,
        }),
        permissionLayers:
          Xn.length > 0
            ? [...(toolUseContext.permissionLayers ?? []), ...Xn]
            : toolUseContext.permissionLayers,
      }
    : xe;
  let U = taskRegistry.get(agentId);
  let we = isLocalAgent(U) ? U.result : undefined;
  let modelsUsed = we?.modelsUsed ?? (we?.resolvedModel ? [we.resolvedModel] : undefined);
  let ye = (isLocalAgent(U) ? U.spawnDepth : s?.spawnDepth) ?? getAgentDepth(toolUseContext.agentContext) + 1;
  let startTime = isLocalAgent(U) ? U.startTime : now;
  let z = Qt;
  if (!z) {
    let messages = taskRegistry.getTranscript(agentId)?.messages;
    if (messages && messages.length > 0) {
      logForDebugging(
        `[resumeAgentBackground ${agentId}] disk transcript missing; using ${messages.length} in-memory messages mirrored during the run`,
      );
      z = {
        messages: messages.map((message) =>
          message.type === "user" &&
          message.isMeta !== true &&
          message.origin?.kind === "coordinator" &&
          typeof message.message.content === "string"
            ? {
                ...message,
                isMeta: true,
                message: {
                  ...message.message,
                  content: wrapCoordinatorMessage(message.message.content),
                },
              }
            : message,
        ),
        contentReplacements: [],
      };
    }
  }
  if (!z) {
    logFeatureBad("subagent_launch", "subagent_resume_transcript_missing");
    T();
    throw new ResumeAgentStateError(`No transcript found for agent ID: ${agentId}`, {
      transcriptMissing: true,
    });
  }
  if (isDiskless() && !isLocalAgent(I) && !Kn) {
    let { signal } = toolUseContext.abortController;
    let y =
      (await readAgentWorkerEvents(agentId, signal).catch((error) => {
        if (!signal.aborted) logError(error);
        return null;
      })) ?? null;
    if (signal.aborted) {
      T();
      throw new AbortError();
    }
    if (isAgentTranscriptOverBound(agentId)) throw an();
    if (y === null || (y.length === 0 && !hasWrittenAgentTranscript(agentId))) {
      logFeatureBad(
        "subagent_launch",
        y === null ? "subagent_resume_transcript_read_failed" : "subagent_resume_transcript_stored_empty",
      );
      T();
      throw new AgentResumeTransientError(
        `Agent ${agentId}'s stored transcript could not be read, or is empty. Send the message again, or start a new agent if that fails too.`,
      );
    }
    if (
      !isTranscriptChainIntact(
        y,
        z.messages.map((message) => message.uuid),
      )
    ) {
      logFeatureBad("subagent_launch", "subagent_resume_transcript_gap");
      T();
      throw new AgentResumePermanentlyRefusedError(
        `Part of agent ${agentId}'s transcript is missing, so it cannot go on from where it stopped. Start a new agent if the work is still needed.`,
      );
    }
  }
  degradeRestoredMessages(z.messages);
  let be =
    continueInterruptedTurn === true &&
    waitingToolUse !== undefined &&
    isOnlyPendingToolUse(z.messages, waitingToolUse.id);
  if (!be) waitingToolUse?.settled();
  let Zt = continueInterruptedTurn
    ? be
      ? z.messages
      : [...trimIncompleteTail(z.messages)]
    : z.messages.map((message) => repairShutdownInterruptedTurn(message, agentId));
  let resumedMessages = filterThinkingOnlyUntilStable(
    normalizeMessagesForResume(
      regroupSplitResponsesOnResume(
        dropApiInvalidAssistantBlocks(dropMalformedAttachments(Zt), {
          site: "agent_resume",
        }),
      ),
      be ? new Set([waitingToolUse.id]) : undefined,
    ),
  );
  if (continueInterruptedTurn && !be && resumedMessages.length > 0 && !endsWithUserPrompt(resumedMessages)) {
    taskRegistry.update(agentId, (n) => ({
      ...n,
      resuming: false,
      notified: true,
      evictAfter: agentEvictAt(n),
    }));
    logFeatureOk("subagent_launch");
    return {
      agentId,
      description: un ?? "(resumed)",
      outputFile: isDiskless() ? undefined : getTaskOutputPath(agentId),
      alreadyCompleted: true,
    };
  }
  let contentReplacementState = reconstructForSubagentResume(
    toolUseContext.contentReplacementState,
    resumedMessages,
    z.contentReplacements,
  );
  let agentType =
    !s &&
    ((isLocalAgent(U) &&
      (U.agentType === WEB_FETCH_BUILTIN_AGENT.agentType || U.webFetchSavedFiles !== undefined)) ||
      isWebFetchLaunch === true ||
      findAgentLaunchResults(toolUseContext.messages, agentId))
      ? WEB_FETCH_BUILTIN_AGENT.agentType
      : s?.agentType;
  let Y =
    s?.isFork === true
      ? undefined
      : agentType
        ? toolUseContext.options.agentDefinitions.activeAgents.find(
            (activeAgent) => activeAgent.agentType === agentType,
          )
        : undefined;
  let C = s?.isFork === true || (!Y && s?.isFork === undefined && s?.agentType === FORK_AGENT.agentType);
  let nt = agentType === WEB_FETCH_BUILTIN_AGENT.agentType && s?.isBuiltIn !== false;
  if (
    (isDiskless() ||
      isStoppedAgent(agentId) ||
      (s === null && keepsAgentMetadataInStream() && !isResumableAgent(agentId))) &&
    (!Y || (s?.isBuiltIn !== undefined && s.isBuiltIn !== isBuiltInAgent(Y))) &&
    s?.isFork !== true &&
    !nt &&
    !Kn
  ) {
    T();
    if (s === null) {
      logFeatureBad(
        "subagent_launch",
        isStoppedAgent(agentId)
          ? "subagent_resume_sidecar_missing_held"
          : "subagent_resume_sidecar_missing_gate_on",
      );
      throw new AgentResumePermanentlyRefusedError(
        `This session no longer has the saved settings of agent ${agentId}, so it cannot be resumed as the type it ran as. Start a new agent if the work is still needed.`,
      );
    }
    logFeatureBad(
      "subagent_launch",
      isDiskless() ? "subagent_resume_type_unmatched_diskless" : "subagent_resume_type_unmatched_held",
    );
    throw new AgentResumeTransientError(
      `The agent type that agent ${agentId} ran as is not on this session's list right now, or its name now belongs to a different type. Try once more; if that fails too, start a new agent.`,
    );
  }
  let tt = nt
    ? Y && isBuiltInAgent(Y)
      ? Y
      : WEB_FETCH_BUILTIN_AGENT
    : s?.isBuiltIn === false && agentType === WEB_FETCH_BUILTIN_AGENT.agentType
      ? Y && !isBuiltInAgent(Y)
        ? Y
        : GENERAL_PURPOSE_AGENT
      : (Y ?? (C ? FORK_AGENT : GENERAL_PURPOSE_AGENT));
  let J = await loadListedAgentDefinition(tt, toolUseContext.abortController.signal).catch((error) => {
    T();
    if (isAbortError(error)) throw error;
    logFeatureBad("subagent_launch", "subagent_resume_plugin_load_threw");
    throw new AgentResumeTransientError(errorMessage(error));
  });
  if (J === undefined) {
    logFeatureBad("subagent_launch", "subagent_resume_plugin_load_failed");
    T();
    throw new ResumeAgentStateError(
      `Agent type '${tt.agentType}' could not be loaded from its plugin, so the agent was not resumed.`,
    );
  }
  if (isAgentToolPoolDenied(J, toolPermissionContext)) {
    logFeatureBad("subagent_launch", "subagent_resume_tools_denied");
    T();
    throw new ResumeAgentStateError(agentToolPoolDeniedMessage(J.agentType));
  }
  if ((await filterOfferedAgents([J])).length !== 1) {
    logFeatureBad("subagent_launch", "subagent_resume_not_offered");
    T();
    throw new ResumeAgentStateError(`Agent type '${J.agentType}' is not offered in this session.`);
  }
  let Ae =
    backgroundLaunchRule !== undefined &&
    (zn || (W === "reply" && toolUseContext.toolUseId !== undefined && s?.requestShape !== "foreground")) &&
    !isBackgroundAgentLaunchDisabled() &&
    !isWebFetchAgent(J)
      ? runBackgroundLaunchRules(backgroundLaunchRule, {
          toolUseId: toolUseContext.toolUseId,
          callerAgentId: toolUseContext.agentId,
          signal: toolUseContext.abortController.signal,
          resumedAgentId: agentId,
        })
      : undefined;
  let ee =
    W === "inline" ||
    W === "call" ||
    (W === "reply" && ((isForegroundAgentMoveOff() && Ae === undefined) || isWebFetchAgent(J)));
  let pn =
    ee &&
    (W === "call" || (W === "reply" && backgroundLaunchRule !== undefined)) &&
    isMainConversationsOwnCall(toolUseContext);
  if (!ee && backgroundLaunchRule !== undefined && Ae === undefined) {
    logFeatureBad("subagent_launch", "subagent_resume_background_rule");
    T();
    throw new AgentResumePermanentlyRefusedError(AGENT_RESUME_BACKGROUND_REFUSED_TEXT);
  }
  let description = un ?? "(resumed)";
  let gn =
    promptOrigin?.kind === "observer-activity"
      ? undefined
      : await runResumeStartHooks(agentId, {
          tool_use_id: toolUseContext.toolUseId ?? "",
          parentModel: getMainLoopModel(toolUseContext),
          parentAgentId: agentId_2,
          signal: toolUseContext.abortController.signal,
          origin: toolUseContext.hookOrigin,
          agent: J,
          prompt: continueInterruptedTurn ? "" : prompt,
          description,
          model: !C && !s?.isObserver && typeof s?.model === "string" ? s.model : undefined,
          permissionMode: mode,
          background: !ee,
          fork: C,
          name: ue,
          cwd: s?.cwd && !hasUntouchableRecordSpelling(s.cwd) ? s.cwd : undefined,
        }).catch((error) => {
          T();
          if (!isAbortError(error)) logFeatureBad("subagent_launch", "subagent_resume_spawn_chain_failed");
          throw error;
        });
  using starting = gn?.starting;
  if (gn?.deny !== undefined) {
    logFeatureBad("subagent_launch", "subagent_resume_denied_by_hook");
    In();
    return {
      agentId,
      description,
      deniedByPlugin: pluginDeclinedResumeMessage(gn.deny),
    };
  }
  let ze = (n, y) => {
    let currentWorktreeSession = getCurrentWorktreeSession();
    let Te = s?.cwd && !hasUntouchableRecordSpelling(s.cwd) ? s.cwd : getCwd();
    let me = gitRootsForPath(Te);
    let L =
      currentWorktreeSession !== null &&
      me.length > 0 &&
      (() => {
        let gr = [
          currentWorktreeSession.worktreePath,
          ...gitRootsForPath(currentWorktreeSession.originalCwd),
          ...(currentWorktreeSession.liveLaunchAnchor
            ? [
                currentWorktreeSession.liveLaunchAnchor,
                ...gitRootsForPath(currentWorktreeSession.liveLaunchAnchor),
              ]
            : []),
          STARTUP_CWD_REALPATH,
          ...gitRootsForPath(STARTUP_CWD_REALPATH),
        ];
        return me.every((hr) => gr.some((kr) => compareSameContainment(hr, kr) === "same"));
      })();
    let telemetryCode = y?.telemetryCode ?? "git_worktree_resume_worktree_gone";
    let pr = s?.worktreePath ?? `agent ${agentId}`;
    if (L) {
      logFeatureSad(GIT_WORKTREE_CREATE, telemetryCode);
      logForDebugging(
        `Resumed worktree ${pr} ${n}; falling back to ${Te} under the session worktree's fences`,
        {
          level: "error",
        },
      );
      return;
    }
    if (y?.terminalOnUncovered === false) {
      T();
      throw new AgentResumeTransientError(
        `Cannot resume this agent right now: its worktree ${n}, and the fallback directory is not covered by the session's isolation fences. Re-run from a session whose fences cover the agent's directory.`,
      );
    }
    logFeatureBad(GIT_WORKTREE_CREATE, telemetryCode);
    T();
    throw new AgentResumePermanentlyRefusedError(
      `This agent cannot be resumed: its worktree ${n}, and the fallback directory is not covered by the session's isolation fences.`,
    );
  };
  let tr = safeWorktreePath(s?.worktreePath);
  let rr = safeWorktreePath(s?.inheritedWorktreePath);
  let Ke = tr ?? rr;
  let Se = Ke
    ? await promises.stat(Ke).then(
        (n) => (n.isDirectory() ? Ke : ze("exists but is not a directory")),
        (error) => {
          let errnoCode = getErrnoCode(error);
          if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return ze("no longer exists");
          T();
          throw new AgentResumeTransientError(
            `Cannot resume this agent: its worktree could not be examined (${String(errnoCode ?? "unknown error")}). Re-run once the directory is accessible.`,
          );
        },
      )
    : undefined;
  if (
    Ke === undefined &&
    !wasAgentCleanlyRemoved(agentId) &&
    ((s !== null &&
      s.spawnedWithWorktree === true &&
      s.worktreeCleanlyRemoved !== true &&
      !(
        s.inheritedWorktreePath !== undefined &&
        s.parentAgentId !== undefined &&
        (
          await readAgentMetadata(identityAgentId2(s.parentAgentId), toolUseContext.storageV5).catch(
            makeSidecarReadFallback("resumeAgentBackground (parent)"),
          )
        )?.worktreeCleanlyRemoved === true
      )) ||
      wasAgentSpawnedIsolated(agentId))
  )
    ze("is not recorded for this isolated agent", {
      telemetryCode: "git_worktree_resume_binding_missing",
      terminalOnUncovered: wasAgentSpawnedIsolated(agentId),
    });
  let le = Se;
  if (Se) {
    let originalCwd = getOriginalCwd();
    let y = await promises.realpath(originalCwd).catch(() => originalCwd);
    let b = await checkWorktreeIsolation(
      Se,
      gitRootsForPath(originalCwd),
      uniq([y, STARTUP_CWD_REALPATH, ...gitRootsForPath(STARTUP_CWD_REALPATH)]),
      {
        requireWitnessForSelfOwningPins: true,
        declineSelfOwningPinUnderLiveRoot: true,
      },
    );
    if (!b.ok) {
      T();
      if (b.reason !== "unverifiable" && b.reason !== "pin-is-own-launch-tree") {
        logFeatureBad(GIT_WORKTREE_CREATE, "git_worktree_create_root_rejected");
        logForDebugging(`[worktree] refusing to resume parked agent into ${Se} (${b.reason}): ${b.message}`, {
          level: "error",
        });
        throw new AgentResumePermanentlyRefusedError(
          `This agent cannot be resumed: its worktree was refused (${b.reason}). ${b.message}`,
        );
      }
      logForDebugging(
        `[worktree] could not verify parked agent worktree ${Se} this attempt; the resume will retry: ${b.message}`,
      );
      throw new AgentResumeTransientError(
        `Cannot resume this agent right now: its worktree could not be verified (${b.reason}). Re-run once git can answer.`,
      );
    }
  }
  if (le) {
    let date = new Date();
    try {
      await promises.utimes(le, date, date);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
        le = ze("vanished between verification and the resume");
      else {
        T();
        throw new AgentResumeTransientError(
          `Cannot resume this agent: its worktree could not be touched (${String(errnoCode ?? "unknown error")}). Re-run once the directory is accessible.`,
        );
      }
    }
  }
  let rt = s?.cwd && !hasUntouchableRecordSpelling(s.cwd) ? s.cwd : le;
  let hn = toolUseContext.session.withProject({
    cwd: rt ?? (toolUseContext.session.project === null ? undefined : getCwd()),
  });
  if (hn.project === null && hasOutermostCallFrame()) {
    logFeatureBad("subagent_launch", "subagent_resume_no_directory_in_cwd_scope");
    T();
    throw new AgentResumePermanentlyRefusedError(
      "This agent cannot be resumed from here in this session. Do the rest of the task without it.",
    );
  }
  let effort = s?.effort !== undefined && isEffortLevel(s.effort) ? s.effort : undefined;
  let st = s?.isObserver || C ? undefined : effort;
  let effort_2 = scoping?.effort ?? st;
  let N =
    effort_2 !== undefined
      ? {
          ...J,
          effort: effort_2,
        }
      : J;
  let Qe;
  if (C) {
    if (toolUseContext.renderedSystemPrompt) Qe = toolUseContext.renderedSystemPrompt;
    else
      try {
        let mainThreadAgentDefinition = appState.agent
          ? appState.agentDefinitions.activeAgents.find(
              (activeAgent) => activeAgent.agentType === appState.agent,
            )
          : undefined;
        let defaultSystemPrompt = await getSystemPrompt(
          toolUseContext.options.tools,
          toolUseContext.options.mainLoopModel,
        );
        Qe = effectiveSystemPromptText({
          mainThreadAgentDefinition,
          toolUseContext,
          customSystemPrompt: toolUseContext.options.customSystemPrompt,
          defaultSystemPrompt,
          appendSystemPrompt: toolUseContext.options.appendSystemPrompt,
        });
      } catch (error) {
        logFeatureBad("subagent_launch", "subagent_resume_fork_prompt_reconstruct_failed");
        T();
        throw error instanceof ResumeAgentStateError ? error : new ResumeAgentStateError(errorMessage(error));
      }
    if (!Qe) {
      logFeatureBad("subagent_launch", "subagent_resume_fork_prompt_missing");
      T();
      throw new ResumeAgentStateError("Cannot resume fork agent: unable to reconstruct parent system prompt");
    }
  }
  let mainLoopModel = getMainLoopModel(toolUseContext);
  let agentModel = getAgentModel(
    getExploreAgentModel(N, mainLoopModel),
    mainLoopModel,
    s?.isObserver ? undefined : C ? "inherit" : s?.model,
    mode,
  );
  let systemPrompt = promptSnapshotUnlessRenderPoint(resumedMessages, Ue.options)?.systemPrompt;
  let he =
    s?.isObserver || scoping !== undefined
      ? undefined
      : resolveSubagentEffort({
          agentDefinition: N,
          isFork: C,
          model: agentModel,
          effortState: Ue.getAppState(),
          inheritedLayers: Ue.permissionLayers,
          recordedBudgetText: C ? findForkTokenReminders(resumedMessages) : systemPrompt,
        });
  N = he?.agentDefinition ?? N;
  let at =
    he === undefined && systemPrompt ? resolveTotalTokensReminderMode(undefined, systemPrompt) : undefined;
  if (promptOrigin?.kind === "observer-activity" && s?.isObserver !== true) {
    logFeatureBad("subagent_launch", "observer_resume_sidecar_unconfirmed");
    T();
    throw new ResumeAgentStateError(
      `Observer sidecar for ${agentId} missing or did not confirm isObserver; refusing delivery`,
    );
  }
  let or = s?.isObserver ? (narrowerMode(workerPermissionMode, mode) ?? mode) : undefined;
  let filtered = toolUseContext.options.tools.filter(isMcpTool);
  if (!C && !s?.isObserver)
    await waitForCoordinatorSubagentMcpServers(() => toolUseContext.getAppState().mcp);
  let appState_2 = toolUseContext.getAppState();
  let ar = C
    ? excludeCoordinatorCommsMcpTools(toolUseContext.options.tools)
    : assembleAgentToolPool(toolUseContext, toolPermissionContext, appState_2.mcp.tools.concat(filtered));
  let wn = s?.isObserver
    ? observerToolset(
        resolveAgentTools(
          N,
          assembleAgentToolPool(toolUseContext, toolPermissionContext, filtered),
          true,
          false,
          false,
          ye,
          memoryModeForSession(toolUseContext).mode,
        ).resolvedTools,
      )
    : ar;
  let sendMessageToolAbsent =
    promptOrigin?.kind === "peer" &&
    !hasSendMessageTool(
      C || s?.isObserver ? wn : resolveAgentTools(N, wn, true, false, false, ye).resolvedTools,
    );
  let ut = isGlimmeringFinchGateOn();
  let lt = ut ? unreadableToolsUsed(promptToolsUsed ?? [], resumedMessages) : undefined;
  let ct = lt === undefined ? [] : [markToolSummaryMessage(createUserMessage(summaryCompanionMessage(lt)))];
  let ft = ut ? undefined : unreadableToolsLine(promptToolsUsed ?? [], resumedMessages);
  let Je = joinWithNewlineIfAny(prompt, ft);
  let ur = adjustLastOffset(promptNoticeLengths, ft);
  if (isSillyShoreGateOn())
    getConversationToolsUsed().record(tagUntrustedArtifactContent(resumedMessages, undefined, false));
  let Xe = promptOrigin
    ? withJoinedNotices(
        ur,
        promptNoticeOwn,
        promptNoticeRunIds,
        createUserMessage({
          content: classifyNonUserMessageSource(Je, promptOrigin, {
            sendMessageToolAbsent,
          }),
          origin: promptOrigin,
          isMeta: true,
        }),
      )
    : createUserMessage({
        content: promptIsMeta
          ? classifyNonUserMessageSource(Je, undefined, {
              isMeta: true,
            })
          : Je,
        ...(promptIsMeta && {
          isMeta: true,
        }),
      });
  let webFetchSavedFiles = isLocalAgent(U) ? U.webFetchSavedFiles : undefined;
  let persistedToolResultFiles = isWebFetchAgent(N)
    ? webFetchSavedFiles
      ? {
          dirs: [...webFetchSavedFiles.dirs],
          paths: [...webFetchSavedFiles.paths],
        }
      : defaultToolResultsStorage()
    : undefined;
  let gt = {
    agentId,
    deliveringLoop: toolUseContext.agentId,
  };
  let bn =
    s?.isObserver === true &&
    (promptOrigin?.kind === "observer-activity" || (isLocalAgent(U) && U.isObserver === true));
  if (s?.isObserver === true && !bn && forwardUserIntentEnv())
    logFeatureBad("agent_intent_forward", "unconfirmed_observer");
  let ht =
    userInitiated && (s?.stoppedByUser === true || found || (isLocalAgent(I) && I.stoppedByUser === true));
  let kt =
    ht ||
    (userInitiated &&
      isLocalAgent(I) &&
      (I.status === "killed" || I.status === "completed" || I.status === "failed"));
  let wt = s?.finished === true || (isLocalAgent(I) && (I.status === "completed" || I.status === "failed"));
  if (kt && userStopCount(taskRegistry.get(agentId)) === $e)
    try {
      await updateAgentMetadata(
        identityAgentId2(agentId),
        {
          revivedAt,
          ...(wt && {
            finished: undefined,
          }),
        },
        toolUseContext.storageV5,
      );
      $n = wt;
    } catch (error) {
      if (isFsInaccessible(error) || isFsInaccessibleCode(storageCauseErrnoCode(error)))
        logForDebugging(`failed to record the revival of ${agentId}: ${describeStorageError(error)}`, {
          level: "warn",
        });
      else logError(error);
    }
  if (!continueInterruptedTurn) markDirectDelivery_2(agentId, Xe, "user");
  let _n;
  if (!continueInterruptedTurn && !bn)
    try {
      _n = liveTranscript?.();
    } catch (error) {
      logError(error);
      logFeatureSad("agent_intent_forward", "live_check_failed");
    }
  let An =
    continueInterruptedTurn || bn
      ? undefined
      : pendingTurnsForAgent(gt, _n ?? toolUseContext.messages, _n === undefined ? "snapshot" : "live");
  let copies = An?.copies ?? [];
  let Sn = getTaskRunState().canUseToolNarrowings.get(agentId);
  let bt = C
    ? {
        systemPrompt: Qe,
        parentSystemPrompt: true,
      }
    : s?.isObserver
      ? {
          agentToolScope: N,
        }
      : undefined;
  let vn = s?.launchedWithDefaults === true && !isHookOrPluginSteered(xe);
  let launchModel = vn || C || s?.isObserver || isHookOrPluginSteered(xe) ? undefined : s?.model;
  let { onToolPool, reviewTools } = createDeferredReviewTools(toolUseContext.options.tools);
  let At = {
    agentDefinition: N,
    promptMessages: continueInterruptedTurn ? resumedMessages : [...resumedMessages, ...copies, ...ct, Xe],
    turnPrompt: continueInterruptedTurn ? undefined : (getContentText(Xe.message.content) ?? undefined),
    waitingToolUse: be ? waitingToolUse : undefined,
    toolUseContext: Ue,
    canUseTool: Sn ? Sn(canUseTool) : canUseTool,
    handbackOptIn: !(C || s?.isObserver),
    handbackTool: ObserverReportTool,
    isAsync: true,
    requestShape:
      !s?.isObserver && (s?.requestShape === "foreground" || s?.requestShape === "background")
        ? s.requestShape
        : undefined,
    requestNonInteractive:
      !s?.isObserver && typeof s?.requestNonInteractive === "boolean"
        ? s.requestNonInteractive || getIsNonInteractiveSession()
        : undefined,
    preserveToolUseResults: !getIsNonInteractiveSession(),
    persistedToolResultFiles,
    querySource: getQuerySourceForAgent(N.agentType, isBuiltInAgent(N)),
    spawnedBySkill: fn,
    ...(scoping !== undefined && {
      spawnedByForkedSkill: true,
    }),
    model: s?.isObserver ? undefined : C ? "inherit" : s?.model,
    effort: st,
    onModelRestricted: s?.isObserver
      ? undefined
      : agentModelRestrictionNotifier(fn ?? N.agentType, toolUseContext.appendSystemMessage),
    override: Sn
      ? {
          ...bt,
          requireCanUseTool: true,
        }
      : bt,
    availableTools: wn,
    assembleAvailableTools: (n) => assembleAgentToolPool(toolUseContext, toolPermissionContext, n),
    onToolPool,
    forkContextMessages: undefined,
    recordedUuids: new Set(resumedMessages.map((n) => n.uuid)),
    compactTranscriptUnavailable: C,
    ...((C || s?.isObserver) && {
      useExactTools: true,
    }),
    totalTokensReminderBudget: he ? he.totalTokensBudget : at,
    isTotalTokensReminderBudgetOnTopOfStart: he
      ? he.isBudgetOnTopOfStart
      : at !== undefined && (C ? getCalmMochiScope() !== "none" : getCalmMochiScope() === "all"),
    worktreePath: le,
    worktreeBranch,
    cwd: s?.cwd,
    launchedWithDefaults: vn,
    spawnMode: or ?? s?.spawnMode,
    description: un,
    name: ue,
    toolUseId: Qn,
    contentReplacementState,
  };
  let ce = taskRegistry.get(agentId);
  if (isLocalAgent(ce) && ce.stoppedByUser && (!userInitiated || (ce.userStopCount ?? 0) !== $e)) {
    T();
    throw new AgentStoppedByUserError(
      `Agent ${agentId} was stopped by the user and won't be resumed. Treat its work as cancelled; only launch a new agent if the user explicitly asks.`,
    );
  }
  let Ze = Ae?.confirm(toolUseContext.abortController.signal);
  if (Ze !== undefined) {
    T();
    if (Ze.kind === "aborted") throw new AbortError();
    if (Ze.kind === "refused") {
      logFeatureBad("subagent_launch", "subagent_resume_refused_by_rule");
      throw new AgentResumePermanentlyRefusedError(Ze.message);
    }
    logFeatureBad("subagent_launch", "subagent_resume_background_closed");
    throw new ResumeAgentStateError(BACKGROUND_AGENTS_UNAVAILABLE);
  }
  for (let copy of copies) appendAgentTranscriptMessage(agentId, copy, taskRegistry);
  if (!promptIsMeta && !continueInterruptedTurn) {
    for (let n of ct) appendAgentTranscriptMessage(agentId, n, taskRegistry);
    appendAgentTranscriptMessage(
      agentId,
      isNonHumanInboundOrigin(promptOrigin)
        ? Xe
        : createUserMessage({
            content: Je,
            origin: promptOrigin,
          }),
      taskRegistry,
    );
  }
  onDeliveryCommitted?.();
  let St = {
    outputFileReadable: willToolsLoseSessionState(toolUseContext.options.tools),
    agentId,
    ownerAgentId: mainAgentId(),
    parentAgentId: s?.parentAgentId,
    spawnDepth: ye,
    launchedWithDefaults: vn,
    launchModel,
    description,
    prompt,
    model: agentModel,
    selectedAgent: N,
    taskRegistry,
    toolUseId: toolUseContext.toolUseId ?? safeIdentifierOrUndefined(ce?.toolUseId) ?? Qn,
    cwd: rt ?? (toolUseContext.agentWorktree !== undefined ? getCwd() : undefined),
  };
  let Tt = W === "call" && autoBackgroundMsForLaunch(backgroundLaunchRule, isForegroundAgentMoveOff());
  let ne =
    W === "call"
      ? registerAgentForeground({
          ...St,
          parentAbortController: toolUseContext.abortController,
          ...autoBackgroundOptions(backgroundLaunchRule, Tt),
          isDirectCall: !toolUseContext.innerCall && toolUseContext.hookCaller === undefined,
        })
      : undefined;
  let Rn = {
    moved: false,
  };
  let q =
    ne !== undefined
      ? {
          agentId,
          abortController: ne.abortController,
          outputFile: ne.outputFile,
        }
      : registerAsyncAgent({
          ...St,
          parentAbortController: ee ? toolUseContext.abortController : undefined,
          awaitedByCaller: ee,
          awaitedByMainTurn: pn,
          forkedSkillName: scoping?.skillName,
          ...(promptOrigin?.kind === "observer-activity" && {
            isObserver: true,
          }),
          sessionScratch: toolUseContext.session.sessionScratch,
        });
  if (
    Ae !== undefined &&
    !Ae.handOver({
      agentId: q.agentId,
      abortController: q.abortController,
    })
  ) {
    killAsyncAgent(q.agentId, taskRegistry, "system", undefined, {
      lifecycleNotStarted: true,
    });
    markAgentNotified(q.agentId, taskRegistry);
    logFeatureBad("subagent_launch", "subagent_resume_background_not_taken");
    throw new AgentResumePermanentlyRefusedError(AGENT_RESUME_BACKGROUND_REFUSED_TEXT);
  }
  spawnProvenanceMarks.admit();
  Be();
  starting?.started({
    agentId,
    model: agentModel,
  });
  let te =
    promptOrigin?.kind === "observer-activity"
      ? undefined
      : resolveVisibleSubagentId(toolUseContext.agentId, taskRegistry);
  let fr = !isLocalAgent(ce) || (ce.notified && ce.quietlyParked !== true);
  let vt = false;
  if (te !== undefined) {
    let n = new Set();
    let y = te;
    while (y !== undefined && !n.has(y)) {
      n.add(y);
      let b = taskRegistry.get(y);
      y = isLocalAgent(b) ? b.ownerAgentId : undefined;
      if (y === agentId) {
        vt = true;
        break;
      }
    }
  }
  if (te !== undefined && te !== agentId && fr && !vt) {
    let previousOwnerId;
    let y = !getIsNonInteractiveSession();
    taskRegistry.update(agentId, (b) => {
      if (b.ownerAgentId !== te) previousOwnerId = b.ownerAgentId;
      else if (!y || b.handbackRecipient === te) return b;
      return {
        ...b,
        ownerAgentId: te,
        ...(y && {
          handbackRecipient: te,
        }),
      };
    });
    if (y) addAgentKeepaliveReason(te, `agent:${agentId}`, taskRegistry);
    if (previousOwnerId !== undefined) notifyAgentReparented(agentId, previousOwnerId, taskRegistry);
  }
  let en = taskRegistry.get(agentId);
  let Rt = isLocalAgent(en) && isCurrentAgentId(toolUseContext.agentId, en.ownerAgentId, taskRegistry);
  let On = Rt
    ? hasSendMessageTool(toolUseContext.options.tools)
    : isLocalAgent(en)
      ? en.ownerCanContinueAgents
      : undefined;
  if (Rt)
    taskRegistry.update(agentId, (n) =>
      n.ownerCanContinueAgents === On
        ? n
        : {
            ...n,
            ownerCanContinueAgents: On,
          },
    );
  if (kt) {
    let n = taskRegistry.get(agentId);
    toolUseContext.messageQueue.enqueuePendingNotification(
      buildUserResumedNotice({
        agentId,
        description,
        to: resolveNotificationRecipient({
          ownerAgentId: isLocalAgent(n) ? n.ownerAgentId : undefined,
          keepaliveReason: `agent:${agentId}`,
          delivering: true,
          taskRegistry,
        }),
      }),
    );
  }
  if (ht) {
    let n = (b) => {
      if (isFsInaccessible(b) || isFsInaccessibleCode(storageCauseErrnoCode(b)))
        logForDebugging(`failed to clear stop marker for ${agentId}: ${describeStorageError(b)}`, {
          level: "warn",
        });
      else logError(b);
    };
    let y = () => userStopCount(taskRegistry.get(agentId)) !== $e;
    if (!y()) {
      await clearAgentStopSibling(identityAgentId2(agentId), "stoppedByUser", toolUseContext.storageV5).catch(
        n,
      );
      await updateAgentMetadata(
        identityAgentId2(agentId),
        {
          stoppedByUser: false,
        },
        toolUseContext.storageV5,
      ).catch(n);
      if (y()) await landStoppedByUser(identityAgentId2(agentId), N.agentType, toolUseContext.storageV5);
    }
  }
  if (suppressOwnerNotification) markAgentNotified(q.agentId, taskRegistry);
  await rearmObserverOnResume({
    observedTaskId: agentId,
    observedDefinition: N,
    observedName: ue ?? N.agentType,
    observedMeta: s
      ? {
          observerTaskId: s.observerTaskId,
          armingPermissionMode: s.armingPermissionMode,
        }
      : null,
    toolUseContext,
    canUseTool,
  });
  pruneSettledChildWork(agentId, taskRegistry);
  if (ue !== undefined && toolUseContext.getAppState().agentNameRegistry.get(ue) === undefined)
    toolUseContext.agentLifecycle.registerName(ue, identityAgentId2(agentId));
  let Ot = {
    prompt,
    resolvedAgentModel: agentModel,
    modelsUsed,
    isBuiltInAgent: isBuiltInAgent(N),
    startTime,
    agentType: N.agentType,
    isAsync: true,
    agentDepth: ye,
    callerCanContinueAgents: On,
    source: N.source,
    pluginId: isPluginAgent(N) ? parsePluginIdentifier_2(N.plugin) : undefined,
    persistedToolResultFiles,
    spawnedSubagent: isLocalAgent(U) ? U.spawnedSubagent : undefined,
    priorForeignArtifactContent:
      (we !== undefined && messageHasUntrustedBlock(we)) || messagesContainUntrustedContent(z.messages),
  };
  let Mn = {
    agentId,
    parentAgentId: toolUseContext.agentId,
    depth: ye,
    ...(getTaskRunState().spawnedByMainThread.has(agentId) && {
      spawnedByMainThread: true,
    }),
    parentSessionId: getParentSessionId(),
    agentType: "subagent",
    subagentName: N.agentType,
    displayName: ue,
    isAsync: true,
    isBuiltIn: isBuiltInAgent(N),
    invokingRequestId,
    invocationKind: "resume",
    invocationEmitted: false,
    parentPromptId,
    isBackgroundAgent: !pn,
    ...(W === "call" && {
      reapsShellsUnlessMoved: true,
    }),
    ...getWorkflowRunFields(toolUseContext.agentContext),
  };
  let onRunSettled =
    promptOrigin?.kind === "observer-activity" ? () => {} : taskRegistry.takeConcurrencySlot();
  let nn = runWithCwdOverride(Mn, () =>
    withCallFrameCwd(hn.project, () =>
      runAsyncAgentLifecycle({
        taskId: q.agentId,
        abortController: q.abortController,
        makeStream: (onCacheSafeParams, onQueryProgress, onStreamTokenEstimate) =>
          runAgent({
            ...At,
            session: hn,
            override: {
              ...At.override,
              agentId: identityAgentId2(q.agentId),
              agentContext: Mn,
              abortController: q.abortController,
            },
            onCacheSafeParams,
            onQueryProgress,
            onStreamTokenEstimate,
            ...(backgroundLaunchRule !== undefined &&
              ee &&
              !pn && {
                canShowPermissionPrompts: false,
              }),
          }),
        metadata: {
          ...Ot,
          agentContext: Mn,
        },
        description,
        toolUseContext,
        taskRegistry,
        agentIdForCleanup: agentId,
        reviewTools,
        enableSummarization:
          getSdkAgentProgressSummariesEnabled() ||
          ((isCoordinatorMode() || C || isForkSubagentEnabled()) && !getIsNonInteractiveSession()),
        getWorktreeResult: async () =>
          le
            ? {
                worktreePath: le,
                ...(worktreeBranch !== undefined && {
                  worktreeBranch,
                }),
              }
            : {},
        shouldNotifyOwner: W === "call" ? () => Rn.moved : ee ? () => false : undefined,
        reviewInlineHandoff: W !== "inline" && ee,
        onTerminalSuccess: scoping
          ? () => {
              let skillName = scoping.skillName;
              let y = `:${skillName}`;
              if (getInvokedSkills().has(y)) return;
              addInvokedSkill(skillName, skillName, "", null);
              let b = slashTestPattern(mn ?? skillName);
              if (b)
                toolUseContext.applyAttributionOp({
                  kind: "recordVerification",
                  method: b,
                  checkout,
                });
            }
          : undefined,
        onRunSettled,
      }),
    ),
  );
  if (An !== undefined) recordTurnsDeliveredIndirect(gt, An);
  logFeatureOk("subagent_launch");
  if (ee)
    try {
      if (ne === undefined) await nn;
      else if (
        settleBackgroundedAgent({
          outcome: await raceAgentLaunch(nn, ne.backgroundSignal, Tt),
          registration: ne,
          wait: Rn,
          ownerAgentId: mainAgentId(),
          taskRegistry,
          sessionScratch: toolUseContext.session.sessionScratch,
          agentTask: {
            armWorkerCheckinForBackgroundedAgent: recordWorkerCheckin,
            backgroundAgentTask: moveAgentToBackground,
            hasAgentChildKeepalive: hasChildAgents,
          },
        })
      )
        return {
          agentId,
          description,
          outputFile: ne.outputFile,
          movedRunEnded: nn.catch(logError),
        };
      let n = taskRegistry.get(agentId);
      let y = isLocalAgent(n) ? n.result : undefined;
      return {
        agentId,
        description,
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
        Object.defineProperty(error, RESUMEDINLINE, {
          value: true,
        });
        Object.defineProperty(error, RESUMEDINLINEPRIORFOREIGNARTIFACTCONTENT, {
          value:
            Ot.priorForeignArtifactContent === true ||
            (RESUMEDINLINEPRIORFOREIGNARTIFACTCONTENT in error &&
              error[RESUMEDINLINEPRIORFOREIGNARTIFACTCONTENT] === true),
          configurable: true,
        });
        let y = RESUMEDINLINESALVAGE in error ? error[RESUMEDINLINESALVAGE] : undefined;
        let b = y instanceof agentOverridesMap ? y : new agentOverridesMap();
        b.set(agentId, {
          handback: getPendingHandbackReport(taskRegistry.get(agentId), agentId),
          reviewTools: reviewTools(),
        });
        Object.defineProperty(error, RESUMEDINLINESALVAGE, {
          value: b,
        });
      }
      throw error;
    } finally {
      ne?.cancelAutoBackground?.();
      ne?.detachParentAbortRelay();
      if (!Rn.moved) {
        getTaskRunState().agentBackgroundSignalResolvers.delete(agentId);
        if (!hasChildAgents(agentId, taskRegistry) && !hasPendingChildWork(agentId, taskRegistry))
          forgetHandback(agentId);
        taskRegistry.update(agentId, (n) => ({
          ...n,
          notified: true,
          evictAfter: agentEvictAt(n),
        }));
      }
    }
  return {
    agentId,
    description,
    outputFile: q.outputFile,
  };
}
//@ chunk-0m7em5b4.js:43509-43904 placement
function repairShutdownInterruptedTurn(message, agentId) {
  if (
    message.type !== "user" ||
    !("agentId" in message && message.agentId === agentId) ||
    message.interruptedByShutdown !== true ||
    !Array.isArray(message.message.content)
  )
    return message;
  if (!isShutdownInterrupted(message))
    return isInterruptionOnlyMessage(message)
      ? {
          ...message,
          message: {
            ...message.message,
            content: [
              {
                type: "text",
                text: AGENT_SESSION_ENDED_INTERRUPT,
              },
            ],
          },
        }
      : message;
  return {
    ...message,
    toolUseResult: TOOL_CALL_SESSION_ENDED,
    toolDenialKind: "interrupted",
    message: {
      ...message.message,
      content: message.message.content.map((w) =>
        w.type === "tool_result"
          ? {
              ...w,
              content: TOOL_CALL_SESSION_ENDED,
            }
          : w,
      ),
    },
  };
}
//@ chunk-0m7em5b4.js:43904-44013 placement
function withJoinedNotices(e, joinedNoticeOwn, joinedNoticeRunIds, userMessage) {
  return e === undefined
    ? userMessage
    : {
        ...userMessage,
        joinedNoticeLengths: e,
        joinedNoticeOwn,
        joinedNoticeRunIds,
      };
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
