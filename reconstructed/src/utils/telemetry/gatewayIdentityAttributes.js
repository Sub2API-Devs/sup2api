/**
 * utils/telemetry/gatewayIdentityAttributes.ts
 *
 * 2.1.316 新增：网关身份遥测属性
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p52gp8zk.js (8)
 * attribution: placement 8
 */
import { Re } from "../../../runtime/bun-runtime.js";
import { require_api } from "../../../vendor/@opentelemetry/api/build/src/index.js";
import { require_core } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2, create_15 } from "../../../vendor/zod/lib/index.mjs";
import { jsonParse } from "../slowOperations.js";
import { isGatewayAuthPinned, getGatewayAuth, getRootSession } from "../../bootstrap/state.js";
import { HostScoped } from "../hostScoped.js";
import { isEnvTruthy } from "../envUtils.js";

//@ chunk-p52gp8zk.js:1228-1259 placement
var otelApi = Re(require_api(), 1);
var promClient_2 = Re(require_core(), 1);
//@ chunk-p52gp8zk.js:1259-1404 placement
var GatewayJwtClaimsSchema = DoctorLazy(() =>
  create({
    sub: create_2().optional().catch(undefined),
    email: create_2().optional().catch(undefined),
    groups: create_15(create_2()).optional().catch(undefined),
  }).passthrough(),
);
//@ chunk-p52gp8zk.js:1404-1619 placement
function decodeGatewayJwtClaims(e) {
  let index = e.indexOf(".");
  let index_2 = e.indexOf(".", index + 1);
  if (index < 0 || index_2 < 0) return null;
  try {
    let r = GatewayJwtClaimsSchema().safeParse(
      jsonParse(Buffer.from(e.slice(index + 1, index_2), "base64url").toString("utf8")),
    );
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
//@ chunk-p52gp8zk.js:1619-1677 placement
function gatewayJwtSubject(e) {
  return isGatewayAuthPinned(e) ? decodeGatewayJwtClaims(e.jwt)?.sub || undefined : undefined;
}
//@ chunk-p52gp8zk.js:1677-1738 placement
var D = Object.freeze({});
var gatewayIdentityStateByHost = new HostScoped(() => ({
  jwt: undefined,
  attrs: D,
}));
//@ chunk-p52gp8zk.js:1738-2099 placement
function gatewayIdentityAttributes() {
  let gatewayAuth = getGatewayAuth();
  let jwt = isGatewayAuthPinned(gatewayAuth) ? gatewayAuth.jwt : undefined;
  let o = gatewayIdentityStateByHost.of(getRootSession().host);
  if (jwt === o.jwt) return o.attrs;
  o.jwt = jwt;
  if (!jwt) return (o.attrs = D);
  let r = decodeGatewayJwtClaims(jwt);
  if (!r) return (o.attrs = D);
  let s = {
    "identity.source": "gateway-oidc",
  };
  if (r.sub) s["user.id"] = r.sub;
  if (r.email) s["user.email"] = r.email;
  if (r.groups && r.groups.length > 0) s["user.groups"] = r.groups.join(",");
  return (o.attrs = Object.freeze(s));
}
//@ chunk-p52gp8zk.js:2099-2559 placement
/**
 * OTel 指标默认包含项开关表与 VCS 语义属性名、常用托管域名与 7999 端口 SSH 模式。
 */
var OTEL_METRICS_INCLUDE_DEFAULTS = {
  OTEL_METRICS_INCLUDE_SESSION_ID: true,
  OTEL_METRICS_INCLUDE_VERSION: false,
  OTEL_METRICS_INCLUDE_ACCOUNT_UUID: true,
  OTEL_METRICS_INCLUDE_ENTRYPOINT: false,
  OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES: true,
  OTEL_METRICS_INCLUDE_REPOSITORY: false,
};
var VCS_REPOSITORY_URL_FULL = "vcs.repository.url.full";
var VCS_REPOSITORY_NAME = "vcs.repository.name";
var VCS_OWNER_NAME = "vcs.owner.name";
var VCS_PROVIDER_NAME = "vcs.provider.name";
var VCS_REF_HEAD_REVISION = "vcs.ref.head.revision";
var VCS_REF_HEAD_NAME = "vcs.ref.head.name";
var VCS_REF_HEAD_TYPE = "vcs.ref.head.type";
var otelMetricsIncludeDefaults = [
  VCS_REPOSITORY_URL_FULL,
  VCS_OWNER_NAME,
  VCS_REPOSITORY_NAME,
  VCS_PROVIDER_NAME,
];
var GITEA_COM = "gitea.com";
var VCS_ATTRIBUTE_NAMES = /^ssh:\/\/[^/?#]*:7999(?=[/?#]|$)/i;
//@ chunk-p52gp8zk.js:2559-2638 placement
function isOtelMetricsAttributeEnabled(e) {
  let n = OTEL_METRICS_INCLUDE_DEFAULTS[e];
  let o = process.env[e];
  if (o === undefined) return n;
  return isEnvTruthy(o);
}
export {
  gatewayJwtSubject,
  gatewayIdentityAttributes,
  promClient_2,
  otelApi,
  isOtelMetricsAttributeEnabled,
  VCS_REPOSITORY_URL_FULL,
  otelMetricsIncludeDefaults,
  GITEA_COM,
  VCS_ATTRIBUTE_NAMES,
  VCS_OWNER_NAME,
  VCS_REPOSITORY_NAME,
  VCS_PROVIDER_NAME,
  VCS_REF_HEAD_REVISION,
  VCS_REF_HEAD_NAME,
  VCS_REF_HEAD_TYPE,
};
