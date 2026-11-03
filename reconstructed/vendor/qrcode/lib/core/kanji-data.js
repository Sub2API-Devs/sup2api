/**
 * qrcode/lib/core/kanji-data.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { q } from "./mode.js";
import { N } from "./utils.js";

//@ chunk-spjgqa4y.js:13100-13686 cjs-fingerprint
var wr = x(function (Nl, yr) {
  var _r = q(),
    mr = N();
  function ee(t) {
    ((this.mode = _r.KANJI), (this.data = t));
  }
  ee.getBitsLength = function (e) {
    return e * 13;
  };
  ee.prototype.getLength = function () {
    return this.data.length;
  };
  ee.prototype.getBitsLength = function () {
    return ee.getBitsLength(this.data.length);
  };
  ee.prototype.write = function (t) {
    let e;
    for (e = 0; e < this.data.length; e++) {
      let toSJIS = mr.toSJIS(this.data[e]);
      if (toSJIS >= 33088 && toSJIS <= 40956) toSJIS -= 33088;
      else if (toSJIS >= 57408 && toSJIS <= 60351) toSJIS -= 49472;
      else
        throw Error(
          "Invalid SJIS character: " +
            this.data[e] +
            `
Make sure your charset is UTF-8`,
        );
      ((toSJIS = ((toSJIS >>> 8) & 255) * 192 + (toSJIS & 255)), t.put(toSJIS, 13));
    }
  };
  yr.exports = ee;
});

export { wr };
