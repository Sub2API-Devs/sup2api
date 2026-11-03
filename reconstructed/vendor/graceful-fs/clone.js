/**
 * graceful-fs/clone.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: graceful-fs@4.2.11
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-bmbhxpfm.js:5806-6170 cjs-fingerprint
var We = x(function (Zt, $e) {
  $e.exports = dt;
  var yt =
    Object.getPrototypeOf ||
    function (e) {
      return e.__proto__;
    };
  function dt(e) {
    if (e === null || typeof e !== "object") return e;
    if (e instanceof Object) var create = { __proto__: yt(e) };
    else var create = Object.create(null);
    return (
      Object.getOwnPropertyNames(e).forEach(function (n) {
        Object.defineProperty(create, n, Object.getOwnPropertyDescriptor(e, n));
      }),
      create
    );
  }
});

export { We };
