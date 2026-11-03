/**
 * @azure/identity/dist/esm/credentials/managedIdentityCredential/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-fingerprint 4
 */

//@ chunk-mrx6y2r5.js:82373-82650 esm-fingerprint
var Ud =
  "Specifying a `clientId` or `resourceId` is not supported by the Service Fabric managed identity environment. The managed identity configuration is determined by the Service Fabric cluster resource configuration. See https://aka.ms/servicefabricmi for more information";
//@ chunk-mrx6y2r5.js:82650-82840 esm-fingerprint
function eo(e) {
  let t = "";
  if (Array.isArray(e)) {
    if (e.length !== 1) return;
    t = e[0];
  } else if (typeof e === "string") t = e;
  if (!t.endsWith("/.default")) return t;
  return t.substr(0, t.lastIndexOf("/.default"));
}
//@ chunk-mrx6y2r5.js:82840-83237 esm-fingerprint
function Ld(e) {
  if (typeof e.expires_on === "number") return e.expires_on * 1000;
  if (typeof e.expires_on === "string") {
    let t = +e.expires_on;
    if (!isNaN(t)) return t * 1000;
    let parse = Date.parse(e.expires_on);
    if (!isNaN(parse)) return parse;
  }
  if (typeof e.expires_in === "number") return Date.now() + e.expires_in * 1000;
  throw Error(
    `Failed to parse token expiration from body. expires_in="${e.expires_in}", expires_on="${e.expires_on}"`,
  );
}
//@ chunk-mrx6y2r5.js:83237-83557 esm-fingerprint
function Hd(e) {
  if (e.refresh_on) {
    if (typeof e.refresh_on === "number") return e.refresh_on * 1000;
    if (typeof e.refresh_on === "string") {
      let t = +e.refresh_on;
      if (!isNaN(t)) return t * 1000;
      let parse = Date.parse(e.refresh_on);
      if (!isNaN(parse)) return parse;
    }
    throw Error(`Failed to parse refresh_on from body. refresh_on="${e.refresh_on}"`);
  } else return;
}

export { Ld, Hd, eo, Ud };
