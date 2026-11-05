/**
 * zod/v3/helpers/util.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-djgshcbm.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 */

//@ chunk-djgshcbm.js:191-197 esm-layout
var util;
//@ chunk-djgshcbm.js:197-1121 esm-fingerprint
(function (util) {
  util.assertEqual = (_) => {};
  function assertIs(_arg) {}
  util.assertIs = assertIs;
  function assertNever(_x) {
    throw Error();
  }
  util.assertNever = assertNever;
  util.arrayToEnum = (items) => {
    let obj = {};
    for (let item of items) obj[item] = item;
    return obj;
  };
  util.getValidEnumValues = (obj) => {
    let validKeys = util.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    let filtered = {};
    for (let k of validKeys) filtered[k] = obj[k];
    return util.objectValues(filtered);
  };
  util.objectValues = (obj) =>
    util.objectKeys(obj).map(function (e) {
      return obj[e];
    });
  util.objectKeys =
    typeof Object.keys === "function"
      ? (obj) => Object.keys(obj)
      : (object) => {
          let keys = [];
          for (let key in object) if (Object.prototype.hasOwnProperty.call(object, key)) keys.push(key);
          return keys;
        };
  util.find = (arr, checker) => {
    for (let item of arr) if (checker(item)) return item;
    return;
  };
  util.isInteger =
    typeof Number.isInteger === "function"
      ? (val) => Number.isInteger(val)
      : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => (typeof val === "string" ? `'${val}'` : val)).join(separator);
  }
  util.joinValues = joinValues;
  util.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") return value.toString();
    return value;
  };
})(util || (util = {}));
//@ chunk-djgshcbm.js:1121-1128 esm-layout
var objectUtil;
//@ chunk-djgshcbm.js:1128-1191 esm-fingerprint
(function (objectUtil) {
  objectUtil.mergeShapes = (first, second) => ({
    ...first,
    ...second,
  });
})(objectUtil || (objectUtil = {}));
//@ chunk-djgshcbm.js:1191-2007 esm-fingerprint
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set",
]);
var getParsedType = (data) => {
  switch (typeof data) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) return ZodParsedType.array;
      if (data === null) return ZodParsedType.null;
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function")
        return ZodParsedType.promise;
      if (typeof Map !== "undefined" && data instanceof Map) return ZodParsedType.map;
      if (typeof Set !== "undefined" && data instanceof Set) return ZodParsedType.set;
      if (typeof Date !== "undefined" && data instanceof Date) return ZodParsedType.date;
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
export { util, ZodParsedType, getParsedType };
