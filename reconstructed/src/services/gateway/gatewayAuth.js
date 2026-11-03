/**
 * services/gateway/gatewayAuth.ts
 *
 * 2.1.316 新增：向网关 /oauth/token 交换刷新令牌，保存新 JWT（[gateway-refresh] 日志）；替换网关凭据与允许列表条目等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (19)
 * attribution: placement 19
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2, create_3 } from "../../../vendor/zod/lib/index.mjs";
import {
  getGatewayAuth,
  getGatewayRefreshInFlight,
  setGatewayRefreshInFlight,
  isGatewayAuthPinned,
  setGatewayAuth,
} from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { getGatewayTokenFromFileDescriptor } from "../../utils/authFileDescriptor.js";
import { logForDebugging } from "../../utils/debug.js";
import { normalizeGatewayUrl } from "./hostCheck.js";
import { CliUserError, errorMessage, getErrnoCode, classifyAxiosError } from "../../utils/errors.js";
import { decodeJwtExpiry } from "../../bridge/jwtUtils.js";
import {
  pinnedAgentFor,
  readGatewayTrust,
  pinMismatchFromError,
  PIN_STORE_SYMLINK_MESSAGE,
} from "./vouching.js";
import { hostOf } from "./internalNetworks.js";
import { externalHttp } from "../http/externalHttp.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { mutateEveryCredentialLeg } from "../../utils/secureStorage/credentialLegs.js";

//@ chunk-aepeg2w5.js:492087-492281 placement = JwtBearerResponseSchema (0.393)
/**
 * 网关令牌提前刷新的余量，以及网关令牌响应与吊销端点发现的 schema。
 */
var GATEWAY_REFRESH_MARGIN_MS = 300000;
var gatewayTokenResponseSchema = DoctorLazy(() =>
  create({
    access_token: create_2(),
    expires_in: create_3(),
    refresh_token: create_2().nullish(),
    email: create_2().nullish().catch(undefined),
  }),
);
var gatewayRevocationSchema = DoctorLazy(() =>
  create({
    revocation_endpoint: create_2().nullish().catch(undefined),
  }),
);
//@ chunk-aepeg2w5.js:492281-492380 placement
/**
 * 两点同源时返回该地址（否则 undefined）。
 */
function sameOriginUrl(e, n) {
  if (!n) return;
  try {
    if (new URL(n).origin === new URL(e).origin) return n;
  } catch {}
  return;
}
//@ chunk-aepeg2w5.js:492380-492613 placement
/**
 * 网关 JWT 将过期时用 IdP 刷新令牌刷新（单飞）。
 */
function refreshGatewayToken(e, { force: n = false } = {}) {
  if (isProviderManagedUnpinnedGateway()) readGatewayEnvConfig();
  let gatewayAuth = getGatewayAuth();
  if (
    !gatewayAuth?.idpRefreshToken ||
    (!n && gatewayAuth.expiresAt - Date.now() >= GATEWAY_REFRESH_MARGIN_MS)
  )
    return Promise.resolve();
  let gatewayRefreshInFlight = getGatewayRefreshInFlight();
  if (gatewayRefreshInFlight) return gatewayRefreshInFlight;
  let h = exchangeGatewayRefreshToken(gatewayAuth, gatewayAuth.idpRefreshToken, e).finally(() =>
    setGatewayRefreshInFlight(null),
  );
  setGatewayRefreshInFlight(h);
  return h;
}
//@ chunk-aepeg2w5.js:492613-493254 placement
/**
 * 读取 CLAUDE_CODE_USE_GATEWAY 配置（ANTHROPIC_BASE_URL、令牌），缺失时警告。
 */
function readGatewayEnvConfig() {
  {
    if (!env.CLAUDE_CODE_USE_GATEWAY) return false;
    let ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL;
    let n = env.ANTHROPIC_AUTH_TOKEN || getGatewayTokenFromFileDescriptor();
    if (!ANTHROPIC_BASE_URL || !n) {
      logForDebugging(
        `CLAUDE_CODE_USE_GATEWAY is set but ${!ANTHROPIC_BASE_URL ? "ANTHROPIC_BASE_URL is missing" : "no ANTHROPIC_AUTH_TOKEN and no token on a gateway descriptor / snapshot"}; ignoring`,
        {
          level: "warn",
        },
      );
      return false;
    }
    let gatewayAuth = getGatewayAuth();
    if (isGatewayAuthPinned(gatewayAuth) || gatewayAuth?.jwt === n) return true;
    let url = gatewayAuth?.url;
    if (!url)
      try {
        url = normalizeGatewayUrl(ANTHROPIC_BASE_URL);
      } catch (error) {
        throw new CliUserError(
          `CLAUDE_CODE_USE_GATEWAY is set but ANTHROPIC_BASE_URL is invalid: ${errorMessage(error)}`,
        );
      }
    let h = decodeJwtExpiry(n);
    setGatewayAuth({
      url,
      jwt: n,
      expiresAt: h !== null ? h * 1000 : Number.MAX_SAFE_INTEGER,
      unpinned: true,
      ...(gatewayAuth?.hostVerdict && {
        hostVerdict: gatewayAuth.hostVerdict,
      }),
    });
    return true;
  }
  return false;
}
//@ chunk-aepeg2w5.js:493254-493336 placement
/**
 * 网关凭据是否由宿主提供且未固定（需要重新读环境）。
 */
function isProviderManagedUnpinnedGateway() {
  return env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && getGatewayAuth()?.unpinned === true;
}
//@ chunk-aepeg2w5.js:493336-494759 placement
/**
 * 向网关 /oauth/token 交换刷新令牌，保存新 JWT（[gateway-refresh] 日志）。
 */
async function exchangeGatewayRefreshToken(gatewayAuth, idpRefreshToken, r) {
  try {
    let s = gatewayAuth.tokenEndpoint ?? `${gatewayAuth.url}/oauth/token`;
    let h = pinnedAgentFor(await readGatewayTrust(hostOf(new URL(s)), r), s);
    let { data: y } = await externalHttp.post(
      s,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: idpRefreshToken,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": claudeCodeUserAgent(),
        },
        timeout: 1e4,
        maxRedirects: 0,
        ...(h && {
          httpsAgent: h,
        }),
      },
    );
    let S = gatewayTokenResponseSchema().safeParse(y);
    if (!S.success) {
      logForDebugging("[gateway-refresh] malformed response; will retry later");
      return;
    }
    if (getGatewayAuth() !== gatewayAuth) {
      logForDebugging("[gateway-refresh] auth changed mid-refresh; discarding");
      return;
    }
    await persistGatewayCredential(
      gatewayAuth,
      idpRefreshToken,
      () => ({
        url: gatewayAuth.url,
        jwt: S.data.access_token,
        expiresAt: Date.now() + S.data.expires_in * 1000,
        idpRefreshToken: S.data.refresh_token ?? gatewayAuth.idpRefreshToken,
        ...(gatewayAuth.tokenEndpoint && {
          tokenEndpoint: gatewayAuth.tokenEndpoint,
        }),
        ...(gatewayAuth.revocationEndpoint && {
          revocationEndpoint: gatewayAuth.revocationEndpoint,
        }),
        ...(gatewayAuth.email && {
          email: gatewayAuth.email,
        }),
        ...(gatewayAuth.vouchedAtLogin !== undefined && {
          vouchedAtLogin: gatewayAuth.vouchedAtLogin,
        }),
      }),
      r,
    );
    logForDebugging("[gateway-refresh] refreshed gateway JWT");
  } catch (error) {
    if (oauthErrorCode(error) === "invalid_grant") {
      if (getGatewayAuth() !== gatewayAuth) {
        logForDebugging("[gateway-refresh] auth changed mid-refresh; discarding invalid_grant");
        return;
      }
      logForDebugging("[gateway-refresh] IdP rejected refresh token; clearing it", {
        level: "warn",
      });
      try {
        await persistGatewayCredential(
          gatewayAuth,
          idpRefreshToken,
          (h) => ({
            ...h,
            idpRefreshToken: undefined,
          }),
          r,
        );
      } catch (error) {
        logForDebugging(`[gateway-refresh] secureStorage write failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
    } else {
      let h = gatewayPinProblem(error);
      if (h)
        logForDebugging(`[gateway-refresh] ${h}: ${errorMessage(error)}`, {
          level: "warn",
        });
      else logForDebugging(`[gateway-refresh] transient failure: ${errorMessage(error)}`);
    }
  }
}
//@ chunk-aepeg2w5.js:494759-494911 placement
function gatewayPinProblem(error) {
  if (pinMismatchFromError(error) !== undefined) return "certificate changed since sign-in";
  if (errorMessage(error).includes(PIN_STORE_SYMLINK_MESSAGE))
    return "pin store is a symlink and was refused";
  return;
}
//@ chunk-aepeg2w5.js:494911-495350 placement
/**
 * 写回网关凭据（凭据已变化时不覆盖）。
 */
async function persistGatewayCredential(e, n, r, s) {
  let h = r(e);
  try {
    await getSecureStorage().mutate((y) => {
      let enterpriseGateway = y?.enterpriseGateway;
      if (!enterpriseGateway) return y;
      if (enterpriseGateway.idpRefreshToken !== n) {
        h = enterpriseGateway;
        return y;
      }
      if (getGatewayAuth() !== e) return y;
      h = r(enterpriseGateway);
      return {
        ...y,
        enterpriseGateway: h,
      };
    }, s);
  } catch (error) {
    logForDebugging(
      `[gateway-refresh] secureStorage write failed; applying refreshed credential in-memory only: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  }
  if (getGatewayAuth() !== e) {
    logForDebugging("[gateway-refresh] auth changed during persist; discarding outcome");
    return;
  }
  setGatewayAuth(h);
}
//@ chunk-aepeg2w5.js:495350-495567 placement
/**
 * axios 响应中的 OAuth error 字段。
 */
function oauthErrorCode(error) {
  if (!error || typeof error !== "object" || !("isAxiosError" in error) || !error.isAxiosError) return;
  let n = error.response?.data;
  if (typeof n === "object" && n !== null && "error" in n) {
    let error = n.error;
    return typeof error === "string" ? error : undefined;
  }
  return;
}
//@ chunk-aepeg2w5.js:495567-496050 placement
/**
 * 删除保存的网关凭据。
 */
async function clearGatewayCredential(e, credentials) {
  if (!e) return;
  let r = (s) => s?.url === e.url && s.jwt === e.jwt;
  if (r(getGatewayAuth())) setGatewayAuth(null);
  try {
    let s = await getSecureStorage().mutate((h) => {
      if (!r(h.enterpriseGateway)) return h;
      let y = {
        ...h,
      };
      delete y.enterpriseGateway;
      return y;
    }, credentials);
    if (!s.success)
      logForDebugging(
        `[gateway-login] could not remove the discarded credential from secure storage${s.warning ? `: ${s.warning}` : ""}`,
        {
          level: "warn",
        },
      );
  } catch (error) {
    logForDebugging(
      `[gateway-login] could not remove the discarded credential from secure storage: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-aepeg2w5.js:496050-496143 placement
/**
 * 判断两份网关凭据是否相同（URL、token 端点、邮箱）。
 */
function isSameGatewayCredential(e, n) {
  return e?.url === n.url && e.tokenEndpoint === n.tokenEndpoint && e.email === n.email;
}
//@ chunk-aepeg2w5.js:496143-496274 placement
function replaceAllowlistEntry(gatewayAllowlistEntries, n, r) {
  let { [n]: s, ...h } = gatewayAllowlistEntries ?? {};
  let y =
    r === undefined
      ? h
      : {
          ...h,
          [n]: r,
        };
  return Object.keys(y).length > 0
    ? {
        gatewayAllowlistEntries: y,
      }
    : {};
}
//@ chunk-aepeg2w5.js:496274-497127 placement
/**
 * 替换网关凭据与允许列表条目。
 */
async function replaceGatewayCredential(e, gatewayAuth, credentials, s) {
  if (isSameGatewayCredential(getGatewayAuth(), e)) setGatewayAuth(gatewayAuth);
  if (s.outcome === "untouched") return;
  let secureStorage = getSecureStorage();
  try {
    let y = await secureStorage.mutate((S) => {
      if (!isSameGatewayCredential(S.enterpriseGateway, e)) return S;
      let { enterpriseGateway, gatewayAllowlistEntries, ...x } = S;
      return {
        ...x,
        ...(s.replaced && {
          enterpriseGateway: s.replaced,
        }),
        ...replaceAllowlistEntry(gatewayAllowlistEntries, hostOf(new URL(e.url)), s.replacedAllowlistEntry),
      };
    }, credentials);
    if (!y.success)
      logForDebugging(
        `[gateway-login] could not put the previous credential back in secure storage${y.warning ? `: ${y.warning}` : ""}`,
        {
          level: "warn",
        },
      );
  } catch (error) {
    logForDebugging(
      `[gateway-login] could not put the previous credential back in secure storage: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  }
  try {
    await mutateEveryCredentialLeg(
      secureStorage,
      (y) => {
        let enterpriseGateway = y.enterpriseGateway;
        if (enterpriseGateway?.url !== e.url || enterpriseGateway.jwt !== e.jwt) return y;
        let { enterpriseGateway: enterpriseGateway_2, ...R } = y;
        return R;
      },
      credentials,
    );
  } catch (error) {
    logForDebugging(
      `[gateway-login] could not remove the undone credential from every credential store: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-aepeg2w5.js:497127-497355 placement
/**
 * 撤销被撤回的登录（仍登录的账号不撤销）。
 */
async function revokeUndoneSignIn(e, gatewayAuth, credentials, s) {
  if (
    isSameGatewayCredential(gatewayAuth, e) ||
    (s.outcome !== "untouched" && isSameGatewayCredential(s.replaced, e))
  ) {
    logForDebugging(
      "[gateway-login] the undone sign-in is for the account still signed in at this gateway; not revoking it",
      {
        level: "info",
      },
    );
    return;
  }
  await revokeGatewayToken(e, credentials);
}
//@ chunk-aepeg2w5.js:497355-497997 placement
/**
 * 登出时撤销网关令牌（找不到撤销端点则只结束本机会话）。
 */
async function revokeGatewayToken(e, n) {
  try {
    let r = pinnedAgentFor(await readGatewayTrust(hostOf(new URL(e.url)), n), e.url);
    let s = e.revocationEndpoint ?? (await discoverRevocationEndpoint(e.url, r));
    if (!s) {
      logForDebugging(
        "[gateway-logout] no revocation endpoint known for this gateway; sign-out ends the session on this machine only",
        {
          level: "info",
        },
      );
      return;
    }
    let h = sameOriginUrl(e.url, s);
    if (!h) {
      logForDebugging(
        "[gateway-logout] revocation endpoint is not on the gateway host; skipping the revoke",
        {
          level: "warn",
        },
      );
      return;
    }
    await Promise.all([
      revokeGatewayToken_2(
        h,
        {
          token: e.jwt,
        },
        r,
        "session",
      ),
      ...(e.idpRefreshToken
        ? [
            revokeGatewayToken_2(
              h,
              {
                token: e.idpRefreshToken,
                token_type_hint: "refresh_token",
              },
              r,
              "refresh token",
            ),
          ]
        : []),
    ]);
  } catch (error) {
    logForDebugging(`[gateway-logout] gateway revoke skipped: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-aepeg2w5.js:497997-498102 placement
function revokeRequestOptions(e) {
  return {
    timeout: 5000,
    signal: AbortSignal.timeout(5000),
    maxRedirects: 0,
    ...(e && {
      httpsAgent: e,
    }),
  };
}
//@ chunk-aepeg2w5.js:498102-498234 placement
function describeRevokeError(error) {
  let errnoCode = getErrnoCode(error);
  let { kind, status } = classifyAxiosError(error);
  return `${errnoCode === "ERR_CANCELED" ? "timeout" : kind}, code=${errnoCode ?? "none"}, status=${status ?? "none"}`;
}
//@ chunk-aepeg2w5.js:498234-498575 placement
/**
 * 从网关的 OAuth 元数据取 revocation_endpoint。
 */
async function discoverRevocationEndpoint(url, n) {
  try {
    let { data: r } = await externalHttp.get(`${url}/.well-known/oauth-authorization-server`, {
      headers: {
        "User-Agent": claudeCodeUserAgent(),
      },
      ...revokeRequestOptions(n),
    });
    let s = gatewayRevocationSchema().safeParse(r);
    return s.success ? (s.data.revocation_endpoint ?? undefined) : undefined;
  } catch (error) {
    logForDebugging(
      `[gateway-logout] gateway metadata read failed (${describeRevokeError(error)}); continuing with local logout`,
      {
        level: "warn",
      },
    );
    return;
  }
}
//@ chunk-aepeg2w5.js:498575-498909 placement = _fetchMetricsEnabled (0.366)
/**
 * 网关登出：POST 撤销网关令牌。旧版名 _fetchMetricsEnabled 为错配；应归登出/网关模块。
 */
async function revokeGatewayToken_2(e, n, r, s) {
  try {
    await externalHttp.post(e, new URLSearchParams(n).toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": claudeCodeUserAgent(),
      },
      ...revokeRequestOptions(r),
    });
    logForDebugging(`[gateway-logout] revoked the gateway ${s}`);
  } catch (error) {
    logForDebugging(
      `[gateway-logout] gateway ${s} revoke failed (${describeRevokeError(error)}); continuing with local logout`,
      {
        level: "warn",
      },
    );
  }
}
export {
  readGatewayEnvConfig,
  refreshGatewayToken,
  sameOriginUrl,
  oauthErrorCode,
  gatewayTokenResponseSchema,
  replaceGatewayCredential,
  revokeUndoneSignIn,
  isProviderManagedUnpinnedGateway,
  replaceAllowlistEntry,
  revokeGatewayToken,
  clearGatewayCredential,
};
