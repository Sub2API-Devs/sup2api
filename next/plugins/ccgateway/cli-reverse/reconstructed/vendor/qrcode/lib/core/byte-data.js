/**
 * qrcode/lib/core/byte-data.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_mode } from "./mode.js";

//@ chunk-spjgqa4y.js:12654-13100 cjs-fingerprint
var require_byte_data = __commonJS(function (cjsExports, cjsModule) {
  var Mode = require_mode();
  function ByteData(data) {
    this.mode = Mode.BYTE;
    if (typeof data === "string") this.data = new TextEncoder().encode(data);
    else this.data = new Uint8Array(data);
  }
  ByteData.getBitsLength = function (length) {
    return length * 8;
  };
  ByteData.prototype.getLength = function () {
    return this.data.length;
  };
  ByteData.prototype.getBitsLength = function () {
    return ByteData.getBitsLength(this.data.length);
  };
  ByteData.prototype.write = function (bitBuffer) {
    for (let i = 0, l = this.data.length; i < l; i++) bitBuffer.put(this.data[i], 8);
  };
  cjsModule.exports = ByteData;
});
export { require_byte_data };
