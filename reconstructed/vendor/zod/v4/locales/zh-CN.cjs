/**
 * zod/v4/locales/zh-CN.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:488708-492754 cjs-fingerprint
var pC = x(function (Qo, fC) {
  var D3 =
      (Qo && Qo.__createBinding) ||
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
    M3 =
      (Qo && Qo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    j3 =
      (Qo && Qo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) D3(t, e, key);
        }
        return (M3(t, e), t);
      };
  Object.defineProperty(Qo, "__esModule", { value: !0 });
  Qo.default = L3;
  var gh = j3(Ee()),
    x3 = () => {
      let e = {
        string: { unit: "\u5B57\u7B26", verb: "\u5305\u542B" },
        file: { unit: "\u5B57\u8282", verb: "\u5305\u542B" },
        array: { unit: "\u9879", verb: "\u5305\u542B" },
        set: { unit: "\u9879", verb: "\u5305\u542B" },
        map: { unit: "\u9879", verb: "\u5305\u542B" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "\u8F93\u5165",
          email: "\u7535\u5B50\u90AE\u4EF6",
          url: "URL",
          emoji: "\u8868\u60C5\u7B26\u53F7",
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
          datetime: "ISO\u65E5\u671F\u65F6\u95F4",
          date: "ISO\u65E5\u671F",
          time: "ISO\u65F6\u95F4",
          duration: "ISO\u65F6\u957F",
          ipv4: "IPv4\u5730\u5740",
          ipv6: "IPv6\u5730\u5740",
          mac: "MAC\u5730\u5740",
          cidrv4: "IPv4\u7F51\u6BB5",
          cidrv6: "IPv6\u7F51\u6BB5",
          base64: "base64\u7F16\u7801\u5B57\u7B26\u4E32",
          base64url: "base64url\u7F16\u7801\u5B57\u7B26\u4E32",
          json_string: "JSON\u5B57\u7B26\u4E32",
          e164: "E.164\u53F7\u7801",
          credit_card: "\u4FE1\u7528\u5361\u53F7",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "\u8F93\u5165",
        },
        o = { nan: "NaN", number: "\u6570\u5B57", array: "\u6570\u7EC4", null: "\u7A7A\u503C(null)" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = gh.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B instanceof ${r.expected}\uFF0C\u5B9E\u9645\u63A5\u6536 ${l}`;
            return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${s}\uFF0C\u5B9E\u9645\u63A5\u6536 ${l}`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${gh.stringifyPrimitive(r.values[0])}`;
            return `\u65E0\u6548\u9009\u9879\uFF1A\u671F\u671B\u4EE5\u4E0B\u4E4B\u4E00 ${gh.joinValues(r.values, "|")}`;
          case "too_big": {
            let s = r.inclusive ? "<=" : "<",
              a = t(r.origin);
            if (a)
              return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${r.origin ?? "\u503C"} ${s}${r.maximum.toString()} ${a.unit ?? "\u4E2A\u5143\u7D20"}`;
            return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${r.origin ?? "\u503C"} ${s}${r.maximum.toString()}`;
          }
          case "too_small": {
            let s = r.inclusive ? ">=" : ">",
              a = t(r.origin);
            if (a)
              return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${r.origin} ${s}${r.minimum.toString()} ${a.unit}`;
            return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${r.origin} ${s}${r.minimum.toString()}`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${s.prefix}" \u5F00\u5934`;
            if (s.format === "ends_with")
              return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${s.suffix}" \u7ED3\u5C3E`;
            if (s.format === "includes")
              return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u5305\u542B "${s.includes}"`;
            if (s.format === "regex")
              return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u6EE1\u8DB3\u6B63\u5219\u8868\u8FBE\u5F0F ${s.pattern}`;
            return `\u65E0\u6548${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `\u65E0\u6548\u6570\u5B57\uFF1A\u5FC5\u987B\u662F ${r.divisor} \u7684\u500D\u6570`;
          case "unrecognized_keys":
            return `\u51FA\u73B0\u672A\u77E5\u7684\u952E(key): ${gh.joinValues(r.keys, ", ")}`;
          case "invalid_key":
            return `${r.origin} \u4E2D\u7684\u952E(key)\u65E0\u6548`;
          case "invalid_union":
            return "\u65E0\u6548\u8F93\u5165";
          case "invalid_element":
            return `${r.origin} \u4E2D\u5305\u542B\u65E0\u6548\u503C(value)`;
          default:
            return "\u65E0\u6548\u8F93\u5165";
        }
      };
    };
  function L3() {
    return { localeError: x3() };
  }
  fC.exports = Qo.default;
});

export { pC };
