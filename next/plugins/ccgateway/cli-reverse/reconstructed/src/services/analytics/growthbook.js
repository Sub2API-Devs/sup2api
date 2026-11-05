/**
 * services/analytics/growthbook.ts
 *
 * GrowthBook 特性开关客户端：remoteEval 拉取、用户属性、磁盘缓存 cachedGrowthBookFeatures、env 覆盖、定时刷新与各种取值接口。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/analytics/growthbook.ts
 * pieces: chunk-exfmq47h.js (117), chunk-jynns2s2.js (1)
 * attribution: placement 112, fingerprint 2, layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { getCoreUserData } from "../../utils/user.js";
import { postGrowthBookEval, GrowthBookClientHolder } from "./growthbookClient.js";
import { createPendingFlagState, isPendingNotOver } from "../../utils/toolErrors.js";
import { HostScoped } from "../../utils/hostScoped.js";
import {
  getRootSession,
  getSessionTrustAccepted,
  getIsNonInteractiveSession,
  isCcsTenant,
  getSessionId,
  isDiskless,
  getCcrDerivedSurface,
  getConversationAtisLatch,
  setConversationAtisLatch,
} from "../../bootstrap/state.js";
import { getAuthHeadersAsync, getAuthHeaders } from "../../utils/http.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { env, getHostPlatformForAnalytics } from "../../utils/env.js";
import { apiKeyForHost } from "./telemetryCredentialGuard.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { usesSessionAccessToken } from "../../utils/sessionAccessToken.js";
import {
  getGlobalConfig,
  saveGlobalConfig,
  checkHasTrustDialogAccepted,
  getCurrentProjectConfig,
  getCachedClientData,
} from "../../utils/config.js";
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getConfiguredApiKeyHelper,
  shouldUseWIFAuth,
  isClaudeAIOAuthTokenHostInjected,
  getAuthenticatedAccountInfo,
} from "../../utils/auth.js";
import { clearWIFAccountInfoCache } from "../../utils/wifProfile.js";
import { isPlainNonInteractive } from "../../utils/sessionShape.js";
import { logGrowthBookExperimentTo1P, is1PEventLoggingEnabled } from "./firstPartyEventLogger.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import {
  installProxyFetchForGrowthBook,
  registerVerifySkillGateReader,
  registerCommitSkillGateReader,
} from "../projectsRelay/relayGates.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { helpers } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { isTelemetryDisabled } from "../../utils/privacyLevel.js";
import { getEntrypointKind, isCoworkAny } from "../../utils/entrypointKinds.js";
import { getInitialSettings } from "../../utils/settings/settings.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { swapRemoteGateReader } from "../../utils/accessibility/screenReader.js";
import { registerSteerFeature } from "../../utils/model/subagentSteer.js";
import { registerErrorReader } from "../oauth/oauthErrors.js";
import { setOAuthLockFlagReader } from "../../utils/auth/oauthRefreshLock.js";
import { setWorkerOwnerRowsReader, setFeatureReader } from "../../utils/messageProvenance.js";
import {
  registerMainGateReader,
  registerWarmMochiGateReader,
  registerRosyElephantGateReader,
} from "./growthbookGates.js";
import { registerServedSettingsReader } from "../../utils/settings/settingsSourceTrust.js";
import { registerGateReader, isPolicyGraceEnabled } from "../policyLimits/index.js";
import { TENGU_ORG_CONFIG_REQUIRED } from "../policyLimits/orgConfigRequired.js";
import { logForDebugging } from "../../utils/debug.js";
import { setVerificationPredicate } from "../api/verificationRequired.js";
import {
  readWarmSunriseFlag,
  readStagedPumpkinFlag,
  readNestedRippleFlag,
  registerSetting,
  installNestedRippleReader2,
} from "../../utils/bash/bashReadingFlags.js";
import { registerEnvReader } from "../../utils/gitSafeExec.js";
import { registerFeatureFlagReader } from "../../utils/toolCgroup.js";
import { swapFeatureReader } from "../policyLimits/capabilityBlocks.js";
import {
  readCalmNautilusFlag,
  readTinglyPearlFlag,
  readFoamyHeronFlag,
} from "../../utils/bash/bashParserFlags.js";
import {
  setProgramUseCaseChoiceGate,
  PROGRAM_USE_CASE_CHOICE_FLAG,
  setProgramUseCaseStampGate,
  PROGRAM_USE_CASE_STAMP_FLAG,
} from "../../utils/programUseCase.js";
import { registerWrapFeatureReader, registerWrapFeatureLatches } from "../../ink/wrapAnsi.js";
import { setRemoteBrowserFlagReader } from "../mcp/remoteBrowserServer.js";
import { flushBeforeExec } from "../../utils/processRelaunch.js";
import { emitExitMessage } from "../../utils/gracefulShutdown.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:139243-139267 placement
function hasEnvBearerFallback(authBearer) {
  return false;
}
//@ chunk-exfmq47h.js:642265-642277 placement
var coreUserDataCache = null;
//@ chunk-exfmq47h.js:642277-642313 placement
function coreUserData() {
  coreUserDataCache ??= new getCoreUserData();
  return coreUserDataCache;
}
//@ chunk-exfmq47h.js:642313-642347 placement
/**
 * 导出函数 `initCoreUserData`：返回 Yi().init()。
 */
function initCoreUserData() {
  return coreUserData().init();
}
//@ chunk-exfmq47h.js:642347-642374 placement
/**
 * 重置用户数据缓存与读取 git 邮箱/用户名的辅助函数。
 */
function resetUserData() {
  coreUserData().reset();
}
//@ chunk-exfmq47h.js:642374-642417 placement
function buildCoreUserData(identity) {
  return coreUserData().coreUserData(identity);
}
//@ chunk-exfmq47h.js:642417-642445 placement
function gitUserEmail() {
  return buildCoreUserData(true);
}
//@ chunk-exfmq47h.js:642445-642483 placement
/**
 * git 用户邮箱。
 */
function getGitEmail() {
  return coreUserData().gitEmail();
}
//@ chunk-exfmq47h.js:642483-642524 placement
/**
 * 导出函数 `gitUserName`：返回 Yi().gitUserName()。
 */
function gitUserName() {
  return coreUserData().gitUserName();
}
//@ chunk-exfmq47h.js:642524-642533 placement
var MIN_NAME_LENGTH = 8;
//@ chunk-exfmq47h.js:642533-642598 placement
function nonEmptyName(name) {
  return typeof name === "string" && name.length >= MIN_NAME_LENGTH ? name : undefined;
}
//@ chunk-exfmq47h.js:642598-642634 placement
/**
 * 开关 tengu_plugin_hooks_modules 的名字。
 */
var PLUGIN_HOOKS_MODULES_GATE = "tengu_plugin_hooks_modules";
//@ chunk-exfmq47h.js:642634-642713 placement
function emptyAccountIdentity(identity) {
  return {
    accountUuid: undefined,
    organizationUuid: undefined,
    email: undefined,
  };
}
//@ chunk-exfmq47h.js:642713-642781 placement
/**
 * GrowthBook 初始化前的 OAuth/密钥助手等待时长（60 s / 5 s / 5 s）与原因标记。
 */
var PRE_INIT_OAUTH_TIMEOUT_MS = 60000;
var PRE_INIT_KEY_HELPER_TIMEOUT_MS = 5000;
var PRE_INIT_FALLBACK_TIMEOUT_MS = 5000;
var PRE_INIT_OAUTH_REASON = "GrowthBook pre-init OAuth refresh";
//@ chunk-exfmq47h.js:642781-642807 placement
/**
 * 导出函数 `envBearerFallbackMarker`：参数 e，返回 getGrowthBookClient_2。
 */
function envBearerFallbackMarker(host) {
  return DEFAULT_GROWTHBOOK_HOST;
}
//@ chunk-exfmq47h.js:642807-642843 placement
/**
 * GrowthBook 的默认 host（https://api.anthropic.com/）；FRn 返回它，使用非默认 host 时会把会话标记为 usedNonDefaultHost。
 */
var DEFAULT_GROWTHBOOK_HOST = "https://api.anthropic.com/";
//@ chunk-exfmq47h.js:925091-926269 fingerprint (2.1.88 match: getUserAttributes, 0.632)
/**
 * 按 GrowthBook 用户属性形状组装对象（只放有值的字段）。
 */
function getUserAttributes_2(user) {
  return {
    id: user.deviceId,
    sessionId: user.sessionId,
    deviceID: user.deviceId,
    platform: user.platform,
    ...(user.apiBaseUrlHost && {
      apiBaseUrlHost: user.apiBaseUrlHost,
    }),
    ...(user.organizationUuid && {
      organizationUUID: user.organizationUuid,
    }),
    ...(user.accountUuid && {
      accountUUID: user.accountUuid,
    }),
    ...(user.userType && {
      userType: user.userType,
    }),
    ...(user.subscriptionType && {
      subscriptionType: user.subscriptionType,
    }),
    ...(user.rateLimitTier && {
      rateLimitTier: user.rateLimitTier,
    }),
    ...(user.organizationRole && {
      organizationRole: user.organizationRole,
    }),
    ...(Number.isFinite(user.subscriptionCreatedAtMs) && {
      subscriptionCreatedAt: user.subscriptionCreatedAtMs,
    }),
    ...(user.firstTokenTime && {
      firstTokenTime: user.firstTokenTime,
    }),
    ...(user.email && {
      email: user.email,
    }),
    ...(user.appVersion && {
      appVersion: user.appVersion,
    }),
    ...(user.githubActionsMetadata && {
      githubActionsMetadata: user.githubActionsMetadata,
    }),
    ...(user.releaseChannel && {
      releaseChannel: user.releaseChannel,
    }),
    ...(user.entrypoint && {
      entrypoint: user.entrypoint,
    }),
    ...(user.sessionOrigin && {
      sessionOrigin: user.sessionOrigin,
    }),
    ...(user.ccrDerivedSurface && {
      ccrDerivedSurface: user.ccrDerivedSurface,
    }),
    ...(user.atisPin && {
      atisPin: user.atisPin,
    }),
    ...(user.hasUsedRemoteSession && {
      hasUsedRemoteSession: true,
    }),
    ...(user.hasRemoteEnvironment && {
      hasRemoteEnvironment: true,
    }),
    ...false,
    ...(user.slackTagConnected && {
      slackTagConnected: true,
    }),
  };
}
//@ chunk-exfmq47h.js:926269-926279 placement
var postGrowthBookEvalAlias = postGrowthBookEval;
//@ chunk-exfmq47h.js:926279-926363 placement
class DefaultFeatureFlagClientSlot {
  client = null;
  fetchHold = createPendingFlagState();
  slackTagConnected = false;
  fetchesOnOwnCredential = false;
}
//@ chunk-exfmq47h.js:926363-926390 placement
var defaultFeatureFlagClientSlots; // deferred: uses DefaultFeatureFlagClientSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:926363", () => {
  defaultFeatureFlagClientSlots = new HostScoped(() => new DefaultFeatureFlagClientSlot());
});
//@ chunk-exfmq47h.js:926390-926428 placement
function getGrowthBookState() {
  return defaultFeatureFlagClientSlots.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:926428-926534 placement
async function getFeatureFlagAuthHeaders() {
  let authHeaders = await getAuthHeadersAsync({
    envBearerFallbackFor: envBearerFallbackMarker(),
  });
  return !authHeaders.error && shouldUseEnvBearerFallback()
    ? {
        headers: {},
      }
    : stripNonAnthropicApiKeyHeader(authHeaders);
}
//@ chunk-exfmq47h.js:926534-926594 layout
function shouldUseEnvBearerFallback() {
  return (
    isRemoteManagedEnvironment() &&
    isEnvTruthy(env.IS_SANDBOX) &&
    hasEnvBearerFallback(envBearerFallbackMarker(profileFlagHost()))
  );
}
//@ chunk-exfmq47h.js:926594-926679 placement
function stripNonAnthropicApiKeyHeader(authHeaders) {
  let { "x-api-key": apiKey, ...rest } = authHeaders.headers;
  return apiKey && !apiKeyForHost(apiKey)
    ? {
        ...authHeaders,
        headers: rest,
      }
    : authHeaders;
}
//@ chunk-exfmq47h.js:926679-926726 placement
function hasFeatureFlagClientHeldCredential() {
  return getGrowthBookClient().hasHeldCredential();
}
//@ chunk-exfmq47h.js:926726-926751 placement
var EMPTY_GLOBAL_CONFIG; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:926726", () => {
  EMPTY_GLOBAL_CONFIG = Object.freeze({});
});
//@ chunk-exfmq47h.js:926751-926792 placement
function readGlobalConfigForFlags() {
  return isHttpMcpServeInvocation() || usesSessionAccessToken() ? EMPTY_GLOBAL_CONFIG : getGlobalConfig();
}
//@ chunk-exfmq47h.js:926792-927460 placement
/**
 * GrowthBook 客户端依赖：是否启用、信任检查、认证头、用户属性、读写全局配置缓存 cachedGrowthBookFeatures、环境覆盖 CLAUDE_INTERNAL_FC_OVERRIDES、曝光上报 logGrowthBookExperimentTo1P、刷新节奏。
 */
function createGrowthBookDeps(growthBookState) {
  return {
    isEnabled: () => isGrowthBookEnabled(),
    isDiskCacheReadableWhileDisabled: () => isDiskCacheReadableWhileDisabled(),
    hasWorkspaceTrust: () => hasWorkspaceTrust() || growthBookState.fetchesOnOwnCredential,
    isFetchHeld: () => isPendingNotOver(growthBookState.fetchHold),
    getAuthHeaders: getFeatureFlagAuthHeaders,
    refreshOAuthTokenIfNeeded: (credentials, storageV5) =>
      checkAndRefreshOAuthTokenIfNeeded({
        credentials,
        storageV5,
      }),
    getUserAttributes: () => getUserAttributes_3(),
    rereadUserAttributes: () => {
      clearWIFAccountInfoCache();
      resetUserData();
      initCoreUserData();
      return getUserAttributes_3();
    },
    readGlobalConfig: readGlobalConfigForFlags,
    saveGlobalConfig: (updater, storageV5) => {
      if (!isHttpMcpServeInvocation()) saveGlobalConfig(updater, storageV5);
    },
    skipsSavingUnchangedFetch: () => env.CLAUDE_CODE_REMOTE === true || isPlainNonInteractive(),
    fetchesSignedOut: shouldUseEnvBearerFallback,
    readEnvironmentOverrides: () => env.CLAUDE_INTERNAL_FC_OVERRIDES,
    profileFlagHost,
    logExposure: (exposure) => isHttpMcpServeInvocation() || logGrowthBookExperimentTo1P(exposure),
    fetchRemoteEvalFromSdk: postGrowthBookEvalAlias,
    getRefreshCadence: () => getRefreshConfig(),
    sleep: (ms, signal, opts) => sleep(ms, signal, opts),
  };
}
//@ chunk-exfmq47h.js:927460-927548 placement
/**
 * 取（必要时创建）GrowthBook 客户端包装，依赖由 buildGrowthBookClientDeps 提供。
 */
function getGrowthBookClient() {
  let growthBookState = getGrowthBookState();
  if (growthBookState.client === null) {
    installProxyFetchForGrowthBook();
    growthBookState.client = new GrowthBookClientHolder(createGrowthBookDeps(growthBookState));
  }
  return growthBookState.client;
}
//@ chunk-exfmq47h.js:927548-928789 placement
/**
 * 用指定 Bearer 令牌临时创建 GrowthBook 客户端读取单个特性（只认服务器下发的 payload），完成后销毁。
 */
async function fetchFeatureValueServedToBearer(
  featureKey,
  fallback,
  bearer,
  identity,
  sdkInitTimeoutMs,
  options = {},
) {
  if (!isFirstPartyProvider())
    return {
      served: false,
    };
  installProxyFetchForGrowthBook();
  let getUserAttributes = options.getUserAttributes ?? getUserAttributes_3;
  let readAttributes = () => {
    let {
      id,
      sessionId,
      deviceID,
      platform,
      apiBaseUrlHost,
      userType,
      appVersion,
      githubActionsMetadata,
      releaseChannel,
      entrypoint,
      sessionOrigin,
      ccrDerivedSurface,
    } = getUserAttributes();
    return {
      id,
      sessionId,
      deviceID,
      platform,
      apiBaseUrlHost,
      userType,
      appVersion,
      githubActionsMetadata,
      releaseChannel,
      entrypoint,
      sessionOrigin,
      ccrDerivedSurface,
      accountUUID: identity.accountUuid,
      organizationUUID: identity.organizationUuid,
      email: undefined,
    };
  };
  let deps = {
    ...createGrowthBookDeps(getGrowthBookState()),
    hasWorkspaceTrust: () => true,
    getAuthHeaders: async () => ({
      headers: {
        Authorization: `Bearer ${bearer}`,
        "anthropic-beta": OAUTH_BETA_HEADER,
      },
    }),
    refreshOAuthTokenIfNeeded: async () => false,
    saveGlobalConfig: () => {},
    logExposure: () => false,
    profileFlagHost: () => {
      return;
    },
    sdkCachePartition: `served-to-bearer:${randomUUID()}`,
    sdkInitTimeoutMs,
    ...options,
    getUserAttributes: readAttributes,
    rereadUserAttributes: readAttributes,
  };
  let holder = new GrowthBookClientHolder(deps);
  try {
    await withDeadline(
      holder.initialize().then(
        () => {
          return;
        },
        () => {
          return;
        },
      ),
      sdkInitTimeoutMs,
    );
    let { value, source } = holder.getFeatureValueWithSource(featureKey, fallback);
    return source === "payload"
      ? {
          served: true,
          value,
        }
      : {
          served: false,
        };
  } catch {
    return {
      served: false,
    };
  } finally {
    holder.dispose();
    if (helpers.fetchRemoteEvalCall === deps.fetchRemoteEvalFromSdk) {
      helpers.fetchRemoteEvalCall = postGrowthBookEvalAlias;
      getGrowthBookState().client?.reclaimRemoteEvalHook();
    }
  }
}
//@ chunk-exfmq47h.js:928789-928849 placement
function setGrowthBookCredentials(credentials) {
  if (credentials === undefined) return;
  getGrowthBookClient().setCredentials(credentials);
}
//@ chunk-exfmq47h.js:928849-928912 placement
function setGrowthBookStorageBackend(storageV5) {
  if (storageV5 === undefined) return;
  getGrowthBookClient().setStorageBackend(storageV5);
}
//@ chunk-exfmq47h.js:928912-928961 placement
function answerNextGrowthBookRemoteEvalWith(answerer) {
  getGrowthBookClient().answerNextRemoteEvalWith(answerer);
}
//@ chunk-exfmq47h.js:928961-929001 placement
/**
 * GrowthBook 拉取前的信任检查：项目已信任、会话信任或非交互会话。
 */
function hasWorkspaceTrust() {
  return checkHasTrustDialogAccepted() || getSessionTrustAccepted() || getIsNonInteractiveSession();
}
//@ chunk-exfmq47h.js:929001-929172 placement
function allowFlagFetchOnOwnCredential() {
  let auth = stripNonAnthropicApiKeyHeader(
    getAuthHeaders({
      envBearerFallbackFor: envBearerFallbackMarker(),
    }),
  );
  let allowed =
    getConfiguredApiKeyHelper() === undefined &&
    !shouldUseWIFAuth() &&
    auth.error === undefined &&
    Object.keys(auth.headers).length > 0;
  getGrowthBookState().fetchesOnOwnCredential = allowed;
  return allowed;
}
//@ chunk-exfmq47h.js:929172-929212 placement
function onGrowthBookRefresh(listener) {
  return getGrowthBookClient().onRefresh(listener);
}
//@ chunk-exfmq47h.js:929212-929266 placement
function hasGrowthBookEnvOverride(key) {
  return getGrowthBookClient().hasEnvironmentOverride(key);
}
//@ chunk-exfmq47h.js:929266-929309 placement
function hasGrowthBookOverride(key) {
  return getGrowthBookClient().hasOverride(key);
}
//@ chunk-exfmq47h.js:929309-929364 placement
function isFeatureFromExperiment(featureKey) {
  return getGrowthBookClient().isFeatureFromExperiment(featureKey);
}
//@ chunk-exfmq47h.js:929364-929407 placement
/**
 * 返回当前所有 GrowthBook 特性值（含覆盖）。
 */
function getAllGrowthBookFeatures() {
  return getGrowthBookClient().getAllFeatures();
}
//@ chunk-exfmq47h.js:929407-929512 placement
function isGrowthBookCacheEmpty() {
  return (
    !getGrowthBookClient().hasFreshFeatures() &&
    Object.keys(readGlobalConfigForFlags().cachedGrowthBookFeatures ?? {}).length === 0
  );
}
//@ chunk-exfmq47h.js:929512-929557 placement
function hasFreshGrowthBookFeatures() {
  return getGrowthBookClient().hasFreshFeatures();
}
//@ chunk-exfmq47h.js:929557-929599 placement
function getGrowthBookOkFetchCount() {
  return getGrowthBookClient().okFetchCount();
}
//@ chunk-exfmq47h.js:929599-929645 placement
function getGrowthBookClientIdentity() {
  return getGrowthBookClient().builtForIdentity();
}
//@ chunk-exfmq47h.js:929645-929668 placement
function claimsOfGrowthBookPayloadFetchedWith(authBearer) {
  return;
}
//@ chunk-exfmq47h.js:929668-929693 placement
/**
 * 恒为 false 的占位开关读取。
 */
function rebuildGrowthBookClientToClaimOtherThan(claim) {
  return false;
}
//@ chunk-exfmq47h.js:929693-929743 placement
function isGrowthBookInitializeInFlight() {
  return getGrowthBookClient().isInitializeInFlight();
}
//@ chunk-exfmq47h.js:929743-929793 placement
function hasGrowthBookInitializeStarted() {
  return getGrowthBookClient().hasInitializeStarted();
}
//@ chunk-exfmq47h.js:929793-929815 placement
function profileFlagHost() {
  return;
}
//@ chunk-exfmq47h.js:929815-929865 placement
function hasGrowthBookUsedNonDefaultHost() {
  return getGrowthBookClient().hasUsedNonDefaultHost();
}
//@ chunk-exfmq47h.js:929865-929919 placement
function getNonDefaultFeatureKeys() {
  return getGrowthBookClient().getNonDefaultFeatureKeys();
}
//@ chunk-exfmq47h.js:929919-929967 placement
function getGrowthBookConfigOverrides() {
  return getGrowthBookClient().getConfigOverrides();
}
//@ chunk-exfmq47h.js:929967-930013 placement
function setGrowthBookConfigOverride(key, value) {
  getGrowthBookClient().setConfigOverride(key, value);
}
//@ chunk-exfmq47h.js:930013-930056 placement
function clearGrowthBookConfigOverrides() {
  getGrowthBookClient().clearConfigOverrides();
}
//@ chunk-exfmq47h.js:930056-930104 placement
/**
 * GrowthBook 是否启用：未设 DISABLE_GROWTHBOOK 且允许 1P 事件（隐私级别 default、第一方）。
 */
function isGrowthBookEnabled() {
  return !env.DISABLE_GROWTHBOOK && is1PEventLoggingEnabled();
}
//@ chunk-exfmq47h.js:930104-930208 placement
function isDiskCacheReadableWhileDisabled() {
  return (
    env.CLAUDE_CODE_GB_DISK_CACHE_WHEN_TELEMETRY_OFF &&
    !env.DISABLE_GROWTHBOOK &&
    isTelemetryDisabled() &&
    isFirstPartyProvider()
  );
}
//@ chunk-exfmq47h.js:930208-930349 placement (2.1.88 match: getApiBaseUrlHost, 1)
function getApiBaseUrlHost() {
  let baseUrl = env.ANTHROPIC_BASE_URL;
  if (!baseUrl || isCcsTenant()) return;
  try {
    let host = new URL(baseUrl).host;
    return host === "api.anthropic.com" ? undefined : host;
  } catch {
    return;
  }
}
//@ chunk-exfmq47h.js:930349-932797 placement
/**
 * GrowthBook 用户属性：deviceId、sessionId、platform、apiBaseUrlHost、organizationUUID、accountUUID、userType、subscriptionType、rateLimitTier、organizationRole、subscriptionCreatedAt、email、appVersion、entrypoint、releaseChannel 等；宿主托管时用 CLAUDE_CODE_ACCOUNT_UUID 等 env。
 */
function getUserAttributes_3() {
  if (isHttpMcpServeInvocation()) {
    let CLAUDE_CODE_ACCOUNT_UUID = env.CLAUDE_CODE_ACCOUNT_UUID;
    let CLAUDE_CODE_ORGANIZATION_UUID = env.CLAUDE_CODE_ORGANIZATION_UUID;
    return getUserAttributes_2({
      deviceId: CLAUDE_CODE_ACCOUNT_UUID ?? CLAUDE_CODE_ORGANIZATION_UUID ?? getSessionId(),
      sessionId: getSessionId(),
      platform: getHostPlatformForAnalytics(),
      apiBaseUrlHost: getApiBaseUrlHost(),
      organizationUuid: CLAUDE_CODE_ORGANIZATION_UUID,
      accountUuid: CLAUDE_CODE_ACCOUNT_UUID,
      userType: "external",
      subscriptionType: env.CLAUDE_CODE_SUBSCRIPTION_TYPE,
      rateLimitTier: env.CLAUDE_CODE_RATE_LIMIT_TIER,
      organizationRole: undefined,
      subscriptionCreatedAtMs: NaN,
      firstTokenTime: undefined,
      email: undefined,
      appVersion: {
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
      githubActionsMetadata: undefined,
      releaseChannel: undefined,
      entrypoint: getEntrypointKind(),
      sessionOrigin: env.CLAUDE_CODE_SESSION_ORIGIN,
      ccrDerivedSurface: undefined,
      atisPin: undefined,
      hasUsedRemoteSession: undefined,
      hasRemoteEnvironment: undefined,
      slackTagConnected: false,
    });
  }
  let account = gitUserEmail();
  let userAttrs = undefined;
  let email = account.email;
  let autoUpdatesChannel = getInitialSettings()?.autoUpdatesChannel;
  let releaseChannel = undefined;
  let apiBaseUrlHost = getApiBaseUrlHost();
  let entrypoint = getEntrypointKind();
  let sessionOrigin = env.CLAUDE_CODE_SESSION_ORIGIN;
  let ccrDerivedSurface = isDiskless() && isCoworkAny() ? getCcrDerivedSurface() : undefined;
  let clientDataAtis = getClientDataAtis();
  let fallback = undefined;
  let lower = normalizeUuidOrNull(env.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();
  let lower_2 = normalizeUuidOrNull(env.CLAUDE_CODE_ORGANIZATION_UUID)?.toLowerCase();
  let lowerAttrs =
    (lower !== undefined || lower_2 !== undefined) &&
    isClaudeAIOAuthTokenHostInjected() &&
    getAuthenticatedAccountInfo() === undefined;
  let accountUuid =
    (lowerAttrs && lower) || account.accountUuid || env.CLAUDE_CODE_ACCOUNT_UUID || fallback?.accountUuid;
  let extraAttrs =
    (lowerAttrs && lower_2) ||
    account.organizationUuid ||
    env.CLAUDE_CODE_ORGANIZATION_UUID ||
    fallback?.organizationUuid ||
    userAttrs?.organizationUuid ||
    undefined;
  let oauthAccount = getGlobalConfig().oauthAccount;
  let result =
    (accountUuid === undefined || accountUuid === oauthAccount?.accountUuid) &&
    (extraAttrs === undefined || extraAttrs === oauthAccount?.organizationUuid);
  let organizationRole = result ? oauthAccount?.organizationRole : undefined;
  let subscriptionCreatedAt = result ? oauthAccount?.subscriptionCreatedAt : undefined;
  let subscriptionCreatedAtMs = subscriptionCreatedAt
    ? Date.parse(
        /(z|[+-]\d{2}:?\d{2})$/i.test(subscriptionCreatedAt)
          ? subscriptionCreatedAt
          : subscriptionCreatedAt + "Z",
      )
    : NaN;
  return getUserAttributes_2({
    deviceId: account.deviceId,
    sessionId: account.sessionId,
    platform: account.platform,
    apiBaseUrlHost,
    organizationUuid: extraAttrs,
    accountUuid,
    userType: account.userType,
    subscriptionType: account.subscriptionType,
    rateLimitTier: account.rateLimitTier,
    organizationRole,
    subscriptionCreatedAtMs,
    firstTokenTime: account.firstTokenTime,
    email,
    appVersion: account.appVersion,
    githubActionsMetadata: account.githubActionsMetadata,
    releaseChannel,
    entrypoint,
    sessionOrigin,
    ccrDerivedSurface,
    atisPin: clientDataAtis ? atisPin(clientDataAtis) : undefined,
    hasUsedRemoteSession: getCurrentProjectConfig().hasUsedRemoteSession,
    hasRemoteEnvironment: getGlobalConfig().hasRemoteEnvironment,
    ...false,
    slackTagConnected: getGrowthBookState().slackTagConnected,
  });
}
//@ chunk-exfmq47h.js:932797-932913 placement
function setSlackTagConnectedAttribute(connected) {
  let growthBookState = getGrowthBookState();
  if (growthBookState.slackTagConnected === connected) return;
  growthBookState.slackTagConnected = connected;
  refreshGrowthBookAfterAuthChange({
    preserveLoggedExposures: true,
  });
}
//@ chunk-exfmq47h.js:932913-932952 placement
/**
 * 初始化 GrowthBook 客户端（remoteEval，clientKey sdk-zAZezfDKGoZuXXKe，apiHost 默认 https://api.anthropic.com），失败不抛错。
 */
function initializeGrowthBook() {
  return getGrowthBookClient().initialize();
}
//@ chunk-exfmq47h.js:932952-933017 placement
async function getFeatureValue_DEPRECATED(key, fallback) {
  return getGrowthBookClient().getFeatureValueBlocking(key, fallback);
}
//@ chunk-exfmq47h.js:933017-933077 placement
/**
 * 读取特性值并返回来源（payload/override/disabled/fallback/disk）。
 */
function getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, fallback) {
  return getGrowthBookClient().getFeatureValueWithSource(key, fallback);
}
//@ chunk-exfmq47h.js:933077-933114 placement
/**
 * 读 GrowthBook 开关的 value（大量模块使用，最常用的是从 growthbook.ts）。
 */
function getFeatureValue_CACHED_MAY_BE_STALE(key, fallback) {
  return getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, fallback).value;
}
//@ chunk-exfmq47h.js:933114-933217 placement
/**
 * 读取特性值并在本进程内钉住，后续刷新不再改变。
 */
function getFeatureValue_SESSION_PINNED(key, fallback) {
  let pinned = (getSessionFeatureValues().pinnedFeatureValues ??= new Map());
  if (!pinned.has(key)) pinned.set(key, getFeatureValue_CACHED_MAY_BE_STALE(key, fallback));
  return pinned.get(key);
}
//@ chunk-exfmq47h.js:933217-933273 placement
function peekSessionPinnedFeatureValue(key) {
  return getSessionFeatureValues().pinnedFeatureValues?.get(key);
}
//@ chunk-exfmq47h.js:933273-933355 placement
function peekFeatureValue_SESSION_PINNED(key, fallback) {
  let pinnedFeatureValues = getSessionFeatureValues().pinnedFeatureValues;
  return pinnedFeatureValues?.has(key)
    ? pinnedFeatureValues.get(key)
    : getFeatureValue_CACHED_MAY_BE_STALE(key, fallback);
}
//@ chunk-exfmq47h.js:933355-933388 placement
function getFeatureValue_CACHED_WITH_REFRESH(key, fallback, refresh) {
  return getFeatureValue_CACHED_MAY_BE_STALE(key, fallback);
}
//@ chunk-exfmq47h.js:933388-933450 placement
/**
 * 门开关检查：有缓存用缓存，否则阻塞等待 GrowthBook 初始化。
 */
async function checkGate_CACHED_OR_BLOCKING(key) {
  return getGrowthBookClient().checkGateCachedOrBlocking(key);
}
//@ chunk-exfmq47h.js:933450-933495 placement
async function checkGate_OWN_OFF_FIRST(key) {
  return isGateOffInOwnEvaluation(key) ? false : checkGate_CACHED_OR_BLOCKING(key);
}
//@ chunk-exfmq47h.js:933495-933563 placement
function isGateOffInOwnEvaluation(key) {
  let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, false);
  return value !== true && isServedFeatureSource(source);
}
//@ chunk-exfmq47h.js:933563-933689 placement
/**
 * 判断特性值来源是否可信：payload/override/disabled 可信，fallback 仅在有新鲜特性时可信，disk 缓存不可信。
 */
function isServedFeatureSource(source) {
  switch (source) {
    case "payload":
    case "override":
    case "disabled":
      return true;
    case "fallback":
      return hasFreshGrowthBookFeatures();
    case "disk":
      return false;
  }
}
//@ chunk-exfmq47h.js:933689-933735 placement
/**
 * 登录状态变化后让 GrowthBook 以新身份重新拉取特性。
 */
function refreshGrowthBookAfterAuthChange(options) {
  getGrowthBookClient().refreshAfterAuthChange(options);
}
//@ chunk-exfmq47h.js:933735-933861 placement
function resetGrowthBook(options) {
  let growthBookState = getGrowthBookState();
  if (growthBookState.client === null) return;
  if (options === undefined) {
    growthBookState.client.dispose();
    growthBookState.client = null;
    return;
  }
  growthBookState.client.reset(options);
}
//@ chunk-exfmq47h.js:933861-934189 placement
/**
 * GrowthBook 定时刷新间隔：tengu_gb_refresh_interval_minutes（限 5–360 分钟，±10% 抖动），未设时 360 分钟。
 */
function getRefreshConfig() {
  let defaultMinutes = 360;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_gb_refresh_interval_minutes",
    null,
  );
  if (featureValue_CACHED_MAY_BE_STALE === null)
    return {
      intervalMs: defaultMinutes * 60 * 1000,
      flagged: false,
    };
  let raw =
    typeof featureValue_CACHED_MAY_BE_STALE === "string"
      ? Number(featureValue_CACHED_MAY_BE_STALE)
      : featureValue_CACHED_MAY_BE_STALE;
  let minutes =
    typeof raw === "number" && Number.isFinite(raw) && raw > 0
      ? Math.min(Math.max(raw, 5), 360)
      : defaultMinutes;
  return {
    intervalMs: Math.round(Math.min(minutes * (0.9 + Math.random() * 0.2), 360) * 60 * 1000),
    flagged: true,
  };
}
//@ chunk-exfmq47h.js:934189-934209 placement
var ATIS_REQUEST_HEADER = "x-cc-atis";
//@ chunk-exfmq47h.js:934209-934289 placement
function getClientDataAtis() {
  let atis = getCachedClientData()?.atis;
  return typeof atis === "string" && atis.length > 0 ? atis : undefined;
}
//@ chunk-exfmq47h.js:934289-934408 placement
function atisPin(clientDataAtis) {
  let [version, pin, ...rest] = clientDataAtis.split(".");
  return version === "v1" &&
    pin !== undefined &&
    pin !== "" &&
    rest.length === 3 &&
    rest.every((part) => part !== "")
    ? pin
    : clientDataAtis;
}
//@ chunk-exfmq47h.js:934408-934457 placement
function isSereneTeacupEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_serene_teacup", true);
}
//@ chunk-exfmq47h.js:934457-934524 placement
function refreshGrowthBookAfterBootstrap() {
  try {
    if (isSereneTeacupEnabled()) getGrowthBookClient().refreshAtisPin();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-exfmq47h.js:934524-934573 placement
function isConversationAtisLatchEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kestrel_moor", true);
}
//@ chunk-exfmq47h.js:934573-934677 placement
function getRequestAtis() {
  if (!isConversationAtisLatchEnabled()) return getClientDataAtis();
  let conversationAtisLatch = getConversationAtisLatch();
  if (conversationAtisLatch === undefined) return getClientDataAtis();
  return conversationAtisLatch.length > 0 ? conversationAtisLatch : undefined;
}
//@ chunk-exfmq47h.js:934677-934771 placement
function latchConversationAtis() {
  if (getConversationAtisLatch() === undefined) {
    let clientDataAtis = getClientDataAtis();
    setConversationAtisLatch(
      clientDataAtis !== undefined && /^[\x21-\x7e]+$/.test(clientDataAtis) ? clientDataAtis : "",
    );
  }
}
//@ chunk-exfmq47h.js:934771-934821 placement
/**
 * 立即刷新 GrowthBook 特性。
 */
async function refreshGrowthBookFeatures() {
  return getGrowthBookClient().refreshFeatures();
}
//@ chunk-exfmq47h.js:934821-934864 placement
function setupPeriodicGrowthBookRefresh() {
  getGrowthBookClient().startPeriodicRefresh();
}
//@ chunk-exfmq47h.js:934864-934914 placement
function stopPeriodicGrowthBookRefresh() {
  getGrowthBookState().client?.stopPeriodicRefresh();
}
//@ chunk-exfmq47h.js:934914-934953 placement
/**
 * 阻塞等待 GrowthBook 初始化后读取特性值。
 */
async function getDynamicConfig_BLOCKS_ON_INIT(key, fallback) {
  return getFeatureValue_DEPRECATED(key, fallback);
}
//@ chunk-exfmq47h.js:934953-934984 placement (2.1.88 match: getDynamicConfig_CACHED_MAY_BE_STALE, 0)
/**
 * 读取 GrowthBook 动态配置（对象值特性），可能来自磁盘缓存。
 */
function getDynamicConfig_CACHED_MAY_BE_STALE(configName, defaultValue) {
  return getFeatureValue_CACHED_MAY_BE_STALE(configName, defaultValue);
}
//@ chunk-exfmq47h.js:934984-934991 placement
// deferred: uses swapRemoteGateReader (../../utils/accessibility/screenReader.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:934984", () => {
  swapRemoteGateReader(getFeatureValue_CACHED_MAY_BE_STALE);
});
//@ chunk-exfmq47h.js:934991-934997 placement
// deferred: uses registerSteerFeature (../../utils/model/subagentSteer.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:934991", () => {
  registerSteerFeature(getFeatureValue_CACHED_MAY_BE_STALE);
});
//@ chunk-exfmq47h.js:934997-935004 placement
// deferred: uses registerVerifySkillGateReader (../projectsRelay/relayGates.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:934997", () => {
  registerVerifySkillGateReader(getFeatureValueWithSource_CACHED_MAY_BE_STALE);
});
//@ chunk-exfmq47h.js:935004-935011 placement
// deferred: uses registerCommitSkillGateReader (../projectsRelay/relayGates.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935004", () => {
  registerCommitSkillGateReader(getFeatureValueWithSource_CACHED_MAY_BE_STALE);
});
//@ chunk-exfmq47h.js:935011-935018 placement
// deferred: uses registerErrorReader (../oauth/oauthErrors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935011", () => {
  registerErrorReader(getFeatureValue_CACHED_MAY_BE_STALE);
});
//@ chunk-exfmq47h.js:935018-935024 placement
// deferred: uses setOAuthLockFlagReader (../../utils/auth/oauthRefreshLock.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935018", () => {
  setOAuthLockFlagReader(getFeatureValue_CACHED_MAY_BE_STALE);
});
//@ chunk-exfmq47h.js:935024-935030 placement
// deferred: uses setWorkerOwnerRowsReader (../../utils/messageProvenance.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935024", () => {
  setWorkerOwnerRowsReader(getFeatureValue_CACHED_MAY_BE_STALE);
});
//@ chunk-exfmq47h.js:935030-935037 placement
// deferred: uses setFeatureReader (../../utils/messageProvenance.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935030", () => {
  setFeatureReader(getFeatureValue_SESSION_PINNED);
});
//@ chunk-exfmq47h.js:935037-935043 placement
// deferred: uses registerMainGateReader (./growthbookGates.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935037", () => {
  registerMainGateReader(getFeatureValue_CACHED_MAY_BE_STALE);
});
//@ chunk-exfmq47h.js:935043-935050 placement
// deferred: uses registerServedSettingsReader (../../utils/settings/settingsSourceTrust.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935043", () => {
  registerServedSettingsReader(getFeatureValue_CACHED_MAY_BE_STALE);
});
//@ chunk-exfmq47h.js:935050-935165 placement
// deferred: uses registerGateReader (../policyLimits/index.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935050", () => {
  registerGateReader(
    () => getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ORG_CONFIG_REQUIRED, null),
    (value, source) =>
      logForDebugging(
        `org-config gate: ${TENGU_ORG_CONFIG_REQUIRED} is ${value} (${source}); loader provenance rules off`,
        {
          level: "warn",
        },
      ),
  );
});
//@ chunk-exfmq47h.js:935165-935172 placement
// deferred: uses setVerificationPredicate (../api/verificationRequired.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935165", () => {
  setVerificationPredicate(isPolicyGraceEnabled);
});
//@ chunk-exfmq47h.js:935172-935178 placement
// deferred: uses registerWarmMochiGateReader (./growthbookGates.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935172", () => {
  registerWarmMochiGateReader(getFeatureValue_CACHED_MAY_BE_STALE);
});
//@ chunk-exfmq47h.js:935178-935223 placement
// deferred: uses readWarmSunriseFlag (../../utils/bash/bashReadingFlags.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935178", () => {
  readWarmSunriseFlag((key, fallback) => ({
    ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, fallback),
    defaultHost: !hasGrowthBookUsedNonDefaultHost(),
  }));
});
//@ chunk-exfmq47h.js:935223-935268 placement
// deferred: uses registerEnvReader (../../utils/gitSafeExec.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935223", () => {
  registerEnvReader((key, fallback) => ({
    ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, fallback),
    defaultHost: !hasGrowthBookUsedNonDefaultHost(),
  }));
});
//@ chunk-exfmq47h.js:935268-935278 placement
// deferred: uses registerFeatureFlagReader (../../utils/toolCgroup.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935268", () => {
  registerFeatureFlagReader(getFeatureValue_CACHED_MAY_BE_STALE, onGrowthBookRefresh);
});
//@ chunk-exfmq47h.js:935278-935286 placement
// deferred: uses getFeatureValue_SESSION_PINNED of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935278", () => {
  swapFeatureReader(getFeatureValue_SESSION_PINNED);
});
//@ chunk-exfmq47h.js:935286-935331 placement
// deferred: uses readStagedPumpkinFlag (../../utils/bash/bashReadingFlags.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935286", () => {
  readStagedPumpkinFlag((key, fallback) => ({
    ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, fallback),
    defaultHost: !hasGrowthBookUsedNonDefaultHost(),
  }));
});
//@ chunk-exfmq47h.js:935331-935376 placement
// deferred: uses getFeatureValueWithSource_CACHED_MAY_BE_STALE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935331", () => {
  readCalmNautilusFlag((key, fallback) => ({
    ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, fallback),
    defaultHost: !hasGrowthBookUsedNonDefaultHost(),
  }));
});
//@ chunk-exfmq47h.js:935376-935421 placement
// deferred: uses readNestedRippleFlag (../../utils/bash/bashReadingFlags.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935376", () => {
  readNestedRippleFlag((key, fallback) => ({
    ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, fallback),
    defaultHost: !hasGrowthBookUsedNonDefaultHost(),
  }));
});
//@ chunk-exfmq47h.js:935421-935465 placement
// deferred: uses registerRosyElephantGateReader (./growthbookGates.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935421", () => {
  registerRosyElephantGateReader((key, fallback) => ({
    ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, fallback),
    defaultHost: !hasGrowthBookUsedNonDefaultHost(),
  }));
});
//@ chunk-exfmq47h.js:935465-935484 layout
// deferred: uses setProgramUseCaseChoiceGate (../../utils/programUseCase.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935465", () => {
  setProgramUseCaseChoiceGate(() => getFeatureValue_CACHED_MAY_BE_STALE(PROGRAM_USE_CASE_CHOICE_FLAG, false));
});
//@ chunk-exfmq47h.js:935484-935503 layout
// deferred: uses setProgramUseCaseStampGate (../../utils/programUseCase.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935484", () => {
  setProgramUseCaseStampGate(() => getFeatureValue_CACHED_MAY_BE_STALE(PROGRAM_USE_CASE_STAMP_FLAG, false));
});
//@ chunk-exfmq47h.js:935503-935548 placement
// deferred: uses registerWrapFeatureReader (../../ink/wrapAnsi.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935503", () => {
  registerWrapFeatureReader((key, fallback) => ({
    ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, fallback),
    defaultHost: !hasGrowthBookUsedNonDefaultHost(),
  }));
});
//@ chunk-exfmq47h.js:935548-935556 placement
// deferred: uses registerWrapFeatureLatches (../../ink/wrapAnsi.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935548", () => {
  registerWrapFeatureLatches(getSessionFeatureValues);
});
//@ chunk-exfmq47h.js:935556-935601 placement
// deferred: uses getFeatureValueWithSource_CACHED_MAY_BE_STALE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935556", () => {
  readTinglyPearlFlag((key, fallback) => ({
    ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, fallback),
    defaultHost: !hasGrowthBookUsedNonDefaultHost(),
  }));
});
//@ chunk-exfmq47h.js:935601-935646 placement
// deferred: uses getFeatureValueWithSource_CACHED_MAY_BE_STALE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935601", () => {
  readFoamyHeronFlag((key, fallback) => ({
    ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, fallback),
    defaultHost: !hasGrowthBookUsedNonDefaultHost(),
  }));
});
//@ chunk-exfmq47h.js:935646-935691 layout
// deferred: uses registerSetting (../../utils/bash/bashReadingFlags.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935646", () => {
  registerSetting((featureKey, fallback) => ({
    ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(featureKey, fallback),
    defaultHost: !hasGrowthBookUsedNonDefaultHost(),
  }));
});
//@ chunk-exfmq47h.js:935691-935698 placement
// deferred: uses setRemoteBrowserFlagReader (../mcp/remoteBrowserServer.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935691", () => {
  setRemoteBrowserFlagReader(getFeatureValue_CACHED_MAY_BE_STALE);
});
//@ chunk-exfmq47h.js:935698-935743 placement
// deferred: uses installNestedRippleReader2 (../../utils/bash/bashReadingFlags.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:935698", () => {
  installNestedRippleReader2((key, fallback) => ({
    ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(key, fallback),
    defaultHost: !hasGrowthBookUsedNonDefaultHost(),
  }));
});
//@ chunk-jynns2s2.js:6522-6650 fingerprint (2.1.88 match: resetGrowthBook, 0.627)
async function resetGrowthBook_2(reason) {
  process.removeAllListeners("beforeExit");
  process.removeAllListeners("exit");
  await flushBeforeExec();
  emitExitMessage(reason);
  process.exit(1);
}
export {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
  getDynamicConfig_BLOCKS_ON_INIT,
  envBearerFallbackMarker,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  PLUGIN_HOOKS_MODULES_GATE,
  isGrowthBookEnabled,
  hasFeatureFlagClientHeldCredential,
  hasGrowthBookUsedNonDefaultHost,
  initializeGrowthBook,
  hasFreshGrowthBookFeatures,
  resetGrowthBook,
  resetUserData,
  checkGate_CACHED_OR_BLOCKING,
  isServedFeatureSource,
  refreshGrowthBookFeatures,
  getGrowthBookOkFetchCount,
  onGrowthBookRefresh,
  refreshGrowthBookAfterAuthChange,
  getAllGrowthBookFeatures,
  fetchFeatureValueServedToBearer,
  isGrowthBookCacheEmpty,
  nonEmptyName,
  peekSessionPinnedFeatureValue,
  getClientDataAtis,
  atisPin,
  getDynamicConfig_CACHED_MAY_BE_STALE,
  hasGrowthBookOverride,
  getGitEmail,
  gitUserName,
  getRequestAtis,
  ATIS_REQUEST_HEADER,
  getFeatureValue_CACHED_WITH_REFRESH,
  refreshGrowthBookAfterBootstrap,
  hasGrowthBookEnvOverride,
  hasWorkspaceTrust,
  initCoreUserData,
  isGrowthBookInitializeInFlight,
  isGateOffInOwnEvaluation,
  hasGrowthBookInitializeStarted,
  getGrowthBookClientIdentity,
  getFeatureValue_DEPRECATED,
  setGrowthBookCredentials,
  setGrowthBookStorageBackend,
  checkGate_OWN_OFF_FIRST,
  emptyAccountIdentity,
  PRE_INIT_FALLBACK_TIMEOUT_MS,
  PRE_INIT_OAUTH_REASON,
  DEFAULT_GROWTHBOOK_HOST,
  PRE_INIT_KEY_HELPER_TIMEOUT_MS,
  PRE_INIT_OAUTH_TIMEOUT_MS,
  buildCoreUserData,
  allowFlagFetchOnOwnCredential,
  getUserAttributes_3,
  resetGrowthBook_2,
  getNonDefaultFeatureKeys,
  latchConversationAtis,
  stopPeriodicGrowthBookRefresh,
  defaultFeatureFlagClientSlots,
  DefaultFeatureFlagClientSlot,
  answerNextGrowthBookRemoteEvalWith,
  claimsOfGrowthBookPayloadFetchedWith,
  clearGrowthBookConfigOverrides,
  getApiBaseUrlHost,
  getFeatureFlagAuthHeaders,
  getGrowthBookConfigOverrides,
  getRefreshConfig,
  isConversationAtisLatchEnabled,
  isDiskCacheReadableWhileDisabled,
  isFeatureFromExperiment,
  peekFeatureValue_SESSION_PINNED,
  profileFlagHost,
  readGlobalConfigForFlags,
  rebuildGrowthBookClientToClaimOtherThan,
  setGrowthBookConfigOverride,
  setSlackTagConnectedAttribute,
  setupPeriodicGrowthBookRefresh,
};
