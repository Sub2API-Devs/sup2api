/**
 * @opentelemetry/api/build/src/propagation-api.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_propagation } from "./api/propagation.js";

//@ chunk-bwbq4xvm.js:48667-48822 cjs-fingerprint
var require_propagation_api = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.propagation = undefined;
  var propagation_1 = require_propagation();
  cjsExports.propagation = propagation_1.PropagationAPI.getInstance();
});
export { require_propagation_api };
