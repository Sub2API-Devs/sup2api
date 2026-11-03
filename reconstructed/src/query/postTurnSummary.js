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

//@ chunk-ha3km179.js:79310-79416 placement
var extractMemoriesModule = require("./chunk-aghtagt4.js");
var agentJobStateModule = require("./chunk-wd9kxbpn.js");
var postTurnSummaryModule = require("./chunk-e321p3vc.js");
//@ chunk-ha3km179.js:82467-85391 placement
/**
 * 主线程回合结束后生成并发布回合摘要（按检测到的界面发往不同接收端）。
 */
async function* generatePostTurnSummary(e, content, r, s, h) {
  if (
    !e ||
    classifyQuerySource(h) !== "main" ||
    s.agentId ||
    (isTerminalShutdown() && !s.abortController.signal.aborted)
  )
    return;
  let y = postTurnSummaryModule;
  let S = y.detectSurfaces(
    isStorageV5Enabled() && s.storageV5 ? await y.watchedForSurfaces(s.storageV5) : undefined,
  );
  let M = y.sinksFor(S);
  let R = y.engineFor(M);
  if (!R) return;
  e.lastEmittedDetail = "";
  let postTurnSummary = s.getAppState().postTurnSummary;
  if (M.has("summary"))
    yield {
      type: "post_turn_summary",
      value: null,
    };
  let w = y.projectsRecapEnabled(s.options.tools);
  let P;
  let Q = lit("none");
  let D = M.has("summary") ? shownErroredToolRowId(content) : undefined;
  e.onClassified = (V, fe) => {
    if (fe || !M.has("summary")) return;
    if (P?.superseded) {
      logForDebugging(
        "[classifier] dropped a late end-of-turn summary: a newer session status was written or cleared while it was being generated",
      );
      Q = lit("dropped_superseded");
      return;
    }
    if (V.source === "no-text-turn" && V.detail === "") {
      if (postTurnSummary) {
        s.setAppState((re) =>
          re.postTurnSummary === postTurnSummary
            ? re
            : {
                ...re,
                postTurnSummary,
              },
        );
        publishPostTurnSummary(
          s.sessionState,
          postTurnSummary,
          P === undefined
            ? undefined
            : {
                turnEndVerdict: true,
              },
        );
        Q = lit("republished_prior");
      }
      return;
    }
    let ie = y.classifiedToPostTurnSummary(V, {
      projectsRecap: w,
    });
    let Z = V.source === "no-text-turn" ? postTurnSummary?.standing : D;
    if (ie.status_category === "blocked" && Z !== undefined) ie.standing = Z;
    if (V.source === "no-text-turn") {
      ie.recent_action = postTurnSummary?.recent_action ?? "";
      if (postTurnSummary?.description !== undefined) ie.description = postTurnSummary.description;
      if (postTurnSummary?.reply !== undefined) ie.reply = postTurnSummary.reply;
    }
    s.setAppState((re) =>
      re.postTurnSummary?.status_category === ie.status_category &&
      re.postTurnSummary.status_detail === ie.status_detail &&
      re.postTurnSummary.needs_action === ie.needs_action &&
      re.postTurnSummary.recent_action === ie.recent_action &&
      re.postTurnSummary.description === ie.description &&
      re.postTurnSummary.reply === ie.reply &&
      re.postTurnSummary.standing === ie.standing
        ? re
        : {
            ...re,
            postTurnSummary: ie,
          },
    );
    publishPostTurnSummary(
      s.sessionState,
      ie,
      P === undefined
        ? undefined
        : {
            turnEndVerdict: true,
          },
    );
    Q = lit("published");
    enqueueTaskNotification({
      type: "system",
      subtype: "post_turn_summary",
      summarizes_uuid: r.at(-1)?.uuid ?? "",
      status_category: ie.status_category,
      status_detail: ie.status_detail,
      needs_action: ie.needs_action,
    });
  };
  let mainThreadAgentType = getMainThreadAgentType();
  let z = mainThreadAgentType
    ? s.options.agentDefinitions.activeAgents.find(
        (activeAgent) => activeAgent.agentType === mainThreadAgentType,
      )
    : undefined;
  let filtered = content.filter((V) => V.type === "assistant");
  if (w) {
    let threadRows = collectThreadRows(content);
    e.latestAsk = "";
    if (threadRows) agentJobStateModule.captureLatestAsk(e, threadRows);
  } else {
    let latestRealUserAsk = agentJobStateModule.findLatestRealUserAsk(content);
    if (latestRealUserAsk) agentJobStateModule.captureLatestAsk(e, latestRealUserAsk);
  }
  e.scriptPosts = s.toolState.get(ReplCallNoteBuffer).take();
  e.quietTurnKeepsAsk =
    M.has("summary") &&
    postTurnSummary?.standing !== undefined &&
    logOperation(postTurnSummary.standing, content);
  if (e.quietTurnKeepsAsk) logFeatureOk("chat_relay_standing_ask");
  let ee = agentJobStateModule
    .classifyAndPush(
      e,
      getOwnJobShortId(),
      z,
      "",
      filtered,
      hasActiveAgentTasks(s.taskRegistry.all()),
      R,
      S,
      false,
      w,
    )
    .catch((error) => {
      logForDebugging(`[classifier] error: ${errorMessage(error)}`, {
        level: "error",
      });
    });
  if (isBgSession() || h === "sdk") {
    let sessionState = s.sessionState;
    let fe = S.has("ccr") && isRemoteCowork();
    let ie = isClaudeAiChatOrigin();
    let Z = fe && sessionState !== undefined && !ie;
    let holdCapMs = Z ? 0 : SESSION_STATE_IDLE_TTL_MS;
    let now = Date.now();
    if (Z) P = sessionState.holdTurnEndSummary(ee, performance.now() + SESSION_STATE_IDLE_TTL_MS);
    else await withTimeout(ee, SESSION_STATE_IDLE_TTL_MS, "classifier write timed out").catch(() => {});
    let now_2 = Date.now();
    if (h === "sdk")
      ee.then(() => {
        logEvent("tengu_turn_end_classifier_hold", {
          hold_cap_ms: holdCapMs,
          held_ms: now_2 - now,
          summary_after_turn_ms: Math.max(0, Date.now() - now_2),
          cowork_ccr: fe,
          engine: fromEnum(R),
          summary_outcome: Q,
          session_origin_chat: ie,
        });
      });
  }
}
//@ chunk-ha3km179.js:85391-85527 placement
/**
 * 若有未完成的回合结束摘要且条件满足，等待其完成（错误交给处理函数）。
 */
function waitForTurnEndSummary(sessionState, n) {
  try {
    if (!sessionState?.turnEndSummaryOutstanding() || !n()) return;
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
  cmd,
  assistantMessages,
  systemPrompt,
  userContext,
  systemContext,
  toolUseContext,
  querySource,
  stopHookActive,
  stickyBetas,
  classifierJobState,
  toolResults = [],
) {
  if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted)
    return {
      blockingErrors: [],
      preventContinuation: false,
    };
  if (toolUseContext.options.settingsHooksOff || querySource === "agent_summary")
    return {
      blockingErrors: [],
      preventContinuation: false,
    };
  let now = Date.now();
  let context = {
    messages: [...cmd, ...assistantMessages, ...toolResults],
    systemPrompt,
    userContext,
    systemContext,
    toolUseContext,
    querySource,
    stickyBetas,
  };
  if (
    isMainAgent(toolUseContext.agentContext) &&
    (querySource.startsWith("repl_main_thread") || querySource === "sdk")
  )
    saveCacheSafeParams(createCacheSafeParams(context));
  yield* generatePostTurnSummary(
    classifierJobState,
    context.messages,
    assistantMessages,
    toolUseContext,
    querySource,
  );
  if (!isBareMode()) {
    if (!isEnvDefinedFalsy(process.env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION))
      if (isSuggestionOwnedByPlugin() && isMainAgent(toolUseContext.agentContext))
        toolUseContext.session.promptSuggestion.arm();
      else executePromptSuggestion(context, classifierJobState?.lastResult);
    if (
      !toolUseContext.agentId &&
      (isExtractModeActive() || extractMemoriesModule.isLaptopExtractActive(toolUseContext.session.host))
    ) {
      let le = extractMemoriesModule.executeExtractMemories(context, toolUseContext.appendSystemMessage);
      if (
        getHostedPostTurnMemoryConfig()?.sync ||
        extractMemoriesModule.isLaptopExtractSync(toolUseContext.session.host)
      )
        try {
          await le;
        } catch (error) {
          logForDebugging(`extractMemories (sync) failed: ${error}`);
        }
    }
    if (!toolUseContext.agentId) runAutoDreamForHost(context, toolUseContext.appendSystemMessage);
  }
  if (!toolUseContext.agentId)
    try {
      yield* cleanupComputerUseAfterTurn(toolUseContext);
    } catch {}
  let D = null;
  if (
    (querySource.startsWith("repl_main_thread") || querySource === "sdk") &&
    lazyChunkCv3.isBriefEnabled() &&
    !env.DISABLE_BRIEF_MODE_STOP_HOOK &&
    !toolUseContext.agentId &&
    toolUseContext.options.tools.some((tool) => toolMatchesName(tool, lazyChunkVsw.BRIEF_TOOL_NAME))
  )
    try {
      let lastRealUserMessageIndex = findLastRealUserMessageIndex(cmd);
      let sliced = cmd.slice(lastRealUserMessageIndex + 1);
      let any = [...sliced, ...assistantMessages].some(
        (je) =>
          je.type === "assistant" &&
          je.message.content.some(
            (It) =>
              It.type === "tool_use" &&
              (It.name === lazyChunkVsw.BRIEF_TOOL_NAME || It.name === lazyChunkVsw.LEGACY_BRIEF_TOOL_NAME),
          ),
      );
      let J =
        !any &&
        sliced.some(
          (je) =>
            je.type === "user" &&
            je.isMeta &&
            typeof je.message.content === "string" &&
            je.message.content.includes(lazyChunkVsw.BRIEF_ENFORCE_SENTINEL),
        );
      if (!any && !J) {
        D = createUserMessage({
          content: `${lazyChunkVsw.BRIEF_ENFORCE_SENTINEL} ${lazyChunkCv3.getBriefEnforceText()}`,
          isMeta: true,
        });
        yield D;
      }
    } catch (error) {
      logForDebugging(`Brief mode enforcement failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let L = null;
  let z = null;
  let G = replyGatePolicy();
  if (
    getQueuedPeerMessageCount &&
    querySource === "sdk" &&
    !toolUseContext.agentId &&
    (G !== undefined ||
      (getQueuedPeerMessageCount.isProjectsReplyGateEnabled() &&
        getQueuedPeerMessageCount.isProjectsReplyMountConnected(toolUseContext.getAppState())))
  )
    try {
      let hearthToolNames = resolveHearthToolNames(toolUseContext.options.tools);
      let Pe = getQueuedPeerMessageCount.evaluateProjectsReplyGate(
        cmd,
        [...assistantMessages, ...toolResults],
        G !== undefined
          ? {
              kind: "policy",
              policy: G,
            }
          : {
              kind: "remote_control",
              toolNames: hearthToolNames,
            },
      );
      switch (Pe.kind) {
        case "answered":
          if (G !== undefined)
            logFeatureOk("projects_reply_gate_policy", {
              person_opened_turn: Pe.personOpened,
              no_reply_only: Pe.noReplyOnly,
            });
          else logFeatureOk("bridge_projects_reply_gate");
          break;
        case "still_silent":
          if (G !== undefined)
            logReplyGatePolicy("still_silent", {
              person_opened_turn: Pe.personOpened,
            });
          else logFeatureBad("bridge_projects_reply_gate", "still_silent");
          break;
        case "skip":
          break;
        case "bounce":
          if (!serverHasAnyTool(toolUseContext.options.tools, G?.terminalTools ?? [hearthToolNames.reply])) {
            if (G !== undefined)
              logReplyGatePolicy("reply_tool_not_in_pool", {
                person_opened_turn: Pe.personOpened,
              });
            else logFeatureBad("bridge_projects_reply_gate", "reply_tool_not_in_pool");
            break;
          }
          if (G !== undefined)
            logFeatureSad("projects_reply_gate_policy", Pe.reason, {
              person_opened_turn: Pe.personOpened,
            });
          else logFeatureSad("bridge_projects_reply_gate", Pe.reason);
          z = createUserMessage({
            content: Pe.text,
            isMeta: true,
          });
          yield z;
          break;
      }
    } catch (error) {
      logForDebugging(`Projects reply gate enforcement failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let ee = null;
  if (toolUseContext.options.requiresStructuredOutput && classifyQuerySource(querySource) !== "auxiliary")
    try {
      let lastRealUserMessageIndex = findLastRealUserMessageIndex(cmd);
      let sliced = cmd.slice(lastRealUserMessageIndex + 1);
      let Ke = hasSuccessfulToolCall([...sliced, ...assistantMessages], STRUCTUREDOUTPUT);
      let J =
        !Ke &&
        sliced.some(
          (je) =>
            je.type === "user" &&
            je.isMeta &&
            typeof je.message.content === "string" &&
            je.message.content.includes(STRUCTURED_OUTPUT_ENFORCE_PREFIX),
        );
      if (!Ke && !J) {
        ee = createUserMessage({
          content: `${STRUCTURED_OUTPUT_ENFORCE_PREFIX} You MUST call the ${STRUCTUREDOUTPUT} tool to complete this request. Call this tool now.`,
          isMeta: true,
        });
        yield ee;
      }
    } catch (error) {
      logForDebugging(`StructuredOutput enforcement failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let V = null;
  if (
    toolUseContext.options.requiresHandback &&
    classifyQuerySource(querySource) !== "auxiliary" &&
    toolUseContext.agentId !== undefined
  )
    try {
      let agentId = toolUseContext.agentId;
      let Pe = toolUseContext.taskRegistry.get(agentId);
      let pendingHandbackReport = getPendingHandbackReport(Pe, agentId);
      let handbackBounces = getSelectableBackgroundTasks(Pe)?.handbackBounces ?? 0;
      pruneSettledChildWork(agentId, toolUseContext.taskRegistry);
      let je = hasPendingChildWork(agentId, toolUseContext.taskRegistry);
      if (
        pendingHandbackReport !== undefined &&
        pendingHandbackReport.length === 0 &&
        !je &&
        handbackBounces < MAX_HANDBACK_ENFORCE_RETRIES
      ) {
        toolUseContext.taskRegistry.update(agentId, (It) => ({
          ...It,
          handbackBounces: handbackBounces + 1,
        }));
        V = createUserMessage({
          content: `${HANDBACK_ENFORCE_PREFIX} Your report has not been delivered. Call ${SUBAGENTHANDBACK}({message: <your full report>}) now; the call ends your run.`,
          isMeta: true,
        });
        yield V;
      }
    } catch (error) {
      logForDebugging(`Subagent hand-back enforcement failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let fe = null;
  if (
    querySource === "sdk" &&
    !toolUseContext.agentId &&
    isResilientGalaxyOn() &&
    toolUseContext.options.tools.some((tool) => toolMatchesName(tool, SEND_USER_FILE_TOOL_NAME))
  )
    try {
      let le = lastTurnReminderState(context.messages);
      switch (le.kind) {
        case "skip":
          break;
        case "remind":
          logFeatureSad("query_unsent_file_reminder", "reminded");
          fe = createUserMessage({
            content: le.text,
            isMeta: true,
          });
          yield fe;
          break;
        case "reminded":
          if (le.sent)
            logFeatureOk("query_unsent_file_reminder", {
              message_length: le.textLength,
            });
          else
            logFeatureSad("query_unsent_file_reminder", "not_sent", {
              message_length: le.textLength,
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
      let le = pendingShellHandOffs(
        cmd.slice(findLastPromptIndex(cmd)),
        assistantMessages,
        toolUseContext.agentId ?? null,
      );
      if (le === undefined) logFeatureSad("skill_inline_command_handoff", "too_much_to_check");
      else if (le.length > 0) logFeatureBad("skill_inline_command_handoff", "not_run");
    } catch (error) {
      logForDebugging(`Skill inline command turn-end check failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let filtered = [D, L, z, ee, V, fe].filter((le) => le !== null);
  let Z = false;
  let re;
  let Re = undefined;
  let se = [...filtered];
  let preventedContinuation = false;
  let U = [];
  let nt = false;
  let activeGoal = toolUseContext.agentId ? undefined : toolUseContext.getAppState().activeGoal;
  let dt;
  let rt;
  try {
    let appState = toolUseContext.getAppState();
    let mode = getToolPermissionContext(toolUseContext).mode;
    let activeGoal_2 = appState.activeGoal;
    let J = !toolUseContext.agentId;
    if (J) clearPendingGoalIdleCheckin(toolUseContext.session.sessionScratch);
    if (activeGoal_2 && J) {
      let visibleBackgroundTasks = getVisibleBackgroundTasks(toolUseContext.taskRegistry.all());
      if (visibleBackgroundTasks.length > 0) {
        re = getSessionStopPromptHooks(toolUseContext.sessionHooksRegistry, getSessionId()).find(
          (we) => we.prompt === activeGoal_2.condition,
        );
        if (re) {
          toolUseContext.sessionHooksRegistry.remove(getSessionId(), "Stop", re);
          logForDebugging("[goal] evaluation deferred \u2014 background work still running");
          dt = "deferred";
          rt = {
            activeAgents: count(visibleBackgroundTasks, isActiveAgentTask),
            activeShells: count(visibleBackgroundTasks, isRunningShellTask),
          };
          let we;
          try {
            let Le = planGoalCheckin(activeGoal_2, visibleBackgroundTasks, Date.now());
            Re = Le.nextGoal;
            we = Le.checkinText;
          } catch (error) {
            logError(error);
            Re = activeGoal_2;
            logFeatureBad("goal_checkin", "plan_failed");
          }
          if (Re !== undefined && Re !== activeGoal_2)
            yield {
              type: "active_goal",
              value: Re,
            };
          if (we !== undefined) {
            let userMessage = createUserMessage({
              content: we,
              isMeta: true,
            });
            se.push(userMessage);
            filtered.push(userMessage);
            yield userMessage;
          }
        }
      } else if (activeGoal_2.deferredSince !== undefined) {
        let { deferredSince, checkinCount, lastDeferralPassAt, ...Ct } = activeGoal_2;
        yield {
          type: "active_goal",
          value: Ct,
        };
      }
    }
    let je = (hook) => {
      if (!hook) return;
      return (toolUseContext.sessionHooksRegistry.get(getSessionId(), "Stop").get("Stop") ?? [])
        .flatMap((Le) => Le.hooks)
        .some((Le) => isHookEqual(Le, hook))
        ? hook
        : undefined;
    };
    let It = executeStopHooks(
      mode,
      toolUseContext.abortController.signal,
      undefined,
      stopHookActive,
      toolUseContext.agentId,
      toolUseContext,
      context.messages,
      toolUseContext.agentType,
      "blockable_turn_end",
    );
    let toolUseID = "";
    let hookCount = 0;
    let stopReason = "";
    let hasOutput = false;
    let hookErrors = [];
    let hookAdditionalContext = [];
    let hookInfos = [];
    let it = false;
    for await (let Me of It) {
      if (Me.message) {
        yield Me.message;
        if (isHookBlockingErrorAttachment(Me.message) && isJoyfulGlobeOn()) se.push(Me.message);
        if (Me.message.type === "progress" && Me.message.toolUseID) {
          toolUseID = Me.message.toolUseID;
          hookCount++;
          let we = Me.message.data;
          if (we.command)
            hookInfos.push({
              command: we.command,
              promptText: we.promptText,
            });
        }
        if (Me.message.type === "attachment") {
          let attachment = Me.message.attachment;
          if (
            "hookEvent" in attachment &&
            (attachment.hookEvent === "Stop" || attachment.hookEvent === "SubagentStop")
          ) {
            if (
              activeGoal &&
              Me.hook?.prompt === activeGoal.condition &&
              (attachment.type === "hook_non_blocking_error" ||
                attachment.type === "hook_error_during_execution")
            ) {
              dt = "error";
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
              let Le = je(Me.hook);
              if (attachment.hookEvent === "Stop" && Le) {
                toolUseContext.sessionHooksRegistry.remove(getSessionId(), "Stop", Le);
                let activeGoal = toolUseContext.getAppState().activeGoal;
                if (activeGoal?.condition === Le.prompt) {
                  let iterations = activeGoal.iterations + 1;
                  let durationMs = Date.now() - activeGoal.setAt;
                  let tokens = getTotalOutputTokens() - activeGoal.tokensAtStart;
                  yield {
                    type: "active_goal",
                    value: undefined,
                  };
                  dt = Me.impossible ? "impossible" : "met";
                  if (Me.impossible) {
                    yield createAttachmentMessage_2({
                      type: "goal_status",
                      met: false,
                      failed: true,
                      condition: Le.prompt,
                      reason: Me.stopReason,
                      iterations,
                      durationMs,
                      tokens,
                    });
                    logEvent("tengu_goal_failed", {
                      promptLength: Le.prompt.length,
                      reasonLength: Me.stopReason?.length ?? 0,
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
                      condition: Le.prompt,
                      reason: Me.stopReason,
                      iterations,
                      durationMs,
                      tokens,
                    });
                    logEvent("tengu_goal_achieved", {
                      promptLength: Le.prompt.length,
                      iterations,
                      durationMs,
                      tokens,
                      origin: fromEnumOpt(activeGoal.origin),
                    });
                    logFeatureOk("goal_met");
                    toolUseContext.sessionState?.notifyMetadataChanged({
                      goal: {
                        condition: Le.prompt,
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
                (st) => st.command === attachment.command && st.durationMs === undefined,
              );
              if (found) found.durationMs = attachment.durationMs;
            }
          }
        }
      }
      if (Me.timedOut) {
        if (activeGoal && Me.hook?.prompt === activeGoal.condition) {
          dt = "cancelled";
          logFeatureSad("goal_met", "evaluator_timeout");
        }
        continue;
      }
      if (Me.blockingError) {
        let userMessage = createUserMessage({
          content: getStopHookMessage(Me.blockingError),
          isMeta: true,
        });
        se.push(userMessage);
        yield userMessage;
        hasOutput = true;
        let Le = je(Me.hook);
        let activeGoal = toolUseContext.getAppState().activeGoal;
        if (Le && activeGoal?.condition === Le.prompt) {
          dt = "not_met";
          yield {
            type: "active_goal",
            value: {
              ...activeGoal,
              iterations: activeGoal.iterations + 1,
              lastReason: Me.stopReason,
            },
          };
          yield createAttachmentMessage_2({
            type: "goal_status",
            met: false,
            condition: Le.prompt,
            reason: Me.stopReason,
          });
        } else {
          hookErrors.push(Me.blockingError.blockingError);
          it = true;
        }
      }
      if (Me.additionalContexts && Me.additionalContexts.length > 0) {
        let we = toolUseContext.agentId ? "SubagentStop" : "Stop";
        let attachmentMessage = createAttachmentMessage_2({
          type: "hook_additional_context",
          content: Me.additionalContexts,
          hookName: we,
          toolUseID,
          hookEvent: we,
        });
        if (!isBareModeAttachmentDropped(attachmentMessage)) se.push(attachmentMessage);
        yield attachmentMessage;
        hasOutput = true;
        hookAdditionalContext.push(...Me.additionalContexts);
      }
      if (Me.preventContinuation) {
        preventedContinuation = true;
        stopReason = Me.stopReason || "Stop hook prevented continuation";
        yield createAttachmentMessage_2({
          type: "hook_stopped_continuation",
          message: stopReason,
          hookName: "Stop",
          toolUseID,
          hookEvent: "Stop",
        });
      }
      if (toolUseContext.abortController.signal.aborted) {
        logEvent("tengu_pre_stop_hooks_cancelled", {
          queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
        });
        if (!isSilentAbortReason(toolUseContext.abortController.signal.reason))
          yield createUserInterruptionMessage({
            toolUse: false,
            interruptedByShutdown: shutdownInterruptStamp(toolUseContext.abortController.signal),
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
      yield* runTurnEndReactions(toolUseContext, context.messages, {
        stopHookActive,
      });
      return {
        blockingErrors: [],
        preventContinuation: true,
      };
    }
    if (se.length > 0) {
      if (it)
        logHookPushbackEvent({
          pushback: {
            hookEvent: toolUseContext.agentId ? "subagent_stop" : "stop",
          },
          permissionMode: mode,
          agentContext: toolUseContext.agentContext,
        });
      return {
        blockingErrors: se,
        preventContinuation: false,
        goalPass: dt,
      };
    }
    let At = isTeammateAgentContext(
      toolUseContext.agentContext,
      toolUseContext.taskRegistry,
      toolUseContext.agentId,
    );
    if (At !== undefined && toolUseContext.agentId === At.agentId) {
      let { teammateName, teamName } = At;
      let Le;
      let st = "";
      let taskListId = getTaskListId();
      let filtered = (await listTasks(taskListId, toolUseContext.storageV5)).filter(
        (Mt) => Mt.status === "in_progress" && Mt.owner === teammateName,
      );
      for (let Mt of filtered) {
        let bo = executeTaskCompletedHooks(
          Mt.id,
          Mt.subject,
          Mt.description,
          teammateName,
          teamName,
          mode,
          toolUseContext.abortController.signal,
          undefined,
          toolUseContext,
        );
        for await (let Jt of bo) {
          if (Jt.message) {
            if (Jt.message.type === "progress" && Jt.message.toolUseID) st = Jt.message.toolUseID;
            yield Jt.message;
            if (isHookBlockingErrorAttachment(Jt.message) && isJoyfulGlobeOn()) U.push(Jt.message);
          }
          if (Jt.blockingError) {
            let userMessage = createUserMessage({
              content: getTaskCompletedHookMessage(Jt.blockingError),
              isMeta: true,
            });
            U.push(userMessage);
            yield userMessage;
          }
          if (Jt.preventContinuation) {
            nt = true;
            Le = Jt.stopReason || "TaskCompleted hook prevented continuation";
            yield createAttachmentMessage_2({
              type: "hook_stopped_continuation",
              message: Le,
              hookName: "TaskCompleted",
              toolUseID: st,
              hookEvent: "TaskCompleted",
            });
          }
          if (toolUseContext.abortController.signal.aborted)
            return {
              blockingErrors: [],
              preventContinuation: true,
            };
        }
      }
      let yo = executeTeammateIdleHooks(
        teammateName,
        teamName,
        mode,
        toolUseContext.abortController.signal,
        undefined,
        toolUseContext,
      );
      for await (let Mt of yo) {
        if (Mt.message) {
          if (Mt.message.type === "progress" && Mt.message.toolUseID) st = Mt.message.toolUseID;
          yield Mt.message;
          if (isHookBlockingErrorAttachment(Mt.message) && isJoyfulGlobeOn()) U.push(Mt.message);
        }
        if (Mt.blockingError) {
          let userMessage = createUserMessage({
            content: getTeammateIdleHookMessage(Mt.blockingError),
            isMeta: true,
          });
          U.push(userMessage);
          yield userMessage;
        }
        if (Mt.preventContinuation) {
          nt = true;
          Le = Mt.stopReason || "TeammateIdle hook prevented continuation";
          yield createAttachmentMessage_2({
            type: "hook_stopped_continuation",
            message: Le,
            hookName: "TeammateIdle",
            toolUseID: st,
            hookEvent: "TeammateIdle",
          });
        }
        if (toolUseContext.abortController.signal.aborted)
          return {
            blockingErrors: [],
            preventContinuation: true,
          };
      }
      if (nt) {
        yield* runTurnEndReactions(toolUseContext, context.messages, {
          stopHookActive,
        });
        return {
          blockingErrors: [],
          preventContinuation: true,
        };
      }
      if (U.length > 0)
        return {
          blockingErrors: U,
          preventContinuation: false,
          goalPass: dt,
        };
    }
    yield* runTurnEndReactions(toolUseContext, context.messages, {
      stopHookActive,
    });
    return {
      blockingErrors: [],
      preventContinuation: false,
      goalPass: dt,
    };
  } catch (error) {
    if (
      isAbortError(error) &&
      (toolUseContext.abortController.signal.aborted || error instanceof StreamClosedAbortError)
    ) {
      logForDebugging("Stop hook cancelled (abort or stream teardown)");
      if (!toolUseContext.abortController.signal.aborted) {
        let Ke = [...se, ...U];
        let J = preventedContinuation || nt;
        if (J || Ke.length === 0)
          yield* runTurnEndReactions(toolUseContext, context.messages, {
            stopHookActive,
          });
        return {
          blockingErrors: Ke,
          preventContinuation: J,
        };
      }
      return {
        blockingErrors: [],
        preventContinuation: false,
      };
    }
    Z = true;
    let duration = Date.now() - now;
    logEvent("tengu_stop_hook_error", {
      duration,
      queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
      queryDepth: toolUseContext.queryTracking?.depth,
    });
    yield createSystemMessage(`Stop hook failed: ${errorMessage(error)}`, "warning");
    if (filtered.length === 0)
      yield* runTurnEndReactions(toolUseContext, context.messages, {
        stopHookActive,
      });
    return {
      blockingErrors: filtered,
      preventContinuation: false,
      goalPass: activeGoal && (dt === undefined || dt === "not_met") ? "error" : dt,
    };
  } finally {
    if (re) toolUseContext.sessionHooksRegistry.add(getSessionId(), "Stop", "", re);
    if (Re !== undefined && !toolUseContext.options.isNonInteractiveSession) {
      let { getAppState, setAppState, taskRegistry, session, messageQueue } = toolUseContext;
      try {
        scheduleGoalIdleCheckin({
          goal: Re,
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
    if (Z) logFeatureBad("hook_stop_handler", "hook_stop_handler_failed");
    else logFeatureOk("hook_stop_handler");
    if (activeGoal) {
      let aborted = toolUseContext.abortController.signal.aborted;
      let Pe = dt === "met" || dt === "not_met" || dt === "impossible";
      logEvent("tengu_goal_evaluated", {
        outcome: fromEnum(dt ?? (Z ? "error" : aborted ? "cancelled" : "absent")),
        durationMs: Date.now() - now,
        iterations: activeGoal.iterations + (Pe ? 1 : 0),
        parentAborted: aborted,
        origin: fromEnumOpt(activeGoal.origin),
        ...rt,
      });
    }
  }
}
//@ chunk-ha3km179.js:98580-99181 placement
/**
 * 运行 turn_end_reactions hooks。
 */
async function* runTurnEndReactions(e, n, { stopHookActive }) {
  try {
    let s = executeStopHooks(
      getToolPermissionContext(e).mode,
      e.abortController.signal,
      undefined,
      stopHookActive,
      e.agentId,
      e,
      n,
      e.agentType,
      "turn_end_reactions",
    );
    for await (let h of s) {
      if (h.message) yield h.message;
      if (h.blockingError || h.preventContinuation)
        logForDebugging(
          `[stop-hooks] Turn-end reaction hook block discarded: ${h.blockingError?.blockingError ?? h.stopReason ?? "preventContinuation"}`,
        );
    }
  } catch (error) {
    if (
      isAbortError(error) &&
      (e.abortController.signal.aborted || error instanceof StreamClosedAbortError)
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
