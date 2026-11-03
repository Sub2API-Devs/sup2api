/**
 * utils/auth.ts
 *
 * 认证核心：API key / Bearer 令牌来源判定、apiKeyHelper 执行与缓存、OAuth 令牌读取/刷新/401 处理、AWS/GCP 凭证刷新、订阅类型与权益判断、组织 pin 校验、otelHeadersHelper。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/auth.ts
 * pieces: chunk-171dhyhe.js (2), chunk-30p0tvt0.js (1), chunk-3g8vhh6f.js (1), chunk-4pc1m5n9.js (1), chunk-4xpk3fhh.js (1), chunk-71c4j971.js (1), chunk-aepeg2w5.js (365), chunk-cdz6g143.js (2), chunk-dcmhvw5a.js (1), chunk-e6aww6q8.js (3), chunk-g54kbxqw.js (1)
 * attribution: affinity 5, fingerprint 22, placement 7, layout 102, facade-majority 242, file-local 1
 */
import { readFile, stat, realpath } from "fs/promises";
import { join, dirname, resolve } from "path";
import { createHash } from "crypto";
import { exec, execFile } from "child_process";
import { homedir } from "os";
import {
  getMockRateLimitState,
  MAX,
  HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE,
  USAGE_SETTINGS_URL,
} from "../services/claudeAiLimits.js";
import { env } from "./env.js";
import { isHostEntrypoint, isProviderManagedByHost } from "./entrypointKinds.js";
import {
  isLauncherStartedProcess,
  usableLauncherHostLoginToken,
  forgetLauncherHostLogin,
  renewLauncherHostLogin,
  launcherHostLoginIdentity,
  askLauncherHostLoginIdentityAgain,
} from "./auth/launcherHostLogin.js";
import {
  isFirstPartyProvider,
  isActualFirstPartyAnthropicBaseUrl,
  getAPIProvider,
  THIRD_PARTY_PROVIDER_LABELS,
  configuredApiProxyHost,
} from "./model/providers.js";
import {
  isGatewayUrlAllowed,
  smithyFetchHttpHandlerModule,
  GATEWAY_SESSION_EXPIRED_MESSAGE,
  GATEWAY_HEALTH_TIMEOUT_MS,
} from "../services/gateway/constants.js";
import {
  getOauthConfig,
  oauthScopesFromEnv,
  OAUTH_DEFAULT_SCOPES,
  firstPartyRefreshScopes,
  isClaudeAiScopeSet,
  CLAUDE_AI_PROFILE_SCOPE,
} from "../constants/oauth.js";
import { eagerHasCliFlag } from "./cliArgs.js";
import { isHttpMcpServeInvocation } from "../entrypoints/mcpServeArgs.js";
import { usesSessionAccessToken } from "./sessionAccessToken.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  toError,
  isFsInaccessible,
  isExpectedApiError,
  isDiskFullErrno,
} from "./errors.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { create, create_2 } from "../../vendor/zod/lib/index.mjs";
import { memoizeWithTTL } from "./memoize.js";
import {
  logFeatureBad,
  logFeatureOk,
  logFeatureSadAsync,
  logFeatureSad,
  logFeatureBadAsync,
} from "../services/analytics/featureTelemetry.js";
import { Re } from "../../runtime/bun-runtime.js";
import { jsonParse } from "./slowOperations.js";
import { getAWSProxyRequestHandler, resolveStsEndpointForProxyUrl } from "./proxy.js";
import { HostScoped } from "./hostScoped.js";
import {
  getRootSession,
  getGatewayAuth,
  setGatewayAuth,
  getIsNonInteractiveSession,
  holdGatewayHostStrict,
  preferThirdPartyAuthentication,
  getProjectConfigRoot,
  getOauthScopesFromFd,
  isOauthTokenFromBgSnapshot,
  getLoginStashedInTokenSlot,
  getOauthTokenFromFd,
  getSdkOAuthTokenRefreshCallback,
  setAuthenticatedAccount,
  setOauthTokenFromFd,
  setOauthScopesFromFd,
  setLoginStashedInTokenSlot,
  onProcessRootHost,
  isDiskless,
  getAuthenticatedAccount,
  getFlagSettingsInline,
} from "../bootstrap/state.js";
import { logForDebugging, logAntError } from "./debug.js";
import { logEvent } from "../services/analytics/index.js";
import {
  getWIFPrecedenceSource,
  wouldWIFProfileYieldToClaudeAILogin,
  isWIFActive,
  getWIFAuthType,
  getWIFProfileBaseUrl,
} from "./wifProfile.js";
import {
  getOAuthTokenFromFileDescriptor,
  hasBgAuthSnapshotPending,
  hasPossibleCredentialFromDescriptor,
  getApiKeyFromFileDescriptor,
  getOAuthTokenFromFileDescriptorAsync,
  getGatewayTokenFromFileDescriptor,
} from "./authFileDescriptor.js";
import {
  getHostPolicyLoginPins,
  getMachineAdminDocumentTier,
  getSettings_DEPRECATED,
  getSettingsForSource,
  getSettingsForSourceTightenOnly,
  getSettingsFilePathForSource,
  getEffectiveSettingSource_2,
  isAdminPolicyUnreadable,
  adminPolicyLoadFailureRefusesLaunch,
  getFatalAdminPolicyLoadErrors,
  getInitialSettings_2,
} from "./settings/settings.js";
import { probeGatewayManagedSettings, normalizeGatewayUrl } from "../services/gateway/hostCheck.js";
import {
  isVouchedHostSetMember,
  hostOf,
  isVouchedHost,
  activeAllowlistEntries,
  allowlistFactsHash,
} from "../services/gateway/internalNetworks.js";
import { verifyGatewayHost, fetchGatewayCertificate } from "../services/gateway/vouching.js";
import { readGatewayEnvConfig } from "../services/gateway/gatewayAuth.js";
import {
  consumeBgAuthSnapshot,
  isPermissionDeniedCode,
  isGatewayLoginRequired,
  storageKindForTelemetry_2,
} from "../services/gateway/gatewayCredentialStore.js";
import { PassingCauseError } from "./errors/PassingCauseError.js";
import { getSecureStorage } from "./secureStorage/index.js";
import { isFigJwt } from "./anthropicHosts.js";
import { logError } from "./log.js";
import { isBareMode, isAntBuild, isEnvTruthy, isSafeMode, parseNumberOrDefault } from "./envUtils.js";
import {
  warnPinnedHelper,
  isHookedMergeAnswer,
  runManagedHelperWithoutProjectEnv,
  managedHelperSettingsGate,
} from "./auth/managedHelpers.js";
import {
  shouldUseClaudeAIAuth,
  isOAuthTokenExpired,
  isInvalidGrantError,
  isAccountOnHoldError,
  isExpectedOAuthTokenError,
  refreshOAuthToken,
  isInvalidScopeError,
  getAccountOnHoldErrorUrl,
} from "../services/oauth/client.js";
import { computeContentHash } from "./commitAttribution.js";
import {
  getGlobalConfig,
  getCustomApiKeyStatus,
  subscribeGlobalConfigInstalled,
  checkHasTrustDialogAccepted,
  isProjectScopeTrustAccepted,
  saveGlobalConfig,
  customApiKeyResponsesOf,
  readFreshOauthAccountFromDisk,
} from "./config.js";
import { sanitizeTitle, markdownSafeText } from "./resultError.js";
import { tailOfId, TimedOperation, noopAsync } from "./auth/lockHolderLiveness.js";
import { onCredentialChange, emitCredentialChange } from "./auth/credentialEpoch.js";
import { decodeJwtExpiry } from "../bridge/jwtUtils.js";
import { sequential } from "./sequential.js";
import { AwsAuthStatusManager } from "./awsAuthStatusManager.js";
import { safeExecShell, safeExecFile } from "./safeSpawn.js";
import { truncateToLength, cleanForDisplay } from "./stringUtils.js";
import { findUnsafeChar, describeUnsafeValue, countUtf16CodePoints } from "./settings/managedSettingsKeys.js";
import {
  CloudAuthRefreshRuns,
  RefreshController,
  runCloudAuthRefresh,
  isAuthRefreshLockEnabled,
} from "./auth/cloudAuthRefreshLock.js";
import {
  checkStsCallerIdentity,
  getAwsProfileRegionHints,
  extractStsCredentials,
  clearAwsIniCache,
} from "./aws.js";
import { isDisklessSession, DISKLESS_PROGRAM_REFUSAL } from "./disklessSession.js";
import { resolveExecutableSafely } from "./findExecutableWindows.js";
import { moveKeeperPid } from "./toolCgroup.js";
import { getCACertificates } from "./caCerts.js";
import { CaFetchHttpHandler } from "../services/aws/caFetchHandler.js";
import { vertexAuthClientOptions } from "../services/api/vertexAuth.js";
import { sleep, withDeadline } from "./sleep.js";
import { getOperationLockPaths } from "./swarm/permissionSync.js";
import { getModelStrings } from "./model/modelStrings.js";
import {
  getMacOsKeychainStorageServiceName,
  getUsername,
  clearKeychainCache,
  keychainProjectDirs,
  KEYCHAIN_CACHE_TTL_MS,
  getProjectDirsUpToHome,
} from "./secureStorage/macOsKeychainHelpers.js";
import { fromEnum, lit, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { classifyKeychainError } from "./secureStorage/macOsKeychainStorage.js";
import { shortHash } from "./shortHash.js";
import { scrubErrorText, errorTelemetryFields } from "./accessibility/screenReader.js";
import { clearLegacyApiKeyPrefetch } from "./secureStorage/keychainPrefetch.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { identity as identity_2 } from "./identity.js";
import { createSignal } from "./signal.js";
import { invalidatePlainTextStoreCopy } from "./secureStorage/plainTextStorage.js";
import { clearBetasCaches } from "./betas.js";
import { dropInFlightComposes, invalidateToolDescriptions } from "../services/api/toolDescriptionCache.js";
import {
  forgetHeldHostSessionsBearer,
  recoverHostSessionsBearer,
  ensureHostSessionsBearer,
} from "./hostSessionsBearer.js";
import { replaceFileReferenceHintLatch } from "../services/api/fileReferenceCalls.js";
import { withoutSSHTunnelVars, withoutHostManagedProviderVars } from "./managedEnv.js";
import { normalizeUuidOrNull } from "./agentId.js";
import { lock } from "./lockfile.js";
import {
  getFsSettler,
  writeLockOwnerRecord,
  removeOwnLockOwnerRecord,
  checkLockStillOwned,
} from "./auth/oauthRefreshLock.js";
import { registerOAuthRefreshExitWait } from "./auth/oauthRefreshExitWait.js";
import { getFsImplementation } from "./fsOperations.js";
import { READ_FAILED } from "./secureStorage/storageWriteLock.js";
import {
  checkAllowedProvider,
  policyUnreadableMessage,
  recheckAllowedProviderEndpoint,
  setWifProfileBaseUrlInUse,
} from "./model/allowedProviders.js";
import { getLspManager } from "../services/lsp/manager.js";
import { artifactPathPrefix, isArtifactMountMode } from "../services/artifacts/artifactMount.js";
import { getBgDispatcherPlanInfo } from "./subprocessEnv.js";
import { isPlanDisplayName, validateOauthToken } from "../services/oauth/validateOauthToken.js";
import { stripControlChars } from "./settings/writeQueues.js";
import { getHostAuthEnvVar } from "./managedEnvConstants.js";
import { LRUCache } from "../../vendor/lru-cache/dist/esm/index.min.js";
import { getDesignConsentKey } from "../services/design/designApi.js";
import {
  computeChecksumFromSettings,
  gatewayTrustFor,
  consentIdentityAsync,
} from "../services/remoteManagedSettings/index.js";
import { getEmail } from "./user.js";

//@ chunk-aepeg2w5.js:288708-288779 fingerprint = getRateLimitTier (1)
/**
 * 环境覆盖的限流档位；本构建中覆盖开关被编译成恒为 null。
 */
function getRateLimitTier_2() {
  let oauthTokens = getMockRateLimitState();
  oauthTokens.enabled;
  return null;
  return oauthTokens.rateLimitTier;
}
//@ chunk-aepeg2w5.js:288779-288856 fingerprint = getSubscriptionType (1)
/**
 * 环境覆盖的订阅类型；本构建中恒为 null。
 */
function hasSubscriptionTypeOverride() {
  let oauthTokens = getMockRateLimitState();
  oauthTokens.enabled;
  return null;
  return oauthTokens.subscriptionType || MAX;
}
//@ chunk-aepeg2w5.js:288856-288929 layout = getSubscriptionType (1)
function getStoredSubscriptionType() {
  let oauthTokens = getMockRateLimitState();
  return oauthTokens.enabled && oauthTokens.subscriptionType !== null && false;
}
//@ chunk-aepeg2w5.js:288929-288956 placement
function getRateLimitTierOverride() {
  return null;
}
//@ chunk-aepeg2w5.js:504563-504595 affinity
/**
 * 登录可用状态的缓存时长（5 分钟）。
 */
var OAUTH_READY_CACHE_MS = 300000;
var JWT_EXPIRY_SKEW_MS = 30000;
var MAX_HELPER_STDERR_CHARS = 16384;
//@ chunk-aepeg2w5.js:504595-504644 facade-majority
function isManagedOAuthContext() {
  return env.CLAUDE_CODE_REMOTE || isHostEntrypoint();
}
//@ chunk-aepeg2w5.js:504644-504710 facade-majority = withoutHostManagedProviderVars (1)
function isHostManagedProviderAuth() {
  return env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST || isLauncherStartedProcess();
}
//@ chunk-aepeg2w5.js:504710-504845 facade-majority = getBridgeBaseUrl (0.653)
/**
 * Remote Control 可用时返回 BASE_API_URL 规范化后的基址，否则 false。
 */
function isHostManagedAnthropicApiBearer() {
  if (
    !isHostManagedProviderAuth() ||
    !effectiveAuthTokenEnv() ||
    isFirstPartyManagedOAuthContext() ||
    !isFirstPartyProvider() ||
    !isActualFirstPartyAnthropicBaseUrl() ||
    env.ANTHROPIC_UNIX_SOCKET
  )
    return false;
  try {
    return isGatewayUrlAllowed(getOauthConfig().BASE_API_URL);
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:504845-504919 facade-majority
/**
 * 带 --host-auth-is-org-sign-in 且有桥基础地址时，取宿主下发的组织登录凭证。
 */
function hostOrgSignInBearer() {
  return eagerHasCliFlag("--host-auth-is-org-sign-in") && isHostManagedAnthropicApiBearer()
    ? effectiveAuthTokenEnv()
    : undefined;
}
//@ chunk-aepeg2w5.js:504919-504957 layout
/**
 * 是否使用宿主托管、HTTP MCP 或会话提供的认证（这类情况下不走本地登录流程）。
 */
function usesHostProvidedAuth() {
  return isHostManagedProviderAuth() || isHttpMcpServeInvocation() || usesSessionAccessToken();
}
//@ chunk-aepeg2w5.js:504957-504978 facade-majority
class HostManagedNoCredsError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-aepeg2w5.js:504978-505255 facade-majority
function hostManagedNoCredsError(
  e,
  n = "The app may have quit or its credential file is stale \u2014 restart the desktop app.",
) {
  return new HostManagedNoCredsError(
    `${e} credentials are managed by the desktop app, but none are available. ${n}`,
    "host-managed provider credentials unavailable \u2014 restart desktop app",
  );
}
//@ chunk-aepeg2w5.js:505255-505682 facade-majority
function hostManagedAwsProviderChain(e) {
  return async () => {
    let { accessKeyId, secretAccessKey, profile, configFile, credsFile } = getAwsEnvCredentials();
    if (accessKeyId && secretAccessKey) {
      let AWS_SESSION_TOKEN = env.AWS_SESSION_TOKEN;
      return async () => ({
        accessKeyId,
        secretAccessKey,
        ...(AWS_SESSION_TOKEN && {
          sessionToken: AWS_SESSION_TOKEN,
        }),
      });
    }
    if (configFile || credsFile) {
      if (configFile) {
        let ssoCredentials = await resolveSsoCredentials(configFile, credsFile, profile);
        if (ssoCredentials) return async () => ssoCredentials;
      }
      let { fromIni } = await import("./chunk-thwbpw6e.js");
      return fromIni({
        ...(profile && {
          profile,
        }),
        configFilepath: configFile ?? credsFile,
        filepath: credsFile ?? configFile,
        ignoreCache: true,
      });
    }
    throw hostManagedNoCredsError(e, BACKGROUND_UNSUPPORTED_CREDENTIAL_MSG);
  };
}
//@ chunk-aepeg2w5.js:505682-505921 layout
var BACKGROUND_UNSUPPORTED_CREDENTIAL_MSG =
  "Background agents and teammates are not supported for this credential kind. Run this from the main session, or switch the desktop app to a profile-based or API-key credential. If this is the main session, restart the desktop app.";
//@ chunk-aepeg2w5.js:505921-506106 layout
function getAwsEnvCredentials() {
  return {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    profile: env.AWS_PROFILE,
    configFile: env.AWS_CONFIG_FILE,
    credsFile: env.AWS_SHARED_CREDENTIALS_FILE,
  };
}
//@ chunk-aepeg2w5.js:506106-506214 layout
function hasAwsEnvCredentials() {
  let { accessKeyId, secretAccessKey, configFile, credsFile } = getAwsEnvCredentials();
  return Boolean((accessKeyId && secretAccessKey) || configFile || credsFile);
}
//@ chunk-aepeg2w5.js:506214-506303 layout
/**
 * 存储的访问令牌结构（accessToken 与 expiresAt）。
 */
var storedAccessTokenSchema = DoctorLazy(() =>
  create({
    accessToken: create_2().min(1),
    expiresAt: create_2(),
  }),
);
var AWS_SSO_PROFILE_RE = /^[a-z0-9-]{1,32}$/;
var MAX_AWS_CHAIN_CACHE_ENTRIES = 128;
//@ chunk-aepeg2w5.js:506303-508382 layout
/**
 * 按宿主缓存的 AWS 凭据解析器：ssoProfile 从 AWS 配置/凭据文件解析出纯 SSO 角色配置（排除静态密钥、credential_process、角色链等）；ssoRole 用 SSO 缓存令牌换取角色临时凭据（按过期时间缓存）；helper 通过凭据助手解析；defaultChain 为默认链解析器的有界缓存。
 */
class AwsCredentialMemos {
  ssoProfile = memoizeWithTTL(async (e, n, r) => {
    let { loadSharedConfigFiles } = await import("./chunk-72ngr4xp.js").then((m) => Re(m.default, 1));
    let { configFile, credentialsFile } = await loadSharedConfigFiles({
      configFilepath: e,
      filepath: n ?? e,
      ignoreCache: true,
    });
    let S = configFile[r ?? "default"];
    let w = credentialsFile[r ?? "default"];
    let R = {
      ...S,
      ...w,
    };
    let { sso_account_id: ssoAccountId, sso_role_name: ssoRoleName } = R;
    if (!S || !ssoAccountId || !ssoRoleName) return null;
    if (
      (R.aws_access_key_id && R.aws_secret_access_key) ||
      R.credential_process ||
      R.role_arn ||
      R.source_profile ||
      R.credential_source ||
      R.web_identity_token_file
    )
      return null;
    let F = R.sso_session ? configFile[`sso-session.${R.sso_session}`] : R;
    let ssoStartUrl = F?.sso_start_url;
    let ssoRegion = F?.sso_region;
    if (!ssoStartUrl || !ssoRegion || !AWS_SSO_PROFILE_RE.test(ssoRegion)) return null;
    if (
      R.sso_session &&
      ((R.sso_start_url && R.sso_start_url !== ssoStartUrl) || (R.sso_region && R.sso_region !== ssoRegion))
    )
      return null;
    return {
      cacheId: R.sso_session ?? ssoStartUrl,
      accountId: ssoAccountId,
      roleName: ssoRoleName,
      region: ssoRegion,
    };
  });
  ssoRole = memoizeWithTTL(
    async (e, accountId, roleName, s) => {
      let h;
      try {
        h = jsonParse(await readFile(e, "utf-8"));
      } catch {
        return null;
      }
      let y = storedAccessTokenSchema().safeParse(h);
      if (!y.success) return null;
      let timestamp = Date.parse(y.data.expiresAt);
      if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return null;
      let [{ SSOClient: w, GetRoleCredentialsCommand: R }, awsProxyRequestHandler] = await Promise.all([
        import("./chunk-4hyzk0wr.js"),
        getAWSProxyRequestHandler({
          url: `https://portal.sso.${s}.amazonaws.com`,
          requestTimeoutMs: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
        }),
      ]);
      let P = new w({
        region: s,
        requestHandler:
          awsProxyRequestHandler ??
          new smithyFetchHttpHandlerModule.FetchHttpHandler({
            requestTimeout: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
          }),
      });
      let { roleCredentials } = await resolveWithStallGuard(
        P.send(
          new R({
            accessToken: y.data.accessToken,
            accountId,
            roleName,
          }),
        ),
      );
      if (
        !roleCredentials?.accessKeyId ||
        !roleCredentials.secretAccessKey ||
        !roleCredentials.sessionToken ||
        !roleCredentials.expiration
      )
        return null;
      return {
        accessKeyId: roleCredentials.accessKeyId,
        secretAccessKey: roleCredentials.secretAccessKey,
        sessionToken: roleCredentials.sessionToken,
        expiration: new Date(roleCredentials.expiration),
      };
    },
    (e) => computeAwsCredsCacheTtl(e?.expiration?.getTime()),
    (e, n) => {
      if (e === null) return false;
      if (e.expiration === undefined) return true;
      let time = e.expiration.getTime();
      if (time > Date.now() + AWS_CHAIN_REQUEST_TIMEOUT_MS) return true;
      return n >= time - AWS_CHAIN_REQUEST_TIMEOUT_MS && time > Date.now();
    },
  );
  helper = memoizeWithTTL(
    () => resolveAwsCredentialsViaHelpers(this),
    (e) => computeAwsCredsCacheTtl(e?.expiration),
  );
  defaultChain;
  chainEvictionAt = new Map();
  constructor() {
    let e = new Map();
    function n(r) {
      let s = awsChainCacheKey(r);
      let h = e.get(s);
      if (h) return h;
      let awsDefaultChainResolver = createAwsDefaultChainResolver(r);
      if (e.size >= MAX_AWS_CHAIN_CACHE_ENTRIES) e.delete(e.keys().next().value);
      e.set(s, awsDefaultChainResolver);
      awsDefaultChainResolver.catch(() => {
        if (e.get(s) === awsDefaultChainResolver) e.delete(s);
      });
      return awsDefaultChainResolver;
    }
    n.cache = e;
    this.defaultChain = n;
  }
}
//@ chunk-aepeg2w5.js:508382-508408 facade-majority
var awsCredentialMemos = new HostScoped(() => new AwsCredentialMemos());
//@ chunk-aepeg2w5.js:508408-508788 layout
/**
 * 用宿主固定的缓存解析 AWS SSO 凭据：读取配置找到 SSO 会话，按 sso-session/start_url 的 sha1 定位缓存令牌文件并换取角色凭据；失败时记调试日志并返回 null（回退 fromIni）。
 */
async function resolveSsoCredentials(configFile, credsFile, profile) {
  let s = awsCredentialMemos.of(getRootSession().host);
  try {
    let h = await s.ssoProfile(configFile, credsFile, profile);
    if (!h) return null;
    let y = join(
      dirname(configFile),
      "sso",
      "cache",
      `${createHash("sha1").update(h.cacheId).digest("hex")}.json`,
    );
    return await s.ssoRole(y, h.accountId, h.roleName, h.region);
  } catch (error) {
    logForDebugging(
      `[API:auth] host-pinned SSO leg failed (${error instanceof Error ? error.name : "unknown"}) \u2014 falling back to fromIni`,
    );
    return null;
  }
}
//@ chunk-aepeg2w5.js:508788-508911 facade-majority
function hostManagedAwsSdkCredentials(e) {
  if (!hasAwsEnvCredentials()) throw hostManagedNoCredsError(e, BACKGROUND_UNSUPPORTED_CREDENTIAL_MSG);
  let n = hostManagedAwsProviderChain(e);
  return {
    providerChainResolver: n,
    credentials: async (r) => (await n())(r),
  };
}
//@ chunk-aepeg2w5.js:508911-509028 facade-majority
function isFirstPartyManagedOAuthContext() {
  return (
    isManagedOAuthContext() &&
    !env.CLAUDE_CODE_HOST_AUTH_ENV_VAR &&
    !isLauncherStartedProcess() &&
    env.CLAUDE_CODE_ENTRYPOINT !== "claude-desktop-3p"
  );
}
//@ chunk-aepeg2w5.js:509028-509098 layout
/**
 * 记录 WIF 认证的两类调试提示是否已输出。
 */
class WifAuthDebugNoticeState {
  implicitProfileSkippedLogged = false;
  profileAuthSelectedLogged = false;
}
//@ chunk-aepeg2w5.js:509098-509124 facade-majority
var wifAuthDebugNotices = new HostScoped(() => new WifAuthDebugNoticeState());
//@ chunk-aepeg2w5.js:509124-509493 layout
/**
 * 同时存在 Anthropic profile 与 claude.ai 登录时提示使用 claude.ai 登录（只提示并打点一次）。
 */
function logImplicitProfileSkipped(e) {
  if (e.implicitProfileSkippedLogged) return;
  logForDebugging(
    `An Anthropic profile (~/.config/anthropic) is configured, but a claude.ai login exists \u2014 using the claude.ai login. Set ANTHROPIC_PROFILE=<name> to use the profile instead.${""}`,
    {
      level: "warn",
    },
  );
  queueMicrotask(() => logEvent("tengu_wif_implicit_profile_skipped_stored_login", {}));
  e.implicitProfileSkippedLogged = true;
}
//@ chunk-aepeg2w5.js:509493-509780 layout
function logProfileAuthSelected(e) {
  if (e.profileAuthSelectedLogged) return;
  let n = getWIFPrecedenceSource() ?? "profile";
  logForDebugging(
    `Using Anthropic profile auth (${n}); ${wouldWIFProfileYieldToClaudeAILogin() ? "a claude.ai login (/login) would take precedence over it" : "this takes precedence over any stored claude.ai login"}`,
    {
      level: "info",
    },
  );
  e.profileAuthSelectedLogged = true;
}
//@ chunk-aepeg2w5.js:509780-509952 facade-majority
function isProfileAuthShadowed(e = {}) {
  return Boolean(
    isBareModeAuthRestricted() ||
    env.ANTHROPIC_UNIX_SOCKET ||
    isManagedOAuthContext() ||
    usesHostProvidedAuth() ||
    env.ANTHROPIC_AUTH_TOKEN ||
    env.CLAUDE_CODE_OAUTH_TOKEN ||
    getOAuthTokenFromFileDescriptor() ||
    (e.skipApiKeyHelper ? false : getConfiguredApiKeyHelper()) ||
    !isFirstPartyProvider(),
  );
}
//@ chunk-aepeg2w5.js:509952-510157 facade-majority
function shouldUseWIFAuth(e = {}) {
  if (!isWIFActive()) return false;
  if (isProfileAuthShadowed(e)) return false;
  let n = e.skipApiKeyHelper ? undefined : wifAuthDebugNotices.of(getRootSession().host);
  if (getWIFPrecedenceSource() === "profile-implicit") {
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    if (isUsableClaudeAILoginRecord(claudeAIOAuthTokens) && wouldWIFProfileYieldToClaudeAILogin()) {
      if (n) logImplicitProfileSkipped(n);
      return false;
    }
  }
  if (n) logProfileAuthSelected(n);
  return true;
}
//@ chunk-aepeg2w5.js:510157-510197 facade-majority
function isWIFDispatchAuth() {
  return getAnthropicApiKey() === null && shouldUseWIFAuth();
}
//@ chunk-aepeg2w5.js:510197-510341 facade-majority
function isProfileRemoteSettingsCredential() {
  return (
    getWIFPrecedenceSource() !== "env-quad" &&
    getWIFAuthType() === "user_oauth" &&
    shouldUseWIFAuth({
      skipApiKeyHelper: true,
    }) &&
    getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    }).key === null
  );
}
//@ chunk-aepeg2w5.js:510341-510407 facade-majority
var SDK_OAUTH_REFRESH_ENTRYPOINTS = new Set(["claude-desktop", "local-agent", "claude-vscode"]);
//@ chunk-aepeg2w5.js:510407-510485 layout
/**
 * 需要时校验登录网关是否是本机托管设置指定的组织网关。
 */
async function verifyGatewayHostIfNeeded() {
  let gatewayAuth = getGatewayAuth();
  if (!gatewayAuth || !isProviderManagedByHost() || gatewayAuth.hostVerdict) return;
  await verifyGatewayHost_2(gatewayAuth);
}
//@ chunk-aepeg2w5.js:510485-510555 facade-majority
async function rejudgeHostLaunchedGateway() {
  let gatewayAuth = getGatewayAuth();
  if (!gatewayAuth?.hostVerdict) return;
  await verifyGatewayHost_2(gatewayAuth);
}
//@ chunk-aepeg2w5.js:510555-510567 layout
/**
 * 探测网关托管设置的超时（3 秒）。
 */
var GATEWAY_PROBE_TIMEOUT_MS = 3000;
//@ chunk-aepeg2w5.js:510567-511005 layout
/**
 * 校验登录网关是否为本机托管设置指定的组织网关；未通过时探测网关的托管设置（是否有 Code 标签页规则或未应答），把判定写回当前网关认证状态。
 */
async function verifyGatewayHost_2(gatewayAuth) {
  let n = `Bearer ${gatewayAuth.jwt}`;
  let hostPolicyLoginPins = getHostPolicyLoginPins();
  let s = await hostLaunchedSettingsSourceVerdict(gatewayAuth.url, hostPolicyLoginPins, n);
  if ("verified" in s && !s.verified) {
    let forceLoginGatewayUrl =
      hostPolicyLoginPins.forceLoginGatewayUrl ?? getMachineAdminDocumentTier()?.forceLoginGatewayUrl;
    let S =
      isManagedGatewayOrigin(gatewayAuth.url) || isManagedGatewayOrigin(forceLoginGatewayUrl)
        ? undefined
        : await probeGatewayManagedSettings(gatewayAuth.url, n, GATEWAY_PROBE_TIMEOUT_MS);
    let w =
      forceLoginGatewayUrl !== undefined &&
      compareGatewayUrls(forceLoginGatewayUrl, new URL(gatewayAuth.url)) !== "same";
    if (typeof S === "object")
      s = {
        ...s,
        codeTabRulesUnanswered: S.unanswered,
      };
    else if (S || (S === false && !w))
      s = {
        ...s,
        hasCodeTabRules: S,
      };
  }
  let gatewayAuth_2 = getGatewayAuth();
  if (gatewayAuth_2 !== null && gatewayAuth_2.url === gatewayAuth.url)
    setGatewayAuth({
      ...gatewayAuth_2,
      hostVerdict: s,
    });
}
//@ chunk-aepeg2w5.js:511005-511084 layout
/**
 * URL 是否指向本机托管设置指定的网关。
 */
function isManagedGatewayOrigin(e) {
  try {
    return e !== undefined && isVouchedHostSetMember(hostOf(new URL(normalizeGatewayUrl(e))));
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:511084-511194 layout
var GATEWAY_NOT_NAMED_REASON =
  "this machine's managed settings do not name it as the organization's gateway (forceLoginGatewayUrl).";
//@ chunk-aepeg2w5.js:511194-511833 facade-majority
async function hostLaunchedSettingsSourceVerdict(url, hostPolicyLoginPins, r) {
  let actualUrl = new URL(url);
  if (/[?#]/.test(actualUrl.href) || actualUrl.username || actualUrl.password)
    return {
      verified: false,
      reason:
        "the gateway address it was started with carries a query, fragment or user name, which no gateway address has.",
    };
  let h = isVouchedHostSetMember(hostOf(actualUrl));
  let gatewayInternalNetworks = hostPolicyLoginPins.gatewayInternalNetworks ?? [];
  let forceLoginGatewayUrl = hostPolicyLoginPins.forceLoginGatewayUrl;
  let w;
  if (forceLoginGatewayUrl === undefined) w = h ? undefined : GATEWAY_NOT_NAMED_REASON;
  else {
    let R = compareGatewayUrls(forceLoginGatewayUrl, actualUrl);
    if (typeof R === "object") {
      if (R.voucher === undefined)
        return {
          verified: false,
          reason: R.reason,
        };
      return verifyGatewayHost(url, [], undefined, R.reason, R.voucher);
    }
    w =
      R === "same" || h
        ? undefined
        : `this machine's managed settings name ${actualUrl.origin} as the organization's gateway, not ${actualUrl.origin}${trimTrailingSlashes(actualUrl)}.`;
  }
  return verifyGatewayHost(url, w === undefined ? gatewayInternalNetworks : [], r, w);
}
//@ chunk-aepeg2w5.js:511833-512377 layout
/**
 * 比较托管设置指定的网关 URL 与实际网关：同源且路径一致为 same、仅同源为 origin；否则返回原因（同为 https 无端口且主机可担保时附 voucher 主机名）；配置值无法使用时返回对应原因。
 */
function compareGatewayUrls(configuredUrl, actualUrl) {
  let configured;
  try {
    configured = new URL(normalizeGatewayUrl(configuredUrl));
  } catch {
    configured = undefined;
  }
  if (!configured?.host)
    return {
      reason:
        "this machine's managed settings name the organization's gateway (forceLoginGatewayUrl) with a value /login cannot use either.",
    };
  let s = trimTrailingSlashes(configured);
  let h = trimTrailingSlashes(actualUrl);
  let y = s === "" || s === h;
  if (configured.origin === actualUrl.origin && y) return s === h ? "same" : "origin";
  let reason = `this machine's managed settings name ${configured.origin}${s} as the organization's gateway, not ${actualUrl.origin}${h}.`;
  return y &&
    actualUrl.protocol === "https:" &&
    configured.protocol === "https:" &&
    configured.port === "" &&
    isVouchedHost(configured.hostname)
    ? {
        reason,
        voucher: configured.hostname,
      }
    : {
        reason,
      };
}
//@ chunk-aepeg2w5.js:512377-512429 layout
/**
 * 去掉 URL 路径末尾的斜杠。
 */
function trimTrailingSlashes(e) {
  return e.pathname.replace(/\/+$/, "");
}
//@ chunk-aepeg2w5.js:512429-512535 facade-majority
function sdkHostOffersOAuthRefresh() {
  return (
    Boolean(env.CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH) &&
    SDK_OAUTH_REFRESH_ENTRYPOINTS.has(env.CLAUDE_CODE_ENTRYPOINT ?? "")
  );
}
//@ chunk-aepeg2w5.js:512535-512625 facade-majority
function hostSessionsBearerOffered() {
  return (
    Boolean(env.CLAUDE_CODE_SDK_HAS_SESSIONS_OAUTH_REFRESH) &&
    sdkHostOffersOAuthRefresh() &&
    !isLauncherStartedProcess()
  );
}
//@ chunk-aepeg2w5.js:512625-512701 facade-majority
function isClaudeAISignInToken(e) {
  return e === env.CLAUDE_CODE_OAUTH_TOKEN || e === getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-aepeg2w5.js:512701-512768 facade-majority
function claudeAISignInTokenInForce() {
  return env.CLAUDE_CODE_OAUTH_TOKEN ?? getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-aepeg2w5.js:512768-512853 facade-majority
function hasClaudeAISignInToken() {
  return Boolean(env.CLAUDE_CODE_OAUTH_TOKEN) || getClaudeAIOAuthTokens()?.accessToken !== undefined;
}
//@ chunk-aepeg2w5.js:512853-512897 facade-majority
var gatewayAuthProvenance = new HostScoped(() => ({
  restoredFromStore: false,
}));
//@ chunk-aepeg2w5.js:512897-512954 facade-majority
function isGatewayAuthRestoredFromStore() {
  return gatewayAuthProvenance.of(getRootSession().host).restoredFromStore;
}
//@ chunk-aepeg2w5.js:512954-514913 facade-majority
async function restoreGatewayAuth(e, n = () => !getIsNonInteractiveSession()) {
  let r = gatewayAuthProvenance.of(getRootSession().host);
  r.restoredFromStore = false;
  if (readGatewayEnvConfig()) {
    await verifyGatewayHostIfNeeded();
    return;
  }
  if (env.CLAUDE_CODE_USE_GATEWAY && !env.ANTHROPIC_AUTH_TOKEN && hasBgAuthSnapshotPending()) {
    let s = await consumeBgAuthSnapshot();
    if (readGatewayEnvConfig()) {
      await verifyGatewayHostIfNeeded();
      return;
    }
    if (hasBgAuthSnapshotPending() && isPermissionDeniedCode(s))
      throw new PassingCauseError(
        "CLAUDE_CODE_USE_GATEWAY is set but the credential hand-off file is still locked by another process (an antivirus scan?), or this process is refused the file: check its permissions. Try again.",
      );
    if (hasBgAuthSnapshotPending())
      throw new PassingCauseError(
        "CLAUDE_CODE_USE_GATEWAY is set but the credential hand-off file is still locked by another process (an antivirus scan?). Try again.",
      );
  }
  if (usesHostProvidedAuth()) return;
  try {
    let async = await getSecureStorage().readAsync(e);
    let enterpriseGateway = async?.enterpriseGateway;
    if (!enterpriseGateway) return;
    let y = hostOf(new URL(enterpriseGateway.url));
    let S = async?.gatewayTrust?.[y];
    if (!S) {
      if (n())
        process.stderr
          .write(`Cloud gateway ${y} is not trusted on this machine \u2014 run /login to reconnect.
`);
      return;
    }
    if (enterpriseGateway.expiresAt <= Date.now() && !enterpriseGateway.idpRefreshToken) {
      if (n())
        process.stderr.write(
          GATEWAY_SESSION_EXPIRED_MESSAGE +
            `
`,
        );
      return;
    }
    let w = async?.gatewayAllowlistEntries?.[y];
    if (w !== undefined && !activeAllowlistEntries().some((R) => allowlistFactsHash(R) === w)) {
      let R = `Not connected to Cloud gateway ${y}: the saved sign-in has ended. Run /login. If that is refused, update Claude Code, or ask your administrator which version to use.`;
      if (n())
        process.stderr.write(
          R +
            `
`,
        );
      logForDebugging(R, {
        level: "warn",
      });
      return;
    }
    if (isGatewayLoginRequired(enterpriseGateway.url)) {
      let R = `Not connected to Cloud gateway ${y}: your organization's settings name another gateway or none.`;
      if (n())
        process.stderr.write(
          R +
            `
`,
        );
      logForDebugging(R, {
        level: "warn",
      });
      return;
    }
    if (enterpriseGateway.vouchedAtLogin === true || isFigJwt(enterpriseGateway.jwt))
      holdGatewayHostStrict(y);
    try {
      let gatewayCertificate = await fetchGatewayCertificate(enterpriseGateway.url, 3000);
      if (gatewayCertificate.fingerprint !== S) {
        if (n())
          process.stderr
            .write(`Cloud gateway ${y} TLS certificate changed since you connected \u2014 run /login to verify and reconnect.
`);
        logForDebugging(
          `[gateway] TLS fingerprint mismatch on restore for ${y}: pinned ${S}, live ${gatewayCertificate.fingerprint}`,
          {
            level: "warn",
          },
        );
        return;
      }
    } catch (error) {
      logForDebugging(
        `[gateway] TLS fingerprint probe failed on restore for ${y} (${errorMessage(error)}); proceeding without re-verify`,
      );
    }
    setGatewayAuth(enterpriseGateway);
    r.restoredFromStore = true;
  } catch (error) {
    logError(error);
  }
}
//@ chunk-aepeg2w5.js:514913-514949 facade-majority
var bareSignInRefusals = new HostScoped(() => ({
  isRefused: false,
}));
//@ chunk-aepeg2w5.js:514949-514990 facade-majority
function isBareModeAuthRestricted() {
  if (!isBareMode()) return false;
  return true;
}
//@ chunk-aepeg2w5.js:514990-515409 facade-majority = isAnthropicAuthEnabled (0.662)
/**
 * 是否走 Anthropic 第一方认证（Claude.ai OAuth）。--bare 且仅 bare 凭证、第三方提供方、profile（WIF）时为 false；存在 ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY / apiKeyHelper / API key FD（且非远程会话）时也为 false。ANTHROPIC_UNIX_SOCKET 时只看 CLAUDE_CODE_OAUTH_TOKEN。
 */
function isAnthropicAuthEnabled() {
  let e = isBareMode();
  if (e && isBareModeAuthRestricted()) return false;
  if (env.ANTHROPIC_UNIX_SOCKET) return !!env.CLAUDE_CODE_OAUTH_TOKEN;
  if (shouldUseWIFAuth()) return false;
  let n = !isFirstPartyProvider();
  let r = getSettings_DEPRECATED() || {};
  let s = e ? getConfiguredApiKeyHelper() : warnPinnedHelper("apiKeyHelper", r.apiKeyHelper);
  let h = effectiveAuthTokenEnv();
  let y;
  try {
    y = getAnthropicApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true,
    }).source;
  } catch {
    return false;
  }
  let S = y === "ANTHROPIC_API_KEY" || y === "apiKeyHelper";
  let w = isManagedOAuthContext();
  let R = !w && hasPossibleCredentialFromDescriptor("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR");
  let shouldDisableAuth = ((h || S) && !isFirstPartyManagedOAuthContext()) || ((s || R) && !w);
  return !(n || shouldDisableAuth);
}
//@ chunk-aepeg2w5.js:515409-515842 facade-majority = bothAuthMethodsNotice (0.523)
function describeHowToDisableAuthTokenSource(source) {
  switch (source) {
    case "claude.ai":
      return "claude /logout to sign out of claude.ai.";
    case "profile":
      return "Run `ant auth logout`, or remove the active profile under ~/.config/anthropic/configs/.";
    case "apiKeyHelper":
      return "Unset the apiKeyHelper setting.";
    case "CCR_OAUTH_TOKEN_FILE":
      return "This token is injected by the CCR host; check the host session.";
    case "none":
      return "";
    default:
      return `Unset the ${source} environment variable.`;
  }
}
//@ chunk-aepeg2w5.js:515842-515898 facade-majority
function effectiveAuthTokenEnv() {
  return isAntBuild() ? undefined : env.ANTHROPIC_AUTH_TOKEN;
}
//@ chunk-aepeg2w5.js:515898-516563 facade-majority = getAuthTokenSource (0.886)
/**
 * 判定 Bearer 令牌来源，顺序：ANTHROPIC_AUTH_TOKEN → CLAUDE_CODE_OAUTH_TOKEN（或宿主启动器令牌）→ OAuth 令牌 FD / CCR 令牌文件 → apiKeyHelper → profile（WIF）→ 已存 claude.ai OAuth（需 user:inference）→ none。--bare 下只认 apiKeyHelper。
 */
function getAuthTokenSource() {
  if (isBareModeAuthRestricted()) {
    if (getConfiguredApiKeyHelper())
      return {
        source: "apiKeyHelper",
        hasToken: true,
      };
    return {
      source: "none",
      hasToken: false,
    };
  }
  if (effectiveAuthTokenEnv() && !isFirstPartyManagedOAuthContext())
    return {
      source: "ANTHROPIC_AUTH_TOKEN",
      hasToken: true,
    };
  if (env.CLAUDE_CODE_OAUTH_TOKEN || usableLauncherHostLoginToken() !== null)
    return {
      source: "CLAUDE_CODE_OAUTH_TOKEN",
      hasToken: true,
    };
  if (getOAuthTokenFromFileDescriptor()) {
    if (hasPossibleCredentialFromDescriptor("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"))
      return {
        source: "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
        hasToken: true,
      };
    return {
      source: "CCR_OAUTH_TOKEN_FILE",
      hasToken: true,
    };
  }
  if (getConfiguredApiKeyHelper() && !isManagedOAuthContext())
    return {
      source: "apiKeyHelper",
      hasToken: true,
    };
  if (shouldUseWIFAuth())
    return {
      source: "profile",
      hasToken: true,
    };
  let oauthTokens = getClaudeAIOAuthTokens();
  if (shouldUseClaudeAIAuth(oauthTokens?.scopes) && oauthTokens?.accessToken)
    return {
      source: "claude.ai",
      hasToken: true,
    };
  return {
    source: "none",
    hasToken: false,
  };
}
//@ chunk-aepeg2w5.js:516563-516708 facade-majority
function isOAuthBearerSource(e) {
  return (
    e === "claude.ai" ||
    e === "CLAUDE_CODE_OAUTH_TOKEN" ||
    e === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR" ||
    e === "CCR_OAUTH_TOKEN_FILE"
  );
}
//@ chunk-aepeg2w5.js:516708-516820 facade-majority
function getRequestCredentials(e, apiKeySource) {
  let r = apiKeySource !== "none" && !isClaudeAISubscriber();
  return {
    tokenSource: (e === "profile" ? !isWIFDispatchAuth() : r && isOAuthBearerSource(e)) ? "none" : e,
    apiKey: r,
  };
}
//@ chunk-aepeg2w5.js:516820-516860 facade-majority
function getAnthropicApiKey() {
  let { key } = getAnthropicApiKeyWithSource();
  return key;
}
//@ chunk-aepeg2w5.js:516860-516910 facade-majority
function getAnthropicApiKeySafe() {
  try {
    return getAnthropicApiKey();
  } catch {
    return null;
  }
}
//@ chunk-aepeg2w5.js:516910-516944 facade-majority
function getApiKeySourceSafe() {
  return getAnthropicApiKeyWithSourceSafe().source;
}
//@ chunk-aepeg2w5.js:516944-517017 facade-majority
/**
 * getAnthropicApiKeyWithSource 的吞错包装，出错返回 {key:null, source:'none'}。
 */
function getAnthropicApiKeyWithSourceSafe(opts = {}) {
  try {
    return getAnthropicApiKeyWithSource(opts);
  } catch {
    return {
      key: null,
      source: "none",
    };
  }
}
//@ chunk-aepeg2w5.js:517017-517137 facade-majority
function getAnthropicApiKeyFingerprint() {
  let { key, source } = getAnthropicApiKeyWithSourceSafe({
    skipRetrievingKeyFromApiKeyHelper: true,
  });
  return {
    source,
    fingerprint: key ? computeContentHash(key) : null,
  };
}
//@ chunk-aepeg2w5.js:517137-517233 facade-majority
/**
 * 当前 API key 来源是否为 apiKeyHelper（远程会话除外）。
 */
function isApiKeyHelperTheActiveCredential() {
  return (
    !isManagedOAuthContext() &&
    getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    }).source === "apiKeyHelper"
  );
}
//@ chunk-aepeg2w5.js:517233-517252 layout
var weakMap_5 = new WeakMap();
//@ chunk-aepeg2w5.js:517252-517384 facade-majority
function hasBootstrapModelOptions() {
  let globalConfig = getGlobalConfig();
  return (
    Array.isArray(globalConfig.additionalModelOptionsCache) &&
    typeof globalConfig.additionalModelOptionsAnsweredAt === "number"
  );
}
//@ chunk-aepeg2w5.js:517384-517905 facade-majority
/**
 * 读取 ~/.claude.json 的 additionalModelOptionsCache（服务端下发的额外模型选项）并校验形状。
 */
function getAdditionalModelOptionsCache() {
  let additionalModelOptionsCache = getGlobalConfig().additionalModelOptionsCache;
  if (!Array.isArray(additionalModelOptionsCache)) return [];
  let n = weakMap_5.get(additionalModelOptionsCache);
  if (n) return n;
  let mapped = additionalModelOptionsCache
    .filter(
      (s) =>
        s != null &&
        typeof s === "object" &&
        (typeof s.value === "string" || s.value === null) &&
        typeof s.label === "string" &&
        typeof s.description === "string",
    )
    .map((s) => ({
      value: s.value,
      label: sanitizeTitle(s.label) || (typeof s.value === "string" ? sanitizeTitle(s.value) : ""),
      description: markdownSafeText(s.description),
      ...(s.disabled === true && {
        disabled: true,
      }),
      ...(typeof s.promoListPrice === "string" && {
        promoListPrice: sanitizeTitle(s.promoListPrice),
      }),
    }));
  weakMap_5.set(additionalModelOptionsCache, mapped);
  return mapped;
}
//@ chunk-aepeg2w5.js:517905-518080 facade-majority
/**
 * 读取 modelAccessCache：服务端告知的各模型是否在订阅内（apiName, entitled）。
 */
function getModelAccessCache() {
  let modelAccessCache = getGlobalConfig().modelAccessCache;
  return (Array.isArray(modelAccessCache) ? modelAccessCache : []).filter(
    (n) =>
      n != null && typeof n === "object" && typeof n.apiName === "string" && typeof n.entitled === "boolean",
  );
}
//@ chunk-aepeg2w5.js:518080-518489 facade-majority
/**
 * 读取组织默认模型缓存 orgModelDefaultCache（需与当前组织匹配）。
 */
function getOrgModelDefaultCache() {
  let globalConfig = getGlobalConfig();
  let orgModelDefaultCache = globalConfig.orgModelDefaultCache;
  if (
    orgModelDefaultCache == null ||
    typeof orgModelDefaultCache !== "object" ||
    typeof orgModelDefaultCache.name !== "string" ||
    typeof orgModelDefaultCache.updated_at !== "string" ||
    typeof orgModelDefaultCache.data_source !== "string" ||
    typeof orgModelDefaultCache.override_user_selection !== "boolean"
  )
    return null;
  let organizationUuid = globalConfig.oauthAccount?.organizationUuid;
  if (
    orgModelDefaultCache.orgUuid != null &&
    organizationUuid != null &&
    orgModelDefaultCache.orgUuid !== organizationUuid
  )
    return null;
  let replaced = orgModelDefaultCache.name.replace(/[\x00-\x1f\x7f-\x9f]/g, "");
  return replaced === orgModelDefaultCache.name
    ? orgModelDefaultCache
    : {
        ...orgModelDefaultCache,
        name: replaced,
      };
}
//@ chunk-aepeg2w5.js:518489-518679 facade-majority
function hasAnthropicDirectApiKey() {
  if (env.ANTHROPIC_AUTH_TOKEN) return false;
  try {
    let { key, source } = getAnthropicApiKeyWithSource();
    if (!key || source === "/login managed key") return false;
    return key.startsWith("sk-ant-") && key.slice(7, 10) === "api";
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:518679-518935 facade-majority
/**
 * API key 格式分类（遥测用）：none / non_sk_ant / sk_ant_api03 / sk_ant_api02 / sk_ant_admin / sk_ant_other。
 */
function getApiKeyPrefixBucket() {
  let key = getAnthropicApiKeyWithSourceSafe().key;
  if (!key || !key.trim()) return "none";
  if (!key.startsWith("sk-ant-")) return "non_sk_ant";
  let sliced = key.slice(7, 12);
  if (sliced === "api03") return "sk_ant_api03";
  if (sliced === "api02") return "sk_ant_api02";
  if (sliced === "admin") return "sk_ant_admin";
  return "sk_ant_other";
}
//@ chunk-aepeg2w5.js:518935-519061 facade-majority = hasAnthropicApiKeyAuth (1)
/**
 * 是否存在可用的 API key（不执行 apiKeyHelper）。
 */
function hasAnthropicApiKeyAuth() {
  try {
    let { key, source } = getAnthropicApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    return key !== null && source !== "none";
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:519061-519094 facade-majority
function hasAnthropicApiKey() {
  return getAnthropicApiKeySafe() != null;
}
//@ chunk-aepeg2w5.js:519094-520173 facade-majority = getAnthropicApiKeyWithSource (0.569)
/**
 * 取 API key 及来源：--bare 下只认 ANTHROPIC_API_KEY 与 apiKeyHelper；优先第三方时直接用 ANTHROPIC_API_KEY；否则依次为已审批（customApiKeyResponses.approved）的 ANTHROPIC_API_KEY → CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR → apiKeyHelper（缓存值）→ 全局配置 primaryApiKey（/login managed key）。skipRetrievingKeyFromApiKeyHelper 只报来源不执行。
 */
function getAnthropicApiKeyWithSource(opts = {}) {
  if (isBareModeAuthRestricted()) {
    if (env.ANTHROPIC_API_KEY)
      return {
        key: env.ANTHROPIC_API_KEY,
        source: "ANTHROPIC_API_KEY",
      };
    if (getConfiguredApiKeyHelper())
      return {
        key: opts.skipRetrievingKeyFromApiKeyHelper ? null : getApiKeyFromApiKeyHelperCached(),
        source: "apiKeyHelper",
      };
    return {
      key: null,
      source: "none",
    };
  }
  let apiKeyEnv = isAntBuild() ? undefined : env.ANTHROPIC_API_KEY;
  if (apiKeyEnv && preferThirdPartyAuthentication())
    return {
      key: apiKeyEnv,
      source: "ANTHROPIC_API_KEY",
    };
  if (isEnvTruthy(false)) {
    let apiKeyFromFd = getApiKeyFromFileDescriptor();
    if (apiKeyFromFd)
      return {
        key: apiKeyFromFd,
        source: "ANTHROPIC_API_KEY",
      };
    if (
      !apiKeyEnv &&
      !env.CLAUDE_CODE_OAUTH_TOKEN &&
      !env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR &&
      !getOAuthTokenFromFileDescriptor() &&
      usableLauncherHostLoginToken() === null &&
      !env.ANTHROPIC_AUTH_TOKEN &&
      !shouldUseWIFAuth() &&
      isFirstPartyProvider()
    )
      throw Error(
        "ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, or WIF env vars (ANTHROPIC_FEDERATION_RULE_ID + ANTHROPIC_ORGANIZATION_ID) required",
      );
    if (apiKeyEnv)
      return {
        key: apiKeyEnv,
        source: "ANTHROPIC_API_KEY",
      };
    return {
      key: null,
      source: "none",
    };
  }
  if (apiKeyEnv && getCustomApiKeyStatus(tailOfId(apiKeyEnv)) === "approved")
    return {
      key: apiKeyEnv,
      source: "ANTHROPIC_API_KEY",
    };
  let apiKeyFromFd = getApiKeyFromFileDescriptor();
  if (apiKeyFromFd)
    return {
      key: apiKeyFromFd,
      source: "ANTHROPIC_API_KEY",
    };
  if (getConfiguredApiKeyHelper()) {
    if (opts.skipRetrievingKeyFromApiKeyHelper)
      return {
        key: null,
        source: "apiKeyHelper",
      };
    return {
      key: getApiKeyFromApiKeyHelperCached(),
      source: "apiKeyHelper",
    };
  }
  let apiKeyFromConfigOrMacOSKeychain = getApiKeyFromConfigOrMacOSKeychain();
  if (apiKeyFromConfigOrMacOSKeychain) return apiKeyFromConfigOrMacOSKeychain;
  return {
    key: null,
    source: "none",
  };
}
//@ chunk-aepeg2w5.js:520173-520284 facade-majority
/**
 * 环境变量 ANTHROPIC_API_KEY 未被用户审批过（status=new）时返回其末 20 位，用于启动时询问是否使用这个 key。
 */
function getUnapprovedCustomApiKey() {
  let ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY || isAntBuild() || !isFirstPartyProvider()) return;
  let n = tailOfId(ANTHROPIC_API_KEY);
  return getCustomApiKeyStatus(n) === "new" ? n : undefined;
}
//@ chunk-aepeg2w5.js:520284-520400 layout
function isEnvApiKeyApproved() {
  try {
    let ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) return false;
    return getCustomApiKeyStatus(tailOfId(ANTHROPIC_API_KEY)) === "approved";
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-aepeg2w5.js:520400-520517 facade-majority
function onEnvApiKeyApprovalFlipped(onCredentialMayHaveChanged) {
  let n = isEnvApiKeyApproved();
  let r = [
    onCredentialChange(() => {
      n = isEnvApiKeyApproved();
    }),
    subscribeGlobalConfigInstalled(() => {
      let s = isEnvApiKeyApproved();
      if (s !== n) {
        n = s;
        onCredentialMayHaveChanged();
      }
    }),
  ];
  return () => r.forEach((s) => s());
}
//@ chunk-aepeg2w5.js:520517-520651 facade-majority = getConfiguredApiKeyHelper (0.742)
/**
 * 取 apiKeyHelper 命令：--bare 只认 flagSettings；宿主托管提供方时忽略；否则取合并设置（R6e 过滤不可信来源）。
 */
function getConfiguredApiKeyHelper() {
  if (isBareMode()) return getSettingsForSource("flagSettings")?.apiKeyHelper;
  if (isHostManagedProviderAuth()) return;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("apiKeyHelper", mergedSettings.apiKeyHelper);
}
//@ chunk-aepeg2w5.js:520651-520810 layout = isApiKeyHelperFromProjectOrLocalSettings (0.814)
/**
 * apiKeyHelper 是否来自项目/本地设置（需要工作区信任）。
 */
function isApiKeyHelperFromProjectOrLocalSettings() {
  let apiKeyHelper = getConfiguredApiKeyHelper();
  if (!apiKeyHelper) return false;
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  return (
    projectSettings?.apiKeyHelper === apiKeyHelper ||
    localSettings?.apiKeyHelper === apiKeyHelper ||
    isHookedMergeAnswer("apiKeyHelper")
  );
}
//@ chunk-aepeg2w5.js:520810-520901 facade-majority = getConfiguredAwsAuthRefresh (0.52)
/**
 * 设置中的 awsAuthRefresh 命令（经可信来源过滤）。
 */
function getConfiguredAwsAuthRefresh() {
  if (isHostManagedProviderAuth()) return;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("awsAuthRefresh", mergedSettings.awsAuthRefresh);
}
//@ chunk-aepeg2w5.js:520901-521068 facade-majority = isAwsAuthRefreshFromProjectSettings (0.783)
function isAwsAuthRefreshFromProjectSettings() {
  let awsAuthRefresh = getConfiguredAwsAuthRefresh();
  if (!awsAuthRefresh) return false;
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  return (
    projectSettings?.awsAuthRefresh === awsAuthRefresh ||
    localSettings?.awsAuthRefresh === awsAuthRefresh ||
    isHookedMergeAnswer("awsAuthRefresh")
  );
}
//@ chunk-aepeg2w5.js:521068-521168 fingerprint = getConfiguredAwsCredentialExport (0.519)
/**
 * 设置中的 awsCredentialExport 命令。
 */
function getConfiguredAwsCredentialExport() {
  if (isHostManagedProviderAuth()) return;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("awsCredentialExport", mergedSettings.awsCredentialExport);
}
//@ chunk-aepeg2w5.js:521168-521349 facade-majority = isAwsCredentialExportFromProjectSettings (0.781)
function isAwsCredentialExportFromProjectSettings() {
  let awsCredentialExport = getConfiguredAwsCredentialExport();
  if (!awsCredentialExport) return false;
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  return (
    projectSettings?.awsCredentialExport === awsCredentialExport ||
    localSettings?.awsCredentialExport === awsCredentialExport ||
    isHookedMergeAnswer("awsCredentialExport")
  );
}
//@ chunk-aepeg2w5.js:521349-521558 facade-majority = calculateApiKeyHelperTTL (0.908)
/**
 * apiKeyHelper 结果缓存 TTL：CLAUDE_CODE_API_KEY_HELPER_TTL_MS（>=0）否则默认 5 分钟。
 */
function calculateApiKeyHelperTTL() {
  let envTtl = env.CLAUDE_CODE_API_KEY_HELPER_TTL_MS;
  if (envTtl !== undefined) {
    if (envTtl >= 0) return envTtl;
    logForDebugging(
      `Found CLAUDE_CODE_API_KEY_HELPER_TTL_MS env var, but it was not a valid number. Got ${envTtl}`,
      {
        level: "error",
      },
    );
  }
  return OAUTH_READY_CACHE_MS;
}
//@ chunk-aepeg2w5.js:521558-521631 facade-majority
/**
 * 按宿主的 apiKeyHelper 状态：{cache:{value,timestamp}, inflight, epoch, lastFailure}。
 */
var apiKeyHelperStates = new HostScoped(() => ({
  cache: null,
  inflight: null,
  epoch: 0,
  lastFailure: null,
}));
//@ chunk-aepeg2w5.js:521631-521713 facade-majority = createBudgetTracker (0.62)
function getApiKeyHelperElapsedMs() {
  let startedAt = apiKeyHelperStates.of(getRootSession().host).inflight?.startedAt;
  return startedAt ? Date.now() - startedAt : 0;
}
//@ chunk-aepeg2w5.js:521713-521830 layout
function isTokenStillValid(cache) {
  let n = decodeJwtExpiry(cache.value);
  if (n === null) return true;
  let r = n * 1000 - JWT_EXPIRY_SKEW_MS;
  if (cache.timestamp >= r) return true;
  return Date.now() < r;
}
//@ chunk-aepeg2w5.js:521830-521895 layout
/**
 * 判断令牌过期时间是否仍有余量。
 */
function isOauthExpiryFresh(promise) {
  let n = decodeJwtExpiry(promise);
  return n === null || Date.now() < n * 1000 - JWT_EXPIRY_SKEW_MS;
}
//@ chunk-aepeg2w5.js:521895-521977 facade-majority = getApiKeyFromApiKeyHelper (0.655)
function getColdApiKeyHelperRun() {
  let inflight = apiKeyHelperStates.of(getRootSession().host).inflight;
  return inflight?.startedAt ? inflight.promise : null;
}
//@ chunk-aepeg2w5.js:521977-522578 facade-majority
async function getApiKeyFromApiKeyHelper(isNonInteractiveSession) {
  if (!getConfiguredApiKeyHelper()) return null;
  let apiKeyHelperTTL = calculateApiKeyHelperTTL();
  let r = apiKeyHelperStates.of(getRootSession().host);
  let s = () => {
    r.inflight = {
      promise: _runAndCache(r, isNonInteractiveSession, true, r.epoch),
      startedAt: Date.now(),
    };
    return r.inflight.promise;
  };
  if (r.cache) {
    if (
      !isTokenStillValid(r.cache) &&
      isFirstPartyProvider() &&
      isApiKeyHelperTheActiveCredential() &&
      !effectiveAuthTokenEnv()
    ) {
      if (r.inflight) {
        if (!r.inflight.startedAt) r.inflight.startedAt = Date.now();
        let promise = await r.inflight.promise;
        if (promise === null || isOauthExpiryFresh(promise)) return promise;
        if (r.inflight) return r.inflight.promise;
        return s();
      }
      return s();
    }
    if (Date.now() - r.cache.timestamp < apiKeyHelperTTL) return r.cache.value;
    if (!r.inflight)
      r.inflight = {
        promise: _runAndCache(r, isNonInteractiveSession, false, r.epoch),
        startedAt: null,
      };
    return r.cache.value;
  }
  if (r.inflight) return r.inflight.promise;
  return s();
}
//@ chunk-aepeg2w5.js:522578-523255 fingerprint = _runAndCache (0.627)
/**
 * 执行 apiKeyHelper 并写缓存；失败时打印红字错误，若有旧缓存则沿用并刷新时间戳，否则缓存一个空格占位并记录 lastFailure（epoch 变化后的结果丢弃）。
 */
async function _runAndCache(e, isNonInteractiveSession, r, epoch) {
  try {
    let value = await _executeApiKeyHelper(isNonInteractiveSession);
    if (epoch !== e.epoch) return value;
    if (value !== null) {
      e.cache = {
        value,
        timestamp: Date.now(),
      };
      e.lastFailure = null;
    }
    return value;
  } catch (e_2) {
    if (epoch !== e.epoch) return " ";
    let detail = e_2 instanceof Error ? e_2.message : String(e_2);
    console.error(sequential.red(`apiKeyHelper failed: ${detail}`));
    logForDebugging(`Error getting API key from apiKeyHelper: ${detail}`, {
      level: "error",
    });
    if (!r && e.cache && e.cache.value !== " ") {
      e.cache = {
        ...e.cache,
        timestamp: Date.now(),
      };
      return e.cache.value;
    }
    e.lastFailure = detail;
    if (isApiKeyHelperTheActiveCredential()) {
      let instance = AwsAuthStatusManager.getInstance();
      instance.startAuthentication();
      instance.setError(`apiKeyHelper failed: ${detail}`);
      instance.endAuthentication(false);
    }
    e.cache = {
      value: " ",
      timestamp: Date.now(),
    };
    return " ";
  } finally {
    if (epoch === e.epoch) e.inflight = null;
  }
}
//@ chunk-aepeg2w5.js:523255-524614 fingerprint = _executeApiKeyHelper (0.54)
/**
 * 运行 apiKeyHelper：来自项目/本地设置且工作区未信任时拒绝（tengu_apiKeyHelper_missing_trust11）；在项目根执行，超时 10 分钟，输出 trim 后作为 key。
 */
async function _executeApiKeyHelper(isNonInteractiveSession) {
  let apiKeyHelper = getConfiguredApiKeyHelper();
  if (!apiKeyHelper) return null;
  if (isApiKeyHelperFromProjectOrLocalSettings()) {
    if (!checkHasTrustDialogAccepted() && !isNonInteractiveSession) {
      let error = Error(
        `Security: apiKeyHelper executed before workspace trust is confirmed. If you see this message, post in ${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.FEEDBACK_CHANNEL
        }.`,
      );
      logAntError("apiKeyHelper invoked before trust check", error);
      logEvent("tengu_apiKeyHelper_missing_trust11", {});
      return null;
    }
  }
  let hasTrust = getProjectConfigRoot();
  let s = await runManagedHelperWithoutProjectEnv(
    "apiKeyHelper",
    apiKeyHelper,
    () =>
      safeExecShell(apiKeyHelper, {
        ...(hasTrust !== null && {
          cwd: hasTrust,
        }),
        timeout: 600000,
        reject: false,
        useToolMemoryCgroup: false,
      }),
    isProjectScopeTrustAccepted,
  );
  if (s.failed) {
    let why = s.timedOut ? "timed out" : `exited ${s.exitCode}`;
    let stderr = s.stderr && truncateToLength(s.stderr.trim(), 500);
    throw Error(stderr ? `${why}: ${stderr}` : why);
  }
  let stdout = s.stdout?.trim();
  if (!stdout) throw Error("did not return a value");
  let unsafeChar = findUnsafeChar(stdout, {
    maxLength: MAX_HELPER_STDERR_CHARS,
  });
  if (unsafeChar) {
    let S = describeUnsafeValue(unsafeChar, textLengthAndLines(stdout));
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `returned output that cannot be used as an API key: ${S}. The script must print only the key to stdout.`,
      "apiKeyHelper output rejected: not a printable-ASCII token",
    );
  }
  return stdout;
}
//@ chunk-aepeg2w5.js:524614-524672 facade-majority
function getApiKeyFromApiKeyHelperCached() {
  return apiKeyHelperStates.of(getRootSession().host).cache?.value ?? null;
}
//@ chunk-aepeg2w5.js:524672-524744 facade-majority
function getApiKeyHelperLastFailure() {
  if (!getConfiguredApiKeyHelper()) return null;
  return apiKeyHelperStates.of(getRootSession().host).lastFailure;
}
//@ chunk-aepeg2w5.js:524744-524821 facade-majority
/**
 * 让 apiKeyHelper 缓存失效（epoch+1）。
 */
function clearApiKeyHelperCache() {
  let e = apiKeyHelperStates.of(getRootSession().host);
  e.epoch++;
  e.cache = null;
  e.inflight = null;
}
//@ chunk-aepeg2w5.js:524821-524857 facade-majority
function isApiKeyHelperSafeToInvoke() {
  return !(isApiKeyHelperFromProjectOrLocalSettings() && !checkHasTrustDialogAccepted());
}
//@ chunk-aepeg2w5.js:524857-524897 facade-majority
function prefetchApiKeyFromApiKeyHelperIfSafe(isNonInteractiveSession) {
  if (!isApiKeyHelperSafeToInvoke()) return;
  getApiKeyFromApiKeyHelper(isNonInteractiveSession);
}
//@ chunk-aepeg2w5.js:524897-524940 layout
/**
 * AWS 凭据提前刷新的余量（5 分钟）。
 */
var DEFAULT_AWS_CREDS_TTL_MS = 3600000;
var AWS_CREDS_REFRESH_SKEW_MS = 300000;
var AWS_CREDS_MIN_TTL_MS = 60000;
var AWS_REFRESH_MIN_INTERVAL_MS = 30000;
//@ chunk-aepeg2w5.js:524940-525061 layout
class AwsAuthRefreshState {
  lastRefreshAt = null;
  inFlight = null;
  epoch = 0;
  signInFailures = 0;
  singleFlight = new CloudAuthRefreshRuns();
  waiters = new RefreshController(this.singleFlight);
}
//@ chunk-aepeg2w5.js:525061-525087 facade-majority
var awsAuthRefreshStates = new HostScoped(() => new AwsAuthRefreshState());
//@ chunk-aepeg2w5.js:525087-527401 fingerprint = runAwsAuthRefresh (0.349)
/**
 * 按需运行 awsAuthRefresh：先用 STS GetCallerIdentity 检查现有凭证是否有效，无效才执行刷新命令（IDE 配置探测时跳过）。
 */
async function runAwsAuthRefresh() {
  let host = getRootSession().host;
  let n = awsAuthRefreshStates.of(host);
  let awsAuthRefresh = getConfiguredAwsAuthRefresh();
  let epoch = n.epoch;
  let signal = n.waiters.signal;
  if (!awsAuthRefresh) return false;
  if (env.CLAUDE_CODE_CONFIG_PROBE) {
    logForDebugging("Skipping awsAuthRefresh in the IDE config probe");
    return false;
  }
  if (isAwsAuthRefreshFromProjectSettings()) {
    if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) {
      let w = Error(
        `Security: awsAuthRefresh executed before workspace trust is confirmed. If you see this message, post in ${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.FEEDBACK_CHANNEL
        }.`,
      );
      logAntError("awsAuthRefresh invoked before trust check", w);
      logEvent("tengu_awsAuthRefresh_missing_trust", {});
      return false;
    }
  }
  if (n.inFlight) return n.inFlight;
  let probedAt = Date.now();
  try {
    logForDebugging("Fetching AWS caller identity for AWS auth refresh command");
    await checkStsCallerIdentity();
    logForDebugging("Fetched AWS caller identity, skipping AWS auth refresh command");
    n.waiters.clearTakeover();
    return false;
  } catch {
    if (n.inFlight) return n.inFlight;
    if (n.lastRefreshAt !== null && Date.now() - n.lastRefreshAt < AWS_REFRESH_MIN_INTERVAL_MS) return false;
    let S = () => awsCredentialMemos.of(host).helper.cache.clear();
    if (signal.aborted && !n.waiters.hasCallers()) {
      S();
      return false;
    }
    let signal_2 = n.waiters.signal;
    let R = false;
    let x;
    let P = () => {
      if (x === undefined || x.endedByLock.aborted) {
        R = false;
        S();
        if (n.inFlight === F) n.inFlight = null;
      }
    };
    let F = (async () => {
      try {
        let refreshed = await runCloudAuthRefresh({
          setting: "awsAuthRefresh",
          command: awsAuthRefresh,
          readEnvAsCommandStarts: (ee) =>
            managedHelperSettingsGate("awsAuthRefresh", awsAuthRefresh, ee, isProjectScopeTrustAccepted),
          probedAt,
          singleFlight: n.singleFlight,
          signal: signal_2,
          takeover: n.waiters.takeTakeover(),
          reprobe: async () =>
            (await getAwsProfileRegionHints())
              ? "unknown"
              : checkStsCallerIdentity().then(
                  () => "valid",
                  () => "unknown",
                ),
          refresh: (signal, q) => {
            R = true;
            n.waiters.clearTakeover();
            let Q = refreshAwsAuth_2(awsAuthRefresh, signal, q);
            x = {
              outcome: Q,
              endedByLock: signal,
            };
            return Q;
          },
        });
        let j = await settleRefreshOutcome({
          refreshed,
          stop: signal_2,
          command: x,
          forget: S,
        });
        if (!j && signal_2.aborted && x?.endedByLock.aborted) R = false;
        R ||= j;
        if (j) n.waiters.clearTakeover();
        else if (
          isRefreshStillWanted({
            stop: signal_2,
            command: x,
            waiters: n.waiters,
          }) &&
          isAuthRefreshLockEnabled()
        )
          n.signInFailures++;
        return j;
      } finally {
        if (R && epoch === n.epoch) n.lastRefreshAt = Date.now();
      }
    })();
    n.inFlight = F;
    signal_2.addEventListener("abort", P, {
      once: true,
    });
    let L = () => {
      signal_2.removeEventListener("abort", P);
      if (n.inFlight === F) n.inFlight = null;
    };
    F.then(L, L);
    return F;
  }
}
//@ chunk-aepeg2w5.js:527401-527562 facade-majority
function noteAuthRefreshStop() {
  try {
    let host = getRootSession().host;
    gcpAuthRefreshStates.of(host).waiters.noteStop();
    awsAuthRefreshStates.of(host).waiters.noteStop();
  } catch (error) {
    logForDebugging(`auth refresh: Stop not noted: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-aepeg2w5.js:527562-527740 layout
async function settleRefreshOutcome({ refreshed, stop, command, forget }) {
  if (refreshed || !stop.aborted) return refreshed;
  if (command !== undefined) {
    let outcome = await command.outcome;
    if (!command.endedByLock.aborted) return outcome === "ok";
  }
  forget();
  return false;
}
//@ chunk-aepeg2w5.js:527740-527863 layout
function isRefreshStillWanted({ stop, command, waiters }) {
  if (!stop.aborted) return true;
  return command !== undefined && !command.endedByLock.aborted && waiters.hasCallers();
}
//@ chunk-aepeg2w5.js:527863-527927 layout
function isTerminationSignal(signal) {
  return signal === "SIGINT" || signal === "SIGHUP" || signal === "SIGTERM";
}
//@ chunk-aepeg2w5.js:527927-527941 layout
var AWS_AUTH_REFRESH_TIMEOUT_MS = 180000;
//@ chunk-aepeg2w5.js:527941-527996 facade-majority
function refreshAwsAuth(...e) {
  return refreshAwsAuth_2(...e).then((n) => n === "ok");
}
//@ chunk-aepeg2w5.js:527996-529663 fingerprint = refreshAwsAuth (0.581)
/**
 * 运行 awsAuthRefresh 命令（字符串走 shell，或 {file,args,env} 走 execFile），超时 3 分钟，输出转发到 AwsAuthStatusManager 供 UI 显示，返回 ok/failed。
 */
function refreshAwsAuth_2(awsAuthRefresh, signal, r) {
  if (isDisklessSession()) {
    logForDebugging(`AWS auth refresh: ${DISKLESS_PROGRAM_REFUSAL}`);
    return Promise.resolve("failed");
  }
  logForDebugging("Running AWS auth refresh command");
  let authStatusManager = AwsAuthStatusManager.getInstance();
  authStatusManager.startAuthentication();
  return new Promise((resolve) => {
    let y;
    if (typeof awsAuthRefresh === "string") {
      let projectConfigRoot = getProjectConfigRoot();
      y = runManagedHelperWithoutProjectEnv(
        "awsAuthRefresh",
        awsAuthRefresh,
        () =>
          exec(awsAuthRefresh, {
            ...(projectConfigRoot !== null && {
              cwd: projectConfigRoot,
            }),
            windowsHide: true,
          }),
        isProjectScopeTrustAccepted,
      );
    } else {
      let refreshProc = resolveExecutableSafely(awsAuthRefresh.file, true);
      if (refreshProc === null) {
        logForDebugging("AWS auth refresh: executable not found in a safe directory");
        authStatusManager.endAuthentication(false);
        resolve("failed");
        return;
      }
      y = execFile(
        /\.(cmd|bat)$/i.test(refreshProc) ? '"' + refreshProc + '"' : refreshProc,
        awsAuthRefresh.args,
        {
          windowsHide: true,
          shell: /\.(cmd|bat)$/i.test(refreshProc),
          env: awsAuthRefresh.env,
        },
      );
    }
    moveKeeperPid(y.pid);
    if (y.pid !== undefined) r?.(y.pid);
    let S = new TimedOperation(y, {
      timeoutMs: AWS_AUTH_REFRESH_TIMEOUT_MS,
      signal,
    });
    y.stdout.on("data", (data) => {
      let output = data.toString().trim();
      if (output) {
        authStatusManager.addOutput(output);
        logForDebugging(output, {
          level: "debug",
        });
      }
    });
    y.stderr.on("data", (data) => {
      let error = data.toString().trim();
      if (error) {
        authStatusManager.setError(error);
        logForDebugging(error, {
          level: "error",
        });
      }
    });
    y.on("close", (code, signal) => {
      S.settle();
      if (code === 0) {
        logForDebugging("AWS auth refresh completed successfully");
        authStatusManager.endAuthentication(true);
        resolve("ok");
      } else if (S.killReason === "abort") {
        authStatusManager.dismiss();
        resolve("interrupted");
      } else {
        let x = S.killReason === "shutdown" || (isTerminationSignal(signal) && S.killReason === undefined);
        let timedOut = S.killReason === "timeout";
        let message = x
          ? null
          : timedOut
            ? sequential.red(
                typeof awsAuthRefresh === "string"
                  ? "AWS auth refresh timed out after 3 minutes. Run your auth command manually in a separate terminal."
                  : 'AWS login timed out after 3 minutes. Run "' +
                      [awsAuthRefresh.file, ...awsAuthRefresh.args].join(" ") +
                      '" in another terminal and try again.',
              )
            : typeof awsAuthRefresh === "string"
              ? sequential.red("Error running awsAuthRefresh (in settings or ~/.claude.json):")
              : sequential.red(
                  "AWS login did not complete (" +
                    [awsAuthRefresh.file, ...awsAuthRefresh.args].join(" ") +
                    " exited with an error). Run it in another terminal and try again.",
                );
        if (message) console.error(message);
        authStatusManager.endAuthentication(false);
        resolve(x ? "interrupted" : "failed");
      }
    });
  });
}
//@ chunk-aepeg2w5.js:529663-531308 fingerprint = getAwsCredsFromCredentialExport (0.703)
/**
 * 运行 awsCredentialExport 命令（项目设置来源需信任），解析 STS 形状的 JSON 输出得到 AWS 凭证（AccessKeyId/SecretAccessKey/SessionToken）。
 */
async function getAwsCredsFromCredentialExport() {
  let awsCredentialExport = getConfiguredAwsCredentialExport();
  if (!awsCredentialExport) return null;
  if (isAwsCredentialExportFromProjectSettings()) {
    if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) {
      let error = Error(
        `Security: awsCredentialExport executed before workspace trust is confirmed. If you see this message, post in ${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.FEEDBACK_CHANNEL
        }.`,
      );
      logAntError("awsCredentialExport invoked before trust check", error);
      logEvent("tengu_awsCredentialExport_missing_trust", {});
      return null;
    }
  }
  try {
    logForDebugging("Running AWS credential export command");
    let hasTrust = getProjectConfigRoot();
    let result = await runManagedHelperWithoutProjectEnv(
      "awsCredentialExport",
      awsCredentialExport,
      () =>
        safeExecShell(awsCredentialExport, {
          ...(hasTrust !== null && {
            cwd: hasTrust,
          }),
          reject: false,
          useToolMemoryCgroup: false,
        }),
      isProjectScopeTrustAccepted,
    );
    if (result.exitCode !== 0 || !result.stdout)
      throw Error("awsCredentialExport did not return a valid value");
    let s = jsonParse(result.stdout.trim());
    let awsOutput = extractStsCredentials(s);
    if (!awsOutput) throw Error("awsCredentialExport did not return valid AWS STS output structure");
    logForDebugging("AWS credentials retrieved from awsCredentialExport");
    let Expiration = awsOutput.Expiration;
    let S = typeof Expiration === "string" ? Date.parse(Expiration) : NaN;
    return {
      accessKeyId: awsOutput.AccessKeyId,
      secretAccessKey: awsOutput.SecretAccessKey,
      sessionToken: awsOutput.SessionToken,
      expiration: Number.isFinite(S) ? S : undefined,
    };
  } catch (e) {
    let message = sequential.red(
      "Error getting AWS credentials from awsCredentialExport (in settings or ~/.claude.json):",
    );
    if (e instanceof Error) console.error(message, e.message);
    else console.error(message, e);
    return null;
  }
}
//@ chunk-aepeg2w5.js:531308-531567 layout
/**
 * 解析 AWS 凭证：先 awsAuthRefresh、再 awsCredentialExport；刷新成功后清 AWS ini 与默认链缓存。
 */
async function resolveAwsCredentialsViaHelpers(e) {
  let startTime = performance.now();
  logForDebugging("[API:auth] AWS credential resolve start");
  let r = await runAwsAuthRefresh();
  let awsCredsFromCredentialExport = await getAwsCredsFromCredentialExport();
  if (r) {
    await clearAwsIniCache();
    e.defaultChain.cache.clear();
  }
  logForDebugging(`[API:auth] AWS credential resolve done in ${Math.round(performance.now() - startTime)}ms`);
  return awsCredsFromCredentialExport;
}
//@ chunk-aepeg2w5.js:531567-531697 facade-majority
function refreshAndGetAwsCredentials(signal, { userTurn: n = false } = {}) {
  let host = getRootSession().host;
  return awsAuthRefreshStates.of(host).waiters.wait(
    () => awsCredentialMemos.of(host).helper(),
    {
      signal,
      userTurn: n,
    },
    null,
  );
}
//@ chunk-aepeg2w5.js:531697-531795 layout
function computeAwsCredsCacheTtl(e) {
  let n = e === undefined ? undefined : e - Date.now();
  if (n === undefined || n <= AWS_CREDS_REFRESH_SKEW_MS + AWS_CREDS_MIN_TTL_MS)
    return DEFAULT_AWS_CREDS_TTL_MS;
  return n - AWS_CREDS_REFRESH_SKEW_MS;
}
//@ chunk-aepeg2w5.js:531795-531818 facade-majority
var AWS_CHAIN_REQUEST_TIMEOUT_MS = 30000;
var AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS = 30000;
//@ chunk-aepeg2w5.js:531818-532127 facade-majority
/**
 * 给 AWS 默认凭证链解析加超时（CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS，默认 60 秒）。
 */
async function resolveWithStallGuard(e, n = env.CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS ?? 60000) {
  let r;
  try {
    return await Promise.race([
      e,
      new Promise((resolve, reject) => {
        r = setTimeout(
          (y) =>
            y(
              Object.assign(Error("AWS default-chain credential resolve timed out"), {
                name: "CredentialsProviderError",
              }),
            ),
          n,
          reject,
        );
      }),
    ]);
  } finally {
    clearTimeout(r);
    e.catch(() => {});
  }
}
//@ chunk-aepeg2w5.js:532127-532748 layout
/**
 * 创建按区域缓存的 AWS 默认凭证链（@aws-sdk fromNodeProviderChain + STS 代理配置），CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS 超时。
 */
async function createAwsDefaultChainResolver(e) {
  let n = memoizeWithTTL(
    async () => {
      logForDebugging(`[API:auth] resolving default AWS provider chain (region: ${e})`);
      let [{ fromNodeProviderChain: r }, awsProxyRequestHandler] = await Promise.all([
        import("./chunk-thwbpw6e.js"),
        getAWSProxyRequestHandler({
          url: resolveStsEndpointForProxyUrl(e),
          requestTimeoutMs: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
        }),
      ]);
      let h = r({
        ignoreCache: true,
        parentClientConfig: {
          region: e,
          requestHandler:
            awsProxyRequestHandler ??
            new smithyFetchHttpHandlerModule.FetchHttpHandler({
              requestTimeout: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
            }),
        },
        clientConfig: {
          requestHandler:
            awsProxyRequestHandler ??
            new smithyFetchHttpHandlerModule.FetchHttpHandler({
              requestTimeout: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
            }),
        },
      });
      return resolveWithStallGuard(h());
    },
    (r) => computeAwsCredsCacheTtl(r.expiration?.getTime()),
    (r, s) => {
      if (r.expiration === undefined) return true;
      let time = r.expiration.getTime();
      if (time > Date.now() + AWS_CHAIN_REQUEST_TIMEOUT_MS) return true;
      return s >= time - AWS_CHAIN_REQUEST_TIMEOUT_MS && time > Date.now();
    },
  );
  return () => n();
}
//@ chunk-aepeg2w5.js:532748-532804 facade-majority
function getDefaultAwsProviderChain(e) {
  return awsCredentialMemos.of(getRootSession().host).defaultChain(e);
}
//@ chunk-aepeg2w5.js:532804-532895 facade-majority
/**
 * 返回 Bedrock 用的 AWS 凭证提供器：CLAUDE_CODE_SKIP_AWS_CRED_CACHE 时每次重建默认链，否则按区域缓存。
 */
function defaultAwsProviderChainResolver(e, getNativeCaBlocks = getCACertificates) {
  if (env.CLAUDE_CODE_SKIP_AWS_CRED_CACHE) return () => createUncachedAwsDefaultChain(getNativeCaBlocks);
  return () => getDefaultAwsProviderChain(e);
}
//@ chunk-aepeg2w5.js:532895-533033 layout
async function createUncachedAwsDefaultChain(caList) {
  let { fromNodeProviderChain } = await import("./chunk-thwbpw6e.js");
  return fromNodeProviderChain({
    clientConfig: {
      requestHandler: new CaFetchHttpHandler(caList),
    },
  });
}
//@ chunk-aepeg2w5.js:533033-533085 layout
function awsChainCacheKey(e) {
  return `${env.AWS_PROFILE ?? ""}\x00${e}`;
}
//@ chunk-aepeg2w5.js:533085-533096 layout
/**
 * AWS 链解析失败后的冷却时间（10 秒）。
 */
var CHAIN_EVICTION_COOLDOWN_MS = 1e4;
//@ chunk-aepeg2w5.js:533096-533322 facade-majority
function invalidateDefaultAwsProviderChainDebounced(region) {
  let n = awsChainCacheKey(region);
  let now = Date.now();
  let s = awsCredentialMemos.of(getRootSession().host);
  if (now - (s.chainEvictionAt.get(n) ?? 0) < CHAIN_EVICTION_COOLDOWN_MS) return false;
  s.chainEvictionAt.set(n, now);
  s.defaultChain.cache.delete(n);
  s.ssoRole.cache.clear();
  s.ssoProfile.cache.clear();
  return true;
}
//@ chunk-aepeg2w5.js:533322-533489 facade-majority
/**
 * 清空 AWS 凭证相关缓存（helper、默认链、SSO role/profile）。
 */
function clearAwsCredentialsCache() {
  let e = awsCredentialMemos.of(getRootSession().host);
  e.helper.cache.clear();
  e.defaultChain.cache.clear();
  e.ssoRole.cache.clear();
  e.ssoProfile.cache.clear();
  e.chainEvictionAt.clear();
}
//@ chunk-aepeg2w5.js:533489-533542 facade-majority
function clearAwsHelperCredentialsCache() {
  awsCredentialMemos.of(getRootSession().host).helper.cache.clear();
}
//@ chunk-aepeg2w5.js:533542-533611 facade-majority
function resetAwsAuthRefreshCooldown() {
  let e = awsAuthRefreshStates.of(getRootSession().host);
  e.lastRefreshAt = null;
  e.epoch++;
}
//@ chunk-aepeg2w5.js:533611-533702 facade-majority = getConfiguredGcpAuthRefresh (0.524)
/**
 * 设置中的 gcpAuthRefresh 命令。
 */
function getConfiguredGcpAuthRefresh() {
  if (isHostManagedProviderAuth()) return;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("gcpAuthRefresh", mergedSettings.gcpAuthRefresh);
}
//@ chunk-aepeg2w5.js:533702-533869 facade-majority = isGcpAuthRefreshFromProjectSettings (0.784)
function isGcpAuthRefreshFromProjectSettings() {
  let gcpAuthRefresh = getConfiguredGcpAuthRefresh();
  if (!gcpAuthRefresh) return false;
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  return (
    projectSettings?.gcpAuthRefresh === gcpAuthRefresh ||
    localSettings?.gcpAuthRefresh === gcpAuthRefresh ||
    isHookedMergeAnswer("gcpAuthRefresh")
  );
}
//@ chunk-aepeg2w5.js:533869-533881 layout
/**
 * GCP 凭据检查的超时时间（5 秒）。
 */
var GCP_CREDS_CHECK_TIMEOUT_MS = 5000;
//@ chunk-aepeg2w5.js:533881-534017 facade-majority
/**
 * GCP 项目 ID：GCLOUD_PROJECT、GOOGLE_CLOUD_PROJECT（含小写变体）或 ANTHROPIC_VERTEX_PROJECT_ID。
 */
function getConfiguredVertexProjectId() {
  return (
    env.GCLOUD_PROJECT ||
    env.GOOGLE_CLOUD_PROJECT ||
    env.gcloud_project ||
    env.google_cloud_project ||
    env.ANTHROPIC_VERTEX_PROJECT_ID
  );
}
//@ chunk-aepeg2w5.js:534017-534670 facade-majority = checkGcpCredentialsValid (0.489)
/**
 * 用 google-auth-library 取一次 access token 检查 GCP 凭证（scope cloud-platform，项目取 GCLOUD_PROJECT/ANTHROPIC_VERTEX_PROJECT_ID 等），5 秒超时，返回 valid/invalid/timeout。
 */
async function checkGcpCredentialsValid() {
  let now = Date.now();
  try {
    let { GoogleAuth } = await import("./chunk-ndb2dret.js").then((m) => Re(m.default, 1));
    let r = getConfiguredVertexProjectId() || env.ANTHROPIC_GOOGLE_CLOUD_PROJECT;
    let auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      ...(r && {
        projectId: r,
      }),
      clientOptions: vertexAuthClientOptions(),
    });
    let probe = (async () => {
      await (await auth.getClient()).getAccessToken();
    })();
    let timeout = sleep(GCP_CREDS_CHECK_TIMEOUT_MS).then(() => {
      throw new GcpCredentialsTimeoutError("GCP credentials check timed out");
    });
    await Promise.race([probe, timeout]);
    return "valid";
  } catch (error) {
    let r = Date.now() - now;
    if (error instanceof GcpCredentialsTimeoutError) {
      logForDebugging(`GCP credentials check did not finish within ${r}ms`, {
        level: "warn",
      });
      return "timeout";
    }
    logForDebugging(`GCP credentials check failed after ${r}ms: ${errorMessage(error)}`);
    return "invalid";
  }
}
//@ chunk-aepeg2w5.js:534670-534781 layout
class GcpAuthRefreshState {
  rejectedByApi = false;
  inFlight = null;
  signInFailures = 0;
  singleFlight = new CloudAuthRefreshRuns();
  waiters = new RefreshController(this.singleFlight);
}
//@ chunk-aepeg2w5.js:534781-534807 facade-majority
var gcpAuthRefreshStates = new HostScoped(() => new GcpAuthRefreshState());
//@ chunk-aepeg2w5.js:534807-534888 facade-majority
function markGcpCredentialsRejected() {
  let host = getRootSession().host;
  gcpRefreshMemos.of(host).cache.clear();
  gcpAuthRefreshStates.of(host).rejectedByApi = true;
}
//@ chunk-aepeg2w5.js:534888-534903 layout
var GCP_AUTH_REFRESH_TTL_MS = 3600000;
//@ chunk-aepeg2w5.js:534903-537379 fingerprint = runGcpAuthRefresh (0.324)
/**
 * 按需运行 gcpAuthRefresh（如 gcloud auth application-default login）：先检查 GCP 凭证，无效才执行，结果按 1 小时缓存。
 */
async function runGcpAuthRefresh() {
  let host = getRootSession().host;
  let n = gcpAuthRefreshStates.of(host);
  let signal = n.waiters.signal;
  let gcpAuthRefresh = getConfiguredGcpAuthRefresh();
  if (!gcpAuthRefresh) return false;
  if (env.CLAUDE_CODE_CONFIG_PROBE) {
    logForDebugging("Skipping gcpAuthRefresh in the IDE config probe");
    return false;
  }
  if (isGcpAuthRefreshFromProjectSettings()) {
    if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) {
      let j = Error(
        `Security: gcpAuthRefresh executed before workspace trust is confirmed. If you see this message, post in ${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.FEEDBACK_CHANNEL
        }.`,
      );
      logAntError("gcpAuthRefresh invoked before trust check", j);
      logEvent("tengu_gcpAuthRefresh_missing_trust", {});
      return false;
    }
  }
  let { lockfilePath } = getOperationLockPaths("gcpAuthRefresh", gcpAuthRefresh, (G) =>
    managedHelperSettingsGate("gcpAuthRefresh", gcpAuthRefresh, G, isProjectScopeTrustAccepted),
  );
  if (n.inFlight?.lockfilePath === lockfilePath) {
    n.rejectedByApi = false;
    return n.inFlight.run;
  }
  let rejectedByApi = n.rejectedByApi;
  n.rejectedByApi = false;
  logForDebugging("Checking GCP credentials validity for auth refresh");
  let probedAt = Date.now();
  switch (await checkGcpCredentialsValid()) {
    case "valid":
      logForDebugging("GCP credentials are valid, skipping auth refresh command");
      n.waiters.clearTakeover();
      return false;
    case "timeout":
      if (!rejectedByApi) {
        logForDebugging(
          "GCP credentials check timed out, skipping auth refresh command until the API rejects the credentials",
        );
        return false;
      }
      break;
    case "invalid":
      break;
  }
  if (n.inFlight?.lockfilePath === lockfilePath) return n.inFlight.run;
  let R = () => {
    gcpRefreshMemos.of(host).cache.clear();
    n.rejectedByApi ||= rejectedByApi;
  };
  if (signal.aborted && !n.waiters.hasCallers()) {
    R();
    return false;
  }
  let signal_2 = n.waiters.signal;
  let P;
  let F = () => {
    if (P === undefined || P.endedByLock.aborted) {
      R();
      if (n.inFlight?.run === L) n.inFlight = null;
    }
  };
  let L = runCloudAuthRefresh({
    setting: "gcpAuthRefresh",
    command: gcpAuthRefresh,
    readEnvAsCommandStarts: (G) =>
      managedHelperSettingsGate("gcpAuthRefresh", gcpAuthRefresh, G, isProjectScopeTrustAccepted),
    probedAt,
    singleFlight: n.singleFlight,
    signal: signal_2,
    takeover: n.waiters.takeTakeover(),
    reprobe: async () => {
      let isValid = await checkGcpCredentialsValid();
      return isValid === "timeout" ? "unknown" : isValid;
    },
    refresh: (signal, j) => {
      n.waiters.clearTakeover();
      let ee = refreshGcpAuth(gcpAuthRefresh, signal, j);
      P = {
        outcome: ee,
        endedByLock: signal,
      };
      return ee;
    },
  })
    .then(async (refreshed) => {
      let j = await settleRefreshOutcome({
        refreshed,
        stop: signal_2,
        command: P,
        forget: R,
      });
      if (j) n.waiters.clearTakeover();
      else if (
        isRefreshStillWanted({
          stop: signal_2,
          command: P,
          waiters: n.waiters,
        }) &&
        isAuthRefreshLockEnabled()
      )
        n.signInFailures++;
      return j;
    })
    .finally(() => {
      signal_2.removeEventListener("abort", F);
      if (n.inFlight?.run === L) n.inFlight = null;
    });
  n.inFlight = {
    lockfilePath,
    run: L,
  };
  signal_2.addEventListener("abort", F, {
    once: true,
  });
  return L;
}
//@ chunk-aepeg2w5.js:537379-537393 layout
var GCP_AUTH_REFRESH_TIMEOUT_MS = 180000;
//@ chunk-aepeg2w5.js:537393-538481 facade-majority = refreshGcpAuth (0.712)
function refreshGcpAuth(gcpAuthRefresh, signal, r) {
  if (isDisklessSession()) {
    logForDebugging(`GCP auth refresh: ${DISKLESS_PROGRAM_REFUSAL}`);
    return Promise.resolve("failed");
  }
  logForDebugging("Running GCP auth refresh command");
  let authStatusManager = AwsAuthStatusManager.getInstance();
  authStatusManager.startAuthentication();
  return new Promise((resolve) => {
    let projectConfigRoot = getProjectConfigRoot();
    let S = runManagedHelperWithoutProjectEnv(
      "gcpAuthRefresh",
      gcpAuthRefresh,
      () =>
        exec(gcpAuthRefresh, {
          ...(projectConfigRoot !== null && {
            cwd: projectConfigRoot,
          }),
          windowsHide: true,
        }),
      isProjectScopeTrustAccepted,
    );
    moveKeeperPid(S.pid);
    if (S.pid !== undefined) r?.(S.pid);
    let w = new TimedOperation(S, {
      timeoutMs: GCP_AUTH_REFRESH_TIMEOUT_MS,
      signal,
    });
    S.stdout.on("data", (data) => {
      let output = data.toString().trim();
      if (output) {
        authStatusManager.addOutput(output);
        logForDebugging(output, {
          level: "debug",
        });
      }
    });
    S.stderr.on("data", (data) => {
      let error = data.toString().trim();
      if (error) {
        authStatusManager.setError(error);
        logForDebugging(error, {
          level: "error",
        });
      }
    });
    S.on("close", (code, signal) => {
      w.settle();
      if (code === 0) {
        logForDebugging("GCP auth refresh completed successfully");
        authStatusManager.endAuthentication(true);
        resolve("ok");
      } else if (w.killReason === "abort") {
        authStatusManager.dismiss();
        resolve("interrupted");
      } else {
        let P = w.killReason === "shutdown" || (isTerminationSignal(signal) && w.killReason === undefined);
        let message =
          w.killReason === "timeout"
            ? sequential.red(
                "GCP auth refresh timed out after 3 minutes. Run your auth command manually in a separate terminal.",
              )
            : sequential.red("Error running gcpAuthRefresh (in settings or ~/.claude.json):");
        if (!P) console.error(message);
        authStatusManager.endAuthentication(false);
        resolve(P ? "interrupted" : "failed");
      }
    });
  });
}
//@ chunk-aepeg2w5.js:538481-538528 facade-majority
var gcpRefreshMemos = new HostScoped(() =>
  memoizeWithTTL(async () => await runGcpAuthRefresh(), GCP_AUTH_REFRESH_TTL_MS),
);
//@ chunk-aepeg2w5.js:538528-538650 facade-majority
function refreshGcpCredentialsIfNeeded(signal, { userTurn: n = false } = {}) {
  let host = getRootSession().host;
  return gcpAuthRefreshStates.of(host).waiters.wait(
    () => gcpRefreshMemos.of(host)(),
    {
      signal,
      userTurn: n,
    },
    false,
  );
}
//@ chunk-aepeg2w5.js:538650-538704 facade-majority
function gcpSignInFailures() {
  return gcpAuthRefreshStates.of(getRootSession().host).signInFailures;
}
//@ chunk-aepeg2w5.js:538704-538758 facade-majority
function awsSignInFailures() {
  return awsAuthRefreshStates.of(getRootSession().host).signInFailures;
}
//@ chunk-aepeg2w5.js:538758-538839 facade-majority
function clearGcpCredentialsCache() {
  let host = getRootSession().host;
  gcpRefreshMemos.of(host).cache.clear();
  gcpAuthRefreshStates.of(host).rejectedByApi = false;
}
//@ chunk-aepeg2w5.js:538839-538951 facade-majority = prefetchGcpCredentialsIfSafe (0)
/**
 * 启动时在安全情况下预取 Vertex 用的 GCP 凭证。
 */
function prefetchGcpCredentialsIfSafe() {
  if (!getConfiguredGcpAuthRefresh() || env.CLAUDE_CODE_CONFIG_PROBE) return;
  if (isGcpAuthRefreshFromProjectSettings()) {
    if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) return;
  }
  gcpRefreshMemos.of(getRootSession().host)();
}
//@ chunk-aepeg2w5.js:538951-539101 facade-majority = prefetchAwsCredentialsAndBedRockInfoIfSafe (0)
/**
 * 启动时在安全的情况下（无需信任或已信任）预取 Bedrock 用的 AWS 凭证。
 */
function prefetchAwsCredentialsAndBedRockInfoIfSafe() {
  let awsAuthRefresh = getConfiguredAwsAuthRefresh();
  let awsCredentialExport = getConfiguredAwsCredentialExport();
  if ((!awsAuthRefresh && !awsCredentialExport) || env.CLAUDE_CODE_CONFIG_PROBE) return;
  if (isAwsAuthRefreshFromProjectSettings() || isAwsCredentialExportFromProjectSettings()) {
    if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) return;
  }
  awsCredentialMemos.of(getRootSession().host).helper();
  getModelStrings();
}
//@ chunk-aepeg2w5.js:539101-539234 fingerprint = getApiKeyFromConfigOrMacOSKeychain (0.726)
/**
 * 读取 /login 创建并保存在 ~/.claude.json 的 primaryApiKey，来源记为 '/login managed key'；宿主托管或 diskless 时返回 null。316 这里不再读 macOS 钥匙串。
 */
function getApiKeyFromConfigOrMacOSKeychain_2() {
  if (usesHostProvidedAuth()) return null;
  let prefetch = getGlobalConfig();
  if (!prefetch.primaryApiKey) return null;
  return {
    key: prefetch.primaryApiKey,
    source: "/login managed key",
  };
}
//@ chunk-aepeg2w5.js:539234-539314 layout
class ApiKeyConfigCache {
  value = undefined;
  promise = null;
  clear() {
    this.value = undefined;
    this.promise = null;
  }
}
//@ chunk-aepeg2w5.js:539314-539340 facade-majority
var loginManagedKeyMemos = new HostScoped(() => new ApiKeyConfigCache());
//@ chunk-aepeg2w5.js:539340-539378 layout
function getApiKeyConfigCache() {
  return loginManagedKeyMemos.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:539378-539489 facade-majority
function getApiKeyFromConfigOrMacOSKeychain() {
  if (isBareModeAuthRestricted()) return null;
  let apiKeyConfigCache = getApiKeyConfigCache();
  if (apiKeyConfigCache.value !== undefined) return apiKeyConfigCache.value;
  let apiKeyFromConfigOrMacOSKeychain = getApiKeyFromConfigOrMacOSKeychain_2();
  apiKeyConfigCache.value = apiKeyFromConfigOrMacOSKeychain;
  return apiKeyFromConfigOrMacOSKeychain;
}
//@ chunk-aepeg2w5.js:539489-539537 file-local
function isValidApiKey(apiKey) {
  return /^[a-zA-Z0-9-_]+$/.test(apiKey);
}
//@ chunk-aepeg2w5.js:539537-540498 facade-majority = saveApiKey (0.812)
/**
 * 保存 /login 得到的 API key：校验字符集，写入全局配置 primaryApiKey，并把截断值加入 customApiKeyResponses.approved（macOS 上同时 security add-generic-password 写钥匙串）。
 */
async function saveApiKey(apiKey, n) {
  if (!isValidApiKey(apiKey))
    throw Error(
      "Invalid API key format. API key must contain only alphanumeric characters, dashes, and underscores.",
    );
  let apiKeyConfigCache = getApiKeyConfigCache();
  await removeKeychainApiKey();
  let savedToKeychain = false;
  if (savedToKeychain) {
    let storageServiceName = getMacOsKeychainStorageServiceName();
    let username = getUsername();
    let hexValue = Buffer.from(apiKey, "utf-8").toString("hex");
    let command = `add-generic-password -U -a "${username}" -s "${storageServiceName}" -X "${hexValue}"
`;
    let x = await safeExecFile("security", ["-i"], {
      input: command,
      reject: false,
      timeout: 5000,
    });
    if (x.exitCode !== 0) {
      let stderr = (x.stderr || x.stdout || "").trim().replace(/\s*\n\s*/g, "; ");
      logEvent("tengu_api_key_keychain_error", {
        error_class: fromEnum(classifyKeychainError(stderr)),
        error_hash: shortHash(scrubErrorText(stderr)),
        exit_code: x.exitCode ?? -1,
      });
      throw Error(
        `Failed to save API key to macOS Keychain${stderr ? ` (${stderr})` : ""}. Run \`claude doctor\` to diagnose keychain access.`,
      );
    }
    logEvent("tengu_api_key_saved_to_keychain", {});
  } else logEvent("tengu_api_key_saved_to_config", {});
  let normalizedKey = tailOfId(apiKey);
  await saveGlobalConfig((current) => {
    let { approved, rejected } = customApiKeyResponsesOf(current);
    return {
      ...current,
      primaryApiKey: savedToKeychain ? current.primaryApiKey : apiKey,
      customApiKeyResponses: {
        approved: approved.includes(normalizedKey) ? approved : [...approved, normalizedKey],
        rejected,
      },
    };
  }, n);
  apiKeyConfigCache.clear();
  clearLegacyApiKeyPrefetch();
}
//@ chunk-aepeg2w5.js:540498-540605 facade-majority = removeApiKey (0.752)
/**
 * 删除保存的 primaryApiKey（及钥匙串项）。
 */
async function removeApiKey(storageV5) {
  let apiKeyConfigCache = getApiKeyConfigCache();
  await removeKeychainApiKey();
  await saveGlobalConfig(
    (current) => ({
      ...current,
      primaryApiKey: undefined,
    }),
    storageV5,
  );
  apiKeyConfigCache.clear();
  clearLegacyApiKeyPrefetch();
}
//@ chunk-aepeg2w5.js:540605-540725 layout
async function removeKeychainApiKey() {
  try {
    await noopAsync();
  } catch (error) {
    logForDebugging(`Failed to remove API key from macOS keychain: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-aepeg2w5.js:540725-541052 layout
/**
 * 由新令牌（与旧记录）构造要存储的 OAuth 令牌对象：令牌、过期时间、权限、订阅类型（登录时直接采用，刷新时按来源与可信度合并）、限流档位与 clientId。
 */
function buildStoredOAuthTokens(previous, tokens, reason = "refresh") {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt ?? previous?.refreshTokenExpiresAt,
    scopes: tokens.scopes,
    ...(reason === "sign_in" ? subscriptionFromSignIn(tokens) : mergeSubscriptionType(previous, tokens)),
    rateLimitTier: tokens.rateLimitTier ?? (reason === "sign_in" ? null : (previous?.rateLimitTier ?? null)),
    clientId: tokens.clientId,
  };
}
//@ chunk-aepeg2w5.js:541052-541345 layout
function subscriptionFromSignIn(tokens) {
  let subscriptionType = tokens.subscriptionType ?? null;
  if (subscriptionType === null)
    return {
      subscriptionType,
    };
  return tokens.subscriptionTypeSource === "profile"
    ? {
        subscriptionType,
        subscriptionTypeSource: "profile",
        subscriptionTypeVerifiedAt: tokens.subscriptionTypeVerifiedAt,
      }
    : {
        subscriptionType,
        subscriptionTypeSource: "sign_in",
      };
}
//@ chunk-aepeg2w5.js:541345-541675 layout
/**
 * 保留之前的订阅类型及其来源（profile 来源还保留验证时间），用于更新凭据时沿用。
 */
function previousSubscription(previous) {
  let subscriptionType = previous?.subscriptionType ?? null;
  if (subscriptionType === null || previous?.subscriptionTypeSource === undefined)
    return {
      subscriptionType,
    };
  return previous.subscriptionTypeSource === "profile"
    ? {
        subscriptionType,
        subscriptionTypeSource: "profile",
        subscriptionTypeVerifiedAt: previous.subscriptionTypeVerifiedAt,
      }
    : {
        subscriptionType,
        subscriptionTypeSource: "sign_in",
      };
}
//@ chunk-aepeg2w5.js:541675-542328 layout
/**
 * 刷新令牌时合并订阅类型：登录来源只在无旧值或一致时采用；profile 来源在非临时计划的降级、与登录来源相同或缺少验证时间时保留旧值，否则采用新值并记录验证时间。
 */
function mergeSubscriptionType(previous, tokens) {
  let prevType = previous?.subscriptionType ?? null;
  let kept = previousSubscription(previous);
  let newType = tokens.subscriptionType ?? null;
  if (newType === null) return kept;
  if (tokens.subscriptionTypeSource === "sign_in")
    return prevType === null || (prevType === newType && previous?.subscriptionTypeSource !== "profile")
      ? {
          subscriptionType: newType,
          subscriptionTypeSource: "sign_in",
        }
      : kept;
  if (tokens.subscriptionTypeSource === undefined)
    return prevType === null
      ? {
          subscriptionType: newType,
        }
      : kept;
  let y = prevType !== null && previous?.subscriptionTypeSource !== "profile";
  let S = isProvisionalProfilePlan(previous);
  if (
    (!S && isProfilePlanDowngrade(prevType, newType)) ||
    (y && newType === prevType) ||
    (tokens.subscriptionTypeVerifiedAt === undefined && prevType !== null && !S)
  )
    return kept;
  return {
    subscriptionType: newType,
    subscriptionTypeSource: "profile",
    subscriptionTypeVerifiedAt: pickLaterVerifiedAt(
      tokens.subscriptionTypeVerifiedAt,
      prevType === newType ? previous?.subscriptionTypeVerifiedAt : undefined,
    ),
  };
}
//@ chunk-aepeg2w5.js:542328-543890 facade-majority
async function saveRefreshedOAuthTokensRespectingLock({
  isCompromised,
  postedRefreshToken,
  refreshedTokens,
  credentials,
}) {
  if (
    shouldUseClaudeAIAuth(refreshedTokens.scopes) &&
    refreshedTokens.refreshToken &&
    refreshedTokens.expiresAt
  ) {
    let y = isCompromised();
    if (y) logEvent("tengu_oauth_token_refresh_lock_compromised_post_post", {});
    let tokens = {
      accessToken: refreshedTokens.accessToken,
      refreshToken: refreshedTokens.refreshToken,
      expiresAt: refreshedTokens.expiresAt,
      refreshTokenExpiresAt: refreshedTokens.refreshTokenExpiresAt,
      scopes: refreshedTokens.scopes,
      subscriptionType: refreshedTokens.subscriptionType,
      subscriptionTypeSource: refreshedTokens.subscriptionTypeSource,
      subscriptionTypeVerifiedAt: refreshedTokens.subscriptionTypeVerifiedAt,
      rateLimitTier: refreshedTokens.rateLimitTier,
      clientId: refreshedTokens.clientId,
    };
    let w = false;
    let storageBackend = storageKindForTelemetry();
    let x = {
      success: false,
    };
    let P = false;
    let F;
    for (let idx = 0; idx < 3; idx++) {
      if (idx > 0) await sleep(100 * idx);
      w = false;
      P = false;
      try {
        x = await getSecureStorage().mutate((G) => {
          let refreshToken = G.claudeAiOauth?.refreshToken;
          if (!(
            G.claudeAiOauth !== undefined &&
            G.claudeAiOauth !== null &&
            (refreshToken === "" || refreshToken === postedRefreshToken)
          )) {
            w = true;
            return G;
          }
          return {
            ...G,
            claudeAiOauth: buildStoredOAuthTokens(G.claudeAiOauth, tokens),
          };
        }, credentials);
      } catch (error) {
        logForDebugging(`OAuth refresh CAS save failed: ${errorMessage(error)}`, {
          level: "error",
        });
        x = {
          success: false,
        };
        P = true;
        F = error;
        continue;
      }
      if (w || x.success) break;
    }
    if (P) clearOAuthTokenCache();
    else {
      let L = isStorageV5Enabled() && credentials !== undefined ? credentials : undefined;
      let promise = L && oauthTokenReadMemos.of(getRootSession().host).promise;
      clearOAuthAndKeychainCaches();
      if (L !== undefined) await primeStoredLogin(L, promise);
    }
    if (P)
      logEvent("tengu_oauth_tokens_save_exception", {
        storageBackend,
        ...errorTelemetryFields(F),
      });
    if (!w && !P)
      logEvent(x.success ? "tengu_oauth_tokens_saved" : "tengu_oauth_tokens_save_failed", {
        storageBackend,
      });
    if (y)
      logEvent(
        w
          ? "tengu_oauth_refresh_compromised_cas_adopted_sibling"
          : "tengu_oauth_refresh_compromised_cas_saved",
        {},
      );
    else if (w) logEvent("tengu_oauth_refresh_save_adopted_newer_write", {});
    if (w) {
      notifyOAuthTokenReplaced();
      return "adopted_sibling";
    }
    return x.success ? "saved" : "save_failed";
  }
  let h = await saveOAuthTokensIfNeeded(refreshedTokens, credentials);
  clearOAuthTokenCache();
  return h.success ? "saved" : "save_failed";
}
//@ chunk-aepeg2w5.js:543890-543925 layout
/**
 * 返回安全存储的类型名（遥测用）。
 */
function storageKindForTelemetry() {
  return storageKindForTelemetry_2(getSecureStorage().name);
}
//@ chunk-aepeg2w5.js:543925-543963 facade-majority
var OAUTH_TOKEN_SAVE_FAILED_WARNING = "Failed to save OAuth tokens";
//@ chunk-aepeg2w5.js:543963-544048 facade-majority = isBigQueryMetricsEnabled (1)
function isProfilePlanDowngrade(e, n) {
  return (e === "team" || e === "enterprise") && n !== "team" && n !== "enterprise";
}
//@ chunk-aepeg2w5.js:544048-544148 facade-majority
function isProvisionalProfilePlan(e) {
  return e?.subscriptionTypeSource === "profile" && e.subscriptionTypeVerifiedAt === undefined;
}
//@ chunk-aepeg2w5.js:544148-544249 facade-majority
function isUnmarkedStoredPlan(e) {
  return e != null && (e.subscriptionType ?? null) !== null && e.subscriptionTypeSource === undefined;
}
//@ chunk-aepeg2w5.js:544249-544340 layout
/**
 * 取较晚且有效的“订阅类型已验证”时间。
 */
function pickLaterVerifiedAt(e, n) {
  if (e === undefined || n === undefined) return e ?? n;
  return n > Date.now() ? e : Math.max(e, n);
}
//@ chunk-aepeg2w5.js:544340-545376 facade-majority
async function backfillStoredOAuthTier({
  expectedRefreshToken,
  subscriptionType,
  rateLimitTier,
  verifiedAt,
  originStamped,
  credentials,
}) {
  if (!originStamped) return "unstamped";
  let S = "failed";
  try {
    let w = await getSecureStorage().mutate((R) => {
      let claudeAiOauth = R.claudeAiOauth;
      if (!claudeAiOauth || claudeAiOauth.refreshToken !== expectedRefreshToken) {
        S = "rotated";
        return R;
      }
      let subscriptionType_2 = claudeAiOauth.subscriptionType ?? null;
      if (subscriptionType_2 !== null && claudeAiOauth.subscriptionTypeSource === "sign_in") {
        S = "already_tiered";
        return R;
      }
      if (isUnmarkedStoredPlan(claudeAiOauth) && subscriptionType_2 === subscriptionType) {
        S = "confirmed";
        return {
          ...R,
          claudeAiOauth: {
            ...claudeAiOauth,
            subscriptionTypeSource: "sign_in",
            rateLimitTier: rateLimitTier ?? claudeAiOauth.rateLimitTier ?? null,
          },
        };
      }
      if (
        !isProvisionalProfilePlan(claudeAiOauth) &&
        isProfilePlanDowngrade(subscriptionType_2, subscriptionType)
      ) {
        S = "downgrade_refused";
        return R;
      }
      S = subscriptionType_2 === subscriptionType ? "reverified" : "written";
      return {
        ...R,
        claudeAiOauth: {
          ...claudeAiOauth,
          subscriptionType,
          subscriptionTypeSource: "profile",
          subscriptionTypeVerifiedAt: pickLaterVerifiedAt(
            verifiedAt,
            subscriptionType_2 === subscriptionType ? claudeAiOauth.subscriptionTypeVerifiedAt : undefined,
          ),
          rateLimitTier: rateLimitTier ?? claudeAiOauth.rateLimitTier ?? null,
        },
      };
    }, credentials);
    if (S === "written" || S === "reverified" || S === "confirmed") {
      if (!w.success) return "failed";
      clearOAuthAndKeychainCaches();
    }
    return S;
  } catch (error) {
    logForDebugging(
      `OAuth: recording the stored login plan failed (${error instanceof Error ? error.name : "unknown error"})`,
      {
        level: "error",
      },
    );
    return "failed";
  }
}
//@ chunk-aepeg2w5.js:545376-546640 facade-majority = saveOAuthTokensIfNeeded (0.676)
/**
 * 把 OAuth 令牌写入安全存储的 claudeAiOauth（accessToken/refreshToken/expiresAt/scopes/subscriptionType/rateLimitTier…）；非 claude.ai scope 或仅推理令牌（无 refresh/expires）不保存。
 */
async function saveOAuthTokensIfNeeded(tokens, n, reason = "refresh") {
  if (!shouldUseClaudeAIAuth(tokens.scopes)) {
    logEvent("tengu_oauth_tokens_not_claude_ai", {});
    return {
      success: true,
    };
  }
  if (!tokens.refreshToken || !tokens.expiresAt) {
    logEvent("tengu_oauth_tokens_inference_only", {});
    return {
      success: true,
    };
  }
  let { accessToken, refreshToken, expiresAt, refreshTokenExpiresAt, scopes, clientId } = tokens;
  let secureStorage = getSecureStorage();
  let storageBackend = storageKindForTelemetry();
  try {
    let F = oauthTokenReadMemos.of(getRootSession().host);
    let L;
    let G = await secureStorage.mutate((q) => {
      if (
        reason === "sign_in" &&
        L === undefined &&
        q.claudeAiOauth != null &&
        q.claudeAiOauth.accessToken !== accessToken
      )
        L = q.claudeAiOauth;
      return {
        ...q,
        claudeAiOauth: buildStoredOAuthTokens(
          q.claudeAiOauth,
          {
            accessToken,
            refreshToken,
            expiresAt,
            refreshTokenExpiresAt,
            scopes,
            subscriptionType: tokens.subscriptionType,
            subscriptionTypeSource: tokens.subscriptionTypeSource,
            subscriptionTypeVerifiedAt: tokens.subscriptionTypeVerifiedAt,
            rateLimitTier: tokens.rateLimitTier,
            clientId,
          },
          reason,
        ),
      };
    }, n);
    if (G.success) {
      F.lastOwnSavedAccessToken = accessToken;
      logEvent("tengu_oauth_tokens_saved", {
        storageBackend,
      });
    } else
      logEvent("tengu_oauth_tokens_save_failed", {
        storageBackend,
      });
    let j = isStorageV5Enabled() && n !== undefined ? n : undefined;
    let storageData = j && F.promise;
    clearOAuthTokenMemos();
    invalidateAuthDerivedCaches();
    if (j !== undefined) await primeStoredLogin(j, storageData);
    return {
      ...G,
      backendName: secureStorage.name,
      ...(L !== undefined && {
        replaced: L,
      }),
    };
  } catch (error) {
    logForDebugging(`Failed to save OAuth tokens: ${errorMessage(error)}`, {
      level: "error",
    });
    logEvent("tengu_oauth_tokens_save_exception", {
      storageBackend,
      ...errorTelemetryFields(error),
    });
    return {
      success: false,
      warning: OAUTH_TOKEN_SAVE_FAILED_WARNING,
      backendName: secureStorage.name,
    };
  }
}
//@ chunk-aepeg2w5.js:546640-546704 layout
/**
 * 进程内记录已知失效的 refresh token；同语句 $i 记录账户冻结（account_on_hold）的令牌，避免反复刷新。
 */
var deadRefreshTokens = identity_2(new Set(), (e) => e.clear());
var onHoldRefreshTokens = identity_2(new Map(), (e) => e.clear());
//@ chunk-aepeg2w5.js:546704-546809 facade-majority
function getOAuthAccountOnHold() {
  let refreshToken = getClaudeAIOAuthTokens()?.refreshToken;
  if (!refreshToken) return null;
  let n = onHoldRefreshTokens.get(refreshToken);
  return n === undefined
    ? null
    : {
        url: n,
      };
}
//@ chunk-aepeg2w5.js:546809-546846 facade-majority
function __resetKnownDeadRefreshTokensForTest() {
  deadRefreshTokens.clear();
  onHoldRefreshTokens.clear();
}
//@ chunk-aepeg2w5.js:546846-547345 facade-majority
async function markRefreshTokenDeadAfterInvalidGrant(e, n) {
  deadRefreshTokens.add(e);
  logEvent("tengu_oauth_refresh_token_marked_dead_invalid_grant", {});
  try {
    let r = false;
    let s = await getSecureStorage().mutate((h) => {
      let claudeAiOauth = h.claudeAiOauth;
      if (!claudeAiOauth || claudeAiOauth.refreshToken !== e) return h;
      r = true;
      return {
        ...h,
        claudeAiOauth: {
          ...claudeAiOauth,
          refreshToken: "",
          accessToken: "",
          expiresAt: 0,
        },
      };
    }, n);
    if (r && s.success) logEvent("tengu_oauth_refresh_token_cleared_on_disk", {});
    else if (r)
      logForDebugging("OAuth dead-token disk clear: backend write failed", {
        level: "error",
      });
  } catch (error) {
    logForDebugging(`OAuth dead-token disk clear failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-aepeg2w5.js:547345-547441 facade-majority
function isOAuthRefreshKnownDead() {
  let e = isRefreshTokenDead(getClaudeAIOAuthTokens());
  if (e !== undefined) return e;
  try {
    return hasDeadStoredRefreshToken(getSecureStorage().read());
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:547441-547562 facade-majority
async function isOAuthRefreshKnownDeadAsync(credentials) {
  let n = isRefreshTokenDead(await getClaudeAIOAuthTokensAsync(credentials));
  if (n !== undefined) return n;
  try {
    return hasDeadStoredRefreshToken(await getSecureStorage().readAsync(credentials));
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:547562-547658 layout
/**
 * 判断刷新令牌是否已失效（空串或已列入吊销表）。
 */
function isRefreshTokenDead(claudeAIOAuthTokens) {
  if (claudeAIOAuthTokens) {
    let refreshToken = claudeAIOAuthTokens.refreshToken;
    return refreshToken === "" || (!!refreshToken && deadRefreshTokens.has(refreshToken));
  }
  if (usesHostProvidedAuth()) return false;
  return;
}
//@ chunk-aepeg2w5.js:547658-547716 layout
/**
 * 判断存储的刷新令牌是否为空串（已登出）。
 */
function hasDeadStoredRefreshToken(e) {
  return e?.claudeAiOauth?.refreshToken === "";
}
//@ chunk-aepeg2w5.js:547716-547770 placement = CLAUDE_AI_INFERENCE_SCOPE (1)
/**
 * CLAUDE_CODE_OAUTH_SCOPES（空白分隔）覆盖，否则用默认 ["user:inference"]。旧版名 CLAUDE_AI_INFERENCE_SCOPE 为错配。
 */
function getRequestedOAuthScopes(e = ["user:inference"]) {
  return oauthScopesFromEnv() ?? [...e];
}
//@ chunk-aepeg2w5.js:547939-548126 placement = isUsingOAuth (0.294)
function isUsingOAuth(accessToken) {
  return {
    accessToken,
    refreshToken: null,
    expiresAt: null,
    scopes: getRequestedOAuthScopes(),
    subscriptionType: env.CLAUDE_CODE_SUBSCRIPTION_TYPE || null,
    rateLimitTier: env.CLAUDE_CODE_RATE_LIMIT_TIER || null,
  };
}
//@ chunk-aepeg2w5.js:548126-548178 layout
function getLauncherOAuthTokens() {
  let accessToken = usableLauncherHostLoginToken();
  return accessToken === null ? null : isUsingOAuth(accessToken);
}
//@ chunk-aepeg2w5.js:548178-548630 fingerprint = getClaudeAIOAuthTokens (0.703)
/**
 * 同步读取 Claude.ai OAuth 令牌：CLAUDE_CODE_OAUTH_TOKEN 优先（包装成无 refreshToken 的令牌对象）；其次 OAuth FD；宿主托管时返回 null；再读安全存储（钥匙串 / .credentials.json）的 claudeAiOauth。
 */
function getClaudeAIOAuthTokens_2() {
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return isUsingOAuth(env.CLAUDE_CODE_OAUTH_TOKEN);
  let oauthTokenFromFd = getOAuthTokenFromFileDescriptor();
  let n = (accessToken) => ({
    accessToken,
    refreshToken: null,
    expiresAt: null,
    scopes: getOauthScopesFromFd() ?? getRequestedOAuthScopes(OAUTH_DEFAULT_SCOPES),
    subscriptionType: env.CLAUDE_CODE_SUBSCRIPTION_TYPE || null,
    rateLimitTier: env.CLAUDE_CODE_RATE_LIMIT_TIER || null,
  });
  if (oauthTokenFromFd && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth()))
    return n(oauthTokenFromFd);
  if (usesHostProvidedAuth()) return null;
  try {
    let oauthData = getSecureStorage().read({
      fromStoreCopy: true,
    })?.claudeAiOauth;
    if (oauthData?.accessToken) return oauthData;
  } catch (error) {
    logError(error);
  }
  if (oauthTokenFromFd) return n(oauthTokenFromFd);
  return null;
}
//@ chunk-aepeg2w5.js:548630-549302 layout
/**
 * 按宿主的 OAuth 令牌缓存对象：缓存值/读取 promise、凭证文件 mtime 与存储 version、上次读到的钥匙串令牌、待处理 401 处理器、凭证变化信号等。
 */
class OAuthTokenCache {
  value = undefined;
  promise = null;
  lastCredentialsMtimeMs = 0;
  lastCredentialsVersion = undefined;
  lastKeychainAccessToken = null;
  lastUnusableTokenRecheckAt = 0;
  lastOwnSavedAccessToken = null;
  loginSwitch = null;
  loginSwitchStopOn = false;
  credentialsChangedOnDisk = createSignal();
  pending401Handlers = new Map();
  pendingRefreshChecks = {
    bare: null,
    store: null,
    backend: null,
  };
  pendingOptedInRefreshChecks = {
    bare: null,
    store: null,
    backend: null,
  };
  clear() {
    this.value = undefined;
    this.promise = null;
  }
  resetChangeCheck() {
    this.lastCredentialsMtimeMs = 0;
    this.lastCredentialsVersion = undefined;
    this.lastKeychainAccessToken = null;
    this.lastUnusableTokenRecheckAt = 0;
    this.lastOwnSavedAccessToken = null;
    this.loginSwitch = null;
    this.loginSwitchStopOn = false;
  }
}
//@ chunk-aepeg2w5.js:549302-549328 facade-majority
var oauthTokenReadMemos = new HostScoped(() => new OAuthTokenCache());
//@ chunk-aepeg2w5.js:549328-549439 facade-majority
/**
 * 当前 OAuth 令牌（按宿主缓存，未缓存时调用 getClaudeAIOAuthTokens，回退宿主启动器注入令牌）。全模块最常用的令牌读取入口。
 */
function getClaudeAIOAuthTokens() {
  if (isBareModeAuthRestricted()) return null;
  let e = oauthTokenReadMemos.of(getRootSession().host);
  if (e.value === undefined) e.value = getClaudeAIOAuthTokens_2();
  return e.value ?? getLauncherOAuthTokens();
}
//@ chunk-aepeg2w5.js:549439-549479 facade-majority
function clearOAuthTokenMemos() {
  oauthTokenReadMemos.of(getRootSession().host).clear();
}
//@ chunk-aepeg2w5.js:549479-549597 facade-majority
function getClaudeAIOAuthTokenOrigin() {
  let oAuthTokenOrigin = getOAuthTokenOrigin();
  if (typeof oAuthTokenOrigin === "string") return oAuthTokenOrigin;
  let accessToken = getSecureStorage().read()?.claudeAiOauth?.accessToken;
  return classifyBearerAgainstStore(oAuthTokenOrigin, accessToken);
}
//@ chunk-aepeg2w5.js:549597-549736 facade-majority = getClaudeAIOAuthTokensAsync (0.854)
async function getClaudeAIOAuthTokenOriginAsync(e) {
  let secureStorage = getOAuthTokenOrigin();
  if (typeof secureStorage === "string") return secureStorage;
  let oauthData = (await getSecureStorage().readAsync(e))?.claudeAiOauth?.accessToken;
  return classifyBearerAgainstStore(secureStorage, oauthData);
}
//@ chunk-aepeg2w5.js:549736-549788 facade-majority
/**
 * OAuth 令牌是否由环境注入（env 或 fd），这类令牌不会被 CLI 刷新。
 */
function isClaudeAIOAuthTokenHostInjected() {
  let oAuthTokenOrigin = getOAuthTokenOrigin();
  return oAuthTokenOrigin === "env" || oAuthTokenOrigin === "fd";
}
//@ chunk-aepeg2w5.js:549788-549946 facade-majority
function managedConfigNotAttemptedInput(ineligibleReason) {
  return {
    ineligibleReason,
    isGateway: getAPIProvider() === "gateway",
    hasEnvAuthToken: Boolean(effectiveAuthTokenEnv()),
    hasApiKeyHelper: Boolean(getConfiguredApiKeyHelper()),
    injectedOAuthToken: () => isClaudeAIOAuthTokenHostInjected(),
  };
}
//@ chunk-aepeg2w5.js:549946-550024 facade-majority
function storeRecheckNeeded(e) {
  if (e === "env") return false;
  if (e === "fd") return isOauthTokenFromBgSnapshot() && !isHostManagedProviderAuth();
  return true;
}
//@ chunk-aepeg2w5.js:550024-550110 facade-majority
function isLoginStashedInTokenSlot() {
  let loginStashedInTokenSlot = getLoginStashedInTokenSlot();
  return (
    loginStashedInTokenSlot !== null &&
    (env.CLAUDE_CODE_OAUTH_TOKEN === loginStashedInTokenSlot ||
      getOauthTokenFromFd() === loginStashedInTokenSlot)
  );
}
//@ chunk-aepeg2w5.js:550110-550358 layout
/**
 * 判断当前 OAuth 访问令牌来自 env（CLAUDE_CODE_OAUTH_TOKEN/宿主）、fd，或返回 {bearer, fdToken} 交给调用方与安全存储比对。
 */
function getOAuthTokenOrigin() {
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  if (!claudeAIOAuthTokens?.accessToken) return "none";
  if (
    claudeAIOAuthTokens.accessToken === env.CLAUDE_CODE_OAUTH_TOKEN ||
    claudeAIOAuthTokens.accessToken === usableLauncherHostLoginToken()
  )
    return "env";
  let n = env.CLAUDE_CODE_OAUTH_TOKEN ? null : getOAuthTokenFromFileDescriptor();
  if (n && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth())) return "fd";
  return {
    bearer: claudeAIOAuthTokens.accessToken,
    fdToken: n,
  };
}
//@ chunk-aepeg2w5.js:550358-550456 layout
function classifyBearerAgainstStore({ bearer, fdToken }, r) {
  if (r && r === bearer) return "store";
  if (fdToken && bearer === fdToken) return "fd";
  return "none";
}
//@ chunk-aepeg2w5.js:550456-550494 layout
function clearOAuthCachesForReload() {
  clearOAuthTokenMemos();
  clearKeychainCache();
  if (isStorageV5Enabled()) invalidatePlainTextStoreCopy();
}
//@ chunk-aepeg2w5.js:550494-550523 layout
function invalidateAuthDerivedCaches() {
  clearBetasCaches();
  emitCredentialChange();
  dropInFlightComposes();
}
//@ chunk-aepeg2w5.js:550523-550553 layout
function clearOAuthAndKeychainCaches() {
  clearOAuthTokenMemos();
  clearKeychainCache();
  invalidateAuthDerivedCaches();
}
//@ chunk-aepeg2w5.js:550553-550585 facade-majority
function clearOAuthTokenCache() {
  clearOAuthAndKeychainCaches();
  if (isStorageV5Enabled()) invalidatePlainTextStoreCopy();
}
//@ chunk-aepeg2w5.js:550585-550682 facade-majority
/**
 * 清空所有认证缓存（OAuth 令牌、apiKeyHelper、API key 配置、AWS 链/刷新、GCP 刷新、钥匙串等），登录/登出与切换账号时调用。
 */
function resetEnvDerivedAuthCaches() {
  clearOAuthTokenMemos();
  forgetHeldHostSessionsBearer();
  getApiKeyConfigCache().clear();
  clearApiKeyHelperCache();
  clearAwsCredentialsCache();
  resetAwsAuthRefreshCooldown();
  clearGcpCredentialsCache();
  clearBetasCaches();
  invalidateToolDescriptions();
  replaceFileReferenceHintLatch(null);
  if (isStorageV5Enabled()) invalidatePlainTextStoreCopy();
}
//@ chunk-aepeg2w5.js:550682-550733 facade-majority
function _resetCredentialsChangeCheckForTesting() {
  oauthTokenReadMemos.of(getRootSession().host).resetChangeCheck();
}
//@ chunk-aepeg2w5.js:550733-551197 facade-majority
async function primeStoredLogin(e, n) {
  if (!startupReadsStoredLogin()) return;
  let r = oauthTokenReadMemos.of(getRootSession().host);
  let s;
  try {
    let S = await e.probeCredentials();
    s = S.state === "present" ? S.version : undefined;
  } catch (error) {
    logForDebugging(`Credentials version prime failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  await n?.catch(() => null);
  await r.promise?.catch(() => null);
  r.promise = null;
  if (s !== undefined) r.lastCredentialsVersion = s;
  let storedOAuthTokens = readStoredOAuthTokensAsync(e);
  r.promise = storedOAuthTokens;
  if ((await storedOAuthTokens) === null) {
    if (s !== undefined) r.lastCredentialsVersion = undefined;
    if (r.promise === storedOAuthTokens) r.promise = null;
  }
  r.value = undefined;
}
//@ chunk-aepeg2w5.js:551197-551424 layout
async function readStoredOAuthTokensAsync(e) {
  try {
    let claudeAiOauth = (await getSecureStorage().readAsync(e))?.claudeAiOauth;
    return claudeAiOauth?.accessToken ? claudeAiOauth : null;
  } catch (error) {
    logForDebugging(
      `Credentials prime through the store failed (${error instanceof Error ? error.name : typeof error})`,
      {
        level: "error",
      },
    );
    return null;
  }
}
//@ chunk-aepeg2w5.js:551424-551857 layout
/**
 * 检测凭证是否被别的进程改过（storage v5 比 version，文件比 mtime），变化则清缓存并发出 credentialsChangedOnDisk 信号。
 */
async function invalidateOAuthCacheIfDiskChanged(e, n) {
  if (isStorageV5Enabled() && n !== undefined) {
    let s = await n.probeCredentials();
    if (s.state !== "present") return recheckStoredOAuthToken(e, n);
    if (s.version !== e.lastCredentialsVersion) {
      e.lastCredentialsVersion = s.version;
      clearOAuthTokenCache();
      emitCredentialsChangedOnDisk(e);
      return;
    }
    return recheckUnusableOAuthToken(e, n);
  }
  let r;
  try {
    let s = keychainProjectDirs();
    if (s === null) return recheckStoredOAuthToken(e, n);
    r = (await stat(join(s, ".credentials.json"))).mtimeMs;
  } catch {
    return recheckStoredOAuthToken(e, n);
  }
  if (r !== e.lastCredentialsMtimeMs) {
    e.lastCredentialsMtimeMs = r;
    clearOAuthTokenCache();
    emitCredentialsChangedOnDisk(e);
    return;
  }
  await recheckUnusableOAuthToken(e, n);
}
//@ chunk-aepeg2w5.js:551857-552178 layout
async function recheckUnusableOAuthToken(e, n) {
  try {
    if (!isFirstPartyProvider()) return;
    let r = e.promise ? await e.promise.catch(() => null) : e.value;
    if (r === undefined) return;
    if (r !== null && !isRefreshTokenDead(r)) return;
    let now = Date.now();
    if (now - e.lastUnusableTokenRecheckAt < KEYCHAIN_CACHE_TTL_MS) return;
    e.lastUnusableTokenRecheckAt = now;
    if (r !== null) e.lastKeychainAccessToken = r.accessToken;
    await recheckStoredOAuthToken(e, n);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-aepeg2w5.js:552178-552246 layout
function emitCredentialsChangedOnDisk(e) {
  try {
    e.credentialsChangedOnDisk.emit();
  } catch (e) {
    logError(e);
  }
}
//@ chunk-aepeg2w5.js:552246-552319 facade-majority
function subscribeOAuthCredentialsChangedOnDisk(host, n) {
  return oauthTokenReadMemos.of(host).credentialsChangedOnDisk.subscribe(n);
}
//@ chunk-aepeg2w5.js:552319-552382 facade-majority
function wasOAuthAccessTokenSavedByThisProcess(host, accessToken) {
  return oauthTokenReadMemos.of(host).lastOwnSavedAccessToken === accessToken;
}
//@ chunk-aepeg2w5.js:552382-552421 facade-majority
function loginSwitchMemo() {
  return oauthTokenReadMemos.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:552421-552472 facade-majority
async function checkOAuthCredentialsChangedOnDisk(host, credentials) {
  clearKeychainCache();
  await invalidateOAuthCacheIfDiskChanged(oauthTokenReadMemos.of(host), credentials);
}
//@ chunk-aepeg2w5.js:552472-552629 layout
async function recheckStoredOAuthToken(e, n) {
  e.clear();
  if (isStorageV5Enabled()) invalidatePlainTextStoreCopy();
  let accessToken = (await getClaudeAIOAuthTokensAsync(n))?.accessToken ?? null;
  if (accessToken !== e.lastKeychainAccessToken) {
    e.lastKeychainAccessToken = accessToken;
    invalidateAuthDerivedCaches();
    emitCredentialsChangedOnDisk(e);
  }
}
//@ chunk-aepeg2w5.js:552629-552663 layout
var TOKEN_STORE_TIERS = ["bare", "store", "backend"];
//@ chunk-aepeg2w5.js:552663-552694 layout
function isLoginOffFirstParty(e) {
  return e && !isFirstPartyProvider();
}
//@ chunk-aepeg2w5.js:552694-552750 layout
function pending401HandlerKey(e, n, r) {
  return `${e}|${n}${r ? "|opted-in" : ""}`;
}
//@ chunk-aepeg2w5.js:552750-552907 layout
function getTokenStoreTier(e, n) {
  if (!(isStorageV5Enabled() && e !== undefined) || isBareModeAuthRestricted() || env.CLAUDE_CODE_OAUTH_TOKEN)
    return "bare";
  if (getOAuthTokenFromFileDescriptor() && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth()))
    return "bare";
  return n !== undefined ? "backend" : "store";
}
//@ chunk-aepeg2w5.js:552907-552994 layout
/**
 * 从当前令牌层级向下查找可用的令牌。
 */
function findTokenInLowerTier(e, n) {
  for (let r of TOKEN_STORE_TIERS.slice(TOKEN_STORE_TIERS.indexOf(n))) {
    let s = e(r);
    if (s) return s;
  }
  return;
}
//@ chunk-aepeg2w5.js:552994-553105 layout
function findHigherTierToken(e, n) {
  for (let j = TOKEN_STORE_TIERS.indexOf(n) - 1; j >= 0; j--) {
    let s = TOKEN_STORE_TIERS[j];
    let h = s === undefined ? undefined : e(s);
    if (h) return h;
  }
  return;
}
//@ chunk-aepeg2w5.js:553105-553258 facade-majority
async function recoverCloudSessionsBearer(e, n, r, s = "refused") {
  let h = await recoverHostSessionsBearer(e, s);
  if (h !== "not_held") return h === "recovered" || hasClaudeAISignInToken();
  if ((await ensureHostSessionsBearer()) !== null) return true;
  return handleOAuth401Error(e, n, r);
}
//@ chunk-aepeg2w5.js:553258-553795 facade-majority = checkAndRefreshOAuthTokenIfNeeded (0.189)
/**
 * 检查并按需刷新 OAuth 令牌的入口：按（令牌, 存储层级, 是否非第一方登录）合并并发调用，再走 checkAndRefreshOAuthTokenIfNeededImpl。
 */
function handleOAuth401Error(
  e,
  n,
  storageV5,
  { usesLoginOffFirstParty = false, onForcedRefreshOutcome: h } = {},
) {
  let y = oauthTokenReadMemos.of(getRootSession().host);
  let promise = getTokenStoreTier(n, storageV5);
  let w = isLoginOffFirstParty(usesLoginOffFirstParty);
  let R = (j) => y.pending401Handlers.get(pending401HandlerKey(e, j, w));
  let tokenInLowerTier = findTokenInLowerTier(R, promise);
  if (tokenInLowerTier) {
    if (!h) return tokenInLowerTier.promise;
    return tokenInLowerTier.promise.then((j) => {
      if (tokenInLowerTier.forcedOutcome !== undefined) h(tokenInLowerTier.forcedOutcome);
      return j;
    });
  }
  let P = pending401HandlerKey(e, promise, w);
  let F = {
    promise: Promise.resolve(false),
  };
  let L = () =>
    handleOAuth401ErrorImpl(e, n, storageV5, usesLoginOffFirstParty, (j) => {
      F.forcedOutcome = j;
      h?.(j);
    });
  let higherTierToken = findHigherTierToken(R, promise);
  F.promise = (higherTierToken ? higherTierToken.promise.catch(() => false).then(L) : L()).finally(() => {
    y.pending401Handlers.delete(P);
  });
  y.pending401Handlers.set(P, F);
  return F.promise;
}
//@ chunk-aepeg2w5.js:553795-554117 facade-majority
/**
 * 轮询 CLAUDE_CODE_OAUTH_TOKEN / OAuth FD，直到出现与失败令牌不同的新令牌或超时。
 */
async function waitForRotatedEnvToken(e) {
  let pollMs = e.pollMs ?? 2000;
  let r =
    e.readToken ?? (() => env.CLAUDE_CODE_OAUTH_TOKEN ?? getOAuthTokenFromFileDescriptor() ?? undefined);
  let s = e.sleeper ?? ((S) => sleep(S));
  let h = Date.now() + e.timeoutMs;
  while (Date.now() < h) {
    let S = r();
    if (S && S !== e.failedAccessToken) return true;
    await s(Math.min(pollMs, Math.max(1, h - Date.now())));
  }
  let y = r();
  return Boolean(y && y !== e.failedAccessToken);
}
//@ chunk-aepeg2w5.js:554117-554179 layout
function isRemoteSessionChild() {
  return Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID);
}
//@ chunk-aepeg2w5.js:554179-554251 facade-majority
function isUserExportedOAuthEnvToken() {
  return Boolean(env.CLAUDE_CODE_OAUTH_TOKEN) && !isRemoteSessionChild() && !withoutSSHTunnelVars();
}
//@ chunk-aepeg2w5.js:554251-554373 facade-majority
function injectedOAuthTokenRecovery() {
  if (getSdkOAuthTokenRefreshCallback() !== null || sdkHostOffersOAuthRefresh()) return "sdk_host_refresh";
  if (isRemoteSessionChild()) return "runner_rotation";
  return isUserExportedOAuthEnvToken() ? "none" : undefined;
}
//@ chunk-aepeg2w5.js:554373-554465 layout
/**
 * 401 后等待外部令牌轮换的时长：CLAUDE_CODE_OAUTH_401_WAIT_MS，远程会话有默认值，否则 0。
 */
function getOAuth401WaitMs() {
  let CLAUDE_CODE_OAUTH_401_WAIT_MS = env.CLAUDE_CODE_OAUTH_401_WAIT_MS;
  if (CLAUDE_CODE_OAUTH_401_WAIT_MS !== undefined) return CLAUDE_CODE_OAUTH_401_WAIT_MS;
  return isRemoteSessionChild() ? GATEWAY_HEALTH_TIMEOUT_MS : 0;
}
//@ chunk-aepeg2w5.js:554465-554500 layout
class AuthFailureClock {
  firstUnrecoveredAtMs = null;
}
//@ chunk-aepeg2w5.js:554500-554526 facade-majority
var authFailureClocks = new HostScoped(() => new AuthFailureClock());
//@ chunk-aepeg2w5.js:554526-554916 facade-majority
/**
 * 远程子进程认证连续失败计时：超过 CLAUDE_CODE_AUTH_FAIL_EXIT_MS（默认 10 分钟）返回 exit，恢复后清零。
 */
function noteAuthRecoveryOutcome(e) {
  let n = e.nowMs ?? Date.now();
  let r = authFailureClocks.of(getRootSession().host);
  if (e.recovered) {
    r.firstUnrecoveredAtMs = null;
    return "continue";
  }
  if (!(e.isRemoteChild ?? isRemoteSessionChild())) return "continue";
  let h = e.thresholdMs ?? env.CLAUDE_CODE_AUTH_FAIL_EXIT_MS ?? 600000;
  if (h <= 0) return "continue";
  if (r.firstUnrecoveredAtMs === null) {
    r.firstUnrecoveredAtMs = n;
    return "continue";
  }
  if (n - r.firstUnrecoveredAtMs >= h) return "exit";
  return "continue";
}
//@ chunk-aepeg2w5.js:554916-554974 facade-majority
function resetAuthFailureTracking() {
  authFailureClocks.of(getRootSession().host).firstUnrecoveredAtMs = null;
}
//@ chunk-aepeg2w5.js:554974-555006 layout
function notifyOAuthTokenReplaced(e) {
  setAuthenticatedAccount(null);
  forgetHeldHostSessionsBearer(e);
}
//@ chunk-aepeg2w5.js:555006-558274 layout
/**
 * 处理 API 返回 401：先清令牌缓存；没有 refresh token 时尝试宿主启动器或 SDK getOAuthToken 回调换新令牌（写回 CLAUDE_CODE_OAUTH_TOKEN）；有则强制刷新。结果写 oauth_401_recovery 诊断。
 */
async function handleOAuth401ErrorImpl(e, n, storageV5, usesLoginOffFirstParty = false, h) {
  clearOAuthTokenCache();
  let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(n);
  if (!claudeAIOAuthTokens?.refreshToken) {
    let sdkOAuthTokenRefreshCallback = getSdkOAuthTokenRefreshCallback();
    if (isLauncherStartedProcess()) {
      if (launcherSignInMethodRefusal() !== null) {
        if (forgetLauncherHostLogin()) {
          clearOAuthTokenCache();
          logForDebugging(
            "[launcher-host-login] the desktop app's sign-in is not renewed under the sign-in method pin now in force",
            {
              level: "warn",
            },
          );
        }
      } else if (await renewLauncherHostLogin(e)) {
        clearOAuthTokenCache();
        logEvent("tengu_oauth_401_sdk_callback_refreshed", {});
        logFeatureOk("oauth_401_recovery");
        noteAuthRecoveryOutcome({
          recovered: true,
        });
        return true;
      }
    } else if (sdkOAuthTokenRefreshCallback)
      try {
        let L = await sdkOAuthTokenRefreshCallback();
        if (L && L !== e) {
          let G = env.CLAUDE_CODE_OAUTH_TOKEN ?? claudeAIOAuthTokens?.accessToken ?? e;
          if (L !== G) {
            process.env.CLAUDE_CODE_OAUTH_TOKEN = L;
            clearOAuthTokenCache();
            notifyOAuthTokenReplaced(G);
          }
          logEvent("tengu_oauth_401_sdk_callback_refreshed", {});
          logFeatureOk("oauth_401_recovery");
          noteAuthRecoveryOutcome({
            recovered: true,
          });
          return true;
        }
        logForDebugging(
          L === null
            ? "SDK getOAuthToken callback returned null (no token available)"
            : "SDK getOAuthToken callback returned the same expired token; treating as no refresh",
          {
            level: L === null ? "debug" : "error",
          },
        );
      } catch (error) {
        logFeatureBad("oauth_401_recovery", "oauth_401_sdk_callback_failed");
        logForDebugging(
          `SDK getOAuthToken callback failed: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "error",
          },
        );
      }
    let x = false;
    let P = false;
    if (!usesHostProvidedAuth()) {
      x = isUserExportedOAuthEnvToken();
      P =
        !env.CLAUDE_CODE_OAUTH_TOKEN &&
        sdkHostOffersOAuthRefresh() &&
        Boolean(getOAuthTokenFromFileDescriptor()) &&
        (hasPossibleCredentialFromDescriptor("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR") ||
          isLoginStashedInTokenSlot()) &&
        !isOauthTokenFromBgSnapshot();
      if (x)
        logForDebugging(
          "OAuth 401: keeping the user-supplied CLAUDE_CODE_OAUTH_TOKEN instead of adopting the stored credential. Mint a fresh token with `claude setup-token` and restart with it, or unset the variable and run /login.",
          {
            level: "error",
          },
        );
      else if (P)
        logForDebugging(
          "OAuth 401: the login this session is using was refused. The login saved on this machine was not used because it may be a different account. Sign in again in the app that started this session, or run /login.",
          {
            level: "error",
          },
        );
      else if (env.CLAUDE_CODE_OAUTH_TOKEN || getOAuthTokenFromFileDescriptor())
        try {
          let claudeAiOauth = (await getSecureStorage().readAsync(n))?.claudeAiOauth;
          if (
            claudeAiOauth?.accessToken &&
            claudeAiOauth.accessToken !== e &&
            !isOAuthTokenExpired(claudeAiOauth.expiresAt)
          ) {
            let G = Boolean(withoutSSHTunnelVars());
            if (env.CLAUDE_CODE_OAUTH_TOKEN) process.env.CLAUDE_CODE_OAUTH_TOKEN = claudeAiOauth.accessToken;
            if (
              isStorageV5Enabled() && n !== undefined
                ? await getOAuthTokenFromFileDescriptorAsync(n)
                : getOAuthTokenFromFileDescriptor()
            ) {
              setOauthTokenFromFd(claudeAiOauth.accessToken);
              setOauthScopesFromFd(claudeAiOauth.scopes);
            }
            setLoginStashedInTokenSlot(G ? null : claudeAiOauth.accessToken);
            clearOAuthTokenCache();
            notifyOAuthTokenReplaced();
            logEvent("tengu_oauth_401_recovered_from_disk", {});
            logFeatureOk("oauth_401_recovery");
            noteAuthRecoveryOutcome({
              recovered: true,
            });
            return true;
          }
        } catch (error) {
          logFeatureBad("oauth_401_recovery", "oauth_401_disk_read_failed");
          logError(error);
        }
    }
    let F = Boolean(process.env.CLAUDE_CODE_OAUTH_TOKEN) || Boolean(getOAuthTokenFromFileDescriptor());
    if (F) {
      let L = getOAuth401WaitMs();
      if (L > 0) {
        logForDebugging(`OAuth 401 recovery: waiting up to ${L}ms for a rotated env token`);
        if (
          await waitForRotatedEnvToken({
            failedAccessToken: e,
            timeoutMs: L,
          })
        ) {
          if (
            isStorageV5Enabled() && n !== undefined
              ? await getOAuthTokenFromFileDescriptorAsync(n)
              : getOAuthTokenFromFileDescriptor()
          ) {
            let CLAUDE_CODE_OAUTH_TOKEN = env.CLAUDE_CODE_OAUTH_TOKEN;
            if (CLAUDE_CODE_OAUTH_TOKEN) setOauthTokenFromFd(CLAUDE_CODE_OAUTH_TOKEN);
          }
          clearOAuthTokenCache();
          notifyOAuthTokenReplaced();
          logEvent("tengu_oauth_401_recovered_from_rotation", {});
          logFeatureOk("oauth_401_recovery");
          noteAuthRecoveryOutcome({
            recovered: true,
          });
          return true;
        }
      }
    }
    logFeatureBad(
      "oauth_401_recovery",
      x
        ? "oauth_401_skipped_user_env_token"
        : P
          ? "oauth_401_skipped_sdk_host_fd_token"
          : F || isLauncherStartedProcess()
            ? "oauth_401_no_refresh_token_bg_worker"
            : "oauth_401_no_refresh_token_interactive",
    );
    if (
      noteAuthRecoveryOutcome({
        recovered: false,
      }) === "exit"
    ) {
      logEvent("tengu_oauth_401_zombie_exit", {});
      logForDebugging(
        "OAuth 401 unrecovered past CLAUDE_CODE_AUTH_FAIL_EXIT_MS \u2014 exiting so the runner recycles this session with fresh credentials",
        {
          level: "error",
        },
      );
      setTimeout(() => process.exit(1), 2000);
    }
    return false;
  }
  if (claudeAIOAuthTokens.accessToken !== e) {
    notifyOAuthTokenReplaced();
    logEvent("tengu_oauth_401_recovered_from_keychain", {});
    logFeatureOk("oauth_401_recovery");
    noteAuthRecoveryOutcome({
      recovered: true,
    });
    return true;
  }
  let S = {
    force: true,
    entryAccessToken: e,
    credentials: n,
    storageV5,
    usesLoginOffFirstParty,
  };
  if (!h) return checkAndRefreshOAuthTokenIfNeeded(S);
  let w = await checkAndRefreshOAuthTokenIfNeededWithOutcome(S);
  h(w);
  return w === "refreshed";
}
//@ chunk-aepeg2w5.js:558274-558478 facade-majority
/**
 * 异步读取 OAuth 令牌并缓存 promise；调用失败时清掉缓存的 promise。
 */
function getClaudeAIOAuthTokensAsync(e) {
  if (isBareModeAuthRestricted()) return Promise.resolve(null);
  let n = oauthTokenReadMemos.of(getRootSession().host);
  let promise = n.promise;
  if (!promise) {
    let oAuthBearerOrigin = getOAuthBearerOriginAsync(e);
    promise = oAuthBearerOrigin;
    n.promise = oAuthBearerOrigin;
    oAuthBearerOrigin.catch(() => {
      if (n.promise === oAuthBearerOrigin) n.promise = null;
    });
  }
  return isLauncherStartedProcess() ? promise.then((s) => s ?? getLauncherOAuthTokens()) : promise;
}
//@ chunk-aepeg2w5.js:558478-558753 fingerprint = getClaudeAIOAuthTokensAsync (1)
/**
 * 异步版 getClaudeAIOAuthTokens，支持 storage v5 后端读取。
 */
async function getOAuthBearerOriginAsync(e) {
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return getClaudeAIOAuthTokens();
  let n =
    isStorageV5Enabled() && e !== undefined
      ? await getOAuthTokenFromFileDescriptorAsync(e)
      : getOAuthTokenFromFileDescriptor();
  if (n && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth())) return getClaudeAIOAuthTokens();
  if (usesHostProvidedAuth()) return null;
  try {
    let oauthData = (await getSecureStorage().readAsync(e))?.claudeAiOauth;
    if (oauthData?.accessToken) return oauthData;
  } catch (error) {
    logError(error);
  }
  if (n) return getClaudeAIOAuthTokens();
  return null;
}
//@ chunk-aepeg2w5.js:558753-558814 facade-majority
async function readFreshOAuthAccessToken(credentials) {
  clearOAuthCachesForReload();
  return (await getClaudeAIOAuthTokensAsync(credentials))?.accessToken;
}
//@ chunk-aepeg2w5.js:558814-558943 facade-majority
function startupReadsStoredLogin() {
  if (
    isBareModeAuthRestricted() ||
    env.CLAUDE_CODE_OAUTH_TOKEN ||
    env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR ||
    usesHostProvidedAuth()
  )
    return false;
  return !(getOauthTokenFromFd() && !isOauthTokenFromBgSnapshot());
}
//@ chunk-aepeg2w5.js:558943-559025 facade-majority
async function primeStoredLoginCopy(e) {
  if (!startupReadsStoredLogin()) return;
  try {
    await getSecureStorage().readAsync(e);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-aepeg2w5.js:559025-559169 facade-majority
function sameOwnerAccount(e, n) {
  return (
    Boolean(e?.accountUuid) &&
    e?.accountUuid === n?.accountUuid &&
    (e?.organizationUuid || undefined) === (n?.organizationUuid || undefined)
  );
}
//@ chunk-aepeg2w5.js:559169-559376 facade-majority = hasVoiceAuth (0.484)
/**
 * 取语音所需的 OAuth access token 与账户/组织 UUID，没有 token 返回 undefined。
 */
async function readFreshOAuthCredentialSnapshot(config, credentials) {
  clearOAuthCachesForReload();
  let [claudeAIOAuthTokens, s] = await Promise.all([
    getClaudeAIOAuthTokensAsync(credentials),
    isAnthropicAuthEnabled() ? readFreshOauthAccountFromDisk(config) : undefined,
  ]);
  if (!claudeAIOAuthTokens?.accessToken) return;
  return {
    accessToken: claudeAIOAuthTokens.accessToken,
    accountUuid: s?.accountUuid,
    organizationUuid: s?.organizationUuid,
  };
}
//@ chunk-aepeg2w5.js:559376-559453 facade-majority
async function readStoredLoginOrganizationAfresh(e) {
  let freshOauthAccountFromDisk = await readFreshOauthAccountFromDisk(e);
  return normalizeUuidOrNull(freshOauthAccountFromDisk?.organizationUuid) ?? null;
}
//@ chunk-aepeg2w5.js:559453-559789 layout
/**
 * 收集 OAuth 刷新锁争用信息：判断争用的是当前锁文件还是旧锁文件，读取其修改时间算出锁已存在的时长。
 */
async function getRefreshLockInfo(err, tokens) {
  let file =
    typeof err === "object" && err !== null && "file" in err && typeof err.file === "string"
      ? err.file
      : undefined;
  let s = file === undefined || resolve(file) === resolve(tokens);
  let h = s ? oauthRefreshLockOptions(tokens).lockfilePath : file;
  let y;
  let mtimeMs;
  try {
    let w = await stat(h);
    mtimeMs = w.mtimeMs;
    y = Math.max(0, Math.round(Date.now() - w.mtimeMs));
  } catch {
    y = undefined;
  }
  return {
    contendedLock: s ? lit("current") : lit("legacy"),
    lockAgeMs: y,
    mtimeMs,
  };
}
//@ chunk-aepeg2w5.js:559789-559801 layout
/**
 * 观察 OAuth 刷新锁的间隔（7.5 秒）。
 */
var REFRESH_LOCK_OBSERVE_MS = 7500;
//@ chunk-aepeg2w5.js:559801-559922 layout
function sameLockObservation(e, refreshedTokens) {
  return (
    e.mtimeMs !== undefined &&
    refreshedTokens.mtimeMs !== undefined &&
    e.contendedLock === refreshedTokens.contendedLock &&
    e.mtimeMs === refreshedTokens.mtimeMs
  );
}
//@ chunk-aepeg2w5.js:559922-560119 facade-majority
function oauthRefreshLockOptions(e, n) {
  return {
    lockfilePath: join(e, ".oauth_refresh.lock"),
    realpath: false,
    stale: 60000,
    update: 5000,
    onCompromised: (r) => {
      logForDebugging(`OAuth refresh lock compromised: ${r.message}`, {
        level: "error",
      });
      n?.(r);
    },
  };
}
//@ chunk-aepeg2w5.js:560119-560181 layout = getTaskListLockPath (1)
/**
 * 返回 realpath(path)+".lock" 锁文件路径。
 */
async function getLockfilePathFor(taskListId) {
  return `${await realpath(taskListId).catch(() => taskListId)}.lock`;
}
//@ chunk-aepeg2w5.js:560181-560348 facade-majority
class OAuthRefreshLockContendedError extends Error {
  constructor(e) {
    super(`Lock acquisition failed after ${e} attempts: another process is refreshing`);
    this.name = "OAuthRefreshLockContendedError";
  }
}
//@ chunk-aepeg2w5.js:560348-561108 facade-majority
async function acquireOAuthRefreshLock(taskListId) {
  let n = false;
  let abortController = new AbortController();
  let s = () => {
    n = true;
    abortController.abort();
  };
  let h = oauthRefreshLockOptions(taskListId, s);
  let y = await lock(taskListId, {
    ...h,
    ...getFsSettler(h.lockfilePath),
  });
  let lockfilePathFor = await getLockfilePathFor(taskListId);
  let w = null;
  try {
    w = await lock(lockfilePathFor, {
      ...oauthRefreshLockOptions(taskListId, s),
      lockfilePath: lockfilePathFor,
      ...getFsSettler(lockfilePathFor),
    });
  } catch (error) {
    if (error.code === "ELOCKED") {
      logEvent("tengu_oauth_refresh_legacy_lock_contended", {});
      await y().catch((error) =>
        isFsInaccessible(error) || n
          ? logForDebugging(`OAuth refresh new-lock release failed: ${error}`)
          : logError(error),
      );
      throw error;
    }
    if (isFsInaccessible(error)) logForDebugging(`OAuth refresh legacy-lock acquire failed: ${error}`);
    else logError(error);
  }
  let R = beginOAuthRefreshLockHold();
  let x = await writeLockOwnerRecord({
    claudeDir: taskListId,
    lockfilePath: oauthRefreshLockOptions(taskListId).lockfilePath,
    legacyLockfilePath: w ? lockfilePathFor : null,
  });
  return {
    isCompromised: () => n,
    signal: abortController.signal,
    release: async () => {
      try {
        if (x !== null) await removeOwnLockOwnerRecord(taskListId, x);
        if (w)
          await w().catch((error) =>
            isFsInaccessible(error) || n
              ? logForDebugging(`OAuth refresh legacy-lock release failed: ${error}`)
              : logError(error),
          );
        await y();
      } finally {
        R();
      }
    },
  };
}
//@ chunk-aepeg2w5.js:561108-561138 layout
/**
 * 记录 OAuth 刷新锁的持有数与释放回调，供退出前等待刷新完成。
 */
class OauthRefreshLockHolds {
  held = 0;
  released = null;
}
//@ chunk-aepeg2w5.js:561138-561164 facade-majority
var oauthRefreshLockHolds = new HostScoped(() => new OauthRefreshLockHolds());
//@ chunk-aepeg2w5.js:561164-561295 facade-majority
function beginOAuthRefreshLockHold() {
  let e = onProcessRootHost(oauthRefreshLockHolds);
  e.held++;
  let n = true;
  return () => {
    if (!n) return;
    n = false;
    if (--e.held === 0) {
      e.released?.resolve();
      e.released = null;
    }
  };
}
//@ chunk-aepeg2w5.js:561295-561413 facade-majority
function waitForOAuthRefreshLocksReleased() {
  let e = onProcessRootHost(oauthRefreshLockHolds);
  if (e.held === 0) return null;
  e.released ??= Promise.withResolvers();
  return e.released.promise;
}
//@ chunk-aepeg2w5.js:561413-561433 facade-majority
/**
 * 退出前等待刷新完成的轮询间隔（250 毫秒）。
 */
var OAUTH_REFRESH_EXIT_WAIT_CAP_MS = 2000;
var OAUTH_REFRESH_EXIT_WAIT_STEP_MS = 250;
//@ chunk-aepeg2w5.js:561433-561714 facade-majority
async function waitForInFlightOAuthRefresh(e) {
  try {
    let n = waitForOAuthRefreshLocksReleased();
    if (n === null) return true;
    let r =
      (await withDeadline(
        n.then(() => true),
        e,
      )) ?? false;
    if (!r) {
      logForDebugging(`OAuth refresh still in flight after ${e}ms; exiting without waiting further`);
      await withDeadline(
        logFeatureSadAsync("oauth_token_refresh", "exit_wait_timeout").catch(() => {}),
        OAUTH_REFRESH_EXIT_WAIT_STEP_MS,
      );
    }
    return r;
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:561714-561732 layout
registerOAuthRefreshExitWait(() => waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS));
//@ chunk-aepeg2w5.js:561732-561741 layout
/**
 * 刷新令牌的最大尝试次数（5）。
 */
var MAX_REFRESH_ATTEMPTS = 5;
//@ chunk-aepeg2w5.js:561741-562393 facade-majority
async function withOAuthRefreshLock(e, n) {
  if (isDiskless()) {
    logFeatureBad("oauth_token_refresh", "oauth_refresh_diskless");
    throw Error("This hosted session (claude-code-server) cannot refresh an OAuth token");
  }
  let projectDirsUpToHome = getProjectDirsUpToHome();
  await getFsImplementation().mkdir(projectDirsUpToHome);
  let s;
  let h = 0;
  while (!s) {
    h++;
    try {
      s = await acquireOAuthRefreshLock(projectDirsUpToHome);
    } catch (error) {
      if (error.code === "ELOCKED") {
        if (h < MAX_REFRESH_ATTEMPTS) {
          await sleep(1000 + Math.random() * 1000);
          continue;
        }
        throw new OAuthRefreshLockContendedError(h);
      }
      throw error;
    }
  }
  try {
    clearOAuthTokenCache();
    if ((await getSecureStorage().readAsyncStrict?.(n)) === READ_FAILED)
      throw new OAuthRefreshLockContendedError(h);
    let lockedTokens = await getClaudeAIOAuthTokensAsync(n);
    return await e({
      lockedTokens,
      lockAttempts: h,
      isCompromised: s.isCompromised,
      signal: s.signal,
    });
  } finally {
    try {
      await s.release();
    } catch (error) {
      if (isFsInaccessible(error) || s.isCompromised())
        logForDebugging(`OAuth refresh lock release failed: ${error}`);
      else logError(error);
    }
  }
}
//@ chunk-aepeg2w5.js:562393-562510 facade-majority
/**
 * 锁超时/忙碌后可重试的结束原因集合。
 */
var TOKEN_REFRESH_OUTCOMES_BEFORE_POST = new Set([
  "lock_timeout",
  "lock_busy",
  "lock_error",
  "lock_disk_full",
]);
var MAY_RETRY_AFTER_LOCK_REFUSAL = new Set(["lock_timeout", "lock_busy"]);
//@ chunk-aepeg2w5.js:562510-562611 facade-majority
function isAuthFailureWorthRetrying(e, n) {
  return (
    e !== undefined &&
    MAY_RETRY_AFTER_LOCK_REFUSAL.has(e) &&
    (n === undefined || (n.outcome !== undefined && TOKEN_REFRESH_OUTCOMES_BEFORE_POST.has(n.outcome)))
  );
}
//@ chunk-aepeg2w5.js:562611-562670 facade-majority
function checkAndRefreshOAuthTokenIfNeeded(e = {}) {
  return checkAndRefreshOAuthTokenIfNeededWithOutcome(e).then((n) => n === "refreshed");
}
//@ chunk-aepeg2w5.js:562670-563134 facade-majority
function checkAndRefreshOAuthTokenIfNeededWithOutcome({
  retryCount: e = 0,
  force: n = false,
  entryAccessToken: r,
  credentials: s,
  storageV5: h,
  usesLoginOffFirstParty: y = false,
} = {}) {
  let S = oauthTokenReadMemos.of(getRootSession().host);
  if (e === 0 && !n) {
    let w = isLoginOffFirstParty(y) ? "pendingOptedInRefreshChecks" : "pendingRefreshChecks";
    let tokenStoreTier = getTokenStoreTier(s, h);
    let x = (j) => S[w][j];
    let tokenInLowerTier = findTokenInLowerTier(x, tokenStoreTier);
    if (tokenInLowerTier) return tokenInLowerTier;
    let F = () => checkAndRefreshOAuthTokenIfNeededImpl(S, e, 0, undefined, n, undefined, s, h, y);
    let higherTierToken = findHigherTierToken(x, tokenStoreTier);
    let G = (
      higherTierToken
        ? higherTierToken
            .catch(() => {
              return;
            })
            .then(F)
        : F()
    ).finally(() => {
      S[w] = {
        ...S[w],
        [tokenStoreTier]: null,
      };
    });
    S[w] = {
      ...S[w],
      [tokenStoreTier]: G,
    };
    return G;
  }
  return checkAndRefreshOAuthTokenIfNeededImpl(S, e, 0, undefined, n, r, s, h, y);
}
//@ chunk-aepeg2w5.js:563134-563220 facade-majority
function isExpectedOAuthRefreshError(error, { isDefaultFirstPartyClient }) {
  return (
    isInvalidGrantError(error) ||
    isAccountOnHoldError(error) ||
    (!isDefaultFirstPartyClient && isExpectedOAuthTokenError(error)) ||
    isExpectedApiError(error)
  );
}
//@ chunk-aepeg2w5.js:563220-567727 fingerprint = checkAndRefreshOAuthTokenIfNeededImpl (0.377)
/**
 * 刷新 OAuth 令牌：未过期（提前 5 分钟判定）返回 not_needed；无 refresh token、已知失效或账户冻结直接返回原因；在配置目录加文件锁（ELOCKED 时随机退避重试 5 次，必要时接管死锁持有者），锁内再次确认后调用 refreshOAuthToken 并写回安全存储。
 */
async function checkAndRefreshOAuthTokenIfNeededImpl(e, n, r, s, h, y, S, w, R = false, x = false) {
  await invalidateOAuthCacheIfDiskChanged(e, S);
  let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(S);
  if (!h) {
    if (claudeAIOAuthTokens && !isOAuthTokenExpired(claudeAIOAuthTokens.expiresAt)) return "not_needed";
    if (!claudeAIOAuthTokens?.refreshToken) return "no_refresh_token";
  }
  if (!claudeAIOAuthTokens?.refreshToken) return "no_refresh_token";
  if (deadRefreshTokens.has(claudeAIOAuthTokens.refreshToken)) return "known_dead_refresh_token";
  if (onHoldRefreshTokens.has(claudeAIOAuthTokens.refreshToken)) return "account_on_hold";
  if (!shouldUseClaudeAIAuth(claudeAIOAuthTokens.scopes) && !claudeAIOAuthTokens.subscriptionType)
    return "not_refreshable";
  if (!isFirstPartyProvider() && !R) return "not_needed";
  let L = y ?? claudeAIOAuthTokens.accessToken;
  clearOAuthTokenCache();
  let claudeAIOAuthTokens_2 = await getClaudeAIOAuthTokensAsync(S);
  if (!claudeAIOAuthTokens_2?.refreshToken) return "no_refresh_token";
  if (claudeAIOAuthTokens_2.accessToken !== L) {
    notifyOAuthTokenReplaced();
    logEvent("tengu_oauth_token_refresh_race_resolved", {});
    return "refreshed";
  }
  if (!h && !isOAuthTokenExpired(claudeAIOAuthTokens_2.expiresAt)) return "not_needed";
  if (isDiskless()) {
    logFeatureBad("oauth_token_refresh", "oauth_refresh_diskless");
    return "not_refreshable";
  }
  let tokens = getProjectDirsUpToHome();
  await getFsImplementation().mkdir(tokens);
  let ee;
  try {
    logEvent("tengu_oauth_token_refresh_lock_acquiring", {});
    ee = await acquireOAuthRefreshLock(tokens);
  } catch (err) {
    if (err.code === "ELOCKED") {
      let se = s ?? (await getRefreshLockInfo(err, tokens));
      if (n < 5) {
        logEvent("tengu_oauth_token_refresh_lock_retry", {
          retryCount: n + 1,
        });
        let fe = 1000 + Math.random() * 1000;
        await sleep(fe);
        return checkAndRefreshOAuthTokenIfNeededImpl(e, n + 1, r + fe, se, h, L, S, w, R, x);
      }
      let Se = claudeAIOAuthTokens_2.expiresAt !== null && Date.now() >= claudeAIOAuthTokens_2.expiresAt;
      let refreshedTokens = await getRefreshLockInfo(err, tokens);
      if (sameLockObservation(se, refreshedTokens) && r < REFRESH_LOCK_OBSERVE_MS) {
        await sleep(REFRESH_LOCK_OBSERVE_MS - r);
        refreshedTokens = await getRefreshLockInfo(err, tokens);
      }
      let { contendedLock, lockAgeMs } = refreshedTokens;
      let ce = !sameLockObservation(se, refreshedTokens);
      if (!ce && !x && String(contendedLock) === "current" && refreshedTokens.mtimeMs !== undefined) {
        let fe = await checkLockStillOwned({
          claudeDir: tokens,
          lockfilePath: oauthRefreshLockOptions(tokens).lockfilePath,
          legacyLockfilePath: await getLockfilePathFor(tokens),
          watchedMtimeMs: refreshedTokens.mtimeMs,
        });
        logEvent("tengu_oauth_token_refresh_lock_dead_holder_takeover", {
          outcome: fromEnum(fe),
          lockAgeMs,
        });
        if (fe === "taken_over" || fe === "lock_changed")
          return checkAndRefreshOAuthTokenIfNeededImpl(e, 0, 0, undefined, h, L, S, w, R, true);
      }
      logEvent("tengu_oauth_token_refresh_lock_retry_limit_reached", {
        maxRetries: 5,
        tokenPastExpiry: Se,
        contendedLock,
        lockAgeMs,
        holderAlive: ce,
      });
      logFeatureSad("oauth_token_refresh", "oauth_refresh_lock_timeout", {
        token_past_expiry: Se,
        contended_lock: contendedLock,
        holder_alive: ce,
        ...(lockAgeMs !== undefined && {
          lock_age_ms: lockAgeMs,
        }),
      });
      return ce ? "lock_busy" : "lock_timeout";
    }
    logError(err);
    logEvent("tengu_oauth_token_refresh_lock_error", {
      ...errorTelemetryFields(err),
    });
    logFeatureBad("oauth_token_refresh", "oauth_refresh_lock_error");
    return isDiskFullErrno(err) ? "lock_disk_full" : "lock_error";
  }
  let q = null;
  let Q = true;
  try {
    logEvent("tengu_oauth_token_refresh_lock_acquired", {});
    clearOAuthTokenCache();
    if ((await getSecureStorage().readAsyncStrict?.(S)) === READ_FAILED) {
      logEvent("tengu_oauth_token_refresh_locked_read_failed", {});
      logFeatureSad("oauth_token_refresh", "oauth_refresh_locked_read_failed");
      return "lock_error";
    }
    let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(S);
    if (!claudeAIOAuthTokens?.refreshToken) return "no_refresh_token";
    q = claudeAIOAuthTokens.refreshToken;
    if (claudeAIOAuthTokens.accessToken !== L) {
      notifyOAuthTokenReplaced();
      logEvent("tengu_oauth_token_refresh_race_resolved", {});
      return "refreshed";
    }
    if (!h && !isOAuthTokenExpired(claudeAIOAuthTokens.expiresAt)) return "not_needed";
    if (deadRefreshTokens.has(claudeAIOAuthTokens.refreshToken)) return "known_dead_refresh_token";
    if (onHoldRefreshTokens.has(claudeAIOAuthTokens.refreshToken)) return "account_on_hold";
    if (ee.isCompromised()) {
      logEvent("tengu_oauth_token_refresh_lock_compromised_pre_post", {});
      logFeatureSad("oauth_token_refresh", "oauth_refresh_lock_compromised");
      return "lock_compromised";
    }
    logEvent("tengu_oauth_token_refresh_starting", {});
    Q = Boolean(
      (shouldUseClaudeAIAuth(claudeAIOAuthTokens.scopes) || claudeAIOAuthTokens.subscriptionType) &&
      !claudeAIOAuthTokens.clientId,
    );
    let scopes = Q ? firstPartyRefreshScopes(claudeAIOAuthTokens.scopes) : claudeAIOAuthTokens.scopes;
    let ae = Q && isClaudeAiScopeSet(claudeAIOAuthTokens.scopes);
    let ie;
    try {
      ie = await refreshOAuthToken(claudeAIOAuthTokens.refreshToken, {
        scopes,
        clientId: claudeAIOAuthTokens.clientId,
        signal: ee.signal,
        invalidScopeRetried: ae,
        storageV5: w,
      });
    } catch (error) {
      if (!ae || !isInvalidScopeError(error)) throw error;
      logEvent("tengu_oauth_refresh_invalid_scope_fallback", {});
      ie = await refreshOAuthToken(claudeAIOAuthTokens.refreshToken, {
        scopes: claudeAIOAuthTokens.scopes,
        clientId: claudeAIOAuthTokens.clientId,
        signal: ee.signal,
        storageV5: w,
      });
    }
    await saveRefreshedOAuthTokensRespectingLock({
      isCompromised: ee.isCompromised,
      postedRefreshToken: q,
      refreshedTokens: ie,
      credentials: S,
    });
    return "refreshed";
  } catch (error) {
    if (ee.isCompromised()) {
      logForDebugging(`OAuth refresh failed while lock compromised: ${errorMessage(error)}`, {
        level: "error",
      });
      logEvent("tengu_oauth_token_refresh_lock_compromised_in_catch", {});
      clearOAuthTokenCache();
      let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(S);
      if (claudeAIOAuthTokens && claudeAIOAuthTokens.accessToken !== L) {
        notifyOAuthTokenReplaced();
        logEvent("tengu_oauth_token_refresh_race_recovered", {});
        return "refreshed";
      }
      logFeatureSad("oauth_token_refresh", "oauth_refresh_lock_compromised");
      return "lock_compromised";
    }
    if (
      isExpectedOAuthRefreshError(error, {
        isDefaultFirstPartyClient: Q,
      })
    )
      logForDebugging(`OAuth refresh failed (expected): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    clearOAuthTokenCache();
    let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(S);
    if (claudeAIOAuthTokens && claudeAIOAuthTokens.accessToken !== L) {
      notifyOAuthTokenReplaced();
      logEvent("tengu_oauth_token_refresh_race_recovered", {});
      return "refreshed";
    }
    if (isInvalidGrantError(error) && q) await markRefreshTokenDeadAfterInvalidGrant(q, S);
    if (isAccountOnHoldError(error) && q) {
      onHoldRefreshTokens.set(q, getAccountOnHoldErrorUrl(error));
      logEvent("tengu_oauth_refresh_token_account_on_hold", {});
      return "account_on_hold";
    }
    return isInvalidGrantError(error) ? "known_dead_refresh_token" : "refresh_failed";
  } finally {
    try {
      logEvent("tengu_oauth_token_refresh_lock_releasing", {});
    } catch (error) {
      logForDebugging(`OAuth refresh lock-releasing event failed: ${error}`, {
        level: "error",
      });
    }
    try {
      await ee.release();
      logEvent("tengu_oauth_token_refresh_lock_released", {});
    } catch (error) {
      logForDebugging(`OAuth refresh lock release failed: ${error}`, {
        level: "error",
      });
      try {
        logEvent("tengu_oauth_token_refresh_lock_release_error", {});
      } catch {}
    }
  }
}
//@ chunk-aepeg2w5.js:567727-567783 facade-majority
function isClaudeAISubscriber() {
  if (!isAnthropicAuthEnabled()) return false;
  return shouldUseClaudeAIAuth(getClaudeAIOAuthTokens()?.scopes);
}
//@ chunk-aepeg2w5.js:567783-567814 facade-majority
function hasUsableClaudeAILogin() {
  return isUsableClaudeAILoginRecord(getClaudeAIOAuthTokens());
}
//@ chunk-aepeg2w5.js:567814-567887 facade-majority
function hasStoredUsableClaudeAILogin() {
  return (
    !isHttpMcpServeInvocation() &&
    !usesSessionAccessToken() &&
    isUsableClaudeAILoginRecord(getSecureStorage().read()?.claudeAiOauth ?? null)
  );
}
//@ chunk-aepeg2w5.js:567887-567942 facade-majority = isUsingOAuth (0.688)
function isUsableClaudeAILoginRecord(claudeAIOAuthTokens) {
  return shouldUseClaudeAIAuth(claudeAIOAuthTokens?.scopes) && !!claudeAIOAuthTokens?.accessToken;
}
//@ chunk-aepeg2w5.js:567942-568015 facade-majority = hasProfileScope (1)
/**
 * OAuth 令牌是否带 user:profile scope（决定能否拉 /api/oauth/profile）。
 */
function hasProfileScope() {
  let scopes = getClaudeAIOAuthTokens()?.scopes;
  return Array.isArray(scopes) && scopes.includes(CLAUDE_AI_PROFILE_SCOPE);
}
//@ chunk-aepeg2w5.js:568015-568170 facade-majority
function mayHaveProfileScope() {
  let scopes = getClaudeAIOAuthTokens()?.scopes;
  if (!Array.isArray(scopes)) return false;
  if (scopes.includes(CLAUDE_AI_PROFILE_SCOPE)) return true;
  return (
    (!!env.CLAUDE_CODE_OAUTH_TOKEN || usableLauncherHostLoginToken() !== null) &&
    oauthScopesFromEnv() === undefined
  );
}
//@ chunk-aepeg2w5.js:568170-568215 facade-majority
/**
 * 是否持有 OAuth 访问令牌。
 */
function hasStoredOAuthToken() {
  return getClaudeAIOAuthTokens()?.accessToken != null;
}
//@ chunk-aepeg2w5.js:568215-568330 facade-majority
function hasLoginManagedKey() {
  try {
    return (
      getAnthropicApiKeyWithSource({
        skipRetrievingKeyFromApiKeyHelper: true,
      }).source === "/login managed key"
    );
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:568330-568451 layout
var OAUTH_TOKEN_SOURCES = new Set([
  "claude.ai",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
  "CCR_OAUTH_TOKEN_FILE",
]);
//@ chunk-aepeg2w5.js:568451-569031 facade-majority
function hasExistingSignIn() {
  try {
    if (adminPolicyUnreadable()) return false;
    if (checkAllowedProvider("firstParty") !== undefined) return false;
    let forcedLoginMethod = getForcedLoginMethod();
    if (forcedLoginMethod === "gateway") return false;
    if (getSettingsForSource("policySettings")?.forceLoginOrgUUID !== undefined) return false;
    let { source } = getAuthTokenSource();
    let s = source === "claude.ai" ? getClaudeAIOAuthTokens() : null;
    let h =
      !!s?.refreshToken &&
      (typeof s.refreshTokenExpiresAt !== "number" || s.refreshTokenExpiresAt > Date.now());
    let y =
      OAUTH_TOKEN_SOURCES.has(source) &&
      (source !== "claude.ai" ||
        (s !== null && isRefreshTokenDead(s) !== true && (h || !isOAuthTokenExpired(s.expiresAt))));
    let S = source === "none" && hasLoginManagedKey();
    switch (forcedLoginMethod) {
      case "claudeai":
        return y;
      case "console":
        return S;
      case undefined:
        return y || S;
    }
  } catch (error) {
    logForDebugging(`Existing sign-in check failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return false;
  }
}
//@ chunk-aepeg2w5.js:569031-569090 facade-majority
function getClaudeAIOAuthTokenFingerprint() {
  let accessToken = getClaudeAIOAuthTokens()?.accessToken;
  return accessToken ? computeContentHash(accessToken) : null;
}
//@ chunk-aepeg2w5.js:569090-569144 facade-majority
function storedOAuthTokenEquals(accessToken) {
  return accessToken != null && getClaudeAIOAuthTokens()?.accessToken === accessToken;
}
//@ chunk-aepeg2w5.js:569144-569217 facade-majority
/**
 * OAuth 令牌 scopes 是否包含指定 scope。
 */
function hasOAuthScope(e) {
  let scopes = getClaudeAIOAuthTokens()?.scopes;
  return Array.isArray(scopes) && scopes.includes(e);
}
//@ chunk-aepeg2w5.js:569217-569354 facade-majority
function canAuthenticateChromeBridge() {
  let scopes = getClaudeAIOAuthTokens()?.scopes;
  return (
    Array.isArray(scopes) &&
    (scopes.includes(CLAUDE_AI_PROFILE_SCOPE) ||
      scopes.includes("user:office") ||
      scopes.includes("user:ccr_inference"))
  );
}
//@ chunk-aepeg2w5.js:569354-569398 facade-majority
function getStoredOAuthTokenExpiresAt() {
  return getClaudeAIOAuthTokens()?.expiresAt ?? null;
}
//@ chunk-aepeg2w5.js:569398-569449 facade-majority = getSubscriptionType (1)
function getStoredOAuthSubscriptionType() {
  return getClaudeAIOAuthTokens()?.subscriptionType ?? null;
}
//@ chunk-aepeg2w5.js:569449-569481 facade-majority
function getStoredOAuthTierVerifiedAt() {
  return storedPlanVerifiedAtOf(getClaudeAIOAuthTokens());
}
//@ chunk-aepeg2w5.js:569481-569636 facade-majority
function storedPlanVerifiedAtOf(e) {
  if (!e || e.subscriptionTypeSource !== "profile") return;
  return typeof e.subscriptionTypeVerifiedAt === "number" ? e.subscriptionTypeVerifiedAt : null;
}
//@ chunk-aepeg2w5.js:569636-569683 facade-majority
function hasStoredOAuthRefreshToken() {
  return getClaudeAIOAuthTokens()?.refreshToken != null;
}
//@ chunk-aepeg2w5.js:569683-569742 facade-majority
function is1PApiCustomer() {
  if (!isFirstPartyProvider()) return false;
  if (isClaudeAISubscriber()) return false;
  return true;
}
//@ chunk-aepeg2w5.js:569742-569793 facade-majority = getOauthAccountInfo (1)
/**
 * 认证启用时返回全局配置 oauthAccount。
 */
function getOauthAccountInfo() {
  return isAnthropicAuthEnabled() ? getGlobalConfig().oauthAccount : undefined;
}
//@ chunk-aepeg2w5.js:569793-569844 facade-majority
function getAuthenticatedAccountInfo() {
  if (!isAnthropicAuthEnabled()) return;
  return getAuthenticatedAccount() ?? undefined;
}
//@ chunk-aepeg2w5.js:569844-569883 facade-majority = getOauthAccountInfo (1)
/**
 * 直接读全局配置 oauthAccount（不检查认证是否启用）。
 */
function getStoredOauthAccountInfo() {
  return getGlobalConfig().oauthAccount;
}
//@ chunk-aepeg2w5.js:569883-570090 fingerprint = isOverageProvisioningAllowed (0.694)
var isOverageProvisioningAllowed_2 = new Set([
  "stripe_subscription",
  "stripe_subscription_contracted",
  "stripe_subscription_enterprise_self_serve",
  "aws_marketplace",
  "c4e_consumption_trial",
  "apple_subscription",
  "google_play_subscription",
]);
//@ chunk-aepeg2w5.js:570090-570168 facade-majority
/**
 * 订阅账户的 billingType 是否允许开通超额（stripe_subscription 等）。
 */
function isOverageProvisioningAllowed() {
  let billingType = getOauthAccountInfo()?.billingType;
  if (!isClaudeAISubscriber() || !billingType) return false;
  return isOverageProvisioningAllowed_2.has(billingType);
}
//@ chunk-aepeg2w5.js:570168-570261 facade-majority = isExtraUsageAllowed (1)
function isExtraUsageAllowed() {
  if (env.DISABLE_EXTRA_USAGE_COMMAND) return false;
  if (getLspManager() !== null) return true;
  return isOverageProvisioningAllowed();
}
//@ chunk-aepeg2w5.js:570261-570315 facade-majority
function getUsageCreditsCommand() {
  return isExtraUsageAllowed() ? artifactPathPrefix("usage-credits") : undefined;
}
//@ chunk-aepeg2w5.js:570315-570439 facade-majority = hasClaudeAiBillingAccess (0.864)
/**
 * Claude.ai 账单权限：组织角色为 admin/billing/owner/primary_owner。
 */
function hasClaudeAiBillingRole() {
  let orgRole = getGlobalConfig().oauthAccount?.organizationRole;
  return !!orgRole && ["admin", "billing", "owner", "primary_owner"].includes(orgRole);
}
//@ chunk-aepeg2w5.js:570439-570648 facade-majority
function getTurnOnUsageCreditsStep() {
  let subscriptionType = getSubscriptionType();
  if (isArtifactMountMode() && (subscriptionType === "team" || subscriptionType === "enterprise"))
    return (getRateLimitTierOverride() ?? (isClaudeAISubscriber() && hasClaudeAiBillingRole()))
      ? `turn on usage credits at ${HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE}`
      : "ask your admin to turn on usage credits";
  return `turn on usage credits at ${USAGE_SETTINGS_URL}`;
}
//@ chunk-aepeg2w5.js:570648-570742 facade-majority = hasOpusAccess (1)
function hasOpusAccess() {
  let subscriptionType = getSubscriptionType();
  return (
    subscriptionType === "max" ||
    subscriptionType === "enterprise" ||
    subscriptionType === "team" ||
    subscriptionType === "pro" ||
    subscriptionType === null
  );
}
//@ chunk-aepeg2w5.js:570742-570864 facade-majority = getSubscriptionType (1)
/**
 * 当前 Claude.ai 订阅类型（max/pro/team/enterprise…）：认证启用时取 OAuth 令牌的 subscriptionType，缺失时从 profile 推断。
 */
function getSubscriptionType() {
  if (getStoredSubscriptionType()) return hasSubscriptionTypeOverride();
  if (!isAnthropicAuthEnabled()) return null;
  let oauthTokens = getClaudeAIOAuthTokens();
  if (!oauthTokens) return null;
  return oauthTokens.subscriptionType ?? getSubscriptionTypeFromProfile() ?? null;
}
//@ chunk-aepeg2w5.js:570864-571055 layout = hasOpusAccess (0.933)
function getSubscriptionTypeFromProfile() {
  if (!credentialIsOwnStoredLogin()) return null;
  switch (getBgDispatcherPlanInfo().subscriptionType) {
    case "max":
      return "max";
    case "pro":
      return "pro";
    case "team":
      return "team";
    case "enterprise":
      return "enterprise";
    default:
      return null;
  }
}
//@ chunk-aepeg2w5.js:571055-571140 facade-majority
function credentialIsOwnStoredLogin() {
  if (isBareModeAuthRestricted() || env.CLAUDE_CODE_OAUTH_TOKEN || usesHostProvidedAuth()) return false;
  return !(getOauthTokenFromFd() && !isOauthTokenFromBgSnapshot());
}
//@ chunk-aepeg2w5.js:571140-571372 facade-majority
function ownStoredLoginPlanAttributes() {
  if (!isAnthropicAuthEnabled())
    return {
      subscriptionType: null,
      rateLimitTier: null,
    };
  let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
  if (!claudeAIOAuthTokens || !credentialIsOwnStoredLogin())
    return {
      subscriptionType: null,
      rateLimitTier: null,
    };
  return {
    subscriptionType: claudeAIOAuthTokens.subscriptionType ?? null,
    rateLimitTier: claudeAIOAuthTokens.rateLimitTier ?? null,
  };
}
//@ chunk-aepeg2w5.js:571372-571407 facade-majority = getRequestTooLargeErrorMessage (1)
function isMaxSubscriber() {
  return getSubscriptionType() === "max";
}
//@ chunk-aepeg2w5.js:571407-571443 facade-majority = isTeamSubscriber (1)
function isTeamSubscriber() {
  return getSubscriptionType() === "team";
}
//@ chunk-aepeg2w5.js:571443-571511 facade-majority = isTeamPremiumSubscriber (1)
/**
 * team 订阅且 rateLimitTier 为 default_claude_max_5x。
 */
function isTeamPremiumSubscriber() {
  return getSubscriptionType() === "team" && getRateLimitTier() === "default_claude_max_5x";
}
//@ chunk-aepeg2w5.js:571511-571553 facade-majority = isEnterpriseSubscriber (1)
/**
 * 订阅类型为 enterprise。
 */
function isEnterpriseSubscriber() {
  return getSubscriptionType() === "enterprise";
}
//@ chunk-aepeg2w5.js:571553-571629 facade-majority
function isEnterprisePAYGSubscriber() {
  return getSubscriptionType() === "enterprise" && getSeatTier() === "enterprise_usage_based";
}
//@ chunk-aepeg2w5.js:571629-571664 facade-majority = isProSubscriber (1)
function isProSubscriber() {
  return getSubscriptionType() === "pro";
}
//@ chunk-aepeg2w5.js:571664-571796 facade-majority = getRateLimitTier (1)
/**
 * 当前限流档位：令牌 rateLimitTier，缺失时从 profile 取。
 */
function getRateLimitTier() {
  let oauthTokens = getRateLimitTier_2();
  if (oauthTokens !== null) return oauthTokens;
  if (!isAnthropicAuthEnabled()) return null;
  let oauthTokens_2 = getClaudeAIOAuthTokens();
  if (!oauthTokens_2) return null;
  return oauthTokens_2.rateLimitTier ?? getRateLimitTierFromProfile() ?? null;
}
//@ chunk-aepeg2w5.js:571796-571828 layout
var RATE_LIMIT_TIER_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-aepeg2w5.js:571828-571926 layout = getRateLimitTier (1)
function getRateLimitTierFromProfile() {
  if (!credentialIsOwnStoredLogin()) return null;
  let oauthTokens = getBgDispatcherPlanInfo().rateLimitTier;
  return oauthTokens !== undefined && RATE_LIMIT_TIER_PATTERN.test(oauthTokens) ? oauthTokens : null;
}
//@ chunk-aepeg2w5.js:571926-571969 facade-majority
function getSeatTier() {
  return getOauthAccountInfo()?.seatTier ?? null;
}
//@ chunk-aepeg2w5.js:571969-572058 layout
function getPlanDisplayNameLabel(oauthAccountInfo) {
  let planDisplayName = oauthAccountInfo?.planDisplayName;
  return planDisplayName &&
    !getStoredSubscriptionType() &&
    credentialIsOwnStoredLogin() &&
    isPlanDisplayName(planDisplayName)
    ? `Claude ${planDisplayName}`
    : null;
}
//@ chunk-aepeg2w5.js:572058-572303 facade-majority = getSubscriptionName (1)
/**
 * 订阅显示名：Claude Enterprise / Claude Team / Claude Max / Claude Pro 等。
 */
function getSubscriptionName() {
  let subscriptionType = getSubscriptionType();
  if (subscriptionType !== null) {
    let planDisplayNameLabel = getPlanDisplayNameLabel(getOauthAccountInfo());
    if (planDisplayNameLabel !== null) return planDisplayNameLabel;
  }
  switch (subscriptionType) {
    case "enterprise":
      return "Claude Enterprise";
    case "team":
      return "Claude Team";
    case "max":
      return "Claude Max";
    case "pro":
      return "Claude Pro";
    default:
      return "Claude API";
  }
}
//@ chunk-aepeg2w5.js:572303-572330 facade-majority
function isUsing3PServices() {
  return !isFirstPartyProvider();
}
//@ chunk-aepeg2w5.js:572330-572467 facade-majority = getConfiguredOtelHeadersHelper (0.409)
function getConfiguredOtelHeadersHelper() {
  if (isSafeMode()) return getSettingsForSource("policySettings")?.otelHeadersHelper;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("otelHeadersHelper", mergedSettings.otelHeadersHelper);
}
//@ chunk-aepeg2w5.js:572467-572643 facade-majority = isOtelHeadersHelperFromProjectOrLocalSettings (0.784)
function isOtelHeadersHelperFromProjectOrLocalSettings() {
  let otelHeadersHelper = getConfiguredOtelHeadersHelper();
  if (!otelHeadersHelper) return false;
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings");
  let localSettings = getSettingsForSourceTightenOnly("localSettings");
  return (
    projectSettings?.otelHeadersHelper === otelHeadersHelper ||
    localSettings?.otelHeadersHelper === otelHeadersHelper ||
    isHookedMergeAnswer("otelHeadersHelper")
  );
}
//@ chunk-aepeg2w5.js:572643-572737 layout
class HelperCommandError extends Error {
  kind;
  exitCode;
  constructor(message, kind, exitCode) {
    super(message);
    this.kind = kind;
    this.exitCode = exitCode;
  }
}
//@ chunk-aepeg2w5.js:572737-572790 facade-majority
function otelHeadersHelperFailureKind(e) {
  return e instanceof HelperCommandError ? e.kind : undefined;
}
//@ chunk-aepeg2w5.js:572790-572931 facade-majority
var otelHeadersHelperStates = new HostScoped(() => ({
  cache: null,
  timestamp: 0,
  inflight: null,
  lastFailure: null,
  failed: createSignal(),
  prefetched: false,
  repoHelperIgnoredLogged: false,
}));
var OTEL_HEADERS_HELPER_TTL_MS = 1740000;
//@ chunk-aepeg2w5.js:572931-573004 facade-majority
function getOtelHeadersHelperLastFailure() {
  if (!getConfiguredOtelHeadersHelper()) return null;
  return otelHeadersHelperStates.of(getRootSession().host).lastFailure;
}
//@ chunk-aepeg2w5.js:573004-573120 facade-majority
function clearOtelHeadersCache() {
  let e = otelHeadersHelperStates.of(getRootSession().host);
  e.cache = null;
  e.timestamp = 0;
  e.inflight = null;
  e.lastFailure = null;
  e.prefetched = false;
}
//@ chunk-aepeg2w5.js:573120-573180 facade-majority
function onOtelHeadersHelperFailure(e) {
  return otelHeadersHelperStates.of(getRootSession().host).failed.subscribe(e);
}
//@ chunk-aepeg2w5.js:573180-573292 facade-majority
function prefetchOtelHeadersFromHelper() {
  if (getIsNonInteractiveSession()) return;
  let e = otelHeadersHelperStates.of(getRootSession().host);
  if (e.prefetched) return;
  e.prefetched = true;
  getOtelHeadersFromHelper().catch(() => {});
}
//@ chunk-aepeg2w5.js:573292-575524 facade-majority = getOtelHeadersFromHelper (0.321)
/**
 * 运行 otelHeadersHelper 生成 OTel 导出头（JSON 对象），缓存 29 分钟；项目/本地设置来源需信任，失败记录 lastFailure 并发信号。
 */
async function getOtelHeadersFromHelper() {
  let otelHeadersHelper = getConfiguredOtelHeadersHelper();
  if (!otelHeadersHelper || isDiskless()) return {};
  let numberOrDefault = parseNumberOrDefault(
    process.env.CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS,
    OTEL_HEADERS_HELPER_TTL_MS,
  );
  let r = otelHeadersHelperStates.of(getRootSession().host);
  if (r.cache && Date.now() - r.timestamp < numberOrDefault) return r.cache;
  if (r.inflight) return r.inflight;
  if (isOtelHeadersHelperFromProjectOrLocalSettings()) {
    if (!checkHasTrustDialogAccepted()) return {};
  }
  r.inflight = (async () => {
    try {
      let trimmed = otelHeadersHelper.trim();
      let h = false;
      try {
        let projectConfigRoot = getProjectConfigRoot();
        let P = projectConfigRoot === null ? trimmed : resolve(projectConfigRoot, trimmed);
        h = (await stat(P)).isFile();
      } catch {}
      let y = null;
      let hasTrust = getProjectConfigRoot();
      if (h)
        try {
          let x = await runManagedHelperWithoutProjectEnv("otelHeadersHelper", otelHeadersHelper, () =>
            safeExecFile(trimmed, [], {
              ...(hasTrust !== null && {
                cwd: hasTrust,
              }),
              timeout: 30000,
              reject: false,
              useToolMemoryCgroup: false,
            }),
          );
          if (!(x.failed && !x.timedOut && typeof x.exitCode !== "number" && !x.signal)) y = x;
        } catch {}
      if (!y)
        y = await runManagedHelperWithoutProjectEnv("otelHeadersHelper", otelHeadersHelper, () =>
          safeExecShell(otelHeadersHelper, {
            ...(hasTrust !== null && {
              cwd: hasTrust,
            }),
            timeout: 30000,
            reject: false,
            useToolMemoryCgroup: false,
          }),
        );
      if (y.failed) {
        let x;
        let kind;
        if (y.timedOut) {
          x = "timed out";
          kind = "timeout";
        } else if (typeof y.exitCode === "number") {
          x = `exited ${y.exitCode}`;
          kind = "exit_code";
        } else if (y.signal) {
          x = `was killed by ${y.signal}`;
          kind = "killed";
        } else {
          x = "could not be started";
          kind = "spawn_failed";
        }
        let result = y.stderr?.trim();
        throw new HelperCommandError(
          result ? `${x}: ${result}` : x,
          kind,
          kind === "exit_code" ? y.exitCode : undefined,
        );
      }
      let trimmed_2 = y.stdout?.toString().trim();
      if (!trimmed_2)
        throw new HelperCommandError("otelHeadersHelper did not return a valid value", "empty_output");
      let R;
      try {
        R = jsonParse(trimmed_2);
      } catch {
        throw new HelperCommandError("otelHeadersHelper did not return valid JSON", "invalid_json");
      }
      if (typeof R !== "object" || R === null || Array.isArray(R))
        throw new HelperCommandError(
          "otelHeadersHelper must return a JSON object with string key-value pairs",
          "not_an_object",
        );
      for (let [key, value] of Object.entries(R))
        if (typeof value !== "string")
          throw new HelperCommandError(
            `otelHeadersHelper returned non-string value for key "${key}": ${typeof value}`,
            "non_string_value",
          );
      r.cache = R;
      r.timestamp = Date.now();
      r.lastFailure = null;
      return r.cache;
    } catch (error) {
      let headers = errorMessage(error);
      let y = r.lastFailure === null;
      r.lastFailure = headers;
      logForDebugging(
        `Error getting OpenTelemetry headers from otelHeadersHelper (in settings): ${headers}`,
        {
          level: "error",
        },
      );
      if (y) {
        if (getIsNonInteractiveSession())
          process.stderr.write(
            sequential.red(
              `otelHeadersHelper failed (OpenTelemetry export headers unavailable): ${headers}`,
            ) +
              `
`,
          );
        let kind = error instanceof HelperCommandError ? error.kind : "unknown";
        try {
          r.failed.emit(headers);
        } catch (error) {
          logForDebugging(`otelHeadersHelper failure listener threw: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        logEvent("tengu_otel_headers_helper_failed", {
          failure_kind: fromEnum(kind),
          exit_code: error instanceof HelperCommandError ? error.exitCode : undefined,
        });
      }
      throw error;
    } finally {
      r.inflight = null;
    }
  })();
  return r.inflight;
}
//@ chunk-aepeg2w5.js:575524-575568 facade-majority = isConsumerPlan (1)
/**
 * plan 为 max 或 pro。
 */
function isConsumerPlan(plan) {
  return plan === "max" || plan === "pro";
}
//@ chunk-aepeg2w5.js:575568-575623 facade-majority
function isConsumerSubscriber() {
  let subscriptionType = getSubscriptionType();
  return isClaudeAISubscriber() && subscriptionType !== null && isConsumerPlan(subscriptionType);
}
//@ chunk-aepeg2w5.js:575623-576098 facade-majority = getAccountInformation (0.951)
/**
 * /status 等显示的账户信息：tokenSource 或订阅名、apiKeySource、组织名、邮箱（仅 claude.ai 或 /login managed key 时）。第三方提供方返回 undefined。
 */
function getAccountInformation() {
  if (getAPIProvider() !== "firstParty") return;
  let { source: authTokenSource } = getAuthTokenSource();
  let accountInfo = {};
  if (
    authTokenSource === "CLAUDE_CODE_OAUTH_TOKEN" ||
    authTokenSource === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"
  )
    accountInfo.tokenSource = authTokenSource;
  else if (isClaudeAISubscriber()) accountInfo.subscription = getSubscriptionName();
  else if (authTokenSource !== "profile") accountInfo.tokenSource = authTokenSource;
  let { key: apiKey, source: apiKeySource } = getAnthropicApiKeyWithSourceSafe();
  if (apiKey) accountInfo.apiKeySource = apiKeySource;
  if (authTokenSource === "claude.ai" || apiKeySource === "/login managed key") {
    let orgName = getOauthAccountInfo()?.organizationName;
    if (orgName) accountInfo.organization = orgName;
  }
  let email = getOauthAccountInfo()?.emailAddress;
  if ((authTokenSource === "claude.ai" || apiKeySource === "/login managed key") && email)
    accountInfo.email = email;
  return accountInfo;
}
//@ chunk-aepeg2w5.js:576098-576283 facade-majority = AccountInfoSchema (0.477)
/**
 * 当前账户信息（email、organization、subscriptionType、tokenSource、apiKeySource、apiProvider），用于 initialize 响应。
 */
function toAccountInfo() {
  let accountInformation = getAccountInformation();
  return {
    email: accountInformation?.email,
    organization: accountInformation?.organization,
    subscriptionType: accountInformation?.subscription,
    tokenSource: accountInformation?.tokenSource,
    apiKeySource: accountInformation?.apiKeySource,
    apiProvider: getAPIProvider(),
  };
}
//@ chunk-aepeg2w5.js:576283-576455 facade-majority
function getApiKeyFromConfigOrMacOSKeychainAsync() {
  if (isBareModeAuthRestricted()) return Promise.resolve(null);
  let apiKeyConfigCache = getApiKeyConfigCache();
  if (apiKeyConfigCache.promise) return apiKeyConfigCache.promise;
  let managedPrimaryApiKey = getManagedPrimaryApiKey();
  apiKeyConfigCache.promise = managedPrimaryApiKey;
  managedPrimaryApiKey.catch(() => {
    if (apiKeyConfigCache.promise === managedPrimaryApiKey) apiKeyConfigCache.promise = null;
  });
  return managedPrimaryApiKey;
}
//@ chunk-aepeg2w5.js:576455-576594 layout
async function getManagedPrimaryApiKey() {
  if (usesHostProvidedAuth()) return null;
  let globalConfig = getGlobalConfig();
  if (!globalConfig.primaryApiKey) return null;
  return {
    key: globalConfig.primaryApiKey,
    source: "/login managed key",
  };
}
//@ chunk-aepeg2w5.js:576594-577686 facade-majority
async function getAnthropicApiKeyWithSourceAsync(e = {}) {
  if (isBareModeAuthRestricted()) {
    if (env.ANTHROPIC_API_KEY)
      return {
        key: env.ANTHROPIC_API_KEY,
        source: "ANTHROPIC_API_KEY",
      };
    if (getConfiguredApiKeyHelper())
      return {
        key: e.skipRetrievingKeyFromApiKeyHelper ? null : getApiKeyFromApiKeyHelperCached(),
        source: "apiKeyHelper",
      };
    return {
      key: null,
      source: "none",
    };
  }
  let ANTHROPIC_API_KEY = isAntBuild() ? undefined : env.ANTHROPIC_API_KEY;
  if (preferThirdPartyAuthentication() && ANTHROPIC_API_KEY)
    return {
      key: ANTHROPIC_API_KEY,
      source: "ANTHROPIC_API_KEY",
    };
  if (isEnvTruthy(false)) {
    let apiKeyFromFileDescriptor = getApiKeyFromFileDescriptor();
    if (apiKeyFromFileDescriptor)
      return {
        key: apiKeyFromFileDescriptor,
        source: "ANTHROPIC_API_KEY",
      };
    if (
      !ANTHROPIC_API_KEY &&
      !env.CLAUDE_CODE_OAUTH_TOKEN &&
      !env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR &&
      !getOAuthTokenFromFileDescriptor() &&
      usableLauncherHostLoginToken() === null &&
      !env.ANTHROPIC_AUTH_TOKEN &&
      !shouldUseWIFAuth() &&
      isFirstPartyProvider()
    )
      throw Error(
        "ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, or WIF env vars (ANTHROPIC_FEDERATION_RULE_ID + ANTHROPIC_ORGANIZATION_ID) required",
      );
    if (ANTHROPIC_API_KEY)
      return {
        key: ANTHROPIC_API_KEY,
        source: "ANTHROPIC_API_KEY",
      };
    return {
      key: null,
      source: "none",
    };
  }
  if (ANTHROPIC_API_KEY && getCustomApiKeyStatus(tailOfId(ANTHROPIC_API_KEY)) === "approved")
    return {
      key: ANTHROPIC_API_KEY,
      source: "ANTHROPIC_API_KEY",
    };
  let apiKeyFromFileDescriptor = getApiKeyFromFileDescriptor();
  if (apiKeyFromFileDescriptor)
    return {
      key: apiKeyFromFileDescriptor,
      source: "ANTHROPIC_API_KEY",
    };
  if (getConfiguredApiKeyHelper()) {
    if (e.skipRetrievingKeyFromApiKeyHelper)
      return {
        key: null,
        source: "apiKeyHelper",
      };
    return {
      key: getApiKeyFromApiKeyHelperCached(),
      source: "apiKeyHelper",
    };
  }
  let apiKeyFromConfigOrMacOSKeychain = await getApiKeyFromConfigOrMacOSKeychainAsync();
  if (apiKeyFromConfigOrMacOSKeychain) return apiKeyFromConfigOrMacOSKeychain;
  return {
    key: null,
    source: "none",
  };
}
//@ chunk-aepeg2w5.js:577686-577739 facade-majority
async function getAnthropicApiKeyAsync() {
  let { key } = await getAnthropicApiKeyWithSourceAsync();
  return key;
}
//@ chunk-aepeg2w5.js:577739-577826 facade-majority
async function getAnthropicApiKeyWithSourceAsyncSafe(e = {}) {
  try {
    return await getAnthropicApiKeyWithSourceAsync(e);
  } catch {
    return {
      key: null,
      source: "none",
    };
  }
}
//@ chunk-aepeg2w5.js:577826-577965 facade-majority = hasAnthropicApiKeyAuth (1)
async function hasAnthropicApiKeyAuthAsync() {
  try {
    let { key, source } = await getAnthropicApiKeyWithSourceAsync({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    return key !== null && source !== "none";
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:577965-578381 facade-majority
async function isAnthropicAuthEnabledAsync() {
  if (isBareModeAuthRestricted()) return false;
  if (env.ANTHROPIC_UNIX_SOCKET) return !!env.CLAUDE_CODE_OAUTH_TOKEN;
  if (shouldUseWIFAuth()) return false;
  let e = !isFirstPartyProvider();
  let n = getSettings_DEPRECATED() || {};
  let r = isBareMode() ? getConfiguredApiKeyHelper() : warnPinnedHelper("apiKeyHelper", n.apiKeyHelper);
  let s = effectiveAuthTokenEnv();
  let h;
  try {
    h = (
      await getAnthropicApiKeyWithSourceAsync({
        skipRetrievingKeyFromApiKeyHelper: true,
      })
    ).source;
  } catch {
    return false;
  }
  let y = h === "ANTHROPIC_API_KEY" || h === "apiKeyHelper";
  let S = hasPossibleCredentialFromDescriptor("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR");
  let shouldDisableAuth =
    ((s || y) && !isFirstPartyManagedOAuthContext()) || ((r || S) && !isManagedOAuthContext());
  return !(e || shouldDisableAuth);
}
//@ chunk-aepeg2w5.js:578381-579061 facade-majority = getAuthTokenSource (0.886)
/**
 * getAuthTokenSource 的异步版本（storage v5 读取令牌）。
 */
async function getAuthTokenSourceAsync(e) {
  if (isBareModeAuthRestricted()) {
    if (getConfiguredApiKeyHelper())
      return {
        source: "apiKeyHelper",
        hasToken: true,
      };
    return {
      source: "none",
      hasToken: false,
    };
  }
  if (effectiveAuthTokenEnv() && !isFirstPartyManagedOAuthContext())
    return {
      source: "ANTHROPIC_AUTH_TOKEN",
      hasToken: true,
    };
  if (env.CLAUDE_CODE_OAUTH_TOKEN || usableLauncherHostLoginToken() !== null)
    return {
      source: "CLAUDE_CODE_OAUTH_TOKEN",
      hasToken: true,
    };
  if (getOAuthTokenFromFileDescriptor()) {
    if (hasPossibleCredentialFromDescriptor("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"))
      return {
        source: "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
        hasToken: true,
      };
    return {
      source: "CCR_OAUTH_TOKEN_FILE",
      hasToken: true,
    };
  }
  if (getConfiguredApiKeyHelper() && !isManagedOAuthContext())
    return {
      source: "apiKeyHelper",
      hasToken: true,
    };
  if (shouldUseWIFAuth())
    return {
      source: "profile",
      hasToken: true,
    };
  let oauthTokens = await getClaudeAIOAuthTokensAsync(e);
  if (shouldUseClaudeAIAuth(oauthTokens?.scopes) && oauthTokens?.accessToken)
    return {
      source: "claude.ai",
      hasToken: true,
    };
  return {
    source: "none",
    hasToken: false,
  };
}
//@ chunk-aepeg2w5.js:579061-579141 facade-majority
async function isClaudeAISubscriberAsync(e) {
  if (!(await isAnthropicAuthEnabledAsync())) return false;
  return shouldUseClaudeAIAuth((await getClaudeAIOAuthTokensAsync(e))?.scopes);
}
//@ chunk-aepeg2w5.js:579141-579231 facade-majority
async function hasProfileScopeAsync(e) {
  let scopes = (await getClaudeAIOAuthTokensAsync(e))?.scopes;
  return Array.isArray(scopes) && scopes.includes(CLAUDE_AI_PROFILE_SCOPE);
}
//@ chunk-aepeg2w5.js:579231-579305 facade-majority
async function is1PApiCustomerAsync(e) {
  if (!isFirstPartyProvider()) return false;
  if (await isClaudeAISubscriberAsync(e)) return false;
  return true;
}
//@ chunk-aepeg2w5.js:579305-579370 facade-majority = getOauthAccountInfo (1)
async function getOauthAccountInfoAsync() {
  return (await isAnthropicAuthEnabledAsync()) ? getGlobalConfig().oauthAccount : undefined;
}
//@ chunk-aepeg2w5.js:579370-579472 facade-majority
async function isOverageProvisioningAllowedAsync(e) {
  let billingType = (await getOauthAccountInfoAsync())?.billingType;
  if (!(await isClaudeAISubscriberAsync(e)) || !billingType) return false;
  return isOverageProvisioningAllowed_2.has(billingType);
}
//@ chunk-aepeg2w5.js:579472-579616 facade-majority = getSubscriptionType (1)
async function getSubscriptionTypeAsync(e) {
  if (getStoredSubscriptionType()) return hasSubscriptionTypeOverride();
  if (!(await isAnthropicAuthEnabledAsync())) return null;
  let oauthTokens = await getClaudeAIOAuthTokensAsync(e);
  if (!oauthTokens) return null;
  return oauthTokens.subscriptionType ?? getSubscriptionTypeFromProfile() ?? null;
}
//@ chunk-aepeg2w5.js:579616-579725 facade-majority = hasOpusAccess (1)
async function hasOpusAccessAsync(e) {
  let subscriptionType = await getSubscriptionTypeAsync(e);
  return (
    subscriptionType === "max" ||
    subscriptionType === "enterprise" ||
    subscriptionType === "team" ||
    subscriptionType === "pro" ||
    subscriptionType === null
  );
}
//@ chunk-aepeg2w5.js:579725-579879 facade-majority = getRateLimitTier (1)
async function getRateLimitTierAsync(e) {
  let oauthTokens = getRateLimitTier_2();
  if (oauthTokens !== null) return oauthTokens;
  if (!(await isAnthropicAuthEnabledAsync())) return null;
  let oauthTokens_2 = await getClaudeAIOAuthTokensAsync(e);
  if (!oauthTokens_2) return null;
  return oauthTokens_2.rateLimitTier ?? getRateLimitTierFromProfile() ?? null;
}
//@ chunk-aepeg2w5.js:579879-579936 facade-majority
async function getSeatTierAsync() {
  return (await getOauthAccountInfoAsync())?.seatTier ?? null;
}
//@ chunk-aepeg2w5.js:579936-579986 facade-majority = getRequestTooLargeErrorMessage (1)
async function isMaxSubscriberAsync(e) {
  return (await getSubscriptionTypeAsync(e)) === "max";
}
//@ chunk-aepeg2w5.js:579986-580037 facade-majority = isTeamSubscriber (1)
async function isTeamSubscriberAsync(e) {
  return (await getSubscriptionTypeAsync(e)) === "team";
}
//@ chunk-aepeg2w5.js:580037-580128 facade-majority = isTeamPremiumSubscriber (1)
async function isTeamPremiumSubscriberAsync(e) {
  return (
    (await getSubscriptionTypeAsync(e)) === "team" &&
    (await getRateLimitTierAsync(e)) === "default_claude_max_5x"
  );
}
//@ chunk-aepeg2w5.js:580128-580185 facade-majority = isEnterpriseSubscriber (1)
async function isEnterpriseSubscriberAsync(e) {
  return (await getSubscriptionTypeAsync(e)) === "enterprise";
}
//@ chunk-aepeg2w5.js:580185-580282 facade-majority
async function isEnterprisePAYGSubscriberAsync(e) {
  return (
    (await getSubscriptionTypeAsync(e)) === "enterprise" &&
    (await getSeatTierAsync()) === "enterprise_usage_based"
  );
}
//@ chunk-aepeg2w5.js:580282-580332 facade-majority = isProSubscriber (1)
async function isProSubscriberAsync(plan) {
  return (await getSubscriptionTypeAsync(plan)) === "pro";
}
//@ chunk-aepeg2w5.js:580332-580599 facade-majority = getSubscriptionName (1)
async function getSubscriptionNameAsync(e) {
  let subscriptionType = await getSubscriptionTypeAsync(e);
  if (subscriptionType !== null) {
    let planDisplayNameLabel = getPlanDisplayNameLabel(await getOauthAccountInfoAsync());
    if (planDisplayNameLabel !== null) return planDisplayNameLabel;
  }
  switch (subscriptionType) {
    case "enterprise":
      return "Claude Enterprise";
    case "team":
      return "Claude Team";
    case "max":
      return "Claude Max";
    case "pro":
      return "Claude Pro";
    default:
      return "Claude API";
  }
}
//@ chunk-aepeg2w5.js:580599-580678 facade-majority
async function isConsumerSubscriberAsync(e) {
  let subscriptionType = await getSubscriptionTypeAsync(e);
  return (
    (await isClaudeAISubscriberAsync(e)) && subscriptionType !== null && isConsumerPlan(subscriptionType)
  );
}
//@ chunk-aepeg2w5.js:580678-581208 facade-majority = getAccountInformation (0.951)
/**
 * getAccountInformation 的异步版本（storage v5）。
 */
async function getAccountInformationAsync(e) {
  if (getAPIProvider() !== "firstParty") return;
  let { source: authTokenSource } = await getAuthTokenSourceAsync(e);
  let accountInfo = {};
  if (
    authTokenSource === "CLAUDE_CODE_OAUTH_TOKEN" ||
    authTokenSource === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"
  )
    accountInfo.tokenSource = authTokenSource;
  else if (await isClaudeAISubscriberAsync(e)) accountInfo.subscription = await getSubscriptionNameAsync(e);
  else if (authTokenSource !== "profile") accountInfo.tokenSource = authTokenSource;
  let { key: apiKey, source: apiKeySource } = await getAnthropicApiKeyWithSourceAsyncSafe();
  if (apiKey) accountInfo.apiKeySource = apiKeySource;
  if (authTokenSource === "claude.ai" || apiKeySource === "/login managed key") {
    let orgName = (await getOauthAccountInfoAsync())?.organizationName;
    if (orgName) accountInfo.organization = orgName;
  }
  let email = (await getOauthAccountInfoAsync())?.emailAddress;
  if ((authTokenSource === "claude.ai" || apiKeySource === "/login managed key") && email)
    accountInfo.email = email;
  return accountInfo;
}
//@ chunk-aepeg2w5.js:581208-581544 facade-majority
async function providerAllowlistRefusal(e) {
  let n = policyUnreadableMessage();
  if (n !== undefined)
    return {
      valid: false,
      reason: "managed_settings_invalid",
      policyUnreadable: true,
      message: n,
    };
  await recheckAllowedProviderEndpoint(e);
  let r = checkAllowedProvider(e);
  if (r === undefined) return;
  await logFeatureBadAsync("auth_force_login_org", "provider_not_allowed", {
    api_provider: fromEnum(r.refused[0].provider),
  });
  return {
    valid: false,
    reason: "provider_not_allowed",
    message: r.message,
  };
}
//@ chunk-aepeg2w5.js:581544-581630 layout = hasAnthropicApiKeyAuth (1)
setWifProfileBaseUrlInUse(() =>
  shouldUseWIFAuth() &&
  getAnthropicApiKeyWithSourceSafe({
    skipRetrievingKeyFromApiKeyHelper: true,
  }).source === "none"
    ? getWIFProfileBaseUrl()
    : undefined,
);
//@ chunk-aepeg2w5.js:581630-583044 layout
function buildForceLoginConflictMessage({ orgPinned }) {
  let n = describeActiveCredential();
  let joined = n.fixes.join("; also ");
  let apiProvider = getAPIProvider();
  let h =
    apiProvider !== "firstParty" && apiProvider !== "gateway"
      ? THIRD_PARTY_PROVIDER_LABELS[apiProvider]
      : undefined;
  if (isGatewayLoginForced())
    return [
      `Administrator policy requires a Cloud gateway sign-in on this machine, but this session is configured with ${n.what}, which a gateway machine does not accept.`,
      "",
      n.complete
        ? `To continue: ${joined}.`
        : withoutHostManagedProviderVars()
          ? `To continue: ${joined}, then run claude and sign in with /login.`
          : `To continue: ${joined}, then run claude again; ${h ?? "your cloud provider"} needs no Anthropic sign-in.`,
    ].join(`
`);
  let forceLoginMethod = getSettingsForSource("policySettings")?.forceLoginMethod;
  let S = orgPinned
    ? "pin Anthropic sign-ins to your organization (forceLoginOrgUUID)"
    : forceLoginMethod === "claudeai" || forceLoginMethod === "console"
      ? "require a claude.ai or Console sign-in (forceLoginMethod)"
      : "set a sign-in method (forceLoginMethod)";
  let w = apiProvider === "firstParty" ? configuredApiProxyHost() : undefined;
  let R = `This machine's managed settings require a first-party login: they ${S}, and this session is configured with ${n.what}, which cannot be checked against that policy${h ? ` \u2014 even alongside ${h}` : ""}${w ? ` (requests go through ${w}, per ANTHROPIC_BASE_URL)` : ""}.`;
  let x = n.complete
    ? `To continue: ${joined}.`
    : h
      ? `To continue: ${joined}, then run claude again; ${h} needs no Anthropic sign-in.`
      : `To continue: ${joined}, then run: claude auth login`;
  return [
    R,
    "",
    x,
    "Admins: if this is a third-party desktop session, forceLoginOrgUUID / forceLoginMethod target first-party OAuth and should be removed from this machine's managed settings.",
  ].join(`
`);
}
//@ chunk-aepeg2w5.js:583044-583137 layout
function describeSettingsSourcePath(e) {
  let settingsFilePathForSource = getSettingsFilePathForSource(e);
  return settingsFilePathForSource === undefined
    ? "your settings"
    : stripControlChars(settingsFilePathForSource).replace(/[\t\n\r]+/g, " ");
}
//@ chunk-aepeg2w5.js:583137-583405 layout
function findEnvSettingSource(e, n) {
  if (getSettingsForSource("policySettings")?.env?.[e] === n)
    return {
      managed: true,
    };
  for (let r of ["flagSettings", "localSettings", "projectSettings", "userSettings"])
    if (getSettingsForSource(r)?.env?.[e] === n)
      return {
        managed: false,
        file:
          r === "flagSettings" && getFlagSettingsInline() !== null
            ? "your --settings value"
            : describeSettingsSourcePath(r),
      };
  return;
}
//@ chunk-aepeg2w5.js:583405-583891 layout
function describeEnvCredential(e, n, r) {
  let envSettingSource = findEnvSettingSource(e, n);
  if (envSettingSource === undefined)
    return {
      what: `${r} from ${e}`,
      fix: `unset ${e} (or run in a shell without it)`,
      complete: false,
    };
  if (envSettingSource.managed)
    return {
      what: `${r} from ${e}, set by your organization's managed settings`,
      fix: `ask your administrator (managed settings set both env.${e} and a sign-in policy; that credential cannot satisfy it)`,
      complete: true,
    };
  return {
    what: `${r} from ${e}, set in the env block of ${envSettingSource.file}`,
    fix: `remove ${e} from the env block of ${envSettingSource.file}`,
    complete: false,
  };
}
//@ chunk-aepeg2w5.js:583891-585825 layout
function describeActiveCredential() {
  let e = [];
  let n = {
    what: "a credential supplied by the host application that launched Claude Code",
    fix: "sign in inside that application, or run claude from a terminal and sign in there",
    complete: true,
  };
  let r =
    getHostAuthEnvVar({
      CLAUDE_CODE_HOST_AUTH_ENV_VAR: env.CLAUDE_CODE_HOST_AUTH_ENV_VAR,
    }) ?? (env.CLAUDE_CODE_ENTRYPOINT === "claude-desktop-3p" ? "any" : undefined);
  let { key, source } = getAnthropicApiKeyWithSourceSafe({
    skipRetrievingKeyFromApiKeyHelper: true,
  });
  if (env.ANTHROPIC_API_KEY && key === env.ANTHROPIC_API_KEY)
    e.push(
      r === "ANTHROPIC_API_KEY" || r === "any"
        ? n
        : describeEnvCredential("ANTHROPIC_API_KEY", env.ANTHROPIC_API_KEY, "an API key"),
    );
  else if (
    source === "ANTHROPIC_API_KEY" ||
    hasPossibleCredentialFromDescriptor("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR")
  )
    e.push(n);
  if (env.ANTHROPIC_AUTH_TOKEN)
    e.push(
      r === "ANTHROPIC_AUTH_TOKEN" || r === "any"
        ? n
        : describeEnvCredential("ANTHROPIC_AUTH_TOKEN", env.ANTHROPIC_AUTH_TOKEN, "a bearer token"),
    );
  else if (getGatewayTokenFromFileDescriptor()) e.push(n);
  if (source === "/login managed key")
    e.push({
      what: "a Console API key saved by an earlier login",
      fix: "run: claude auth logout (removes the saved key)",
      complete: false,
    });
  if (getConfiguredApiKeyHelper()) {
    let w = isBareMode() ? "flagSettings" : getEffectiveSettingSource_2("apiKeyHelper");
    if (w === "policySettings")
      e.push({
        what: "an API key from the apiKeyHelper your organization's managed settings configure",
        fix: "ask your administrator (managed settings set both apiKeyHelper and a sign-in policy; a helper key cannot satisfy it)",
        complete: true,
      });
    else {
      let R =
        w === null
          ? "your settings"
          : w === "flagSettings" && getFlagSettingsInline() !== null
            ? "your --settings value"
            : describeSettingsSourcePath(w);
      e.push({
        what: `an API key from the apiKeyHelper in ${R}`,
        fix: `remove apiKeyHelper from ${R}`,
        complete: false,
      });
    }
  }
  let y = new Set();
  let S = [];
  for (let w of e)
    if (!y.has(w.fix)) {
      y.add(w.fix);
      S.push(w);
    }
  if (S.length === 0)
    return r !== undefined
      ? {
          what: n.what,
          fixes: [n.fix],
          complete: true,
        }
      : isBareModeAuthRestricted()
        ? {
            what: "no sign-in at all (--bare turns first-party sign-in off)",
            fixes: ["run claude without --bare and sign in"],
            complete: true,
          }
        : {
            what: "no usable Anthropic sign-in or credential",
            fixes: ["sign in with: claude auth login"],
            complete: true,
          };
  return {
    what: S[0].what,
    fixes: S.map((w) => w.fix),
    complete: S.every((w) => w.complete),
  };
}
//@ chunk-aepeg2w5.js:585825-585984 layout
/**
 * 是否存在 OAuth 以外的凭证（API key、ANTHROPIC_AUTH_TOKEN、key FD、网关令牌、apiKeyHelper），或第一方但未启用 Anthropic 认证。
 */
function hasNonOAuthCredential() {
  if (
    hasAnthropicApiKeyAuth() ||
    !!env.ANTHROPIC_AUTH_TOKEN ||
    hasPossibleCredentialFromDescriptor("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR") ||
    !!getGatewayTokenFromFileDescriptor() ||
    !!getConfiguredApiKeyHelper()
  )
    return true;
  return getAPIProvider() === "firstParty" && !shouldUseWIFAuth() && !isAnthropicAuthEnabled();
}
//@ chunk-aepeg2w5.js:585984-586082 layout
var UNREADABLE_POLICY_ERRNOS = ["EACCES", "EPERM", "EBUSY", "EIO", "EISDIR", "ELOOP"];
var regExp_30 = new RegExp(`\\b(${UNREADABLE_POLICY_ERRNOS.join("|")})\\b`);
//@ chunk-aepeg2w5.js:586082-588528 facade-majority = validateForceLoginOrg (0.287)
/**
 * 见 AD：托管设置组织 pin 校验。
 */
async function validateForceLoginOrg(credentials, n, r) {
  let settingsForSource = getSettingsForSource("policySettings");
  let requiredOrgUuid = settingsForSource?.forceLoginOrgUUID;
  let y = requiredOrgUuid !== undefined || settingsForSource?.forceLoginMethod !== undefined;
  if (isAdminPolicyUnreadable() && !adminPolicyLoadFailureRefusesLaunch()) {
    let found = UNREADABLE_POLICY_ERRNOS.find((re) => re === getFatalAdminPolicyLoadErrors()[0]?.errno);
    logFeatureSad("auth_force_login_org", "policy_denied_passthrough", {
      errno: fromEnumOpt(found) ?? lit("other"),
      api_provider: fromEnum(getAPIProvider()),
    });
  }
  let S = await checkForceLoginPolicyReadable();
  if (S) return S;
  let w = await providerAllowlistRefusal();
  if (w) return w;
  let forceLoginOrgRequirement = getForceLoginOrgRequirement(requiredOrgUuid, r !== undefined);
  if (forceLoginOrgRequirement.kind === "host_managed") {
    if (y) logFeatureSad("auth_force_login_org", "managed_by_host_under_pin");
    return {
      valid: true,
    };
  }
  if (forceLoginOrgRequirement.kind === "unix_socket") {
    let Q = {
      api_provider: fromEnum(getAPIProvider()),
      auth_token_source: fromEnum(getAuthTokenSource().source),
    };
    if (!isAnthropicAuthEnabled() && y) logFeatureSad("auth_force_login_org", "unix_socket_3p_under_pin", Q);
    else if (isAnthropicAuthEnabled() && requiredOrgUuid !== undefined)
      logFeatureSad("auth_force_login_org", "unix_socket_ssh_under_pin", Q);
    else if (adminPolicyLoadFailureRefusesLaunch())
      logFeatureSad("auth_force_login_org", "unix_socket_unreadable_policy", Q);
    else logFeatureOk("auth_force_login_org");
    return {
      valid: true,
    };
  }
  if (forceLoginOrgRequirement.kind === "auth_disabled") {
    if (y && hasNonOAuthCredential())
      return {
        valid: false,
        reason: "org_pin_api_key_conflict",
        message: buildForceLoginConflictMessage({
          orgPinned: requiredOrgUuid !== undefined,
        }),
      };
    return {
      valid: true,
    };
  }
  if (forceLoginOrgRequirement.kind === "no_pin")
    return {
      valid: true,
    };
  if (forceLoginOrgRequirement.kind === "empty_pin")
    return {
      valid: false,
      reason: "managed_settings_invalid",
      message: EMPTY_FORCE_LOGIN_ORG_MESSAGE,
    };
  let { requiredOrgUuids } = forceLoginOrgRequirement;
  let P = formatRequiredOrgs(requiredOrgUuids);
  let F;
  if (r !== undefined) F = isUsingOAuth(r.accessToken);
  else {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
    });
    F = getClaudeAIOAuthTokens();
  }
  if (!F)
    return {
      valid: true,
    };
  let { source } = getAuthTokenSource();
  let G = source === "CLAUDE_CODE_OAUTH_TOKEN" || source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR";
  let j = r === undefined && F.accessToken === usableLauncherHostLoginToken();
  let envVarName = j ? launcherHostLoginIdentity() : null;
  let q;
  if (r !== undefined) q = r.organizationUuid;
  else if (n?.accessToken === F.accessToken) q = n.organizationUuid;
  else if (envVarName !== null)
    q = ((await envVarName) ?? (await askLauncherHostLoginIdentityAgain()))?.organizationUuid;
  else q = (await validateOauthToken(F.accessToken))?.organization_uuid;
  if (q === undefined)
    return {
      valid: false,
      reason: "org_verify_failed",
      message: orgVerificationFailedMessage(P),
    };
  if (requiredOrgUuids.includes(q))
    return {
      valid: true,
    };
  if (r !== undefined || j)
    return {
      valid: false,
      reason: "org_pin_mismatch",
      message: `The sign-in the desktop app provided belongs to a different
organization than required by this machine's managed settings.

Required: ${P}
Token organization: ${q}

Sign in to the desktop app with a permitted organization.`,
    };
  if (G)
    return {
      valid: false,
      reason: "org_pin_mismatch",
      message: `The ${source === "CLAUDE_CODE_OAUTH_TOKEN" ? "CLAUDE_CODE_OAUTH_TOKEN" : "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"} environment variable provides a token for a
different organization than required by this machine's managed settings.

Required: ${P}
Token organization: ${q}

Remove the environment variable or obtain a token for a permitted organization.`,
    };
  return {
    valid: false,
    reason: "org_pin_mismatch",
    message: formatWrongOrgMessage(q, P),
  };
}
//@ chunk-aepeg2w5.js:588528-588706 layout
var EMPTY_FORCE_LOGIN_ORG_MESSAGE = `forceLoginOrgUUID in managed settings is set to an empty array.
No organizations are permitted. This is almost certainly a misconfiguration.
Contact your administrator.`;
//@ chunk-aepeg2w5.js:588706-589274 layout
async function checkForceLoginPolicyReadable() {
  if (!isAdminPolicyUnreadable() || !adminPolicyLoadFailureRefusesLaunch()) return;
  let e = getFatalAdminPolicyLoadErrors()[0];
  if (!e) return;
  let n = e.errorClass === "unreadable";
  let match = e.message.match(regExp_30);
  let found = UNREADABLE_POLICY_ERRNOS.find((S) => S === match?.[1]);
  let errno = n ? (fromEnumOpt(found) ?? lit("other")) : lit("malformed");
  await logFeatureBadAsync("auth_force_login_org", "policy_unreadable_fail_close", {
    errno,
  });
  return {
    valid: false,
    reason: "managed_settings_invalid",
    policyUnreadable: true,
    message: `Unable to read managed policy settings.
This machine may require organization login enforcement, but the policy file failed to load.
Contact your administrator.

Detail: ${e.file ? `${cleanForDisplay(e.file)}: ${e.message}` : e.message}`,
  };
}
//@ chunk-aepeg2w5.js:589274-589378 layout
function formatRequiredOrgs(requiredOrgUuids) {
  return requiredOrgUuids.length === 1
    ? `organization ${requiredOrgUuids[0]}`
    : `one of these organizations: ${requiredOrgUuids.join(", ")}`;
}
//@ chunk-aepeg2w5.js:589378-589555 layout
function formatWrongOrgMessage(e, n) {
  return `Your authentication token belongs to organization ${e},
but this machine requires ${n}.

Please log in with a permitted organization: claude auth login`;
}
//@ chunk-aepeg2w5.js:589555-589861 layout
/**
 * 计算组织 pin 要求：host_managed / unix_socket / auth_disabled / no_pin / empty_pin / required（列出允许的组织 UUID）。
 */
function getForceLoginOrgRequirement(e, n) {
  if (isHostManagedProviderAuth() && !n && usableLauncherHostLoginToken() === null)
    return {
      kind: "host_managed",
    };
  if (env.ANTHROPIC_UNIX_SOCKET)
    return {
      kind: "unix_socket",
    };
  if (!isAnthropicAuthEnabled())
    return {
      kind: "auth_disabled",
    };
  if (e === undefined)
    return {
      kind: "no_pin",
    };
  let r = typeof e === "string" ? [e] : e;
  return r.length === 0
    ? {
        kind: "empty_pin",
      }
    : {
        kind: "required",
        requiredOrgUuids: r,
      };
}
//@ chunk-aepeg2w5.js:589861-589879 layout
/**
 * 校验 OAuth 令牌的重试间隔（500ms、1500ms）。
 */
var OAUTH_VALIDATE_RETRY_DELAYS_MS = [500, 1500];
//@ chunk-aepeg2w5.js:589879-590413 facade-majority
async function resolveLoginOrgPin(scopes) {
  let n = await checkForceLoginPolicyReadable();
  if (n)
    return {
      outcome: "refused",
      rejection: n,
    };
  let forceLoginOrgUUID = getSettingsForSource("policySettings")?.forceLoginOrgUUID;
  if (forceLoginOrgUUID === undefined)
    return {
      outcome: "not_checked",
    };
  if (!shouldUseClaudeAIAuth([...scopes]))
    return {
      outcome: "not_checked",
    };
  let forceLoginOrgRequirement = getForceLoginOrgRequirement(forceLoginOrgUUID, false);
  switch (forceLoginOrgRequirement.kind) {
    case "host_managed":
    case "unix_socket":
    case "auth_disabled":
    case "no_pin":
      return {
        outcome: "not_checked",
      };
    case "empty_pin":
      return {
        outcome: "refused",
        rejection: {
          valid: false,
          reason: "managed_settings_invalid",
          message: EMPTY_FORCE_LOGIN_ORG_MESSAGE,
        },
      };
    case "required":
      return {
        outcome: "required",
        requiredOrgUuids: forceLoginOrgRequirement.requiredOrgUuids,
      };
  }
}
//@ chunk-aepeg2w5.js:590413-590892 facade-majority
async function checkNewLoginTokenOrg(e) {
  let loginOrgPin = await resolveLoginOrgPin(e.scopes);
  if (loginOrgPin.outcome !== "required") return loginOrgPin;
  let { requiredOrgUuids } = loginOrgPin;
  let s = formatRequiredOrgs(requiredOrgUuids);
  let organizationUuid = (await validateOauthToken(e.accessToken, OAUTH_VALIDATE_RETRY_DELAYS_MS))
    ?.organization_uuid;
  if (typeof organizationUuid !== "string" || organizationUuid === "")
    return {
      outcome: "refused",
      rejection: {
        valid: false,
        reason: "org_verify_failed",
        message: orgVerificationFailedMessage(s),
      },
    };
  if (!requiredOrgUuids.includes(organizationUuid))
    return {
      outcome: "refused",
      rejection: {
        valid: false,
        reason: "org_pin_mismatch",
        message: formatWrongOrgMessage(organizationUuid, s),
      },
    };
  return {
    outcome: "permitted",
    verified: {
      accessToken: e.accessToken,
      organizationUuid,
    },
  };
}
//@ chunk-aepeg2w5.js:590892-591151 facade-majority
function orgVerificationFailedMessage(e) {
  return `Unable to verify organization for the current authentication token.
This machine requires ${e} but the token could not be validated.
This may be a network error, or the token may have been revoked.
Try again, or run: claude auth login`;
}
//@ chunk-aepeg2w5.js:591151-591249 facade-majority
function getForcedLoginMethod() {
  if (isGatewayLoginForced()) return "gateway";
  let forceLoginMethod = getInitialSettings_2()?.forceLoginMethod;
  return forceLoginMethod === "gateway" ? undefined : forceLoginMethod;
}
//@ chunk-aepeg2w5.js:591249-591286 facade-majority
function adminPolicyUnreadable() {
  return getFatalAdminPolicyLoadErrors().length > 0;
}
//@ chunk-aepeg2w5.js:591286-591314 facade-majority
function policyUnreadableForEnforcement() {
  return isAdminPolicyUnreadable();
}
//@ chunk-aepeg2w5.js:591314-591461 facade-majority
function validateForceLoginMethod(isClaudeAi) {
  if (isHostManagedProviderAuth() && usableLauncherHostLoginToken() === null) {
    if (getForcedLoginMethod() !== undefined)
      logFeatureSad("auth_force_login_org", "managed_by_host_under_method_pin");
    return {
      valid: true,
    };
  }
  return checkForcedLoginMethod(isClaudeAi);
}
//@ chunk-aepeg2w5.js:591461-591519 facade-majority
function launcherSignInMethodRefusal() {
  let e = checkForcedLoginMethod(true);
  return e.valid ? null : e.message;
}
//@ chunk-aepeg2w5.js:591519-592092 affinity
/**
 * 校验登录方式是否符合 forceLoginMethod：网关登录要求在交互终端 /login；claudeai/console 不符时给出应改用的账号类型（区分托管设置或普通设置）。
 */
function checkForcedLoginMethod(isClaudeAi) {
  let forced = getForcedLoginMethod();
  if (forced === undefined)
    return {
      valid: true,
    };
  if (forced === "gateway")
    return {
      valid: false,
      message:
        "Managed settings on this machine configure a Cloud gateway sign-in; run /login from an interactive terminal to authenticate.",
    };
  if (isClaudeAi === (forced === "claudeai"))
    return {
      valid: true,
    };
  let r =
    getEffectiveSettingSource_2("forceLoginMethod") === "policySettings" ? "managed settings" : "settings";
  return {
    valid: false,
    message:
      forced === "claudeai"
        ? `forceLoginMethod is 'claudeai' in ${r}; log in with a Claude.ai subscription account instead.`
        : `forceLoginMethod is 'console' in ${r}; log in with an Anthropic Console account instead.`,
  };
}
//@ chunk-aepeg2w5.js:592092-592116 affinity
/**
 * GCP 凭据检查超时的错误类型。
 */
class GcpCredentialsTimeoutError extends Error {}
//@ chunk-e6aww6q8.js:2297152-2297165 affinity
/**
 * 并发 401 处理结果缓存的条数上限（1000）。
 */
var MAX_401_HANDLERS = 1000;
//@ chunk-e6aww6q8.js:2297165-2297458 fingerprint = handleOAuth401Error (0.67)
/**
 * 按 key 合并并发的 401 处理，结果缓存（LRU 1000）避免同一令牌重复刷新。
 */
class OAuth401Deduper {
  #e = new LRUCache({
    max: MAX_401_HANDLERS,
  });
  #t = new Map();
  run(e, n) {
    let r = this.#e.get(e);
    if (r !== undefined) return Promise.resolve(r);
    let s = this.#t.get(e);
    if (s !== undefined) return s;
    let h = n()
      .then((y) => {
        if (typeof y === "number" && y > 0) this.#e.set(e, y);
        return y;
      })
      .finally(() => {
        this.#t.delete(e);
      });
    this.#t.set(e, h);
    return h;
  }
}
//@ chunk-e6aww6q8.js:2297458-2297485 placement
var oauth401DedupByHost = new HostScoped(() => new OAuth401Deduper());
//@ chunk-171dhyhe.js:50416-50428 affinity
/**
 * 等待 401 处理完成的超时（5 秒）。
 */
var OAUTH_401_RACE_TIMEOUT_MS = 5000;
//@ chunk-171dhyhe.js:50428-50760 fingerprint = handleOAuth401ErrorImpl (0.484)
async function handleOAuth401ErrorImpl_2(e, t, c) {
  let n;
  if (isStorageV5Enabled() && c !== undefined) n = await getClaudeAIOAuthTokensAsync(c);
  else n = getClaudeAIOAuthTokens();
  if (e === n?.accessToken && Boolean(n?.refreshToken)) {
    await Promise.race([handleOAuth401Error(e, c).catch(() => false), sleep(OAUTH_401_RACE_TIMEOUT_MS, t)]);
    if (t.aborted) return null;
  }
  let winner = await Promise.race([
    getDesignConsentKey(c).catch(() => null),
    sleep(OAUTH_401_RACE_TIMEOUT_MS, t).then(() => null),
  ]);
  return winner?.ok === true && winner.accessToken !== e ? winner.accessToken : null;
}
//@ chunk-cdz6g143.js:407-459 fingerprint = invalidateOAuthCacheIfDiskChanged (0.513)
/**
 * 凭证文件名常量：.credentials.json（明文 OAuth 凭证）与 .device-keys.json（设备密钥）。
 */
var CREDENTIALS_FILE_NAME = ".credentials.json";
var DEVICE_KEYS_FILE_NAME = ".device-keys.json";
//@ chunk-cdz6g143.js:459-519 placement = getProjectDirsUpToHome (1)
/**
 * 设备密钥文件路径 `~/.claude/.device-keys.json`（NFC 规范化）。与 markdown 配置无关，旧版名 getProjectDirsUpToHome 配错。
 */
function getDeviceKeysFilePath() {
  return join(homedir(), ".claude", DEVICE_KEYS_FILE_NAME).normalize("NFC");
}
//@ chunk-30p0tvt0.js:818-918 placement
/**
 * 判断主机策略是否强制使用网关登录（强制登录方式为 gateway 或指定了网关地址）。
 */
function isGatewayLoginForced() {
  let { forceLoginMethod, forceLoginGatewayUrl } = getHostPolicyLoginPins();
  return forceLoginMethod === "gateway" || forceLoginGatewayUrl !== undefined;
}
//@ chunk-3g8vhh6f.js:809-824 fingerprint = isTeamSubscriber (1)
var isTeamSubscriber_2 = "team";
//@ chunk-4pc1m5n9.js:13047-13220 fingerprint = hasAnthropicApiKeyAuth (1)
async function hasAnthropicApiKeyAuth_2(e) {
  let gatewayAuth = getGatewayAuth();
  if (gatewayAuth)
    return computeChecksumFromSettings(
      gatewayAuth,
      await gatewayTrustFor(gatewayAuth, e).catch(() => {
        return;
      }),
    );
  if (
    getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    }).key === null &&
    isProfileRemoteSettingsCredential()
  )
    return getEmail();
  return consentIdentityAsync(e);
}
//@ chunk-4xpk3fhh.js:18749-18830 fingerprint = hasOpusAccess (1)
function hasOpusAccess_2(subscriptionType) {
  return (
    subscriptionType === "team" ||
    subscriptionType === "enterprise" ||
    subscriptionType === "pro" ||
    subscriptionType === "max" ||
    subscriptionType == null
  );
}
//@ chunk-71c4j971.js:14757-14813 fingerprint = getOauthAccountInfo (1)
function getOauthAccountInfo_2() {
  try {
    return getGlobalConfig().oauthAccount;
  } catch {
    return;
  }
}
//@ chunk-dcmhvw5a.js:352457-352629 placement
/**
 * 统计文本的长度与行数（\n、\r、\r\n 都算换行）。
 */
function textLengthAndLines(e) {
  let n = 1;
  for (let j = 0; j < e.length; j++) {
    let code = e.charCodeAt(j);
    if (code === 10) n++;
    else if (code === 13) {
      n++;
      if (e.charCodeAt(j + 1) === 10) j++;
    }
  }
  return {
    length: countUtf16CodePoints(e),
    lineCount: n,
  };
}
//@ chunk-g54kbxqw.js:60108-60183 fingerprint = isManagedOAuthContext (0.881)
function isManagedOAuthContext_2() {
  return process.env.CLAUDE_CODE_ENTRYPOINT === "claude-desktop";
}
export {
  hasOpusAccess_2,
  getSubscriptionType,
  getStoredOAuthSubscriptionType,
  isAnthropicAuthEnabled,
  isOAuthRefreshKnownDeadAsync,
  getAccountInformation,
  isOAuthRefreshKnownDead,
  getOauthAccountInfo,
  getRequestCredentials,
  getApiKeyHelperLastFailure,
  isApiKeyHelperTheActiveCredential,
  shouldUseWIFAuth,
  getAdditionalModelOptionsCache,
  hasBootstrapModelOptions,
  isClaudeAISubscriber,
  isConsumerSubscriber,
  isExtraUsageAllowed,
  getClaudeAIOAuthTokens,
  getUsageCreditsCommand,
  getRateLimitTier,
  getOauthAccountInfo_2,
  hasStoredOAuthToken,
  checkAndRefreshOAuthTokenIfNeeded,
  hostSessionsBearerOffered,
  isWIFDispatchAuth,
  hasUsableClaudeAILogin,
  recoverCloudSessionsBearer,
  hasClaudeAISignInToken,
  credentialIsOwnStoredLogin,
  getClaudeAIOAuthTokenOriginAsync,
  getClaudeAIOAuthTokenOrigin,
  validateForceLoginOrg,
  getStoredOauthAccountInfo,
  isHostManagedProviderAuth,
  isGatewayLoginForced,
  getAuthTokenSource,
  rejudgeHostLaunchedGateway,
  getAnthropicApiKeyWithSourceSafe,
  getClaudeAIOAuthTokensAsync,
  getAuthTokenSourceAsync,
  handleOAuth401ErrorImpl_2,
  getAuthenticatedAccountInfo,
  getRateLimitTier_2,
  sameOwnerAccount,
  canAuthenticateChromeBridge,
  getApiKeyFromApiKeyHelper,
  getAnthropicApiKeyWithSource,
  wasOAuthAccessTokenSavedByThisProcess,
  toAccountInfo,
  getApiKeyFromConfigOrMacOSKeychain,
  describeHowToDisableAuthTokenSource,
  subscribeOAuthCredentialsChangedOnDisk,
  checkOAuthCredentialsChangedOnDisk,
  getConfiguredApiKeyHelper,
  getApiKeyHelperElapsedMs,
  getModelAccessCache,
  getOrgModelDefaultCache,
  isProSubscriber,
  handleOAuth401Error,
  readFreshOAuthAccessToken,
  sdkHostOffersOAuthRefresh,
  isClaudeAISignInToken,
  isClaudeAIOAuthTokenHostInjected,
  validateForceLoginMethod,
  checkNewLoginTokenOrg,
  isFirstPartyManagedOAuthContext,
  effectiveAuthTokenEnv,
  checkAndRefreshOAuthTokenIfNeededWithOutcome,
  isAuthFailureWorthRetrying,
  getAnthropicApiKeySafe,
  noteAuthRefreshStop,
  readFreshOAuthCredentialSnapshot,
  isConsumerPlan,
  getOtelHeadersHelperLastFailure,
  onOtelHeadersHelperFailure,
  hasProfileScope,
  hasStoredOAuthRefreshToken,
  getDefaultAwsProviderChain,
  invalidateDefaultAwsProviderChainDebounced,
  defaultAwsProviderChainResolver,
  prefetchAwsCredentialsAndBedRockInfoIfSafe,
  prefetchGcpCredentialsIfSafe,
  isManagedOAuthContext_2,
  adminPolicyUnreadable,
  hasExistingSignIn,
  getUnapprovedCustomApiKey,
  resetAuthFailureTracking,
  TOKEN_REFRESH_OUTCOMES_BEFORE_POST,
  hasLoginManagedKey,
  waitForOAuthRefreshLocksReleased,
  clearOAuthTokenCache,
  launcherSignInMethodRefusal,
  startupReadsStoredLogin,
  getColdApiKeyHelperRun,
  CREDENTIALS_FILE_NAME,
  DEVICE_KEYS_FILE_NAME,
  getAnthropicApiKey,
  hostOrgSignInBearer,
  getAnthropicApiKeyFingerprint,
  isProfileRemoteSettingsCredential,
  hasAnthropicApiKeyAuth_2,
  injectedOAuthTokenRecovery,
  clearOAuthTokenMemos,
  storeRecheckNeeded,
  getApiKeyPrefixBucket,
  managedConfigNotAttemptedInput,
  isMaxSubscriber,
  is1PApiCustomer,
  isHostManagedAnthropicApiBearer,
  storedPlanVerifiedAtOf,
  readStoredLoginOrganizationAfresh,
  clearApiKeyHelperCache,
  clearAwsCredentialsCache,
  resetAwsAuthRefreshCooldown,
  clearGcpCredentialsCache,
  getConfiguredVertexProjectId,
  refreshGcpCredentialsIfNeeded,
  claudeAISignInTokenInForce,
  hasOAuthScope,
  isClaudeAISubscriberAsync,
  getClaudeAIOAuthTokenFingerprint,
  resetEnvDerivedAuthCaches,
  onEnvApiKeyApprovalFlipped,
  isTeamSubscriber_2,
  getForcedLoginMethod,
  providerAllowlistRefusal,
  resolveLoginOrgPin,
  isOAuthBearerSource,
  isUsing3PServices,
  getSubscriptionName,
  getTurnOnUsageCreditsStep,
  isAwsAuthRefreshFromProjectSettings,
  getConfiguredAwsAuthRefresh,
  isGcpAuthRefreshFromProjectSettings,
  getConfiguredGcpAuthRefresh,
  HostManagedNoCredsError,
  getDeviceKeysFilePath,
  otelHeadersHelperFailureKind,
  getConfiguredOtelHeadersHelper,
  getOtelHeadersFromHelper,
  prefetchOtelHeadersFromHelper,
  hostManagedAwsSdkCredentials,
  refreshAndGetAwsCredentials,
  getApiKeySourceSafe,
  hasAnthropicApiKey,
  primeStoredLoginCopy,
  restoreGatewayAuth,
  primeStoredLogin,
  saveApiKey,
  isUnmarkedStoredPlan,
  isProvisionalProfilePlan,
  isProfilePlanDowngrade,
  getStoredOAuthTierVerifiedAt,
  backfillStoredOAuthTier,
  gcpSignInFailures,
  awsSignInFailures,
  getOAuthAccountOnHold,
  clearAwsHelperCredentialsCache,
  markGcpCredentialsRejected,
  isEnterpriseSubscriber,
  textLengthAndLines,
  isApiKeyHelperSafeToInvoke,
  hasAnthropicDirectApiKey,
  isTeamPremiumSubscriber,
  isEnterprisePAYGSubscriber,
  isUsableClaudeAILoginRecord,
  beginOAuthRefreshLockHold,
  ownStoredLoginPlanAttributes,
  hostManagedNoCredsError,
  getStoredOAuthTokenExpiresAt,
  OAUTH_REFRESH_EXIT_WAIT_CAP_MS,
  waitForInFlightOAuthRefresh,
  hasAnthropicApiKeyAuth,
  oauth401DedupByHost,
  removeApiKey,
  prefetchApiKeyFromApiKeyHelperIfSafe,
  isLoginStashedInTokenSlot,
  isManagedOAuthContext,
  getRateLimitTierOverride,
  hasClaudeAiBillingRole,
  getSeatTier,
  isGatewayAuthRestoredFromStore,
  withOAuthRefreshLock,
  markRefreshTokenDeadAfterInvalidGrant,
  saveRefreshedOAuthTokensRespectingLock,
  OAuthRefreshLockContendedError,
  policyUnreadableForEnforcement,
  refreshAwsAuth,
  AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
  getAnthropicApiKeyWithSourceAsyncSafe,
  isProfileAuthShadowed,
  isTeamSubscriber,
  isBareModeAuthRestricted,
  mayHaveProfileScope,
  saveOAuthTokensIfNeeded,
  OAUTH_TOKEN_SAVE_FAILED_WARNING,
  storedOAuthTokenEquals,
};
