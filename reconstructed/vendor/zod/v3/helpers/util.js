/**
 * zod/v3/helpers/util.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-j2t139r9.js (5)
 * attribution: esm-layout 2, esm-fingerprint 3
 */

//@ chunk-j2t139r9.js:191-197 esm-layout
var g;
//@ chunk-j2t139r9.js:197-1121 esm-fingerprint
(function (e) {
  e.assertEqual = (s) => {};
  function t(s) {}
  e.assertIs = t;
  function r(s) {
    throw Error();
  }
  ((e.assertNever = r),
    (e.arrayToEnum = (s) => {
      let i = {};
      for (let n of s) i[n] = n;
      return i;
    }),
    (e.getValidEnumValues = (s) => {
      let filtered = e.objectKeys(s).filter((c) => typeof s[s[c]] !== "number"),
        n = {};
      for (let c of filtered) n[c] = s[c];
      return e.objectValues(n);
    }),
    (e.objectValues = (s) =>
      e.objectKeys(s).map(function (i) {
        return s[i];
      })),
    (e.objectKeys =
      typeof Object.keys === "function"
        ? (s) => Object.keys(s)
        : (s) => {
            let i = [];
            for (let key in s) if (Object.prototype.hasOwnProperty.call(s, key)) i.push(key);
            return i;
          }),
    (e.find = (s, i) => {
      for (let n of s) if (i(n)) return n;
      return;
    }),
    (e.isInteger =
      typeof Number.isInteger === "function"
        ? (s) => Number.isInteger(s)
        : (s) => typeof s === "number" && Number.isFinite(s) && Math.floor(s) === s));
  function a(s, i = " | ") {
    return s.map((n) => (typeof n === "string" ? `'${n}'` : n)).join(i);
  }
  ((e.joinValues = a),
    (e.jsonStringifyReplacer = (s, i) => {
      if (typeof i === "bigint") return i.toString();
      return i;
    }));
})(g || (g = {}));
//@ chunk-j2t139r9.js:1121-1128 esm-layout
var be;
//@ chunk-j2t139r9.js:1128-1191 esm-fingerprint
(function (e) {
  e.mergeShapes = (t, r) => ({ ...t, ...r });
})(be || (be = {}));
//@ chunk-j2t139r9.js:1191-2007 esm-fingerprint
var arrayToEnum = g.arrayToEnum([
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
  ]),
  O = (e) => {
    switch (typeof e) {
      case "undefined":
        return arrayToEnum.undefined;
      case "string":
        return arrayToEnum.string;
      case "number":
        return Number.isNaN(e) ? arrayToEnum.nan : arrayToEnum.number;
      case "boolean":
        return arrayToEnum.boolean;
      case "function":
        return arrayToEnum.function;
      case "bigint":
        return arrayToEnum.bigint;
      case "symbol":
        return arrayToEnum.symbol;
      case "object":
        if (Array.isArray(e)) return arrayToEnum.array;
        if (e === null) return arrayToEnum.null;
        if (e.then && typeof e.then === "function" && e.catch && typeof e.catch === "function")
          return arrayToEnum.promise;
        if (typeof Map < "u" && e instanceof Map) return arrayToEnum.map;
        if (typeof Set < "u" && e instanceof Set) return arrayToEnum.set;
        if (typeof Date < "u" && e instanceof Date) return arrayToEnum.date;
        return arrayToEnum.object;
      default:
        return arrayToEnum.unknown;
    }
  };

export { g, arrayToEnum, O };
