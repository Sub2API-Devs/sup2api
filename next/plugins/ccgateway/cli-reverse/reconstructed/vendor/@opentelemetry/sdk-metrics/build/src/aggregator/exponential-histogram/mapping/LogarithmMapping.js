/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/exponential-histogram/mapping/LogarithmMapping.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../../runtime/bun-runtime.js";
import { require_ieee754 } from "./ieee754.js";
import { require_util } from "../util.js";
import { require_types_2 } from "./types.js";

//@ chunk-q87n5wsq.js:9783-11014 cjs-fingerprint
var require_LogarithmMapping = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.LogarithmMapping = undefined;
  var ieee754 = require_ieee754();
  var util = require_util();
  var types_1 = require_types_2();
  class LogarithmMapping {
    _scale;
    _scaleFactor;
    _inverseFactor;
    constructor(scale) {
      this._scale = scale;
      this._scaleFactor = util.ldexp(Math.LOG2E, scale);
      this._inverseFactor = util.ldexp(Math.LN2, -scale);
    }
    mapToIndex(value) {
      if (value <= ieee754.MIN_VALUE) return this._minNormalLowerBoundaryIndex() - 1;
      if (ieee754.getSignificand(value) === 0) return (ieee754.getNormalBase2(value) << this._scale) - 1;
      let index = Math.floor(Math.log(value) * this._scaleFactor);
      let maxIndex = this._maxNormalLowerBoundaryIndex();
      if (index >= maxIndex) return maxIndex;
      return index;
    }
    lowerBoundary(index) {
      let maxIndex = this._maxNormalLowerBoundaryIndex();
      if (index >= maxIndex) {
        if (index === maxIndex) return 2 * Math.exp((index - (1 << this._scale)) / this._scaleFactor);
        throw new types_1.MappingError(`overflow: ${index} is > maximum lower boundary: ${maxIndex}`);
      }
      let minIndex = this._minNormalLowerBoundaryIndex();
      if (index <= minIndex) {
        if (index === minIndex) return ieee754.MIN_VALUE;
        else if (index === minIndex - 1)
          return Math.exp((index + (1 << this._scale)) / this._scaleFactor) / 2;
        throw new types_1.MappingError(`overflow: ${index} is < minimum lower boundary: ${minIndex}`);
      }
      return Math.exp(index * this._inverseFactor);
    }
    get scale() {
      return this._scale;
    }
    _minNormalLowerBoundaryIndex() {
      return ieee754.MIN_NORMAL_EXPONENT << this._scale;
    }
    _maxNormalLowerBoundaryIndex() {
      return ((ieee754.MAX_NORMAL_EXPONENT + 1) << this._scale) - 1;
    }
  }
  cjsExports.LogarithmMapping = LogarithmMapping;
});
export { require_LogarithmMapping };
