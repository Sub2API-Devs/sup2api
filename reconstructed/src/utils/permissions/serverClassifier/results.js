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
  u,
  literal,
  _enum,
  string,
  record,
  unknown,
  array,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../env.js";
import { MCP_TOOL_PREFIX } from "../../../services/mcp/mcpStringUtils.js";
import { countToolCallsSince_6 } from "./arbiter.js";
import { settleClassifierRequest, forgetClassifierRequest } from "./context.js";
import { getAPIProvider } from "../../model/providers.js";

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
  let S = options.turn !== undefined && {
    turn: options.turn,
  };
  if (position >= TIMER_MARGIN_MS) {
    noteAutoModeUnavailableResponse(toolUseId, {
      runKey: options.runKey,
      position,
      waited: Promise.resolve(true),
      ...S,
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
    ...S,
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
function clearUnavailableStreak(e) {
  if (getAutoModeUnavailableResponsesInARow(e) > 0) clearAutoModeUnavailableResponses(e);
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
  let y = (S) => {
    try {
      onWait?.(S);
    } catch (error) {
      logForDebugging(`[server-classifier] retry banner update failed: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  };
  return new Promise((resolve) => {
    let w = () => {};
    let L = (q) => {
      w();
      signal.removeEventListener("abort", G);
      y(null);
      resolve(q);
    };
    let G = () => L(false);
    signal.addEventListener("abort", G, {
      once: true,
    });
    y({
      position,
      limit: TIMER_MARGIN_MS,
      delayMs,
    });
    w = scheduleTimeout(() => L(true), delayMs);
  });
}
//@ chunk-e6aww6q8.js:1027237-1027562 placement
/**
 * 判断原因码是否属于服务端不可用（含流结束、无法识别结果；严格模式下还包括无结果、不支持）。
 */
function isServerUnavailableReason(e, n) {
  if (e === undefined) return false;
  if (e.startsWith("server_call_unavailable_")) return e !== "server_call_unavailable_truncated";
  return (
    e.startsWith("server_unavailable_") ||
    e === "server_stream_ended" ||
    e === "server_unrecognized_result" ||
    (!n && (e === "server_no_result" || e === "server_unsupported" || e === "server_thread_unsupported"))
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
function buildUserUnavailableNotice(e) {
  let n = `Auto mode is unavailable \u2014 the server returned no safety verdict for the last ${TIMER_MARGIN_MS} responses, so Claude stopped. Send a message to try again, or switch out of auto mode.`;
  return e === undefined
    ? n
    : `${n} Requests in this session go through ${e}; a proxy that alters responses could cause this.`;
}
//@ chunk-e6aww6q8.js:1028409-1028470 placement
/**
 * minimalUnavailableNotice：只保留最简不可用说明。
 */
function minimalUnavailableNotice(autoModeUnavailableStopNotice) {
  let userUnavailableNotice = buildUserUnavailableNotice(undefined);
  return autoModeUnavailableStopNotice.startsWith(userUnavailableNotice)
    ? userUnavailableNotice
    : autoModeUnavailableStopNotice;
}
//@ chunk-e6aww6q8.js:1028470-1028736 placement
function buildClassifierParseFailureReason(e, n, stopReason) {
  return `${`${CLASSIFIER_PARSE_FAILURE_REASON_STEM}${n === "policy_refusal" && stopReason === "refusal" ? " \u2014 a safety check separate from auto mode blocked this request because of earlier conversation content \u2014 it isn't about the action itself" : ""}`} \u2014 run with --debug for details`;
}
//@ chunk-e6aww6q8.js:1028736-1028996 placement
/**
 * 宿主入口下按状态与原因去重，记录 auto 模式服务端检查的诊断事件。
 */
function logServerCheckDiagnostic(e) {
  try {
    if (
      !isHostEntrypoint() ||
      !streamFallbackWarning().once(`auto_mode_server_check:${e.state}:${"reason" in e ? e.reason : ""}`)
    )
      return;
    let n = userServerClassifierSwitch();
    logForDiagnosticsNoPII(e.state === "no_verdict" ? "warn" : "info", "cli_api_auto_mode_server_check", {
      ...e,
      switch: n === null ? "unset" : n ? "on" : "off",
    });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:1028996-1029496 placement
/**
 * DANGEROUS_TOOL_USE：危险工具使用判定类型；dangerousToolUseVerdictSchema：危险工具使用判定 schema；dangerousToolUseToolListSchema：危险工具列表 schema（同一声明共 5 个绑定）。
 */
var DANGEROUS_TOOL_USE_2 = "dangerous_tool_use";
var DANGEROUS_TOOL_USE = DoctorLazy(() =>
  discriminatedUnion("type", [
    u({
      type: literal("evaluated"),
      outcome: _enum(["flagged", "not_flagged"]),
      explanation: string()
        .nullish()
        .transform((e) => e ?? undefined)
        .optional(),
    }),
    u({
      type: literal("skipped"),
    }),
    u({
      type: literal("unavailable"),
      reason: string(),
    }),
  ]),
);
var dangerousToolUseVerdictSchema = DoctorLazy(() =>
  discriminatedUnion("type", [
    u({
      type: literal("available"),
      tool_uses: record(string(), unknown()),
    }),
    u({
      type: literal("unsupported"),
    }),
    u({
      type: literal("unavailable"),
      reason: string(),
    }),
  ]),
);
var dangerousToolUseToolListSchema = DoctorLazy(() =>
  array(
    u({
      type: string(),
    }).loose(),
  ),
);
var dangerousToolUseUnsupportedSchema = ["disabled", "error"];
var dangerousToolUseCombinedSchema = ["timeout", "error", "refused", "input_too_long", "truncated"];
//@ chunk-e6aww6q8.js:1029496-1029545 placement
/**
 * knownValueOrOther：值在已知集合中则原样，否则 other。
 */
function knownValueOrOther(e, reason) {
  return e.includes(reason) ? reason : "other";
}
//@ chunk-e6aww6q8.js:1029545-1030412 placement
function parseServerClassifierResult(e) {
  let safeguardResults = typeof e === "object" && e !== null ? e.safeguard_results : undefined;
  if (safeguardResults === undefined || safeguardResults === null)
    return {
      kind: "none",
      why: "server_no_result",
    };
  let r = dangerousToolUseToolListSchema().safeParse(safeguardResults);
  if (!r.success)
    return {
      kind: "none",
      why: "server_unrecognized_result",
    };
  let filtered = r.data.filter((y) => y.type === DANGEROUS_TOOL_USE_2);
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
  let h = dangerousToolUseVerdictSchema().safeParse(filtered[0].status);
  if (!h.success)
    return {
      kind: "none",
      why: "server_unrecognized_result",
    };
  switch (h.data.type) {
    case "unsupported":
      return {
        kind: "none",
        why: "server_unsupported",
      };
    case "unavailable":
      return {
        kind: "none",
        why: `server_unavailable_${knownValueOrOther(dangerousToolUseUnsupportedSchema, h.data.reason)}`,
      };
    case "available": {
      let y = new Map();
      for (let [key, value] of Object.entries(h.data.tool_uses)) {
        let L = DANGEROUS_TOOL_USE().safeParse(value);
        y.set(
          key,
          L.success
            ? L.data
            : {
                type: "unrecognized",
              },
        );
      }
      return {
        kind: "per_call",
        statuses: y,
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
  settle(e) {
    if (this.#n !== undefined) return false;
    this.#n = e;
    this.#o = Date.now();
    this.#i(e);
    return true;
  }
  results() {
    return this.#n !== undefined ? Promise.resolve(this.#n) : this.#s;
  }
  noteRewriteCause(e) {
    if (e === "hook" || e === "tool_call_chain") this.#e = true;
    else if (e === "siblings_unknown" || e === "sibling_not_reviewed") this.#t ??= e;
  }
  siblingNoteCause() {
    return this.#e ? "sibling_changed" : (this.#t ?? "sibling_not_reviewed");
  }
  settledAt() {
    return this.#o;
  }
  noteRewrittenCall(e, n) {
    if (!this.#r.has(e)) {
      this.#r.set(e, n);
      return;
    }
    let r = this.#r.get(e);
    this.#r.set(e, r === undefined || n === undefined ? undefined : new Set([...r].filter((s) => n.has(s))));
  }
  isVoidedByAnotherCall(e) {
    for (let [n, r] of this.#r) if (r === undefined || (n !== e && !r.has(e))) return true;
    return false;
  }
  toJSON() {
    return;
  }
}
//@ chunk-e6aww6q8.js:1031435-1031466 placement
var SERVER_CONTEXT_STALE = "server_context_stale";
//@ chunk-e6aww6q8.js:1031466-1031642 placement
function createServerClassifierResult(key, n = {}) {
  if (n.judgeOnlyTools === undefined)
    logServerCheckDiagnostic({
      state: "requested",
    });
  return new ClassifierResult(
    key,
    n.artifacts,
    n.thread === true,
    n.exactMcpAllowRules ?? EMPTY_VERDICT_SET,
    n.judgeOnlyTools,
    agentIdOrMain(n.agentId),
  );
}
//@ chunk-e6aww6q8.js:1031642-1031658 placement
var EMPTY_VERDICT_SET = new Set();
//@ chunk-e6aww6q8.js:1031658-1031812 placement
function getExactMcpAllowRules(e) {
  if (e.mcp_allow_rules_exact !== true) return EMPTY_VERDICT_SET;
  return new Set(
    e.rules.allow.map((n) => n.rule).filter((n) => n.startsWith(MCP_TOOL_PREFIX) && !n.includes("(")),
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
function wasSentForJudging(e, n, r) {
  if (e.sentJudgeOnlyTools === undefined) return true;
  let found = n.message.content.find((h) => h.type === "tool_use" && h.id === r);
  return found?.type === "tool_use" && e.sentJudgeOnlyTools.has(found.name);
}
//@ chunk-e6aww6q8.js:1032116-1032245 placement
function hasHeldServerVerdict(assistantMessage, toolUseID) {
  let r = asClassifierResult(
    assistantMessage.serverClassifierResults ?? assistantMessage.serverClassifierReviewLeftBehind,
  );
  return (
    r !== undefined &&
    countToolCallsSince_6(assistantMessage, toolUseID) &&
    wasSentForJudging(r, assistantMessage, toolUseID)
  );
}
//@ chunk-e6aww6q8.js:1032245-1032325 placement
/**
 * classifierResultPayload：构造分类结果载荷。
 */
function classifierResultPayload(e) {
  return {
    serverClassifierRequest: e.key,
    serverClassifierResults: e,
  };
}
//@ chunk-e6aww6q8.js:1032325-1032484 placement
function settleServerClassifierResult(e, n, r) {
  let s = noteThreadUnsupported(e, parseServerClassifierResult(n));
  settleClassifierRequest(
    e.key,
    s.kind === "per_call" ? [...s.statuses].filter(([, h]) => h.type === "evaluated").map(([h]) => h) : [],
  );
  return recordServerVerdict(e, s, r);
}
//@ chunk-e6aww6q8.js:1032484-1032921 placement
/**
 * 结算服务端分类结果：有已评估调用时清零连续无裁决计数；按结果记录诊断（无裁决、已裁决、只裁决了其他调用）。
 */
function recordServerVerdict(e, n, r) {
  let s = asClassifierResult(e);
  if (s === undefined || !s.settle(n)) return;
  let h = r === undefined ? undefined : [...r];
  let y = n.kind === "per_call" && hasEvaluatedStatus(n.statuses, h);
  if (y) clearUnavailableStreak(s.runKey);
  if (e.sentJudgeOnlyTools !== undefined) return n;
  if (n.kind === "none")
    logServerCheckDiagnostic({
      state: "no_verdict",
      reason: n.why,
    });
  else if (y)
    logServerCheckDiagnostic({
      state: "verdict",
    });
  else if (n.statuses.size > 0 && h !== undefined && h.length > 0 && !h.some((S) => n.statuses.has(S)))
    logServerCheckDiagnostic({
      state: "no_verdict",
      reason: "other_tool_use_ids",
    });
  return n;
}
//@ chunk-e6aww6q8.js:1032921-1033275 placement
/**
 * 带消息线程的请求被回答"不支持"时，标记会话之后不再带线程发送，并把原因改为 server_thread_unsupported。
 */
function noteThreadUnsupported(e, serverClassifierResult) {
  if (
    e.sentThread &&
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
function hasEvaluatedStatus(statuses, n) {
  if (n === undefined) return [...statuses.values()].some((r) => r.type === "evaluated");
  for (let r of n) if (statuses.get(r)?.type === "evaluated") return true;
  return false;
}
//@ chunk-e6aww6q8.js:1033426-1033563 placement
function isServerClassifierUnsupported(e) {
  return (
    e.kind === "none" &&
    (e.why === "server_unsupported" ||
      e.why === "server_unavailable_disabled" ||
      e.why === "server_no_result")
  );
}
//@ chunk-e6aww6q8.js:1033563-1033630 placement
/**
 * settleServerNoResult：服务端无结果时结算。
 */
function settleServerNoResult(e) {
  return recordServerVerdict(e, {
    kind: "none",
    why: "server_no_result",
  });
}
//@ chunk-e6aww6q8.js:1033630-1033712 placement
/**
 * settleServerStreamEnded：服务端流结束时结算。
 */
function settleServerStreamEnded(e) {
  forgetClassifierRequest(e.key);
  asClassifierResult(e)?.settle({
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
  dangerousToolUseCombinedSchema,
  asClassifierResult,
  wasSentForJudging,
  logServerCheckDiagnostic,
  buildUserUnavailableNotice,
};
