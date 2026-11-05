/**
 * @smithy/util-base64/dist-cjs/toBase64.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-base64@2.3.0
 * pieces: chunk-2v4fe6xx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util_buffer_from } from "../../util-buffer-from/dist-cjs/index.js";
import { require_util_utf8 } from "../../util-utf8/dist-cjs/index.js";

//@ chunk-2v4fe6xx.js:1939-2388 cjs-fingerprint
var require_toBase64 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.toBase64 = undefined;
  var util_buffer_from_1 = require_util_buffer_from();
  var util_utf8_1 = require_util_utf8();
  var toBase64 = (_input) => {
    let input;
    if (typeof _input === "string") input = util_utf8_1.fromUtf8(_input);
    else input = _input;
    if (
      typeof input !== "object" ||
      typeof input.byteOffset !== "number" ||
      typeof input.byteLength !== "number"
    )
      throw Error("@smithy/util-base64: toBase64 encoder function only accepts string | Uint8Array.");
    return util_buffer_from_1
      .fromArrayBuffer(input.buffer, input.byteOffset, input.byteLength)
      .toString("base64");
  };
  cjsExports.toBase64 = toBase64;
});
export { require_toBase64 };
