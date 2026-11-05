/**
 * pngjs/lib/crc.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-s2h2kd6t.js:26646-27104 cjs-fingerprint
var require_crc = __commonJS(function (cjsExports, cjsModule) {
  var crcTable = [];
  (function () {
    for (let i = 0; i < 256; i++) {
      let currentCrc = i;
      for (let j = 0; j < 8; j++)
        if (currentCrc & 1) currentCrc = 3988292384 ^ (currentCrc >>> 1);
        else currentCrc = currentCrc >>> 1;
      crcTable[i] = currentCrc;
    }
  })();
  var CrcCalculator = (cjsModule.exports = function () {
    this._crc = -1;
  });
  CrcCalculator.prototype.write = function (data) {
    for (let i = 0; i < data.length; i++)
      this._crc = crcTable[(this._crc ^ data[i]) & 255] ^ (this._crc >>> 8);
    return true;
  };
  CrcCalculator.prototype.crc32 = function () {
    return this._crc ^ -1;
  };
  CrcCalculator.crc32 = function (buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 255] ^ (crc >>> 8);
    return crc ^ -1;
  };
});
export { require_crc };
