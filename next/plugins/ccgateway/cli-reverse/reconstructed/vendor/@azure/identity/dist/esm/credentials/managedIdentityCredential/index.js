/**
 * @azure/identity/dist/esm/credentials/managedIdentityCredential/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { credentialLogger, formatSuccess, formatError } from "../../util/logging.js";
import { IdentityClient } from "../../client/identityClient.js";
import { imdsRetryPolicy } from "./imdsRetryPolicy.js";
import { ManagedIdentityApplication } from "../../../../../msal-node/lib/msal-node.cjs";
import { getMSALLogLevel, getAuthCapabilities } from "../../msal/utils.js";
import { getLogLevel } from "../../../../../logger/dist/esm/index.js";
import { CredentialUnavailableError, tokenExchangeMsi, AuthenticationRequiredError } from "../../../index.js";
import { serviceFabricErrorMessage, mapScopesToResource } from "./utils.js";
import { tracingClient } from "../../util/tracing.js";
import { imdsMsi } from "./imdsMsi.js";

//@ chunk-b5df2wx1.js:306645-306683 esm-fingerprint
var logger_6 = credentialLogger("ManagedIdentityCredential");
//@ chunk-b5df2wx1.js:306683-311239 esm-fingerprint
class ManagedIdentityCredential {
  constructor(clientIdOrOptions, options) {
    var _a;
    var _b;
    this.msiRetryConfig = {
      maxRetries: 5,
      startDelayInMs: 800,
      intervalIncrement: 2,
    };
    let _options;
    if (typeof clientIdOrOptions === "string") {
      this.clientId = clientIdOrOptions;
      _options = options !== null && options !== undefined ? options : {};
    } else {
      this.clientId =
        clientIdOrOptions === null || clientIdOrOptions === undefined
          ? undefined
          : clientIdOrOptions.clientId;
      _options = clientIdOrOptions !== null && clientIdOrOptions !== undefined ? clientIdOrOptions : {};
    }
    this.resourceId = _options === null || _options === undefined ? undefined : _options.resourceId;
    this.objectId = _options === null || _options === undefined ? undefined : _options.objectId;
    let providedIds = [
      {
        key: "clientId",
        value: this.clientId,
      },
      {
        key: "resourceId",
        value: this.resourceId,
      },
      {
        key: "objectId",
        value: this.objectId,
      },
    ].filter((id) => id.value);
    if (providedIds.length > 1)
      throw Error(
        `ManagedIdentityCredential: only one of 'clientId', 'resourceId', or 'objectId' can be provided. Received values: ${JSON.stringify(
          {
            clientId: this.clientId,
            resourceId: this.resourceId,
            objectId: this.objectId,
          },
        )}`,
      );
    _options.allowInsecureConnection = true;
    if (((_a = _options.retryOptions) === null || _a === undefined ? undefined : _a.maxRetries) !== undefined)
      this.msiRetryConfig.maxRetries = _options.retryOptions.maxRetries;
    this.identityClient = new IdentityClient(
      Object.assign(Object.assign({}, _options), {
        additionalPolicies: [
          {
            policy: imdsRetryPolicy(this.msiRetryConfig),
            position: "perCall",
          },
        ],
      }),
    );
    this.managedIdentityApp = new ManagedIdentityApplication({
      managedIdentityIdParams: {
        userAssignedClientId: this.clientId,
        userAssignedResourceId: this.resourceId,
        userAssignedObjectId: this.objectId,
      },
      system: {
        disableInternalRetries: true,
        networkClient: this.identityClient,
        loggerOptions: {
          logLevel: getMSALLogLevel(getLogLevel()),
          piiLoggingEnabled:
            (_b = _options.loggingOptions) === null || _b === undefined
              ? undefined
              : _b.enableUnsafeSupportLogging,
          loggerCallback: getAuthCapabilities(logger_6),
        },
      },
    });
    this.isAvailableIdentityClient = new IdentityClient(
      Object.assign(Object.assign({}, _options), {
        retryOptions: {
          maxRetries: 0,
        },
      }),
    );
    let managedIdentitySource = this.managedIdentityApp.getManagedIdentitySource();
    if (managedIdentitySource === "CloudShell") {
      if (this.clientId || this.resourceId || this.objectId) {
        logger_6.warning(
          `CloudShell MSI detected with user-provided IDs - throwing. Received values: ${JSON.stringify({
            clientId: this.clientId,
            resourceId: this.resourceId,
            objectId: this.objectId,
          })}.`,
        );
        throw new CredentialUnavailableError(
          "ManagedIdentityCredential: Specifying a user-assigned managed identity is not supported for CloudShell at runtime. When using Managed Identity in CloudShell, omit the clientId, resourceId, and objectId parameters.",
        );
      }
    }
    if (managedIdentitySource === "ServiceFabric") {
      if (this.clientId || this.resourceId || this.objectId) {
        logger_6.warning(
          `Service Fabric detected with user-provided IDs - throwing. Received values: ${JSON.stringify({
            clientId: this.clientId,
            resourceId: this.resourceId,
            objectId: this.objectId,
          })}.`,
        );
        throw new CredentialUnavailableError(`ManagedIdentityCredential: ${serviceFabricErrorMessage}`);
      }
    }
    logger_6.info(`Using ${managedIdentitySource} managed identity.`);
    if (providedIds.length === 1) {
      let { key, value } = providedIds[0];
      logger_6.info(`${managedIdentitySource} with ${key}: ${value}`);
    }
  }
  async getToken(scopes, options = {}) {
    logger_6.getToken.info("Using the MSAL provider for Managed Identity.");
    let resource = mapScopesToResource(scopes);
    if (!resource)
      throw new CredentialUnavailableError(
        `ManagedIdentityCredential: Multiple scopes are not supported. Scopes: ${JSON.stringify(scopes)}`,
      );
    return tracingClient.withSpan("ManagedIdentityCredential.getToken", options, async () => {
      var _a;
      try {
        let isTokenExchangeMsi = await tokenExchangeMsi.isAvailable(this.clientId);
        let identitySource = this.managedIdentityApp.getManagedIdentitySource();
        let isImdsMsi = identitySource === "DefaultToImds" || identitySource === "Imds";
        logger_6.getToken.info(`MSAL Identity source: ${identitySource}`);
        if (isTokenExchangeMsi) {
          logger_6.getToken.info("Using the token exchange managed identity.");
          let result = await tokenExchangeMsi.getToken({
            scopes,
            clientId: this.clientId,
            identityClient: this.identityClient,
            retryConfig: this.msiRetryConfig,
            resourceId: this.resourceId,
          });
          if (result === null)
            throw new CredentialUnavailableError(
              "Attempted to use the token exchange managed identity, but received a null response.",
            );
          return result;
        } else if (isImdsMsi) {
          logger_6.getToken.info("Using the IMDS endpoint to probe for availability.");
          if (
            !(await imdsMsi.isAvailable({
              scopes,
              clientId: this.clientId,
              getTokenOptions: options,
              identityClient: this.isAvailableIdentityClient,
              resourceId: this.resourceId,
            }))
          )
            throw new CredentialUnavailableError(
              "Attempted to use the IMDS endpoint, but it is not available.",
            );
        }
        logger_6.getToken.info("Calling into MSAL for managed identity token.");
        let token = await this.managedIdentityApp.acquireToken({
          resource,
        });
        this.ensureValidMsalToken(scopes, token, options);
        logger_6.getToken.info(formatSuccess(scopes));
        return {
          expiresOnTimestamp: token.expiresOn.getTime(),
          token: token.accessToken,
          refreshAfterTimestamp:
            (_a = token.refreshOn) === null || _a === undefined ? undefined : _a.getTime(),
          tokenType: "Bearer",
        };
      } catch (err) {
        logger_6.getToken.error(formatError(scopes, err));
        if (err.name === "AuthenticationRequiredError") throw err;
        if (isNetworkError(err))
          throw new CredentialUnavailableError(
            `ManagedIdentityCredential: Network unreachable. Message: ${err.message}`,
            {
              cause: err,
            },
          );
        throw new CredentialUnavailableError(
          `ManagedIdentityCredential: Authentication failed. Message ${err.message}`,
          {
            cause: err,
          },
        );
      }
    });
  }
  ensureValidMsalToken(scopes, msalToken, getTokenOptions) {
    let createError = (message) => {
      logger_6.getToken.info(message);
      return new AuthenticationRequiredError({
        scopes: Array.isArray(scopes) ? scopes : [scopes],
        getTokenOptions,
        message,
      });
    };
    if (!msalToken) throw createError("No response.");
    if (!msalToken.expiresOn) throw createError('Response had no "expiresOn" property.');
    if (!msalToken.accessToken) throw createError('Response had no "accessToken" property.');
  }
}
//@ chunk-b5df2wx1.js:311239-311448 esm-fingerprint
function isNetworkError(err) {
  if (err.errorCode === "network_error") return true;
  if (err.code === "ENETUNREACH" || err.code === "EHOSTUNREACH") return true;
  if (err.statusCode === 403 || err.code === 403) {
    if (err.message.includes("unreachable")) return true;
  }
  return false;
}
export { ManagedIdentityCredential };
