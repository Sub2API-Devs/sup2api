/**
 * utils/auth.ts
 *
 * 认证核心：API key / Bearer 令牌来源判定、apiKeyHelper 执行与缓存、OAuth 令牌读取/刷新/401 处理、AWS/GCP 凭证刷新、订阅类型与权益判断、组织 pin 校验、otelHeadersHelper。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/auth.ts
 * pieces: chunk-171dhyhe.js (2), chunk-30p0tvt0.js (1), chunk-3g8vhh6f.js (1), chunk-4pc1m5n9.js (1), chunk-4xpk3fhh.js (1), chunk-71c4j971.js (1), chunk-aepeg2w5.js (365), chunk-cdz6g143.js (2), chunk-dcmhvw5a.js (1), chunk-e6aww6q8.js (2), chunk-g54kbxqw.js (1)
 * attribution: affinity 5, fingerprint 22, placement 6, layout 102, facade-majority 242, file-local 1
 */
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  stat,
  realpath,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  dirname,
  dirname as dirname_2,
  resolve,
  resolve as resolve_2,
} from "path";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
} from "crypto";
import { exec, execFile } from "child_process";
import { homedir } from "os";
import {
  Zt,
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
import { Na, sl, R3t, ky } from "../services/gateway/constants.js";
import {
  getOauthConfig,
  oauthScopesFromEnv,
  I1,
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
  K1e,
  v$,
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
import { Dpr, hostOf, lf, activeAllowlistEntries, cf } from "../services/gateway/internalNetworks.js";
import { verifyGatewayHost, fetchGatewayCertificate } from "../services/gateway/vouching.js";
import { readGatewayEnvConfig } from "../services/gateway/gatewayAuth.js";
import {
  CA,
  RA,
  isGatewayLoginRequired,
  storageKindForTelemetry,
} from "../services/gateway/gatewayCredentialStore.js";
import { PassingCauseError } from "./errors/PassingCauseError.js";
import { getSecureStorage } from "./secureStorage/index.js";
import { fSr } from "./anthropicHosts.js";
import { logError } from "./log.js";
import { isBareMode, isAntBuild, isEnvTruthy, isSafeMode, parseNumberOrDefault } from "./envUtils.js";
import { warnPinnedHelper, C6e, runManagedHelperWithoutProjectEnv, flt } from "./auth/managedHelpers.js";
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
import { nge, TimedOperation, Uv } from "./auth/lockHolderLiveness.js";
import { W3t, emitCredentialChange } from "./auth/credentialEpoch.js";
import { decodeJwtExpiry } from "../bridge/jwtUtils.js";
import { sequential } from "./sequential.js";
import { AwsAuthStatusManager } from "./awsAuthStatusManager.js";
import { safeExecShell, safeExecFile } from "./safeSpawn.js";
import { truncateToLength, ql } from "./stringUtils.js";
import { findUnsafeChar, describeUnsafeValue } from "./settings/managedSettingsKeys.js";
import {
  CloudAuthRefreshRuns,
  RefreshController,
  runCloudAuthRefresh,
  So,
} from "./auth/cloudAuthRefreshLock.js";
import {
  checkStsCallerIdentity,
  getAwsProfileRegionHints,
  extractStsCredentials,
  clearAwsIniCache,
} from "./aws.js";
import { Tv, ije } from "./disklessSession.js";
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
  FOe,
  KEYCHAIN_CACHE_TTL_MS,
  getProjectDirsUpToHome,
} from "./secureStorage/macOsKeychainHelpers.js";
import { fromEnum, lit, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { classifyKeychainError } from "./_new/classifyKeychainError.js";
import { gn } from "./shortHash.js";
import { scrubErrorText, errorTelemetryFields } from "./accessibility/screenReader.js";
import { clearLegacyApiKeyPrefetch } from "./secureStorage/keychainPrefetch.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { ge } from "./identity.js";
import { createSignal } from "./signal.js";
import { invalidatePlainTextStoreCopy } from "./secureStorage/plainTextStorage.js";
import { clearBetasCaches } from "./betas.js";
import { LA, invalidateToolDescriptions } from "../services/api/toolDescriptionCache.js";
import {
  forgetHeldHostSessionsBearer,
  recoverHostSessionsBearer,
  ensureHostSessionsBearer,
} from "./hostSessionsBearer.js";
import { Mxt } from "../services/api/fileReferenceCalls.js";
import { withoutSSHTunnelVars, withoutHostManagedProviderVars } from "./managedEnv.js";
import { Vt } from "./agentId.js";
import { lock } from "./lockfile.js";
import {
  Mf,
  writeLockOwnerRecord,
  removeOwnLockOwnerRecord,
  checkLockStillOwned,
} from "./auth/oauthRefreshLock.js";
import { registerOAuthRefreshExitWait } from "./auth/oauthRefreshExitWait.js";
import { getFsImplementation } from "./fsOperations.js";
import { READ_FAILED } from "./secureStorage/storageWriteLock.js";
import { checkAllowedProvider, Ef, recheckAllowedProviderEndpoint, WS } from "./model/allowedProviders.js";
import { getLspManager } from "../services/lsp/manager.js";
import { artifactPathPrefix, isArtifactMountMode } from "../services/artifacts/artifactMount.js";
import { getBgDispatcherPlanInfo } from "./subprocessEnv.js";
import { isPlanDisplayName, validateOauthToken } from "../services/oauth/validateOauthToken.js";
import { stripControlChars } from "./settings/writeQueues.js";
import { getHostAuthEnvVar } from "./managedEnvConstants.js";
import { XFt } from "../services/design/designApi.js";
import { Dc } from "../../vendor/lru-cache/dist/esm/index.min.js";
import { computeChecksumFromSettings, Ge, yt } from "../services/remoteManagedSettings/index.js";
import { getEmail } from "./user.js";
import { ou } from "../_unattributed/chunk-dcmhvw5a/part-001.js";

/**
 * 环境覆盖的限流档位；本构建中覆盖开关被编译成恒为 null。
 */
//@ chunk-aepeg2w5.js:288708-288779 fingerprint = getRateLimitTier (1)
function getRateLimitTier_2() {
  let oauthTokens = Zt();
  return (oauthTokens.enabled, null);
  return oauthTokens.rateLimitTier;
}
/**
 * 环境覆盖的订阅类型；本构建中恒为 null。
 */
//@ chunk-aepeg2w5.js:288779-288856 fingerprint = getSubscriptionType (1)
function hasSubscriptionTypeOverride() {
  let oauthTokens = Zt();
  return (oauthTokens.enabled, null);
  return oauthTokens.subscriptionType || MAX;
}
//@ chunk-aepeg2w5.js:288856-288929 layout = getSubscriptionType (1)
function getStoredSubscriptionType() {
  let oauthTokens = Zt();
  return oauthTokens.enabled && oauthTokens.subscriptionType !== null && !1;
}
//@ chunk-aepeg2w5.js:288929-288956 placement
function getRateLimitTierOverride() {
  return null;
}
//@ chunk-aepeg2w5.js:504563-504595 affinity
var e1 = 300000,
  eT = 30000,
  t1 = 16384;
//@ chunk-aepeg2w5.js:504595-504644 facade-majority
function isManagedOAuthContext() {
  return env.CLAUDE_CODE_REMOTE || isHostEntrypoint();
}
//@ chunk-aepeg2w5.js:504644-504710 facade-majority = withoutHostManagedProviderVars (1)
function isHostManagedProviderAuth() {
  return env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST || isLauncherStartedProcess();
}
/**
 * Remote Control 可用时返回 BASE_API_URL 规范化后的基址，否则 false。
 */
//@ chunk-aepeg2w5.js:504710-504845 facade-majority = getBridgeBaseUrl (0.653)
function isHostManagedAnthropicApiBearer() {
  if (
    !isHostManagedProviderAuth() ||
    !effectiveAuthTokenEnv() ||
    isFirstPartyManagedOAuthContext() ||
    !isFirstPartyProvider() ||
    !isActualFirstPartyAnthropicBaseUrl() ||
    env.ANTHROPIC_UNIX_SOCKET
  )
    return !1;
  try {
    return Na(getOauthConfig().BASE_API_URL);
  } catch {
    return !1;
  }
}
/**
 * 带 --host-auth-is-org-sign-in 且有桥基础地址时，取宿主下发的组织登录凭证。
 */
//@ chunk-aepeg2w5.js:504845-504919 facade-majority
function hostOrgSignInBearer() {
  return eagerHasCliFlag("--host-auth-is-org-sign-in") && isHostManagedAnthropicApiBearer()
    ? effectiveAuthTokenEnv()
    : void 0;
}
//@ chunk-aepeg2w5.js:504919-504957 layout
function vn() {
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
    let {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      profile: profile,
      configFile: configFile,
      credsFile: credsFile,
    } = getAwsEnvCredentials();
    if (accessKeyId && secretAccessKey) {
      let AWS_SESSION_TOKEN = env.AWS_SESSION_TOKEN;
      return async () => ({
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        ...(AWS_SESSION_TOKEN && { sessionToken: AWS_SESSION_TOKEN }),
      });
    }
    if (configFile || credsFile) {
      if (configFile) {
        let w = await resolveSsoCredentials(configFile, credsFile, profile);
        if (w) return async () => w;
      }
      let { fromIni: fromIni } = await import("./chunk-thwbpw6e.js");
      return fromIni({
        ...(profile && { profile: profile }),
        configFilepath: configFile ?? credsFile,
        filepath: credsFile ?? configFile,
        ignoreCache: !0,
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
  let {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    configFile: configFile,
    credsFile: credsFile,
  } = getAwsEnvCredentials();
  return Boolean((accessKeyId && secretAccessKey) || configFile || credsFile);
}
//@ chunk-aepeg2w5.js:506214-506303 layout
var r1 = DoctorLazy(() => create({ accessToken: create_2().min(1), expiresAt: create_2() })),
  o1 = /^[a-z0-9-]{1,32}$/,
  i1 = 128;
/**
 * 按宿主缓存的 AWS 凭据解析器：ssoProfile 从 AWS 配置/凭据文件解析出纯 SSO 角色配置（排除静态密钥、credential_process、角色链等）；ssoRole 用 SSO 缓存令牌换取角色临时凭据（按过期时间缓存）；helper 通过凭据助手解析；defaultChain 为默认链解析器的有界缓存。
 */
//@ chunk-aepeg2w5.js:506303-508382 layout
class AwsCredentialMemos {
  ssoProfile = memoizeWithTTL(async (e, n, r) => {
    let { loadSharedConfigFiles: loadSharedConfigFiles } = await import("./chunk-72ngr4xp.js").then((m) =>
        Re(m.default, 1),
      ),
      { configFile: configFile, credentialsFile: credentialsFile } = await loadSharedConfigFiles({
        configFilepath: e,
        filepath: n ?? e,
        ignoreCache: !0,
      }),
      S = configFile[r ?? "default"],
      w = credentialsFile[r ?? "default"],
      R = { ...S, ...w },
      { sso_account_id: sso_account_id, sso_role_name: sso_role_name } = R;
    if (!S || !sso_account_id || !sso_role_name) return null;
    if (
      (R.aws_access_key_id && R.aws_secret_access_key) ||
      R.credential_process ||
      R.role_arn ||
      R.source_profile ||
      R.credential_source ||
      R.web_identity_token_file
    )
      return null;
    let F = R.sso_session ? configFile[`sso-session.${R.sso_session}`] : R,
      L = F?.sso_start_url,
      G = F?.sso_region;
    if (!L || !G || !o1.test(G)) return null;
    if (R.sso_session && ((R.sso_start_url && R.sso_start_url !== L) || (R.sso_region && R.sso_region !== G)))
      return null;
    return { cacheId: R.sso_session ?? L, accountId: sso_account_id, roleName: sso_role_name, region: G };
  });
  ssoRole = memoizeWithTTL(
    async (e, n, r, s) => {
      let h;
      try {
        h = jsonParse(await readFile(e, "utf-8"));
      } catch {
        return null;
      }
      let safeParse = r1().safeParse(h);
      if (!safeParse.success) return null;
      let parse = Date.parse(safeParse.data.expiresAt);
      if (!Number.isFinite(parse) || parse <= Date.now()) return null;
      let [{ SSOClient: w, GetRoleCredentialsCommand: R }, x] = await Promise.all([
          import("./chunk-4hyzk0wr.js"),
          getAWSProxyRequestHandler({
            url: `https://portal.sso.${s}.amazonaws.com`,
            requestTimeoutMs: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
          }),
        ]),
        P = new w({
          region: s,
          requestHandler:
            x ?? new sl.FetchHttpHandler({ requestTimeout: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS }),
        }),
        { roleCredentials: roleCredentials } = await resolveWithStallGuard(
          P.send(new R({ accessToken: safeParse.data.accessToken, accountId: n, roleName: r })),
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
      if (e === null) return !1;
      if (e.expiration === void 0) return !0;
      let time = e.expiration.getTime();
      if (time > Date.now() + AWS_CHAIN_REQUEST_TIMEOUT_MS) return !0;
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
      let s = awsChainCacheKey(r),
        h = e.get(s);
      if (h) return h;
      let y = createAwsDefaultChainResolver(r);
      if (e.size >= i1) e.delete(e.keys().next().value);
      return (
        e.set(s, y),
        y.catch(() => {
          if (e.get(s) === y) e.delete(s);
        }),
        y
      );
    }
    ((n.cache = e), (this.defaultChain = n));
  }
}
//@ chunk-aepeg2w5.js:508382-508408 facade-majority
var awsCredentialMemos = new HostScoped(() => new AwsCredentialMemos());
/**
 * 用宿主固定的缓存解析 AWS SSO 凭据：读取配置找到 SSO 会话，按 sso-session/start_url 的 sha1 定位缓存令牌文件并换取角色凭据；失败时记调试日志并返回 null（回退 fromIni）。
 */
//@ chunk-aepeg2w5.js:508408-508788 layout
async function resolveSsoCredentials(e, n, r) {
  let of = awsCredentialMemos.of(getRootSession().host);
  try {
    let ssoProfile = await of.ssoProfile(e, n, r);
    if (!ssoProfile) return null;
    let y = join_3(
      dirname_2(e),
      "sso",
      "cache",
      `${createHash_2("sha1").update(ssoProfile.cacheId).digest("hex")}.json`,
    );
    return await of.ssoRole(y, ssoProfile.accountId, ssoProfile.roleName, ssoProfile.region);
  } catch (error) {
    return (
      logForDebugging(
        `[API:auth] host-pinned SSO leg failed (${error instanceof Error ? error.name : "unknown"}) \u2014 falling back to fromIni`,
      ),
      null
    );
  }
}
//@ chunk-aepeg2w5.js:508788-508911 facade-majority
function hostManagedAwsSdkCredentials(e) {
  if (!hasAwsEnvCredentials()) throw hostManagedNoCredsError(e, BACKGROUND_UNSUPPORTED_CREDENTIAL_MSG);
  let n = hostManagedAwsProviderChain(e);
  return { providerChainResolver: n, credentials: async (r) => (await n())(r) };
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
class sT {
  implicitProfileSkippedLogged = !1;
  profileAuthSelectedLogged = !1;
}
//@ chunk-aepeg2w5.js:509098-509124 facade-majority
var wifAuthDebugNotices = new HostScoped(() => new sT());
/**
 * 同时存在 Anthropic profile 与 claude.ai 登录时提示使用 claude.ai 登录（只提示并打点一次）。
 */
//@ chunk-aepeg2w5.js:509124-509493 layout
function logImplicitProfileSkipped(e) {
  if (e.implicitProfileSkippedLogged) return;
  (logForDebugging(
    `An Anthropic profile (~/.config/anthropic) is configured, but a claude.ai login exists \u2014 using the claude.ai login. Set ANTHROPIC_PROFILE=<name> to use the profile instead.${""}`,
    { level: "warn" },
  ),
    queueMicrotask(() => logEvent("tengu_wif_implicit_profile_skipped_stored_login", {})),
    (e.implicitProfileSkippedLogged = !0));
}
//@ chunk-aepeg2w5.js:509493-509780 layout
function logProfileAuthSelected(e) {
  if (e.profileAuthSelectedLogged) return;
  let n = getWIFPrecedenceSource() ?? "profile";
  (logForDebugging(
    `Using Anthropic profile auth (${n}); ${wouldWIFProfileYieldToClaudeAILogin() ? "a claude.ai login (/login) would take precedence over it" : "this takes precedence over any stored claude.ai login"}`,
    { level: "info" },
  ),
    (e.profileAuthSelectedLogged = !0));
}
//@ chunk-aepeg2w5.js:509780-509952 facade-majority
function isProfileAuthShadowed(e = {}) {
  return Boolean(
    isBareModeAuthRestricted() ||
    env.ANTHROPIC_UNIX_SOCKET ||
    isManagedOAuthContext() ||
    vn() ||
    env.ANTHROPIC_AUTH_TOKEN ||
    env.CLAUDE_CODE_OAUTH_TOKEN ||
    getOAuthTokenFromFileDescriptor() ||
    (e.skipApiKeyHelper ? !1 : getConfiguredApiKeyHelper()) ||
    !isFirstPartyProvider(),
  );
}
//@ chunk-aepeg2w5.js:509952-510157 facade-majority
function shouldUseWIFAuth(e = {}) {
  if (!isWIFActive()) return !1;
  if (isProfileAuthShadowed(e)) return !1;
  let n = e.skipApiKeyHelper ? void 0 : wifAuthDebugNotices.of(getRootSession().host);
  if (getWIFPrecedenceSource() === "profile-implicit") {
    let r = getClaudeAIOAuthTokens();
    if (isUsableClaudeAILoginRecord(r) && wouldWIFProfileYieldToClaudeAILogin()) {
      if (n) logImplicitProfileSkipped(n);
      return !1;
    }
  }
  if (n) logProfileAuthSelected(n);
  return !0;
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
    shouldUseWIFAuth({ skipApiKeyHelper: !0 }) &&
    getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 }).key === null
  );
}
//@ chunk-aepeg2w5.js:510341-510407 facade-majority
var SDK_OAUTH_REFRESH_ENTRYPOINTS = new Set(["claude-desktop", "local-agent", "claude-vscode"]);
//@ chunk-aepeg2w5.js:510407-510485 layout
async function UA() {
  let e = getGatewayAuth();
  if (!e || !isProviderManagedByHost() || e.hostVerdict) return;
  await verifyGatewayHost_2(e);
}
//@ chunk-aepeg2w5.js:510485-510555 facade-majority
async function rejudgeHostLaunchedGateway() {
  let e = getGatewayAuth();
  if (!e?.hostVerdict) return;
  await verifyGatewayHost_2(e);
}
//@ chunk-aepeg2w5.js:510555-510567 layout
var l1 = 3000;
/**
 * 校验登录网关是否为本机托管设置指定的组织网关；未通过时探测网关的托管设置（是否有 Code 标签页规则或未应答），把判定写回当前网关认证状态。
 */
//@ chunk-aepeg2w5.js:510567-511005 layout
async function verifyGatewayHost_2(e) {
  let n = `Bearer ${e.jwt}`,
    r = getHostPolicyLoginPins(),
    s = await hostLaunchedSettingsSourceVerdict(e.url, r, n);
  if ("verified" in s && !s.verified) {
    let y = r.forceLoginGatewayUrl ?? getMachineAdminDocumentTier()?.forceLoginGatewayUrl,
      S = HA(e.url) || HA(y) ? void 0 : await probeGatewayManagedSettings(e.url, n, l1),
      w = y !== void 0 && compareGatewayUrls(y, new URL(e.url)) !== "same";
    if (typeof S === "object") s = { ...s, codeTabRulesUnanswered: S.unanswered };
    else if (S || (S === !1 && !w)) s = { ...s, hasCodeTabRules: S };
  }
  let h = getGatewayAuth();
  if (h !== null && h.url === e.url) setGatewayAuth({ ...h, hostVerdict: s });
}
//@ chunk-aepeg2w5.js:511005-511084 layout
function HA(e) {
  try {
    return e !== void 0 && Dpr(hostOf(new URL(normalizeGatewayUrl(e))));
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:511084-511194 layout
var GATEWAY_NOT_NAMED_REASON =
  "this machine's managed settings do not name it as the organization's gateway (forceLoginGatewayUrl).";
//@ chunk-aepeg2w5.js:511194-511833 facade-majority
async function hostLaunchedSettingsSourceVerdict(e, n, r) {
  let s = new URL(e);
  if (/[?#]/.test(s.href) || s.username || s.password)
    return {
      verified: !1,
      reason:
        "the gateway address it was started with carries a query, fragment or user name, which no gateway address has.",
    };
  let h = Dpr(hostOf(s)),
    y = n.gatewayInternalNetworks ?? [],
    forceLoginGatewayUrl = n.forceLoginGatewayUrl,
    w;
  if (forceLoginGatewayUrl === void 0) w = h ? void 0 : GATEWAY_NOT_NAMED_REASON;
  else {
    let R = compareGatewayUrls(forceLoginGatewayUrl, s);
    if (typeof R === "object") {
      if (R.voucher === void 0) return { verified: !1, reason: R.reason };
      return verifyGatewayHost(e, [], void 0, R.reason, R.voucher);
    }
    w =
      R === "same" || h
        ? void 0
        : `this machine's managed settings name ${s.origin} as the organization's gateway, not ${s.origin}${ym(s)}.`;
  }
  return verifyGatewayHost(e, w === void 0 ? y : [], r, w);
}
/**
 * 比较托管设置指定的网关 URL 与实际网关：同源且路径一致为 same、仅同源为 origin；否则返回原因（同为 https 无端口且主机可担保时附 voucher 主机名）；配置值无法使用时返回对应原因。
 */
//@ chunk-aepeg2w5.js:511833-512377 layout
function compareGatewayUrls(configuredUrl, actualUrl) {
  let configured;
  try {
    configured = new URL(normalizeGatewayUrl(configuredUrl));
  } catch {
    configured = void 0;
  }
  if (!configured?.host)
    return {
      reason:
        "this machine's managed settings name the organization's gateway (forceLoginGatewayUrl) with a value /login cannot use either.",
    };
  let s = ym(configured),
    h = ym(actualUrl),
    y = s === "" || s === h;
  if (configured.origin === actualUrl.origin && y) return s === h ? "same" : "origin";
  let S = `this machine's managed settings name ${configured.origin}${s} as the organization's gateway, not ${actualUrl.origin}${h}.`;
  return y &&
    actualUrl.protocol === "https:" &&
    configured.protocol === "https:" &&
    configured.port === "" &&
    lf(configured.hostname)
    ? { reason: S, voucher: configured.hostname }
    : { reason: S };
}
//@ chunk-aepeg2w5.js:512377-512429 layout
function ym(e) {
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
  return Boolean(env.CLAUDE_CODE_OAUTH_TOKEN) || getClaudeAIOAuthTokens()?.accessToken !== void 0;
}
//@ chunk-aepeg2w5.js:512853-512897 facade-majority
var gatewayAuthProvenance = new HostScoped(() => ({ restoredFromStore: !1 }));
//@ chunk-aepeg2w5.js:512897-512954 facade-majority
function isGatewayAuthRestoredFromStore() {
  return gatewayAuthProvenance.of(getRootSession().host).restoredFromStore;
}
//@ chunk-aepeg2w5.js:512954-514913 facade-majority
async function restoreGatewayAuth(e, n = () => !getIsNonInteractiveSession()) {
  let of = gatewayAuthProvenance.of(getRootSession().host);
  if (((of.restoredFromStore = !1), readGatewayEnvConfig())) {
    await UA();
    return;
  }
  if (env.CLAUDE_CODE_USE_GATEWAY && !env.ANTHROPIC_AUTH_TOKEN && K1e()) {
    let s = await CA();
    if (readGatewayEnvConfig()) {
      await UA();
      return;
    }
    if (K1e() && RA(s))
      throw new PassingCauseError(
        "CLAUDE_CODE_USE_GATEWAY is set but the credential hand-off file is still locked by another process (an antivirus scan?), or this process is refused the file: check its permissions. Try again.",
      );
    if (K1e())
      throw new PassingCauseError(
        "CLAUDE_CODE_USE_GATEWAY is set but the credential hand-off file is still locked by another process (an antivirus scan?). Try again.",
      );
  }
  if (vn()) return;
  try {
    let async = await getSecureStorage().readAsync(e),
      h = async?.enterpriseGateway;
    if (!h) return;
    let y = hostOf(new URL(h.url)),
      S = async?.gatewayTrust?.[y];
    if (!S) {
      if (n())
        process.stderr
          .write(`Cloud gateway ${y} is not trusted on this machine \u2014 run /login to reconnect.
`);
      return;
    }
    if (h.expiresAt <= Date.now() && !h.idpRefreshToken) {
      if (n())
        process.stderr.write(
          R3t +
            `
`,
        );
      return;
    }
    let w = async?.gatewayAllowlistEntries?.[y];
    if (w !== void 0 && !activeAllowlistEntries().some((R) => cf(R) === w)) {
      let R = `Not connected to Cloud gateway ${y}: the saved sign-in has ended. Run /login. If that is refused, update Claude Code, or ask your administrator which version to use.`;
      if (n())
        process.stderr.write(
          R +
            `
`,
        );
      logForDebugging(R, { level: "warn" });
      return;
    }
    if (isGatewayLoginRequired(h.url)) {
      let R = `Not connected to Cloud gateway ${y}: your organization's settings name another gateway or none.`;
      if (n())
        process.stderr.write(
          R +
            `
`,
        );
      logForDebugging(R, { level: "warn" });
      return;
    }
    if (h.vouchedAtLogin === !0 || fSr(h.jwt)) holdGatewayHostStrict(y);
    try {
      let R = await fetchGatewayCertificate(h.url, 3000);
      if (R.fingerprint !== S) {
        if (n())
          process.stderr
            .write(`Cloud gateway ${y} TLS certificate changed since you connected \u2014 run /login to verify and reconnect.
`);
        logForDebugging(
          `[gateway] TLS fingerprint mismatch on restore for ${y}: pinned ${S}, live ${R.fingerprint}`,
          { level: "warn" },
        );
        return;
      }
    } catch (error) {
      logForDebugging(
        `[gateway] TLS fingerprint probe failed on restore for ${y} (${errorMessage(error)}); proceeding without re-verify`,
      );
    }
    (setGatewayAuth(h), (of.restoredFromStore = !0));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-aepeg2w5.js:514913-514949 facade-majority
var bareSignInRefusals = new HostScoped(() => ({ isRefused: !1 }));
//@ chunk-aepeg2w5.js:514949-514990 facade-majority
function isBareModeAuthRestricted() {
  if (!isBareMode()) return !1;
  return !0;
}
/**
 * 是否走 Anthropic 第一方认证（Claude.ai OAuth）。--bare 且仅 bare 凭证、第三方提供方、profile（WIF）时为 false；存在 ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY / apiKeyHelper / API key FD（且非远程会话）时也为 false。ANTHROPIC_UNIX_SOCKET 时只看 CLAUDE_CODE_OAUTH_TOKEN。
 */
//@ chunk-aepeg2w5.js:514990-515409 facade-majority = isAnthropicAuthEnabled (0.662)
function isAnthropicAuthEnabled() {
  let e = isBareMode();
  if (e && isBareModeAuthRestricted()) return !1;
  if (env.ANTHROPIC_UNIX_SOCKET) return !!env.CLAUDE_CODE_OAUTH_TOKEN;
  if (shouldUseWIFAuth()) return !1;
  let n = !isFirstPartyProvider(),
    r = getSettings_DEPRECATED() || {},
    s = e ? getConfiguredApiKeyHelper() : warnPinnedHelper("apiKeyHelper", r.apiKeyHelper),
    h = effectiveAuthTokenEnv(),
    y;
  try {
    y = getAnthropicApiKeyWithSource({ skipRetrievingKeyFromApiKeyHelper: !0 }).source;
  } catch {
    return !1;
  }
  let S = y === "ANTHROPIC_API_KEY" || y === "apiKeyHelper",
    w = isManagedOAuthContext(),
    R = !w && v$("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR"),
    x = ((h || S) && !isFirstPartyManagedOAuthContext()) || ((s || R) && !w);
  return !(n || x);
}
//@ chunk-aepeg2w5.js:515409-515842 facade-majority = bothAuthMethodsNotice (0.523)
function describeHowToDisableAuthTokenSource(e) {
  switch (e) {
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
      return `Unset the ${e} environment variable.`;
  }
}
//@ chunk-aepeg2w5.js:515842-515898 facade-majority
function effectiveAuthTokenEnv() {
  return isAntBuild() ? void 0 : env.ANTHROPIC_AUTH_TOKEN;
}
/**
 * 判定 Bearer 令牌来源，顺序：ANTHROPIC_AUTH_TOKEN → CLAUDE_CODE_OAUTH_TOKEN（或宿主启动器令牌）→ OAuth 令牌 FD / CCR 令牌文件 → apiKeyHelper → profile（WIF）→ 已存 claude.ai OAuth（需 user:inference）→ none。--bare 下只认 apiKeyHelper。
 */
//@ chunk-aepeg2w5.js:515898-516563 facade-majority = getAuthTokenSource (0.886)
function getAuthTokenSource() {
  if (isBareModeAuthRestricted()) {
    if (getConfiguredApiKeyHelper()) return { source: "apiKeyHelper", hasToken: !0 };
    return { source: "none", hasToken: !1 };
  }
  if (effectiveAuthTokenEnv() && !isFirstPartyManagedOAuthContext())
    return { source: "ANTHROPIC_AUTH_TOKEN", hasToken: !0 };
  if (env.CLAUDE_CODE_OAUTH_TOKEN || usableLauncherHostLoginToken() !== null)
    return { source: "CLAUDE_CODE_OAUTH_TOKEN", hasToken: !0 };
  if (getOAuthTokenFromFileDescriptor()) {
    if (v$("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"))
      return { source: "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR", hasToken: !0 };
    return { source: "CCR_OAUTH_TOKEN_FILE", hasToken: !0 };
  }
  if (getConfiguredApiKeyHelper() && !isManagedOAuthContext())
    return { source: "apiKeyHelper", hasToken: !0 };
  if (shouldUseWIFAuth()) return { source: "profile", hasToken: !0 };
  let oauthTokenFromFd = getClaudeAIOAuthTokens();
  if (shouldUseClaudeAIAuth(oauthTokenFromFd?.scopes) && oauthTokenFromFd?.accessToken)
    return { source: "claude.ai", hasToken: !0 };
  return { source: "none", hasToken: !1 };
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
function getRequestCredentials(e, n) {
  let r = n !== "none" && !isClaudeAISubscriber();
  return {
    tokenSource: (e === "profile" ? !isWIFDispatchAuth() : r && isOAuthBearerSource(e)) ? "none" : e,
    apiKey: r,
  };
}
//@ chunk-aepeg2w5.js:516820-516860 facade-majority
function getAnthropicApiKey() {
  let { key: key } = getAnthropicApiKeyWithSource();
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
/**
 * getAnthropicApiKeyWithSource 的吞错包装，出错返回 {key:null, source:'none'}。
 */
//@ chunk-aepeg2w5.js:516944-517017 facade-majority
function getAnthropicApiKeyWithSourceSafe(e = {}) {
  try {
    return getAnthropicApiKeyWithSource(e);
  } catch {
    return { key: null, source: "none" };
  }
}
//@ chunk-aepeg2w5.js:517017-517137 facade-majority
function getAnthropicApiKeyFingerprint() {
  let { key: key, source: source } = getAnthropicApiKeyWithSourceSafe({
    skipRetrievingKeyFromApiKeyHelper: !0,
  });
  return { source: source, fingerprint: key ? computeContentHash(key) : null };
}
/**
 * 当前 API key 来源是否为 apiKeyHelper（远程会话除外）。
 */
//@ chunk-aepeg2w5.js:517137-517233 facade-majority
function isApiKeyHelperTheActiveCredential() {
  return (
    !isManagedOAuthContext() &&
    getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 }).source === "apiKeyHelper"
  );
}
//@ chunk-aepeg2w5.js:517233-517252 layout
var weakMap_5 = new WeakMap();
//@ chunk-aepeg2w5.js:517252-517384 facade-majority
function hasBootstrapModelOptions() {
  let e = getGlobalConfig();
  return (
    Array.isArray(e.additionalModelOptionsCache) && typeof e.additionalModelOptionsAnsweredAt === "number"
  );
}
/**
 * 读取 ~/.claude.json 的 additionalModelOptionsCache（服务端下发的额外模型选项）并校验形状。
 */
//@ chunk-aepeg2w5.js:517384-517905 facade-majority
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
      ...(s.disabled === !0 && { disabled: !0 }),
      ...(typeof s.promoListPrice === "string" && { promoListPrice: sanitizeTitle(s.promoListPrice) }),
    }));
  return (weakMap_5.set(additionalModelOptionsCache, mapped), mapped);
}
/**
 * 读取 modelAccessCache：服务端告知的各模型是否在订阅内（apiName, entitled）。
 */
//@ chunk-aepeg2w5.js:517905-518080 facade-majority
function getModelAccessCache() {
  let modelAccessCache = getGlobalConfig().modelAccessCache;
  return (Array.isArray(modelAccessCache) ? modelAccessCache : []).filter(
    (n) =>
      n != null && typeof n === "object" && typeof n.apiName === "string" && typeof n.entitled === "boolean",
  );
}
/**
 * 读取组织默认模型缓存 orgModelDefaultCache（需与当前组织匹配）。
 */
//@ chunk-aepeg2w5.js:518080-518489 facade-majority
function getOrgModelDefaultCache() {
  let e = getGlobalConfig(),
    orgModelDefaultCache = e.orgModelDefaultCache;
  if (
    orgModelDefaultCache == null ||
    typeof orgModelDefaultCache !== "object" ||
    typeof orgModelDefaultCache.name !== "string" ||
    typeof orgModelDefaultCache.updated_at !== "string" ||
    typeof orgModelDefaultCache.data_source !== "string" ||
    typeof orgModelDefaultCache.override_user_selection !== "boolean"
  )
    return null;
  let r = e.oauthAccount?.organizationUuid;
  if (orgModelDefaultCache.orgUuid != null && r != null && orgModelDefaultCache.orgUuid !== r) return null;
  let replaced = orgModelDefaultCache.name.replace(/[\x00-\x1f\x7f-\x9f]/g, "");
  return replaced === orgModelDefaultCache.name
    ? orgModelDefaultCache
    : { ...orgModelDefaultCache, name: replaced };
}
//@ chunk-aepeg2w5.js:518489-518679 facade-majority
function hasAnthropicDirectApiKey() {
  if (env.ANTHROPIC_AUTH_TOKEN) return !1;
  try {
    let { key: key, source: source } = getAnthropicApiKeyWithSource();
    if (!key || source === "/login managed key") return !1;
    return key.startsWith("sk-ant-") && key.slice(7, 10) === "api";
  } catch {
    return !1;
  }
}
/**
 * API key 格式分类（遥测用）：none / non_sk_ant / sk_ant_api03 / sk_ant_api02 / sk_ant_admin / sk_ant_other。
 */
//@ chunk-aepeg2w5.js:518679-518935 facade-majority
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
/**
 * 是否存在可用的 API key（不执行 apiKeyHelper）。
 */
//@ chunk-aepeg2w5.js:518935-519061 facade-majority = hasAnthropicApiKeyAuth (1)
function hasAnthropicApiKeyAuth() {
  try {
    let { key: key, source: source } = getAnthropicApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: !0,
    });
    return key !== null && source !== "none";
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:519061-519094 facade-majority
function hasAnthropicApiKey() {
  return getAnthropicApiKeySafe() != null;
}
/**
 * 取 API key 及来源：--bare 下只认 ANTHROPIC_API_KEY 与 apiKeyHelper；优先第三方时直接用 ANTHROPIC_API_KEY；否则依次为已审批（customApiKeyResponses.approved）的 ANTHROPIC_API_KEY → CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR → apiKeyHelper（缓存值）→ 全局配置 primaryApiKey（/login managed key）。skipRetrievingKeyFromApiKeyHelper 只报来源不执行。
 */
//@ chunk-aepeg2w5.js:519094-520173 facade-majority = getAnthropicApiKeyWithSource (0.569)
function getAnthropicApiKeyWithSource(opts = {}) {
  if (isBareModeAuthRestricted()) {
    if (env.ANTHROPIC_API_KEY) return { key: env.ANTHROPIC_API_KEY, source: "ANTHROPIC_API_KEY" };
    if (getConfiguredApiKeyHelper())
      return {
        key: opts.skipRetrievingKeyFromApiKeyHelper ? null : getApiKeyFromApiKeyHelperCached(),
        source: "apiKeyHelper",
      };
    return { key: null, source: "none" };
  }
  let apiKeyEnv = isAntBuild() ? void 0 : env.ANTHROPIC_API_KEY;
  if (apiKeyEnv && preferThirdPartyAuthentication()) return { key: apiKeyEnv, source: "ANTHROPIC_API_KEY" };
  if (isEnvTruthy(!1)) {
    let apiKeyFromFd = getApiKeyFromFileDescriptor();
    if (apiKeyFromFd) return { key: apiKeyFromFd, source: "ANTHROPIC_API_KEY" };
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
    if (apiKeyEnv) return { key: apiKeyEnv, source: "ANTHROPIC_API_KEY" };
    return { key: null, source: "none" };
  }
  if (apiKeyEnv && getCustomApiKeyStatus(nge(apiKeyEnv)) === "approved")
    return { key: apiKeyEnv, source: "ANTHROPIC_API_KEY" };
  let apiKeyFromFd = getApiKeyFromFileDescriptor();
  if (apiKeyFromFd) return { key: apiKeyFromFd, source: "ANTHROPIC_API_KEY" };
  if (getConfiguredApiKeyHelper()) {
    if (opts.skipRetrievingKeyFromApiKeyHelper) return { key: null, source: "apiKeyHelper" };
    return { key: getApiKeyFromApiKeyHelperCached(), source: "apiKeyHelper" };
  }
  let apiKeyHelperCommand = getApiKeyFromConfigOrMacOSKeychain();
  if (apiKeyHelperCommand) return apiKeyHelperCommand;
  return { key: null, source: "none" };
}
/**
 * 环境变量 ANTHROPIC_API_KEY 未被用户审批过（status=new）时返回其末 20 位，用于启动时询问是否使用这个 key。
 */
//@ chunk-aepeg2w5.js:520173-520284 facade-majority
function getUnapprovedCustomApiKey() {
  let ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY || isAntBuild() || !isFirstPartyProvider()) return;
  let n = nge(ANTHROPIC_API_KEY);
  return getCustomApiKeyStatus(n) === "new" ? n : void 0;
}
//@ chunk-aepeg2w5.js:520284-520400 layout
function isEnvApiKeyApproved() {
  try {
    let ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) return !1;
    return getCustomApiKeyStatus(nge(ANTHROPIC_API_KEY)) === "approved";
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-aepeg2w5.js:520400-520517 facade-majority
function onEnvApiKeyApprovalFlipped(e) {
  let n = isEnvApiKeyApproved(),
    r = [
      W3t(() => {
        n = isEnvApiKeyApproved();
      }),
      subscribeGlobalConfigInstalled(() => {
        let s = isEnvApiKeyApproved();
        if (s !== n) ((n = s), e());
      }),
    ];
  return () => r.forEach((s) => s());
}
/**
 * 取 apiKeyHelper 命令：--bare 只认 flagSettings；宿主托管提供方时忽略；否则取合并设置（R6e 过滤不可信来源）。
 */
//@ chunk-aepeg2w5.js:520517-520651 facade-majority = getConfiguredApiKeyHelper (0.742)
function getConfiguredApiKeyHelper() {
  if (isBareMode()) return getSettingsForSource("flagSettings")?.apiKeyHelper;
  if (isHostManagedProviderAuth()) return;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("apiKeyHelper", mergedSettings.apiKeyHelper);
}
/**
 * apiKeyHelper 是否来自项目/本地设置（需要工作区信任）。
 */
//@ chunk-aepeg2w5.js:520651-520810 layout = isApiKeyHelperFromProjectOrLocalSettings (0.814)
function isApiKeyHelperFromProjectOrLocalSettings() {
  let apiKeyHelper = getConfiguredApiKeyHelper();
  if (!apiKeyHelper) return !1;
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings"),
    localSettings = getSettingsForSourceTightenOnly("localSettings");
  return (
    projectSettings?.apiKeyHelper === apiKeyHelper ||
    localSettings?.apiKeyHelper === apiKeyHelper ||
    C6e("apiKeyHelper")
  );
}
/**
 * 设置中的 awsAuthRefresh 命令（经可信来源过滤）。
 */
//@ chunk-aepeg2w5.js:520810-520901 facade-majority = getConfiguredAwsAuthRefresh (0.52)
function getConfiguredAwsAuthRefresh() {
  if (isHostManagedProviderAuth()) return;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("awsAuthRefresh", mergedSettings.awsAuthRefresh);
}
//@ chunk-aepeg2w5.js:520901-521068 facade-majority = isAwsAuthRefreshFromProjectSettings (0.783)
function isAwsAuthRefreshFromProjectSettings() {
  let awsAuthRefresh = getConfiguredAwsAuthRefresh();
  if (!awsAuthRefresh) return !1;
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings"),
    localSettings = getSettingsForSourceTightenOnly("localSettings");
  return (
    projectSettings?.awsAuthRefresh === awsAuthRefresh ||
    localSettings?.awsAuthRefresh === awsAuthRefresh ||
    C6e("awsAuthRefresh")
  );
}
/**
 * 设置中的 awsCredentialExport 命令。
 */
//@ chunk-aepeg2w5.js:521068-521168 fingerprint = getConfiguredAwsCredentialExport (0.519)
function getConfiguredAwsCredentialExport() {
  if (isHostManagedProviderAuth()) return;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("awsCredentialExport", mergedSettings.awsCredentialExport);
}
//@ chunk-aepeg2w5.js:521168-521349 facade-majority = isAwsCredentialExportFromProjectSettings (0.781)
function isAwsCredentialExportFromProjectSettings() {
  let awsCredentialExport = getConfiguredAwsCredentialExport();
  if (!awsCredentialExport) return !1;
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings"),
    localSettings = getSettingsForSourceTightenOnly("localSettings");
  return (
    projectSettings?.awsCredentialExport === awsCredentialExport ||
    localSettings?.awsCredentialExport === awsCredentialExport ||
    C6e("awsCredentialExport")
  );
}
/**
 * apiKeyHelper 结果缓存 TTL：CLAUDE_CODE_API_KEY_HELPER_TTL_MS（>=0）否则默认 5 分钟。
 */
//@ chunk-aepeg2w5.js:521349-521558 facade-majority = calculateApiKeyHelperTTL (0.908)
function calculateApiKeyHelperTTL() {
  let envTtl = env.CLAUDE_CODE_API_KEY_HELPER_TTL_MS;
  if (envTtl !== void 0) {
    if (envTtl >= 0) return envTtl;
    logForDebugging(
      `Found CLAUDE_CODE_API_KEY_HELPER_TTL_MS env var, but it was not a valid number. Got ${envTtl}`,
      { level: "error" },
    );
  }
  return e1;
}
/**
 * 按宿主的 apiKeyHelper 状态：{cache:{value,timestamp}, inflight, epoch, lastFailure}。
 */
//@ chunk-aepeg2w5.js:521558-521631 facade-majority
var apiKeyHelperStates = new HostScoped(() => ({ cache: null, inflight: null, epoch: 0, lastFailure: null }));
//@ chunk-aepeg2w5.js:521631-521713 facade-majority = createBudgetTracker (0.62)
function getApiKeyHelperElapsedMs() {
  let e = apiKeyHelperStates.of(getRootSession().host).inflight?.startedAt;
  return e ? Date.now() - e : 0;
}
//@ chunk-aepeg2w5.js:521713-521830 layout
function isTokenStillValid(e) {
  let n = decodeJwtExpiry(e.value);
  if (n === null) return !0;
  let r = n * 1000 - eT;
  if (e.timestamp >= r) return !0;
  return Date.now() < r;
}
//@ chunk-aepeg2w5.js:521830-521895 layout
function f1(e) {
  let n = decodeJwtExpiry(e);
  return n === null || Date.now() < n * 1000 - eT;
}
//@ chunk-aepeg2w5.js:521895-521977 facade-majority = getApiKeyFromApiKeyHelper (0.655)
function getColdApiKeyHelperRun() {
  let inflight = apiKeyHelperStates.of(getRootSession().host).inflight;
  return inflight?.startedAt ? inflight.promise : null;
}
//@ chunk-aepeg2w5.js:521977-522578 facade-majority
async function getApiKeyFromApiKeyHelper(e) {
  if (!getConfiguredApiKeyHelper()) return null;
  let n = calculateApiKeyHelperTTL(),
    of = apiKeyHelperStates.of(getRootSession().host),
    s = () => (
      (of.inflight = { promise: _runAndCache(of, e, !0, of.epoch), startedAt: Date.now() }),
      of.inflight.promise
    );
  if (of.cache) {
    if (
      !isTokenStillValid(of.cache) &&
      isFirstPartyProvider() &&
      isApiKeyHelperTheActiveCredential() &&
      !effectiveAuthTokenEnv()
    ) {
      if (of.inflight) {
        if (!of.inflight.startedAt) of.inflight.startedAt = Date.now();
        let promise = await of.inflight.promise;
        if (promise === null || f1(promise)) return promise;
        if (of.inflight) return of.inflight.promise;
        return s();
      }
      return s();
    }
    if (Date.now() - of.cache.timestamp < n) return of.cache.value;
    if (!of.inflight) of.inflight = { promise: _runAndCache(of, e, !1, of.epoch), startedAt: null };
    return of.cache.value;
  }
  if (of.inflight) return of.inflight.promise;
  return s();
}
/**
 * 执行 apiKeyHelper 并写缓存；失败时打印红字错误，若有旧缓存则沿用并刷新时间戳，否则缓存一个空格占位并记录 lastFailure（epoch 变化后的结果丢弃）。
 */
//@ chunk-aepeg2w5.js:522578-523255 fingerprint = _runAndCache (0.627)
async function _runAndCache(e, n, r, s) {
  try {
    let value = await _executeApiKeyHelper(n);
    if (s !== e.epoch) return value;
    if (value !== null) ((e.cache = { value: value, timestamp: Date.now() }), (e.lastFailure = null));
    return value;
  } catch (error) {
    if (s !== e.epoch) return " ";
    let detail = error instanceof Error ? error.message : String(error);
    if (
      (console.error(sequential.red(`apiKeyHelper failed: ${detail}`)),
      logForDebugging(`Error getting API key from apiKeyHelper: ${detail}`, { level: "error" }),
      !r && e.cache && e.cache.value !== " ")
    )
      return ((e.cache = { ...e.cache, timestamp: Date.now() }), e.cache.value);
    if (((e.lastFailure = detail), isApiKeyHelperTheActiveCredential())) {
      let instance = AwsAuthStatusManager.getInstance();
      (instance.startAuthentication(),
        instance.setError(`apiKeyHelper failed: ${detail}`),
        instance.endAuthentication(!1));
    }
    return ((e.cache = { value: " ", timestamp: Date.now() }), " ");
  } finally {
    if (s === e.epoch) e.inflight = null;
  }
}
/**
 * 运行 apiKeyHelper：来自项目/本地设置且工作区未信任时拒绝（tengu_apiKeyHelper_missing_trust11）；在项目根执行，超时 10 分钟，输出 trim 后作为 key。
 */
//@ chunk-aepeg2w5.js:523255-524614 fingerprint = _executeApiKeyHelper (0.54)
async function _executeApiKeyHelper(isNonInteractiveSession) {
  let apiKeyHelper = getConfiguredApiKeyHelper();
  if (!apiKeyHelper) return null;
  if (isApiKeyHelperFromProjectOrLocalSettings()) {
    if (!checkHasTrustDialogAccepted() && !isNonInteractiveSession) {
      let w = Error(
        `Security: apiKeyHelper executed before workspace trust is confirmed. If you see this message, post in ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.FEEDBACK_CHANNEL}.`,
      );
      return (
        logAntError("apiKeyHelper invoked before trust check", w),
        logEvent("tengu_apiKeyHelper_missing_trust11", {}),
        null
      );
    }
  }
  let hasTrust = getProjectConfigRoot(),
    s = await runManagedHelperWithoutProjectEnv(
      "apiKeyHelper",
      apiKeyHelper,
      () =>
        safeExecShell(apiKeyHelper, {
          ...(hasTrust !== null && { cwd: hasTrust }),
          timeout: 600000,
          reject: !1,
          useToolMemoryCgroup: !1,
        }),
      isProjectScopeTrustAccepted,
    );
  if (s.failed) {
    let why = s.timedOut ? "timed out" : `exited ${s.exitCode}`,
      w = s.stderr && truncateToLength(s.stderr.trim(), 500);
    throw Error(w ? `${why}: ${w}` : why);
  }
  let stderr = s.stdout?.trim();
  if (!stderr) throw Error("did not return a value");
  let y = findUnsafeChar(stderr, { maxLength: t1 });
  if (y) {
    let S = describeUnsafeValue(y, textLengthAndLines(stderr));
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `returned output that cannot be used as an API key: ${S}. The script must print only the key to stdout.`,
      "apiKeyHelper output rejected: not a printable-ASCII token",
    );
  }
  return stderr;
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
/**
 * 让 apiKeyHelper 缓存失效（epoch+1）。
 */
//@ chunk-aepeg2w5.js:524744-524821 facade-majority
function clearApiKeyHelperCache() {
  let of = apiKeyHelperStates.of(getRootSession().host);
  (of.epoch++, (of.cache = null), (of.inflight = null));
}
//@ chunk-aepeg2w5.js:524821-524857 facade-majority
function isApiKeyHelperSafeToInvoke() {
  return !(isApiKeyHelperFromProjectOrLocalSettings() && !checkHasTrustDialogAccepted());
}
//@ chunk-aepeg2w5.js:524857-524897 facade-majority
function prefetchApiKeyFromApiKeyHelperIfSafe(e) {
  if (!isApiKeyHelperSafeToInvoke()) return;
  getApiKeyFromApiKeyHelper(e);
}
//@ chunk-aepeg2w5.js:524897-524940 layout
var DEFAULT_AWS_CREDS_TTL_MS = 3600000,
  GA = 300000,
  g1 = 60000,
  _1 = 30000;
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
/**
 * 按需运行 awsAuthRefresh：先用 STS GetCallerIdentity 检查现有凭证是否有效，无效才执行刷新命令（IDE 配置探测时跳过）。
 */
//@ chunk-aepeg2w5.js:525087-527401 fingerprint = runAwsAuthRefresh (0.349)
async function runAwsAuthRefresh() {
  let host = getRootSession().host,
    of = awsAuthRefreshStates.of(host),
    awsAuthRefresh = getConfiguredAwsAuthRefresh(),
    epoch = of.epoch,
    signal = of.waiters.signal;
  if (!awsAuthRefresh) return !1;
  if (env.CLAUDE_CODE_CONFIG_PROBE)
    return (logForDebugging("Skipping awsAuthRefresh in the IDE config probe"), !1);
  if (isAwsAuthRefreshFromProjectSettings()) {
    if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) {
      let w = Error(
        `Security: awsAuthRefresh executed before workspace trust is confirmed. If you see this message, post in ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.FEEDBACK_CHANNEL}.`,
      );
      return (
        logAntError("awsAuthRefresh invoked before trust check", w),
        logEvent("tengu_awsAuthRefresh_missing_trust", {}),
        !1
      );
    }
  }
  if (of.inFlight) return of.inFlight;
  let now = Date.now();
  try {
    return (
      logForDebugging("Fetching AWS caller identity for AWS auth refresh command"),
      await checkStsCallerIdentity(),
      logForDebugging("Fetched AWS caller identity, skipping AWS auth refresh command"),
      of.waiters.clearTakeover(),
      !1
    );
  } catch {
    if (of.inFlight) return of.inFlight;
    if (of.lastRefreshAt !== null && Date.now() - of.lastRefreshAt < _1) return !1;
    let S = () => awsCredentialMemos.of(host).helper.cache.clear();
    if (signal.aborted && !of.waiters.hasCallers()) return (S(), !1);
    let signal_2 = of.waiters.signal,
      R = !1,
      x,
      P = () => {
        if (x === void 0 || x.endedByLock.aborted) {
          if (((R = !1), S(), of.inFlight === F)) of.inFlight = null;
        }
      },
      F = (async () => {
        try {
          let G = await runCloudAuthRefresh({
              setting: "awsAuthRefresh",
              command: awsAuthRefresh,
              readEnvAsCommandStarts: (ee) =>
                flt("awsAuthRefresh", awsAuthRefresh, ee, isProjectScopeTrustAccepted),
              probedAt: now,
              singleFlight: of.singleFlight,
              signal: signal_2,
              takeover: of.waiters.takeTakeover(),
              reprobe: async () =>
                (await getAwsProfileRegionHints())
                  ? "unknown"
                  : checkStsCallerIdentity().then(
                      () => "valid",
                      () => "unknown",
                    ),
              refresh: (ee, q) => {
                ((R = !0), of.waiters.clearTakeover());
                let Q = refreshAwsAuth_2(awsAuthRefresh, ee, q);
                return ((x = { outcome: Q, endedByLock: ee }), Q);
              },
            }),
            j = await settleRefreshOutcome({ refreshed: G, stop: signal_2, command: x, forget: S });
          if (!j && signal_2.aborted && x?.endedByLock.aborted) R = !1;
          if (((R ||= j), j)) of.waiters.clearTakeover();
          else if (isRefreshStillWanted({ stop: signal_2, command: x, waiters: of.waiters }) && So())
            of.signInFailures++;
          return j;
        } finally {
          if (R && epoch === of.epoch) of.lastRefreshAt = Date.now();
        }
      })();
    ((of.inFlight = F), signal_2.addEventListener("abort", P, { once: !0 }));
    let L = () => {
      if ((signal_2.removeEventListener("abort", P), of.inFlight === F)) of.inFlight = null;
    };
    return (F.then(L, L), F);
  }
}
//@ chunk-aepeg2w5.js:527401-527562 facade-majority
function noteAuthRefreshStop() {
  try {
    let host = getRootSession().host;
    (gcpAuthRefreshStates.of(host).waiters.noteStop(), awsAuthRefreshStates.of(host).waiters.noteStop());
  } catch (error) {
    logForDebugging(`auth refresh: Stop not noted: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-aepeg2w5.js:527562-527740 layout
async function settleRefreshOutcome({ refreshed: refreshed, stop: stop, command: command, forget: forget }) {
  if (refreshed || !stop.aborted) return refreshed;
  if (command !== void 0) {
    let outcome = await command.outcome;
    if (!command.endedByLock.aborted) return outcome === "ok";
  }
  return (forget(), !1);
}
//@ chunk-aepeg2w5.js:527740-527863 layout
function isRefreshStillWanted({ stop: stop, command: command, waiters: waiters }) {
  if (!stop.aborted) return !0;
  return command !== void 0 && !command.endedByLock.aborted && waiters.hasCallers();
}
//@ chunk-aepeg2w5.js:527863-527927 layout
function isTerminationSignal(e) {
  return e === "SIGINT" || e === "SIGHUP" || e === "SIGTERM";
}
//@ chunk-aepeg2w5.js:527927-527941 layout
var AWS_AUTH_REFRESH_TIMEOUT_MS = 180000;
//@ chunk-aepeg2w5.js:527941-527996 facade-majority
function refreshAwsAuth(...e) {
  return refreshAwsAuth_2(...e).then((n) => n === "ok");
}
/**
 * 运行 awsAuthRefresh 命令（字符串走 shell，或 {file,args,env} 走 execFile），超时 3 分钟，输出转发到 AwsAuthStatusManager 供 UI 显示，返回 ok/failed。
 */
//@ chunk-aepeg2w5.js:527996-529663 fingerprint = refreshAwsAuth (0.581)
function refreshAwsAuth_2(e, n, r) {
  if (Tv()) return (logForDebugging(`AWS auth refresh: ${ije}`), Promise.resolve("failed"));
  logForDebugging("Running AWS auth refresh command");
  let authStatusManager = AwsAuthStatusManager.getInstance();
  return (
    authStatusManager.startAuthentication(),
    new Promise((resolve) => {
      let y;
      if (typeof e === "string") {
        let w = getProjectConfigRoot();
        y = runManagedHelperWithoutProjectEnv(
          "awsAuthRefresh",
          e,
          () => exec(e, { ...(w !== null && { cwd: w }), windowsHide: !0 }),
          isProjectScopeTrustAccepted,
        );
      } else {
        let refreshProc = resolveExecutableSafely(e.file, !0);
        if (refreshProc === null) {
          (logForDebugging("AWS auth refresh: executable not found in a safe directory"),
            authStatusManager.endAuthentication(!1),
            resolve("failed"));
          return;
        }
        y = execFile(/\.(cmd|bat)$/i.test(refreshProc) ? '"' + refreshProc + '"' : refreshProc, e.args, {
          windowsHide: !0,
          shell: /\.(cmd|bat)$/i.test(refreshProc),
          env: e.env,
        });
      }
      if ((moveKeeperPid(y.pid), y.pid !== void 0)) r?.(y.pid);
      let S = new TimedOperation(y, { timeoutMs: AWS_AUTH_REFRESH_TIMEOUT_MS, signal: n });
      (y.stdout.on("data", (data) => {
        let output = data.toString().trim();
        if (output) (authStatusManager.addOutput(output), logForDebugging(output, { level: "debug" }));
      }),
        y.stderr.on("data", (data) => {
          let error = data.toString().trim();
          if (error) (authStatusManager.setError(error), logForDebugging(error, { level: "error" }));
        }),
        y.on("close", (code, signal) => {
          if ((S.settle(), code === 0))
            (logForDebugging("AWS auth refresh completed successfully"),
              authStatusManager.endAuthentication(!0),
              resolve("ok"));
          else if (S.killReason === "abort") (authStatusManager.dismiss(), resolve("interrupted"));
          else {
            let x = S.killReason === "shutdown" || (isTerminationSignal(signal) && S.killReason === void 0),
              timedOut = S.killReason === "timeout",
              message = x
                ? null
                : timedOut
                  ? sequential.red(
                      typeof e === "string"
                        ? "AWS auth refresh timed out after 3 minutes. Run your auth command manually in a separate terminal."
                        : 'AWS login timed out after 3 minutes. Run "' +
                            [e.file, ...e.args].join(" ") +
                            '" in another terminal and try again.',
                    )
                  : typeof e === "string"
                    ? sequential.red("Error running awsAuthRefresh (in settings or ~/.claude.json):")
                    : sequential.red(
                        "AWS login did not complete (" +
                          [e.file, ...e.args].join(" ") +
                          " exited with an error). Run it in another terminal and try again.",
                      );
            if (message) console.error(message);
            (authStatusManager.endAuthentication(!1), resolve(x ? "interrupted" : "failed"));
          }
        }));
    })
  );
}
/**
 * 运行 awsCredentialExport 命令（项目设置来源需信任），解析 STS 形状的 JSON 输出得到 AWS 凭证（AccessKeyId/SecretAccessKey/SessionToken）。
 */
//@ chunk-aepeg2w5.js:529663-531308 fingerprint = getAwsCredsFromCredentialExport (0.703)
async function getAwsCredsFromCredentialExport() {
  let awsCredentialExport = getConfiguredAwsCredentialExport();
  if (!awsCredentialExport) return null;
  if (isAwsCredentialExportFromProjectSettings()) {
    if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) {
      let r = Error(
        `Security: awsCredentialExport executed before workspace trust is confirmed. If you see this message, post in ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.FEEDBACK_CHANNEL}.`,
      );
      return (
        logAntError("awsCredentialExport invoked before trust check", r),
        logEvent("tengu_awsCredentialExport_missing_trust", {}),
        null
      );
    }
  }
  try {
    logForDebugging("Running AWS credential export command");
    let hasTrust = getProjectConfigRoot(),
      r = await runManagedHelperWithoutProjectEnv(
        "awsCredentialExport",
        awsCredentialExport,
        () =>
          safeExecShell(awsCredentialExport, {
            ...(hasTrust !== null && { cwd: hasTrust }),
            reject: !1,
            useToolMemoryCgroup: !1,
          }),
        isProjectScopeTrustAccepted,
      );
    if (r.exitCode !== 0 || !r.stdout) throw Error("awsCredentialExport did not return a valid value");
    let s = jsonParse(r.stdout.trim()),
      awsOutput = extractStsCredentials(s);
    if (!awsOutput) throw Error("awsCredentialExport did not return valid AWS STS output structure");
    logForDebugging("AWS credentials retrieved from awsCredentialExport");
    let Expiration = awsOutput.Expiration,
      S = typeof Expiration === "string" ? Date.parse(Expiration) : NaN;
    return {
      accessKeyId: awsOutput.AccessKeyId,
      secretAccessKey: awsOutput.SecretAccessKey,
      sessionToken: awsOutput.SessionToken,
      expiration: Number.isFinite(S) ? S : void 0,
    };
  } catch (error) {
    let message = sequential.red(
      "Error getting AWS credentials from awsCredentialExport (in settings or ~/.claude.json):",
    );
    if (error instanceof Error) console.error(message, error.message);
    else console.error(message, error);
    return null;
  }
}
/**
 * 解析 AWS 凭证：先 awsAuthRefresh、再 awsCredentialExport；刷新成功后清 AWS ini 与默认链缓存。
 */
//@ chunk-aepeg2w5.js:531308-531567 layout
async function resolveAwsCredentialsViaHelpers(e) {
  let startTime = performance.now();
  logForDebugging("[API:auth] AWS credential resolve start");
  let r = await runAwsAuthRefresh(),
    s = await getAwsCredsFromCredentialExport();
  if (r) (await clearAwsIniCache(), e.defaultChain.cache.clear());
  return (
    logForDebugging(
      `[API:auth] AWS credential resolve done in ${Math.round(performance.now() - startTime)}ms`,
    ),
    s
  );
}
//@ chunk-aepeg2w5.js:531567-531697 facade-majority
function refreshAndGetAwsCredentials(e, { userTurn: n = !1 } = {}) {
  let host = getRootSession().host;
  return awsAuthRefreshStates
    .of(host)
    .waiters.wait(() => awsCredentialMemos.of(host).helper(), { signal: e, userTurn: n }, null);
}
//@ chunk-aepeg2w5.js:531697-531795 layout
function computeAwsCredsCacheTtl(e) {
  let n = e === void 0 ? void 0 : e - Date.now();
  if (n === void 0 || n <= GA + g1) return DEFAULT_AWS_CREDS_TTL_MS;
  return n - GA;
}
//@ chunk-aepeg2w5.js:531795-531818 facade-majority
var AWS_CHAIN_REQUEST_TIMEOUT_MS = 30000,
  AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS = 30000;
/**
 * 给 AWS 默认凭证链解析加超时（CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS，默认 60 秒）。
 */
//@ chunk-aepeg2w5.js:531818-532127 facade-majority
async function resolveWithStallGuard(e, n = env.CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS ?? 60000) {
  let r;
  try {
    return await Promise.race([
      e,
      new Promise((s, h) => {
        r = setTimeout(
          (y) =>
            y(
              Object.assign(Error("AWS default-chain credential resolve timed out"), {
                name: "CredentialsProviderError",
              }),
            ),
          n,
          h,
        );
      }),
    ]);
  } finally {
    (clearTimeout(r), e.catch(() => {}));
  }
}
/**
 * 创建按区域缓存的 AWS 默认凭证链（@aws-sdk fromNodeProviderChain + STS 代理配置），CLAUDE_CODE_AWS_CHAIN_RESOLVE_TIMEOUT_MS 超时。
 */
//@ chunk-aepeg2w5.js:532127-532748 layout
async function createAwsDefaultChainResolver(e) {
  let n = memoizeWithTTL(
    async () => {
      logForDebugging(`[API:auth] resolving default AWS provider chain (region: ${e})`);
      let [{ fromNodeProviderChain: r }, s] = await Promise.all([
          import("./chunk-thwbpw6e.js"),
          getAWSProxyRequestHandler({
            url: resolveStsEndpointForProxyUrl(e),
            requestTimeoutMs: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS,
          }),
        ]),
        h = r({
          ignoreCache: !0,
          parentClientConfig: {
            region: e,
            requestHandler:
              s ?? new sl.FetchHttpHandler({ requestTimeout: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS }),
          },
          clientConfig: {
            requestHandler:
              s ?? new sl.FetchHttpHandler({ requestTimeout: AWS_CHAIN_RESOLVE_REQUEST_TIMEOUT_MS }),
          },
        });
      return resolveWithStallGuard(h());
    },
    (r) => computeAwsCredsCacheTtl(r.expiration?.getTime()),
    (r, s) => {
      if (r.expiration === void 0) return !0;
      let time = r.expiration.getTime();
      if (time > Date.now() + AWS_CHAIN_REQUEST_TIMEOUT_MS) return !0;
      return s >= time - AWS_CHAIN_REQUEST_TIMEOUT_MS && time > Date.now();
    },
  );
  return () => n();
}
//@ chunk-aepeg2w5.js:532748-532804 facade-majority
function getDefaultAwsProviderChain(e) {
  return awsCredentialMemos.of(getRootSession().host).defaultChain(e);
}
/**
 * 返回 Bedrock 用的 AWS 凭证提供器：CLAUDE_CODE_SKIP_AWS_CRED_CACHE 时每次重建默认链，否则按区域缓存。
 */
//@ chunk-aepeg2w5.js:532804-532895 facade-majority
function defaultAwsProviderChainResolver(e, n = getCACertificates) {
  if (env.CLAUDE_CODE_SKIP_AWS_CRED_CACHE) return () => createUncachedAwsDefaultChain(n);
  return () => getDefaultAwsProviderChain(e);
}
//@ chunk-aepeg2w5.js:532895-533033 layout
async function createUncachedAwsDefaultChain(e) {
  let { fromNodeProviderChain: fromNodeProviderChain } = await import("./chunk-thwbpw6e.js");
  return fromNodeProviderChain({ clientConfig: { requestHandler: new CaFetchHttpHandler(e) } });
}
//@ chunk-aepeg2w5.js:533033-533085 layout
function awsChainCacheKey(e) {
  return `${env.AWS_PROFILE ?? ""}\x00${e}`;
}
//@ chunk-aepeg2w5.js:533085-533096 layout
var k1 = 1e4;
//@ chunk-aepeg2w5.js:533096-533322 facade-majority
function invalidateDefaultAwsProviderChainDebounced(e) {
  let n = awsChainCacheKey(e),
    now = Date.now(),
    of = awsCredentialMemos.of(getRootSession().host);
  if (now - (of.chainEvictionAt.get(n) ?? 0) < k1) return !1;
  return (
    of.chainEvictionAt.set(n, now),
    of.defaultChain.cache.delete(n),
    of.ssoRole.cache.clear(),
    of.ssoProfile.cache.clear(),
    !0
  );
}
/**
 * 清空 AWS 凭证相关缓存（helper、默认链、SSO role/profile）。
 */
//@ chunk-aepeg2w5.js:533322-533489 facade-majority
function clearAwsCredentialsCache() {
  let of = awsCredentialMemos.of(getRootSession().host);
  (of.helper.cache.clear(),
    of.defaultChain.cache.clear(),
    of.ssoRole.cache.clear(),
    of.ssoProfile.cache.clear(),
    of.chainEvictionAt.clear());
}
//@ chunk-aepeg2w5.js:533489-533542 facade-majority
function clearAwsHelperCredentialsCache() {
  awsCredentialMemos.of(getRootSession().host).helper.cache.clear();
}
//@ chunk-aepeg2w5.js:533542-533611 facade-majority
function resetAwsAuthRefreshCooldown() {
  let of = awsAuthRefreshStates.of(getRootSession().host);
  ((of.lastRefreshAt = null), of.epoch++);
}
/**
 * 设置中的 gcpAuthRefresh 命令。
 */
//@ chunk-aepeg2w5.js:533611-533702 facade-majority = getConfiguredGcpAuthRefresh (0.524)
function getConfiguredGcpAuthRefresh() {
  if (isHostManagedProviderAuth()) return;
  let mergedSettings = getSettings_DEPRECATED() || {};
  return warnPinnedHelper("gcpAuthRefresh", mergedSettings.gcpAuthRefresh);
}
//@ chunk-aepeg2w5.js:533702-533869 facade-majority = isGcpAuthRefreshFromProjectSettings (0.784)
function isGcpAuthRefreshFromProjectSettings() {
  let gcpAuthRefresh = getConfiguredGcpAuthRefresh();
  if (!gcpAuthRefresh) return !1;
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings"),
    localSettings = getSettingsForSourceTightenOnly("localSettings");
  return (
    projectSettings?.gcpAuthRefresh === gcpAuthRefresh ||
    localSettings?.gcpAuthRefresh === gcpAuthRefresh ||
    C6e("gcpAuthRefresh")
  );
}
//@ chunk-aepeg2w5.js:533869-533881 layout
var w1 = 5000;
/**
 * GCP 项目 ID：GCLOUD_PROJECT、GOOGLE_CLOUD_PROJECT（含小写变体）或 ANTHROPIC_VERTEX_PROJECT_ID。
 */
//@ chunk-aepeg2w5.js:533881-534017 facade-majority
function getConfiguredVertexProjectId() {
  return (
    env.GCLOUD_PROJECT ||
    env.GOOGLE_CLOUD_PROJECT ||
    env.gcloud_project ||
    env.google_cloud_project ||
    env.ANTHROPIC_VERTEX_PROJECT_ID
  );
}
/**
 * 用 google-auth-library 取一次 access token 检查 GCP 凭证（scope cloud-platform，项目取 GCLOUD_PROJECT/ANTHROPIC_VERTEX_PROJECT_ID 等），5 秒超时，返回 valid/invalid/timeout。
 */
//@ chunk-aepeg2w5.js:534017-534670 facade-majority = checkGcpCredentialsValid (0.489)
async function checkGcpCredentialsValid() {
  let now = Date.now();
  try {
    let { GoogleAuth: GoogleAuth } = await import("./chunk-ndb2dret.js").then((m) => Re(m.default, 1)),
      r = getConfiguredVertexProjectId() || env.ANTHROPIC_GOOGLE_CLOUD_PROJECT,
      auth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        ...(r && { projectId: r }),
        clientOptions: vertexAuthClientOptions(),
      }),
      probe = (async () => {
        await (await auth.getClient()).getAccessToken();
      })(),
      timeout = sleep(w1).then(() => {
        throw new vm("GCP credentials check timed out");
      });
    return (await Promise.race([probe, timeout]), "valid");
  } catch (error) {
    let r = Date.now() - now;
    if (error instanceof vm)
      return (
        logForDebugging(`GCP credentials check did not finish within ${r}ms`, { level: "warn" }),
        "timeout"
      );
    return (logForDebugging(`GCP credentials check failed after ${r}ms: ${errorMessage(error)}`), "invalid");
  }
}
//@ chunk-aepeg2w5.js:534670-534781 layout
class GcpAuthRefreshState {
  rejectedByApi = !1;
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
  (gcpRefreshMemos.of(host).cache.clear(), (gcpAuthRefreshStates.of(host).rejectedByApi = !0));
}
//@ chunk-aepeg2w5.js:534888-534903 layout
var GCP_AUTH_REFRESH_TTL_MS = 3600000;
/**
 * 按需运行 gcpAuthRefresh（如 gcloud auth application-default login）：先检查 GCP 凭证，无效才执行，结果按 1 小时缓存。
 */
//@ chunk-aepeg2w5.js:534903-537379 fingerprint = runGcpAuthRefresh (0.324)
async function runGcpAuthRefresh() {
  let host = getRootSession().host,
    of = gcpAuthRefreshStates.of(host),
    signal = of.waiters.signal,
    gcpAuthRefresh = getConfiguredGcpAuthRefresh();
  if (!gcpAuthRefresh) return !1;
  if (env.CLAUDE_CODE_CONFIG_PROBE)
    return (logForDebugging("Skipping gcpAuthRefresh in the IDE config probe"), !1);
  if (isGcpAuthRefreshFromProjectSettings()) {
    if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) {
      let j = Error(
        `Security: gcpAuthRefresh executed before workspace trust is confirmed. If you see this message, post in ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.FEEDBACK_CHANNEL}.`,
      );
      return (
        logAntError("gcpAuthRefresh invoked before trust check", j),
        logEvent("tengu_gcpAuthRefresh_missing_trust", {}),
        !1
      );
    }
  }
  let { lockfilePath: lockfilePath } = getOperationLockPaths("gcpAuthRefresh", gcpAuthRefresh, (G) =>
    flt("gcpAuthRefresh", gcpAuthRefresh, G, isProjectScopeTrustAccepted),
  );
  if (of.inFlight?.lockfilePath === lockfilePath) return ((of.rejectedByApi = !1), of.inFlight.run);
  let rejectedByApi = of.rejectedByApi;
  ((of.rejectedByApi = !1), logForDebugging("Checking GCP credentials validity for auth refresh"));
  let now = Date.now();
  switch (await checkGcpCredentialsValid()) {
    case "valid":
      return (
        logForDebugging("GCP credentials are valid, skipping auth refresh command"),
        of.waiters.clearTakeover(),
        !1
      );
    case "timeout":
      if (!rejectedByApi)
        return (
          logForDebugging(
            "GCP credentials check timed out, skipping auth refresh command until the API rejects the credentials",
          ),
          !1
        );
      break;
    case "invalid":
      break;
  }
  if (of.inFlight?.lockfilePath === lockfilePath) return of.inFlight.run;
  let R = () => {
    (gcpRefreshMemos.of(host).cache.clear(), (of.rejectedByApi ||= rejectedByApi));
  };
  if (signal.aborted && !of.waiters.hasCallers()) return (R(), !1);
  let signal_2 = of.waiters.signal,
    P,
    F = () => {
      if (P === void 0 || P.endedByLock.aborted) {
        if ((R(), of.inFlight?.run === L)) of.inFlight = null;
      }
    },
    L = runCloudAuthRefresh({
      setting: "gcpAuthRefresh",
      command: gcpAuthRefresh,
      readEnvAsCommandStarts: (G) => flt("gcpAuthRefresh", gcpAuthRefresh, G, isProjectScopeTrustAccepted),
      probedAt: now,
      singleFlight: of.singleFlight,
      signal: signal_2,
      takeover: of.waiters.takeTakeover(),
      reprobe: async () => {
        let isValid = await checkGcpCredentialsValid();
        return isValid === "timeout" ? "unknown" : isValid;
      },
      refresh: (G, j) => {
        of.waiters.clearTakeover();
        let ee = refreshGcpAuth(gcpAuthRefresh, G, j);
        return ((P = { outcome: ee, endedByLock: G }), ee);
      },
    })
      .then(async (G) => {
        let j = await settleRefreshOutcome({ refreshed: G, stop: signal_2, command: P, forget: R });
        if (j) of.waiters.clearTakeover();
        else if (isRefreshStillWanted({ stop: signal_2, command: P, waiters: of.waiters }) && So())
          of.signInFailures++;
        return j;
      })
      .finally(() => {
        if ((signal_2.removeEventListener("abort", F), of.inFlight?.run === L)) of.inFlight = null;
      });
  return (
    (of.inFlight = { lockfilePath: lockfilePath, run: L }),
    signal_2.addEventListener("abort", F, { once: !0 }),
    L
  );
}
//@ chunk-aepeg2w5.js:537379-537393 layout
var GCP_AUTH_REFRESH_TIMEOUT_MS = 180000;
//@ chunk-aepeg2w5.js:537393-538481 facade-majority = refreshGcpAuth (0.712)
function refreshGcpAuth(e, n, r) {
  if (Tv()) return (logForDebugging(`GCP auth refresh: ${ije}`), Promise.resolve("failed"));
  logForDebugging("Running GCP auth refresh command");
  let authStatusManager = AwsAuthStatusManager.getInstance();
  return (
    authStatusManager.startAuthentication(),
    new Promise((resolve) => {
      let y = getProjectConfigRoot(),
        S = runManagedHelperWithoutProjectEnv(
          "gcpAuthRefresh",
          e,
          () => exec(e, { ...(y !== null && { cwd: y }), windowsHide: !0 }),
          isProjectScopeTrustAccepted,
        );
      if ((moveKeeperPid(S.pid), S.pid !== void 0)) r?.(S.pid);
      let w = new TimedOperation(S, { timeoutMs: GCP_AUTH_REFRESH_TIMEOUT_MS, signal: n });
      (S.stdout.on("data", (data) => {
        let output = data.toString().trim();
        if (output) (authStatusManager.addOutput(output), logForDebugging(output, { level: "debug" }));
      }),
        S.stderr.on("data", (data) => {
          let error = data.toString().trim();
          if (error) (authStatusManager.setError(error), logForDebugging(error, { level: "error" }));
        }),
        S.on("close", (code, signal) => {
          if ((w.settle(), code === 0))
            (logForDebugging("GCP auth refresh completed successfully"),
              authStatusManager.endAuthentication(!0),
              resolve("ok"));
          else if (w.killReason === "abort") (authStatusManager.dismiss(), resolve("interrupted"));
          else {
            let P = w.killReason === "shutdown" || (isTerminationSignal(signal) && w.killReason === void 0),
              message =
                w.killReason === "timeout"
                  ? sequential.red(
                      "GCP auth refresh timed out after 3 minutes. Run your auth command manually in a separate terminal.",
                    )
                  : sequential.red("Error running gcpAuthRefresh (in settings or ~/.claude.json):");
            if (!P) console.error(message);
            (authStatusManager.endAuthentication(!1), resolve(P ? "interrupted" : "failed"));
          }
        }));
    })
  );
}
//@ chunk-aepeg2w5.js:538481-538528 facade-majority
var gcpRefreshMemos = new HostScoped(() =>
  memoizeWithTTL(async () => await runGcpAuthRefresh(), GCP_AUTH_REFRESH_TTL_MS),
);
//@ chunk-aepeg2w5.js:538528-538650 facade-majority
function refreshGcpCredentialsIfNeeded(e, { userTurn: n = !1 } = {}) {
  let host = getRootSession().host;
  return gcpAuthRefreshStates
    .of(host)
    .waiters.wait(() => gcpRefreshMemos.of(host)(), { signal: e, userTurn: n }, !1);
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
  (gcpRefreshMemos.of(host).cache.clear(), (gcpAuthRefreshStates.of(host).rejectedByApi = !1));
}
/**
 * 启动时在安全情况下预取 Vertex 用的 GCP 凭证。
 */
//@ chunk-aepeg2w5.js:538839-538951 facade-majority = prefetchGcpCredentialsIfSafe (0)
function prefetchGcpCredentialsIfSafe() {
  if (!getConfiguredGcpAuthRefresh() || env.CLAUDE_CODE_CONFIG_PROBE) return;
  if (isGcpAuthRefreshFromProjectSettings()) {
    if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) return;
  }
  gcpRefreshMemos.of(getRootSession().host)();
}
/**
 * 启动时在安全的情况下（无需信任或已信任）预取 Bedrock 用的 AWS 凭证。
 */
//@ chunk-aepeg2w5.js:538951-539101 facade-majority = prefetchAwsCredentialsAndBedRockInfoIfSafe (0)
function prefetchAwsCredentialsAndBedRockInfoIfSafe() {
  let awsAuthRefresh = getConfiguredAwsAuthRefresh(),
    awsCredentialExport = getConfiguredAwsCredentialExport();
  if ((!awsAuthRefresh && !awsCredentialExport) || env.CLAUDE_CODE_CONFIG_PROBE) return;
  if (isAwsAuthRefreshFromProjectSettings() || isAwsCredentialExportFromProjectSettings()) {
    if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) return;
  }
  (awsCredentialMemos.of(getRootSession().host).helper(), getModelStrings());
}
/**
 * 读取 /login 创建并保存在 ~/.claude.json 的 primaryApiKey，来源记为 '/login managed key'；宿主托管或 diskless 时返回 null。316 这里不再读 macOS 钥匙串。
 */
//@ chunk-aepeg2w5.js:539101-539234 fingerprint = getApiKeyFromConfigOrMacOSKeychain (0.726)
function getApiKeyFromConfigOrMacOSKeychain_2() {
  if (vn()) return null;
  let prefetch = getGlobalConfig();
  if (!prefetch.primaryApiKey) return null;
  return { key: prefetch.primaryApiKey, source: "/login managed key" };
}
//@ chunk-aepeg2w5.js:539234-539314 layout
class ApiKeyConfigCache {
  value = void 0;
  promise = null;
  clear() {
    ((this.value = void 0), (this.promise = null));
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
  let e = getApiKeyConfigCache();
  if (e.value !== void 0) return e.value;
  let n = getApiKeyFromConfigOrMacOSKeychain_2();
  return ((e.value = n), n);
}
//@ chunk-aepeg2w5.js:539489-539537 file-local
function isValidApiKey(apiKey) {
  return /^[a-zA-Z0-9-_]+$/.test(apiKey);
}
/**
 * 保存 /login 得到的 API key：校验字符集，写入全局配置 primaryApiKey，并把截断值加入 customApiKeyResponses.approved（macOS 上同时 security add-generic-password 写钥匙串）。
 */
//@ chunk-aepeg2w5.js:539537-540498 facade-majority = saveApiKey (0.812)
async function saveApiKey(e, n) {
  if (!isValidApiKey(e))
    throw Error(
      "Invalid API key format. API key must contain only alphanumeric characters, dashes, and underscores.",
    );
  let r = getApiKeyConfigCache();
  await removeKeychainApiKey();
  let s = !1;
  if (s) {
    let storageServiceName = getMacOsKeychainStorageServiceName(),
      username = getUsername(),
      hexValue = Buffer.from(e, "utf-8").toString("hex"),
      command = `add-generic-password -U -a "${username}" -s "${storageServiceName}" -X "${hexValue}"
`,
      x = await safeExecFile("security", ["-i"], { input: command, reject: !1, timeout: 5000 });
    if (x.exitCode !== 0) {
      let replaced = (x.stderr || x.stdout || "").trim().replace(/\s*\n\s*/g, "; ");
      throw (
        logEvent("tengu_api_key_keychain_error", {
          error_class: fromEnum(classifyKeychainError(replaced)),
          error_hash: gn(scrubErrorText(replaced)),
          exit_code: x.exitCode ?? -1,
        }),
        Error(
          `Failed to save API key to macOS Keychain${replaced ? ` (${replaced})` : ""}. Run \`claude doctor\` to diagnose keychain access.`,
        )
      );
    }
    logEvent("tengu_api_key_saved_to_keychain", {});
  } else logEvent("tengu_api_key_saved_to_config", {});
  let normalizedKey = nge(e);
  (await saveGlobalConfig((current) => {
    let { approved: approved, rejected: rejected } = customApiKeyResponsesOf(current);
    return {
      ...current,
      primaryApiKey: s ? current.primaryApiKey : e,
      customApiKeyResponses: {
        approved: approved.includes(normalizedKey) ? approved : [...approved, normalizedKey],
        rejected: rejected,
      },
    };
  }, n),
    r.clear(),
    clearLegacyApiKeyPrefetch());
}
/**
 * 删除保存的 primaryApiKey（及钥匙串项）。
 */
//@ chunk-aepeg2w5.js:540498-540605 facade-majority = removeApiKey (0.752)
async function removeApiKey(e) {
  let n = getApiKeyConfigCache();
  (await removeKeychainApiKey(),
    await saveGlobalConfig((current) => ({ ...current, primaryApiKey: void 0 }), e),
    n.clear(),
    clearLegacyApiKeyPrefetch());
}
//@ chunk-aepeg2w5.js:540605-540725 layout
async function removeKeychainApiKey() {
  try {
    await Uv();
  } catch (error) {
    logForDebugging(`Failed to remove API key from macOS keychain: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
/**
 * 由新令牌（与旧记录）构造要存储的 OAuth 令牌对象：令牌、过期时间、权限、订阅类型（登录时直接采用，刷新时按来源与可信度合并）、限流档位与 clientId。
 */
//@ chunk-aepeg2w5.js:540725-541052 layout
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
function subscriptionFromSignIn(e) {
  let n = e.subscriptionType ?? null;
  if (n === null) return { subscriptionType: n };
  return e.subscriptionTypeSource === "profile"
    ? {
        subscriptionType: n,
        subscriptionTypeSource: "profile",
        subscriptionTypeVerifiedAt: e.subscriptionTypeVerifiedAt,
      }
    : { subscriptionType: n, subscriptionTypeSource: "sign_in" };
}
/**
 * 保留之前的订阅类型及其来源（profile 来源还保留验证时间），用于更新凭据时沿用。
 */
//@ chunk-aepeg2w5.js:541345-541675 layout
function previousSubscription(e) {
  let n = e?.subscriptionType ?? null;
  if (n === null || e?.subscriptionTypeSource === void 0) return { subscriptionType: n };
  return e.subscriptionTypeSource === "profile"
    ? {
        subscriptionType: n,
        subscriptionTypeSource: "profile",
        subscriptionTypeVerifiedAt: e.subscriptionTypeVerifiedAt,
      }
    : { subscriptionType: n, subscriptionTypeSource: "sign_in" };
}
/**
 * 刷新令牌时合并订阅类型：登录来源只在无旧值或一致时采用；profile 来源在非临时计划的降级、与登录来源相同或缺少验证时间时保留旧值，否则采用新值并记录验证时间。
 */
//@ chunk-aepeg2w5.js:541675-542328 layout
function mergeSubscriptionType(previous, tokens) {
  let prevType = previous?.subscriptionType ?? null,
    kept = previousSubscription(previous),
    newType = tokens.subscriptionType ?? null;
  if (newType === null) return kept;
  if (tokens.subscriptionTypeSource === "sign_in")
    return prevType === null || (prevType === newType && previous?.subscriptionTypeSource !== "profile")
      ? { subscriptionType: newType, subscriptionTypeSource: "sign_in" }
      : kept;
  if (tokens.subscriptionTypeSource === void 0)
    return prevType === null ? { subscriptionType: newType } : kept;
  let y = prevType !== null && previous?.subscriptionTypeSource !== "profile",
    S = isProvisionalProfilePlan(previous);
  if (
    (!S && isProfilePlanDowngrade(prevType, newType)) ||
    (y && newType === prevType) ||
    (tokens.subscriptionTypeVerifiedAt === void 0 && prevType !== null && !S)
  )
    return kept;
  return {
    subscriptionType: newType,
    subscriptionTypeSource: "profile",
    subscriptionTypeVerifiedAt: vT(
      tokens.subscriptionTypeVerifiedAt,
      prevType === newType ? previous?.subscriptionTypeVerifiedAt : void 0,
    ),
  };
}
//@ chunk-aepeg2w5.js:542328-543890 facade-majority
async function saveRefreshedOAuthTokensRespectingLock({
  isCompromised: isCompromised,
  postedRefreshToken: postedRefreshToken,
  refreshedTokens: refreshedTokens,
  credentials: credentials,
}) {
  if (
    shouldUseClaudeAIAuth(refreshedTokens.scopes) &&
    refreshedTokens.refreshToken &&
    refreshedTokens.expiresAt
  ) {
    let y = isCompromised();
    if (y) logEvent("tengu_oauth_token_refresh_lock_compromised_post_post", {});
    let S = {
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
      },
      w = !1,
      R = ST(),
      x = { success: !1 },
      P = !1,
      F;
    for (let L = 0; L < 3; L++) {
      if (L > 0) await sleep(100 * L);
      ((w = !1), (P = !1));
      try {
        x = await getSecureStorage().mutate((G) => {
          let j = G.claudeAiOauth?.refreshToken;
          if (!(
            G.claudeAiOauth !== void 0 &&
            G.claudeAiOauth !== null &&
            (j === "" || j === postedRefreshToken)
          ))
            return ((w = !0), G);
          return { ...G, claudeAiOauth: buildStoredOAuthTokens(G.claudeAiOauth, S) };
        }, credentials);
      } catch (error) {
        (logForDebugging(`OAuth refresh CAS save failed: ${errorMessage(error)}`, { level: "error" }),
          (x = { success: !1 }),
          (P = !0),
          (F = error));
        continue;
      }
      if (w || x.success) break;
    }
    if (P) clearOAuthTokenCache();
    else {
      let L = isStorageV5Enabled() && credentials !== void 0 ? credentials : void 0,
        G = L && oauthTokenReadMemos.of(getRootSession().host).promise;
      if ((clearOAuthAndKeychainCaches(), L !== void 0)) await primeStoredLogin(L, G);
    }
    if (P) logEvent("tengu_oauth_tokens_save_exception", { storageBackend: R, ...errorTelemetryFields(F) });
    if (!w && !P)
      logEvent(x.success ? "tengu_oauth_tokens_saved" : "tengu_oauth_tokens_save_failed", {
        storageBackend: R,
      });
    if (y)
      logEvent(
        w
          ? "tengu_oauth_refresh_compromised_cas_adopted_sibling"
          : "tengu_oauth_refresh_compromised_cas_saved",
        {},
      );
    else if (w) logEvent("tengu_oauth_refresh_save_adopted_newer_write", {});
    if (w) return (notifyOAuthTokenReplaced(), "adopted_sibling");
    return x.success ? "saved" : "save_failed";
  }
  let h = await saveOAuthTokensIfNeeded(refreshedTokens, credentials);
  return (clearOAuthTokenCache(), h.success ? "saved" : "save_failed");
}
//@ chunk-aepeg2w5.js:543890-543925 layout
function ST() {
  return storageKindForTelemetry(getSecureStorage().name);
}
//@ chunk-aepeg2w5.js:543925-543963 facade-majority
var OAUTH_TOKEN_SAVE_FAILED_WARNING = "Failed to save OAuth tokens";
//@ chunk-aepeg2w5.js:543963-544048 facade-majority = isBigQueryMetricsEnabled (1)
function isProfilePlanDowngrade(e, n) {
  return (e === "team" || e === "enterprise") && n !== "team" && n !== "enterprise";
}
//@ chunk-aepeg2w5.js:544048-544148 facade-majority
function isProvisionalProfilePlan(e) {
  return e?.subscriptionTypeSource === "profile" && e.subscriptionTypeVerifiedAt === void 0;
}
//@ chunk-aepeg2w5.js:544148-544249 facade-majority
function isUnmarkedStoredPlan(e) {
  return e != null && (e.subscriptionType ?? null) !== null && e.subscriptionTypeSource === void 0;
}
//@ chunk-aepeg2w5.js:544249-544340 layout
function vT(e, n) {
  if (e === void 0 || n === void 0) return e ?? n;
  return n > Date.now() ? e : Math.max(e, n);
}
//@ chunk-aepeg2w5.js:544340-545376 facade-majority
async function backfillStoredOAuthTier({
  expectedRefreshToken: expectedRefreshToken,
  subscriptionType: subscriptionType,
  rateLimitTier: rateLimitTier,
  verifiedAt: verifiedAt,
  originStamped: originStamped,
  credentials: credentials,
}) {
  if (!originStamped) return "unstamped";
  let S = "failed";
  try {
    let mutate = await getSecureStorage().mutate((R) => {
      let claudeAiOauth = R.claudeAiOauth;
      if (!claudeAiOauth || claudeAiOauth.refreshToken !== expectedRefreshToken) return ((S = "rotated"), R);
      let P = claudeAiOauth.subscriptionType ?? null;
      if (P !== null && claudeAiOauth.subscriptionTypeSource === "sign_in")
        return ((S = "already_tiered"), R);
      if (isUnmarkedStoredPlan(claudeAiOauth) && P === subscriptionType)
        return (
          (S = "confirmed"),
          {
            ...R,
            claudeAiOauth: {
              ...claudeAiOauth,
              subscriptionTypeSource: "sign_in",
              rateLimitTier: rateLimitTier ?? claudeAiOauth.rateLimitTier ?? null,
            },
          }
        );
      if (!isProvisionalProfilePlan(claudeAiOauth) && isProfilePlanDowngrade(P, subscriptionType))
        return ((S = "downgrade_refused"), R);
      return (
        (S = P === subscriptionType ? "reverified" : "written"),
        {
          ...R,
          claudeAiOauth: {
            ...claudeAiOauth,
            subscriptionType: subscriptionType,
            subscriptionTypeSource: "profile",
            subscriptionTypeVerifiedAt: vT(
              verifiedAt,
              P === subscriptionType ? claudeAiOauth.subscriptionTypeVerifiedAt : void 0,
            ),
            rateLimitTier: rateLimitTier ?? claudeAiOauth.rateLimitTier ?? null,
          },
        }
      );
    }, credentials);
    if (S === "written" || S === "reverified" || S === "confirmed") {
      if (!mutate.success) return "failed";
      clearOAuthAndKeychainCaches();
    }
    return S;
  } catch (error) {
    return (
      logForDebugging(
        `OAuth: recording the stored login plan failed (${error instanceof Error ? error.name : "unknown error"})`,
        { level: "error" },
      ),
      "failed"
    );
  }
}
/**
 * 把 OAuth 令牌写入安全存储的 claudeAiOauth（accessToken/refreshToken/expiresAt/scopes/subscriptionType/rateLimitTier…）；非 claude.ai scope 或仅推理令牌（无 refresh/expires）不保存。
 */
//@ chunk-aepeg2w5.js:545376-546640 facade-majority = saveOAuthTokensIfNeeded (0.676)
async function saveOAuthTokensIfNeeded(e, n, r = "refresh") {
  if (!shouldUseClaudeAIAuth(e.scopes))
    return (logEvent("tengu_oauth_tokens_not_claude_ai", {}), { success: !0 });
  if (!e.refreshToken || !e.expiresAt)
    return (logEvent("tengu_oauth_tokens_inference_only", {}), { success: !0 });
  let {
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: expiresAt,
      refreshTokenExpiresAt: refreshTokenExpiresAt,
      scopes: scopes,
      clientId: clientId,
    } = e,
    secureStorage = getSecureStorage(),
    P = ST();
  try {
    let of = oauthTokenReadMemos.of(getRootSession().host),
      L,
      mutate = await secureStorage.mutate((q) => {
        if (
          r === "sign_in" &&
          L === void 0 &&
          q.claudeAiOauth != null &&
          q.claudeAiOauth.accessToken !== accessToken
        )
          L = q.claudeAiOauth;
        return {
          ...q,
          claudeAiOauth: buildStoredOAuthTokens(
            q.claudeAiOauth,
            {
              accessToken: accessToken,
              refreshToken: refreshToken,
              expiresAt: expiresAt,
              refreshTokenExpiresAt: refreshTokenExpiresAt,
              scopes: scopes,
              subscriptionType: e.subscriptionType,
              subscriptionTypeSource: e.subscriptionTypeSource,
              subscriptionTypeVerifiedAt: e.subscriptionTypeVerifiedAt,
              rateLimitTier: e.rateLimitTier,
              clientId: clientId,
            },
            r,
          ),
        };
      }, n);
    if (mutate.success)
      ((of.lastOwnSavedAccessToken = accessToken),
        logEvent("tengu_oauth_tokens_saved", { storageBackend: P }));
    else logEvent("tengu_oauth_tokens_save_failed", { storageBackend: P });
    let j = isStorageV5Enabled() && n !== void 0 ? n : void 0,
      storageData = j && of.promise;
    if ((clearOAuthTokenMemos(), invalidateAuthDerivedCaches(), j !== void 0))
      await primeStoredLogin(j, storageData);
    return { ...mutate, backendName: secureStorage.name, ...(L !== void 0 && { replaced: L }) };
  } catch (error) {
    return (
      logForDebugging(`Failed to save OAuth tokens: ${errorMessage(error)}`, { level: "error" }),
      logEvent("tengu_oauth_tokens_save_exception", { storageBackend: P, ...errorTelemetryFields(error) }),
      { success: !1, warning: OAUTH_TOKEN_SAVE_FAILED_WARNING, backendName: secureStorage.name }
    );
  }
}
/**
 * 进程内记录已知失效的 refresh token；同语句 $i 记录账户冻结（account_on_hold）的令牌，避免反复刷新。
 */
//@ chunk-aepeg2w5.js:546640-546704 layout
var deadRefreshTokens = ge(new Set(), (e) => e.clear()),
  onHoldRefreshTokens = ge(new Map(), (e) => e.clear());
//@ chunk-aepeg2w5.js:546704-546809 facade-majority
function getOAuthAccountOnHold() {
  let e = getClaudeAIOAuthTokens()?.refreshToken;
  if (!e) return null;
  let n = onHoldRefreshTokens.get(e);
  return n === void 0 ? null : { url: n };
}
//@ chunk-aepeg2w5.js:546809-546846 facade-majority
function __resetKnownDeadRefreshTokensForTest() {
  (deadRefreshTokens.clear(), onHoldRefreshTokens.clear());
}
//@ chunk-aepeg2w5.js:546846-547345 facade-majority
async function markRefreshTokenDeadAfterInvalidGrant(e, n) {
  (deadRefreshTokens.add(e), logEvent("tengu_oauth_refresh_token_marked_dead_invalid_grant", {}));
  try {
    let r = !1,
      mutate = await getSecureStorage().mutate((h) => {
        let claudeAiOauth = h.claudeAiOauth;
        if (!claudeAiOauth || claudeAiOauth.refreshToken !== e) return h;
        return (
          (r = !0),
          { ...h, claudeAiOauth: { ...claudeAiOauth, refreshToken: "", accessToken: "", expiresAt: 0 } }
        );
      }, n);
    if (r && mutate.success) logEvent("tengu_oauth_refresh_token_cleared_on_disk", {});
    else if (r) logForDebugging("OAuth dead-token disk clear: backend write failed", { level: "error" });
  } catch (error) {
    logForDebugging(`OAuth dead-token disk clear failed: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-aepeg2w5.js:547345-547441 facade-majority
function isOAuthRefreshKnownDead() {
  let e = gl(getClaudeAIOAuthTokens());
  if (e !== void 0) return e;
  try {
    return ET(getSecureStorage().read());
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:547441-547562 facade-majority
async function isOAuthRefreshKnownDeadAsync(e) {
  let n = gl(await getClaudeAIOAuthTokensAsync(e));
  if (n !== void 0) return n;
  try {
    return ET(await getSecureStorage().readAsync(e));
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:547562-547658 layout
function gl(e) {
  if (e) {
    let refreshToken = e.refreshToken;
    return refreshToken === "" || (!!refreshToken && deadRefreshTokens.has(refreshToken));
  }
  if (vn()) return !1;
  return;
}
//@ chunk-aepeg2w5.js:547658-547716 layout
function ET(e) {
  return e?.claudeAiOauth?.refreshToken === "";
}
/**
 * CLAUDE_CODE_OAUTH_SCOPES（空白分隔）覆盖，否则用默认 ["user:inference"]。旧版名 CLAUDE_AI_INFERENCE_SCOPE 为错配。
 */
//@ chunk-aepeg2w5.js:547716-547770 placement = CLAUDE_AI_INFERENCE_SCOPE (1)
function getRequestedOAuthScopes(e = ["user:inference"]) {
  return oauthScopesFromEnv() ?? [...e];
}
//@ chunk-aepeg2w5.js:547939-548126 placement = isUsingOAuth (0.294)
function isUsingOAuth(e) {
  return {
    accessToken: e,
    refreshToken: null,
    expiresAt: null,
    scopes: getRequestedOAuthScopes(),
    subscriptionType: env.CLAUDE_CODE_SUBSCRIPTION_TYPE || null,
    rateLimitTier: env.CLAUDE_CODE_RATE_LIMIT_TIER || null,
  };
}
//@ chunk-aepeg2w5.js:548126-548178 layout
function getLauncherOAuthTokens() {
  let e = usableLauncherHostLoginToken();
  return e === null ? null : isUsingOAuth(e);
}
/**
 * 同步读取 Claude.ai OAuth 令牌：CLAUDE_CODE_OAUTH_TOKEN 优先（包装成无 refreshToken 的令牌对象）；其次 OAuth FD；宿主托管时返回 null；再读安全存储（钥匙串 / .credentials.json）的 claudeAiOauth。
 */
//@ chunk-aepeg2w5.js:548178-548630 fingerprint = getClaudeAIOAuthTokens (0.703)
function getClaudeAIOAuthTokens_2() {
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return isUsingOAuth(env.CLAUDE_CODE_OAUTH_TOKEN);
  let oauthTokenFromFd = getOAuthTokenFromFileDescriptor(),
    n = (r) => ({
      accessToken: r,
      refreshToken: null,
      expiresAt: null,
      scopes: getOauthScopesFromFd() ?? getRequestedOAuthScopes(I1),
      subscriptionType: env.CLAUDE_CODE_SUBSCRIPTION_TYPE || null,
      rateLimitTier: env.CLAUDE_CODE_RATE_LIMIT_TIER || null,
    });
  if (oauthTokenFromFd && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth()))
    return n(oauthTokenFromFd);
  if (vn()) return null;
  try {
    let oauthData = getSecureStorage().read({ fromStoreCopy: !0 })?.claudeAiOauth;
    if (oauthData?.accessToken) return oauthData;
  } catch (error) {
    logError(error);
  }
  if (oauthTokenFromFd) return n(oauthTokenFromFd);
  return null;
}
/**
 * 按宿主的 OAuth 令牌缓存对象：缓存值/读取 promise、凭证文件 mtime 与存储 version、上次读到的钥匙串令牌、待处理 401 处理器、凭证变化信号等。
 */
//@ chunk-aepeg2w5.js:548630-549302 layout
class OAuthTokenCache {
  value = void 0;
  promise = null;
  lastCredentialsMtimeMs = 0;
  lastCredentialsVersion = void 0;
  lastKeychainAccessToken = null;
  lastUnusableTokenRecheckAt = 0;
  lastOwnSavedAccessToken = null;
  loginSwitch = null;
  loginSwitchStopOn = !1;
  credentialsChangedOnDisk = createSignal();
  pending401Handlers = new Map();
  pendingRefreshChecks = { bare: null, store: null, backend: null };
  pendingOptedInRefreshChecks = { bare: null, store: null, backend: null };
  clear() {
    ((this.value = void 0), (this.promise = null));
  }
  resetChangeCheck() {
    ((this.lastCredentialsMtimeMs = 0),
      (this.lastCredentialsVersion = void 0),
      (this.lastKeychainAccessToken = null),
      (this.lastUnusableTokenRecheckAt = 0),
      (this.lastOwnSavedAccessToken = null),
      (this.loginSwitch = null),
      (this.loginSwitchStopOn = !1));
  }
}
//@ chunk-aepeg2w5.js:549302-549328 facade-majority
var oauthTokenReadMemos = new HostScoped(() => new OAuthTokenCache());
/**
 * 当前 OAuth 令牌（按宿主缓存，未缓存时调用 getClaudeAIOAuthTokens，回退宿主启动器注入令牌）。全模块最常用的令牌读取入口。
 */
//@ chunk-aepeg2w5.js:549328-549439 facade-majority
function getClaudeAIOAuthTokens() {
  if (isBareModeAuthRestricted()) return null;
  let of = oauthTokenReadMemos.of(getRootSession().host);
  if (of.value === void 0) of.value = getClaudeAIOAuthTokens_2();
  return of.value ?? getLauncherOAuthTokens();
}
//@ chunk-aepeg2w5.js:549439-549479 facade-majority
function clearOAuthTokenMemos() {
  oauthTokenReadMemos.of(getRootSession().host).clear();
}
//@ chunk-aepeg2w5.js:549479-549597 facade-majority
function getClaudeAIOAuthTokenOrigin() {
  let e = getOAuthTokenOrigin();
  if (typeof e === "string") return e;
  let n = getSecureStorage().read()?.claudeAiOauth?.accessToken;
  return classifyBearerAgainstStore(e, n);
}
//@ chunk-aepeg2w5.js:549597-549736 facade-majority = getClaudeAIOAuthTokensAsync (0.854)
async function getClaudeAIOAuthTokenOriginAsync(e) {
  let secureStorage = getOAuthTokenOrigin();
  if (typeof secureStorage === "string") return secureStorage;
  let oauthData = (await getSecureStorage().readAsync(e))?.claudeAiOauth?.accessToken;
  return classifyBearerAgainstStore(secureStorage, oauthData);
}
/**
 * OAuth 令牌是否由环境注入（env 或 fd），这类令牌不会被 CLI 刷新。
 */
//@ chunk-aepeg2w5.js:549736-549788 facade-majority
function isClaudeAIOAuthTokenHostInjected() {
  let e = getOAuthTokenOrigin();
  return e === "env" || e === "fd";
}
//@ chunk-aepeg2w5.js:549788-549946 facade-majority
function managedConfigNotAttemptedInput(e) {
  return {
    ineligibleReason: e,
    isGateway: getAPIProvider() === "gateway",
    hasEnvAuthToken: Boolean(effectiveAuthTokenEnv()),
    hasApiKeyHelper: Boolean(getConfiguredApiKeyHelper()),
    injectedOAuthToken: () => isClaudeAIOAuthTokenHostInjected(),
  };
}
//@ chunk-aepeg2w5.js:549946-550024 facade-majority
function storeRecheckNeeded(e) {
  if (e === "env") return !1;
  if (e === "fd") return isOauthTokenFromBgSnapshot() && !isHostManagedProviderAuth();
  return !0;
}
//@ chunk-aepeg2w5.js:550024-550110 facade-majority
function isLoginStashedInTokenSlot() {
  let e = getLoginStashedInTokenSlot();
  return e !== null && (env.CLAUDE_CODE_OAUTH_TOKEN === e || getOauthTokenFromFd() === e);
}
/**
 * 判断当前 OAuth 访问令牌来自 env（CLAUDE_CODE_OAUTH_TOKEN/宿主）、fd，或返回 {bearer, fdToken} 交给调用方与安全存储比对。
 */
//@ chunk-aepeg2w5.js:550110-550358 layout
function getOAuthTokenOrigin() {
  let e = getClaudeAIOAuthTokens();
  if (!e?.accessToken) return "none";
  if (e.accessToken === env.CLAUDE_CODE_OAUTH_TOKEN || e.accessToken === usableLauncherHostLoginToken())
    return "env";
  let n = env.CLAUDE_CODE_OAUTH_TOKEN ? null : getOAuthTokenFromFileDescriptor();
  if (n && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth())) return "fd";
  return { bearer: e.accessToken, fdToken: n };
}
//@ chunk-aepeg2w5.js:550358-550456 layout
function classifyBearerAgainstStore({ bearer: bearer, fdToken: fdToken }, r) {
  if (r && r === bearer) return "store";
  if (fdToken && bearer === fdToken) return "fd";
  return "none";
}
//@ chunk-aepeg2w5.js:550456-550494 layout
function clearOAuthCachesForReload() {
  if ((clearOAuthTokenMemos(), clearKeychainCache(), isStorageV5Enabled())) invalidatePlainTextStoreCopy();
}
//@ chunk-aepeg2w5.js:550494-550523 layout
function invalidateAuthDerivedCaches() {
  (clearBetasCaches(), emitCredentialChange(), LA());
}
//@ chunk-aepeg2w5.js:550523-550553 layout
function clearOAuthAndKeychainCaches() {
  (clearOAuthTokenMemos(), clearKeychainCache(), invalidateAuthDerivedCaches());
}
//@ chunk-aepeg2w5.js:550553-550585 facade-majority
function clearOAuthTokenCache() {
  if ((clearOAuthAndKeychainCaches(), isStorageV5Enabled())) invalidatePlainTextStoreCopy();
}
/**
 * 清空所有认证缓存（OAuth 令牌、apiKeyHelper、API key 配置、AWS 链/刷新、GCP 刷新、钥匙串等），登录/登出与切换账号时调用。
 */
//@ chunk-aepeg2w5.js:550585-550682 facade-majority
function resetEnvDerivedAuthCaches() {
  if (
    (clearOAuthTokenMemos(),
    forgetHeldHostSessionsBearer(),
    getApiKeyConfigCache().clear(),
    clearApiKeyHelperCache(),
    clearAwsCredentialsCache(),
    resetAwsAuthRefreshCooldown(),
    clearGcpCredentialsCache(),
    clearBetasCaches(),
    invalidateToolDescriptions(),
    Mxt(null),
    isStorageV5Enabled())
  )
    invalidatePlainTextStoreCopy();
}
//@ chunk-aepeg2w5.js:550682-550733 facade-majority
function _resetCredentialsChangeCheckForTesting() {
  oauthTokenReadMemos.of(getRootSession().host).resetChangeCheck();
}
//@ chunk-aepeg2w5.js:550733-551197 facade-majority
async function primeStoredLogin(e, n) {
  if (!startupReadsStoredLogin()) return;
  let of = oauthTokenReadMemos.of(getRootSession().host),
    s;
  try {
    let probeCredentials = await e.probeCredentials();
    s = probeCredentials.state === "present" ? probeCredentials.version : void 0;
  } catch (error) {
    logForDebugging(`Credentials version prime failed: ${errorMessage(error)}`, { level: "error" });
  }
  if ((await n?.catch(() => null), await of.promise?.catch(() => null), (of.promise = null), s !== void 0))
    of.lastCredentialsVersion = s;
  let h = readStoredOAuthTokensAsync(e);
  if (((of.promise = h), (await h) === null)) {
    if (s !== void 0) of.lastCredentialsVersion = void 0;
    if (of.promise === h) of.promise = null;
  }
  of.value = void 0;
}
//@ chunk-aepeg2w5.js:551197-551424 layout
async function readStoredOAuthTokensAsync(e) {
  try {
    let n = (await getSecureStorage().readAsync(e))?.claudeAiOauth;
    return n?.accessToken ? n : null;
  } catch (error) {
    return (
      logForDebugging(
        `Credentials prime through the store failed (${error instanceof Error ? error.name : typeof error})`,
        { level: "error" },
      ),
      null
    );
  }
}
/**
 * 检测凭证是否被别的进程改过（storage v5 比 version，文件比 mtime），变化则清缓存并发出 credentialsChangedOnDisk 信号。
 */
//@ chunk-aepeg2w5.js:551424-551857 layout
async function invalidateOAuthCacheIfDiskChanged(e, n) {
  if (isStorageV5Enabled() && n !== void 0) {
    let probeCredentials = await n.probeCredentials();
    if (probeCredentials.state !== "present") return recheckStoredOAuthToken(e, n);
    if (probeCredentials.version !== e.lastCredentialsVersion) {
      ((e.lastCredentialsVersion = probeCredentials.version),
        clearOAuthTokenCache(),
        emitCredentialsChangedOnDisk(e));
      return;
    }
    return recheckUnusableOAuthToken(e, n);
  }
  let r;
  try {
    let s = FOe();
    if (s === null) return recheckStoredOAuthToken(e, n);
    r = (await stat(join_3(s, ".credentials.json"))).mtimeMs;
  } catch {
    return recheckStoredOAuthToken(e, n);
  }
  if (r !== e.lastCredentialsMtimeMs) {
    ((e.lastCredentialsMtimeMs = r), clearOAuthTokenCache(), emitCredentialsChangedOnDisk(e));
    return;
  }
  await recheckUnusableOAuthToken(e, n);
}
//@ chunk-aepeg2w5.js:551857-552178 layout
async function recheckUnusableOAuthToken(e, n) {
  try {
    if (!isFirstPartyProvider()) return;
    let r = e.promise ? await e.promise.catch(() => null) : e.value;
    if (r === void 0) return;
    if (r !== null && !gl(r)) return;
    let now = Date.now();
    if (now - e.lastUnusableTokenRecheckAt < KEYCHAIN_CACHE_TTL_MS) return;
    if (((e.lastUnusableTokenRecheckAt = now), r !== null)) e.lastKeychainAccessToken = r.accessToken;
    await recheckStoredOAuthToken(e, n);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-aepeg2w5.js:552178-552246 layout
function emitCredentialsChangedOnDisk(e) {
  try {
    e.credentialsChangedOnDisk.emit();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-aepeg2w5.js:552246-552319 facade-majority
function subscribeOAuthCredentialsChangedOnDisk(e, n) {
  return oauthTokenReadMemos.of(e).credentialsChangedOnDisk.subscribe(n);
}
//@ chunk-aepeg2w5.js:552319-552382 facade-majority
function wasOAuthAccessTokenSavedByThisProcess(e, n) {
  return oauthTokenReadMemos.of(e).lastOwnSavedAccessToken === n;
}
//@ chunk-aepeg2w5.js:552382-552421 facade-majority
function loginSwitchMemo() {
  return oauthTokenReadMemos.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:552421-552472 facade-majority
async function checkOAuthCredentialsChangedOnDisk(e, n) {
  (clearKeychainCache(), await invalidateOAuthCacheIfDiskChanged(oauthTokenReadMemos.of(e), n));
}
//@ chunk-aepeg2w5.js:552472-552629 layout
async function recheckStoredOAuthToken(e, n) {
  if ((e.clear(), isStorageV5Enabled())) invalidatePlainTextStoreCopy();
  let s = (await getClaudeAIOAuthTokensAsync(n))?.accessToken ?? null;
  if (s !== e.lastKeychainAccessToken)
    ((e.lastKeychainAccessToken = s), invalidateAuthDerivedCaches(), emitCredentialsChangedOnDisk(e));
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
  if (!(isStorageV5Enabled() && e !== void 0) || isBareModeAuthRestricted() || env.CLAUDE_CODE_OAUTH_TOKEN)
    return "bare";
  if (getOAuthTokenFromFileDescriptor() && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth()))
    return "bare";
  return n !== void 0 ? "backend" : "store";
}
//@ chunk-aepeg2w5.js:552907-552994 layout
function MT(e, n) {
  for (let r of TOKEN_STORE_TIERS.slice(TOKEN_STORE_TIERS.indexOf(n))) {
    let s = e(r);
    if (s) return s;
  }
  return;
}
//@ chunk-aepeg2w5.js:552994-553105 layout
function findHigherTierToken(e, n) {
  for (let r = TOKEN_STORE_TIERS.indexOf(n) - 1; r >= 0; r--) {
    let s = TOKEN_STORE_TIERS[r],
      h = s === void 0 ? void 0 : e(s);
    if (h) return h;
  }
  return;
}
//@ chunk-aepeg2w5.js:553105-553258 facade-majority
async function recoverCloudSessionsBearer(e, n, r, s = "refused") {
  let h = await recoverHostSessionsBearer(e, s);
  if (h !== "not_held") return h === "recovered" || hasClaudeAISignInToken();
  if ((await ensureHostSessionsBearer()) !== null) return !0;
  return handleOAuth401Error(e, n, r);
}
/**
 * 检查并按需刷新 OAuth 令牌的入口：按（令牌, 存储层级, 是否非第一方登录）合并并发调用，再走 checkAndRefreshOAuthTokenIfNeededImpl。
 */
//@ chunk-aepeg2w5.js:553258-553795 facade-majority = checkAndRefreshOAuthTokenIfNeeded (0.189)
function handleOAuth401Error(e, n, r, { usesLoginOffFirstParty: s = !1, onForcedRefreshOutcome: h } = {}) {
  let of = oauthTokenReadMemos.of(getRootSession().host),
    promise = getTokenStoreTier(n, r),
    w = isLoginOffFirstParty(s),
    R = (j) => of.pending401Handlers.get(pending401HandlerKey(e, j, w)),
    x = MT(R, promise);
  if (x) {
    if (!h) return x.promise;
    return x.promise.then((j) => {
      if (x.forcedOutcome !== void 0) h(x.forcedOutcome);
      return j;
    });
  }
  let P = pending401HandlerKey(e, promise, w),
    F = { promise: Promise.resolve(!1) },
    L = () =>
      handleOAuth401ErrorImpl(e, n, r, s, (j) => {
        ((F.forcedOutcome = j), h?.(j));
      }),
    G = findHigherTierToken(R, promise);
  return (
    (F.promise = (G ? G.promise.catch(() => !1).then(L) : L()).finally(() => {
      of.pending401Handlers.delete(P);
    })),
    of.pending401Handlers.set(P, F),
    F.promise
  );
}
/**
 * 轮询 CLAUDE_CODE_OAUTH_TOKEN / OAuth FD，直到出现与失败令牌不同的新令牌或超时。
 */
//@ chunk-aepeg2w5.js:553795-554117 facade-majority
async function waitForRotatedEnvToken(e) {
  let n = e.pollMs ?? 2000,
    r = e.readToken ?? (() => env.CLAUDE_CODE_OAUTH_TOKEN ?? getOAuthTokenFromFileDescriptor() ?? void 0),
    s = e.sleeper ?? ((S) => sleep(S)),
    h = Date.now() + e.timeoutMs;
  while (Date.now() < h) {
    let S = r();
    if (S && S !== e.failedAccessToken) return !0;
    await s(Math.min(n, Math.max(1, h - Date.now())));
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
  return isUserExportedOAuthEnvToken() ? "none" : void 0;
}
/**
 * 401 后等待外部令牌轮换的时长：CLAUDE_CODE_OAUTH_401_WAIT_MS，远程会话有默认值，否则 0。
 */
//@ chunk-aepeg2w5.js:554373-554465 layout
function getOAuth401WaitMs() {
  let CLAUDE_CODE_OAUTH_401_WAIT_MS = env.CLAUDE_CODE_OAUTH_401_WAIT_MS;
  if (CLAUDE_CODE_OAUTH_401_WAIT_MS !== void 0) return CLAUDE_CODE_OAUTH_401_WAIT_MS;
  return isRemoteSessionChild() ? ky : 0;
}
//@ chunk-aepeg2w5.js:554465-554500 layout
class AuthFailureClock {
  firstUnrecoveredAtMs = null;
}
//@ chunk-aepeg2w5.js:554500-554526 facade-majority
var authFailureClocks = new HostScoped(() => new AuthFailureClock());
/**
 * 远程子进程认证连续失败计时：超过 CLAUDE_CODE_AUTH_FAIL_EXIT_MS（默认 10 分钟）返回 exit，恢复后清零。
 */
//@ chunk-aepeg2w5.js:554526-554916 facade-majority
function noteAuthRecoveryOutcome(e) {
  let n = e.nowMs ?? Date.now(),
    of = authFailureClocks.of(getRootSession().host);
  if (e.recovered) return ((of.firstUnrecoveredAtMs = null), "continue");
  if (!(e.isRemoteChild ?? isRemoteSessionChild())) return "continue";
  let h = e.thresholdMs ?? env.CLAUDE_CODE_AUTH_FAIL_EXIT_MS ?? 600000;
  if (h <= 0) return "continue";
  if (of.firstUnrecoveredAtMs === null) return ((of.firstUnrecoveredAtMs = n), "continue");
  if (n - of.firstUnrecoveredAtMs >= h) return "exit";
  return "continue";
}
//@ chunk-aepeg2w5.js:554916-554974 facade-majority
function resetAuthFailureTracking() {
  authFailureClocks.of(getRootSession().host).firstUnrecoveredAtMs = null;
}
//@ chunk-aepeg2w5.js:554974-555006 layout
function notifyOAuthTokenReplaced(e) {
  (setAuthenticatedAccount(null), forgetHeldHostSessionsBearer(e));
}
/**
 * 处理 API 返回 401：先清令牌缓存；没有 refresh token 时尝试宿主启动器或 SDK getOAuthToken 回调换新令牌（写回 CLAUDE_CODE_OAUTH_TOKEN）；有则强制刷新。结果写 oauth_401_recovery 诊断。
 */
//@ chunk-aepeg2w5.js:555006-558274 layout
async function handleOAuth401ErrorImpl(e, n, r, s = !1, h) {
  clearOAuthTokenCache();
  let y = await getClaudeAIOAuthTokensAsync(n);
  if (!y?.refreshToken) {
    let R = getSdkOAuthTokenRefreshCallback();
    if (isLauncherStartedProcess()) {
      if (launcherSignInMethodRefusal() !== null) {
        if (forgetLauncherHostLogin())
          (clearOAuthTokenCache(),
            logForDebugging(
              "[launcher-host-login] the desktop app's sign-in is not renewed under the sign-in method pin now in force",
              { level: "warn" },
            ));
      } else if (await renewLauncherHostLogin(e))
        return (
          clearOAuthTokenCache(),
          logEvent("tengu_oauth_401_sdk_callback_refreshed", {}),
          logFeatureOk("oauth_401_recovery"),
          noteAuthRecoveryOutcome({ recovered: !0 }),
          !0
        );
    } else if (R)
      try {
        let L = await R();
        if (L && L !== e) {
          let G = env.CLAUDE_CODE_OAUTH_TOKEN ?? y?.accessToken ?? e;
          if (L !== G)
            ((process.env.CLAUDE_CODE_OAUTH_TOKEN = L), clearOAuthTokenCache(), notifyOAuthTokenReplaced(G));
          return (
            logEvent("tengu_oauth_401_sdk_callback_refreshed", {}),
            logFeatureOk("oauth_401_recovery"),
            noteAuthRecoveryOutcome({ recovered: !0 }),
            !0
          );
        }
        logForDebugging(
          L === null
            ? "SDK getOAuthToken callback returned null (no token available)"
            : "SDK getOAuthToken callback returned the same expired token; treating as no refresh",
          { level: L === null ? "debug" : "error" },
        );
      } catch (error) {
        (logFeatureBad("oauth_401_recovery", "oauth_401_sdk_callback_failed"),
          logForDebugging(
            `SDK getOAuthToken callback failed: ${error instanceof Error ? error.message : String(error)}`,
            { level: "error" },
          ));
      }
    let x = !1,
      P = !1;
    if (!vn()) {
      if (
        ((x = isUserExportedOAuthEnvToken()),
        (P =
          !env.CLAUDE_CODE_OAUTH_TOKEN &&
          sdkHostOffersOAuthRefresh() &&
          Boolean(getOAuthTokenFromFileDescriptor()) &&
          (v$("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR") || isLoginStashedInTokenSlot()) &&
          !isOauthTokenFromBgSnapshot()),
        x)
      )
        logForDebugging(
          "OAuth 401: keeping the user-supplied CLAUDE_CODE_OAUTH_TOKEN instead of adopting the stored credential. Mint a fresh token with `claude setup-token` and restart with it, or unset the variable and run /login.",
          { level: "error" },
        );
      else if (P)
        logForDebugging(
          "OAuth 401: the login this session is using was refused. The login saved on this machine was not used because it may be a different account. Sign in again in the app that started this session, or run /login.",
          { level: "error" },
        );
      else if (env.CLAUDE_CODE_OAUTH_TOKEN || getOAuthTokenFromFileDescriptor())
        try {
          let L = (await getSecureStorage().readAsync(n))?.claudeAiOauth;
          if (L?.accessToken && L.accessToken !== e && !isOAuthTokenExpired(L.expiresAt)) {
            let G = Boolean(withoutSSHTunnelVars());
            if (env.CLAUDE_CODE_OAUTH_TOKEN) process.env.CLAUDE_CODE_OAUTH_TOKEN = L.accessToken;
            if (
              isStorageV5Enabled() && n !== void 0
                ? await getOAuthTokenFromFileDescriptorAsync(n)
                : getOAuthTokenFromFileDescriptor()
            )
              (setOauthTokenFromFd(L.accessToken), setOauthScopesFromFd(L.scopes));
            return (
              setLoginStashedInTokenSlot(G ? null : L.accessToken),
              clearOAuthTokenCache(),
              notifyOAuthTokenReplaced(),
              logEvent("tengu_oauth_401_recovered_from_disk", {}),
              logFeatureOk("oauth_401_recovery"),
              noteAuthRecoveryOutcome({ recovered: !0 }),
              !0
            );
          }
        } catch (error) {
          (logFeatureBad("oauth_401_recovery", "oauth_401_disk_read_failed"), logError(error));
        }
    }
    let F = Boolean(process.env.CLAUDE_CODE_OAUTH_TOKEN) || Boolean(getOAuthTokenFromFileDescriptor());
    if (F) {
      let L = getOAuth401WaitMs();
      if (L > 0) {
        if (
          (logForDebugging(`OAuth 401 recovery: waiting up to ${L}ms for a rotated env token`),
          await waitForRotatedEnvToken({ failedAccessToken: e, timeoutMs: L }))
        ) {
          if (
            isStorageV5Enabled() && n !== void 0
              ? await getOAuthTokenFromFileDescriptorAsync(n)
              : getOAuthTokenFromFileDescriptor()
          ) {
            let CLAUDE_CODE_OAUTH_TOKEN = env.CLAUDE_CODE_OAUTH_TOKEN;
            if (CLAUDE_CODE_OAUTH_TOKEN) setOauthTokenFromFd(CLAUDE_CODE_OAUTH_TOKEN);
          }
          return (
            clearOAuthTokenCache(),
            notifyOAuthTokenReplaced(),
            logEvent("tengu_oauth_401_recovered_from_rotation", {}),
            logFeatureOk("oauth_401_recovery"),
            noteAuthRecoveryOutcome({ recovered: !0 }),
            !0
          );
        }
      }
    }
    if (
      (logFeatureBad(
        "oauth_401_recovery",
        x
          ? "oauth_401_skipped_user_env_token"
          : P
            ? "oauth_401_skipped_sdk_host_fd_token"
            : F || isLauncherStartedProcess()
              ? "oauth_401_no_refresh_token_bg_worker"
              : "oauth_401_no_refresh_token_interactive",
      ),
      noteAuthRecoveryOutcome({ recovered: !1 }) === "exit")
    )
      (logEvent("tengu_oauth_401_zombie_exit", {}),
        logForDebugging(
          "OAuth 401 unrecovered past CLAUDE_CODE_AUTH_FAIL_EXIT_MS \u2014 exiting so the runner recycles this session with fresh credentials",
          { level: "error" },
        ),
        setTimeout(() => process.exit(1), 2000));
    return !1;
  }
  if (y.accessToken !== e)
    return (
      notifyOAuthTokenReplaced(),
      logEvent("tengu_oauth_401_recovered_from_keychain", {}),
      logFeatureOk("oauth_401_recovery"),
      noteAuthRecoveryOutcome({ recovered: !0 }),
      !0
    );
  let S = { force: !0, entryAccessToken: e, credentials: n, storageV5: r, usesLoginOffFirstParty: s };
  if (!h) return checkAndRefreshOAuthTokenIfNeeded(S);
  let w = await checkAndRefreshOAuthTokenIfNeededWithOutcome(S);
  return (h(w), w === "refreshed");
}
/**
 * 异步读取 OAuth 令牌并缓存 promise；调用失败时清掉缓存的 promise。
 */
//@ chunk-aepeg2w5.js:558274-558478 facade-majority
function getClaudeAIOAuthTokensAsync(e) {
  if (isBareModeAuthRestricted()) return Promise.resolve(null);
  let of = oauthTokenReadMemos.of(getRootSession().host),
    promise = of.promise;
  if (!promise) {
    let s = getOAuthBearerOriginAsync(e);
    ((promise = s),
      (of.promise = s),
      s.catch(() => {
        if (of.promise === s) of.promise = null;
      }));
  }
  return isLauncherStartedProcess() ? promise.then((s) => s ?? getLauncherOAuthTokens()) : promise;
}
/**
 * 异步版 getClaudeAIOAuthTokens，支持 storage v5 后端读取。
 */
//@ chunk-aepeg2w5.js:558478-558753 fingerprint = getClaudeAIOAuthTokensAsync (1)
async function getOAuthBearerOriginAsync(e) {
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return getClaudeAIOAuthTokens();
  let n =
    isStorageV5Enabled() && e !== void 0
      ? await getOAuthTokenFromFileDescriptorAsync(e)
      : getOAuthTokenFromFileDescriptor();
  if (n && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth())) return getClaudeAIOAuthTokens();
  if (vn()) return null;
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
async function readFreshOAuthAccessToken(e) {
  return (clearOAuthCachesForReload(), (await getClaudeAIOAuthTokensAsync(e))?.accessToken);
}
//@ chunk-aepeg2w5.js:558814-558943 facade-majority
function startupReadsStoredLogin() {
  if (
    isBareModeAuthRestricted() ||
    env.CLAUDE_CODE_OAUTH_TOKEN ||
    env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR ||
    vn()
  )
    return !1;
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
    (e?.organizationUuid || void 0) === (n?.organizationUuid || void 0)
  );
}
/**
 * 取语音所需的 OAuth access token 与账户/组织 UUID，没有 token 返回 undefined。
 */
//@ chunk-aepeg2w5.js:559169-559376 facade-majority = hasVoiceAuth (0.484)
async function readFreshOAuthCredentialSnapshot(config, credentials) {
  clearOAuthCachesForReload();
  let [r, s] = await Promise.all([
    getClaudeAIOAuthTokensAsync(credentials),
    isAnthropicAuthEnabled() ? readFreshOauthAccountFromDisk(config) : void 0,
  ]);
  if (!r?.accessToken) return;
  return { accessToken: r.accessToken, accountUuid: s?.accountUuid, organizationUuid: s?.organizationUuid };
}
//@ chunk-aepeg2w5.js:559376-559453 facade-majority
async function readStoredLoginOrganizationAfresh(e) {
  let n = await readFreshOauthAccountFromDisk(e);
  return Vt(n?.organizationUuid) ?? null;
}
/**
 * 收集 OAuth 刷新锁争用信息：判断争用的是当前锁文件还是旧锁文件，读取其修改时间算出锁已存在的时长。
 */
//@ chunk-aepeg2w5.js:559453-559789 layout
async function getRefreshLockInfo(e, n) {
  let r = typeof e === "object" && e !== null && "file" in e && typeof e.file === "string" ? e.file : void 0,
    s = r === void 0 || resolve_2(r) === resolve_2(n),
    h = s ? oauthRefreshLockOptions(n).lockfilePath : r,
    y,
    S;
  try {
    let w = await stat(h);
    ((S = w.mtimeMs), (y = Math.max(0, Math.round(Date.now() - w.mtimeMs))));
  } catch {
    y = void 0;
  }
  return { contendedLock: s ? lit("current") : lit("legacy"), lockAgeMs: y, mtimeMs: S };
}
//@ chunk-aepeg2w5.js:559789-559801 layout
var zA = 7500;
//@ chunk-aepeg2w5.js:559801-559922 layout
function sameLockObservation(e, n) {
  return (
    e.mtimeMs !== void 0 &&
    n.mtimeMs !== void 0 &&
    e.contendedLock === n.contendedLock &&
    e.mtimeMs === n.mtimeMs
  );
}
//@ chunk-aepeg2w5.js:559922-560119 facade-majority
function oauthRefreshLockOptions(e, n) {
  return {
    lockfilePath: join_3(e, ".oauth_refresh.lock"),
    realpath: !1,
    stale: 60000,
    update: 5000,
    onCompromised: (r) => {
      (logForDebugging(`OAuth refresh lock compromised: ${r.message}`, { level: "error" }), n?.(r));
    },
  };
}
/**
 * 返回 realpath(path)+".lock" 锁文件路径。
 */
//@ chunk-aepeg2w5.js:560119-560181 layout = getTaskListLockPath (1)
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
async function acquireOAuthRefreshLock(e) {
  let n = !1,
    abortController = new AbortController(),
    s = () => {
      ((n = !0), abortController.abort());
    },
    h = oauthRefreshLockOptions(e, s),
    y = await lock(e, { ...h, ...Mf(h.lockfilePath) }),
    S = await getLockfilePathFor(e),
    w = null;
  try {
    w = await lock(S, { ...oauthRefreshLockOptions(e, s), lockfilePath: S, ...Mf(S) });
  } catch (error) {
    if (error.code === "ELOCKED")
      throw (
        logEvent("tengu_oauth_refresh_legacy_lock_contended", {}),
        await y().catch((F) =>
          isFsInaccessible(F) || n
            ? logForDebugging(`OAuth refresh new-lock release failed: ${F}`)
            : logError(F),
        ),
        error
      );
    if (isFsInaccessible(error)) logForDebugging(`OAuth refresh legacy-lock acquire failed: ${error}`);
    else logError(error);
  }
  let R = beginOAuthRefreshLockHold(),
    x = await writeLockOwnerRecord({
      claudeDir: e,
      lockfilePath: oauthRefreshLockOptions(e).lockfilePath,
      legacyLockfilePath: w ? S : null,
    });
  return {
    isCompromised: () => n,
    signal: abortController.signal,
    release: async () => {
      try {
        if (x !== null) await removeOwnLockOwnerRecord(e, x);
        if (w)
          await w().catch((P) =>
            isFsInaccessible(P) || n
              ? logForDebugging(`OAuth refresh legacy-lock release failed: ${P}`)
              : logError(P),
          );
        await y();
      } finally {
        R();
      }
    },
  };
}
//@ chunk-aepeg2w5.js:561108-561138 layout
class FT {
  held = 0;
  released = null;
}
//@ chunk-aepeg2w5.js:561138-561164 facade-majority
var oauthRefreshLockHolds = new HostScoped(() => new FT());
//@ chunk-aepeg2w5.js:561164-561295 facade-majority
function beginOAuthRefreshLockHold() {
  let e = onProcessRootHost(oauthRefreshLockHolds);
  e.held++;
  let n = !0;
  return () => {
    if (!n) return;
    if (((n = !1), --e.held === 0)) (e.released?.resolve(), (e.released = null));
  };
}
//@ chunk-aepeg2w5.js:561295-561413 facade-majority
function waitForOAuthRefreshLocksReleased() {
  let e = onProcessRootHost(oauthRefreshLockHolds);
  if (e.held === 0) return null;
  return ((e.released ??= Promise.withResolvers()), e.released.promise);
}
//@ chunk-aepeg2w5.js:561413-561433 facade-majority
var OAUTH_REFRESH_EXIT_WAIT_CAP_MS = 2000,
  H1 = 250;
//@ chunk-aepeg2w5.js:561433-561714 facade-majority
async function waitForInFlightOAuthRefresh(e) {
  try {
    let n = waitForOAuthRefreshLocksReleased();
    if (n === null) return !0;
    let r =
      (await withDeadline(
        n.then(() => !0),
        e,
      )) ?? !1;
    if (!r)
      (logForDebugging(`OAuth refresh still in flight after ${e}ms; exiting without waiting further`),
        await withDeadline(
          logFeatureSadAsync("oauth_token_refresh", "exit_wait_timeout").catch(() => {}),
          H1,
        ));
    return r;
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:561714-561732 layout
registerOAuthRefreshExitWait(() => waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS));
//@ chunk-aepeg2w5.js:561732-561741 layout
var B1 = 5;
//@ chunk-aepeg2w5.js:561741-562393 facade-majority
async function withOAuthRefreshLock(e, n) {
  if (isDiskless())
    throw (
      logFeatureBad("oauth_token_refresh", "oauth_refresh_diskless"),
      Error("This hosted session (claude-code-server) cannot refresh an OAuth token")
    );
  let r = getProjectDirsUpToHome();
  await getFsImplementation().mkdir(r);
  let s,
    h = 0;
  while (!s) {
    h++;
    try {
      s = await acquireOAuthRefreshLock(r);
    } catch (error) {
      if (error.code === "ELOCKED") {
        if (h < B1) {
          await sleep(1000 + Math.random() * 1000);
          continue;
        }
        throw new OAuthRefreshLockContendedError(h);
      }
      throw error;
    }
  }
  try {
    if ((clearOAuthTokenCache(), (await getSecureStorage().readAsyncStrict?.(n)) === READ_FAILED))
      throw new OAuthRefreshLockContendedError(h);
    let S = await getClaudeAIOAuthTokensAsync(n);
    return await e({ lockedTokens: S, lockAttempts: h, isCompromised: s.isCompromised, signal: s.signal });
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
var TOKEN_REFRESH_OUTCOMES_BEFORE_POST = new Set([
    "lock_timeout",
    "lock_busy",
    "lock_error",
    "lock_disk_full",
  ]),
  K1 = new Set(["lock_timeout", "lock_busy"]);
//@ chunk-aepeg2w5.js:562510-562611 facade-majority
function isAuthFailureWorthRetrying(e, n) {
  return (
    e !== void 0 &&
    K1.has(e) &&
    (n === void 0 || (n.outcome !== void 0 && TOKEN_REFRESH_OUTCOMES_BEFORE_POST.has(n.outcome)))
  );
}
//@ chunk-aepeg2w5.js:562611-562670 facade-majority
function checkAndRefreshOAuthTokenIfNeeded(e = {}) {
  return checkAndRefreshOAuthTokenIfNeededWithOutcome(e).then((n) => n === "refreshed");
}
//@ chunk-aepeg2w5.js:562670-563134 facade-majority
function checkAndRefreshOAuthTokenIfNeededWithOutcome({
  retryCount: e = 0,
  force: n = !1,
  entryAccessToken: r,
  credentials: s,
  storageV5: h,
  usesLoginOffFirstParty: y = !1,
} = {}) {
  let of = oauthTokenReadMemos.of(getRootSession().host);
  if (e === 0 && !n) {
    let w = isLoginOffFirstParty(y) ? "pendingOptedInRefreshChecks" : "pendingRefreshChecks",
      R = getTokenStoreTier(s, h),
      x = (j) => of[w][j],
      P = MT(x, R);
    if (P) return P;
    let F = () => checkAndRefreshOAuthTokenIfNeededImpl(of, e, 0, void 0, n, void 0, s, h, y),
      L = findHigherTierToken(x, R),
      G = (
        L
          ? L.catch(() => {
              return;
            }).then(F)
          : F()
      ).finally(() => {
        of[w] = { ...of[w], [R]: null };
      });
    return ((of[w] = { ...of[w], [R]: G }), G);
  }
  return checkAndRefreshOAuthTokenIfNeededImpl(of, e, 0, void 0, n, r, s, h, y);
}
//@ chunk-aepeg2w5.js:563134-563220 facade-majority
function isExpectedOAuthRefreshError(e, { isDefaultFirstPartyClient: isDefaultFirstPartyClient }) {
  return (
    isInvalidGrantError(e) ||
    isAccountOnHoldError(e) ||
    (!isDefaultFirstPartyClient && isExpectedOAuthTokenError(e)) ||
    isExpectedApiError(e)
  );
}
/**
 * 刷新 OAuth 令牌：未过期（提前 5 分钟判定）返回 not_needed；无 refresh token、已知失效或账户冻结直接返回原因；在配置目录加文件锁（ELOCKED 时随机退避重试 5 次，必要时接管死锁持有者），锁内再次确认后调用 refreshOAuthToken 并写回安全存储。
 */
//@ chunk-aepeg2w5.js:563220-567727 fingerprint = checkAndRefreshOAuthTokenIfNeededImpl (0.377)
async function checkAndRefreshOAuthTokenIfNeededImpl(e, n, r, s, h, y, S, w, R = !1, x = !1) {
  await invalidateOAuthCacheIfDiskChanged(e, S);
  let F = await getClaudeAIOAuthTokensAsync(S);
  if (!h) {
    if (F && !isOAuthTokenExpired(F.expiresAt)) return "not_needed";
    if (!F?.refreshToken) return "no_refresh_token";
  }
  if (!F?.refreshToken) return "no_refresh_token";
  if (deadRefreshTokens.has(F.refreshToken)) return "known_dead_refresh_token";
  if (onHoldRefreshTokens.has(F.refreshToken)) return "account_on_hold";
  if (!shouldUseClaudeAIAuth(F.scopes) && !F.subscriptionType) return "not_refreshable";
  if (!isFirstPartyProvider() && !R) return "not_needed";
  let L = y ?? F.accessToken;
  clearOAuthTokenCache();
  let G = await getClaudeAIOAuthTokensAsync(S);
  if (!G?.refreshToken) return "no_refresh_token";
  if (G.accessToken !== L)
    return (notifyOAuthTokenReplaced(), logEvent("tengu_oauth_token_refresh_race_resolved", {}), "refreshed");
  if (!h && !isOAuthTokenExpired(G.expiresAt)) return "not_needed";
  if (isDiskless())
    return (logFeatureBad("oauth_token_refresh", "oauth_refresh_diskless"), "not_refreshable");
  let tokens = getProjectDirsUpToHome();
  await getFsImplementation().mkdir(tokens);
  let ee;
  try {
    (logEvent("tengu_oauth_token_refresh_lock_acquiring", {}), (ee = await acquireOAuthRefreshLock(tokens)));
  } catch (err) {
    if (err.code === "ELOCKED") {
      let se = s ?? (await getRefreshLockInfo(err, tokens));
      if (n < 5) {
        logEvent("tengu_oauth_token_refresh_lock_retry", { retryCount: n + 1 });
        let fe = 1000 + Math.random() * 1000;
        return (
          await sleep(fe),
          checkAndRefreshOAuthTokenIfNeededImpl(e, n + 1, r + fe, se, h, L, S, w, R, x)
        );
      }
      let Se = G.expiresAt !== null && Date.now() >= G.expiresAt,
        refreshedTokens = await getRefreshLockInfo(err, tokens);
      if (sameLockObservation(se, refreshedTokens) && r < zA)
        (await sleep(zA - r), (refreshedTokens = await getRefreshLockInfo(err, tokens)));
      let { contendedLock: contendedLock, lockAgeMs: lockAgeMs } = refreshedTokens,
        ce = !sameLockObservation(se, refreshedTokens);
      if (!ce && !x && String(contendedLock) === "current" && refreshedTokens.mtimeMs !== void 0) {
        let fe = await checkLockStillOwned({
          claudeDir: tokens,
          lockfilePath: oauthRefreshLockOptions(tokens).lockfilePath,
          legacyLockfilePath: await getLockfilePathFor(tokens),
          watchedMtimeMs: refreshedTokens.mtimeMs,
        });
        if (
          (logEvent("tengu_oauth_token_refresh_lock_dead_holder_takeover", {
            outcome: fromEnum(fe),
            lockAgeMs: lockAgeMs,
          }),
          fe === "taken_over" || fe === "lock_changed")
        )
          return checkAndRefreshOAuthTokenIfNeededImpl(e, 0, 0, void 0, h, L, S, w, R, !0);
      }
      return (
        logEvent("tengu_oauth_token_refresh_lock_retry_limit_reached", {
          maxRetries: 5,
          tokenPastExpiry: Se,
          contendedLock: contendedLock,
          lockAgeMs: lockAgeMs,
          holderAlive: ce,
        }),
        logFeatureSad("oauth_token_refresh", "oauth_refresh_lock_timeout", {
          token_past_expiry: Se,
          contended_lock: contendedLock,
          holder_alive: ce,
          ...(lockAgeMs !== void 0 && { lock_age_ms: lockAgeMs }),
        }),
        ce ? "lock_busy" : "lock_timeout"
      );
    }
    return (
      logError(err),
      logEvent("tengu_oauth_token_refresh_lock_error", { ...errorTelemetryFields(err) }),
      logFeatureBad("oauth_token_refresh", "oauth_refresh_lock_error"),
      isDiskFullErrno(err) ? "lock_disk_full" : "lock_error"
    );
  }
  let q = null,
    Q = !0;
  try {
    if (
      (logEvent("tengu_oauth_token_refresh_lock_acquired", {}),
      clearOAuthTokenCache(),
      (await getSecureStorage().readAsyncStrict?.(S)) === READ_FAILED)
    )
      return (
        logEvent("tengu_oauth_token_refresh_locked_read_failed", {}),
        logFeatureSad("oauth_token_refresh", "oauth_refresh_locked_read_failed"),
        "lock_error"
      );
    let se = await getClaudeAIOAuthTokensAsync(S);
    if (!se?.refreshToken) return "no_refresh_token";
    if (((q = se.refreshToken), se.accessToken !== L))
      return (
        notifyOAuthTokenReplaced(),
        logEvent("tengu_oauth_token_refresh_race_resolved", {}),
        "refreshed"
      );
    if (!h && !isOAuthTokenExpired(se.expiresAt)) return "not_needed";
    if (deadRefreshTokens.has(se.refreshToken)) return "known_dead_refresh_token";
    if (onHoldRefreshTokens.has(se.refreshToken)) return "account_on_hold";
    if (ee.isCompromised())
      return (
        logEvent("tengu_oauth_token_refresh_lock_compromised_pre_post", {}),
        logFeatureSad("oauth_token_refresh", "oauth_refresh_lock_compromised"),
        "lock_compromised"
      );
    (logEvent("tengu_oauth_token_refresh_starting", {}),
      (Q = Boolean((shouldUseClaudeAIAuth(se.scopes) || se.subscriptionType) && !se.clientId)));
    let Se = Q ? firstPartyRefreshScopes(se.scopes) : se.scopes,
      ae = Q && isClaudeAiScopeSet(se.scopes),
      ie;
    try {
      ie = await refreshOAuthToken(se.refreshToken, {
        scopes: Se,
        clientId: se.clientId,
        signal: ee.signal,
        invalidScopeRetried: ae,
        storageV5: w,
      });
    } catch (error) {
      if (!ae || !isInvalidScopeError(error)) throw error;
      (logEvent("tengu_oauth_refresh_invalid_scope_fallback", {}),
        (ie = await refreshOAuthToken(se.refreshToken, {
          scopes: se.scopes,
          clientId: se.clientId,
          signal: ee.signal,
          storageV5: w,
        })));
    }
    return (
      await saveRefreshedOAuthTokensRespectingLock({
        isCompromised: ee.isCompromised,
        postedRefreshToken: q,
        refreshedTokens: ie,
        credentials: S,
      }),
      "refreshed"
    );
  } catch (error) {
    if (ee.isCompromised()) {
      (logForDebugging(`OAuth refresh failed while lock compromised: ${errorMessage(error)}`, {
        level: "error",
      }),
        logEvent("tengu_oauth_token_refresh_lock_compromised_in_catch", {}),
        clearOAuthTokenCache());
      let Se = await getClaudeAIOAuthTokensAsync(S);
      if (Se && Se.accessToken !== L)
        return (
          notifyOAuthTokenReplaced(),
          logEvent("tengu_oauth_token_refresh_race_recovered", {}),
          "refreshed"
        );
      return (logFeatureSad("oauth_token_refresh", "oauth_refresh_lock_compromised"), "lock_compromised");
    }
    if (isExpectedOAuthRefreshError(error, { isDefaultFirstPartyClient: Q }))
      logForDebugging(`OAuth refresh failed (expected): ${errorMessage(error)}`, { level: "error" });
    else logError(error);
    clearOAuthTokenCache();
    let se = await getClaudeAIOAuthTokensAsync(S);
    if (se && se.accessToken !== L)
      return (
        notifyOAuthTokenReplaced(),
        logEvent("tengu_oauth_token_refresh_race_recovered", {}),
        "refreshed"
      );
    if (isInvalidGrantError(error) && q) await markRefreshTokenDeadAfterInvalidGrant(q, S);
    if (isAccountOnHoldError(error) && q)
      return (
        onHoldRefreshTokens.set(q, getAccountOnHoldErrorUrl(error)),
        logEvent("tengu_oauth_refresh_token_account_on_hold", {}),
        "account_on_hold"
      );
    return isInvalidGrantError(error) ? "known_dead_refresh_token" : "refresh_failed";
  } finally {
    try {
      logEvent("tengu_oauth_token_refresh_lock_releasing", {});
    } catch (error) {
      logForDebugging(`OAuth refresh lock-releasing event failed: ${error}`, { level: "error" });
    }
    try {
      (await ee.release(), logEvent("tengu_oauth_token_refresh_lock_released", {}));
    } catch (error) {
      logForDebugging(`OAuth refresh lock release failed: ${error}`, { level: "error" });
      try {
        logEvent("tengu_oauth_token_refresh_lock_release_error", {});
      } catch {}
    }
  }
}
//@ chunk-aepeg2w5.js:567727-567783 facade-majority
function isClaudeAISubscriber() {
  if (!isAnthropicAuthEnabled()) return !1;
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
function isUsableClaudeAILoginRecord(e) {
  return shouldUseClaudeAIAuth(e?.scopes) && !!e?.accessToken;
}
/**
 * OAuth 令牌是否带 user:profile scope（决定能否拉 /api/oauth/profile）。
 */
//@ chunk-aepeg2w5.js:567942-568015 facade-majority = hasProfileScope (1)
function hasProfileScope() {
  let e = getClaudeAIOAuthTokens()?.scopes;
  return Array.isArray(e) && e.includes(CLAUDE_AI_PROFILE_SCOPE);
}
//@ chunk-aepeg2w5.js:568015-568170 facade-majority
function mayHaveProfileScope() {
  let e = getClaudeAIOAuthTokens()?.scopes;
  if (!Array.isArray(e)) return !1;
  if (e.includes(CLAUDE_AI_PROFILE_SCOPE)) return !0;
  return (
    (!!env.CLAUDE_CODE_OAUTH_TOKEN || usableLauncherHostLoginToken() !== null) &&
    oauthScopesFromEnv() === void 0
  );
}
/**
 * 是否持有 OAuth 访问令牌。
 */
//@ chunk-aepeg2w5.js:568170-568215 facade-majority
function hasStoredOAuthToken() {
  return getClaudeAIOAuthTokens()?.accessToken != null;
}
//@ chunk-aepeg2w5.js:568215-568330 facade-majority
function hasLoginManagedKey() {
  try {
    return (
      getAnthropicApiKeyWithSource({ skipRetrievingKeyFromApiKeyHelper: !0 }).source === "/login managed key"
    );
  } catch {
    return !1;
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
    if (adminPolicyUnreadable()) return !1;
    if (checkAllowedProvider("firstParty") !== void 0) return !1;
    let e = getForcedLoginMethod();
    if (e === "gateway") return !1;
    if (getSettingsForSource("policySettings")?.forceLoginOrgUUID !== void 0) return !1;
    let { source: source } = getAuthTokenSource(),
      s = source === "claude.ai" ? getClaudeAIOAuthTokens() : null,
      h =
        !!s?.refreshToken &&
        (typeof s.refreshTokenExpiresAt !== "number" || s.refreshTokenExpiresAt > Date.now()),
      y =
        OAUTH_TOKEN_SOURCES.has(source) &&
        (source !== "claude.ai" || (s !== null && gl(s) !== !0 && (h || !isOAuthTokenExpired(s.expiresAt)))),
      S = source === "none" && hasLoginManagedKey();
    switch (e) {
      case "claudeai":
        return y;
      case "console":
        return S;
      case void 0:
        return y || S;
    }
  } catch (error) {
    return (logForDebugging(`Existing sign-in check failed: ${errorMessage(error)}`, { level: "warn" }), !1);
  }
}
//@ chunk-aepeg2w5.js:569031-569090 facade-majority
function getClaudeAIOAuthTokenFingerprint() {
  let e = getClaudeAIOAuthTokens()?.accessToken;
  return e ? computeContentHash(e) : null;
}
//@ chunk-aepeg2w5.js:569090-569144 facade-majority
function storedOAuthTokenEquals(e) {
  return e != null && getClaudeAIOAuthTokens()?.accessToken === e;
}
/**
 * OAuth 令牌 scopes 是否包含指定 scope。
 */
//@ chunk-aepeg2w5.js:569144-569217 facade-majority
function hasOAuthScope(e) {
  let n = getClaudeAIOAuthTokens()?.scopes;
  return Array.isArray(n) && n.includes(e);
}
//@ chunk-aepeg2w5.js:569217-569354 facade-majority
function canAuthenticateChromeBridge() {
  let e = getClaudeAIOAuthTokens()?.scopes;
  return (
    Array.isArray(e) &&
    (e.includes(CLAUDE_AI_PROFILE_SCOPE) || e.includes("user:office") || e.includes("user:ccr_inference"))
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
  if (!isFirstPartyProvider()) return !1;
  if (isClaudeAISubscriber()) return !1;
  return !0;
}
/**
 * 认证启用时返回全局配置 oauthAccount。
 */
//@ chunk-aepeg2w5.js:569742-569793 facade-majority = getOauthAccountInfo (1)
function getOauthAccountInfo() {
  return isAnthropicAuthEnabled() ? getGlobalConfig().oauthAccount : void 0;
}
//@ chunk-aepeg2w5.js:569793-569844 facade-majority
function getAuthenticatedAccountInfo() {
  if (!isAnthropicAuthEnabled()) return;
  return getAuthenticatedAccount() ?? void 0;
}
/**
 * 直接读全局配置 oauthAccount（不检查认证是否启用）。
 */
//@ chunk-aepeg2w5.js:569844-569883 facade-majority = getOauthAccountInfo (1)
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
/**
 * 订阅账户的 billingType 是否允许开通超额（stripe_subscription 等）。
 */
//@ chunk-aepeg2w5.js:570090-570168 facade-majority
function isOverageProvisioningAllowed() {
  let e = getOauthAccountInfo()?.billingType;
  if (!isClaudeAISubscriber() || !e) return !1;
  return isOverageProvisioningAllowed_2.has(e);
}
//@ chunk-aepeg2w5.js:570168-570261 facade-majority = isExtraUsageAllowed (1)
function isExtraUsageAllowed() {
  if (env.DISABLE_EXTRA_USAGE_COMMAND) return !1;
  if (getLspManager() !== null) return !0;
  return isOverageProvisioningAllowed();
}
//@ chunk-aepeg2w5.js:570261-570315 facade-majority
function getUsageCreditsCommand() {
  return isExtraUsageAllowed() ? artifactPathPrefix("usage-credits") : void 0;
}
/**
 * Claude.ai 账单权限：组织角色为 admin/billing/owner/primary_owner。
 */
//@ chunk-aepeg2w5.js:570315-570439 facade-majority = hasClaudeAiBillingAccess (0.864)
function hasClaudeAiBillingRole() {
  let orgRole = getGlobalConfig().oauthAccount?.organizationRole;
  return !!orgRole && ["admin", "billing", "owner", "primary_owner"].includes(orgRole);
}
//@ chunk-aepeg2w5.js:570439-570648 facade-majority
function getTurnOnUsageCreditsStep() {
  let e = getSubscriptionType();
  if (isArtifactMountMode() && (e === "team" || e === "enterprise"))
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
/**
 * 当前 Claude.ai 订阅类型（max/pro/team/enterprise…）：认证启用时取 OAuth 令牌的 subscriptionType，缺失时从 profile 推断。
 */
//@ chunk-aepeg2w5.js:570742-570864 facade-majority = getSubscriptionType (1)
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
  if (isBareModeAuthRestricted() || env.CLAUDE_CODE_OAUTH_TOKEN || vn()) return !1;
  return !(getOauthTokenFromFd() && !isOauthTokenFromBgSnapshot());
}
//@ chunk-aepeg2w5.js:571140-571372 facade-majority
function ownStoredLoginPlanAttributes() {
  if (!isAnthropicAuthEnabled()) return { subscriptionType: null, rateLimitTier: null };
  let e = getClaudeAIOAuthTokens();
  if (!e || !credentialIsOwnStoredLogin()) return { subscriptionType: null, rateLimitTier: null };
  return { subscriptionType: e.subscriptionType ?? null, rateLimitTier: e.rateLimitTier ?? null };
}
//@ chunk-aepeg2w5.js:571372-571407 facade-majority = getRequestTooLargeErrorMessage (1)
function isMaxSubscriber() {
  return getSubscriptionType() === "max";
}
//@ chunk-aepeg2w5.js:571407-571443 facade-majority = isTeamSubscriber (1)
function isTeamSubscriber() {
  return getSubscriptionType() === "team";
}
/**
 * team 订阅且 rateLimitTier 为 default_claude_max_5x。
 */
//@ chunk-aepeg2w5.js:571443-571511 facade-majority = isTeamPremiumSubscriber (1)
function isTeamPremiumSubscriber() {
  return getSubscriptionType() === "team" && getRateLimitTier() === "default_claude_max_5x";
}
/**
 * 订阅类型为 enterprise。
 */
//@ chunk-aepeg2w5.js:571511-571553 facade-majority = isEnterpriseSubscriber (1)
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
/**
 * 当前限流档位：令牌 rateLimitTier，缺失时从 profile 取。
 */
//@ chunk-aepeg2w5.js:571664-571796 facade-majority = getRateLimitTier (1)
function getRateLimitTier() {
  let oauthTokens = getRateLimitTier_2();
  if (oauthTokens !== null) return oauthTokens;
  if (!isAnthropicAuthEnabled()) return null;
  let n = getClaudeAIOAuthTokens();
  if (!n) return null;
  return n.rateLimitTier ?? getRateLimitTierFromProfile() ?? null;
}
//@ chunk-aepeg2w5.js:571796-571828 layout
var RATE_LIMIT_TIER_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-aepeg2w5.js:571828-571926 layout = getRateLimitTier (1)
function getRateLimitTierFromProfile() {
  if (!credentialIsOwnStoredLogin()) return null;
  let rateLimitTier = getBgDispatcherPlanInfo().rateLimitTier;
  return rateLimitTier !== void 0 && RATE_LIMIT_TIER_PATTERN.test(rateLimitTier) ? rateLimitTier : null;
}
//@ chunk-aepeg2w5.js:571926-571969 facade-majority
function getSeatTier() {
  return getOauthAccountInfo()?.seatTier ?? null;
}
//@ chunk-aepeg2w5.js:571969-572058 layout
function getPlanDisplayNameLabel(e) {
  let n = e?.planDisplayName;
  return n && !getStoredSubscriptionType() && credentialIsOwnStoredLogin() && isPlanDisplayName(n)
    ? `Claude ${n}`
    : null;
}
/**
 * 订阅显示名：Claude Enterprise / Claude Team / Claude Max / Claude Pro 等。
 */
//@ chunk-aepeg2w5.js:572058-572303 facade-majority = getSubscriptionName (1)
function getSubscriptionName() {
  let subscriptionType = getSubscriptionType();
  if (subscriptionType !== null) {
    let n = getPlanDisplayNameLabel(getOauthAccountInfo());
    if (n !== null) return n;
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
  if (!otelHeadersHelper) return !1;
  let projectSettings = getSettingsForSourceTightenOnly("projectSettings"),
    localSettings = getSettingsForSourceTightenOnly("localSettings");
  return (
    projectSettings?.otelHeadersHelper === otelHeadersHelper ||
    localSettings?.otelHeadersHelper === otelHeadersHelper ||
    C6e("otelHeadersHelper")
  );
}
//@ chunk-aepeg2w5.js:572643-572737 layout
class HelperCommandError extends Error {
  kind;
  exitCode;
  constructor(e, n, r) {
    super(e);
    this.kind = n;
    this.exitCode = r;
  }
}
//@ chunk-aepeg2w5.js:572737-572790 facade-majority
function otelHeadersHelperFailureKind(e) {
  return e instanceof HelperCommandError ? e.kind : void 0;
}
//@ chunk-aepeg2w5.js:572790-572931 facade-majority
var otelHeadersHelperStates = new HostScoped(() => ({
    cache: null,
    timestamp: 0,
    inflight: null,
    lastFailure: null,
    failed: createSignal(),
    prefetched: !1,
    repoHelperIgnoredLogged: !1,
  })),
  OTEL_HEADERS_HELPER_TTL_MS = 1740000;
//@ chunk-aepeg2w5.js:572931-573004 facade-majority
function getOtelHeadersHelperLastFailure() {
  if (!getConfiguredOtelHeadersHelper()) return null;
  return otelHeadersHelperStates.of(getRootSession().host).lastFailure;
}
//@ chunk-aepeg2w5.js:573004-573120 facade-majority
function clearOtelHeadersCache() {
  let of = otelHeadersHelperStates.of(getRootSession().host);
  ((of.cache = null),
    (of.timestamp = 0),
    (of.inflight = null),
    (of.lastFailure = null),
    (of.prefetched = !1));
}
//@ chunk-aepeg2w5.js:573120-573180 facade-majority
function onOtelHeadersHelperFailure(e) {
  return otelHeadersHelperStates.of(getRootSession().host).failed.subscribe(e);
}
//@ chunk-aepeg2w5.js:573180-573292 facade-majority
function prefetchOtelHeadersFromHelper() {
  if (getIsNonInteractiveSession()) return;
  let of = otelHeadersHelperStates.of(getRootSession().host);
  if (of.prefetched) return;
  ((of.prefetched = !0), getOtelHeadersFromHelper().catch(() => {}));
}
/**
 * 运行 otelHeadersHelper 生成 OTel 导出头（JSON 对象），缓存 29 分钟；项目/本地设置来源需信任，失败记录 lastFailure 并发信号。
 */
//@ chunk-aepeg2w5.js:573292-575524 facade-majority = getOtelHeadersFromHelper (0.321)
async function getOtelHeadersFromHelper() {
  let otelHeadersHelper = getConfiguredOtelHeadersHelper();
  if (!otelHeadersHelper || isDiskless()) return {};
  let n = parseNumberOrDefault(
      process.env.CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS,
      OTEL_HEADERS_HELPER_TTL_MS,
    ),
    of = otelHeadersHelperStates.of(getRootSession().host);
  if (of.cache && Date.now() - of.timestamp < n) return of.cache;
  if (of.inflight) return of.inflight;
  if (isOtelHeadersHelperFromProjectOrLocalSettings()) {
    if (!checkHasTrustDialogAccepted()) return {};
  }
  return (
    (of.inflight = (async () => {
      try {
        let trimmed = otelHeadersHelper.trim(),
          h = !1;
        try {
          let x = getProjectConfigRoot(),
            P = x === null ? trimmed : resolve_2(x, trimmed);
          h = (await stat(P)).isFile();
        } catch {}
        let y = null,
          hasTrust = getProjectConfigRoot();
        if (h)
          try {
            let x = await runManagedHelperWithoutProjectEnv("otelHeadersHelper", otelHeadersHelper, () =>
              safeExecFile(trimmed, [], {
                ...(hasTrust !== null && { cwd: hasTrust }),
                timeout: 30000,
                reject: !1,
                useToolMemoryCgroup: !1,
              }),
            );
            if (!(x.failed && !x.timedOut && typeof x.exitCode !== "number" && !x.signal)) y = x;
          } catch {}
        if (!y)
          y = await runManagedHelperWithoutProjectEnv("otelHeadersHelper", otelHeadersHelper, () =>
            safeExecShell(otelHeadersHelper, {
              ...(hasTrust !== null && { cwd: hasTrust }),
              timeout: 30000,
              reject: !1,
              useToolMemoryCgroup: !1,
            }),
          );
        if (y.failed) {
          let x, P;
          if (y.timedOut) ((x = "timed out"), (P = "timeout"));
          else if (typeof y.exitCode === "number") ((x = `exited ${y.exitCode}`), (P = "exit_code"));
          else if (y.signal) ((x = `was killed by ${y.signal}`), (P = "killed"));
          else ((x = "could not be started"), (P = "spawn_failed"));
          let result = y.stderr?.trim();
          throw new HelperCommandError(
            result ? `${x}: ${result}` : x,
            P,
            P === "exit_code" ? y.exitCode : void 0,
          );
        }
        let w = y.stdout?.toString().trim();
        if (!w)
          throw new HelperCommandError("otelHeadersHelper did not return a valid value", "empty_output");
        let R;
        try {
          R = jsonParse(w);
        } catch {
          throw new HelperCommandError("otelHeadersHelper did not return valid JSON", "invalid_json");
        }
        if (typeof R !== "object" || R === null || Array.isArray(R))
          throw new HelperCommandError(
            "otelHeadersHelper must return a JSON object with string key-value pairs",
            "not_an_object",
          );
        for (let [x, P] of Object.entries(R))
          if (typeof P !== "string")
            throw new HelperCommandError(
              `otelHeadersHelper returned non-string value for key "${x}": ${typeof P}`,
              "non_string_value",
            );
        return ((of.cache = R), (of.timestamp = Date.now()), (of.lastFailure = null), of.cache);
      } catch (error) {
        let headers = errorMessage(error),
          y = of.lastFailure === null;
        if (
          ((of.lastFailure = headers),
          logForDebugging(
            `Error getting OpenTelemetry headers from otelHeadersHelper (in settings): ${headers}`,
            { level: "error" },
          ),
          y)
        ) {
          if (getIsNonInteractiveSession())
            process.stderr.write(
              sequential.red(
                `otelHeadersHelper failed (OpenTelemetry export headers unavailable): ${headers}`,
              ) +
                `
`,
            );
          let S = error instanceof HelperCommandError ? error.kind : "unknown";
          try {
            of.failed.emit(headers);
          } catch (error) {
            logForDebugging(`otelHeadersHelper failure listener threw: ${errorMessage(error)}`, {
              level: "error",
            });
          }
          logEvent("tengu_otel_headers_helper_failed", {
            failure_kind: fromEnum(S),
            exit_code: error instanceof HelperCommandError ? error.exitCode : void 0,
          });
        }
        throw error;
      } finally {
        of.inflight = null;
      }
    })()),
    of.inflight
  );
}
/**
 * plan 为 max 或 pro。
 */
//@ chunk-aepeg2w5.js:575524-575568 facade-majority = isConsumerPlan (1)
function isConsumerPlan(plan) {
  return plan === "max" || plan === "pro";
}
//@ chunk-aepeg2w5.js:575568-575623 facade-majority
function isConsumerSubscriber() {
  let e = getSubscriptionType();
  return isClaudeAISubscriber() && e !== null && isConsumerPlan(e);
}
/**
 * /status 等显示的账户信息：tokenSource 或订阅名、apiKeySource、组织名、邮箱（仅 claude.ai 或 /login managed key 时）。第三方提供方返回 undefined。
 */
//@ chunk-aepeg2w5.js:575623-576098 facade-majority = getAccountInformation (0.951)
function getAccountInformation() {
  if (getAPIProvider() !== "firstParty") return;
  let { source: authTokenSource } = getAuthTokenSource(),
    accountInfo = {};
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
/**
 * 当前账户信息（email、organization、subscriptionType、tokenSource、apiKeySource、apiProvider），用于 initialize 响应。
 */
//@ chunk-aepeg2w5.js:576098-576283 facade-majority = AccountInfoSchema (0.477)
function toAccountInfo() {
  let e = getAccountInformation();
  return {
    email: e?.email,
    organization: e?.organization,
    subscriptionType: e?.subscription,
    tokenSource: e?.tokenSource,
    apiKeySource: e?.apiKeySource,
    apiProvider: getAPIProvider(),
  };
}
//@ chunk-aepeg2w5.js:576283-576455 facade-majority
function getApiKeyFromConfigOrMacOSKeychainAsync() {
  if (isBareModeAuthRestricted()) return Promise.resolve(null);
  let e = getApiKeyConfigCache();
  if (e.promise) return e.promise;
  let n = getManagedPrimaryApiKey();
  return (
    (e.promise = n),
    n.catch(() => {
      if (e.promise === n) e.promise = null;
    }),
    n
  );
}
//@ chunk-aepeg2w5.js:576455-576594 layout
async function getManagedPrimaryApiKey() {
  if (vn()) return null;
  let e = getGlobalConfig();
  if (!e.primaryApiKey) return null;
  return { key: e.primaryApiKey, source: "/login managed key" };
}
//@ chunk-aepeg2w5.js:576594-577686 facade-majority
async function getAnthropicApiKeyWithSourceAsync(e = {}) {
  if (isBareModeAuthRestricted()) {
    if (env.ANTHROPIC_API_KEY) return { key: env.ANTHROPIC_API_KEY, source: "ANTHROPIC_API_KEY" };
    if (getConfiguredApiKeyHelper())
      return {
        key: e.skipRetrievingKeyFromApiKeyHelper ? null : getApiKeyFromApiKeyHelperCached(),
        source: "apiKeyHelper",
      };
    return { key: null, source: "none" };
  }
  let n = isAntBuild() ? void 0 : env.ANTHROPIC_API_KEY;
  if (preferThirdPartyAuthentication() && n) return { key: n, source: "ANTHROPIC_API_KEY" };
  if (isEnvTruthy(!1)) {
    let y = getApiKeyFromFileDescriptor();
    if (y) return { key: y, source: "ANTHROPIC_API_KEY" };
    if (
      !n &&
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
    if (n) return { key: n, source: "ANTHROPIC_API_KEY" };
    return { key: null, source: "none" };
  }
  if (n && getCustomApiKeyStatus(nge(n)) === "approved") return { key: n, source: "ANTHROPIC_API_KEY" };
  let r = getApiKeyFromFileDescriptor();
  if (r) return { key: r, source: "ANTHROPIC_API_KEY" };
  if (getConfiguredApiKeyHelper()) {
    if (e.skipRetrievingKeyFromApiKeyHelper) return { key: null, source: "apiKeyHelper" };
    return { key: getApiKeyFromApiKeyHelperCached(), source: "apiKeyHelper" };
  }
  let h = await getApiKeyFromConfigOrMacOSKeychainAsync();
  if (h) return h;
  return { key: null, source: "none" };
}
//@ chunk-aepeg2w5.js:577686-577739 facade-majority
async function getAnthropicApiKeyAsync() {
  let { key: key } = await getAnthropicApiKeyWithSourceAsync();
  return key;
}
//@ chunk-aepeg2w5.js:577739-577826 facade-majority
async function getAnthropicApiKeyWithSourceAsyncSafe(e = {}) {
  try {
    return await getAnthropicApiKeyWithSourceAsync(e);
  } catch {
    return { key: null, source: "none" };
  }
}
//@ chunk-aepeg2w5.js:577826-577965 facade-majority = hasAnthropicApiKeyAuth (1)
async function hasAnthropicApiKeyAuthAsync() {
  try {
    let { key: key, source: source } = await getAnthropicApiKeyWithSourceAsync({
      skipRetrievingKeyFromApiKeyHelper: !0,
    });
    return key !== null && source !== "none";
  } catch {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:577965-578381 facade-majority
async function isAnthropicAuthEnabledAsync() {
  if (isBareModeAuthRestricted()) return !1;
  if (env.ANTHROPIC_UNIX_SOCKET) return !!env.CLAUDE_CODE_OAUTH_TOKEN;
  if (shouldUseWIFAuth()) return !1;
  let e = !isFirstPartyProvider(),
    n = getSettings_DEPRECATED() || {},
    r = isBareMode() ? getConfiguredApiKeyHelper() : warnPinnedHelper("apiKeyHelper", n.apiKeyHelper),
    s = effectiveAuthTokenEnv(),
    h;
  try {
    h = (await getAnthropicApiKeyWithSourceAsync({ skipRetrievingKeyFromApiKeyHelper: !0 })).source;
  } catch {
    return !1;
  }
  let y = h === "ANTHROPIC_API_KEY" || h === "apiKeyHelper",
    S = v$("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR"),
    w = ((s || y) && !isFirstPartyManagedOAuthContext()) || ((r || S) && !isManagedOAuthContext());
  return !(e || w);
}
/**
 * getAuthTokenSource 的异步版本（storage v5 读取令牌）。
 */
//@ chunk-aepeg2w5.js:578381-579061 facade-majority = getAuthTokenSource (0.886)
async function getAuthTokenSourceAsync(e) {
  if (isBareModeAuthRestricted()) {
    if (getConfiguredApiKeyHelper()) return { source: "apiKeyHelper", hasToken: !0 };
    return { source: "none", hasToken: !1 };
  }
  if (effectiveAuthTokenEnv() && !isFirstPartyManagedOAuthContext())
    return { source: "ANTHROPIC_AUTH_TOKEN", hasToken: !0 };
  if (env.CLAUDE_CODE_OAUTH_TOKEN || usableLauncherHostLoginToken() !== null)
    return { source: "CLAUDE_CODE_OAUTH_TOKEN", hasToken: !0 };
  if (getOAuthTokenFromFileDescriptor()) {
    if (v$("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"))
      return { source: "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR", hasToken: !0 };
    return { source: "CCR_OAUTH_TOKEN_FILE", hasToken: !0 };
  }
  if (getConfiguredApiKeyHelper() && !isManagedOAuthContext())
    return { source: "apiKeyHelper", hasToken: !0 };
  if (shouldUseWIFAuth()) return { source: "profile", hasToken: !0 };
  let s = await getClaudeAIOAuthTokensAsync(e);
  if (shouldUseClaudeAIAuth(s?.scopes) && s?.accessToken) return { source: "claude.ai", hasToken: !0 };
  return { source: "none", hasToken: !1 };
}
//@ chunk-aepeg2w5.js:579061-579141 facade-majority
async function isClaudeAISubscriberAsync(e) {
  if (!(await isAnthropicAuthEnabledAsync())) return !1;
  return shouldUseClaudeAIAuth((await getClaudeAIOAuthTokensAsync(e))?.scopes);
}
//@ chunk-aepeg2w5.js:579141-579231 facade-majority
async function hasProfileScopeAsync(e) {
  let n = (await getClaudeAIOAuthTokensAsync(e))?.scopes;
  return Array.isArray(n) && n.includes(CLAUDE_AI_PROFILE_SCOPE);
}
//@ chunk-aepeg2w5.js:579231-579305 facade-majority
async function is1PApiCustomerAsync(e) {
  if (!isFirstPartyProvider()) return !1;
  if (await isClaudeAISubscriberAsync(e)) return !1;
  return !0;
}
//@ chunk-aepeg2w5.js:579305-579370 facade-majority = getOauthAccountInfo (1)
async function getOauthAccountInfoAsync() {
  return (await isAnthropicAuthEnabledAsync()) ? getGlobalConfig().oauthAccount : void 0;
}
//@ chunk-aepeg2w5.js:579370-579472 facade-majority
async function isOverageProvisioningAllowedAsync(e) {
  let n = (await getOauthAccountInfoAsync())?.billingType;
  if (!(await isClaudeAISubscriberAsync(e)) || !n) return !1;
  return isOverageProvisioningAllowed_2.has(n);
}
//@ chunk-aepeg2w5.js:579472-579616 facade-majority = getSubscriptionType (1)
async function getSubscriptionTypeAsync(e) {
  if (getStoredSubscriptionType()) return hasSubscriptionTypeOverride();
  if (!(await isAnthropicAuthEnabledAsync())) return null;
  let n = await getClaudeAIOAuthTokensAsync(e);
  if (!n) return null;
  return n.subscriptionType ?? getSubscriptionTypeFromProfile() ?? null;
}
//@ chunk-aepeg2w5.js:579616-579725 facade-majority = hasOpusAccess (1)
async function hasOpusAccessAsync(e) {
  let n = await getSubscriptionTypeAsync(e);
  return n === "max" || n === "enterprise" || n === "team" || n === "pro" || n === null;
}
//@ chunk-aepeg2w5.js:579725-579879 facade-majority = getRateLimitTier (1)
async function getRateLimitTierAsync(e) {
  let oauthTokens = getRateLimitTier_2();
  if (oauthTokens !== null) return oauthTokens;
  if (!(await isAnthropicAuthEnabledAsync())) return null;
  let r = await getClaudeAIOAuthTokensAsync(e);
  if (!r) return null;
  return r.rateLimitTier ?? getRateLimitTierFromProfile() ?? null;
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
async function isProSubscriberAsync(e) {
  return (await getSubscriptionTypeAsync(e)) === "pro";
}
//@ chunk-aepeg2w5.js:580332-580599 facade-majority = getSubscriptionName (1)
async function getSubscriptionNameAsync(e) {
  let n = await getSubscriptionTypeAsync(e);
  if (n !== null) {
    let r = getPlanDisplayNameLabel(await getOauthAccountInfoAsync());
    if (r !== null) return r;
  }
  switch (n) {
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
  let n = await getSubscriptionTypeAsync(e);
  return (await isClaudeAISubscriberAsync(e)) && n !== null && isConsumerPlan(n);
}
/**
 * getAccountInformation 的异步版本（storage v5）。
 */
//@ chunk-aepeg2w5.js:580678-581208 facade-majority = getAccountInformation (0.951)
async function getAccountInformationAsync(e) {
  if (getAPIProvider() !== "firstParty") return;
  let { source: source } = await getAuthTokenSourceAsync(e),
    accountInfo = {};
  if (source === "CLAUDE_CODE_OAUTH_TOKEN" || source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR")
    accountInfo.tokenSource = source;
  else if (await isClaudeAISubscriberAsync(e)) accountInfo.subscription = await getSubscriptionNameAsync(e);
  else if (source !== "profile") accountInfo.tokenSource = source;
  let { key: key, source: source_2 } = await getAnthropicApiKeyWithSourceAsyncSafe();
  if (key) accountInfo.apiKeySource = source_2;
  if (source === "claude.ai" || source_2 === "/login managed key") {
    let orgName = (await getOauthAccountInfoAsync())?.organizationName;
    if (orgName) accountInfo.organization = orgName;
  }
  let email = (await getOauthAccountInfoAsync())?.emailAddress;
  if ((source === "claude.ai" || source_2 === "/login managed key") && email) accountInfo.email = email;
  return accountInfo;
}
//@ chunk-aepeg2w5.js:581208-581544 facade-majority
async function providerAllowlistRefusal(e) {
  let n = Ef();
  if (n !== void 0)
    return { valid: !1, reason: "managed_settings_invalid", policyUnreadable: !0, message: n };
  await recheckAllowedProviderEndpoint(e);
  let r = checkAllowedProvider(e);
  if (r === void 0) return;
  return (
    await logFeatureBadAsync("auth_force_login_org", "provider_not_allowed", {
      api_provider: fromEnum(r.refused[0].provider),
    }),
    { valid: !1, reason: "provider_not_allowed", message: r.message }
  );
}
//@ chunk-aepeg2w5.js:581544-581630 layout = hasAnthropicApiKeyAuth (1)
WS(() =>
  shouldUseWIFAuth() &&
  getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 }).source === "none"
    ? getWIFProfileBaseUrl()
    : void 0,
);
//@ chunk-aepeg2w5.js:581630-583044 layout
function buildForceLoginConflictMessage({ orgPinned: orgPinned }) {
  let n = describeActiveCredential(),
    joined = n.fixes.join("; also "),
    s = getAPIProvider(),
    h = s !== "firstParty" && s !== "gateway" ? THIRD_PARTY_PROVIDER_LABELS[s] : void 0;
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
  let y = getSettingsForSource("policySettings")?.forceLoginMethod,
    S = orgPinned
      ? "pin Anthropic sign-ins to your organization (forceLoginOrgUUID)"
      : y === "claudeai" || y === "console"
        ? "require a claude.ai or Console sign-in (forceLoginMethod)"
        : "set a sign-in method (forceLoginMethod)",
    w = s === "firstParty" ? configuredApiProxyHost() : void 0,
    R = `This machine's managed settings require a first-party login: they ${S}, and this session is configured with ${n.what}, which cannot be checked against that policy${h ? ` \u2014 even alongside ${h}` : ""}${w ? ` (requests go through ${w}, per ANTHROPIC_BASE_URL)` : ""}.`,
    x = n.complete
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
  let n = getSettingsFilePathForSource(e);
  return n === void 0 ? "your settings" : stripControlChars(n).replace(/[\t\n\r]+/g, " ");
}
//@ chunk-aepeg2w5.js:583137-583405 layout
function findEnvSettingSource(e, n) {
  if (getSettingsForSource("policySettings")?.env?.[e] === n) return { managed: !0 };
  for (let r of ["flagSettings", "localSettings", "projectSettings", "userSettings"])
    if (getSettingsForSource(r)?.env?.[e] === n)
      return {
        managed: !1,
        file:
          r === "flagSettings" && getFlagSettingsInline() !== null
            ? "your --settings value"
            : describeSettingsSourcePath(r),
      };
  return;
}
//@ chunk-aepeg2w5.js:583405-583891 layout
function describeEnvCredential(e, n, r) {
  let s = findEnvSettingSource(e, n);
  if (s === void 0)
    return { what: `${r} from ${e}`, fix: `unset ${e} (or run in a shell without it)`, complete: !1 };
  if (s.managed)
    return {
      what: `${r} from ${e}, set by your organization's managed settings`,
      fix: `ask your administrator (managed settings set both env.${e} and a sign-in policy; that credential cannot satisfy it)`,
      complete: !0,
    };
  return {
    what: `${r} from ${e}, set in the env block of ${s.file}`,
    fix: `remove ${e} from the env block of ${s.file}`,
    complete: !1,
  };
}
//@ chunk-aepeg2w5.js:583891-585825 layout
function describeActiveCredential() {
  let e = [],
    n = {
      what: "a credential supplied by the host application that launched Claude Code",
      fix: "sign in inside that application, or run claude from a terminal and sign in there",
      complete: !0,
    },
    r =
      getHostAuthEnvVar({ CLAUDE_CODE_HOST_AUTH_ENV_VAR: env.CLAUDE_CODE_HOST_AUTH_ENV_VAR }) ??
      (env.CLAUDE_CODE_ENTRYPOINT === "claude-desktop-3p" ? "any" : void 0),
    { key: key, source: source } = getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: !0,
    });
  if (env.ANTHROPIC_API_KEY && key === env.ANTHROPIC_API_KEY)
    e.push(
      r === "ANTHROPIC_API_KEY" || r === "any"
        ? n
        : describeEnvCredential("ANTHROPIC_API_KEY", env.ANTHROPIC_API_KEY, "an API key"),
    );
  else if (source === "ANTHROPIC_API_KEY" || v$("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR")) e.push(n);
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
      complete: !1,
    });
  if (getConfiguredApiKeyHelper()) {
    let w = isBareMode() ? "flagSettings" : getEffectiveSettingSource_2("apiKeyHelper");
    if (w === "policySettings")
      e.push({
        what: "an API key from the apiKeyHelper your organization's managed settings configure",
        fix: "ask your administrator (managed settings set both apiKeyHelper and a sign-in policy; a helper key cannot satisfy it)",
        complete: !0,
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
        complete: !1,
      });
    }
  }
  let y = new Set(),
    S = [];
  for (let w of e) if (!y.has(w.fix)) (y.add(w.fix), S.push(w));
  if (S.length === 0)
    return r !== void 0
      ? { what: n.what, fixes: [n.fix], complete: !0 }
      : isBareModeAuthRestricted()
        ? {
            what: "no sign-in at all (--bare turns first-party sign-in off)",
            fixes: ["run claude without --bare and sign in"],
            complete: !0,
          }
        : {
            what: "no usable Anthropic sign-in or credential",
            fixes: ["sign in with: claude auth login"],
            complete: !0,
          };
  return { what: S[0].what, fixes: S.map((w) => w.fix), complete: S.every((w) => w.complete) };
}
/**
 * 是否存在 OAuth 以外的凭证（API key、ANTHROPIC_AUTH_TOKEN、key FD、网关令牌、apiKeyHelper），或第一方但未启用 Anthropic 认证。
 */
//@ chunk-aepeg2w5.js:585825-585984 layout
function hasNonOAuthCredential() {
  if (
    hasAnthropicApiKeyAuth() ||
    !!env.ANTHROPIC_AUTH_TOKEN ||
    v$("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR") ||
    !!getGatewayTokenFromFileDescriptor() ||
    !!getConfiguredApiKeyHelper()
  )
    return !0;
  return getAPIProvider() === "firstParty" && !shouldUseWIFAuth() && !isAnthropicAuthEnabled();
}
//@ chunk-aepeg2w5.js:585984-586082 layout
var UNREADABLE_POLICY_ERRNOS = ["EACCES", "EPERM", "EBUSY", "EIO", "EISDIR", "ELOOP"],
  regExp_30 = new RegExp(`\\b(${UNREADABLE_POLICY_ERRNOS.join("|")})\\b`);
/**
 * 见 AD：托管设置组织 pin 校验。
 */
//@ chunk-aepeg2w5.js:586082-588528 facade-majority = validateForceLoginOrg (0.287)
async function validateForceLoginOrg(e, n, r) {
  let s = getSettingsForSource("policySettings"),
    requiredOrgUuid = s?.forceLoginOrgUUID,
    y = requiredOrgUuid !== void 0 || s?.forceLoginMethod !== void 0;
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
  let R = getForceLoginOrgRequirement(requiredOrgUuid, r !== void 0);
  if (R.kind === "host_managed") {
    if (y) logFeatureSad("auth_force_login_org", "managed_by_host_under_pin");
    return { valid: !0 };
  }
  if (R.kind === "unix_socket") {
    let Q = {
      api_provider: fromEnum(getAPIProvider()),
      auth_token_source: fromEnum(getAuthTokenSource().source),
    };
    if (!isAnthropicAuthEnabled() && y) logFeatureSad("auth_force_login_org", "unix_socket_3p_under_pin", Q);
    else if (isAnthropicAuthEnabled() && requiredOrgUuid !== void 0)
      logFeatureSad("auth_force_login_org", "unix_socket_ssh_under_pin", Q);
    else if (adminPolicyLoadFailureRefusesLaunch())
      logFeatureSad("auth_force_login_org", "unix_socket_unreadable_policy", Q);
    else logFeatureOk("auth_force_login_org");
    return { valid: !0 };
  }
  if (R.kind === "auth_disabled") {
    if (y && hasNonOAuthCredential())
      return {
        valid: !1,
        reason: "org_pin_api_key_conflict",
        message: buildForceLoginConflictMessage({ orgPinned: requiredOrgUuid !== void 0 }),
      };
    return { valid: !0 };
  }
  if (R.kind === "no_pin") return { valid: !0 };
  if (R.kind === "empty_pin")
    return { valid: !1, reason: "managed_settings_invalid", message: EMPTY_FORCE_LOGIN_ORG_MESSAGE };
  let { requiredOrgUuids: requiredOrgUuids } = R,
    P = formatRequiredOrgs(requiredOrgUuids),
    F;
  if (r !== void 0) F = isUsingOAuth(r.accessToken);
  else (await checkAndRefreshOAuthTokenIfNeeded({ credentials: e }), (F = getClaudeAIOAuthTokens()));
  if (!F) return { valid: !0 };
  let { source: source } = getAuthTokenSource(),
    G = source === "CLAUDE_CODE_OAUTH_TOKEN" || source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
    j = r === void 0 && F.accessToken === usableLauncherHostLoginToken(),
    envVarName = j ? launcherHostLoginIdentity() : null,
    q;
  if (r !== void 0) q = r.organizationUuid;
  else if (n?.accessToken === F.accessToken) q = n.organizationUuid;
  else if (envVarName !== null)
    q = ((await envVarName) ?? (await askLauncherHostLoginIdentityAgain()))?.organizationUuid;
  else q = (await validateOauthToken(F.accessToken))?.organization_uuid;
  if (q === void 0)
    return { valid: !1, reason: "org_verify_failed", message: orgVerificationFailedMessage(P) };
  if (requiredOrgUuids.includes(q)) return { valid: !0 };
  if (r !== void 0 || j)
    return {
      valid: !1,
      reason: "org_pin_mismatch",
      message: `The sign-in the desktop app provided belongs to a different
organization than required by this machine's managed settings.

Required: ${P}
Token organization: ${q}

Sign in to the desktop app with a permitted organization.`,
    };
  if (G)
    return {
      valid: !1,
      reason: "org_pin_mismatch",
      message: `The ${source === "CLAUDE_CODE_OAUTH_TOKEN" ? "CLAUDE_CODE_OAUTH_TOKEN" : "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"} environment variable provides a token for a
different organization than required by this machine's managed settings.

Required: ${P}
Token organization: ${q}

Remove the environment variable or obtain a token for a permitted organization.`,
    };
  return { valid: !1, reason: "org_pin_mismatch", message: formatWrongOrgMessage(q, P) };
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
  let n = e.errorClass === "unreadable",
    match = e.message.match(regExp_30),
    found = UNREADABLE_POLICY_ERRNOS.find((S) => S === match?.[1]),
    h = n ? (fromEnumOpt(found) ?? lit("other")) : lit("malformed");
  return (
    await logFeatureBadAsync("auth_force_login_org", "policy_unreadable_fail_close", { errno: h }),
    {
      valid: !1,
      reason: "managed_settings_invalid",
      policyUnreadable: !0,
      message: `Unable to read managed policy settings.
This machine may require organization login enforcement, but the policy file failed to load.
Contact your administrator.

Detail: ${e.file ? `${ql(e.file)}: ${e.message}` : e.message}`,
    }
  );
}
//@ chunk-aepeg2w5.js:589274-589378 layout
function formatRequiredOrgs(e) {
  return e.length === 1 ? `organization ${e[0]}` : `one of these organizations: ${e.join(", ")}`;
}
//@ chunk-aepeg2w5.js:589378-589555 layout
function formatWrongOrgMessage(e, n) {
  return `Your authentication token belongs to organization ${e},
but this machine requires ${n}.

Please log in with a permitted organization: claude auth login`;
}
/**
 * 计算组织 pin 要求：host_managed / unix_socket / auth_disabled / no_pin / empty_pin / required（列出允许的组织 UUID）。
 */
//@ chunk-aepeg2w5.js:589555-589861 layout
function getForceLoginOrgRequirement(e, n) {
  if (isHostManagedProviderAuth() && !n && usableLauncherHostLoginToken() === null)
    return { kind: "host_managed" };
  if (env.ANTHROPIC_UNIX_SOCKET) return { kind: "unix_socket" };
  if (!isAnthropicAuthEnabled()) return { kind: "auth_disabled" };
  if (e === void 0) return { kind: "no_pin" };
  let r = typeof e === "string" ? [e] : e;
  return r.length === 0 ? { kind: "empty_pin" } : { kind: "required", requiredOrgUuids: r };
}
//@ chunk-aepeg2w5.js:589861-589879 layout
var oW = [500, 1500];
//@ chunk-aepeg2w5.js:589879-590413 facade-majority
async function resolveLoginOrgPin(e) {
  let n = await checkForceLoginPolicyReadable();
  if (n) return { outcome: "refused", rejection: n };
  let r = getSettingsForSource("policySettings")?.forceLoginOrgUUID;
  if (r === void 0) return { outcome: "not_checked" };
  if (!shouldUseClaudeAIAuth([...e])) return { outcome: "not_checked" };
  let s = getForceLoginOrgRequirement(r, !1);
  switch (s.kind) {
    case "host_managed":
    case "unix_socket":
    case "auth_disabled":
    case "no_pin":
      return { outcome: "not_checked" };
    case "empty_pin":
      return {
        outcome: "refused",
        rejection: { valid: !1, reason: "managed_settings_invalid", message: EMPTY_FORCE_LOGIN_ORG_MESSAGE },
      };
    case "required":
      return { outcome: "required", requiredOrgUuids: s.requiredOrgUuids };
  }
}
//@ chunk-aepeg2w5.js:590413-590892 facade-majority
async function checkNewLoginTokenOrg(e) {
  let n = await resolveLoginOrgPin(e.scopes);
  if (n.outcome !== "required") return n;
  let { requiredOrgUuids: requiredOrgUuids } = n,
    s = formatRequiredOrgs(requiredOrgUuids),
    y = (await validateOauthToken(e.accessToken, oW))?.organization_uuid;
  if (typeof y !== "string" || y === "")
    return {
      outcome: "refused",
      rejection: { valid: !1, reason: "org_verify_failed", message: orgVerificationFailedMessage(s) },
    };
  if (!requiredOrgUuids.includes(y))
    return {
      outcome: "refused",
      rejection: { valid: !1, reason: "org_pin_mismatch", message: formatWrongOrgMessage(y, s) },
    };
  return { outcome: "permitted", verified: { accessToken: e.accessToken, organizationUuid: y } };
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
  let e = getInitialSettings_2()?.forceLoginMethod;
  return e === "gateway" ? void 0 : e;
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
function validateForceLoginMethod(e) {
  if (isHostManagedProviderAuth() && usableLauncherHostLoginToken() === null) {
    if (getForcedLoginMethod() !== void 0)
      logFeatureSad("auth_force_login_org", "managed_by_host_under_method_pin");
    return { valid: !0 };
  }
  return checkForcedLoginMethod(e);
}
//@ chunk-aepeg2w5.js:591461-591519 facade-majority
function launcherSignInMethodRefusal() {
  let e = checkForcedLoginMethod(!0);
  return e.valid ? null : e.message;
}
/**
 * 校验登录方式是否符合 forceLoginMethod：网关登录要求在交互终端 /login；claudeai/console 不符时给出应改用的账号类型（区分托管设置或普通设置）。
 */
//@ chunk-aepeg2w5.js:591519-592092 affinity
function checkForcedLoginMethod(isClaudeAi) {
  let forced = getForcedLoginMethod();
  if (forced === void 0) return { valid: !0 };
  if (forced === "gateway")
    return {
      valid: !1,
      message:
        "Managed settings on this machine configure a Cloud gateway sign-in; run /login from an interactive terminal to authenticate.",
    };
  if (isClaudeAi === (forced === "claudeai")) return { valid: !0 };
  let r =
    getEffectiveSettingSource_2("forceLoginMethod") === "policySettings" ? "managed settings" : "settings";
  return {
    valid: !1,
    message:
      forced === "claudeai"
        ? `forceLoginMethod is 'claudeai' in ${r}; log in with a Claude.ai subscription account instead.`
        : `forceLoginMethod is 'console' in ${r}; log in with an Anthropic Console account instead.`,
  };
}
//@ chunk-aepeg2w5.js:592092-592116 affinity
class vm extends Error {}
//@ chunk-171dhyhe.js:50416-50428 affinity
var ve = 5000;
//@ chunk-171dhyhe.js:50428-50760 fingerprint = handleOAuth401ErrorImpl (0.484)
async function handleOAuth401ErrorImpl_2(e, t, c) {
  let n;
  if (isStorageV5Enabled() && c !== void 0) n = await getClaudeAIOAuthTokensAsync(c);
  else n = getClaudeAIOAuthTokens();
  if (e === n?.accessToken && Boolean(n?.refreshToken)) {
    if ((await Promise.race([handleOAuth401Error(e, c).catch(() => !1), sleep(ve, t)]), t.aborted))
      return null;
  }
  let winner = await Promise.race([XFt(c).catch(() => null), sleep(ve, t).then(() => null)]);
  return winner?.ok === !0 && winner.accessToken !== e ? winner.accessToken : null;
}
/**
 * 凭证文件名常量：.credentials.json（明文 OAuth 凭证）与 .device-keys.json（设备密钥）。
 */
//@ chunk-cdz6g143.js:407-459 fingerprint = invalidateOAuthCacheIfDiskChanged (0.513)
var CREDENTIALS_FILE_NAME = ".credentials.json",
  DEVICE_KEYS_FILE_NAME = ".device-keys.json";
/**
 * 设备密钥文件路径 `~/.claude/.device-keys.json`（NFC 规范化）。与 markdown 配置无关，旧版名 getProjectDirsUpToHome 配错。
 */
//@ chunk-cdz6g143.js:459-519 placement = getProjectDirsUpToHome (1)
function getDeviceKeysFilePath() {
  return join(homedir(), ".claude", DEVICE_KEYS_FILE_NAME).normalize("NFC");
}
//@ chunk-e6aww6q8.js:2297152-2297165 affinity
var Uur = 1000;
/**
 * 按 key 合并并发的 401 处理，结果缓存（LRU 1000）避免同一令牌重复刷新。
 */
//@ chunk-e6aww6q8.js:2297165-2297458 fingerprint = handleOAuth401Error (0.67)
class OAuth401Deduper {
  #e = new Dc({ max: Uur });
  #t = new Map();
  run(e, n) {
    let r = this.#e.get(e);
    if (r !== void 0) return Promise.resolve(r);
    let s = this.#t.get(e);
    if (s !== void 0) return s;
    let h = n()
      .then((y) => {
        if (typeof y === "number" && y > 0) this.#e.set(e, y);
        return y;
      })
      .finally(() => {
        this.#t.delete(e);
      });
    return (this.#t.set(e, h), h);
  }
}
/**
 * 判断主机策略是否强制使用网关登录（强制登录方式为 gateway 或指定了网关地址）。
 */
//@ chunk-30p0tvt0.js:818-918 placement
function isGatewayLoginForced() {
  let { forceLoginMethod: forceLoginMethod, forceLoginGatewayUrl: forceLoginGatewayUrl } =
    getHostPolicyLoginPins();
  return forceLoginMethod === "gateway" || forceLoginGatewayUrl !== void 0;
}
//@ chunk-3g8vhh6f.js:809-824 fingerprint = isTeamSubscriber (1)
var isTeamSubscriber_2 = "team";
//@ chunk-4pc1m5n9.js:13047-13220 fingerprint = hasAnthropicApiKeyAuth (1)
async function hasAnthropicApiKeyAuth_2(e) {
  let n = getGatewayAuth();
  if (n)
    return computeChecksumFromSettings(
      n,
      await Ge(n, e).catch(() => {
        return;
      }),
    );
  if (
    getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 }).key === null &&
    isProfileRemoteSettingsCredential()
  )
    return getEmail();
  return yt(e);
}
//@ chunk-4xpk3fhh.js:18749-18830 fingerprint = hasOpusAccess (1)
function hasOpusAccess_2(e) {
  return e === "team" || e === "enterprise" || e === "pro" || e === "max" || e == null;
}
//@ chunk-71c4j971.js:14757-14813 fingerprint = getOauthAccountInfo (1)
function getOauthAccountInfo_2() {
  try {
    return getGlobalConfig().oauthAccount;
  } catch {
    return;
  }
}
/**
 * 统计文本的长度与行数（\n、\r、\r\n 都算换行）。
 */
//@ chunk-dcmhvw5a.js:352457-352629 placement
function textLengthAndLines(e) {
  let n = 1;
  for (let r = 0; r < e.length; r++) {
    let code = e.charCodeAt(r);
    if (code === 10) n++;
    else if (code === 13) {
      if ((n++, e.charCodeAt(r + 1) === 10)) r++;
    }
  }
  return { length: ou(e), lineCount: n };
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
  OAuth401Deduper,
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
