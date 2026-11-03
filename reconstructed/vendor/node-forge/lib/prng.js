/**
 * node-forge/lib/prng.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:84760-88346 cjs-fingerprint
var dS = x(function (Efe, MT) {
  var wo = Tn();
  Zn();
  var Jh = null;
  if (wo.util.isNodejs && !wo.options.usePureJavaScript && !process.versions["node-webkit"])
    Jh = importMetaRequire("crypto");
  var R3 = (MT.exports = wo.prng = wo.prng || {});
  R3.create = function (e) {
    var n = { plugin: e, key: null, seed: null, time: null, reseeds: 0, generated: 0, keyBytes: "" },
      md = e.md,
      s = Array(32);
    for (var h = 0; h < 32; ++h) s[h] = md.create();
    ((n.pools = s),
      (n.pool = 0),
      (n.generate = function (R, D) {
        if (!D) return n.generateSync(R);
        var cipher = n.plugin.cipher,
          increment = n.plugin.increment,
          formatKey = n.plugin.formatKey,
          formatSeed = n.plugin.formatSeed,
          buffer = wo.util.createBuffer();
        ((n.key = null), Z());
        function Z(J) {
          if (J) return D(J);
          if (buffer.length() >= R) return D(null, buffer.getBytes(R));
          if (n.generated > 1048575) n.key = null;
          if (n.key === null)
            return wo.util.nextTick(function () {
              y(Z);
            });
          var ie = cipher(n.key, n.seed);
          ((n.generated += ie.length),
            buffer.putBytes(ie),
            (n.key = formatKey(cipher(n.key, increment(n.seed)))),
            (n.seed = formatSeed(cipher(n.key, n.seed))),
            wo.util.setImmediate(Z));
        }
      }),
      (n.generateSync = function (R) {
        var cipher = n.plugin.cipher,
          increment = n.plugin.increment,
          formatKey = n.plugin.formatKey,
          formatSeed = n.plugin.formatSeed;
        n.key = null;
        var buffer = wo.util.createBuffer();
        while (buffer.length() < R) {
          if (n.generated > 1048575) n.key = null;
          if (n.key === null) b();
          var q = cipher(n.key, n.seed);
          ((n.generated += q.length),
            buffer.putBytes(q),
            (n.key = formatKey(cipher(n.key, increment(n.seed)))),
            (n.seed = formatSeed(cipher(n.key, n.seed))));
        }
        return buffer.getBytes(R);
      }));
    function y(R) {
      if (n.pools[0].messageLength >= 32) return (S(), R());
      var D = (32 - n.pools[0].messageLength) << 5;
      n.seedFile(D, function (O, L) {
        if (O) return R(O);
        (n.collect(L), S(), R());
      });
    }
    function b() {
      if (n.pools[0].messageLength >= 32) return S();
      var R = (32 - n.pools[0].messageLength) << 5;
      (n.collect(n.seedFileSync(R)), S());
    }
    function S() {
      n.reseeds = n.reseeds === 4294967295 ? 0 : n.reseeds + 1;
      var create = n.plugin.md.create();
      create.update(n.keyBytes);
      var D = 1;
      for (var O = 0; O < 32; ++O) {
        if (n.reseeds % D === 0) (create.update(n.pools[O].digest().getBytes()), n.pools[O].start());
        D = D << 1;
      }
      ((n.keyBytes = create.digest().getBytes()), create.start(), create.update(n.keyBytes));
      var bytes = create.digest().getBytes();
      ((n.key = n.plugin.formatKey(n.keyBytes)), (n.seed = n.plugin.formatSeed(bytes)), (n.generated = 0));
    }
    function w(R) {
      var D = null,
        globalScope = wo.util.globalScope,
        L = globalScope.crypto || globalScope.msCrypto;
      if (L && L.getRandomValues)
        D = function (ue) {
          return L.getRandomValues(ue);
        };
      var buffer = wo.util.createBuffer();
      if (D)
        while (buffer.length() < R) {
          var max = Math.max(1, Math.min(R - buffer.length(), 65536) / 4),
            uint32Array = new Uint32Array(Math.floor(max));
          try {
            D(uint32Array);
            for (var Z = 0; Z < uint32Array.length; ++Z) buffer.putInt32(uint32Array[Z]);
          } catch (error) {
            if (!(typeof QuotaExceededError < "u" && error instanceof QuotaExceededError)) throw error;
          }
        }
      if (buffer.length() < R) {
        var J,
          ie,
          ae,
          floored = Math.floor(Math.random() * 65536);
        while (buffer.length() < R) {
          ((ie = 16807 * (floored & 65535)),
            (J = 16807 * (floored >> 16)),
            (ie += (J & 32767) << 16),
            (ie += J >> 15),
            (ie = (ie & 2147483647) + (ie >> 31)),
            (floored = ie & 4294967295));
          for (var Z = 0; Z < 3; ++Z)
            ((ae = floored >>> (Z << 3)), (ae ^= Math.floor(Math.random() * 256)), buffer.putByte(ae & 255));
        }
      }
      return buffer.getBytes(R);
    }
    if (Jh)
      ((n.seedFile = function (R, D) {
        Jh.randomBytes(R, function (O, L) {
          if (O) return D(O);
          D(null, L.toString());
        });
      }),
        (n.seedFileSync = function (R) {
          return Jh.randomBytes(R).toString();
        }));
    else
      ((n.seedFile = function (R, D) {
        try {
          D(null, w(R));
        } catch (error) {
          D(error);
        }
      }),
        (n.seedFileSync = w));
    return (
      (n.collect = function (R) {
        var D = R.length;
        for (var O = 0; O < D; ++O)
          (n.pools[n.pool].update(R.substr(O, 1)), (n.pool = n.pool === 31 ? 0 : n.pool + 1));
      }),
      (n.collectInt = function (R, D) {
        var O = "";
        for (var L = 0; L < D; L += 8) O += String.fromCharCode((R >> L) & 255);
        n.collect(O);
      }),
      (n.registerWorker = function (R) {
        if (R === self)
          n.seedFile = function (O, L) {
            function V(K) {
              var q = K.data;
              if (q.forge && q.forge.prng)
                (self.removeEventListener("message", V), L(q.forge.prng.err, q.forge.prng.bytes));
            }
            (self.addEventListener("message", V), self.postMessage({ forge: { prng: { needed: O } } }));
          };
        else {
          var D = function (O) {
            var L = O.data;
            if (L.forge && L.forge.prng)
              n.seedFile(L.forge.prng.needed, function (V, K) {
                R.postMessage({ forge: { prng: { err: V, bytes: K } } });
              });
          };
          R.addEventListener("message", D);
        }
      }),
      n
    );
  };
});

export { dS };
