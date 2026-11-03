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

/**
 * 网关令牌提前刷新的余量，以及网关令牌响应与吊销端点发现的 schema。
 */
//@ chunk-aepeg2w5.js:492087-492281 placement = JwtBearerResponseSchema (0.393)
var GATEWAY_REFRESH_MARGIN_MS = 300000,
  gatewayTokenResponseSchema = DoctorLazy(() =>
    create({
      access_token: create_2(),
      expires_in: create_3(),
      refresh_token: create_2().nullish(),
      email: create_2()
        .nullish()
        .catch(void 0),
    }),
  ),
  gatewayRevocationSchema = DoctorLazy(() =>
    create({
      revocation_endpoint: create_2()
        .nullish()
        .catch(void 0),
    }),
  );
//@ chunk-aepeg2w5.js:492281-492380 placement
function gno(e, n) {
  if (!n) return;
  try {
    if (new URL(n).origin === new URL(e).origin) return n;
  } catch {}
  return;
}
/**
 * 网关 JWT 将过期时用 IdP 刷新令牌刷新（单飞）。
 */
//@ chunk-aepeg2w5.js:492380-492613 placement
function refreshGatewayToken(e, { force: n = !1 } = {}) {
  if (uRn()) readGatewayEnvConfig();
  let r = getGatewayAuth();
  if (!r?.idpRefreshToken || (!n && r.expiresAt - Date.now() >= GATEWAY_REFRESH_MARGIN_MS))
    return Promise.resolve();
  let s = getGatewayRefreshInFlight();
  if (s) return s;
  let h = exchangeGatewayRefreshToken(r, r.idpRefreshToken, e).finally(() => setGatewayRefreshInFlight(null));
  return (setGatewayRefreshInFlight(h), h);
}
/**
 * 读取 CLAUDE_CODE_USE_GATEWAY 配置（ANTHROPIC_BASE_URL、令牌），缺失时警告。
 */
//@ chunk-aepeg2w5.js:492613-493254 placement
function readGatewayEnvConfig() {
  {
    if (!env.CLAUDE_CODE_USE_GATEWAY) return !1;
    let ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL,
      n = env.ANTHROPIC_AUTH_TOKEN || getGatewayTokenFromFileDescriptor();
    if (!ANTHROPIC_BASE_URL || !n)
      return (
        logForDebugging(
          `CLAUDE_CODE_USE_GATEWAY is set but ${!ANTHROPIC_BASE_URL ? "ANTHROPIC_BASE_URL is missing" : "no ANTHROPIC_AUTH_TOKEN and no token on a gateway descriptor / snapshot"}; ignoring`,
          { level: "warn" },
        ),
        !1
      );
    let r = getGatewayAuth();
    if (isGatewayAuthPinned(r) || r?.jwt === n) return !0;
    let s = r?.url;
    if (!s)
      try {
        s = normalizeGatewayUrl(ANTHROPIC_BASE_URL);
      } catch (error) {
        throw new CliUserError(
          `CLAUDE_CODE_USE_GATEWAY is set but ANTHROPIC_BASE_URL is invalid: ${errorMessage(error)}`,
        );
      }
    let h = decodeJwtExpiry(n);
    return (
      setGatewayAuth({
        url: s,
        jwt: n,
        expiresAt: h !== null ? h * 1000 : Number.MAX_SAFE_INTEGER,
        unpinned: !0,
        ...(r?.hostVerdict && { hostVerdict: r.hostVerdict }),
      }),
      !0
    );
  }
  return !1;
}
//@ chunk-aepeg2w5.js:493254-493336 placement
function uRn() {
  return env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && getGatewayAuth()?.unpinned === !0;
}
/**
 * 向网关 /oauth/token 交换刷新令牌，保存新 JWT（[gateway-refresh] 日志）。
 */
//@ chunk-aepeg2w5.js:493336-494759 placement
async function exchangeGatewayRefreshToken(e, n, r) {
  try {
    let s = e.tokenEndpoint ?? `${e.url}/oauth/token`,
      h = pinnedAgentFor(await readGatewayTrust(hostOf(new URL(s)), r), s),
      { data: y } = await externalHttp.post(
        s,
        new URLSearchParams({ grant_type: "refresh_token", refresh_token: n }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": claudeCodeUserAgent(),
          },
          timeout: 1e4,
          maxRedirects: 0,
          ...(h && { httpsAgent: h }),
        },
      ),
      safeParse = gatewayTokenResponseSchema().safeParse(y);
    if (!safeParse.success) {
      logForDebugging("[gateway-refresh] malformed response; will retry later");
      return;
    }
    if (getGatewayAuth() !== e) {
      logForDebugging("[gateway-refresh] auth changed mid-refresh; discarding");
      return;
    }
    (await persistGatewayCredential(
      e,
      n,
      () => ({
        url: e.url,
        jwt: safeParse.data.access_token,
        expiresAt: Date.now() + safeParse.data.expires_in * 1000,
        idpRefreshToken: safeParse.data.refresh_token ?? e.idpRefreshToken,
        ...(e.tokenEndpoint && { tokenEndpoint: e.tokenEndpoint }),
        ...(e.revocationEndpoint && { revocationEndpoint: e.revocationEndpoint }),
        ...(e.email && { email: e.email }),
        ...(e.vouchedAtLogin !== void 0 && { vouchedAtLogin: e.vouchedAtLogin }),
      }),
      r,
    ),
      logForDebugging("[gateway-refresh] refreshed gateway JWT"));
  } catch (error) {
    if (oauthErrorCode(error) === "invalid_grant") {
      if (getGatewayAuth() !== e) {
        logForDebugging("[gateway-refresh] auth changed mid-refresh; discarding invalid_grant");
        return;
      }
      logForDebugging("[gateway-refresh] IdP rejected refresh token; clearing it", { level: "warn" });
      try {
        await persistGatewayCredential(e, n, (h) => ({ ...h, idpRefreshToken: void 0 }), r);
      } catch (error) {
        logForDebugging(`[gateway-refresh] secureStorage write failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
    } else {
      let h = gatewayPinProblem(error);
      if (h) logForDebugging(`[gateway-refresh] ${h}: ${errorMessage(error)}`, { level: "warn" });
      else logForDebugging(`[gateway-refresh] transient failure: ${errorMessage(error)}`);
    }
  }
}
//@ chunk-aepeg2w5.js:494759-494911 placement
function gatewayPinProblem(e) {
  if (pinMismatchFromError(e) !== void 0) return "certificate changed since sign-in";
  if (errorMessage(e).includes(PIN_STORE_SYMLINK_MESSAGE)) return "pin store is a symlink and was refused";
  return;
}
/**
 * 写回网关凭据（凭据已变化时不覆盖）。
 */
//@ chunk-aepeg2w5.js:494911-495350 placement
async function persistGatewayCredential(e, n, r, s) {
  let h = r(e);
  try {
    await getSecureStorage().mutate((y) => {
      let S = y?.enterpriseGateway;
      if (!S) return y;
      if (S.idpRefreshToken !== n) return ((h = S), y);
      if (getGatewayAuth() !== e) return y;
      return ((h = r(S)), { ...y, enterpriseGateway: h });
    }, s);
  } catch (error) {
    logForDebugging(
      `[gateway-refresh] secureStorage write failed; applying refreshed credential in-memory only: ${errorMessage(error)}`,
      { level: "warn" },
    );
  }
  if (getGatewayAuth() !== e) {
    logForDebugging("[gateway-refresh] auth changed during persist; discarding outcome");
    return;
  }
  setGatewayAuth(h);
}
/**
 * axios 响应中的 OAuth error 字段。
 */
//@ chunk-aepeg2w5.js:495350-495567 placement
function oauthErrorCode(e) {
  if (!e || typeof e !== "object" || !("isAxiosError" in e) || !e.isAxiosError) return;
  let n = e.response?.data;
  if (typeof n === "object" && n !== null && "error" in n) {
    let error = n.error;
    return typeof error === "string" ? error : void 0;
  }
  return;
}
/**
 * 删除保存的网关凭据。
 */
//@ chunk-aepeg2w5.js:495567-496050 placement
async function clearGatewayCredential(e, n) {
  if (!e) return;
  let r = (s) => s?.url === e.url && s.jwt === e.jwt;
  if (r(getGatewayAuth())) setGatewayAuth(null);
  try {
    let mutate = await getSecureStorage().mutate((h) => {
      if (!r(h.enterpriseGateway)) return h;
      let y = { ...h };
      return (delete y.enterpriseGateway, y);
    }, n);
    if (!mutate.success)
      logForDebugging(
        `[gateway-login] could not remove the discarded credential from secure storage${mutate.warning ? `: ${mutate.warning}` : ""}`,
        { level: "warn" },
      );
  } catch (error) {
    logForDebugging(
      `[gateway-login] could not remove the discarded credential from secure storage: ${errorMessage(error)}`,
      { level: "warn" },
    );
  }
}
//@ chunk-aepeg2w5.js:496050-496143 placement
function rl(e, n) {
  return e?.url === n.url && e.tokenEndpoint === n.tokenEndpoint && e.email === n.email;
}
//@ chunk-aepeg2w5.js:496143-496274 placement
function replaceAllowlistEntry(e, n, r) {
  let { [n]: s, ...h } = e ?? {},
    y = r === void 0 ? h : { ...h, [n]: r };
  return Object.keys(y).length > 0 ? { gatewayAllowlistEntries: y } : {};
}
/**
 * 替换网关凭据与允许列表条目。
 */
//@ chunk-aepeg2w5.js:496274-497127 placement
async function replaceGatewayCredential(e, n, r, s) {
  if (rl(getGatewayAuth(), e)) setGatewayAuth(n);
  if (s.outcome === "untouched") return;
  let h = getSecureStorage();
  try {
    let mutate = await h.mutate((S) => {
      if (!rl(S.enterpriseGateway, e)) return S;
      let {
        enterpriseGateway: enterpriseGateway,
        gatewayAllowlistEntries: gatewayAllowlistEntries,
        ...x
      } = S;
      return {
        ...x,
        ...(s.replaced && { enterpriseGateway: s.replaced }),
        ...replaceAllowlistEntry(gatewayAllowlistEntries, hostOf(new URL(e.url)), s.replacedAllowlistEntry),
      };
    }, r);
    if (!mutate.success)
      logForDebugging(
        `[gateway-login] could not put the previous credential back in secure storage${mutate.warning ? `: ${mutate.warning}` : ""}`,
        { level: "warn" },
      );
  } catch (error) {
    logForDebugging(
      `[gateway-login] could not put the previous credential back in secure storage: ${errorMessage(error)}`,
      { level: "warn" },
    );
  }
  try {
    await mutateEveryCredentialLeg(
      h,
      (y) => {
        let enterpriseGateway = y.enterpriseGateway;
        if (enterpriseGateway?.url !== e.url || enterpriseGateway.jwt !== e.jwt) return y;
        let { enterpriseGateway: enterpriseGateway_2, ...R } = y;
        return R;
      },
      r,
    );
  } catch (error) {
    logForDebugging(
      `[gateway-login] could not remove the undone credential from every credential store: ${errorMessage(error)}`,
      { level: "warn" },
    );
  }
}
/**
 * 撤销被撤回的登录（仍登录的账号不撤销）。
 */
//@ chunk-aepeg2w5.js:497127-497355 placement
async function revokeUndoneSignIn(e, n, r, s) {
  if (rl(n, e) || (s.outcome !== "untouched" && rl(s.replaced, e))) {
    logForDebugging(
      "[gateway-login] the undone sign-in is for the account still signed in at this gateway; not revoking it",
      { level: "info" },
    );
    return;
  }
  await revokeGatewayToken(e, r);
}
/**
 * 登出时撤销网关令牌（找不到撤销端点则只结束本机会话）。
 */
//@ chunk-aepeg2w5.js:497355-497997 placement
async function revokeGatewayToken(e, n) {
  try {
    let r = pinnedAgentFor(await readGatewayTrust(hostOf(new URL(e.url)), n), e.url),
      s = e.revocationEndpoint ?? (await discoverRevocationEndpoint(e.url, r));
    if (!s) {
      logForDebugging(
        "[gateway-logout] no revocation endpoint known for this gateway; sign-out ends the session on this machine only",
        { level: "info" },
      );
      return;
    }
    let h = gno(e.url, s);
    if (!h) {
      logForDebugging(
        "[gateway-logout] revocation endpoint is not on the gateway host; skipping the revoke",
        { level: "warn" },
      );
      return;
    }
    await Promise.all([
      revokeGatewayToken_2(h, { token: e.jwt }, r, "session"),
      ...(e.idpRefreshToken
        ? [
            revokeGatewayToken_2(
              h,
              { token: e.idpRefreshToken, token_type_hint: "refresh_token" },
              r,
              "refresh token",
            ),
          ]
        : []),
    ]);
  } catch (error) {
    logForDebugging(`[gateway-logout] gateway revoke skipped: ${errorMessage(error)}`, { level: "warn" });
  }
}
//@ chunk-aepeg2w5.js:497997-498102 placement
function revokeRequestOptions(e) {
  return { timeout: 5000, signal: AbortSignal.timeout(5000), maxRedirects: 0, ...(e && { httpsAgent: e }) };
}
//@ chunk-aepeg2w5.js:498102-498234 placement
function describeRevokeError(e) {
  let n = getErrnoCode(e),
    { kind: kind, status: status } = classifyAxiosError(e);
  return `${n === "ERR_CANCELED" ? "timeout" : kind}, code=${n ?? "none"}, status=${status ?? "none"}`;
}
/**
 * 从网关的 OAuth 元数据取 revocation_endpoint。
 */
//@ chunk-aepeg2w5.js:498234-498575 placement
async function discoverRevocationEndpoint(e, n) {
  try {
    let { data: r } = await externalHttp.get(`${e}/.well-known/oauth-authorization-server`, {
        headers: { "User-Agent": claudeCodeUserAgent() },
        ...revokeRequestOptions(n),
      }),
      safeParse = gatewayRevocationSchema().safeParse(r);
    return safeParse.success ? (safeParse.data.revocation_endpoint ?? void 0) : void 0;
  } catch (error) {
    logForDebugging(
      `[gateway-logout] gateway metadata read failed (${describeRevokeError(error)}); continuing with local logout`,
      { level: "warn" },
    );
    return;
  }
}
/**
 * 网关登出：POST 撤销网关令牌。旧版名 _fetchMetricsEnabled 为错配；应归登出/网关模块。
 */
//@ chunk-aepeg2w5.js:498575-498909 placement = _fetchMetricsEnabled (0.366)
async function revokeGatewayToken_2(e, n, r, s) {
  try {
    (await externalHttp.post(e, new URLSearchParams(n).toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": claudeCodeUserAgent() },
      ...revokeRequestOptions(r),
    }),
      logForDebugging(`[gateway-logout] revoked the gateway ${s}`));
  } catch (error) {
    logForDebugging(
      `[gateway-logout] gateway ${s} revoke failed (${describeRevokeError(error)}); continuing with local logout`,
      { level: "warn" },
    );
  }
}

export {
  readGatewayEnvConfig,
  refreshGatewayToken,
  gno,
  oauthErrorCode,
  gatewayTokenResponseSchema,
  replaceGatewayCredential,
  revokeUndoneSignIn,
  uRn,
  replaceAllowlistEntry,
  revokeGatewayToken,
  clearGatewayCredential,
};
