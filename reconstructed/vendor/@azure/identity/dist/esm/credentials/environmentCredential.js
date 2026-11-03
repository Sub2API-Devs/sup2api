/**
 * @azure/identity/dist/esm/credentials/environmentCredential.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (5)
 * attribution: esm-fingerprint 5
 */
import { credentialLogger, processEnvVars, formatSuccess, formatError } from "../util/logging.js";
import {
  checkTenantId,
  ClientSecretCredential,
  UsernamePasswordCredential,
  $n,
  CredentialUnavailableError,
} from "../../index.js";
import { ClientCertificateCredential } from "./clientCertificateCredential.js";
import { tracingClient } from "../util/tracing.js";

//@ chunk-mrx6y2r5.js:326641-326885 esm-fingerprint
var AllSupportedEnvironmentVariables = [
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
function getAdditionallyAllowedTenants() {
  var _a;
  return ((_a = process.env.AZURE_ADDITIONALLY_ALLOWED_TENANTS) !== null && _a !== undefined ? _a : "").split(
    ";",
  );
}
//@ chunk-mrx6y2r5.js:326999-327039 esm-fingerprint
var credentialName_2 = "EnvironmentCredential";
var logger_9 = credentialLogger(credentialName_2);
//@ chunk-mrx6y2r5.js:327039-327318 esm-fingerprint
function getSendCertificateChain() {
  var _a;
  let sendCertificateChain = (
    (_a = process.env.AZURE_CLIENT_SEND_CERTIFICATE_CHAIN) !== null && _a !== undefined ? _a : ""
  ).toLowerCase();
  let result = sendCertificateChain === "true" || sendCertificateChain === "1";
  logger_9.verbose(
    `AZURE_CLIENT_SEND_CERTIFICATE_CHAIN: ${process.env.AZURE_CLIENT_SEND_CERTIFICATE_CHAIN}; sendCertificateChain: ${result}`,
  );
  return result;
}
//@ chunk-mrx6y2r5.js:327318-329226 esm-fingerprint
class EnvironmentCredential {
  constructor(options) {
    this._credential = undefined;
    let assigned = processEnvVars(AllSupportedEnvironmentVariables).assigned.join(", ");
    logger_9.info(`Found the following environment variables: ${assigned}`);
    let tenantId = process.env.AZURE_TENANT_ID;
    let clientId = process.env.AZURE_CLIENT_ID;
    let clientSecret = process.env.AZURE_CLIENT_SECRET;
    let additionallyAllowedTenantIds = getAdditionallyAllowedTenants();
    let sendCertificateChain = getSendCertificateChain();
    let newOptions = Object.assign(Object.assign({}, options), {
      additionallyAllowedTenantIds,
      sendCertificateChain,
    });
    if (tenantId) checkTenantId(logger_9, tenantId);
    if (tenantId && clientId && clientSecret) {
      logger_9.info(
        `Invoking ClientSecretCredential with tenant ID: ${tenantId}, clientId: ${clientId} and clientSecret: [REDACTED]`,
      );
      this._credential = new ClientSecretCredential(tenantId, clientId, clientSecret, newOptions);
      return;
    }
    let certificatePath = process.env.AZURE_CLIENT_CERTIFICATE_PATH;
    let certificatePassword = process.env.AZURE_CLIENT_CERTIFICATE_PASSWORD;
    if (tenantId && clientId && certificatePath) {
      logger_9.info(
        `Invoking ClientCertificateCredential with tenant ID: ${tenantId}, clientId: ${clientId} and certificatePath: ${certificatePath}`,
      );
      this._credential = new ClientCertificateCredential(
        tenantId,
        clientId,
        {
          certificatePath,
          certificatePassword,
        },
        newOptions,
      );
      return;
    }
    let username = process.env.AZURE_USERNAME;
    let password = process.env.AZURE_PASSWORD;
    if (tenantId && clientId && username && password) {
      logger_9.info(
        `Invoking UsernamePasswordCredential with tenant ID: ${tenantId}, clientId: ${clientId} and username: ${username}`,
      );
      logger_9.warning(
        "Environment is configured to use username and password authentication. This authentication method is deprecated, as it doesn't support multifactor authentication (MFA). Use a more secure credential. For more details, see https://aka.ms/azsdk/identity/mfa.",
      );
      this._credential = new UsernamePasswordCredential(tenantId, clientId, username, password, newOptions);
    }
  }
  async getToken(scopes, options = {}) {
    return tracingClient.withSpan(`${credentialName_2}.getToken`, options, async (newOptions) => {
      if (this._credential)
        try {
          let result = await this._credential.getToken(scopes, newOptions);
          logger_9.getToken.info(formatSuccess(scopes));
          return result;
        } catch (err) {
          let authenticationError = new $n(400, {
            error: `${credentialName_2} authentication failed. To troubleshoot, visit https://aka.ms/azsdk/js/identity/environmentcredential/troubleshoot.`,
            error_description: err.message.toString().split("More details:").join(""),
          });
          logger_9.getToken.info(formatError(scopes, authenticationError));
          throw authenticationError;
        }
      throw new CredentialUnavailableError(
        `${credentialName_2} is unavailable. No underlying credential could be used. To troubleshoot, visit https://aka.ms/azsdk/js/identity/environmentcredential/troubleshoot.`,
      );
    });
  }
}
export { EnvironmentCredential };
