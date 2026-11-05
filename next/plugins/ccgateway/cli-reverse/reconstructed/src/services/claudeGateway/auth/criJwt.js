/**
 * services/claudeGateway/auth/criJwt.ts
 *
 * 2.1.316 新增：网关 CRI JWT 校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { decodeProtectedHeader } from "../../../../vendor/jose/dist/node/esm/util/decode_protected_header.js";
import { isLoopbackUrl, isAllowedLoopbackUrl, isAllowedOutboundUrl } from "../ssrfGuard.js";
import { gatewayLog, gatewayJsonLog } from "../../gateway/gatewayBanner.js";
import { fetchWithTimeout } from "../network.js";
import { errorMessage } from "../../../utils/errors.js";
import { importJWK } from "../../../../vendor/jose/dist/webapi/key/import.js";
import { jwtVerify } from "../../../../vendor/jose/dist/node/esm/jwt/verify.js";
import { JWTClaimValidationFailed } from "../../../../vendor/jose/dist/node/esm/util/errors.js";

//@ chunk-1hnjmk23.js:1321435-1321519 placement
/**
 * CRI JWT 的 JOSE typ 值 "cri+jwt"。
 */
var HTTPS_API_ANTHROPIC_COM_API_OAUTH_CRI = "https://api.anthropic.com/api/oauth/cri";
var OAUTH_CRI_JWKS_URL = `${HTTPS_API_ANTHROPIC_COM_API_OAUTH_CRI}/jwks.json`;
var CRI_JWT_TYP = "cri+jwt";
//@ chunk-1hnjmk23.js:1321519-1321577 placement
/**
 * 不解签地判断 JWT 头的 typ 是否为 cri+jwt（解析失败视为否）。
 */
function isCriJwtTyp(token) {
  try {
    return decodeProtectedHeader(token).typ === CRI_JWT_TYP;
  } catch {
    return false;
  }
}
//@ chunk-1hnjmk23.js:1321577-1321636 placement
/**
 * JWKS 拉取失败后的负缓存时长（1 分钟）。
 */
var ES256 = "ES256";
var JWT_CLOCK_TOLERANCE_SEC = 60;
var JWKS_FETCH_TIMEOUT_MS = 1e4;
var JWKS_MAX_CACHE_MS = 21600000;
var JWKS_DEFAULT_TTL_MS = 600000;
var JWKS_NEGATIVE_CACHE_MS = 60000;
//@ chunk-1hnjmk23.js:1321636-1325998 placement
/**
 * 网关 CRI JWT 校验器：组织白名单、audience、issuer、JWKS 地址校验与缓存。
 */
function createCriJwtVerifier(config) {
  let allowedOrgs = new Set(config.orgAllowlist.map((org) => org.toLowerCase()));
  let audience = [...config.audience];
  let issuer = config.issuer ?? HTTPS_API_ANTHROPIC_COM_API_OAUTH_CRI;
  let jwksUrl = config.jwksUrl ?? `${issuer}/jwks.json`;
  if (config.jwksUrl !== undefined) {
    if (!isLoopbackUrl(jwksUrl))
      throw Error(
        "cri.jwks_url must be a loopback URL \u2014 it exists for tests against local mocks, and honoring an external URL here would let it substitute the admission authority (its keys would mint CRI principals). Remove it.",
      );
    if (!isAllowedLoopbackUrl(jwksUrl))
      throw Error(
        "cri.jwks_url targets loopback but CLAUDE_GATEWAY_ALLOW_LOOPBACK is not set \u2014 safeFetch would block every JWKS fetch at runtime. Set the escape (tests) or remove the override.",
      );
    gatewayLog(
      "warn",
      `cri.jwks_url is set \u2014 CRI JWT verification keys are NOT coming from ${issuer}/jwks.json. This override exists for tests; never set it in production.`,
    );
  } else if (issuer !== HTTPS_API_ANTHROPIC_COM_API_OAUTH_CRI) {
    if (!isLoopbackUrl(jwksUrl)) {
      if (!jwksUrl.startsWith("https://"))
        throw Error(
          "cri.issuer must be https:// (http:// allowed for loopback only) \u2014 the verification JWKS derives from it, and keys fetched over plaintext invite substitution.",
        );
      if (!isAllowedOutboundUrl(jwksUrl))
        throw Error(
          "cri.issuer must not target a cloud metadata endpoint \u2014 the verification JWKS derives from it.",
        );
    } else if (!isAllowedLoopbackUrl(jwksUrl))
      throw Error(
        "cri.issuer targets loopback but CLAUDE_GATEWAY_ALLOW_LOOPBACK is not set \u2014 safeFetch would block every derived-JWKS fetch at runtime. Set the escape (tests) or remove the issuer override.",
      );
  }
  let keyCache = new Map();
  let lastFetchMs = 0;
  let cacheExpiresAt = 0;
  let lastAttemptMs = 0;
  let inflightFetch = null;
  async function fetchJwks() {
    let response;
    try {
      response = await fetchWithTimeout(
        jwksUrl,
        {
          method: "GET",
        },
        JWKS_FETCH_TIMEOUT_MS,
        "JWKS fetch timed out",
      );
    } catch (error) {
      gatewayLog("warn", `cri jwks unreachable: ${errorMessage(error)}`);
      return false;
    }
    if (!response.ok) {
      response.body?.cancel().catch(() => {});
      gatewayLog("warn", `cri jwks fetch returned ${response.status}`);
      return false;
    }
    let body;
    try {
      body = await response.json();
    } catch {
      gatewayLog("warn", "cri jwks fetch returned unparseable JSON");
      return false;
    }
    if (typeof body !== "object" || body === null || !Array.isArray(body.keys)) {
      gatewayLog("warn", "cri jwks fetch returned a non-JWKS body");
      return false;
    }
    let importedKeys = new Map();
    for (let key of body.keys) {
      if (typeof key !== "object" || key === null) continue;
      let jwk = key;
      if (jwk.kty !== "EC" || jwk.crv !== "P-256" || typeof jwk.kid !== "string" || jwk.kid.length === 0)
        continue;
      try {
        let importedKey = await importJWK(
          {
            ...jwk,
            alg: ES256,
          },
          ES256,
        );
        importedKeys.set(jwk.kid, importedKey);
      } catch (error) {
        gatewayLog("warn", `cri jwks key ${jwk.kid} failed to import: ${errorMessage(error)}`);
      }
    }
    if (importedKeys.size === 0) {
      gatewayLog("warn", "cri jwks fetch yielded no usable ES256 keys \u2014 keeping previous set");
      return false;
    }
    keyCache = importedKeys;
    lastFetchMs = Date.now();
    cacheExpiresAt = lastFetchMs + ttlFromResponse(response);
    return true;
  }
  function ttlFromResponse(response) {
    let cacheControl = response.headers.get("cache-control") ?? "";
    let match = /(?:^|[,\s])max-age=(\d+)/i.exec(cacheControl);
    if (!match) return JWKS_DEFAULT_TTL_MS;
    return Math.min(Number(match[1]) * 1000, JWKS_MAX_CACHE_MS / 2);
  }
  function ensureFresh(force = false) {
    if (inflightFetch) return inflightFetch;
    let now = Date.now();
    if (!force && now - lastAttemptMs < JWKS_NEGATIVE_CACHE_MS) return Promise.resolve(false);
    lastAttemptMs = now;
    inflightFetch = fetchJwks().finally(() => {
      inflightFetch = null;
    });
    return inflightFetch;
  }
  async function currentKeys() {
    let now = Date.now();
    if (keyCache.size > 0 && now < cacheExpiresAt) return keyCache;
    if (keyCache.size > 0 && now - lastFetchMs <= JWKS_MAX_CACHE_MS) {
      ensureFresh().catch(() => {});
      return keyCache;
    }
    await ensureFresh();
    if (keyCache.size === 0) return null;
    if (Date.now() - lastFetchMs > JWKS_MAX_CACHE_MS) return null;
    return keyCache;
  }
  return {
    async prime() {
      if (!(await ensureFresh(true)))
        gatewayLog(
          "warn",
          "cri jwks prefetch failed \u2014 the CRI wall will answer 503 until the first successful fetch (non-CRI traffic is unaffected)",
        );
    },
    async authenticate(token, requestId, clientIp, path) {
      let deny = (reason, org) => {
        gatewayJsonLog("auth.denied", {
          request_id: requestId,
          reason: `cri_${reason}`,
          path,
          client_ip: clientIp,
          ...(org !== undefined && {
            org,
          }),
        });
        return {
          ok: false,
          status: 401,
          reason,
          ...(org !== undefined && {
            org,
          }),
        };
      };
      let keys = await currentKeys();
      if (keys === null) {
        gatewayJsonLog("auth.denied", {
          request_id: requestId,
          reason: "cri_jwks_unavailable",
          path,
          client_ip: clientIp,
        });
        return {
          ok: false,
          status: 503,
          reason: "jwks_unavailable",
        };
      }
      let header;
      try {
        header = decodeProtectedHeader(token);
      } catch {
        return deny("invalid_token");
      }
      if (header.typ !== CRI_JWT_TYP || header.alg !== ES256) return deny("invalid_token");
      if (typeof header.kid !== "string" || header.kid.length === 0) return deny("invalid_token");
      let key = keys.get(header.kid);
      if (key === undefined) {
        await ensureFresh();
        key = keyCache.get(header.kid);
        if (key === undefined) return deny("invalid_token");
      }
      let payload;
      try {
        payload = (
          await jwtVerify(token, key, {
            algorithms: [ES256],
            issuer,
            audience,
            typ: CRI_JWT_TYP,
            clockTolerance: JWT_CLOCK_TOLERANCE_SEC,
            requiredClaims: ["exp", "iat", "aud", "sub", "org", "scope"],
          })
        ).payload;
      } catch (error) {
        if (
          error instanceof JWTClaimValidationFailed &&
          error.claim === "aud" &&
          error.reason === "check_failed"
        )
          return deny("audience_mismatch");
        return deny("invalid_token");
      }
      if (payload.scope !== "inference") return deny("scope_missing");
      let org = typeof payload.org === "string" ? payload.org.toLowerCase() : null;
      if (org === null || org.length === 0) return deny("invalid_token");
      if (!allowedOrgs.has(org)) return deny("org_not_allowed", org);
      if (typeof payload.sub !== "string" || payload.sub.length === 0) return deny("invalid_token");
      let sub =
        typeof payload.act === "object" && payload.act !== null && typeof payload.act.sub === "string"
          ? payload.act.sub
          : undefined;
      return {
        ok: true,
        claims: {
          sub: payload.sub,
          cri: true,
          org,
          ...(sub !== undefined && {
            act: {
              sub,
            },
          }),
          ...(typeof payload.exp === "number" && {
            exp: payload.exp,
          }),
          ...(typeof payload.iat === "number" && {
            iat: payload.iat,
          }),
        },
      };
    },
  };
}
export { createCriJwtVerifier, isCriJwtTyp };
