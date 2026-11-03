/**
 * query/presenceCheck.ts
 *
 * 2.1.316 新增：Artifact 补丁回合：判断资格、组合补丁请求并记录结果；按编辑规则排除工具的结果（off/shadow 模式下不执行）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (57)
 * attribution: placement 57
 */
import { isInlineNotificationMode } from "../utils/attachments.js";
import { getContentText, createAssistantMessage } from "../utils/messages.js";
import {
  normalizeTaskNotificationOrigin,
  resolveTaskNotificationOrigin,
} from "../utils/backgroundSessionResume.js";
import {
  isHumanOrUnset,
  isAutoContinuationOrigin,
  isVerifiedSlackHuman,
  hasHearthRelay,
} from "../utils/messageProvenance.js";
import { vbe, G1o } from "../plugins/functionHooks/personHold.js";
import { resolvePromptSource } from "../utils/promptSource.js";
import { isGoalIdleCheckinPaused } from "./goalCheckIn.js";
import { oX } from "../plugins/functionHooks/promptSubmit.js";
import { MZ } from "../plugins/functionHooks/commandRunDispatch.js";
import { b7e, submitPromptWithHooks, _Io } from "../utils/processUserInput/userPromptSubmitHooks.js";
import {
  isAbortError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { isDelegatedObservationContext, hasMainKey } from "../utils/agentContext.js";
import { hasModuleHookingSite } from "../plugins/hooksModules/loadedModuleFilters.js";
import { canShortcutAppend } from "../plugins/functionHooks/modAdmission.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { TENGU_COBALT_PLINTH_ORPINE } from "../services/api/withRetry.js";
import { SessionRootSlot, jb, isNonConversationMessage } from "../bootstrap/sessionSlices.js";
import { getSessionId, getThinkingTypeOverride } from "../bootstrap/state.js";
import { count } from "../utils/collections.js";
import {
  getMainLoopModel as getMainLoopModel_2,
  getToolPermissionContext,
} from "../utils/permissions/toolPermissionContext.js";
import { classifyQuerySource } from "../services/api/requestHeaders.js";
import { isBriefEnabled } from "../tools/BriefTool/BriefTool.js";
import { toolMatchesName } from "../Tool.js";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { ARTIFACT_TOOL_NAME, VIEWER_PREFIX_RE, parseArtifactUrl } from "../tools/ArtifactTool/constants.js";
import { getCanonicalName } from "../utils/model/canonicalModelName.js";
import { strictHumanDeciderTurn, A8t } from "../utils/turnOrigin.js";
import { modelSupportsAdaptiveThinking } from "../utils/thinking.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "../utils/model/telemetryModelName.js";
import { nSt } from "../plugins/functionHooks/coreHandlers.js";
import { Mwt, Ebe, Owt, appendRowsWithHooks } from "../utils/queryHelpers.js";
import { lp } from "../plugins/functionHooks/surfaceBinding.js";
import {
  MAIN_OBSERVED_KEY,
  Wyt,
  truncateObserverText,
  x7e,
  enqueueObserverActivity,
  gln,
} from "../services/agentObserver/agentObserver.js";
import { classifyNonUserMessageSource } from "../utils/messages/nonUserMessages.js";
import { REPL_EVAL, REPL_STATUS } from "../utils/pollEvents.js";
import { idleClearingMode, logIdleClearingFailure } from "../services/compact/idleToolResultClearing.js";
import { planToolResultClearingAfterIdle, SMALL_RESULT_BYTES } from "../services/compact/microCompact.js";
import { canonicalToolName } from "../utils/permissions/permissionRuleParser.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { expandPathOrNull } from "../utils/path.js";
import { isFileUnchangedStub } from "../tools/FileReadTool/prompt.js";
import { SHELL_TOOL_NAMES } from "../utils/shell/shellToolUtils.js";
import { extractReadOnlyFileReads } from "../tools/BashTool/BashTool.js";

/**
 * 判断用户文本是否是"解释一下"类请求。
 */
//@ chunk-ha3km179.js:14651-15143 placement
function isExplainRequest(e) {
  let trimmed = e
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return /^(?:(?:ok|okay|please|pls|can you|could you|would you),? )*(?:explain|walk me through|help me understand|teach me)\b|^(?:why (?:does|do|is|are|was|were|would|should) (?!you\b|u\b)(?![^.?!]*\b(?:still|again)\b)|how (?:come|does|do (?:these|those)) |what (?:does|do) (?!you\b|u\b|we\b|i\b)|what(?:'s| is) (?:this|that)\b|i (?:don'?t|do not) (?:understand\b|get (?:this|it|why|how|what)\b))/.test(
    trimmed,
  );
}
//@ chunk-ha3km179.js:15143-15218 placement
function va(e) {
  let lower = e.toLowerCase();
  return /\bgo to (sleep|bed)\b/.test(lower);
}
/**
 * "你在吗"类在场确认短语集合。
 */
//@ chunk-ha3km179.js:15218-16200 placement
var PRESENCE_PINGS = new Set([
  "ping",
  "u there",
  "you there",
  "are you there",
  "r u there",
  "u here",
  "you here",
  "are you here",
  "you back",
  "are you back",
  "u back",
  "anyone there",
  "anybody there",
  "still there",
  "you still there",
  "are you still there",
  "still working",
  "you still working",
  "are you still working",
  "you stuck",
  "are you stuck",
  "u stuck",
  "\u5582",
  "\u5728\u5417",
  "\u5728\u55CE",
  "\u8FD8\u5728\u5417",
  "\u9084\u5728\u55CE",
  "\u5728\u4E0D\u5728",
  "\u3082\u3057\u3082\u3057",
  "\u304A\u3044",
  "\u304A\u30FC\u3044",
  "\u3044\u307E\u3059\u304B",
  "\uC5EC\uBCF4\uC138\uC694",
  "\uC57C",
  "\uC788\uC5B4\uC694",
  "hola",
  "oye",
  "est\xE1s ah\xED",
  "estas ahi",
  "sigues ah\xED",
  "sigues ahi",
  "oi",
  "ol\xE1",
  "ola",
  "al\xF4",
  "alo",
  "t\xE1 a\xED",
  "ta ai",
  "est\xE1 a\xED",
  "esta ai",
  "allo",
  "all\xF4",
  "salut",
  "coucou",
  "t'es l\xE0",
  "t'es la",
  "tu es l\xE0",
  "tu es la",
  "hallo",
  "bist du da",
  "noch da",
  "\u043F\u0440\u0438\u0432\u0435\u0442",
  "\u044D\u0439",
  "\u0430\u043B\u043B\u043E",
  "\u0442\u044B \u0442\u0443\u0442",
  "ciao",
  "ehi",
  "ci sei",
]);
/**
 * 判断用户输入是否只是"在吗"类试探（问号、省略号、hi/hello 或常见问候短语，最长 40 字）。
 */
//@ chunk-ha3km179.js:16200-16471 placement
function isPresencePing(e) {
  let trimmed = e.trim();
  if (trimmed.length > 40) return !1;
  if (/^(\?+|\.{2,}|\u2026+)$/u.test(trimmed)) return !0;
  let trimmed_2 = trimmed
    .toLowerCase()
    .replace(/^[\u00BF\u00A1]+|[?!.\u00BF\u00A1\uFF1F\uFF01\u3002\u2026]+$/gu, "")
    .trim();
  if (/^(hi+|hello+|he+y+|yo+)$/.test(trimmed_2)) return !0;
  return PRESENCE_PINGS.has(trimmed_2);
}
//@ chunk-ha3km179.js:16471-16506 placement = getValueFromInput (1)
var getValueFromInput = (e, n) => n && e.mode === "prompt";
//@ chunk-ha3km179.js:16506-16601 placement
var Ar = (e) =>
  isInlineNotificationMode(e) &&
  e.promptSubmitted === void 0 &&
  e.shouldQuery !== !1 &&
  e.skipSubmissionHooks !== !0;
//@ chunk-ha3km179.js:16601-16684 placement
function wr(e, n) {
  let r = new Set(n.getCommandQueue());
  return e.filter((s) => r.has(s));
}
//@ chunk-ha3km179.js:16684-16786 placement
function filterPromptSubmissions(e, n) {
  let r = !1,
    s = [];
  for (let h of e)
    if (Ar(h)) r = !0;
    else if (!getValueFromInput(h, r)) s.push(h);
  return wr(s, n);
}
//@ chunk-ha3km179.js:16786-16861 placement = processQueuedCommands (1)
var processQueuedCommands = (queuedCommands) =>
  queuedCommands.mode === "task-notification" ? { kind: "task-notification" } : void 0;
//@ chunk-ha3km179.js:16861-16974 placement
var submissionPayload = (e) => ({
  text: getContentText(e.value) ?? "",
  input: e.value,
  pastedContents: e.pastedContents,
  ...(e.isMeta === !0 && { isMeta: !0 }),
});
/**
 * 描述一次输入提交（来源、模式、是否等待、上下文）。
 */
//@ chunk-ha3km179.js:16974-17369 placement
function describeSubmission(e, n, r) {
  let s = normalizeTaskNotificationOrigin(e.origin) ?? processQueuedCommands(e),
    h = e.isMeta === !0 || !isHumanOrUnset(s);
  return {
    submission: submissionPayload(e),
    origin: s,
    bridgeOrigin: e.bridgeOrigin,
    mode: e.mode,
    turnId: vbe()?.turnId,
    shouldWait: e.wait === !0,
    context: n,
    result: r,
    promptSource: resolvePromptSource({
      isNonInteractive: n.options.isNonInteractiveSession,
      isMeta: e.isMeta,
      callerSource: h ? "system" : (e.inputSource ?? "queued"),
    }),
    wakeupSource: e.wakeupSource,
    isStartInput: isGoalIdleCheckinPaused(e.uuid),
  };
}
//@ chunk-ha3km179.js:17369-17403 placement
var xr = (e, n) => ({ fate: e ? n : "left" });
//@ chunk-ha3km179.js:17403-17632 placement
function submissionOutcome({
  outcome: outcome,
  scratch: scratch,
  under: under,
  text: text,
  isHidden: isHidden,
}) {
  let { proceeds: proceeds } = outcome;
  return {
    text: isHidden ? text : proceeds ? proceeds.text : (outcome.text ?? text),
    context: proceeds ? proceeds.context : outcome.context,
    messages: scratch.messages,
    under: under,
    stopped: proceeds ? void 0 : outcome.stopped,
    sessionTitle: proceeds?.sessionTitle,
  };
}
/**
 * 当前激活的消息队列。
 */
//@ chunk-ha3km179.js:17632-17668 placement
var getActiveMessageQueue = () => (oX.get() ? MZ.get() : void 0);
//@ chunk-ha3km179.js:17668-17711 placement
var Da = (e) => !e.isStartInput && getActiveMessageQueue() !== void 0;
/**
 * 决定提交的去向（立即处理、等待、浮出）。
 */
//@ chunk-ha3km179.js:17711-18620 placement
async function routeSubmission(e, n) {
  let messageQueue = n.messageQueue,
    s = { messages: [], shouldQuery: !0 },
    h = describeSubmission(e, n, s),
    y = () => xr(messageQueue.settleSurfaced(e, { promptSubmitted: void 0, drainOnly: !0 }), "waits");
  if (Da(h)) return y();
  let S, M, R;
  function T(Q) {
    if (!Q || !S || Q.wasCancelled)
      return xr(messageQueue.settleSurfaced(e, { promptSubmitted: void 0, drainOnly: !0 }), "waits");
    let D = Q.ended !== void 0;
    return xr(
      messageQueue.settleSurfaced(e, {
        promptSubmitted: submissionOutcome({
          outcome: Q,
          scratch: s,
          under: S,
          text: h.submission.text,
          isHidden: e.isMeta === !0 && isAutoContinuationOrigin(h.origin),
        }),
        drainOnly: D ? !0 : void 0,
      }),
      D ? "waits" : "surfaces",
    );
  }
  try {
    ((S = b7e(n)),
      (M = await submitPromptWithHooks({
        ...h,
        enter: async (Q) => {
          R = T(Q);
        },
      })));
  } catch (error) {
    if (!isAbortError(error))
      logForDebugging(
        "prompt.submit at the fold failed, leaving the prompt to the drain: " + errorMessage(error),
        { level: "error" },
      );
  }
  if (R) return R;
  let w = M?.ended && M.stopped === void 0 ? M.ended : void 0;
  function P(Q) {
    if (!messageQueue.settleSurfaced(e, { dropped: !0 })) return { fate: "left" };
    return (messageQueue.handTypedBack([e]), { fate: "dropped", notices: Q.messages });
  }
  return w ? P(w) : T(M);
}
/**
 * 批量路由排队的提交。
 */
//@ chunk-ha3km179.js:18620-19073 placement
async function routeSubmissions(e, n) {
  let r = [],
    s = [],
    h = [],
    y = !1,
    S = !1,
    M;
  try {
    for (let R of e) {
      if (getValueFromInput(R, y)) continue;
      if (((M ??= _Io(n)), !Ar(R) || !M)) {
        r.push(R);
        continue;
      }
      S = !0;
      let w = await routeSubmission(R, n);
      switch (w.fate) {
        case "surfaces":
          r.push(R);
          break;
        case "waits":
          y = !0;
          break;
        case "dropped":
          (s.push(...w.notices), h.push(R));
          break;
        case "left":
          break;
      }
    }
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return { deliverable: filterPromptSubmissions(e, n.messageQueue), notices: s, dropped: h };
  }
  return { deliverable: S ? wr(r, n.messageQueue) : r, notices: s, dropped: h };
}
/**
 * 包装 callModel，在调用前解析 prompt.attachment hook 的附件。
 */
//@ chunk-ha3km179.js:19073-19485 placement
function wrapCallModelWithAttachments(e, n) {
  let { agentContext: agentContext, hookOrigin: hookOrigin, options: options } = n;
  return isDelegatedObservationContext(agentContext) || options?.settingsHooksOff === !0
    ? e
    : {
        ...e,
        callModel: async function* (S) {
          try {
            if (hasModuleHookingSite("prompt.attachment", void 0, canShortcutAppend("prompt.attachment"))) {
              let { resolveAttachments: resolveAttachments } = await import("./chunk-6mt8vha1.js");
              await resolveAttachments(
                S.messages,
                { signal: S.signal, origin: hookOrigin },
                S.options.agentId,
              );
            }
          } catch (error) {
            if (S.signal.aborted) throw error;
            if (!isAbortError(error)) logError(error);
          }
          return yield* e.callModel(S);
        },
      };
}
//@ chunk-ha3km179.js:19485-19512 placement
var Ir = ["claude-opus-5-5"];
/**
 * 解析 Artifact 补丁回合配置（开关、模型、side call 类）。
 */
//@ chunk-ha3km179.js:19512-19844 placement
function parseArtifactPatchConfig(e) {
  if (e === !0) return { on: !0, models: Ir };
  if (typeof e !== "object" || e === null || Array.isArray(e)) return { on: !1, models: Ir };
  let { enabled: enabled, models: models, sideCallClass: sideCallClass } = e,
    h = Array.isArray(models) && models.length > 0 && models.every((y) => typeof y === "string");
  return {
    on: enabled === !0 && (models === void 0 || h),
    models: h ? models : Ir,
    sideCallClass: sideCallClass === "side_reply" ? "side_reply" : void 0,
  };
}
/**
 * Artifact 补丁回合可忽略的附件类型集合。
 */
//@ chunk-ha3km179.js:19844-21092 placement
var ARTIFACT_PATCH_IGNORABLE_ATTACHMENTS = !1,
  Xp = new Set([
    "advisor_tool",
    "agent_listing_delta",
    "artifact_opening_prefetch",
    "attention_budget",
    "auto_mode",
    "auto_mode_exit",
    "bash_output_audience_note",
    "batching_reminder",
    "batching_reminder_sent",
    "budget_usd",
    "command_permissions",
    "context_efficiency",
    "credential_org",
    "date",
    "date_change",
    "deferred_tools_delta",
    "deferred_tools_record",
    "diagnostics",
    "dynamic_skill",
    "elapsed_time_reminder",
    "environment",
    "invoked_skills",
    "mcp_dropped_tools_delta",
    "mcp_instructions_delta",
    "model",
    "nested_memory",
    "output_limit_note",
    "output_token_usage",
    "plan_mode_exit",
    "prefix_delta",
    "prompt_render_point",
    "prompt_snapshot",
    "read_truncation_notice",
    "relevant_memories",
    "remote_session_change",
    "secondary_reminder",
    "secondary_reminder_sent",
    "session_settings",
    "silent_turn_reminder",
    "skill_listing",
    "task_reminder",
    "team_context",
    "thinking_drop",
    "thinking_stripped",
    "thread_state",
    "todo_reminder",
    "token_usage",
    "tool_hosts_correction",
    "tool_hosts_notice",
    "tool_search_usage_reminder",
    "total_tokens_reminder",
    "ultra_effort_exit",
    "withheld_memory",
    "workflow_size_guideline_change",
  ]),
  Jp = !0,
  Zp = new Set([
    "async_hook_response_batch",
    "hook_cancelled",
    "hook_error_during_execution",
    "hook_non_blocking_error",
    "hook_permission_decision",
    "hook_system_message",
  ]);
/**
 * 开关打开时把 callModel 包装为 Artifact 补丁回合。
 */
//@ chunk-ha3km179.js:21092-21457 placement
function wrapArtifactPatchTurn(e, n) {
  try {
    let r = parseArtifactPatchConfig(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_ORPINE, !1));
    if (!r.on) return e;
    let s = createArtifactPatchTurn(e.callModel, n, {
      compose: async (h) => (await import("./chunk-eavynfj6.js")).composePatch(h),
      uuid: e.uuid,
      now: () => Date.now(),
      models: r.models,
      sideCallClass: r.sideCallClass,
    });
    return { ...e, callModel: (h) => s.step(h) };
  } catch (error) {
    return (logError(artifactPatchError(error, "while setting up; the loop runs without the patch turn")), e);
  }
  return e;
}
//@ chunk-ha3km179.js:21457-21660 placement
var ARTIFACT_PATCH_SKIP_REASONS = new Set([
    "plan_mode",
    "brief_mode",
    "tools_missing",
    "model_not_listed",
    "thinking_budgeted",
    "not_person_turn",
    "not_plain_text",
    "has_attachments",
  ]),
  om = new SessionRootSlot(() => ({ sessionId: void 0, reasons: new Set() }));
/**
 * Artifact 补丁回合：判断资格、组合补丁请求并记录结果。
 */
//@ chunk-ha3km179.js:21660-24530 placement
function createArtifactPatchTurn(e, n, r) {
  let s = { kind: "fresh" },
    h,
    y = 0,
    S = r.log ?? reportArtifactPatchTurn,
    M = (D) => {
      (logForDebugging(
        `artifact patch turn: ${D.outcome}${D.reason === void 0 ? "" : ` (${D.reason})`} at request ${y} of the turn`,
      ),
        S(D));
    },
    R = (D) => {
      if (D === "not_main_thread" || D === "subagent" || D === "not_first_request") return !1;
      if (!ARTIFACT_PATCH_SKIP_REASONS.has(D)) return !0;
      let of = om.of(n.session),
        z = getSessionId();
      if (of.sessionId !== z) ((of.sessionId = z), of.reasons.clear());
      if (of.reasons.has(D)) return !1;
      return (of.reasons.add(D), !0);
    },
    T = () => {
      if (s.kind === "edits_sent" || s.kind === "publish_sent") {
        try {
          M({
            ...s.event,
            outcome: "canceled",
            reason: s.kind === "edits_sent" ? "during_write" : "during_publish",
          });
        } catch (error) {
          logError(artifactPatchError(error, "while recording a canceled turn"));
        }
        s = { kind: "done" };
      }
    };
  async function* w(D) {
    y++;
    let L;
    try {
      L = await P(D);
    } catch (error) {
      (logError(artifactPatchError(error, "before a step; the model takes the turn")),
        M({ outcome: "error" }),
        (s = { kind: "done" }));
    }
    if (s.kind === "done" && h !== void 0) (h.removeEventListener("abort", T), (h = void 0));
    if (L === void 0) return yield* e(D);
    yield L;
  }
  async function P(D) {
    let L = s;
    switch (((s = { kind: "done" }), L.kind)) {
      case "fresh":
        return D.signal.aborted ? void 0 : await Q(D);
      case "edits_sent": {
        let {
            ids: ids,
            editsSent: editsSent,
            reply: reply,
            sideCallMessageId: sideCallMessageId,
            target: target,
            event: event,
          } = L,
          Z = count(ids, (se) => toolResultStatus(D.messages, se) === "ok"),
          re = { ...event, editsWritten: Z };
        if (Z !== ids.length) {
          M({ ...re, outcome: "write_failed" });
          return;
        }
        if (toolResultsAnswered(D.messages, ids)) {
          M({ ...re, outcome: "unpublished", reason: "interjected" });
          return;
        }
        let Re = Ga(r.uuid);
        return (
          (s = {
            kind: "publish_sent",
            ids: [Re],
            editsSent: editsSent,
            reply: reply,
            sideCallMessageId: sideCallMessageId,
            target: target,
            event: re,
          }),
          hasMemoryFileRead(target.path, Re)
        );
      }
      case "publish_sent": {
        let {
          ids: ids,
          editsSent: editsSent,
          reply: reply,
          sideCallMessageId: sideCallMessageId,
          target: target,
          event: event,
        } = L;
        if (toolResultStatus(D.messages, ids[0]) !== "ok") {
          M({ ...event, outcome: "publish_failed" });
          return;
        }
        if (toolResultsAnswered(D.messages, ids)) {
          M({ ...event, outcome: "published", reason: "interjected" });
          return;
        }
        return (
          M({ ...event, outcome: "published" }),
          buildPatchTextMessage(patchSummaryText(editsSent, target.url, reply), sideCallMessageId)
        );
      }
      case "done":
        return;
    }
  }
  async function Q(D) {
    let L = checkArtifactPatchEligibility(D, n, r.models);
    if (!L.ok) {
      if (R(L.reason)) M({ outcome: "ineligible", reason: L.reason });
      return;
    }
    let z = getMainLoopModel_2(n),
      compose = await r.compose({
        request: L.request,
        path: L.target.path,
        slug: L.target.slug,
        observedVer: L.target.observedVer,
        model: z,
        thinkingConfig: D.thinkingConfig,
        sideCallClass: r.sideCallClass,
        permissions: () => getToolPermissionContext(n),
        context: n,
        now: r.now,
      }),
      ee = {
        outcome: compose.kind === "patched" ? "published" : compose.kind,
        reason: compose.kind === "patched" ? void 0 : compose.reason,
        retried: compose.retried,
        pageBytes: compose.pageBytes,
        requestChars: L.request.length,
        readMs: compose.timings.readMs,
        callMs: compose.timings.callMs,
        retryMs: compose.timings.retryMs,
        model: z,
        ...(compose.kind === "patched" && { edits: compose.editCount }),
        ...(compose.kind !== "patched" && { failingEdit: compose.failingEdit }),
      };
    if (compose.kind !== "patched") {
      M(ee);
      return;
    }
    if (D.signal.aborted) {
      M({ ...ee, outcome: "canceled", reason: "before_write" });
      return;
    }
    (compose.seedReadState(), D.signal.addEventListener("abort", T, { once: !0 }), (h = D.signal));
    let mapped = compose.edits.map(() => Ga(r.uuid));
    return (
      (s = {
        kind: "edits_sent",
        ids: mapped,
        editsSent: compose.edits.length,
        reply: compose.reply,
        sideCallMessageId: compose.sideCallMessageId,
        target: L.target,
        event: ee,
      }),
      buildEditToolUses(L.target.path, compose.edits, mapped)
    );
  }
  return { step: w };
}
/**
 * 判断能否走 Artifact 补丁回合（主线程、非子代理、非计划模式等）。
 */
//@ chunk-ha3km179.js:24530-25885 placement
function checkArtifactPatchEligibility(e, n, r = Ir) {
  let s = (L) => ({ ok: !1, reason: L });
  if (classifyQuerySource(e.options.querySource) !== "main") return s("not_main_thread");
  if (n.agentId !== void 0) return s("subagent");
  if (getToolPermissionContext(n).mode === "plan") return s("plan_mode");
  if (isBriefEnabled()) return s("brief_mode");
  if (
    !e.tools.some((tool) => toolMatchesName(tool, FILE_EDIT_TOOL_NAME)) ||
    !e.tools.some((tool) => toolMatchesName(tool, ARTIFACT_TOOL_NAME))
  )
    return s("tools_missing");
  let h = getMainLoopModel_2(n);
  if (!r.includes(getCanonicalName(h))) return s("model_not_listed");
  if (!usesAdaptiveThinking(e.thinkingConfig, h)) return s("thinking_budgeted");
  let { messages: messages } = e,
    S = strictHumanDeciderTurn(messages);
  if (S === void 0 || S.type !== "user" || S.isMeta) return s("not_person_turn");
  let sliced = messages.slice(messages.lastIndexOf(S) + 1);
  if (sliced.some((L) => L.type !== "attachment")) return s("not_first_request");
  let R = plainPromptText(S);
  if (R === void 0) return s("not_plain_text");
  if (sliced.some((L) => !isIgnorableAttachment(L, "opener"))) return s("has_attachments");
  let heldSourcePages = n.artifactRegistries.recordedPages.heldSourcePages();
  if (heldSourcePages.length === 0) return s("no_artifact");
  let w = artifactSlugsInText(R),
    P;
  if (w === "unreadable" || w.length > 1) return s(w === "unreadable" ? "url_not_held" : "several_artifacts");
  else if (w.length === 1) {
    if (((P = heldSourcePages.find((L) => L.slug === w[0])), P === void 0)) return s("url_not_held");
  } else if (heldSourcePages.length === 1) P = heldSourcePages[0];
  else return s("several_artifacts");
  if (P.unasked) return s("unasked_republish");
  let { ver: ver, observers: observers } = n.getArtifactReadObservation(P.slug);
  if (ver === void 0 || !hasMainKey(observers)) return s("no_observed_version");
  return { ok: !0, request: R, target: { path: P.path, slug: P.slug, url: P.url, observedVer: ver } };
}
//@ chunk-ha3km179.js:25885-26021 placement
function usesAdaptiveThinking(e, n) {
  if (e.type === "disabled") return !0;
  return (
    modelSupportsAdaptiveThinking({
      runtimeOverride: getThinkingTypeOverride(n),
      resolvedModel: n,
      canonicalModel: getCanonicalName(n),
    }) === "adaptive"
  );
}
/**
 * 附件是否可在补丁回合中忽略。
 */
//@ chunk-ha3km179.js:26021-26559 placement
function isIgnorableAttachment(e, n) {
  if (e.type !== "attachment") return !1;
  let attachment = e.attachment;
  if (Xp.has(attachment.type) || Zp.has(attachment.type)) return !0;
  let s = n === "opener" && Jp;
  if (attachment.type === "hook_additional_context") return s;
  if (attachment.type === "async_hook_response") {
    let h = attachment.response ?? {},
      y =
        typeof h.hookSpecificOutput === "object" && h.hookSpecificOutput !== null
          ? h.hookSpecificOutput.additionalContext
          : void 0;
    return (!h.systemMessage && !y) || s;
  }
  return (
    attachment.type === "hook_success" &&
    (attachment.content === "" ||
      s ||
      (attachment.hookEvent !== "SessionStart" &&
        attachment.hookEvent !== "UserPromptSubmit" &&
        attachment.hookEvent !== "UserPromptExpansion"))
  );
}
//@ chunk-ha3km179.js:26559-26781 placement
function plainPromptText(e) {
  let { content: content } = e.message,
    r;
  if (typeof content === "string") r = content;
  else if (content.every((h) => h.type === "text"))
    r = content.map((h) => (h.type === "text" ? h.text : "")).join(`
`);
  else return;
  let trimmed = r.trim();
  if (trimmed === "" || SYSTEM_TAG_PROMPT_RE.test(trimmed)) return;
  return r;
}
//@ chunk-ha3km179.js:26781-26888 placement
var SYSTEM_TAG_PROMPT_RE = /^<(command-|bash-|local-command|system-reminder|task-notification|user-prompt)/,
  regExp = new RegExp(VIEWER_PREFIX_RE);
//@ chunk-ha3km179.js:26888-27108 placement
function artifactSlugsInText(e) {
  let n = new Set(),
    r = !1;
  for (let s of e.matchAll(/https?:\/\/[^\s<>"'\]]+/g)) {
    let replaced = s[0].replace(/[.,;:!?)\]}>'"`*_]+$/, ""),
      y = parseArtifactUrl(replaced);
    if (y !== null) n.add(y.slug);
    else if (regExp.test(replaced)) r = !0;
  }
  return r ? "unreadable" : [...n];
}
//@ chunk-ha3km179.js:27108-27361 placement
function toolResultStatus(e, n) {
  for (let r = e.length - 1; r >= 0; r--) {
    let s = e[r];
    if (s?.type !== "user" || typeof s.message.content === "string") continue;
    for (let h of s.message.content)
      if (h.type === "tool_result" && h.tool_use_id === n) return h.is_error === !0 ? "error" : "ok";
  }
  return "missing";
}
/**
 * 指定工具调用之后是否已有回复。
 */
//@ chunk-ha3km179.js:27361-27719 placement
function toolResultsAnswered(e, n) {
  let r = new Set(n),
    lastIndex = e.findLastIndex(
      (h) => h.type === "assistant" && h.message.content.some((y) => y.type === "tool_use" && r.has(y.id)),
    );
  if (lastIndex === -1) return !0;
  return e.slice(lastIndex + 1).some((h) => {
    if (h.type === "user" && typeof h.message.content !== "string")
      return !h.message.content.every((y) => y.type === "tool_result" && r.has(y.tool_use_id));
    return !isIgnorableAttachment(h, "after_step");
  });
}
//@ chunk-ha3km179.js:27719-27780 placement
function Ga(e) {
  return `toolu_patch_${e().replaceAll("-", "")}`;
}
//@ chunk-ha3km179.js:27780-27871 placement
function Os(e) {
  let n = createAssistantMessage({ content: e });
  return ((n.answeredWithoutRequest = !0), (n.isUnmetered = !0), n);
}
//@ chunk-ha3km179.js:27871-28032 placement
function buildEditToolUses(e, n, r) {
  return Os(
    n.map((s, h) => ({
      type: "tool_use",
      id: r[h],
      name: FILE_EDIT_TOOL_NAME,
      input: { file_path: e, old_string: s.oldString, new_string: s.newString, replace_all: !1 },
    })),
  );
}
//@ chunk-ha3km179.js:28032-28113 placement = hasMemoryFileRead (1)
function hasMemoryFileRead(e, n) {
  return Os([{ type: "tool_use", id: n, name: ARTIFACT_TOOL_NAME, input: { file_path: e } }]);
}
//@ chunk-ha3km179.js:28113-28238 placement
function artifactPatchError(e, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `artifact patch turn: ${e instanceof Error ? e.name : typeof e} ${n}`,
    "artifact patch turn error",
  );
}
//@ chunk-ha3km179.js:28238-28272 placement
var mm = /^msg_[A-Za-z0-9_]{1,60}$/;
//@ chunk-ha3km179.js:28272-28387 placement
function buildPatchTextMessage(e, n) {
  let r = Os([{ type: "text", text: e, citations: null }]);
  if (n !== void 0 && mm.test(n)) r.message.id = n;
  return r;
}
//@ chunk-ha3km179.js:28387-28522 placement
function patchSummaryText(e, n, r) {
  if (ARTIFACT_PATCH_IGNORABLE_ATTACHMENTS && r.trim() !== "") return r.trim();
  return `Made ${e === 1 ? "1 edit" : `${e} edits`} and republished the artifact: ${n}`;
}
/**
 * 上报 tengu_artifact_patch_turn。
 */
//@ chunk-ha3km179.js:28522-28846 placement
function reportArtifactPatchTurn(e) {
  logEvent("tengu_artifact_patch_turn", {
    outcome: fromEnum(e.outcome),
    reason: fromEnumOpt(e.reason),
    retried: e.retried,
    edits: e.edits,
    failing_edit: e.failingEdit,
    edits_written: e.editsWritten,
    page_bytes: e.pageBytes,
    request_chars: e.requestChars,
    read_ms: e.readMs,
    call_ms: e.callMs,
    retry_ms: e.retryMs,
    model: e.model === void 0 ? void 0 : telemetrySafeModelName(e.model),
  });
}
//@ chunk-ha3km179.js:28846-28887 placement
var Ds = () => import("./chunk-1nk4j4sn.js");
//@ chunk-ha3km179.js:28887-28899 placement
nSt.set(Ds);
//@ chunk-ha3km179.js:28899-29158 placement
var TIMELINE_MESSAGE_TYPES = new Set(["user", "assistant", "attachment", "system"]),
  Sm = (e) =>
    typeof e === "object" && e !== null && "uuid" in e && "type" in e && TIMELINE_MESSAGE_TYPES.has(e.type),
  Or = (e, n) =>
    logForDebugging(
      `session.append at the loop's keep point: ${e} failed, the row is kept as made: ${errorMessage(n)}`,
      { level: "error" },
    );
//@ chunk-ha3km179.js:29158-29252 placement
function bm(e) {
  if (e === void 0) return vbe() !== void 0;
  return G1o(e) !== void 0 || Mwt.of(e) !== void 0;
}
/**
 * 观察运行中回合的消息（hooks 关闭时跳过）。
 */
//@ chunk-ha3km179.js:29252-30449 placement
function observeRunningTurn(e, n) {
  nSt.set(Ds);
  let { agentId: agentId } = e,
    s = isDelegatedObservationContext(e.agentContext) || e.options.settingsHooksOff === !0,
    weakSet = new WeakSet(),
    weakSet_2 = new WeakSet(),
    S = [],
    M,
    R = !1;
  try {
    ((M = lp()?.conversation?.(agentId)), (R = bm(agentId)));
  } catch (error) {
    Or("reading the running turn", error);
  }
  let T = R && !s,
    w = Ebe({
      ...(agentId !== void 0 && { agentId: agentId }),
      keep: () => {},
      rows: () => [...(M?.rows() ?? n), ...S],
      isHookable: T,
    }),
    P = T ? M?.attachLoop() : void 0;
  function Q(D) {
    if (!T || !Sm(D) || weakSet.has(D)) return;
    if (D.type === "assistant" && D.message.content.some((z) => z.type === "tool_use") && !weakSet_2.has(D))
      (weakSet_2.add(D), S.push(D));
    if (!Owt()) return;
    weakSet.add(D);
    try {
      return Promise.resolve(appendRowsWithHooks(w, [D], { fills: !0 })).catch((z) => Or("an append", z));
    } catch (error) {
      Or("an append", error);
      return;
    }
  }
  return {
    through: async function* (L) {
      let z = !1;
      try {
        while (!0) {
          let G = await L.next();
          if (G.done) return ((z = !0), G.value);
          let ee = Q(G.value);
          if (ee !== void 0) await ee;
          yield G.value;
        }
      } finally {
        if (!z) await L.return(void 0);
      }
    },
    appended: async (D) => {
      await Q(D);
    },
    answeredAs: (D, L) => {
      if (weakSet.has(L)) weakSet.add(D);
    },
    withArrivedRows: (D) => {
      try {
        let L = P?.taken() ?? [];
        if (L.length === 0) return D;
        let z = new Set(D.map((ee) => ee.uuid)),
          filtered = L.filter((ee) => !z.has(ee.uuid));
        return filtered.length === 0 ? D : [...D, ...filtered];
      } catch (error) {
        return (Or("taking the rows that arrived", error), D);
      }
    },
    [Symbol.dispose]: () => {
      P?.[Symbol.dispose]();
    },
  };
}
//@ chunk-ha3km179.js:30449-30469 placement
var POLL_EVENT = "poll-event";
/**
 * 为已布防的观察者生成附件。
 */
//@ chunk-ha3km179.js:30469-31890 placement
function buildArmedObserverAttachment({
  querySource: querySource,
  toolUseContext: toolUseContext,
  messages: messages,
  turnStartIndex: turnStartIndex,
}) {
  try {
    if (classifyQuerySource(querySource) === "auxiliary") return null;
    let session = toolUseContext.session,
      y = toolUseContext.agentId ?? MAIN_OBSERVED_KEY,
      S = Wyt(session, y);
    if (!S || S.state !== "armed") return null;
    let lastIndex = messages.findLastIndex(
        (Z) => (Z.type === "assistant" && !jb(Z)) || (Z.type === "user" && Z.isCompactSummary === !0),
      ),
      sliced = messages.slice(Math.max(turnStartIndex, lastIndex + 1)),
      w =
        sliced.some((Z) => Z.type === "user" && Z.toolUseResult !== void 0) &&
        !sliced.some((Z) => Z.type === "user" && joinNonEmptyText(Z.message.content) !== void 0)
          ? messages.slice(turnStartIndex)
          : sliced,
      P = mapUserOrigins(w),
      filtered = w.filter((Z) => Z.type === "user" && !P.has(Z)),
      D = joinUserTexts(filtered);
    if (D !== void 0) S.lastTrigger = truncateObserverText(D, x7e);
    if (w.some((Z) => Z.type === "user" && Ns(Z.origin, S))) return null;
    let L = D,
      any = filtered.some((Z) => Z.type === "user" && isVerifiedSlackHuman(Z)),
      G = !0,
      ee = !1,
      V = [];
    for (let Z of w) {
      let re = P.get(Z),
        Re = Z.type === "user" ? joinNonEmptyText(Z.message.content) : void 0;
      if (re !== void 0 && Re !== void 0)
        V.push({ type: "non_user_message", source: re, text: truncateObserverText(Re, x7e) });
    }
    let fe = !1,
      ie = (Z) => {
        let re = Z ? [...V, Z] : V;
        if (((V = []), re.length === 0)) return;
        (enqueueObserverActivity(session, {
          observedKey: y,
          activity: re,
          trigger: L,
          triggerRelay: any,
          opensTurn: G,
        }),
          (L = void 0),
          (G = !1));
      };
    return {
      capture(Z) {
        try {
          let re = toTimelineEvents(Z, S);
          if (re) V.push(...re);
        } catch (error) {
          logForDebugging(`[agentObserver] capture failed: ${errorMessage(error)}`);
        }
      },
      flushSegment() {
        try {
          if (fe) return;
          if (!ee) {
            ee = !0;
            return;
          }
          ie();
        } catch (error) {
          logForDebugging(`[agentObserver] flush failed: ${errorMessage(error)}`);
        }
      },
      finish(Z) {
        try {
          if (fe) return;
          ((fe = !0), ie({ type: "turn_ended", reason: Z }));
        } catch (error) {
          logForDebugging(`[agentObserver] finish failed: ${errorMessage(error)}`);
        }
      },
    };
  } catch (error) {
    return (logForDebugging(`[agentObserver] tap creation failed: ${errorMessage(error)}`), null);
  }
}
//@ chunk-ha3km179.js:31890-31949 placement
function Ns(e, n) {
  return e !== void 0 && n.reportOrigins.has(e);
}
//@ chunk-ha3km179.js:31949-32044 placement
function qs(e, n) {
  if (e === void 0) return n === !0 ? "unattributed" : void 0;
  return A8t(e) ? void 0 : e.kind;
}
/**
 * 建立用户消息到来源的映射。
 */
//@ chunk-ha3km179.js:32044-32391 placement
function mapUserOrigins(e) {
  let n = new Map(),
    r;
  for (let s of e)
    if (s.type === "user") {
      r = s;
      let h = qs(s.origin, s.isMeta);
      if (h !== void 0) n.set(s, h);
    } else if (
      s.type === "attachment" &&
      s.attachment.type === "poll_events" &&
      s.attachment.deliveredVia === "value_dispatch" &&
      r !== void 0
    )
      if (s.attachment.provenance?.[0]?.authority === "human-principal") n.delete(r);
      else n.set(r, POLL_EVENT);
  return n;
}
//@ chunk-ha3km179.js:32391-32545 placement
function joinUserTexts(e) {
  let n = [];
  for (let r of e) {
    if (r.type !== "user") continue;
    let s = joinNonEmptyText(r.message.content);
    if (s) n.push(s);
  }
  if (n.length === 0) return;
  return n.join(`

`);
}
/**
 * 把消息转换为时间线事件。
 */
//@ chunk-ha3km179.js:32545-33364 placement
function toTimelineEvents(e, n) {
  if (!e || typeof e !== "object" || !("type" in e)) return null;
  let r = e;
  if (jb(r)) return null;
  if (r.type === "attachment") return attachmentToTimelineEvents(r.attachment, n);
  if (r.type === "assistant") {
    let s = [],
      content = r.message.content;
    for (let y of content)
      if (y.type === "text") {
        if (y.text.trim()) s.push({ type: "assistant_text", text: truncateObserverText(y.text, gln) });
      } else if (y.type === "tool_use") s.push({ type: "tool_call", name: y.name, input: Em(y.input) });
    return s;
  }
  if (r.type === "user") {
    let content = r.message.content;
    if (Array.isArray(content)) {
      let S = [];
      for (let M of content)
        if (M.type === "tool_result")
          S.push({ type: "tool_result", content: truncateObserverText(joinNonEmptyText(M.content) ?? "") });
      if (S.length > 0) return S;
    }
    if (Ns(r.origin, n)) return null;
    let h = joinNonEmptyText(content);
    if (!h) return null;
    let y = qs(r.origin, r.isMeta);
    return [
      y === void 0
        ? { type: "user_message", text: truncateObserverText(h, x7e), relay: isVerifiedSlackHuman(r) }
        : { type: "non_user_message", source: y, text: truncateObserverText(h) },
    ];
  }
  return null;
}
/**
 * 把附件转换为时间线事件（记忆加载、技能发现等）。
 */
//@ chunk-ha3km179.js:33364-34422 placement
function attachmentToTimelineEvents(e, n) {
  switch (e.type) {
    case "nested_memory":
      return [
        { type: "guidance_loaded", path: e.displayPath, content: truncateObserverText(e.content.content) },
      ];
    case "dynamic_skill":
      return [{ type: "skills_discovered", dir: e.displayPath, names: e.skillNames }];
    case "queued_command": {
      let r = resolveTaskNotificationOrigin(e.origin, e.commandMode);
      if (Ns(r, n)) return null;
      let s = joinNonEmptyText(e.prompt);
      if (!s) return null;
      let h = truncateObserverText(s, x7e),
        y = classifyNonUserMessageSource(h, r, {
          verifiedSlackHumanTurn: e.verifiedSlackHumanTurn,
          isMeta: e.isMeta,
          hearthServerEnvelope: hasHearthRelay(e),
          hearthJoinedTextBlocks: Array.isArray(e.prompt) && count(e.prompt, (R) => R.type === "text") > 1,
          sendMessageToolAbsent: e.sendMessageToolAbsent,
        }),
        S = qs(r, e.isMeta);
      if (S !== void 0) return [{ type: "non_user_message", source: S, text: y }];
      let M = isVerifiedSlackHuman(e);
      return [{ type: "user_message", text: M ? y : h, relay: M }];
    }
    case "poll_events": {
      let flattened = e.envelopes.flatMap((envelope, h) => {
        switch (e.kinds[h]) {
          case REPL_EVAL:
            return [];
          case REPL_STATUS:
            return [];
          default: {
            let y = truncateObserverText(envelope, x7e);
            return [
              e.provenance?.[h]?.authority === "human-principal"
                ? { type: "user_message", text: y, relay: !1 }
                : { type: "non_user_message", source: POLL_EVENT, text: y },
            ];
          }
        }
      });
      return flattened.length > 0 ? flattened : null;
    }
    default:
      return null;
  }
}
//@ chunk-ha3km179.js:34422-34648 placement = extractErrorTypeFromData (1)
function joinNonEmptyText(data) {
  if (typeof data === "string") return data.trim() ? data : void 0;
  if (Array.isArray(data)) {
    let filtered = data
      .map((r) => (r && typeof r === "object" && "type" in r && r.type === "text" ? r.text : ""))
      .filter(Boolean);
    return filtered.length > 0
      ? filtered.join(`
`)
      : void 0;
  }
  return;
}
//@ chunk-ha3km179.js:34648-34735 placement
function Em(e) {
  try {
    return JSON.stringify(e) ?? String(e);
  } catch {
    return "[unserializable]";
  }
}
/**
 * 按编辑规则排除工具的结果（off/shadow 模式下不执行）。
 */
//@ chunk-ha3km179.js:34735-36630 placement
function applyToolExclusionEdit(e, n, r, s, h, y) {
  try {
    let S = idleClearingMode();
    if (S === "off" || S === "shadow") return;
    let M = planToolResultClearingAfterIdle(e, n, r, s, void 0, h);
    if (!M) return;
    let R = new Set(M.edit.exclude_tools),
      T = new Map(),
      w = [],
      P = new Set(),
      Q = new Map(),
      D = 0;
    for (let Z of e) {
      if (
        (Z.type !== "assistant" && Z.type !== "user") ||
        isNonConversationMessage(Z) ||
        !Array.isArray(Z.message.content)
      )
        continue;
      let re = Z.type === "assistant" ? (Z.batchToolUses ?? []).map((Re) => `${Re.id}_`) : [];
      for (let Re of Z.message.content)
        if (Z.type === "assistant" && Re?.type === "tool_use" && typeof Re.name === "string") {
          let se = canonicalToolName(Re.name);
          if (!T.has(Re.id) && !R.has(se) && !re.some((Te) => Re.id.startsWith(Te)))
            T.set(Re.id, { sentName: se, input: Re.input, replyId: Z.message.id });
        } else if (Re?.type === "tool_result") {
          let se = T.get(Re.tool_use_id);
          if (se && !P.has(Re.tool_use_id)) {
            (P.add(Re.tool_use_id), w.push({ ...se, result: Re }));
            let Te = (Q.get(se.replyId) ?? 0) + 1;
            (Q.set(se.replyId, Te), (D = Math.max(D, Te)));
          }
        }
    }
    let L = M.edit.keep.value,
      z = M.edit.trigger.value,
      G = z + 1 - L,
      ee = w.length + Math.max(L, D),
      V = ee > z ? 1 + Math.floor((ee - z - 1) / G) : 0,
      max = Math.max(V * G, Math.min(M.returnAfterIdle.toolUsesClearedSinceIdle, w.length - L)),
      ie = new Set();
    for (let { sentName: sentName, input: input, result: Re } of w) {
      let se = max > 0,
        { content: content } = Re,
        U =
          typeof content === "string"
            ? content.length
            : Array.isArray(content)
              ? content.reduce(
                  (nt, bt) => (bt?.type === "text" && typeof bt.text === "string" ? nt + bt.text.length : nt),
                  0,
                )
              : 0;
      if (se && U >= SMALL_RESULT_BYTES) max--;
      if (Re.is_error === !0 || typeof input !== "object" || !input) continue;
      if (
        (sentName === FILE_READ_TOOL_NAME || sentName === FILE_WRITE_TOOL_NAME) &&
        "file_path" in input &&
        typeof input.file_path === "string"
      ) {
        let nt = expandPathOrNull(input.file_path);
        if (nt === null) continue;
        if (
          sentName === FILE_WRITE_TOOL_NAME ||
          (!se &&
            !("offset" in input) &&
            !("limit" in input) &&
            typeof content === "string" &&
            !isFileUnchangedStub(content))
        )
          ie.delete(nt);
        else if (se) ie.add(nt);
      } else if (
        se &&
        SHELL_TOOL_NAMES.includes(sentName) &&
        "command" in input &&
        typeof input.command === "string"
      )
        for (let nt of extractReadOnlyFileReads(input.command)) {
          let bt = expandPathOrNull(nt.filePath);
          if (bt !== null) ie.add(bt);
        }
    }
    for (let Z of ie) {
      let re = y.get(Z);
      if (re && !re.contentNotInModelContext) y.set(Z, { ...re, contentNotInModelContext: !0 });
    }
  } catch (error) {
    logIdleClearingFailure(error, "sad", "marking_cleared_reads_threw");
  }
}

export {
  isExplainRequest,
  getActiveMessageQueue,
  observeRunningTurn,
  buildArmedObserverAttachment,
  wrapArtifactPatchTurn,
  wrapCallModelWithAttachments,
  applyToolExclusionEdit,
  va,
  routeSubmissions,
  isPresencePing,
};
