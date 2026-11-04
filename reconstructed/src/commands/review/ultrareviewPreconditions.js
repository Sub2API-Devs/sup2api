/**
 * commands/review/ultrareviewPreconditions.ts
 *
 * ultrareview 前置条件：登录方式、熔断、工作区信任（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (19)
 * attribution: placement 19
 */
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
  initializeGrowthBook,
} from "../../services/analytics/growthbook.js";
import { ULTRA_REVIEW_CONFIG_FLAG } from "./ultrareviewEnabled.js";
import { hasBridgeEntitlement, isBridgeFirstParty } from "../../bridge/bridgeEnabled.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { isRunningInRemoteEnvironment } from "../../bridge/bridgeGates.js";
import { env } from "../../utils/env.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  getBridgeEntitlementBlocker,
  describeAuthPrecedenceBlocker,
} from "../../bridge/bridgeEntitlement.js";
import {
  getAuthTokenSource,
  describeHowToDisableAuthTokenSource,
  isClaudeAISubscriberAsync,
  checkAndRefreshOAuthTokenIfNeeded,
  isClaudeAISubscriber,
} from "../../utils/auth.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";

//@ chunk-s61vbvea.js:461181-461214 placement
/**
 * 读取 ultrareview 的 GrowthBook 配置（model、cost_note、duration_note、client_wait_minutes 等）。
 */
function ultrareviewConfig() {
  return getFeatureValue_CACHED_MAY_BE_STALE(ULTRA_REVIEW_CONFIG_FLAG, null);
}
//@ chunk-s61vbvea.js:461214-461303 placement
function getReviewCostNote() {
  let costNote = ultrareviewConfig()?.cost_note;
  return typeof costNote === "string" && costNote.length > 0 ? costNote : "$10-$20";
}
//@ chunk-s61vbvea.js:461303-461408 placement
/**
 * 典型费用（美元，合理范围内取整）。
 */
function typicalUltrareviewCost() {
  let typicalCostUsd = ultrareviewConfig()?.typical_cost_usd;
  return typeof typicalCostUsd === "number" && typicalCostUsd >= 1 && typicalCostUsd <= 1e4
    ? Math.round(typicalCostUsd)
    : null;
}
//@ chunk-s61vbvea.js:461408-461509 placement
function getReviewDurationNote() {
  let durationNote = ultrareviewConfig()?.duration_note;
  return typeof durationNote === "string" && durationNote.length > 0 ? durationNote : "~10\u201320 min";
}
//@ chunk-s61vbvea.js:461509-461591 placement
/**
 * 取 ultrareview 配置里指定的模型（非空字符串才算）。
 */
function ultrareviewModelOverride() {
  let model = ultrareviewConfig()?.model;
  return typeof model === "string" && model.length > 0 ? model : undefined;
}
//@ chunk-s61vbvea.js:461591-461613 placement
var DEFAULT_CLIENT_WAIT_MINUTES = 45;
var CLIENT_WAIT_MIN_MINUTES = 30;
var CLIENT_WAIT_MAX_MINUTES = 55;
//@ chunk-s61vbvea.js:461613-461739 placement
/**
 * 客户端等待分钟数（限制范围）。
 */
function clientWaitMinutes() {
  let clientWaitMinutes = ultrareviewConfig()?.client_wait_minutes;
  return typeof clientWaitMinutes === "number" &&
    Number.isFinite(clientWaitMinutes) &&
    clientWaitMinutes >= CLIENT_WAIT_MIN_MINUTES &&
    clientWaitMinutes <= CLIENT_WAIT_MAX_MINUTES
    ? Math.floor(clientWaitMinutes)
    : DEFAULT_CLIENT_WAIT_MINUTES;
}
//@ chunk-s61vbvea.js:461739-461913 placement
/**
 * diff 文件数与行数上限。
 */
function diffSizeLimits() {
  let config = ultrareviewConfig();
  let normalize = (value, fallback) =>
    typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  return {
    maxFiles: normalize(config?.max_diff_files, 500),
    maxLines: normalize(config?.max_diff_lines, 8000),
  };
}
//@ chunk-s61vbvea.js:461913-461975 placement
/**
 * 空树回退是否启用（缺省启用）。
 */
function isEmptyTreeFallbackEnabled() {
  return ultrareviewConfig()?.empty_tree_fallback_enabled !== false;
}
//@ chunk-s61vbvea.js:461975-462040 placement
/**
 * GitHub 访问预检是否启用（缺省启用）。
 */
function isGithubAccessPrecheckEnabled() {
  return ultrareviewConfig()?.github_access_precheck_enabled !== false;
}
//@ chunk-s61vbvea.js:462040-462100 placement
/**
 * 分支预检是否必需（缺省启用）。
 */
function isBranchPreflightRequired() {
  return ultrareviewConfig()?.branch_preflight_required !== false;
}
//@ chunk-s61vbvea.js:462100-462134 placement
/**
 * ultrareview 与 Remote Control 同时可用（要求桥接资格）。
 */
function isUltrareviewWithBridge() {
  return isUltrareviewAvailable() && hasBridgeEntitlement();
}
//@ chunk-s61vbvea.js:462134-462426 placement
/**
 * 判断 ultrareview 不可用原因：配置不可用、熔断、第三方提供方
 */
function ultrareviewUnavailableReason() {
  if (isUltrareviewWithBridge()) return null;
  let featureValue = getFeatureValueWithSource_CACHED_MAY_BE_STALE(ULTRA_REVIEW_CONFIG_FLAG, null);
  if (featureValue.source === "fallback" && !hasFreshGrowthBookFeatures()) return "config_unavailable";
  if (featureValue.value?.enabled !== true) return "kill_switch";
  if (!isFirstPartyProvider()) return "third_party_provider";
  if (isRunningInRemoteEnvironment()) return "remote_environment";
  if (!isBridgeFirstParty()) return "non_first_party_base_url";
  return "entitlement";
}
//@ chunk-s61vbvea.js:462426-462481 placement
/**
 * ultrareview 是否可用：配置 enabled、第一方提供商、非远程环境。
 */
function isUltrareviewAvailable() {
  return ultrareviewConfig()?.enabled === true && isFirstPartyProvider() && !isRunningInRemoteEnvironment();
}
//@ chunk-s61vbvea.js:462481-462542 placement
/**
 * ultrareview 结果投递开关 tengu_ultrareview_post_enabled（默认开）。
 */
function isUltrareviewPostEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ultrareview_post_enabled", true);
}
//@ chunk-s61vbvea.js:462542-462794 placement
async function checkUltrareviewWorkspaceTrust() {
  let disabledByEnv = env.CLAUDE_CODE_DISABLE_ULTRAREVIEW_TRUST_CHECK;
  if (!disabledByEnv) {
    await initializeGrowthBook().catch(() => {});
    if (
      readFlagWithOverride("tengu_twinkly_breeze", {
        safe: true,
      })
    )
      return true;
  }
  logFeatureSad(
    "cli_ultrareview_workspace_trust",
    disabledByEnv ? "check_switched_off_by_env" : "check_switched_off",
  );
  return false;
}
//@ chunk-s61vbvea.js:462794-463768 placement
/**
 * ultrareview 需要 claude.ai 账号登录；API key 登录时报错
 */
function ultrareviewAuthPrecondition() {
  if (!isUltrareviewAvailable() || isUltrareviewWithBridge()) return null;
  switch (getBridgeEntitlementBlocker()) {
    case "api_key_auth":
      return `${describeAuthPrecedenceBlocker({
        prefix: "ultra (cloud review) requires claude.ai account auth.",
        suffix: "to use ultra.",
      })} See https://code.claude.com/docs/en/ultrareview.`;
    case "no_profile_scope": {
      let { source } = getAuthTokenSource();
      if (source === "CLAUDE_CODE_OAUTH_TOKEN")
        return `ultra (cloud review) requires a full-scope login token. ${describeHowToDisableAuthTokenSource(source)} Then run \`claude auth login\` to use it; see https://code.claude.com/docs/en/ultrareview.`;
      return "ultra (cloud review) requires a full-scope login token \u2014 run `claude auth login` to use it; see https://code.claude.com/docs/en/ultrareview.";
    }
    case "not_in_rollout":
      return "ultra (cloud review) isn't enabled for your account yet \u2014 run `claude auth login` to refresh your entitlements; see https://code.claude.com/docs/en/ultrareview.";
    default:
      return "ultra (cloud review) requires a claude.ai account \u2014 sign in to claude.ai to use it; see https://code.claude.com/docs/en/ultrareview.";
  }
}
//@ chunk-s61vbvea.js:463768-463831 placement
/**
 * 评测运行中云会话不可用的提示文本。
 */
var CLOUD_UNAVAILABLE_IN_EVAL_TEXT = "Cloud sessions are unavailable in an evaluation run.";
//@ chunk-s61vbvea.js:463831-463956 placement
/**
 * 是 claude.ai 订阅者且令牌已刷新。
 */
async function hasFreshSubscriberToken(credentials) {
  if (isStorageV5Enabled() && credentials !== undefined) {
    if (!(await isClaudeAISubscriberAsync(credentials))) return false;
    return checkAndRefreshOAuthTokenIfNeeded({
      credentials,
    });
  }
  if (!isClaudeAISubscriber()) return false;
  return checkAndRefreshOAuthTokenIfNeeded();
}
export {
  isUltrareviewWithBridge,
  getReviewDurationNote,
  getReviewCostNote,
  checkUltrareviewWorkspaceTrust,
  isUltrareviewPostEnabled,
  CLOUD_UNAVAILABLE_IN_EVAL_TEXT,
  clientWaitMinutes,
  ultrareviewAuthPrecondition,
  hasFreshSubscriberToken,
  isUltrareviewAvailable,
  typicalUltrareviewCost,
  isGithubAccessPrecheckEnabled,
  diffSizeLimits,
  isEmptyTreeFallbackEnabled,
  isBranchPreflightRequired,
  ultrareviewConfig,
  ultrareviewModelOverride,
  ultrareviewUnavailableReason,
};
