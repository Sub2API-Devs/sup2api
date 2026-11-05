/**
 * @aws-crypto/sha256-js/build/module/RawSha256.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-crypto/sha256-js@5.2.0
 * pieces: chunk-er1d5ga0.js (1)
 * attribution: esm-fingerprint 1
 */
import {
  SHA256_INIT_STATE,
  MAX_HASHABLE_LENGTH,
  SHA256_BLOCK_SIZE,
  SHA256_DIGEST_LENGTH,
  SHA256_ROUND_CONSTANTS,
} from "./constants.js";

//@ chunk-er1d5ga0.js:1106-2960 esm-fingerprint
/**
 * 第三方 SHA-256 原始哈希类（update/digest）。应归 vendor。
 */
var RawSha256 = (function () {
  function RawSha256() {
    this.state = Int32Array.from(SHA256_INIT_STATE);
    this.temp = new Int32Array(64);
    this.buffer = new Uint8Array(64);
    this.bufferLength = 0;
    this.bytesHashed = 0;
    this.finished = false;
  }
  RawSha256.prototype.update = function (data) {
    if (this.finished) throw Error("Attempted to update an already finished hash.");
    var position = 0;
    var byteLength = data.byteLength;
    this.bytesHashed += byteLength;
    if (this.bytesHashed * 8 > MAX_HASHABLE_LENGTH) throw Error("Cannot hash more than 2^53 - 1 bits");
    while (byteLength > 0) {
      this.buffer[this.bufferLength++] = data[position++];
      byteLength--;
      if (this.bufferLength === SHA256_BLOCK_SIZE) {
        this.hashBuffer();
        this.bufferLength = 0;
      }
    }
  };
  RawSha256.prototype.digest = function () {
    if (!this.finished) {
      var bitsHashed = this.bytesHashed * 8;
      var bufferView = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
      var undecoratedLength = this.bufferLength;
      bufferView.setUint8(this.bufferLength++, 128);
      if (undecoratedLength % SHA256_BLOCK_SIZE >= SHA256_BLOCK_SIZE - 8) {
        for (var i_2 = this.bufferLength; i_2 < SHA256_BLOCK_SIZE; i_2++) bufferView.setUint8(i_2, 0);
        this.hashBuffer();
        this.bufferLength = 0;
      }
      for (var i_2 = this.bufferLength; i_2 < SHA256_BLOCK_SIZE - 8; i_2++) bufferView.setUint8(i_2, 0);
      bufferView.setUint32(SHA256_BLOCK_SIZE - 8, Math.floor(bitsHashed / 4294967296), true);
      bufferView.setUint32(SHA256_BLOCK_SIZE - 4, bitsHashed);
      this.hashBuffer();
      this.finished = true;
    }
    var out = new Uint8Array(SHA256_DIGEST_LENGTH);
    for (var i_2 = 0; i_2 < 8; i_2++) {
      out[i_2 * 4] = (this.state[i_2] >>> 24) & 255;
      out[i_2 * 4 + 1] = (this.state[i_2] >>> 16) & 255;
      out[i_2 * 4 + 2] = (this.state[i_2] >>> 8) & 255;
      out[i_2 * 4 + 3] = (this.state[i_2] >>> 0) & 255;
    }
    return out;
  };
  RawSha256.prototype.hashBuffer = function () {
    var sha256 = this;
    var { buffer, state } = sha256;
    var state0 = state[0];
    var state1 = state[1];
    var state2 = state[2];
    var state3 = state[3];
    var state4 = state[4];
    var state5 = state[5];
    var state6 = state[6];
    var state7 = state[7];
    for (var i = 0; i < SHA256_BLOCK_SIZE; i++) {
      if (i < 16)
        this.temp[i] =
          ((buffer[i * 4] & 255) << 24) |
          ((buffer[i * 4 + 1] & 255) << 16) |
          ((buffer[i * 4 + 2] & 255) << 8) |
          (buffer[i * 4 + 3] & 255);
      else {
        var u = this.temp[i - 2];
        var t1_1 = ((u >>> 17) | (u << 15)) ^ ((u >>> 19) | (u << 13)) ^ (u >>> 10);
        u = this.temp[i - 15];
        var t2_1 = ((u >>> 7) | (u << 25)) ^ ((u >>> 18) | (u << 14)) ^ (u >>> 3);
        this.temp[i] = ((t1_1 + this.temp[i - 7]) | 0) + ((t2_1 + this.temp[i - 16]) | 0);
      }
      var t1 =
        ((((((state4 >>> 6) | (state4 << 26)) ^
          ((state4 >>> 11) | (state4 << 21)) ^
          ((state4 >>> 25) | (state4 << 7))) +
          ((state4 & state5) ^ (~state4 & state6))) |
          0) +
          ((state7 + ((SHA256_ROUND_CONSTANTS[i] + this.temp[i]) | 0)) | 0)) |
        0;
      var t2 =
        ((((state0 >>> 2) | (state0 << 30)) ^
          ((state0 >>> 13) | (state0 << 19)) ^
          ((state0 >>> 22) | (state0 << 10))) +
          ((state0 & state1) ^ (state0 & state2) ^ (state1 & state2))) |
        0;
      state7 = state6;
      state6 = state5;
      state5 = state4;
      state4 = (state3 + t1) | 0;
      state3 = state2;
      state2 = state1;
      state1 = state0;
      state0 = (t1 + t2) | 0;
    }
    state[0] += state0;
    state[1] += state1;
    state[2] += state2;
    state[3] += state3;
    state[4] += state4;
    state[5] += state5;
    state[6] += state6;
    state[7] += state7;
  };
  return RawSha256;
})();
export { RawSha256 };
