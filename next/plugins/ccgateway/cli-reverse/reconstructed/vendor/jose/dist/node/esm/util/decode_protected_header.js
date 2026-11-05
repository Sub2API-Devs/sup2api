/**
 * jose/dist/node/esm/util/decode_protected_header.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (1), chunk-pd6th42n.js (4)
 * attribution: esm-fingerprint 2, esm-layout 3
 */
import { textDecoder, init_buffer_utils_2 } from "../../../webapi/lib/buffer_utils.js";
import { decode } from "../../../webapi/util/base64url.js";
import { isObject } from "../../../webapi/lib/type_checks.js";
import { __esm } from "../../../../../../runtime/bun-runtime.js";
import {
  init_content_encryption,
  init_content_encryption_2,
  noopClaims,
} from "../../../webapi/lib/content_encryption.js";
import { init_base64url, decode_2, decoder } from "../../../browser/runtime/base64url.js";
import { isPlainObject } from "../../../webapi/lib/validate.js";

//@ chunk-0f6azspv.js:48800-49212 esm-fingerprint
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
    let result = JSON.parse(textDecoder.decode(decode(protectedB64u)));
    if (!isObject(result)) throw Error();
    return result;
  } catch {
    throw TypeError("Invalid Token or Protected Header formatting");
  }
}
//@ chunk-pd6th42n.js:41765-41803 esm-layout
var init_decode_protected_header = __esm(() => {
  init_buffer_utils_2();
  init_content_encryption();
  init_content_encryption_2();
  init_base64url();
  noopClaims();
});
//@ chunk-pd6th42n.js:41803-41810 esm-layout
var decode_default;
//@ chunk-pd6th42n.js:41810-41836 esm-layout
var init_decode_protected_header_2 = __esm(() => {
  init_content_encryption();
  decode_default = decode_2;
});
//@ chunk-pd6th42n.js:41836-42251 esm-fingerprint
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
    let result = JSON.parse(decoder.decode(decode_default(protectedB64u)));
    if (!isPlainObject(result)) throw Error();
    return result;
  } catch (error) {
    throw TypeError("Invalid Token or Protected Header formatting");
  }
}
export {
  decodeProtectedHeader,
  init_decode_protected_header_2,
  init_decode_protected_header,
  decodeProtectedHeader_2,
};
