/**
 * @smithy/util-hex-encoding/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-hex-encoding@2.2.0..3.0.0
 * pieces: chunk-g7fzcphx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-g7fzcphx.js:226-761 cjs-fingerprint
var K6t = x(function (c) {
  var i = {},
    r = {};
  for (let e = 0; e < 256; e++) {
    let lower = e.toString(16).toLowerCase();
    if (lower.length === 1) lower = `0${lower}`;
    ((i[e] = lower), (r[lower] = e));
  }
  function s(e) {
    if (e.length % 2 !== 0) throw Error("Hex encoded strings must have an even number length");
    let uint8Array = new Uint8Array(e.length / 2);
    for (let n = 0; n < e.length; n += 2) {
      let lower = e.slice(n, n + 2).toLowerCase();
      if (lower in r) uint8Array[n / 2] = r[lower];
      else throw Error(`Cannot decode unrecognized sequence ${lower} as hexadecimal`);
    }
    return uint8Array;
  }
  function l(e) {
    let t = "";
    for (let n = 0; n < e.byteLength; n++) t += i[e[n]];
    return t;
  }
  c.fromHex = s;
  c.toHex = l;
});

export { K6t };
