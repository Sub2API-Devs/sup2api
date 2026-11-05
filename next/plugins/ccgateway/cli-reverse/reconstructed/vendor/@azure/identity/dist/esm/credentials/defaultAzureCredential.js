/**
 * @azure/identity/dist/esm/credentials/defaultAzureCredential.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (9)
 * attribution: esm-fingerprint 8, esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { credentialLogger } from "../util/logging.js";
import { ManagedIdentityCredential } from "./managedIdentityCredential/index.js";
import {
  WorkloadIdentityCredential,
  AzureDeveloperCliCredential,
  AzurePowerShellCredential,
  ChainedTokenCredential,
} from "../../index.js";
import { AzureCliCredential } from "./azureCliCredential.js";
import { EnvironmentCredential } from "./environmentCredential.js";

//@ chunk-b5df2wx1.js:329226-329261 esm-fingerprint
var logger_10 = credentialLogger("DefaultAzureCredential");
//@ chunk-b5df2wx1.js:329261-330026 esm-fingerprint
function createDefaultManagedIdentityCredential(options = {}) {
  var _a;
  var _b;
  var _c;
  var _d;
  if (!((_a = options.retryOptions) !== null && _a !== undefined))
    options.retryOptions = {
      maxRetries: 5,
      retryDelayInMs: 800,
    };
  let managedIdentityClientId =
    (_b = options === null || options === undefined ? undefined : options.managedIdentityClientId) !== null &&
    _b !== undefined
      ? _b
      : process.env.AZURE_CLIENT_ID;
  let workloadIdentityClientId =
    (_c = options === null || options === undefined ? undefined : options.workloadIdentityClientId) !==
      null && _c !== undefined
      ? _c
      : managedIdentityClientId;
  let managedResourceId =
    options === null || options === undefined ? undefined : options.managedIdentityResourceId;
  let workloadFile = process.env.AZURE_FEDERATED_TOKEN_FILE;
  let tenantId =
    (_d = options === null || options === undefined ? undefined : options.tenantId) !== null &&
    _d !== undefined
      ? _d
      : process.env.AZURE_TENANT_ID;
  if (managedResourceId) {
    let managedIdentityResourceIdOptions = Object.assign(Object.assign({}, options), {
      resourceId: managedResourceId,
    });
    return new ManagedIdentityCredential(managedIdentityResourceIdOptions);
  }
  if (workloadFile && workloadIdentityClientId) {
    let workloadIdentityCredentialOptions = Object.assign(Object.assign({}, options), {
      tenantId,
    });
    return new ManagedIdentityCredential(workloadIdentityClientId, workloadIdentityCredentialOptions);
  }
  if (managedIdentityClientId) {
    let managedIdentityClientOptions = Object.assign(Object.assign({}, options), {
      clientId: managedIdentityClientId,
    });
    return new ManagedIdentityCredential(managedIdentityClientOptions);
  }
  return new ManagedIdentityCredential(options);
}
//@ chunk-b5df2wx1.js:330026-330584 esm-fingerprint
function createDefaultWorkloadIdentityCredential(options) {
  var _a;
  var _b;
  var _c;
  let managedIdentityClientId =
    (_a = options === null || options === undefined ? undefined : options.managedIdentityClientId) !== null &&
    _a !== undefined
      ? _a
      : process.env.AZURE_CLIENT_ID;
  let workloadIdentityClientId =
    (_b = options === null || options === undefined ? undefined : options.workloadIdentityClientId) !==
      null && _b !== undefined
      ? _b
      : managedIdentityClientId;
  let workloadFile = process.env.AZURE_FEDERATED_TOKEN_FILE;
  let tenantId =
    (_c = options === null || options === undefined ? undefined : options.tenantId) !== null &&
    _c !== undefined
      ? _c
      : process.env.AZURE_TENANT_ID;
  if (workloadFile && workloadIdentityClientId) {
    let workloadIdentityCredentialOptions = Object.assign(Object.assign({}, options), {
      tenantId,
      clientId: workloadIdentityClientId,
      tokenFilePath: workloadFile,
    });
    return new WorkloadIdentityCredential(workloadIdentityCredentialOptions);
  }
  if (tenantId) {
    let workloadIdentityClientTenantOptions = Object.assign(Object.assign({}, options), {
      tenantId,
    });
    return new WorkloadIdentityCredential(workloadIdentityClientTenantOptions);
  }
  return new WorkloadIdentityCredential(options);
}
//@ chunk-b5df2wx1.js:330584-330684 esm-fingerprint
function createDefaultAzureDeveloperCliCredential(options = {}) {
  let processTimeoutInMs = options.processTimeoutInMs;
  return new AzureDeveloperCliCredential(
    Object.assign(
      {
        processTimeoutInMs,
      },
      options,
    ),
  );
}
//@ chunk-b5df2wx1.js:330684-330784 esm-fingerprint
function createDefaultAzureCliCredential(options = {}) {
  let processTimeoutInMs = options.processTimeoutInMs;
  return new AzureCliCredential(
    Object.assign(
      {
        processTimeoutInMs,
      },
      options,
    ),
  );
}
//@ chunk-b5df2wx1.js:330784-330884 esm-fingerprint
function createDefaultAzurePowershellCredential(options = {}) {
  let processTimeoutInMs = options.processTimeoutInMs;
  return new AzurePowerShellCredential(
    Object.assign(
      {
        processTimeoutInMs,
      },
      options,
    ),
  );
}
//@ chunk-b5df2wx1.js:330884-330919 esm-layout
function createEnvironmentCredential(options = {}) {
  return new EnvironmentCredential(options);
}
//@ chunk-b5df2wx1.js:330919-331152 esm-fingerprint
class UnavailableDefaultCredential {
  constructor(credentialName, message) {
    this.credentialName = credentialName;
    this.credentialUnavailableErrorMessage = message;
  }
  getToken() {
    logger_10.getToken.info(
      `Skipping ${this.credentialName}, reason: ${this.credentialUnavailableErrorMessage}`,
    );
    return Promise.resolve(null);
  }
}
//@ chunk-b5df2wx1.js:331152-331737 esm-fingerprint
class DefaultAzureCredential extends ChainedTokenCredential {
  constructor(options) {
    let azureTokenCredentials = process.env.AZURE_TOKEN_CREDENTIALS
      ? process.env.AZURE_TOKEN_CREDENTIALS.trim().toLowerCase()
      : undefined;
    let devCredentialFunctions = [
      createDefaultAzureCliCredential,
      createDefaultAzurePowershellCredential,
      createDefaultAzureDeveloperCliCredential,
    ];
    let prodCredentialFunctions = [
      createEnvironmentCredential,
      createDefaultWorkloadIdentityCredential,
      createDefaultManagedIdentityCredential,
    ];
    let credentialFunctions = [];
    if (azureTokenCredentials)
      switch (azureTokenCredentials) {
        case "dev":
          credentialFunctions = devCredentialFunctions;
          break;
        case "prod":
          credentialFunctions = prodCredentialFunctions;
          break;
        default: {
          let errorMessage = `Invalid value for AZURE_TOKEN_CREDENTIALS = ${process.env.AZURE_TOKEN_CREDENTIALS}. Valid values are 'prod' or 'dev'.`;
          logger_10.warning(errorMessage);
          throw Error(errorMessage);
        }
      }
    else credentialFunctions = [...prodCredentialFunctions, ...devCredentialFunctions];
    let credentials = credentialFunctions.map((createCredentialFn) => {
      try {
        return createCredentialFn(options);
      } catch (err) {
        logger_10.warning(
          `Skipped ${createCredentialFn.name} because of an error creating the credential: ${err}`,
        );
        return new UnavailableDefaultCredential(createCredentialFn.name, err.message);
      }
    });
    super(...credentials);
  }
}
export { DefaultAzureCredential };
