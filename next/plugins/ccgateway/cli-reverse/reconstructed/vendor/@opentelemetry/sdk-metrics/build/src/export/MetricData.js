/**
 * @opentelemetry/sdk-metrics/build/src/export/MetricData.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-q87n5wsq.js:511-1114 cjs-fingerprint
var require_MetricData = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DataPointType = cjsExports.InstrumentType = undefined;
  var InstrumentType;
  (function (InstrumentType) {
    InstrumentType.COUNTER = "COUNTER";
    InstrumentType.GAUGE = "GAUGE";
    InstrumentType.HISTOGRAM = "HISTOGRAM";
    InstrumentType.UP_DOWN_COUNTER = "UP_DOWN_COUNTER";
    InstrumentType.OBSERVABLE_COUNTER = "OBSERVABLE_COUNTER";
    InstrumentType.OBSERVABLE_GAUGE = "OBSERVABLE_GAUGE";
    InstrumentType.OBSERVABLE_UP_DOWN_COUNTER = "OBSERVABLE_UP_DOWN_COUNTER";
  })((InstrumentType = cjsExports.InstrumentType || (cjsExports.InstrumentType = {})));
  var DataPointType;
  (function (DataPointType) {
    DataPointType[(DataPointType.HISTOGRAM = 0)] = "HISTOGRAM";
    DataPointType[(DataPointType.EXPONENTIAL_HISTOGRAM = 1)] = "EXPONENTIAL_HISTOGRAM";
    DataPointType[(DataPointType.GAUGE = 2)] = "GAUGE";
    DataPointType[(DataPointType.SUM = 3)] = "SUM";
  })((DataPointType = cjsExports.DataPointType || (cjsExports.DataPointType = {})));
});
export { require_MetricData };
