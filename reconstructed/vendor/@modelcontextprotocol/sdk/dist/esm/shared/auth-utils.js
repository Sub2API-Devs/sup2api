/**
 * @modelcontextprotocol/sdk/dist/esm/shared/auth-utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-9z4e25ww.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-9z4e25ww.js:4730-4816 esm-fingerprint
function J(e) {
  let t = typeof e === "string" ? new URL(e) : new URL(e.href);
  return ((t.hash = ""), t);
}
//@ chunk-9z4e25ww.js:4816-5186 esm-fingerprint
function Y({ requestedResource: requestedResource, configuredResource: configuredResource }) {
  let r =
      typeof requestedResource === "string" ? new URL(requestedResource) : new URL(requestedResource.href),
    n =
      typeof configuredResource === "string" ? new URL(configuredResource) : new URL(configuredResource.href);
  if (r.origin !== n.origin) return !1;
  if (r.pathname.length < n.pathname.length) return !1;
  let a = r.pathname.endsWith("/") ? r.pathname : r.pathname + "/",
    i = n.pathname.endsWith("/") ? n.pathname : n.pathname + "/";
  return a.startsWith(i);
}

export { J, Y };
