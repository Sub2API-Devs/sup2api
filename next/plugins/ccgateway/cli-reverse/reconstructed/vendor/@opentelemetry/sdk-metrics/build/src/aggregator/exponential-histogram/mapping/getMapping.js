/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/exponential-histogram/mapping/getMapping.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../../runtime/bun-runtime.js";
import { require_ExponentMapping } from "./ExponentMapping.js";
import { require_LogarithmMapping } from "./LogarithmMapping.js";
import { require_types_2 } from "./types.js";

//@ chunk-q87n5wsq.js:11014-11405 cjs-fingerprint
var require_getMapping = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getMapping = undefined;
  var ExponentMapping_1 = require_ExponentMapping();
  var LogarithmMapping_1 = require_LogarithmMapping();
  var types_1 = require_types_2();
  var MIN_SCALE = -10;
  var MAX_SCALE = 20;
  var PREBUILT_MAPPINGS = Array.from(
    {
      length: 31,
    },
    (_, i) => {
      if (i > 10) return new LogarithmMapping_1.LogarithmMapping(i - 10);
      return new ExponentMapping_1.ExponentMapping(i - 10);
    },
  );
  function getMapping(scale) {
    if (scale > MAX_SCALE || scale < MIN_SCALE)
      throw new types_1.MappingError(`expected scale >= ${MIN_SCALE} && <= ${MAX_SCALE}, got: ${scale}`);
    return PREBUILT_MAPPINGS[scale + 10];
  }
  cjsExports.getMapping = getMapping;
});
export { require_getMapping };
