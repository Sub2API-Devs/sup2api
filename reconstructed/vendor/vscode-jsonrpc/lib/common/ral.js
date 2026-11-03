/**
 * vscode-jsonrpc/lib/common/ral.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-t4ksmxzx.js:13327-13641 cjs-fingerprint
var de = x(function (kr) {
  Object.defineProperty(kr, "__esModule", { value: !0 });
  var gt;
  function yt() {
    if (gt === void 0) throw Error("No runtime abstraction layer installed");
    return gt;
  }
  (function (e) {
    function r(n) {
      if (n === void 0) throw Error("No runtime abstraction layer provided");
      gt = n;
    }
    e.install = r;
  })(yt || (yt = {}));
  kr.default = yt;
});

export { de };
