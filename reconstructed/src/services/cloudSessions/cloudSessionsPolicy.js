/**
 * services/cloudSessions/cloudSessionsPolicy.ts
 *
 * 2.1.316 新增：云会话不可用时的说明（第三方提供商、组织策略、API key 等）；云会话策略键与凭据来源说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pemtjbn7.js (5)
 * attribution: placement 5
 */
import { isSessionVerdictOfLiveCredential } from "../policyLimits/PolicyLimitsClient.js";
import { envBearerVerdictOnWire, getLastFetchOutcome } from "../policyLimits/policyState.js";
import { getAPIProvider, THIRD_PARTY_PROVIDER_LABELS } from "../../utils/model/providers.js";
import {
  policyKeyLabel,
  policyDeniedReason,
  policyDenyKind,
  isSessionVerdictFromServerFetch,
  isPolicyDeniedByRefusedCacheHint,
} from "../policyLimits/policyEvidence.js";
import { getComplianceTaints } from "../policyLimits/complianceTaints.js";
import { Khr, policyUnavailableMessage } from "../policyLimits/policyMessages.js";
import { describeAuthPrecedenceBlocker } from "../../bridge/bridgeEntitlement.js";
import {
  getAnthropicApiKeySafe,
  shouldUseWIFAuth,
  isOAuthRefreshKnownDead,
  isFirstPartyManagedOAuthContext,
  isClaudeAISubscriber,
  getAuthTokenSource,
  getOAuthAccountOnHold,
  hasUsableClaudeAILogin,
  getAnthropicApiKeyWithSourceSafe,
} from "../../utils/auth.js";
import { wouldWIFProfileYieldToClaudeAILogin } from "../../utils/wifProfile.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";

/**
 * 云会话策略键与凭据来源说明。
 */
//@ chunk-pemtjbn7.js:721-952 placement
var CLOUD_SESSIONS_POLICY = { policy: "allow_remote_sessions" },
  d = "Cloud sessions use your claude.ai login.",
  y = {
    ANTHROPIC_API_KEY: { noun: "key", fetchedTheLoadedAnswer: () => isSessionVerdictOfLiveCredential() },
    ANTHROPIC_AUTH_TOKEN: {
      noun: "token",
      fetchedTheLoadedAnswer: () => envBearerVerdictOnWire() === "same",
    },
  };
/**
 * 云会话不可用时的说明（第三方提供商、组织策略、API key 等）。
 */
//@ chunk-pemtjbn7.js:952-2280 placement
function cloudSessionsUnavailableReason() {
  let o = getAPIProvider();
  if (o !== "firstParty")
    return `Cloud sessions aren't available with ${THIRD_PARTY_PROVIDER_LABELS[o]}. They run on Anthropic's infrastructure and require an Anthropic account.`;
  let { policy: policy } = CLOUD_SESSIONS_POLICY,
    { featureLabel: featureLabel, verb: verb } = policyKeyLabel(policy),
    n = policyDeniedReason(policy, featureLabel, verb);
  if (n === null) return null;
  let a = policyDenyKind(policy);
  if (a === "org_denied") {
    let r =
      isSessionVerdictFromServerFetch() && getComplianceTaints().length === 0
        ? getConflictingApiCredentialSource()
        : null;
    if (r === null) return n;
    let c = `${featureLabel} ${verb} ${Khr([])}.`;
    if (r === "apiKeyHelper") return c;
    let { noun: noun, fetchedTheLoadedAnswer: fetchedTheLoadedAnswer } = y[r];
    if (!fetchedTheLoadedAnswer()) return n;
    return `${c} This session is using ${r}, so Claude Code checked the policy for the organization that ${noun} belongs to. ${d}`;
  }
  let t = getLastFetchOutcome();
  if (a !== "cache_miss" || t === null || t.success || t.httpStatus === 404) return n;
  if (t.retrying)
    return t.errorCode === "auth_failed" &&
      t.httpStatus === 401 &&
      !isPolicyDeniedByRefusedCacheHint(policy) &&
      p()
      ? `${n} If that doesn't help, run \`claude auth login\` (or /login in a local session).`
      : n;
  let u = policyUnavailableMessage(featureLabel, verb, t);
  if (t.errorCode !== "auth_failed" || t.httpStatus === 403 || isPolicyDeniedByRefusedCacheHint(policy))
    return u;
  if (getConflictingApiCredentialSource() !== null) {
    let r = describeAuthPrecedenceBlocker({ prefix: d, suffix: "to use cloud sessions." });
    return `${u} ${r}`;
  }
  if (t.httpStatus === 401 && p())
    return `${u} Run \`claude auth login\` (or /login in a local session), then try again.`;
  if (
    !getAnthropicApiKeySafe() &&
    shouldUseWIFAuth() &&
    t.httpStatus === null &&
    wouldWIFProfileYieldToClaudeAILogin() &&
    isOAuthRefreshKnownDead() &&
    !isEnvTruthy(!1)
  )
    return `${u} Cloud sessions need a claude.ai sign-in. Run \`claude auth login\` (or /login in a local session), then try again.`;
  return u;
}
//@ chunk-pemtjbn7.js:2280-2331 placement
function unr() {
  return policyDenyKind(CLOUD_SESSIONS_POLICY.policy) === "org_denied";
}
//@ chunk-pemtjbn7.js:2331-2404 placement
function p() {
  return (
    !isFirstPartyManagedOAuthContext() &&
    isClaudeAISubscriber() &&
    getAuthTokenSource().source === "claude.ai" &&
    getOAuthAccountOnHold() === null
  );
}
//@ chunk-pemtjbn7.js:2404-2670 placement
function getConflictingApiCredentialSource() {
  if (env.ANTHROPIC_UNIX_SOCKET || isEnvTruthy(!1) || !hasUsableClaudeAILogin() || isClaudeAISubscriber())
    return null;
  let { key: key, source: source } = getAnthropicApiKeyWithSourceSafe();
  if (source === "ANTHROPIC_API_KEY") return key === env.ANTHROPIC_API_KEY ? source : null;
  if (source === "apiKeyHelper") return source;
  return getAuthTokenSource().source === "ANTHROPIC_AUTH_TOKEN" ? "ANTHROPIC_AUTH_TOKEN" : null;
}

export { cloudSessionsUnavailableReason, unr, CLOUD_SESSIONS_POLICY };
