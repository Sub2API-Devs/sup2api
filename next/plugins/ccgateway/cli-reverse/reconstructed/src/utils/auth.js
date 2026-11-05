/**
 * utils/auth.ts
 *
 * 认证核心：API key / Bearer 令牌来源判定、apiKeyHelper 执行与缓存、OAuth 令牌读取/刷新/401 处理、AWS/GCP 凭证刷新、订阅类型与权益判断、组织 pin 校验、otelHeadersHelper。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/auth.ts
 * pieces: chunk-5qsfbz2c.js (1), chunk-5xgkngpb.js (5), chunk-c4qa5qn0.js (2), chunk-exfmq47h.js (368), chunk-h3xdf7nq.js (1), chunk-ma8ytfb3.js (2), chunk-vgaj51qh.js (1), chunk-z20c443b.js (1)
 * attribution: fingerprint 20, affinity 5, placement 8, layout 103, facade-majority 244, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readFile, stat, realpath } from "fs/promises";
import { join, dirname, resolve } from "path";
import { createHash } from "crypto";
import { exec, execFile } from "child_process";
import { homedir } from "os";
import { countUtf16CodePoints, findUnsafeChar, describeUnsafeValue } from "./settings/managedSettingsKeys.js";
import {
  getHostPolicyLoginPins,
  getMachineAdminDocumentTier,
  getSettings_DEPRECATED,
  getSettingsForSource,
  getSettingsForSourceTightenOnly,
  getSettingsFilePathForSource,
  getEffectiveSettingSource,
  isAdminPolicyUnreadable,
  adminPolicyLoadFailureRefusesLaunch,
  getFatalAdminPolicyLoadErrors,
  getInitialSettings,
} from "./settings/settings.js";
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
import { __toESM } from "../../runtime/bun-runtime.js";
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
  dropAuthenticatedAccountForNewToken,
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
  isPlausibleRefreshTokenExpiry,
} from "./auth/managedHelpers.js";
import {
  shouldUseClaudeAIAuth,
  isRefreshTokenExpiredError,
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
import { clearFileReferenceHintLatches } from "../services/api/fileReferenceCalls.js";
import { withoutSSHTunnelVars, withoutHostManagedProviderVars } from "./managedEnv.js";
import { normalizeUuidOrNull } from "./agentId.js";
import { lock } from "./lockfile.js";
import {
  getFsSettler,
  writeLockOwnerRecord,
  removeOwnLockOwnerRecord,
  checkLockStillOwned,
} from "./auth/oauthRefreshLock.js";
import {
  exitWaitsForOAuthRefreshUntilDeadline,
  registerOAuthRefreshExitWait,
  msSinceOAuthRefreshExitBegan,
} from "./auth/oauthRefreshExitWait.js";
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
import {
  isPlanDisplayName,
  getOauthTokenOrgUuid,
  validateOauthToken,
} from "../services/oauth/validateOauthToken.js";
import { stripControlChars } from "./settings/writeQueues.js";
import { getHostAuthEnvVar } from "./managedEnvConstants.js";
import { SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE } from "../services/sessionStatus/sessionStateClassifier.js";
import { SUBSCRIPTION_ACCESS_DISABLED_MESSAGE } from "../services/api/errors.js";
import { LRUCache } from "../../vendor/lru-cache/dist/esm/index.min.js";
import { getDesignConsentKey } from "../services/design/designApi.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5qsfbz2c.js:809-824 fingerprint (2.1.88 match: isTeamSubscriber, 1)
/**
 * 团队记忆的目录名 "team"：记忆文件路径 …/memory/team/<file> 里以 n[2]===aDn 判定属于团队记忆（另一支是个人记忆）；导出为 aDn。
 */
var TEAM_MEMORY_SCOPE = "team";
//@ chunk-z20c443b.js:350437-350609 placement
/**
 * 统计文本的长度与行数（\n、\r、\r\n 都算换行）。
 */
function textLengthAndLines(text) {
  let lineCount = 1;
  for (let j = 0; j < text.length; j++) {
    let code = text.charCodeAt(j);
    if (code === 10) lineCount++;
    else if (code === 13) {
      lineCount++;
      if (text.charCodeAt(j + 1) === 10) j++;
    }
  }
  return {
    length: countUtf16CodePoints(text),
    lineCount,
  };
}
//@ chunk-vgaj51qh.js:818-918 placement
/**
 * 判断主机策略是否强制使用网关登录（强制登录方式为 gateway 或指定了网关地址）。
 */
function isGatewayLoginForced() {
  let { forceLoginMethod, forceLoginGatewayUrl } = getHostPolicyLoginPins();
  return forceLoginMethod === "gateway" || forceLoginGatewayUrl !== undefined;
}
//@ chunk-exfmq47h.js:298331-298402 fingerprint (2.1.88 match: getRateLimitTier, 1)
/**
 * 环境覆盖的限流档位；本构建中覆盖开关被编译成恒为 null。
 */
function getRateLimitTier_2() {
  let oauthTokens = getMockRateLimitState();
  oauthTokens.enabled;
  return null;
  return oauthTokens.rateLimitTier;
}
//@ chunk-exfmq47h.js:298402-298479 fingerprint (2.1.88 match: getSubscriptionType, 1)
/**
 * 环境覆盖的订阅类型；本构建中恒为 null。
 */
function hasSubscriptionTypeOverride() {
  let oauthTokens = getMockRateLimitState();
  oauthTokens.enabled;
  return null;
  return oauthTokens.subscriptionType || MAX;
}
//@ chunk-exfmq47h.js:298479-298552 layout (2.1.88 match: getSubscriptionType, 1)
function getStoredSubscriptionType() {
  let oauthTokens = getMockRateLimitState();
  return oauthTokens.enabled && oauthTokens.subscriptionType !== null && false;
}
//@ chunk-exfmq47h.js:298552-298579 placement
function getRateLimitTierOverride() {
  return null;
}
//@ chunk-exfmq47h.js:516557-516589 affinity
/**
 * 登录可用状态的缓存时长（5 分钟）。
 */
var OAUTH_READY_CACHE_MS = 300000;
var JWT_EXPIRY_SKEW_MS = 30000;
var MAX_HELPER_STDERR_CHARS = 16384;
//@ chunk-exfmq47h.js:516589-516638 facade-majority
function isManagedOAuthContext() {
  return env.CLAUDE_CODE_REMOTE || isHostEntrypoint();
}
//@ chunk-exfmq47h.js:516638-516704 facade-majority (2.1.88 match: withoutHostManagedProviderVars, 1)
function isHostManagedProviderAuth() {
  return env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST || isLauncherStartedProcess();
}
//@ chunk-exfmq47h.js:516704-516839 facade-majority (2.1.88 match: getBridgeBaseUrl, 0.655)
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
//@ chunk-exfmq47h.js:516839-516913 facade-majority
/**
 * 带 --host-auth-is-org-sign-in 且有桥基础地址时，取宿主下发的组织登录凭证。
 */
function hostOrgSignInBearer() {
  return eagerHasCliFlag("--host-auth-is-org-sign-in") && isHostManagedAnthropicApiBearer()
    ? effectiveAuthTokenEnv()
    : undefined;
}
//@ chunk-exfmq47h.js:516913-516951 layout
/**
 * 是否使用宿主托管、HTTP MCP 或会话提供的认证（这类情况下不走本地登录流程）。
 */
function usesHostProvidedAuth() {
  return isHostManagedProviderAuth() || isHttpMcpServeInvocation() || usesSessionAccessToken();
}
//@ chunk-exfmq47h.js:516951-516972 facade-majority
let HostManagedNoCredsError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (./errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:516951", () => {
  HostManagedNoCredsError = class HostManagedNoCredsError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {};
});
//@ chunk-exfmq47h.js:516972-517249 facade-majority
function hostManagedNoCredsError(
  providerLabel,
  detail = "The app may have quit or its credential file is stale \u2014 restart the desktop app.",
) {
  return new HostManagedNoCredsError(
    `${providerLabel} credentials are managed by the desktop app, but none are available. ${detail}`,
    "host-managed provider credentials unavailable \u2014 restart desktop app",
  );
}
//@ chunk-exfmq47h.js:517249-517676 facade-majority
function hostManagedAwsProviderChain(providerLabel) {
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
      let { fromIni } =
        await import("../../vendor/@aws-sdk/credential-providers/dist-cjs/createCredentialChain.lazy.js");
      return fromIni({
        ...(profile && {
          profile,
        }),
        configFilepath: configFile ?? credsFile,
        filepath: credsFile ?? configFile,
        ignoreCache: true,
      });
    }
    throw hostManagedNoCredsError(providerLabel, BACKGROUND_UNSUPPORTED_CREDENTIAL_MSG);
  };
}
//@ chunk-exfmq47h.js:517676-517915 layout
var BACKGROUND_UNSUPPORTED_CREDENTIAL_MSG =
  "Background agents and teammates are not supported for this credential kind. Run this from the main session, or switch the desktop app to a profile-based or API-key credential. If this is the main session, restart the desktop app.";
//@ chunk-exfmq47h.js:517915-518100 layout
function getAwsEnvCredentials() {
  return {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    profile: env.AWS_PROFILE,
    configFile: env.AWS_CONFIG_FILE,
    credsFile: env.AWS_SHARED_CREDENTIALS_FILE,
  };
}
//@ chunk-exfmq47h.js:518100-518208 layout
function hasAwsEnvCredentials() {
  let { accessKeyId, secretAccessKey, configFile, credsFile } = getAwsEnvCredentials();
  return Boolean((accessKeyId && secretAccessKey) || configFile || credsFile);
}
//@ chunk-exfmq47h.js:518208-518297 layout
/**
 * 存储的访问令牌结构（accessToken 与 expiresAt）。
 */
var storedAccessTokenSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var AWS_SSO_PROFILE_RE;
var MAX_AWS_CHAIN_CACHE_ENTRIES;
deferInit("chunk-exfmq47h.js:518208", () => {
  storedAccessTokenSchema = DoctorLazy(() =>
    create({
      accessToken: create_2().min(1),
      expiresAt: create_2(),
    }),
  );
  AWS_SSO_PROFILE_RE = /^[a-z0-9-]{1,32}$/;
  MAX_AWS_CHAIN_CACHE_ENTRIES = 128;
});
//@ chunk-exfmq47h.js:518297-520376 layout
/**
 * 按宿主缓存的 AWS 凭据解析器：ssoProfile 从 AWS 配置/凭据文件解析出纯 SSO 角色配置（排除静态密钥、credential_process、角色链等）；ssoRole 用 SSO 缓存令牌换取角色临时凭据（按过期时间缓存）；helper 通过凭据助手解析；defaultChain 为默认链解析器的有界缓存。
 */
class AwsCredentialMemos {
  ssoProfile = memoizeWithTTL(async (configFile, credsFile, profile) => {
    let { loadSharedConfigFiles } =
      await import("../../vendor/@smithy/shared-ini-file-loader/default.js").then((sdkModule) =>
        __toESM(sdkModule.default, 1),
      );
    let { configFile: configFile_2, credentialsFile } = await loadSharedConfigFiles({
      configFilepath: configFile,
      filepath: credsFile ?? configFile,
      ignoreCache: true,
    });
    let configProfile = configFile_2[profile ?? "default"];
    let credsProfile = credentialsFile[profile ?? "default"];
    let merged = {
      ...configProfile,
      ...credsProfile,
    };
    let { sso_account_id: ssoAccountId, sso_role_name: ssoRoleName } = merged;
    if (!configProfile || !ssoAccountId || !ssoRoleName) return null;
    if (
      (merged.aws_access_key_id && merged.aws_secret_access_key) ||
      merged.credential_process ||
      merged.role_arn ||
      merged.source_profile ||
      merged.credential_source ||
      merged.web_identity_token_file
    )
      return null;
    let ssoSessionEntry = merged.sso_session ? configFile_2[`sso-session.${merged.sso_session}`] : merged;
    let ssoStartUrl = ssoSessionEntry?.sso_start_url;
    let ssoRegion = ssoSessionEntry?.sso_region;
    if (!ssoStartUrl || !ssoRegion || !AWS_SSO_PROFILE_RE.test(ssoRegion)) return null;
    if (
      merged.sso_session &&
      ((merged.sso_start_url && merged.sso_start_url !== ssoStartUrl) ||
        (merged.sso_region && merged.sso_region !== ssoRegion))
    )
      return null;
    return {
      cacheId: merged.sso_session ?? ssoStartUrl,
      accountId: ssoAccountId,
      roleName: ssoRoleName,
      region: ssoRegion,
    };
  });
  ssoRole = memoizeWithTTL(
    async (cachePath, accountId, roleName, region) => {
      let cacheText;
      try {
        cacheText = jsonParse(await readFile(cachePath, "utf-8"));
      } catch {
        return null;
      }
      let parseResult = storedAccessTokenSchema().safeParse(cacheText);
      if (!parseResult.success) return null;
      let timestamp = Date.parse(parseResult.data.expiresAt);
      if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return null;
      let [{ SSOClient, GetRoleCredentialsCommand }, awsProxyRequestHandler] = await Promise.all([
        import("../../vendor/@aws-sdk/client-sso/dist-cjs/GetRoleCredentialsCommand.lazy.js"),
        getAWSProxyRequestHandler({
          url: `https://portal.sso.${region}.amazonaws.com`,
          requestTimeoutMs: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
        }),
      ]);
      let client = new SSOClient({
        region,
        requestHandler:
          awsProxyRequestHandler ??
          new smithyFetchHttpHandlerModule.FetchHttpHandler({
            requestTimeout: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
          }),
      });
      let { roleCredentials } = await resolveWithStallGuard(
        client.send(
          new GetRoleCredentialsCommand({
            accessToken: parseResult.data.accessToken,
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
    (credentials) => computeAwsCredsCacheTtl(credentials?.expiration?.getTime()),
    (entry, nowMs) => {
      if (entry === null) return false;
      if (entry.expiration === undefined) return true;
      let time = entry.expiration.getTime();
      if (time > Date.now() + AWS_CHAIN_REQUEST_TIMEOUT_MS) return true;
      return nowMs >= time - AWS_CHAIN_REQUEST_TIMEOUT_MS && time > Date.now();
    },
  );
  helper = memoizeWithTTL(
    () => resolveAwsCredentialsViaHelpers(this),
    (credentials) => computeAwsCredsCacheTtl(credentials?.expiration),
  );
  defaultChain;
  chainEvictionAt = new Map();
  constructor() {
    let cache = new Map();
    function resolveCached(context) {
      let key = awsChainCacheKey(context);
      let cached = cache.get(key);
      if (cached) return cached;
      let awsDefaultChainResolver = createAwsDefaultChainResolver(context);
      if (cache.size >= MAX_AWS_CHAIN_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
      cache.set(key, awsDefaultChainResolver);
      awsDefaultChainResolver.catch(() => {
        if (cache.get(key) === awsDefaultChainResolver) cache.delete(key);
      });
      return awsDefaultChainResolver;
    }
    resolveCached.cache = cache;
    this.defaultChain = resolveCached;
  }
}
//@ chunk-exfmq47h.js:520376-520402 facade-majority
var awsCredentialMemos; // deferred: uses AwsCredentialMemos of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:520376", () => {
  awsCredentialMemos = new HostScoped(() => new AwsCredentialMemos());
});
//@ chunk-exfmq47h.js:520402-520782 layout
/**
 * 用宿主固定的缓存解析 AWS SSO 凭据：读取配置找到 SSO 会话，按 sso-session/start_url 的 sha1 定位缓存令牌文件并换取角色凭据；失败时记调试日志并返回 null（回退 fromIni）。
 */
async function resolveSsoCredentials(configFile, credsFile, profile) {
  let memos = awsCredentialMemos.of(getRootSession().host);
  try {
    let ssoProfile = await memos.ssoProfile(configFile, credsFile, profile);
    if (!ssoProfile) return null;
    let cachePath = join(
      dirname(configFile),
      "sso",
      "cache",
      `${createHash("sha1").update(ssoProfile.cacheId).digest("hex")}.json`,
    );
    return await memos.ssoRole(cachePath, ssoProfile.accountId, ssoProfile.roleName, ssoProfile.region);
  } catch (error) {
    logForDebugging(
      `[API:auth] host-pinned SSO leg failed (${error instanceof Error ? error.name : "unknown"}) \u2014 falling back to fromIni`,
    );
    return null;
  }
}
//@ chunk-exfmq47h.js:520782-520905 facade-majority
function hostManagedAwsSdkCredentials(providerLabel) {
  if (!hasAwsEnvCredentials())
    throw hostManagedNoCredsError(providerLabel, BACKGROUND_UNSUPPORTED_CREDENTIAL_MSG);
  let providerChainResolver = hostManagedAwsProviderChain(providerLabel);
  return {
    providerChainResolver,
    credentials: async (credentials) => (await providerChainResolver())(credentials),
  };
}
//@ chunk-exfmq47h.js:520905-521022 facade-majority
function isFirstPartyManagedOAuthContext() {
  return (
    isManagedOAuthContext() &&
    !env.CLAUDE_CODE_HOST_AUTH_ENV_VAR &&
    !isLauncherStartedProcess() &&
    env.CLAUDE_CODE_ENTRYPOINT !== "claude-desktop-3p"
  );
}
//@ chunk-exfmq47h.js:521022-521092 layout
/**
 * 记录 WIF 认证的两类调试提示是否已输出。
 */
class WifAuthDebugNoticeState {
  implicitProfileSkippedLogged = false;
  profileAuthSelectedLogged = false;
}
//@ chunk-exfmq47h.js:521092-521118 facade-majority
var wifAuthDebugNotices; // deferred: uses WifAuthDebugNoticeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:521092", () => {
  wifAuthDebugNotices = new HostScoped(() => new WifAuthDebugNoticeState());
});
//@ chunk-exfmq47h.js:521118-521487 layout
/**
 * 同时存在 Anthropic profile 与 claude.ai 登录时提示使用 claude.ai 登录（只提示并打点一次）。
 */
function logImplicitProfileSkipped(state) {
  if (state.implicitProfileSkippedLogged) return;
  logForDebugging(
    `An Anthropic profile (~/.config/anthropic) is configured, but a claude.ai login exists \u2014 using the claude.ai login. Set ANTHROPIC_PROFILE=<name> to use the profile instead.${""}`,
    {
      level: "warn",
    },
  );
  queueMicrotask(() => logEvent("tengu_wif_implicit_profile_skipped_stored_login", {}));
  state.implicitProfileSkippedLogged = true;
}
//@ chunk-exfmq47h.js:521487-521774 layout
function logProfileAuthSelected(state) {
  if (state.profileAuthSelectedLogged) return;
  let precedenceSource = getWIFPrecedenceSource() ?? "profile";
  logForDebugging(
    `Using Anthropic profile auth (${precedenceSource}); ${wouldWIFProfileYieldToClaudeAILogin() ? "a claude.ai login (/login) would take precedence over it" : "this takes precedence over any stored claude.ai login"}`,
    {
      level: "info",
    },
  );
  state.profileAuthSelectedLogged = true;
}
//@ chunk-exfmq47h.js:521774-521946 facade-majority
function isProfileAuthShadowed(options = {}) {
  return Boolean(
    isBareModeAuthRestricted() ||
    env.ANTHROPIC_UNIX_SOCKET ||
    isManagedOAuthContext() ||
    usesHostProvidedAuth() ||
    env.ANTHROPIC_AUTH_TOKEN ||
    env.CLAUDE_CODE_OAUTH_TOKEN ||
    getOAuthTokenFromFileDescriptor() ||
    (options.skipApiKeyHelper ? false : getConfiguredApiKeyHelper()) ||
    !isFirstPartyProvider(),
  );
}
//@ chunk-exfmq47h.js:521946-522151 facade-majority
function shouldUseWIFAuth(options = {}) {
  if (!isWIFActive()) return false;
  if (isProfileAuthShadowed(options)) return false;
  let debugState = options.skipApiKeyHelper ? undefined : wifAuthDebugNotices.of(getRootSession().host);
  if (getWIFPrecedenceSource() === "profile-implicit") {
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    if (isUsableClaudeAILoginRecord(claudeAIOAuthTokens) && wouldWIFProfileYieldToClaudeAILogin()) {
      if (debugState) logImplicitProfileSkipped(debugState);
      return false;
    }
  }
  if (debugState) logProfileAuthSelected(debugState);
  return true;
}
//@ chunk-exfmq47h.js:522151-522191 facade-majority
function isWIFDispatchAuth() {
  return getAnthropicApiKey() === null && shouldUseWIFAuth();
}
//@ chunk-exfmq47h.js:522191-522335 facade-majority
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
//@ chunk-exfmq47h.js:522335-522401 facade-majority
var SDK_OAUTH_REFRESH_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:522335", () => {
  SDK_OAUTH_REFRESH_ENTRYPOINTS = new Set(["claude-desktop", "local-agent", "claude-vscode"]);
});
//@ chunk-exfmq47h.js:522401-522479 layout
/**
 * 需要时校验登录网关是否是本机托管设置指定的组织网关。
 */
async function verifyGatewayHostIfNeeded() {
  let gatewayAuth = getGatewayAuth();
  if (!gatewayAuth || !isProviderManagedByHost() || gatewayAuth.hostVerdict) return;
  await verifyGatewayHost_2(gatewayAuth);
}
//@ chunk-exfmq47h.js:522479-522549 facade-majority
async function rejudgeHostLaunchedGateway() {
  let gatewayAuth = getGatewayAuth();
  if (!gatewayAuth?.hostVerdict) return;
  await verifyGatewayHost_2(gatewayAuth);
}
//@ chunk-exfmq47h.js:522549-522561 layout
/**
 * 探测网关托管设置的超时（3 秒）。
 */
var GATEWAY_PROBE_TIMEOUT_MS = 3000;
//@ chunk-exfmq47h.js:522561-522999 layout
/**
 * 校验登录网关是否为本机托管设置指定的组织网关；未通过时探测网关的托管设置（是否有 Code 标签页规则或未应答），把判定写回当前网关认证状态。
 */
async function verifyGatewayHost_2(gatewayAuth) {
  let authorization = `Bearer ${gatewayAuth.jwt}`;
  let hostPolicyLoginPins = getHostPolicyLoginPins();
  let verdict = await hostLaunchedSettingsSourceVerdict(gatewayAuth.url, hostPolicyLoginPins, authorization);
  if ("verified" in verdict && !verdict.verified) {
    let forceLoginGatewayUrl =
      hostPolicyLoginPins.forceLoginGatewayUrl ?? getMachineAdminDocumentTier()?.forceLoginGatewayUrl;
    let probeResult =
      isManagedGatewayOrigin(gatewayAuth.url) || isManagedGatewayOrigin(forceLoginGatewayUrl)
        ? undefined
        : await probeGatewayManagedSettings(gatewayAuth.url, authorization, GATEWAY_PROBE_TIMEOUT_MS);
    let forceLoginDiffers =
      forceLoginGatewayUrl !== undefined &&
      compareGatewayUrls(forceLoginGatewayUrl, new URL(gatewayAuth.url)) !== "same";
    if (typeof probeResult === "object")
      verdict = {
        ...verdict,
        codeTabRulesUnanswered: probeResult.unanswered,
      };
    else if (probeResult || (probeResult === false && !forceLoginDiffers))
      verdict = {
        ...verdict,
        hasCodeTabRules: probeResult,
      };
  }
  let gatewayAuth_2 = getGatewayAuth();
  if (gatewayAuth_2 !== null && gatewayAuth_2.url === gatewayAuth.url)
    setGatewayAuth({
      ...gatewayAuth_2,
      hostVerdict: verdict,
    });
}
//@ chunk-exfmq47h.js:522999-523078 layout
/**
 * URL 是否指向本机托管设置指定的网关。
 */
function isManagedGatewayOrigin(urlValue) {
  try {
    return urlValue !== undefined && isVouchedHostSetMember(hostOf(new URL(normalizeGatewayUrl(urlValue))));
  } catch {
    return false;
  }
}
//@ chunk-exfmq47h.js:523078-523188 layout
var GATEWAY_NOT_NAMED_REASON =
  "this machine's managed settings do not name it as the organization's gateway (forceLoginGatewayUrl).";
//@ chunk-exfmq47h.js:523188-523827 facade-majority
async function hostLaunchedSettingsSourceVerdict(gatewayUrl, hostPolicyLoginPins, signal) {
  let parsedGatewayUrl = new URL(gatewayUrl);
  if (/[?#]/.test(parsedGatewayUrl.href) || parsedGatewayUrl.username || parsedGatewayUrl.password)
    return {
      verified: false,
      reason:
        "the gateway address it was started with carries a query, fragment or user name, which no gateway address has.",
    };
  let isVouched = isVouchedHostSetMember(hostOf(parsedGatewayUrl));
  let gatewayInternalNetworks = hostPolicyLoginPins.gatewayInternalNetworks ?? [];
  let forceLoginGatewayUrl = hostPolicyLoginPins.forceLoginGatewayUrl;
  let mismatchReason;
  if (forceLoginGatewayUrl === undefined) mismatchReason = isVouched ? undefined : GATEWAY_NOT_NAMED_REASON;
  else {
    let comparison = compareGatewayUrls(forceLoginGatewayUrl, parsedGatewayUrl);
    if (typeof comparison === "object") {
      if (comparison.voucher === undefined)
        return {
          verified: false,
          reason: comparison.reason,
        };
      return verifyGatewayHost(gatewayUrl, [], undefined, comparison.reason, comparison.voucher);
    }
    mismatchReason =
      comparison === "same" || isVouched
        ? undefined
        : `this machine's managed settings name ${parsedGatewayUrl.origin} as the organization's gateway, not ${parsedGatewayUrl.origin}${trimTrailingSlashes(parsedGatewayUrl)}.`;
  }
  return verifyGatewayHost(
    gatewayUrl,
    mismatchReason === undefined ? gatewayInternalNetworks : [],
    signal,
    mismatchReason,
  );
}
//@ chunk-exfmq47h.js:523827-524371 layout
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
  let configuredPath = trimTrailingSlashes(configured);
  let actualPath = trimTrailingSlashes(actualUrl);
  let pathMatches = configuredPath === "" || configuredPath === actualPath;
  if (configured.origin === actualUrl.origin && pathMatches)
    return configuredPath === actualPath ? "same" : "origin";
  let reason = `this machine's managed settings name ${configured.origin}${configuredPath} as the organization's gateway, not ${actualUrl.origin}${actualPath}.`;
  return pathMatches &&
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
//@ chunk-exfmq47h.js:524371-524423 layout
/**
 * 去掉 URL 路径末尾的斜杠。
 */
function trimTrailingSlashes(url) {
  return url.pathname.replace(/\/+$/, "");
}
//@ chunk-exfmq47h.js:524423-524529 facade-majority
function sdkHostOffersOAuthRefresh() {
  return (
    Boolean(env.CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH) &&
    SDK_OAUTH_REFRESH_ENTRYPOINTS.has(env.CLAUDE_CODE_ENTRYPOINT ?? "")
  );
}
//@ chunk-exfmq47h.js:524529-524619 facade-majority
function hostSessionsBearerOffered() {
  return (
    Boolean(env.CLAUDE_CODE_SDK_HAS_SESSIONS_OAUTH_REFRESH) &&
    sdkHostOffersOAuthRefresh() &&
    !isLauncherStartedProcess()
  );
}
//@ chunk-exfmq47h.js:524619-524695 facade-majority
function isClaudeAISignInToken(accessToken) {
  return accessToken === env.CLAUDE_CODE_OAUTH_TOKEN || accessToken === getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-exfmq47h.js:524695-524762 facade-majority
function claudeAISignInTokenInForce() {
  return env.CLAUDE_CODE_OAUTH_TOKEN ?? getClaudeAIOAuthTokens()?.accessToken;
}
//@ chunk-exfmq47h.js:524762-524847 facade-majority
function hasClaudeAISignInToken() {
  return Boolean(env.CLAUDE_CODE_OAUTH_TOKEN) || getClaudeAIOAuthTokens()?.accessToken !== undefined;
}
//@ chunk-exfmq47h.js:524847-524891 facade-majority
var gatewayAuthProvenance; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:524847", () => {
  gatewayAuthProvenance = new HostScoped(() => ({
    restoredFromStore: false,
  }));
});
//@ chunk-exfmq47h.js:524891-524948 facade-majority
function isGatewayAuthRestoredFromStore() {
  return gatewayAuthProvenance.of(getRootSession().host).restoredFromStore;
}
//@ chunk-exfmq47h.js:524948-526907 facade-majority
async function restoreGatewayAuth(session, shouldWarn = () => !getIsNonInteractiveSession()) {
  let provenance = gatewayAuthProvenance.of(getRootSession().host);
  provenance.restoredFromStore = false;
  if (readGatewayEnvConfig()) {
    await verifyGatewayHostIfNeeded();
    return;
  }
  if (env.CLAUDE_CODE_USE_GATEWAY && !env.ANTHROPIC_AUTH_TOKEN && hasBgAuthSnapshotPending()) {
    let snapshotResult = await consumeBgAuthSnapshot();
    if (readGatewayEnvConfig()) {
      await verifyGatewayHostIfNeeded();
      return;
    }
    if (hasBgAuthSnapshotPending() && isPermissionDeniedCode(snapshotResult))
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
    let async = await getSecureStorage().readAsync(session);
    let enterpriseGateway = async?.enterpriseGateway;
    if (!enterpriseGateway) return;
    let gatewayHost = hostOf(new URL(enterpriseGateway.url));
    let pinnedFingerprint = async?.gatewayTrust?.[gatewayHost];
    if (!pinnedFingerprint) {
      if (shouldWarn())
        process.stderr
          .write(`Cloud gateway ${gatewayHost} is not trusted on this machine \u2014 run /login to reconnect.
`);
      return;
    }
    if (enterpriseGateway.expiresAt <= Date.now() && !enterpriseGateway.idpRefreshToken) {
      if (shouldWarn())
        process.stderr.write(
          GATEWAY_SESSION_EXPIRED_MESSAGE +
            `
`,
        );
      return;
    }
    let savedAllowlistHash = async?.gatewayAllowlistEntries?.[gatewayHost];
    if (
      savedAllowlistHash !== undefined &&
      !activeAllowlistEntries().some(
        (allowlistEntry) => allowlistFactsHash(allowlistEntry) === savedAllowlistHash,
      )
    ) {
      let endedMessage = `Not connected to Cloud gateway ${gatewayHost}: the saved sign-in has ended. Run /login. If that is refused, update Claude Code, or ask your administrator which version to use.`;
      if (shouldWarn())
        process.stderr.write(
          endedMessage +
            `
`,
        );
      logForDebugging(endedMessage, {
        level: "warn",
      });
      return;
    }
    if (isGatewayLoginRequired(enterpriseGateway.url)) {
      let wrongGatewayMessage = `Not connected to Cloud gateway ${gatewayHost}: your organization's settings name another gateway or none.`;
      if (shouldWarn())
        process.stderr.write(
          wrongGatewayMessage +
            `
`,
        );
      logForDebugging(wrongGatewayMessage, {
        level: "warn",
      });
      return;
    }
    if (enterpriseGateway.vouchedAtLogin === true || isFigJwt(enterpriseGateway.jwt))
      holdGatewayHostStrict(gatewayHost);
    try {
      let gatewayCertificate = await fetchGatewayCertificate(enterpriseGateway.url, 3000);
      if (gatewayCertificate.fingerprint !== pinnedFingerprint) {
        if (shouldWarn())
          process.stderr
            .write(`Cloud gateway ${gatewayHost} TLS certificate changed since you connected \u2014 run /login to verify and reconnect.
`);
        logForDebugging(
          `[gateway] TLS fingerprint mismatch on restore for ${gatewayHost}: pinned ${pinnedFingerprint}, live ${gatewayCertificate.fingerprint}`,
          {
            level: "warn",
          },
        );
        return;
      }
    } catch (error) {
      logForDebugging(
        `[gateway] TLS fingerprint probe failed on restore for ${gatewayHost} (${errorMessage(error)}); proceeding without re-verify`,
      );
    }
    setGatewayAuth(enterpriseGateway);
    provenance.restoredFromStore = true;
  } catch (error) {
    logError(error);
  }
}
//@ chunk-exfmq47h.js:526907-526943 facade-majority
var bareSignInRefusals; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:526907", () => {
  bareSignInRefusals = new HostScoped(() => ({
    isRefused: false,
  }));
});
//@ chunk-exfmq47h.js:526943-526984 facade-majority
function isBareModeAuthRestricted() {
  if (!isBareMode()) return false;
  return true;
}
//@ chunk-exfmq47h.js:526984-527403 facade-majority (2.1.88 match: isAnthropicAuthEnabled, 0.662)
/**
 * 是否走 Anthropic 第一方认证（Claude.ai OAuth）。--bare 且仅 bare 凭证、第三方提供方、profile（WIF）时为 false；存在 ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY / apiKeyHelper / API key FD（且非远程会话）时也为 false。ANTHROPIC_UNIX_SOCKET 时只看 CLAUDE_CODE_OAUTH_TOKEN。
 */
function isAnthropicAuthEnabled() {
  let bareMode = isBareMode();
  if (bareMode && isBareModeAuthRestricted()) return false;
  if (env.ANTHROPIC_UNIX_SOCKET) return !!env.CLAUDE_CODE_OAUTH_TOKEN;
  if (shouldUseWIFAuth()) return false;
  let nonFirstParty = !isFirstPartyProvider();
  let settings = getSettings_DEPRECATED() || {};
  let apiKeyHelper = bareMode
    ? getConfiguredApiKeyHelper()
    : warnPinnedHelper("apiKeyHelper", settings.apiKeyHelper);
  let envAuthToken = effectiveAuthTokenEnv();
  let apiKeySource;
  try {
    apiKeySource = getAnthropicApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true,
    }).source;
  } catch {
    return false;
  }
  let isApiKeySource = apiKeySource === "ANTHROPIC_API_KEY" || apiKeySource === "apiKeyHelper";
  let isManagedOAuth = isManagedOAuthContext();
  let hasDescriptorKey =
    !isManagedOAuth && hasPossibleCredentialFromDescriptor("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR");
  let shouldDisableAuth =
    ((envAuthToken || isApiKeySource) && !isFirstPartyManagedOAuthContext()) ||
    ((apiKeyHelper || hasDescriptorKey) && !isManagedOAuth);
  return !(nonFirstParty || shouldDisableAuth);
}
//@ chunk-exfmq47h.js:527403-527836 facade-majority (2.1.88 match: bothAuthMethodsNotice, 0.523)
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
//@ chunk-exfmq47h.js:527836-527892 facade-majority
function effectiveAuthTokenEnv() {
  return isAntBuild() ? undefined : env.ANTHROPIC_AUTH_TOKEN;
}
//@ chunk-exfmq47h.js:527892-528557 facade-majority (2.1.88 match: getAuthTokenSource, 0.886)
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
//@ chunk-exfmq47h.js:528557-528702 facade-majority
function isOAuthBearerSource(source) {
  return (
    source === "claude.ai" ||
    source === "CLAUDE_CODE_OAUTH_TOKEN" ||
    source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR" ||
    source === "CCR_OAUTH_TOKEN_FILE"
  );
}
//@ chunk-exfmq47h.js:528702-528814 facade-majority
function getRequestCredentials(tokenSource, apiKeySource) {
  let useApiKey = apiKeySource !== "none" && !isClaudeAISubscriber();
  return {
    tokenSource: (
      tokenSource === "profile" ? !isWIFDispatchAuth() : useApiKey && isOAuthBearerSource(tokenSource)
    )
      ? "none"
      : tokenSource,
    apiKey: useApiKey,
  };
}
//@ chunk-exfmq47h.js:528814-528854 facade-majority
function getAnthropicApiKey() {
  let { key } = getAnthropicApiKeyWithSource();
  return key;
}
//@ chunk-exfmq47h.js:528854-528904 facade-majority
function getAnthropicApiKeySafe() {
  try {
    return getAnthropicApiKey();
  } catch {
    return null;
  }
}
//@ chunk-exfmq47h.js:528904-528938 facade-majority
function getApiKeySourceSafe() {
  return getAnthropicApiKeyWithSourceSafe().source;
}
//@ chunk-exfmq47h.js:528938-529011 facade-majority
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
//@ chunk-exfmq47h.js:529011-529131 facade-majority
function getAnthropicApiKeyFingerprint() {
  let { key, source } = getAnthropicApiKeyWithSourceSafe({
    skipRetrievingKeyFromApiKeyHelper: true,
  });
  return {
    source,
    fingerprint: key ? computeContentHash(key) : null,
  };
}
//@ chunk-exfmq47h.js:529131-529227 facade-majority
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
//@ chunk-exfmq47h.js:529227-529246 layout
var weakMap_5; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:529227", () => {
  weakMap_5 = new WeakMap();
});
//@ chunk-exfmq47h.js:529246-529378 facade-majority
function hasBootstrapModelOptions() {
  let globalConfig = getGlobalConfig();
  return (
    Array.isArray(globalConfig.additionalModelOptionsCache) &&
    typeof globalConfig.additionalModelOptionsAnsweredAt === "number"
  );
}
//@ chunk-exfmq47h.js:529378-529899 facade-majority
/**
 * 读取 ~/.claude.json 的 additionalModelOptionsCache（服务端下发的额外模型选项）并校验形状。
 */
function getAdditionalModelOptionsCache() {
  let additionalModelOptionsCache = getGlobalConfig().additionalModelOptionsCache;
  if (!Array.isArray(additionalModelOptionsCache)) return [];
  let cachedOptions = weakMap_5.get(additionalModelOptionsCache);
  if (cachedOptions) return cachedOptions;
  let mapped = additionalModelOptionsCache
    .filter(
      (option) =>
        option != null &&
        typeof option === "object" &&
        (typeof option.value === "string" || option.value === null) &&
        typeof option.label === "string" &&
        typeof option.description === "string",
    )
    .map((option) => ({
      value: option.value,
      label:
        sanitizeTitle(option.label) || (typeof option.value === "string" ? sanitizeTitle(option.value) : ""),
      description: markdownSafeText(option.description),
      ...(option.disabled === true && {
        disabled: true,
      }),
      ...(typeof option.promoListPrice === "string" && {
        promoListPrice: sanitizeTitle(option.promoListPrice),
      }),
    }));
  weakMap_5.set(additionalModelOptionsCache, mapped);
  return mapped;
}
//@ chunk-exfmq47h.js:529899-530074 facade-majority
/**
 * 读取 modelAccessCache：服务端告知的各模型是否在订阅内（apiName, entitled）。
 */
function getModelAccessCache() {
  let modelAccessCache = getGlobalConfig().modelAccessCache;
  return (Array.isArray(modelAccessCache) ? modelAccessCache : []).filter(
    (entry) =>
      entry != null &&
      typeof entry === "object" &&
      typeof entry.apiName === "string" &&
      typeof entry.entitled === "boolean",
  );
}
//@ chunk-exfmq47h.js:530074-530483 facade-majority
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
//@ chunk-exfmq47h.js:530483-530673 facade-majority
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
//@ chunk-exfmq47h.js:530673-530929 facade-majority
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
//@ chunk-exfmq47h.js:530929-531055 facade-majority (2.1.88 match: hasAnthropicApiKeyAuth, 1)
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
//@ chunk-exfmq47h.js:531055-531088 facade-majority
function hasAnthropicApiKey() {
  return getAnthropicApiKeySafe() != null;
}
//@ chunk-exfmq47h.js:531088-532167 facade-majority (2.1.88 match: getAnthropicApiKeyWithSource, 0.569)
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
//@ chunk-exfmq47h.js:532167-532278 facade-majority
/**
 * 环境变量 ANTHROPIC_API_KEY 未被用户审批过（status=new）时返回其末 20 位，用于启动时询问是否使用这个 key。
 */
function getUnapprovedCustomApiKey() {
  let ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY || isAntBuild() || !isFirstPartyProvider()) return;
  let keyTail = tailOfId(ANTHROPIC_API_KEY);
  return getCustomApiKeyStatus(keyTail) === "new" ? keyTail : undefined;
}
//@ chunk-exfmq47h.js:532278-532394 layout
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
//@ chunk-exfmq47h.js:532394-532511 facade-majority
function onEnvApiKeyApprovalFlipped(onCredentialMayHaveChanged) {
  let approved = isEnvApiKeyApproved();
  let unsubscribers = [
    onCredentialChange(() => {
      approved = isEnvApiKeyApproved();
    }),
    subscribeGlobalConfigInstalled(() => {
      let nextApproved = isEnvApiKeyApproved();
      if (nextApproved !== approved) {
        approved = nextApproved;
        onCredentialMayHaveChanged();
      }
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
//@ chunk-exfmq47h.js:532511-532645 facade-majority (2.1.88 match: getConfiguredApiKeyHelper, 0.742)
/**
 * 取 apiKeyHelper 命令：--bare 只认 flagSettings；宿主托管提供方时忽略；否则取合并设置（R6e 过滤不可信来源）。
 */
function getConfiguredApiKeyHelper() {
  if (isBareMode()) return getSettingsForSource("flagSettings")?.apiKeyHelper;
  if (isHostManagedProviderAuth()) return;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("apiKeyHelper", mergedSettings.apiKeyHelper);
}
//@ chunk-exfmq47h.js:532645-532804 layout (2.1.88 match: isApiKeyHelperFromProjectOrLocalSettings, 0.813)
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
//@ chunk-exfmq47h.js:532804-532895 facade-majority (2.1.88 match: getConfiguredAwsAuthRefresh, 0.52)
/**
 * 设置中的 awsAuthRefresh 命令（经可信来源过滤）。
 */
function getConfiguredAwsAuthRefresh() {
  if (isHostManagedProviderAuth()) return;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("awsAuthRefresh", mergedSettings.awsAuthRefresh);
}
//@ chunk-exfmq47h.js:532895-533062 facade-majority (2.1.88 match: isAwsAuthRefreshFromProjectSettings, 0.782)
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
//@ chunk-exfmq47h.js:533062-533162 fingerprint (2.1.88 match: getConfiguredAwsCredentialExport, 0.519)
/**
 * 设置中的 awsCredentialExport 命令。
 */
function getConfiguredAwsCredentialExport() {
  if (isHostManagedProviderAuth()) return;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("awsCredentialExport", mergedSettings.awsCredentialExport);
}
//@ chunk-exfmq47h.js:533162-533343 facade-majority (2.1.88 match: isAwsCredentialExportFromProjectSettings, 0.78)
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
//@ chunk-exfmq47h.js:533343-533552 facade-majority (2.1.88 match: calculateApiKeyHelperTTL, 0.909)
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
//@ chunk-exfmq47h.js:533552-533625 facade-majority
/**
 * 按宿主的 apiKeyHelper 状态：{cache:{value,timestamp}, inflight, epoch, lastFailure}。
 */
var apiKeyHelperStates; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:533552", () => {
  apiKeyHelperStates = new HostScoped(() => ({
    cache: null,
    inflight: null,
    epoch: 0,
    lastFailure: null,
  }));
});
//@ chunk-exfmq47h.js:533625-533707 facade-majority (2.1.88 match: createBudgetTracker, 0.619)
function getApiKeyHelperElapsedMs() {
  let startedAt = apiKeyHelperStates.of(getRootSession().host).inflight?.startedAt;
  return startedAt ? Date.now() - startedAt : 0;
}
//@ chunk-exfmq47h.js:533707-533824 layout
function isTokenStillValid(cache) {
  let expirySeconds = decodeJwtExpiry(cache.value);
  if (expirySeconds === null) return true;
  let expiryMs = expirySeconds * 1000 - JWT_EXPIRY_SKEW_MS;
  if (cache.timestamp >= expiryMs) return true;
  return Date.now() < expiryMs;
}
//@ chunk-exfmq47h.js:533824-533889 layout
/**
 * 判断令牌过期时间是否仍有余量。
 */
function isOauthExpiryFresh(promise) {
  let expirySeconds = decodeJwtExpiry(promise);
  return expirySeconds === null || Date.now() < expirySeconds * 1000 - JWT_EXPIRY_SKEW_MS;
}
//@ chunk-exfmq47h.js:533889-533971 facade-majority (2.1.88 match: getApiKeyFromApiKeyHelper, 0.653)
function getColdApiKeyHelperRun() {
  let inflight = apiKeyHelperStates.of(getRootSession().host).inflight;
  return inflight?.startedAt ? inflight.promise : null;
}
//@ chunk-exfmq47h.js:533971-534572 facade-majority
async function getApiKeyFromApiKeyHelper(isNonInteractiveSession) {
  if (!getConfiguredApiKeyHelper()) return null;
  let apiKeyHelperTTL = calculateApiKeyHelperTTL();
  let state = apiKeyHelperStates.of(getRootSession().host);
  let startFetch = () => {
    state.inflight = {
      promise: _runAndCache(state, isNonInteractiveSession, true, state.epoch),
      startedAt: Date.now(),
    };
    return state.inflight.promise;
  };
  if (state.cache) {
    if (
      !isTokenStillValid(state.cache) &&
      isFirstPartyProvider() &&
      isApiKeyHelperTheActiveCredential() &&
      !effectiveAuthTokenEnv()
    ) {
      if (state.inflight) {
        if (!state.inflight.startedAt) state.inflight.startedAt = Date.now();
        let promise = await state.inflight.promise;
        if (promise === null || isOauthExpiryFresh(promise)) return promise;
        if (state.inflight) return state.inflight.promise;
        return startFetch();
      }
      return startFetch();
    }
    if (Date.now() - state.cache.timestamp < apiKeyHelperTTL) return state.cache.value;
    if (!state.inflight)
      state.inflight = {
        promise: _runAndCache(state, isNonInteractiveSession, false, state.epoch),
        startedAt: null,
      };
    return state.cache.value;
  }
  if (state.inflight) return state.inflight.promise;
  return startFetch();
}
//@ chunk-exfmq47h.js:534572-535249 fingerprint (2.1.88 match: _runAndCache, 0.627)
/**
 * 执行 apiKeyHelper 并写缓存；失败时打印红字错误，若有旧缓存则沿用并刷新时间戳，否则缓存一个空格占位并记录 lastFailure（epoch 变化后的结果丢弃）。
 */
async function _runAndCache(state, isNonInteractiveSession, isBackground, epoch) {
  try {
    let value = await _executeApiKeyHelper(isNonInteractiveSession);
    if (epoch !== state.epoch) return value;
    if (value !== null) {
      state.cache = {
        value,
        timestamp: Date.now(),
      };
      state.lastFailure = null;
    }
    return value;
  } catch (e) {
    if (epoch !== state.epoch) return " ";
    let detail = e instanceof Error ? e.message : String(e);
    console.error(sequential.red(`apiKeyHelper failed: ${detail}`));
    logForDebugging(`Error getting API key from apiKeyHelper: ${detail}`, {
      level: "error",
    });
    if (!isBackground && state.cache && state.cache.value !== " ") {
      state.cache = {
        ...state.cache,
        timestamp: Date.now(),
      };
      return state.cache.value;
    }
    state.lastFailure = detail;
    if (isApiKeyHelperTheActiveCredential()) {
      let instance = AwsAuthStatusManager.getInstance();
      instance.startAuthentication();
      instance.setError(`apiKeyHelper failed: ${detail}`);
      instance.endAuthentication(false);
    }
    state.cache = {
      value: " ",
      timestamp: Date.now(),
    };
    return " ";
  } finally {
    if (epoch === state.epoch) state.inflight = null;
  }
}
//@ chunk-exfmq47h.js:535249-536607 fingerprint (2.1.88 match: _executeApiKeyHelper, 0.54)
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
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
  let result = await runManagedHelperWithoutProjectEnv(
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
  if (result.failed) {
    let why = result.timedOut ? "timed out" : `exited ${result.exitCode}`;
    let stderr = result.stderr && truncateToLength(result.stderr.trim(), 500);
    throw Error(stderr ? `${why}: ${stderr}` : why);
  }
  let stdout = result.stdout?.trim();
  if (!stdout) throw Error("did not return a value");
  let found = findUnsafeChar(stdout, {
    maxLength: MAX_HELPER_STDERR_CHARS,
  });
  if (found) {
    let reason = describeUnsafeValue(found, textLengthAndLines(stdout));
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `returned output that cannot be used as an API key: ${reason}. The script must print only the key to stdout.`,
      "apiKeyHelper output rejected: not a printable-ASCII token",
    );
  }
  return stdout;
}
//@ chunk-exfmq47h.js:536607-536665 facade-majority
function getApiKeyFromApiKeyHelperCached() {
  return apiKeyHelperStates.of(getRootSession().host).cache?.value ?? null;
}
//@ chunk-exfmq47h.js:536665-536737 facade-majority
function getApiKeyHelperLastFailure() {
  if (!getConfiguredApiKeyHelper()) return null;
  return apiKeyHelperStates.of(getRootSession().host).lastFailure;
}
//@ chunk-exfmq47h.js:536737-536814 facade-majority
/**
 * 让 apiKeyHelper 缓存失效（epoch+1）。
 */
function clearApiKeyHelperCache() {
  let state = apiKeyHelperStates.of(getRootSession().host);
  state.epoch++;
  state.cache = null;
  state.inflight = null;
}
//@ chunk-exfmq47h.js:536814-536850 facade-majority
function isApiKeyHelperSafeToInvoke() {
  return !(isApiKeyHelperFromProjectOrLocalSettings() && !checkHasTrustDialogAccepted());
}
//@ chunk-exfmq47h.js:536850-536890 facade-majority
function prefetchApiKeyFromApiKeyHelperIfSafe(isNonInteractiveSession) {
  if (!isApiKeyHelperSafeToInvoke()) return;
  getApiKeyFromApiKeyHelper(isNonInteractiveSession);
}
//@ chunk-exfmq47h.js:536890-536933 layout
/**
 * AWS 凭据提前刷新的余量（5 分钟）。
 */
var DEFAULT_AWS_CREDS_TTL_MS = 3600000;
var AWS_CREDS_REFRESH_SKEW_MS = 300000;
var AWS_CREDS_MIN_TTL_MS = 60000;
var AWS_REFRESH_MIN_INTERVAL_MS = 30000;
//@ chunk-exfmq47h.js:536933-537054 layout
class AwsAuthRefreshState {
  lastRefreshAt = null;
  inFlight = null;
  epoch = 0;
  signInFailures = 0;
  singleFlight = new CloudAuthRefreshRuns();
  waiters = new RefreshController(this.singleFlight);
}
//@ chunk-exfmq47h.js:537054-537080 facade-majority
var awsAuthRefreshStates; // deferred: uses AwsAuthRefreshState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:537054", () => {
  awsAuthRefreshStates = new HostScoped(() => new AwsAuthRefreshState());
});
//@ chunk-exfmq47h.js:537080-539394 fingerprint (2.1.88 match: runAwsAuthRefresh, 0.349)
/**
 * 按需运行 awsAuthRefresh：先用 STS GetCallerIdentity 检查现有凭证是否有效，无效才执行刷新命令（IDE 配置探测时跳过）。
 */
async function runAwsAuthRefresh() {
  let host = getRootSession().host;
  let state = awsAuthRefreshStates.of(host);
  let awsAuthRefresh = getConfiguredAwsAuthRefresh();
  let epoch = state.epoch;
  let signal = state.waiters.signal;
  if (!awsAuthRefresh) return false;
  if (env.CLAUDE_CODE_CONFIG_PROBE) {
    logForDebugging("Skipping awsAuthRefresh in the IDE config probe");
    return false;
  }
  if (isAwsAuthRefreshFromProjectSettings()) {
    if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) {
      let error = Error(
        `Security: awsAuthRefresh executed before workspace trust is confirmed. If you see this message, post in ${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.FEEDBACK_CHANNEL
        }.`,
      );
      logAntError("awsAuthRefresh invoked before trust check", error);
      logEvent("tengu_awsAuthRefresh_missing_trust", {});
      return false;
    }
  }
  if (state.inFlight) return state.inFlight;
  let probedAt = Date.now();
  try {
    logForDebugging("Fetching AWS caller identity for AWS auth refresh command");
    await checkStsCallerIdentity();
    logForDebugging("Fetched AWS caller identity, skipping AWS auth refresh command");
    state.waiters.clearTakeover();
    return false;
  } catch {
    if (state.inFlight) return state.inFlight;
    if (state.lastRefreshAt !== null && Date.now() - state.lastRefreshAt < AWS_REFRESH_MIN_INTERVAL_MS)
      return false;
    let forgetCache = () => awsCredentialMemos.of(host).helper.cache.clear();
    if (signal.aborted && !state.waiters.hasCallers()) {
      forgetCache();
      return false;
    }
    let signal_2 = state.waiters.signal;
    let didRefresh = false;
    let refreshCommand;
    let onAbort = () => {
      if (refreshCommand === undefined || refreshCommand.endedByLock.aborted) {
        didRefresh = false;
        forgetCache();
        if (state.inFlight === refreshPromise) state.inFlight = null;
      }
    };
    let refreshPromise = (async () => {
      try {
        let refreshed = await runCloudAuthRefresh({
          setting: "awsAuthRefresh",
          command: awsAuthRefresh,
          readEnvAsCommandStarts: (gateContext) =>
            managedHelperSettingsGate(
              "awsAuthRefresh",
              awsAuthRefresh,
              gateContext,
              isProjectScopeTrustAccepted,
            ),
          probedAt,
          singleFlight: state.singleFlight,
          signal: signal_2,
          takeover: state.waiters.takeTakeover(),
          reprobe: async () =>
            (await getAwsProfileRegionHints())
              ? "unknown"
              : checkStsCallerIdentity().then(
                  () => "valid",
                  () => "unknown",
                ),
          refresh: (signal, onSpawned) => {
            didRefresh = true;
            state.waiters.clearTakeover();
            let outcome = refreshAwsAuth_2(awsAuthRefresh, signal, onSpawned);
            refreshCommand = {
              outcome,
              endedByLock: signal,
            };
            return outcome;
          },
        });
        let settled = await settleRefreshOutcome({
          refreshed,
          stop: signal_2,
          command: refreshCommand,
          forget: forgetCache,
        });
        if (!settled && signal_2.aborted && refreshCommand?.endedByLock.aborted) didRefresh = false;
        didRefresh ||= settled;
        if (settled) state.waiters.clearTakeover();
        else if (
          isRefreshStillWanted({
            stop: signal_2,
            command: refreshCommand,
            waiters: state.waiters,
          }) &&
          isAuthRefreshLockEnabled()
        )
          state.signInFailures++;
        return settled;
      } finally {
        if (didRefresh && epoch === state.epoch) state.lastRefreshAt = Date.now();
      }
    })();
    state.inFlight = refreshPromise;
    signal_2.addEventListener("abort", onAbort, {
      once: true,
    });
    let cleanup = () => {
      signal_2.removeEventListener("abort", onAbort);
      if (state.inFlight === refreshPromise) state.inFlight = null;
    };
    refreshPromise.then(cleanup, cleanup);
    return refreshPromise;
  }
}
//@ chunk-exfmq47h.js:539394-539555 facade-majority
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
//@ chunk-exfmq47h.js:539555-539733 layout
async function settleRefreshOutcome({ refreshed, stop, command, forget }) {
  if (refreshed || !stop.aborted) return refreshed;
  if (command !== undefined) {
    let outcome = await command.outcome;
    if (!command.endedByLock.aborted) return outcome === "ok";
  }
  forget();
  return false;
}
//@ chunk-exfmq47h.js:539733-539856 layout
function isRefreshStillWanted({ stop, command, waiters }) {
  if (!stop.aborted) return true;
  return command !== undefined && !command.endedByLock.aborted && waiters.hasCallers();
}
//@ chunk-exfmq47h.js:539856-539920 layout
function isTerminationSignal(signal) {
  return signal === "SIGINT" || signal === "SIGHUP" || signal === "SIGTERM";
}
//@ chunk-exfmq47h.js:539920-539934 layout
var AWS_AUTH_REFRESH_TIMEOUT_MS = 180000;
//@ chunk-exfmq47h.js:539934-539989 facade-majority
function refreshAwsAuth(...args) {
  return refreshAwsAuth_2(...args).then((result) => result === "ok");
}
//@ chunk-exfmq47h.js:539989-541656 fingerprint (2.1.88 match: refreshAwsAuth, 0.581)
/**
 * 运行 awsAuthRefresh 命令（字符串走 shell，或 {file,args,env} 走 execFile），超时 3 分钟，输出转发到 AwsAuthStatusManager 供 UI 显示，返回 ok/failed。
 */
function refreshAwsAuth_2(awsAuthRefresh, signal, onSpawned) {
  if (isDisklessSession()) {
    logForDebugging(`AWS auth refresh: ${DISKLESS_PROGRAM_REFUSAL}`);
    return Promise.resolve("failed");
  }
  logForDebugging("Running AWS auth refresh command");
  let authStatusManager = AwsAuthStatusManager.getInstance();
  authStatusManager.startAuthentication();
  return new Promise((resolve) => {
    let child;
    if (typeof awsAuthRefresh === "string") {
      let projectConfigRoot = getProjectConfigRoot();
      child = runManagedHelperWithoutProjectEnv(
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
      child = execFile(
        /\.(cmd|bat)$/i.test(refreshProc) ? '"' + refreshProc + '"' : refreshProc,
        awsAuthRefresh.args,
        {
          windowsHide: true,
          shell: /\.(cmd|bat)$/i.test(refreshProc),
          env: awsAuthRefresh.env,
        },
      );
    }
    moveKeeperPid(child.pid);
    if (child.pid !== undefined) onSpawned?.(child.pid);
    let timedOperation = new TimedOperation(child, {
      timeoutMs: AWS_AUTH_REFRESH_TIMEOUT_MS,
      signal,
    });
    child.stdout.on("data", (data) => {
      let output = data.toString().trim();
      if (output) {
        authStatusManager.addOutput(output);
        logForDebugging(output, {
          level: "debug",
        });
      }
    });
    child.stderr.on("data", (data) => {
      let error = data.toString().trim();
      if (error) {
        authStatusManager.setError(error);
        logForDebugging(error, {
          level: "error",
        });
      }
    });
    child.on("close", (code, signal) => {
      timedOperation.settle();
      if (code === 0) {
        logForDebugging("AWS auth refresh completed successfully");
        authStatusManager.endAuthentication(true);
        resolve("ok");
      } else if (timedOperation.killReason === "abort") {
        authStatusManager.dismiss();
        resolve("interrupted");
      } else {
        let wasShutdown =
          timedOperation.killReason === "shutdown" ||
          (isTerminationSignal(signal) && timedOperation.killReason === undefined);
        let timedOut = timedOperation.killReason === "timeout";
        let message = wasShutdown
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
        resolve(wasShutdown ? "interrupted" : "failed");
      }
    });
  });
}
//@ chunk-exfmq47h.js:541656-543301 fingerprint (2.1.88 match: getAwsCredsFromCredentialExport, 0.708)
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
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
    let parsedOutput = jsonParse(result.stdout.trim());
    let awsOutput = extractStsCredentials(parsedOutput);
    if (!awsOutput) throw Error("awsCredentialExport did not return valid AWS STS output structure");
    logForDebugging("AWS credentials retrieved from awsCredentialExport");
    let Expiration = awsOutput.Expiration;
    let expirationMs = typeof Expiration === "string" ? Date.parse(Expiration) : NaN;
    return {
      accessKeyId: awsOutput.AccessKeyId,
      secretAccessKey: awsOutput.SecretAccessKey,
      sessionToken: awsOutput.SessionToken,
      expiration: Number.isFinite(expirationMs) ? expirationMs : undefined,
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
//@ chunk-exfmq47h.js:543301-543560 layout
/**
 * 解析 AWS 凭证：先 awsAuthRefresh、再 awsCredentialExport；刷新成功后清 AWS ini 与默认链缓存。
 */
async function resolveAwsCredentialsViaHelpers(memos) {
  let startTime = performance.now();
  logForDebugging("[API:auth] AWS credential resolve start");
  let refreshed = await runAwsAuthRefresh();
  let awsCredsFromCredentialExport = await getAwsCredsFromCredentialExport();
  if (refreshed) {
    await clearAwsIniCache();
    memos.defaultChain.cache.clear();
  }
  logForDebugging(`[API:auth] AWS credential resolve done in ${Math.round(performance.now() - startTime)}ms`);
  return awsCredsFromCredentialExport;
}
//@ chunk-exfmq47h.js:543560-543690 facade-majority
function refreshAndGetAwsCredentials(signal, { userTurn = false } = {}) {
  let host = getRootSession().host;
  return awsAuthRefreshStates.of(host).waiters.wait(
    () => awsCredentialMemos.of(host).helper(),
    {
      signal,
      userTurn,
    },
    null,
  );
}
//@ chunk-exfmq47h.js:543690-543788 layout
function computeAwsCredsCacheTtl(expirationMs) {
  let timeLeftMs = expirationMs === undefined ? undefined : expirationMs - Date.now();
  if (timeLeftMs === undefined || timeLeftMs <= AWS_CREDS_REFRESH_SKEW_MS + AWS_CREDS_MIN_TTL_MS)
    return DEFAULT_AWS_CREDS_TTL_MS;
  return timeLeftMs - AWS_CREDS_REFRESH_SKEW_MS;
}
//@ chunk-exfmq47h.js:543788-543811 facade-majority
var AWS_CHAIN_REQUEST_TIMEOUT_MS = 30000;
var AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS = 30000;
//@ chunk-exfmq47h.js:543811-544120 facade-majority
/**
 * 给 AWS 默认凭证链解析加超时（CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS，默认 60 秒）。
 */
async function resolveWithStallGuard(
  resolvePromise,
  timeoutMs = env.CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS ?? 60000,
) {
  let timer;
  try {
    return await Promise.race([
      resolvePromise,
      new Promise((resolve, reject) => {
        timer = setTimeout(
          (reject) =>
            reject(
              Object.assign(Error("AWS default-chain credential resolve timed out"), {
                name: "CredentialsProviderError",
              }),
            ),
          timeoutMs,
          reject,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
    resolvePromise.catch(() => {});
  }
}
//@ chunk-exfmq47h.js:544120-544741 layout
/**
 * 创建按区域缓存的 AWS 默认凭证链（@aws-sdk fromNodeProviderChain + STS 代理配置），CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS 超时。
 */
async function createAwsDefaultChainResolver(region) {
  let memoized = memoizeWithTTL(
    async () => {
      logForDebugging(`[API:auth] resolving default AWS provider chain (region: ${region})`);
      let [{ fromNodeProviderChain }, awsProxyRequestHandler] = await Promise.all([
        import("../../vendor/@aws-sdk/credential-providers/dist-cjs/createCredentialChain.lazy.js"),
        getAWSProxyRequestHandler({
          url: resolveStsEndpointForProxyUrl(region),
          requestTimeoutMs: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
        }),
      ]);
      let providerChain = fromNodeProviderChain({
        ignoreCache: true,
        parentClientConfig: {
          region,
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
      return resolveWithStallGuard(providerChain());
    },
    (credentials) => computeAwsCredsCacheTtl(credentials.expiration?.getTime()),
    (entry, nowMs) => {
      if (entry.expiration === undefined) return true;
      let time = entry.expiration.getTime();
      if (time > Date.now() + AWS_CHAIN_REQUEST_TIMEOUT_MS) return true;
      return nowMs >= time - AWS_CHAIN_REQUEST_TIMEOUT_MS && time > Date.now();
    },
  );
  return () => memoized();
}
//@ chunk-exfmq47h.js:544741-544797 facade-majority
function getDefaultAwsProviderChain(region) {
  return awsCredentialMemos.of(getRootSession().host).defaultChain(region);
}
//@ chunk-exfmq47h.js:544797-544888 facade-majority
/**
 * 返回 Bedrock 用的 AWS 凭证提供器：CLAUDE_CODE_SKIP_AWS_CRED_CACHE 时每次重建默认链，否则按区域缓存。
 */
function defaultAwsProviderChainResolver(region, getNativeCaBlocks = getCACertificates) {
  if (env.CLAUDE_CODE_SKIP_AWS_CRED_CACHE) return () => createUncachedAwsDefaultChain(getNativeCaBlocks);
  return () => getDefaultAwsProviderChain(region);
}
//@ chunk-exfmq47h.js:544888-545026 layout
async function createUncachedAwsDefaultChain(caList) {
  let { fromNodeProviderChain } =
    await import("../../vendor/@aws-sdk/credential-providers/dist-cjs/createCredentialChain.lazy.js");
  return fromNodeProviderChain({
    clientConfig: {
      requestHandler: new CaFetchHttpHandler(caList),
    },
  });
}
//@ chunk-exfmq47h.js:545026-545078 layout
function awsChainCacheKey(region) {
  return `${env.AWS_PROFILE ?? ""}\x00${region}`;
}
//@ chunk-exfmq47h.js:545078-545089 layout
/**
 * AWS 链解析失败后的冷却时间（10 秒）。
 */
var CHAIN_EVICTION_COOLDOWN_MS = 1e4;
//@ chunk-exfmq47h.js:545089-545315 facade-majority
function invalidateDefaultAwsProviderChainDebounced(region) {
  let cacheKey = awsChainCacheKey(region);
  let now = Date.now();
  let memos = awsCredentialMemos.of(getRootSession().host);
  if (now - (memos.chainEvictionAt.get(cacheKey) ?? 0) < CHAIN_EVICTION_COOLDOWN_MS) return false;
  memos.chainEvictionAt.set(cacheKey, now);
  memos.defaultChain.cache.delete(cacheKey);
  memos.ssoRole.cache.clear();
  memos.ssoProfile.cache.clear();
  return true;
}
//@ chunk-exfmq47h.js:545315-545482 facade-majority
/**
 * 清空 AWS 凭证相关缓存（helper、默认链、SSO role/profile）。
 */
function clearAwsCredentialsCache() {
  let memos = awsCredentialMemos.of(getRootSession().host);
  memos.helper.cache.clear();
  memos.defaultChain.cache.clear();
  memos.ssoRole.cache.clear();
  memos.ssoProfile.cache.clear();
  memos.chainEvictionAt.clear();
}
//@ chunk-exfmq47h.js:545482-545535 facade-majority
function clearAwsHelperCredentialsCache() {
  awsCredentialMemos.of(getRootSession().host).helper.cache.clear();
}
//@ chunk-exfmq47h.js:545535-545604 facade-majority
function resetAwsAuthRefreshCooldown() {
  let state = awsAuthRefreshStates.of(getRootSession().host);
  state.lastRefreshAt = null;
  state.epoch++;
}
//@ chunk-exfmq47h.js:545604-545695 facade-majority (2.1.88 match: getConfiguredGcpAuthRefresh, 0.524)
/**
 * 设置中的 gcpAuthRefresh 命令。
 */
function getConfiguredGcpAuthRefresh() {
  if (isHostManagedProviderAuth()) return;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("gcpAuthRefresh", mergedSettings.gcpAuthRefresh);
}
//@ chunk-exfmq47h.js:545695-545862 facade-majority (2.1.88 match: isGcpAuthRefreshFromProjectSettings, 0.783)
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
//@ chunk-exfmq47h.js:545862-545874 layout
/**
 * GCP 凭据检查的超时时间（5 秒）。
 */
var GCP_CREDS_CHECK_TIMEOUT_MS = 5000;
//@ chunk-exfmq47h.js:545874-546010 facade-majority
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
//@ chunk-exfmq47h.js:546010-546663 facade-majority (2.1.88 match: checkGcpCredentialsValid, 0.489)
/**
 * 用 google-auth-library 取一次 access token 检查 GCP 凭证（scope cloud-platform，项目取 GCLOUD_PROJECT/ANTHROPIC_VERTEX_PROJECT_ID 等），5 秒超时，返回 valid/invalid/timeout。
 */
async function checkGcpCredentialsValid() {
  let now = Date.now();
  try {
    let { GoogleAuth } = await import("./lazyDefaultExport.js").then((sdkModule) =>
      __toESM(sdkModule.default, 1),
    );
    let projectId = getConfiguredVertexProjectId() || env.ANTHROPIC_GOOGLE_CLOUD_PROJECT;
    let auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      ...(projectId && {
        projectId,
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
    let elapsedMs = Date.now() - now;
    if (error instanceof GcpCredentialsTimeoutError) {
      logForDebugging(`GCP credentials check did not finish within ${elapsedMs}ms`, {
        level: "warn",
      });
      return "timeout";
    }
    logForDebugging(`GCP credentials check failed after ${elapsedMs}ms: ${errorMessage(error)}`);
    return "invalid";
  }
}
//@ chunk-exfmq47h.js:546663-546774 layout
class GcpAuthRefreshState {
  rejectedByApi = false;
  inFlight = null;
  signInFailures = 0;
  singleFlight = new CloudAuthRefreshRuns();
  waiters = new RefreshController(this.singleFlight);
}
//@ chunk-exfmq47h.js:546774-546800 facade-majority
var gcpAuthRefreshStates; // deferred: uses GcpAuthRefreshState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:546774", () => {
  gcpAuthRefreshStates = new HostScoped(() => new GcpAuthRefreshState());
});
//@ chunk-exfmq47h.js:546800-546881 facade-majority
function markGcpCredentialsRejected() {
  let host = getRootSession().host;
  gcpRefreshMemos.of(host).cache.clear();
  gcpAuthRefreshStates.of(host).rejectedByApi = true;
}
//@ chunk-exfmq47h.js:546881-546896 layout
var GCP_AUTH_REFRESH_TTL_MS = 3600000;
//@ chunk-exfmq47h.js:546896-549372 fingerprint (2.1.88 match: runGcpAuthRefresh, 0.324)
/**
 * 按需运行 gcpAuthRefresh（如 gcloud auth application-default login）：先检查 GCP 凭证，无效才执行，结果按 1 小时缓存。
 */
async function runGcpAuthRefresh() {
  let host = getRootSession().host;
  let state = gcpAuthRefreshStates.of(host);
  let signal = state.waiters.signal;
  let gcpAuthRefresh = getConfiguredGcpAuthRefresh();
  if (!gcpAuthRefresh) return false;
  if (env.CLAUDE_CODE_CONFIG_PROBE) {
    logForDebugging("Skipping gcpAuthRefresh in the IDE config probe");
    return false;
  }
  if (isGcpAuthRefreshFromProjectSettings()) {
    if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) {
      let error = Error(
        `Security: gcpAuthRefresh executed before workspace trust is confirmed. If you see this message, post in ${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.FEEDBACK_CHANNEL
        }.`,
      );
      logAntError("gcpAuthRefresh invoked before trust check", error);
      logEvent("tengu_gcpAuthRefresh_missing_trust", {});
      return false;
    }
  }
  let { lockfilePath } = getOperationLockPaths("gcpAuthRefresh", gcpAuthRefresh, (gateContext) =>
    managedHelperSettingsGate("gcpAuthRefresh", gcpAuthRefresh, gateContext, isProjectScopeTrustAccepted),
  );
  if (state.inFlight?.lockfilePath === lockfilePath) {
    state.rejectedByApi = false;
    return state.inFlight.run;
  }
  let rejectedByApi = state.rejectedByApi;
  state.rejectedByApi = false;
  logForDebugging("Checking GCP credentials validity for auth refresh");
  let probedAt = Date.now();
  switch (await checkGcpCredentialsValid()) {
    case "valid":
      logForDebugging("GCP credentials are valid, skipping auth refresh command");
      state.waiters.clearTakeover();
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
  if (state.inFlight?.lockfilePath === lockfilePath) return state.inFlight.run;
  let forgetCache = () => {
    gcpRefreshMemos.of(host).cache.clear();
    state.rejectedByApi ||= rejectedByApi;
  };
  if (signal.aborted && !state.waiters.hasCallers()) {
    forgetCache();
    return false;
  }
  let signal_2 = state.waiters.signal;
  let refreshCommand;
  let onAbort = () => {
    if (refreshCommand === undefined || refreshCommand.endedByLock.aborted) {
      forgetCache();
      if (state.inFlight?.run === refreshPromise) state.inFlight = null;
    }
  };
  let refreshPromise = runCloudAuthRefresh({
    setting: "gcpAuthRefresh",
    command: gcpAuthRefresh,
    readEnvAsCommandStarts: (gateContext) =>
      managedHelperSettingsGate("gcpAuthRefresh", gcpAuthRefresh, gateContext, isProjectScopeTrustAccepted),
    probedAt,
    singleFlight: state.singleFlight,
    signal: signal_2,
    takeover: state.waiters.takeTakeover(),
    reprobe: async () => {
      let isValid = await checkGcpCredentialsValid();
      return isValid === "timeout" ? "unknown" : isValid;
    },
    refresh: (signal, onSpawned) => {
      state.waiters.clearTakeover();
      let outcome = refreshGcpAuth(gcpAuthRefresh, signal, onSpawned);
      refreshCommand = {
        outcome,
        endedByLock: signal,
      };
      return outcome;
    },
  })
    .then(async (refreshed) => {
      let settled = await settleRefreshOutcome({
        refreshed,
        stop: signal_2,
        command: refreshCommand,
        forget: forgetCache,
      });
      if (settled) state.waiters.clearTakeover();
      else if (
        isRefreshStillWanted({
          stop: signal_2,
          command: refreshCommand,
          waiters: state.waiters,
        }) &&
        isAuthRefreshLockEnabled()
      )
        state.signInFailures++;
      return settled;
    })
    .finally(() => {
      signal_2.removeEventListener("abort", onAbort);
      if (state.inFlight?.run === refreshPromise) state.inFlight = null;
    });
  state.inFlight = {
    lockfilePath,
    run: refreshPromise,
  };
  signal_2.addEventListener("abort", onAbort, {
    once: true,
  });
  return refreshPromise;
}
//@ chunk-exfmq47h.js:549372-549386 layout
var GCP_AUTH_REFRESH_TIMEOUT_MS = 180000;
//@ chunk-exfmq47h.js:549386-550474 facade-majority (2.1.88 match: refreshGcpAuth, 0.712)
function refreshGcpAuth(gcpAuthRefresh, signal, onSpawned) {
  if (isDisklessSession()) {
    logForDebugging(`GCP auth refresh: ${DISKLESS_PROGRAM_REFUSAL}`);
    return Promise.resolve("failed");
  }
  logForDebugging("Running GCP auth refresh command");
  let authStatusManager = AwsAuthStatusManager.getInstance();
  authStatusManager.startAuthentication();
  return new Promise((resolve) => {
    let projectConfigRoot = getProjectConfigRoot();
    let child = runManagedHelperWithoutProjectEnv(
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
    moveKeeperPid(child.pid);
    if (child.pid !== undefined) onSpawned?.(child.pid);
    let timedOperation = new TimedOperation(child, {
      timeoutMs: GCP_AUTH_REFRESH_TIMEOUT_MS,
      signal,
    });
    child.stdout.on("data", (data) => {
      let output = data.toString().trim();
      if (output) {
        authStatusManager.addOutput(output);
        logForDebugging(output, {
          level: "debug",
        });
      }
    });
    child.stderr.on("data", (data) => {
      let error = data.toString().trim();
      if (error) {
        authStatusManager.setError(error);
        logForDebugging(error, {
          level: "error",
        });
      }
    });
    child.on("close", (code, signal) => {
      timedOperation.settle();
      if (code === 0) {
        logForDebugging("GCP auth refresh completed successfully");
        authStatusManager.endAuthentication(true);
        resolve("ok");
      } else if (timedOperation.killReason === "abort") {
        authStatusManager.dismiss();
        resolve("interrupted");
      } else {
        let wasShutdown =
          timedOperation.killReason === "shutdown" ||
          (isTerminationSignal(signal) && timedOperation.killReason === undefined);
        let message =
          timedOperation.killReason === "timeout"
            ? sequential.red(
                "GCP auth refresh timed out after 3 minutes. Run your auth command manually in a separate terminal.",
              )
            : sequential.red("Error running gcpAuthRefresh (in settings or ~/.claude.json):");
        if (!wasShutdown) console.error(message);
        authStatusManager.endAuthentication(false);
        resolve(wasShutdown ? "interrupted" : "failed");
      }
    });
  });
}
//@ chunk-exfmq47h.js:550474-550521 facade-majority
var gcpRefreshMemos; // deferred: uses memoizeWithTTL (./memoize.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:550474", () => {
  gcpRefreshMemos = new HostScoped(() =>
    memoizeWithTTL(async () => await runGcpAuthRefresh(), GCP_AUTH_REFRESH_TTL_MS),
  );
});
//@ chunk-exfmq47h.js:550521-550643 facade-majority
function refreshGcpCredentialsIfNeeded(signal, { userTurn = false } = {}) {
  let host = getRootSession().host;
  return gcpAuthRefreshStates.of(host).waiters.wait(
    () => gcpRefreshMemos.of(host)(),
    {
      signal,
      userTurn,
    },
    false,
  );
}
//@ chunk-exfmq47h.js:550643-550697 facade-majority
function gcpSignInFailures() {
  return gcpAuthRefreshStates.of(getRootSession().host).signInFailures;
}
//@ chunk-exfmq47h.js:550697-550751 facade-majority
function awsSignInFailures() {
  return awsAuthRefreshStates.of(getRootSession().host).signInFailures;
}
//@ chunk-exfmq47h.js:550751-550832 facade-majority
function clearGcpCredentialsCache() {
  let host = getRootSession().host;
  gcpRefreshMemos.of(host).cache.clear();
  gcpAuthRefreshStates.of(host).rejectedByApi = false;
}
//@ chunk-exfmq47h.js:550832-550944 facade-majority (2.1.88 match: prefetchGcpCredentialsIfSafe, 0)
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
//@ chunk-exfmq47h.js:550944-551094 facade-majority (2.1.88 match: prefetchAwsCredentialsAndBedRockInfoIfSafe, 0)
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
//@ chunk-exfmq47h.js:551094-551227 fingerprint (2.1.88 match: getApiKeyFromConfigOrMacOSKeychain, 0.723)
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
//@ chunk-exfmq47h.js:551227-551307 layout
class ApiKeyConfigCache {
  value = undefined;
  promise = null;
  clear() {
    this.value = undefined;
    this.promise = null;
  }
}
//@ chunk-exfmq47h.js:551307-551333 facade-majority
var loginManagedKeyMemos; // deferred: uses ApiKeyConfigCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:551307", () => {
  loginManagedKeyMemos = new HostScoped(() => new ApiKeyConfigCache());
});
//@ chunk-exfmq47h.js:551333-551371 layout
function getApiKeyConfigCache() {
  return loginManagedKeyMemos.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:551371-551482 facade-majority
function getApiKeyFromConfigOrMacOSKeychain() {
  if (isBareModeAuthRestricted()) return null;
  let apiKeyConfigCache = getApiKeyConfigCache();
  if (apiKeyConfigCache.value !== undefined) return apiKeyConfigCache.value;
  let apiKeyFromConfigOrMacOSKeychain = getApiKeyFromConfigOrMacOSKeychain_2();
  apiKeyConfigCache.value = apiKeyFromConfigOrMacOSKeychain;
  return apiKeyFromConfigOrMacOSKeychain;
}
//@ chunk-exfmq47h.js:551482-551530 file-local
function isValidApiKey(apiKey) {
  return /^[a-zA-Z0-9-_]+$/.test(apiKey);
}
//@ chunk-exfmq47h.js:551530-552491 facade-majority (2.1.88 match: saveApiKey, 0.812)
/**
 * 保存 /login 得到的 API key：校验字符集，写入全局配置 primaryApiKey，并把截断值加入 customApiKeyResponses.approved（macOS 上同时 security add-generic-password 写钥匙串）。
 */
async function saveApiKey(apiKey, saveOptions) {
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
    let keychainResult = await safeExecFile("security", ["-i"], {
      input: command,
      reject: false,
      timeout: 5000,
    });
    if (keychainResult.exitCode !== 0) {
      let stderr = (keychainResult.stderr || keychainResult.stdout || "").trim().replace(/\s*\n\s*/g, "; ");
      logEvent("tengu_api_key_keychain_error", {
        error_class: fromEnum(classifyKeychainError(stderr)),
        error_hash: shortHash(scrubErrorText(stderr)),
        exit_code: keychainResult.exitCode ?? -1,
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
  }, saveOptions);
  apiKeyConfigCache.clear();
  clearLegacyApiKeyPrefetch();
}
//@ chunk-exfmq47h.js:552491-552598 facade-majority (2.1.88 match: removeApiKey, 0.746)
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
//@ chunk-exfmq47h.js:552598-552718 layout
async function removeKeychainApiKey() {
  try {
    await noopAsync();
  } catch (error) {
    logForDebugging(`Failed to remove API key from macOS keychain: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-exfmq47h.js:552718-553136 layout
/**
 * 由新令牌（与旧记录）构造要存储的 OAuth 令牌对象：令牌、过期时间、权限、订阅类型（登录时直接采用，刷新时按来源与可信度合并）、限流档位与 clientId。
 */
function buildStoredOAuthTokens(previous, tokens, reason = "refresh") {
  let refreshTokenExpiresAt = previous?.refreshTokenExpiresAt;
  let refreshTokenExpiresAt_2 = isPlausibleRefreshTokenExpiry(tokens.refreshTokenExpiresAt)
    ? tokens.refreshTokenExpiresAt
    : undefined;
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    refreshTokenExpiresAt:
      reason === "sign_in"
        ? refreshTokenExpiresAt_2
        : !isPlausibleRefreshTokenExpiry(refreshTokenExpiresAt)
          ? undefined
          : Math.min(refreshTokenExpiresAt, refreshTokenExpiresAt_2 ?? refreshTokenExpiresAt),
    scopes: tokens.scopes,
    ...(reason === "sign_in" ? subscriptionFromSignIn(tokens) : mergeSubscriptionType(previous, tokens)),
    rateLimitTier: tokens.rateLimitTier ?? (reason === "sign_in" ? null : (previous?.rateLimitTier ?? null)),
    clientId: tokens.clientId,
  };
}
//@ chunk-exfmq47h.js:553136-553429 layout
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
//@ chunk-exfmq47h.js:553429-553759 layout
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
//@ chunk-exfmq47h.js:553759-554412 layout
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
  let hasUnmarkedSignInPlan = prevType !== null && previous?.subscriptionTypeSource !== "profile";
  let isProvisional = isProvisionalProfilePlan(previous);
  if (
    (!isProvisional && isProfilePlanDowngrade(prevType, newType)) ||
    (hasUnmarkedSignInPlan && newType === prevType) ||
    (tokens.subscriptionTypeVerifiedAt === undefined && prevType !== null && !isProvisional)
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
//@ chunk-exfmq47h.js:554412-555974 facade-majority
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
    let compromised = isCompromised();
    if (compromised) logEvent("tengu_oauth_token_refresh_lock_compromised_post_post", {});
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
    let adoptedSibling = false;
    let storageBackend = storageKindForTelemetry();
    let saveResult = {
      success: false,
    };
    let failed = false;
    let lastError;
    for (let idx = 0; idx < 3; idx++) {
      if (idx > 0) await sleep(100 * idx);
      adoptedSibling = false;
      failed = false;
      try {
        saveResult = await getSecureStorage().mutate((current) => {
          let refreshToken = current.claudeAiOauth?.refreshToken;
          if (!(
            current.claudeAiOauth !== undefined &&
            current.claudeAiOauth !== null &&
            (refreshToken === "" || refreshToken === postedRefreshToken)
          )) {
            adoptedSibling = true;
            return current;
          }
          return {
            ...current,
            claudeAiOauth: buildStoredOAuthTokens(current.claudeAiOauth, tokens),
          };
        }, credentials);
      } catch (error) {
        logForDebugging(`OAuth refresh CAS save failed: ${errorMessage(error)}`, {
          level: "error",
        });
        saveResult = {
          success: false,
        };
        failed = true;
        lastError = error;
        continue;
      }
      if (adoptedSibling || saveResult.success) break;
    }
    if (failed) clearOAuthTokenCache();
    else {
      let storage = isStorageV5Enabled() && credentials !== undefined ? credentials : undefined;
      let promise = storage && oauthTokenReadMemos.of(getRootSession().host).promise;
      clearOAuthAndKeychainCaches();
      if (storage !== undefined) await primeStoredLogin(storage, promise);
    }
    if (failed)
      logEvent("tengu_oauth_tokens_save_exception", {
        storageBackend,
        ...errorTelemetryFields(lastError),
      });
    if (!adoptedSibling && !failed)
      logEvent(saveResult.success ? "tengu_oauth_tokens_saved" : "tengu_oauth_tokens_save_failed", {
        storageBackend,
      });
    if (compromised)
      logEvent(
        adoptedSibling
          ? "tengu_oauth_refresh_compromised_cas_adopted_sibling"
          : "tengu_oauth_refresh_compromised_cas_saved",
        {},
      );
    else if (adoptedSibling) logEvent("tengu_oauth_refresh_save_adopted_newer_write", {});
    if (adoptedSibling) {
      notifyOAuthTokenReplaced();
      return "adopted_sibling";
    }
    return saveResult.success ? "saved" : "save_failed";
  }
  let saveResult = await saveOAuthTokensIfNeeded(refreshedTokens, credentials);
  clearOAuthTokenCache();
  return saveResult.success ? "saved" : "save_failed";
}
//@ chunk-exfmq47h.js:555974-556009 layout
/**
 * 返回安全存储的类型名（遥测用）。
 */
function storageKindForTelemetry() {
  return storageKindForTelemetry_2(getSecureStorage().name);
}
//@ chunk-exfmq47h.js:556009-556047 facade-majority
var OAUTH_TOKEN_SAVE_FAILED_WARNING = "Failed to save OAuth tokens";
//@ chunk-exfmq47h.js:556047-556132 facade-majority (2.1.88 match: isBigQueryMetricsEnabled, 1)
function isProfilePlanDowngrade(previousType, nextType) {
  return (
    (previousType === "team" || previousType === "enterprise") &&
    nextType !== "team" &&
    nextType !== "enterprise"
  );
}
//@ chunk-exfmq47h.js:556132-556232 facade-majority
function isProvisionalProfilePlan(previous) {
  return previous?.subscriptionTypeSource === "profile" && previous.subscriptionTypeVerifiedAt === undefined;
}
//@ chunk-exfmq47h.js:556232-556333 facade-majority
function isUnmarkedStoredPlan(stored) {
  return (
    stored != null &&
    (stored.subscriptionType ?? null) !== null &&
    stored.subscriptionTypeSource === undefined
  );
}
//@ chunk-exfmq47h.js:556333-556424 layout
/**
 * 取较晚且有效的“订阅类型已验证”时间。
 */
function pickLaterVerifiedAt(verifiedAt, previousVerifiedAt) {
  if (verifiedAt === undefined || previousVerifiedAt === undefined) return verifiedAt ?? previousVerifiedAt;
  return previousVerifiedAt > Date.now() ? verifiedAt : Math.max(verifiedAt, previousVerifiedAt);
}
//@ chunk-exfmq47h.js:556424-557460 facade-majority
async function backfillStoredOAuthTier({
  expectedRefreshToken,
  subscriptionType,
  rateLimitTier,
  verifiedAt,
  originStamped,
  credentials,
}) {
  if (!originStamped) return "unstamped";
  let outcome = "failed";
  try {
    let writeResult = await getSecureStorage().mutate((current) => {
      let claudeAiOauth = current.claudeAiOauth;
      if (!claudeAiOauth || claudeAiOauth.refreshToken !== expectedRefreshToken) {
        outcome = "rotated";
        return current;
      }
      let subscriptionType_2 = claudeAiOauth.subscriptionType ?? null;
      if (subscriptionType_2 !== null && claudeAiOauth.subscriptionTypeSource === "sign_in") {
        outcome = "already_tiered";
        return current;
      }
      if (isUnmarkedStoredPlan(claudeAiOauth) && subscriptionType_2 === subscriptionType) {
        outcome = "confirmed";
        return {
          ...current,
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
        outcome = "downgrade_refused";
        return current;
      }
      outcome = subscriptionType_2 === subscriptionType ? "reverified" : "written";
      return {
        ...current,
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
    if (outcome === "written" || outcome === "reverified" || outcome === "confirmed") {
      if (!writeResult.success) return "failed";
      clearOAuthAndKeychainCaches();
    }
    return outcome;
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
//@ chunk-exfmq47h.js:557460-558724 facade-majority (2.1.88 match: saveOAuthTokensIfNeeded, 0.675)
/**
 * 把 OAuth 令牌写入安全存储的 claudeAiOauth（accessToken/refreshToken/expiresAt/scopes/subscriptionType/rateLimitTier…）；非 claude.ai scope 或仅推理令牌（无 refresh/expires）不保存。
 */
async function saveOAuthTokensIfNeeded(tokens, credentials, reason = "refresh") {
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
    let memos = oauthTokenReadMemos.of(getRootSession().host);
    let replacedTokens;
    let writeResult = await secureStorage.mutate((current) => {
      if (
        reason === "sign_in" &&
        replacedTokens === undefined &&
        current.claudeAiOauth != null &&
        current.claudeAiOauth.accessToken !== accessToken
      )
        replacedTokens = current.claudeAiOauth;
      return {
        ...current,
        claudeAiOauth: buildStoredOAuthTokens(
          current.claudeAiOauth,
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
    }, credentials);
    if (writeResult.success) {
      memos.lastOwnSavedAccessToken = accessToken;
      logEvent("tengu_oauth_tokens_saved", {
        storageBackend,
      });
    } else
      logEvent("tengu_oauth_tokens_save_failed", {
        storageBackend,
      });
    let storage = isStorageV5Enabled() && credentials !== undefined ? credentials : undefined;
    let storageData = storage && memos.promise;
    clearOAuthTokenMemos();
    invalidateAuthDerivedCaches();
    if (storage !== undefined) await primeStoredLogin(storage, storageData);
    return {
      ...writeResult,
      backendName: secureStorage.name,
      ...(replacedTokens !== undefined && {
        replaced: replacedTokens,
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
//@ chunk-exfmq47h.js:558724-558788 layout
/**
 * 进程内记录已知失效的 refresh token；同语句 $i 记录账户冻结（account_on_hold）的令牌，避免反复刷新。
 */
var deadRefreshTokens; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var onHoldRefreshTokens;
deferInit("chunk-exfmq47h.js:558724", () => {
  deadRefreshTokens = identity_2(new Set(), (set) => set.clear());
  onHoldRefreshTokens = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-exfmq47h.js:558788-558893 facade-majority
function getOAuthAccountOnHold() {
  let refreshToken = getClaudeAIOAuthTokens()?.refreshToken;
  if (!refreshToken) return null;
  let holdUrl = onHoldRefreshTokens.get(refreshToken);
  return holdUrl === undefined
    ? null
    : {
        url: holdUrl,
      };
}
//@ chunk-exfmq47h.js:558893-558930 facade-majority
function __resetKnownDeadRefreshTokensForTest() {
  deadRefreshTokens.clear();
  onHoldRefreshTokens.clear();
}
//@ chunk-exfmq47h.js:558930-559469 facade-majority
async function markRefreshTokenDeadAfterInvalidGrant(refreshToken, credentials, error) {
  deadRefreshTokens.add(refreshToken);
  logEvent("tengu_oauth_refresh_token_marked_dead_invalid_grant", {});
  try {
    let matched = false;
    let writeResult = await getSecureStorage().mutate((current) => {
      let claudeAiOauth = current.claudeAiOauth;
      if (!claudeAiOauth || claudeAiOauth.refreshToken !== refreshToken) return current;
      matched = true;
      return {
        ...current,
        claudeAiOauth: {
          ...claudeAiOauth,
          refreshToken: "",
          accessToken: "",
          expiresAt: 0,
          loginEnded: isRefreshTokenExpiredError(error) ? "time_limit" : undefined,
        },
      };
    }, credentials);
    if (matched && writeResult.success) logEvent("tengu_oauth_refresh_token_cleared_on_disk", {});
    else if (matched)
      logForDebugging("OAuth dead-token disk clear: backend write failed", {
        level: "error",
      });
  } catch (error) {
    logForDebugging(`OAuth dead-token disk clear failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-exfmq47h.js:559469-559565 facade-majority
function isOAuthRefreshKnownDead() {
  let known = isRefreshTokenDead(getClaudeAIOAuthTokens());
  if (known !== undefined) return known;
  try {
    return hasDeadStoredRefreshToken(getSecureStorage().read());
  } catch {
    return false;
  }
}
//@ chunk-exfmq47h.js:559565-559686 facade-majority
async function isOAuthRefreshKnownDeadAsync(credentials) {
  let known = isRefreshTokenDead(await getClaudeAIOAuthTokensAsync(credentials));
  if (known !== undefined) return known;
  try {
    return hasDeadStoredRefreshToken(await getSecureStorage().readAsync(credentials));
  } catch {
    return false;
  }
}
//@ chunk-exfmq47h.js:559686-559782 layout
/**
 * 判断刷新令牌是否已失效（空串或已列入吊销表）。
 */
function isRefreshTokenDead(tokens) {
  if (tokens) {
    let refreshToken = tokens.refreshToken;
    return refreshToken === "" || (!!refreshToken && deadRefreshTokens.has(refreshToken));
  }
  if (usesHostProvidedAuth()) return false;
  return;
}
//@ chunk-exfmq47h.js:559782-559840 layout
/**
 * 判断存储的刷新令牌是否为空串（已登出）。
 */
function hasDeadStoredRefreshToken(storageData) {
  return storageData?.claudeAiOauth?.refreshToken === "";
}
//@ chunk-exfmq47h.js:559840-559956 facade-majority
async function storedLoginReachedTimeLimit(credentials) {
  try {
    return (await getSecureStorage().readAsync(credentials))?.claudeAiOauth?.loginEnded === "time_limit";
  } catch {
    return false;
  }
}
//@ chunk-exfmq47h.js:559956-560010 placement (2.1.88 match: CLAUDE_AI_INFERENCE_SCOPE, 1)
/**
 * CLAUDE_CODE_OAUTH_SCOPES（空白分隔）覆盖，否则用默认 ["user:inference"]。旧版名 CLAUDE_AI_INFERENCE_SCOPE 为错配。
 */
function getRequestedOAuthScopes(defaultScopes = ["user:inference"]) {
  return oauthScopesFromEnv() ?? [...defaultScopes];
}
//@ chunk-exfmq47h.js:560179-560366 placement (2.1.88 match: isUsingOAuth, 0.295)
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
//@ chunk-exfmq47h.js:560366-560418 layout
function getLauncherOAuthTokens() {
  let accessToken = usableLauncherHostLoginToken();
  return accessToken === null ? null : isUsingOAuth(accessToken);
}
//@ chunk-exfmq47h.js:560418-560870 fingerprint (2.1.88 match: getClaudeAIOAuthTokens, 0.702)
/**
 * 同步读取 Claude.ai OAuth 令牌：CLAUDE_CODE_OAUTH_TOKEN 优先（包装成无 refreshToken 的令牌对象）；其次 OAuth FD；宿主托管时返回 null；再读安全存储（钥匙串 / .credentials.json）的 claudeAiOauth。
 */
function getClaudeAIOAuthTokens_2() {
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return isUsingOAuth(env.CLAUDE_CODE_OAUTH_TOKEN);
  let oauthTokenFromFd = getOAuthTokenFromFileDescriptor();
  let tokensFromFd = (accessToken) => ({
    accessToken,
    refreshToken: null,
    expiresAt: null,
    scopes: getOauthScopesFromFd() ?? getRequestedOAuthScopes(OAUTH_DEFAULT_SCOPES),
    subscriptionType: env.CLAUDE_CODE_SUBSCRIPTION_TYPE || null,
    rateLimitTier: env.CLAUDE_CODE_RATE_LIMIT_TIER || null,
  });
  if (oauthTokenFromFd && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth()))
    return tokensFromFd(oauthTokenFromFd);
  if (usesHostProvidedAuth()) return null;
  try {
    let oauthData = getSecureStorage().read({
      fromStoreCopy: true,
    })?.claudeAiOauth;
    if (oauthData?.accessToken) return oauthData;
  } catch (error) {
    logError(error);
  }
  if (oauthTokenFromFd) return tokensFromFd(oauthTokenFromFd);
  return null;
}
//@ chunk-exfmq47h.js:560870-561564 layout
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
  sessionOwnerHold = null;
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
//@ chunk-exfmq47h.js:561564-561590 facade-majority
var oauthTokenReadMemos; // deferred: uses OAuthTokenCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:561564", () => {
  oauthTokenReadMemos = new HostScoped(() => new OAuthTokenCache());
});
//@ chunk-exfmq47h.js:561590-561701 facade-majority
/**
 * 当前 OAuth 令牌（按宿主缓存，未缓存时调用 getClaudeAIOAuthTokens，回退宿主启动器注入令牌）。全模块最常用的令牌读取入口。
 */
function getClaudeAIOAuthTokens() {
  if (isBareModeAuthRestricted()) return null;
  let memos = oauthTokenReadMemos.of(getRootSession().host);
  if (memos.value === undefined) memos.value = getClaudeAIOAuthTokens_2();
  return memos.value ?? getLauncherOAuthTokens();
}
//@ chunk-exfmq47h.js:561701-561741 facade-majority
function clearOAuthTokenMemos() {
  oauthTokenReadMemos.of(getRootSession().host).clear();
}
//@ chunk-exfmq47h.js:561741-561859 facade-majority
function getClaudeAIOAuthTokenOrigin() {
  let oAuthTokenOrigin = getOAuthTokenOrigin();
  if (typeof oAuthTokenOrigin === "string") return oAuthTokenOrigin;
  let accessToken = getSecureStorage().read()?.claudeAiOauth?.accessToken;
  return classifyBearerAgainstStore(oAuthTokenOrigin, accessToken);
}
//@ chunk-exfmq47h.js:561859-561998 facade-majority (2.1.88 match: getClaudeAIOAuthTokensAsync, 0.853)
async function getClaudeAIOAuthTokenOriginAsync(credentials) {
  let secureStorage = getOAuthTokenOrigin();
  if (typeof secureStorage === "string") return secureStorage;
  let oauthData = (await getSecureStorage().readAsync(credentials))?.claudeAiOauth?.accessToken;
  return classifyBearerAgainstStore(secureStorage, oauthData);
}
//@ chunk-exfmq47h.js:561998-562050 facade-majority
/**
 * OAuth 令牌是否由环境注入（env 或 fd），这类令牌不会被 CLI 刷新。
 */
function isClaudeAIOAuthTokenHostInjected() {
  let oAuthTokenOrigin = getOAuthTokenOrigin();
  return oAuthTokenOrigin === "env" || oAuthTokenOrigin === "fd";
}
//@ chunk-exfmq47h.js:562050-562208 facade-majority
function managedConfigNotAttemptedInput(ineligibleReason) {
  return {
    ineligibleReason,
    isGateway: getAPIProvider() === "gateway",
    hasEnvAuthToken: Boolean(effectiveAuthTokenEnv()),
    hasApiKeyHelper: Boolean(getConfiguredApiKeyHelper()),
    injectedOAuthToken: () => isClaudeAIOAuthTokenHostInjected(),
  };
}
//@ chunk-exfmq47h.js:562208-562286 facade-majority
function storeRecheckNeeded(origin) {
  if (origin === "env") return false;
  if (origin === "fd") return isOauthTokenFromBgSnapshot() && !isHostManagedProviderAuth();
  return true;
}
//@ chunk-exfmq47h.js:562286-562372 facade-majority
function isLoginStashedInTokenSlot() {
  let loginStashedInTokenSlot = getLoginStashedInTokenSlot();
  return (
    loginStashedInTokenSlot !== null &&
    (env.CLAUDE_CODE_OAUTH_TOKEN === loginStashedInTokenSlot ||
      getOauthTokenFromFd() === loginStashedInTokenSlot)
  );
}
//@ chunk-exfmq47h.js:562372-562620 layout
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
  let fdToken = env.CLAUDE_CODE_OAUTH_TOKEN ? null : getOAuthTokenFromFileDescriptor();
  if (fdToken && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth())) return "fd";
  return {
    bearer: claudeAIOAuthTokens.accessToken,
    fdToken,
  };
}
//@ chunk-exfmq47h.js:562620-562718 layout
function classifyBearerAgainstStore({ bearer, fdToken }, storedAccessToken) {
  if (storedAccessToken && storedAccessToken === bearer) return "store";
  if (fdToken && bearer === fdToken) return "fd";
  return "none";
}
//@ chunk-exfmq47h.js:562718-562756 layout
function clearOAuthCachesForReload() {
  clearOAuthTokenMemos();
  clearKeychainCache();
  if (isStorageV5Enabled()) invalidatePlainTextStoreCopy();
}
//@ chunk-exfmq47h.js:562756-562785 layout
function invalidateAuthDerivedCaches() {
  clearBetasCaches();
  emitCredentialChange();
  dropInFlightComposes();
}
//@ chunk-exfmq47h.js:562785-562815 layout
function clearOAuthAndKeychainCaches() {
  clearOAuthTokenMemos();
  clearKeychainCache();
  invalidateAuthDerivedCaches();
}
//@ chunk-exfmq47h.js:562815-562847 facade-majority
function clearOAuthTokenCache() {
  clearOAuthAndKeychainCaches();
  if (isStorageV5Enabled()) invalidatePlainTextStoreCopy();
}
//@ chunk-exfmq47h.js:562847-562940 facade-majority
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
  clearFileReferenceHintLatches();
  if (isStorageV5Enabled()) invalidatePlainTextStoreCopy();
}
//@ chunk-exfmq47h.js:562940-562991 facade-majority
function _resetCredentialsChangeCheckForTesting() {
  oauthTokenReadMemos.of(getRootSession().host).resetChangeCheck();
}
//@ chunk-exfmq47h.js:562991-563455 facade-majority
async function primeStoredLogin(storage, pendingRead) {
  if (!startupReadsStoredLogin()) return;
  let memos = oauthTokenReadMemos.of(getRootSession().host);
  let version;
  try {
    let probe = await storage.probeCredentials();
    version = probe.state === "present" ? probe.version : undefined;
  } catch (error) {
    logForDebugging(`Credentials version prime failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  await pendingRead?.catch(() => null);
  await memos.promise?.catch(() => null);
  memos.promise = null;
  if (version !== undefined) memos.lastCredentialsVersion = version;
  let storedOAuthTokens = readStoredOAuthTokensAsync(storage);
  memos.promise = storedOAuthTokens;
  if ((await storedOAuthTokens) === null) {
    if (version !== undefined) memos.lastCredentialsVersion = undefined;
    if (memos.promise === storedOAuthTokens) memos.promise = null;
  }
  memos.value = undefined;
}
//@ chunk-exfmq47h.js:563455-563682 layout
async function readStoredOAuthTokensAsync(credentials) {
  try {
    let claudeAiOauth = (await getSecureStorage().readAsync(credentials))?.claudeAiOauth;
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
//@ chunk-exfmq47h.js:563682-564115 layout
/**
 * 检测凭证是否被别的进程改过（storage v5 比 version，文件比 mtime），变化则清缓存并发出 credentialsChangedOnDisk 信号。
 */
async function invalidateOAuthCacheIfDiskChanged(memos, credentials) {
  if (isStorageV5Enabled() && credentials !== undefined) {
    let probe = await credentials.probeCredentials();
    if (probe.state !== "present") return recheckStoredOAuthToken(memos, credentials);
    if (probe.version !== memos.lastCredentialsVersion) {
      memos.lastCredentialsVersion = probe.version;
      clearOAuthTokenCache();
      emitCredentialsChangedOnDisk(memos);
      return;
    }
    return recheckUnusableOAuthToken(memos, credentials);
  }
  let mtimeMs;
  try {
    let configDir = keychainProjectDirs();
    if (configDir === null) return recheckStoredOAuthToken(memos, credentials);
    mtimeMs = (await stat(join(configDir, ".credentials.json"))).mtimeMs;
  } catch {
    return recheckStoredOAuthToken(memos, credentials);
  }
  if (mtimeMs !== memos.lastCredentialsMtimeMs) {
    memos.lastCredentialsMtimeMs = mtimeMs;
    clearOAuthTokenCache();
    emitCredentialsChangedOnDisk(memos);
    return;
  }
  await recheckUnusableOAuthToken(memos, credentials);
}
//@ chunk-exfmq47h.js:564115-564436 layout
async function recheckUnusableOAuthToken(memos, credentials) {
  try {
    if (!isFirstPartyProvider()) return;
    let cachedTokens = memos.promise ? await memos.promise.catch(() => null) : memos.value;
    if (cachedTokens === undefined) return;
    if (cachedTokens !== null && !isRefreshTokenDead(cachedTokens)) return;
    let now = Date.now();
    if (now - memos.lastUnusableTokenRecheckAt < KEYCHAIN_CACHE_TTL_MS) return;
    memos.lastUnusableTokenRecheckAt = now;
    if (cachedTokens !== null) memos.lastKeychainAccessToken = cachedTokens.accessToken;
    await recheckStoredOAuthToken(memos, credentials);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-exfmq47h.js:564436-564504 layout
function emitCredentialsChangedOnDisk(memos) {
  try {
    memos.credentialsChangedOnDisk.emit();
  } catch (e) {
    logError(e);
  }
}
//@ chunk-exfmq47h.js:564504-564577 facade-majority
function subscribeOAuthCredentialsChangedOnDisk(host, listener) {
  return oauthTokenReadMemos.of(host).credentialsChangedOnDisk.subscribe(listener);
}
//@ chunk-exfmq47h.js:564577-564640 facade-majority
function wasOAuthAccessTokenSavedByThisProcess(host, accessToken) {
  return oauthTokenReadMemos.of(host).lastOwnSavedAccessToken === accessToken;
}
//@ chunk-exfmq47h.js:564640-564679 facade-majority
function loginSwitchMemo() {
  return oauthTokenReadMemos.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:564679-564730 facade-majority
async function checkOAuthCredentialsChangedOnDisk(host, credentials) {
  clearKeychainCache();
  await invalidateOAuthCacheIfDiskChanged(oauthTokenReadMemos.of(host), credentials);
}
//@ chunk-exfmq47h.js:564730-564887 layout
async function recheckStoredOAuthToken(memos, credentials) {
  memos.clear();
  if (isStorageV5Enabled()) invalidatePlainTextStoreCopy();
  let accessToken = (await getClaudeAIOAuthTokensAsync(credentials))?.accessToken ?? null;
  if (accessToken !== memos.lastKeychainAccessToken) {
    memos.lastKeychainAccessToken = accessToken;
    invalidateAuthDerivedCaches();
    emitCredentialsChangedOnDisk(memos);
  }
}
//@ chunk-exfmq47h.js:564887-564921 layout
var TOKEN_STORE_TIERS = ["bare", "store", "backend"];
//@ chunk-exfmq47h.js:564921-564952 layout
function isLoginOffFirstParty(flag) {
  return flag && !isFirstPartyProvider();
}
//@ chunk-exfmq47h.js:564952-565008 layout
function pending401HandlerKey(accessToken, tier, optedIn) {
  return `${accessToken}|${tier}${optedIn ? "|opted-in" : ""}`;
}
//@ chunk-exfmq47h.js:565008-565165 layout
function getTokenStoreTier(credentials, storageV5) {
  if (
    !(isStorageV5Enabled() && credentials !== undefined) ||
    isBareModeAuthRestricted() ||
    env.CLAUDE_CODE_OAUTH_TOKEN
  )
    return "bare";
  if (getOAuthTokenFromFileDescriptor() && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth()))
    return "bare";
  return storageV5 !== undefined ? "backend" : "store";
}
//@ chunk-exfmq47h.js:565165-565252 layout
/**
 * 从当前令牌层级向下查找可用的令牌。
 */
function findTokenInLowerTier(lookup, tier) {
  for (let candidateTier of TOKEN_STORE_TIERS.slice(TOKEN_STORE_TIERS.indexOf(tier))) {
    let entry = lookup(candidateTier);
    if (entry) return entry;
  }
  return;
}
//@ chunk-exfmq47h.js:565252-565363 layout
function findHigherTierToken(lookup, tier) {
  for (let j = TOKEN_STORE_TIERS.indexOf(tier) - 1; j >= 0; j--) {
    let candidateTier = TOKEN_STORE_TIERS[j];
    let entry = candidateTier === undefined ? undefined : lookup(candidateTier);
    if (entry) return entry;
  }
  return;
}
//@ chunk-exfmq47h.js:565363-565516 facade-majority
async function recoverCloudSessionsBearer(accessToken, credentials, storageV5, refusal = "refused") {
  let hostResult = await recoverHostSessionsBearer(accessToken, refusal);
  if (hostResult !== "not_held") return hostResult === "recovered" || hasClaudeAISignInToken();
  if ((await ensureHostSessionsBearer()) !== null) return true;
  return handleOAuth401Error(accessToken, credentials, storageV5);
}
//@ chunk-exfmq47h.js:565516-566053 facade-majority (2.1.88 match: checkAndRefreshOAuthTokenIfNeeded, 0.188)
/**
 * 检查并按需刷新 OAuth 令牌的入口：按（令牌, 存储层级, 是否非第一方登录）合并并发调用，再走 checkAndRefreshOAuthTokenIfNeededImpl。
 */
function handleOAuth401Error(
  accessToken,
  credentials,
  storageV5,
  { usesLoginOffFirstParty: loginOffFirstParty = false, onForcedRefreshOutcome } = {},
) {
  let memos = oauthTokenReadMemos.of(getRootSession().host);
  let promise = getTokenStoreTier(credentials, storageV5);
  let optedIn = isLoginOffFirstParty(loginOffFirstParty);
  let lookup = (tier) => memos.pending401Handlers.get(pending401HandlerKey(accessToken, tier, optedIn));
  let tokenInLowerTier = findTokenInLowerTier(lookup, promise);
  if (tokenInLowerTier) {
    if (!onForcedRefreshOutcome) return tokenInLowerTier.promise;
    return tokenInLowerTier.promise.then((result) => {
      if (tokenInLowerTier.forcedOutcome !== undefined)
        onForcedRefreshOutcome(tokenInLowerTier.forcedOutcome);
      return result;
    });
  }
  let key = pending401HandlerKey(accessToken, promise, optedIn);
  let entry = {
    promise: Promise.resolve(false),
  };
  let startRequest = () =>
    handleOAuth401ErrorImpl(accessToken, credentials, storageV5, loginOffFirstParty, (outcome) => {
      entry.forcedOutcome = outcome;
      onForcedRefreshOutcome?.(outcome);
    });
  let higherTierToken = findHigherTierToken(lookup, promise);
  entry.promise = (
    higherTierToken ? higherTierToken.promise.catch(() => false).then(startRequest) : startRequest()
  ).finally(() => {
    memos.pending401Handlers.delete(key);
  });
  memos.pending401Handlers.set(key, entry);
  return entry.promise;
}
//@ chunk-exfmq47h.js:566053-566375 facade-majority
/**
 * 轮询 CLAUDE_CODE_OAUTH_TOKEN / OAuth FD，直到出现与失败令牌不同的新令牌或超时。
 */
async function waitForRotatedEnvToken(options) {
  let pollMs = options.pollMs ?? 2000;
  let readToken =
    options.readToken ??
    (() => env.CLAUDE_CODE_OAUTH_TOKEN ?? getOAuthTokenFromFileDescriptor() ?? undefined);
  let sleeper = options.sleeper ?? ((ms) => sleep(ms));
  let deadline = Date.now() + options.timeoutMs;
  while (Date.now() < deadline) {
    let token = readToken();
    if (token && token !== options.failedAccessToken) return true;
    await sleeper(Math.min(pollMs, Math.max(1, deadline - Date.now())));
  }
  let token = readToken();
  return Boolean(token && token !== options.failedAccessToken);
}
//@ chunk-exfmq47h.js:566375-566437 layout
function isRemoteSessionChild() {
  return Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID);
}
//@ chunk-exfmq47h.js:566437-566509 facade-majority
function isUserExportedOAuthEnvToken() {
  return Boolean(env.CLAUDE_CODE_OAUTH_TOKEN) && !isRemoteSessionChild() && !withoutSSHTunnelVars();
}
//@ chunk-exfmq47h.js:566509-566631 facade-majority
function injectedOAuthTokenRecovery() {
  if (getSdkOAuthTokenRefreshCallback() !== null || sdkHostOffersOAuthRefresh()) return "sdk_host_refresh";
  if (isRemoteSessionChild()) return "runner_rotation";
  return isUserExportedOAuthEnvToken() ? "none" : undefined;
}
//@ chunk-exfmq47h.js:566631-566723 layout
/**
 * 401 后等待外部令牌轮换的时长：CLAUDE_CODE_OAUTH_401_WAIT_MS，远程会话有默认值，否则 0。
 */
function getOAuth401WaitMs() {
  let CLAUDE_CODE_OAUTH_401_WAIT_MS = env.CLAUDE_CODE_OAUTH_401_WAIT_MS;
  if (CLAUDE_CODE_OAUTH_401_WAIT_MS !== undefined) return CLAUDE_CODE_OAUTH_401_WAIT_MS;
  return isRemoteSessionChild() ? GATEWAY_HEALTH_TIMEOUT_MS : 0;
}
//@ chunk-exfmq47h.js:566723-566758 layout
class AuthFailureClock {
  firstUnrecoveredAtMs = null;
}
//@ chunk-exfmq47h.js:566758-566784 facade-majority
var authFailureClocks; // deferred: uses AuthFailureClock of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:566758", () => {
  authFailureClocks = new HostScoped(() => new AuthFailureClock());
});
//@ chunk-exfmq47h.js:566784-567174 facade-majority
/**
 * 远程子进程认证连续失败计时：超过 CLAUDE_CODE_AUTH_FAIL_EXIT_MS（默认 10 分钟）返回 exit，恢复后清零。
 */
function noteAuthRecoveryOutcome(options) {
  let nowMs = options.nowMs ?? Date.now();
  let clocks = authFailureClocks.of(getRootSession().host);
  if (options.recovered) {
    clocks.firstUnrecoveredAtMs = null;
    return "continue";
  }
  if (!(options.isRemoteChild ?? isRemoteSessionChild())) return "continue";
  let thresholdMs = options.thresholdMs ?? env.CLAUDE_CODE_AUTH_FAIL_EXIT_MS ?? 600000;
  if (thresholdMs <= 0) return "continue";
  if (clocks.firstUnrecoveredAtMs === null) {
    clocks.firstUnrecoveredAtMs = nowMs;
    return "continue";
  }
  if (nowMs - clocks.firstUnrecoveredAtMs >= thresholdMs) return "exit";
  return "continue";
}
//@ chunk-exfmq47h.js:567174-567232 facade-majority
function resetAuthFailureTracking() {
  authFailureClocks.of(getRootSession().host).firstUnrecoveredAtMs = null;
}
//@ chunk-exfmq47h.js:567232-567334 layout
function notifyOAuthTokenReplaced(previousToken) {
  dropAuthenticatedAccountForNewToken(false);
  import("./programUseCase.js").then(({ refetchForAdoptedToken }) => refetchForAdoptedToken(), logError);
  forgetHeldHostSessionsBearer(previousToken);
}
//@ chunk-exfmq47h.js:567334-570602 layout
/**
 * 处理 API 返回 401：先清令牌缓存；没有 refresh token 时尝试宿主启动器或 SDK getOAuthToken 回调换新令牌（写回 CLAUDE_CODE_OAUTH_TOKEN）；有则强制刷新。结果写 oauth_401_recovery 诊断。
 */
async function handleOAuth401ErrorImpl(
  failedAccessToken,
  credentials,
  storageV5,
  usesLoginOffFirstParty = false,
  onOutcome,
) {
  clearOAuthTokenCache();
  let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(credentials);
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
      } else if (await renewLauncherHostLogin(failedAccessToken)) {
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
        let newToken = await sdkOAuthTokenRefreshCallback();
        if (newToken && newToken !== failedAccessToken) {
          let currentToken =
            env.CLAUDE_CODE_OAUTH_TOKEN ?? claudeAIOAuthTokens?.accessToken ?? failedAccessToken;
          if (newToken !== currentToken) {
            process.env.CLAUDE_CODE_OAUTH_TOKEN = newToken;
            clearOAuthTokenCache();
            notifyOAuthTokenReplaced(currentToken);
          }
          logEvent("tengu_oauth_401_sdk_callback_refreshed", {});
          logFeatureOk("oauth_401_recovery");
          noteAuthRecoveryOutcome({
            recovered: true,
          });
          return true;
        }
        logForDebugging(
          newToken === null
            ? "SDK getOAuthToken callback returned null (no token available)"
            : "SDK getOAuthToken callback returned the same expired token; treating as no refresh",
          {
            level: newToken === null ? "debug" : "error",
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
    let userEnvTokenKept = false;
    let hostTokenRefused = false;
    if (!usesHostProvidedAuth()) {
      userEnvTokenKept = isUserExportedOAuthEnvToken();
      hostTokenRefused =
        !env.CLAUDE_CODE_OAUTH_TOKEN &&
        sdkHostOffersOAuthRefresh() &&
        Boolean(getOAuthTokenFromFileDescriptor()) &&
        (hasPossibleCredentialFromDescriptor("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR") ||
          isLoginStashedInTokenSlot()) &&
        !isOauthTokenFromBgSnapshot();
      if (userEnvTokenKept)
        logForDebugging(
          "OAuth 401: keeping the user-supplied CLAUDE_CODE_OAUTH_TOKEN instead of adopting the stored credential. Mint a fresh token with `claude setup-token` and restart with it, or unset the variable and run /login.",
          {
            level: "error",
          },
        );
      else if (hostTokenRefused)
        logForDebugging(
          "OAuth 401: the login this session is using was refused. The login saved on this machine was not used because it may be a different account. Sign in again in the app that started this session, or run /login.",
          {
            level: "error",
          },
        );
      else if (env.CLAUDE_CODE_OAUTH_TOKEN || getOAuthTokenFromFileDescriptor())
        try {
          let claudeAiOauth = (await getSecureStorage().readAsync(credentials))?.claudeAiOauth;
          if (
            claudeAiOauth?.accessToken &&
            claudeAiOauth.accessToken !== failedAccessToken &&
            !isOAuthTokenExpired(claudeAiOauth.expiresAt)
          ) {
            let hadSshTunnelVars = Boolean(withoutSSHTunnelVars());
            if (env.CLAUDE_CODE_OAUTH_TOKEN) process.env.CLAUDE_CODE_OAUTH_TOKEN = claudeAiOauth.accessToken;
            if (
              isStorageV5Enabled() && credentials !== undefined
                ? await getOAuthTokenFromFileDescriptorAsync(credentials)
                : getOAuthTokenFromFileDescriptor()
            ) {
              setOauthTokenFromFd(claudeAiOauth.accessToken);
              setOauthScopesFromFd(claudeAiOauth.scopes);
            }
            setLoginStashedInTokenSlot(hadSshTunnelVars ? null : claudeAiOauth.accessToken);
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
    let hasTokenSlot =
      Boolean(process.env.CLAUDE_CODE_OAUTH_TOKEN) || Boolean(getOAuthTokenFromFileDescriptor());
    if (hasTokenSlot) {
      let waitMs = getOAuth401WaitMs();
      if (waitMs > 0) {
        logForDebugging(`OAuth 401 recovery: waiting up to ${waitMs}ms for a rotated env token`);
        if (
          await waitForRotatedEnvToken({
            failedAccessToken,
            timeoutMs: waitMs,
          })
        ) {
          if (
            isStorageV5Enabled() && credentials !== undefined
              ? await getOAuthTokenFromFileDescriptorAsync(credentials)
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
      userEnvTokenKept
        ? "oauth_401_skipped_user_env_token"
        : hostTokenRefused
          ? "oauth_401_skipped_sdk_host_fd_token"
          : hasTokenSlot || isLauncherStartedProcess()
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
  if (claudeAIOAuthTokens.accessToken !== failedAccessToken) {
    notifyOAuthTokenReplaced();
    logEvent("tengu_oauth_401_recovered_from_keychain", {});
    logFeatureOk("oauth_401_recovery");
    noteAuthRecoveryOutcome({
      recovered: true,
    });
    return true;
  }
  let refreshOptions = {
    force: true,
    entryAccessToken: failedAccessToken,
    credentials,
    storageV5,
    usesLoginOffFirstParty,
  };
  if (!onOutcome) return checkAndRefreshOAuthTokenIfNeeded(refreshOptions);
  let refreshOutcome = await checkAndRefreshOAuthTokenIfNeededWithOutcome(refreshOptions);
  onOutcome(refreshOutcome);
  return refreshOutcome === "refreshed";
}
//@ chunk-exfmq47h.js:570602-570806 facade-majority
/**
 * 异步读取 OAuth 令牌并缓存 promise；调用失败时清掉缓存的 promise。
 */
function getClaudeAIOAuthTokensAsync(credentials) {
  if (isBareModeAuthRestricted()) return Promise.resolve(null);
  let memos = oauthTokenReadMemos.of(getRootSession().host);
  let promise = memos.promise;
  if (!promise) {
    let oAuthBearerOrigin = getOAuthBearerOriginAsync(credentials);
    promise = oAuthBearerOrigin;
    memos.promise = oAuthBearerOrigin;
    oAuthBearerOrigin.catch(() => {
      if (memos.promise === oAuthBearerOrigin) memos.promise = null;
    });
  }
  return isLauncherStartedProcess() ? promise.then((tokens) => tokens ?? getLauncherOAuthTokens()) : promise;
}
//@ chunk-exfmq47h.js:570806-571081 fingerprint (2.1.88 match: getClaudeAIOAuthTokensAsync, 1)
/**
 * 异步版 getClaudeAIOAuthTokens，支持 storage v5 后端读取。
 */
async function getOAuthBearerOriginAsync(credentials) {
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return getClaudeAIOAuthTokens();
  let fdToken =
    isStorageV5Enabled() && credentials !== undefined
      ? await getOAuthTokenFromFileDescriptorAsync(credentials)
      : getOAuthTokenFromFileDescriptor();
  if (fdToken && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth()))
    return getClaudeAIOAuthTokens();
  if (usesHostProvidedAuth()) return null;
  try {
    let oauthData = (await getSecureStorage().readAsync(credentials))?.claudeAiOauth;
    if (oauthData?.accessToken) return oauthData;
  } catch (error) {
    logError(error);
  }
  if (fdToken) return getClaudeAIOAuthTokens();
  return null;
}
//@ chunk-exfmq47h.js:571081-571142 facade-majority
async function readFreshOAuthAccessToken(credentials) {
  clearOAuthCachesForReload();
  return (await getClaudeAIOAuthTokensAsync(credentials))?.accessToken;
}
//@ chunk-exfmq47h.js:571142-571271 facade-majority
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
//@ chunk-exfmq47h.js:571271-571353 facade-majority
async function primeStoredLoginCopy(credentials) {
  if (!startupReadsStoredLogin()) return;
  try {
    await getSecureStorage().readAsync(credentials);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-exfmq47h.js:571353-571497 facade-majority
function sameOwnerAccount(previousAccount, nextAccount) {
  return (
    Boolean(previousAccount?.accountUuid) &&
    previousAccount?.accountUuid === nextAccount?.accountUuid &&
    (previousAccount?.organizationUuid || undefined) === (nextAccount?.organizationUuid || undefined)
  );
}
//@ chunk-exfmq47h.js:571497-571704 facade-majority (2.1.88 match: hasVoiceAuth, 0.488)
/**
 * 取语音所需的 OAuth access token 与账户/组织 UUID，没有 token 返回 undefined。
 */
async function readFreshOAuthCredentialSnapshot(config, credentials) {
  clearOAuthCachesForReload();
  let [claudeAIOAuthTokens, account] = await Promise.all([
    getClaudeAIOAuthTokensAsync(credentials),
    isAnthropicAuthEnabled() ? readFreshOauthAccountFromDisk(config) : undefined,
  ]);
  if (!claudeAIOAuthTokens?.accessToken) return;
  return {
    accessToken: claudeAIOAuthTokens.accessToken,
    accountUuid: account?.accountUuid,
    organizationUuid: account?.organizationUuid,
  };
}
//@ chunk-exfmq47h.js:571704-571781 facade-majority
async function readStoredLoginOrganizationAfresh(config) {
  let freshOauthAccountFromDisk = await readFreshOauthAccountFromDisk(config);
  return normalizeUuidOrNull(freshOauthAccountFromDisk?.organizationUuid) ?? null;
}
//@ chunk-exfmq47h.js:571781-572117 layout
/**
 * 收集 OAuth 刷新锁争用信息：判断争用的是当前锁文件还是旧锁文件，读取其修改时间算出锁已存在的时长。
 */
async function getRefreshLockInfo(err, tokens) {
  let file =
    typeof err === "object" && err !== null && "file" in err && typeof err.file === "string"
      ? err.file
      : undefined;
  let isCurrentLock = file === undefined || resolve(file) === resolve(tokens);
  let lockfilePath = isCurrentLock ? oauthRefreshLockOptions(tokens).lockfilePath : file;
  let lockAgeMs;
  let mtimeMs;
  try {
    let stats = await stat(lockfilePath);
    mtimeMs = stats.mtimeMs;
    lockAgeMs = Math.max(0, Math.round(Date.now() - stats.mtimeMs));
  } catch {
    lockAgeMs = undefined;
  }
  return {
    contendedLock: isCurrentLock ? lit("current") : lit("legacy"),
    lockAgeMs,
    mtimeMs,
  };
}
//@ chunk-exfmq47h.js:572117-572129 layout
/**
 * 观察 OAuth 刷新锁的间隔（7.5 秒）。
 */
var REFRESH_LOCK_OBSERVE_MS = 7500;
//@ chunk-exfmq47h.js:572129-572250 layout
function sameLockObservation(observation, refreshedTokens) {
  return (
    observation.mtimeMs !== undefined &&
    refreshedTokens.mtimeMs !== undefined &&
    observation.contendedLock === refreshedTokens.contendedLock &&
    observation.mtimeMs === refreshedTokens.mtimeMs
  );
}
//@ chunk-exfmq47h.js:572250-572447 facade-majority
function oauthRefreshLockOptions(configDir, onCompromised) {
  return {
    lockfilePath: join(configDir, ".oauth_refresh.lock"),
    realpath: false,
    stale: 60000,
    update: 5000,
    onCompromised: (error) => {
      logForDebugging(`OAuth refresh lock compromised: ${error.message}`, {
        level: "error",
      });
      onCompromised?.(error);
    },
  };
}
//@ chunk-exfmq47h.js:572447-572509 layout (2.1.88 match: getTaskListLockPath, 1)
/**
 * 返回 realpath(path)+".lock" 锁文件路径。
 */
async function getLockfilePathFor(taskListId) {
  return `${await realpath(taskListId).catch(() => taskListId)}.lock`;
}
//@ chunk-exfmq47h.js:572509-572676 facade-majority
class OAuthRefreshLockContendedError extends Error {
  constructor(attempts) {
    super(`Lock acquisition failed after ${attempts} attempts: another process is refreshing`);
    this.name = "OAuthRefreshLockContendedError";
  }
}
//@ chunk-exfmq47h.js:572676-573436 facade-majority
async function acquireOAuthRefreshLock(configDir) {
  let compromised = false;
  let abortController = new AbortController();
  let onCompromised = () => {
    compromised = true;
    abortController.abort();
  };
  let lockOptions = oauthRefreshLockOptions(configDir, onCompromised);
  let releaseCurrentLock = await lock(configDir, {
    ...lockOptions,
    ...getFsSettler(lockOptions.lockfilePath),
  });
  let dir = await getLockfilePathFor(configDir);
  let releaseLegacyLock = null;
  try {
    releaseLegacyLock = await lock(dir, {
      ...oauthRefreshLockOptions(configDir, onCompromised),
      lockfilePath: dir,
      ...getFsSettler(dir),
    });
  } catch (error) {
    if (error.code === "ELOCKED") {
      logEvent("tengu_oauth_refresh_legacy_lock_contended", {});
      await releaseCurrentLock().catch((error) =>
        isFsInaccessible(error) || compromised
          ? logForDebugging(`OAuth refresh new-lock release failed: ${error}`)
          : logError(error),
      );
      throw error;
    }
    if (isFsInaccessible(error)) logForDebugging(`OAuth refresh legacy-lock acquire failed: ${error}`);
    else logError(error);
  }
  let endHold = beginOAuthRefreshLockHold();
  let ownerRecord = await writeLockOwnerRecord({
    claudeDir: configDir,
    lockfilePath: oauthRefreshLockOptions(configDir).lockfilePath,
    legacyLockfilePath: releaseLegacyLock ? dir : null,
  });
  return {
    isCompromised: () => compromised,
    signal: abortController.signal,
    release: async () => {
      try {
        if (ownerRecord !== null) await removeOwnLockOwnerRecord(configDir, ownerRecord);
        if (releaseLegacyLock)
          await releaseLegacyLock().catch((error) =>
            isFsInaccessible(error) || compromised
              ? logForDebugging(`OAuth refresh legacy-lock release failed: ${error}`)
              : logError(error),
          );
        await releaseCurrentLock();
      } finally {
        endHold();
      }
    },
  };
}
//@ chunk-exfmq47h.js:573436-573466 layout
/**
 * 记录 OAuth 刷新锁的持有数与释放回调，供退出前等待刷新完成。
 */
class OauthRefreshLockHolds {
  held = 0;
  released = null;
}
//@ chunk-exfmq47h.js:573466-573492 facade-majority
var oauthRefreshLockHolds; // deferred: uses OauthRefreshLockHolds of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:573466", () => {
  oauthRefreshLockHolds = new HostScoped(() => new OauthRefreshLockHolds());
});
//@ chunk-exfmq47h.js:573492-573623 facade-majority
function beginOAuthRefreshLockHold() {
  let holdState = onProcessRootHost(oauthRefreshLockHolds);
  holdState.held++;
  let released = true;
  return () => {
    if (!released) return;
    released = false;
    if (--holdState.held === 0) {
      holdState.released?.resolve();
      holdState.released = null;
    }
  };
}
//@ chunk-exfmq47h.js:573623-573741 facade-majority
function waitForOAuthRefreshLocksReleased() {
  let holdState = onProcessRootHost(oauthRefreshLockHolds);
  if (holdState.held === 0) return null;
  holdState.released ??= Promise.withResolvers();
  return holdState.released.promise;
}
//@ chunk-exfmq47h.js:573741-573763 facade-majority
/**
 * 退出前等待刷新完成的轮询间隔（250 毫秒）。
 */
var OAUTH_REFRESH_EXIT_WAIT_CAP_MS = 2000;
var OAUTH_REFRESH_EXIT_DEADLINE_MS = 8500;
//@ chunk-exfmq47h.js:573763-573835 facade-majority
function oauthRefreshExitCapMs() {
  return exitWaitsForOAuthRefreshUntilDeadline()
    ? Math.max(OAUTH_REFRESH_EXIT_WAIT_CAP_MS, OAUTH_REFRESH_EXIT_DEADLINE_MS - process.uptime() * 1000)
    : OAUTH_REFRESH_EXIT_WAIT_CAP_MS;
}
//@ chunk-exfmq47h.js:573835-573846 layout
var OAUTH_REFRESH_EXIT_WAIT_STEP_MS = 250;
//@ chunk-exfmq47h.js:573846-574127 facade-majority
async function waitForInFlightOAuthRefresh(timeoutMs) {
  try {
    let released = waitForOAuthRefreshLocksReleased();
    if (released === null) return true;
    let finishPromise =
      (await withDeadline(
        released.then(() => true),
        timeoutMs,
      )) ?? false;
    if (!finishPromise) {
      logForDebugging(`OAuth refresh still in flight after ${timeoutMs}ms; exiting without waiting further`);
      await withDeadline(
        logFeatureSadAsync("oauth_token_refresh", "exit_wait_timeout").catch(() => {}),
        OAUTH_REFRESH_EXIT_WAIT_STEP_MS,
      );
    }
    return finishPromise;
  } catch {
    return false;
  }
}
//@ chunk-exfmq47h.js:574127-574150 layout
// deferred: uses oauthRefreshExitCapMs of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:574127", () => {
  registerOAuthRefreshExitWait((exitCapMs = oauthRefreshExitCapMs()) =>
    waitForInFlightOAuthRefresh(exitCapMs),
  );
});
//@ chunk-exfmq47h.js:574150-574159 layout
/**
 * 刷新令牌的最大尝试次数（5）。
 */
var MAX_REFRESH_ATTEMPTS = 5;
//@ chunk-exfmq47h.js:574159-574811 facade-majority
async function withOAuthRefreshLock(run, credentials) {
  if (isDiskless()) {
    logFeatureBad("oauth_token_refresh", "oauth_refresh_diskless");
    throw Error("This hosted session (claude-code-server) cannot refresh an OAuth token");
  }
  let configDir = getProjectDirsUpToHome();
  await getFsImplementation().mkdir(configDir);
  let lockHandle;
  let attempts = 0;
  while (!lockHandle) {
    attempts++;
    try {
      lockHandle = await acquireOAuthRefreshLock(configDir);
    } catch (error) {
      if (error.code === "ELOCKED") {
        if (attempts < MAX_REFRESH_ATTEMPTS) {
          await sleep(1000 + Math.random() * 1000);
          continue;
        }
        throw new OAuthRefreshLockContendedError(attempts);
      }
      throw error;
    }
  }
  try {
    clearOAuthTokenCache();
    if ((await getSecureStorage().readAsyncStrict?.(credentials)) === READ_FAILED)
      throw new OAuthRefreshLockContendedError(attempts);
    let lockedTokens = await getClaudeAIOAuthTokensAsync(credentials);
    return await run({
      lockedTokens,
      lockAttempts: attempts,
      isCompromised: lockHandle.isCompromised,
      signal: lockHandle.signal,
    });
  } finally {
    try {
      await lockHandle.release();
    } catch (error) {
      if (isFsInaccessible(error) || lockHandle.isCompromised())
        logForDebugging(`OAuth refresh lock release failed: ${error}`);
      else logError(error);
    }
  }
}
//@ chunk-exfmq47h.js:574811-574928 facade-majority
/**
 * 锁超时/忙碌后可重试的结束原因集合。
 */
var TOKEN_REFRESH_OUTCOMES_BEFORE_POST; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAY_RETRY_AFTER_LOCK_REFUSAL;
deferInit("chunk-exfmq47h.js:574811", () => {
  TOKEN_REFRESH_OUTCOMES_BEFORE_POST = new Set(["lock_timeout", "lock_busy", "lock_error", "lock_disk_full"]);
  MAY_RETRY_AFTER_LOCK_REFUSAL = new Set(["lock_timeout", "lock_busy"]);
});
//@ chunk-exfmq47h.js:574928-575029 facade-majority
function isAuthFailureWorthRetrying(errorCode, observation) {
  return (
    errorCode !== undefined &&
    MAY_RETRY_AFTER_LOCK_REFUSAL.has(errorCode) &&
    (observation === undefined ||
      (observation.outcome !== undefined && TOKEN_REFRESH_OUTCOMES_BEFORE_POST.has(observation.outcome)))
  );
}
//@ chunk-exfmq47h.js:575029-575088 facade-majority
function checkAndRefreshOAuthTokenIfNeeded(options = {}) {
  return checkAndRefreshOAuthTokenIfNeededWithOutcome(options).then((outcome) => outcome === "refreshed");
}
//@ chunk-exfmq47h.js:575088-575552 facade-majority
function checkAndRefreshOAuthTokenIfNeededWithOutcome({
  retryCount = 0,
  force = false,
  entryAccessToken,
  credentials,
  storageV5,
  usesLoginOffFirstParty = false,
} = {}) {
  let memos = oauthTokenReadMemos.of(getRootSession().host);
  if (retryCount === 0 && !force) {
    let pendingKey = isLoginOffFirstParty(usesLoginOffFirstParty)
      ? "pendingOptedInRefreshChecks"
      : "pendingRefreshChecks";
    let tier = getTokenStoreTier(credentials, storageV5);
    let lookup = (tier) => memos[pendingKey][tier];
    let tokenInLowerTier = findTokenInLowerTier(lookup, tier);
    if (tokenInLowerTier) return tokenInLowerTier;
    let startRefresh = () =>
      checkAndRefreshOAuthTokenIfNeededImpl(
        memos,
        retryCount,
        0,
        undefined,
        force,
        undefined,
        credentials,
        storageV5,
        usesLoginOffFirstParty,
      );
    let higherTierToken = findHigherTierToken(lookup, tier);
    let refreshPromise = (
      higherTierToken
        ? higherTierToken
            .catch(() => {
              return;
            })
            .then(startRefresh)
        : startRefresh()
    ).finally(() => {
      memos[pendingKey] = {
        ...memos[pendingKey],
        [tier]: null,
      };
    });
    memos[pendingKey] = {
      ...memos[pendingKey],
      [tier]: refreshPromise,
    };
    return refreshPromise;
  }
  return checkAndRefreshOAuthTokenIfNeededImpl(
    memos,
    retryCount,
    0,
    undefined,
    force,
    entryAccessToken,
    credentials,
    storageV5,
    usesLoginOffFirstParty,
  );
}
//@ chunk-exfmq47h.js:575552-575638 facade-majority
function isExpectedOAuthRefreshError(error, { isDefaultFirstPartyClient }) {
  return (
    isInvalidGrantError(error) ||
    isAccountOnHoldError(error) ||
    (!isDefaultFirstPartyClient && isExpectedOAuthTokenError(error)) ||
    isExpectedApiError(error)
  );
}
//@ chunk-exfmq47h.js:575638-580168 fingerprint (2.1.88 match: checkAndRefreshOAuthTokenIfNeededImpl, 0.377)
/**
 * 刷新 OAuth 令牌：未过期（提前 5 分钟判定）返回 not_needed；无 refresh token、已知失效或账户冻结直接返回原因；在配置目录加文件锁（ELOCKED 时随机退避重试 5 次，必要时接管死锁持有者），锁内再次确认后调用 refreshOAuthToken 并写回安全存储。
 */
async function checkAndRefreshOAuthTokenIfNeededImpl(
  memos,
  retryCount,
  waitedMs,
  observedLock,
  force,
  entryAccessToken,
  credentials,
  storageV5,
  usesLoginOffFirstParty = false,
  lockTakeoverRetried = false,
) {
  await invalidateOAuthCacheIfDiskChanged(memos, credentials);
  let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(credentials);
  if (!force) {
    if (claudeAIOAuthTokens && !isOAuthTokenExpired(claudeAIOAuthTokens.expiresAt)) return "not_needed";
    if (!claudeAIOAuthTokens?.refreshToken) return "no_refresh_token";
  }
  if (!claudeAIOAuthTokens?.refreshToken) return "no_refresh_token";
  if (deadRefreshTokens.has(claudeAIOAuthTokens.refreshToken)) return "known_dead_refresh_token";
  if (onHoldRefreshTokens.has(claudeAIOAuthTokens.refreshToken)) return "account_on_hold";
  if (!shouldUseClaudeAIAuth(claudeAIOAuthTokens.scopes) && !claudeAIOAuthTokens.subscriptionType)
    return "not_refreshable";
  if (!isFirstPartyProvider() && !usesLoginOffFirstParty) return "not_needed";
  let expectedAccessToken = entryAccessToken ?? claudeAIOAuthTokens.accessToken;
  clearOAuthTokenCache();
  let claudeAIOAuthTokens_2 = await getClaudeAIOAuthTokensAsync(credentials);
  if (!claudeAIOAuthTokens_2?.refreshToken) return "no_refresh_token";
  if (claudeAIOAuthTokens_2.accessToken !== expectedAccessToken) {
    notifyOAuthTokenReplaced();
    logEvent("tengu_oauth_token_refresh_race_resolved", {});
    return "refreshed";
  }
  if (!force && !isOAuthTokenExpired(claudeAIOAuthTokens_2.expiresAt)) return "not_needed";
  if (isDiskless()) {
    logFeatureBad("oauth_token_refresh", "oauth_refresh_diskless");
    return "not_refreshable";
  }
  let tokens = getProjectDirsUpToHome();
  await getFsImplementation().mkdir(tokens);
  let lockHandle;
  try {
    logEvent("tengu_oauth_token_refresh_lock_acquiring", {});
    lockHandle = await acquireOAuthRefreshLock(tokens);
  } catch (err) {
    if (err.code === "ELOCKED") {
      let lockInfo = observedLock ?? (await getRefreshLockInfo(err, tokens));
      if (retryCount < 5) {
        logEvent("tengu_oauth_token_refresh_lock_retry", {
          retryCount: retryCount + 1,
        });
        let retryDelayMs = 1000 + Math.random() * 1000;
        await sleep(retryDelayMs);
        return checkAndRefreshOAuthTokenIfNeededImpl(
          memos,
          retryCount + 1,
          waitedMs + retryDelayMs,
          lockInfo,
          force,
          expectedAccessToken,
          credentials,
          storageV5,
          usesLoginOffFirstParty,
          lockTakeoverRetried,
        );
      }
      let tokenPastExpiry =
        claudeAIOAuthTokens_2.expiresAt !== null && Date.now() >= claudeAIOAuthTokens_2.expiresAt;
      let refreshedTokens = await getRefreshLockInfo(err, tokens);
      if (sameLockObservation(lockInfo, refreshedTokens) && waitedMs < REFRESH_LOCK_OBSERVE_MS) {
        await sleep(REFRESH_LOCK_OBSERVE_MS - waitedMs);
        refreshedTokens = await getRefreshLockInfo(err, tokens);
      }
      let { contendedLock, lockAgeMs } = refreshedTokens;
      let holderAlive = !sameLockObservation(lockInfo, refreshedTokens);
      if (
        !holderAlive &&
        !lockTakeoverRetried &&
        String(contendedLock) === "current" &&
        refreshedTokens.mtimeMs !== undefined
      ) {
        let takeoverOutcome = await checkLockStillOwned({
          claudeDir: tokens,
          lockfilePath: oauthRefreshLockOptions(tokens).lockfilePath,
          legacyLockfilePath: await getLockfilePathFor(tokens),
          watchedMtimeMs: refreshedTokens.mtimeMs,
        });
        logEvent("tengu_oauth_token_refresh_lock_dead_holder_takeover", {
          outcome: fromEnum(takeoverOutcome),
          lockAgeMs,
        });
        if (takeoverOutcome === "taken_over" || takeoverOutcome === "lock_changed")
          return checkAndRefreshOAuthTokenIfNeededImpl(
            memos,
            0,
            0,
            undefined,
            force,
            expectedAccessToken,
            credentials,
            storageV5,
            usesLoginOffFirstParty,
            true,
          );
      }
      logEvent("tengu_oauth_token_refresh_lock_retry_limit_reached", {
        maxRetries: 5,
        tokenPastExpiry,
        contendedLock,
        lockAgeMs,
        holderAlive,
      });
      logFeatureSad("oauth_token_refresh", "oauth_refresh_lock_timeout", {
        token_past_expiry: tokenPastExpiry,
        contended_lock: contendedLock,
        holder_alive: holderAlive,
        ...(lockAgeMs !== undefined && {
          lock_age_ms: lockAgeMs,
        }),
      });
      return holderAlive ? "lock_busy" : "lock_timeout";
    }
    logError(err);
    logEvent("tengu_oauth_token_refresh_lock_error", {
      ...errorTelemetryFields(err),
    });
    logFeatureBad("oauth_token_refresh", "oauth_refresh_lock_error");
    return isDiskFullErrno(err) ? "lock_disk_full" : "lock_error";
  }
  let postedRefreshToken = null;
  let isDefaultFirstPartyClient = true;
  try {
    logEvent("tengu_oauth_token_refresh_lock_acquired", {});
    clearOAuthTokenCache();
    if ((await getSecureStorage().readAsyncStrict?.(credentials)) === READ_FAILED) {
      logEvent("tengu_oauth_token_refresh_locked_read_failed", {});
      logFeatureSad("oauth_token_refresh", "oauth_refresh_locked_read_failed");
      return "lock_error";
    }
    let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(credentials);
    if (!claudeAIOAuthTokens?.refreshToken) return "no_refresh_token";
    postedRefreshToken = claudeAIOAuthTokens.refreshToken;
    if (claudeAIOAuthTokens.accessToken !== expectedAccessToken) {
      notifyOAuthTokenReplaced();
      logEvent("tengu_oauth_token_refresh_race_resolved", {});
      return "refreshed";
    }
    if (!force && !isOAuthTokenExpired(claudeAIOAuthTokens.expiresAt)) return "not_needed";
    if (deadRefreshTokens.has(claudeAIOAuthTokens.refreshToken)) return "known_dead_refresh_token";
    if (onHoldRefreshTokens.has(claudeAIOAuthTokens.refreshToken)) return "account_on_hold";
    if (lockHandle.isCompromised()) {
      logEvent("tengu_oauth_token_refresh_lock_compromised_pre_post", {});
      logFeatureSad("oauth_token_refresh", "oauth_refresh_lock_compromised");
      return "lock_compromised";
    }
    logEvent("tengu_oauth_token_refresh_starting", {});
    isDefaultFirstPartyClient = Boolean(
      (shouldUseClaudeAIAuth(claudeAIOAuthTokens.scopes) || claudeAIOAuthTokens.subscriptionType) &&
      !claudeAIOAuthTokens.clientId,
    );
    let scopes = isDefaultFirstPartyClient
      ? firstPartyRefreshScopes(claudeAIOAuthTokens.scopes)
      : claudeAIOAuthTokens.scopes;
    let retryWithOriginalScopes = isDefaultFirstPartyClient && isClaudeAiScopeSet(claudeAIOAuthTokens.scopes);
    let refreshedTokens;
    try {
      refreshedTokens = await refreshOAuthToken(claudeAIOAuthTokens.refreshToken, {
        scopes,
        clientId: claudeAIOAuthTokens.clientId,
        signal: lockHandle.signal,
        invalidScopeRetried: retryWithOriginalScopes,
        storageV5,
      });
    } catch (error) {
      if (
        !retryWithOriginalScopes ||
        !isInvalidScopeError(error) ||
        msSinceOAuthRefreshExitBegan() >= OAUTH_REFRESH_EXIT_WAIT_CAP_MS
      )
        throw error;
      logEvent("tengu_oauth_refresh_invalid_scope_fallback", {});
      refreshedTokens = await refreshOAuthToken(claudeAIOAuthTokens.refreshToken, {
        scopes: claudeAIOAuthTokens.scopes,
        clientId: claudeAIOAuthTokens.clientId,
        signal: lockHandle.signal,
        storageV5,
      });
    }
    await saveRefreshedOAuthTokensRespectingLock({
      isCompromised: lockHandle.isCompromised,
      postedRefreshToken,
      refreshedTokens,
      credentials,
    });
    return "refreshed";
  } catch (error) {
    if (lockHandle.isCompromised()) {
      logForDebugging(`OAuth refresh failed while lock compromised: ${errorMessage(error)}`, {
        level: "error",
      });
      logEvent("tengu_oauth_token_refresh_lock_compromised_in_catch", {});
      clearOAuthTokenCache();
      let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(credentials);
      if (claudeAIOAuthTokens && claudeAIOAuthTokens.accessToken !== expectedAccessToken) {
        notifyOAuthTokenReplaced();
        logEvent("tengu_oauth_token_refresh_race_recovered", {});
        return "refreshed";
      }
      logFeatureSad("oauth_token_refresh", "oauth_refresh_lock_compromised");
      return "lock_compromised";
    }
    if (
      isExpectedOAuthRefreshError(error, {
        isDefaultFirstPartyClient,
      })
    )
      logForDebugging(`OAuth refresh failed (expected): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    clearOAuthTokenCache();
    let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(credentials);
    if (claudeAIOAuthTokens && claudeAIOAuthTokens.accessToken !== expectedAccessToken) {
      notifyOAuthTokenReplaced();
      logEvent("tengu_oauth_token_refresh_race_recovered", {});
      return "refreshed";
    }
    if (isInvalidGrantError(error) && postedRefreshToken)
      await markRefreshTokenDeadAfterInvalidGrant(postedRefreshToken, credentials, error);
    if (isAccountOnHoldError(error) && postedRefreshToken) {
      onHoldRefreshTokens.set(postedRefreshToken, getAccountOnHoldErrorUrl(error));
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
      await lockHandle.release();
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
//@ chunk-exfmq47h.js:580168-580224 facade-majority
function isClaudeAISubscriber() {
  if (!isAnthropicAuthEnabled()) return false;
  return shouldUseClaudeAIAuth(getClaudeAIOAuthTokens()?.scopes);
}
//@ chunk-exfmq47h.js:580224-580255 facade-majority
function hasUsableClaudeAILogin() {
  return isUsableClaudeAILoginRecord(getClaudeAIOAuthTokens());
}
//@ chunk-exfmq47h.js:580255-580328 facade-majority
function hasStoredUsableClaudeAILogin() {
  return (
    !isHttpMcpServeInvocation() &&
    !usesSessionAccessToken() &&
    isUsableClaudeAILoginRecord(getSecureStorage().read()?.claudeAiOauth ?? null)
  );
}
//@ chunk-exfmq47h.js:580328-580383 facade-majority (2.1.88 match: isUsingOAuth, 0.689)
function isUsableClaudeAILoginRecord(claudeAIOAuthTokens) {
  return shouldUseClaudeAIAuth(claudeAIOAuthTokens?.scopes) && !!claudeAIOAuthTokens?.accessToken;
}
//@ chunk-exfmq47h.js:580383-580456 facade-majority (2.1.88 match: hasProfileScope, 1)
/**
 * OAuth 令牌是否带 user:profile scope（决定能否拉 /api/oauth/profile）。
 */
function hasProfileScope() {
  let scopes = getClaudeAIOAuthTokens()?.scopes;
  return Array.isArray(scopes) && scopes.includes(CLAUDE_AI_PROFILE_SCOPE);
}
//@ chunk-exfmq47h.js:580456-580611 facade-majority
function mayHaveProfileScope() {
  let scopes = getClaudeAIOAuthTokens()?.scopes;
  if (!Array.isArray(scopes)) return false;
  if (scopes.includes(CLAUDE_AI_PROFILE_SCOPE)) return true;
  return (
    (!!env.CLAUDE_CODE_OAUTH_TOKEN || usableLauncherHostLoginToken() !== null) &&
    oauthScopesFromEnv() === undefined
  );
}
//@ chunk-exfmq47h.js:580611-580656 facade-majority
/**
 * 是否持有 OAuth 访问令牌。
 */
function hasStoredOAuthToken() {
  return getClaudeAIOAuthTokens()?.accessToken != null;
}
//@ chunk-exfmq47h.js:580656-580771 facade-majority
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
//@ chunk-exfmq47h.js:580771-580892 layout
var OAUTH_TOKEN_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:580771", () => {
  OAUTH_TOKEN_SOURCES = new Set([
    "claude.ai",
    "CLAUDE_CODE_OAUTH_TOKEN",
    "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
    "CCR_OAUTH_TOKEN_FILE",
  ]);
});
//@ chunk-exfmq47h.js:580892-581472 facade-majority
function hasExistingSignIn() {
  try {
    if (adminPolicyUnreadable()) return false;
    if (checkAllowedProvider("firstParty") !== undefined) return false;
    let forcedLoginMethod = getForcedLoginMethod();
    if (forcedLoginMethod === "gateway") return false;
    if (getSettingsForSource("policySettings")?.forceLoginOrgUUID !== undefined) return false;
    let { source } = getAuthTokenSource();
    let oauthTokens = source === "claude.ai" ? getClaudeAIOAuthTokens() : null;
    let refreshTokenUsable =
      !!oauthTokens?.refreshToken &&
      (typeof oauthTokens.refreshTokenExpiresAt !== "number" ||
        oauthTokens.refreshTokenExpiresAt > Date.now());
    let hasClaudeAiLogin =
      OAUTH_TOKEN_SOURCES.has(source) &&
      (source !== "claude.ai" ||
        (oauthTokens !== null &&
          isRefreshTokenDead(oauthTokens) !== true &&
          (refreshTokenUsable || !isOAuthTokenExpired(oauthTokens.expiresAt))));
    let hasManagedKeyLogin = source === "none" && hasLoginManagedKey();
    switch (forcedLoginMethod) {
      case "claudeai":
        return hasClaudeAiLogin;
      case "console":
        return hasManagedKeyLogin;
      case undefined:
        return hasClaudeAiLogin || hasManagedKeyLogin;
    }
  } catch (error) {
    logForDebugging(`Existing sign-in check failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return false;
  }
}
//@ chunk-exfmq47h.js:581472-581531 facade-majority
function getClaudeAIOAuthTokenFingerprint() {
  let accessToken = getClaudeAIOAuthTokens()?.accessToken;
  return accessToken ? computeContentHash(accessToken) : null;
}
//@ chunk-exfmq47h.js:581531-581585 facade-majority
function storedOAuthTokenEquals(accessToken) {
  return accessToken != null && getClaudeAIOAuthTokens()?.accessToken === accessToken;
}
//@ chunk-exfmq47h.js:581585-581658 facade-majority
/**
 * OAuth 令牌 scopes 是否包含指定 scope。
 */
function hasOAuthScope(scope) {
  let scopes = getClaudeAIOAuthTokens()?.scopes;
  return Array.isArray(scopes) && scopes.includes(scope);
}
//@ chunk-exfmq47h.js:581658-581795 facade-majority
function canAuthenticateChromeBridge() {
  let scopes = getClaudeAIOAuthTokens()?.scopes;
  return (
    Array.isArray(scopes) &&
    (scopes.includes(CLAUDE_AI_PROFILE_SCOPE) ||
      scopes.includes("user:office") ||
      scopes.includes("user:ccr_inference"))
  );
}
//@ chunk-exfmq47h.js:581795-581839 facade-majority
function getStoredOAuthTokenExpiresAt() {
  return getClaudeAIOAuthTokens()?.expiresAt ?? null;
}
//@ chunk-exfmq47h.js:581839-581890 facade-majority (2.1.88 match: getSubscriptionType, 1)
function getStoredOAuthSubscriptionType() {
  return getClaudeAIOAuthTokens()?.subscriptionType ?? null;
}
//@ chunk-exfmq47h.js:581890-581922 facade-majority
function getStoredOAuthTierVerifiedAt() {
  return storedPlanVerifiedAtOf(getClaudeAIOAuthTokens());
}
//@ chunk-exfmq47h.js:581922-582077 facade-majority
function storedPlanVerifiedAtOf(storedTokens) {
  if (!storedTokens || storedTokens.subscriptionTypeSource !== "profile") return;
  return typeof storedTokens.subscriptionTypeVerifiedAt === "number"
    ? storedTokens.subscriptionTypeVerifiedAt
    : null;
}
//@ chunk-exfmq47h.js:582077-582124 facade-majority
function hasStoredOAuthRefreshToken() {
  return getClaudeAIOAuthTokens()?.refreshToken != null;
}
//@ chunk-exfmq47h.js:582124-582183 facade-majority
function is1PApiCustomer() {
  if (!isFirstPartyProvider()) return false;
  if (isClaudeAISubscriber()) return false;
  return true;
}
//@ chunk-exfmq47h.js:582183-582234 facade-majority (2.1.88 match: getOauthAccountInfo, 1)
/**
 * 认证启用时返回全局配置 oauthAccount。
 */
function getOauthAccountInfo() {
  return isAnthropicAuthEnabled() ? getGlobalConfig().oauthAccount : undefined;
}
//@ chunk-exfmq47h.js:582234-582285 facade-majority
function getAuthenticatedAccountInfo() {
  if (!isAnthropicAuthEnabled()) return;
  return getAuthenticatedAccount() ?? undefined;
}
//@ chunk-exfmq47h.js:582285-582324 facade-majority (2.1.88 match: getOauthAccountInfo, 1)
/**
 * 直接读全局配置 oauthAccount（不检查认证是否启用）。
 */
function getStoredOauthAccountInfo() {
  return getGlobalConfig().oauthAccount;
}
//@ chunk-exfmq47h.js:582324-582531 fingerprint (2.1.88 match: isOverageProvisioningAllowed, 0.694)
var isOverageProvisioningAllowed_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:582324", () => {
  isOverageProvisioningAllowed_2 = new Set([
    "stripe_subscription",
    "stripe_subscription_contracted",
    "stripe_subscription_enterprise_self_serve",
    "aws_marketplace",
    "c4e_consumption_trial",
    "apple_subscription",
    "google_play_subscription",
  ]);
});
//@ chunk-exfmq47h.js:582531-582609 facade-majority
/**
 * 订阅账户的 billingType 是否允许开通超额（stripe_subscription 等）。
 */
function isOverageProvisioningAllowed() {
  let billingType = getOauthAccountInfo()?.billingType;
  if (!isClaudeAISubscriber() || !billingType) return false;
  return isOverageProvisioningAllowed_2.has(billingType);
}
//@ chunk-exfmq47h.js:582609-582702 facade-majority (2.1.88 match: isExtraUsageAllowed, 1)
function isExtraUsageAllowed() {
  if (env.DISABLE_EXTRA_USAGE_COMMAND) return false;
  if (getLspManager() !== null) return true;
  return isOverageProvisioningAllowed();
}
//@ chunk-exfmq47h.js:582702-582756 facade-majority
function getUsageCreditsCommand() {
  return isExtraUsageAllowed() ? artifactPathPrefix("usage-credits") : undefined;
}
//@ chunk-exfmq47h.js:582756-582880 facade-majority (2.1.88 match: hasClaudeAiBillingAccess, 0.863)
/**
 * Claude.ai 账单权限：组织角色为 admin/billing/owner/primary_owner。
 */
function hasClaudeAiBillingRole() {
  let orgRole = getGlobalConfig().oauthAccount?.organizationRole;
  return !!orgRole && ["admin", "billing", "owner", "primary_owner"].includes(orgRole);
}
//@ chunk-exfmq47h.js:582880-583089 facade-majority
function getTurnOnUsageCreditsStep() {
  let subscriptionType = getSubscriptionType();
  if (isArtifactMountMode() && (subscriptionType === "team" || subscriptionType === "enterprise"))
    return (getRateLimitTierOverride() ?? (isClaudeAISubscriber() && hasClaudeAiBillingRole()))
      ? `turn on usage credits at ${HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE}`
      : "ask your admin to turn on usage credits";
  return `turn on usage credits at ${USAGE_SETTINGS_URL}`;
}
//@ chunk-exfmq47h.js:583089-583183 facade-majority (2.1.88 match: hasOpusAccess, 1)
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
//@ chunk-exfmq47h.js:583183-583305 facade-majority (2.1.88 match: getSubscriptionType, 1)
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
//@ chunk-exfmq47h.js:583305-583496 layout (2.1.88 match: hasOpusAccess, 0.933)
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
//@ chunk-exfmq47h.js:583496-583581 facade-majority
function credentialIsOwnStoredLogin() {
  if (isBareModeAuthRestricted() || env.CLAUDE_CODE_OAUTH_TOKEN || usesHostProvidedAuth()) return false;
  return !(getOauthTokenFromFd() && !isOauthTokenFromBgSnapshot());
}
//@ chunk-exfmq47h.js:583581-583813 facade-majority
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
//@ chunk-exfmq47h.js:583813-583848 facade-majority (2.1.88 match: getRequestTooLargeErrorMessage, 1)
function isMaxSubscriber() {
  return getSubscriptionType() === "max";
}
//@ chunk-exfmq47h.js:583848-583884 facade-majority (2.1.88 match: isTeamSubscriber, 1)
function isTeamSubscriber() {
  return getSubscriptionType() === "team";
}
//@ chunk-exfmq47h.js:583884-583952 facade-majority (2.1.88 match: isTeamPremiumSubscriber, 1)
/**
 * team 订阅且 rateLimitTier 为 default_claude_max_5x。
 */
function isTeamPremiumSubscriber() {
  return getSubscriptionType() === "team" && getRateLimitTier() === "default_claude_max_5x";
}
//@ chunk-exfmq47h.js:583952-583994 facade-majority (2.1.88 match: isEnterpriseSubscriber, 1)
/**
 * 订阅类型为 enterprise。
 */
function isEnterpriseSubscriber() {
  return getSubscriptionType() === "enterprise";
}
//@ chunk-exfmq47h.js:583994-584070 facade-majority
function isEnterprisePAYGSubscriber() {
  return getSubscriptionType() === "enterprise" && getSeatTier() === "enterprise_usage_based";
}
//@ chunk-exfmq47h.js:584070-584105 facade-majority (2.1.88 match: isProSubscriber, 1)
function isProSubscriber() {
  return getSubscriptionType() === "pro";
}
//@ chunk-exfmq47h.js:584105-584237 facade-majority (2.1.88 match: getRateLimitTier, 1)
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
//@ chunk-exfmq47h.js:584237-584269 layout
var RATE_LIMIT_TIER_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-exfmq47h.js:584269-584367 layout (2.1.88 match: getRateLimitTier, 1)
function getRateLimitTierFromProfile() {
  if (!credentialIsOwnStoredLogin()) return null;
  let oauthTokens = getBgDispatcherPlanInfo().rateLimitTier;
  return oauthTokens !== undefined && RATE_LIMIT_TIER_PATTERN.test(oauthTokens) ? oauthTokens : null;
}
//@ chunk-exfmq47h.js:584367-584410 facade-majority
function getSeatTier() {
  return getOauthAccountInfo()?.seatTier ?? null;
}
//@ chunk-exfmq47h.js:584410-584499 layout
function getPlanDisplayNameLabel(oauthAccountInfo) {
  let planDisplayName = oauthAccountInfo?.planDisplayName;
  return planDisplayName &&
    !getStoredSubscriptionType() &&
    credentialIsOwnStoredLogin() &&
    isPlanDisplayName(planDisplayName)
    ? `Claude ${planDisplayName}`
    : null;
}
//@ chunk-exfmq47h.js:584499-584744 facade-majority (2.1.88 match: getSubscriptionName, 1)
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
//@ chunk-exfmq47h.js:584744-584771 facade-majority
function isUsing3PServices() {
  return !isFirstPartyProvider();
}
//@ chunk-exfmq47h.js:584771-584908 facade-majority (2.1.88 match: getConfiguredOtelHeadersHelper, 0.409)
function getConfiguredOtelHeadersHelper() {
  if (isSafeMode()) return getSettingsForSource("policySettings")?.otelHeadersHelper;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("otelHeadersHelper", mergedSettings.otelHeadersHelper);
}
//@ chunk-exfmq47h.js:584908-585084 facade-majority (2.1.88 match: isOtelHeadersHelperFromProjectOrLocalSettings, 0.783)
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
//@ chunk-exfmq47h.js:585084-585178 layout
class HelperCommandError extends Error {
  kind;
  exitCode;
  constructor(message, kind, exitCode) {
    super(message);
    this.kind = kind;
    this.exitCode = exitCode;
  }
}
//@ chunk-exfmq47h.js:585178-585231 facade-majority
function otelHeadersHelperFailureKind(error) {
  return error instanceof HelperCommandError ? error.kind : undefined;
}
//@ chunk-exfmq47h.js:585231-585372 facade-majority
var otelHeadersHelperStates; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var OTEL_HEADERS_HELPER_TTL_MS;
deferInit("chunk-exfmq47h.js:585231", () => {
  otelHeadersHelperStates = new HostScoped(() => ({
    cache: null,
    timestamp: 0,
    inflight: null,
    lastFailure: null,
    failed: createSignal(),
    prefetched: false,
    repoHelperIgnoredLogged: false,
  }));
  OTEL_HEADERS_HELPER_TTL_MS = 1740000;
});
//@ chunk-exfmq47h.js:585372-585445 facade-majority
function getOtelHeadersHelperLastFailure() {
  if (!getConfiguredOtelHeadersHelper()) return null;
  return otelHeadersHelperStates.of(getRootSession().host).lastFailure;
}
//@ chunk-exfmq47h.js:585445-585561 facade-majority
function clearOtelHeadersCache() {
  let state = otelHeadersHelperStates.of(getRootSession().host);
  state.cache = null;
  state.timestamp = 0;
  state.inflight = null;
  state.lastFailure = null;
  state.prefetched = false;
}
//@ chunk-exfmq47h.js:585561-585621 facade-majority
function onOtelHeadersHelperFailure(listener) {
  return otelHeadersHelperStates.of(getRootSession().host).failed.subscribe(listener);
}
//@ chunk-exfmq47h.js:585621-585733 facade-majority
function prefetchOtelHeadersFromHelper() {
  if (getIsNonInteractiveSession()) return;
  let state = otelHeadersHelperStates.of(getRootSession().host);
  if (state.prefetched) return;
  state.prefetched = true;
  getOtelHeadersFromHelper().catch(() => {});
}
//@ chunk-exfmq47h.js:585733-587965 facade-majority (2.1.88 match: getOtelHeadersFromHelper, 0.321)
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
  let state = otelHeadersHelperStates.of(getRootSession().host);
  if (state.cache && Date.now() - state.timestamp < numberOrDefault) return state.cache;
  if (state.inflight) return state.inflight;
  if (isOtelHeadersHelperFromProjectOrLocalSettings()) {
    if (!checkHasTrustDialogAccepted()) return {};
  }
  state.inflight = (async () => {
    try {
      let trimmed = otelHeadersHelper.trim();
      let isFilePath = false;
      try {
        let projectConfigRoot = getProjectConfigRoot();
        let resolvedPath = projectConfigRoot === null ? trimmed : resolve(projectConfigRoot, trimmed);
        isFilePath = (await stat(resolvedPath)).isFile();
      } catch {}
      let result = null;
      let hasTrust = getProjectConfigRoot();
      if (isFilePath)
        try {
          let directResult = await runManagedHelperWithoutProjectEnv(
            "otelHeadersHelper",
            otelHeadersHelper,
            () =>
              safeExecFile(trimmed, [], {
                ...(hasTrust !== null && {
                  cwd: hasTrust,
                }),
                timeout: 30000,
                reject: false,
                useToolMemoryCgroup: false,
              }),
          );
          if (!(
            directResult.failed &&
            !directResult.timedOut &&
            typeof directResult.exitCode !== "number" &&
            !directResult.signal
          ))
            result = directResult;
        } catch {}
      if (!result)
        result = await runManagedHelperWithoutProjectEnv("otelHeadersHelper", otelHeadersHelper, () =>
          safeExecShell(otelHeadersHelper, {
            ...(hasTrust !== null && {
              cwd: hasTrust,
            }),
            timeout: 30000,
            reject: false,
            useToolMemoryCgroup: false,
          }),
        );
      if (result.failed) {
        let failureText;
        let kind;
        if (result.timedOut) {
          failureText = "timed out";
          kind = "timeout";
        } else if (typeof result.exitCode === "number") {
          failureText = `exited ${result.exitCode}`;
          kind = "exit_code";
        } else if (result.signal) {
          failureText = `was killed by ${result.signal}`;
          kind = "killed";
        } else {
          failureText = "could not be started";
          kind = "spawn_failed";
        }
        let result_2 = result.stderr?.trim();
        throw new HelperCommandError(
          result_2 ? `${failureText}: ${result_2}` : failureText,
          kind,
          kind === "exit_code" ? result.exitCode : undefined,
        );
      }
      let trimmed_2 = result.stdout?.toString().trim();
      if (!trimmed_2)
        throw new HelperCommandError("otelHeadersHelper did not return a valid value", "empty_output");
      let parsedHeaders;
      try {
        parsedHeaders = jsonParse(trimmed_2);
      } catch {
        throw new HelperCommandError("otelHeadersHelper did not return valid JSON", "invalid_json");
      }
      if (typeof parsedHeaders !== "object" || parsedHeaders === null || Array.isArray(parsedHeaders))
        throw new HelperCommandError(
          "otelHeadersHelper must return a JSON object with string key-value pairs",
          "not_an_object",
        );
      for (let [key, value] of Object.entries(parsedHeaders))
        if (typeof value !== "string")
          throw new HelperCommandError(
            `otelHeadersHelper returned non-string value for key "${key}": ${typeof value}`,
            "non_string_value",
          );
      state.cache = parsedHeaders;
      state.timestamp = Date.now();
      state.lastFailure = null;
      return state.cache;
    } catch (error) {
      let headers = errorMessage(error);
      let isFirstFailure = state.lastFailure === null;
      state.lastFailure = headers;
      logForDebugging(
        `Error getting OpenTelemetry headers from otelHeadersHelper (in settings): ${headers}`,
        {
          level: "error",
        },
      );
      if (isFirstFailure) {
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
          state.failed.emit(headers);
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
      state.inflight = null;
    }
  })();
  return state.inflight;
}
//@ chunk-exfmq47h.js:587965-588009 facade-majority (2.1.88 match: isConsumerPlan, 1)
/**
 * plan 为 max 或 pro。
 */
function isConsumerPlan(plan) {
  return plan === "max" || plan === "pro";
}
//@ chunk-exfmq47h.js:588009-588064 facade-majority
function isConsumerSubscriber() {
  let subscriptionType = getSubscriptionType();
  return isClaudeAISubscriber() && subscriptionType !== null && isConsumerPlan(subscriptionType);
}
//@ chunk-exfmq47h.js:588064-588539 facade-majority (2.1.88 match: getAccountInformation, 0.951)
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
//@ chunk-exfmq47h.js:588539-588724 facade-majority (2.1.88 match: AccountInfoSchema, 0.477)
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
//@ chunk-exfmq47h.js:588724-588896 facade-majority
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
//@ chunk-exfmq47h.js:588896-589035 layout
async function getManagedPrimaryApiKey() {
  if (usesHostProvidedAuth()) return null;
  let globalConfig = getGlobalConfig();
  if (!globalConfig.primaryApiKey) return null;
  return {
    key: globalConfig.primaryApiKey,
    source: "/login managed key",
  };
}
//@ chunk-exfmq47h.js:589035-590127 facade-majority
async function getAnthropicApiKeyWithSourceAsync(options = {}) {
  if (isBareModeAuthRestricted()) {
    if (env.ANTHROPIC_API_KEY)
      return {
        key: env.ANTHROPIC_API_KEY,
        source: "ANTHROPIC_API_KEY",
      };
    if (getConfiguredApiKeyHelper())
      return {
        key: options.skipRetrievingKeyFromApiKeyHelper ? null : getApiKeyFromApiKeyHelperCached(),
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
    if (options.skipRetrievingKeyFromApiKeyHelper)
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
//@ chunk-exfmq47h.js:590127-590180 facade-majority
async function getAnthropicApiKeyAsync() {
  let { key } = await getAnthropicApiKeyWithSourceAsync();
  return key;
}
//@ chunk-exfmq47h.js:590180-590267 facade-majority
async function getAnthropicApiKeyWithSourceAsyncSafe(options = {}) {
  try {
    return await getAnthropicApiKeyWithSourceAsync(options);
  } catch {
    return {
      key: null,
      source: "none",
    };
  }
}
//@ chunk-exfmq47h.js:590267-590406 facade-majority (2.1.88 match: hasAnthropicApiKeyAuth, 1)
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
//@ chunk-exfmq47h.js:590406-590822 facade-majority
async function isAnthropicAuthEnabledAsync() {
  if (isBareModeAuthRestricted()) return false;
  if (env.ANTHROPIC_UNIX_SOCKET) return !!env.CLAUDE_CODE_OAUTH_TOKEN;
  if (shouldUseWIFAuth()) return false;
  let nonFirstParty = !isFirstPartyProvider();
  let settings = getSettings_DEPRECATED() || {};
  let apiKeyHelper = isBareMode()
    ? getConfiguredApiKeyHelper()
    : warnPinnedHelper("apiKeyHelper", settings.apiKeyHelper);
  let envAuthToken = effectiveAuthTokenEnv();
  let apiKeySource;
  try {
    apiKeySource = (
      await getAnthropicApiKeyWithSourceAsync({
        skipRetrievingKeyFromApiKeyHelper: true,
      })
    ).source;
  } catch {
    return false;
  }
  let isApiKeySource = apiKeySource === "ANTHROPIC_API_KEY" || apiKeySource === "apiKeyHelper";
  let hasDescriptorKey = hasPossibleCredentialFromDescriptor("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR");
  let shouldDisableAuth =
    ((envAuthToken || isApiKeySource) && !isFirstPartyManagedOAuthContext()) ||
    ((apiKeyHelper || hasDescriptorKey) && !isManagedOAuthContext());
  return !(nonFirstParty || shouldDisableAuth);
}
//@ chunk-exfmq47h.js:590822-591502 facade-majority (2.1.88 match: getAuthTokenSource, 0.886)
/**
 * getAuthTokenSource 的异步版本（storage v5 读取令牌）。
 */
async function getAuthTokenSourceAsync(storageV5) {
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
  let oauthTokens = await getClaudeAIOAuthTokensAsync(storageV5);
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
//@ chunk-exfmq47h.js:591502-591582 facade-majority
async function isClaudeAISubscriberAsync(credentials) {
  if (!(await isAnthropicAuthEnabledAsync())) return false;
  return shouldUseClaudeAIAuth((await getClaudeAIOAuthTokensAsync(credentials))?.scopes);
}
//@ chunk-exfmq47h.js:591582-591672 facade-majority
async function hasProfileScopeAsync(credentials) {
  let scopes = (await getClaudeAIOAuthTokensAsync(credentials))?.scopes;
  return Array.isArray(scopes) && scopes.includes(CLAUDE_AI_PROFILE_SCOPE);
}
//@ chunk-exfmq47h.js:591672-591746 facade-majority
async function is1PApiCustomerAsync(credentials) {
  if (!isFirstPartyProvider()) return false;
  if (await isClaudeAISubscriberAsync(credentials)) return false;
  return true;
}
//@ chunk-exfmq47h.js:591746-591811 facade-majority (2.1.88 match: getOauthAccountInfo, 1)
async function getOauthAccountInfoAsync() {
  return (await isAnthropicAuthEnabledAsync()) ? getGlobalConfig().oauthAccount : undefined;
}
//@ chunk-exfmq47h.js:591811-591913 facade-majority
async function isOverageProvisioningAllowedAsync(credentials) {
  let billingType = (await getOauthAccountInfoAsync())?.billingType;
  if (!(await isClaudeAISubscriberAsync(credentials)) || !billingType) return false;
  return isOverageProvisioningAllowed_2.has(billingType);
}
//@ chunk-exfmq47h.js:591913-592057 facade-majority (2.1.88 match: getSubscriptionType, 1)
async function getSubscriptionTypeAsync(credentials) {
  if (getStoredSubscriptionType()) return hasSubscriptionTypeOverride();
  if (!(await isAnthropicAuthEnabledAsync())) return null;
  let oauthTokens = await getClaudeAIOAuthTokensAsync(credentials);
  if (!oauthTokens) return null;
  return oauthTokens.subscriptionType ?? getSubscriptionTypeFromProfile() ?? null;
}
//@ chunk-exfmq47h.js:592057-592166 facade-majority (2.1.88 match: hasOpusAccess, 1)
async function hasOpusAccessAsync(credentials) {
  let subscriptionType = await getSubscriptionTypeAsync(credentials);
  return (
    subscriptionType === "max" ||
    subscriptionType === "enterprise" ||
    subscriptionType === "team" ||
    subscriptionType === "pro" ||
    subscriptionType === null
  );
}
//@ chunk-exfmq47h.js:592166-592320 facade-majority (2.1.88 match: getRateLimitTier, 1)
async function getRateLimitTierAsync(credentials) {
  let oauthTokens = getRateLimitTier_2();
  if (oauthTokens !== null) return oauthTokens;
  if (!(await isAnthropicAuthEnabledAsync())) return null;
  let oauthTokens_2 = await getClaudeAIOAuthTokensAsync(credentials);
  if (!oauthTokens_2) return null;
  return oauthTokens_2.rateLimitTier ?? getRateLimitTierFromProfile() ?? null;
}
//@ chunk-exfmq47h.js:592320-592377 facade-majority
async function getSeatTierAsync() {
  return (await getOauthAccountInfoAsync())?.seatTier ?? null;
}
//@ chunk-exfmq47h.js:592377-592427 facade-majority (2.1.88 match: getRequestTooLargeErrorMessage, 1)
async function isMaxSubscriberAsync(credentials) {
  return (await getSubscriptionTypeAsync(credentials)) === "max";
}
//@ chunk-exfmq47h.js:592427-592478 facade-majority (2.1.88 match: isTeamSubscriber, 1)
async function isTeamSubscriberAsync(credentials) {
  return (await getSubscriptionTypeAsync(credentials)) === "team";
}
//@ chunk-exfmq47h.js:592478-592569 facade-majority (2.1.88 match: isTeamPremiumSubscriber, 1)
async function isTeamPremiumSubscriberAsync(credentials) {
  return (
    (await getSubscriptionTypeAsync(credentials)) === "team" &&
    (await getRateLimitTierAsync(credentials)) === "default_claude_max_5x"
  );
}
//@ chunk-exfmq47h.js:592569-592626 facade-majority (2.1.88 match: isEnterpriseSubscriber, 1)
async function isEnterpriseSubscriberAsync(credentials) {
  return (await getSubscriptionTypeAsync(credentials)) === "enterprise";
}
//@ chunk-exfmq47h.js:592626-592723 facade-majority
async function isEnterprisePAYGSubscriberAsync(credentials) {
  return (
    (await getSubscriptionTypeAsync(credentials)) === "enterprise" &&
    (await getSeatTierAsync()) === "enterprise_usage_based"
  );
}
//@ chunk-exfmq47h.js:592723-592773 facade-majority (2.1.88 match: isProSubscriber, 1)
async function isProSubscriberAsync(plan) {
  return (await getSubscriptionTypeAsync(plan)) === "pro";
}
//@ chunk-exfmq47h.js:592773-593040 facade-majority (2.1.88 match: getSubscriptionName, 1)
async function getSubscriptionNameAsync(credentials) {
  let subscriptionType = await getSubscriptionTypeAsync(credentials);
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
//@ chunk-exfmq47h.js:593040-593119 facade-majority
async function isConsumerSubscriberAsync(credentials) {
  let subscriptionType = await getSubscriptionTypeAsync(credentials);
  return (
    (await isClaudeAISubscriberAsync(credentials)) &&
    subscriptionType !== null &&
    isConsumerPlan(subscriptionType)
  );
}
//@ chunk-exfmq47h.js:593119-593649 facade-majority (2.1.88 match: getAccountInformation, 0.951)
/**
 * getAccountInformation 的异步版本（storage v5）。
 */
async function getAccountInformationAsync(credentials) {
  if (getAPIProvider() !== "firstParty") return;
  let { source: authTokenSource } = await getAuthTokenSourceAsync(credentials);
  let accountInfo = {};
  if (
    authTokenSource === "CLAUDE_CODE_OAUTH_TOKEN" ||
    authTokenSource === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"
  )
    accountInfo.tokenSource = authTokenSource;
  else if (await isClaudeAISubscriberAsync(credentials))
    accountInfo.subscription = await getSubscriptionNameAsync(credentials);
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
//@ chunk-exfmq47h.js:593649-593985 facade-majority
async function providerAllowlistRefusal(apiProvider) {
  let policyMessage = policyUnreadableMessage();
  if (policyMessage !== undefined)
    return {
      valid: false,
      reason: "managed_settings_invalid",
      policyUnreadable: true,
      message: policyMessage,
    };
  await recheckAllowedProviderEndpoint(apiProvider);
  let refusal = checkAllowedProvider(apiProvider);
  if (refusal === undefined) return;
  await logFeatureBadAsync("auth_force_login_org", "provider_not_allowed", {
    api_provider: fromEnum(refusal.refused[0].provider),
  });
  return {
    valid: false,
    reason: "provider_not_allowed",
    message: refusal.message,
  };
}
//@ chunk-exfmq47h.js:593985-594071 layout (2.1.88 match: hasAnthropicApiKeyAuth, 1)
// deferred: uses setWifProfileBaseUrlInUse (./model/allowedProviders.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:593985", () => {
  setWifProfileBaseUrlInUse(() =>
    shouldUseWIFAuth() &&
    getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    }).source === "none"
      ? getWIFProfileBaseUrl()
      : undefined,
  );
});
//@ chunk-exfmq47h.js:594071-595485 layout
function buildForceLoginConflictMessage({ orgPinned }) {
  let credential = describeActiveCredential();
  let joined = credential.fixes.join("; also ");
  let apiProvider = getAPIProvider();
  let providerLabel =
    apiProvider !== "firstParty" && apiProvider !== "gateway"
      ? THIRD_PARTY_PROVIDER_LABELS[apiProvider]
      : undefined;
  if (isGatewayLoginForced())
    return [
      `Administrator policy requires a Cloud gateway sign-in on this machine, but this session is configured with ${credential.what}, which a gateway machine does not accept.`,
      "",
      credential.complete
        ? `To continue: ${joined}.`
        : withoutHostManagedProviderVars()
          ? `To continue: ${joined}, then run claude and sign in with /login.`
          : `To continue: ${joined}, then run claude again; ${providerLabel ?? "your cloud provider"} needs no Anthropic sign-in.`,
    ].join(`
`);
  let forceLoginMethod = getSettingsForSource("policySettings")?.forceLoginMethod;
  let policyRequirement = orgPinned
    ? "pin Anthropic sign-ins to your organization (forceLoginOrgUUID)"
    : forceLoginMethod === "claudeai" || forceLoginMethod === "console"
      ? "require a claude.ai or Console sign-in (forceLoginMethod)"
      : "set a sign-in method (forceLoginMethod)";
  let proxyHost = apiProvider === "firstParty" ? configuredApiProxyHost() : undefined;
  let explanation = `This machine's managed settings require a first-party login: they ${policyRequirement}, and this session is configured with ${credential.what}, which cannot be checked against that policy${providerLabel ? ` \u2014 even alongside ${providerLabel}` : ""}${proxyHost ? ` (requests go through ${proxyHost}, per ANTHROPIC_BASE_URL)` : ""}.`;
  let nextStep = credential.complete
    ? `To continue: ${joined}.`
    : providerLabel
      ? `To continue: ${joined}, then run claude again; ${providerLabel} needs no Anthropic sign-in.`
      : `To continue: ${joined}, then run: claude auth login`;
  return [
    explanation,
    "",
    nextStep,
    "Admins: if this is a third-party desktop session, forceLoginOrgUUID / forceLoginMethod target first-party OAuth and should be removed from this machine's managed settings.",
  ].join(`
`);
}
//@ chunk-exfmq47h.js:595485-595578 layout
function describeSettingsSourcePath(source) {
  let settingsFilePathForSource = getSettingsFilePathForSource(source);
  return settingsFilePathForSource === undefined
    ? "your settings"
    : stripControlChars(settingsFilePathForSource).replace(/[\t\n\r]+/g, " ");
}
//@ chunk-exfmq47h.js:595578-595846 layout
function findEnvSettingSource(envKey, envValue) {
  if (getSettingsForSource("policySettings")?.env?.[envKey] === envValue)
    return {
      managed: true,
    };
  for (let source of ["flagSettings", "localSettings", "projectSettings", "userSettings"])
    if (getSettingsForSource(source)?.env?.[envKey] === envValue)
      return {
        managed: false,
        file:
          source === "flagSettings" && getFlagSettingsInline() !== null
            ? "your --settings value"
            : describeSettingsSourcePath(source),
      };
  return;
}
//@ chunk-exfmq47h.js:595846-596332 layout
function describeEnvCredential(envVarName, envValue, credentialLabel) {
  let envSettingSource = findEnvSettingSource(envVarName, envValue);
  if (envSettingSource === undefined)
    return {
      what: `${credentialLabel} from ${envVarName}`,
      fix: `unset ${envVarName} (or run in a shell without it)`,
      complete: false,
    };
  if (envSettingSource.managed)
    return {
      what: `${credentialLabel} from ${envVarName}, set by your organization's managed settings`,
      fix: `ask your administrator (managed settings set both env.${envVarName} and a sign-in policy; that credential cannot satisfy it)`,
      complete: true,
    };
  return {
    what: `${credentialLabel} from ${envVarName}, set in the env block of ${envSettingSource.file}`,
    fix: `remove ${envVarName} from the env block of ${envSettingSource.file}`,
    complete: false,
  };
}
//@ chunk-exfmq47h.js:596332-598266 layout
function describeActiveCredential() {
  let candidates = [];
  let hostCredential = {
    what: "a credential supplied by the host application that launched Claude Code",
    fix: "sign in inside that application, or run claude from a terminal and sign in there",
    complete: true,
  };
  let hostAuthEnvVar =
    getHostAuthEnvVar({
      CLAUDE_CODE_HOST_AUTH_ENV_VAR: env.CLAUDE_CODE_HOST_AUTH_ENV_VAR,
    }) ?? (env.CLAUDE_CODE_ENTRYPOINT === "claude-desktop-3p" ? "any" : undefined);
  let { key, source } = getAnthropicApiKeyWithSourceSafe({
    skipRetrievingKeyFromApiKeyHelper: true,
  });
  if (env.ANTHROPIC_API_KEY && key === env.ANTHROPIC_API_KEY)
    candidates.push(
      hostAuthEnvVar === "ANTHROPIC_API_KEY" || hostAuthEnvVar === "any"
        ? hostCredential
        : describeEnvCredential("ANTHROPIC_API_KEY", env.ANTHROPIC_API_KEY, "an API key"),
    );
  else if (
    source === "ANTHROPIC_API_KEY" ||
    hasPossibleCredentialFromDescriptor("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR")
  )
    candidates.push(hostCredential);
  if (env.ANTHROPIC_AUTH_TOKEN)
    candidates.push(
      hostAuthEnvVar === "ANTHROPIC_AUTH_TOKEN" || hostAuthEnvVar === "any"
        ? hostCredential
        : describeEnvCredential("ANTHROPIC_AUTH_TOKEN", env.ANTHROPIC_AUTH_TOKEN, "a bearer token"),
    );
  else if (getGatewayTokenFromFileDescriptor()) candidates.push(hostCredential);
  if (source === "/login managed key")
    candidates.push({
      what: "a Console API key saved by an earlier login",
      fix: "run: claude auth logout (removes the saved key)",
      complete: false,
    });
  if (getConfiguredApiKeyHelper()) {
    let helperSource = isBareMode() ? "flagSettings" : getEffectiveSettingSource("apiKeyHelper");
    if (helperSource === "policySettings")
      candidates.push({
        what: "an API key from the apiKeyHelper your organization's managed settings configure",
        fix: "ask your administrator (managed settings set both apiKeyHelper and a sign-in policy; a helper key cannot satisfy it)",
        complete: true,
      });
    else {
      let sourceLabel =
        helperSource === null
          ? "your settings"
          : helperSource === "flagSettings" && getFlagSettingsInline() !== null
            ? "your --settings value"
            : describeSettingsSourcePath(helperSource);
      candidates.push({
        what: `an API key from the apiKeyHelper in ${sourceLabel}`,
        fix: `remove apiKeyHelper from ${sourceLabel}`,
        complete: false,
      });
    }
  }
  let seenFixes = new Set();
  let unique = [];
  for (let candidate of candidates)
    if (!seenFixes.has(candidate.fix)) {
      seenFixes.add(candidate.fix);
      unique.push(candidate);
    }
  if (unique.length === 0)
    return hostAuthEnvVar !== undefined
      ? {
          what: hostCredential.what,
          fixes: [hostCredential.fix],
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
    what: unique[0].what,
    fixes: unique.map((candidate) => candidate.fix),
    complete: unique.every((candidate) => candidate.complete),
  };
}
//@ chunk-exfmq47h.js:598266-598425 layout
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
//@ chunk-exfmq47h.js:598425-598523 layout
var UNREADABLE_POLICY_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_30;
deferInit("chunk-exfmq47h.js:598425", () => {
  UNREADABLE_POLICY_ERRNOS = ["EACCES", "EPERM", "EBUSY", "EIO", "EISDIR", "ELOOP"];
  regExp_30 = new RegExp(`\\b(${UNREADABLE_POLICY_ERRNOS.join("|")})\\b`);
});
//@ chunk-exfmq47h.js:598523-601010 facade-majority (2.1.88 match: validateForceLoginOrg, 0.288)
/**
 * 见 AD：托管设置组织 pin 校验。
 */
async function validateForceLoginOrg(credentials, existingTokens, verifiedLogin) {
  let settingsForSource = getSettingsForSource("policySettings");
  let requiredOrgUuid = settingsForSource?.forceLoginOrgUUID;
  let hasOrgPin = requiredOrgUuid !== undefined || settingsForSource?.forceLoginMethod !== undefined;
  if (isAdminPolicyUnreadable() && !adminPolicyLoadFailureRefusesLaunch()) {
    let found = UNREADABLE_POLICY_ERRNOS.find((errno) => errno === getFatalAdminPolicyLoadErrors()[0]?.errno);
    logFeatureSad("auth_force_login_org", "policy_denied_passthrough", {
      errno: fromEnumOpt(found) ?? lit("other"),
      api_provider: fromEnum(getAPIProvider()),
    });
  }
  let unreadableRefusal = await checkForceLoginPolicyReadable();
  if (unreadableRefusal) return unreadableRefusal;
  let providerRefusal = await providerAllowlistRefusal();
  if (providerRefusal) return providerRefusal;
  let forceLoginOrgRequirement = getForceLoginOrgRequirement(requiredOrgUuid, verifiedLogin !== undefined);
  if (forceLoginOrgRequirement.kind === "host_managed") {
    if (hasOrgPin) logFeatureSad("auth_force_login_org", "managed_by_host_under_pin");
    return {
      valid: true,
    };
  }
  if (forceLoginOrgRequirement.kind === "unix_socket") {
    let telemetryFields = {
      api_provider: fromEnum(getAPIProvider()),
      auth_token_source: fromEnum(getAuthTokenSource().source),
    };
    if (!isAnthropicAuthEnabled() && hasOrgPin)
      logFeatureSad("auth_force_login_org", "unix_socket_3p_under_pin", telemetryFields);
    else if (isAnthropicAuthEnabled() && requiredOrgUuid !== undefined)
      logFeatureSad("auth_force_login_org", "unix_socket_ssh_under_pin", telemetryFields);
    else if (adminPolicyLoadFailureRefusesLaunch())
      logFeatureSad("auth_force_login_org", "unix_socket_unreadable_policy", telemetryFields);
    else logFeatureOk("auth_force_login_org");
    return {
      valid: true,
    };
  }
  if (forceLoginOrgRequirement.kind === "auth_disabled") {
    if (hasOrgPin && hasNonOAuthCredential())
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
  let requiredOrgsText = formatRequiredOrgs(requiredOrgUuids);
  let oauthTokens;
  if (verifiedLogin !== undefined) oauthTokens = isUsingOAuth(verifiedLogin.accessToken);
  else {
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
    });
    oauthTokens = getClaudeAIOAuthTokens();
  }
  if (!oauthTokens)
    return {
      valid: true,
    };
  let { source } = getAuthTokenSource();
  let isEnvTokenSource =
    source === "CLAUDE_CODE_OAUTH_TOKEN" || source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR";
  let isLauncherToken =
    verifiedLogin === undefined && oauthTokens.accessToken === usableLauncherHostLoginToken();
  let envVarName = isLauncherToken ? launcherHostLoginIdentity() : null;
  let tokenOrgUuid;
  if (verifiedLogin !== undefined) tokenOrgUuid = verifiedLogin.organizationUuid;
  else if (existingTokens?.accessToken === oauthTokens.accessToken)
    tokenOrgUuid = existingTokens.organizationUuid;
  else if (envVarName !== null)
    tokenOrgUuid = ((await envVarName) ?? (await askLauncherHostLoginIdentityAgain()))?.organizationUuid;
  else
    tokenOrgUuid =
      (canAuthenticateChromeBridge() ? undefined : await getOauthTokenOrgUuid(oauthTokens.accessToken)) ??
      (await validateOauthToken(oauthTokens.accessToken))?.organization_uuid;
  if (tokenOrgUuid === undefined)
    return {
      valid: false,
      reason: "org_verify_failed",
      message: orgVerificationFailedMessage(requiredOrgsText),
    };
  if (requiredOrgUuids.includes(tokenOrgUuid))
    return {
      valid: true,
    };
  if (verifiedLogin !== undefined || isLauncherToken)
    return {
      valid: false,
      reason: "org_pin_mismatch",
      message: `The sign-in the desktop app provided belongs to a different
organization than required by this machine's managed settings.

Required: ${requiredOrgsText}
Token organization: ${tokenOrgUuid}

Sign in to the desktop app with a permitted organization.`,
    };
  if (isEnvTokenSource)
    return {
      valid: false,
      reason: "org_pin_mismatch",
      message: `The ${source === "CLAUDE_CODE_OAUTH_TOKEN" ? "CLAUDE_CODE_OAUTH_TOKEN" : "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"} environment variable provides a token for a
different organization than required by this machine's managed settings.

Required: ${requiredOrgsText}
Token organization: ${tokenOrgUuid}

Remove the environment variable or obtain a token for a permitted organization.`,
    };
  return {
    valid: false,
    reason: "org_pin_mismatch",
    message: formatWrongOrgMessage(tokenOrgUuid, requiredOrgsText),
  };
}
//@ chunk-exfmq47h.js:601010-601188 layout
var EMPTY_FORCE_LOGIN_ORG_MESSAGE = `forceLoginOrgUUID in managed settings is set to an empty array.
No organizations are permitted. This is almost certainly a misconfiguration.
Contact your administrator.`;
//@ chunk-exfmq47h.js:601188-601756 layout
async function checkForceLoginPolicyReadable() {
  if (!isAdminPolicyUnreadable() || !adminPolicyLoadFailureRefusesLaunch()) return;
  let failure = getFatalAdminPolicyLoadErrors()[0];
  if (!failure) return;
  let isUnreadable = failure.errorClass === "unreadable";
  let match = failure.message.match(regExp_30);
  let found = UNREADABLE_POLICY_ERRNOS.find((errno) => errno === match?.[1]);
  let errno = isUnreadable ? (fromEnumOpt(found) ?? lit("other")) : lit("malformed");
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

Detail: ${failure.file ? `${cleanForDisplay(failure.file)}: ${failure.message}` : failure.message}`,
  };
}
//@ chunk-exfmq47h.js:601756-601860 layout
function formatRequiredOrgs(requiredOrgUuids) {
  return requiredOrgUuids.length === 1
    ? `organization ${requiredOrgUuids[0]}`
    : `one of these organizations: ${requiredOrgUuids.join(", ")}`;
}
//@ chunk-exfmq47h.js:601860-602037 layout
function formatWrongOrgMessage(tokenOrgUuid, requiredOrgsText) {
  return `Your authentication token belongs to organization ${tokenOrgUuid},
but this machine requires ${requiredOrgsText}.

Please log in with a permitted organization: claude auth login`;
}
//@ chunk-exfmq47h.js:602037-602343 layout
/**
 * 计算组织 pin 要求：host_managed / unix_socket / auth_disabled / no_pin / empty_pin / required（列出允许的组织 UUID）。
 */
function getForceLoginOrgRequirement(pinValue, hasVerifiedLogin) {
  if (isHostManagedProviderAuth() && !hasVerifiedLogin && usableLauncherHostLoginToken() === null)
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
  if (pinValue === undefined)
    return {
      kind: "no_pin",
    };
  let requiredOrgUuids = typeof pinValue === "string" ? [pinValue] : pinValue;
  return requiredOrgUuids.length === 0
    ? {
        kind: "empty_pin",
      }
    : {
        kind: "required",
        requiredOrgUuids,
      };
}
//@ chunk-exfmq47h.js:602343-602361 layout
/**
 * 校验 OAuth 令牌的重试间隔（500ms、1500ms）。
 */
var OAUTH_VALIDATE_RETRY_DELAYS_MS = [500, 1500];
//@ chunk-exfmq47h.js:602361-602895 facade-majority
async function resolveLoginOrgPin(scopes) {
  let unreadableRefusal = await checkForceLoginPolicyReadable();
  if (unreadableRefusal)
    return {
      outcome: "refused",
      rejection: unreadableRefusal,
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
//@ chunk-exfmq47h.js:602895-603374 facade-majority
async function checkNewLoginTokenOrg(tokens) {
  let loginOrgPin = await resolveLoginOrgPin(tokens.scopes);
  if (loginOrgPin.outcome !== "required") return loginOrgPin;
  let { requiredOrgUuids } = loginOrgPin;
  let requiredOrgsText = formatRequiredOrgs(requiredOrgUuids);
  let organizationUuid = (await validateOauthToken(tokens.accessToken, OAUTH_VALIDATE_RETRY_DELAYS_MS))
    ?.organization_uuid;
  if (typeof organizationUuid !== "string" || organizationUuid === "")
    return {
      outcome: "refused",
      rejection: {
        valid: false,
        reason: "org_verify_failed",
        message: orgVerificationFailedMessage(requiredOrgsText),
      },
    };
  if (!requiredOrgUuids.includes(organizationUuid))
    return {
      outcome: "refused",
      rejection: {
        valid: false,
        reason: "org_pin_mismatch",
        message: formatWrongOrgMessage(organizationUuid, requiredOrgsText),
      },
    };
  return {
    outcome: "permitted",
    verified: {
      accessToken: tokens.accessToken,
      organizationUuid,
    },
  };
}
//@ chunk-exfmq47h.js:603374-603633 facade-majority
function orgVerificationFailedMessage(requiredOrgsText) {
  return `Unable to verify organization for the current authentication token.
This machine requires ${requiredOrgsText} but the token could not be validated.
This may be a network error, or the token may have been revoked.
Try again, or run: claude auth login`;
}
//@ chunk-exfmq47h.js:603633-603731 facade-majority
function getForcedLoginMethod() {
  if (isGatewayLoginForced()) return "gateway";
  let forceLoginMethod = getInitialSettings()?.forceLoginMethod;
  return forceLoginMethod === "gateway" ? undefined : forceLoginMethod;
}
//@ chunk-exfmq47h.js:603731-603768 facade-majority
function adminPolicyUnreadable() {
  return getFatalAdminPolicyLoadErrors().length > 0;
}
//@ chunk-exfmq47h.js:603768-603796 facade-majority
function policyUnreadableForEnforcement() {
  return isAdminPolicyUnreadable();
}
//@ chunk-exfmq47h.js:603796-603943 facade-majority
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
//@ chunk-exfmq47h.js:603943-604001 facade-majority
function launcherSignInMethodRefusal() {
  let check = checkForcedLoginMethod(true);
  return check.valid ? null : check.message;
}
//@ chunk-exfmq47h.js:604001-604574 affinity
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
  let sourceLabel =
    getEffectiveSettingSource("forceLoginMethod") === "policySettings" ? "managed settings" : "settings";
  return {
    valid: false,
    message:
      forced === "claudeai"
        ? `forceLoginMethod is 'claudeai' in ${sourceLabel}; log in with a Claude.ai subscription account instead.`
        : `forceLoginMethod is 'console' in ${sourceLabel}; log in with an Anthropic Console account instead.`,
  };
}
//@ chunk-exfmq47h.js:604574-604598 affinity
/**
 * GCP 凭据检查超时的错误类型。
 */
class GcpCredentialsTimeoutError extends Error {}
//@ chunk-c4qa5qn0.js:407-459 fingerprint (2.1.88 match: invalidateOAuthCacheIfDiskChanged, 0.513)
/**
 * 凭证文件名常量：.credentials.json（明文 OAuth 凭证）与 .device-keys.json（设备密钥）。
 */
var CREDENTIALS_FILE_NAME = ".credentials.json";
var DEVICE_KEYS_FILE_NAME = ".device-keys.json";
//@ chunk-c4qa5qn0.js:459-519 placement (2.1.88 match: getProjectDirsUpToHome, 1)
/**
 * 设备密钥文件路径 `~/.claude/.device-keys.json`（NFC 规范化）。与 markdown 配置无关，旧版名 getProjectDirsUpToHome 配错。
 */
function getDeviceKeysFilePath() {
  return join(homedir(), ".claude", DEVICE_KEYS_FILE_NAME).normalize("NFC");
}
//@ chunk-h3xdf7nq.js:15046-15102 placement (2.1.88 match: getOauthAccountInfo, 1)
function getOauthAccountInfo_2() {
  try {
    return getGlobalConfig().oauthAccount;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:1557312-1557388 fingerprint (2.1.88 match: isManagedOAuthContext, 0.882)
function isManagedOAuthContext_2() {
  return process.env.CLAUDE_CODE_ENTRYPOINT === "claude-desktop";
}
//@ chunk-5xgkngpb.js:1646856-1646928 fingerprint (2.1.88 match: isConsumerPlan, 1)
/**
 * pro/max 用户为付款问题提示，其他为组织禁用提示。旧版名 isConsumerPlan 为错配。
 */
function getSubscriptionUnavailableMessage() {
  let subscriptionType = getSubscriptionType();
  if (subscriptionType === "pro" || subscriptionType === "max") return SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE;
  return SUBSCRIPTION_ACCESS_DISABLED_MESSAGE;
}
//@ chunk-5xgkngpb.js:2352878-2352891 affinity
/**
 * 并发 401 处理结果缓存的条数上限（1000）。
 */
var MAX_401_HANDLERS = 1000;
//@ chunk-5xgkngpb.js:2352891-2353184 fingerprint (2.1.88 match: handleOAuth401Error, 0.67)
/**
 * 按 key 合并并发的 401 处理，结果缓存（LRU 1000）避免同一令牌重复刷新。
 */
class OAuth401Deduper {
  #e = new LRUCache({
    max: MAX_401_HANDLERS,
  });
  #t = new Map();
  run(key, compute) {
    let cached = this.#e.get(key);
    if (cached !== undefined) return Promise.resolve(cached);
    let inflight = this.#t.get(key);
    if (inflight !== undefined) return inflight;
    let promise = compute()
      .then((result) => {
        if (typeof result === "number" && result > 0) this.#e.set(key, result);
        return result;
      })
      .finally(() => {
        this.#t.delete(key);
      });
    this.#t.set(key, promise);
    return promise;
  }
}
//@ chunk-5xgkngpb.js:2353184-2353211 placement
var oauth401DedupByHost; // deferred: uses OAuth401Deduper of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2353184", () => {
  oauth401DedupByHost = new HostScoped(() => new OAuth401Deduper());
});
//@ chunk-ma8ytfb3.js:51568-51580 affinity
/**
 * 等待 401 处理完成的超时（5 秒）。
 */
var OAUTH_401_RACE_TIMEOUT_MS = 5000;
//@ chunk-ma8ytfb3.js:51580-51912 fingerprint (2.1.88 match: handleOAuth401ErrorImpl, 0.484)
async function handleOAuth401ErrorImpl_2(usedAccessToken, signal, storage) {
  let tokens;
  if (isStorageV5Enabled() && storage !== undefined) tokens = await getClaudeAIOAuthTokensAsync(storage);
  else tokens = getClaudeAIOAuthTokens();
  if (usedAccessToken === tokens?.accessToken && Boolean(tokens?.refreshToken)) {
    await Promise.race([
      handleOAuth401Error(usedAccessToken, storage).catch(() => false),
      sleep(OAUTH_401_RACE_TIMEOUT_MS, signal),
    ]);
    if (signal.aborted) return null;
  }
  let winner = await Promise.race([
    getDesignConsentKey(storage).catch(() => null),
    sleep(OAUTH_401_RACE_TIMEOUT_MS, signal).then(() => null),
  ]);
  return winner?.ok === true && winner.accessToken !== usedAccessToken ? winner.accessToken : null;
}
export {
  isClaudeAISubscriber,
  getSubscriptionType,
  isConsumerPlan,
  getAuthenticatedAccountInfo,
  getOauthAccountInfo,
  isWIFDispatchAuth,
  isManagedOAuthContext_2,
  hasProfileScope,
  getAuthTokenSource,
  isHostManagedProviderAuth,
  getApiKeyFromConfigOrMacOSKeychain,
  getConfiguredApiKeyHelper,
  hasStoredOAuthToken,
  credentialIsOwnStoredLogin,
  sameOwnerAccount,
  getClaudeAIOAuthTokens,
  checkAndRefreshOAuthTokenIfNeeded,
  hostSessionsBearerOffered,
  hasUsableClaudeAILogin,
  recoverCloudSessionsBearer,
  hasClaudeAISignInToken,
  getClaudeAIOAuthTokenOrigin,
  getStoredOauthAccountInfo,
  getAnthropicApiKeySafe,
  shouldUseWIFAuth,
  isApiKeyHelperTheActiveCredential,
  getColdApiKeyHelperRun,
  CREDENTIALS_FILE_NAME,
  DEVICE_KEYS_FILE_NAME,
  sdkHostOffersOAuthRefresh,
  isClaudeAISignInToken,
  isClaudeAIOAuthTokenHostInjected,
  validateForceLoginMethod,
  checkNewLoginTokenOrg,
  validateForceLoginOrg,
  getAccountInformation,
  getStoredOAuthSubscriptionType,
  getUnapprovedCustomApiKey,
  getClaudeAIOAuthTokensAsync,
  handleOAuth401Error,
  readFreshOAuthAccessToken,
  clearOAuthTokenCache,
  claudeAISignInTokenInForce,
  getUsageCreditsCommand,
  effectiveAuthTokenEnv,
  isAnthropicAuthEnabled,
  getAnthropicApiKeyWithSource,
  isHostManagedAnthropicApiBearer,
  storedPlanVerifiedAtOf,
  getClaudeAIOAuthTokenOriginAsync,
  readStoredLoginOrganizationAfresh,
  getAnthropicApiKeyWithSourceSafe,
  isExtraUsageAllowed,
  noteAuthRefreshStop,
  isConsumerSubscriber,
  isGatewayLoginForced,
  rejudgeHostLaunchedGateway,
  resetAuthFailureTracking,
  TOKEN_REFRESH_OUTCOMES_BEFORE_POST,
  getDefaultAwsProviderChain,
  invalidateDefaultAwsProviderChainDebounced,
  defaultAwsProviderChainResolver,
  isUsing3PServices,
  clearApiKeyHelperCache,
  clearAwsCredentialsCache,
  resetAwsAuthRefreshCooldown,
  clearGcpCredentialsCache,
  hasLoginManagedKey,
  getRateLimitTier,
  startupReadsStoredLogin,
  AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
  is1PApiCustomer,
  otelHeadersHelperFailureKind,
  getConfiguredOtelHeadersHelper,
  getOtelHeadersFromHelper,
  prefetchOtelHeadersFromHelper,
  isOAuthRefreshKnownDeadAsync,
  withOAuthRefreshLock,
  markRefreshTokenDeadAfterInvalidGrant,
  saveRefreshedOAuthTokensRespectingLock,
  OAuthRefreshLockContendedError,
  isOAuthRefreshKnownDead,
  getRequestCredentials,
  getApiKeyHelperLastFailure,
  getOauthAccountInfo_2,
  getClaudeAIOAuthTokenFingerprint,
  isClaudeAISubscriberAsync,
  isBareModeAuthRestricted,
  isTeamSubscriber,
  isEnterpriseSubscriber,
  getModelAccessCache,
  getOrgModelDefaultCache,
  isProSubscriber,
  hasOAuthScope,
  getTurnOnUsageCreditsStep,
  getSubscriptionUnavailableMessage,
  isAwsAuthRefreshFromProjectSettings,
  getConfiguredAwsAuthRefresh,
  isGcpAuthRefreshFromProjectSettings,
  getConfiguredGcpAuthRefresh,
  HostManagedNoCredsError,
  waitForOAuthRefreshLocksReleased,
  oauthRefreshExitCapMs,
  OAUTH_REFRESH_EXIT_WAIT_CAP_MS,
  waitForInFlightOAuthRefresh,
  getAnthropicApiKey,
  isOAuthBearerSource,
  getAdditionalModelOptionsCache,
  hasBootstrapModelOptions,
  gcpSignInFailures,
  awsSignInFailures,
  getOAuthAccountOnHold,
  refreshAndGetAwsCredentials,
  clearAwsHelperCredentialsCache,
  markGcpCredentialsRejected,
  hasAnthropicApiKeyAuth,
  isMaxSubscriber,
  oauth401DedupByHost,
  readFreshOAuthCredentialSnapshot,
  getStoredOAuthTokenExpiresAt,
  isLoginStashedInTokenSlot,
  mayHaveProfileScope,
  restoreGatewayAuth,
  canAuthenticateChromeBridge,
  describeHowToDisableAuthTokenSource,
  getApiKeySourceSafe,
  hasAnthropicApiKey,
  hostManagedNoCredsError,
  checkAndRefreshOAuthTokenIfNeededWithOutcome,
  hostManagedAwsSdkCredentials,
  refreshGcpCredentialsIfNeeded,
  getConfiguredVertexProjectId,
  storedLoginReachedTimeLimit,
  loginSwitchMemo,
  getApiKeyFromApiKeyHelper,
  hasStoredOAuthRefreshToken,
  getDeviceKeysFilePath,
  hostOrgSignInBearer,
  getAnthropicApiKeyFingerprint,
  isProfileRemoteSettingsCredential,
  injectedOAuthTokenRecovery,
  isAuthFailureWorthRetrying,
  clearOAuthTokenMemos,
  storeRecheckNeeded,
  checkOAuthCredentialsChangedOnDisk,
  getApiKeyPrefixBucket,
  managedConfigNotAttemptedInput,
  TEAM_MEMORY_SCOPE,
  prefetchApiKeyFromApiKeyHelperIfSafe,
  getForcedLoginMethod,
  providerAllowlistRefusal,
  resolveLoginOrgPin,
  isFirstPartyManagedOAuthContext,
  getStoredOAuthTierVerifiedAt,
  prefetchAwsCredentialsAndBedRockInfoIfSafe,
  prefetchGcpCredentialsIfSafe,
  isGatewayAuthRestoredFromStore,
  getRateLimitTier_2,
  wasOAuthAccessTokenSavedByThisProcess,
  toAccountInfo,
  subscribeOAuthCredentialsChangedOnDisk,
  getApiKeyHelperElapsedMs,
  getOtelHeadersHelperLastFailure,
  onOtelHeadersHelperFailure,
  saveOAuthTokensIfNeeded,
  OAUTH_TOKEN_SAVE_FAILED_WARNING,
  storedOAuthTokenEquals,
  resetEnvDerivedAuthCaches,
  primeStoredLoginCopy,
  primeStoredLogin,
  saveApiKey,
  isUnmarkedStoredPlan,
  isProvisionalProfilePlan,
  isProfilePlanDowngrade,
  backfillStoredOAuthTier,
  textLengthAndLines,
  isApiKeyHelperSafeToInvoke,
  hasAnthropicDirectApiKey,
  isTeamPremiumSubscriber,
  isEnterprisePAYGSubscriber,
  isUsableClaudeAILoginRecord,
  adminPolicyUnreadable,
  hasExistingSignIn,
  policyUnreadableForEnforcement,
  beginOAuthRefreshLockHold,
  removeApiKey,
  ownStoredLoginPlanAttributes,
  launcherSignInMethodRefusal,
  getAnthropicApiKeyWithSourceAsyncSafe,
  isProfileAuthShadowed,
  getAuthTokenSourceAsync,
  handleOAuth401ErrorImpl_2,
  refreshAwsAuth,
  onEnvApiKeyApprovalFlipped,
  getSubscriptionName,
  getRateLimitTierOverride,
  hasClaudeAiBillingRole,
  getSeatTier,
  isManagedOAuthContext,
  OAUTH_REFRESH_EXIT_DEADLINE_MS,
  SDK_OAUTH_REFRESH_ENTRYPOINTS,
  __resetKnownDeadRefreshTokensForTest,
  _resetCredentialsChangeCheckForTesting,
  acquireOAuthRefreshLock,
  apiKeyHelperStates,
  authFailureClocks,
  awsAuthRefreshStates,
  awsCredentialMemos,
  bareSignInRefusals,
  calculateApiKeyHelperTTL,
  checkGcpCredentialsValid,
  clearOtelHeadersCache,
  gatewayAuthProvenance,
  gcpAuthRefreshStates,
  gcpRefreshMemos,
  getAccountInformationAsync,
  getAnthropicApiKeyAsync,
  getAnthropicApiKeyWithSourceAsync,
  getApiKeyFromApiKeyHelperCached,
  getApiKeyFromConfigOrMacOSKeychainAsync,
  getOauthAccountInfoAsync,
  getRateLimitTierAsync,
  getSeatTierAsync,
  getSubscriptionNameAsync,
  getSubscriptionTypeAsync,
  hasAnthropicApiKeyAuthAsync,
  hasOpusAccess,
  hasOpusAccessAsync,
  hasProfileScopeAsync,
  hasStoredUsableClaudeAILogin,
  hostLaunchedSettingsSourceVerdict,
  hostManagedAwsProviderChain,
  is1PApiCustomerAsync,
  isAnthropicAuthEnabledAsync,
  isAwsCredentialExportFromProjectSettings,
  isConsumerSubscriberAsync,
  isEnterprisePAYGSubscriberAsync,
  isEnterpriseSubscriberAsync,
  isExpectedOAuthRefreshError,
  isMaxSubscriberAsync,
  isOtelHeadersHelperFromProjectOrLocalSettings,
  isOverageProvisioningAllowed,
  isOverageProvisioningAllowedAsync,
  isProSubscriberAsync,
  isTeamPremiumSubscriberAsync,
  isTeamSubscriberAsync,
  isUserExportedOAuthEnvToken,
  loginManagedKeyMemos,
  noteAuthRecoveryOutcome,
  oauthRefreshLockHolds,
  oauthRefreshLockOptions,
  oauthTokenReadMemos,
  orgVerificationFailedMessage,
  otelHeadersHelperStates,
  refreshGcpAuth,
  resolveWithStallGuard,
  waitForRotatedEnvToken,
  wifAuthDebugNotices,
};
