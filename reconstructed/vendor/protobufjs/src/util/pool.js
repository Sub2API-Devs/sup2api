/**
 * protobufjs/src/util/pool.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-798ashq9.js:25666-25873 cjs-require-graph
var gr = x(function (mc, Sr) {
  Sr.exports = qi;
  function qi(l, u, f) {
    var d = f || 8192,
      i = d >>> 1,
      o = null,
      e = d;
    return function (r) {
      if (r < 1 || r > i) return l(r);
      if (e + r > d) ((o = l(d)), (e = 0));
      var n = u.call(o, e, (e += r));
      if (e & 7) e = (e | 7) + 1;
      return n;
    };
  }
});

export { gr };
