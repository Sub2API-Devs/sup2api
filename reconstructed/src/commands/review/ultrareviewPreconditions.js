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
import { isUltrareviewEnabled } from "./ultrareviewEnabled.js";
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
function cxe() {
  return getFeatureValue_CACHED_MAY_BE_STALE(isUltrareviewEnabled, null);
}
//@ chunk-s61vbvea.js:461214-461303 placement
function getReviewCostNote() {
  let e = cxe()?.cost_note;
  return typeof e === "string" && e.length > 0 ? e : "$10-$20";
}
/**
 * 典型费用（美元，合理范围内取整）。
 */
//@ chunk-s61vbvea.js:461303-461408 placement
function typicalUltrareviewCost() {
  let e = cxe()?.typical_cost_usd;
  return typeof e === "number" && e >= 1 && e <= 1e4 ? Math.round(e) : null;
}
//@ chunk-s61vbvea.js:461408-461509 placement
function getReviewDurationNote() {
  let e = cxe()?.duration_note;
  return typeof e === "string" && e.length > 0 ? e : "~10\u201320 min";
}
//@ chunk-s61vbvea.js:461509-461591 placement
function Xei() {
  let e = cxe()?.model;
  return typeof e === "string" && e.length > 0 ? e : void 0;
}
//@ chunk-s61vbvea.js:461591-461613 placement
var aF = 45,
  lF = 30,
  cF = 55;
/**
 * 客户端等待分钟数（限制范围）。
 */
//@ chunk-s61vbvea.js:461613-461739 placement
function clientWaitMinutes() {
  let e = cxe()?.client_wait_minutes;
  return typeof e === "number" && Number.isFinite(e) && e >= lF && e <= cF ? Math.floor(e) : aF;
}
/**
 * diff 文件数与行数上限。
 */
//@ chunk-s61vbvea.js:461739-461913 placement
function diffSizeLimits() {
  let e = cxe(),
    n = (r, s) => (typeof r === "number" && Number.isFinite(r) && r > 0 ? Math.floor(r) : s);
  return { maxFiles: n(e?.max_diff_files, 500), maxLines: n(e?.max_diff_lines, 8000) };
}
//@ chunk-s61vbvea.js:461913-461975 placement
function Fqo() {
  return cxe()?.empty_tree_fallback_enabled !== !1;
}
//@ chunk-s61vbvea.js:461975-462040 placement
function Jei() {
  return cxe()?.github_access_precheck_enabled !== !1;
}
//@ chunk-s61vbvea.js:462040-462100 placement
function Qei() {
  return cxe()?.branch_preflight_required !== !1;
}
//@ chunk-s61vbvea.js:462100-462134 placement
function UF() {
  return Uvt() && hasBridgeEntitlement();
}
/**
 * 判断 ultrareview 不可用原因：配置不可用、熔断、第三方提供方
 */
//@ chunk-s61vbvea.js:462134-462426 placement
function ultrareviewUnavailableReason() {
  if (UF()) return null;
  let e = getFeatureValueWithSource_CACHED_MAY_BE_STALE(isUltrareviewEnabled, null);
  if (e.source === "fallback" && !hasFreshGrowthBookFeatures()) return "config_unavailable";
  if (e.value?.enabled !== !0) return "kill_switch";
  if (!isFirstPartyProvider()) return "third_party_provider";
  if (isRunningInRemoteEnvironment()) return "remote_environment";
  if (!isBridgeFirstParty()) return "non_first_party_base_url";
  return "entitlement";
}
//@ chunk-s61vbvea.js:462426-462481 placement
function Uvt() {
  return cxe()?.enabled === !0 && isFirstPartyProvider() && !isRunningInRemoteEnvironment();
}
//@ chunk-s61vbvea.js:462481-462542 placement
function Bvt() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ultrareview_post_enabled", !0);
}
//@ chunk-s61vbvea.js:462542-462794 placement
async function checkUltrareviewWorkspaceTrust() {
  let e = env.CLAUDE_CODE_DISABLE_ULTRAREVIEW_TRUST_CHECK;
  if (!e) {
    if (
      (await initializeGrowthBook().catch(() => {}),
      readFlagWithOverride("tengu_twinkly_breeze", { safe: !0 }))
    )
      return !0;
  }
  return (
    logFeatureSad("cli_ultrareview_workspace_trust", e ? "check_switched_off_by_env" : "check_switched_off"),
    !1
  );
}
/**
 * ultrareview 需要 claude.ai 账号登录；API key 登录时报错
 */
//@ chunk-s61vbvea.js:462794-463768 placement
function ultrareviewAuthPrecondition() {
  if (!Uvt() || UF()) return null;
  switch (getBridgeEntitlementBlocker()) {
    case "api_key_auth":
      return `${describeAuthPrecedenceBlocker({ prefix: "ultra (cloud review) requires claude.ai account auth.", suffix: "to use ultra." })} See https://code.claude.com/docs/en/ultrareview.`;
    case "no_profile_scope": {
      let { source: source } = getAuthTokenSource();
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
var jvt = "Cloud sessions are unavailable in an evaluation run.";
/**
 * 是 claude.ai 订阅者且令牌已刷新。
 */
//@ chunk-s61vbvea.js:463831-463956 placement
async function hasFreshSubscriberToken(e) {
  if (isStorageV5Enabled() && e !== void 0) {
    if (!(await isClaudeAISubscriberAsync(e))) return !1;
    return checkAndRefreshOAuthTokenIfNeeded({ credentials: e });
  }
  if (!isClaudeAISubscriber()) return !1;
  return checkAndRefreshOAuthTokenIfNeeded();
}

export {
  UF,
  getReviewDurationNote,
  getReviewCostNote,
  checkUltrareviewWorkspaceTrust,
  Bvt,
  jvt,
  clientWaitMinutes,
  ultrareviewAuthPrecondition,
  hasFreshSubscriberToken,
  Uvt,
  typicalUltrareviewCost,
  Jei,
  diffSizeLimits,
  Fqo,
  Qei,
  cxe,
  Xei,
  ultrareviewUnavailableReason,
};
