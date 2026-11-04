/**
 * services/policyLimits/policyFetchStatus.ts
 *
 * 2.1.316 新增：策略限制拉取状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4xpk3fhh.js (7)
 * attribution: placement 7
 */
import { getResponseFromCache, isClientOnlyEgressKeyWithheld } from "./policyEvidence.js";
import { EMPTY_POLICY_RESPONSE } from "./complianceTaints.js";
import { getPolicyLimitsIneligibleReason, getLastFetchOutcome } from "./policyState.js";
import { POLICY_LIMITS_PATH } from "./index.js";

//@ chunk-4xpk3fhh.js:6642-6704 placement
var _ = " \xB7 web fetch, design sync and Channels wait for it";
//@ chunk-4xpk3fhh.js:6704-6800 placement
/**
 * 策略缓存状态：无、未受限或旧缓存。
 */
function policyCacheStatus() {
  let responseFromCache = getResponseFromCache();
  if (responseFromCache === null) return "nothing";
  return responseFromCache === EMPTY_POLICY_RESPONSE ? "unrestricted" : "stale_cache";
}
//@ chunk-4xpk3fhh.js:6800-7061 placement
/**
 * 策略限制拉取状态：ineligible/pending/settled。
 */
function getPolicyFetchStatus() {
  let policyLimitsIneligibleReason = getPolicyLimitsIneligibleReason();
  if (policyLimitsIneligibleReason !== undefined)
    return {
      state: "ineligible",
      reason: policyLimitsIneligibleReason,
    };
  let lastFetchOutcome = getLastFetchOutcome();
  let hasCache = getResponseFromCache() !== null;
  let egressKeysWithheld = isClientOnlyEgressKeyWithheld("allow_web_fetch");
  if (lastFetchOutcome === null)
    return {
      state: "pending",
      hasCache,
      egressKeysWithheld,
    };
  return {
    state: "settled",
    outcome: lastFetchOutcome,
    served: policyCacheStatus(),
    egressKeysWithheld,
  };
}
//@ chunk-4xpk3fhh.js:7061-7598 placement
/**
 * 策略不适用原因的说明文字。
 */
function describeIneligibleReason(reason) {
  switch (reason) {
    case "third_party_provider":
      return "not fetched: this session doesn't connect to the Anthropic API directly (Bedrock, Vertex, Foundry, or a gateway)";
    case "custom_base_url":
      return "not fetched with a custom ANTHROPIC_BASE_URL";
    case "no_auth":
      return "not fetched: no API key or claude.ai sign-in for the policy lookup (apiKeyHelper keys are not used for it)";
    case "oauth_no_inference_scope":
      return "not fetched: this sign-in lacks the inference scope";
    case "prosumer_oauth":
      return "not applicable to Pro and Max accounts";
  }
}
//@ chunk-4xpk3fhh.js:7598-9776 placement
/**
 * 拉取失败（鉴权、超时、网络等）的说明与修复建议。
 */
function describeFetchFailure(errorCode, httpStatus, host, retrying) {
  let retryNote = retrying ? "" : " \xB7 Retried hourly while Claude Code runs; restart to retry now";
  switch (errorCode) {
    case "auth_failed":
      if (httpStatus === 403)
        return `${host}, or a proxy in front of it, refused the request (HTTP 403) \xB7 Fix: if you use a web proxy make sure it allows ${host}; if your organization restricts by IP, check this machine is allowed${retryNote}`;
      if (httpStatus === 401 && retrying)
        return `${host} rejected this session's sign-in (HTTP 401) while it was being refreshed \xB7 Claude Code is retrying with the refreshed sign-in`;
      return httpStatus
        ? `${host} rejected this session's credentials (HTTP ${httpStatus}) \xB7 Fix: sign in again or check the API key this session uses`
        : "Couldn't attach credentials to the request \xB7 Fix: sign in, set the API key this session should use, or check your workload-identity setup";
    case "timeout":
      return `${host} took too long to answer \xB7 Fix: check your network or proxy${retryNote}`;
    case "network_error":
      return `Couldn't reach ${host} \xB7 Fix: check your network or proxy${retryNote}`;
    case "parse_failed":
      return `The answer from ${host} couldn't be read, either because a proxy replaced it or because this version of Claude Code doesn't understand it \xB7 Fix: check your proxy settings, or update Claude Code${retryNote}`;
    case "spurious_304":
      return `${host} confirmed a cached copy from a previous sign-in, which this session can't use${retryNote}`;
    case "stale_tunnel_credential":
      return `The machine running claude ssh changed credentials while ${host} was answering, so that answer wasn't used${retryNote}`;
    case "request_failed":
      if (httpStatus === 404)
        return `The request for ${POLICY_LIMITS_PATH} on ${host} got a 404, which usually means a proxy or gateway between you and the API isn't forwarding that path \xB7 Fix: ask your network admin to allow it${retryNote}`;
      if (httpStatus === 304)
        return `A caching proxy between you and ${host} answered in place of the API (HTTP 304) \xB7 Fix: ask your network admin to stop caching ${POLICY_LIMITS_PATH}${retryNote}`;
      if (httpStatus === 407)
        return `Your proxy asked for authentication before it would forward the request to ${host} (HTTP 407) \xB7 Fix: check your proxy credentials${retryNote}`;
      return httpStatus
        ? `HTTP ${httpStatus} on the request to ${host}${retryNote}`
        : `Couldn't complete the request to ${host}; if a proxy intercepts TLS, its certificate must be trusted (NODE_EXTRA_CA_CERTS) \xB7 Fix: check your network or proxy${retryNote}`;
  }
}
//@ chunk-4xpk3fhh.js:9776-10898 placement
/**
 * 根据状态生成说明：不适用时给原因；未完成时说明是否使用磁盘副本；完成时成功显示来源主机， 失败时按实际使用（陈旧缓存/不受限/阻止）组合失败原因与是否仍在重试。
 */
function formatPolicyFetchStatus(policyFetchStatus) {
  switch (policyFetchStatus.state) {
    case "ineligible":
      return describeIneligibleReason(policyFetchStatus.reason);
    case "pending":
      return policyFetchStatus.hasCache
        ? `Using the copy on disk \xB7 not refreshed yet this session${policyFetchStatus.egressKeysWithheld ? _ : ""}`
        : `Not loaded yet${policyFetchStatus.egressKeysWithheld ? _ : ""} \xB7 if this persists, check your network or proxy`;
    case "settled": {
      let { outcome } = policyFetchStatus;
      if (outcome.success) return `Loaded from ${outcome.host}`;
      let failureText = describeFetchFailure(
        outcome.errorCode,
        outcome.httpStatus,
        outcome.host,
        outcome.retrying,
      );
      let retryingNote = outcome.retrying ? " yet, still retrying" : "";
      let withheldNote = policyFetchStatus.egressKeysWithheld ? ", web fetch, design sync, Channels" : "";
      switch (policyFetchStatus.served) {
        case "stale_cache":
          return `Couldn't refresh${retryingNote} \xB7 using the last copy on this machine${policyFetchStatus.egressKeysWithheld ? _ : ""} \xB7 ${failureText}`;
        case "unrestricted":
          return policyFetchStatus.egressKeysWithheld
            ? `Couldn't load${retryingNote} \xB7 no restrictions applied this session, except that web fetch, design sync and Channels stay off until it loads \xB7 ${failureText}`
            : `Couldn't load${retryingNote} \xB7 no restrictions applied this session \xB7 ${failureText}`;
        case "nothing":
          return `Couldn't load${retryingNote} \xB7 features that must check it first (Remote Control, cloud sessions, /feedback${withheldNote} and others) stay off, and some need a restart once it loads \xB7 ${failureText}`;
      }
    }
  }
}
//@ chunk-4xpk3fhh.js:10898-11081 placement
/**
 * 拉取状态是否应显示为问题。
 */
function isPolicyFetchProblem(policyFetchStatus) {
  switch (policyFetchStatus.state) {
    case "pending":
      return false;
    case "settled":
      return !policyFetchStatus.outcome.success;
    case "ineligible":
      return (
        policyFetchStatus.reason === "third_party_provider" || policyFetchStatus.reason === "custom_base_url"
      );
  }
}
export { policyCacheStatus, getPolicyFetchStatus, isPolicyFetchProblem, formatPolicyFetchStatus };
