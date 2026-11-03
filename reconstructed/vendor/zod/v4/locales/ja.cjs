/**
 * zod/v4/locales/ja.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ee } from "../core/util.cjs";

//@ chunk-1ny7cxrt.js:325215-330175 cjs-fingerprint
var eI = x(function (vo, QA) {
  var MG =
      (vo && vo.__createBinding) ||
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
    jG =
      (vo && vo.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    xG =
      (vo && vo.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) MG(t, e, key);
        }
        return (jG(t, e), t);
      };
  Object.defineProperty(vo, "__esModule", { value: !0 });
  vo.default = NG;
  var Np = xG(Ee()),
    LG = () => {
      let e = {
        string: { unit: "\u6587\u5B57", verb: "\u3067\u3042\u308B" },
        file: { unit: "\u30D0\u30A4\u30C8", verb: "\u3067\u3042\u308B" },
        array: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" },
        set: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" },
        map: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" },
      };
      function t(r) {
        return e[r] ?? null;
      }
      let n = {
          regex: "\u5165\u529B\u5024",
          email: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9",
          url: "URL",
          emoji: "\u7D75\u6587\u5B57",
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
          datetime: "ISO\u65E5\u6642",
          date: "ISO\u65E5\u4ED8",
          time: "ISO\u6642\u523B",
          duration: "ISO\u671F\u9593",
          ipv4: "IPv4\u30A2\u30C9\u30EC\u30B9",
          ipv6: "IPv6\u30A2\u30C9\u30EC\u30B9",
          mac: "MAC\u30A2\u30C9\u30EC\u30B9",
          cidrv4: "IPv4\u7BC4\u56F2",
          cidrv6: "IPv6\u7BC4\u56F2",
          base64: "base64\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217",
          base64url: "base64url\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217",
          json_string: "JSON\u6587\u5B57\u5217",
          e164: "E.164\u756A\u53F7",
          credit_card: "\u30AF\u30EC\u30B8\u30C3\u30C8\u30AB\u30FC\u30C9\u756A\u53F7",
          iban: "IBAN",
          jwt: "JWT",
          template_literal: "\u5165\u529B\u5024",
        },
        o = { nan: "NaN", number: "\u6570\u5024", array: "\u914D\u5217" };
      return (r) => {
        switch (r.code) {
          case "invalid_type": {
            let s = o[r.expected] ?? r.expected,
              parsedType = Np.parsedType(r.input),
              l = o[parsedType] ?? parsedType;
            if (/^[A-Z]/.test(r.expected))
              return `\u7121\u52B9\u306A\u5165\u529B: instanceof ${r.expected}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F\u304C\u3001${l}\u304C\u5165\u529B\u3055\u308C\u307E\u3057\u305F`;
            return `\u7121\u52B9\u306A\u5165\u529B: ${s}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F\u304C\u3001${l}\u304C\u5165\u529B\u3055\u308C\u307E\u3057\u305F`;
          }
          case "invalid_value":
            if (r.values.length === 1)
              return `\u7121\u52B9\u306A\u5165\u529B: ${Np.stringifyPrimitive(r.values[0])}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F`;
            return `\u7121\u52B9\u306A\u9078\u629E: ${Np.joinValues(r.values, "\u3001")}\u306E\u3044\u305A\u308C\u304B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          case "too_big": {
            let s = r.inclusive ? "\u4EE5\u4E0B\u3067\u3042\u308B" : "\u3088\u308A\u5C0F\u3055\u3044",
              a = t(r.origin);
            if (a)
              return `\u5927\u304D\u3059\u304E\u308B\u5024: ${r.origin ?? "\u5024"}\u306F${r.maximum.toString()}${a.unit ?? "\u8981\u7D20"}${s}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
            return `\u5927\u304D\u3059\u304E\u308B\u5024: ${r.origin ?? "\u5024"}\u306F${r.maximum.toString()}${s}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          }
          case "too_small": {
            let s = r.inclusive ? "\u4EE5\u4E0A\u3067\u3042\u308B" : "\u3088\u308A\u5927\u304D\u3044",
              a = t(r.origin);
            if (a)
              return `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${r.origin}\u306F${r.minimum.toString()}${a.unit}${s}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
            return `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${r.origin}\u306F${r.minimum.toString()}${s}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          }
          case "invalid_format": {
            let s = r;
            if (s.format === "starts_with")
              return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${s.prefix}"\u3067\u59CB\u307E\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
            if (s.format === "ends_with")
              return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${s.suffix}"\u3067\u7D42\u308F\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
            if (s.format === "includes")
              return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${s.includes}"\u3092\u542B\u3080\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
            if (s.format === "regex")
              return `\u7121\u52B9\u306A\u6587\u5B57\u5217: \u30D1\u30BF\u30FC\u30F3${s.pattern}\u306B\u4E00\u81F4\u3059\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
            return `\u7121\u52B9\u306A${n[s.format] ?? r.format}`;
          }
          case "not_multiple_of":
            return `\u7121\u52B9\u306A\u6570\u5024: ${r.divisor}\u306E\u500D\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          case "unrecognized_keys":
            return `\u8A8D\u8B58\u3055\u308C\u3066\u3044\u306A\u3044\u30AD\u30FC${r.keys.length > 1 ? "\u7FA4" : ""}: ${Np.joinValues(r.keys, "\u3001")}`;
          case "invalid_key":
            return `${r.origin}\u5185\u306E\u7121\u52B9\u306A\u30AD\u30FC`;
          case "invalid_union":
            return "\u7121\u52B9\u306A\u5165\u529B";
          case "invalid_element":
            return `${r.origin}\u5185\u306E\u7121\u52B9\u306A\u5024`;
          default:
            return "\u7121\u52B9\u306A\u5165\u529B";
        }
      };
    };
  function NG() {
    return { localeError: LG() };
  }
  QA.exports = vo.default;
});

export { eI };
