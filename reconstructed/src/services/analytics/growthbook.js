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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
} from "crypto";
import { getCoreUserData } from "../../utils/user.js";
import { postGrowthBookEval, GrowthBookClientHolder } from "./growthbookClient.js";
import { LM, isPendingNotOver } from "../../utils/toolErrors.js";
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
import { installProxyFetchForGrowthBook, lC, oC } from "../projectsRelay/relayGates.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { Nt } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { isTelemetryDisabled } from "../../utils/privacyLevel.js";
import { getEntrypointKind, isCoworkAny } from "../../utils/entrypointKinds.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { Vt } from "../../utils/agentId.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { eAi } from "../../utils/accessibility/screenReader.js";
import { Ph } from "../../utils/model/subagentSteer.js";
import { iIi } from "../oauth/oauthErrors.js";
import { Cv } from "../../utils/auth/oauthRefreshLock.js";
import { CC, bC } from "../../utils/messageProvenance.js";
import { mE, $C, zC } from "./growthbookGates.js";
import { Sxi } from "../../utils/settings/settingsSourceTrust.js";
import { registerGateReader, isPolicyGraceEnabled } from "../policyLimits/index.js";
import { TENGU_ORG_CONFIG_REQUIRED } from "../policyLimits/orgConfigRequired.js";
import { logForDebugging } from "../../utils/debug.js";
import { ZS } from "../api/verificationRequired.js";
import { _Ci, bCi, ECi, vCi } from "../../utils/bash/bashReadingFlags.js";
import { zOi } from "../../utils/gitSafeExec.js";
import { tMi } from "../../utils/toolCgroup.js";
import { qAi } from "../policyLimits/capabilityBlocks.js";
import { ZCi, JCi, QCi } from "../../utils/bash/bashParserFlags.js";
import { SOi, wOi } from "../../ink/wrapAnsi.js";
import { setRemoteBrowserFlagReader } from "../mcp/remoteBrowserServer.js";

//@ chunk-aepeg2w5.js:629737-629749 placement
var YC = null;
//@ chunk-aepeg2w5.js:629749-629785 placement
function Yi() {
  return ((YC ??= new getCoreUserData()), YC);
}
//@ chunk-aepeg2w5.js:629785-629819 placement
function sro() {
  return Yi().init();
}
/**
 * 重置用户数据缓存与读取 git 邮箱/用户名的辅助函数。
 */
//@ chunk-aepeg2w5.js:629819-629846 placement
function resetUserData() {
  Yi().reset();
}
//@ chunk-aepeg2w5.js:629846-629889 placement
function Tl(e) {
  return Yi().coreUserData(e);
}
//@ chunk-aepeg2w5.js:629889-629917 placement
function JC() {
  return Tl(!0);
}
/**
 * git 用户邮箱。
 */
//@ chunk-aepeg2w5.js:629917-629955 placement
function getGitEmail() {
  return Yi().gitEmail();
}
//@ chunk-aepeg2w5.js:629955-629996 placement
function Eki() {
  return Yi().gitUserName();
}
//@ chunk-aepeg2w5.js:629996-630005 placement
var KW = 8;
//@ chunk-aepeg2w5.js:630005-630070 placement
function qC(e) {
  return typeof e === "string" && e.length >= KW ? e : void 0;
}
/**
 * 开关 tengu_plugin_hooks_modules 的名字。
 */
//@ chunk-aepeg2w5.js:630070-630106 placement
var PLUGIN_HOOKS_MODULES_GATE = "tengu_plugin_hooks_modules";
//@ chunk-aepeg2w5.js:630106-630185 placement
function ZC(e) {
  return { accountUuid: void 0, organizationUuid: void 0, email: void 0 };
}
//@ chunk-aepeg2w5.js:630185-630253 placement
var GW = 60000,
  $W = 5000,
  WW = 5000,
  eR = "GrowthBook pre-init OAuth refresh";
//@ chunk-aepeg2w5.js:630253-630279 placement
function FRn(e) {
  return getGrowthBookClient_2;
}
//@ chunk-aepeg2w5.js:630279-630315 placement
var getGrowthBookClient_2 = "https://api.anthropic.com/";
/**
 * 按 GrowthBook 用户属性形状组装对象（只放有值的字段）。
 */
//@ chunk-aepeg2w5.js:902197-903375 fingerprint = getUserAttributes (0.623)
function getUserAttributes_2(e) {
  return {
    id: e.deviceId,
    sessionId: e.sessionId,
    deviceID: e.deviceId,
    platform: e.platform,
    ...(e.apiBaseUrlHost && { apiBaseUrlHost: e.apiBaseUrlHost }),
    ...(e.organizationUuid && { organizationUUID: e.organizationUuid }),
    ...(e.accountUuid && { accountUUID: e.accountUuid }),
    ...(e.userType && { userType: e.userType }),
    ...(e.subscriptionType && { subscriptionType: e.subscriptionType }),
    ...(e.rateLimitTier && { rateLimitTier: e.rateLimitTier }),
    ...(e.organizationRole && { organizationRole: e.organizationRole }),
    ...(Number.isFinite(e.subscriptionCreatedAtMs) && { subscriptionCreatedAt: e.subscriptionCreatedAtMs }),
    ...(e.firstTokenTime && { firstTokenTime: e.firstTokenTime }),
    ...(e.email && { email: e.email }),
    ...(e.appVersion && { appVersion: e.appVersion }),
    ...(e.githubActionsMetadata && { githubActionsMetadata: e.githubActionsMetadata }),
    ...(e.releaseChannel && { releaseChannel: e.releaseChannel }),
    ...(e.entrypoint && { entrypoint: e.entrypoint }),
    ...(e.sessionOrigin && { sessionOrigin: e.sessionOrigin }),
    ...(e.ccrDerivedSurface && { ccrDerivedSurface: e.ccrDerivedSurface }),
    ...(e.atisPin && { atisPin: e.atisPin }),
    ...(e.hasUsedRemoteSession && { hasUsedRemoteSession: !0 }),
    ...(e.hasRemoteEnvironment && { hasRemoteEnvironment: !0 }),
    ...!1,
    ...(e.slackTagConnected && { slackTagConnected: !0 }),
  };
}
//@ chunk-aepeg2w5.js:903375-903385 placement
var OP = postGrowthBookEval;
//@ chunk-aepeg2w5.js:903385-903469 placement
class DefaultFeatureFlagClientSlot {
  client = null;
  fetchHold = LM();
  slackTagConnected = !1;
  fetchesOnOwnCredential = !1;
}
//@ chunk-aepeg2w5.js:903469-903496 placement
var defaultFeatureFlagClientSlots = new HostScoped(() => new DefaultFeatureFlagClientSlot());
//@ chunk-aepeg2w5.js:903496-903534 placement
function getGrowthBookState() {
  return defaultFeatureFlagClientSlots.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:903534-903613 placement
async function getFeatureFlagAuthHeaders() {
  let e = await getAuthHeadersAsync({ envBearerFallbackFor: FRn() });
  return stripNonAnthropicApiKeyHeader(e);
}
//@ chunk-aepeg2w5.js:903613-903698 placement
function stripNonAnthropicApiKeyHeader(e) {
  let { "x-api-key": n, ...r } = e.headers;
  return n && !apiKeyForHost(n) ? { ...e, headers: r } : e;
}
//@ chunk-aepeg2w5.js:903698-903745 placement
function hasFeatureFlagClientHeldCredential() {
  return getGrowthBookClient().hasHeldCredential();
}
//@ chunk-aepeg2w5.js:903745-903770 placement
var freeze_3 = Object.freeze({});
//@ chunk-aepeg2w5.js:903770-903811 placement
function readGlobalConfigForFlags() {
  return isHttpMcpServeInvocation() || usesSessionAccessToken() ? freeze_3 : getGlobalConfig();
}
/**
 * GrowthBook 客户端依赖：是否启用、信任检查、认证头、用户属性、读写全局配置缓存 cachedGrowthBookFeatures、环境覆盖 CLAUDE_INTERNAL_FC_OVERRIDES、曝光上报 logGrowthBookExperimentTo1P、刷新节奏。
 */
//@ chunk-aepeg2w5.js:903811-904453 placement
function createGrowthBookDeps(e) {
  return {
    isEnabled: () => isGrowthBookEnabled(),
    isDiskCacheReadableWhileDisabled: () => isDiskCacheReadableWhileDisabled(),
    hasWorkspaceTrust: () => hasWorkspaceTrust() || e.fetchesOnOwnCredential,
    isFetchHeld: () => isPendingNotOver(e.fetchHold),
    getAuthHeaders: getFeatureFlagAuthHeaders,
    refreshOAuthTokenIfNeeded: (n, r) => checkAndRefreshOAuthTokenIfNeeded({ credentials: n, storageV5: r }),
    getUserAttributes: () => getUserAttributes(),
    rereadUserAttributes: () => (clearWIFAccountInfoCache(), resetUserData(), sro(), getUserAttributes()),
    readGlobalConfig: readGlobalConfigForFlags,
    saveGlobalConfig: (n, r) => {
      if (!isHttpMcpServeInvocation()) saveGlobalConfig(n, r);
    },
    skipsSavingUnchangedFetch: () => env.CLAUDE_CODE_REMOTE === !0,
    readEnvironmentOverrides: () => env.CLAUDE_INTERNAL_FC_OVERRIDES,
    profileFlagHost: profileFlagHost,
    logExposure: (n) => isHttpMcpServeInvocation() || logGrowthBookExperimentTo1P(n),
    fetchRemoteEvalFromSdk: OP,
    getRefreshCadence: () => getRefreshConfig(),
    sleep: (n, r, s) => sleep(n, r, s),
  };
}
/**
 * 取（必要时创建）GrowthBook 客户端包装，依赖由 buildGrowthBookClientDeps 提供。
 */
//@ chunk-aepeg2w5.js:904453-904541 placement
function getGrowthBookClient() {
  let e = getGrowthBookState();
  if (e.client === null)
    (installProxyFetchForGrowthBook(), (e.client = new GrowthBookClientHolder(createGrowthBookDeps(e))));
  return e.client;
}
/**
 * 用指定 Bearer 令牌临时创建 GrowthBook 客户端读取单个特性（只认服务器下发的 payload），完成后销毁。
 */
//@ chunk-aepeg2w5.js:904541-905782 placement
async function fetchFeatureValueServedToBearer(e, n, r, s, h, y = {}) {
  if (!isFirstPartyProvider()) return { served: !1 };
  installProxyFetchForGrowthBook();
  let S = y.getUserAttributes ?? getUserAttributes,
    w = () => {
      let {
        id: id,
        sessionId: sessionId,
        deviceID: deviceID,
        platform: platform,
        apiBaseUrlHost: apiBaseUrlHost,
        userType: userType,
        appVersion: appVersion,
        githubActionsMetadata: githubActionsMetadata,
        releaseChannel: releaseChannel,
        entrypoint: entrypoint,
        sessionOrigin: sessionOrigin,
        ccrDerivedSurface: ccrDerivedSurface,
      } = S();
      return {
        id: id,
        sessionId: sessionId,
        deviceID: deviceID,
        platform: platform,
        apiBaseUrlHost: apiBaseUrlHost,
        userType: userType,
        appVersion: appVersion,
        githubActionsMetadata: githubActionsMetadata,
        releaseChannel: releaseChannel,
        entrypoint: entrypoint,
        sessionOrigin: sessionOrigin,
        ccrDerivedSurface: ccrDerivedSurface,
        accountUUID: s.accountUuid,
        organizationUUID: s.organizationUuid,
        email: void 0,
      };
    },
    R = {
      ...createGrowthBookDeps(getGrowthBookState()),
      hasWorkspaceTrust: () => !0,
      getAuthHeaders: async () => ({
        headers: { Authorization: `Bearer ${r}`, "anthropic-beta": OAUTH_BETA_HEADER },
      }),
      refreshOAuthTokenIfNeeded: async () => !1,
      saveGlobalConfig: () => {},
      logExposure: () => !1,
      profileFlagHost: () => {
        return;
      },
      sdkCachePartition: `served-to-bearer:${randomUUID()}`,
      sdkInitTimeoutMs: h,
      ...y,
      getUserAttributes: w,
      rereadUserAttributes: w,
    },
    x = new GrowthBookClientHolder(R);
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
    let { value: P, source: source } = x.getFeatureValueWithSource(e, n);
    return source === "payload" ? { served: !0, value: P } : { served: !1 };
  } catch {
    return { served: !1 };
  } finally {
    if ((x.dispose(), Nt.fetchRemoteEvalCall === R.fetchRemoteEvalFromSdk))
      ((Nt.fetchRemoteEvalCall = OP), getGrowthBookState().client?.reclaimRemoteEvalHook());
  }
}
//@ chunk-aepeg2w5.js:905782-905842 placement
function setGrowthBookCredentials(e) {
  if (e === void 0) return;
  getGrowthBookClient().setCredentials(e);
}
//@ chunk-aepeg2w5.js:905842-905905 placement
function setGrowthBookStorageBackend(e) {
  if (e === void 0) return;
  getGrowthBookClient().setStorageBackend(e);
}
//@ chunk-aepeg2w5.js:905905-905954 placement
function answerNextGrowthBookRemoteEvalWith(e) {
  getGrowthBookClient().answerNextRemoteEvalWith(e);
}
/**
 * GrowthBook 拉取前的信任检查：项目已信任、会话信任或非交互会话。
 */
//@ chunk-aepeg2w5.js:905954-905994 placement
function hasWorkspaceTrust() {
  return checkHasTrustDialogAccepted() || getSessionTrustAccepted() || getIsNonInteractiveSession();
}
//@ chunk-aepeg2w5.js:905994-906165 placement
function allowFlagFetchOnOwnCredential() {
  let e = stripNonAnthropicApiKeyHeader(getAuthHeaders({ envBearerFallbackFor: FRn() })),
    n =
      getConfiguredApiKeyHelper() === void 0 &&
      !shouldUseWIFAuth() &&
      e.error === void 0 &&
      Object.keys(e.headers).length > 0;
  return ((getGrowthBookState().fetchesOnOwnCredential = n), n);
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
/**
 * 返回当前所有 GrowthBook 特性值（含覆盖）。
 */
//@ chunk-aepeg2w5.js:906357-906400 placement
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
  return !1;
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
/**
 * GrowthBook 是否启用：未设 DISABLE_GROWTHBOOK 且允许 1P 事件（隐私级别 default、第一方）。
 */
//@ chunk-aepeg2w5.js:907049-907097 placement
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
    return host === "api.anthropic.com" ? void 0 : host;
  } catch {
    return;
  }
}
/**
 * GrowthBook 用户属性：deviceId、sessionId、platform、apiBaseUrlHost、organizationUUID、accountUUID、userType、subscriptionType、rateLimitTier、organizationRole、subscriptionCreatedAt、email、appVersion、entrypoint、releaseChannel 等；宿主托管时用 CLAUDE_CODE_ACCOUNT_UUID 等 env。
 */
//@ chunk-aepeg2w5.js:907342-909790 placement
function getUserAttributes() {
  if (isHttpMcpServeInvocation()) {
    let CLAUDE_CODE_ACCOUNT_UUID = env.CLAUDE_CODE_ACCOUNT_UUID,
      CLAUDE_CODE_ORGANIZATION_UUID = env.CLAUDE_CODE_ORGANIZATION_UUID;
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
      organizationRole: void 0,
      subscriptionCreatedAtMs: NaN,
      firstTokenTime: void 0,
      email: void 0,
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
      githubActionsMetadata: void 0,
      releaseChannel: void 0,
      entrypoint: getEntrypointKind(),
      sessionOrigin: env.CLAUDE_CODE_SESSION_ORIGIN,
      ccrDerivedSurface: void 0,
      atisPin: void 0,
      hasUsedRemoteSession: void 0,
      hasRemoteEnvironment: void 0,
      slackTagConnected: !1,
    });
  }
  let e = JC(),
    n = void 0,
    email = e.email,
    s = getInitialSettings_2()?.autoUpdatesChannel,
    h = void 0,
    y = getApiBaseUrlHost(),
    S = getEntrypointKind(),
    CLAUDE_CODE_SESSION_ORIGIN = env.CLAUDE_CODE_SESSION_ORIGIN,
    R = isDiskless() && isCoworkAny() ? getCcrDerivedSurface() : void 0,
    x = getClientDataAtis(),
    P = void 0,
    F = Vt(env.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase(),
    L = Vt(env.CLAUDE_CODE_ORGANIZATION_UUID)?.toLowerCase(),
    G =
      (F !== void 0 || L !== void 0) &&
      isClaudeAIOAuthTokenHostInjected() &&
      getAuthenticatedAccountInfo() === void 0,
    j = (G && F) || e.accountUuid || env.CLAUDE_CODE_ACCOUNT_UUID || P?.accountUuid,
    ee =
      (G && L) ||
      e.organizationUuid ||
      env.CLAUDE_CODE_ORGANIZATION_UUID ||
      P?.organizationUuid ||
      n?.organizationUuid ||
      void 0,
    oauthAccount = getGlobalConfig().oauthAccount,
    Q =
      (j === void 0 || j === oauthAccount?.accountUuid) &&
      (ee === void 0 || ee === oauthAccount?.organizationUuid),
    re = Q ? oauthAccount?.organizationRole : void 0,
    se = Q ? oauthAccount?.subscriptionCreatedAt : void 0,
    Se = se ? Date.parse(/(z|[+-]\d{2}:?\d{2})$/i.test(se) ? se : se + "Z") : NaN;
  return getUserAttributes_2({
    deviceId: e.deviceId,
    sessionId: e.sessionId,
    platform: e.platform,
    apiBaseUrlHost: y,
    organizationUuid: ee,
    accountUuid: j,
    userType: e.userType,
    subscriptionType: e.subscriptionType,
    rateLimitTier: e.rateLimitTier,
    organizationRole: re,
    subscriptionCreatedAtMs: Se,
    firstTokenTime: e.firstTokenTime,
    email: email,
    appVersion: e.appVersion,
    githubActionsMetadata: e.githubActionsMetadata,
    releaseChannel: h,
    entrypoint: S,
    sessionOrigin: CLAUDE_CODE_SESSION_ORIGIN,
    ccrDerivedSurface: R,
    atisPin: x ? atisPin(x) : void 0,
    hasUsedRemoteSession: getCurrentProjectConfig().hasUsedRemoteSession,
    hasRemoteEnvironment: getGlobalConfig().hasRemoteEnvironment,
    ...!1,
    slackTagConnected: getGrowthBookState().slackTagConnected,
  });
}
//@ chunk-aepeg2w5.js:909790-909906 placement
function setSlackTagConnectedAttribute(e) {
  let n = getGrowthBookState();
  if (n.slackTagConnected === e) return;
  ((n.slackTagConnected = e), refreshGrowthBookAfterAuthChange({ preserveLoggedExposures: !0 }));
}
/**
 * 初始化 GrowthBook 客户端（remoteEval，clientKey sdk-zAZezfDKGoZuXXKe，apiHost 默认 https://api.anthropic.com），失败不抛错。
 */
//@ chunk-aepeg2w5.js:909906-909945 placement
function initializeGrowthBook() {
  return getGrowthBookClient().initialize();
}
//@ chunk-aepeg2w5.js:909945-910010 placement
async function getFeatureValue_DEPRECATED(e, n) {
  return getGrowthBookClient().getFeatureValueBlocking(e, n);
}
/**
 * 读取特性值并返回来源（payload/override/disabled/fallback/disk）。
 */
//@ chunk-aepeg2w5.js:910010-910070 placement
function getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n) {
  return getGrowthBookClient().getFeatureValueWithSource(e, n);
}
/**
 * 读取特性值（可能来自缓存的旧值），未知时返回默认值；全局最常用的特性开关读取函数。
 */
//@ chunk-aepeg2w5.js:910070-910107 placement
function getFeatureValue_CACHED_MAY_BE_STALE(e, n) {
  return getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n).value;
}
/**
 * 读取特性值并在本进程内钉住，后续刷新不再改变。
 */
//@ chunk-aepeg2w5.js:910107-910210 placement
function getFeatureValue_SESSION_PINNED(e, n) {
  let r = (Ao().pinnedFeatureValues ??= new Map());
  if (!r.has(e)) r.set(e, getFeatureValue_CACHED_MAY_BE_STALE(e, n));
  return r.get(e);
}
//@ chunk-aepeg2w5.js:910210-910266 placement
function peekSessionPinnedFeatureValue(e) {
  return Ao().pinnedFeatureValues?.get(e);
}
//@ chunk-aepeg2w5.js:910266-910348 placement
function peekFeatureValue_SESSION_PINNED(e, n) {
  let pinnedFeatureValues = Ao().pinnedFeatureValues;
  return pinnedFeatureValues?.has(e) ? pinnedFeatureValues.get(e) : getFeatureValue_CACHED_MAY_BE_STALE(e, n);
}
//@ chunk-aepeg2w5.js:910348-910381 placement
function getFeatureValue_CACHED_WITH_REFRESH(e, n, r) {
  return getFeatureValue_CACHED_MAY_BE_STALE(e, n);
}
/**
 * 门开关检查：有缓存用缓存，否则阻塞等待 GrowthBook 初始化。
 */
//@ chunk-aepeg2w5.js:910381-910443 placement
async function checkGate_CACHED_OR_BLOCKING(e) {
  return getGrowthBookClient().checkGateCachedOrBlocking(e);
}
//@ chunk-aepeg2w5.js:910443-910488 placement
async function checkGate_OWN_OFF_FIRST(e) {
  return isGateOffInOwnEvaluation(e) ? !1 : checkGate_CACHED_OR_BLOCKING(e);
}
//@ chunk-aepeg2w5.js:910488-910556 placement
function isGateOffInOwnEvaluation(e) {
  let { value: n, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, !1);
  return n !== !0 && isServedFeatureSource(source);
}
/**
 * 判断特性值来源是否可信：payload/override/disabled 可信，fallback 仅在有新鲜特性时可信，disk 缓存不可信。
 */
//@ chunk-aepeg2w5.js:910556-910682 placement
function isServedFeatureSource(e) {
  switch (e) {
    case "payload":
    case "override":
    case "disabled":
      return !0;
    case "fallback":
      return hasFreshGrowthBookFeatures();
    case "disk":
      return !1;
  }
}
/**
 * 登录状态变化后让 GrowthBook 以新身份重新拉取特性。
 */
//@ chunk-aepeg2w5.js:910682-910728 placement
function refreshGrowthBookAfterAuthChange(e) {
  getGrowthBookClient().refreshAfterAuthChange(e);
}
//@ chunk-aepeg2w5.js:910728-910854 placement
function resetGrowthBook(e) {
  let n = getGrowthBookState();
  if (n.client === null) return;
  if (e === void 0) {
    (n.client.dispose(), (n.client = null));
    return;
  }
  n.client.reset(e);
}
/**
 * GrowthBook 定时刷新间隔：tengu_gb_refresh_interval_minutes（限 5–360 分钟，±10% 抖动），未设时 360 分钟。
 */
//@ chunk-aepeg2w5.js:910854-911182 placement
function getRefreshConfig() {
  let n = 360,
    r = getFeatureValue_CACHED_MAY_BE_STALE("tengu_gb_refresh_interval_minutes", null);
  if (r === null) return { intervalMs: n * 60 * 1000, flagged: !1 };
  let s = typeof r === "string" ? Number(r) : r,
    h = typeof s === "number" && Number.isFinite(s) && s > 0 ? Math.min(Math.max(s, 5), 360) : n;
  return { intervalMs: Math.round(Math.min(h * (0.9 + Math.random() * 0.2), 360) * 60 * 1000), flagged: !0 };
}
//@ chunk-aepeg2w5.js:911182-911202 placement
var ATIS_REQUEST_HEADER = "x-cc-atis";
//@ chunk-aepeg2w5.js:911202-911282 placement
function getClientDataAtis() {
  let e = getCachedClientData()?.atis;
  return typeof e === "string" && e.length > 0 ? e : void 0;
}
//@ chunk-aepeg2w5.js:911282-911401 placement
function atisPin(e) {
  let [n, r, ...s] = e.split(".");
  return n === "v1" && r !== void 0 && r !== "" && s.length === 3 && s.every((h) => h !== "") ? r : e;
}
//@ chunk-aepeg2w5.js:911401-911450 placement
function Y2() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_serene_teacup", !0);
}
//@ chunk-aepeg2w5.js:911450-911517 placement
function refreshGrowthBookAfterBootstrap() {
  try {
    if (Y2()) getGrowthBookClient().refreshAtisPin();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-aepeg2w5.js:911517-911566 placement
function isConversationAtisLatchEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kestrel_moor", !0);
}
//@ chunk-aepeg2w5.js:911566-911670 placement
function getRequestAtis() {
  if (!isConversationAtisLatchEnabled()) return getClientDataAtis();
  let e = getConversationAtisLatch();
  if (e === void 0) return getClientDataAtis();
  return e.length > 0 ? e : void 0;
}
//@ chunk-aepeg2w5.js:911670-911764 placement
function latchConversationAtis() {
  if (getConversationAtisLatch() === void 0) {
    let e = getClientDataAtis();
    setConversationAtisLatch(e !== void 0 && /^[\x21-\x7e]+$/.test(e) ? e : "");
  }
}
/**
 * 立即刷新 GrowthBook 特性。
 */
//@ chunk-aepeg2w5.js:911764-911814 placement
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
/**
 * 阻塞等待 GrowthBook 初始化后读取特性值。
 */
//@ chunk-aepeg2w5.js:911907-911946 placement
async function getDynamicConfig_BLOCKS_ON_INIT(e, n) {
  return getFeatureValue_DEPRECATED(e, n);
}
/**
 * 读取 GrowthBook 动态配置（对象值特性），可能来自磁盘缓存。
 */
//@ chunk-aepeg2w5.js:911946-911977 placement = getDynamicConfig_CACHED_MAY_BE_STALE (0)
function getDynamicConfig_CACHED_MAY_BE_STALE(configName, defaultValue) {
  return getFeatureValue_CACHED_MAY_BE_STALE(configName, defaultValue);
}
//@ chunk-aepeg2w5.js:911977-911984 placement
eAi(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:911984-911990 placement
Ph(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:911990-911997 placement
lC(getFeatureValueWithSource_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:911997-912004 placement
oC(getFeatureValueWithSource_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912004-912011 placement
iIi(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912011-912017 placement
Cv(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912017-912023 placement
CC(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912023-912030 placement
bC(getFeatureValue_SESSION_PINNED);
//@ chunk-aepeg2w5.js:912030-912036 placement
mE(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912036-912043 placement
Sxi(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912043-912158 placement
registerGateReader(
  () => getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ORG_CONFIG_REQUIRED, null),
  (e, n) =>
    logForDebugging(
      `org-config gate: ${TENGU_ORG_CONFIG_REQUIRED} is ${e} (${n}); loader provenance rules off`,
      { level: "warn" },
    ),
);
//@ chunk-aepeg2w5.js:912158-912165 placement
ZS(isPolicyGraceEnabled);
//@ chunk-aepeg2w5.js:912165-912171 placement
$C(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912171-912216 placement
_Ci((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912216-912261 placement
zOi((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912261-912271 placement
tMi(getFeatureValue_CACHED_MAY_BE_STALE, onGrowthBookRefresh);
//@ chunk-aepeg2w5.js:912271-912279 placement
qAi(getFeatureValue_SESSION_PINNED);
//@ chunk-aepeg2w5.js:912279-912324 placement
bCi((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912324-912369 placement
ZCi((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912369-912414 placement
ECi((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912414-912458 placement
zC((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912458-912503 placement
SOi((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912503-912511 placement
wOi(Ao);
//@ chunk-aepeg2w5.js:912511-912556 placement
JCi((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912556-912601 placement
QCi((e, n) => ({
  ...getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, n),
  defaultHost: !hasGrowthBookUsedNonDefaultHost(),
}));
//@ chunk-aepeg2w5.js:912601-912608 placement
setRemoteBrowserFlagReader(getFeatureValue_CACHED_MAY_BE_STALE);
//@ chunk-aepeg2w5.js:912608-912653 placement
vCi((e, n) => ({
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
  sro,
  isGrowthBookCacheEmpty,
  resetGrowthBook,
  latchConversationAtis,
  getGitEmail,
  getFeatureValue_DEPRECATED,
  qC,
  getFeatureValue_CACHED_WITH_REFRESH,
  getUserAttributes,
  defaultFeatureFlagClientSlots,
  hasWorkspaceTrust,
  fetchFeatureValueServedToBearer,
  refreshGrowthBookAfterBootstrap,
  setGrowthBookCredentials,
  setGrowthBookStorageBackend,
  ZC,
  WW,
  eR,
  FRn,
  getGrowthBookClient_2,
  $W,
  GW,
  Tl,
  getRequestAtis,
  ATIS_REQUEST_HEADER,
  getNonDefaultFeatureKeys,
  Eki,
  hasGrowthBookEnvOverride,
  peekSessionPinnedFeatureValue,
  hasGrowthBookOverride,
  getClientDataAtis,
  atisPin,
  checkGate_OWN_OFF_FIRST,
  hasFeatureFlagClientHeldCredential,
  getGrowthBookOkFetchCount,
};
