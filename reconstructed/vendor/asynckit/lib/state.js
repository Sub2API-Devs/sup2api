/**
 * asynckit/lib/state.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-h6b7mazd.js (4)
 * attribution: cjs-fingerprint 4
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Jt } from "../index.js";
import { Kt } from "./abort.js";

//@ chunk-h6b7mazd.js:5825-6165 cjs-fingerprint
var Xt = x(function (Ll, Fn) {
  var Pn = Jt(),
    La = Kt();
  Fn.exports = Ba;
  function Ba(e, t, r, n) {
    var o = r.keyedList ? r.keyedList[r.index] : r.index;
    r.jobs[o] = Na(t, o, e[o], function (s, i) {
      if (!(o in r.jobs)) return;
      if ((delete r.jobs[o], s)) La(r);
      else r.results[o] = i;
      n(s, r.results);
    });
  }
  function Na(e, t, r, n) {
    var o;
    if (e.length == 2) o = e(r, Pn(n));
    else o = e(r, t, Pn(n));
    return o;
  }
});
//@ chunk-h6b7mazd.js:6165-6428 cjs-fingerprint
var Yt = x(function (Bl, Ln) {
  Ln.exports = Da;
  function Da(e, t) {
    var r = !Array.isArray(e),
      n = {
        index: 0,
        keyedList: r || t ? Object.keys(e) : null,
        jobs: {},
        results: r ? {} : [],
        size: r ? Object.keys(e).length : e.length,
      };
    if (t)
      n.keyedList.sort(
        r
          ? t
          : function (o, s) {
              return t(e[o], e[s]);
            },
      );
    return n;
  }
});
//@ chunk-h6b7mazd.js:6428-6601 cjs-fingerprint
var Qt = x(function (Nl, Bn) {
  var Ua = Kt(),
    qa = Jt();
  Bn.exports = Ia;
  function Ia(e) {
    if (!Object.keys(this.jobs).length) return;
    ((this.index = this.size), Ua(this), qa(e)(null, this.results));
  }
});
//@ chunk-h6b7mazd.js:6601-6876 cjs-fingerprint
var Dn = x(function (Dl, Nn) {
  var ka = Xt(),
    Ma = Yt(),
    Ha = Qt();
  Nn.exports = za;
  function za(e, t, r) {
    var n = Ma(e);
    while (n.index < (n.keyedList || e).length)
      (ka(e, t, n, function (o, s) {
        if (o) {
          r(o, s);
          return;
        }
        if (Object.keys(n.jobs).length === 0) {
          r(null, n.results);
          return;
        }
      }),
        n.index++);
    return Ha.bind(n, r);
  }
});

export { Dn, Xt, Yt, Qt };
