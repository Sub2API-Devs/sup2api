/**
 * @azure/msal-node/dist/config/Configuration.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-fingerprint 3
 */
import { Constants, ProtocolMode, AzureCloudInstance } from "../../../msal-common/lib/index-node-DhUjlPuB.js";
import { LogLevel } from "../../../msal-common/dist/logger/Logger.mjs";
import { HttpClient, NodeAuthError, ManagedIdentityId } from "../../lib/msal-node.cjs";
import { deferInit, beginDeferredInits } from "../../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 4 modules closed by ../../lib/msal-node.cjs;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("vendor/@azure/msal-node/lib/msal-node.cjs");
//@ chunk-b5df2wx1.js:223223-224007 esm-fingerprint
var DEFAULT_AUTH_OPTIONS; // deferred: uses HttpClient (../../lib/msal-node.cjs) of its import cycle while loading; runs once the cycle is complete
var DEFAULT_CACHE_OPTIONS;
var DEFAULT_LOGGER_OPTIONS_2;
var DEFAULT_SYSTEM_OPTIONS;
var DEFAULT_TELEMETRY_OPTIONS;
deferInit("chunk-b5df2wx1.js:223223", () => {
  DEFAULT_AUTH_OPTIONS = {
    clientId: Constants.EMPTY_STRING,
    authority: Constants.DEFAULT_AUTHORITY,
    clientSecret: Constants.EMPTY_STRING,
    clientAssertion: Constants.EMPTY_STRING,
    clientCertificate: {
      thumbprint: Constants.EMPTY_STRING,
      thumbprintSha256: Constants.EMPTY_STRING,
      privateKey: Constants.EMPTY_STRING,
      x5c: Constants.EMPTY_STRING,
    },
    knownAuthorities: [],
    cloudDiscoveryMetadata: Constants.EMPTY_STRING,
    authorityMetadata: Constants.EMPTY_STRING,
    clientCapabilities: [],
    protocolMode: ProtocolMode.AAD,
    azureCloudOptions: {
      azureCloudInstance: AzureCloudInstance.None,
      tenant: Constants.EMPTY_STRING,
    },
    skipAuthorityMetadataCache: false,
    encodeExtraQueryParams: false,
  };
  DEFAULT_CACHE_OPTIONS = {
    claimsBasedCachingEnabled: false,
  };
  DEFAULT_LOGGER_OPTIONS_2 = {
    loggerCallback: () => {},
    piiLoggingEnabled: false,
    logLevel: LogLevel.Info,
  };
  DEFAULT_SYSTEM_OPTIONS = {
    loggerOptions: DEFAULT_LOGGER_OPTIONS_2,
    networkClient: new HttpClient(),
    proxyUrl: Constants.EMPTY_STRING,
    customAgentOptions: {},
    disableInternalRetries: false,
  };
  DEFAULT_TELEMETRY_OPTIONS = {
    application: {
      appName: Constants.EMPTY_STRING,
      appVersion: Constants.EMPTY_STRING,
    },
  };
});
//@ chunk-b5df2wx1.js:224007-224459 esm-fingerprint
function buildAppConfiguration({ auth, broker, cache, system, telemetry }) {
  let systemOptions = {
    ...DEFAULT_SYSTEM_OPTIONS,
    networkClient: new HttpClient(system?.proxyUrl, system?.customAgentOptions),
    loggerOptions: system?.loggerOptions || DEFAULT_LOGGER_OPTIONS_2,
    disableInternalRetries: system?.disableInternalRetries || false,
  };
  if (
    !!auth.clientCertificate &&
    !auth.clientCertificate.thumbprint &&
    !auth.clientCertificate.thumbprintSha256
  )
    throw NodeAuthError.createStateNotFoundError();
  return {
    auth: {
      ...DEFAULT_AUTH_OPTIONS,
      ...auth,
    },
    broker: {
      ...broker,
    },
    cache: {
      ...DEFAULT_CACHE_OPTIONS,
      ...cache,
    },
    system: {
      ...systemOptions,
      ...system,
    },
    telemetry: {
      ...DEFAULT_TELEMETRY_OPTIONS,
      ...telemetry,
    },
  };
}
//@ chunk-b5df2wx1.js:224459-224805 esm-fingerprint
function buildManagedIdentityConfiguration({ clientCapabilities, managedIdentityIdParams, system }) {
  let managedIdentityId = new ManagedIdentityId(managedIdentityIdParams);
  let loggerOptions = system?.loggerOptions || DEFAULT_LOGGER_OPTIONS_2;
  let networkClient;
  if (system?.networkClient) networkClient = system.networkClient;
  else networkClient = new HttpClient(system?.proxyUrl, system?.customAgentOptions);
  return {
    clientCapabilities: clientCapabilities || [],
    managedIdentityId,
    system: {
      loggerOptions,
      networkClient,
    },
    disableInternalRetries: system?.disableInternalRetries || false,
  };
}
export { buildAppConfiguration, buildManagedIdentityConfiguration };
