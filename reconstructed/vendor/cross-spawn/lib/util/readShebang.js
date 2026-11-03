/**
 * cross-spawn/lib/util/readShebang.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { _t } from "../../../shebang-command/index.js";

//@ chunk-m4p5zn6n.js:5128-5330 cjs-fingerprint
var kt = x(function (xi, $t) {
  var _ = importMetaRequire("fs"),
    ar = _t();
  function ur(e) {
    let alloc = Buffer.alloc(150),
      o;
    try {
      ((o = _.openSync(e, "r")), _.readSync(o, alloc, 0, 150, 0), _.closeSync(o));
    } catch (error) {}
    return ar(alloc.toString());
  }
  $t.exports = ur;
});

export { kt };
