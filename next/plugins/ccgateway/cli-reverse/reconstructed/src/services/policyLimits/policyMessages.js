/**
 * services/policyLimits/policyMessages.ts
 *
 * 2.1.316 新增：策略不可用原因（解析失败、网络错误、HTTP 状态）的详细提示；策略请求 404（代理未转发）时的提示等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bvz8t570.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hipaaTaintsOnly } from "./complianceTaints.js";
import { DISABLED_BY_POLICY_REASON, DISABLED_FOR_SESSION_REASON, POLICY_LIMITS_PATH } from "./index.js";

//@ chunk-bvz8t570.js:2645-2825 placement
function formatPolicyDisabledMessage(featureLabel, verb, taints, override) {
  if (hipaaTaintsOnly(taints).length > 0) return `${featureLabel} ${verb} ${DISABLED_BY_POLICY_REASON}.`;
  if (override !== undefined) return override;
  return `${featureLabel} ${verb} ${DISABLED_BY_POLICY_REASON}. Contact your organization admin to enable ${verb === "are" ? "them" : "it"}.`;
}
//@ chunk-bvz8t570.js:2825-2903 placement
/**
 * 策略禁用功能的提示。
 */
function policyBlockedMessage(featureLabel, verb) {
  return `${featureLabel} ${verb} ${DISABLED_FOR_SESSION_REASON}. Restart Claude Code to re-evaluate.`;
}
//@ chunk-bvz8t570.js:2903-3039 placement
/**
 * 无法验证组织策略时的提示。
 */
function policyUnverifiedMessage(featureLabel) {
  return `Couldn't verify your organization's policy for ${featureLabel.toLowerCase()}. Check your network connection and try again.`;
}
//@ chunk-bvz8t570.js:3039-3372 placement
/**
 * 策略请求 404（代理未转发）时的提示。
 */
function policy404Message(featureLabel) {
  return `Couldn't load your organization's policy, which governs ${featureLabel.toLowerCase()}. The request for ${POLICY_LIMITS_PATH} got a 404, which usually means a proxy or gateway between you and the API isn't forwarding that path. Ask your network admin to allow it; \`claude doctor\` (or /status in a session) shows which host was asked.`;
}
//@ chunk-bvz8t570.js:3372-5296 placement
/**
 * 策略不可用原因（解析失败、网络错误、HTTP 状态）的详细提示。
 */
function policyUnavailableMessage(featureLabel, verb, failure) {
  let prefix = `${featureLabel} ${verb === "are" ? "aren't" : "isn't"} available`;
  let { host, httpStatus } = failure;
  switch (failure.errorCode) {
    case "parse_failed":
      return `${prefix}: Claude Code couldn't read the reply when it asked ${host} for your organization's policy, which usually means a network proxy or web filter answered instead.`;
    case "network_error":
    case "timeout":
      return `${prefix}: couldn't reach ${host} to load your organization's policy. Check your network or proxy.`;
    case "auth_failed":
      if (httpStatus === 403)
        return `${prefix}: ${host}, or a proxy in front of it, refused the request for your organization's policy (HTTP 403).`;
      return httpStatus === 401
        ? `${prefix}: ${host} didn't accept this session's credentials when Claude Code asked for your organization's policy.`
        : `${prefix}: no credentials could be attached to the request for your organization's policy.`;
    case "spurious_304":
      return `${prefix}: the saved copy of your organization's policy belongs to a previous sign-in, and a fresh one hasn't loaded yet.`;
    case "stale_tunnel_credential":
      return `${prefix}: the machine running claude ssh changed credentials while your organization's policy was loading, and a fresh copy hasn't loaded yet.`;
    case "request_failed":
      if (httpStatus === 404)
        return `${prefix}: the request for your organization's policy got a 404 from ${host}, which usually means a proxy or gateway isn't forwarding ${POLICY_LIMITS_PATH}.`;
      if (httpStatus === 304)
        return `${prefix}: a caching proxy answered in place of ${host} when Claude Code asked for your organization's policy.`;
      if (httpStatus === 407)
        return `${prefix}: your proxy asked for authentication before it would forward the request for your organization's policy to ${host}.`;
      if (httpStatus !== null && (httpStatus >= 500 || httpStatus === 429))
        return `${prefix}: your organization's policy couldn't be loaded from ${host} (HTTP ${httpStatus}). Try again later.`;
      return httpStatus !== null
        ? `${prefix}: your organization's policy couldn't be loaded from ${host} (HTTP ${httpStatus}). Check your proxy settings.`
        : `${prefix}: the request to ${host} for your organization's policy didn't complete. If you use a proxy, check that it lets ${host} through.`;
  }
}
//@ chunk-bvz8t570.js:5296-5458 placement
/**
 * 无法验证某功能的组织策略。
 */
function couldNotVerifyPolicyFor(featureLabel) {
  return `Couldn't verify your organization's policy for ${featureLabel.toLowerCase()}. Check your network connection, then restart Claude Code and try again.`;
}
//@ chunk-bvz8t570.js:5458-5592 placement
/**
 * 命令在会话开始后才启用、需重启。
 */
function commandEnabledAfterStartMessage(name) {
  return `/${name} is available for your organization but wasn't when this session started. Restart Claude Code to use it.`;
}
//@ chunk-bvz8t570.js:5592-5650 placement
/**
 * 有 HIPAA 污点时统一用「被组织策略禁用」文案，否则用给定文案。
 */
function policyDisabledMessageFor(currentTaints, override) {
  if (hipaaTaintsOnly(currentTaints).length > 0) return DISABLED_BY_POLICY_REASON;
  return override ?? DISABLED_BY_POLICY_REASON;
}
//@ chunk-bvz8t570.js:5650-5720 placement
/**
 * 「该规则被禁用，需重启 Claude Code 重新评估」的提示。
 */
function sessionRestartRequiredMessage() {
  return `${DISABLED_FOR_SESSION_REASON} \u2014 restart Claude Code to re-evaluate`;
}
//@ chunk-bvz8t570.js:5720-5837 placement
/**
 * 无法验证组织策略的简短提示。
 */
function couldNotVerifyPolicyHint() {
  return "couldn't verify your organization's policy \u2014 check your network connection and try again";
}
//@ chunk-bvz8t570.js:5837-6043 placement
/**
 * 策略请求 404（代理未转发）的提示。
 */
function policyEndpoint404Hint() {
  return `your organization's policy couldn't be loaded: the request for ${POLICY_LIMITS_PATH} got a 404, which usually means a proxy or gateway isn't forwarding that path. Ask your network admin to allow it`;
}
export {
  policy404Message,
  policyUnverifiedMessage,
  policyBlockedMessage,
  formatPolicyDisabledMessage,
  policyEndpoint404Hint,
  couldNotVerifyPolicyHint,
  sessionRestartRequiredMessage,
  policyDisabledMessageFor,
  policyUnavailableMessage,
  commandEnabledAfterStartMessage,
  couldNotVerifyPolicyFor,
};
