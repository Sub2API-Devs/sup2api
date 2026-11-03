/**
 * node-forge/lib/mgf1.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:158192-158596 cjs-fingerprint
var AS = x(function (Nfe, bA) {
  var lc = Tn();
  Zn();
  lc.mgf = lc.mgf || {};
  var OG = (bA.exports = lc.mgf.mgf1 = lc.mgf1 = lc.mgf1 || {});
  OG.create = function (e) {
    var n = {
      generate: function (r, s) {
        var h = new lc.util.ByteBuffer(),
          ceil = Math.ceil(s / e.digestLength);
        for (var b = 0; b < ceil; b++) {
          var S = new lc.util.ByteBuffer();
          (S.putInt32(b), e.start(), e.update(r + S.getBytes()), h.putBuffer(e.digest()));
        }
        return (h.truncate(h.length() - s), h.getBytes());
      },
    };
    return n;
  };
});

export { AS };
