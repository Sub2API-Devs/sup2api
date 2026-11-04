/**
 * ecdsa-sig-formatter/src/ecdsa-sig-formatter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ecdsa-sig-formatter@1.0.11
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_safe_buffer } from "../../safe-buffer/index.js";
import { require_param_bytes_for_alg } from "./param-bytes-for-alg.js";

//@ chunk-82d8c88w.js:1328-3287 cjs-fingerprint
var require_ecdsa_sig_formatter = __commonJS(function (cjsExports, cjsModule) {
  var BufferCtor = require_safe_buffer().Buffer;
  var getParamBytesForAlg = require_param_bytes_for_alg();
  var MAX_OCTET = 128;
  var CLASS_UNIVERSAL = 0;
  var PRIMITIVE_BIT = 32;
  var TAG_SEQ = 16;
  var TAG_INT = 2;
  var ENCODED_TAG_SEQ = TAG_SEQ | PRIMITIVE_BIT | (CLASS_UNIVERSAL << 6);
  var ENCODED_TAG_INT = TAG_INT | (CLASS_UNIVERSAL << 6);
  function base64Url(base64) {
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function signatureAsBuffer(signature) {
    if (BufferCtor.isBuffer(signature)) return signature;
    else if (typeof signature === "string") return BufferCtor.from(signature, "base64");
    throw TypeError("ECDSA signature must be a Base64 string or a Buffer");
  }
  function derToJose(signature, alg) {
    signature = signatureAsBuffer(signature);
    var paramBytes = getParamBytesForAlg(alg);
    var maxEncodedParamLength = paramBytes + 1;
    var inputLength = signature.length;
    var offset = 0;
    if (signature[offset++] !== ENCODED_TAG_SEQ) throw Error('Could not find expected "seq"');
    var seqLength = signature[offset++];
    if (seqLength === (MAX_OCTET | 1)) seqLength = signature[offset++];
    if (inputLength - offset < seqLength)
      throw Error(
        '"seq" specified length of "' + seqLength + '", only "' + (inputLength - offset) + '" remaining',
      );
    if (signature[offset++] !== ENCODED_TAG_INT) throw Error('Could not find expected "int" for "r"');
    var rLength = signature[offset++];
    if (inputLength - offset - 2 < rLength)
      throw Error(
        '"r" specified length of "' + rLength + '", only "' + (inputLength - offset - 2) + '" available',
      );
    if (maxEncodedParamLength < rLength)
      throw Error(
        '"r" specified length of "' + rLength + '", max of "' + maxEncodedParamLength + '" is acceptable',
      );
    var rOffset = offset;
    offset += rLength;
    if (signature[offset++] !== ENCODED_TAG_INT) throw Error('Could not find expected "int" for "s"');
    var sLength = signature[offset++];
    if (inputLength - offset !== sLength)
      throw Error('"s" specified length of "' + sLength + '", expected "' + (inputLength - offset) + '"');
    if (maxEncodedParamLength < sLength)
      throw Error(
        '"s" specified length of "' + sLength + '", max of "' + maxEncodedParamLength + '" is acceptable',
      );
    var sOffset = offset;
    offset += sLength;
    if (offset !== inputLength)
      throw Error('Expected to consume entire buffer, but "' + (inputLength - offset) + '" bytes remain');
    var rPadding = paramBytes - rLength;
    var sPadding = paramBytes - sLength;
    var dst = BufferCtor.allocUnsafe(rPadding + rLength + sPadding + sLength);
    for (offset = 0; offset < rPadding; ++offset) dst[offset] = 0;
    signature.copy(dst, offset, rOffset + Math.max(-rPadding, 0), rOffset + rLength);
    offset = paramBytes;
    for (var o = offset; offset < o + sPadding; ++offset) dst[offset] = 0;
    signature.copy(dst, offset, sOffset + Math.max(-sPadding, 0), sOffset + sLength);
    dst = dst.toString("base64");
    dst = base64Url(dst);
    return dst;
  }
  function countPadding(buf, start, stop) {
    var padding = 0;
    while (start + padding < stop && buf[start + padding] === 0) ++padding;
    var needsSign = buf[start + padding] >= MAX_OCTET;
    if (needsSign) --padding;
    return padding;
  }
  function joseToDer(signature, alg) {
    signature = signatureAsBuffer(signature);
    var paramBytes = getParamBytesForAlg(alg);
    var signatureBytes = signature.length;
    if (signatureBytes !== paramBytes * 2)
      throw TypeError(
        '"' + alg + '" signatures must be "' + paramBytes * 2 + '" bytes, saw "' + signatureBytes + '"',
      );
    var rPadding = countPadding(signature, 0, paramBytes);
    var sPadding = countPadding(signature, paramBytes, signature.length);
    var rLength = paramBytes - rPadding;
    var sLength = paramBytes - sPadding;
    var rsBytes = 2 + rLength + 1 + 1 + sLength;
    var shortLength = rsBytes < MAX_OCTET;
    var dst = BufferCtor.allocUnsafe((shortLength ? 2 : 3) + rsBytes);
    var offset = 0;
    dst[offset++] = ENCODED_TAG_SEQ;
    if (shortLength) dst[offset++] = rsBytes;
    else {
      dst[offset++] = MAX_OCTET | 1;
      dst[offset++] = rsBytes & 255;
    }
    dst[offset++] = ENCODED_TAG_INT;
    dst[offset++] = rLength;
    if (rPadding < 0) {
      dst[offset++] = 0;
      offset += signature.copy(dst, offset, 0, paramBytes);
    } else offset += signature.copy(dst, offset, rPadding, paramBytes);
    dst[offset++] = ENCODED_TAG_INT;
    dst[offset++] = sLength;
    if (sPadding < 0) {
      dst[offset++] = 0;
      signature.copy(dst, offset, paramBytes);
    } else signature.copy(dst, offset, paramBytes + sPadding);
    return dst;
  }
  cjsModule.exports = {
    derToJose,
    joseToDer,
  };
});
export { require_ecdsa_sig_formatter };
