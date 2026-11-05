/**
 * tools/AgentTool/resumeAgent.ts
 *
 * resumeAgentBackground：以 fork 身份在后台启动继承上下文的子代理（技能/内部调用，非 Agent 工具）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/resumeAgent.ts
 * pieces: chunk-yz2nt7xx.js (28)
 * attribution: placement 27, layout 1
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
  STREAM_PREFIXES,
  isGlimmeringFinchGateOn,
  isSillyShoreGateOn,
  collectToolsUsedBeforeSummary,
  messageHasUntrustedBlock,
  streamPrefixesPresent,
} from "../../utils/messages/untrustedArtifactContent.js";
import { isPollEventForAgent, isEvalSettleWakePollEvent } from "../../utils/pollEvents.js";
import {
  NodeFsOperations,
  findIntermediateUncJunction,
  hasUntouchableRecordSpelling,
} from "../../utils/fsOperations.js";
import { hasDotDotSegment } from "../../utils/pathClassification.js";
import { isNonWslUncPath, isNetworkMountRoot, isNetDir } from "../../utils/networkPaths.js";
import { allPeerOrigins } from "../../services/mcp/ccrTurnId.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { identityAgentId2 } from "../../utils/agentId.js";
import {
  getToolPermissionContext,
  withCommandRuleOverrides,
  getMainLoopModel,
  getPickedEffortModel,
} from "../../utils/permissions/toolPermissionContext.js";
import { isAgentStopPending } from "../../utils/agentProcessRegistry.js";
import { isTaskLoopSettled } from "../../tasks/taskLoopRegistry.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
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
  agentId,
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isEffortLevel } from "../../utils/effort.js";
import { getSystemPrompt } from "../../constants/prompts.js";
import { effectiveSystemPromptText } from "../../utils/systemPrompt.js";
import { getExploreAgentModel, getAgentModel, resolveAgentModelDisplay } from "../../utils/model/agent.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-yz2nt7xx.js:13815-13949 placement
function resumeReadError(error) {
  if (error instanceof ResumeAgentStateError) return error;
  let isTransient =
    error instanceof AgentTranscriptFetchError ||
    isUnavailableErrorCode(getErrnoCode(error) ?? storageCauseErrnoCode(error));
  let message = isFsInaccessible(error) ? unreadableStateMessage(error, isTransient) : errorMessage(error);
  return isTransient ? new AgentResumeTransientError(message) : new ResumeAgentStateError(message);
}
//@ chunk-yz2nt7xx.js:13949-14059 placement
function isResumeDenied(result) {
  return (
    typeof result === "object" &&
    result !== null &&
    "deniedByPlugin" in result &&
    typeof result.deniedByPlugin === "string"
  );
}
//@ chunk-yz2nt7xx.js:14059-14146 placement
var RESUMEDINLINE = "resumedInline";
var RESUMEDINLINEPRIORCARRIEDMARKERS = "resumedInlinePriorCarriedMarkers";
var RESUMEDINLINESALVAGE = "resumedInlineSalvage";
//@ chunk-yz2nt7xx.js:14146-14168 placement
/**
 * 用于承载代理覆盖的表（带类型标记，便于区分）。
 */
class agentOverridesMap extends Map {}
//@ chunk-yz2nt7xx.js:14168-14509 placement
/**
 * 代理恢复相关文案与不安全字符正则。
 */
var BACKGROUND_AGENTS_UNAVAILABLE =
  "Background agents cannot be started in this session right now. Send the message again if you still need this agent: it should then run while you wait, and its report will be that call's result.";
var AGENT_RESUME_BACKGROUND_REFUSED_TEXT =
  "This agent cannot be resumed in the background in this session. Start a new agent instead.";
var UNSAFE_AGENT_TEXT_REGEX = /[<>\p{Cc}]|(?![\u200c\u200d])\p{Cf}/u;
//@ chunk-yz2nt7xx.js:14509-14569 placement
function isMainConversationsOwnCall(toolUseContext) {
  return toolUseContext.agentId === undefined && toolUseContext.innerCall !== true;
}
//@ chunk-yz2nt7xx.js:14569-14632 placement
function isResumedInlineRunError(error) {
  return error instanceof Error && RESUMEDINLINE in error && error[RESUMEDINLINE] === true;
}
//@ chunk-yz2nt7xx.js:14632-14735 placement
function getResumeSalvage(error, agentId) {
  let salvageMap =
    error instanceof Error && RESUMEDINLINESALVAGE in error ? error[RESUMEDINLINESALVAGE] : undefined;
  return salvageMap instanceof agentOverridesMap ? salvageMap.get(agentId) : undefined;
}
//@ chunk-yz2nt7xx.js:14735-14778 placement
function resumedInlineRunHandback(error, agentId) {
  return getResumeSalvage(error, agentId)?.handback;
}
//@ chunk-yz2nt7xx.js:14778-14824 placement
function resumedInlineRunReviewTools(error, agentId) {
  return getResumeSalvage(error, agentId)?.reviewTools;
}
//@ chunk-yz2nt7xx.js:14824-14944 placement
function resumedInlineRunPriorCarriedMarkers(error) {
  let resumed =
    error instanceof Error && RESUMEDINLINEPRIORCARRIEDMARKERS in error
      ? error[RESUMEDINLINEPRIORCARRIEDMARKERS]
      : undefined;
  return Array.isArray(resumed) ? STREAM_PREFIXES.filter((id) => resumed.includes(id)) : STREAM_PREFIXES;
}
//@ chunk-yz2nt7xx.js:14944-15095 placement
class ResumeAgentStateError extends Error {
  transcriptMissing;
  constructor(message, options) {
    super(message);
    this.name = "ResumeAgentStateError";
    this.transcriptMissing = options?.transcriptMissing === true;
  }
}
//@ chunk-yz2nt7xx.js:15095-15124 placement
var GIT_WORKTREE_CREATE = "git_worktree_create";
//@ chunk-yz2nt7xx.js:15124-15207 placement
let AgentResumeTransientError; // deferred: uses ResumeAgentStateError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-yz2nt7xx.js:15124", () => {
  AgentResumeTransientError = class AgentResumeTransientError extends ResumeAgentStateError {
    constructor(message) {
      super(message);
      this.name = "AgentResumeTransientError";
    }
  };
});
//@ chunk-yz2nt7xx.js:15207-15299 placement
let AgentResumePermanentlyRefusedError; // deferred: uses ResumeAgentStateError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-yz2nt7xx.js:15207", () => {
  AgentResumePermanentlyRefusedError = class AgentResumePermanentlyRefusedError extends (
    ResumeAgentStateError
  ) {
    constructor(message) {
      super(message);
      this.name = "AgentResumePermanentlyRefusedError";
    }
  };
});
//@ chunk-yz2nt7xx.js:15299-15380 placement
let AgentStoppedByUserError; // deferred: uses ResumeAgentStateError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-yz2nt7xx.js:15299", () => {
  AgentStoppedByUserError = class AgentStoppedByUserError extends ResumeAgentStateError {
    constructor(message) {
      super(message);
      this.name = "AgentStoppedByUserError";
    }
  };
});
//@ chunk-yz2nt7xx.js:15380-15464 placement
let AgentResumeInProgressError; // deferred: uses ResumeAgentStateError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-yz2nt7xx.js:15380", () => {
  AgentResumeInProgressError = class AgentResumeInProgressError extends ResumeAgentStateError {
    constructor(message) {
      super(message);
      this.name = "AgentResumeInProgressError";
    }
  };
});
//@ chunk-yz2nt7xx.js:15464-15546 placement
let AgentStillStoppingError; // deferred: uses ResumeAgentStateError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-yz2nt7xx.js:15464", () => {
  AgentStillStoppingError = class AgentStillStoppingError extends ResumeAgentStateError {
    constructor(message) {
      super(message);
      this.name = "AgentStillStoppingError";
    }
  };
});
//@ chunk-yz2nt7xx.js:15546-15626 layout
function hasObserverReport(messageQueue, id) {
  return messageQueue
    .getCommandQueueSnapshot()
    .some((args) => isPollEventForAgent(args, id) && isEvalSettleWakePollEvent(args));
}
//@ chunk-yz2nt7xx.js:15626-15669 placement
function resumeAgentBackground(options) {
  return resumeAgentExclusive(options, "notification");
}
//@ chunk-yz2nt7xx.js:15669-15707 placement (2.1.88 match: INLINE_MARKETPLACE, 1)
/**
 * 是否为 inline 市场插件 ID（--plugin-dir 加载）。
 */
function resumeAgentInline(options) {
  return resumeAgentExclusive(options, "inline");
}
//@ chunk-yz2nt7xx.js:15707-15889 placement
function safeWorktreePath(worktreePath, fs = NodeFsOperations) {
  return typeof worktreePath === "string" &&
    worktreePath !== "" &&
    !hasDotDotSegment(worktreePath) &&
    !isNonWslUncPath(worktreePath) &&
    !isNetworkMountRoot(worktreePath) &&
    !isNetDir(worktreePath) &&
    !UNSAFE_AGENT_TEXT_REGEX.test(worktreePath) &&
    findIntermediateUncJunction(fs, worktreePath, {
      surfaceNetworkRaw: true,
      unreadableAncestry: "unverified",
    }) === undefined
    ? worktreePath
    : undefined;
}
//@ chunk-yz2nt7xx.js:15889-15957 placement
function resumeAgentForReply(options) {
  allPeerOrigins([
    {
      origin: options.promptOrigin,
    },
  ]);
  return resumeAgentExclusive(options, "reply");
}
//@ chunk-yz2nt7xx.js:15957-15993 placement
function resumeAgentAtItsCall(options) {
  return resumeAgentExclusive(options, "call");
}
//@ chunk-yz2nt7xx.js:15993-16221 placement
/**
 * 恢复后台代理的入口：同一 agentId 同时只能有一次恢复（resumesInFlight），再调用实际恢复流程。
 */
async function resumeAgentExclusive(options, deliverKind) {
  let { agentId } = options;
  let { resumesInFlight } = getTaskRunState();
  if (resumesInFlight.has(agentId))
    throw new AgentResumeInProgressError(`Agent ${agentId} is already running or being resumed`);
  resumesInFlight.add(agentId);
  let inFlight = true;
  let releaseInFlight = () => {
    if (inFlight) {
      inFlight = false;
      resumesInFlight.delete(agentId);
    }
  };
  try {
    return await resumeAgent(options, deliverKind, releaseInFlight);
  } finally {
    releaseInFlight();
  }
}
//@ chunk-yz2nt7xx.js:16221-44802 placement
/**
 * 恢复一个已停止/后台代理：校验停止状态与保存的会话记录、修补被关停打断的回合、处理插件钩子拒绝，再继续运行或只取结果。
 */
async function resumeAgent(
  {
    agentId: agentId_2,
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
  deliverKind,
  secondArg,
) {
  let now = Date.now();
  let alreadySettled = codeModeAccepted() && resultsOnly === true && continueInterruptedTurn !== true;
  if (alreadySettled && !hasObserverReport(toolUseContext.messageQueue, identityAgentId2(agentId_2)))
    throw new ResumeAgentStateError(`Agent ${agentId_2} has no queued results to wake for.`);
  let appState = toolUseContext.getAppState();
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  let { taskRegistry } = toolUseContext;
  let mode = toolPermissionContext.mode;
  let agentId_3 = toolUseContext.agentId;
  if (agentId_3 !== undefined && isAgentStopPending(agentId_3))
    throw new AgentStillStoppingError(
      "This agent has been stopped and its stop is still completing; it cannot resume other agents.",
    );
  if (
    isAgentStopPending(agentId_2) ||
    (!isTaskLoopSettled(agentId_2) && isTerminalTaskStatus(taskRegistry.get(agentId_2)?.status ?? "running"))
  )
    throw new AgentStillStoppingError(
      `Agent ${agentId_2} is still stopping \u2014 its previous run was stopped but has not exited. Re-run ${TASKSTOP} on it or wait for it to exit before resuming.`,
    );
  let taskEntry = taskRegistry.get(agentId_2);
  let stopCountBefore = 0;
  let revivedAt = Date.now();
  if (isLocalAgent(taskEntry)) {
    let didMarkResuming = false;
    taskRegistry.update(agentId_2, (task) => {
      if (task.status === "running" || task.resuming) return task;
      if (codeModeAccepted() && task.finalizing === true && task.finalizingPass !== undefined) return task;
      didMarkResuming = true;
      stopCountBefore = task.userStopCount ?? 0;
      return {
        ...task,
        resuming: true,
      };
    });
    if (!didMarkResuming)
      throw new AgentResumeInProgressError(`Agent ${agentId_2} is already running or being resumed`);
  }
  let clearResuming = () => {
    taskRegistry.update(agentId_2, (task) =>
      task.resuming
        ? {
            ...task,
            resuming: false,
          }
        : task,
    );
  };
  let finishedEarly = false;
  let settle = () => {
    clearResuming();
    if (finishedEarly)
      updateAgentMetadata(
        identityAgentId2(agentId_2),
        {
          finished: true,
        },
        toolUseContext.storageV5,
      ).catch(logError);
    pruneSettledChildWork(agentId_2, taskRegistry);
    releaseIfFinished(agentId_2, taskRegistry);
  };
  let overBoundError = () => {
    logFeatureBad("subagent_launch", "subagent_resume_transcript_over_bound");
    settle();
    return new AgentResumePermanentlyRefusedError(
      `Agent ${agentId_2}'s earlier transcript is too large to load, or has a row with a malformed timestamp. Sending the message again will not help. Start a new agent if the work is still needed.`,
    );
  };
  if (isAgentTranscriptOverBound(agentId_2)) throw overBoundError();
  let errnoFields = (err) => {
    let errno = sanitizeErrnoTokenForTelemetry(getErrnoCode(err) ?? storageCauseErrnoCode(err));
    return (
      errno && {
        errno,
      }
    );
  };
  let stopProbeError = (error) => {
    logFeatureBad("subagent_launch", "subagent_resume_stop_probe_failed", errnoFields(error));
    settle();
    return isUnavailableStoreError(error)
      ? new AgentResumeTransientError(unreadableStateMessage(error, true))
      : new ResumeAgentStateError(unreadableStateMessage(error, false));
  };
  let stopSibling =
    promptOrigin?.kind === "observer-activity"
      ? {
          found: false,
        }
      : await hasAgentStopSibling(
          identityAgentId2(agentId_2),
          "stoppedByUser",
          toolUseContext.storageV5,
        ).then(
          (found) => ({
            found,
          }),
          (err) => ({
            found: false,
            err,
          }),
        );
  let absentTolerance =
    userInitiated || promptOrigin?.kind === "observer-activity" ? undefined : isPathAbsent;
  let agentMetadata = readAgentMetadata(
    identityAgentId2(agentId_2),
    toolUseContext.storageV5,
    absentTolerance,
  );
  let readTranscript = async () => {
    await withTimeout(
      flushSessionStorage(),
      SETTLE_AGENT_BACKGROUND_MS,
      "agent resume: transcript flush wait",
    ).catch(() => {});
    return getAgentTranscript(identityAgentId2(agentId_2), toolUseContext.storageV5, {
      signal: toolUseContext.abortController.signal,
    });
  };
  let backgroundLaunchRule = getBackgroundLaunchRule();
  let disklessNoRule = isDiskless() && !isLocalAgent(taskEntry) && backgroundLaunchRule === undefined;
  let transcriptPromise = isDiskless()
    ? agentMetadata.then((meta) => (meta === null || disklessNoRule ? null : readTranscript()))
    : readTranscript();
  let [transcript, metadata] = await Promise.all([
    transcriptPromise,
    agentMetadata.then((meta) =>
      meta === null && !isDiskless() && canFetchAgentTranscriptsOnDemand()
        ? transcriptPromise.then(() =>
            readAgentMetadata(identityAgentId2(agentId_2), toolUseContext.storageV5, absentTolerance),
          )
        : meta,
    ),
  ]).catch((error) => {
    if (isAbortError(error)) {
      settle();
      throw error;
    }
    if (isAgentTranscriptOverBound(agentId_2)) throw overBoundError();
    if (error instanceof AgentTranscriptFetchError && error.outcome === "body_encoded") {
      logFeatureBad("subagent_launch", "subagent_resume_transcript_body_encoded");
      settle();
      throw new AgentResumeTransientError(
        `Agent ${agentId_2}'s earlier transcript arrived in an encoding that was not asked for, so it was not read. Send the message again, or start a new agent if that fails too.`,
      );
    }
    logFeatureBad("subagent_launch", "subagent_resume_setup_read_failed", errnoFields(error));
    settle();
    throw resumeReadError(error);
  });
  if (toolUseContext.abortController.signal.aborted) {
    settle();
    throw new AbortError();
  }
  logEvent("tengu_subagent_resume_sidecar_read", {
    metadata_found: metadata !== null,
    prompt_origin_kind: fromEnumOpt(promptOrigin?.kind),
    has_task_record: isLocalAgent(taskEntry),
    continue_interrupted_turn: continueInterruptedTurn === true,
    resumer_is_subagent: agentId_3 !== undefined,
    storage_v5: toolUseContext.storageV5 !== undefined,
  });
  let wakeSafe =
    deliverKind === "notification" &&
    backgroundLaunchRule !== undefined &&
    admitsWakeSafe(backgroundLaunchRule, agentId_2);
  let notWakeSafe = deliverKind === "notification" && backgroundLaunchRule !== undefined && !wakeSafe;
  if (metadata === null && isDiskless()) {
    logFeatureBad("subagent_launch", "subagent_resume_sidecar_missing_diskless");
    settle();
    throw new AgentResumePermanentlyRefusedError(
      `This session has no saved settings for agent ${agentId_2}: it never ran here, or they did not survive a restart of the server that runs the session. Start a new agent if the work is still needed.`,
    );
  }
  let agentIdArg = parseAgentIdArg(metadata?.cwd);
  let worktreeRefusal =
    isDiskless() &&
    ((metadata?.worktreePath ?? undefined) !== undefined ||
      (metadata?.inheritedWorktreePath ?? undefined) !== undefined ||
      metadata?.spawnedWithWorktree === true)
      ? NO_OWN_WORKDIR_MESSAGE
      : undefined;
  if (agentIdArg !== undefined || worktreeRefusal !== undefined) {
    logFeatureBad(
      "subagent_launch",
      agentIdArg !== undefined ? "subagent_resume_cwd_refused" : "subagent_resume_worktree_refused",
    );
    settle();
    throw new AgentResumePermanentlyRefusedError(
      agentIdArg !== undefined
        ? `Cannot resume this agent in the directory its record names: ${agentIdArg}. Start a new agent instead.`
        : `Cannot resume this agent, which was started in a worktree: ${worktreeRefusal}. Start a new agent instead.`,
    );
  }
  let toolUseId = safeIdentifierOrUndefined(metadata?.toolUseId);
  let descriptionText = sanitizeMetadataText(metadata?.description);
  let worktreeBranch =
    typeof metadata?.worktreeBranch === "string" && isValidGitRefName(metadata.worktreeBranch)
      ? metadata.worktreeBranch
      : undefined;
  let agentName =
    typeof metadata?.name === "string" &&
    AGENT_METADATA_ID_RE.test(metadata.name) &&
    !isReservedSessionName(metadata.name)
      ? metadata.name
      : undefined;
  if ("err" in stopSibling && !userInitiated && !metadata?.stoppedByUser)
    throw stopProbeError(stopSibling.err);
  let found = stopSibling.found;
  if ((metadata?.stoppedByUser || found) && promptOrigin?.kind !== "observer-activity") {
    if (!userInitiated) {
      settle();
      throw new AgentStoppedByUserError(
        `Agent ${agentId_2} was stopped by the user and won't be resumed. Treat its work as cancelled; only launch a new agent if the user explicitly asks.`,
      );
    }
  }
  if (disklessNoRule) {
    logFeatureBad("subagent_launch", "subagent_resume_no_rule_diskless");
    settle();
    throw new AgentResumePermanentlyRefusedError(
      `Background agents are switched off in this session, and it no longer tracks agent ${agentId_2}, so the agent cannot be resumed. Start a new agent if the work is still needed.`,
    );
  }
  let forkedSkillScoping = await readForkedSkillScoping(
    identityAgentId2(agentId_2),
    toolUseContext.storageV5,
  );
  let scopingErrorClass =
    "transientRead" in forkedSkillScoping && forkedSkillScoping.transientRead
      ? AgentResumeTransientError
      : ResumeAgentStateError;
  if (forkedSkillScoping.status === "malformed") {
    logFeatureBad("subagent_launch", "forked_skill_resume_scoping_invalid");
    settle();
    throw new scopingErrorClass(
      `Agent ${agentId_2} has a malformed forked-skill scoping record; refusing to resume it without the skill's permission scoping.`,
    );
  }
  if (forkedSkillScoping.status === "diskless") {
    logFeatureBad("subagent_launch", "forked_skill_resume_scoping_diskless");
    settle();
    throw new ResumeAgentStateError(
      `Agent ${agentId_2} cannot be checked for a forked-skill scoping record: this diskless session has no storage backend or key for it. Refusing to resume it.`,
    );
  }
  if (
    (forkedSkillScoping.status === "absent" || forkedSkillScoping.status === "absent-but-marked") &&
    isLocalAgent(taskEntry) &&
    taskEntry.forkedSkillName !== undefined
  ) {
    logFeatureBad("subagent_launch", "forked_skill_resume_scoping_missing");
    settle();
    throw new scopingErrorClass(
      `Agent ${agentId_2} ran as a forked skill but its scoping record is missing; refusing to resume it without the skill's permission scoping.`,
    );
  }
  if (forkedSkillScoping.status === "absent-but-marked") {
    logFeatureBad("subagent_launch", "forked_skill_resume_scoping_missing_cold");
    settle();
    throw new scopingErrorClass(
      `Agent ${agentId_2} carries a forked-skill provenance marker but its scoping record is missing; refusing to resume it without the skill's permission scoping.`,
    );
  }
  if (forkedSkillScoping.status === "valid" && isLocalAgent(taskEntry)) {
    if (taskEntry.forkedSkillName !== forkedSkillScoping.scoping.skillName) {
      logFeatureBad("subagent_launch", "forked_skill_resume_scoping_mismatch");
      settle();
      throw new ResumeAgentStateError(
        `Agent ${agentId_2} has a forked-skill scoping record that does not match its task record; refusing to resume it.`,
      );
    }
  } else if (forkedSkillScoping.status === "valid") {
    if (
      (await readForkedSkillName(identityAgentId2(agentId_2), toolUseContext.storageV5)) !==
      forkedSkillScoping.scoping.skillName
    ) {
      logFeatureBad("subagent_launch", "forked_skill_resume_cold_witness_mismatch");
      settle();
      throw new ResumeAgentStateError(
        `Agent ${agentId_2} has a forked-skill scoping record with no matching provenance-marker witness; refusing to resume it on a cold path without a corroborated fork identity.`,
      );
    }
  }
  if (forkedSkillScoping.status !== "valid");
  let scoping = forkedSkillScoping.status === "valid" ? forkedSkillScoping.scoping : undefined;
  let allowRules = [];
  let denyRules = [];
  let bareName;
  let bareNameUnlessSynced;
  let checkout;
  if (scoping) {
    let skills = await getCommands(getProjectRootOrNull(), toolUseContext.storageV5).catch(() => []);
    let filtered = toolUseContext
      .getAppState()
      .mcp.commands.filter((command) => command.type === "prompt" && command.loadedFrom === "mcp");
    let found = [...dropSyncedClashes(skills, toolUseContext.getAppState().mcp.commands), ...filtered].find(
      (command) => command.name === scoping.skillName && command.type === "prompt",
    );
    if (found?.type === "prompt" && found.isKeptUnread === true) {
      found.loadDefinition?.().catch(() => {});
      logFeatureBad("subagent_launch", "forked_skill_resume_skill_unread");
      settle();
      throw new AgentResumeTransientError(
        `Agent ${agentId_2} ran as forked skill ${scoping.skillName}, whose file has not been read since a reload kept it; refusing to resume it before it is. Try again shortly.`,
      );
    }
    if (found?.type !== "prompt" || (found.context !== "fork" && found.getContext === undefined)) {
      logFeatureBad("subagent_launch", "forked_skill_resume_skill_unresolved");
      settle();
      throw new ResumeAgentStateError(
        `Agent ${agentId_2} ran as forked skill ${scoping.skillName}, which no longer resolves to a fork-capable skill; refusing to resume it without its permission scoping.`,
      );
    }
    let hiddenReason = describeSkillHiddenBehindPlugin(found);
    if (hiddenReason !== undefined) {
      logFeatureBad("subagent_launch", "forked_skill_resume_hidden_behind_plugin");
      settle();
      throw new ResumeAgentStateError(
        `Agent ${agentId_2} ran as forked skill ${scoping.skillName}; refusing to resume it: ${hiddenReason}`,
      );
    }
    let syncRefusal = await checkCommandSyncedAccess(found).catch((error) => {
      settle();
      throw error instanceof ResumeAgentStateError ? error : new ResumeAgentStateError(errorMessage(error));
    });
    if (syncedSkillRefusalReason(found)) {
      let isHostCatalog = isHostCatalogSkill(found);
      logFeatureBad(
        "subagent_launch",
        isHostCatalog ? "forked_skill_resume_host_catalog_withheld" : "forked_skill_resume_sync_vetoed",
      );
      settle();
      throw new ResumeAgentStateError(
        isHostCatalog
          ? `Agent ${agentId_2} ran as forked skill ${scoping.skillName}, which your organization's Skills setting currently turns off; refusing to resume it.`
          : `Agent ${agentId_2} ran as forked skill ${scoping.skillName}, an account-synced skill that is currently disabled (skills sync turned off or denied by policy); refusing to resume it.`,
      );
    }
    if (isDefined(syncRefusal)) {
      logSyncedCommandRefused(found, syncRefusal);
      logFeatureBad("subagent_launch", "forked_skill_resume_synced_plugin_refused", {
        reason: fromEnum(syncRefusal),
      });
      settle();
      throw new ResumeAgentStateError(
        `Agent ${agentId_2} ran as forked skill ${scoping.skillName}; refusing to resume it: ${refusalTextFor(syncRefusal)}.`,
      );
    }
    allowRules = splitRuleList(
      await armedAllowedToolsOf(found).catch((error) => {
        logFeatureBad("subagent_launch", "forked_skill_resume_allowed_tools_failed");
        settle();
        throw error instanceof ResumeAgentStateError ? error : new ResumeAgentStateError(errorMessage(error));
      }),
    );
    denyRules = splitRuleList(found.disallowedTools ?? []);
    bareName = getBareCommandName(found);
    bareNameUnlessSynced = getBareCommandNameUnlessSynced(found);
    checkout =
      slashTestPattern(bareNameUnlessSynced) === null ? undefined : await resolveSkillGitRoot(found, null);
  }
  let frozenCommandDenies = scoping
    ? (scoping.frozenCommandDenies ??
      toolUseContext.getAppState().toolPermissionContext.alwaysDenyRules.command ??
      [])
    : undefined;
  let permissionLayers = scoping
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
  let spawnProvenanceMarks = resolveSpawnProvenanceMarks(agentId_2, metadata, toolUseContext);
  let baseContext = {
    ...toolUseContext,
    ...spawnProvenanceMarks.marks,
  };
  let scopedContext = scoping
    ? {
        ...baseContext,
        getAppState: withCommandRuleOverrides(toolUseContext.getAppState, allowRules, denyRules, {
          replaceCommandRules: true,
          frozenCommandDenies,
        }),
        permissionLayers:
          permissionLayers.length > 0
            ? [...(toolUseContext.permissionLayers ?? []), ...permissionLayers]
            : toolUseContext.permissionLayers,
      }
    : baseContext;
  let currentTask = taskRegistry.get(agentId_2);
  let prevResult = isLocalAgent(currentTask) ? currentTask.result : undefined;
  let modelsUsed =
    prevResult?.modelsUsed ?? (prevResult?.resolvedModel ? [prevResult.resolvedModel] : undefined);
  let spawnDepth =
    (isLocalAgent(currentTask) ? currentTask.spawnDepth : metadata?.spawnDepth) ??
    getAgentDepth(toolUseContext.agentContext) + 1;
  let startTime = isLocalAgent(currentTask) ? currentTask.startTime : now;
  let transcriptData = transcript;
  if (!transcriptData) {
    let messages = taskRegistry.getTranscript(agentId_2)?.messages;
    if (messages && messages.length > 0) {
      logForDebugging(
        `[resumeAgentBackground ${agentId_2}] disk transcript missing; using ${messages.length} in-memory messages mirrored during the run`,
      );
      transcriptData = {
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
  if (!transcriptData) {
    logFeatureBad("subagent_launch", "subagent_resume_transcript_missing");
    settle();
    throw new ResumeAgentStateError(`No transcript found for agent ID: ${agentId_2}`, {
      transcriptMissing: true,
    });
  }
  if (isDiskless() && !isLocalAgent(taskEntry) && !notWakeSafe) {
    let { signal } = toolUseContext.abortController;
    let workerEvents =
      (await readAgentWorkerEvents(agentId_2, signal).catch((error) => {
        if (!signal.aborted) logError(error);
        return null;
      })) ?? null;
    if (signal.aborted) {
      settle();
      throw new AbortError();
    }
    if (isAgentTranscriptOverBound(agentId_2)) throw overBoundError();
    if (workerEvents === null || (workerEvents.length === 0 && !hasWrittenAgentTranscript(agentId_2))) {
      logFeatureBad(
        "subagent_launch",
        workerEvents === null
          ? "subagent_resume_transcript_read_failed"
          : "subagent_resume_transcript_stored_empty",
      );
      settle();
      throw new AgentResumeTransientError(
        `Agent ${agentId_2}'s stored transcript could not be read, or is empty. Send the message again, or start a new agent if that fails too.`,
      );
    }
    if (
      !isTranscriptChainIntact(
        workerEvents,
        transcriptData.messages.map((message) => message.uuid),
      )
    ) {
      logFeatureBad("subagent_launch", "subagent_resume_transcript_gap");
      settle();
      throw new AgentResumePermanentlyRefusedError(
        `Part of agent ${agentId_2}'s transcript is missing, so it cannot go on from where it stopped. Start a new agent if the work is still needed.`,
      );
    }
  }
  degradeRestoredMessages(transcriptData.messages);
  let resumeInPlace =
    continueInterruptedTurn === true &&
    waitingToolUse !== undefined &&
    isOnlyPendingToolUse(transcriptData.messages, waitingToolUse.id);
  if (!resumeInPlace) waitingToolUse?.settled();
  let resumeSource = continueInterruptedTurn
    ? resumeInPlace
      ? transcriptData.messages
      : [...trimIncompleteTail(transcriptData.messages)]
    : transcriptData.messages.map((message) => repairShutdownInterruptedTurn(message, agentId_2));
  let stableMessages = filterThinkingOnlyUntilStable(
    normalizeMessagesForResume(
      regroupSplitResponsesOnResume(
        dropApiInvalidAssistantBlocks(dropMalformedAttachments(resumeSource), {
          site: "agent_resume",
        }),
      ),
      resumeInPlace ? new Set([waitingToolUse.id]) : undefined,
    ),
  );
  if (
    continueInterruptedTurn &&
    !resumeInPlace &&
    stableMessages.length > 0 &&
    !endsWithUserPrompt(stableMessages)
  ) {
    taskRegistry.update(agentId_2, (task) => ({
      ...task,
      resuming: false,
      notified: true,
      evictAfter: agentEvictAt(task),
    }));
    logFeatureOk("subagent_launch");
    return {
      agentId: agentId_2,
      description: descriptionText ?? "(resumed)",
      outputFile: isDiskless() ? undefined : getTaskOutputPath(agentId_2),
      alreadyCompleted: true,
    };
  }
  let contentReplacementState = reconstructForSubagentResume(
    toolUseContext.contentReplacementState,
    stableMessages,
    transcriptData.contentReplacements,
  );
  let agentType =
    !metadata &&
    ((isLocalAgent(currentTask) &&
      (currentTask.agentType === WEB_FETCH_BUILTIN_AGENT.agentType ||
        currentTask.webFetchSavedFiles !== undefined)) ||
      isWebFetchLaunch === true ||
      findAgentLaunchResults(toolUseContext.messages, agentId_2))
      ? WEB_FETCH_BUILTIN_AGENT.agentType
      : metadata?.agentType;
  let listedAgent =
    metadata?.isFork === true
      ? undefined
      : agentType
        ? toolUseContext.options.agentDefinitions.activeAgents.find(
            (activeAgent) => activeAgent.agentType === agentType,
          )
        : undefined;
  let isFork =
    metadata?.isFork === true ||
    (!listedAgent && metadata?.isFork === undefined && metadata?.agentType === FORK_AGENT.agentType);
  let isWebFetch = agentType === WEB_FETCH_BUILTIN_AGENT.agentType && metadata?.isBuiltIn !== false;
  if (
    (isDiskless() ||
      isStoppedAgent(agentId_2) ||
      (metadata === null && keepsAgentMetadataInStream() && !isResumableAgent(agentId_2))) &&
    (!listedAgent ||
      (metadata?.isBuiltIn !== undefined && metadata.isBuiltIn !== isBuiltInAgent(listedAgent))) &&
    metadata?.isFork !== true &&
    !isWebFetch &&
    !notWakeSafe
  ) {
    settle();
    if (metadata === null) {
      logFeatureBad(
        "subagent_launch",
        isStoppedAgent(agentId_2)
          ? "subagent_resume_sidecar_missing_held"
          : "subagent_resume_sidecar_missing_gate_on",
      );
      throw new AgentResumePermanentlyRefusedError(
        `This session no longer has the saved settings of agent ${agentId_2}, so it cannot be resumed as the type it ran as. Start a new agent if the work is still needed.`,
      );
    }
    logFeatureBad(
      "subagent_launch",
      isDiskless() ? "subagent_resume_type_unmatched_diskless" : "subagent_resume_type_unmatched_held",
    );
    throw new AgentResumeTransientError(
      `The agent type that agent ${agentId_2} ran as is not on this session's list right now, or its name now belongs to a different type. Try once more; if that fails too, start a new agent.`,
    );
  }
  let chosenAgent = isWebFetch
    ? listedAgent && isBuiltInAgent(listedAgent)
      ? listedAgent
      : WEB_FETCH_BUILTIN_AGENT
    : metadata?.isBuiltIn === false && agentType === WEB_FETCH_BUILTIN_AGENT.agentType
      ? listedAgent && !isBuiltInAgent(listedAgent)
        ? listedAgent
        : GENERAL_PURPOSE_AGENT
      : (listedAgent ?? (isFork ? FORK_AGENT : GENERAL_PURPOSE_AGENT));
  let agentDefinition = await loadListedAgentDefinition(
    chosenAgent,
    toolUseContext.abortController.signal,
  ).catch((error) => {
    settle();
    if (isAbortError(error)) throw error;
    logFeatureBad("subagent_launch", "subagent_resume_plugin_load_threw");
    throw new AgentResumeTransientError(errorMessage(error));
  });
  if (agentDefinition === undefined) {
    logFeatureBad("subagent_launch", "subagent_resume_plugin_load_failed");
    settle();
    throw new ResumeAgentStateError(
      `Agent type '${chosenAgent.agentType}' could not be loaded from its plugin, so the agent was not resumed.`,
    );
  }
  if (isAgentToolPoolDenied(agentDefinition, toolPermissionContext)) {
    logFeatureBad("subagent_launch", "subagent_resume_tools_denied");
    settle();
    throw new ResumeAgentStateError(agentToolPoolDeniedMessage(agentDefinition.agentType));
  }
  if ((await filterOfferedAgents([agentDefinition])).length !== 1) {
    logFeatureBad("subagent_launch", "subagent_resume_not_offered");
    settle();
    throw new ResumeAgentStateError(
      `Agent type '${agentDefinition.agentType}' is not offered in this session.`,
    );
  }
  let backgroundConfirm =
    backgroundLaunchRule !== undefined &&
    (wakeSafe ||
      (deliverKind === "reply" &&
        toolUseContext.toolUseId !== undefined &&
        (metadata?.requestShape !== "foreground" || agentId(backgroundLaunchRule, agentId_2)))) &&
    !isBackgroundAgentLaunchDisabled() &&
    !isWebFetchAgent(agentDefinition)
      ? runBackgroundLaunchRules(backgroundLaunchRule, {
          toolUseId: toolUseContext.toolUseId,
          callerAgentId: toolUseContext.agentId,
          signal: toolUseContext.abortController.signal,
          resumedAgentId: agentId_2,
        })
      : undefined;
  let runsForeground =
    deliverKind === "inline" ||
    deliverKind === "call" ||
    (deliverKind === "reply" &&
      ((isForegroundAgentMoveOff() && backgroundConfirm === undefined) || isWebFetchAgent(agentDefinition)));
  let ownsMainCall =
    runsForeground &&
    (deliverKind === "call" || (deliverKind === "reply" && backgroundLaunchRule !== undefined)) &&
    isMainConversationsOwnCall(toolUseContext);
  if (!runsForeground && backgroundLaunchRule !== undefined && backgroundConfirm === undefined) {
    logFeatureBad("subagent_launch", "subagent_resume_background_rule");
    settle();
    throw new AgentResumePermanentlyRefusedError(AGENT_RESUME_BACKGROUND_REFUSED_TEXT);
  }
  let description = descriptionText ?? "(resumed)";
  let startResult =
    promptOrigin?.kind === "observer-activity"
      ? undefined
      : await runResumeStartHooks(agentId_2, {
          tool_use_id: toolUseContext.toolUseId ?? "",
          parentModel: getMainLoopModel(toolUseContext),
          parentAgentId: agentId_3,
          signal: toolUseContext.abortController.signal,
          origin: toolUseContext.hookOrigin,
          agent: agentDefinition,
          prompt: continueInterruptedTurn || alreadySettled ? "" : prompt,
          description,
          model:
            !isFork && !metadata?.isObserver && typeof metadata?.model === "string"
              ? metadata.model
              : undefined,
          permissionMode: mode,
          background: !runsForeground,
          fork: isFork,
          name: agentName,
          cwd: metadata?.cwd && !hasUntouchableRecordSpelling(metadata.cwd) ? metadata.cwd : undefined,
        }).catch((error) => {
          settle();
          if (!isAbortError(error)) logFeatureBad("subagent_launch", "subagent_resume_spawn_chain_failed");
          throw error;
        });
  using starting = startResult?.starting;
  if (startResult?.deny !== undefined) {
    logFeatureBad("subagent_launch", "subagent_resume_denied_by_hook");
    clearResuming();
    return {
      agentId: agentId_2,
      description,
      deniedByPlugin: pluginDeclinedResumeMessage(startResult.deny),
    };
  }
  let worktreeGoneNote = (reason, details) => {
    let currentWorktreeSession = getCurrentWorktreeSession();
    let cwdBase = metadata?.cwd && !hasUntouchableRecordSpelling(metadata.cwd) ? metadata.cwd : getCwd();
    let gitRoots = gitRootsForPath(cwdBase);
    let rootStillValid =
      currentWorktreeSession !== null &&
      gitRoots.length > 0 &&
      (() => {
        let knownRoots = [
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
        return gitRoots.every((root) =>
          knownRoots.some((knownRoot) => compareSameContainment(root, knownRoot) === "same"),
        );
      })();
    let telemetryCode = details?.telemetryCode ?? "git_worktree_resume_worktree_gone";
    let worktreeLabel = metadata?.worktreePath ?? `agent ${agentId_2}`;
    if (rootStillValid) {
      logFeatureSad(GIT_WORKTREE_CREATE, telemetryCode);
      logForDebugging(
        `Resumed worktree ${worktreeLabel} ${reason}; falling back to ${cwdBase} under the session worktree's fences`,
        {
          level: "error",
        },
      );
      return;
    }
    if (details?.terminalOnUncovered === false) {
      settle();
      throw new AgentResumeTransientError(
        `Cannot resume this agent right now: its worktree ${reason}, and the fallback directory is not covered by the session's isolation fences. Re-run from a session whose fences cover the agent's directory.`,
      );
    }
    logFeatureBad(GIT_WORKTREE_CREATE, telemetryCode);
    settle();
    throw new AgentResumePermanentlyRefusedError(
      `This agent cannot be resumed: its worktree ${reason}, and the fallback directory is not covered by the session's isolation fences.`,
    );
  };
  let worktreePath = safeWorktreePath(metadata?.worktreePath);
  let inheritedWorktreePath = safeWorktreePath(metadata?.inheritedWorktreePath);
  let worktreeDir = worktreePath ?? inheritedWorktreePath;
  let worktreeCheck = worktreeDir
    ? await promises.stat(worktreeDir).then(
        (stats) => (stats.isDirectory() ? worktreeDir : worktreeGoneNote("exists but is not a directory")),
        (error) => {
          let errnoCode = getErrnoCode(error);
          if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return worktreeGoneNote("no longer exists");
          settle();
          throw new AgentResumeTransientError(
            `Cannot resume this agent: its worktree could not be examined (${String(errnoCode ?? "unknown error")}). Re-run once the directory is accessible.`,
          );
        },
      )
    : undefined;
  if (
    worktreeDir === undefined &&
    !wasAgentCleanlyRemoved(agentId_2) &&
    ((metadata !== null &&
      metadata.spawnedWithWorktree === true &&
      metadata.worktreeCleanlyRemoved !== true &&
      !(
        metadata.inheritedWorktreePath !== undefined &&
        metadata.parentAgentId !== undefined &&
        (
          await readAgentMetadata(identityAgentId2(metadata.parentAgentId), toolUseContext.storageV5).catch(
            makeSidecarReadFallback("resumeAgentBackground (parent)"),
          )
        )?.worktreeCleanlyRemoved === true
      )) ||
      wasAgentSpawnedIsolated(agentId_2))
  )
    worktreeGoneNote("is not recorded for this isolated agent", {
      telemetryCode: "git_worktree_resume_binding_missing",
      terminalOnUncovered: wasAgentSpawnedIsolated(agentId_2),
    });
  let usableWorktree = worktreeCheck;
  if (worktreeCheck) {
    let originalCwd = getOriginalCwd();
    let originalReal = await promises.realpath(originalCwd).catch(() => originalCwd);
    let isolationCheck = await checkWorktreeIsolation(
      worktreeCheck,
      gitRootsForPath(originalCwd),
      normalizeCaseForComparison_2([
        originalReal,
        STARTUP_CWD_REALPATH,
        ...gitRootsForPath(STARTUP_CWD_REALPATH),
      ]),
      {
        requireWitnessForSelfOwningPins: true,
        declineSelfOwningPinUnderLiveRoot: true,
      },
    );
    if (!isolationCheck.ok) {
      settle();
      if (isolationCheck.reason !== "unverifiable" && isolationCheck.reason !== "pin-is-own-launch-tree") {
        logFeatureBad(GIT_WORKTREE_CREATE, "git_worktree_create_root_rejected");
        logForDebugging(
          `[worktree] refusing to resume parked agent into ${worktreeCheck} (${isolationCheck.reason}): ${isolationCheck.message}`,
          {
            level: "error",
          },
        );
        throw new AgentResumePermanentlyRefusedError(
          `This agent cannot be resumed: its worktree was refused (${isolationCheck.reason}). ${isolationCheck.message}`,
        );
      }
      logForDebugging(
        `[worktree] could not verify parked agent worktree ${worktreeCheck} this attempt; the resume will retry: ${isolationCheck.message}`,
      );
      throw new AgentResumeTransientError(
        `Cannot resume this agent right now: its worktree could not be verified (${isolationCheck.reason}). Re-run once git can answer.`,
      );
    }
  }
  if (usableWorktree) {
    let date = new Date();
    try {
      await promises.utimes(usableWorktree, date, date);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
        usableWorktree = worktreeGoneNote("vanished between verification and the resume");
      else {
        settle();
        throw new AgentResumeTransientError(
          `Cannot resume this agent: its worktree could not be touched (${String(errnoCode ?? "unknown error")}). Re-run once the directory is accessible.`,
        );
      }
    }
  }
  let cwd = metadata?.cwd && !hasUntouchableRecordSpelling(metadata.cwd) ? metadata.cwd : usableWorktree;
  let projectBoundContext = toolUseContext.session.withProject({
    cwd: cwd ?? (toolUseContext.session.project === null ? undefined : getCwd()),
  });
  if (projectBoundContext.project === null && hasOutermostCallFrame()) {
    logFeatureBad("subagent_launch", "subagent_resume_no_directory_in_cwd_scope");
    settle();
    throw new AgentResumePermanentlyRefusedError(
      "This agent cannot be resumed from here in this session. Do the rest of the task without it.",
    );
  }
  let effort = metadata?.effort !== undefined && isEffortLevel(metadata.effort) ? metadata.effort : undefined;
  let resolvedEffort = metadata?.isObserver || isFork ? undefined : effort;
  let effort_2 = scoping?.effort ?? resolvedEffort;
  let agentWithEffort =
    effort_2 !== undefined
      ? {
          ...agentDefinition,
          effort: effort_2,
        }
      : agentDefinition;
  let effortNote;
  if (isFork) {
    if (toolUseContext.renderedSystemPrompt) effortNote = toolUseContext.renderedSystemPrompt;
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
        effortNote = effectiveSystemPromptText({
          mainThreadAgentDefinition,
          toolUseContext,
          customSystemPrompt: toolUseContext.options.customSystemPrompt,
          defaultSystemPrompt,
          appendSystemPrompt: toolUseContext.options.appendSystemPrompt,
        });
      } catch (error) {
        logFeatureBad("subagent_launch", "subagent_resume_fork_prompt_reconstruct_failed");
        settle();
        throw error instanceof ResumeAgentStateError ? error : new ResumeAgentStateError(errorMessage(error));
      }
    if (!effortNote) {
      logFeatureBad("subagent_launch", "subagent_resume_fork_prompt_missing");
      settle();
      throw new ResumeAgentStateError("Cannot resume fork agent: unable to reconstruct parent system prompt");
    }
  }
  let mainLoopModel = getMainLoopModel(toolUseContext);
  let agent = getExploreAgentModel(agentWithEffort, mainLoopModel);
  let requestedModel = metadata?.isObserver ? undefined : isFork ? "inherit" : metadata?.model;
  let agentModel = getAgentModel(agent, mainLoopModel, requestedModel, mode);
  let pickedEffortModel =
    typeof metadata?.pickedEffortModel === "string" ? metadata.pickedEffortModel : undefined;
  let effortModel =
    isFork && pickedEffortModel === undefined
      ? null
      : resolveAgentModelDisplay(agent, requestedModel)
        ? undefined
        : pickedEffortModel;
  let systemPrompt = promptSnapshotUnlessRenderPoint(stableMessages, scopedContext.options)?.systemPrompt;
  let taskRunState =
    metadata?.isObserver || scoping !== undefined
      ? undefined
      : resolveSubagentEffort({
          agentDefinition: agentWithEffort,
          isFork,
          model: agentModel,
          effortState: scopedContext.getAppState(),
          pickedEffortModel: effortModel ?? getPickedEffortModel(toolUseContext),
          inheritedLayers: scopedContext.permissionLayers,
          recordedBudgetText: isFork ? findForkTokenReminders(stableMessages) : systemPrompt,
        });
  agentWithEffort = taskRunState?.agentDefinition ?? agentWithEffort;
  let narrowedTools =
    taskRunState === undefined && systemPrompt
      ? resolveTotalTokensReminderMode(undefined, systemPrompt)
      : undefined;
  if (promptOrigin?.kind === "observer-activity" && metadata?.isObserver !== true) {
    logFeatureBad("subagent_launch", "observer_resume_sidecar_unconfirmed");
    settle();
    throw new ResumeAgentStateError(
      `Observer sidecar for ${agentId_2} missing or did not confirm isObserver; refusing delivery`,
    );
  }
  let observerMode = metadata?.isObserver ? (narrowerMode(workerPermissionMode, mode) ?? mode) : undefined;
  let filtered = toolUseContext.options.tools.filter(isMcpTool);
  if (!isFork && !metadata?.isObserver)
    await waitForCoordinatorSubagentMcpServers(() => toolUseContext.getAppState().mcp);
  let appState_2 = toolUseContext.getAppState();
  let forkFlags = isFork
    ? excludeCoordinatorCommsMcpTools(toolUseContext.options.tools)
    : assembleAgentToolPool(toolUseContext, toolPermissionContext, appState_2.mcp.tools.concat(filtered));
  let observerFlags = metadata?.isObserver
    ? observerToolset(
        resolveAgentTools(
          agentWithEffort,
          assembleAgentToolPool(toolUseContext, toolPermissionContext, filtered),
          true,
          false,
          false,
          spawnDepth,
          memoryModeForSession(toolUseContext).mode,
        ).resolvedTools,
      )
    : forkFlags;
  let sendMessageToolAbsent =
    promptOrigin?.kind === "peer" &&
    !hasSendMessageTool(
      isFork || metadata?.isObserver
        ? observerFlags
        : resolveAgentTools(agentWithEffort, observerFlags, true, false, false, spawnDepth).resolvedTools,
    );
  let unreadableGateOn = isGlimmeringFinchGateOn();
  let unreadableTools = unreadableGateOn
    ? unreadableToolsUsed(promptToolsUsed ?? [], stableMessages)
    : undefined;
  let extraTools =
    unreadableTools === undefined
      ? []
      : [markToolSummaryMessage(createUserMessage(summaryCompanionMessage(unreadableTools)))];
  let unreadableLine = unreadableGateOn
    ? undefined
    : unreadableToolsLine(promptToolsUsed ?? [], stableMessages);
  let resumedPrompt = joinWithNewlineIfAny(prompt, unreadableLine);
  let noticeLengths = adjustLastOffset(promptNoticeLengths, unreadableLine);
  if (isSillyShoreGateOn())
    getConversationToolsUsed().record(collectToolsUsedBeforeSummary(stableMessages, undefined, false));
  let origin = promptOrigin
    ? withJoinedNotices(
        noticeLengths,
        promptNoticeOwn,
        promptNoticeRunIds,
        createUserMessage({
          content: classifyNonUserMessageSource(resumedPrompt, promptOrigin, {
            sendMessageToolAbsent,
          }),
          origin: promptOrigin,
          isMeta: true,
        }),
      )
    : createUserMessage({
        content: promptIsMeta
          ? classifyNonUserMessageSource(resumedPrompt, undefined, {
              isMeta: true,
            })
          : resumedPrompt,
        ...(promptIsMeta && {
          isMeta: true,
        }),
      });
  let webFetchSavedFiles = isLocalAgent(currentTask) ? currentTask.webFetchSavedFiles : undefined;
  let persistedToolResultFiles = isWebFetchAgent(agentWithEffort)
    ? webFetchSavedFiles
      ? {
          dirs: [...webFetchSavedFiles.dirs],
          paths: [...webFetchSavedFiles.paths],
        }
      : defaultToolResultsStorage()
    : undefined;
  let deliveryContext = {
    agentId: agentId_2,
    deliveringLoop: toolUseContext.agentId,
  };
  let launchOptions =
    metadata?.isObserver === true &&
    (promptOrigin?.kind === "observer-activity" ||
      (isLocalAgent(currentTask) && currentTask.isObserver === true));
  if (metadata?.isObserver === true && !launchOptions && forwardUserIntentEnv())
    logFeatureBad("agent_intent_forward", "unconfirmed_observer");
  let launchOptionsWithTools =
    userInitiated &&
    (metadata?.stoppedByUser === true ||
      found ||
      (isLocalAgent(taskEntry) && taskEntry.stoppedByUser === true));
  let runOptions =
    launchOptionsWithTools ||
    (userInitiated &&
      isLocalAgent(taskEntry) &&
      (taskEntry.status === "killed" || taskEntry.status === "completed" || taskEntry.status === "failed"));
  let fullOptions =
    metadata?.finished === true ||
    (isLocalAgent(taskEntry) && (taskEntry.status === "completed" || taskEntry.status === "failed"));
  if (runOptions && userStopCount(taskRegistry.get(agentId_2)) === stopCountBefore)
    try {
      await updateAgentMetadata(
        identityAgentId2(agentId_2),
        {
          revivedAt,
          ...(fullOptions && {
            finished: undefined,
          }),
        },
        toolUseContext.storageV5,
      );
      finishedEarly = fullOptions;
    } catch (error) {
      if (isFsInaccessible(error) || isFsInaccessibleCode(storageCauseErrnoCode(error)))
        logForDebugging(`failed to record the revival of ${agentId_2}: ${describeStorageError(error)}`, {
          level: "warn",
        });
      else logError(error);
    }
  if (!continueInterruptedTurn && !alreadySettled) markDirectDelivery_2(agentId_2, origin, "user");
  let runFinal;
  if (!continueInterruptedTurn && !launchOptions)
    try {
      runFinal = liveTranscript?.();
    } catch (error) {
      logError(error);
      logFeatureSad("agent_intent_forward", "live_check_failed");
    }
  let finalCapabilities =
    continueInterruptedTurn || launchOptions
      ? undefined
      : pendingTurnsForAgent(
          deliveryContext,
          runFinal ?? toolUseContext.messages,
          runFinal === undefined ? "snapshot" : "live",
        );
  let copies = finalCapabilities?.copies ?? [];
  let canUseToolNarrowing = getTaskRunState().canUseToolNarrowings.get(agentId_2);
  let forkAgentPath = {
    ...(isFork
      ? {
          systemPrompt: effortNote,
          parentSystemPrompt: true,
        }
      : metadata?.isObserver
        ? {
            agentToolScope: agentWithEffort,
          }
        : undefined),
    pickedEffortModel: effortModel,
  };
  let launchedWithDefaultsOnly =
    metadata?.launchedWithDefaults === true && !isHookOrPluginSteered(baseContext);
  let launchModel =
    launchedWithDefaultsOnly || isFork || metadata?.isObserver || isHookOrPluginSteered(baseContext)
      ? undefined
      : metadata?.model;
  let requestShape =
    !metadata?.isObserver &&
    (metadata?.requestShape === "foreground" || metadata?.requestShape === "background")
      ? metadata.requestShape
      : undefined;
  let { onToolPool, reviewTools } = createDeferredReviewTools(toolUseContext.options.tools);
  let runAgentArgs = {
    agentDefinition: agentWithEffort,
    promptMessages: continueInterruptedTurn
      ? stableMessages
      : alreadySettled
        ? [...stableMessages, ...copies]
        : [...stableMessages, ...copies, ...extraTools, origin],
    turnPrompt:
      continueInterruptedTurn || alreadySettled
        ? undefined
        : (getContentText(origin.message.content) ?? undefined),
    waitingToolUse: resumeInPlace ? waitingToolUse : undefined,
    toolUseContext: scopedContext,
    canUseTool: canUseToolNarrowing ? canUseToolNarrowing(canUseTool) : canUseTool,
    handbackOptIn: !(isFork || metadata?.isObserver),
    handbackTool: ObserverReportTool,
    isAsync: true,
    requestShape,
    requestNonInteractive:
      !metadata?.isObserver && typeof metadata?.requestNonInteractive === "boolean"
        ? metadata.requestNonInteractive || getIsNonInteractiveSession()
        : undefined,
    preserveToolUseResults: !getIsNonInteractiveSession(),
    persistedToolResultFiles,
    querySource: getQuerySourceForAgent(agentWithEffort.agentType, isBuiltInAgent(agentWithEffort)),
    spawnedBySkill: bareName,
    ...(scoping !== undefined && {
      spawnedByForkedSkill: true,
    }),
    model: metadata?.isObserver ? undefined : isFork ? "inherit" : metadata?.model,
    effort: resolvedEffort,
    onModelRestricted: metadata?.isObserver
      ? undefined
      : agentModelRestrictionNotifier(
          bareName ?? agentWithEffort.agentType,
          toolUseContext.appendSystemMessage,
        ),
    override: canUseToolNarrowing
      ? {
          ...forkAgentPath,
          requireCanUseTool: true,
        }
      : forkAgentPath,
    availableTools: observerFlags,
    assembleAvailableTools: (tools) => assembleAgentToolPool(toolUseContext, toolPermissionContext, tools),
    onToolPool,
    forkContextMessages: undefined,
    recordedUuids: new Set(stableMessages.map((message) => message.uuid)),
    compactTranscriptUnavailable: isFork,
    ...((isFork || metadata?.isObserver) && {
      useExactTools: true,
    }),
    totalTokensReminderBudget: taskRunState ? taskRunState.totalTokensBudget : narrowedTools,
    isTotalTokensReminderBudgetOnTopOfStart: taskRunState
      ? taskRunState.isBudgetOnTopOfStart
      : narrowedTools !== undefined &&
        (isFork ? getCalmMochiScope() !== "none" : getCalmMochiScope() === "all"),
    worktreePath: usableWorktree,
    worktreeBranch,
    cwd: metadata?.cwd,
    launchedWithDefaults: launchedWithDefaultsOnly,
    spawnMode: observerMode ?? metadata?.spawnMode,
    description: descriptionText,
    name: agentName,
    toolUseId,
    contentReplacementState,
  };
  let liveTaskEntry = taskRegistry.get(agentId_2);
  if (
    isLocalAgent(liveTaskEntry) &&
    liveTaskEntry.stoppedByUser &&
    (!userInitiated || (liveTaskEntry.userStopCount ?? 0) !== stopCountBefore)
  ) {
    settle();
    throw new AgentStoppedByUserError(
      `Agent ${agentId_2} was stopped by the user and won't be resumed. Treat its work as cancelled; only launch a new agent if the user explicitly asks.`,
    );
  }
  if (alreadySettled && !hasObserverReport(toolUseContext.messageQueue, identityAgentId2(agentId_2))) {
    settle();
    throw new ResumeAgentStateError(`Agent ${agentId_2} has no queued results to wake for.`);
  }
  let backgroundConfirmResult = backgroundConfirm?.confirm(toolUseContext.abortController.signal);
  if (backgroundConfirmResult !== undefined) {
    settle();
    if (backgroundConfirmResult.kind === "aborted") throw new AbortError();
    if (backgroundConfirmResult.kind === "refused") {
      logFeatureBad("subagent_launch", "subagent_resume_refused_by_rule");
      throw new AgentResumePermanentlyRefusedError(backgroundConfirmResult.message);
    }
    logFeatureBad("subagent_launch", "subagent_resume_background_closed");
    throw new ResumeAgentStateError(BACKGROUND_AGENTS_UNAVAILABLE);
  }
  for (let copy of copies) appendAgentTranscriptMessage(agentId_2, copy, taskRegistry);
  if (!promptIsMeta && !continueInterruptedTurn && !alreadySettled) {
    for (let message of extraTools) appendAgentTranscriptMessage(agentId_2, message, taskRegistry);
    appendAgentTranscriptMessage(
      agentId_2,
      isNonHumanInboundOrigin(promptOrigin)
        ? origin
        : createUserMessage({
            content: resumedPrompt,
            origin: promptOrigin,
          }),
      taskRegistry,
    );
  }
  onDeliveryCommitted?.();
  if (codeModeAccepted())
    getTaskRunState().onSubagentResume?.(
      stableMessages,
      identityAgentId2(agentId_2),
      toolUseContext.toolState,
    );
  let resultOptions = {
    outputFileReadable: willToolsLoseSessionState(toolUseContext.options.tools),
    agentId: agentId_2,
    ownerAgentId: mainAgentId(),
    parentAgentId: metadata?.parentAgentId,
    spawnDepth,
    launchedWithDefaults: launchedWithDefaultsOnly,
    launchModel,
    ...(requestShape === "foreground" && {
      requestShape,
    }),
    description,
    prompt,
    model: agentModel,
    selectedAgent: agentWithEffort,
    taskRegistry,
    toolUseId: toolUseContext.toolUseId ?? safeIdentifierOrUndefined(liveTaskEntry?.toolUseId) ?? toolUseId,
    cwd: cwd ?? (toolUseContext.agentWorktree !== undefined ? getCwd() : undefined),
  };
  let outputFile =
    deliverKind === "call" && autoBackgroundMsForLaunch(backgroundLaunchRule, isForegroundAgentMoveOff());
  let finalResult =
    deliverKind === "call"
      ? registerAgentForeground({
          ...resultOptions,
          parentAbortController: toolUseContext.abortController,
          ...autoBackgroundOptions(backgroundLaunchRule, outputFile),
          isDirectCall: !toolUseContext.innerCall && toolUseContext.hookCaller === undefined,
        })
      : undefined;
  let moveState = {
    moved: false,
  };
  let moveToBackground =
    finalResult !== undefined
      ? {
          agentId: agentId_2,
          abortController: finalResult.abortController,
          outputFile: finalResult.outputFile,
        }
      : registerAsyncAgent({
          ...resultOptions,
          parentAbortController: runsForeground ? toolUseContext.abortController : undefined,
          awaitedByCaller: runsForeground,
          awaitedByMainTurn: ownsMainCall,
          forkedSkillName: scoping?.skillName,
          ...(promptOrigin?.kind === "observer-activity" && {
            isObserver: true,
          }),
          sessionScratch: toolUseContext.session.sessionScratch,
        });
  if (
    backgroundConfirm !== undefined &&
    !backgroundConfirm.handOver({
      agentId: moveToBackground.agentId,
      abortController: moveToBackground.abortController,
    })
  ) {
    killAsyncAgent(moveToBackground.agentId, taskRegistry, "system", undefined, {
      lifecycleNotStarted: true,
    });
    markAgentNotified(moveToBackground.agentId, taskRegistry);
    logFeatureBad("subagent_launch", "subagent_resume_background_not_taken");
    throw new AgentResumePermanentlyRefusedError(AGENT_RESUME_BACKGROUND_REFUSED_TEXT);
  }
  spawnProvenanceMarks.admit();
  secondArg();
  starting?.started({
    agentId: agentId_2,
    model: agentModel,
  });
  let taskId =
    promptOrigin?.kind === "observer-activity"
      ? undefined
      : resolveVisibleSubagentId(toolUseContext.agentId, taskRegistry);
  let quietParked =
    !isLocalAgent(liveTaskEntry) || (liveTaskEntry.notified && liveTaskEntry.quietlyParked !== true);
  let settledAlready = false;
  if (taskId !== undefined) {
    let seenIds = new Set();
    let currentId = taskId;
    while (currentId !== undefined && !seenIds.has(currentId)) {
      seenIds.add(currentId);
      let taskEntry = taskRegistry.get(currentId);
      currentId = isLocalAgent(taskEntry) ? taskEntry.ownerAgentId : undefined;
      if (currentId === agentId_2) {
        settledAlready = true;
        break;
      }
    }
  }
  if (taskId !== undefined && taskId !== agentId_2 && quietParked && !settledAlready) {
    let previousOwnerId;
    let interactive = !getIsNonInteractiveSession();
    taskRegistry.update(agentId_2, (task) => {
      if (task.ownerAgentId !== taskId) previousOwnerId = task.ownerAgentId;
      else if (!interactive || task.handbackRecipient === taskId) return task;
      return {
        ...task,
        ownerAgentId: taskId,
        ...(interactive && {
          handbackRecipient: taskId,
        }),
      };
    });
    if (interactive) addAgentKeepaliveReason(taskId, `agent:${agentId_2}`, taskRegistry);
    if (previousOwnerId !== undefined) notifyAgentReparented(agentId_2, previousOwnerId, taskRegistry);
  }
  let endedTaskEntry = taskRegistry.get(agentId_2);
  let resumeResult =
    isLocalAgent(endedTaskEntry) &&
    isCurrentAgentId(toolUseContext.agentId, endedTaskEntry.ownerAgentId, taskRegistry);
  let output = resumeResult
    ? hasSendMessageTool(toolUseContext.options.tools)
    : isLocalAgent(endedTaskEntry)
      ? endedTaskEntry.ownerCanContinueAgents
      : undefined;
  if (resumeResult)
    taskRegistry.update(agentId_2, (task) =>
      task.ownerCanContinueAgents === output
        ? task
        : {
            ...task,
            ownerCanContinueAgents: output,
          },
    );
  if (runOptions) {
    let entries = taskRegistry.get(agentId_2);
    toolUseContext.messageQueue.enqueuePendingNotification(
      buildUserResumedNotice({
        agentId: agentId_2,
        description,
        to: resolveNotificationRecipient({
          ownerAgentId: isLocalAgent(entries) ? entries.ownerAgentId : undefined,
          keepaliveReason: `agent:${agentId_2}`,
          delivering: true,
          taskRegistry,
        }),
      }),
    );
  }
  if (launchOptionsWithTools) {
    let onMessage = (message) => {
      if (isFsInaccessible(message) || isFsInaccessibleCode(storageCauseErrnoCode(message)))
        logForDebugging(`failed to clear stop marker for ${agentId_2}: ${describeStorageError(message)}`, {
          level: "warn",
        });
      else logError(message);
    };
    let userStopChanged = () => userStopCount(taskRegistry.get(agentId_2)) !== stopCountBefore;
    if (!userStopChanged()) {
      await clearAgentStopSibling(
        identityAgentId2(agentId_2),
        "stoppedByUser",
        toolUseContext.storageV5,
      ).catch(onMessage);
      await updateAgentMetadata(
        identityAgentId2(agentId_2),
        {
          stoppedByUser: false,
        },
        toolUseContext.storageV5,
      ).catch(onMessage);
      if (userStopChanged())
        await landStoppedByUser(
          identityAgentId2(agentId_2),
          agentWithEffort.agentType,
          toolUseContext.storageV5,
        );
    }
  }
  if (suppressOwnerNotification) markAgentNotified(moveToBackground.agentId, taskRegistry);
  await rearmObserverOnResume({
    observedTaskId: agentId_2,
    observedDefinition: agentWithEffort,
    observedName: agentName ?? agentWithEffort.agentType,
    observedMeta: metadata
      ? {
          observerTaskId: metadata.observerTaskId,
          armingPermissionMode: metadata.armingPermissionMode,
        }
      : null,
    toolUseContext,
    canUseTool,
  });
  pruneSettledChildWork(agentId_2, taskRegistry);
  if (agentName !== undefined && toolUseContext.getAppState().agentNameRegistry.get(agentName) === undefined)
    toolUseContext.agentLifecycle.registerName(agentName, identityAgentId2(agentId_2));
  let resultPayload = {
    prompt,
    resolvedAgentModel: agentModel,
    modelsUsed,
    isBuiltInAgent: isBuiltInAgent(agentWithEffort),
    startTime,
    agentType: agentWithEffort.agentType,
    isAsync: true,
    agentDepth: spawnDepth,
    callerCanContinueAgents: output,
    source: agentWithEffort.source,
    pluginId: isPluginAgent(agentWithEffort) ? parsePluginIdentifier_2(agentWithEffort.plugin) : undefined,
    persistedToolResultFiles,
    spawnedSubagent: isLocalAgent(currentTask) ? currentTask.spawnedSubagent : undefined,
    priorCarriedMarkers: normalizeCaseForComparison_2([
      ...(prevResult !== undefined ? messageHasUntrustedBlock(prevResult) : []),
      ...streamPrefixesPresent(transcriptData.messages),
      ...STREAM_PREFIXES.filter((marker) => prompt.includes(marker)),
      ...((isLocalAgent(currentTask) && currentTask.priorCarriedMarkers) || []),
    ]),
  };
  if (resultPayload.priorCarriedMarkers.length > 0)
    taskRegistry.update(agentId_2, (state) => ({
      ...state,
      priorCarriedMarkers: resultPayload.priorCarriedMarkers,
    }));
  let cancellationFlags = {
    agentId: agentId_2,
    parentAgentId: toolUseContext.agentId,
    depth: spawnDepth,
    ...(getTaskRunState().spawnedByMainThread.has(agentId_2) && {
      spawnedByMainThread: true,
    }),
    parentSessionId: getParentSessionId(),
    agentType: "subagent",
    subagentName: agentWithEffort.agentType,
    displayName: agentName,
    isAsync: true,
    isBuiltIn: isBuiltInAgent(agentWithEffort),
    invokingRequestId,
    invocationKind: "resume",
    invocationEmitted: false,
    parentPromptId,
    isBackgroundAgent: !ownsMainCall,
    ...(deliverKind === "call" && {
      reapsShellsUnlessMoved: true,
    }),
    ...getWorkflowRunFields(toolUseContext.agentContext),
  };
  let onRunSettled =
    promptOrigin?.kind === "observer-activity" ? () => {} : taskRegistry.takeConcurrencySlot();
  let runPromise = runWithCwdOverride(cancellationFlags, () =>
    withCallFrameCwd(projectBoundContext.project, () =>
      runAsyncAgentLifecycle({
        taskId: moveToBackground.agentId,
        abortController: moveToBackground.abortController,
        makeStream: (onCacheSafeParams, onQueryProgress, onStreamTokenEstimate) =>
          runAgent({
            ...runAgentArgs,
            session: projectBoundContext,
            override: {
              ...runAgentArgs.override,
              agentId: identityAgentId2(moveToBackground.agentId),
              agentContext: cancellationFlags,
              abortController: moveToBackground.abortController,
            },
            onCacheSafeParams,
            onQueryProgress,
            onStreamTokenEstimate,
            ...(backgroundLaunchRule !== undefined &&
              runsForeground &&
              !ownsMainCall && {
                canShowPermissionPrompts: false,
              }),
          }),
        metadata: {
          ...resultPayload,
          agentContext: cancellationFlags,
          pickedEffortModel: effortModel,
        },
        description,
        toolUseContext,
        taskRegistry,
        agentIdForCleanup: agentId_2,
        reviewTools,
        enableSummarization:
          getSdkAgentProgressSummariesEnabled() ||
          ((isCoordinatorMode() || isFork || isForkSubagentEnabled()) && !getIsNonInteractiveSession()),
        getWorktreeResult: async () =>
          usableWorktree
            ? {
                worktreePath: usableWorktree,
                ...(worktreeBranch !== undefined && {
                  worktreeBranch,
                }),
              }
            : {},
        shouldNotifyOwner:
          deliverKind === "call" ? () => moveState.moved : runsForeground ? () => false : undefined,
        reviewInlineHandoff: deliverKind !== "inline" && runsForeground,
        onTerminalSuccess: scoping
          ? () => {
              let skillName = scoping.skillName;
              let skillMarker = `:${skillName}`;
              if (getInvokedSkills().has(skillMarker)) return;
              addInvokedSkill(skillName, skillName, "", null);
              let verificationMethod = slashTestPattern(bareNameUnlessSynced ?? skillName);
              if (verificationMethod)
                toolUseContext.applyAttributionOp({
                  kind: "recordVerification",
                  method: verificationMethod,
                  checkout,
                });
            }
          : undefined,
        onRunSettled,
      }),
    ),
  );
  if (finalCapabilities !== undefined) recordTurnsDeliveredIndirect(deliveryContext, finalCapabilities);
  logFeatureOk("subagent_launch");
  if (runsForeground)
    try {
      if (finalResult === undefined) await runPromise;
      else if (
        settleBackgroundedAgent({
          outcome: await raceAgentLaunch(runPromise, finalResult.backgroundSignal, outputFile),
          registration: finalResult,
          wait: moveState,
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
          agentId: agentId_2,
          description,
          outputFile: finalResult.outputFile,
          movedRunEnded: runPromise.catch(logError),
        };
      let task = taskRegistry.get(agentId_2);
      let agentResult = isLocalAgent(task) ? task.result : undefined;
      return {
        agentId: agentId_2,
        description,
        outputFile: moveToBackground.outputFile,
        inlineHandback: {
          content: agentResult?.content ?? [],
          harnessNoteCount: agentResult?.harnessNoteCount,
          harnessTailCount: agentResult?.harnessTailCount,
          harnessSectionHash: agentResult?.harnessSectionHash,
          toolsUsed: agentResult?.toolsUsed,
          handback: agentResult?.handback,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        Object.defineProperty(error, RESUMEDINLINE, {
          value: true,
        });
        let carried =
          RESUMEDINLINEPRIORCARRIEDMARKERS in error ? error[RESUMEDINLINEPRIORCARRIEDMARKERS] : undefined;
        let value = Array.isArray(carried) ? carried : [];
        Object.defineProperty(error, RESUMEDINLINEPRIORCARRIEDMARKERS, {
          value: STREAM_PREFIXES.filter(
            (marker) =>
              resultPayload.priorCarriedMarkers?.includes(marker) === true || value.includes(marker),
          ),
          configurable: true,
        });
        let salvage = RESUMEDINLINESALVAGE in error ? error[RESUMEDINLINESALVAGE] : undefined;
        let salvageMap = salvage instanceof agentOverridesMap ? salvage : new agentOverridesMap();
        salvageMap.set(agentId_2, {
          handback: getPendingHandbackReport(taskRegistry.get(agentId_2), agentId_2),
          reviewTools: reviewTools(),
        });
        Object.defineProperty(error, RESUMEDINLINESALVAGE, {
          value: salvageMap,
        });
      }
      throw error;
    } finally {
      finalResult?.cancelAutoBackground?.();
      finalResult?.detachParentAbortRelay();
      if (!moveState.moved) {
        getTaskRunState().agentBackgroundSignalResolvers.delete(agentId_2);
        if (!hasChildAgents(agentId_2, taskRegistry) && !hasPendingChildWork(agentId_2, taskRegistry))
          forgetHandback(agentId_2);
        taskRegistry.update(agentId_2, (task) => ({
          ...task,
          notified: true,
          evictAfter: agentEvictAt(task),
        }));
      }
    }
  runPromise.finally(() => waitingToolUse?.settled()).catch(logError);
  return {
    agentId: agentId_2,
    description,
    outputFile: moveToBackground.outputFile,
  };
}
//@ chunk-yz2nt7xx.js:44802-45197 placement
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
      content: message.message.content.map((block) =>
        block.type === "tool_result"
          ? {
              ...block,
              content: TOOL_CALL_SESSION_ENDED,
            }
          : block,
      ),
    },
  };
}
//@ chunk-yz2nt7xx.js:45197-45306 placement
function withJoinedNotices(noticeLengths, joinedNoticeOwn, joinedNoticeRunIds, userMessage) {
  return noticeLengths === undefined
    ? userMessage
    : {
        ...userMessage,
        joinedNoticeLengths: noticeLengths,
        joinedNoticeOwn,
        joinedNoticeRunIds,
      };
}
export {
  ResumeAgentStateError,
  resumeAgentBackground,
  isResumeDenied,
  resumeAgentAtItsCall,
  isResumedInlineRunError,
  AgentResumeInProgressError,
  AgentResumeTransientError,
  AgentStoppedByUserError,
  AgentResumePermanentlyRefusedError,
  AgentStillStoppingError,
  resumeAgentForReply,
  isMainConversationsOwnCall,
  resumeAgentInline,
  resumedInlineRunPriorCarriedMarkers,
  resumedInlineRunHandback,
  resumedInlineRunReviewTools,
  resumeReadError,
};
