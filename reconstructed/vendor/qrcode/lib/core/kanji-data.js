/**
 * qrcode/lib/core/kanji-data.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_mode } from "./mode.js";
import { require_utils } from "./utils.js";

//@ chunk-spjgqa4y.js:13100-13686 cjs-fingerprint
var require_kanji_data = x(function (cjsExports, cjsModule) {
  var Mode = require_mode();
  var Utils = require_utils();
  function KanjiData(data) {
    this.mode = Mode.KANJI;
    this.data = data;
  }
  KanjiData.getBitsLength = function (length) {
    return length * 13;
  };
  KanjiData.prototype.getLength = function () {
    return this.data.length;
  };
  KanjiData.prototype.getBitsLength = function () {
    return KanjiData.getBitsLength(this.data.length);
  };
  KanjiData.prototype.write = function (bitBuffer) {
    let i;
    for (i = 0; i < this.data.length; i++) {
      let value = Utils.toSJIS(this.data[i]);
      if (value >= 33088 && value <= 40956) value -= 33088;
      else if (value >= 57408 && value <= 60351) value -= 49472;
      else
        throw Error(
          "Invalid SJIS character: " +
            this.data[i] +
            `
Make sure your charset is UTF-8`,
        );
      value = ((value >>> 8) & 255) * 192 + (value & 255);
      bitBuffer.put(value, 13);
    }
  };
  cjsModule.exports = KanjiData;
});
export { require_kanji_data };
