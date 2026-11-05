/**
 * @smithy/util-buffer-from/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-buffer-from@2.2.0..3.0.0
 * pieces: chunk-2v4fe6xx.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_is_array_buffer } from "../../is-array-buffer/dist-cjs/index.js";

//@ chunk-2v4fe6xx.js:440-877 cjs-fingerprint
var require_util_buffer_from = __commonJS(function (cjsExports) {
  var import_is_array_buffer = require_is_array_buffer();
  var import_buffer = importMetaRequire("buffer");
  var fromArrayBuffer = (input, offset = 0, length = input.byteLength - offset) => {
    if (!import_is_array_buffer.isArrayBuffer(input))
      throw TypeError(`The "input" argument must be ArrayBuffer. Received type ${typeof input} (${input})`);
    return import_buffer.Buffer.from(input, offset, length);
  };
  var fromString = (input, encoding) => {
    if (typeof input !== "string")
      throw TypeError(
        `The "input" argument must be of type string. Received type ${typeof input} (${input})`,
      );
    return encoding ? import_buffer.Buffer.from(input, encoding) : import_buffer.Buffer.from(input);
  };
  cjsExports.fromArrayBuffer = fromArrayBuffer;
  cjsExports.fromString = fromString;
});
export { require_util_buffer_from };
