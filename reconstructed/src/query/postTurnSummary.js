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
import { yd, logOperation, jr, xo, Io } from "../utils/messageQueueManager.js";
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
import { i8r } from "../utils/sessionState.js";
import { withTimeout } from "../utils/sleep.js";
import { logEvent } from "../services/analytics/index.js";
import { logError } from "../utils/log.js";
import { isMainAgent, isTeammateAgentContext } from "../utils/agentContext.js";
import { saveCacheSafeParams, createCacheSafeParams } from "../utils/forkedAgent.js";
import { isBareMode, isEnvDefinedFalsy } from "../utils/envUtils.js";
import { tUt } from "../services/PromptSuggestion/backOff.js";
import { executePromptSuggestion } from "../services/PromptSuggestion/promptSuggestion.js";
import { isExtractModeActive } from "../memdir/paths.js";
import { getHostedPostTurnMemoryConfig } from "../memdir/memoryTool.js";
import { DOs } from "../services/autoDream/autoDream.js";
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
import { wd, getVisibleBackgroundTasks, createQueueDelivery } from "./turnEndReasons.js";
import { resolveHearthToolNames, m8 } from "../services/mcp/ccrMetaMcp.js";
import { Ur, si, lastTurnReminderState, Nr } from "./toolDrain.js";
import { STRUCTUREDOUTPUT } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import {
  getPendingHandbackReport,
  getSelectableBackgroundTasks,
  Ngi,
  Hgi,
} from "../tools/AgentTool/handbackReport.js";
import { pruneSettledChildWork, hasPendingChildWork } from "../tasks/LocalAgentTask/childWork.js";
import { SUBAGENTHANDBACK } from "../tools/AgentTool/constants.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";
import { qzo, jXs, findLastPromptIndex } from "../utils/promptShellExecution.js";
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
import { ii } from "./stopHooks.js";
import { isBareModeAttachmentDropped } from "../utils/messages/apiNormalization.js";
import { ye } from "../utils/startupMarks.js";
import { isSilentAbortReason, shutdownInterruptStamp } from "../utils/abortController.js";
import { getShortcutDisplay } from "../keybindings/shortcutFormat.js";
import { logHookPushbackEvent } from "../services/tools/toolDecisionTelemetry.js";
import { getTaskListId, listTasks } from "../utils/tasks.js";

//@ chunk-ha3km179.js:79310-79416 placement
var extractMemoriesModule = require("./chunk-aghtagt4.js"),
  agentJobStateModule = require("./chunk-wd9kxbpn.js"),
  postTurnSummaryModule = require("./chunk-e321p3vc.js");
/**
 * 主线程回合结束后生成并发布回合摘要（按检测到的界面发往不同接收端）。
 */
//@ chunk-ha3km179.js:82467-85391 placement
async function* generatePostTurnSummary(e, n, r, s, h) {
  if (
    !e ||
    classifyQuerySource(h) !== "main" ||
    s.agentId ||
    (isTerminalShutdown() && !s.abortController.signal.aborted)
  )
    return;
  let y = postTurnSummaryModule,
    detectSurfaces = y.detectSurfaces(
      isStorageV5Enabled() && s.storageV5 ? await y.watchedForSurfaces(s.storageV5) : void 0,
    ),
    sinksFor = y.sinksFor(detectSurfaces),
    engineFor = y.engineFor(sinksFor);
  if (!engineFor) return;
  e.lastEmittedDetail = "";
  let postTurnSummary = s.getAppState().postTurnSummary;
  if (sinksFor.has("summary")) yield { type: "post_turn_summary", value: null };
  let projectsRecapEnabled = y.projectsRecapEnabled(s.options.tools),
    P,
    Q = lit("none"),
    D = sinksFor.has("summary") ? yd(n) : void 0;
  e.onClassified = (V, fe) => {
    if (fe || !sinksFor.has("summary")) return;
    if (P?.superseded) {
      (logForDebugging(
        "[classifier] dropped a late end-of-turn summary: a newer session status was written or cleared while it was being generated",
      ),
        (Q = lit("dropped_superseded")));
      return;
    }
    if (V.source === "no-text-turn" && V.detail === "") {
      if (postTurnSummary)
        (s.setAppState((re) =>
          re.postTurnSummary === postTurnSummary ? re : { ...re, postTurnSummary: postTurnSummary },
        ),
          publishPostTurnSummary(
            s.sessionState,
            postTurnSummary,
            P === void 0 ? void 0 : { turnEndVerdict: !0 },
          ),
          (Q = lit("republished_prior")));
      return;
    }
    let classifiedToPostTurnSummary = y.classifiedToPostTurnSummary(V, {
        projectsRecap: projectsRecapEnabled,
      }),
      Z = V.source === "no-text-turn" ? postTurnSummary?.standing : D;
    if (classifiedToPostTurnSummary.status_category === "blocked" && Z !== void 0)
      classifiedToPostTurnSummary.standing = Z;
    if (V.source === "no-text-turn") {
      if (
        ((classifiedToPostTurnSummary.recent_action = postTurnSummary?.recent_action ?? ""),
        postTurnSummary?.description !== void 0)
      )
        classifiedToPostTurnSummary.description = postTurnSummary.description;
      if (postTurnSummary?.reply !== void 0) classifiedToPostTurnSummary.reply = postTurnSummary.reply;
    }
    (s.setAppState((re) =>
      re.postTurnSummary?.status_category === classifiedToPostTurnSummary.status_category &&
      re.postTurnSummary.status_detail === classifiedToPostTurnSummary.status_detail &&
      re.postTurnSummary.needs_action === classifiedToPostTurnSummary.needs_action &&
      re.postTurnSummary.recent_action === classifiedToPostTurnSummary.recent_action &&
      re.postTurnSummary.description === classifiedToPostTurnSummary.description &&
      re.postTurnSummary.reply === classifiedToPostTurnSummary.reply &&
      re.postTurnSummary.standing === classifiedToPostTurnSummary.standing
        ? re
        : { ...re, postTurnSummary: classifiedToPostTurnSummary },
    ),
      publishPostTurnSummary(
        s.sessionState,
        classifiedToPostTurnSummary,
        P === void 0 ? void 0 : { turnEndVerdict: !0 },
      ),
      (Q = lit("published")),
      enqueueTaskNotification({
        type: "system",
        subtype: "post_turn_summary",
        summarizes_uuid: r.at(-1)?.uuid ?? "",
        status_category: classifiedToPostTurnSummary.status_category,
        status_detail: classifiedToPostTurnSummary.status_detail,
        needs_action: classifiedToPostTurnSummary.needs_action,
      }));
  };
  let L = getMainThreadAgentType(),
    z = L
      ? s.options.agentDefinitions.activeAgents.find((activeAgent) => activeAgent.agentType === L)
      : void 0,
    filtered = n.filter((V) => V.type === "assistant");
  if (projectsRecapEnabled) {
    let V = collectThreadRows(n);
    if (((e.latestAsk = ""), V)) agentJobStateModule.captureLatestAsk(e, V);
  } else {
    let latestRealUserAsk = agentJobStateModule.findLatestRealUserAsk(n);
    if (latestRealUserAsk) agentJobStateModule.captureLatestAsk(e, latestRealUserAsk);
  }
  if (
    ((e.scriptPosts = s.toolState.get(ReplCallNoteBuffer).take()),
    (e.quietTurnKeepsAsk =
      sinksFor.has("summary") &&
      postTurnSummary?.standing !== void 0 &&
      logOperation(postTurnSummary.standing, n)),
    e.quietTurnKeepsAsk)
  )
    logFeatureOk("chat_relay_standing_ask");
  let ee = agentJobStateModule
    .classifyAndPush(
      e,
      getOwnJobShortId(),
      z,
      "",
      filtered,
      hasActiveAgentTasks(s.taskRegistry.all()),
      engineFor,
      detectSurfaces,
      !1,
      projectsRecapEnabled,
    )
    .catch((V) => {
      logForDebugging(`[classifier] error: ${errorMessage(V)}`, { level: "error" });
    });
  if (isBgSession() || h === "sdk") {
    let sessionState = s.sessionState,
      fe = detectSurfaces.has("ccr") && isRemoteCowork(),
      ie = isClaudeAiChatOrigin(),
      Z = fe && sessionState !== void 0 && !ie,
      re = Z ? 0 : i8r,
      now = Date.now();
    if (Z) P = sessionState.holdTurnEndSummary(ee, performance.now() + i8r);
    else await withTimeout(ee, i8r, "classifier write timed out").catch(() => {});
    let now_2 = Date.now();
    if (h === "sdk")
      ee.then(() => {
        logEvent("tengu_turn_end_classifier_hold", {
          hold_cap_ms: re,
          held_ms: now_2 - now,
          summary_after_turn_ms: Math.max(0, Date.now() - now_2),
          cowork_ccr: fe,
          engine: fromEnum(engineFor),
          summary_outcome: Q,
          session_origin_chat: ie,
        });
      });
  }
}
/**
 * 若有未完成的回合结束摘要且条件满足，等待其完成（错误交给处理函数）。
 */
//@ chunk-ha3km179.js:85391-85527 placement
function waitForTurnEndSummary(e, n) {
  try {
    if (!e?.turnEndSummaryOutstanding() || !n()) return;
    return e.waitForTurnEndSummary()?.catch(Cd);
  } catch (error) {
    Cd(error);
    return;
  }
}
//@ chunk-ha3km179.js:85527-85547 placement
function Cd(e) {
  logError(e);
}
/**
 * 回合结束时运行 Stop hooks 与记忆提取，返回阻断错误与是否阻止继续。
 */
//@ chunk-ha3km179.js:85547-98580 placement
async function* runStopHooks(e, n, r, s, h, y, S, M, R, T, w = []) {
  if (isTerminalShutdown() && !y.abortController.signal.aborted)
    return { blockingErrors: [], preventContinuation: !1 };
  if (y.options.settingsHooksOff || S === "agent_summary")
    return { blockingErrors: [], preventContinuation: !1 };
  let now = Date.now(),
    Q = {
      messages: [...e, ...n, ...w],
      systemPrompt: r,
      userContext: s,
      systemContext: h,
      toolUseContext: y,
      querySource: S,
      stickyBetas: R,
    };
  if (isMainAgent(y.agentContext) && (S.startsWith("repl_main_thread") || S === "sdk"))
    saveCacheSafeParams(createCacheSafeParams(Q));
  if ((yield* generatePostTurnSummary(T, Q.messages, n, y, S), !isBareMode())) {
    if (!isEnvDefinedFalsy(process.env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION))
      if (tUt() && isMainAgent(y.agentContext)) y.session.promptSuggestion.arm();
      else executePromptSuggestion(Q, T?.lastResult);
    if (
      !y.agentId &&
      (isExtractModeActive() || extractMemoriesModule.isLaptopExtractActive(y.session.host))
    ) {
      let executeExtractMemories = extractMemoriesModule.executeExtractMemories(Q, y.appendSystemMessage);
      if (getHostedPostTurnMemoryConfig()?.sync || extractMemoriesModule.isLaptopExtractSync(y.session.host))
        try {
          await executeExtractMemories;
        } catch (error) {
          logForDebugging(`extractMemories (sync) failed: ${error}`);
        }
    }
    if (!y.agentId) DOs(Q, y.appendSystemMessage);
  }
  if (!y.agentId)
    try {
      yield* cleanupComputerUseAfterTurn(y);
    } catch {}
  let D = null;
  if (
    (S.startsWith("repl_main_thread") || S === "sdk") &&
    jr.isBriefEnabled() &&
    !env.DISABLE_BRIEF_MODE_STOP_HOOK &&
    !y.agentId &&
    y.options.tools.some((tool) => toolMatchesName(tool, xo.BRIEF_TOOL_NAME))
  )
    try {
      let le = findLastRealUserMessageIndex(e),
        sliced = e.slice(le + 1),
        any = [...sliced, ...n].some(
          (je) =>
            je.type === "assistant" &&
            je.message.content.some(
              (It) =>
                It.type === "tool_use" &&
                (It.name === xo.BRIEF_TOOL_NAME || It.name === xo.LEGACY_BRIEF_TOOL_NAME),
            ),
        ),
        J =
          !any &&
          sliced.some(
            (je) =>
              je.type === "user" &&
              je.isMeta &&
              typeof je.message.content === "string" &&
              je.message.content.includes(xo.BRIEF_ENFORCE_SENTINEL),
          );
      if (!any && !J)
        ((D = createUserMessage({
          content: `${xo.BRIEF_ENFORCE_SENTINEL} ${jr.getBriefEnforceText()}`,
          isMeta: !0,
        })),
          yield D);
    } catch (error) {
      logForDebugging(`Brief mode enforcement failed: ${errorMessage(error)}`, { level: "error" });
    }
  let L = null,
    z = null,
    G = wd();
  if (
    Io &&
    S === "sdk" &&
    !y.agentId &&
    (G !== void 0 || (Io.isProjectsReplyGateEnabled() && Io.isProjectsReplyMountConnected(y.getAppState())))
  )
    try {
      let le = resolveHearthToolNames(y.options.tools),
        evaluateProjectsReplyGate = Io.evaluateProjectsReplyGate(
          e,
          [...n, ...w],
          G !== void 0 ? { kind: "policy", policy: G } : { kind: "remote_control", toolNames: le },
        );
      switch (evaluateProjectsReplyGate.kind) {
        case "answered":
          if (G !== void 0)
            logFeatureOk("projects_reply_gate_policy", {
              person_opened_turn: evaluateProjectsReplyGate.personOpened,
              no_reply_only: evaluateProjectsReplyGate.noReplyOnly,
            });
          else logFeatureOk("bridge_projects_reply_gate");
          break;
        case "still_silent":
          if (G !== void 0)
            Ur("still_silent", { person_opened_turn: evaluateProjectsReplyGate.personOpened });
          else logFeatureBad("bridge_projects_reply_gate", "still_silent");
          break;
        case "skip":
          break;
        case "bounce":
          if (!m8(y.options.tools, G?.terminalTools ?? [le.reply])) {
            if (G !== void 0)
              Ur("reply_tool_not_in_pool", { person_opened_turn: evaluateProjectsReplyGate.personOpened });
            else logFeatureBad("bridge_projects_reply_gate", "reply_tool_not_in_pool");
            break;
          }
          if (G !== void 0)
            logFeatureSad("projects_reply_gate_policy", evaluateProjectsReplyGate.reason, {
              person_opened_turn: evaluateProjectsReplyGate.personOpened,
            });
          else logFeatureSad("bridge_projects_reply_gate", evaluateProjectsReplyGate.reason);
          ((z = createUserMessage({ content: evaluateProjectsReplyGate.text, isMeta: !0 })), yield z);
          break;
      }
    } catch (error) {
      logForDebugging(`Projects reply gate enforcement failed: ${errorMessage(error)}`, { level: "error" });
    }
  let ee = null;
  if (y.options.requiresStructuredOutput && classifyQuerySource(S) !== "auxiliary")
    try {
      let le = findLastRealUserMessageIndex(e),
        sliced = e.slice(le + 1),
        Ke = hasSuccessfulToolCall([...sliced, ...n], STRUCTUREDOUTPUT),
        J =
          !Ke &&
          sliced.some(
            (je) =>
              je.type === "user" &&
              je.isMeta &&
              typeof je.message.content === "string" &&
              je.message.content.includes(STRUCTURED_OUTPUT_ENFORCE_PREFIX),
          );
      if (!Ke && !J)
        ((ee = createUserMessage({
          content: `${STRUCTURED_OUTPUT_ENFORCE_PREFIX} You MUST call the ${STRUCTUREDOUTPUT} tool to complete this request. Call this tool now.`,
          isMeta: !0,
        })),
          yield ee);
    } catch (error) {
      logForDebugging(`StructuredOutput enforcement failed: ${errorMessage(error)}`, { level: "error" });
    }
  let V = null;
  if (y.options.requiresHandback && classifyQuerySource(S) !== "auxiliary" && y.agentId !== void 0)
    try {
      let agentId = y.agentId,
        Pe = y.taskRegistry.get(agentId),
        Ke = getPendingHandbackReport(Pe, agentId),
        J = getSelectableBackgroundTasks(Pe)?.handbackBounces ?? 0;
      pruneSettledChildWork(agentId, y.taskRegistry);
      let je = hasPendingChildWork(agentId, y.taskRegistry);
      if (Ke !== void 0 && Ke.length === 0 && !je && J < Ngi)
        (y.taskRegistry.update(agentId, (It) => ({ ...It, handbackBounces: J + 1 })),
          (V = createUserMessage({
            content: `${Hgi} Your report has not been delivered. Call ${SUBAGENTHANDBACK}({message: <your full report>}) now; the call ends your run.`,
            isMeta: !0,
          })),
          yield V);
    } catch (error) {
      logForDebugging(`Subagent hand-back enforcement failed: ${errorMessage(error)}`, { level: "error" });
    }
  let fe = null;
  if (
    S === "sdk" &&
    !y.agentId &&
    si() &&
    y.options.tools.some((tool) => toolMatchesName(tool, SEND_USER_FILE_TOOL_NAME))
  )
    try {
      let le = lastTurnReminderState(Q.messages);
      switch (le.kind) {
        case "skip":
          break;
        case "remind":
          (logFeatureSad("query_unsent_file_reminder", "reminded"),
            (fe = createUserMessage({ content: le.text, isMeta: !0 })),
            yield fe);
          break;
        case "reminded":
          if (le.sent) logFeatureOk("query_unsent_file_reminder", { message_length: le.textLength });
          else logFeatureSad("query_unsent_file_reminder", "not_sent", { message_length: le.textLength });
          break;
      }
    } catch (error) {
      logForDebugging(`Unsent file reminder check failed: ${errorMessage(error)}`, { level: "error" });
    }
  if (classifyQuerySource(S) !== "auxiliary" && qzo())
    try {
      let le = jXs(e.slice(findLastPromptIndex(e)), n, y.agentId ?? null);
      if (le === void 0) logFeatureSad("skill_inline_command_handoff", "too_much_to_check");
      else if (le.length > 0) logFeatureBad("skill_inline_command_handoff", "not_run");
    } catch (error) {
      logForDebugging(`Skill inline command turn-end check failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  let filtered = [D, L, z, ee, V, fe].filter((le) => le !== null),
    Z = !1,
    re,
    Re = void 0,
    se = [...filtered],
    Te = !1,
    U = [],
    nt = !1,
    bt = y.agentId ? void 0 : y.getAppState().activeGoal,
    dt,
    rt;
  try {
    let appState = y.getAppState(),
      mode = getToolPermissionContext(y).mode,
      activeGoal = appState.activeGoal,
      J = !y.agentId;
    if (J) clearPendingGoalIdleCheckin(y.session.sessionScratch);
    if (activeGoal && J) {
      let Me = getVisibleBackgroundTasks(y.taskRegistry.all());
      if (Me.length > 0) {
        if (
          ((re = getSessionStopPromptHooks(y.sessionHooksRegistry, getSessionId()).find(
            (we) => we.prompt === activeGoal.condition,
          )),
          re)
        ) {
          (y.sessionHooksRegistry.remove(getSessionId(), "Stop", re),
            logForDebugging("[goal] evaluation deferred \u2014 background work still running"),
            (dt = "deferred"),
            (rt = {
              activeAgents: count(Me, isActiveAgentTask),
              activeShells: count(Me, isRunningShellTask),
            }));
          let we;
          try {
            let Le = planGoalCheckin(activeGoal, Me, Date.now());
            ((Re = Le.nextGoal), (we = Le.checkinText));
          } catch (error) {
            (logError(error), (Re = activeGoal), logFeatureBad("goal_checkin", "plan_failed"));
          }
          if (Re !== void 0 && Re !== activeGoal) yield { type: "active_goal", value: Re };
          if (we !== void 0) {
            let Le = createUserMessage({ content: we, isMeta: !0 });
            (se.push(Le), filtered.push(Le), yield Le);
          }
        }
      } else if (activeGoal.deferredSince !== void 0) {
        let {
          deferredSince: deferredSince,
          checkinCount: checkinCount,
          lastDeferralPassAt: lastDeferralPassAt,
          ...Ct
        } = activeGoal;
        yield { type: "active_goal", value: Ct };
      }
    }
    let je = (Me) => {
        if (!Me) return;
        return (y.sessionHooksRegistry.get(getSessionId(), "Stop").get("Stop") ?? [])
          .flatMap((Le) => Le.hooks)
          .some((Le) => isHookEqual(Le, Me))
          ? Me
          : void 0;
      },
      It = executeStopHooks(
        mode,
        y.abortController.signal,
        void 0,
        M,
        y.agentId,
        y,
        Q.messages,
        y.agentType,
        "blockable_turn_end",
      ),
      go = "",
      oe = 0,
      ht = "",
      ut = !1,
      kt = [],
      Gt = [],
      Qt = [],
      it = !1;
    for await (let Me of It) {
      if (Me.message) {
        if ((yield Me.message, ii(Me.message) && Nr())) se.push(Me.message);
        if (Me.message.type === "progress" && Me.message.toolUseID) {
          ((go = Me.message.toolUseID), oe++);
          let we = Me.message.data;
          if (we.command) Qt.push({ command: we.command, promptText: we.promptText });
        }
        if (Me.message.type === "attachment") {
          let attachment = Me.message.attachment;
          if (
            "hookEvent" in attachment &&
            (attachment.hookEvent === "Stop" || attachment.hookEvent === "SubagentStop")
          ) {
            if (
              bt &&
              Me.hook?.prompt === bt.condition &&
              (attachment.type === "hook_non_blocking_error" ||
                attachment.type === "hook_error_during_execution")
            )
              ((dt = "error"), logFeatureSad("goal_met", "evaluator_error"));
            if (attachment.type === "hook_non_blocking_error")
              (kt.push(attachment.stderr || `Exit code ${attachment.exitCode}`), (ut = !0));
            else if (attachment.type === "hook_error_during_execution")
              (kt.push(attachment.content), (ut = !0));
            else if (attachment.type === "hook_success") {
              if (
                (attachment.stdout && attachment.stdout.trim()) ||
                (attachment.stderr && attachment.stderr.trim())
              )
                ut = !0;
              let Le = je(Me.hook);
              if (attachment.hookEvent === "Stop" && Le) {
                y.sessionHooksRegistry.remove(getSessionId(), "Stop", Le);
                let activeGoal = y.getAppState().activeGoal;
                if (activeGoal?.condition === Le.prompt) {
                  let Ct = activeGoal.iterations + 1,
                    jo = Date.now() - activeGoal.setAt,
                    mo = getTotalOutputTokens() - activeGoal.tokensAtStart;
                  if (
                    (yield { type: "active_goal", value: void 0 },
                    (dt = Me.impossible ? "impossible" : "met"),
                    Me.impossible)
                  )
                    (yield createAttachmentMessage_2({
                      type: "goal_status",
                      met: !1,
                      failed: !0,
                      condition: Le.prompt,
                      reason: Me.stopReason,
                      iterations: Ct,
                      durationMs: jo,
                      tokens: mo,
                    }),
                      logEvent("tengu_goal_failed", {
                        promptLength: Le.prompt.length,
                        reasonLength: Me.stopReason?.length ?? 0,
                        iterations: Ct,
                        durationMs: jo,
                        tokens: mo,
                        origin: fromEnumOpt(activeGoal.origin),
                      }),
                      logFeatureBad("goal_met", "impossible"));
                  else
                    (yield createAttachmentMessage_2({
                      type: "goal_status",
                      met: !0,
                      condition: Le.prompt,
                      reason: Me.stopReason,
                      iterations: Ct,
                      durationMs: jo,
                      tokens: mo,
                    }),
                      logEvent("tengu_goal_achieved", {
                        promptLength: Le.prompt.length,
                        iterations: Ct,
                        durationMs: jo,
                        tokens: mo,
                        origin: fromEnumOpt(activeGoal.origin),
                      }),
                      logFeatureOk("goal_met"),
                      y.sessionState?.notifyMetadataChanged({
                        goal: {
                          condition: Le.prompt,
                          set_at: activeGoal.setAt,
                          iterations: Ct,
                          last_reason: null,
                          met: !0,
                        },
                      }));
                }
              }
            }
            if ("durationMs" in attachment && "command" in attachment) {
              let found = Qt.find((st) => st.command === attachment.command && st.durationMs === void 0);
              if (found) found.durationMs = attachment.durationMs;
            }
          }
        }
      }
      if (Me.timedOut) {
        if (bt && Me.hook?.prompt === bt.condition)
          ((dt = "cancelled"), logFeatureSad("goal_met", "evaluator_timeout"));
        continue;
      }
      if (Me.blockingError) {
        let we = createUserMessage({ content: getStopHookMessage(Me.blockingError), isMeta: !0 });
        (se.push(we), yield we, (ut = !0));
        let Le = je(Me.hook),
          activeGoal = y.getAppState().activeGoal;
        if (Le && activeGoal?.condition === Le.prompt)
          ((dt = "not_met"),
            yield {
              type: "active_goal",
              value: { ...activeGoal, iterations: activeGoal.iterations + 1, lastReason: Me.stopReason },
            },
            yield createAttachmentMessage_2({
              type: "goal_status",
              met: !1,
              condition: Le.prompt,
              reason: Me.stopReason,
            }));
        else (kt.push(Me.blockingError.blockingError), (it = !0));
      }
      if (Me.additionalContexts && Me.additionalContexts.length > 0) {
        let we = y.agentId ? "SubagentStop" : "Stop",
          Le = createAttachmentMessage_2({
            type: "hook_additional_context",
            content: Me.additionalContexts,
            hookName: we,
            toolUseID: go,
            hookEvent: we,
          });
        if (!isBareModeAttachmentDropped(Le)) se.push(Le);
        (yield Le, (ut = !0), Gt.push(...Me.additionalContexts));
      }
      if (Me.preventContinuation)
        ((Te = !0),
          (ht = Me.stopReason || "Stop hook prevented continuation"),
          yield createAttachmentMessage_2({
            type: "hook_stopped_continuation",
            message: ht,
            hookName: "Stop",
            toolUseID: go,
            hookEvent: "Stop",
          }));
      if (y.abortController.signal.aborted) {
        if (
          (logEvent("tengu_pre_stop_hooks_cancelled", {
            queryChainId: ye(y.queryTracking?.chainId),
            queryDepth: y.queryTracking?.depth,
          }),
          !isSilentAbortReason(y.abortController.signal.reason))
        )
          yield createUserInterruptionMessage({
            toolUse: !1,
            interruptedByShutdown: shutdownInterruptStamp(y.abortController.signal),
          });
        return { blockingErrors: [], preventContinuation: !0 };
      }
    }
    if (oe > 0) {
      if (
        (yield createStopHookSummaryMessage(oe, Qt, kt, Te, ht, ut, "suggestion", go, void 0, void 0, Gt),
        kt.length > 0)
      ) {
        let Me = getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
        if (!M)
          yield {
            type: "notification",
            notification: {
              key: "stop-hook-error",
              text: `Stop hook error occurred \xB7 ${Me} to see`,
              priority: "immediate",
            },
          };
      }
    }
    if (Te)
      return (
        yield* runTurnEndReactions(y, Q.messages, { stopHookActive: M }),
        { blockingErrors: [], preventContinuation: !0 }
      );
    if (se.length > 0) {
      if (it)
        logHookPushbackEvent({
          pushback: { hookEvent: y.agentId ? "subagent_stop" : "stop" },
          permissionMode: mode,
          agentContext: y.agentContext,
        });
      return { blockingErrors: se, preventContinuation: !1, goalPass: dt };
    }
    let At = isTeammateAgentContext(y.agentContext, y.taskRegistry, y.agentId);
    if (At !== void 0 && y.agentId === At.agentId) {
      let { teammateName: teammateName, teamName: teamName } = At,
        Le,
        st = "",
        Ct = getTaskListId(),
        filtered = (await listTasks(Ct, y.storageV5)).filter(
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
          y.abortController.signal,
          void 0,
          y,
        );
        for await (let Jt of bo) {
          if (Jt.message) {
            if (Jt.message.type === "progress" && Jt.message.toolUseID) st = Jt.message.toolUseID;
            if ((yield Jt.message, ii(Jt.message) && Nr())) U.push(Jt.message);
          }
          if (Jt.blockingError) {
            let Ho = createUserMessage({
              content: getTaskCompletedHookMessage(Jt.blockingError),
              isMeta: !0,
            });
            (U.push(Ho), yield Ho);
          }
          if (Jt.preventContinuation)
            ((nt = !0),
              (Le = Jt.stopReason || "TaskCompleted hook prevented continuation"),
              yield createAttachmentMessage_2({
                type: "hook_stopped_continuation",
                message: Le,
                hookName: "TaskCompleted",
                toolUseID: st,
                hookEvent: "TaskCompleted",
              }));
          if (y.abortController.signal.aborted) return { blockingErrors: [], preventContinuation: !0 };
        }
      }
      let yo = executeTeammateIdleHooks(teammateName, teamName, mode, y.abortController.signal, void 0, y);
      for await (let Mt of yo) {
        if (Mt.message) {
          if (Mt.message.type === "progress" && Mt.message.toolUseID) st = Mt.message.toolUseID;
          if ((yield Mt.message, ii(Mt.message) && Nr())) U.push(Mt.message);
        }
        if (Mt.blockingError) {
          let bo = createUserMessage({ content: getTeammateIdleHookMessage(Mt.blockingError), isMeta: !0 });
          (U.push(bo), yield bo);
        }
        if (Mt.preventContinuation)
          ((nt = !0),
            (Le = Mt.stopReason || "TeammateIdle hook prevented continuation"),
            yield createAttachmentMessage_2({
              type: "hook_stopped_continuation",
              message: Le,
              hookName: "TeammateIdle",
              toolUseID: st,
              hookEvent: "TeammateIdle",
            }));
        if (y.abortController.signal.aborted) return { blockingErrors: [], preventContinuation: !0 };
      }
      if (nt)
        return (
          yield* runTurnEndReactions(y, Q.messages, { stopHookActive: M }),
          { blockingErrors: [], preventContinuation: !0 }
        );
      if (U.length > 0) return { blockingErrors: U, preventContinuation: !1, goalPass: dt };
    }
    return (
      yield* runTurnEndReactions(y, Q.messages, { stopHookActive: M }),
      { blockingErrors: [], preventContinuation: !1, goalPass: dt }
    );
  } catch (error) {
    if (
      isAbortError(error) &&
      (y.abortController.signal.aborted || error instanceof StreamClosedAbortError)
    ) {
      if (
        (logForDebugging("Stop hook cancelled (abort or stream teardown)"), !y.abortController.signal.aborted)
      ) {
        let Ke = [...se, ...U],
          J = Te || nt;
        if (J || Ke.length === 0) yield* runTurnEndReactions(y, Q.messages, { stopHookActive: M });
        return { blockingErrors: Ke, preventContinuation: J };
      }
      return { blockingErrors: [], preventContinuation: !1 };
    }
    Z = !0;
    let Pe = Date.now() - now;
    if (
      (logEvent("tengu_stop_hook_error", {
        duration: Pe,
        queryChainId: ye(y.queryTracking?.chainId),
        queryDepth: y.queryTracking?.depth,
      }),
      yield createSystemMessage(`Stop hook failed: ${errorMessage(error)}`, "warning"),
      filtered.length === 0)
    )
      yield* runTurnEndReactions(y, Q.messages, { stopHookActive: M });
    return {
      blockingErrors: filtered,
      preventContinuation: !1,
      goalPass: bt && (dt === void 0 || dt === "not_met") ? "error" : dt,
    };
  } finally {
    if (re) y.sessionHooksRegistry.add(getSessionId(), "Stop", "", re);
    if (Re !== void 0 && !y.options.isNonInteractiveSession) {
      let {
        getAppState: getAppState,
        setAppState: setAppState,
        taskRegistry: taskRegistry,
        session: session,
        messageQueue: messageQueue,
      } = y;
      try {
        scheduleGoalIdleCheckin({
          goal: Re,
          now: Date.now(),
          sessionScratch: session.sessionScratch,
          getAppState: getAppState,
          setAppState: setAppState,
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
    if (bt) {
      let aborted = y.abortController.signal.aborted,
        Pe = dt === "met" || dt === "not_met" || dt === "impossible";
      logEvent("tengu_goal_evaluated", {
        outcome: fromEnum(dt ?? (Z ? "error" : aborted ? "cancelled" : "absent")),
        durationMs: Date.now() - now,
        iterations: bt.iterations + (Pe ? 1 : 0),
        parentAborted: aborted,
        origin: fromEnumOpt(bt.origin),
        ...rt,
      });
    }
  }
}
/**
 * 运行 turn_end_reactions hooks。
 */
//@ chunk-ha3km179.js:98580-99181 placement
async function* runTurnEndReactions(e, n, { stopHookActive: stopHookActive }) {
  try {
    let s = executeStopHooks(
      getToolPermissionContext(e).mode,
      e.abortController.signal,
      void 0,
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
    (logForDebugging("[stop-hooks] Turn-end reactions pass failed", { level: "error" }), logError(error));
  }
}

export { runTurnEndReactions, runStopHooks, waitForTurnEndSummary, generatePostTurnSummary };
