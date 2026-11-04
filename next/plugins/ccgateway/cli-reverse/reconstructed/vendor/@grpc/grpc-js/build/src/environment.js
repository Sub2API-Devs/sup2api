/**
 * @grpc/grpc-js/build/src/environment.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:205117-205375 cjs-fingerprint
var require_environment = __commonJS(function (cjsExports) {
  var _a;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.GRPC_NODE_USE_ALTERNATIVE_RESOLVER = undefined;
  cjsExports.GRPC_NODE_USE_ALTERNATIVE_RESOLVER =
    ((_a = process.env.GRPC_NODE_USE_ALTERNATIVE_RESOLVER) !== null && _a !== undefined ? _a : "false") ===
    "true";
});
export { require_environment };
