/**
 * query/toolDrain.ts
 *
 * 2.1.316 新增：判断上一回合的提醒状态；排空工具结果流，等待未完成工具和唤醒等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (25)
 * attribution: placement 25
 */
import { posix } from "path";
import { isTextOrJsonDeltaEvent, hasUltrathinkKeyword } from "./goalCheckIn.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { usesPayAsYouGo } from "../utils/planTiers.js";
import {
  hasFreshGrowthBookFeatures,
  initializeGrowthBook,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import { withTimeout, withDeadline, raceWithAbortSignal } from "../utils/sleep.js";
import { logForDebugging, createAttachmentMessage_2 } from "../utils/debug.js";
import { toError, errorMessage, isAbortError } from "../utils/errors.js";
import { logError } from "../utils/log.js";
import { isPlainHeronEnabled, isGentleAnchorEnabled } from "../services/compact/compactSettings.js";
import { shouldEnforceUnknownModelWindow } from "../utils/context.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../services/analytics/safeMetadata.js";
import { windowSource } from "../services/compact/autoCompactWindow.js";
import { agentTypeForTelemetry } from "../services/analytics/metadata.js";
import { isOver1mThreshold } from "../utils/model/configs.js";
import { getSdkBetas, mainAgentId } from "../bootstrap/state.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { shouldUltrathinkRaiseEffort } from "../utils/effort.js";
import { isHumanOrigin } from "../utils/turnOrigin.js";
import { createAgentStatusEmitter } from "../utils/processUserInput/processSlashCommand.js";
import { ensureClientDataFetch, markClientDataFetchOver } from "../bridge/bridgeEnabled.js";
import { hasClientDataCacheSlot } from "../utils/config.js";
import { getModelContextInfo } from "../utils/model/modelContextInfo.js";
import { isFoamySpringEnabled } from "../services/analytics/growthbookGates.js";
import { isClaudeAiChatCowork } from "../utils/entrypointKinds.js";
import {
  isTurnCompanion,
  isToolResultMessage,
  hasSuccessfulToolCall,
  LINKED_BUT_NOT_SENT_PREFIX,
} from "../utils/messages.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";
import { getOutputsRoot, getHomeFilesRoot } from "../utils/stageFileRoots.js";
import { urlPatternToRegex } from "../utils/stringUtils.js";
import { replaceInlineCode } from "../commands/model/modelMessages.js";
import { readUntrustedArray, UNREADABLE_ARRAY } from "../utils/untrustedArray.js";
import { escapeForTag } from "../utils/sanitization.js";
import { BRIEF_TOOL_NAME } from "../tools/BriefTool/prompt.js";

//@ chunk-ha3km179.js:69131-69853 placement
/**
 * 排空工具结果流，等待未完成工具和唤醒。
 */
async function* drainToolResults(source, getExecutor, takePlainDelta) {
  let iterator = Symbol.asyncIterator in source ? source[Symbol.asyncIterator]() : source[Symbol.iterator]();
  let pendingStream;
  let executor = getExecutor();
  let drainGeneration = 0;
  try {
    while (true) {
      let currentExecutor = getExecutor();
      if (currentExecutor !== executor) {
        executor = currentExecutor;
        drainGeneration = 0;
      }
      if (
        pendingStream === undefined &&
        !currentExecutor.hasUnfinishedTools() &&
        !currentExecutor.hasWakeSince(drainGeneration)
      ) {
        let step = await iterator.next();
        while (
          takePlainDelta !== undefined &&
          !step.done &&
          isTextOrJsonDeltaEvent(step.value) &&
          getExecutor() === currentExecutor &&
          !currentExecutor.hasUnfinishedTools() &&
          !currentExecutor.hasWakeSince(drainGeneration) &&
          takePlainDelta(step.value)
        )
          step = await iterator.next();
        if (step.done) return;
        yield step.value;
        continue;
      }
      pendingStream ??= Promise.resolve(iterator.next()).then((step) => ({
        kind: "stream",
        r: step,
      }));
      let winner = await Promise.race([
        pendingStream,
        currentExecutor.waitForDrainable(drainGeneration).then((gen) => ({
          kind: "drain",
          gen,
        })),
      ]);
      if (winner.kind === "drain") {
        drainGeneration = winner.gen;
        yield {
          type: "tool_drain_tick",
        };
        continue;
      }
      pendingStream = undefined;
      if (winner.r.done) return;
      yield winner.r.value;
    }
  } finally {
    Promise.resolve(iterator.return?.(undefined)).catch(() => {});
  }
}
//@ chunk-ha3km179.js:69853-69923 placement
/**
 * 4000
 */
var GROWTHBOOK_READY_TIMEOUT_MS = 4000;
var GROWTHBOOK_TIMEOUT_TEXT = "bg consent gate: own GrowthBook evaluation not ready";
//@ chunk-ha3km179.js:69923-70258 placement
/**
 * 后台会话等待自身 GrowthBook 评估就绪（超时用缓存）。
 */
async function awaitBgConsentGate() {
  try {
    if (!isBgSession() || usesPayAsYouGo() || hasFreshGrowthBookFeatures()) return;
    let now = Date.now();
    try {
      await withTimeout(initializeGrowthBook(), GROWTHBOOK_READY_TIMEOUT_MS, GROWTHBOOK_TIMEOUT_TEXT);
      logForDebugging(`bg consent gate: waited ${Date.now() - now}ms for own GrowthBook evaluation`);
    } catch (error) {
      let error_2 = toError(error);
      logForDebugging(
        `bg consent gate: proceeding on cached flags after ${Date.now() - now}ms (${error_2.message === GROWTHBOOK_TIMEOUT_TEXT ? "timeout" : error_2.name})`,
        {
          level: "warn",
        },
      );
    }
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-ha3km179.js:70258-70366 placement
function createDisposableGuard(onDispose) {
  let armed = true;
  return {
    disarm() {
      armed = false;
    },
    [Symbol.dispose]() {
      if (!armed) return;
      armed = false;
      try {
        onDispose();
      } catch (error) {
        logError(error);
      }
    },
  };
}
//@ chunk-ha3km179.js:70366-70566 placement
function shouldBypassPtlPreempt(model, autoCompactWindow, querySource, compactFailure) {
  try {
    if (!isPlainHeronEnabled() || !shouldEnforceUnknownModelWindow(model)) return false;
    logEvent("tengu_ptl_preempt_bypassed", {
      windowSource: fromEnum(windowSource(model, autoCompactWindow)),
      querySource: agentTypeForTelemetry(querySource),
      compactFailureReason: fromEnumOpt(compactFailure?.reason),
    });
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-ha3km179.js:70566-70867 placement
/**
 * 汇总压缩检查事实用于遥测。
 */
function compactCheckFacts({ outcome, compactionCheckFacts, blockingCheck, configuredWindow }) {
  try {
    return {
      loopTopOutcome: fromEnum(outcome.kind),
      thresholdSource: fromEnum(windowSource(compactionCheckFacts, configuredWindow)),
      compactCheckContextWindow: compactionCheckFacts.contextWindow,
      blockingCheckContextWindow: blockingCheck.facts.contextWindow,
      blockingCheckTokenCount: blockingCheck.tokenCount,
    };
  } catch (error) {
    logError(error);
    return {};
  }
}
//@ chunk-ha3km179.js:70867-71166 placement
function isCompactNotNeededAtLimit(autocompactOutcome, attemptModelFacts, logPayload) {
  try {
    if (
      autocompactOutcome.kind !== "not_needed" ||
      autocompactOutcome.consecutiveFailures !== undefined ||
      isOver1mThreshold(attemptModelFacts.model, getSdkBetas()) ||
      attemptModelFacts.contextWindow < attemptModelFacts.apiContextWindowWithoutOptIn ||
      !isGentleAnchorEnabled()
    )
      return false;
    logFeatureOk("compact_not_needed_at_blocking_limit", logPayload);
    return true;
  } catch (error) {
    logFeatureBad("compact_not_needed_at_blocking_limit", "check_threw");
    logError(error);
    return false;
  }
}
//@ chunk-ha3km179.js:71166-71241 placement
/**
 * 是否应排空工具
 */
function canDrainTools(state) {
  return !state.foldSuspended && (!state.isMainThread || !state.lastIteration);
}
//@ chunk-ha3km179.js:71241-71267 placement
/**
 * 空实现
 */
async function noopAsyncDrain(toolUseContext, queueFilterForThread, getCommands) {}
//@ chunk-ha3km179.js:71267-71727 placement
/**
 * 是否在发送前预防提示过长。
 */
function shouldPreemptPromptTooLong(commands, model, appState, deps) {
  try {
    if (!(
      shouldUltrathinkRaiseEffort(model, appState) &&
      commands.some(
        (command) =>
          command.mode === "prompt" &&
          !command.isMeta &&
          command.shouldQuery !== false &&
          isHumanOrigin(command.origin) &&
          !command.textNotTyped &&
          hasUltrathinkKeyword({
            composerEnter: command.composerEnter,
            preExpansion: command.preExpansionValue,
            localStdinOrigin: command.localStdinOrigin,
            input: command.value,
          }),
      )
    ))
      return;
    let reminder = createAttachmentMessage_2(
      {
        type: "ultrathink_effort",
      },
      deps,
    );
    logFeatureOk("ultrathink_boost");
    logEvent("tengu_ultrathink", {});
    createAgentStatusEmitter(mainAgentId()).setTurnEffort("xhigh");
    return {
      layer: {
        kind: "effort",
        effort: "xhigh",
      },
      reminder,
    };
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:71727-71739 placement
/**
 * 1500
 */
var MCP_SETTLE_WAIT_MS = 1500;
//@ chunk-ha3km179.js:71739-72230 placement
/**
 * 等待 MCP 连接稳定（tengu_deep_shore）。
 */
async function awaitMcpSettle(
  model,
  { storageV5, credentials, abortController: { signal } },
  timeoutMs = MCP_SETTLE_WAIT_MS,
) {
  try {
    let clientDataFetch = ensureClientDataFetch(storageV5, credentials);
    if (clientDataFetch !== undefined && getFeatureValue_CACHED_MAY_BE_STALE("tengu_deep_shore", true)) {
      let startTime = performance.now();
      let settled = await withDeadline(
        raceWithAbortSignal(clientDataFetch, signal, () => Error("interrupted")).then(
          () => true,
          () => false,
        ),
        timeoutMs,
      );
      let waitedMs = Math.round(performance.now() - startTime);
      if (settled === undefined) {
        markClientDataFetchOver(clientDataFetch);
        logFeatureSad("model_client_data_wait", "timeout", {
          waited_ms: waitedMs,
        });
      } else if (!settled)
        logFeatureSad("model_client_data_wait", "interrupted", {
          waited_ms: waitedMs,
        });
      else if (hasClientDataCacheSlot())
        logFeatureOk("model_client_data_wait", {
          waited_ms: waitedMs,
        });
    }
  } catch (error) {
    logError(error);
  }
  return getModelContextInfo(model);
}
//@ chunk-ha3km179.js:72230-72338 placement
function runBookkeepingSafe(onThrow) {
  try {
    onThrow();
  } catch (error) {
    logForDebugging(`[end-turn] bookkeeping threw and was skipped: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-ha3km179.js:72338-72533 placement
function shouldRunMcpStopHooks({ requested, lastIteration }) {
  try {
    return (
      requested === "mcp_meta_blockable" &&
      !lastIteration &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_glittery_mitten", true)
    );
  } catch (error) {
    runBookkeepingSafe(() => logFeatureSad("query_mcp_end_turn_stop_hooks", "gate_threw"));
    logError(error);
    return false;
  }
}
//@ chunk-ha3km179.js:72533-73053 placement
/**
 * 安全运行 stop hooks（异常时上报并结束）。
 */
async function* runStopHooksSafely({ throughStopHooks, onThrow, queryChainId, queryDepth }) {
  let outcome;
  try {
    outcome = yield* throughStopHooks();
  } catch (error) {
    let aborted = isAbortError(error);
    if (!aborted) logError(error);
    runBookkeepingSafe(() =>
      logFeatureSad("query_mcp_end_turn_stop_hooks", aborted ? "aborted" : "pass_threw"),
    );
    runBookkeepingSafe(onThrow);
    return {
      reason: "completed",
    };
  }
  runBookkeepingSafe(() => {
    if (typeof outcome === "string")
      logEvent("tengu_mcp_end_turn_overridden_by_stop_hook", {
        queryChainId,
        queryDepth,
      });
    else
      logEvent("tengu_mcp_tool_result_ended_turn", {
        queryChainId,
        queryDepth,
        source: lit("mcp_meta_blockable"),
        terminalReason: fromEnum(outcome.reason),
      });
    logFeatureOk("query_mcp_end_turn_stop_hooks");
  });
  return outcome;
}
//@ chunk-ha3km179.js:73053-73133 placement
/**
 * 静默/报错两种原因
 */
var REPLY_GATE_SILENT_REASONS = {
  silent_turn: "tool_ended_silent",
  reply_errored: "tool_ended_after_error",
};
//@ chunk-ha3km179.js:73133-73186 placement
/**
 * 记录策略失败
 */
function logReplyGatePolicy(reason, fields) {
  logFeatureBad("projects_reply_gate_policy", reason, fields);
}
//@ chunk-ha3km179.js:73186-73214 placement
var TENGU_JOYFUL_GLOBE = "tengu_joyful_globe";
//@ chunk-ha3km179.js:73214-73250 placement
/**
 * foamy spring + tengu_joyful_globe
 */
function isJoyfulGlobeOn() {
  return isFoamySpringEnabled() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JOYFUL_GLOBE, true);
}
//@ chunk-ha3km179.js:73280-73338 placement
/**
 * cowork + tengu_resilient_galaxy
 */
function isResilientGalaxyOn() {
  return isClaudeAiChatCowork() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_resilient_galaxy", false);
}
//@ chunk-ha3km179.js:73338-73480 placement
function endsWithReminder(messagesForQuery) {
  if (!isResilientGalaxyOn()) return false;
  let message = messagesForQuery.findLast(
    (message) =>
      message.type === "assistant" ||
      isQueuedCommandAttachment(message) ||
      isReminderMessage(message) ||
      (message.type === "user" && !isTurnCompanion(message)),
  );
  return message !== undefined && isReminderMessage(message);
}
//@ chunk-ha3km179.js:73480-74891 placement
/**
 * 判断上一回合的提醒状态。
 */
function lastTurnReminderState(messages) {
  let messages_2 = messages.slice(
    messages.findLastIndex(
      (message) =>
        isQueuedCommandAttachment(message) ||
        (message.type === "user" && !isToolResultMessage(message) && !isTurnCompanion(message)),
    ) + 1,
  );
  let lastIndex = messages_2.findLastIndex(isReminderMessage);
  if (lastIndex !== -1) {
    let messages = messages_2.slice(lastIndex + 1);
    return {
      kind: "reminded",
      sent: hasSuccessfulToolCall(messages, SEND_USER_FILE_TOOL_NAME),
      textLength: collectUserFacingTexts(messages).join("").trim().length,
    };
  }
  let roots = [getOutputsRoot(), getHomeFilesRoot(), "/tmp"];
  let regExp = new RegExp(
    `\\]\\(<?(?:computer://|file://)?((?:${roots.map(urlPatternToRegex).join("|")})/[^\\s)>]{1,500})`,
    "g",
  );
  let linkedFiles = new Map();
  for (let text of collectUserFacingTexts(messages_2)) {
    let stripped = replaceInlineCode(text.replace(/(```|~~~)[\s\S]*?(?:\1|$)/g, ""), () => "");
    for (let [, path = ""] of stripped.matchAll(regExp)) {
      let decoded = path;
      try {
        decoded = decodeURIComponent(path);
      } catch {}
      if (!decoded.includes("/.") && /\.[a-z0-9]+$/i.test(decoded))
        linkedFiles.set(posix.basename(decoded), path);
    }
  }
  for (let message of linkedFiles.size > 0 ? messages : []) {
    if (message.type !== "assistant") continue;
    for (let block of message.message.content) {
      if (
        block.type !== "tool_use" ||
        block.name !== SEND_USER_FILE_TOOL_NAME ||
        typeof block.input !== "object" ||
        block.input === null ||
        !("files" in block.input)
      )
        continue;
      let files = readUntrustedArray(block.input.files) ?? [block.input.files];
      for (let file of files === UNREADABLE_ARRAY ? [] : files)
        if (typeof file === "string") linkedFiles.delete(posix.basename(file));
    }
  }
  if (linkedFiles.size === 0)
    return {
      kind: "skip",
    };
  let joined = [...linkedFiles.values()].slice(0, 5).map(escapeForTag).join(", ");
  return {
    kind: "remind",
    text: `${LINKED_BUT_NOT_SENT_PREFIX} ${joined}. The user did not write this note and cannot see it. It is about your reply above only. A link to a file that you did not send may not open for them. If they should have a file, call ${SEND_USER_FILE_TOOL_NAME} with it now, then say in one short line that you sent it, or that the send failed. If they should have none, end your turn with no text. Do not repeat your reply, and do not mention this note.`,
  };
}
//@ chunk-ha3km179.js:74891-74973 placement = buildTranscriptEntries (0.777)
function isQueuedCommandAttachment(message) {
  return message.type === "attachment" && message.attachment.type === "queued_command";
}
//@ chunk-ha3km179.js:74973-75098 placement
function isReminderMessage(message) {
  return (
    message.type === "user" &&
    message.isMeta === true &&
    typeof message.message.content === "string" &&
    message.message.content.startsWith(LINKED_BUT_NOT_SENT_PREFIX)
  );
}
//@ chunk-ha3km179.js:75098-75409 placement = collectRecentSuccessfulTools (0.869)
/**
 * 收集助手文本块与 SendUserMessage 调用的 message 文本。旧版名 collectRecentSuccessfulTools 为错配；归属存疑。
 */
function collectUserFacingTexts(messages) {
  let texts = [];
  for (let message of messages) {
    if (message.type !== "assistant") continue;
    for (let block of message.message.content)
      if (block.type === "text") texts.push(block.text);
      else if (
        block.type === "tool_use" &&
        block.name === BRIEF_TOOL_NAME &&
        typeof block.input === "object" &&
        block.input !== null &&
        "message" in block.input &&
        typeof block.input.message === "string"
      )
        texts.push(block.input.message);
  }
  return texts;
}
export {
  awaitMcpSettle,
  createDisposableGuard,
  awaitBgConsentGate,
  compactCheckFacts,
  shouldBypassPtlPreempt,
  isCompactNotNeededAtLimit,
  drainToolResults,
  endsWithReminder,
  shouldRunMcpStopHooks,
  runStopHooksSafely,
  canDrainTools,
  noopAsyncDrain,
  shouldPreemptPromptTooLong,
  logReplyGatePolicy,
  isResilientGalaxyOn,
  lastTurnReminderState,
  isJoyfulGlobeOn,
  runBookkeepingSafe,
  REPLY_GATE_SILENT_REASONS,
};
