/**
 * cross-spawn/lib/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { It } from "./util/resolveCommand.js";
import { vt } from "./util/escape.js";
import { kt } from "./util/readShebang.js";

//@ chunk-m4p5zn6n.js:5330-5816 cjs-fingerprint
var Lt = x(function (bi, Gt) {
  var Nt = importMetaRequire("path"),
    Ft = It(),
    ee = vt(),
    cr = kt(),
    lr = /\.(?:com|exe)$/i,
    fr = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
  function pr(e) {
    e.file = Ft(e);
    let n = e.file && cr(e.file);
    if (n) return (e.args.unshift(e.file), (e.command = n), Ft(e));
    return e.file;
  }
  function mr(e) {
    return e;
  }
  function gr(e, n, r) {
    if (n && !Array.isArray(n)) ((r = n), (n = null));
    ((n = n ? n.slice(0) : []), (r = Object.assign({}, r)));
    let o = { command: e, args: n, options: r, file: void 0, original: { command: e, args: n } };
    return r.shell ? o : mr(o);
  }
  Gt.exports = gr;
});

export { Lt };
