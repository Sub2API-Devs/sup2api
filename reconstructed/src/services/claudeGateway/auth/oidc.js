/**
 * services/claudeGateway/auth/oidc.ts
 *
 * 2.1.316 新增：网关 OIDC/设备流登录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (8)
 * attribution: placement 8
 */
import {
  createPrivateKey,
  createPrivateKey as createPrivateKey_2,
  X509Certificate,
  X509Certificate as X509Certificate_2,
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  randomUUID,
  randomUUID as randomUUID_2,
} from "crypto";
import { isAllowedOutboundUrl, guardedLookup } from "../ssrfGuard.js";
import { withoutBlockedOrUnanchoredCerts } from "../../../utils/caCerts.js";
import { gatewayLog } from "../../gateway/gatewayBanner.js";
import { getUsableProxyUrl, shouldBypassProxy } from "../../../utils/proxy.js";
import { Rl } from "../network.js";
import { getWebSocketTLSOptions_2 } from "../../../utils/mtls.js";
import { Issuer, custom } from "./tokens.js";
import { SignJWT } from "../../../../vendor/jose/dist/webapi/jwt/sign.js";

/**
 * OIDC discovery 返回的 jwks/token/userinfo 端点被 SSRF 规则拦截时抛错。
 */
//@ chunk-1ny7cxrt.js:1325607-1325761 placement
function assertAllowedOidcEndpoints(e) {
  for (let t of [e.jwks_uri, e.token_endpoint, e.userinfo_endpoint])
    if (t && !isAllowedOutboundUrl(t)) throw Error(`OIDC discovery returned a blocked endpoint: ${t}`);
}
/**
 * 构建网关 OIDC 客户端：过滤自定义 CA、决定 IdP 请求是否走代理、discovery 并校验端点、按支持选择 token 认证方式与时钟偏差。
 */
//@ chunk-1ny7cxrt.js:1325761-1328131 placement
async function createOidcClient(e) {
  let caCertPem = e.ca_cert_pem && withoutBlockedOrUnanchoredCerts(e.ca_cert_pem, "oidc.ca_cert_pem");
  if (e.ca_cert_pem && !caCertPem)
    throw Error(
      "oidc.ca_cert_pem has no usable certificate once those on the CLI's deny list are removed, so the gateway can't verify the identity provider. Set oidc.ca_cert_pem to the identity provider's intermediate certificates and the self-signed certificate of the root named as their issuer, with no cross-signed certificates. If oidc.ca_cert_pem already holds only those, the identity provider needs a certificate from another CA",
    );
  if (caCertPem !== e.ca_cert_pem)
    gatewayLog(
      "warn",
      "oidc.ca_cert_pem: ignored one or more certificates on the CLI's deny list. Set oidc.ca_cert_pem to the identity provider's intermediate certificates and the self-signed certificate of the root named as their issuer, with no cross-signed certificates. If oidc.ca_cert_pem already holds only those, the identity provider needs a certificate from another CA",
    );
  let proxyUrl = getUsableProxyUrl(),
    useProxy = e.use_proxy ?? Rl(),
    r = useProxy ? proxyUrl : void 0;
  if (e.use_proxy && !proxyUrl)
    gatewayLog(
      "warn",
      "oidc.use_proxy is set but no usable HTTPS_PROXY/HTTP_PROXY is set; IdP requests go direct",
    );
  else if (!useProxy && e.use_proxy === void 0 && proxyUrl && !shouldBypassProxy(e.issuer))
    gatewayLog(
      "warn",
      "oidc: a proxy is set (HTTPS_PROXY/HTTP_PROXY) but IdP requests currently go direct; this will follow the proxy by default in a future release \u2014 set oidc.use_proxy: true to adopt now, or false to keep direct and silence this warning",
    );
  let proxyAgent = r ? getWebSocketTLSOptions_2(r, caCertPem) : void 0;
  if (r)
    gatewayLog(
      "info",
      `oidc: IdP requests use proxy ${new URL(r).host}${e.use_proxy ? "; hosts in NO_PROXY go direct" : ""}`,
    );
  let httpOptions = (f, h) => ({
    ...h,
    ...(proxyAgent && !shouldBypassProxy(f.href) ? { agent: proxyAgent } : { lookup: guardedLookup }),
    ...(caCertPem && { ca: caCertPem }),
  });
  Issuer[custom.http_options] = httpOptions;
  let issuer = await Issuer.discover(e.discovery_url ?? e.issuer);
  ((issuer[custom.http_options] = httpOptions), assertAllowedOidcEndpoints(issuer.metadata));
  let token_endpoint_auth_methods_supported = issuer.metadata.token_endpoint_auth_methods_supported,
    u = new issuer.Client(
      {
        client_id: e.client_id,
        client_secret: e.client_secret,
        response_types: ["code"],
        token_endpoint_auth_method:
          e.token_endpoint_auth_method === "private_key_jwt"
            ? "none"
            : (e.token_endpoint_auth_method ??
              (token_endpoint_auth_methods_supported &&
              !token_endpoint_auth_methods_supported.includes("client_secret_post")
                ? "client_secret_basic"
                : "client_secret_post")),
        ...(e.id_token_signed_response_alg && {
          id_token_signed_response_alg: e.id_token_signed_response_alg,
        }),
      },
      void 0,
      e.additional_authorized_parties
        ? { additionalAuthorizedParties: e.additional_authorized_parties }
        : void 0,
    );
  if (((u[custom.http_options] = httpOptions), e.clock_skew_seconds !== void 0))
    u[custom.clock_tolerance] = e.clock_skew_seconds;
  return u;
}
//@ chunk-1ny7cxrt.js:1328131-1328155 placement
var Zk = 3600000,
  Hk = 24 * Zk;
/**
 * private_key_jwt 客户端认证：用证书私钥签发 client_assertion（x5t 指纹，5 分钟有效），并在证书临近过期或无效时周期性警告。
 */
//@ chunk-1ny7cxrt.js:1328155-1329728 placement
function createClientAssertionSigner(e, t, n, o = Date.now) {
  if (!n)
    throw Error(
      "oidc: the IdP discovery document has no token_endpoint, which private_key_jwt needs as the assertion audience",
    );
  let r = createPrivateKey(t.private_key_pem),
    s = new X509Certificate(t.certificate_pem),
    digest = createHash_3("sha1").update(s.raw).digest("base64url"),
    digest_2 = createHash_3("sha256").update(s.raw).digest("base64url");
  gatewayLog(
    "info",
    `oidc: client authentication private_key_jwt; certificate ${(s.subject || "(no subject)").replaceAll(
      `
`,
      ", ",
    )}, SHA-1 thumbprint ${s.fingerprint.replaceAll(":", "")}, expires ${s.validTo}`,
  );
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  function u() {
    let f = o(),
      h = s.validToDate.getTime() - f,
      m = h < 0 || f < s.validFromDate.getTime();
    if (!m && h > 30 * Hk) return;
    let y = f - NEGATIVE_INFINITY;
    if (y >= 0 && y < (m ? Zk : Hk)) return;
    ((NEGATIVE_INFINITY = f),
      gatewayLog(
        "warn",
        m
          ? `oidc: the client_assertion certificate is not valid now (valid ${s.validFrom} to ${s.validTo}); the IdP will refuse sign-ins and refreshes until it is replaced`
          : `oidc: the client_assertion certificate (SHA-1 thumbprint ${s.fingerprint.replaceAll(":", "")}) expires ${s.validTo}; after that the IdP will refuse sign-ins and refreshes. To rotate: add a new certificate at the IdP and keep this one, restart every replica with the new key and certificate in oidc.client_assertion, then remove this one at the IdP`,
      ));
  }
  return (
    u(),
    async () => {
      u();
      let floored = Math.floor(o() / 1000);
      return {
        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: await new SignJWT({})
          .setProtectedHeader({ alg: "RS256", typ: "JWT", x5t: digest, "x5t#S256": digest_2 })
          .setIssuer(e)
          .setSubject(e)
          .setAudience(n)
          .setJti(randomUUID_2())
          .setIssuedAt(floored)
          .setNotBefore(floored)
          .setExpirationTime(floored + 300)
          .sign(r),
      };
    }
  );
}
/**
 * 校验 id_token 的 email 已验证且域名在允许列表中。
 */
//@ chunk-1ny7cxrt.js:1329728-1330199 placement
function assertEmailAllowed(e, t) {
  let email_verified = e.email_verified;
  if (email_verified !== void 0 && email_verified !== !0 && email_verified !== "true")
    throw Error("id_token email is not verified");
  if (!t?.length) return;
  let email = e.email;
  if (typeof email !== "string" || !email.includes("@"))
    throw Error(
      "id_token missing email claim \u2014 configure your IdP to include `email` " +
        "in the id_token, or set oidc.email_claim if it uses a different claim name",
    );
  let lower = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (!t.includes(lower)) throw Error("email domain not allowed");
}
/**
 * 用户不属于任何允许的组时抛错。
 */
//@ chunk-1ny7cxrt.js:1330199-1330337 placement
function assertGroupAllowed(e, t) {
  if (!t?.length) return;
  let n = new Set(t);
  if (!e?.some((o) => n.has(o))) throw Error("user is not a member of an allowed group");
}
/**
 * 读取声明：普通键或 JSON Pointer（/a/b，支持 ~0 ~1 转义）。
 */
//@ chunk-1ny7cxrt.js:1330337-1330534 placement
function readClaim(e, t) {
  if (!t.startsWith("/")) return e[t];
  let n = e;
  for (let o of t.slice(1).split("/")) {
    if (n === null || typeof n !== "object") return;
    let replaced = o.replace(/~1/g, "/").replace(/~0/g, "~");
    n = n[replaced];
  }
  return n;
}
/**
 * 按候选路径依次读取第一个非空声明。
 */
//@ chunk-1ny7cxrt.js:1330534-1330650 placement
function readFirstClaim(e, t) {
  let n = Array.isArray(t) ? t : [t];
  for (let o of n) {
    let r = readClaim(e, o);
    if (r !== void 0 && r !== null) return r;
  }
  return;
}

export {
  readClaim,
  readFirstClaim,
  assertEmailAllowed,
  assertGroupAllowed,
  createOidcClient,
  createClientAssertionSigner,
};
