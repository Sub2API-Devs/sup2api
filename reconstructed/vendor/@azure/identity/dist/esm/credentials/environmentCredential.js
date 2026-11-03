/**
 * @azure/identity/dist/esm/credentials/environmentCredential.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (5)
 * attribution: esm-fingerprint 5
 */
import { z, Ho, he, q } from "../util/logging.js";
import { checkTenantId, Lc, Hc, $n, R } from "../../index.js";
import { Uc } from "./clientCertificateCredential.js";
import { Z } from "../util/tracing.js";

//@ chunk-mrx6y2r5.js:326641-326885 esm-fingerprint
var EC = [
  "AZURE_TENANT_ID",
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
  "AZURE_CLIENT_CERTIFICATE_PATH",
  "AZURE_CLIENT_CERTIFICATE_PASSWORD",
  "AZURE_USERNAME",
  "AZURE_PASSWORD",
  "AZURE_ADDITIONALLY_ALLOWED_TENANTS",
  "AZURE_CLIENT_SEND_CERTIFICATE_CHAIN",
];
//@ chunk-mrx6y2r5.js:326885-326999 esm-fingerprint
function CC() {
  var e;
  return ((e = process.env.AZURE_ADDITIONALLY_ALLOWED_TENANTS) !== null && e !== void 0 ? e : "").split(";");
}
//@ chunk-mrx6y2r5.js:326999-327039 esm-fingerprint
var ENVIRONMENTCREDENTIAL = "EnvironmentCredential",
  bt = z(ENVIRONMENTCREDENTIAL);
//@ chunk-mrx6y2r5.js:327039-327318 esm-fingerprint
function AC() {
  var e;
  let lower = (
      (e = process.env.AZURE_CLIENT_SEND_CERTIFICATE_CHAIN) !== null && e !== void 0 ? e : ""
    ).toLowerCase(),
    r = lower === "true" || lower === "1";
  return (
    bt.verbose(
      `AZURE_CLIENT_SEND_CERTIFICATE_CHAIN: ${process.env.AZURE_CLIENT_SEND_CERTIFICATE_CHAIN}; sendCertificateChain: ${r}`,
    ),
    r
  );
}
//@ chunk-mrx6y2r5.js:327318-329226 esm-fingerprint
class Fc {
  constructor(e) {
    this._credential = void 0;
    let joined = Ho(EC).assigned.join(", ");
    bt.info(`Found the following environment variables: ${joined}`);
    let envAzureTenantId = process.env.AZURE_TENANT_ID,
      envAzureClientId = process.env.AZURE_CLIENT_ID,
      envAzureClientSecret = process.env.AZURE_CLIENT_SECRET,
      i = CC(),
      s = AC(),
      merged = Object.assign(Object.assign({}, e), {
        additionallyAllowedTenantIds: i,
        sendCertificateChain: s,
      });
    if (envAzureTenantId) checkTenantId(bt, envAzureTenantId);
    if (envAzureTenantId && envAzureClientId && envAzureClientSecret) {
      (bt.info(
        `Invoking ClientSecretCredential with tenant ID: ${envAzureTenantId}, clientId: ${envAzureClientId} and clientSecret: [REDACTED]`,
      ),
        (this._credential = new Lc(envAzureTenantId, envAzureClientId, envAzureClientSecret, merged)));
      return;
    }
    let envAzureClientCertificatePath = process.env.AZURE_CLIENT_CERTIFICATE_PATH,
      envAzureClientCertificatePassword = process.env.AZURE_CLIENT_CERTIFICATE_PASSWORD;
    if (envAzureTenantId && envAzureClientId && envAzureClientCertificatePath) {
      (bt.info(
        `Invoking ClientCertificateCredential with tenant ID: ${envAzureTenantId}, clientId: ${envAzureClientId} and certificatePath: ${envAzureClientCertificatePath}`,
      ),
        (this._credential = new Uc(
          envAzureTenantId,
          envAzureClientId,
          {
            certificatePath: envAzureClientCertificatePath,
            certificatePassword: envAzureClientCertificatePassword,
          },
          merged,
        )));
      return;
    }
    let envAzureUsername = process.env.AZURE_USERNAME,
      envAzurePassword = process.env.AZURE_PASSWORD;
    if (envAzureTenantId && envAzureClientId && envAzureUsername && envAzurePassword)
      (bt.info(
        `Invoking UsernamePasswordCredential with tenant ID: ${envAzureTenantId}, clientId: ${envAzureClientId} and username: ${envAzureUsername}`,
      ),
        bt.warning(
          "Environment is configured to use username and password authentication. This authentication method is deprecated, as it doesn't support multifactor authentication (MFA). Use a more secure credential. For more details, see https://aka.ms/azsdk/identity/mfa.",
        ),
        (this._credential = new Hc(
          envAzureTenantId,
          envAzureClientId,
          envAzureUsername,
          envAzurePassword,
          merged,
        )));
  }
  async getToken(e, t = {}) {
    return Z.withSpan(`${ENVIRONMENTCREDENTIAL}.getToken`, t, async (r) => {
      if (this._credential)
        try {
          let token = await this._credential.getToken(e, r);
          return (bt.getToken.info(he(e)), token);
        } catch (error) {
          let o = new $n(400, {
            error: `${ENVIRONMENTCREDENTIAL} authentication failed. To troubleshoot, visit https://aka.ms/azsdk/js/identity/environmentcredential/troubleshoot.`,
            error_description: error.message.toString().split("More details:").join(""),
          });
          throw (bt.getToken.info(q(e, o)), o);
        }
      throw new R(
        `${ENVIRONMENTCREDENTIAL} is unavailable. No underlying credential could be used. To troubleshoot, visit https://aka.ms/azsdk/js/identity/environmentcredential/troubleshoot.`,
      );
    });
  }
}

export { Fc };
