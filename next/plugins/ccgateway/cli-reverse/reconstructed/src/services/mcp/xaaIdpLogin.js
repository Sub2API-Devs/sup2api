/**
 * services/mcp/xaaIdpLogin.ts
 *
 * XAA 的 IdP 登录：OIDC 发现、PKCE 授权码流程与本地回调服务器、id_token 与 client secret 的安全存储缓存（v1/v2 两份）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/xaaIdpLogin.ts
 * pieces: chunk-5rg2vws1.js (14), chunk-ebh35d1r.js (14), chunk-fmy4vc7c.js (2), chunk-hfc4cfnt.js (2)
 * attribution: affinity 2, facade-exports 18, fingerprint 6, layout 5, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { posix } from "path";
import { createServer } from "http";
import { parse } from "url";
import { randomBytes } from "crypto";
import { env } from "../../utils/env.js";
import { getInitialSettings } from "../../utils/settings/settings.js";
import { toolportPathFor, isSameOriginAsCcr } from "./ccrMcpUrls.js";
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
import { OpenIdProviderDiscoveryMetadataSchema as OpenIdProviderDiscoveryMetadataSchema_2 } from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { jsonParse } from "../../utils/slowOperations.js";
import { firstOf, findAvailablePort } from "./oauthPort.js";
import { callbackPageBody } from "../oauth/callbackPage.js";
import { getPlatform } from "../../utils/platform.js";
import { withFeatureTelemetry } from "../analytics/featureTelemetry.js";
import {
  startAuthorization as startAuthorization_2,
  exchangeAuthorization as exchangeAuthorization_2,
} from "../../../vendor/@modelcontextprotocol/client/dist/index.mjs";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { OpenIdProviderDiscoveryMetadataSchema } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/shared/auth.js";
import {
  startAuthorization,
  exchangeAuthorization,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmy4vc7c.js:6728-6774 fingerprint (2.1.88 match: isXaaEnabled, 1)
/**
 * isXaaEnabled：环境变量 CLAUDE_CODE_ENABLE_XAA。
 */
function isXaaEnabled() {
  return env.CLAUDE_CODE_ENABLE_XAA;
}
//@ chunk-fmy4vc7c.js:6774-6808 fingerprint (2.1.88 match: getXaaIdpSettings, 1)
/**
 * getXaaIdpSettings：设置项 xaaIdp（IdP 连接配置）。
 */
function getXaaIdpSettings() {
  return getInitialSettings().xaaIdp;
}
//@ chunk-hfc4cfnt.js:11329-11366 sole-consumer
var regExp_2; // deferred: uses toolportPathFor (./ccrMcpUrls.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hfc4cfnt.js:11329", () => {
  regExp_2 = new RegExp(`^${toolportPathFor("[^/]+")}`);
});
//@ chunk-hfc4cfnt.js:11366-11499 fingerprint (2.1.88 match: issuerKey, 0.684)
/**
 * issuerKey（实为 URL 路径是否为首段即结束的判定），名字疑似配错。
 */
function issuerKey_3(issuer) {
  if (!isSameOriginAsCcr(issuer)) return false;
  let normalizedPath;
  try {
    normalizedPath = posix.normalize(decodeURIComponent(new URL(issuer).pathname));
  } catch {
    return true;
  }
  return regExp_2.test(normalizedPath);
}
//@ chunk-ebh35d1r.js:743-769 affinity
var IDP_LOGIN_TIMEOUT_MS_2 = 300000;
var IDP_REQUEST_TIMEOUT_MS_2 = 30000;
var ID_TOKEN_EXPIRY_SKEW_SECONDS_2 = 60;
//@ chunk-ebh35d1r.js:769-930 facade-exports
/**
 * issuerKey（v2 副本）。
 */
function issuerKey_2(idpIssuer) {
  try {
    let url = new URL(idpIssuer);
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.host = url.host.toLowerCase();
    return url.toString();
  } catch {
    return idpIssuer.replace(/\/+$/, "");
  }
}
//@ chunk-ebh35d1r.js:930-1075 facade-exports (2.1.88 match: getCachedIdpIdToken, 0.872)
/**
 * getCachedIdpIdToken（v2 副本）。
 */
async function getCachedIdpIdToken_2(idpIssuer) {
  let entry = (await getSecureStorage().readAsync())?.mcpXaaIdp?.[issuerKey_2(idpIssuer)];
  if (!entry) return;
  if (entry.expiresAt - Date.now() <= ID_TOKEN_EXPIRY_SKEW_SECONDS_2 * 1000) return;
  return entry.idToken;
}
//@ chunk-ebh35d1r.js:1075-1192 layout (2.1.88 match: getCachedIdpIdToken, 0.875)
async function saveIdpIdToken_2(idpIssuer, idToken, expiresAt) {
  await getSecureStorage().mutate((existing) => ({
    ...existing,
    mcpXaaIdp: {
      ...existing.mcpXaaIdp,
      [issuerKey_2(idpIssuer)]: {
        idToken,
        expiresAt,
      },
    },
  }));
}
//@ chunk-ebh35d1r.js:1192-1281 facade-exports
/**
 * 保存 IdP id_token 并按 JWT exp 计算过期时间。（v2 副本）
 */
async function saveIdpIdTokenFromJwt_2(idpIssuer, idToken) {
  let expFromJwt = jwtExp_2(idToken);
  let expiresAt = expFromJwt ? expFromJwt * 1000 : Date.now() + 3600000;
  await saveIdpIdToken_2(idpIssuer, idToken, expiresAt);
  return expiresAt;
}
//@ chunk-ebh35d1r.js:1281-1501 facade-exports (2.1.88 match: saveIdpIdToken, 0.195)
/**
 * clearIdpIdToken（v2 副本）。
 */
async function clearIdpIdToken_2(issuer) {
  let key = issuerKey_2(issuer);
  try {
    await getSecureStorage().mutate((storage) => {
      if (!storage.mcpXaaIdp?.[key]) return storage;
      let next = {
        ...storage.mcpXaaIdp,
      };
      delete next[key];
      return {
        ...storage,
        mcpXaaIdp: next,
      };
    });
  } catch (error) {
    logMCPDebug("xaa", `clearIdpIdToken(${redactUrlSecrets(key)}) failed: ${errorMessage(error)}`);
  }
}
//@ chunk-ebh35d1r.js:1501-1676 facade-exports (2.1.88 match: clearIdpClientSecret, 0.421)
/**
 * saveIdpClientSecret（v2 副本）。
 */
async function saveIdpClientSecret_2(idpIssuer, clientSecret) {
  try {
    return await getSecureStorage().mutate((existing) => ({
      ...existing,
      mcpXaaIdpConfig: {
        ...existing.mcpXaaIdpConfig,
        [issuerKey_2(idpIssuer)]: {
          clientSecret,
        },
      },
    }));
  } catch (error) {
    return {
      success: false,
      warning: errorMessage(error),
    };
  }
}
//@ chunk-ebh35d1r.js:1676-1770 facade-exports (2.1.88 match: getIdpClientSecret, 0.822)
/**
 * 读取 IdP issuer 的 client secret。（v2 副本）
 */
async function getIdpClientSecret_2(idpIssuer) {
  return (await getSecureStorage().readAsync())?.mcpXaaIdpConfig?.[issuerKey_2(idpIssuer)]?.clientSecret;
}
//@ chunk-ebh35d1r.js:1770-2013 facade-exports
/**
 * clearIdpClientSecret（v2 副本）。
 */
async function clearIdpClientSecret_2(idpIssuer) {
  let key = issuerKey_2(idpIssuer);
  try {
    await getSecureStorage().mutate((storage) => {
      if (!storage.mcpXaaIdpConfig?.[key]) return storage;
      let next = {
        ...storage.mcpXaaIdpConfig,
      };
      delete next[key];
      return {
        ...storage,
        mcpXaaIdpConfig: next,
      };
    });
  } catch (error) {
    logMCPDebug("xaa", `clearIdpClientSecret(${redactUrlSecrets(key)}) failed: ${errorMessage(error)}`);
  }
}
//@ chunk-ebh35d1r.js:2013-2125 layout
function idpFetch_2(url, init) {
  return fetch(url, {
    ...init,
    ...getProxyFetchOptions({
      url: String(url),
    }),
    signal: AbortSignal.timeout(IDP_REQUEST_TIMEOUT_MS_2),
  }).catch((error) => rethrowRedactedFetchError(error, url));
}
//@ chunk-ebh35d1r.js:2125-2999 facade-exports (2.1.88 match: discoverOidc, 0.864)
/**
 * discoverOidc（v2 副本）。
 */
async function discoverOidc_2(idpIssuer) {
  let base = idpIssuer.endsWith("/") ? idpIssuer : idpIssuer + "/";
  if (!URL.canParse(".well-known/openid-configuration", base))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA IdP: OIDC discovery failed: issuer is not a valid URL: ${redactUrlSecrets(idpIssuer)}`,
      "XAA IdP: OIDC discovery failed: issuer is not a valid URL",
    );
  let url = new URL(".well-known/openid-configuration", base);
  let res = await idpFetch_2(url, {
    headers: {
      Accept: "application/json",
    },
  });
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
  let parsed = OpenIdProviderDiscoveryMetadataSchema_2.safeParse(body);
  if (!parsed.success) throw Error(`XAA IdP: invalid OIDC metadata: ${parsed.error.message}`);
  if (!URL.canParse(parsed.data.token_endpoint) || new URL(parsed.data.token_endpoint).protocol !== "https:")
    throw Error(
      `XAA IdP: refusing non-HTTPS token endpoint: ${redactUrlSecrets(parsed.data.token_endpoint)}`,
    );
  return parsed.data;
}
//@ chunk-ebh35d1r.js:2999-3175 layout (2.1.88 match: jwtExp, 1)
function jwtExp_2(jwt) {
  let parts = jwt.split(".");
  if (parts.length !== 3) return;
  try {
    let payload = jsonParse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    return typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return;
  }
}
//@ chunk-ebh35d1r.js:3175-5049 layout (2.1.88 match: waitForCallback, 0.857)
/**
 * waitForCallback（v2 副本）：回调额外返回 iss 参数（RFC 9207）。
 */
function waitForCallback_2(port, expectedState, abortSignal, onListening) {
  let server = null;
  let timeoutId = null;
  let abortHandler = null;
  let cleanup = () => {
    server?.removeAllListeners();
    server?.on("error", () => {});
    server?.close();
    server = null;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (abortSignal && abortHandler) {
      abortSignal.removeEventListener("abort", abortHandler);
      abortHandler = null;
    }
  };
  return new Promise((resolve, reject) => {
    let resolved = false;
    let resolveOnce = (code, iss) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve({
        code,
        iss,
      });
    };
    let rejectOnce = (e) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(e);
    };
    if (abortSignal) {
      abortHandler = () => rejectOnce(Error("XAA IdP: login cancelled"));
      if (abortSignal.aborted) {
        abortHandler();
        return;
      }
      abortSignal.addEventListener("abort", abortHandler, {
        once: true,
      });
    }
    server = createServer((req, res) => {
      let parsed = parse(req.url || "", true);
      if (parsed.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }
      let code = parsed.query.code;
      let state = parsed.query.state;
      let err = parsed.query.error;
      let issuer = firstOf(parsed.query.iss);
      if (err) {
        let desc = parsed.query.error_description;
        res.writeHead(400, {
          "Content-Type": "text/html",
        });
        res.end(
          callbackPageBody({
            ok: false,
            heading: "Sign-in failed",
            message: "Close this tab and try again from Claude Code.",
            detail: `${err}: ${desc ?? ""}`,
          }),
        );
        rejectOnce(Error(`XAA IdP: ${err}${desc ? ` \u2014 ${desc}` : ""}`));
        return;
      }
      if (state !== expectedState) {
        res.writeHead(400, {
          "Content-Type": "text/html",
        });
        res.end(
          callbackPageBody({
            ok: false,
            heading: "Sign-in failed",
            message: "State mismatch. Close this tab and try again.",
          }),
        );
        rejectOnce(Error("XAA IdP: state mismatch (possible CSRF)"));
        return;
      }
      if (!code) {
        res.writeHead(400, {
          "Content-Type": "text/html",
        });
        res.end(
          callbackPageBody({
            ok: false,
            heading: "Sign-in failed",
            message: "No authorization code received. Close this tab and try again.",
          }),
        );
        rejectOnce(Error("XAA IdP: callback missing code"));
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/html",
      });
      res.end(
        callbackPageBody({
          ok: true,
          heading: "Sign-in complete",
          message: "You can close this tab and return to Claude Code.",
        }),
      );
      resolveOnce(code, issuer);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        let findCmd =
          getPlatform() === "windows" ? `netstat -ano | findstr :${port}` : `lsof -ti:${port} -sTCP:LISTEN`;
        rejectOnce(
          Error(`XAA IdP: callback port ${port} is already in use. Run \`${findCmd}\` to find the holder.`),
        );
      } else rejectOnce(Error(`XAA IdP: callback server failed: ${err.message}`));
    });
    server.listen(port, "127.0.0.1", () => {
      try {
        onListening();
      } catch (e) {
        rejectOnce(toError(e));
      }
    });
    server.unref();
    timeoutId = setTimeout(
      (rej) => rej(Error("XAA IdP: login timed out")),
      IDP_LOGIN_TIMEOUT_MS_2,
      rejectOnce,
    );
    timeoutId.unref();
  });
}
//@ chunk-ebh35d1r.js:5049-6225 facade-exports (2.1.88 match: acquireIdpIdToken, 0.896)
/**
 * acquireIdpIdToken（v2 副本）：换令牌时带上回调的 iss。
 */
async function acquireIdpIdToken_2(opts) {
  return withFeatureTelemetry("mcp_xaa_idp_login", async () => {
    let { idpIssuer, idpClientId } = opts;
    let cached = await getCachedIdpIdToken_2(idpIssuer);
    if (cached) {
      logMCPDebug("xaa", `Using cached id_token for ${redactUrlSecrets(idpIssuer)}`);
      return cached;
    }
    logMCPDebug("xaa", `No cached id_token for ${redactUrlSecrets(idpIssuer)}; starting OIDC login`);
    let metadata = await discoverOidc_2(idpIssuer);
    let port = opts.callbackPort ?? (await findAvailablePort());
    let redirectUri = `http://localhost:${port}/callback`;
    let state = randomBytes(32).toString("base64url");
    let clientInformation = {
      client_id: idpClientId,
      ...(opts.idpClientSecret && {
        client_secret: opts.idpClientSecret,
      }),
    };
    let { authorizationUrl, codeVerifier } = await startAuthorization_2(idpIssuer, {
      metadata,
      clientInformation,
      redirectUrl: redirectUri,
      scope: "openid",
      state,
    });
    let authorizationCode = await waitForCallback_2(port, state, opts.abortSignal, () => {
      opts.onAuthorizationUrl(authorizationUrl.toString());
      if (!opts.skipBrowserOpen) {
        logMCPDebug("xaa", "Opening browser to IdP authorization endpoint");
        openValidatedUrlSucceeded(authorizationUrl.toString());
      }
    });
    let tokens = await exchangeAuthorization_2(idpIssuer, {
      metadata,
      clientInformation,
      authorizationCode: authorizationCode.code,
      iss: authorizationCode.iss,
      codeVerifier,
      redirectUri,
      fetchFn: idpFetch_2,
    });
    if (!tokens.id_token) throw Error("XAA IdP: token response missing id_token (check scope=openid)");
    let expFromJwt = jwtExp_2(tokens.id_token);
    let expiresAt = expFromJwt ? expFromJwt * 1000 : Date.now() + (tokens.expires_in ?? 3600) * 1000;
    try {
      await saveIdpIdToken_2(idpIssuer, tokens.id_token, expiresAt);
      logMCPDebug(
        "xaa",
        `Cached id_token for ${redactUrlSecrets(idpIssuer)} (expires ${new Date(expiresAt).toISOString()})`,
      );
    } catch (error) {
      logMCPDebug("xaa", `id_token cache write failed: ${errorMessage(error)}`);
    }
    return tokens.id_token;
  });
}
//@ chunk-5rg2vws1.js:739-765 affinity
var IDP_LOGIN_TIMEOUT_MS = 300000;
var IDP_REQUEST_TIMEOUT_MS = 30000;
var ID_TOKEN_EXPIRY_SKEW_SECONDS = 60;
//@ chunk-5rg2vws1.js:765-926 facade-exports
/**
 * issuerKey：IdP issuer URL 规范化（去尾斜杠、host 小写），作为安全存储 mcpXaaIdp/mcpXaaIdpConfig 的键。
 */
function issuerKey(idpIssuer) {
  try {
    let url = new URL(idpIssuer);
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.host = url.host.toLowerCase();
    return url.toString();
  } catch {
    return idpIssuer.replace(/\/+$/, "");
  }
}
//@ chunk-5rg2vws1.js:926-1071 facade-exports (2.1.88 match: getCachedIdpIdToken, 0.872)
/**
 * getCachedIdpIdToken：从安全存储读 IdP id_token，剩余有效期 ≤60 秒视为过期。
 */
async function getCachedIdpIdToken(idpIssuer) {
  let entry = (await getSecureStorage().readAsync())?.mcpXaaIdp?.[issuerKey(idpIssuer)];
  if (!entry) return;
  if (entry.expiresAt - Date.now() <= ID_TOKEN_EXPIRY_SKEW_SECONDS * 1000) return;
  return entry.idToken;
}
//@ chunk-5rg2vws1.js:1071-1188 fingerprint (2.1.88 match: getCachedIdpIdToken, 0.875)
/**
 * saveIdpIdToken：把 id_token 与过期时间写入安全存储 mcpXaaIdp[issuer]。
 */
async function saveIdpIdToken(idpIssuer, idToken, expiresAt) {
  await getSecureStorage().mutate((existing) => ({
    ...existing,
    mcpXaaIdp: {
      ...existing.mcpXaaIdp,
      [issuerKey(idpIssuer)]: {
        idToken,
        expiresAt,
      },
    },
  }));
}
//@ chunk-5rg2vws1.js:1188-1277 facade-exports
/**
 * 保存 IdP 的 id_token：从 JWT 的 exp 取过期时间（没有则一小时后），写入存储并返回过期时间戳。（v1）
 */
async function saveIdpIdTokenFromJwt(idpIssuer, idToken) {
  let expFromJwt = jwtExp(idToken);
  let expiresAt = expFromJwt ? expFromJwt * 1000 : Date.now() + 3600000;
  await saveIdpIdToken(idpIssuer, idToken, expiresAt);
  return expiresAt;
}
//@ chunk-5rg2vws1.js:1277-1497 facade-exports (2.1.88 match: clearIdpIdToken, 0.231)
/**
 * clearIdpIdToken：删除缓存的 IdP id_token。
 */
async function clearIdpIdToken(idpIssuer) {
  let key = issuerKey(idpIssuer);
  try {
    await getSecureStorage().mutate((storage) => {
      if (!storage.mcpXaaIdp?.[key]) return storage;
      let next = {
        ...storage.mcpXaaIdp,
      };
      delete next[key];
      return {
        ...storage,
        mcpXaaIdp: next,
      };
    });
  } catch (error) {
    logMCPDebug("xaa", `clearIdpIdToken(${redactUrlSecrets(key)}) failed: ${errorMessage(error)}`);
  }
}
//@ chunk-5rg2vws1.js:1497-1672 facade-exports (2.1.88 match: saveIdpClientSecret, 0.642)
/**
 * saveIdpClientSecret：把 IdP client secret 写入安全存储 mcpXaaIdpConfig[issuer]。
 */
async function saveIdpClientSecret(idpIssuer, clientSecret) {
  try {
    return await getSecureStorage().mutate((existing) => ({
      ...existing,
      mcpXaaIdpConfig: {
        ...existing.mcpXaaIdpConfig,
        [issuerKey(idpIssuer)]: {
          clientSecret,
        },
      },
    }));
  } catch (error) {
    return {
      success: false,
      warning: errorMessage(error),
    };
  }
}
//@ chunk-5rg2vws1.js:1672-1766 facade-exports (2.1.88 match: getIdpClientSecret, 0.822)
/**
 * 从安全存储读取某 IdP issuer 配置的 client secret（XAA 用）。（v1）
 */
async function getIdpClientSecret(idpIssuer) {
  return (await getSecureStorage().readAsync())?.mcpXaaIdpConfig?.[issuerKey(idpIssuer)]?.clientSecret;
}
//@ chunk-5rg2vws1.js:1766-2009 facade-exports
/**
 * clearIdpClientSecret：删除 IdP client secret。
 */
async function clearIdpClientSecret(idpIssuer) {
  let key = issuerKey(idpIssuer);
  try {
    await getSecureStorage().mutate((storage) => {
      if (!storage.mcpXaaIdpConfig?.[key]) return storage;
      let next = {
        ...storage.mcpXaaIdpConfig,
      };
      delete next[key];
      return {
        ...storage,
        mcpXaaIdpConfig: next,
      };
    });
  } catch (error) {
    logMCPDebug("xaa", `clearIdpClientSecret(${redactUrlSecrets(key)}) failed: ${errorMessage(error)}`);
  }
}
//@ chunk-5rg2vws1.js:2009-2121 layout
function idpFetch(url, init) {
  return fetch(url, {
    ...init,
    ...getProxyFetchOptions({
      url: String(url),
    }),
    signal: AbortSignal.timeout(IDP_REQUEST_TIMEOUT_MS),
  }).catch((error) => rethrowRedactedFetchError(error, url));
}
//@ chunk-5rg2vws1.js:2121-2995 facade-exports (2.1.88 match: discoverOidc, 0.864)
/**
 * discoverOidc：拉取 <issuer>/.well-known/openid-configuration 并校验，token_endpoint 必须 https。
 */
async function discoverOidc(idpIssuer) {
  let base = idpIssuer.endsWith("/") ? idpIssuer : idpIssuer + "/";
  if (!URL.canParse(".well-known/openid-configuration", base))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA IdP: OIDC discovery failed: issuer is not a valid URL: ${redactUrlSecrets(idpIssuer)}`,
      "XAA IdP: OIDC discovery failed: issuer is not a valid URL",
    );
  let url = new URL(".well-known/openid-configuration", base);
  let res = await idpFetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
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
  let parsed = OpenIdProviderDiscoveryMetadataSchema.safeParse(body);
  if (!parsed.success) throw Error(`XAA IdP: invalid OIDC metadata: ${parsed.error.message}`);
  if (!URL.canParse(parsed.data.token_endpoint) || new URL(parsed.data.token_endpoint).protocol !== "https:")
    throw Error(
      `XAA IdP: refusing non-HTTPS token endpoint: ${redactUrlSecrets(parsed.data.token_endpoint)}`,
    );
  return parsed.data;
}
//@ chunk-5rg2vws1.js:2995-3171 fingerprint (2.1.88 match: jwtExp, 1)
function jwtExp(jwt) {
  let parts = jwt.split(".");
  if (parts.length !== 3) return;
  try {
    let payload = jsonParse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    return typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return;
  }
}
//@ chunk-5rg2vws1.js:3171-5009 fingerprint (2.1.88 match: waitForCallback, 0.865)
/**
 * waitForCallback：在 127.0.0.1:<port> 起一次性 HTTP 服务器等待 /callback，校验 state，返回授权码；5 分钟超时、可中止、端口占用时给出排查命令。
 */
function waitForCallback(port, expectedState, abortSignal, onListening) {
  let server = null;
  let timeoutId = null;
  let abortHandler = null;
  let cleanup = () => {
    server?.removeAllListeners();
    server?.on("error", () => {});
    server?.close();
    server = null;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (abortSignal && abortHandler) {
      abortSignal.removeEventListener("abort", abortHandler);
      abortHandler = null;
    }
  };
  return new Promise((resolve, reject) => {
    let resolved = false;
    let resolveOnce = (v) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(v);
    };
    let rejectOnce = (e) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(e);
    };
    if (abortSignal) {
      abortHandler = () => rejectOnce(Error("XAA IdP: login cancelled"));
      if (abortSignal.aborted) {
        abortHandler();
        return;
      }
      abortSignal.addEventListener("abort", abortHandler, {
        once: true,
      });
    }
    server = createServer((req, res) => {
      let parsed = parse(req.url || "", true);
      if (parsed.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }
      let code = parsed.query.code;
      let state = parsed.query.state;
      let err = parsed.query.error;
      if (err) {
        let desc = parsed.query.error_description;
        res.writeHead(400, {
          "Content-Type": "text/html",
        });
        res.end(
          callbackPageBody({
            ok: false,
            heading: "Sign-in failed",
            message: "Close this tab and try again from Claude Code.",
            detail: `${err}: ${desc ?? ""}`,
          }),
        );
        rejectOnce(Error(`XAA IdP: ${err}${desc ? ` \u2014 ${desc}` : ""}`));
        return;
      }
      if (state !== expectedState) {
        res.writeHead(400, {
          "Content-Type": "text/html",
        });
        res.end(
          callbackPageBody({
            ok: false,
            heading: "Sign-in failed",
            message: "State mismatch. Close this tab and try again.",
          }),
        );
        rejectOnce(Error("XAA IdP: state mismatch (possible CSRF)"));
        return;
      }
      if (!code) {
        res.writeHead(400, {
          "Content-Type": "text/html",
        });
        res.end(
          callbackPageBody({
            ok: false,
            heading: "Sign-in failed",
            message: "No authorization code received. Close this tab and try again.",
          }),
        );
        rejectOnce(Error("XAA IdP: callback missing code"));
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/html",
      });
      res.end(
        callbackPageBody({
          ok: true,
          heading: "Sign-in complete",
          message: "You can close this tab and return to Claude Code.",
        }),
      );
      resolveOnce(code);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        let findCmd =
          getPlatform() === "windows" ? `netstat -ano | findstr :${port}` : `lsof -ti:${port} -sTCP:LISTEN`;
        rejectOnce(
          Error(`XAA IdP: callback port ${port} is already in use. Run \`${findCmd}\` to find the holder.`),
        );
      } else rejectOnce(Error(`XAA IdP: callback server failed: ${err.message}`));
    });
    server.listen(port, "127.0.0.1", () => {
      try {
        onListening();
      } catch (e) {
        rejectOnce(toError(e));
      }
    });
    server.unref();
    timeoutId = setTimeout((rej) => rej(Error("XAA IdP: login timed out")), IDP_LOGIN_TIMEOUT_MS, rejectOnce);
    timeoutId.unref();
  });
}
//@ chunk-5rg2vws1.js:5009-6170 facade-exports (2.1.88 match: acquireIdpIdToken, 0.906)
/**
 * acquireIdpIdToken：XAA 的 IdP 登录：有缓存 id_token 直接用，否则 OIDC 发现 + PKCE 授权码流程（scope=openid，打开浏览器）换 id_token 并缓存。
 */
async function acquireIdpIdToken(opts) {
  return withFeatureTelemetry("mcp_xaa_idp_login", async () => {
    let { idpIssuer, idpClientId } = opts;
    let cached = await getCachedIdpIdToken(idpIssuer);
    if (cached) {
      logMCPDebug("xaa", `Using cached id_token for ${redactUrlSecrets(idpIssuer)}`);
      return cached;
    }
    logMCPDebug("xaa", `No cached id_token for ${redactUrlSecrets(idpIssuer)}; starting OIDC login`);
    let metadata = await discoverOidc(idpIssuer);
    let port = opts.callbackPort ?? (await findAvailablePort());
    let redirectUri = `http://localhost:${port}/callback`;
    let state = randomBytes(32).toString("base64url");
    let clientInformation = {
      client_id: idpClientId,
      ...(opts.idpClientSecret && {
        client_secret: opts.idpClientSecret,
      }),
    };
    let { authorizationUrl, codeVerifier } = await startAuthorization(idpIssuer, {
      metadata,
      clientInformation,
      redirectUrl: redirectUri,
      scope: "openid",
      state,
    });
    let authorizationCode = await waitForCallback(port, state, opts.abortSignal, () => {
      opts.onAuthorizationUrl(authorizationUrl.toString());
      if (!opts.skipBrowserOpen) {
        logMCPDebug("xaa", "Opening browser to IdP authorization endpoint");
        openValidatedUrlSucceeded(authorizationUrl.toString());
      }
    });
    let tokens = await exchangeAuthorization(idpIssuer, {
      metadata,
      clientInformation,
      authorizationCode,
      codeVerifier,
      redirectUri,
      fetchFn: idpFetch,
    });
    if (!tokens.id_token) throw Error("XAA IdP: token response missing id_token (check scope=openid)");
    let expFromJwt = jwtExp(tokens.id_token);
    let expiresAt = expFromJwt ? expFromJwt * 1000 : Date.now() + (tokens.expires_in ?? 3600) * 1000;
    try {
      await saveIdpIdToken(idpIssuer, tokens.id_token, expiresAt);
      logMCPDebug(
        "xaa",
        `Cached id_token for ${redactUrlSecrets(idpIssuer)} (expires ${new Date(expiresAt).toISOString()})`,
      );
    } catch (error) {
      logMCPDebug("xaa", `id_token cache write failed: ${errorMessage(error)}`);
    }
    return tokens.id_token;
  });
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
  clearIdpClientSecret_2,
  issuerKey_2,
  saveIdpClientSecret_2,
  saveIdpIdTokenFromJwt_2,
  clearIdpClientSecret,
  issuerKey,
  saveIdpClientSecret,
  saveIdpIdTokenFromJwt,
};
