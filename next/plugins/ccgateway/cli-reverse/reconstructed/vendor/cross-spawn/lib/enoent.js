/**
 * cross-spawn/lib/enoent.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: cross-spawn@7.0.5..7.0.6
 * pieces: chunk-t889g22j.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-t889g22j.js:5815-6174 cjs-fingerprint
var require_enoent = __commonJS(function (cjsExports, cjsModule) {
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
