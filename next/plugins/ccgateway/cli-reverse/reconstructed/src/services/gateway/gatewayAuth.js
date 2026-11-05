/**
 * services/gateway/gatewayAuth.ts
 *
 * 2.1.316 新增：向网关 /oauth/token 交换刷新令牌，保存新 JWT（[gateway-refresh] 日志）；替换网关凭据与允许列表条目等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:504081-504275 placement (2.1.88 match: JwtBearerResponseSchema, 0.394)
/**
 * 网关令牌提前刷新的余量，以及网关令牌响应与吊销端点发现的 schema。
 */
var GATEWAY_REFRESH_MARGIN_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var gatewayTokenResponseSchema;
var gatewayRevocationSchema;
deferInit("chunk-exfmq47h.js:504081", () => {
  GATEWAY_REFRESH_MARGIN_MS = 300000;
  gatewayTokenResponseSchema = DoctorLazy(() =>
    create({
      access_token: create_2(),
      expires_in: create_3(),
      refresh_token: create_2().nullish(),
      email: create_2().nullish().catch(undefined),
    }),
  );
  gatewayRevocationSchema = DoctorLazy(() =>
    create({
      revocation_endpoint: create_2().nullish().catch(undefined),
    }),
  );
});
//@ chunk-exfmq47h.js:504275-504374 placement
/**
 * 两点同源时返回该地址（否则 undefined）。
 */
function sameOriginUrl(base, candidate) {
  if (!candidate) return;
  try {
    if (new URL(candidate).origin === new URL(base).origin) return candidate;
  } catch {}
  return;
}
//@ chunk-exfmq47h.js:504374-504607 placement
/**
 * 网关 JWT 将过期时用 IdP 刷新令牌刷新（单飞）。
 */
function refreshGatewayToken(credentials, { force = false } = {}) {
  if (isProviderManagedUnpinnedGateway()) readGatewayEnvConfig();
  let gatewayAuth = getGatewayAuth();
  if (
    !gatewayAuth?.idpRefreshToken ||
    (!force && gatewayAuth.expiresAt - Date.now() >= GATEWAY_REFRESH_MARGIN_MS)
  )
    return Promise.resolve();
  let gatewayRefreshInFlight = getGatewayRefreshInFlight();
  if (gatewayRefreshInFlight) return gatewayRefreshInFlight;
  let result = exchangeGatewayRefreshToken(gatewayAuth, gatewayAuth.idpRefreshToken, credentials).finally(
    () => setGatewayRefreshInFlight(null),
  );
  setGatewayRefreshInFlight(result);
  return result;
}
//@ chunk-exfmq47h.js:504607-505248 placement
/**
 * 读取 CLAUDE_CODE_USE_GATEWAY 配置（ANTHROPIC_BASE_URL、令牌），缺失时警告。
 */
function readGatewayEnvConfig() {
  {
    if (!env.CLAUDE_CODE_USE_GATEWAY) return false;
    let ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL;
    let token = env.ANTHROPIC_AUTH_TOKEN || getGatewayTokenFromFileDescriptor();
    if (!ANTHROPIC_BASE_URL || !token) {
      logForDebugging(
        `CLAUDE_CODE_USE_GATEWAY is set but ${!ANTHROPIC_BASE_URL ? "ANTHROPIC_BASE_URL is missing" : "no ANTHROPIC_AUTH_TOKEN and no token on a gateway descriptor / snapshot"}; ignoring`,
        {
          level: "warn",
        },
      );
      return false;
    }
    let gatewayAuth = getGatewayAuth();
    if (isGatewayAuthPinned(gatewayAuth) || gatewayAuth?.jwt === token) return true;
    let url = gatewayAuth?.url;
    if (!url)
      try {
        url = normalizeGatewayUrl(ANTHROPIC_BASE_URL);
      } catch (error) {
        throw new CliUserError(
          `CLAUDE_CODE_USE_GATEWAY is set but ANTHROPIC_BASE_URL is invalid: ${errorMessage(error)}`,
        );
      }
    let result = decodeJwtExpiry(token);
    setGatewayAuth({
      url,
      jwt: token,
      expiresAt: result !== null ? result * 1000 : Number.MAX_SAFE_INTEGER,
      unpinned: true,
      ...(gatewayAuth?.hostVerdict && {
        hostVerdict: gatewayAuth.hostVerdict,
      }),
    });
    return true;
  }
  return false;
}
//@ chunk-exfmq47h.js:505248-505330 placement
/**
 * 网关凭据是否由宿主提供且未固定（需要重新读环境）。
 */
function isProviderManagedUnpinnedGateway() {
  return env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && getGatewayAuth()?.unpinned === true;
}
//@ chunk-exfmq47h.js:505330-506753 placement
/**
 * 向网关 /oauth/token 交换刷新令牌，保存新 JWT（[gateway-refresh] 日志）。
 */
async function exchangeGatewayRefreshToken(gatewayAuth, expectedRefreshToken, credentials) {
  try {
    let tokenEndpoint = gatewayAuth.tokenEndpoint ?? `${gatewayAuth.url}/oauth/token`;
    let agent = pinnedAgentFor(
      await readGatewayTrust(hostOf(new URL(tokenEndpoint)), credentials),
      tokenEndpoint,
    );
    let { data: body } = await externalHttp.post(
      tokenEndpoint,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: expectedRefreshToken,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": claudeCodeUserAgent(),
        },
        timeout: 1e4,
        maxRedirects: 0,
        ...(agent && {
          httpsAgent: agent,
        }),
      },
    );
    let parsed = gatewayTokenResponseSchema().safeParse(body);
    if (!parsed.success) {
      logForDebugging("[gateway-refresh] malformed response; will retry later");
      return;
    }
    if (getGatewayAuth() !== gatewayAuth) {
      logForDebugging("[gateway-refresh] auth changed mid-refresh; discarding");
      return;
    }
    await persistGatewayCredential(
      gatewayAuth,
      expectedRefreshToken,
      () => ({
        url: gatewayAuth.url,
        jwt: parsed.data.access_token,
        expiresAt: Date.now() + parsed.data.expires_in * 1000,
        idpRefreshToken: parsed.data.refresh_token ?? gatewayAuth.idpRefreshToken,
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
      credentials,
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
          expectedRefreshToken,
          (current) => ({
            ...current,
            idpRefreshToken: undefined,
          }),
          credentials,
        );
      } catch (error) {
        logForDebugging(`[gateway-refresh] secureStorage write failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
    } else {
      let pinProblem = gatewayPinProblem(error);
      if (pinProblem)
        logForDebugging(`[gateway-refresh] ${pinProblem}: ${errorMessage(error)}`, {
          level: "warn",
        });
      else logForDebugging(`[gateway-refresh] transient failure: ${errorMessage(error)}`);
    }
  }
}
//@ chunk-exfmq47h.js:506753-506905 placement
function gatewayPinProblem(error) {
  if (pinMismatchFromError(error) !== undefined) return "certificate changed since sign-in";
  if (errorMessage(error).includes(PIN_STORE_SYMLINK_MESSAGE))
    return "pin store is a symlink and was refused";
  return;
}
//@ chunk-exfmq47h.js:506905-507344 placement
/**
 * 写回网关凭据（凭据已变化时不覆盖）。
 */
async function persistGatewayCredential(gatewayAuth, expectedRefreshToken, buildCredential, credentials) {
  let nextCredential = buildCredential(gatewayAuth);
  try {
    await getSecureStorage().mutate((stored) => {
      let enterpriseGateway = stored?.enterpriseGateway;
      if (!enterpriseGateway) return stored;
      if (enterpriseGateway.idpRefreshToken !== expectedRefreshToken) {
        nextCredential = enterpriseGateway;
        return stored;
      }
      if (getGatewayAuth() !== gatewayAuth) return stored;
      nextCredential = buildCredential(enterpriseGateway);
      return {
        ...stored,
        enterpriseGateway: nextCredential,
      };
    }, credentials);
  } catch (error) {
    logForDebugging(
      `[gateway-refresh] secureStorage write failed; applying refreshed credential in-memory only: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  }
  if (getGatewayAuth() !== gatewayAuth) {
    logForDebugging("[gateway-refresh] auth changed during persist; discarding outcome");
    return;
  }
  setGatewayAuth(nextCredential);
}
//@ chunk-exfmq47h.js:507344-507561 placement
/**
 * axios 响应中的 OAuth error 字段。
 */
function oauthErrorCode(error) {
  if (!error || typeof error !== "object" || !("isAxiosError" in error) || !error.isAxiosError) return;
  let body = error.response?.data;
  if (typeof body === "object" && body !== null && "error" in body) {
    let error = body.error;
    return typeof error === "string" ? error : undefined;
  }
  return;
}
//@ chunk-exfmq47h.js:507561-508044 placement
/**
 * 删除保存的网关凭据。
 */
async function clearGatewayCredential(credential, credentials) {
  if (!credential) return;
  let isSame = (candidate) => candidate?.url === credential.url && candidate.jwt === credential.jwt;
  if (isSame(getGatewayAuth())) setGatewayAuth(null);
  try {
    let mutateResult = await getSecureStorage().mutate((stored) => {
      if (!isSame(stored.enterpriseGateway)) return stored;
      let next = {
        ...stored,
      };
      delete next.enterpriseGateway;
      return next;
    }, credentials);
    if (!mutateResult.success)
      logForDebugging(
        `[gateway-login] could not remove the discarded credential from secure storage${mutateResult.warning ? `: ${mutateResult.warning}` : ""}`,
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
//@ chunk-exfmq47h.js:508044-508137 placement
/**
 * 判断两份网关凭据是否相同（URL、token 端点、邮箱）。
 */
function isSameGatewayCredential(current, other) {
  return (
    current?.url === other.url &&
    current.tokenEndpoint === other.tokenEndpoint &&
    current.email === other.email
  );
}
//@ chunk-exfmq47h.js:508137-508268 placement
function replaceAllowlistEntry(gatewayAllowlistEntries, hostKey, newValue) {
  let { [hostKey]: previousValue, ...rest } = gatewayAllowlistEntries ?? {};
  let entries =
    newValue === undefined
      ? rest
      : {
          ...rest,
          [hostKey]: newValue,
        };
  return Object.keys(entries).length > 0
    ? {
        gatewayAllowlistEntries: entries,
      }
    : {};
}
//@ chunk-exfmq47h.js:508268-509121 placement
/**
 * 替换网关凭据与允许列表条目。
 */
async function replaceGatewayCredential(previous, gatewayAuth, options, outcome) {
  if (isSameGatewayCredential(getGatewayAuth(), previous)) setGatewayAuth(gatewayAuth);
  if (outcome.outcome === "untouched") return;
  let name = getSecureStorage();
  try {
    let mutateResult = await name.mutate((stored) => {
      if (!isSameGatewayCredential(stored.enterpriseGateway, previous)) return stored;
      let { enterpriseGateway, gatewayAllowlistEntries, ...rest } = stored;
      return {
        ...rest,
        ...(outcome.replaced && {
          enterpriseGateway: outcome.replaced,
        }),
        ...replaceAllowlistEntry(
          gatewayAllowlistEntries,
          hostOf(new URL(previous.url)),
          outcome.replacedAllowlistEntry,
        ),
      };
    }, options);
    if (!mutateResult.success)
      logForDebugging(
        `[gateway-login] could not put the previous credential back in secure storage${mutateResult.warning ? `: ${mutateResult.warning}` : ""}`,
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
      name,
      (stored) => {
        let enterpriseGateway = stored.enterpriseGateway;
        if (enterpriseGateway?.url !== previous.url || enterpriseGateway.jwt !== previous.jwt) return stored;
        let { enterpriseGateway: enterpriseGateway_2, ...next } = stored;
        return next;
      },
      options,
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
//@ chunk-exfmq47h.js:509121-509349 placement
/**
 * 撤销被撤回的登录（仍登录的账号不撤销）。
 */
async function revokeUndoneSignIn(undo, gatewayAuth, credentials, outcome) {
  if (
    isSameGatewayCredential(gatewayAuth, undo) ||
    (outcome.outcome !== "untouched" && isSameGatewayCredential(outcome.replaced, undo))
  ) {
    logForDebugging(
      "[gateway-login] the undone sign-in is for the account still signed in at this gateway; not revoking it",
      {
        level: "info",
      },
    );
    return;
  }
  await revokeGatewayToken(undo, credentials);
}
//@ chunk-exfmq47h.js:509349-509991 placement
/**
 * 登出时撤销网关令牌（找不到撤销端点则只结束本机会话）。
 */
async function revokeGatewayToken(credential, credentials) {
  try {
    let agent = pinnedAgentFor(
      await readGatewayTrust(hostOf(new URL(credential.url)), credentials),
      credential.url,
    );
    let revocationUrl =
      credential.revocationEndpoint ?? (await discoverRevocationEndpoint(credential.url, agent));
    if (!revocationUrl) {
      logForDebugging(
        "[gateway-logout] no revocation endpoint known for this gateway; sign-out ends the session on this machine only",
        {
          level: "info",
        },
      );
      return;
    }
    let sameOriginUrl_2 = sameOriginUrl(credential.url, revocationUrl);
    if (!sameOriginUrl_2) {
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
        sameOriginUrl_2,
        {
          token: credential.jwt,
        },
        agent,
        "session",
      ),
      ...(credential.idpRefreshToken
        ? [
            revokeGatewayToken_2(
              sameOriginUrl_2,
              {
                token: credential.idpRefreshToken,
                token_type_hint: "refresh_token",
              },
              agent,
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
//@ chunk-exfmq47h.js:509991-510096 placement
function revokeRequestOptions(agent) {
  return {
    timeout: 5000,
    signal: AbortSignal.timeout(5000),
    maxRedirects: 0,
    ...(agent && {
      httpsAgent: agent,
    }),
  };
}
//@ chunk-exfmq47h.js:510096-510228 placement
function describeRevokeError(error) {
  let errnoCode = getErrnoCode(error);
  let { kind, status } = classifyAxiosError(error);
  return `${errnoCode === "ERR_CANCELED" ? "timeout" : kind}, code=${errnoCode ?? "none"}, status=${status ?? "none"}`;
}
//@ chunk-exfmq47h.js:510228-510569 placement
/**
 * 从网关的 OAuth 元数据取 revocation_endpoint。
 */
async function discoverRevocationEndpoint(url, baseUrl) {
  try {
    let { data: response } = await externalHttp.get(`${url}/.well-known/oauth-authorization-server`, {
      headers: {
        "User-Agent": claudeCodeUserAgent(),
      },
      ...revokeRequestOptions(baseUrl),
    });
    let text = gatewayRevocationSchema().safeParse(response);
    return text.success ? (text.data.revocation_endpoint ?? undefined) : undefined;
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
//@ chunk-exfmq47h.js:510569-510903 placement (2.1.88 match: _fetchMetricsEnabled, 0.366)
/**
 * 网关登出：POST 撤销网关令牌。旧版名 _fetchMetricsEnabled 为错配；应归登出/网关模块。
 */
async function revokeGatewayToken_2(url, body, agent, label) {
  try {
    await externalHttp.post(url, new URLSearchParams(body).toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": claudeCodeUserAgent(),
      },
      ...revokeRequestOptions(agent),
    });
    logForDebugging(`[gateway-logout] revoked the gateway ${label}`);
  } catch (error) {
    logForDebugging(
      `[gateway-logout] gateway ${label} revoke failed (${describeRevokeError(error)}); continuing with local logout`,
      {
        level: "warn",
      },
    );
  }
}
export {
  refreshGatewayToken,
  readGatewayEnvConfig,
  isProviderManagedUnpinnedGateway,
  replaceAllowlistEntry,
  revokeGatewayToken,
  sameOriginUrl,
  oauthErrorCode,
  gatewayTokenResponseSchema,
  replaceGatewayCredential,
  revokeUndoneSignIn,
  clearGatewayCredential,
};
