/**
 * @opentelemetry/core/build/src/internal/exporter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_suppress_tracing } from "../trace/suppress-tracing.js";

//@ chunk-7kayq7nc.js:129545-129792 cjs-fingerprint
var require_exporter = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports._export = undefined;
  var api_1 = require_api();
  var suppress_tracing_1 = require_suppress_tracing();
  function _export(exporter, arg) {
    return new Promise((resolve) => {
      api_1.context.with(suppress_tracing_1.suppressTracing(api_1.context.active()), () => {
        exporter.export(arg, resolve);
      });
    });
  }
  cjsExports._export = _export;
});
export { require_exporter };
