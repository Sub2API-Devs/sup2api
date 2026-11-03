/**
 * cross-spawn/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { Lt } from "./lib/parse.js";
import { Dt } from "./lib/enoent.js";

//@ chunk-m4p5zn6n.js:6175-6576 cjs-fingerprint
var WSr = x(function (Ei, F) {
  var te = importMetaRequire("child_process"),
    be = Lt(),
    L = Dt();
  function Ut(e, n, r) {
    let o = be(e, n, r),
      child = te.spawn(o.command, o.args, o.options);
    return (L.hookChildProcess(child, o), child);
  }
  function xr(e, n, r) {
    let o = be(e, n, r),
      spawnSync = te.spawnSync(o.command, o.args, o.options);
    return ((spawnSync.error = spawnSync.error || L.verifyENOENTSync(spawnSync.status, o)), spawnSync);
  }
  F.exports = Ut;
  F.exports.spawn = Ut;
  F.exports.sync = xr;
  F.exports._parse = be;
  F.exports._enoent = L;
});

export { WSr };
