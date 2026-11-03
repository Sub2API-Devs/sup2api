/**
 * services/claudeGateway/auth/criJwt.ts
 *
 * 2.1.316 新增：网关 CRI JWT 校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (4)
 * attribution: placement 4
 */
import { decodeProtectedHeader } from "../../../../vendor/jose/dist/node/esm/util/decode_protected_header.js";
import { isLoopbackUrl, isAllowedLoopbackUrl, isAllowedOutboundUrl } from "../ssrfGuard.js";
import { gatewayLog, gatewayJsonLog } from "../../gateway/gatewayBanner.js";
import { fetchWithTimeout } from "../network.js";
import { errorMessage } from "../../../utils/errors.js";
import { importJWK } from "../../../../vendor/jose/dist/webapi/key/import.js";
import { jwtVerify } from "../../../../vendor/jose/dist/node/esm/jwt/verify.js";
import { JWTClaimValidationFailed } from "../../../../vendor/jose/dist/node/esm/util/errors.js";

//@ chunk-1ny7cxrt.js:1320472-1320556 placement
/**
 * CRI JWT 的 JOSE typ 值 "cri+jwt"。
 */
var HTTPS_API_ANTHROPIC_COM_API_OAUTH_CRI = "https://api.anthropic.com/api/oauth/cri";
var OAUTH_CRI_JWKS_URL = `${HTTPS_API_ANTHROPIC_COM_API_OAUTH_CRI}/jwks.json`;
var CRI_JWT_TYP = "cri+jwt";
//@ chunk-1ny7cxrt.js:1320556-1320614 placement
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
//@ chunk-1ny7cxrt.js:1320614-1320673 placement
/**
 * JWKS 拉取失败后的负缓存时长（1 分钟）。
 */
var ES256 = "ES256";
var JWT_CLOCK_TOLERANCE_SEC = 60;
var JWKS_FETCH_TIMEOUT_MS = 1e4;
var JWKS_MAX_CACHE_MS = 21600000;
var JWKS_DEFAULT_TTL_MS = 600000;
var JWKS_NEGATIVE_CACHE_MS = 60000;
//@ chunk-1ny7cxrt.js:1320673-1325035 placement
/**
 * 网关 CRI JWT 校验器：组织白名单、audience、issuer、JWKS 地址校验与缓存。
 */
function createCriJwtVerifier(e) {
  let t = new Set(e.orgAllowlist.map((b) => b.toLowerCase()));
  let audience = [...e.audience];
  let issuer = e.issuer ?? HTTPS_API_ANTHROPIC_COM_API_OAUTH_CRI;
  let r = e.jwksUrl ?? `${issuer}/jwks.json`;
  if (e.jwksUrl !== undefined) {
    if (!isLoopbackUrl(r))
      throw Error(
        "cri.jwks_url must be a loopback URL \u2014 it exists for tests against local mocks, and honoring an external URL here would let it substitute the admission authority (its keys would mint CRI principals). Remove it.",
      );
    if (!isAllowedLoopbackUrl(r))
      throw Error(
        "cri.jwks_url targets loopback but CLAUDE_GATEWAY_ALLOW_LOOPBACK is not set \u2014 safeFetch would block every JWKS fetch at runtime. Set the escape (tests) or remove the override.",
      );
    gatewayLog(
      "warn",
      `cri.jwks_url is set \u2014 CRI JWT verification keys are NOT coming from ${issuer}/jwks.json. This override exists for tests; never set it in production.`,
    );
  } else if (issuer !== HTTPS_API_ANTHROPIC_COM_API_OAUTH_CRI) {
    if (!isLoopbackUrl(r)) {
      if (!r.startsWith("https://"))
        throw Error(
          "cri.issuer must be https:// (http:// allowed for loopback only) \u2014 the verification JWKS derives from it, and keys fetched over plaintext invite substitution.",
        );
      if (!isAllowedOutboundUrl(r))
        throw Error(
          "cri.issuer must not target a cloud metadata endpoint \u2014 the verification JWKS derives from it.",
        );
    } else if (!isAllowedLoopbackUrl(r))
      throw Error(
        "cri.issuer targets loopback but CLAUDE_GATEWAY_ALLOW_LOOPBACK is not set \u2014 safeFetch would block every derived-JWKS fetch at runtime. Set the escape (tests) or remove the issuer override.",
      );
  }
  let s = new Map();
  let a = 0;
  let l = 0;
  let c = 0;
  let u = null;
  async function f() {
    let b;
    try {
      b = await fetchWithTimeout(
        r,
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
    if (!b.ok) {
      b.body?.cancel().catch(() => {});
      gatewayLog("warn", `cri jwks fetch returned ${b.status}`);
      return false;
    }
    let w;
    try {
      w = await b.json();
    } catch {
      gatewayLog("warn", "cri jwks fetch returned unparseable JSON");
      return false;
    }
    if (typeof w !== "object" || w === null || !Array.isArray(w.keys)) {
      gatewayLog("warn", "cri jwks fetch returned a non-JWKS body");
      return false;
    }
    let S = new Map();
    for (let key of w.keys) {
      if (typeof key !== "object" || key === null) continue;
      let M = key;
      if (M.kty !== "EC" || M.crv !== "P-256" || typeof M.kid !== "string" || M.kid.length === 0) continue;
      try {
        let N = await importJWK(
          {
            ...M,
            alg: ES256,
          },
          ES256,
        );
        S.set(M.kid, N);
      } catch (error) {
        gatewayLog("warn", `cri jwks key ${M.kid} failed to import: ${errorMessage(error)}`);
      }
    }
    if (S.size === 0) {
      gatewayLog("warn", "cri jwks fetch yielded no usable ES256 keys \u2014 keeping previous set");
      return false;
    }
    s = S;
    a = Date.now();
    l = a + h(b);
    return true;
  }
  function h(b) {
    let w = b.headers.get("cache-control") ?? "";
    let match = /(?:^|[,\s])max-age=(\d+)/i.exec(w);
    if (!match) return JWKS_DEFAULT_TTL_MS;
    return Math.min(Number(match[1]) * 1000, JWKS_MAX_CACHE_MS / 2);
  }
  function m(b = false) {
    if (u) return u;
    let now = Date.now();
    if (!b && now - c < JWKS_NEGATIVE_CACHE_MS) return Promise.resolve(false);
    c = now;
    u = f().finally(() => {
      u = null;
    });
    return u;
  }
  async function y() {
    let now = Date.now();
    if (s.size > 0 && now < l) return s;
    if (s.size > 0 && now - a <= JWKS_MAX_CACHE_MS) {
      m().catch(() => {});
      return s;
    }
    await m();
    if (s.size === 0) return null;
    if (Date.now() - a > JWKS_MAX_CACHE_MS) return null;
    return s;
  }
  return {
    async prime() {
      if (!(await m(true)))
        gatewayLog(
          "warn",
          "cri jwks prefetch failed \u2014 the CRI wall will answer 503 until the first successful fetch (non-CRI traffic is unaffected)",
        );
    },
    async authenticate(token, requestId, clientIp, path) {
      let M = (Ne, be) => {
        gatewayJsonLog("auth.denied", {
          request_id: requestId,
          reason: `cri_${Ne}`,
          path,
          client_ip: clientIp,
          ...(be !== undefined && {
            org: be,
          }),
        });
        return {
          ok: false,
          status: 401,
          reason: Ne,
          ...(be !== undefined && {
            org: be,
          }),
        };
      };
      let N = await y();
      if (N === null) {
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
      let Z;
      try {
        Z = decodeProtectedHeader(token);
      } catch {
        return M("invalid_token");
      }
      if (Z.typ !== CRI_JWT_TYP || Z.alg !== ES256) return M("invalid_token");
      if (typeof Z.kid !== "string" || Z.kid.length === 0) return M("invalid_token");
      let key = N.get(Z.kid);
      if (key === undefined) {
        await m();
        key = s.get(Z.kid);
        if (key === undefined) return M("invalid_token");
      }
      let X;
      try {
        X = (
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
          return M("audience_mismatch");
        return M("invalid_token");
      }
      if (X.scope !== "inference") return M("scope_missing");
      let he = typeof X.org === "string" ? X.org.toLowerCase() : null;
      if (he === null || he.length === 0) return M("invalid_token");
      if (!t.has(he)) return M("org_not_allowed", he);
      if (typeof X.sub !== "string" || X.sub.length === 0) return M("invalid_token");
      let sub =
        typeof X.act === "object" && X.act !== null && typeof X.act.sub === "string" ? X.act.sub : undefined;
      return {
        ok: true,
        claims: {
          sub: X.sub,
          cri: true,
          org: he,
          ...(sub !== undefined && {
            act: {
              sub,
            },
          }),
          ...(typeof X.exp === "number" && {
            exp: X.exp,
          }),
          ...(typeof X.iat === "number" && {
            iat: X.iat,
          }),
        },
      };
    },
  };
}
export { createCriJwtVerifier, isCriJwtTyp };
