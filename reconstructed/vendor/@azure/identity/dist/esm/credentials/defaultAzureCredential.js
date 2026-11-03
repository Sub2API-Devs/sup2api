/**
 * @azure/identity/dist/esm/credentials/defaultAzureCredential.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (9)
 * attribution: esm-fingerprint 8, esm-layout 1
 */
import { z } from "../util/logging.js";
import { Ln } from "./managedIdentityCredential/index.js";
import { Fr, Pc, xc, Dc } from "../../index.js";
import { bc } from "./azureCliCredential.js";
import { Fc } from "./environmentCredential.js";

//@ chunk-mrx6y2r5.js:329226-329261 esm-fingerprint
var $c = z("DefaultAzureCredential");
//@ chunk-mrx6y2r5.js:329261-330026 esm-fingerprint
function IC(e = {}) {
  var t, r, n, o;
  ((t = e.retryOptions) !== null && t !== void 0) ||
    (e.retryOptions = { maxRetries: 5, retryDelayInMs: 800 });
  let i =
      (r = e === null || e === void 0 ? void 0 : e.managedIdentityClientId) !== null && r !== void 0
        ? r
        : process.env.AZURE_CLIENT_ID,
    s =
      (n = e === null || e === void 0 ? void 0 : e.workloadIdentityClientId) !== null && n !== void 0 ? n : i,
    a = e === null || e === void 0 ? void 0 : e.managedIdentityResourceId,
    envAzureFederatedTokenFile = process.env.AZURE_FEDERATED_TOKEN_FILE,
    l =
      (o = e === null || e === void 0 ? void 0 : e.tenantId) !== null && o !== void 0
        ? o
        : process.env.AZURE_TENANT_ID;
  if (a) {
    let merged = Object.assign(Object.assign({}, e), { resourceId: a });
    return new Ln(merged);
  }
  if (envAzureFederatedTokenFile && s) {
    let merged = Object.assign(Object.assign({}, e), { tenantId: l });
    return new Ln(s, merged);
  }
  if (i) {
    let merged = Object.assign(Object.assign({}, e), { clientId: i });
    return new Ln(merged);
  }
  return new Ln(e);
}
//@ chunk-mrx6y2r5.js:330026-330584 esm-fingerprint
function _C(e) {
  var t, r, n;
  let o =
      (t = e === null || e === void 0 ? void 0 : e.managedIdentityClientId) !== null && t !== void 0
        ? t
        : process.env.AZURE_CLIENT_ID,
    i =
      (r = e === null || e === void 0 ? void 0 : e.workloadIdentityClientId) !== null && r !== void 0 ? r : o,
    envAzureFederatedTokenFile = process.env.AZURE_FEDERATED_TOKEN_FILE,
    a =
      (n = e === null || e === void 0 ? void 0 : e.tenantId) !== null && n !== void 0
        ? n
        : process.env.AZURE_TENANT_ID;
  if (envAzureFederatedTokenFile && i) {
    let merged = Object.assign(Object.assign({}, e), {
      tenantId: a,
      clientId: i,
      tokenFilePath: envAzureFederatedTokenFile,
    });
    return new Fr(merged);
  }
  if (a) {
    let merged = Object.assign(Object.assign({}, e), { tenantId: a });
    return new Fr(merged);
  }
  return new Fr(e);
}
//@ chunk-mrx6y2r5.js:330584-330684 esm-fingerprint
function SC(e = {}) {
  let processTimeoutInMs = e.processTimeoutInMs;
  return new Pc(Object.assign({ processTimeoutInMs: processTimeoutInMs }, e));
}
//@ chunk-mrx6y2r5.js:330684-330784 esm-fingerprint
function RC(e = {}) {
  let processTimeoutInMs = e.processTimeoutInMs;
  return new bc(Object.assign({ processTimeoutInMs: processTimeoutInMs }, e));
}
//@ chunk-mrx6y2r5.js:330784-330884 esm-fingerprint
function wC(e = {}) {
  let processTimeoutInMs = e.processTimeoutInMs;
  return new xc(Object.assign({ processTimeoutInMs: processTimeoutInMs }, e));
}
//@ chunk-mrx6y2r5.js:330884-330919 esm-layout
function vC(e = {}) {
  return new Fc(e);
}
//@ chunk-mrx6y2r5.js:330919-331152 esm-fingerprint
class lm {
  constructor(e, t) {
    ((this.credentialName = e), (this.credentialUnavailableErrorMessage = t));
  }
  getToken() {
    return (
      $c.getToken.info(`Skipping ${this.credentialName}, reason: ${this.credentialUnavailableErrorMessage}`),
      Promise.resolve(null)
    );
  }
}
//@ chunk-mrx6y2r5.js:331152-331737 esm-fingerprint
class dm extends Dc {
  constructor(e) {
    let t = process.env.AZURE_TOKEN_CREDENTIALS
        ? process.env.AZURE_TOKEN_CREDENTIALS.trim().toLowerCase()
        : void 0,
      r = [RC, wC, SC],
      n = [vC, _C, IC],
      o = [];
    if (t)
      switch (t) {
        case "dev":
          o = r;
          break;
        case "prod":
          o = n;
          break;
        default: {
          let s = `Invalid value for AZURE_TOKEN_CREDENTIALS = ${process.env.AZURE_TOKEN_CREDENTIALS}. Valid values are 'prod' or 'dev'.`;
          throw ($c.warning(s), Error(s));
        }
      }
    else o = [...n, ...r];
    let mapped = o.map((s) => {
      try {
        return s(e);
      } catch (error) {
        return (
          $c.warning(`Skipped ${s.name} because of an error creating the credential: ${error}`),
          new lm(s.name, error.message)
        );
      }
    });
    super(...mapped);
  }
}
