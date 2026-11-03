/**
 * vscode-jsonrpc/lib/common/ral.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-t4ksmxzx.js:13327-13641 cjs-fingerprint
var require_ral = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var _ral;
  function RAL() {
    if (_ral === undefined) throw Error("No runtime abstraction layer installed");
    return _ral;
  }
  (function (RAL) {
    function install(ral) {
      if (ral === undefined) throw Error("No runtime abstraction layer provided");
      _ral = ral;
    }
    RAL.install = install;
  })(RAL || (RAL = {}));
  cjsExports.default = RAL;
});
export { require_ral };
