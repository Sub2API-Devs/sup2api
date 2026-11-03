/**
 * query/stopHooks.ts
 *
 * 本轮结束时运行 Stop/SubagentStop 钩子（handleStopHooks）：保存缓存安全参数、记忆提取、computer use 清理，钩子错误汇总为通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/query/stopHooks.ts
 * pieces: chunk-ha3km179.js (4)
 * attribution: placement 3, fingerprint 1
 */
import { postSamplingHookRegistry } from "../utils/hooks/postSamplingHooks.js";
import { rememberTurnParams, noteMainRequestForFork } from "../plugins/functionHooks/modelApi.js";
import {
  createCacheSafeParams,
  saveCacheSafeParams,
  clearForkCacheSafeParams,
} from "../utils/forkedAgent.js";
import { logError } from "../utils/log.js";
import { isMainAgent } from "../utils/agentContext.js";
import { replyGatePolicy } from "./turnEndReasons.js";
import { getQueuedPeerMessageCount } from "../utils/messageQueueManager.js";
import { runBookkeepingSafe, logReplyGatePolicy, REPLY_GATE_SILENT_REASONS } from "./toolDrain.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { generatePostTurnSummary, runTurnEndReactions } from "./postTurnSummary.js";
import { cleanupComputerUseAfterTurn } from "../utils/computerUse/cleanup.js";
import { executeStopHooks } from "../utils/hooks.js";
import { getToolPermissionContext } from "../utils/permissions/toolPermissionContext.js";
import { logForDebugging } from "../utils/debug.js";
import { getShortcutDisplay } from "../keybindings/shortcutFormat.js";
import { isAbortError, StreamClosedAbortError, errorMessage } from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";
import { createSystemMessage } from "../utils/messages.js";

//@ chunk-ha3km179.js:79605-79692 placement
/**
 * 钩子阻断错误附件
 */
function isHookBlockingErrorAttachment(message) {
  return message.type === "attachment" && message.attachment.type === "hook_blocking_error";
}
//@ chunk-ha3km179.js:79692-79799 placement = call (0.504)
function call(e) {
  try {
    if (postSamplingHookRegistry.of(e.toolUseContext.session.host).hooks.includes(rememberTurnParams))
      noteMainRequestForFork(e, createCacheSafeParams(e));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ha3km179.js:79799-79958 placement = updateMagicDocs (0.636)
function maybeStartPrecomputeAfterTurn(context) {
  try {
    if (
      isMainAgent(context.toolUseContext.agentContext) &&
      (context.querySource.startsWith("repl_main_thread") || context.querySource === "sdk")
    ) {
      saveCacheSafeParams(createCacheSafeParams(context));
      clearForkCacheSafeParams();
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ha3km179.js:79958-82467 fingerprint = handleStopHooks (0.499)
/**
 * handleStopHooks（工具/MCP 结束本轮、循环定时唤醒时调用）：主线程保存 cacheSafeParams；跑 Stop 钩子（阻断在此路径下被丢弃只记日志）；收集钩子错误发通知；有 endTurnSource 时执行收尾反应；中止时补偿。
 */
async function* handleStopHooks(
  messagesForQuery,
  assistantMessages,
  toolResults,
  systemPrompt,
  userContext,
  systemContext,
  toolUseContext,
  querySource,
  stopHookActive,
  stickyBetas,
  classifierJobState,
  endTurnSource,
) {
  let Q = endTurnSource === "tool";
  let D = [...messagesForQuery, ...assistantMessages, ...toolResults];
  let L = replyGatePolicy();
  if (
    getQueuedPeerMessageCount &&
    endTurnSource === "mcp_meta" &&
    querySource === "sdk" &&
    !toolUseContext.agentId &&
    !toolUseContext.abortController.signal.aborted &&
    L !== undefined
  )
    runBookkeepingSafe(() => {
      let V = getQueuedPeerMessageCount.evaluateProjectsReplyGate(
        messagesForQuery,
        [...assistantMessages, ...toolResults],
        {
          kind: "policy",
          policy: L,
        },
      );
      switch (V.kind) {
        case "answered":
          logFeatureOk("projects_reply_gate_policy", {
            person_opened_turn: V.personOpened,
            no_reply_only: V.noReplyOnly,
            source: lit("mcp_meta"),
          });
          break;
        case "still_silent":
        case "bounce":
          logReplyGatePolicy(REPLY_GATE_SILENT_REASONS[V.reason], {
            person_opened_turn: V.personOpened,
          });
          break;
        case "skip":
          break;
      }
    });
  if (
    isMainAgent(toolUseContext.agentContext) &&
    (querySource.startsWith("repl_main_thread") || querySource === "sdk")
  )
    saveCacheSafeParams(
      createCacheSafeParams({
        messages: D,
        systemPrompt,
        userContext,
        systemContext,
        toolUseContext,
        querySource,
        stickyBetas,
      }),
    );
  if (Q || (!isBgSession() && toolUseContext.sessionState))
    yield* generatePostTurnSummary(
      classifierJobState,
      [...messagesForQuery, ...assistantMessages],
      assistantMessages,
      toolUseContext,
      querySource,
    );
  if (!toolUseContext.agentId)
    try {
      yield* cleanupComputerUseAfterTurn(toolUseContext);
    } catch {}
  let hookStartTime = Date.now();
  let activeGoal = toolUseContext.agentId ? undefined : toolUseContext.getAppState().activeGoal;
  let ee = false;
  try {
    let V = executeStopHooks(
      getToolPermissionContext(toolUseContext).mode,
      toolUseContext.abortController.signal,
      undefined,
      stopHookActive,
      toolUseContext.agentId,
      toolUseContext,
      D,
      toolUseContext.agentType,
      "loop_tick",
    );
    let fe = [];
    for await (let result of V) {
      if (result.timedOut && activeGoal && result.hook?.prompt === activeGoal.condition)
        logFeatureSad("goal_met", "evaluator_timeout");
      if (result.message) {
        yield result.message;
        if (result.message.type === "attachment") {
          let attachment = result.message.attachment;
          if (
            "hookEvent" in attachment &&
            (attachment.hookEvent === "Stop" || attachment.hookEvent === "SubagentStop")
          ) {
            if (attachment.type === "hook_non_blocking_error")
              fe.push(attachment.stderr || `Exit code ${attachment.exitCode}`);
            else if (attachment.type === "hook_error_during_execution") fe.push(attachment.content);
          }
        }
      }
      if (result.blockingError || result.preventContinuation)
        logForDebugging(
          `[end-turn] Stop hook block discarded (turn ended by ${endTurnSource === "tool" ? "tool result" : endTurnSource === "mcp_meta" ? "MCP end-turn" : "loop tick"}, no model re-invoke): ${result.blockingError?.blockingError ?? result.stopReason ?? "preventContinuation"}`,
        );
    }
    if (fe.length > 0)
      yield {
        type: "notification",
        notification: {
          key: "stop-hook-error",
          text: `Stop hook error occurred \xB7 ${getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o")} to see`,
          priority: "immediate",
        },
      };
    if (endTurnSource) {
      ee = true;
      yield* runTurnEndReactions(toolUseContext, D, {
        stopHookActive,
      });
    }
  } catch (error) {
    if (
      isAbortError(error) &&
      (toolUseContext.abortController.signal.aborted || error instanceof StreamClosedAbortError)
    ) {
      logForDebugging("Stop hook cancelled (abort or stream teardown)");
      if (endTurnSource && !ee && !toolUseContext.abortController.signal.aborted)
        try {
          yield* runTurnEndReactions(toolUseContext, D, {
            stopHookActive,
          });
        } catch (error) {
          logForDebugging(`[stop-hooks] teardown reactions compensation failed: ${errorMessage(error)}`);
        }
      return;
    }
    logEvent("tengu_stop_hook_error", {
      duration: Date.now() - hookStartTime,
      queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
      queryDepth: toolUseContext.queryTracking?.depth,
    });
    yield createSystemMessage(`Stop hook failed: ${errorMessage(error)}`, "warning");
    if (endTurnSource && !ee)
      try {
        yield* runTurnEndReactions(toolUseContext, D, {
          stopHookActive,
        });
      } catch (error) {
        logForDebugging(`[stop-hooks] turn-end reactions compensation failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
  }
}
export { handleStopHooks, maybeStartPrecomputeAfterTurn, call, isHookBlockingErrorAttachment };
