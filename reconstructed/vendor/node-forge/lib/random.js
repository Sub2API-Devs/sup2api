/**
 * node-forge/lib/random.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Xa } from "./aes.js";
import { uS } from "./sha256.js";
import { dS } from "./prng.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:88346-89883 cjs-fingerprint
var Ci = x(function (xfe, fS) {
  var fs = Tn();
  Xa();
  uS();
  dS();
  Zn();
  (function () {
    if (fs.random && fs.random.getBytes) {
      fS.exports = fs.random;
      return;
    }
    (function (e) {
      var n = {},
        r = [, , , ,],
        buffer = fs.util.createBuffer();
      ((n.formatKey = function (O) {
        var buffer = fs.util.createBuffer(O);
        return (
          (O = [, , , ,]),
          (O[0] = buffer.getInt32()),
          (O[1] = buffer.getInt32()),
          (O[2] = buffer.getInt32()),
          (O[3] = buffer.getInt32()),
          fs.aes._expandKey(O, !1)
        );
      }),
        (n.formatSeed = function (O) {
          var buffer = fs.util.createBuffer(O);
          return (
            (O = [, , , ,]),
            (O[0] = buffer.getInt32()),
            (O[1] = buffer.getInt32()),
            (O[2] = buffer.getInt32()),
            (O[3] = buffer.getInt32()),
            O
          );
        }),
        (n.cipher = function (O, L) {
          return (
            fs.aes._updateBlock(O, L, r, !1),
            buffer.putInt32(r[0]),
            buffer.putInt32(r[1]),
            buffer.putInt32(r[2]),
            buffer.putInt32(r[3]),
            buffer.getBytes()
          );
        }),
        (n.increment = function (O) {
          return (++O[3], O);
        }),
        (n.md = fs.md.sha256));
      function h() {
        var create = fs.prng.create(n);
        return (
          (create.getBytes = function (L, V) {
            return create.generate(L, V);
          }),
          (create.getBytesSync = function (L) {
            return create.generate(L);
          }),
          create
        );
      }
      var y = h(),
        b = null,
        globalScope = fs.util.globalScope,
        w = globalScope.crypto || globalScope.msCrypto;
      if (w && w.getRandomValues)
        b = function (O) {
          return w.getRandomValues(O);
        };
      if (fs.options.usePureJavaScript || (!fs.util.isNodejs && !b)) {
        if (typeof window > "u" || window.document === void 0);
        if ((y.collectInt(+new Date(), 32), typeof navigator < "u")) {
          var R = "";
          for (var key in navigator)
            try {
              if (typeof navigator[key] == "string") R += navigator[key];
            } catch (error) {}
          (y.collect(R), (R = null));
        }
        if (e)
          (e().mousemove(function (O) {
            (y.collectInt(O.clientX, 16), y.collectInt(O.clientY, 16));
          }),
            e().keypress(function (O) {
              y.collectInt(O.charCode, 8);
            }));
      }
      if (!fs.random) fs.random = y;
      else for (var key in y) fs.random[key] = y[key];
      ((fs.random.createInstance = h), (fS.exports = fs.random));
    })(typeof jQuery < "u" ? jQuery : null);
  })();
});

export { Ci };
