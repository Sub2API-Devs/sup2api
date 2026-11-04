/**
 * @aws-crypto/sha256-js/build/module/jsSha256.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-crypto/sha256-js@5.2.0
 * pieces: chunk-cdckcchh.js (2)
 * attribution: esm-fingerprint 2
 */
import { RawSha256 } from "./RawSha256.js";
import { isEmptyString } from "../../../util/build/module/numToUint8.js";
import { convertToBuffer } from "../../../util/build/convertToBuffer.js";
import { __awaiter, __generator } from "../../../../tslib/tslib.es6.mjs";
import { SHA256_BLOCK_SIZE } from "./constants.js";

//@ chunk-cdckcchh.js:2960-3736 esm-fingerprint
/**
 * 第三方 HMAC/SHA-256 封装（secret 存在时为 HMAC）。应归 vendor。
 */
var Sha256 = (function () {
  function Sha256(secret) {
    this.secret = secret;
    this.hash = new RawSha256();
    this.reset();
  }
  Sha256.prototype.update = function (toHash) {
    if (isEmptyString(toHash) || this.error) return;
    try {
      this.hash.update(convertToBuffer(toHash));
    } catch (e) {
      this.error = e;
    }
  };
  Sha256.prototype.digestSync = function () {
    if (this.error) throw this.error;
    if (this.outer) {
      if (!this.outer.finished) this.outer.update(this.hash.digest());
      return this.outer.digest();
    }
    return this.hash.digest();
  };
  Sha256.prototype.digest = function () {
    return __awaiter(this, undefined, undefined, function () {
      return __generator(this, function (_a) {
        return [2, this.digestSync()];
      });
    });
  };
  Sha256.prototype.reset = function () {
    this.hash = new RawSha256();
    if (this.secret) {
      this.outer = new RawSha256();
      var inner = bufferForHmacKey(this.secret);
      var outer = new Uint8Array(SHA256_BLOCK_SIZE);
      outer.set(inner);
      for (var i = 0; i < SHA256_BLOCK_SIZE; i++) {
        inner[i] ^= 54;
        outer[i] ^= 92;
      }
      this.hash.update(inner);
      this.outer.update(outer);
      for (var i = 0; i < inner.byteLength; i++) inner[i] = 0;
    }
  };
  return Sha256;
})();
//@ chunk-cdckcchh.js:3736-3861 esm-fingerprint
/**
 * HMAC 密钥规整到块大小（长密钥先哈希）。
 */
function bufferForHmacKey(secret) {
  var input = convertToBuffer(secret);
  if (input.byteLength > SHA256_BLOCK_SIZE) {
    var bufferHash = new RawSha256();
    bufferHash.update(input);
    input = bufferHash.digest();
  }
  var buffer = new Uint8Array(SHA256_BLOCK_SIZE);
  buffer.set(input);
  return buffer;
}
export { Sha256 };
