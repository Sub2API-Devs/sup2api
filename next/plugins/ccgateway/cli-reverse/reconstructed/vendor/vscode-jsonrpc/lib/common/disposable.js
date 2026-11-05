/**
 * vscode-jsonrpc/lib/common/disposable.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-mvgr3jmb.js:13504-13691 cjs-fingerprint
var require_disposable = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Disposable = undefined;
  var Disposable;
  (function (Disposable) {
    function create(func) {
      return {
        dispose: func,
      };
    }
    Disposable.create = create;
  })(Disposable || (cjsExports.Disposable = Disposable = {}));
});
export { require_disposable };
