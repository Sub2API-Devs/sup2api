/**
 * @azure/identity/dist/esm/credentials/managedIdentityCredential/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { z, he, q } from "../../util/logging.js";
import { Qr } from "../../client/identityClient.js";
import { Yf } from "./imdsRetryPolicy.js";
import { wt } from "../../../../../msal-node/lib/msal-node.cjs";
import { _s, Is } from "../../msal/utils.js";
import { Lo } from "../../../../../logger/dist/esm/index.js";
import { R, vc, AuthenticationRequiredError } from "../../../index.js";
import { Ud, eo } from "./utils.js";
import { Z } from "../../util/tracing.js";
import { Wf } from "./imdsMsi.js";

//@ chunk-mrx6y2r5.js:306645-306683 esm-fingerprint
var Fe = z("ManagedIdentityCredential");
//@ chunk-mrx6y2r5.js:306683-311239 esm-fingerprint
class Ln {
  constructor(e, t) {
    var r, n;
    this.msiRetryConfig = { maxRetries: 5, startDelayInMs: 800, intervalIncrement: 2 };
    let o;
    if (typeof e === "string") ((this.clientId = e), (o = t !== null && t !== void 0 ? t : {}));
    else
      ((this.clientId = e === null || e === void 0 ? void 0 : e.clientId),
        (o = e !== null && e !== void 0 ? e : {}));
    ((this.resourceId = o === null || o === void 0 ? void 0 : o.resourceId),
      (this.objectId = o === null || o === void 0 ? void 0 : o.objectId));
    let filtered = [
      { key: "clientId", value: this.clientId },
      { key: "resourceId", value: this.resourceId },
      { key: "objectId", value: this.objectId },
    ].filter((a) => a.value);
    if (filtered.length > 1)
      throw Error(
        `ManagedIdentityCredential: only one of 'clientId', 'resourceId', or 'objectId' can be provided. Received values: ${JSON.stringify({ clientId: this.clientId, resourceId: this.resourceId, objectId: this.objectId })}`,
      );
    if (
      ((o.allowInsecureConnection = !0),
      ((r = o.retryOptions) === null || r === void 0 ? void 0 : r.maxRetries) !== void 0)
    )
      this.msiRetryConfig.maxRetries = o.retryOptions.maxRetries;
    ((this.identityClient = new Qr(
      Object.assign(Object.assign({}, o), {
        additionalPolicies: [{ policy: Yf(this.msiRetryConfig), position: "perCall" }],
      }),
    )),
      (this.managedIdentityApp = new wt({
        managedIdentityIdParams: {
          userAssignedClientId: this.clientId,
          userAssignedResourceId: this.resourceId,
          userAssignedObjectId: this.objectId,
        },
        system: {
          disableInternalRetries: !0,
          networkClient: this.identityClient,
          loggerOptions: {
            logLevel: _s(Lo()),
            piiLoggingEnabled:
              (n = o.loggingOptions) === null || n === void 0 ? void 0 : n.enableUnsafeSupportLogging,
            loggerCallback: Is(Fe),
          },
        },
      })),
      (this.isAvailableIdentityClient = new Qr(
        Object.assign(Object.assign({}, o), { retryOptions: { maxRetries: 0 } }),
      )));
    let managedIdentitySource = this.managedIdentityApp.getManagedIdentitySource();
    if (managedIdentitySource === "CloudShell") {
      if (this.clientId || this.resourceId || this.objectId)
        throw (
          Fe.warning(
            `CloudShell MSI detected with user-provided IDs - throwing. Received values: ${JSON.stringify({ clientId: this.clientId, resourceId: this.resourceId, objectId: this.objectId })}.`,
          ),
          new R(
            "ManagedIdentityCredential: Specifying a user-assigned managed identity is not supported for CloudShell at runtime. When using Managed Identity in CloudShell, omit the clientId, resourceId, and objectId parameters.",
          )
        );
    }
    if (managedIdentitySource === "ServiceFabric") {
      if (this.clientId || this.resourceId || this.objectId)
        throw (
          Fe.warning(
            `Service Fabric detected with user-provided IDs - throwing. Received values: ${JSON.stringify({ clientId: this.clientId, resourceId: this.resourceId, objectId: this.objectId })}.`,
          ),
          new R(`ManagedIdentityCredential: ${Ud}`)
        );
    }
    if ((Fe.info(`Using ${managedIdentitySource} managed identity.`), filtered.length === 1)) {
      let { key: key, value: c } = filtered[0];
      Fe.info(`${managedIdentitySource} with ${key}: ${c}`);
    }
  }
  async getToken(e, t = {}) {
    Fe.getToken.info("Using the MSAL provider for Managed Identity.");
    let r = eo(e);
    if (!r)
      throw new R(
        `ManagedIdentityCredential: Multiple scopes are not supported. Scopes: ${JSON.stringify(e)}`,
      );
    return Z.withSpan("ManagedIdentityCredential.getToken", t, async () => {
      var n;
      try {
        let isAvailable = await vc.isAvailable(this.clientId),
          managedIdentitySource = this.managedIdentityApp.getManagedIdentitySource(),
          s = managedIdentitySource === "DefaultToImds" || managedIdentitySource === "Imds";
        if ((Fe.getToken.info(`MSAL Identity source: ${managedIdentitySource}`), isAvailable)) {
          Fe.getToken.info("Using the token exchange managed identity.");
          let token = await vc.getToken({
            scopes: e,
            clientId: this.clientId,
            identityClient: this.identityClient,
            retryConfig: this.msiRetryConfig,
            resourceId: this.resourceId,
          });
          if (token === null)
            throw new R(
              "Attempted to use the token exchange managed identity, but received a null response.",
            );
          return token;
        } else if (s) {
          if (
            (Fe.getToken.info("Using the IMDS endpoint to probe for availability."),
            !(await Wf.isAvailable({
              scopes: e,
              clientId: this.clientId,
              getTokenOptions: t,
              identityClient: this.isAvailableIdentityClient,
              resourceId: this.resourceId,
            })))
          )
            throw new R("Attempted to use the IMDS endpoint, but it is not available.");
        }
        Fe.getToken.info("Calling into MSAL for managed identity token.");
        let acquireToken = await this.managedIdentityApp.acquireToken({ resource: r });
        return (
          this.ensureValidMsalToken(e, acquireToken, t),
          Fe.getToken.info(he(e)),
          {
            expiresOnTimestamp: acquireToken.expiresOn.getTime(),
            token: acquireToken.accessToken,
            refreshAfterTimestamp:
              (n = acquireToken.refreshOn) === null || n === void 0 ? void 0 : n.getTime(),
            tokenType: "Bearer",
          }
        );
      } catch (error) {
        if ((Fe.getToken.error(q(e, error)), error.name === "AuthenticationRequiredError")) throw error;
        if (lC(error))
          throw new R(`ManagedIdentityCredential: Network unreachable. Message: ${error.message}`, {
            cause: error,
          });
        throw new R(`ManagedIdentityCredential: Authentication failed. Message ${error.message}`, {
          cause: error,
        });
      }
    });
  }
  ensureValidMsalToken(e, t, r) {
    let n = (o) => (
      Fe.getToken.info(o),
      new AuthenticationRequiredError({ scopes: Array.isArray(e) ? e : [e], getTokenOptions: r, message: o })
    );
    if (!t) throw n("No response.");
    if (!t.expiresOn) throw n('Response had no "expiresOn" property.');
    if (!t.accessToken) throw n('Response had no "accessToken" property.');
  }
}
//@ chunk-mrx6y2r5.js:311239-311448 esm-fingerprint
function lC(e) {
  if (e.errorCode === "network_error") return !0;
  if (e.code === "ENETUNREACH" || e.code === "EHOSTUNREACH") return !0;
  if (e.statusCode === 403 || e.code === 403) {
    if (e.message.includes("unreachable")) return !0;
  }
  return !1;
}

export { Ln };
