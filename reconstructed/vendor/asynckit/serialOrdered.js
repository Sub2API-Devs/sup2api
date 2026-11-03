/**
 * asynckit/serialOrdered.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { Xt, Yt, Qt } from "./lib/state.js";

//@ chunk-h6b7mazd.js:6876-7253 cjs-fingerprint
var Zt = x(function (Ul, xt) {
  var Un = Xt(),
    $a = Yt(),
    Va = Qt();
  xt.exports = Wa;
  xt.exports.ascending = qn;
  xt.exports.descending = Ga;
  function Wa(e, t, r, n) {
    var o = $a(e, r);
    return (
      Un(e, t, o, function s(i, a) {
        if (i) {
          n(i, a);
          return;
        }
        if ((o.index++, o.index < (o.keyedList || e).length)) {
          Un(e, t, o, s);
          return;
        }
        n(null, o.results);
      }),
      Va.bind(o, n)
    );
  }
  function qn(e, t) {
    return e < t ? -1 : e > t ? 1 : 0;
  }
  function Ga(e, t) {
    return -1 * qn(e, t);
  }
});

export { Zt };
