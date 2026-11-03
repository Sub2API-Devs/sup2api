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
import {
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
  getOauthAccountInfo,
  getSubscriptionType,
  isUsing3PServices,
  clearOAuthTokenMemos,
  sameOwnerAccount,
  getAuthenticatedAccountInfo,
  getClaudeAIOAuthTokenOriginAsync,
} from "../../utils/auth.js";
import { declareNoConsentSurface } from "../../services/remoteManagedSettings/securityCheck.js";
import { createRoot } from "../../ink/hooks/useTerminalHooks.js";
import { getBaseRenderOptions } from "../../utils/renderOptions.js";
import {
  getGatewayAuth,
  setResolvedOrgDefault,
  getRootSession,
  setAuthenticatedAccount,
} from "../../bootstrap/state.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  refreshOAuthToken,
  restoreOAuthAccountAfterRefusedRefresh,
  fetchProfileInfo,
  subscriptionTypeForOrganizationType,
  shouldUseClaudeAIAuth,
  isVerificationOrMintRefusal,
  storeOAuthAccountInfo,
} from "../../services/oauth/client.js";
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
import { saveGlobalConfig, clearClientDataSeed } from "../../utils/config.js";
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
import { performLogout } from "../../commands/logout/logout.js";
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
import { setHostSessionsBearerSource } from "../../utils/hostSessionsBearer.js";
import { getOauthProfileFromOauthToken } from "../../services/oauth/getOauthProfile.js";
import { planDisplayNameFromProfile } from "../../services/oauth/validateOauthToken.js";
import { logAuthEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";

//@ chunk-84jf153s.js:14816-15055 sole-consumer
async function exitLoginRefusedByPolicy(o) {
  process.stderr.write(
    o.message +
      `
`,
  );
  await sendOrgValidationRefusal(o);
  await logFeatureBadAsync(
    "cli_auth_login",
    o.reason === "provider_not_allowed"
      ? "cli_auth_login_provider_not_allowed"
      : "cli_auth_login_org_not_allowed",
  );
  await flushAnalyticsSinks();
  await drainRegisteredWriteQueues();
  process.exit(1);
}
//@ chunk-84jf153s.js:15055-15220 sole-consumer
function subscriptionTypeFields(o, h) {
  if (o === null)
    return {
      subscriptionType: null,
    };
  return {
    subscriptionType: o,
    subscriptionTypeSource: "profile",
    ...(h && {
      subscriptionTypeVerifiedAt: Date.now(),
    }),
  };
}
//@ chunk-84jf153s.js:15220-15359 sole-consumer
var REFRESH_TOKEN_SPENT_MESSAGE =
  "The refresh token in CLAUDE_CODE_OAUTH_REFRESH_TOKEN was used for this attempt and cannot be used again; issue a new one to retry.";
//@ chunk-84jf153s.js:15359-15520 sole-consumer
async function exitLoginOrgConfigRefused(o) {
  process.stderr.write(
    o +
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
//@ chunk-84jf153s.js:15691-23088 fingerprint = authLogin (0.367)
/**
 * claude auth login：--console/--claudeai/--sso/--email/--gateway-json 互斥检查，执行 OAuth 登录（或云网关登录），安装令牌、校验组织策略。
 */
async function authLogin({ email, sso, console: v, claudeai, gatewayJson }, c, O) {
  if (v && claudeai) {
    process.stderr.write(`Error: --console and --claudeai cannot be used together.
`);
    process.exit(1);
  }
  let k = v || claudeai || sso || email !== undefined;
  if (gatewayJson) {
    if (k) {
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
        let { runGatewayJsonLogin } = await import("./chunk-gy23bf9p.js");
        let r = await runGatewayJsonLogin({
          gateway: forcedGatewayLogin,
          stdin: process.stdin,
          write: (p) =>
            writeStdoutAndDrain(
              p +
                `
`,
            ),
          signal: abortController.signal,
          credentials: O,
        });
        return exitAfterAnalyticsFlush(r ? 0 : 1);
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
    if (process.stdin.isTTY && process.stdout.isTTY && !k) {
      let [{ Login }, { AppRoot }] = await Promise.all([
        import("./chunk-whwtfsqf.js"),
        import("./chunk-f6d8289b.js"),
      ]);
      let root = await createRoot(getBaseRenderOptions(false));
      let gatewayAuth = getGatewayAuth();
      let winner = await Promise.race([
        new Promise((resolve) => {
          root.render(
            jsxProd_default(AppRoot, {
              storageV5: c,
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
      let b = winner ?? (gatewayAuth_2 !== null && gatewayAuth_2 !== gatewayAuth);
      if (b)
        process.stdout.write(`Login successful.
`);
      else
        process.stderr.write(`Login interrupted.
`);
      await drainRegisteredWriteQueues();
      process.exit(b ? 0 : 1);
    }
    process.stderr
      .write(`Managed settings on this machine configure a Cloud gateway sign-in; run interactive /login to authenticate.
`);
    process.exit(1);
  }
  let D = forcedLoginMethod ? forcedLoginMethod === "claudeai" : !v;
  let envRefreshToken = process.env.CLAUDE_CODE_OAUTH_REFRESH_TOKEN;
  let x = (await providerAllowlistRefusal("firstParty")) ?? (await providerAllowlistRefusal());
  if (x) {
    process.stderr.write(
      x.message +
        `
`,
    );
    await flushAnalyticsSinks();
    process.exit(1);
  }
  let S = settings.forceLoginMethod !== undefined && D !== (settings.forceLoginMethod === "claudeai");
  let orgUUID = typeof settings.forceLoginOrgUUID === "string" && !S ? settings.forceLoginOrgUUID : undefined;
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
        storageV5: c,
      });
      let m = await checkNewLoginTokenOrg(tokens);
      if (m.outcome === "refused") {
        if (storedOauthAccountInfo) await restoreOAuthAccountAfterRefusedRefresh(storedOauthAccountInfo, c);
        let y = await revokeRefusedSignInToken(tokens);
        await exitLoginRefusedByPolicy({
          ...m.rejection,
          message: `${m.rejection.message}
${y}

${REFRESH_TOKEN_SPENT_MESSAGE}`,
        });
      }
      let b =
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
      let { subscriptionTypeSource, subscriptionTypeVerifiedAt, profileOriginStamped, ...ee } = tokens;
      let F = {
        ...ee,
        ...(b?.profile !== undefined && {
          profile: b.profile,
        }),
        ...subscriptionTypeFields(
          subscriptionTypeForOrganizationType(b?.profile?.organization.organization_type),
          b?.stamped === true,
        ),
        rateLimitTier: b?.profile?.organization.rate_limit_tier ?? null,
      };
      let H = await checkLoginAllowed({
        accessToken: F.accessToken,
        startupGateFollows: true,
        newLogin: F,
        untieredLogin: needsProfileVerification(F),
        organizationName: b?.profile?.organization.name,
      });
      if (!H.ok && loginSettingsOutcome(H.evaluation) === "refused") {
        if (storedOauthAccountInfo) await restoreOAuthAccountAfterRefusedRefresh(storedOauthAccountInfo, c);
        let y = await revokeRefusedSignInToken(F);
        await exitLoginOrgConfigRefused(`${H.message} ${y}

${REFRESH_TOKEN_SPENT_MESSAGE}`);
      }
      let ie = await saveLoginOrWarn(F, {
        storageV5: c,
        credentials: O,
      });
      let Y = await validateForceLoginOrg(O, m.outcome === "permitted" ? m.verified : undefined);
      if (!Y.valid) {
        let y = await LOGIN_REFUSAL_REASONS(Y, ie?.storage, {
          storageV5: c,
          credentials: O,
        });
        if (y?.restored === false)
          process.stderr.write(
            rollbackFailureText(y) +
              `
`,
          );
        await exitLoginRefusedByPolicy(Y);
      }
      if (!H.ok) warnOrgCheckDeferred(H.message);
      else if (H.warning !== undefined)
        process.stderr.write(`${H.warning}
`);
      await saveGlobalConfig((current) => {
        if (current.hasCompletedOnboarding) return current;
        return {
          ...current,
          hasCompletedOnboarding: true,
        };
      }, c);
      logEvent("tengu_oauth_success", {
        loginWithClaudeAi: shouldUseClaudeAIAuth(F.scopes),
      });
      process.stdout.write(`Login successful.
`);
      await offerPostLoginTips(c);
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
  let A = createInterface({
    input: process.stdin,
  });
  A.on("line", (i) => {
    let [f, s] = i.trim().split("#");
    if (!f || !s) {
      process.stderr.write(`Invalid code. Please make sure the full code was copied.
`);
      return;
    }
    logEvent("tengu_oauth_manual_entry", {});
    oauthService.handleManualAuthCodeInput({
      authorizationCode: f,
      state: s,
    });
  });
  let C = false;
  let u = false;
  let promise = new Promise((resolve, reject) => {
    A.once("close", () => {
      u = true;
      if (C) reject(new PasteInputClosedError());
    });
  });
  let I = (i) => {
    if (C && String(i).includes("\x04")) A.close();
  };
  process.stdin.on("data", I);
  try {
    logEvent("tengu_oauth_flow_start", {
      loginWithClaudeAi: D,
    });
    let settingsOnlyGrant;
    let f = [
      async (url) => {
        if (C) {
          if (u) throw new PasteInputClosedError();
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
        loginWithClaudeAi: D,
        loginHint: email,
        loginMethod,
        orgUUID,
        ...(process.stdin.isTTY && {
          onCallbackListenerUnavailable: () => {
            C = true;
          },
        }),
        settingsOnlyGrant,
      },
    ];
    let s;
    s ??= oauthService.startOAuthFlow(...f);
    let winner = await Promise.race([s, promise]);
    let p = await checkNewLoginTokenOrg(winner);
    if (p.outcome === "refused") {
      let w = await revokeRefusedSignInToken(winner);
      await exitLoginRefusedByPolicy({
        ...p.rejection,
        message: `${p.rejection.message}
${w}`,
      });
    }
    let m = await checkLoginAllowed({
      accessToken: winner.accessToken,
      startupGateFollows: true,
      newLogin: winner,
      untieredLogin: needsProfileVerification(winner),
      organizationName: winner.profile?.organization.name ?? winner.tokenAccount?.organizationName,
    });
    if (!m.ok && loginSettingsOutcome(m.evaluation) === "refused") {
      let w = await revokeRefusedSignInToken(winner);
      await exitLoginOrgConfigRefused(`${m.message} ${w}`);
    }
    let b = await saveLoginOrWarn(winner, {
      storageV5: c,
      credentials: O,
    });
    let G = await validateForceLoginOrg(O, p.outcome === "permitted" ? p.verified : undefined);
    if (!G.valid) {
      let w = await LOGIN_REFUSAL_REASONS(G, b?.storage, {
        storageV5: c,
        credentials: O,
      });
      if (w?.restored === false)
        process.stderr.write(
          rollbackFailureText(w) +
            `
`,
        );
      await exitLoginRefusedByPolicy(G);
    }
    if (!m.ok) warnOrgCheckDeferred(m.message);
    else if (m.warning !== undefined)
      process.stderr.write(`${m.warning}
`);
    logEvent("tengu_oauth_success", {
      loginWithClaudeAi: D,
    });
    process.stdout.write(`Login successful.
`);
    await offerPostLoginTips(c);
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
    let s = err instanceof OAuthCallbackError ? err.displayMessage : errorMessage(err);
    let r =
      err instanceof CallbackListenerUnavailableError ? " Run with --debug for the underlying error." : "";
    if (isVerificationOrMintRefusal(err) || err instanceof PasteInputClosedError)
      process.stdout.write(`
`);
    process.stderr.write(`Login failed: ${s}${r}
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
    process.stdin.off("data", I);
    A.close();
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
async function offerPostLoginTips(o) {
  if (!process.stdout.isTTY) return;
  let h = managedSettingsUrl();
  if (h === undefined) return;
  process.stdout.write(`${MANAGED_SETTINGS_NOTICE}
`);
  await markManagedSettingsNoticeSeen(h, "auth_cli", o);
}
//@ chunk-84jf153s.js:23388-23601 layout
function getConfigHomeIfNotOverridden() {
  let o = resolve(getClaudeConfigDir());
  for (let h of ["projectSettings", "localSettings"]) {
    let env = getSettingsForSource(h)?.env ?? {};
    for (let [key, value] of Object.entries(env))
      if (key === "CLAUDE_CONFIG_DIR" && typeof value === "string" && resolve(value) !== o) return null;
  }
  return getProjectsDir();
}
//@ chunk-84jf153s.js:23601-25349 fingerprint = authStatus (0.719)
/**
 * claude auth status：汇总令牌来源、API key 来源、提供方与账户信息，--json（默认）或 --text 输出。
 */
async function authStatus(o, h, v) {
  let { source: authTokenSource, hasToken } = getAuthTokenSource();
  let { source: apiKeySource } = getAnthropicApiKeyWithSourceSafe();
  let hasApiKeyEnvVar = !!process.env.ANTHROPIC_API_KEY && !isAntBuild();
  let { tokenSource } = getRequestCredentials(authTokenSource, apiKeySource);
  let U = isOAuthBearerSource(authTokenSource) && tokenSource === "none";
  let oauthAccount = getOauthAccountInfo();
  let subscriptionType = getSubscriptionType();
  let using3P = isUsing3PServices();
  let B = getAPIProvider() === "gateway" && !getGatewayAuth();
  let loggedIn = !B && (hasToken || apiKeySource !== "none" || hasApiKeyEnvVar || using3P);
  let authMethod = "none";
  if (using3P) authMethod = B ? "none" : "third_party";
  else if (tokenSource === "claude.ai") authMethod = "claude.ai";
  else if (tokenSource === "apiKeyHelper") authMethod = "api_key_helper";
  else if (tokenSource !== "none") authMethod = "oauth_token";
  else if (apiKeySource === "ANTHROPIC_API_KEY" || hasApiKeyEnvVar || apiKeySource === "/login managed key")
    authMethod = "api_key";
  else if (apiKeySource === "apiKeyHelper" && U) authMethod = "api_key_helper";
  let K = null;
  let W = false;
  let P;
  if (h.text) {
    let A = probeRefreshTokenDead(v);
    let C = A === undefined ? undefined : await A;
    let u = moveAntOnlyToEnd([[...buildAccountProperties(C), ...buildAPIProviderProperties()]]).flat();
    let mapped = statusValueRows(u).map((I) => (I.label ? `${I.label}: ${I.value}` : I.value));
    if (mapped.length === 0 && hasApiKeyEnvVar) mapped.push("API key: ANTHROPIC_API_KEY");
    if (!loggedIn)
      mapped.push(
        B
          ? "Not logged in. This session uses a Cloud gateway; start `claude` and sign in with /login."
          : "Not logged in. Run claude auth login to authenticate.",
      );
    P = jsxProd_default(Text, {
      children: mapped.join(`
`),
    });
  } else {
    let apiProvider = getAPIProvider();
    let C = apiKeySource !== "none" ? apiKeySource : hasApiKeyEnvVar ? "ANTHROPIC_API_KEY" : null;
    let u = {
      loggedIn,
      authMethod,
      apiProvider,
      analyticsDisabled: isFirstPartyTelemetryBlocked(),
      projectsDirectory: getConfigHomeIfNotOverridden(),
      configDirectory: getClaudeConfigDir(),
    };
    let apiProvider_2 = getForcedLoginMethod();
    if (apiProvider_2) u.forcedLoginMethod = apiProvider_2;
    if (getForcedGatewayLogin(getUserSettingsGateway()) !== undefined) u.gatewaySignInOffered = true;
    let allowedProviders = getAllowedProviders();
    if (allowedProviders !== undefined) u.allowedProviders = [...allowedProviders];
    if (C) u.apiKeySource = C;
    let i = authMethod === "api_key" && apiKeySource === "/login managed key" ? oauthAccount : undefined;
    if (authMethod === "claude.ai") {
      u.email = oauthAccount?.emailAddress ?? null;
      u.orgId = oauthAccount?.organizationUuid ?? null;
      u.orgName = oauthAccount?.organizationName ?? null;
      u.subscriptionType = subscriptionType ?? null;
    } else if (i) {
      u.email = i.emailAddress ?? null;
      u.orgId = i.organizationUuid ?? null;
      u.orgName = i.organizationName ?? null;
    } else if (apiProvider === "gateway") u.email = getGatewayAuth()?.email ?? null;
    P = jsxProd_default(Text, {
      children: jsonStringify(u, null, 2),
    });
  }
  logFeatureOk("cli_auth_status");
  o.render(
    jsxProd_default(RenderOnceAndExit, {
      children: P,
    }),
  );
  await o.waitUntilExit();
  await waitForOAuthRefreshBeforeExit();
  process.exit(loggedIn ? 0 : 1);
}
//@ chunk-84jf153s.js:25349-25728 placement
/**
 * claude auth logout：清除登录凭据，失败时写 stderr 并以 1 退出，成功时打印已登出。
 */
async function authLogout(o, storageV5, credentials) {
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
  o.render(
    jsxProd_default(RenderOnceAndExit, {
      children: jsxProd_default(Text, {
        children: "Successfully logged out from your Anthropic account.",
      }),
    }),
  );
  await o.waitUntilExit();
  await logFeatureOkAsync("cli_auth_logout");
}
//@ chunk-th8w37yz.js:1472-1483 placement
var NO_CONSOLE_LOGIN = null;
//@ chunk-th8w37yz.js:1483-2126 placement
function clearOAuthAccountFields(o) {
  o.oauthAccount = undefined;
  o.managedSettingsNoticeSeenOrg = undefined;
  o.additionalModelOptionsCache = undefined;
  o.additionalModelOptionsAnsweredAt = undefined;
  o.additionalModelCostsCache = undefined;
  o.modelAccessCache = undefined;
  o.orgModelDefaultCache = undefined;
  o.cachedArtifactRoster = undefined;
  o.artifactRosterDenied = undefined;
  o.lastSeenOrgDefaultUpdatedAt = undefined;
  o.clientDataCache = undefined;
  o.clientDataCacheSlots = undefined;
  o.autoCompactWindowsCache = undefined;
  o.cachedUsageUtilization = undefined;
  o.metricsStatusCache = undefined;
  o.metricsStatusCacheByPrincipal = undefined;
  o.githubWebConnectionStatusCache = undefined;
  o.unusedLimitResetStatusCache = undefined;
  o.startupPrefetchedAt = undefined;
  return o;
}
//@ chunk-th8w37yz.js:2126-2187 placement
async function clearAccountScopedConfig(storageV5) {
  await saveGlobalConfig(
    (s) =>
      clearOAuthAccountFields({
        ...s,
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
//@ chunk-zbtr7f5k.js:3736-5302 fingerprint = installOAuthTokens (0.505)
/**
 * installOAuthTokens：保存 OAuth 令牌并更新账户/组织信息，区分同账号刷新与切换账号。
 */
async function installOAuthTokens(e, { storageV5, credentials }) {
  let oauthAccountInfo = getOauthAccountInfo();
  let o = {
    accountUuid: e.profile?.account?.uuid ?? e.tokenAccount?.uuid,
    organizationUuid: e.profile?.organization?.uuid ?? e.tokenAccount?.organizationUuid,
  };
  let s = sameOwnerAccount(oauthAccountInfo, o);
  let p = sameOwnerAccount(getAuthenticatedAccountInfo(), o);
  let claudeAIOAuthTokenOrigin = await getClaudeAIOAuthTokenOriginAsync(credentials);
  let artifactAccount =
    p &&
    (claudeAIOAuthTokenOrigin === "env" ||
      claudeAIOAuthTokenOrigin === "fd" ||
      (claudeAIOAuthTokenOrigin === "store" && s))
      ? "same_account"
      : "account_switch";
  await performLogout({
    clearOnboarding: false,
    preserveInProcessTokens: true,
    preserveNonAnthropicAuth: true,
    storageV5,
    preserveQuotaAutoResume: s,
    artifactAccount,
    incomingIdentity: o,
    credentials,
  });
  setAuthenticatedAccount(null);
  setHostSessionsBearerSource(null);
  let profile = e.profile ?? (await getOauthProfileFromOauthToken(e.accessToken));
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
  else if (e.tokenAccount)
    storeOAuthAccountInfo(
      {
        accountUuid: e.tokenAccount.uuid,
        emailAddress: e.tokenAccount.emailAddress,
        organizationUuid: e.tokenAccount.organizationUuid,
      },
      storageV5,
    );
  logAuthEvent({
    action: "login",
    success: true,
    authMethod: "oauth",
  });
  return {
    preserveQuotaAutoResume: s,
    artifactAccount,
    incomingIdentity: o,
  };
}
export { clearAuthRelatedCaches, clearOAuthAccountFields, installOAuthTokens, clearAccountScopedConfig };
