/**
 * services/policyLimits/orgConfigRequired.ts
 *
 * 2.1.316 新增。组织必须配置的检查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m8rdsjv5.js (4)
 * attribution: placement 4
 */

//@ chunk-m8rdsjv5.js:191-219 placement
/**
 * 视为组织级套餐的取值（team、enterprise）。
 */
var ORG_CONFIG_PLANS = ["team", "enterprise"];
//@ chunk-m8rdsjv5.js:219-277 placement
/**
 * 该字符串是否属于组织级套餐。
 */
function isOrgConfigPlan(tier) {
  return typeof tier === "string" && ORG_CONFIG_PLANS.includes(tier);
}
//@ chunk-m8rdsjv5.js:277-431 placement
/**
 * 组织要求必须提供配置时的默认标记。
 */
var TENGU_ORG_CONFIG_REQUIRED = "tengu_org_config_required";
var DEFAULT_ORG_CONFIG_REQUIRED_FLAG = {
  enabled: false,
  plans: [],
  percent: 0,
  graceTtlHours: 96,
  budgetMs: 6000,
  hostTokens: false,
  exemptReasons: [],
  refuseNotEntitled: false,
};
//@ chunk-m8rdsjv5.js:431-994 placement
/**
 * 托管配置结果原因归类（fetched/refused/intermediary/unavailable/client/not_attempted）。
 */
function classifyManagedConfigOutcome(reason) {
  switch (reason) {
    case "ok":
    case "none_configured":
    case "not_required":
      return "fetched";
    case "refused_credential":
    case "refused_not_entitled":
      return "refused";
    case "blocked_by_intermediary":
      return "intermediary";
    case "refused_other":
    case "unavailable_timeout":
    case "unavailable_connect":
    case "unavailable_server":
    case "unavailable_rate_limited":
    case "unavailable_credential_refresh":
    case "unavailable_pending":
    case "unavailable_settings_unusable":
      return "unavailable";
    case "client_no_credentials":
    case "client_error":
      return "client";
    case "not_attempted":
      return "not_attempted";
  }
}
export {
  DEFAULT_ORG_CONFIG_REQUIRED_FLAG,
  TENGU_ORG_CONFIG_REQUIRED,
  isOrgConfigPlan,
  classifyManagedConfigOutcome,
};
