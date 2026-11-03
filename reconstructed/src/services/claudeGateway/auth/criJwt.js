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
import { isLoopbackUrl, Du, isAllowedOutboundUrl } from "../ssrfGuard.js";
import { gatewayLog, gatewayJsonLog } from "../../gateway/gatewayBanner.js";
import { fetchWithTimeout } from "../network.js";
import { errorMessage } from "../../../utils/errors.js";
import { importJWK } from "../../../../vendor/jose/dist/webapi/key/import.js";
import { jwtVerify } from "../../../../vendor/jose/dist/node/esm/jwt/verify.js";
import { z5 } from "../../../../vendor/jose/dist/node/esm/util/errors.js";

//@ chunk-1ny7cxrt.js:1320472-1320556 placement
var HTTPS_API_ANTHROPIC_COM_API_OAUTH_CRI = "https://api.anthropic.com/api/oauth/cri",
  Zwe = `${HTTPS_API_ANTHROPIC_COM_API_OAUTH_CRI}/jwks.json`,
  t_ = "cri+jwt";
//@ chunk-1ny7cxrt.js:1320556-1320614 placement
function Lk(e) {
  try {
    return decodeProtectedHeader(e).typ === t_;
  } catch {
    return !1;
  }
}
//@ chunk-1ny7cxrt.js:1320614-1320673 placement
var ES256 = "ES256",
  oH = 60,
  sH = 1e4,
  Qy = 21600000,
  aH = 600000,
  lH = 60000;
/**
 * 网关 CRI JWT 校验器：组织白名单、audience、issuer、JWKS 地址校验与缓存。
 */
//@ chunk-1ny7cxrt.js:1320673-1325035 placement
function createCriJwtVerifier(e) {
  let t = new Set(e.orgAllowlist.map((b) => b.toLowerCase())),
    n = [...e.audience],
    o = e.issuer ?? HTTPS_API_ANTHROPIC_COM_API_OAUTH_CRI,
    r = e.jwksUrl ?? `${o}/jwks.json`;
  if (e.jwksUrl !== void 0) {
    if (!isLoopbackUrl(r))
      throw Error(
        "cri.jwks_url must be a loopback URL \u2014 it exists for tests against local mocks, and honoring an external URL here would let it substitute the admission authority (its keys would mint CRI principals). Remove it.",
      );
    if (!Du(r))
      throw Error(
        "cri.jwks_url targets loopback but CLAUDE_GATEWAY_ALLOW_LOOPBACK is not set \u2014 safeFetch would block every JWKS fetch at runtime. Set the escape (tests) or remove the override.",
      );
    gatewayLog(
      "warn",
      `cri.jwks_url is set \u2014 CRI JWT verification keys are NOT coming from ${o}/jwks.json. This override exists for tests; never set it in production.`,
    );
  } else if (o !== HTTPS_API_ANTHROPIC_COM_API_OAUTH_CRI) {
    if (!isLoopbackUrl(r)) {
      if (!r.startsWith("https://"))
        throw Error(
          "cri.issuer must be https:// (http:// allowed for loopback only) \u2014 the verification JWKS derives from it, and keys fetched over plaintext invite substitution.",
        );
      if (!isAllowedOutboundUrl(r))
        throw Error(
          "cri.issuer must not target a cloud metadata endpoint \u2014 the verification JWKS derives from it.",
        );
    } else if (!Du(r))
      throw Error(
        "cri.issuer targets loopback but CLAUDE_GATEWAY_ALLOW_LOOPBACK is not set \u2014 safeFetch would block every derived-JWKS fetch at runtime. Set the escape (tests) or remove the issuer override.",
      );
  }
  let s = new Map(),
    a = 0,
    l = 0,
    c = 0,
    u = null;
  async function f() {
    let b;
    try {
      b = await fetchWithTimeout(r, { method: "GET" }, sH, "JWKS fetch timed out");
    } catch (error) {
      return (gatewayLog("warn", `cri jwks unreachable: ${errorMessage(error)}`), !1);
    }
    if (!b.ok)
      return (
        b.body?.cancel().catch(() => {}),
        gatewayLog("warn", `cri jwks fetch returned ${b.status}`),
        !1
      );
    let w;
    try {
      w = await b.json();
    } catch {
      return (gatewayLog("warn", "cri jwks fetch returned unparseable JSON"), !1);
    }
    if (typeof w !== "object" || w === null || !Array.isArray(w.keys))
      return (gatewayLog("warn", "cri jwks fetch returned a non-JWKS body"), !1);
    let S = new Map();
    for (let key of w.keys) {
      if (typeof key !== "object" || key === null) continue;
      let M = key;
      if (M.kty !== "EC" || M.crv !== "P-256" || typeof M.kid !== "string" || M.kid.length === 0) continue;
      try {
        let N = await importJWK({ ...M, alg: ES256 }, ES256);
        S.set(M.kid, N);
      } catch (error) {
        gatewayLog("warn", `cri jwks key ${M.kid} failed to import: ${errorMessage(error)}`);
      }
    }
    if (S.size === 0)
      return (
        gatewayLog("warn", "cri jwks fetch yielded no usable ES256 keys \u2014 keeping previous set"),
        !1
      );
    return ((s = S), (a = Date.now()), (l = a + h(b)), !0);
  }
  function h(b) {
    let w = b.headers.get("cache-control") ?? "",
      match = /(?:^|[,\s])max-age=(\d+)/i.exec(w);
    if (!match) return aH;
    return Math.min(Number(match[1]) * 1000, Qy / 2);
  }
  function m(b = !1) {
    if (u) return u;
    let now = Date.now();
    if (!b && now - c < lH) return Promise.resolve(!1);
    return (
      (c = now),
      (u = f().finally(() => {
        u = null;
      })),
      u
    );
  }
  async function y() {
    let now = Date.now();
    if (s.size > 0 && now < l) return s;
    if (s.size > 0 && now - a <= Qy) return (m().catch(() => {}), s);
    if ((await m(), s.size === 0)) return null;
    if (Date.now() - a > Qy) return null;
    return s;
  }
  return {
    async prime() {
      if (!(await m(!0)))
        gatewayLog(
          "warn",
          "cri jwks prefetch failed \u2014 the CRI wall will answer 503 until the first successful fetch (non-CRI traffic is unaffected)",
        );
    },
    async authenticate(b, w, S, j) {
      let M = (Ne, be) => (
          gatewayJsonLog("auth.denied", {
            request_id: w,
            reason: `cri_${Ne}`,
            path: j,
            client_ip: S,
            ...(be !== void 0 && { org: be }),
          }),
          { ok: !1, status: 401, reason: Ne, ...(be !== void 0 && { org: be }) }
        ),
        N = await y();
      if (N === null)
        return (
          gatewayJsonLog("auth.denied", {
            request_id: w,
            reason: "cri_jwks_unavailable",
            path: j,
            client_ip: S,
          }),
          { ok: !1, status: 503, reason: "jwks_unavailable" }
        );
      let Z;
      try {
        Z = decodeProtectedHeader(b);
      } catch {
        return M("invalid_token");
      }
      if (Z.typ !== t_ || Z.alg !== ES256) return M("invalid_token");
      if (typeof Z.kid !== "string" || Z.kid.length === 0) return M("invalid_token");
      let F = N.get(Z.kid);
      if (F === void 0) {
        if ((await m(), (F = s.get(Z.kid)), F === void 0)) return M("invalid_token");
      }
      let X;
      try {
        X = (
          await jwtVerify(b, F, {
            algorithms: [ES256],
            issuer: o,
            audience: n,
            typ: t_,
            clockTolerance: oH,
            requiredClaims: ["exp", "iat", "aud", "sub", "org", "scope"],
          })
        ).payload;
      } catch (error) {
        if (error instanceof z5 && error.claim === "aud" && error.reason === "check_failed")
          return M("audience_mismatch");
        return M("invalid_token");
      }
      if (X.scope !== "inference") return M("scope_missing");
      let he = typeof X.org === "string" ? X.org.toLowerCase() : null;
      if (he === null || he.length === 0) return M("invalid_token");
      if (!t.has(he)) return M("org_not_allowed", he);
      if (typeof X.sub !== "string" || X.sub.length === 0) return M("invalid_token");
      let Me =
        typeof X.act === "object" && X.act !== null && typeof X.act.sub === "string" ? X.act.sub : void 0;
      return {
        ok: !0,
        claims: {
          sub: X.sub,
          cri: !0,
          org: he,
          ...(Me !== void 0 && { act: { sub: Me } }),
          ...(typeof X.exp === "number" && { exp: X.exp }),
          ...(typeof X.iat === "number" && { iat: X.iat }),
        },
      };
    },
  };
}

export { createCriJwtVerifier, Lk };
