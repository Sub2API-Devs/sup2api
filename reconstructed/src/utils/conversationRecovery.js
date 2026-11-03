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
import {
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
} from "fs/promises";
import {
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import {
  loadSessionTranscript,
  sessionLogFromTranscriptLoad,
  su,
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
import { classifyTailMessage, jxt } from "./transcript/resumeLoadReport.js";
import { logError } from "./log.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getCcrDerivedSurface, getSessionId, getOriginalCwd } from "../bootstrap/state.js";
import { logForDebugging } from "./debug.js";
import { singleToolResultId, h3e, mQo } from "./promptSource.js";
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
import { gl } from "./cwd.js";
import { isContextAppendMessage, isHarnessMetaMessage } from "./messages.js";
import { _Wt } from "./transcript/turnClassification.js";
import { isClaudeAiChatRemote, isAgentSdkEntrypoint } from "./entrypointKinds.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
} from "../services/analytics/growthbook.js";
import { TENGU_STEADY_SCROLL } from "../services/api/withRetry.js";
import { logEvent } from "../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../services/analytics/safeMetadata.js";
import { isFoamySpringEnabled } from "../services/analytics/growthbookGates.js";
import { Z2 } from "../bridge/deviceRegistration.js";
import { LE } from "./agentId.js";
import { errorMessage, getErrnoCode, withTelemetryMessage, toError } from "./errors.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { Hir } from "./background/adopt.js";
import { copyPlanForResume } from "./plans.js";
import { copyFileHistoryForResume } from "./fileHistory.js";
import { censusResumeAnnouncements } from "./transcript/resumeAnnouncements.js";
import { withDeadline } from "./sleep.js";
import { startHookRun, processSessionStartHooks, PGt } from "./sessionStart.js";
import { getSessionIdentity } from "./shutdown/pendingWrites.js";
import { Br } from "./startupTiming.js";
import { withEndedByModel, getEndedByModel } from "../tasks/endedByModel.js";
import { Qoe } from "./transcript/transcriptFiles.js";
import { getWorktreePaths } from "./getWorktreePaths.js";
import { findProjectDirs, findSoleTranscriptWithMessagesById } from "./sessionStoragePortable.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { Bn } from "./model/modelIds.js";
import { Ni } from "../services/AgentSummary/agentSummary.js";
import { interruptedPromptUuid, countUserPromptsFromEntries_5 } from "../cli/print/wakeRouter.js";

/**
 * 由加载结果构造某会话的完整日志：选最新叶子建对话链，附带标题、tag、PR、模式、worktree、文件历史、署名、内容替换等元数据。
 */
//@ chunk-e6aww6q8.js:518079-518335 placement
async function getLastSessionLog(e, n, r, s) {
  let h = await loadSessionTranscript(e, n, r, s),
    { sessionFile: sessionFile, v5Read: v5Read } = h,
    w = await sessionLogFromTranscriptLoad(e, h, {
      path: sessionFile,
      modifiedAt: async () =>
        v5Read !== void 0 ? new Date(v5Read.mtimeMs) : (await stat(sessionFile)).mtime,
    });
  if (w !== null && s?.length)
    su().primeFilelessResume(
      e,
      s.map((L) => L.uuid),
    );
  return w;
}
/**
 * 判断某技能内容在历史里以正文（body）还是 invoked_skills 附件（attachment）形式出现，都没有返回 null。
 */
//@ chunk-e6aww6q8.js:1630550-1630800 fingerprint = restoreSkillStateFromMessages (0.719)
function restoreSkillStateFromMessages(e, n) {
  let r = !1;
  for (let s = e.length - 1; s >= 0; s--) {
    let h = e[s];
    if (h.type === "attachment") {
      let attachment = h.attachment;
      if (
        !r &&
        attachment.type === "invoked_skills" &&
        attachment.skills.some((skill) => skill.content === n)
      )
        r = !0;
      continue;
    }
    if (metaMessageText(h) === n) return "body";
  }
  return r ? "attachment" : null;
}
/**
 * 已知的 stop_reason 值。
 */
//@ chunk-e6aww6q8.js:1807896-1808028 placement
var STOP_REASONS = [
    "end_turn",
    "tool_use",
    "max_tokens",
    "stop_sequence",
    "pause_turn",
    "refusal",
    "model_context_window_exceeded",
  ],
  weakMap_8 = new WeakMap();
/**
 * 加载会话时记录 transcript 尾部诊断（最后几行类型、最后提示位置、停止原因）。
 */
//@ chunk-e6aww6q8.js:1808028-1808799 placement
function recordTailDiagnostics(e, n, r, s, h, y) {
  if (!env.CLAUDE_CODE_DIAGNOSTICS_FILE && !y) return;
  try {
    let S = [],
      w = 0,
      L = !1,
      G = n.length - 1;
    for (; G >= 0; G--) {
      let Z = n[G];
      if (Z.isSidechain) continue;
      if (Z.type !== "user" && Z.type !== "assistant") {
        w += S.length === 0 ? 1 : 0;
        continue;
      }
      if (S.length < 3) S.push(Z);
      if (Z.type === "user") {
        if (r(Z)) break;
        L ||= !s(Z);
      }
    }
    for (let Z = G - 1; Z >= 0 && S.length < 3; Z--) {
      let Se = n[Z];
      if (!Se.isSidechain && (Se.type === "user" || Se.type === "assistant")) S.push(Se);
    }
    let parse = Date.parse(S[0]?.timestamp ?? "");
    weakMap_8.set(e, {
      ...h,
      tailRows: [classifyTailMessage(S[0]), classifyTailMessage(S[1]), classifyTailMessage(S[2])],
      rowsAfterTail: w,
      lastReplyStopReason: stopReasonOf(
        S.find((Z) => Z.type === "assistant" && classifyTailMessage(Z) !== "assistant_synthetic"),
      ),
      tailWrittenAtMs: Number.isFinite(parse) ? parse : void 0,
      lastPromptUuid: n[G]?.uuid,
      lastPromptOpensLastTurn: G >= 0 && !L,
      rowsAfterLastPrompt: n.length - 1 - G,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:1808799-1808851 placement
function nBo(e) {
  return e === void 0 ? void 0 : weakMap_8.get(e);
}
//@ chunk-e6aww6q8.js:1808851-1808878 placement
var eQo = 300000,
  rBo = 3600000;
/**
 * 续接诊断遥测字段（尾部行、停止原因、无结果的工具调用等）。
 */
//@ chunk-e6aww6q8.js:1808878-1809667 placement
function tailDiagnosticsFields(e, n) {
  if (e === void 0 || (e.lastPromptUuid !== void 0 && e.lastPromptUuid !== n.uuid)) return;
  let r = e.tailWrittenAtMs === void 0 || e.tailWrittenAtMs > n.nowMs ? void 0 : n.nowMs - e.tailWrittenAtMs;
  if (r !== void 0 && r >= rBo) return;
  return {
    finished_because: e.because,
    stored_tail_row: e.tailRows[0],
    stored_row_before_tail: e.tailRows[1],
    stored_row_2_before_tail: e.tailRows[2],
    rows_after_tail: e.rowsAfterTail,
    last_reply_stop_reason: e.lastReplyStopReason,
    ...(r !== void 0 && { stored_tail_age_ms: r }),
    tool_calls_without_result: e.callsWithoutResult,
    api_error_stepped_over: e.apiErrorSteppedOver,
    invisible_reply_dropped: e.invisibleReplyDropped,
    last_prompt: e.lastPromptUuid === void 0 ? "none_loaded" : "this_message",
    rows_after_last_prompt: e.rowsAfterLastPrompt,
    commands_dequeued: n.commandsDequeued,
    could_send_result: classifyTranscriptTail(e, r, n),
  };
}
/**
 * 判断转录尾部状态（最后提示未加载、工具调用无结果等）。
 */
//@ chunk-e6aww6q8.js:1809667-1810427 placement
function classifyTranscriptTail(e, n, r) {
  if (e.lastPromptUuid === void 0) return "last_prompt_not_loaded";
  if (!e.lastPromptOpensLastTurn) return "another_turn_may_follow";
  if (e.callsWithoutResult > 0) return "tool_call_without_result";
  let [s] = e.tailRows;
  if (s === "assistant_synthetic") return "tail_written_by_cli";
  if (e.because !== "reply" && e.because !== "terminal_tool_result") return "tail_not_a_reply";
  if (s === "assistant_text") {
    if (e.lastReplyStopReason !== "end_turn" && e.lastReplyStopReason !== "stop_sequence")
      return "reply_not_ended";
  } else if (e.because !== "terminal_tool_result" || s !== "user_tool_result") return "tail_not_a_reply";
  if (n === void 0 || n >= eQo) return "tail_too_old";
  if (r.commandsDequeued > 0) return "process_dequeued_a_command";
  if (r.rerunOwed) return "rerun_owed";
  return r.shuttingDown ? "shutting_down" : "yes";
}
/**
 * 助手消息的停止原因类别。
 */
//@ chunk-e6aww6q8.js:1810427-1810591 placement
function stopReasonOf(e) {
  if (e === void 0) return "no_reply_in_tail";
  let n = e.message?.stop_reason;
  if (n === void 0 || n === null) return "not_stored";
  return STOP_REASONS.find((r) => r === n) ?? "other";
}
//@ chunk-e6aww6q8.js:1810591-1810667 placement
class ftn {
  counts = void 0;
  sender = void 0;
  contentPaintSent = !1;
  promptIdleSent = !1;
}
//@ chunk-e6aww6q8.js:1810667-1810694 placement
var aQo = new HostScoped(() => new ftn());
//@ chunk-e6aww6q8.js:1810694-1810733 placement
function Uwe() {
  return aQo.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1810733-1810764 placement
function ptn(e) {
  Uwe().counts = e;
}
//@ chunk-e6aww6q8.js:1810764-1810795 placement
function h5s(e) {
  Uwe().sender = e;
}
/**
 * 报告首次内容绘制（只一次）。
 */
//@ chunk-e6aww6q8.js:1810795-1811014 placement
function reportContentPaint(e) {
  let n = Uwe();
  if (n.contentPaintSent || !n.sender) return;
  if (
    n.sender({
      kind: "content_paint",
      msgsRenderedAtFirstPaint: e,
      msgsLoaded: n.counts?.msgsLoaded,
      msgsInJsonl: n.counts?.msgsInJsonl,
    })
  )
    n.contentPaintSent = !0;
}
/**
 * 报告输入框空闲（内容绘制后，只一次）。
 */
//@ chunk-e6aww6q8.js:1811014-1811154 placement
function reportPromptIdle() {
  let e = Uwe();
  if (e.promptIdleSent || !e.contentPaintSent || !e.sender) return;
  if (e.sender({ kind: "prompt_idle" })) e.promptIdleSent = !0;
}
//@ chunk-e6aww6q8.js:1811154-1811342 placement
var WORKER_RESTARTED_PROMPT =
  "This session's worker process was restarted. If your previous turn was already complete, take no action and wait for the next event. Otherwise, continue from where you left off.";
/**
 * 会话迁移到新位置后用于继续工作的提示文本。
 */
//@ chunk-e6aww6q8.js:1811342-1812930 placement
var SESSION_MOVED_CONTINUE_PROMPT =
    "Continue from where you left off. This session moved to a new runner; files you created earlier may no longer exist, so verify the working directory state before relying on prior edits.",
  S5s = `Continue from where you left off. This session moved to a new runner; files you created earlier may no longer exist, so verify the working directory state before relying on prior edits. If the result of a tool call above starts with "[Tool call interrupted", the runner that ran it stopped or lost its connection before the call's result was recorded. The call may have had nothing to do with that, or it may have caused it, for example by using too much memory. Before you run it again, check what it did and whether it could have brought the runner down; if it could, do the work another way.`,
  g3e = [
    "Continue from where you left off. This session moved to a new runner; files you created earlier may no longer exist, so verify the working directory state before relying on prior edits.",
    `Continue from where you left off. This session moved to a new runner; files you created earlier may no longer exist, so verify the working directory state before relying on prior edits. If the result of a tool call above starts with "[Tool call interrupted", the runner that ran it stopped or lost its connection before the call's result was recorded. The call may have had nothing to do with that, or it may have caused it, for example by using too much memory. Before you run it again, check what it did and whether it could have brought the runner down; if it could, do the work another way.`,
  ];
/**
 * 记录宿主分类器上下文（按消息与内容），恢复的消息降级、判断是否仍有效。
 */
//@ chunk-e6aww6q8.js:1815469-1816209 placement
class HostClassifierContextRegistry {
  #e = new Map();
  #t = 0;
  register(e) {
    let n = e;
    if (typeof n.hostClassifierContext !== "string" || n.uuid === void 0) return;
    let r = singleToolResultId(n);
    if (r === void 0) return;
    let s = h3e(n.uuid, r);
    if (!this.#e.has(s) && this.#e.size >= mQo) {
      let h = this.#e.keys().next().value;
      if (h !== void 0) this.#e.delete(h);
    }
    this.#e.set(s, n.hostClassifierContext);
  }
  clear() {
    (this.#e.clear(), this.#t++);
  }
  getEpoch() {
    return this.#t;
  }
  degradeRestored(e) {
    for (let n of e) {
      let r = n;
      if (typeof r.hostClassifierContext !== "string" || r.uuid === void 0) continue;
      let s = singleToolResultId(r);
      if (s === void 0) continue;
      this.#e.delete(h3e(r.uuid, s));
    }
  }
  isLive(e) {
    let n = e;
    if (typeof n.hostClassifierContext !== "string" || n.uuid === void 0) return !1;
    let r = singleToolResultId(n);
    if (r === void 0) return !1;
    return this.#e.get(h3e(n.uuid, r)) === n.hostClassifierContext;
  }
}
//@ chunk-e6aww6q8.js:1816209-1816236 placement
var gQo = new HostScoped(() => new HostClassifierContextRegistry());
//@ chunk-e6aww6q8.js:1816236-1816274 placement
function eZ() {
  return gQo.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1816274-1816307 placement
function _tn(e) {
  eZ().register(e);
}
//@ chunk-e6aww6q8.js:1816307-1816335 placement
function Ket() {
  eZ().clear();
}
//@ chunk-e6aww6q8.js:1816335-1816373 placement
function S3e() {
  return eZ().getEpoch();
}
//@ chunk-e6aww6q8.js:1816373-1816413 placement
function cKe(e) {
  eZ().degradeRestored(e);
}
//@ chunk-e6aww6q8.js:1816413-1816451 placement
function Stn(e) {
  return eZ().isLive(e);
}
//@ chunk-e6aww6q8.js:1816451-1816504 placement
function E5s(e, n, r) {
  return `${e}|${n}${r ? `|${r}` : ""}`;
}
/**
 * 解析 fork 标记 “会话|边界时间|父会话”。
 */
//@ chunk-e6aww6q8.js:1816504-1816680 placement
function parseForkMarker(e) {
  if (!e) return null;
  let parts = e.split("|");
  if (parts.length === 1) return { boundaryAt: e };
  return {
    ...(parts[0] && { sessionId: parts[0] }),
    boundaryAt: parts[1] ?? "",
    ...(parts[2] && { parentSessionId: parts[2] }),
  };
}
/**
 * fork 标记转为任务状态字段。
 */
//@ chunk-e6aww6q8.js:1816680-1816932 placement
function forkMarkerFields(e) {
  let n = parseForkMarker(e);
  if (n?.sessionId === void 0 || !/^\d{4}-\d{2}-\d{2}T/.test(n.boundaryAt)) return null;
  return {
    forkSourceAlive: !0,
    forkBoundaryAt: n.boundaryAt,
    forkSessionId: n.sessionId,
    ...(n.parentSessionId && { forkParentSessionId: n.parentSessionId }),
  };
}
/**
 * 服务端工具类型集合。
 */
//@ chunk-e6aww6q8.js:1816932-1817132 placement
var SERVER_TOOL_TYPES = {
    advisor: !0,
    bash_code_execution: !0,
    code_execution: !0,
    text_editor_code_execution: !0,
    tool_search_tool_bm25: !0,
    tool_search_tool_regex: !0,
    web_fetch: !0,
    web_search: !0,
  },
  yQo = new Set(Object.keys(SERVER_TOOL_TYPES));
//@ chunk-e6aww6q8.js:1817132-1817187 placement
function u9n(e) {
  return typeof e === "string" && yQo.has(e);
}
//@ chunk-e6aww6q8.js:1817187-1817232 placement
var _Qo = "[Unsupported tool content removed]";
/**
 * 迁移旧版附件：删除已废弃类型，给缺 displayPath 的附件补相对路径。
 */
//@ chunk-e6aww6q8.js:1826542-1826882 fingerprint = migrateLegacyAttachmentTypes (0.51)
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
            : void 0;
    if (path) {
      let s = gl();
      return {
        ...message,
        attachment: { ...attachment, displayPath: s === null ? path : relative_28(s, path) },
      };
    }
  }
  return message;
}
/**
 * 去掉 text 字段不是字符串的文本块。
 */
//@ chunk-e6aww6q8.js:1826882-1827152 layout
function dropMalformedTextBlocks(e) {
  if (e.type !== "assistant" && e.type !== "user") return null;
  let content = e.message.content;
  if (!Array.isArray(content)) return null;
  let filtered = content.filter((s) => s.type !== "text" || typeof s.text === "string");
  if (filtered.length === content.length) return null;
  return { ...e, message: { ...e.message, content: filtered } };
}
/**
 * 恢复被打断轮次时追加的用户提示 "Continue from where you left off."。
 */
//@ chunk-e6aww6q8.js:1827152-1827196 fingerprint = deserializeMessagesWithInterruptDetection (0.343)
var deserializeMessagesWithInterruptDetection = "Continue from where you left off.";
//@ chunk-e6aww6q8.js:1827196-1827251 placement
function Ijr() {
  return env.CLAUDE_CODE_RESUME_PROMPT || deserializeMessagesWithInterruptDetection;
}
//@ chunk-e6aww6q8.js:1827251-1827299 placement
var INTERRUPTED_TURN = "interrupted_turn",
  tJo = /^[a-z_]{1,64}$/;
//@ chunk-e6aww6q8.js:1827299-1827385 placement
function oBo() {
  let CLAUDE_CODE_RESUME_REASON = env.CLAUDE_CODE_RESUME_REASON;
  return CLAUDE_CODE_RESUME_REASON !== void 0 && tJo.test(CLAUDE_CODE_RESUME_REASON)
    ? CLAUDE_CODE_RESUME_REASON
    : INTERRUPTED_TURN;
}
/**
 * 某 uuid 是否为最后一条有效消息。
 */
//@ chunk-e6aww6q8.js:1827385-1827611 placement
function isTailMessage(e, n) {
  if (n === void 0) return !1;
  for (let r = e.length - 1; r >= 0; r--) {
    let s = e[r];
    if (s.type !== "user" && s.type !== "assistant") continue;
    if (s.uuid === n) return !0;
    if (
      !isContextAppendMessage(s) &&
      !isQueueTranscriptOnlyUserMessage(s) &&
      !(s.type === "assistant" && _Wt(s))
    )
      return !1;
  }
  return !1;
}
/**
 * CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS 的值。
 */
//@ chunk-e6aww6q8.js:1827611-1827769 placement
function envResumeMaxAge() {
  let e = env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS;
  if (!e) return;
  let n = Number(e);
  if (n === 0) return 0;
  return Number.isFinite(n) && n > 0 ? n : 3600000;
}
/**
 * 远程会话中断回合自动续接的时间上限（环境变量或开关）。
 */
//@ chunk-e6aww6q8.js:1827769-1828053 placement
function interruptedTurnResumePolicy(e) {
  if (e && isClaudeAiChatRemote() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_rosy_puddle", !0)) return;
  let n = envResumeMaxAge();
  if (n !== void 0) return n ? { maxAgeMs: n, source: "env" } : void 0;
  if (
    e ||
    !isClaudeAiChatRemote() ||
    isAgentSdkEntrypoint() ||
    getCcrDerivedSurface() === "remote_cowork_trigger"
  )
    return;
  let r = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_STEADY_SCROLL, null);
  return typeof r === "number" && r >= oJo && r <= sJo ? { maxAgeMs: r, source: "flag" } : void 0;
}
//@ chunk-e6aww6q8.js:1828053-1828084 placement
var oJo = 5400000,
  sJo = 2592000000;
//@ chunk-e6aww6q8.js:1828084-1828160 placement
function Jet(e, n = envResumeMaxAge()) {
  if (!n) return !1;
  let r = lastMessageAgeMs(e);
  return r === void 0 || r >= n;
}
/**
 * 最后一条有效消息距今的毫秒数。
 */
//@ chunk-e6aww6q8.js:1828160-1828397 placement
function lastMessageAgeMs(e) {
  for (let n = e.length - 1; n >= 0; n--) {
    let r = e[n];
    if (
      r.type === "system" ||
      r.type === "progress" ||
      isContextAppendMessage(r) ||
      isQueueTranscriptOnlyUserMessage(r) ||
      (r.type === "assistant" && _Wt(r))
    )
      continue;
    let parse = Date.parse(r.timestamp ?? "");
    if (Number.isFinite(parse)) return Date.now() - parse;
  }
  return;
}
//@ chunk-e6aww6q8.js:1828397-1828469 placement
var aJo = 21600000,
  TENGU_SHIMMERING_CHERNY = "tengu_shimmering_cherny",
  fJo = 60000,
  pJo = 2592000000;
/**
 * 拒答重试的时间上限（环境变量、开关或默认）。
 */
//@ chunk-e6aww6q8.js:1828469-1828681 placement
function refusalRetryMaxAge() {
  let e = envResumeMaxAge();
  if (e) return { maxAgeMs: e, source: "env" };
  let n = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SHIMMERING_CHERNY, null);
  if (typeof n === "number" && Number.isFinite(n) && n >= fJo && n <= pJo)
    return { maxAgeMs: n, source: "flag" };
  return { maxAgeMs: aJo, source: "default" };
}
/**
 * 消息时间是否早于 n 毫秒前（无时间视为旧）。
 */
//@ chunk-e6aww6q8.js:1828681-1828785 placement
function isOlderThan(e, n) {
  let parse = Date.parse(e.timestamp ?? "");
  return !Number.isFinite(parse) || Math.abs(Date.now() - parse) >= n;
}
/**
 * 取时间较新的消息。
 */
//@ chunk-e6aww6q8.js:1828785-1828984 placement
function newerMessage(e, n) {
  if (e === void 0 || n === void 0) return e ?? n;
  let parse = Date.parse(e.timestamp ?? ""),
    parse_2 = Date.parse(n.timestamp ?? "");
  if (!Number.isFinite(parse)) return e;
  if (!Number.isFinite(parse_2)) return n;
  return parse_2 > parse ? n : e;
}
/**
 * 恢复中断的回合（打印模式、REPL 恢复、合成继续、重新提交）。
 */
//@ chunk-e6aww6q8.js:1828984-1829790 placement
function resumeInterruptedTurn(
  e,
  n,
  { deferred: r, pendingActionClass: s, cutOffAgentCalls: h, tail: y } = {},
) {
  logEvent("tengu_resume_interrupted_turn", {
    surface: e === "print" ? lit_2("print") : lit_2("repl_restore"),
    kind: n.isMeta ? lit_2("synthetic_continue") : lit_2("resubmit"),
    ...(r !== void 0 && { deferred: r }),
    ...(s !== void 0 && { pending_action_class: s }),
    ...(h !== void 0 && { cut_off_agent_calls: h }),
    ...(y !== void 0 && {
      tail_kind: fromEnum(y.kind),
      api_error_stepped_over: y.apiErrorSteppedOver,
      invisible_reply_dropped: y.invisibleReplyDropped,
      ...(y.ageMinutes !== void 0 && { tail_age_min: y.ageMinutes }),
      ...(y.shutdownStamped !== void 0 && { tail_shutdown_stamped: y.shutdownStamped }),
      ...(y.cutOffCalls !== void 0 && {
        cut_off_calls_shown: y.cutOffCalls.shown,
        cut_off_calls_hidden: y.cutOffCalls.hidden,
        cut_off_calls_answered_in_turn: y.cutOffCalls.inTurn,
        repeats_previous_cut_off_call: y.cutOffCalls.repeatsPrevious,
      }),
    }),
  });
}
//@ chunk-e6aww6q8.js:1829790-1829817 placement
function Wtn() {
  return isFoamySpringEnabled();
}
/**
 * 是否在续接时显示被截断的工具调用。
 */
//@ chunk-e6aww6q8.js:1829817-1829942 placement
function showsCutOffCalls() {
  return (
    env.CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS === !0 &&
    Wtn() &&
    !Z2() &&
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_mutable_phoenix_killswitch", !1)
  );
}
//@ chunk-e6aww6q8.js:1829942-1830026 placement
function v5s(e) {
  return e?.kind === "interrupted_prompt" && e.tail?.cutOffCalls !== void 0;
}
//@ chunk-e6aww6q8.js:1830026-1830039 placement
var hJo = 2000;
/**
 * 找最近可续接的会话日志（跳过仍在后台运行的会话，发现被续接到运行中的会话时回调）。
 */
//@ chunk-e6aww6q8.js:1852560-1853464 placement
async function findLatestResumableLog({
  storageV5: storageV5,
  forkSession: forkSession,
  onNewestRunningInBackground: onNewestRunningInBackground,
}) {
  let s = fetchLogs(void 0, storageV5),
    h,
    y = new Set();
  try {
    let { listAllLiveSessions: listAllLiveSessions } = await import("./chunk-ewxn4535.js"),
      { ownPidDomain: ownPidDomain } = await import("./chunk-vctscj6m.js"),
      [L, G] = await Promise.all([listAllLiveSessions(storageV5, { rejectUnreadable: !0 }), ownPidDomain()]);
    if (L.every((q) => q.kind === "interactive" || (q.kind && q.sessionId))) {
      h = new Set();
      for (let q of L) {
        if (q.kind === "interactive" || !q.sessionId) continue;
        if ((h.add(q.sessionId), q.pidDomain !== void 0 && q.pidDomain !== G)) y.add(q.sessionId);
      }
    }
  } catch {}
  return findFirstMessageLog(
    await s,
    (S) => {
      if (S.bookkeepingOnly) return !1;
      if (!forkSession && S.continuedInSessionId !== void 0 && h?.has(S.continuedInSessionId))
        return (
          onNewestRunningInBackground?.({
            sessionId: S.continuedInSessionId,
            provable: !y.has(S.continuedInSessionId),
          }),
          "stop"
        );
      if (S.superseded) return !1;
      if (forkSession) return !0;
      let w = getSessionIdFromLog(S);
      if (w !== void 0 && h?.has(w)) return !1;
      if (h === void 0 && (S.sessionKind || S.continuedInSessionId !== void 0)) return !1;
      return !0;
    },
    storageV5,
  );
}
/**
 * loadConversationForResume：按参数加载会话（最新一个/会话 id/转录路径/fork），反序列化、修复、检测中断，返回 messages、sessionId 与元数据；通知 onSessionResolved。
 */
//@ chunk-e6aww6q8.js:1853464-1858887 callgraph-witnessed = loadConversationForResume (0.21)
async function loadConversationForResume(sessionRef, n, options) {
  let s,
    h = (S, w) => {
      let onSessionResolved = options.onSessionResolved;
      if (onSessionResolved === void 0) return;
      s ??= Promise.resolve()
        .then(() => onSessionResolved({ sessionId: LE(S), transcriptPath: w }))
        .catch((G) => logForDebugging(`resume: onSessionResolved hook failed: ${errorMessage(G)}`));
    },
    y = () => {
      s?.then((S) => S?.()).catch(() => {});
    };
  try {
    let log = null,
      messages = null,
      L = !1,
      G = !1,
      sessionId,
      Z,
      Se = !1;
    if (sessionRef === void 0)
      log = await findLatestResumableLog({
        storageV5: options.storageV5,
        forkSession: options.forkSession,
        onNewestRunningInBackground: (qt) => {
          ((Se = !0), options.onNewestRunningInBackground?.(qt));
        },
      });
    else if (n && typeof sessionRef === "string")
      ((log = await getLastSessionLog(sessionRef, n, options.storageV5)),
        (sessionId = log?.messages.at(-1)?.sessionId ?? log?.sessionId ?? sessionRef));
    else if (typeof sessionRef === "string") {
      let qt = options.precedingRows?.rows.length
        ? toTranscriptEntries(options.precedingRows.rows, sessionRef)
        : void 0;
      ((log =
        (await getLastSessionLog(sessionRef, void 0, options.storageV5, qt)) ??
        (await findLogInWorktrees(sessionRef, options.storageV5)) ??
        (await findLogById(sessionRef, options.storageV5))),
        (sessionId = sessionRef));
    } else log = sessionRef;
    if (!log && !messages)
      return (logFeatureSad("session_resume", Se ? "running_in_background" : "not_found"), null);
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
      let qt = Hir(sessionId, options) ? sessionId : void 0,
        Zt = options.forkSession ? void 0 : qt;
      if (sessionId)
        if ((h(sessionId, log.fullPath), s === void 0)) await copyPlanForResume(log, qt, options.storageV5);
        else await Promise.all([copyPlanForResume(log, qt, options.storageV5), s]);
      let id = parseForkMarker(env.CLAUDE_CODE_RESUME_SOURCE_ALIVE),
        pn = sessionId ?? getSessionId();
      if (
        ((L = id !== null && (id.sessionId === void 0 || id.sessionId === pn || id.parentSessionId === pn)),
        (G = options.forkSession && id?.parentSessionId === pn),
        !L)
      )
        copyFileHistoryForResume(log, Zt, options.storageV5);
      ((messages = log.messages),
        checkResumeConsistency(messages),
        censusResumeAnnouncements(messages, log.fileSize));
    }
    let ke = messages?.length ?? 0;
    ((messages = dropRetractedMessages_2(messages)),
      (messages = dropMalformedAttachments(messages)),
      restoreInvokedSkills(messages));
    let we = log?.fullPath ?? n,
      Ee = we ? ((await findDeferredToolMarkerInTranscript(we, options.storageV5)) ?? void 0) : void 0,
      copiedSessionOwnId = options.copiedSessionOwnId,
      Ie =
        Ee === void 0 ||
        copiedSessionOwnId === void 0 ||
        messages.some(
          (qt) =>
            qt.type === "assistant" &&
            "sessionId" in qt &&
            qt.sessionId === copiedSessionOwnId &&
            Array.isArray(qt.message.content) &&
            qt.message.content.some((Zt) => Zt.type === "tool_use" && Zt.id === Ee.toolUseID),
        )
          ? Ee
          : void 0,
      Me = messages.length,
      We = messages,
      ze = messages.at(-1)?.uuid,
      lt = options.precedingRows?.first === !0 && options.precedingRows.rows.some((row) => row.uuid === ze);
    if (env.CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS === !0)
      await withDeadline(
        initializeGrowthBook().catch(() => null),
        hJo,
      );
    let Je = deserializeMessagesImpl(
      messages,
      Ie ? new Set([Ie.toolUseID]) : void 0,
      options.replyOnResume,
      log?.rewindAnchorUuid ??
        options.precedingRows?.rows.findLast((qt) => qt.type === "user" || qt.type === "assistant")?.uuid,
      options.resumeInterruptedTurn,
      G,
      options.hostAnswerableToolUseIds,
      options.restoredCardToolUseId,
      options.hostLogsFinishedTail,
      options.restoredPromptWaits,
      options.copiedSessionOwnId === void 0 ? void 0 : { ownSessionId: options.copiedSessionOwnId },
      options.showsCutOffAgentCalls,
    );
    if (((messages = Je.messages), log)) {
      let turnInterruptionState = Je.turnInterruptionState;
      jxt({
        log: log,
        stored: We,
        verdict:
          turnInterruptionState.kind === "none"
            ? "none"
            : turnInterruptionState.message.isMeta
              ? "continue"
              : "resubmit",
        rescueSuppressed: Je.rescueSuppressed,
        rewound: log.rewindAnchorUuid !== void 0,
        autoResume: Boolean(options.resumeInterruptedTurn ?? env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN),
        openerVouched:
          turnInterruptionState.kind !== "none" &&
          (!turnInterruptionState.message.isMeta ||
            turnInterruptionState.interruptedTurnUserMessageUuid !== void 0),
        supersededCalls: Je.supersededToolUseIds.size,
        cutOffCalls:
          turnInterruptionState.kind !== "none" && turnInterruptionState.tail?.cutOffCalls !== void 0
            ? { tailKind: turnInterruptionState.tail.kind, ...turnInterruptionState.tail.cutOffCalls }
            : void 0,
        isTypedPrompt: (Zt) => findLastUserPromptUuid([Zt]) === Zt.uuid,
      });
    }
    let startTime = performance.now(),
      pt =
        options.forkSession || lt || (sessionId !== void 0 && !Hir(sessionId, options)) ? "fork" : "resume",
      Et = messages,
      yt = !options.forkSession && Hir(sessionId, options) ? sessionId : getSessionId(),
      gt = { rows: [], additionalContexts: [], isOvertaken: !1, lateInitialUserMessage: void 0 },
      { sessionStartHooksWaitFor: sessionStartHooksWaitFor } = options,
      It = startHookRun("tail", (qt) =>
        processSessionStartHooks(getSessionIdentity(), pt, {
          sessionId: yt,
          sessionTitle: getCurrentSessionTitle(getSessionId()) ?? (G ? void 0 : log?.customTitle),
          resumedMessages: Et,
          orphaned: qt,
          progress: gt,
          holdHooksUntil:
            sessionStartHooksWaitFor &&
            (async () => {
              (await sessionStartHooksWaitFor(qt), (startTime = performance.now()));
            }),
          storageV5: options.storageV5,
          credentials: options.credentials,
        }).then((Zt) => {
          if (qt.aborted) return Zt;
          Br("hooks_init_ms", performance.now() - startTime, startTime);
          let rn = PGt();
          if (rn) applyResumeHookSessionTitle(rn, yt, options.storageV5);
          return Zt;
        }),
      );
    if ((ptn({ msgsLoaded: Me, msgsInJsonl: ke }), Z !== void 0))
      logFeatureSad("session_resume", "transcript_unreadable", { errno: Z });
    else logFeatureOk("session_resume");
    return {
      messages: messages,
      sessionStartHooks: { ...It, progress: gt },
      turnInterruptionState: Je.turnInterruptionState,
      supersededToolUseIds: Je.supersededToolUseIds,
      supersededToolNames: Je.supersededToolNames,
      answeredToolUseIds: Je.answeredToolUseIds,
      rescueSuppressed: Je.rescueSuppressed,
      deferredToolUse: Ie,
      fileHistorySnapshots: L ? void 0 : log?.fileHistorySnapshots,
      attributionSnapshots: log?.attributionSnapshots,
      contentReplacements: log?.contentReplacements,
      sessionId: sessionId,
      agentName: G ? void 0 : log?.agentName,
      agentColor: log?.agentColor,
      agentSetting: log?.agentSetting,
      customTitle: G ? void 0 : log?.customTitle,
      ...withEndedByModel({}, getEndedByModel(log)),
      aiTitle: G ? void 0 : log?.aiTitle,
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
    if (error instanceof ResumeRefusedError) throw (logFeatureSad("session_resume", "refused"), y(), error);
    if ((logFeatureBad("session_resume", "load_failed"), y(), Qoe(error)))
      logForDebugging(`loadConversationForResume failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(withTelemetryMessage(toError(error), "loadConversationForResume failed"));
    throw error;
  }
}
/**
 * 在各 worktree 的项目目录中找会话日志。
 */
//@ chunk-e6aww6q8.js:1858887-1859090 placement
async function findLogInWorktrees(e, n) {
  let r = wrapStorageSource(getTranscriptStorageContext(n));
  for (let s of await getWorktreePaths(getOriginalCwd()))
    for (let h of await findProjectDirs(s, r)) {
      let y = await getLastSessionLog(e, join_69(h, `${e}.jsonl`), n);
      if (y) return (logEvent("tengu_resume_worktree_fallback", {}), y);
    }
  return null;
}
/**
 * 按会话 id 扫描找唯一的 transcript。
 */
//@ chunk-e6aww6q8.js:1859090-1859253 placement
async function findLogById(e, n) {
  let r = await findSoleTranscriptWithMessagesById(
    e,
    void 0,
    wrapStorageSource(getTranscriptStorageContext(n)),
  );
  if (r === null) return null;
  let s = await getLastSessionLog(e, r, n);
  if (s) logEvent("tengu_transcript_id_scan_fallback", {});
  return s;
}
/**
 * require chunk-vswknp5v（BRIEF_TOOL_NAME/LEGACY_BRIEF_TOOL_NAME）与 chunk-cv3kgbt2（isBriefEnabled 等）。
 */
//@ chunk-e6aww6q8.js:3310099-3310228 fingerprint = LEGACY_BRIEF_TOOL_NAME (0.325)
var briefToolModule = require("./chunk-vswknp5v.js"),
  briefEnablementModule = require("./chunk-cv3kgbt2.js"),
  BRIEF_TOOL_NAME = briefToolModule.BRIEF_TOOL_NAME,
  LEGACY_BRIEF_TOOL_NAME = briefToolModule.LEGACY_BRIEF_TOOL_NAME;
/**
 * 内容块中有非空文本。
 */
//@ chunk-0h4e7gnq.js:133809-133923 placement
function hasNonEmptyText(e) {
  return e
    .filter((n) => n.type === "text" && typeof n.text === "string")
    .some((n) => n.text.trim().length > 0);
}
//@ chunk-0h4e7gnq.js:133923-134539 placement
function dropRetractedOnResume(e, n) {
  let s = dropRetractedMessages(e);
  if (n?.suppressDropTelemetry !== !0 && s.length !== e.length)
    logEvent("tengu_resume_retracted_dropped", { dropped: e.length - s.length, chain_length: e.length });
  let y = (x) =>
      x.type === "system" && "subtype" in x && x.subtype === "model_refusal_fallback" && x.scope === "local",
    r = (x) => getCanonicalName(Bn(x)),
    last = s.findLast(
      (x) => x.type === "assistant" && !x.isApiErrorMessage && hasNonEmptyText(x.message.content),
    );
  if (last === void 0) return { live: s, notice: void 0 };
  let h = Fi(last.message.model);
  if (h === void 0) return { live: s, notice: void 0 };
  let k = r(h),
    last_2 = s.findLast((x) => {
      if (!y(x)) return !1;
      let L = Fi(x.fallbackModel);
      return L !== void 0 && r(L) === k;
    });
  return { live: s, notice: last_2 };
}
//@ chunk-0h4e7gnq.js:134539-134590 placement
function Fi(e) {
  return typeof e === "string" ? e : void 0;
}
/**
 * 去掉被拒答回退撤回的消息。
 */
//@ chunk-0h4e7gnq.js:134590-134868 placement
function dropRetractedMessages(e) {
  let n = new Set(
    e.flatMap((s) =>
      s.type === "system" && s.subtype === "model_refusal_fallback" && s.retractedMessageUuids !== void 0
        ? s.retractedMessageUuids.map((retractedMessageUuid) => retractedMessageUuid.slice(0, Ni))
        : [],
    ),
  );
  if (n.size === 0) return e;
  return e.filter((s) => s.type === "system" || !n.has(s.uuid.slice(0, Ni)));
}
/**
 * 轮次是否已正常结束：assistant 无 tool_use 且有非空文本，或非关机中断的 user 消息。
 */
//@ chunk-tyg7f3ek.js:326687-326938 callgraph-fingerprint = isTerminalToolResult (0.709)
function isTerminalToolResult(e) {
  if (e.type === "assistant") {
    let n = Array.isArray(e.message.content) ? e.message.content : [];
    return !n.some((r) => r.type === "tool_use") && n.some((r) => r.type === "text" && r.text.trim() !== "");
  }
  return e.type === "user" && !isHarnessMetaMessage(e) && e.interruptedByShutdown !== !0;
}
/**
 * 检测 interrupted_prompt：被打断的提示之后没有已完成的回答时返回该提示 uuid。
 */
//@ chunk-tyg7f3ek.js:326938-327185 fingerprint = detectTurnInterruption (0.439)
function detectTurnInterruption(e, n) {
  let r = interruptedPromptUuid(e),
    lastMessageIdx = n.findLastIndex((y) => y.uuid === r);
  if (e?.kind !== "interrupted_prompt" || lastMessageIdx === -1) return;
  let h;
  for (let y of n.slice(lastMessageIdx + 1))
    if (!isInterruptMarkerRow(y)) h = countUserPromptsFromEntries_5(y) ? y : h;
    else if (y.uuid !== e.message.uuid) {
      if (h !== void 0 && isTerminalToolResult(h)) return;
      h = void 0;
    }
  return r;
}

export {
  BRIEF_TOOL_NAME,
  briefEnablementModule,
  resumeInterruptedTurn,
  dropRetractedOnResume,
  hasNonEmptyText,
  cKe,
  parseForkMarker,
  loadConversationForResume,
  Ket,
  getLastSessionLog,
  detectTurnInterruption,
  nBo,
  tailDiagnosticsFields,
  v5s,
  Ijr,
  reportContentPaint,
  reportPromptIdle,
  Stn,
  restoreSkillStateFromMessages,
  u9n,
  E5s,
  S3e,
  _tn,
  LEGACY_BRIEF_TOOL_NAME,
  _Qo,
  WORKER_RESTARTED_PROMPT,
  deserializeMessagesWithInterruptDetection,
  g3e,
  Wtn,
  migrateLegacyAttachmentTypes,
  dropMalformedTextBlocks,
  isTailMessage,
  interruptedTurnResumePolicy,
  Jet,
  showsCutOffCalls,
  lastMessageAgeMs,
  newerMessage,
  refusalRetryMaxAge,
  isOlderThan,
  recordTailDiagnostics,
  forkMarkerFields,
  h5s,
  S5s,
  SESSION_MOVED_CONTINUE_PROMPT,
  rBo,
  oBo,
  findLatestResumableLog,
};
