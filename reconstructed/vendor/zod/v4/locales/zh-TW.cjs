/**
 * zod/v4/locales/zh-TW.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:492754-496907 cjs-fingerprint
var mC = x(function (es, hC) {
  var N3 =
      (es && es.__createBinding) ||
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
    U3 =
      (es && es.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    z3 =
      (es && es.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) N3(t, e, key);
        }
        return (U3(t, e), t);
      };
  Object.defineProperty(es, "__esModule", { value: !0 });
  es.default = B3;
  var yh = z3(Ee()),
    F3 = () => {
      let e = {
        string: { unit: "\u5B57\u5143", verb: "\u64C1\u6709" },
        file: { unit: "\u4F4D\u5143\u7D44", verb: "\u64C1\u6709" },
        array: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" },
        set: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" },
        map: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "\u8F38\u5165",
          email: "\u90F5\u4EF6\u5730\u5740",
          url: "URL",
          emoji: "emoji",
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
          datetime: "ISO \u65E5\u671F\u6642\u9593",
          date: "ISO \u65E5\u671F",
          time: "ISO \u6642\u9593",
          duration: "ISO \u671F\u9593",
          ipv4: "IPv4 \u4F4D\u5740",
          ipv6: "IPv6 \u4F4D\u5740",
          mac: "MAC \u4F4D\u5740",
          cidrv4: "IPv4 \u7BC4\u570D",
          cidrv6: "IPv6 \u7BC4\u570D",
          base64: "base64 \u7DE8\u78BC\u5B57\u4E32",
          base64url: "base64url \u7DE8\u78BC\u5B57\u4E32",
          json_string: "JSON \u5B57\u4E32",
          e164: "E.164 \u6578\u503C",
          credit_card: "\u4FE1\u7528\u5361\u865F",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "\u8F38\u5165",
        },
        o = { nan: "NaN" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = yh.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA instanceof ${r.expected}\uFF0C\u4F46\u6536\u5230 ${l}`;
            return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${s}\uFF0C\u4F46\u6536\u5230 ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${yh.stringifyPrimitive(r.values[0])}`;
            return `\u7121\u6548\u7684\u9078\u9805\uFF1A\u9810\u671F\u70BA\u4EE5\u4E0B\u5176\u4E2D\u4E4B\u4E00 ${yh.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${r.origin ?? "\u503C"} \u61C9\u70BA ${s}${r.maximum.toString()} ${a.unit ?? "\u500B\u5143\u7D20"}`;
            return `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${r.origin ?? "\u503C"} \u61C9\u70BA ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${r.origin} \u61C9\u70BA ${s}${r.minimum.toString()} ${a.unit}`;
            return `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${r.origin} \u61C9\u70BA ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${s.prefix}" \u958B\u982D`;
            if (s.format === "ends_with")
              return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${s.suffix}" \u7D50\u5C3E`;
            if (s.format === "includes")
              return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u5305\u542B "${s.includes}"`;
            if (s.format === "regex")
              return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u7B26\u5408\u683C\u5F0F ${s.pattern}`;
            return `\u7121\u6548\u7684 ${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `\u7121\u6548\u7684\u6578\u5B57\uFF1A\u5FC5\u9808\u70BA ${r.divisor} \u7684\u500D\u6578`;
          case "unrecognized_keys":
            return `\u7121\u6CD5\u8B58\u5225\u7684\u9375\u503C${r.keys.length > 1 ? "\u5011" : ""}\uFF1A${yh.joinValues(r.keys, "\u3001")}`;
          case "invalid_key":
            return `${r.origin} \u4E2D\u6709\u7121\u6548\u7684\u9375\u503C`;
          case "invalid_union":
            return "\u7121\u6548\u7684\u8F38\u5165\u503C";
          case "invalid_element":
            return `${r.origin} \u4E2D\u6709\u7121\u6548\u7684\u503C`;
          default:
            return "\u7121\u6548\u7684\u8F38\u5165\u503C";
        }
      };
    };
  function B3() {
    return { localeError: F3() };
  }
  hC.exports = es.default;
});

export { mC };
