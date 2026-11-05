/**
 * node-forge/lib/cipher.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_util } from "./util.js";

//@ chunk-qg41pqt6.js:28338-30350 cjs-fingerprint
var require_cipher = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_util();
  cjsModule.exports = forge.cipher = forge.cipher || {};
  forge.cipher.algorithms = forge.cipher.algorithms || {};
  forge.cipher.createCipher = function (algorithm, key) {
    var api = algorithm;
    if (typeof api === "string") {
      api = forge.cipher.getAlgorithm(api);
      if (api) api = api();
    }
    if (!api) throw Error("Unsupported algorithm: " + algorithm);
    return new forge.cipher.BlockCipher({
      algorithm: api,
      key,
      decrypt: false,
    });
  };
  forge.cipher.createDecipher = function (algorithm, key) {
    var api = algorithm;
    if (typeof api === "string") {
      api = forge.cipher.getAlgorithm(api);
      if (api) api = api();
    }
    if (!api) throw Error("Unsupported algorithm: " + algorithm);
    return new forge.cipher.BlockCipher({
      algorithm: api,
      key,
      decrypt: true,
    });
  };
  forge.cipher.registerAlgorithm = function (name, algorithm) {
    name = name.toUpperCase();
    forge.cipher.algorithms[name] = algorithm;
  };
  forge.cipher.getAlgorithm = function (name) {
    name = name.toUpperCase();
    if (name in forge.cipher.algorithms) return forge.cipher.algorithms[name];
    return null;
  };
  var BlockCipher = (forge.cipher.BlockCipher = function (options) {
    this.algorithm = options.algorithm;
    this.mode = this.algorithm.mode;
    this.blockSize = this.mode.blockSize;
    this._finish = false;
    this._input = null;
    this.output = null;
    this._op = options.decrypt ? this.mode.decrypt : this.mode.encrypt;
    this._decrypt = options.decrypt;
    this.algorithm.initialize(options);
  });
  BlockCipher.prototype.start = function (options) {
    options = options || {};
    var opts = {};
    for (var key in options) opts[key] = options[key];
    opts.decrypt = this._decrypt;
    this._finish = false;
    this._input = forge.util.createBuffer();
    this.output = options.output || forge.util.createBuffer();
    this.mode.start(opts);
  };
  BlockCipher.prototype.update = function (input) {
    if (input) this._input.putBuffer(input);
    while (!this._op.call(this.mode, this._input, this.output, this._finish) && !this._finish);
    this._input.compact();
  };
  BlockCipher.prototype.finish = function (pad) {
    if (pad && (this.mode.name === "ECB" || this.mode.name === "CBC")) {
      this.mode.pad = function (input) {
        return pad(this.blockSize, input, false);
      };
      this.mode.unpad = function (output) {
        return pad(this.blockSize, output, true);
      };
    }
    var options = {};
    options.decrypt = this._decrypt;
    options.overflow = this._input.length() % this.blockSize;
    if (!this._decrypt && this.mode.pad) {
      if (!this.mode.pad(this._input, options)) return false;
    }
    this._finish = true;
    this.update();
    if (this._decrypt && this.mode.unpad) {
      if (!this.mode.unpad(this.output, options)) return false;
    }
    if (this.mode.afterFinish) {
      if (!this.mode.afterFinish(this.output, options)) return false;
    }
    return true;
  };
});
export { require_cipher };
