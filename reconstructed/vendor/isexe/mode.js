/**
 * isexe/mode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: isexe@2.0.0
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";

//@ chunk-m4p5zn6n.js:1221-1714 cjs-fingerprint
var pt = x(function (li, ft) {
  ft.exports = dt;
  dt.sync = Vn;
  var ct = importMetaRequire("fs");
  function dt(e, n, r) {
    ct.stat(e, function (o, s) {
      r(o, o ? !1 : lt(s, n));
    });
  }
  function Vn(e, n) {
    return lt(ct.statSync(e), n);
  }
  function lt(e, n) {
    return e.isFile() && Xn(e, n);
  }
  function Xn(e, n) {
    var { mode: mode, uid: uid, gid: gid } = e,
      u = n.uid !== void 0 ? n.uid : process.getuid && process.getuid(),
      d = n.gid !== void 0 ? n.gid : process.getgid && process.getgid(),
      l = parseInt("100", 8),
      f = parseInt("010", 8),
      p = parseInt("001", 8),
      h = l | f,
      S = mode & p || (mode & f && gid === d) || (mode & l && uid === u) || (mode & h && u === 0);
    return S;
  }
});

export { pt };
