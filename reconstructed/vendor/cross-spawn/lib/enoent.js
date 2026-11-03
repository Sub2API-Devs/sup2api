/**
 * cross-spawn/lib/enoent.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-m4p5zn6n.js:5816-6175 cjs-fingerprint
var require_enoent = x(function (cjsExports, cjsModule) {
  function notFoundError(original, syscall) {
    return Object.assign(Error(`${syscall} ${original.command} ENOENT`), {
      code: "ENOENT",
      errno: "ENOENT",
      syscall: `${syscall} ${original.command}`,
      path: original.command,
      spawnargs: original.args,
    });
  }
  function hookChildProcess(cp, parsed) {
    return;
  }
  function verifyENOENT(status, parsed) {
    return null;
  }
  function verifyENOENTSync(status, parsed) {
    return null;
  }
  cjsModule.exports = {
    hookChildProcess,
    verifyENOENT,
    verifyENOENTSync,
    notFoundError,
  };
});
export { require_enoent };
