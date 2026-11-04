/**
 * @smithy/util-middleware/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-middleware@2.2.0..3.0.11
 * pieces: chunk-jn3x3dnx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_types } from "../../types/dist-cjs/index.js";

//@ chunk-jn3x3dnx.js:263-482 cjs-fingerprint
var require_util_middleware = __commonJS(function (cjsExports) {
  var import_types = require_types();
  var getSmithyContext = (context) =>
    context[import_types.SMITHY_CONTEXT_KEY] || (context[import_types.SMITHY_CONTEXT_KEY] = {});
  var normalizeProvider = (input) => {
    if (typeof input === "function") return input;
    let promisified = Promise.resolve(input);
    return () => promisified;
  };
  cjsExports.getSmithyContext = getSmithyContext;
  cjsExports.normalizeProvider = normalizeProvider;
});
export { require_util_middleware };
