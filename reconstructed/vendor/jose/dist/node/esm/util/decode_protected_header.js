/**
 * jose/dist/node/esm/util/decode_protected_header.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (4), chunk-5h78gfwc.js (1)
 * attribution: esm-layout 3, esm-fingerprint 2
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { init_buffer_utils_2 } from "../lib/buffer_utils.js";
import {
  init_content_encryption,
  init_content_encryption_2,
  F,
} from "../../../webapi/lib/content_encryption.js";
import { init_base64url, decode, C } from "../../../browser/runtime/base64url.js";
import { K } from "../../../webapi/lib/validate.js";
import { textDecoder } from "../../../webapi/lib/buffer_utils.js";
import { decode_2 } from "../../../webapi/util/base64url.js";
import { isObject } from "../../../webapi/lib/type_checks.js";

//@ chunk-2tyrgda4.js:41765-41803 esm-layout
var init_decode_protected_header = Xa(() => {
  init_buffer_utils_2();
  init_content_encryption();
  init_content_encryption_2();
  init_base64url();
  F();
});
//@ chunk-2tyrgda4.js:41803-41810 esm-layout
var decode_default;
//@ chunk-2tyrgda4.js:41810-41836 esm-layout
var init_decode_protected_header_2 = Xa(() => {
  init_content_encryption();
  decode_default = decode;
});
//@ chunk-2tyrgda4.js:41836-42251 esm-fingerprint
function decodeProtectedHeader_2(token) {
  let protectedB64u;
  if (typeof token === "string") {
    let parts = token.split(".");
    if (parts.length === 3 || parts.length === 5) [protectedB64u] = parts;
  } else if (typeof token === "object" && token)
    if ("protected" in token) protectedB64u = token.protected;
    else throw TypeError("Token does not contain a Protected Header");
  try {
    if (typeof protectedB64u !== "string" || !protectedB64u) throw Error();
    let result = JSON.parse(C.decode(decode_default(protectedB64u)));
    if (!K(result)) throw Error();
    return result;
  } catch (error) {
    throw TypeError("Invalid Token or Protected Header formatting");
  }
}
//@ chunk-5h78gfwc.js:48800-49212 esm-fingerprint
function decodeProtectedHeader(token) {
  let protectedB64u;
  if (typeof token === "string") {
    let parts = token.split(".");
    if (parts.length === 3 || parts.length === 5) [protectedB64u] = parts;
  } else if (typeof token === "object" && token)
    if ("protected" in token) protectedB64u = token.protected;
    else throw TypeError("Token does not contain a Protected Header");
  try {
    if (typeof protectedB64u !== "string" || !protectedB64u) throw Error();
    let result = JSON.parse(textDecoder.decode(decode_2(protectedB64u)));
    if (!isObject(result)) throw Error();
    return result;
  } catch {
    throw TypeError("Invalid Token or Protected Header formatting");
  }
}
export { decodeProtectedHeader, init_decode_protected_header_2, init_decode_protected_header };
