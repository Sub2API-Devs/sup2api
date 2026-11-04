/**
 * @opentelemetry/otlp-transformer/build/src/common/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../../core/build/src/index.js";
import { require_hex_to_binary } from "./hex-to-binary.js";

//@ chunk-798ashq9.js:242618-243595 cjs-fingerprint
var require_utils = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getOtlpEncoder =
    cjsExports.encodeAsString =
    cjsExports.encodeAsLongBits =
    cjsExports.toLongBits =
    cjsExports.hrTimeToNanos =
      undefined;
  var core_1 = require_core();
  var hex_to_binary_1 = require_hex_to_binary();
  function hrTimeToNanos(hrTime) {
    let NANOSECONDS = BigInt(1e9);
    return BigInt(Math.trunc(hrTime[0])) * NANOSECONDS + BigInt(Math.trunc(hrTime[1]));
  }
  cjsExports.hrTimeToNanos = hrTimeToNanos;
  function toLongBits(value) {
    let low = Number(BigInt.asUintN(32, value));
    let high = Number(BigInt.asUintN(32, value >> BigInt(32)));
    return {
      low,
      high,
    };
  }
  cjsExports.toLongBits = toLongBits;
  function encodeAsLongBits(hrTime) {
    let nanos = hrTimeToNanos(hrTime);
    return toLongBits(nanos);
  }
  cjsExports.encodeAsLongBits = encodeAsLongBits;
  function encodeAsString(hrTime) {
    return hrTimeToNanos(hrTime).toString();
  }
  cjsExports.encodeAsString = encodeAsString;
  var encodeTimestamp = typeof BigInt !== "undefined" ? encodeAsString : core_1.hrTimeToNanoseconds;
  function identity(value) {
    return value;
  }
  function optionalHexToBinary(str) {
    if (str === undefined) return;
    return hex_to_binary_1.hexToBinary(str);
  }
  var DEFAULT_ENCODER = {
    encodeHrTime: encodeAsLongBits,
    encodeSpanContext: hex_to_binary_1.hexToBinary,
    encodeOptionalSpanContext: optionalHexToBinary,
  };
  function getOtlpEncoder(options) {
    if (options === undefined) return DEFAULT_ENCODER;
    let useLongBits = options.useLongBits ?? true;
    let useHex = options.useHex ?? false;
    return {
      encodeHrTime: useLongBits ? encodeAsLongBits : encodeTimestamp,
      encodeSpanContext: useHex ? identity : hex_to_binary_1.hexToBinary,
      encodeOptionalSpanContext: useHex ? identity : optionalHexToBinary,
    };
  }
  cjsExports.getOtlpEncoder = getOtlpEncoder;
});
export { require_utils };
