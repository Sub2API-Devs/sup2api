/**
 * vscode-jsonrpc/lib/common/ral.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-mvgr3jmb.js:13691-14005 cjs-fingerprint
var require_ral = __commonJS(function (cjsExports) {
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
