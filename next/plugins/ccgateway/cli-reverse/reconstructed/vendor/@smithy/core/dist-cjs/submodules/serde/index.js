/**
 * @smithy/core/dist-cjs/submodules/serde/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-1fkvp0h1.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_v4 } from "../../../index.js";

//@ chunk-1fkvp0h1.js:22651-35068 cjs-require-graph
var require_serde = __commonJS(function (cjsExports) {
  var v4 = require_v4();
  var copyDocumentWithTransform = (source, input, offset = (input) => input) => source;
  var parseBoolean = (value) => {
    switch (value) {
      case "true":
        return true;
      case "false":
        return false;
      default:
        throw Error(`Unable to parse boolean value "${value}"`);
    }
  };
  var expectBoolean = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value === "number") {
      if (value === 0 || value === 1)
        logger.warn(stackTraceWarning(`Expected boolean, got ${typeof value}: ${value}`));
      if (value === 0) return false;
      if (value === 1) return true;
    }
    if (typeof value === "string") {
      let lower = value.toLowerCase();
      if (lower === "false" || lower === "true")
        logger.warn(stackTraceWarning(`Expected boolean, got ${typeof value}: ${value}`));
      if (lower === "false") return false;
      if (lower === "true") return true;
    }
    if (typeof value === "boolean") return value;
    throw TypeError(`Expected boolean, got ${typeof value}: ${value}`);
  };
  var expectNumber = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value === "string") {
      let parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) {
        if (String(parsed) !== String(value))
          logger.warn(stackTraceWarning(`Expected number but observed string: ${value}`));
        return parsed;
      }
    }
    if (typeof value === "number") return value;
    throw TypeError(`Expected number, got ${typeof value}: ${value}`);
  };
  var MAX_FLOAT = Math.ceil(340282346638528860000000000000000000000);
  var expectFloat32 = (value) => {
    let expected = expectNumber(value);
    if (expected !== undefined && !Number.isNaN(expected) && expected !== 1 / 0 && expected !== -1 / 0) {
      if (Math.abs(expected) > MAX_FLOAT) throw TypeError(`Expected 32-bit float, got ${value}`);
    }
    return expected;
  };
  var expectLong = (value) => {
    if (value === null || value === undefined) return;
    if (Number.isInteger(value) && !Number.isNaN(value)) return value;
    throw TypeError(`Expected integer, got ${typeof value}: ${value}`);
  };
  var expectInt = expectLong;
  var expectInt32 = (value) => expectSizedInt(value, 32);
  var expectShort = (value) => expectSizedInt(value, 16);
  var expectByte = (value) => expectSizedInt(value, 8);
  var expectSizedInt = (value, size) => {
    let expected = expectLong(value);
    if (expected !== undefined && castInt(expected, size) !== expected)
      throw TypeError(`Expected ${size}-bit integer, got ${value}`);
    return expected;
  };
  var castInt = (value, size) => {
    switch (size) {
      case 32:
        return Int32Array.of(value)[0];
      case 16:
        return Int16Array.of(value)[0];
      case 8:
        return Int8Array.of(value)[0];
    }
  };
  var expectNonNull = (value, location) => {
    if (value === null || value === undefined) {
      if (location) throw TypeError(`Expected a non-null value for ${location}`);
      throw TypeError("Expected a non-null value");
    }
    return value;
  };
  var expectObject = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value === "object" && !Array.isArray(value)) return value;
    let receivedType = Array.isArray(value) ? "array" : typeof value;
    throw TypeError(`Expected object, got ${receivedType}: ${value}`);
  };
  var expectString = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value === "string") return value;
    if (["boolean", "number", "bigint"].includes(typeof value)) {
      logger.warn(stackTraceWarning(`Expected string, got ${typeof value}: ${value}`));
      return String(value);
    }
    throw TypeError(`Expected string, got ${typeof value}: ${value}`);
  };
  var expectUnion = (value) => {
    if (value === null || value === undefined) return;
    let asObject = expectObject(value);
    let setKeys = Object.entries(asObject)
      .filter(([, value]) => value != null)
      .map(([key]) => key);
    if (setKeys.length === 0)
      throw TypeError("Unions must have exactly one non-null member. None were found.");
    if (setKeys.length > 1)
      throw TypeError(`Unions must have exactly one non-null member. Keys ${setKeys} were not null.`);
    return asObject;
  };
  var strictParseDouble = (value) => {
    if (typeof value == "string") return expectNumber(parseNumber(value));
    return expectNumber(value);
  };
  var strictParseFloat = strictParseDouble;
  var strictParseFloat32 = (value) => {
    if (typeof value == "string") return expectFloat32(parseNumber(value));
    return expectFloat32(value);
  };
  var NUMBER_REGEX = /(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|(-?Infinity)|(NaN)/g;
  var parseNumber = (value) => {
    let matches = value.match(NUMBER_REGEX);
    if (matches === null || matches[0].length !== value.length)
      throw TypeError("Expected real number, got implicit NaN");
    return parseFloat(value);
  };
  var limitedParseDouble = (value) => {
    if (typeof value == "string") return parseFloatString(value);
    return expectNumber(value);
  };
  var handleFloat = limitedParseDouble;
  var limitedParseFloat = limitedParseDouble;
  var limitedParseFloat32 = (value) => {
    if (typeof value == "string") return parseFloatString(value);
    return expectFloat32(value);
  };
  var parseFloatString = (value) => {
    switch (value) {
      case "NaN":
        return NaN;
      case "Infinity":
        return 1 / 0;
      case "-Infinity":
        return -1 / 0;
      default:
        throw Error(`Unable to parse float value: ${value}`);
    }
  };
  var strictParseLong = (value) => {
    if (typeof value === "string") return expectLong(parseNumber(value));
    return expectLong(value);
  };
  var strictParseInt = strictParseLong;
  var strictParseInt32 = (value) => {
    if (typeof value === "string") return expectInt32(parseNumber(value));
    return expectInt32(value);
  };
  var strictParseShort = (value) => {
    if (typeof value === "string") return expectShort(parseNumber(value));
    return expectShort(value);
  };
  var strictParseByte = (value) => {
    if (typeof value === "string") return expectByte(parseNumber(value));
    return expectByte(value);
  };
  var stackTraceWarning = (message) =>
    String(TypeError(message).stack || message)
      .split(
        `
`,
      )
      .slice(0, 5)
      .filter((s) => !s.includes("stackTraceWarning")).join(`
`);
  var logger = {
    warn: console.warn,
  };
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function dateToUtcString(date) {
    let year = date.getUTCFullYear();
    let month = date.getUTCMonth();
    let dayOfWeek = date.getUTCDay();
    let dayOfMonthInt = date.getUTCDate();
    let hoursInt = date.getUTCHours();
    let minutesInt = date.getUTCMinutes();
    let secondsInt = date.getUTCSeconds();
    let dayOfMonthString = dayOfMonthInt < 10 ? `0${dayOfMonthInt}` : `${dayOfMonthInt}`;
    let hoursString = hoursInt < 10 ? `0${hoursInt}` : `${hoursInt}`;
    let minutesString = minutesInt < 10 ? `0${minutesInt}` : `${minutesInt}`;
    let secondsString = secondsInt < 10 ? `0${secondsInt}` : `${secondsInt}`;
    return `${DAYS[dayOfWeek]}, ${dayOfMonthString} ${MONTHS[month]} ${year} ${hoursString}:${minutesString}:${secondsString} GMT`;
  }
  var RFC3339 = new RegExp(/^(\d{4})-(\d{2})-(\d{2})[tT](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?[zZ]$/);
  var parseRfc3339DateTime = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value !== "string") throw TypeError("RFC-3339 date-times must be expressed as strings");
    let match = RFC3339.exec(value);
    if (!match) throw TypeError("Invalid RFC-3339 date-time value");
    let [_, yearStr, monthStr, dayStr, hours, minutes, seconds, fractionalMilliseconds] = match;
    let year = strictParseShort(stripLeadingZeroes(yearStr));
    let month = parseDateValue(monthStr, "month", 1, 12);
    let day = parseDateValue(dayStr, "day", 1, 31);
    return buildDate(year, month, day, {
      hours,
      minutes,
      seconds,
      fractionalMilliseconds,
    });
  };
  var RFC3339_WITH_OFFSET$1 = new RegExp(
    /^(\d{4})-(\d{2})-(\d{2})[tT](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(([-+]\d{2}\:\d{2})|[zZ])$/,
  );
  var parseRfc3339DateTimeWithOffset = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value !== "string") throw TypeError("RFC-3339 date-times must be expressed as strings");
    let match = RFC3339_WITH_OFFSET$1.exec(value);
    if (!match) throw TypeError("Invalid RFC-3339 date-time value");
    let [_, yearStr, monthStr, dayStr, hours, minutes, seconds, fractionalMilliseconds, offsetStr] = match;
    let year = strictParseShort(stripLeadingZeroes(yearStr));
    let month = parseDateValue(monthStr, "month", 1, 12);
    let day = parseDateValue(dayStr, "day", 1, 31);
    let date = buildDate(year, month, day, {
      hours,
      minutes,
      seconds,
      fractionalMilliseconds,
    });
    if (offsetStr.toUpperCase() != "Z") date.setTime(date.getTime() - parseOffsetToMilliseconds(offsetStr));
    return date;
  };
  var IMF_FIXDATE$1 = new RegExp(
    /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? GMT$/,
  );
  var RFC_850_DATE$1 = new RegExp(
    /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? GMT$/,
  );
  var ASC_TIME$1 = new RegExp(
    /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( [1-9]|\d{2}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? (\d{4})$/,
  );
  var parseRfc7231DateTime = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value !== "string") throw TypeError("RFC-7231 date-times must be expressed as strings");
    let match = IMF_FIXDATE$1.exec(value);
    if (match) {
      let [_, dayStr, monthStr, yearStr, hours, minutes, seconds, fractionalMilliseconds] = match;
      return buildDate(
        strictParseShort(stripLeadingZeroes(yearStr)),
        parseMonthByShortName(monthStr),
        parseDateValue(dayStr, "day", 1, 31),
        {
          hours,
          minutes,
          seconds,
          fractionalMilliseconds,
        },
      );
    }
    match = RFC_850_DATE$1.exec(value);
    if (match) {
      let [_, dayStr, monthStr, yearStr, hours, minutes, seconds, fractionalMilliseconds] = match;
      return adjustRfc850Year(
        buildDate(
          parseTwoDigitYear(yearStr),
          parseMonthByShortName(monthStr),
          parseDateValue(dayStr, "day", 1, 31),
          {
            hours,
            minutes,
            seconds,
            fractionalMilliseconds,
          },
        ),
      );
    }
    match = ASC_TIME$1.exec(value);
    if (match) {
      let [_, monthStr, dayStr, hours, minutes, seconds, fractionalMilliseconds, yearStr] = match;
      return buildDate(
        strictParseShort(stripLeadingZeroes(yearStr)),
        parseMonthByShortName(monthStr),
        parseDateValue(dayStr.trimLeft(), "day", 1, 31),
        {
          hours,
          minutes,
          seconds,
          fractionalMilliseconds,
        },
      );
    }
    throw TypeError("Invalid RFC-7231 date-time value");
  };
  var parseEpochTimestamp = (value) => {
    if (value === null || value === undefined) return;
    let valueAsDouble;
    if (typeof value === "number") valueAsDouble = value;
    else if (typeof value === "string") valueAsDouble = strictParseDouble(value);
    else if (typeof value === "object" && value.tag === 1) valueAsDouble = value.value;
    else
      throw TypeError(
        "Epoch timestamps must be expressed as floating point numbers or their string representation",
      );
    if (Number.isNaN(valueAsDouble) || valueAsDouble === 1 / 0 || valueAsDouble === -1 / 0)
      throw TypeError("Epoch timestamps must be valid, non-Infinite, non-NaN numerics");
    return new Date(Math.round(valueAsDouble * 1000));
  };
  var buildDate = (year, month, day, time) => {
    let adjustedMonth = month - 1;
    validateDayOfMonth(year, adjustedMonth, day);
    return new Date(
      Date.UTC(
        year,
        adjustedMonth,
        day,
        parseDateValue(time.hours, "hour", 0, 23),
        parseDateValue(time.minutes, "minute", 0, 59),
        parseDateValue(time.seconds, "seconds", 0, 60),
        parseMilliseconds(time.fractionalMilliseconds),
      ),
    );
  };
  var parseTwoDigitYear = (value) => {
    let thisYear = new Date().getUTCFullYear();
    let valueInThisCentury = Math.floor(thisYear / 100) * 100 + strictParseShort(stripLeadingZeroes(value));
    if (valueInThisCentury < thisYear) return valueInThisCentury + 100;
    return valueInThisCentury;
  };
  var FIFTY_YEARS_IN_MILLIS = 1576800000000;
  var adjustRfc850Year = (input) => {
    if (input.getTime() - new Date().getTime() > FIFTY_YEARS_IN_MILLIS)
      return new Date(
        Date.UTC(
          input.getUTCFullYear() - 100,
          input.getUTCMonth(),
          input.getUTCDate(),
          input.getUTCHours(),
          input.getUTCMinutes(),
          input.getUTCSeconds(),
          input.getUTCMilliseconds(),
        ),
      );
    return input;
  };
  var parseMonthByShortName = (value) => {
    let monthIdx = MONTHS.indexOf(value);
    if (monthIdx < 0) throw TypeError(`Invalid month: ${value}`);
    return monthIdx + 1;
  };
  var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var validateDayOfMonth = (year, month, day) => {
    let maxDays = DAYS_IN_MONTH[month];
    if (month === 1 && isLeapYear(year)) maxDays = 29;
    if (day > maxDays) throw TypeError(`Invalid day for ${MONTHS[month]} in ${year}: ${day}`);
  };
  var isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  var parseDateValue = (value, type, lower, upper) => {
    let dateVal = strictParseByte(stripLeadingZeroes(value));
    if (dateVal < lower || dateVal > upper)
      throw TypeError(`${type} must be between ${lower} and ${upper}, inclusive`);
    return dateVal;
  };
  var parseMilliseconds = (value) => {
    if (value === null || value === undefined) return 0;
    return strictParseFloat32("0." + value) * 1000;
  };
  var parseOffsetToMilliseconds = (value) => {
    let directionStr = value[0];
    let direction = 1;
    if (directionStr == "+") direction = 1;
    else if (directionStr == "-") direction = -1;
    else throw TypeError(`Offset direction, ${directionStr}, must be "+" or "-"`);
    let hour = Number(value.substring(1, 3));
    let minute = Number(value.substring(4, 6));
    return direction * (hour * 60 + minute) * 60 * 1000;
  };
  var stripLeadingZeroes = (value) => {
    let idx = 0;
    while (idx < value.length - 1 && value.charAt(idx) === "0") idx++;
    if (idx === 0) return value;
    return value.slice(idx);
  };
  var LazyJsonString = function (val) {
    return Object.assign(new String(val), {
      deserializeJSON() {
        return JSON.parse(String(val));
      },
      toString() {
        return String(val);
      },
      toJSON() {
        return String(val);
      },
    });
  };
  LazyJsonString.from = (object) => {
    if (
      object &&
      typeof object === "object" &&
      (object instanceof LazyJsonString || "deserializeJSON" in object)
    )
      return object;
    else if (typeof object === "string" || Object.getPrototypeOf(object) === String.prototype)
      return LazyJsonString(String(object));
    return LazyJsonString(JSON.stringify(object));
  };
  LazyJsonString.fromObject = LazyJsonString.from;
  function quoteHeader(part) {
    if (part.includes(",") || part.includes('"')) part = `"${part.replace(/"/g, '\\"')}"`;
    return part;
  }
  var ddd = "(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:[ne|u?r]?s?day)?";
  var mmm = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
  var time = "(\\d?\\d):(\\d{2}):(\\d{2})(?:\\.(\\d+))?";
  var date = "(\\d?\\d)";
  var year = "(\\d{4})";
  var RFC3339_WITH_OFFSET = new RegExp(
    /^(\d{4})-(\d\d)-(\d\d)[tT](\d\d):(\d\d):(\d\d)(\.(\d+))?(([-+]\d\d:\d\d)|[zZ])$/,
  );
  var IMF_FIXDATE = new RegExp(`^${ddd}, ${date} ${mmm} ${year} ${time} GMT$`);
  var RFC_850_DATE = new RegExp(`^${ddd}, ${date}-${mmm}-(\\d\\d) ${time} GMT$`);
  var ASC_TIME = new RegExp(`^${ddd} ${mmm} ( [1-9]|\\d\\d) ${time} ${year}$`);
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var _parseEpochTimestamp = (value) => {
    if (value == null) return;
    let num = NaN;
    if (typeof value === "number") num = value;
    else if (typeof value === "string") {
      if (!/^-?\d*\.?\d+$/.test(value)) throw TypeError("parseEpochTimestamp - numeric string invalid.");
      num = Number.parseFloat(value);
    } else if (typeof value === "object" && value.tag === 1) num = value.value;
    if (isNaN(num) || Math.abs(num) === 1 / 0)
      throw TypeError("Epoch timestamps must be valid finite numbers.");
    return new Date(Math.round(num * 1000));
  };
  var _parseRfc3339DateTimeWithOffset = (value) => {
    if (value == null) return;
    if (typeof value !== "string") throw TypeError("RFC3339 timestamps must be strings");
    let matches = RFC3339_WITH_OFFSET.exec(value);
    if (!matches) throw TypeError(`Invalid RFC3339 timestamp format ${value}`);
    let [, yearStr, monthStr, dayStr, hours, minutes, seconds, , ms, offsetStr] = matches;
    range(monthStr, 1, 12);
    range(dayStr, 1, 31);
    range(hours, 0, 23);
    range(minutes, 0, 59);
    range(seconds, 0, 60);
    let date = new Date(
      Date.UTC(
        Number(yearStr),
        Number(monthStr) - 1,
        Number(dayStr),
        Number(hours),
        Number(minutes),
        Number(seconds),
        Number(ms) ? Math.round(parseFloat(`0.${ms}`) * 1000) : 0,
      ),
    );
    date.setUTCFullYear(Number(yearStr));
    if (offsetStr.toUpperCase() != "Z") {
      let [, sign, offsetH, offsetM] = /([+-])(\d\d):(\d\d)/.exec(offsetStr) || [undefined, "+", 0, 0];
      let scalar = sign === "-" ? 1 : -1;
      date.setTime(
        date.getTime() + scalar * (Number(offsetH) * 60 * 60 * 1000 + Number(offsetM) * 60 * 1000),
      );
    }
    return date;
  };
  var _parseRfc7231DateTime = (value) => {
    if (value == null) return;
    if (typeof value !== "string") throw TypeError("RFC7231 timestamps must be strings.");
    let day;
    let month;
    let year;
    let hour;
    let minute;
    let second;
    let fraction;
    let matches;
    if ((matches = IMF_FIXDATE.exec(value))) [, day, month, year, hour, minute, second, fraction] = matches;
    else if ((matches = RFC_850_DATE.exec(value))) {
      [, day, month, year, hour, minute, second, fraction] = matches;
      year = (Number(year) + 1900).toString();
    } else if ((matches = ASC_TIME.exec(value)))
      [, month, day, hour, minute, second, fraction, year] = matches;
    if (year && second) {
      let timestamp = Date.UTC(
        Number(year),
        months.indexOf(month),
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        fraction ? Math.round(parseFloat(`0.${fraction}`) * 1000) : 0,
      );
      range(day, 1, 31);
      range(hour, 0, 23);
      range(minute, 0, 59);
      range(second, 0, 60);
      let date = new Date(timestamp);
      date.setUTCFullYear(Number(year));
      return date;
    }
    throw TypeError(`Invalid RFC7231 date-time value ${value}.`);
  };
  function range(v, min, max) {
    let _v = Number(v);
    if (_v < min || _v > max) throw Error(`Value ${_v} out of range [${min}, ${max}]`);
  }
  function splitEvery(value, delimiter, numDelimiters) {
    if (numDelimiters <= 0 || !Number.isInteger(numDelimiters))
      throw Error("Invalid number of delimiters (" + numDelimiters + ") for splitEvery.");
    let segments = value.split(delimiter);
    if (numDelimiters === 1) return segments;
    let compoundSegments = [];
    let currentSegment = "";
    for (let i = 0; i < segments.length; i++) {
      if (currentSegment === "") currentSegment = segments[i];
      else currentSegment += delimiter + segments[i];
      if ((i + 1) % numDelimiters === 0) {
        compoundSegments.push(currentSegment);
        currentSegment = "";
      }
    }
    if (currentSegment !== "") compoundSegments.push(currentSegment);
    return compoundSegments;
  }
  var splitHeader = (value) => {
    let z = value.length;
    let values = [];
    let withinQuotes = false;
    let prevChar = undefined;
    let anchor = 0;
    for (let i = 0; i < z; ++i) {
      let char = value[i];
      switch (char) {
        case '"':
          if (prevChar !== "\\") withinQuotes = !withinQuotes;
          break;
        case ",":
          if (!withinQuotes) {
            values.push(value.slice(anchor, i));
            anchor = i + 1;
          }
          break;
      }
      prevChar = char;
    }
    values.push(value.slice(anchor));
    return values.map((v) => {
      v = v.trim();
      let z = v.length;
      if (z < 2) return v;
      if (v[0] === '"' && v[z - 1] === '"') v = v.slice(1, z - 1);
      return v.replace(/\\"/g, '"');
    });
  };
  var format = /^-?\d*(\.\d+)?$/;
  class NumericValue {
    string;
    type;
    constructor(string, type) {
      this.string = string;
      this.type = type;
      if (!format.test(string))
        throw Error(
          '@smithy/core/serde - NumericValue must only contain [0-9], at most one decimal point ".", and an optional negation prefix "-".',
        );
    }
    toString() {
      return this.string;
    }
    static [Symbol.hasInstance](object) {
      if (!object || typeof object !== "object") return false;
      let _nv = object;
      return (
        NumericValue.prototype.isPrototypeOf(object) || (_nv.type === "bigDecimal" && format.test(_nv.string))
      );
    }
  }
  function nv(input) {
    return new NumericValue(String(input), "bigDecimal");
  }
  Object.defineProperty(cjsExports, "generateIdempotencyToken", {
    enumerable: true,
    get: function () {
      return v4.v4;
    },
  });
  cjsExports.LazyJsonString = LazyJsonString;
  cjsExports.NumericValue = NumericValue;
  cjsExports._parseEpochTimestamp = _parseEpochTimestamp;
  cjsExports._parseRfc3339DateTimeWithOffset = _parseRfc3339DateTimeWithOffset;
  cjsExports._parseRfc7231DateTime = _parseRfc7231DateTime;
  cjsExports.copyDocumentWithTransform = copyDocumentWithTransform;
  cjsExports.dateToUtcString = dateToUtcString;
  cjsExports.expectBoolean = expectBoolean;
  cjsExports.expectByte = expectByte;
  cjsExports.expectFloat32 = expectFloat32;
  cjsExports.expectInt = expectInt;
  cjsExports.expectInt32 = expectInt32;
  cjsExports.expectLong = expectLong;
  cjsExports.expectNonNull = expectNonNull;
  cjsExports.expectNumber = expectNumber;
  cjsExports.expectObject = expectObject;
  cjsExports.expectShort = expectShort;
  cjsExports.expectString = expectString;
  cjsExports.expectUnion = expectUnion;
  cjsExports.handleFloat = handleFloat;
  cjsExports.limitedParseDouble = limitedParseDouble;
  cjsExports.limitedParseFloat = limitedParseFloat;
  cjsExports.limitedParseFloat32 = limitedParseFloat32;
  cjsExports.logger = logger;
  cjsExports.nv = nv;
  cjsExports.parseBoolean = parseBoolean;
  cjsExports.parseEpochTimestamp = parseEpochTimestamp;
  cjsExports.parseRfc3339DateTime = parseRfc3339DateTime;
  cjsExports.parseRfc3339DateTimeWithOffset = parseRfc3339DateTimeWithOffset;
  cjsExports.parseRfc7231DateTime = parseRfc7231DateTime;
  cjsExports.quoteHeader = quoteHeader;
  cjsExports.splitEvery = splitEvery;
  cjsExports.splitHeader = splitHeader;
  cjsExports.strictParseByte = strictParseByte;
  cjsExports.strictParseDouble = strictParseDouble;
  cjsExports.strictParseFloat = strictParseFloat;
  cjsExports.strictParseFloat32 = strictParseFloat32;
  cjsExports.strictParseInt = strictParseInt;
  cjsExports.strictParseInt32 = strictParseInt32;
  cjsExports.strictParseLong = strictParseLong;
  cjsExports.strictParseShort = strictParseShort;
});
export { require_serde };
