/**
 * @smithy/util-base64/dist-cjs/fromBase64.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-base64@2.3.0
 * pieces: chunk-2v4fe6xx.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util_buffer_from } from "../../util-buffer-from/dist-cjs/index.js";

//@ chunk-2v4fe6xx.js:877-1251 cjs-fingerprint
var require_fromBase64 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.fromBase64 = undefined;
  var util_buffer_from_1 = require_util_buffer_from();
  var BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;
  var fromBase64 = (input) => {
    if ((input.length * 3) % 4 !== 0) throw TypeError("Incorrect padding on base64 string.");
    if (!BASE64_REGEX.exec(input)) throw TypeError("Invalid base64 string.");
    let buffer = util_buffer_from_1.fromString(input, "base64");
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  };
  cjsExports.fromBase64 = fromBase64;
});
export { require_fromBase64 };
