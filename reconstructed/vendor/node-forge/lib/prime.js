/**
 * node-forge/lib/prime.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Zn } from "./util.js";
import { Ef } from "./jsbn.js";
import { Ci } from "./random.js";

//@ chunk-fq0cr76a.js:117883-120062 cjs-fingerprint
var xS = x(function (Afe, ES) {
  var el = Tn();
  Zn();
  Ef();
  Ci();
  (function () {
    if (el.prime) {
      ES.exports = el.prime;
      return;
    }
    var e = (ES.exports = el.prime = el.prime || {}),
      BigInteger = el.jsbn.BigInteger,
      r = [6, 4, 2, 4, 2, 4, 6, 2],
      s = new BigInteger(null);
    s.fromInt(30);
    var h = function (O, L) {
      return O | L;
    };
    e.generateProbablePrime = function (O, L, V) {
      if (typeof L === "function") ((V = L), (L = {}));
      L = L || {};
      var K = L.algorithm || "PRIMEINC";
      if (typeof K === "string") K = { name: K };
      K.options = K.options || {};
      var q = L.prng || el.random,
        Z = {
          nextBytes: function (J) {
            var bytesSync = q.getBytesSync(J.length);
            for (var ae = 0; ae < J.length; ++ae) J[ae] = bytesSync.charCodeAt(ae);
          },
        };
      if (K.name === "PRIMEINC") return y(O, Z, K.options, V);
      throw Error("Invalid prime generation algorithm: " + K.name);
    };
    function y(O, L, V, K) {
      if ("workers" in V) return w(O, L, V, K);
      return b(O, L, V, K);
    }
    function b(O, L, V, K) {
      var q = R(O, L),
        Z = 0,
        J = D(q.bitLength());
      if ("millerRabinTests" in V) J = V.millerRabinTests;
      var ie = 10;
      if ("maxBlockTime" in V) ie = V.maxBlockTime;
      S(q, O, L, Z, J, ie, K);
    }
    function S(O, L, V, K, q, Z, J) {
      var ie = +new Date();
      do {
        if (O.bitLength() > L) O = R(L, V);
        if (O.isProbablePrime(q)) return J(null, O);
        O.dAddOffset(r[K++ % 8], 0);
      } while (Z < 0 || +new Date() - ie < Z);
      el.util.setImmediate(function () {
        S(O, L, V, K, q, Z, J);
      });
    }
    function w(O, L, V, K) {
      if (typeof Worker > "u") return b(O, L, V, K);
      var q = R(O, L),
        workers = V.workers,
        J = V.workLoad || 100,
        ie = (J * 30) / 8,
        ae = V.workerScript || "forge/prime.worker.js";
      if (workers === -1)
        return el.util.estimateCores(function (ue, me) {
          if (ue) me = 2;
          ((workers = me - 1), Se());
        });
      Se();
      function Se() {
        workers = Math.max(1, workers);
        var ue = [];
        for (var me = 0; me < workers; ++me) ue[me] = new Worker(ae);
        var Ne = workers;
        for (var me = 0; me < workers; ++me) ue[me].addEventListener("message", Ie);
        var Ce = !1;
        function Ie(he) {
          if (Ce) return;
          --Ne;
          var ft = he.data;
          if (ft.found) {
            for (var rt = 0; rt < ue.length; ++rt) ue[rt].terminate();
            return ((Ce = !0), K(null, new BigInteger(ft.prime, 16)));
          }
          if (q.bitLength() > O) q = R(O, L);
          var str = q.toString(16);
          (he.target.postMessage({ hex: str, workLoad: J }), q.dAddOffset(ie, 0));
        }
      }
    }
    function R(O, L) {
      var V = new BigInteger(O, L),
        K = O - 1;
      if (!V.testBit(K)) V.bitwiseTo(BigInteger.ONE.shiftLeft(K), h, V);
      return (V.dAddOffset(31 - V.mod(s).byteValue(), 0), V);
    }
    function D(O) {
      if (O <= 100) return 27;
      if (O <= 150) return 18;
      if (O <= 200) return 15;
      if (O <= 250) return 12;
      if (O <= 300) return 9;
      if (O <= 350) return 8;
      if (O <= 400) return 7;
      if (O <= 500) return 6;
      if (O <= 600) return 5;
      if (O <= 800) return 4;
      if (O <= 1250) return 3;
      return 2;
    }
  })();
});

export { xS };
