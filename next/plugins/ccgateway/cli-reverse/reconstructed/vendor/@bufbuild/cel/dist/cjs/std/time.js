/**
 * @bufbuild/cel/dist/cjs/std/time.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_error_4 } from "../../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_type } from "../type.js";
import { require_overload_const } from "../gen/dev/cel/expr/overload_const.js";
import { require_protobuf } from "../../../../protobuf/dist/commonjs/index.js";
import { require_func } from "../func.js";

//@ chunk-qg41pqt6.js:508007-510700 cjs-fingerprint
var require_time = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var wkt_1 = require_error_4();
  var type_js_1 = require_type();
  var olc = require_overload_const();
  var protobuf_1 = require_protobuf();
  var func_js_1 = require_func();
  function getDayOfYear(date) {
    let start = new Date(0, 0, 1);
    start.setFullYear(date.getFullYear());
    let diff = date.getTime() - start.getTime();
    return Math.floor(diff / 86400000);
  }
  function convertToDate(msg, tz) {
    let ts = msg.message;
    let val = wkt_1.timestampDate(ts);
    if (tz === undefined)
      return new Date(
        val.getUTCFullYear(),
        val.getUTCMonth(),
        val.getUTCDate(),
        val.getUTCHours(),
        val.getUTCMinutes(),
        val.getUTCSeconds(),
        val.getUTCMilliseconds(),
      );
    let timeOffset = tz.match(/^(?<sign>[+-]?)(?<hours>\d\d):(?<minutes>\d\d)$/);
    if (timeOffset?.groups) {
      let sign = timeOffset.groups.sign == "-" ? 1 : -1;
      let hours = parseInt(timeOffset.groups.hours);
      let minutes = parseInt(timeOffset.groups.minutes);
      let offset = sign * (hours * 60 * 60 * 1000 + minutes * 60 * 1000);
      val = new Date(val.getTime() - offset);
      return new Date(
        val.getUTCFullYear(),
        val.getUTCMonth(),
        val.getUTCDate(),
        val.getUTCHours(),
        val.getUTCMinutes(),
        val.getUTCSeconds(),
        val.getUTCMilliseconds(),
      );
    }
    let format = new Intl.DateTimeFormat("en-US", {
      hourCycle: "h23",
      hour12: false,
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    let year;
    let month;
    let day;
    let hour;
    let minute;
    let second;
    for (let part of format.formatToParts(val))
      switch (part.type) {
        case "year":
          year = parseInt(part.value);
          break;
        case "month":
          month = parseInt(part.value) - 1;
          break;
        case "day":
          day = parseInt(part.value);
          break;
        case "hour":
          hour = parseInt(part.value);
          break;
        case "minute":
          minute = parseInt(part.value);
          break;
        case "second":
          second = parseInt(part.value);
          break;
      }
    if (
      year === undefined ||
      month === undefined ||
      day === undefined ||
      hour === undefined ||
      minute === undefined ||
      second === undefined
    )
      throw Error(`Error converting ${protobuf_1.toJson(wkt_1.TimestampSchema, ts)} to IANA timezone ${tz}`);
    return new Date(year, month, day, hour, minute, second, val.getUTCMilliseconds());
  }
  var { STRING, INT } = type_js_1.CelScalar;
  function celTimeMethods(name, func) {
    function method(tz) {
      let date = convertToDate(this, tz);
      let result = func(date);
      try {
        return BigInt(result);
      } catch (_e) {
        throw Error(
          `Error converting ${result} of ${String(date)} of ${protobuf_1.toJson(wkt_1.TimestampSchema, this.message)} to BigInt`,
        );
      }
    }
    return [
      func_js_1.celMethod(name, type_js_1.TIMESTAMP, [], INT, method),
      func_js_1.celMethod(name, type_js_1.TIMESTAMP, [STRING], INT, method),
    ];
  }
  cjsExports.default = [
    func_js_1.celMethod(olc.TIME_GET_SECONDS, type_js_1.DURATION, [], INT, function () {
      return this.message.seconds;
    }),
    func_js_1.celMethod(olc.TIME_GET_MINUTES, type_js_1.DURATION, [], INT, function () {
      return this.message.seconds / 60n;
    }),
    func_js_1.celMethod(olc.TIME_GET_HOURS, type_js_1.DURATION, [], INT, function () {
      return this.message.seconds / 3600n;
    }),
    func_js_1.celMethod(olc.TIME_GET_MILLISECONDS, type_js_1.DURATION, [], INT, function () {
      return BigInt(this.message.nanos) / 1000000n;
    }),
    ...celTimeMethods(olc.TIME_GET_FULL_YEAR, (x) => x.getFullYear()),
    ...celTimeMethods(olc.TIME_GET_MONTH, (x) => x.getMonth()),
    ...celTimeMethods(olc.TIME_GET_DATE, (x) => x.getDate()),
    ...celTimeMethods(olc.TIME_GET_DAY_OF_MONTH, (x) => x.getDate() - 1),
    ...celTimeMethods(olc.TIME_GET_DAY_OF_WEEK, (x) => x.getDay()),
    ...celTimeMethods(olc.TIME_GET_DAY_OF_YEAR, (x) => getDayOfYear(x)),
    ...celTimeMethods(olc.TIME_GET_SECONDS, (x) => x.getSeconds()),
    ...celTimeMethods(olc.TIME_GET_MINUTES, (x) => x.getMinutes()),
    ...celTimeMethods(olc.TIME_GET_HOURS, (x) => x.getHours()),
    ...celTimeMethods(olc.TIME_GET_MILLISECONDS, (x) => x.getMilliseconds()),
  ];
});
export { require_time };
