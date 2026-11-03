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
import { Ol } from "../../../vendor/@opentelemetry/api/build/src/index.js";
import { Qm } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2, create_15 } from "../../../vendor/zod/lib/index.mjs";
import { jsonParse } from "../slowOperations.js";
import { isGatewayAuthPinned, getGatewayAuth, getRootSession } from "../../bootstrap/state.js";
import { HostScoped } from "../hostScoped.js";
import { isEnvTruthy } from "../envUtils.js";

//@ chunk-p52gp8zk.js:1228-1259 placement
var C = Re(Ol(), 1),
  Ae = Re(Qm(), 1);
//@ chunk-p52gp8zk.js:1259-1404 placement
var GatewayJwtClaimsSchema = DoctorLazy(() =>
  create({
    sub: create_2()
      .optional()
      .catch(void 0),
    email: create_2()
      .optional()
      .catch(void 0),
    groups: create_15(create_2())
      .optional()
      .catch(void 0),
  }).passthrough(),
);
//@ chunk-p52gp8zk.js:1404-1619 placement
function decodeGatewayJwtClaims(e) {
  let index = e.indexOf("."),
    index_2 = e.indexOf(".", index + 1);
  if (index < 0 || index_2 < 0) return null;
  try {
    let safeParse = GatewayJwtClaimsSchema().safeParse(
      jsonParse(Buffer.from(e.slice(index + 1, index_2), "base64url").toString("utf8")),
    );
    return safeParse.success ? safeParse.data : null;
  } catch {
    return null;
  }
}
//@ chunk-p52gp8zk.js:1619-1677 placement
function gatewayJwtSubject(e) {
  return isGatewayAuthPinned(e) ? decodeGatewayJwtClaims(e.jwt)?.sub || void 0 : void 0;
}
//@ chunk-p52gp8zk.js:1677-1738 placement
var freeze = Object.freeze({}),
  be = new HostScoped(() => ({ jwt: void 0, attrs: freeze }));
//@ chunk-p52gp8zk.js:1738-2099 placement
function gatewayIdentityAttributes() {
  let e = getGatewayAuth(),
    n = isGatewayAuthPinned(e) ? e.jwt : void 0,
    of = be.of(getRootSession().host);
  if (n === of.jwt) return of.attrs;
  if (((of.jwt = n), !n)) return (of.attrs = freeze);
  let r = decodeGatewayJwtClaims(n);
  if (!r) return (of.attrs = freeze);
  let s = { "identity.source": "gateway-oidc" };
  if (r.sub) s["user.id"] = r.sub;
  if (r.email) s["user.email"] = r.email;
  if (r.groups && r.groups.length > 0) s["user.groups"] = r.groups.join(",");
  return (of.attrs = Object.freeze(s));
}
//@ chunk-p52gp8zk.js:2099-2559 placement
var OTEL_METRICS_INCLUDE_DEFAULTS = {
    OTEL_METRICS_INCLUDE_SESSION_ID: !0,
    OTEL_METRICS_INCLUDE_VERSION: !1,
    OTEL_METRICS_INCLUDE_ACCOUNT_UUID: !0,
    OTEL_METRICS_INCLUDE_ENTRYPOINT: !1,
    OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES: !0,
    OTEL_METRICS_INCLUDE_REPOSITORY: !1,
  },
  VCS_REPOSITORY_URL_FULL = "vcs.repository.url.full",
  VCS_REPOSITORY_NAME = "vcs.repository.name",
  VCS_OWNER_NAME = "vcs.owner.name",
  VCS_PROVIDER_NAME = "vcs.provider.name",
  VCS_REF_HEAD_REVISION = "vcs.ref.head.revision",
  VCS_REF_HEAD_NAME = "vcs.ref.head.name",
  VCS_REF_HEAD_TYPE = "vcs.ref.head.type",
  Pe = [VCS_REPOSITORY_URL_FULL, VCS_OWNER_NAME, VCS_REPOSITORY_NAME, VCS_PROVIDER_NAME],
  GITEA_COM = "gitea.com",
  ke = /^ssh:\/\/[^/?#]*:7999(?=[/?#]|$)/i;
//@ chunk-p52gp8zk.js:2559-2638 placement
function isOtelMetricsAttributeEnabled(e) {
  let n = OTEL_METRICS_INCLUDE_DEFAULTS[e],
    o = process.env[e];
  if (o === void 0) return n;
  return isEnvTruthy(o);
}

export {
  gatewayJwtSubject,
  gatewayIdentityAttributes,
  Ae,
  C,
  isOtelMetricsAttributeEnabled,
  VCS_REPOSITORY_URL_FULL,
  Pe,
  GITEA_COM,
  ke,
  VCS_OWNER_NAME,
  VCS_REPOSITORY_NAME,
  VCS_PROVIDER_NAME,
  VCS_REF_HEAD_REVISION,
  VCS_REF_HEAD_NAME,
  VCS_REF_HEAD_TYPE,
};
