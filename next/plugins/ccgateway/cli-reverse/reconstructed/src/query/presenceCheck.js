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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ha3km179.js:14651-15143 placement
/**
 * 判断用户文本是否是"解释一下"类请求。
 */
function isExplainRequest(promptText) {
  let trimmed = promptText
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
var PRESENCE_PINGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ha3km179.js:15218", () => {
  PRESENCE_PINGS = new Set([
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
});
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
//@ chunk-ha3km179.js:16471-16506 placement (2.1.88 match: getValueFromInput, 1)
var getValueFromInput = (command, waited) => waited && command.mode === "prompt";
//@ chunk-ha3km179.js:16506-16601 placement
/**
 * 内联通知模式下可查询
 */
var isInlineNotificationCandidate = (command) =>
  isInlineNotificationMode(command) &&
  command.promptSubmitted === undefined &&
  command.shouldQuery !== false &&
  command.skipSubmissionHooks !== true;
//@ chunk-ha3km179.js:16601-16684 placement
/**
 * 队列里的可投递项
 */
function queuedDeliverable(commands, messageQueue) {
  let queued = new Set(messageQueue.getCommandQueue());
  return commands.filter((command) => queued.has(command));
}
//@ chunk-ha3km179.js:16684-16786 placement
function filterPromptSubmissions(commands, messageQueue) {
  let waited = false;
  let deliverable = [];
  for (let command of commands)
    if (isInlineNotificationCandidate(command)) waited = true;
    else if (!getValueFromInput(command, waited)) deliverable.push(command);
  return queuedDeliverable(deliverable, messageQueue);
}
//@ chunk-ha3km179.js:16786-16861 placement (2.1.88 match: processQueuedCommands, 1)
var processQueuedCommands = (queuedCommands) =>
  queuedCommands.mode === "task-notification"
    ? {
        kind: "task-notification",
      }
    : undefined;
//@ chunk-ha3km179.js:16861-16974 placement
var submissionPayload = (command) => ({
  text: getContentText(command.value) ?? "",
  input: command.value,
  pastedContents: command.pastedContents,
  ...(command.isMeta === true && {
    isMeta: true,
  }),
});
//@ chunk-ha3km179.js:16974-17369 placement
/**
 * 描述一次输入提交（来源、模式、是否等待、上下文）。
 */
function describeSubmission(command, toolUseContext, result) {
  let origin = normalizeTaskNotificationOrigin(command.origin) ?? processQueuedCommands(command);
  let isSystemOrigin = command.isMeta === true || !isHumanOrUnset(origin);
  return {
    submission: submissionPayload(command),
    origin,
    bridgeOrigin: command.bridgeOrigin,
    mode: command.mode,
    turnId: currentTurn()?.turnId,
    shouldWait: command.wait === true,
    context: toolUseContext,
    result,
    promptSource: resolvePromptSource({
      isNonInteractive: toolUseContext.options.isNonInteractiveSession,
      isMeta: command.isMeta,
      callerSource: isSystemOrigin ? "system" : (command.inputSource ?? "queued"),
    }),
    wakeupSource: command.wakeupSource,
    isStartInput: isGoalIdleCheckinPaused(command.uuid),
  };
}
//@ chunk-ha3km179.js:17369-17403 placement
/**
 * 投递去向
 */
var settleFate = (settled, fate) => ({
  fate: settled ? fate : "left",
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
var hasActiveQueue = (submission) => !submission.isStartInput && getActiveMessageQueue() !== undefined;
//@ chunk-ha3km179.js:17711-18620 placement
/**
 * 决定提交的去向（立即处理、等待、浮出）。
 */
async function routeSubmission(command, toolUseContext) {
  let messageQueue = toolUseContext.messageQueue;
  let result = {
    messages: [],
    shouldQuery: true,
  };
  let submission = describeSubmission(command, toolUseContext, result);
  let settleAsWaiting = () =>
    settleFate(
      messageQueue.settleSurfaced(command, {
        promptSubmitted: undefined,
        drainOnly: true,
      }),
      "waits",
    );
  if (hasActiveQueue(submission)) return settleAsWaiting();
  let hooksSnapshot;
  let submitOutcome;
  let hookedFate;
  function settleFromHookOutcome(hookOutcome) {
    if (!hookOutcome || !hooksSnapshot || hookOutcome.wasCancelled)
      return settleFate(
        messageQueue.settleSurfaced(command, {
          promptSubmitted: undefined,
          drainOnly: true,
        }),
        "waits",
      );
    let ended = hookOutcome.ended !== undefined;
    return settleFate(
      messageQueue.settleSurfaced(command, {
        promptSubmitted: submissionOutcome({
          outcome: hookOutcome,
          scratch: result,
          under: hooksSnapshot,
          text: submission.submission.text,
          isHidden: command.isMeta === true && isAutoContinuationOrigin(submission.origin),
        }),
        drainOnly: ended ? true : undefined,
      }),
      ended ? "waits" : "surfaces",
    );
  }
  try {
    hooksSnapshot = hooksSnapshotKey(toolUseContext);
    submitOutcome = await submitPromptWithHooks({
      ...submission,
      enter: async (hookOutcome) => {
        hookedFate = settleFromHookOutcome(hookOutcome);
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
  if (hookedFate) return hookedFate;
  let ended = submitOutcome?.ended && submitOutcome.stopped === undefined ? submitOutcome.ended : undefined;
  function settleDropped(ended) {
    if (
      !messageQueue.settleSurfaced(command, {
        dropped: true,
      })
    )
      return {
        fate: "left",
      };
    messageQueue.handTypedBack([command]);
    return {
      fate: "dropped",
      notices: ended.messages,
    };
  }
  return ended ? settleDropped(ended) : settleFromHookOutcome(submitOutcome);
}
//@ chunk-ha3km179.js:18620-19073 placement
/**
 * 批量路由排队的提交。
 */
async function routeSubmissions(commands, updatedToolUseContext) {
  let deliverable = [];
  let notices = [];
  let dropped = [];
  let waited = false;
  let routedAny = false;
  let hasSubmitHooks;
  try {
    for (let command of commands) {
      if (getValueFromInput(command, waited)) continue;
      hasSubmitHooks ??= hasPromptSubmitHooks(updatedToolUseContext);
      if (!isInlineNotificationCandidate(command) || !hasSubmitHooks) {
        deliverable.push(command);
        continue;
      }
      routedAny = true;
      let route = await routeSubmission(command, updatedToolUseContext);
      switch (route.fate) {
        case "surfaces":
          deliverable.push(command);
          break;
        case "waits":
          waited = true;
          break;
        case "dropped":
          notices.push(...route.notices);
          dropped.push(command);
          break;
        case "left":
          break;
      }
    }
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return {
      deliverable: filterPromptSubmissions(commands, updatedToolUseContext.messageQueue),
      notices,
      dropped,
    };
  }
  return {
    deliverable: routedAny ? queuedDeliverable(deliverable, updatedToolUseContext.messageQueue) : deliverable,
    notices,
    dropped,
  };
}
//@ chunk-ha3km179.js:19073-19485 placement
/**
 * 包装 callModel，在调用前解析 prompt.attachment hook 的附件。
 */
function wrapCallModelWithAttachments(deps, toolUseContext) {
  let { agentContext, hookOrigin, options } = toolUseContext;
  return isDelegatedObservationContext(agentContext) || options?.settingsHooksOff === true
    ? deps
    : {
        ...deps,
        callModel: async function* (params) {
          try {
            if (
              hasModuleHookingSite("prompt.attachment", undefined, canShortcutAppend("prompt.attachment"))
            ) {
              let { resolveAttachments } = await import("../engine/answerAuthorOf.lazy.js");
              await resolveAttachments(
                params.messages,
                {
                  signal: params.signal,
                  origin: hookOrigin,
                },
                params.options.agentId,
              );
            }
          } catch (error) {
            if (params.signal.aborted) throw error;
            if (!isAbortError(error)) logError(error);
          }
          return yield* deps.callModel(params);
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
  let modelsOk =
    Array.isArray(models) && models.length > 0 && models.every((model) => typeof model === "string");
  return {
    on: enabled === true && (models === undefined || modelsOk),
    models: modelsOk ? models : ARTIFACT_PATCH_MODELS,
    sideCallClass: sideCallClass === "side_reply" ? "side_reply" : undefined,
  };
}
//@ chunk-ha3km179.js:19844-21092 placement
/**
 * 补丁回合（artifact patch）可以忽略的附件种类集合：这些系统注入的附件不会单独触发一次补丁请求；同组还有一个默认关闭的开关。
 */
var ARTIFACT_PATCH_IGNORABLE_ATTACHMENTS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ARTIFACT_PATCH_IGNORABLE_ATTACHMENTS;
var ARTIFACT_PATCH_LIMITS;
var ARTIFACT_PATCH_FLAGS;
deferInit("chunk-ha3km179.js:19844", () => {
  ARTIFACT_PATCH_IGNORABLE_ATTACHMENTS_2 = false;
  ARTIFACT_PATCH_IGNORABLE_ATTACHMENTS = new Set([
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
  ARTIFACT_PATCH_LIMITS = true;
  ARTIFACT_PATCH_FLAGS = new Set([
    "async_hook_response_batch",
    "hook_cancelled",
    "hook_error_during_execution",
    "hook_non_blocking_error",
    "hook_permission_decision",
    "hook_system_message",
  ]);
});
//@ chunk-ha3km179.js:21092-21457 placement
/**
 * 开关打开时把 callModel 包装为 Artifact 补丁回合。
 */
function wrapArtifactPatchTurn(deps, toolUseContext) {
  try {
    let artifactPatchConfig = parseArtifactPatchConfig(
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_ORPINE, false),
    );
    if (!artifactPatchConfig.on) return deps;
    let artifactPatchTurn = createArtifactPatchTurn(deps.callModel, toolUseContext, {
      compose: async (composeInput) =>
        (await import("../services/artifacts/comments/composePatch.lazy.js")).composePatch(composeInput),
      uuid: deps.uuid,
      now: () => Date.now(),
      models: artifactPatchConfig.models,
      sideCallClass: artifactPatchConfig.sideCallClass,
    });
    return {
      ...deps,
      callModel: (params) => artifactPatchTurn.step(params),
    };
  } catch (error) {
    logError(artifactPatchError(error, "while setting up; the loop runs without the patch turn"));
    return deps;
  }
  return deps;
}
//@ chunk-ha3km179.js:21457-21660 placement
/**
 * 跳过补丁回合的原因
 */
var ARTIFACT_PATCH_SKIP_REASONS_2; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var ARTIFACT_PATCH_SKIP_REASONS;
deferInit("chunk-ha3km179.js:21457", () => {
  ARTIFACT_PATCH_SKIP_REASONS_2 = new Set([
    "plan_mode",
    "brief_mode",
    "tools_missing",
    "model_not_listed",
    "thinking_budgeted",
    "not_person_turn",
    "not_plain_text",
    "has_attachments",
  ]);
  ARTIFACT_PATCH_SKIP_REASONS = new SessionRootSlot(() => ({
    sessionId: undefined,
    reasons: new Set(),
  }));
});
//@ chunk-ha3km179.js:21660-24530 placement
/**
 * Artifact 补丁回合：判断资格、组合补丁请求并记录结果。
 */
function createArtifactPatchTurn(callModel, toolUseContext, options) {
  let phase = {
    kind: "fresh",
  };
  let abortTarget;
  let requestIndex = 0;
  let log = options.log ?? reportArtifactPatchTurn;
  let report = (event) => {
    logForDebugging(
      `artifact patch turn: ${event.outcome}${event.reason === undefined ? "" : ` (${event.reason})`} at request ${requestIndex} of the turn`,
    );
    log(event);
  };
  let shouldReportSkip = (reason) => {
    if (reason === "not_main_thread" || reason === "subagent" || reason === "not_first_request") return false;
    if (!ARTIFACT_PATCH_SKIP_REASONS_2.has(reason)) return true;
    let skipState = ARTIFACT_PATCH_SKIP_REASONS.of(toolUseContext.session);
    let sessionId = getSessionId();
    if (skipState.sessionId !== sessionId) {
      skipState.sessionId = sessionId;
      skipState.reasons.clear();
    }
    if (skipState.reasons.has(reason)) return false;
    skipState.reasons.add(reason);
    return true;
  };
  let onAbort = () => {
    if (phase.kind === "edits_sent" || phase.kind === "publish_sent") {
      try {
        report({
          ...phase.event,
          outcome: "canceled",
          reason: phase.kind === "edits_sent" ? "during_write" : "during_publish",
        });
      } catch (error) {
        logError(artifactPatchError(error, "while recording a canceled turn"));
      }
      phase = {
        kind: "done",
      };
    }
  };
  async function* step(params) {
    requestIndex++;
    let patchMessage;
    try {
      patchMessage = await advance(params);
    } catch (error) {
      logError(artifactPatchError(error, "before a step; the model takes the turn"));
      report({
        outcome: "error",
      });
      phase = {
        kind: "done",
      };
    }
    if (phase.kind === "done" && abortTarget !== undefined) {
      abortTarget.removeEventListener("abort", onAbort);
      abortTarget = undefined;
    }
    if (patchMessage === undefined) return yield* callModel(params);
    yield patchMessage;
  }
  async function advance(params) {
    let previous = phase;
    switch (
      ((phase = {
        kind: "done",
      }),
      previous.kind)
    ) {
      case "fresh":
        return params.signal.aborted ? undefined : await startFresh(params);
      case "edits_sent": {
        let { ids, editsSent, reply, sideCallMessageId, target, event } = previous;
        let okCount = count(ids, (id) => toolResultStatus(params.messages, id) === "ok");
        let patchEvent = {
          ...event,
          editsWritten: okCount,
        };
        if (okCount !== ids.length) {
          report({
            ...patchEvent,
            outcome: "write_failed",
          });
          return;
        }
        if (toolResultsAnswered(params.messages, ids)) {
          report({
            ...patchEvent,
            outcome: "unpublished",
            reason: "interjected",
          });
          return;
        }
        let id = patchToolUseId(options.uuid);
        phase = {
          kind: "publish_sent",
          ids: [id],
          editsSent,
          reply,
          sideCallMessageId,
          target,
          event: patchEvent,
        };
        return hasMemoryFileRead(target.path, id);
      }
      case "publish_sent": {
        let { ids, editsSent, reply, sideCallMessageId, target, event } = previous;
        if (toolResultStatus(params.messages, ids[0]) !== "ok") {
          report({
            ...event,
            outcome: "publish_failed",
          });
          return;
        }
        if (toolResultsAnswered(params.messages, ids)) {
          report({
            ...event,
            outcome: "published",
            reason: "interjected",
          });
          return;
        }
        report({
          ...event,
          outcome: "published",
        });
        return buildPatchTextMessage(patchSummaryText(editsSent, target.url, reply), sideCallMessageId);
      }
      case "done":
        return;
    }
  }
  async function startFresh(params) {
    let eligibility = checkArtifactPatchEligibility(params, toolUseContext, options.models);
    if (!eligibility.ok) {
      if (shouldReportSkip(eligibility.reason))
        report({
          outcome: "ineligible",
          reason: eligibility.reason,
        });
      return;
    }
    let model = getMainLoopModel_2(toolUseContext);
    let patchResult = await options.compose({
      request: eligibility.request,
      path: eligibility.target.path,
      slug: eligibility.target.slug,
      observedVer: eligibility.target.observedVer,
      model,
      thinkingConfig: params.thinkingConfig,
      sideCallClass: options.sideCallClass,
      permissions: () => getToolPermissionContext(toolUseContext),
      context: toolUseContext,
      now: options.now,
    });
    let event = {
      outcome: patchResult.kind === "patched" ? "published" : patchResult.kind,
      reason: patchResult.kind === "patched" ? undefined : patchResult.reason,
      retried: patchResult.retried,
      pageBytes: patchResult.pageBytes,
      requestChars: eligibility.request.length,
      readMs: patchResult.timings.readMs,
      callMs: patchResult.timings.callMs,
      retryMs: patchResult.timings.retryMs,
      model,
      ...(patchResult.kind === "patched" && {
        edits: patchResult.editCount,
      }),
      ...(patchResult.kind !== "patched" && {
        failingEdit: patchResult.failingEdit,
      }),
    };
    if (patchResult.kind !== "patched") {
      report(event);
      return;
    }
    if (params.signal.aborted) {
      report({
        ...event,
        outcome: "canceled",
        reason: "before_write",
      });
      return;
    }
    patchResult.seedReadState();
    params.signal.addEventListener("abort", onAbort, {
      once: true,
    });
    abortTarget = params.signal;
    let toolUseIds = patchResult.edits.map(() => patchToolUseId(options.uuid));
    phase = {
      kind: "edits_sent",
      ids: toolUseIds,
      editsSent: patchResult.edits.length,
      reply: patchResult.reply,
      sideCallMessageId: patchResult.sideCallMessageId,
      target: eligibility.target,
      event,
    };
    return buildEditToolUses(eligibility.target.path, patchResult.edits, toolUseIds);
  }
  return {
    step,
  };
}
//@ chunk-ha3km179.js:24530-25885 placement
/**
 * 判断能否走 Artifact 补丁回合（主线程、非子代理、非计划模式等）。
 */
function checkArtifactPatchEligibility(params, toolUseContext, models = ARTIFACT_PATCH_MODELS) {
  let reject = (reason) => ({
    ok: false,
    reason,
  });
  if (classifyQuerySource(params.options.querySource) !== "main") return reject("not_main_thread");
  if (toolUseContext.agentId !== undefined) return reject("subagent");
  if (getToolPermissionContext(toolUseContext).mode === "plan") return reject("plan_mode");
  if (isBriefEnabled()) return reject("brief_mode");
  if (
    !params.tools.some((tool) => toolMatchesName(tool, FILE_EDIT_TOOL_NAME)) ||
    !params.tools.some((tool) => toolMatchesName(tool, ARTIFACT_TOOL_NAME))
  )
    return reject("tools_missing");
  let mainLoopModel = getMainLoopModel_2(toolUseContext);
  if (!models.includes(getCanonicalName(mainLoopModel))) return reject("model_not_listed");
  if (!usesAdaptiveThinking(params.thinkingConfig, mainLoopModel)) return reject("thinking_budgeted");
  let { messages } = params;
  let deciderTurn = strictHumanDeciderTurn(messages);
  if (deciderTurn === undefined || deciderTurn.type !== "user" || deciderTurn.isMeta)
    return reject("not_person_turn");
  let sliced = messages.slice(messages.lastIndexOf(deciderTurn) + 1);
  if (sliced.some((message) => message.type !== "attachment")) return reject("not_first_request");
  let promptText = plainPromptText(deciderTurn);
  if (promptText === undefined) return reject("not_plain_text");
  if (sliced.some((message) => !isIgnorableAttachment(message, "opener"))) return reject("has_attachments");
  let heldPages = toolUseContext.artifactRegistries.recordedPages.heldSourcePages();
  if (heldPages.length === 0) return reject("no_artifact");
  let slugs = artifactSlugsInText(promptText);
  let targetPage;
  if (slugs === "unreadable" || slugs.length > 1)
    return reject(slugs === "unreadable" ? "url_not_held" : "several_artifacts");
  else if (slugs.length === 1) {
    targetPage = heldPages.find((page) => page.slug === slugs[0]);
    if (targetPage === undefined) return reject("url_not_held");
  } else if (heldPages.length === 1) targetPage = heldPages[0];
  else return reject("several_artifacts");
  if (targetPage.unasked) return reject("unasked_republish");
  let { ver, observers } = toolUseContext.getArtifactReadObservation(targetPage.slug);
  if (ver === undefined || !hasMainKey(observers)) return reject("no_observed_version");
  return {
    ok: true,
    request: promptText,
    target: {
      path: targetPage.path,
      slug: targetPage.slug,
      url: targetPage.url,
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
function isIgnorableAttachment(message, position) {
  if (message.type !== "attachment") return false;
  let attachment = message.attachment;
  if (ARTIFACT_PATCH_IGNORABLE_ATTACHMENTS.has(attachment.type) || ARTIFACT_PATCH_FLAGS.has(attachment.type))
    return true;
  let openerOnly = position === "opener" && ARTIFACT_PATCH_LIMITS;
  if (attachment.type === "hook_additional_context") return openerOnly;
  if (attachment.type === "async_hook_response") {
    let response = attachment.response ?? {};
    let additionalContext =
      typeof response.hookSpecificOutput === "object" && response.hookSpecificOutput !== null
        ? response.hookSpecificOutput.additionalContext
        : undefined;
    return (!response.systemMessage && !additionalContext) || openerOnly;
  }
  return (
    attachment.type === "hook_success" &&
    (attachment.content === "" ||
      openerOnly ||
      (attachment.hookEvent !== "SessionStart" &&
        attachment.hookEvent !== "UserPromptSubmit" &&
        attachment.hookEvent !== "UserPromptExpansion"))
  );
}
//@ chunk-ha3km179.js:26559-26781 placement
function plainPromptText(message) {
  let { content } = message.message;
  let text;
  if (typeof content === "string") text = content;
  else if (content.every((block) => block.type === "text"))
    text = content.map((block) => (block.type === "text" ? block.text : "")).join(`
`);
  else return;
  let trimmed = text.trim();
  if (trimmed === "" || SYSTEM_TAG_PROMPT_RE.test(trimmed)) return;
  return text;
}
//@ chunk-ha3km179.js:26781-26888 placement
var SYSTEM_TAG_PROMPT_RE; // deferred: uses UUID_PATTERN (../tools/ArtifactTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var regExp;
deferInit("chunk-ha3km179.js:26781", () => {
  SYSTEM_TAG_PROMPT_RE = /^<(command-|bash-|local-command|system-reminder|task-notification|user-prompt)/;
  regExp = new RegExp(VIEWER_PREFIX_RE);
});
//@ chunk-ha3km179.js:26888-27108 placement
function artifactSlugsInText(text) {
  let slugs = new Set();
  let sawUnreadable = false;
  for (let match of text.matchAll(/https?:\/\/[^\s<>"'\]]+/g)) {
    let replaced = match[0].replace(/[.,;:!?)\]}>'"`*_]+$/, "");
    let artifactUrl = parseArtifactUrl(replaced);
    if (artifactUrl !== null) slugs.add(artifactUrl.slug);
    else if (regExp.test(replaced)) sawUnreadable = true;
  }
  return sawUnreadable ? "unreadable" : [...slugs];
}
//@ chunk-ha3km179.js:27108-27361 placement
function toolResultStatus(messages, toolUseId) {
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (message?.type !== "user" || typeof message.message.content === "string") continue;
    for (let block of message.message.content)
      if (block.type === "tool_result" && block.tool_use_id === toolUseId)
        return block.is_error === true ? "error" : "ok";
  }
  return "missing";
}
//@ chunk-ha3km179.js:27361-27719 placement
/**
 * 指定工具调用之后是否已有回复。
 */
function toolResultsAnswered(messages, toolUseIds) {
  let wantedIds = new Set(toolUseIds);
  let lastIndex = messages.findLastIndex(
    (message) =>
      message.type === "assistant" &&
      message.message.content.some((block) => block.type === "tool_use" && wantedIds.has(block.id)),
  );
  if (lastIndex === -1) return true;
  return messages.slice(lastIndex + 1).some((message) => {
    if (message.type === "user" && typeof message.message.content !== "string")
      return !message.message.content.every(
        (block) => block.type === "tool_result" && wantedIds.has(block.tool_use_id),
      );
    return !isIgnorableAttachment(message, "after_step");
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
function buildEditToolUses(filePath, edits, toolUseIds) {
  return synthesizedAssistantMessage(
    edits.map((edit, index) => ({
      type: "tool_use",
      id: toolUseIds[index],
      name: FILE_EDIT_TOOL_NAME,
      input: {
        file_path: filePath,
        old_string: edit.oldString,
        new_string: edit.newString,
        replace_all: false,
      },
    })),
  );
}
//@ chunk-ha3km179.js:28032-28113 placement (2.1.88 match: hasMemoryFileRead, 1)
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
function artifactPatchError(error, stage) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `artifact patch turn: ${error instanceof Error ? error.name : typeof error} ${stage}`,
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
  let message = synthesizedAssistantMessage([
    {
      type: "text",
      text,
      citations: null,
    },
  ]);
  if (sideCallMessageId !== undefined && MESSAGE_ID_RE.test(sideCallMessageId))
    message.message.id = sideCallMessageId;
  return message;
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
function reportArtifactPatchTurn(event) {
  logEvent("tengu_artifact_patch_turn", {
    outcome: fromEnum(event.outcome),
    reason: fromEnumOpt(event.reason),
    retried: event.retried,
    edits: event.edits,
    failing_edit: event.failingEdit,
    edits_written: event.editsWritten,
    page_bytes: event.pageBytes,
    request_chars: event.requestChars,
    read_ms: event.readMs,
    call_ms: event.callMs,
    retry_ms: event.retryMs,
    model: event.model === undefined ? undefined : telemetrySafeModelName(event.model),
  });
}
//@ chunk-ha3km179.js:28846-28887 placement
/**
 * 惰性加载补丁模块
 */
var lazyPatchModule = () => import("../plugins/functionHooks/api/BLOCK_SCHEMA.lazy.js");
//@ chunk-ha3km179.js:28887-28899 placement
// deferred: uses TEXT_PASSTHROUGH_CORES (../plugins/functionHooks/coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ha3km179.js:28887", () => {
  TEXT_PASSTHROUGH_CORES.set(lazyPatchModule);
});
//@ chunk-ha3km179.js:28899-29158 placement
/**
 * 可进时间线的类型
 */
var TIMELINE_MESSAGE_TYPES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TIMELINE_MESSAGE_TYPES;
var logAppendKeepFailure;
deferInit("chunk-ha3km179.js:28899", () => {
  TIMELINE_MESSAGE_TYPES_2 = new Set(["user", "assistant", "attachment", "system"]);
  TIMELINE_MESSAGE_TYPES = (value) =>
    typeof value === "object" &&
    value !== null &&
    "uuid" in value &&
    "type" in value &&
    TIMELINE_MESSAGE_TYPES_2.has(value.type);
  logAppendKeepFailure = (label, error) =>
    logForDebugging(
      `session.append at the loop's keep point: ${label} failed, the row is kept as made: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
});
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
  let observationOff =
    isDelegatedObservationContext(toolUseContext.agentContext) ||
    toolUseContext.options.settingsHooksOff === true;
  let weakSet = new WeakSet();
  let weakSet_2 = new WeakSet();
  let pendingRows = [];
  let conversation;
  let turnLive = false;
  try {
    conversation = currentSurfaceBinding()?.conversation?.(agentId);
    turnLive = isTurnLive(agentId);
  } catch (error) {
    logAppendKeepFailure("reading the running turn", error);
  }
  let hookable = turnLive && !observationOff;
  let rowSource = orderedRowSource({
    ...(agentId !== undefined && {
      agentId,
    }),
    keep: () => {},
    rows: () => [...(conversation?.rows() ?? messages), ...pendingRows],
    isHookable: hookable,
  });
  let loopAttachment = hookable ? conversation?.attachLoop() : undefined;
  function appendIfLive(message) {
    if (!hookable || !TIMELINE_MESSAGE_TYPES(message) || weakSet.has(message)) return;
    if (
      message.type === "assistant" &&
      message.message.content.some((block) => block.type === "tool_use") &&
      !weakSet_2.has(message)
    ) {
      weakSet_2.add(message);
      pendingRows.push(message);
    }
    if (!appendHookableFastPath()) return;
    weakSet.add(message);
    try {
      return Promise.resolve(
        appendRowsWithHooks(rowSource, [message], {
          fills: true,
        }),
      ).catch((error) => logAppendKeepFailure("an append", error));
    } catch (error) {
      logAppendKeepFailure("an append", error);
      return;
    }
  }
  return {
    through: async function* (iterator) {
      let done = false;
      try {
        while (true) {
          let step = await iterator.next();
          if (step.done) {
            done = true;
            return step.value;
          }
          let appendPromise = appendIfLive(step.value);
          if (appendPromise !== undefined) await appendPromise;
          yield step.value;
        }
      } finally {
        if (!done) await iterator.return(undefined);
      }
    },
    appended: async (message) => {
      await appendIfLive(message);
    },
    answeredAs: (replacement, original) => {
      if (weakSet.has(original)) weakSet.add(replacement);
    },
    withArrivedRows: (rows) => {
      try {
        let arrived = loopAttachment?.taken() ?? [];
        if (arrived.length === 0) return rows;
        let knownUuids = new Set(rows.map((row) => row.uuid));
        let filtered = arrived.filter((row) => !knownUuids.has(row.uuid));
        return filtered.length === 0 ? rows : [...rows, ...filtered];
      } catch (error) {
        logAppendKeepFailure("taking the rows that arrived", error);
        return rows;
      }
    },
    [Symbol.dispose]: () => {
      loopAttachment?.[Symbol.dispose]();
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
    let pairing = pairingForObserver(session, agentId);
    if (!pairing || pairing.state !== "armed") return null;
    let lastIndex = messages.findLastIndex(
      (message) =>
        (message.type === "assistant" && !isVirtualConversationMessage(message)) ||
        (message.type === "user" && message.isCompactSummary === true),
    );
    let sliced = messages.slice(Math.max(turnStartIndex, lastIndex + 1));
    let candidateMessages =
      sliced.some((message) => message.type === "user" && message.toolUseResult !== undefined) &&
      !sliced.some(
        (message) => message.type === "user" && joinNonEmptyText(message.message.content) !== undefined,
      )
        ? messages.slice(turnStartIndex)
        : sliced;
    let originByMessage = mapUserOrigins(candidateMessages);
    let messages_2 = candidateMessages.filter(
      (message) => message.type === "user" && !originByMessage.has(message),
    );
    let triggerText = joinUserTexts(messages_2);
    if (triggerText !== undefined)
      pairing.lastTrigger = truncateObserverText(triggerText, MAX_TRIGGER_TEXT_CHARS);
    if (
      candidateMessages.some(
        (message) => message.type === "user" && isReportedOrigin(message.origin, pairing),
      )
    )
      return null;
    let trigger = triggerText;
    let triggerRelay = messages_2.some((message) => message.type === "user" && isVerifiedSlackHuman(message));
    let opensTurn = true;
    let sawSegmentStart = false;
    let activities = [];
    for (let message of candidateMessages) {
      let source = originByMessage.get(message);
      let text = message.type === "user" ? joinNonEmptyText(message.message.content) : undefined;
      if (source !== undefined && text !== undefined)
        activities.push({
          type: "non_user_message",
          source,
          text: truncateObserverText(text, MAX_TRIGGER_TEXT_CHARS),
        });
    }
    let finished = false;
    let flush = (lastEvent) => {
      let events = lastEvent ? [...activities, lastEvent] : activities;
      activities = [];
      if (events.length === 0) return;
      enqueueObserverActivity(session, {
        observedKey: agentId,
        activity: events,
        trigger,
        triggerRelay,
        opensTurn,
      });
      trigger = undefined;
      opensTurn = false;
    };
    return {
      capture(event) {
        try {
          let timelineEvents = toTimelineEvents(event, pairing);
          if (timelineEvents) activities.push(...timelineEvents);
        } catch (error) {
          logForDebugging(`[agentObserver] capture failed: ${errorMessage(error)}`);
        }
      },
      flushSegment() {
        try {
          if (finished) return;
          if (!sawSegmentStart) {
            sawSegmentStart = true;
            return;
          }
          flush();
        } catch (error) {
          logForDebugging(`[agentObserver] flush failed: ${errorMessage(error)}`);
        }
      },
      finish(reason) {
        try {
          if (finished) return;
          finished = true;
          flush({
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
function isReportedOrigin(origin, pairing) {
  return origin !== undefined && pairing.reportOrigins.has(origin);
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
function mapUserOrigins(messages) {
  let origins = new Map();
  let lastUserMessage;
  for (let message of messages)
    if (message.type === "user") {
      lastUserMessage = message;
      let originKind = originKindOf(message.origin, message.isMeta);
      if (originKind !== undefined) origins.set(message, originKind);
    } else if (
      message.type === "attachment" &&
      message.attachment.type === "poll_events" &&
      message.attachment.deliveredVia === "value_dispatch" &&
      lastUserMessage !== undefined
    )
      if (message.attachment.provenance?.[0]?.authority === "human-principal")
        origins.delete(lastUserMessage);
      else origins.set(lastUserMessage, POLL_EVENT);
  return origins;
}
//@ chunk-ha3km179.js:32391-32545 placement
function joinUserTexts(messages) {
  let texts = [];
  for (let message of messages) {
    if (message.type !== "user") continue;
    let text = joinNonEmptyText(message.message.content);
    if (text) texts.push(text);
  }
  if (texts.length === 0) return;
  return texts.join(`

`);
}
//@ chunk-ha3km179.js:32545-33364 placement
/**
 * 把消息转换为时间线事件。
 */
function toTimelineEvents(row, pairing) {
  if (!row || typeof row !== "object" || !("type" in row)) return null;
  let message = row;
  if (isVirtualConversationMessage(message)) return null;
  if (message.type === "attachment") return attachmentToTimelineEvents(message.attachment, pairing);
  if (message.type === "assistant") {
    let events = [];
    let content = message.message.content;
    for (let block of content)
      if (block.type === "text") {
        if (block.text.trim())
          events.push({
            type: "assistant_text",
            text: truncateObserverText(block.text, MAX_DELIVERY_CHARS),
          });
      } else if (block.type === "tool_use")
        events.push({
          type: "tool_call",
          name: block.name,
          input: jsonTextOrFallback(block.input),
        });
    return events;
  }
  if (message.type === "user") {
    let content = message.message.content;
    if (Array.isArray(content)) {
      let events = [];
      for (let block of content)
        if (block.type === "tool_result")
          events.push({
            type: "tool_result",
            content: truncateObserverText(joinNonEmptyText(block.content) ?? ""),
          });
      if (events.length > 0) return events;
    }
    if (isReportedOrigin(message.origin, pairing)) return null;
    let text = joinNonEmptyText(content);
    if (!text) return null;
    let originKind = originKindOf(message.origin, message.isMeta);
    return [
      originKind === undefined
        ? {
            type: "user_message",
            text: truncateObserverText(text, MAX_TRIGGER_TEXT_CHARS),
            relay: isVerifiedSlackHuman(message),
          }
        : {
            type: "non_user_message",
            source: originKind,
            text: truncateObserverText(text),
          },
    ];
  }
  return null;
}
//@ chunk-ha3km179.js:33364-34422 placement
/**
 * 把附件转换为时间线事件（记忆加载、技能发现等）。
 */
function attachmentToTimelineEvents(attachment, pairing) {
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
      if (isReportedOrigin(taskNotificationOrigin, pairing)) return null;
      let text = joinNonEmptyText(attachment.prompt);
      if (!text) return null;
      let truncatedText = truncateObserverText(text, MAX_TRIGGER_TEXT_CHARS);
      let deliveredText = classifyNonUserMessageSource(truncatedText, taskNotificationOrigin, {
        verifiedSlackHumanTurn: attachment.verifiedSlackHumanTurn,
        isMeta: attachment.isMeta,
        hearthServerEnvelope: hasHearthRelay(attachment),
        hearthJoinedTextBlocks:
          Array.isArray(attachment.prompt) && count(attachment.prompt, (block) => block.type === "text") > 1,
        sendMessageToolAbsent: attachment.sendMessageToolAbsent,
      });
      let originKind = originKindOf(taskNotificationOrigin, attachment.isMeta);
      if (originKind !== undefined)
        return [
          {
            type: "non_user_message",
            source: originKind,
            text: deliveredText,
          },
        ];
      let relay = isVerifiedSlackHuman(attachment);
      return [
        {
          type: "user_message",
          text: relay ? deliveredText : truncatedText,
          relay,
        },
      ];
    }
    case "poll_events": {
      let flattened = attachment.envelopes.flatMap((envelope, index) => {
        switch (attachment.kinds[index]) {
          case REPL_EVAL:
            return [];
          case REPL_STATUS:
            return [];
          default: {
            let text = truncateObserverText(envelope, MAX_TRIGGER_TEXT_CHARS);
            return [
              attachment.provenance?.[index]?.authority === "human-principal"
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
//@ chunk-ha3km179.js:34422-34648 placement (2.1.88 match: extractErrorTypeFromData, 1)
function joinNonEmptyText(data) {
  if (typeof data === "string") return data.trim() ? data : undefined;
  if (Array.isArray(data)) {
    let filtered = data
      .map((block) =>
        block && typeof block === "object" && "type" in block && block.type === "text" ? block.text : "",
      )
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
function jsonTextOrFallback(value) {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return "[unserializable]";
  }
}
//@ chunk-ha3km179.js:34735-36630 placement
/**
 * 按编辑规则排除工具的结果（off/shadow 模式下不执行）。
 */
function applyToolExclusionEdit(
  messages,
  querySource,
  capabilities,
  toolUseState,
  anchorUuid,
  readFileState,
) {
  try {
    let mode = idleClearingMode();
    if (mode === "off" || mode === "shadow") return;
    let plan = planToolResultClearingAfterIdle(
      messages,
      querySource,
      capabilities,
      toolUseState,
      undefined,
      anchorUuid,
    );
    if (!plan) return;
    let excludedTools = new Set(plan.edit.exclude_tools);
    let toolUsesById = new Map();
    let answeredToolUses = [];
    let seenResults = new Set();
    let countByReply = new Map();
    let maxPerReply = 0;
    for (let message of messages) {
      if (
        (message.type !== "assistant" && message.type !== "user") ||
        isNonConversationMessage(message) ||
        !Array.isArray(message.message.content)
      )
        continue;
      let batchPrefixes =
        message.type === "assistant"
          ? (message.batchToolUses ?? []).map((batchToolUse) => `${batchToolUse.id}_`)
          : [];
      for (let block of message.message.content)
        if (message.type === "assistant" && block?.type === "tool_use" && typeof block.name === "string") {
          let toolName = canonicalToolName(block.name);
          if (
            !toolUsesById.has(block.id) &&
            !excludedTools.has(toolName) &&
            !batchPrefixes.some((prefix) => block.id.startsWith(prefix))
          )
            toolUsesById.set(block.id, {
              sentName: toolName,
              input: block.input,
              replyId: message.message.id,
            });
        } else if (block?.type === "tool_result") {
          let toolUse = toolUsesById.get(block.tool_use_id);
          if (toolUse && !seenResults.has(block.tool_use_id)) {
            seenResults.add(block.tool_use_id);
            answeredToolUses.push({
              ...toolUse,
              result: block,
            });
            let count = (countByReply.get(toolUse.replyId) ?? 0) + 1;
            countByReply.set(toolUse.replyId, count);
            maxPerReply = Math.max(maxPerReply, count);
          }
        }
    }
    let keep = plan.edit.keep.value;
    let trigger = plan.edit.trigger.value;
    let windowSpan = trigger + 1 - keep;
    let effectiveCount = answeredToolUses.length + Math.max(keep, maxPerReply);
    let fullWindows =
      effectiveCount > trigger ? 1 + Math.floor((effectiveCount - trigger - 1) / windowSpan) : 0;
    let max = Math.max(
      fullWindows * windowSpan,
      Math.min(plan.returnAfterIdle.toolUsesClearedSinceIdle, answeredToolUses.length - keep),
    );
    let clearedPaths = new Set();
    for (let { sentName, input, result } of answeredToolUses) {
      let counted = max > 0;
      let { content } = result;
      let resultBytes =
        typeof content === "string"
          ? content.length
          : Array.isArray(content)
            ? content.reduce(
                (acc, block) =>
                  block?.type === "text" && typeof block.text === "string" ? acc + block.text.length : acc,
                0,
              )
            : 0;
      if (counted && resultBytes >= SMALL_RESULT_BYTES) max--;
      if (result.is_error === true || typeof input !== "object" || !input) continue;
      if (
        (sentName === FILE_READ_TOOL_NAME || sentName === FILE_WRITE_TOOL_NAME) &&
        "file_path" in input &&
        typeof input.file_path === "string"
      ) {
        let readPath = expandPathOrNull(input.file_path);
        if (readPath === null) continue;
        if (
          sentName === FILE_WRITE_TOOL_NAME ||
          (!counted &&
            !("offset" in input) &&
            !("limit" in input) &&
            typeof content === "string" &&
            !isFileUnchangedStub(content))
        )
          clearedPaths.delete(readPath);
        else if (counted) clearedPaths.add(readPath);
      } else if (
        counted &&
        SHELL_TOOL_NAMES.includes(sentName) &&
        "command" in input &&
        typeof input.command === "string"
      )
        for (let read of extractReadOnlyFileReads(input.command)) {
          let expandedPath = expandPathOrNull(read.filePath);
          if (expandedPath !== null) clearedPaths.add(expandedPath);
        }
    }
    for (let path of clearedPaths) {
      let readState = readFileState.get(path);
      if (readState && !readState.contentNotInModelContext)
        readFileState.set(path, {
          ...readState,
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
