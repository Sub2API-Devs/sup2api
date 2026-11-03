/**
 * cross-spawn/lib/enoent.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-m4p5zn6n.js:5816-6175 cjs-fingerprint
var Dt = x(function (Ci, Mt) {
  function hr(e, n) {
    return Object.assign(Error(`${n} ${e.command} ENOENT`), {
      code: "ENOENT",
      errno: "ENOENT",
      syscall: `${n} ${e.command}`,
      path: e.command,
      spawnargs: e.args,
    });
  }
  function yr(e, n) {
    return;
  }
  function jt(e, n) {
    return null;
  }
  function Sr(e, n) {
    return null;
  }
  Mt.exports = { hookChildProcess: yr, verifyENOENT: jt, verifyENOENTSync: Sr, notFoundError: hr };
});

export { Dt };
