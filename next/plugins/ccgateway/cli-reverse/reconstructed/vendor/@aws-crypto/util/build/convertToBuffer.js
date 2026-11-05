/**
 * @aws-crypto/util/build/convertToBuffer.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-crypto/util@3.0.0..4.0.0
 * pieces: chunk-jcm8ph2a.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_util_utf8 } from "../../../@smithy/util-utf8/dist-cjs/index.js";

//@ chunk-jcm8ph2a.js:263-364 esm-layout
var util_utf8_browser_1 = __toESM(require_util_utf8());
var fromUtf8 =
  typeof Buffer !== "undefined" && Buffer.from
    ? function (input) {
        return Buffer.from(input, "utf8");
      }
    : util_utf8_browser_1.fromUtf8;
//@ chunk-jcm8ph2a.js:364-588 esm-fingerprint
function convertToBuffer(data) {
  if (data instanceof Uint8Array) return data;
  if (typeof data === "string") return fromUtf8(data);
  if (ArrayBuffer.isView(data))
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
  return new Uint8Array(data);
}
export { convertToBuffer };
