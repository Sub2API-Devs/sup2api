/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/types.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-q87n5wsq.js:2237-2552 cjs-fingerprint
var require_types = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.AggregatorKind = undefined;
  var AggregatorKind;
  (function (AggregatorKind) {
    AggregatorKind[(AggregatorKind.DROP = 0)] = "DROP";
    AggregatorKind[(AggregatorKind.SUM = 1)] = "SUM";
    AggregatorKind[(AggregatorKind.LAST_VALUE = 2)] = "LAST_VALUE";
    AggregatorKind[(AggregatorKind.HISTOGRAM = 3)] = "HISTOGRAM";
    AggregatorKind[(AggregatorKind.EXPONENTIAL_HISTOGRAM = 4)] = "EXPONENTIAL_HISTOGRAM";
  })((AggregatorKind = cjsExports.AggregatorKind || (cjsExports.AggregatorKind = {})));
});
export { require_types };
