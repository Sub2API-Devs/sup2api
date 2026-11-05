/**
 * @azure/identity/dist/esm/credentials/managedIdentityCredential/utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (4)
 * attribution: esm-fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-b5df2wx1.js:82373-82650 esm-fingerprint
var serviceFabricErrorMessage =
  "Specifying a `clientId` or `resourceId` is not supported by the Service Fabric managed identity environment. The managed identity configuration is determined by the Service Fabric cluster resource configuration. See https://aka.ms/servicefabricmi for more information";
//@ chunk-b5df2wx1.js:82650-82840 esm-fingerprint
function mapScopesToResource(scopes) {
  let scope = "";
  if (Array.isArray(scopes)) {
    if (scopes.length !== 1) return;
    scope = scopes[0];
  } else if (typeof scopes === "string") scope = scopes;
  if (!scope.endsWith("/.default")) return scope;
  return scope.substr(0, scope.lastIndexOf("/.default"));
}
//@ chunk-b5df2wx1.js:82840-83237 esm-fingerprint
function parseExpirationTimestamp(body) {
  if (typeof body.expires_on === "number") return body.expires_on * 1000;
  if (typeof body.expires_on === "string") {
    let asNumber = +body.expires_on;
    if (!isNaN(asNumber)) return asNumber * 1000;
    let asDate = Date.parse(body.expires_on);
    if (!isNaN(asDate)) return asDate;
  }
  if (typeof body.expires_in === "number") return Date.now() + body.expires_in * 1000;
  throw Error(
    `Failed to parse token expiration from body. expires_in="${body.expires_in}", expires_on="${body.expires_on}"`,
  );
}
//@ chunk-b5df2wx1.js:83237-83557 esm-fingerprint
function parseRefreshTimestamp(body) {
  if (body.refresh_on) {
    if (typeof body.refresh_on === "number") return body.refresh_on * 1000;
    if (typeof body.refresh_on === "string") {
      let asNumber = +body.refresh_on;
      if (!isNaN(asNumber)) return asNumber * 1000;
      let asDate = Date.parse(body.refresh_on);
      if (!isNaN(asDate)) return asDate;
    }
    throw Error(`Failed to parse refresh_on from body. refresh_on="${body.refresh_on}"`);
  } else return;
}
export { parseExpirationTimestamp, parseRefreshTimestamp, mapScopesToResource, serviceFabricErrorMessage };
