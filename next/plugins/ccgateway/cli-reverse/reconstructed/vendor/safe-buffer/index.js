/**
 * safe-buffer/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: safe-buffer@5.2.1
 * pieces: chunk-ww3dkdtg.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../runtime/bun-runtime.js";

//@ chunk-ww3dkdtg.js:229-1109 cjs-fingerprint
var require_safe_buffer = __commonJS(function (cjsExports, cjsModule) {
  /*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
  var buffer = importMetaRequire("buffer");
  var RealBuffer = buffer.Buffer;
  function copyProps(src, dst) {
    for (var key in src) dst[key] = src[key];
  }
  if (RealBuffer.from && RealBuffer.alloc && RealBuffer.allocUnsafe && RealBuffer.allocUnsafeSlow)
    cjsModule.exports = buffer;
  else {
    copyProps(buffer, cjsExports);
    cjsExports.Buffer = SafeBuffer;
  }
  function SafeBuffer(arg, encodingOrOffset, length) {
    return RealBuffer(arg, encodingOrOffset, length);
  }
  SafeBuffer.prototype = Object.create(RealBuffer.prototype);
  copyProps(RealBuffer, SafeBuffer);
  SafeBuffer.from = function (arg, encodingOrOffset, length) {
    if (typeof arg === "number") throw TypeError("Argument must not be a number");
    return RealBuffer(arg, encodingOrOffset, length);
  };
  SafeBuffer.alloc = function (size, fill, encoding) {
    if (typeof size !== "number") throw TypeError("Argument must be a number");
    var buf = RealBuffer(size);
    if (fill !== undefined) {
      if (typeof encoding === "string") buf.fill(fill, encoding);
      else buf.fill(fill);
    } else buf.fill(0);
    return buf;
  };
  SafeBuffer.allocUnsafe = function (size) {
    if (typeof size !== "number") throw TypeError("Argument must be a number");
    return RealBuffer(size);
  };
  SafeBuffer.allocUnsafeSlow = function (size) {
    if (typeof size !== "number") throw TypeError("Argument must be a number");
    return buffer.SlowBuffer(size);
  };
});
export { require_safe_buffer };
