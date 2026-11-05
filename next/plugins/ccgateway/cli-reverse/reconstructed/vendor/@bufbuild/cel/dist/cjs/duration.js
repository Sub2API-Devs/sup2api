/**
 * @bufbuild/cel/dist/cjs/duration.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_error_4 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";

//@ chunk-qg41pqt6.js:481366-482529 cjs-fingerprint
var require_duration = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createDuration = createDuration;
  cjsExports.parseDuration = parseDuration;
  var wkt_1 = require_error_4();
  var protobuf_1 = require_protobuf();
  var ONE_SECOND = 1000000000n;
  var MAX_DURATION_NANOS = 9223372036854775807n;
  var MIN_DURATION_NANOS = -9223372036854775808n;
  function createDuration(seconds = 0n, ns = 0n) {
    let fullNanos = seconds * ONE_SECOND + BigInt(ns);
    if (fullNanos > MAX_DURATION_NANOS || fullNanos < MIN_DURATION_NANOS)
      throw Error("duration out of range");
    return protobuf_1.create(wkt_1.DurationSchema, {
      seconds: fullNanos / ONE_SECOND,
      nanos: Number(fullNanos % ONE_SECOND),
    });
  }
  var DURATION_STRING_LENGTH_LIMIT = 128;
  var UNITS = Object.freeze({
    ns: 1n,
    us: 1000n,
    µs: 1000n,
    ms: 1000n * 1000n,
    s: 1000n * 1000n * 1000n,
    m: 1000n * 1000n * 1000n * 60n,
    h: 1000n * 1000n * 1000n * 60n * 60n,
  });
  var INT_REGEXP = /^\d+/;
  var UNIT_REGEXP = new RegExp(`^(${Object.keys(UNITS).join("|")})`);
  function parseDuration(str) {
    if (str.length > DURATION_STRING_LENGTH_LIMIT)
      throw badDurationStr(`duration string exceeds ${DURATION_STRING_LENGTH_LIMIT} characters`);
    if (/^[-+]?0$/.test(str)) return createDuration();
    let [sign, values] = /^[+-]/.test(str) ? [str[0] === "+" ? 1n : -1n, str.slice(1)] : [1n, str];
    let fullNanos = 0n;
    let remainder = values;
    while (remainder.length > 0) {
      let int = INT_REGEXP.exec(remainder)?.[0];
      remainder = remainder.slice(int?.length ?? 0);
      if (remainder[0] === ".") remainder = remainder.slice(1);
      let fraction = INT_REGEXP.exec(remainder)?.[0];
      remainder = remainder.slice(fraction?.length ?? 0);
      let unit = UNIT_REGEXP.exec(remainder)?.[0];
      remainder = remainder.slice(unit?.length ?? 0);
      if ((int ?? fraction) === undefined || unit === undefined) throw badDurationStr("invalid syntax");
      let factor = UNITS[unit];
      fullNanos += BigInt(int ?? 0) * factor;
      fullNanos += (BigInt(fraction ?? 0) * factor) / 10n ** BigInt(fraction?.length ?? 0);
    }
    return createDuration(0n, sign * fullNanos);
  }
  function badDurationStr(duration) {
    return Error(`Failed to parse duration: ${duration}`);
  }
});
export { require_duration };
