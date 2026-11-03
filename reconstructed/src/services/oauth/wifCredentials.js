/**
 * services/oauth/wifCredentials.ts
 *
 * WIF 凭据解析、锁与刷新（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wydcdvj.js (22)
 * attribution: placement 22
 */
import { dirname } from "path";
import { mkdir } from "fs/promises";
import {
  WorkloadIdentityError,
  checkCredentialsFileSafety,
  hMt,
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
import { Te, ge, S } from "../../../vendor/@anthropic-ai/sdk/core/credentials.mjs";
import { env } from "../../utils/env.js";
import {
  getWIFPrecedenceSource,
  isWIFUserOAuthDeadError,
  clearWIFPrecedenceCache,
} from "../../utils/wifProfile.js";
import { resolveCredentialsFromConfig } from "../../../vendor/@anthropic-ai/sdk/lib/credentials/credential-chain.mjs";
import { federationCacheDir } from "../../utils/subprocessEnv.js";
import { TokenCache } from "../../../vendor/@anthropic-ai/sdk/lib/credentials/token-cache.mjs";

//@ chunk-3wydcdvj.js:14703-14743 placement
/**
 * WIF 锁的超时秒数（fail-closed 5 秒 / fail-open 15 秒）。
 */
var WIF_LOCK_TIMEOUT_S = {
  "fail-closed": 5,
  "fail-open": 15,
};
//@ chunk-3wydcdvj.js:14743-14788 placement
/**
 * 包上 WIF 凭据锁后执行提供方逻辑。
 */
function withWifLock(e, n, r) {
  return (s) => acquireWifCredentialsLock(n, () => e(s), r);
}
//@ chunk-3wydcdvj.js:14788-14838 placement
/**
 * 以文件所在目录为锁执行 WIF 逻辑。
 */
function withWifLockForDir(e, n) {
  return acquireWifCredentialsLock(dirname(e), n, "fail-closed");
}
//@ chunk-3wydcdvj.js:14838-15282 placement
async function acquireWifCredentialsLock(path, n, mode) {
  let maxRetries = WIF_LOCK_TIMEOUT_S[mode];
  let o;
  try {
    o = await acquireLockWithRetry(path, maxRetries, mode);
  } catch (error) {
    if (mode === "fail-closed" || error instanceof WorkloadIdentityError) throw error;
    logForDebugging(
      `wif: credentials lock unavailable at ${path} (${errorMessage(error)}); refreshing without cross-process serialization`,
    );
    return n();
  }
  try {
    logEvent("tengu_wif_user_oauth_lock_acquired", {
      mode: fromEnum(mode),
    });
    return await n();
  } finally {
    logEvent("tengu_wif_user_oauth_lock_released", {
      mode: fromEnum(mode),
    });
    try {
      await o();
    } catch (error) {
      if (isSyscallError(error)) logForDebugging(`wif: lock release failed: ${error}`);
      else logError(error);
    }
  }
}
//@ chunk-3wydcdvj.js:15282-15815 placement
/**
 * 获取 WIF 凭证文件锁，被占用时重试（随机等待），超过次数报错并记遥测。
 */
async function acquireLockWithRetry(path, maxRetries, mode) {
  for (let k = 0; ; k++)
    try {
      return await lock(path, {
        stale: 60000,
        update: 5000,
        onCompromised: (o) =>
          logForDebugging(`WIF credentials lock compromised: ${o}`, {
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
        let u = new WorkloadIdentityError(
          `Could not acquire credentials lock at ${path} after ${maxRetries} retries`,
        );
        u.cause = Object.assign(Error("credentials lock busy"), {
          code: "ELOCKED",
        });
        throw u;
      }
      logEvent("tengu_wif_user_oauth_lock_retry", {
        attempt: k,
        mode: fromEnum(mode),
      });
      await sleep(1000 + Math.random() * 1000);
    }
}
//@ chunk-3wydcdvj.js:15815-16102 placement
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
//@ chunk-3wydcdvj.js:16102-16126 placement
/**
 * 按宿主保存的 WIF 凭据状态。
 */
var wifCredentialState = new HostScoped(() => new WifCredentialState());
//@ chunk-3wydcdvj.js:16126-16162 placement
/**
 * 取当前宿主的 WIF 凭据状态。
 */
function getWifCredentialState() {
  return wifCredentialState.of(getRootSession().host);
}
//@ chunk-3wydcdvj.js:16162-16172 placement
/**
 * 记录失败令牌的上限（20）。
 */
var MAX_FAILED_TOKENS = 20;
//@ chunk-3wydcdvj.js:16172-16222 placement
function getResolvedWIFBaseUrlSnapshot() {
  return getWifCredentialState().resolvedBaseUrlSnapshot;
}
//@ chunk-3wydcdvj.js:16222-16251 placement
function getWIFCredentials() {
  return resolveWifCredentials(getWifCredentialState());
}
//@ chunk-3wydcdvj.js:16251-17807 placement
/**
 * 解析 WIF（工作负载身份联合）凭据，env 四元组或缓存
 */
function resolveWifCredentials(e) {
  if (e.credentialsPromise === undefined) {
    let { generation } = e;
    e.credentialsPromise = withFeatureTelemetry("wif_credentials_resolve", async () => {
      let config = await Te();
      if (e.generation !== generation) return retryAfterReset(e);
      if (config === null) {
        e.resolvedBaseUrlSnapshot = null;
        return null;
      }
      let s = env.ANTHROPIC_BASE_URL || config.base_url;
      let o = s || "https://api.anthropic.com";
      let credentialsPath = getWIFPrecedenceSource() === "env-quad" ? await ge(config, o) : await S(config);
      let config_2 = {
        ...config,
        base_url: s,
        ...(config.authentication.credentials_path || credentialsPath === null
          ? {}
          : {
              authentication: {
                ...config.authentication,
                credentials_path: credentialsPath,
              },
            }),
      };
      let [{ getUserAgent: _ }, { getTLSFetchOptions: p }, { getProxyFetchOptions: w }] = await Promise.all([
        import("./chunk-b8205c2p.js"),
        import("./chunk-afejk3jk.js"),
        import("./chunk-amdegp7s.js"),
      ]);
      let credentialsFromConfig = resolveCredentialsFromConfig(config_2, {
        baseURL: o,
        fetch: (k, T) =>
          fetch(k, {
            ...T,
            ...w({
              forAnthropicAPI: true,
              url: String(k),
            }),
            ...p(undefined),
            signal: AbortSignal.timeout(1e4),
          }),
        userAgent: _(),
        onSafetyWarning: (k) =>
          logForDebugging(k, {
            level: "warn",
          }),
        onCacheWriteError: (k) =>
          logForDebugging(String(k), {
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
                e.failedAccessTokens,
              ),
              dirname(credentialsPath),
              "fail-closed",
            );
            break;
          case "oidc_federation": {
            let k = federationCacheDir();
            if (k === null) break;
            await mkdir(k, {
              recursive: true,
              mode: 448,
            }).catch((error) =>
              logForDebugging(
                `wif: cannot create ${k} (${errorMessage(error)}); the credentials lock may be unavailable`,
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
                e.failedAccessTokens,
              ),
              k,
              "fail-open",
            );
            break;
          }
        }
      if (e.generation !== generation) return retryAfterReset(e);
      e.resolvedBaseUrlSnapshot = credentialsFromConfig.baseURL ?? null;
      return credentialsFromConfig;
    }).catch((error) => {
      logForDebugging(`WIF credential resolution failed: ${errorMessage(error)}`, {
        level: "error",
      });
      throw error instanceof WorkloadIdentityError ? error : new WorkloadIdentityError(errorMessage(error));
    });
  }
  return e.credentialsPromise;
}
//@ chunk-3wydcdvj.js:17807-17907 placement
function retryAfterReset(e) {
  logForDebugging("wif: sign-in state was reset during this lookup; looking it up again");
  return resolveWifCredentials(e);
}
//@ chunk-3wydcdvj.js:17907-18141 placement
async function invalidateWIFToken(authToken) {
  let wifCredentialState = getWifCredentialState();
  let r = await getWifTokenCache(wifCredentialState).catch(() => null);
  if (r === null) return;
  if (authToken) {
    wifCredentialState.failedAccessTokens.add(authToken);
    if (wifCredentialState.failedAccessTokens.size > MAX_FAILED_TOKENS)
      for (let failedAccessToken of wifCredentialState.failedAccessTokens) {
        wifCredentialState.failedAccessTokens.delete(failedAccessToken);
        break;
      }
  }
  r.invalidate();
}
//@ chunk-3wydcdvj.js:18141-18170 placement
function getWIFTokenCache() {
  return getWifTokenCache(getWifCredentialState());
}
//@ chunk-3wydcdvj.js:18170-18542 placement
/**
 * 获取 WIF 令牌缓存（懒创建）：交换令牌时记遥测，错误统一包装。
 */
function getWifTokenCache(wifCredentialState) {
  wifCredentialState.tokenCachePromise ??= resolveWifCredentials(wifCredentialState).then(
    (wifCredentials) => {
      if (wifCredentials === null) return null;
      return new TokenCache(
        async (s) => {
          try {
            let o = await wifCredentials.provider(s);
            logFeatureOk("wif_token_exchange");
            return o;
          } catch (error) {
            let u =
              error instanceof WorkloadIdentityError
                ? error
                : new WorkloadIdentityError(error instanceof Error ? error.message : String(error), null);
            if (u !== error) u.cause = error;
            logFeatureBad("wif_token_exchange", classifyWifRefreshError(u));
            throw u;
          }
        },
        (s) =>
          logForDebugging(String(s), {
            level: "warn",
          }),
      );
    },
  );
  return wifCredentialState.tokenCachePromise;
}
//@ chunk-3wydcdvj.js:18542-19255 placement
/**
 * 包装令牌提供函数：强制刷新时先检查凭证文件里是否已有其他进程轮换好的、未失败且未过期的访问令牌，有则直接采用以跳过刷新。
 */
function withSiblingTokenAdoption(provider, credentialsPath, mode, failedTokens) {
  return async (o) => {
    if (!o?.forceRefresh) return provider(o);
    if (mode === "always" || failedTokens.size > 0)
      try {
        await checkCredentialsFileSafety(credentialsPath, (p) =>
          logForDebugging(p, {
            level: "warn",
          }),
        );
        let u = await import("fs");
        let parsed = JSON.parse(await u.promises.readFile(credentialsPath, "utf-8"));
        let accessToken = parsed.access_token;
        let _ = parsed.expires_at == null ? null : Number(parsed.expires_at);
        if (
          typeof accessToken === "string" &&
          accessToken &&
          !failedTokens.has(accessToken) &&
          (_ === null || Date.now() / 1000 < _ - hMt)
        ) {
          let { logEvent } = await import("./chunk-ezz35vxh.js");
          let { fromEnum } = await import("./chunk-01ass7n1.js");
          logEvent("tengu_wif_user_oauth_refresh_race_resolved", {
            mode: fromEnum(mode),
          });
          logForDebugging(
            "wif: adopting sibling-rotated access token from credentials file; skipping refresh grant",
          );
          return {
            token: accessToken,
            expiresAt: _,
          };
        }
      } catch (error) {
        logForDebugging(`wif: rotated-token adoption check failed: ${errorMessage(error)}`);
      }
    return provider(o);
  };
}
//@ chunk-3wydcdvj.js:19255-19979 placement
function refreshWifToken(provider, n) {
  let r = async () => {
    try {
      let s = await import("fs");
      return JSON.parse(await s.promises.readFile(n, "utf-8"));
    } catch {
      return null;
    }
  };
  return async (s) => {
    let refreshToken = (await r())?.refresh_token;
    try {
      return await provider(s);
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
          let h = await r();
          if (h && h.refresh_token === refreshToken) {
            let { logEvent } = await import("./chunk-ezz35vxh.js");
            await writeCredentialsFileAtomic(n, {
              ...h,
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
//@ chunk-3wydcdvj.js:19979-20222 placement
function isWIFTransientExchangeError(e) {
  if (e instanceof WorkloadIdentityError && typeof e.statusCode === "number")
    return e.statusCode >= 500 || e.statusCode === 429 || e.statusCode === 408;
  let n = e;
  for (let k = 0; k < 4 && n instanceof Error; k++) {
    if (n.name === "TimeoutError" || isTransientNetworkCode(n)) return true;
    n = n.cause;
  }
  return false;
}
//@ chunk-3wydcdvj.js:20222-20637 placement
/**
 * 判断错误码是否为临时网络错误（连接重置、拒绝、超时、DNS 等，以及锁占用）。
 */
function isTransientNetworkCode(e) {
  switch ("code" in e && typeof e.code === "string" ? e.code : "") {
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
//@ chunk-3wydcdvj.js:20637-21038 placement
function classifyWifRefreshError(e) {
  if (isWIFUserOAuthDeadError(e)) return "no_refresh_available";
  if (getWIFAccountOnHold(e)) return "account_on_hold";
  if (typeof e.body === "string" && e.body.includes('"invalid_grant"')) return "invalid_grant";
  if (typeof e.statusCode === "number") {
    if (e.statusCode >= 500) return "http_5xx";
    if (e.statusCode >= 400) return "http_4xx";
  }
  let lower = e.message.toLowerCase();
  if (lower.includes("parse") || lower.includes("json")) return "parse_failed";
  return "network_error";
}
//@ chunk-3wydcdvj.js:21038-21071 placement
function resetWIFCredentialState() {
  getWifCredentialState().reset();
  clearWIFPrecedenceCache();
}
export {
  getResolvedWIFBaseUrlSnapshot,
  getWIFTokenCache,
  getWIFCredentials,
  invalidateWIFToken,
  withWifLockForDir,
  resetWIFCredentialState,
};
