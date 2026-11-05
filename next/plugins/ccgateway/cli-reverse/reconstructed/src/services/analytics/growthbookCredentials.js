/**
 * services/analytics/growthbookCredentials.ts
 *
 * 2.1.316 新增：读取 hooks 模块开关的服务端值（需要时触发刷新）；当前进程不加载 hooks 模块的原因（服务器租户、工具服务器 daemon）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-05astxy8.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  envBearerFallbackMarker,
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
import { identity } from "../../utils/identity.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, toError } from "../../utils/errors.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import {
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnly,
} from "../../utils/hooks/hooksConfigSnapshot.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-05astxy8.js:742-752 placement
/**
 * 插件 hooks 模块默认开启值与不加载原因文本。
 */
var HOOKS_MODULES_DEFAULT = true;
//@ chunk-05astxy8.js:752-847 placement
var DISKLESS_HOOKS_REFUSAL =
  "no hooks module loads in a claude-code-server tenant, whose process serves many people";
//@ chunk-05astxy8.js:847-975 placement
var TOOL_SERVER_DAEMON_REFUSAL =
  "no hooks module loads in a tool server's daemon, which can hold the person's token and runs its caller's shell commands";
//@ chunk-05astxy8.js:975-1026 placement
/**
 * 当前进程不加载 hooks 模块的原因（服务器租户、工具服务器 daemon）。
 */
function hooksModulesRefusalReason() {
  if (isDiskless()) return DISKLESS_HOOKS_REFUSAL;
  return isHttpMcpServeInvocation() ? TOOL_SERVER_DAEMON_REFUSAL : undefined;
}
//@ chunk-05astxy8.js:1026-1199 placement
/**
 * 是否已有任何认证方式（API key、OAuth、helper、WIF 等）。
 */
var hasAnyCredential = () =>
  isBareMode() ||
  isHostManagedProviderAuth() ||
  Boolean(env.ANTHROPIC_API_KEY) ||
  Boolean(getSettings_DEPRECATED()?.env?.ANTHROPIC_API_KEY) ||
  getApiKeyFromConfigOrMacOSKeychain() !== null ||
  Boolean(getConfiguredApiKeyHelper()) ||
  hasStoredOAuthToken() ||
  isWIFActive() ||
  !getAuthHeaders({
    envBearerFallbackFor: envBearerFallbackMarker(),
  }).error;
//@ chunk-05astxy8.js:1199-1362 placement
/**
 * 严格读取凭证存储，全部为空时为 true。
 */
async function isCredentialStoreEmpty() {
  if (hasAnyCredential()) return false;
  let [everyCredentialLeg, keychainMissing] = await Promise.all([
    readEveryCredentialLeg(getSecureStorage(), (leg) => leg.claudeAiOauth !== undefined),
    getPlatform() !== "macos" || isKeychainItemMissing(),
  ]);
  return keychainMissing && everyCredentialLeg.every((leg) => leg.value === false);
}
//@ chunk-05astxy8.js:1362-1439 placement
/**
 * 凭证存储状态缓存（是否已检查、检查中的 Promise），用于判断能否使用首批凭据读取功能开关。
 */
var credentialStoreState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-05astxy8.js:1362", () => {
  credentialStoreState = identity(
    {
      isLifted: false,
      lifting: undefined,
    },
    (state) => {
      state.isLifted = false;
      state.lifting = undefined;
    },
  );
});
//@ chunk-05astxy8.js:1439-1568 placement
/**
 * 异步检查凭证存储是否为空（只做一次）。
 */
function liftCredentialCheck() {
  credentialStoreState.lifting ??= isCredentialStoreEmpty().then(
    (isLifted) => {
      credentialStoreState.isLifted = isLifted;
    },
    (error) => {
      logForDebugging(`credential stores not read strictly: ${errorMessage(error)}`);
    },
  );
  return credentialStoreState.lifting;
}
//@ chunk-05astxy8.js:1568-1619 placement
/**
 * 导出函数 `hooksModulesFollowState`。
 */
var hooksModulesFollowState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-05astxy8.js:1568", () => {
  hooksModulesFollowState = identity(
    {
      isFollowed: false,
    },
    (state) => {
      state.isFollowed = false;
    },
  );
});
//@ chunk-05astxy8.js:1619-1653 placement
var FOLLOWABLE_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-05astxy8.js:1619", () => {
  FOLLOWABLE_SOURCES = new Set(["disk", "payload"]);
});
//@ chunk-05astxy8.js:1653-1760 placement
/**
 * 读取 hooks 模块开关的服务端值（需要时触发刷新）。
 */
async function checkHooksModulesFlag() {
  let flagValue = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    PLUGIN_HOOKS_MODULES_GATE,
    HOOKS_MODULES_DEFAULT,
  );
  return !hooksModulesFollowState.isFollowed &&
    isGrowthBookEnabled() &&
    flagValue.value !== HOOKS_MODULES_DEFAULT &&
    FOLLOWABLE_SOURCES.has(flagValue.source)
    ? liftCredentialCheck()
    : undefined;
}
//@ chunk-05astxy8.js:1760-1787 placement
var hasUsableCredential = () => !credentialStoreState.isLifted || hasAnyCredential();
//@ chunk-05astxy8.js:1787-1904 placement
/**
 * 特性开关客户端是否持有凭证（读取失败视为有）。
 */
function hasFeatureFlagCredential() {
  try {
    return hasFeatureFlagClientHeldCredential() || hasUsableCredential();
  } catch (error) {
    logForDebugging(`GrowthBook: credential sources not read (${toError(error).name})`);
    return true;
  }
}
//@ chunk-05astxy8.js:1904-1969 placement
var shouldCheckHooksModulesFlag = () =>
  !hooksModulesFollowState.isFollowed &&
  isGrowthBookEnabled() &&
  FOLLOWABLE_SOURCES.has(
    getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT).source,
  ) &&
  !hasFeatureFlagCredential();
//@ chunk-05astxy8.js:1969-2050 placement
/**
 * 导出函数 `resolveHooksModulesValue`：返回 s ? HOOKS_MODULES_DEFAULT : o。
 */
function resolveHooksModulesValue() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    PLUGIN_HOOKS_MODULES_GATE,
    HOOKS_MODULES_DEFAULT,
  );
  let differsFromDefault = featureValue_CACHED_MAY_BE_STALE !== HOOKS_MODULES_DEFAULT;
  let trustedOverride =
    differsFromDefault && (hasGrowthBookUsedNonDefaultHost() || shouldCheckHooksModulesFlag());
  if (differsFromDefault) checkHooksModulesFlag();
  return trustedOverride ? HOOKS_MODULES_DEFAULT : featureValue_CACHED_MAY_BE_STALE;
}
//@ chunk-05astxy8.js:2050-2082 placement
/**
 * 是否允许加载 hooks 模块。
 */
var areHooksModulesAllowed = () => hooksModulesRefusalReason() === undefined && resolveHooksModulesValue();
//@ chunk-05astxy8.js:2082-2120 placement (2.1.88 match: formatDangerousSettingsList, 0.483)
/**
 * 导出函数 `areHooksModulesActiveGbc`。
 */
var areHooksModulesActiveGbc = () =>
  areHooksModulesAllowed() && !isCustomizationDisabled("hooks") && !isSafeMode();
//@ chunk-05astxy8.js:2120-2152 placement
/**
 * hooks 模块是否在本会话生效。
 */
var areHooksModulesActive = () =>
  areHooksModulesActiveGbc() && !shouldDisableAllHooksIncludingManaged() && !shouldAllowManagedHooksOnly();
export {
  resolveHooksModulesValue,
  checkHooksModulesFlag,
  areHooksModulesAllowed,
  hooksModulesRefusalReason,
  areHooksModulesActive,
  areHooksModulesActiveGbc,
  HOOKS_MODULES_DEFAULT,
  hasFeatureFlagCredential,
  hooksModulesFollowState,
};
