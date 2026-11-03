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
import { fetchPolicyLimitsResponse, policyLimitsUrl } from "../policyLimits/signedCache.js";
import { probeManagedSettingsForBearer } from "../remoteManagedSettings/loader.js";
import { classifyManagedConfigOutcome } from "../policyLimits/orgConfigRequired.js";
import {
  readOrgConfigRequiredFlagWithSource,
  fetchOrgConfigRequiredFlagServedToBearer,
} from "../policyLimits/orgConfigGateFlag.js";
import { isGrowthBookCacheEmpty } from "../analytics/growthbook.js";
import { EVENT_LOGGING_FLAG_WAIT_MS } from "../../utils/startupFlagWait.js";
import { isStoredLoginSurfaceShortcut } from "../remoteManagedSettings/storedLoginSurface.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { orgConfigGateMessage } from "../policyLimits/orgConfigGateMessages.js";

//@ chunk-zbtr7f5k.js:2222-2372 placement
var LOGIN_SAVE_FAILED = "Couldn't save your login. Try logging in again.";
var LOGIN_SAVE_FAILED_KEYCHAIN =
  "Couldn't save your login. If your Mac's keychain is locked, unlock it and log in again.";
//@ chunk-zbtr7f5k.js:2372-3736 placement
/**
 * 保存登录凭据，失败时给出提示（macOS 钥匙串锁定等）。
 */
async function saveLoginOrWarn(tokens, { storageV5: r, credentials, clock: f } = {}) {
  let o = await installOAuthTokens(tokens, {
    storageV5: r,
    credentials,
  });
  let { result: s, locked } = await warnNoRefreshLock(
    () => saveOAuthTokensIfNeeded(tokens, credentials, "sign_in"),
    credentials,
    {
      clock: f,
    },
  );
  let replaced = locked ? s.replaced : undefined;
  let A = isBgSession() && !locked && s.replaced !== undefined;
  clearOAuthTokenCache();
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN)
    if (s.success) delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    else process.env.CLAUDE_CODE_OAUTH_TOKEN = tokens.accessToken;
  if (getOauthTokenFromFd()) {
    setOauthTokenFromFd(s.success ? null : tokens.accessToken);
    setOauthTokenFromBgSnapshot(false);
  }
  setLoginStashedInTokenSlot(s.success ? null : tokens.accessToken);
  if ("transient" in s && s.transient === true && !env.CLAUDE_CODE_OAUTH_TOKEN && !getOauthTokenFromFd())
    throw new WireSafeControlError(
      getPlatform() === "macos" ? LOGIN_SAVE_FAILED_KEYCHAIN : LOGIN_SAVE_FAILED,
    );
  if (isStorageV5Enabled() && credentials !== undefined) await refreshClaudeAITokens(credentials);
  let { warning } = s;
  if (warning)
    logEvent("tengu_oauth_storage_warning", {
      warning:
        warning === PLAINTEXT_STORAGE_WARNING || warning === OAUTH_TOKEN_SAVE_FAILED_WARNING
          ? fromEnum(warning)
          : lit("other"),
    });
  await fetchAndStoreUserRoles(tokens.accessToken, r).catch((error) =>
    logForDebugging(String(error), {
      level: "error",
    }),
  );
  if (shouldUseClaudeAIAuth(tokens.scopes))
    await fetchAndStoreClaudeCodeFirstTokenDate(r, credentials).catch((error) =>
      logForDebugging(String(error), {
        level: "error",
      }),
    );
  else if (!(await createAndStoreApiKey(tokens.accessToken, r)))
    throw Error("Unable to create API key. The server accepted the request but did not return a key.");
  await isSameAccount({
    storageV5: r,
    credentials,
    ...o,
  });
  return {
    storage: {
      success: s.success,
      backendName: s.backendName,
      transient: s.transient,
      fallbackWritten: s.fallbackWritten,
      landedToken: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        clientId: tokens.clientId,
      },
      ...(replaced !== undefined && {
        replacedLogin: replaced,
      }),
      ...(A && {
        replacedLoginUnrestorable: A,
      }),
      sessionAuth:
        s.success || storedOAuthTokenEquals(tokens.accessToken)
          ? "fresh"
          : hasStoredOAuthToken()
            ? "previous"
            : "none",
    },
  };
}
//@ chunk-zbtr7f5k.js:5302-5534 placement
async function isSameAccount({ storageV5, credentials, preserveQuotaAutoResume = false, incomingIdentity }) {
  await clearAuthRelatedCaches(storageV5, {
    preserveQuotaAutoResume,
    artifactAccount: "same_account",
    incomingIdentity,
  });
  if (isStorageV5Enabled() && credentials !== undefined) await refreshClaudeAITokens(credentials);
  await fetchBootstrapData(storageV5, credentials);
}
//@ chunk-zbtr7f5k.js:5534-5543 placement
/**
 * 刷新锁被占用时最多重试次数（3）。
 */
var MAX_LOCK_RETRIES = 3;
//@ chunk-zbtr7f5k.js:5543-6062 placement
async function warnNoRefreshLock(e, r, { withoutLock: n, clock: f } = {}) {
  if (!isBgSession() || isDiskless())
    return {
      result: await e(),
      locked: false,
    };
  for (let idx = 1; ; idx++) {
    let s = false;
    try {
      return await withOAuthRefreshLock(async ({ isCompromised }) => {
        let y = !isCompromised();
        if (!y && n !== undefined)
          return {
            result: n(),
            locked: false,
          };
        s = true;
        return {
          result: await e(),
          locked: y && !isCompromised(),
        };
      }, r);
    } catch (error) {
      if (s) throw error;
      if (error instanceof OAuthRefreshLockContendedError && idx < MAX_LOCK_RETRIES) {
        await sleep(100 * idx, undefined, {
          clock: f,
        });
        continue;
      }
      logForDebugging(`OAuth: no refresh lock for a credential write (${describeErrorName(error)})`, {
        level: "warn",
      });
      return n !== undefined
        ? {
            result: n(),
            locked: false,
          }
        : {
            result: await e(),
            locked: false,
          };
    }
  }
}
//@ chunk-zbtr7f5k.js:6062-6100 placement
/**
 * 清空令牌缓存并重新读取 claude.ai 令牌。
 */
async function refreshClaudeAITokens(e) {
  clearOAuthTokenMemos();
  await getClaudeAIOAuthTokensAsync(e);
}
//@ chunk-zbtr7f5k.js:6100-6581 placement
/**
 * 回滚失败且令牌可能仍有效的说明。
 */
var ROLLBACK_UNCONFIRMED_TEXT =
  "The refused sign-in could not be fully undone: this machine's previous sign-in state could not be confirmed restored, and the refused sign-in was revoked. Sign in again (claude auth login, or /login).";
var ROLLBACK_MAYBE_VALID_TEXT =
  "The refused sign-in could not be fully undone: this machine's previous sign-in state could not be confirmed restored, and the refused sign-in may still be valid. Sign in again (claude auth login, or /login), and ask your admin to revoke it if this device is shared.";
//@ chunk-zbtr7f5k.js:6581-6620 placement
/**
 * 按是否已吊销选择回滚失败说明。
 */
function rollbackFailureText(e) {
  return e.revoked ? ROLLBACK_UNCONFIRMED_TEXT : ROLLBACK_MAYBE_VALID_TEXT;
}
//@ chunk-zbtr7f5k.js:6620-6677 placement
/**
 * 判断错误是否为锁占用或文件不可访问。
 */
function isLockOrAccessError(e) {
  return (
    getErrnoCode(e) === "ELOCKED" || isFsInaccessible(e) || isFsInaccessibleCode(storageCauseErrnoCode(e))
  );
}
//@ chunk-zbtr7f5k.js:6677-6763 placement
/**
 * 生成错误的名字描述（类名或类型）。
 */
function describeErrorName(error) {
  return (
    sanitizeClassName(error instanceof Error ? error.name : undefined) ??
    (error === null ? "null" : typeof error)
  );
}
//@ chunk-zbtr7f5k.js:6763-7005 placement
function logRollbackFailure(error, r) {
  if (isLockOrAccessError(error)) {
    logForDebugging(
      `Rolling back a refused sign-in failed (${r}; ${describeErrorName(error)}: ${getErrnoCode(error) ?? storageCauseErrnoCode(error) ?? "no errno"})`,
      {
        level: "error",
      },
    );
    return;
  }
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Rolling back a refused sign-in threw (${r}: ${describeErrorName(error)})`,
      "Rolling back a refused sign-in threw",
    ),
  );
}
//@ chunk-zbtr7f5k.js:7005-8191 placement
/**
 * 回滚被拒绝的登录：恢复之前的凭据或登出，必要时清除环境令牌说明。
 */
async function rollbackRefusedSignIn(e, { storageV5, credentials, clock }) {
  if (e === undefined || (e.success && !isBgSession())) {
    await performLogout({
      clearOnboarding: false,
      preserveNonAnthropicAuth: true,
      storageV5,
      credentials,
    });
    return {
      restored: true,
      revoked: true,
    };
  }
  env.unset("CLAUDE_CODE_OAUTH_TOKEN");
  setOauthTokenFromFd(null);
  setAuthenticatedAccount(null);
  clearOAuthTokenCache();
  let landedToken = e.landedToken;
  let s = true;
  let revoked = false;
  if (landedToken !== undefined) {
    let refreshToken =
      landedToken.refreshToken !== null && getAPIProvider() === "firstParty"
        ? landedToken.refreshToken
        : null;
    let store = getSecureStorage();
    try {
      let replacedLogin = e.replacedLogin;
      let u = replacedLogin === undefined;
      if (replacedLogin !== undefined) {
        let h = await warnNoRefreshLock(
          () => restorePreviousCredentials(store, landedToken.accessToken, replacedLogin, credentials, clock),
          credentials,
          {
            withoutLock: () => false,
            clock,
          },
        );
        u = h.locked && h.result;
      }
      if (u)
        await mutateEveryCredentialLeg(
          store,
          (h) => {
            if (h.claudeAiOauth?.accessToken !== landedToken.accessToken) return h;
            let { claudeAiOauth, ...P } = h;
            return P;
          },
          credentials,
        );
      let everyCredentialLeg = await readEveryCredentialLeg(
        store,
        (h) => h.claudeAiOauth?.accessToken,
        credentials,
      );
      s =
        u &&
        !everyCredentialLeg.some(
          (h) =>
            h.value === READ_FAILED ||
            h.value === landedToken.accessToken ||
            (isBgSession() && h.value !== undefined && h.value !== replacedLogin?.accessToken),
        );
    } catch (error) {
      logRollbackFailure(error, "credential store");
      s = false;
    } finally {
      if (refreshToken !== null)
        try {
          revoked = await revokeOAuthTokenAcknowledged(refreshToken, landedToken.clientId);
        } catch (error) {
          logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Revoking a refused sign-in's token threw (${describeErrorName(error)})`,
              "Revoking a refused sign-in's token threw",
            ),
          );
        }
    }
  }
  await clearAuthRelatedCaches(storageV5, {
    artifactAccount: hasStoredOAuthToken() ? "account_switch" : "signed_out",
    credentials,
  });
  await clearAccountScopedConfig(storageV5);
  return {
    restored: s && e.replacedLoginUnrestorable !== true,
    revoked,
  };
}
//@ chunk-zbtr7f5k.js:8191-8432 placement
async function restorePreviousCredentials(store, newAccessToken, previous, storage, clock) {
  for (let idx = 0; idx < 3; idx++) {
    if (idx > 0)
      await sleep(100 * idx, undefined, {
        clock,
      });
    try {
      if (
        (
          await store.mutate(
            (y) =>
              y.claudeAiOauth?.accessToken === newAccessToken
                ? {
                    ...y,
                    claudeAiOauth: previous,
                  }
                : y,
            storage,
          )
        ).success
      )
        return true;
    } catch (error) {
      logRollbackFailure(error, "credential store");
    }
  }
  return false;
}
//@ chunk-zbtr7f5k.js:8432-8710 placement
async function LOGIN_REFUSAL_REASONS(e, storage, n) {
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
    return await rollbackRefusedSignIn(storage, n);
  } catch (error) {
    logRollbackFailure(error, "sign-out");
    return {
      restored: false,
      revoked: false,
    };
  }
}
//@ chunk-zbtr7f5k.js:8710-9116 placement
/**
 * 描述 OAuth 错误响应：是否有结构化错误、是否带 request-id、是否为 HTML 页面、错误类型与代码。
 */
function describeOAuthErrorResponse(e) {
  let response = e !== null && typeof e === "object" && e.isAxiosError === true ? e.response : undefined;
  if (response === undefined)
    return {
      hasSchema: false,
      requestIdPresent: false,
      htmlPage: false,
    };
  let n = responseHeaderFacts(response.headers ?? {});
  let serverErrorFields = extractServerErrorFields(e);
  let o = stampedServerErrorType({
    serverErrorType: serverErrorFields.serverErrorType,
    serverErrorStamped: true,
  });
  return {
    hasSchema: o !== undefined,
    requestIdPresent: n.requestIdPresent === true,
    htmlPage: n.responseContentType === "html",
    errorType: o,
    errorCode: serverErrorFields.serverErrorCode,
  };
}
//@ chunk-zbtr7f5k.js:9116-10061 placement
function classifyOAuthError(error) {
  let { kind, status } = classifyAxiosError(error);
  let f = describeOAuthErrorResponse(error);
  let o =
    f.hasSchema && f.requestIdPresent
      ? refusalForOrgSubscription(
          status,
          f.errorType,
          f.errorCode,
          extractServerErrorFields(error).serverAuthDenial,
        )
      : undefined;
  switch (kind) {
    case "auth":
      if (o !== undefined)
        return {
          reason: o,
          httpStatus: status,
        };
      if (!f.hasSchema || !f.requestIdPresent || f.htmlPage)
        return {
          reason: "blocked_by_intermediary",
          httpStatus: status,
        };
      if (status === 401)
        return {
          reason: "unavailable_credential_refresh",
          httpStatus: status,
        };
      return {
        reason: "refused_not_entitled",
        httpStatus: status,
      };
    case "timeout":
      return {
        reason: "unavailable_timeout",
      };
    case "network":
      return {
        reason: "unavailable_connect",
      };
    case "http":
      if (status === undefined)
        return {
          reason: "unavailable_connect",
        };
      if (status >= 500)
        return {
          reason: "unavailable_server",
          httpStatus: status,
        };
      if (status >= 300 && status < 400)
        return {
          reason: "blocked_by_intermediary",
          httpStatus: status,
        };
      if (isRetryableHttpStatus(status))
        return {
          reason: "unavailable_rate_limited",
          httpStatus: status,
        };
      if (status === 407 || o === undefined)
        return {
          reason: "blocked_by_intermediary",
          httpStatus: status,
        };
      return {
        reason: o,
        httpStatus: status,
      };
    case "other":
      return {
        reason: "client_error",
      };
  }
}
//@ chunk-zbtr7f5k.js:10061-10249 placement
function logProbeClientError(reason, error) {
  if (reason !== "client_error") return;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `org-config login probe threw before reaching the transport (${describeErrorName(error)})`,
      "org-config login probe threw before reaching the transport",
    ),
  );
}
//@ chunk-zbtr7f5k.js:10249-11386 placement
async function fetchOAuthProfile(e, r, n = {}) {
  let f = n.baseApiUrl ?? getOauthConfig().BASE_API_URL;
  let authHeaders = {
    Authorization: `Bearer ${e}`,
    "anthropic-beta": OAUTH_BETA_HEADER,
  };
  let s = {
    hasAdmittedCache: false,
  };
  let p = (async () => {
    try {
      let u = await (n.requestPolicy ?? fetchPolicyLimitsResponse)({
        endpoint: policyLimitsUrl(f),
        authHeaders,
        timeoutMs: r,
        signal: AbortSignal.timeout(r),
        acceptAny2xx: true,
      });
      if (u.kind === "not_modified" || !u.contentType.includes("json") || !u.requestIdPresent)
        return {
          outcome: {
            ...s,
            reason: "blocked_by_intermediary",
          },
        };
      return {
        outcome: {
          ...s,
          reason: "ok",
        },
      };
    } catch (error) {
      let { reason, httpStatus } = classifyOAuthError(error);
      logProbeClientError(reason, error);
      return {
        outcome: {
          ...s,
          reason,
          ...(httpStatus !== undefined && {
            httpStatus,
          }),
        },
        httpStatus,
      };
    }
  })();
  let y = (async () => {
    try {
      let { status, contentType, requestIdPresent } = await (
        n.requestSettings ?? probeManagedSettingsForBearer
      )(e, {
        timeoutMs: r,
      });
      if (!requestIdPresent || status === 304 || (status === 200 && !contentType.includes("json")))
        return {
          outcome: {
            ...s,
            reason: "blocked_by_intermediary",
            httpStatus: status,
          },
          httpStatus: status,
        };
      return {
        outcome: {
          ...s,
          reason: status === 404 || status === 204 ? "none_configured" : "ok",
        },
      };
    } catch (error) {
      let { reason, httpStatus } = classifyOAuthError(error);
      logProbeClientError(reason, error);
      return {
        outcome: {
          ...s,
          reason,
          ...(httpStatus !== undefined && {
            httpStatus,
          }),
        },
        httpStatus,
      };
    }
  })();
  let [A, _] = await Promise.all([p, y]);
  return {
    policy: A.outcome,
    settings: _.outcome,
    httpStatus: A.httpStatus ?? _.httpStatus,
  };
}
//@ chunk-zbtr7f5k.js:11386-11611 placement
function loginIdentity(newLogin) {
  return {
    accountUuid: newLogin.profile?.account?.uuid ?? newLogin.tokenAccount?.uuid,
    organizationUuid: newLogin.profile?.organization?.uuid ?? newLogin.tokenAccount?.organizationUuid,
    email: newLogin.profile?.account?.email ?? newLogin.tokenAccount?.emailAddress,
  };
}
//@ chunk-zbtr7f5k.js:11611-11774 placement
/**
 * 判断登录后是否需要核实账号资料（claude.ai scope 且资料或订阅类型未确认）。
 */
function needsProfileVerification(e) {
  return (
    isClaudeAiScopeSet(e.scopes) &&
    (e.profile === undefined ||
      e.subscriptionType === null ||
      (e.subscriptionTypeSource === "profile" && e.subscriptionTypeVerifiedAt === undefined))
  );
}
//@ chunk-zbtr7f5k.js:11774-11924 placement
function normalizeSettingsDecision(e, flag) {
  let { reason } = e.settings;
  if (classifyManagedConfigOutcome(reason) === "refused" && !isExemptReason(flag, reason)) return e;
  return {
    ...e,
    settings: {
      hasAdmittedCache: false,
      reason: "not_attempted",
    },
  };
}
//@ chunk-zbtr7f5k.js:11924-15547 placement
/**
 * 检查新登录是否被允许（组织固定、托管设置、API key 冲突、提供商、层级），约 3.6 KB。
 */
async function checkLoginAllowed(e) {
  let r = () =>
    e.readFlag !== undefined
      ? {
          flag: e.readFlag(),
          source: e.readFlagSource?.() ?? "override",
        }
      : readOrgConfigRequiredFlagWithSource();
  let n = e.startupGateFollows === true;
  let f = !n || e.untieredLogin === true;
  let { flag, source } = r();
  let isFlagFetchHeld = e.isFlagFetchHeld ?? isFlagFetchHeldNoTrust;
  let isFlagCacheEmpty = e.isFlagCacheEmpty ?? isGrowthBookCacheEmpty;
  if (!flag.enabled && isFallbackFlagUsable(source, isFlagFetchHeld, isFlagCacheEmpty) && n)
    return {
      ok: true,
    };
  let _ = (e.readCandidateInputs ?? orgConfigInputs)({
    authRecoveryCommand: false,
  });
  let newLogin = e.newLogin;
  let T =
    e.untieredLogin === true
      ? {
          ..._,
          hostToken: false,
          tier: null,
          credentialShape: "untiered_login",
          storedLoginOrigin: true,
          tierVerifiedAtMs: undefined,
        }
      : newLogin !== undefined
        ? {
            ..._,
            hostToken: false,
            tier: newLogin.subscriptionType,
            credentialShape: !isClaudeAiScopeSet(newLogin.scopes)
              ? "api_key"
              : newLogin.subscriptionType === null
                ? "untiered_login"
                : "stored_login",
            storedLoginOrigin: true,
            tierVerifiedAtMs:
              newLogin.subscriptionTypeSource === "profile"
                ? (newLogin.subscriptionTypeVerifiedAt ?? null)
                : undefined,
          }
        : {
            ..._,
            hostToken: false,
          };
  let h = e.untieredLogin === true;
  let R = (flag) =>
    h
      ? {
          ...T,
          tier: flag.plans[0] ?? "team",
          credentialShape: "stored_login",
          tierVerifiedAtMs: undefined,
        }
      : T;
  let P = (O) => {
    let L = e.newLogin === undefined ? getOauthAccountInfo() : undefined;
    let z =
      e.newLogin !== undefined
        ? loginIdentity(e.newLogin)
        : {
            accountUuid: L?.accountUuid,
            organizationUuid: L?.organizationUuid,
            email: L?.emailAddress,
          };
    let re = z.accountUuid === undefined && z.organizationUuid === undefined;
    return withDeadline(
      (e.fetchServedFlag ?? fetchOrgConfigRequiredFlagServedToBearer)(e.accessToken, z, O).catch(() => {
        return;
      }),
      O,
    ).then((D) =>
      D !== undefined && re && !(D.flag.enabled && orgConfigCandidacy(D.flag, R(D.flag)).candidate)
        ? undefined
        : D,
    );
  };
  let w = orgConfigCandidacy(flag, R(flag));
  let U = "no";
  if (
    isUnarmedFallback(
      {
        armed: flag.enabled && w.candidate,
        flagSource: source,
        candidacy: w,
      },
      isFlagFetchHeld,
      isFlagCacheEmpty,
    )
  ) {
    let O = await P(Math.min(flag.budgetMs, EVENT_LOGGING_FLAG_WAIT_MS));
    U = O !== undefined ? "served" : "nothing_in_time";
    ({ flag, source } = O ?? r());
    w = orgConfigCandidacy(flag, R(flag));
  }
  let B = !n && source !== "override" && source !== "disabled" && !isFlagFetchHeld();
  if (B && U === "no" && !w.candidate && isRolloutRefusal(w.exclusion)) {
    let O = await P(Math.min(flag.budgetMs, EVENT_LOGGING_FLAG_WAIT_MS));
    U = O !== undefined ? "served" : "nothing_in_time";
    if (O !== undefined) {
      ({ flag, source } = O);
      w = orgConfigCandidacy(flag, R(flag));
    }
  }
  if (!flag.enabled || !w.candidate)
    return {
      ok: true,
    };
  let startTime = performance.now();
  let q =
    U !== "served" && (B || isFlagSourceUntrusted(source, isFlagFetchHeld, isFlagCacheEmpty))
      ? P(flag.budgetMs)
      : undefined;
  let N = e.tokenUsedElsewhere !== true && isStoredLoginSurfaceShortcut();
  let G = await (e.probe ?? fetchOAuthProfile)(e.accessToken, flag.budgetMs);
  let v = N ? normalizeSettingsDecision(G, flag) : G;
  let S = orgConfigGateDecision({
    flag,
    candidacy: w,
    policy: v.policy,
    settings: v.settings,
    surface: "login",
    blockedMs: Math.max(0, Math.round(performance.now() - startTime)),
  });
  if (S.verdict !== "pass" && q !== undefined) {
    let O = (await q) ?? {
      flag,
      source,
    };
    let L = orgConfigCandidacy(O.flag, R(O.flag));
    if (!O.flag.enabled || !L.candidate) {
      logForDebugging(
        `org-config gate (login): policy=${v.policy.reason} settings=${v.settings.reason} \u2192 released by the served flag`,
      );
      return {
        ok: true,
      };
    }
    flag = O.flag;
    source = O.source;
    w = L;
    if (N) v = normalizeSettingsDecision(G, flag);
    S = orgConfigGateDecision({
      flag,
      candidacy: w,
      policy: v.policy,
      settings: v.settings,
      surface: "login",
      blockedMs: Math.max(0, Math.round(performance.now() - startTime)),
    });
  }
  if ((e.reprobeUnavailableOnce === true || f) && S.verdict === "blocked" && isUnavailableReason(S.reason)) {
    let O = flag.budgetMs - Math.max(0, Math.round(performance.now() - startTime));
    if (O > 0) {
      v = await (e.probe ?? fetchOAuthProfile)(e.accessToken, O);
      if (N) v = normalizeSettingsDecision(v, flag);
      S = orgConfigGateDecision({
        flag,
        candidacy: w,
        policy: v.policy,
        settings: v.settings,
        surface: "login",
        blockedMs: Math.max(0, Math.round(performance.now() - startTime)),
      });
    }
  }
  let M =
    e.organizationName ?? (newLogin !== undefined ? undefined : getOauthAccountInfo()?.organizationName);
  let W = {
    policy: v.policy,
    settings: v.settings,
  };
  let K = {
    organizationName: M === undefined || M === null ? undefined : stripControlChars(M),
    httpStatus: S.resource === undefined ? undefined : (W[S.resource].httpStatus ?? v.httpStatus),
  };
  let F = {
    decision: S,
    message: orgConfigGateMessage(S, K),
    flag,
    flagSource: source,
    candidacy: w,
    armed: true,
    context: K,
    attempt: 0,
    decidedWithoutWaiting: false,
    outcomes: W,
  };
  await (e.report ?? ((O) => logOrgConfigGate(O, O.outcomes)))(F);
  logForDebugging(
    `org-config gate (login): policy=${v.policy.reason} settings=${v.settings.reason} \u2192 ${S.verdict}`,
  );
  if (!isGateBlocking(S))
    return {
      ok: true,
      evaluation: F,
    };
  if (S.verdict === "blocked" && !f)
    return {
      ok: true,
      evaluation: F,
      warning: unverifiedSettingsNotice(F),
    };
  return {
    ok: false,
    evaluation: F,
    message:
      F.message ??
      "Claude Code couldn't load your organization's settings, which it requires before this sign-in can be used.",
  };
}
//@ chunk-zbtr7f5k.js:15547-15745 placement
/**
 * 登录成功但未能核实组织设置时的提示文字。
 */
function unverifiedSettingsNotice(e) {
  let { reason } = e.decision;
  return `Signed in. Claude Code couldn't verify your organization's settings yet${reason !== undefined ? ` (${describeUnavailableReason(reason)})` : ""}; it will check again when you start a session.`;
}
//@ chunk-zbtr7f5k.js:15745-16506 placement
async function mintApiKeyIfAllowed(e) {
  let { minted, ...n } = e;
  let readCandidateInputs = e.readCandidateInputs ?? orgConfigInputs;
  let o = await checkLoginAllowed({
    ...n,
    newLogin: minted,
    untieredLogin: needsProfileVerification(minted),
    startupGateFollows: false,
    reprobeUnavailableOnce: true,
    tokenUsedElsewhere: true,
    organizationName:
      e.organizationName ?? minted.profile?.organization?.name ?? minted.tokenAccount?.organizationName,
    readCandidateInputs: (y) => ({
      ...readCandidateInputs(y),
      provider: "firstParty",
      firstPartyBaseUrl: true,
    }),
  });
  if (o.ok) return o;
  let s = await describeWithheldMint(
    {
      accessToken: e.accessToken,
      ...minted,
    },
    "withheld mint",
    e.revoke,
  );
  if (o.evaluation.decision.verdict === "refused")
    return {
      ok: false,
      evaluation: o.evaluation,
      message: `${o.message} ${revokedNote(s)}`,
    };
  let { reason } = o.evaluation.decision;
  return {
    ok: false,
    evaluation: o.evaluation,
    message: `Couldn't verify your organization's settings${reason !== undefined ? ` (${describeUnavailableReason(reason)})` : ""}. ${describeNetworkUnavailable(reason)}. ${revokedNote(s)}`,
  };
}
//@ chunk-zbtr7f5k.js:16506-16682 placement
var TOKEN_REVOKED_NOTE = "Anthropic reported the token revoked; it was not shown.";
var TOKEN_NOT_REVOKED_NOTE =
  "The token could not be confirmed revoked and was not shown \u2014 ask your admin to revoke it in Console.";
//@ chunk-zbtr7f5k.js:16682-16712 placement
/**
 * 按是否已吊销返回对应说明。
 */
function revokedNote(e) {
  return e ? TOKEN_REVOKED_NOTE : TOKEN_NOT_REVOKED_NOTE;
}
//@ chunk-zbtr7f5k.js:16712-17243 placement
function describeNetworkUnavailable(reason) {
  switch (reason) {
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
//@ chunk-zbtr7f5k.js:17243-17527 placement
/**
 * 吊销被拒绝登录的令牌并说明结果。
 */
async function revokeRefusedSignInToken(e) {
  return (await describeWithheldMint(e, "refused sign-in"))
    ? "Anthropic reported the new sign-in revoked; your previous login is unchanged."
    : "The new sign-in could not be confirmed revoked \u2014 ask your admin to revoke it if this device is shared; your previous login is unchanged.";
}
//@ chunk-zbtr7f5k.js:17527-17835 placement
async function describeWithheldMint(e, r, revoke = revokeOAuthTokenAcknowledged) {
  if (r !== "withheld mint" && getAPIProvider() !== "firstParty") return false;
  let refreshToken = e.refreshToken ?? null;
  try {
    return await revoke(
      refreshToken ?? e.accessToken,
      e.clientId,
      refreshToken !== null ? "refresh_token" : "access_token",
    );
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Revoking a ${r}'s grant threw (${describeErrorName(error)})`,
        "Revoking an uninstalled grant threw",
      ),
    );
    return false;
  }
}
//@ chunk-zbtr7f5k.js:17835-17948 placement
function isRolloutRefusal(exclusion) {
  switch (exclusion) {
    case "flag_off":
    case "tier_not_in_plans":
    case "rollout_percent":
      return true;
    default:
      return false;
  }
}
//@ chunk-zbtr7f5k.js:17948-18171 placement
function isUnavailableReason(reason) {
  switch (reason) {
    case "unavailable_timeout":
    case "unavailable_connect":
    case "unavailable_server":
    case "unavailable_rate_limited":
    case "unavailable_credential_refresh":
    case "unavailable_pending":
      return true;
    default:
      return false;
  }
}
//@ chunk-zbtr7f5k.js:18171-18820 placement
function describeUnavailableReason(reason) {
  switch (reason) {
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
//@ chunk-zbtr7f5k.js:18820-18964 placement
/**
 * 把登录后的设置检查结果归类为被拒、本模式未加载或不可用。
 */
function loginSettingsOutcome(evaluation) {
  let { verdict, reason } = evaluation.decision;
  return verdict === "refused"
    ? "refused"
    : reason === "not_attempted"
      ? "not_loaded_in_launch_mode"
      : "unavailable";
}
//@ chunk-zbtr7f5k.js:18964-19157 placement
class OrgConfigLoginRefusedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  evaluation;
  constructor(message, evaluation) {
    super(message, "OrgConfigLoginRefusedError: the org-config gate refused a completed sign-in");
    this.evaluation = evaluation;
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
  rollbackFailureText,
  isSameAccount,
  unverifiedSettingsNotice,
};
