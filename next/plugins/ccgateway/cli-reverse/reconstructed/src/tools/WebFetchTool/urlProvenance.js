/**
 * tools/WebFetchTool/urlProvenance.ts
 *
 * 2.1.316 新增：WebFetch URL 来源检查与批准
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AbortError as AbortError_2,
} from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { KeyedSemaphore } from "../../utils/keyedSemaphore.js";
import { REJECT_MESSAGE } from "../../utils/messages.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { isRecordableDenial } from "../../types/permissions.js";

//@ chunk-5xgkngpb.js:2211232-2211921 placement
/**
 * 记入拒绝记录的 URL 长度上限（2048）。
 */
var PROVENANCE_REQUIRED = "PROVENANCE_REQUIRED";
var MAX_DENIAL_URL_CHARS = 2048;
var PROVENANCE_OUTCOME_EVENTS = {
  denied: "web_fetch_provenance_denied",
  timed_out: "web_fetch_provenance_timed_out",
  expired_in_line: "web_fetch_provenance_expired_in_line",
  quiet_spell: "web_fetch_provenance_quiet_spell",
  suppressed_mode: "web_fetch_provenance_suppressed_mode",
  suppressed_deny_rule: "web_fetch_provenance_suppressed_deny_rule",
  suppressed_url_too_long: "web_fetch_provenance_suppressed_url_too_long",
  no_prompt: "web_fetch_provenance_no_prompt",
  retry_denied: "web_fetch_provenance_retry_denied",
};
var PROVENANCE_REQUIRED_MESSAGE =
  "URL not in provenance set. web_fetch can only retrieve URLs that appeared in a user message or a prior web_fetch result. Ask the user to include the URL in a message first.";
//@ chunk-5xgkngpb.js:2211921-2212032 placement
/**
 * 构造 URL 来源检查不通过时的遥测安全错误（PROVENANCE_REQUIRED），附带按结果映射的状态码。
 */
function provenanceRequiredError(outcome, message) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    jsonStringify({
      error_type: PROVENANCE_REQUIRED,
      source: "target",
      message: message ?? PROVENANCE_REQUIRED_MESSAGE,
    }),
    "web-fetch-ccr-proxy",
    PROVENANCE_OUTCOME_EVENTS[outcome],
  );
}
//@ chunk-5xgkngpb.js:2212032-2212230 placement
/**
 * 每会话的 URL 来源审批状态：请求计数、串行队列、上次是否无人答复及时间、已批准的 URL 与源。
 */
class UrlProvenanceState {
  count = 0;
  line = new KeyedSemaphore();
  lastWentUnanswered = false;
  unansweredAt;
  answeredAt = 0;
  approvedUrls = new Set();
  approvedOrigins = new Set();
  forgetApprovals() {
    this.approvedUrls.clear();
    this.approvedOrigins.clear();
  }
}
//@ chunk-5xgkngpb.js:2212230-2213013 placement
/**
 * URL 权限等待的超时常量组：Dir 是特性开关名 tengu_orderly_lantern；ain 等待答复 300000 ms；Wir 提示升级占预算的比例 0.1；zir/qir/Kir 是超时、撤回、过期三种文案；O8e 是要求模型不要重试的提示。
 */
var URL_PERMISSION_TIMEOUT_FLAG = "tengu_orderly_lantern";
var URL_PROMPT_TIMEOUT_MS = 300000;
var PROMPT_UP_BUDGET_RATIO = 0.1;
var URL_TIMEOUT_MESSAGE =
  "The permission request for this URL was not answered in time. Ask the user to approve the fetch or include the URL in a message, then try again.";
var URL_TIMEOUT_WITHDRAWN_MESSAGE =
  "The permission request for this URL was not answered in time and was withdrawn. Ask the user to include the URL in a message, or retry once they reply: a retry sends them a new permission request and waits for them again.";
var URL_EXPIRED_MESSAGE =
  "The user did not answer an earlier permission request in time, so the request for this URL was not sent to them. Ask the user to include the URL in a message, or retry once they reply: a retry sends them a new permission request and waits for them again.";
var PROVENANCE_RETRY_HINT =
  "Do not retry. Continue without this page and report the blocked URL in your findings.";
//@ chunk-5xgkngpb.js:2213013-2213579 placement
/**
 * 按来源审批结果（超时、因前一请求未答而未发出、被拒绝、其他）生成给模型的说明，提示不要重试、无法询问时跳过该页面并报告被拦的 URL。
 */
function provenanceDenialText(outcome, message, fallback) {
  switch (outcome) {
    case "timed_out":
      return `The permission request for this URL was not answered in time. ${PROVENANCE_RETRY_HINT}`;
    case "expired_in_line":
    case "quiet_spell":
      return `The user did not answer an earlier permission request in time, so the request for this URL was not sent to them. ${PROVENANCE_RETRY_HINT}`;
    case "denied":
      return message === undefined || message === REJECT_MESSAGE
        ? `The user doesn't want to proceed with this tool use. ${PROVENANCE_RETRY_HINT}`
        : message;
    default:
      return `${message ?? fallback ?? PROVENANCE_REQUIRED_MESSAGE} Retries will fail. If you cannot ask the user (e.g. from a subagent), continue without this page and report the blocked URL in your findings.`;
  }
}
//@ chunk-5xgkngpb.js:2213579-2214909 placement
/**
 * WebFetch 的 URL 来源检查：判断是否需要用户批准。
 */
async function checkUrlProvenance(request) {
  let { env, denial } = request;
  let { line } = env.promptsUp;
  let priorMatch = approvalMatch(env.promptsUp, denial.url);
  let suppressedReason = await suppressedAskReason(request);
  if (suppressedReason)
    return {
      outcome: suppressedReason,
    };
  env.refuseIfLetGo();
  let oneAtATime = getFeatureValue_CACHED_MAY_BE_STALE(URL_PERMISSION_TIMEOUT_FLAG, false) === true;
  let { unansweredAt } = env.promptsUp;
  if (
    request.fromSubagent &&
    !env.signal.aborted &&
    unansweredAt !== undefined &&
    env.personWroteAt() < unansweredAt &&
    performance.now() - unansweredAt < (request.promptTimeoutMs ?? URL_PROMPT_TIMEOUT_MS) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_hushed_plover", true)
  )
    return {
      outcome: "quiet_spell",
      wait: {
        upAtRaise: env.promptsUp.count,
        upAtEnd: env.promptsUp.count,
        queuedMs: 0,
        waitedMs: 0,
        fetchedBeforeAsking: false,
        oneAtATime,
      },
    };
  let startTime = performance.now();
  let waitedInLine = false;
  let fetchedBeforeAsking = false;
  env.promptsUp.count++;
  let budgetTicket = {
    counted: true,
    oneAtATime,
  };
  let releaseSlot;
  try {
    for (;;) {
      waitedInLine ||= oneAtATime && line.wouldWait(PROVENANCE, 1);
      if (oneAtATime) {
        let markApproval = request.timing?.mark("approval");
        releaseSlot = await line.acquire(PROVENANCE, 1, env.signal).finally(markApproval);
        if (!releaseSlot || env.signal.aborted) throw new AbortError_2();
      }
      if (!waitedInLine) return await askUrlProvenanceApproval(request, budgetTicket, 0, false);
      let suppressedReason = await suppressedAskReason(request);
      if (suppressedReason)
        return {
          outcome: suppressedReason,
        };
      let rounded = Math.round(performance.now() - startTime);
      let currentMatch = approvalMatch(env.promptsUp, denial.url);
      if (
        fetchedBeforeAsking ||
        !((currentMatch.url && !priorMatch.url) || (currentMatch.origin && !priorMatch.origin))
      )
        return await askUrlProvenanceApproval(request, budgetTicket, rounded, fetchedBeforeAsking);
      fetchedBeforeAsking = true;
      releaseSlot?.();
      releaseSlot = undefined;
      let refetched = denial;
      try {
        refetched = await request.refetch(denial.url);
      } catch (error) {
        if (error instanceof AbortError_2 || env.signal.aborted) throw error;
        if (isTargetProvenanceError(error))
          return {
            outcome: "fetch_failed_without_prompt",
            error,
            wait: queueTimingFields(env.promptsUp, rounded),
          };
      }
      if (env.signal.aborted) throw new AbortError_2();
      if (!isProvenanceDenied(refetched))
        return {
          outcome: "served_without_prompt",
          refetched,
          wait: queueTimingFields(env.promptsUp, rounded),
        };
    }
  } finally {
    releasePromptBudget(env.promptsUp, budgetTicket);
    releaseSlot?.();
  }
}
//@ chunk-5xgkngpb.js:2214909-2215006 placement
/**
 * 释放一次权限请求占用的预算，计数归零时清空已批准记录。
 */
function releasePromptBudget(promptsUp, ticket) {
  if (!ticket.counted) return;
  ticket.counted = false;
  promptsUp.count--;
  if (promptsUp.count === 0) promptsUp.forgetApprovals();
}
//@ chunk-5xgkngpb.js:2215006-2215027 placement
var PROVENANCE = "provenance";
//@ chunk-5xgkngpb.js:2215027-2215373 placement
/**
 * 判断是否不应弹出 URL 来源审批：bypass/dontAsk 模式或应避免权限提示、URL 过长、命中 deny 规则时返回相应原因。
 */
async function suppressedAskReason({ denial, prompt, env }) {
  let permissionState = env.permissions();
  if (
    permissionState.mode === "bypassPermissions" ||
    permissionState.mode === "dontAsk" ||
    permissionState.shouldAvoidPermissionPrompts
  )
    return "suppressed_mode";
  if (Buffer.byteLength(denial.url, "utf8") > MAX_DENIAL_URL_CHARS) return "suppressed_url_too_long";
  if (
    (
      await env.precheck({
        url: denial.url,
        prompt,
      })
    )?.behavior === "deny"
  )
    return "suppressed_deny_rule";
  return;
}
//@ chunk-5xgkngpb.js:2215373-2215496 placement
function queueTimingFields(promptsUp, queuedMs) {
  let upCount = promptsUp.count - 1;
  return {
    upAtRaise: upCount,
    upAtEnd: upCount,
    queuedMs,
    waitedMs: 0,
    fetchedBeforeAsking: true,
    oneAtATime: true,
  };
}
//@ chunk-5xgkngpb.js:2215496-2215577 placement
/**
 * 取出 URL 的 https origin。
 */
function httpsOriginOf(url) {
  let parsedUrl = URL.parse(url);
  return parsedUrl?.protocol === "https:" ? parsedUrl.origin : undefined;
}
//@ chunk-5xgkngpb.js:2215577-2215686 placement
function approvalMatch(promptsUp, url) {
  let origin = httpsOriginOf(url);
  return {
    url: promptsUp.approvedUrls.has(url),
    origin: origin !== undefined && promptsUp.approvedOrigins.has(origin),
  };
}
//@ chunk-5xgkngpb.js:2215686-2215776 placement
/**
 * 判断错误是否为“抓取目标”类的遥测安全错误。
 */
function isTargetProvenanceError(error) {
  return (
    error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    error.errorClass?.startsWith("web_fetch_target_") === true
  );
}
//@ chunk-5xgkngpb.js:2215776-2216029 placement
function addsAllowRules(decision) {
  let toolResult =
    decision.decisionReason?.type === "permissionPromptTool" ? decision.decisionReason.toolResult : undefined;
  let updatedPermissions = isPlainObject_6(toolResult) ? toolResult.updatedPermissions : undefined;
  return (
    Array.isArray(updatedPermissions) &&
    updatedPermissions.some(
      (updatedPermission) =>
        isPlainObject_6(updatedPermission) &&
        updatedPermission.behavior === "allow" &&
        (updatedPermission.type === "addRules" || updatedPermission.type === "replaceRules"),
    )
  );
}
//@ chunk-5xgkngpb.js:2216029-2216124 placement
/**
 * 判断结果是否为来源被拒。
 */
function isProvenanceDenied(response) {
  return (
    response !== null &&
    typeof response === "object" &&
    "type" in response &&
    response.type === "provenance_denied"
  );
}
//@ chunk-5xgkngpb.js:2216124-2218068 placement
/**
 * 请求用户批准抓取某个 URL，支持逐个或一次性批准，处理超时与过期。
 */
async function askUrlProvenanceApproval(request, ticket, queuedMs, fetchedBeforeAsking) {
  let { tool, denial, prompt, env } = request;
  let promptTimeoutMs = request.promptTimeoutMs ?? URL_PROMPT_TIMEOUT_MS;
  let permissionState = env.permissions();
  let extraFields = {};
  let forcedDecision = {
    behavior: "ask",
    message: `${tool.name} was denied by this session's URL provenance check. Approve to allow fetching this URL.`,
    suggestions: request.suggestions,
    provenancePromptLine: ticket.oneAtATime ? "one_at_a_time" : "all_at_once",
    ...extraFields,
  };
  let upCount = env.promptsUp.count - 1;
  let promptBudgetMs = env.promptsUp.lastWentUnanswered ? promptTimeoutMs - queuedMs : promptTimeoutMs;
  if (promptBudgetMs < promptTimeoutMs * PROMPT_UP_BUDGET_RATIO)
    return {
      outcome: "expired_in_line",
      wait: {
        upAtRaise: upCount,
        upAtEnd: upCount,
        queuedMs,
        waitedMs: 0,
        fetchedBeforeAsking,
        oneAtATime: ticket.oneAtATime,
      },
    };
  env.promptsUp.lastWentUnanswered = false;
  let withdrawController = env.withdrawsUnansweredAsk ? new AbortController() : undefined;
  let startTime = performance.now();
  let decisionPromise = env.ask(
    {
      url: denial.url,
      prompt,
    },
    {
      toolUseId: randomUUID(),
      forceDecision: forcedDecision,
      withdraw: withdrawController?.signal,
    },
  );
  let timeoutTimer;
  let promise = new Promise((resolve) => {
    timeoutTimer = setTimeout(
      (onTimeout) =>
        onTimeout({
          type: "timed_out",
        }),
      promptBudgetMs,
      resolve,
    );
    timeoutTimer.unref?.();
  });
  let markApproval = request.timing?.mark("approval");
  try {
    let winner = await Promise.race([
      decisionPromise.then((decision) => ({
        type: "decision",
        decision,
      })),
      promise,
    ]);
    if (winner.type === "decision" && winner.decision.behavior === "deny") env.promptsUp.forgetApprovals();
    if (
      winner.type === "decision" &&
      (winner.decision.behavior === "allow" || isRecordableDenial(winner.decision, forcedDecision))
    ) {
      env.promptsUp.unansweredAt = undefined;
      env.promptsUp.answeredAt = performance.now();
    }
    if (env.signal.aborted) throw new AbortError_2();
    let wait = {
      upAtRaise: upCount,
      upAtEnd: env.promptsUp.count - 1,
      queuedMs,
      waitedMs: Math.round(performance.now() - startTime),
      fetchedBeforeAsking,
      oneAtATime: ticket.oneAtATime,
    };
    if (winner.type === "timed_out") {
      env.promptsUp.lastWentUnanswered = true;
      if (Math.max(env.promptsUp.answeredAt, env.personWroteAt()) < startTime)
        env.promptsUp.unansweredAt = performance.now();
      decisionPromise.catch(() => {});
      withdrawController?.abort();
      return {
        outcome: "timed_out",
        wait,
      };
    }
    if (winner.decision.behavior === "allow") {
      env.promptsUp.approvedUrls.add(denial.url);
      let origin = httpsOriginOf(denial.url);
      if (origin !== undefined && addsAllowRules(winner.decision)) env.promptsUp.approvedOrigins.add(origin);
      return {
        outcome: "approved",
        wait,
      };
    }
    return {
      outcome: isRecordableDenial(winner.decision, forcedDecision) ? "denied" : "no_prompt",
      denialMessage: winner.decision.message || undefined,
      wait,
    };
  } finally {
    markApproval?.();
    releasePromptBudget(env.promptsUp, ticket);
    clearTimeout(timeoutTimer);
  }
}
//@ chunk-5xgkngpb.js:2218068-2219103 placement
/**
 * 记录 URL 来源检查的结果。
 */
async function logUrlProvenanceOutcome(request) {
  let checkResult = await checkUrlProvenance(request);
  if (checkResult.outcome === "served_without_prompt") {
    request.onOutcome?.(checkResult.outcome, checkResult.wait);
    return checkResult.refetched;
  }
  if (checkResult.outcome === "fetch_failed_without_prompt") {
    request.onOutcome?.(checkResult.outcome, checkResult.wait);
    throw checkResult.error;
  }
  if (checkResult.outcome !== "approved") {
    request.onOutcome?.(checkResult.outcome, checkResult.wait);
    if (request.fromSubagent)
      throw provenanceRequiredError(
        checkResult.outcome,
        provenanceDenialText(checkResult.outcome, checkResult.denialMessage, request.denial.errorMessage),
      );
    if (checkResult.outcome === "expired_in_line")
      throw provenanceRequiredError("expired_in_line", URL_EXPIRED_MESSAGE);
    throw checkResult.outcome === "timed_out"
      ? provenanceRequiredError(
          "timed_out",
          request.env.withdrawsUnansweredAsk ? URL_TIMEOUT_WITHDRAWN_MESSAGE : URL_TIMEOUT_MESSAGE,
        )
      : provenanceRequiredError(
          checkResult.outcome,
          checkResult.denialMessage ?? request.denial.errorMessage,
        );
  }
  let refetched;
  try {
    refetched = await request.refetch(request.denial.url);
  } catch (error) {
    if (error instanceof AbortError_2 || request.env.signal.aborted) throw error;
    request.onOutcome?.("retry_failed", checkResult.wait);
    throw error;
  }
  if (isProvenanceDenied(refetched)) {
    let origin = httpsOriginOf(request.denial.url);
    request.env.promptsUp.approvedUrls.delete(request.denial.url);
    if (origin !== undefined) request.env.promptsUp.approvedOrigins.delete(origin);
    request.onOutcome?.("retry_denied", checkResult.wait);
    throw provenanceRequiredError(
      "retry_denied",
      request.fromSubagent
        ? provenanceDenialText("retry_denied", undefined, refetched.errorMessage)
        : refetched.errorMessage,
    );
  }
  request.onOutcome?.("approved", checkResult.wait);
  return refetched;
}
export { PROVENANCE_REQUIRED, UrlProvenanceState, provenanceRequiredError, logUrlProvenanceOutcome };
