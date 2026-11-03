/**
 * @azure/identity/dist/esm/msal/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (10)
 * attribution: esm-fingerprint 10
 */
import { z, q } from "../util/logging.js";
import { AuthenticationRequiredError, R } from "../../index.js";
import { Yn, Qo } from "../../../../core-rest-pipeline/dist/esm/util/file.js";
import { AzurePublicCloud, LOGIN_MICROSOFTONLINE_COM, COMMON } from "../constants.js";
import { G } from "../../../../msal-common/dist/logger/Logger.mjs";
import { AbortError } from "../../../../abort-controller/AbortError.js";

//@ chunk-mrx6y2r5.js:286534-286569 esm-fingerprint
var bo = z("IdentityUtils"),
  eC = "1.0";
//@ chunk-mrx6y2r5.js:286569-286852 esm-fingerprint
function Un(e, t, r) {
  let n = (o) => (
    bo.getToken.info(o),
    new AuthenticationRequiredError({ scopes: Array.isArray(e) ? e : [e], getTokenOptions: r, message: o })
  );
  if (!t) throw n("No response");
  if (!t.expiresOn) throw n('Response had no "expiresOn" property.');
  if (!t.accessToken) throw n('Response had no "accessToken" property.');
}
//@ chunk-mrx6y2r5.js:286852-286995 esm-fingerprint
function _c(e) {
  let t = e === null || e === void 0 ? void 0 : e.authorityHost;
  if (!t && Yn) t = process.env.AZURE_AUTHORITY_HOST;
  return t !== null && t !== void 0 ? t : AzurePublicCloud;
}
//@ chunk-mrx6y2r5.js:286995-287118 esm-fingerprint
function Sc(e, t) {
  if (!t) t = AzurePublicCloud;
  if (new RegExp(`${e}/?$`).test(t)) return t;
  if (t.endsWith("/")) return t + e;
  else return `${t}/${e}`;
}
//@ chunk-mrx6y2r5.js:287118-287176 esm-fingerprint
function Kf(e, t, r) {
  if ((e === "adfs" && t) || r) return [t];
  return [];
}
//@ chunk-mrx6y2r5.js:287176-287486 esm-fingerprint
var Is =
  (e, t = Qo ? "Node" : "Browser") =>
  (r, n, o) => {
    if (o) return;
    switch (r) {
      case G.Error:
        e.info(`MSAL ${t} V2 error: ${n}`);
        return;
      case G.Info:
        e.info(`MSAL ${t} V2 info message: ${n}`);
        return;
      case G.Verbose:
        e.info(`MSAL ${t} V2 verbose message: ${n}`);
        return;
      case G.Warning:
        e.info(`MSAL ${t} V2 warning: ${n}`);
        return;
    }
  };
//@ chunk-mrx6y2r5.js:287486-287648 esm-fingerprint
function _s(e) {
  switch (e) {
    case "error":
      return G.Error;
    case "info":
      return G.Info;
    case "verbose":
      return G.Verbose;
    case "warning":
      return G.Warning;
    default:
      return G.Info;
  }
}
//@ chunk-mrx6y2r5.js:287648-288512 esm-fingerprint
function Ur(e, t, r) {
  if (t.name === "AuthError" || t.name === "ClientAuthError" || t.name === "BrowserAuthError") {
    let n = t;
    switch (n.errorCode) {
      case "endpoints_resolution_error":
        return (bo.info(q(e, t.message)), new R(t.message));
      case "device_code_polling_cancelled":
        return new AbortError("The authentication has been aborted by the caller.");
      case "consent_required":
      case "interaction_required":
      case "login_required":
        bo.info(q(e, `Authentication returned errorCode ${n.errorCode}`));
        break;
      default:
        bo.info(q(e, `Failed to acquire token: ${t.message}`));
        break;
    }
  }
  if (
    t.name === "ClientConfigurationError" ||
    t.name === "BrowserConfigurationAuthError" ||
    t.name === "AbortError" ||
    t.name === "AuthenticationError"
  )
    return t;
  if (t.name === "NativeAuthError")
    return (bo.info(q(e, `Error from the native broker: ${t.message} with status code: ${t.statusCode}`)), t);
  return new AuthenticationRequiredError({ scopes: e, getTokenOptions: r, message: t.message });
}
//@ chunk-mrx6y2r5.js:288512-288660 esm-fingerprint
function Vf(e) {
  return {
    localAccountId: e.homeAccountId,
    environment: e.authority,
    username: e.username,
    homeAccountId: e.homeAccountId,
    tenantId: e.tenantId,
  };
}
//@ chunk-mrx6y2r5.js:288660-288839 esm-fingerprint
function jf(e, t) {
  var r;
  return {
    authority: (r = t.environment) !== null && r !== void 0 ? r : LOGIN_MICROSOFTONLINE_COM,
    homeAccountId: t.homeAccountId,
    tenantId: t.tenantId || COMMON,
    username: t.username,
    clientId: e,
    version: eC,
  };
}

export { Sc, _c, Kf, Is, _s, Vf, Ur, Un, jf };
