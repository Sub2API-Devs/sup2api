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
import { D2 } from "../utils/planTiers.js";
import {
  hasFreshGrowthBookFeatures,
  initializeGrowthBook,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import { withTimeout, withDeadline, raceWithAbortSignal } from "../utils/sleep.js";
import { logForDebugging, createAttachmentMessage_2 } from "../utils/debug.js";
import { toError, errorMessage, isAbortError } from "../utils/errors.js";
import { logError } from "../utils/log.js";
import { hri, yri } from "../services/compact/compactSettings.js";
import { shouldEnforceUnknownModelWindow } from "../utils/context.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../services/analytics/safeMetadata.js";
import { fse } from "../services/compact/autoCompactWindow.js";
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
import { isTurnCompanion, isToolResultMessage, hasSuccessfulToolCall, nXt } from "../utils/messages.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";
import { getOutputsRoot, getHomeFilesRoot } from "../utils/stageFileRoots.js";
import { urlPatternToRegex } from "../utils/stringUtils.js";
import { replaceInlineCode } from "../commands/model/modelMessages.js";
import { readUntrustedArray, Uf } from "../utils/untrustedArray.js";
import { escapeForTag } from "../utils/sanitization.js";
import { BRIEF_TOOL_NAME } from "../tools/BriefTool/prompt.js";

/**
 * 排空工具结果流，等待未完成工具和唤醒。
 */
//@ chunk-ha3km179.js:69131-69853 placement
async function* drainToolResults(e, n, r) {
  let s = Symbol.asyncIterator in e ? e[Symbol.asyncIterator]() : e[Symbol.iterator](),
    h,
    y = n(),
    S = 0;
  try {
    while (!0) {
      let M = n();
      if (M !== y) ((y = M), (S = 0));
      if (h === void 0 && !M.hasUnfinishedTools() && !M.hasWakeSince(S)) {
        let T = await s.next();
        while (
          r !== void 0 &&
          !T.done &&
          isTextOrJsonDeltaEvent(T.value) &&
          n() === M &&
          !M.hasUnfinishedTools() &&
          !M.hasWakeSince(S) &&
          r(T.value)
        )
          T = await s.next();
        if (T.done) return;
        yield T.value;
        continue;
      }
      h ??= Promise.resolve(s.next()).then((T) => ({ kind: "stream", r: T }));
      let winner = await Promise.race([h, M.waitForDrainable(S).then((T) => ({ kind: "drain", gen: T }))]);
      if (winner.kind === "drain") {
        ((S = winner.gen), yield { type: "tool_drain_tick" });
        continue;
      }
      if (((h = void 0), winner.r.done)) return;
      yield winner.r.value;
    }
  } finally {
    Promise.resolve(s.return?.(void 0)).catch(() => {});
  }
}
//@ chunk-ha3km179.js:69853-69923 placement
var hf = 4000,
  Ql = "bg consent gate: own GrowthBook evaluation not ready";
/**
 * 后台会话等待自身 GrowthBook 评估就绪（超时用缓存）。
 */
//@ chunk-ha3km179.js:69923-70258 placement
async function awaitBgConsentGate() {
  try {
    if (!isBgSession() || D2() || hasFreshGrowthBookFeatures()) return;
    let now = Date.now();
    try {
      (await withTimeout(initializeGrowthBook(), hf, Ql),
        logForDebugging(`bg consent gate: waited ${Date.now() - now}ms for own GrowthBook evaluation`));
    } catch (error) {
      let r = toError(error);
      logForDebugging(
        `bg consent gate: proceeding on cached flags after ${Date.now() - now}ms (${r.message === Ql ? "timeout" : r.name})`,
        { level: "warn" },
      );
    }
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-ha3km179.js:70258-70366 placement
function createDisposableGuard(e) {
  let n = !0;
  return {
    disarm() {
      n = !1;
    },
    [Symbol.dispose]() {
      if (!n) return;
      n = !1;
      try {
        e();
      } catch (error) {
        logError(error);
      }
    },
  };
}
//@ chunk-ha3km179.js:70366-70566 placement
function shouldBypassPtlPreempt(e, n, r, s) {
  try {
    if (!hri() || !shouldEnforceUnknownModelWindow(e)) return !1;
    return (
      logEvent("tengu_ptl_preempt_bypassed", {
        windowSource: fromEnum(fse(e, n)),
        querySource: agentTypeForTelemetry(r),
        compactFailureReason: fromEnumOpt(s?.reason),
      }),
      !0
    );
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 汇总压缩检查事实用于遥测。
 */
//@ chunk-ha3km179.js:70566-70867 placement
function compactCheckFacts({
  outcome: outcome,
  compactionCheckFacts: compactionCheckFacts,
  blockingCheck: blockingCheck,
  configuredWindow: configuredWindow,
}) {
  try {
    return {
      loopTopOutcome: fromEnum(outcome.kind),
      thresholdSource: fromEnum(fse(compactionCheckFacts, configuredWindow)),
      compactCheckContextWindow: compactionCheckFacts.contextWindow,
      blockingCheckContextWindow: blockingCheck.facts.contextWindow,
      blockingCheckTokenCount: blockingCheck.tokenCount,
    };
  } catch (error) {
    return (logError(error), {});
  }
}
//@ chunk-ha3km179.js:70867-71166 placement
function isCompactNotNeededAtLimit(e, n, r) {
  try {
    if (
      e.kind !== "not_needed" ||
      e.consecutiveFailures !== void 0 ||
      isOver1mThreshold(n.model, getSdkBetas()) ||
      n.contextWindow < n.apiContextWindowWithoutOptIn ||
      !yri()
    )
      return !1;
    return (logFeatureOk("compact_not_needed_at_blocking_limit", r), !0);
  } catch (error) {
    return (logFeatureBad("compact_not_needed_at_blocking_limit", "check_threw"), logError(error), !1);
  }
}
//@ chunk-ha3km179.js:71166-71241 placement
function Xl(e) {
  return !e.foldSuspended && (!e.isMainThread || !e.lastIteration);
}
//@ chunk-ha3km179.js:71241-71267 placement
async function Jl(e, n, r) {}
/**
 * 是否在发送前预防提示过长。
 */
//@ chunk-ha3km179.js:71267-71727 placement
function shouldPreemptPromptTooLong(e, n, r, s) {
  try {
    if (!(
      shouldUltrathinkRaiseEffort(n, r) &&
      e.some(
        (S) =>
          S.mode === "prompt" &&
          !S.isMeta &&
          S.shouldQuery !== !1 &&
          isHumanOrigin(S.origin) &&
          !S.textNotTyped &&
          hasUltrathinkKeyword({
            composerEnter: S.composerEnter,
            preExpansion: S.preExpansionValue,
            localStdinOrigin: S.localStdinOrigin,
            input: S.value,
          }),
      )
    ))
      return;
    let y = createAttachmentMessage_2({ type: "ultrathink_effort" }, s);
    return (
      logFeatureOk("ultrathink_boost"),
      logEvent("tengu_ultrathink", {}),
      createAgentStatusEmitter(mainAgentId()).setTurnEffort("xhigh"),
      { layer: { kind: "effort", effort: "xhigh" }, reminder: y }
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:71727-71739 placement
var _f = 1500;
/**
 * 等待 MCP 连接稳定（tengu_deep_shore）。
 */
//@ chunk-ha3km179.js:71739-72230 placement
async function awaitMcpSettle(
  e,
  { storageV5: storageV5, credentials: credentials, abortController: { signal: s } },
  h = _f,
) {
  try {
    let y = ensureClientDataFetch(storageV5, credentials);
    if (y !== void 0 && getFeatureValue_CACHED_MAY_BE_STALE("tengu_deep_shore", !0)) {
      let startTime = performance.now(),
        M = await withDeadline(
          raceWithAbortSignal(y, s, () => Error("interrupted")).then(
            () => !0,
            () => !1,
          ),
          h,
        ),
        rounded = Math.round(performance.now() - startTime);
      if (M === void 0)
        (markClientDataFetchOver(y),
          logFeatureSad("model_client_data_wait", "timeout", { waited_ms: rounded }));
      else if (!M) logFeatureSad("model_client_data_wait", "interrupted", { waited_ms: rounded });
      else if (hasClientDataCacheSlot()) logFeatureOk("model_client_data_wait", { waited_ms: rounded });
    }
  } catch (error) {
    logError(error);
  }
  return getModelContextInfo(e);
}
//@ chunk-ha3km179.js:72230-72338 placement
function runBookkeepingSafe(e) {
  try {
    e();
  } catch (error) {
    logForDebugging(`[end-turn] bookkeeping threw and was skipped: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-ha3km179.js:72338-72533 placement
function shouldRunMcpStopHooks({ requested: requested, lastIteration: lastIteration }) {
  try {
    return (
      requested === "mcp_meta_blockable" &&
      !lastIteration &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_glittery_mitten", !0)
    );
  } catch (error) {
    return (
      runBookkeepingSafe(() => logFeatureSad("query_mcp_end_turn_stop_hooks", "gate_threw")),
      logError(error),
      !1
    );
  }
}
/**
 * 安全运行 stop hooks（异常时上报并结束）。
 */
//@ chunk-ha3km179.js:72533-73053 placement
async function* runStopHooksSafely({
  throughStopHooks: throughStopHooks,
  onThrow: onThrow,
  queryChainId: queryChainId,
  queryDepth: queryDepth,
}) {
  let h;
  try {
    h = yield* throughStopHooks();
  } catch (error) {
    let S = isAbortError(error);
    if (!S) logError(error);
    return (
      runBookkeepingSafe(() => logFeatureSad("query_mcp_end_turn_stop_hooks", S ? "aborted" : "pass_threw")),
      runBookkeepingSafe(onThrow),
      { reason: "completed" }
    );
  }
  return (
    runBookkeepingSafe(() => {
      if (typeof h === "string")
        logEvent("tengu_mcp_end_turn_overridden_by_stop_hook", {
          queryChainId: queryChainId,
          queryDepth: queryDepth,
        });
      else
        logEvent("tengu_mcp_tool_result_ended_turn", {
          queryChainId: queryChainId,
          queryDepth: queryDepth,
          source: lit("mcp_meta_blockable"),
          terminalReason: fromEnum(h.reason),
        });
      logFeatureOk("query_mcp_end_turn_stop_hooks");
    }),
    h
  );
}
//@ chunk-ha3km179.js:73053-73133 placement
var nd = { silent_turn: "tool_ended_silent", reply_errored: "tool_ended_after_error" };
//@ chunk-ha3km179.js:73133-73186 placement
function Ur(e, n) {
  logFeatureBad("projects_reply_gate_policy", e, n);
}
//@ chunk-ha3km179.js:73186-73214 placement
var TENGU_JOYFUL_GLOBE = "tengu_joyful_globe";
//@ chunk-ha3km179.js:73214-73250 placement
function Nr() {
  return isFoamySpringEnabled() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JOYFUL_GLOBE, !0);
}
//@ chunk-ha3km179.js:73280-73338 placement
function si() {
  return isClaudeAiChatCowork() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_resilient_galaxy", !1);
}
//@ chunk-ha3km179.js:73338-73480 placement
function endsWithReminder(e) {
  if (!si()) return !1;
  let last = e.findLast(
    (r) =>
      r.type === "assistant" ||
      isQueuedCommandAttachment(r) ||
      isReminderMessage(r) ||
      (r.type === "user" && !isTurnCompanion(r)),
  );
  return last !== void 0 && isReminderMessage(last);
}
/**
 * 判断上一回合的提醒状态。
 */
//@ chunk-ha3km179.js:73480-74891 placement
function lastTurnReminderState(e) {
  let sliced = e.slice(
      e.findLastIndex(
        (M) =>
          isQueuedCommandAttachment(M) ||
          (M.type === "user" && !isToolResultMessage(M) && !isTurnCompanion(M)),
      ) + 1,
    ),
    lastIndex = sliced.findLastIndex(isReminderMessage);
  if (lastIndex !== -1) {
    let sliced_2 = sliced.slice(lastIndex + 1);
    return {
      kind: "reminded",
      sent: hasSuccessfulToolCall(sliced_2, SEND_USER_FILE_TOOL_NAME),
      textLength: collectUserFacingTexts(sliced_2).join("").trim().length,
    };
  }
  let s = [getOutputsRoot(), getHomeFilesRoot(), "/tmp"],
    regExp = new RegExp(
      `\\]\\(<?(?:computer://|file://)?((?:${s.map(urlPatternToRegex).join("|")})/[^\\s)>]{1,500})`,
      "g",
    ),
    y = new Map();
  for (let M of collectUserFacingTexts(sliced)) {
    let R = replaceInlineCode(M.replace(/(```|~~~)[\s\S]*?(?:\1|$)/g, ""), () => "");
    for (let [, T = ""] of R.matchAll(regExp)) {
      let w = T;
      try {
        w = decodeURIComponent(T);
      } catch {}
      if (!w.includes("/.") && /\.[a-z0-9]+$/i.test(w)) y.set(posix.basename(w), T);
    }
  }
  for (let M of y.size > 0 ? e : []) {
    if (M.type !== "assistant") continue;
    for (let R of M.message.content) {
      if (
        R.type !== "tool_use" ||
        R.name !== SEND_USER_FILE_TOOL_NAME ||
        typeof R.input !== "object" ||
        R.input === null ||
        !("files" in R.input)
      )
        continue;
      let T = readUntrustedArray(R.input.files) ?? [R.input.files];
      for (let w of T === Uf ? [] : T) if (typeof w === "string") y.delete(posix.basename(w));
    }
  }
  if (y.size === 0) return { kind: "skip" };
  let joined = [...y.values()].slice(0, 5).map(escapeForTag).join(", ");
  return {
    kind: "remind",
    text: `${nXt} ${joined}. The user did not write this note and cannot see it. It is about your reply above only. A link to a file that you did not send may not open for them. If they should have a file, call ${SEND_USER_FILE_TOOL_NAME} with it now, then say in one short line that you sent it, or that the send failed. If they should have none, end your turn with no text. Do not repeat your reply, and do not mention this note.`,
  };
}
//@ chunk-ha3km179.js:74891-74973 placement = buildTranscriptEntries (0.777)
function isQueuedCommandAttachment(message) {
  return message.type === "attachment" && message.attachment.type === "queued_command";
}
//@ chunk-ha3km179.js:74973-75098 placement
function isReminderMessage(e) {
  return (
    e.type === "user" &&
    e.isMeta === !0 &&
    typeof e.message.content === "string" &&
    e.message.content.startsWith(nXt)
  );
}
/**
 * 收集助手文本块与 SendUserMessage 调用的 message 文本。旧版名 collectRecentSuccessfulTools 为错配；归属存疑。
 */
//@ chunk-ha3km179.js:75098-75409 placement = collectRecentSuccessfulTools (0.869)
function collectUserFacingTexts(e) {
  let n = [];
  for (let r of e) {
    if (r.type !== "assistant") continue;
    for (let block of r.message.content)
      if (block.type === "text") n.push(block.text);
      else if (
        block.type === "tool_use" &&
        block.name === BRIEF_TOOL_NAME &&
        typeof block.input === "object" &&
        block.input !== null &&
        "message" in block.input &&
        typeof block.input.message === "string"
      )
        n.push(block.input.message);
  }
  return n;
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
  Xl,
  Jl,
  shouldPreemptPromptTooLong,
  Ur,
  si,
  lastTurnReminderState,
  Nr,
  runBookkeepingSafe,
  nd,
};
