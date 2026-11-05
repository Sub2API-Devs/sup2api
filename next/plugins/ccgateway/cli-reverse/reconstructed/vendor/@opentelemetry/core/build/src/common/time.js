/**
 * @opentelemetry/core/build/src/common/time.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_platform_4 } from "../platform/index.js";

//@ chunk-7kayq7nc.js:118435-120113 cjs-fingerprint
var require_time = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.addHrTimes =
    cjsExports.isTimeInput =
    cjsExports.isTimeInputHrTime =
    cjsExports.hrTimeToMicroseconds =
    cjsExports.hrTimeToMilliseconds =
    cjsExports.hrTimeToNanoseconds =
    cjsExports.hrTimeToTimeStamp =
    cjsExports.hrTimeDuration =
    cjsExports.timeInputToHrTime =
    cjsExports.hrTime =
    cjsExports.getTimeOrigin =
    cjsExports.millisToHrTime =
      undefined;
  var platform_1 = require_platform_4();
  var NANOSECOND_DIGITS = 9;
  var NANOSECOND_DIGITS_IN_MILLIS = 6;
  var MILLISECONDS_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS_IN_MILLIS);
  var SECOND_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS);
  function millisToHrTime(epochMillis) {
    let epochSeconds = epochMillis / 1000;
    let seconds = Math.trunc(epochSeconds);
    let nanos = Math.round((epochMillis % 1000) * MILLISECONDS_TO_NANOSECONDS);
    return [seconds, nanos];
  }
  cjsExports.millisToHrTime = millisToHrTime;
  function getTimeOrigin() {
    return platform_1.otperformance.timeOrigin;
  }
  cjsExports.getTimeOrigin = getTimeOrigin;
  function hrTime(performanceNow) {
    let timeOrigin = millisToHrTime(platform_1.otperformance.timeOrigin);
    let now = millisToHrTime(
      typeof performanceNow === "number" ? performanceNow : platform_1.otperformance.now(),
    );
    return addHrTimes(timeOrigin, now);
  }
  cjsExports.hrTime = hrTime;
  function timeInputToHrTime(time) {
    if (isTimeInputHrTime(time)) return time;
    else if (typeof time === "number") {
      if (time < platform_1.otperformance.timeOrigin) return hrTime(time);
      else return millisToHrTime(time);
    } else if (time instanceof Date) return millisToHrTime(time.getTime());
    else throw TypeError("Invalid input type");
  }
  cjsExports.timeInputToHrTime = timeInputToHrTime;
  function hrTimeDuration(startTime, endTime) {
    let seconds = endTime[0] - startTime[0];
    let nanos = endTime[1] - startTime[1];
    if (nanos < 0) {
      seconds -= 1;
      nanos += SECOND_TO_NANOSECONDS;
    }
    return [seconds, nanos];
  }
  cjsExports.hrTimeDuration = hrTimeDuration;
  function hrTimeToTimeStamp(time) {
    let precision = NANOSECOND_DIGITS;
    let tmp = `${"0".repeat(precision)}${time[1]}Z`;
    let nanoString = tmp.substring(tmp.length - precision - 1);
    return new Date(time[0] * 1000).toISOString().replace("000Z", nanoString);
  }
  cjsExports.hrTimeToTimeStamp = hrTimeToTimeStamp;
  function hrTimeToNanoseconds(time) {
    return time[0] * SECOND_TO_NANOSECONDS + time[1];
  }
  cjsExports.hrTimeToNanoseconds = hrTimeToNanoseconds;
  function hrTimeToMilliseconds(time) {
    return time[0] * 1000 + time[1] / 1e6;
  }
  cjsExports.hrTimeToMilliseconds = hrTimeToMilliseconds;
  function hrTimeToMicroseconds(time) {
    return time[0] * 1e6 + time[1] / 1000;
  }
  cjsExports.hrTimeToMicroseconds = hrTimeToMicroseconds;
  function isTimeInputHrTime(value) {
    return (
      Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    );
  }
  cjsExports.isTimeInputHrTime = isTimeInputHrTime;
  function isTimeInput(value) {
    return isTimeInputHrTime(value) || typeof value === "number" || value instanceof Date;
  }
  cjsExports.isTimeInput = isTimeInput;
  function addHrTimes(time1, time2) {
    let out = [time1[0] + time2[0], time1[1] + time2[1]];
    if (out[1] >= SECOND_TO_NANOSECONDS) {
      out[1] -= SECOND_TO_NANOSECONDS;
      out[0] += 1;
    }
    return out;
  }
  cjsExports.addHrTimes = addHrTimes;
});
export { require_time };
