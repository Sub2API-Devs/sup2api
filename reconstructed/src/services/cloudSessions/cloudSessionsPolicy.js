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
import { policyDisabledMessageFor, policyUnavailableMessage } from "../policyLimits/policyMessages.js";
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

//@ chunk-pemtjbn7.js:721-952 placement
/**
 * API key/令牌在报错文案里的名词与“当前凭据是否即所问凭据”的判断表。
 */
var CLOUD_SESSIONS_POLICY = {
  policy: "allow_remote_sessions",
};
var CLOUD_SESSIONS_LOGIN_NOTE = "Cloud sessions use your claude.ai login.";
var AUTH_KEY_NOUNS = {
  ANTHROPIC_API_KEY: {
    noun: "key",
    fetchedTheLoadedAnswer: () => isSessionVerdictOfLiveCredential(),
  },
  ANTHROPIC_AUTH_TOKEN: {
    noun: "token",
    fetchedTheLoadedAnswer: () => envBearerVerdictOnWire() === "same",
  },
};
//@ chunk-pemtjbn7.js:952-2280 placement
/**
 * 云会话不可用时的说明（第三方提供商、组织策略、API key 等）。
 */
function cloudSessionsUnavailableReason() {
  let apiProvider = getAPIProvider();
  if (apiProvider !== "firstParty")
    return `Cloud sessions aren't available with ${THIRD_PARTY_PROVIDER_LABELS[apiProvider]}. They run on Anthropic's infrastructure and require an Anthropic account.`;
  let { policy } = CLOUD_SESSIONS_POLICY;
  let { featureLabel, verb } = policyKeyLabel(policy);
  let n = policyDeniedReason(policy, featureLabel, verb);
  if (n === null) return null;
  let a = policyDenyKind(policy);
  if (a === "org_denied") {
    let r =
      isSessionVerdictFromServerFetch() && getComplianceTaints().length === 0
        ? getConflictingApiCredentialSource()
        : null;
    if (r === null) return n;
    let c = `${featureLabel} ${verb} ${policyDisabledMessageFor([])}.`;
    if (r === "apiKeyHelper") return c;
    let { noun, fetchedTheLoadedAnswer } = AUTH_KEY_NOUNS[r];
    if (!fetchedTheLoadedAnswer()) return n;
    return `${c} This session is using ${r}, so Claude Code checked the policy for the organization that ${noun} belongs to. ${CLOUD_SESSIONS_LOGIN_NOTE}`;
  }
  let lastFetchOutcome = getLastFetchOutcome();
  if (
    a !== "cache_miss" ||
    lastFetchOutcome === null ||
    lastFetchOutcome.success ||
    lastFetchOutcome.httpStatus === 404
  )
    return n;
  if (lastFetchOutcome.retrying)
    return lastFetchOutcome.errorCode === "auth_failed" &&
      lastFetchOutcome.httpStatus === 401 &&
      !isPolicyDeniedByRefusedCacheHint(policy) &&
      canRetryCloudSessionsWithOAuth()
      ? `${n} If that doesn't help, run \`claude auth login\` (or /login in a local session).`
      : n;
  let u = policyUnavailableMessage(featureLabel, verb, lastFetchOutcome);
  if (
    lastFetchOutcome.errorCode !== "auth_failed" ||
    lastFetchOutcome.httpStatus === 403 ||
    isPolicyDeniedByRefusedCacheHint(policy)
  )
    return u;
  if (getConflictingApiCredentialSource() !== null) {
    let r = describeAuthPrecedenceBlocker({
      prefix: CLOUD_SESSIONS_LOGIN_NOTE,
      suffix: "to use cloud sessions.",
    });
    return `${u} ${r}`;
  }
  if (lastFetchOutcome.httpStatus === 401 && canRetryCloudSessionsWithOAuth())
    return `${u} Run \`claude auth login\` (or /login in a local session), then try again.`;
  if (
    !getAnthropicApiKeySafe() &&
    shouldUseWIFAuth() &&
    lastFetchOutcome.httpStatus === null &&
    wouldWIFProfileYieldToClaudeAILogin() &&
    isOAuthRefreshKnownDead() &&
    !isEnvTruthy(false)
  )
    return `${u} Cloud sessions need a claude.ai sign-in. Run \`claude auth login\` (or /login in a local session), then try again.`;
  return u;
}
//@ chunk-pemtjbn7.js:2280-2331 placement
/**
 * 组织策略是否明确拒绝了云会话（org_denied）。
 */
function isCloudSessionsDeniedByOrg() {
  return policyDenyKind(CLOUD_SESSIONS_POLICY.policy) === "org_denied";
}
//@ chunk-pemtjbn7.js:2331-2404 placement
/**
 * 能否用 claude.ai OAuth 重试：订阅用户、凭据来自 claude.ai、账号未被冻结。
 */
function canRetryCloudSessionsWithOAuth() {
  return (
    !isFirstPartyManagedOAuthContext() &&
    isClaudeAISubscriber() &&
    getAuthTokenSource().source === "claude.ai" &&
    getOAuthAccountOnHold() === null
  );
}
//@ chunk-pemtjbn7.js:2404-2670 placement
function getConflictingApiCredentialSource() {
  if (env.ANTHROPIC_UNIX_SOCKET || isEnvTruthy(false) || !hasUsableClaudeAILogin() || isClaudeAISubscriber())
    return null;
  let { key, source } = getAnthropicApiKeyWithSourceSafe();
  if (source === "ANTHROPIC_API_KEY") return key === env.ANTHROPIC_API_KEY ? source : null;
  if (source === "apiKeyHelper") return source;
  return getAuthTokenSource().source === "ANTHROPIC_AUTH_TOKEN" ? "ANTHROPIC_AUTH_TOKEN" : null;
}
export { cloudSessionsUnavailableReason, isCloudSessionsDeniedByOrg, CLOUD_SESSIONS_POLICY };
