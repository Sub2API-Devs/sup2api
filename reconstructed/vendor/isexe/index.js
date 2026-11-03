/**
 * isexe/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: isexe@2.0.0
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { ut } from "./windows.js";
import { pt } from "./mode.js";

//@ chunk-m4p5zn6n.js:1714-2251 cjs-fingerprint
var gt = x(function (pi, mt) {
  var fi = importMetaRequire("fs"),
    Z;
  if (global.TESTING_WINDOWS) Z = ut();
  else Z = pt();
  mt.exports = ge;
  ge.sync = Yn;
  function ge(e, n, r) {
    if (typeof n === "function") ((r = n), (n = {}));
    if (!r) {
      if (typeof Promise !== "function") throw TypeError("callback not provided");
      return new Promise(function (o, s) {
        ge(e, n || {}, function (u, d) {
          if (u) s(u);
          else o(d);
        });
      });
    }
    Z(e, n || {}, function (o, s) {
      if (o) {
        if (o.code === "EACCES" || (n && n.ignoreErrors)) ((o = null), (s = !1));
      }
      r(o, s);
    });
  }
  function Yn(e, n) {
    try {
      return Z.sync(e, n || {});
    } catch (error) {
      if ((n && n.ignoreErrors) || error.code === "EACCES") return !1;
      else throw error;
    }
  }
});

export { gt };
