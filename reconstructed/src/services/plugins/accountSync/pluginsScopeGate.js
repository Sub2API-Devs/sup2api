/**
 * services/plugins/accountSync/pluginsScopeGate.ts
 *
 * 2.1.316 新增：账号插件同步的 scope 门槛
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f9asxqh1.js (12)
 * attribution: placement 12
 */
import { logForDebugging } from "../../../utils/debug.js";
import { isPolicyAllowed, policyDenyKind } from "../../policyLimits/policyVerdicts.js";
import { isFirstPartyProvider, getAPIProvider } from "../../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../../utils/privacyLevel.js";
import { getSessionIngressAuthToken } from "../../../utils/sessionIngressAuth.js";
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getClaudeAIOAuthTokens,
  getAuthTokenSource,
} from "../../../utils/auth.js";
import { errorMessage } from "../../../utils/errors.js";
import { CLAUDE_AI_PLUGINS_SCOPE } from "../../../constants/oauth.js";
import { withDeadline } from "../../../utils/sleep.js";
import {
  parseSettingsFile,
  filterFatalPolicyErrors,
  getSettingsFilePathForSource,
  getLegacyLocalSettingsFilePath,
  getFatalAdminPolicyLoadErrors,
  getPolicySettingsOrigin,
  flagInlineSettingDropped,
  parentManagedTierParticipates,
  isNotDisabledInTrustedSources,
  getDurablePolicyTierSettings,
  getSettingsForSource,
} from "../../../utils/settings/settings.js";
import {
  getFlagSettingsExpectedContent,
  getFlagSettingsFilePinnedContent,
  getParentManagedSettingsInvalid,
  getIsRemoteMode,
} from "../../../bootstrap/state.js";
import { env } from "../../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import { isRemoteOrCowork } from "../../../skills/skillSources.js";

//@ chunk-f9asxqh1.js:1604-1615 placement
var By = 1e6;
/**
 * 判断账号插件路由是否可以发送请求：策略禁止、非一方提供方、仅必要流量、CCR 会话令牌等情况直接放行（send），先尝试刷新 OAuth 令牌，令牌已带 user:plugins scope 或无法判断 scope 时放行，只有一方登录令牌缺这个 scope 时返回 skip_no_scope。
 */
//@ chunk-f9asxqh1.js:1615-2391 placement
async function checkPluginsScope(credentials) {
  let decide = (r, f) => (logForDebugging(`[plugins-scope] ${r}: ${f}`), r);
  if (!isPolicyAllowed("allow_plugin_skill_search"))
    return decide("send", "policy refuses the plugin routes");
  if (!isFirstPartyProvider()) return decide("send", "not a first-party provider session");
  if (isEssentialTrafficOnly()) return decide("send", "essential traffic only");
  if (getSessionIngressAuthToken()) return decide("send", "CCR session token");
  try {
    await checkAndRefreshOAuthTokenIfNeeded({ credentials: credentials });
  } catch (error) {
    logForDebugging(`[plugins-scope] pre-check token freshen failed: ${errorMessage(error)}`);
  }
  let tokens = getClaudeAIOAuthTokens();
  if (!tokens?.accessToken) return decide("send", "no claude.ai token");
  if (tokens.scopes?.includes(CLAUDE_AI_PLUGINS_SCOPE)) return decide("send", "token carries user:plugins");
  if (!tokens.refreshToken) return decide("send", "host-injected token, scopes unknown here");
  if (tokens.clientId) return decide("send", "third-party OAuth client");
  return decide("skip_no_scope", "login token lacks user:plugins until its next refresh");
}
//@ chunk-f9asxqh1.js:2391-2402 placement
var Ke = 1e4;
/**
 * 带超时与中止信号的 scope 门槛：中止或超时、门槛出错时一律按 send 处理。
 */
//@ chunk-f9asxqh1.js:2402-2753 placement
async function pluginsScopeGate(e, n, s = Ke) {
  if (e?.aborted) return "send";
  let r = checkPluginsScope(n).catch(
      (y) => (logForDebugging(`[plugins-scope] unexpected gate error: ${errorMessage(y)}`), "send"),
    ),
    f;
  if (!e) f = await withDeadline(r, s);
  else {
    let y,
      promise = new Promise((h) => {
        ((y = () => h(void 0)), e.addEventListener("abort", y, { once: !0 }));
      });
    try {
      f = await withDeadline(Promise.race([r, promise]), s);
    } finally {
      e.removeEventListener("abort", y);
    }
  }
  return f ?? "send";
}
/**
 * 判断同步开关所依据的设置是否不可靠：用户/本地/flag 设置文件有致命解析错误、管理策略加载失败、内联设置被丢弃、父级托管设置无效或策略键未注册时为真。
 */
//@ chunk-f9asxqh1.js:2934-3395 placement
function isSyncSettingsUnreliable(e) {
  let n = (r, f) => {
      let y = parseSettingsFile(r, f);
      return y.settings === null && filterFatalPolicyErrors(y.errors).length > 0;
    },
    any = ["userSettings", "localSettings", "flagSettings"].some((r) => {
      let f = getSettingsFilePathForSource(r);
      if (f === void 0) return !1;
      switch (r) {
        case "flagSettings":
          return n(f, getFlagSettingsExpectedContent() ?? getFlagSettingsFilePinnedContent());
        case "localSettings": {
          let y = getLegacyLocalSettingsFilePath();
          return n(f) || (y !== void 0 && y !== f && n(y));
        }
        case "userSettings":
          return n(f);
      }
    });
  return (
    ze(e) ||
    (getFatalAdminPolicyLoadErrors().length > 0 && getPolicySettingsOrigin() !== "helper") ||
    any ||
    flagInlineSettingDropped(e.settingKey) ||
    (getParentManagedSettingsInvalid() && parentManagedTierParticipates()) ||
    policyDenyKind(e.policyKey) === "unregistered"
  );
}
/**
 * 判断账号同步（技能/插件）在当前会话是否可用：设置未在受信来源中关闭、所属层级生效、一方 API、非 Unix socket、非远程模式、令牌来自 claude.ai、非仅必要流量且策略允许，最后再看特性开关。
 */
//@ chunk-f9asxqh1.js:3395-3653 placement
function isAccountSyncEligible(e) {
  if (!isNotDisabledInTrustedSources(e.settingKey)) return !1;
  if (!e.isTierInPlay()) return !1;
  if (getAPIProvider() !== "firstParty") return !1;
  if (env.ANTHROPIC_UNIX_SOCKET) return !1;
  if (getIsRemoteMode()) return !1;
  if (getAuthTokenSource().source !== "claude.ai") return !1;
  if (isEssentialTrafficOnly()) return !1;
  if (!isPolicyAllowed(e.policyKey)) return !1;
  return N(e);
}
//@ chunk-f9asxqh1.js:3653-3708 placement
function Jrt() {
  return getAuthTokenSource().source === "claude.ai" && !getIsRemoteMode();
}
//@ chunk-f9asxqh1.js:3708-3751 placement
function N(e) {
  return getFeatureValue_CACHED_MAY_BE_STALE(e.flagName, !1) === !0;
}
//@ chunk-f9asxqh1.js:3751-3788 placement
function M5r(e) {
  return !isRemoteOrCowork() && grr(e);
}
//@ chunk-f9asxqh1.js:3788-3871 placement
function grr(e) {
  let n = policyDenyKind(e.policyKey);
  return n === "cache_miss" || n === "route_missing";
}
//@ chunk-f9asxqh1.js:3871-3966 placement
function ze(e) {
  let n = policyDenyKind(e.policyKey);
  return !isNotDisabledInTrustedSources(e.settingKey) || n === "org_denied" || n === "latched";
}
/**
 * 判断账号同步是否被明确关闭：持久策略层或用户设置把同步键设为 false，或组织策略为 org_denied / latched。
 */
//@ chunk-f9asxqh1.js:3966-4112 placement
function isAccountSyncDenied(e) {
  let n = [...getDurablePolicyTierSettings(), getSettingsForSource("userSettings")],
    s = policyDenyKind(e.policyKey);
  return n.some((r) => r?.[e.settingKey] === !1) || s === "org_denied" || s === "latched";
}

export {
  By,
  Jrt,
  isSyncSettingsUnreliable,
  M5r,
  grr,
  isAccountSyncEligible,
  isAccountSyncDenied,
  pluginsScopeGate,
  N,
};
