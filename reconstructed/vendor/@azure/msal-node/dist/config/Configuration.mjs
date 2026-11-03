/**
 * @azure/msal-node/dist/config/Configuration.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { Constants, ProtocolMode, AzureCloudInstance } from "../../../msal-common/lib/index-node-DhUjlPuB.js";
import { LogLevel } from "../../../msal-common/dist/logger/Logger.mjs";
import { HttpClient, NodeAuthError, ManagedIdentityId } from "../../lib/msal-node.cjs";

//@ chunk-mrx6y2r5.js:223223-224007 esm-fingerprint
var DEFAULT_AUTH_OPTIONS = {
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
var DEFAULT_CACHE_OPTIONS = {
  claimsBasedCachingEnabled: false,
};
var DEFAULT_LOGGER_OPTIONS = {
  loggerCallback: () => {},
  piiLoggingEnabled: false,
  logLevel: LogLevel.Info,
};
var DEFAULT_SYSTEM_OPTIONS = {
  loggerOptions: DEFAULT_LOGGER_OPTIONS,
  networkClient: new HttpClient(),
  proxyUrl: Constants.EMPTY_STRING,
  customAgentOptions: {},
  disableInternalRetries: false,
};
var DEFAULT_TELEMETRY_OPTIONS = {
  application: {
    appName: Constants.EMPTY_STRING,
    appVersion: Constants.EMPTY_STRING,
  },
};
//@ chunk-mrx6y2r5.js:224007-224459 esm-fingerprint
function buildAppConfiguration({ auth, broker, cache, system, telemetry }) {
  let systemOptions = {
    ...DEFAULT_SYSTEM_OPTIONS,
    networkClient: new HttpClient(system?.proxyUrl, system?.customAgentOptions),
    loggerOptions: system?.loggerOptions || DEFAULT_LOGGER_OPTIONS,
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
//@ chunk-mrx6y2r5.js:224459-224805 esm-fingerprint
function buildManagedIdentityConfiguration({ clientCapabilities, managedIdentityIdParams, system }) {
  let managedIdentityId = new ManagedIdentityId(managedIdentityIdParams);
  let loggerOptions = system?.loggerOptions || DEFAULT_LOGGER_OPTIONS;
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
