/**
 * qrcode/lib/core/numeric-data.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_mode } from "./mode.js";

//@ chunk-s2h2kd6t.js:11429-11961 cjs-fingerprint
var require_numeric_data = __commonJS(function (cjsExports, cjsModule) {
  var Mode = require_mode();
  function NumericData(data) {
    this.mode = Mode.NUMERIC;
    this.data = data.toString();
  }
  NumericData.getBitsLength = function (length) {
    return 10 * Math.floor(length / 3) + (length % 3 ? (length % 3) * 3 + 1 : 0);
  };
  NumericData.prototype.getLength = function () {
    return this.data.length;
  };
  NumericData.prototype.getBitsLength = function () {
    return NumericData.getBitsLength(this.data.length);
  };
  NumericData.prototype.write = function (bitBuffer) {
    let i_2;
    let group;
    let value;
    for (i_2 = 0; i_2 + 3 <= this.data.length; i_2 += 3) {
      group = this.data.substr(i_2, 3);
      value = parseInt(group, 10);
      bitBuffer.put(value, 10);
    }
    let remainingNum = this.data.length - i_2;
    if (remainingNum > 0) {
      group = this.data.substr(i_2);
      value = parseInt(group, 10);
      bitBuffer.put(value, remainingNum * 3 + 1);
    }
  };
  cjsModule.exports = NumericData;
});
export { require_numeric_data };
