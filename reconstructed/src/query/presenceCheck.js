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
import { currentTurn, currentTurnBinding } from "../plugins/functionHooks/personHold.js";
import { resolvePromptSource } from "../utils/promptSource.js";
import { isGoalIdleCheckinPaused } from "./goalCheckIn.js";
import { submitMarksSlot } from "../plugins/functionHooks/promptSubmit.js";
import { commandSetSignalA } from "../plugins/functionHooks/commandRunDispatch.js";
import {
  hooksSnapshotKey,
  submitPromptWithHooks,
  hasPromptSubmitHooks,
} from "../utils/processUserInput/userPromptSubmitHooks.js";
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
import {
  SessionRootSlot,
  isVirtualConversationMessage,
  isNonConversationMessage,
} from "../bootstrap/sessionSlices.js";
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
import { strictHumanDeciderTurn, isHumanDrivenOrigin } from "../utils/turnOrigin.js";
import { modelSupportsAdaptiveThinking } from "../utils/thinking.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "../utils/model/telemetryModelName.js";
import { TEXT_PASSTHROUGH_CORES } from "../plugins/functionHooks/coreHandlers.js";
import {
  runningTurnRegistry,
  orderedRowSource,
  appendHookableFastPath,
  appendRowsWithHooks,
} from "../utils/queryHelpers.js";
import { currentSurfaceBinding } from "../plugins/functionHooks/surfaceBinding.js";
import {
  MAIN_OBSERVED_KEY,
  pairingForObserver,
  truncateObserverText,
  MAX_TRIGGER_TEXT_CHARS,
  enqueueObserverActivity,
  MAX_DELIVERY_CHARS,
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

//@ chunk-ha3km179.js:14651-15143 placement
/**
 * 判断用户文本是否是"解释一下"类请求。
 */
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
/**
 * “去睡觉/上床”类短语
 */
function isSleepCheckPhrase(text) {
  let lower = text.toLowerCase();
  return /\bgo to (sleep|bed)\b/.test(lower);
}
//@ chunk-ha3km179.js:15218-16200 placement
/**
 * "你在吗"类在场确认短语集合。
 */
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
//@ chunk-ha3km179.js:16200-16471 placement
/**
 * 判断用户输入是否只是"在吗"类试探（问号、省略号、hi/hello 或常见问候短语，最长 40 字）。
 */
function isPresencePing(userPromptText) {
  let trimmed = userPromptText.trim();
  if (trimmed.length > 40) return false;
  if (/^(\?+|\.{2,}|\u2026+)$/u.test(trimmed)) return true;
  let trimmed_2 = trimmed
    .toLowerCase()
    .replace(/^[\u00BF\u00A1]+|[?!.\u00BF\u00A1\uFF1F\uFF01\u3002\u2026]+$/gu, "")
    .trim();
  if (/^(hi+|hello+|he+y+|yo+)$/.test(trimmed_2)) return true;
  return PRESENCE_PINGS.has(trimmed_2);
}
//@ chunk-ha3km179.js:16471-16506 placement = getValueFromInput (1)
var getValueFromInput = (e, n) => n && e.mode === "prompt";
//@ chunk-ha3km179.js:16506-16601 placement
/**
 * 内联通知模式下可查询
 */
var isInlineNotificationCandidate = (e) =>
  isInlineNotificationMode(e) &&
  e.promptSubmitted === undefined &&
  e.shouldQuery !== false &&
  e.skipSubmissionHooks !== true;
//@ chunk-ha3km179.js:16601-16684 placement
/**
 * 队列里的可投递项
 */
function queuedDeliverable(e, n) {
  let r = new Set(n.getCommandQueue());
  return e.filter((s) => r.has(s));
}
//@ chunk-ha3km179.js:16684-16786 placement
function filterPromptSubmissions(e, messageQueue) {
  let r = false;
  let s = [];
  for (let h of e)
    if (isInlineNotificationCandidate(h)) r = true;
    else if (!getValueFromInput(h, r)) s.push(h);
  return queuedDeliverable(s, messageQueue);
}
//@ chunk-ha3km179.js:16786-16861 placement = processQueuedCommands (1)
var processQueuedCommands = (queuedCommands) =>
  queuedCommands.mode === "task-notification"
    ? {
        kind: "task-notification",
      }
    : undefined;
//@ chunk-ha3km179.js:16861-16974 placement
var submissionPayload = (e) => ({
  text: getContentText(e.value) ?? "",
  input: e.value,
  pastedContents: e.pastedContents,
  ...(e.isMeta === true && {
    isMeta: true,
  }),
});
//@ chunk-ha3km179.js:16974-17369 placement
/**
 * 描述一次输入提交（来源、模式、是否等待、上下文）。
 */
function describeSubmission(queuedCommands, n, result) {
  let s = normalizeTaskNotificationOrigin(queuedCommands.origin) ?? processQueuedCommands(queuedCommands);
  let h = queuedCommands.isMeta === true || !isHumanOrUnset(s);
  return {
    submission: submissionPayload(queuedCommands),
    origin: s,
    bridgeOrigin: queuedCommands.bridgeOrigin,
    mode: queuedCommands.mode,
    turnId: currentTurn()?.turnId,
    shouldWait: queuedCommands.wait === true,
    context: n,
    result,
    promptSource: resolvePromptSource({
      isNonInteractive: n.options.isNonInteractiveSession,
      isMeta: queuedCommands.isMeta,
      callerSource: h ? "system" : (queuedCommands.inputSource ?? "queued"),
    }),
    wakeupSource: queuedCommands.wakeupSource,
    isStartInput: isGoalIdleCheckinPaused(queuedCommands.uuid),
  };
}
//@ chunk-ha3km179.js:17369-17403 placement
/**
 * 投递去向
 */
var settleFate = (e, n) => ({
  fate: e ? n : "left",
});
//@ chunk-ha3km179.js:17403-17632 placement
function submissionOutcome({ outcome, scratch, under, text, isHidden }) {
  let { proceeds } = outcome;
  return {
    text: isHidden ? text : proceeds ? proceeds.text : (outcome.text ?? text),
    context: proceeds ? proceeds.context : outcome.context,
    messages: scratch.messages,
    under,
    stopped: proceeds ? undefined : outcome.stopped,
    sessionTitle: proceeds?.sessionTitle,
  };
}
//@ chunk-ha3km179.js:17632-17668 placement
/**
 * 当前激活的消息队列。
 */
var getActiveMessageQueue = () => (submitMarksSlot.get() ? commandSetSignalA.get() : undefined);
//@ chunk-ha3km179.js:17668-17711 placement
/**
 * 有活动消息队列
 */
var hasActiveQueue = (e) => !e.isStartInput && getActiveMessageQueue() !== undefined;
//@ chunk-ha3km179.js:17711-18620 placement
/**
 * 决定提交的去向（立即处理、等待、浮出）。
 */
async function routeSubmission(e, n) {
  let messageQueue = n.messageQueue;
  let result = {
    messages: [],
    shouldQuery: true,
  };
  let h = describeSubmission(e, n, result);
  let y = () =>
    settleFate(
      messageQueue.settleSurfaced(e, {
        promptSubmitted: undefined,
        drainOnly: true,
      }),
      "waits",
    );
  if (hasActiveQueue(h)) return y();
  let S;
  let M;
  let R;
  function T(Q) {
    if (!Q || !S || Q.wasCancelled)
      return settleFate(
        messageQueue.settleSurfaced(e, {
          promptSubmitted: undefined,
          drainOnly: true,
        }),
        "waits",
      );
    let D = Q.ended !== undefined;
    return settleFate(
      messageQueue.settleSurfaced(e, {
        promptSubmitted: submissionOutcome({
          outcome: Q,
          scratch: result,
          under: S,
          text: h.submission.text,
          isHidden: e.isMeta === true && isAutoContinuationOrigin(h.origin),
        }),
        drainOnly: D ? true : undefined,
      }),
      D ? "waits" : "surfaces",
    );
  }
  try {
    S = hooksSnapshotKey(n);
    M = await submitPromptWithHooks({
      ...h,
      enter: async (Q) => {
        R = T(Q);
      },
    });
  } catch (error) {
    if (!isAbortError(error))
      logForDebugging(
        "prompt.submit at the fold failed, leaving the prompt to the drain: " + errorMessage(error),
        {
          level: "error",
        },
      );
  }
  if (R) return R;
  let ended = M?.ended && M.stopped === undefined ? M.ended : undefined;
  function P(ended) {
    if (
      !messageQueue.settleSurfaced(e, {
        dropped: true,
      })
    )
      return {
        fate: "left",
      };
    messageQueue.handTypedBack([e]);
    return {
      fate: "dropped",
      notices: ended.messages,
    };
  }
  return ended ? P(ended) : T(M);
}
//@ chunk-ha3km179.js:18620-19073 placement
/**
 * 批量路由排队的提交。
 */
async function routeSubmissions(e, updatedToolUseContext) {
  let r = [];
  let s = [];
  let h = [];
  let y = false;
  let S = false;
  let M;
  try {
    for (let R of e) {
      if (getValueFromInput(R, y)) continue;
      M ??= hasPromptSubmitHooks(updatedToolUseContext);
      if (!isInlineNotificationCandidate(R) || !M) {
        r.push(R);
        continue;
      }
      S = true;
      let w = await routeSubmission(R, updatedToolUseContext);
      switch (w.fate) {
        case "surfaces":
          r.push(R);
          break;
        case "waits":
          y = true;
          break;
        case "dropped":
          s.push(...w.notices);
          h.push(R);
          break;
        case "left":
          break;
      }
    }
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return {
      deliverable: filterPromptSubmissions(e, updatedToolUseContext.messageQueue),
      notices: s,
      dropped: h,
    };
  }
  return {
    deliverable: S ? queuedDeliverable(r, updatedToolUseContext.messageQueue) : r,
    notices: s,
    dropped: h,
  };
}
//@ chunk-ha3km179.js:19073-19485 placement
/**
 * 包装 callModel，在调用前解析 prompt.attachment hook 的附件。
 */
function wrapCallModelWithAttachments(e, toolUseContext) {
  let { agentContext, hookOrigin, options } = toolUseContext;
  return isDelegatedObservationContext(agentContext) || options?.settingsHooksOff === true
    ? e
    : {
        ...e,
        callModel: async function* (S) {
          try {
            if (
              hasModuleHookingSite("prompt.attachment", undefined, canShortcutAppend("prompt.attachment"))
            ) {
              let { resolveAttachments } = await import("./chunk-6mt8vha1.js");
              await resolveAttachments(
                S.messages,
                {
                  signal: S.signal,
                  origin: hookOrigin,
                },
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
/**
 * claude-opus-5-5
 */
var ARTIFACT_PATCH_MODELS = ["claude-opus-5-5"];
//@ chunk-ha3km179.js:19512-19844 placement
/**
 * 解析 Artifact 补丁回合配置（开关、模型、side call 类）。
 */
function parseArtifactPatchConfig(featureValue_CACHED_MAY_BE_STALE) {
  if (featureValue_CACHED_MAY_BE_STALE === true)
    return {
      on: true,
      models: ARTIFACT_PATCH_MODELS,
    };
  if (
    typeof featureValue_CACHED_MAY_BE_STALE !== "object" ||
    featureValue_CACHED_MAY_BE_STALE === null ||
    Array.isArray(featureValue_CACHED_MAY_BE_STALE)
  )
    return {
      on: false,
      models: ARTIFACT_PATCH_MODELS,
    };
  let { enabled, models, sideCallClass } = featureValue_CACHED_MAY_BE_STALE;
  let h = Array.isArray(models) && models.length > 0 && models.every((model) => typeof model === "string");
  return {
    on: enabled === true && (models === undefined || h),
    models: h ? models : ARTIFACT_PATCH_MODELS,
    sideCallClass: sideCallClass === "side_reply" ? "side_reply" : undefined,
  };
}
//@ chunk-ha3km179.js:19844-21092 placement
/**
 * 补丁回合（artifact patch）可以忽略的附件种类集合：这些系统注入的附件不会单独触发一次补丁请求；同组还有一个默认关闭的开关。
 */
var ARTIFACT_PATCH_IGNORABLE_ATTACHMENTS_2 = false;
var ARTIFACT_PATCH_IGNORABLE_ATTACHMENTS = new Set([
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
]);
var ARTIFACT_PATCH_LIMITS = true;
var ARTIFACT_PATCH_FLAGS = new Set([
  "async_hook_response_batch",
  "hook_cancelled",
  "hook_error_during_execution",
  "hook_non_blocking_error",
  "hook_permission_decision",
  "hook_system_message",
]);
//@ chunk-ha3km179.js:21092-21457 placement
/**
 * 开关打开时把 callModel 包装为 Artifact 补丁回合。
 */
function wrapArtifactPatchTurn(e, toolUseContext) {
  try {
    let artifactPatchConfig = parseArtifactPatchConfig(
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_ORPINE, false),
    );
    if (!artifactPatchConfig.on) return e;
    let artifactPatchTurn = createArtifactPatchTurn(e.callModel, toolUseContext, {
      compose: async (h) => (await import("./chunk-eavynfj6.js")).composePatch(h),
      uuid: e.uuid,
      now: () => Date.now(),
      models: artifactPatchConfig.models,
      sideCallClass: artifactPatchConfig.sideCallClass,
    });
    return {
      ...e,
      callModel: (h) => artifactPatchTurn.step(h),
    };
  } catch (error) {
    logError(artifactPatchError(error, "while setting up; the loop runs without the patch turn"));
    return e;
  }
  return e;
}
//@ chunk-ha3km179.js:21457-21660 placement
/**
 * 跳过补丁回合的原因
 */
var ARTIFACT_PATCH_SKIP_REASONS_2 = new Set([
  "plan_mode",
  "brief_mode",
  "tools_missing",
  "model_not_listed",
  "thinking_budgeted",
  "not_person_turn",
  "not_plain_text",
  "has_attachments",
]);
var ARTIFACT_PATCH_SKIP_REASONS = new SessionRootSlot(() => ({
  sessionId: undefined,
  reasons: new Set(),
}));
//@ chunk-ha3km179.js:21660-24530 placement
/**
 * Artifact 补丁回合：判断资格、组合补丁请求并记录结果。
 */
function createArtifactPatchTurn(callModel, n, r) {
  let s = {
    kind: "fresh",
  };
  let h;
  let y = 0;
  let log = r.log ?? reportArtifactPatchTurn;
  let M = (D) => {
    logForDebugging(
      `artifact patch turn: ${D.outcome}${D.reason === undefined ? "" : ` (${D.reason})`} at request ${y} of the turn`,
    );
    log(D);
  };
  let R = (reason) => {
    if (reason === "not_main_thread" || reason === "subagent" || reason === "not_first_request") return false;
    if (!ARTIFACT_PATCH_SKIP_REASONS_2.has(reason)) return true;
    let L = ARTIFACT_PATCH_SKIP_REASONS.of(n.session);
    let sessionId = getSessionId();
    if (L.sessionId !== sessionId) {
      L.sessionId = sessionId;
      L.reasons.clear();
    }
    if (L.reasons.has(reason)) return false;
    L.reasons.add(reason);
    return true;
  };
  let T = () => {
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
      s = {
        kind: "done",
      };
    }
  };
  async function* w(D) {
    y++;
    let L;
    try {
      L = await P(D);
    } catch (error) {
      logError(artifactPatchError(error, "before a step; the model takes the turn"));
      M({
        outcome: "error",
      });
      s = {
        kind: "done",
      };
    }
    if (s.kind === "done" && h !== undefined) {
      h.removeEventListener("abort", T);
      h = undefined;
    }
    if (L === undefined) return yield* callModel(D);
    yield L;
  }
  async function P(D) {
    let L = s;
    switch (
      ((s = {
        kind: "done",
      }),
      L.kind)
    ) {
      case "fresh":
        return D.signal.aborted ? undefined : await Q(D);
      case "edits_sent": {
        let { ids, editsSent, reply, sideCallMessageId, target, event } = L;
        let Z = count(ids, (se) => toolResultStatus(D.messages, se) === "ok");
        let re = {
          ...event,
          editsWritten: Z,
        };
        if (Z !== ids.length) {
          M({
            ...re,
            outcome: "write_failed",
          });
          return;
        }
        if (toolResultsAnswered(D.messages, ids)) {
          M({
            ...re,
            outcome: "unpublished",
            reason: "interjected",
          });
          return;
        }
        let id = patchToolUseId(r.uuid);
        s = {
          kind: "publish_sent",
          ids: [id],
          editsSent,
          reply,
          sideCallMessageId,
          target,
          event: re,
        };
        return hasMemoryFileRead(target.path, id);
      }
      case "publish_sent": {
        let { ids, editsSent, reply, sideCallMessageId, target, event } = L;
        if (toolResultStatus(D.messages, ids[0]) !== "ok") {
          M({
            ...event,
            outcome: "publish_failed",
          });
          return;
        }
        if (toolResultsAnswered(D.messages, ids)) {
          M({
            ...event,
            outcome: "published",
            reason: "interjected",
          });
          return;
        }
        M({
          ...event,
          outcome: "published",
        });
        return buildPatchTextMessage(patchSummaryText(editsSent, target.url, reply), sideCallMessageId);
      }
      case "done":
        return;
    }
  }
  async function Q(D) {
    let L = checkArtifactPatchEligibility(D, n, r.models);
    if (!L.ok) {
      if (R(L.reason))
        M({
          outcome: "ineligible",
          reason: L.reason,
        });
      return;
    }
    let model = getMainLoopModel_2(n);
    let G = await r.compose({
      request: L.request,
      path: L.target.path,
      slug: L.target.slug,
      observedVer: L.target.observedVer,
      model,
      thinkingConfig: D.thinkingConfig,
      sideCallClass: r.sideCallClass,
      permissions: () => getToolPermissionContext(n),
      context: n,
      now: r.now,
    });
    let ee = {
      outcome: G.kind === "patched" ? "published" : G.kind,
      reason: G.kind === "patched" ? undefined : G.reason,
      retried: G.retried,
      pageBytes: G.pageBytes,
      requestChars: L.request.length,
      readMs: G.timings.readMs,
      callMs: G.timings.callMs,
      retryMs: G.timings.retryMs,
      model,
      ...(G.kind === "patched" && {
        edits: G.editCount,
      }),
      ...(G.kind !== "patched" && {
        failingEdit: G.failingEdit,
      }),
    };
    if (G.kind !== "patched") {
      M(ee);
      return;
    }
    if (D.signal.aborted) {
      M({
        ...ee,
        outcome: "canceled",
        reason: "before_write",
      });
      return;
    }
    G.seedReadState();
    D.signal.addEventListener("abort", T, {
      once: true,
    });
    h = D.signal;
    let mapped = G.edits.map(() => patchToolUseId(r.uuid));
    s = {
      kind: "edits_sent",
      ids: mapped,
      editsSent: G.edits.length,
      reply: G.reply,
      sideCallMessageId: G.sideCallMessageId,
      target: L.target,
      event: ee,
    };
    return buildEditToolUses(L.target.path, G.edits, mapped);
  }
  return {
    step: w,
  };
}
//@ chunk-ha3km179.js:24530-25885 placement
/**
 * 判断能否走 Artifact 补丁回合（主线程、非子代理、非计划模式等）。
 */
function checkArtifactPatchEligibility(e, n, models = ARTIFACT_PATCH_MODELS) {
  let s = (reason) => ({
    ok: false,
    reason,
  });
  if (classifyQuerySource(e.options.querySource) !== "main") return s("not_main_thread");
  if (n.agentId !== undefined) return s("subagent");
  if (getToolPermissionContext(n).mode === "plan") return s("plan_mode");
  if (isBriefEnabled()) return s("brief_mode");
  if (
    !e.tools.some((tool) => toolMatchesName(tool, FILE_EDIT_TOOL_NAME)) ||
    !e.tools.some((tool) => toolMatchesName(tool, ARTIFACT_TOOL_NAME))
  )
    return s("tools_missing");
  let mainLoopModel = getMainLoopModel_2(n);
  if (!models.includes(getCanonicalName(mainLoopModel))) return s("model_not_listed");
  if (!usesAdaptiveThinking(e.thinkingConfig, mainLoopModel)) return s("thinking_budgeted");
  let { messages } = e;
  let S = strictHumanDeciderTurn(messages);
  if (S === undefined || S.type !== "user" || S.isMeta) return s("not_person_turn");
  let sliced = messages.slice(messages.lastIndexOf(S) + 1);
  if (sliced.some((L) => L.type !== "attachment")) return s("not_first_request");
  let R = plainPromptText(S);
  if (R === undefined) return s("not_plain_text");
  if (sliced.some((L) => !isIgnorableAttachment(L, "opener"))) return s("has_attachments");
  let T = n.artifactRegistries.recordedPages.heldSourcePages();
  if (T.length === 0) return s("no_artifact");
  let w = artifactSlugsInText(R);
  let P;
  if (w === "unreadable" || w.length > 1) return s(w === "unreadable" ? "url_not_held" : "several_artifacts");
  else if (w.length === 1) {
    P = T.find((L) => L.slug === w[0]);
    if (P === undefined) return s("url_not_held");
  } else if (T.length === 1) P = T[0];
  else return s("several_artifacts");
  if (P.unasked) return s("unasked_republish");
  let { ver, observers } = n.getArtifactReadObservation(P.slug);
  if (ver === undefined || !hasMainKey(observers)) return s("no_observed_version");
  return {
    ok: true,
    request: R,
    target: {
      path: P.path,
      slug: P.slug,
      url: P.url,
      observedVer: ver,
    },
  };
}
//@ chunk-ha3km179.js:25885-26021 placement
function usesAdaptiveThinking(thinkingConfig, mainLoopModel) {
  if (thinkingConfig.type === "disabled") return true;
  return (
    modelSupportsAdaptiveThinking({
      runtimeOverride: getThinkingTypeOverride(mainLoopModel),
      resolvedModel: mainLoopModel,
      canonicalModel: getCanonicalName(mainLoopModel),
    }) === "adaptive"
  );
}
//@ chunk-ha3km179.js:26021-26559 placement
/**
 * 附件是否可在补丁回合中忽略。
 */
function isIgnorableAttachment(e, n) {
  if (e.type !== "attachment") return false;
  let attachment = e.attachment;
  if (ARTIFACT_PATCH_IGNORABLE_ATTACHMENTS.has(attachment.type) || ARTIFACT_PATCH_FLAGS.has(attachment.type))
    return true;
  let s = n === "opener" && ARTIFACT_PATCH_LIMITS;
  if (attachment.type === "hook_additional_context") return s;
  if (attachment.type === "async_hook_response") {
    let response = attachment.response ?? {};
    let additionalContext =
      typeof response.hookSpecificOutput === "object" && response.hookSpecificOutput !== null
        ? response.hookSpecificOutput.additionalContext
        : undefined;
    return (!response.systemMessage && !additionalContext) || s;
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
  let { content } = e.message;
  let r;
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
var SYSTEM_TAG_PROMPT_RE = /^<(command-|bash-|local-command|system-reminder|task-notification|user-prompt)/;
var regExp = new RegExp(VIEWER_PREFIX_RE);
//@ chunk-ha3km179.js:26888-27108 placement
function artifactSlugsInText(e) {
  let n = new Set();
  let r = false;
  for (let s of e.matchAll(/https?:\/\/[^\s<>"'\]]+/g)) {
    let replaced = s[0].replace(/[.,;:!?)\]}>'"`*_]+$/, "");
    let artifactUrl = parseArtifactUrl(replaced);
    if (artifactUrl !== null) n.add(artifactUrl.slug);
    else if (regExp.test(replaced)) r = true;
  }
  return r ? "unreadable" : [...n];
}
//@ chunk-ha3km179.js:27108-27361 placement
function toolResultStatus(messages, n) {
  for (let j = messages.length - 1; j >= 0; j--) {
    let s = messages[j];
    if (s?.type !== "user" || typeof s.message.content === "string") continue;
    for (let h of s.message.content)
      if (h.type === "tool_result" && h.tool_use_id === n) return h.is_error === true ? "error" : "ok";
  }
  return "missing";
}
//@ chunk-ha3km179.js:27361-27719 placement
/**
 * 指定工具调用之后是否已有回复。
 */
function toolResultsAnswered(messages, n) {
  let r = new Set(n);
  let lastIndex = messages.findLastIndex(
    (h) => h.type === "assistant" && h.message.content.some((y) => y.type === "tool_use" && r.has(y.id)),
  );
  if (lastIndex === -1) return true;
  return messages.slice(lastIndex + 1).some((h) => {
    if (h.type === "user" && typeof h.message.content !== "string")
      return !h.message.content.every((y) => y.type === "tool_result" && r.has(y.tool_use_id));
    return !isIgnorableAttachment(h, "after_step");
  });
}
//@ chunk-ha3km179.js:27719-27780 placement
/**
 * toolu_patch_<uuid>
 */
function patchToolUseId(uuid) {
  return `toolu_patch_${uuid().replaceAll("-", "")}`;
}
//@ chunk-ha3km179.js:27780-27871 placement
/**
 * 构造未计量的助手消息
 */
function synthesizedAssistantMessage(content) {
  let assistantMessage = createAssistantMessage({
    content,
  });
  assistantMessage.answeredWithoutRequest = true;
  assistantMessage.isUnmetered = true;
  return assistantMessage;
}
//@ chunk-ha3km179.js:27871-28032 placement
function buildEditToolUses(filePath, edits, r) {
  return synthesizedAssistantMessage(
    edits.map((s, h) => ({
      type: "tool_use",
      id: r[h],
      name: FILE_EDIT_TOOL_NAME,
      input: {
        file_path: filePath,
        old_string: s.oldString,
        new_string: s.newString,
        replace_all: false,
      },
    })),
  );
}
//@ chunk-ha3km179.js:28032-28113 placement = hasMemoryFileRead (1)
function hasMemoryFileRead(filePath, id) {
  return synthesizedAssistantMessage([
    {
      type: "tool_use",
      id,
      name: ARTIFACT_TOOL_NAME,
      input: {
        file_path: filePath,
      },
    },
  ]);
}
//@ chunk-ha3km179.js:28113-28238 placement
function artifactPatchError(error, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `artifact patch turn: ${error instanceof Error ? error.name : typeof error} ${n}`,
    "artifact patch turn error",
  );
}
//@ chunk-ha3km179.js:28238-28272 placement
/**
 * msg_ 开头
 */
var MESSAGE_ID_RE = /^msg_[A-Za-z0-9_]{1,60}$/;
//@ chunk-ha3km179.js:28272-28387 placement
function buildPatchTextMessage(text, sideCallMessageId) {
  let r = synthesizedAssistantMessage([
    {
      type: "text",
      text,
      citations: null,
    },
  ]);
  if (sideCallMessageId !== undefined && MESSAGE_ID_RE.test(sideCallMessageId))
    r.message.id = sideCallMessageId;
  return r;
}
//@ chunk-ha3km179.js:28387-28522 placement
function patchSummaryText(editsSent, url, reply) {
  if (ARTIFACT_PATCH_IGNORABLE_ATTACHMENTS_2 && reply.trim() !== "") return reply.trim();
  return `Made ${editsSent === 1 ? "1 edit" : `${editsSent} edits`} and republished the artifact: ${url}`;
}
//@ chunk-ha3km179.js:28522-28846 placement
/**
 * 上报 tengu_artifact_patch_turn。
 */
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
    model: e.model === undefined ? undefined : telemetrySafeModelName(e.model),
  });
}
//@ chunk-ha3km179.js:28846-28887 placement
/**
 * 惰性加载补丁模块
 */
var lazyPatchModule = () => import("./chunk-1nk4j4sn.js");
//@ chunk-ha3km179.js:28887-28899 placement
TEXT_PASSTHROUGH_CORES.set(lazyPatchModule);
//@ chunk-ha3km179.js:28899-29158 placement
/**
 * 可进时间线的类型
 */
var TIMELINE_MESSAGE_TYPES_2 = new Set(["user", "assistant", "attachment", "system"]);
var TIMELINE_MESSAGE_TYPES = (e) =>
  typeof e === "object" && e !== null && "uuid" in e && "type" in e && TIMELINE_MESSAGE_TYPES_2.has(e.type);
var logAppendKeepFailure = (e, error) =>
  logForDebugging(
    `session.append at the loop's keep point: ${e} failed, the row is kept as made: ${errorMessage(error)}`,
    {
      level: "error",
    },
  );
//@ chunk-ha3km179.js:29158-29252 placement
/**
 * 是否在运行中的回合
 */
function isTurnLive(agentId) {
  if (agentId === undefined) return currentTurn() !== undefined;
  return currentTurnBinding(agentId) !== undefined || runningTurnRegistry.of(agentId) !== undefined;
}
//@ chunk-ha3km179.js:29252-30449 placement
/**
 * 观察运行中回合的消息（hooks 关闭时跳过）。
 */
function observeRunningTurn(toolUseContext, messages) {
  TEXT_PASSTHROUGH_CORES.set(lazyPatchModule);
  let { agentId } = toolUseContext;
  let s =
    isDelegatedObservationContext(toolUseContext.agentContext) ||
    toolUseContext.options.settingsHooksOff === true;
  let weakSet = new WeakSet();
  let weakSet_2 = new WeakSet();
  let S = [];
  let M;
  let R = false;
  try {
    M = currentSurfaceBinding()?.conversation?.(agentId);
    R = isTurnLive(agentId);
  } catch (error) {
    logAppendKeepFailure("reading the running turn", error);
  }
  let T = R && !s;
  let w = orderedRowSource({
    ...(agentId !== undefined && {
      agentId,
    }),
    keep: () => {},
    rows: () => [...(M?.rows() ?? messages), ...S],
    isHookable: T,
  });
  let P = T ? M?.attachLoop() : undefined;
  function Q(D) {
    if (!T || !TIMELINE_MESSAGE_TYPES(D) || weakSet.has(D)) return;
    if (D.type === "assistant" && D.message.content.some((z) => z.type === "tool_use") && !weakSet_2.has(D)) {
      weakSet_2.add(D);
      S.push(D);
    }
    if (!appendHookableFastPath()) return;
    weakSet.add(D);
    try {
      return Promise.resolve(
        appendRowsWithHooks(w, [D], {
          fills: true,
        }),
      ).catch((error) => logAppendKeepFailure("an append", error));
    } catch (error) {
      logAppendKeepFailure("an append", error);
      return;
    }
  }
  return {
    through: async function* (L) {
      let z = false;
      try {
        while (true) {
          let G = await L.next();
          if (G.done) {
            z = true;
            return G.value;
          }
          let ee = Q(G.value);
          if (ee !== undefined) await ee;
          yield G.value;
        }
      } finally {
        if (!z) await L.return(undefined);
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
        let z = new Set(D.map((ee) => ee.uuid));
        let filtered = L.filter((ee) => !z.has(ee.uuid));
        return filtered.length === 0 ? D : [...D, ...filtered];
      } catch (error) {
        logAppendKeepFailure("taking the rows that arrived", error);
        return D;
      }
    },
    [Symbol.dispose]: () => {
      P?.[Symbol.dispose]();
    },
  };
}
//@ chunk-ha3km179.js:30449-30469 placement
var POLL_EVENT = "poll-event";
//@ chunk-ha3km179.js:30469-31890 placement
/**
 * 为已布防的观察者生成附件。
 */
function buildArmedObserverAttachment({ querySource, toolUseContext, messages, turnStartIndex }) {
  try {
    if (classifyQuerySource(querySource) === "auxiliary") return null;
    let session = toolUseContext.session;
    let agentId = toolUseContext.agentId ?? MAIN_OBSERVED_KEY;
    let S = pairingForObserver(session, agentId);
    if (!S || S.state !== "armed") return null;
    let lastIndex = messages.findLastIndex(
      (message) =>
        (message.type === "assistant" && !isVirtualConversationMessage(message)) ||
        (message.type === "user" && message.isCompactSummary === true),
    );
    let sliced = messages.slice(Math.max(turnStartIndex, lastIndex + 1));
    let w =
      sliced.some((Z) => Z.type === "user" && Z.toolUseResult !== undefined) &&
      !sliced.some((Z) => Z.type === "user" && joinNonEmptyText(Z.message.content) !== undefined)
        ? messages.slice(turnStartIndex)
        : sliced;
    let P = mapUserOrigins(w);
    let filtered = w.filter((Z) => Z.type === "user" && !P.has(Z));
    let D = joinUserTexts(filtered);
    if (D !== undefined) S.lastTrigger = truncateObserverText(D, MAX_TRIGGER_TEXT_CHARS);
    if (w.some((Z) => Z.type === "user" && isReportedOrigin(Z.origin, S))) return null;
    let trigger = D;
    let triggerRelay = filtered.some((Z) => Z.type === "user" && isVerifiedSlackHuman(Z));
    let opensTurn = true;
    let ee = false;
    let V = [];
    for (let Z of w) {
      let re = P.get(Z);
      let Re = Z.type === "user" ? joinNonEmptyText(Z.message.content) : undefined;
      if (re !== undefined && Re !== undefined)
        V.push({
          type: "non_user_message",
          source: re,
          text: truncateObserverText(Re, MAX_TRIGGER_TEXT_CHARS),
        });
    }
    let fe = false;
    let ie = (Z) => {
      let re = Z ? [...V, Z] : V;
      V = [];
      if (re.length === 0) return;
      enqueueObserverActivity(session, {
        observedKey: agentId,
        activity: re,
        trigger,
        triggerRelay,
        opensTurn,
      });
      trigger = undefined;
      opensTurn = false;
    };
    return {
      capture(Z) {
        try {
          let timelineEvents = toTimelineEvents(Z, S);
          if (timelineEvents) V.push(...timelineEvents);
        } catch (error) {
          logForDebugging(`[agentObserver] capture failed: ${errorMessage(error)}`);
        }
      },
      flushSegment() {
        try {
          if (fe) return;
          if (!ee) {
            ee = true;
            return;
          }
          ie();
        } catch (error) {
          logForDebugging(`[agentObserver] flush failed: ${errorMessage(error)}`);
        }
      },
      finish(reason) {
        try {
          if (fe) return;
          fe = true;
          ie({
            type: "turn_ended",
            reason,
          });
        } catch (error) {
          logForDebugging(`[agentObserver] finish failed: ${errorMessage(error)}`);
        }
      },
    };
  } catch (error) {
    logForDebugging(`[agentObserver] tap creation failed: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-ha3km179.js:31890-31949 placement
/**
 * 来源是否已上报
 */
function isReportedOrigin(origin, n) {
  return origin !== undefined && n.reportOrigins.has(origin);
}
//@ chunk-ha3km179.js:31949-32044 placement
/**
 * 未标明则 unattributed
 */
function originKindOf(origin, isMeta) {
  if (origin === undefined) return isMeta === true ? "unattributed" : undefined;
  return isHumanDrivenOrigin(origin) ? undefined : origin.kind;
}
//@ chunk-ha3km179.js:32044-32391 placement
/**
 * 建立用户消息到来源的映射。
 */
function mapUserOrigins(e) {
  let n = new Map();
  let r;
  for (let s of e)
    if (s.type === "user") {
      r = s;
      let h = originKindOf(s.origin, s.isMeta);
      if (h !== undefined) n.set(s, h);
    } else if (
      s.type === "attachment" &&
      s.attachment.type === "poll_events" &&
      s.attachment.deliveredVia === "value_dispatch" &&
      r !== undefined
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
//@ chunk-ha3km179.js:32545-33364 placement
/**
 * 把消息转换为时间线事件。
 */
function toTimelineEvents(e, n) {
  if (!e || typeof e !== "object" || !("type" in e)) return null;
  let r = e;
  if (isVirtualConversationMessage(r)) return null;
  if (r.type === "attachment") return attachmentToTimelineEvents(r.attachment, n);
  if (r.type === "assistant") {
    let s = [];
    let content = r.message.content;
    for (let y of content)
      if (y.type === "text") {
        if (y.text.trim())
          s.push({
            type: "assistant_text",
            text: truncateObserverText(y.text, MAX_DELIVERY_CHARS),
          });
      } else if (y.type === "tool_use")
        s.push({
          type: "tool_call",
          name: y.name,
          input: jsonTextOrFallback(y.input),
        });
    return s;
  }
  if (r.type === "user") {
    let content = r.message.content;
    if (Array.isArray(content)) {
      let S = [];
      for (let M of content)
        if (M.type === "tool_result")
          S.push({
            type: "tool_result",
            content: truncateObserverText(joinNonEmptyText(M.content) ?? ""),
          });
      if (S.length > 0) return S;
    }
    if (isReportedOrigin(r.origin, n)) return null;
    let h = joinNonEmptyText(content);
    if (!h) return null;
    let y = originKindOf(r.origin, r.isMeta);
    return [
      y === undefined
        ? {
            type: "user_message",
            text: truncateObserverText(h, MAX_TRIGGER_TEXT_CHARS),
            relay: isVerifiedSlackHuman(r),
          }
        : {
            type: "non_user_message",
            source: y,
            text: truncateObserverText(h),
          },
    ];
  }
  return null;
}
//@ chunk-ha3km179.js:33364-34422 placement
/**
 * 把附件转换为时间线事件（记忆加载、技能发现等）。
 */
function attachmentToTimelineEvents(attachment, n) {
  switch (attachment.type) {
    case "nested_memory":
      return [
        {
          type: "guidance_loaded",
          path: attachment.displayPath,
          content: truncateObserverText(attachment.content.content),
        },
      ];
    case "dynamic_skill":
      return [
        {
          type: "skills_discovered",
          dir: attachment.displayPath,
          names: attachment.skillNames,
        },
      ];
    case "queued_command": {
      let taskNotificationOrigin = resolveTaskNotificationOrigin(attachment.origin, attachment.commandMode);
      if (isReportedOrigin(taskNotificationOrigin, n)) return null;
      let s = joinNonEmptyText(attachment.prompt);
      if (!s) return null;
      let h = truncateObserverText(s, MAX_TRIGGER_TEXT_CHARS);
      let y = classifyNonUserMessageSource(h, taskNotificationOrigin, {
        verifiedSlackHumanTurn: attachment.verifiedSlackHumanTurn,
        isMeta: attachment.isMeta,
        hearthServerEnvelope: hasHearthRelay(attachment),
        hearthJoinedTextBlocks:
          Array.isArray(attachment.prompt) && count(attachment.prompt, (R) => R.type === "text") > 1,
        sendMessageToolAbsent: attachment.sendMessageToolAbsent,
      });
      let S = originKindOf(taskNotificationOrigin, attachment.isMeta);
      if (S !== undefined)
        return [
          {
            type: "non_user_message",
            source: S,
            text: y,
          },
        ];
      let M = isVerifiedSlackHuman(attachment);
      return [
        {
          type: "user_message",
          text: M ? y : h,
          relay: M,
        },
      ];
    }
    case "poll_events": {
      let flattened = attachment.envelopes.flatMap((envelope, h) => {
        switch (attachment.kinds[h]) {
          case REPL_EVAL:
            return [];
          case REPL_STATUS:
            return [];
          default: {
            let text = truncateObserverText(envelope, MAX_TRIGGER_TEXT_CHARS);
            return [
              attachment.provenance?.[h]?.authority === "human-principal"
                ? {
                    type: "user_message",
                    text,
                    relay: false,
                  }
                : {
                    type: "non_user_message",
                    source: POLL_EVENT,
                    text,
                  },
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
  if (typeof data === "string") return data.trim() ? data : undefined;
  if (Array.isArray(data)) {
    let filtered = data
      .map((r) => (r && typeof r === "object" && "type" in r && r.type === "text" ? r.text : ""))
      .filter(Boolean);
    return filtered.length > 0
      ? filtered.join(`
`)
      : undefined;
  }
  return;
}
//@ chunk-ha3km179.js:34648-34735 placement
/**
 * JSON 文本或占位
 */
function jsonTextOrFallback(e) {
  try {
    return JSON.stringify(e) ?? String(e);
  } catch {
    return "[unserializable]";
  }
}
//@ chunk-ha3km179.js:34735-36630 placement
/**
 * 按编辑规则排除工具的结果（off/shadow 模式下不执行）。
 */
function applyToolExclusionEdit(messages, querySource, attemptModel, agentId, forkPointUuid, readFileState) {
  try {
    let S = idleClearingMode();
    if (S === "off" || S === "shadow") return;
    let M = planToolResultClearingAfterIdle(
      messages,
      querySource,
      attemptModel,
      agentId,
      undefined,
      forkPointUuid,
    );
    if (!M) return;
    let R = new Set(M.edit.exclude_tools);
    let T = new Map();
    let w = [];
    let P = new Set();
    let Q = new Map();
    let D = 0;
    for (let Z of messages) {
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
            T.set(Re.id, {
              sentName: se,
              input: Re.input,
              replyId: Z.message.id,
            });
        } else if (Re?.type === "tool_result") {
          let se = T.get(Re.tool_use_id);
          if (se && !P.has(Re.tool_use_id)) {
            P.add(Re.tool_use_id);
            w.push({
              ...se,
              result: Re,
            });
            let Te = (Q.get(se.replyId) ?? 0) + 1;
            Q.set(se.replyId, Te);
            D = Math.max(D, Te);
          }
        }
    }
    let L = M.edit.keep.value;
    let z = M.edit.trigger.value;
    let G = z + 1 - L;
    let ee = w.length + Math.max(L, D);
    let V = ee > z ? 1 + Math.floor((ee - z - 1) / G) : 0;
    let max = Math.max(V * G, Math.min(M.returnAfterIdle.toolUsesClearedSinceIdle, w.length - L));
    let ie = new Set();
    for (let { sentName, input, result: Re } of w) {
      let se = max > 0;
      let { content } = Re;
      let U =
        typeof content === "string"
          ? content.length
          : Array.isArray(content)
            ? content.reduce(
                (acc, bt) =>
                  bt?.type === "text" && typeof bt.text === "string" ? acc + bt.text.length : acc,
                0,
              )
            : 0;
      if (se && U >= SMALL_RESULT_BYTES) max--;
      if (Re.is_error === true || typeof input !== "object" || !input) continue;
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
      let re = readFileState.get(Z);
      if (re && !re.contentNotInModelContext)
        readFileState.set(Z, {
          ...re,
          contentNotInModelContext: true,
        });
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
  isSleepCheckPhrase,
  routeSubmissions,
  isPresencePing,
};
