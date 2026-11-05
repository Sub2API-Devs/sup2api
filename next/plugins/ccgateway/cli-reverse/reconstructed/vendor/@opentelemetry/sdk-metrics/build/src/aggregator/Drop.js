/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/Drop.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_types } from "./types.js";

//@ chunk-q87n5wsq.js:2552-2813 cjs-fingerprint
var require_Drop = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DropAggregator = undefined;
  var types_1 = require_types();
  class DropAggregator {
    kind = types_1.AggregatorKind.DROP;
    createAccumulation() {
      return;
    }
    merge(_previous, _delta) {
      return;
    }
    diff(_previous, _current) {
      return;
    }
    toMetricData(_descriptor, _aggregationTemporality, _accumulationByAttributes, _endTime) {
      return;
    }
  }
  cjsExports.DropAggregator = DropAggregator;
});
export { require_Drop };
