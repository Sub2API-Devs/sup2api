/**
 * tools/WebFetchTool/urlProvenance.ts
 *
 * 2.1.316 新增：WebFetch URL 来源检查与批准
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AbortError as AbortError_2,
} from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { KeyedSemaphore } from "../../utils/keyedSemaphore.js";
import { REJECT_MESSAGE } from "../../utils/messages.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { isRecordableDenial } from "../../types/permissions.js";

//@ chunk-e6aww6q8.js:2157803-2158492 placement
var PROVENANCE_REQUIRED = "PROVENANCE_REQUIRED",
  Cir = 2048,
  Mir = {
    denied: "web_fetch_provenance_denied",
    timed_out: "web_fetch_provenance_timed_out",
    expired_in_line: "web_fetch_provenance_expired_in_line",
    quiet_spell: "web_fetch_provenance_quiet_spell",
    suppressed_mode: "web_fetch_provenance_suppressed_mode",
    suppressed_deny_rule: "web_fetch_provenance_suppressed_deny_rule",
    suppressed_url_too_long: "web_fetch_provenance_suppressed_url_too_long",
    no_prompt: "web_fetch_provenance_no_prompt",
    retry_denied: "web_fetch_provenance_retry_denied",
  },
  iin =
    "URL not in provenance set. web_fetch can only retrieve URLs that appeared in a user message or a prior web_fetch result. Ask the user to include the URL in a message first.";
/**
 * 构造 URL 来源检查不通过时的遥测安全错误（PROVENANCE_REQUIRED），附带按结果映射的状态码。
 */
//@ chunk-e6aww6q8.js:2158492-2158603 placement
function provenanceRequiredError(e, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    jsonStringify({ error_type: PROVENANCE_REQUIRED, source: "target", message: n ?? iin }),
    "web-fetch-ccr-proxy",
    Mir[e],
  );
}
/**
 * 每会话的 URL 来源审批状态：请求计数、串行队列、上次是否无人答复及时间、已批准的 URL 与源。
 */
//@ chunk-e6aww6q8.js:2158603-2158801 placement
class UrlProvenanceState {
  count = 0;
  line = new KeyedSemaphore();
  lastWentUnanswered = !1;
  unansweredAt;
  answeredAt = 0;
  approvedUrls = new Set();
  approvedOrigins = new Set();
  forgetApprovals() {
    (this.approvedUrls.clear(), this.approvedOrigins.clear());
  }
}
//@ chunk-e6aww6q8.js:2158801-2159584 placement
var describeUrlPermissionTimeout = "tengu_orderly_lantern",
  ain = 300000,
  Wir = 0.1,
  zir =
    "The permission request for this URL was not answered in time. Ask the user to approve the fetch or include the URL in a message, then try again.",
  qir =
    "The permission request for this URL was not answered in time and was withdrawn. Ask the user to include the URL in a message, or retry once they reply: a retry sends them a new permission request and waits for them again.",
  Kir =
    "The user did not answer an earlier permission request in time, so the request for this URL was not sent to them. Ask the user to include the URL in a message, or retry once they reply: a retry sends them a new permission request and waits for them again.",
  O8e = "Do not retry. Continue without this page and report the blocked URL in your findings.";
/**
 * 按来源审批结果（超时、因前一请求未答而未发出、被拒绝、其他）生成给模型的说明，提示不要重试、无法询问时跳过该页面并报告被拦的 URL。
 */
//@ chunk-e6aww6q8.js:2159584-2160150 placement
function provenanceDenialText(outcome, message, fallback) {
  switch (outcome) {
    case "timed_out":
      return `The permission request for this URL was not answered in time. ${O8e}`;
    case "expired_in_line":
    case "quiet_spell":
      return `The user did not answer an earlier permission request in time, so the request for this URL was not sent to them. ${O8e}`;
    case "denied":
      return message === void 0 || message === REJECT_MESSAGE
        ? `The user doesn't want to proceed with this tool use. ${O8e}`
        : message;
    default:
      return `${message ?? fallback ?? iin} Retries will fail. If you cannot ask the user (e.g. from a subagent), continue without this page and report the blocked URL in your findings.`;
  }
}
/**
 * WebFetch 的 URL 来源检查：判断是否需要用户批准。
 */
//@ chunk-e6aww6q8.js:2160150-2161476 placement
async function checkUrlProvenance(e) {
  let { env: env, denial: denial } = e,
    { line: line } = env.promptsUp,
    h = approvalMatch(env.promptsUp, denial.url),
    y = await suppressedAskReason(e);
  if (y) return { outcome: y };
  env.refuseIfLetGo();
  let S = getFeatureValue_CACHED_MAY_BE_STALE(describeUrlPermissionTimeout, !1) === !0,
    { unansweredAt: unansweredAt } = env.promptsUp;
  if (
    e.fromSubagent &&
    !env.signal.aborted &&
    unansweredAt !== void 0 &&
    env.personWroteAt() < unansweredAt &&
    performance.now() - unansweredAt < (e.promptTimeoutMs ?? ain) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_hushed_plover", !0)
  )
    return {
      outcome: "quiet_spell",
      wait: {
        upAtRaise: env.promptsUp.count,
        upAtEnd: env.promptsUp.count,
        queuedMs: 0,
        waitedMs: 0,
        fetchedBeforeAsking: !1,
        oneAtATime: S,
      },
    };
  let startTime = performance.now(),
    G = !1,
    q = !1;
  env.promptsUp.count++;
  let Z = { counted: !0, oneAtATime: S },
    Se;
  try {
    for (;;) {
      if (((G ||= S && line.wouldWait(PROVENANCE, 1)), S)) {
        let Ie = e.timing?.mark("approval");
        if (((Se = await line.acquire(PROVENANCE, 1, env.signal).finally(Ie)), !Se || env.signal.aborted))
          throw new AbortError_2();
      }
      if (!G) return await askUrlProvenanceApproval(e, Z, 0, !1);
      let ke = await suppressedAskReason(e);
      if (ke) return { outcome: ke };
      let rounded = Math.round(performance.now() - startTime),
        Ee = approvalMatch(env.promptsUp, denial.url);
      if (q || !((Ee.url && !h.url) || (Ee.origin && !h.origin)))
        return await askUrlProvenanceApproval(e, Z, rounded, q);
      ((q = !0), Se?.(), (Se = void 0));
      let Ae = denial;
      try {
        Ae = await e.refetch(denial.url);
      } catch (error) {
        if (error instanceof AbortError_2 || env.signal.aborted) throw error;
        if (Yir(error))
          return {
            outcome: "fetch_failed_without_prompt",
            error: error,
            wait: queueTimingFields(env.promptsUp, rounded),
          };
      }
      if (env.signal.aborted) throw new AbortError_2();
      if (!din(Ae))
        return {
          outcome: "served_without_prompt",
          refetched: Ae,
          wait: queueTimingFields(env.promptsUp, rounded),
        };
    }
  } finally {
    (lin(env.promptsUp, Z), Se?.());
  }
}
//@ chunk-e6aww6q8.js:2161476-2161573 placement
function lin(e, n) {
  if (!n.counted) return;
  if (((n.counted = !1), e.count--, e.count === 0)) e.forgetApprovals();
}
//@ chunk-e6aww6q8.js:2161573-2161594 placement
var PROVENANCE = "provenance";
/**
 * 判断是否不应弹出 URL 来源审批：bypass/dontAsk 模式或应避免权限提示、URL 过长、命中 deny 规则时返回相应原因。
 */
//@ chunk-e6aww6q8.js:2161594-2161940 placement
async function suppressedAskReason({ denial: denial, prompt: prompt, env: env }) {
  let permissions = env.permissions();
  if (
    permissions.mode === "bypassPermissions" ||
    permissions.mode === "dontAsk" ||
    permissions.shouldAvoidPermissionPrompts
  )
    return "suppressed_mode";
  if (Buffer.byteLength(denial.url, "utf8") > Cir) return "suppressed_url_too_long";
  if ((await env.precheck({ url: denial.url, prompt: prompt }))?.behavior === "deny")
    return "suppressed_deny_rule";
  return;
}
//@ chunk-e6aww6q8.js:2161940-2162063 placement
function queueTimingFields(e, n) {
  let r = e.count - 1;
  return { upAtRaise: r, upAtEnd: r, queuedMs: n, waitedMs: 0, fetchedBeforeAsking: !0, oneAtATime: !0 };
}
//@ chunk-e6aww6q8.js:2162063-2162144 placement
function D8e(e) {
  let parse = URL.parse(e);
  return parse?.protocol === "https:" ? parse.origin : void 0;
}
//@ chunk-e6aww6q8.js:2162144-2162253 placement
function approvalMatch(e, n) {
  let r = D8e(n);
  return { url: e.approvedUrls.has(n), origin: r !== void 0 && e.approvedOrigins.has(r) };
}
//@ chunk-e6aww6q8.js:2162253-2162343 placement
function Yir(e) {
  return (
    e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    e.errorClass?.startsWith("web_fetch_target_") === !0
  );
}
//@ chunk-e6aww6q8.js:2162343-2162596 placement
function addsAllowRules(e) {
  let n = e.decisionReason?.type === "permissionPromptTool" ? e.decisionReason.toolResult : void 0,
    r = isPlainObject_4(n) ? n.updatedPermissions : void 0;
  return (
    Array.isArray(r) &&
    r.some(
      (s) =>
        isPlainObject_4(s) && s.behavior === "allow" && (s.type === "addRules" || s.type === "replaceRules"),
    )
  );
}
//@ chunk-e6aww6q8.js:2162596-2162691 placement
function din(e) {
  return e !== null && typeof e === "object" && "type" in e && e.type === "provenance_denied";
}
/**
 * 请求用户批准抓取某个 URL，支持逐个或一次性批准，处理超时与过期。
 */
//@ chunk-e6aww6q8.js:2162691-2164631 placement
async function askUrlProvenanceApproval(e, n, r, s) {
  let { tool: tool, denial: denial, prompt: prompt, env: env } = e,
    L = e.promptTimeoutMs ?? ain,
    permissions = env.permissions(),
    q = {},
    Z = {
      behavior: "ask",
      message: `${tool.name} was denied by this session's URL provenance check. Approve to allow fetching this URL.`,
      suggestions: e.suggestions,
      provenancePromptLine: n.oneAtATime ? "one_at_a_time" : "all_at_once",
      ...q,
    },
    Se = env.promptsUp.count - 1,
    ke = env.promptsUp.lastWentUnanswered ? L - r : L;
  if (ke < L * Wir)
    return {
      outcome: "expired_in_line",
      wait: {
        upAtRaise: Se,
        upAtEnd: Se,
        queuedMs: r,
        waitedMs: 0,
        fetchedBeforeAsking: s,
        oneAtATime: n.oneAtATime,
      },
    };
  env.promptsUp.lastWentUnanswered = !1;
  let we = env.withdrawsUnansweredAsk ? new AbortController() : void 0,
    startTime = performance.now(),
    ask = env.ask(
      { url: denial.url, prompt: prompt },
      { toolUseId: randomUUID_25(), forceDecision: Z, withdraw: we?.signal },
    ),
    Ie,
    promise = new Promise((ze) => {
      ((Ie = setTimeout((lt) => lt({ type: "timed_out" }), ke, ze)), Ie.unref?.());
    }),
    We = e.timing?.mark("approval");
  try {
    let winner = await Promise.race([ask.then((Je) => ({ type: "decision", decision: Je })), promise]);
    if (winner.type === "decision" && winner.decision.behavior === "deny") env.promptsUp.forgetApprovals();
    if (
      winner.type === "decision" &&
      (winner.decision.behavior === "allow" || isRecordableDenial(winner.decision, Z))
    )
      ((env.promptsUp.unansweredAt = void 0), (env.promptsUp.answeredAt = performance.now()));
    if (env.signal.aborted) throw new AbortError_2();
    let lt = {
      upAtRaise: Se,
      upAtEnd: env.promptsUp.count - 1,
      queuedMs: r,
      waitedMs: Math.round(performance.now() - startTime),
      fetchedBeforeAsking: s,
      oneAtATime: n.oneAtATime,
    };
    if (winner.type === "timed_out") {
      if (
        ((env.promptsUp.lastWentUnanswered = !0),
        Math.max(env.promptsUp.answeredAt, env.personWroteAt()) < startTime)
      )
        env.promptsUp.unansweredAt = performance.now();
      return (ask.catch(() => {}), we?.abort(), { outcome: "timed_out", wait: lt });
    }
    if (winner.decision.behavior === "allow") {
      env.promptsUp.approvedUrls.add(denial.url);
      let Je = D8e(denial.url);
      if (Je !== void 0 && addsAllowRules(winner.decision)) env.promptsUp.approvedOrigins.add(Je);
      return { outcome: "approved", wait: lt };
    }
    return {
      outcome: isRecordableDenial(winner.decision, Z) ? "denied" : "no_prompt",
      denialMessage: winner.decision.message || void 0,
      wait: lt,
    };
  } finally {
    (We?.(), lin(env.promptsUp, n), clearTimeout(Ie));
  }
}
/**
 * 记录 URL 来源检查的结果。
 */
//@ chunk-e6aww6q8.js:2164631-2165666 placement
async function logUrlProvenanceOutcome(e) {
  let n = await checkUrlProvenance(e);
  if (n.outcome === "served_without_prompt") return (e.onOutcome?.(n.outcome, n.wait), n.refetched);
  if (n.outcome === "fetch_failed_without_prompt") throw (e.onOutcome?.(n.outcome, n.wait), n.error);
  if (n.outcome !== "approved") {
    if ((e.onOutcome?.(n.outcome, n.wait), e.fromSubagent))
      throw provenanceRequiredError(
        n.outcome,
        provenanceDenialText(n.outcome, n.denialMessage, e.denial.errorMessage),
      );
    if (n.outcome === "expired_in_line") throw provenanceRequiredError("expired_in_line", Kir);
    throw n.outcome === "timed_out"
      ? provenanceRequiredError("timed_out", e.env.withdrawsUnansweredAsk ? qir : zir)
      : provenanceRequiredError(n.outcome, n.denialMessage ?? e.denial.errorMessage);
  }
  let r;
  try {
    r = await e.refetch(e.denial.url);
  } catch (error) {
    if (error instanceof AbortError_2 || e.env.signal.aborted) throw error;
    throw (e.onOutcome?.("retry_failed", n.wait), error);
  }
  if (din(r)) {
    let s = D8e(e.denial.url);
    if ((e.env.promptsUp.approvedUrls.delete(e.denial.url), s !== void 0))
      e.env.promptsUp.approvedOrigins.delete(s);
    throw (
      e.onOutcome?.("retry_denied", n.wait),
      provenanceRequiredError(
        "retry_denied",
        e.fromSubagent ? provenanceDenialText("retry_denied", void 0, r.errorMessage) : r.errorMessage,
      )
    );
  }
  return (e.onOutcome?.("approved", n.wait), r);
}

export { PROVENANCE_REQUIRED, UrlProvenanceState, provenanceRequiredError, logUrlProvenanceOutcome };
