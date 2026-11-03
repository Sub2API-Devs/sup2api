/**
 * @azure/identity/dist/esm/util/scopeUtils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { q } from "./logging.js";

//@ chunk-mrx6y2r5.js:311448-311493 esm-layout
function Rs(e) {
  return Array.isArray(e) ? e : [e];
}
//@ chunk-mrx6y2r5.js:311493-311652 esm-fingerprint
function Hn(e, t) {
  if (!e.match(/^[0-9a-zA-Z-_.:/]+$/)) {
    let r = Error("Invalid scope was specified by the user or calling client");
    throw (t.getToken.info(q(e, r)), r);
  }
}
//@ chunk-mrx6y2r5.js:311652-311702 esm-fingerprint
function ws(e) {
  return e.replace(/\/.default$/, "");
}

export { Hn, ws, Rs };
