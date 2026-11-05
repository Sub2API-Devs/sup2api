/**
 * services/oauth/wifCredentials.ts
 *
 * WIF 凭据解析、锁与刷新（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gjbr82c9.js (22)
 * attribution: placement 22
 */
import { dirname } from "path";
import { mkdir } from "fs/promises";
import {
  WorkloadIdentityError,
  checkCredentialsFileSafety,
  MAX_FEDERATION_TOKEN_TTL_SECONDS,
  getWIFAccountOnHold,
  writeCredentialsFileAtomic,
} from "../../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  isSyscallError,
  isFsInaccessible,
  withTelemetryMessage,
  toError,
} from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import { lock } from "../../utils/lockfile.js";
import { sleep } from "../../utils/sleep.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { withFeatureTelemetry, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import {
  loadEnvQuadConfig,
  buildWifTokenCache,
  getRootConfigPath,
} from "../../../vendor/@anthropic-ai/sdk/core/credentials.mjs";
import { env } from "../../utils/env.js";
import {
  getWIFPrecedenceSource,
  isWIFUserOAuthDeadError,
  clearWIFPrecedenceCache,
} from "../../utils/wifProfile.js";
import { resolveCredentialsFromConfig } from "../../../vendor/@anthropic-ai/sdk/lib/credentials/credential-chain.mjs";
import { federationCacheDir } from "../../utils/subprocessEnv.js";
import { TokenCache } from "../../../vendor/@anthropic-ai/sdk/lib/credentials/token-cache.mjs";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-gjbr82c9.js:14703-14743 placement
/**
 * WIF 锁的超时秒数（fail-closed 5 秒 / fail-open 15 秒）。
 */
var WIF_LOCK_TIMEOUT_S = {
  "fail-closed": 5,
  "fail-open": 15,
};
//@ chunk-gjbr82c9.js:14743-14788 placement
/**
 * 包上 WIF 凭据锁后执行提供方逻辑。
 */
function withWifLock(run, lockDir, onLockFailure) {
  return (signal) => acquireWifCredentialsLock(lockDir, () => run(signal), onLockFailure);
}
//@ chunk-gjbr82c9.js:14788-14838 placement
/**
 * 以文件所在目录为锁执行 WIF 逻辑。
 */
function withWifLockForDir(credentialDir, refresh) {
  return acquireWifCredentialsLock(dirname(credentialDir), refresh, "fail-closed");
}
//@ chunk-gjbr82c9.js:14838-15282 placement
async function acquireWifCredentialsLock(path, refresh, mode) {
  let maxRetries = WIF_LOCK_TIMEOUT_S[mode];
  let release;
  try {
    release = await acquireLockWithRetry(path, maxRetries, mode);
  } catch (error) {
    if (mode === "fail-closed" || error instanceof WorkloadIdentityError) throw error;
    logForDebugging(
      `wif: credentials lock unavailable at ${path} (${errorMessage(error)}); refreshing without cross-process serialization`,
    );
    return refresh();
  }
  try {
    logEvent("tengu_wif_user_oauth_lock_acquired", {
      mode: fromEnum(mode),
    });
    return await refresh();
  } finally {
    logEvent("tengu_wif_user_oauth_lock_released", {
      mode: fromEnum(mode),
    });
    try {
      await release();
    } catch (error) {
      if (isSyscallError(error)) logForDebugging(`wif: lock release failed: ${error}`);
      else logError(error);
    }
  }
}
//@ chunk-gjbr82c9.js:15282-15815 placement
/**
 * 获取 WIF 凭证文件锁，被占用时重试（随机等待），超过次数报错并记遥测。
 */
async function acquireLockWithRetry(path, maxRetries, mode) {
  for (let k = 0; ; k++)
    try {
      return await lock(path, {
        stale: 60000,
        update: 5000,
        onCompromised: (error) =>
          logForDebugging(`WIF credentials lock compromised: ${error}`, {
            level: "error",
          }),
      });
    } catch (error) {
      if (error.code !== "ELOCKED") throw error;
      if (k >= maxRetries) {
        logEvent("tengu_wif_user_oauth_lock_retry_limit", {
          attempt: k,
          mode: fromEnum(mode),
        });
        let lockError = new WorkloadIdentityError(
          `Could not acquire credentials lock at ${path} after ${maxRetries} retries`,
        );
        lockError.cause = Object.assign(Error("credentials lock busy"), {
          code: "ELOCKED",
        });
        throw lockError;
      }
      logEvent("tengu_wif_user_oauth_lock_retry", {
        attempt: k,
        mode: fromEnum(mode),
      });
      await sleep(1000 + Math.random() * 1000);
    }
}
//@ chunk-gjbr82c9.js:15815-16102 placement
class WifCredentialState {
  generation = 0;
  credentialsPromise = undefined;
  tokenCachePromise = undefined;
  resolvedBaseUrlSnapshot = undefined;
  failedAccessTokens = new Set();
  reset() {
    this.generation += 1;
    this.credentialsPromise = undefined;
    this.tokenCachePromise = undefined;
    this.resolvedBaseUrlSnapshot = undefined;
    this.failedAccessTokens.clear();
  }
}
//@ chunk-gjbr82c9.js:16102-16126 placement
/**
 * 按宿主保存的 WIF 凭据状态。
 */
var wifCredentialState; // deferred: uses WifCredentialState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gjbr82c9.js:16102", () => {
  wifCredentialState = new HostScoped(() => new WifCredentialState());
});
//@ chunk-gjbr82c9.js:16126-16162 placement
/**
 * 取当前宿主的 WIF 凭据状态。
 */
function getWifCredentialState() {
  return wifCredentialState.of(getRootSession().host);
}
//@ chunk-gjbr82c9.js:16162-16172 placement
/**
 * 记录失败令牌的上限（20）。
 */
var MAX_FAILED_TOKENS = 20;
//@ chunk-gjbr82c9.js:16172-16222 placement
function getResolvedWIFBaseUrlSnapshot() {
  return getWifCredentialState().resolvedBaseUrlSnapshot;
}
//@ chunk-gjbr82c9.js:16222-16251 placement
function getWIFCredentials() {
  return resolveWifCredentials(getWifCredentialState());
}
//@ chunk-gjbr82c9.js:16251-17807 placement
/**
 * 解析 WIF（工作负载身份联合）凭据，env 四元组或缓存
 */
function resolveWifCredentials(state) {
  if (state.credentialsPromise === undefined) {
    let { generation } = state;
    state.credentialsPromise = withFeatureTelemetry("wif_credentials_resolve", async () => {
      let config = await loadEnvQuadConfig();
      if (state.generation !== generation) return retryAfterReset(state);
      if (config === null) {
        state.resolvedBaseUrlSnapshot = null;
        return null;
      }
      let baseUrl = env.ANTHROPIC_BASE_URL || config.base_url;
      let apiBaseUrl = baseUrl || "https://api.anthropic.com";
      let credentialsPath =
        getWIFPrecedenceSource() === "env-quad"
          ? await buildWifTokenCache(config, apiBaseUrl)
          : await getRootConfigPath(config);
      let config_2 = {
        ...config,
        base_url: baseUrl,
        ...(config.authentication.credentials_path || credentialsPath === null
          ? {}
          : {
              authentication: {
                ...config.authentication,
                credentials_path: credentialsPath,
              },
            }),
      };
      let [{ getUserAgent }, { getTLSFetchOptions }, { getProxyFetchOptions }] = await Promise.all([
        import("../../utils/http.js"),
        import("../../utils/mtls.js"),
        import("../../utils/proxy.js"),
      ]);
      let credentialsFromConfig = resolveCredentialsFromConfig(config_2, {
        baseURL: apiBaseUrl,
        fetch: (url, init) =>
          fetch(url, {
            ...init,
            ...getProxyFetchOptions({
              forAnthropicAPI: true,
              url: String(url),
            }),
            ...getTLSFetchOptions(undefined),
            signal: AbortSignal.timeout(1e4),
          }),
        userAgent: getUserAgent(),
        onSafetyWarning: (warning) =>
          logForDebugging(warning, {
            level: "warn",
          }),
        onCacheWriteError: (error) =>
          logForDebugging(String(error), {
            level: "warn",
          }),
      });
      if (credentialsPath)
        switch (config.authentication.type) {
          case "user_oauth":
            credentialsFromConfig.provider = withWifLock(
              withSiblingTokenAdoption(
                refreshWifToken(credentialsFromConfig.provider, credentialsPath),
                credentialsPath,
                "after-recorded-401",
                state.failedAccessTokens,
              ),
              dirname(credentialsPath),
              "fail-closed",
            );
            break;
          case "oidc_federation": {
            let federationDir = federationCacheDir();
            if (federationDir === null) break;
            await mkdir(federationDir, {
              recursive: true,
              mode: 448,
            }).catch((error) =>
              logForDebugging(
                `wif: cannot create ${federationDir} (${errorMessage(error)}); the credentials lock may be unavailable`,
                {
                  level: "warn",
                },
              ),
            );
            credentialsFromConfig.provider = withWifLock(
              withSiblingTokenAdoption(
                credentialsFromConfig.provider,
                credentialsPath,
                "always",
                state.failedAccessTokens,
              ),
              federationDir,
              "fail-open",
            );
            break;
          }
        }
      if (state.generation !== generation) return retryAfterReset(state);
      state.resolvedBaseUrlSnapshot = credentialsFromConfig.baseURL ?? null;
      return credentialsFromConfig;
    }).catch((error) => {
      logForDebugging(`WIF credential resolution failed: ${errorMessage(error)}`, {
        level: "error",
      });
      throw error instanceof WorkloadIdentityError ? error : new WorkloadIdentityError(errorMessage(error));
    });
  }
  return state.credentialsPromise;
}
//@ chunk-gjbr82c9.js:17807-17907 placement
function retryAfterReset(state) {
  logForDebugging("wif: sign-in state was reset during this lookup; looking it up again");
  return resolveWifCredentials(state);
}
//@ chunk-gjbr82c9.js:17907-18141 placement
async function invalidateWIFToken(authToken) {
  let wifCredentialState = getWifCredentialState();
  let tokenCache = await getWifTokenCache(wifCredentialState).catch(() => null);
  if (tokenCache === null) return;
  if (authToken) {
    wifCredentialState.failedAccessTokens.add(authToken);
    if (wifCredentialState.failedAccessTokens.size > MAX_FAILED_TOKENS)
      for (let failedAccessToken of wifCredentialState.failedAccessTokens) {
        wifCredentialState.failedAccessTokens.delete(failedAccessToken);
        break;
      }
  }
  tokenCache.invalidate();
}
//@ chunk-gjbr82c9.js:18141-18170 placement
function getWIFTokenCache() {
  return getWifTokenCache(getWifCredentialState());
}
//@ chunk-gjbr82c9.js:18170-18542 placement
/**
 * 获取 WIF 令牌缓存（懒创建）：交换令牌时记遥测，错误统一包装。
 */
function getWifTokenCache(state) {
  state.tokenCachePromise ??= resolveWifCredentials(state).then((wifCredentials) => {
    if (wifCredentials === null) return null;
    return new TokenCache(
      async (options) => {
        try {
          let token = await wifCredentials.provider(options);
          logFeatureOk("wif_token_exchange");
          return token;
        } catch (error) {
          let workloadError =
            error instanceof WorkloadIdentityError
              ? error
              : new WorkloadIdentityError(error instanceof Error ? error.message : String(error), null);
          if (workloadError !== error) workloadError.cause = error;
          logFeatureBad("wif_token_exchange", classifyWifRefreshError(workloadError));
          throw workloadError;
        }
      },
      (error) =>
        logForDebugging(String(error), {
          level: "warn",
        }),
    );
  });
  return state.tokenCachePromise;
}
//@ chunk-gjbr82c9.js:18542-19255 placement
/**
 * 包装令牌提供函数：强制刷新时先检查凭证文件里是否已有其他进程轮换好的、未失败且未过期的访问令牌，有则直接采用以跳过刷新。
 */
function withSiblingTokenAdoption(provider, credentialsPath, mode, failedTokens) {
  return async (options) => {
    if (!options?.forceRefresh) return provider(options);
    if (mode === "always" || failedTokens.size > 0)
      try {
        await checkCredentialsFileSafety(credentialsPath, (message) =>
          logForDebugging(message, {
            level: "warn",
          }),
        );
        let fsModule = await import("fs");
        let parsed = JSON.parse(await fsModule.promises.readFile(credentialsPath, "utf-8"));
        let accessToken = parsed.access_token;
        let expiresAt = parsed.expires_at == null ? null : Number(parsed.expires_at);
        if (
          typeof accessToken === "string" &&
          accessToken &&
          !failedTokens.has(accessToken) &&
          (expiresAt === null || Date.now() / 1000 < expiresAt - MAX_FEDERATION_TOKEN_TTL_SECONDS)
        ) {
          let { logEvent } = await import("../analytics/index.js");
          let { fromEnum } = await import("../analytics/safeMetadata.js");
          logEvent("tengu_wif_user_oauth_refresh_race_resolved", {
            mode: fromEnum(mode),
          });
          logForDebugging(
            "wif: adopting sibling-rotated access token from credentials file; skipping refresh grant",
          );
          return {
            token: accessToken,
            expiresAt,
          };
        }
      } catch (error) {
        logForDebugging(`wif: rotated-token adoption check failed: ${errorMessage(error)}`);
      }
    return provider(options);
  };
}
//@ chunk-gjbr82c9.js:19255-19979 placement
function refreshWifToken(provider, credentialsPath) {
  let readCredentials = async () => {
    try {
      let fsModule = await import("fs");
      return JSON.parse(await fsModule.promises.readFile(credentialsPath, "utf-8"));
    } catch {
      return null;
    }
  };
  return async (options) => {
    let refreshToken = (await readCredentials())?.refresh_token;
    try {
      return await provider(options);
    } catch (error) {
      if (
        error instanceof WorkloadIdentityError &&
        (error.statusCode === 400 || error.statusCode === 401) &&
        typeof error.body === "string" &&
        error.body.includes('"invalid_grant"') &&
        getWIFAccountOnHold(error) === null &&
        typeof refreshToken === "string" &&
        refreshToken
      )
        try {
          let current = await readCredentials();
          if (current && current.refresh_token === refreshToken) {
            let { logEvent } = await import("../analytics/index.js");
            await writeCredentialsFileAtomic(credentialsPath, {
              ...current,
              refresh_token: undefined,
            });
            logEvent("tengu_wif_user_oauth_refresh_token_cleared", {});
          }
        } catch (error) {
          if (isFsInaccessible(error)) logForDebugging(`wif: refresh-token cleanup write failed: ${error}`);
          else
            logError(
              withTelemetryMessage(toError(error), "WIF: failed to clear stale user_oauth refresh_token"),
            );
        }
      throw error;
    }
  };
}
//@ chunk-gjbr82c9.js:19979-20222 placement
function isWIFTransientExchangeError(error) {
  if (error instanceof WorkloadIdentityError && typeof error.statusCode === "number")
    return error.statusCode >= 500 || error.statusCode === 429 || error.statusCode === 408;
  let current = error;
  for (let k = 0; k < 4 && current instanceof Error; k++) {
    if (current.name === "TimeoutError" || isTransientNetworkCode(current)) return true;
    current = current.cause;
  }
  return false;
}
//@ chunk-gjbr82c9.js:20222-20637 placement
/**
 * 判断错误码是否为临时网络错误（连接重置、拒绝、超时、DNS 等，以及锁占用）。
 */
function isTransientNetworkCode(error) {
  switch ("code" in error && typeof error.code === "string" ? error.code : "") {
    case "ECONNRESET":
    case "ECONNREFUSED":
    case "ECONNABORTED":
    case "ETIMEDOUT":
    case "EHOSTUNREACH":
    case "ENETUNREACH":
    case "ENETDOWN":
    case "ENOTFOUND":
    case "EAI_AGAIN":
    case "EPIPE":
    case "UND_ERR_SOCKET":
    case "UND_ERR_CONNECT_TIMEOUT":
    case "ELOCKED":
    case "ConnectionRefused":
    case "ConnectionClosed":
    case "FailedToOpenSocket":
    case "Timeout":
      return true;
    default:
      return false;
  }
}
//@ chunk-gjbr82c9.js:20637-21038 placement
function classifyWifRefreshError(error) {
  if (isWIFUserOAuthDeadError(error)) return "no_refresh_available";
  if (getWIFAccountOnHold(error)) return "account_on_hold";
  if (typeof error.body === "string" && error.body.includes('"invalid_grant"')) return "invalid_grant";
  if (typeof error.statusCode === "number") {
    if (error.statusCode >= 500) return "http_5xx";
    if (error.statusCode >= 400) return "http_4xx";
  }
  let lower = error.message.toLowerCase();
  if (lower.includes("parse") || lower.includes("json")) return "parse_failed";
  return "network_error";
}
//@ chunk-gjbr82c9.js:21038-21071 placement
function resetWIFCredentialState() {
  getWifCredentialState().reset();
  clearWIFPrecedenceCache();
}
export {
  getResolvedWIFBaseUrlSnapshot,
  getWIFCredentials,
  invalidateWIFToken,
  getWIFTokenCache,
  withWifLockForDir,
  resetWIFCredentialState,
  isWIFTransientExchangeError,
};
