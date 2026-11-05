/**
 * services/claudeGateway/auth/oidc.ts
 *
 * 2.1.316 新增：网关 OIDC/设备流登录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (8)
 * attribution: placement 8
 */
import { createPrivateKey, X509Certificate, createHash, randomUUID } from "crypto";
import { isAllowedOutboundUrl, guardedLookup } from "../ssrfGuard.js";
import { withoutBlockedOrUnanchoredCerts } from "../../../utils/caCerts.js";
import { gatewayLog } from "../../gateway/gatewayBanner.js";
import { getUsableProxyUrl, shouldBypassProxy } from "../../../utils/proxy.js";
import { isEgressBoundaryActive } from "../network.js";
import { getWebSocketTLSOptions_2 } from "../../../utils/mtls.js";
import { Issuer, custom } from "./tokens.js";
import { SignJWT } from "../../../../vendor/jose/dist/webapi/jwt/sign.js";

//@ chunk-1hnjmk23.js:1326570-1326724 placement
/**
 * OIDC discovery 返回的 jwks/token/userinfo 端点被 SSRF 规则拦截时抛错。
 */
function assertAllowedOidcEndpoints(metadata) {
  for (let endpointUrl of [metadata.jwks_uri, metadata.token_endpoint, metadata.userinfo_endpoint])
    if (endpointUrl && !isAllowedOutboundUrl(endpointUrl))
      throw Error(`OIDC discovery returned a blocked endpoint: ${endpointUrl}`);
}
//@ chunk-1hnjmk23.js:1326724-1329094 placement
/**
 * 构建网关 OIDC 客户端：过滤自定义 CA、决定 IdP 请求是否走代理、discovery 并校验端点、按支持选择 token 认证方式与时钟偏差。
 */
async function createOidcClient(oidc) {
  let caCertPem = oidc.ca_cert_pem && withoutBlockedOrUnanchoredCerts(oidc.ca_cert_pem, "oidc.ca_cert_pem");
  if (oidc.ca_cert_pem && !caCertPem)
    throw Error(
      "oidc.ca_cert_pem has no usable certificate once those on the CLI's deny list are removed, so the gateway can't verify the identity provider. Set oidc.ca_cert_pem to the identity provider's intermediate certificates and the self-signed certificate of the root named as their issuer, with no cross-signed certificates. If oidc.ca_cert_pem already holds only those, the identity provider needs a certificate from another CA",
    );
  if (caCertPem !== oidc.ca_cert_pem)
    gatewayLog(
      "warn",
      "oidc.ca_cert_pem: ignored one or more certificates on the CLI's deny list. Set oidc.ca_cert_pem to the identity provider's intermediate certificates and the self-signed certificate of the root named as their issuer, with no cross-signed certificates. If oidc.ca_cert_pem already holds only those, the identity provider needs a certificate from another CA",
    );
  let proxyUrl = getUsableProxyUrl();
  let useProxy = oidc.use_proxy ?? isEgressBoundaryActive();
  let effectiveProxyUrl = useProxy ? proxyUrl : undefined;
  if (oidc.use_proxy && !proxyUrl)
    gatewayLog(
      "warn",
      "oidc.use_proxy is set but no usable HTTPS_PROXY/HTTP_PROXY is set; IdP requests go direct",
    );
  else if (!useProxy && oidc.use_proxy === undefined && proxyUrl && !shouldBypassProxy(oidc.issuer))
    gatewayLog(
      "warn",
      "oidc: a proxy is set (HTTPS_PROXY/HTTP_PROXY) but IdP requests currently go direct; this will follow the proxy by default in a future release \u2014 set oidc.use_proxy: true to adopt now, or false to keep direct and silence this warning",
    );
  let proxyAgent = effectiveProxyUrl ? getWebSocketTLSOptions_2(effectiveProxyUrl, caCertPem) : undefined;
  if (effectiveProxyUrl)
    gatewayLog(
      "info",
      `oidc: IdP requests use proxy ${new URL(effectiveProxyUrl).host}${oidc.use_proxy ? "; hosts in NO_PROXY go direct" : ""}`,
    );
  let httpOptions = (url, baseOptions) => ({
    ...baseOptions,
    ...(proxyAgent && !shouldBypassProxy(url.href)
      ? {
          agent: proxyAgent,
        }
      : {
          lookup: guardedLookup,
        }),
    ...(caCertPem && {
      ca: caCertPem,
    }),
  });
  Issuer[custom.http_options] = httpOptions;
  let issuer = await Issuer.discover(oidc.discovery_url ?? oidc.issuer);
  issuer[custom.http_options] = httpOptions;
  assertAllowedOidcEndpoints(issuer.metadata);
  let tokenEndpointAuthMethodsSupported = issuer.metadata.token_endpoint_auth_methods_supported;
  let client = new issuer.Client(
    {
      client_id: oidc.client_id,
      client_secret: oidc.client_secret,
      response_types: ["code"],
      token_endpoint_auth_method:
        oidc.token_endpoint_auth_method === "private_key_jwt"
          ? "none"
          : (oidc.token_endpoint_auth_method ??
            (tokenEndpointAuthMethodsSupported &&
            !tokenEndpointAuthMethodsSupported.includes("client_secret_post")
              ? "client_secret_basic"
              : "client_secret_post")),
      ...(oidc.id_token_signed_response_alg && {
        id_token_signed_response_alg: oidc.id_token_signed_response_alg,
      }),
    },
    undefined,
    oidc.additional_authorized_parties
      ? {
          additionalAuthorizedParties: oidc.additional_authorized_parties,
        }
      : undefined,
  );
  client[custom.http_options] = httpOptions;
  if (oidc.clock_skew_seconds !== undefined) client[custom.clock_tolerance] = oidc.clock_skew_seconds;
  return client;
}
//@ chunk-1hnjmk23.js:1329094-1329118 placement
/**
 * 证书临近过期（30 天内）时重复警告的间隔（24 小时）。
 */
var CERT_WARN_REPEAT_MS = 3600000;
var CERT_WARN_INTERVAL_MS = 24 * CERT_WARN_REPEAT_MS;
//@ chunk-1hnjmk23.js:1329118-1330691 placement
/**
 * private_key_jwt 客户端认证：用证书私钥签发 client_assertion（x5t 指纹，5 分钟有效），并在证书临近过期或无效时周期性警告。
 */
function createClientAssertionSigner(clientId, clientAssertion, tokenEndpoint, nowFn = Date.now) {
  if (!tokenEndpoint)
    throw Error(
      "oidc: the IdP discovery document has no token_endpoint, which private_key_jwt needs as the assertion audience",
    );
  let privateKey = createPrivateKey(clientAssertion.private_key_pem);
  let certificate = new X509Certificate(clientAssertion.certificate_pem);
  let x5t = createHash("sha1").update(certificate.raw).digest("base64url");
  let sha256Thumbprint = createHash("sha256").update(certificate.raw).digest("base64url");
  gatewayLog(
    "info",
    `oidc: client authentication private_key_jwt; certificate ${(
      certificate.subject || "(no subject)"
    ).replaceAll(
      `
`,
      ", ",
    )}, SHA-1 thumbprint ${certificate.fingerprint.replaceAll(":", "")}, expires ${certificate.validTo}`,
  );
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  function warnIfCertificateNeedsRotation() {
    let nowMs = nowFn();
    let msUntilExpiry = certificate.validToDate.getTime() - nowMs;
    let notValidNow = msUntilExpiry < 0 || nowMs < certificate.validFromDate.getTime();
    if (!notValidNow && msUntilExpiry > 30 * CERT_WARN_INTERVAL_MS) return;
    let sinceLastWarn = nowMs - NEGATIVE_INFINITY;
    if (sinceLastWarn >= 0 && sinceLastWarn < (notValidNow ? CERT_WARN_REPEAT_MS : CERT_WARN_INTERVAL_MS))
      return;
    NEGATIVE_INFINITY = nowMs;
    gatewayLog(
      "warn",
      notValidNow
        ? `oidc: the client_assertion certificate is not valid now (valid ${certificate.validFrom} to ${certificate.validTo}); the IdP will refuse sign-ins and refreshes until it is replaced`
        : `oidc: the client_assertion certificate (SHA-1 thumbprint ${certificate.fingerprint.replaceAll(":", "")}) expires ${certificate.validTo}; after that the IdP will refuse sign-ins and refreshes. To rotate: add a new certificate at the IdP and keep this one, restart every replica with the new key and certificate in oidc.client_assertion, then remove this one at the IdP`,
    );
  }
  warnIfCertificateNeedsRotation();
  return async () => {
    warnIfCertificateNeedsRotation();
    let floored = Math.floor(nowFn() / 1000);
    return {
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: await new SignJWT({})
        .setProtectedHeader({
          alg: "RS256",
          typ: "JWT",
          x5t,
          "x5t#S256": sha256Thumbprint,
        })
        .setIssuer(clientId)
        .setSubject(clientId)
        .setAudience(tokenEndpoint)
        .setJti(randomUUID())
        .setIssuedAt(floored)
        .setNotBefore(floored)
        .setExpirationTime(floored + 300)
        .sign(privateKey),
    };
  };
}
//@ chunk-1hnjmk23.js:1330691-1331162 placement
/**
 * 校验 id_token 的 email 已验证且域名在允许列表中。
 */
function assertEmailAllowed(claims, allowedEmailDomains) {
  let emailVerified = claims.email_verified;
  if (emailVerified !== undefined && emailVerified !== true && emailVerified !== "true")
    throw Error("id_token email is not verified");
  if (!allowedEmailDomains?.length) return;
  let email = claims.email;
  if (typeof email !== "string" || !email.includes("@"))
    throw Error(
      "id_token missing email claim \u2014 configure your IdP to include `email` " +
        "in the id_token, or set oidc.email_claim if it uses a different claim name",
    );
  let lower = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (!allowedEmailDomains.includes(lower)) throw Error("email domain not allowed");
}
//@ chunk-1hnjmk23.js:1331162-1331300 placement
/**
 * 用户不属于任何允许的组时抛错。
 */
function assertGroupAllowed(groups, allowedGroups) {
  if (!allowedGroups?.length) return;
  let allowedSet = new Set(allowedGroups);
  if (!groups?.some((group) => allowedSet.has(group)))
    throw Error("user is not a member of an allowed group");
}
//@ chunk-1hnjmk23.js:1331300-1331497 placement
/**
 * 读取声明：普通键或 JSON Pointer（/a/b，支持 ~0 ~1 转义）。
 */
function readClaim(claims, path) {
  if (!path.startsWith("/")) return claims[path];
  let current = claims;
  for (let segment of path.slice(1).split("/")) {
    if (current === null || typeof current !== "object") return;
    let replaced = segment.replace(/~1/g, "/").replace(/~0/g, "~");
    current = current[replaced];
  }
  return current;
}
//@ chunk-1hnjmk23.js:1331497-1331613 placement
/**
 * 按候选路径依次读取第一个非空声明。
 */
function readFirstClaim(claims, emailClaim) {
  let names = Array.isArray(emailClaim) ? emailClaim : [emailClaim];
  for (let claimName of names) {
    let claim = readClaim(claims, claimName);
    if (claim !== undefined && claim !== null) return claim;
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
