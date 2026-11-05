/**
 * services/errorReportingGate.ts
 *
 * 2.1.316 新增：错误上报开关。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vm6jpsyn.js (6)
 * attribution: placement 6
 */
import { __toESM } from "../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../vendor/semver/index.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";
import {
  getResponseFromCache,
  isPolicyAllowed,
  areComplianceTaintsSettled,
} from "./policyLimits/policyEvidence.js";
import {
  hasStoredOAuthToken,
  hasOAuthScope,
  getAuthTokenSource,
  getConfiguredApiKeyHelper,
} from "../utils/auth.js";
import { CLAUDE_AI_INFERENCE_SCOPE } from "../constants/oauth.js";
import { isDiskless } from "../bootstrap/state.js";
import { isFirstPartyTelemetryBlocked } from "../utils/hostEnvironment.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from "../utils/model/providers.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-vm6jpsyn.js:499-516 placement
/**
 * 懒加载的 semver 模块。
 */
var semverModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vm6jpsyn.js:499", () => {
  semverModule = __toESM(require_semver_3(), 1);
});
//@ chunk-vm6jpsyn.js:516-554 placement
/**
 * 允许错误上报的最低版本（2.1.193）。
 */
var TENGU_ORFORD_NESS = "tengu_orford_ness";
var MIN_ERROR_REPORTING_VERSION = "2.1.193";
//@ chunk-vm6jpsyn.js:554-602 placement
/**
 * 读 tengu_orford_ness（出错视为关闭）。
 */
function isOrfordNessEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ORFORD_NESS, false);
  } catch {
    return false;
  }
}
//@ chunk-vm6jpsyn.js:602-1084 placement
/**
 * 判断错误上报的策略状态：被策略禁止（缓存缺失/限制/污染）、合规污染未定，或在各种认证方式下允许/阻止。
 */
function errorReportingPolicyState() {
  let responseFromCache = getResponseFromCache();
  if (!isPolicyAllowed("allow_error_reporting")) {
    if (responseFromCache === null) return "blocked_cache_miss";
    return responseFromCache.restrictions.allow_error_reporting?.allowed === false
      ? "blocked_restriction"
      : "blocked_tainted";
  }
  let state = areComplianceTaintsSettled();
  if (responseFromCache !== null) return state ? "allowed_taints_clean" : "blocked_unsettled";
  if (hasStoredOAuthToken() && !hasOAuthScope(CLAUDE_AI_INFERENCE_SCOPE)) return "blocked_scopeless_oauth";
  if (getAuthTokenSource().source === "ANTHROPIC_AUTH_TOKEN") return "blocked_auth_token_env";
  if (getConfiguredApiKeyHelper()) return "blocked_api_key_helper";
  return state ? "allowed_untaintable" : "blocked_unsettled";
}
//@ chunk-vm6jpsyn.js:1084-1172 placement
/**
 * 错误上报策略是否允许（已允许且无污染）。
 */
function isErrorReportingPolicyAllowed() {
  let state = errorReportingPolicyState();
  return state === "allowed_taints_clean" || state === "allowed_untaintable";
}
//@ chunk-vm6jpsyn.js:1172-2353 placement
/**
 * 是否启用错误上报：未禁用、非无盘、第一方遥测与第一方 API、版本满足要求且策略允许。
 */
function isErrorReportingEnabled() {
  if (process.env.DISABLE_ERROR_REPORTING) return false;
  if (isDiskless()) return false;
  if (isFirstPartyTelemetryBlocked()) return false;
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return false;
  if (
    !semverModule.gte(
      semverModule.coerce(
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      )?.version ??
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      MIN_ERROR_REPORTING_VERSION,
    )
  )
    return false;
  if (!isErrorReportingPolicyAllowed()) return false;
  return isOrfordNessEnabled();
}
export { isErrorReportingPolicyAllowed, isErrorReportingEnabled, errorReportingPolicyState };
