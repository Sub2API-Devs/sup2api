/**
 * services/oauth/refusedSignIn.ts
 *
 * 2.1.316 新增：被拒绝的登录（组织固定、托管设置、提供商不允许等）回滚：恢复先前凭据、吊销新令牌、密钥链保存失败提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-de28gzhb.js (34)
 * attribution: placement 34
 */
import {
  installOAuthTokens,
  clearAuthRelatedCaches,
  clearAccountScopedConfig,
} from "../../cli/handlers/auth.js";
import {
  shouldUseClaudeAIAuth,
  fetchAndStoreUserRoles,
  createAndStoreApiKey,
  revokeOAuthTokenAcknowledged,
} from "./client.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-de28gzhb.js:2240-2472 placement
var LOGIN_SAVE_FAILED = "Couldn't save your login. Try logging in again.";
var LOGIN_SAVE_FAILED_KEYCHAIN =
  "Couldn't save your login. If your Mac's keychain is locked, unlock it and log in again.";
var SIGN_IN_AGAIN_TO_CLEAR_MESSAGE =
  "Sign in again to take your previous account or API key off the config file.";
//@ chunk-de28gzhb.js:2472-3967 placement
/**
 * 保存登录凭据，失败时给出提示（macOS 钥匙串锁定等）。
 */
async function saveLoginOrWarn(loginTokens, { storageV5, credentials, clock } = {}) {
  let { departingLoginMayRemain: installResult, ...installRest } = await installOAuthTokens(loginTokens, {
    storageV5,
    credentials,
    keepStoredLogin:
      shouldUseClaudeAIAuth(loginTokens.scopes) && Boolean(loginTokens.refreshToken && loginTokens.expiresAt),
  });
  let { result: saveResult, locked } = await warnNoRefreshLock(
    () => saveOAuthTokensIfNeeded(loginTokens, credentials, "sign_in"),
    credentials,
    {
      clock,
    },
  );
  let replaced = locked ? saveResult.replaced : undefined;
  let unrestorable = isBgSession() && !locked && saveResult.replaced !== undefined;
  clearOAuthTokenCache();
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN)
    if (saveResult.success) delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    else process.env.CLAUDE_CODE_OAUTH_TOKEN = loginTokens.accessToken;
  if (getOauthTokenFromFd()) {
    setOauthTokenFromFd(saveResult.success ? null : loginTokens.accessToken);
    setOauthTokenFromBgSnapshot(false);
  }
  setLoginStashedInTokenSlot(saveResult.success ? null : loginTokens.accessToken);
  if (
    "transient" in saveResult &&
    saveResult.transient === true &&
    !env.CLAUDE_CODE_OAUTH_TOKEN &&
    !getOauthTokenFromFd()
  )
    throw new WireSafeControlError(
      getPlatform() === "macos" ? LOGIN_SAVE_FAILED_KEYCHAIN : LOGIN_SAVE_FAILED,
    );
  if (isStorageV5Enabled() && credentials !== undefined) await refreshClaudeAITokens(credentials);
  let { warning } = saveResult;
  if (warning)
    logEvent("tengu_oauth_storage_warning", {
      warning:
        warning === PLAINTEXT_STORAGE_WARNING || warning === OAUTH_TOKEN_SAVE_FAILED_WARNING
          ? fromEnum(warning)
          : lit("other"),
    });
  await fetchAndStoreUserRoles(loginTokens.accessToken, storageV5).catch((error) =>
    logForDebugging(String(error), {
      level: "error",
    }),
  );
  if (shouldUseClaudeAIAuth(loginTokens.scopes))
    await fetchAndStoreClaudeCodeFirstTokenDate(storageV5, credentials).catch((error) =>
      logForDebugging(String(error), {
        level: "error",
      }),
    );
  else if (!(await createAndStoreApiKey(loginTokens.accessToken, storageV5)))
    throw Error("Unable to create API key. The server accepted the request but did not return a key.");
  await isSameAccount({
    storageV5,
    credentials,
    ...installRest,
  });
  return {
    ...(installResult && {
      departingLoginMayRemain: installResult,
    }),
    storage: {
      success: saveResult.success,
      backendName: saveResult.backendName,
      transient: saveResult.transient,
      fallbackWritten: saveResult.fallbackWritten,
      landedToken: {
        accessToken: loginTokens.accessToken,
        refreshToken: loginTokens.refreshToken,
        clientId: loginTokens.clientId,
      },
      ...(replaced !== undefined && {
        replacedLogin: replaced,
      }),
      ...(unrestorable && {
        replacedLoginUnrestorable: unrestorable,
      }),
      sessionAuth:
        saveResult.success || storedOAuthTokenEquals(loginTokens.accessToken)
          ? "fresh"
          : hasStoredOAuthToken()
            ? "previous"
            : "none",
    },
  };
}
//@ chunk-de28gzhb.js:5880-6112 placement
async function isSameAccount({ storageV5, credentials, preserveQuotaAutoResume = false, incomingIdentity }) {
  await clearAuthRelatedCaches(storageV5, {
    preserveQuotaAutoResume,
    artifactAccount: "same_account",
    incomingIdentity,
  });
  if (isStorageV5Enabled() && credentials !== undefined) await refreshClaudeAITokens(credentials);
  await fetchBootstrapData(storageV5, credentials);
}
//@ chunk-de28gzhb.js:6112-6121 placement
/**
 * 刷新锁被占用时最多重试次数（3）。
 */
var MAX_LOCK_RETRIES = 3;
//@ chunk-de28gzhb.js:6121-6640 placement
async function warnNoRefreshLock(run, credentials, { withoutLock, clock } = {}) {
  if (!isBgSession() || isDiskless())
    return {
      result: await run(),
      locked: false,
    };
  for (let j = 1; ; j++) {
    let inLock = false;
    try {
      return await withOAuthRefreshLock(async ({ isCompromised }) => {
        let locked = !isCompromised();
        if (!locked && withoutLock !== undefined)
          return {
            result: withoutLock(),
            locked: false,
          };
        inLock = true;
        return {
          result: await run(),
          locked: locked && !isCompromised(),
        };
      }, credentials);
    } catch (error) {
      if (inLock) throw error;
      if (error instanceof OAuthRefreshLockContendedError && j < MAX_LOCK_RETRIES) {
        await sleep(100 * j, undefined, {
          clock,
        });
        continue;
      }
      logForDebugging(`OAuth: no refresh lock for a credential write (${describeErrorName(error)})`, {
        level: "warn",
      });
      return withoutLock !== undefined
        ? {
            result: withoutLock(),
            locked: false,
          }
        : {
            result: await run(),
            locked: false,
          };
    }
  }
}
//@ chunk-de28gzhb.js:6640-6678 placement
/**
 * 清空令牌缓存并重新读取 claude.ai 令牌。
 */
async function refreshClaudeAITokens(credentials) {
  clearOAuthTokenMemos();
  await getClaudeAIOAuthTokensAsync(credentials);
}
//@ chunk-de28gzhb.js:6678-7159 placement
/**
 * 回滚失败且令牌可能仍有效的说明。
 */
var ROLLBACK_UNCONFIRMED_TEXT =
  "The refused sign-in could not be fully undone: this machine's previous sign-in state could not be confirmed restored, and the refused sign-in was revoked. Sign in again (claude auth login, or /login).";
var ROLLBACK_MAYBE_VALID_TEXT =
  "The refused sign-in could not be fully undone: this machine's previous sign-in state could not be confirmed restored, and the refused sign-in may still be valid. Sign in again (claude auth login, or /login), and ask your admin to revoke it if this device is shared.";
//@ chunk-de28gzhb.js:7159-7198 placement
/**
 * 按是否已吊销选择回滚失败说明。
 */
function rollbackFailureText(rollback) {
  return rollback.revoked ? ROLLBACK_UNCONFIRMED_TEXT : ROLLBACK_MAYBE_VALID_TEXT;
}
//@ chunk-de28gzhb.js:7198-7255 placement
/**
 * 判断错误是否为锁占用或文件不可访问。
 */
function isLockOrAccessError(error) {
  return (
    getErrnoCode(error) === "ELOCKED" ||
    isFsInaccessible(error) ||
    isFsInaccessibleCode(storageCauseErrnoCode(error))
  );
}
//@ chunk-de28gzhb.js:7255-7341 placement
/**
 * 生成错误的名字描述（类名或类型）。
 */
function describeErrorName(error) {
  return (
    sanitizeClassName(error instanceof Error ? error.name : undefined) ??
    (error === null ? "null" : typeof error)
  );
}
//@ chunk-de28gzhb.js:7341-7583 placement
function logRollbackFailure(error, where) {
  if (isLockOrAccessError(error)) {
    logForDebugging(
      `Rolling back a refused sign-in failed (${where}; ${describeErrorName(error)}: ${getErrnoCode(error) ?? storageCauseErrnoCode(error) ?? "no errno"})`,
      {
        level: "error",
      },
    );
    return;
  }
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Rolling back a refused sign-in threw (${where}: ${describeErrorName(error)})`,
      "Rolling back a refused sign-in threw",
    ),
  );
}
//@ chunk-de28gzhb.js:7583-8806 placement
/**
 * 回滚被拒绝的登录：恢复之前的凭据或登出，必要时清除环境令牌说明。
 */
async function rollbackRefusedSignIn(storage, { storageV5, credentials, clock }) {
  if (storage === undefined || (storage.success && !isBgSession())) {
    let logoutOutcome = await performLogout({
      clearOnboarding: false,
      preserveNonAnthropicAuth: true,
      storageV5,
      credentials,
    });
    return {
      restored: logoutOutcome === undefined,
      revoked: logoutOutcome !== "key_on_file",
    };
  }
  env.unset("CLAUDE_CODE_OAUTH_TOKEN");
  setOauthTokenFromFd(null);
  setAuthenticatedAccount(null);
  clearOAuthTokenCache();
  let logoutResult = storage.landedToken;
  let restored = true;
  let restored_2 = false;
  if (logoutResult !== undefined) {
    let revoked =
      logoutResult.refreshToken !== null && getAPIProvider() === "firstParty"
        ? logoutResult.refreshToken
        : null;
    let refreshToken = getSecureStorage();
    try {
      let secureStorage = storage.replacedLogin;
      let canRemove = secureStorage === undefined;
      if (secureStorage !== undefined) {
        let restoreOutcome = await warnNoRefreshLock(
          () =>
            restorePreviousCredentials(
              refreshToken,
              logoutResult.accessToken,
              secureStorage,
              credentials,
              clock,
            ),
          credentials,
          {
            withoutLock: () => false,
            clock,
          },
        );
        canRemove = restoreOutcome.locked && restoreOutcome.result;
      }
      if (canRemove)
        await mutateEveryCredentialLeg(
          refreshToken,
          (leg) => {
            if (leg.claudeAiOauth?.accessToken !== logoutResult.accessToken) return leg;
            let { claudeAiOauth: restoreOutcome, ...rest } = leg;
            return rest;
          },
          credentials,
        );
      let everyLeg = await readEveryCredentialLeg(
        refreshToken,
        (leg) => leg.claudeAiOauth?.accessToken,
        credentials,
      );
      restored =
        canRemove &&
        !everyLeg.some(
          (leg) =>
            leg.value === READ_FAILED ||
            leg.value === logoutResult.accessToken ||
            (isBgSession() && leg.value !== undefined && leg.value !== secureStorage?.accessToken),
        );
    } catch (error) {
      logRollbackFailure(error, "credential store");
      restored = false;
    } finally {
      if (revoked !== null)
        try {
          restored_2 = await revokeOAuthTokenAcknowledged(revoked, logoutResult.clientId);
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
  let configCleared = await clearAccountScopedConfig(storageV5);
  return {
    restored: restored && configCleared && storage.replacedLoginUnrestorable !== true,
    revoked: restored_2,
  };
}
//@ chunk-de28gzhb.js:8806-9047 placement
async function restorePreviousCredentials(store, newAccessToken, previous, storage, clock) {
  for (let j = 0; j < 3; j++) {
    if (j > 0)
      await sleep(100 * j, undefined, {
        clock,
      });
    try {
      if (
        (
          await store.mutate(
            (store) =>
              store.claudeAiOauth?.accessToken === newAccessToken
                ? {
                    ...store,
                    claudeAiOauth: previous,
                  }
                : store,
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
//@ chunk-de28gzhb.js:9047-9325 placement
async function LOGIN_REFUSAL_REASONS(refusal, storage, options) {
  switch (refusal.reason) {
    case "org_pin_mismatch":
    case "org_verify_failed":
    case "managed_settings_invalid":
      break;
    case "org_pin_api_key_conflict":
    case "provider_not_allowed":
      return;
  }
  try {
    return await rollbackRefusedSignIn(storage, options);
  } catch (error) {
    logRollbackFailure(error, "sign-out");
    return {
      restored: false,
      revoked: false,
    };
  }
}
//@ chunk-de28gzhb.js:9325-9731 placement
/**
 * 描述 OAuth 错误响应：是否有结构化错误、是否带 request-id、是否为 HTML 页面、错误类型与代码。
 */
function describeOAuthErrorResponse(error) {
  let response =
    error !== null && typeof error === "object" && error.isAxiosError === true ? error.response : undefined;
  if (response === undefined)
    return {
      hasSchema: false,
      requestIdPresent: false,
      htmlPage: false,
    };
  let headerFacts = responseHeaderFacts(response.headers ?? {});
  let serverErrorFields = extractServerErrorFields(error);
  let stampedType = stampedServerErrorType({
    serverErrorType: serverErrorFields.serverErrorType,
    serverErrorStamped: true,
  });
  return {
    hasSchema: stampedType !== undefined,
    requestIdPresent: headerFacts.requestIdPresent === true,
    htmlPage: headerFacts.responseContentType === "html",
    errorType: stampedType,
    errorCode: serverErrorFields.serverErrorCode,
  };
}
//@ chunk-de28gzhb.js:9731-10676 placement
function classifyOAuthError(error) {
  let { kind, status } = classifyAxiosError(error);
  let facts = describeOAuthErrorResponse(error);
  let orgRefusal =
    facts.hasSchema && facts.requestIdPresent
      ? refusalForOrgSubscription(
          status,
          facts.errorType,
          facts.errorCode,
          extractServerErrorFields(error).serverAuthDenial,
        )
      : undefined;
  switch (kind) {
    case "auth":
      if (orgRefusal !== undefined)
        return {
          reason: orgRefusal,
          httpStatus: status,
        };
      if (!facts.hasSchema || !facts.requestIdPresent || facts.htmlPage)
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
      if (status === 407 || orgRefusal === undefined)
        return {
          reason: "blocked_by_intermediary",
          httpStatus: status,
        };
      return {
        reason: orgRefusal,
        httpStatus: status,
      };
    case "other":
      return {
        reason: "client_error",
      };
  }
}
//@ chunk-de28gzhb.js:10676-10864 placement
function logProbeClientError(reason, error) {
  if (reason !== "client_error") return;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `org-config login probe threw before reaching the transport (${describeErrorName(error)})`,
      "org-config login probe threw before reaching the transport",
    ),
  );
}
//@ chunk-de28gzhb.js:10864-12001 placement
async function fetchOAuthProfile(accessToken, timeoutMs, options = {}) {
  let baseApiUrl = options.baseApiUrl ?? getOauthConfig().BASE_API_URL;
  let authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "anthropic-beta": OAUTH_BETA_HEADER,
  };
  let admittedState = {
    hasAdmittedCache: false,
  };
  let policyProbe = (async () => {
    try {
      let response = await (options.requestPolicy ?? fetchPolicyLimitsResponse)({
        endpoint: policyLimitsUrl(baseApiUrl),
        authHeaders,
        timeoutMs,
        signal: AbortSignal.timeout(timeoutMs),
        acceptAny2xx: true,
      });
      if (
        response.kind === "not_modified" ||
        !response.contentType.includes("json") ||
        !response.requestIdPresent
      )
        return {
          outcome: {
            ...admittedState,
            reason: "blocked_by_intermediary",
          },
        };
      return {
        outcome: {
          ...admittedState,
          reason: "ok",
        },
      };
    } catch (error) {
      let { reason, httpStatus } = classifyOAuthError(error);
      logProbeClientError(reason, error);
      return {
        outcome: {
          ...admittedState,
          reason,
          ...(httpStatus !== undefined && {
            httpStatus,
          }),
        },
        httpStatus,
      };
    }
  })();
  let settingsProbe = (async () => {
    try {
      let { status, contentType, requestIdPresent } = await (
        options.requestSettings ?? probeManagedSettingsForBearer
      )(accessToken, {
        timeoutMs,
      });
      if (!requestIdPresent || status === 304 || (status === 200 && !contentType.includes("json")))
        return {
          outcome: {
            ...admittedState,
            reason: "blocked_by_intermediary",
            httpStatus: status,
          },
          httpStatus: status,
        };
      return {
        outcome: {
          ...admittedState,
          reason: status === 404 || status === 204 ? "none_configured" : "ok",
        },
      };
    } catch (error) {
      let { reason, httpStatus } = classifyOAuthError(error);
      logProbeClientError(reason, error);
      return {
        outcome: {
          ...admittedState,
          reason,
          ...(httpStatus !== undefined && {
            httpStatus,
          }),
        },
        httpStatus,
      };
    }
  })();
  let [policyProbeResult, settingsProbeResult] = await Promise.all([policyProbe, settingsProbe]);
  return {
    policy: policyProbeResult.outcome,
    settings: settingsProbeResult.outcome,
    httpStatus: policyProbeResult.httpStatus ?? settingsProbeResult.httpStatus,
  };
}
//@ chunk-de28gzhb.js:12001-12226 placement
function loginIdentity(newLogin) {
  return {
    accountUuid: newLogin.profile?.account?.uuid ?? newLogin.tokenAccount?.uuid,
    organizationUuid: newLogin.profile?.organization?.uuid ?? newLogin.tokenAccount?.organizationUuid,
    email: newLogin.profile?.account?.email ?? newLogin.tokenAccount?.emailAddress,
  };
}
//@ chunk-de28gzhb.js:12226-12389 placement
/**
 * 判断登录后是否需要核实账号资料（claude.ai scope 且资料或订阅类型未确认）。
 */
function needsProfileVerification(tokens) {
  return (
    isClaudeAiScopeSet(tokens.scopes) &&
    (tokens.profile === undefined ||
      tokens.subscriptionType === null ||
      (tokens.subscriptionTypeSource === "profile" && tokens.subscriptionTypeVerifiedAt === undefined))
  );
}
//@ chunk-de28gzhb.js:12389-12539 placement
function normalizeSettingsDecision(evaluation, flag) {
  let { reason } = evaluation.settings;
  if (classifyManagedConfigOutcome(reason) === "refused" && !isExemptReason(flag, reason)) return evaluation;
  return {
    ...evaluation,
    settings: {
      hasAdmittedCache: false,
      reason: "not_attempted",
    },
  };
}
//@ chunk-de28gzhb.js:12539-16163 placement
/**
 * 检查新登录是否被允许（组织固定、托管设置、API key 冲突、提供商、层级），约 3.6 KB。
 */
async function checkLoginAllowed(options) {
  let readFlag = () =>
    options.readFlag !== undefined
      ? {
          flag: options.readFlag(),
          source: options.readFlagSource?.() ?? "override",
        }
      : readOrgConfigRequiredFlagWithSource();
  let startupGateFollows = options.startupGateFollows === true;
  let canRetryLogin = !startupGateFollows || options.untieredLogin === true;
  let { flag, source } = readFlag();
  let isFlagFetchHeld = options.isFlagFetchHeld ?? isFlagFetchHeldNoTrust;
  let isFlagCacheEmpty = options.isFlagCacheEmpty ?? isGrowthBookCacheEmpty;
  if (!flag.enabled && isFallbackFlagUsable(source, isFlagFetchHeld, isFlagCacheEmpty) && startupGateFollows)
    return {
      ok: true,
    };
  let baseInputs = (options.readCandidateInputs ?? orgConfigInputs)({
    authRecoveryCommand: false,
  });
  let newLogin = options.newLogin;
  let candidateInputs =
    options.untieredLogin === true
      ? {
          ...baseInputs,
          hostToken: false,
          tier: null,
          credentialShape: "untiered_login",
          storedLoginOrigin: true,
          tierVerifiedAtMs: undefined,
        }
      : newLogin !== undefined
        ? {
            ...baseInputs,
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
            ...baseInputs,
            hostToken: false,
          };
  let isUntieredLogin = options.untieredLogin === true;
  let inputsForFlag = (flag) =>
    isUntieredLogin
      ? {
          ...candidateInputs,
          tier: flag.plans[0] ?? "team",
          credentialShape: "stored_login",
          tierVerifiedAtMs: undefined,
        }
      : candidateInputs;
  let fetchServedFlag = (timeoutMs) => {
    let accountInfo = options.newLogin === undefined ? getOauthAccountInfo() : undefined;
    let identity =
      options.newLogin !== undefined
        ? loginIdentity(options.newLogin)
        : {
            accountUuid: accountInfo?.accountUuid,
            organizationUuid: accountInfo?.organizationUuid,
            email: accountInfo?.emailAddress,
          };
    let hasNoIdentity = identity.accountUuid === undefined && identity.organizationUuid === undefined;
    return withDeadline(
      (options.fetchServedFlag ?? fetchOrgConfigRequiredFlagServedToBearer)(
        options.accessToken,
        identity,
        timeoutMs,
      ).catch(() => {
        return;
      }),
      timeoutMs,
    ).then((served) =>
      served !== undefined &&
      hasNoIdentity &&
      !(served.flag.enabled && orgConfigCandidacy(served.flag, inputsForFlag(served.flag)).candidate)
        ? undefined
        : served,
    );
  };
  let candidacy = orgConfigCandidacy(flag, inputsForFlag(flag));
  let servedStatus = "no";
  if (
    isUnarmedFallback(
      {
        armed: flag.enabled && candidacy.candidate,
        flagSource: source,
        candidacy,
      },
      isFlagFetchHeld,
      isFlagCacheEmpty,
    )
  ) {
    let servedWithinBudget = await fetchServedFlag(Math.min(flag.budgetMs, EVENT_LOGGING_FLAG_WAIT_MS));
    servedStatus = servedWithinBudget !== undefined ? "served" : "nothing_in_time";
    ({ flag, source } = servedWithinBudget ?? readFlag());
    candidacy = orgConfigCandidacy(flag, inputsForFlag(flag));
  }
  let canAwaitServedFlag =
    !startupGateFollows && source !== "override" && source !== "disabled" && !isFlagFetchHeld();
  if (
    canAwaitServedFlag &&
    servedStatus === "no" &&
    !candidacy.candidate &&
    isRolloutRefusal(candidacy.exclusion)
  ) {
    let servedOnRetry = await fetchServedFlag(Math.min(flag.budgetMs, EVENT_LOGGING_FLAG_WAIT_MS));
    servedStatus = servedOnRetry !== undefined ? "served" : "nothing_in_time";
    if (servedOnRetry !== undefined) {
      ({ flag, source } = servedOnRetry);
      candidacy = orgConfigCandidacy(flag, inputsForFlag(flag));
    }
  }
  if (!flag.enabled || !candidacy.candidate)
    return {
      ok: true,
    };
  let startTime = performance.now();
  let servedFlagPromise =
    servedStatus !== "served" &&
    (canAwaitServedFlag || isFlagSourceUntrusted(source, isFlagFetchHeld, isFlagCacheEmpty))
      ? fetchServedFlag(flag.budgetMs)
      : undefined;
  let useShortcutSurface = options.tokenUsedElsewhere !== true && isStoredLoginSurfaceShortcut();
  let profile = await (options.probe ?? fetchOAuthProfile)(options.accessToken, flag.budgetMs);
  let profileDecision = useShortcutSurface ? normalizeSettingsDecision(profile, flag) : profile;
  let gateDecision = orgConfigGateDecision({
    flag,
    candidacy,
    policy: profileDecision.policy,
    settings: profileDecision.settings,
    surface: "login",
    blockedMs: Math.max(0, Math.round(performance.now() - startTime)),
  });
  if (gateDecision.verdict !== "pass" && servedFlagPromise !== undefined) {
    let servedFallback = (await servedFlagPromise) ?? {
      flag,
      source,
    };
    let servedCandidacy = orgConfigCandidacy(servedFallback.flag, inputsForFlag(servedFallback.flag));
    if (!servedFallback.flag.enabled || !servedCandidacy.candidate) {
      logForDebugging(
        `org-config gate (login): policy=${profileDecision.policy.reason} settings=${profileDecision.settings.reason} \u2192 released by the served flag`,
      );
      return {
        ok: true,
      };
    }
    flag = servedFallback.flag;
    source = servedFallback.source;
    candidacy = servedCandidacy;
    if (useShortcutSurface) profileDecision = normalizeSettingsDecision(profile, flag);
    gateDecision = orgConfigGateDecision({
      flag,
      candidacy,
      policy: profileDecision.policy,
      settings: profileDecision.settings,
      surface: "login",
      blockedMs: Math.max(0, Math.round(performance.now() - startTime)),
    });
  }
  if (
    (options.reprobeUnavailableOnce === true || canRetryLogin) &&
    gateDecision.verdict === "blocked" &&
    isUnavailableReason(gateDecision.reason)
  ) {
    let remainingMs = flag.budgetMs - Math.max(0, Math.round(performance.now() - startTime));
    if (remainingMs > 0) {
      profileDecision = await (options.probe ?? fetchOAuthProfile)(options.accessToken, remainingMs);
      if (useShortcutSurface) profileDecision = normalizeSettingsDecision(profileDecision, flag);
      gateDecision = orgConfigGateDecision({
        flag,
        candidacy,
        policy: profileDecision.policy,
        settings: profileDecision.settings,
        surface: "login",
        blockedMs: Math.max(0, Math.round(performance.now() - startTime)),
      });
    }
  }
  let organizationName =
    options.organizationName ??
    (newLogin !== undefined ? undefined : getOauthAccountInfo()?.organizationName);
  let outcomes = {
    policy: profileDecision.policy,
    settings: profileDecision.settings,
  };
  let gateContext = {
    organizationName:
      organizationName === undefined || organizationName === null
        ? undefined
        : stripControlChars(organizationName),
    httpStatus:
      gateDecision.resource === undefined
        ? undefined
        : (outcomes[gateDecision.resource].httpStatus ?? profileDecision.httpStatus),
  };
  let evaluation = {
    decision: gateDecision,
    message: orgConfigGateMessage(gateDecision, gateContext),
    flag,
    flagSource: source,
    candidacy,
    armed: true,
    context: gateContext,
    attempt: 0,
    decidedWithoutWaiting: false,
    outcomes,
  };
  await (
    options.report ??
    ((evaluationToReport) => logOrgConfigGate(evaluationToReport, evaluationToReport.outcomes))
  )(evaluation);
  logForDebugging(
    `org-config gate (login): policy=${profileDecision.policy.reason} settings=${profileDecision.settings.reason} \u2192 ${gateDecision.verdict}`,
  );
  if (!isGateBlocking(gateDecision))
    return {
      ok: true,
      evaluation,
    };
  if (gateDecision.verdict === "blocked" && !canRetryLogin)
    return {
      ok: true,
      evaluation,
      warning: unverifiedSettingsNotice(evaluation),
    };
  return {
    ok: false,
    evaluation,
    message:
      evaluation.message ??
      "Claude Code couldn't load your organization's settings, which it requires before this sign-in can be used.",
  };
}
//@ chunk-de28gzhb.js:16163-16361 placement
/**
 * 登录成功但未能核实组织设置时的提示文字。
 */
function unverifiedSettingsNotice(login) {
  let { reason } = login.decision;
  return `Signed in. Claude Code couldn't verify your organization's settings yet${reason !== undefined ? ` (${describeUnavailableReason(reason)})` : ""}; it will check again when you start a session.`;
}
//@ chunk-de28gzhb.js:16361-17122 placement
async function mintApiKeyIfAllowed(input) {
  let { minted, ...rest } = input;
  let readCandidateInputs = input.readCandidateInputs ?? orgConfigInputs;
  let check = await checkLoginAllowed({
    ...rest,
    newLogin: minted,
    untieredLogin: needsProfileVerification(minted),
    startupGateFollows: false,
    reprobeUnavailableOnce: true,
    tokenUsedElsewhere: true,
    organizationName:
      input.organizationName ?? minted.profile?.organization?.name ?? minted.tokenAccount?.organizationName,
    readCandidateInputs: (candidateInputs) => ({
      ...readCandidateInputs(candidateInputs),
      provider: "firstParty",
      firstPartyBaseUrl: true,
    }),
  });
  if (check.ok) return check;
  let withheld = await describeWithheldMint(
    {
      accessToken: input.accessToken,
      ...minted,
    },
    "withheld mint",
    input.revoke,
  );
  if (check.evaluation.decision.verdict === "refused")
    return {
      ok: false,
      evaluation: check.evaluation,
      message: `${check.message} ${revokedNote(withheld)}`,
    };
  let { reason } = check.evaluation.decision;
  return {
    ok: false,
    evaluation: check.evaluation,
    message: `Couldn't verify your organization's settings${reason !== undefined ? ` (${describeUnavailableReason(reason)})` : ""}. ${describeNetworkUnavailable(reason)}. ${revokedNote(withheld)}`,
  };
}
//@ chunk-de28gzhb.js:17122-17298 placement
var TOKEN_REVOKED_NOTE = "Anthropic reported the token revoked; it was not shown.";
var TOKEN_NOT_REVOKED_NOTE =
  "The token could not be confirmed revoked and was not shown \u2014 ask your admin to revoke it in Console.";
//@ chunk-de28gzhb.js:17298-17328 placement
/**
 * 按是否已吊销返回对应说明。
 */
function revokedNote(revoked) {
  return revoked ? TOKEN_REVOKED_NOTE : TOKEN_NOT_REVOKED_NOTE;
}
//@ chunk-de28gzhb.js:17328-17859 placement
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
//@ chunk-de28gzhb.js:17859-18143 placement
/**
 * 吊销被拒绝登录的令牌并说明结果。
 */
async function revokeRefusedSignInToken(entry) {
  return (await describeWithheldMint(entry, "refused sign-in"))
    ? "Anthropic reported the new sign-in revoked; your previous login is unchanged."
    : "The new sign-in could not be confirmed revoked \u2014 ask your admin to revoke it if this device is shared; your previous login is unchanged.";
}
//@ chunk-de28gzhb.js:18143-18451 placement
async function describeWithheldMint(tokens, reason, revoke = revokeOAuthTokenAcknowledged) {
  if (reason !== "withheld mint" && getAPIProvider() !== "firstParty") return false;
  let refreshToken = tokens.refreshToken ?? null;
  try {
    return await revoke(
      refreshToken ?? tokens.accessToken,
      tokens.clientId,
      refreshToken !== null ? "refresh_token" : "access_token",
    );
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Revoking a ${reason}'s grant threw (${describeErrorName(error)})`,
        "Revoking an uninstalled grant threw",
      ),
    );
    return false;
  }
}
//@ chunk-de28gzhb.js:18451-18564 placement
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
//@ chunk-de28gzhb.js:18564-18787 placement
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
//@ chunk-de28gzhb.js:18787-19436 placement
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
//@ chunk-de28gzhb.js:19436-19580 placement
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
//@ chunk-de28gzhb.js:19580-19773 placement
let OrgConfigLoginRefusedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-de28gzhb.js:19580", () => {
  OrgConfigLoginRefusedError = class OrgConfigLoginRefusedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    evaluation;
    constructor(message, evaluation) {
      super(message, "OrgConfigLoginRefusedError: the org-config gate refused a completed sign-in");
      this.evaluation = evaluation;
      this.name = "OrgConfigLoginRefusedError";
    }
  };
});
export {
  revokeRefusedSignInToken,
  saveLoginOrWarn,
  rollbackRefusedSignIn,
  logRollbackFailure,
  SIGN_IN_AGAIN_TO_CLEAR_MESSAGE,
  checkLoginAllowed,
  needsProfileVerification,
  loginSettingsOutcome,
  mintApiKeyIfAllowed,
  OrgConfigLoginRefusedError,
  describeWithheldMint,
  LOGIN_REFUSAL_REASONS,
  rollbackFailureText,
  unverifiedSettingsNotice,
  isSameAccount,
};
