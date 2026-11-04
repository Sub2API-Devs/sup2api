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
/**
 * 单个 scope 响应的最大字节数（1 MiB）。
 */
var MAX_SCOPE_RESPONSE_BYTES = 1e6;
//@ chunk-f9asxqh1.js:1615-2391 placement
/**
 * 判断账号插件路由是否可以发送请求：策略禁止、非一方提供方、仅必要流量、CCR 会话令牌等情况直接放行（send），先尝试刷新 OAuth 令牌，令牌已带 user:plugins scope 或无法判断 scope 时放行，只有一方登录令牌缺这个 scope 时返回 skip_no_scope。
 */
async function checkPluginsScope(credentials) {
  let decide = (decision, reason) => {
    logForDebugging(`[plugins-scope] ${decision}: ${reason}`);
    return decision;
  };
  if (!isPolicyAllowed("allow_plugin_skill_search"))
    return decide("send", "policy refuses the plugin routes");
  if (!isFirstPartyProvider()) return decide("send", "not a first-party provider session");
  if (isEssentialTrafficOnly()) return decide("send", "essential traffic only");
  if (getSessionIngressAuthToken()) return decide("send", "CCR session token");
  try {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
    });
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
/**
 * scope 门槛的超时（10000 毫秒）。
 */
var SCOPE_GATE_TIMEOUT_MS = 1e4;
//@ chunk-f9asxqh1.js:2402-2753 placement
/**
 * 带超时与中止信号的 scope 门槛：中止或超时、门槛出错时一律按 send 处理。
 */
async function pluginsScopeGate(signal, credentials, timeoutMs = SCOPE_GATE_TIMEOUT_MS) {
  if (signal?.aborted) return "send";
  let gatePromise = checkPluginsScope(credentials).catch((error) => {
    logForDebugging(`[plugins-scope] unexpected gate error: ${errorMessage(error)}`);
    return "send";
  });
  let decision;
  if (!signal) decision = await withDeadline(gatePromise, timeoutMs);
  else {
    let onAbort;
    let promise = new Promise((resolve) => {
      onAbort = () => resolve(undefined);
      signal.addEventListener("abort", onAbort, {
        once: true,
      });
    });
    try {
      decision = await withDeadline(Promise.race([gatePromise, promise]), timeoutMs);
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }
  return decision ?? "send";
}
//@ chunk-f9asxqh1.js:2934-3395 placement
/**
 * 判断同步开关所依据的设置是否不可靠：用户/本地/flag 设置文件有致命解析错误、管理策略加载失败、内联设置被丢弃、父级托管设置无效或策略键未注册时为真。
 */
function isSyncSettingsUnreliable(gateKeys) {
  let hasFatalError = (settingsFilePathForSource, expectedContent) => {
    let settingsFile = parseSettingsFile(settingsFilePathForSource, expectedContent);
    return settingsFile.settings === null && filterFatalPolicyErrors(settingsFile.errors).length > 0;
  };
  let any = ["userSettings", "localSettings", "flagSettings"].some((source) => {
    let settingsFilePathForSource = getSettingsFilePathForSource(source);
    if (settingsFilePathForSource === undefined) return false;
    switch (source) {
      case "flagSettings":
        return hasFatalError(
          settingsFilePathForSource,
          getFlagSettingsExpectedContent() ?? getFlagSettingsFilePinnedContent(),
        );
      case "localSettings": {
        let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
        return (
          hasFatalError(settingsFilePathForSource) ||
          (legacyLocalSettingsFilePath !== undefined &&
            legacyLocalSettingsFilePath !== settingsFilePathForSource &&
            hasFatalError(legacyLocalSettingsFilePath))
        );
      }
      case "userSettings":
        return hasFatalError(settingsFilePathForSource);
    }
  });
  return (
    isSyncDisabled(gateKeys) ||
    (getFatalAdminPolicyLoadErrors().length > 0 && getPolicySettingsOrigin() !== "helper") ||
    any ||
    flagInlineSettingDropped(gateKeys.settingKey) ||
    (getParentManagedSettingsInvalid() && parentManagedTierParticipates()) ||
    policyDenyKind(gateKeys.policyKey) === "unregistered"
  );
}
//@ chunk-f9asxqh1.js:3395-3653 placement
/**
 * 判断账号同步（技能/插件）在当前会话是否可用：设置未在受信来源中关闭、所属层级生效、一方 API、非 Unix socket、非远程模式、令牌来自 claude.ai、非仅必要流量且策略允许，最后再看特性开关。
 */
function isAccountSyncEligible(gate) {
  if (!isNotDisabledInTrustedSources(gate.settingKey)) return false;
  if (!gate.isTierInPlay()) return false;
  if (getAPIProvider() !== "firstParty") return false;
  if (env.ANTHROPIC_UNIX_SOCKET) return false;
  if (getIsRemoteMode()) return false;
  if (getAuthTokenSource().source !== "claude.ai") return false;
  if (isEssentialTrafficOnly()) return false;
  if (!isPolicyAllowed(gate.policyKey)) return false;
  return isFlagOn(gate);
}
//@ chunk-f9asxqh1.js:3653-3708 placement
/**
 * 当前是否为 claude.ai 登录且非远程模式。
 */
function isFirstPartyClaudeAiSession() {
  return getAuthTokenSource().source === "claude.ai" && !getIsRemoteMode();
}
//@ chunk-f9asxqh1.js:3708-3751 placement
/**
 * 读某特性开关（默认关）。
 */
function isFlagOn(gate) {
  return getFeatureValue_CACHED_MAY_BE_STALE(gate.flagName, false) === true;
}
//@ chunk-f9asxqh1.js:3751-3788 placement
/**
 * 非远程/协作环境下是否满足同步资格。
 */
function isSyncEligibleHere(gate) {
  return !isRemoteOrCowork() && isPolicyUnresolved(gate);
}
//@ chunk-f9asxqh1.js:3788-3871 placement
/**
 * 策略是否尚未确定（缓存缺失或路由缺失）。
 */
function isPolicyUnresolved(gateKeys) {
  let denyKind = policyDenyKind(gateKeys.policyKey);
  return denyKind === "cache_miss" || denyKind === "route_missing";
}
//@ chunk-f9asxqh1.js:3871-3966 placement
/**
 * 账号同步是否被明确关闭。
 */
function isSyncDisabled(gateKeys) {
  let denyKind = policyDenyKind(gateKeys.policyKey);
  return (
    !isNotDisabledInTrustedSources(gateKeys.settingKey) || denyKind === "org_denied" || denyKind === "latched"
  );
}
//@ chunk-f9asxqh1.js:3966-4112 placement
/**
 * 判断账号同步是否被明确关闭：持久策略层或用户设置把同步键设为 false，或组织策略为 org_denied / latched。
 */
function isAccountSyncDenied(gateKeys) {
  let settingsTiers = [...getDurablePolicyTierSettings(), getSettingsForSource("userSettings")];
  let denyKind = policyDenyKind(gateKeys.policyKey);
  return (
    settingsTiers.some((settingsTier) => settingsTier?.[gateKeys.settingKey] === false) ||
    denyKind === "org_denied" ||
    denyKind === "latched"
  );
}
export {
  MAX_SCOPE_RESPONSE_BYTES,
  isFirstPartyClaudeAiSession,
  isSyncSettingsUnreliable,
  isSyncEligibleHere,
  isPolicyUnresolved,
  isAccountSyncEligible,
  isAccountSyncDenied,
  pluginsScopeGate,
  isFlagOn,
};
