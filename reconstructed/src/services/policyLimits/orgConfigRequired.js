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
var t = ["team", "enterprise"];
//@ chunk-m8rdsjv5.js:219-277 placement
function GPt(e) {
  return typeof e === "string" && t.includes(e);
}
//@ chunk-m8rdsjv5.js:277-431 placement
var TENGU_ORG_CONFIG_REQUIRED = "tengu_org_config_required",
  hQ = {
    enabled: !1,
    plans: [],
    percent: 0,
    graceTtlHours: 96,
    budgetMs: 6000,
    hostTokens: !1,
    exemptReasons: [],
    refuseNotEntitled: !1,
  };
/**
 * 托管配置结果原因归类（fetched/refused/intermediary/unavailable/client/not_attempted）。
 */
//@ chunk-m8rdsjv5.js:431-994 placement
function classifyManagedConfigOutcome(e) {
  switch (e) {
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

export { hQ, TENGU_ORG_CONFIG_REQUIRED, GPt, classifyManagedConfigOutcome };
