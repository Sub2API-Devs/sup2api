/**
 * qrcode/lib/core/numeric-data.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { q } from "./mode.js";

//@ chunk-spjgqa4y.js:11429-11961 cjs-fingerprint
var fr = x(function (kl, ur) {
  var lr = q();
  function Q(t) {
    ((this.mode = lr.NUMERIC), (this.data = t.toString()));
  }
  Q.getBitsLength = function (e) {
    return 10 * Math.floor(e / 3) + (e % 3 ? (e % 3) * 3 + 1 : 0);
  };
  Q.prototype.getLength = function () {
    return this.data.length;
  };
  Q.prototype.getBitsLength = function () {
    return Q.getBitsLength(this.data.length);
  };
  Q.prototype.write = function (e) {
    let r, n, i;
    for (r = 0; r + 3 <= this.data.length; r += 3)
      ((n = this.data.substr(r, 3)), (i = parseInt(n, 10)), e.put(i, 10));
    let o = this.data.length - r;
    if (o > 0) ((n = this.data.substr(r)), (i = parseInt(n, 10)), e.put(i, o * 3 + 1));
  };
  ur.exports = Q;
});

export { fr };
