/**
 * @modelcontextprotocol/sdk/dist/esm/shared/auth-utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-9z4e25ww.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-9z4e25ww.js:4730-4816 esm-fingerprint
function resourceUrlFromServerUrl(url) {
  let resourceURL = typeof url === "string" ? new URL(url) : new URL(url.href);
  resourceURL.hash = "";
  return resourceURL;
}
//@ chunk-9z4e25ww.js:4816-5186 esm-fingerprint
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
