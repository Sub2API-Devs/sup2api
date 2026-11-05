/**
 * utils/telemetry/gatewayIdentityAttributes.ts
 *
 * 2.1.316 新增：网关身份遥测属性
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a0xc6evk.js (7)
 * attribution: placement 7
 */
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_api } from "../../../vendor/@opentelemetry/api/build/src/index.js";
import { require_core } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2, create_15 } from "../../../vendor/zod/lib/index.mjs";
import { jsonParse } from "../slowOperations.js";
import { isGatewayAuthPinned, getGatewayAuth, getRootSession } from "../../bootstrap/state.js";
import { HostScoped } from "../hostScoped.js";
import { OTEL_METRICS_INCLUDE_DEFAULTS } from "./repositoryAttributes.js";
import { isEnvTruthy } from "../envUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a0xc6evk.js:1168-1198 placement
var otelApi; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var promClient_2;
deferInit("chunk-a0xc6evk.js:1168", () => {
  otelApi = __toESM(require_api(), 1);
  promClient_2 = __toESM(require_core(), 1);
});
//@ chunk-a0xc6evk.js:1198-1343 placement
var GatewayJwtClaimsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a0xc6evk.js:1198", () => {
  GatewayJwtClaimsSchema = DoctorLazy(() =>
    create({
      sub: create_2().optional().catch(undefined),
      email: create_2().optional().catch(undefined),
      groups: create_15(create_2()).optional().catch(undefined),
    }).passthrough(),
  );
});
//@ chunk-a0xc6evk.js:1343-1558 placement
function decodeGatewayJwtClaims(jwt) {
  let index = jwt.indexOf(".");
  let index_2 = jwt.indexOf(".", index + 1);
  if (index < 0 || index_2 < 0) return null;
  try {
    let parsed = GatewayJwtClaimsSchema().safeParse(
      jsonParse(Buffer.from(jwt.slice(index + 1, index_2), "base64url").toString("utf8")),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
//@ chunk-a0xc6evk.js:1558-1616 placement
function gatewayJwtSubject(auth) {
  return isGatewayAuthPinned(auth) ? decodeGatewayJwtClaims(auth.jwt)?.sub || undefined : undefined;
}
//@ chunk-a0xc6evk.js:1616-1677 placement
var EMPTY_GATEWAY_ATTRS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var gatewayIdentityStateByHost;
deferInit("chunk-a0xc6evk.js:1616", () => {
  EMPTY_GATEWAY_ATTRS = Object.freeze({});
  gatewayIdentityStateByHost = new HostScoped(() => ({
    jwt: undefined,
    attrs: EMPTY_GATEWAY_ATTRS,
  }));
});
//@ chunk-a0xc6evk.js:1677-2038 placement
function gatewayIdentityAttributes() {
  let gatewayAuth = getGatewayAuth();
  let jwt = isGatewayAuthPinned(gatewayAuth) ? gatewayAuth.jwt : undefined;
  let state = gatewayIdentityStateByHost.of(getRootSession().host);
  if (jwt === state.jwt) return state.attrs;
  state.jwt = jwt;
  if (!jwt) return (state.attrs = EMPTY_GATEWAY_ATTRS);
  let attributes = decodeGatewayJwtClaims(jwt);
  if (!attributes) return (state.attrs = EMPTY_GATEWAY_ATTRS);
  let claims = {
    "identity.source": "gateway-oidc",
  };
  if (attributes.sub) claims["user.id"] = attributes.sub;
  if (attributes.email) claims["user.email"] = attributes.email;
  if (attributes.groups && attributes.groups.length > 0) claims["user.groups"] = attributes.groups.join(",");
  return (state.attrs = Object.freeze(claims));
}
//@ chunk-a0xc6evk.js:3484-3563 placement
function isOtelMetricsAttributeEnabled(name) {
  let defaultValue = OTEL_METRICS_INCLUDE_DEFAULTS[name];
  let rawValue = process.env[name];
  if (rawValue === undefined) return defaultValue;
  return isEnvTruthy(rawValue);
}
export { gatewayIdentityAttributes, promClient_2, otelApi, gatewayJwtSubject, isOtelMetricsAttributeEnabled };
