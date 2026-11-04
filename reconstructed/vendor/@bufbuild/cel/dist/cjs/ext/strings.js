/**
 * @bufbuild/cel/dist/cjs/ext/strings.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_protobuf } from "../../../../protobuf/dist/commonjs/index.js";
import { require_error_4 } from "../../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_type } from "../type.js";
import { require_list } from "../list.js";
import { require_map } from "../map.js";
import { require_uint } from "../uint.js";
import { require_reflect_2 } from "../../../../protobuf/dist/commonjs/reflect/index.js";
import { require_func } from "../func.js";

//@ chunk-fq0cr76a.js:631450-638468 cjs-fingerprint
var require_strings = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var protobuf_1 = require_protobuf();
  var wkt_1 = require_error_4();
  var type_js_1 = require_type();
  var list_js_1 = require_list();
  var map_js_1 = require_map();
  var uint_js_1 = require_uint();
  var reflect_1 = require_reflect_2();
  var func_js_1 = require_func();
  function charAt(index) {
    let i = Number(index);
    if (i < 0 || i > this.length) throw indexOutOfBounds(i, this.length);
    return this.charAt(i);
  }
  function indexOf(substr, startN) {
    if (startN === undefined) return BigInt(this.indexOf(substr));
    let start = Number(startN);
    if (start < 0 || start >= this.length) throw indexOutOfBounds(start, this.length);
    return BigInt(this.indexOf(substr, start));
  }
  function lastIndexOf(substr, startN) {
    if (startN === undefined) return BigInt(this.lastIndexOf(substr));
    let start = Number(startN);
    if (start < 0 || start >= this.length) throw indexOutOfBounds(start, this.length);
    return BigInt(this.lastIndexOf(substr, start));
  }
  function lowerAscii() {
    let result = "";
    for (let i = 0; i < this.length; i++) {
      let code = this.charCodeAt(i);
      if (code >= 65 && code <= 90) result += String.fromCharCode(code + 32);
      else result += this.charAt(i);
    }
    return result;
  }
  function upperAscii() {
    let result = "";
    for (let i = 0; i < this.length; i++) {
      let c = this.charCodeAt(i);
      if (c >= 97 && c <= 122) result += String.fromCharCode(c - 32);
      else result += this.charAt(i);
    }
    return result;
  }
  function replace(substr, repl, num) {
    let count = num === undefined ? this.length : Number(num);
    let result = this;
    let offset = 0;
    let remaining = count;
    let index = result.indexOf(substr, offset);
    while (remaining > 0 && index !== -1) {
      result = result.substring(0, index) + repl + result.substring(index + substr.length);
      offset = index + repl.length;
      remaining--;
      index = result.indexOf(substr, offset);
    }
    return result;
  }
  function split(sep, num) {
    let count = num === undefined ? undefined : Number(num);
    if (count === 1) return list_js_1.celList([this]);
    return list_js_1.celList(this.split(sep, count));
  }
  function substring(start, end) {
    if (end === undefined) {
      let i = Number(start);
      if (i < 0 || i > this.length) throw indexOutOfBounds(i, this.length);
      return this.substring(i);
    }
    let i = Number(start);
    let j = Number(end);
    if (i < 0 || i > this.length) throw indexOutOfBounds(i, this.length);
    if (j < 0 || j > this.length) throw indexOutOfBounds(j, this.length);
    if (i > j) throw invalidArgument("substring", "start > end");
    return this.substring(i, j);
  }
  var WHITE_SPACE = new Set([
    32, 9, 10, 11, 12, 13, 133, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202,
    8232, 8233, 8239, 8287, 12288,
  ]);
  function trim() {
    let start = 0;
    let end = this.length - 1;
    while (start < this.length && WHITE_SPACE.has(this.charCodeAt(start))) start++;
    while (end > start && WHITE_SPACE.has(this.charCodeAt(end))) end--;
    return this.substring(start, end + 1);
  }
  function join(sep = "") {
    let result = "";
    for (let i = 0; i < this.size; i++) {
      let item = this.get(i);
      if (typeof item !== "string") throw invalidArgument("join", "list contains non-string value");
      if (i > 0) result += sep;
      result += item;
    }
    return result;
  }
  var QUOTE_MAP = new Map([
    [0, "\\0"],
    [7, "\\a"],
    [8, "\\b"],
    [9, "\\t"],
    [10, "\\n"],
    [11, "\\v"],
    [12, "\\f"],
    [13, "\\r"],
    [34, '\\"'],
    [92, "\\\\"],
  ]);
  function quote(str) {
    let result = '"';
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      result += QUOTE_MAP.get(c) ?? str.charAt(i);
    }
    result += '"';
    return result;
  }
  function formatFloatString(val) {
    switch (val) {
      case "Infinity":
      case "-Infinity":
      case "NaN":
        return val;
      default:
        throw invalidArgument("format", "invalid floating point value");
    }
  }
  function formatFloating(val, precision) {
    switch (true) {
      case typeof val === "number":
        if (!Number.isFinite(val) || precision === undefined) return val.toString();
        return new Intl.NumberFormat("en-US", {
          maximumFractionDigits: precision,
          minimumFractionDigits: precision,
          notation: "standard",
          roundingMode: "halfEven",
          useGrouping: false,
        }).format(val);
      case typeof val === "string":
        return formatFloatString(val);
      default:
        throw invalidArgument("format", "fixed-point clause can only be used on doubles");
    }
  }
  function formatExponent(val, precision) {
    switch (true) {
      case typeof val === "number":
        if (!Number.isFinite(val)) return val.toString();
        let str = val.toExponential(precision);
        let plusIdx = str.lastIndexOf("+");
        if (plusIdx === str.length - 2)
          str = `${str.substring(0, plusIdx + 1)}0${str.substring(plusIdx + 1)}`;
        return str;
      case typeof val === "string":
        return formatFloatString(val);
      default:
        throw invalidArgument("format", "scientific clause can only be used on doubles");
    }
  }
  function formatBinary(val) {
    switch (true) {
      case typeof val === "boolean":
        return val ? "1" : "0";
      case typeof val === "bigint":
        return val.toString(2);
      case uint_js_1.isCelUint(val):
        return val.value.toString(2);
      default:
        throw invalidArgument("format", "only integers and bools can be formatted as binary");
    }
  }
  function formatOctal(val) {
    switch (true) {
      case typeof val === "bigint":
        return val.toString(8);
      case uint_js_1.isCelUint(val):
        return val.value.toString(8);
      default:
        throw invalidArgument("format", "invalid integer value");
    }
  }
  function formatDecimal(val) {
    switch (true) {
      case typeof val === "bigint":
        return val.toString(10);
      case uint_js_1.isCelUint(val):
        return val.value.toString(10);
      case typeof val === "number" && !Number.isFinite(val):
        return val.toString();
      default:
        throw invalidArgument("format", "invalid integer value");
    }
  }
  function formatHexBytes(val) {
    let result = "";
    for (let i = 0; i < val.length; i++) result += val[i].toString(16).padStart(2, "0");
    return result;
  }
  function formatHex(val) {
    switch (true) {
      case typeof val === "bigint":
        return val.toString(16);
      case uint_js_1.isCelUint(val):
        return val.value.toString(16);
      case typeof val === "string":
        return formatHexBytes(new TextEncoder().encode(val));
      case val instanceof Uint8Array:
        return formatHexBytes(val);
      default:
        throw invalidArgument("format", "only integers, byte buffers, and strings can be formatted as hex");
    }
  }
  function formatHeX(val) {
    let result = formatHex(val);
    if (typeof result !== "string") return result;
    return result.toUpperCase();
  }
  function formatList(val) {
    let result = "[";
    for (let i = 0; i < val.size; i++) {
      if (i > 0) result += ", ";
      result += formatString(val.get(i));
    }
    result += "]";
    return result;
  }
  function formatMap(val) {
    let formatted = Array(val.size);
    let i = 0;
    for (let [key, value] of val) {
      formatted[i] = [formatString(key), formatString(value)];
      i++;
    }
    let result = "{";
    let delim = "";
    for (let [key, value] of formatted.sort((a, b) => a[0].localeCompare(b[0]))) {
      result += delim + key + ": " + value;
      delim = ", ";
    }
    result += "}";
    return result;
  }
  function formatString(val) {
    switch (typeof val) {
      case "boolean":
        return val ? "true" : "false";
      case "bigint":
        return formatDecimal(val);
      case "number":
        return formatFloating(val, undefined);
      case "string":
        return val;
      case "object":
        switch (true) {
          case val === null:
            return "null";
          case type_js_1.isCelType(val):
            return val.name;
          case uint_js_1.isCelUint(val):
            return val.value.toString();
          case reflect_1.isReflectMessage(val, wkt_1.TimestampSchema):
            return protobuf_1.toJson(wkt_1.TimestampSchema, val.message);
          case reflect_1.isReflectMessage(val, wkt_1.DurationSchema):
            return protobuf_1.toJson(wkt_1.DurationSchema, val.message);
          case val instanceof Uint8Array:
            return new TextDecoder().decode(val);
          case list_js_1.isCelList(val):
            return formatList(val);
          case map_js_1.isCelMap(val):
            return formatMap(val);
        }
    }
    throw invalidArgument("format", "invalid string value");
  }
  function format(args) {
    let result = "";
    let i = 0;
    let j = 0;
    while (i < this.length) {
      if (this.charAt(i) !== "%") {
        result += this.charAt(i);
        i++;
        continue;
      }
      if (i + 1 >= this.length) throw invalidArgument("format", "invalid format string");
      let c = this.charAt(i + 1);
      i += 2;
      if (c === "%") {
        result += "%";
        continue;
      }
      let precision = 6;
      if (c === ".") {
        precision = 0;
        while (i < this.length && this.charAt(i) >= "0" && this.charAt(i) <= "9") {
          precision = precision * 10 + Number(this.charAt(i));
          i++;
        }
        if (i >= this.length) throw invalidArgument("format", "invalid format string");
        c = this.charAt(i);
        i++;
      }
      let val = args.get(j++);
      if (val === undefined) throw invalidArgument("format", "too few arguments for format string");
      result += formatPlaceholder(c, val, precision);
    }
    if (j < args.size) throw invalidArgument("format", "too many arguments for format string");
    return result;
  }
  function formatPlaceholder(c, val, precision) {
    switch (c) {
      case "e":
        return formatExponent(val, precision);
      case "f":
        return formatFloating(val, precision);
      case "b":
        return formatBinary(val);
      case "d":
        return formatDecimal(val);
      case "s":
        return formatString(val);
      case "x":
        return formatHex(val);
      case "X":
        return formatHeX(val);
      case "o":
        return formatOctal(val);
      default:
        throw invalidArgument(
          "format",
          `could not parse formatting clause: unrecognized formatting clause: ${c}`,
        );
    }
  }
  function invalidArgument(func, issue) {
    return Error(`invalid argument to function ${func}: ${issue}`);
  }
  function indexOutOfBounds(index, length) {
    return Error(`index ${index} out of bounds [0, ${length})`);
  }
  var { STRING, INT, DYN } = type_js_1.CelScalar;
  var LIST_DYN = type_js_1.listType(DYN);
  var LIST_STRING = type_js_1.listType(DYN);
  cjsExports.default = [
    func_js_1.celFunc("strings.quote", [STRING], STRING, quote),
    func_js_1.celMethod("charAt", STRING, [INT], STRING, charAt),
    func_js_1.celMethod("indexOf", STRING, [STRING], INT, indexOf),
    func_js_1.celMethod("indexOf", STRING, [STRING, INT], INT, indexOf),
    func_js_1.celMethod("lastIndexOf", STRING, [STRING], INT, lastIndexOf),
    func_js_1.celMethod("lastIndexOf", STRING, [STRING, INT], INT, lastIndexOf),
    func_js_1.celMethod("lowerAscii", STRING, [], STRING, lowerAscii),
    func_js_1.celMethod("upperAscii", STRING, [], STRING, upperAscii),
    func_js_1.celMethod("replace", STRING, [STRING, STRING], STRING, replace),
    func_js_1.celMethod("replace", STRING, [STRING, STRING, INT], STRING, replace),
    func_js_1.celMethod("split", STRING, [STRING], LIST_STRING, split),
    func_js_1.celMethod("split", STRING, [STRING, INT], LIST_STRING, split),
    func_js_1.celMethod("substring", STRING, [INT], STRING, substring),
    func_js_1.celMethod("substring", STRING, [INT, INT], STRING, substring),
    func_js_1.celMethod("trim", STRING, [], STRING, trim),
    func_js_1.celMethod("join", LIST_STRING, [], STRING, join),
    func_js_1.celMethod("join", LIST_STRING, [STRING], STRING, join),
    func_js_1.celMethod("format", STRING, [LIST_DYN], STRING, format),
  ];
});
export { require_strings };
