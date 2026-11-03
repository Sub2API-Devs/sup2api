/**
 * services/oauth/refusedSignIn.ts
 *
 * 2.1.316 新增：被拒绝的登录（组织固定、托管设置、提供商不允许等）回滚：恢复先前凭据、吊销新令牌、密钥链保存失败提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zbtr7f5k.js (34)
 * attribution: placement 34
 */
import {
  installOAuthTokens,
  clearAuthRelatedCaches,
  clearAccountScopedConfig,
} from "../../cli/handlers/auth.js";
import {
  saveOAuthTokensIfNeeded,
  clearOAuthTokenCache,
  OAUTH_TOKEN_SAVE_FAILED_WARNING,
  storedOAuthTokenEquals,
  hasStoredOAuthToken,
  withOAuthRefreshLock,
  OAuthRefreshLockContendedError,
  clearOAuthTokenMemos,
  getClaudeAIOAuthTokensAsync,
  getOauthAccountInfo,
} from "../../utils/auth.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import {
  getOauthTokenFromFd,
  setOauthTokenFromFd,
  setOauthTokenFromBgSnapshot,
  setLoginStashedInTokenSlot,
  isDiskless,
  setAuthenticatedAccount,
} from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import {
  WireSafeControlError,
  getErrnoCode,
  isFsInaccessible,
  isFsInaccessibleCode,
  storageCauseErrnoCode,
  sanitizeClassName,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  classifyAxiosError,
} from "../../utils/errors.js";
import { getPlatform } from "../../utils/platform.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { logEvent } from "../analytics/index.js";
import { PLAINTEXT_STORAGE_WARNING } from "../../utils/secureStorage/plainTextStorage.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";
import {
  fetchAndStoreUserRoles,
  shouldUseClaudeAIAuth,
  createAndStoreApiKey,
  revokeOAuthTokenAcknowledged,
} from "./client.js";
import { logForDebugging } from "../../utils/debug.js";
import { fetchAndStoreClaudeCodeFirstTokenDate } from "../api/firstTokenDate.js";
import { fetchBootstrapData } from "../api/bootstrap.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import { logError } from "../../utils/log.js";
import { performLogout } from "../../commands/logout/logout.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import {
  mutateEveryCredentialLeg,
  readEveryCredentialLeg,
} from "../../utils/secureStorage/credentialLegs.js";
import { READ_FAILED } from "../../utils/secureStorage/storageWriteLock.js";
import { responseHeaderFacts, extractServerErrorFields, stampedServerErrorType } from "../api/errorUtils.js";
import {
  refusalForOrgSubscription,
  isFlagFetchHeldNoTrust,
  isFallbackFlagUsable,
  isUnarmedFallback,
  isFlagSourceUntrusted,
  logOrgConfigGate,
  isGateBlocking,
} from "../policyLimits/orgConfigGate.js";
import {
  isRetryableHttpStatus,
  isExemptReason,
  orgConfigInputs,
  orgConfigCandidacy,
  orgConfigGateDecision,
} from "../policyLimits/orgConfigEligibility.js";
import { getOauthConfig, OAUTH_BETA_HEADER, isClaudeAiScopeSet } from "../../constants/oauth.js";
import { fetchPolicyLimitsResponse, L7r } from "../policyLimits/signedCache.js";
import { probeManagedSettingsForBearer } from "../remoteManagedSettings/loader.js";
import { classifyManagedConfigOutcome } from "../policyLimits/orgConfigRequired.js";
import {
  readOrgConfigRequiredFlagWithSource,
  fetchOrgConfigRequiredFlagServedToBearer,
} from "../policyLimits/orgConfigGateFlag.js";
import { isGrowthBookCacheEmpty } from "../analytics/growthbook.js";
import { qM } from "../../utils/startupFlagWait.js";
import { a_i } from "../remoteManagedSettings/storedLoginSurface.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { orgConfigGateMessage } from "../policyLimits/orgConfigGateMessages.js";

//@ chunk-zbtr7f5k.js:2222-2372 placement
var LOGIN_SAVE_FAILED = "Couldn't save your login. Try logging in again.",
  LOGIN_SAVE_FAILED_KEYCHAIN =
    "Couldn't save your login. If your Mac's keychain is locked, unlock it and log in again.";
/**
 * 保存登录凭据，失败时给出提示（macOS 钥匙串锁定等）。
 */
//@ chunk-zbtr7f5k.js:2372-3736 placement
async function saveLoginOrWarn(e, { storageV5: r, credentials: n, clock: f } = {}) {
  let o = await installOAuthTokens(e, { storageV5: r, credentials: n }),
    { result: s, locked: locked } = await warnNoRefreshLock(
      () => saveOAuthTokensIfNeeded(e, n, "sign_in"),
      n,
      { clock: f },
    ),
    y = locked ? s.replaced : void 0,
    A = isBgSession() && !locked && s.replaced !== void 0;
  if ((clearOAuthTokenCache(), process.env.CLAUDE_CODE_OAUTH_TOKEN))
    if (s.success) delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    else process.env.CLAUDE_CODE_OAUTH_TOKEN = e.accessToken;
  if (getOauthTokenFromFd())
    (setOauthTokenFromFd(s.success ? null : e.accessToken), setOauthTokenFromBgSnapshot(!1));
  if (
    (setLoginStashedInTokenSlot(s.success ? null : e.accessToken),
    "transient" in s && s.transient === !0 && !env.CLAUDE_CODE_OAUTH_TOKEN && !getOauthTokenFromFd())
  )
    throw new WireSafeControlError(
      getPlatform() === "macos" ? LOGIN_SAVE_FAILED_KEYCHAIN : LOGIN_SAVE_FAILED,
    );
  if (isStorageV5Enabled() && n !== void 0) await Q(n);
  let { warning: warning } = s;
  if (warning)
    logEvent("tengu_oauth_storage_warning", {
      warning:
        warning === PLAINTEXT_STORAGE_WARNING || warning === OAUTH_TOKEN_SAVE_FAILED_WARNING
          ? fromEnum(warning)
          : lit("other"),
    });
  if (
    (await fetchAndStoreUserRoles(e.accessToken, r).catch((u) =>
      logForDebugging(String(u), { level: "error" }),
    ),
    shouldUseClaudeAIAuth(e.scopes))
  )
    await fetchAndStoreClaudeCodeFirstTokenDate(r, n).catch((u) =>
      logForDebugging(String(u), { level: "error" }),
    );
  else if (!(await createAndStoreApiKey(e.accessToken, r)))
    throw Error("Unable to create API key. The server accepted the request but did not return a key.");
  return (
    await isSameAccount({ storageV5: r, credentials: n, ...o }),
    {
      storage: {
        success: s.success,
        backendName: s.backendName,
        transient: s.transient,
        fallbackWritten: s.fallbackWritten,
        landedToken: { accessToken: e.accessToken, refreshToken: e.refreshToken, clientId: e.clientId },
        ...(y !== void 0 && { replacedLogin: y }),
        ...(A && { replacedLoginUnrestorable: A }),
        sessionAuth:
          s.success || storedOAuthTokenEquals(e.accessToken)
            ? "fresh"
            : hasStoredOAuthToken()
              ? "previous"
              : "none",
      },
    }
  );
}
//@ chunk-zbtr7f5k.js:5302-5534 placement
async function isSameAccount({
  storageV5: storageV5,
  credentials: credentials,
  preserveQuotaAutoResume: preserveQuotaAutoResume = !1,
  incomingIdentity: incomingIdentity,
}) {
  if (
    (await clearAuthRelatedCaches(storageV5, {
      preserveQuotaAutoResume: preserveQuotaAutoResume,
      artifactAccount: "same_account",
      incomingIdentity: incomingIdentity,
    }),
    isStorageV5Enabled() && credentials !== void 0)
  )
    await Q(credentials);
  await fetchBootstrapData(storageV5, credentials);
}
//@ chunk-zbtr7f5k.js:5534-5543 placement
var se = 3;
//@ chunk-zbtr7f5k.js:5543-6062 placement
async function warnNoRefreshLock(e, r, { withoutLock: n, clock: f } = {}) {
  if (!isBgSession() || isDiskless()) return { result: await e(), locked: !1 };
  for (let o = 1; ; o++) {
    let s = !1;
    try {
      return await withOAuthRefreshLock(async ({ isCompromised: isCompromised }) => {
        let y = !isCompromised();
        if (!y && n !== void 0) return { result: n(), locked: !1 };
        return ((s = !0), { result: await e(), locked: y && !isCompromised() });
      }, r);
    } catch (error) {
      if (s) throw error;
      if (error instanceof OAuthRefreshLockContendedError && o < se) {
        await sleep(100 * o, void 0, { clock: f });
        continue;
      }
      return (
        logForDebugging(`OAuth: no refresh lock for a credential write (${E(error)})`, { level: "warn" }),
        n !== void 0 ? { result: n(), locked: !1 } : { result: await e(), locked: !1 }
      );
    }
  }
}
//@ chunk-zbtr7f5k.js:6062-6100 placement
async function Q(e) {
  (clearOAuthTokenMemos(), await getClaudeAIOAuthTokensAsync(e));
}
//@ chunk-zbtr7f5k.js:6100-6581 placement
var ROLLBACK_UNCONFIRMED_TEXT =
    "The refused sign-in could not be fully undone: this machine's previous sign-in state could not be confirmed restored, and the refused sign-in was revoked. Sign in again (claude auth login, or /login).",
  le =
    "The refused sign-in could not be fully undone: this machine's previous sign-in state could not be confirmed restored, and the refused sign-in may still be valid. Sign in again (claude auth login, or /login), and ask your admin to revoke it if this device is shared.";
//@ chunk-zbtr7f5k.js:6581-6620 placement
function fnn(e) {
  return e.revoked ? ROLLBACK_UNCONFIRMED_TEXT : le;
}
//@ chunk-zbtr7f5k.js:6620-6677 placement
function de(e) {
  return (
    getErrnoCode(e) === "ELOCKED" || isFsInaccessible(e) || isFsInaccessibleCode(storageCauseErrnoCode(e))
  );
}
//@ chunk-zbtr7f5k.js:6677-6763 placement
function E(e) {
  return sanitizeClassName(e instanceof Error ? e.name : void 0) ?? (e === null ? "null" : typeof e);
}
//@ chunk-zbtr7f5k.js:6763-7005 placement
function logRollbackFailure(e, r) {
  if (de(e)) {
    logForDebugging(
      `Rolling back a refused sign-in failed (${r}; ${E(e)}: ${getErrnoCode(e) ?? storageCauseErrnoCode(e) ?? "no errno"})`,
      { level: "error" },
    );
    return;
  }
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Rolling back a refused sign-in threw (${r}: ${E(e)})`,
      "Rolling back a refused sign-in threw",
    ),
  );
}
/**
 * 回滚被拒绝的登录：恢复之前的凭据或登出，必要时清除环境令牌说明。
 */
//@ chunk-zbtr7f5k.js:7005-8191 placement
async function rollbackRefusedSignIn(e, { storageV5: storageV5, credentials: credentials, clock: clock }) {
  if (e === void 0 || (e.success && !isBgSession()))
    return (
      await performLogout({
        clearOnboarding: !1,
        preserveNonAnthropicAuth: !0,
        storageV5: storageV5,
        credentials: credentials,
      }),
      { restored: !0, revoked: !0 }
    );
  (env.unset("CLAUDE_CODE_OAUTH_TOKEN"),
    setOauthTokenFromFd(null),
    setAuthenticatedAccount(null),
    clearOAuthTokenCache());
  let landedToken = e.landedToken,
    s = !0,
    p = !1;
  if (landedToken !== void 0) {
    let y =
        landedToken.refreshToken !== null && getAPIProvider() === "firstParty"
          ? landedToken.refreshToken
          : null,
      A = getSecureStorage();
    try {
      let replacedLogin = e.replacedLogin,
        u = replacedLogin === void 0;
      if (replacedLogin !== void 0) {
        let h = await warnNoRefreshLock(
          () => restorePreviousCredentials(A, landedToken.accessToken, replacedLogin, credentials, clock),
          credentials,
          { withoutLock: () => !1, clock: clock },
        );
        u = h.locked && h.result;
      }
      if (u)
        await mutateEveryCredentialLeg(
          A,
          (h) => {
            if (h.claudeAiOauth?.accessToken !== landedToken.accessToken) return h;
            let { claudeAiOauth: claudeAiOauth, ...P } = h;
            return P;
          },
          credentials,
        );
      let T = await readEveryCredentialLeg(A, (h) => h.claudeAiOauth?.accessToken, credentials);
      s =
        u &&
        !T.some(
          (h) =>
            h.value === READ_FAILED ||
            h.value === landedToken.accessToken ||
            (isBgSession() && h.value !== void 0 && h.value !== replacedLogin?.accessToken),
        );
    } catch (error) {
      (logRollbackFailure(error, "credential store"), (s = !1));
    } finally {
      if (y !== null)
        try {
          p = await revokeOAuthTokenAcknowledged(y, landedToken.clientId);
        } catch (error) {
          logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Revoking a refused sign-in's token threw (${E(error)})`,
              "Revoking a refused sign-in's token threw",
            ),
          );
        }
    }
  }
  return (
    await clearAuthRelatedCaches(storageV5, {
      artifactAccount: hasStoredOAuthToken() ? "account_switch" : "signed_out",
      credentials: credentials,
    }),
    await clearAccountScopedConfig(storageV5),
    { restored: s && e.replacedLoginUnrestorable !== !0, revoked: p }
  );
}
//@ chunk-zbtr7f5k.js:8191-8432 placement
async function restorePreviousCredentials(store, newAccessToken, previous, storage, clock) {
  for (let s = 0; s < 3; s++) {
    if (s > 0) await sleep(100 * s, void 0, { clock: clock });
    try {
      if (
        (
          await store.mutate(
            (y) => (y.claudeAiOauth?.accessToken === newAccessToken ? { ...y, claudeAiOauth: previous } : y),
            storage,
          )
        ).success
      )
        return !0;
    } catch (error) {
      logRollbackFailure(error, "credential store");
    }
  }
  return !1;
}
//@ chunk-zbtr7f5k.js:8432-8710 placement
async function LOGIN_REFUSAL_REASONS(e, r, n) {
  switch (e.reason) {
    case "org_pin_mismatch":
    case "org_verify_failed":
    case "managed_settings_invalid":
      break;
    case "org_pin_api_key_conflict":
    case "provider_not_allowed":
      return;
  }
  try {
    return await rollbackRefusedSignIn(r, n);
  } catch (error) {
    return (logRollbackFailure(error, "sign-out"), { restored: !1, revoked: !1 });
  }
}
/**
 * 描述 OAuth 错误响应：是否有结构化错误、是否带 request-id、是否为 HTML 页面、错误类型与代码。
 */
//@ chunk-zbtr7f5k.js:8710-9116 placement
function describeOAuthErrorResponse(e) {
  let r = e !== null && typeof e === "object" && e.isAxiosError === !0 ? e.response : void 0;
  if (r === void 0) return { hasSchema: !1, requestIdPresent: !1, htmlPage: !1 };
  let n = responseHeaderFacts(r.headers ?? {}),
    f = extractServerErrorFields(e),
    o = stampedServerErrorType({ serverErrorType: f.serverErrorType, serverErrorStamped: !0 });
  return {
    hasSchema: o !== void 0,
    requestIdPresent: n.requestIdPresent === !0,
    htmlPage: n.responseContentType === "html",
    errorType: o,
    errorCode: f.serverErrorCode,
  };
}
//@ chunk-zbtr7f5k.js:9116-10061 placement
function classifyOAuthError(e) {
  let { kind: kind, status: status } = classifyAxiosError(e),
    f = describeOAuthErrorResponse(e),
    o =
      f.hasSchema && f.requestIdPresent
        ? refusalForOrgSubscription(
            status,
            f.errorType,
            f.errorCode,
            extractServerErrorFields(e).serverAuthDenial,
          )
        : void 0;
  switch (kind) {
    case "auth":
      if (o !== void 0) return { reason: o, httpStatus: status };
      if (!f.hasSchema || !f.requestIdPresent || f.htmlPage)
        return { reason: "blocked_by_intermediary", httpStatus: status };
      if (status === 401) return { reason: "unavailable_credential_refresh", httpStatus: status };
      return { reason: "refused_not_entitled", httpStatus: status };
    case "timeout":
      return { reason: "unavailable_timeout" };
    case "network":
      return { reason: "unavailable_connect" };
    case "http":
      if (status === void 0) return { reason: "unavailable_connect" };
      if (status >= 500) return { reason: "unavailable_server", httpStatus: status };
      if (status >= 300 && status < 400) return { reason: "blocked_by_intermediary", httpStatus: status };
      if (isRetryableHttpStatus(status)) return { reason: "unavailable_rate_limited", httpStatus: status };
      if (status === 407 || o === void 0) return { reason: "blocked_by_intermediary", httpStatus: status };
      return { reason: o, httpStatus: status };
    case "other":
      return { reason: "client_error" };
  }
}
//@ chunk-zbtr7f5k.js:10061-10249 placement
function logProbeClientError(e, r) {
  if (e !== "client_error") return;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `org-config login probe threw before reaching the transport (${E(r)})`,
      "org-config login probe threw before reaching the transport",
    ),
  );
}
//@ chunk-zbtr7f5k.js:10249-11386 placement
async function fetchOAuthProfile(e, r, n = {}) {
  let f = n.baseApiUrl ?? getOauthConfig().BASE_API_URL,
    o = { Authorization: `Bearer ${e}`, "anthropic-beta": OAUTH_BETA_HEADER },
    s = { hasAdmittedCache: !1 },
    p = (async () => {
      try {
        let u = await (n.requestPolicy ?? fetchPolicyLimitsResponse)({
          endpoint: L7r(f),
          authHeaders: o,
          timeoutMs: r,
          signal: AbortSignal.timeout(r),
          acceptAny2xx: !0,
        });
        if (u.kind === "not_modified" || !u.contentType.includes("json") || !u.requestIdPresent)
          return { outcome: { ...s, reason: "blocked_by_intermediary" } };
        return { outcome: { ...s, reason: "ok" } };
      } catch (error) {
        let { reason: reason, httpStatus: httpStatus } = classifyOAuthError(error);
        return (
          logProbeClientError(reason, error),
          {
            outcome: { ...s, reason: reason, ...(httpStatus !== void 0 && { httpStatus: httpStatus }) },
            httpStatus: httpStatus,
          }
        );
      }
    })(),
    y = (async () => {
      try {
        let {
          status: status,
          contentType: contentType,
          requestIdPresent: requestIdPresent,
        } = await (n.requestSettings ?? probeManagedSettingsForBearer)(e, { timeoutMs: r });
        if (!requestIdPresent || status === 304 || (status === 200 && !contentType.includes("json")))
          return {
            outcome: { ...s, reason: "blocked_by_intermediary", httpStatus: status },
            httpStatus: status,
          };
        return { outcome: { ...s, reason: status === 404 || status === 204 ? "none_configured" : "ok" } };
      } catch (error) {
        let { reason: reason, httpStatus: httpStatus } = classifyOAuthError(error);
        return (
          logProbeClientError(reason, error),
          {
            outcome: { ...s, reason: reason, ...(httpStatus !== void 0 && { httpStatus: httpStatus }) },
            httpStatus: httpStatus,
          }
        );
      }
    })(),
    [A, _] = await Promise.all([p, y]);
  return { policy: A.outcome, settings: _.outcome, httpStatus: A.httpStatus ?? _.httpStatus };
}
//@ chunk-zbtr7f5k.js:11386-11611 placement
function loginIdentity(e) {
  return {
    accountUuid: e.profile?.account?.uuid ?? e.tokenAccount?.uuid,
    organizationUuid: e.profile?.organization?.uuid ?? e.tokenAccount?.organizationUuid,
    email: e.profile?.account?.email ?? e.tokenAccount?.emailAddress,
  };
}
/**
 * 判断登录后是否需要核实账号资料（claude.ai scope 且资料或订阅类型未确认）。
 */
//@ chunk-zbtr7f5k.js:11611-11774 placement
function needsProfileVerification(e) {
  return (
    isClaudeAiScopeSet(e.scopes) &&
    (e.profile === void 0 ||
      e.subscriptionType === null ||
      (e.subscriptionTypeSource === "profile" && e.subscriptionTypeVerifiedAt === void 0))
  );
}
//@ chunk-zbtr7f5k.js:11774-11924 placement
function normalizeSettingsDecision(e, r) {
  let { reason: reason } = e.settings;
  if (classifyManagedConfigOutcome(reason) === "refused" && !isExemptReason(r, reason)) return e;
  return { ...e, settings: { hasAdmittedCache: !1, reason: "not_attempted" } };
}
/**
 * 检查新登录是否被允许（组织固定、托管设置、API key 冲突、提供商、层级），约 3.6 KB。
 */
//@ chunk-zbtr7f5k.js:11924-15547 placement
async function checkLoginAllowed(e) {
  let r = () =>
      e.readFlag !== void 0
        ? { flag: e.readFlag(), source: e.readFlagSource?.() ?? "override" }
        : readOrgConfigRequiredFlagWithSource(),
    n = e.startupGateFollows === !0,
    f = !n || e.untieredLogin === !0,
    { flag: flag, source: source } = r(),
    p = e.isFlagFetchHeld ?? isFlagFetchHeldNoTrust,
    y = e.isFlagCacheEmpty ?? isGrowthBookCacheEmpty;
  if (!flag.enabled && isFallbackFlagUsable(source, p, y) && n) return { ok: !0 };
  let _ = (e.readCandidateInputs ?? orgConfigInputs)({ authRecoveryCommand: !1 }),
    newLogin = e.newLogin,
    T =
      e.untieredLogin === !0
        ? {
            ..._,
            hostToken: !1,
            tier: null,
            credentialShape: "untiered_login",
            storedLoginOrigin: !0,
            tierVerifiedAtMs: void 0,
          }
        : newLogin !== void 0
          ? {
              ..._,
              hostToken: !1,
              tier: newLogin.subscriptionType,
              credentialShape: !isClaudeAiScopeSet(newLogin.scopes)
                ? "api_key"
                : newLogin.subscriptionType === null
                  ? "untiered_login"
                  : "stored_login",
              storedLoginOrigin: !0,
              tierVerifiedAtMs:
                newLogin.subscriptionTypeSource === "profile"
                  ? (newLogin.subscriptionTypeVerifiedAt ?? null)
                  : void 0,
            }
          : { ..._, hostToken: !1 },
    h = e.untieredLogin === !0,
    R = (O) =>
      h ? { ...T, tier: O.plans[0] ?? "team", credentialShape: "stored_login", tierVerifiedAtMs: void 0 } : T,
    P = (O) => {
      let L = e.newLogin === void 0 ? getOauthAccountInfo() : void 0,
        z =
          e.newLogin !== void 0
            ? loginIdentity(e.newLogin)
            : { accountUuid: L?.accountUuid, organizationUuid: L?.organizationUuid, email: L?.emailAddress },
        re = z.accountUuid === void 0 && z.organizationUuid === void 0;
      return withDeadline(
        (e.fetchServedFlag ?? fetchOrgConfigRequiredFlagServedToBearer)(e.accessToken, z, O).catch(() => {
          return;
        }),
        O,
      ).then((D) =>
        D !== void 0 && re && !(D.flag.enabled && orgConfigCandidacy(D.flag, R(D.flag)).candidate)
          ? void 0
          : D,
      );
    },
    w = orgConfigCandidacy(flag, R(flag)),
    U = "no";
  if (isUnarmedFallback({ armed: flag.enabled && w.candidate, flagSource: source, candidacy: w }, p, y)) {
    let O = await P(Math.min(flag.budgetMs, qM));
    ((U = O !== void 0 ? "served" : "nothing_in_time"),
      ({ flag: flag, source: source } = O ?? r()),
      (w = orgConfigCandidacy(flag, R(flag))));
  }
  let B = !n && source !== "override" && source !== "disabled" && !p();
  if (B && U === "no" && !w.candidate && isRolloutRefusal(w.exclusion)) {
    let O = await P(Math.min(flag.budgetMs, qM));
    if (((U = O !== void 0 ? "served" : "nothing_in_time"), O !== void 0))
      (({ flag: flag, source: source } = O), (w = orgConfigCandidacy(flag, R(flag))));
  }
  if (!flag.enabled || !w.candidate) return { ok: !0 };
  let startTime = performance.now(),
    q = U !== "served" && (B || isFlagSourceUntrusted(source, p, y)) ? P(flag.budgetMs) : void 0,
    N = e.tokenUsedElsewhere !== !0 && a_i(),
    G = await (e.probe ?? fetchOAuthProfile)(e.accessToken, flag.budgetMs),
    v = N ? normalizeSettingsDecision(G, flag) : G,
    S = orgConfigGateDecision({
      flag: flag,
      candidacy: w,
      policy: v.policy,
      settings: v.settings,
      surface: "login",
      blockedMs: Math.max(0, Math.round(performance.now() - startTime)),
    });
  if (S.verdict !== "pass" && q !== void 0) {
    let O = (await q) ?? { flag: flag, source: source },
      L = orgConfigCandidacy(O.flag, R(O.flag));
    if (!O.flag.enabled || !L.candidate)
      return (
        logForDebugging(
          `org-config gate (login): policy=${v.policy.reason} settings=${v.settings.reason} \u2192 released by the served flag`,
        ),
        { ok: !0 }
      );
    if (((flag = O.flag), (source = O.source), (w = L), N)) v = normalizeSettingsDecision(G, flag);
    S = orgConfigGateDecision({
      flag: flag,
      candidacy: w,
      policy: v.policy,
      settings: v.settings,
      surface: "login",
      blockedMs: Math.max(0, Math.round(performance.now() - startTime)),
    });
  }
  if ((e.reprobeUnavailableOnce === !0 || f) && S.verdict === "blocked" && isUnavailableReason(S.reason)) {
    let O = flag.budgetMs - Math.max(0, Math.round(performance.now() - startTime));
    if (O > 0) {
      if (((v = await (e.probe ?? fetchOAuthProfile)(e.accessToken, O)), N))
        v = normalizeSettingsDecision(v, flag);
      S = orgConfigGateDecision({
        flag: flag,
        candidacy: w,
        policy: v.policy,
        settings: v.settings,
        surface: "login",
        blockedMs: Math.max(0, Math.round(performance.now() - startTime)),
      });
    }
  }
  let M = e.organizationName ?? (newLogin !== void 0 ? void 0 : getOauthAccountInfo()?.organizationName),
    W = { policy: v.policy, settings: v.settings },
    K = {
      organizationName: M === void 0 || M === null ? void 0 : stripControlChars(M),
      httpStatus: S.resource === void 0 ? void 0 : (W[S.resource].httpStatus ?? v.httpStatus),
    },
    F = {
      decision: S,
      message: orgConfigGateMessage(S, K),
      flag: flag,
      flagSource: source,
      candidacy: w,
      armed: !0,
      context: K,
      attempt: 0,
      decidedWithoutWaiting: !1,
      outcomes: W,
    };
  if (
    (await (e.report ?? ((O) => logOrgConfigGate(O, O.outcomes)))(F),
    logForDebugging(
      `org-config gate (login): policy=${v.policy.reason} settings=${v.settings.reason} \u2192 ${S.verdict}`,
    ),
    !isGateBlocking(S))
  )
    return { ok: !0, evaluation: F };
  if (S.verdict === "blocked" && !f) return { ok: !0, evaluation: F, warning: unverifiedSettingsNotice(F) };
  return {
    ok: !1,
    evaluation: F,
    message:
      F.message ??
      "Claude Code couldn't load your organization's settings, which it requires before this sign-in can be used.",
  };
}
/**
 * 登录成功但未能核实组织设置时的提示文字。
 */
//@ chunk-zbtr7f5k.js:15547-15745 placement
function unverifiedSettingsNotice(e) {
  let { reason: reason } = e.decision;
  return `Signed in. Claude Code couldn't verify your organization's settings yet${reason !== void 0 ? ` (${describeUnavailableReason(reason)})` : ""}; it will check again when you start a session.`;
}
//@ chunk-zbtr7f5k.js:15745-16506 placement
async function mintApiKeyIfAllowed(e) {
  let { minted: minted, ...n } = e,
    f = e.readCandidateInputs ?? orgConfigInputs,
    o = await checkLoginAllowed({
      ...n,
      newLogin: minted,
      untieredLogin: needsProfileVerification(minted),
      startupGateFollows: !1,
      reprobeUnavailableOnce: !0,
      tokenUsedElsewhere: !0,
      organizationName:
        e.organizationName ?? minted.profile?.organization?.name ?? minted.tokenAccount?.organizationName,
      readCandidateInputs: (y) => ({ ...f(y), provider: "firstParty", firstPartyBaseUrl: !0 }),
    });
  if (o.ok) return o;
  let s = await describeWithheldMint({ accessToken: e.accessToken, ...minted }, "withheld mint", e.revoke);
  if (o.evaluation.decision.verdict === "refused")
    return { ok: !1, evaluation: o.evaluation, message: `${o.message} ${ne(s)}` };
  let { reason: reason } = o.evaluation.decision;
  return {
    ok: !1,
    evaluation: o.evaluation,
    message: `Couldn't verify your organization's settings${reason !== void 0 ? ` (${describeUnavailableReason(reason)})` : ""}. ${describeNetworkUnavailable(reason)}. ${ne(s)}`,
  };
}
//@ chunk-zbtr7f5k.js:16506-16682 placement
var TOKEN_REVOKED_NOTE = "Anthropic reported the token revoked; it was not shown.",
  TOKEN_NOT_REVOKED_NOTE =
    "The token could not be confirmed revoked and was not shown \u2014 ask your admin to revoke it in Console.";
//@ chunk-zbtr7f5k.js:16682-16712 placement
function ne(e) {
  return e ? TOKEN_REVOKED_NOTE : TOKEN_NOT_REVOKED_NOTE;
}
//@ chunk-zbtr7f5k.js:16712-17243 placement
function describeNetworkUnavailable(e) {
  switch (e) {
    case "unavailable_connect":
    case "unavailable_timeout":
      return "Retry when the network is available";
    case "blocked_by_intermediary":
      return "A network proxy or gateway answered instead of Anthropic \u2014 retry from a network that reaches it directly";
    case "unavailable_settings_unusable":
      return "Ask an admin to fix the organization's managed settings, then retry";
    case "unavailable_server":
    case "unavailable_rate_limited":
    case "unavailable_credential_refresh":
    case "unavailable_pending":
    default:
      return "Retry shortly";
  }
}
/**
 * 吊销被拒绝登录的令牌并说明结果。
 */
//@ chunk-zbtr7f5k.js:17243-17527 placement
async function revokeRefusedSignInToken(e) {
  return (await describeWithheldMint(e, "refused sign-in"))
    ? "Anthropic reported the new sign-in revoked; your previous login is unchanged."
    : "The new sign-in could not be confirmed revoked \u2014 ask your admin to revoke it if this device is shared; your previous login is unchanged.";
}
//@ chunk-zbtr7f5k.js:17527-17835 placement
async function describeWithheldMint(e, r, n = revokeOAuthTokenAcknowledged) {
  if (r !== "withheld mint" && getAPIProvider() !== "firstParty") return !1;
  let f = e.refreshToken ?? null;
  try {
    return await n(f ?? e.accessToken, e.clientId, f !== null ? "refresh_token" : "access_token");
  } catch (error) {
    return (
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Revoking a ${r}'s grant threw (${E(error)})`,
          "Revoking an uninstalled grant threw",
        ),
      ),
      !1
    );
  }
}
//@ chunk-zbtr7f5k.js:17835-17948 placement
function isRolloutRefusal(e) {
  switch (e) {
    case "flag_off":
    case "tier_not_in_plans":
    case "rollout_percent":
      return !0;
    default:
      return !1;
  }
}
//@ chunk-zbtr7f5k.js:17948-18171 placement
function isUnavailableReason(e) {
  switch (e) {
    case "unavailable_timeout":
    case "unavailable_connect":
    case "unavailable_server":
    case "unavailable_rate_limited":
    case "unavailable_credential_refresh":
    case "unavailable_pending":
      return !0;
    default:
      return !1;
  }
}
//@ chunk-zbtr7f5k.js:18171-18820 placement
function describeUnavailableReason(e) {
  switch (e) {
    case "unavailable_timeout":
      return "timed out";
    case "unavailable_connect":
      return "could not connect";
    case "unavailable_server":
      return "Anthropic returned an error";
    case "unavailable_rate_limited":
      return "asked to retry shortly";
    case "unavailable_credential_refresh":
      return "sign-in not yet accepted";
    case "blocked_by_intermediary":
      return "a network proxy answered instead of Anthropic";
    case "unavailable_pending":
      return "still loading";
    case "unavailable_settings_unusable":
      return "the published settings could not be applied";
    case "not_attempted":
      return "not loaded in the mode this process was launched in";
    default:
      return "not yet available";
  }
}
/**
 * 把登录后的设置检查结果归类为被拒、本模式未加载或不可用。
 */
//@ chunk-zbtr7f5k.js:18820-18964 placement
function loginSettingsOutcome(e) {
  let { verdict: verdict, reason: reason } = e.decision;
  return verdict === "refused"
    ? "refused"
    : reason === "not_attempted"
      ? "not_loaded_in_launch_mode"
      : "unavailable";
}
//@ chunk-zbtr7f5k.js:18964-19157 placement
class OrgConfigLoginRefusedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  evaluation;
  constructor(e, r) {
    super(e, "OrgConfigLoginRefusedError: the org-config gate refused a completed sign-in");
    this.evaluation = r;
    this.name = "OrgConfigLoginRefusedError";
  }
}

export {
  revokeRefusedSignInToken,
  saveLoginOrWarn,
  rollbackRefusedSignIn,
  logRollbackFailure,
  mintApiKeyIfAllowed,
  OrgConfigLoginRefusedError,
  describeWithheldMint,
  checkLoginAllowed,
  needsProfileVerification,
  loginSettingsOutcome,
  LOGIN_REFUSAL_REASONS,
  fnn,
  isSameAccount,
  unverifiedSettingsNotice,
};
