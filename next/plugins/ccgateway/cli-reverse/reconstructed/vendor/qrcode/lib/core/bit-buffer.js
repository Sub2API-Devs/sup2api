/**
 * qrcode/lib/core/bit-buffer.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-s2h2kd6t.js:1578-2022 cjs-fingerprint
var require_bit_buffer = __commonJS(function (cjsExports, cjsModule) {
  function BitBuffer() {
    this.buffer = [];
    this.length = 0;
  }
  BitBuffer.prototype = {
    get: function (index) {
      let bufIndex = Math.floor(index / 8);
      return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
    },
    put: function (num, length) {
      for (let i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    },
    getLengthInBits: function () {
      return this.length;
    },
    putBit: function (bit) {
      let bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= 128 >>> (this.length % 8);
      this.length++;
    },
  };
  cjsModule.exports = BitBuffer;
});
export { require_bit_buffer };
