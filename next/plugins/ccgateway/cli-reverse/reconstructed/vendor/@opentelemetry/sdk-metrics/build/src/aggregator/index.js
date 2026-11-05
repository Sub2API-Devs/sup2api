/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_Drop } from "./Drop.js";
import { require_Histogram } from "./Histogram.js";
import { require_ExponentialHistogram } from "./ExponentialHistogram.js";
import { require_LastValue } from "./LastValue.js";
import { require_Sum } from "./Sum.js";

//@ chunk-q87n5wsq.js:19312-20669 cjs-fingerprint
var require_aggregator = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SumAggregator =
    cjsExports.SumAccumulation =
    cjsExports.LastValueAggregator =
    cjsExports.LastValueAccumulation =
    cjsExports.ExponentialHistogramAggregator =
    cjsExports.ExponentialHistogramAccumulation =
    cjsExports.HistogramAggregator =
    cjsExports.HistogramAccumulation =
    cjsExports.DropAggregator =
      undefined;
  var Drop_1 = require_Drop();
  Object.defineProperty(cjsExports, "DropAggregator", {
    enumerable: true,
    get: function () {
      return Drop_1.DropAggregator;
    },
  });
  var Histogram_1 = require_Histogram();
  Object.defineProperty(cjsExports, "HistogramAccumulation", {
    enumerable: true,
    get: function () {
      return Histogram_1.HistogramAccumulation;
    },
  });
  Object.defineProperty(cjsExports, "HistogramAggregator", {
    enumerable: true,
    get: function () {
      return Histogram_1.HistogramAggregator;
    },
  });
  var ExponentialHistogram_1 = require_ExponentialHistogram();
  Object.defineProperty(cjsExports, "ExponentialHistogramAccumulation", {
    enumerable: true,
    get: function () {
      return ExponentialHistogram_1.ExponentialHistogramAccumulation;
    },
  });
  Object.defineProperty(cjsExports, "ExponentialHistogramAggregator", {
    enumerable: true,
    get: function () {
      return ExponentialHistogram_1.ExponentialHistogramAggregator;
    },
  });
  var LastValue_1 = require_LastValue();
  Object.defineProperty(cjsExports, "LastValueAccumulation", {
    enumerable: true,
    get: function () {
      return LastValue_1.LastValueAccumulation;
    },
  });
  Object.defineProperty(cjsExports, "LastValueAggregator", {
    enumerable: true,
    get: function () {
      return LastValue_1.LastValueAggregator;
    },
  });
  var Sum_1 = require_Sum();
  Object.defineProperty(cjsExports, "SumAccumulation", {
    enumerable: true,
    get: function () {
      return Sum_1.SumAccumulation;
    },
  });
  Object.defineProperty(cjsExports, "SumAggregator", {
    enumerable: true,
    get: function () {
      return Sum_1.SumAggregator;
    },
  });
});
export { require_aggregator };
