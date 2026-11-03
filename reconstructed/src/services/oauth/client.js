/**
 * services/oauth/client.ts
 *
 * OAuth 客户端：拼 authorize URL（PKCE S256）、授权码换令牌、刷新与吊销令牌、拉 profile/roles、创建 API key、写 oauthAccount。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/oauth/client.ts
 * pieces: chunk-aepeg2w5.js (37)
 * attribution: placement 3, layout 9, facade-exports 25
 */
import { isDeepStrictEqual, isDeepStrictEqual as isDeepStrictEqual_2 } from "util";
import {
  VerificationRequiredError,
  hn,
  parseVerificationRequired,
  verificationErrorMessage,
  sanitizeVerificationMessage,
  ev,
} from "../api/verificationRequired.js";
import {
  isClaudeAiScopeSet,
  getOauthConfig,
  CLAUDE_AI_INFERENCE_SCOPE,
  allOAuthScopes,
  claudeAiLoginScopes,
  CLAUDE_AI_PLUGINS_SCOPE,
} from "../../constants/oauth.js";
import { Dt } from "../../../vendor/axios/dist/esm/axios.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import {
  getClaudeAIOAuthTokens,
  saveApiKey,
  isUnmarkedStoredPlan,
  isProvisionalProfilePlan,
  isProfilePlanDowngrade,
  hasProfileScope,
  checkAndRefreshOAuthTokenIfNeeded,
  getClaudeAIOAuthTokensAsync,
  getStoredOAuthTierVerifiedAt,
  isClaudeAISubscriber,
  credentialIsOwnStoredLogin,
  backfillStoredOAuthTier,
} from "../../utils/auth.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { fromEnum, lit, fromNumber, fromEnumOpt } from "../analytics/safeMetadata.js";
import { isSessionsToken } from "./sessionsBearerHooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import {
  sanitizedMachineReasonForTelemetry,
  isNonRetryableClientError,
  sanitizedOAuthErrorTypeForTelemetry,
} from "../../utils/errors.js";
import { ge } from "../../utils/identity.js";
import { getOauthProfileWithOriginFromOauthToken, getOauthProfileFromOauthToken } from "./getOauthProfile.js";
import { env } from "../../utils/env.js";
import { isDiskless } from "../../bootstrap/state.js";
import { planDisplayNameFromProfile } from "./validateOauthToken.js";
import { classifyOAuthErrorResponse, HTTPS_CLAUDE_AI_RESTRICTED, ACCOUNT_ON_HOLD } from "./oauthErrors.js";

//@ chunk-aepeg2w5.js:295624-295741 placement
var API_KEY_NOT_CREATED_MESSAGE =
  "The server did not create an API key and gave no readable reason. If this keeps happening, contact support.";
//@ chunk-aepeg2w5.js:295741-295825 placement
class KeyMintRefusedError extends Error {
  constructor(e, n) {
    super(e, n);
    this.name = "KeyMintRefusedError";
  }
}
//@ chunk-aepeg2w5.js:295825-295881 placement
function B3t(e) {
  return e instanceof VerificationRequiredError || e instanceof KeyMintRefusedError;
}
//@ chunk-aepeg2w5.js:295881-295911 layout
var lv = 86400000,
  iL = 2592000000;
//@ chunk-aepeg2w5.js:295911-296007 facade-exports
function resolveRefreshTokenExpiresAt(e, n) {
  if (typeof e === "number") return Date.now() + e * 1000;
  return n ? Date.now() + iL : void 0;
}
//@ chunk-aepeg2w5.js:296007-296036 facade-exports
function shouldUseClaudeAIAuth(e) {
  return isClaudeAiScopeSet(e);
}
//@ chunk-aepeg2w5.js:296036-296120 facade-exports
function parseScopes(scopeString) {
  if (typeof scopeString !== "string") return [];
  return scopeString.split(" ").filter(Boolean);
}
/**
 * 拼 OAuth authorize URL：claude.ai 用 CLAUDE_AI_AUTHORIZE_URL，Console 用 CONSOLE_AUTHORIZE_URL；参数 code=true、client_id、response_type=code、redirect_uri（手动模式 MANUAL_REDIRECT_URL，否则 http://localhost:<port>/callback）、scope、PKCE S256、state，可选 orgUUID/login_hint/login_method。
 */
//@ chunk-aepeg2w5.js:296120-296969 facade-exports = buildAuthUrl (0.957)
function buildAuthUrl({
  codeChallenge: codeChallenge,
  state: state,
  port: port,
  isManual: isManual,
  loginWithClaudeAi: loginWithClaudeAi,
  inferenceOnly: inferenceOnly,
  orgUUID: orgUUID,
  loginHint: loginHint,
  loginMethod: loginMethod,
  oauthClient: oauthClient,
  alsoRequestScope: alsoRequestScope,
}) {
  let F = loginWithClaudeAi
      ? getOauthConfig().CLAUDE_AI_AUTHORIZE_URL
      : getOauthConfig().CONSOLE_AUTHORIZE_URL,
    authUrl = new URL(F);
  (authUrl.searchParams.append("code", "true"),
    authUrl.searchParams.append("client_id", oauthClient?.clientId ?? getOauthConfig().CLIENT_ID),
    authUrl.searchParams.append("response_type", "code"),
    authUrl.searchParams.append(
      "redirect_uri",
      isManual ? getOauthConfig().MANUAL_REDIRECT_URL : `http://localhost:${port}/callback`,
    ));
  let G = oauthClient
    ? oauthClient.scopes
    : inferenceOnly
      ? [CLAUDE_AI_INFERENCE_SCOPE]
      : alsoRequestScope
        ? [...allOAuthScopes(), alsoRequestScope]
        : allOAuthScopes();
  if (
    (authUrl.searchParams.append("scope", G.join(" ")),
    authUrl.searchParams.append("code_challenge", codeChallenge),
    authUrl.searchParams.append("code_challenge_method", "S256"),
    authUrl.searchParams.append("state", state),
    orgUUID)
  )
    authUrl.searchParams.append("orgUUID", orgUUID);
  if (loginHint) authUrl.searchParams.append("login_hint", loginHint);
  if (loginMethod) authUrl.searchParams.append("login_method", loginMethod);
  return authUrl.toString();
}
/**
 * 用授权码 + code_verifier 向 TOKEN_URL 换取令牌（grant_type=authorization_code）。
 */
//@ chunk-aepeg2w5.js:296969-297709 facade-exports = exchangeCodeForTokens (0.816)
async function exchangeCodeForTokens(
  e,
  {
    state: state,
    codeVerifier: codeVerifier,
    port: port,
    useManualRedirect: useManualRedirect = !1,
    expiresIn: expiresIn,
    clientId: clientId,
  },
) {
  let requestBody = {
    grant_type: "authorization_code",
    code: e,
    redirect_uri: useManualRedirect
      ? getOauthConfig().MANUAL_REDIRECT_URL
      : `http://localhost:${port}/callback`,
    client_id: clientId ?? getOauthConfig().CLIENT_ID,
    code_verifier: codeVerifier,
    state: state,
  };
  if (expiresIn !== void 0) requestBody.expires_in = expiresIn;
  let response = await Dt.post(getOauthConfig().TOKEN_URL, requestBody, {
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
    ...hn,
  });
  if (response.status !== 200)
    throw (
      logFeatureBad(
        "oauth_token_exchange",
        response.status === 401 ? "oauth_exchange_invalid_code" : "oauth_exchange_http_error",
      ),
      Error(
        response.status === 401
          ? "Authentication failed: Invalid authorization code"
          : `Token exchange failed (${response.status}): ${response.statusText}`,
      )
    );
  return (
    logEvent("tengu_oauth_token_exchange_success", {}),
    logFeatureOk("oauth_token_exchange"),
    response.data
  );
}
/**
 * 用 refresh token 换新令牌（POST TOKEN_URL，30 秒超时，可带 expires_in），成功打 tengu_oauth_token_refresh_success；必要时补拉 profile 更新订阅信息与 oauthAccount。
 */
//@ chunk-aepeg2w5.js:297709-300375 facade-exports = refreshOAuthToken (0.686)
async function refreshOAuthToken(
  refreshToken,
  {
    scopes: n,
    expiresIn: r,
    clientId: s,
    skipProfileFetch: h,
    signal: y,
    telemetryContext: S,
    invalidScopeRetried: w,
    storageV5: R,
  } = {},
) {
  let x = Array.isArray(n) && n.length ? n : claudeAiLoginScopes(),
    requestBody = {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: s ?? getOauthConfig().CLIENT_ID,
      scope: x.join(" "),
    };
  if (r !== void 0) requestBody.expires_in = r;
  try {
    let response = await Dt.post(getOauthConfig().TOKEN_URL, requestBody, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
      signal: y,
      ...hn,
    });
    if (response.status !== 200) throw Error(`Token refresh failed: ${response.statusText}`);
    let data = response.data,
      {
        access_token: accessToken,
        refresh_token: newRefreshToken = refreshToken,
        expires_in: expiresIn,
      } = data,
      expiresAt = Date.now() + expiresIn * 1000,
      Q = resolveRefreshTokenExpiresAt(data.refresh_token_expires_in, !1),
      scopes = parseScopes(data.scope);
    (logEvent("tengu_oauth_token_refresh_success", {
      plugins_scope_requested: x.includes(CLAUDE_AI_PLUGINS_SCOPE),
      plugins_scope_granted: scopes.includes(CLAUDE_AI_PLUGINS_SCOPE),
    }),
      logFeatureOk("oauth_token_refresh"));
    let config = getGlobalConfig(),
      Se = h ? null : getClaudeAIOAuthTokens(),
      ae = consumeProfileStamp(Se),
      ie =
        config.oauthAccount?.billingType !== void 0 &&
        config.oauthAccount?.accountCreatedAt !== void 0 &&
        config.oauthAccount?.subscriptionCreatedAt !== void 0 &&
        config.oauthAccount?.ccOnboardingFlags !== void 0 &&
        Se?.subscriptionType != null &&
        Se?.rateLimitTier != null &&
        !ae,
      Z = h || ie ? null : await fetchProfileInfo(accessToken);
    if (Z && config.oauthAccount) {
      let updates = {};
      if (Z.displayName !== void 0) updates.displayName = Z.displayName;
      if (Z.fullName !== void 0) updates.fullName = Z.fullName;
      if (typeof Z.hasExtraUsageEnabled === "boolean") updates.hasExtraUsageEnabled = Z.hasExtraUsageEnabled;
      if (Z.billingType !== null) updates.billingType = Z.billingType;
      if (Z.accountCreatedAt !== void 0) updates.accountCreatedAt = Z.accountCreatedAt;
      if (Z.subscriptionCreatedAt !== void 0) updates.subscriptionCreatedAt = Z.subscriptionCreatedAt;
      if (Z.rawProfile)
        ((updates.ccOnboardingFlags = Z.ccOnboardingFlags),
          (updates.claudeCodeTrialEndsAt = Z.claudeCodeTrialEndsAt),
          (updates.claudeCodeTrialDurationDays = Z.claudeCodeTrialDurationDays),
          (updates.seatTier = Z.seatTier),
          (updates.planDisplayName = getPlanDisplayName(Z.rawProfile) ?? void 0),
          (updates.profileFetchedAt = Date.now()));
      if (Object.keys(updates).length > 0)
        await saveGlobalConfig(
          (current) => ({
            ...current,
            oauthAccount: current.oauthAccount
              ? { ...current.oauthAccount, ...updates }
              : current.oauthAccount,
          }),
          R,
        );
    }
    return {
      accessToken: accessToken,
      refreshToken: newRefreshToken,
      expiresAt: expiresAt,
      refreshTokenExpiresAt: Q,
      scopes: scopes,
      clientId: s,
      ...reconcileSubscriptionType(Se, Z),
      rateLimitTier: Z?.rateLimitTier ?? Se?.rateLimitTier ?? null,
      profile: Z?.rawProfile,
      ...(Z?.rawProfile !== void 0 && { profileOriginStamped: Z.originStamped === !0 }),
      tokenAccount: data.account
        ? {
            uuid: data.account.uuid,
            emailAddress: data.account.email_address,
            organizationUuid: data.organization?.uuid,
          }
        : void 0,
    };
  } catch (error) {
    let L = w === !0 && isInvalidScopeError(error);
    if (
      (logEvent("tengu_oauth_token_refresh_failure", {
        ...errorTelemetryFields(error),
        ...extractOAuthErrorFields(error),
        ...(S && { context: fromEnum(S) }),
        ...(L && { context: lit("invalid_scope_retried") }),
      }),
      isAccountOnHoldError(error))
    )
      logFeatureBad("oauth_token_refresh", "oauth_refresh_account_on_hold");
    else if (isInvalidGrantError(error)) logFeatureBad("oauth_token_refresh", "oauth_refresh_invalid_grant");
    else if (!y?.aborted && !S && !L) logFeatureSad("oauth_token_refresh", "oauth_refresh_request_failed");
    throw error;
  }
}
/**
 * 吊销令牌：POST <TOKEN_URL>/revoke（token、token_type_hint、client_id），5 秒超时，用于登出。
 */
//@ chunk-aepeg2w5.js:300375-301017 facade-exports
async function revokeOAuthTokenAcknowledged(e, n, r = "refresh_token") {
  try {
    let h =
      (
        await Dt.post(
          `${getOauthConfig().TOKEN_URL}/revoke`,
          { token: e, token_type_hint: r, client_id: n ?? getOauthConfig().CLIENT_ID },
          { headers: { "Content-Type": "application/json" }, timeout: 5000, ...hn },
        )
      )?.headers ?? {};
    if (!isSessionsToken(h["request-id"]))
      return (
        logForDebugging(
          "OAuth token revoke answered 2xx without an Anthropic request id; not counted as acknowledged.",
        ),
        logFeatureSad("oauth_token_revoke", "unstamped_2xx"),
        !1
      );
    return (logFeatureOk("oauth_token_revoke"), !0);
  } catch (error) {
    let h = Dt.isAxiosError(error) ? error.response?.status : void 0;
    return (
      logForDebugging(`OAuth token revoke failed (status=${h ?? "network"}); continuing with local logout.`),
      logFeatureSad("oauth_token_revoke", `http_${h ?? "network"}`),
      !1
    );
  }
}
/**
 * 吊销 refresh token（登出时）。
 */
//@ chunk-aepeg2w5.js:301017-301055 facade-exports
async function revokeOAuthToken(e, n) {
  await revokeOAuthTokenAcknowledged(e, n);
}
/**
 * 拉取 ROLES_URL（organization_role / workspace_role）并写入 oauthAccount。
 */
//@ chunk-aepeg2w5.js:301055-301806 facade-exports = fetchAndStoreUserRoles (0.813)
async function fetchAndStoreUserRoles(e, n) {
  let response = await Dt.get(getOauthConfig().ROLES_URL, {
    headers: { "User-Agent": claudeCodeUserAgent(), Authorization: `Bearer ${e}` },
    timeout: 1e4,
    signal: AbortSignal.timeout(1e4),
    ...hn,
  });
  if (response.status !== 200)
    throw (
      logFeatureBad("oauth_fetch_roles", "oauth_roles_http_error"),
      Error(`Failed to fetch user roles: ${response.statusText}`)
    );
  let data = response.data;
  if (!getGlobalConfig().oauthAccount)
    throw (
      logFeatureBad("oauth_fetch_roles", "oauth_roles_no_account"),
      Error("OAuth account information not found in config")
    );
  (await saveGlobalConfig(
    (current) => ({
      ...current,
      oauthAccount: current.oauthAccount
        ? {
            ...current.oauthAccount,
            organizationRole: data.organization_role,
            workspaceRole: data.workspace_role,
            organizationName: data.organization_name,
          }
        : current.oauthAccount,
    }),
    n,
  ),
    logEvent("tengu_oauth_roles_stored", {
      org_role:
        data.organization_role == null ? void 0 : sanitizedMachineReasonForTelemetry(data.organization_role),
    }),
    logFeatureOk("oauth_fetch_roles"));
}
/**
 * Console 登录后用 OAuth 令牌调用 API_KEY_URL 创建 API key 并保存（tengu_oauth_api_key）。
 */
//@ chunk-aepeg2w5.js:301806-302642 facade-exports = createAndStoreApiKey (0.589)
async function createAndStoreApiKey(e, n) {
  try {
    let response = await Dt.post(getOauthConfig().API_KEY_URL, null, {
        headers: { Authorization: `Bearer ${e}`, "User-Agent": claudeCodeUserAgent() },
        ...hn,
      }),
      apiKey = response.data?.raw_key;
    if (apiKey)
      return (
        await saveApiKey(apiKey, n),
        logEvent("tengu_oauth_api_key", { status: lit("success"), statusCode: response.status }),
        logFeatureOk("oauth_create_api_key"),
        apiKey
      );
    return (logFeatureBad("oauth_create_api_key", "oauth_api_key_empty_response"), null);
  } catch (error) {
    logEvent("tengu_oauth_api_key", { status: lit("failure"), ...errorTelemetryFields(error) });
    let s = Dt.isAxiosError(error)
      ? parseVerificationRequired(error.response?.status, error.response?.data)
      : void 0;
    if (s !== void 0)
      throw (
        logFeatureBad("oauth_create_api_key", "oauth_api_key_verification_required"),
        new VerificationRequiredError(s, { cause: error })
      );
    let h = verificationErrorMessage(error),
      y = Dt.isAxiosError(error) ? error.response?.status : void 0;
    if (h !== null && y !== void 0 && y >= 400 && y < 500)
      throw (
        logFeatureBad("oauth_create_api_key", "oauth_api_key_refused"),
        new KeyMintRefusedError(sanitizeVerificationMessage(h) ?? API_KEY_NOT_CREATED_MESSAGE, {
          cause: error,
        })
      );
    throw (logFeatureBad("oauth_create_api_key", "oauth_api_key_request_failed"), error);
  }
}
/**
 * 令牌是否已过期或 5 分钟内过期（expiresAt 为 null 视为不过期）。
 */
//@ chunk-aepeg2w5.js:302642-302710 facade-exports
function isOAuthTokenExpired(e, n = Date.now()) {
  if (e === null) return !1;
  return n + 300000 >= e;
}
//@ chunk-aepeg2w5.js:302710-302829 facade-exports = fetchProfileInfo (0.606)
var SUBSCRIPTION_TYPE_BY_ORG_TYPE = new Map([
  ["claude_max", "max"],
  ["claude_pro", "pro"],
  ["claude_enterprise", "enterprise"],
  ["claude_team", "team"],
]);
/**
 * organization_type → 订阅类型（claude_max→max、claude_pro→pro、claude_enterprise→enterprise、claude_team→team）。
 */
//@ chunk-aepeg2w5.js:302829-302888 facade-exports
function subscriptionTypeForOrganizationType(e) {
  return (e !== void 0 ? SUBSCRIPTION_TYPE_BY_ORG_TYPE.get(e) : void 0) ?? null;
}
//@ chunk-aepeg2w5.js:302888-302928 layout
var profileStampState = ge({ spent: !1 }, (e) => {
  e.spent = !1;
});
//@ chunk-aepeg2w5.js:302928-302995 layout
function consumeProfileStamp(e) {
  if (profileStampState.spent || !isUnmarkedStoredPlan(e)) return !1;
  return ((profileStampState.spent = !0), !0);
}
//@ chunk-aepeg2w5.js:302995-303750 layout
function reconcileSubscriptionType(e, n) {
  let r = e?.subscriptionType ?? null,
    s = e?.subscriptionTypeSource,
    h = r === null || s === "profile",
    y = isProvisionalProfilePlan(e),
    S = n?.subscriptionType ?? null,
    w = S !== null && n?.originStamped === !0 && (y || !isProfilePlanDowngrade(r, S));
  if (!h) {
    if (w && S !== r)
      return {
        subscriptionType: S,
        subscriptionTypeSource: "profile",
        subscriptionTypeVerifiedAt: Date.now(),
      };
    return s === "sign_in" || (w && S === r)
      ? { subscriptionType: r, subscriptionTypeSource: "sign_in" }
      : { subscriptionType: r };
  }
  if (w)
    return { subscriptionType: S, subscriptionTypeSource: "profile", subscriptionTypeVerifiedAt: Date.now() };
  if (r !== null && (!y || S === null))
    return {
      subscriptionType: r,
      subscriptionTypeSource: "profile",
      subscriptionTypeVerifiedAt: e?.subscriptionTypeVerifiedAt,
    };
  return S === null ? { subscriptionType: null } : { subscriptionType: S, subscriptionTypeSource: "profile" };
}
/**
 * 拉 OAuth profile 并提取 subscriptionType（由 organization_type 映射）、rateLimitTier、seatTier、hasExtraUsageEnabled、billingType 等。
 */
//@ chunk-aepeg2w5.js:303750-304677 facade-exports
async function fetchProfileInfo(e) {
  let n = await getOauthProfileWithOriginFromOauthToken(e),
    r = n?.profile,
    h = {
      subscriptionType: subscriptionTypeForOrganizationType(r?.organization?.organization_type),
      rateLimitTier: r?.organization?.rate_limit_tier ?? null,
      seatTier: r?.organization?.seat_tier ?? null,
      hasExtraUsageEnabled: r?.organization?.has_extra_usage_enabled ?? null,
      billingType: r?.organization?.billing_type ?? null,
      ccOnboardingFlags: r?.organization?.cc_onboarding_flags ?? {},
      claudeCodeTrialEndsAt: r?.organization?.claude_code_trial_ends_at ?? null,
      claudeCodeTrialDurationDays: r?.organization?.claude_code_trial_duration_days ?? null,
    };
  if (r?.account?.display_name) h.displayName = r.account.display_name;
  if (r?.account?.full_name) h.fullName = r.account.full_name;
  if (r?.account?.created_at) h.accountCreatedAt = r.account.created_at;
  if (r?.organization?.subscription_created_at)
    h.subscriptionCreatedAt = r.organization.subscription_created_at;
  return (
    logEvent("tengu_oauth_profile_fetch_success", {}),
    { ...h, rawProfile: r, originStamped: n?.stamped }
  );
}
/**
 * 组织 UUID：oauthAccount.organizationUuid，缺失时拉 profile。
 */
//@ chunk-aepeg2w5.js:304677-304931 facade-exports = getOrganizationUUID (0.873)
async function getOrganizationUUID() {
  let CLAUDE_CODE_ORGANIZATION_UUID = env.CLAUDE_CODE_ORGANIZATION_UUID;
  if (CLAUDE_CODE_ORGANIZATION_UUID) return CLAUDE_CODE_ORGANIZATION_UUID;
  let orgUUID = getGlobalConfig().oauthAccount?.organizationUuid;
  if (orgUUID) return orgUUID;
  let accessToken = getClaudeAIOAuthTokens()?.accessToken;
  if (accessToken === void 0 || !hasProfileScope()) return null;
  let profileOrgUUID = (await getOauthProfileFromOauthToken(accessToken))?.organization?.uuid;
  if (!profileOrgUUID) return null;
  return profileOrgUUID;
}
/**
 * oauthAccount 缺字段时拉 profile 补全（可覆盖 env 提供的账户信息）。
 */
//@ chunk-aepeg2w5.js:304931-306619 facade-exports = populateOAuthAccountInfoIfNeeded (0.733)
async function populateOAuthAccountInfoIfNeeded(e, n, r = !0) {
  let envAccountUuid = env.CLAUDE_CODE_ACCOUNT_UUID,
    envUserEmail = env.CLAUDE_CODE_USER_EMAIL,
    envOrganizationUuid = env.CLAUDE_CODE_ORGANIZATION_UUID,
    S =
      !isDiskless() && envAccountUuid && envUserEmail && envOrganizationUuid
        ? { accountUuid: envAccountUuid, emailAddress: envUserEmail, organizationUuid: envOrganizationUuid }
        : null;
  if (S && !getGlobalConfig().oauthAccount) storeOAuthAccountInfo(S, n);
  if (r) await checkAndRefreshOAuthTokenIfNeeded({ credentials: e, storageV5: n });
  else {
    let ee = await getClaudeAIOAuthTokensAsync(e);
    if (isOAuthTokenExpired(ee?.expiresAt ?? null)) return !1;
  }
  let w = getGlobalConfig(),
    R = w.oauthAccount?.profileFetchedAt,
    x = R !== void 0 && Date.now() - R < lv,
    config = getStoredOAuthTierVerifiedAt(),
    F =
      ev() &&
      (config === void 0
        ? getClaudeAIOAuthTokens()?.subscriptionType === null &&
          isClaudeAISubscriber() &&
          credentialIsOwnStoredLogin()
        : config === null || config > Date.now() || Date.now() - config >= lv);
  if (
    (w.oauthAccount &&
      w.oauthAccount.billingType !== void 0 &&
      w.oauthAccount.accountCreatedAt !== void 0 &&
      w.oauthAccount.subscriptionCreatedAt !== void 0 &&
      w.oauthAccount.ccOnboardingFlags !== void 0 &&
      x &&
      !F) ||
    !isClaudeAISubscriber() ||
    !hasProfileScope()
  )
    return !1;
  let tokens = getClaudeAIOAuthTokens();
  if (!tokens?.accessToken) return !1;
  let profile = await getOauthProfileWithOriginFromOauthToken(tokens.accessToken),
    j = profile?.profile;
  if (!j?.account || !j.organization) return !1;
  if (S) logForDebugging("OAuth profile fetch succeeded, overriding env var account info", { level: "info" });
  return (
    storeOAuthAccountInfo(
      {
        accountUuid: j.account.uuid,
        emailAddress: j.account.email,
        organizationUuid: j.organization.uuid,
        displayName: j.account.display_name || void 0,
        fullName: j.account.full_name || void 0,
        hasExtraUsageEnabled: j.organization.has_extra_usage_enabled ?? !1,
        billingType: j.organization.billing_type ?? void 0,
        accountCreatedAt: j.account.created_at,
        subscriptionCreatedAt: j.organization.subscription_created_at ?? void 0,
        ccOnboardingFlags: j.organization.cc_onboarding_flags ?? {},
        claudeCodeTrialEndsAt: j.organization.claude_code_trial_ends_at ?? null,
        claudeCodeTrialDurationDays: j.organization.claude_code_trial_duration_days ?? null,
        seatTier: j.organization.seat_tier ?? null,
        planDisplayName: getPlanDisplayName(j),
        profileFetchedAt: Date.now(),
      },
      n,
    ),
    await recordStoredLoginPlan(tokens, j, profile?.stamped === !0, e),
    !0
  );
}
//@ chunk-aepeg2w5.js:306619-307249 layout
async function recordStoredLoginPlan(e, n, r, s) {
  let h = e.subscriptionTypeSource === "profile" || isUnmarkedStoredPlan(e);
  if ((e.subscriptionType !== null && !h) || !e.refreshToken || !credentialIsOwnStoredLogin()) return;
  let y = subscriptionTypeForOrganizationType(n.organization.organization_type);
  if (y === null) return;
  let S = await backfillStoredOAuthTier({
    expectedRefreshToken: e.refreshToken,
    subscriptionType: y,
    rateLimitTier: n.organization.rate_limit_tier ?? null,
    verifiedAt: Date.now(),
    originStamped: r,
    credentials: s,
  });
  logForDebugging(
    S === "written"
      ? `OAuth: recorded the stored login plan (${y}) from the profile`
      : S === "reverified" || S === "confirmed"
        ? `OAuth: profile re-read confirms the stored login plan (${y}; ${S})`
        : `OAuth: stored login plan not recorded from the profile (${S})`,
  );
}
//@ chunk-aepeg2w5.js:307249-307324 layout
function getPlanDisplayName(e) {
  return credentialIsOwnStoredLogin()
    ? planDisplayNameFromProfile(e)
    : (getGlobalConfig().oauthAccount?.planDisplayName ?? null);
}
/**
 * 写全局配置 oauthAccount：accountUuid、emailAddress、organizationUuid、displayName、hasExtraUsageEnabled、billingType、accountCreatedAt、subscriptionCreatedAt、seatTier、planDisplayName 等。
 */
//@ chunk-aepeg2w5.js:307324-308809 facade-exports = storeOAuthAccountInfo (0.667)
function storeOAuthAccountInfo(
  {
    accountUuid: accountUuid,
    emailAddress: emailAddress,
    organizationUuid: organizationUuid,
    displayName: displayName,
    fullName: fullName,
    hasExtraUsageEnabled: hasExtraUsageEnabled,
    billingType: billingType,
    accountCreatedAt: accountCreatedAt,
    subscriptionCreatedAt: subscriptionCreatedAt,
    ccOnboardingFlags: ccOnboardingFlags,
    claudeCodeTrialEndsAt: claudeCodeTrialEndsAt,
    claudeCodeTrialDurationDays: claudeCodeTrialDurationDays,
    seatTier: seatTier,
    planDisplayName: planDisplayName,
    profileFetchedAt: profileFetchedAt,
  },
  ee,
) {
  let q = {
    accountUuid: accountUuid,
    emailAddress: emailAddress,
    organizationUuid: organizationUuid,
    hasExtraUsageEnabled: hasExtraUsageEnabled,
    billingType: billingType,
    accountCreatedAt: accountCreatedAt,
    subscriptionCreatedAt: subscriptionCreatedAt,
    ccOnboardingFlags: ccOnboardingFlags,
    claudeCodeTrialEndsAt: claudeCodeTrialEndsAt,
    claudeCodeTrialDurationDays: claudeCodeTrialDurationDays,
    seatTier: seatTier,
    planDisplayName: planDisplayName ?? void 0,
  };
  if (displayName) q.displayName = displayName;
  if (fullName) q.fullName = fullName;
  if (profileFetchedAt !== void 0) q.profileFetchedAt = profileFetchedAt;
  saveGlobalConfig((current) => {
    if (
      profileFetchedAt === void 0 &&
      current.oauthAccount?.accountUuid === q.accountUuid &&
      current.oauthAccount?.emailAddress === q.emailAddress &&
      current.oauthAccount?.organizationUuid === q.organizationUuid &&
      current.oauthAccount?.displayName === q.displayName &&
      current.oauthAccount?.fullName === q.fullName &&
      current.oauthAccount?.hasExtraUsageEnabled === q.hasExtraUsageEnabled &&
      current.oauthAccount?.billingType === q.billingType &&
      current.oauthAccount?.accountCreatedAt === q.accountCreatedAt &&
      current.oauthAccount?.subscriptionCreatedAt === q.subscriptionCreatedAt &&
      current.oauthAccount?.claudeCodeTrialEndsAt === q.claudeCodeTrialEndsAt &&
      current.oauthAccount?.claudeCodeTrialDurationDays === q.claudeCodeTrialDurationDays &&
      current.oauthAccount?.seatTier === q.seatTier &&
      current.oauthAccount?.planDisplayName === q.planDisplayName &&
      JSON.stringify(current.oauthAccount?.ccOnboardingFlags) === JSON.stringify(q.ccOnboardingFlags)
    )
      return current;
    return { ...current, oauthAccount: { ...current.oauthAccount, ...q } };
  }, ee);
}
//@ chunk-aepeg2w5.js:308809-309012 layout
function parseOAuthErrorBody(e) {
  if (!e || typeof e !== "object") return { code: void 0, description: void 0 };
  let n = e,
    error = n.error;
  return {
    code: typeof error === "string" ? error : error && typeof error === "object" ? error.type : void 0,
    description: n.error_description,
  };
}
//@ chunk-aepeg2w5.js:309012-309170 facade-exports = isTransientNetworkError (1)
function isAccountOnHoldError(error) {
  if (!Dt.isAxiosError(error) || !error.response) return !1;
  let status = error.response.status;
  if (status !== 400 && status !== 401 && status !== 403) return !1;
  return classifyOAuthErrorResponse(error.response.data) !== null;
}
//@ chunk-aepeg2w5.js:309170-309250 facade-exports = isTransientNetworkError (1)
function getAccountOnHoldErrorUrl(error) {
  return (
    (Dt.isAxiosError(error) ? classifyOAuthErrorResponse(error.response?.data) : null)?.url ??
    HTTPS_CLAUDE_AI_RESTRICTED
  );
}
/**
 * OAuth 错误是否为 invalid_grant（refresh token 失效）。
 */
//@ chunk-aepeg2w5.js:309250-309442 facade-exports
function isInvalidGrantError(e) {
  if (!Dt.isAxiosError(e) || !e.response) return !1;
  let status = e.response.status;
  if (status !== 400 && status !== 401) return !1;
  return (
    parseOAuthErrorBody(e.response.data).code === "invalid_grant" &&
    classifyOAuthErrorResponse(e.response.data) === null
  );
}
//@ chunk-aepeg2w5.js:309442-309566 facade-exports
function isInvalidScopeError(e) {
  if (!Dt.isAxiosError(e) || e.response?.status !== 400) return !1;
  return parseOAuthErrorBody(e.response.data).code === "invalid_scope";
}
//@ chunk-aepeg2w5.js:309566-309633 facade-exports = isTransientNetworkError (1)
function isOAuthTokenRequestRefused(error) {
  return Dt.isAxiosError(error) && isNonRetryableClientError(error.response?.status);
}
//@ chunk-aepeg2w5.js:309633-309706 layout
var FATAL_OAUTH_ERROR_CODES = new Set(["invalid_client", "invalid_scope", "unauthorized_client"]);
//@ chunk-aepeg2w5.js:309706-309850 facade-exports = isTransientNetworkError (1)
function isExpectedOAuthTokenError(error) {
  if (!Dt.isAxiosError(error) || error.response?.status !== 400) return !1;
  let { code: code } = parseOAuthErrorBody(error.response.data);
  return typeof code === "string" && FATAL_OAUTH_ERROR_CODES.has(code);
}
//@ chunk-aepeg2w5.js:309850-310009 layout
var TERMINAL_REFRESH_ERRORS = [
  "Refresh token expired",
  "Refresh token not found or invalid",
  "No organization associated with this token",
  "No account associated with this token",
  ACCOUNT_ON_HOLD,
];
//@ chunk-aepeg2w5.js:310009-310237 facade-exports
function extractOAuthErrorFields(e) {
  if (!Dt.isAxiosError(e) || !e.response) return {};
  let { code: code, description: description } = parseOAuthErrorBody(e.response.data);
  return {
    oauth_error_status: fromNumber(e.response.status),
    oauth_error_type: sanitizedOAuthErrorTypeForTelemetry(code),
    oauth_error_description: fromEnumOpt(TERMINAL_REFRESH_ERRORS.find((s) => s === description)),
  };
}
//@ chunk-aepeg2w5.js:310237-310369 facade-exports
async function restoreOAuthAccountAfterRefusedRefresh(e, n) {
  await saveGlobalConfig(
    (r) =>
      r.oauthAccount?.accountUuid === e.accountUuid && !isDeepStrictEqual(r.oauthAccount, e)
        ? { ...r, oauthAccount: e }
        : r,
    n,
  );
}

export {
  isOAuthTokenExpired,
  getOrganizationUUID,
  shouldUseClaudeAIAuth,
  isInvalidGrantError,
  isAccountOnHoldError,
  isExpectedOAuthTokenError,
  refreshOAuthToken,
  isInvalidScopeError,
  getAccountOnHoldErrorUrl,
  revokeOAuthToken,
  restoreOAuthAccountAfterRefusedRefresh,
  fetchProfileInfo,
  subscriptionTypeForOrganizationType,
  B3t,
  storeOAuthAccountInfo,
  SUBSCRIPTION_TYPE_BY_ORG_TYPE,
  populateOAuthAccountInfoIfNeeded,
  buildAuthUrl,
  exchangeCodeForTokens,
  parseScopes,
  resolveRefreshTokenExpiresAt,
  fetchAndStoreUserRoles,
  createAndStoreApiKey,
  revokeOAuthTokenAcknowledged,
};
