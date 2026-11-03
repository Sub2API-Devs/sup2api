/**
 * services/mcp/xaa.ts
 *
 * 并入已有模块：MCP 跨应用访问（XAA）补充。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/xaa.ts
 * pieces: chunk-1kaj6e83.js (11), chunk-6vnxsn99.js (1), chunk-hjesqqfw.js (1), chunk-n1aavqzh.js (7)
 * attribution: fingerprint 9, layout 4, callgraph-witnessed 1, placement 6
 */
import { resolve, resolve as resolve_2 } from "path";
import { pathToFileURL } from "url";
import { getProxyFetchOptions } from "../../utils/proxy.js";
import { rethrowRedactedFetchError } from "./auth.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { x$r, s1t } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import {
  isAbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { redactUrlSecrets } from "../../utils/urlRedaction.js";
import { Ny } from "./discoveryIdentity.js";
import { JwtBearerResponseSchema } from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { logMCPDebug } from "../../utils/log.js";
import { qe } from "../../../vendor/@modelcontextprotocol/client/dist/index.mjs";
import { toUncLongPath } from "../../utils/windowsUncPaths.js";
import { hl } from "../../utils/networkPaths.js";
import { Qn } from "../../utils/pathClassification.js";
import { sRt, ves } from "../../utils/pathSanitize.js";
import { CALLER_GONE_SIGNAL } from "../../entrypoints/mcp.js";

//@ chunk-1kaj6e83.js:1766-1973 fingerprint = ID_JAG_TOKEN_TYPE (0.408)
var XAA_REQUEST_TIMEOUT_MS = 30000,
  TOKEN_EXCHANGE_GRANT = "urn:ietf:params:oauth:grant-type:token-exchange",
  JWT_BEARER_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer",
  ID_JAG_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:id-jag",
  ID_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:id_token";
/**
 * makeXaaFetch：带 30 秒超时、可选中止信号与代理设置的 fetch。
 */
//@ chunk-1kaj6e83.js:1973-2137 layout
function makeXaaFetch(e) {
  return (t, r) => {
    let timeout = AbortSignal.timeout(XAA_REQUEST_TIMEOUT_MS),
      s = e ? AbortSignal.any([timeout, e]) : timeout;
    return fetch(t, { ...r, ...getProxyFetchOptions({ url: String(t) }), signal: s }).catch((h) =>
      rethrowRedactedFetchError(h, t),
    );
  };
}
//@ chunk-1kaj6e83.js:2137-2149 layout
var defaultXaaFetch = makeXaaFetch();
//@ chunk-1kaj6e83.js:2149-2243 layout
function normalizeUrl(e) {
  try {
    return new URL(e).href.replace(/\/$/, "");
  } catch {
    return e.replace(/\/$/, "");
  }
}
//@ chunk-1kaj6e83.js:2243-2371 fingerprint = XaaTokenExchangeError (1)
class XaaTokenExchangeError extends Error {
  shouldClearIdToken;
  constructor(e, t) {
    super(e);
    ((this.name = "XaaTokenExchangeError"), (this.shouldClearIdToken = t));
  }
}
//@ chunk-1kaj6e83.js:2371-2473 layout
var SENSITIVE_TOKEN_FIELD_PATTERN =
  /"(access_token|refresh_token|id_token|assertion|subject_token|client_secret)"\s*:\s*"[^"]*"/g;
//@ chunk-1kaj6e83.js:2473-2564 fingerprint = redactTokens (1)
function redactTokens(raw) {
  return (typeof raw === "string" ? raw : jsonStringify(raw)).replace(
    SENSITIVE_TOKEN_FIELD_PATTERN,
    (r, n) => `"${n}":"[REDACTED]"`,
  );
}
/**
 * discoverProtectedResource：拉取 PRM，要求 resource 与服务器 URL 一致且有 authorization_servers。
 */
//@ chunk-1kaj6e83.js:2843-3457 fingerprint = discoverProtectedResource (0.828)
async function discoverProtectedResource(serverUrl, opts) {
  let prm;
  try {
    prm = await x$r(serverUrl, void 0, opts?.fetchFn ?? defaultXaaFetch);
  } catch (error) {
    if (isAbortError(error)) throw error;
    let s = error instanceof Error ? /^HTTP (\d{3}) /.exec(error.message)?.[1] : void 0;
    throw Error(
      `XAA: PRM discovery failed for ${redactUrlSecrets(serverUrl)} (${s ? `HTTP ${s}` : error instanceof Error ? error.name : typeof error})`,
    );
  }
  if (!prm.resource || !prm.authorization_servers?.[0])
    throw Error("XAA: PRM discovery failed: PRM missing resource or authorization_servers");
  if (normalizeUrl(prm.resource) !== normalizeUrl(serverUrl))
    throw Error(
      `XAA: PRM discovery failed: PRM resource mismatch: expected ${redactUrlSecrets(serverUrl)}, got ${redactUrlSecrets(prm.resource)}`,
    );
  return { resource: prm.resource, authorization_servers: prm.authorization_servers };
}
/**
 * discoverAuthorizationServer：拉取授权服务器元数据，校验 issuer 一致、token_endpoint 为 https。
 */
//@ chunk-1kaj6e83.js:3457-4349 fingerprint = discoverAuthorizationServer (0.817)
async function discoverAuthorizationServer(asUrl, opts) {
  let r;
  try {
    r = await s1t(asUrl, { fetchFn: opts?.fetchFn ?? defaultXaaFetch });
  } catch (error) {
    if (isAbortError(error)) throw error;
    let s = error instanceof Error ? /^HTTP (\d{3}) /.exec(error.message)?.[1] : void 0;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA: AS metadata discovery failed (${s ? `HTTP ${s}` : error instanceof Error ? error.name : typeof error})`,
      "XAA: AS metadata discovery failed",
    );
  }
  if (!r?.issuer || !r.token_endpoint)
    throw Error(`XAA: AS metadata discovery failed: no valid metadata at ${redactUrlSecrets(asUrl)}`);
  if (normalizeUrl(r.issuer) !== normalizeUrl(asUrl))
    throw Error(
      `XAA: AS metadata discovery failed: issuer mismatch: expected ${redactUrlSecrets(asUrl)}, got ${redactUrlSecrets(r.issuer)}`,
    );
  if (!URL.canParse(r.token_endpoint) || new URL(r.token_endpoint).protocol !== "https:")
    throw Error(`XAA: refusing non-HTTPS token endpoint: ${redactUrlSecrets(r.token_endpoint)}`);
  return {
    issuer: r.issuer,
    token_endpoint: r.token_endpoint,
    grant_types_supported: r.grant_types_supported,
    token_endpoint_auth_methods_supported: r.token_endpoint_auth_methods_supported,
  };
}
/**
 * exchangeJwtAuthGrant：RFC 7523 jwt-bearer grant，client_secret_basic 或 _post，响应按 JwtBearerResponseSchema 校验。
 */
//@ chunk-1kaj6e83.js:5464-6452 fingerprint = exchangeJwtAuthGrant (0.989)
async function exchangeJwtAuthGrant(opts) {
  let t = opts.fetchFn ?? defaultXaaFetch,
    r = opts.authMethod ?? "client_secret_basic",
    params = new URLSearchParams({ grant_type: JWT_BEARER_GRANT, assertion: opts.assertion });
  if (opts.scope) params.set("scope", opts.scope);
  let headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (r === "client_secret_basic") {
    let basicAuth = Buffer.from(
      `${encodeURIComponent(opts.clientId)}:${encodeURIComponent(opts.clientSecret)}`,
    ).toString("base64");
    ((headers.Authorization = `Basic ${basicAuth}`), Ny().record(basicAuth));
  } else (params.set("client_id", opts.clientId), params.set("client_secret", opts.clientSecret));
  (Ny().record(opts.clientSecret), Ny().record(opts.assertion));
  let res = await t(opts.tokenEndpoint, { method: "POST", headers: headers, body: params });
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
/**
 * performCrossAppAccess（XAA）：RFC 9728 发现受保护资源 → 选择支持 jwt-bearer 的授权服务器（可固定）→ 在 IdP 用 id_token 做 token exchange 得 ID-JAG → 在授权服务器用 jwt-bearer 换 access_token。
 */
//@ chunk-1kaj6e83.js:6452-8424 fingerprint = performCrossAppAccess (0.894)
async function performCrossAppAccess_2(serverUrl, config, serverName = "xaa", abortSignal) {
  let fetchFn = makeXaaFetch(abortSignal);
  logMCPDebug(serverName, `XAA: discovering PRM for ${redactUrlSecrets(serverUrl)}`);
  let prm = await discoverProtectedResource(serverUrl, { fetchFn: fetchFn });
  logMCPDebug(
    serverName,
    `XAA: discovered resource=${redactUrlSecrets(prm.resource)} ASes=[${prm.authorization_servers.map(redactUrlSecrets).join(", ")}]`,
  );
  let pinnedAuthorizationServer = config.pinnedAuthorizationServer,
    S =
      pinnedAuthorizationServer === void 0
        ? prm.authorization_servers
        : prm.authorization_servers.filter(
            (authorization_server) =>
              normalizeUrl(authorization_server) === normalizeUrl(pinnedAuthorizationServer),
          );
  if (pinnedAuthorizationServer !== void 0 && S.length === 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA: authorization server changed: signed in with ${redactUrlSecrets(pinnedAuthorizationServer)}, server now names [${prm.authorization_servers.map(redactUrlSecrets).join(", ")}]. If this move is expected, run \`claude mcp remove\` for this server and add it again with its client secret.`,
      "XAA: authorization server changed",
    );
  let v,
    asErrors = [];
  for (let F of S) {
    let P;
    try {
      P = await discoverAuthorizationServer(F, { fetchFn: fetchFn });
    } catch (error) {
      if (abortSignal?.aborted) throw error;
      asErrors.push(`${redactUrlSecrets(F)}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (P.grant_types_supported && !P.grant_types_supported.includes(JWT_BEARER_GRANT)) {
      asErrors.push(
        `${redactUrlSecrets(F)}: does not advertise jwt-bearer grant (supported: ${P.grant_types_supported.join(", ")})`,
      );
      continue;
    }
    v = P;
    break;
  }
  if (!v)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `XAA: no authorization server supports jwt-bearer. Tried: ${asErrors.join("; ")}`,
      `XAA: no authorization server supports jwt-bearer (tried ${S.length})`,
    );
  let authMethods = v.token_endpoint_auth_methods_supported,
    U =
      authMethods &&
      !authMethods.includes("client_secret_basic") &&
      authMethods.includes("client_secret_post")
        ? "client_secret_post"
        : "client_secret_basic";
  (logMCPDebug(
    serverName,
    `XAA: AS issuer=${redactUrlSecrets(v.issuer)} token_endpoint=${redactUrlSecrets(v.token_endpoint)} auth_method=${U}`,
  ),
    logMCPDebug(serverName, "XAA: exchanging id_token for ID-JAG at IdP"));
  let jag = await qe({
    tokenEndpoint: config.idpTokenEndpoint,
    audience: v.issuer,
    resource: prm.resource,
    idToken: config.idpIdToken,
    clientId: config.idpClientId,
    clientSecret: config.idpClientSecret,
    fetchFn: fetchFn,
  });
  (logMCPDebug(serverName, "XAA: ID-JAG obtained"),
    logMCPDebug(serverName, "XAA: exchanging ID-JAG for access_token at AS"));
  let tokens = await exchangeJwtAuthGrant({
    tokenEndpoint: v.token_endpoint,
    assertion: jag.jwtAuthGrant,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authMethod: U,
    fetchFn: fetchFn,
  });
  return (
    logMCPDebug(serverName, "XAA: access_token obtained"),
    { ...tokens, authorizationServerUrl: v.issuer }
  );
}
//@ chunk-n1aavqzh.js:1813-2020 callgraph-witnessed = JWT_BEARER_GRANT (0.385)
var XAA_REQUEST_TIMEOUT_MS_2 = 30000,
  TOKEN_EXCHANGE_GRANT_2 = "urn:ietf:params:oauth:grant-type:token-exchange",
  JWT_BEARER_GRANT_2 = "urn:ietf:params:oauth:grant-type:jwt-bearer",
  ID_JAG_TOKEN_TYPE_2 = "urn:ietf:params:oauth:token-type:id-jag",
  ID_TOKEN_TYPE_2 = "urn:ietf:params:oauth:token-type:id_token";
/**
 * makeXaaFetch（v2 副本）。
 */
//@ chunk-n1aavqzh.js:2020-2184 placement
function makeXaaFetch_2(e) {
  return (t, n) => {
    let timeout = AbortSignal.timeout(XAA_REQUEST_TIMEOUT_MS_2),
      s = e ? AbortSignal.any([timeout, e]) : timeout;
    return fetch(t, { ...n, ...getProxyFetchOptions({ url: String(t) }), signal: s }).catch((S) =>
      rethrowRedactedFetchError(S, t),
    );
  };
}
//@ chunk-n1aavqzh.js:2184-2196 placement
var defaultXaaFetch_2 = makeXaaFetch_2();
//@ chunk-n1aavqzh.js:2196-2290 placement
function normalizeUrl_2(e) {
  try {
    return new URL(e).href.replace(/\/$/, "");
  } catch {
    return e.replace(/\/$/, "");
  }
}
//@ chunk-n1aavqzh.js:2290-2418 placement = XaaTokenExchangeError (1)
class XaaTokenExchangeError_2 extends Error {
  shouldClearIdToken;
  constructor(e, t) {
    super(e);
    ((this.name = "XaaTokenExchangeError"), (this.shouldClearIdToken = t));
  }
}
//@ chunk-n1aavqzh.js:2418-2520 placement
var SENSITIVE_TOKEN_FIELD_PATTERN_2 =
  /"(access_token|refresh_token|id_token|assertion|subject_token|client_secret)"\s*:\s*"[^"]*"/g;
//@ chunk-n1aavqzh.js:2520-2611 placement = redactTokens (1)
function redactTokens_2(raw) {
  return (typeof raw === "string" ? raw : jsonStringify(raw)).replace(
    SENSITIVE_TOKEN_FIELD_PATTERN_2,
    (n, r) => `"${r}":"[REDACTED]"`,
  );
}
/**
 * toSafeFileUrl：本地路径转 file:// URL，拒绝 UNC、设备路径与带主机名的结果。
 */
//@ chunk-6vnxsn99.js:72542-72708 fingerprint = normalizeUrl (0.683)
function toSafeFileUrl(url) {
  try {
    let n = toUncLongPath(url),
      r = toUncLongPath(resolve_2(n));
    if (hl(n) || Qn(r) || sRt(n) || sRt(r)) return null;
    let o = pathToFileURL(n);
    return o.hostname !== "" || ves(o.href) ? null : o.href;
  } catch {
    return null;
  }
}
/**
 * 把请求 extra 中的 CALLERGONE 中止信号并入给定信号。
 */
//@ chunk-hjesqqfw.js:13845-13941 fingerprint = makeXaaFetch (0.648)
function combineWithCallerGoneSignal(s, S) {
  let o = S?.extra?.[CALLER_GONE_SIGNAL];
  return o instanceof AbortSignal ? AbortSignal.any([s, o]) : s;
}

export {
  defaultXaaFetch,
  TOKEN_EXCHANGE_GRANT,
  ID_JAG_TOKEN_TYPE,
  ID_TOKEN_TYPE,
  redactTokens,
  XaaTokenExchangeError,
  defaultXaaFetch_2,
  TOKEN_EXCHANGE_GRANT_2,
  ID_JAG_TOKEN_TYPE_2,
  ID_TOKEN_TYPE_2,
  redactTokens_2,
  XaaTokenExchangeError_2,
  JWT_BEARER_GRANT_2,
  makeXaaFetch_2,
  normalizeUrl_2,
  performCrossAppAccess_2,
  toSafeFileUrl,
  combineWithCallerGoneSignal,
};
