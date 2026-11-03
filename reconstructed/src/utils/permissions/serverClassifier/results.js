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
import { wR, kMo, SMo, Iqt, jz, isFirstPartyEndpoint } from "./flags.js";
import { getRetryDelay } from "../../../services/api/withRetry.js";
import { logForDebugging } from "../../debug.js";
import { errorMessage, toError } from "../../errors.js";
import { CLASSIFIER_PARSE_FAILURE_REASON_STEM } from "../../../types/permissions.js";
import { isHostEntrypoint } from "../../entrypointKinds.js";
import { Ws } from "../../../services/api/streamFallbackWarning.js";
import { logForDiagnosticsNoPII } from "../../diagLogs.js";
import { logError } from "../../log.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { Ir, u, T, U, o, pe, oe, A } from "../../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../env.js";
import { MCP_TOOL_PREFIX } from "../../../services/mcp/mcpStringUtils.js";
import { countToolCallsSince_6 } from "./arbiter.js";
import { ETt, RTt } from "./context.js";
import { getAPIProvider } from "../../model/providers.js";

/**
 * 服务端连续无裁决时的处理：已记录则复用；同一轮内计数，达到上限返回 stop，否则按次数退避等待后返回 deny（被中止时标记 interrupted）。
 */
//@ chunk-e6aww6q8.js:1026138-1026800 placement
async function handleServerVerdictUnavailable(toolUseId, options) {
  let existing = getAutoModeUnavailableResponse(toolUseId);
  if (existing !== void 0)
    return existing.position >= wR
      ? { kind: "stop", position: existing.position, recorded: !1 }
      : { kind: "deny", position: existing.position, interrupted: !(await existing.waited) };
  let inARow = getAutoModeUnavailableResponsesInARow(options.runKey);
  if (options.signal.aborted) return { kind: "deny", position: inARow, interrupted: !0 };
  if (kMo && inARow >= wR) (clearAutoModeUnavailableResponses(options.runKey), (inARow = 0));
  let turn = options.turn ?? options.turnNow;
  if (turn !== void 0)
    (dropAutoModeUnavailableResponsesOfOtherTurns(options.runKey, turn),
      (inARow = getAutoModeUnavailableResponsesInARow(options.runKey)));
  let position = inARow + 1,
    S = options.turn !== void 0 && { turn: options.turn };
  if (position >= wR)
    return (
      noteAutoModeUnavailableResponse(toolUseId, {
        runKey: options.runKey,
        position: position,
        waited: Promise.resolve(!0),
        ...S,
      }),
      { kind: "stop", position: position, recorded: !0 }
    );
  let delayMs = bMo(position),
    waited = waitForUnavailableRetry(delayMs, position, options);
  return (
    noteAutoModeUnavailableResponse(toolUseId, {
      runKey: options.runKey,
      position: position,
      waited: waited,
      ...S,
    }),
    { kind: "deny", position: position, interrupted: !(await waited) }
  );
}
//@ chunk-e6aww6q8.js:1026800-1026835 placement
function eye(e) {
  if (getAutoModeUnavailableResponsesInARow(e) > 0) clearAutoModeUnavailableResponses(e);
}
//@ chunk-e6aww6q8.js:1026835-1026864 placement
function bMo(e) {
  return getRetryDelay(e);
}
/**
 * 等待服务端分类器重试退避：可被中止信号打断，期间通过 onWait 更新重试横幅。
 */
//@ chunk-e6aww6q8.js:1026864-1027237 placement
function waitForUnavailableRetry(
  e,
  n,
  { signal: signal, scheduleTimeout: scheduleTimeout = SMo, onWait: onWait },
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
  return new Promise((S) => {
    let w = () => {},
      L = (q) => {
        (w(), signal.removeEventListener("abort", G), y(null), S(q));
      },
      G = () => L(!1);
    (signal.addEventListener("abort", G, { once: !0 }),
      y({ position: n, limit: wR, delayMs: e }),
      (w = scheduleTimeout(() => L(!0), e)));
  });
}
/**
 * 判断原因码是否属于服务端不可用（含流结束、无法识别结果；严格模式下还包括无结果、不支持）。
 */
//@ chunk-e6aww6q8.js:1027237-1027562 placement
function isServerUnavailableReason(e, n) {
  if (e === void 0) return !1;
  if (e.startsWith("server_call_unavailable_")) return e !== "server_call_unavailable_truncated";
  return (
    e.startsWith("server_unavailable_") ||
    e === "server_stream_ended" ||
    e === "server_unrecognized_result" ||
    (!n && (e === "server_no_result" || e === "server_unsupported" || e === "server_thread_unsupported"))
  );
}
/**
 * 代理因服务端连续无安全裁决被停止时返回的说明文字。
 */
//@ chunk-e6aww6q8.js:1027562-1027865 placement
function buildAgentStoppedUnavailableMessage() {
  return `Auto mode is unavailable: the server returned no safety verdict for ${wR} responses in a row, so this agent was stopped before it finished. Nobody interrupted it; whatever it returned is partial. Retrying now will likely stop the same way \u2014 wait for the user's next message.`;
}
//@ chunk-e6aww6q8.js:1027865-1028092 placement
function buildTurnEndedUnavailableMessage(e) {
  return `Auto mode is unavailable: the server returned no safety verdict for ${wR} responses in a row, so ${e} was not run and this turn has ended. Wait for the user's next message before doing anything further.`;
}
/**
 * 给用户的"auto 模式不可用"提示，必要时说明请求经过的代理可能改写了响应。
 */
//@ chunk-e6aww6q8.js:1028092-1028409 placement
function buildUserUnavailableNotice(e) {
  let n = `Auto mode is unavailable \u2014 the server returned no safety verdict for the last ${wR} responses, so Claude stopped. Send a message to try again, or switch out of auto mode.`;
  return e === void 0
    ? n
    : `${n} Requests in this session go through ${e}; a proxy that alters responses could cause this.`;
}
//@ chunk-e6aww6q8.js:1028409-1028470 placement
function F3n(e) {
  let n = buildUserUnavailableNotice(void 0);
  return e.startsWith(n) ? n : e;
}
//@ chunk-e6aww6q8.js:1028470-1028736 placement
function buildClassifierParseFailureReason(e, n, r) {
  return `${`${CLASSIFIER_PARSE_FAILURE_REASON_STEM}${n === "policy_refusal" && r === "refusal" ? " \u2014 a safety check separate from auto mode blocked this request because of earlier conversation content \u2014 it isn't about the action itself" : ""}`} \u2014 run with --debug for details`;
}
/**
 * 宿主入口下按状态与原因去重，记录 auto 模式服务端检查的诊断事件。
 */
//@ chunk-e6aww6q8.js:1028736-1028996 placement
function logServerCheckDiagnostic(e) {
  try {
    if (
      !isHostEntrypoint() ||
      !Ws().once(`auto_mode_server_check:${e.state}:${"reason" in e ? e.reason : ""}`)
    )
      return;
    let n = Iqt();
    logForDiagnosticsNoPII(e.state === "no_verdict" ? "warn" : "info", "cli_api_auto_mode_server_check", {
      ...e,
      switch: n === null ? "unset" : n ? "on" : "off",
    });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:1028996-1029496 placement
var DANGEROUS_TOOL_USE = "dangerous_tool_use",
  TMo = DoctorLazy(() =>
    Ir("type", [
      u({
        type: T("evaluated"),
        outcome: U(["flagged", "not_flagged"]),
        explanation: o()
          .nullish()
          .transform((e) => e ?? void 0)
          .optional(),
      }),
      u({ type: T("skipped") }),
      u({ type: T("unavailable"), reason: o() }),
    ]),
  ),
  vMo = DoctorLazy(() =>
    Ir("type", [
      u({ type: T("available"), tool_uses: pe(o(), oe()) }),
      u({ type: T("unsupported") }),
      u({ type: T("unavailable"), reason: o() }),
    ]),
  ),
  EMo = DoctorLazy(() => A(u({ type: o() }).loose())),
  RMo = ["disabled", "error"],
  CMo = ["timeout", "error", "refused", "input_too_long", "truncated"];
//@ chunk-e6aww6q8.js:1029496-1029545 placement
function Hqt(e, n) {
  return e.includes(n) ? n : "other";
}
//@ chunk-e6aww6q8.js:1029545-1030412 placement
function parseServerClassifierResult(e) {
  let n = typeof e === "object" && e !== null ? e.safeguard_results : void 0;
  if (n === void 0 || n === null) return { kind: "none", why: "server_no_result" };
  let safeParse = EMo().safeParse(n);
  if (!safeParse.success) return { kind: "none", why: "server_unrecognized_result" };
  let filtered = safeParse.data.filter((y) => y.type === DANGEROUS_TOOL_USE);
  if (filtered.length === 0) return { kind: "none", why: "server_no_result" };
  if (filtered.length > 1) return { kind: "none", why: "server_unrecognized_result" };
  let safeParse_2 = vMo().safeParse(filtered[0].status);
  if (!safeParse_2.success) return { kind: "none", why: "server_unrecognized_result" };
  switch (safeParse_2.data.type) {
    case "unsupported":
      return { kind: "none", why: "server_unsupported" };
    case "unavailable":
      return { kind: "none", why: `server_unavailable_${Hqt(RMo, safeParse_2.data.reason)}` };
    case "available": {
      let y = new Map();
      for (let [S, w] of Object.entries(safeParse_2.data.tool_uses)) {
        let safeParse = TMo().safeParse(w);
        y.set(S, safeParse.success ? safeParse.data : { type: "unrecognized" });
      }
      return { kind: "per_call", statuses: y };
    }
  }
}
/**
 * 分类器结果对象（钩子、调用链、同批调用状态）。
 */
//@ chunk-e6aww6q8.js:1030412-1031435 placement
class ClassifierResult {
  key;
  sentArtifacts;
  sentThread;
  sentExactMcpAllowRules;
  sentJudgeOnlyTools;
  runKey;
  #e = !1;
  #t = void 0;
  #n = void 0;
  #o = void 0;
  #r = new Map();
  #i = () => {};
  #s;
  constructor(e, n, r, s, h, y) {
    ((this.key = e),
      (this.sentArtifacts = n),
      (this.sentThread = r),
      (this.sentExactMcpAllowRules = s),
      (this.sentJudgeOnlyTools = h),
      (this.runKey = y),
      (this.#s = new Promise((S) => {
        this.#i = S;
      })));
  }
  settle(e) {
    if (this.#n !== void 0) return !1;
    return ((this.#n = e), (this.#o = Date.now()), this.#i(e), !0);
  }
  results() {
    return this.#n !== void 0 ? Promise.resolve(this.#n) : this.#s;
  }
  noteRewriteCause(e) {
    if (e === "hook" || e === "tool_call_chain") this.#e = !0;
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
    this.#r.set(e, r === void 0 || n === void 0 ? void 0 : new Set([...r].filter((s) => n.has(s))));
  }
  isVoidedByAnotherCall(e) {
    for (let [n, r] of this.#r) if (r === void 0 || (n !== e && !r.has(e))) return !0;
    return !1;
  }
  toJSON() {
    return;
  }
}
//@ chunk-e6aww6q8.js:1031435-1031466 placement
var SERVER_CONTEXT_STALE = "server_context_stale";
//@ chunk-e6aww6q8.js:1031466-1031642 placement
function createServerClassifierResult(e, n = {}) {
  if (n.judgeOnlyTools === void 0) logServerCheckDiagnostic({ state: "requested" });
  return new ClassifierResult(
    e,
    n.artifacts,
    n.thread === !0,
    n.exactMcpAllowRules ?? Uqt,
    n.judgeOnlyTools,
    jz(n.agentId),
  );
}
//@ chunk-e6aww6q8.js:1031642-1031658 placement
var Uqt = new Set();
//@ chunk-e6aww6q8.js:1031658-1031812 placement
function getExactMcpAllowRules(e) {
  if (e.mcp_allow_rules_exact !== !0) return Uqt;
  return new Set(
    e.rules.allow.map((n) => n.rule).filter((n) => n.startsWith(MCP_TOOL_PREFIX) && !n.includes("(")),
  );
}
//@ chunk-e6aww6q8.js:1031812-1031860 placement
function vR(e) {
  return e instanceof ClassifierResult ? e : void 0;
}
//@ chunk-e6aww6q8.js:1031860-1031927 placement
function Gqt(e, n) {
  return vR(e)?.sentExactMcpAllowRules.has(n) === !0;
}
//@ chunk-e6aww6q8.js:1031927-1032116 placement
function wasSentForJudging(e, n, r) {
  if (e.sentJudgeOnlyTools === void 0) return !0;
  let found = n.message.content.find((h) => h.type === "tool_use" && h.id === r);
  return found?.type === "tool_use" && e.sentJudgeOnlyTools.has(found.name);
}
//@ chunk-e6aww6q8.js:1032116-1032245 placement
function hasHeldServerVerdict(e, n) {
  let r = vR(e.serverClassifierResults ?? e.serverClassifierReviewLeftBehind);
  return r !== void 0 && countToolCallsSince_6(e, n) && wasSentForJudging(r, e, n);
}
//@ chunk-e6aww6q8.js:1032245-1032325 placement
function JGe(e) {
  return { serverClassifierRequest: e.key, serverClassifierResults: e };
}
//@ chunk-e6aww6q8.js:1032325-1032484 placement
function settleServerClassifierResult(e, n, r) {
  let s = noteThreadUnsupported(e, parseServerClassifierResult(n));
  return (
    ETt(
      e.key,
      s.kind === "per_call" ? [...s.statuses].filter(([, h]) => h.type === "evaluated").map(([h]) => h) : [],
    ),
    recordServerVerdict(e, s, r)
  );
}
/**
 * 结算服务端分类结果：有已评估调用时清零连续无裁决计数；按结果记录诊断（无裁决、已裁决、只裁决了其他调用）。
 */
//@ chunk-e6aww6q8.js:1032484-1032921 placement
function recordServerVerdict(e, n, r) {
  let s = vR(e);
  if (s === void 0 || !s.settle(n)) return;
  let h = r === void 0 ? void 0 : [...r],
    y = n.kind === "per_call" && hasEvaluatedStatus(n.statuses, h);
  if (y) eye(s.runKey);
  if (e.sentJudgeOnlyTools !== void 0) return n;
  if (n.kind === "none") logServerCheckDiagnostic({ state: "no_verdict", reason: n.why });
  else if (y) logServerCheckDiagnostic({ state: "verdict" });
  else if (n.statuses.size > 0 && h !== void 0 && h.length > 0 && !h.some((S) => n.statuses.has(S)))
    logServerCheckDiagnostic({ state: "no_verdict", reason: "other_tool_use_ids" });
  return n;
}
/**
 * 带消息线程的请求被回答"不支持"时，标记会话之后不再带线程发送，并把原因改为 server_thread_unsupported。
 */
//@ chunk-e6aww6q8.js:1032921-1033275 placement
function noteThreadUnsupported(e, n) {
  if (e.sentThread && n.kind === "none" && n.why === "server_unsupported") {
    if (!isThreadsHeldForServerClassifier())
      (markThreadsHeldForServerClassifier(),
        logForDebugging(
          "[server-classifier] the API answered unsupported to a request sent on a message thread; this session sends its later requests without a thread so the server can classify them",
          { level: "warn" },
        ));
    return { kind: "none", why: "server_thread_unsupported" };
  }
  return n;
}
//@ chunk-e6aww6q8.js:1033275-1033426 placement
function hasEvaluatedStatus(e, n) {
  if (n === void 0) return [...e.values()].some((r) => r.type === "evaluated");
  for (let r of n) if (e.get(r)?.type === "evaluated") return !0;
  return !1;
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
function Xqt(e) {
  return recordServerVerdict(e, { kind: "none", why: "server_no_result" });
}
//@ chunk-e6aww6q8.js:1033630-1033712 placement
function rye(e) {
  (RTt(e.key), vR(e)?.settle({ kind: "none", why: "server_stream_ended" }));
}
//@ chunk-e6aww6q8.js:1033712-1033954 placement
function getClassifierProviderKind() {
  let e = getAPIProvider();
  switch (e) {
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
      return e;
  }
}

export {
  SERVER_CONTEXT_STALE,
  hasHeldServerVerdict,
  isServerClassifierUnsupported,
  isServerUnavailableReason,
  handleServerVerdictUnavailable,
  eye,
  Gqt,
  buildTurnEndedUnavailableMessage,
  buildAgentStoppedUnavailableMessage,
  F3n,
  getClassifierProviderKind,
  settleServerClassifierResult,
  rye,
  createServerClassifierResult,
  getExactMcpAllowRules,
  DANGEROUS_TOOL_USE,
  JGe,
  Xqt,
  buildClassifierParseFailureReason,
  Hqt,
  CMo,
  vR,
  wasSentForJudging,
  logServerCheckDiagnostic,
  buildUserUnavailableNotice,
};
