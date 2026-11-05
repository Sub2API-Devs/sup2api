/**
 * @opentelemetry/semantic-conventions/build/src/internal/utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/semantic-conventions@1.37.0..1.39.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:59878-60129 cjs-fingerprint
var require_utils_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createConstMap = undefined;
  function createConstMap(values) {
    let res = {};
    let len = values.length;
    for (let lp = 0; lp < len; lp++) {
      let val = values[lp];
      if (val) res[String(val).toUpperCase().replace(/[-.]/g, "_")] = val;
    }
    return res;
  }
  cjsExports.createConstMap = createConstMap;
});
export { require_utils_2 };
