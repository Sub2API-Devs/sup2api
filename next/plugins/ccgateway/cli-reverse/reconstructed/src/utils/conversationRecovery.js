/**
 * utils/conversationRecovery.ts
 *
 * 恢复会话：加载转录（最新/指定/fork）、反序列化与旧附件迁移、检测被打断的轮次并补续写提示，恢复技能状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/conversationRecovery.ts
 * pieces: chunk-0yw3taqg.js (3), chunk-5xgkngpb.js (58), chunk-frs14hy1.js (4)
 * attribution: sole-consumer 1, fingerprint 5, placement 57, file-local 1, callgraph-witnessed 1
 */
import { stat } from "fs/promises";
import { relative, join } from "path";
import {
  loadSessionTranscript,
  sessionLogFromTranscriptLoad,
  currentTranscriptStore,
  fetchLogs,
  findFirstMessageLog,
  getSessionIdFromLog,
  toTranscriptEntries,
  isLiteLog,
  loadFullLog,
  checkResumeConsistency,
  findDeferredToolMarkerInTranscript,
  getCurrentSessionTitle,
  applyResumeHookSessionTitle,
  wrapStorageSource,
  getTranscriptStorageContext,
} from "./sessionStorage.js";
import { metaMessageText } from "../services/compact/compact.js";
import { env } from "./env.js";
import { classifyTailMessage, reportResumeLoad } from "./transcript/resumeLoadReport.js";
import { logError } from "./log.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getSessionId, getOriginalCwd } from "../bootstrap/state.js";
import { logForDebugging } from "./debug.js";
import { singleToolResultId, wakeupDedupKey, WAKEUP_ORIGIN_TTL_MS } from "./promptSource.js";
import {
  OBSOLETE_ATTACHMENT_TYPES,
  isQueueTranscriptOnlyUserMessage,
  dropRetractedMessages_2,
  dropMalformedAttachments,
  restoreInvokedSkills,
  deserializeMessagesImpl,
  findLastUserPromptUuid,
  ResumeRefusedError,
  isInterruptMarkerRow,
  isRealPromptAt,
} from "./transcript/deserialize.js";
import { getCwdOrNull } from "./cwd.js";
import { isContextAppendMessage, isHarnessMetaMessage } from "./messages.js";
import { isUnattendedStartUnconfirmed } from "./transcript/turnClassification.js";
import { isClaudeAiChatRemote, isAgentSdkEntrypoint } from "./entrypointKinds.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
} from "../services/analytics/growthbook.js";
import { TENGU_STEADY_SCROLL } from "../services/api/withRetry.js";
import { logEvent } from "../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../services/analytics/safeMetadata.js";
import { isFoamySpringEnabled } from "../services/analytics/growthbookGates.js";
import { isRemoteToolsForwardEnabled } from "../bridge/deviceRegistration.js";
import { identityAgentId } from "./agentId.js";
import { errorMessage, getErrnoCode, withTelemetryMessage, toError } from "./errors.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { isValidAdoptedSessionId } from "./background/adopt.js";
import { copyPlanForResume } from "./plans.js";
import { copyFileHistoryForResume } from "./fileHistory.js";
import { censusResumeAnnouncements } from "./transcript/resumeAnnouncements.js";
import { codeModeAccepted } from "./codeMode/accepted.js";
import { stripToolUseIdBookkeeping } from "./transcript/entryTypes.js";
import { withDeadline } from "./sleep.js";
import { startHookRun, processSessionStartHooks, takePendingHookSessionTitle } from "./sessionStart.js";
import { getSessionIdentity } from "./shutdown/pendingWrites.js";
import { recordPhase } from "./startupTiming.js";
import { withEndedByModel, getEndedByModel } from "../tasks/endedByModel.js";
import { isTranscriptLoadError } from "./transcript/transcriptFiles.js";
import { getWorktreePaths } from "./getWorktreePaths.js";
import { findProjectDirs, findSoleTranscriptWithMessagesById } from "./sessionStoragePortable.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { stripAnyVersatileSuffix } from "./model/modelIds.js";
import { MAX_PROGRESS_ENTRIES } from "../services/AgentSummary/agentSummary.js";
import {
  interruptedPromptUuid,
  countUserPromptsFromEntries_5,
  disallowedToolsFromMessages,
} from "../cli/print/wakeRouter.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:524361-524616 placement
/**
 * 由加载结果构造某会话的完整日志：选最新叶子建对话链，附带标题、tag、PR、模式、worktree、文件历史、署名、内容替换等元数据。
 */
async function getLastSessionLog(sessionId, host, storageV5, precedingEntries) {
  let sessionTranscript = await loadSessionTranscript(sessionId, host, storageV5, precedingEntries);
  let { sessionFile, v5Read } = sessionTranscript;
  let sessionLog = await sessionLogFromTranscriptLoad(sessionId, sessionTranscript, {
    path: sessionFile,
    modifiedAt: async () =>
      v5Read !== undefined ? new Date(v5Read.mtimeMs) : (await stat(sessionFile)).mtime,
  });
  if (sessionLog !== null && precedingEntries?.length)
    currentTranscriptStore().primeFilelessResume(
      sessionId,
      precedingEntries.map((entry) => entry.uuid),
    );
  return sessionLog;
}
//@ chunk-5xgkngpb.js:1698256-1698506 fingerprint (2.1.88 match: restoreSkillStateFromMessages, 0.717)
/**
 * 判断某技能内容在历史里以正文（body）还是 invoked_skills 附件（attachment）形式出现，都没有返回 null。
 */
function restoreSkillStateFromMessages(messages, target) {
  let anyAttached = false;
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message.type === "attachment") {
      let attachment = message.attachment;
      if (
        !anyAttached &&
        attachment.type === "invoked_skills" &&
        attachment.skills.some((skill) => skill.content === target)
      )
        anyAttached = true;
      continue;
    }
    if (metaMessageText(message) === target) return "body";
  }
  return anyAttached ? "attachment" : null;
}
//@ chunk-5xgkngpb.js:1884786-1884918 placement
/**
 * 已知的 stop_reason 值。
 */
var STOP_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakMap_10;
deferInit("chunk-5xgkngpb.js:1884786", () => {
  STOP_REASONS = [
    "end_turn",
    "tool_use",
    "max_tokens",
    "stop_sequence",
    "pause_turn",
    "refusal",
    "model_context_window_exceeded",
  ];
  weakMap_10 = new WeakMap();
});
//@ chunk-5xgkngpb.js:1884918-1885704 placement
/**
 * 加载会话时记录 transcript 尾部诊断（最后几行类型、最后提示位置、停止原因）。
 */
function recordTailDiagnostics(session, messages, isPromptBoundary, isRealMessage, baseFields, force) {
  if (!env.CLAUDE_CODE_DIAGNOSTICS_FILE && !force) return;
  try {
    let tailRows = [];
    let rowsAfterTail = 0;
    let sawSynthetic = false;
    let lastPromptIndex = messages.length - 1;
    for (; lastPromptIndex >= 0; lastPromptIndex--) {
      let message = messages[lastPromptIndex];
      if (message.isSidechain) continue;
      if (message.type !== "user" && message.type !== "assistant") {
        rowsAfterTail += tailRows.length === 0 ? 1 : 0;
        continue;
      }
      if (tailRows.length < 3) tailRows.push(message);
      if (message.type === "user") {
        if (isPromptBoundary(message)) break;
        sawSynthetic ||= !isRealMessage(message);
      }
    }
    for (let idx = lastPromptIndex - 1; idx >= 0 && tailRows.length < 3; idx--) {
      let message = messages[idx];
      if (!message.isSidechain && (message.type === "user" || message.type === "assistant"))
        tailRows.push(message);
    }
    let timestamp = Date.parse(tailRows[0]?.timestamp ?? "");
    weakMap_10.set(session, {
      ...baseFields,
      tailRows: [
        classifyTailMessage(tailRows[0]),
        classifyTailMessage(tailRows[1]),
        classifyTailMessage(tailRows[2]),
      ],
      rowsAfterTail,
      lastReplyStopReason: stopReasonOf(
        tailRows.find(
          (row) => row.type === "assistant" && classifyTailMessage(row) !== "assistant_synthetic",
        ),
      ),
      tailWrittenAtMs: Number.isFinite(timestamp) ? timestamp : undefined,
      lastPromptUuid: messages[lastPromptIndex]?.uuid,
      lastPromptOpensLastTurn: lastPromptIndex >= 0 && !sawSynthetic,
      rowsAfterLastPrompt: messages.length - 1 - lastPromptIndex,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:1885704-1885756 placement
/**
 * 按对象查 WeakMap 里的缓存值。
 */
function weakMapLookup(session) {
  return session === undefined ? undefined : weakMap_10.get(session);
}
//@ chunk-5xgkngpb.js:1885756-1885783 placement
/**
 * 尾部过旧的判定阈值（5 分钟）。
 */
var TAIL_TOO_OLD_MS = 300000;
var MAX_RESUME_TAIL_AGE_MS = 3600000;
//@ chunk-5xgkngpb.js:1885783-1886572 placement
/**
 * 续接诊断遥测字段（尾部行、停止原因、无结果的工具调用等）。
 */
function tailDiagnosticsFields(diagnostics, context) {
  if (
    diagnostics === undefined ||
    (diagnostics.lastPromptUuid !== undefined && diagnostics.lastPromptUuid !== context.uuid)
  )
    return;
  let ageMs =
    diagnostics.tailWrittenAtMs === undefined || diagnostics.tailWrittenAtMs > context.nowMs
      ? undefined
      : context.nowMs - diagnostics.tailWrittenAtMs;
  if (ageMs !== undefined && ageMs >= MAX_RESUME_TAIL_AGE_MS) return;
  return {
    finished_because: diagnostics.because,
    stored_tail_row: diagnostics.tailRows[0],
    stored_row_before_tail: diagnostics.tailRows[1],
    stored_row_2_before_tail: diagnostics.tailRows[2],
    rows_after_tail: diagnostics.rowsAfterTail,
    last_reply_stop_reason: diagnostics.lastReplyStopReason,
    ...(ageMs !== undefined && {
      stored_tail_age_ms: ageMs,
    }),
    tool_calls_without_result: diagnostics.callsWithoutResult,
    api_error_stepped_over: diagnostics.apiErrorSteppedOver,
    invisible_reply_dropped: diagnostics.invisibleReplyDropped,
    last_prompt: diagnostics.lastPromptUuid === undefined ? "none_loaded" : "this_message",
    rows_after_last_prompt: diagnostics.rowsAfterLastPrompt,
    commands_dequeued: context.commandsDequeued,
    could_send_result: classifyTranscriptTail(diagnostics, ageMs, context),
  };
}
//@ chunk-5xgkngpb.js:1886572-1887332 placement
/**
 * 判断转录尾部状态（最后提示未加载、工具调用无结果等）。
 */
function classifyTranscriptTail(diagnostics, ageMs, context) {
  if (diagnostics.lastPromptUuid === undefined) return "last_prompt_not_loaded";
  if (!diagnostics.lastPromptOpensLastTurn) return "another_turn_may_follow";
  if (diagnostics.callsWithoutResult > 0) return "tool_call_without_result";
  let [firstRow] = diagnostics.tailRows;
  if (firstRow === "assistant_synthetic") return "tail_written_by_cli";
  if (diagnostics.because !== "reply" && diagnostics.because !== "terminal_tool_result")
    return "tail_not_a_reply";
  if (firstRow === "assistant_text") {
    if (diagnostics.lastReplyStopReason !== "end_turn" && diagnostics.lastReplyStopReason !== "stop_sequence")
      return "reply_not_ended";
  } else if (diagnostics.because !== "terminal_tool_result" || firstRow !== "user_tool_result")
    return "tail_not_a_reply";
  if (ageMs === undefined || ageMs >= TAIL_TOO_OLD_MS) return "tail_too_old";
  if (context.commandsDequeued > 0) return "process_dequeued_a_command";
  if (context.rerunOwed) return "rerun_owed";
  return context.shuttingDown ? "shutting_down" : "yes";
}
//@ chunk-5xgkngpb.js:1887332-1887496 placement
/**
 * 助手消息的停止原因类别。
 */
function stopReasonOf(message) {
  if (message === undefined) return "no_reply_in_tail";
  let stopReason = message.message?.stop_reason;
  if (stopReason === undefined || stopReason === null) return "not_stored";
  return STOP_REASONS.find((knownReason) => knownReason === stopReason) ?? "other";
}
//@ chunk-5xgkngpb.js:1887496-1887572 placement
/**
 * 会话恢复的指标状态（计数、发送者与已报告标记）。
 */
class ConversationRecoveryMetrics {
  counts = undefined;
  sender = undefined;
  contentPaintSent = false;
  promptIdleSent = false;
}
//@ chunk-5xgkngpb.js:1887572-1887599 placement
/**
 * 按宿主隔离的会话恢复指标。
 */
var conversationRecoveryMetricsByHost; // deferred: uses ConversationRecoveryMetrics of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1887572", () => {
  conversationRecoveryMetricsByHost = new HostScoped(() => new ConversationRecoveryMetrics());
});
//@ chunk-5xgkngpb.js:1887599-1887638 placement
/**
 * 取出当前宿主的会话恢复指标。
 */
function getConversationRecoveryMetrics() {
  return conversationRecoveryMetricsByHost.of(getRootSession().host);
}
//@ chunk-5xgkngpb.js:1887638-1887669 placement
/**
 * 记录已加载与 JSONL 中的消息数。
 */
function setRecoveryCounts(counts) {
  getConversationRecoveryMetrics().counts = counts;
}
//@ chunk-5xgkngpb.js:1887669-1887700 placement
/**
 * 记录恢复消息的发送者。
 */
function setRecoverySender(sender) {
  getConversationRecoveryMetrics().sender = sender;
}
//@ chunk-5xgkngpb.js:1887700-1887919 placement
/**
 * 报告首次内容绘制（只一次）。
 */
function reportContentPaint(msgsRenderedAtFirstPaint) {
  let conversationRecoveryMetrics = getConversationRecoveryMetrics();
  if (conversationRecoveryMetrics.contentPaintSent || !conversationRecoveryMetrics.sender) return;
  if (
    conversationRecoveryMetrics.sender({
      kind: "content_paint",
      msgsRenderedAtFirstPaint,
      msgsLoaded: conversationRecoveryMetrics.counts?.msgsLoaded,
      msgsInJsonl: conversationRecoveryMetrics.counts?.msgsInJsonl,
    })
  )
    conversationRecoveryMetrics.contentPaintSent = true;
}
//@ chunk-5xgkngpb.js:1887919-1888059 placement
/**
 * 报告输入框空闲（内容绘制后，只一次）。
 */
function reportPromptIdle() {
  let conversationRecoveryMetrics = getConversationRecoveryMetrics();
  if (
    conversationRecoveryMetrics.promptIdleSent ||
    !conversationRecoveryMetrics.contentPaintSent ||
    !conversationRecoveryMetrics.sender
  )
    return;
  if (
    conversationRecoveryMetrics.sender({
      kind: "prompt_idle",
    })
  )
    conversationRecoveryMetrics.promptIdleSent = true;
}
//@ chunk-5xgkngpb.js:1888059-1888247 placement
var WORKER_RESTARTED_PROMPT_2 =
  "This session's worker process was restarted. If your previous turn was already complete, take no action and wait for the next event. Otherwise, continue from where you left off.";
//@ chunk-5xgkngpb.js:1888247-1889835 placement
/**
 * 会话迁移到新 runner 时的续接提示（长版）。
 */
var SESSION_MOVED_CONTINUE_PROMPT =
  "Continue from where you left off. This session moved to a new runner; files you created earlier may no longer exist, so verify the working directory state before relying on prior edits.";
var SESSION_MOVED_TAIL_PROMPT = `Continue from where you left off. This session moved to a new runner; files you created earlier may no longer exist, so verify the working directory state before relying on prior edits. If the result of a tool call above starts with "[Tool call interrupted", the runner that ran it stopped or lost its connection before the call's result was recorded. The call may have had nothing to do with that, or it may have caused it, for example by using too much memory. Before you run it again, check what it did and whether it could have brought the runner down; if it could, do the work another way.`;
var WORKER_RESTARTED_PROMPT = [
  "Continue from where you left off. This session moved to a new runner; files you created earlier may no longer exist, so verify the working directory state before relying on prior edits.",
  `Continue from where you left off. This session moved to a new runner; files you created earlier may no longer exist, so verify the working directory state before relying on prior edits. If the result of a tool call above starts with "[Tool call interrupted", the runner that ran it stopped or lost its connection before the call's result was recorded. The call may have had nothing to do with that, or it may have caused it, for example by using too much memory. Before you run it again, check what it did and whether it could have brought the runner down; if it could, do the work another way.`,
];
//@ chunk-5xgkngpb.js:1892374-1893114 placement
/**
 * 记录宿主分类器上下文（按消息与内容），恢复的消息降级、判断是否仍有效。
 */
class HostClassifierContextRegistry {
  #e = new Map();
  #t = 0;
  register(message) {
    let row = message;
    if (typeof row.hostClassifierContext !== "string" || row.uuid === undefined) return;
    let resultId = singleToolResultId(row);
    if (resultId === undefined) return;
    let key = wakeupDedupKey(row.uuid, resultId);
    if (!this.#e.has(key) && this.#e.size >= WAKEUP_ORIGIN_TTL_MS) {
      let oldestKey = this.#e.keys().next().value;
      if (oldestKey !== undefined) this.#e.delete(oldestKey);
    }
    this.#e.set(key, row.hostClassifierContext);
  }
  clear() {
    this.#e.clear();
    this.#t++;
  }
  getEpoch() {
    return this.#t;
  }
  degradeRestored(rows) {
    for (let row of rows) {
      let message = row;
      if (typeof message.hostClassifierContext !== "string" || message.uuid === undefined) continue;
      let resultId = singleToolResultId(message);
      if (resultId === undefined) continue;
      this.#e.delete(wakeupDedupKey(message.uuid, resultId));
    }
  }
  isLive(message) {
    let row = message;
    if (typeof row.hostClassifierContext !== "string" || row.uuid === undefined) return false;
    let resultId = singleToolResultId(row);
    if (resultId === undefined) return false;
    return this.#e.get(wakeupDedupKey(row.uuid, resultId)) === row.hostClassifierContext;
  }
}
//@ chunk-5xgkngpb.js:1893114-1893141 placement
/**
 * 按宿主隔离的分类器上下文注册表。
 */
var classifierContextByHost; // deferred: uses HostClassifierContextRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1893114", () => {
  classifierContextByHost = new HostScoped(() => new HostClassifierContextRegistry());
});
//@ chunk-5xgkngpb.js:1893141-1893180 placement
/**
 * 取出当前宿主的分类器上下文注册表。
 */
function getClassifierContextRegistry() {
  return classifierContextByHost.of(getRootSession().host);
}
//@ chunk-5xgkngpb.js:1893180-1893214 placement
/**
 * 登记一次分类器运行。
 */
function registerClassifiedRun(startId) {
  getClassifierContextRegistry().register(startId);
}
//@ chunk-5xgkngpb.js:1893214-1893243 placement
/**
 * 清空分类器上下文。
 */
function clearClassifierContext() {
  getClassifierContextRegistry().clear();
}
//@ chunk-5xgkngpb.js:1893243-1893282 placement
/**
 * 读取分类器上下文的代次。
 */
function getClassifierEpoch() {
  return getClassifierContextRegistry().getEpoch();
}
//@ chunk-5xgkngpb.js:1893282-1893323 placement
/**
 * 把恢复的消息标记为降级。
 */
function degradeRestoredMessages(messages) {
  getClassifierContextRegistry().degradeRestored(messages);
}
//@ chunk-5xgkngpb.js:1893323-1893362 placement
/**
 * 判断该分类器运行是否仍是活的。
 */
function isLiveClassifiedRun(message) {
  return getClassifierContextRegistry().isLive(message);
}
//@ chunk-5xgkngpb.js:1893362-1893415 placement
/**
 * 拼接 fork 标记（会话|边界时间|父会话）。
 */
function formatForkMarker(forkSessionId, boundaryAt, forkParentSessionId) {
  return `${forkSessionId}|${boundaryAt}${forkParentSessionId ? `|${forkParentSessionId}` : ""}`;
}
//@ chunk-5xgkngpb.js:1893415-1893591 placement
/**
 * 解析 fork 标记 “会话|边界时间|父会话”。
 */
function parseForkMarker(marker) {
  if (!marker) return null;
  let parts = marker.split("|");
  if (parts.length === 1)
    return {
      boundaryAt: marker,
    };
  return {
    ...(parts[0] && {
      sessionId: parts[0],
    }),
    boundaryAt: parts[1] ?? "",
    ...(parts[2] && {
      parentSessionId: parts[2],
    }),
  };
}
//@ chunk-5xgkngpb.js:1893591-1893843 placement
/**
 * fork 标记转为任务状态字段。
 */
function forkMarkerFields(marker) {
  let forkMarker = parseForkMarker(marker);
  if (forkMarker?.sessionId === undefined || !/^\d{4}-\d{2}-\d{2}T/.test(forkMarker.boundaryAt)) return null;
  return {
    forkSourceAlive: true,
    forkBoundaryAt: forkMarker.boundaryAt,
    forkSessionId: forkMarker.sessionId,
    ...(forkMarker.parentSessionId && {
      forkParentSessionId: forkMarker.parentSessionId,
    }),
  };
}
//@ chunk-5xgkngpb.js:1893843-1894043 placement
/**
 * 服务端工具类型的集合。
 */
var SERVER_TOOL_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SERVER_TOOL_TYPE_SET;
deferInit("chunk-5xgkngpb.js:1893843", () => {
  SERVER_TOOL_TYPES = {
    advisor: true,
    bash_code_execution: true,
    code_execution: true,
    text_editor_code_execution: true,
    tool_search_tool_bm25: true,
    tool_search_tool_regex: true,
    web_fetch: true,
    web_search: true,
  };
  SERVER_TOOL_TYPE_SET = new Set(Object.keys(SERVER_TOOL_TYPES));
});
//@ chunk-5xgkngpb.js:1894043-1894098 placement
/**
 * 判断字符串是否为服务端工具类型。
 */
function isServerToolType(name) {
  return typeof name === "string" && SERVER_TOOL_TYPE_SET.has(name);
}
//@ chunk-5xgkngpb.js:1894098-1894143 placement
/**
 * 不支持的工具内容被移除时的占位文本。
 */
var UNSUPPORTED_TOOL_CONTENT_TEXT = "[Unsupported tool content removed]";
//@ chunk-5xgkngpb.js:1902960-1903300 fingerprint (2.1.88 match: migrateLegacyAttachmentTypes, 0.511)
/**
 * 迁移旧版附件：删除已废弃类型，给缺 displayPath 的附件补相对路径。
 */
function migrateLegacyAttachmentTypes(message) {
  if (message.type !== "attachment") return message;
  let attachment = message.attachment;
  if (OBSOLETE_ATTACHMENT_TYPES.has(attachment.type)) return null;
  if (!("displayPath" in attachment)) {
    let path =
      typeof attachment.filename === "string"
        ? attachment.filename
        : typeof attachment.path === "string"
          ? attachment.path
          : typeof attachment.skillDir === "string"
            ? attachment.skillDir
            : undefined;
    if (path) {
      let cwdOrNull = getCwdOrNull();
      return {
        ...message,
        attachment: {
          ...attachment,
          displayPath: cwdOrNull === null ? path : relative(cwdOrNull, path),
        },
      };
    }
  }
  return message;
}
//@ chunk-5xgkngpb.js:1903300-1903570 file-local
/**
 * 去掉 text 字段不是字符串的文本块。
 */
function dropMalformedTextBlocks(message) {
  if (message.type !== "assistant" && message.type !== "user") return null;
  let content = message.message.content;
  if (!Array.isArray(content)) return null;
  let filtered = content.filter((block) => block.type !== "text" || typeof block.text === "string");
  if (filtered.length === content.length) return null;
  return {
    ...message,
    message: {
      ...message.message,
      content: filtered,
    },
  };
}
//@ chunk-5xgkngpb.js:1903570-1903614 fingerprint (2.1.88 match: deserializeMessagesWithInterruptDetection, 0.345)
/**
 * 恢复被打断轮次时追加的用户提示 "Continue from where you left off."。
 */
var deserializeMessagesWithInterruptDetection = "Continue from where you left off.";
//@ chunk-5xgkngpb.js:1903614-1903669 placement
/**
 * 续接提示的环境变量覆盖（未设置时用默认反序列化）。
 */
function resumePromptOverride() {
  return env.CLAUDE_CODE_RESUME_PROMPT || deserializeMessagesWithInterruptDetection;
}
//@ chunk-5xgkngpb.js:1903669-1903717 placement
/**
 * 续接原因的合法形式（小写字母与下划线，最多 64）。
 */
var INTERRUPTED_TURN = "interrupted_turn";
var RESUME_REASON_RE = /^[a-z_]{1,64}$/;
//@ chunk-5xgkngpb.js:1903717-1903803 placement
/**
 * 从环境变量读取合法的续接原因。
 */
function resumeReasonFromEnv() {
  let CLAUDE_CODE_RESUME_REASON = env.CLAUDE_CODE_RESUME_REASON;
  return CLAUDE_CODE_RESUME_REASON !== undefined && RESUME_REASON_RE.test(CLAUDE_CODE_RESUME_REASON)
    ? CLAUDE_CODE_RESUME_REASON
    : INTERRUPTED_TURN;
}
//@ chunk-5xgkngpb.js:1903803-1904029 placement
/**
 * 某 uuid 是否为最后一条有效消息。
 */
function isTailMessage(messages, uuid) {
  if (uuid === undefined) return false;
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message.type !== "user" && message.type !== "assistant") continue;
    if (message.uuid === uuid) return true;
    if (
      !isContextAppendMessage(message) &&
      !isQueueTranscriptOnlyUserMessage(message) &&
      !(message.type === "assistant" && isUnattendedStartUnconfirmed(message))
    )
      return false;
  }
  return false;
}
//@ chunk-5xgkngpb.js:1904029-1904187 placement
/**
 * CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS 的值。
 */
function envResumeMaxAge() {
  let rawValue = env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS;
  if (!rawValue) return;
  let parsed = Number(rawValue);
  if (parsed === 0) return 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3600000;
}
//@ chunk-5xgkngpb.js:1904187-1904436 placement
/**
 * 远程会话中断回合自动续接的时间上限（环境变量或开关）。
 */
function interruptedTurnResumePolicy(isRemote) {
  if (isRemote && isClaudeAiChatRemote() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_rosy_puddle", true))
    return;
  let envMaxAge = envResumeMaxAge();
  if (envMaxAge !== undefined)
    return envMaxAge
      ? {
          maxAgeMs: envMaxAge,
          source: "env",
        }
      : undefined;
  if (isRemote || !isClaudeAiChatRemote() || isAgentSdkEntrypoint()) return;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_STEADY_SCROLL, null);
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    featureValue_CACHED_MAY_BE_STALE >= MIN_RESUME_AGE_MS &&
    featureValue_CACHED_MAY_BE_STALE <= MAX_RESUME_AGE_MS
    ? {
        maxAgeMs: featureValue_CACHED_MAY_BE_STALE,
        source: "flag",
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:1904436-1904467 placement
/**
 * 续接年龄下限（90 分钟）。
 */
var MIN_RESUME_AGE_MS = 5400000;
var MAX_RESUME_AGE_MS = 2592000000;
//@ chunk-5xgkngpb.js:1904467-1904543 placement
/**
 * 判断最后一条消息是否已超过续接年龄。
 */
function isResumeTooOld(messages, maxAgeMs = envResumeMaxAge()) {
  if (!maxAgeMs) return false;
  let ageMs = lastMessageAgeMs(messages);
  return ageMs === undefined || ageMs >= maxAgeMs;
}
//@ chunk-5xgkngpb.js:1904543-1904780 placement (2.1.88 match: countUnseenAssistantTurns, 0.811)
/**
 * 最后一条有效消息距今的毫秒数。
 */
function lastMessageAgeMs(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (
      message.type === "system" ||
      message.type === "progress" ||
      isContextAppendMessage(message) ||
      isQueueTranscriptOnlyUserMessage(message) ||
      (message.type === "assistant" && isUnattendedStartUnconfirmed(message))
    )
      continue;
    let timestamp = Date.parse(message.timestamp ?? "");
    if (Number.isFinite(timestamp)) return Date.now() - timestamp;
  }
  return;
}
//@ chunk-5xgkngpb.js:1904780-1904852 placement
/**
 * 拒答重试的默认年龄上限（6 小时）。
 */
var DEFAULT_REFUSAL_RETRY_AGE_MS = 21600000;
var TENGU_SHIMMERING_CHERNY = "tengu_shimmering_cherny";
var MIN_REFUSAL_RETRY_AGE_MS = 60000;
var MAX_REFUSAL_RETRY_AGE_MS = 2592000000;
//@ chunk-5xgkngpb.js:1904852-1905064 placement
/**
 * 拒答重试的时间上限（环境变量、开关或默认）。
 */
function refusalRetryMaxAge() {
  let envMaxAge = envResumeMaxAge();
  if (envMaxAge)
    return {
      maxAgeMs: envMaxAge,
      source: "env",
    };
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SHIMMERING_CHERNY, null);
  if (
    typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE >= MIN_REFUSAL_RETRY_AGE_MS &&
    featureValue_CACHED_MAY_BE_STALE <= MAX_REFUSAL_RETRY_AGE_MS
  )
    return {
      maxAgeMs: featureValue_CACHED_MAY_BE_STALE,
      source: "flag",
    };
  return {
    maxAgeMs: DEFAULT_REFUSAL_RETRY_AGE_MS,
    source: "default",
  };
}
//@ chunk-5xgkngpb.js:1905064-1905168 placement (2.1.88 match: sanitizePath, 0.708)
/**
 * 消息时间是否早于 n 毫秒前（无时间视为旧）。
 */
function isOlderThan(message, maxAgeMs) {
  let timestamp = Date.parse(message.timestamp ?? "");
  return !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) >= maxAgeMs;
}
//@ chunk-5xgkngpb.js:1905168-1905367 placement
/**
 * 取时间较新的消息。
 */
function newerMessage(skippedApiErrorRow, skippedApiErrorRow_2) {
  if (skippedApiErrorRow === undefined || skippedApiErrorRow_2 === undefined)
    return skippedApiErrorRow ?? skippedApiErrorRow_2;
  let timestamp = Date.parse(skippedApiErrorRow.timestamp ?? "");
  let timestamp_2 = Date.parse(skippedApiErrorRow_2.timestamp ?? "");
  if (!Number.isFinite(timestamp)) return skippedApiErrorRow;
  if (!Number.isFinite(timestamp_2)) return skippedApiErrorRow_2;
  return timestamp_2 > timestamp ? skippedApiErrorRow_2 : skippedApiErrorRow;
}
//@ chunk-5xgkngpb.js:1905367-1906225 placement
/**
 * 恢复中断的回合（打印模式、REPL 恢复、合成继续、重新提交）。
 */
function resumeInterruptedTurn(
  surface,
  message,
  { deferred, pendingActionClass, cutOffAgentCalls, tail, cutOffMidWork } = {},
) {
  logEvent("tengu_resume_interrupted_turn", {
    surface: surface === "print" ? lit_2("print") : lit_2("repl_restore"),
    kind: message.isMeta ? lit_2("synthetic_continue") : lit_2("resubmit"),
    ...(deferred !== undefined && {
      deferred,
    }),
    ...(pendingActionClass !== undefined && {
      pending_action_class: pendingActionClass,
    }),
    ...(cutOffAgentCalls !== undefined && {
      cut_off_agent_calls: cutOffAgentCalls,
    }),
    ...(cutOffMidWork !== undefined && {
      cut_off_mid_work: cutOffMidWork,
    }),
    ...(tail !== undefined && {
      tail_kind: fromEnum(tail.kind),
      api_error_stepped_over: tail.apiErrorSteppedOver,
      invisible_reply_dropped: tail.invisibleReplyDropped,
      ...(tail.ageMinutes !== undefined && {
        tail_age_min: tail.ageMinutes,
      }),
      ...(tail.shutdownStamped !== undefined && {
        tail_shutdown_stamped: tail.shutdownStamped,
      }),
      ...(tail.cutOffCalls !== undefined && {
        cut_off_calls_shown: tail.cutOffCalls.shown,
        cut_off_calls_hidden: tail.cutOffCalls.hidden,
        cut_off_calls_answered_in_turn: tail.cutOffCalls.inTurn,
        repeats_previous_cut_off_call: tail.cutOffCalls.repeatsPrevious,
      }),
    }),
  });
}
//@ chunk-5xgkngpb.js:1906225-1906252 placement
/**
 * 续接时是否显示被截断的工具调用。
 */
function isCutOffPreviewEnabled() {
  return isFoamySpringEnabled();
}
//@ chunk-5xgkngpb.js:1906252-1906378 placement
/**
 * 是否在续接时显示被截断的工具调用。
 */
function showsCutOffCalls() {
  return (
    env.CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS === true &&
    isCutOffPreviewEnabled() &&
    !isRemoteToolsForwardEnabled() &&
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_mutable_phoenix_killswitch", false)
  );
}
//@ chunk-5xgkngpb.js:1906378-1906462 placement
/**
 * 判断尾消息是否为带截断调用的中断提示。
 */
function isInterruptedTail(state) {
  return state?.kind === "interrupted_prompt" && state.tail?.cutOffCalls !== undefined;
}
//@ chunk-5xgkngpb.js:1906462-1906475 placement
/**
 * 探测可续接日志时的等待时长（2 秒）。
 */
var RESUME_LOG_PROBE_MS = 2000;
//@ chunk-5xgkngpb.js:1931221-1932125 placement
/**
 * 找最近可续接的会话日志（跳过仍在后台运行的会话，发现被续接到运行中的会话时回调）。
 */
async function findLatestResumableLog({ storageV5, forkSession, onNewestRunningInBackground }) {
  let logs = fetchLogs(undefined, storageV5);
  let claimedSessionIds;
  let unprovableIds = new Set();
  try {
    let { listAllLiveSessions } = await import("./udsMessaging/SessionRecordsUnreadableError.lazy.js");
    let { ownPidDomain } = await import("./pidSpace.js");
    let [runningSessions, ownDomain] = await Promise.all([
      listAllLiveSessions(storageV5, {
        rejectUnreadable: true,
      }),
      ownPidDomain(),
    ]);
    if (
      runningSessions.every(
        (session) => session.kind === "interactive" || (session.kind && session.sessionId),
      )
    ) {
      claimedSessionIds = new Set();
      for (let session of runningSessions) {
        if (session.kind === "interactive" || !session.sessionId) continue;
        claimedSessionIds.add(session.sessionId);
        if (session.pidDomain !== undefined && session.pidDomain !== ownDomain)
          unprovableIds.add(session.sessionId);
      }
    }
  } catch {}
  return findFirstMessageLog(
    await logs,
    (logEntry) => {
      if (logEntry.bookkeepingOnly) return false;
      if (
        !forkSession &&
        logEntry.continuedInSessionId !== undefined &&
        claimedSessionIds?.has(logEntry.continuedInSessionId)
      ) {
        onNewestRunningInBackground?.({
          sessionId: logEntry.continuedInSessionId,
          provable: !unprovableIds.has(logEntry.continuedInSessionId),
        });
        return "stop";
      }
      if (logEntry.superseded) return false;
      if (forkSession) return true;
      let sessionIdFromLog = getSessionIdFromLog(logEntry);
      if (sessionIdFromLog !== undefined && claimedSessionIds?.has(sessionIdFromLog)) return false;
      if (
        claimedSessionIds === undefined &&
        (logEntry.sessionKind || logEntry.continuedInSessionId !== undefined)
      )
        return false;
      return true;
    },
    storageV5,
  );
}
//@ chunk-5xgkngpb.js:1932125-1937649 callgraph-witnessed (2.1.88 match: loadConversationForResume, 0.208)
/**
 * loadConversationForResume：按参数加载会话（最新一个/会话 id/转录路径/fork），反序列化、修复、检测中断，返回 messages、sessionId 与元数据；通知 onSessionResolved。
 */
async function loadConversationForResume(sessionRef, sessionArg, options) {
  let copyPromise;
  let startCopy = (sessionId, transcriptPath) => {
    let onSessionResolved = options.onSessionResolved;
    if (onSessionResolved === undefined) return;
    copyPromise ??= Promise.resolve()
      .then(() =>
        onSessionResolved({
          sessionId: identityAgentId(sessionId),
          transcriptPath,
        }),
      )
      .catch((error) => logForDebugging(`resume: onSessionResolved hook failed: ${errorMessage(error)}`));
  };
  let abandonCopy = () => {
    copyPromise?.then((result) => result?.()).catch(() => {});
  };
  try {
    let log = null;
    let messages = null;
    let isSameSession = false;
    let isChildFork = false;
    let sessionId;
    let unreadableErrno;
    let ranInBackground = false;
    if (sessionRef === undefined)
      log = await findLatestResumableLog({
        storageV5: options.storageV5,
        forkSession: options.forkSession,
        onNewestRunningInBackground: (info) => {
          ranInBackground = true;
          options.onNewestRunningInBackground?.(info);
        },
      });
    else if (sessionArg && typeof sessionRef === "string") {
      log = await getLastSessionLog(sessionRef, sessionArg, options.storageV5);
      sessionId = log?.messages.at(-1)?.sessionId ?? log?.sessionId ?? sessionRef;
    } else if (typeof sessionRef === "string") {
      let precedingCount = options.precedingRows?.rows.length
        ? toTranscriptEntries(options.precedingRows.rows, sessionRef)
        : undefined;
      log =
        (await getLastSessionLog(sessionRef, undefined, options.storageV5, precedingCount)) ??
        (await findLogInWorktrees(sessionRef, options.storageV5)) ??
        (await findLogById(sessionRef, options.storageV5));
      sessionId = sessionRef;
    } else log = sessionRef;
    if (!log && !messages) {
      logFeatureSad("session_resume", ranInBackground ? "running_in_background" : "not_found");
      return null;
    }
    if (log) {
      if (isLiteLog(log))
        log = await loadFullLog(log, {
          onTranscriptUnreadable: (errno) => {
            unreadableErrno = errno;
          },
          storageV5: options.storageV5,
        });
      if (!sessionId) sessionId = getSessionIdFromLog(log);
      options.beforeUse?.(log, sessionId);
      let targetSessionId = isValidAdoptedSessionId(sessionId, options) ? sessionId : undefined;
      let copyTargetSessionId = options.forkSession ? undefined : targetSessionId;
      if (sessionId) {
        startCopy(sessionId, log.fullPath);
        if (copyPromise === undefined) await copyPlanForResume(log, targetSessionId, options.storageV5);
        else await Promise.all([copyPlanForResume(log, targetSessionId, options.storageV5), copyPromise]);
      }
      let id = parseForkMarker(env.CLAUDE_CODE_RESUME_SOURCE_ALIVE);
      let ownSessionId = sessionId ?? getSessionId();
      isSameSession =
        id !== null &&
        (id.sessionId === undefined || id.sessionId === ownSessionId || id.parentSessionId === ownSessionId);
      isChildFork = options.forkSession && id?.parentSessionId === ownSessionId;
      if (!isSameSession) copyFileHistoryForResume(log, copyTargetSessionId, options.storageV5);
      messages = log.messages;
      checkResumeConsistency(messages);
      censusResumeAnnouncements(messages, log.fileSize);
    }
    let msgsInJsonl = messages?.length ?? 0;
    messages = dropRetractedMessages_2(messages);
    messages = dropMalformedAttachments(messages);
    if (codeModeAccepted()) for (let message of messages) stripToolUseIdBookkeeping(message);
    restoreInvokedSkills(messages);
    let fullPath = log?.fullPath ?? sessionArg;
    let deferredToolUse = fullPath
      ? ((await findDeferredToolMarkerInTranscript(fullPath, options.storageV5)) ?? undefined)
      : undefined;
    let copiedSessionOwnId = options.copiedSessionOwnId;
    let deferredMatch =
      deferredToolUse === undefined ||
      copiedSessionOwnId === undefined ||
      messages.some(
        (message) =>
          message.type === "assistant" &&
          "sessionId" in message &&
          message.sessionId === copiedSessionOwnId &&
          Array.isArray(message.message.content) &&
          message.message.content.some(
            (block) => block.type === "tool_use" && block.id === deferredToolUse.toolUseID,
          ),
      )
        ? deferredToolUse
        : undefined;
    let msgsLoaded = messages.length;
    let stored = messages;
    let uuid = messages.at(-1)?.uuid;
    let uuidInPreceding =
      options.precedingRows?.first === true && options.precedingRows.rows.some((row) => row.uuid === uuid);
    if (env.CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS === true)
      await withDeadline(
        initializeGrowthBook().catch(() => null),
        RESUME_LOG_PROBE_MS,
      );
    let deserialized = deserializeMessagesImpl(
      messages,
      deferredMatch ? new Set([deferredMatch.toolUseID]) : undefined,
      options.replyOnResume,
      log?.rewindAnchorUuid ??
        options.precedingRows?.rows.findLast(
          (message) => message.type === "user" || message.type === "assistant",
        )?.uuid,
      options.resumeInterruptedTurn,
      isChildFork,
      options.hostAnswerableToolUseIds,
      options.restoredCardToolUseId,
      options.hostLogsFinishedTail,
      options.restoredPromptWaits,
      options.copiedSessionOwnId === undefined
        ? undefined
        : {
            ownSessionId: options.copiedSessionOwnId,
          },
      options.showsCutOffAgentCalls,
    );
    messages = deserialized.messages;
    if (log) {
      let turnInterruptionState = deserialized.turnInterruptionState;
      reportResumeLoad({
        log,
        stored,
        verdict:
          turnInterruptionState.kind === "none"
            ? "none"
            : turnInterruptionState.message.isMeta
              ? "continue"
              : "resubmit",
        rescueSuppressed: deserialized.rescueSuppressed,
        rewound: log.rewindAnchorUuid !== undefined,
        autoResume: Boolean(options.resumeInterruptedTurn ?? env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN),
        openerVouched:
          turnInterruptionState.kind !== "none" &&
          (!turnInterruptionState.message.isMeta ||
            turnInterruptionState.interruptedTurnUserMessageUuid !== undefined),
        supersededCalls: deserialized.supersededToolUseIds.size,
        cutOffCalls:
          turnInterruptionState.kind !== "none" && turnInterruptionState.tail?.cutOffCalls !== undefined
            ? {
                tailKind: turnInterruptionState.tail.kind,
                ...turnInterruptionState.tail.cutOffCalls,
              }
            : undefined,
        isTypedPrompt: (message) => findLastUserPromptUuid([message]) === message.uuid,
      });
    }
    let startTime = performance.now();
    let orphaned =
      options.forkSession ||
      uuidInPreceding ||
      (sessionId !== undefined && !isValidAdoptedSessionId(sessionId, options))
        ? "fork"
        : "resume";
    let resumedMessages = messages;
    let resumeSessionId =
      !options.forkSession && isValidAdoptedSessionId(sessionId, options) ? sessionId : getSessionId();
    let progress = {
      rows: [],
      additionalContexts: [],
      isOvertaken: false,
      lateInitialUserMessage: undefined,
    };
    let { sessionStartHooksWaitFor } = options;
    let hookRun = startHookRun("tail", (hookAbort) =>
      processSessionStartHooks(getSessionIdentity(), orphaned, {
        sessionId: resumeSessionId,
        sessionTitle: getCurrentSessionTitle(getSessionId()) ?? (isChildFork ? undefined : log?.customTitle),
        resumedMessages,
        orphaned: hookAbort,
        progress,
        holdHooksUntil:
          sessionStartHooksWaitFor &&
          (async () => {
            await sessionStartHooksWaitFor(hookAbort);
            startTime = performance.now();
          }),
        storageV5: options.storageV5,
        credentials: options.credentials,
      }).then((hooksResult) => {
        if (hookAbort.aborted) return hooksResult;
        recordPhase("hooks_init_ms", performance.now() - startTime, startTime);
        let pendingTitle = takePendingHookSessionTitle();
        if (pendingTitle) applyResumeHookSessionTitle(pendingTitle, resumeSessionId, options.storageV5);
        return hooksResult;
      }),
    );
    setRecoveryCounts({
      msgsLoaded,
      msgsInJsonl,
    });
    if (unreadableErrno !== undefined)
      logFeatureSad("session_resume", "transcript_unreadable", {
        errno: unreadableErrno,
      });
    else logFeatureOk("session_resume");
    let resolvedCopy = {
      messages,
      sessionStartHooks: {
        ...hookRun,
        progress,
      },
      turnInterruptionState: deserialized.turnInterruptionState,
      supersededToolUseIds: deserialized.supersededToolUseIds,
      supersededToolNames: deserialized.supersededToolNames,
      answeredToolUseIds: deserialized.answeredToolUseIds,
      rescueSuppressed: deserialized.rescueSuppressed,
      deferredToolUse: deferredMatch,
      fileHistorySnapshots: isSameSession ? undefined : log?.fileHistorySnapshots,
      attributionSnapshots: log?.attributionSnapshots,
      contentReplacements: log?.contentReplacements,
      sessionId,
      agentName: isChildFork ? undefined : log?.agentName,
      agentColor: log?.agentColor,
      agentSetting: log?.agentSetting,
      customTitle: isChildFork ? undefined : log?.customTitle,
      ...withEndedByModel({}, getEndedByModel(log)),
      aiTitle: isChildFork ? undefined : log?.aiTitle,
      tag: log?.tag,
      relocatedCwd: log?.relocatedCwd,
      projectPath: log?.projectPath,
      mode: log?.mode,
      permissionMode: log?.permissionMode,
      isolationLatch: log?.isolationLatch,
      devModsFolder: log?.devModsFolder,
      memoryModeStamps: log?.memoryModeStamps,
      atisLatch: log?.atisLatch,
      toolsUsed: log?.toolsUsed,
      worktreeSession: log?.worktreeSession,
      artifactCommentMonitor: log?.artifactCommentMonitor,
      artifactAutoReactLedger: log?.artifactAutoReactLedger,
      costState: log?.costState,
      prNumber: log?.prNumber,
      prUrl: log?.prUrl,
      prRepository: log?.prRepository,
      bridgeSessionId: log?.bridgeSessionId,
      bridgeLastSeq: log?.bridgeLastSeq,
      bridgeDialogKinds: log?.bridgeDialogKinds,
      bridgeSessionGroupingId: log?.bridgeSessionGroupingId,
      bridgeNoHistoryBackfill: log?.bridgeNoHistoryBackfill,
      bridgeOwnerAccountUuid: log?.bridgeOwnerAccountUuid,
      bridgeOwnerOrganizationUuid: log?.bridgeOwnerOrganizationUuid,
      sessionHistorySuppressed: log?.sessionHistorySuppressed,
      fullPath: log?.fullPath,
    };
    resolvedCopy.replMode = log?.replMode;
    resolvedCopy.sessionOwner = log?.sessionOwner;
    return resolvedCopy;
  } catch (error) {
    if (error instanceof ResumeRefusedError) {
      logFeatureSad("session_resume", "refused");
      abandonCopy();
      throw error;
    }
    logFeatureBad("session_resume", "load_failed");
    abandonCopy();
    if (isTranscriptLoadError(error))
      logForDebugging(`loadConversationForResume failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(withTelemetryMessage(toError(error), "loadConversationForResume failed"));
    throw error;
  }
}
//@ chunk-5xgkngpb.js:1937649-1937852 placement
/**
 * 在各 worktree 的项目目录中找会话日志。
 */
async function findLogInWorktrees(sessionRef, storageV5) {
  let storageSource = wrapStorageSource(getTranscriptStorageContext(storageV5));
  for (let worktreePath of await getWorktreePaths(getOriginalCwd()))
    for (let projectDir of await findProjectDirs(worktreePath, storageSource)) {
      let lastSessionLog = await getLastSessionLog(
        sessionRef,
        join(projectDir, `${sessionRef}.jsonl`),
        storageV5,
      );
      if (lastSessionLog) {
        logEvent("tengu_resume_worktree_fallback", {});
        return lastSessionLog;
      }
    }
  return null;
}
//@ chunk-5xgkngpb.js:1937852-1938014 placement
/**
 * 按会话 id 扫描找唯一的 transcript。
 */
async function findLogById(sessionRef, storageV5) {
  let soleTranscriptWithMessagesById = await findSoleTranscriptWithMessagesById(
    sessionRef,
    undefined,
    wrapStorageSource(getTranscriptStorageContext(storageV5)),
  );
  if (soleTranscriptWithMessagesById === null) return null;
  let lastSessionLog = await getLastSessionLog(sessionRef, soleTranscriptWithMessagesById, storageV5);
  if (lastSessionLog) logEvent("tengu_transcript_id_scan_fallback", {});
  return lastSessionLog;
}
//@ chunk-5xgkngpb.js:3395208-3395337 fingerprint (2.1.88 match: LEGACY_BRIEF_TOOL_NAME, 0.325)
/**
 * require chunk-vswknp5v（BRIEF_TOOL_NAME/LEGACY_BRIEF_TOOL_NAME）与 chunk-cv3kgbt2（isBriefEnabled 等）。
 */
var briefToolModule; // deferred: loads other modules while loading; runs once its import cycle is complete
var briefEnablementModule;
var BRIEF_TOOL_NAME;
var LEGACY_BRIEF_TOOL_NAME;
deferInit("chunk-5xgkngpb.js:3395208", () => {
  briefToolModule = require("../tools/BriefTool/prompt.js");
  briefEnablementModule = require("../tools/BriefTool/BriefTool.js");
  BRIEF_TOOL_NAME = briefToolModule.BRIEF_TOOL_NAME;
  LEGACY_BRIEF_TOOL_NAME = briefToolModule.LEGACY_BRIEF_TOOL_NAME;
});
//@ chunk-frs14hy1.js:144806-144920 placement
/**
 * 内容块中有非空文本。
 */
function hasNonEmptyText(content) {
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .some((block) => block.text.trim().length > 0);
}
//@ chunk-frs14hy1.js:144920-145536 placement
function dropRetractedOnResume(messages, options) {
  let liveMessages = dropRetractedMessages(messages);
  if (options?.suppressDropTelemetry !== true && liveMessages.length !== messages.length)
    logEvent("tengu_resume_retracted_dropped", {
      dropped: messages.length - liveMessages.length,
      chain_length: messages.length,
    });
  let isLocalRefusalFallback = (message) =>
    message.type === "system" &&
    "subtype" in message &&
    message.subtype === "model_refusal_fallback" &&
    message.scope === "local";
  let canonicalizeModel = (modelName) => getCanonicalName(stripAnyVersatileSuffix(modelName));
  let last = liveMessages.findLast(
    (message) =>
      message.type === "assistant" && !message.isApiErrorMessage && hasNonEmptyText(message.message.content),
  );
  if (last === undefined)
    return {
      live: liveMessages,
      notice: undefined,
    };
  let lastModel = stringOrUndefined(last.message.model);
  if (lastModel === undefined)
    return {
      live: liveMessages,
      notice: undefined,
    };
  let canonicalModel = canonicalizeModel(lastModel);
  let notice = liveMessages.findLast((message) => {
    if (!isLocalRefusalFallback(message)) return false;
    let fallbackModel = stringOrUndefined(message.fallbackModel);
    return fallbackModel !== undefined && canonicalizeModel(fallbackModel) === canonicalModel;
  });
  return {
    live: liveMessages,
    notice,
  };
}
//@ chunk-frs14hy1.js:145536-145587 placement
function stringOrUndefined(value) {
  return typeof value === "string" ? value : undefined;
}
//@ chunk-frs14hy1.js:145587-145865 placement
/**
 * 去掉被拒答回退撤回的消息。
 */
function dropRetractedMessages(messages) {
  let retractedUuids = new Set(
    messages.flatMap((message) =>
      message.type === "system" &&
      message.subtype === "model_refusal_fallback" &&
      message.retractedMessageUuids !== undefined
        ? message.retractedMessageUuids.map((retractedMessageUuid) =>
            retractedMessageUuid.slice(0, MAX_PROGRESS_ENTRIES),
          )
        : [],
    ),
  );
  if (retractedUuids.size === 0) return messages;
  return messages.filter(
    (message) =>
      message.type === "system" || !retractedUuids.has(message.uuid.slice(0, MAX_PROGRESS_ENTRIES)),
  );
}
//@ chunk-0yw3taqg.js:358530-358781 sole-consumer
/**
 * 轮次是否已正常结束：assistant 无 tool_use 且有非空文本，或非关机中断的 user 消息。
 */
function isSettledTurnRow(message) {
  if (message.type === "assistant") {
    let content = Array.isArray(message.message.content) ? message.message.content : [];
    return (
      !content.some((block) => block.type === "tool_use") &&
      content.some((block) => block.type === "text" && block.text.trim() !== "")
    );
  }
  return message.type === "user" && !isHarnessMetaMessage(message) && message.interruptedByShutdown !== true;
}
//@ chunk-0yw3taqg.js:358781-359028 fingerprint (2.1.88 match: detectTurnInterruption, 0.438)
/**
 * 检测 interrupted_prompt：被打断的提示之后没有已完成的回答时返回该提示 uuid。
 */
function detectTurnInterruption(state, messages) {
  let promptUuid = interruptedPromptUuid(state);
  let lastMessageIdx = messages.findLastIndex((message) => message.uuid === promptUuid);
  if (state?.kind !== "interrupted_prompt" || lastMessageIdx === -1) return;
  let lastPromptRow;
  for (let message of messages.slice(lastMessageIdx + 1))
    if (!isInterruptMarkerRow(message))
      lastPromptRow = countUserPromptsFromEntries_5(message) ? message : lastPromptRow;
    else if (message.uuid !== state.message.uuid) {
      if (lastPromptRow !== undefined && isSettledTurnRow(lastPromptRow)) return;
      lastPromptRow = undefined;
    }
  return promptUuid;
}
//@ chunk-0yw3taqg.js:359028-359584 placement
/**
 * 从被中断的点取回续写所需的空缺消息（同侧链、含平台与轮次归属键），并带上这些回合被禁用的工具。
 */
function collectInterruptedTurnsPrompt(messages, turnInterruption, fallbackMessages = messages) {
  let interruptionIndex =
    turnInterruption === undefined ? -1 : messages.findLastIndex((entry) => entry.uuid === turnInterruption);
  let interruptedMessage = messages[interruptionIndex];
  let turnsToReplay = interruptionIndex === -1 ? [] : messages.slice(interruptionIndex);
  try {
    let nextRealPromptIndex =
      interruptionIndex === -1
        ? -1
        : messages.findIndex(
            (entry, index) =>
              index > interruptionIndex &&
              Object(entry).isSidechain !== true &&
              isRealPromptAt(messages, index),
          );
    if (nextRealPromptIndex !== -1) turnsToReplay = messages.slice(interruptionIndex, nextRealPromptIndex);
  } catch (error) {
    logError(error);
  }
  let flattened = [fallbackMessages, ...turnsToReplay.map((turn) => [turn])].flatMap(
    (turnGroup) => disallowedToolsFromMessages(turnGroup) ?? [],
  );
  let prompt =
    flattened.length > 0
      ? {
          carriedOnDisallowedTools: normalizeCaseForComparison_2(flattened.flatMap((entry) => entry.turn)),
        }
      : {};
  if (interruptedMessage?.type !== "user") return prompt;
  return {
    ...prompt,
    ...(typeof interruptedMessage.clientPlatform === "string" && {
      clientPlatform: interruptedMessage.clientPlatform,
    }),
    ...(typeof interruptedMessage.turnAttributionKey === "string" && {
      inheritedTurnAttributionKey: interruptedMessage.turnAttributionKey,
    }),
  };
}
export {
  BRIEF_TOOL_NAME,
  briefEnablementModule,
  detectTurnInterruption,
  collectInterruptedTurnsPrompt,
  weakMapLookup,
  tailDiagnosticsFields,
  isInterruptedTail,
  resumePromptOverride,
  loadConversationForResume,
  isResumeTooOld,
  interruptedTurnResumePolicy,
  MAX_RESUME_TAIL_AGE_MS,
  clearClassifierContext,
  resumeReasonFromEnv,
  resumeInterruptedTurn,
  LEGACY_BRIEF_TOOL_NAME,
  getLastSessionLog,
  dropRetractedOnResume,
  hasNonEmptyText,
  isLiveClassifiedRun,
  isServerToolType,
  degradeRestoredMessages,
  restoreSkillStateFromMessages,
  UNSUPPORTED_TOOL_CONTENT_TEXT,
  WORKER_RESTARTED_PROMPT_2,
  deserializeMessagesWithInterruptDetection,
  WORKER_RESTARTED_PROMPT,
  isCutOffPreviewEnabled,
  migrateLegacyAttachmentTypes,
  dropMalformedTextBlocks,
  isTailMessage,
  showsCutOffCalls,
  lastMessageAgeMs,
  newerMessage,
  refusalRetryMaxAge,
  isOlderThan,
  recordTailDiagnostics,
  getClassifierEpoch,
  registerClassifiedRun,
  findLatestResumableLog,
  SESSION_MOVED_TAIL_PROMPT,
  SESSION_MOVED_CONTINUE_PROMPT,
  reportContentPaint,
  reportPromptIdle,
  formatForkMarker,
  parseForkMarker,
  forkMarkerFields,
  setRecoverySender,
};
