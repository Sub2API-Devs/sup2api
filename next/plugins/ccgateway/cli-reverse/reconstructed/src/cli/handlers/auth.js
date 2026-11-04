/**
 * cli/handlers/auth.ts
 *
 * 并入已有模块：claude auth logout：清除登录凭据，失败时写 stderr 并以 1 退出，成功时打印已登出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/handlers/auth.ts
 * pieces: chunk-84jf153s.js (11), chunk-th8w37yz.js (4), chunk-zbtr7f5k.js (1)
 * attribution: sole-consumer 4, affinity 1, fingerprint 3, layout 3, placement 5
 */
import { createInterface } from "readline";
import { resolve } from "path";
import { saveGlobalConfig, clearClientDataSeed } from "../../utils/config.js";
import {
  setResolvedOrgDefault,
  getRootSession,
  setAuthenticatedAccount,
  getGatewayAuth,
} from "../../bootstrap/state.js";
import {
  clearOAuthTokenMemos,
  getOauthAccountInfo,
  sameOwnerAccount,
  getAuthenticatedAccountInfo,
  getClaudeAIOAuthTokenOriginAsync,
  getForcedLoginMethod,
  providerAllowlistRefusal,
  resolveLoginOrgPin,
  getStoredOauthAccountInfo,
  checkNewLoginTokenOrg,
  validateForceLoginOrg,
  getAuthTokenSource,
  getAnthropicApiKeyWithSourceSafe,
  getRequestCredentials,
  isOAuthBearerSource,
  getSubscriptionType,
  isUsing3PServices,
} from "../../utils/auth.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { invalidatePlainTextStoreCopy } from "../../utils/secureStorage/plainTextStorage.js";
import { clearTrustedDeviceTokenCache } from "../../bridge/trustedDevice.js";
import { getProviderState } from "../../utils/model/providerCaches.js";
import { clearBetasCaches } from "../../utils/betas.js";
import { resetEntitlementDenies } from "../../utils/model/sessionModelRestriction.js";
import { deactivateServedCatalog } from "../../utils/model/modelCatalog/catalogEntries.js";
import { invalidateToolDescriptions } from "../../services/api/toolDescriptionCache.js";
import { replaceFileReferenceHintLatch } from "../../services/api/fileReferenceCalls.js";
import { clearGzipBlockStore } from "../../services/api/gzipRequestBody.js";
import { streamFallbackWarning } from "../../services/api/streamFallbackWarning.js";
import { clearOrgMemoryCredential } from "../../services/orgMemory/credential.js";
import { resetMemoryContextForSession } from "../../services/accountMemory/memoryContext.js";
import { clearMeIdCache } from "../../services/artifacts/artifactDb.js";
import { resetLiveStateOnAccountChange } from "../../services/liveReplica/liveReplica.js";
import { clearServedCapabilities } from "../../services/artifacts/capabilityDeclaration.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { removeSyncedSkillHooksFor } from "../../utils/claudeAiSync/skillsSync.js";
import { removeDelistedSkillHooksNow } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { GITHUB_CONNECTION_STATUS_CACHE } from "../../commands/remote-setup/api.js";
import { resetUserData, refreshGrowthBookAfterAuthChange } from "../../services/analytics/growthbook.js";
import { invalidateUserContext } from "../../context.js";
import { getGroveNoticeConfig, updateGroveSettings_2 } from "../../services/api/grove.js";
import { clearRemoteManagedSettingsCache } from "../../services/remoteManagedSettings/loader.js";
import { clearPolicyLimitsCache } from "../../services/policyLimits/PolicyLimitsClient.js";
import { clearMetricsEnabledCache } from "../../services/api/metricsOptOut.js";
import {
  resetGraceState,
  resetNearLimitWrapUpState,
  resetCurrentLimits,
} from "../../services/claudeAiLimits.js";
import { cancelQuotaAutoResume } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { endLowPriority, clearBudgetSpent } from "../../services/lowPriority/lowPriorityMode.js";
import { performLogout } from "../../commands/logout/logout.js";
import { setHostSessionsBearerSource } from "../../utils/hostSessionsBearer.js";
import { getOauthProfileFromOauthToken } from "../../services/oauth/getOauthProfile.js";
import {
  storeOAuthAccountInfo,
  refreshOAuthToken,
  restoreOAuthAccountAfterRefusedRefresh,
  fetchProfileInfo,
  subscriptionTypeForOrganizationType,
  shouldUseClaudeAIAuth,
  isVerificationOrMintRefusal,
} from "../../services/oauth/client.js";
import { planDisplayNameFromProfile } from "../../services/oauth/validateOauthToken.js";
import { logAuthEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";
import { sendOrgValidationRefusal } from "../managedConfigRefusal.js";
import {
  logFeatureBadAsync,
  logFeatureOkAsync,
  logFeatureOk,
} from "../../services/analytics/featureTelemetry.js";
import { flushAnalyticsSinks } from "../../services/analytics/flushSinks.js";
import { drainRegisteredWriteQueues } from "../../utils/settings/writeQueues.js";
import { settlePendingGateWork } from "../../services/policyLimits/orgConfigGate.js";
import {
  getForcedGatewayLogin,
  getUserSettingsGateway,
} from "../../services/gateway/gatewayCredentialStore.js";
import { isSpawnedByClaudeCodeSession } from "../../utils/claudeSubprocessEnv.js";
import { markPrintModeSignalHandlersRegistered } from "../../utils/gracefulShutdown.js";
import { writeStdoutAndDrain, exitAfterAnalyticsFlush } from "../exit.js";
import { getInitialSettings_2, getSettingsForSource } from "../../utils/settings/settings.js";
import { declareNoConsentSurface } from "../../services/remoteManagedSettings/securityCheck.js";
import { createRoot } from "../../ink/hooks/useTerminalHooks.js";
import { getBaseRenderOptions } from "../../utils/renderOptions.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import { LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS, CLAUDE_AI_PROFILE_SCOPE } from "../../constants/oauth.js";
import {
  revokeRefusedSignInToken,
  checkLoginAllowed,
  needsProfileVerification,
  loginSettingsOutcome,
  saveLoginOrWarn,
  LOGIN_REFUSAL_REASONS,
  rollbackFailureText,
} from "../../services/oauth/refusedSignIn.js";
import { isExpectedApiError, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { getSSLErrorHint } from "../../services/api/errorUtils.js";
import { OAuthService } from "../../services/oauth/index.js";
import {
  MANUAL_CODE_HINT,
  PASTE_CODE_PROMPT,
  AuthCodeRefusedError,
  CallbackListenerUnavailableError,
} from "../../services/oauth/auth-code-listener.js";
import { createHyperlink } from "../../utils/hyperlink.js";
import {
  isOAuthCallbackError,
  formatAccountOnHoldSignInError,
  isClaudeAiOrigin,
  OAuthCallbackError,
} from "../../services/oauth/oauthErrors.js";
import { managedSettingsUrl, MANAGED_SETTINGS_NOTICE } from "../../components/ManagedSettingsNotice.js";
import { markManagedSettingsNoticeSeen } from "../../services/remoteManagedSettings/loginNotice.js";
import { getClaudeConfigDir, isAntBuild } from "../../utils/envUtils.js";
import { getProjectsDir } from "../../utils/sessionStoragePortable.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import {
  probeRefreshTokenDead,
  moveAntOnlyToEnd,
  buildAccountProperties,
  buildAPIProviderProperties,
  statusValueRows,
} from "../../utils/status.js";
import { Text } from "../../ink/components/Text.js";
import { isFirstPartyTelemetryBlocked } from "../../utils/hostEnvironment.js";
import { getAllowedProviders } from "../../utils/model/allowedProviders.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { RenderOnceAndExit } from "../../utils/staticRender.js";
import { waitForOAuthRefreshBeforeExit } from "../../utils/auth/oauthRefreshExitWait.js";

//@ chunk-th8w37yz.js:1472-1483 placement
var NO_CONSOLE_LOGIN = null;
//@ chunk-th8w37yz.js:1483-2126 placement
function clearOAuthAccountFields(config) {
  config.oauthAccount = undefined;
  config.managedSettingsNoticeSeenOrg = undefined;
  config.additionalModelOptionsCache = undefined;
  config.additionalModelOptionsAnsweredAt = undefined;
  config.additionalModelCostsCache = undefined;
  config.modelAccessCache = undefined;
  config.orgModelDefaultCache = undefined;
  config.cachedArtifactRoster = undefined;
  config.artifactRosterDenied = undefined;
  config.lastSeenOrgDefaultUpdatedAt = undefined;
  config.clientDataCache = undefined;
  config.clientDataCacheSlots = undefined;
  config.autoCompactWindowsCache = undefined;
  config.cachedUsageUtilization = undefined;
  config.metricsStatusCache = undefined;
  config.metricsStatusCacheByPrincipal = undefined;
  config.githubWebConnectionStatusCache = undefined;
  config.unusedLimitResetStatusCache = undefined;
  config.startupPrefetchedAt = undefined;
  return config;
}
//@ chunk-th8w37yz.js:2126-2187 placement
async function clearAccountScopedConfig(storageV5) {
  await saveGlobalConfig(
    (config) =>
      clearOAuthAccountFields({
        ...config,
      }),
    storageV5,
  );
  setResolvedOrgDefault(undefined);
}
//@ chunk-th8w37yz.js:4565-5345 placement
async function clearAuthRelatedCaches(
  storageV5,
  { preserveQuotaAutoResume = false, artifactAccount = "signed_out", incomingIdentity, credentials } = {},
) {
  clearOAuthTokenMemos();
  if (isStorageV5Enabled() && credentials === undefined) invalidatePlainTextStoreCopy();
  clearTrustedDeviceTokenCache();
  clearClientDataSeed();
  getProviderState().providerCache.clientDataFetches.clear();
  clearBetasCaches();
  getProviderState().providerCache.modelConfigs.clear();
  getProviderState().providerCache.validatedModels.clear();
  resetEntitlementDenies();
  deactivateServedCatalog();
  invalidateToolDescriptions();
  replaceFileReferenceHintLatch(null);
  clearGzipBlockStore(streamFallbackWarning().gzipRequestBody.blockStore);
  clearOrgMemoryCredential();
  let rootSession = getRootSession();
  resetMemoryContextForSession(rootSession.host);
  NO_CONSOLE_LOGIN?.forgetClaudeCodeKeyHeard();
  NO_CONSOLE_LOGIN?.recordServerAccountMemoryWord(undefined);
  clearMeIdCache(rootSession.host);
  resetLiveStateOnAccountChange(artifactAccount, incomingIdentity);
  if (artifactAccount !== "same_account") {
    clearServedCapabilities(rootSession);
    if (!(isBgSession() && artifactAccount === "signed_out")) {
      removeSyncedSkillHooksFor("account_change");
      removeDelistedSkillHooksNow("account_change");
    }
  }
  GITHUB_CONNECTION_STATUS_CACHE.of(rootSession.host).clear();
  resetUserData();
  invalidateUserContext(rootSession, "account_change");
  refreshGrowthBookAfterAuthChange();
  getGroveNoticeConfig.cache?.clear?.();
  updateGroveSettings_2.cache?.clear?.();
  await clearRemoteManagedSettingsCache(storageV5);
  await clearPolicyLimitsCache();
  clearMetricsEnabledCache();
  resetGraceState();
  resetNearLimitWrapUpState();
  if (!preserveQuotaAutoResume) {
    cancelQuotaAutoResume("account_switch");
    endLowPriority("account_switch");
    clearBudgetSpent();
  }
  resetCurrentLimits();
}
//@ chunk-zbtr7f5k.js:3736-5302 fingerprint (2.1.88 match: installOAuthTokens, 0.505)
/**
 * installOAuthTokens：保存 OAuth 令牌并更新账户/组织信息，区分同账号刷新与切换账号。
 */
async function installOAuthTokens(login, { storageV5, credentials }) {
  let oauthAccountInfo = getOauthAccountInfo();
  let account = {
    accountUuid: login.profile?.account?.uuid ?? login.tokenAccount?.uuid,
    organizationUuid: login.profile?.organization?.uuid ?? login.tokenAccount?.organizationUuid,
  };
  let isSameAsStored = sameOwnerAccount(oauthAccountInfo, account);
  let isSameAsAuthenticated = sameOwnerAccount(getAuthenticatedAccountInfo(), account);
  let claudeAIOAuthTokenOrigin = await getClaudeAIOAuthTokenOriginAsync(credentials);
  let artifactAccount =
    isSameAsAuthenticated &&
    (claudeAIOAuthTokenOrigin === "env" ||
      claudeAIOAuthTokenOrigin === "fd" ||
      (claudeAIOAuthTokenOrigin === "store" && isSameAsStored))
      ? "same_account"
      : "account_switch";
  await performLogout({
    clearOnboarding: false,
    preserveInProcessTokens: true,
    preserveNonAnthropicAuth: true,
    storageV5,
    preserveQuotaAutoResume: isSameAsStored,
    artifactAccount,
    incomingIdentity: account,
    credentials,
  });
  setAuthenticatedAccount(null);
  setHostSessionsBearerSource(null);
  let profile = login.profile ?? (await getOauthProfileFromOauthToken(login.accessToken));
  if (profile?.account && profile.organization)
    storeOAuthAccountInfo(
      {
        accountUuid: profile.account.uuid,
        emailAddress: profile.account.email,
        organizationUuid: profile.organization.uuid,
        displayName: profile.account.display_name || undefined,
        fullName: profile.account.full_name || undefined,
        hasExtraUsageEnabled: profile.organization.has_extra_usage_enabled ?? undefined,
        billingType: profile.organization.billing_type ?? undefined,
        subscriptionCreatedAt: profile.organization.subscription_created_at ?? undefined,
        accountCreatedAt: profile.account.created_at,
        ccOnboardingFlags: profile.organization.cc_onboarding_flags ?? {},
        claudeCodeTrialEndsAt: profile.organization.claude_code_trial_ends_at ?? null,
        claudeCodeTrialDurationDays: profile.organization.claude_code_trial_duration_days ?? null,
        seatTier: profile.organization.seat_tier ?? null,
        planDisplayName: planDisplayNameFromProfile(profile),
        profileFetchedAt: Date.now(),
      },
      storageV5,
    );
  else if (login.tokenAccount)
    storeOAuthAccountInfo(
      {
        accountUuid: login.tokenAccount.uuid,
        emailAddress: login.tokenAccount.emailAddress,
        organizationUuid: login.tokenAccount.organizationUuid,
      },
      storageV5,
    );
  logAuthEvent({
    action: "login",
    success: true,
    authMethod: "oauth",
  });
  return {
    preserveQuotaAutoResume: isSameAsStored,
    artifactAccount,
    incomingIdentity: account,
  };
}
//@ chunk-84jf153s.js:14816-15055 sole-consumer
async function exitLoginRefusedByPolicy(rejection) {
  process.stderr.write(
    rejection.message +
      `
`,
  );
  await sendOrgValidationRefusal(rejection);
  await logFeatureBadAsync(
    "cli_auth_login",
    rejection.reason === "provider_not_allowed"
      ? "cli_auth_login_provider_not_allowed"
      : "cli_auth_login_org_not_allowed",
  );
  await flushAnalyticsSinks();
  await drainRegisteredWriteQueues();
  process.exit(1);
}
//@ chunk-84jf153s.js:15055-15220 sole-consumer
function subscriptionTypeFields(subscriptionType, isVerified) {
  if (subscriptionType === null)
    return {
      subscriptionType: null,
    };
  return {
    subscriptionType,
    subscriptionTypeSource: "profile",
    ...(isVerified && {
      subscriptionTypeVerifiedAt: Date.now(),
    }),
  };
}
//@ chunk-84jf153s.js:15220-15359 sole-consumer
var REFRESH_TOKEN_SPENT_MESSAGE =
  "The refresh token in CLAUDE_CODE_OAUTH_REFRESH_TOKEN was used for this attempt and cannot be used again; issue a new one to retry.";
//@ chunk-84jf153s.js:15359-15520 sole-consumer
async function exitLoginOrgConfigRefused(message) {
  process.stderr.write(
    message +
      `
`,
  );
  await logFeatureBadAsync("cli_auth_login", "cli_auth_login_org_config_refused");
  await settlePendingGateWork();
  await flushAnalyticsSinks();
  await drainRegisteredWriteQueues();
  process.exit(1);
}
//@ chunk-84jf153s.js:15520-15691 affinity
function warnOrgCheckDeferred(message) {
  process.stderr.write(`${message}
The sign-in was saved but could not be checked against your organization yet; Claude Code checks it again when it next starts.
`);
}
//@ chunk-84jf153s.js:15691-23088 fingerprint (2.1.88 match: authLogin, 0.367)
/**
 * claude auth login：--console/--claudeai/--sso/--email/--gateway-json 互斥检查，执行 OAuth 登录（或云网关登录），安装令牌、校验组织策略。
 */
async function authLogin({ email, sso, console: isConsole, claudeai, gatewayJson }, storage, credentials) {
  if (isConsole && claudeai) {
    process.stderr.write(`Error: --console and --claudeai cannot be used together.
`);
    process.exit(1);
  }
  let hasExplicitMethod = isConsole || claudeai || sso || email !== undefined;
  if (gatewayJson) {
    if (hasExplicitMethod) {
      process.stderr
        .write(`Error: --gateway-json cannot be used together with --console, --claudeai, --sso, or --email.
`);
      process.exit(1);
    }
    {
      let forcedGatewayLogin = getForcedGatewayLogin(getUserSettingsGateway());
      if (forcedGatewayLogin !== undefined) {
        if (process.stdin.isTTY) {
          process.stderr
            .write(`This command is run by the VS Code extension, not by hand. To sign in from a terminal, run /login in Claude Code.
`);
          process.exit(1);
        }
        if (isSpawnedByClaudeCodeSession()) {
          process.stderr
            .write(`Cloud gateway sign-in needs a person to answer its questions, so it cannot run inside a Claude Code session. Sign in from the Claude Code panel in VS Code, or run /login in Claude Code.
`);
          process.exit(1);
        }
        let abortController = new AbortController();
        process.on("SIGTERM", () => abortController.abort());
        process.on("SIGINT", () => abortController.abort());
        markPrintModeSignalHandlersRegistered();
        let { runGatewayJsonLogin } = await import("../../components/runGatewayJsonLogin.lazy.js");
        let exitCode = await runGatewayJsonLogin({
          gateway: forcedGatewayLogin,
          stdin: process.stdin,
          write: (text) =>
            writeStdoutAndDrain(
              text +
                `
`,
            ),
          signal: abortController.signal,
          credentials,
        });
        return exitAfterAnalyticsFlush(exitCode ? 0 : 1);
      }
    }
    process.stderr
      .write(`Cloud gateway sign-in isn't available with this machine's settings. If your organization manages this machine's settings, a gateway in your own settings file isn't used.
`);
    process.exit(1);
  }
  let settings = getInitialSettings_2();
  let forcedLoginMethod = getForcedLoginMethod();
  if (forcedLoginMethod === "gateway") {
    declareNoConsentSurface();
    if (process.stdin.isTTY && process.stdout.isTTY && !hasExplicitMethod) {
      let [{ Login }, { AppRoot }] = await Promise.all([
        import("../../services/oauth/postLoginHooks.js"),
        import("../../components/AppRoot.js"),
      ]);
      let root = await createRoot(getBaseRenderOptions(false));
      let gatewayAuth = getGatewayAuth();
      let winner = await Promise.race([
        new Promise((resolve) => {
          root.render(
            jsxProd_default(AppRoot, {
              storageV5: storage,
              children: jsxProd_default(Login, {
                onDone: resolve,
              }),
            }),
          );
        }),
        root
          .waitUntilExit()
          .catch(logError)
          .then(() => {
            return;
          }),
      ]);
      root.unmount();
      let gatewayAuth_2 = getGatewayAuth();
      let isLoggedIn = winner ?? (gatewayAuth_2 !== null && gatewayAuth_2 !== gatewayAuth);
      if (isLoggedIn)
        process.stdout.write(`Login successful.
`);
      else
        process.stderr.write(`Login interrupted.
`);
      await drainRegisteredWriteQueues();
      process.exit(isLoggedIn ? 0 : 1);
    }
    process.stderr
      .write(`Managed settings on this machine configure a Cloud gateway sign-in; run interactive /login to authenticate.
`);
    process.exit(1);
  }
  let loginWithClaudeAi = forcedLoginMethod ? forcedLoginMethod === "claudeai" : !isConsole;
  let envRefreshToken = process.env.CLAUDE_CODE_OAUTH_REFRESH_TOKEN;
  let providerRefusal = (await providerAllowlistRefusal("firstParty")) ?? (await providerAllowlistRefusal());
  if (providerRefusal) {
    process.stderr.write(
      providerRefusal.message +
        `
`,
    );
    await flushAnalyticsSinks();
    process.exit(1);
  }
  let isMethodForced =
    settings.forceLoginMethod !== undefined &&
    loginWithClaudeAi !== (settings.forceLoginMethod === "claudeai");
  let orgUUID =
    typeof settings.forceLoginOrgUUID === "string" && !isMethodForced
      ? settings.forceLoginOrgUUID
      : undefined;
  if (envRefreshToken) {
    let envScopes = process.env.CLAUDE_CODE_OAUTH_SCOPES;
    if (!envScopes) {
      process.stderr.write(`CLAUDE_CODE_OAUTH_SCOPES is required when using CLAUDE_CODE_OAUTH_REFRESH_TOKEN.
Set it to the space-separated scopes the refresh token was issued with
(e.g. "user:inference" or "user:profile user:inference user:sessions:claude_code user:mcp_servers").
`);
      process.exit(1);
    }
    let scopes = envScopes.split(/\s+/).filter(Boolean);
    try {
      logEvent("tengu_login_from_refresh_token", {});
      let loginOrgPin = await resolveLoginOrgPin(scopes);
      if (loginOrgPin.outcome === "refused") await exitLoginRefusedByPolicy(loginOrgPin.rejection);
      let storedOauthAccountInfo = getStoredOauthAccountInfo();
      let tokens = await refreshOAuthToken(envRefreshToken, {
        scopes,
        expiresIn: LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS,
        clientId: process.env.CLAUDE_CODE_OAUTH_CLIENT_ID || undefined,
        storageV5: storage,
      });
      let orgCheck = await checkNewLoginTokenOrg(tokens);
      if (orgCheck.outcome === "refused") {
        if (storedOauthAccountInfo)
          await restoreOAuthAccountAfterRefusedRefresh(storedOauthAccountInfo, storage);
        let revokeNote = await revokeRefusedSignInToken(tokens);
        await exitLoginRefusedByPolicy({
          ...orgCheck.rejection,
          message: `${orgCheck.rejection.message}
${revokeNote}

${REFRESH_TOKEN_SPENT_MESSAGE}`,
        });
      }
      let profileResult =
        tokens.profile !== undefined
          ? {
              profile: tokens.profile,
              stamped: tokens.profileOriginStamped === true,
            }
          : tokens.scopes.includes(CLAUDE_AI_PROFILE_SCOPE)
            ? await fetchProfileInfo(tokens.accessToken).then((profileInfo) => ({
                profile: profileInfo.rawProfile,
                stamped: profileInfo.originStamped === true,
              }))
            : undefined;
      let { subscriptionTypeSource, subscriptionTypeVerifiedAt, profileOriginStamped, ...tokenFields } =
        tokens;
      let newLogin = {
        ...tokenFields,
        ...(profileResult?.profile !== undefined && {
          profile: profileResult.profile,
        }),
        ...subscriptionTypeFields(
          subscriptionTypeForOrganizationType(profileResult?.profile?.organization.organization_type),
          profileResult?.stamped === true,
        ),
        rateLimitTier: profileResult?.profile?.organization.rate_limit_tier ?? null,
      };
      let gateCheck = await checkLoginAllowed({
        accessToken: newLogin.accessToken,
        startupGateFollows: true,
        newLogin,
        untieredLogin: needsProfileVerification(newLogin),
        organizationName: profileResult?.profile?.organization.name,
      });
      if (!gateCheck.ok && loginSettingsOutcome(gateCheck.evaluation) === "refused") {
        if (storedOauthAccountInfo)
          await restoreOAuthAccountAfterRefusedRefresh(storedOauthAccountInfo, storage);
        let revokeNote = await revokeRefusedSignInToken(newLogin);
        await exitLoginOrgConfigRefused(`${gateCheck.message} ${revokeNote}

${REFRESH_TOKEN_SPENT_MESSAGE}`);
      }
      let saved = await saveLoginOrWarn(newLogin, {
        storageV5: storage,
        credentials,
      });
      let orgValidation = await validateForceLoginOrg(
        credentials,
        orgCheck.outcome === "permitted" ? orgCheck.verified : undefined,
      );
      if (!orgValidation.valid) {
        let refusal = await LOGIN_REFUSAL_REASONS(orgValidation, saved?.storage, {
          storageV5: storage,
          credentials,
        });
        if (refusal?.restored === false)
          process.stderr.write(
            rollbackFailureText(refusal) +
              `
`,
          );
        await exitLoginRefusedByPolicy(orgValidation);
      }
      if (!gateCheck.ok) warnOrgCheckDeferred(gateCheck.message);
      else if (gateCheck.warning !== undefined)
        process.stderr.write(`${gateCheck.warning}
`);
      await saveGlobalConfig((current) => {
        if (current.hasCompletedOnboarding) return current;
        return {
          ...current,
          hasCompletedOnboarding: true,
        };
      }, storage);
      logEvent("tengu_oauth_success", {
        loginWithClaudeAi: shouldUseClaudeAIAuth(newLogin.scopes),
      });
      process.stdout.write(`Login successful.
`);
      await offerPostLoginTips(storage);
      await logFeatureOkAsync("cli_auth_login");
      await flushAnalyticsSinks();
      process.exit(0);
    } catch (err) {
      if (isExpectedApiError(err, isVerificationOrMintRefusal))
        logForDebugging(`Login from refresh token failed: ${errorMessage(err)}`, {
          level: "error",
        });
      else logError(err);
      let sslHint = getSSLErrorHint(err);
      process.stderr.write(`Login failed: ${errorMessage(err)}
${
  sslHint
    ? sslHint +
      `
`
    : ""
}`);
      await logFeatureBadAsync("cli_auth_login", "cli_auth_login_refresh_token_failed");
      await flushAnalyticsSinks();
      await drainRegisteredWriteQueues();
      process.exit(1);
    }
  }
  let loginMethod = sso ? "sso" : undefined;
  let oauthService = new OAuthService();
  let lineReader = createInterface({
    input: process.stdin,
  });
  lineReader.on("line", (line) => {
    let [authorizationCode, state] = line.trim().split("#");
    if (!authorizationCode || !state) {
      process.stderr.write(`Invalid code. Please make sure the full code was copied.
`);
      return;
    }
    logEvent("tengu_oauth_manual_entry", {});
    oauthService.handleManualAuthCodeInput({
      authorizationCode,
      state,
    });
  });
  let isManualPaste = false;
  let isReaderClosed = false;
  let promise = new Promise((resolve, reject) => {
    lineReader.once("close", () => {
      isReaderClosed = true;
      if (isManualPaste) reject(new PasteInputClosedError());
    });
  });
  let onStdinData = (data) => {
    if (isManualPaste && String(data).includes("\x04")) lineReader.close();
  };
  process.stdin.on("data", onStdinData);
  try {
    logEvent("tengu_oauth_flow_start", {
      loginWithClaudeAi,
    });
    let settingsOnlyGrant;
    let startFlowArgs = [
      async (url) => {
        if (isManualPaste) {
          if (isReaderClosed) throw new PasteInputClosedError();
          process.stdout.write(`${MANUAL_CODE_HINT}
`);
          process.stdout.write(`Sign in at: ${createHyperlink(url, undefined, {
            assumeSupport: true,
          })}
`);
          process.stdout.write(PASTE_CODE_PROMPT);
          return;
        }
        process.stdout.write(`Opening browser to sign in\u2026
`);
        process.stdout.write(`If the browser didn't open, visit: ${createHyperlink(url, undefined, {
          assumeSupport: true,
        })}
`);
        process.stdout.write("Paste code here if prompted > ");
      },
      {
        loginWithClaudeAi,
        loginHint: email,
        loginMethod,
        orgUUID,
        ...(process.stdin.isTTY && {
          onCallbackListenerUnavailable: () => {
            isManualPaste = true;
          },
        }),
        settingsOnlyGrant,
      },
    ];
    let flow;
    flow ??= oauthService.startOAuthFlow(...startFlowArgs);
    let winner = await Promise.race([flow, promise]);
    let orgCheck = await checkNewLoginTokenOrg(winner);
    if (orgCheck.outcome === "refused") {
      let revokeNote = await revokeRefusedSignInToken(winner);
      await exitLoginRefusedByPolicy({
        ...orgCheck.rejection,
        message: `${orgCheck.rejection.message}
${revokeNote}`,
      });
    }
    let gateCheck = await checkLoginAllowed({
      accessToken: winner.accessToken,
      startupGateFollows: true,
      newLogin: winner,
      untieredLogin: needsProfileVerification(winner),
      organizationName: winner.profile?.organization.name ?? winner.tokenAccount?.organizationName,
    });
    if (!gateCheck.ok && loginSettingsOutcome(gateCheck.evaluation) === "refused") {
      let revokeNote = await revokeRefusedSignInToken(winner);
      await exitLoginOrgConfigRefused(`${gateCheck.message} ${revokeNote}`);
    }
    let saved = await saveLoginOrWarn(winner, {
      storageV5: storage,
      credentials,
    });
    let orgValidation = await validateForceLoginOrg(
      credentials,
      orgCheck.outcome === "permitted" ? orgCheck.verified : undefined,
    );
    if (!orgValidation.valid) {
      let refusal = await LOGIN_REFUSAL_REASONS(orgValidation, saved?.storage, {
        storageV5: storage,
        credentials,
      });
      if (refusal?.restored === false)
        process.stderr.write(
          rollbackFailureText(refusal) +
            `
`,
        );
      await exitLoginRefusedByPolicy(orgValidation);
    }
    if (!gateCheck.ok) warnOrgCheckDeferred(gateCheck.message);
    else if (gateCheck.warning !== undefined)
      process.stderr.write(`${gateCheck.warning}
`);
    logEvent("tengu_oauth_success", {
      loginWithClaudeAi,
    });
    process.stdout.write(`Login successful.
`);
    await offerPostLoginTips(storage);
    await logFeatureOkAsync("cli_auth_login");
    await flushAnalyticsSinks();
    await drainRegisteredWriteQueues();
    process.exit(0);
  } catch (err) {
    if (isOAuthCallbackError(err)) {
      process.stdout.write(`
`);
      process.stderr.write(`${formatAccountOnHoldSignInError(isClaudeAiOrigin(err.errorUri))}
`);
      await logFeatureBadAsync("cli_auth_login", "cli_auth_login_oauth_flow_failed");
      await flushAnalyticsSinks();
      await drainRegisteredWriteQueues();
      process.exit(1);
    }
    if (
      err instanceof AuthCodeRefusedError ||
      isExpectedApiError(err, isVerificationOrMintRefusal) ||
      err instanceof OAuthCallbackError ||
      err instanceof CallbackListenerUnavailableError ||
      err instanceof PasteInputClosedError
    )
      logForDebugging(`OAuth login failed: ${errorMessage(err)}`, {
        level: "error",
      });
    else logError(err);
    let sslHint = getSSLErrorHint(err);
    let displayMessage = err instanceof OAuthCallbackError ? err.displayMessage : errorMessage(err);
    let debugHint =
      err instanceof CallbackListenerUnavailableError ? " Run with --debug for the underlying error." : "";
    if (isVerificationOrMintRefusal(err) || err instanceof PasteInputClosedError)
      process.stdout.write(`
`);
    process.stderr.write(`Login failed: ${displayMessage}${debugHint}
${
  sslHint
    ? sslHint +
      `
`
    : ""
}`);
    await logFeatureBadAsync("cli_auth_login", "cli_auth_login_oauth_flow_failed");
    await flushAnalyticsSinks();
    await drainRegisteredWriteQueues();
    process.exit(err instanceof PasteInputClosedError ? 130 : 1);
  } finally {
    process.stdin.off("data", onStdinData);
    lineReader.close();
    oauthService.cleanup();
  }
}
//@ chunk-84jf153s.js:23088-23246 layout
class PasteInputClosedError extends Error {
  constructor() {
    super("Input ended before a code was pasted. Sign in again and paste the code shown.");
    this.name = "PasteInputClosedError";
  }
}
//@ chunk-84jf153s.js:23246-23388 layout
async function offerPostLoginTips(storage) {
  if (!process.stdout.isTTY) return;
  let url = managedSettingsUrl();
  if (url === undefined) return;
  process.stdout.write(`${MANAGED_SETTINGS_NOTICE}
`);
  await markManagedSettingsNoticeSeen(url, "auth_cli", storage);
}
//@ chunk-84jf153s.js:23388-23601 layout
function getConfigHomeIfNotOverridden() {
  let configDir = resolve(getClaudeConfigDir());
  for (let sourceName of ["projectSettings", "localSettings"]) {
    let env = getSettingsForSource(sourceName)?.env ?? {};
    for (let [key, value] of Object.entries(env))
      if (key === "CLAUDE_CONFIG_DIR" && typeof value === "string" && resolve(value) !== configDir)
        return null;
  }
  return getProjectsDir();
}
//@ chunk-84jf153s.js:23601-25349 fingerprint (2.1.88 match: authStatus, 0.719)
/**
 * claude auth status：汇总令牌来源、API key 来源、提供方与账户信息，--json（默认）或 --text 输出。
 */
async function authStatus(root, options, storage) {
  let { source: authTokenSource, hasToken } = getAuthTokenSource();
  let { source: apiKeySource } = getAnthropicApiKeyWithSourceSafe();
  let hasApiKeyEnvVar = !!process.env.ANTHROPIC_API_KEY && !isAntBuild();
  let { tokenSource } = getRequestCredentials(authTokenSource, apiKeySource);
  let staleBearerHint = isOAuthBearerSource(authTokenSource) && tokenSource === "none";
  let oauthAccount = getOauthAccountInfo();
  let subscriptionType = getSubscriptionType();
  let using3P = isUsing3PServices();
  let isGatewayWithoutAuth = getAPIProvider() === "gateway" && !getGatewayAuth();
  let loggedIn = !isGatewayWithoutAuth && (hasToken || apiKeySource !== "none" || hasApiKeyEnvVar || using3P);
  let authMethod = "none";
  if (using3P) authMethod = isGatewayWithoutAuth ? "none" : "third_party";
  else if (tokenSource === "claude.ai") authMethod = "claude.ai";
  else if (tokenSource === "apiKeyHelper") authMethod = "api_key_helper";
  else if (tokenSource !== "none") authMethod = "oauth_token";
  else if (apiKeySource === "ANTHROPIC_API_KEY" || hasApiKeyEnvVar || apiKeySource === "/login managed key")
    authMethod = "api_key";
  else if (apiKeySource === "apiKeyHelper" && staleBearerHint) authMethod = "api_key_helper";
  let unusedProbe = null;
  let unusedRecovery = false;
  let summaryText;
  if (options.text) {
    let deadProbe = probeRefreshTokenDead(storage);
    let deadResult = deadProbe === undefined ? undefined : await deadProbe;
    let properties = moveAntOnlyToEnd([
      [...buildAccountProperties(deadResult), ...buildAPIProviderProperties()],
    ]).flat();
    let mapped = statusValueRows(properties).map((row) =>
      row.label ? `${row.label}: ${row.value}` : row.value,
    );
    if (mapped.length === 0 && hasApiKeyEnvVar) mapped.push("API key: ANTHROPIC_API_KEY");
    if (!loggedIn)
      mapped.push(
        isGatewayWithoutAuth
          ? "Not logged in. This session uses a Cloud gateway; start `claude` and sign in with /login."
          : "Not logged in. Run claude auth login to authenticate.",
      );
    summaryText = jsxProd_default(Text, {
      children: mapped.join(`
`),
    });
  } else {
    let apiProvider = getAPIProvider();
    let apiKeyHint = apiKeySource !== "none" ? apiKeySource : hasApiKeyEnvVar ? "ANTHROPIC_API_KEY" : null;
    let status = {
      loggedIn,
      authMethod,
      apiProvider,
      analyticsDisabled: isFirstPartyTelemetryBlocked(),
      projectsDirectory: getConfigHomeIfNotOverridden(),
      configDirectory: getClaudeConfigDir(),
    };
    let apiProvider_2 = getForcedLoginMethod();
    if (apiProvider_2) status.forcedLoginMethod = apiProvider_2;
    if (getForcedGatewayLogin(getUserSettingsGateway()) !== undefined) status.gatewaySignInOffered = true;
    let allowedProviders = getAllowedProviders();
    if (allowedProviders !== undefined) status.allowedProviders = [...allowedProviders];
    if (apiKeyHint) status.apiKeySource = apiKeyHint;
    let accountInfo =
      authMethod === "api_key" && apiKeySource === "/login managed key" ? oauthAccount : undefined;
    if (authMethod === "claude.ai") {
      status.email = oauthAccount?.emailAddress ?? null;
      status.orgId = oauthAccount?.organizationUuid ?? null;
      status.orgName = oauthAccount?.organizationName ?? null;
      status.subscriptionType = subscriptionType ?? null;
    } else if (accountInfo) {
      status.email = accountInfo.emailAddress ?? null;
      status.orgId = accountInfo.organizationUuid ?? null;
      status.orgName = accountInfo.organizationName ?? null;
    } else if (apiProvider === "gateway") status.email = getGatewayAuth()?.email ?? null;
    summaryText = jsxProd_default(Text, {
      children: jsonStringify(status, null, 2),
    });
  }
  logFeatureOk("cli_auth_status");
  root.render(
    jsxProd_default(RenderOnceAndExit, {
      children: summaryText,
    }),
  );
  await root.waitUntilExit();
  await waitForOAuthRefreshBeforeExit();
  process.exit(loggedIn ? 0 : 1);
}
//@ chunk-84jf153s.js:25349-25728 placement
/**
 * claude auth logout：清除登录凭据，失败时写 stderr 并以 1 退出，成功时打印已登出。
 */
async function authLogout(root, storageV5, credentials) {
  try {
    await performLogout({
      clearOnboarding: false,
      storageV5,
      credentials,
    });
  } catch (error) {
    logError(error);
    process.stderr.write(`Logout failed: ${errorMessage(error)}
`);
    await logFeatureBadAsync("cli_auth_logout", "cli_auth_logout_failed");
    await flushAnalyticsSinks();
    process.exit(1);
  }
  root.render(
    jsxProd_default(RenderOnceAndExit, {
      children: jsxProd_default(Text, {
        children: "Successfully logged out from your Anthropic account.",
      }),
    }),
  );
  await root.waitUntilExit();
  await logFeatureOkAsync("cli_auth_logout");
}
export {
  clearAuthRelatedCaches,
  clearOAuthAccountFields,
  installOAuthTokens,
  clearAccountScopedConfig,
  authLogin,
  authLogout,
  authStatus,
};
