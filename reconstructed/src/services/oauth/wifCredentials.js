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
import { dirname, dirname as dirname_2 } from "path";
import { mkdir } from "fs/promises";
import {
  rp,
  rMn,
  hMt,
  getWIFAccountOnHold,
  v8e,
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
var le = { "fail-closed": 5, "fail-open": 15 };
//@ chunk-3wydcdvj.js:14743-14788 placement
function v(e, n, r) {
  return (s) => acquireWifCredentialsLock(n, () => e(s), r);
}
//@ chunk-3wydcdvj.js:14788-14838 placement
function Lns(e, n) {
  return acquireWifCredentialsLock(dirname_2(e), n, "fail-closed");
}
//@ chunk-3wydcdvj.js:14838-15282 placement
async function acquireWifCredentialsLock(e, n, r) {
  let s = le[r],
    o;
  try {
    o = await acquireLockWithRetry(e, s, r);
  } catch (error) {
    if (r === "fail-closed" || error instanceof rp) throw error;
    return (
      logForDebugging(
        `wif: credentials lock unavailable at ${e} (${errorMessage(error)}); refreshing without cross-process serialization`,
      ),
      n()
    );
  }
  try {
    return (logEvent("tengu_wif_user_oauth_lock_acquired", { mode: fromEnum(r) }), await n());
  } finally {
    logEvent("tengu_wif_user_oauth_lock_released", { mode: fromEnum(r) });
    try {
      await o();
    } catch (error) {
      if (isSyscallError(error)) logForDebugging(`wif: lock release failed: ${error}`);
      else logError(error);
    }
  }
}
/**
 * 获取 WIF 凭证文件锁，被占用时重试（随机等待），超过次数报错并记遥测。
 */
//@ chunk-3wydcdvj.js:15282-15815 placement
async function acquireLockWithRetry(path, maxRetries, mode) {
  for (let s = 0; ; s++)
    try {
      return await lock(path, {
        stale: 60000,
        update: 5000,
        onCompromised: (o) => logForDebugging(`WIF credentials lock compromised: ${o}`, { level: "error" }),
      });
    } catch (error) {
      if (error.code !== "ELOCKED") throw error;
      if (s >= maxRetries) {
        logEvent("tengu_wif_user_oauth_lock_retry_limit", { attempt: s, mode: fromEnum(mode) });
        let u = new rp(`Could not acquire credentials lock at ${path} after ${maxRetries} retries`);
        throw ((u.cause = Object.assign(Error("credentials lock busy"), { code: "ELOCKED" })), u);
      }
      (logEvent("tengu_wif_user_oauth_lock_retry", { attempt: s, mode: fromEnum(mode) }),
        await sleep(1000 + Math.random() * 1000));
    }
}
//@ chunk-3wydcdvj.js:15815-16102 placement
class WifCredentialState {
  generation = 0;
  credentialsPromise = void 0;
  tokenCachePromise = void 0;
  resolvedBaseUrlSnapshot = void 0;
  failedAccessTokens = new Set();
  reset() {
    ((this.generation += 1),
      (this.credentialsPromise = void 0),
      (this.tokenCachePromise = void 0),
      (this.resolvedBaseUrlSnapshot = void 0),
      this.failedAccessTokens.clear());
  }
}
//@ chunk-3wydcdvj.js:16102-16126 placement
var we = new HostScoped(() => new WifCredentialState());
//@ chunk-3wydcdvj.js:16126-16162 placement
function A() {
  return we.of(getRootSession().host);
}
//@ chunk-3wydcdvj.js:16162-16172 placement
var me = 20;
//@ chunk-3wydcdvj.js:16172-16222 placement
function getResolvedWIFBaseUrlSnapshot() {
  return A().resolvedBaseUrlSnapshot;
}
//@ chunk-3wydcdvj.js:16222-16251 placement
function getWIFCredentials() {
  return resolveWifCredentials(A());
}
/**
 * 解析 WIF（工作负载身份联合）凭据，env 四元组或缓存
 */
//@ chunk-3wydcdvj.js:16251-17807 placement
function resolveWifCredentials(e) {
  if (e.credentialsPromise === void 0) {
    let { generation: generation } = e;
    e.credentialsPromise = withFeatureTelemetry("wif_credentials_resolve", async () => {
      let r = await Te();
      if (e.generation !== generation) return retryAfterReset(e);
      if (r === null) return ((e.resolvedBaseUrlSnapshot = null), null);
      let s = env.ANTHROPIC_BASE_URL || r.base_url,
        o = s || "https://api.anthropic.com",
        f = getWIFPrecedenceSource() === "env-quad" ? await ge(r, o) : await S(r),
        h = {
          ...r,
          base_url: s,
          ...(r.authentication.credentials_path || f === null
            ? {}
            : { authentication: { ...r.authentication, credentials_path: f } }),
        },
        [{ getUserAgent: _ }, { getTLSFetchOptions: p }, { getProxyFetchOptions: w }] = await Promise.all([
          import("./chunk-b8205c2p.js"),
          import("./chunk-afejk3jk.js"),
          import("./chunk-amdegp7s.js"),
        ]),
        E = resolveCredentialsFromConfig(h, {
          baseURL: o,
          fetch: (k, T) =>
            fetch(k, {
              ...T,
              ...w({ forAnthropicAPI: !0, url: String(k) }),
              ...p(void 0),
              signal: AbortSignal.timeout(1e4),
            }),
          userAgent: _(),
          onSafetyWarning: (k) => logForDebugging(k, { level: "warn" }),
          onCacheWriteError: (k) => logForDebugging(String(k), { level: "warn" }),
        });
      if (f)
        switch (r.authentication.type) {
          case "user_oauth":
            E.provider = v(
              withSiblingTokenAdoption(
                refreshWifToken(E.provider, f),
                f,
                "after-recorded-401",
                e.failedAccessTokens,
              ),
              dirname(f),
              "fail-closed",
            );
            break;
          case "oidc_federation": {
            let k = federationCacheDir();
            if (k === null) break;
            (await mkdir(k, { recursive: !0, mode: 448 }).catch((T) =>
              logForDebugging(
                `wif: cannot create ${k} (${errorMessage(T)}); the credentials lock may be unavailable`,
                { level: "warn" },
              ),
            ),
              (E.provider = v(
                withSiblingTokenAdoption(E.provider, f, "always", e.failedAccessTokens),
                k,
                "fail-open",
              )));
            break;
          }
        }
      if (e.generation !== generation) return retryAfterReset(e);
      return ((e.resolvedBaseUrlSnapshot = E.baseURL ?? null), E);
    }).catch((r) => {
      throw (
        logForDebugging(`WIF credential resolution failed: ${errorMessage(r)}`, { level: "error" }),
        r instanceof rp ? r : new rp(errorMessage(r))
      );
    });
  }
  return e.credentialsPromise;
}
//@ chunk-3wydcdvj.js:17807-17907 placement
function retryAfterReset(e) {
  return (
    logForDebugging("wif: sign-in state was reset during this lookup; looking it up again"),
    resolveWifCredentials(e)
  );
}
//@ chunk-3wydcdvj.js:17907-18141 placement
async function invalidateWIFToken(e) {
  let n = A(),
    r = await getWifTokenCache(n).catch(() => null);
  if (r === null) return;
  if (e) {
    if ((n.failedAccessTokens.add(e), n.failedAccessTokens.size > me))
      for (let failedAccessToken of n.failedAccessTokens) {
        n.failedAccessTokens.delete(failedAccessToken);
        break;
      }
  }
  r.invalidate();
}
//@ chunk-3wydcdvj.js:18141-18170 placement
function getWIFTokenCache() {
  return getWifTokenCache(A());
}
/**
 * 获取 WIF 令牌缓存（懒创建）：交换令牌时记遥测，错误统一包装。
 */
//@ chunk-3wydcdvj.js:18170-18542 placement
function getWifTokenCache(e) {
  return (
    (e.tokenCachePromise ??= resolveWifCredentials(e).then((n) => {
      if (n === null) return null;
      return new TokenCache(
        async (s) => {
          try {
            let provider = await n.provider(s);
            return (logFeatureOk("wif_token_exchange"), provider);
          } catch (error) {
            let u =
              error instanceof rp
                ? error
                : new rp(error instanceof Error ? error.message : String(error), null);
            if (u !== error) u.cause = error;
            throw (logFeatureBad("wif_token_exchange", classifyWifRefreshError(u)), u);
          }
        },
        (s) => logForDebugging(String(s), { level: "warn" }),
      );
    })),
    e.tokenCachePromise
  );
}
/**
 * 包装令牌提供函数：强制刷新时先检查凭证文件里是否已有其他进程轮换好的、未失败且未过期的访问令牌，有则直接采用以跳过刷新。
 */
//@ chunk-3wydcdvj.js:18542-19255 placement
function withSiblingTokenAdoption(provider, credentialsPath, mode, failedTokens) {
  return async (o) => {
    if (!o?.forceRefresh) return provider(o);
    if (mode === "always" || failedTokens.size > 0)
      try {
        await rMn(credentialsPath, (p) => logForDebugging(p, { level: "warn" }));
        let u = await import("fs"),
          parsed = JSON.parse(await u.promises.readFile(credentialsPath, "utf-8")),
          access_token = parsed.access_token,
          _ = parsed.expires_at == null ? null : Number(parsed.expires_at);
        if (
          typeof access_token === "string" &&
          access_token &&
          !failedTokens.has(access_token) &&
          (_ === null || Date.now() / 1000 < _ - hMt)
        ) {
          let { logEvent: logEvent } = await import("./chunk-ezz35vxh.js"),
            { fromEnum: fromEnum } = await import("./chunk-01ass7n1.js");
          return (
            logEvent("tengu_wif_user_oauth_refresh_race_resolved", { mode: fromEnum(mode) }),
            logForDebugging(
              "wif: adopting sibling-rotated access token from credentials file; skipping refresh grant",
            ),
            { token: access_token, expiresAt: _ }
          );
        }
      } catch (error) {
        logForDebugging(`wif: rotated-token adoption check failed: ${errorMessage(error)}`);
      }
    return provider(o);
  };
}
//@ chunk-3wydcdvj.js:19255-19979 placement
function refreshWifToken(e, n) {
  let r = async () => {
    try {
      let s = await import("fs");
      return JSON.parse(await s.promises.readFile(n, "utf-8"));
    } catch {
      return null;
    }
  };
  return async (s) => {
    let u = (await r())?.refresh_token;
    try {
      return await e(s);
    } catch (error) {
      if (
        error instanceof rp &&
        (error.statusCode === 400 || error.statusCode === 401) &&
        typeof error.body === "string" &&
        error.body.includes('"invalid_grant"') &&
        getWIFAccountOnHold(error) === null &&
        typeof u === "string" &&
        u
      )
        try {
          let h = await r();
          if (h && h.refresh_token === u) {
            let { logEvent: logEvent } = await import("./chunk-ezz35vxh.js");
            (await v8e(n, { ...h, refresh_token: void 0 }),
              logEvent("tengu_wif_user_oauth_refresh_token_cleared", {}));
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
  if (e instanceof rp && typeof e.statusCode === "number")
    return e.statusCode >= 500 || e.statusCode === 429 || e.statusCode === 408;
  let n = e;
  for (let r = 0; r < 4 && n instanceof Error; r++) {
    if (n.name === "TimeoutError" || isTransientNetworkCode(n)) return !0;
    n = n.cause;
  }
  return !1;
}
/**
 * 判断错误码是否为临时网络错误（连接重置、拒绝、超时、DNS 等，以及锁占用）。
 */
//@ chunk-3wydcdvj.js:20222-20637 placement
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
      return !0;
    default:
      return !1;
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
  (A().reset(), clearWIFPrecedenceCache());
}

export {
  getResolvedWIFBaseUrlSnapshot,
  getWIFTokenCache,
  getWIFCredentials,
  invalidateWIFToken,
  Lns,
  resetWIFCredentialState,
};
