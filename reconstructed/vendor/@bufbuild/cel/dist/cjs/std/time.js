/**
 * @bufbuild/cel/dist/cjs/std/time.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Os } from "../../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { Ei } from "../type.js";
import { q_ } from "../gen/dev/cel/expr/overload_const.js";
import { li } from "../../../../protobuf/dist/commonjs/index.js";
import { Tc } from "../func.js";

//@ chunk-fq0cr76a.js:507433-510126 cjs-fingerprint
var VB = x(function ($B) {
  Object.defineProperty($B, "__esModule", { value: !0 });
  var bd = Os(),
    di = Ei(),
    mr = q_(),
    Ky = li(),
    Vi = Tc();
  function Kse(e) {
    let date = new Date(0, 0, 1);
    date.setFullYear(e.getFullYear());
    let r = e.getTime() - date.getTime();
    return Math.floor(r / 86400000);
  }
  function qse(e, n) {
    let message = e.message,
      timestampDate = bd.timestampDate(message);
    if (n === void 0)
      return new Date(
        timestampDate.getUTCFullYear(),
        timestampDate.getUTCMonth(),
        timestampDate.getUTCDate(),
        timestampDate.getUTCHours(),
        timestampDate.getUTCMinutes(),
        timestampDate.getUTCSeconds(),
        timestampDate.getUTCMilliseconds(),
      );
    let match = n.match(/^(?<sign>[+-]?)(?<hours>\d\d):(?<minutes>\d\d)$/);
    if (match?.groups) {
      let L = match.groups.sign == "-" ? 1 : -1,
        V = parseInt(match.groups.hours),
        K = parseInt(match.groups.minutes),
        q = L * (V * 60 * 60 * 1000 + K * 60 * 1000);
      return (
        (timestampDate = new Date(timestampDate.getTime() - q)),
        new Date(
          timestampDate.getUTCFullYear(),
          timestampDate.getUTCMonth(),
          timestampDate.getUTCDate(),
          timestampDate.getUTCHours(),
          timestampDate.getUTCMinutes(),
          timestampDate.getUTCSeconds(),
          timestampDate.getUTCMilliseconds(),
        )
      );
    }
    let y = new Intl.DateTimeFormat("en-US", {
        hourCycle: "h23",
        hour12: !1,
        timeZone: n,
        year: "numeric",
        month: "numeric",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      b,
      S,
      w,
      R,
      D,
      O;
    for (let L of y.formatToParts(timestampDate))
      switch (L.type) {
        case "year":
          b = parseInt(L.value);
          break;
        case "month":
          S = parseInt(L.value) - 1;
          break;
        case "day":
          w = parseInt(L.value);
          break;
        case "hour":
          R = parseInt(L.value);
          break;
        case "minute":
          D = parseInt(L.value);
          break;
        case "second":
          O = parseInt(L.value);
          break;
      }
    if (b === void 0 || S === void 0 || w === void 0 || R === void 0 || D === void 0 || O === void 0)
      throw Error(`Error converting ${Ky.toJson(bd.TimestampSchema, message)} to IANA timezone ${n}`);
    return new Date(b, S, w, R, D, O, timestampDate.getUTCMilliseconds());
  }
  var { STRING: STRING, INT: INT } = di.CelScalar;
  function qo(e, n) {
    function r(s) {
      let h = qse(this, s),
        y = n(h);
      try {
        return BigInt(y);
      } catch (error) {
        throw Error(
          `Error converting ${y} of ${String(h)} of ${Ky.toJson(bd.TimestampSchema, this.message)} to BigInt`,
        );
      }
    }
    return [Vi.celMethod(e, di.TIMESTAMP, [], INT, r), Vi.celMethod(e, di.TIMESTAMP, [STRING], INT, r)];
  }
  $B.default = [
    Vi.celMethod(mr.TIME_GET_SECONDS, di.DURATION, [], INT, function () {
      return this.message.seconds;
    }),
    Vi.celMethod(mr.TIME_GET_MINUTES, di.DURATION, [], INT, function () {
      return this.message.seconds / 60n;
    }),
    Vi.celMethod(mr.TIME_GET_HOURS, di.DURATION, [], INT, function () {
      return this.message.seconds / 3600n;
    }),
    Vi.celMethod(mr.TIME_GET_MILLISECONDS, di.DURATION, [], INT, function () {
      return BigInt(this.message.nanos) / 1000000n;
    }),
    ...qo(mr.TIME_GET_FULL_YEAR, (e) => e.getFullYear()),
    ...qo(mr.TIME_GET_MONTH, (e) => e.getMonth()),
    ...qo(mr.TIME_GET_DATE, (e) => e.getDate()),
    ...qo(mr.TIME_GET_DAY_OF_MONTH, (e) => e.getDate() - 1),
    ...qo(mr.TIME_GET_DAY_OF_WEEK, (e) => e.getDay()),
    ...qo(mr.TIME_GET_DAY_OF_YEAR, (e) => Kse(e)),
    ...qo(mr.TIME_GET_SECONDS, (e) => e.getSeconds()),
    ...qo(mr.TIME_GET_MINUTES, (e) => e.getMinutes()),
    ...qo(mr.TIME_GET_HOURS, (e) => e.getHours()),
    ...qo(mr.TIME_GET_MILLISECONDS, (e) => e.getMilliseconds()),
  ];
});

export { VB };
