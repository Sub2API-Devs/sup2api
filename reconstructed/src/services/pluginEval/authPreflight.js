/**
 * services/pluginEval/authPreflight.ts
 *
 * 2.1.316 新增：plugin eval 运行前的认证预检（WIF 联邦、网关会话剩余时长）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (6)
 * attribution: placement 6
 */
import { getAPIProvider, isFirstPartyProvider } from "../../utils/model/providers.js";
import { getWIFPrecedenceSource, getWIFStatusLine } from "../../utils/wifProfile.js";
import { env } from "../../utils/env.js";
import { getWIFTokenCache } from "../oauth/wifCredentials.js";
import { errorMessage } from "../../utils/errors.js";
import { withTimeout } from "../../utils/sleep.js";
import { Ga } from "./safeFiles.js";
import { rp } from "../../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import { hasCustomAuthorizationHeader, getCustomHeaderMap } from "../api/client.js";
import { getGatewayAuth } from "../../bootstrap/state.js";
import { refreshGatewayToken } from "../gateway/gatewayAuth.js";
import { logForDebugging } from "../../utils/debug.js";
import { isAntBuild } from "../../utils/envUtils.js";
import {
  effectiveAuthTokenEnv,
  getConfiguredApiKeyHelper,
  shouldUseWIFAuth,
  isClaudeAISubscriber,
  getClaudeAIOAuthTokensAsync,
  checkAndRefreshOAuthTokenIfNeeded,
  clearOAuthTokenCache,
} from "../../utils/auth.js";
import { getApiKeyFromFileDescriptor, v$ } from "../../utils/authFileDescriptor.js";
import { loginToHandOn } from "../../utils/auth/launcherHostLogin.js";

//@ chunk-qchp9vrd.js:112515-112606 placement = logEventTo1P (1)
async function logEventTo1P() {
  if (getAPIProvider() !== "firstParty") return { ok: !0 };
  if (isEnvQuadAuthWithoutKey()) return setupWorkloadIdentityForEval();
  return { ok: !0 };
}
//@ chunk-qchp9vrd.js:112606-112718 placement
function isEnvQuadAuthWithoutKey() {
  return (
    getWIFPrecedenceSource() === "env-quad" &&
    !env.ANTHROPIC_API_KEY &&
    !env.ANTHROPIC_AUTH_TOKEN &&
    !env.ANTHROPIC_UNIX_SOCKET
  );
}
/**
 * 配置工作负载身份联邦（WIF）时预先换取令牌，失败给出说明。
 */
//@ chunk-qchp9vrd.js:112718-113543 placement
async function setupWorkloadIdentityForEval() {
  let e;
  try {
    e = await getWIFTokenCache();
  } catch (error) {
    return {
      ok: !1,
      message: `workload identity federation is configured (${getWIFStatusLine()}) but could not be set up: ${errorMessage(error)}`,
    };
  }
  if (e === null) return { ok: !0 };
  try {
    return (
      await withTimeout(e.getToken(), Ga, `no answer from the token exchange within ${Ga / 1000}s`),
      { ok: !0 }
    );
  } catch (error) {
    let r = error instanceof rp ? error.statusCode : null,
      a = `workload identity federation could not obtain an access token (${getWIFStatusLine()})${r === null ? "" : ` [HTTP ${r}]`}: ${errorMessage(error)}`;
    if (
      (r !== null && (r >= 500 || r === 429 || r === 408)) ||
      (r === null && TRANSIENT_AUTH_ERROR_RE.test(errorMessage(error)))
    )
      return { ok: !0, warning: `${a}; continuing \u2014 if every run fails the same way, that is why` };
    return {
      ok: !1,
      message: `${a}${r === 401 || r === 403 ? " \u2014 the identity token was rejected: check the federation rule and organization ids, and for a rule spanning several workspaces set ANTHROPIC_WORKSPACE_ID" : ""}`,
    };
  }
}
//@ chunk-qchp9vrd.js:113543-113719 placement
var TRANSIENT_AUTH_ERROR_RE =
  /Failed to reach token endpoint|Unable to connect|timed out|TimeoutError|^no answer |ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up|fetch failed/i;
//@ chunk-qchp9vrd.js:113854-113868 placement
var Kd = 300000;
/**
 * 预检本次运行的认证：网关会话是否会在超时前过期、是否需要 /login。
 */
//@ chunk-qchp9vrd.js:113868-115552 placement
async function checkEvalAuthPreflight(e, n, r) {
  let a = () => Date.now() + n * 1000 + Kd,
    s = hasCustomAuthorizationHeader();
  {
    let y = getGatewayAuth();
    if (y) {
      if (y.idpRefreshToken && y.expiresAt < a())
        await r(
          y.expiresAt,
          a(),
          async () => (await refreshGatewayToken(e, { force: !0 }), getGatewayAuth()?.expiresAt ?? null),
        );
      else await refreshGatewayToken(e, { force: !1 });
      let R = getGatewayAuth() ?? y,
        S;
      if (R.expiresAt < a())
        ((S = `gateway session expires in ~${Math.max(0, Math.floor((R.expiresAt - Date.now()) / 60000))} min, before this run's ${n}s timeout; a long run may lose auth part-way${R.idpRefreshToken ? "" : " (run /login to renew)"}`),
          logForDebugging(`[eval] ${S}`, { level: "warn" }));
      return {
        kind: "gateway",
        url: R.url,
        jwt: R.jwt,
        authorizationHeaderIsCredential: s,
        ...(S !== void 0 && { warning: S }),
      };
    }
  }
  if (s) return null;
  if (
    !isFirstPartyProvider() ||
    (isAntBuild() ? void 0 : env.ANTHROPIC_API_KEY) ||
    effectiveAuthTokenEnv() ||
    env.ANTHROPIC_UNIX_SOCKET ||
    getConfiguredApiKeyHelper() ||
    Object.keys(getCustomHeaderMap()).some((y) => y.toLowerCase() === "x-api-key") ||
    shouldUseWIFAuth()
  )
    return null;
  let h = getApiKeyFromFileDescriptor();
  if (h && !isClaudeAISubscriber()) return { kind: "apiKey", apiKey: h };
  if (!h && v$("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR")) return null;
  let w = loginToHandOn(await getClaudeAIOAuthTokensAsync(e));
  if (!w?.accessToken) return h ? { kind: "apiKey", apiKey: h } : null;
  let b;
  if (w.expiresAt !== null && w.expiresAt < a()) {
    if (w.refreshToken) {
      if (
        (await r(
          w.expiresAt,
          a(),
          async () => (
            await checkAndRefreshOAuthTokenIfNeeded({ credentials: e, force: !0 }),
            clearOAuthTokenCache(),
            (await getClaudeAIOAuthTokensAsync(e))?.expiresAt ?? null
          ),
        ),
        clearOAuthTokenCache(),
        (w = loginToHandOn(await getClaudeAIOAuthTokensAsync(e))),
        !w?.accessToken)
      )
        return h ? { kind: "apiKey", apiKey: h } : null;
    }
    if (w.expiresAt !== null && w.expiresAt < a())
      ((b = `login token expires in ~${Math.max(0, Math.floor((w.expiresAt - Date.now()) / 60000))} min, before this run's ${n}s timeout; a long run may lose auth part-way (run /login to renew)`),
        logForDebugging(`[eval] ${b}`, { level: "warn" }));
  }
  return {
    kind: "oauth",
    accessToken: w.accessToken,
    scopes: Array.isArray(w.scopes) ? w.scopes : [],
    subscriptionType: w.subscriptionType ?? null,
    rateLimitTier: w.rateLimitTier ?? null,
    ...(b !== void 0 && { warning: b }),
  };
}

export { checkEvalAuthPreflight, logEventTo1P };
