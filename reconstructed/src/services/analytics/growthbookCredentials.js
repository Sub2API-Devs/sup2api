/**
 * services/analytics/growthbookCredentials.ts
 *
 * 2.1.316 新增：读取 hooks 模块开关的服务端值（需要时触发刷新）；当前进程不加载 hooks 模块的原因（服务器租户、工具服务器 daemon）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pm6ycja1.js (18)
 * attribution: placement 18
 */
import { isDiskless } from "../../bootstrap/state.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { isBareMode, isSafeMode } from "../../utils/envUtils.js";
import {
  isHostManagedProviderAuth,
  getApiKeyFromConfigOrMacOSKeychain,
  getConfiguredApiKeyHelper,
  hasStoredOAuthToken,
} from "../../utils/auth.js";
import { env } from "../../utils/env.js";
import { getSettings_DEPRECATED } from "../../utils/settings/settings.js";
import { isWIFActive } from "../../utils/wifProfile.js";
import { getAuthHeaders } from "../../utils/http.js";
import {
  FRn,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  PLUGIN_HOOKS_MODULES_GATE,
  isGrowthBookEnabled,
  hasFeatureFlagClientHeldCredential,
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasGrowthBookUsedNonDefaultHost,
} from "./growthbook.js";
import { readEveryCredentialLeg } from "../../utils/secureStorage/credentialLegs.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { getPlatform } from "../../utils/platform.js";
import { isKeychainItemMissing } from "../../utils/secureStorage/macOsKeychainStorage.js";
import { ge } from "../../utils/identity.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, toError } from "../../utils/errors.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import {
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnly,
} from "../../utils/hooks/hooksConfigSnapshot.js";

/**
 * 插件 hooks 模块默认开启值与不加载原因文本。
 */
//@ chunk-pm6ycja1.js:742-752 placement
var HOOKS_MODULES_DEFAULT = !0;
//@ chunk-pm6ycja1.js:752-847 placement
var n = "no hooks module loads in a claude-code-server tenant, whose process serves many people";
//@ chunk-pm6ycja1.js:847-975 placement
var TOOL_SERVER_DAEMON_REFUSAL =
  "no hooks module loads in a tool server's daemon, which can hold the person's token and runs its caller's shell commands";
/**
 * 当前进程不加载 hooks 模块的原因（服务器租户、工具服务器 daemon）。
 */
//@ chunk-pm6ycja1.js:975-1026 placement
function hooksModulesRefusalReason() {
  if (isDiskless()) return n;
  return isHttpMcpServeInvocation() ? TOOL_SERVER_DAEMON_REFUSAL : void 0;
}
/**
 * 是否已有任何认证方式（API key、OAuth、helper、WIF 等）。
 */
//@ chunk-pm6ycja1.js:1026-1199 placement
var hasAnyCredential = () =>
  isBareMode() ||
  isHostManagedProviderAuth() ||
  Boolean(env.ANTHROPIC_API_KEY) ||
  Boolean(getSettings_DEPRECATED()?.env?.ANTHROPIC_API_KEY) ||
  getApiKeyFromConfigOrMacOSKeychain() !== null ||
  Boolean(getConfiguredApiKeyHelper()) ||
  hasStoredOAuthToken() ||
  isWIFActive() ||
  !getAuthHeaders({ envBearerFallbackFor: FRn() }).error;
/**
 * 严格读取凭证存储，全部为空时为 true。
 */
//@ chunk-pm6ycja1.js:1199-1362 placement
async function isCredentialStoreEmpty() {
  if (hasAnyCredential()) return !1;
  let [o, r] = await Promise.all([
    readEveryCredentialLeg(getSecureStorage(), (s) => s.claudeAiOauth !== void 0),
    getPlatform() !== "macos" || isKeychainItemMissing(),
  ]);
  return r && o.every((s) => s.value === !1);
}
//@ chunk-pm6ycja1.js:1362-1439 placement
var e = ge({ isLifted: !1, lifting: void 0 }, (o) => {
  ((o.isLifted = !1), (o.lifting = void 0));
});
/**
 * 异步检查凭证存储是否为空（只做一次）。
 */
//@ chunk-pm6ycja1.js:1439-1568 placement
function liftCredentialCheck() {
  return (
    (e.lifting ??= isCredentialStoreEmpty().then(
      (o) => {
        e.isLifted = o;
      },
      (o) => {
        logForDebugging(`credential stores not read strictly: ${errorMessage(o)}`);
      },
    )),
    e.lifting
  );
}
//@ chunk-pm6ycja1.js:1568-1619 placement
var P_n = ge({ isFollowed: !1 }, (o) => {
  o.isFollowed = !1;
});
//@ chunk-pm6ycja1.js:1619-1653 placement
var m = new Set(["disk", "payload"]);
/**
 * 读取 hooks 模块开关的服务端值（需要时触发刷新）。
 */
//@ chunk-pm6ycja1.js:1653-1760 placement
async function checkHooksModulesFlag() {
  let o = getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT);
  return !P_n.isFollowed && isGrowthBookEnabled() && o.value !== HOOKS_MODULES_DEFAULT && m.has(o.source)
    ? liftCredentialCheck()
    : void 0;
}
//@ chunk-pm6ycja1.js:1760-1787 placement
var p = () => !e.isLifted || hasAnyCredential();
/**
 * 特性开关客户端是否持有凭证（读取失败视为有）。
 */
//@ chunk-pm6ycja1.js:1787-1904 placement
function hasFeatureFlagCredential() {
  try {
    return hasFeatureFlagClientHeldCredential() || p();
  } catch (error) {
    return (logForDebugging(`GrowthBook: credential sources not read (${toError(error).name})`), !0);
  }
}
//@ chunk-pm6ycja1.js:1904-1969 placement
var u = () =>
  !P_n.isFollowed &&
  isGrowthBookEnabled() &&
  m.has(
    getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source,
  ) &&
  !hasFeatureFlagCredential();
//@ chunk-pm6ycja1.js:1969-2050 placement
function I_n() {
  let o = getFeatureValue_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT),
    r = o !== HOOKS_MODULES_DEFAULT,
    s = r && (hasGrowthBookUsedNonDefaultHost() || u());
  if (r) checkHooksModulesFlag();
  return s ? HOOKS_MODULES_DEFAULT : o;
}
/**
 * 是否允许加载 hooks 模块。
 */
//@ chunk-pm6ycja1.js:2050-2082 placement
var areHooksModulesAllowed = () => hooksModulesRefusalReason() === void 0 && I_n();
//@ chunk-pm6ycja1.js:2082-2120 placement
var O_n = () => areHooksModulesAllowed() && !isCustomizationDisabled("hooks") && !isSafeMode();
/**
 * hooks 模块是否在本会话生效。
 */
//@ chunk-pm6ycja1.js:2120-2152 placement
var areHooksModulesActive = () =>
  O_n() && !shouldDisableAllHooksIncludingManaged() && !shouldAllowManagedHooksOnly();

export {
  HOOKS_MODULES_DEFAULT,
  areHooksModulesAllowed,
  checkHooksModulesFlag,
  areHooksModulesActive,
  hooksModulesRefusalReason,
  hasFeatureFlagCredential,
  P_n,
  I_n,
  O_n,
};
