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
import { R5e } from "./complianceTaints.js";
import { getPolicyLimitsIneligibleReason, getLastFetchOutcome } from "./policyState.js";
import { POLICY_LIMITS_PATH } from "./index.js";

//@ chunk-4xpk3fhh.js:6642-6704 placement
var _ = " \xB7 web fetch, design sync and Channels wait for it";
//@ chunk-4xpk3fhh.js:6704-6800 placement
function S() {
  let e = getResponseFromCache();
  if (e === null) return "nothing";
  return e === R5e ? "unrestricted" : "stale_cache";
}
/**
 * 策略限制拉取状态：ineligible/pending/settled。
 */
//@ chunk-4xpk3fhh.js:6800-7061 placement
function getPolicyFetchStatus() {
  let e = getPolicyLimitsIneligibleReason();
  if (e !== void 0) return { state: "ineligible", reason: e };
  let n = getLastFetchOutcome(),
    r = getResponseFromCache() !== null,
    o = isClientOnlyEgressKeyWithheld("allow_web_fetch");
  if (n === null) return { state: "pending", hasCache: r, egressKeysWithheld: o };
  return { state: "settled", outcome: n, served: S(), egressKeysWithheld: o };
}
/**
 * 策略不适用原因的说明文字。
 */
//@ chunk-4xpk3fhh.js:7061-7598 placement
function describeIneligibleReason(e) {
  switch (e) {
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
/**
 * 拉取失败（鉴权、超时、网络等）的说明与修复建议。
 */
//@ chunk-4xpk3fhh.js:7598-9776 placement
function describeFetchFailure(e, n, r, o) {
  let s = o ? "" : " \xB7 Retried hourly while Claude Code runs; restart to retry now";
  switch (e) {
    case "auth_failed":
      if (n === 403)
        return `${r}, or a proxy in front of it, refused the request (HTTP 403) \xB7 Fix: if you use a web proxy make sure it allows ${r}; if your organization restricts by IP, check this machine is allowed${s}`;
      if (n === 401 && o)
        return `${r} rejected this session's sign-in (HTTP 401) while it was being refreshed \xB7 Claude Code is retrying with the refreshed sign-in`;
      return n
        ? `${r} rejected this session's credentials (HTTP ${n}) \xB7 Fix: sign in again or check the API key this session uses`
        : "Couldn't attach credentials to the request \xB7 Fix: sign in, set the API key this session should use, or check your workload-identity setup";
    case "timeout":
      return `${r} took too long to answer \xB7 Fix: check your network or proxy${s}`;
    case "network_error":
      return `Couldn't reach ${r} \xB7 Fix: check your network or proxy${s}`;
    case "parse_failed":
      return `The answer from ${r} couldn't be read, either because a proxy replaced it or because this version of Claude Code doesn't understand it \xB7 Fix: check your proxy settings, or update Claude Code${s}`;
    case "spurious_304":
      return `${r} confirmed a cached copy from a previous sign-in, which this session can't use${s}`;
    case "stale_tunnel_credential":
      return `The machine running claude ssh changed credentials while ${r} was answering, so that answer wasn't used${s}`;
    case "request_failed":
      if (n === 404)
        return `The request for ${POLICY_LIMITS_PATH} on ${r} got a 404, which usually means a proxy or gateway between you and the API isn't forwarding that path \xB7 Fix: ask your network admin to allow it${s}`;
      if (n === 304)
        return `A caching proxy between you and ${r} answered in place of the API (HTTP 304) \xB7 Fix: ask your network admin to stop caching ${POLICY_LIMITS_PATH}${s}`;
      if (n === 407)
        return `Your proxy asked for authentication before it would forward the request to ${r} (HTTP 407) \xB7 Fix: check your proxy credentials${s}`;
      return n
        ? `HTTP ${n} on the request to ${r}${s}`
        : `Couldn't complete the request to ${r}; if a proxy intercepts TLS, its certificate must be trusted (NODE_EXTRA_CA_CERTS) \xB7 Fix: check your network or proxy${s}`;
  }
}
/**
 * 根据状态生成说明：不适用时给原因；未完成时说明是否使用磁盘副本；完成时成功显示来源主机， 失败时按实际使用（陈旧缓存/不受限/阻止）组合失败原因与是否仍在重试。
 */
//@ chunk-4xpk3fhh.js:9776-10898 placement
function formatPolicyFetchStatus(e) {
  switch (e.state) {
    case "ineligible":
      return describeIneligibleReason(e.reason);
    case "pending":
      return e.hasCache
        ? `Using the copy on disk \xB7 not refreshed yet this session${e.egressKeysWithheld ? _ : ""}`
        : `Not loaded yet${e.egressKeysWithheld ? _ : ""} \xB7 if this persists, check your network or proxy`;
    case "settled": {
      let { outcome: outcome } = e;
      if (outcome.success) return `Loaded from ${outcome.host}`;
      let r = describeFetchFailure(outcome.errorCode, outcome.httpStatus, outcome.host, outcome.retrying),
        o = outcome.retrying ? " yet, still retrying" : "",
        s = e.egressKeysWithheld ? ", web fetch, design sync, Channels" : "";
      switch (e.served) {
        case "stale_cache":
          return `Couldn't refresh${o} \xB7 using the last copy on this machine${e.egressKeysWithheld ? _ : ""} \xB7 ${r}`;
        case "unrestricted":
          return e.egressKeysWithheld
            ? `Couldn't load${o} \xB7 no restrictions applied this session, except that web fetch, design sync and Channels stay off until it loads \xB7 ${r}`
            : `Couldn't load${o} \xB7 no restrictions applied this session \xB7 ${r}`;
        case "nothing":
          return `Couldn't load${o} \xB7 features that must check it first (Remote Control, cloud sessions, /feedback${s} and others) stay off, and some need a restart once it loads \xB7 ${r}`;
      }
    }
  }
}
/**
 * 拉取状态是否应显示为问题。
 */
//@ chunk-4xpk3fhh.js:10898-11081 placement
function isPolicyFetchProblem(e) {
  switch (e.state) {
    case "pending":
      return !1;
    case "settled":
      return !e.outcome.success;
    case "ineligible":
      return e.reason === "third_party_provider" || e.reason === "custom_base_url";
  }
}

export { S, getPolicyFetchStatus, isPolicyFetchProblem, formatPolicyFetchStatus };
