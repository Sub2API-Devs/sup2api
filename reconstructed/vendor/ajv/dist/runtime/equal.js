/**
 * ajv/dist/runtime/equal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-dxsqk077.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_fast_deep_equal } from "../../../fast-deep-equal/index.js";

//@ chunk-dxsqk077.js:953-1101 cjs-fingerprint
var require_equal = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var equal = require_fast_deep_equal();
  equal.code = 'require("ajv/dist/runtime/equal").default';
  cjsExports.default = equal;
});
export { require_equal };
