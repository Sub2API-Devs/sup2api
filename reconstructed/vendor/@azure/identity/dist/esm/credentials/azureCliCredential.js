/**
 * @azure/identity/dist/esm/credentials/azureCliCredential.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-fingerprint 2
 */
import child_process from "child_process";
import { credentialLogger, formatError, formatSuccess } from "../util/logging.js";
import {
  checkTenantId,
  resolveAdditionallyAllowedTenantIds,
  processMultiTenantRequest,
  CredentialUnavailableError,
} from "../../index.js";
import { checkSubscription } from "../util/subscriptionUtils.js";
import { tracingClient } from "../util/tracing.js";
import { ensureValidScopeForDevTimeCreds, getScopeResource } from "../util/scopeUtils.js";

//@ chunk-mrx6y2r5.js:312006-312416 esm-fingerprint
var logger_7 = credentialLogger("AzureCliCredential");
var cliCredentialInternals = {
  getSafeWorkingDir() {
    return "/bin";
  },
  async getAzureCliAccessToken(resource, tenantId, subscription, timeout) {
    let tenantSection = [];
    let subscriptionSection = [];
    if (tenantId) tenantSection = ["--tenant", tenantId];
    if (subscription) subscriptionSection = ["--subscription", `"${subscription}"`];
    return new Promise((resolve, reject) => {
      try {
        child_process.execFile(
          "az",
          [
            "account",
            "get-access-token",
            "--output",
            "json",
            "--resource",
            resource,
            ...tenantSection,
            ...subscriptionSection,
          ],
          {
            cwd: cliCredentialInternals.getSafeWorkingDir(),
            shell: true,
            timeout,
          },
          (error, stdout, stderr) => {
            resolve({
              stdout,
              stderr,
              error,
            });
          },
        );
      } catch (err) {
        reject(err);
      }
    });
  },
};
//@ chunk-mrx6y2r5.js:312416-314736 esm-fingerprint
class AzureCliCredential {
  constructor(options) {
    if (options === null || options === undefined ? undefined : options.tenantId) {
      checkTenantId(logger_7, options === null || options === undefined ? undefined : options.tenantId);
      this.tenantId = options === null || options === undefined ? undefined : options.tenantId;
    }
    if (options === null || options === undefined ? undefined : options.subscription) {
      checkSubscription(
        logger_7,
        options === null || options === undefined ? undefined : options.subscription,
      );
      this.subscription = options === null || options === undefined ? undefined : options.subscription;
    }
    this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(
      options === null || options === undefined ? undefined : options.additionallyAllowedTenants,
    );
    this.timeout = options === null || options === undefined ? undefined : options.processTimeoutInMs;
  }
  async getToken(scopes, options = {}) {
    let tenantId = processMultiTenantRequest(this.tenantId, options, this.additionallyAllowedTenantIds);
    if (tenantId) checkTenantId(logger_7, tenantId);
    if (this.subscription) checkSubscription(logger_7, this.subscription);
    let scope = typeof scopes === "string" ? scopes : scopes[0];
    logger_7.getToken.info(`Using the scope ${scope}`);
    return tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async () => {
      var _a;
      var _b;
      var _c;
      var _d;
      try {
        ensureValidScopeForDevTimeCreds(scope, logger_7);
        let resource = getScopeResource(scope);
        let obj = await cliCredentialInternals.getAzureCliAccessToken(
          resource,
          tenantId,
          this.subscription,
          this.timeout,
        );
        let d =
          (_a = obj.stderr) === null || _a === undefined ? undefined : _a.match("(.*)az login --scope(.*)");
        let isLoginError =
          ((_b = obj.stderr) === null || _b === undefined ? undefined : _b.match("(.*)az login(.*)")) && !d;
        if (
          ((_c = obj.stderr) === null || _c === undefined ? undefined : _c.match("az:(.*)not found")) ||
          ((_d = obj.stderr) === null || _d === undefined
            ? undefined
            : _d.startsWith("'az' is not recognized"))
        ) {
          let error = new CredentialUnavailableError(
            "Azure CLI could not be found. Please visit https://aka.ms/azure-cli for installation instructions and then, once installed, authenticate to your Azure account using 'az login'.",
          );
          logger_7.getToken.info(formatError(scopes, error));
          throw error;
        }
        if (isLoginError) {
          let error = new CredentialUnavailableError(
            "Please run 'az login' from a command prompt to authenticate before using this credential.",
          );
          logger_7.getToken.info(formatError(scopes, error));
          throw error;
        }
        try {
          let responseData = obj.stdout;
          let response = this.parseRawResponse(responseData);
          logger_7.getToken.info(formatSuccess(scopes));
          return response;
        } catch (e) {
          if (obj.stderr) throw new CredentialUnavailableError(obj.stderr);
          throw e;
        }
      } catch (err) {
        let error =
          err.name === "CredentialUnavailableError"
            ? err
            : new CredentialUnavailableError(
                err.message || "Unknown error while trying to retrieve the access token",
              );
        logger_7.getToken.info(formatError(scopes, error));
        throw error;
      }
    });
  }
  parseRawResponse(rawResponse) {
    let response = JSON.parse(rawResponse);
    let token = response.accessToken;
    let expiresOnTimestamp = Number.parseInt(response.expires_on, 10) * 1000;
    if (!isNaN(expiresOnTimestamp)) {
      logger_7.getToken.info("expires_on is available and is valid, using it");
      return {
        token,
        expiresOnTimestamp,
        tokenType: "Bearer",
      };
    }
    expiresOnTimestamp = new Date(response.expiresOn).getTime();
    if (isNaN(expiresOnTimestamp))
      throw new CredentialUnavailableError(
        `Unexpected response from Azure CLI when getting token. Expected "expiresOn" to be a RFC3339 date string. Got: "${response.expiresOn}"`,
      );
    return {
      token,
      expiresOnTimestamp,
      tokenType: "Bearer",
    };
  }
}
export { AzureCliCredential };
