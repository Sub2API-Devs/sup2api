/**
 * @opentelemetry/otlp-transformer/build/src/logs/json/logs.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_internal_2 } from "../internal.js";

//@ chunk-vxhm2nqe.js:253289-253672 cjs-fingerprint
var require_logs_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.JsonLogsSerializer = undefined;
  var internal_1 = require_internal_2();
  cjsExports.JsonLogsSerializer = {
    serializeRequest: (arg) => {
      let request = internal_1.createExportLogsServiceRequest(arg, {
        useHex: true,
        useLongBits: false,
      });
      return new TextEncoder().encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
      if (arg.length === 0) return {};
      return JSON.parse(new TextDecoder().decode(arg));
    },
  };
});
export { require_logs_2 };
