/**
 * query/postTurnSummary.ts
 *
 * 2.1.316 新增：回合结束时运行 Stop hooks 与记忆提取，返回阻断错误与是否阻止继续；主线程回合结束后生成并发布回合摘要（按检测到的界面发往不同接收端）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (6)
 * attribution: placement 6
 */
import { classifyQuerySource } from "../services/api/requestHeaders.js";
import { isTerminalShutdown } from "../utils/terminalShutdown.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { lit, fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import {
  shownErroredToolRowId,
  logOperation,
  lazyChunkCv3,
  lazyChunkVsw,
  getQueuedPeerMessageCount,
} from "../utils/messageQueueManager.js";
import { logForDebugging, createAttachmentMessage_2 } from "../utils/debug.js";
import { publishPostTurnSummary } from "../bridge/replBridgeHandle.js";
import { enqueueTaskNotification } from "../utils/task/taskNotifications.js";
import { getMainThreadAgentType, getSessionId, getTotalOutputTokens } from "../bootstrap/state.js";
import { collectThreadRows } from "../services/projects/threadRows.js";
import { ReplCallNoteBuffer } from "../tools/REPLTool/replCallNotes.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { getOwnJobShortId } from "../services/daemon/jobState.js";
import { hasActiveAgentTasks, isActiveAgentTask, isRunningShellTask } from "../tasks/taskStatus.js";
import { errorMessage, isAbortError, StreamClosedAbortError } from "../utils/errors.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { isRemoteCowork, isClaudeAiChatOrigin } from "../utils/entrypointKinds.js";
import { SESSION_STATE_IDLE_TTL_MS } from "../utils/sessionState.js";
import { withTimeout } from "../utils/sleep.js";
import { logEvent } from "../services/analytics/index.js";
import { logError } from "../utils/log.js";
import { isMainAgent, isTeammateAgentContext } from "../utils/agentContext.js";
import { saveCacheSafeParams, createCacheSafeParams } from "../utils/forkedAgent.js";
import { isBareMode, isEnvDefinedFalsy } from "../utils/envUtils.js";
import { isSuggestionOwnedByPlugin } from "../services/PromptSuggestion/backOff.js";
import { executePromptSuggestion } from "../services/PromptSuggestion/promptSuggestion.js";
import { isExtractModeActive } from "../memdir/paths.js";
import { getHostedPostTurnMemoryConfig } from "../memdir/memoryTool.js";
import { runAutoDreamForHost } from "../services/autoDream/autoDream.js";
import { cleanupComputerUseAfterTurn } from "../utils/computerUse/cleanup.js";
import { env } from "../utils/env.js";
import { toolMatchesName } from "../Tool.js";
import {
  findLastRealUserMessageIndex,
  createUserMessage,
  hasSuccessfulToolCall,
  STRUCTURED_OUTPUT_ENFORCE_PREFIX,
  createUserInterruptionMessage,
  createStopHookSummaryMessage,
  createSystemMessage,
} from "../utils/messages.js";
import { replyGatePolicy, getVisibleBackgroundTasks, createQueueDelivery } from "./turnEndReasons.js";
import { resolveHearthToolNames, serverHasAnyTool } from "../services/mcp/ccrMetaMcp.js";
import {
  logReplyGatePolicy,
  isResilientGalaxyOn,
  lastTurnReminderState,
  isJoyfulGlobeOn,
} from "./toolDrain.js";
import { STRUCTUREDOUTPUT } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import {
  getPendingHandbackReport,
  getSelectableBackgroundTasks,
  MAX_HANDBACK_ENFORCE_RETRIES,
  HANDBACK_ENFORCE_PREFIX,
} from "../tools/AgentTool/handbackReport.js";
import { pruneSettledChildWork, hasPendingChildWork } from "../tasks/LocalAgentTask/childWork.js";
import { SUBAGENTHANDBACK } from "../tools/AgentTool/constants.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";
import { glowingOrbitOn, pendingShellHandOffs, findLastPromptIndex } from "../utils/promptShellExecution.js";
import { getToolPermissionContext } from "../utils/permissions/toolPermissionContext.js";
import { clearPendingGoalIdleCheckin, planGoalCheckin, scheduleGoalIdleCheckin } from "./goalCheckIn.js";
import { getSessionStopPromptHooks } from "../commands/goal/goal.js";
import { count } from "../utils/collections.js";
import { isHookEqual } from "../utils/hooks/hooksSettings.js";
import {
  executeStopHooks,
  getStopHookMessage,
  executeTaskCompletedHooks,
  getTaskCompletedHookMessage,
  executeTeammateIdleHooks,
  getTeammateIdleHookMessage,
} from "../utils/hooks.js";
import { isHookBlockingErrorAttachment } from "./stopHooks.js";
import { isBareModeAttachmentDropped } from "../utils/messages/apiNormalization.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";
import { isSilentAbortReason, shutdownInterruptStamp } from "../utils/abortController.js";
import { getShortcutDisplay } from "../keybindings/shortcutFormat.js";
import { logHookPushbackEvent } from "../services/tools/toolDecisionTelemetry.js";
import { getTaskListId, listTasks } from "../utils/tasks.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ha3km179.js:79310-79416 placement
var extractMemoriesModule; // deferred: loads other modules while loading; runs once its import cycle is complete
var agentJobStateModule;
var postTurnSummaryModule;
deferInit("chunk-ha3km179.js:79310", () => {
  extractMemoriesModule = require("../services/extractMemories/extractMemories.js");
  agentJobStateModule = require("../services/agentStatus/LINK_SCAN_MAX_BYTES.lazy.js");
  postTurnSummaryModule = require("../services/classifierSummary.js");
});
//@ chunk-ha3km179.js:82467-85391 placement
/**
 * 主线程回合结束后生成并发布回合摘要（按检测到的界面发往不同接收端）。
 */
async function* generatePostTurnSummary(
  classifierJobState,
  messages,
  assistantMessages,
  toolUseContext,
  querySource,
) {
  if (
    !classifierJobState ||
    classifyQuerySource(querySource) !== "main" ||
    toolUseContext.agentId ||
    (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted)
  )
    return;
  let postTurnSummary = postTurnSummaryModule;
  let surfaces = postTurnSummary.detectSurfaces(
    isStorageV5Enabled() && toolUseContext.storageV5
      ? await postTurnSummary.watchedForSurfaces(toolUseContext.storageV5)
      : undefined,
  );
  let sinks = postTurnSummary.sinksFor(surfaces);
  let engine = postTurnSummary.engineFor(sinks);
  if (!engine) return;
  classifierJobState.lastEmittedDetail = "";
  let postTurnSummary_2 = toolUseContext.getAppState().postTurnSummary;
  if (sinks.has("summary"))
    yield {
      type: "post_turn_summary",
      value: null,
    };
  let projectsRecap = postTurnSummary.projectsRecapEnabled(toolUseContext.options.tools);
  let hold;
  let outcomeLabel = lit("none");
  let erroredRowId = sinks.has("summary") ? shownErroredToolRowId(messages) : undefined;
  classifierJobState.onClassified = (classified, isFresh) => {
    if (isFresh || !sinks.has("summary")) return;
    if (hold?.superseded) {
      logForDebugging(
        "[classifier] dropped a late end-of-turn summary: a newer session status was written or cleared while it was being generated",
      );
      outcomeLabel = lit("dropped_superseded");
      return;
    }
    if (classified.source === "no-text-turn" && classified.detail === "") {
      if (postTurnSummary_2) {
        toolUseContext.setAppState((appState) =>
          appState.postTurnSummary === postTurnSummary_2
            ? appState
            : {
                ...appState,
                postTurnSummary: postTurnSummary_2,
              },
        );
        publishPostTurnSummary(
          toolUseContext.sessionState,
          postTurnSummary_2,
          hold === undefined
            ? undefined
            : {
                turnEndVerdict: true,
              },
        );
        outcomeLabel = lit("republished_prior");
      }
      return;
    }
    let nextSummary = postTurnSummary.classifiedToPostTurnSummary(classified, {
      projectsRecap,
    });
    let standing = classified.source === "no-text-turn" ? postTurnSummary_2?.standing : erroredRowId;
    if (nextSummary.status_category === "blocked" && standing !== undefined) nextSummary.standing = standing;
    if (classified.source === "no-text-turn") {
      nextSummary.recent_action = postTurnSummary_2?.recent_action ?? "";
      if (postTurnSummary_2?.description !== undefined)
        nextSummary.description = postTurnSummary_2.description;
      if (postTurnSummary_2?.reply !== undefined) nextSummary.reply = postTurnSummary_2.reply;
    }
    toolUseContext.setAppState((appStateBeforeSummary) =>
      appStateBeforeSummary.postTurnSummary?.status_category === nextSummary.status_category &&
      appStateBeforeSummary.postTurnSummary.status_detail === nextSummary.status_detail &&
      appStateBeforeSummary.postTurnSummary.needs_action === nextSummary.needs_action &&
      appStateBeforeSummary.postTurnSummary.recent_action === nextSummary.recent_action &&
      appStateBeforeSummary.postTurnSummary.description === nextSummary.description &&
      appStateBeforeSummary.postTurnSummary.reply === nextSummary.reply &&
      appStateBeforeSummary.postTurnSummary.standing === nextSummary.standing
        ? appStateBeforeSummary
        : {
            ...appStateBeforeSummary,
            postTurnSummary: nextSummary,
          },
    );
    publishPostTurnSummary(
      toolUseContext.sessionState,
      nextSummary,
      hold === undefined
        ? undefined
        : {
            turnEndVerdict: true,
          },
    );
    outcomeLabel = lit("published");
    enqueueTaskNotification({
      type: "system",
      subtype: "post_turn_summary",
      summarizes_uuid: assistantMessages.at(-1)?.uuid ?? "",
      status_category: nextSummary.status_category,
      status_detail: nextSummary.status_detail,
      needs_action: nextSummary.needs_action,
    });
  };
  let mainThreadAgentType = getMainThreadAgentType();
  let mainThreadAgent = mainThreadAgentType
    ? toolUseContext.options.agentDefinitions.activeAgents.find(
        (activeAgent) => activeAgent.agentType === mainThreadAgentType,
      )
    : undefined;
  let filtered = messages.filter((message) => message.type === "assistant");
  if (projectsRecap) {
    let threadRows = collectThreadRows(messages);
    classifierJobState.latestAsk = "";
    if (threadRows) agentJobStateModule.captureLatestAsk(classifierJobState, threadRows);
  } else {
    let latestRealUserAsk = agentJobStateModule.findLatestRealUserAsk(messages);
    if (latestRealUserAsk) agentJobStateModule.captureLatestAsk(classifierJobState, latestRealUserAsk);
  }
  classifierJobState.scriptPosts = toolUseContext.toolState.get(ReplCallNoteBuffer).take();
  classifierJobState.quietTurnKeepsAsk =
    sinks.has("summary") &&
    postTurnSummary_2?.standing !== undefined &&
    logOperation(postTurnSummary_2.standing, messages);
  if (classifierJobState.quietTurnKeepsAsk) logFeatureOk("chat_relay_standing_ask");
  let classifyPromise = agentJobStateModule
    .classifyAndPush(
      classifierJobState,
      getOwnJobShortId(),
      mainThreadAgent,
      "",
      filtered,
      hasActiveAgentTasks(toolUseContext.taskRegistry.all()),
      engine,
      surfaces,
      false,
      projectsRecap,
    )
    .catch((error) => {
      logForDebugging(`[classifier] error: ${errorMessage(error)}`, {
        level: "error",
      });
    });
  if (isBgSession() || querySource === "sdk") {
    let sessionState = toolUseContext.sessionState;
    let coworkCcr = surfaces.has("ccr") && isRemoteCowork();
    let chatOrigin = isClaudeAiChatOrigin();
    let shouldHold = coworkCcr && sessionState !== undefined && !chatOrigin;
    let holdCapMs = shouldHold ? 0 : SESSION_STATE_IDLE_TTL_MS;
    let now = Date.now();
    if (shouldHold)
      hold = sessionState.holdTurnEndSummary(classifyPromise, performance.now() + SESSION_STATE_IDLE_TTL_MS);
    else
      await withTimeout(classifyPromise, SESSION_STATE_IDLE_TTL_MS, "classifier write timed out").catch(
        () => {},
      );
    let now_2 = Date.now();
    if (querySource === "sdk")
      classifyPromise.then(() => {
        logEvent("tengu_turn_end_classifier_hold", {
          hold_cap_ms: holdCapMs,
          held_ms: now_2 - now,
          summary_after_turn_ms: Math.max(0, Date.now() - now_2),
          cowork_ccr: coworkCcr,
          engine: fromEnum(engine),
          summary_outcome: outcomeLabel,
          session_origin_chat: chatOrigin,
        });
      });
  }
}
//@ chunk-ha3km179.js:85391-85527 placement
/**
 * 若有未完成的回合结束摘要且条件满足，等待其完成（错误交给处理函数）。
 */
function waitForTurnEndSummary(sessionState, shouldWait) {
  try {
    if (!sessionState?.turnEndSummaryOutstanding() || !shouldWait()) return;
    return sessionState.waitForTurnEndSummary()?.catch(logSummaryFailure);
  } catch (error) {
    logSummaryFailure(error);
    return;
  }
}
//@ chunk-ha3km179.js:85527-85547 placement
/**
 * 记录摘要失败
 */
function logSummaryFailure(error) {
  logError(error);
}
//@ chunk-ha3km179.js:85547-98580 placement
/**
 * 回合结束时运行 Stop hooks 与记忆提取，返回阻断错误与是否阻止继续。
 */
async function* runStopHooks(
  messagesForQuery,
  assistantMessages,
  systemPrompt,
  userContext,
  systemContext,
  context,
  querySource,
  stopHookActive,
  stickyBetas,
  classifierJobState,
  toolResults = [],
) {
  if (isTerminalShutdown() && !context.abortController.signal.aborted)
    return {
      blockingErrors: [],
      preventContinuation: false,
    };
  if (context.options.settingsHooksOff || querySource === "agent_summary")
    return {
      blockingErrors: [],
      preventContinuation: false,
    };
  let now = Date.now();
  let context_2 = {
    messages: [...messagesForQuery, ...assistantMessages, ...toolResults],
    systemPrompt,
    userContext,
    systemContext,
    toolUseContext: context,
    querySource,
    stickyBetas,
  };
  if (
    isMainAgent(context.agentContext) &&
    (querySource.startsWith("repl_main_thread") || querySource === "sdk")
  )
    saveCacheSafeParams(createCacheSafeParams(context_2));
  yield* generatePostTurnSummary(
    classifierJobState,
    context_2.messages,
    assistantMessages,
    context,
    querySource,
  );
  if (!isBareMode()) {
    if (!isEnvDefinedFalsy(process.env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION))
      if (isSuggestionOwnedByPlugin() && isMainAgent(context.agentContext))
        context.session.promptSuggestion.arm();
      else executePromptSuggestion(context_2, classifierJobState?.lastResult);
    if (
      !context.agentId &&
      (isExtractModeActive() || extractMemoriesModule.isLaptopExtractActive(context.session.host))
    ) {
      let extractPromise = extractMemoriesModule.executeExtractMemories(
        context_2,
        context.appendSystemMessage,
      );
      if (
        getHostedPostTurnMemoryConfig()?.sync ||
        extractMemoriesModule.isLaptopExtractSync(context.session.host)
      )
        try {
          await extractPromise;
        } catch (error) {
          logForDebugging(`extractMemories (sync) failed: ${error}`);
        }
    }
    if (!context.agentId) runAutoDreamForHost(context_2, context.appendSystemMessage);
  }
  if (!context.agentId)
    try {
      yield* cleanupComputerUseAfterTurn(context);
    } catch {}
  let briefNudge = null;
  if (
    (querySource.startsWith("repl_main_thread") || querySource === "sdk") &&
    lazyChunkCv3.isBriefEnabled() &&
    !env.DISABLE_BRIEF_MODE_STOP_HOOK &&
    !context.agentId &&
    context.options.tools.some((tool) => toolMatchesName(tool, lazyChunkVsw.BRIEF_TOOL_NAME))
  )
    try {
      let lastRealUserMessageIndex = findLastRealUserMessageIndex(messagesForQuery);
      let sliced = messagesForQuery.slice(lastRealUserMessageIndex + 1);
      let any = [...sliced, ...assistantMessages].some(
        (message) =>
          message.type === "assistant" &&
          message.message.content.some(
            (block) =>
              block.type === "tool_use" &&
              (block.name === lazyChunkVsw.BRIEF_TOOL_NAME ||
                block.name === lazyChunkVsw.LEGACY_BRIEF_TOOL_NAME),
          ),
      );
      let briefAlreadyEnforced =
        !any &&
        sliced.some(
          (message) =>
            message.type === "user" &&
            message.isMeta &&
            typeof message.message.content === "string" &&
            message.message.content.includes(lazyChunkVsw.BRIEF_ENFORCE_SENTINEL),
        );
      if (!any && !briefAlreadyEnforced) {
        briefNudge = createUserMessage({
          content: `${lazyChunkVsw.BRIEF_ENFORCE_SENTINEL} ${lazyChunkCv3.getBriefEnforceText()}`,
          isMeta: true,
        });
        yield briefNudge;
      }
    } catch (error) {
      logForDebugging(`Brief mode enforcement failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let replyGateNudge = null;
  let replyGateBounce = null;
  let replyGatePolicyValue = replyGatePolicy();
  if (
    getQueuedPeerMessageCount &&
    querySource === "sdk" &&
    !context.agentId &&
    (replyGatePolicyValue !== undefined ||
      (getQueuedPeerMessageCount.isProjectsReplyGateEnabled() &&
        getQueuedPeerMessageCount.isProjectsReplyMountConnected(context.getAppState())))
  )
    try {
      let hearthToolNames = resolveHearthToolNames(context.options.tools);
      let gateDecision = getQueuedPeerMessageCount.evaluateProjectsReplyGate(
        messagesForQuery,
        [...assistantMessages, ...toolResults],
        replyGatePolicyValue !== undefined
          ? {
              kind: "policy",
              policy: replyGatePolicyValue,
            }
          : {
              kind: "remote_control",
              toolNames: hearthToolNames,
            },
      );
      switch (gateDecision.kind) {
        case "answered":
          if (replyGatePolicyValue !== undefined)
            logFeatureOk("projects_reply_gate_policy", {
              person_opened_turn: gateDecision.personOpened,
              no_reply_only: gateDecision.noReplyOnly,
            });
          else logFeatureOk("bridge_projects_reply_gate");
          break;
        case "still_silent":
          if (replyGatePolicyValue !== undefined)
            logReplyGatePolicy("still_silent", {
              person_opened_turn: gateDecision.personOpened,
            });
          else logFeatureBad("bridge_projects_reply_gate", "still_silent");
          break;
        case "skip":
          break;
        case "bounce":
          if (
            !serverHasAnyTool(
              context.options.tools,
              replyGatePolicyValue?.terminalTools ?? [hearthToolNames.reply],
            )
          ) {
            if (replyGatePolicyValue !== undefined)
              logReplyGatePolicy("reply_tool_not_in_pool", {
                person_opened_turn: gateDecision.personOpened,
              });
            else logFeatureBad("bridge_projects_reply_gate", "reply_tool_not_in_pool");
            break;
          }
          if (replyGatePolicyValue !== undefined)
            logFeatureSad("projects_reply_gate_policy", gateDecision.reason, {
              person_opened_turn: gateDecision.personOpened,
            });
          else logFeatureSad("bridge_projects_reply_gate", gateDecision.reason);
          replyGateBounce = createUserMessage({
            content: gateDecision.text,
            isMeta: true,
          });
          yield replyGateBounce;
          break;
      }
    } catch (error) {
      logForDebugging(`Projects reply gate enforcement failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let structuredOutputNudge = null;
  if (context.options.requiresStructuredOutput && classifyQuerySource(querySource) !== "auxiliary")
    try {
      let lastRealUserMessageIndex = findLastRealUserMessageIndex(messagesForQuery);
      let sliced = messagesForQuery.slice(lastRealUserMessageIndex + 1);
      let hasStructuredOutput = hasSuccessfulToolCall([...sliced, ...assistantMessages], STRUCTUREDOUTPUT);
      let structuredOutputEnforced =
        !hasStructuredOutput &&
        sliced.some(
          (message) =>
            message.type === "user" &&
            message.isMeta &&
            typeof message.message.content === "string" &&
            message.message.content.includes(STRUCTURED_OUTPUT_ENFORCE_PREFIX),
        );
      if (!hasStructuredOutput && !structuredOutputEnforced) {
        structuredOutputNudge = createUserMessage({
          content: `${STRUCTURED_OUTPUT_ENFORCE_PREFIX} You MUST call the ${STRUCTUREDOUTPUT} tool to complete this request. Call this tool now.`,
          isMeta: true,
        });
        yield structuredOutputNudge;
      }
    } catch (error) {
      logForDebugging(`StructuredOutput enforcement failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let handbackNudge = null;
  if (
    context.options.requiresHandback &&
    classifyQuerySource(querySource) !== "auxiliary" &&
    context.agentId !== undefined
  )
    try {
      let agentId = context.agentId;
      let agentTask = context.taskRegistry.get(agentId);
      let pendingHandbackReport = getPendingHandbackReport(agentTask, agentId);
      let handbackBounces = getSelectableBackgroundTasks(agentTask)?.handbackBounces ?? 0;
      pruneSettledChildWork(agentId, context.taskRegistry);
      let childWorkPending = hasPendingChildWork(agentId, context.taskRegistry);
      if (
        pendingHandbackReport !== undefined &&
        pendingHandbackReport.length === 0 &&
        !childWorkPending &&
        handbackBounces < MAX_HANDBACK_ENFORCE_RETRIES
      ) {
        context.taskRegistry.update(agentId, (task) => ({
          ...task,
          handbackBounces: handbackBounces + 1,
        }));
        handbackNudge = createUserMessage({
          content: `${HANDBACK_ENFORCE_PREFIX} Your report has not been delivered. Call ${SUBAGENTHANDBACK}({message: <your full report>}) now; the call ends your run.`,
          isMeta: true,
        });
        yield handbackNudge;
      }
    } catch (error) {
      logForDebugging(`Subagent hand-back enforcement failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let unsentFileNudge = null;
  if (
    querySource === "sdk" &&
    !context.agentId &&
    isResilientGalaxyOn() &&
    context.options.tools.some((tool) => toolMatchesName(tool, SEND_USER_FILE_TOOL_NAME))
  )
    try {
      let reminderState = lastTurnReminderState(context_2.messages);
      switch (reminderState.kind) {
        case "skip":
          break;
        case "remind":
          logFeatureSad("query_unsent_file_reminder", "reminded");
          unsentFileNudge = createUserMessage({
            content: reminderState.text,
            isMeta: true,
          });
          yield unsentFileNudge;
          break;
        case "reminded":
          if (reminderState.sent)
            logFeatureOk("query_unsent_file_reminder", {
              message_length: reminderState.textLength,
            });
          else
            logFeatureSad("query_unsent_file_reminder", "not_sent", {
              message_length: reminderState.textLength,
            });
          break;
      }
    } catch (error) {
      logForDebugging(`Unsent file reminder check failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  if (classifyQuerySource(querySource) !== "auxiliary" && glowingOrbitOn())
    try {
      let pendingHandoffs = pendingShellHandOffs(
        messagesForQuery.slice(findLastPromptIndex(messagesForQuery)),
        assistantMessages,
        context.agentId ?? null,
      );
      if (pendingHandoffs === undefined) logFeatureSad("skill_inline_command_handoff", "too_much_to_check");
      else if (pendingHandoffs.length > 0) logFeatureBad("skill_inline_command_handoff", "not_run");
    } catch (error) {
      logForDebugging(`Skill inline command turn-end check failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let filtered = [
    briefNudge,
    replyGateNudge,
    replyGateBounce,
    structuredOutputNudge,
    handbackNudge,
    unsentFileNudge,
  ].filter((nudge) => nudge !== null);
  let hookHandlerFailed = false;
  let pausedGoalHook;
  let rearmedGoal = undefined;
  let blockingErrors = [...filtered];
  let preventedContinuation = false;
  let taskHookBlockingErrors = [];
  let taskHookPrevented = false;
  let activeGoal = context.agentId ? undefined : context.getAppState().activeGoal;
  let goalOutcome;
  let goalTaskCounts;
  try {
    let appState = context.getAppState();
    let mode = getToolPermissionContext(context).mode;
    let activeGoal_2 = appState.activeGoal;
    let isMainThreadAgent = !context.agentId;
    if (isMainThreadAgent) clearPendingGoalIdleCheckin(context.session.sessionScratch);
    if (activeGoal_2 && isMainThreadAgent) {
      let visibleBackgroundTasks = getVisibleBackgroundTasks(context.taskRegistry.all());
      if (visibleBackgroundTasks.length > 0) {
        pausedGoalHook = getSessionStopPromptHooks(context.sessionHooksRegistry, getSessionId()).find(
          (sessionHook) => sessionHook.prompt === activeGoal_2.condition,
        );
        if (pausedGoalHook) {
          context.sessionHooksRegistry.remove(getSessionId(), "Stop", pausedGoalHook);
          logForDebugging("[goal] evaluation deferred \u2014 background work still running");
          goalOutcome = "deferred";
          goalTaskCounts = {
            activeAgents: count(visibleBackgroundTasks, isActiveAgentTask),
            activeShells: count(visibleBackgroundTasks, isRunningShellTask),
          };
          let checkinText;
          try {
            let checkinPlan = planGoalCheckin(activeGoal_2, visibleBackgroundTasks, Date.now());
            rearmedGoal = checkinPlan.nextGoal;
            checkinText = checkinPlan.checkinText;
          } catch (error) {
            logError(error);
            rearmedGoal = activeGoal_2;
            logFeatureBad("goal_checkin", "plan_failed");
          }
          if (rearmedGoal !== undefined && rearmedGoal !== activeGoal_2)
            yield {
              type: "active_goal",
              value: rearmedGoal,
            };
          if (checkinText !== undefined) {
            let userMessage = createUserMessage({
              content: checkinText,
              isMeta: true,
            });
            blockingErrors.push(userMessage);
            filtered.push(userMessage);
            yield userMessage;
          }
        }
      } else if (activeGoal_2.deferredSince !== undefined) {
        let { deferredSince, checkinCount, lastDeferralPassAt, ...goalWithoutDeferral } = activeGoal_2;
        yield {
          type: "active_goal",
          value: goalWithoutDeferral,
        };
      }
    }
    let findPausedGoalHook = (hook) => {
      if (!hook) return;
      return (context.sessionHooksRegistry.get(getSessionId(), "Stop").get("Stop") ?? [])
        .flatMap((matcher) => matcher.hooks)
        .some((candidateHook) => isHookEqual(candidateHook, hook))
        ? hook
        : undefined;
    };
    let stopHookResults = executeStopHooks(
      mode,
      context.abortController.signal,
      undefined,
      stopHookActive,
      context.agentId,
      context,
      context_2.messages,
      context.agentType,
      "blockable_turn_end",
    );
    let toolUseID = "";
    let hookCount = 0;
    let stopReason = "";
    let hasOutput = false;
    let hookErrors = [];
    let hookAdditionalContext = [];
    let hookInfos = [];
    let hookPushedBack = false;
    for await (let hookResult of stopHookResults) {
      if (hookResult.message) {
        yield hookResult.message;
        if (isHookBlockingErrorAttachment(hookResult.message) && isJoyfulGlobeOn())
          blockingErrors.push(hookResult.message);
        if (hookResult.message.type === "progress" && hookResult.message.toolUseID) {
          toolUseID = hookResult.message.toolUseID;
          hookCount++;
          let progressData = hookResult.message.data;
          if (progressData.command)
            hookInfos.push({
              command: progressData.command,
              promptText: progressData.promptText,
            });
        }
        if (hookResult.message.type === "attachment") {
          let attachment = hookResult.message.attachment;
          if (
            "hookEvent" in attachment &&
            (attachment.hookEvent === "Stop" || attachment.hookEvent === "SubagentStop")
          ) {
            if (
              activeGoal &&
              hookResult.hook?.prompt === activeGoal.condition &&
              (attachment.type === "hook_non_blocking_error" ||
                attachment.type === "hook_error_during_execution")
            ) {
              goalOutcome = "error";
              logFeatureSad("goal_met", "evaluator_error");
            }
            if (attachment.type === "hook_non_blocking_error") {
              hookErrors.push(attachment.stderr || `Exit code ${attachment.exitCode}`);
              hasOutput = true;
            } else if (attachment.type === "hook_error_during_execution") {
              hookErrors.push(attachment.content);
              hasOutput = true;
            } else if (attachment.type === "hook_success") {
              if (
                (attachment.stdout && attachment.stdout.trim()) ||
                (attachment.stderr && attachment.stderr.trim())
              )
                hasOutput = true;
              let sessionHookEntry = findPausedGoalHook(hookResult.hook);
              if (attachment.hookEvent === "Stop" && sessionHookEntry) {
                context.sessionHooksRegistry.remove(getSessionId(), "Stop", sessionHookEntry);
                let activeGoal = context.getAppState().activeGoal;
                if (activeGoal?.condition === sessionHookEntry.prompt) {
                  let iterations = activeGoal.iterations + 1;
                  let durationMs = Date.now() - activeGoal.setAt;
                  let tokens = getTotalOutputTokens() - activeGoal.tokensAtStart;
                  yield {
                    type: "active_goal",
                    value: undefined,
                  };
                  goalOutcome = hookResult.impossible ? "impossible" : "met";
                  if (hookResult.impossible) {
                    yield createAttachmentMessage_2({
                      type: "goal_status",
                      met: false,
                      failed: true,
                      condition: sessionHookEntry.prompt,
                      reason: hookResult.stopReason,
                      iterations,
                      durationMs,
                      tokens,
                    });
                    logEvent("tengu_goal_failed", {
                      promptLength: sessionHookEntry.prompt.length,
                      reasonLength: hookResult.stopReason?.length ?? 0,
                      iterations,
                      durationMs,
                      tokens,
                      origin: fromEnumOpt(activeGoal.origin),
                    });
                    logFeatureBad("goal_met", "impossible");
                  } else {
                    yield createAttachmentMessage_2({
                      type: "goal_status",
                      met: true,
                      condition: sessionHookEntry.prompt,
                      reason: hookResult.stopReason,
                      iterations,
                      durationMs,
                      tokens,
                    });
                    logEvent("tengu_goal_achieved", {
                      promptLength: sessionHookEntry.prompt.length,
                      iterations,
                      durationMs,
                      tokens,
                      origin: fromEnumOpt(activeGoal.origin),
                    });
                    logFeatureOk("goal_met");
                    context.sessionState?.notifyMetadataChanged({
                      goal: {
                        condition: sessionHookEntry.prompt,
                        set_at: activeGoal.setAt,
                        iterations,
                        last_reason: null,
                        met: true,
                      },
                    });
                  }
                }
              }
            }
            if ("durationMs" in attachment && "command" in attachment) {
              let found = hookInfos.find(
                (info) => info.command === attachment.command && info.durationMs === undefined,
              );
              if (found) found.durationMs = attachment.durationMs;
            }
          }
        }
      }
      if (hookResult.timedOut) {
        if (activeGoal && hookResult.hook?.prompt === activeGoal.condition) {
          goalOutcome = "cancelled";
          logFeatureSad("goal_met", "evaluator_timeout");
        }
        continue;
      }
      if (hookResult.blockingError) {
        let userMessage = createUserMessage({
          content: getStopHookMessage(hookResult.blockingError),
          isMeta: true,
        });
        blockingErrors.push(userMessage);
        yield userMessage;
        hasOutput = true;
        let pausedHook = findPausedGoalHook(hookResult.hook);
        let activeGoal = context.getAppState().activeGoal;
        if (pausedHook && activeGoal?.condition === pausedHook.prompt) {
          goalOutcome = "not_met";
          yield {
            type: "active_goal",
            value: {
              ...activeGoal,
              iterations: activeGoal.iterations + 1,
              lastReason: hookResult.stopReason,
            },
          };
          yield createAttachmentMessage_2({
            type: "goal_status",
            met: false,
            condition: pausedHook.prompt,
            reason: hookResult.stopReason,
          });
        } else {
          hookErrors.push(hookResult.blockingError.blockingError);
          hookPushedBack = true;
        }
      }
      if (hookResult.additionalContexts && hookResult.additionalContexts.length > 0) {
        let hookEventName = context.agentId ? "SubagentStop" : "Stop";
        let attachmentMessage = createAttachmentMessage_2({
          type: "hook_additional_context",
          content: hookResult.additionalContexts,
          hookName: hookEventName,
          toolUseID,
          hookEvent: hookEventName,
        });
        if (!isBareModeAttachmentDropped(attachmentMessage)) blockingErrors.push(attachmentMessage);
        yield attachmentMessage;
        hasOutput = true;
        hookAdditionalContext.push(...hookResult.additionalContexts);
      }
      if (hookResult.preventContinuation) {
        preventedContinuation = true;
        stopReason = hookResult.stopReason || "Stop hook prevented continuation";
        yield createAttachmentMessage_2({
          type: "hook_stopped_continuation",
          message: stopReason,
          hookName: "Stop",
          toolUseID,
          hookEvent: "Stop",
        });
      }
      if (context.abortController.signal.aborted) {
        logEvent("tengu_pre_stop_hooks_cancelled", {
          queryChainId: sanitizeMarkName(context.queryTracking?.chainId),
          queryDepth: context.queryTracking?.depth,
        });
        if (!isSilentAbortReason(context.abortController.signal.reason))
          yield createUserInterruptionMessage({
            toolUse: false,
            interruptedByShutdown: shutdownInterruptStamp(context.abortController.signal),
          });
        return {
          blockingErrors: [],
          preventContinuation: true,
        };
      }
    }
    if (hookCount > 0) {
      yield createStopHookSummaryMessage(
        hookCount,
        hookInfos,
        hookErrors,
        preventedContinuation,
        stopReason,
        hasOutput,
        "suggestion",
        toolUseID,
        undefined,
        undefined,
        hookAdditionalContext,
      );
      if (hookErrors.length > 0) {
        let shortcutDisplay = getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
        if (!stopHookActive)
          yield {
            type: "notification",
            notification: {
              key: "stop-hook-error",
              text: `Stop hook error occurred \xB7 ${shortcutDisplay} to see`,
              priority: "immediate",
            },
          };
      }
    }
    if (preventedContinuation) {
      yield* runTurnEndReactions(context, context_2.messages, {
        stopHookActive,
      });
      return {
        blockingErrors: [],
        preventContinuation: true,
      };
    }
    if (blockingErrors.length > 0) {
      if (hookPushedBack)
        logHookPushbackEvent({
          pushback: {
            hookEvent: context.agentId ? "subagent_stop" : "stop",
          },
          permissionMode: mode,
          agentContext: context.agentContext,
        });
      return {
        blockingErrors,
        preventContinuation: false,
        goalPass: goalOutcome,
      };
    }
    let teammateContext = isTeammateAgentContext(context.agentContext, context.taskRegistry, context.agentId);
    if (teammateContext !== undefined && context.agentId === teammateContext.agentId) {
      let { teammateName, teamName } = teammateContext;
      let taskStopReason;
      let taskHookToolUseID = "";
      let taskListId = getTaskListId();
      let filtered = (await listTasks(taskListId, context.storageV5)).filter(
        (task) => task.status === "in_progress" && task.owner === teammateName,
      );
      for (let task of filtered) {
        let completedHookResults = executeTaskCompletedHooks(
          task.id,
          task.subject,
          task.description,
          teammateName,
          teamName,
          mode,
          context.abortController.signal,
          undefined,
          context,
        );
        for await (let hookResult of completedHookResults) {
          if (hookResult.message) {
            if (hookResult.message.type === "progress" && hookResult.message.toolUseID)
              taskHookToolUseID = hookResult.message.toolUseID;
            yield hookResult.message;
            if (isHookBlockingErrorAttachment(hookResult.message) && isJoyfulGlobeOn())
              taskHookBlockingErrors.push(hookResult.message);
          }
          if (hookResult.blockingError) {
            let userMessage = createUserMessage({
              content: getTaskCompletedHookMessage(hookResult.blockingError),
              isMeta: true,
            });
            taskHookBlockingErrors.push(userMessage);
            yield userMessage;
          }
          if (hookResult.preventContinuation) {
            taskHookPrevented = true;
            taskStopReason = hookResult.stopReason || "TaskCompleted hook prevented continuation";
            yield createAttachmentMessage_2({
              type: "hook_stopped_continuation",
              message: taskStopReason,
              hookName: "TaskCompleted",
              toolUseID: taskHookToolUseID,
              hookEvent: "TaskCompleted",
            });
          }
          if (context.abortController.signal.aborted)
            return {
              blockingErrors: [],
              preventContinuation: true,
            };
        }
      }
      let idleHookResults = executeTeammateIdleHooks(
        teammateName,
        teamName,
        mode,
        context.abortController.signal,
        undefined,
        context,
      );
      for await (let hookResult of idleHookResults) {
        if (hookResult.message) {
          if (hookResult.message.type === "progress" && hookResult.message.toolUseID)
            taskHookToolUseID = hookResult.message.toolUseID;
          yield hookResult.message;
          if (isHookBlockingErrorAttachment(hookResult.message) && isJoyfulGlobeOn())
            taskHookBlockingErrors.push(hookResult.message);
        }
        if (hookResult.blockingError) {
          let userMessage = createUserMessage({
            content: getTeammateIdleHookMessage(hookResult.blockingError),
            isMeta: true,
          });
          taskHookBlockingErrors.push(userMessage);
          yield userMessage;
        }
        if (hookResult.preventContinuation) {
          taskHookPrevented = true;
          taskStopReason = hookResult.stopReason || "TeammateIdle hook prevented continuation";
          yield createAttachmentMessage_2({
            type: "hook_stopped_continuation",
            message: taskStopReason,
            hookName: "TeammateIdle",
            toolUseID: taskHookToolUseID,
            hookEvent: "TeammateIdle",
          });
        }
        if (context.abortController.signal.aborted)
          return {
            blockingErrors: [],
            preventContinuation: true,
          };
      }
      if (taskHookPrevented) {
        yield* runTurnEndReactions(context, context_2.messages, {
          stopHookActive,
        });
        return {
          blockingErrors: [],
          preventContinuation: true,
        };
      }
      if (taskHookBlockingErrors.length > 0)
        return {
          blockingErrors: taskHookBlockingErrors,
          preventContinuation: false,
          goalPass: goalOutcome,
        };
    }
    yield* runTurnEndReactions(context, context_2.messages, {
      stopHookActive,
    });
    return {
      blockingErrors: [],
      preventContinuation: false,
      goalPass: goalOutcome,
    };
  } catch (error) {
    if (
      isAbortError(error) &&
      (context.abortController.signal.aborted || error instanceof StreamClosedAbortError)
    ) {
      logForDebugging("Stop hook cancelled (abort or stream teardown)");
      if (!context.abortController.signal.aborted) {
        let allBlockingErrors = [...blockingErrors, ...taskHookBlockingErrors];
        let prevented = preventedContinuation || taskHookPrevented;
        if (prevented || allBlockingErrors.length === 0)
          yield* runTurnEndReactions(context, context_2.messages, {
            stopHookActive,
          });
        return {
          blockingErrors: allBlockingErrors,
          preventContinuation: prevented,
        };
      }
      return {
        blockingErrors: [],
        preventContinuation: false,
      };
    }
    hookHandlerFailed = true;
    let duration = Date.now() - now;
    logEvent("tengu_stop_hook_error", {
      duration,
      queryChainId: sanitizeMarkName(context.queryTracking?.chainId),
      queryDepth: context.queryTracking?.depth,
    });
    yield createSystemMessage(`Stop hook failed: ${errorMessage(error)}`, "warning");
    if (filtered.length === 0)
      yield* runTurnEndReactions(context, context_2.messages, {
        stopHookActive,
      });
    return {
      blockingErrors: filtered,
      preventContinuation: false,
      goalPass:
        activeGoal && (goalOutcome === undefined || goalOutcome === "not_met") ? "error" : goalOutcome,
    };
  } finally {
    if (pausedGoalHook) context.sessionHooksRegistry.add(getSessionId(), "Stop", "", pausedGoalHook);
    if (rearmedGoal !== undefined && !context.options.isNonInteractiveSession) {
      let { getAppState, setAppState, taskRegistry, session, messageQueue } = context;
      try {
        scheduleGoalIdleCheckin({
          goal: rearmedGoal,
          now: Date.now(),
          sessionScratch: session.sessionScratch,
          getAppState,
          setAppState,
          getDeferringTasks: () => getVisibleBackgroundTasks(taskRegistry.all()),
          ...createQueueDelivery(messageQueue),
        });
      } catch (error) {
        logError(error);
        try {
          logFeatureBad("goal_checkin", "arm_failed");
        } catch (error) {
          logError(error);
        }
      }
    }
    if (hookHandlerFailed) logFeatureBad("hook_stop_handler", "hook_stop_handler_failed");
    else logFeatureOk("hook_stop_handler");
    if (activeGoal) {
      let aborted = context.abortController.signal.aborted;
      let goalEvaluated = goalOutcome === "met" || goalOutcome === "not_met" || goalOutcome === "impossible";
      logEvent("tengu_goal_evaluated", {
        outcome: fromEnum(goalOutcome ?? (hookHandlerFailed ? "error" : aborted ? "cancelled" : "absent")),
        durationMs: Date.now() - now,
        iterations: activeGoal.iterations + (goalEvaluated ? 1 : 0),
        parentAborted: aborted,
        origin: fromEnumOpt(activeGoal.origin),
        ...goalTaskCounts,
      });
    }
  }
}
//@ chunk-ha3km179.js:98580-99181 placement
/**
 * 运行 turn_end_reactions hooks。
 */
async function* runTurnEndReactions(context, messages, { stopHookActive }) {
  try {
    let reactionResults = executeStopHooks(
      getToolPermissionContext(context).mode,
      context.abortController.signal,
      undefined,
      stopHookActive,
      context.agentId,
      context,
      messages,
      context.agentType,
      "turn_end_reactions",
    );
    for await (let hookResult of reactionResults) {
      if (hookResult.message) yield hookResult.message;
      if (hookResult.blockingError || hookResult.preventContinuation)
        logForDebugging(
          `[stop-hooks] Turn-end reaction hook block discarded: ${hookResult.blockingError?.blockingError ?? hookResult.stopReason ?? "preventContinuation"}`,
        );
    }
  } catch (error) {
    if (
      isAbortError(error) &&
      (context.abortController.signal.aborted || error instanceof StreamClosedAbortError)
    ) {
      logForDebugging("[stop-hooks] Turn-end reactions pass cancelled (abort or stream teardown)");
      return;
    }
    logForDebugging("[stop-hooks] Turn-end reactions pass failed", {
      level: "error",
    });
    logError(error);
  }
}
export { runTurnEndReactions, runStopHooks, waitForTurnEndSummary, generatePostTurnSummary };
