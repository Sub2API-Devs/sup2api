/**
 * @smithy/util-hex-encoding/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-hex-encoding@2.2.0..3.0.0
 * pieces: chunk-ekgx5y4s.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-ekgx5y4s.js:226-761 cjs-fingerprint
var require_util_hex_encoding = __commonJS(function (cjsExports) {
  var SHORT_TO_HEX = {};
  var HEX_TO_SHORT = {};
  for (let i = 0; i < 256; i++) {
    let encodedByte = i.toString(16).toLowerCase();
    if (encodedByte.length === 1) encodedByte = `0${encodedByte}`;
    SHORT_TO_HEX[i] = encodedByte;
    HEX_TO_SHORT[encodedByte] = i;
  }
  function fromHex(encoded) {
    if (encoded.length % 2 !== 0) throw Error("Hex encoded strings must have an even number length");
    let out = new Uint8Array(encoded.length / 2);
    for (let i = 0; i < encoded.length; i += 2) {
      let encodedByte = encoded.slice(i, i + 2).toLowerCase();
      if (encodedByte in HEX_TO_SHORT) out[i / 2] = HEX_TO_SHORT[encodedByte];
      else throw Error(`Cannot decode unrecognized sequence ${encodedByte} as hexadecimal`);
    }
    return out;
  }
  function toHex(bytes) {
    let out = "";
    for (let i = 0; i < bytes.byteLength; i++) out += SHORT_TO_HEX[bytes[i]];
    return out;
  }
  cjsExports.fromHex = fromHex;
  cjsExports.toHex = toHex;
});
export { require_util_hex_encoding };
