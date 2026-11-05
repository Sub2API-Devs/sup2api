/**
 * @modelcontextprotocol/sdk/dist/esm/shared/auth-utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-6dff51n3.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-6dff51n3.js:4730-4816 esm-fingerprint
function resourceUrlFromServerUrl(url) {
  let resourceURL = typeof url === "string" ? new URL(url) : new URL(url.href);
  resourceURL.hash = "";
  return resourceURL;
}
//@ chunk-6dff51n3.js:4816-5186 esm-fingerprint
function checkResourceAllowed({ requestedResource, configuredResource }) {
  let requested =
    typeof requestedResource === "string" ? new URL(requestedResource) : new URL(requestedResource.href);
  let configured =
    typeof configuredResource === "string" ? new URL(configuredResource) : new URL(configuredResource.href);
  if (requested.origin !== configured.origin) return false;
  if (requested.pathname.length < configured.pathname.length) return false;
  let requestedPath = requested.pathname.endsWith("/") ? requested.pathname : requested.pathname + "/";
  let configuredPath = configured.pathname.endsWith("/") ? configured.pathname : configured.pathname + "/";
  return requestedPath.startsWith(configuredPath);
}
export { resourceUrlFromServerUrl, checkResourceAllowed };
