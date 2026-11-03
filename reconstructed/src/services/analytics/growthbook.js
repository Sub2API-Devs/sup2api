/**
 * services/analytics/growthbook.ts
 *
 * GrowthBook 特性开关客户端：remoteEval 拉取、用户属性、磁盘缓存 cachedGrowthBookFeatures、env 覆盖、定时刷新与各种取值接口。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/analytics/growthbook.ts
 * pieces: chunk-aepeg2w5.js (112)
 * attribution: placement 111, fingerprint 1
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
import { env, getHostPlatformForAnalytics } from "../../utils/env.js";
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
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
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
import { registerWrapFeatureReader, registerWrapFeatureLatches } from "../../ink/wrapAnsi.js";
import { setRemoteBrowserFlagReader } from "../mcp/remoteBrowserServer.js";

//@ chunk-aepeg2w5.js:629737-629749 placement
var coreUserDataCache = null;
//@ chunk-aepeg2w5.js:629749-629785 placement
function coreUserData() {
  coreUserDataCache ??= new getCoreUserData();
  return coreUserDataCache;
}
//@ chunk-aepeg2w5.js:629785-629819 placement
/**
 * 导出函数 `initCoreUserData`：返回 Yi().init()。
 */
function initCoreUserData() {
  return coreUserData().init();
}
//@ chunk-aepeg2w5.js:629819-629846 placement
/**
 * 重置用户数据缓存与读取 git 邮箱/用户名的辅助函数。
 */
function resetUserData() {
  coreUserData().reset();
}
//@ chunk-aepeg2w5.js:629846-629889 placement
function buildCoreUserData(e) {
  return coreUserData().coreUserData(e);
}
//@ chunk-aepeg2w5.js:629889-629917 placement
function gitUserEmail() {
  return buildCoreUserData(true);
}
//@ chunk-aepeg2w5.js:629917-629955 placement
/**
 * git 用户邮箱。
 */
function getGitEmail() {
  return coreUserData().gitEmail();
}
//@ chunk-aepeg2w5.js:629955-629996 placement
/**
 * 导出函数 `gitUserName`：返回 Yi().gitUserName()。
 */
function gitUserName() {
  return coreUserData().gitUserName();
}
//@ chunk-aepeg2w5.js:629996-630005 placement
var MIN_NAME_LENGTH = 8;
//@ chunk-aepeg2w5.js:630005-630070 placement
function nonEmptyName(e) {
  return typeof e === "string" && e.length >= MIN_NAME_LENGTH ? e : undefined;
}
//@ chunk-aepeg2w5.js:630070-630106 placement
/**
 * 开关 tengu_plugin_hooks_modules 的名字。
 */
var PLUGIN_HOOKS_MODULES_GATE = "tengu_plugin_hooks_modules";
//@ chunk-aepeg2w5.js:630106-630185 placement
function emptyAccountIdentity(e) {
  return {
    accountUuid: undefined,
    organizationUuid: undefined,
    email: undefined,
  };
}
//@ chunk-aepeg2w5.js:630185-630253 placement
/**
 * GrowthBook 初始化前的 OAuth/密钥助手等待时长（60 s / 5 s / 5 s）与原因标记。
 */
var PRE_INIT_OAUTH_TIMEOUT_MS = 60000;
var PRE_INIT_KEY_HELPER_TIMEOUT_MS = 5000;
var PRE_INIT_FALLBACK_TIMEOUT_MS = 5000;
var PRE_INIT_OAUTH_REASON = "GrowthBook pre-init OAuth refresh";
//@ chunk-aepeg2w5.js:630253-630279 placement
/**
 * 导出函数 `envBearerFallbackMarker`：参数 e，返回 getGrowthBookClient_2。
 */
function envBearerFallbackMarker(e) {
  return getGrowthBookClient_2;
}
//@ chunk-aepeg2w5.js:630279-630315 placement
var getGrowthBookClient_2 = "https://api.anthropic.com/";
//@ chunk-aepeg2w5.js:902197-903375 fingerprint = getUserAttributes (0.623)
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
//@ chunk-aepeg2w5.js:903375-903385 placement
var postGrowthBookEvalAlias = postGrowthBookEval;
//@ chunk-aepeg2w5.js:903385-903469 placement
class DefaultFeatureFlagClientSlot {
  client = null;
  fetchHold = createPendingFlagState();
  slackTagConnected = false;
  fetchesOnOwnCredential = false;
}
//@ chunk-aepeg2w5.js:903469-903496 placement
var defaultFeatureFlagClientSlots = new HostScoped(() => new DefaultFeatureFlagClientSlot());
//@ chunk-aepeg2w5.js:903496-903534 placement
function getGrowthBookState() {
  return defaultFeatureFlagClientSlots.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:903534-903613 placement
async function getFeatureFlagAuthHeaders() {
  let authHeaders = await getAuthHeadersAsync({
    envBearerFallbackFor: envBearerFallbackMarker(),
  });
  return stripNonAnthropicApiKeyHeader(authHeaders);
}
//@ chunk-aepeg2w5.js:903613-903698 placement
function stripNonAnthropicApiKeyHeader(authHeaders) {
  let { "x-api-key": n, ...r } = authHeaders.headers;
  return n && !apiKeyForHost(n)
    ? {
        ...authHeaders,
        headers: r,
      }
    : authHeaders;
}
//@ chunk-aepeg2w5.js:903698-903745 placement
function hasFeatureFlagClientHeldCredential() {
  return getGrowthBookClient().hasHeldCredential();
}
//@ chunk-aepeg2w5.js:903745-903770 placement
var V2 = Object.freeze({});
//@ chunk-aepeg2w5.js:903770-903811 placement
function readGlobalConfigForFlags() {
  return isHttpMcpServeInvocation() || usesSessionAccessToken() ? V2 : getGlobalConfig();
}
//@ chunk-aepeg2w5.js:903811-904453 placement
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
    saveGlobalConfig: (n, r) => {
      if (!isHttpMcpServeInvocation()) saveGlobalConfig(n, r);
    },
    skipsSavingUnchangedFetch: () => env.CLAUDE_CODE_REMOTE === true,
    readEnvironmentOverrides: () => env.CLAUDE_INTERNAL_FC_OVERRIDES,
    profileFlagHost,
    logExposure: (n) => isHttpMcpServeInvocation() || logGrowthBookExperimentTo1P(n),
    fetchRemoteEvalFromSdk: postGrowthBookEvalAlias,
    getRefreshCadence: () => getRefreshConfig(),
    sleep: (n, r, s) => sleep(n, r, s),
  };
}
//@ chunk-aepeg2w5.js:904453-904541 placement
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
//@ chunk-aepeg2w5.js:904541-905782 placement
/**
 * 用指定 Bearer 令牌临时创建 GrowthBook 客户端读取单个特性（只认服务器下发的 payload），完成后销毁。
 */
async function fetchFeatureValueServedToBearer(e, n, r, s, h, y = {}) {
  if (!isFirstPartyProvider())
    return {
      served: false,
    };
  installProxyFetchForGrowthBook();
  let getUserAttributes = y.getUserAttributes ?? getUserAttributes_3;
  let w = () => {
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
      accountUUID: s.accountUuid,
      organizationUUID: s.organizationUuid,
      email: undefined,
    };
  };
  let deps = {
    ...createGrowthBookDeps(getGrowthBookState()),
    hasWorkspaceTrust: () => true,
    getAuthHeaders: async () => ({
      headers: {
        Authorization: `Bearer ${r}`,
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
    sdkInitTimeoutMs: h,
    ...y,
    getUserAttributes: w,
    rereadUserAttributes: w,
  };
  let x = new GrowthBookClientHolder(deps);
  try {
    await withDeadline(
      x.initialize().then(
        () => {
          return;
        },
        () => {
          return;
        },
      ),
      h,
    );
    let { value: P, source } = x.getFeatureValueWithSource(e, n);
    return source === "payload"
      ? {
          served: true,
          value: P,
        }
      : {
          served: false,
        };
  } catch {
    return {
      served: false,
    };
  } finally {
    x.dispose();
    if (helpers.fetchRemoteEvalCall === deps.fetchRemoteEvalFromSdk) {
      helpers.fetchRemoteEvalCall = postGrowthBookEvalAlias;
      getGrowthBookState().client?.reclaimRemoteEvalHook();
    }
  }
}
//@ chunk-aepeg2w5.js:905782-905842 placement
function setGrowthBookCredentials(e) {
  if (e === undefined) return;
  getGrowthBookClient().setCredentials(e);
}
//@ chunk-aepeg2w5.js:905842-905905 placement
function setGrowthBookStorageBackend(e) {
  if (e === undefined) return;
  getGrowthBookClient().setStorageBackend(e);
}
//@ chunk-aepeg2w5.js:905905-905954 placement
function answerNextGrowthBookRemoteEvalWith(e) {
  getGrowthBookClient().answerNextRemoteEvalWith(e);
}
//@ chunk-aepeg2w5.js:905954-905994 placement
/**
 * GrowthBook 拉取前的信任检查：项目已信任、会话信任或非交互会话。
 */
function hasWorkspaceTrust() {
  return checkHasTrustDialogAccepted() || getSessionTrustAccepted() || getIsNonInteractiveSession();
}
//@ chunk-aepeg2w5.js:905994-906165 placement
function allowFlagFetchOnOwnCredential() {
  let e = stripNonAnthropicApiKeyHeader(
    getAuthHeaders({
      envBearerFallbackFor: envBearerFallbackMarker(),
    }),
  );
  let n =
    getConfiguredApiKeyHelper() === undefined &&
    !shouldUseWIFAuth() &&
    e.error === undefined &&
    Object.keys(e.headers).length > 0;
  getGrowthBookState().fetchesOnOwnCredential = n;
  return n;
}
//@ chunk-aepeg2w5.js:906165-906205 placement
function onGrowthBookRefresh(e) {
  return getGrowthBookClient().onRefresh(e);
}
//@ chunk-aepeg2w5.js:906205-906259 placement
function hasGrowthBookEnvOverride(e) {
  return getGrowthBookClient().hasEnvironmentOverride(e);
}
//@ chunk-aepeg2w5.js:906259-906302 placement
function hasGrowthBookOverride(e) {
  return getGrowthBookClient().hasOverride(e);
}
//@ chunk-aepeg2w5.js:906302-906357 placement
function isFeatureFromExperiment(e) {
  return getGrowthBookClient().isFeatureFromExperiment(e);
}
//@ chunk-aepeg2w5.js:906357-906400 placement
/**
 * 返回当前所有 GrowthBook 特性值（含覆盖）。
 */
function getAllGrowthBookFeatures() {
  return getGrowthBookClient().getAllFeatures();
}
//@ chunk-aepeg2w5.js:906400-906505 placement
function isGrowthBookCacheEmpty() {
  return (
    !getGrowthBookClient().hasFreshFeatures() &&
    Object.keys(readGlobalConfigForFlags().cachedGrowthBookFeatures ?? {}).length === 0
  );
}
//@ chunk-aepeg2w5.js:906505-906550 placement
function hasFreshGrowthBookFeatures() {
  return getGrowthBookClient().hasFreshFeatures();
}
//@ chunk-aepeg2w5.js:906550-906592 placement
function getGrowthBookOkFetchCount() {
  return getGrowthBookClient().okFetchCount();
}
//@ chunk-aepeg2w5.js:906592-906638 placement
function getGrowthBookClientIdentity() {
  return getGrowthBookClient().builtForIdentity();
}
//@ chunk-aepeg2w5.js:906638-906661 placement
function claimsOfGrowthBookPayloadFetchedWith(e) {
  return;
}
//@ chunk-aepeg2w5.js:906661-906686 placement
function rebuildGrowthBookClientToClaimOtherThan(e) {
  return false;
}
//@ chunk-aepeg2w5.js:906686-906736 placement
function isGrowthBookInitializeInFlight() {
  return getGrowthBookClient().isInitializeInFlight();
}
//@ chunk-aepeg2w5.js:906736-906786 placement
function hasGrowthBookInitializeStarted() {
  return getGrowthBookClient().hasInitializeStarted();
}
//@ chunk-aepeg2w5.js:906786-906808 placement
function profileFlagHost() {
  return;
}
//@ chunk-aepeg2w5.js:906808-906858 placement
function hasGrowthBookUsedNonDefaultHost() {
  return getGrowthBookClient().hasUsedNonDefaultHost();
}
//@ chunk-aepeg2w5.js:906858-906912 placement
function getNonDefaultFeatureKeys() {
  return getGrowthBookClient().getNonDefaultFeatureKeys();
}
//@ chunk-aepeg2w5.js:906912-906960 placement
function getGrowthBookConfigOverrides() {
  return getGrowthBookClient().getConfigOverrides();
}
//@ chunk-aepeg2w5.js:906960-907006 placement
function setGrowthBookConfigOverride(e, n) {
  getGrowthBookClient().setConfigOverride(e, n);
}
//@ chunk-aepeg2w5.js:907006-907049 placement
function clearGrowthBookConfigOverrides() {
  getGrowthBookClient().clearConfigOverrides();
}
//@ chunk-aepeg2w5.js:907049-907097 placement
/**
 * GrowthBook 是否启用：未设 DISABLE_GROWTHBOOK 且允许 1P 事件（隐私级别 default、第一方）。
 */
function isGrowthBookEnabled() {
  return !env.DISABLE_GROWTHBOOK && is1PEventLoggingEnabled();
}
//@ chunk-aepeg2w5.js:907097-907201 placement
function isDiskCacheReadableWhileDisabled() {
  return (
    env.CLAUDE_CODE_GB_DISK_CACHE_WHEN_TELEMETRY_OFF &&
    !env.DISABLE_GROWTHBOOK &&
    isTelemetryDisabled() &&
    isFirstPartyProvider()
  );
}
//@ chunk-aepeg2w5.js:907201-907342 placement = getApiBaseUrlHost (1)
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
//@ chunk-aepeg2w5.js:907342-909790 placement
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
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
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
  let e = gitUserEmail();
  let n = undefined;
  let email = e.email;
  let autoUpdatesChannel = getInitialSettings_2()?.autoUpdatesChannel;
  let releaseChannel = undefined;
  let apiBaseUrlHost = getApiBaseUrlHost();
  let entrypoint = getEntrypointKind();
  let sessionOrigin = env.CLAUDE_CODE_SESSION_ORIGIN;
  let ccrDerivedSurface = isDiskless() && isCoworkAny() ? getCcrDerivedSurface() : undefined;
  let clientDataAtis = getClientDataAtis();
  let P = undefined;
  let lower = normalizeUuidOrNull(env.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();
  let lower_2 = normalizeUuidOrNull(env.CLAUDE_CODE_ORGANIZATION_UUID)?.toLowerCase();
  let G =
    (lower !== undefined || lower_2 !== undefined) &&
    isClaudeAIOAuthTokenHostInjected() &&
    getAuthenticatedAccountInfo() === undefined;
  let j = (G && lower) || e.accountUuid || env.CLAUDE_CODE_ACCOUNT_UUID || P?.accountUuid;
  let ee =
    (G && lower_2) ||
    e.organizationUuid ||
    env.CLAUDE_CODE_ORGANIZATION_UUID ||
    P?.organizationUuid ||
    n?.organizationUuid ||
    undefined;
  let oauthAccount = getGlobalConfig().oauthAccount;
  let Q =
    (j === undefined || j === oauthAccount?.accountUuid) &&
    (ee === undefined || ee === oauthAccount?.organizationUuid);
  let organizationRole = Q ? oauthAccount?.organizationRole : undefined;
  let subscriptionCreatedAt = Q ? oauthAccount?.subscriptionCreatedAt : undefined;
  let subscriptionCreatedAtMs = subscriptionCreatedAt
    ? Date.parse(
        /(z|[+-]\d{2}:?\d{2})$/i.test(subscriptionCreatedAt)
          ? subscriptionCreatedAt
          : subscriptionCreatedAt + "Z",
      )
    : NaN;
  return getUserAttributes_2({
    deviceId: e.deviceId,
    sessionId: e.sessionId,
    platform: e.platform,
    apiBaseUrlHost,
    organizationUuid: ee,
    accountUuid: j,
    userType: e.userType,
    subscriptionType: e.subscriptionType,
    rateLimitTier: e.rateLimitTier,
    organizationRole,
    subscriptionCreatedAtMs,
    firstTokenTime: e.firstTokenTime,
    email,
    appVersion: e.appVersion,
    githubActionsMetadata: e.githubActionsMetadata,
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
//@ chunk-aepeg2w5.js:909790-909906 placement
function setSlackTagConnectedAttribute(e) {
  let growthBookState = getGrowthBookState();
  if (growthBookState.slackTagConnected === e) return;
  growthBookState.slackTagConnected = e;
  refreshGrowthBookAfterAuthChange({
    preserveLoggedExposures: true,
  });
}
//@ chunk-aepeg2w5.js:909906-909945 placement
/**
 * 初始化 GrowthBook 客户端（remoteEval，clientKey sdk-zAZezfDKGoZuXXKe，apiHost 默认 https://api.anthropic.com），失败不抛错。
 */
function initializeGrowthBook() {
  return getGrowthBookClient().initialize();
}
//@ chunk-aepeg2w5.js:909945-910010 placement
async function getFeatureValue_DEPRECATED(e, n) {
  return getGrowthBookClient().getFeatureValueBlocking(e, n);
}
//@ chunk-aepeg2w5.js:910010-910070 placement
/**
 * 读取特性值并返回来源（payload/override/disabled/fallback/disk）。
 */
function getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n) {
  return getGrowthBookClient().getFeatureValueWithSource(e, n);
}
//@ chunk-aepeg2w5.js:910070-910107 placement
/**
 * 读取特性值（可能来自缓存的旧值），未知时返回默认值；全局最常用的特性开关读取函数。
 */
function getFeatureValue_CACHED_MAY_BE_STALE(e, n) {
  return getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n).value;
}
//@ chunk-aepeg2w5.js:910107-910210 placement
/**
 * 读取特性值并在本进程内钉住，后续刷新不再改变。
 */
function getFeatureValue_SESSION_PINNED(e, n) {
  let r = (getSessionFeatureValues().pinnedFeatureValues ??= new Map());
  if (!r.has(e)) r.set(e, getFeatureValue_CACHED_MAY_BE_STALE(e, n));
  return r.get(e);
}
//@ chunk-aepeg2w5.js:910210-910266 placement
function peekSessionPinnedFeatureValue(e) {
  return getSessionFeatureValues().pinnedFeatureValues?.get(e);
}
//@ chunk-aepeg2w5.js:910266-910348 placement
function peekFeatureValue_SESSION_PINNED(e, n) {
  let pinnedFeatureValues = getSessionFeatureValues().pinnedFeatureValues;
  return pinnedFeatureValues?.has(e) ? pinnedFeatureValues.get(e) : getFeatureValue_CACHED_MAY_BE_STALE(e, n);
}
//@ chunk-aepeg2w5.js:910348-910381 placement
function getFeatureValue_CACHED_WITH_REFRESH(e, n, r) {
  return getFeatureValue_CACHED_MAY_BE_STALE(e, n);
}
//@ chunk-aepeg2w5.js:910381-910443 placement
/**
 * 门开关检查：有缓存用缓存，否则阻塞等待 GrowthBook 初始化。
 */
async function checkGate_CACHED_OR_BLOCKING(e) {
  return getGrowthBookClient().checkGateCachedOrBlocking(e);
}
//@ chunk-aepeg2w5.js:910443-910488 placement
async function checkGate_OWN_OFF_FIRST(e) {
  return isGateOffInOwnEvaluation(e) ? false : checkGate_CACHED_OR_BLOCKING(e);
}
//@ chunk-aepeg2w5.js:910488-910556 placement
function isGateOffInOwnEvaluation(e) {
  let { value: n, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, false);
  return n !== true && isServedFeatureSource(source);
}
//@ chunk-aepeg2w5.js:910556-910682 placement
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
//@ chunk-aepeg2w5.js:910682-910728 placement
/**
 * 登录状态变化后让 GrowthBook 以新身份重新拉取特性。
 */
function refreshGrowthBookAfterAuthChange(e) {
  getGrowthBookClient().refreshAfterAuthChange(e);
}
//@ chunk-aepeg2w5.js:910728-910854 placement
function resetGrowthBook(e) {
  let growthBookState = getGrowthBookState();
  if (growthBookState.client === null) return;
  if (e === undefined) {
    growthBookState.client.dispose();
    growthBookState.client = null;
    return;
  }
  growthBookState.client.reset(e);
}
//@ chunk-aepeg2w5.js:910854-911182 placement
/**
 * GrowthBook 定时刷新间隔：tengu_gb_refresh_interval_minutes（限 5–360 分钟，±10% 抖动），未设时 360 分钟。
 */
function getRefreshConfig() {
  let n = 360;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_gb_refresh_interval_minutes",
    null,
  );
  if (featureValue_CACHED_MAY_BE_STALE === null)
    return {
      intervalMs: n * 60 * 1000,
      flagged: false,
    };
  let s =
    typeof featureValue_CACHED_MAY_BE_STALE === "string"
      ? Number(featureValue_CACHED_MAY_BE_STALE)
      : featureValue_CACHED_MAY_BE_STALE;
  let h = typeof s === "number" && Number.isFinite(s) && s > 0 ? Math.min(Math.max(s, 5), 360) : n;
  return {
    intervalMs: Math.round(Math.min(h * (0.9 + Math.random() * 0.2), 360) * 60 * 1000),
    flagged: true,
  };
}
//@ chunk-aepeg2w5.js:911182-911202 placement
var ATIS_REQUEST_HEADER = "x-cc-atis";
//@ chunk-aepeg2w5.js:911202-911282 placement
function getClientDataAtis() {
  let atis = getCachedClientData()?.atis;
  return typeof atis === "string" && atis.length > 0 ? atis : undefined;
}
//@ chunk-aepeg2w5.js:911282-911401 placement
function atisPin(clientDataAtis) {
  let [n, r, ...s] = clientDataAtis.split(".");
  return n === "v1" && r !== undefined && r !== "" && s.length === 3 && s.every((h) => h !== "")
    ? r
    : clientDataAtis;
}
//@ chunk-aepeg2w5.js:911401-911450 placement
function isSereneTeacupEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_serene_teacup", true);
}
//@ chunk-aepeg2w5.js:911450-911517 placement
function refreshGrowthBookAfterBootstrap() {
  try {
    if (isSereneTeacupEnabled()) getGrowthBookClient().refreshAtisPin();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-aepeg2w5.js:911517-911566 placement
function isConversationAtisLatchEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kestrel_moor", true);
}
//@ chunk-aepeg2w5.js:911566-911670 placement
function getRequestAtis() {
  if (!isConversationAtisLatchEnabled()) return getClientDataAtis();
  let conversationAtisLatch = getConversationAtisLatch();
  if (conversationAtisLatch === undefined) return getClientDataAtis();
  return conversationAtisLatch.length > 0 ? conversationAtisLatch : undefined;
}
//@ chunk-aepeg2w5.js:911670-911764 placement
function latchConversationAtis() {
  if (getConversationAtisLatch() === undefined) {
    let clientDataAtis = getClientDataAtis();
    setConversationAtisLatch(
      clientDataAtis !== undefined && /^[\x21-\x7e]+$/.test(clientDataAtis) ? clientDataAtis : "",
    );
  }
}
//@ chunk-aepeg2w5.js:911764-911814 placement
/**
 * 立即刷新 GrowthBook 特性。
 */
async function refreshGrowthBookFeatures() {
  return getGrowthBookClient().refreshFeatures();
}
//@ chunk-aepeg2w5.js:911814-911857 placement
function setupPeriodicGrowthBookRefresh() {
  getGrowthBookClient().startPeriodicRefresh();
}
//@ chunk-aepeg2w5.js:911857-911907 placement
function stopPeriodicGrowthBookRefresh() {
  getGrowthBookState().client?.stopPeriodicRefresh();
}
//@ chunk-aepeg2w5.js:911907-911946 placement
/**
 * 阻塞等待 GrowthBook 初始化后读取特性值。
 */
async function getDynamicConfig_BLOCKS_ON_INIT(e, n) {
  return getFeatureValue_DEPRECATED(e, n);
}
//@ chunk-aepeg2w5.js:911946-911977 placement = getDynamicConfig_CACHED_MAY_BE_STALE (0)
/**
 * 读取 GrowthBook 动态配置（对象值特性），可能来自磁盘缓存。
 */
function getDynamicConfig_CACHED_MAY_BE_STALE(configName, defaultValue) {
  return getFeatureValue_CACHED_MAY_BE_STALE(configName, defaultValue);
}
//@ chunk-aepeg2w5.js:911977-911984 placement
swapRemoteGateReader(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:911984-911990 placement
registerSteerFeature(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:911990-911997 placement
registerVerifySkillGateReader(getFeatureValueWithSource_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:911997-912004 placement
registerCommitSkillGateReader(getFeatureValueWithSource_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912004-912011 placement
registerErrorReader(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912011-912017 placement
setOAuthLockFlagReader(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912017-912023 placement
setWorkerOwnerRowsReader(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912023-912030 placement
setFeatureReader(getFeatureValue_SESSION_PINNED);
//@ chunk-aepeg2w5.js:912030-912036 placement
registerMainGateReader(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912036-912043 placement
registerServedSettingsReader(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912043-912158 placement
registerGateReader(
  () => getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ORG_CONFIG_REQUIRED, null),
  (e, n) =>
    logForDebugging(
      `org-config gate: ${TENGU_ORG_CONFIG_REQUIRED} is ${e} (${n}); loader provenance rules off`,
      {
        level: "warn",
      },
    ),
);
//@ chunk-aepeg2w5.js:912158-912165 placement
setVerificationPredicate(isPolicyGraceEnabled);
//@ chunk-aepeg2w5.js:912165-912171 placement
registerWarmMochiGateReader(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912171-912216 placement
readWarmSunriseFlag((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912216-912261 placement
registerEnvReader((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912261-912271 placement
registerFeatureFlagReader(getFeatureValue_CACHED_MAY_BE_STALE, onGrowthBookRefresh);
//@ chunk-aepeg2w5.js:912271-912279 placement
swapFeatureReader(getFeatureValue_SESSION_PINNED);
//@ chunk-aepeg2w5.js:912279-912324 placement
readStagedPumpkinFlag((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912324-912369 placement
readCalmNautilusFlag((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912369-912414 placement
readNestedRippleFlag((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912414-912458 placement
registerRosyElephantGateReader((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912458-912503 placement
registerWrapFeatureReader((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912503-912511 placement
registerWrapFeatureLatches(getSessionFeatureValues);
//@ chunk-aepeg2w5.js:912511-912556 placement
readTinglyPearlFlag((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912556-912601 placement
readFoamyHeronFlag((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912601-912608 placement
setRemoteBrowserFlagReader(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912608-912653 placement
installNestedRippleReader2((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
export {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
  hasFreshGrowthBookFeatures,
  onGrowthBookRefresh,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  isServedFeatureSource,
  getDynamicConfig_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
  hasGrowthBookUsedNonDefaultHost,
  getAllGrowthBookFeatures,
  checkGate_CACHED_OR_BLOCKING,
  isGateOffInOwnEvaluation,
  isGrowthBookEnabled,
  hasGrowthBookInitializeStarted,
  refreshGrowthBookFeatures,
  isGrowthBookInitializeInFlight,
  resetUserData,
  refreshGrowthBookAfterAuthChange,
  stopPeriodicGrowthBookRefresh,
  PLUGIN_HOOKS_MODULES_GATE,
  getDynamicConfig_BLOCKS_ON_INIT,
  getGrowthBookClientIdentity,
  initCoreUserData,
  isGrowthBookCacheEmpty,
  resetGrowthBook,
  latchConversationAtis,
  getGitEmail,
  getFeatureValue_DEPRECATED,
  nonEmptyName,
  getFeatureValue_CACHED_WITH_REFRESH,
  getUserAttributes_3,
  defaultFeatureFlagClientSlots,
  hasWorkspaceTrust,
  fetchFeatureValueServedToBearer,
  refreshGrowthBookAfterBootstrap,
  setGrowthBookCredentials,
  setGrowthBookStorageBackend,
  emptyAccountIdentity,
  PRE_INIT_FALLBACK_TIMEOUT_MS,
  PRE_INIT_OAUTH_REASON,
  envBearerFallbackMarker,
  getGrowthBookClient_2,
  PRE_INIT_KEY_HELPER_TIMEOUT_MS,
  PRE_INIT_OAUTH_TIMEOUT_MS,
  buildCoreUserData,
  getRequestAtis,
  ATIS_REQUEST_HEADER,
  getNonDefaultFeatureKeys,
  gitUserName,
  hasGrowthBookEnvOverride,
  peekSessionPinnedFeatureValue,
  hasGrowthBookOverride,
  getClientDataAtis,
  atisPin,
  checkGate_OWN_OFF_FIRST,
  hasFeatureFlagClientHeldCredential,
  getGrowthBookOkFetchCount,
};
