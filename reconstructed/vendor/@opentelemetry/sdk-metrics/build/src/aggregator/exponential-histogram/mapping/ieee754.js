/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/exponential-histogram/mapping/ieee754.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-wrv5s6k4.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../../runtime/bun-runtime.js";

//@ chunk-wrv5s6k4.js:7681-8315 cjs-fingerprint
var require_ieee754 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getSignificand =
    cjsExports.getNormalBase2 =
    cjsExports.MIN_VALUE =
    cjsExports.MAX_NORMAL_EXPONENT =
    cjsExports.MIN_NORMAL_EXPONENT =
    cjsExports.SIGNIFICAND_WIDTH =
      undefined;
  cjsExports.SIGNIFICAND_WIDTH = 52;
  var EXPONENT_MASK = 2146435072;
  var SIGNIFICAND_MASK = 1048575;
  var EXPONENT_BIAS = 1023;
  cjsExports.MIN_NORMAL_EXPONENT = -EXPONENT_BIAS + 1;
  cjsExports.MAX_NORMAL_EXPONENT = EXPONENT_BIAS;
  cjsExports.MIN_VALUE = Math.pow(2, -1022);
  function getNormalBase2(value) {
    let dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, value);
    return ((dv.getUint32(0) & EXPONENT_MASK) >> 20) - EXPONENT_BIAS;
  }
  cjsExports.getNormalBase2 = getNormalBase2;
  function getSignificand(value) {
    let dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, value);
    let hiBits = dv.getUint32(0);
    let loBits = dv.getUint32(4);
    return (hiBits & SIGNIFICAND_MASK) * Math.pow(2, 32) + loBits;
  }
  cjsExports.getSignificand = getSignificand;
});
export { require_ieee754 };
