/**
 * utils/permissions/serverClassifier/results.ts
 *
 * 2.1.316 新增：分类器结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (32)
 * attribution: placement 32
 */
import {
  getAutoModeUnavailableResponse,
  getAutoModeUnavailableResponsesInARow,
  clearAutoModeUnavailableResponses,
  dropAutoModeUnavailableResponsesOfOtherTurns,
  noteAutoModeUnavailableResponse,
  isThreadsHeldForServerClassifier,
  markThreadsHeldForServerClassifier,
} from "../../../bootstrap/state.js";
import {
  TIMER_MARGIN_MS,
  ENABLE_CLASSIFIER_DEFAULT,
  setTimeoutWithCancel,
  userServerClassifierSwitch,
  agentIdOrMain,
  isFirstPartyEndpoint,
} from "./flags.js";
import { getRetryDelay } from "../../../services/api/withRetry.js";
import { logForDebugging } from "../../debug.js";
import { errorMessage, toError } from "../../errors.js";
import { CLASSIFIER_PARSE_FAILURE_REASON_STEM } from "../../../types/permissions.js";
import { isHostEntrypoint } from "../../entrypointKinds.js";
import { streamFallbackWarning } from "../../../services/api/streamFallbackWarning.js";
import { logForDiagnosticsNoPII } from "../../diagLogs.js";
import { logError } from "../../log.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  discriminatedUnion,
  objectSchema,
  literal,
  _enum,
  stringSchema,
  record,
  unknown,
  array,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../env.js";
import { MCP_TOOL_PREFIX } from "../../../services/mcp/mcpStringUtils.js";
import { countToolCallsSince_6 } from "./arbiter.js";
import { settleClassifierRequest, forgetClassifierRequest } from "./context.js";
import { getAPIProvider } from "../../model/providers.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1026138-1026800 placement
/**
 * 服务端连续无裁决时的处理：已记录则复用；同一轮内计数，达到上限返回 stop，否则按次数退避等待后返回 deny（被中止时标记 interrupted）。
 */
async function handleServerVerdictUnavailable(toolUseId, options) {
  let existing = getAutoModeUnavailableResponse(toolUseId);
  if (existing !== undefined)
    return existing.position >= TIMER_MARGIN_MS
      ? {
          kind: "stop",
          position: existing.position,
          recorded: false,
        }
      : {
          kind: "deny",
          position: existing.position,
          interrupted: !(await existing.waited),
        };
  let inARow = getAutoModeUnavailableResponsesInARow(options.runKey);
  if (options.signal.aborted)
    return {
      kind: "deny",
      position: inARow,
      interrupted: true,
    };
  if (ENABLE_CLASSIFIER_DEFAULT && inARow >= TIMER_MARGIN_MS) {
    clearAutoModeUnavailableResponses(options.runKey);
    inARow = 0;
  }
  let turn = options.turn ?? options.turnNow;
  if (turn !== undefined) {
    dropAutoModeUnavailableResponsesOfOtherTurns(options.runKey, turn);
    inARow = getAutoModeUnavailableResponsesInARow(options.runKey);
  }
  let position = inARow + 1;
  let turnFields = options.turn !== undefined && {
    turn: options.turn,
  };
  if (position >= TIMER_MARGIN_MS) {
    noteAutoModeUnavailableResponse(toolUseId, {
      runKey: options.runKey,
      position,
      waited: Promise.resolve(true),
      ...turnFields,
    });
    return {
      kind: "stop",
      position,
      recorded: true,
    };
  }
  let delayMs = retryDelayFor(position);
  let waited = waitForUnavailableRetry(delayMs, position, options);
  noteAutoModeUnavailableResponse(toolUseId, {
    runKey: options.runKey,
    position,
    waited,
    ...turnFields,
  });
  return {
    kind: "deny",
    position,
    interrupted: !(await waited),
  };
}
//@ chunk-e6aww6q8.js:1026800-1026835 placement
/**
 * clearUnavailableStreak：有连续不可用后清零。
 */
function clearUnavailableStreak(runKey) {
  if (getAutoModeUnavailableResponsesInARow(runKey) > 0) clearAutoModeUnavailableResponses(runKey);
}
//@ chunk-e6aww6q8.js:1026835-1026864 placement
function retryDelayFor(position) {
  return getRetryDelay(position);
}
//@ chunk-e6aww6q8.js:1026864-1027237 placement
/**
 * 等待服务端分类器重试退避：可被中止信号打断，期间通过 onWait 更新重试横幅。
 */
function waitForUnavailableRetry(
  delayMs,
  position,
  { signal, scheduleTimeout = setTimeoutWithCancel, onWait },
) {
  let reportWait = (status) => {
    try {
      onWait?.(status);
    } catch (error) {
      logForDebugging(`[server-classifier] retry banner update failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  };
  return new Promise((resolve) => {
    let cancelTimer = () => {};
    let finish = (retryNow) => {
      cancelTimer();
      signal.removeEventListener("abort", onAbort);
      reportWait(null);
      resolve(retryNow);
    };
    let onAbort = () => finish(false);
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
    reportWait({
      position,
      limit: TIMER_MARGIN_MS,
      delayMs,
    });
    cancelTimer = scheduleTimeout(() => finish(true), delayMs);
  });
}
//@ chunk-e6aww6q8.js:1027237-1027562 placement
/**
 * 判断原因码是否属于服务端不可用（含流结束、无法识别结果；严格模式下还包括无结果、不支持）。
 */
function isServerUnavailableReason(reason, isTruncated) {
  if (reason === undefined) return false;
  if (reason.startsWith("server_call_unavailable_")) return reason !== "server_call_unavailable_truncated";
  return (
    reason.startsWith("server_unavailable_") ||
    reason === "server_stream_ended" ||
    reason === "server_unrecognized_result" ||
    (!isTruncated &&
      (reason === "server_no_result" ||
        reason === "server_unsupported" ||
        reason === "server_thread_unsupported"))
  );
}
//@ chunk-e6aww6q8.js:1027562-1027865 placement
/**
 * 代理因服务端连续无安全裁决被停止时返回的说明文字。
 */
function buildAgentStoppedUnavailableMessage() {
  return `Auto mode is unavailable: the server returned no safety verdict for ${TIMER_MARGIN_MS} responses in a row, so this agent was stopped before it finished. Nobody interrupted it; whatever it returned is partial. Retrying now will likely stop the same way \u2014 wait for the user's next message.`;
}
//@ chunk-e6aww6q8.js:1027865-1028092 placement
function buildTurnEndedUnavailableMessage(name) {
  return `Auto mode is unavailable: the server returned no safety verdict for ${TIMER_MARGIN_MS} responses in a row, so ${name} was not run and this turn has ended. Wait for the user's next message before doing anything further.`;
}
//@ chunk-e6aww6q8.js:1028092-1028409 placement
/**
 * 给用户的"auto 模式不可用"提示，必要时说明请求经过的代理可能改写了响应。
 */
function buildUserUnavailableNotice(gatewayHost) {
  let baseMessage = `Auto mode is unavailable \u2014 the server returned no safety verdict for the last ${TIMER_MARGIN_MS} responses, so Claude stopped. Send a message to try again, or switch out of auto mode.`;
  return gatewayHost === undefined
    ? baseMessage
    : `${baseMessage} Requests in this session go through ${gatewayHost}; a proxy that alters responses could cause this.`;
}
//@ chunk-e6aww6q8.js:1028409-1028470 placement
/**
 * minimalUnavailableNotice：只保留最简不可用说明。
 */
function minimalUnavailableNotice(notice) {
  let userUnavailableNotice = buildUserUnavailableNotice(undefined);
  return notice.startsWith(userUnavailableNotice) ? userUnavailableNotice : notice;
}
//@ chunk-e6aww6q8.js:1028470-1028736 placement
function buildClassifierParseFailureReason(stem, failureReason, stopReason) {
  return `${`${CLASSIFIER_PARSE_FAILURE_REASON_STEM}${failureReason === "policy_refusal" && stopReason === "refusal" ? " \u2014 a safety check separate from auto mode blocked this request because of earlier conversation content \u2014 it isn't about the action itself" : ""}`} \u2014 run with --debug for details`;
}
//@ chunk-e6aww6q8.js:1028736-1028996 placement
/**
 * 宿主入口下按状态与原因去重，记录 auto 模式服务端检查的诊断事件。
 */
function logServerCheckDiagnostic(state) {
  try {
    if (
      !isHostEntrypoint() ||
      !streamFallbackWarning().once(
        `auto_mode_server_check:${state.state}:${"reason" in state ? state.reason : ""}`,
      )
    )
      return;
    let userSwitch = userServerClassifierSwitch();
    logForDiagnosticsNoPII(state.state === "no_verdict" ? "warn" : "info", "cli_api_auto_mode_server_check", {
      ...state,
      switch: userSwitch === null ? "unset" : userSwitch ? "on" : "off",
    });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:1028996-1029496 placement
/**
 * DANGEROUS_TOOL_USE：危险工具使用判定类型；dangerousToolUseVerdictSchema：危险工具使用判定 schema；dangerousToolUseToolListSchema：危险工具列表 schema（同一声明共 5 个绑定）。
 */
var DANGEROUS_TOOL_USE_2; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DANGEROUS_TOOL_USE;
var dangerousToolUseVerdictSchema;
var dangerousToolUseToolListSchema;
var DANGEROUS_TOOL_USE_UNSUPPORTED_REASONS;
var DANGEROUS_TOOL_USE_COMBINED_REASONS;
deferInit("chunk-e6aww6q8.js:1028996", () => {
  DANGEROUS_TOOL_USE_2 = "dangerous_tool_use";
  DANGEROUS_TOOL_USE = DoctorLazy(() =>
    discriminatedUnion("type", [
      objectSchema({
        type: literal("evaluated"),
        outcome: _enum(["flagged", "not_flagged"]),
        explanation: stringSchema()
          .nullish()
          .transform((explanation) => explanation ?? undefined)
          .optional(),
      }),
      objectSchema({
        type: literal("skipped"),
      }),
      objectSchema({
        type: literal("unavailable"),
        reason: stringSchema(),
      }),
    ]),
  );
  dangerousToolUseVerdictSchema = DoctorLazy(() =>
    discriminatedUnion("type", [
      objectSchema({
        type: literal("available"),
        tool_uses: record(stringSchema(), unknown()),
      }),
      objectSchema({
        type: literal("unsupported"),
      }),
      objectSchema({
        type: literal("unavailable"),
        reason: stringSchema(),
      }),
    ]),
  );
  dangerousToolUseToolListSchema = DoctorLazy(() =>
    array(
      objectSchema({
        type: stringSchema(),
      }).loose(),
    ),
  );
  DANGEROUS_TOOL_USE_UNSUPPORTED_REASONS = ["disabled", "error"];
  DANGEROUS_TOOL_USE_COMBINED_REASONS = ["timeout", "error", "refused", "input_too_long", "truncated"];
});
//@ chunk-e6aww6q8.js:1029496-1029545 placement
/**
 * knownValueOrOther：值在已知集合中则原样，否则 other。
 */
function knownValueOrOther(allowedReasons, reason) {
  return allowedReasons.includes(reason) ? reason : "other";
}
//@ chunk-e6aww6q8.js:1029545-1030412 placement
function parseServerClassifierResult(response) {
  let safeguardResults =
    typeof response === "object" && response !== null ? response.safeguard_results : undefined;
  if (safeguardResults === undefined || safeguardResults === null)
    return {
      kind: "none",
      why: "server_no_result",
    };
  let listResult = dangerousToolUseToolListSchema().safeParse(safeguardResults);
  if (!listResult.success)
    return {
      kind: "none",
      why: "server_unrecognized_result",
    };
  let filtered = listResult.data.filter((entry) => entry.type === DANGEROUS_TOOL_USE_2);
  if (filtered.length === 0)
    return {
      kind: "none",
      why: "server_no_result",
    };
  if (filtered.length > 1)
    return {
      kind: "none",
      why: "server_unrecognized_result",
    };
  let verdictResult = dangerousToolUseVerdictSchema().safeParse(filtered[0].status);
  if (!verdictResult.success)
    return {
      kind: "none",
      why: "server_unrecognized_result",
    };
  switch (verdictResult.data.type) {
    case "unsupported":
      return {
        kind: "none",
        why: "server_unsupported",
      };
    case "unavailable":
      return {
        kind: "none",
        why: `server_unavailable_${knownValueOrOther(DANGEROUS_TOOL_USE_UNSUPPORTED_REASONS, verdictResult.data.reason)}`,
      };
    case "available": {
      let statuses = new Map();
      for (let [key, value] of Object.entries(verdictResult.data.tool_uses)) {
        let parsedStatus = DANGEROUS_TOOL_USE().safeParse(value);
        statuses.set(
          key,
          parsedStatus.success
            ? parsedStatus.data
            : {
                type: "unrecognized",
              },
        );
      }
      return {
        kind: "per_call",
        statuses,
      };
    }
  }
}
//@ chunk-e6aww6q8.js:1030412-1031435 placement
/**
 * 分类器结果对象（钩子、调用链、同批调用状态）。
 */
class ClassifierResult {
  key;
  sentArtifacts;
  sentThread;
  sentExactMcpAllowRules;
  sentJudgeOnlyTools;
  runKey;
  #e = false;
  #t = undefined;
  #n = undefined;
  #o = undefined;
  #r = new Map();
  #i = () => {};
  #s;
  constructor(key, sentArtifacts, sentThread, sentExactMcpAllowRules, sentJudgeOnlyTools, runKey) {
    this.key = key;
    this.sentArtifacts = sentArtifacts;
    this.sentThread = sentThread;
    this.sentExactMcpAllowRules = sentExactMcpAllowRules;
    this.sentJudgeOnlyTools = sentJudgeOnlyTools;
    this.runKey = runKey;
    this.#s = new Promise((resolve) => {
      this.#i = resolve;
    });
  }
  settle(result) {
    if (this.#n !== undefined) return false;
    this.#n = result;
    this.#o = Date.now();
    this.#i(result);
    return true;
  }
  results() {
    return this.#n !== undefined ? Promise.resolve(this.#n) : this.#s;
  }
  noteRewriteCause(cause) {
    if (cause === "hook" || cause === "tool_call_chain") this.#e = true;
    else if (cause === "siblings_unknown" || cause === "sibling_not_reviewed") this.#t ??= cause;
  }
  siblingNoteCause() {
    return this.#e ? "sibling_changed" : (this.#t ?? "sibling_not_reviewed");
  }
  settledAt() {
    return this.#o;
  }
  noteRewrittenCall(toolUseId, callIds) {
    if (!this.#r.has(toolUseId)) {
      this.#r.set(toolUseId, callIds);
      return;
    }
    let previous = this.#r.get(toolUseId);
    this.#r.set(
      toolUseId,
      previous === undefined || callIds === undefined
        ? undefined
        : new Set([...previous].filter((id) => callIds.has(id))),
    );
  }
  isVoidedByAnotherCall(toolUseID) {
    for (let [rewrittenId, keptIds] of this.#r)
      if (keptIds === undefined || (rewrittenId !== toolUseID && !keptIds.has(toolUseID))) return true;
    return false;
  }
  toJSON() {
    return;
  }
}
//@ chunk-e6aww6q8.js:1031435-1031466 placement
var SERVER_CONTEXT_STALE = "server_context_stale";
//@ chunk-e6aww6q8.js:1031466-1031642 placement
function createServerClassifierResult(key, options = {}) {
  if (options.judgeOnlyTools === undefined)
    logServerCheckDiagnostic({
      state: "requested",
    });
  return new ClassifierResult(
    key,
    options.artifacts,
    options.thread === true,
    options.exactMcpAllowRules ?? EMPTY_VERDICT_SET,
    options.judgeOnlyTools,
    agentIdOrMain(options.agentId),
  );
}
//@ chunk-e6aww6q8.js:1031642-1031658 placement
var EMPTY_VERDICT_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1031642", () => {
  EMPTY_VERDICT_SET = new Set();
});
//@ chunk-e6aww6q8.js:1031658-1031812 placement
function getExactMcpAllowRules(context) {
  if (context.mcp_allow_rules_exact !== true) return EMPTY_VERDICT_SET;
  return new Set(
    context.rules.allow
      .map((entry) => entry.rule)
      .filter((rule) => rule.startsWith(MCP_TOOL_PREFIX) && !rule.includes("(")),
  );
}
//@ chunk-e6aww6q8.js:1031812-1031860 placement
/**
 * asClassifierResult：转成 ClassifierResult。
 */
function asClassifierResult(serverClassifierResults) {
  return serverClassifierResults instanceof ClassifierResult ? serverClassifierResults : undefined;
}
//@ chunk-e6aww6q8.js:1031860-1031927 placement
/**
 * sentExactMcpAllowRule：是否发送过该条精确 MCP allow 规则。
 */
function sentExactMcpAllowRule(serverClassifierResults, name) {
  return asClassifierResult(serverClassifierResults)?.sentExactMcpAllowRules.has(name) === true;
}
//@ chunk-e6aww6q8.js:1031927-1032116 placement
function wasSentForJudging(result, assistantMessage, toolUseID) {
  if (result.sentJudgeOnlyTools === undefined) return true;
  let found = assistantMessage.message.content.find(
    (block) => block.type === "tool_use" && block.id === toolUseID,
  );
  return found?.type === "tool_use" && result.sentJudgeOnlyTools.has(found.name);
}
//@ chunk-e6aww6q8.js:1032116-1032245 placement
function hasHeldServerVerdict(assistantMessage, toolUseID) {
  let classifierResult = asClassifierResult(
    assistantMessage.serverClassifierResults ?? assistantMessage.serverClassifierReviewLeftBehind,
  );
  return (
    classifierResult !== undefined &&
    countToolCallsSince_6(assistantMessage, toolUseID) &&
    wasSentForJudging(classifierResult, assistantMessage, toolUseID)
  );
}
//@ chunk-e6aww6q8.js:1032245-1032325 placement
/**
 * classifierResultPayload：构造分类结果载荷。
 */
function classifierResultPayload(result) {
  return {
    serverClassifierRequest: result.key,
    serverClassifierResults: result,
  };
}
//@ chunk-e6aww6q8.js:1032325-1032484 placement
function settleServerClassifierResult(message, response, callIds) {
  let result = noteThreadUnsupported(message, parseServerClassifierResult(response));
  settleClassifierRequest(
    message.key,
    result.kind === "per_call"
      ? [...result.statuses].filter(([, status]) => status.type === "evaluated").map(([callId]) => callId)
      : [],
  );
  return recordServerVerdict(message, result, callIds);
}
//@ chunk-e6aww6q8.js:1032484-1032921 placement
/**
 * 结算服务端分类结果：有已评估调用时清零连续无裁决计数；按结果记录诊断（无裁决、已裁决、只裁决了其他调用）。
 */
function recordServerVerdict(message, result, callIds) {
  let classified = asClassifierResult(message);
  if (classified === undefined || !classified.settle(result)) return;
  let judgedIds = callIds === undefined ? undefined : [...callIds];
  let hasVerdict = result.kind === "per_call" && hasEvaluatedStatus(result.statuses, judgedIds);
  if (hasVerdict) clearUnavailableStreak(classified.runKey);
  if (message.sentJudgeOnlyTools !== undefined) return result;
  if (result.kind === "none")
    logServerCheckDiagnostic({
      state: "no_verdict",
      reason: result.why,
    });
  else if (hasVerdict)
    logServerCheckDiagnostic({
      state: "verdict",
    });
  else if (
    result.statuses.size > 0 &&
    judgedIds !== undefined &&
    judgedIds.length > 0 &&
    !judgedIds.some((callId) => result.statuses.has(callId))
  )
    logServerCheckDiagnostic({
      state: "no_verdict",
      reason: "other_tool_use_ids",
    });
  return result;
}
//@ chunk-e6aww6q8.js:1032921-1033275 placement
/**
 * 带消息线程的请求被回答"不支持"时，标记会话之后不再带线程发送，并把原因改为 server_thread_unsupported。
 */
function noteThreadUnsupported(state, serverClassifierResult) {
  if (
    state.sentThread &&
    serverClassifierResult.kind === "none" &&
    serverClassifierResult.why === "server_unsupported"
  ) {
    if (!isThreadsHeldForServerClassifier()) {
      markThreadsHeldForServerClassifier();
      logForDebugging(
        "[server-classifier] the API answered unsupported to a request sent on a message thread; this session sends its later requests without a thread so the server can classify them",
        {
          level: "warn",
        },
      );
    }
    return {
      kind: "none",
      why: "server_thread_unsupported",
    };
  }
  return serverClassifierResult;
}
//@ chunk-e6aww6q8.js:1033275-1033426 placement
function hasEvaluatedStatus(statuses, toolUseIds) {
  if (toolUseIds === undefined) return [...statuses.values()].some((status) => status.type === "evaluated");
  for (let toolUseId of toolUseIds) if (statuses.get(toolUseId)?.type === "evaluated") return true;
  return false;
}
//@ chunk-e6aww6q8.js:1033426-1033563 placement
function isServerClassifierUnsupported(result) {
  return (
    result.kind === "none" &&
    (result.why === "server_unsupported" ||
      result.why === "server_unavailable_disabled" ||
      result.why === "server_no_result")
  );
}
//@ chunk-e6aww6q8.js:1033563-1033630 placement
/**
 * settleServerNoResult：服务端无结果时结算。
 */
function settleServerNoResult(request) {
  return recordServerVerdict(request, {
    kind: "none",
    why: "server_no_result",
  });
}
//@ chunk-e6aww6q8.js:1033630-1033712 placement
/**
 * settleServerStreamEnded：服务端流结束时结算。
 */
function settleServerStreamEnded(request) {
  forgetClassifierRequest(request.key);
  asClassifierResult(request)?.settle({
    kind: "none",
    why: "server_stream_ended",
  });
}
//@ chunk-e6aww6q8.js:1033712-1033954 placement
function getClassifierProviderKind() {
  let apiProvider = getAPIProvider();
  switch (apiProvider) {
    case "firstParty":
      return isFirstPartyEndpoint() ? "firstParty" : "thirdParty";
    case "bedrock":
    case "mantle":
    case "vertex":
    case "foundry":
    case "anthropicAws":
    case "anthropicGoogleCloud":
    case "gateway":
      return "thirdParty";
    default:
      return apiProvider;
  }
}
export {
  SERVER_CONTEXT_STALE,
  hasHeldServerVerdict,
  isServerClassifierUnsupported,
  isServerUnavailableReason,
  handleServerVerdictUnavailable,
  clearUnavailableStreak,
  sentExactMcpAllowRule,
  buildTurnEndedUnavailableMessage,
  buildAgentStoppedUnavailableMessage,
  minimalUnavailableNotice,
  getClassifierProviderKind,
  settleServerClassifierResult,
  settleServerStreamEnded,
  createServerClassifierResult,
  getExactMcpAllowRules,
  DANGEROUS_TOOL_USE_2,
  classifierResultPayload,
  settleServerNoResult,
  buildClassifierParseFailureReason,
  knownValueOrOther,
  DANGEROUS_TOOL_USE_COMBINED_REASONS,
  asClassifierResult,
  wasSentForJudging,
  logServerCheckDiagnostic,
  buildUserUnavailableNotice,
};
