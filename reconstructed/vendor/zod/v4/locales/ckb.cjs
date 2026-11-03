/**
 * zod/v4/locales/ckb.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:221638-228564 cjs-fingerprint
var fA = x(function (Xi, dA) {
  var LV =
      (Xi && Xi.__createBinding) ||
      (Object.create
        ? function (e, t, n, o) {
            if (o === void 0) o = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !t.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return t[n];
                },
              };
            Object.defineProperty(e, o, ownPropertyDescriptor);
          }
        : function (e, t, n, o) {
            if (o === void 0) o = n;
            e[o] = t[n];
          }),
    NV =
      (Xi && Xi.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    UV =
      (Xi && Xi.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) LV(t, e, key);
        }
        return (NV(t, e), t);
      };
  Object.defineProperty(Xi, "__esModule", { value: !0 });
  Xi.default = FV;
  var yp = UV(Ee()),
    zV = () => {
      let e = {
        string: { unit: "\u067E\u06CC\u062A", verb: "\u0628\u06CE\u062A" },
        file: { unit: "\u0628\u0627\u06CC\u062A", verb: "\u0628\u06CE\u062A" },
        array: { unit: "\u062F\u0627\u0646\u06D5", verb: "\u0628\u06CE\u062A" },
        set: { unit: "\u062F\u0627\u0646\u06D5", verb: "\u0628\u06CE\u062A" },
        map: { unit: "\u062F\u0627\u0646\u06D5", verb: "\u0628\u06CE\u062A" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "regex",
          email: "\u0626\u06CC\u0645\u06D5\u06CC\u06B5",
          url: "\u0628\u06D5\u0633\u062A\u06D5\u0631 (URL)",
          emoji: "\u0626\u06CC\u0645\u06C6\u062C\u06CC",
          uuid: "UUID",
          uuidv4: "UUIDv4",
          uuidv6: "UUIDv6",
          nanoid: "nanoid",
          guid: "GUID",
          cuid: "cuid",
          cuid2: "cuid2",
          ulid: "ULID",
          xid: "XID",
          ksuid: "KSUID",
          datetime: "\u0695\u06CE\u06A9\u06D5\u0648\u062A \u0648 \u06A9\u0627\u062A",
          date: "\u0695\u06CE\u06A9\u06D5\u0648\u062A",
          time: "\u06A9\u0627\u062A",
          duration: "\u0645\u0627\u0648\u06D5",
          ipv4: "\u0646\u0627\u0648\u0646\u06CC\u0634\u0627\u0646\u06CC IPv4",
          ipv6: "\u0646\u0627\u0648\u0646\u06CC\u0634\u0627\u0646\u06CC IPv6",
          mac: "\u0646\u0627\u0648\u0646\u06CC\u0634\u0627\u0646\u06CC MAC",
          cidrv4: "\u0645\u06D5\u0648\u062F\u0627\u06CC IPv4",
          cidrv6: "\u0645\u06D5\u0648\u062F\u0627\u06CC IPv6",
          base64: "\u062F\u06D5\u0642\u06CC base64",
          base64url: "\u062F\u06D5\u0642\u06CC base64url",
          json_string: "\u062F\u06D5\u0642\u06CC JSON",
          e164: "\u0698\u0645\u0627\u0631\u06D5\u06CC E.164",
          credit_card:
            "\u0698\u0645\u0627\u0631\u06D5\u06CC \u06A9\u0627\u0631\u062A\u06CC \u06A9\u0631\u06CE\u062F\u06CC\u062A",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "\u062A\u06CE\u06A9\u0631\u062F\u06D5",
        },
        o = {
          nan: "NaN",
          string: "\u0646\u0648\u0648\u0633\u06CC\u0646",
          number: "\u0698\u0645\u0627\u0631\u06D5",
          boolean: "boolean",
          array: "array",
          object: "object",
          date: "\u0695\u06CE\u06A9\u06D5\u0648\u062A",
          integer: "\u0698\u0645\u0627\u0631\u06D5",
          float: "\u0698\u0645\u0627\u0631\u06D5",
          null: "null",
          undefined: "undefined",
          function: "function",
          symbol: "symbol",
          unknown: "unknown",
          promise: "promise",
          void: "void",
          never: "never",
          map: "map",
          set: "set",
        };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = yp.parsedType(r.input),
              l = o[parsedType] ?? parsedType,
              c = ["\u0627", "\u0648", "\u06C6", "\u0648\u0648", "\u06D5", "\u06CC", "\u06CE"].some((f) =>
                l.endsWith(f),
              )
                ? "\u06CC\u06D5"
                : "\u06D5",
              matches = /^[a-zA-Z]+$/.test(l);
            if (parsedType === "null" || parsedType === "undefined")
              return "\u062F\u0627\u0648\u0627\u06A9\u0631\u0627\u0648\u06D5";
            return `\u0686\u0627\u0648\u06D5\u0695\u0648\u0627\u0646\u06A9\u0631\u0627\u0648\u06D5 ${s} \u0628\u06CE\u062A\u060C \u0628\u06D5\u06B5\u0627\u0645 ${l}${matches ? "" : c}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `\u0628\u06D5\u0647\u0627\u06A9\u06D5 \u0646\u0627\u062F\u0631\u0648\u0648\u0633\u062A\u06D5: \u0686\u0627\u0648\u06D5\u0695\u0648\u0627\u0646\u06A9\u0631\u0627\u0648\u06D5 ${yp.stringifyPrimitive(r.values[0])} \u0628\u06CE\u062A`;
            return `\u0647\u06D5\u06B5\u0628\u0698\u0627\u0631\u062F\u06D5\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u0686\u0627\u0648\u06D5\u0695\u0648\u0627\u0646\u06A9\u0631\u0627\u0648\u06D5 \u06CC\u06D5\u06A9\u06CE\u06A9 \u0628\u06CE\u062A \u0644\u06D5 ${yp.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = t(r.origin);
            if (s)
              return `\u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0628\u06D5 \u0644\u0627\u06CC\u06D5\u0646\u06CC \u0632\u06C6\u0631\u06D5\u0648\u06D5 ${r.maximum.toString()} ${s.unit} ${s.verb}`;
            return `\u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0628\u06D5 \u0644\u0627\u06CC\u06D5\u0646\u06CC \u0632\u06C6\u0631\u06D5\u0648\u06D5 ${r.maximum.toString()} \u0628\u06CE\u062A`;
          }
          case "too_small": {
            let s = t(r.origin);
            if (s)
              return `\u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0628\u06D5 \u0644\u0627\u06CC\u06D5\u0646\u06CC \u06A9\u06D5\u0645\u06D5\u0648\u06D5 ${r.minimum.toString()} ${s.unit} ${s.verb}`;
            return `\u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0628\u06D5 \u0644\u0627\u06CC\u06D5\u0646\u06CC \u06A9\u06D5\u0645\u06D5\u0648\u06D5 ${r.minimum.toString()} \u0628\u06CE\u062A`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\u062F\u06D5\u0642\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u062F\u06D5\u0633\u062A\u067E\u06CE\u0628\u06A9\u0627\u062A \u0628\u06D5 "${s.prefix}"`;
            if (s.format === "ends_with")
              return `\u062F\u06D5\u0642\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u06A9\u06C6\u062A\u0627\u06CC\u06CC\u0628\u06CE\u062A \u0628\u06D5 "${s.suffix}"`;
            if (s.format === "includes")
              return `\u062F\u06D5\u0642\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 "${s.includes}" \u0644\u06D5\u062E\u06C6\u0628\u06AF\u0631\u06CE\u062A`;
            if (s.format === "regex")
              return `\u062F\u06D5\u0642\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u067E\u06CE\u0648\u06CC\u0633\u062A\u06D5 \u0644\u06D5\u06AF\u06D5\u06B5 \u067E\u0627\u062A\u06CE\u0631\u0646\u06CC ${s.pattern} \u0628\u06AF\u0648\u0646\u062C\u06CE\u062A`;
            return `\u0628\u06D5\u0647\u0627\u06CC ${n[s.format] ?? r.format} \u0646\u0627\u062F\u0631\u0648\u0633\u062A\u06D5`;
          }
          case "not_multiple_of":
            return `\u0698\u0645\u0627\u0631\u06D5\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A: \u062F\u06D5\u0628\u06CE\u062A \u0686\u06D5\u0646\u062F \u0647\u06CE\u0646\u062F\u06D5 \u0628\u06CE\u062A \u0628\u06C6 ${r.divisor}`;
          case "unrecognized_keys":
            return `\u06A9\u0644\u06CC\u0644\u06CC \u0646\u06D5\u0646\u0627\u0633\u0631\u0627\u0648: ${yp.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `\u06A9\u0644\u06CC\u0644\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A \u0644\u06D5 ${r.origin}`;
          case "invalid_union":
            if (r.options && Array.isArray(r.options) && r.options.length > 0)
              return `\u0628\u06D5\u0647\u0627\u06CC \u0646\u06D5\u0646\u0627\u0633\u0631\u0627\u0648 \u0647\u06D5\u06CC\u06D5. \u0628\u06D5\u0647\u0627\u06CC \u0686\u0627\u0648\u06D5\u0695\u0648\u0627\u0646\u06A9\u0631\u0627\u0648: ${r.options.map((option) => `'${option}'`).join(" | ")}`;
            return "\u06CC\u06D5\u06A9\u06AF\u0631\u062A\u0646\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A";
          case "invalid_element":
            return `${r.origin} \u0628\u06D5\u0647\u0627\u06A9\u06D5 \u0646\u0627\u062F\u0631\u0648\u0633\u062A\u06D5`;
          default:
            return "\u062A\u06CE\u06A9\u0631\u062F\u06D5\u06CC \u0646\u0627\u062F\u0631\u0648\u0633\u062A";
        }
      };
    };
  function FV() {
    return { localeError: zV() };
  }
  dA.exports = Xi.default;
});

export { fA };
