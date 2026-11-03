/**
 * utils/conversationRecovery.ts
 *
 * 恢复会话：加载转录（最新/指定/fork）、反序列化与旧附件迁移、检测被打断的轮次并补续写提示，恢复技能状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/conversationRecovery.ts
 * pieces: chunk-0h4e7gnq.js (4), chunk-e6aww6q8.js (58), chunk-tyg7f3ek.js (2)
 * attribution: placement 56, fingerprint 5, layout 1, callgraph-witnessed 1, callgraph-fingerprint 1
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
import { getRootSession, getCcrDerivedSurface, getSessionId, getOriginalCwd } from "../bootstrap/state.js";
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
import { interruptedPromptUuid, countUserPromptsFromEntries_5 } from "../cli/print/wakeRouter.js";

//@ chunk-e6aww6q8.js:518079-518335 placement
/**
 * 由加载结果构造某会话的完整日志：选最新叶子建对话链，附带标题、tag、PR、模式、worktree、文件历史、署名、内容替换等元数据。
 */
async function getLastSessionLog(e, n, storageV5, precedingEntries) {
  let sessionTranscript = await loadSessionTranscript(e, n, storageV5, precedingEntries);
  let { sessionFile, v5Read } = sessionTranscript;
  let w = await sessionLogFromTranscriptLoad(e, sessionTranscript, {
    path: sessionFile,
    modifiedAt: async () =>
      v5Read !== undefined ? new Date(v5Read.mtimeMs) : (await stat(sessionFile)).mtime,
  });
  if (w !== null && precedingEntries?.length)
    currentTranscriptStore().primeFilelessResume(
      e,
      precedingEntries.map((L) => L.uuid),
    );
  return w;
}
//@ chunk-e6aww6q8.js:1630550-1630800 fingerprint = restoreSkillStateFromMessages (0.719)
/**
 * 判断某技能内容在历史里以正文（body）还是 invoked_skills 附件（attachment）形式出现，都没有返回 null。
 */
function restoreSkillStateFromMessages(e, n) {
  let r = false;
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let h = e[idx];
    if (h.type === "attachment") {
      let attachment = h.attachment;
      if (
        !r &&
        attachment.type === "invoked_skills" &&
        attachment.skills.some((skill) => skill.content === n)
      )
        r = true;
      continue;
    }
    if (metaMessageText(h) === n) return "body";
  }
  return r ? "attachment" : null;
}
//@ chunk-e6aww6q8.js:1807896-1808028 placement
/**
 * 已知的 stop_reason 值。
 */
var STOP_REASONS = [
  "end_turn",
  "tool_use",
  "max_tokens",
  "stop_sequence",
  "pause_turn",
  "refusal",
  "model_context_window_exceeded",
];
var weakMap_8 = new WeakMap();
//@ chunk-e6aww6q8.js:1808028-1808799 placement
/**
 * 加载会话时记录 transcript 尾部诊断（最后几行类型、最后提示位置、停止原因）。
 */
function recordTailDiagnostics(e, n, r, s, h, y) {
  if (!env.CLAUDE_CODE_DIAGNOSTICS_FILE && !y) return;
  try {
    let S = [];
    let rowsAfterTail = 0;
    let L = false;
    let G = n.length - 1;
    for (; G >= 0; G--) {
      let Z = n[G];
      if (Z.isSidechain) continue;
      if (Z.type !== "user" && Z.type !== "assistant") {
        rowsAfterTail += S.length === 0 ? 1 : 0;
        continue;
      }
      if (S.length < 3) S.push(Z);
      if (Z.type === "user") {
        if (r(Z)) break;
        L ||= !s(Z);
      }
    }
    for (let idx = G - 1; idx >= 0 && S.length < 3; idx--) {
      let Se = n[idx];
      if (!Se.isSidechain && (Se.type === "user" || Se.type === "assistant")) S.push(Se);
    }
    let timestamp = Date.parse(S[0]?.timestamp ?? "");
    weakMap_8.set(e, {
      ...h,
      tailRows: [classifyTailMessage(S[0]), classifyTailMessage(S[1]), classifyTailMessage(S[2])],
      rowsAfterTail,
      lastReplyStopReason: stopReasonOf(
        S.find((Z) => Z.type === "assistant" && classifyTailMessage(Z) !== "assistant_synthetic"),
      ),
      tailWrittenAtMs: Number.isFinite(timestamp) ? timestamp : undefined,
      lastPromptUuid: n[G]?.uuid,
      lastPromptOpensLastTurn: G >= 0 && !L,
      rowsAfterLastPrompt: n.length - 1 - G,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:1808799-1808851 placement
/**
 * 按对象查 WeakMap 里的缓存值。
 */
function weakMapLookup(e) {
  return e === undefined ? undefined : weakMap_8.get(e);
}
//@ chunk-e6aww6q8.js:1808851-1808878 placement
/**
 * 尾部过旧的判定阈值（5 分钟）。
 */
var TAIL_TOO_OLD_MS = 300000;
var MAX_RESUME_TAIL_AGE_MS = 3600000;
//@ chunk-e6aww6q8.js:1808878-1809667 placement
/**
 * 续接诊断遥测字段（尾部行、停止原因、无结果的工具调用等）。
 */
function tailDiagnosticsFields(e, n) {
  if (e === undefined || (e.lastPromptUuid !== undefined && e.lastPromptUuid !== n.uuid)) return;
  let r =
    e.tailWrittenAtMs === undefined || e.tailWrittenAtMs > n.nowMs ? undefined : n.nowMs - e.tailWrittenAtMs;
  if (r !== undefined && r >= MAX_RESUME_TAIL_AGE_MS) return;
  return {
    finished_because: e.because,
    stored_tail_row: e.tailRows[0],
    stored_row_before_tail: e.tailRows[1],
    stored_row_2_before_tail: e.tailRows[2],
    rows_after_tail: e.rowsAfterTail,
    last_reply_stop_reason: e.lastReplyStopReason,
    ...(r !== undefined && {
      stored_tail_age_ms: r,
    }),
    tool_calls_without_result: e.callsWithoutResult,
    api_error_stepped_over: e.apiErrorSteppedOver,
    invisible_reply_dropped: e.invisibleReplyDropped,
    last_prompt: e.lastPromptUuid === undefined ? "none_loaded" : "this_message",
    rows_after_last_prompt: e.rowsAfterLastPrompt,
    commands_dequeued: n.commandsDequeued,
    could_send_result: classifyTranscriptTail(e, r, n),
  };
}
//@ chunk-e6aww6q8.js:1809667-1810427 placement
/**
 * 判断转录尾部状态（最后提示未加载、工具调用无结果等）。
 */
function classifyTranscriptTail(e, n, r) {
  if (e.lastPromptUuid === undefined) return "last_prompt_not_loaded";
  if (!e.lastPromptOpensLastTurn) return "another_turn_may_follow";
  if (e.callsWithoutResult > 0) return "tool_call_without_result";
  let [s] = e.tailRows;
  if (s === "assistant_synthetic") return "tail_written_by_cli";
  if (e.because !== "reply" && e.because !== "terminal_tool_result") return "tail_not_a_reply";
  if (s === "assistant_text") {
    if (e.lastReplyStopReason !== "end_turn" && e.lastReplyStopReason !== "stop_sequence")
      return "reply_not_ended";
  } else if (e.because !== "terminal_tool_result" || s !== "user_tool_result") return "tail_not_a_reply";
  if (n === undefined || n >= TAIL_TOO_OLD_MS) return "tail_too_old";
  if (r.commandsDequeued > 0) return "process_dequeued_a_command";
  if (r.rerunOwed) return "rerun_owed";
  return r.shuttingDown ? "shutting_down" : "yes";
}
//@ chunk-e6aww6q8.js:1810427-1810591 placement
/**
 * 助手消息的停止原因类别。
 */
function stopReasonOf(e) {
  if (e === undefined) return "no_reply_in_tail";
  let stopReason = e.message?.stop_reason;
  if (stopReason === undefined || stopReason === null) return "not_stored";
  return STOP_REASONS.find((r) => r === stopReason) ?? "other";
}
//@ chunk-e6aww6q8.js:1810591-1810667 placement
/**
 * 会话恢复的指标状态（计数、发送者与已报告标记）。
 */
class ConversationRecoveryMetrics {
  counts = undefined;
  sender = undefined;
  contentPaintSent = false;
  promptIdleSent = false;
}
//@ chunk-e6aww6q8.js:1810667-1810694 placement
/**
 * 按宿主隔离的会话恢复指标。
 */
var conversationRecoveryMetricsByHost = new HostScoped(() => new ConversationRecoveryMetrics());
//@ chunk-e6aww6q8.js:1810694-1810733 placement
/**
 * 取出当前宿主的会话恢复指标。
 */
function getConversationRecoveryMetrics() {
  return conversationRecoveryMetricsByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1810733-1810764 placement
/**
 * 记录已加载与 JSONL 中的消息数。
 */
function setRecoveryCounts(counts) {
  getConversationRecoveryMetrics().counts = counts;
}
//@ chunk-e6aww6q8.js:1810764-1810795 placement
/**
 * 记录恢复消息的发送者。
 */
function setRecoverySender(sender) {
  getConversationRecoveryMetrics().sender = sender;
}
//@ chunk-e6aww6q8.js:1810795-1811014 placement
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
//@ chunk-e6aww6q8.js:1811014-1811154 placement
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
//@ chunk-e6aww6q8.js:1811154-1811342 placement
var WORKER_RESTARTED_PROMPT_2 =
  "This session's worker process was restarted. If your previous turn was already complete, take no action and wait for the next event. Otherwise, continue from where you left off.";
//@ chunk-e6aww6q8.js:1811342-1812930 placement
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
//@ chunk-e6aww6q8.js:1815469-1816209 placement
/**
 * 记录宿主分类器上下文（按消息与内容），恢复的消息降级、判断是否仍有效。
 */
class HostClassifierContextRegistry {
  #e = new Map();
  #t = 0;
  register(e) {
    let n = e;
    if (typeof n.hostClassifierContext !== "string" || n.uuid === undefined) return;
    let r = singleToolResultId(n);
    if (r === undefined) return;
    let s = wakeupDedupKey(n.uuid, r);
    if (!this.#e.has(s) && this.#e.size >= WAKEUP_ORIGIN_TTL_MS) {
      let h = this.#e.keys().next().value;
      if (h !== undefined) this.#e.delete(h);
    }
    this.#e.set(s, n.hostClassifierContext);
  }
  clear() {
    this.#e.clear();
    this.#t++;
  }
  getEpoch() {
    return this.#t;
  }
  degradeRestored(e) {
    for (let n of e) {
      let r = n;
      if (typeof r.hostClassifierContext !== "string" || r.uuid === undefined) continue;
      let s = singleToolResultId(r);
      if (s === undefined) continue;
      this.#e.delete(wakeupDedupKey(r.uuid, s));
    }
  }
  isLive(e) {
    let n = e;
    if (typeof n.hostClassifierContext !== "string" || n.uuid === undefined) return false;
    let r = singleToolResultId(n);
    if (r === undefined) return false;
    return this.#e.get(wakeupDedupKey(n.uuid, r)) === n.hostClassifierContext;
  }
}
//@ chunk-e6aww6q8.js:1816209-1816236 placement
/**
 * 按宿主隔离的分类器上下文注册表。
 */
var classifierContextByHost = new HostScoped(() => new HostClassifierContextRegistry());
//@ chunk-e6aww6q8.js:1816236-1816274 placement
/**
 * 取出当前宿主的分类器上下文注册表。
 */
function getClassifierContextRegistry() {
  return classifierContextByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1816274-1816307 placement
/**
 * 登记一次分类器运行。
 */
function registerClassifiedRun(startId) {
  getClassifierContextRegistry().register(startId);
}
//@ chunk-e6aww6q8.js:1816307-1816335 placement
/**
 * 清空分类器上下文。
 */
function clearClassifierContext() {
  getClassifierContextRegistry().clear();
}
//@ chunk-e6aww6q8.js:1816335-1816373 placement
/**
 * 读取分类器上下文的代次。
 */
function getClassifierEpoch() {
  return getClassifierContextRegistry().getEpoch();
}
//@ chunk-e6aww6q8.js:1816373-1816413 placement
/**
 * 把恢复的消息标记为降级。
 */
function degradeRestoredMessages(messages) {
  getClassifierContextRegistry().degradeRestored(messages);
}
//@ chunk-e6aww6q8.js:1816413-1816451 placement
/**
 * 判断该分类器运行是否仍是活的。
 */
function isLiveClassifiedRun(message) {
  return getClassifierContextRegistry().isLive(message);
}
//@ chunk-e6aww6q8.js:1816451-1816504 placement
/**
 * 拼接 fork 标记（会话|边界时间|父会话）。
 */
function formatForkMarker(forkSessionId, n, forkParentSessionId) {
  return `${forkSessionId}|${n}${forkParentSessionId ? `|${forkParentSessionId}` : ""}`;
}
//@ chunk-e6aww6q8.js:1816504-1816680 placement
/**
 * 解析 fork 标记 “会话|边界时间|父会话”。
 */
function parseForkMarker(e) {
  if (!e) return null;
  let parts = e.split("|");
  if (parts.length === 1)
    return {
      boundaryAt: e,
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
//@ chunk-e6aww6q8.js:1816680-1816932 placement
/**
 * fork 标记转为任务状态字段。
 */
function forkMarkerFields(e) {
  let forkMarker = parseForkMarker(e);
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
//@ chunk-e6aww6q8.js:1816932-1817132 placement
/**
 * 服务端工具类型的集合。
 */
var SERVER_TOOL_TYPES = {
  advisor: true,
  bash_code_execution: true,
  code_execution: true,
  text_editor_code_execution: true,
  tool_search_tool_bm25: true,
  tool_search_tool_regex: true,
  web_fetch: true,
  web_search: true,
};
var SERVER_TOOL_TYPE_SET = new Set(Object.keys(SERVER_TOOL_TYPES));
//@ chunk-e6aww6q8.js:1817132-1817187 placement
/**
 * 判断字符串是否为服务端工具类型。
 */
function isServerToolType(name) {
  return typeof name === "string" && SERVER_TOOL_TYPE_SET.has(name);
}
//@ chunk-e6aww6q8.js:1817187-1817232 placement
/**
 * 不支持的工具内容被移除时的占位文本。
 */
var UNSUPPORTED_TOOL_CONTENT_TEXT = "[Unsupported tool content removed]";
//@ chunk-e6aww6q8.js:1826542-1826882 fingerprint = migrateLegacyAttachmentTypes (0.51)
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
//@ chunk-e6aww6q8.js:1826882-1827152 layout
/**
 * 去掉 text 字段不是字符串的文本块。
 */
function dropMalformedTextBlocks(e) {
  if (e.type !== "assistant" && e.type !== "user") return null;
  let content = e.message.content;
  if (!Array.isArray(content)) return null;
  let filtered = content.filter((s) => s.type !== "text" || typeof s.text === "string");
  if (filtered.length === content.length) return null;
  return {
    ...e,
    message: {
      ...e.message,
      content: filtered,
    },
  };
}
//@ chunk-e6aww6q8.js:1827152-1827196 fingerprint = deserializeMessagesWithInterruptDetection (0.343)
/**
 * 恢复被打断轮次时追加的用户提示 "Continue from where you left off."。
 */
var deserializeMessagesWithInterruptDetection = "Continue from where you left off.";
//@ chunk-e6aww6q8.js:1827196-1827251 placement
/**
 * 续接提示的环境变量覆盖（未设置时用默认反序列化）。
 */
function resumePromptOverride() {
  return env.CLAUDE_CODE_RESUME_PROMPT || deserializeMessagesWithInterruptDetection;
}
//@ chunk-e6aww6q8.js:1827251-1827299 placement
/**
 * 续接原因的合法形式（小写字母与下划线，最多 64）。
 */
var INTERRUPTED_TURN = "interrupted_turn";
var RESUME_REASON_RE = /^[a-z_]{1,64}$/;
//@ chunk-e6aww6q8.js:1827299-1827385 placement
/**
 * 从环境变量读取合法的续接原因。
 */
function resumeReasonFromEnv() {
  let CLAUDE_CODE_RESUME_REASON = env.CLAUDE_CODE_RESUME_REASON;
  return CLAUDE_CODE_RESUME_REASON !== undefined && RESUME_REASON_RE.test(CLAUDE_CODE_RESUME_REASON)
    ? CLAUDE_CODE_RESUME_REASON
    : INTERRUPTED_TURN;
}
//@ chunk-e6aww6q8.js:1827385-1827611 placement
/**
 * 某 uuid 是否为最后一条有效消息。
 */
function isTailMessage(e, n) {
  if (n === undefined) return false;
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let s = e[idx];
    if (s.type !== "user" && s.type !== "assistant") continue;
    if (s.uuid === n) return true;
    if (
      !isContextAppendMessage(s) &&
      !isQueueTranscriptOnlyUserMessage(s) &&
      !(s.type === "assistant" && isUnattendedStartUnconfirmed(s))
    )
      return false;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1827611-1827769 placement
/**
 * CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS 的值。
 */
function envResumeMaxAge() {
  let e = env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS;
  if (!e) return;
  let n = Number(e);
  if (n === 0) return 0;
  return Number.isFinite(n) && n > 0 ? n : 3600000;
}
//@ chunk-e6aww6q8.js:1827769-1828053 placement
/**
 * 远程会话中断回合自动续接的时间上限（环境变量或开关）。
 */
function interruptedTurnResumePolicy(e) {
  if (e && isClaudeAiChatRemote() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_rosy_puddle", true)) return;
  let n = envResumeMaxAge();
  if (n !== undefined)
    return n
      ? {
          maxAgeMs: n,
          source: "env",
        }
      : undefined;
  if (
    e ||
    !isClaudeAiChatRemote() ||
    isAgentSdkEntrypoint() ||
    getCcrDerivedSurface() === "remote_cowork_trigger"
  )
    return;
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
//@ chunk-e6aww6q8.js:1828053-1828084 placement
/**
 * 续接年龄下限（90 分钟）。
 */
var MIN_RESUME_AGE_MS = 5400000;
var MAX_RESUME_AGE_MS = 2592000000;
//@ chunk-e6aww6q8.js:1828084-1828160 placement
/**
 * 判断最后一条消息是否已超过续接年龄。
 */
function isResumeTooOld(e, maxAgeMs = envResumeMaxAge()) {
  if (!maxAgeMs) return false;
  let r = lastMessageAgeMs(e);
  return r === undefined || r >= maxAgeMs;
}
//@ chunk-e6aww6q8.js:1828160-1828397 placement
/**
 * 最后一条有效消息距今的毫秒数。
 */
function lastMessageAgeMs(e) {
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let r = e[idx];
    if (
      r.type === "system" ||
      r.type === "progress" ||
      isContextAppendMessage(r) ||
      isQueueTranscriptOnlyUserMessage(r) ||
      (r.type === "assistant" && isUnattendedStartUnconfirmed(r))
    )
      continue;
    let timestamp = Date.parse(r.timestamp ?? "");
    if (Number.isFinite(timestamp)) return Date.now() - timestamp;
  }
  return;
}
//@ chunk-e6aww6q8.js:1828397-1828469 placement
/**
 * 拒答重试的默认年龄上限（6 小时）。
 */
var DEFAULT_REFUSAL_RETRY_AGE_MS = 21600000;
var TENGU_SHIMMERING_CHERNY = "tengu_shimmering_cherny";
var MIN_REFUSAL_RETRY_AGE_MS = 60000;
var MAX_REFUSAL_RETRY_AGE_MS = 2592000000;
//@ chunk-e6aww6q8.js:1828469-1828681 placement
/**
 * 拒答重试的时间上限（环境变量、开关或默认）。
 */
function refusalRetryMaxAge() {
  let e = envResumeMaxAge();
  if (e)
    return {
      maxAgeMs: e,
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
//@ chunk-e6aww6q8.js:1828681-1828785 placement
/**
 * 消息时间是否早于 n 毫秒前（无时间视为旧）。
 */
function isOlderThan(e, maxAgeMs) {
  let timestamp = Date.parse(e.timestamp ?? "");
  return !Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) >= maxAgeMs;
}
//@ chunk-e6aww6q8.js:1828785-1828984 placement
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
//@ chunk-e6aww6q8.js:1828984-1829790 placement
/**
 * 恢复中断的回合（打印模式、REPL 恢复、合成继续、重新提交）。
 */
function resumeInterruptedTurn(
  e,
  message,
  { deferred: r, pendingActionClass: s, cutOffAgentCalls: h, tail: y } = {},
) {
  logEvent("tengu_resume_interrupted_turn", {
    surface: e === "print" ? lit_2("print") : lit_2("repl_restore"),
    kind: message.isMeta ? lit_2("synthetic_continue") : lit_2("resubmit"),
    ...(r !== undefined && {
      deferred: r,
    }),
    ...(s !== undefined && {
      pending_action_class: s,
    }),
    ...(h !== undefined && {
      cut_off_agent_calls: h,
    }),
    ...(y !== undefined && {
      tail_kind: fromEnum(y.kind),
      api_error_stepped_over: y.apiErrorSteppedOver,
      invisible_reply_dropped: y.invisibleReplyDropped,
      ...(y.ageMinutes !== undefined && {
        tail_age_min: y.ageMinutes,
      }),
      ...(y.shutdownStamped !== undefined && {
        tail_shutdown_stamped: y.shutdownStamped,
      }),
      ...(y.cutOffCalls !== undefined && {
        cut_off_calls_shown: y.cutOffCalls.shown,
        cut_off_calls_hidden: y.cutOffCalls.hidden,
        cut_off_calls_answered_in_turn: y.cutOffCalls.inTurn,
        repeats_previous_cut_off_call: y.cutOffCalls.repeatsPrevious,
      }),
    }),
  });
}
//@ chunk-e6aww6q8.js:1829790-1829817 placement
/**
 * 续接时是否显示被截断的工具调用。
 */
function isCutOffPreviewEnabled() {
  return isFoamySpringEnabled();
}
//@ chunk-e6aww6q8.js:1829817-1829942 placement
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
//@ chunk-e6aww6q8.js:1829942-1830026 placement
/**
 * 判断尾消息是否为带截断调用的中断提示。
 */
function isInterruptedTail(e) {
  return e?.kind === "interrupted_prompt" && e.tail?.cutOffCalls !== undefined;
}
//@ chunk-e6aww6q8.js:1830026-1830039 placement
/**
 * 探测可续接日志时的等待时长（2 秒）。
 */
var RESUME_LOG_PROBE_MS = 2000;
//@ chunk-e6aww6q8.js:1852560-1853464 placement
/**
 * 找最近可续接的会话日志（跳过仍在后台运行的会话，发现被续接到运行中的会话时回调）。
 */
async function findLatestResumableLog({ storageV5, forkSession, onNewestRunningInBackground }) {
  let logs = fetchLogs(undefined, storageV5);
  let h;
  let y = new Set();
  try {
    let { listAllLiveSessions } = await import("./chunk-ewxn4535.js");
    let { ownPidDomain } = await import("./chunk-vctscj6m.js");
    let [L, G] = await Promise.all([
      listAllLiveSessions(storageV5, {
        rejectUnreadable: true,
      }),
      ownPidDomain(),
    ]);
    if (L.every((q) => q.kind === "interactive" || (q.kind && q.sessionId))) {
      h = new Set();
      for (let q of L) {
        if (q.kind === "interactive" || !q.sessionId) continue;
        h.add(q.sessionId);
        if (q.pidDomain !== undefined && q.pidDomain !== G) y.add(q.sessionId);
      }
    }
  } catch {}
  return findFirstMessageLog(
    await logs,
    (S) => {
      if (S.bookkeepingOnly) return false;
      if (!forkSession && S.continuedInSessionId !== undefined && h?.has(S.continuedInSessionId)) {
        onNewestRunningInBackground?.({
          sessionId: S.continuedInSessionId,
          provable: !y.has(S.continuedInSessionId),
        });
        return "stop";
      }
      if (S.superseded) return false;
      if (forkSession) return true;
      let sessionIdFromLog = getSessionIdFromLog(S);
      if (sessionIdFromLog !== undefined && h?.has(sessionIdFromLog)) return false;
      if (h === undefined && (S.sessionKind || S.continuedInSessionId !== undefined)) return false;
      return true;
    },
    storageV5,
  );
}
//@ chunk-e6aww6q8.js:1853464-1858887 callgraph-witnessed = loadConversationForResume (0.21)
/**
 * loadConversationForResume：按参数加载会话（最新一个/会话 id/转录路径/fork），反序列化、修复、检测中断，返回 messages、sessionId 与元数据；通知 onSessionResolved。
 */
async function loadConversationForResume(sessionRef, n, options) {
  let s;
  let h = (sessionId, transcriptPath) => {
    let onSessionResolved = options.onSessionResolved;
    if (onSessionResolved === undefined) return;
    s ??= Promise.resolve()
      .then(() =>
        onSessionResolved({
          sessionId: identityAgentId(sessionId),
          transcriptPath,
        }),
      )
      .catch((error) => logForDebugging(`resume: onSessionResolved hook failed: ${errorMessage(error)}`));
  };
  let y = () => {
    s?.then((S) => S?.()).catch(() => {});
  };
  try {
    let log = null;
    let messages = null;
    let L = false;
    let G = false;
    let sessionId;
    let Z;
    let Se = false;
    if (sessionRef === undefined)
      log = await findLatestResumableLog({
        storageV5: options.storageV5,
        forkSession: options.forkSession,
        onNewestRunningInBackground: (qt) => {
          Se = true;
          options.onNewestRunningInBackground?.(qt);
        },
      });
    else if (n && typeof sessionRef === "string") {
      log = await getLastSessionLog(sessionRef, n, options.storageV5);
      sessionId = log?.messages.at(-1)?.sessionId ?? log?.sessionId ?? sessionRef;
    } else if (typeof sessionRef === "string") {
      let qt = options.precedingRows?.rows.length
        ? toTranscriptEntries(options.precedingRows.rows, sessionRef)
        : undefined;
      log =
        (await getLastSessionLog(sessionRef, undefined, options.storageV5, qt)) ??
        (await findLogInWorktrees(sessionRef, options.storageV5)) ??
        (await findLogById(sessionRef, options.storageV5));
      sessionId = sessionRef;
    } else log = sessionRef;
    if (!log && !messages) {
      logFeatureSad("session_resume", Se ? "running_in_background" : "not_found");
      return null;
    }
    if (log) {
      if (isLiteLog(log))
        log = await loadFullLog(log, {
          onTranscriptUnreadable: (no) => {
            Z = no;
          },
          storageV5: options.storageV5,
        });
      if (!sessionId) sessionId = getSessionIdFromLog(log);
      options.beforeUse?.(log, sessionId);
      let targetSessionId = isValidAdoptedSessionId(sessionId, options) ? sessionId : undefined;
      let Zt = options.forkSession ? undefined : targetSessionId;
      if (sessionId) {
        h(sessionId, log.fullPath);
        if (s === undefined) await copyPlanForResume(log, targetSessionId, options.storageV5);
        else await Promise.all([copyPlanForResume(log, targetSessionId, options.storageV5), s]);
      }
      let id = parseForkMarker(env.CLAUDE_CODE_RESUME_SOURCE_ALIVE);
      let pn = sessionId ?? getSessionId();
      L = id !== null && (id.sessionId === undefined || id.sessionId === pn || id.parentSessionId === pn);
      G = options.forkSession && id?.parentSessionId === pn;
      if (!L) copyFileHistoryForResume(log, Zt, options.storageV5);
      messages = log.messages;
      checkResumeConsistency(messages);
      censusResumeAnnouncements(messages, log.fileSize);
    }
    let msgsInJsonl = messages?.length ?? 0;
    messages = dropRetractedMessages_2(messages);
    messages = dropMalformedAttachments(messages);
    restoreInvokedSkills(messages);
    let fullPath = log?.fullPath ?? n;
    let Ee = fullPath
      ? ((await findDeferredToolMarkerInTranscript(fullPath, options.storageV5)) ?? undefined)
      : undefined;
    let copiedSessionOwnId = options.copiedSessionOwnId;
    let Ie =
      Ee === undefined ||
      copiedSessionOwnId === undefined ||
      messages.some(
        (message) =>
          message.type === "assistant" &&
          "sessionId" in message &&
          message.sessionId === copiedSessionOwnId &&
          Array.isArray(message.message.content) &&
          message.message.content.some((Zt) => Zt.type === "tool_use" && Zt.id === Ee.toolUseID),
      )
        ? Ee
        : undefined;
    let msgsLoaded = messages.length;
    let stored = messages;
    let uuid = messages.at(-1)?.uuid;
    let lt =
      options.precedingRows?.first === true && options.precedingRows.rows.some((qt) => qt.uuid === uuid);
    if (env.CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS === true)
      await withDeadline(
        initializeGrowthBook().catch(() => null),
        RESUME_LOG_PROBE_MS,
      );
    let Je = deserializeMessagesImpl(
      messages,
      Ie ? new Set([Ie.toolUseID]) : undefined,
      options.replyOnResume,
      log?.rewindAnchorUuid ??
        options.precedingRows?.rows.findLast((qt) => qt.type === "user" || qt.type === "assistant")?.uuid,
      options.resumeInterruptedTurn,
      G,
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
    messages = Je.messages;
    if (log) {
      let turnInterruptionState = Je.turnInterruptionState;
      reportResumeLoad({
        log,
        stored,
        verdict:
          turnInterruptionState.kind === "none"
            ? "none"
            : turnInterruptionState.message.isMeta
              ? "continue"
              : "resubmit",
        rescueSuppressed: Je.rescueSuppressed,
        rewound: log.rewindAnchorUuid !== undefined,
        autoResume: Boolean(options.resumeInterruptedTurn ?? env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN),
        openerVouched:
          turnInterruptionState.kind !== "none" &&
          (!turnInterruptionState.message.isMeta ||
            turnInterruptionState.interruptedTurnUserMessageUuid !== undefined),
        supersededCalls: Je.supersededToolUseIds.size,
        cutOffCalls:
          turnInterruptionState.kind !== "none" && turnInterruptionState.tail?.cutOffCalls !== undefined
            ? {
                tailKind: turnInterruptionState.tail.kind,
                ...turnInterruptionState.tail.cutOffCalls,
              }
            : undefined,
        isTypedPrompt: (Zt) => findLastUserPromptUuid([Zt]) === Zt.uuid,
      });
    }
    let startTime = performance.now();
    let pt =
      options.forkSession || lt || (sessionId !== undefined && !isValidAdoptedSessionId(sessionId, options))
        ? "fork"
        : "resume";
    let resumedMessages = messages;
    let yt = !options.forkSession && isValidAdoptedSessionId(sessionId, options) ? sessionId : getSessionId();
    let progress = {
      rows: [],
      additionalContexts: [],
      isOvertaken: false,
      lateInitialUserMessage: undefined,
    };
    let { sessionStartHooksWaitFor } = options;
    let hookRun = startHookRun("tail", (qt) =>
      processSessionStartHooks(getSessionIdentity(), pt, {
        sessionId: yt,
        sessionTitle: getCurrentSessionTitle(getSessionId()) ?? (G ? undefined : log?.customTitle),
        resumedMessages,
        orphaned: qt,
        progress,
        holdHooksUntil:
          sessionStartHooksWaitFor &&
          (async () => {
            await sessionStartHooksWaitFor(qt);
            startTime = performance.now();
          }),
        storageV5: options.storageV5,
        credentials: options.credentials,
      }).then((Zt) => {
        if (qt.aborted) return Zt;
        recordPhase("hooks_init_ms", performance.now() - startTime, startTime);
        let rn = takePendingHookSessionTitle();
        if (rn) applyResumeHookSessionTitle(rn, yt, options.storageV5);
        return Zt;
      }),
    );
    setRecoveryCounts({
      msgsLoaded,
      msgsInJsonl,
    });
    if (Z !== undefined)
      logFeatureSad("session_resume", "transcript_unreadable", {
        errno: Z,
      });
    else logFeatureOk("session_resume");
    return {
      messages,
      sessionStartHooks: {
        ...hookRun,
        progress,
      },
      turnInterruptionState: Je.turnInterruptionState,
      supersededToolUseIds: Je.supersededToolUseIds,
      supersededToolNames: Je.supersededToolNames,
      answeredToolUseIds: Je.answeredToolUseIds,
      rescueSuppressed: Je.rescueSuppressed,
      deferredToolUse: Ie,
      fileHistorySnapshots: L ? undefined : log?.fileHistorySnapshots,
      attributionSnapshots: log?.attributionSnapshots,
      contentReplacements: log?.contentReplacements,
      sessionId,
      agentName: G ? undefined : log?.agentName,
      agentColor: log?.agentColor,
      agentSetting: log?.agentSetting,
      customTitle: G ? undefined : log?.customTitle,
      ...withEndedByModel({}, getEndedByModel(log)),
      aiTitle: G ? undefined : log?.aiTitle,
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
  } catch (error) {
    if (error instanceof ResumeRefusedError) {
      logFeatureSad("session_resume", "refused");
      y();
      throw error;
    }
    logFeatureBad("session_resume", "load_failed");
    y();
    if (isTranscriptLoadError(error))
      logForDebugging(`loadConversationForResume failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(withTelemetryMessage(toError(error), "loadConversationForResume failed"));
    throw error;
  }
}
//@ chunk-e6aww6q8.js:1858887-1859090 placement
/**
 * 在各 worktree 的项目目录中找会话日志。
 */
async function findLogInWorktrees(sessionRef, storageV5) {
  let r = wrapStorageSource(getTranscriptStorageContext(storageV5));
  for (let s of await getWorktreePaths(getOriginalCwd()))
    for (let h of await findProjectDirs(s, r)) {
      let lastSessionLog = await getLastSessionLog(sessionRef, join(h, `${sessionRef}.jsonl`), storageV5);
      if (lastSessionLog) {
        logEvent("tengu_resume_worktree_fallback", {});
        return lastSessionLog;
      }
    }
  return null;
}
//@ chunk-e6aww6q8.js:1859090-1859253 placement
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
//@ chunk-e6aww6q8.js:3310099-3310228 fingerprint = LEGACY_BRIEF_TOOL_NAME (0.325)
/**
 * require chunk-vswknp5v（BRIEF_TOOL_NAME/LEGACY_BRIEF_TOOL_NAME）与 chunk-cv3kgbt2（isBriefEnabled 等）。
 */
var briefToolModule = require("./chunk-vswknp5v.js");
var briefEnablementModule = require("./chunk-cv3kgbt2.js");
var BRIEF_TOOL_NAME = briefToolModule.BRIEF_TOOL_NAME;
var LEGACY_BRIEF_TOOL_NAME = briefToolModule.LEGACY_BRIEF_TOOL_NAME;
//@ chunk-0h4e7gnq.js:133809-133923 placement
/**
 * 内容块中有非空文本。
 */
function hasNonEmptyText(content) {
  return content
    .filter((n) => n.type === "text" && typeof n.text === "string")
    .some((n) => n.text.trim().length > 0);
}
//@ chunk-0h4e7gnq.js:133923-134539 placement
function dropRetractedOnResume(e, n) {
  let s = dropRetractedMessages(e);
  if (n?.suppressDropTelemetry !== true && s.length !== e.length)
    logEvent("tengu_resume_retracted_dropped", {
      dropped: e.length - s.length,
      chain_length: e.length,
    });
  let y = (x) =>
    x.type === "system" && "subtype" in x && x.subtype === "model_refusal_fallback" && x.scope === "local";
  let r = (x) => getCanonicalName(stripAnyVersatileSuffix(x));
  let last = s.findLast(
    (x) => x.type === "assistant" && !x.isApiErrorMessage && hasNonEmptyText(x.message.content),
  );
  if (last === undefined)
    return {
      live: s,
      notice: undefined,
    };
  let h = stringOrUndefined(last.message.model);
  if (h === undefined)
    return {
      live: s,
      notice: undefined,
    };
  let k = r(h);
  let notice = s.findLast((x) => {
    if (!y(x)) return false;
    let L = stringOrUndefined(x.fallbackModel);
    return L !== undefined && r(L) === k;
  });
  return {
    live: s,
    notice,
  };
}
//@ chunk-0h4e7gnq.js:134539-134590 placement
function stringOrUndefined(e) {
  return typeof e === "string" ? e : undefined;
}
//@ chunk-0h4e7gnq.js:134590-134868 placement
/**
 * 去掉被拒答回退撤回的消息。
 */
function dropRetractedMessages(e) {
  let n = new Set(
    e.flatMap((s) =>
      s.type === "system" && s.subtype === "model_refusal_fallback" && s.retractedMessageUuids !== undefined
        ? s.retractedMessageUuids.map((retractedMessageUuid) =>
            retractedMessageUuid.slice(0, MAX_PROGRESS_ENTRIES),
          )
        : [],
    ),
  );
  if (n.size === 0) return e;
  return e.filter((s) => s.type === "system" || !n.has(s.uuid.slice(0, MAX_PROGRESS_ENTRIES)));
}
//@ chunk-tyg7f3ek.js:326687-326938 callgraph-fingerprint = isTerminalToolResult (0.709)
/**
 * 轮次是否已正常结束：assistant 无 tool_use 且有非空文本，或非关机中断的 user 消息。
 */
function isTerminalToolResult(e) {
  if (e.type === "assistant") {
    let content = Array.isArray(e.message.content) ? e.message.content : [];
    return (
      !content.some((r) => r.type === "tool_use") &&
      content.some((r) => r.type === "text" && r.text.trim() !== "")
    );
  }
  return e.type === "user" && !isHarnessMetaMessage(e) && e.interruptedByShutdown !== true;
}
//@ chunk-tyg7f3ek.js:326938-327185 fingerprint = detectTurnInterruption (0.439)
/**
 * 检测 interrupted_prompt：被打断的提示之后没有已完成的回答时返回该提示 uuid。
 */
function detectTurnInterruption(e, n) {
  let r = interruptedPromptUuid(e);
  let lastMessageIdx = n.findLastIndex((y) => y.uuid === r);
  if (e?.kind !== "interrupted_prompt" || lastMessageIdx === -1) return;
  let h;
  for (let y of n.slice(lastMessageIdx + 1))
    if (!isInterruptMarkerRow(y)) h = countUserPromptsFromEntries_5(y) ? y : h;
    else if (y.uuid !== e.message.uuid) {
      if (h !== undefined && isTerminalToolResult(h)) return;
      h = undefined;
    }
  return r;
}
export {
  BRIEF_TOOL_NAME,
  briefEnablementModule,
  resumeInterruptedTurn,
  dropRetractedOnResume,
  hasNonEmptyText,
  degradeRestoredMessages,
  parseForkMarker,
  loadConversationForResume,
  clearClassifierContext,
  getLastSessionLog,
  detectTurnInterruption,
  weakMapLookup,
  tailDiagnosticsFields,
  isInterruptedTail,
  resumePromptOverride,
  reportContentPaint,
  reportPromptIdle,
  isLiveClassifiedRun,
  restoreSkillStateFromMessages,
  isServerToolType,
  formatForkMarker,
  getClassifierEpoch,
  registerClassifiedRun,
  LEGACY_BRIEF_TOOL_NAME,
  UNSUPPORTED_TOOL_CONTENT_TEXT,
  WORKER_RESTARTED_PROMPT_2,
  deserializeMessagesWithInterruptDetection,
  WORKER_RESTARTED_PROMPT,
  isCutOffPreviewEnabled,
  migrateLegacyAttachmentTypes,
  dropMalformedTextBlocks,
  isTailMessage,
  interruptedTurnResumePolicy,
  isResumeTooOld,
  showsCutOffCalls,
  lastMessageAgeMs,
  newerMessage,
  refusalRetryMaxAge,
  isOlderThan,
  recordTailDiagnostics,
  forkMarkerFields,
  setRecoverySender,
  SESSION_MOVED_TAIL_PROMPT,
  SESSION_MOVED_CONTINUE_PROMPT,
  MAX_RESUME_TAIL_AGE_MS,
  resumeReasonFromEnv,
  findLatestResumableLog,
};
