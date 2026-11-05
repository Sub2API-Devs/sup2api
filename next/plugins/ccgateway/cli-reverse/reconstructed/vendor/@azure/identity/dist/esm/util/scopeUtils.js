/**
 * @azure/identity/dist/esm/util/scopeUtils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { formatError } from "./logging.js";

//@ chunk-b5df2wx1.js:311448-311493 esm-layout
function ensureScopes(scopes) {
  return Array.isArray(scopes) ? scopes : [scopes];
}
//@ chunk-b5df2wx1.js:311493-311652 esm-fingerprint
function ensureValidScopeForDevTimeCreds(scope, logger) {
  if (!scope.match(/^[0-9a-zA-Z-_.:/]+$/)) {
    let error = Error("Invalid scope was specified by the user or calling client");
    logger.getToken.info(formatError(scope, error));
    throw error;
  }
}
//@ chunk-b5df2wx1.js:311652-311702 esm-fingerprint
function getScopeResource(scope) {
  return scope.replace(/\/.default$/, "");
}
export { ensureValidScopeForDevTimeCreds, getScopeResource, ensureScopes };
