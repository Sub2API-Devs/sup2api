/**
 * node-forge/lib/random.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_aes } from "./aes.js";
import { require_sha256 } from "./sha256.js";
import { require_prng } from "./prng.js";
import { require_util } from "./util.js";

//@ chunk-fq0cr76a.js:88346-89883 cjs-fingerprint
var require_random = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_aes();
  require_sha256();
  require_prng();
  require_util();
  (function () {
    if (forge.random && forge.random.getBytes) {
      cjsModule.exports = forge.random;
      return;
    }
    (function (jQuery) {
      var prng_aes = {};
      var _prng_aes_output = [, , , ,];
      var _prng_aes_buffer = forge.util.createBuffer();
      prng_aes.formatKey = function (key) {
        var tmp = forge.util.createBuffer(key);
        key = [, , , ,];
        key[0] = tmp.getInt32();
        key[1] = tmp.getInt32();
        key[2] = tmp.getInt32();
        key[3] = tmp.getInt32();
        return forge.aes._expandKey(key, false);
      };
      prng_aes.formatSeed = function (seed) {
        var tmp = forge.util.createBuffer(seed);
        seed = [, , , ,];
        seed[0] = tmp.getInt32();
        seed[1] = tmp.getInt32();
        seed[2] = tmp.getInt32();
        seed[3] = tmp.getInt32();
        return seed;
      };
      prng_aes.cipher = function (key, seed) {
        forge.aes._updateBlock(key, seed, _prng_aes_output, false);
        _prng_aes_buffer.putInt32(_prng_aes_output[0]);
        _prng_aes_buffer.putInt32(_prng_aes_output[1]);
        _prng_aes_buffer.putInt32(_prng_aes_output[2]);
        _prng_aes_buffer.putInt32(_prng_aes_output[3]);
        return _prng_aes_buffer.getBytes();
      };
      prng_aes.increment = function (seed) {
        ++seed[3];
        return seed;
      };
      prng_aes.md = forge.md.sha256;
      function spawnPrng() {
        var ctx = forge.prng.create(prng_aes);
        ctx.getBytes = function (count, callback) {
          return ctx.generate(count, callback);
        };
        ctx.getBytesSync = function (count) {
          return ctx.generate(count);
        };
        return ctx;
      }
      var _ctx = spawnPrng();
      var getRandomValues = null;
      var globalScope = forge.util.globalScope;
      var _crypto = globalScope.crypto || globalScope.msCrypto;
      if (_crypto && _crypto.getRandomValues)
        getRandomValues = function (arr) {
          return _crypto.getRandomValues(arr);
        };
      if (forge.options.usePureJavaScript || (!forge.util.isNodejs && !getRandomValues)) {
        if (typeof window === "undefined" || window.document === undefined);
        _ctx.collectInt(+new Date(), 32);
        if (typeof navigator !== "undefined") {
          var _navBytes = "";
          for (var key in navigator)
            try {
              if (typeof navigator[key] == "string") _navBytes += navigator[key];
            } catch (e) {}
          _ctx.collect(_navBytes);
          _navBytes = null;
        }
        if (jQuery) {
          jQuery().mousemove(function (e) {
            _ctx.collectInt(e.clientX, 16);
            _ctx.collectInt(e.clientY, 16);
          });
          jQuery().keypress(function (e) {
            _ctx.collectInt(e.charCode, 8);
          });
        }
      }
      if (!forge.random) forge.random = _ctx;
      else for (var key in _ctx) forge.random[key] = _ctx[key];
      forge.random.createInstance = spawnPrng;
      cjsModule.exports = forge.random;
    })(typeof jQuery !== "undefined" ? jQuery : null);
  })();
});
export { require_random };
