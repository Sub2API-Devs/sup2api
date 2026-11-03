/**
 * isexe/windows.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: isexe@2.0.0
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";

//@ chunk-m4p5zn6n.js:713-1221 cjs-fingerprint
var ut = x(function (di, at) {
  at.exports = st;
  st.sync = Hn;
  var ot = importMetaRequire("fs");
  function qn(e, n) {
    var r = n.pathExt !== void 0 ? n.pathExt : process.env.PATHEXT;
    if (!r) return !0;
    if (((r = r.split(";")), r.indexOf("") !== -1)) return !0;
    for (var o = 0; o < r.length; o++) {
      var lower = r[o].toLowerCase();
      if (lower && e.substr(-lower.length).toLowerCase() === lower) return !0;
    }
    return !1;
  }
  function it(e, n, r) {
    if (!e.isSymbolicLink() && !e.isFile()) return !1;
    return qn(n, r);
  }
  function st(e, n, r) {
    ot.stat(e, function (o, s) {
      r(o, o ? !1 : it(s, e, n));
    });
  }
  function Hn(e, n) {
    return it(ot.statSync(e), e, n);
  }
});

export { ut };
