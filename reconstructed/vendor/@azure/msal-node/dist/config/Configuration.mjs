/**
 * @azure/msal-node/dist/config/Configuration.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { f, Ae, Ht } from "../../../msal-common/lib/index-node-DhUjlPuB.js";
import { G } from "../../../msal-common/dist/logger/Logger.mjs";
import { _o, NodeAuthError, Za } from "../../lib/msal-node.cjs";

//@ chunk-mrx6y2r5.js:223223-224007 esm-fingerprint
var oy = {
    clientId: f.EMPTY_STRING,
    authority: f.DEFAULT_AUTHORITY,
    clientSecret: f.EMPTY_STRING,
    clientAssertion: f.EMPTY_STRING,
    clientCertificate: {
      thumbprint: f.EMPTY_STRING,
      thumbprintSha256: f.EMPTY_STRING,
      privateKey: f.EMPTY_STRING,
      x5c: f.EMPTY_STRING,
    },
    knownAuthorities: [],
    cloudDiscoveryMetadata: f.EMPTY_STRING,
    authorityMetadata: f.EMPTY_STRING,
    clientCapabilities: [],
    protocolMode: Ae.AAD,
    azureCloudOptions: { azureCloudInstance: Ht.None, tenant: f.EMPTY_STRING },
    skipAuthorityMetadataCache: !1,
    encodeExtraQueryParams: !1,
  },
  iy = { claimsBasedCachingEnabled: !1 },
  ec = { loggerCallback: () => {}, piiLoggingEnabled: !1, logLevel: G.Info },
  sy = {
    loggerOptions: ec,
    networkClient: new _o(),
    proxyUrl: f.EMPTY_STRING,
    customAgentOptions: {},
    disableInternalRetries: !1,
  },
  ay = { application: { appName: f.EMPTY_STRING, appVersion: f.EMPTY_STRING } };
//@ chunk-mrx6y2r5.js:224007-224459 esm-fingerprint
function bh({ auth: auth, broker: broker, cache: cache, system: system, telemetry: telemetry }) {
  let i = {
    ...sy,
    networkClient: new _o(system?.proxyUrl, system?.customAgentOptions),
    loggerOptions: system?.loggerOptions || ec,
    disableInternalRetries: system?.disableInternalRetries || !1,
  };
  if (
    !!auth.clientCertificate &&
    !auth.clientCertificate.thumbprint &&
    !auth.clientCertificate.thumbprintSha256
  )
    throw NodeAuthError.createStateNotFoundError();
  return {
    auth: { ...oy, ...auth },
    broker: { ...broker },
    cache: { ...iy, ...cache },
    system: { ...i, ...system },
    telemetry: { ...ay, ...telemetry },
  };
}
//@ chunk-mrx6y2r5.js:224459-224805 esm-fingerprint
function Ph({
  clientCapabilities: clientCapabilities,
  managedIdentityIdParams: managedIdentityIdParams,
  system: system,
}) {
  let n = new Za(managedIdentityIdParams),
    o = system?.loggerOptions || ec,
    i;
  if (system?.networkClient) i = system.networkClient;
  else i = new _o(system?.proxyUrl, system?.customAgentOptions);
  return {
    clientCapabilities: clientCapabilities || [],
    managedIdentityId: n,
    system: { loggerOptions: o, networkClient: i },
    disableInternalRetries: system?.disableInternalRetries || !1,
  };
}

export { bh, Ph };
