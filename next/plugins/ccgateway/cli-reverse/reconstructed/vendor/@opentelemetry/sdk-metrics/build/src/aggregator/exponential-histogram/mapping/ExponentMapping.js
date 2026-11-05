/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/exponential-histogram/mapping/ExponentMapping.js
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

//@ chunk-q87n5wsq.js:8809-9783 cjs-fingerprint
var require_ExponentMapping = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ExponentMapping = undefined;
  var ieee754 = require_ieee754();
  var util = require_util();
  var types_1 = require_types_2();
  class ExponentMapping {
    _shift;
    constructor(scale) {
      this._shift = -scale;
    }
    mapToIndex(value) {
      if (value < ieee754.MIN_VALUE) return this._minNormalLowerBoundaryIndex();
      let exp = ieee754.getNormalBase2(value);
      let correction = this._rightShift(ieee754.getSignificand(value) - 1, ieee754.SIGNIFICAND_WIDTH);
      return (exp + correction) >> this._shift;
    }
    lowerBoundary(index) {
      let minIndex = this._minNormalLowerBoundaryIndex();
      if (index < minIndex)
        throw new types_1.MappingError(`underflow: ${index} is < minimum lower boundary: ${minIndex}`);
      let maxIndex = this._maxNormalLowerBoundaryIndex();
      if (index > maxIndex)
        throw new types_1.MappingError(`overflow: ${index} is > maximum lower boundary: ${maxIndex}`);
      return util.ldexp(1, index << this._shift);
    }
    get scale() {
      if (this._shift === 0) return 0;
      return -this._shift;
    }
    _minNormalLowerBoundaryIndex() {
      let index = ieee754.MIN_NORMAL_EXPONENT >> this._shift;
      if (this._shift < 2) index--;
      return index;
    }
    _maxNormalLowerBoundaryIndex() {
      return ieee754.MAX_NORMAL_EXPONENT >> this._shift;
    }
    _rightShift(value, shift) {
      return Math.floor(value * Math.pow(2, -shift));
    }
  }
  cjsExports.ExponentMapping = ExponentMapping;
});
export { require_ExponentMapping };
