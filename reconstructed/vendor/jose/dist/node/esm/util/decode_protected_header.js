/**
 * jose/dist/node/esm/util/decode_protected_header.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (4), chunk-5h78gfwc.js (1)
 * attribution: esm-layout 3, esm-fingerprint 2
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { Ie } from "../lib/buffer_utils.js";
import { P, E, F } from "../../../webapi/lib/content_encryption.js";
import { v, S, C } from "../../../browser/runtime/base64url.js";
import { K } from "../../../webapi/lib/validate.js";
import { textDecoder } from "../../../webapi/lib/buffer_utils.js";
import { v_2 } from "../../../webapi/util/base64url.js";
import { b } from "../../../webapi/lib/type_checks.js";

//@ chunk-2tyrgda4.js:41765-41803 esm-layout
var ar = Xa(() => {
  Ie();
  P();
  E();
  v();
  F();
});
//@ chunk-2tyrgda4.js:41803-41810 esm-layout
var ir;
//@ chunk-2tyrgda4.js:41810-41836 esm-layout
var sr = Xa(() => {
  P();
  ir = S;
});
//@ chunk-2tyrgda4.js:41836-42251 esm-fingerprint
function Xr(e) {
  let t;
  if (typeof e === "string") {
    let parts = e.split(".");
    if (parts.length === 3 || parts.length === 5) [t] = parts;
  } else if (typeof e === "object" && e)
    if ("protected" in e) t = e.protected;
    else throw TypeError("Token does not contain a Protected Header");
  try {
    if (typeof t !== "string" || !t) throw Error();
    let parsed = JSON.parse(C.decode(ir(t)));
    if (!K(parsed)) throw Error();
    return parsed;
  } catch (error) {
    throw TypeError("Invalid Token or Protected Header formatting");
  }
}
//@ chunk-5h78gfwc.js:48800-49212 esm-fingerprint
function decodeProtectedHeader(e) {
  let t;
  if (typeof e === "string") {
    let parts = e.split(".");
    if (parts.length === 3 || parts.length === 5) [t] = parts;
  } else if (typeof e === "object" && e)
    if ("protected" in e) t = e.protected;
    else throw TypeError("Token does not contain a Protected Header");
  try {
    if (typeof t !== "string" || !t) throw Error();
    let parsed = JSON.parse(textDecoder.decode(v_2(t)));
    if (!b(parsed)) throw Error();
    return parsed;
  } catch {
    throw TypeError("Invalid Token or Protected Header formatting");
  }
}

export { decodeProtectedHeader, sr, ar };
