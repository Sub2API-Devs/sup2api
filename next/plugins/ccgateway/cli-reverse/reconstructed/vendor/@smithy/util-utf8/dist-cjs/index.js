/**
 * @smithy/util-utf8/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-utf8@2.3.0..3.0.0
 * pieces: chunk-2v4fe6xx.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_util_buffer_from } from "../../util-buffer-from/dist-cjs/index.js";

//@ chunk-2v4fe6xx.js:1251-1939 cjs-fingerprint
var require_util_utf8 = __commonJS(function (cjsExports) {
  var import_util_buffer_from = require_util_buffer_from();
  var fromUtf8 = (input) => {
    let buf = import_util_buffer_from.fromString(input, "utf8");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
  };
  var toUint8Array = (data) => {
    if (typeof data === "string") return fromUtf8(data);
    if (ArrayBuffer.isView(data))
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
    return new Uint8Array(data);
  };
  var toUtf8 = (input) => {
    if (typeof input === "string") return input;
    if (
      typeof input !== "object" ||
      typeof input.byteOffset !== "number" ||
      typeof input.byteLength !== "number"
    )
      throw Error("@smithy/util-utf8: toUtf8 encoder function only accepts string | Uint8Array.");
    return import_util_buffer_from
      .fromArrayBuffer(input.buffer, input.byteOffset, input.byteLength)
      .toString("utf8");
  };
  cjsExports.fromUtf8 = fromUtf8;
  cjsExports.toUint8Array = toUint8Array;
  cjsExports.toUtf8 = toUtf8;
});
export { require_util_utf8 };
