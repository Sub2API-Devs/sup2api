/**
 * protobufjs/src/util/aspromise.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:6325-6693 cjs-require-graph
var QPo = x(function (ac, nr) {
  nr.exports = Vi;
  function Vi(l, u) {
    var f = Array(arguments.length - 1),
      d = 0,
      i = 2,
      o = !0;
    while (i < arguments.length) f[d++] = arguments[i++];
    return new Promise(function (t, r) {
      f[d] = function (c) {
        if (o)
          if (((o = !1), c)) r(c);
          else {
            var s = Array(arguments.length - 1),
              m = 0;
            while (m < s.length) s[m++] = arguments[m];
            t.apply(null, s);
          }
      };
      try {
        l.apply(u || null, f);
      } catch (error) {
        if (o) ((o = !1), r(error));
      }
    });
  }
});

export { QPo };
