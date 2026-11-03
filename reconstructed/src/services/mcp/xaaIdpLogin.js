/**
 * services/mcp/xaaIdpLogin.ts
 *
 * XAA 的 IdP 登录：OIDC 发现、PKCE 授权码流程与本地回调服务器、id_token 与 client secret 的安全存储缓存（v1/v2 两份）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/xaaIdpLogin.ts
 * pieces: chunk-1wpnxx5r.js (2), chunk-8y02x996.js (14), chunk-cyj440je.js (2), chunk-qy28ss7z.js (14)
 * attribution: sole-consumer 1, fingerprint 6, affinity 2, facade-exports 18, layout 5
 */
import { createServer } from "http";
import { parse } from "url";
import { randomBytes } from "crypto";
import { posix } from "path";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { logMCPDebug } from "../../utils/log.js";
import { redactUrlSecrets } from "../../utils/urlRedaction.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  toError,
} from "../../utils/errors.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { rethrowRedactedFetchError } from "./auth.js";
import { A$r } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/shared/auth.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { callbackPageBody } from "../oauth/callbackPage.js";
import { getPlatform } from "../../utils/platform.js";
import { withFeatureTelemetry } from "../analytics/featureTelemetry.js";
import { findAvailablePort, Pdn } from "./oauthPort.js";
import { ZLo, r2s } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import { fi } from "../../utils/browser.js";
import { PBt } from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { lLo, fzs } from "../../../vendor/@modelcontextprotocol/client/dist/index.mjs";
import { toolportPathFor, isSameOriginAsCcr } from "./ccrMcpUrls.js";
import { env } from "../../utils/env.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";

//@ chunk-8y02x996.js:739-765 affinity
var IDP_LOGIN_TIMEOUT_MS = 300000,
  IDP_REQUEST_TIMEOUT_MS = 30000,
  ID_TOKEN_EXPIRY_SKEW_SECONDS = 60;
/**
 * issuerKey：IdP issuer URL 规范化（去尾斜杠、host 小写），作为安全存储 mcpXaaIdp/mcpXaaIdpConfig 的键。
 */
//@ chunk-8y02x996.js:765-926 facade-exports
function issuerKey(r) {
  try {
    let t = new URL(r);
    return ((t.pathname = t.pathname.replace(/\/+$/, "")), (t.host = t.host.toLowerCase()), t.toString());
  } catch {
    return r.replace(/\/+$/, "");
  }
}
/**
 * getCachedIdpIdToken：从安全存储读 IdP id_token，剩余有效期 ≤60 秒视为过期。
 */
//@ chunk-8y02x996.js:926-1071 facade-exports = getCachedIdpIdToken (0.871)
async function getCachedIdpIdToken(idpIssuer) {
  let entry = (await getSecureStorage().readAsync())?.mcpXaaIdp?.[issuerKey(idpIssuer)];
  if (!entry) return;
  if (entry.expiresAt - Date.now() <= ID_TOKEN_EXPIRY_SKEW_SECONDS * 1000) return;
  return entry.idToken;
}
/**
 * saveIdpIdToken：把 id_token 与过期时间写入安全存储 mcpXaaIdp[issuer]。
 */
//@ chunk-8y02x996.js:1071-1188 fingerprint = getCachedIdpIdToken (0.874)
async function saveIdpIdToken(r, t, e) {
  await getSecureStorage().mutate((n) => ({
    ...n,
    mcpXaaIdp: { ...n.mcpXaaIdp, [issuerKey(r)]: { idToken: t, expiresAt: e } },
  }));
}
/**
 * 保存 IdP 的 id_token：从 JWT 的 exp 取过期时间（没有则一小时后），写入存储并返回过期时间戳。（v1）
 */
//@ chunk-8y02x996.js:1188-1277 facade-exports
async function saveIdpIdTokenFromJwt(idpIssuer, idToken) {
  let expFromJwt = jwtExp(idToken),
    expiresAt = expFromJwt ? expFromJwt * 1000 : Date.now() + 3600000;
  return (await saveIdpIdToken(idpIssuer, idToken, expiresAt), expiresAt);
}
/**
 * clearIdpIdToken：删除缓存的 IdP id_token。
 */
//@ chunk-8y02x996.js:1277-1497 facade-exports = clearIdpIdToken (0.231)
async function clearIdpIdToken(idpIssuer) {
  let key = issuerKey(idpIssuer);
  try {
    await getSecureStorage().mutate((e) => {
      if (!e.mcpXaaIdp?.[key]) return e;
      let n = { ...e.mcpXaaIdp };
      return (delete n[key], { ...e, mcpXaaIdp: n });
    });
  } catch (error) {
    logMCPDebug("xaa", `clearIdpIdToken(${redactUrlSecrets(key)}) failed: ${errorMessage(error)}`);
  }
}
/**
 * saveIdpClientSecret：把 IdP client secret 写入安全存储 mcpXaaIdpConfig[issuer]。
 */
//@ chunk-8y02x996.js:1497-1672 facade-exports = saveIdpClientSecret (0.642)
async function saveIdpClientSecret(idpIssuer, clientSecret) {
  try {
    return await getSecureStorage().mutate((e) => ({
      ...e,
      mcpXaaIdpConfig: { ...e.mcpXaaIdpConfig, [issuerKey(idpIssuer)]: { clientSecret: clientSecret } },
    }));
  } catch (error) {
    return { success: !1, warning: errorMessage(error) };
  }
}
/**
 * 从安全存储读取某 IdP issuer 配置的 client secret（XAA 用）。（v1）
 */
//@ chunk-8y02x996.js:1672-1766 facade-exports = getIdpClientSecret (0.822)
async function getIdpClientSecret(idpIssuer) {
  return (await getSecureStorage().readAsync())?.mcpXaaIdpConfig?.[issuerKey(idpIssuer)]?.clientSecret;
}
/**
 * clearIdpClientSecret：删除 IdP client secret。
 */
//@ chunk-8y02x996.js:1766-2009 facade-exports
async function clearIdpClientSecret(r) {
  let t = issuerKey(r);
  try {
    await getSecureStorage().mutate((e) => {
      if (!e.mcpXaaIdpConfig?.[t]) return e;
      let n = { ...e.mcpXaaIdpConfig };
      return (delete n[t], { ...e, mcpXaaIdpConfig: n });
    });
  } catch (error) {
    logMCPDebug("xaa", `clearIdpClientSecret(${redactUrlSecrets(t)}) failed: ${errorMessage(error)}`);
  }
}
//@ chunk-8y02x996.js:2009-2121 layout
function idpFetch(r, t) {
  return fetch(r, {
    ...t,
    ...getProxyFetchOptions({ url: String(r) }),
    signal: AbortSignal.timeout(IDP_REQUEST_TIMEOUT_MS),
  }).catch((e) => rethrowRedactedFetchError(e, r));
}
/**
 * discoverOidc：拉取 <issuer>/.well-known/openid-configuration 并校验，token_endpoint 必须 https。
 */
//@ chunk-8y02x996.js:2121-2995 facade-exports = discoverOidc (0.864)
async function discoverOidc(idpIssuer) {
  let base = idpIssuer.endsWith("/") ? idpIssuer : idpIssuer + "/";
  if (!URL.canParse(".well-known/openid-configuration", base))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA IdP: OIDC discovery failed: issuer is not a valid URL: ${redactUrlSecrets(idpIssuer)}`,
      "XAA IdP: OIDC discovery failed: issuer is not a valid URL",
    );
  let url = new URL(".well-known/openid-configuration", base),
    res = await idpFetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok)
    throw Error(`XAA IdP: OIDC discovery failed: HTTP ${res.status} at ${redactUrlSecrets(url.href)}`);
  let body;
  try {
    body = await res.json();
  } catch {
    throw Error(
      `XAA IdP: OIDC discovery returned non-JSON at ${redactUrlSecrets(url.href)} (captive portal or proxy?)`,
    );
  }
  let parsed = A$r.safeParse(body);
  if (!parsed.success) throw Error(`XAA IdP: invalid OIDC metadata: ${parsed.error.message}`);
  if (!URL.canParse(parsed.data.token_endpoint) || new URL(parsed.data.token_endpoint).protocol !== "https:")
    throw Error(
      `XAA IdP: refusing non-HTTPS token endpoint: ${redactUrlSecrets(parsed.data.token_endpoint)}`,
    );
  return parsed.data;
}
//@ chunk-8y02x996.js:2995-3171 fingerprint = jwtExp (1)
function jwtExp(jwt) {
  let parts = jwt.split(".");
  if (parts.length !== 3) return;
  try {
    let payload = jsonParse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    return typeof payload.exp === "number" ? payload.exp : void 0;
  } catch {
    return;
  }
}
/**
 * waitForCallback：在 127.0.0.1:<port> 起一次性 HTTP 服务器等待 /callback，校验 state，返回授权码；5 分钟超时、可中止、端口占用时给出排查命令。
 */
//@ chunk-8y02x996.js:3171-5009 fingerprint = waitForCallback (0.865)
function waitForCallback(port, expectedState, abortSignal, onListening) {
  let server = null,
    timeoutId = null,
    abortHandler = null,
    cleanup = () => {
      if (
        (server?.removeAllListeners(),
        server?.on("error", () => {}),
        server?.close(),
        (server = null),
        timeoutId)
      )
        (clearTimeout(timeoutId), (timeoutId = null));
      if (abortSignal && abortHandler)
        (abortSignal.removeEventListener("abort", abortHandler), (abortHandler = null));
    };
  return new Promise((resolve, reject) => {
    let p = !1,
      resolveOnce = (a) => {
        if (p) return;
        ((p = !0), cleanup(), resolve(a));
      },
      rejectOnce = (a) => {
        if (p) return;
        ((p = !0), cleanup(), reject(a));
      };
    if (abortSignal) {
      if (((abortHandler = () => rejectOnce(Error("XAA IdP: login cancelled"))), abortSignal.aborted)) {
        abortHandler();
        return;
      }
      abortSignal.addEventListener("abort", abortHandler, { once: !0 });
    }
    ((server = createServer((req, res) => {
      let parsed = parse(req.url || "", !0);
      if (parsed.pathname !== "/callback") {
        (res.writeHead(404), res.end());
        return;
      }
      let code = parsed.query.code,
        state = parsed.query.state,
        err = parsed.query.error;
      if (err) {
        let desc = parsed.query.error_description;
        (res.writeHead(400, { "Content-Type": "text/html" }),
          res.end(
            callbackPageBody({
              ok: !1,
              heading: "Sign-in failed",
              message: "Close this tab and try again from Claude Code.",
              detail: `${err}: ${desc ?? ""}`,
            }),
          ),
          rejectOnce(Error(`XAA IdP: ${err}${desc ? ` \u2014 ${desc}` : ""}`)));
        return;
      }
      if (state !== expectedState) {
        (res.writeHead(400, { "Content-Type": "text/html" }),
          res.end(
            callbackPageBody({
              ok: !1,
              heading: "Sign-in failed",
              message: "State mismatch. Close this tab and try again.",
            }),
          ),
          rejectOnce(Error("XAA IdP: state mismatch (possible CSRF)")));
        return;
      }
      if (!code) {
        (res.writeHead(400, { "Content-Type": "text/html" }),
          res.end(
            callbackPageBody({
              ok: !1,
              heading: "Sign-in failed",
              message: "No authorization code received. Close this tab and try again.",
            }),
          ),
          rejectOnce(Error("XAA IdP: callback missing code")));
        return;
      }
      (res.writeHead(200, { "Content-Type": "text/html" }),
        res.end(
          callbackPageBody({
            ok: !0,
            heading: "Sign-in complete",
            message: "You can close this tab and return to Claude Code.",
          }),
        ),
        resolveOnce(code));
    })),
      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          let s =
            getPlatform() === "windows" ? `netstat -ano | findstr :${port}` : `lsof -ti:${port} -sTCP:LISTEN`;
          rejectOnce(
            Error(`XAA IdP: callback port ${port} is already in use. Run \`${s}\` to find the holder.`),
          );
        } else rejectOnce(Error(`XAA IdP: callback server failed: ${err.message}`));
      }),
      server.listen(port, "127.0.0.1", () => {
        try {
          onListening();
        } catch (error) {
          rejectOnce(toError(error));
        }
      }),
      server.unref(),
      (timeoutId = setTimeout(
        (rej) => rej(Error("XAA IdP: login timed out")),
        IDP_LOGIN_TIMEOUT_MS,
        rejectOnce,
      )),
      timeoutId.unref());
  });
}
/**
 * acquireIdpIdToken：XAA 的 IdP 登录：有缓存 id_token 直接用，否则 OIDC 发现 + PKCE 授权码流程（scope=openid，打开浏览器）换 id_token 并缓存。
 */
//@ chunk-8y02x996.js:5009-6170 facade-exports = acquireIdpIdToken (0.906)
async function acquireIdpIdToken(opts) {
  return withFeatureTelemetry("mcp_xaa_idp_login", async () => {
    let { idpIssuer: idpIssuer, idpClientId: idpClientId } = opts,
      n = await getCachedIdpIdToken(idpIssuer);
    if (n) return (logMCPDebug("xaa", `Using cached id_token for ${redactUrlSecrets(idpIssuer)}`), n);
    logMCPDebug("xaa", `No cached id_token for ${redactUrlSecrets(idpIssuer)}; starting OIDC login`);
    let metadata = await discoverOidc(idpIssuer),
      port = opts.callbackPort ?? (await findAvailablePort()),
      l = `http://localhost:${port}/callback`,
      state = randomBytes(32).toString("base64url"),
      clientInformation = {
        client_id: idpClientId,
        ...(opts.idpClientSecret && { client_secret: opts.idpClientSecret }),
      },
      { authorizationUrl: authorizationUrl, codeVerifier: codeVerifier } = await ZLo(idpIssuer, {
        metadata: metadata,
        clientInformation: clientInformation,
        redirectUrl: l,
        scope: "openid",
        state: state,
      }),
      authorizationCode = await waitForCallback(port, state, opts.abortSignal, () => {
        if ((opts.onAuthorizationUrl(authorizationUrl.toString()), !opts.skipBrowserOpen))
          (logMCPDebug("xaa", "Opening browser to IdP authorization endpoint"),
            fi(authorizationUrl.toString()));
      }),
      tokens = await r2s(idpIssuer, {
        metadata: metadata,
        clientInformation: clientInformation,
        authorizationCode: authorizationCode,
        codeVerifier: codeVerifier,
        redirectUri: l,
        fetchFn: idpFetch,
      });
    if (!tokens.id_token) throw Error("XAA IdP: token response missing id_token (check scope=openid)");
    let expFromJwt = jwtExp(tokens.id_token),
      expiresAt = expFromJwt ? expFromJwt * 1000 : Date.now() + (tokens.expires_in ?? 3600) * 1000;
    try {
      (await saveIdpIdToken(idpIssuer, tokens.id_token, expiresAt),
        logMCPDebug(
          "xaa",
          `Cached id_token for ${redactUrlSecrets(idpIssuer)} (expires ${new Date(expiresAt).toISOString()})`,
        ));
    } catch (error) {
      logMCPDebug("xaa", `id_token cache write failed: ${errorMessage(error)}`);
    }
    return tokens.id_token;
  });
}
//@ chunk-qy28ss7z.js:743-769 affinity
var IDP_LOGIN_TIMEOUT_MS_2 = 300000,
  IDP_REQUEST_TIMEOUT_MS_2 = 30000,
  ID_TOKEN_EXPIRY_SKEW_SECONDS_2 = 60;
/**
 * issuerKey（v2 副本）。
 */
//@ chunk-qy28ss7z.js:769-930 facade-exports
function issuerKey_2(n) {
  try {
    let t = new URL(n);
    return ((t.pathname = t.pathname.replace(/\/+$/, "")), (t.host = t.host.toLowerCase()), t.toString());
  } catch {
    return n.replace(/\/+$/, "");
  }
}
/**
 * getCachedIdpIdToken（v2 副本）。
 */
//@ chunk-qy28ss7z.js:930-1075 facade-exports = getCachedIdpIdToken (0.871)
async function getCachedIdpIdToken_2(idpIssuer) {
  let entry = (await getSecureStorage().readAsync())?.mcpXaaIdp?.[issuerKey_2(idpIssuer)];
  if (!entry) return;
  if (entry.expiresAt - Date.now() <= ID_TOKEN_EXPIRY_SKEW_SECONDS_2 * 1000) return;
  return entry.idToken;
}
//@ chunk-qy28ss7z.js:1075-1192 layout = getCachedIdpIdToken (0.874)
async function saveIdpIdToken_2(n, t, e) {
  await getSecureStorage().mutate((r) => ({
    ...r,
    mcpXaaIdp: { ...r.mcpXaaIdp, [issuerKey_2(n)]: { idToken: t, expiresAt: e } },
  }));
}
/**
 * 保存 IdP id_token 并按 JWT exp 计算过期时间。（v2 副本）
 */
//@ chunk-qy28ss7z.js:1192-1281 facade-exports
async function saveIdpIdTokenFromJwt_2(n, t) {
  let e = jwtExp_2(t),
    r = e ? e * 1000 : Date.now() + 3600000;
  return (await saveIdpIdToken_2(n, t, r), r);
}
/**
 * clearIdpIdToken（v2 副本）。
 */
//@ chunk-qy28ss7z.js:1281-1501 facade-exports = saveIdpIdToken (0.195)
async function clearIdpIdToken_2(n) {
  let t = issuerKey_2(n);
  try {
    await getSecureStorage().mutate((e) => {
      if (!e.mcpXaaIdp?.[t]) return e;
      let r = { ...e.mcpXaaIdp };
      return (delete r[t], { ...e, mcpXaaIdp: r });
    });
  } catch (error) {
    logMCPDebug("xaa", `clearIdpIdToken(${redactUrlSecrets(t)}) failed: ${errorMessage(error)}`);
  }
}
/**
 * saveIdpClientSecret（v2 副本）。
 */
//@ chunk-qy28ss7z.js:1501-1676 facade-exports = clearIdpClientSecret (0.421)
async function saveIdpClientSecret_2(n, t) {
  try {
    return await getSecureStorage().mutate((e) => ({
      ...e,
      mcpXaaIdpConfig: { ...e.mcpXaaIdpConfig, [issuerKey_2(n)]: { clientSecret: t } },
    }));
  } catch (error) {
    return { success: !1, warning: errorMessage(error) };
  }
}
/**
 * 读取 IdP issuer 的 client secret。（v2 副本）
 */
//@ chunk-qy28ss7z.js:1676-1770 facade-exports = getIdpClientSecret (0.822)
async function getIdpClientSecret_2(idpIssuer) {
  return (await getSecureStorage().readAsync())?.mcpXaaIdpConfig?.[issuerKey_2(idpIssuer)]?.clientSecret;
}
/**
 * clearIdpClientSecret（v2 副本）。
 */
//@ chunk-qy28ss7z.js:1770-2013 facade-exports
async function clearIdpClientSecret_2(n) {
  let t = issuerKey_2(n);
  try {
    await getSecureStorage().mutate((e) => {
      if (!e.mcpXaaIdpConfig?.[t]) return e;
      let r = { ...e.mcpXaaIdpConfig };
      return (delete r[t], { ...e, mcpXaaIdpConfig: r });
    });
  } catch (error) {
    logMCPDebug("xaa", `clearIdpClientSecret(${redactUrlSecrets(t)}) failed: ${errorMessage(error)}`);
  }
}
//@ chunk-qy28ss7z.js:2013-2125 layout
function idpFetch_2(n, t) {
  return fetch(n, {
    ...t,
    ...getProxyFetchOptions({ url: String(n) }),
    signal: AbortSignal.timeout(IDP_REQUEST_TIMEOUT_MS_2),
  }).catch((e) => rethrowRedactedFetchError(e, n));
}
/**
 * discoverOidc（v2 副本）。
 */
//@ chunk-qy28ss7z.js:2125-2999 facade-exports = discoverOidc (0.864)
async function discoverOidc_2(idpIssuer) {
  let base = idpIssuer.endsWith("/") ? idpIssuer : idpIssuer + "/";
  if (!URL.canParse(".well-known/openid-configuration", base))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA IdP: OIDC discovery failed: issuer is not a valid URL: ${redactUrlSecrets(idpIssuer)}`,
      "XAA IdP: OIDC discovery failed: issuer is not a valid URL",
    );
  let url = new URL(".well-known/openid-configuration", base),
    res = await idpFetch_2(url, { headers: { Accept: "application/json" } });
  if (!res.ok)
    throw Error(`XAA IdP: OIDC discovery failed: HTTP ${res.status} at ${redactUrlSecrets(url.href)}`);
  let body;
  try {
    body = await res.json();
  } catch {
    throw Error(
      `XAA IdP: OIDC discovery returned non-JSON at ${redactUrlSecrets(url.href)} (captive portal or proxy?)`,
    );
  }
  let parsed = PBt.safeParse(body);
  if (!parsed.success) throw Error(`XAA IdP: invalid OIDC metadata: ${parsed.error.message}`);
  if (!URL.canParse(parsed.data.token_endpoint) || new URL(parsed.data.token_endpoint).protocol !== "https:")
    throw Error(
      `XAA IdP: refusing non-HTTPS token endpoint: ${redactUrlSecrets(parsed.data.token_endpoint)}`,
    );
  return parsed.data;
}
//@ chunk-qy28ss7z.js:2999-3175 layout = jwtExp (1)
function jwtExp_2(jwt) {
  let parts = jwt.split(".");
  if (parts.length !== 3) return;
  try {
    let payload = jsonParse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    return typeof payload.exp === "number" ? payload.exp : void 0;
  } catch {
    return;
  }
}
/**
 * waitForCallback（v2 副本）：回调额外返回 iss 参数（RFC 9207）。
 */
//@ chunk-qy28ss7z.js:3175-5049 layout = waitForCallback (0.857)
function waitForCallback_2(port, expectedState, abortSignal, onListening) {
  let server = null,
    timeoutId = null,
    abortHandler = null,
    cleanup = () => {
      if (
        (server?.removeAllListeners(),
        server?.on("error", () => {}),
        server?.close(),
        (server = null),
        timeoutId)
      )
        (clearTimeout(timeoutId), (timeoutId = null));
      if (abortSignal && abortHandler)
        (abortSignal.removeEventListener("abort", abortHandler), (abortHandler = null));
    };
  return new Promise((resolve, reject) => {
    let p = !1,
      h = (s, o) => {
        if (p) return;
        ((p = !0), cleanup(), resolve({ code: s, iss: o }));
      },
      resolveOnce = (s) => {
        if (p) return;
        ((p = !0), cleanup(), reject(s));
      };
    if (abortSignal) {
      if (((abortHandler = () => resolveOnce(Error("XAA IdP: login cancelled"))), abortSignal.aborted)) {
        abortHandler();
        return;
      }
      abortSignal.addEventListener("abort", abortHandler, { once: !0 });
    }
    ((server = createServer((req, res) => {
      let parsed = parse(req.url || "", !0);
      if (parsed.pathname !== "/callback") {
        (res.writeHead(404), res.end());
        return;
      }
      let code = parsed.query.code,
        state = parsed.query.state,
        err = parsed.query.error,
        x = Pdn(parsed.query.iss);
      if (err) {
        let desc = parsed.query.error_description;
        (res.writeHead(400, { "Content-Type": "text/html" }),
          res.end(
            callbackPageBody({
              ok: !1,
              heading: "Sign-in failed",
              message: "Close this tab and try again from Claude Code.",
              detail: `${err}: ${desc ?? ""}`,
            }),
          ),
          resolveOnce(Error(`XAA IdP: ${err}${desc ? ` \u2014 ${desc}` : ""}`)));
        return;
      }
      if (state !== expectedState) {
        (res.writeHead(400, { "Content-Type": "text/html" }),
          res.end(
            callbackPageBody({
              ok: !1,
              heading: "Sign-in failed",
              message: "State mismatch. Close this tab and try again.",
            }),
          ),
          resolveOnce(Error("XAA IdP: state mismatch (possible CSRF)")));
        return;
      }
      if (!code) {
        (res.writeHead(400, { "Content-Type": "text/html" }),
          res.end(
            callbackPageBody({
              ok: !1,
              heading: "Sign-in failed",
              message: "No authorization code received. Close this tab and try again.",
            }),
          ),
          resolveOnce(Error("XAA IdP: callback missing code")));
        return;
      }
      (res.writeHead(200, { "Content-Type": "text/html" }),
        res.end(
          callbackPageBody({
            ok: !0,
            heading: "Sign-in complete",
            message: "You can close this tab and return to Claude Code.",
          }),
        ),
        h(code, x));
    })),
      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          let o =
            getPlatform() === "windows" ? `netstat -ano | findstr :${port}` : `lsof -ti:${port} -sTCP:LISTEN`;
          resolveOnce(
            Error(`XAA IdP: callback port ${port} is already in use. Run \`${o}\` to find the holder.`),
          );
        } else resolveOnce(Error(`XAA IdP: callback server failed: ${err.message}`));
      }),
      server.listen(port, "127.0.0.1", () => {
        try {
          onListening();
        } catch (error) {
          resolveOnce(toError(error));
        }
      }),
      server.unref(),
      (timeoutId = setTimeout(
        (rej) => rej(Error("XAA IdP: login timed out")),
        IDP_LOGIN_TIMEOUT_MS_2,
        resolveOnce,
      )),
      timeoutId.unref());
  });
}
/**
 * acquireIdpIdToken（v2 副本）：换令牌时带上回调的 iss。
 */
//@ chunk-qy28ss7z.js:5049-6225 facade-exports = acquireIdpIdToken (0.896)
async function acquireIdpIdToken_2(opts) {
  return withFeatureTelemetry("mcp_xaa_idp_login", async () => {
    let { idpIssuer: idpIssuer, idpClientId: idpClientId } = opts,
      r = await getCachedIdpIdToken_2(idpIssuer);
    if (r) return (logMCPDebug("xaa", `Using cached id_token for ${redactUrlSecrets(idpIssuer)}`), r);
    logMCPDebug("xaa", `No cached id_token for ${redactUrlSecrets(idpIssuer)}; starting OIDC login`);
    let metadata = await discoverOidc_2(idpIssuer),
      port = opts.callbackPort ?? (await findAvailablePort()),
      l = `http://localhost:${port}/callback`,
      state = randomBytes(32).toString("base64url"),
      clientInformation = {
        client_id: idpClientId,
        ...(opts.idpClientSecret && { client_secret: opts.idpClientSecret }),
      },
      { authorizationUrl: authorizationUrl, codeVerifier: codeVerifier } = await lLo(idpIssuer, {
        metadata: metadata,
        clientInformation: clientInformation,
        redirectUrl: l,
        scope: "openid",
        state: state,
      }),
      authorizationCode = await waitForCallback_2(port, state, opts.abortSignal, () => {
        if ((opts.onAuthorizationUrl(authorizationUrl.toString()), !opts.skipBrowserOpen))
          (logMCPDebug("xaa", "Opening browser to IdP authorization endpoint"),
            fi(authorizationUrl.toString()));
      }),
      tokens = await fzs(idpIssuer, {
        metadata: metadata,
        clientInformation: clientInformation,
        authorizationCode: authorizationCode.code,
        iss: authorizationCode.iss,
        codeVerifier: codeVerifier,
        redirectUri: l,
        fetchFn: idpFetch_2,
      });
    if (!tokens.id_token) throw Error("XAA IdP: token response missing id_token (check scope=openid)");
    let expFromJwt = jwtExp_2(tokens.id_token),
      expiresAt = expFromJwt ? expFromJwt * 1000 : Date.now() + (tokens.expires_in ?? 3600) * 1000;
    try {
      (await saveIdpIdToken_2(idpIssuer, tokens.id_token, expiresAt),
        logMCPDebug(
          "xaa",
          `Cached id_token for ${redactUrlSecrets(idpIssuer)} (expires ${new Date(expiresAt).toISOString()})`,
        ));
    } catch (error) {
      logMCPDebug("xaa", `id_token cache write failed: ${errorMessage(error)}`);
    }
    return tokens.id_token;
  });
}
//@ chunk-1wpnxx5r.js:11278-11315 sole-consumer
var regExp_2 = new RegExp(`^${toolportPathFor("[^/]+")}`);
/**
 * issuerKey（实为 URL 路径是否为首段即结束的判定），名字疑似配错。
 */
//@ chunk-1wpnxx5r.js:11315-11448 fingerprint = issuerKey (0.684)
function issuerKey_3(issuer) {
  if (!isSameOriginAsCcr(issuer)) return !1;
  let r;
  try {
    r = posix.normalize(decodeURIComponent(new URL(issuer).pathname));
  } catch {
    return !0;
  }
  return regExp_2.test(r);
}
/**
 * isXaaEnabled：环境变量 CLAUDE_CODE_ENABLE_XAA。
 */
//@ chunk-cyj440je.js:6350-6396 fingerprint = isXaaEnabled (1)
function isXaaEnabled() {
  return env.CLAUDE_CODE_ENABLE_XAA;
}
/**
 * getXaaIdpSettings：设置项 xaaIdp（IdP 连接配置）。
 */
//@ chunk-cyj440je.js:6396-6430 fingerprint = getXaaIdpSettings (1)
function getXaaIdpSettings() {
  return getInitialSettings_2().xaaIdp;
}

export {
  issuerKey_3,
  isXaaEnabled,
  getXaaIdpSettings,
  getIdpClientSecret_2,
  getCachedIdpIdToken_2,
  acquireIdpIdToken_2,
  discoverOidc_2,
  clearIdpIdToken_2,
  getIdpClientSecret,
  getCachedIdpIdToken,
  acquireIdpIdToken,
  discoverOidc,
  clearIdpIdToken,
};
