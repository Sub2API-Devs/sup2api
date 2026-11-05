/**
 * services/mcp/xaa.ts
 *
 * 并入已有模块：MCP 跨应用访问（XAA）补充。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/xaa.ts
 * pieces: chunk-01kgd7xg.js (1), chunk-aw801t9e.js (1), chunk-ft6a2kja.js (11), chunk-ghww1f0b.js (7)
 * attribution: fingerprint 9, layout 4, callgraph-witnessed 1, placement 6
 */
import { resolve } from "path";
import { pathToFileURL } from "url";
import { toUncLongPath } from "../../utils/windowsUncPaths.js";
import { isUntouchableSpelling } from "../../utils/networkPaths.js";
import { isUncOrDevicePath } from "../../utils/pathClassification.js";
import { isNetworkPathAfterNormalize, isUnsafeFileUrl } from "../../utils/pathSanitize.js";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { rethrowRedactedFetchError } from "./auth.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  discoverOAuthProtectedResourceMetadata,
  discoverAuthorizationServerMetadata,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import {
  isAbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { redactUrlSecrets } from "../../utils/urlRedaction.js";
import { getPresentedCredentialLog } from "./discoveryIdentity.js";
import { JwtBearerResponseSchema } from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { logMCPDebug } from "../../utils/log.js";
import { exchangeIdTokenForJag } from "../../../vendor/@modelcontextprotocol/client/dist/index.mjs";
import { CALLER_GONE_SIGNAL } from "../../entrypoints/mcp.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-01kgd7xg.js:73909-74075 fingerprint (2.1.88 match: normalizeUrl, 0.684)
/**
 * toSafeFileUrl：本地路径转 file:// URL，拒绝 UNC、设备路径与带主机名的结果。
 */
function toSafeFileUrl(url) {
  try {
    let uncLongPath = toUncLongPath(url);
    let uncLongPath_2 = toUncLongPath(resolve(uncLongPath));
    if (
      isUntouchableSpelling(uncLongPath) ||
      isUncOrDevicePath(uncLongPath_2) ||
      isNetworkPathAfterNormalize(uncLongPath) ||
      isNetworkPathAfterNormalize(uncLongPath_2)
    )
      return null;
    let fileUrl = pathToFileURL(uncLongPath);
    return fileUrl.hostname !== "" || isUnsafeFileUrl(fileUrl.href) ? null : fileUrl.href;
  } catch {
    return null;
  }
}
//@ chunk-ghww1f0b.js:1884-2091 callgraph-witnessed (2.1.88 match: JWT_BEARER_GRANT, 0.386)
var XAA_REQUEST_TIMEOUT_MS_2 = 30000;
var TOKEN_EXCHANGE_GRANT_2 = "urn:ietf:params:oauth:grant-type:token-exchange";
var JWT_BEARER_GRANT_2 = "urn:ietf:params:oauth:grant-type:jwt-bearer";
var ID_JAG_TOKEN_TYPE_2 = "urn:ietf:params:oauth:token-type:id-jag";
var ID_TOKEN_TYPE_2 = "urn:ietf:params:oauth:token-type:id_token";
//@ chunk-ghww1f0b.js:2091-2255 placement
/**
 * makeXaaFetch（v2 副本）。
 */
function makeXaaFetch_2(abortSignal) {
  return (input, init) => {
    let timeout = AbortSignal.timeout(XAA_REQUEST_TIMEOUT_MS_2);
    let signal = abortSignal ? AbortSignal.any([timeout, abortSignal]) : timeout;
    return fetch(input, {
      ...init,
      ...getProxyFetchOptions({
        url: String(input),
      }),
      signal,
    }).catch((error) => rethrowRedactedFetchError(error, input));
  };
}
//@ chunk-ghww1f0b.js:2255-2267 placement
var defaultXaaFetch_2; // deferred: uses makeXaaFetch_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ghww1f0b.js:2255", () => {
  defaultXaaFetch_2 = makeXaaFetch_2();
});
//@ chunk-ghww1f0b.js:2267-2361 placement
function normalizeUrl_2(url) {
  try {
    return new URL(url).href.replace(/\/$/, "");
  } catch {
    return url.replace(/\/$/, "");
  }
}
//@ chunk-ghww1f0b.js:2361-2489 placement (2.1.88 match: XaaTokenExchangeError, 1)
class XaaTokenExchangeError_2 extends Error {
  shouldClearIdToken;
  constructor(message, shouldClearIdToken) {
    super(message);
    this.name = "XaaTokenExchangeError";
    this.shouldClearIdToken = shouldClearIdToken;
  }
}
//@ chunk-ghww1f0b.js:2489-2591 placement
var SENSITIVE_TOKEN_FIELD_PATTERN_2 =
  /"(access_token|refresh_token|id_token|assertion|subject_token|client_secret)"\s*:\s*"[^"]*"/g;
//@ chunk-ghww1f0b.js:2591-2682 placement (2.1.88 match: redactTokens, 1)
function redactTokens_2(raw) {
  return (typeof raw === "string" ? raw : jsonStringify(raw)).replace(
    SENSITIVE_TOKEN_FIELD_PATTERN_2,
    (match, k) => `"${k}":"[REDACTED]"`,
  );
}
//@ chunk-ft6a2kja.js:1837-2044 fingerprint (2.1.88 match: ID_JAG_TOKEN_TYPE, 0.408)
var XAA_REQUEST_TIMEOUT_MS = 30000;
var TOKEN_EXCHANGE_GRANT = "urn:ietf:params:oauth:grant-type:token-exchange";
var JWT_BEARER_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer";
var ID_JAG_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:id-jag";
var ID_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:id_token";
//@ chunk-ft6a2kja.js:2044-2208 layout
/**
 * makeXaaFetch：带 30 秒超时、可选中止信号与代理设置的 fetch。
 */
function makeXaaFetch(abortSignal) {
  return (input, init) => {
    let timeout = AbortSignal.timeout(XAA_REQUEST_TIMEOUT_MS);
    let signal = abortSignal ? AbortSignal.any([timeout, abortSignal]) : timeout;
    return fetch(input, {
      ...init,
      ...getProxyFetchOptions({
        url: String(input),
      }),
      signal,
    }).catch((error) => rethrowRedactedFetchError(error, input));
  };
}
//@ chunk-ft6a2kja.js:2208-2220 layout
var defaultXaaFetch; // deferred: uses makeXaaFetch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ft6a2kja.js:2208", () => {
  defaultXaaFetch = makeXaaFetch();
});
//@ chunk-ft6a2kja.js:2220-2314 layout
function normalizeUrl(url) {
  try {
    return new URL(url).href.replace(/\/$/, "");
  } catch {
    return url.replace(/\/$/, "");
  }
}
//@ chunk-ft6a2kja.js:2314-2442 fingerprint (2.1.88 match: XaaTokenExchangeError, 1)
class XaaTokenExchangeError extends Error {
  shouldClearIdToken;
  constructor(message, shouldClearIdToken) {
    super(message);
    this.name = "XaaTokenExchangeError";
    this.shouldClearIdToken = shouldClearIdToken;
  }
}
//@ chunk-ft6a2kja.js:2442-2544 layout
var SENSITIVE_TOKEN_FIELD_PATTERN =
  /"(access_token|refresh_token|id_token|assertion|subject_token|client_secret)"\s*:\s*"[^"]*"/g;
//@ chunk-ft6a2kja.js:2544-2635 fingerprint (2.1.88 match: redactTokens, 1)
function redactTokens(raw) {
  return (typeof raw === "string" ? raw : jsonStringify(raw)).replace(
    SENSITIVE_TOKEN_FIELD_PATTERN,
    (match, k) => `"${k}":"[REDACTED]"`,
  );
}
//@ chunk-ft6a2kja.js:2914-3528 fingerprint (2.1.88 match: discoverProtectedResource, 0.828)
/**
 * discoverProtectedResource：拉取 PRM，要求 resource 与服务器 URL 一致且有 authorization_servers。
 */
async function discoverProtectedResource(serverUrl, opts) {
  let prm;
  try {
    prm = await discoverOAuthProtectedResourceMetadata(
      serverUrl,
      undefined,
      opts?.fetchFn ?? defaultXaaFetch,
    );
  } catch (error) {
    if (isAbortError(error)) throw error;
    let status = error instanceof Error ? /^HTTP (\d{3}) /.exec(error.message)?.[1] : undefined;
    throw Error(
      `XAA: PRM discovery failed for ${redactUrlSecrets(serverUrl)} (${status ? `HTTP ${status}` : error instanceof Error ? error.name : typeof error})`,
    );
  }
  if (!prm.resource || !prm.authorization_servers?.[0])
    throw Error("XAA: PRM discovery failed: PRM missing resource or authorization_servers");
  if (normalizeUrl(prm.resource) !== normalizeUrl(serverUrl))
    throw Error(
      `XAA: PRM discovery failed: PRM resource mismatch: expected ${redactUrlSecrets(serverUrl)}, got ${redactUrlSecrets(prm.resource)}`,
    );
  return {
    resource: prm.resource,
    authorization_servers: prm.authorization_servers,
  };
}
//@ chunk-ft6a2kja.js:3528-4420 fingerprint (2.1.88 match: discoverAuthorizationServer, 0.817)
/**
 * discoverAuthorizationServer：拉取授权服务器元数据，校验 issuer 一致、token_endpoint 为 https。
 */
async function discoverAuthorizationServer(asUrl, opts) {
  let meta;
  try {
    meta = await discoverAuthorizationServerMetadata(asUrl, {
      fetchFn: opts?.fetchFn ?? defaultXaaFetch,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    let status = error instanceof Error ? /^HTTP (\d{3}) /.exec(error.message)?.[1] : undefined;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA: AS metadata discovery failed (${status ? `HTTP ${status}` : error instanceof Error ? error.name : typeof error})`,
      "XAA: AS metadata discovery failed",
    );
  }
  if (!meta?.issuer || !meta.token_endpoint)
    throw Error(`XAA: AS metadata discovery failed: no valid metadata at ${redactUrlSecrets(asUrl)}`);
  if (normalizeUrl(meta.issuer) !== normalizeUrl(asUrl))
    throw Error(
      `XAA: AS metadata discovery failed: issuer mismatch: expected ${redactUrlSecrets(asUrl)}, got ${redactUrlSecrets(meta.issuer)}`,
    );
  if (!URL.canParse(meta.token_endpoint) || new URL(meta.token_endpoint).protocol !== "https:")
    throw Error(`XAA: refusing non-HTTPS token endpoint: ${redactUrlSecrets(meta.token_endpoint)}`);
  return {
    issuer: meta.issuer,
    token_endpoint: meta.token_endpoint,
    grant_types_supported: meta.grant_types_supported,
    token_endpoint_auth_methods_supported: meta.token_endpoint_auth_methods_supported,
  };
}
//@ chunk-ft6a2kja.js:5535-6523 fingerprint (2.1.88 match: exchangeJwtAuthGrant, 0.989)
/**
 * exchangeJwtAuthGrant：RFC 7523 jwt-bearer grant，client_secret_basic 或 _post，响应按 JwtBearerResponseSchema 校验。
 */
async function exchangeJwtAuthGrant(opts) {
  let fetchFn = opts.fetchFn ?? defaultXaaFetch;
  let authMethod = opts.authMethod ?? "client_secret_basic";
  let params = new URLSearchParams({
    grant_type: JWT_BEARER_GRANT,
    assertion: opts.assertion,
  });
  if (opts.scope) params.set("scope", opts.scope);
  let headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (authMethod === "client_secret_basic") {
    let basicAuth = Buffer.from(
      `${encodeURIComponent(opts.clientId)}:${encodeURIComponent(opts.clientSecret)}`,
    ).toString("base64");
    headers.Authorization = `Basic ${basicAuth}`;
    getPresentedCredentialLog().record(basicAuth);
  } else {
    params.set("client_id", opts.clientId);
    params.set("client_secret", opts.clientSecret);
  }
  getPresentedCredentialLog().record(opts.clientSecret);
  getPresentedCredentialLog().record(opts.assertion);
  let res = await fetchFn(opts.tokenEndpoint, {
    method: "POST",
    headers,
    body: params,
  });
  if (!res.ok) {
    let body = redactTokens(await res.text()).slice(0, 200);
    throw Error(`XAA: jwt-bearer grant failed: HTTP ${res.status}: ${body}`);
  }
  let rawTokens;
  try {
    rawTokens = await res.json();
  } catch {
    throw Error(
      `XAA: jwt-bearer grant returned non-JSON (captive portal?) at ${redactUrlSecrets(opts.tokenEndpoint)}`,
    );
  }
  let tokensParsed = JwtBearerResponseSchema().safeParse(rawTokens);
  if (!tokensParsed.success)
    throw Error(`XAA: jwt-bearer response did not match expected shape: ${redactTokens(rawTokens)}`);
  return tokensParsed.data;
}
//@ chunk-ft6a2kja.js:6523-8495 fingerprint (2.1.88 match: performCrossAppAccess, 0.894)
/**
 * performCrossAppAccess（XAA）：RFC 9728 发现受保护资源 → 选择支持 jwt-bearer 的授权服务器（可固定）→ 在 IdP 用 id_token 做 token exchange 得 ID-JAG → 在授权服务器用 jwt-bearer 换 access_token。
 */
async function performCrossAppAccess_2(serverUrl, config, serverName = "xaa", abortSignal) {
  let fetchFn = makeXaaFetch(abortSignal);
  logMCPDebug(serverName, `XAA: discovering PRM for ${redactUrlSecrets(serverUrl)}`);
  let prm = await discoverProtectedResource(serverUrl, {
    fetchFn,
  });
  logMCPDebug(
    serverName,
    `XAA: discovered resource=${redactUrlSecrets(prm.resource)} ASes=[${prm.authorization_servers.map(redactUrlSecrets).join(", ")}]`,
  );
  let pinnedAuthorizationServer = config.pinnedAuthorizationServer;
  let candidateServers =
    pinnedAuthorizationServer === undefined
      ? prm.authorization_servers
      : prm.authorization_servers.filter(
          (authorizationServer) =>
            normalizeUrl(authorizationServer) === normalizeUrl(pinnedAuthorizationServer),
        );
  if (pinnedAuthorizationServer !== undefined && candidateServers.length === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA: authorization server changed: signed in with ${redactUrlSecrets(pinnedAuthorizationServer)}, server now names [${prm.authorization_servers.map(redactUrlSecrets).join(", ")}]. If this move is expected, run \`claude mcp remove\` for this server and add it again with its client secret.`,
      "XAA: authorization server changed",
    );
  let asMeta;
  let asErrors = [];
  for (let asUrl of candidateServers) {
    let candidate;
    try {
      candidate = await discoverAuthorizationServer(asUrl, {
        fetchFn,
      });
    } catch (e) {
      if (abortSignal?.aborted) throw e;
      asErrors.push(`${redactUrlSecrets(asUrl)}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    if (candidate.grant_types_supported && !candidate.grant_types_supported.includes(JWT_BEARER_GRANT)) {
      asErrors.push(
        `${redactUrlSecrets(asUrl)}: does not advertise jwt-bearer grant (supported: ${candidate.grant_types_supported.join(", ")})`,
      );
      continue;
    }
    asMeta = candidate;
    break;
  }
  if (!asMeta)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA: no authorization server supports jwt-bearer. Tried: ${asErrors.join("; ")}`,
      `XAA: no authorization server supports jwt-bearer (tried ${candidateServers.length})`,
    );
  let authMethods = asMeta.token_endpoint_auth_methods_supported;
  let authMethod =
    authMethods && !authMethods.includes("client_secret_basic") && authMethods.includes("client_secret_post")
      ? "client_secret_post"
      : "client_secret_basic";
  logMCPDebug(
    serverName,
    `XAA: AS issuer=${redactUrlSecrets(asMeta.issuer)} token_endpoint=${redactUrlSecrets(asMeta.token_endpoint)} auth_method=${authMethod}`,
  );
  logMCPDebug(serverName, "XAA: exchanging id_token for ID-JAG at IdP");
  let jag = await exchangeIdTokenForJag({
    tokenEndpoint: config.idpTokenEndpoint,
    audience: asMeta.issuer,
    resource: prm.resource,
    idToken: config.idpIdToken,
    clientId: config.idpClientId,
    clientSecret: config.idpClientSecret,
    fetchFn,
  });
  logMCPDebug(serverName, "XAA: ID-JAG obtained");
  logMCPDebug(serverName, "XAA: exchanging ID-JAG for access_token at AS");
  let tokens = await exchangeJwtAuthGrant({
    tokenEndpoint: asMeta.token_endpoint,
    assertion: jag.jwtAuthGrant,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authMethod,
    fetchFn,
  });
  logMCPDebug(serverName, "XAA: access_token obtained");
  return {
    ...tokens,
    authorizationServerUrl: asMeta.issuer,
  };
}
//@ chunk-aw801t9e.js:14175-14271 fingerprint (2.1.88 match: makeXaaFetch, 0.647)
/**
 * 把请求 extra 中的 CALLERGONE 中止信号并入给定信号。
 */
function combineWithCallerGoneSignal(signal, authInfo) {
  let callerSignal = authInfo?.extra?.[CALLER_GONE_SIGNAL];
  return callerSignal instanceof AbortSignal ? AbortSignal.any([signal, callerSignal]) : signal;
}
export {
  toSafeFileUrl,
  defaultXaaFetch_2,
  TOKEN_EXCHANGE_GRANT_2,
  ID_JAG_TOKEN_TYPE_2,
  ID_TOKEN_TYPE_2,
  redactTokens_2,
  XaaTokenExchangeError_2,
  defaultXaaFetch,
  TOKEN_EXCHANGE_GRANT,
  ID_JAG_TOKEN_TYPE,
  ID_TOKEN_TYPE,
  redactTokens,
  XaaTokenExchangeError,
  normalizeUrl_2,
  JWT_BEARER_GRANT_2,
  makeXaaFetch_2,
  performCrossAppAccess_2,
  combineWithCallerGoneSignal,
};
