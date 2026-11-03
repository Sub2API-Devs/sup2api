/**
 * graceful-fs/clone.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: graceful-fs@4.2.11
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-bmbhxpfm.js:5806-6170 cjs-fingerprint
var require_clone = x(function (cjsExports, cjsModule) {
  cjsModule.exports = clone;
  var getPrototypeOf =
    Object.getPrototypeOf ||
    function (obj) {
      return obj.__proto__;
    };
  function clone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Object)
      var copy = {
        __proto__: getPrototypeOf(obj),
      };
    else var copy = Object.create(null);
    Object.getOwnPropertyNames(obj).forEach(function (key) {
      Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
    });
    return copy;
  }
});
export { require_clone };
