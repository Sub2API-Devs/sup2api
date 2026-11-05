/**
 * node-forge/lib/prng.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_util } from "./util.js";

//@ chunk-qg41pqt6.js:84678-88283 cjs-fingerprint
var require_prng = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_util();
  var _crypto = null;
  if (forge.util.isNodejs && !forge.options.usePureJavaScript && !process.versions["node-webkit"])
    _crypto = importMetaRequire("crypto");
  var prng = (cjsModule.exports = forge.prng = forge.prng || {});
  prng.create = function (plugin) {
    var ctx = {
      plugin,
      key: null,
      seed: null,
      time: null,
      reseeds: 0,
      generated: 0,
      keyBytes: "",
    };
    var md = plugin.md;
    var pools = Array(32);
    for (var i = 0; i < 32; ++i) pools[i] = md.create();
    ctx.pools = pools;
    ctx.pool = 0;
    ctx.generate = function (count, callback) {
      if (!callback) return ctx.generateSync(count);
      var cipher = ctx.plugin.cipher;
      var increment = ctx.plugin.increment;
      var formatKey = ctx.plugin.formatKey;
      var formatSeed = ctx.plugin.formatSeed;
      var b = forge.util.createBuffer();
      ctx.key = null;
      generate();
      function generate(err) {
        if (err) return callback(err);
        if (b.length() >= count) return callback(null, b.getBytes(count));
        if (ctx.generated > 1048575) ctx.key = null;
        if (ctx.key === null)
          return forge.util.nextTick(function () {
            _reseed(generate);
          });
        var bytes = cipher(ctx.key, ctx.seed);
        ctx.generated += bytes.length;
        b.putBytes(bytes);
        ctx.key = formatKey(cipher(ctx.key, increment(ctx.seed)));
        ctx.seed = formatSeed(cipher(ctx.key, ctx.seed));
        forge.util.setImmediate(generate);
      }
    };
    ctx.generateSync = function (count) {
      var cipher = ctx.plugin.cipher;
      var increment = ctx.plugin.increment;
      var formatKey = ctx.plugin.formatKey;
      var formatSeed = ctx.plugin.formatSeed;
      ctx.key = null;
      var b = forge.util.createBuffer();
      while (b.length() < count) {
        if (ctx.generated > 1048575) ctx.key = null;
        if (ctx.key === null) _reseedSync();
        var bytes = cipher(ctx.key, ctx.seed);
        ctx.generated += bytes.length;
        b.putBytes(bytes);
        ctx.key = formatKey(cipher(ctx.key, increment(ctx.seed)));
        ctx.seed = formatSeed(cipher(ctx.key, ctx.seed));
      }
      return b.getBytes(count);
    };
    function _reseed(callback) {
      if (ctx.pools[0].messageLength >= 32) {
        _seed();
        return callback();
      }
      var needed = (32 - ctx.pools[0].messageLength) << 5;
      ctx.seedFile(needed, function (err, bytes) {
        if (err) return callback(err);
        ctx.collect(bytes);
        _seed();
        callback();
      });
    }
    function _reseedSync() {
      if (ctx.pools[0].messageLength >= 32) return _seed();
      var needed = (32 - ctx.pools[0].messageLength) << 5;
      ctx.collect(ctx.seedFileSync(needed));
      _seed();
    }
    function _seed() {
      ctx.reseeds = ctx.reseeds === 4294967295 ? 0 : ctx.reseeds + 1;
      var md = ctx.plugin.md.create();
      md.update(ctx.keyBytes);
      var _2powK = 1;
      for (var k = 0; k < 32; ++k) {
        if (ctx.reseeds % _2powK === 0) {
          md.update(ctx.pools[k].digest().getBytes());
          ctx.pools[k].start();
        }
        _2powK = _2powK << 1;
      }
      ctx.keyBytes = md.digest().getBytes();
      md.start();
      md.update(ctx.keyBytes);
      var seedBytes = md.digest().getBytes();
      ctx.key = ctx.plugin.formatKey(ctx.keyBytes);
      ctx.seed = ctx.plugin.formatSeed(seedBytes);
      ctx.generated = 0;
    }
    function defaultSeedFile(needed) {
      var getRandomValues = null;
      var globalScope = forge.util.globalScope;
      var _crypto = globalScope.crypto || globalScope.msCrypto;
      if (_crypto && _crypto.getRandomValues)
        getRandomValues = function (arr) {
          return _crypto.getRandomValues(arr);
        };
      var b = forge.util.createBuffer();
      if (getRandomValues)
        while (b.length() < needed) {
          var count = Math.max(1, Math.min(needed - b.length(), 65536) / 4);
          var entropy = new Uint32Array(Math.floor(count));
          try {
            getRandomValues(entropy);
            for (var i = 0; i < entropy.length; ++i) b.putInt32(entropy[i]);
          } catch (e) {
            if (!(typeof QuotaExceededError !== "undefined" && e instanceof QuotaExceededError)) throw e;
          }
        }
      if (b.length() < needed) {
        var hi;
        var lo;
        var next;
        var seed = Math.floor(Math.random() * 65536);
        while (b.length() < needed) {
          lo = 16807 * (seed & 65535);
          hi = 16807 * (seed >> 16);
          lo += (hi & 32767) << 16;
          lo += hi >> 15;
          lo = (lo & 2147483647) + (lo >> 31);
          seed = lo & 4294967295;
          for (var i = 0; i < 3; ++i) {
            next = seed >>> (i << 3);
            next ^= Math.floor(Math.random() * 256);
            b.putByte(next & 255);
          }
        }
      }
      return b.getBytes(needed);
    }
    if (_crypto) {
      ctx.seedFile = function (needed, callback) {
        _crypto.randomBytes(needed, function (err, bytes) {
          if (err) return callback(err);
          callback(null, bytes.toString());
        });
      };
      ctx.seedFileSync = function (needed) {
        return _crypto.randomBytes(needed).toString();
      };
    } else {
      ctx.seedFile = function (needed, callback) {
        try {
          callback(null, defaultSeedFile(needed));
        } catch (e) {
          callback(e);
        }
      };
      ctx.seedFileSync = defaultSeedFile;
    }
    ctx.collect = function (bytes) {
      var count = bytes.length;
      for (var i = 0; i < count; ++i) {
        ctx.pools[ctx.pool].update(bytes.substr(i, 1));
        ctx.pool = ctx.pool === 31 ? 0 : ctx.pool + 1;
      }
    };
    ctx.collectInt = function (i, n) {
      var bytes = "";
      for (var x = 0; x < n; x += 8) bytes += String.fromCharCode((i >> x) & 255);
      ctx.collect(bytes);
    };
    ctx.registerWorker = function (worker) {
      if (worker === self)
        ctx.seedFile = function (needed, callback) {
          function listener(e) {
            var data = e.data;
            if (data.forge && data.forge.prng) {
              self.removeEventListener("message", listener);
              callback(data.forge.prng.err, data.forge.prng.bytes);
            }
          }
          self.addEventListener("message", listener);
          self.postMessage({
            forge: {
              prng: {
                needed,
              },
            },
          });
        };
      else {
        var listener = function (e) {
          var data = e.data;
          if (data.forge && data.forge.prng)
            ctx.seedFile(data.forge.prng.needed, function (err, bytes) {
              worker.postMessage({
                forge: {
                  prng: {
                    err,
                    bytes,
                  },
                },
              });
            });
        };
        worker.addEventListener("message", listener);
      }
    };
    return ctx;
  };
});
export { require_prng };
