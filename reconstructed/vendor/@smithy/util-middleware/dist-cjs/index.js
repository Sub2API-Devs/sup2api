/**
 * @smithy/util-middleware/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-middleware@2.2.0..3.0.11
 * pieces: chunk-jn3x3dnx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { W1e } from "../../types/dist-cjs/index.js";

//@ chunk-jn3x3dnx.js:263-482 cjs-fingerprint
var bD = x(function (s) {
  var r = W1e(),
    o = (e) => e[r.SMITHY_CONTEXT_KEY] || (e[r.SMITHY_CONTEXT_KEY] = {}),
    i = (e) => {
      if (typeof e === "function") return e;
      let resolved = Promise.resolve(e);
      return () => resolved;
    };
  s.getSmithyContext = o;
  s.normalizeProvider = i;
});

export { bD };
