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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  refreshOAuthToken,
  restoreOAuthAccountAfterRefusedRefresh,
  fetchProfileInfo,
  subscriptionTypeForOrganizationType,
  shouldUseClaudeAIAuth,
  B3t,
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
  fnn,
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
import { eZ, MANAGED_SETTINGS_NOTICE } from "../../components/ManagedSettingsNotice.js";
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
import { Mxt } from "../../services/api/fileReferenceCalls.js";
import { clearGzipBlockStore } from "../../services/api/gzipRequestBody.js";
import { Ws } from "../../services/api/streamFallbackWarning.js";
import { clearOrgMemoryCredential } from "../../services/orgMemory/credential.js";
import { iZs } from "../../services/accountMemory/memoryContext.js";
import { z2s } from "../../services/artifacts/artifactDb.js";
import { resetLiveStateOnAccountChange } from "../../services/liveReplica/liveReplica.js";
import { clearServedCapabilities } from "../../services/artifacts/capabilityDeclaration.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { CUr } from "../../utils/claudeAiSync/skillsSync.js";
import { H5r } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { ZV } from "../../commands/remote-setup/api.js";
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
import { endLowPriority, Ydi } from "../../services/lowPriority/lowPriorityMode.js";
import { setHostSessionsBearerSource } from "../../utils/hostSessionsBearer.js";
import { getOauthProfileFromOauthToken } from "../../services/oauth/getOauthProfile.js";
import { planDisplayNameFromProfile } from "../../services/oauth/validateOauthToken.js";
import { logAuthEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";

//@ chunk-84jf153s.js:14816-15055 sole-consumer
async function exitLoginRefusedByPolicy(o) {
  (process.stderr.write(
    o.message +
      `
`,
  ),
    await sendOrgValidationRefusal(o),
    await logFeatureBadAsync(
      "cli_auth_login",
      o.reason === "provider_not_allowed"
        ? "cli_auth_login_provider_not_allowed"
        : "cli_auth_login_org_not_allowed",
    ),
    await flushAnalyticsSinks(),
    await drainRegisteredWriteQueues(),
    process.exit(1));
}
//@ chunk-84jf153s.js:15055-15220 sole-consumer
function subscriptionTypeFields(o, h) {
  if (o === null) return { subscriptionType: null };
  return {
    subscriptionType: o,
    subscriptionTypeSource: "profile",
    ...(h && { subscriptionTypeVerifiedAt: Date.now() }),
  };
}
//@ chunk-84jf153s.js:15220-15359 sole-consumer
var REFRESH_TOKEN_SPENT_MESSAGE =
  "The refresh token in CLAUDE_CODE_OAUTH_REFRESH_TOKEN was used for this attempt and cannot be used again; issue a new one to retry.";
//@ chunk-84jf153s.js:15359-15520 sole-consumer
async function exitLoginOrgConfigRefused(o) {
  (process.stderr.write(
    o +
      `
`,
  ),
    await logFeatureBadAsync("cli_auth_login", "cli_auth_login_org_config_refused"),
    await settlePendingGateWork(),
    await flushAnalyticsSinks(),
    await drainRegisteredWriteQueues(),
    process.exit(1));
}
//@ chunk-84jf153s.js:15520-15691 affinity
function warnOrgCheckDeferred(o) {
  process.stderr.write(`${o}
The sign-in was saved but could not be checked against your organization yet; Claude Code checks it again when it next starts.
`);
}
/**
 * claude auth login：--console/--claudeai/--sso/--email/--gateway-json 互斥检查，执行 OAuth 登录（或云网关登录），安装令牌、校验组织策略。
 */
//@ chunk-84jf153s.js:15691-23088 fingerprint = authLogin (0.367)
async function authLogin(
  { email: email, sso: sso, console: v, claudeai: claudeai, gatewayJson: gatewayJson },
  c,
  O,
) {
  if (v && claudeai)
    (process.stderr.write(`Error: --console and --claudeai cannot be used together.
`),
      process.exit(1));
  let k = v || claudeai || sso || email !== void 0;
  if (gatewayJson) {
    if (k)
      (process.stderr
        .write(`Error: --gateway-json cannot be used together with --console, --claudeai, --sso, or --email.
`),
        process.exit(1));
    {
      let i = getForcedGatewayLogin(getUserSettingsGateway());
      if (i !== void 0) {
        if (process.stdin.isTTY)
          (process.stderr
            .write(`This command is run by the VS Code extension, not by hand. To sign in from a terminal, run /login in Claude Code.
`),
            process.exit(1));
        if (isSpawnedByClaudeCodeSession())
          (process.stderr
            .write(`Cloud gateway sign-in needs a person to answer its questions, so it cannot run inside a Claude Code session. Sign in from the Claude Code panel in VS Code, or run /login in Claude Code.
`),
            process.exit(1));
        let abortController = new AbortController();
        (process.on("SIGTERM", () => abortController.abort()),
          process.on("SIGINT", () => abortController.abort()),
          markPrintModeSignalHandlersRegistered());
        let { runGatewayJsonLogin: runGatewayJsonLogin } = await import("./chunk-gy23bf9p.js"),
          r = await runGatewayJsonLogin({
            gateway: i,
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
    (process.stderr
      .write(`Cloud gateway sign-in isn't available with this machine's settings. If your organization manages this machine's settings, a gateway in your own settings file isn't used.
`),
      process.exit(1));
  }
  let settings = getInitialSettings_2(),
    L = getForcedLoginMethod();
  if (L === "gateway") {
    if ((declareNoConsentSurface(), process.stdin.isTTY && process.stdout.isTTY && !k)) {
      let [{ Login: Login }, { AppRoot: AppRoot }] = await Promise.all([
          import("./chunk-whwtfsqf.js"),
          import("./chunk-f6d8289b.js"),
        ]),
        s = await createRoot(getBaseRenderOptions(!1)),
        r = getGatewayAuth(),
        winner = await Promise.race([
          new Promise((G) => {
            s.render(e(AppRoot, { storageV5: c, children: e(Login, { onDone: G }) }));
          }),
          s
            .waitUntilExit()
            .catch(logError)
            .then(() => {
              return;
            }),
        ]);
      s.unmount();
      let m = getGatewayAuth(),
        b = winner ?? (m !== null && m !== r);
      if (b)
        process.stdout.write(`Login successful.
`);
      else
        process.stderr.write(`Login interrupted.
`);
      (await drainRegisteredWriteQueues(), process.exit(b ? 0 : 1));
    }
    (process.stderr
      .write(`Managed settings on this machine configure a Cloud gateway sign-in; run interactive /login to authenticate.
`),
      process.exit(1));
  }
  let D = L ? L === "claudeai" : !v,
    envRefreshToken = process.env.CLAUDE_CODE_OAUTH_REFRESH_TOKEN,
    x = (await providerAllowlistRefusal("firstParty")) ?? (await providerAllowlistRefusal());
  if (x)
    (process.stderr.write(
      x.message +
        `
`,
    ),
      await flushAnalyticsSinks(),
      process.exit(1));
  let S = settings.forceLoginMethod !== void 0 && D !== (settings.forceLoginMethod === "claudeai"),
    K = typeof settings.forceLoginOrgUUID === "string" && !S ? settings.forceLoginOrgUUID : void 0;
  if (envRefreshToken) {
    let envScopes = process.env.CLAUDE_CODE_OAUTH_SCOPES;
    if (!envScopes)
      (process.stderr.write(`CLAUDE_CODE_OAUTH_SCOPES is required when using CLAUDE_CODE_OAUTH_REFRESH_TOKEN.
Set it to the space-separated scopes the refresh token was issued with
(e.g. "user:inference" or "user:profile user:inference user:sessions:claude_code user:mcp_servers").
`),
        process.exit(1));
    let scopes = envScopes.split(/\s+/).filter(Boolean);
    try {
      logEvent("tengu_login_from_refresh_token", {});
      let s = await resolveLoginOrgPin(scopes);
      if (s.outcome === "refused") await exitLoginRefusedByPolicy(s.rejection);
      let r = getStoredOauthAccountInfo(),
        tokens = await refreshOAuthToken(envRefreshToken, {
          scopes: scopes,
          expiresIn: LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS,
          clientId: process.env.CLAUDE_CODE_OAUTH_CLIENT_ID || void 0,
          storageV5: c,
        }),
        m = await checkNewLoginTokenOrg(tokens);
      if (m.outcome === "refused") {
        if (r) await restoreOAuthAccountAfterRefusedRefresh(r, c);
        let y = await revokeRefusedSignInToken(tokens);
        await exitLoginRefusedByPolicy({
          ...m.rejection,
          message: `${m.rejection.message}
${y}

${REFRESH_TOKEN_SPENT_MESSAGE}`,
        });
      }
      let b =
          tokens.profile !== void 0
            ? { profile: tokens.profile, stamped: tokens.profileOriginStamped === !0 }
            : tokens.scopes.includes(CLAUDE_AI_PROFILE_SCOPE)
              ? await fetchProfileInfo(tokens.accessToken).then((y) => ({
                  profile: y.rawProfile,
                  stamped: y.originStamped === !0,
                }))
              : void 0,
        {
          subscriptionTypeSource: subscriptionTypeSource,
          subscriptionTypeVerifiedAt: subscriptionTypeVerifiedAt,
          profileOriginStamped: profileOriginStamped,
          ...ee
        } = tokens,
        F = {
          ...ee,
          ...(b?.profile !== void 0 && { profile: b.profile }),
          ...subscriptionTypeFields(
            subscriptionTypeForOrganizationType(b?.profile?.organization.organization_type),
            b?.stamped === !0,
          ),
          rateLimitTier: b?.profile?.organization.rate_limit_tier ?? null,
        },
        H = await checkLoginAllowed({
          accessToken: F.accessToken,
          startupGateFollows: !0,
          newLogin: F,
          untieredLogin: needsProfileVerification(F),
          organizationName: b?.profile?.organization.name,
        });
      if (!H.ok && loginSettingsOutcome(H.evaluation) === "refused") {
        if (r) await restoreOAuthAccountAfterRefusedRefresh(r, c);
        let y = await revokeRefusedSignInToken(F);
        await exitLoginOrgConfigRefused(`${H.message} ${y}

${REFRESH_TOKEN_SPENT_MESSAGE}`);
      }
      let ie = await saveLoginOrWarn(F, { storageV5: c, credentials: O }),
        Y = await validateForceLoginOrg(O, m.outcome === "permitted" ? m.verified : void 0);
      if (!Y.valid) {
        let y = await LOGIN_REFUSAL_REASONS(Y, ie?.storage, { storageV5: c, credentials: O });
        if (y?.restored === !1)
          process.stderr.write(
            fnn(y) +
              `
`,
          );
        await exitLoginRefusedByPolicy(Y);
      }
      if (!H.ok) warnOrgCheckDeferred(H.message);
      else if (H.warning !== void 0)
        process.stderr.write(`${H.warning}
`);
      (await saveGlobalConfig((current) => {
        if (current.hasCompletedOnboarding) return current;
        return { ...current, hasCompletedOnboarding: !0 };
      }, c),
        logEvent("tengu_oauth_success", { loginWithClaudeAi: shouldUseClaudeAIAuth(F.scopes) }),
        process.stdout.write(`Login successful.
`),
        await offerPostLoginTips(c),
        await logFeatureOkAsync("cli_auth_login"),
        await flushAnalyticsSinks(),
        process.exit(0));
    } catch (err) {
      if (isExpectedApiError(err, B3t))
        logForDebugging(`Login from refresh token failed: ${errorMessage(err)}`, { level: "error" });
      else logError(err);
      let sslHint = getSSLErrorHint(err);
      (process.stderr.write(`Login failed: ${errorMessage(err)}
${
  sslHint
    ? sslHint +
      `
`
    : ""
}`),
        await logFeatureBadAsync("cli_auth_login", "cli_auth_login_refresh_token_failed"),
        await flushAnalyticsSinks(),
        await drainRegisteredWriteQueues(),
        process.exit(1));
    }
  }
  let W = sso ? "sso" : void 0,
    oauthService = new OAuthService(),
    A = createInterface({ input: process.stdin });
  A.on("line", (i) => {
    let [f, s] = i.trim().split("#");
    if (!f || !s) {
      process.stderr.write(`Invalid code. Please make sure the full code was copied.
`);
      return;
    }
    (logEvent("tengu_oauth_manual_entry", {}),
      oauthService.handleManualAuthCodeInput({ authorizationCode: f, state: s }));
  });
  let C = !1,
    u = !1,
    promise = new Promise((i, f) => {
      A.once("close", () => {
        if (((u = !0), C)) f(new PasteInputClosedError());
      });
    }),
    I = (i) => {
      if (C && String(i).includes("\x04")) A.close();
    };
  process.stdin.on("data", I);
  try {
    logEvent("tengu_oauth_flow_start", { loginWithClaudeAi: D });
    let i,
      f = [
        async (url) => {
          if (C) {
            if (u) throw new PasteInputClosedError();
            (process.stdout.write(`${MANUAL_CODE_HINT}
`),
              process.stdout.write(`Sign in at: ${createHyperlink(url, void 0, { assumeSupport: !0 })}
`),
              process.stdout.write(PASTE_CODE_PROMPT));
            return;
          }
          (process.stdout.write(`Opening browser to sign in\u2026
`),
            process.stdout
              .write(`If the browser didn't open, visit: ${createHyperlink(url, void 0, { assumeSupport: !0 })}
`),
            process.stdout.write("Paste code here if prompted > "));
        },
        {
          loginWithClaudeAi: D,
          loginHint: email,
          loginMethod: W,
          orgUUID: K,
          ...(process.stdin.isTTY && {
            onCallbackListenerUnavailable: () => {
              C = !0;
            },
          }),
          settingsOnlyGrant: i,
        },
      ],
      s;
    s ??= oauthService.startOAuthFlow(...f);
    let winner = await Promise.race([s, promise]),
      p = await checkNewLoginTokenOrg(winner);
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
      startupGateFollows: !0,
      newLogin: winner,
      untieredLogin: needsProfileVerification(winner),
      organizationName: winner.profile?.organization.name ?? winner.tokenAccount?.organizationName,
    });
    if (!m.ok && loginSettingsOutcome(m.evaluation) === "refused") {
      let w = await revokeRefusedSignInToken(winner);
      await exitLoginOrgConfigRefused(`${m.message} ${w}`);
    }
    let b = await saveLoginOrWarn(winner, { storageV5: c, credentials: O }),
      G = await validateForceLoginOrg(O, p.outcome === "permitted" ? p.verified : void 0);
    if (!G.valid) {
      let w = await LOGIN_REFUSAL_REASONS(G, b?.storage, { storageV5: c, credentials: O });
      if (w?.restored === !1)
        process.stderr.write(
          fnn(w) +
            `
`,
        );
      await exitLoginRefusedByPolicy(G);
    }
    if (!m.ok) warnOrgCheckDeferred(m.message);
    else if (m.warning !== void 0)
      process.stderr.write(`${m.warning}
`);
    (logEvent("tengu_oauth_success", { loginWithClaudeAi: D }),
      process.stdout.write(`Login successful.
`),
      await offerPostLoginTips(c),
      await logFeatureOkAsync("cli_auth_login"),
      await flushAnalyticsSinks(),
      await drainRegisteredWriteQueues(),
      process.exit(0));
  } catch (err) {
    if (isOAuthCallbackError(err))
      (process.stdout.write(`
`),
        process.stderr.write(`${formatAccountOnHoldSignInError(isClaudeAiOrigin(err.errorUri))}
`),
        await logFeatureBadAsync("cli_auth_login", "cli_auth_login_oauth_flow_failed"),
        await flushAnalyticsSinks(),
        await drainRegisteredWriteQueues(),
        process.exit(1));
    if (
      err instanceof AuthCodeRefusedError ||
      isExpectedApiError(err, B3t) ||
      err instanceof OAuthCallbackError ||
      err instanceof CallbackListenerUnavailableError ||
      err instanceof PasteInputClosedError
    )
      logForDebugging(`OAuth login failed: ${errorMessage(err)}`, { level: "error" });
    else logError(err);
    let sslHint = getSSLErrorHint(err),
      s = err instanceof OAuthCallbackError ? err.displayMessage : errorMessage(err),
      r =
        err instanceof CallbackListenerUnavailableError ? " Run with --debug for the underlying error." : "";
    if (B3t(err) || err instanceof PasteInputClosedError)
      process.stdout.write(`
`);
    (process.stderr.write(`Login failed: ${s}${r}
${
  sslHint
    ? sslHint +
      `
`
    : ""
}`),
      await logFeatureBadAsync("cli_auth_login", "cli_auth_login_oauth_flow_failed"),
      await flushAnalyticsSinks(),
      await drainRegisteredWriteQueues(),
      process.exit(err instanceof PasteInputClosedError ? 130 : 1));
  } finally {
    (process.stdin.off("data", I), A.close(), oauthService.cleanup());
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
  let h = eZ();
  if (h === void 0) return;
  (process.stdout.write(`${MANAGED_SETTINGS_NOTICE}
`),
    await markManagedSettingsNoticeSeen(h, "auth_cli", o));
}
//@ chunk-84jf153s.js:23388-23601 layout
function getConfigHomeIfNotOverridden() {
  let o = resolve(getClaudeConfigDir());
  for (let h of ["projectSettings", "localSettings"]) {
    let v = getSettingsForSource(h)?.env ?? {};
    for (let [T, N] of Object.entries(v))
      if (T === "CLAUDE_CONFIG_DIR" && typeof N === "string" && resolve(N) !== o) return null;
  }
  return getProjectsDir();
}
/**
 * claude auth status：汇总令牌来源、API key 来源、提供方与账户信息，--json（默认）或 --text 输出。
 */
//@ chunk-84jf153s.js:23601-25349 fingerprint = authStatus (0.719)
async function authStatus(o, h, v) {
  let { source: authTokenSource, hasToken: hasToken } = getAuthTokenSource(),
    { source: apiKeySource } = getAnthropicApiKeyWithSourceSafe(),
    O = !!process.env.ANTHROPIC_API_KEY && !isAntBuild(),
    { tokenSource: tokenSource } = getRequestCredentials(authTokenSource, apiKeySource),
    U = isOAuthBearerSource(authTokenSource) && tokenSource === "none",
    oauthAccount = getOauthAccountInfo(),
    subscriptionType = getSubscriptionType(),
    using3P = isUsing3PServices(),
    B = getAPIProvider() === "gateway" && !getGatewayAuth(),
    x = !B && (hasToken || apiKeySource !== "none" || O || using3P),
    authMethod = "none";
  if (using3P) authMethod = B ? "none" : "third_party";
  else if (tokenSource === "claude.ai") authMethod = "claude.ai";
  else if (tokenSource === "apiKeyHelper") authMethod = "api_key_helper";
  else if (tokenSource !== "none") authMethod = "oauth_token";
  else if (apiKeySource === "ANTHROPIC_API_KEY" || O || apiKeySource === "/login managed key")
    authMethod = "api_key";
  else if (apiKeySource === "apiKeyHelper" && U) authMethod = "api_key_helper";
  let K = null,
    W = !1,
    P;
  if (h.text) {
    let A = probeRefreshTokenDead(v),
      C = A === void 0 ? void 0 : await A,
      flat = moveAntOnlyToEnd([[...buildAccountProperties(C), ...buildAPIProviderProperties()]]).flat(),
      mapped = statusValueRows(flat).map((I) => (I.label ? `${I.label}: ${I.value}` : I.value));
    if (mapped.length === 0 && O) mapped.push("API key: ANTHROPIC_API_KEY");
    if (!x)
      mapped.push(
        B
          ? "Not logged in. This session uses a Cloud gateway; start `claude` and sign in with /login."
          : "Not logged in. Run claude auth login to authenticate.",
      );
    P = e(Text, {
      children: mapped.join(`
`),
    });
  } else {
    let A = getAPIProvider(),
      C = apiKeySource !== "none" ? apiKeySource : O ? "ANTHROPIC_API_KEY" : null,
      u = {
        loggedIn: x,
        authMethod: authMethod,
        apiProvider: A,
        analyticsDisabled: isFirstPartyTelemetryBlocked(),
        projectsDirectory: getConfigHomeIfNotOverridden(),
        configDirectory: getClaudeConfigDir(),
      },
      apiProvider = getForcedLoginMethod();
    if (apiProvider) u.forcedLoginMethod = apiProvider;
    if (getForcedGatewayLogin(getUserSettingsGateway()) !== void 0) u.gatewaySignInOffered = !0;
    let I = getAllowedProviders();
    if (I !== void 0) u.allowedProviders = [...I];
    if (C) u.apiKeySource = C;
    let i = authMethod === "api_key" && apiKeySource === "/login managed key" ? oauthAccount : void 0;
    if (authMethod === "claude.ai")
      ((u.email = oauthAccount?.emailAddress ?? null),
        (u.orgId = oauthAccount?.organizationUuid ?? null),
        (u.orgName = oauthAccount?.organizationName ?? null),
        (u.subscriptionType = subscriptionType ?? null));
    else if (i)
      ((u.email = i.emailAddress ?? null),
        (u.orgId = i.organizationUuid ?? null),
        (u.orgName = i.organizationName ?? null));
    else if (A === "gateway") u.email = getGatewayAuth()?.email ?? null;
    P = e(Text, { children: jsonStringify(u, null, 2) });
  }
  (logFeatureOk("cli_auth_status"),
    o.render(e(RenderOnceAndExit, { children: P })),
    await o.waitUntilExit(),
    await waitForOAuthRefreshBeforeExit(),
    process.exit(x ? 0 : 1));
}
/**
 * claude auth logout：清除登录凭据，失败时写 stderr 并以 1 退出，成功时打印已登出。
 */
//@ chunk-84jf153s.js:25349-25728 placement
async function authLogout(o, h, v) {
  try {
    await performLogout({ clearOnboarding: !1, storageV5: h, credentials: v });
  } catch (error) {
    (logError(error),
      process.stderr.write(`Logout failed: ${errorMessage(error)}
`),
      await logFeatureBadAsync("cli_auth_logout", "cli_auth_logout_failed"),
      await flushAnalyticsSinks(),
      process.exit(1));
  }
  (o.render(
    e(RenderOnceAndExit, {
      children: e(Text, { children: "Successfully logged out from your Anthropic account." }),
    }),
  ),
    await o.waitUntilExit(),
    await logFeatureOkAsync("cli_auth_logout"));
}
//@ chunk-th8w37yz.js:1472-1483 placement
var v = null;
//@ chunk-th8w37yz.js:1483-2126 placement
function clearOAuthAccountFields(o) {
  return (
    (o.oauthAccount = void 0),
    (o.managedSettingsNoticeSeenOrg = void 0),
    (o.additionalModelOptionsCache = void 0),
    (o.additionalModelOptionsAnsweredAt = void 0),
    (o.additionalModelCostsCache = void 0),
    (o.modelAccessCache = void 0),
    (o.orgModelDefaultCache = void 0),
    (o.cachedArtifactRoster = void 0),
    (o.artifactRosterDenied = void 0),
    (o.lastSeenOrgDefaultUpdatedAt = void 0),
    (o.clientDataCache = void 0),
    (o.clientDataCacheSlots = void 0),
    (o.autoCompactWindowsCache = void 0),
    (o.cachedUsageUtilization = void 0),
    (o.metricsStatusCache = void 0),
    (o.metricsStatusCacheByPrincipal = void 0),
    (o.githubWebConnectionStatusCache = void 0),
    (o.unusedLimitResetStatusCache = void 0),
    (o.startupPrefetchedAt = void 0),
    o
  );
}
//@ chunk-th8w37yz.js:2126-2187 placement
async function clearAccountScopedConfig(o) {
  (await saveGlobalConfig((s) => clearOAuthAccountFields({ ...s }), o), setResolvedOrgDefault(void 0));
}
//@ chunk-th8w37yz.js:4565-5345 placement
async function clearAuthRelatedCaches(
  o,
  {
    preserveQuotaAutoResume: preserveQuotaAutoResume = !1,
    artifactAccount: artifactAccount = "signed_out",
    incomingIdentity: incomingIdentity,
    credentials: credentials,
  } = {},
) {
  if ((clearOAuthTokenMemos(), isStorageV5Enabled() && credentials === void 0))
    invalidatePlainTextStoreCopy();
  (clearTrustedDeviceTokenCache(),
    clearClientDataSeed(),
    getProviderState().providerCache.clientDataFetches.clear(),
    clearBetasCaches(),
    getProviderState().providerCache.modelConfigs.clear(),
    getProviderState().providerCache.validatedModels.clear(),
    resetEntitlementDenies(),
    deactivateServedCatalog(),
    invalidateToolDescriptions(),
    Mxt(null),
    clearGzipBlockStore(Ws().gzipRequestBody.blockStore),
    clearOrgMemoryCredential());
  let n = getRootSession();
  if (
    (iZs(n.host),
    v?.forgetClaudeCodeKeyHeard(),
    v?.recordServerAccountMemoryWord(void 0),
    z2s(n.host),
    resetLiveStateOnAccountChange(artifactAccount, incomingIdentity),
    artifactAccount !== "same_account")
  ) {
    if ((clearServedCapabilities(n), !(isBgSession() && artifactAccount === "signed_out")))
      (CUr("account_change"), H5r("account_change"));
  }
  if (
    (ZV.of(n.host).clear(),
    resetUserData(),
    invalidateUserContext(n, "account_change"),
    refreshGrowthBookAfterAuthChange(),
    getGroveNoticeConfig.cache?.clear?.(),
    updateGroveSettings_2.cache?.clear?.(),
    await clearRemoteManagedSettingsCache(o),
    await clearPolicyLimitsCache(),
    clearMetricsEnabledCache(),
    resetGraceState(),
    resetNearLimitWrapUpState(),
    !preserveQuotaAutoResume)
  )
    (cancelQuotaAutoResume("account_switch"), endLowPriority("account_switch"), Ydi());
  resetCurrentLimits();
}
/**
 * installOAuthTokens：保存 OAuth 令牌并更新账户/组织信息，区分同账号刷新与切换账号。
 */
//@ chunk-zbtr7f5k.js:3736-5302 fingerprint = installOAuthTokens (0.505)
async function installOAuthTokens(e, { storageV5: storageV5, credentials: credentials }) {
  let f = getOauthAccountInfo(),
    o = {
      accountUuid: e.profile?.account?.uuid ?? e.tokenAccount?.uuid,
      organizationUuid: e.profile?.organization?.uuid ?? e.tokenAccount?.organizationUuid,
    },
    s = sameOwnerAccount(f, o),
    p = sameOwnerAccount(getAuthenticatedAccountInfo(), o),
    y = await getClaudeAIOAuthTokenOriginAsync(credentials),
    _ = p && (y === "env" || y === "fd" || (y === "store" && s)) ? "same_account" : "account_switch";
  (await performLogout({
    clearOnboarding: !1,
    preserveInProcessTokens: !0,
    preserveNonAnthropicAuth: !0,
    storageV5: storageV5,
    preserveQuotaAutoResume: s,
    artifactAccount: _,
    incomingIdentity: o,
    credentials: credentials,
  }),
    setAuthenticatedAccount(null),
    setHostSessionsBearerSource(null));
  let profile = e.profile ?? (await getOauthProfileFromOauthToken(e.accessToken));
  if (profile?.account && profile.organization)
    storeOAuthAccountInfo(
      {
        accountUuid: profile.account.uuid,
        emailAddress: profile.account.email,
        organizationUuid: profile.organization.uuid,
        displayName: profile.account.display_name || void 0,
        fullName: profile.account.full_name || void 0,
        hasExtraUsageEnabled: profile.organization.has_extra_usage_enabled ?? void 0,
        billingType: profile.organization.billing_type ?? void 0,
        subscriptionCreatedAt: profile.organization.subscription_created_at ?? void 0,
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
  return (
    logAuthEvent({ action: "login", success: !0, authMethod: "oauth" }),
    { preserveQuotaAutoResume: s, artifactAccount: _, incomingIdentity: o }
  );
}

export { clearAuthRelatedCaches, clearOAuthAccountFields, installOAuthTokens, clearAccountScopedConfig };
