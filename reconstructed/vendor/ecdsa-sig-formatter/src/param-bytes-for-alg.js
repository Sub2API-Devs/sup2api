/**
 * ecdsa-sig-formatter/src/param-bytes-for-alg.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ecdsa-sig-formatter@1.0.11
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-82d8c88w.js:1109-1328 cjs-fingerprint
var require_param_bytes_for_alg = __commonJS(function (cjsExports, cjsModule) {
  function getParamSize(keySize) {
    var result = ((keySize / 8) | 0) + (keySize % 8 === 0 ? 0 : 1);
    return result;
  }
  var paramBytesForAlg = {
    ES256: getParamSize(256),
    ES384: getParamSize(384),
    ES512: getParamSize(521),
  };
  function getParamBytesForAlg(alg) {
    var paramBytes = paramBytesForAlg[alg];
    if (paramBytes) return paramBytes;
    throw Error('Unknown algorithm "' + alg + '"');
  }
  cjsModule.exports = getParamBytesForAlg;
});
export { require_param_bytes_for_alg };
