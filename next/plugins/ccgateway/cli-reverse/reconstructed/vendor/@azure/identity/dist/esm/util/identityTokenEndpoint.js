/**
 * @azure/identity/dist/esm/util/identityTokenEndpoint.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-b5df2wx1.js:82206-82287 esm-fingerprint
function getIdentityTokenEndpointSuffix(tenantId) {
  if (tenantId === "adfs") return "oauth2/token";
  else return "oauth2/v2.0/token";
}
export { getIdentityTokenEndpointSuffix };
