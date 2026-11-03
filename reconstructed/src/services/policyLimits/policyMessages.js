/**
 * services/policyLimits/policyMessages.ts
 *
 * 2.1.316 新增：策略不可用原因（解析失败、网络错误、HTTP 状态）的详细提示；策略请求 404（代理未转发）时的提示等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yxnffbzs.js (11)
 * attribution: placement 11
 */
import { Cle } from "./complianceTaints.js";
import { p, v, POLICY_LIMITS_PATH } from "./index.js";

//@ chunk-yxnffbzs.js:2672-2852 placement
function formatPolicyDisabledMessage(e, n, r, o) {
  if (Cle(r).length > 0) return `${e} ${n} ${p}.`;
  if (o !== void 0) return o;
  return `${e} ${n} ${p}. Contact your organization admin to enable ${n === "are" ? "them" : "it"}.`;
}
/**
 * 策略禁用功能的提示。
 */
//@ chunk-yxnffbzs.js:2852-2930 placement
function policyBlockedMessage(e, n) {
  return `${e} ${n} ${v}. Restart Claude Code to re-evaluate.`;
}
/**
 * 无法验证组织策略时的提示。
 */
//@ chunk-yxnffbzs.js:2930-3066 placement
function policyUnverifiedMessage(e) {
  return `Couldn't verify your organization's policy for ${e.toLowerCase()}. Check your network connection and try again.`;
}
/**
 * 策略请求 404（代理未转发）时的提示。
 */
//@ chunk-yxnffbzs.js:3066-3399 placement
function policy404Message(e) {
  return `Couldn't load your organization's policy, which governs ${e.toLowerCase()}. The request for ${POLICY_LIMITS_PATH} got a 404, which usually means a proxy or gateway between you and the API isn't forwarding that path. Ask your network admin to allow it; \`claude doctor\` (or /status in a session) shows which host was asked.`;
}
/**
 * 策略不可用原因（解析失败、网络错误、HTTP 状态）的详细提示。
 */
//@ chunk-yxnffbzs.js:3399-5323 placement
function policyUnavailableMessage(e, n, r) {
  let o = `${e} ${n === "are" ? "aren't" : "isn't"} available`,
    { host: host, httpStatus: httpStatus } = r;
  switch (r.errorCode) {
    case "parse_failed":
      return `${o}: Claude Code couldn't read the reply when it asked ${host} for your organization's policy, which usually means a network proxy or web filter answered instead.`;
    case "network_error":
    case "timeout":
      return `${o}: couldn't reach ${host} to load your organization's policy. Check your network or proxy.`;
    case "auth_failed":
      if (httpStatus === 403)
        return `${o}: ${host}, or a proxy in front of it, refused the request for your organization's policy (HTTP 403).`;
      return httpStatus === 401
        ? `${o}: ${host} didn't accept this session's credentials when Claude Code asked for your organization's policy.`
        : `${o}: no credentials could be attached to the request for your organization's policy.`;
    case "spurious_304":
      return `${o}: the saved copy of your organization's policy belongs to a previous sign-in, and a fresh one hasn't loaded yet.`;
    case "stale_tunnel_credential":
      return `${o}: the machine running claude ssh changed credentials while your organization's policy was loading, and a fresh copy hasn't loaded yet.`;
    case "request_failed":
      if (httpStatus === 404)
        return `${o}: the request for your organization's policy got a 404 from ${host}, which usually means a proxy or gateway isn't forwarding ${POLICY_LIMITS_PATH}.`;
      if (httpStatus === 304)
        return `${o}: a caching proxy answered in place of ${host} when Claude Code asked for your organization's policy.`;
      if (httpStatus === 407)
        return `${o}: your proxy asked for authentication before it would forward the request for your organization's policy to ${host}.`;
      if (httpStatus !== null && (httpStatus >= 500 || httpStatus === 429))
        return `${o}: your organization's policy couldn't be loaded from ${host} (HTTP ${httpStatus}). Try again later.`;
      return httpStatus !== null
        ? `${o}: your organization's policy couldn't be loaded from ${host} (HTTP ${httpStatus}). Check your proxy settings.`
        : `${o}: the request to ${host} for your organization's policy didn't complete. If you use a proxy, check that it lets ${host} through.`;
  }
}
/**
 * 无法验证某功能的组织策略。
 */
//@ chunk-yxnffbzs.js:5323-5485 placement
function couldNotVerifyPolicyFor(e) {
  return `Couldn't verify your organization's policy for ${e.toLowerCase()}. Check your network connection, then restart Claude Code and try again.`;
}
/**
 * 命令在会话开始后才启用、需重启。
 */
//@ chunk-yxnffbzs.js:5485-5619 placement
function commandEnabledAfterStartMessage(e) {
  return `/${e} is available for your organization but wasn't when this session started. Restart Claude Code to use it.`;
}
//@ chunk-yxnffbzs.js:5619-5677 placement
function Khr(e, n) {
  if (Cle(e).length > 0) return p;
  return n ?? p;
}
//@ chunk-yxnffbzs.js:5677-5747 placement
function rCi() {
  return `${v} \u2014 restart Claude Code to re-evaluate`;
}
/**
 * 无法验证组织策略的简短提示。
 */
//@ chunk-yxnffbzs.js:5747-5864 placement
function couldNotVerifyPolicyHint() {
  return "couldn't verify your organization's policy \u2014 check your network connection and try again";
}
/**
 * 策略请求 404（代理未转发）的提示。
 */
//@ chunk-yxnffbzs.js:5864-6070 placement
function policyEndpoint404Hint() {
  return `your organization's policy couldn't be loaded: the request for ${POLICY_LIMITS_PATH} got a 404, which usually means a proxy or gateway isn't forwarding that path. Ask your network admin to allow it`;
}

export {
  policyUnverifiedMessage,
  commandEnabledAfterStartMessage,
  couldNotVerifyPolicyFor,
  policy404Message,
  policyBlockedMessage,
  formatPolicyDisabledMessage,
  policyEndpoint404Hint,
  couldNotVerifyPolicyHint,
  rCi,
  Khr,
  policyUnavailableMessage,
};
